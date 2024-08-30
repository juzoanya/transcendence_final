from django.urls import path
from . import views

urlpatterns = [
    path('result', views.game_results, name='game-result'),
    path('invites-recieved', views.received_invites, name='recieved-invites'),
    path('invites-sent', views.sent_invites, name='sent-invites'),
    path('invite/<user_id>', views.send_game_invite, name='game-invite'),
    path('invite/accept/<invite_id>', views.game_invite_accept, name='game-invite-accept'),
    path('invite/reject/<invite_id>', views.game_invite_reject, name='game-invite-reject'),
    path('invite/cancel/<invite_id>', views.game_invite_cancel, name='game-invite-cancel'),
    path('schedule', views.game_schedule, name='game-schedule'),
    path('history', views.match_history, name='match-history'),
    path('leaderboard', views.leaderboard, name='leaderboard'),
    
    path('stats', views.player_stats, name='player-stats'),
    path('tournament-create', views.create_tournament, name='create-tournament'),
    path('tournaments', views.tournament_list_view, name='tournament-list'),
    path('tournament-details/<tournament_id>', views.tournament_detailed_view, name='tournament-details'),

    path('tournament-start/<tournament_id>', views.tournament_force_schedule, name='tounament-start'),
]
