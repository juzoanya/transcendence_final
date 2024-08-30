from .models import UserAccount, Player
from .types import PlayerData, BasicUserData
from django.db import models

def model_object_serializer(object: models.Model):
    data = {}
    for field in object._meta.fields:
        field_value = getattr(object, field.name)
        if hasattr(field_value, 'serialize'):
            field_value = field_value.serialize()
        elif hasattr(field_value, 'pk'):
            field_value = field_value.pk
        data[field.name] = field_value
    return data

def serializer_minimal_account_details(account: UserAccount):
    data = {
        'id': account.pk,
        'username': account.username,
        'email': account.email,
        'first_name': account.first_name,
        'last_name': account.last_name,
        'avatar': account.avatar.url,
        'online_status': account.status
    }
    return data

def serializer_full_profile_details(account: UserAccount, player: Player):
    data = {
        'id': account.pk,
        'username': account.username,
        'email': account.email,
        'first_name': account.first_name,
        'last_name': account.last_name,
        'bio': account.bio,
        'avatar': account.avatar.url,
        'last_login': account.last_login,
        'date_joined': account.date_joined,
        'alias': player.alias,
        'games_played': player.games_played,
        'wins': player.wins,
        'losses': player.losses,
        'online_status': account.status,
        'xp': player.xp,
        'oauth': account.oauth
    }
    return data

def serializer_basic_user_data(user: UserAccount) -> BasicUserData:
    return {
        'id': int(user.pk),
        'username': str(user.username),
        'avatar': str(user.avatar.url),
        'online_status': str(user.status) # type: ignore
    }

def serializer_player_details(player: Player, status: str | None) -> PlayerData:
    return {
        **serializer_basic_user_data(player.user),
        'alias': str(player.alias),
        'xp': int(player.xp),
        'status': status,
    }
