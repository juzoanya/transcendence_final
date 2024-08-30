from typing import TypedDict, Literal
from user.types import BasicUserData

class ChatRoomData(TypedDict):
    room_id: int
    type: Literal['tournament', 'private', 'UNKNOWN']
    title: str
    users: list[BasicUserData]
    unread_count: int | None

class ChatMessageData(TypedDict):
    user_id: int
    username: str
    message: str
    avatar: str
    timestamp: int

