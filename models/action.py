from . import db
import enum
from datetime import datetime, timezone


class Action(db.Model):
    class ActionType(enum.Enum):
        LOGIN = "login"
        READ_SCAN = "read_scan"

    class Status(enum.Enum):
        CREATED = "created"
        RUNNING = "running"
        STOPPED = "stopped"
        KILLED = "killed"

    id = db.Column(db.Integer, primary_key=True)
    uuid = db.Column(db.Integer, nullable=False)
    action_type = db.Column(db.Enum(ActionType), nullable=False)
    container_id = db.Column(db.Integer, nullable=True)
    status = db.Column(db.Enum(Status), nullable=False, default=Status.CREATED)
    message = db.Column(db.String(255), nullable=True)
    started_at = db.Column(db.DateTime(), nullable=True)
    created_at = db.Column(db.DateTime(), nullable=False, default=datetime.now(timezone.utc))
