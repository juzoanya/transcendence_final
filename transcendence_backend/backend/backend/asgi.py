import os
from django.core.asgi import get_asgi_application
from channels.auth import AuthMiddlewareStack
from channels.routing import ProtocolTypeRouter, URLRouter, ChannelNameRouter
from channels.security.websocket import AllowedHostsOriginValidator

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')

django_asgi_app = get_asgi_application()

# from chat import routing as ch_routing
from pong_server.consumer_player import PlayerConsumer
# from notification.consumers import NotificationConsumer, TestConnectionConsumer
from websocket_server.consumers import NotificationConsumer, TestConnectionConsumer
# from pong_server.game_engine.consumer_game import GameConsumer
from pong_server.game_engine.consumer_game import GameConsumer
# from pong_server.game_engine_new.consumer_game import GameConsumer
from django.urls import re_path

application = ProtocolTypeRouter({
    'http': django_asgi_app,
    'websocket': AllowedHostsOriginValidator(
        AuthMiddlewareStack(
            URLRouter([
                re_path(r"ws/game/(?P<schedule_id>\w+)/$", PlayerConsumer.as_asgi()),
                re_path(r'ws/$', NotificationConsumer.as_asgi()),
            ])
        )
    ),
    'channel': ChannelNameRouter({
        'game_engine': GameConsumer.as_asgi(),
    })
})

# from chat import routing as ch_routing
# from pong_server import routing as ps_routing
# from notification import routing as nf_routing
# from pong_server.pong_new.consumer_game import GameConsumer

# application = ProtocolTypeRouter({
#     'http': django_asgi_app,
#     'websocket': AllowedHostsOriginValidator(
#         AuthMiddlewareStack(
#             URLRouter(ch_routing.websocket_urlpatterns + ps_routing.websocket_urlpatterns + nf_routing.websocket_urlpatterns)
#         )
#     ),
#     'channel': ChannelNameRouter({
#         'game_engine': GameConsumer.as_asgi(),
#     })
# })
