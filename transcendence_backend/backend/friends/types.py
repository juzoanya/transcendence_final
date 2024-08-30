from typing import TypedDict
from datetime import datetime

class FriendRequestUserdata(TypedDict):
    id: int
    username: str
    avatar: str

class FriendRequestData(TypedDict):
    request_id: int
    updated_at: datetime
    sender: FriendRequestUserdata
    receiver: FriendRequestUserdata

class FriendRequestActionData(TypedDict):
    request_id: int
    id: int
    username: str
    avatar: str
