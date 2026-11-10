/* Duel engine: 2 players on one phone. Player 0 = bottom half (red), player 1 = top half (blue, sees the screen upside down).
   A game file calls Duel.register({...}). See duel/GAME_API.md. */
(function(){
'use strict';
const AR = n => (window.I18N ? I18N.num(n) : String(n).replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[d]));
const L = window.L || ((a) => a);
const PLAYERS = [
  { name:L('الأحمر','Red','Kırmızı'), color:'#ff5a5f', dark:'#c23a40', light:'#ffb3b5' },
  { name:L('الأزرق','Blue','Mavi'), color:'#3fa9ff', dark:'#2276c4', light:'#b4dcff' }
];
const WIN_ROUNDS = 3;
if(!CanvasRenderingContext2D.prototype.roundRect){
  CanvasRenderingContext2D.prototype.roundRect = function(x, y, w, h, r){ r = Math.min(typeof r === 'number' ? r : (r && r[0]) || 0, w / 2, h / 2); this.moveTo(x + r, y); this.arcTo(x + w, y, x + w, y + h, r); this.arcTo(x + w, y + h, x, y + h, r); this.arcTo(x, y + h, x, y, r); this.arcTo(x, y, x + w, y, r); this.closePath(); };
}
const store = { get(k, d){ try{ const v = localStorage.getItem('duel_' + k); return v == null ? d : JSON.parse(v); }catch(e){ return d; } }, set(k, v){ try{ localStorage.setItem('duel_' + k, JSON.stringify(v)); }catch(e){} } };

/* sound */
let actx = null;
function ac(){ if(!actx){ try{ actx = new (window.AudioContext || window.webkitAudioContext)(); }catch(e){} } if(actx && actx.state === 'suspended') actx.resume().catch(()=>{}); return actx; }
function tone(freq, dur, type, vol, delay, toFreq){
  const a = ac(); if(!a) return;
  const t0 = a.currentTime + (delay || 0), o = a.createOscillator(), g = a.createGain();
  o.type = type || 'sine'; o.frequency.setValueAtTime(freq, t0); if(toFreq) o.frequency.exponentialRampToValueAtTime(toFreq, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol || 0.15, t0 + 0.015); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(a.destination); o.start(t0); o.stop(t0 + dur + 0.05);
}
const SFX = {
  tap(){ tone(520,.05,'triangle',.08); }, tick(){ tone(660,.08,'triangle',.12); }, go(){ tone(988,.25,'square',.08); },
  hit(){ tone(220,.08,'square',.09,0,120); }, bounce(){ tone(440,.06,'sine',.1,0,300); },
  coin(){ tone(988,.07,'square',.06); tone(1318,.12,'square',.06,.06); },
  swoosh(){ tone(800,.12,'sawtooth',.04,0,200); }, splash(){ tone(400,.35,'sawtooth',.07,0,80); },
  buzz(){ tone(140,.3,'sawtooth',.08,0,90); }, point(){ [659,784,988].forEach((f,i)=>tone(f,.15,'triangle',.13,i*.08)); },
  win(){ [523,659,784,1046,784,1046,1318].forEach((f,i)=>tone(f,.2,'triangle',.14,i*.11)); }
};

/* cute round character used by every game */
function buddy(c, x, y, r, pi, t, mood, look){
  const pl = PLAYERS[pi] || pi; t = t || 0;
  c.save(); c.translate(x, y);
  const sq = 1 + Math.sin(t * 9) * 0.04;
  c.fillStyle = 'rgba(0,0,0,.2)'; c.beginPath(); c.ellipse(0, r * 0.95, r * 0.75, r * 0.2, 0, 0, Math.PI * 2); c.fill();
  c.scale(1 / sq, sq);
  c.strokeStyle = pl.dark; c.lineWidth = Math.max(2, r * 0.1); c.lineCap = 'round';
  c.beginPath(); c.moveTo(0, -r * 0.85); c.quadraticCurveTo(r * 0.2, -r * 1.2, r * 0.05, -r * 1.35); c.stroke();
  c.fillStyle = pl.color; c.beginPath(); c.arc(r * 0.05, -r * 1.38, r * 0.15, 0, Math.PI * 2); c.fill();
  c.fillStyle = pl.dark; c.beginPath(); c.ellipse(0, r * 0.08, r * 0.92, r * 0.95, 0, 0, Math.PI * 2); c.fill();
  c.fillStyle = pl.color; c.beginPath(); c.arc(0, 0, r * 0.9, 0, Math.PI * 2); c.fill();
  c.fillStyle = 'rgba(255,255,255,.25)'; c.beginPath(); c.ellipse(-r * 0.35, -r * 0.45, r * 0.25, r * 0.14, -0.6, 0, Math.PI * 2); c.fill();
  const lx = (look && look.x) || 0, ly = (look && look.y) || 0;
  for(const s of [-1, 1]){
    if(mood === 'sad'){ c.strokeStyle = '#1c1838'; c.lineWidth = Math.max(2, r * 0.09); c.beginPath(); c.moveTo(s * r * 0.42, -r * 0.3); c.lineTo(s * r * 0.18, -r * 0.08); c.moveTo(s * r * 0.18, -r * 0.3); c.lineTo(s * r * 0.42, -r * 0.08); c.stroke(); }
    else { c.fillStyle = '#fff'; c.beginPath(); c.arc(s * r * 0.3, -r * 0.2, r * 0.22, 0, Math.PI * 2); c.fill(); c.fillStyle = '#1c1838'; c.beginPath(); c.arc(s * r * 0.3 + lx * r * 0.08, -r * 0.2 + ly * r * 0.08, r * 0.11, 0, Math.PI * 2); c.fill(); }
  }
  c.strokeStyle = '#1c1838'; c.fillStyle = '#1c1838'; c.lineWidth = Math.max(2, r * 0.08); c.lineCap = 'round';
  if(mood === 'happy'){ c.beginPath(); c.arc(0, r * 0.18, r * 0.3, 0, Math.PI); c.fill(); }
  else if(mood === 'sad'){ c.beginPath(); c.arc(0, r * 0.45, r * 0.2, 1.15 * Math.PI, 1.85 * Math.PI); c.stroke(); }
  else { c.beginPath(); c.arc(0, r * 0.12, r * 0.22, 0.2 * Math.PI, 0.8 * Math.PI); c.stroke(); }
  c.restore();
}
const FONT = '"Baloo Bhaijaan 2","Tajawal",system-ui,sans-serif';
const EMOJI_FONT = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
function text(c, str, x, y, size, color, player, weight){
  c.save(); c.translate(x, y); if(player === 1) c.rotate(Math.PI);
  c.font = (weight || 800) + ' ' + Math.round(size) + 'px ' + FONT; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.direction = (window.I18N ? I18N.dir : 'rtl'); c.lineJoin = 'round';
  c.strokeStyle = 'rgba(0,0,0,.35)'; c.lineWidth = Math.max(2, size * 0.12); c.strokeText(str, 0, 0);
  c.fillStyle = color || '#fff7e8'; c.fillText(str, 0, 0); c.restore();
}
function emoji(c, ch, x, y, size, rot){
  c.save(); c.translate(x, y); if(rot) c.rotate(rot);
  c.font = Math.round(size) + 'px ' + EMOJI_FONT; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#000'; c.globalAlpha = c.globalAlpha; c.fillText(ch, 0, size * 0.05); c.restore();
}

/* registry */
const GAMES = [];
function register(def){ GAMES.push(def); }

/* runtime */
let cv, ctx, W = 0, H = 0, dpr = 1;
let cur = null, inst = null, phase = 'menu', score = [0, 0], ready = [false, false], phaseT = 0, count = 0, roundT = 0, banner = null, lastWinner = null;
const pointers = new Map();
const api = {
  get W(){ return W; }, get H(){ return H; }, get mid(){ return H / 2; }, get time(){ return roundT; },
  players: PLAYERS, sfx: SFX, tone, buddy, text, emoji, AR, FONT, L, get lang(){ return window.I18N ? I18N.lang : 'ar'; }, get dir(){ return window.I18N ? I18N.dir : 'rtl'; },
  rand: (a, b) => a + Math.random() * (b - a),
  clamp: (v, a, b) => Math.max(a, Math.min(b, v)),
  win(p){ if(phase !== 'play') return; endRound(p); },
  say(str, player, ms){ banner = { str, player, until: performance.now() + (ms || 1200) }; }
};

function fit(){ dpr = Math.min(2.5, devicePixelRatio || 1); W = innerWidth; H = innerHeight; cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); if(inst && inst.resize) inst.resize(); }

