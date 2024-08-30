import os
os.environ["PYTHONASYNCIODEBUG"] = "1"
# from .game_async import PongGame
from .game import PongGame, GameData
from .pong_settings import PongSettings
import logging
from . import messages_client as msg_client
from . import messages_server as msg_server
from channels.layers import get_channel_layer, InMemoryChannelLayer
from asgiref.sync import async_to_sync, sync_to_async
from channels_redis.core import RedisChannelLayer
from channels.consumer import SyncConsumer, AsyncConsumer
from game.models import GameSchedule, GameResults
from channels.db import database_sync_to_async
from user.models import UserAccount
import sys
from typing import Literal, Final, Awaitable
import asyncio
import uuid
import time
import dataclasses
from websocket_server.utils import async_send_consumer_internal_command
from websocket_server.constants import MSG_TYPE_GAME_START_REQUESTED


GAME_CHANNEL_ALIAS = "default"
JOIN_TIMEOUT = 50
RECONNECT_TIMEOUT = 10
IDLE_TIMEOUT = 20000
START_GAME_TIMEOUT = 20

# logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)
logger.setLevel(level=logging.DEBUG)
logHandler = logging.StreamHandler(sys.stdout)
logFormatter = logging.Formatter(fmt='%(levelname)-8s:: Game Engine: %(message)s')
logHandler.setFormatter(logFormatter)
logger.addHandler(logHandler)
logging.getLogger("asyncio").setLevel(logging.WARNING)





class GameConsumer(AsyncConsumer):



    async def handle_command(self, event: msg_client.GameEngineMessage):
        try:
            print(f"GAME ENGINE MESSAGE: {event}")
            cmd = event["client_command"]
            CMD_NAME: Final = cmd["cmd"]

            user_reconnected = False
            user_session_group_name = GameHandle.get_user_session_group_name(cmd["user_id"])
            if user_session_group_name is not None and user_session_group_name != event['game_group_name']:
                raise msg_server.CommandError("User has a running session", error_code=msg_server.WebsocketErrorCode.ALREADY_RUNNING_GAME_SESSION)
            if user_session_group_name is not None and CMD_NAME == 'client-join-game':
                user_reconnected = True
            game_handle = GameHandle.get_handle(event["game_group_name"])
            if game_handle is None and CMD_NAME == 'client-join-game':
                print(f"game_handle is None: create handle! {game_handle}")
                game_handle = GameHandle.create_handle(event["game_group_name"])
            
            print(f"game handle: {game_handle}")
                
            if game_handle is not None:
                if CMD_NAME == 'client-join-game':
                    schedule_id: Final = cmd.get("schedule_id")
                    logger.info(f"user {cmd['user_id']} joined game {event['game_group_name']} -> schedule_id: {schedule_id}")
                    print(f"type of schedule id: {type(schedule_id)}")
                    if not isinstance(schedule_id, int):
                        raise RuntimeError("client-join-game: INVALID SCHEDULE ID")
                    await game_handle.player_join(cmd["user_id"], schedule_id, user_reconnected, event["consumer_channel_name"])
                    # await msg_client.async_send_command_response(event, True, f"command {cmd['cmd']} handled successfully", msg_server.WebsocketErrorCode.OK)

                elif CMD_NAME == "client-disconnected":
                    logger.info(f"user {cmd['user_id']} disconnected")
                    await game_handle.player_disconnected(cmd["user_id"])
                    # await msg_client.async_send_command_response(event, True, f"command {cmd['cmd']} handled successfully", msg_server.WebsocketErrorCode.OK)

                # elif CMD_NAME == "client-leave-game":
                #     logger.info(f"user {cmd['user_id']} attempt to leave game {event['game_group_name']}")
                #     await GameHandle.remove_game(game_handle=game_handle, user_id=cmd["user_id"])
                #     await msg_client.async_send_command_response(event, True, f"command {cmd['cmd']} handled successfully", msg_server.WebsocketErrorCode.OK)

                elif CMD_NAME ==  "client-ready":
                    game_handle.player_ready(cmd['user_id'])
                    # await msg_client.async_send_command_response(event, True, f"command {cmd['cmd']} handled successfully", msg_server.WebsocketErrorCode.OK)

                elif CMD_NAME == 'client-game-dismissed':
                    await game_handle.player_dismissed(cmd['user_id'], cmd['schedule_id'])

                elif CMD_NAME == "client-move" or CMD_NAME == 'client-move-list' or CMD_NAME == "client-pause" or CMD_NAME == "client-resume" or CMD_NAME == "client-leave-game":
                    # logger.info(f"user {cmd['user_id']} make command: {cmd['cmd']}")
                    # msg_server.start_coro(game_handle.push_action(cmd['user_id'], event['client_command']))
                    await game_handle.push_action(cmd['user_id'], event['client_command'])

                else:
                    logger.error(f"user {cmd['user_id']} invalid command: {cmd['cmd']}")
                    raise msg_server.CommandError("Invalid command", msg_server.WebsocketErrorCode.INVALID_COMMAND)
            else:
                logger.error(f"user {cmd['user_id']} invalid command: {cmd['cmd']}")
                # raise msg_server.CommandError("Invalid command", msg_server.WebsocketErrorCode.INVALID_COMMAND)

            

        except msg_server.CommandError as e:
            logger.error(f"CommandError: {e}, code: {e.error_code}")
            # await msg_client.async_send_command_response(event, False, f"Error handling message: {e}", e.error_code)
        except Exception as e:
            logger.error(f"Error handling message: {e}")
            # await msg_client.async_send_command_response(event, False, f"Error handling message: {e}", msg_server.WebsocketErrorCode.DEFAULT_ERROR)


@dataclasses.dataclass(slots=True)
class PlayerInfo:
    userId: int
    joined: bool
    ready: bool
    disconnected: bool

@dataclasses.dataclass(slots=True)
class PongGameMatchStatus:
    playerOne: PlayerInfo
    playerTwo: PlayerInfo
    gameStarted: bool
    gamePaused: bool

