import json
from django.conf import settings
from django.shortcuts import render, redirect
from friends.models import *
from .utils import *
from .serializers import *
from .models import UserAccount, Player
from friends.views import friend_list, block_list_view
from django.contrib.auth import authenticate, login, logout
# from django.contrib.auth.models import User
from django.contrib.auth.decorators import login_required
from django.shortcuts import get_object_or_404
from datetime import datetime, timedelta
from django.http import HttpResponse, JsonResponse
from django.core.files.storage import default_storage
from django.core.serializers.json import DjangoJSONEncoder
from django.views.decorators.http import require_GET, require_POST, require_safe
from django.views.decorators.csrf import csrf_exempt

# Create your views here.

# def generate_jwt_token(user):
#     payload = {
#         'user_id': user.id,
#         'username': user.username,
#         'exp': datetime.utcnow() + timedelta(days=1)
#     }
#     return jwt.encode(payload, settings.SECRET_KEY, algorithm='HS256').decode('utf-8')

@csrf_exempt
def homepage(request):
	return render(request, 'index.html')

@csrf_exempt
@require_POST
def register_view(request):
	user = request.user
	if user.is_authenticated:
		return JsonResponse({'success': True, 'message': f'You are already logged in as {user}'}, status=200)
	data = json.loads(request.body)
	username = data.get('username')
	email = data.get('email')
	password = data.get('password')
	if UserAccount.objects.filter(username=username).exists():
		return JsonResponse({'success': False, 'error':'Username already exists'}, status=400)
	if UserAccount.objects.filter(email=email).exists():
		return JsonResponse({'success': False, 'error':'email already exists'}, status=400)
	try:
		user = UserAccount.objects.create_user(username, email, password)
		user.save()
		# Player.objects.create(user=user)
		# FriendList.objects.create(user=user)
		# BlockList.objects.create(user=user)
		return JsonResponse({'success': True, 'message':'Registration Successful'}, status=200)
	except Exception as e:
		return JsonResponse({'success': False, 'message': str(e)}, status=400)
	# return render(request, 'user/register.html')

@csrf_exempt
def login_view(request):
	if request.method == "GET":
		if request.user.is_authenticated:
			return JsonResponse({'success': True, 'message': 'You have an active session.', 'user_id': request.user.pk}, status=200)
	if request.method == 'POST':
		data = json.loads(request.body)
		username = data.get('username')
		password = data.get('password')
		user = authenticate(request, username=username, password=password)
		if user is not None:
			if user.is_active:
				login(request, user)
				user.status = 'online'
				user.save()
				return JsonResponse({'success': True, 'message': 'Login Successful', 'user_id': request.user.pk}, status=200)
			else:
				return JsonResponse({'success': False, 'error': 'Account is disabled'}, status=400)
		else:
			return JsonResponse({'success': False, 'error': 'Invalid credentials'}, status=400)
	# else:
	# 	return JsonResponse({'success': False}, status=403)   
	return render(request, 'user/login.html')
	

@csrf_exempt
@login_required
def check_full_profile(request):
	user = request.user
	account = UserAccount.objects.get(username=user)
	data = {
		'full_profile': account.full_profile
	}
	return JsonResponse({'data': data})


@csrf_exempt
@login_required
def dashboard_view(request):
	return render(request, 'user/dashboard.html')


@csrf_exempt
@login_required
def logout_view(request):
	user = request.user
	account = UserAccount.objects.get(username=user)
	try:
		logout(request)
		account.status = 'offline'
		account.save()
	except Exception as e :
		return JsonResponse({'success': False, 'message': str(e)}, status=500)
	return JsonResponse({'success': True, 'message': 'Logout successful'}, status=200)
	# return redirect('home')


