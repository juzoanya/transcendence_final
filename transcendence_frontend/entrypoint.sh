#!bin/sh
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
	-keyout /etc/ssl/private/$NGINX_FRONTEND_URI.key \
	-out /etc/ssl/certs/$NGINX_FRONTEND_URI.crt \
	-subj "/CN=$NGINX_FRONTEND_URI"

nginx -g 'daemon off;'