/* «بيانو بوبو» — tap the falling tiles.
   States: menu / songs / themes (menus) → count (3-2-1) → play ⇄ pause → revive → over.
   Board: 4 lanes; one tile per melody note (long notes = hold tiles). The scroll position `s` is counted in tile rows; a tile
   sits on the glowing line when s == tile.row. Tapping a tile plays its note; judgement by how far it is from the line.
   3 hearts per song (a passed tile or a tap on an empty lane costs one); out of hearts → «كمّل» once (free) → the end.
   Progress bar: ⭐ at 1/3, 2/3 and the end of the song; with «بلا نهاية» the song repeats faster and every lap gives a 👑.
   «تحدّي مباشر»: 1-v-1 in a room of the shared realtime server (../rt.js), the same song with the same tiles on both phones,
   each phone sees the other's live score; or «تحدّى بوبو» against a bot. Test hooks: window.__piano. */
(function(){
'use strict';
const T = (a, e, t) => (window.L ? window.L(a, e, t) : a);
const $ = s => document.querySelector(s);
const Q = new URLSearchParams(location.search);
const N = n => window.I18N && I18N.num ? I18N.num(n) : String(n);
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const SONGS = PianoSongs.list, THEMES = PianoThemes.list, A = PianoAudio;
const tr3 = a => a ? T(a[0], a[1], a[2]) : '';
const LVL = [T('سهل', 'Easy', 'Kolay'), T('عادي', 'Normal', 'Orta'), T('صعب', 'Hard', 'Zor')];
const HEROES = [
  { id:'sara', iw:232, cx:98, cy:100, r:78, name:T('سارة', 'Sara', 'Sara') },
  { id:'samir', iw:215, cx:112, cy:112, r:84, name:T('سمير', 'Samir', 'Semir') },
  { id:'sidra', iw:210, cx:88, cy:118, r:74, name:T('سيدرة', 'Sidra', 'Sidra') },
  { id:'qamar', iw:240, cx:122, cy:118, r:84, name:T('قمر', 'Qamar', 'Kamer') },
  { id:'mushakis', iw:360, cx:196, cy:140, r:106, name:T('مشاكس', 'Mushakis', 'Muşakis') },
  { id:'zaqzouq', iw:315, cx:156, cy:128, r:110, name:T('زقزوق', 'Zaqzouq', 'Zakzuk') },
  { id:'laila', iw:258, cx:130, cy:110, r:80, name:T('العمة ليلى', 'Aunt Laila', 'Leyla Teyze') },
  { id:'me', iw:232, cx:116, cy:126, r:74, name:T('شخصيتي', 'Me', 'Ben') }
];
const heroOf = id => HEROES.find(h => h.id === id) || HEROES[0];
const BOT_FACE = "data:image/svg+xml," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" fill="#ffe6f3"/><circle cx="32" cy="38" r="24" fill="#9b6bff"/><ellipse cx="32" cy="46" rx="13" ry="10" fill="#b993ff"/><circle cx="24" cy="33" r="6" fill="#fff"/><circle cx="40" cy="33" r="6" fill="#fff"/><circle cx="25" cy="34" r="3" fill="#222"/><circle cx="41" cy="34" r="3" fill="#222"/><path d="M26 44q6 5 12 0" stroke="#3a1a6a" stroke-width="2.5" fill="none" stroke-linecap="round"/><path d="M20 16l4 8 4-8M36 16l4 8 4-8" fill="#ffcd4d"/></svg>');

/* ---------- saved data (this device) ---------- */
const KEY = 'bobo_piano';
const store = (() => {
  let d = {}; try{ d = JSON.parse(localStorage.getItem(KEY)) || {}; }catch(e){ d = {}; }
  const save = () => { try{ localStorage.setItem(KEY, JSON.stringify(d)); }catch(e){} };
  return { get:(k, def) => d[k] === undefined ? def : d[k], set:(k, v) => { d[k] = v; save(); } };
})();
const best = () => store.get('best', {});
const bestOf = id => best()[id] || { s:0, st:0, cr:0 };
const totalStars = () => { const b = best(); let n = 0; for(const k in b) n += clamp(b[k].st | 0, 0, 3) + clamp(b[k].cr | 0, 0, 3); return n; };
const OPEN = 6;
const needFor = i => i < OPEN ? 0 : (i - OPEN + 1) * 2;
const songOpen = i => totalStars() >= needFor(i);
const themeOpen = th => totalStars() >= th.need;
const today = () => { const d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); };
const COIN_RUN = 15, COIN_DAY = 120;
function giveCoins(n){
  const d = store.get('coinday', { d:'', n:0 }); if(d.d !== today()){ d.d = today(); d.n = 0; }
  n = Math.max(0, Math.min(n, COIN_RUN, COIN_DAY - d.n));
  if(n > 0){ d.n += n; store.set('coinday', d); try{ if(window.World) World.addCoins(n, T('من بيانو بوبو', 'from Bobo Piano', 'Bobo Piyano\'dan')); }catch(e){} }
  return n;
}
let theme = THEMES.find(t => t.id === store.get('theme', 'candy') && themeOpen(t)) || THEMES[0];
let myHero = heroOf(store.get('hero', HEROES[Math.floor(Math.random() * 4)].id)).id;
store.set('hero', myHero);

/* ---------- canvas ---------- */
const cv = $('#cv'), ctx = cv.getContext('2d');
let W = 0, H = 0, DPR = 1, laneW = 0, rowH = 0, hitY = 0;
const bgc = document.createElement('canvas'), bgx = bgc.getContext('2d');
let tileC = null, P = null;
const heroImg = {};
function img(id){ if(!heroImg[id]){ const im = new Image(); im.src = '../worlds/chars/' + id + '.png'; heroImg[id] = im; } return heroImg[id]; }
function resize(){
  DPR = Math.min(2, window.devicePixelRatio || 1);
  W = Math.max(1, innerWidth); H = Math.max(1, innerHeight);
  cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
  laneW = W / 4; rowH = Math.max(80, H / 4.4); hitY = H * 0.8;
  paintTheme();
}
function paintTheme(){
  bgc.width = Math.round(W * DPR); bgc.height = Math.round(H * DPR);
  bgx.setTransform(DPR, 0, 0, DPR, 0, 0); bgx.clearRect(0, 0, W, H);
  try{ theme.paint(bgx, W, H); }catch(e){}
  P = theme.init(W, H);
  img(theme.hero);
  // one tile, drawn once per theme / size
  const tw = laneW - 6, th = rowH - 4;
  tileC = document.createElement('canvas'); tileC.width = Math.round(tw * DPR); tileC.height = Math.round(th * DPR);
  const c = tileC.getContext('2d'); c.setTransform(DPR, 0, 0, DPR, 0, 0);
  const g = c.createLinearGradient(0, 0, 0, th); g.addColorStop(0, theme.tile.a); g.addColorStop(1, theme.tile.b);
  PianoThemes.rr(c, 1.5, 1.5, tw - 3, th - 3, 14); c.fillStyle = g; c.fill();
  c.lineWidth = 3; c.strokeStyle = theme.tile.edge; c.stroke();
  c.fillStyle = 'rgba(255,255,255,.18)'; PianoThemes.rr(c, 7, 6, tw - 14, th * 0.22, 9); c.fill();
  c.globalAlpha = 0.5; PianoThemes.note(c, tw / 2 - tw * 0.08, th * 0.62, Math.min(tw, th) * 0.13, '#fff'); c.globalAlpha = 1;
  const tn = $('#thName'); if(tn) tn.textContent = theme.em + ' ' + tr3(theme.name);
}
addEventListener('resize', resize);

/* ---------- game state ---------- */
const G = {
  state:'menu', song:null, idx:0, b:null, endless:false, vs:null, tiles:[], ti:0, s:0, v:2, baseV:2, lap:0, lapLen:0, row0:0, moving:false,
  hearts:3, revived:false, score:0, combo:0, maxCombo:0, perfect:0, great:0, ok:0, miss:0, stars:0, crowns:0, t:0,
  accI:0, accLap:0, beatRows:1, pulse:0, lastBeatRow:0, flash:[0, 0, 0, 0], flashBad:[0, 0, 0, 0], holds:new Map(), auto:false, ts:1,
  rng:null, seed:1, endT:0, result:null, lastBad:-9, finished:false, awarded:false, countT:0, menuT:0,
  bot:null
};
function mulberry(seed){ let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const WIN_EARLY = -2.4, WIN_LATE = 1.05;
const lapSpeed = k => Math.min(2.2, 1 + 0.15 * k);

/* tiles for lap k (lane choice from the seeded random: never the same lane twice in a row, and up/down follows the melody) */
let prevLane = -1, prevMidi = 0;
function addLap(k){
  const ev = G.b.mel.ev, hold = G.b.hold, base = G.row0 + k * G.lapLen, hard = G.song.lvl === 2, R = G.rng;
  for(let i = 0; i < ev.length; i++){
    const e = ev[i], isHold = e.d >= hold, len = isHold ? e.d : 1, notes = hard ? e.n.slice(0, 2) : [e.n[0]];
    let lane;
    const m = notes[0];
    if(prevLane < 0) lane = Math.floor(R() * 4);
    else {
      const up = m > prevMidi, down = m < prevMidi, opts = [];
      for(let l = 0; l < 4; l++){ if(l === prevLane) continue; if(up && l < prevLane && prevLane < 3) continue; if(down && l > prevLane && prevLane > 0) continue; opts.push(l); }
      lane = opts.length ? opts[Math.floor(R() * opts.length)] : (prevLane + 1 + Math.floor(R() * 3)) % 4;
    }
    G.tiles.push(mkTile(base + e.t, len, isHold, lane, m, k, k === 0 && i === 0));
    if(notes.length > 1){ let l2 = (lane + 1 + Math.floor(R() * 3)) % 4; if(l2 === prevLane) l2 = (l2 + 1) % 4; if(l2 === lane) l2 = (l2 + 1) % 4; G.tiles.push(mkTile(base + e.t, len, isHold, l2, notes[1], k, false)); }
    prevLane = lane; prevMidi = m;
  }
}
function mkTile(row, len, hold, lane, midi, lap, first){ return { row, len, hold, lane, midi, lap, first, st:0, j:0, at:0, fill:0, voice:null, pid:null, bot:0 }; }

/* ---------- pools: sparkles and floating words (made once) ---------- */
const SP = []; for(let i = 0; i < 160; i++) SP.push({ on:false, x:0, y:0, vx:0, vy:0, life:0, max:1, col:'#fff', s:3 });
let spI = 0;
function sparkle(x, y, col, n){
  for(let k = 0; k < n; k++){
    const p = SP[spI]; spI = (spI + 1) % SP.length;
    const a = Math.random() * Math.PI * 2, v = 60 + Math.random() * 220;
    p.on = true; p.x = x; p.y = y; p.vx = Math.cos(a) * v; p.vy = Math.sin(a) * v - 80; p.life = p.max = 0.45 + Math.random() * 0.35; p.col = col; p.s = 2 + Math.random() * 4;
  }
}
const TX = []; for(let i = 0; i < 8; i++) TX.push({ on:false, t:'', x:0, y:0, life:0, max:1, col:'#fff', size:28 });
let txI = 1;
/* slot 0 is the PERFECT/GREAT/OK word (a new one replaces the old), the others are a small ring */
function word(t, x, y, col, size, life, slot0){ const p = slot0 ? TX[0] : TX[txI]; if(!slot0) txI = txI + 1 >= TX.length ? 1 : txI + 1; p.on = true; p.t = t; p.x = x; p.y = y; p.col = col; p.size = size; p.life = p.max = life || 0.7; }
const JUDGE = ['', 'OK', 'GREAT', 'PERFECT'], JCOL = ['', '#9ff7cf', '#6fd3ff', '#ffe07a'];

/* ---------- HUD (DOM, written only when something changes) ---------- */
const hud = { score:-1, combo:-1, hearts:-1, prog:-1, marks:'', mode:'' };
function hudReset(){ hud.score = hud.combo = hud.hearts = hud.prog = -1; hud.marks = ''; hud.mode = ''; }
function hudUpdate(){
  if(hud.score !== G.score){ hud.score = G.score; $('#score').textContent = N(G.score); }
  if(hud.combo !== G.combo){ const el = $('#combo'); const up = G.combo > hud.combo; hud.combo = G.combo; el.textContent = G.combo >= 2 ? 'x' + N(G.combo) : ''; if(up && G.combo >= 2){ el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop'); } }
  if(hud.hearts !== G.hearts){ const sp = $('#hearts').children; for(let i = 0; i < 3; i++){ const lost = i >= G.hearts; sp[i].textContent = lost ? '🤍' : '❤️'; sp[i].classList.toggle('lost', lost); } hud.hearts = G.hearts; }
  // progress: lap 0 → ⭐⭐⭐, later laps → 👑👑👑
  const len = G.b ? G.b.mel.len : 1, into = G.s - G.row0;
  let p, mode;
  if(!G.endless || into < G.lapLen){ p = clamp(into / len, 0, 1); mode = 'st'; }
  else { p = clamp(((into - G.lapLen) / G.lapLen) / 3, 0, 1); mode = 'cr'; }
  const pr = Math.round(p * 500);
  if(pr !== hud.prog){ hud.prog = pr; $('#progFill').style.transform = 'scaleX(' + (pr / 500) + ')'; }
  const marks = mode + (mode === 'st' ? G.stars : G.crowns);
  if(marks !== hud.marks){
    hud.marks = marks;
    for(let i = 0; i < 3; i++){
      const el = $('#mk' + i); el.textContent = mode === 'st' ? '⭐' : '👑'; el.style.left = i === 2 ? 'calc(100% - 12px)' : ((i + 1) / 3 * 100) + '%';
      el.classList.toggle('on', mode === 'st' ? G.stars > i : G.crowns > i);
    }
  }
}

/* ---------- starting a song ---------- */
function startSong(i, o){
  o = o || {};
  const song = SONGS[i]; if(!song) return;
  A.resume();
  G.idx = i; G.song = song; G.b = PianoSongs.build(song); G.vs = o.vs || null; G.endless = !G.vs && !!(o.endless != null ? o.endless : store.get('endless', false));
  G.seed = o.seed || ((Math.random() * 1e9) >>> 0); G.rng = mulberry(G.seed); prevLane = -1; prevMidi = 0;
  G.tiles = []; G.ti = 0; G.lap = 0; G.lapLen = G.b.mel.len + 3; G.row0 = 0;
  G.baseV = song.tempo / 60; G.v = G.baseV; G.beatRows = song.tempo >= 230 ? 4 : song.tempo >= 140 ? 2 : 1;
  addLap(0); if(G.endless) addLap(1);
  G.hearts = 3; G.revived = false; G.score = G.combo = G.maxCombo = G.perfect = G.great = G.ok = G.miss = 0; G.stars = G.crowns = 0;
  G.accI = 0; G.accLap = 0; G.lastBeatRow = 0; G.holds.clear(); G.finished = false; G.awarded = false; G.result = null; G.endT = 0;
  for(const p of SP) p.on = false; for(const p of TX) p.on = false;
  G.bot = G.vs === 'bot' ? mkBot() : null;
  hudReset(); show(null); $('#hud').hidden = false; $('#opp').hidden = !G.vs; $('#btnMute').hidden = true;
  if(G.vs){ oppReset(); G.moving = false; G.s = G.row0 - 2.6; countdown(3, () => { G.moving = true; G.t0 = performance.now(); G.s0 = G.s; }); G.state = 'count'; }
  else { G.state = 'play'; G.moving = false; G.s = G.row0 - 0.6; }
  hudUpdate();
}
let cdTimer = 0;
function countdown(n, done){
  clearInterval(cdTimer);
  const el = $('#count'); el.hidden = false;
  const step = () => {
    if(n <= 0){ clearInterval(cdTimer); el.textContent = T('يلّا!', 'Go!', 'Başla!'); el.classList.remove('go'); void el.offsetWidth; el.classList.add('go'); A.sfx('go'); setTimeout(() => { if(el.textContent === T('يلّا!', 'Go!', 'Başla!')) el.hidden = true; }, 500); G.state = 'play'; done(); return; }
    el.textContent = N(n); el.classList.remove('go'); void el.offsetWidth; el.classList.add('go'); A.sfx('count'); n--;
  };
  step(); cdTimer = setInterval(step, Math.max(150, 800 / G.ts));
}

/* ---------- playing ---------- */
function laneHit(lane, x, pid){
  if(G.state !== 'play') return;
  const t = pick(lane);
  let tile = t;
  // a tap close to the next lane's edge also counts for a tile there (small fingers!)
  if(!tile && x != null){
    const fx = x / laneW - lane;
    if(fx < 0.22 && lane > 0) tile = pick(lane - 1); else if(fx > 0.78 && lane < 3) tile = pick(lane + 1);
  }
  if(tile){ hitTile(tile, pid); return; }
  if(!G.moving) return;
  // an empty lane: only counts when a tile is waiting to be tapped (taps during a pause in the song are free)
  let waiting = false;
  for(let i = G.ti; i < G.tiles.length; i++){ const q = G.tiles[i]; if(q.row - G.s > -WIN_EARLY) break; if(q.st === 0){ const d = G.s - q.row; if(d > -1.4 && d < WIN_LATE){ waiting = true; break; } } }
  if(!waiting) return;
  G.flashBad[lane] = 1;
  bad();
}
function pick(lane){
  let best = null;
  for(let i = G.ti; i < G.tiles.length; i++){
    const q = G.tiles[i]; if(q.row - G.s > -WIN_EARLY) break;
    if(q.st !== 0 || q.lane !== lane) continue;
    const d = G.s - q.row; if(d < WIN_EARLY || d > WIN_LATE) continue;
    if(!G.moving && !q.first) continue;
    if(!best || q.row < best.row) best = q;
  }
  return best;
}
function hitTile(q, pid){
  const d = G.s - q.row, ad = Math.abs(d);
  let j = ad <= 0.35 ? 3 : ad <= 0.8 ? 2 : 1;
  if(!G.moving){ G.moving = true; j = 3; G.t0 = performance.now(); G.s0 = G.s; }
  q.st = q.hold ? 3 : 1; q.j = j; q.at = G.t;
  G.score += j; G.combo++; if(G.combo > G.maxCombo) G.maxCombo = G.combo;
  if(j === 3) G.perfect++; else if(j === 2) G.great++; else G.ok++;
  const v = A.note(q.midi, 0.7 + j * 0.09, q.hold);
  if(q.hold){ q.voice = v; q.pid = pid; q.fill = clamp(d, 0, q.len); G.holds.set(pid, q); }
  const x = (q.lane + 0.5) * laneW, y = Math.min(hitY, hitY + d * rowH) - rowH * 0.5;
  sparkle(x, y, theme.tile.glow, j === 3 ? 14 : 8);
  word(JUDGE[j], W / 2, hitY - rowH * 1.55, JCOL[j], j === 3 ? 34 : 30, 0.6, true);
  G.flash[q.lane] = 1;
  if(G.combo > 0 && G.combo % 25 === 0){ word('x' + N(G.combo) + ' 🔥', W / 2, H * 0.36, '#ff9ac8', 40, 1); A.sfx('star'); }
}
function endHold(q, full){
  if(q.st !== 3) return;
  q.st = 4; q.at = G.t;
  if(q.voice){ q.voice.release(); q.voice = null; }
  G.holds.delete(q.pid);
  const got = full ? q.len - 1 + 2 : Math.floor(q.fill * 0.5);
  if(got > 0){ G.score += got; word('+' + N(got), (q.lane + 0.5) * laneW, hitY - rowH * 0.9, '#fff', 28, 0.6); }
  if(full) sparkle((q.lane + 0.5) * laneW, hitY - rowH * 0.4, theme.tile.fill, 12);
}
function release(pid){ const q = G.holds.get(pid); if(q) endHold(q, q.fill >= q.len - 0.6); }
function missTile(q){
  q.st = 2; q.at = G.t; G.miss++;
  bad();
}
function bad(){
  G.combo = 0;
  if(G.t - G.lastBad < 0.5) return;     // two mistakes at the same moment cost one heart
  G.lastBad = G.t;
  A.boop();
  G.hearts--;
  if(G.hearts <= 0){ G.hearts = 0; outOfHearts(); }
}
function outOfHearts(){
  for(const q of G.holds.values()) endHold(q, false);
  if(G.vs || G.revived){ finish(); return; }
  G.state = 'revive'; A.stopAll();
  show('revive');
  let n = 5; const ring = $('#revRing'), num = $('#revN');
  const tick = () => { num.textContent = N(n); ring.style.setProperty('--p', n / 5); };
  tick(); clearInterval(G.revT);
  G.revT = setInterval(() => { n--; if(n < 0){ clearInterval(G.revT); if(G.state === 'revive') finish(); return; } tick(); }, Math.max(150, 1000 / G.ts));
}
function revive(){
  if(G.state !== 'revive') return;
  clearInterval(G.revT); G.revived = true; G.hearts = 3;
  // the board goes back so the next tile waits above the line; tiles that already passed disappear
  let next = null;
  for(let i = G.ti; i < G.tiles.length; i++){ const q = G.tiles[i]; if(q.st === 0){ next = q; break; } }
  for(let i = G.ti; i < G.tiles.length; i++){ const q = G.tiles[i]; if(q.st === 2) q.st = 5; }
  if(next) G.s = Math.min(G.s, next.row - 2.2);
  G.accI = -1;  // find the accompaniment again
  show(null); G.state = 'count';
  countdown(3, () => {});
}
function finish(){
  if(G.finished) return;
  G.finished = true; G.state = 'over'; G.endT = 0;
  for(const q of G.holds.values()) endHold(q, false);
  A.stopAll();
  const len = G.b.mel.len;
  G.stars = clamp(Math.floor(((G.s - G.row0) / len) * 3 + 1e-6), 0, 3);
  if(G.hearts > 0 && !G.endless) G.stars = 3;
  if(G.vs){ vsFinish(); return; }
  const b = best(), old = b[G.song.id] || { s:0, st:0, cr:0 }, isBest = G.score > old.s;
  b[G.song.id] = { s:Math.max(old.s, G.score), st:Math.max(old.st, G.stars), cr:Math.max(old.cr || 0, G.crowns) };
  store.set('best', b);
  const coins = G.awarded ? 0 : giveCoins(G.stars * 2 + G.crowns * 3 + (G.stars === 3 && G.miss === 0 ? 3 : 0));
  G.awarded = true;
  try{ if(window.World && World.track) World.track(G.stars === 3 ? 'win' : 'play', 'piano'); }catch(e){}
  G.result = { stars:G.stars, crowns:G.crowns, score:G.score, best:Math.max(old.s, G.score), isBest:isBest && old.s > 0, perfect:G.perfect, combo:G.maxCombo, coins, miss:G.miss, song:G.song.id };
  A.sfx(G.stars === 3 ? 'win' : 'end');
  setTimeout(() => { if(G.state === 'over' && !G.vs) showResult(); }, Math.max(100, 900 / G.ts));
}

function update(dt){
  if(G.moving){
    if(G.vs === 'net' && G.t0){ G.s = G.s0 + (performance.now() - G.t0) / 1000 * G.baseV * G.ts; }
    else G.s += G.v * dt;
  }
  const s = G.s;
  // laps (endless)
  if(G.endless){
    const lap = Math.max(0, Math.floor((s - G.row0) / G.lapLen));
    if(lap !== G.lap){
      if(lap > G.lap && lap >= 2 && lap - 1 > G.crowns){ G.crowns = Math.min(99, lap - 1); word('👑', W / 2, H * 0.35, '#ffe07a', 64, 1.2); A.sfx('crown'); }
      G.lap = lap; G.v = G.baseV * lapSpeed(lap);
    }
    if(s - G.row0 > (G.tiles.length ? G.tiles[G.tiles.length - 1].lap : 0) * G.lapLen + G.lapLen * 0.4) addLap(G.tiles[G.tiles.length - 1].lap + 1);
  }
  // stars along the first lap
  const st = clamp(Math.floor(((s - G.row0) / G.b.mel.len) * 3 + 1e-6), 0, 3);
  if(st > G.stars && G.moving){ G.stars = st; A.sfx('star'); word('⭐', W / 2, H * 0.35, '#ffe07a', 60, 1); }
  // tiles
  let firstOpen = -1;
  for(let i = G.ti; i < G.tiles.length; i++){
    const q = G.tiles[i], d = s - q.row;
    if(d < -6) break;
    if(q.st === 0){
      if(G.auto && G.moving && d >= -0.12) hitTile(q, -1 - q.lane);
      else if(!G.moving && G.auto && q.first) hitTile(q, -1 - q.lane);
      else if(d > WIN_LATE && G.moving){ missTile(q); if(G.state !== 'play') return; }
    }
    if(q.st === 3){
      q.fill = clamp(d, 0, q.len);
      if(q.fill >= q.len - 0.15) endHold(q, true);
    }
    if(firstOpen < 0 && (q.st === 0 || q.st === 3 || d < q.len + 3)) firstOpen = i;
  }
  if(firstOpen > G.ti) G.ti = firstOpen;
  // bot opponent
  if(G.bot) botStep();
  // the soft accompaniment
  if(G.moving && !A.muted) accomp();
  // beat pulse for the backgrounds
  const br = Math.floor(s / G.beatRows);
  if(br !== G.lastBeatRow){ G.lastBeatRow = br; G.pulse = 1; }
  // the end of the song
  if(!G.endless && s > G.row0 + G.b.mel.len + 0.5){
    let open = false; for(let i = G.ti; i < G.tiles.length; i++){ const q = G.tiles[i]; if(q.st === 0 || q.st === 3){ open = true; break; } }
    if(!open){ G.endT += dt; if(G.endT > 0.4) finish(); }
  }
}
function accomp(){
  const ev = G.b.acc; if(!ev.length || !A.ctx) return;
  const look = G.v * 0.3;
  if(G.accI < 0){ // find where we are
    const into = G.s - G.row0, lap = G.endless ? Math.max(0, Math.floor(into / G.lapLen)) : 0, tin = into - lap * G.lapLen;
    G.accLap = lap; G.accI = 0; while(G.accI < ev.length && ev[G.accI].t < tin) G.accI++;
  }
  for(let guard = 0; guard < 8; guard++){
    if(G.accI >= ev.length){ if(!G.endless) return; G.accLap++; G.accI = 0; }
    const e = ev[G.accI], row = G.row0 + G.accLap * G.lapLen + e.t;
    if(row > G.s + look) return;
    G.accI++;
    if(row < G.s - 0.3) continue;
    const vv = G.v;
    A.acc(e.n, A.now() + Math.max(0, (row - G.s) / vv / G.ts), e.v * 0.8, e.d / vv / G.ts);
  }
}

/* ---------- drawing ---------- */
let last = performance.now();
function frame(now){
  requestAnimationFrame(frame);
  let dt = (now - last) / 1000; last = now;
  dt = Math.min(dt, G.vs === 'net' ? 5 : 0.05) * G.ts;
  G.t += dt; G.menuT += dt;
  G.pulse = Math.max(0, G.pulse - dt * 3);
  if(G.state === 'play') update(dt);
  else if(G.state === 'menu' && Math.floor(G.menuT * 2) !== G.lastBeatRow){ G.lastBeatRow = Math.floor(G.menuT * 2); G.pulse = 1; }
  mpFrame(dt);
  if(G.state === 'play' || G.state === 'over' || G.state === 'count' || G.state === 'pause' || G.state === 'revive') hudUpdate();
  draw(dt);
}
function draw(dt){
  const c = ctx;
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.drawImage(bgc, 0, 0);
  c.setTransform(DPR, 0, 0, DPR, 0, 0);
  const t = G.t;
  try{ theme.anim(c, W, H, t, G.pulse, P); }catch(e){}
  drawHero(c, t);
  const inGame = G.state !== 'menu';
  // lanes
  c.fillStyle = theme.lane;
  for(let l = 0; l < 4; l++) if(l % 2 === 0) c.fillRect(l * laneW, 0, laneW, H);
  c.fillStyle = theme.div;
  for(let l = 1; l < 4; l++) c.fillRect(l * laneW - 1, 0, 2, H);
  for(let l = 0; l < 4; l++){
    if(G.flash[l] > 0){ c.globalAlpha = G.flash[l] * 0.35; c.fillStyle = '#fff'; c.fillRect(l * laneW, 0, laneW, H); G.flash[l] = Math.max(0, G.flash[l] - dt * 4); }
    if(G.flashBad[l] > 0){ c.globalAlpha = G.flashBad[l] * 0.4; c.fillStyle = '#ff4f6a'; c.fillRect(l * laneW, 0, laneW, H); G.flashBad[l] = Math.max(0, G.flashBad[l] - dt * 3); }
  }
  c.globalAlpha = 1;
  // the line
  c.globalAlpha = 0.25 + G.pulse * 0.2; c.fillStyle = theme.line; c.fillRect(0, hitY - 9, W, 18);
  c.globalAlpha = 1; c.fillRect(0, hitY - 2.5, W, 5);
  if(inGame) drawTiles(c);
  // sparkles
  for(let i = 0; i < SP.length; i++){
    const p = SP[i]; if(!p.on) continue;
    p.life -= dt; if(p.life <= 0){ p.on = false; continue; }
    p.vy += 500 * dt; p.x += p.vx * dt; p.y += p.vy * dt;
    c.globalAlpha = p.life / p.max; c.fillStyle = p.col; c.fillRect(p.x - p.s / 2, p.y - p.s / 2, p.s, p.s);
  }
  c.globalAlpha = 1;
  // words
  c.textAlign = 'center'; c.textBaseline = 'middle';
  for(let i = 0; i < TX.length; i++){
    const p = TX[i]; if(!p.on) continue;
    p.life -= dt; if(p.life <= 0){ p.on = false; continue; }
    const k = p.life / p.max, sc = 1 + (1 - k) * 0.15 + (k > 0.85 ? (k - 0.85) * 3 : 0);
    c.globalAlpha = Math.min(1, k * 2.5);
    c.font = fontOf(p.size * sc);
    c.lineWidth = 6; c.strokeStyle = 'rgba(40,10,80,.75)'; c.strokeText(p.t, p.x, p.y - (1 - k) * 20);
    c.fillStyle = p.col; c.fillText(p.t, p.x, p.y - (1 - k) * 20);
  }
  c.globalAlpha = 1;
}
const FONTS = [], START_TXT = '▶ ' + T('ابدأ', 'Start', 'Başla');
function fontOf(px){ const k = Math.max(8, Math.min(120, Math.round(px))); return FONTS[k] || (FONTS[k] = '800 ' + k + 'px "Baloo Bhaijaan 2","Tajawal",system-ui,sans-serif'); }
function drawHero(c, t){
  const im = heroImg[theme.hero]; if(!im || !im.complete || !im.naturalWidth) return;
  const h = H * 0.17, w = h * im.naturalWidth / im.naturalHeight, x = W - w * 0.62, y = H - h * 0.98;
  const sq = G.pulse * 0.05;
  c.save(); c.translate(x, y + h); c.rotate(Math.sin(t * 2.2) * 0.06); c.scale(1 + sq, 1 - sq);
  c.drawImage(im, -w / 2, -h - G.pulse * 6, w, h);
  c.restore();
}
function drawTiles(c){
  const s = G.s, tw = laneW - 6, edge = theme.tile.edge;
  for(let i = G.ti; i < G.tiles.length; i++){
    const q = G.tiles[i], top = hitY + (s - q.row - q.len) * rowH;
    if(top > H + 10) continue;
    const bottom = hitY + (s - q.row) * rowH;
    if(bottom < -10) break;
    const x = q.lane * laneW + 3, h = q.len * rowH;
    if(q.st === 5) continue;
    if(q.st === 1){ // tapped: fades away
      const k = 1 - (G.t - q.at) / 0.3; if(k <= 0) continue;
      c.globalAlpha = k * 0.6; c.drawImage(tileC, x, top + 2, tw, rowH - 4);
      c.globalAlpha = k * 0.5; c.fillStyle = '#fff'; PianoThemes.rr(c, x, top + 2, tw, rowH - 4, 14); c.fill();
      c.globalAlpha = 1; continue;
    }
    if(q.st === 2){ // missed: blinks red
      const k = (G.t - q.at); if(k > 1.2) continue;
      c.globalAlpha = 0.85 * (Math.floor(k * 6) % 2 ? 0.4 : 1); c.fillStyle = '#ff4f6a'; PianoThemes.rr(c, x, top + 2, tw, h - 4, 14); c.fill(); c.globalAlpha = 1; continue;
    }
    if(!q.hold){
      c.drawImage(tileC, x, top + 2, tw, rowH - 4);
      if(q.first && !G.moving){
        c.fillStyle = '#fff'; c.textAlign = 'center'; c.textBaseline = 'middle';
        c.font = fontOf(Math.min(tw * 0.22, 26) * (1 + Math.sin(G.t * 6) * 0.06));
        c.fillText(START_TXT, x + tw / 2, top + rowH * 0.5);
      }
      continue;
    }
    // hold tile: body, the rising fill, the round «hold here» head
    const done = q.st === 4;
    c.globalAlpha = done ? 0.45 : 1;
    c.fillStyle = theme.tile.hold; PianoThemes.rr(c, x, top + 2, tw, h - 4, 16); c.fill();
    c.lineWidth = 3; c.strokeStyle = edge; c.stroke();
    c.fillStyle = 'rgba(255,255,255,.25)'; c.fillRect(x + tw / 2 - 1.5, top + 14, 3, h - rowH * 0.5 - 14);
    if(q.st === 3 || done){
      const fh = Math.max(0, (done ? q.len : q.fill) * rowH);
      c.globalAlpha = done ? 0.5 : 0.9; c.fillStyle = theme.tile.fill; PianoThemes.rr(c, x + 4, bottom - fh - 2, tw - 8, Math.max(8, fh - 4), 12); c.fill();
      c.globalAlpha = 1;
      if(!done){ c.fillStyle = '#fff'; c.fillRect(x + 4, bottom - fh - 4, tw - 8, 4); }
    }
    c.globalAlpha = done ? 0.45 : 1;
    const hx = x + tw / 2, hy = bottom - rowH * 0.42, r = Math.min(tw, rowH) * 0.2;
    c.fillStyle = edge; c.beginPath(); c.arc(hx, hy, r + 3, 0, 6.2832); c.fill();
    c.fillStyle = q.st === 3 ? theme.tile.fill : theme.tile.a; c.beginPath(); c.arc(hx, hy, r, 0, 6.2832); c.fill();
    c.globalAlpha = 1;
  }
}

/* ---------- input ---------- */
cv.addEventListener('pointerdown', e => {
  e.preventDefault();
  A.resume();
  if(G.state !== 'play') return;
  const lane = clamp(Math.floor(e.clientX / laneW), 0, 3);
  laneHit(lane, e.clientX, e.pointerId);
}, { passive:false });
const up = e => { if(G.state === 'play' || G.state === 'over') release(e.pointerId); };
cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up); cv.addEventListener('pointerleave', up);
addEventListener('keydown', e => {
  const k = { d:0, f:1, j:2, k:3, '1':0, '2':1, '3':2, '4':3 }[e.key];
  if(k != null && !e.repeat && G.state === 'play'){ A.resume(); laneHit(k, (k + 0.5) * laneW, 'k' + k); }
  else if(e.key === 'Escape' && G.state === 'play') pause();
});
addEventListener('keyup', e => { const k = { d:0, f:1, j:2, k:3, '1':0, '2':1, '3':2, '4':3 }[e.key]; if(k != null) release('k' + k); });

/* ---------- screens ---------- */
const OVERLAYS = ['menu', 'songs', 'themes', 'pause', 'revive', 'result', 'mp'];
function show(id){ OVERLAYS.forEach(o => { $('#' + o).hidden = o !== id; }); }
function toMenu(){
  clearInterval(cdTimer); clearInterval(G.revT); $('#count').hidden = true;
  if(G.vs === 'net' && mpActive()){ /* stays in the room */ }
  for(const q of G.holds.values()) endHold(q, false);
  A.stopAll();
  G.state = 'menu'; G.vs = null; G.moving = false; G.tiles = []; G.bot = null;
  $('#hud').hidden = true; $('#btnMute').hidden = false;
  $('#menuStars').textContent = '⭐ ' + N(totalStars());
  $('#menuCoins').textContent = '🪙 ' + N(window.World ? World.coins : 0);
  show('menu');
}
function openSongs(){
  toMenu(); show('songs');
  $('#songStars').textContent = '⭐ ' + N(totalStars());
  $('#btnEndless').classList.toggle('on', !!store.get('endless', false));
  const el = $('#songList'); el.innerHTML = '';
  SONGS.forEach((s, i) => {
    const b = bestOf(s.id), open = songOpen(i), bt = document.createElement('button');
    bt.className = 'song' + (open ? '' : ' lock'); bt.dataset.id = s.id;
    const stars = [0, 1, 2].map(k => k < b.st ? '<i>★</i>' : '★').join('') + (b.cr ? ' ' + '👑'.repeat(Math.min(3, b.cr)) : '');
    bt.innerHTML = `<span class="em">${s.em}</span><span class="tx"><b></b><small></small><span class="lv lv${s.lvl}">${LVL[s.lvl]}</span></span>` +
      (open ? `<span class="sc"><span class="st">${stars}</span><small>${b.s ? N(b.s) : ''}</small></span>` : `<span class="sc">🔒 ⭐${N(needFor(i))}</span>`);
    bt.querySelector('b').textContent = tr3(s.t);
    bt.querySelector('small').textContent = s.by ? '🎼 ' + tr3(s.by) : (s.mine ? '💜 ' + T('لحن بوبو', 'A Bobo tune', 'Bobo ezgisi') : '🎈 ' + T('لحن شعبي للأطفال', "Traditional children's tune", 'Geleneksel çocuk ezgisi'));
    bt.onclick = () => {
      A.resume(); A.sfx('click');
      if(!open){ toast('🔒 ' + T('اجمع ', 'Collect ', '') + N(needFor(i)) + ' ⭐ ' + T('لتفتحها', 'to open it', 'yıldız topla, açılsın')); return; }
      startSong(i);
    };
    el.appendChild(bt);
  });
}
function openThemes(){
  toMenu(); show('themes');
  $('#themeStars').textContent = '⭐ ' + N(totalStars());
  const el = $('#themeList'); el.innerHTML = '';
  THEMES.forEach(th => {
    const open = themeOpen(th), bt = document.createElement('button');
    bt.className = 'theme' + (th === theme ? ' on' : ''); bt.dataset.id = th.id;
    const pc = document.createElement('canvas'); pc.width = 180; pc.height = 240;
    const c = pc.getContext('2d');
    try{ th.paint(c, 180, 240); th.anim(c, 180, 240, 2, 0.5, th.init(180, 240)); }catch(e){}
    const b = document.createElement('b'); b.textContent = th.em + ' ' + tr3(th.name);
    bt.appendChild(pc); bt.appendChild(b);
    if(!open){ const lk = document.createElement('span'); lk.className = 'lk'; lk.textContent = '🔒 ⭐' + N(th.need); bt.appendChild(lk); }
    else if(th === theme){ const ok = document.createElement('span'); ok.className = 'ok'; ok.textContent = '✅'; bt.appendChild(ok); }
    bt.onclick = () => {
      A.resume(); A.sfx('click');
      if(!open){ toast('🔒 ' + T('اجمع ', 'Collect ', '') + N(th.need) + ' ⭐ ' + T('لتفتحها', 'to open it', 'yıldız topla, açılsın')); return; }
      setTheme(th.id); openThemes();
    };
    el.appendChild(bt);
  });
}
function setTheme(id){ const th = THEMES.find(t => t.id === id); if(!th) return; theme = th; store.set('theme', id); paintTheme(); }
function pause(){
  if(G.state !== 'play' && G.state !== 'count') return;
  $('#pauseInfo').textContent = G.vs === 'net' ? T('التحدّي مكمّل! ارجع بسرعة ⚔️', 'The challenge goes on! Come back quick ⚔️', 'Düello devam ediyor! Çabuk dön ⚔️') : tr3(G.song.t) + '  •  ' + N(G.score);
  $('#btnRestart').hidden = !!G.vs;
  $('#btnPauseMute').textContent = A.muted ? '🔇' : '🔊';
  if(G.vs === 'net'){ show('pause'); return; }
  G.pausedFrom = G.state; G.state = 'pause'; clearInterval(cdTimer); $('#count').hidden = true;
  for(const q of G.holds.values()) endHold(q, false);
  A.stopAll();
  show('pause');
}
function resume(){
  if(G.vs === 'net'){ show(null); return; }
  if(G.state !== 'pause') return;
  A.resume(); show(null); G.accI = -1;
  if(G.moving){ G.state = 'count'; countdown(3, () => {}); }
  else if(G.vs){ G.state = 'count'; countdown(3, () => { G.moving = true; }); }
  else G.state = 'play';
}
function showResult(){
  const r = G.result; if(!r) return;
  show('result');
  $('#resTitle').textContent = r.stars === 3 ? T('برافو! 🎉', 'Bravo! 🎉', 'Bravo! 🎉') : r.stars > 0 ? T('حلو كتير! 👏', 'Very nice! 👏', 'Çok güzel! 👏') : T('جرّب كمان مرة 💪', 'Try again 💪', 'Tekrar dene 💪');
  $('#resSong').textContent = G.song.em + ' ' + tr3(G.song.t);
  [...$('#resStars').children].forEach((el, i) => el.classList.toggle('on', i < r.stars));
  const cr = $('#resCrowns'); cr.hidden = !r.crowns; cr.textContent = '👑'.repeat(Math.min(3, r.crowns)) + (r.crowns > 3 ? ' x' + N(r.crowns) : '');
  $('#newBest').hidden = !r.isBest;
  $('#rScore').textContent = N(r.score); $('#rBest').textContent = N(r.best); $('#rPerfect').textContent = N(r.perfect); $('#rCombo').textContent = N(r.combo); $('#rCoins').textContent = '+' + N(r.coins);
  const nx = G.idx + 1, canNext = nx < SONGS.length && songOpen(nx);
  const bn = $('#btnNext');
  bn.textContent = canNext ? T('الأغنية الجاية ▶', 'Next song ▶', 'Sonraki şarkı ▶') : T('مرة كمان 🔁', 'Again 🔁', 'Tekrar 🔁');
  bn.onclick = () => { A.sfx('click'); startSong(canNext ? nx : G.idx); };
}
let toastT = 0;
function toast(msg, ms){ const el = $('#toast'); el.textContent = msg; el.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => { el.hidden = true; }, ms || 3000); }
function setMute(m){ A.mute(m); store.set('muted', m); $('#muteX').hidden = !m; $('#muteWave').style.display = m ? 'none' : ''; $('#btnPauseMute').textContent = m ? '🔇' : '🔊'; }

$('#btnSongs').onclick = () => { A.resume(); A.sfx('click'); openSongs(); };
$('#btnThemes').onclick = () => { A.resume(); A.sfx('click'); openThemes(); };
$('#btnVs').onclick = () => { A.resume(); A.sfx('click'); mpMenu(); };
$('#btnEndless').onclick = () => { A.sfx('click'); store.set('endless', !store.get('endless', false)); $('#btnEndless').classList.toggle('on', !!store.get('endless', false)); toast(store.get('endless', false) ? T('♾️ بلا نهاية: الأغنية بتتكرر وبتسرع، وكل دورة 👑', '♾️ Endless: the song repeats faster — a 👑 every lap', '♾️ Sonsuz: şarkı hızlanarak tekrarlar — her turda 👑') : T('♾️ بلا نهاية: مطفي', '♾️ Endless: off', '♾️ Sonsuz: kapalı')); };
$('#btnPause').onclick = e => { e.stopPropagation(); A.sfx('click'); pause(); };
$('#btnResume').onclick = () => { A.sfx('click'); resume(); };
$('#btnRestart').onclick = () => { A.sfx('click'); startSong(G.idx); };
$('#btnPauseSongs').onclick = () => { A.sfx('click'); if(G.vs === 'net') mpLeave(); openSongs(); };
$('#btnPauseMute').onclick = () => setMute(!A.muted);
$('#btnExit').onclick = () => { if(G.vs === 'net') mpLeave(); location.href = '../'; };
$('#btnRevive').onclick = () => { A.sfx('click'); revive(); };
$('#btnNoRevive').onclick = () => { A.sfx('click'); clearInterval(G.revT); finish(); };
$('#btnAgain').onclick = () => { A.sfx('click'); startSong(G.idx); };
$('#btnResSongs').onclick = () => { A.sfx('click'); openSongs(); };
$('#btnMute').onclick = () => { A.resume(); setMute(!A.muted); };
document.addEventListener('visibilitychange', () => {
  if(document.hidden){ if(G.state === 'play' || G.state === 'count') pause(); A.stopAll(); A.suspend(); }
  else if(G.state !== 'pause') A.resume();
});

/* ======================================================================
   «تحدّى بوبو»: a bot on the same tiles. Each tile it reaches gets a roll: mostly PERFECT/GREAT, now and then a miss.
   ====================================================================== */
function mkBot(){
  const lvl = G.song.lvl, R = mulberry(G.seed ^ 0x5bd1e995);
  return { R, i:0, score:0, combo:0, hearts:3, done:false, pf:0, miss:[0.025, 0.035, 0.045][lvl], pp:[0.55, 0.5, 0.45][lvl] };
}
function botStep(){
  const B = G.bot; if(!B || B.done) return;
  const s = G.s;
  while(B.i < G.tiles.length){
    const q = G.tiles[B.i], off = (B.R() - 0.5) * 0.4;
    if(s - q.row < off && !G.finished) break;
    B.i++;
    if(B.R() < B.miss){ B.combo = 0; B.hearts--; if(B.hearts <= 0){ B.done = true; break; } continue; }
    const r = B.R(), j = r < B.pp ? 3 : r < B.pp + 0.33 ? 2 : 1;
    B.score += j + (q.hold ? q.len + 1 : 0); B.combo++; if(j === 3) B.pf++;
  }
  if(B.i >= G.tiles.length) B.done = true;
  oppShow(B.score, B.combo, Math.min(1, (s - G.row0) / G.b.mel.len), B.hearts);
}

/* ======================================================================
   «تحدّي مباشر»: 1-v-1 online room. Events: pos (live score, ~4/s), ev (song / start / fin / lobby).
   Presence meta: { fc, pl (hero), o, sg (host: the chosen song), ph }.
   ====================================================================== */
const MP_URL = 'https://vgpwtrzplggvlsuvqsas.supabase.co', MP_KEY = 'sb_publishable_D9thEhZlZnfn0t06j8h1Rw_H-LVF786';
const MP_EVENTS = ['pos', 'ev'], MP_MAX = 2, MP_LOCAL = Q.get('mp') === 'local', FR_GAME = 'piano';
function loadSupabase(){
  if(window.supabase && window.supabase.createClient) return Promise.resolve();
  if(loadSupabase.p) return loadSupabase.p;
  return (loadSupabase.p = new Promise((res, rej) => {
    const s = document.createElement('script'); s.src = '../supabase.js';
    s.onload = () => (window.supabase && window.supabase.createClient) ? res() : rej(new Error('no client'));
    s.onerror = () => { loadSupabase.p = null; s.remove(); rej(new Error('load')); };
    document.head.appendChild(s);
  }));
}
class SupabaseTransport{
  async open(code, id, h){
    if(navigator.onLine === false) throw new Error('offline');
    await loadSupabase();
    if(this.closed) throw new Error('cancelled');
    this.rt = window.BoboRT.open({ url:MP_URL, key:MP_KEY, topic:'bobo-piano-' + code, id, events:MP_EVENTS, eps:20, h });
    await this.rt.ready;
  }
  track(meta){ if(this.rt) this.rt.track(meta); }
  send(ev, payload){ if(this.rt) this.rt.send(ev, payload); }
  close(){ this.closed = true; if(this.rt){ this.rt.close(); this.rt = null; } }
}
/* ?mp=local: the same room between tabs of one browser (tests) */
class LocalTransport{
  open(code, id, h){
    this.id = id; this.h = h; this.meta = null; this.peers = new Map(); this.ready = false;
    const bc = this.bc = new BroadcastChannel('bobo-piano-' + code);
    bc.onmessage = e => {
      const m = e.data || {};
      if(m.k === 'hb'){ const old = this.peers.get(m.from), js = JSON.stringify(m.meta); this.peers.set(m.from, { meta:m.meta, js, last:Date.now() }); if(!old || old.js !== js) this.sync(); }
      else if(m.k === 'hello'){ if(this.meta) this.beat(); }
      else if(m.k === 'bye'){ if(this.peers.delete(m.from)) this.sync(); }
      else if(m.k === 'b') h.msg(m.ev, m.p);
    };
    this.iv = setInterval(() => { if(this.meta) this.beat(); const now = Date.now(); let ch = false; for(const [k, p] of this.peers) if(now - p.last > 6000){ this.peers.delete(k); ch = true; } if(ch) this.sync(); }, 1000);
    bc.postMessage({ k:'hello', from:id });
    return new Promise(res => setTimeout(() => { this.ready = true; res(); this.sync(); }, 400));
  }
  sync(){ if(!this.ready || !this.bc) return; const list = [...this.peers].map(([k, p]) => Object.assign({}, p.meta, { id:k })); if(this.meta) list.push(Object.assign({}, this.meta, { id:this.id })); this.h.presence(list); }
  beat(){ if(this.bc) this.bc.postMessage({ k:'hb', from:this.id, meta:this.meta }); }
  track(meta){ this.meta = Object.assign({}, meta); this.beat(); setTimeout(() => this.sync(), 0); }
  send(ev, p){ if(this.bc) this.bc.postMessage({ k:'b', ev, p }); }
  close(){ clearInterval(this.iv); if(this.bc){ if(this.meta) this.bc.postMessage({ k:'bye', from:this.id }); this.bc.close(); this.bc = null; } }
}
const MP = { t:null, id:null, code:null, list:[], players:[], meta:null, isHost:false, hostId:null, synced:false, screen:'off', tok:0, sendT:0,
  inviteFor:null, typed:'', song:'bobo', opp:null, oppFin:null, myFin:null, finT:0, finSent:0, waitT:0, result:null, botSong:'bobo', hostGone:0 };
window.__boboRoom = () => (MP.t && MP.meta && MP.code) ? MP.code : null;
const mpActive = () => !!(MP.t && MP.meta);
const mpNewId = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
const mpSort = (a, b) => ((a.o || 0) - (b.o || 0)) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
let frRoomCode = null, frRoomIv = 0;
function frRoom(code){
  try{
    if(!(window.Friends && Friends.has()) || code === frRoomCode) return;
    clearInterval(frRoomIv); frRoomIv = 0; frRoomCode = code;
    const safe = f => { try{ const p = f(); if(p && p.catch) p.catch(() => {}); }catch(e){} };
    if(code){ const beat = () => safe(() => Friends.setRoom(code, FR_GAME)); beat(); frRoomIv = setInterval(beat, 60000); }
    else safe(() => Friends.setRoom(null));
  }catch(e){}
}
addEventListener('pagehide', () => { try{ if(MP.t) mpLeave(); }catch(e){} try{ if(frRoomCode && window.Friends){ clearInterval(frRoomIv); frRoomIv = 0; frRoomCode = null; Friends.setRoom(null, null, true); } }catch(e){} });
function mpClose(){
  frRoom(null);
  if(MP.t){ try{ MP.t.close(); }catch(e){} }
  MP.t = null; MP.meta = null; MP.list = []; MP.players = []; MP.isHost = false; MP.hostId = null; MP.synced = false; MP.hostGone = 0;
}
async function mpOpen(code, how){
  mpClose();
  const t = MP_LOCAL ? new LocalTransport() : new SupabaseTransport(), tok = ++MP.tok;
  MP.t = t; MP.code = code; MP.id = MP.id || mpNewId();
  const live = () => MP.t === t && MP.tok === tok;
  try{
    await t.open(code, MP.id, {
      presence:list => { if(live()) mpPresence(list); },
      msg:(ev, p) => { if(live() && p && typeof p === 'object') mpMsg(ev, p); },
      status:s => { if(live() && s === 'up') mpTrack(); }
    });
  }catch(e){ if(live()) mpClose(); throw e; }
  if(!live()) throw new Error('cancelled');
  const t0 = performance.now();
  t.track({ ph:'probe' });
  await new Promise(res => { const chk = () => (MP.synced || performance.now() - t0 > 6000 || !live()) ? res() : setTimeout(chk, 40); chk(); });
  if(MP.synced) await new Promise(r => setTimeout(r, 300));
  if(!live()) throw new Error('cancelled');
  const others = MP.list.filter(p => p.id !== MP.id);
  if(how === 'create' && others.length){ mpClose(); return 'busy'; }
  if(how === 'join' && !others.length){ mpClose(); return 'nobody'; }
  if(others.length >= MP_MAX){ mpClose(); return 'full'; }
  MP.meta = { fc:window.BoboRT ? BoboRT.fc() : undefined, pl:myHero, o:others.reduce((m, p) => Math.max(m, p.o || 0), 0) + 1, ph:'play' };
  MP.hostId = how === 'create' ? MP.id : others.slice().sort(mpSort)[0].id;
  if(how === 'create'){ MP.song = songOk(MP.song) ? MP.song : 'bobo'; MP.meta.sg = MP.song; }
  t.track(MP.meta);
  mpPresence(MP.list);
  frRoom(code);
  return 'ok';
}
const songOk = id => SONGS.some((s, i) => s.id === id && songOpen(i));
function mpTrack(){ if(MP.t && MP.meta){ MP.meta.pl = myHero; if(MP.isHost) MP.meta.sg = MP.song; MP.t.track(MP.meta); } }
function mpSend(ev, p){ if(MP.t) MP.t.send(ev, Object.assign({ id:MP.id }, p)); }
function mpPresence(list){
  list = (list || []).filter(p => p && p.ph !== 'probe');
  if(window.BoboRT) BoboRT.see(list, () => { mpLobbyDraw(); oppHead(); if(MP.screen === 'end') vsResultDraw(); });
  MP.list = list; MP.synced = true;
  if(!MP.meta) return;
  const all = list.filter(p => p.id !== MP.id).concat([Object.assign({}, MP.meta, { id:MP.id })]).sort(mpSort);
  const before = MP.players.map(p => p.id);
  MP.players = all.slice(0, MP_MAX);
  MP.isHost = MP.hostId === MP.id;
  const host = MP.players.find(p => p.id === MP.hostId);
  if(!MP.isHost && host && SONGS.some(s => s.id === host.sg)) MP.song = host.sg;
  if(!MP.isHost && MP.hostId && !host){ if(!MP.hostGone) MP.hostGone = performance.now(); } else MP.hostGone = 0;
  if(before.length){
    const came = MP.players.some(p => p.id !== MP.id && !before.includes(p.id)), left = before.some(id => id !== MP.id && !MP.players.some(p => p.id === id));
    if(came){ A.sfx('star'); if(MP.screen === 'lobby') toast('👫 ' + T('صاحبك فات!', 'Your friend is here!', 'Arkadaşın geldi!')); }
    else if(left && (MP.screen === 'in' || MP.screen === 'end')){ toast('👋 ' + T('صاحبك طلع', 'Your friend left', 'Arkadaşın çıktı')); if(MP.screen === 'end') vsResultDraw(); }
  }
  oppHead();
  if(MP.screen === 'lobby') mpLobbyDraw();
}
const oppP = () => MP.players.find(p => p.id !== MP.id) || null;
function mpMsg(ev, p){
  if(ev === 'pos'){
    if(p.id === MP.id || !(MP.screen === 'in' || MP.screen === 'end')) return;
    MP.opp = { s:clamp(p.s | 0, 0, 99999), c:clamp(p.c | 0, 0, 9999), p:clamp(p.p | 0, 0, 1000) / 1000, h:clamp(p.h | 0, 0, 3), pf:clamp(p.pf | 0, 0, 9999), d:!!p.d };
    oppShow(MP.opp.s, MP.opp.c, MP.opp.p, MP.opp.h);
    const w = $('#waitOpp'); if(w) w.textContent = N(MP.opp.s);
  } else if(ev === 'ev'){
    if(p.k === 'start'){
      if(p.id !== MP.hostId) return;
      const i = SONGS.findIndex(s => s.id === p.song); if(i < 0) return;
      if(MP.screen === 'lobby' || MP.screen === 'end' || MP.screen === 'in') vsBegin(i, p.seed >>> 0);
    } else if(p.k === 'fin'){
      if(p.id === MP.id || MP.oppFin) return;
      MP.oppFin = { s:clamp(p.s | 0, 0, 99999), pf:clamp(p.pf | 0, 0, 9999), mc:clamp(p.mc | 0, 0, 9999) };
      oppShow(MP.oppFin.s, 0, 1, MP.opp ? MP.opp.h : 0);
      if(MP.screen === 'end') vsResultDraw();
    } else if(p.k === 'lobby'){
      if(p.id === MP.hostId && MP.screen === 'end') mpLobby();
    }
  }
}
function mpFrame(dt){
  if(!mpActive()) return;
  if(MP.hostGone && performance.now() - MP.hostGone > 3000 && (MP.screen === 'lobby')){ MP.hostGone = 0; mpLeave(); mpMenu(); toast('🚪 ' + T('صاحب الغرفة طلع', 'The room owner left', 'Oda sahibi çıktı'), 4000); return; }
  if(MP.screen === 'in' && (G.state === 'play' || G.state === 'count' || G.state === 'over')){
    MP.sendT -= dt / G.ts;
    if(MP.sendT <= 0){ MP.sendT = 0.25; mpSend('pos', { s:G.score, c:G.combo, p:Math.round(clamp((G.s - G.row0) / G.b.mel.len, 0, 1) * 1000), h:G.hearts, pf:G.perfect, d:G.finished ? 1 : 0 }); }
  }
  // my final score is sent a few times (the other phone may be busy)
  if(MP.myFin && MP.finSent < 8){ MP.finT -= dt / G.ts; if(MP.finT <= 0){ MP.finT = 1.5; MP.finSent++; mpSend('ev', Object.assign({ k:'fin' }, MP.myFin)); } }
  if(MP.screen === 'end' && !MP.result){ MP.waitT += dt / G.ts; if(MP.waitT > 30 || !oppP()) vsResultDraw(true); }
}
/* ----- room screens ----- */
const mpCard = () => $('#mpCard');
function faceCss(pid, B){
  if(pid === 'bot') return 'background-image:url("' + BOT_FACE + '");background-size:cover';
  const p = heroOf(pid), k = B / (p.r * 2.15);
  return 'background-image:url(../worlds/chars/' + p.id + '.png);background-size:' + (p.iw * k).toFixed(1) + 'px auto;background-position:' + (-(p.cx * k - B / 2)).toFixed(1) + 'px ' + (-(p.cy * k - B / 2) + 2).toFixed(1) + 'px';
}
function mpShow(screen){ MP.screen = screen; if(G.state !== 'menu') toMenu(); show('mp'); $('#btnMute').hidden = false; }
function chipsHtml(sel){
  return SONGS.map((s, i) => songOpen(i) ? `<button class="chip${s.id === sel ? ' on' : ''}" data-id="${s.id}"><span class="lv lv${s.lvl}"></span>${s.em} <span></span></button>` : '').join('');
}
function chipsWire(root, onPick){
  root.querySelectorAll('.chip').forEach(b => {
    const s = SONGS.find(x => x.id === b.dataset.id); b.querySelector('span:last-child').textContent = tr3(s.t);
    b.onclick = () => { A.sfx('click'); onPick(s.id); };
  });
  const on = root.querySelector('.chip.on'); if(on) setTimeout(() => { try{ on.scrollIntoView({ block:'nearest', inline:'center' }); }catch(e){} }, 0);
}
function mpMenu(){
  MP.tok++; mpClose(); mpShow('menu');
  if(!songOk(MP.botSong)) MP.botSong = 'bobo';
  mpCard().innerHTML = `<h2>⚔️ ${T('تحدّي مباشر', 'Live Challenge', 'Canlı Düello')}</h2>
    <p>${T('نفس الأغنية ونفس البلاطات، ومين بيجمع نقاط أكتر بيفوز!', 'Same song, same tiles — whoever scores more wins!', 'Aynı şarkı, aynı karolar — kim daha çok puan alırsa kazanır!')}</p>
    <div class="heroes" id="heroes">${HEROES.map(h => `<button data-id="${h.id}" class="${h.id === myHero ? 'on' : ''}" aria-label="${h.name}"><span class="face" style="${faceCss(h.id, 44)}"></span></button>`).join('')}</div>
    <div class="row"><button class="big-btn sm" id="bCreate">🏠 ${T('اعمل غرفة', 'Create room', 'Oda kur')}</button>
    <button class="big-btn sm mint" id="bJoin">🔢 ${T('فوت على غرفة', 'Join room', 'Odaya katıl')}</button></div>
    <p style="margin-top:6px">🟣 ${T('ما في حدا؟ تحدّى بوبو!', 'Nobody around? Challenge Bobo!', 'Kimse yok mu? Bobo\'ya meydan oku!')}</p>
    <div class="chips" id="botChips">${chipsHtml(MP.botSong)}</div>
    <button class="big-btn sm" id="bBot">🎹 ${T('تحدّى بوبو', 'Challenge Bobo', 'Bobo ile düello')}</button>
    <button class="ghost-btn" id="bBack">↩️ ${T('رجوع', 'Back', 'Geri')}</button>`;
  mpCard().querySelectorAll('#heroes button').forEach(b => b.onclick = () => { A.sfx('click'); myHero = b.dataset.id; store.set('hero', myHero); mpCard().querySelectorAll('#heroes button').forEach(x => x.classList.toggle('on', x === b)); });
  chipsWire($('#botChips'), id => { MP.botSong = id; $('#botChips').querySelectorAll('.chip').forEach(x => x.classList.toggle('on', x.dataset.id === id)); });
  $('#bCreate').onclick = () => { A.sfx('click'); mpCreate(); };
  $('#bJoin').onclick = () => { A.sfx('click'); mpKeypad(''); };
  $('#bBot').onclick = () => { A.sfx('click'); botStart(MP.botSong); };
  $('#bBack').onclick = () => { A.sfx('click'); mpBack(); };
}
function botStart(id){
  const i = SONGS.findIndex(s => s.id === id); if(i < 0) return;
  MP.screen = 'off'; show(null);
  startSong(i, { vs:'bot' });
  oppHead();
}
function mpBack(){ mpLeave(); toMenu(); }
function mpConnecting(){
  mpShow('connecting');
  mpCard().innerHTML = `<div class="bigicon spin">⏳</div><h2>${T('عم نتصل…', 'Connecting…', 'Bağlanıyor…')}</h2><button class="ghost-btn" id="bCancel">↩️ ${T('رجوع', 'Back', 'Geri')}</button>`;
  $('#bCancel').onclick = () => { A.sfx('click'); mpMenu(); };
}
function mpError(retry){
  mpShow('error');
  mpCard().innerHTML = `<div class="bigicon">📡</div><h2>${T('ما في إنترنت؟ جرّب كمان مرة', 'No internet? Try again', 'İnternet yok mu? Tekrar dene')}</h2>
    <div class="row"><button class="big-btn sm" id="bRetry">🔄 ${T('جرّب كمان مرة', 'Try again', 'Tekrar dene')}</button><button class="ghost-btn" id="bBack">↩️ ${T('رجوع', 'Back', 'Geri')}</button></div>`;
  $('#bRetry').onclick = () => { A.sfx('click'); retry(); };
  $('#bBack').onclick = () => { A.sfx('click'); mpMenu(); };
}
function mpLobby(){ if(!mpActive()){ mpMenu(); return; } MP.oppFin = MP.myFin = MP.result = MP.opp = MP.resOpp = null; mpShow('lobby'); mpLobbyDraw(); }
function nameOf(p){ if(!p) return ''; if(p.id === MP.id) return T('إنت', 'You', 'Sen'); return (window.BoboRT ? BoboRT.who(p.id, '') : '') || heroOf(p.pl).name; }
const esc = s => String(s == null ? '' : s).replace(/[&<>"'`]/g, c => '&#' + c.charCodeAt(0) + ';');
function mpLobbyDraw(){
  if(MP.screen !== 'lobby' || !mpActive()) return;
  const pl = MP.players, code = [...(MP.code || '')].map(N).join(''), n = pl.length;
  const slot = p => p ? `<div class="slot"><span class="face" style="${faceCss(p.pl, 64)}"></span><span class="nm" dir="auto">${esc(nameOf(p))}${p.id === MP.hostId ? ' 👑' : ''}</span></div>` : `<div class="slot empty"><span class="face"></span><span class="nm">…</span></div>`;
  const s = SONGS.find(x => x.id === MP.song) || SONGS[0];
  mpCard().innerHTML = `<h2>🏠 ${T('غرفة رقم', 'Room number', 'Oda numarası')} <bdi dir="ltr">${code}</bdi></h2>
    <p>${T('قول لصاحبك هالرقم ليفوت', 'Tell your friend this number to join', 'Arkadaşına bu numarayı söyle')}</p>
    <div class="slots">${slot(pl[0])}<span class="vsx">VS</span>${slot(pl[1])}</div>
    ${MP.isHost ? `<p>🎵 ${T('اختار الأغنية:', 'Pick the song:', 'Şarkıyı seç:')}</p><div class="chips" id="lobbyChips">${chipsHtml(MP.song)}</div>
      <p class="mp-msg">${n < 2 ? T('استنّى صاحبك يفوت…', 'Wait for your friend to join…', 'Arkadaşının gelmesini bekle…') : T('جاهزين؟ يلّا!', 'Ready? Go!', 'Hazır mısınız? Haydi!')}</p>
      <div class="row"><button class="big-btn sm" id="bStart"${n < 2 ? ' disabled' : ''}>▶️ ${T('ابدأ', 'Start', 'Başla')}</button><button class="ghost-btn" id="bLeave">🚪 ${T('اطلع', 'Leave', 'Çık')}</button></div>`
    : `<p>🎵 <b>${s.em} ${esc(tr3(s.t))}</b> <span class="lv lv${s.lvl}" style="border-radius:999px;padding:1px 10px;font-size:13px">${LVL[s.lvl]}</span></p>
      <p class="mp-msg">${T('استنّى صاحب الغرفة يبدأ…', 'Wait for the room owner to start…', 'Oda sahibinin başlatmasını bekle…')}</p>
      <div class="row"><button class="ghost-btn" id="bLeave">🚪 ${T('اطلع', 'Leave', 'Çık')}</button></div>`}`;
  if(MP.isHost){
    chipsWire($('#lobbyChips'), id => { MP.song = id; mpTrack(); mpSend('ev', { k:'song', song:id }); mpLobbyDraw(); });
    $('#bStart').onclick = () => { if(MP.players.length < 2) return; A.sfx('click'); mpStart(); };
  }
  $('#bLeave').onclick = () => { A.sfx('click'); mpLeave(); mpMenu(); };
}
function mpStart(){
  if(!MP.isHost || !mpActive() || MP.players.length < 2) return;
  const i = SONGS.findIndex(s => s.id === MP.song), seed = ((Math.random() * 1e9) >>> 0) || 1;
  if(i < 0) return;
  mpSend('ev', { k:'start', song:MP.song, seed });
  vsBegin(i, seed);
}
function vsBegin(i, seed){
  MP.screen = 'in'; MP.oppFin = MP.myFin = MP.result = MP.resOpp = null; MP.opp = null; MP.finSent = 0; MP.finT = 0; MP.waitT = 0; MP.sendT = 0;
  show(null);
  startSong(i, { vs:'net', seed });
  oppHead();
}
function vsFinish(){
  if(G.vs === 'bot'){ botStep(); G.bot.done = true; const B = G.bot; MP.myFin = null; MP.oppFin = { s:B.score, pf:B.pf }; MP.screen = 'end'; MP.result = null; setTimeout(() => vsResultDraw(), Math.max(100, 700 / G.ts)); return; }
  MP.myFin = { s:G.score, pf:G.perfect, mc:G.maxCombo }; MP.finT = 0; MP.finSent = 0; MP.waitT = 0;
  MP.screen = 'end';
  setTimeout(() => { if(MP.screen === 'end') vsResultDraw(); }, Math.max(100, 600 / G.ts));
}
/* winner: more points; then more PERFECT; else a draw. The same rule on both phones gives the same winner. */
function vsWinner(a, b){ if(a.s !== b.s) return a.s > b.s ? 1 : -1; if(a.pf !== b.pf) return a.pf > b.pf ? 1 : -1; return 0; }
function vsResultDraw(force){
  if(MP.screen !== 'end') return;
  const bot = G.vs === 'bot' || MP.botEnd;
  const me = { s:G.score, pf:G.perfect }, opp = MP.oppFin || MP.resOpp || (force && MP.opp ? { s:MP.opp.s, pf:MP.opp.pf } : null);
  if(force && opp) MP.resOpp = opp;
  const op = bot ? { id:'bot', pl:'bot' } : oppP();
  const oppName = bot ? T('بوبو', 'Bobo', 'Bobo') : op ? nameOf(op) : T('صاحبك', 'Your friend', 'Arkadaşın');
  if(!opp && !force && !bot){
    G.state = 'over'; show('mp');
    mpCard().innerHTML = `<div class="bigicon spin">⏳</div><h2>${T('استنّى صاحبك يخلّص…', 'Waiting for your friend to finish…', 'Arkadaşının bitirmesini bekle…')}</h2>
      <div class="slots"><div class="slot"><span class="face" style="${faceCss(myHero, 64)}"></span><span class="nm">${T('إنت', 'You', 'Sen')}</span><b>${N(G.score)}</b></div><span class="vsx">VS</span>
      <div class="slot"><span class="face" style="${faceCss(op ? op.pl : 'sara', 64)}"></span><span class="nm" dir="auto">${esc(oppName)}</span><b id="waitOpp">${N(MP.opp ? MP.opp.s : 0)}</b></div></div>`;
    return;
  }
  const w = opp ? vsWinner(me, opp) : 1;
  const winnerId = w > 0 ? MP.id || 'me' : w < 0 ? (op ? op.id : 'opp') : 'draw';
  const first = !MP.result;
  MP.result = { me:me.s, opp:opp ? opp.s : null, win:w > 0 ? 'me' : w < 0 ? 'opp' : 'draw', winnerId };
  if(first){
    A.sfx(w > 0 ? 'win' : 'end');
    const coins = G.awarded ? 0 : giveCoins(w > 0 ? 6 : w === 0 ? 4 : 2); G.awarded = true; MP.coins = coins;
    try{ if(window.World && World.track) World.track(w > 0 ? 'win' : 'play', 'piano'); }catch(e){}
  }
  G.state = 'over'; show('mp'); $('#hud').hidden = true;
  const title = w > 0 ? T('فزت! 🏆', 'You win! 🏆', 'Kazandın! 🏆') : w < 0 ? (bot ? T('بوبو فاز هالمرة 🟣', 'Bobo won this time 🟣', 'Bu sefer Bobo kazandı 🟣') : T('صاحبك فاز هالمرة 👏', 'Your friend won this time 👏', 'Bu sefer arkadaşın kazandı 👏')) : T('تعادل! 🤝', "It's a draw! 🤝", 'Berabere! 🤝');
  mpCard().innerHTML = `<h2>${title}</h2><p>${G.song.em} ${esc(tr3(G.song.t))}</p>
    <div class="slots"><div class="slot${w > 0 ? ' win' : ''}"><span class="face" style="${faceCss(myHero, 64)}"></span><span class="nm">${T('إنت', 'You', 'Sen')}${w > 0 ? ' 👑' : ''}</span><b>${N(me.s)}</b></div><span class="vsx">VS</span>
    <div class="slot${w < 0 ? ' win' : ''}"><span class="face" style="${faceCss(op ? op.pl : 'sara', 64)}"></span><span class="nm" dir="auto">${esc(oppName)}${w < 0 ? ' 👑' : ''}</span><b>${opp ? N(opp.s) : '—'}</b></div></div>
    <p>🪙 +${N(MP.coins || 0)}</p>
    ${bot ? `<div class="row"><button class="big-btn sm" id="bAgain">🔁 ${T('مرة كمان', 'Again', 'Tekrar')}</button><button class="ghost-btn" id="bMenu">↩️ ${T('رجوع', 'Back', 'Geri')}</button></div>`
      : MP.isHost && oppP() ? `<div class="row"><button class="big-btn sm" id="bAgain">🔁 ${T('جولة كمان', 'Another round', 'Bir tur daha')}</button><button class="ghost-btn" id="bLeave">🚪 ${T('اطلع', 'Leave', 'Çık')}</button></div>`
      : `${oppP() ? `<p class="mp-msg">${T('استنّى صاحب الغرفة…', 'Wait for the room owner…', 'Oda sahibini bekle…')}</p>` : ''}<div class="row"><button class="ghost-btn" id="bLeave">🚪 ${T('اطلع', 'Leave', 'Çık')}</button></div>`}`;
  if(bot){ $('#bAgain').onclick = () => { A.sfx('click'); botStart(G.song.id); }; $('#bMenu').onclick = () => { A.sfx('click'); mpMenu(); }; }
  else {
    const ag = $('#bAgain'); if(ag) ag.onclick = () => { A.sfx('click'); mpSend('ev', { k:'lobby' }); mpLobby(); };
    $('#bLeave').onclick = () => { A.sfx('click'); mpLeave(); mpMenu(); };
  }
}
/* the opponent's chip in the HUD */
function oppReset(){ $('#oppScore').textContent = '0'; $('#oppCombo').textContent = ''; $('#oppBar').style.transform = 'scaleX(0)'; oppLast.s = -1; oppLast.c = -1; oppLast.p = -1; }
const oppLast = { s:-1, c:-1, p:-1 };
function oppHead(){
  const bot = G.vs === 'bot', op = bot ? { pl:'bot' } : oppP();
  $('#oppFace').style.cssText = faceCss(op ? op.pl : 'sara', 36);
  $('#oppName').textContent = bot ? T('بوبو', 'Bobo', 'Bobo') : op ? nameOf(op) : '…';
}
function oppShow(s, c, p, h){
  if(s !== oppLast.s){ oppLast.s = s; $('#oppScore').textContent = N(s); }
  if(c !== oppLast.c){ oppLast.c = c; $('#oppCombo').textContent = c >= 2 ? 'x' + N(c) : ''; }
  const pr = Math.round(p * 100); if(pr !== oppLast.p){ oppLast.p = pr; $('#oppBar').style.transform = 'scaleX(' + (pr / 100) + ')'; }
}
async function mpCreate(want){
  mpConnecting();
  try{
    for(let i = 0; i < 4; i++){
      const code = i === 0 && /^\d{4}$/.test(want || '') ? String(want) : String(1000 + Math.floor(Math.random() * 9000));
      const r = await mpOpen(code, 'create');
      if(MP.screen !== 'connecting'){ if(r === 'ok') mpLeave(); return; }
      if(r === 'ok'){ mpLobby(); mpSendInvite(); return; }
    }
    throw new Error('busy');
  }catch(e){ if(MP.screen === 'connecting' && String(e && e.message) !== 'cancelled') mpError(() => mpCreate()); }
}
async function mpJoin(code, until){
  mpConnecting();
  try{
    let r = await mpOpen(code, 'join');
    if(MP.screen !== 'connecting') return;
    while(r === 'nobody' && until && performance.now() < until){
      await new Promise(res => setTimeout(res, 700)); if(MP.screen !== 'connecting') return;
      r = await mpOpen(code, 'join'); if(MP.screen !== 'connecting') return;
    }
    if(r === 'ok') mpLobby();
    else if(r === 'full') mpKeypad(T('الغرفة مليانة', 'The room is full', 'Oda dolu') + ' 🙈');
    else mpKeypad(T('ما لقينا هالغرفة، تأكّد من الرقم', "We couldn't find that room — check the number", 'Bu oda bulunamadı, numarayı kontrol et'));
  }catch(e){ if(MP.screen === 'connecting' && String(e && e.message) !== 'cancelled') mpError(() => mpJoin(code)); }
}
/* «تعا العب» from the friends page: ?host=1&invite=<friendCode>. The server may not accept 'piano' yet: guarded. */
function mpSendInvite(){
  const who = MP.inviteFor; if(!who || !MP.code || !window.Friends) return;
  MP.inviteFor = null;
  const no = () => toast(T('ما قدرنا نبعت الدعوة 🙈 قلّو رقم الغرفة', "Couldn't send the invite 🙈 tell them the room number", 'Davet gönderilemedi 🙈 oda numarasını söyle'));
  try{
    Promise.resolve(Friends.invite(who, MP.code, FR_GAME)).then(r => {
      if(r && r.status === 'sent') toast(T('✉️ بعتنا دعوة لصاحبك! استنّاه يفوت', '✉️ Invite sent! Wait for your friend to join', '✉️ Davet gönderildi! Arkadaşının gelmesini bekle'));
      else no();
    }, no);
  }catch(e){}
}
function mpKeypad(msg){
  mpShow('keypad'); MP.typed = '';
  const keys9 = [1, 2, 3, 4, 5, 6, 7, 8, 9].map(d => `<button data-k="${d}">${N(d)}</button>`).join('');
  mpCard().innerHTML = `<h2>🔢 ${T('اكتب رقم الغرفة', 'Type the room number', 'Oda numarasını yaz')}</h2>
    <div class="mp-code" id="kpCode"></div><p class="mp-msg" id="kpMsg"></p>
    <div class="keypad" id="keypad">${keys9}<button data-k="del" aria-label="${T('امسح', 'Delete', 'Sil')}">⌫</button><button data-k="0">${N(0)}</button><button class="ok" data-k="ok" aria-label="${T('تمام', 'OK', 'Tamam')}">✅</button></div>
    <button class="ghost-btn" id="bBack">↩️ ${T('رجوع', 'Back', 'Geri')}</button>`;
  $('#kpMsg').textContent = msg || '';
  mpCard().querySelectorAll('#keypad button').forEach(b => b.onclick = () => mpKey(b.dataset.k));
  $('#bBack').onclick = () => { A.sfx('click'); mpMenu(); };
  mpKeyDraw();
}
function mpKeyDraw(){ const el = $('#kpCode'); if(!el) return; el.innerHTML = [0, 1, 2, 3].map(i => `<b class="${i === MP.typed.length ? 'cur' : ''}">${MP.typed[i] != null ? N(MP.typed[i]) : ''}</b>`).join(''); }
function mpKey(k){
  if(MP.screen !== 'keypad') return;
  if(k === 'del'){ MP.typed = MP.typed.slice(0, -1); A.sfx('click'); }
  else if(k === 'ok'){ if(MP.typed.length === 4) mpJoin(MP.typed); return; }
  else if(/^\d$/.test(k) && MP.typed.length < 4){ MP.typed += k; A.sfx('click'); }
  const m = $('#kpMsg'); if(m) m.textContent = '';
  mpKeyDraw();
  if(MP.typed.length === 4){ const code = MP.typed; setTimeout(() => { if(MP.screen === 'keypad' && MP.typed === code) mpJoin(code); }, 300); }
}
addEventListener('keydown', e => {
  if(MP.screen !== 'keypad') return;
  if(/^\d$/.test(e.key)) mpKey(e.key); else if(e.key === 'Backspace') mpKey('del'); else if(e.key === 'Enter') mpKey('ok');
});
function mpLeave(){ MP.tok++; mpClose(); MP.screen = 'off'; }

/* ---------- the big «رجوع» button ---------- */
function backVisible(){
  if(G.state === 'pause') return true;
  if(G.state !== 'menu') return false;
  return MP.screen !== 'connecting';
}
function goBack(){
  if(G.state === 'pause'){ if(G.vs === 'net'){ mpLeave(); mpMenu(); } else openSongs(); return; }
  if(MP.screen === 'lobby' || MP.screen === 'end'){ mpLeave(); mpMenu(); return; }
  if(MP.screen === 'keypad' || MP.screen === 'error'){ mpMenu(); return; }
  if(MP.screen === 'menu'){ mpLeave(); toMenu(); return; }
  if(!$('#songs').hidden || !$('#themes').hidden){ toMenu(); return; }
  location.href = '../';
}

/* ---------- start ---------- */
resize();
setMute(!!store.get('muted', false));
toMenu();
requestAnimationFrame(t => { last = t; frame(t); });

/* test / debug hooks (no UI) */
window.__piano = {
  get state(){ return G.state; }, get screen(){ return MP.screen; }, G, songs:SONGS.map(s => s.id), themes:THEMES.map(t => t.id),
  start(id, o){ const i = SONGS.findIndex(s => s.id === id); if(i >= 0) startSong(i, o); },
  set auto(v){ G.auto = !!v; }, get auto(){ return G.auto; },
  set ts(v){ G.ts = Math.max(0.1, +v || 1); }, get ts(){ return G.ts; },
  info(){ return { song:G.song && G.song.id, s:+G.s.toFixed(2), score:G.score, combo:G.combo, maxCombo:G.maxCombo, hearts:G.hearts, stars:G.stars, crowns:G.crowns, perfect:G.perfect, miss:G.miss, moving:G.moving, tiles:G.tiles.length, open:G.tiles.filter(q => q.st === 0).length, revived:G.revived, vs:G.vs }; },
  get result(){ return G.result; }, best:id => bestOf(id), totalStars,
  tapLane(l){ laneHit(l, (l + 0.5) * laneW, 'test'); }, release(){ release('test'); },
  tiles(){ return G.tiles.slice(G.ti, G.ti + 12).map(q => ({ row:q.row, lane:q.lane, len:q.len, hold:q.hold, st:q.st, d:+(G.s - q.row).toFixed(2) })); },
  laneY(){ return { laneW, rowH, hitY, W, H }; },
  openSongs, openThemes, menu:toMenu, setTheme, theme:() => theme.id, pause, resume, revive, noRevive:() => { clearInterval(G.revT); finish(); },
  backVisible, back:goBack,
  /* online */
  get mp(){ return { code:MP.code, active:mpActive(), isHost:MP.isHost, screen:MP.screen, id:MP.id, hostId:MP.hostId, song:MP.song, players:MP.players.map(p => ({ id:p.id, pl:p.pl, fc:p.fc, name:nameOf(p) })), opp:MP.opp, oppFin:MP.oppFin, myFin:MP.myFin, result:MP.result }; },
  mpMenu, mpCreate:c => mpCreate(c), mpJoin:c => mpJoin(c), mpStart, pickSong:id => { MP.song = id; mpTrack(); mpLobbyDraw(); },
  bot:id => botStart(id || 'bobo'), get botInfo(){ return G.bot && { score:G.bot.score, done:G.bot.done, hearts:G.bot.hearts }; },
  oppText(){ return { name:$('#oppName').textContent, score:$('#oppScore').textContent }; }
};
/* links: ?host=1[&room=1234][&invite=<friendCode>] makes a room, ?join=1234 joins one (tries for 20 s) */
(function(){
  const join = Q.get('join'), host = Q.get('host') === '1', inv = Q.get('invite'), room = Q.get('room');
  if(!/^\d{4}$/.test(join || '') && !host) return;
  const q = new URLSearchParams(location.search); ['join', 'host', 'invite', 'room'].forEach(k => q.delete(k));
  try{ history.replaceState(null, '', location.pathname + (q.toString() ? '?' + q : '') + location.hash); }catch(e){}
  if(/^\d{4}$/.test(join || '')) mpJoin(join, performance.now() + 20000);
  else { MP.inviteFor = /^[A-Z2-9]{6}$/.test(inv || '') ? inv : null; mpCreate(room); }
})();
})();
