/* ══════════════════════════════════════════
   DB INTEGRATION — Netlify Functions Bridge
   ──────────────────────────────────────────
   Non-blocking layer that syncs localStorage
   data with the Neon PostgreSQL backend via
   Netlify Functions. Falls back gracefully
   to localStorage if the API is unavailable.
   ══════════════════════════════════════════ */

const DB = {
  API_BASE: '/.netlify/functions',

  // ── GAME SCORES ──
  async saveScore(gameType, playerName, score) {
    try {
      const res = await fetch(`${this.API_BASE}/game-scores`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ game_type: gameType, player_name: playerName, score })
      });
      if (!res.ok) throw new Error(await res.text());
      return await res.json();
    } catch (e) {
      console.warn('DB saveScore fallback to localStorage:', e.message);
      return null;
    }
  },

  async getScores(gameType, limit) {
    try {
      const res = await fetch(`${this.API_BASE}/game-scores?game=${encodeURIComponent(gameType)}&limit=${limit || 10}`);
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      return data.scores || [];
    } catch (e) {
      console.warn('DB getScores fallback to localStorage:', e.message);
      return null;
    }
  },

  // ── REVIEWS ──
  async submitReview(playerName, rating, reviewText) {
    try {
      const res = await fetch(`${this.API_BASE}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ player_name: playerName, rating, review_text: reviewText })
      });
      if (!res.ok) throw new Error(await res.text());
      return await res.json();
    } catch (e) {
      console.warn('DB submitReview fallback to localStorage:', e.message);
      return null;
    }
  },

  async getReviews(limit) {
    try {
      const res = await fetch(`${this.API_BASE}/reviews?limit=${limit || 50}`);
      if (!res.ok) throw new Error(await res.text());
      return await res.json();
    } catch (e) {
      console.warn('DB getReviews fallback to localStorage:', e.message);
      return null;
    }
  },

  // ── NEWSLETTER ──
  async subscribe(email, name, interests) {
    try {
      const res = await fetch(`${this.API_BASE}/newsletter-subscribers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name, interests })
      });
      if (!res.ok) throw new Error(await res.text());
      return await res.json();
    } catch (e) {
      console.warn('DB subscribe fallback to localStorage:', e.message);
      return null;
    }
  }
};

// Expose globally so the inline script can use it
window.DB = DB;
