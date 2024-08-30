from .models import *
# from django.contrib.auth import get_user_model
# from django.http import JsonResponse
# from user.models import Player, UserAccount
# from django.db.models.query import QuerySet

def send_invite(user, invitee, game_id, game_mode, tournament):
    if invitee != user:
        try:
            request = GameRequest.objects.create(
                user=user, 
                invitee=invitee, 
                game_id=game_id, 
                game_mode=game_mode,
                tournament=tournament
            )
            request.save()
            return 'invitation was sent'
        except Exception as e:
            return str(e)



def tournament_player_creator(user, tournament):
    try:
        tournament_player = TournamentPlayer.objects.create(
            player=Player.objects.get(user=user),
            tournament=tournament,
            round=1
            )
        tournament_player.save()
    except Exception as e:
        tournament.delete()
        return JsonResponse({'success': False, 'message': str(e)}, status=500)


# def parse_results(schedule_id, score_one, score_two): #TODO send user xp gained ot lost + winner to consumer
#     try:
#         schedule = GameSchedule.objects.get(id=schedule_id, is_active=True)
#     except Exception as e:
#         return {'success': False, 'message': str(e)}, 400
#     # if game.game_schedule.player_one.user == game.game_schedule.player_two.user:
#     #     return {'success': False, 'message': 'Player fields cannot be the same.'}, 400
#     try:
#         result = GameResults.objects.create(
#             game_schedule=schedule,
#             tournament=schedule.tournament,# if hasattr(schedule, 'tournament') and schedule.tournament else None,
#             player_one_score=score_one,
#             player_two_score=score_two,
# 		)
#         result.save()
#     except Exception as e:
#         return {'success': False, 'message': str(e)}, 400
#     schedule.is_active = False
#     schedule.save()
#     if result.winner and result.loser:
#         xp_calculation(result, score_one, score_two)
#     else:
#         return {'success': False, 'message': 'Internal server error'}, 500
#     if schedule.game_mode == 'tournament' and result.tournament:
#         if check_final_game(result):
#             set_winner(result)
#             result.tournament.update(False, True)
#         else:
#             tournament_player_update(result)
#             if tournament_round_finished(result.tournament):
#                 result.tournament.update(False, False)
#     update_leaderboard()
#     return {'success': True, 'message': 'record created'}, 200


# def set_winner(result):
#     if result.tournament.mode != 'round robin':
#         result.tournament.winner = result.winner
#     else:
#         players = TournamentPlayer.objects.filter(tournament=result.tournament)
#         winner = players.order_by('-xp').first()
#         if winner:
#             result.tournament.winner = winner.player.user

# def check_final_game(result):
#     if result.tournament.mode == 'round robin':
#         try:
#             schedules = GameSchedule.objects.filter(tournament=result.tournament, is_active=True)
#         except GameSchedule.DoesNotExist:
#             return True
#         if len(schedules) == 0:
#             return True
#     else:
#         if result.tournament.stage == 'final':
#             return True


# def tournament_round_finished(tournament):
#     try:
#         schedules = GameSchedule.objects.filter(tournament=tournament, is_active=True)
#     except Exception as e:
#         return JsonResponse({'success': False}, status=500)
#     if len(schedules) == 0:
#         return True
#     return False



# def tournament_player_update(result):
#     winner_player = TournamentPlayer.objects.get(
#         player=Player.objects.get(user=result.winner),
#         tournament=result.tournament
#         )
#     if result.tournament.mode != 'group and knockout' and result.tournament.mode != 'round robin':
#         winner_player.round += 1
#         winner_player.save()
#     # loser_player = TournamentPlayer.objects.get(
#     #     player=Player.obeject.get(user=result.loser),
#     #     tournament=result.tournament
#     #     )



# def xp_calculation(result, score_one, score_two):
#     try:
#         winner_player = Player.objects.get(user=result.winner)
#         winner_player.games_played = winner_player.games_played + 1
#         winner_player.wins = winner_player.wins + 1
#         winner_player.win_loss_margin.append(max(score_one, score_two) - min(score_one, score_two))
#         winner_xp = calculate_user_xp(max(score_one, score_two) - min(score_one, score_two), True)
#         if result.tournament != None and result.game_mode == 'tournament':
#             t_player = TournamentPlayer.objects.get(player=winner_player, tournament=result.tournament)
#             t_player.xp += winner_xp
#             t_player.save()
#         else:
#             winner_player.xp += winner_xp
#         winner_player.save()
#     except Exception as e:
#         return JsonResponse({'success': False, 'message': str(e)}, status=400)
#     try:
#         loser_player = Player.objects.get(user=result.loser)
#         loser_player.games_played = loser_player.games_played + 1
#         loser_player.losses = loser_player.losses + 1
#         loser_player.win_loss_margin.append(min(score_one, score_two) - max(score_one, score_two))
#         loser_xp = calculate_user_xp(max(score_one, score_two) - min(score_one, score_two), False)
#         if result.tournament != None and result.game_mode == 'tournament':
#             t_player = TournamentPlayer.objects.get(player=loser_player, tournament=result.tournament)
#             t_player.xp += loser_xp
#             t_player.save()
#         else:
#             loser_player.xp += loser_xp
#         loser_player.save()
#     except Exception as e:
#         return JsonResponse({'success': False, 'message': str(e)}, status=400)
    
# def update_tournament(tournament):
#     try:
#         schedules = GameSchedule.objects.filter(tournament=tournament, is_active=True)
#     except Exception as e:
#         return JsonResponse({'success': False, 'message': 'Game Schedule: '+str(e)}, status=400)
#     if len(schedules) == 0:
#         tournament.matchmaking()
#         tournament.update()

# def update_leaderboard():
#     Leaderboard.objects.all().delete()
#     players = Player.objects.all().order_by('-xp')
#     for rank, player in enumerate(players, start=1):
#         Leaderboard.objects.create(player=player, rank=rank)


    