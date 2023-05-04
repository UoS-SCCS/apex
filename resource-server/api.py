from types import NoneType
from flask import Blueprint, render_template, redirect, url_for, request, flash,send_file,jsonify
from werkzeug.security import generate_password_hash, check_password_hash
from .models import User, Token, ClientCertificate
from flask_login import login_user, login_required, logout_user
from . import db
from . import USER_FILES_PATH, APEX_FILES_PATH
from flask import request, g, send_from_directory
from flask_restful import reqparse, abort, Resource, fields, marshal_with
from werkzeug.utils import secure_filename
from functools import wraps
from flask_login import login_required, current_user
from flask import current_app, request, g
from flask_restful import abort
from flask_login.config import EXEMPT_METHODS
from werkzeug.exceptions import HTTPException
from pathvalidate import sanitize_filepath
from werkzeug.datastructures import FileStorage
import json
import os
import uuid
from authlib.integrations.flask_oauth2 import ResourceProtector, current_token
from authlib.oauth2.rfc6750 import BearerTokenValidator
from cryptography.exceptions import InvalidSignature
from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.hazmat.primitives.asymmetric.utils import encode_dss_signature
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric.ec import EllipticCurvePublicNumbers,SECP256R1
import base64
class MyBearerTokenValidator(BearerTokenValidator):
    def authenticate_token(self, token_string):
        return Token.query.filter_by(access_token=token_string).first()

require_oauth = ResourceProtector()

# only bearer token is supported currently
require_oauth.register_token_validator(MyBearerTokenValidator())

def validate_user(f):
    '''
    This decorate ensures that the user logged in is the actually the same user we're operating on
    '''
    @wraps(f)
    def func(*args, **kwargs):
        user_id = kwargs.get('user_id')
        if (not isinstance(current_token,NoneType) and user_id == str(current_token.user_id)) or user_id == current_user.get_id():
            pass
        else:
            #if user_id != current_user.get_id():
            abort(404, message="You do not have permission to the resource you are trying to access")
        return f(*args, **kwargs)
    return func

def authenticate_user(scopes=None, optional=False):
    def inner_authenticate_user(f):
        '''
        This decorate ensures that the user logged in is the actually the same user we're operating on
        '''
        @wraps(f)
        def func(*args, **kwargs):
            if current_user.is_authenticated or request.method in EXEMPT_METHODS or current_app.config.get("LOGIN_DISABLED"):
                
                # flask 1.x compatibility
                # current_app.ensure_sync is only available in Flask >= 2.0
                if callable(getattr(current_app, "ensure_sync", None)):
                    return current_app.ensure_sync(f)(*args, **kwargs)
                return f(*args, **kwargs)    
            else:
                deco = require_oauth(scopes,optional)(lambda: f(*args, **kwargs))
                return deco()
                
        return func
    return inner_authenticate_user




api = Blueprint('api', __name__)

def path_to_dict(path):
    d = {'name': os.path.basename(path)}
    if os.path.isdir(path):
        d['type'] = "directory"
        d['children'] = [path_to_dict(os.path.join(path,x)) for x in os.listdir(path)]
    else:
        d['type'] = "file"
    return d

