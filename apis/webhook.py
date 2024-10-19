from flask import Blueprint, request, jsonify
from socket_handler import SocketHandler
from models import Session, Action, db

webhook_bp = Blueprint('webhook', __name__)

EXIT_CODES = [0, 1]

@webhook_bp.route('/qr_code', methods=['POST'])
def webhook_qr_code():
    data = request.get_json()
    uuid = data.get('uuid')
    qr_code = data.get('qr_code')

    socket_handler = SocketHandler(uuid)
    socket_handler.send({"message_type": "qr_code", "data": qr_code})

    return jsonify({'success': True})

@webhook_bp.route('/login/update', methods=['POST'])
def session_update():
    data = request.get_json()
    uuid = data.get('uuid')
    login_success = data.get('login_success', False)
    message = data.get('message')
    session = Session.query.get(uuid)

    if not session:
        return "Bad Request", 400

    session.logged_in = login_success
    if login_success:
        session.last_login_at = db.func.now()
    db.session.commit()

    data = {
        'success': login_success,
        'message': message
    }
    SocketHandler(uuid).send({"message_type": "login_update", "data": data})

    return jsonify({'success': True})

@webhook_bp.route('/action/update', methods=['POST'])
def action_update():
    data = request.get_json()
    action_id = data.get('action_id')
    code = data.get('code')
    message = data.get('message')

    action = Action.query.get(action_id)
    if action and code in EXIT_CODES:
        action.status = Action.Status.STOPPED
        action.message = message
        db.session.commit()

        if action.action_type == Action.ActionType.LOGIN and code == 1:
            SocketHandler(action.uuid).send({
                "message_type": "login_update", "data": {"success": False, "message": "Login Failed"}
            })

    return jsonify({'success': True})
