from django.urls import re_path, path
from . import views

urlpatterns = [
    path('rooms', views.ChatRoomView.as_view(), name='rooms-list-get'),
    path('messages', views.ChatMessageView.as_view(), name='messages-list-get'),
]