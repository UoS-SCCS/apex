from flask import Blueprint, render_template, redirect, url_for, request, flash, Response,jsonify
from werkzeug.security import generate_password_hash, check_password_hash
from .models import User
from flask_login import login_user, login_required, logout_user,current_user
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric.ec import EllipticCurvePublicNumbers,SECP256R1
from authlib.integrations.flask_client import OAuth
from requests.exceptions import HTTPError
from .oauth_client import oauth
from cryptography.exceptions import InvalidSignature
from cryptography.hazmat.primitives.asymmetric import ec
from .models import OTP, ClientAgentKey
from cryptography.hazmat.primitives.asymmetric.utils import encode_dss_signature,decode_dss_signature
from . import db
import json
import hmac
import base64
from io import StringIO 
import os
from . import KEY_STORE
apex = Blueprint('apex', __name__)


@apex.route('/pk_endpoint', methods=['POST'])
@login_required
def pk_endpoint():
    data = request.json
    if not "publicKey" in data or not "hmac" in data:
        res = {}
        res["error"]=True
        res["code"]=1
        res["msg"] = "Parameters missing"
        return Response(status=500, mimetype="application/json", response=json.dumps(res))
    otp = OTP.query.get(current_user.get_id())
    if otp is None or otp.is_expired():

        res = {}
        res["error"]=True
        res["code"]=2
        res["msg"] = "OTP Expired"
        return Response(status=500, mimetype="application/json", response=json.dumps(res))
    else:
        publicKey = json.loads(data["publicKey"])
        json_owner_public_key = json.loads(data["ownerEncPublicKey"]);
        encoded_otp = otp.get_otp().encode()
        encoded_public_key = get_jwk_representation(publicKey).encode()
        jwk_owner_enc_public_key = get_rsa_jwk_representation(json_owner_public_key).encode()
        hmac_obj = hmac.new(encoded_otp,encoded_public_key+jwk_owner_enc_public_key,"SHA512")
        
        if not hmac.compare_digest(data["hmac"],hmac_obj.hexdigest()):
            res = {}
            res["error"]=True
            res["code"]=3
            res["msg"] = "HMAC Verification Failed"
            return Response(status=500, mimetype="application/json", response=json.dumps(res))
        current_user.owner_public_key = data["ownerEncPublicKey"]
        #owner_public_key
        #print(data)
        ##Previous Signature Checking
        #json_owner_public_key = json.loads(data["ownerEncPublicKey"]);
        #signature_bytes = base64.urlsafe_b64decode(data["ownerEncPublicKeySignature"])
        #jwk_owner_public_key = get_rsa_jwk_representation(json_owner_public_key)
        #curve = None
        #if publicKey["crv"]=="P-256":
        #    curve =SECP256R1()
        #ec_public_key = (EllipticCurvePublicNumbers( int.from_bytes(base64.urlsafe_b64decode(publicKey["x"]+"=="), "big"), int.from_bytes(base64.urlsafe_b64decode(publicKey["y"]+"=="), "big"),curve)).public_key()
        #dss_sig = encode_dss_signature(int.from_bytes(signature_bytes[0:32], "big"),int.from_bytes(signature_bytes[32:], "big"))
        #try:
        #    ec_public_key.verify(dss_sig,jwk_owner_public_key.encode('utf-8'),ec.ECDSA(hashes.SHA256()))
        #    current_user.owner_public_key = data["ownerEncPublicKey"]
        #except InvalidSignature:
        #    print("signature checking failed")

        agent_key = ClientAgentKey(user_id=current_user.id,public_key=json.dumps(publicKey))
        db.session.add(agent_key)
        db.session.commit()
        json_pub_key = KEY_STORE.get_public_key_json("signing")
        jwk_json_pub_key = get_jwk_representation(json_pub_key).encode()
        my_hmac =hmac.new(encoded_otp,jwk_json_pub_key,"SHA512")
        hmac_encoded = my_hmac.hexdigest()
        resp = {}
        resp["success"]=True
        resp["hmac"]=hmac_encoded
        resp["publicKey"] = json_pub_key
        return jsonify(resp)


@apex.route('/notes/get_owner_public_key', methods=['GET',])
@login_required
def get_owner_key():
    pub_key = json.loads(current_user.owner_public_key)
    return jsonify(pub_key)

