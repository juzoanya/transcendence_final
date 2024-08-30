"""
URL configuration for backend project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.0/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

from .errorhandler import error_404
from django.views.defaults import page_not_found
from user.views import callback, login_auth
from django.urls import include, path
from oauth2_provider import urls as oauth2_urls

handler404 = error_404

urlpatterns = [
    path('admin/', admin.site.urls),

    path('api/o/', include(oauth2_urls)),
    path('api/o/login', login_auth, name='oauth2-login'),
    path('api/callback/', callback, name='login-callback'),

    path('api/', include('user.urls')),
    path('api/friend/', include('friends.urls')),
    path('api/game/', include('game.urls')),
    path('api/chat/', include('chat.urls')),


]



if bool(settings.DEBUG):
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
