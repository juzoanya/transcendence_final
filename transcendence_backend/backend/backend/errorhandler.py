from middleware import Response
from django.http import HttpResponseNotFound

def error_404(request, exception):
#    return Response(str(exception), None, False, 404)
   return HttpResponseNotFound("Not found")