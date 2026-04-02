# Deploy Discord Bot to Replit

## Step 1: Prepare Your Files
Make sure your bot code is in `/discord-bot/` folder with:
- `bot.py`
- `requirements.txt`
- `.env.example`

## Step 2: Create Replit Project
1. Go to [replit.com](https://replit.com)
2. Sign up (free account)
3. Click "Create" → "Import from GitHub"
4. Paste your GitHub repo URL: `https://github.com/LadySru/Monolith`
5. Click "Import"

## Step 3: Configure Replit
1. In Replit, click the lock icon (Secrets)
2. Add environment variables:
   - Key: `DISCORD_TOKEN` → Value: your bot token
   - Key: `DATABASE_URL` → Value: your Neon connection string
3. Click "Add" for each

## Step 4: Run the Bot
1. In Replit, click "Run" button
2. Bot should show in console: "Bot has connected to Discord!"
3. If errors, check the error message

## Step 5: Keep Bot Running 24/7
Replit free tier needs a "Ping" service to stay alive:

1. Create a simple web server in Replit (optional)
2. Or use Replit's always-on feature if available
3. Recommended: Use uptimerobot.com (free) to ping Replit every 5 minutes

### UptimeRobot Setup (Keep Bot Alive):
1. Go to [uptimerobot.com](https://uptimerobot.com)
2. Sign up (free)
3. Create a new HTTP monitor
4. Set URL to your Replit project URL
5. Set interval to 5 minutes
6. This keeps your bot from going to sleep

## Step 6: Test Commands
In your Discord server, test:
```
/stats
/leaderboard
/profile @member
/oldest
```

## Troubleshooting

**Bot not responding:**
- Check Replit console for errors
- Verify environment variables are set
- Make sure bot is running (click "Run")
- Check bot has proper Discord intents

**Bot keeps disconnecting:**
- Set up UptimeRobot to keep it alive
- Check internet connection in Replit

**Database errors:**
- Verify DATABASE_URL is correct
- Check Neon connection string hasn't changed
- Make sure database exists in Neon

## Next Steps
Once bot is running:
1. Invite bot to your server (use the invite link)
2. Test commands
3. Start building website stats page
