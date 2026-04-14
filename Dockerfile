FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends fonts-dejavu-core && rm -rf /var/lib/apt/lists/*

COPY discord-bot/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY discord-bot/ ./discord-bot/

CMD ["python", "-u", "discord-bot/bot.py"]
