from . import db
from datetime import datetime, timezone

class Session(db.Model):
    uuid = db.Column(db.Integer, primary_key=True, unique=True, nullable=False)
    logged_in = db.Column(db.Boolean, default=False, nullable=False)
    last_login_at = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.now(timezone.utc))
