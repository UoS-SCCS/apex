from flask import url_for, render_template, redirect
from flask import Blueprint, render_template
from flask_login import login_required, current_user
from . import db
from authlib.integrations.flask_client import OAuth
from .models import OAuth2Token
oauth = OAuth()

def fetch_mydrive_token():
    token = OAuth2Token.query.filter_by(user_id=current_user.get_id()).first()
    return token.to_token()

def update_token(token, refresh_token=None, access_token=None):
    if refresh_token:
        item = OAuth2Token.query.filter_by(user_id=current_user.get_id(), refresh_token=refresh_token).first()
    elif access_token:
        item = OAuth2Token.query.filter_by(user_id=current_user.get_id(), access_token=access_token).first()
    else:
        return

    # update old token
    item.access_token = token['access_token']
    item.refresh_token = token.get('refresh_token')
    item.expires_at = token['expires_at']
    db.session.commit()


def config_oauth_client(app):
    oauth.init_app(app)
    oauth.register(name='mydrive', fetch_token=fetch_mydrive_token, update_token=update_token)


oauth_client = Blueprint('oauth_client', __name__)

@oauth_client.route('/link')
def login():
    redirect_uri = url_for('oauth_client.authorize', _external=True)
    print(redirect_uri)
    return oauth.mydrive.authorize_redirect(redirect_uri)

@oauth_client.route('/authorize')
def authorize():
    token = oauth.mydrive.authorize_access_token()
    print(token)
    profile_resp = oauth.mydrive.get('http://localhost:5000/profile/')
    profile_resp.raise_for_status()
    profile = profile_resp.json()
    newtoken = OAuth2Token(user_id=current_user.get_id(),token_type=token["token_type"],access_token=token["access_token"],expires_at=token["expires_at"],refresh_token=token["refresh_token"],scope=token["scope"],oauth_uid=profile["user_id"])
    db.session.merge(newtoken)
    current_user.is_linked = True
    current_user.oauth_uid = profile["user_id"]
    db.session.commit()
    
#    resp = oauth.mydrive.get('http://localhost:5000/api/v1/users/1/files/')
#    resp.raise_for_status()
#    print(resp.json())
#    #profile = resp.json()
#    print(token)
    # do something with the token and profile
    return redirect('/notes')

@oauth_client.route('/test')
def test():
    #token = oauth.mydrive.authorize_access_token()
    resp = oauth.mydrive.get('http://localhost:5000/api/v1/users/1/files/')
    resp.raise_for_status()
    print(resp.json())
    #profile = resp.json()
    #print(token)
    # do something with the token and profile
    return redirect('/')