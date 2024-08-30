# from channels.auth import AuthMiddlewareStack
# from channels.routing import ProtocolTypeRouter, URLRouter
# from channels.security.websocket import AllowedHostsOriginValidator
# from django.urls import path
# from public_chat.consumers import *
# from django.core.asgi import get_asgi_application

# django_asgi_app = get_asgi_application()

# application = ProtocolTypeRouter({
#     'http': django_asgi_app,
#     'websocket': AllowedHostsOriginValidator(
#         AuthMiddlewareStack(
#             URLRouter([
#                 path('public_chat/<room_id>', PublicChatConsumer.as_asgi())
#             ])
#         )
#     )
# })