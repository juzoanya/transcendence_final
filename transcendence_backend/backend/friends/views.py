import json
from django.shortcuts import render
from .models import *
from user.utils import *
from .utils import get_user_friend_list, get_my_block_list, get_friend_request_item
from user.models import UserAccount
from django.contrib.auth.decorators import login_required
from django.views.decorators.http import require_GET, require_POST
from datetime import datetime, timedelta
from django.http import JsonResponse, Http404
from django.core.serializers.json import DjangoJSONEncoder

from typing import TypedDict, Literal, Union
from django.db.models.query import QuerySet
from django.core.exceptions import PermissionDenied
from django.shortcuts import get_object_or_404


def get_request_or_404(friend_request_id: int) -> FriendRequest:
    try:
        friend_request = FriendRequest.objects.get(pk=friend_request_id)
        if not friend_request.is_active:
            raise Http404("No Friendrequest found")
    except FriendRequest.DoesNotExist:
        raise Http404("No Friendrequest found")
    return friend_request

@login_required
@require_POST
def accept_friend_request(request, friend_request_id: int):
    # try:
    #     friend_request = get_request_or_404(friend_request_id)
    # except Http404:
    #     return HttpNotFound404("This request does not exist")
    friend_request = get_request_or_404(friend_request_id)
    if friend_request.receiver != request.user:
        return HttpForbidden403("You cannot access this feature")
    friend_request.accept()
    return HttpSuccess200("Friend request accepted.")

@login_required
@require_POST
def reject_friend_request(request, friend_request_id: int):
    friend_request = get_request_or_404(friend_request_id)
    if friend_request.receiver != request.user:
        return HttpForbidden403("You cannot access this feature")
    friend_request.reject()
    return HttpSuccess200("Friend request rejected.")


@login_required
@require_POST
def cancel_friend_request(request, friend_request_id: int):
    friend_request = get_request_or_404(friend_request_id)
    if friend_request.sender != request.user:
        return HttpForbidden403("You cannot access this feature")
    friend_request.cancel()
    return HttpSuccess200("Friend request rejected.")


@login_required
@require_GET
def friend_list_view(request, user_id: int):
    friend_list = get_user_friend_list(request.user, get_object_or_404(UserAccount, pk=user_id))[1]
    return HttpSuccess200(f"list of friends", friend_list)


@login_required
@require_GET
def block_list_view(request):
    block_list = get_my_block_list(request.user)
    return HttpSuccess200(f"list of blocked users", block_list)


@login_required
@require_GET
def friend_requests_received(request, user_id: int):
    account = get_object_or_404(UserAccount, pk=user_id)
    request_list = FriendRequest.objects.filter(receiver=account, is_active=True)
    data = [get_friend_request_item(req.pk, req.sender) for req in request_list]
    return HttpSuccess200(f"list of received friend requests", data)


@login_required
@require_GET
def friend_requests_sent(request, user_id: int):
    account = get_object_or_404(UserAccount, pk=user_id)
    request_list = FriendRequest.objects.filter(sender=account, is_active=True)
    data = [get_friend_request_item(req.pk, req.receiver) for req in request_list]
    return HttpSuccess200(f"list of friend requests sent", data)

			

@login_required
@require_POST
def unblock_user(request, user_id: int):
    receiver = get_object_or_404(UserAccount, pk=user_id)
    block_list = get_object_or_404(BlockList, user=request.user)
    block_list.unblock_user(receiver)
    return HttpSuccess200(f"user {receiver.username} unblocked")

@login_required
@require_POST
def block_user(request, user_id: int):
    receiver = get_object_or_404(UserAccount, pk=user_id)
    block_list = get_object_or_404(BlockList, user=request.user)
    block_list.block_user(receiver)
    return HttpSuccess200(f"user {receiver.username} blocked")

@login_required
@require_POST
def remove_friend(request):
    receiver = get_object_or_404(UserAccount, pk=json.loads(request.body).get('receiver_id'))
    friend_list = get_object_or_404(FriendList, user=request.user)
    friend_list.unfriend(receiver)
    return HttpSuccess200(f"friend {receiver.username} removed")

@login_required
@require_POST
def send_friend_request(request):
    receiver: UserAccount = UserAccount.objects.get(pk=json.loads(request.body).get('receiver_id'))
    if FriendRequest.objects.filter(sender=request.user, receiver=receiver, is_active=True).exists():
        return HttpConflict409("You have an active friend request.")
    friend_request = FriendRequest.objects.create(sender=request.user, receiver=receiver)
    friend_request.save()
    return HttpSuccess200(f"friend request sent")

