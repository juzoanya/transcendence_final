import struct
import math
from enum import Enum
import dataclasses
from typing import TypedDict
from .types import GameObjData, GameObjPositionData


@dataclasses.dataclass(slots=True)
class BaseBroadcastBin:
    def tobin(self):
        pass

@dataclasses.dataclass
class GameObjPositionDataclass(BaseBroadcastBin):
    x: float
    y: float
    dx: float
    dy: float
    state: int = dataclasses.field(default=0)
    
    def tobin(self):
        return struct.pack("ffff", self.x, self.y, self.dx, self.dy)



class Collision(Enum):
    COLL_NONE = 0
    COLL_TOP = 1
    COLL_RIGHT = 2
    COLL_BOTTOM = 3
    COLL_LEFT = 4

    @staticmethod
    def collision_detection(objA: "GameObjDataClass", objB: "GameObjDataClass") -> "tuple[Collision, float]":
        collision_x = Collision.COLL_NONE
        collision_y = Collision.COLL_NONE
        diffTime_x = float('Infinity')
        diffTime_y = float('Infinity')

        relVeloX = objA.dx * objA.speed_x - objB.dx * objB.speed_x
        relVeloY = objA.dy * objA.speed_y - objB.dy * objB.speed_y

        if relVeloX != 0:
            reciRelVeloX = 1 / abs(relVeloX)
            if (relVeloX > 0 and objA.right > objB.left and objA.left < objB.right):
                diffTime_x = abs(objA.right - objB.left) * reciRelVeloX
                collision_x = Collision.COLL_RIGHT
            elif (relVeloX < 0 and objA.left < objB.right and objA.right > objB.left):
                diffTime_x = abs(objB.right - objA.left) * reciRelVeloX
                collision_x = Collision.COLL_LEFT

        if relVeloY != 0:
            reciRelVeloY = 1 / abs(relVeloY)
            if (relVeloY > 0 and objA.bottom > objB.top and objA.top < objB.bottom):
                diffTime_y = abs(objA.bottom - objB.top) * reciRelVeloY
                collision_y = Collision.COLL_BOTTOM
            elif (relVeloY < 0 and objA.top < objB.bottom and objA.bottom > objB.top):
                diffTime_y = abs(objB.bottom - objA.top) * reciRelVeloY
                collision_y = Collision.COLL_TOP
        if not math.isinf(diffTime_x) and not math.isinf(diffTime_y):
            return (collision_x, diffTime_x) if diffTime_x < diffTime_y else (collision_y, diffTime_y)
        return (Collision.COLL_NONE, float('Infinity'))

@dataclasses.dataclass(slots=True)
class GameObjDataClass:
    x: float = dataclasses.field(init=False)
    y: float = dataclasses.field(init=False)
    w: float = dataclasses.field(init=False)
    h: float = dataclasses.field(init=False)
    left: float = dataclasses.field(init=False)
    right: float = dataclasses.field(init=False)
    top: float = dataclasses.field(init=False)
    bottom: float = dataclasses.field(init=False)
    speed_x: float = dataclasses.field(init=False)
    speed_y: float = dataclasses.field(init=False)
    bound_top: float = dataclasses.field(init=False)
    bound_bottom: float = dataclasses.field(init=False)
    bound_left: float = dataclasses.field(init=False)
    bound_right: float = dataclasses.field(init=False)
    scaleX: dataclasses.InitVar[int]
    scaleY: dataclasses.InitVar[int]
    xU: dataclasses.InitVar[int]
    yU: dataclasses.InitVar[int]
    wU: dataclasses.InitVar[int]
    hU: dataclasses.InitVar[int]
    dx: float = float(0)
    dy: float = float(0)
    speedU: dataclasses.InitVar[int] = 0
    boundObj: dataclasses.InitVar["GameObjDataClass | None"] = None

    def __post_init__(self,
                      scaleX: int, scaleY: int,
                      xU: int, yU: int,
                      wU: int, hU: int,
                      speedU: int = 0,
                      boundObj: "GameObjDataClass | None" = None):

        self.x = float(xU) / float(scaleX)
        self.y = float(yU) / float(scaleY)
        self.w = float(wU) / float(scaleX)
        self.h = float(hU) / float(scaleY)
        self.speed_x = float(speedU) / float(scaleX)
        self.speed_y = float(speedU) / float(scaleY)

        self.left = self.x
        self.right = self.x + self.w
        self.top = self.y
        self.bottom = self.y + self.h

        self.bound_top = boundObj.y if boundObj else float(0)
        self.bound_bottom = boundObj.y + \
            boundObj.h if boundObj else float(1)
        self.bound_left = boundObj.x if boundObj else float(0)
        self.bound_right = boundObj.x + \
            boundObj.w if boundObj else float(1)

    def __setattr__(self, key, value):
        if key == "x" and hasattr(self, "w"):
            self.left = value
            self.right = value + self.w
        elif key == "y" and hasattr(self, "h"):
            self.top = value
            self.bottom = value + self.h
        super(GameObjDataClass, self).__setattr__(key, value)

    def getDataAsDict(self) -> GameObjData:
        return {
            "bound_bottom": self.bound_bottom,
            "bound_left": self.bound_left,
            "bound_right": self.bound_right,
            "bound_top": self.bound_top,
            "h": self.h,
            "speed_x": self.speed_x,
            "speed_y": self.speed_y,
            "w": self.w,
            "x": self.x,
            "y": self.y,
            "dx": self.dx,
            "dy": self.dy,
        }

    def getPositionalDataAsDict(self) -> GameObjPositionData:
        return {
            "x": self.x,
            "y": self.y,
            "dx": self.dx,
            "dy": self.dy
        }

    def getPositionalDataclass(self) -> GameObjPositionDataclass:
        return GameObjPositionDataclass(self.x, self.y, self.dx, self.dy)
        
    def setPositionalDataFromDataclass(self, data: GameObjPositionDataclass):
        # if self.x < 0.02:
        # print(f"setPositionalDataFromDataclass: old data: x: {self.x}, dx: {self.dx}, y: {self.y}, dy: {self.dy}")
        self.x = data.x
        self.y = data.y
        self.dx = data.dx
        self.dy = data.dy
        # if self.x < 0.02:
        # print(f"setPositionalDataFromDataclass: new data: x: {self.x}, dx: {self.dx}, y: {self.y}, dy: {self.dy}")

    def setPositionalData(self, data: GameObjPositionData):
        # print(f"old data: x: {self.x}, dx: {self.dx}, y: {self.y}, dy: {self.dy}")
        self.x = data["x"]
        self.y = data["y"]
        self.dx = data["dx"]
        self.dy = data["dy"]
        # print(f"old data: x: {self.x}, dx: {self.dx}, y: {self.y}, dy: {self.dy}")

    def getPositionalDataAsBinary(self) -> bytes:
        return struct.pack('!ffff', self.x, self.y, self.dx, self.dy)

    def check_collision(self, obj: "GameObjDataClass") -> tuple[Collision, float]:
        return Collision.collision_detection(self, obj)

