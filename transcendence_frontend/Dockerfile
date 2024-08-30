FROM node:20-alpine AS build

# Define build arguments for environment variables
ARG VITE_BACKEND_URL
ARG VITE_FRONTEND_URL
ARG VITE_GLOBAL_WEBSOCKET_URL

# Set environment variables during the build process
ENV VITE_BACKEND_URL=$VITE_BACKEND_URL
ENV VITE_FRONTEND_URL=$VITE_FRONTEND_URL
ENV VITE_GLOBAL_WEBSOCKET_URL=$VITE_GLOBAL_WEBSOCKET_URL


WORKDIR /app
COPY package.json .
RUN npm install
COPY . .
RUN npm run build

FROM nginx:1.19.0

ARG NGINX_FRONTEND_URI
ARG NGINX_BACKEND_URI
ARG NGINX_IP_ADDRESS


# RUN apt-get update && apt-get install -y openssl
# RUN apk upgrade --update-cache --available && \
#     apk add openssl && \
#     rm -rf /var/cache/apk/*







RUN mkdir -p /etc/nginx/ssl/private
RUN mkdir -p /etc/nginx/ssl/certs

# RUN openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
# 	-keyout /etc/nginx/ssl/private/$NGINX_FRONTEND_URI.key \
# 	-out /etc/nginx/ssl/certs/$NGINX_FRONTEND_URI.crt \
# 	-subj "/CN=*.$NGINX_FRONTEND_URI/C=AT/ST=default/L=default/O=MyOrg" \
#     -extensions san \
#     -config <( \
#         echo '[req]'; \
#         echo 'distinguished_name=req'; \
#         echo '[san]'; \
#         echo 'subjectAltName=DNS:localhost,DNS:example.org')

# RUN openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
# 	-keyout /etc/nginx/ssl/private/pong.key \
# 	-out /etc/nginx/ssl/certs/pong.crt \
# 	-subj "/CN=$NGINX_IP_ADDRESS/C=AT/ST=default/L=default/O=MyOrg" \
#     -addext "authorityKeyIdentifier=keyid,issuer" \
#     -addext "basicConstraints=CA:FALSE" \
#     -addext "extendedKeyUsage = serverAuth, clientAuth" \
#     -addext "keyUsage = digitalSignature, nonRepudiation, keyEncipherment, dataEncipherment" \
#     -addext "subjectAltName=IP:$NGINX_IP_ADDRESS" 

COPY --from=build /app/build /var/www/pong_spa

# COPY ./ssl/pong/pong.crt /etc/nginx/ssl/certs/pong.crt
# COPY ./ssl/pong/pong.key /etc/nginx/ssl/private/pong.key

COPY nginx/nginx.conf /etc/nginx/nginx.conf
COPY nginx/nginx.conf.d/default.conf.template /etc/nginx/templates/
COPY nginx/nginx.conf.d/ssl.conf.template /etc/nginx/templates/



EXPOSE 80 443
CMD ["nginx", "-g", "daemon off;"]
# ENTRYPOINT [ "sh", "/entrypoint.sh" ]