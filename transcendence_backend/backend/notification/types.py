from typing import TypedDict, Literal
from user.types import BasicUserData

class NotificationData(TypedDict):
    notification_type: str
    notification_id: int
    description: str
    action_id: int
    is_active: bool
    is_read: bool
    natural_timestamp: str
    timestamp: int
    redirect_url: str | None
    user: BasicUserData | None
