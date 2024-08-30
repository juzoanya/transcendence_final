import io
import json
import base64
import numpy as np
import pandas as pd
from matplotlib import pyplot as plt
from django.db.models import Q
from django.conf import settings
from django.shortcuts import render, redirect
from user.models import *
from friends.models import *
from .models import *
from .utils import *
from .serializers import *
from django.contrib.auth.decorators import login_required
from django.shortcuts import get_object_or_404
from datetime import datetime, timedelta
from django.http import HttpResponse, JsonResponse
from django.core.serializers.json import DjangoJSONEncoder
from django.views.decorators.http import require_GET, require_POST, require_safe, require_http_methods
from django.http.request import HttpRequest
from django.contrib.auth.models import AnonymousUser
from django.contrib.humanize.templatetags.humanize import naturaltime
from user.serializers import *
from django.core.paginator import Paginator

# Create your views here.

@login_required
@require_POST
def game_results(request, *args, **kwargs):
    user = request.user
    data = json.loads(request.body)
    schedule_id = data.get('schedule_id')
    score_one = data.get('score_one')
    score_two = data.get('score_two')
    
    schedule = GameSchedule.objects.filter(pk=schedule_id, is_active=True).first()
    if schedule is None:
        return HttpNotFound404('Match not found')

    if isinstance(score_one, int) and isinstance(score_two, int):
        result = schedule.finish_game_and_update(score_one, score_two)
        return HttpSuccess200('', serializer_game_result(result))
    return HttpBadRequest400('invalid scores')



@require_POST
@login_required
def send_game_invite(request, *args, **kwargs):
    user = request.user
    user_id = kwargs.get('user_id')
    try:
        data = json.loads(request.body)	
        game_id = data.get('game_id')
        game_mode = data.get('game_mode')
        tournament = data.get('tournament')
    except Exception as e:
        HttpBadRequest400('invalid input')
    try:
        invitee = UserAccount.objects.get(pk=user_id)
    except Exception as e:
        return JsonResponse({'success': False, 'message': str(e)}, status=400)
    check_request = GameRequest.objects.filter(user=user, invitee=invitee, is_active=True, game_mode="1vs1")
    if check_request:
        return JsonResponse({'success': False, 'message': 'Duplicate invite not permitted'}, status=400)
    if BlockList.is_either_blocked(user, invitee) == False:
        response = send_invite(user, invitee, game_id, game_mode, tournament)
        return JsonResponse({'success': True, 'message': response}, status=200)
    else:
        return JsonResponse({'success': False, 'message': 'Blocklist: cannot invite user'}, status=400)


@require_GET
@login_required
def received_invites(request, *args, **kwargs):
    user = request.user
    invites_recieved = []
    try:
        invites = GameRequest.objects.filter(invitee=user, is_active=True)
    except Exception as e:
        return JsonResponse({'success': False, 'message': str(e)}, status=400)
    for invite in invites:
        inviter = UserAccount.objects.get(username=invite.user)
        player = Player.objects.get(user=inviter)
        item = serializer_inviter_invitee_details(invite, inviter, player, True)
        invites_recieved.append(item)
    return JsonResponse({'data': invites_recieved})
    

@require_GET
@login_required
def sent_invites(request, *args, **kwargs):
    user = request.user
    invites_sent= []
    try:
        invites = GameRequest.objects.filter(user=user, is_active=True)
    except Exception as e:
        return JsonResponse({'success': False, 'message': str(e)}, status=400)
    for invite in invites:
        invitee = UserAccount.objects.get(username=invite.invitee)
        player = Player.objects.get(user=invitee)
        item = serializer_inviter_invitee_details(invite, invitee, player, False)
        invites_sent.append(item)
    return JsonResponse({'data': invites_sent})

@require_POST
@login_required
def game_invite_accept(request, *args, **kwargs):
    user = request.user
    invite_id = kwargs.get('invite_id')
    if not invite_id:
        return HttpBadRequest400(message='Invite is invalid.')
    game_invite = GameRequest.objects.get(pk=invite_id)
    if game_invite and game_invite.is_active==True:
        if game_invite.invitee == user:
            # game_invite.accept(alias)
            game_invite.accept()
            return JsonResponse({'success': True, 'message': 'Invite accepted.'}, status=200)
        else:
            return JsonResponse({'success': False, 'message': 'You cannot access this feature'}, status=400)
    else:
        return JsonResponse({'success': False, 'message': 'This invite does not exist'}, status=400)


