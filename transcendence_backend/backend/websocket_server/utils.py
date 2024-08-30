from channels.layers import get_channel_layer
from channels_redis.core import RedisChannelLayer
from asgiref.sync import async_to_sync
from .constants import InternalCommand


async def async_send_consumer_internal_command(group_room_name: str, msg: InternalCommand):
    layer = get_channel_layer()
    if isinstance(layer, RedisChannelLayer):
        await layer.group_send( group_room_name, msg )
    else:
        print(f"invalid channel layer -> need redis")

def sync_send_consumer_internal_command(group_room_name: str, msg: InternalCommand):
    layer = get_channel_layer()
    if isinstance(layer, RedisChannelLayer):
        async_to_sync(layer.group_send)( group_room_name, msg )
    else:
        print(f"invalid channel layer -> need redis")


async def async_send_consumer_internal_command_list(data: list[tuple[str, InternalCommand]]):
    layer = get_channel_layer()
    if isinstance(layer, RedisChannelLayer):
        for d in data:
            await layer.group_send(d[0], d[1] )
    else:
        print(f"invalid channel layer -> need redis")


def sync_send_consumer_internal_command_list(data: list[tuple[str, InternalCommand]]):
    async_to_sync(async_send_consumer_internal_command_list)(data)
