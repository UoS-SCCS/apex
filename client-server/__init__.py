from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager

import os
# init SQLAlchemy so we can use it later in our models
db = SQLAlchemy()

def create_app():
    app = Flask(__name__)

    app.config['SECRET_KEY'] = 'rRiuFv1DIS/m0QX4OjTmjVq8sl5kAnJge1cWrvvyhm4='
    with app.app_context():
        DB_PATH=os.path.join(app.root_path, "data")
        
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

    if not os.path.exists("_db.created"):
        
        with app.app_context():
            print("Creating database")
            db.create_all()
            with open( DB_PATH + "/_db.created", 'w') as fp:
                pass
    return app