from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import FriendRequest
from notification.utils import create_notification

@receiver(post_save, sender=FriendRequest)
def create_notification_friendrequest(sender: type[FriendRequest], instance: FriendRequest, created: bool, **kwargs):
    if created:
        create_notification(instance, instance.sender, instance.receiver, f"{instance.sender.username} sent you a friend request.")
        
