from django.db import models
from user.models import UserAccount
from django.conf import settings
from django.db.models import Count, Q
from django.db.models.query import QuerySet
from .types import ChatMessageData, ChatRoomData, Literal
from websocket_server.utils import sync_send_consumer_internal_command
from websocket_server import constants as c
from user.serializers import serializer_basic_user_data

def serializer_chat_message_data(chat_message: 'ChatMessage') -> ChatMessageData:
    userdata = serializer_basic_user_data(chat_message.user)
    return {
        'user_id': userdata['id'],
        'avatar': userdata['avatar'],
        'username': userdata['username'],
        'timestamp': int(chat_message.timestamp.timestamp()*1000),
        'message': str(chat_message.content)
    }
 
def serializer_chat_room_data(chat_room: 'ChatRoom', user: UserAccount | None = None) -> ChatRoomData:
    unread_count = None
    if user is not None:
        unread_count = chat_room.get_unread_messages_for_user(user)
    users = chat_room.users.all()
    userdata = [serializer_basic_user_data(u) for u in users if isinstance(u, UserAccount)]
    return {
        'room_id': int(chat_room.pk),
        'type': str(chat_room.type), # type: ignore
        'title': chat_room.title,
        'users': userdata,
        'unread_count': unread_count
    }

def notify_consumer_chat_room(room: "ChatRoom", user: UserAccount, action: Literal['add', 'remove']):
    msg: c.InternalCommandChatRoom = {
        'type': 'chat.room.add' if action == 'add' else 'chat.room.remove',
        'chat_room_channel_name': room.group_name,
        'data': serializer_chat_room_data(room, user if action == 'add' else None)
    }
    sync_send_consumer_internal_command(user.get_private_user_room(), msg)

def notify_chat_room_members_update(room: "ChatRoom", users: QuerySet[UserAccount]):
    msg: c.InternalCommandChatRoom = {
        'type': 'chat.room.update',
        'chat_room_channel_name': room.group_name,
        'data': serializer_chat_room_data(room)
    }
    for user in users:
        sync_send_consumer_internal_command(user.get_private_user_room(), msg)

def reverse_dotted(title: str):
    if '.' in title:
        return  '.'.join(title.split('.')[::-1])
    return None


class ChatRoomManager(models.Manager['ChatRoom']):

    def get_room_by_title_or_none(self, title: str | None = None, type: Literal['tournament', 'private'] | None = None, active: bool | None = None) -> "ChatRoom | None":
        if title is None:
            return None
        title_other = reverse_dotted(title)
        if (title_other):
            return self.filter(Q(title=title) | Q(title=title_other), type=type, is_active=active).first()
        return self.filter(title=title, type=type, is_active=active).first()

    
    def get_tournament_chat(self, tournament_name: str):
        return self.filter(title=tournament_name, type='tournament', is_active=True).first()
    
    
    def get_private_chat(self, user1: UserAccount, user2: UserAccount):
        title1 = f"{user1.username}.{user2.username}"
        title2 = f"{user2.username}.{user1.username}"
        return self.filter(Q(title=title1) | Q(title=title2), type='private').first()
    
    
    """
    FUNCTION TO ADD USER TO OR REMOVE USER FROM TOURNAMENT CHAT -> NOTIFY CONSUMERS
    """
    def add_user_to_tournament_chat(self, tournament_name: str, user: UserAccount):
        room =self.get_tournament_chat(tournament_name)
        if room is None:
            try:
                room = self.create(title=tournament_name, type='tournament')
            except Exception as e:
                raise RuntimeError(str(e))
        room.users.add(user)
        room.save()
        notify_consumer_chat_room(room, user, 'add')
        notify_chat_room_members_update(room, room.users.exclude(id=user.pk))
        
    def remove_user_from_tournament_chat(self, tournament_name: str, user: UserAccount):
        room = self.filter(title=tournament_name, type='tournament').first()
        if room and room.is_active and len(room.users.all()) > 0:
            room.users.remove(user)
            if len(room.users.all()) == 0:
                room.is_active = False
            room.save()
            notify_consumer_chat_room(room, user, 'remove')
            notify_chat_room_members_update(room, room.users.exclude(id=user.pk))

    def clear_tournament_chat(self, tournament_name: str):
        room = self.filter(title=tournament_name, type='tournament').first()
        if room and room.is_active and len(room.users.all()) > 0:
            users = room.users.all()
            for u in users:
                notify_consumer_chat_room(room, u, 'remove')
            room.is_active = False
            room.users.clear()
            room.save()
    
    """
    FUNCTION TO CREATE PIVATE CHAT -> NOTIFY CONSUMERS
    """
    def create_private_chat(self, user1: UserAccount, user2: UserAccount):
        title = f"{user1.username}.{user2.username}"
        room = self.get_private_chat(user1, user2)
        if room is not None and room.is_active == True:
            return room
        if room is not None:
            room.is_active = True
        else:
            try:
                room = self.create(title = str(user1.username + '.' + user2.username), type='private')
                room.users.add(user1)
                room.users.add(user2)
            except Exception as e:
                raise RuntimeError(str(e))
        try:
            room.save()
            notify_consumer_chat_room(room, user1, 'add')
            notify_consumer_chat_room(room, user2, 'add')
        except Exception as e:
            print(f"UNABLE TO SEND NEW ROOM TO CONSUMER")
        return room
            
            

    """
    FUNCTION TO CHANE ACTIVE STATUS OF PIVATE CHAT -> NOTIFY CONSUMERS
    """
    def toggle_private_chat(self, action: Literal['inactivate', 'activate'], user1: UserAccount, user2: UserAccount):
        room = self.get_private_chat(user1, user2)
        if room is None:
            return
        if action == 'activate' and room.is_active == False:
            room.is_active = True
            room.save()
            notify_consumer_chat_room(room, user1, 'add')
            notify_consumer_chat_room(room, user2, 'add')
        elif action == 'inactivate' and room.is_active == True:
            room.is_active = False
            room.save()
            notify_consumer_chat_room(room, user1, 'remove')
            notify_consumer_chat_room(room, user2, 'remove')

        