@require_POST
@login_required
def game_invite_reject(request, *args, **kwargs):
    user = request.user
    invite_id = kwargs.get('invite_id')
    if not invite_id:
        return HttpBadRequest400(message='Invite is invalid.')
    try:
        game_invite = GameRequest.objects.get(pk=invite_id)
    except GameRequest.DoesNotExist:
        return HttpBadRequest400(message='Invite not found.')
    except Exception as e:
        return HttpBadRequest400(message='GameRequestError' + str(e))
    if game_invite and game_invite.is_active==True:
        if game_invite.invitee == user:
            game_invite.reject()
            return JsonResponse({'success': True, 'message': 'Invite rejected.'}, status=200)
        else:
            return JsonResponse({'success': False, 'message': 'You cannot access this feature'}, status=400)
    else:
        return JsonResponse({'success': False, 'message': 'This invite does not exist'}, status=400)

@require_POST
@login_required
def game_invite_cancel(request, *args, **kwargs):
    user = request.user
    invite_id = kwargs.get('invite_id')
    if not invite_id:
        return HttpBadRequest400(message='Invite is invalid.')
    try:
        game_invite = GameRequest.objects.get(pk=invite_id)
    except GameRequest.DoesNotExist:
        return HttpBadRequest400(message='Invite not found.')
    except Exception as e:
        return HttpBadRequest400(message='GameRequestError' + str(e))
    if game_invite and game_invite.is_active==True:
        if game_invite.user == user:
            game_invite.cancel()
            return JsonResponse({'success': True, 'message': 'Invite cancelled.'}, status=200)
        else:
            return JsonResponse({'success': False, 'message': 'You cannot access this feature'}, status=400)
    else:
        return JsonResponse({'success': False, 'message': 'This invite does not exist'}, status=400)


@require_http_methods(["GET", "POST"])
@login_required
def game_schedule(request: HttpRequest, *args, **kwargs):
    
    if request.method == 'GET':
        player = get_object_or_404(Player, user=request.user)
        game_list = GameSchedule.objects.filter(Q(player_one=player) | Q(player_two=player), is_active=True)
        schedules = [serializer_game_schedule(game, None) for game in game_list]
        return HttpSuccess200("game schedules", schedules)

    try:
        data = json.loads(request.body)	
        user_id = data.get('user_id')
        game_id = data.get('game_id')
        game_mode = data.get('game_mode')
        tournament = data.get('tournament')
    except Exception as e:
        HttpBadRequest400('invalid input')
    p1 = get_object_or_404(Player, user=request.user)
    p2 = get_object_or_404(Player, user=get_object_or_404(UserAccount, pk=user_id))
    s = schedules=GameSchedule.objects.filter(( ( Q(player_one=p1) & Q(player_two=p2) ) | ( Q(player_one=p2) & Q(player_two=p1) ) ), game_mode='1vs1', is_active=True)
    if len(s) > 0:
        return HttpConflict409('you have a running 1vs1 match')
    schedule = GameSchedule.objects.create(
        player_one=p1,
        player_two=p2,
        game_id=game_id,
        game_mode='1vs1',
        tournament=None
    )
    return HttpSuccess200('match created', serializer_game_schedule(schedule, None))

@require_GET
@login_required
def match_history(request: HttpRequest, *args, **kwargs):
    history = []
    user: AbstractBaseUser | AnonymousUser = request.user
    username = request.GET.get('user')
    pageno = request.GET.get('page')
    if not isinstance(pageno, str) or not pageno.isdigit():
        return HttpBadRequest400("invalid page")
    
    if username == '':
        games_played = GameResults.objects.all().order_by('-timestamp')
    else:
        if username is not None:
            user = get_object_or_404(UserAccount, username=username)
        games_played = GameResults.objects.filter(Q(game_schedule__player_one__user=user) | Q(game_schedule__player_two__user=user)).order_by('-timestamp')
    pageno = int(pageno)
    paginator = Paginator(games_played, 3)
    games_played_page = paginator.get_page(pageno)
    for game in games_played_page:
        if game.game_schedule.player_one is None or game.game_schedule.player_two is None:
            return HttpInternalError500("game result players are none")

        item = serializer_game_result(game)
        history.append(item)
    return HttpSuccess200("game results", {
        'history': history,
        'max_pages': paginator.num_pages
    })


@require_POST
@login_required
def game_play(request, *args, **kwargs):
    user = request.user
    schedule_id = kwargs.get('schedule_id')
    if schedule_id:
        try:
            schedule = GameSchedule.objects.get(pk=schedule_id)
            schedule.is_active = False
            schedule.save()
            return JsonResponse({'success': True, 'message': 'OK'}, status=200)
        except Exception as e:
            return JsonResponse({'success': False, 'message': str(e)}, status=400)
        
    else:
        return JsonResponse({'success': False, 'message': 'Schedule not found'}, status=400)

    

