/* ── GAME TAB SWITCH ── */
function switchTab(id) {
  document.querySelectorAll('.game-tab').forEach(t => {
    t.classList.toggle('active', t.dataset.game === id);
  });
  document.querySelectorAll('.game-panel').forEach(p => p.classList.remove('active'));
  document.getElementById('panel-' + id).classList.add('active');
  if (id !== 'snake' && window.snakePause) snakePause();
  if (id !== 'tap' && window.stopTapGame) stopTapGame();
  switchSB(id);
}

/* ── NEON SNAKE ── */
(function(){
  const C=document.getElementById('snakeCanvas'), ctx=C.getContext('2d');
  const COLS=20,ROWS=20,TEAL='#0df2d4',DIM='#0a3a34',RED='#ff4d6d',AMBER='#f5c842';
  let snake,dir,nextDir,food,bonus,bonusTimer,loop,score,best=0,running=false;
  window.snakeScore=0;
  function resize(){const w=Math.min(400,C.parentElement.clientWidth);C.style.width=w+'px';C.style.height=w+'px';}
  window.addEventListener('resize',resize);resize();
  function rndCell(){return{x:Math.floor(Math.random()*COLS),y:Math.floor(Math.random()*ROWS)};}
  function spawnFood(){do{food=rndCell();}while(snake.some(s=>s.x===food.x&&s.y===food.y));}
  function spawnBonus(){
    if(Math.random()<.3){
      do{bonus=rndCell();}
      while(snake.some(s=>s.x===bonus.x&&s.y===bonus.y) || (food.x===bonus.x&&food.y===bonus.y));
      bonusTimer=60;
    }
  }
  window.startSnake=function(){
    document.getElementById('snake-overlay').style.display='none';
    document.getElementById('snake-gameover').style.display='none';
    const ni=document.getElementById('snake-name-input');if(ni){ni.disabled=false;ni.value='';}
    const sv=document.getElementById('snake-score-saved');if(sv)sv.style.display='none';
    const sb=document.querySelector('#snake-gameover .sb-save');if(sb)sb.disabled=false;
    snake=[{x:10,y:10},{x:9,y:10},{x:8,y:10}];
    dir={x:1,y:0};nextDir={x:1,y:0};score=0;bonus=null;bonusTimer=0;running=true;
    spawnFood();clearInterval(loop);loop=setInterval(tick,115);updateDisp();
  };
  window.snakePause=function(){running=false;clearInterval(loop);};
  function tick(){
    if(!running||!snake||!food)return;
    dir=nextDir;
    const head={x:(snake[0].x+dir.x+COLS)%COLS,y:(snake[0].y+dir.y+ROWS)%ROWS};
    if(snake.some(s=>s.x===head.x&&s.y===head.y)){gameOver();return;}
    snake.unshift(head);
    if(head.x===food.x&&head.y===food.y){score+=10;spawnFood();if(score%50===0)spawnBonus();}
    else if(bonus&&head.x===bonus.x&&head.y===bonus.y){score+=25;bonus=null;}
    else snake.pop();
    if(bonus&&--bonusTimer<=0)bonus=null;
    updateDisp();draw();
  }
  function updateDisp(){if(score>best)best=score;window.snakeScore=score;document.getElementById('snake-score').textContent=score;document.getElementById('snake-best').textContent=best;}
  function gameOver(){
    running=false;clearInterval(loop);
    document.getElementById('snake-final-score').textContent='Score: '+score+' | Best: '+best;
    document.getElementById('snake-gameover').style.display='flex';
    switchSB('snake');
  }
  function draw(){
    ctx.fillStyle='#05050a';ctx.fillRect(0,0,C.width,C.height);
    if(!snake||!food)return;
    ctx.strokeStyle='rgba(13,242,212,.05)';ctx.lineWidth=.5;
    for(let i=0;i<=COLS;i++){ctx.beginPath();ctx.moveTo(i*(C.width/COLS),0);ctx.lineTo(i*(C.width/COLS),C.height);ctx.stroke();}
    for(let j=0;j<=ROWS;j++){ctx.beginPath();ctx.moveTo(0,j*(C.height/ROWS));ctx.lineTo(C.width,j*(C.height/ROWS));ctx.stroke();}
    const cw=C.width/COLS,ch=C.height/ROWS;
    ctx.fillStyle=RED;ctx.shadowColor=RED;ctx.shadowBlur=14;ctx.fillRect(food.x*cw+2,food.y*ch+2,cw-4,ch-4);ctx.shadowBlur=0;
    if(bonus){ctx.fillStyle=AMBER;ctx.shadowColor=AMBER;ctx.shadowBlur=18;ctx.fillRect(bonus.x*cw+2,bonus.y*ch+2,cw-4,ch-4);ctx.shadowBlur=0;}
    snake.forEach((s,i)=>{ctx.fillStyle=i===0?TEAL:DIM;ctx.shadowColor=i===0?TEAL:'transparent';ctx.shadowBlur=i===0?16:0;ctx.fillRect(s.x*cw+1,s.y*ch+1,cw-2,ch-2);});
    ctx.shadowBlur=0;
  }
  ctx.fillStyle='#05050a';ctx.fillRect(0,0,C.width,C.height);
  const DIRS={ArrowUp:{x:0,y:-1},ArrowDown:{x:0,y:1},ArrowLeft:{x:-1,y:0},ArrowRight:{x:1,y:0},w:{x:0,y:-1},s:{x:0,y:1},a:{x:-1,y:0},d:{x:1,y:0}};
  document.addEventListener('keydown',e=>{if(!running)return;const d=DIRS[e.key];if(d&&!(d.x===-dir.x&&d.y===-dir.y)){nextDir=d;e.preventDefault();}});
  let tx=0,ty=0;
  C.addEventListener('touchstart',e=>{tx=e.touches[0].clientX;ty=e.touches[0].clientY;e.preventDefault();},{passive:false});
  C.addEventListener('touchend',e=>{if(!running)return;const dx=e.changedTouches[0].clientX-tx,dy=e.changedTouches[0].clientY-ty;if(Math.abs(dx)>Math.abs(dy))nextDir=dx>0?{x:1,y:0}:{x:-1,y:0};else nextDir=dy>0?{x:0,y:1}:{x:0,y:-1};},{passive:false});
  window.snakeDpad=function(k){if(!running)return;const m={UP:{x:0,y:-1},DOWN:{x:0,y:1},LEFT:{x:-1,y:0},RIGHT:{x:1,y:0}};const d=m[k];if(d&&!(d.x===-dir.x&&d.y===-dir.y))nextDir=d;};
})();

