import os
# from dotenv import load_dotenv
from pathlib import Path

# load_dotenv()

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent


# Quick-start development settings - unsuitable for production
# See https://docs.djangoproject.com/en/5.0/howto/deployment/checklist/

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = os.getenv('SECRET_KEY')

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = False
# DEBUG = True

AUTH_USER_MODEL = 'user.UserAccount'

ALLOWED_HOSTS = ['*']

BASE_URL = os.getenv('FRONTEND_URL')


LOGIN_URL = '/login'


# Application definition

INSTALLED_APPS = [
    'daphne',
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'django.contrib.humanize',
    'oauth2_provider',

    'corsheaders',
    'channels',

    'user',
    'chat',
    'friends',
    'game',
    'pong_server',
    'notification',
    'websocket_server'
    
    
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'user.utils.JsonMiddleware'
]

CSRF_TRUSTED_ORIGINS = [ 
    os.getenv('FRONTEND_URL'),
    'https://10.12.5.2:5173'
]
CSRF_COOKIE_SECURE = False
# SESSION_COOKIE_DOMAIN=os.getenv('FRONTEND_URL')
# SESSION_COOKIE_DOMAIN=os.getenv('BACKEND_URL')
# SESSION_COOKIE_SAMESITE = "Lax"
SESSION_COOKIE_SAMESITE = "None"
SESSION_COOKIE_SECURE = True

CORS_ALLOW_CREDENTIALS = True
CORS_ALLOWED_ORIGINS = [ 
    os.getenv('FRONTEND_URL'),
    'https://10.12.5.2:5173'
]


ROOT_URLCONF = 'backend.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [os.path.join(BASE_DIR, 'templates')],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

# WSGI_APPLICATION = 'backend.wsgi.application'

ASGI_APPLICATION = 'backend.asgi.application'

CHANNEL_LAYERS = {
    'default': {
        'BACKEND': 'channels_redis.core.RedisChannelLayer',
        'CONFIG': {
            'hosts': [('redis', 6379)],
        },
    },
}

# 'hosts': [('redis', 6379)],

# Database
# https://docs.djangoproject.com/en/5.0/ref/settings/#databases

# DB_DIR = Path(__file__).resolve().parent.parent

# DATABASES = {
#     'default': {
#         'ENGINE': 'django.db.backends.sqlite3',
#         'NAME': BASE_DIR / 'db.sqlite3',
#     }
# }

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql_psycopg2',
        'NAME': os.getenv('DB_NAME'),
        'USER': os.getenv('DB_USER'),
        'PASSWORD': os.getenv('DB_PASSWORD'),
        'HOST': os.getenv('DB_HOST'),
        'PORT': os.getenv('DB_PORT'),
    }
}


# Password validation
# https://docs.djangoproject.com/en/5.0/ref/settings/#auth-password-validators

AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]

#Oauth Provider
OAUTH2_PROVIDER = {
    'ACCESS_TOKEN_EXPIRE_SECONDS': 600,
    'AUTHORIZATION_CODE_EXPIRE_SECONDS': 600,
    'CLIENT_ID_GENERATOR_CLASS': 'oauth2_provider.generators.ClientIdGenerator',
    'CLIENT_SECRET_GENERATOR_CLASS': 'oauth2_provider.generators.ClientSecretGenerator',
    'SCOPES': {
        'read': 'Read scope',
        'write': 'Write scope',
        'openid': 'OpenID Connect scope',
    }
}

CLIENT_ID = os.getenv('CLIENT_ID')
CLIENT_SECRET = os.getenv('CLIENT_SECRET')

# Internationalization
# https://docs.djangoproject.com/en/5.0/topics/i18n/

LANGUAGE_CODE = 'en-us'

TIME_ZONE = 'UTC'

USE_I18N = True

USE_TZ = True


# Static files (CSS, JavaScript, Images)
# https://docs.djangoproject.com/en/5.0/howto/static-files/

