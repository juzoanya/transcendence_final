import json
import logging
import time
from channels.generic.websocket import AsyncWebsocketConsumer
# from .game_engine.messages_client import ClientCommand, GameEngineMessage, GameEngineMessageResponse
from channels_redis.core import RedisChannelLayer
from channels.layers import InMemoryChannelLayer, get_channel_layer
from .game_engine import messages_server as msg_server
from .game_engine import messages_client as msg_client
from user.models import UserAccount
import asyncio
from websocket_server.constants import MSG_TYPE_GAME_START_REQUESTED
from websocket_server.utils import async_send_consumer_internal_command
from channels.db import database_sync_to_async
from game.models import GameSchedule
import dataclasses

logger = logging.getLogger(__name__)





class PlayerConsumer(AsyncWebsocketConsumer):

    # def get_game_engine_message(self, command: ClientCommand | msg_client.InternalCommand) -> GameEngineMessage:
    #     return {
    #         "type": "handle_command",
    #         "client_command": command,
    #         "consumer_channel_name": self.channel_name,
    #         "game_group_name": self.game_group_name
    #     }

    
    async def __heartbeat_loop(self):
        timeout = msg_server.HEARTBEAT_TIMEOUT_MS / 1000
        await asyncio.sleep(1)
        while True:
            await asyncio.sleep(timeout)
            currtime = time.perf_counter()*1000
            print(f"CHECK HEARTBEAT - PONG GAME: user: {self.user} diff: {currtime - self.lastpong}")
            if currtime - self.lastpong > msg_server.HEARTBEAT_TIMEOUT_MS:
                print("Heartbeat error -> No Message in Interval, close connection")
                await self.close_connection(push_to_engine=True, code=msg_server.WebsocketErrorCode.PLAYER_TIMEOUT.value, reason="Player Disconnected Timeout")
                await self.close()
                break
    

    async def close_connection(self, push_to_engine: bool, code = None, reason = None):
        self.self_closed = True
        self.closed = True
        if push_to_engine == True:
            await self.messenger.push_to_game_engine(self.messenger.user_disconnected(self.user.pk))
        await self.close(code=code, reason=reason)

    async def connect(self):
        # logger.error(f"Scope: {self.scope}")
        print("PlayerConsumer: connect: " + str(self.scope["user"]) )
        
        self.schedule_id = self.scope['url_route']['kwargs']['schedule_id'] if 'schedule_id' in self.scope['url_route']['kwargs'] else -1
        self.game_group_name = f'game_{self.schedule_id}'
        self.messenger = msg_client.InternalMessenger(game_group_name=self.game_group_name, consumer_channel_name=self.channel_name)
        self.user: UserAccount = self.scope["user"]
        self.channel_layer: RedisChannelLayer | None = get_channel_layer()
        self.self_closed = False
        self.closed = False
        self.last_update = time.perf_counter()
        self.started_unix_ms = time.time() * 1000
        self.started_perf = time.perf_counter() * 1000
        self.schedule_info: ScheduleInfo | None = await get_game_schedule_channels(int(self.schedule_id))
        
        # 1724603796126
        # 1724610366378

        if not self.channel_layer:
            logger.error("Channel layer not found")
            await self.close_connection(False)
            return

        
        if not self.user or not self.user.is_authenticated:
            logger.error("User not authenticated")
            await self.close_connection(False, code=msg_server.WebsocketErrorCode.NOT_AUTHENTICATED.value, reason="Not authenticated")
            return

        await self.channel_layer.group_add(
                self.game_group_name,
                self.channel_name
            )

        await self.accept()
        msg = self.messenger.join_game(self.user.pk, int(self.schedule_id))
        await self.messenger.push_to_game_engine(msg)
        res: msg_server.ServerHelloCommand = {
                    "tag": "hello",
                    "heartbeat_ms": msg_server.HEARTBEAT_INTERVAL_MS
        }
        await self.send(json.dumps(res))
        self.lastpong = time.perf_counter()*1000
        self.recentMessage = False
        self.player_disconnect_timeout_task = asyncio.get_running_loop().create_task(self.__heartbeat_loop())
        
    async def disconnect(self, close_code):
        print("closeeeed...disconnected?!?")
        if not self.self_closed:
            await self.messenger.push_to_game_engine(self.messenger.user_disconnected(self.user.pk))
            await self.close()
        if self.channel_layer:
            await self.channel_layer.group_discard(self.game_group_name, self.channel_name)

    async def send_pong(self, client_timestamp_ms: float):
        curr = time.perf_counter() * 1000
        # print(f"ping fro user: user {self.user}")
        servertime = self.started_unix_ms + (curr - self.started_perf) * 1000
        res: msg_server.ServerPongCommand = {
            "tag": "pong",
            "client_timestamp_ms": client_timestamp_ms,
            "server_timestamp_ms": servertime
        }
        await self.send(text_data=json.dumps(res))

    async def receive(self, text_data):
        if self.self_closed == False:
            try:
                clientCommand: msg_client.ClientCommand = json.loads(text_data)
                self.recentMessage = True
                print(f"message - last message from user: {self.user} since: {time.perf_counter()*1000 - self.lastpong}")
                self.lastpong = time.perf_counter()*1000
                if clientCommand.get("cmd") == "ping":
                    await self.send_pong(clientCommand.get("client_timestamp_ms", 0))
                else:
                    clientCommand["user_id"] = self.user.pk
                    if self.channel_layer:
                        await self.messenger.push_to_game_engine(clientCommand)
            except Exception as e:
                logger.error(f"Error in receive: {e}")


    async def handle_command_response(self, event: msg_client.GameEngineMessageResponse):
        if self.self_closed == False:
            match event["response"]["status_code"]:
                case (msg_server.WebsocketErrorCode.INVALID_SCHEDULE_ID.value
                    | msg_server.WebsocketErrorCode.INVALID_USER_ID.value
                    | msg_server.WebsocketErrorCode.USER_NO_PARTICIPANT.value):
                    await self.close_connection(False, code=event["response"]["status_code"])
                    return
            
            try:
                await self.send(text_data=json.dumps(event["response"]))
            except Exception as e:
                logger.error(f"Error in handle_command_response: {e}")

    async def handle_broadcast(self, event: msg_server.ConsumerMessage):
        if self.self_closed == False:
            try:
                data = event["server_broadcast"]
                if data and data["tag"] == "server-game-error":
                    print(data)
                    await self.close_connection(True, code=data["close_code"], reason=data['error'])
                else:
                    await self.send(text_data=json.dumps(data))
                    if data and data["tag"] == "server-game-end":
                        await self.close_connection(True)
            except Exception as e:
                logger.error(f"Error in handle_broadcast: {e}")

    async def handle_broadcast_binary(self, event: msg_server.ConsumerMessage):
        if self.self_closed == False:
            try:
                await self.send(bytes_data=event["server_broadcast"])
            except Exception as e:
                logger.error(f"Error in handle_broadcast: {e}")
                
    async def send_internal_message(self, event: msg_client.MainInternalCommandEvent):
        print(f"send internal msg: schedule info: {self.schedule_info}")
        if self.schedule_info:
            id = event["cmd"]["user_id"]
            channel = self.schedule_info.player_one_private_channel if self.schedule_info.player_one_pk == id else self.schedule_info.player_two_private_channel 
            print(f"message user for start: {channel}")
        await async_send_consumer_internal_command(channel, event["cmd"]["cmd"])
    

@dataclasses.dataclass
class ScheduleInfo:
    player_one_pk: int
    player_one_username: str
    player_one_private_channel: str
    player_two_pk: int
    player_two_username: str
    player_two_private_channel: str

@database_sync_to_async
def get_game_schedule_channels(schedule_id: int):
    s = GameSchedule.objects.filter(pk=schedule_id).first()
    if s:
        return ScheduleInfo(
            player_one_pk=s.player_one.user.pk,
            player_one_username=s.player_one.user.username,
            player_one_private_channel=s.player_one.user.get_private_user_room(),
            player_two_pk=s.player_two.user.pk,
            player_two_username=s.player_two.user.username,
            player_two_private_channel=s.player_two.user.get_private_user_room()
        )