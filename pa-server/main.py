from flask import Blueprint, render_template
from flask_login import login_required, current_user


main = Blueprint('main', __name__)

@main.route('/')
def index():
    return render_template('load_pa.html')

@main.route('/provider-agent')
def provider_agent():
    return render_template('load_pa.html')

@main.route('/provider-agent/auth')
def apex_auth():
    return render_template('auth.html')