STATIC_URL = 'static/'
STATICFILES_DIRS = [
    # os.path.join(BASE_DIR, '../static')
    os.path.join(BASE_DIR, 'static')
]

MEDIA_URL = 'media/'
# MEDIA_ROOT = os.path.join(BASE_DIR, '../static/media')
MEDIA_ROOT = os.path.join(BASE_DIR, 'static/media')
# MEDIA_ROOT = os.path.join(BASE_DIR, 'media')

# Default primary key field type
# https://docs.djangoproject.com/en/5.0/ref/settings/#default-auto-field

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = 'smtp.gmail.com'
EMAIL_USE_TLS = True
EMAIL_PORT = 587
EMAIL_HOST_USER = os.getenv('EMAIL_HOST_USER')
EMAIL_HOST_PASSWORD = os.getenv('EMAIL_HOST_PASSWORD')

SECURE_BROWSER_XSS_FILTER = True
X_FRAME_OPTIONS = 'DENY'



# UserAccount.objects.create(username='melanie', email='frwegohwerg@web.de', password='asd')
# """
# Django settings for backend project.

# Generated by 'django-admin startproject' using Django 5.0.4.

# For more information on this file, see
# https://docs.djangoproject.com/en/5.0/topics/settings/

# For the full list of settings and their values, see
# https://docs.djangoproject.com/en/5.0/ref/settings/
# """
# import os
# from pathlib import Path

# # Build paths inside the project like this: BASE_DIR / 'subdir'.
# BASE_DIR = Path(__file__).resolve().parent.parent


# # Quick-start development settings - unsuitable for production
# # See https://docs.djangoproject.com/en/5.0/howto/deployment/checklist/

# # SECURITY WARNING: keep the secret key used in production secret!
# SECRET_KEY = 'django-insecure-f*m^qhb199t9s9y2571_m-=$xr47-pql6kg5#&)t=+cgt6iixm'

# # SECURITY WARNING: don't run with debug turned on in production!
# DEBUG = True

# AUTH_USER_MODEL = 'user.UserAccount'

# ALLOWED_HOSTS = ['*']


# LOGIN_URL = '/login'


# # Application definition

# INSTALLED_APPS = [
#     'daphne',
#     'django.contrib.admin',
#     'django.contrib.auth',
#     'django.contrib.contenttypes',
#     'django.contrib.sessions',
#     'django.contrib.messages',
#     'django.contrib.staticfiles',
#     'django.contrib.humanize',
#     'oauth2_provider',

#     'corsheaders',
#     'channels',
#     # 'django_extensions',

#     'user',
#     'chat',
#     'friends',
#     'game',
#     'pong_server',
#     'notification',
#     'websocket_server'
    
    
# ]

# MIDDLEWARE = [
#     'django.middleware.security.SecurityMiddleware',
#     'django.contrib.sessions.middleware.SessionMiddleware',
#     'django.middleware.common.CommonMiddleware',
#     'django.middleware.csrf.CsrfViewMiddleware',
#     'django.contrib.auth.middleware.AuthenticationMiddleware',
#     'django.contrib.messages.middleware.MessageMiddleware',
#     'django.middleware.clickjacking.XFrameOptionsMiddleware',
#     'corsheaders.middleware.CorsMiddleware',
#     'user.utils.JsonMiddleware'
# ]

# CSRF_TRUSTED_ORIGINS = [
#     "http://127.0.0.1",
#     "http://localhost",
#     "http://127.0.0.1:5500",
#     "http://localhost:5500",
#     "https://pong.com",
#     "https://pong42.com",
#     "https://pongparty.com",
# ]

# CORS_ALLOW_CREDENTIALS = True

# SESSION_COOKIE_SAMESITE = "None"
# SESSION_COOKIE_SECURE = True

