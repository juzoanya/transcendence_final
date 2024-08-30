import math
from django.test import TestCase
from pong_server.pong_old.game_base_class import GameObjDataClass, Collision

def print_data(objBall: GameObjDataClass, objPaddle: GameObjDataClass):
    # print("------- X-Axis ------------")
    # print(f"objBall left: {objBall.left}")
    # print(f"objBall right: {objBall.right}")
    # print(f"objPaddle left: {objPaddle.left}")
    # print(f"objPaddle right: {objPaddle.right}")
    # print(f"objBall: x-axis: {objBall.left} -> {objBall.right}")
    # print(f"objPaddle: x-axis: {objPaddle.left} -> {objPaddle.right}")
    # print(f"diff x1: {abs(objBall.right - objPaddle.left)}")
    # print(f"diff x2: {abs(objPaddle.right - objBall.left)}")
    # print("--------- Y-Axis ----------")
    # print(f"objBall top: {objBall.top}")
    # print(f"objBall bottom: {objBall.bottom}")
    # print(f"objPaddle top: {objPaddle.top}")
    # print(f"objPaddle bottom: {objPaddle.bottom}")
    # print(f"objBall: y-axis: {objBall.top} -> {objBall.bottom}")
    # print(f"objPaddle: y-axis: {objPaddle.top} -> {objPaddle.bottom}")
    # print(f"diff y1: {abs(objBall.bottom - objPaddle.top)}")
    # print(f"diff y2: {abs(objPaddle.bottom - objBall.top)}")
    pass


class CollTest:

    def __init__(self, left: int, right: int, top: int, bottom: int, speed: int = 0, dir: int = 0):
        self.objPaddle = GameObjDataClass(
            scaleX=1, scaleY=1, xU=left, yU=top, wU=right - left, hU=bottom - top, dx=0.0, dy=dir, speedU=speed)

    def get_collision(self, left: int = 0, right: int = 0, top: int = 0, bottom: int = 0, speed: int = 0, dx: float = 0.0, dy: float = 0.0):
        objBall = GameObjDataClass(
            scaleX=1, scaleY=1, xU=left, yU=top, wU=right - left, hU=bottom - top, dx=dx, dy=dy, speedU=speed)
        print_data(objBall, self.objPaddle)
        return objBall.check_collision(self.objPaddle)


