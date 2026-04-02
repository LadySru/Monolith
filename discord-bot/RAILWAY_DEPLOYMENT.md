# Deploy Discord Bot to Railway

## Step 1: Prepare Your Bot
1. Make sure you have your Discord bot token (regenerated)
2. Have your Neon PostgreSQL connection string

## Step 2: Create Railway Project
1. Go to [railway.app](https://railway.app)
2. Sign in with GitHub (or create account)
3. Click "New Project"
4. Select "Deploy from GitHub"
5. Connect your Monolith repository

## Step 3: Configure Railway
1. In Railway dashboard, add environment variables:
   - `DISCORD_TOKEN` = your bot token
   - `DATABASE_URL` = your Neon connection string

2. Railway will automatically detect `Procfile` and deploy

## Step 4: Monitor Logs
1. In Railway, go to "Logs" to see bot activity
2. Bot should show "Bot has connected to Discord!" when ready

## Step 5: Test Commands
In your Discord server, try:
- `/stats` - View your statistics
- `/leaderboard` - See top members
- `/profile @member` - View member profile
- `/oldest` - See oldest member

## Troubleshooting
- If bot doesn't respond, check logs in Railway
- Make sure bot has message content intent enabled
- Verify environment variables are set correctly
- Check database connection string is valid