@database_sync_to_async
def get_game_schedule_and_create_match_status(scheduleId):
    item = GameSchedule.objects.filter(pk=scheduleId).first()
    if item is None:
        raise ValueError('the GameSchedule does not exist')
    return PongGameMatchStatus(
        playerOne=PlayerInfo(item.player_one.pk, joined=False, ready=False, disconnected=False),
        playerTwo=PlayerInfo(item.player_two.pk, joined=False, ready=False, disconnected=False),
        gameStarted=False,
        gamePaused=False
    )

class GameHandle:

    __running_user_sessions: dict[int, str] = {}
    __game_handles: dict[str, "GameHandle"] = {}
    __messenger = msg_client.InternalMessenger(game_group_name="engine", consumer_channel_name="engine")

    @classmethod
    def print_sessions(cls):
        print("sessions: ", cls.__running_user_sessions)

    @classmethod
    def get_handle(cls, game_group_name: str) -> "GameHandle | None":
        if not game_group_name or not isinstance(game_group_name, str):
            logger.error("Invalid game_group_name for game")
            raise RuntimeError("Invalid game_group_name for game")
        return cls.__game_handles.get(game_group_name, None)
      

    @classmethod
    def create_handle(cls, game_group_name: str) -> "GameHandle":
        handle = cls.get_handle(game_group_name)
        if handle is not None:
            raise RuntimeError("user has already a gameHandle!!")
        logger.debug(f"no handle found, create new handle for {game_group_name}")
        handle = cls.__game_handles[game_group_name] = GameHandle(PongSettings(), game_group_name, GAME_CHANNEL_ALIAS)
        handle.join_timeout_task = asyncio.get_running_loop().create_task(join_timeout(handle))
        return handle


    @classmethod
    async def has_session(cls, user_id: int) -> bool:
        return True if user_id in cls.__running_user_sessions else False

    @classmethod
    def get_user_session_group_name(cls, user_id: int) -> str | None:
        # print(f"USER WILL JOIN: ALL HANDLES: {cls.__running_user_sessions}")
        # name = cls.__running_user_sessions.get(user_id)
        # if name:
        #     return cls.__game_handles[name]
        # return None
        return cls.__running_user_sessions.get(user_id)

    @classmethod
    async def remove_game(cls, user_id: int | None = None, game_group_name: str | None = None, game_handle: "GameHandle | None" = None):
        try:
            logger.info(f"remove_game: name: {game_group_name}, handle: {game_handle}")
            if game_group_name and isinstance(game_group_name, str):
                if game_group_name not in cls.__game_handles:
                    raise RuntimeError(f"game_group_name {game_group_name} has no game")
                game_handle = cls.__game_handles[game_group_name]
            elif game_handle and isinstance(game_handle, GameHandle):
                game_group_name = game_handle.game_group_name
            else:
                raise RuntimeError("Invalid arguments: remove_game_handle")
            game_handle.removed = True
            
            if game_handle.idle_timeout_task:
                game_handle.idle_timeout_task.cancel()
            if game_handle.join_timeout_task:
                game_handle.join_timeout_task.cancel()
            if game_handle.start_game_timeout_task:
                game_handle.start_game_timeout_task.cancel()
            for i, t in game_handle.reconnect_tasks.items():
                t.cancel()
            
            print(f"remove game: {game_handle.game_group_name}, disconnected users: {game_handle.disconnected_user_ids}")
            for user_id in game_handle.disconnected_user_ids:
                cls.__running_user_sessions.pop(user_id, None)
            for user_id in game_handle.connected_user_ids:
                cls.__running_user_sessions.pop(user_id, None)
            
            
            await game_handle.__quit()
            del cls.__game_handles[game_group_name]
        except Exception as e:
            logger.error(f"Error in remove_game: {e}")
        
    @classmethod
    def __print_stack(cls, stack: list):
        print("\nstack:")
        for frame in stack:
            print(frame)

    def __init__(self, settings: PongSettings, game_group_name: str, channel_alias: str | None = None):
        logger.debug(f"GameHandle: __init__: {game_group_name}")
        self.game_group_name = game_group_name
        self.channel_alias = channel_alias
        self.settings = settings
        self.connected_user_ids: set[int] = set()
        self.disconnected_user_ids: set[int] = set()
        self.ready_user_ids: set[int] = set()
        self.reconnect_tasks: dict[int, asyncio.Task] = {}
        self.join_timeout_task: asyncio.Task | None = None
        self.idle_timeout_task: asyncio.Task | None = None
        self.start_game_timeout_task: asyncio.Task | None = None
        self.game: PongGame | None = None
        self.gameData: GameData | None = None
        self.last_action = time.time()
        self.removed = False


    



    def player_ready(self, user_id: int):
        logger.info(f"GameHandle: player_ready: ${user_id}")
        self.ready_user_ids.add(user_id)

    def all_players_ready(self):
        return len(self.ready_user_ids) == 2
    
    def all_players_connected(self):
        return len(self.connected_user_ids) == 2

    async def player_disconnected(self, user_id: int):
        if user_id in self.connected_user_ids:
            if self.game and self.game.is_running():
                logger.info(f"GameHandle: player_disconnected: user: {user_id}, pause game and trigger pause of the game")
                # await self.push_action(user_id, self.__messenger.user_disconnected(user_id=user_id))
                self.reconnect_tasks[user_id] = asyncio.get_running_loop().create_task(reconnect_timeout(self, user_id))
                self.game.process_pause()
                if not await msg_server.async_send_to_consumer(
                    msg_server.UserDisconnected(user_id=user_id),
                    group_name=self.game_group_name
                ):
                    logger.error(f"GameHandle: player_disconnected: {self.game_group_name}: unable to send to consumer")
                
            else:
                logger.info(f"GameHandle: player_disconnected: user: {user_id}, game not started, don't trigger reconnect timeout and pause")
            self.connected_user_ids.remove(user_id)
            self.disconnected_user_ids.add(user_id)
            if len(self.connected_user_ids) == 0:
                logger.info("GameHandle: remove GameHandle, because all clients are gone")
                await GameHandle.remove_game(game_handle=self)
        else:
            logger.error(f"GameHandle: player_disconnected: user: {user_id}, not in the game: {self.connected_user_ids}")

     

    async def start_game(self):
        logger.debug(f"GameHandle: __start_game")
        logger.debug(f"self.game: {self.game}")
        # logger.debug(f"self.game.is_alive(): {self.game.is_alive()}")
        logger.debug(f"self.gameData: {self.gameData}")
        if self.game and not self.game.is_running() and self.gameData:
            if (self.join_timeout_task):
                self.join_timeout_task.cancel()
            self.last_action = time.time()
            self.game.start_game_loop()
            self.join_timeout_task = None
            self.start_game_timeout_task = None
            self.idle_timeout_task = asyncio.get_running_loop().create_task(idle_timeout(self))
        else:
            logger.error(f"Error starting the game: Game start error!")
            raise RuntimeError("start_game: Game already started")


    async def player_join(self, user_id: int, schedule_id: int, user_reconnected: bool, player_channel: str):
        if self.game and self.game.is_running():
            if user_id in self.reconnect_tasks:
                logger.info(f"GameHandle: player_join: running game: user {user_id} in reconnect_tasks, cancel reconnect timeout")
                task = self.reconnect_tasks.pop(user_id)
                task.cancel()
                try:
                    self.connected_user_ids.add(user_id)
                    self.disconnected_user_ids.remove(user_id)
                except Exception:
                    pass
                if (len(self.reconnect_tasks) == 0):
                    logger.info(f"GameHandle: player_join: running game: all reconnections resolved, push cmd to game to resume")
                    # await self.push_action(user_id, self.__messenger.user_reconnected(user_id=user_id))
                    self.game.process_resume()
                if not await msg_server.async_send_to_consumer(
                    msg_server.UserReconnected(user_id=user_id),
                    group_name=self.game_group_name
                ):
                    logger.error(f"GameHandle: player_disconnected: {self.game_group_name}: unable to send to consumer")
            else:
                logger.error(f"GameHandle: player_join: running game: user {user_id} is not part of the game")
                raise RuntimeError(f"join game: user_id: {user_id} not participant of the game")
        else:
            if user_reconnected and user_id not in self.connected_user_ids:
                logger.info(f"GameHandle: player_join: user: {user_id} reconnected, but game ot started")
                try:
                    self.connected_user_ids.add(user_id)
                    self.disconnected_user_ids.remove(user_id)
                except Exception:
                    pass
            elif user_reconnected:
                logger.error(f"Error: GameHandle: player_join: user: {user_id} is already connected")
                raise msg_server.CommandError("User already connected", error_code=msg_server.WebsocketErrorCode.ALREADY_CONNECTED)
            else:   
                logger.info(f"GameHandle: player_join: user: {user_id} added new to the game: {self.game_group_name}")
                # await self.__add_user_to_game(user_id, schedule_id)
                try:
                    data: tuple[GameData, int] = await add_user_to_game(user_id, schedule_id, self.game_group_name)
                except Exception as e:
                    print(f"EXCEPTION IN add_user_to_game: {e}")
                if not self.gameData:
                    self.gameData = data[0]
                try:
                    self.connected_user_ids.add(data[1])
                    self.disconnected_user_ids.remove(data[1])
                except Exception:
                    pass
                try:
                    GameHandle.__running_user_sessions[data[1]] = self.game_group_name
                except Exception as e:
                    print(f"EXCEPTION IN GameHandle.__running_user_sessions[data[1]] = self.game_group_name: {e}")
                if not await msg_server.async_send_to_consumer(
                    msg_server.UserConnected(user_id=user_id),
                    group_name=self.game_group_name
                ):
                    logger.error(f"player_join: {self.game_group_name}: unable to send to consumer")
                
                print(f"player joined - check send msg: connected: {self.connected_user_ids}")
                print(f"player joined - check send msg: user_id: {user_id}")
                if len(self.connected_user_ids) == 1:
                    id = self.gameData.player_one_pk if user_id == self.gameData.player_two_pk else self.gameData.player_two_pk
                    await msg_client.async_send_mainserver_internal_command(player_channel, {'user_id': id, 'cmd': {'type': 'game.message', 'msg_type': MSG_TYPE_GAME_START_REQUESTED, 'id': self.gameData.schedule_id}})
                    # # print(f"message user for start: {channel}")
                    # # print(f"private channel player one: {self.gameData.player_one_pk}: {self.gameData.player_one_private_userchannel}")
                    # # print(f"private channel player two: {self.gameData.player_two_pk}: {self.gameData.player_two_private_userchannel}")
                    # await async_send_consumer_internal_command(channel, {'type': 'game.message', 'msg_type': MSG_TYPE_GAME_START_REQUESTED, 'id': self.gameData.schedule_id})
        
            if self.all_players_connected() and self.start_game_timeout_task is None and self.gameData:
                logger.info(f"GameHandle: player_join: all users connected, start start_game_timeout. users: {self.connected_user_ids}")
                self.start_game_timeout_task = asyncio.get_running_loop().create_task(start_game_timeout(self))
                self.game = PongGame(self.settings, self.game_group_name, self.gameData, self.channel_alias)
                jooda = self.game.get_initial_game_data(START_GAME_TIMEOUT, RECONNECT_TIMEOUT)
                # print(f"jodaa", jooda.to_dict())
                await msg_server.async_send_to_consumer(jooda, group_name=self.game_group_name)
                # await self.__start_game()
        
    async def player_dismissed(self, user_id: int, schedule_id: int):
        print(f"handle dismissed, user_id: {user_id}")
        print(f"handle dismissed, self.game: {self.game}")
        print(f"handle dismissed, self.gameData: {self.gameData}")
        print(f"handle dismissed, len(self.connected_user_ids): {len(self.connected_user_ids)}")
        if self.game is None and len(self.connected_user_ids) == 1 and self.gameData and self.gameData.schedule_id == schedule_id and (self.gameData.player_one_pk == user_id or self.gameData.player_two_pk == user_id):
            await msg_server.async_send_to_consumer(msg_server.GameDismissed(user_id=user_id), group_name=self.game_group_name)

    async def push_action(self, user_id: int, cmd: msg_client.ClientPauseCommand | msg_client.ClientResumeCommand | msg_client.ClientMoveCommand | msg_client.ClientMoveCommandList | msg_client.ClientLeaveCommand):
        if user_id not in self.connected_user_ids:
            # logger.error(f"GameHandle: push_action: user: {user_id} not part of the game, command: {action}")
            raise RuntimeError(f"unable to push action, user not part of the game")
        elif self.game and self.game.is_running():
            # logger.info(f"GameHandle: push_action: user: {user_id}, command: {action}")
            self.last_action = time.time()
            
            
            if cmd["cmd"] == 'client-pause':
                self.game.process_pause()
            elif cmd["cmd"] == 'client-resume':
                self.game.process_resume()
            elif cmd["cmd"] == 'client-leave-game':
                user_id = cmd["user_id"]
                await self.game.process_player_leave(user_id)
            elif cmd["cmd"] == 'client-move':
                user_id = cmd.get('user_id')
                new_y = cmd.get('new_y')
                ac = cmd.get('action')
                timestamp_sec = cmd.get('timestamp_sec')
                tickno = cmd.get('tickno')
                tickdiff = cmd.get('tickdiff')
                self.game.process_action(user_id, new_y, ac, timestamp_sec, tickno, tickdiff)
            elif cmd["cmd"] == 'client-move-list':
                self.game.process_movements(cmd.get('user_id'), cmd.get('movements'))
            
            # self.game
            # self.q.put_nowait(action)
        else:
            logger.error(f"Error: GameHandle: push_action: game not started. user: {user_id}, command: {cmd}")
            raise RuntimeError(f"Game not started")


    async def __quit(self):
        if self.game and self.game.is_running():
            logger.info(f"GameHandle: __quit: quit the game {self.game_group_name}")
            if self.game:
                self.game.stop_game_loop()
                del self.game
            self.game = None
            logger.debug(f"GameHandle: __quit: game thread joined")
        else:
            logger.error(f"GameHandle: __quit: game {self.game_group_name} not started")
        

        # self.reconnect_tasks.clear()
        self.connected_user_ids.clear()
        self.disconnected_user_ids.clear()

        logger.debug(f"debug game_handle members: connected_user_ids: {self.connected_user_ids}")
        logger.debug(f"debug game_handle members: game: {self.game}")
        logger.debug(f"debug game_handle members: game_group_name: {self.game_group_name}")
        logger.debug(f"debug game_handle members: gameData: {self.gameData}")
        logger.debug(f"debug game_handle members: idle_timeout_task: {self.idle_timeout_task}")
        logger.debug(f"debug game_handle members: join_timeout_task: {self.join_timeout_task}")
        logger.debug(f"debug game_handle members: reconnect_tasks: {self.reconnect_tasks}")
        logger.debug(f"debug game_handle members: last_action: {self.last_action}")
        logger.debug(f"debug game_handle members: removed: {self.removed}")




