# Discord Live Stats - Troubleshooting Checklist

## ❌ Issue: Discord Stats Still Showing Fallback Numbers (50, 322)

Follow this checklist step-by-step:

---

## **1. Verify Discord Bot Token is Set** ✅

### In Netlify Dashboard:
1. Go to [app.netlify.com](https://app.netlify.com)
2. Select **Monolith** site
3. **Site settings** → **Build & deploy** → **Environment**
4. Look for `DISCORD_BOT_TOKEN`
   - **Is it there?** YES ✓ / NO ✗
   - **Does it have a value?** YES ✓ / NO ✗

**If NO:** Add it:
- Key: `DISCORD_BOT_TOKEN`
- Value: Your bot token (from Discord Developer Portal → Bot → TOKEN)

---

## **2. Verify Bot Token is Fresh** ✅

Bot tokens can expire. Get a new one:

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Select **mikubeam** application
3. Go to **Bot** tab
4. Under **TOKEN**, click **"Regenerate"**
5. Click **"Copy"**
6. Update in Netlify: `DISCORD_BOT_TOKEN` = (new token)

---

## **3. Verify Bot Intents are Enabled** ✅

1. Discord Developer Portal → **Bot** tab
2. Scroll to **"Privileged Gateway Intents"**
3. Make sure these are **ENABLED** (blue toggle):
   - ✅ `GUILD_MEMBERS` (shows member count)
   - ✅ `GUILD_PRESENCES` (shows online status)
   - ✅ `GUILD` (basic guild data)
4. Click **"Save Changes"**

---

## **4. Verify Bot is in Your Server** ✅

1. Open your Discord server
2. Go to **Server Settings** → **Members**
3. Search for your bot name (**mikubeam**)
4. **Is it there?** YES ✓ / NO ✗

**If NO:** Invite it again:
- Go to OAuth2 URL Generator in Developer Portal
- Check `bot` scope
- Check `View Channels` permission
- Copy generated URL
- Open URL and authorize

---

## **5. Redeploy Site** ✅

Make sure the latest code is deployed:

1. Go to [app.netlify.com](https://app.netlify.com)
2. Select **Monolith** site
3. **Deploys** tab
4. Click **"Trigger deploy"** → **"Deploy site"**
5. Wait for green checkmark (usually 1-2 minutes)
6. Check the **Deploy log** for errors

---

## **6. Clear Browser Cache & Refresh** ✅

1. **Hard refresh:**
   - Windows/Linux: `Ctrl + Shift + R`
   - Mac: `Cmd + Shift + R`

2. **Or clear cache completely:**
   - Press `F12` → **Application** tab
   - Clear **Storage** → **Cache Storage**
   - Reload page

---

## **7. Check Browser Console** ✅

1. Open site: https://monolithsocial.com (or your Netlify URL)
2. Press **F12** (Developer Tools)
3. Go to **Console** tab
4. Look for messages:

**GOOD SIGNS:** ✅
```
Discord Updated: 45 online, 312 members, icon: loaded
```

**BAD SIGNS:** ❌
```
Failed to load resource: 404
Failed to fetch Discord stats: 404
Failed to fetch Discord stats: 401
Failed to fetch Discord stats: 403
```

---

## **8. Troubleshooting by Error Type** ✅

### **Error: 404 (Not Found)**
- Function endpoint doesn't exist
- **Solution:**
  - Make sure you redeployed after adding the function
  - Check Netlify deploy logs for build errors

### **Error: 401 (Unauthorized)**
- Bot token is invalid or expired
- **Solution:**
  - Regenerate bot token in Discord Developer Portal
  - Update `DISCORD_BOT_TOKEN` in Netlify
  - Redeploy

### **Error: 403 (Forbidden)**
- Bot doesn't have permission to access guild
- **Solution:**
  - Check bot is in your server (Step 4)
  - Check bot has proper permissions (Step 3)
  - Make sure GUILD_MEMBERS intent is enabled

### **Error: 503 (Service Unavailable)**
- Token not configured
- **Solution:**
  - `DISCORD_BOT_TOKEN` environment variable is missing
  - Add it to Netlify environment variables (Step 1)
  - Redeploy

---

## **9. Check Netlify Function Logs** ✅

1. Go to Netlify Dashboard
2. Your site → **Functions** tab
3. Click on `discord-stats` function
4. Look at the **logs** at the bottom
5. Check for any error messages

---

## **Quick Test: Manual API Call** ✅

Open DevTools Console and run:

```javascript
fetch('/.netlify/functions/discord-stats')
  .then(r => r.json())
  .then(d => console.log(d))
```

Expected output:
```json
{
  "online": 45,
  "members": 312,
  "icon": "https://cdn.discordapp.com/icons/...",
  "name": "Monolith Social"
}
```

---

## **Still Not Working?**

If you've checked all 9 steps and it still doesn't work, provide me:

1. Screenshot of browser Console (F12) with the error
2. Screenshot of Netlify environment variables (Site settings)
3. Screenshot of Discord bot intents (are they enabled?)
4. Confirm the bot is in your server

Then I can debug further! 🔍

---

**Remember:** After changing ANY settings, you MUST:
1. ✅ Save changes in Discord Developer Portal
2. ✅ Update environment variables in Netlify
3. ✅ **REDEPLOY the site** (Trigger deploy)
4. ✅ Hard refresh browser (Ctrl+Shift+R)