window.saveSnakeScore = async function() {
  const nameEl=document.getElementById('snake-name-input');
  const name=nameEl.value.trim()||'Anonymous';
  nameEl.disabled=true;
  document.querySelector('#snake-gameover .sb-save').disabled=true;
  await SB.save('snake', name, window.snakeScore, 'global-sb-body');
  document.getElementById('snake-score-saved').style.display='block';
};

/* ── ANIME SILHOUETTE GUESSER ── */
(function(){
  const CHARS=[
    {name:'Naruto Uzumaki',anime:'Naruto',hint:'Ninja with a fox spirit sealed inside him',color:'#ff8c00',shape:'spiky'},
    {name:'Sailor Moon',anime:'Sailor Moon',hint:'Magical girl warrior of justice and love',color:'#ffd700',shape:'twin'},
    {name:'Goku',anime:'Dragon Ball Z',hint:'Saiyan warrior with legendary golden hair',color:'#f5c842',shape:'spiky'},
    {name:'Zero Two',anime:'Darling in the FranXX',hint:'Pink-haired girl with small red horns',color:'#ff4d6d',shape:'horns'},
    {name:'Levi Ackerman',anime:'Attack on Titan',hint:"Humanity's strongest soldier",color:'#9997a0',shape:'short'},
    {name:'Rem',anime:'Re:Zero',hint:'Blue-haired demon maid',color:'#4db8ff',shape:'maid'},
    {name:'Itachi Uchiha',anime:'Naruto',hint:'Elite shinobi with Sharingan eyes',color:'#9b59b6',shape:'long'},
    {name:'Hatsune Miku',anime:'Vocaloid',hint:'Teal twin-tail virtual idol singer',color:'#0df2d4',shape:'twin'},
  ];
  const C=document.getElementById('silCanvas'),ctx=C.getContext('2d');
  let round=0,score=0,streak=0,answered=false,chars=[];
  window.silScore=0;
  function shuffle(a){return[...a].sort(()=>Math.random()-.5);}
  window.startSilhouette=function(){
    round=0;score=0;streak=0;answered=false;chars=shuffle(CHARS);
    document.getElementById('sil-intro').style.display='none';
    document.getElementById('sil-result').style.display='none';
    document.getElementById('sil-game').style.display='block';
    loadRound();
  };
  function loadRound(){
    answered=false;const c=chars[round];
    document.getElementById('sil-round').textContent=(round+1)+'/8';
    document.getElementById('sil-score').textContent=score;
    document.getElementById('sil-hint').textContent='Hint: '+c.hint;
    document.getElementById('sil-feedback').textContent='';
    document.getElementById('sil-feedback').className='sil-feedback';
    document.getElementById('sil-streak').textContent=streak>=2?'🔥 '+streak+' streak!':'';
    drawSilhouette(c);
    const wrong=shuffle(CHARS.filter(x=>x.name!==c.name)).slice(0,3).map(x=>x.anime);
    const opts=shuffle([c.anime,...wrong]);
    const el=document.getElementById('sil-options');el.innerHTML='';
    opts.forEach(opt=>{const btn=document.createElement('button');btn.className='sil-opt';btn.textContent=opt;btn.onclick=()=>pick(btn,opt,c.anime);el.appendChild(btn);});
  }
  function pick(btn,chosen,correct){
    if(answered)return;answered=true;
    document.querySelectorAll('.sil-opt').forEach(b=>b.disabled=true);
    const fb=document.getElementById('sil-feedback');
    if(chosen===correct){btn.classList.add('correct');score+=10+(streak*2);streak++;fb.textContent='✓ Correct! +'+(10+(streak-1)*2);fb.className='sil-feedback ok';}
    else{btn.classList.add('wrong');document.querySelectorAll('.sil-opt').forEach(b=>{if(b.textContent===correct)b.classList.add('correct');});streak=0;fb.textContent='✗ It was: '+correct;fb.className='sil-feedback bad';}
    document.getElementById('sil-score').textContent=score;
    document.getElementById('sil-streak').textContent=streak>=2?'🔥 '+streak+' streak!':'';
    setTimeout(()=>{round++;if(round>=chars.length)showSilResult();else loadRound();},1400);
  }
  function showSilResult(){
    document.getElementById('sil-game').style.display='none';
    document.getElementById('sil-result').style.display='block';
    document.getElementById('sil-final-score').textContent='Score: '+score+' pts — '+Math.round(score/80*100)+'% accuracy';
    const pct=score/80;
    const r=pct>=.9?'ANIME GOD 🏆':pct>=.7?'ELITE OTAKU ⭐':pct>=.5?'SEASONED FAN 🎌':pct>=.3?'CASUAL VIEWER 📺':'NEW TO ANIME 🌱';
    document.getElementById('sil-final-rank').textContent=r;
    window.silScore=score;
    const ni=document.getElementById('sil-name-input');if(ni){ni.disabled=false;ni.value='';}
    const sv=document.getElementById('sil-score-saved');if(sv)sv.style.display='none';
    const sb=document.querySelector('#sil-result .sb-save');if(sb)sb.disabled=false;
    switchSB('silhouette');
  }
  function drawSilhouette(char){
    ctx.clearRect(0,0,C.width,C.height);ctx.fillStyle='#020108';ctx.fillRect(0,0,C.width,C.height);
    const cx=C.width/2,cy=C.height/2+20,s=char.shape;
    ctx.fillStyle='#1a1a22';ctx.strokeStyle=char.color+'44';ctx.lineWidth=1.5;
    ctx.beginPath();ctx.arc(cx,cy-90,30,0,Math.PI*2);ctx.fill();ctx.stroke();
    if(s==='spiky'||s==='long'){const pts=s==='spiky'?8:4;for(let i=0;i<pts;i++){const a=-Math.PI/2+(i-(pts-1)/2)*0.28,r=s==='spiky'?52:42;ctx.beginPath();ctx.moveTo(cx+Math.cos(a)*28,cy-90+Math.sin(a)*28);ctx.lineTo(cx+Math.cos(a)*r,cy-90+Math.sin(a)*r-10);ctx.lineWidth=8;ctx.strokeStyle='#1a1a22';ctx.stroke();ctx.strokeStyle=char.color+'44';ctx.lineWidth=1.5;}}
    if(s==='twin'){ctx.beginPath();ctx.ellipse(cx-38,cy-110,10,34,-.4,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.beginPath();ctx.ellipse(cx+38,cy-110,10,34,.4,0,Math.PI*2);ctx.fill();ctx.stroke();}
    if(s==='horns'){ctx.beginPath();ctx.moveTo(cx-18,cy-116);ctx.lineTo(cx-12,cy-148);ctx.lineTo(cx-6,cy-116);ctx.fill();ctx.stroke();ctx.beginPath();ctx.moveTo(cx+6,cy-116);ctx.lineTo(cx+12,cy-148);ctx.lineTo(cx+18,cy-116);ctx.fill();ctx.stroke();}
    if(s==='maid'){ctx.beginPath();ctx.ellipse(cx,cy-122,36,8,0,0,Math.PI*2);ctx.fill();ctx.stroke();}
    ctx.beginPath();ctx.moveTo(cx-22,cy-62);ctx.bezierCurveTo(cx-28,cy-20,cx-24,cy+20,cx-20,cy+60);ctx.lineTo(cx+20,cy+60);ctx.bezierCurveTo(cx+24,cy+20,cx+28,cy-20,cx+22,cy-62);ctx.closePath();ctx.fill();ctx.stroke();
    ctx.beginPath();ctx.moveTo(cx-22,cy-50);ctx.quadraticCurveTo(cx-55,cy-10,cx-44,cy+40);ctx.lineWidth=12;ctx.strokeStyle='#1a1a22';ctx.stroke();ctx.lineWidth=1.5;ctx.strokeStyle=char.color+'44';
    ctx.beginPath();ctx.moveTo(cx+22,cy-50);ctx.quadraticCurveTo(cx+55,cy-10,cx+44,cy+40);ctx.lineWidth=12;ctx.strokeStyle='#1a1a22';ctx.stroke();ctx.lineWidth=1.5;ctx.strokeStyle=char.color+'44';
    ctx.beginPath();ctx.moveTo(cx-10,cy+60);ctx.quadraticCurveTo(cx-16,cy+100,cx-14,cy+140);ctx.lineWidth=14;ctx.strokeStyle='#1a1a22';ctx.stroke();ctx.lineWidth=1.5;
    ctx.beginPath();ctx.moveTo(cx+10,cy+60);ctx.quadraticCurveTo(cx+16,cy+100,cx+14,cy+140);ctx.lineWidth=14;ctx.strokeStyle='#1a1a22';ctx.stroke();ctx.lineWidth=1.5;
    ctx.font='bold 48px Orbitron,serif';ctx.fillStyle=char.color+'cc';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('?',cx,cy-90);
  }
})();

window.saveSilScore = async function() {
  const nameEl=document.getElementById('sil-name-input');
  const name=nameEl.value.trim()||'Anonymous';
  nameEl.disabled=true;
  document.querySelector('#sil-result .sb-save').disabled=true;
  await SB.save('silhouette', name, window.silScore, 'global-sb-body');
  document.getElementById('sil-score-saved').style.display='block';
};

/* ── SEAL SKY DASH (Flappy-style) ── */
(function(){
  const C = document.getElementById('flappyCanvas');
  if(!C) return;
  const ctx = C.getContext('2d');
  if(!ctx) return;
  let running = false;
  let loop = null;
  let frame = 0;
  let score = 0;
  let best = parseInt(localStorage.getItem('ms_flappy_best') || '0', 10);
  let sealY = 130;
  let sealV = 0;
  let sealX = 96;
  let pipes = [];
  const gravity = 0.38;
  const flap = -6.8;
  const speed = 2.6;
  const gap = 120;
  const pipeW = 56;

  function resizeCanvas(){
    const w = Math.min(420, C.parentElement.clientWidth);
    C.style.width = w + 'px';
    C.style.height = (w * 0.75) + 'px';
  }
  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();

  function resetState(){
    running = true;
    frame = 0;
    score = 0;
    sealY = 130;
    sealV = 0;
    pipes = [];
    updateHud();
  }

  function updateHud(){
    document.getElementById('tap-score').textContent = score;
    document.getElementById('tap-best').textContent = best;
  }

  function spawnPipe(){
    const minTop = 32;
    const maxTop = C.height - gap - 32;
    const topH = Math.floor(minTop + Math.random() * (maxTop - minTop));
    pipes.push({ x: C.width + 6, top: topH, passed: false });
  }

  function drawBG(){
    ctx.fillStyle = '#05050a';
    ctx.fillRect(0,0,C.width,C.height);
    ctx.strokeStyle = 'rgba(13,242,212,.05)';
    ctx.lineWidth = 1;
    for(let i=0;i<=10;i++){
      const x = i * (C.width / 10);
      ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,C.height); ctx.stroke();
    }
    for(let j=0;j<=8;j++){
      const y = j * (C.height / 8);
      ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(C.width,y); ctx.stroke();
    }
  }

  function drawSeal(){
    const x = sealX, y = sealY;
    ctx.save();
    ctx.translate(x,y);
    ctx.rotate(Math.max(-0.25, Math.min(0.35, sealV * 0.04)));
    ctx.fillStyle = '#9bb7c8';
    ctx.beginPath(); ctx.ellipse(0,0,18,13,0,0,Math.PI*2); ctx.fill();
    ctx.fillStyle = '#cddbe4';
    ctx.beginPath(); ctx.ellipse(8,2,8,6,0,0,Math.PI*2); ctx.fill();
    ctx.fillStyle = '#111';
    ctx.beginPath(); ctx.arc(10,-2,1.5,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(14,1,1.2,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(14,4,1.2,0,Math.PI*2); ctx.fill();
    ctx.restore();
  }

  function drawPipes(){
    pipes.forEach(p=>{
      ctx.fillStyle = 'rgba(13,242,212,.14)';
      ctx.strokeStyle = 'rgba(13,242,212,.55)';
      ctx.lineWidth = 2;
      ctx.fillRect(p.x, 0, pipeW, p.top);
      ctx.strokeRect(p.x, 0, pipeW, p.top);
      const bottomY = p.top + gap;
      ctx.fillRect(p.x, bottomY, pipeW, C.height - bottomY);
      ctx.strokeRect(p.x, bottomY, pipeW, C.height - bottomY);
    });
  }

  function hitPipe(p){
    const rx = sealX - 14, ry = sealY - 12, rw = 28, rh = 24;
    const hitTop = rx < p.x + pipeW && rx + rw > p.x && ry < p.top;
    const bottomY = p.top + gap;
    const hitBottom = rx < p.x + pipeW && rx + rw > p.x && ry + rh > bottomY;
    return hitTop || hitBottom;
  }

  function gameOver(){
    running = false;
    clearInterval(loop);
    loop = null;
    if(score > best){
      best = score;
      localStorage.setItem('ms_flappy_best', String(best));
    }
    updateHud();
    window.tapScore = score;
    document.getElementById('tap-final-score').textContent = 'Score: ' + score;
    document.getElementById('flappy-gameover').style.display = 'flex';
    const ni = document.getElementById('tap-name-input'); if(ni){ni.disabled=false;ni.value='';}
    const sv = document.getElementById('tap-score-saved'); if(sv) sv.style.display='none';
    const sb = document.querySelector('#flappy-gameover .sb-save'); if(sb) sb.disabled=false;
    switchSB('tap');
  }

  function tick(){
    if(!running) return;
    frame++;

    if(frame % 90 === 0) spawnPipe();

    sealV += gravity;
    sealY += sealV;

    pipes.forEach(p=>{
      p.x -= speed;
      if(!p.passed && p.x + pipeW < sealX){
        p.passed = true;
        score++;
      }
      if(hitPipe(p)) gameOver();
    });

    pipes = pipes.filter(p => p.x + pipeW > -4);

    if(sealY < 8 || sealY > C.height - 8) gameOver();

    drawBG();
    drawPipes();
    drawSeal();
    updateHud();
  }

  function flapNow(){
    if(!running) return;
    sealV = flap;
  }

  window.startTapGame = function(){
    document.getElementById('flappy-overlay').style.display = 'none';
    document.getElementById('flappy-gameover').style.display = 'none';
    resetState();
    if(loop) clearInterval(loop);
    loop = setInterval(tick, 1000/60);
  };

  window.stopTapGame = function(){
    running = false;
    if(loop){ clearInterval(loop); loop = null; }
    drawBG();
    drawSeal();
    document.getElementById('flappy-gameover').style.display = 'none';
    document.getElementById('flappy-overlay').style.display = 'flex';
    score = 0;
    window.tapScore = 0;
    updateHud();
  };

  C.addEventListener('pointerdown', flapNow);
  C.addEventListener('touchstart', (e)=>{ flapNow(); e.preventDefault(); }, { passive:false });
  document.addEventListener('keydown', (e)=>{
    if(e.code==='Space' || e.code==='ArrowUp'){
      flapNow();
      if(e.code==='Space') e.preventDefault();
    }
  });

  drawBG();
  drawSeal();
  updateHud();
  const startOverlay = document.getElementById('flappy-overlay');
  if(startOverlay) startOverlay.style.display = 'flex';
})();

window.saveTapScore = async function() {
  const nameEl=document.getElementById('tap-name-input');
  const name=nameEl.value.trim()||'Anonymous';
  nameEl.disabled=true;
  document.querySelector('#flappy-gameover .sb-save').disabled=true;
  await SB.save('tap', name, window.tapScore || 0, 'global-sb-body');
  document.getElementById('tap-score-saved').style.display='block';
};

// Init leaderboard
switchSB('snake');
