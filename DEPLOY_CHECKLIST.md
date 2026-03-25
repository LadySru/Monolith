# 🚀 Deploy Checklist

## Pre-Deployment ✅

- [ ] Discord bot token regenerated (old one was compromised)
- [ ] New token set in Netlify environment as `DISCORD_BOT_TOKEN`
- [ ] All 4 new Netlify Functions created
- [ ] `db-integration.js` created
- [ ] `index.html` updated to include `<script src="/db-integration.js"></script>`

---

## Deployment Steps

### **Step 1: Commit All Files**
```bash
git add netlify/functions/init-db.js
git add netlify/functions/game-scores.js
git add netlify/functions/reviews.js
git add netlify/functions/newsletter-subscribers.js
git add db-integration.js
git add index.html
git add DATABASE_SETUP.md
git add IMPLEMENTATION_SUMMARY.md
git add CHANGES_SUMMARY.md

git commit -m "Add Netlify DB integration for game scores, reviews, and newsletters"
```

### **Step 2: Push to GitHub**
```bash
git push origin main
```

Wait for Netlify to auto-deploy (takes ~30 seconds).

### **Step 3: Initialize Database** (One-time only)
After deployment completes, visit:
```
https://your-site-name.netlify.app/.netlify/functions/init-db
```

Should return:
```json
{ "message": "Database initialized successfully" }
```

---

## Post-Deployment Testing

### **Test 1: Play a Game**
- [ ] Open site
- [ ] Go to Arcade section
- [ ] Play Snake game
- [ ] Enter name and save score
- [ ] Check browser console for: `✓ Score saved to database`

### **Test 2: Check Leaderboard**
- [ ] Your score should appear in global leaderboard
- [ ] Refresh page
- [ ] Score should still be there ✨

### **Test 3: Submit Review**
- [ ] Go to Reviews section
- [ ] Enter name, rating, review text
- [ ] Click "Post Review"
- [ ] Review appears in grid immediately
- [ ] Average rating updates

### **Test 4: Newsletter**
- [ ] Scroll to Newsletter section
- [ ] Enter email
- [ ] Click Subscribe
- [ ] Check browser console for: `✓ Newsletter subscription saved to database`

### **Test 5: Browser Console**
- [ ] Open DevTools (F12)
- [ ] Console tab
- [ ] Look for messages like:
  ```
  ✓ Score saved to database
  ✓ Loaded snake scores from database
  ✓ Review saved to database
  ✓ Newsletter subscription saved to database
  ```

---

## Troubleshooting

### **Functions return 404**
- [ ] Wait 60 seconds for Netlify deploy to complete
- [ ] Refresh browser
- [ ] Check Netlify dashboard → Deploys (see if latest succeeded)

### **"Discord bot token not configured"**
- [ ] Go to Netlify dashboard
- [ ] Settings → Build & Deploy → Environment variables
- [ ] Verify `DISCORD_BOT_TOKEN` is set
- [ ] It should show: `***` (hidden for security)
- [ ] If missing, add it

### **"Failed to fetch scores"**
- [ ] Database may not be initialized
- [ ] Visit init-db endpoint (see Step 3 above)
- [ ] Should return success message

### **Scores/reviews don't persist**
- [ ] Check browser DevTools → Console
- [ ] Look for error messages
- [ ] Is it falling back to localStorage? That's okay (temporary)
- [ ] Clear browser cache and try again
- [ ] Check Neon dashboard to see if data is actually in database

### **Site looks broken**
- [ ] Check browser console for errors
- [ ] Is `db-integration.js` loading? (Network tab)
- [ ] Are there any 404s?
- [ ] Try incognito/private mode

---

## Verification in Neon Dashboard

After initializing database, you can verify data:

1. Go to **Netlify Dashboard**
2. Click **Extensions** → **Neon**
3. Click **Global extension settings** → Opens Neon console
4. In Neon, run SQL:
```sql
SELECT * FROM game_scores;
SELECT * FROM reviews;
SELECT * FROM newsletter_subscribers;
```

You should see your test data!

---

## Rollback (If Needed)

If something goes wrong:

```bash
# Revert last commit
git revert HEAD

# Or reset to before changes
git reset --hard HEAD~1

# Push
git push origin main

# Netlify will deploy old version
```

---

## Summary

✅ **Deploy**: Push to GitHub
✅ **Initialize**: Visit init-db endpoint
✅ **Test**: Play game, save score, submit review
✅ **Verify**: Check Neon dashboard

**Estimated time**: 5 minutes

**Any issues?** Check console logs and `DATABASE_SETUP.md` for detailed troubleshooting.

---

## Success Indicators

✨ **You know it's working when:**

1. Game scores appear in leaderboard
2. Scores persist after page refresh
3. Reviews show with ratings
4. Newsletter email is saved
5. Console shows ✓ messages
6. Neon dashboard shows data in tables

🎉 **You're live with a production database!**
