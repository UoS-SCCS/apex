from flask import Blueprint, render_template
from flask_login import login_required, current_user
from . import db

main = Blueprint('main', __name__)

@main.route('/')
def index():
    return render_template('index.html')

@main.route('/clientAgent')
def client_agent():
    return render_template('clientAgent.html')
#@main.route('/notes')
#@login_required
#def notes():
#    return render_template('notes.html', name=current_user.name)
