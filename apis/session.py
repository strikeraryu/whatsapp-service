from flask import Blueprint, request, jsonify
from action_manager import ActionManager
from models import Session, Action, db

session_bp = Blueprint('session', __name__)

@session_bp.route('/')
def session():
    uuid = request.args.get('uuid')

    if not uuid:
        return "Bad Request", 400

    session = Session.query.get(uuid)
    if not session:
        session = Session(uuid=uuid)
        db.session.add(session)
        db.session.commit()

    return jsonify({
        'uuid': session.uuid,
        'logged_in': session.logged_in,
        'last_login_at': session.last_login_at,
        'created_at': session.created_at
    })

@session_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    uuid = data.get('uuid')

    session = Session.query.get(uuid)
    if not session:
        return "Bad Request", 400

    action_manager = ActionManager(uuid=uuid)
    success, message = action_manager.start_login_session()

    return jsonify({
        'success': success,
        'message': message
    })

@session_bp.route('/login-status', methods=['GET'])
def login_session_status():
    uuid = request.args.get('uuid')

    session = Session.query.get(uuid)
    if not session:
        return "Bad Request", 400


    action_manager = ActionManager(uuid=uuid)
    current_action = action_manager.current_action()

    if not current_action:
        started_at = None
        running = False
    else:
        started_at = current_action.started_at
        running = current_action.status == Action.Status.RUNNING

    return jsonify({
        'started_at': started_at,
        'running': running
    })