function newRound(){
  inst = cur.create(api) || {};
  roundT = 0; banner = null;
  phase = 'count'; count = 3; phaseT = 0.6; SFX.tick();
}
function endRound(p){
  phase = 'result'; phaseT = 1.9; lastWinner = p;
  if(p === 0 || p === 1){ score[p]++; SFX.point(); } else SFX.buzz();
  pointers.clear();
}
function openGame(def){
  ac(); cur = def; score = [0, 0]; ready = [false, false];
  inst = def.create(api) || {}; roundT = 0;
  phase = 'ready'; document.getElementById('menu').hidden = true; document.getElementById('play').hidden = false;
}
function backToMenu(){ phase = 'menu'; cur = null; inst = null; pointers.clear(); document.getElementById('menu').hidden = false; document.getElementById('play').hidden = true; document.getElementById('champ').hidden = true; }

function onDown(e){
  e.preventDefault(); ac();
  const x = e.clientX, y = e.clientY, player = y >= H / 2 ? 0 : 1;
  const p = { id:e.pointerId, x, y, startX:x, startY:y, player };
  pointers.set(e.pointerId, p);
  if(phase === 'ready'){ if(!ready[player]){ ready[player] = true; SFX.tap(); if(ready[0] && ready[1]){ inst = cur.create(api) || {}; roundT = 0; phase = 'count'; count = 3; phaseT = 0.6; SFX.tick(); } } return; }
  if(phase === 'play' && inst.pointerDown) inst.pointerDown(p);
}
function onMove(e){
  const p = pointers.get(e.pointerId); if(!p) return;
  p.x = e.clientX; p.y = e.clientY;
  if(phase === 'play' && inst.pointerMove) inst.pointerMove(p);
}
function onUp(e){
  const p = pointers.get(e.pointerId); if(!p) return;
  p.x = e.clientX; p.y = e.clientY; pointers.delete(e.pointerId);
  if(phase === 'play' && inst.pointerUp) inst.pointerUp(p);
}

