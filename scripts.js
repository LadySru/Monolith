/* ═══════ Monolith Social — scripts.js ═══════ */

/* ── Custom cursor ── */
(function () {
  const cur = document.getElementById('cur');
  if (!cur) return;
  document.addEventListener('mousemove', function (e) {
    cur.style.left = e.clientX + 'px';
    cur.style.top = e.clientY + 'px';
  });
  document.addEventListener('mouseenter', function () { cur.style.opacity = '1'; });
  document.addEventListener('mouseleave', function () { cur.style.opacity = '0'; });
})();

/* ── Mobile hamburger ── */
(function () {
  var btn = document.querySelector('.nav-hamburger');
  var mob = document.querySelector('.nav-mobile');
  if (btn && mob) {
    btn.addEventListener('click', function () { mob.classList.toggle('open'); });
  }
})();

/* ── Reveal on scroll ── */
(function () {
  var els = document.querySelectorAll('.reveal');
  if (!els.length) return;
  var obs = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) { if (e.isIntersecting) e.target.classList.add('in'); });
  }, { threshold: 0.1 });
  els.forEach(function (el) { obs.observe(el); });
})();

/* ── Smooth scroll for anchor links ── */
document.querySelectorAll('a[href^="#"]').forEach(function (a) {
  a.addEventListener('click', function (e) {
    var t = document.querySelector(this.getAttribute('href'));
    if (t) { e.preventDefault(); t.scrollIntoView({ behavior: 'smooth' }); }
  });
});


/* ═══════════════════════════════════════
   REVIEWS — load from neon.db via API
   ═══════════════════════════════════════ */
(function () {
  var grid = document.getElementById('reviewsGrid');
  var avgEl = document.getElementById('reviewsAvg');
  var starsEl = document.getElementById('reviewsAvgStars');
  var countEl = document.getElementById('reviewsCount');

  function stars(n) {
    var s = '';
    for (var i = 1; i <= 5; i++) s += i <= n ? '★' : '☆';
    return s;
  }

  function timeAgo(d) {
    var diff = Date.now() - new Date(d).getTime();
    var m = Math.floor(diff / 60000);
    if (m < 60) return m + 'm ago';
    var h = Math.floor(m / 60);
    if (h < 24) return h + 'h ago';
    var days = Math.floor(h / 24);
    if (days < 30) return days + 'd ago';
    return Math.floor(days / 30) + 'mo ago';
  }

  function renderReviews(data) {
    var reviews = data.reviews || [];
    var st = data.stats || {};

    // Summary
    avgEl.textContent = st.avg_rating || '—';
    starsEl.innerHTML = stars(Math.round(st.avg_rating || 0));
    countEl.textContent = 'Based on ' + (st.total_reviews || 0) + ' reviews';

    // Bars
    var total = parseInt(st.total_reviews) || 1;
    for (var i = 1; i <= 5; i++) {
      var key = ['one', 'two', 'three', 'four', 'five'][i - 1] + '_star';
      var cnt = parseInt(st[key]) || 0;
      var barEl = document.getElementById('bar' + i);
      var numEl = document.getElementById('num' + i);
      if (barEl) barEl.style.width = Math.round(cnt / total * 100) + '%';
      if (numEl) numEl.textContent = cnt;
    }

    // Cards
    if (!reviews.length) {
      grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;font-family:\'Orbitron\',monospace;font-size:.6rem;color:var(--text3);letter-spacing:2px;padding:40px 0;">No reviews yet — be the first!</div>';
      return;
    }
    grid.innerHTML = '';
    reviews.forEach(function (r) {
      var initials = (r.player_name || 'A').split(' ').map(function (w) { return w[0]; }).join('').toUpperCase().slice(0, 2);
      var card = document.createElement('div');
      card.className = 'review-card';
      card.innerHTML =
        '<div class="review-top"><div class="review-av">' + initials + '</div><div>' +
        '<div class="review-name">' + (r.player_name || 'Anonymous') + '</div>' +
        '<div class="review-date">' + timeAgo(r.created_at) + '</div></div></div>' +
        '<div class="review-stars">' + stars(r.rating) + '</div>' +
        '<div class="review-text">"' + (r.review_text || '') + '"</div>';
      grid.appendChild(card);
    });
  }

  fetch('/.netlify/functions/reviews?limit=30')
    .then(function (r) { return r.json(); })
    .then(renderReviews)
    .catch(function () {
      if (grid) grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;font-family:\'Orbitron\',monospace;font-size:.6rem;color:var(--text3);letter-spacing:2px;padding:40px 0;">Could not load reviews.</div>';
    });

  // Submit form
  var submitBtn = document.getElementById('submitReview');
  if (submitBtn) {
    var pickerBtns = document.querySelectorAll('.star-btn');
    var selectedRating = 0;
    pickerBtns.forEach(function (b) {
      b.addEventListener('click', function () {
        selectedRating = parseInt(this.dataset.value);
        pickerBtns.forEach(function (bb, i) {
          bb.classList.toggle('active', i < selectedRating);
        });
      });
    });

    submitBtn.addEventListener('click', function () {
      var name = document.getElementById('name').value.trim();
      var text = document.getElementById('review').value.trim();
      var errEl = document.querySelector('.form-error');
      var okEl = document.querySelector('.form-success');
      errEl.style.display = 'none';
      okEl.style.display = 'none';

      if (!name || !text || !selectedRating) {
        errEl.textContent = 'Please fill in all fields and select a rating.';
        errEl.style.display = 'block';
        return;
      }

      fetch('/.netlify/functions/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ player_name: name, rating: selectedRating, review_text: text })
      })
        .then(function (r) {
          if (!r.ok) throw new Error('fail');
          return r.json();
        })
        .then(function () {
          okEl.style.display = 'block';
          document.getElementById('name').value = '';
          document.getElementById('review').value = '';
          selectedRating = 0;
          pickerBtns.forEach(function (b) { b.classList.remove('active'); });
          // Refresh reviews
          fetch('/.netlify/functions/reviews?limit=30').then(function (r) { return r.json(); }).then(renderReviews);
        })
        .catch(function () {
          errEl.textContent = 'Error submitting review. Please try again.';
          errEl.style.display = 'block';
        });
    });
  }
})();


