from django.db import models
from django.contrib.auth import get_user_model
from django.http import JsonResponse, Http404
from django.core.exceptions import PermissionDenied
# from user.models import UserAccount, Player

def set_default_avatar():
    return 'avatars/default_avatar.png'

def get_avatar_path(self, filename):
    return f"avatars/{self.pk}/{'avatar.png'}"

def get_default_user():
    return get_user_model().objects.get(username='root')


def calculate_user_xp(margin, winner):
    xp_map = {
        range(1, 4): 4,
        range(4, 8): 7,
        range(8, 11): 10
    }
    xp = 0
    for margin_range, xp_value in xp_map.items():
        if margin in margin_range:
            xp = xp_value if winner else 0
    return xp


def get_minimal_user_details(user):
    pass

def get_nth_string(num):
    if 10 <= num % 100 <= 20:
        suffix = 'th'
    else:
        suffix = {1: 'st', 2: 'nd', 3: 'rd'}.get(num % 10, 'th')
    return str(num) + suffix



class Response(JsonResponse):
    def __init__(self, message: str,  data = None, success: bool = True, status: int = 200, safe: bool = True, **kwargs):
        super().__init__(data={
            "message": message,
            "success": success,
            "data": data
        }, safe=safe, status=status, **kwargs)

class HttpSuccess200(Response):
    def __init__(self, message: str = "", data = None):
        super().__init__(message=message, data=data, success=True, status=200)

class HttpCreated201(Response):
    def __init__(self, message: str, data = None):
        super().__init__(message=message, data=data, success=True, status=201)


class HttpBadRequest400(Response):
    def __init__(self, message: str):
        super().__init__(message=message, success=False, status=400)

class HttpUnauthorized401(Response):
    def __init__(self, message: str):
        super().__init__(message=message, success=False, status=401)

class HttpForbidden403(Response):
    def __init__(self, message: str):
        super().__init__(message=message, success=False, status=403)

class HttpNotFound404(Response):
    def __init__(self, message: str):
        super().__init__(message=message, success=False, status=404)


class HttpConflict409(Response):
    def __init__(self, message: str):
        super().__init__(message=message, success=False, status=409)

class HttpInternalError500(Response):
    def __init__(self, message: str):
        super().__init__(message=message, success=False, status=500)


class ConflictExcept(Exception):
    pass




class JsonMiddleware:

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        return response

    def process_exception(self, request, exception: Exception) -> JsonResponse | None:
        if isinstance(exception, PermissionDenied):
            return HttpForbidden403(str(exception))
        if isinstance(exception, Http404):
            return HttpNotFound404(str(exception))
        if isinstance(exception, ConflictExcept):
            return HttpConflict409(str(exception))

        return None  # Middlewares should return None when not applied
