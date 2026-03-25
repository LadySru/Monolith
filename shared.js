/* ═══════ MONOLITH SOCIAL — SHARED JS ═══════ */

/* ── CURSOR ── */
const cur = document.getElementById('cur');
if (cur) {
  document.addEventListener('mousemove', e => { cur.style.left=e.clientX+'px'; cur.style.top=e.clientY+'px'; });
  document.querySelectorAll('a,button,.game-card,.feat,.inside-card,.seal,.review-card,.arc-box').forEach(el => {
    el.addEventListener('mouseenter', () => cur.classList.add('big'));
    el.addEventListener('mouseleave', () => cur.classList.remove('big'));
  });
}

/* ── HAMBURGER ── */
const hamburger = document.getElementById('nav-hamburger');
const mobileNav = document.getElementById('nav-mobile');
if (hamburger && mobileNav) {
  hamburger.addEventListener('click', () => mobileNav.classList.toggle('open'));
  document.addEventListener('click', e => {
    if (!hamburger.contains(e.target) && !mobileNav.contains(e.target)) mobileNav.classList.remove('open');
  });
}

/* ── SCROLL REVEAL ── */
const revealObs = new IntersectionObserver(entries => {
  entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('in'); });
}, { threshold: 0.07 });
document.querySelectorAll('.reveal').forEach((el, i) => {
  el.style.transitionDelay = (i % 5) * 0.07 + 's';
  revealObs.observe(el);
});

/* ══════════════════════════════════
   SUPABASE CONFIG
   ─────────────────────────────────
   To make scores & reviews GLOBAL (visible to ALL visitors):

   1. Go to https://supabase.com → Sign up free → New project
   2. Go to Project Settings → API
   3. Copy your Project URL and anon/public key
   4. Paste them below replacing the empty strings
   5. Run this SQL in Supabase SQL Editor:

   CREATE TABLE scores (
     id BIGSERIAL PRIMARY KEY,
     game TEXT NOT NULL,
     name TEXT NOT NULL,
     score INTEGER NOT NULL,
     date TEXT,
     created_at TIMESTAMPTZ DEFAULT NOW()
   );
   CREATE TABLE reviews (
     id BIGSERIAL PRIMARY KEY,
     name TEXT NOT NULL,
     text TEXT NOT NULL,
     stars INTEGER NOT NULL,
     date TEXT,
     created_at TIMESTAMPTZ DEFAULT NOW()
   );
   ALTER TABLE scores ENABLE ROW LEVEL SECURITY;
   ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
   CREATE POLICY "Public read scores" ON scores FOR SELECT USING (true);
   CREATE POLICY "Public insert scores" ON scores FOR INSERT WITH CHECK (true);
   CREATE POLICY "Public read reviews" ON reviews FOR SELECT USING (true);
   CREATE POLICY "Public insert reviews" ON reviews FOR INSERT WITH CHECK (true);

   Once pasted, all scores and reviews will be shared globally!
══════════════════════════════════ */
const SUPABASE_URL = ''; // e.g. 'https://xyzxyz.supabase.co'
const SUPABASE_KEY = ''; // e.g. 'eyJhbGciOiJIUzI1NiIsInR5...'
const USE_SUPABASE  = SUPABASE_URL !== '' && SUPABASE_KEY !== '';