@database_sync_to_async
def add_user_to_game(user_id: int, schedule_id: int, game_group_name: str):
    logger.debug(f"GameHandle: __add_user_to_game: user {user_id}, game {game_group_name}, schedule_id: {schedule_id}")
    try:
        user: UserAccount = UserAccount.objects.get(pk=user_id)
    except UserAccount.DoesNotExist:
        logger.error(f"__add_user_to_game: user_id: {user_id} not found")
        raise msg_server.CommandError(f"join game: user_id: {user_id} not found", error_code=msg_server.WebsocketErrorCode.INVALID_USER_ID)
    try:
        gameScheduleObj = GameSchedule.objects.get(pk=schedule_id)
    except GameSchedule.DoesNotExist:
        logger.error(f"__add_user_to_game: user_id: {user_id}, Game for schedule_id: {schedule_id} not found")
        raise msg_server.CommandError(f"join game: Game for schedule_id: {schedule_id} not found", error_code=msg_server.WebsocketErrorCode.INVALID_SCHEDULE_ID)
    
    gameData = GameData(
        schedule_id=gameScheduleObj.pk,
        player_one_pk=gameScheduleObj.player_one.user.pk,
        player_two_pk=gameScheduleObj.player_two.user.pk,
        player_one_score=0,
        player_two_score=0
    )
    
    if gameScheduleObj.player_one.user == user or gameScheduleObj.player_two.user == user:
        return gameData, user.pk
    else:
        logger.error(f"__add_user_to_game: user_id: {user_id} not participant of the game")
        raise msg_server.CommandError(f"join game: user_id: {user_id} not participant of the game", error_code=msg_server.WebsocketErrorCode.USER_NO_PARTICIPANT)




