FROM python:3.11-alpine

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

RUN mkdir /app /static
COPY static /static

WORKDIR /app

RUN pip install --upgrade pip

COPY requirements.txt .

RUN pip install -r requirements.txt

COPY ./backend /app
COPY ./entrypoint.sh /

ENTRYPOINT [ "sh", "/entrypoint.sh" ]
