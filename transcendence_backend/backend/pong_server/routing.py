
# chat/routing.py
from django.urls import re_path
from .consumer_player import PlayerConsumer

websocket_urlpatterns = [
    re_path(r"ws/game/(?P<schedule_id>\w+)/$", PlayerConsumer.as_asgi()),
]
