from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import ChatMessage, UnreadMessages, ChatRoom
from websocket_server.utils import sync_send_consumer_internal_command


    
@receiver(post_save, sender=ChatMessage)
def create_unread_messages(sender, instance: ChatMessage, created: bool, **kwargs):
    if created:
        room = instance.room
        users = room.users.exclude(id=instance.user.pk)  # Exclude the sender
        for user in users:
            UnreadMessages.objects.create(user=user, message=instance, room=room)