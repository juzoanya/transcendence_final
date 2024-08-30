from django.db import models
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager

from .utils import get_avatar_path, set_default_avatar
from .types import BasicUserData, Literal, PlayerData



class UserAccountManager(BaseUserManager["UserAccount"]):

    def create_user(self, username: str, email: str, password: str | None = None) -> "UserAccount":
        if not username:
            raise ValueError('Username cannot be null')
        if not email:
            raise ValueError('email cannot be null')
        user: "UserAccount" = self.model(
            username=username,
            email=self.normalize_email(email),
        )
        user.set_password(password)
        user.save(using=self._db)
        return user
    
    def create_superuser(self, username, email, password):
        user = self.create_user(
            username=username,
            email=self.normalize_email(email),
            password=password,
        )
        user.is_admin = True
        user.is_staff = True
        user.is_superuser = True
        user.save(using=self._db)
        return user

class UserAccount(AbstractBaseUser):
    Oauth_Choices = [
        (None, 'None'),
        ('42api', '42api'),
    ]
    username = models.CharField(max_length=30, unique=True)
    email = models.EmailField(max_length=60, verbose_name='email', unique=True)
    first_name = models.CharField(max_length=30, verbose_name='first name')
    last_name = models.CharField(max_length=30, verbose_name='last name')
    avatar = models.ImageField(max_length=255, upload_to=get_avatar_path, null=True, blank=True, default=set_default_avatar)
    status = models.CharField(max_length=10, default='offline')
    online_count = models.PositiveIntegerField(default=0)
    bio = models.CharField(max_length=255, null=True)
    is_2fa = models.BooleanField(default=False)
    oauth = models.CharField(max_length=10, choices=Oauth_Choices, null=True, default=None)
    full_profile = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    is_admin = models.BooleanField(default=False)
    is_staff = models.BooleanField(default=False)
    is_superuser = models.BooleanField(default=False)
    last_login = models.DateTimeField(verbose_name='last login', auto_now=True)
    date_joined = models.DateTimeField(verbose_name='date joined', auto_now_add=True)

    objects: UserAccountManager = UserAccountManager()

    USERNAME_FIELD = 'username'
    REQUIRED_FIELDS = ['email']

    def __str__(self):
        return self.username

    def get_avatar_filename(self):
        return str(self.avatar)[str(self.avatar).index(f'avatars/{self.pk}/'):]
    
    def has_perm(self, perm, object=None):
        return self.is_admin
    
    def has_module_perms(self, app_label):
        return True
    

        
    def get_private_user_room(self):
        print(f"typeof username: {type(self.username)}")
        return f"user-room-private-{hash(str(self.username))}"

    def get_friends_user_room(self):
        return f"user-room-friends-{hash(str(self.username))}"
    
    def update_status_count(self, online: bool) -> Literal['offline', 'online'] | None:
        status = None
        self.online_count = self.online_count + 1 if online else self.online_count - 1
        if self.online_count < 0:
            self.online_count = 0
        if online and self.online_count == 1:
            status = 'online'
        elif not online and self.online_count == 0:
            status = 'offline'
        if status:
            self.status = status
        self.save()
        return status



class Player(models.Model):
    user = models.OneToOneField(UserAccount, related_name='player', on_delete=models.CASCADE)
    alias = models.CharField(max_length=30, unique=True)
    games_played = models.PositiveIntegerField(default=0)
    wins = models.PositiveIntegerField(default=0)
    losses = models.PositiveIntegerField(default=0)
    win_loss_margin = models.JSONField(default=list)
    xp = models.PositiveIntegerField(default=10)


    def __str__(self):
        return self.user.username

    def save(self, *args, **kwargs):
        if not self.alias:
            self.alias = self.user.username
        super().save(*args, **kwargs)
    
    def update_xp(self, xp: int, winner: bool):
        self.xp += xp
        self.save()
    
    def update_game(self, xp: int | None, margin: int, winner: bool):
        if xp is not None:
            self.xp += xp
        self.games_played += 1
        if winner:
            self.wins += 1
        else:
            self.losses += 1
        self.win_loss_margin.append(margin)
        self.save()
        
        
class Leaderboard(models.Model):
    player = models.ForeignKey(Player, on_delete=models.CASCADE)
    rank = models.IntegerField(default=0)

    def __str__(self):
        return f'{self.rank} - {self.player.user}'

