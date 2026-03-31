# Monolith Social - GitHub Repository & Hosting Guide

## 📋 Project Overview

**Monolith Social** is a cyberpunk-themed indie game discovery community platform. It's a **static frontend website with optional serverless backend APIs**, designed to run on **Netlify**.

**Key Characteristics:**
- Frontend: Pure HTML/CSS/JavaScript (no build step required)
- Backend: Netlify Functions (serverless Node.js)
- Database: PostgreSQL via Neon (optional, requires environment variable)
- Hosting: Netlify (free tier compatible)

---

## 🏗️ Repository Structure

```
/monolith/
├── index.html              # Landing page (main entry point)
├── arcade.html             # Arcade/games section
├── quiz.html               # Interactive quiz page
├── reviews.html            # Community reviews page
├── script.js               # Main client-side logic (seasonal particles, UI)
├── shared.js               # Shared JavaScript utilities
├── shared.css              # Global styles (cyberpunk theme)
├── db-integration.js       # Client-side API bridge for Netlify Functions
├── package.json            # npm dependencies (minimal: @netlify/neon)
├── package-lock.json       # Dependency lock file
├── netlify/
│   ├── functions/
│   │   ├── db-client.js              # Database client wrapper (with localStorage fallback)
│   │   ├── init-db.js                # Database schema initialization
│   │   ├── game-scores.js            # Game leaderboard API
│   │   ├── reviews.js                # Community reviews API
│   │   ├── newsletter-subscribers.js # Newsletter subscription API
│   │   └── discord-icon.js           # Discord avatar integration
│   └── [netlify build config]
├── assets/                 # Images (banner.jpg, avatar.jpg, etc.)
└── .git/                   # Git repository

```

---

## 🎨 Technology Stack

### Frontend
- **HTML5**: Semantic markup with Open Graph meta tags
- **CSS3**: Cyberpunk neon aesthetic with:
  - Custom CSS variables for theming (teal, purple, green, red, pink)
  - Clip-path shapes for geometric UI elements
  - Glassmorphism effects with backdrops
  - Animated scanlines and noise overlays
- **JavaScript (Vanilla)**:
  - **SeasonalParticles class**: Canvas-based particle animations (springs, snow, falling leaves, summer effects)
  - **Custom cursor system**: Position-tracking cursor replacement
  - **Menu interactions**: Hamburger menu with staggered animations
  - **Scroll reveal animations**: Elements fade in as they come into viewport

### Backend (Optional)
- **Netlify Functions**: Serverless Node.js endpoints at `/.netlify/functions/*`
- **Neon PostgreSQL**: Cloud database for persistent storage
- **Environment Variables**: `NETLIFY_DATABASE_URL` for database connection

### Styling Details
- **Fonts**:
  - Orbitron (headings, UI labels - monospace/futuristic)
  - Rajdhani (body text - technical, geometric)
  - Noto Sans JP (Japanese character support)
