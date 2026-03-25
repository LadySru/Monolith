/* ══════════════════════════════════════════════════════════
   DATABASE INTEGRATION - Main Script
   ──────────────────────────────────────────────────────────
   Add this script to index.html before the main game scripts
   Replaces localStorage calls with DB API calls
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
        return this._fallbackSaveScore(game, name, score);
      }

      const data = await response.json();
      console.log('✓ Score saved to database');
      return data.data;
    } catch (error) {
      console.warn('DB unavailable, using localStorage:', error.message);
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
      console.log(`✓ Loaded ${game} scores from database`);
      return data.scores || [];
    } catch (error) {
      console.warn('DB unavailable, using localStorage:', error.message);
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
        throw new Error(error.error || 'Failed to submit review');
      }

      const data = await response.json();
      console.log('✓ Review saved to database');
      return data.data;
    } catch (error) {
      console.error('Review submit error:', error.message);
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
      console.log('✓ Loaded reviews from database');
      return {
        reviews: data.reviews || [],
        stats: data.stats || { total_reviews: 0, avg_rating: 0 }
      };
    } catch (error) {
      console.warn('DB unavailable, showing empty reviews:', error.message);
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
        throw new Error(error.error || 'Failed to subscribe');
      }

      const data = await response.json();
      console.log('✓ Newsletter subscription saved to database');
      return data.data;
    } catch (error) {
      console.error('Newsletter error:', error.message);
      throw error;
    }
  },

  // ── Fallback to localStorage ──
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

/* ══════════════════════════════════════════════════════════
   PATCH: Replace existing save functions
═══════════════════════════════════════════════════════════ */

// Patch the existing scoreboard system to use DB
const originalSaveSnakeScore = window.saveSnakeScore;
window.saveSnakeScore = async function() {
  const nameEl = document.getElementById('snake-name-input');
  const name = nameEl.value.trim() || 'Anonymous';
  const score = window.snakeScore || 0;

  try {
    await DB.saveGameScore('snake', name, score);
    // Refresh leaderboard
    const scores = await DB.getGameScores('snake', 10);
    renderSnakeSB(scores);
    document.getElementById('snake-score-saved').style.display = 'block';
    nameEl.disabled = true;
    document.querySelector('#snake-gameover .sb-save').disabled = true;
  } catch (error) {
    console.error('Failed to save score:', error);
    alert('Error saving score. Try again.');
  }
};

// Patch silhouette score save
const originalSaveSilScore = window.saveSilScore;
window.saveSilScore = async function() {
  const nameEl = document.getElementById('sil-name-input');
  const name = nameEl.value.trim() || 'Anonymous';
  const score = window.silScore || 0;

  try {
    await DB.saveGameScore('silhouette', name, score);
    // Refresh leaderboard
    const scores = await DB.getGameScores('silhouette', 10);
    renderSilhouetteSB(scores);
    document.getElementById('sil-score-saved').style.display = 'block';
    nameEl.disabled = true;
    document.querySelector('#sil-result .sb-save').disabled = true;
  } catch (error) {
    console.error('Failed to save score:', error);
    alert('Error saving score. Try again.');
  }
};

// Patch quiz score save
const originalSaveQuizScore = window.saveQuizScore;
window.saveQuizScore = async function() {
  const nameEl = document.getElementById('quiz-name-input');
  const name = nameEl.value.trim() || 'Anonymous';
  const score = qScore || 0;

  try {
    await DB.saveGameScore('quiz', name, score);
    // Refresh leaderboard
    const scores = await DB.getGameScores('quiz', 10);
    renderQuizSB(scores);
    document.getElementById('quiz-score-saved').style.display = 'block';
    nameEl.disabled = true;
    document.querySelector('#quiz-result .sb-save').disabled = true;
  } catch (error) {
    console.error('Failed to save score:', error);
    alert('Error saving score. Try again.');
  }
};