@apex.route('/notes/save_apex', methods=['POST','PUT'])
@login_required
def save_apex():
    data = request.json
    if not "wrappedKey" in data or not "encryptedData" in data:
        res = {}
        res["error"]=True
        res["code"]=1
        res["msg"] = "Parameters missing"
        return Response(status=500, mimetype="application/json", response=json.dumps(res))
    
    wrapped_key = data["wrappedKey"]
    encrypted_data = data["encryptedData"]
    private_key = KEY_STORE.get_private_key("signing")
    signature_data = str(current_user.oauth_uid) + data["name"] + wrapped_key + json.dumps(encrypted_data, sort_keys=True,indent=None, separators= (',', ':'))
    signature = private_key.sign(signature_data.encode('utf-8'), ec.ECDSA(hashes.SHA256()))
    decoded_sig = decode_dss_signature(signature)
    client_sig={}
    client_sig["r"] = hex(decoded_sig[0])
    client_sig["s"] = hex(decoded_sig[1])
    output = {}
    output["userId"]=str(current_user.oauth_uid)
    output["host"]="127.0.0.2"
    output["wrappedKey"]=wrapped_key
    output["encryptedData"]=encrypted_data
    output["clientSignature"]=client_sig#base64.b64encode(signature).decode('utf-8')
    output["promiseFulfilment"]=["direct"]
    updated_file = {"file": StringIO(json.dumps(output))}
    apex_data ={}
    apex_data["type"]="APEX"
    if request.method == "PUT":
        resp = oauth.mydrive.put(str(current_user.oauth_uid) + '/files/NoteTaker/'+data["name"]+"?type=APEX",files=updated_file)
    else:
        resp = oauth.mydrive.post(str(current_user.oauth_uid) + '/files/NoteTaker/'+data["name"]+"?type=APEX",files=updated_file)
    resp.raise_for_status()
    apex_resp = resp.json()
    return apex_resp
    
@apex.route('/notes/retrieve_apex', methods=['GET'])
@login_required
def retrieve_apex():
    if not "name" in request.args:
        res = {}
        res["error"]=True
        res["code"]=1
        res["msg"] = "Parameters missing"
        return Response(status=500, mimetype="application/json", response=json.dumps(res))

    resp = oauth.mydrive.get(str(current_user.oauth_uid) + '/files/NoteTaker/'+request.args["name"]+"?type=APEX")
    resp.raise_for_status()
    return jsonify(json.loads(resp.content))

    
@apex.route('/notes/wrap_key_apex', methods=['POST'])
@login_required
def wrap_key_apex():
    
    json_data= request.get_json()

    wrapped_agent_key = json_data["wrappedAgentKey"]
    wrapped_key = json_data["wrappedKey"]
    private_key = KEY_STORE.get_private_key("signing")
    signature_data = wrapped_key + wrapped_agent_key
    signature = private_key.sign(signature_data.encode('utf-8'), ec.ECDSA(hashes.SHA256()))
    decoded_sig = decode_dss_signature(signature)
    client_sig={}
    client_sig["r"] = hex(decoded_sig[0])
    client_sig["s"] = hex(decoded_sig[1])
    json_data["host"]="127.0.0.2"
    json_data["clientSignature"]=client_sig
    json_data["promiseFulfilment"]=["direct"]
    headers = {'content-type': 'application/json'}
    resp = oauth.mydrive.post(str(current_user.oauth_uid) + '/wrapping/NoteTaker/' + json_data["name"],data=json.dumps(json_data), headers=headers)    
    resp.raise_for_status()
    return jsonify(json.loads(resp.content))
    
def get_jwk_representation(full_key):
    
    output = {}
    output["crv"]=full_key["crv"]
    output["kty"]=full_key["kty"]
    output["x"]=full_key["x"]
    output["y"]=full_key["y"]
    return json.dumps(output, sort_keys=True,indent=None, separators= (',', ':'))
    
def get_rsa_jwk_representation(full_key):
    
    output = {}
    output["e"]=full_key["e"]
    output["n"]=full_key["n"]
    output["kty"]=full_key["kty"]
    return json.dumps(output, sort_keys=True,indent=None, separators= (',', ':'))