# CORS_ALLOWED_ORIGINS = [
#     "http://127.0.0.1:5500",
#     "http://localhost:5500",
#     "https://pong.com",
#     "https://pong42.com",
#     "https://pongparty.com",
# ]


# ROOT_URLCONF = 'backend.urls'

# TEMPLATES = [
#     {
#         'BACKEND': 'django.template.backends.django.DjangoTemplates',
#         'DIRS': [os.path.join(BASE_DIR, 'templates')],
#         'APP_DIRS': True,
#         'OPTIONS': {
#             'context_processors': [
#                 'django.template.context_processors.debug',
#                 'django.template.context_processors.request',
#                 'django.contrib.auth.context_processors.auth',
#                 'django.contrib.messages.context_processors.messages',
#             ],
#         },
#     },
# ]

# # WSGI_APPLICATION = 'backend.wsgi.application'

# ASGI_APPLICATION = 'backend.asgi.application'

# CHANNEL_LAYERS = {
#     'default': {
#         # 'BACKEND': 'channels.layers.InMemoryChannelLayer',
#         'BACKEND': 'channels_redis.core.RedisChannelLayer',
#         'CONFIG': {
#             'hosts': [('redis', 6379)],
#         },
#     },
# }

# # 'hosts': [('redis', 6379)],

# # Database
# # https://docs.djangoproject.com/en/5.0/ref/settings/#databases

# # DB_DIR = Path(__file__).resolve().parent.parent

# DATABASES = {
#     'default': {
#         'ENGINE': 'django.db.backends.sqlite3',
#         'NAME': BASE_DIR / 'db.sqlite3',
#     }
# }

# # DATABASES = {
# #     'default': {
# #         'ENGINE': 'django.db.backends.postgresql_psycopg2',
# #         'NAME': 'pongdb',
# #         'USER': 'postgres',
# #         'PASSWORD': 'asd',
# #         'HOST': 'postgres',
# #         'PORT': '5432',
# #     }
# # }


# # Password validation
# # https://docs.djangoproject.com/en/5.0/ref/settings/#auth-password-validators

# AUTH_PASSWORD_VALIDATORS = [
#     {
#         'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
#     },
#     {
#         'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
#     },
#     {
#         'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
#     },
#     {
#         'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
#     },
# ]

# #Oauth Provider
# OAUTH2_PROVIDER = {
#     'ACCESS_TOKEN_EXPIRE_SECONDS': 600,
#     'AUTHORIZATION_CODE_EXPIRE_SECONDS': 600,
#     'CLIENT_ID_GENERATOR_CLASS': 'oauth2_provider.generators.ClientIdGenerator',
#     'CLIENT_SECRET_GENERATOR_CLASS': 'oauth2_provider.generators.ClientSecretGenerator',
#     'SCOPES': {
#         'read': 'Read scope',
#         'write': 'Write scope',
#         'openid': 'OpenID Connect scope',
#     }
# }

# CLIENT_ID = 'u-s4t2ud-90c38235b093f31b4c39038283dd818335b0a8c06c68d9d557c489c343346a55'
# CLIENT_SECRET = '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'

# # Internationalization
# # https://docs.djangoproject.com/en/5.0/topics/i18n/

# LANGUAGE_CODE = 'en-us'

# TIME_ZONE = 'UTC'

# USE_I18N = True

# USE_TZ = True


# # Static files (CSS, JavaScript, Images)
# # https://docs.djangoproject.com/en/5.0/howto/static-files/

# STATIC_URL = 'static/'
# STATICFILES_DIRS = [
#     # os.path.join(BASE_DIR, '../static')
#     os.path.join(BASE_DIR, 'static')
# ]

# MEDIA_URL = 'media/'
# # MEDIA_ROOT = os.path.join(BASE_DIR, '../static/media')
# MEDIA_ROOT = os.path.join(BASE_DIR, 'static/media')

# # Default primary key field type
# # https://docs.djangoproject.com/en/5.0/ref/settings/#default-auto-field

# DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'
