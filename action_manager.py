from container_manager import ContainerManager
from models import Action, db
from datetime import timedelta

class ActionManager():
    MAX_LIVE_TIME = timedelta(minutes=15)
    MAX_RUNNING_ACTIONS = 5

    def __init__(self, uuid):
        self.cleanup()
        self.sync()

        self.uuid = uuid
        

    def current_action(self):
        action = Action.query.filter_by(uuid=self.uuid, status=Action.Status.RUNNING).first()

        return action

    def can_start_new_action(self, action_type=None):
        current_action = self.current_action()
        if action_type and current_action:
            current_action_type = current_action.action_type
            if current_action_type == action_type:
                return [False, "Already Running " + action_type.value]
            else:
                return [False, "Session Busy with other action"]

        total_actions = Action.query.filter_by(status=Action.Status.RUNNING).count()

        return [total_actions < ActionManager.MAX_RUNNING_ACTIONS, "Maximum number of running actions reached, try again later"]

    def start_login_session(self):
        can_start, message = self.can_start_new_action(Action.ActionType.LOGIN)
        if not can_start: 
            return [False, message]

        container_manager = ContainerManager()

        try:
            action = Action(
                uuid=self.uuid,
                action_type=Action.ActionType.LOGIN,
            )
            db.session.add(action)
            db.session.commit()

            print("Starting Login Session", action.id)
            container = container_manager.run("login-session", extra_env={"UUID": self.uuid, "ACTION_ID": action.id})

            action.container_id = container.id
            action.started_at = db.func.now()
            action.status = Action.Status.RUNNING
            db.session.commit()


            return [True, "Started Login Session"]
        except Exception as e:
            return [False, str(e)]

    def cleanup(self):
        actions = Action.query.filter(
            Action.status == Action.Status.RUNNING,
            Action.started_at < db.func.now() - ActionManager.MAX_LIVE_TIME
        ).all()

        for action in actions:
            container_manager = ContainerManager()
            container_manager.kill(action.container_id)
            action.status = Action.Status.KILLED
            db.session.commit()

    def sync(self): 
        actions = Action.query.filter_by(status=Action.Status.RUNNING).all()

        for action in actions:
            container_manager = ContainerManager()
            if action.container_id and not container_manager.running(action.container_id):
                action.status = Action.Status.STOPPED
                db.session.commit()
