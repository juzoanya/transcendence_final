import time
import asyncio
from datetime import datetime
from django.db.models import F

from django.core.paginator import Paginator, InvalidPage

from channels.generic.websocket import AsyncJsonWebsocketConsumer
from channels.db import database_sync_to_async
from channels_redis.core import RedisChannelLayer
from dataclasses import dataclass


from user.models import UserAccount, Player
from chat.models import *
from friends.models import FriendList

from .constants import *
from websocket_server.utils import async_send_consumer_internal_command
from notification.models import Notification, NotificationData

from pong_server.game_engine import messages_client as game_engine_client_messages

def use_timeout(timeout_ms: int):
    def get_time():
        return time.perf_counter_ns()//1_000_000
    
    last = start = get_time()
    
    def check_timeout():
        nonlocal last
        now = get_time()
        return now - last > timeout_ms
    
    def reset_timeout():
        nonlocal last
        now = get_time()
        last = now

    return check_timeout, reset_timeout
        

class TestConnectionConsumer(AsyncJsonWebsocketConsumer):

    
    async def __heartbeat_loop(self):
        timeout = HEARTBEAT_TIMEOUT_MS / 1000
        while True:
            await asyncio.sleep(timeout/2)
            if self.check_timeout():
                await self.close()
                break
    
    async def connect(self) -> None:
        print("TestConnectionConsumer: connected")
        await self.accept()
        self.check_timeout , self.reset_timeout = use_timeout(HEARTBEAT_TIMEOUT_MS)
        await self.send_json({ "msg_type": "hello", "heartbeat_ms": HEARTBEAT_INTERVAL_MS })
        self.user_disconnect_timeout_task = asyncio.get_running_loop().create_task(self.__heartbeat_loop())

    async def disconnect(self, code: int):
            print("TestConnectionConsumer: disconnect, code: ", code)

    async def receive_json(self, content: ClientCommand, **kwargs):
            
            if content.get("command", None) == 'ping':
                self.reset_timeout()
                await self.send_json({ "msg_type": "pong" })
     

@dataclass(slots=True)
class ChatGroupnameRoomId:
    groupname: str
    room_id: int


@database_sync_to_async
def get_user_channels(user: UserAccount) -> tuple[list[str], list[ChatGroupnameRoomId]]:
    rooms = ChatRoom.rooms.filter(users=user, is_active=True).distinct()
    chats_channels = [ChatGroupnameRoomId(groupname=room.group_name, room_id=room.pk) for room in rooms]
    friends_channels = FriendList.objects.get(user=user).get_friends_public_groups()
    return friends_channels, chats_channels

@database_sync_to_async
def add_online_count(user: UserAccount):
    try:
        return UserAccount.objects.get(pk=user.pk).update_status_count(True)
    except Exception as e:
        pass

@database_sync_to_async
def remove_online_count(user: UserAccount):
    try:
        return UserAccount.objects.get(pk=user.pk).update_status_count(False)
    except Exception as e:
        pass

