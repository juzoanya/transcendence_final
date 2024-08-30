from django.db import models
from user.models import UserAccount
from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType
from django.contrib.humanize.templatetags.humanize import naturaltime
from .types import NotificationData
from user.serializers import serializer_basic_user_data


class Notification(models.Model):
    target = models.ForeignKey(UserAccount, on_delete=models.CASCADE)
    from_user = models.ForeignKey(UserAccount, on_delete=models.CASCADE, null=True, blank=True, related_name='from_user')
    redirect_url = models.URLField(max_length=500, unique=False, null=True, blank=True, help_text="redirection for when the notification is clicked")
    description = models.CharField(max_length=255, unique=False, blank=True, null=True)
    read = models.BooleanField(default=False)
    timestamp = models.DateTimeField(auto_now_add=True)
    content_type = models.ForeignKey(ContentType, on_delete=models.CASCADE)
    object_id = models.PositiveIntegerField()
    content_object = GenericForeignKey('content_type', 'object_id') # type: ignore

    def __str__(self):
        return self.description
    
    def save(self, send_notification=False, **kwargs):
        self.send_notification = send_notification
        super().save(**kwargs)
        print(f"CUSTOM SAVE - AFTER")
    
    def get_notification_data(self) -> NotificationData:
        model = self.content_object
        notification_type = "unkown"
        active = False
        if self.content_object and hasattr(self.content_object, 'is_active') and isinstance(self.content_object.is_active, bool):
            active = self.content_object.is_active
        if isinstance(model, models.Model):
            notification_type = str(model._meta.model_name)

        
        return {
            "notification_id": int(self.pk),
            "notification_type": str(notification_type),
            "description": str(self.description),
            "is_read": bool(self.read),
            "timestamp": int(self.timestamp.timestamp()),
            "natural_timestamp": str(naturaltime(self.timestamp)),
            "action_id": int(model.pk if model and active else -1),
            "is_active": active,
            "redirect_url": str(self.redirect_url.rstrip('/')) if self.redirect_url else None,
            "user": serializer_basic_user_data(self.from_user) if self.from_user else None
        }

