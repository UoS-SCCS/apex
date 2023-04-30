from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager
from flask_restful import Api
from flask_cors import CORS

import os
# init SQLAlchemy so we can use it later in our models
db = SQLAlchemy()
DB_PATH = ""
USER_FILES_PATH = ""
def create_app():
    app = Flask(__name__)
    CORS(app,origins=["http://127.0.0.1:5000", "http://127.0.0.3:5000","http://localhost:5000"],supports_credentials=True)
    app.config['CORS_HEADERS'] = 'Content-Type'
    app.config['SESSION_COOKIE_SAMESITE'] = "None"
    app.config['SESSION_COOKIE_SECURE'] = True
    
    app.config['SECRET_KEY'] = 'xfuf2e+aTAWjBu6aAV9MG9SmqzmncO4zg5HGbW4k8bs='    
    app.config['OAUTH2_REFRESH_TOKEN_GENERATOR']= True
    with app.app_context():
        DB_PATH=os.path.join(app.root_path, "data")
        global USER_FILES_PATH
        USER_FILES_PATH = os.path.join(app.root_path, "_user_files")
        
        if not os.path.exists(USER_FILES_PATH):
            os.makedirs(USER_FILES_PATH)
        
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:////' + DB_PATH + '/db.sqlite'
    
    login_manager = LoginManager()
    login_manager.login_view = 'auth.login'
    login_manager.init_app(app)

    from .models import User

    @login_manager.user_loader
    def load_user(user_id):
        # since the user_id is just the primary key of our user table, use it in the query for the user
        return User.query.get(int(user_id))

    db.init_app(app)

    from .oauth import config_oauth
    config_oauth(app)
    from .oauth import oauth as oauth_blueprint
    
    app.register_blueprint(oauth_blueprint)


    # blueprint for auth routes in our app
    from .auth import auth as auth_blueprint
    app.register_blueprint(auth_blueprint)

    # blueprint for non-auth parts of app
    from .main import main as main_blueprint
    app.register_blueprint(main_blueprint)

    from .api import api as api_blueprint
    from .api import Files
    api = Api(api_blueprint)
    api.add_resource(Files, "/users/<user_id>/files/<path:unsafe_filename>","/users/<user_id>/files/")
    
    app.register_blueprint(api_blueprint, url_prefix="/api/v1")






    if not os.path.exists("_db.created"):
        
        with app.app_context():
            print("Creating database")
            db.create_all()
            with open( DB_PATH + "/_db.created", 'w') as fp:
                pass
    

    return app

