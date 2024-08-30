from django.urls import path
from . import views
from . import views


urlpatterns = [
    path('request', views.send_friend_request, name='friend-request'),
    path('requests/<int:user_id>', views.friend_requests_received, name='friend-requests'),
    path('remove', views.remove_friend, name='friend-remove'),
    path('requests-sent/<int:user_id>', views.friend_requests_sent, name='friend-requests-sent'),
    path('request/accept/<int:friend_request_id>', views.accept_friend_request, name='friend-request-accept'),
    path('request/reject/<int:friend_request_id>', views.reject_friend_request, name='friend-request-reject'),
    path('request/cancel/<int:friend_request_id>', views.cancel_friend_request, name='friend-request-cancel'),
    path('block/<int:user_id>', views.block_user, name='friend-block'),
    path('unblock/<int:user_id>', views.unblock_user, name='friend-unblock'),
    path('friend-list/<int:user_id>', views.friend_list_view, name='friend-list'),
    path('block-list', views.block_list_view, name='block-list'),
]