@require_POST
@login_required
def create_tournament(request, *args, **kwargs):
    user = request.user
    data = json.loads(request.body)
    name = data.get('name')
    mode = data.get('mode')
    game_id = data.get('game_id')
    player_ids = data.get('players')
    
    if user.pk in player_ids:
        message = 'You cannot invite yourself to the tournament'
        return HttpForbidden403(message)
    try:
        Tournament.objects.get(name=name)
        return JsonResponse({'success': False, 'message': 'Tournament with duplicate name not allowed'}, status=400)
    except Tournament.DoesNotExist:
        try:
            tournament = Tournament.objects.create(
                name=name,
                mode=mode,
                creator=user,
                game_id=game_id
            )
            tournament.players.add(Player.objects.get(user=user))
            for id in player_ids:
                invitee = UserAccount.objects.get(pk=id)
                tournament.players.add(Player.objects.get(user=invitee))
                try:
                    GameRequest.objects.get(
                        user=user,
                        invitee=invitee,
                        game_mode='tournament',
                        tournament=tournament,
                        is_active=True
                    )
                except GameRequest.DoesNotExist:
                    if BlockList.is_either_blocked(user, invitee) == False:
                        response = send_invite(user, invitee, game_id, 'tournament', tournament)
                        if response != 'invitation was sent':
                            tournament.delete()
                            return JsonResponse({'success': False, 'message': response}, status=400)
                    else:
                        tournament.delete()
                        return JsonResponse({'success': False, 'message': 'Blocklist: cannot invite user'}, status=400)
            tournament_player_creator(user, tournament)
            tournament.save()
            return JsonResponse({'success': True, 'message': 'Tournament created', 'data': {'tournament_id':tournament.pk}}, status=200)
        except Exception as e:
            return JsonResponse({'success': False, 'message': str(e)}, status=400)


def filter_tournament_by_query(status_query: str | list[str] | None = None, user: str | int | None = None, creator: str | int | None = None, mode_query: str | None = None):
    q_objects = Q()
    
    if mode_query and isinstance(mode_query, str):
        valid_modes = ["single elimination", "round robin"]
        modes = mode_query.split(',')
        modes = [m for m in modes if m]
        if len(modes) > 3:
            raise ValueError('to many state options to query, ony 2 are valid')
        qob = Q()
        for mode in modes:
            if mode not in valid_modes:
                raise ValueError("invalid state, state can be: 'round robin' or 'single elimination'")
            qob |= Q(mode=mode.strip())
        q_objects &= qob
    
    if status_query:
        if isinstance(status_query, str):
            statuses = status_query.split(',')
        else:
            statuses = status_query
        valid_states: list[Literal['waiting', 'in progress', 'finished']] = ['waiting', 'in progress', 'finished']
        statuses = [s for s in statuses if s]
        if len(statuses) > 3:
            raise ValueError('to many state options to query, ony 3 are valid')
        qob = Q()
        for status in statuses:
            if status not in valid_states:
                raise ValueError("invalid state, state can be: 'waiting', 'in progress' or 'finished'")
            qob |= Q(status=status.strip())
        q_objects &= qob

    if user:
        user_id = int(user) if isinstance(user, str) and user.isdigit() else user
        q_objects &= Q(players__user_id=user_id)

    if creator:
        creator_id = int(creator) if isinstance(creator, str) and creator.isdigit() else creator
        q_objects &= Q(creator_id=creator_id)

    return q_objects
    

@require_GET
@login_required
def tournament_list_view(request: HttpRequest, *args, **kwargs):
    user = request.user
    tournament_list = []
    try:
        qobj = filter_tournament_by_query(request.GET.get('status'), request.GET.get('user'), request.GET.get('creator'), request.GET.get('mode'))
        pageno = request.GET.get('page')
        max_pages = 1
        if pageno is None or pageno == '':
            tournaments_page = Tournament.objects.filter(qobj)
        elif not pageno.isdigit():
            return HttpBadRequest400("invalid page")
        else:
            tournaments: QuerySet[Tournament] = Tournament.objects.filter(qobj)
            pageno = int(pageno)
            paginator = Paginator(tournaments, 5)
            tournaments_page = paginator.get_page(pageno)
            max_pages = paginator.num_pages
    except Exception as e:
        return JsonResponse({'success': False, 'message': str(e)}, status=400)
    for tournament in tournaments_page:
        item = {
            'id': tournament.pk,
            'name': tournament.name,
            'game_id': tournament.get_game_id_display(), # type: ignore
            'status': tournament.status,
            'mode': tournament.mode
        }
        tournament_list.append(item)
    return JsonResponse({'success': True, 'message': '', 'data': {
        'tournaments': tournament_list,
        'max_pages': max_pages
    }}, status=200)