class NotificationConsumer(AsyncJsonWebsocketConsumer):

    """
    INITIALIZATION AND QUITTING
    """
    async def __heartbeat_loop(self):
        timeout = HEARTBEAT_INTERVAL_MS / 1000
        while True:
            await asyncio.sleep(timeout)
            currtime = time.perf_counter()*1000
            if currtime - self.lastpong > HEARTBEAT_TIMEOUT_MS:
                await self.close()
                break
            

    async def connect(self) -> None:
        print("NotificationConsumer: connect: " + str(self.scope["user"]) )
        self.scope: AuthenticatedWebsocketScope
        self.channel_layer: RedisChannelLayer
        if not isinstance(self.scope["user"], UserAccount):
            return await self.close(code=WebsocketCloseCodes.NOT_AUTHENTICATED)
        self.user: UserAccount = self.scope["user"]
        
        self.newest_timestamp = time.time()
        
        

        await self.accept()

        await self.send_json({ "msg_type": "hello", "heartbeat_ms": HEARTBEAT_INTERVAL_MS })
        

        self.private_user_room = self.user.get_private_user_room()
        print(f"PRIVATE ROOM: {self.user.username} : {self.private_user_room}")
        await self.channel_layer.group_add(self.private_user_room, self.channel_name)

        user_channels: tuple[list[str], list[ChatGroupnameRoomId]] = await get_user_channels(self.user)
        self.friend_public_group, self.chatrooms = user_channels

        for friend_room in self.friend_public_group:
            await self.channel_layer.group_add(friend_room, self.channel_name)
        for i in self.chatrooms:
            await self.channel_layer.group_add(i.groupname, self.channel_name)

        
        
        status = await add_online_count(self.user)
        if status is not None:
            await async_send_consumer_internal_command(self.user.get_friends_user_room(), {
                'type': 'friend.status.changed',
                'status': status,
                'user_id': self.user.pk
            })
        
        self.lastpong = time.perf_counter()*1000
        self.user_disconnect_timeout_task = asyncio.get_running_loop().create_task(self.__heartbeat_loop())

    async def disconnect(self, code: int):
        print("NotificationConsumer: disconnect, code: ", code)
        if hasattr(self, 'user') and isinstance(self.user, UserAccount):
            status = await remove_online_count(self.user)
            if status is not None:
                await async_send_consumer_internal_command(self.user.get_friends_user_room(), {
                    'type': 'friend.status.changed',
                    'status': status,
                    'user_id': self.user.pk
            })
        if code == WebsocketCloseCodes.NOT_AUTHENTICATED or code == 1006:
            return
        self.user_disconnect_timeout_task.cancel()
        await self.channel_layer.group_discard(self.private_user_room, self.channel_name)

        for friend_room in self.friend_public_group:
            await self.channel_layer.group_add(friend_room, self.channel_name)

        for i in self.chatrooms:
            await self.channel_layer.group_add(i.groupname, self.channel_name)



    """
    SEND MESSAGES OF A SPECIFIC TYPE TO THE CONSUMER
    """
    async def send_message(self, module: Literal['chat', 'notification', 'friend', 'game'], msg_type: int, payload: MessagePayload | None = None):
        await self.send_json({
            'module': module,
            'msg_type': msg_type,
            'payload': payload
        })
    async def send_message_chat(self, msg_type: int, payload: MessagePayload | None = None):
        await self.send_message('chat', msg_type, payload)

    async def send_message_notification(self, msg_type: int, payload: MessagePayload | None = None):
        await self.send_message('notification', msg_type, payload)
        

    """
    USER OR FRIEND ACTIONS
    :   friend.status.changed
    """
    async def friend_status_changed(self, event: InternalCommandFriendStatusChanged):
        await self.send_message('friend', MSG_TYPE_FRIEND_STATUS_CHANGED, {
            'status': event['status'],
            'user_id': event['user_id']
        })

    async def game_message(self, event: InternalCommandGameMessage):
        print(f"GAME MESSAGE: {event}")
        await self.send_message('game', event['msg_type'], {'game_id': event['id']})

    """
    CHAT MESSAGES: SEND TO CONSUMER FUNCTIONS
    :   chat.room.add
    :   chat.room.remove
    :   chat.room.update
    :   chat.message.new
    """
    async def chat_room_add(self, event: InternalCommandChatRoom):
        data = event['data']
        group_name = event.get('chat_room_channel_name')
        if group_name is not None:
            item = ChatGroupnameRoomId(groupname=group_name, room_id=data["room_id"])
            if len([i for i in self.chatrooms if i == item]) == 0:
                self.chatrooms.append(item)
                await self.channel_layer.group_add(group_name, self.channel_name)
                await self.send_message_chat(MSG_TYPE_CHAT_ROOM_ADD, {'chat_room': data})
            else:
                print(f"CHATROOM TO ADD DOES ALREADY EXIST")

    async def chat_room_remove(self, event: InternalCommandChatRoom):
        data: ChatRoomData = event['data']
        group_name = event.get('chat_room_channel_name')
        try:
            item = next(item for item in self.chatrooms if item.room_id == data["room_id"] and item.groupname == group_name)
            self.chatrooms.remove(item)
            await self.channel_layer.group_discard(group_name, self.channel_name)
            await self.send_message_chat(MSG_TYPE_CHAT_ROOM_REMOVE, {'chat_room': data})
        except StopIteration:
            print(f"chatroom to remove does not exist")

    async def chat_room_update(self, event: InternalCommandChatRoom):
        data: ChatRoomData = event['data']
        try:
            next(item for item in self.chatrooms if item.room_id == data["room_id"])
            await self.send_message_chat(MSG_TYPE_CHAT_ROOM_UPDATE, {'chat_room': data})
        except StopIteration:
            print(f"chatroom to update does not exist")
    
    async def chat_message_new(self, event: InternalCommandChatMessageNew):
        count = await self.get_chatmessages_unread_count(event['room_id'])
        await self.send_message_chat(MSG_TYPE_CHAT_MESSAGE_NEW, {"room_id": event['room_id'], "chat_message": event['data'], 'count': count})
    

    """
    CHAT MESSAGES: SYNC DATABASE LOOKUP FUNKTIONS
    """
    @database_sync_to_async
    def create_room_chat_message(self, room_id: int, message: str):
        m = ChatMessage.objects.create(user=self.user, room_id=room_id, content=message)
        return serializer_chat_message_data(m)

    @database_sync_to_async
    def get_chatmessages_page(self, room_id: int, page_number: int) -> list[ChatMessageData] | None:
        chatmessages = ChatMessage.messages.by_room(room_id)
        pages = Paginator(chatmessages, DEFAULT_ROOM_CHAT_MESSAGE_PAGE_SIZE)
        try:
            page = pages.page(page_number)
            return [ serializer_chat_message_data(e) for e in page.object_list if isinstance(e, ChatMessage)]
        except InvalidPage:
            print(f"page {page_number} out of bounds")
            
    @database_sync_to_async
    def get_chatmessages_unread_count(self, room_id: int):
        return UnreadMessages.objects.filter(user=self.user, room_id=room_id).count()

    @database_sync_to_async
    def mark_chatmessages_as_read(self, room_id: int):
        UnreadMessages.objects.filter(user=self.user, room_id=room_id).delete()
    
    """
    CHAT MESSAGES: PARSE AND HANDLE COMMAND
    """
    async def handle_chat_command(self, content: ClientCommand):
        try:
            match content['command']:
                case 'send_chat_message':
                    room_id = content['room_id']
                    message = content['message']
                    print(f"user: {self.user} wants to send a message to room: {room_id}")
                    item = next(item for item in self.chatrooms if item.room_id == room_id)
                    message_data: ChatMessageData = await self.create_room_chat_message(room_id, message)
                    print(f"user: {self.user} send a message to room: {room_id} - successsfull")
                    await async_send_consumer_internal_command(item.groupname, {
                        'type': 'chat.message.new',
                        'data': message_data,
                        'room_id': room_id,
                    })
                case 'mark_chatmessages_read':
                    next(item for item in self.chatrooms if item.room_id == content['room_id'])
                    await self.mark_chatmessages_as_read(content['room_id'])
                    await self.send_message_chat(MSG_TYPE_CHAT_MESSAGE_UNREAD_COUNT, {'room_id': content['room_id'], 'count': 0})
                case 'get_unread_chatmessages_count':
                    next(item for item in self.chatrooms if item.room_id == content['room_id'])
                    count: int = await self.get_chatmessages_unread_count(content['room_id'])
                    await self.send_message_chat(MSG_TYPE_CHAT_MESSAGE_UNREAD_COUNT, {'room_id': content['room_id'], 'count': count})
                case 'get_chatmessages_page' :
                    # print(f"handle get_chatmessages_page")
                    next(item for item in self.chatrooms if item.room_id == content['room_id'])
                    data: list[ChatMessageData] | None = await self.get_chatmessages_page(content['room_id'], content['page_number'])
                    if data is None:
                        await self.send_message_chat(MSG_TYPE_CHAT_MESSAGE_PAGINATION_EXHAUSTED, {'room_id': content['room_id']})
                    else:
                        await self.send_message_chat(MSG_TYPE_CHAT_MESSAGE_PAGE, {
                            'chat_messages': data,
                            'new_page_number': content['page_number'] + 1,
                            'room_id': content['room_id'],
                        })

        except Exception as e:
            print(f"handle_chat_command error: {e}")
    
    """
    GENERAL GET MODULE AND CALL SPECIFIC HANDLER: PARSE AND HANDLE COMMAND
    """
    async def receive_json(self, content: ClientCommand, **kwargs):
        try:
            if content.get('command') == 'ping':
                self.lastpong = time.perf_counter()*1000
                await self.send_json({ "msg_type": "pong" })
            elif content.get('module') == 'notification':
                await self.handle_notification_command(content)
            elif content.get('module') == 'chat':
                await self.handle_chat_command(content)
            else:
                if content.get('command') == 'game_dismissed':
                    schedule_id: int | None = content.get('schedule_id')
                    print(f"try send to game engine from main socket: {schedule_id}")
                    if isinstance(schedule_id, int):
                        await self.send_game_engine_command(schedule_id, {'cmd': 'client-game-dismissed', 'schedule_id': schedule_id, 'user_id': self.user.pk, 'id': -1})
        except Exception as e:
            print("\nEXCEPTION: receive_json: " + str(e) + '\n') #TODO:
        
        
    async def send_game_engine_command(self, schedule_id: int, cmd: game_engine_client_messages.InternalCommand):
        print(f"send to game engine from main socket: {schedule_id}, {cmd}")
        if not isinstance(schedule_id, int):
            return
        await self.channel_layer.send('game_engine', {
            "type": "handle_command",
            "game_group_name": f'game_{schedule_id}',
            "consumer_channel_name": self.channel_name,
            "client_command": cmd
        })
    
    """
    NOTIFICATIONS: PARSE AND HANDLE COMMAND
    """
    async def handle_notification_command(self, content: ClientCommand):
        try:
            match content['command']:
                case 'get_notifications':
                    data = await self.get_general_notifications(content['page_number'])
                    if data is None:
                        await self.send_message_notification(MSG_TYPE_NOTIFICATION_PAGINATION_EXHAUSTED, None)
                    else:
                        await self.send_message_notification(MSG_TYPE_NOTIFICATION_PAGE, { 'notifications': data, 'new_page_number': content['page_number'] + 1 })
                case "mark_notifications_read":
                    count: int = await self.mark_notifications_read(content['oldest_timestamp'])
                    await self.send_message_notification(MSG_TYPE_NOTIFICATION_UNREAD_COUNT, {'count': count } )
                case "get_unread_general_notifications_count":
                    count: int = await self.get_unread_count()
                    await self.send_message_notification(MSG_TYPE_NOTIFICATION_UNREAD_COUNT, {'count': count })
                case _:
                    return
        except Exception as e:
            print(f"handle_notification_command error: {e}")

    """
    NOTIFICATIONS: SEND TO CONSUMER FUNCTIONS
    :   notification.new
    :   notification.update
    """
    async def notification_new(self, event):
        await self.send_message_notification(MSG_TYPE_NOTIFICATION_NEW, {"notification": event['data']})

    
    async def notification_update(self, event):
        await self.send_message_notification(MSG_TYPE_NOTIFICATION_UPDATED, {"notification": event['data']})

    """
    NOTIFICATIONS: SYNC DATABASE FUNKTIONS -> RETURNS PAYLOAD
    """
    @database_sync_to_async
    def mark_notifications_read(self, newest_timestamp: int) -> int:
        ts = datetime.fromtimestamp(newest_timestamp)
        notifications = Notification.objects.filter(target=self.user, read=False).order_by('-timestamp').filter(timestamp__lte=(ts))
        for notification in notifications:
            notification.read = True
            notification.save(send_notification=False)
        count = Notification.objects.filter(target=self.user, read=False).count()
        return int(count)
    
    @database_sync_to_async
    def get_unread_count(self):
        return int(Notification.objects.filter(target=self.user, read=False).count())

    @database_sync_to_async
    def get_general_notifications(self, page_number: int) -> list[NotificationData] | None:
        notifications = Notification.objects.filter(target=self.user).order_by('-timestamp')
        pages = Paginator(notifications, DEFAULT_NOTIFICATION_PAGE_SIZE)
        try:
            page = pages.page(page_number)
            return [ e.get_notification_data() for e in page.object_list if isinstance(e, Notification)]
        except InvalidPage:
            return None

