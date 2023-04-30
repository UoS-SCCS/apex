from flask import Blueprint, render_template, redirect, url_for, request, flash, Response,jsonify
from werkzeug.security import generate_password_hash, check_password_hash
from .models import User
from flask_login import login_user, login_required, logout_user,current_user
from .models import OTP
from . import db
import json
import hmac
import os
from . import KEY_STORE
apex = Blueprint('apex', __name__)


@apex.route('/pk_endpoint', methods=['POST'])
@login_required
def pk_endpoint():
    print("hello")
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
        encoded_otp = otp.get_otp().encode()
        encoded_public_key = get_jwk_representation(publicKey).encode()
        
        print("Enc:" + get_jwk_representation(publicKey))
        hmac_obj = hmac.new(encoded_otp,encoded_public_key,"SHA512")
        
        if not hmac.compare_digest(data["hmac"],hmac_obj.hexdigest()):
            res = {}
            res["error"]=True
            res["code"]=3
            res["msg"] = "HMAC Verification Failed"
            return Response(status=500, mimetype="application/json", response=json.dumps(res))
        json_pub_key = KEY_STORE.get_public_key_json("signing")
        jwk_json_pub_key = get_jwk_representation(json_pub_key).encode()
        my_hmac =hmac.new(encoded_otp,jwk_json_pub_key,"SHA512")
        hmac_encoded = my_hmac.hexdigest()
        resp = {}
        resp["success"]=True
        resp["hmac"]=hmac_encoded
        resp["publicKey"] = json_pub_key
        return jsonify(resp)
    
def get_jwk_representation(full_key):
    
    output = {}
    output["crv"]=full_key["crv"]
    output["kty"]=full_key["kty"]
    output["x"]=full_key["x"]
    output["y"]=full_key["y"]
    return json.dumps(output, sort_keys=True,indent=None, separators= (',', ':'))
    

