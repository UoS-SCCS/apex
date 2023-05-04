from flask import Blueprint, render_template, redirect, url_for, request, flash, jsonify
from flask_login import login_required, current_user
from . import USER_FILES_PATH, APEX_FILES_PATH
from . import db
import os
import shutil
import json
from . models import ClientCertificate
from pathlib import Path
from cryptography.exceptions import InvalidSignature
from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.hazmat.primitives.asymmetric.utils import encode_dss_signature
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric.ec import EllipticCurvePublicNumbers,SECP256R1
import base64
apex = Blueprint('apex', __name__)

@apex.route('/promise')
@login_required
def promise():
    #TODO ERROR HANDLING
    response = {}
    promise_id = request.args["promise_id"]
    
    promise_dir = os.path.join(APEX_FILES_PATH,promise_id)
    promise_file = os.path.join(promise_dir,"file")
    if os.path.exists(promise_file):
        with open(promise_file, 'r') as f:
            response["promise_data"]=json.load(f)
    data_file = os.path.join(promise_dir,"data")
    promise_info = None
    with open(data_file, 'r') as f:
        promise_info=json.load(f)
    if(promise_info["type"]=="save"):
        response["target_file"] = promise_info["target"]
        if os.path.exists(response["target_file"]):
            with open(response["target_file"], 'r') as f:
                response["existing_data"]=json.load(f)
            response["existing_file"] = response["target_file"]
    elif(promise_info["type"]=="rewrap"):
        response["wrappedAgentKey"] = promise_info["wrappedAgentKey"]
        response["wrappedResourceKey"] = promise_info["wrappedResourceKey"]
        response["clientSignature"]=promise_info["clientSignature"]
        response["host"]=promise_info["host"]
    return jsonify(response) 

@apex.route('/promise-fulfilment', methods=('POST',))
@login_required
def promise_fulfilment():
    #TODO ERROR HANDLING
   
    data = request.get_json()
    
    promise_id = data["promise_id"]
    server_promise_info=None;
    promise_dir = os.path.join(APEX_FILES_PATH,promise_id)
    data_file = os.path.join(promise_dir,"data")
    with open(data_file, 'r') as f:
        server_promise_info=json.load(f)
    
    type=""
        
    if server_promise_info["type"]=="save":
        #Signature check
        #output["rSigBytes"]=rSigBytes;
        #output["rkSigBytes"]=rkSigBytes;
        re_encrypted_data = data["reEncryptedData"]
        wrapped_re_encryption_key = data["wrappedReEncKey"]
        promise_file = os.path.join(promise_dir,"file")
        target_file = server_promise_info["target"]
        type="save"
        if not os.path.exists(target_file):
            type="register"
        final_data = {}
        final_data["rSigBytes"]=data["rSigBytes"]
        final_data["rkSigBytes"]=data["rkSigBytes"]
        final_data["wrappedKey"]=wrapped_re_encryption_key
        final_data["encryptedData"]=re_encrypted_data
        with open(target_file, 'w') as f:
            json.dump(final_data,f)
    elif server_promise_info["type"]=="rewrap":
        type="rewrap"
    
     
    shutil.rmtree(promise_dir)
    
    final_response = {}
    final_response["promise_id"]=promise_id
    final_response["status"]="fulfilled"
    final_response["type"]=type
    return jsonify(final_response) 


def check_signature(public_key,dss_signature, data_string):
    #json_owner_public_key = json.loads(data["ownerEncPublicKey"]);
    #signature_bytes = base64.urlsafe_b64decode(base64_web_signature)
    #jwk_owner_public_key = get_rsa_jwk_representation(json_owner_public_key)
    curve =SECP256R1()
    try:
        public_key.verify(dss_signature,data_string.encode('utf-8'),ec.ECDSA(hashes.SHA256()))
        return True
    except InvalidSignature:
        print("signature checking failed")
        return False

def convert_to_dss_sig(signature_bytes):
    return encode_dss_signature(int.from_bytes(signature_bytes[0:32], "big"),int.from_bytes(signature_bytes[32:], "big"))

def convert_json_public_key(json_public_key):
    curve =SECP256R1()
    return (EllipticCurvePublicNumbers( int.from_bytes(base64.urlsafe_b64decode(json_public_key["x"]+"=="), "big"), int.from_bytes(base64.urlsafe_b64decode(json_public_key["y"]+"=="), "big"),curve)).public_key()
    
