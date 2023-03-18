import flask
import flask_login

app = flask.Flask(__name__)
app.secret_key = 'xfuf2e+aTAWjBu6aAV9MG9SmqzmncO4zg5HGbW4k8bs='
login_manager = flask_login.LoginManager()
login_manager.init_app(app)