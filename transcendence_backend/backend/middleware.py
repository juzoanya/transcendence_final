from django.http import JsonResponse

class Response(JsonResponse):
    def __init__(self, message: str,  data = None, success: bool = True, status: int = 200, safe: bool = True, **kwargs):
        super().__init__(data={
            "message": message,
            "success": success,
            "data": data
        }, safe=safe, status=status, **kwargs)

class Success200(Response):
    def __init__(self, message: str, data = None):
        super().__init__(message=message, data=data, success=True, status=200)

class Created201(Response):
    def __init__(self, message: str, data = None):
        super().__init__(message=message, data=data, success=True, status=201)



class BadRequestEx(Exception):
    pass

class NotAuthenticatedEx(Exception):
    pass

class ForbiddenEx(Exception):
    pass

class NotFoundEx(Exception):
    pass

class MethodNotAllowedEx(Exception):
    pass

class ConflictEx(Exception):
    pass



class BadRequest400(Response):
    def __init__(self, message: str):
        super().__init__(message=message, success=False, status=400)

class NotAuthenticated401(Response):
    def __init__(self, message: str):
        super().__init__(message=message, success=False, status=401)

class Forbidden403(Response):
    def __init__(self, message: str):
        super().__init__(message=message, success=False, status=403)

class NotFound404(Response):
    def __init__(self, message: str):
        super().__init__(message=message, success=False, status=404)

class Conflict409(Response):
    def __init__(self, message: str):
        super().__init__(message=message, success=False, status=409)

class InternalError500(Response):
    def __init__(self, message: str):
        super().__init__(message=message, success=False, status=500)

# class MethodNotAllowed405(Response):
#     def __init__(self):
#         super().__init__(message=message, success=False, status=405)

class JsonMiddleware:

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        return response

    def process_exception(self, request, exception: Exception) -> JsonResponse | None:
        if isinstance(exception, BadRequestEx):
            return BadRequest400(str(exception))
        if isinstance(exception, ForbiddenEx):
            return NotAuthenticated401(str(exception))
        if isinstance(exception, ForbiddenEx):
            return Forbidden403(str(exception))
        if isinstance(exception, NotFoundEx):
            return NotFound404(str(exception))
        # if isinstance(exception, MethodNotAllowedEx):
        #     return MethodNotAllowed405(str(exception))

        return None  # Middlewares should return None when not applied