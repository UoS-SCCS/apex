from flask import Blueprint, render_template, redirect, url_for, request, flash,send_file,jsonify
from werkzeug.security import generate_password_hash, check_password_hash
from .models import User
from flask_login import login_user, login_required, logout_user
from . import db
from . import USER_FILES_PATH
from flask import request, g, send_from_directory
from flask_restful import reqparse, abort, Resource, fields, marshal_with
from werkzeug.utils import secure_filename
from functools import wraps
from flask_login import login_required, current_user
from flask import current_app, request, g
from flask_restful import abort
from pathvalidate import sanitize_filepath
from werkzeug.datastructures import FileStorage

import os
def validate_user(f):
    '''
    This decorate ensures that the user logged in is the actually the same user we're operating on
    '''
    @wraps(f)
    def func(*args, **kwargs):
        user_id = kwargs.get('user_id')
        if user_id != current_user.get_id():
            abort(404, message="You do not have permission to the resource you are trying to access")
        return f(*args, **kwargs)
    return func

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
    
    @login_required
    @validate_user
    def get(self, user_id, unsafe_filename=None):
        try:
            if unsafe_filename is None:
                print("None filename")
            unsafe_filename = ""
            print("UserFiles:" + USER_FILES_PATH)
            user_dir = os.path.join(USER_FILES_PATH,user_id)
            print(user_dir)
            filepath = self._sanitize_path(unsafe_filename)
            if not self._validate_path(user_dir,filepath):
                raise Exception("Invalid path")
                
            target = os.path.join(user_dir,filepath)
            print(target)
            if not os.path.exists(user_dir):
                os.makedirs(user_dir)
            if os.path.exists(target):
                if os.path.isdir(target):
                    return path_to_dict(os.path.join(USER_FILES_PATH,user_id))
                else:
                    return send_file(target)
            raise Exception("File path not found")
        except Exception as e:
            abort(
                500,
                message="There was an error while trying to get your files --> {}".format(
                    str(e)
                ),
            )

    @login_required
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
                abort(400,"Path already exists, use PUT instead of POST")
            print(target)
            parser.add_argument('file', type=FileStorage, location='files',default=None)
            
            args = parser.parse_args()
            if not args['file'] is None:
                file = args['file']    
                file.save(target)
                return jsonify({"success":True})
            else:
                os.mkdir(target)
                return jsonify({"success":True})
            
        except Exception as e:
            print(e)
            abort(
                500,
                message="There was an error while processing your request --> {}".format(
                    e
                ),
            )
    @login_required
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
            args = parser.parse_args()

            file = args['file']    
            file.save(target)
            return jsonify({"success":True})            
        except Exception as e:
            print(e)
            abort(
                500,
                message="There was an error while processing your request --> {}".format(
                    e
                ),
            )

    @login_required
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


