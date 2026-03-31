# 🎙️ Discord Live Stats Setup Guide

## Overview

Live Discord server statistics are now displayed on your website! The counter updates every 30 seconds with:
- 🟢 **Online Members** - Real-time online count
- 👥 **Total Members** - Current server member count

## Files Added

- `netlify/functions/discord-stats.mts` - Backend function that fetches Discord API data
- `discord-live-stats.js` - Frontend script that updates the counters
- `index.html` - Updated to include the live stats script

## Setup Instructions

### Step 1: Create a Discord Bot

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Click **"New Application"**
3. Give it a name (e.g., "Monolith Stats Bot")
4. Go to **"Bot"** tab on the left
5. Click **"Add Bot"**
6. Under **"TOKEN"**, click **"Copy"** to copy your bot token
   - ⚠️ **Keep this secret! Don't share it!**

### Step 2: Give Bot Permissions

1. Still in Developer Portal, go to **"OAuth2"** → **"URL Generator"**
2. Select scopes:
   - ✅ `bot`
3. Select permissions:
   - ✅ `View Channels`
   - ✅ `Read Message History`
4. Copy the generated URL
5. Open it in your browser to invite the bot to your server

### Step 3: Add Bot to Your Server

1. Open the OAuth2 URL from Step 2
2. Select your **Monolith Social** server
3. Click **"Authorize"**
4. Complete the CAPTCHA

### Step 4: Enable Intents (Important!)

1. Back in Developer Portal, go to your bot's **"Bot"** tab
2. Scroll to **"Privileged Gateway Intents"**
3. Enable these intents:
   - ✅ **GUILD_MEMBERS** - To see member count
   - ✅ **GUILD_PRESENCES** - To see online status
4. Click **"Save Changes"**

### Step 5: Configure Netlify Environment Variable

**Option A: Netlify Dashboard**

1. Go to [app.netlify.com](https://app.netlify.com)
2. Select your **Monolith** site
3. Go to **"Site settings"** → **"Build & deploy"** → **"Environment**
4. Click **"Edit variables"**
5. Add new variable:
   - **Key:** `DISCORD_BOT_TOKEN`
   - **Value:** (Paste your bot token from Step 1)
6. Click **"Save"**

**Option B: netlify.toml**

Add to `netlify.toml`:
```toml
[functions]
  environment = { DISCORD_BOT_TOKEN = "your-bot-token-here" }
```

**Option C: .env.local** (Local development)

Create `.env.local`:
```
DISCORD_BOT_TOKEN=your-bot-token-here
```

### Step 6: Deploy

```bash
# Push changes to GitHub
git add .
git commit -m "feat: add live Discord server stats"
git push origin claude/learn-github-hosting-7VnSA

# Or deploy directly
netlify deploy --prod
```

## Testing Locally

```bash
# Set environment variable
export DISCORD_BOT_TOKEN=your-bot-token-here

# Run dev server
netlify dev

# Visit http://localhost:8888
# You should see the counters update every 30 seconds
```

## How It Works

```
┌─────────────────────┐
│   index.html        │
│ (50 Online)         │
│ (322 Members)       │
└──────────┬──────────┘
           │
           │ discord-live-stats.js
           │ (Every 30 seconds)
           │
           ▼
┌─────────────────────────────┐
│ /.netlify/functions/        │
│ discord-stats              │
└──────────┬──────────────────┘
           │
           │ DISCORD_BOT_TOKEN
           │
           ▼
┌─────────────────────┐
│  Discord API        │
│ /guilds/:id         │
└─────────────────────┘
```

## Fallback Behavior

If the Discord bot token is not configured:
- ✅ Website still works perfectly
- ✅ Static numbers display (50 Online, 322 Members)
- ❌ Numbers won't update (but no error shown)

## Troubleshooting

### "Discord bot token not configured"
- **Problem:** `DISCORD_BOT_TOKEN` environment variable not set
- **Solution:** Follow Step 5 above

### "Failed to fetch Discord stats" (503)
- **Problem:** Bot token is invalid or expired
- **Solution:**
  1. Go to Developer Portal
  2. Regenerate bot token (old one will be invalid)
  3. Update `DISCORD_BOT_TOKEN` in Netlify

### Counts not updating
- **Problem:** Bot doesn't have GUILD_PRESENCES intent
- **Solution:** Follow Step 4 above, enable the intents

### Bot not in server
- **Problem:** Bot wasn't invited to the server
- **Solution:** Follow Step 3 above

## API Response Format

The `/discord-stats` endpoint returns:

```json
{
  "online": 45,
  "members": 312,
  "cached": false
}
```

## Security Notes

🔒 **Never commit your bot token to GitHub!**
- Always use environment variables
- If token is exposed, regenerate it immediately in Developer Portal
- Tokens in Netlify environment variables are encrypted

## Performance

- ✅ **Cache:** Responses cached for 60 seconds
- ✅ **Update Frequency:** Every 30 seconds on client
- ✅ **Bandwidth:** Minimal API calls (1 request every 30s)
- ✅ **Fallback:** Works without token (static numbers)

## Optional: Show Last Update Time

To show when stats were last updated, add this to index.html near the stats:

```html
<span style="font-size: 0.8rem; color: var(--text3);" id="stats-updated">
  (just now)
</span>
```

Then update `discord-live-stats.js`:

```javascript
async updateStats() {
  // ... existing code ...
  const updatedEl = document.getElementById('stats-updated');
  if (updatedEl) {
    updatedEl.textContent = '(just now)';
  }
}
```

---

**Setup Time:** ~5 minutes
**Difficulty:** Easy
**Live Updates:** Every 30 seconds ✨
