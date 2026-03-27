(function(){
  const cur=document.getElementById("cur");
  if(cur){
    document.addEventListener("mousemove",e=>{cur.style.left=e.clientX+"px";cur.style.top=e.clientY+"px";});
    document.querySelectorAll("a,button,.game-card,.feat,.inside-card,.seal,.review-card").forEach(el=>{
      el.addEventListener("mouseenter",()=>cur.classList.add("big"));
      el.addEventListener("mouseleave",()=>cur.classList.remove("big"));
    });
  }
  const hamburger=document.getElementById("nav-hamburger");
  const mobileNav=document.getElementById("nav-mobile");
  if(hamburger&&mobileNav){
    hamburger.addEventListener("click",()=>mobileNav.classList.toggle("open"));
    document.addEventListener("click",e=>{if(!hamburger.contains(e.target)&&!mobileNav.contains(e.target))mobileNav.classList.remove("open");});
  }
})();

(function(){
  const canvas=document.getElementById("seasons-canvas");
  const badge=document.getElementById("season-badge");
  if(!canvas||!badge)return;
  const ctx=canvas.getContext("2d");
  const month=new Date().getMonth();
  const season=month>=2&&month<=4?"spring":month>=5&&month<=7?"summer":month>=8&&month<=10?"autumn":"winter";
  const cfg={spring:{label:"?? Spring",count:24,color:["#ffb7c5","#ff8fab","#ffd6e0"]},summer:{label:"? Summer",count:26,color:["#ffd700","#fff9c4","#0df2d4"]},autumn:{label:"?? Autumn",count:20,color:["#e8651a","#c0392b","#f39c12"]},winter:{label:"?? Winter",count:28,color:["#e0f7ff","#b3e5fc","#ffffff"]}}[season];
  badge.textContent=cfg.label;
  let W=canvas.width=window.innerWidth,H=canvas.height=window.innerHeight;
  const p=Array.from({length:cfg.count},()=>({x:Math.random()*W,y:Math.random()*H,s:1+Math.random()*3,vy:.4+Math.random(),vx:(Math.random()-.5)*.4,c:cfg.color[Math.floor(Math.random()*cfg.color.length)]}));
  window.addEventListener("resize",()=>{W=canvas.width=window.innerWidth;H=canvas.height=window.innerHeight;});
  let hidden=false;document.addEventListener("visibilitychange",()=>hidden=document.hidden);
  let t=0;function draw(ts){requestAnimationFrame(draw);if(hidden||ts-t<33)return;t=ts;ctx.clearRect(0,0,W,H);for(const a of p){a.x+=a.vx;a.y+=a.vy;if(a.y>H+10){a.y=-10;a.x=Math.random()*W;}if(a.x<-10)a.x=W+10;if(a.x>W+10)a.x=-10;ctx.globalAlpha=.65;ctx.fillStyle=a.c;ctx.beginPath();ctx.arc(a.x,a.y,a.s,0,Math.PI*2);ctx.fill();}ctx.globalAlpha=1;}
  requestAnimationFrame(draw);
})();

const SB={
  MAX:10,
  _k:k=>"ms_sb_"+k,
  _clean:n=>((n||"Anonymous").trim().replace(/[<>"'&]/g,"").slice(0,16)||"Anonymous"),
  _map:r=>({name:r.name||r.player_name||"Anonymous",score:Number(r.score)||0,date:r.date||r.created_at||""}),
  _local(k){try{return JSON.parse(localStorage.getItem(this._k(k))||"[]").map(this._map);}catch(_){return[];}},
  _write(k,list){try{localStorage.setItem(this._k(k),JSON.stringify(list.slice(0,this.MAX)));}catch(_){}}
};
SB.render=function(dataOrKey,containerId,highlightName,highlightScore){
  const el=document.getElementById(containerId); if(!el) return;
  const list=(Array.isArray(dataOrKey)?dataOrKey:this._local(dataOrKey)).map(this._map).sort((a,b)=>b.score-a.score).slice(0,this.MAX);
  if(!list.length){el.innerHTML="<div class=\"sb-empty\">No scores yet - be the first!</div>";return;}
  const medal=["gold","silver","bronze"];
  el.innerHTML=list.map((s,i)=>{const you=s.name===highlightName&&Number(s.score)===Number(highlightScore);const rank=i===0?"#1":i===1?"#2":i===2?"#3":"#"+(i+1);const dt=s.date?new Date(s.date):null;const ds=dt&& !isNaN(dt)?dt.toLocaleDateString("en-US",{month:"short",day:"numeric"}):"";return `<div class="sb-row"><span class="sb-rank ${medal[i]||"other"}">${rank}</span><span class="sb-name${you?" you":""}">${s.name}${you?" <span class=\"sb-new\">YOU</span>":""}</span><span class="sb-score">${s.score}</span><span style="font-family:Orbitron,monospace;font-size:.46rem;color:var(--text3);margin-left:4px;">${ds}</span></div>`;}).join("");
};
SB.load=async function(key,containerId,highlightName,highlightScore){
  let list=this._local(key);
  try{if(window.DB&&typeof DB.getScores==="function"){const remote=await DB.getScores(key,10);if(Array.isArray(remote)&&remote.length)list=remote.map(this._map);}}catch(_){}
  this.render(list,containerId,highlightName,highlightScore);
};
SB.save=async function(key,name,score,containerId){
  const clean=this._clean(name);const val=Number(score)||0;
  const local=this._local(key);
  local.push({name:clean,score:val,date:new Date().toISOString()});
  local.sort((a,b)=>b.score-a.score);
  this._write(key,local);
  try{if(window.DB&&typeof DB.saveScore==="function")await DB.saveScore(key,clean,val);}catch(_){}
  if(containerId) await this.load(key,containerId,clean,val);
  return local.slice(0,this.MAX);
};
window.SB=SB;

window.switchSB=function(key){
  document.querySelectorAll(".gsb-tab").forEach(t=>{
    const x=t.textContent||"";
    t.classList.toggle("active",
      (key==="snake"&&x.includes("Snake"))||
      (key==="silhouette"&&x.includes("Guesser"))||
      (key==="quiz"&&x.includes("Quiz"))||
      (key==="tap"&&x.includes("Tap"))
    );
  });
  ["global-sb-body","global-sb-body-quiz"].forEach(id=>{if(document.getElementById(id))SB.load(key,id);});
};
