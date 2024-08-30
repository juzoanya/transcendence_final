from django.apps import AppConfig
from django.db.models.signals import post_migrate



class UserConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'user'

    def ready(self):
        from django.db.models.signals import post_migrate
        from .models import UserAccount
        import user.signals

        post_migrate.connect(reset_user_status, sender=self)

def reset_user_status(sender, **kwargs):
    from .models import UserAccount
    UserAccount.objects.update(status='offline', online_count=0)
    print('Alle UserAccount-Status auf "offline" und "online_count" auf 0 gesetzt.')