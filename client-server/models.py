from flask_login import UserMixin
from . import db
import time
class User(UserMixin,db.Model):
    id = db.Column(db.Integer, primary_key=True) # primary keys are required by SQLAlchemy
    email = db.Column(db.String(100), unique=True)
    password = db.Column(db.String(100))
    name = db.Column(db.String(1000))
    is_linked = db.Column(db.Boolean)
    oauth_uid = db.Column(db.Integer)

class OAuth2Token(db.Model):
    user_id = db.Column(db.Integer, db.ForeignKey('user.id', ondelete='CASCADE'),primary_key=True)
    token_type = db.Column(db.String(length=40))
    access_token = db.Column(db.String(length=200))
    refresh_token = db.Column(db.String(length=200))
    expires_at = db.Column(db.Integer)
    scope = db.Column(db.String(length=100))
    oauth_uid = db.Column(db.Integer)
    user = db.relationship('User')

    def to_token(self):
        return dict(
            access_token=self.access_token,
            token_type=self.token_type,
            refresh_token=self.refresh_token,
            expires_at=self.expires_at,
        )

class OTP(db.Model):
    
    otp = db.Column(db.String(6), nullable=False)
    user_id = db.Column(
        db.Integer, db.ForeignKey('user.id', ondelete='CASCADE'), unique=True, primary_key=True
    )
    user = db.relationship('User')
    otp_time = db.Column(
        db.Integer, nullable=False,
        default=lambda: int(time.time())
    )
    def is_expired(self):
        print(self.otp_time)
        print(time.time())
        return (self.otp_time + 300) < time.time()

    def get_otp(self):
        return self.otp

    def is_match(self,challenge):
        if self.otp == self.challenge:
            return True
        return False

    def get_otp_time(self):
        return self.otp_time
