from user.models import UserAccount, Player
from user.serializers import model_object_serializer, serializer_player_details, serializer_basic_user_data
from user.types import BasicUserData, PlayerData
from django.db import models
from django.db.models.query import QuerySet
from .models import Tournament, TournamentPlayer, GameRequest, GameSchedule, GameResults, query_players_with_status
from typing import TypedDict, Literal
from user.utils import calculate_user_xp


class GameRequestData(PlayerData):
    invite_id: int
    game_id: str
    game_mode: str
    tournament: int | None
    tournament_name: str | None
    status: str

def serializer_inviter_invitee_details(invite:GameRequest, account:UserAccount, player: Player, inviter: bool) -> GameRequestData:
    return {
        **serializer_player_details(player, None),
        'invite_id': invite.pk,
        'game_id': invite.get_game_id_display(), # type: ignore
        'game_mode': invite.game_mode if invite.game_mode else 'unknown mode',
        'tournament': invite.tournament.pk if invite.tournament else None,
        'tournament_name': invite.tournament.name if invite.tournament else None,
        'status': invite.status,
    }


class GameResultData(TypedDict):
    time_started: str
    time_finished: str
    player_one_score: int
    player_two_score: int
    winner_id: str
    loser_id: str
    winner: str
    loser: str
    winner_xp: int
    loser_xp: int

class GameScheduleData(TypedDict):
    schedule_id: int
    game_id: str
    game_mode: str
    tournament: int | None
    round: int | None
    player_one: PlayerData
    player_two: PlayerData
    result: GameResultData | None


def serializer_game_schedule(game_schedule: GameSchedule, result: GameResultData | None) ->GameScheduleData:
    return {
            'schedule_id': game_schedule.pk,
            'game_id': game_schedule.get_game_id_display(), # type: ignore
            'game_mode': game_schedule.game_mode if game_schedule.game_mode else 'unknown mode',
            'tournament': game_schedule.tournament.pk if game_schedule.tournament else None,
            'round': game_schedule.round if game_schedule.tournament else None,
            'player_one': serializer_player_details(game_schedule.player_one, None),
            'player_two': serializer_player_details(game_schedule.player_two, None),
            'result': result
        }

def serializer_game_result(game_result: GameResults) -> GameScheduleData:
    if game_result.game_schedule.player_one.user == game_result.winner:
        winner_player, loser_player = game_result.game_schedule.player_one, game_result.game_schedule.player_two
    else:
        winner_player, loser_player = game_result.game_schedule.player_two, game_result.game_schedule.player_one
    margin = abs(game_result.player_one_score - game_result.player_two_score)
    result: GameResultData = {
        'player_one_score': game_result.player_one_score,
        'player_two_score': game_result.player_two_score,
        'time_started': str(game_result.game_schedule.timestamp),
        'time_finished': str(game_result.timestamp),
        'winner_id': winner_player.user.pk,
        'winner': winner_player.alias,
        'winner_xp': calculate_user_xp(margin=margin, winner=True),
        'loser_id': loser_player.user.pk,
        'loser': loser_player.alias,
        'loser_xp': calculate_user_xp(margin=margin, winner=False),
    }
    return serializer_game_schedule(game_result.game_schedule, result)


def serializer_tournament_player_details(player: TournamentPlayer, status: str | None) -> PlayerData:
    return {
        **serializer_basic_user_data(player.player.user),
        'alias': str(player.player.alias),
        'xp': int(player.xp),
        'status': status,
    }
   

def tournament_details(tournament):
    details = model_object_serializer(tournament)
    details['game_id'] = tournament.get_game_id_display()
    details['creator'] = tournament.creator.pk
    
    
    
   
    players_with_status = query_players_with_status(tournament=tournament)
    details['players'] = [serializer_player_details(player, getattr(player, 'game_request_status', 'UNKNOWN')) for player in players_with_status]
    t_players = TournamentPlayer.players.get_tournament_players_sorted_by_xp(tournament)
    details['leaderboard'] = [serializer_tournament_player_details(t_player, None) for t_player in t_players]
    schedules = GameSchedule.objects.filter(tournament=tournament, is_active=True)
    # results = GameResults.objects.filter(game_schedule__tournament_pk=tournament.pk)
    results = GameResults.objects.filter(game_schedule__tournament=tournament)
    # results = GameResults.objects.select_related('')
    serialized_schedules = [serializer_game_schedule(schedule, None) for schedule in schedules]
    serialized_results = [serializer_game_result(result) for result in results]
    details['schedules'] = serialized_schedules + serialized_results
    details['results'] = serialized_results
    # details['results'] = [serializer_game_result(res) for res in games_played]
    return details



# def serializer_inviter_invitee_details(invite:GameRequest, account:UserAccount, player: Player, inviter: bool):
#     data = {
#         'invite_id': invite.pk,
#         'game_id': invite.get_game_id_display(), # type: ignore
#         'game_mode': invite.game_mode,
#         'tournament': invite.tournament.pk if invite.tournament else None,
#         'tournament_name': invite.tournament.name if invite.tournament else None,
#         'status': invite.status,
#         'id': account.pk,
#         'alias': player.alias,
#         'avatar': account.avatar.url,
#         'online_status': account.status
#     }
#     if inviter:
#         data['inviter'] = account.username
#     else:
#         data['invitee'] = account.username
#     return data


    # details['leaderboard'] = tournament_leaderboard(tournament)