@csrf_exempt
@login_required
def profile_view(request, *args, **kwargs):
	user = request.user
	user_id = kwargs.get('user_id')
	try:
		account = UserAccount.objects.get(pk=user_id)
	except Exception as e:
		return JsonResponse({'success': False, 'message': str(e)}, status=400)
	if BlockList.is_either_blocked(user, account):
		return JsonResponse({'success': False, 'message': 'Blocked: You cannot view this account'}, status=400)
	try:
		player = Player.objects.get(user=account)
	except Exception as e:
		return JsonResponse({'success': False, 'message': str(e)}, status=400)
	if account:
		data = serializer_full_profile_details(account, player)
		is_self = True
		is_friend = False
		if user.is_authenticated and user != account:
			is_self = False
		elif not user.is_authenticated:
			is_self = False
		friends = friend_list(request, *args, **kwargs)
		block_list = block_list_view(request, *args, **kwargs)
		data['friends'] = friends
		data['blocked'] = block_list
		data['is_self'] = is_self
		data['is_friend'] = is_friend
		context = {
			'json_data': json.dumps(data, cls=DjangoJSONEncoder)
		}
		# return JsonResponse(data, safe=False)
	return render(request, 'user/profile-view.html', context)


@csrf_exempt
@login_required
def profile_edit_view(request, *args, **kwargs):
	user = request.user
	user_id = kwargs.get('user_id')
	try:
		account = UserAccount.objects.get(pk=user_id)
	except UserAccount.DoesNotExist:
		return JsonResponse({'success': False, 'message': 'This profile does not exist'}, status=400)
	try:
		player = Player.objects.get(user=account)
	except Player.DoesNotExist:
		return JsonResponse({})
	if request.method == 'POST':
		if account == user:
			first_name = request.POST.get('first_name')
			last_name = request.POST.get('last_name')
			alias = request.POST.get('alias')
			avatar = None
			if 'avatar' in request.FILES:
				avatar = request.FILES['avatar']
			if first_name:
				account.first_name = first_name
			if last_name:
				account.last_name = last_name
			if alias:
				player.alias = alias
			if avatar:
				account.avatar = avatar
			player.save()
			account.save()
		else:
			return JsonResponse({})
	else:
		return JsonResponse({'success': False}, status=403)




# @csrf_exempt
@login_required
def complete_profile(request):
	if request.method == 'POST':
		user = request.user
		first_name = request.POST.get('first_name')
		last_name = request.POST.get('last_name')
		avatar = None
		if 'avatar' in request.FILES:
			avatar = request.FILES['avatar']
		if first_name or last_name:
			if first_name:
				user.first_name = first_name
			if last_name:
				user.last_name = last_name
			if avatar:
				user.avatar = avatar
			user.save()
		user.full_profile = True
		user.save()
		return JsonResponse({'success': True, 'message': 'Profile Updated', 'redirect': True, 'redirect_url': 'profile'}, status=200)
	return render(request, 'user/profile-reg.html')

 
@csrf_exempt
@login_required
def user_search_results(request):
	user = request.user
	res = None
	entry = request.POST.get('userName')
	search_results = UserAccount.objects.filter(username__icontains=entry)
	if len(search_results) > 0 and len(entry) > 0:
		data = []
		for account in search_results:
			item = serializer_minimal_account_details(account)
			user_friend_list = FriendList.objects.get(user=user)
			item['is_mutual_friend'] = user_friend_list.is_mutual_friend(account)
			data.append((item)) 
		res = data
	else:
		res = 'No results found...'
	return JsonResponse({'data': res})


@csrf_exempt
@require_GET
@login_required
def search(request, *args, **kwargs):
	user = request.user
	query = request.GET.get('q')
	if len(query) > 0:
		search_results = UserAccount.objects.filter(username__icontains=query).filter(email__icontains=query).distinct()
		data = []
		for account in search_results:
			item = serializer_minimal_account_details(account)
			user_friend_list = FriendList.objects.get(user=user)
			data.append((item, user_friend_list.is_mutual_friend(account))) 
	return JsonResponse({'data': data})