class Files(Resource):

    def _sanitize_path(self,filepath):
        return sanitize_filepath(filepath)

    def _validate_path(self,user_dir, filepath):
        return os.path.commonprefix([user_dir, os.path.realpath(filepath)])
    
    def _store_promise(self, target, file):
        final_data = {}
        final_data["target"]=target
        final_data["type"]="save"
        promise_id = str(uuid.uuid4())
        promise_dir = os.path.join(APEX_FILES_PATH,promise_id)
        if not os.path.exists(promise_dir):
            os.makedirs(promise_dir)
        promise_file = os.path.join(promise_dir,"file")
        file.save(promise_file)
        data_file = os.path.join(promise_dir,"data")
        with open(data_file, 'w') as f:
            json.dump(final_data,f)
        return promise_id        
    @authenticate_user()
    @validate_user
    def get(self, user_id, unsafe_filename=None):
        try:
            if unsafe_filename is None:
                print("None filename")
            user_dir = os.path.join(USER_FILES_PATH,user_id)
            filepath = self._sanitize_path(unsafe_filename)
            if not self._validate_path(user_dir,filepath):
                raise Exception("Invalid path")
                
            target = os.path.join(user_dir,filepath)
            if not os.path.exists(user_dir):
                os.makedirs(user_dir)
            if os.path.exists(target):
                if os.path.isdir(target):
                    return path_to_dict(target)
                else:
                    return send_file(target)
            abort(404)
        except HTTPException as e1:
            raise
        except Exception as e:
            abort(
                500,
                message="There was an error while trying to get your files --> {}".format(
                    str(e)
                ),
            )

    @authenticate_user()
    @validate_user
    def post(self, user_id, unsafe_filename):
        try:
            user_dir = os.path.join(USER_FILES_PATH,user_id)
            filepath = self._sanitize_path(unsafe_filename)
            if not self._validate_path(user_dir,filepath):
                raise Exception("Invalid file path")
            
            target = os.path.join(user_dir,filepath)
            parser = reqparse.RequestParser()
            if os.path.exists(target):
                return "Path already exists, use PUT instead of POST", 400
            parser.add_argument('file', type=FileStorage, location='files',default=None)
            parser.add_argument("type",location='args')
            args = parser.parse_args()
            if not args['file'] is None:
                if "type" in args and args["type"]=="APEX":
                    file = args['file']
                    json_file = json.loads(file.read())
                    file.seek(0)
                    name = unsafe_filename.replace("NoteTaker/", "",1)
                    #signature_data = str(user_id) + name + json_file["wrappedKey"] + json.dumps(json_file["encryptedData"])
                    #client_certificate = ClientCertificate.query.filter_by(user_id=user_id, host=json_file["host"]).first()
                    #public_signing_key = convert_json_public_key(json.loads(client_certificate.public_key))
                    #dss_signature = base64.urlsafe_b64decode(json_file["clientSignature"])
                    
                    #public_signing_key.verify(dss_signature,signature_data.encode('utf-8'),ec.ECDSA(hashes.SHA256()))

                    promise_id = self._store_promise(target,file = args['file'])
                    return jsonify({"success":True,"promise_id":promise_id,"promise":"direct"})
                else:
                    file = args['file']    
                    file.save(target)
                    return jsonify({"success":True})
            else:
                os.mkdir(target)
                return jsonify({"success":True})
        except InvalidSignature:
            print("signature checking failed", flush=True)
            abort(
                500,
                message="Signature checking failed --> {}".format(
                    e
                ),
            )    
        except Exception as e:
            print(e)
            traceback.print_exc()
            abort(
                500,
                message="There was an error while processing your request --> {}".format(
                    e
                ),
            )
    @authenticate_user()
    @validate_user
    def put(self, user_id, unsafe_filename):
        try:
            user_dir = os.path.join(USER_FILES_PATH,user_id)
            filepath = self._sanitize_path(unsafe_filename)
            if not self._validate_path(user_dir,filepath):
                raise Exception("Invalid file path")
            
            target = os.path.join(user_dir,filepath)
            parser = reqparse.RequestParser()
            
            if not os.path.exists(target):
                abort(404,"Path does not exist, use POST instead of PUT")
            
            if target.endswith("/"):
                abort(400,"Cannot edit folders")

            #Must be a file
            parser.add_argument('file', type=FileStorage, location='files')

            parser.add_argument("type",location='args')
            args = parser.parse_args()
            if "type" in args and args["type"]=="APEX":
                #file = args['file']
                #json_file = json.loads(file.read())
                #file.seek(0)
                #name = unsafe_filename.replace("NoteTaker/", "",1)
                #signature_data = str(user_id) + name + json_file["wrappedKey"] + json.dumps(json_file["encryptedData"])
                #client_certificate = ClientCertificate.query.filter_by(user_id=user_id, host=json_file["host"]).first()
                #public_signing_key = convert_json_public_key(json.loads(client_certificate.public_key))
                #dss_signature = base64.urlsafe_b64decode(json_file["clientSignature"])
                
                #public_signing_key.verify(dss_signature,signature_data.encode('utf-8'),ec.ECDSA(hashes.SHA256()))
                              
                promise_id = self._store_promise(target,file = args['file'])
                return jsonify({"success":True,"promise_id":promise_id,"promise":"direct"})
            else:

                file = args['file']    
                file.save(target)
                return jsonify({"success":True})            
        except InvalidSignature:
            print("signature checking failed", flush=True)
            abort(
                500,
                message="Signature checking failed --> {}".format(
                    e
                ),
            )
        except Exception as e:
            print(e)
            abort(
                500,
                message="There was an error while processing your request --> {}".format(
                    e
                ),
            )

    @authenticate_user()
    @validate_user
    def delete(self, user_id, unsafe_filename):
        try:
            user_dir = os.path.join(USER_FILES_PATH,user_id)
            filepath = self._sanitize_path(unsafe_filename)
            if not self._validate_path(user_dir,filepath):
                raise Exception("Invalid file path")
            
            target = os.path.join(user_dir,filepath)
            parser = reqparse.RequestParser()
            
            if not os.path.exists(target):
                abort(404,"Path does not exist")

            if target.endswith("/"):
                os.rmdir(target)
            else:
                os.remove(target)
                
            return jsonify({"success":True})                
        except Exception as e:
            print(e)
            abort(
                500,
                message="There was an error while processing your request --> {}".format(
                    e
                ),
            )