/* ═══════════════════════════════════════
   SCOREBOARD — load from neon.db
   ═══════════════════════════════════════ */
var Scoreboard = {
  el: document.getElementById('snakeScoreboard'),
  scores: [],

  load: function () {
    var self = this;
    fetch('/.netlify/functions/game-scores?game=snake&limit=10')
      .then(function (r) { return r.json(); })
      .then(function (data) {
        self.scores = data.scores || [];
        self.render();
      })
      .catch(function () { self.render(); });
  },

  render: function () {
    if (!this.el) return;
    var html = '<div class="sb-title">🏆 Top Scores</div>';
    if (!this.scores.length) {
      html += '<div class="sb-empty">No scores yet — play to be first!</div>';
    } else {
      this.scores.forEach(function (s, i) {
        var rc = i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : 'other';
        html += '<div class="sb-row">' +
          '<span class="sb-rank ' + rc + '">#' + (i + 1) + '</span>' +
          '<span class="sb-name">' + (s.player_name || 'Anon') + '</span>' +
          '<span class="sb-score">' + s.score + '</span></div>';
      });
    }
    this.el.innerHTML = html;
  },

  save: function (name, score, cb) {
    fetch('/.netlify/functions/game-scores', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ game_type: 'snake', player_name: name, score: score })
    })
      .then(function (r) { return r.json(); })
      .then(function () {
        Scoreboard.load();
        if (cb) cb(true);
      })
      .catch(function () { if (cb) cb(false); });
  }
};

Scoreboard.load();


/* ═══════════════════════════════════════
   SNAKE GAME
   ═══════════════════════════════════════ */
