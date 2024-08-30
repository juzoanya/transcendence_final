from django.utils import timezone
from django.contrib.contenttypes.models import ContentType
from django.db import models
from django.db.models.query import QuerySet
from user.models import UserAccount
from .models import Notification
from django.contrib.contenttypes.fields import GenericRelation

def update_notification(instance: models.Model, description: str):
    try:
        field = instance._meta.get_field('notifications')
        if isinstance(field, GenericRelation):
            print(f"OK GENERIC RELATION")
        notification: Notification | None = instance.notifications.first()
        if notification is None:
            print(f"NOTIFICATION IS NONE?!")
            return None
        notification.read = True
        notification.description = description
        notification.timestamp = timezone.now()
        notification.save(send_notification=True)
        return notification
    except Exception as e:
     print(f"error: {e}")

def create_notification(instance: models.Model, from_u: UserAccount, to_u: UserAccount, descr: str):
    try:
        content_type = ContentType.objects.get_for_model(instance)
        field = instance._meta.get_field('notifications')
        print(f"field: {field}")
        n: Notification = instance.notifications.create(
            target=to_u,
            from_user=from_u,
            description=descr,
            content_type=content_type,
            object_id=instance.pk,
            timestamp=timezone.now()
        )
        return n
    except Exception as e:
     print(f"error: {e}")

