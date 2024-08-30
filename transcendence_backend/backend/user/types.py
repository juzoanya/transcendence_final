from typing import TypedDict, Literal

class BasicUserData(TypedDict):
    id: int
    username: str
    avatar: str
    online_status: Literal['online', 'offline']


class PlayerData(BasicUserData):
    alias: str
    xp: int
    status: str | None
