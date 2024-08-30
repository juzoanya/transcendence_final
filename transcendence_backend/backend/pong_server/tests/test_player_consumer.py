from channels.testing import WebsocketCommunicator, ApplicationCommunicator
from channels.routing import URLRouter
from pong_server import routing as ps_routing
from django.test import TestCase, Client
from asgiref.sync import async_to_sync, sync_to_async
from channels.layers import get_channel_layer
from pong_server.pong_old.consumer_game import GameConsumer
from pong_server.pong_old.consumer_player import PlayerConsumer

from pong_server.pong_old import messages_client as msg_client
from pong_server.pong_old import messages_server as msg_server
from user.models import UserAccount
from game.models import GameSchedule, GameRequest, Player
from game.utils import create_game_request
from django.urls import re_path
import time
import asyncio

def createUser(num):
    return UserAccount.objects.create_user(
        username=f"testuser{num}",
        password=f"testpassword{num}",
        email=f"bla{num}@web.de",
    )



def websocket_was_closed(res, close_code: int):
    if res["type"] == "websocket.close" and res["code"] == close_code:
        return True
    return False


class TestConsumer(TestCase):
    def setUp(self):
        self.users = [createUser(x) for x in range(1, 11)]

    async def test_join_game_ok(self):
        application = URLRouter([
            re_path(r"ws/game/(?P<schedule_id>\w+)/$", PlayerConsumer.as_asgi()),
        ])
        self.communicator1 = WebsocketCommunicator(application, "/ws/game/1/")
        self.communicator1.scope['user'] = self.users[3]
        connected1, subprotocol = await self.communicator1.connect()
        print("subProtocol: ", subprotocol)
        self.assertEqual(connected1, True)
        await self.communicator1.disconnect()

    # async def test_join_game_not_authenticated(self):
    #     application = URLRouter([
    #         re_path(r"ws/game/(?P<schedule_id>\w+)/$", PlayerConsumer.as_asgi()),
    #     ])
    #     self.communicator1 = WebsocketCommunicator(application, "/ws/game/1/")
    #     connected1, subprotocol = await self.communicator1.connect()
    #     print("subProtocol: ", subprotocol)
    #     self.assertEqual(connected1, False)
    #     self.assertEqual(subprotocol, msg_server.WebsocketErrorCode.NOT_AUTHENTICATED.value)
    #     await self.communicator1.disconnect()

    # async def test_join_game_invalid_schedule_id(self):
    #     application = URLRouter([
    #         re_path(r"ws/game/(?P<schedule_id>\w+)/$", PlayerConsumer.as_asgi()),
    #     ])
    #     self.communicator1 = WebsocketCommunicator(application, "/ws/game/10000/")
    #     self.communicator1.scope['user'] = self.users[3]

    #     connected1, subprotocol = await self.communicator1.connect()
    #     self.assertEqual(connected1, True)
    #     self.assertEqual(
    #         websocket_was_closed(
    #             await self.communicator1.receive_output(),
    #             msg_server.WebsocketErrorCode.INVALID_SCHEDULE_ID.value),
    #         True
    #     )
    #     await self.communicator1.disconnect()

    # async def test_join_game_invalid_user_id(self):
    #     application = URLRouter([
    #         re_path(r"ws/game/(?P<schedule_id>\w+)/$", PlayerConsumer.as_asgi()),
    #     ])
    #     self.communicator1 = WebsocketCommunicator(application, "/ws/game/1/")
    #     self.communicator1.scope['user'] = self.users[1]

    #     connected1, subprotocol = await self.communicator1.connect()
    #     self.assertEqual(connected1, True)
    #     self.assertEqual(
    #         websocket_was_closed(
    #             await self.communicator1.receive_output(),
    #             msg_server.WebsocketErrorCode.INVALID_SCHEDULE_ID.value),
    #         True
    #     )
    #     await self.communicator1.disconnect()


    # async def test_connect(self):
    #     websocket_urlpatterns = [
    #         re_path(r"ws/game/(?P<schedule_id>\w+)/$", PlayerConsumer.as_asgi()),
    #     ]
    #     application = URLRouter(websocket_urlpatterns)

    #     self.communicator1 = WebsocketCommunicator(application, "/ws/game/1/")
    #     self.communicator1.scope['user'] = self.user_one
    #     self.communicator2 = WebsocketCommunicator(application, "/ws/game/1/")
    #     self.communicator2.scope['user'] = self.user_two

       

    #     connected1, subprotocol = await self.communicator1.connect()
    #     res = await self.communicator1.receive_json_from()
    #     print_res(res)
    #     # self.assertEqual(connected1, True)
    #     # print("now wait to disconnect")
    #     connected2, subprotocol = await self.communicator2.connect()
    #     res = await self.communicator1.receive_json_from()
    #     print_res(res)

    #     # res = await self.communicator1.receive_json_from()
    #     # print(f"res update?: {res}")
    #     # self.assertEqual(connected2, True)
    #     # # await asyncio.sleep(15)
    #     # res = await self.communicator1.receive_json_from()
    #     # print(res)
        
    #     # await self.communicator1.disconnect()
    #     # print(f"disconnect and reconnect after 5 seconds")
    #     # await asyncio.sleep(5)
    #     # connected1, subprotocol = await self.communicator1.connect()

    #     await asyncio.sleep(10)
        
    #     # await self.communicator1.disconnect()
    #     # await self.communicator2.disconnect()