@require_GET
@login_required
def tournament_detailed_view(request, *args, **kwargs):
    user = request.user
    t_id = kwargs.get('tournament_id')
    if t_id:
        try:
            tournament = Tournament.objects.get(id=t_id)
        except Exception as e:
            return JsonResponse({'success': False, 'message': str(e)}, status=400)
        data = tournament_details(tournament)
        return JsonResponse({'success': True, 'message': '', 'data': data}, status=200)
    else:
        return JsonResponse({'success': False}, status=422)

@require_POST
@login_required
def tournament_force_schedule(request, *args, **kwargs):
    t_id = kwargs.get('tournament_id')
    user = request.user
    if not t_id:
        return JsonResponse({'success': False, 'message': 'Bad Request: tournament id not present'}, status=400)
    try:
        tournament = Tournament.objects.get(id=t_id)
    except Tournament.DoesNotExist:
        return JsonResponse({'success': False, 'message': 'Tournament does not exist'}, status=400)
    except Exception as e:
        return JsonResponse({'success': False, 'message': str(e)}, status=500)
    if tournament.creator != user:
        return JsonResponse({'success': False, 'message': 'Permission denied'}, status=403)
    try:
        players = TournamentPlayer.objects.filter(tournament=tournament)
        if len(players) < 4:
            return JsonResponse({'success': False, 'message': 'At least four players are required to start tournament'}, status=400)
        else:
            schedules = GameRequest.objects.filter(tournament=tournament, is_active=True)
            for schedule in schedules:
                schedule.cancel()
            try:
                tournament.update(True, False)
                schedules = GameSchedule.objects.filter(tournament=tournament, is_active=True)
                if len(schedules) < 1:
                    return JsonResponse({'success': False, 'message': 'match fixtures creation failed'}, status=500)
                else:
                    return JsonResponse({'success': True, 'message': 'match fixtures created'}, status=200)
            except Exception as e:
                return JsonResponse({'success': True, 'message': str(e)}, status=500)
    except TournamentPlayer.DoesNotExist:
        return JsonResponse({'success': False, 'message': 'Permission denied'}, status=403)
    except Exception as e:
        return JsonResponse({'success': False, 'message': str(e)}, status=500)			



@login_required
def player_stats(request, *args, **kwargs):
    user = request.user
    if request.method == 'GET':

        try:
            player = Player.objects.get(user=user)
        except Exception as e:
            return JsonResponse({'success': False, 'message': str(e)}, status=400)
        
        player_data = model_object_serializer(player)

        win_rate = 0 if player_data['games_played'] == 0 else round((player_data['wins'] / player_data['games_played']) * 100, 1)
        loss_rate = 0 if player_data['games_played'] == 0 else round((player_data['losses']/ player_data['games_played']) * 100, 1)

        win_loss_ratio = 0 if player_data['losses'] == 0 else round((player_data['wins'] / player_data['losses']) * 100, 1)

        df = pd.DataFrame(player_data)
        margins = df[['win_loss_margin']]
        win_margin = []
        loss_margin = []
        for item in player_data['win_loss_margin']:
            if item > 0:
                win_margin.append(item)
            elif item < 0:
                loss_margin.append(item)

        avg_win_margin = avg_loss_margin = 0
        if win_margin != 0 and len(win_margin) != 0:
            avg_win_margin = sum(win_margin) / len(win_margin)
        if loss_margin != 0 and len(loss_margin) != 0:
            avg_loss_margin = sum(loss_margin) / len(loss_margin)


        plt.plot(margins)
        plt.ylabel('Win/Loss Margin')
        plt.grid(False)

        buffer = io.BytesIO()
        plt.savefig(buffer, format='png')
        buffer.seek(0)
        image_bytes = buffer.getvalue()
        buffer.close()

        image_b64 = base64.b64encode(image_bytes).decode('utf-8')
        plt.close()

        return JsonResponse({'success': True, 'data': image_b64}, status=200)

    else:
        return JsonResponse({'success': False}, status=403)
    
    
@require_GET
@login_required
def leaderboard(request: HttpRequest):
    players = Player.objects.all().order_by('-xp')
    return HttpSuccess200('leaderboard', [serializer_player_details(p, None) for p in players])