background_tasks: set[asyncio.Task] = set()

def start_coro(asynctask):
    task = asyncio.get_running_loop().create_task(asynctask)
    background_tasks.add(task)
    def on_coro_done(task: asyncio.Task) -> object:
        e = task.exception()
        if e is not None:
            logger.error(f"Error: PongGame: unable to push to consumer: {e}")
        background_tasks.discard(task)
        
    task.add_done_callback(on_coro_done)
    
async def remove_game(game_handle: GameHandle, user_id: int | None = None):
    await GameHandle.remove_game(game_handle=game_handle, user_id=user_id)


async def start_game_timeout(game_handle: GameHandle):
    logger.debug(f"start game timeout: game: {game_handle.game_group_name}: task started")
    start_time = time.time()
    while True:
        await asyncio.sleep(0.05)
        if game_handle.removed:
            break
        if game_handle.all_players_connected() and (game_handle.all_players_ready() or time.time() - start_time > START_GAME_TIMEOUT):
            await game_handle.start_game()
            break


async def join_timeout(game_handle: GameHandle):
    logger.debug(f"join timeout: game: {game_handle.game_group_name}: task started")
    await asyncio.sleep(JOIN_TIMEOUT)
    logger.debug(f"join timeout: game: {game_handle.game_group_name}: timeout expired")
    logger.debug(f"connected user: {game_handle.connected_user_ids}, all connected?: {game_handle.all_players_connected()}, already removed?: {game_handle.removed}")
    if not game_handle.all_players_connected() and not game_handle.removed:
        if not await msg_server.async_send_to_consumer(
            msg_server.Error(
                error=f"players did not joined the game in {JOIN_TIMEOUT} seconds, server will close the socket connection",
                close_code=msg_server.WebsocketErrorCode.JOIN_TIMEOUT),
            group_name=game_handle.game_group_name
        ):
            logger.error(f"join timeout: game: {game_handle.game_group_name}: unable to send to consumer")
        logger.info(f"timeout joining the game: {game_handle.game_group_name}")
        logger.debug(f"join timeout: game: {game_handle.game_group_name}: remove game")
        
        # await GameHandle.remove_game(game_handle=game_handle)
        start_coro(remove_game(game_handle=game_handle))


