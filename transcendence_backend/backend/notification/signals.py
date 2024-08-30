from django.dispatch import receiver
from django.db.models.signals import post_save, pre_save
from websocket_server.utils import sync_send_consumer_internal_command
from .models import Notification


@receiver(post_save, sender=Notification)
def post_save_notification_message_consumer(sender, instance: Notification, created, **kwargs):

    if not created and not instance.send_notification:
        return

    msg_type = "notification.new" if created else "notification.update"
    try:
        sync_send_consumer_internal_command(instance.target.get_private_user_room(), {
            "type": msg_type,
            "data": instance.get_notification_data()
        })

    except Exception as e:
        print(f"error: {e}")
