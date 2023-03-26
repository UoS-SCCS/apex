from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager

import os
# init SQLAlchemy so we can use it later in our models
db = SQLAlchemy()
DB_PATH = ""
USER_FILES_PATH = ""
def create_app():
    app = Flask(__name__)
    app.config["MYDRIVE_CLIENT_ID"]="Vg7hWQdX7DKjJo6Mgo9Ujsgs"
    app.config["MYDRIVE_CLIENT_SECRET"]="WFI9EKvo5urmEOqBJBQ9xFdnq5055mE0kZ4JmbvwKqXT283E"
    #app.config["MYDRIVE_REQUEST_TOKEN_URL"]="http://localhost:5000/oauth/token"
    app.config["MYDRIVE_ACCESS_TOKEN_URL"]="http://localhost:5000/oauth/token"
    app.config["MYDRIVE_REFRESH_TOKEN_URL"]="http://localhost:5000/oauth/token"
    app.config["MYDRIVE_AUTHORIZE_URL"]="http://localhost:5000/oauth/authorize"
    #app.config["MYDRIVE_ACCESS_TOKEN_PARAMS"]= {"grant_type":"authorization_code"}
    app.config["MYDRIVE_CLIENT_KWARGS"]={'scope': 'full'}
    app.config["MYDRIVE_API_BASE_URL"]="http://localhost:5000/api/v1/users/"
    
    #NoteTaker

    app.config['SECRET_KEY'] = 'rRiuFv1DIS/m0QX4OjTmjVq8sl5kAnJge1cWrvvyhm4='
    with app.app_context():
        DB_PATH=os.path.join(app.root_path, "data")
        if not os.path.exists(DB_PATH):
            os.makedirs(DB_PATH)
        
        
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

    if not os.path.exists("_db.created"):
        
        with app.app_context():
            print("Creating database")
            db.create_all()
            with open( DB_PATH + "/_db.created", 'w') as fp:
                pass
    return app