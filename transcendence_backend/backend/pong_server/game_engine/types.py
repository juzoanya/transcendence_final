from typing import Literal, TypedDict

ServeMode = Literal["serve-winner", "serve-loser", "serve-random"]

ServeSide = Literal["serve-left", "serve-right"]


class GameSettings(TypedDict):
    point_wait_time_ms: float
    serve_mode: ServeMode
    initial_serve_to: ServeSide
    max_score: int
    tick_rate: int
    tick_duration_ms: int
    border_height: float
    border_width: float


class GameObjData(TypedDict):
    x: float
    y: float
    dx: float
    dy: float
    w: float
    h: float
    speed_x: float
    speed_y: float
    bound_top: float
    bound_bottom: float
    bound_left: float
    bound_right: float


class GameObjPositionData(TypedDict):
    x: float
    y: float
    dx: float
    dy: float
