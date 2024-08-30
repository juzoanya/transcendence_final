from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import UserAccount, Player, Leaderboard

@receiver(post_save, sender=UserAccount)
def post_user_account_creation(sender, instance, **kwargs):
    from friends.models import FriendList, BlockList
    FriendList.objects.get_or_create(user=instance)
    BlockList.objects.get_or_create(user=instance)
    player, created = Player.objects.get_or_create(user=instance)
    Leaderboard.objects.get_or_create(player=player)


