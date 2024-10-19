from flask_socketio import emit, join_room, leave_room

class SocketHandler:
    def __init__(self, uuid, room="default", namespace="/"):
        self.uuid = uuid
        self.room = room or "default"
        self.stream = f"{self.room}#{self.uuid}"
        self.namespace = namespace or "/"

    def send(self, data):
        emit("data", data, to=self.stream, namespace=self.namespace)

    def join(self):
        print(f"uuid: {self.uuid} connected to {self.stream}")
        join_room(self.stream)
        emit("data", {"room": self.room, "message": "join"}, to=self.stream, namespace=self.namespace)

    def leave(self):
        print(f"uuid: {self.uuid} disconnected from {self.stream}")
        leave_room(self.stream)
        emit("data", {"room": self.room, "message": "leave"}, to=self.stream, namespace=self.namespace)
