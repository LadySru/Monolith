# 🏗️ Architecture Diagram

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER'S BROWSER                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  HTML (index.html)                                             │
│  ├── Game Canvas (Snake, Silhouette)                          │
│  ├── Quiz Interface                                           │
│  ├── Reviews Form                                             │
│  └── Newsletter Signup                                        │
│                                                                 │
│  JavaScript (db-integration.js)                               │
│  ├── DB.saveGameScore('snake', name, score)                 │
│  ├── DB.submitReview(name, rating, text)                    │
│  ├── DB.subscribeNewsletter(email, name, interests)         │
│  └── Auto-refresh leaderboards/reviews from DB              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                              ↓↑
                         HTTPS/JSON
                              ↓↑
┌─────────────────────────────────────────────────────────────────┐
│                    NETLIFY PLATFORM                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Netlify Functions (Serverless)                               │
│  ├── /.netlify/functions/game-scores.js                     │
│  │   └── POST: Save score, GET: Load leaderboard           │
│  │                                                            │
│  ├── /.netlify/functions/reviews.js                         │
│  │   └── POST: Save review, GET: Load all with stats       │
│  │                                                            │
│  ├── /.netlify/functions/newsletter-subscribers.js          │
│  │   └── POST: Subscribe, DELETE: Unsubscribe             │
│  │                                                            │
│  └── /.netlify/functions/init-db.js                         │
│      └── Initialize database tables (run once)              │
│                                                                 │
│  Environment Variables:                                        │
│  └── NETLIFY_DATABASE_URL (auto-configured)                 │
│  └── DISCORD_BOT_TOKEN (you set this)                       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                              ↓↑
                    Neon SDK (@netlify/neon)
                              ↓↑
┌─────────────────────────────────────────────────────────────────┐
│                  NEON DATABASE (PostgreSQL)                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Tables:                                                        │
│  ├── game_scores                                              │
│  │   ├── id (PK)                                             │
│  │   ├── game_type (snake|silhouette|quiz)                  │
│  │   ├── player_name VARCHAR(50)                            │
│  │   ├── score INTEGER                                      │
│  │   └── created_at TIMESTAMP                               │
│  │                                                            │
│  ├── reviews                                                  │
│  │   ├── id (PK)                                             │
│  │   ├── player_name VARCHAR(50)                            │
│  │   ├── rating INTEGER (1-5)                               │
│  │   ├── review_text TEXT                                   │
│  │   └── created_at TIMESTAMP                               │
│  │                                                            │
│  └── newsletter_subscribers                                   │
│      ├── id (PK)                                             │
│      ├── email VARCHAR(255) UNIQUE                           │
│      ├── name VARCHAR(50)                                    │
│      ├── interests TEXT (JSON)                               │
│      ├── created_at TIMESTAMP                                │
│      └── is_active BOOLEAN                                   │
│                                                                 │
│  Indexes:                                                       │
│  ├── game_scores(game_type)                                  │
│  ├── game_scores(created_at DESC)                            │
│  ├── reviews(created_at DESC)                                │
│  ├── reviews(rating)                                          │
│  ├── newsletter_subscribers(email)                            │
│  └── newsletter_subscribers(is_active)                        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                              ↓↑
                    Backup & Export
                              ↓↑
┌─────────────────────────────────────────────────────────────────┐
│                  NEON DASHBOARD                                 │
├─────────────────────────────────────────────────────────────────┤
│  - View data in tables                                         │
│  - Run SQL queries                                            │
│  - Export as CSV                                              │
│  - Set up backups                                             │
│  - Monitor usage                                              │
└─────────────────────────────────────────────────────────────────┘
```

---

## Data Flow: Saving a Game Score

```
┌─────────────────────────┐
│  Player plays Snake     │
│  Enters name "Alice"    │
│  Score: 2450            │
│  Clicks "Save"          │
└────────────┬────────────┘
             │
             ↓
┌─────────────────────────────────────────────────┐
│  saveSnakeScore() is PATCHED by db-integration  │
│  Calls: DB.saveGameScore('snake', 'Alice', 2450)
└────────────┬────────────────────────────────────┘
             │
             ↓
┌─────────────────────────────────────────────────┐
│  db-integration.js                              │
│  Async fetch to /.netlify/functions/game-scores │
│  POST { game_type, player_name, score }         │
└────────────┬────────────────────────────────────┘
             │
             ↓
┌─────────────────────────────────────────────────┐
│  Netlify Function: game-scores.js               │
│  - Validate input                               │
│  - Insert into game_scores table                │
│  - Return saved record with timestamp           │
└────────────┬────────────────────────────────────┘
             │
             ↓
┌─────────────────────────────────────────────────┐
│  Neon PostgreSQL                                │
│  INSERT INTO game_scores                        │
│    (game_type, player_name, score)              │
│  VALUES ('snake', 'Alice', 2450)                │
└────────────┬────────────────────────────────────┘
             │
             ↓
