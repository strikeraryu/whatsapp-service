from flask import Flask
from flask_socketio import SocketIO
from flask_cors import CORS
from apis.core import core_bp
from apis.webhook import webhook_bp
from apis.session import session_bp
from socket_manager import SocketManager
from models import db
from flask_migrate import Migrate

# Setup App
app = Flask(__name__)
app.config['SECRET_KEY'] = 'I am a big secret'
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///site.db'

# Setup DB and SocketIO

db.init_app(app)
migrate = Migrate(app, db)
socketio = SocketIO(app, cors_allowed_origins="*", logger=True, engineio_logger=True)

# Setup CORS
CORS(app, resources={r"/*": {"origins": "*"}})

# Register blueprints
app.register_blueprint(core_bp)
app.register_blueprint(webhook_bp, url_prefix='/webhook')
app.register_blueprint(session_bp, url_prefix='/session')

socketio.on_namespace(SocketManager(''))

if __name__ == '__main__':
    socketio.run(host='0.0.0.0', port=5000, app=app, debug=True)
