from channels.testing import WebsocketCommunicator, ApplicationCommunicator
from channels.routing import URLRouter
from pong_server import routing as ps_routing
from django.test import TestCase, Client
from pong_server import consumers
from asgiref.sync import async_to_sync, sync_to_async
from channels.layers import get_channel_layer
from channels.db import database_sync_to_async 
from pong_server.pong_old.consumer_game import GameConsumer

from pong_server.pong_old import messages_client as msg_client
from pong_server.pong_old import messages_server as msg_server
from user.models import UserAccount
from game.models import GameSchedule, GameRequest, Player
from game.utils import create_game_request
import time
import asyncio
import random
import concurrent.futures
import functools
from pong_server.pong_old.consumer_game import GameHandle


def createUser(num):
    return UserAccount.objects.create_user(
        username=f"testuser{num}",
        password=f"testpassword{num}",
        email=f"bla{num}@web.de",
    )

@database_sync_to_async
def get_random_schedule_item(players: list[Player], user_in_games: list[int]):
    player_one = random.choice(players)
    while player_one.user.pk in user_in_games:
        player_one = random.choice(players)
    player_two = random.choice(players)
    while player_one.user.pk == player_two.user.pk or player_two.user.pk in user_in_games:
        player_two = random.choice(players)
    
    game_request = create_game_request(player_one.user, player_two.user, 0, "1vs1", None)
    if game_request:
        game_request.accept()

    game_schedule = GameSchedule.objects.filter(player_one=player_one, player_two=player_two, is_active=True)[0]
    return {
        "schedule": game_schedule,
        "schedule_id": game_schedule.pk,
        "player_one_user_id": player_one.user.pk,
        "player_two_user_id": player_two.user.pk
    }

@database_sync_to_async
def mark_schedule_item_inactive(game_schedule: GameSchedule):
    game_schedule.is_active = False
    game_schedule.save()

