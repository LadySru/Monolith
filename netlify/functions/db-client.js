/* ══════════════════════════════════════════════════════════
   DATABASE API INTEGRATION
   ──────────────────────────────────────────────────────────
   Replaces localStorage with Netlify DB (PostgreSQL via Neon)
   Maintains backward compatibility with existing UI
═══════════════════════════════════════════════════════════ */

const DB = {
  // ── Game Scores API ──
  async saveGameScore(game, name, score) {
    try {
      const response = await fetch('/.netlify/functions/game-scores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ game_type: game, player_name: name, score })
      });

      if (!response.ok) {
        const error = await response.json();
        console.warn('Score save error:', error.error);
        // Fallback to localStorage if DB fails
        return this._fallbackSaveScore(game, name, score);
      }

      const data = await response.json();
      console.log('Score saved to database:', data.data);
      return data.data;
    } catch (error) {
      console.warn('DB error, falling back to localStorage:', error.message);
      return this._fallbackSaveScore(game, name, score);
    }
  },

  async getGameScores(game, limit = 10) {
    try {
      const response = await fetch(`/.netlify/functions/game-scores?game=${game}&limit=${limit}`);

      if (!response.ok) {
        throw new Error('Failed to fetch scores');
      }

      const data = await response.json();
      return data.scores || [];
    } catch (error) {
      console.warn('DB error, using localStorage:', error.message);
      return this._fallbackGetScores(game);
    }
  },

  // ── Reviews API ──
  async submitReview(name, rating, text) {
    try {
      const response = await fetch('/.netlify/functions/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ player_name: name, rating, review_text: text })
      });

      if (!response.ok) {
        const error = await response.json();
        console.warn('Review error:', error.error);
        throw new Error(error.error || 'Failed to submit review');
      }

      const data = await response.json();
      console.log('Review saved:', data.data);
      return data.data;
    } catch (error) {
      console.error('Submit review error:', error.message);
      throw error;
    }
  },

  async getReviews(limit = 50) {
    try {
      const response = await fetch(`/.netlify/functions/reviews?limit=${limit}`);

      if (!response.ok) {
        throw new Error('Failed to fetch reviews');
      }

      const data = await response.json();
      return {
        reviews: data.reviews || [],
        stats: data.stats || { total_reviews: 0, avg_rating: 0 }
      };
    } catch (error) {
      console.warn('Failed to fetch reviews from DB:', error.message);
      return { reviews: [], stats: { total_reviews: 0, avg_rating: 0 } };
    }
  },

  // ── Newsletter API ──
  async subscribeNewsletter(email, name, interests) {
    try {
      const response = await fetch('/.netlify/functions/newsletter-subscribers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name, interests })
      });

      if (!response.ok) {
        const error = await response.json();
        console.warn('Subscribe error:', error.error);
        throw new Error(error.error || 'Failed to subscribe');
      }

      const data = await response.json();
      console.log('Newsletter subscription saved:', data.data);
      return data.data;
    } catch (error) {
      console.error('Newsletter subscribe error:', error.message);
      throw error;
    }
  },

  // ── Fallback to localStorage (if DB unavailable) ──
  _fallbackSaveScore(game, name, score) {
    const key = 'ms_sb_' + game;
    try {
      const list = JSON.parse(localStorage.getItem(key) || '[]');
      const date = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      list.push({ name, score, date });
      list.sort((a, b) => b.score - a.score);
      const trimmed = list.slice(0, 10);
      localStorage.setItem(key, JSON.stringify(trimmed));
      return { name, score, date };
    } catch (e) {
      console.warn('Fallback save failed:', e);
      return null;
    }
  },

  _fallbackGetScores(game) {
    try {
      return JSON.parse(localStorage.getItem('ms_sb_' + game) || '[]');
    } catch (e) {
      return [];
    }
  }
};

// Export for use in main script
if (typeof module !== 'undefined' && module.exports) {
  module.exports = DB;
}
