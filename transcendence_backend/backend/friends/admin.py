from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import *


class FriendRequestAdmin(UserAdmin):
    list_display = ['sender', 'receiver', 'is_active', 'timestamp']
    search_fields = ['sender__username', 'receiver__username']
    readonly_fields = ['is_active', 'timestamp']
    list_filter = ['sender', 'receiver']
    filter_horizontal = []
    ordering = []

    class Meta:
        model = FriendRequest

admin.site.register(FriendRequest, FriendRequestAdmin)



class FriendListAdmin(admin.ModelAdmin):
    list_display = ['user']
    search_fields = ['user']
    list_filter = ['user']

    class Meta:
        model = FriendList

admin.site.register(FriendList, FriendListAdmin)


class BlockListAdmin(admin.ModelAdmin):
    list_display = ['user']
    search_fields = ['user']
    list_filter = ['user']

    class Meta:
        model = BlockList

admin.site.register(BlockList, BlockListAdmin)