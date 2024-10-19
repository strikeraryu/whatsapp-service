from flask_socketio import Namespace, join_room, leave_room
from socket_handler import SocketHandler


class SocketManager(Namespace):
    def on_connect(self):
        print("Client connected")

    def on_disconnect(self):
        print("Client disconnected")

    def on_join(self, data):
        room = data.get('room')
        uuid = data.get('uuid')

        if room and uuid:
            socket_handler = SocketHandler(uuid, room)
            socket_handler.join()
        else:
            print("Invalid join data")

    def on_leave(self, data):
        room = data.get('room')
        uuid = data.get('uuid')
        
        if room and uuid:
            socket_handler = SocketHandler(uuid, room)
            socket_handler.leave()
        else:
            print("Invalid leave data")