class TestGameBaseClass(TestCase):
    def test_init(self):
        game = GameObjDataClass(scaleX=1, scaleY=1, xU=0, yU=0, wU=1, hU=1)
        self.assertEqual(game.x, float(0))
        self.assertEqual(game.y, float(0))
        self.assertEqual(game.w, float(1))
        self.assertEqual(game.h, float(1))
        self.assertEqual(game.left, float(0))
        self.assertEqual(game.right, float(1))
        self.assertEqual(game.top, float(0))
        self.assertEqual(game.bottom, float(1))
        self.assertEqual(game.speed_x, float(0))
        self.assertEqual(game.speed_y, float(0))
        self.assertEqual(game.bound_top, float(0))
        self.assertEqual(game.bound_bottom, float(1))
        self.assertEqual(game.bound_left, float(0))
        self.assertEqual(game.bound_right, float(1))

    def test_init_with_boundObj(self):
        boundObj = GameObjDataClass(scaleX=1, scaleY=1, xU=0, yU=0, wU=1, hU=1)
        game = GameObjDataClass(scaleX=1, scaleY=1, xU=0,
                                yU=0, wU=1, hU=1, boundObj=boundObj)
        self.assertEqual(game.bound_top, float(0))
        self.assertEqual(game.bound_bottom, float(1))
        self.assertEqual(game.bound_left, float(0))
        self.assertEqual(game.bound_right, float(1))

    # def test_getDataAsDict(self):
    #     game = GameObjDataClass(scaleX=1, scaleY=1, xU=0, yU=0, wU=1, hU=1)
    #     self.assertEqual(game.getDataAsDict(), {
    #         "bottom": float(1),
    #         "bound_bottom": float(1),
    #         "bound_left": float(0),
    #         "bound_right": float(1),
    #         "bound_top": float(0),
    #         "h": float(1),
    #         "left": float(0),
    #         "right": float(1),
    #         "speed_x": float(0),
    #         "speed_y": float(0),
    #         "top": float(0),
    #         "w": float(1),
    #         "x": float(0),
    #         "y": float(0)
    #     })

    # def test_getPositionalDataAsDict(self):
    #     game = GameObjDataClass(scaleX=1, scaleY=1, xU=0, yU=0, wU=1, hU=1)
    #     self.assertEqual(game.getPositionalDataAsDict(), {
    #         "x": float(0),
    #         "y": float(0),
    #         "dx": float(0),
    #         "dy": float(0)
    #     })

    def test_collision_detection_static_paddle(self):
        test = CollTest(left=100, right=200, top=100, bottom=200)

        # collisio from right
        # no collision -> ball is moving right
        self.assertEqual(test.get_collision(left=0, right=90, top=100, bottom=200,
                                            dx=1, dy=0, speed=100), Collision.COLL_NONE)
        # no collision -> ball is moving left
        self.assertEqual(test.get_collision(left=0, right=90, top=100, bottom=200,
                                            dx=-1, dy=0, speed=100), Collision.COLL_NONE)
        # collision right -> ball is moving right
        self.assertEqual(test.get_collision(left=0, right=110, top=100, bottom=200,
                                            dx=1, dy=0, speed=100), Collision.COLL_RIGHT)
        # collision right -> ball is moving left (no collision, because wrong direction?)
        self.assertEqual(test.get_collision(left=0, right=110, top=100, bottom=200,
                                            dx=-1, dy=0, speed=100), Collision.COLL_NONE)
        # collision right -> edge
        self.assertEqual(test.get_collision(left=0, right=101, top=10, bottom=101,
                                            dx=1, dy=0, speed=100), Collision.COLL_RIGHT)

        # # collision from bottom(of the ball)
        # no collision -> ball is moving down
        self.assertEqual(test.get_collision(left=100, right=200, top=0, bottom=99,
                                            dx=0, dy=1, speed=100), Collision.COLL_NONE)
        # no collision -> ball is moving up
        self.assertEqual(test.get_collision(left=100, right=200, top=0, bottom=99,
                                            dx=0, dy=-1, speed=100), Collision.COLL_NONE)
        # collision top -> ball is moving down
        self.assertEqual(test.get_collision(left=100, right=200, top=0, bottom=120,
                                            dx=0, dy=1, speed=100), Collision.COLL_BOTTOM)
        # collision top -> ball is moving up (no collision, because wrong direction?)
        self.assertEqual(test.get_collision(left=100, right=200, top=0, bottom=120,
                                            dx=0, dy=-1, speed=100), Collision.COLL_NONE)
        # collision top -> check edge
        self.assertEqual(test.get_collision(left=0, right=101, top=0, bottom=101,
                                            dx=0, dy=1, speed=100), Collision.COLL_BOTTOM)

        # collision from top(of the ball)
        # no collision -> ball is moving down
        self.assertEqual(test.get_collision(left=100, right=200, top=210, bottom=300,
                                            dx=0, dy=1, speed=100), Collision.COLL_NONE)
        # no collision -> ball is moving up
        self.assertEqual(test.get_collision(left=100, right=200, top=210, bottom=300,
                                            dx=0, dy=-1, speed=100), Collision.COLL_NONE)
        # collision top -> ball is moving down (no collision, because wrong direction?)
        self.assertEqual(test.get_collision(left=100, right=200, top=180, bottom=300,
                                            dx=0, dy=1, speed=100), Collision.COLL_NONE)
        # collision top -> ball is moving up
        self.assertEqual(test.get_collision(left=100, right=200, top=180, bottom=300,
                                            dx=0, dy=-1, speed=100), Collision.COLL_TOP)
        # collision top -> check edge
        self.assertEqual(test.get_collision(left=0, right=101, top=199, bottom=300,
                                            dx=0, dy=-1, speed=100), Collision.COLL_TOP)