async def reconnect_timeout(game_handle: GameHandle, user_id: int):
    logger.debug(f"reconnect timeout: game: {game_handle.game_group_name}, user: {user_id}: task started")
    await asyncio.sleep(RECONNECT_TIMEOUT)
    logger.debug(f"reconnect timeout: game: {game_handle.game_group_name}, user: {user_id}: timeout expired")
    if not game_handle.removed:
        logger.info(f"timeout for user: {user_id} reconnecting to the game: {game_handle.game_group_name}")
        if not await msg_server.async_send_to_consumer(
            msg_server.Error(
                error="player disconnected and did not reconnect, server will close the socket connection",
                close_code=msg_server.WebsocketErrorCode.RECONNECT_TIMEOUT),
            group_name=game_handle.game_group_name
        ):
            logger.error(f"reconnect timeout: game: {game_handle.game_group_name}: unable to send to consumer")
        logger.debug(f"reconnect timeout: game: {game_handle.game_group_name}, user: {user_id}: remove game")
        
        # await GameHandle.remove_game(game_handle=game_handle, user_id=user_id)
        start_coro(remove_game(game_handle=game_handle, user_id=user_id))


async def idle_timeout(game_handle: GameHandle):
    logger.debug(f"idle timeout: game: {game_handle.game_group_name}: task started")
    while game_handle.game and game_handle.game.is_running():
        await asyncio.sleep(IDLE_TIMEOUT)
        logger.debug(f"Idle timeout: game: {game_handle.game_group_name}: check idle")
        if game_handle.last_action and time.time() - game_handle.last_action > IDLE_TIMEOUT and not game_handle.removed:
            logger.info(f"Idle timeout: game: {game_handle.game_group_name}: remove game")
            if not await msg_server.async_send_to_consumer(
                msg_server.Error(
                    error="idle Timeout, server will close the socket connection",
                    close_code=msg_server.WebsocketErrorCode.IDLE_TIMEOUT),
                group_name=game_handle.game_group_name
            ):
                logger.error(f"idle timeout: game: {game_handle.game_group_name}: unable to send to consumer")
            
            # await GameHandle.remove_game(game_handle=game_handle)
            start_coro(remove_game(game_handle=game_handle))


# GAME_CHANNEL_ALIAS = "default"
# JOIN_TIMEOUT = 15
# RECONNECT_TIMEOUT = 10
# IDLE_TIMEOUT = 20000
# START_GAME_TIMEOUT = 20

# # logging.basicConfig(level=logging.DEBUG)
# logger = logging.getLogger(__name__)
# logger.setLevel(level=logging.DEBUG)
# logHandler = logging.StreamHandler(sys.stdout)
# logFormatter = logging.Formatter(fmt='%(levelname)-8s:: Game Engine: %(message)s')
# logHandler.setFormatter(logFormatter)
# logger.addHandler(logHandler)
# logging.getLogger("asyncio").setLevel(logging.WARNING)



# class GameConsumer(AsyncConsumer):

#     async def handle_command(self, event: msg_client.GameEngineMessage):
#         try:
#             game_handle = await GameHandle.get_or_create_handle(event["game_group_name"])
        
#             # internal = event["client_command"].get("internal", None)
#             # if internal and internal == 1 and event["client_command"]["cmd"] != "client-join-game":
#             #     raise msg_server.CommandError("Invalid command", msg_server.WebsocketErrorCode.INVALID_COMMAND)

#             print(f"GAME ENGINE MESSAGE: {event}")
#             cmd = event["client_command"]
#             CMD_NAME: Final = cmd["cmd"]
#             match CMD_NAME:

#                 case "client-disconnected":
#                     logger.info(f"user {cmd['user_id']} disconnected")
#                     await game_handle.player_disconnected(cmd["user_id"])
#                     await msg_client.async_send_command_response(event, True, f"command {cmd['cmd']} handled successfully", msg_server.WebsocketErrorCode.OK)

#                 case "client-join-game":
#                     schedule_id: Final = cmd.get("schedule_id")
#                     logger.info(f"user {cmd['user_id']} joined game {event['game_group_name']} -> schedule_id: {schedule_id}")
#                     print(f"type of schedule id: {type(schedule_id)}")
#                     if not isinstance(schedule_id, int):
#                         raise RuntimeError("client-join-game: INVALID SCHEDULE ID")
#                     await game_handle.player_join(cmd["user_id"], schedule_id)
#                     await msg_client.async_send_command_response(event, True, f"command {cmd['cmd']} handled successfully", msg_server.WebsocketErrorCode.OK)

#                 case "client-leave-game":
#                     logger.info(f"user {cmd['user_id']} attempt to leave game {event['game_group_name']}")
#                     await GameHandle.remove_game(game_handle=game_handle, user_id=cmd["user_id"])
#                     await msg_client.async_send_command_response(event, True, f"command {cmd['cmd']} handled successfully", msg_server.WebsocketErrorCode.OK)

#                 case  "client-ready":
#                     game_handle.player_ready(cmd['user_id'])
#                     await msg_client.async_send_command_response(event, True, f"command {cmd['cmd']} handled successfully", msg_server.WebsocketErrorCode.OK)

#                 case "client-move" | "client-pause" | "client-resume":
#                     # logger.info(f"user {cmd['user_id']} make command: {cmd['cmd']}")
#                     await game_handle.push_action(cmd['user_id'], event)

#                 case _:
#                     logger.error(f"user {cmd['user_id']} invalid command: {cmd['cmd']}")
#                     raise msg_server.CommandError("Invalid command", msg_server.WebsocketErrorCode.INVALID_COMMAND)

            

