from django.contrib import admin
from .models import *

# Register your models here.

class GameResultAdmin(admin.ModelAdmin):
    list_display = ['game_schedule', 'player_one_score', 'player_two_score', 'winner', 'timestamp']
    list_search = ['game_schedule']
    list_filter = ['game_schedule']
    readonly_fields = ['game_schedule', 'player_one_score', 'player_two_score', 'winner', 'loser', 'timestamp']

    class Meta:
        model = GameResults

admin.site.register(GameResults, GameResultAdmin)


class GameRequestAdmin(admin.ModelAdmin):
    list_display = ['id', 'user', 'invitee', 'is_active']
    list_search = ['user', 'invitee']
    list_filter = ['tournament', 'is_active']
    readonly_fields = ['user', 'invitee']#, 'is_active']

    class Meta:
        model = GameRequest

admin.site.register(GameRequest, GameRequestAdmin)


class GameScheduleAdmin(admin.ModelAdmin):
    list_display = ['id', 'player_one', 'player_two', 'round', 'is_active']
    list_filter = ['tournament', 'is_active']

    class Meta:
        model = GameSchedule

admin.site.register(GameSchedule, GameScheduleAdmin)


class TournamentAdmin(admin.ModelAdmin):
    list_display = ['name', 'mode', 'creator', 'rounds', 'stage', 'status', 'winner']
    readonly_fields = ['id']

    class Meta:
        model = Tournament

admin.site.register(Tournament, TournamentAdmin)

class TournamentPlayerAdmin(admin.ModelAdmin):
    list_display = ['tournament', 'player', 'xp', 'round']
    list_filter = ['tournament']

    class Meta:
        model = TournamentPlayer

admin.site.register(TournamentPlayer, TournamentPlayerAdmin)