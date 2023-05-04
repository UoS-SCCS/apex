from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager
from flask_cors import CORS
from .keystore import KeyStore
import os
import logging
# init SQLAlchemy so we can use it later in our models
db = SQLAlchemy()
DB_PATH = ""
USER_FILES_PATH = ""
KEY_STORE = None
def create_app():
    global KEY_STORE
    app = Flask(__name__)
    CORS(app,origins=["http://127.0.0.1:5000", "http://127.0.0.3:5000","http://localhost:5000"],supports_credentials=True)
    app.config['CORS_HEADERS'] = 'Content-Type'
    app.config['SESSION_COOKIE_SAMESITE'] = "None"
    app.config['SESSION_COOKIE_SECURE'] = True
    app.config["MYDRIVE_CLIENT_ID"]="4pbte8enfRyOwrwduTKXGAqc"
    app.config["MYDRIVE_CLIENT_SECRET"]="MS0p3Uplh6MRenN6oBUtYWoQyWBfgEjD95BH9MxaHzdO7FVx"
    #app.config["MYDRIVE_REQUEST_TOKEN_URL"]="https://localhost:5000/oauth/token"
    app.config["MYDRIVE_ACCESS_TOKEN_URL"]="http://localhost:5000/oauth/token"
    app.config["MYDRIVE_REFRESH_TOKEN_URL"]="http://localhost:5000/oauth/token"
    app.config["MYDRIVE_AUTHORIZE_URL"]="http://localhost:5000/oauth/authorize?isAPEX=True"
    #app.config["MYDRIVE_ACCESS_TOKEN_PARAMS"]= {"grant_type":"authorization_code"}
    app.config["MYDRIVE_CLIENT_KWARGS"]={'scope': 'full'}
    app.config["MYDRIVE_API_BASE_URL"]="http://localhost:5000/api/v1/users/"
    logging.basicConfig(level=logging.DEBUG, filename='loginDEBUG.log', filemode='a')
    logging.getLogger('flask_cors').level = logging.DEBUG
    #NoteTaker

    app.config['SECRET_KEY'] = 'rRiuFv1DIS/m0QX4OjTmjVq8sl5kAnJge1cWrvvyhm4='
    with app.app_context():
        DB_PATH=os.path.join(app.root_path, "data")
        if not os.path.exists(DB_PATH):
            os.makedirs(DB_PATH)
        
    with app.app_context():
        KEY_STORE_PATH=os.path.join(app.root_path, "data","keystore.json")
    
    KEY_STORE = KeyStore(KEY_STORE_PATH)

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

    # blueprint for auth routes in our app
    from .auth import auth as auth_blueprint
    app.register_blueprint(auth_blueprint)

    # blueprint for non-auth parts of app
    from .main import main as main_blueprint
    app.register_blueprint(main_blueprint)

    from .oauth_client import config_oauth_client
    config_oauth_client(app)

    # blueprint for auth routes in our app
    from .oauth_client import oauth_client as oauth_client_blueprint
    app.register_blueprint(oauth_client_blueprint)

    from .notes import notes as notes_blueprint
    app.register_blueprint(notes_blueprint)

    # blueprint for auth routes in our app
    from .apex import apex as apex_blueprint
    app.register_blueprint(apex_blueprint)
    
        
        
    with app.app_context():
        if not os.path.exists(DB_PATH +"/_db.created"):
            print("Creating database")
            db.create_all()
            with open( DB_PATH + "/_db.created", 'w') as fp:
                pass
    return app