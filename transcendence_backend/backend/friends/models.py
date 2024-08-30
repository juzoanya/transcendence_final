from django.contrib.contenttypes.fields import GenericRelation
from django.db import models
from user.models import UserAccount
from chat.models import ChatRoom
from notification.models import Notification
from user.utils import ConflictExcept
from django.shortcuts import get_object_or_404       
from notification.utils import create_notification, update_notification
from django.db.models import Q

class FriendRequest(models.Model):
    
    sender = models.ForeignKey(UserAccount, related_name='sent_requests', on_delete=models.CASCADE)
    receiver = models.ForeignKey(UserAccount, related_name='received_requests', on_delete=models.CASCADE)
    is_active = models.BooleanField(blank=True, null=False, default=True)
    timestamp = models.DateTimeField(auto_now_add=True)
    notifications = GenericRelation(Notification)

    def _update_state(self):
        self.is_active = False
        self.save()

    def accept(self):
        receiver_list = get_object_or_404(FriendList, user=self.receiver)
        sender_list = get_object_or_404(FriendList, user=self.sender)
        receiver_list.add_friend(self.sender)
        sender_list.add_friend(self.receiver)
        self._update_state()
        update_notification(self, f"You accepted {self.sender.username}'s friend request.")
        ChatRoom.rooms.create_private_chat(self.sender, self.receiver)
        return create_notification(self, self.receiver, self.sender, f"{self.receiver.username} accepted your friend request.")

    def reject(self):
        self._update_state()
        update_notification(self, f"You declined {self.sender}'s friend request.")
        return create_notification(self, self.receiver,self.sender, f"{self.receiver.username} declined your friend request.")

    def cancel(self):
        self._update_state()
        update_notification(self, f"{self.sender.username} cancelled the friend request.")
        return create_notification(self, self.receiver, self.sender, f"You cancelled the friend request to {self.receiver.username}.")


class FriendList(models.Model):
    user = models.OneToOneField(UserAccount, on_delete=models.CASCADE)
    friends = models.ManyToManyField(UserAccount, blank=True, related_name='friends')
    notifications = GenericRelation(Notification)

    def __str__(self):
        return self.user.username

    
    def add_friend(self, account: UserAccount):
        if account in self.friends.all():
            raise ConflictExcept("User is already your friend")
        if account == self.user:
            raise ConflictExcept("You can not add yourself to your friendlist")
        self.friends.add(account)
        self.save()

        create_notification(self, account, self.user, f"You are now friends with {account.username}.")

    def _remove_friend(self, account: UserAccount):
        if not (account in self.friends.all()):
            raise ConflictExcept("you cannot remove from friendlist, because you are not befriended")
        if account == self.user:
            raise ConflictExcept("You can not remove yourself from your friendlist")
        self.friends.remove(account)
        self.save()
   
    
    def unfriend(self, friend: UserAccount):
        self._remove_friend(friend)
        get_object_or_404(FriendList, user=friend)._remove_friend(self.user)
        ChatRoom.rooms.toggle_private_chat('inactivate', friend, self.user)
        cancel_game_request_schedules(self.user, friend)
        create_notification(self, self.user, friend, f"You are no longer friends with {self.user.username}.")
        create_notification(self, friend, self.user, f"You are no longer friends with {friend.username}.")
        
    
    def is_mutual_friend(self, friend: UserAccount):
        if friend in self.friends.all():
            return True
        return False
    
    def get_friends_public_groups(self):
        friends = self.friends.all()
        return [u.get_friends_user_room() for u in friends if isinstance(u, UserAccount)]
    
    @property
    def get_cname(self):
        return 'FriendList'


class BlockList(models.Model):
    user = models.OneToOneField(UserAccount, on_delete=models.CASCADE)
    blocked = models.ManyToManyField(UserAccount, blank=True, related_name='blocked')

    def __str__(self):
        return self.user.username
    
    def block_user(self, account: UserAccount):
        if account in self.blocked.all():
            raise ConflictExcept("User is already blocked")
        if account == self.user:
            raise ConflictExcept("You can not block yourself")
        self.blocked.add(account)
        self.save()
        ChatRoom.rooms.toggle_private_chat('inactivate', self.user, account)
        cancel_game_request_schedules(self.user, account)

    def unblock_user(self, account: UserAccount):
        if not (account in self.blocked.all()):
            raise ConflictExcept("you cannot remove from blocklist, because the user is not blocked")
        if account == self.user:
            raise ConflictExcept("You can not remove yourself from your blocklist")
        self.blocked.remove(account)
        other_list = BlockList.objects.get(user=account)
        if self.user not in other_list.blocked.all():
            ChatRoom.rooms.toggle_private_chat('activate', self.user, account)


    def is_blocked(self, account: UserAccount):
        if account in self.blocked.all():
            return True
        return False
    
    @staticmethod
    def is_either_blocked(auth_user, that_user):
        block_list = BlockList.objects.get(user=auth_user)
        other_block_list = BlockList.objects.get(user=that_user)
        if (block_list and block_list.is_blocked(that_user)) or (other_block_list and other_block_list.is_blocked(auth_user)):
            return True
        return False



def cancel_game_request_schedules(user, friend):
    from game.models import GameSchedule, GameRequest
    from user.models import Player
    p1 = Player.objects.get(user=user)
    p2 = Player.objects.get(user=friend)

    schedules=GameSchedule.objects.filter(( ( Q(player_one=p1) & Q(player_two=p2) ) | ( Q(player_one=p2) & Q(player_two=p1) ) ), game_mode='1vs1', is_active=True)

    if len(schedules) > 0:
        for schedule in schedules:
            schedule.is_active = False
            schedule.save()
    requests = GameRequest.objects.filter(Q(user=user, invitee=friend) | Q(user=friend, invitee=user), is_active=True)
    if len(requests) > 0:
        for request in requests:
            request.is_active = False
            request.save()
