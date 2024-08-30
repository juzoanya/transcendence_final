from typing import TypedDict
from user.models import UserAccount, BasicUserData
from datetime import datetime
from .models import BlockList, FriendList
from django.db.models.query import QuerySet


class UserFriendRequestData(BasicUserData):
	request_id: int


def get_friend_request_item(id: int, user: UserAccount) -> UserFriendRequestData:
	return {
		'request_id': id,
		'id': user.pk,
		'username': user.username,
		'avatar': user.avatar.url,
		'online_status': user.status # type: ignore
	}


class UserInfoData(BasicUserData):
	email: str
	first_name: str
	last_name: str
	last_login: datetime
	date_joined: datetime
	is_mutual_friend: bool


def get_other_user_data(user_in_list: UserAccount, is_friend_of_logged_in_user: bool) -> UserInfoData:
	return {
        'id': user_in_list.pk,
        'username': user_in_list.username,
        'email': user_in_list.email,
        'first_name': user_in_list.first_name,
        'last_name': user_in_list.last_name,
        'avatar': user_in_list.avatar.url,
        'last_login': user_in_list.last_login,
        'date_joined': user_in_list.date_joined,
        'is_mutual_friend': is_friend_of_logged_in_user,
        'online_status': user_in_list.status # type: ignore
    }


def get_my_block_list(user: UserAccount) -> list[UserInfoData]:
	if not isinstance(user, UserAccount):
		raise RuntimeError("get_my_block_list: User invalid")
	block_list = BlockList.objects.get(user=user)
	return [get_other_user_data(account, False) for account in block_list.blocked.all()]


def get_user_list(logged_in_user: UserAccount, userQuery: QuerySet[UserAccount]) -> list[UserInfoData]:
    logged_in_user_friend_list = FriendList.objects.get(user=logged_in_user)
    data = []
    for user in userQuery:
        if not BlockList.is_either_blocked(logged_in_user, user):
            user_data = get_other_user_data(user, logged_in_user_friend_list.is_mutual_friend(user))
            data.append(user_data)
    return data


def get_user_friend_list(logged_in_user: UserAccount, user_to_check :UserAccount) -> tuple[bool, list[UserInfoData]]:
    friend_list = FriendList.objects.get(user=user_to_check)
    if logged_in_user == user_to_check:
        return False, get_user_list(logged_in_user, friend_list.friends.all())
    if not friend_list.friends.contains(logged_in_user):
        return False, []
    return True, get_user_list(logged_in_user, friend_list.friends.all())

