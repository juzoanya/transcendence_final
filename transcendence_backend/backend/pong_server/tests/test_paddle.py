from django.test import TestCase
from pong_server.pong_old.game_base_class import GameObjDataClass
from pong_server.pong_old.pong_settings import PongSettings
from pong_server.pong_old.pong_paddle import PongPaddle

class PaddleTestCase(TestCase):
    def setUp(self):
        self.game_settings = PongSettings()
        self.paddle = PongPaddle(PongPaddle.PaddlePos.LEFT, self.game_settings)

    def test_initial_position(self):
        self.assertEqual(self.paddle.x, float(
            self.game_settings.wall_dist) / float(self.game_settings.width))
        self.assertEqual(self.paddle.y, float((self.game_settings.height //
                         2 - self.game_settings.paddle_height // 2)) / float(self.game_settings.height))

    def test_update_pos_direct(self):
        new_y = self.paddle.y + float(10) / \
            float(self.game_settings.height)
        self.paddle.update_pos_direct(new_y)
        self.assertEqual(self.paddle.y, new_y)

    def test_update_pos_by_dir(self):
        tick = 0.5
        initial_y = self.paddle.y
        self.paddle.dy = PongPaddle.Dir.UP.value
        self.paddle.update_pos_by_dir(tick)
        expected_y = initial_y - float(tick) * self.paddle.speed_y
        self.assertEqual(self.paddle.y, expected_y)

    def test_set_direction(self):
        self.paddle.set_direction(PongPaddle.Dir.UP, False)
        self.assertEqual(self.paddle.dy, PongPaddle.Dir.UP.value)

        self.paddle.set_direction(PongPaddle.Dir.UP, True)
        self.assertEqual(self.paddle.dy, PongPaddle.Dir.NONE.value)

        self.paddle.set_direction(PongPaddle.Dir.DOWN, False)
        self.assertEqual(self.paddle.dy, PongPaddle.Dir.DOWN.value)

        self.paddle.set_direction(PongPaddle.Dir.DOWN, True)
        self.assertEqual(self.paddle.dy, PongPaddle.Dir.NONE.value)

        self.paddle.set_direction(PongPaddle.Dir.DOWN, False)
        self.paddle.set_direction(PongPaddle.Dir.UP, False)
        self.assertEqual(self.paddle.dy, PongPaddle.Dir.UP.value)

        self.paddle.set_direction(PongPaddle.Dir.DOWN, False)
        self.paddle.set_direction(PongPaddle.Dir.UP, False)
        self.paddle.set_direction(PongPaddle.Dir.DOWN, True)
        self.assertEqual(self.paddle.dy, PongPaddle.Dir.UP.value)

        self.paddle.set_direction(PongPaddle.Dir.DOWN, False)
        self.paddle.set_direction(PongPaddle.Dir.UP, False)
        self.paddle.set_direction(PongPaddle.Dir.UP, True)
        self.assertEqual(self.paddle.dy, PongPaddle.Dir.NONE.value)

    def test_set_direction2(self):
        self.paddle.set_direction2("up")
        self.assertEqual(self.paddle.dy, PongPaddle.Dir.UP.value)

        self.paddle.set_direction2("release_up")
        self.assertEqual(self.paddle.dy, PongPaddle.Dir.NONE.value)

        self.paddle.set_direction2("down")
        self.assertEqual(self.paddle.dy, PongPaddle.Dir.DOWN.value)

        self.paddle.set_direction2("release_down")
        self.assertEqual(self.paddle.dy, PongPaddle.Dir.NONE.value)

        self.paddle.set_direction2("down")
        self.paddle.set_direction2("up")
        self.assertEqual(self.paddle.dy, PongPaddle.Dir.UP.value)

        self.paddle.set_direction2("down")
        self.paddle.set_direction2("up")
        self.paddle.set_direction2("release_down")
        self.assertEqual(self.paddle.dy, PongPaddle.Dir.UP.value)

        self.paddle.set_direction2("down")
        self.paddle.set_direction2("up")
        self.paddle.set_direction2("release_up")
        self.assertEqual(self.paddle.dy, PongPaddle.Dir.NONE.value)


      

        with self.assertRaises(ValueError):
            self.paddle.set_direction2("invalid_action") # type: ignore