# def tournament_leaderboard(tournament: Tournament):
#     leaderboard = []
    
#     # players = tournament.players.prefetch_related('user').all().order_by('-xp')  # Holt alle Spieler des Turniers

#     # players = players
#     # return players
    
#     ordered_player = (
#         TournamentPlayer.objects.filter(tournament=tournament)
#         .select_related('player')
#         .order_by('-xp')
#         .annotate(game_request_status=models.Subquery(
#             GameRequest.objects.filter(
#                 invitee_id=models.OuterRef('player__user_id'),
#                 tournament=tournament,
#                 is_active=True
#             ).values('status')[:1]
#         ))
#     )
#     print(f"SUBQUERY SQP: ", str(ordered_player.query))
#     print(f"SUBQUERY: ", ordered_player)
#     if ordered_player:
#         for tournament_player in ordered_player:
#             item = tournament_player.player.get_player_data(getattr(tournament_player, 'game_request_status', 'UNKNOWN'))
#             item['xp'] = tournament_player.xp
#             leaderboard.append(item)
#             print(f'--> {tournament_player}')
#     else:
#         print(f'Value: error')    
#     # ordered_player = (TournamentPlayer.objects.filter(tournament=tournament)
#     #                .select_related('player')
#     #                .order_by('-xp')
#     #                )
#     # if ordered_player:
#     #     for player in ordered_player:
#     #         print(f'--> {player}')
#     # else:
#     #     print(f'Value: error')    
#     return leaderboard


# def tournament_details(tournament):
#     players = []
#     fixtures = []
#     details = model_object_serializer(tournament)
#     details['game_id'] = tournament.get_game_id_display()
#     details['creator'] = Player.objects.get(user=tournament.creator).alias
#     # details['creator'] = tournament.creator.pk
#     # tournament_players: QuerySet[Player] = tournament.players.all()
#     # players_with_status: TournamentPlayer.players.get_tournament_players_with_request_status()
    
#     for player in players_with_status:
#         print(f"PLAYER: {player}")
#         item = player.get_player_data(getattr(player, 'game_request_status', 'UNKNOWN'))
#         # item = {
#         #     'id': player.user.pk,
#         #     'username': player.user.username,
#         #     'avatar': player.user.avatar.url,
#         #     'status': getattr(player, 'game_request_status', 'UNKNOWN'),
#         #     'alias': player.alias
#         # }
#         players.append(item)
#     # for player in tournament_players:
#     #     player_details = UserAccount.objects.get(username=player)
#     #     item = {
#     #         'id': player_details.pk,
#     #         'username': player_details.username,
#     #         'avatar': player_details.avatar.url,
#     #         'alias': player.alias
#     #     }
#     #     players.append(item)
#     details['players'] = players
#     # schedules = GameSchedule.objects.filter(tournament=tournament, is_active=True)
#     schedules = GameSchedule.objects.filter(tournament=tournament)
#     for schedule in schedules:
#         ply_1 = UserAccount.objects.get(username=schedule.player_one)
#         ply_2 = UserAccount.objects.get(username=schedule.player_two)
#         item = {
            
#             'id': schedule.pk,
#             'game_id': schedule.get_game_id_display(), # type: ignore
#             'tournament': schedule.tournament.pk if schedule.tournament else None,
#             'round': schedule.round,
#             'player_one': {
#                 'id': ply_1.pk,
#                 'username': ply_1.username,
#                 'avatar': ply_1.avatar.url,
#                 'alias': schedule.player_one.alias
#             },
#             'player_two': {
#                 'id': ply_2.pk,
#                 'username': ply_2.username,
#                 'avatar': ply_2.avatar.url,
#                 'alias': schedule.player_two.alias
#             }
#         }
#         fixtures.append(item)
#     details['schedules'] = fixtures
#     results = []
#     games_played = GameResults.objects.filter(tournament=tournament)
#     for game in games_played:
#         ply_one_user_acc = UserAccount.objects.get(username=game.game_schedule.player_one)
#         ply_two_user_acc = UserAccount.objects.get(username=game.game_schedule.player_two)
#         item = {
# 			'match_id': game.pk,
# 			'game_id': game.game_id,
# 			'game_mode': game.game_mode,
# 			'tournament': game.tournament.pk if game.tournament else None,
# 			'player_one': {
# 				'id': ply_one_user_acc.pk,
# 				'username': ply_one_user_acc.username,
# 				'avatar': ply_one_user_acc.avatar.url,
# 				'alias': Player.objects.get(user=ply_one_user_acc).alias,
# 			},
# 			'player_two': {
# 				'id': ply_two_user_acc.pk,
# 				'username': ply_two_user_acc.username,
# 				'avatar': ply_two_user_acc.avatar.url,
# 				'alias': Player.objects.get(user=ply_two_user_acc).alias
# 			},
# 			'player_one_score': game.player_one_score,
# 			'player_two_score': game.player_two_score,
# 			'date': game.timestamp,
# 			'winner': Player.objects.get(user=game.winner).alias
#         }
#         results.append(item)
#     details['results'] = results
#     leaderboard = tournament_leaderboard(tournament)
#     details['leaderboard'] = leaderboard
#     return details