#         except msg_server.CommandError as e:
#             logger.error(f"CommandError: {e}, code: {e.error_code}")
#             await msg_client.async_send_command_response(event, False, f"Error handling message: {e}", e.error_code)
#         except Exception as e:
#             logger.error(f"Error handling message: {e}")
#             await msg_client.async_send_command_response(event, False, f"Error handling message: {e}", msg_server.WebsocketErrorCode.DEFAULT_ERROR)







# class GameHandle:

#     __running_user_sessions: dict[int, str] = {}
#     __game_handles: dict[str, "GameHandle"] = {}
#     __messenger = msg_client.InternalMessenger(game_group_name="engine", consumer_channel_name="engine")

#     @classmethod
#     def print_sessions(cls):
#         print("sessions: ", cls.__running_user_sessions)

#     @classmethod
#     async def get_or_create_handle(cls, game_group_name: str) -> "GameHandle":
#         if not game_group_name or not isinstance(game_group_name, str):
#             logger.error("Invalid game_group_name for game")
#             raise RuntimeError("Invalid game_group_name for game")
#         handle = cls.__game_handles.get(game_group_name, None)
#         if not handle:
#             logger.debug(f"no handle found, create new handle for {game_group_name}")
#             handle = cls.__game_handles[game_group_name] = GameHandle(PongSettings(), game_group_name, GAME_CHANNEL_ALIAS)
#             handle.join_timeout_task = asyncio.get_running_loop().create_task(join_timeout(handle))
#         return handle


#     @classmethod
#     async def has_session(cls, user_id: int) -> bool:
#         return True if user_id in cls.__running_user_sessions else False

#     @classmethod
#     def get_user_session_game_handle(cls, user_id: int) -> "GameHandle | None":
#         name = cls.__running_user_sessions.get(user_id)
#         if name:
#             return cls.__game_handles[name]
#         return None

#     @classmethod
#     async def remove_game(cls, user_id: int | None = None, game_group_name: str | None = None, game_handle: "GameHandle | None" = None):
#         try:
#             logger.info(f"remove_game: name: {game_group_name}, handle: {game_handle}")
#             if game_group_name and isinstance(game_group_name, str):
#                 if game_group_name not in cls.__game_handles:
#                     raise RuntimeError(f"game_group_name {game_group_name} has no game")
#                 game_handle = cls.__game_handles[game_group_name]
#             elif game_handle and isinstance(game_handle, GameHandle):
#                 game_group_name = game_handle.game_group_name
#             else:
#                 raise RuntimeError("Invalid arguments: remove_game_handle")
#             game_handle.removed = True
#             await game_handle.__quit(user_id)
#             del cls.__game_handles[game_group_name]
#         except Exception as e:
#             logger.error(f"Error in remove_game: {e}")
        
#     @classmethod
#     def __print_stack(cls, stack: list):
#         print("\nstack:")
#         for frame in stack:
#             print(frame)

#     def __init__(self, settings: PongSettings, game_group_name: str, channel_alias: str | None = None):
#         logger.debug(f"GameHandle: __init__: {game_group_name}")
#         self.game_group_name = game_group_name
#         self.channel_alias = channel_alias
#         self.settings = settings
#         self.connected_user_ids: set[int] = set()
#         self.ready_user_ids: set[int] = set()
#         self.reconnect_tasks: dict[int, asyncio.Task] = {}
#         self.join_timeout_task: asyncio.Task | None = None
#         self.idle_timeout_task: asyncio.Task | None = None
#         self.start_game_timeout_task: asyncio.Task | None = None
#         self.game: PongGame | None = None
#         self.gameData: GameData | None = None
#         self.last_action = time.time()
#         self.removed = False


    



#     def player_ready(self, user_id: int):
#         logger.info(f"GameHandle: player_ready: ${user_id}")
#         self.ready_user_ids.add(user_id)

#     def all_players_ready(self):
#         return len(self.ready_user_ids) == 2
    
#     def all_players_connected(self):
#         return len(self.connected_user_ids) == 2

#     async def player_disconnected(self, user_id: int):
#         if user_id in self.connected_user_ids:
#             if self.game and self.game.is_running():
#                 logger.info(f"GameHandle: player_disconnected: user: {user_id}, pause game and trigger pause of the game")
#                 await self.push_action(user_id, self.__messenger.user_disconnected(user_id=user_id))
#                 self.reconnect_tasks[user_id] = asyncio.get_running_loop().create_task(reconnect_timeout(self, user_id))
#                 if not await msg_server.async_send_to_consumer(
#                     msg_server.UserDisconnected(user_id=user_id),
#                     group_name=self.game_group_name
#                 ):
#                     logger.error(f"GameHandle: player_disconnected: {self.game_group_name}: unable to send to consumer")
#             else:
#                 logger.info(f"GameHandle: player_disconnected: user: {user_id}, game not started, don't trigger reconnect timeout and pause")
#             self.connected_user_ids.remove(user_id)
#             if len(self.connected_user_ids) == 0:
#                 logger.info("GameHandle: remove GameHandle, because all clients are gone")
#                 await GameHandle.remove_game(game_handle=self)
#         else:
#             logger.error(f"GameHandle: player_disconnected: user: {user_id}, not in the game: {self.connected_user_ids}")


#     @database_sync_to_async
#     def __add_user_to_game(self, user_id: int, schedule_id: int):
#         logger.debug(f"GameHandle: __add_user_to_game: user {user_id}, game {self.game_group_name}, schedule_id: {schedule_id}")
#         try:
#             user: UserAccount = UserAccount.objects.get(pk=user_id)
#         except UserAccount.DoesNotExist:
#             logger.error(f"__add_user_to_game: user_id: {user_id} not found")
#             raise msg_server.CommandError(f"join game: user_id: {user_id} not found", error_code=msg_server.WebsocketErrorCode.INVALID_USER_ID)
#         try:
#             gameScheduleObj = GameSchedule.objects.get(pk=schedule_id)
#         except GameSchedule.DoesNotExist:
#             logger.error(f"__add_user_to_game: user_id: {user_id}, Game for schedule_id: {schedule_id} not found")
#             raise msg_server.CommandError(f"join game: Game for schedule_id: {schedule_id} not found", error_code=msg_server.WebsocketErrorCode.INVALID_SCHEDULE_ID)
#         if not self.gameData:
#             self.gameData = GameData(
#                 schedule_id=gameScheduleObj.pk,
#                 player_one_pk=gameScheduleObj.player_one.user.pk,
#                 player_two_pk=gameScheduleObj.player_two.user.pk,
#                 player_one_score=0,
#                 player_two_score=0
#             )
        
