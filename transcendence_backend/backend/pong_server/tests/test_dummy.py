import asyncio
import concurrent.futures
import functools
import queue
import threading
import time
from pong_server.pong_old.game import PongGame
from pong_server.pong_old.pong_settings import PongSettings
from django.test import TestCase


class DummyThread(threading.Thread):
    def __init__(self, q: queue.Queue):
        super().__init__()

        self.running = True
        self.q = q

    def run(self):
        print("DummyThread started")
        while self.running:
            print("DummyThread running")
            if not self.q.empty():
                print("DummyThread got message")
                msg = self.q.get()
                print(f"DummyThread got message: {msg}")
                self.running = False

            time.sleep(0.2)
        print("DummyThread ended")

async def join_game_thread(game: threading.Thread | None):
    if game and game.is_alive():
        with concurrent.futures.ThreadPoolExecutor() as executor:
            try:
                print("ok game join in executor")
                await asyncio.get_running_loop().run_in_executor(executor, 
                functools.partial(join_game_thread_executor, game))
                print("ok game joined")
            except Exception as e:
                print(f"join error: {e}")

def join_game_thread_executor(thread: threading.Thread):
    try:
        print("try join game thread")
        thread.join()
        print("game joined")
    except Exception as e:
        print(f"join error: {e}")





class TestDummy(TestCase):

    async def test_dummy(self):
        q = queue.Queue()
        # game = DummyThread(q)
        game = PongGame(PongSettings(), "hallo", q, None)
        game.start()
        time.sleep(2)
        q.put({"cmd": "client-leave-game", "id": 0, "payload": None})
        await join_game_thread(game)