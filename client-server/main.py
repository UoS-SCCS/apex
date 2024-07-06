# SPDX-License-Identifier: Apache-2.0 
# Copyright 2024 Dr Chris Culnane
from flask import Blueprint, render_template

main = Blueprint('main', __name__)

@main.route('/')
def index():
    return render_template('index.html')

@main.route('/clientAgent')
def client_agent():
    return render_template('clientAgent.html')