/* ── DB LAYER (Supabase if configured, localStorage fallback) ── */
const DB = {
  async getScores(game) {
    if (USE_SUPABASE) {
      try {
        const res = await fetch(
          `${SUPABASE_URL}/rest/v1/scores?game=eq.${encodeURIComponent(game)}&order=score.desc&limit=10`,
          { headers: { apikey: SUPABASE_KEY, Authorization: 'Bearer ' + SUPABASE_KEY } }
        );
        if (res.ok) return await res.json();
      } catch(e) {}
    }
    return this._local('ms_sb_' + game);
  },

  async addScore(game, name, score) {
    const date = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    // Always mirror to localStorage
    try {
      const local = this._local('ms_sb_' + game);
      local.push({ game, name, score, date });
      local.sort((a,b) => b.score - a.score);
      localStorage.setItem('ms_sb_' + game, JSON.stringify(local.slice(0, 10)));
    } catch(e) {}

    if (USE_SUPABASE) {
      try {
        await fetch(`${SUPABASE_URL}/rest/v1/scores`, {
          method: 'POST',
          headers: {
            apikey: SUPABASE_KEY,
            Authorization: 'Bearer ' + SUPABASE_KEY,
            'Content-Type': 'application/json',
            Prefer: 'return=minimal'
          },
          body: JSON.stringify({ game, name, score, date })
        });
      } catch(e) {}
    }
    return this.getScores(game);
  },

  async getReviews() {
    if (USE_SUPABASE) {
      try {
        const res = await fetch(
          `${SUPABASE_URL}/rest/v1/reviews?order=created_at.desc&limit=50`,
          { headers: { apikey: SUPABASE_KEY, Authorization: 'Bearer ' + SUPABASE_KEY } }
        );
        if (res.ok) return await res.json();
      } catch(e) {}
    }
    return this._localReviews();
  },

  async addReview(name, text, stars) {
    const date = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    // Mirror to localStorage
    try {
      const local = this._localReviews();
      local.push({ name, text, stars, date });
      localStorage.setItem('ms_reviews', JSON.stringify(local));
    } catch(e) {}

    if (USE_SUPABASE) {
      try {
        await fetch(`${SUPABASE_URL}/rest/v1/reviews`, {
          method: 'POST',
          headers: {
            apikey: SUPABASE_KEY,
            Authorization: 'Bearer ' + SUPABASE_KEY,
            'Content-Type': 'application/json',
            Prefer: 'return=minimal'
          },
          body: JSON.stringify({ name, text, stars, date })
        });
      } catch(e) {}
    }
    return this.getReviews();
  },

  _local(key) {
    try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch(e) { return []; }
  },
  _localReviews() {
    try { return JSON.parse(localStorage.getItem('ms_reviews') || '[]'); } catch(e) { return []; }
  }
};

