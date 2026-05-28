import os
import json

import firebase_admin
from firebase_admin import credentials, messaging


def init_firebase_admin():
    if firebase_admin._apps:
        return

    firebase_json = os.getenv("FIREBASE_SERVICE_ACCOUNT_JSON")

    if firebase_json:
        cred_dict = json.loads(firebase_json)
        cred = credentials.Certificate(cred_dict)
    else:
        service_account_path = os.getenv(
            "FIREBASE_SERVICE_ACCOUNT_PATH",
            os.path.join(
                os.path.dirname(os.path.abspath(__file__)),
                "config",
                "firebase-service-account.json"
            )
        )
        cred = credentials.Certificate(service_account_path)

    firebase_admin.initialize_app(cred)


def send_push_to_token(token, title, body, data=None):
    try:
        if not token:
            print("FCM WEB: token vide")
            return False

        init_firebase_admin()

        safe_data = {
            str(key): str(value)
            for key, value in (data or {}).items()
            if value is not None
        }

        safe_data["click_action"] = "FLUTTER_NOTIFICATION_CLICK"

        message = messaging.Message(
            token=token,
            notification=messaging.Notification(
                title=title,
                body=body,
            ),
            data=safe_data,
            android=messaging.AndroidConfig(
                priority="high",
                notification=messaging.AndroidNotification(
                    channel_id="dwak_hna_notifications",
                    sound="default",
                ),
            ),
        )

        response = messaging.send(message)
        print("FCM WEB SENT:", response)

        return True

    except Exception as e:
        print("FCM WEB SEND ERROR:", e)
        return False