┌─────────────────────────────────────────────────┐
│  Response: { id: 42, name: 'Alice', ... }       │
│  Browser: "✓ Score saved to database"           │
└────────────┬────────────────────────────────────┘
             │
             ↓
┌─────────────────────────────────────────────────┐
│  db-integration.js calls:                       │
│  DB.getGameScores('snake', 10)                  │
│  GET /.netlify/functions/game-scores?game=snake │
└────────────┬────────────────────────────────────┘
             │
             ↓
┌─────────────────────────────────────────────────┐
│  Function queries:                              │
│  SELECT * FROM game_scores                      │
│  WHERE game_type = 'snake'                      │
│  ORDER BY score DESC                            │
│  LIMIT 10                                       │
└────────────┬────────────────────────────────────┘
             │
             ↓
┌─────────────────────────────────────────────────┐
│  Returns: [Alice: 2450, Bob: 2300, ...]         │
│  Leaderboard renders with new score             │
└────────────┬────────────────────────────────────┘
             │
             ↓
┌─────────────────────────────────────────────────┐
│  ✨ Alice sees her score #1 on leaderboard!    │
│  Data persists if she refreshes                 │
└─────────────────────────────────────────────────┘
```

---

## Data Flow: Review Submission

```
User submits review
    ↓
HTML calls: submitReview() [PATCHED]
    ↓
DB.submitReview(name, rating, text)
    ↓
Validate:
  ✓ Name: 2+ chars, no links
  ✓ Rating: 1-5
  ✓ Text: 10+ chars, no links
    ↓
POST /.netlify/functions/reviews
  { player_name, rating, review_text }
    ↓
INSERT INTO reviews (player_name, rating, review_text)
    ↓
SELECT * FROM reviews (get all with stats)
    ↓
Return: reviews + {avg_rating, counts by star}
    ↓
Display new review + update rating summary
    ↓
✨ Review appears with 4.5★ average rating
```

---

## Fallback Flow (If Database Unavailable)

```
DB.saveGameScore('snake', 'Alice', 2450)
    ↓
fetch('/.netlify/functions/game-scores')
    │
    ├─ Success → Save to DB ✓
    │
    └─ Failure → Catch error
         ↓
         Use _fallbackSaveScore()
         ↓
         Save to localStorage instead
         ↓
         Leaderboard renders from localStorage
         ↓
         Console: "DB unavailable, using localStorage"
         ↓
         User experience: Still works! ✓
```

---

## File Dependencies

```
index.html
  ↓
  └── <script src="/db-integration.js"></script>
        ↓
        └── Patches:
            ├── saveSnakeScore()
            ├── saveSilScore()
            ├── saveQuizScore()
            ├── submitReview()
            └── subscribeNewsletter()
        ↓
        └── Creates DB object with methods:
            ├── saveGameScore(game, name, score)
            ├── getGameScores(game, limit)
            ├── submitReview(name, rating, text)
            ├── getReviews(limit)
            └── subscribeNewsletter(email, name, interests)
        ↓
        └── Calls Netlify Functions:
            ├── /.netlify/functions/game-scores
            ├── /.netlify/functions/reviews
            └── /.netlify/functions/newsletter-subscribers
                ↓
                └── Connect to Neon via NETLIFY_DATABASE_URL
                    ↓
                    └── PostgreSQL database
```

---

## Technology Stack

```
Frontend
├── HTML5
├── Vanilla JavaScript
├── localStorage (fallback)
└── Fetch API (HTTP client)

Serverless Backend
├── Netlify Functions
├── Node.js runtime
├── Neon SDK (@netlify/neon)
└── Environment variables

Database
├── PostgreSQL (via Neon)
├── 3 tables
├── Indexed for performance
└── Automated backups (Neon)

Deployment
├── GitHub (source)
├── Netlify (CI/CD)
└── Auto-deploy on push
```

---

## Security Layers

```
User Input
    ↓
frontend validation
    ├─ Non-empty checks
    ├─ Length limits
    └─ Link/spam filtering
    ↓
Netlify Function validation
    ├─ Type checking
    ├─ Range validation (ratings 1-5)
    ├─ Email regex validation
    └─ Parameterized queries (SQL injection safe)
    ↓
Database constraints
    ├─ NOT NULL
    ├─ UNIQUE (email)
    ├─ CHECK constraints (rating >= 1)
    └─ Data types
    ↓
Stored safely in PostgreSQL
```

---

This architecture ensures:
- ✅ **Scalability** - Serverless handles traffic spikes
- ✅ **Reliability** - Neon provides 99.99% uptime
- ✅ **Security** - Multiple validation layers
- ✅ **Fallback** - localStorage backup if DB unavailable
- ✅ **Simplicity** - No server to manage
- ✅ **Cost** - Generous free tier
