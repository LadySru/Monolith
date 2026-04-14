FROM python:3.11-slim

WORKDIR /app

COPY discord-bot/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY discord-bot/ ./discord-bot/

CMD ["python", "-u", "discord-bot/bot.py"]