class TestGameHandle(TestCase):
    def setUp(self):
        self.users = [createUser(x) for x in range(1, 10)]
        self.players = [Player.objects.create(user=user) for user in self.users]

        game_request = create_game_request(self.users[0], self.users[1], 0, "1vs1", None)
        if game_request:
            game_request.accept()
        game_request = create_game_request(self.users[2], self.users[3], 0, "1vs1", None)
        if game_request:
            game_request.accept()
        game_request = create_game_request(self.users[4], self.users[5], 0, "1vs1", None)
        if game_request:
            game_request.accept()

        self.user_in_games = []


    # async def test_create_handle(self):
    #     handle = await GameHandle.get_or_create_handle("test_room")
    #     self.assertIsInstance(handle, GameHandle)
    #     with self.assertRaises(Exception):
    #         await GameHandle.get_or_create_handle()
    #     with self.assertRaises(Exception):
    #         await GameHandle.get_or_create_handle(1)


    # async def test_join_game(self):
        
    #     handle = await GameHandle.get_or_create_handle("test_room")
    #     await handle.player_join(self.users[0].pk, 1)
    #     await GameHandle.remove_game(game_handle=handle)

    #     handle = await GameHandle.get_or_create_handle("test_room")
    #     with self.assertRaises(msg_server.CommandError):
    #         await handle.player_join(self.users[3].pk, 1)
    #     await GameHandle.remove_game(game_handle=handle)

    #     handle = await GameHandle.get_or_create_handle("test_room")
    #     with self.assertRaises(msg_server.CommandError):
    #         await handle.player_join(self.users[0].pk, 1000)
    #     await GameHandle.remove_game(game_handle=handle)

    #     handle = await GameHandle.get_or_create_handle("test_room")
    #     with self.assertRaises(msg_server.CommandError):
    #         await handle.player_join(10000, 1)
    #     await GameHandle.remove_game(game_handle=handle)

    #     handle = await GameHandle.get_or_create_handle("test_room")
    #     await handle.player_join(self.users[0].pk, 1)
    #     GameHandle.print_sessions()
    #     with self.assertRaises(msg_server.CommandError):
    #         await handle.player_join(self.users[0].pk, 2)
    #     with self.assertRaises(msg_server.CommandError):
    #         await handle.player_join(self.users[0].pk, 1)
    #     GameHandle.print_sessions()
    #     await GameHandle.remove_game(game_handle=handle)

    # async def test_running_game(self):
    #     handle = await GameHandle.get_or_create_handle("test_room")
    #     await handle.player_join(self.users[0].pk, 1)
    #     await handle.player_join(self.users[1].pk, 2)
    #     self.assertIsNotNone(handle.game)
    #     if handle.game:
    #         self.assertTrue(handle.game.is_alive())
    #     await GameHandle.remove_game(game_handle=handle)
    #     self.assertTrue(handle.removed)

    async def run_task(self):
        currtime = time.time()
        while time.time() - currtime < 1:

            game_schedule = await get_random_schedule_item(self.players, self.user_in_games)
            self.user_in_games.append(game_schedule["player_one_user_id"])
            self.user_in_games.append(game_schedule["player_two_user_id"])
            
            handle = await GameHandle.get_or_create_handle(f"game_{game_schedule['schedule_id']}")
            await handle.player_join(game_schedule["player_one_user_id"], game_schedule['schedule_id'])
            await handle.player_join(game_schedule["player_two_user_id"], game_schedule['schedule_id'])
            GameHandle.print_sessions()
            self.assertIsNotNone(handle.game)
            if handle.game:
                self.assertTrue(handle.game.is_alive())
            await GameHandle.remove_game(game_handle=handle)
            self.assertTrue(handle.removed)
            self.assertEqual(len(handle.connected_user_ids), 0)
            self.assertEqual(len(handle.reconnect_tasks), 0)
            await mark_schedule_item_inactive(game_schedule["schedule"])
            self.user_in_games.remove(game_schedule["player_one_user_id"])
            self.user_in_games.remove(game_schedule["player_two_user_id"])

    async def test_runnerr(self):
        # asyncio.get_running_loop().run_until_complete(self.run_task())
        # asyncio.get_running_loop().create_task(self.run_task())
        # await self.run_task()
        tasks = [self.run_task() for _ in range(8)]
        await asyncio.gather(*tasks)

            # game_schedule = await get_random_schedule_item(self.players)
            # handle = await GameHandle.get_or_create_handle(f"game_{game_schedule['schedule_id']}")
            # await handle.player_join(game_schedule["player_one_user_id"], game_schedule['schedule_id'])
            # await handle.player_join(game_schedule["player_two_user_id"], game_schedule['schedule_id'])
            # GameHandle.print_sessions()
            # self.assertIsNotNone(handle.game)
            # if handle.game:
            #     self.assertTrue(handle.game.is_alive())
            # await GameHandle.remove_game(game_handle=handle)
            # self.assertTrue(handle.removed)
            # self.assertEqual(len(handle.connected_user_ids), 0)
            # self.assertEqual(len(handle.reconnect_tasks), 0)
            # await mark_schedule_item_inactive(game_schedule["schedule"])
            



    # async def test_disconnect_game(self):
    #     handle = await GameHandle.get_or_create_handle("test_room")
    #     await handle.player_join(self.users[0].pk, 1)
    #     await handle.player_join(self.users[1].pk, 2)
    #     await handle.player_disconnected(self.users[0].pk)
    #     with self.assertRaises(msg_server.CommandError):
    #         await handle.player_disconnected(self.users[0].pk)
    #     await GameHandle.remove_game(game_handle=handle)

    # async def test_get_user_session_game_handle(self):
    #     handle = await GameHandle.get_user_session_game_handle(self.users[0].pk)
    #     self.assertEqual(handle, None)
    #     handle = await GameHandle.get_or_create_handle("test_room")
    #     await handle.player_join(self.users[0].pk, 1)
       


def print_res(res: msg_client.GameEngineMessageResponse):
    print("\n----------------------")
    print(f"command: {res['response']['cmd']}")
    print(f"success: {res['response']['success']}")
    print(f"message: {res['response']['message']}")
    print("----------------------\n")
