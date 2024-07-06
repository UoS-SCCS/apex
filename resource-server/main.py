# SPDX-License-Identifier: Apache-2.0 
# Copyright 2024 Dr Chris Culnane
from flask import Blueprint, render_template
from flask_login import login_required, current_user
from . import db

main = Blueprint("main", __name__)


@main.route("/")
def index():
    return render_template("index.html")


@main.route("/profile")
@login_required
def profile():
    return render_template("profile.html", name=current_user.name)


@main.route("/storage")
@login_required
def storage():
    return render_template("files.html", id=current_user.get_id())