// Patch review submission
const originalSubmitReview = window.submitReview;
window.submitReview = async function() {
  const nameEl = document.getElementById('rv-name');
  const textEl = document.getElementById('rv-text');
  const nameErr = document.getElementById('rv-name-err');
  const textErr = document.getElementById('rv-text-err');
  const success = document.getElementById('rv-success');

  let valid = true;
  nameErr.style.display = 'none';
  textErr.style.display = 'none';
  success.style.display = 'none';

  const name = nameEl.value.trim();
  const text = textEl.value.trim();
  const LINK_PATTERN = /(https?:\/\/|www\.|\.com|\.gg|\.net|\.org|discord\.gg)/i;

  if (!name || LINK_PATTERN.test(name)) {
    nameErr.style.display = 'block';
    valid = false;
  }
  if (!text || LINK_PATTERN.test(text) || text.length < 10) {
    textErr.textContent = text.length < 10 ? 'Please write at least 10 characters.' : 'Links not allowed.';
    textErr.style.display = 'block';
    valid = false;
  }
  if (selectedStars === 0) {
    alert('Please select a star rating.');
    valid = false;
  }

  if (!valid) return;

  try {
    const review = await DB.submitReview(name, selectedStars, text);
    
    // Refresh reviews display
    const { reviews, stats } = await DB.getReviews(50);
    renderAllReviewsFromDB(reviews, stats);

    nameEl.value = '';
    textEl.value = '';
    selectedStars = 0;
    document.querySelectorAll('.star-btn').forEach(b => b.classList.remove('active'));
    success.style.display = 'block';
    
    const card = document.querySelector('#reviews-grid > :first-child');
    if (card) card.scrollIntoView({ behavior: 'smooth', block: 'center' });
  } catch (error) {
    alert('Error submitting review: ' + error.message);
  }
};

// Patch newsletter subscription
const originalSubscribeNewsletter = window.subscribeNewsletter;
window.subscribeNewsletter = async function() {
  const emailEl = document.getElementById('nl-email');
  const nameEl = document.getElementById('nl-name');
  const successEl = document.getElementById('nl-success');
  const errorEl = document.getElementById('nl-error');

  errorEl.style.display = 'none';
  successEl.style.display = 'none';

  const email = emailEl.value.trim();
  const name = nameEl.value.trim() || 'Subscriber';

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errorEl.textContent = '✗ Please enter a valid email address.';
    errorEl.style.display = 'block';
    emailEl.style.borderColor = 'var(--red)';
    setTimeout(() => emailEl.style.borderColor = '', 1500);
    return;
  }

  const interests = [...document.querySelectorAll('.nl-tag input:checked')].map(el => el.value);

  try {
    const result = await DB.subscribeNewsletter(email, name, interests);
    successEl.style.display = 'block';
    emailEl.value = '';
    nameEl.value = '';
    const btn = document.querySelector('.nl-btn');
    if (btn) btn.textContent = '✓ Subscribed';
  } catch (error) {
    errorEl.textContent = '✗ ' + error.message;
    errorEl.style.display = 'block';
  }
};

/* ══════════════════════════════════════════════════════════
   LOAD INITIAL DATA FROM DATABASE
═══════════════════════════════════════════════════════════ */

async function initializeDatabaseUI() {
  try {
    // Load all leaderboards
    const snakeScores = await DB.getGameScores('snake', 10);
    const silScores = await DB.getGameScores('silhouette', 10);
    const quizScores = await DB.getGameScores('quiz', 10);

    // Render scoreboards
    if (snakeScores.length) {
      const sb = { snake: snakeScores, silhouette: silScores, quiz: quizScores };
      renderLeaderboards(sb);
    }

    // Load reviews and stats
    const { reviews, stats } = await DB.getReviews(50);
    if (reviews.length) {
      renderAllReviewsFromDB(reviews, stats);
    }

    console.log('✓ Database UI initialized');
  } catch (error) {
    console.warn('Failed to initialize DB UI:', error.message);
  }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(initializeDatabaseUI, 500); // Slight delay to ensure DOM is ready
});