def print_res(res: msg_client.GameEngineMessageResponse | msg_server.ConsumerMessage):
    if res["type"] == "handle_command_response":
        print("\n---------- From Socket -> Command Response ------------")
        print(f"command: {res['response']['cmd']}")
        print(f"success: {res['response']['success']}")
        print(f"message: {res['response']['message']}")
        print(f"status_code: {res['response']['status_code']}")
        print(f"payload: {res['response']['payload']}")
        print("----------------------\n")
    elif res['type'] == "handle_broadcast":
        bla: msg_server.BaseBroadcast = msg_server.create_instance_from_dict(res)
        if isinstance(bla, msg_server.GameUpdate):
            bla.paddle_left['dx']
        # print(f"bla: {bla}")
        # print("\n---------- From Socket -> Server Broadcast ------------")
        # print(f"broadcast: {res['server_broadcast']['tag']}")
        # print(f"payload: {res['server_broadcast']}")
        # print("----------------------\n")
    


# def createUsersAndGameScheduleObject():
#     user_one = UserAccount.objects.create_user(
#         username="testuser1",
#         password="testpassword",
#         email="bla1@web.de",
#     )
#     player_one = Player.objects.create(user=user_one)
#     user_two = UserAccount.objects.create_user(
#         username="testuser2",
#         password="testpassword",
#         email="bla2@web.de",
#     )
#     player_two = Player.objects.create(user=user_two)
#     game_request = create_game_request(
#         user_one, user_two, 0, "1vs1", None)

#     if game_request:
#         game_request.accept()
#         return user_one, user_two
#     raise Exception("Could not create game request")



# class TestConsumer(TestCase):
#     def setUp(self):
#         self.user_one, self.user_two = createUsersAndGameScheduleObject()

#     async def test_connect(self):

#         # comm = ApplicationCommunicator(application=GameConsumer.as_asgi(), scope={"type": "game_engine"})
#         comm = ApplicationCommunicator(application=GameConsumer.as_asgi(), scope={"type": "handle_command"})

#         create_cmd: msg_client.ClientCreateGameCommand = {
#             "cmd": "client-create-game",
#             "id": 1,
#             "payload": {
#                 "schedule_id": 1,
#                 "game_settings": None,
#             }
#         }


#         join1_cmd: msg_client.ClientJoinCommand = {
#             "cmd": "client-join-game",
#             "id": 2,
#             "payload": {
#                 "user_id": self.user_one.pk
#             }
#         }
#         join2_cmd: msg_client.ClientJoinCommand = {
#             "cmd": "client-join-game",
#             "id": 3,
#             "payload": {
#                 "user_id": self.user_two.pk
#             }
#         }
#         pause_cmd: msg_client.ClientPauseCommand = {
#             "cmd": "client-pause",
#             "id": 3,
#             "payload": None
#         }
#         resume_cmd: msg_client.ClientResumeCommand = {
#             "cmd": "client-resume",
#             "id": 3,
#             "payload": None
#         }

#         quit_cmd: msg_client.ClientQuitGameCommand = {
#             "cmd": "client-quit-game",
#             "id": 4,
#             "payload": None
#         }

#         engine_msg: msg_client.GameEngineMessage = {
#             "type": "handle_command",
#             "client_command": create_cmd,
#             "game_group_name": "test_room",
#             "consumer_channel_name": "test_channel",
#         }
#         try:
#             await comm.send_input(engine_msg)
#             print_res(await comm.receive_output())

#             engine_msg["client_command"] = join1_cmd
#             await comm.send_input(engine_msg)
#             print_res(await comm.receive_output())

#             engine_msg["client_command"] = join2_cmd
#             await comm.send_input(engine_msg)
#             print_res(await comm.receive_output())

            
#             await asyncio.sleep(1)
#             engine_msg["client_command"] = pause_cmd
#             await comm.send_input(engine_msg)
#             print_res(await comm.receive_output())
#             await asyncio.sleep(1)
#             engine_msg["client_command"] = pause_cmd
#             await comm.send_input(engine_msg)
#             print_res(await comm.receive_output())
#             await asyncio.sleep(1)
#             engine_msg["client_command"] = resume_cmd
#             await comm.send_input(engine_msg)
#             print_res(await comm.receive_output())
#             await asyncio.sleep(1)


#             engine_msg["client_command"] = quit_cmd
#             await comm.send_input(engine_msg)
#             print_res(await comm.receive_output())
#         except Exception as e:
#             print(f"Error: {e}")


# def print_res(res: msg_client.GameEngineMessageResponse):
#     print("\n----------------------")
#     print(f"command: {res['response']['cmd']}")
#     print(f"success: {res['response']['success']}")
#     print(f"message: {res['response']['message']}")
#     print("----------------------\n")
