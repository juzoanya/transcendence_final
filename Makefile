include .env

all: build

build:
	@sed -i 's/IP=.*/IP=$(NGINX_BACKEND_URI)/g' ./transcendence_frontend/ssl/create_cert.sh
	@cd transcendence_frontend/ssl && ./create_cert.sh
# @chmod +x ./transcendence_frontend/ssl/create_cert.sh
# @./transcendence_frontend/ssl/create_cert.sh
# @mv ./localhost ./transcendence_frontend/ssl/
# @mv ./rootCA ./transcendence_frontend/ssl/
	@docker compose up --build

start:
	@docker compose up

stop:
	@docker compose down

restart: stop run

clean: stop
	@docker rmi -f $$(docker images -qa)
	@docker rm -f $$(docker ps -a -q)
	@docker volume prune -f

re: clean all

.PHONY: build run stop clean