function drawOverlay(now){
  const mid = H / 2;
  // centre line + scores
  ctx.fillStyle = 'rgba(28,24,56,.55)'; ctx.beginPath(); ctx.roundRect(8, mid - 22, 74, 44, 22); ctx.fill();
  text(ctx, AR(score[0]), 30, mid + 1, 26, PLAYERS[0].color, 0);
  text(ctx, AR(score[1]), 60, mid + 1, 26, PLAYERS[1].color, 1);
  if(phase === 'ready'){
    ctx.fillStyle = 'rgba(18,14,40,.92)'; ctx.fillRect(0, 0, W, H);
    for(const pl of [0, 1]){
      const cy = pl === 0 ? H * 0.75 : H * 0.25, s = pl === 0 ? 1 : -1;
      emoji(ctx, cur.emoji, W / 2, cy - s * 70, 54, pl === 1 ? Math.PI : 0);
      text(ctx, cur.title, W / 2, cy - s * 18, Math.min(38, W * 0.09), '#ffcd4d', pl);
      wrapText(cur.help, W / 2, cy + s * 20, Math.min(W * 0.88, 420), 16, pl);
      text(ctx, ready[pl] ? L('جاهز ✔','Ready ✔','Hazır ✔') : L('اكبس هون لما تكون جاهز','Tap here when ready','Hazır olunca buraya dokun'), W / 2, cy + s * 112, 22, ready[pl] ? '#3fd47a' : PLAYERS[pl].light, pl);
    }
    ctx.strokeStyle = 'rgba(255,255,255,.2)'; ctx.setLineDash([8, 8]); ctx.beginPath(); ctx.moveTo(0, mid); ctx.lineTo(W, mid); ctx.stroke(); ctx.setLineDash([]);
  } else if(phase === 'count'){
    for(const pl of [0, 1]) text(ctx, AR(count), W / 2, pl === 0 ? H * 0.68 : H * 0.32, 90, '#ffcd4d', pl);
  } else if(phase === 'result'){
    ctx.fillStyle = 'rgba(18,14,40,.5)'; ctx.fillRect(0, 0, W, H);
    for(const pl of [0, 1]){
      const y = pl === 0 ? H * 0.7 : H * 0.3;
      let s;
      if(lastWinner === 0 || lastWinner === 1) s = lastWinner === pl ? L('ربحت الجولة! 🎉','You won the round! 🎉','Turu kazandın! 🎉') : L(PLAYERS[lastWinner].name + ' ربح الجولة', PLAYERS[lastWinner].name + ' won the round', PLAYERS[lastWinner].name + ' turu kazandı');
      else s = L('تعادل! 🤝','Draw! 🤝','Berabere! 🤝');
      text(ctx, s, W / 2, y, Math.min(34, W * 0.08), lastWinner === pl ? '#ffcd4d' : '#fff7e8', pl);
    }
  }
  if(banner && now < banner.until){
    const pls = banner.player === 0 || banner.player === 1 ? [banner.player] : [0, 1];
    for(const pl of pls) text(ctx, banner.str, W / 2, pl === 0 ? H * 0.62 : H * 0.38, Math.min(30, W * 0.075), '#fff7e8', pl);
  }
}
function wrapText(str, x, y, maxW, size, pl){
  ctx.save(); ctx.font = '700 ' + size + 'px ' + FONT;
  const words = str.split(' '), lines = []; let line = '';
  for(const w of words){ const t = line ? line + ' ' + w : w; if(ctx.measureText(t).width > maxW && line){ lines.push(line); line = w; } else line = t; }
  if(line) lines.push(line); ctx.restore();
  lines.forEach((l, i) => { const off = (i - (lines.length - 1) / 2) * size * 1.35; text(ctx, l, x, y + (pl === 1 ? -off : off) + (pl === 1 ? -1 : 1) * (lines.length - 1) * size * 0.7, size, '#bdb4e6', pl, 700); });
}

