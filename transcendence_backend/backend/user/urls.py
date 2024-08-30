from django.urls import path
from . import views
from . import views
from django.contrib.auth import views as auth_view


urlpatterns = [
    path('register', views.register_view, name='register'),
    path('register', views.register_view, name='register'),
    path('login', views.login_view, name='login'),
    path('logout', views.logout_view, name='logout'),
    path('csrf', views.csrf, name='csrf'),

    path('profile/<int:user_id>', views.profile_view, name='profile'),
    path('profile/<int:user_id>/edit', views.profile_edit_view, name='profile-edit'),
    path('profile/<int:user_id>/delete', views.profile_delete, name='profile-delete'),
    path('search', views.search, name='search'),

    path('password-change', views.password_change, name='password-change'), # type: ignore

]
