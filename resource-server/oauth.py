from flask import Blueprint, render_template, redirect, url_for, request, flash
from werkzeug.security import generate_password_hash, check_password_hash
from .models import Client, Token, User, AuthorizationCode
from werkzeug.security import gen_salt
from flask import request, render_template
from authlib.integrations.flask_oauth2 import AuthorizationServer
from flask_login import login_required, current_user
from . import db
import time
from authlib.oauth2.rfc6749 import grants
oauth = Blueprint('oauth', __name__)



class AuthorizationCodeGrant(grants.AuthorizationCodeGrant):
    def save_authorization_code(self, code, request):
        client = request.client
        auth_code = AuthorizationCode(
            code=code,
            client_id=client.client_id,
            redirect_uri=request.redirect_uri,
            scope=request.scope,
            user_id=request.user.id,
        )
        db.session.add(auth_code)
        db.session.commit()
        return auth_code

    def query_authorization_code(self, code, client):
        item = AuthorizationCode.query.filter_by(
            code=code, client_id=client.client_id).first()
        if item and not item.is_expired():
            return item

    def delete_authorization_code(self, authorization_code):
        db.session.delete(authorization_code)
        db.session.commit()

    def authenticate_user(self, authorization_code):
        return User.query.get(authorization_code.user_id)




# or with the helper
from authlib.integrations.sqla_oauth2 import (
    create_query_client_func,
    create_save_token_func
)
query_client = create_query_client_func(db.session, Client)
save_token = create_save_token_func(db.session, Token)
server = AuthorizationServer(
    query_client=query_client,
    save_token=save_token,
)


def config_oauth(app):
    server.init_app(app)
    server.register_grant(AuthorizationCodeGrant)



def split_by_crlf(s):
    return [v for v in s.splitlines() if v]

@oauth.route('/developer/')
def index():
    if current_user:
        clients = Client.query.filter_by(user_id=current_user.get_id()).all()
    else:
        clients = []

    return render_template('dev-index.html', user=current_user, clients=clients)
    

@oauth.route('/developer/create_client', methods=('GET', 'POST'))
@login_required
def create_client():
    user = current_user
    if not user:
        return redirect('/')
    if request.method == 'GET':
        return render_template('create_client.html')

    client_id = gen_salt(24)
    client_id_issued_at = int(time.time())
    client = Client(
        client_id=client_id,
        client_id_issued_at=client_id_issued_at,
        user_id=user.id,
    )

    form = request.form
    client_metadata = {
        "client_name": form["client_name"],
        "client_uri": form["client_uri"],
        "grant_types": split_by_crlf(form["grant_type"]),
        "redirect_uris": split_by_crlf(form["redirect_uri"]),
        "response_types": split_by_crlf(form["response_type"]),
        "scope": form["scope"],
        "token_endpoint_auth_method": form["token_endpoint_auth_method"]
    }
    client.set_client_metadata(client_metadata)

    if form['token_endpoint_auth_method'] == 'none':
        client.client_secret = ''
    else:
        client.client_secret = gen_salt(48)

    db.session.add(client)
    db.session.commit()
    return redirect('/')



@oauth.route('/oauth/authorize', methods=['GET', 'POST'])
@login_required
def authorize():
    # Login is required since we need to know the current resource owner.
    # It can be done with a redirection to the login page, or a login
    # form on this authorization page.
    if request.method == 'GET':
        grant = server.get_consent_grant(end_user=current_user)
        client = grant.client
        scope = client.get_allowed_scope(grant.request.scope)

        # You may add a function to extract scope into a list of scopes
        # with rich information, e.g.
        scopes = scope# describe_scope(scope)  # returns [{'key': 'email', 'icon': '...'}]
        return render_template(
            'authorize.html',
            grant=grant,
            user=current_user,
            client=client,
            scopes=scopes,
        )
    confirmed = request.form['confirm']
    if confirmed:
        # granted by resource owner
        return server.create_authorization_response(grant_user=current_user)
    # denied by resource owner
    return server.create_authorization_response(grant_user=None)

@oauth.route('/oauth/token', methods=['POST'])
def issue_token():
    return server.create_token_response()

def query_client(client_id):
    return Client.query.filter_by(client_id=client_id).first()

def save_token(token_data, request):
    if request.user:
        user_id = request.user.get_user_id()
    else:
        # client_credentials grant_type
        user_id = request.client.user_id
        # or, depending on how you treat client_credentials
        user_id = None
    token = Token(
        client_id=request.client.client_id,
        user_id=user_id,
        **token_data
    )
    db.session.add(token)
    db.session.commit()