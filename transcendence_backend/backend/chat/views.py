import json
from django.shortcuts import render
from django.http import JsonResponse
from django.conf import settings
from user.utils import *
from .models import *
from friends.models import FriendList
from django.views.decorators.http import require_GET, require_POST, require_safe
from django.contrib.auth.decorators import login_required
from django.views import View
from django.http.request import HttpRequest
from django.core.paginator import Paginator


class ChatRoomView(View):
    def get(self, request):
        user = request.user
        rooms = ChatRoom.rooms.filter(users__id=user.pk, is_active=True)
        return HttpSuccess200(data=[serializer_chat_room_data(room, user) for room in rooms])


class ChatMessageView(View):
    def get(self, request: HttpRequest):
        room_id = request.GET.get('room_id')
        pageno = request.GET.get('page')
        if not isinstance(room_id, str) or not room_id.isdigit() or not isinstance(pageno, str) or not pageno.isdigit():
            return HttpBadRequest400("invalid room_id or page")
        room_id = int(room_id)
        pageno = int(pageno)
        messages = ChatMessage.messages.by_room(room_id)
        paginator = Paginator(messages, 20)
        messagepage = paginator.get_page(pageno)
        m = [serializer_chat_message_data(msg) for msg in messagepage if isinstance(msg, ChatMessage)]
        
        return HttpSuccess200(data={
            'room_id': room_id,
            'messages': m,
            'next_page': pageno + 1
        })
        
