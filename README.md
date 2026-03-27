# Monolith Social

Cyberpunk-themed community site for indie game discovery.

## Stack
- Static frontend: `index.html`, `script.js`, `shared.css`, `shared.js`
- Optional backend APIs via Netlify Functions in `netlify/functions/`
- Assets: local images in repo root

## Main Pages
- `index.html` – landing page
- `arcade.html` – arcade features
- `quiz.html` – quiz page
- `reviews.html` – reviews page

## Scripts
- `script.js` – seasonal particles + UI behavior (cursor/menu/reveal)
- `db-integration.js` – frontend bridge for Netlify function endpoints

## Netlify Functions
- `netlify/functions/discord-icon.js`
- `netlify/functions/init-db.js`
- `netlify/functions/game-scores.js`
- `netlify/functions/reviews.js`
- `netlify/functions/newsletter-subscribers.js`
- `netlify/functions/db-client.js`

## Local Development
1. Install deps:
   ```bash
   npm install
   ```
2. Open `index.html` in browser, or serve with your preferred local server.

## Notes
- `node_modules/` is ignored and should not be committed.
- `.vs/` is ignored and should not be committed.