let last = 0;
function frame(now){
  const dt = Math.min(0.033, (now - last) / 1000 || 0); last = now;
  if(cur && inst){
    if(phase === 'count'){ phaseT -= dt; if(phaseT <= 0){ count--; if(count > 0){ phaseT = 0.6; SFX.tick(); } else { phase = 'play'; SFX.go(); } } }
    else if(phase === 'play'){ roundT += dt; if(inst.update) inst.update(dt); }
    else if(phase === 'result'){
      phaseT -= dt;
      if(phaseT <= 0){
        if(score[0] >= WIN_ROUNDS || score[1] >= WIN_ROUNDS) showChampion(score[0] >= WIN_ROUNDS ? 0 : 1);
        else newRound();
      }
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.save(); if(inst.draw) inst.draw(ctx); ctx.restore();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawOverlay(now);
  }
  requestAnimationFrame(frame);
}

function showChampion(p){
  phase = 'champ'; SFX.win();
  const coins = 8; if(window.World){ World.addCoins(coins, 'لخزانة بوبو'); World.track('play', 'duel_' + cur.id); }
  document.querySelector('#champ .coins').textContent = L('ربحتوا ' + AR(coins) + ' 🪙 عملة', 'You earned ' + AR(coins) + ' 🪙 coins', AR(coins) + ' 🪙 jeton kazandınız');
  const box = document.getElementById('champ'); box.hidden = false;
  box.querySelector('h2').textContent = L(PLAYERS[p].name + ' هو البطل! 🏆', PLAYERS[p].name + ' is the champion! 🏆', PLAYERS[p].name + ' şampiyon! 🏆');
  box.querySelector('h2').style.color = PLAYERS[p].color;
  box.querySelector('.sc').textContent = AR(score[0]) + ' – ' + AR(score[1]);
  box.classList.toggle('flip', p === 1);
}

function buildMenu(){
  const grid = document.getElementById('grid'); grid.innerHTML = '';
  GAMES.forEach(g => {
    const b = document.createElement('button'); b.className = 'tile'; b.style.setProperty('--bg', g.bg || '#3fa9ff');
    b.innerHTML = '<span class="em">' + g.emoji + '</span><span class="nm">' + g.title + '</span>';
    b.onclick = () => openGame(g); grid.appendChild(b);
  });
  document.getElementById('count').textContent = L(AR(GAMES.length) + ' لعبة', GAMES.length + ' games', GAMES.length + ' oyun');
}

function boot(){
  cv = document.getElementById('cv'); ctx = cv.getContext('2d');
  fit(); addEventListener('resize', fit);
  cv.addEventListener('pointerdown', onDown); cv.addEventListener('pointermove', onMove);
  cv.addEventListener('pointerup', onUp); cv.addEventListener('pointercancel', onUp);
  addEventListener('contextmenu', e => e.preventDefault());
  document.getElementById('quit').onclick = backToMenu;
  document.getElementById('again').onclick = () => { document.getElementById('champ').hidden = true; openGame(cur); };
  document.getElementById('toMenu').onclick = backToMenu;
  buildMenu();
  const want = new URLSearchParams(location.search).get('game') || location.hash.slice(1);
  addEventListener('hashchange', () => { const g2 = GAMES.find(x => x.id === location.hash.slice(1)); if(g2) openGame(g2); });
  const g = GAMES.find(x => x.id === want); if(g) openGame(g);
  requestAnimationFrame(frame);
  if('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('../sw.js').catch(() => {});
}
window.Duel = { register, boot, api, GAMES, _debug:{ get phase(){ return phase; }, get score(){ return score; }, get inst(){ return inst; }, forcePlay(){ if(cur){ inst = cur.create(api) || {}; roundT = 0; phase = 'play'; } } } };
})();
