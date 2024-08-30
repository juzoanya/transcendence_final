from django.db import models, transaction
from user.models import *
from user.utils import *
from django.db.models.functions import Random # type: ignore
from django.utils import timezone
from django.http import JsonResponse
from django.contrib.contenttypes.fields import GenericRelation
from notification.models import Notification
from chat.models import ChatRoom
from typing import Literal
from django.shortcuts import get_object_or_404
from notification.utils import create_notification, update_notification
from websocket_server.utils import sync_send_consumer_internal_command, sync_send_consumer_internal_command_list
from websocket_server.constants import *
from django.db.models import Q
from django.db.models.query import QuerySet

def query_players_with_status(tournament: "Tournament"):
    players = tournament.players.prefetch_related('user').all().order_by('-xp')  # Holt alle Spieler des Turniers

    players = players.annotate(game_request_status=models.Subquery(
        GameRequest.objects.filter(
            invitee_id=models.OuterRef('user_id'),
            tournament=tournament,
            is_active=True
        ).values('status')[:1]
    ))
    return players
    # print(f"\nplayers: {players}")
    # for player in players:
    #     print(f"Player: {player.user.username}, GameRequest Status: {getattr(player, 'game_request_status', 'No Request')}")
    # print("\n", players.query)

class Tournament(models.Model):
    class GameID(models.IntegerChoices):
        Pong = 0, 'Pong'
        Other = 1, 'Other'
    name = models.CharField(max_length=30, default='Tournament')
    game_id = models.IntegerField(choices=GameID.choices, null=True)
    mode = models.CharField(max_length=50, blank=False)
    creator = models.ForeignKey(UserAccount, related_name='tournament_creator', on_delete=models.CASCADE)
    players = models.ManyToManyField(Player, related_name='tournament_players')
    nb_player = models.IntegerField(null=True, blank=True)
    rounds = models.PositiveIntegerField(default=0)
    status = models.CharField(max_length=20, default='waiting')
    stage = models.CharField(max_length=20, null=True, blank=True)
    started = models.DateTimeField(null=True, blank=True)
    ended = models.DateTimeField(null=True, blank=True)
    winner = models.ForeignKey(UserAccount, related_name='tournament_winner', on_delete=models.SET_NULL, null=True, blank=True)



    def __str__(self):
        return self.name
    
    def start_tournament(self):
        self.status = 'in progress'
        self.started = timezone.now()
        self.rounds += 1
        self.stage = get_nth_string(self.rounds) + ' ' + 'round'
        self.save()
        self.matchmaking()

    def finish_tournament(self):
        self.status = 'finished'
        self.ended = timezone.now()
        players = TournamentPlayer.objects.filter(tournament=self)
        for player in players:
            player.player.xp += player.xp
            player.player.save()
        self.save()

    def update_tournament(self):
        self.rounds += 1
        num = TournamentPlayer.objects.filter(tournament=self, round=self.rounds).count()
        if self.mode != 'round robin':
            if num == 16 and self.mode == 'group and knockout':
                self.stage = 'round of 16'
            elif num == 8:
                self.stage = 'quarter-final'
            elif num > 2 and num < 5:
                self.stage = 'semi-final'
            elif num == 2:
                self.stage = 'final'
            else:
                self.stage = get_nth_string(self.rounds) + ' round'
            self.save()
            self.matchmaking()
            if len(GameSchedule.objects.filter(tournament=self, round=self.rounds, is_active=True)) == 0:
                self.rounds -= 1
                self.save()
        else:
            self.stage = get_nth_string(self.rounds) + ' round'
            self.save()
            self.matchmaking()




    def update(self, start, end):
        if start:
            self.status = 'in progress'
            self.started = timezone.now()
            self.rounds += 1
            self.stage = get_nth_string(self.rounds) + ' ' + 'round'
            self.save()
            self.matchmaking()
        elif end:
            self.status = 'finished'
            self.ended = timezone.now()
            players = TournamentPlayer.objects.filter(tournament=self)
            for player in players:
                player.player.xp += player.xp
                player.player.save()
            self.save()
        else:
            self.rounds += 1
            num = TournamentPlayer.objects.filter(tournament=self, round=self.rounds).count()
            if self.mode != 'round robin':
                if num == 16 and self.mode == 'group and knockout':
                    self.stage = 'round of 16'
                elif num == 8:
                    self.stage = 'quarter-final'
                elif num > 2 and num < 5:
                    self.stage = 'semi-final'
                elif num == 2:
                    self.stage = 'final'
                else:
                    self.stage = get_nth_string(self.rounds) + ' round'
                self.save()
                self.matchmaking()
                if len(GameSchedule.objects.filter(tournament=self, round=self.rounds, is_active=True)) == 0:
                    self.rounds -= 1
                    self.save()
            else:
                self.stage = get_nth_string(self.rounds) + ' round'
                self.save()
                self.matchmaking()
    
    def matchmaking(self):
        players = TournamentPlayer.objects.filter(tournament=self, round=self.rounds)
        num_plys = TournamentPlayer.objects.filter(tournament=self).count()
        if self.rounds == 1:
            if self.mode == 'group and knockout' and num_plys % 4 == 0 and num_plys < 8:
                self.mode = 'single elimination'
                self.save()
            elif self.mode == 'single elimination' and num_plys % 2 == 1:
                self.mode = 'round robin'
                self.save()

        if self.status != 'finished':
            if self.mode == 'single elimination':
                self.single_elimination(players)
            elif self.mode == 'group and knockout':
                self.group_and_knockout(players)
            else:
                self.round_robin()
                    

    def round_robin(self):
        try:
            players = TournamentPlayer.objects.filter(tournament=self).annotate(random_order=Random()).order_by('random_order')
        except Exception as e:
            return JsonResponse({'success': False, 'message': 'TournamentPlayer: ' + str(e)}, status=500)
        n = len(players)
        for i in range(n):
            for j in range(i + 1, n):
                player_one = players[i].player
                player_two = players[j].player
                try:
                    if not GameSchedule.objects.filter(
                            tournament=self,
                            player_one=player_one,
                            player_two=player_two).exists() and \
                    not GameSchedule.objects.filter(
                            tournament=self,
                            player_one=player_two,
                            player_two=player_one).exists():
                        GameSchedule.objects.create(
                            game_id=self.game_id,
                            game_mode='tournament',
                            tournament=self,
                            player_one=player_one,
                            player_two=player_two
                            # round=round_number
                        )
                except Exception as e:
                    return JsonResponse({'success': False, 'message': 'GameScheduleError'}, status=500)
    

    def single_elimination(self, players):
        if len(players) % 2 == 1:
            t_players = TournamentPlayer.objects.filter(tournament=self, round=self.rounds - 1)
            bye_player = t_players.order_by('xp').first()
            if bye_player:
                bye_player.round += 1
                bye_player.save()
            players = TournamentPlayer.objects.filter(tournament=self, round=self.rounds)
        num_players = len(players)
        if num_players > 1:
            for i in range(num_players // 2):
                try:
                    schedule = GameSchedule.objects.create(
                        game_id=self.game_id,
                        game_mode='tournament',
                        tournament=self,
                        round=self.rounds,
                        player_one=players[i].player,
                        player_two=players[num_players - i - 1].player
                    )
                except Exception as e:
                    return JsonResponse({'success': False, 'message': 'GameScheduleError'}, status=500)


    def group_and_knockout(self, players):
        if self.rounds == 1:
            pass
        else:
            pass


class TournamentPlayerManager(models.Manager['TournamentPlayer']):
    
    def get_tournament_players_with_request_status(self, tournament: Tournament):
        return (TournamentPlayer.objects.filter(tournament=tournament)
            .select_related('player')
            .order_by('-xp')
            .annotate(game_request_status=models.Subquery(
                GameRequest.objects.filter(
                    invitee_id=models.OuterRef('player__user_id'),
                    tournament=tournament,
                    is_active=True
                ).values('status')[:1]
            ))
        )
        
    def get_tournament_players_sorted_by_xp(self, tournament: Tournament):
        return (TournamentPlayer.objects.filter(tournament=tournament)
            .select_related('player')
            .order_by('-xp')
        )
    


class TournamentPlayer(models.Model):
    tournament = models.ForeignKey(Tournament, related_name='tournament_players', on_delete=models.CASCADE)
    player = models.ForeignKey(Player, related_name='player_tournaments', on_delete=models.CASCADE)
    xp = models.IntegerField(default=0)
    round = models.PositiveIntegerField(default=0)
    stage = models.CharField(max_length=20, null=True, blank=True)
    group = models.PositiveIntegerField(default=0)
    
    objects = models.Manager()
    players = TournamentPlayerManager()
    
    def update_xp(self, xp: int):
        self.xp += xp
        self.save()



class GameSchedule(models.Model):
    class GameID(models.IntegerChoices):
        Pong = 0, 'Pong'
        Other = 1, 'Other'
    game_id = models.IntegerField(choices=GameID.choices, null=True)
    game_mode = models.CharField(max_length=20, null=True)
    tournament = models.ForeignKey(Tournament, related_name='tournament_gs', on_delete=models.SET_NULL, null=True, blank=True)
    player_one = models.ForeignKey(Player, related_name='player_one', on_delete=models.CASCADE)
    player_two = models.ForeignKey(Player, related_name='player_two', on_delete=models.CASCADE)
    round = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(blank=True, null=False, default=True)
    scheduled = models.DateTimeField(blank=True, null=True)
    timestamp = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f'{self.pk} - {self.player_one} vs {self.player_two}'
            
    
    def finish_game_and_update(self, score_one: int, score_two: int): #TODO send user xp gained ot lost + winner to consumer
        try:
            if score_one > score_two:
                winner, loser = self.player_one, self.player_two
            else:
                winner, loser = self.player_two, self.player_one,
            result = GameResults.objects.create(
                game_schedule=self,
                player_one_score=score_one,
                player_two_score=score_two,
                winner=winner.user,
                loser=loser.user,
            )
            if self.tournament is not None:
                send_tournament_refresh(self.tournament)
            
        except Exception as e:
            print(f"Error: GameSchedule: finish_game_create_result: {e}")
            raise RuntimeError("!!!!")
        self.is_active = False
        self.save()

        margin = abs(score_one - score_two)
        winner_xp = calculate_user_xp(margin=margin, winner=True)
        loser_xp = calculate_user_xp(margin=margin, winner=False)
        if self.tournament is None:
            winner.update_game(xp=winner_xp, margin=margin, winner=True)
            loser.update_game(xp=loser_xp, margin=-margin, winner=False)
            return result

        winner.update_game(xp=None, margin=margin, winner=True)
        loser.update_game(xp=None, margin=-margin, winner=False)
        t_player = TournamentPlayer.objects.get(player=winner, tournament=self.tournament)
        t_player.xp += winner_xp
        t_player.save()

        scheduled_tournament_games = GameSchedule.objects.filter(tournament=self.tournament, is_active=True)
        if self.tournament.mode == 'round robin' and len(scheduled_tournament_games) == 0:
            players_xp_sorted = TournamentPlayer.objects.filter(tournament=self.tournament).order_by('-xp')
            top_player_xp = players_xp_sorted[0].xp
            if get_tied_players(top_player_xp, players_xp_sorted):
                tied_players = players_xp_sorted.filter(xp=top_player_xp)
                top_player = get_top_by_score_margin(tied_players, self.tournament)
                tournament_player_winner = top_player
            else:
                tournament_player_winner = players_xp_sorted.first()
            if tournament_player_winner:
                self.tournament.winner = tournament_player_winner.player.user
                self.tournament.finish_tournament()
        elif self.tournament.stage == 'final':
            self.tournament.winner = winner.user
            self.tournament.finish_tournament()
        else:
            tournament_player_winner = TournamentPlayer.objects.get(player=winner, tournament=self.tournament)
            tournament_player_winner.round += 1
            tournament_player_winner.save()
            if len(scheduled_tournament_games) == 0:
                self.tournament.update_tournament()
        
        
        create_next_game_notification(self.tournament)
        
        Leaderboard.objects.all().delete()
        players = Player.objects.all().order_by('-xp')
        for rank, player in enumerate(players, start=1):
            Leaderboard.objects.create(player=player, rank=rank)
        return result

def create_next_game_notification(tournament: Tournament):
    schedules = GameSchedule.objects.filter(tournament=tournament)
    if len(schedules) > 0:
        next_game = schedules.earliest('id')
        sync_send_consumer_internal_command(
            next_game.player_one.user.get_private_user_room(),
            {'type': 'game.message', 'id': tournament.pk, 'msg_type': MSG_TYPE_TOURNAMENT_GAME_NEXT}
        )
       

def send_tournament_refresh(tournament: Tournament):
    if tournament is not None:
        pl: QuerySet[Player] = tournament.players.all()
        
        sync_send_consumer_internal_command_list([
                (p.user.get_private_user_room(),
                {'type': 'game.message', 'id': tournament.pk, 'msg_type': MSG_TYPE_TOURNAMENT_REFRESH})
                for p in pl 
            ])

class GameResults(models.Model):
    game_schedule = models.ForeignKey(GameSchedule, related_name='schedule_id', on_delete=models.CASCADE)
    player_one_score = models.IntegerField()
    player_two_score = models.IntegerField()
    winner = models.ForeignKey(UserAccount, related_name='winner', on_delete=models.SET_NULL, null=True)
    loser = models.ForeignKey(UserAccount, related_name='loser', on_delete=models.SET_NULL, null=True)
    timestamp = models.DateTimeField(auto_now_add=True)

    def save(self, *args, **kwargs):
        if not self.winner or not self.loser:
            if self.player_one_score > self.player_two_score:
                self.winner = self.game_schedule.player_one.user
                self.loser = self.game_schedule.player_two.user
            elif self.player_two_score > self.player_one_score:
                self.winner = self.game_schedule.player_two.user
                self.loser = self.game_schedule.player_one.user
        super().save(*args, **kwargs)


class GameRequest(models.Model):

    class GameID(models.IntegerChoices):
        Pong = 0, 'Pong'
        Other = 1, 'Other'
    game_id = models.IntegerField(choices=GameID.choices, null=True)
    game_mode = models.CharField(max_length=20, null=True)
    tournament = models.ForeignKey(Tournament, related_name='tournament_gr', on_delete=models.SET_NULL, null=True, blank=True)
    user = models.ForeignKey(UserAccount, related_name='inviter', on_delete=models.CASCADE)
    invitee = models.ForeignKey(UserAccount, related_name='invitee', on_delete=models.CASCADE)
    is_active = models.BooleanField(blank=True, null=False, default=True)
    status = models.CharField(max_length=20, default='pending')
    notifications = GenericRelation(Notification)
    timestamp = models.DateTimeField(auto_now_add=True)
    
    def clear_tournament_invitation(self):
        if self.tournament is None:
            return
        self.tournament.players.remove(get_object_or_404(Player, user=self.invitee))
        if len(TournamentPlayer.objects.filter(tournament=self.tournament)) == len(self.tournament.players.all()):
            self.tournament.update(True, False)
        if self.tournament is not None:
            send_tournament_refresh(self.tournament)


    def check_tournament_deletion(self):
        if self.tournament is None:
            return
        if len(self.tournament.players.all()) <= 3:
            req = GameRequest.objects.filter(tournament=self.tournament, is_active=True)
            for r in req:
                r._update_status("cancelled")
                self.tournament.players.remove(get_object_or_404(Player, user=r.invitee))
                update_notification(r, f"tournament {self.tournament.name} was deleted, minimum number of players not met.")
            ChatRoom.rooms.clear_tournament_chat(self.tournament.name)
            self.tournament.delete()
            self.tournament = None
            return True
        return False


    def accept_tournament_invitation(self):
        if self.tournament is None:
            return
        player = get_object_or_404(Player, user=self.invitee)
        ChatRoom.rooms.add_user_to_tournament_chat(tournament_name=self.tournament.name, user=self.invitee)
        try:
            t_player = TournamentPlayer.objects.create(tournament=self.tournament, player=player, round=1)
        except Exception as e:
            try:
                t_player = TournamentPlayer.objects.get_or_create(tournament=self.tournament, player=player, round=1)
            except Exception as e:
                raise ValueError(e)
        if len(TournamentPlayer.objects.filter(tournament=self.tournament)) == len(self.tournament.players.all()):
            self.tournament.update(True, False)
        if len(self.tournament.players.all()) < 3:
            self.tournament.delete()
        send_tournament_refresh(self.tournament)

    def _update_status(self, state: Literal["accepted", "rejected", "cancelled"]):
        self.status = state
        self.is_active = False
        self.save()

    def accept(self):
        if not self.is_active:
            return
        if self.game_mode == 'tournament' and self.tournament != None:
            self.accept_tournament_invitation()
        else:
            GameSchedule.objects.create(
                player_one=get_object_or_404(Player, user=self.user),
                player_two=get_object_or_404(Player, user=self.invitee),
                game_id=self.game_id,
                game_mode=self.game_mode,
                tournament=None
            )
        self._update_status("accepted")
        update_notification(self, f"You accepted {self.user.username}'s game invite.")
        return create_notification(self, self.invitee, self.user, f"{self.invitee.username} accepted your game request.")

    def reject(self):
        if not self.is_active: return

        if self.tournament:
            if self.check_tournament_deletion():
                return
            self.clear_tournament_invitation()
        self._update_status("rejected")
        update_notification(self, f"You declined {self.user}'s game request.")
        create_notification(self, self.invitee,  self.user, f"{self.invitee.username} declined your game request.")

    def cancel(self):
        if not self.is_active: return
        if self.tournament:
            if self.check_tournament_deletion():
                return
            self.clear_tournament_invitation()
        self._update_status("cancelled")
        update_notification(self, f"{self.user.username} cancelled the game request.")
        create_notification(self, self.invitee, self.user, f"You cancelled the game request to {self.invitee.username}.")


def add_user_to_chat_room(user: UserAccount, tournament_name: str):
    from chat.models import ChatRoom
    try:
        room = ChatRoom.objects.get(title=tournament_name)
        room.users.add(user)
        room.save()
    except:
        pass


def get_tied_players(xp, sorted_players):
    tied_players = sorted_players.filter(xp=xp)
    if len(tied_players) > 1:
        return True
    return False

def get_top_by_score_margin(players, tournament):
    top_margin = 0
    top_player = None
    for player in players:
        player_margin = 0
        player_games = GameSchedule.objects.filter(Q(player_one=player.player) | Q(player_two=player.player), tournament=tournament, is_active=False)
        for game in player_games:
            result = GameResults.objects.get(game_schedule=game.pk)
            score_margin = abs(result.player_one_score - result.player_two_score)
            if result.winner == player.player.user:
                player_margin += score_margin
            else:
                player_margin -= score_margin
        if player_margin > top_margin:
            top_margin = player_margin
            top_player = player

    return top_player