#         # logger.debug(f"GameHandle: __add_user_to_game: Sessions: {GameHandle.__running_user_sessions}")
        
#         # if user_id in self.connected_user_ids:
#         #     logger.error(f"__add_user_to_game: user_id: {user_id} already joined the game")
#         #     raise msg_server.CommandError(f"join game: user_id: {user_id} already joined the game", error_code=msg_server.WebsocketErrorCode.USER_ALREADY_JOINED_GAME)
#         # if user_id in GameHandle.__running_user_sessions:
#         #     logger.error(f"__add_user_to_game: user_id: {user_id} has a running game session")
#         #     raise msg_server.CommandError(f"join game: user_id: {user_id} has a running game session", error_code=msg_server.WebsocketErrorCode.ALREADY_RUNNING_GAME_SESSION)
        
#         if gameScheduleObj.player_one.user == user or gameScheduleObj.player_two.user == user:
#             self.connected_user_ids.add(user.pk)
#             self.__running_user_sessions[user.pk] = self.game_group_name
#         else:
#             logger.error(f"__add_user_to_game: user_id: {user_id} not participant of the game")
#             raise msg_server.CommandError(f"join game: user_id: {user_id} not participant of the game", error_code=msg_server.WebsocketErrorCode.USER_NO_PARTICIPANT)
        

#     async def start_game(self):
#         logger.debug(f"GameHandle: __start_game")
#         logger.debug(f"self.game: {self.game}")
#         # logger.debug(f"self.game.is_alive(): {self.game.is_alive()}")
#         logger.debug(f"self.gameData: {self.gameData}")
#         if self.game and not self.game.is_running() and self.gameData:
#             if (self.join_timeout_task):
#                 self.join_timeout_task.cancel()
#             self.last_action = time.time()
#             self.game.start_game_loop()
#             self.join_timeout_task = None
#             self.start_game_timeout_task = None
#             self.idle_timeout_task = asyncio.get_running_loop().create_task(idle_timeout(self))
#         else:
#             logger.error(f"Error starting the game: Game start error!")
#             raise RuntimeError("start_game: Game already started")


#     async def __player_join_reconnect_game_running(self, user_id: int):
#         if user_id in self.reconnect_tasks:
#             logger.info(f"GameHandle: player_join: running game: user {user_id} in reconnect_tasks, cancel reconnect timeout")
#             task = self.reconnect_tasks.pop(user_id)
#             task.cancel()
#             self.connected_user_ids.add(user_id)
#             if (len(self.reconnect_tasks) == 0):
#                 logger.info(f"GameHandle: player_join: running game: all reconnections resolved, push cmd to game to resume")
#                 await self.push_action(user_id, self.__messenger.user_reconnected(user_id=user_id))
#             if not await msg_server.async_send_to_consumer(
#                 msg_server.UserReconnected(user_id=user_id),
#                 group_name=self.game_group_name
#             ):
#                 logger.error(f"GameHandle: player_disconnected: {self.game_group_name}: unable to send to consumer")
#         else:
#             logger.error(f"GameHandle: player_join: running game: user {user_id} is not part of the game")
#             raise RuntimeError(f"join game: user_id: {user_id} not participant of the game")

#     async def __player_join_game_not_running(self, user_id: int, schedule_id: int):
#         handle = GameHandle.get_user_session_game_handle(user_id)
#         if handle is self:
#             if user_id not in self.connected_user_ids:
#                 logger.info(f"GameHandle: player_join: user: {user_id} reconnected, but game ot started")
#                 self.connected_user_ids.add(user_id)
#             else:
#                 logger.error(f"Error: GameHandle: player_join: user: {user_id} is already connected")
#                 raise msg_server.CommandError("User already connected", error_code=msg_server.WebsocketErrorCode.ALREADY_CONNECTED)
#         elif handle is not None:
#             logger.error(f"Error: GameHandle: player_join: user: {user_id} has a session in a different game")
#             raise msg_server.CommandError("User has a running session", error_code=msg_server.WebsocketErrorCode.ALREADY_RUNNING_GAME_SESSION)
#         else:
#             logger.info(f"GameHandle: player_join: user: {user_id} added new to the game: {self.game_group_name}")
#             await self.__add_user_to_game(user_id, schedule_id)

#     async def player_join(self, user_id: int, schedule_id: int):
#         if self.game and self.game.is_running():
#             await self.__player_join_reconnect_game_running(user_id)
#         else:
#             await self.__player_join_game_not_running(user_id, schedule_id)
#             if not await msg_server.async_send_to_consumer(
#                 msg_server.UserConnected(user_id=user_id),
#                 group_name=self.game_group_name
#             ):
#                 logger.error(f"player_join: {self.game_group_name}: unable to send to consumer")
        
#             if self.all_players_connected() and self.start_game_timeout_task is None and self.gameData:
#                 logger.info(f"GameHandle: player_join: all users connected, start start_game_timeout. users: {self.connected_user_ids}")
#                 self.start_game_timeout_task = asyncio.get_running_loop().create_task(start_game_timeout(self))
#                 self.game = PongGame(self.settings, self.game_group_name, self.gameData, self.channel_alias)
#                 jooda = self.game.get_initial_game_data(START_GAME_TIMEOUT, RECONNECT_TIMEOUT)
#                 # print(f"jodaa", jooda.to_dict())
#                 await msg_server.async_send_to_consumer(jooda, group_name=self.game_group_name)
#                 # await self.__start_game()
        

#     async def push_action(self, user_id: int, action: msg_client.GameEngineMessage):
#         if user_id not in self.connected_user_ids:
#             # logger.error(f"GameHandle: push_action: user: {user_id} not part of the game, command: {action}")
#             raise RuntimeError(f"unable to push action, user not part of the game")
#         elif self.game and self.game.is_running():
#             # logger.info(f"GameHandle: push_action: user: {user_id}, command: {action}")
#             self.last_action = time.time()
#             await self.game.process_command(action)
#             # self.game
#             # self.q.put_nowait(action)
#         else:
#             logger.error(f"Error: GameHandle: push_action: game not started. user: {user_id}, command: {action}")
#             raise RuntimeError(f"Game not started")