- **Color Palette**:
  - Primary: Teal (#00ffe7) with glow effects
  - Accents: Purple (#8b2fff), Green (#39ff8a), Amber (#ffd200), Red (#ff2d6b), Pink (#ff00aa)
  - Background: Deep dark purple (#02000a to #100d28) - suitable for OLED displays

---

## 🌐 How the Website Works

### 1. **Client-Side Architecture**

#### Pages
| Page | Purpose | Features |
|------|---------|----------|
| `index.html` | Landing page | Hero section, community showcase, featured games, newsletter signup |
| `arcade.html` | Games hub | Interactive games (Snake, Silhouette, Tap Game) with score saving |
| `quiz.html` | Trivia quiz | Game knowledge quiz with scoring |
| `reviews.html` | Community hub | Game reviews submission and display, rating statistics |

#### Key JavaScript Features
- **Seasonal Particles**: Canvas animations that change with seasons (spring flowers, summer sun particles, fall leaves, winter snow)
- **Cursor Replacement**: Custom animated cursor following mouse movement
- **Scroll Animations**: Elements reveal as they enter viewport with fade-up effect
- **Menu System**: Mobile-responsive hamburger menu with smooth interactions
- **Form Handling**: Newsletter signups, review submissions with validation

#### Data Storage Options
1. **localStorage** (default): Client-side storage, persists per browser
2. **Database** (optional): Via Netlify Functions calling Neon PostgreSQL

---

### 2. **Backend APIs (Netlify Functions)**

#### Database Connection Flow
```
Client (db-integration.js)
    ↓
Netlify Function endpoint (/.netlify/functions/*)
    ↓
Neon PostgreSQL (if NETLIFY_DATABASE_URL set)
    ↓
JSON Response back to client
    ↓
With fallback to localStorage if DB unavailable
```

#### Available Endpoints

**A. Game Scores API** (`game-scores.js`)
```javascript
// GET: Fetch leaderboard
GET /.netlify/functions/game-scores?game=snake&limit=10
Response: { scores: [ {id, player_name, score, created_at}, ... ] }

// POST: Save a score
POST /.netlify/functions/game-scores
Body: { game_type: "snake", player_name: "Player", score: 150 }
Response: { message: "Score saved", data: {...} }
```
- Supports: snake, silhouette, quiz, tap
- Caches responses for 5 minutes (max-age=300)
- Validates score as non-negative number

**B. Reviews API** (`reviews.js`)
```javascript
// GET: Fetch reviews with statistics
GET /.netlify/functions/reviews?limit=50
Response: {
  reviews: [ {id, player_name, rating, review_text, created_at}, ... ],
  stats: { total_reviews, avg_rating, five_star, four_star, ... }
}

// POST: Submit review
POST /.netlify/functions/reviews
Body: { player_name: "Name", rating: 5, review_text: "Great game!" }
```
- Sanitizes HTML characters to prevent XSS
- Blocks reviews with links
- Validates rating 1-5, name 2+ chars, text 10+ chars
- No cache (cache-control: no-cache)

**C. Newsletter API** (`newsletter-subscribers.js`)
```javascript
// GET: Subscriber count
GET /.netlify/functions/newsletter-subscribers
Response: { subscriber_count: 42 }

// POST: Subscribe email
POST /.netlify/functions/newsletter-subscribers
Body: { email: "user@example.com", name: "User", interests: ["rpg", "indie"] }

// DELETE: Unsubscribe
DELETE /.netlify/functions/newsletter-subscribers
Body: { email: "user@example.com" }
```
- Email validation with regex
- Duplicate emails reactivate existing subscription
- Supports interest tags

**D. Database Initialization** (`init-db.js`)
```javascript
// POST: One-time setup (creates tables and indexes)
POST /.netlify/functions/init-db
Response: { message: "Database initialized successfully" }
```

---

## 🚀 Hosting on Netlify

### Prerequisites
- GitHub account (with repo pushed)
- Netlify account (free tier)
- Optional: Neon PostgreSQL account (free tier available)

### Step 1: Connect GitHub Repository

1. Go to [netlify.com](https://netlify.com)
2. Sign in with GitHub
3. Click "New site from Git"
4. Select your repository (`LadySru/monolith`)
5. Authorize Netlify access to GitHub

### Step 2: Configure Build Settings

**Build Command**: Leave empty (no build step needed)
```
# This is a static site - no build required
```

**Publish Directory**: `.` (root directory)

**Environment Variables** (if using database):
```
NETLIFY_DATABASE_URL=postgresql://user:password@host/database
```

### Step 3: Deploy

Click "Deploy" - Netlify will:
1. Clone your repository
2. Build Netlify Functions (automatically detects `netlify/functions/*.js`)
3. Deploy to CDN
4. Assign a `.netlify.app` domain

### Step 4: Set Up Database (Optional)

If you want persistent storage:

1. Create free Neon PostgreSQL account at [neon.tech](https://neon.tech)
2. Create a new project and database
3. Copy connection string
4. Add to Netlify environment variables: `NETLIFY_DATABASE_URL`
5. Run initialization function once:
   ```javascript
   // Call via browser console or make POST request
   fetch('/.netlify/functions/init-db', { method: 'POST' })
   ```

---

## 🔄 Git Workflow

### Current Branch
You're working on: `claude/learn-github-hosting-7VnSA`

### Making Changes

```bash
# 1. Make changes to files
# 2. Check what changed
git status

# 3. Stage your changes
git add [files]

# 4. Commit with clear message
git commit -m "Add feature: description"

# 5. Push to GitHub (Netlify auto-deploys!)
git push -u origin claude/learn-github-hosting-7VnSA
```

### Netlify Auto-Deploy
- Every time you push to GitHub, Netlify automatically detects the change
- Rebuilds and deploys the site in ~1-2 minutes
- Previous deployments preserved in deployment history

### Creating Pull Requests
When ready to merge to `main`:
1. Push your branch to GitHub
2. Create Pull Request on GitHub (main ← your branch)
3. Review changes
4. Merge to main
5. Netlify deploys production version

---

## 📊 Database Schema (if using PostgreSQL)

### game_scores table
```sql
CREATE TABLE game_scores (
  id SERIAL PRIMARY KEY,
  game_type VARCHAR(50),        -- 'snake', 'silhouette', 'quiz', 'tap'
  player_name VARCHAR(50),
  score INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
-- Indexes: game_type, created_at DESC
```

### reviews table
```sql
CREATE TABLE reviews (
  id SERIAL PRIMARY KEY,
  player_name VARCHAR(50),
  rating INTEGER (1-5),         -- CHECK constraint
  review_text TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
-- Indexes: created_at DESC, rating
```

### newsletter_subscribers table
```sql
CREATE TABLE newsletter_subscribers (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE,
  name VARCHAR(50),
  interests TEXT,               -- JSON array as string
  created_at TIMESTAMP,
  is_active BOOLEAN DEFAULT true
)
-- Indexes: email, is_active
```

---

## 🔐 Security Features

### Input Validation
- Email regex validation
- String length checks
- Game type whitelist
- Score range validation

### XSS Prevention
- HTML character escaping (`<>"'&` replaced)
- Link detection and blocking in reviews
- No direct HTML injection

### SQL Injection Prevention
- Uses parameterized queries (Neon SDK handles escaping)
- Never concatenates user input into SQL

### Database Fallback
- All APIs gracefully degrade to localStorage if database unavailable
- No data loss for users if backend is down

---

## 📝 Development Tips

### Local Testing
```bash
# Install dependencies (mostly unused, but keeps npm happy)
npm install

# Serve with any local server (Python built-in works)
python3 -m http.server 8000

# Visit http://localhost:8000
```

### Testing Netlify Functions Locally
Install Netlify CLI:
```bash
npm install -g netlify-cli
netlify dev
```
This starts local Functions server on `:8888`

### Adding New Pages
1. Create `newpage.html` with same structure as existing pages
2. Include `<script src="shared.js"></script>` and `<link rel="stylesheet" href="shared.css">`
3. Create navigation links in other pages
4. Git commit and push - auto-deploys!

### Modifying Styles
- Edit `shared.css` for global changes
- Use CSS variables (`:root`) for theming
- All browsers support the color palette

---

## 🎯 How Hosting Works (Summary)

```
You write code
    ↓
Push to GitHub branch
    ↓
Netlify detects push (webhook)
    ↓
Netlify builds & deploys
    ↓
Functions compiled & uploaded
    ↓
Site live at your-site.netlify.app
    ↓
Users access website
    ↓
Browsers render HTML/CSS/JS
    ↓
Optional: Calls to /.netlify/functions/* for data
    ↓
Fallback to localStorage if offline
```

---

## 📚 Resources

- **Netlify Docs**: https://docs.netlify.com
- **Netlify Functions**: https://docs.netlify.com/functions/overview
- **Neon PostgreSQL**: https://neon.tech/docs
- **MDN Web Docs**: https://developer.mozilla.org

---

## ✨ Key Takeaways

1. **Static + Serverless = Simple**: No complex build pipeline, just push HTML/CSS/JS
2. **Free Hosting**: Netlify free tier handles most use cases
3. **Graceful Degradation**: Works without database; database is optional enhancement
4. **Git = Deployment**: Every push to GitHub triggers automatic deployment
5. **Cyberpunk Aesthetic**: Heavily customized with CSS variables for easy theming changes

---

**Last Updated**: 2026-03-31
**Branch**: claude/learn-github-hosting-7VnSA
