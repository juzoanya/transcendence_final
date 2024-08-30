import time
import logging
import asyncio
import json

from typing import Final, Callable, Literal

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from channels.db import database_sync_to_async

from . import messages_server as msg_server
from . import messages_client as msg_client
from .pong_ball import PongBall
from .pong_paddle import PongPaddle
from .pong_settings import PongSettings
from .game_base_class import GameObjDataClass


from .game_timer import GameTimer
from .GameState import GameState, ClientMoveItem

logger = logging.getLogger(__name__)
logger.setLevel(logging.CRITICAL)

from dataclasses import dataclass, field
from typing import Any

from game.models import GameSchedule
from game.serializers import serializer_game_result

@database_sync_to_async
def create_game_result(data: 'GameData'):
    pass
    # game = GameSchedule.objects.filter(pk=data.schedule_id).first()
    # if game is None:
    #     return
    # try:
    #     result = game.finish_game_and_update(data.player_one_score, data.player_two_score)
    #     result_data = serializer_game_result(result)
    #     return result_data
    # except Exception as e:
    #     logger.error(f"Error finish game when called: finish_game_and_update: {e}")


@dataclass
class GameData:
    schedule_id: int
    player_one_pk: int
    player_two_pk: int
    player_one_score: int
    player_two_score: int