(function () {
  var canvas = document.getElementById('snakeCanvas');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');
  var overlay = document.getElementById('snakeOverlay');
  var startBtn = document.getElementById('snakeStart');
  var scoreEl = document.getElementById('snakeScore');
  var titleEl = document.getElementById('snakeOverlayTitle');
  var subEl = document.getElementById('snakeOverlaySub');
  var nameEntry = document.getElementById('snakeNameEntry');
  var nameInput = document.getElementById('snakeNameInput');
  var nameSave = document.getElementById('snakeNameSave');
  var savedEl = document.getElementById('snakeSaved');

  var CELL = 20;
  var COLS = 20;
  var ROWS = 20;
  canvas.width = COLS * CELL;
  canvas.height = ROWS * CELL;

  var snake, dir, nextDir, food, score, alive, interval;

  function init() {
    snake = [{ x: 10, y: 10 }, { x: 9, y: 10 }, { x: 8, y: 10 }];
    dir = { x: 1, y: 0 };
    nextDir = { x: 1, y: 0 };
    score = 0;
    alive = true;
    scoreEl.textContent = '0';
    placeFood();
  }

  function placeFood() {
    do {
      food = { x: Math.floor(Math.random() * COLS), y: Math.floor(Math.random() * ROWS) };
    } while (snake.some(function (s) { return s.x === food.x && s.y === food.y; }));
  }

  function draw() {
    ctx.fillStyle = '#020108';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Grid lines
    ctx.strokeStyle = 'rgba(0,255,231,0.04)';
    ctx.lineWidth = 0.5;
    for (var i = 0; i <= COLS; i++) {
      ctx.beginPath(); ctx.moveTo(i * CELL, 0); ctx.lineTo(i * CELL, canvas.height); ctx.stroke();
    }
    for (var j = 0; j <= ROWS; j++) {
      ctx.beginPath(); ctx.moveTo(0, j * CELL); ctx.lineTo(canvas.width, j * CELL); ctx.stroke();
    }

    // Food
    ctx.fillStyle = '#ff2d6b';
    ctx.shadowColor = '#ff2d6b';
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(food.x * CELL + CELL / 2, food.y * CELL + CELL / 2, CELL / 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Snake
    snake.forEach(function (s, i) {
      var alpha = 1 - i * 0.03;
      if (alpha < 0.3) alpha = 0.3;
      ctx.fillStyle = i === 0 ? '#00ffe7' : 'rgba(0,255,231,' + alpha + ')';
      ctx.shadowColor = i === 0 ? '#00ffe7' : 'transparent';
      ctx.shadowBlur = i === 0 ? 8 : 0;
      ctx.fillRect(s.x * CELL + 1, s.y * CELL + 1, CELL - 2, CELL - 2);
    });
    ctx.shadowBlur = 0;
  }

  function tick() {
    if (!alive) return;
    dir = nextDir;
    var head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };

    // Wall collision
    if (head.x < 0 || head.x >= COLS || head.y < 0 || head.y >= ROWS) { gameOver(); return; }
    // Self collision
    if (snake.some(function (s) { return s.x === head.x && s.y === head.y; })) { gameOver(); return; }

    snake.unshift(head);
    if (head.x === food.x && head.y === food.y) {
      score++;
      scoreEl.textContent = score;
      placeFood();
    } else {
      snake.pop();
    }
    draw();
  }

  function gameOver() {
    alive = false;
    clearInterval(interval);
    titleEl.textContent = 'Game Over!';
    subEl.textContent = 'Score: ' + score;
    startBtn.textContent = 'Play Again';
    nameEntry.style.display = 'flex';
    savedEl.style.display = 'none';
    nameInput.value = '';
    overlay.style.display = '';
  }

  function start() {
    overlay.style.display = 'none';
    nameEntry.style.display = 'none';
    savedEl.style.display = 'none';
    init();
    draw();
    clearInterval(interval);
    interval = setInterval(tick, 120);
  }

  startBtn.addEventListener('click', start);

  // Save score
  nameSave.addEventListener('click', function () {
    var name = nameInput.value.trim();
    if (!name) { nameInput.focus(); return; }
    nameSave.textContent = 'Saving…';
    Scoreboard.save(name, score, function (ok) {
      nameSave.textContent = 'Save Score';
      if (ok) {
        nameEntry.style.display = 'none';
        savedEl.style.display = 'block';
      }
    });
  });

  // Keyboard controls
  document.addEventListener('keydown', function (e) {
    var map = {
      ArrowUp: { x: 0, y: -1 }, ArrowDown: { x: 0, y: 1 },
      ArrowLeft: { x: -1, y: 0 }, ArrowRight: { x: 1, y: 0 },
      w: { x: 0, y: -1 }, s: { x: 0, y: 1 },
      a: { x: -1, y: 0 }, d: { x: 1, y: 0 },
      W: { x: 0, y: -1 }, S: { x: 0, y: 1 },
      A: { x: -1, y: 0 }, D: { x: 1, y: 0 }
    };
    var nd = map[e.key];
    if (nd && alive) {
      if (nd.x !== -dir.x || nd.y !== -dir.y) {
        nextDir = nd;
      }
      e.preventDefault();
    }
    // Space/Enter to start
    if ((e.key === ' ' || e.key === 'Enter') && overlay.style.display !== 'none') {
      start();
      e.preventDefault();
    }
  });

  // D-pad (mobile)
  document.querySelectorAll('.dpad-btn').forEach(function (b) {
    b.addEventListener('click', function () {
      var d = this.dataset.dir;
      var map = { up: { x: 0, y: -1 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 } };
      var nd = map[d];
      if (nd && alive && (nd.x !== -dir.x || nd.y !== -dir.y)) {
        nextDir = nd;
      }
    });
  });

  // Initial draw
  init();
  draw();
})();