/* ── SCOREBOARD RENDERER ── */
const SB = {
  _medals: ['gold','silver','bronze'],
  _label(i) { return i===0?'🥇':i===1?'🥈':i===2?'🥉':'#'+(i+1); },
  _clean(n) { return (n||'Anonymous').trim().replace(/[<>"'&]/g,'').slice(0,16)||'Anonymous'; },

  render(list, containerId, highlightName, highlightScore) {
    const el = document.getElementById(containerId);
    if (!el) return;
    if (!list || !list.length) {
      el.innerHTML = '<div class="sb-empty">No scores yet — be the first!</div>';
      return;
    }
    el.innerHTML = list.slice(0,10).map((s,i) => {
      const isYou = s.name === highlightName && s.score === highlightScore;
      return '<div class="sb-row">'
        + '<span class="sb-rank ' + (this._medals[i]||'other') + '">' + this._label(i) + '</span>'
        + '<span class="sb-name' + (isYou?' you':'') + '">' + s.name + (isYou?' <span class="sb-new">YOU</span>':'') + '</span>'
        + '<span class="sb-score">' + s.score + '</span>'
        + '<span style="font-family:Orbitron,monospace;font-size:.46rem;color:var(--text3);margin-left:4px;">' + (s.date||'') + '</span>'
        + '</div>';
    }).join('');
  },

  async load(game, containerId) {
    const list = await DB.getScores(game);
    this.render(list, containerId, null, null);
    return list;
  },

  async save(game, rawName, score, ...containerIds) {
    const name = this._clean(rawName);
    const list = await DB.addScore(game, name, score);
    const targets = [...containerIds, 'global-sb-body', 'global-sb-body-quiz'];
    targets.forEach(id => { if (id) this.render(list, id, name, score); });
    return list;
  }
};

/* ── GLOBAL SB TAB SWITCHER ── */
let activeSBKey = 'snake';
async function switchSB(key) {
  activeSBKey = key;
  document.querySelectorAll('.gsb-tab').forEach(t => {
    t.classList.toggle('active',
      (key==='snake'&&t.textContent.includes('Snake')) ||
      (key==='silhouette'&&t.textContent.includes('Guesser')) ||
      (key==='quiz'&&(t.textContent.includes('Quiz')||t.textContent.includes('Quiz')))
    );
  });
  const list = await DB.getScores(key);
  ['global-sb-body','global-sb-body-quiz'].forEach(id => SB.render(list, id, null, null));
}

/* ── SEASONAL PARTICLES (GPU-optimised) ── */
(function(){
  const canvas = document.getElementById('seasons-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const badge = document.getElementById('season-badge');
  const month = new Date().getMonth();
  const SEASON = month>=2&&month<=4?'spring':month>=5&&month<=7?'summer':month>=8&&month<=10?'autumn':'winter';
  const CONFIGS = {
    spring:{label:'🌸 Spring',count:24,color:['#ffb7c5','#ff8fab','#ffd6e0','#ff6b9d']},
    summer:{label:'✨ Summer',count:26,color:['#ffd700','#fff9c4','#0df2d4','#ffffff']},
    autumn:{label:'🍂 Autumn',count:20,color:['#e8651a','#c0392b','#f39c12','#d4a017']},
    winter:{label:'❄️ Winter',count:28,color:['#e0f7ff','#b3e5fc','#ffffff','#cce5ff']},
  };
  const cfg = CONFIGS[SEASON];
  if (badge) badge.innerHTML = cfg.label;
  let W=window.innerWidth, H=window.innerHeight, particles=[], hidden=false, lastTime=0;
  let resizeTimer;
  function resize(){W=canvas.width=window.innerWidth;H=canvas.height=window.innerHeight;}
  window.addEventListener('resize',()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(resize,200);});
  resize();
  document.addEventListener('visibilitychange',()=>{hidden=document.hidden;});
  function makeParticle(){
    const color=cfg.color[Math.floor(Math.random()*cfg.color.length)];
    const p={x:Math.random()*W,y:-20-Math.random()*80,color,alpha:.3+Math.random()*.45,size:2+Math.random()*4,speedY:.5+Math.random()*1,speedX:(Math.random()-.5)*.5,wobble:Math.random()*Math.PI*2,wobbleSpeed:.015+Math.random()*.02,rotation:Math.random()*Math.PI*2,rotSpeed:(Math.random()-.5)*.03};
    if(SEASON==='summer'){p.size=1.5+Math.random()*2;p.speedY=-.08-Math.random()*.3;p.y=Math.random()*H;p.pulse=Math.random()*Math.PI*2;p.pulseSpeed=.04+Math.random()*.04;}
    if(SEASON==='winter'){p.size=1.5+Math.random()*3;p.speedY=.5+Math.random()*1.2;}
    return p;
  }
  for(let i=0;i<cfg.count;i++){const p=makeParticle();p.y=Math.random()*H;particles.push(p);}
  function animate(ts){
    requestAnimationFrame(animate);
    if(hidden||ts-lastTime<1000/30)return;
    lastTime=ts;
    ctx.clearRect(0,0,W,H);
    for(let i=0;i<particles.length;i++){
      const p=particles[i];
      p.wobble+=p.wobbleSpeed;p.rotation+=p.rotSpeed;p.x+=p.speedX+Math.sin(p.wobble)*.4;p.y+=p.speedY;
      if(SEASON==='summer'){if(p.y<-20){p.y=H+10;p.x=Math.random()*W;}}
      else{if(p.y>H+20){Object.assign(p,makeParticle());p.y=-10;}if(p.x<-20)p.x=W+20;if(p.x>W+20)p.x=-20;}
      ctx.globalAlpha=p.alpha;
      if(SEASON==='spring'||SEASON==='autumn'){ctx.fillStyle=p.color;ctx.beginPath();ctx.ellipse(p.x,p.y,p.size,p.size*.5,p.rotation,0,Math.PI*2);ctx.fill();}
      else if(SEASON==='summer'){p.pulse+=p.pulseSpeed;ctx.globalAlpha=.25+Math.sin(p.pulse)*.25;ctx.fillStyle=p.color;ctx.beginPath();ctx.arc(p.x,p.y,p.size,0,Math.PI*2);ctx.fill();}
      else{ctx.strokeStyle=p.color;ctx.lineWidth=.8;ctx.beginPath();ctx.moveTo(p.x-p.size,p.y);ctx.lineTo(p.x+p.size,p.y);ctx.moveTo(p.x,p.y-p.size);ctx.lineTo(p.x,p.y+p.size);ctx.stroke();}
    }
    ctx.globalAlpha=1;
  }
  requestAnimationFrame(animate);
})();