class PongGame:

    def get_time_ms(self):
        return time.time_ns() // 1_000_000

    def sec_to_ms(self, sec) -> int:
        return int(sec*1000)

    def __init__(self,
                 settings: PongSettings,
                 group_name: str,
                 gameData: GameData,
                 channel_alias = None):
        super().__init__()
        self.settings = settings
        self.court = GameObjDataClass(
            scaleX=settings.width,
            scaleY=settings.height,
            xU=0,
            yU=settings.border_size,
            wU=settings.width,
            hU=settings.height - 2 * settings.border_size
        )
        self.ball = PongBall(settings, self.court)
        self.paddle_left = PongPaddle(PongPaddle.PaddlePos.LEFT, settings, self.court)
        self.paddle_right = PongPaddle(PongPaddle.PaddlePos.RIGHT, settings, self.court)

        self.game_channel = group_name
        self.gameResults = gameData

        self.running = False
        self.paused = False
        self.user_disconnected = False
        # self.background_msg_send_tasks: set[asyncio.Task] = set()
        self.game_loop_task: asyncio.Task | None = None
        self.game_update_task: asyncio.Task | None = None
        
        self.game_timer = GameTimer(settings.tick_rate)
        self.game_state = GameState(self.ball, self.paddle_left, self.paddle_right, self.game_timer)

        self.move_items: list[ClientMoveItem] = []
        self.last_move_update = time.perf_counter()*1000
        
    

    def is_running(self):
        return self.running
    
    def get_initial_game_data(self, timeout_time_sec: int, reconnect_timeout_sec:int) -> msg_server.BaseBroadcast:
        return msg_server.GameReady(
            timestamp_ms=self.get_time_ms(),
            court=self.court.getDataAsDict(),
            ball=self.ball.getDataAsDict(),
            paddle_left=self.paddle_left.getDataAsDict(),
            paddle_right=self.paddle_right.getDataAsDict(),
            start_timeout_sec=timeout_time_sec,
            reconnect_timeout_sec=reconnect_timeout_sec,
            user_id_left=self.gameResults.player_one_pk,
            user_id_right=self.gameResults.player_two_pk,
            settings= {
                "border_height": self.settings.border_size,
                "border_width": self.settings.border_size,
                "initial_serve_to": self.settings.initial_serve_to,
                "max_score": self.settings.max_score,
                "point_wait_time_ms": self.sec_to_ms(self.settings.point_wait_time_sec),
                "serve_mode": self.settings.serve_mode,
                "tick_rate": self.settings.tick_rate,
                "tick_duration_ms": int((1/self.settings.tick_rate)*1000)
            },
        )
        
    def start_game_loop(self, on_done_cb: Callable | None = None):
        if self.running == True:
            return False
        self.game_loop_task = asyncio.get_running_loop().create_task(self.__game_loop())
        # self.game_update_task = asyncio.get_running_loop().create_task(self.__send_udpdate())
        print("start game loop task")
        if on_done_cb is not None:
            self.game_loop_task.add_done_callback(on_done_cb)
            self.game_loop_task.remove_done_callback
        return True
    
    def set_new_done_callback(self, on_done_cb: Callable):
        if self.game_loop_task:
            self.game_loop_task.remove_done_callback(on_done_cb)
            self.game_loop_task.add_done_callback(on_done_cb)
            return True
        return False

    def stop_game_loop(self):
        self.running = False

    def terminate_game_loop(self):
        if self.game_loop_task is not None:
            self.game_loop_task.cancel()
        if self.game_update_task is not None:
            self.game_update_task.cancel()


    async def __send_udpdate(self):
        while self.running:
            await asyncio.sleep(self.game_timer.get_tick_duration('s')*2)
            data = self.game_state.get_snapshots()
            await msg_server.async_send_to_consumer(group_name=self.game_channel, server_broadcast=data)

    
    def process_resume(self):
        if not self.paused:
                raise msg_server.CommandError("game already running", msg_server.WebsocketErrorCode.OK)
        self.paused = False
        msg_server.start_coro_send_to_consumer(self.game_channel, msg_server.GameResumed())

    def process_pause(self):
        if self.paused:
                raise msg_server.CommandError("game already paused", msg_server.WebsocketErrorCode.OK)
        self.paused = True
        msg_server.start_coro_send_to_consumer(self.game_channel, msg_server.GamePaused())
        

    async def process_player_leave(self, user_id: int):
        await self.__end_game(user_id, "surrender")

    def process_command(self, cmd: msg_client.GameEngineMessage):    
        command: Final = cmd["client_command"]
        CMD_NAME: Final = command["cmd"]
        
    def process_movements(self, user_id: int, movements: list[msg_client.MovementKey | msg_client.MovementMouse]):
        if not user_id or not isinstance(user_id, int):
            raise msg_server.CommandError("invalid user_id", msg_server.WebsocketErrorCode.INVALID_COMMAND)
        paddle: PongPaddle | None = None
        # lis: list[ClientMoveItem]
        if user_id == self.gameResults.player_one_pk:
            paddle = self.paddle_left
            # lis = self.paddle_left_actions
        elif user_id == self.gameResults.player_two_pk:
            paddle = self.paddle_right
            # lis = self.paddle_right_actions
        else:
            raise msg_server.CommandError("invalid user_id", msg_server.WebsocketErrorCode.INVALID_COMMAND)
        if isinstance(movements, list):
            self.game_state.add_moves([
                ClientMoveItem(move.get('action'), move.get('new_y'), move.get('tickno'), move.get('tickdiff'), paddle) 
                for move in movements
            ])
            # for move in movements:
            #     self.game_state.movements.append(ClientMoveItem(move.get('action'), move.get('new_y'), move.get('tickno'), move.get('tickdiff'), paddle))
        

    def process_action(self, user_id: int, new_y: float | None, action: msg_client.ClientMoveDirection | None, timestamp_sec: float | None, tickno: int | None, tick_diff: float | None):
        if not user_id or not isinstance(user_id, int):
            raise msg_server.CommandError("invalid user_id", msg_server.WebsocketErrorCode.INVALID_COMMAND)

        paddle: PongPaddle | None = None
        # lis: list[ClientMoveItem]
        if user_id == self.gameResults.player_one_pk:
            paddle = self.paddle_left
            # lis = self.paddle_left_actions
        elif user_id == self.gameResults.player_two_pk:
            paddle = self.paddle_right
            # lis = self.paddle_right_actions
        else:
            raise msg_server.CommandError("invalid user_id", msg_server.WebsocketErrorCode.INVALID_COMMAND)

        if not timestamp_sec:
            raise msg_server.CommandError("invalid timestamp_sec", msg_server.WebsocketErrorCode.INVALID_COMMAND)

        # print("")
        # print("HANDLE MOVE")
        # diff = self.game_timer.get_real_time_sice_start('ms') - timestamp_sec*1000
        # print(f"client: {timestamp_sec*1000}, server: {self.game_timer.get_tick_time_since_start('ms')}, real: {self.game_timer.get_real_time_sice_start('ms')}")
        # print(f"diff client - real: {diff}")
        # print(f"tickno client: {tickno}, tickdiff: {tick_diff}")
        # calc_tickno = self.game_timer.get_real_time_sice_start('ms') / self.game_timer.get_tick_duration('ms')
        # calc_tickdiff = self.game_timer.get_real_time_sice_start('ms') % self.game_timer.get_tick_duration('ms')
        # print(f"calc_tickno client: {calc_tickno}, calc_tickdiff: {calc_tickdiff}")
        # print(f"current tick: {self.game_timer.get_current_tick()}")
        # print(f"diff client to server: {self.game_timer.get_tick_time_since_start('ms')-timestamp_sec*1000}")
        # historyticks = [state.tickno for state in self.game_state.state_history]
        # historyticks = sorted(historyticks)
        # print(f"gamestate, states: ", historyticks)
        
        if (tickno is None
            or tick_diff is None
            or tick_diff > self.game_timer.get_tick_duration("ms")
            or self.game_timer.get_current_tick() - tickno > 4
            or tickno > self.game_timer.get_current_tick()
            or (not isinstance(new_y, float) and not isinstance(action, str))):
            print(f"INVALIDDD?!")
            return
            raise msg_server.CommandError("invalid action", msg_server.WebsocketErrorCode.INVALID_COMMAND)
        
        item = ClientMoveItem(action=action, new_y=new_y, tick=tickno, timediff_ms=tick_diff, paddle=paddle)
        # self.move_items.append(item)
        self.last_move_update = time.perf_counter()*1000
        # self.game_state.reconcile(item)

    def __send_score(self, side: msg_server.GameSide, winner_pk: int):
        msg_server.start_coro_send_to_consumer(self.game_channel, msg_server.GamePlayerScored(
            side=side,
            who_scored_id=winner_pk,
            player_one_id=self.gameResults.player_one_pk,
            player_two_id=self.gameResults.player_two_pk,
            player_one_score=self.gameResults.player_one_score,
            player_two_score=self.gameResults.player_two_score
        ))

    async def __end_game(self, loser_user_id: int, reason: msg_server.GameEndReason):
        print(f"end game: user: {loser_user_id}, reason: {reason}")
        if self.gameResults.player_one_pk == loser_user_id:
            winner_user_id = self.gameResults.player_two_pk
            winner_side: msg_server.GameSide = "right"
            loser_side: msg_server.GameSide = "left"
            if reason == 'surrender':
                self.gameResults.player_two_score = self.settings.max_score
        elif self.gameResults.player_two_pk == loser_user_id:
            winner_user_id = self.gameResults.player_one_pk
            winner_side = "left"
            loser_side = "right"
            if reason == 'surrender':
                self.gameResults.player_one_score = self.settings.max_score
        else:
            raise ValueError("invalid user_id")
        if not (reason == "surrender" or reason == "timeout" or reason == "win"):
            raise ValueError("invalid reason")
        
        res = await create_game_result(self.gameResults)
        msg_server.start_coro_send_to_consumer(self.game_channel, msg_server.GameEnd(
                loser_id=loser_user_id,
                winner_id=winner_user_id,
                loser_side=loser_side,
                winner_side=winner_side,
                player_one_id=self.gameResults.player_one_pk,
                player_two_id=self.gameResults.player_two_pk,
                player_one_score=self.gameResults.player_one_score,
                player_two_score=self.gameResults.player_two_score,
                reason=reason,
                game_result=res
            ))
        
            
        self.running = False

    def __check_scores(self, score):
        if score == PongBall.Scored.SCORE_PLAYER_LEFT:
            self.gameResults.player_one_score += 1
            self.__send_score("left", self.gameResults.player_one_score)
            print(f"scored player one: {self.gameResults.player_one_score}, max score: {self.settings.max_score}")
            if self.gameResults.player_one_score == self.settings.max_score:
                msg_server.start_coro(self.__end_game(self.gameResults.player_two_pk, "win"))
        elif score == PongBall.Scored.SCORE_PLAYER_RIGHT:
            self.gameResults.player_two_score += 1
            self.__send_score("right", self.gameResults.player_two_score)
            print(f"scored player one: {self.gameResults.player_two_score}, max score: {self.settings.max_score}")
            if self.gameResults.player_two_score == self.settings.max_score:
                msg_server.start_coro(self.__end_game(self.gameResults.player_one_pk, "win"))



        
        
    async def __game_loop(self) -> None:
        self.running = True
        
        layer = get_channel_layer()
        if layer is None:
            raise RuntimeError("layer is None")
        
        self.game_timer.start_game()
        
        
        taim = time.perf_counter()
        maxtaim = 0
        mintaim = 5346453645356
        
        msg_server.start_coro_send_to_consumer(self.game_channel, msg_server.GameStart(timestamp_ms=self.game_timer.get_start_time("ms")))
        # await msg_server.async_send_to_consumer(group_name=self.game_channel, server_broadcast=msg_server.GameStart(timestamp_ms=self.game_timer.get_start_time("ms")))
        await asyncio.sleep(self.game_timer.get_initial_sleep_time())
        while self.running:
            try:
                # print(f"\nGAME LOOP")
                self.game_timer.stopwatch_start()
                # if len(self.game_state.recalculated_snapshots) > 0:
                #     print(f"recalculated snapshots: {self.game_state.recalculated_snapshots}")
               
                # if self.ball.state.score != PongBall.Scored.SCORE_NONE:
                #     self.__check_scores(self.ball.state.score)
                #     self.ball.state.apply_timeout()
                
                # score = self.ball.check_score()
                # if score != PongBall.Scored.SCORE_NONE:
                #     self.__send_scores(score)
                
                # print(f"real time: {self.game_timer.get_real_time_sice_start('ms')}")
                # print(f"tick time: {self.game_timer.get_tick_time_since_start('ms')}")
                # print(f"tickno: {self.game_timer.get_current_tick()}")
                # diff = self.game_timer.get_real_time_sice_start('ms') - self.game_timer.get_tick_time_since_start('ms')
                # if diff > 5:
                #     print(f"diff: {diff}")
                
                currtiam = time.perf_counter()
                diff = (currtiam - taim)*1000
                mintaim = min(mintaim, diff)
                maxtaim = max(maxtaim, diff)
                print(f"\nTIME SINCE LAST UPDATE: {diff}, min: {mintaim}, max: {maxtaim}")
                taim = currtiam
                score, data = self.game_state.update(self.paused)
                self.__check_scores(score)

                # msg_server.start_coro_send_to_consumer(self.game_channel, data)
                await layer.group_send(self.game_channel, {
                    "type": "handle_broadcast_binary",
                    "server_broadcast": data.tobin()
                })
              
                
                sleep_time = self.game_timer.stopwatch_end()
                print(f"tickduration: {self.game_timer.get_tick_duration('ms')} sleep time: {sleep_time*1000}")
                await asyncio.sleep(sleep_time)


            except Exception as e:
                logger.error(f"Error during game update: {e}")
        print("GAME LOOP END -> thread done")