#     async def __quit(self, user_id: int | None):
#         if self.game and self.game.is_running():
#             logger.info(f"GameHandle: __quit: quit the game {self.game_group_name}, user: {user_id}")
#             if not user_id:
#                 await self.game.process_command(self.__messenger.timeout())
#             else:
#                 await self.game.process_command(self.__messenger.leave_game(user_id))
#             self.game.stop_game_loop()
#             del self.game
#             self.game = None
#             logger.debug(f"GameHandle: __quit: game thread joined")
#         else:
#             logger.error(f"GameHandle: __quit: game {self.game_group_name} not started")
#         for user_id in self.connected_user_ids:
#             self.__running_user_sessions.pop(user_id, None)

#         # self.reconnect_tasks.clear()
#         self.connected_user_ids.clear()

#         logger.debug(f"debug game_handle members: connected_user_ids: {self.connected_user_ids}")
#         logger.debug(f"debug game_handle members: game: {self.game}")
#         logger.debug(f"debug game_handle members: game_group_name: {self.game_group_name}")
#         logger.debug(f"debug game_handle members: gameData: {self.gameData}")
#         logger.debug(f"debug game_handle members: idle_timeout_task: {self.idle_timeout_task}")
#         logger.debug(f"debug game_handle members: join_timeout_task: {self.join_timeout_task}")
#         logger.debug(f"debug game_handle members: reconnect_tasks: {self.reconnect_tasks}")
#         logger.debug(f"debug game_handle members: last_action: {self.last_action}")
#         logger.debug(f"debug game_handle members: removed: {self.removed}")



# async def start_game_timeout(game_handle: GameHandle):
#     logger.debug(f"start game timeout: game: {game_handle.game_group_name}: task started")
#     start_time = time.time()
#     while True:
#         await asyncio.sleep(0.05)
#         if game_handle.removed:
#             break
#         if game_handle.all_players_connected() and (game_handle.all_players_ready() or time.time() - start_time > START_GAME_TIMEOUT):
#             await game_handle.start_game()
#             break


# async def join_timeout(game_handle: GameHandle):
#     logger.debug(f"join timeout: game: {game_handle.game_group_name}: task started")
#     await asyncio.sleep(JOIN_TIMEOUT)
#     logger.debug(f"join timeout: game: {game_handle.game_group_name}: timeout expired")
#     logger.debug(f"connected user: {game_handle.connected_user_ids}, all connected?: {game_handle.all_players_connected()}, already removed?: {game_handle.removed}")
#     if not game_handle.all_players_connected() and not game_handle.removed:
#         if not await msg_server.async_send_to_consumer(
#             msg_server.Error(
#                 error=f"players did not joined the game in {JOIN_TIMEOUT} seconds, server will close the socket connection",
#                 close_code=msg_server.WebsocketErrorCode.JOIN_TIMEOUT),
#             group_name=game_handle.game_group_name
#         ):
#             logger.error(f"join timeout: game: {game_handle.game_group_name}: unable to send to consumer")
#         logger.info(f"timeout joining the game: {game_handle.game_group_name}")
#         logger.debug(f"join timeout: game: {game_handle.game_group_name}: remove game")
#         await GameHandle.remove_game(game_handle=game_handle)


# async def reconnect_timeout(game_handle: GameHandle, user_id: int):
#     logger.debug(f"reconnect timeout: game: {game_handle.game_group_name}, user: {user_id}: task started")
#     await asyncio.sleep(RECONNECT_TIMEOUT)
#     logger.debug(f"reconnect timeout: game: {game_handle.game_group_name}, user: {user_id}: timeout expired")
#     if not game_handle.removed:
#         logger.info(f"timeout for user: {user_id} reconnecting to the game: {game_handle.game_group_name}")
#         if not await msg_server.async_send_to_consumer(
#             msg_server.Error(
#                 error="player disconnected and did not reconnect, server will close the socket connection",
#                 close_code=msg_server.WebsocketErrorCode.RECONNECT_TIMEOUT),
#             group_name=game_handle.game_group_name
#         ):
#             logger.error(f"reconnect timeout: game: {game_handle.game_group_name}: unable to send to consumer")
#         logger.debug(f"reconnect timeout: game: {game_handle.game_group_name}, user: {user_id}: remove game")
#         await GameHandle.remove_game(game_handle=game_handle, user_id=user_id)


# async def idle_timeout(game_handle: GameHandle):
#     logger.debug(f"idle timeout: game: {game_handle.game_group_name}: task started")
#     while game_handle.game and game_handle.game.is_running():
#         await asyncio.sleep(IDLE_TIMEOUT)
#         logger.debug(f"Idle timeout: game: {game_handle.game_group_name}: check idle")
#         if game_handle.last_action and time.time() - game_handle.last_action > IDLE_TIMEOUT and not game_handle.removed:
#             logger.info(f"Idle timeout: game: {game_handle.game_group_name}: remove game")
#             if not await msg_server.async_send_to_consumer(
#                 msg_server.Error(
#                     error="idle Timeout, server will close the socket connection",
#                     close_code=msg_server.WebsocketErrorCode.IDLE_TIMEOUT),
#                 group_name=game_handle.game_group_name
#             ):
#                 logger.error(f"idle timeout: game: {game_handle.game_group_name}: unable to send to consumer")
#             await GameHandle.remove_game(game_handle=game_handle)

# async def join_game_thread(game: PongGame | None):
#     if game and game.is_running():
#         with concurrent.futures.ThreadPoolExecutor() as executor:
#             try:
#                 future = asyncio.get_running_loop().run_in_executor(executor, 
#                 functools.partial(join_game_thread_executor, game))
#                 # future.add_done_callback(lambda future: print("future done: ", future))
#                 await future
                
#             except Exception as e:
#                 logger.error(f"join error: {e}")


# def join_game_thread_executor(game: PongGame):
#     try:
#         game.join()
#     except Exception as e:
#         logger.error(f"join error in thread: {e}")

