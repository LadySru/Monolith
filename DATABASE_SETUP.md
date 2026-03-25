# 🗄️ Netlify DB Setup Guide

Your site now uses **Netlify DB (PostgreSQL via Neon)** for:
- ✅ Game Scores (Snake, Silhouette, Quiz)
- ✅ Community Reviews
- ✅ Newsletter Subscriptions

---

## 📋 One-Time Setup

### **Step 1: Initialize Database Tables**

Call this endpoint **once** to create the tables:

```bash
curl -X POST https://your-site.netlify.app/.netlify/functions/init-db
```

Or simply visit in your browser:
```
https://your-site.netlify.app/.netlify/functions/init-db
```

You should see:
```json
{ "message": "Database initialized successfully" }
```

**That's it!** The database is now ready.

---

## 📁 What Was Created

### **Netlify Functions** (Backend APIs)
```
netlify/functions/
├── discord-icon.js          (Existing - Discord server icon)
├── init-db.js               (Initialize database tables)
├── game-scores.js           (Save/load game scores)
├── reviews.js               (Save/load community reviews)
└── newsletter-subscribers.js (Newsletter signup)
```

### **Frontend Integration**
```
db-integration.js  (Add to index.html - patches existing functions)
```

---

## 🔄 How It Works

### **Game Scores Flow**
1. User plays Snake/Silhouette/Quiz
2. User enters name and saves score
3. `saveSnakeScore()` calls `DB.saveGameScore('snake', name, score)`
4. Data POSTs to `/.netlify/functions/game-scores`
5. Function saves to PostgreSQL
6. Leaderboard refreshes from database

### **Reviews Flow**
1. User submits review
2. `submitReview()` calls `DB.submitReview(name, rating, text)`
3. Data POSTs to `/.netlify/functions/reviews`
4. Function validates and saves to PostgreSQL
5. Review appears in grid immediately

### **Newsletter Flow**
1. User subscribes
2. `subscribeNewsletter()` calls `DB.subscribeNewsletter(email, name, interests)`
3. Data POSTs to `/.netlify/functions/newsletter-subscribers`
4. Function saves to PostgreSQL (prevents duplicates)

---

## 🛡️ Fallback Behavior

If the database is unavailable:
- ✅ Scores still save to `localStorage`
- ✅ Reviews still submit (but may warn user)
- ✅ Newsletter still works

The system degrades gracefully instead of breaking.

---

## 🚀 Deployment

Since your setup is GitHub + Netlify:

```bash
# Push the new functions and script
git add netlify/functions/init-db.js netlify/functions/game-scores.js netlify/functions/reviews.js netlify/functions/newsletter-subscribers.js db-integration.js index.html
git commit -m "Add Netlify DB integration for scores, reviews, and newsletters"
git push origin main
```

Netlify will:
1. Deploy new functions automatically
2. Make them available at `/.netlify/functions/<name>`
3. Use `NETLIFY_DATABASE_URL` environment variable (already configured)

---

## ✅ Verification

After deploying:

1. **Open your site** in browser
2. **Play a game** (Snake, Silhouette, or Quiz)
3. **Save your score** with a name
4. **Check browser console** - should see:
   ```
   ✓ Score saved to database
   ```
5. **Refresh the page** - your score should persist!
6. **Leave a review** - should save to database
7. **Subscribe to newsletter** - should save email

---

## 🔍 API Endpoints Reference

### **Game Scores**
```javascript
// GET all scores for a game
GET /.netlify/functions/game-scores?game=snake&limit=10

// Save a score
POST /.netlify/functions/game-scores
{
  "game_type": "snake",      // "snake" | "silhouette" | "quiz"
  "player_name": "Player123",
  "score": 150
}
```

### **Reviews**
```javascript
// GET all reviews with stats
GET /.netlify/functions/reviews?limit=50

// Submit a review
POST /.netlify/functions/reviews
{
  "player_name": "AnimeWatcher99",
  "rating": 5,                // 1-5
  "review_text": "Amazing community!"
}
```

### **Newsletter**
```javascript
// GET subscriber count
GET /.netlify/functions/newsletter-subscribers

// Subscribe to newsletter
POST /.netlify/functions/newsletter-subscribers
{
  "email": "user@example.com",
  "name": "John",             // Optional
  "interests": ["game-news", "anime-news"]  // Optional
}

// Unsubscribe
DELETE /.netlify/functions/newsletter-subscribers
{
  "email": "user@example.com"
}
```

---

## 🗄️ Database Schema

### **game_scores**
```sql
id (PRIMARY KEY)
game_type VARCHAR(50)    -- "snake" | "silhouette" | "quiz"
player_name VARCHAR(50)
score INTEGER
created_at TIMESTAMP
```

### **reviews**
```sql
id (PRIMARY KEY)
player_name VARCHAR(50)
rating INTEGER            -- 1-5
review_text TEXT
created_at TIMESTAMP
```

### **newsletter_subscribers**
```sql
id (PRIMARY KEY)
email VARCHAR(255)        -- UNIQUE
name VARCHAR(50)
interests TEXT            -- JSON array
created_at TIMESTAMP
is_active BOOLEAN
```

---

## 🔐 Security Notes

- ✅ **Bot token fixed** - Now uses environment variable, not hardcoded
- ✅ **Input validation** - All functions validate and sanitize input
- ✅ **Link filtering** - Reviews/names reject URLs
- ✅ **Email verification** - Newsletter validates email format
- ✅ **Rate limiting ready** - Can add if needed

---

## 📊 Monitoring

To view data in your Neon database:

1. Go to Netlify Dashboard
2. Extensions → Neon
3. Click "Global extension settings"
4. Opens Neon dashboard

There you can:
- Run SQL queries
- View tables
- Export data
- Set up backups

---

## ❓ Troubleshooting

**"Function error" when saving score?**
- Check browser console
- Function fell back to localStorage
- Database may be down (temporary)

**"Database initialized successfully" but functions fail?**
- Verify `NETLIFY_DATABASE_URL` is set in Netlify dashboard
- Check that netlify.toml or build settings haven't changed
- Try re-deploying

**Scores disappeared after refresh?**
- Check if using incognito/private mode
- localStorage may be disabled
- Data should be in database (check Neon dashboard)

**How do I export data?**
- Use Neon dashboard SQL editor
- Export as CSV from there
- Or query via `db-client.js` functions

---

## 🎉 You're All Set!

Your site now has **persistent data storage** via Netlify DB! 

Games, reviews, and newsletters are saved in a **real PostgreSQL database** instead of just browser storage.

Any questions? Check the function comments or Netlify DB docs at: https://docs.netlify.com/persistence/overview/