def convert_to_dss_sig(signature_bytes):
    return encode_dss_signature(int.from_bytes(signature_bytes[0:32], "big"),int.from_bytes(signature_bytes[32:], "big"))

def convert_json_public_key(json_public_key):
    curve =SECP256R1()
    return (EllipticCurvePublicNumbers( int.from_bytes(base64.urlsafe_b64decode(json_public_key["x"]+"=="), "big"), int.from_bytes(base64.urlsafe_b64decode(json_public_key["y"]+"=="), "big"),curve)).public_key()
    

class Wrapping(Resource):

    def _sanitize_path(self,filepath):
        return sanitize_filepath(filepath)

    def _validate_path(self,user_dir, filepath):
        return os.path.commonprefix([user_dir, os.path.realpath(filepath)])
    
    def _store_promise(self, target, wrapped_agent_key, wrapped_resource_key, clientSignature, host):
        final_data = {}
        final_data["target"]=target
        final_data["type"]="rewrap"
        final_data["host"]=host
        final_data["wrappedAgentKey"]=wrapped_agent_key
        final_data["wrappedResourceKey"]= wrapped_resource_key
        final_data["clientSignature"]= clientSignature

        
        print(final_data, flush=True)
        promise_id = str(uuid.uuid4())
        promise_dir = os.path.join(APEX_FILES_PATH,promise_id)
        if not os.path.exists(promise_dir):
            os.makedirs(promise_dir)
        data_file = os.path.join(promise_dir,"data")
        with open(data_file, 'w') as f:
            json.dump(final_data,f)
        return promise_id        
    
    

    @authenticate_user()
    @validate_user
    def post(self, user_id, unsafe_filename):
        try:
            user_dir = os.path.join(USER_FILES_PATH,user_id)
            filepath = self._sanitize_path(unsafe_filename)
            if not self._validate_path(user_dir,filepath):
                raise Exception("Invalid file path")
            
            target = os.path.join(user_dir,filepath)
            parser = reqparse.RequestParser()
            parser.add_argument('wrappedAgentKey', type=str, location='json')            
            parser.add_argument('wrappedKey', type=str, location='json')
            parser.add_argument('clientSignature', type=dict, location='json')
            parser.add_argument('host', type=str, location='json')


            args = parser.parse_args()
            
            if not args['wrappedAgentKey'] is None and not args['wrappedAgentKey'] is None:

                wrapped_agent_key = args["wrappedAgentKey"]
                wrapped_resource_key = args["wrappedKey"]
                promise_id = self._store_promise(target,wrapped_agent_key,wrapped_resource_key,args["clientSignature"],args["host"])
                return jsonify({"success":True,"promise_id":promise_id,"promise":"direct"})
        except Exception as e:
            print(e)
            abort(
                500,
                message="There was an error while processing your request --> {}".format(
                    e
                ),
            )
    
