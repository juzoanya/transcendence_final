from django.dispatch import receiver
from django.db.models.signals import post_save

from .models import GameRequest, Tournament
from notification.utils import create_notification

@receiver(post_save, sender=GameRequest)
def post_save_create_game_request_notification(sender, instance: GameRequest, created, **kwargs):
    if created:
        create_notification(instance, instance.user, instance.invitee, f"{instance.user.username} sent you a game request.")

@receiver(post_save, sender=Tournament)
def create_tournament_chat_room(sender, instance: Tournament, created, **kwargs):
    from chat.models import ChatRoom
    if created:
        ChatRoom.rooms.add_user_to_tournament_chat(instance.name, instance.creator)