/* ══════════════════════════════════════════════════════════
   RENDER FUNCTIONS
═══════════════════════════════════════════════════════════ */

function renderLeaderboards(scoreboards) {
  // Render snake leaderboard
  const snakeBody = document.getElementById('global-sb-body');
  if (snakeBody && scoreboards.snake) {
    renderScoreboard(scoreboards.snake, snakeBody);
  }

  // Render silhouette leaderboard
  if (scoreboards.silhouette) {
    renderScoreboard(scoreboards.silhouette, snakeBody);
  }

  // Render quiz leaderboard
  const quizBody = document.getElementById('global-sb-body-quiz');
  if (quizBody && scoreboards.quiz) {
    renderScoreboard(scoreboards.quiz, quizBody);
  }
}

function renderScoreboard(scores, container) {
  if (!scores || !scores.length) {
    container.innerHTML = '<div class="sb-empty">No scores yet — be the first!</div>';
    return;
  }

  const medals = ['🥇', '🥈', '🥉'];
  const html = scores.map((s, i) => `
    <div class="sb-row">
      <span class="sb-rank">${medals[i] || `#${i+1}`}</span>
      <span class="sb-name">${s.player_name}</span>
      <span class="sb-score">${s.score}</span>
    </div>
  `).join('');

  container.innerHTML = html;
}

function renderSnakeSB(scores) {
  const body = document.getElementById('global-sb-body');
  if (body) renderScoreboard(scores, body);
}

function renderSilhouetteSB(scores) {
  const body = document.getElementById('global-sb-body');
  if (body) renderScoreboard(scores, body);
}

function renderQuizSB(scores) {
  const body = document.getElementById('global-sb-body-quiz');
  if (body) renderScoreboard(scores, body);
}

function renderAllReviewsFromDB(reviews, stats) {
  const grid = document.getElementById('reviews-grid');
  if (!grid) return;

  grid.innerHTML = '';

  if (!reviews.length) {
    grid.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text2);">No reviews yet. Be the first!</div>';
    updateReviewSummary([]);
    return;
  }

  reviews.forEach(r => {
    const card = document.createElement('div');
    card.className = 'review-card';
    const stars = '★'.repeat(r.rating) + '☆'.repeat(5 - r.rating);
    const colors = ['#0df2d4', '#f5c842', '#ff4d6d', '#3ddc84', '#9997a0'];
    const color = colors[r.player_name.charCodeAt(0) % colors.length];

    card.innerHTML = `
      <div class="review-top">
        <div class="review-av" style="background:var(--card2);color:${color};">${r.player_name[0].toUpperCase()}</div>
        <div>
          <div class="review-name">${r.player_name}</div>
          <div class="review-date">${new Date(r.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
        </div>
      </div>
      <div class="review-stars" style="color:var(--star);">${stars}</div>
      <div class="review-text">${r.review_text}</div>
    `;
    grid.appendChild(card);
  });

  // Update summary stats
  const total = stats.total_reviews || 0;
  if (total > 0) {
    const avg = parseFloat(stats.avg_rating || 0).toFixed(1);
    document.querySelector('.reviews-big').textContent = avg;
    const filled = Math.round(parseFloat(avg));
    document.querySelector('.reviews-stars').textContent = '★'.repeat(filled) + '☆'.repeat(5 - filled);
    document.querySelector('.reviews-stars').style.color = 'var(--star)';
    document.querySelector('.reviews-count').textContent = total + (total === 1 ? ' REVIEW' : ' REVIEWS');

    const fills = document.querySelectorAll('.bar-fill');
    const nums = document.querySelectorAll('.bar-num');
    const counts = {
      5: stats.five_star || 0,
      4: stats.four_star || 0,
      3: stats.three_star || 0,
      2: stats.two_star || 0,
      1: stats.one_star || 0
    };

    for (let i = 0; i < 5; i++) {
      const idx = 5 - i;
      const pct = Math.round((counts[idx] / total) * 100);
      fills[i].style.width = pct + '%';
      nums[i].textContent = counts[idx];
    }
  }
}