def room_creator(action, username1, username2):
    u1 = UserAccount.objects.get(username=username1)
    u2 = UserAccount.objects.get(username=username2)
    if action == 'find':
        return ChatRoom.rooms.get_private_chat(u1, u2)
    else:
        ChatRoom.rooms.create_private_chat(u1, u2)

class ChatRoom(models.Model):
    title = models.CharField(max_length=255, unique=True, blank=False)
    type = models.CharField(max_length=30, blank=False)
    is_active = models.BooleanField(default=True)
    users = models.ManyToManyField(settings.AUTH_USER_MODEL, help_text="users who are connected to chat room.")

    rooms = ChatRoomManager()
    objects = models.Manager()
    
    def get_unread_messages_for_user(self, user: UserAccount):
        return UnreadMessages.objects.filter(user=user, room=self).count()
    
    def clear_unread_messages_for_user(self, user: UserAccount):
        UnreadMessages.objects.filter(user=user, room=self).delete()


    def __str__(self):
        return self.title


    @property
    def group_name(self):
        """
        Returns the Channels Group name that sockets should subscribe to to get sent messages as they are generated.
        """
        return f'{self.type}-chatroom-{self.pk}'


class ChatMessageManager(models.Manager["ChatMessage"]):
    def by_room(self, room_id: int):
        return super().get_queryset().filter(room_id=room_id, room__is_active=True).order_by("-timestamp")
       

class ChatMessage(models.Model):
    user = models.ForeignKey(UserAccount, on_delete=models.CASCADE)
    room = models.ForeignKey(ChatRoom, on_delete=models.CASCADE)
    timestamp = models.DateTimeField(auto_now_add=True)
    content = models.TextField(unique=False, blank=False)

    messages = ChatMessageManager()
    objects = models.Manager()

    def __str__(self):
        return self.content



class UnreadMessages(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='unread_messages')
    message = models.ForeignKey(ChatMessage, on_delete=models.CASCADE, related_name='unread_by')
    room = models.ForeignKey(ChatRoom, on_delete=models.CASCADE, related_name='unread_messages')

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=['user', 'message', 'room'], name='unique_unread_message')
        ]
        indexes = [
            models.Index(fields=['user', 'message', 'room'], name='unread_message_idx')
        ]

    def __str__(self):
        return f'Unread message {self.message.pk} for user {self.user.username} in room {self.room}'

