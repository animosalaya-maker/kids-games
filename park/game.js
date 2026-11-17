/* Bobo Theme Park («ملاهي بوبو 🎡») — main game.
   An empty grassy plot with an entrance gate. Build mode: paint paths on a grid, place rides (carousel, teacups,
   swing ride, ferris wheel, bumper cars, splash boat, drop tower, mini roller coaster), stalls (ice cream, popcorn,
   juice, balloons, toilets) and decorations (trees, flowers, fountains, lamps, benches, bins). Cute instanced
   visitors arrive, walk the paths, ride, buy snacks and pay tickets in «قروش الملاهي». The park rating (stars)
   grows with variety, cleanliness and decorations, and unlocks new things. Walk your character and ride any ride.
   Online rooms (Supabase presence like garden; ?mp=local = BroadcastChannel): friends visit the host's park, ride
   together, and help build when the host turns on «ساعدني ابني». Save: park_save v1 (this device). */
import * as THREE from '../adventure3d/three.module.min.js';
import { makeKit } from '../worlds/kit.js';
import { makeParkModels } from './models.js';

const $ = s => document.querySelector(s);
{ const md = document.querySelector('meta[name="description"]'), dl = window.I18N && md && md.getAttribute('data-' + I18N.lang); if(dl) md.setAttribute('content', dl); }
const N = n => window.I18N ? I18N.num(n) : String(n);
const rawGet = k => { try{ return localStorage.getItem(k); }catch(e){ return null; } };
const rawSet = (k, v) => { try{ localStorage.setItem(k, v); }catch(e){} };
const K = makeKit(THREE);
const { G:GEO, canvasTex, glowTex, HEROES, HERO_IDS, HERO_NAME, HERO_COLOR, poseHero } = K;
const PM = makeParkModels(THREE, K);
const { MAT, TM, CAT, KINDS, RIDE_BUILD } = PM;
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const angDiff = (a, b) => { let d = a - b; while(d > Math.PI) d -= Math.PI * 2; while(d < -Math.PI) d += Math.PI * 2; return d; };
const pick = a => a[Math.floor(Math.random() * a.length)];
const charImg = id => '../worlds/chars/' + (HEROES[id] ? id : 'sara') + '.png';
const QS = new URLSearchParams(location.search);
const MP_LOCAL = QS.get('mp') === 'local';
const COIN = '💰';
const starStr = r => { let s = ''; for(let i = 1; i <= 5; i++) s += r >= i ? '⭐' : r >= i - .5 ? '✨' : '<s>⭐</s>'; return s; };
const rateTxt = r => N(Math.floor(r)) + (r % 1 >= .5 ? '.' + N(5) : '');

/* ======================================================================
   Grid, catalogue, rules
   ====================================================================== */
const GW = 18, GH = 13, CELL = 2, NC = GW * GH;
const cellX = c => (c - (GW - 1) / 2) * CELL, cellZ = r => (r - (GH - 1) / 2) * CELL;
const HALF_X = GW * CELL / 2, HALF_Z = GH * CELL / 2;            // 18, 13
const GATE_CELLS = [(GH - 1) * GW + 8, (GH - 1) * GW + 9];       // the two path cells at the gate (fixed)
const PATH_PRICE = 2, START_MONEY = 300, MAXV = 48;
const TABS = [
  { id:'path', e:'🛤️', name:L('طرقات', 'Paths', 'Yollar'), items:['path'] },
  { id:'ride', e:'🎠', name:L('ألعاب', 'Rides', 'Oyuncaklar'), items:['carousel', 'teacups', 'swings', 'ferris', 'bumper', 'splash', 'drop', 'coaster'] },
  { id:'stall', e:'🍦', name:L('أكشاك', 'Stalls', 'Büfeler'), items:['ice', 'popcorn', 'juice', 'balloons', 'toilets'] },
  { id:'deco', e:'🌳', name:L('زينة', 'Decor', 'Süsler'), items:['tree', 'flowers', 'bin', 'bench', 'lamp', 'fountain'] }
];
const PATH_DEF = { cat:'path', e:'🛤️', name:L('طريق', 'Path', 'Yol'), w:1, d:1, price:PATH_PRICE, need:0 };
const defOf = k => k === 'path' ? PATH_DEF : CAT[k];
const RIDE_KINDS = KINDS.filter(k => CAT[k].cat === 'ride');
const MILESTONES = [
  { id:'r2', test:() => SAVE.best >= 2, coins:5, txt:L('ملاهيك صار فيها نجمتين! ⭐⭐', 'Your park reached 2 stars! ⭐⭐', 'Parkın 2 yıldıza ulaştı! ⭐⭐') },
  { id:'r3', test:() => SAVE.best >= 3, coins:8, txt:L('3 نجوم! ملاهيك عم تكبر ⭐⭐⭐', '3 stars! Your park is growing ⭐⭐⭐', '3 yıldız! Parkın büyüyor ⭐⭐⭐') },
  { id:'r4', test:() => SAVE.best >= 4, coins:12, txt:L('4 نجوم! ملاهي رائعة 🤩', '4 stars! An amazing park 🤩', '4 yıldız! Harika bir park 🤩') },
  { id:'r5', test:() => SAVE.best >= 5, coins:20, txt:L('5 نجوم! أحلى ملاهي بالدنيا 🏆', '5 stars! The best park ever 🏆', '5 yıldız! Dünyanın en güzel parkı 🏆') },
  { id:'v50', test:() => SAVE.guests >= 50, coins:5, txt:L('50 زائر زاروا ملاهيك! 👥', '50 visitors came to your park! 👥', 'Parkına 50 ziyaretçi geldi! 👥') },
  { id:'v200', test:() => SAVE.guests >= 200, coins:10, txt:L('200 زائر! ملاهيك مشهورة 🎉', '200 visitors! Your park is famous 🎉', '200 ziyaretçi! Parkın ünlü 🎉') },
  { id:'all', test:() => RIDE_KINDS.every(k => SAVE.items.some(it => it.k === k)), coins:15, txt:L('عندك كل الألعاب! 🎢🎡🎠', 'You have every ride! 🎢🎡🎠', 'Tüm oyuncaklar sende! 🎢🎡🎠') }
];

/* ---------- save (this device): park_save v1 ---------- */
const SAVE_KEY = 'park_save' + (MP_LOCAL && /^[a-z]$/.test(QS.get('slot') || '') ? '_' + QS.get('slot') : ''), SAVE_V = 1;
const pathStr0 = () => { const a = Array(NC).fill('0'); for(const i of GATE_CELLS) a[i] = '1'; return a.join(''); };
function freshSave(){ return { v:SAVE_V, money:START_MONEY, paths:pathStr0(), items:[], uid:1, tut:0, hero:null, best:0, guests:0, earned:0, rides:0, ms:{}, t:Date.now() }; }
function okItem(it){
  if(!it || typeof it !== 'object' || !CAT[it.k]) return null;
  const o = { u:clamp(it.u | 0, 1, 1e9), k:it.k, c:clamp(it.c | 0, 0, GW - 1), r:clamp(it.r | 0, 0, GH - 1), o:clamp(it.o | 0, 0, 3) };
  return o;
}
function loadSave(){
  try{
    const v = JSON.parse(rawGet(SAVE_KEY));
    if(v && typeof v === 'object' && v.v === SAVE_V){
      const s = Object.assign(freshSave(), v);
      s.money = clamp(Math.floor(+s.money || 0), 0, 9999999);
      s.paths = typeof v.paths === 'string' && v.paths.length === NC && /^[01]+$/.test(v.paths) ? v.paths : pathStr0();
      s.items = Array.isArray(v.items) ? v.items.map(okItem).filter(Boolean) : [];
      s.uid = Math.max(clamp(s.uid | 0, 1, 1e9), ...s.items.map(i => i.u + 1), 1);
      s.best = clamp(+s.best || 0, 0, 5); s.guests = clamp(s.guests | 0, 0, 1e9); s.earned = clamp(s.earned | 0, 0, 1e9); s.rides = clamp(s.rides | 0, 0, 1e9);
      s.ms = v.ms && typeof v.ms === 'object' ? Object.fromEntries(Object.keys(v.ms).filter(k => MILESTONES.some(m => m.id === k)).map(k => [k, 1])) : {};
      s.tut = clamp(s.tut | 0, 0, 9);
      return s;
    }
  }catch(e){}
  return null;
}
let SAVE = loadSave() || freshSave();
let saveT = 0;
function persist(){ saveT = 0; SAVE.t = Date.now(); SAVE.paths = pathsToStr(OWN.paths); SAVE.items = OWN.items.map(it => ({ u:it.u, k:it.k, c:it.c, r:it.r, o:it.o })); rawSet(SAVE_KEY, JSON.stringify(SAVE)); }
let heroId = HERO_IDS.includes(SAVE.hero) ? SAVE.hero : HERO_IDS.includes(rawGet('worlds_hero')) ? rawGet('worlds_hero') : 'sara';
const pathsFromStr = s => { const a = new Uint8Array(NC); for(let i = 0; i < NC; i++) a[i] = s.charCodeAt(i) === 49 ? 1 : 0; for(const i of GATE_CELLS) a[i] = 1; return a; };
const pathsToStr = a => { let s = ''; for(let i = 0; i < NC; i++) s += a[i] ? '1' : '0'; return s; };
/* the park layout you own (the save keeps it as strings / plain objects) */
const OWN = { paths:pathsFromStr(SAVE.paths), items:SAVE.items.map(it => Object.assign({}, it)) };

/* ---------- Always-landscape stage ---------- */
const stage = $('#stage'), saProbe = $('#saProbe');
let ROT = false, VW = innerWidth, SW = innerWidth, SH = innerHeight, SAL = 0, SAB = 0;
function layout(){
  VW = innerWidth; const vh = innerHeight; ROT = vh > VW;
  SW = ROT ? vh : VW; SH = ROT ? VW : vh;
  const st = stage.style;
  st.width = SW + 'px'; st.height = SH + 'px';
  st.transform = ROT ? `translateX(${VW}px) rotate(90deg)` : 'none';
  st.setProperty('--sw', SW + 'px'); st.setProperty('--sh', SH + 'px');
  stage.classList.toggle('rot', ROT); stage.classList.toggle('short', SH <= 520);
  SAL = saProbe.offsetWidth; SAB = saProbe.offsetHeight;
}
function toLayer(cx, cy){ return ROT ? { x:cy, y:VW - cx } : { x:cx, y:cy }; }
layout();

/* ---------- Sound (tiny synth, no files) + a little fairground waltz ---------- */
let actx = null, muted = rawGet('adv3d_muted') === 'true', noiseBuf = null;
function ac(){
  if(!actx){ try{ actx = new (window.AudioContext || window.webkitAudioContext)(); }catch(e){ actx = null; } }
  if(actx && actx.state === 'suspended') actx.resume().catch(() => {});
  return actx;
}
function toneAt(freq, t0, dur, type, vol, toFreq, dest){
  const a = actx; if(!a) return;
  const o = a.createOscillator(), g = a.createGain();
  o.type = type || 'sine'; o.frequency.setValueAtTime(freq, t0);
  if(toFreq) o.frequency.exponentialRampToValueAtTime(toFreq, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol || 0.15, t0 + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(dest || a.destination); o.start(t0); o.stop(t0 + dur + 0.05);
}
function tone(freq, dur, type, vol, delay, toFreq){ if(muted) return; const a = ac(); if(!a) return; toneAt(freq, a.currentTime + (delay || 0), dur, type, vol, toFreq); }
function noise(dur, vol, freq, delay){
  if(muted) return; const a = ac(); if(!a) return;
  if(!noiseBuf){ noiseBuf = a.createBuffer(1, a.sampleRate, a.sampleRate); const d = noiseBuf.getChannelData(0); for(let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
  const s = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain(), t0 = a.currentTime + (delay || 0);
  s.buffer = noiseBuf; f.type = 'bandpass'; f.frequency.value = freq || 1200; f.Q.value = .7;
  g.gain.setValueAtTime(vol || .1, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  s.connect(f).connect(g).connect(a.destination); s.start(t0); s.stop(t0 + dur + .05);
}
const SFX = {
  tap(){ tone(520, .05, 'triangle', .08); }, bonk(){ tone(300, .14, 'square', .05, 0, 140); },
  buy(){ [660, 880, 1100].forEach((f, i) => tone(f, .11, 'triangle', .1, i * .06)); },
  place(){ tone(220, .12, 'sine', .14, 0, 140); [523, 659, 784, 1046].forEach((f, i) => tone(f, .12, 'triangle', .09, .08 + i * .07)); },
  path(){ tone(380 + Math.random() * 60, .06, 'triangle', .06); },
  remove(){ tone(500, .16, 'triangle', .08, 0, 200); noise(.15, .05, 900); },
  coins(){ [1318, 1568, 2093].forEach((f, i) => tone(f, .07, 'square', .035, i * .06)); },
  ding(){ tone(1568, .25, 'sine', .08); tone(2093, .3, 'sine', .06, .12); },
  pop(){ tone(500, .08, 'sine', .12, 0, 1100); },
  star(){ [1046, 1318, 1568, 2093].forEach((f, i) => tone(f, .09, 'triangle', .08, i * .05)); },
  flag(){ [523, 659, 784].forEach((f, i) => tone(f, .16, 'triangle', .12, i * .08)); },
  bump(){ tone(140, .12, 'square', .07, 0, 90); noise(.08, .05, 400); },
  splash(){ noise(.7, .16, 900); noise(.5, .1, 2400, .1); },
  whoosh(){ noise(.9, .09, 700); tone(500, .8, 'sine', .04, 0, 160); },
  wee(){ tone(600, .6, 'triangle', .07, 0, 1300); },
  unlock(){ [784, 988, 1175, 1568, 1976].forEach((f, i) => tone(f, .12, 'triangle', .09, i * .07)); },
  pick(){ tone(880, .06, 'triangle', .07); tone(1320, .08, 'triangle', .06, .06); }
};
/* fairground waltz (3/4): melody + oom-pah-pah, scheduled ahead with WebAudio */
const MUS = { on:false, next:0, step:0, iv:0, gain:null };
const MEL = [76, 0, 79, 81, 0, 79, 76, 0, 72, 74, 0, 76, 77, 0, 81, 79, 0, 77, 76, 0, 74, 72, 0, 0, 76, 0, 79, 81, 0, 84, 83, 0, 81, 79, 0, 77, 76, 0, 74, 72, 74, 76, 72, 0, 0, 0, 0, 0];
const BASS = [[48, 64, 67], [48, 64, 67], [43, 62, 65], [43, 62, 65], [48, 64, 67], [53, 65, 69], [43, 62, 65], [48, 64, 67], [48, 64, 67], [48, 64, 67], [53, 65, 69], [53, 65, 69], [48, 64, 67], [43, 62, 65], [48, 64, 67], [48, 64, 67]];
const mf = n => 440 * Math.pow(2, (n - 69) / 12);
function musicTick(){
  const a = actx; if(!a || !MUS.on) return;
  if(!MUS.gain){ MUS.gain = a.createGain(); MUS.gain.gain.value = .55; MUS.gain.connect(a.destination); }
  const beat = 60 / 138;
  if(MUS.next < a.currentTime) MUS.next = a.currentTime + .05;
  while(MUS.next < a.currentTime + .3){
    const s = MUS.step % 48, bar = Math.floor(s / 3), b = s % 3, ch = BASS[bar % 16];
    if(b === 0) toneAt(mf(ch[0]), MUS.next, beat * .9, 'triangle', .06, 0, MUS.gain);
    else { toneAt(mf(ch[1]), MUS.next, beat * .45, 'sine', .025, 0, MUS.gain); toneAt(mf(ch[2]), MUS.next, beat * .45, 'sine', .022, 0, MUS.gain); }
    if(MEL[s]) toneAt(mf(MEL[s]), MUS.next, beat * .85, 'square', .018, 0, MUS.gain), toneAt(mf(MEL[s] + 12), MUS.next, beat * .5, 'sine', .02, 0, MUS.gain);
    MUS.next += beat; MUS.step++;
  }
}
function setMusic(on){
  on = on && !muted;
  if(on === MUS.on) return;
  MUS.on = on;
  if(on){ if(!ac()) { MUS.on = false; return; } MUS.next = 0; MUS.iv = setInterval(musicTick, 90); musicTick(); }
  else { clearInterval(MUS.iv); MUS.iv = 0; if(MUS.gain){ try{ MUS.gain.gain.setTargetAtTime(0, actx.currentTime, .05); }catch(e){} MUS.gain = null; } }
}

/* ---------- Renderer ---------- */
const canvas = $('#cv');
let renderer;
try{ renderer = new THREE.WebGLRenderer({ canvas, antialias:true, powerPreference:'high-performance' }); }
catch(e){ $('#nogl').hidden = false; $('#overlay').hidden = true; throw e; }
let dpr = Math.min(window.devicePixelRatio || 1, 1.5), hiQ = false;
renderer.setPixelRatio(dpr);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0xd6f0ff, 60, 150);
const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 700);
function resize(){
  layout();
  renderer.setSize(SW, SH, false);
  camera.aspect = SW / SH; camera.updateProjectionMatrix();
  placeJoyHome(); bbarH();
}
addEventListener('resize', resize);
addEventListener('orientationchange', () => setTimeout(resize, 120));
const hemi = new THREE.HemisphereLight(0xfff4e2, 0x86a274, 1.7); scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff0d4, 2.3);
sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -.0006; sun.shadow.normalBias = .03;
Object.assign(sun.shadow.camera, { left:-26, right:26, top:26, bottom:-26, near:1, far:110 }); sun.shadow.camera.updateProjectionMatrix();
scene.add(sun); scene.add(sun.target);
const SUN_OFF = new THREE.Vector3(18, 38, 20);
function aimSun(x, z){ sun.target.position.set(x, 0, z); sun.position.set(x + SUN_OFF.x, SUN_OFF.y, z + SUN_OFF.z); }
const skyMat = new THREE.MeshBasicMaterial({ vertexColors:true, side:THREE.BackSide, fog:false, depthWrite:false });
const sky = (() => {
  const g = new THREE.SphereGeometry(500, 24, 16), col = new Float32Array(g.attributes.position.count * 3);
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const m = new THREE.Mesh(g, skyMat);
  const pa = g.attributes.position, a = new THREE.Color(0x5fb8f5), h = new THREE.Color(0xfff0e0), b = new THREE.Color(0xbfe6ff), t = new THREE.Color();
  for(let i = 0; i < pa.count; i++){ const y = pa.getY(i) / 500; if(y >= 0) t.copy(h).lerp(a, clamp(Math.pow(y, .6) * 1.5, 0, 1)); else t.copy(h).lerp(b, clamp(-y * 2.2, 0, 1)); col[i * 3] = t.r; col[i * 3 + 1] = t.g; col[i * 3 + 2] = t.b; }
  m.renderOrder = -1; scene.add(m); return m;
})();
const _m = new THREE.Matrix4(), _m2 = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _s = new THREE.Vector3(), _v = new THREE.Vector3(), _v2 = new THREE.Vector3(), _c = new THREE.Color();
function meshOf(M, cast = true, receive = true, mat = MAT){ const m = new THREE.Mesh(M.geometry(), mat); m.castShadow = cast; m.receiveShadow = receive; return m; }

/* ---------- Particles (instanced confetti / sparkles / water) ---------- */
const PMAX = 360, parts = [], pMesh = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(.08, 0), new THREE.MeshBasicMaterial(), PMAX);
pMesh.frustumCulled = false; scene.add(pMesh);
for(let i = 0; i < PMAX; i++){ parts.push({ life:0, x:0, y:0, z:0, vx:0, vy:0, vz:0, s:1, g:12 }); pMesh.setColorAt(i, _c.set(0xffffff)); _m.makeScale(0, 0, 0); pMesh.setMatrixAt(i, _m); }
let pNext = 0;
const CONFETTI = [0xffc23d, 0xff8fb1, 0x5ed6a0, 0x6cc4ff, 0xffffff];
function burst(x, y, z, n, colors, speed = 4, size = 1, grav = 12, up = 2){
  for(let k = 0; k < n; k++){
    const p = parts[pNext], i = pNext; pNext = (pNext + 1) % PMAX;
    const a = Math.random() * 6.28, u = Math.random() * 2 - 1, r = Math.sqrt(1 - u * u);
    p.life = .7 + Math.random() * .6; p.x = x; p.y = y; p.z = z; p.vx = Math.cos(a) * r * speed; p.vz = Math.sin(a) * r * speed; p.vy = Math.abs(u) * speed + up; p.s = size * (.7 + Math.random() * .8); p.g = grav;
    pMesh.setColorAt(i, _c.set(pick(colors)));
  }
  pMesh.instanceColor.needsUpdate = true;
}
function spray(x, y, z, dx, dz, n, vy = 1, life = .45){
  for(let k = 0; k < n; k++){
    const p = parts[pNext], i = pNext; pNext = (pNext + 1) % PMAX;
    p.life = life + Math.random() * .3; p.x = x; p.y = y; p.z = z; p.vx = dx * (1 + Math.random()) + (Math.random() - .5) * .5; p.vz = dz * (1 + Math.random()) + (Math.random() - .5) * .5; p.vy = vy * (.7 + Math.random() * .6); p.s = .6 + Math.random() * .4; p.g = 9;
    pMesh.setColorAt(i, _c.set(Math.random() < .5 ? 0x8fd6ff : 0xe0f6ff));
  }
  pMesh.instanceColor.needsUpdate = true;
}
function updateParts(dt){
  for(let i = 0; i < PMAX; i++){
    const p = parts[i]; if(p.life <= 0) continue;
    p.life -= dt; p.vy -= p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
    const s = p.life > 0 ? p.s * Math.min(1, p.life * 3) : 0;
    _m.compose(_v.set(p.x, p.y, p.z), _q.identity(), _s.set(s, s, s)); pMesh.setMatrixAt(i, _m);
  }
  pMesh.instanceMatrix.needsUpdate = true;
}
/* floating sprites (drawn shapes, no emoji in textures) */
function iconTex(draw){ return canvasTex(64, 64, x => draw(x)); }
const TEX = {
  heart:iconTex(x => { x.fillStyle = '#ff5d8f'; x.beginPath(); x.moveTo(32, 56); x.bezierCurveTo(4, 36, 6, 10, 22, 10); x.bezierCurveTo(28, 10, 32, 16, 32, 20); x.bezierCurveTo(32, 16, 36, 10, 42, 10); x.bezierCurveTo(58, 10, 60, 36, 32, 56); x.fill(); x.fillStyle = 'rgba(255,255,255,.6)'; x.beginPath(); x.ellipse(20, 22, 5, 7, -.5, 0, 6.3); x.fill(); }),
  coin:iconTex(x => { x.fillStyle = '#c98f12'; x.beginPath(); x.arc(32, 34, 26, 0, 6.3); x.fill(); x.fillStyle = '#ffc23d'; x.beginPath(); x.arc(32, 31, 26, 0, 6.3); x.fill(); x.strokeStyle = '#fff3c0'; x.lineWidth = 4; x.beginPath(); x.arc(32, 31, 17, 0, 6.3); x.stroke(); x.fillStyle = '#fff3c0'; x.fillRect(28, 20, 8, 22); }),
  star:iconTex(x => { x.fillStyle = '#ffc23d'; x.beginPath(); for(let i = 0; i < 10; i++){ const a = i / 10 * Math.PI * 2 - Math.PI / 2, r = i % 2 ? 11 : 28; x.lineTo(32 + Math.cos(a) * r, 34 + Math.sin(a) * r); } x.closePath(); x.fill(); x.strokeStyle = '#c98f12'; x.lineWidth = 3; x.stroke(); })
};
const floaters = [];
for(let i = 0; i < 40; i++){ const s = new THREE.Sprite(new THREE.SpriteMaterial({ map:TEX.coin, transparent:true, depthWrite:false })); s.visible = false; scene.add(s); floaters.push({ s, life:0, vx:0, vy:0, vz:0 }); }
let fNext = 0;
function floatIcon(kind, x, y, z, n = 1, size = .45){
  for(let k = 0; k < n; k++){
    const f = floaters[fNext]; fNext = (fNext + 1) % floaters.length;
    f.s.material.map = TEX[kind]; f.s.material.needsUpdate = true; f.s.visible = true;
    f.s.position.set(x + (Math.random() - .5) * .5, y, z + (Math.random() - .5) * .5); f.s.scale.setScalar(size * (.8 + Math.random() * .4));
    f.life = 1.2 + Math.random() * .4; f.vx = (Math.random() - .5) * .6; f.vy = 1.2 + Math.random() * .6; f.vz = (Math.random() - .5) * .6;
  }
}
function updateFloaters(dt){
  for(const f of floaters){ if(f.life <= 0) continue; f.life -= dt; f.s.position.x += f.vx * dt; f.s.position.y += f.vy * dt; f.s.position.z += f.vz * dt; f.s.material.opacity = clamp(f.life * 1.5, 0, 1); if(f.life <= 0) f.s.visible = false; }
}

/* ======================================================================
   The world: lawn, plot, fence, entrance gate, plaza, trees and hills around
   ====================================================================== */
const world = new THREE.Group(); scene.add(world);
const BOXES = [];                                          // fixed obstacles for the player (fence, gate, booth)
let seed = 7;
const srnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
let gateObj = null, guideArrow, guideRing, gridMesh;
function signTex(text, bg, fg){
  return canvasTex(1024, 160, x => {
    x.fillStyle = bg; x.beginPath(); x.roundRect(6, 6, 1012, 148, 50); x.fill();
    x.lineWidth = 10; x.strokeStyle = '#fff'; x.stroke();
    x.fillStyle = fg; x.textAlign = 'center'; x.textBaseline = 'middle'; x.direction = (window.I18N && I18N.dir) || 'rtl';
    x.font = '800 92px "Baloo Bhaijaan 2","Tajawal",system-ui,sans-serif'; x.fillText(text, 512, 88);
    for(const cx of [70, 954]){ x.fillStyle = '#ffc23d'; x.beginPath(); for(let i = 0; i < 10; i++){ const a = i / 10 * Math.PI * 2 - Math.PI / 2, r = i % 2 ? 18 : 40; x.lineTo(cx + Math.cos(a) * r, 82 + Math.sin(a) * r); } x.closePath(); x.fill(); }
  });
}
function buildWorld(){
  /* ground with gentle colour variation */
  {
    const g = new THREE.CircleGeometry(170, 72); g.rotateX(-Math.PI / 2);
    const pa = g.attributes.position, col = new Float32Array(pa.count * 3), a = new THREE.Color(0x9ddb70), b = new THREE.Color(0x86cc60), far = new THREE.Color(0xaedb90);
    for(let i = 0; i < pa.count; i++){ const x = pa.getX(i), z = pa.getZ(i), d = Math.hypot(x, z), n = (Math.sin(x * .21) + Math.cos(z * .17)) * .5 + .5; _c.copy(a).lerp(b, n * .6).lerp(far, clamp((d - 35) / 45, 0, 1)); col.set([_c.r, _c.g, _c.b], i * 3); }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors:true, roughness:1 })); m.receiveShadow = true; world.add(m);
  }
  const F = new TM();
  /* the plot: a slightly brighter lawn with a soft edge */
  F.add(GEO.box, 0, .02, 0, HALF_X * 2, .04, HALF_Z * 2, 0, 0, 0, 0xa6e27a);
  /* plaza in front of the gate */
  F.add(GEO.box, 0, .025, HALF_Z + 6.2, 12, .05, 12, 0, 0, 0, 0xf3dfb4);
  F.add(GEO.cyl, 0, .025, HALF_Z + 12.2, 6, .05, 6, 0, 0, 0, 0xf3dfb4);
  for(const s of [-1, 1]){ F.add(GEO.cyl, s * 4.8, .3, HALF_Z + 8, 1.2, .6, 1.2, 0, 0, 0, 0xd9a46a); F.add(GEO.ico1, s * 4.8, 1.0, HALF_Z + 8, .9, .7, .9, 0, s, 0, 0x5cbf54); for(let i = 0; i < 6; i++) F.add(GEO.sm, s * 4.8 + Math.cos(i) * .7, 1.1 + (i % 2) * .2, HALF_Z + 8 + Math.sin(i) * .7, .14, .12, .14, 0, 0, 0, s < 0 ? 0xff8fb1 : 0xffd23f); }
  world.add(meshOf(F, false, true));
  /* white picket fence around the plot (gap at the gate) */
  {
    const FN = new TM(), fcol = 0xffffff, post = (x, z) => { FN.add(GEO.box, x, .5, z, .18, 1.0, .18, 0, 0, 0, fcol); FN.add(GEO.cone4, x, 1.08, z, .14, .16, .14, 0, Math.PI / 4, 0, fcol); };
    const run = (x1, z1, x2, z2) => { const L2 = Math.hypot(x2 - x1, z2 - z1), n = Math.max(1, Math.round(L2 / 1.6)); for(let i = 0; i <= n; i++) post(lerp(x1, x2, i / n), lerp(z1, z2, i / n)); for(const y of [.38, .76]) FN.add(GEO.box, (x1 + x2) / 2, y, (z1 + z2) / 2, Math.abs(x2 - x1) + .08, .1, Math.abs(z2 - z1) + .08, 0, 0, 0, fcol); };
    const X = HALF_X + .3, Z = HALF_Z + .3;
    run(-X, -Z, X, -Z); run(-X, -Z, -X, Z); run(X, -Z, X, Z); run(-X, Z, -3.6, Z); run(3.6, Z, X, Z);
    world.add(meshOf(FN));
    BOXES.push({ x0:-X - .2, z0:Z - .2, x1:-3.6, z1:Z + .2 }, { x0:3.6, z0:Z - .2, x1:X + .2, z1:Z + .2 });
  }
  /* the entrance gate */
  gateObj = PM.gate(signTex(L('ملاهي بوبو', 'Bobo Theme Park', 'Bobo Lunaparkı'), '#ff8fb1', '#fff'));
  gateObj.grp.position.set(0, 0, HALF_Z + .3); world.add(gateObj.grp);
  gateObj.grp.traverse(o => { if(o.isMesh && !o.material.map) o.castShadow = true; });
  BOXES.push({ x0:-3.75, z0:HALF_Z - .45, x1:-2.25, z1:HALF_Z + 1.05 }, { x0:2.25, z0:HALF_Z - .45, x1:3.75, z1:HALF_Z + 1.05 }, { x0:4.4, z0:HALF_Z + .4, x1:6.0, z1:HALF_Z + 1.8 });
  /* trees (instanced) around the park, hills far away */
  const T = [];
  for(let i = 0; i < 70; i++){ const a = i / 70 * Math.PI * 2 + srnd() * .04, r = 27 + srnd() * 12, x = Math.cos(a) * r * 1.15, z = Math.sin(a) * r * .95; if(z > 12 && Math.abs(x) < 9) continue; T.push([x, z, 1.2 + srnd() * .8]); }
  for(const [x, z] of [[-9, 18], [9, 18.5], [-12, 22], [12, 23], [-16, 17], [16, 16.5]]) T.push([x, z, 1 + srnd() * .3]);
  const trunk = new THREE.InstancedMesh(new THREE.CylinderGeometry(.16, .24, 1.6, 7), new THREE.MeshStandardMaterial({ color:0x9a6b3c, roughness:.9 }), T.length);
  const crown = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1.15, 1), new THREE.MeshStandardMaterial({ roughness:.8, flatShading:true }), T.length * 2);
  T.forEach(([x, z, s], i) => {
    _m.compose(_v.set(x, .8 * s, z), _q.identity(), _s.set(s, s, s)); trunk.setMatrixAt(i, _m);
    _m.compose(_v.set(x, 2.25 * s, z), _q.setFromEuler(_e.set(0, i, 0)), _s.set(s, s * .95, s)); crown.setMatrixAt(i * 2, _m); crown.setColorAt(i * 2, _c.set(i % 3 ? 0x5cbf54 : 0x4fae4a));
    _m.compose(_v.set(x + .3 * s, 3.05 * s, z - .2 * s), _q.identity(), _s.set(s * .62, s * .6, s * .62)); crown.setMatrixAt(i * 2 + 1, _m); crown.setColorAt(i * 2 + 1, _c.set(0x7ad46a));
  });
  trunk.castShadow = crown.castShadow = true; world.add(trunk, crown);
  const HL = new TM();
  for(let i = 0; i < 16; i++){ const a = i / 16 * Math.PI * 2, r = 95 + srnd() * 20; HL.add(GEO.sph, Math.cos(a) * r, -4, Math.sin(a) * r, 24 + srnd() * 14, 12 + srnd() * 10, 18, 0, a, 0, i % 2 ? 0x9fd88a : 0x8ccf7a); }
  world.add(meshOf(HL, false, false));
  /* build grid (shown in build mode) */
  const gt = canvasTex(64, 64, x => { x.clearRect(0, 0, 64, 64); x.strokeStyle = 'rgba(255,255,255,.75)'; x.lineWidth = 3; x.strokeRect(1.5, 1.5, 61, 61); });
  gt.wrapS = gt.wrapT = THREE.RepeatWrapping; gt.repeat.set(GW, GH); gt.anisotropy = 4;
  gridMesh = new THREE.Mesh(new THREE.PlaneGeometry(HALF_X * 2, HALF_Z * 2), new THREE.MeshBasicMaterial({ map:gt, transparent:true, depthWrite:false, opacity:.85 }));
  gridMesh.rotation.x = -Math.PI / 2; gridMesh.position.y = .09; gridMesh.visible = false; gridMesh.renderOrder = 2; world.add(gridMesh);
  /* guide: a bouncing arrow over the place to go, and a ring on the ground */
  const GA = new TM(); GA.add(GEO.cone, 0, 0, 0, .55, .8, .55, Math.PI, 0, 0, 0xffc23d); GA.add(GEO.cyl, 0, .6, 0, .22, .7, .22, 0, 0, 0, 0xffc23d);
  guideArrow = new THREE.Mesh(GA.geometry(), new THREE.MeshBasicMaterial({ vertexColors:true })); guideArrow.visible = false; world.add(guideArrow);
  guideRing = new THREE.Mesh(new THREE.RingGeometry(1.0, 1.3, 32), new THREE.MeshBasicMaterial({ color:0xffc23d, transparent:true, opacity:.8, depthWrite:false }));
  guideRing.rotation.x = -Math.PI / 2; guideRing.visible = false; world.add(guideRing);
}

/* ======================================================================
   The park layout: paths + placed things. The shown layout is yours, or the host's while visiting.
   ====================================================================== */
const fpOf = (k, o) => { const d = defOf(k); return (o & 1) ? { w:d.d, d:d.w } : { w:d.w, d:d.d }; };
const rotY = o => -o * Math.PI / 2;
const itemCells = it => { const f = fpOf(it.k, it.o), out = []; for(let r = it.r; r < it.r + f.d; r++) for(let c = it.c; c < it.c + f.w; c++) out.push(r * GW + c); return out; };
const centerOf = (k, c, r, o) => { const f = fpOf(k, o); return { x:cellX(c) + (f.w - 1) * CELL / 2, z:cellZ(r) + (f.d - 1) * CELL / 2, w:f.w * CELL, d:f.d * CELL }; };
const cellAtXZ = (x, z) => { const c = Math.round(x / CELL + (GW - 1) / 2), r = Math.round(z / CELL + (GH - 1) / 2); return c < 0 || c >= GW || r < 0 || r >= GH ? -1 : r * GW + c; };
let visiting = null;                 // { paths, items, help, money, rating, vc } from the host
const curLay = () => visiting || OWN;
let layVer = 1, sceneVer = 0;
const occ = new Int32Array(NC);      // uid on each cell (0 = free)
const ITM = new Map();               // uid → runtime info { it, def, cx, cz, acc, dist, reach, front }
let gateDist = new Int16Array(NC).fill(-1);
function bfs(starts, paths){
  const d = new Int16Array(NC).fill(-1), q = [];
  for(const s of starts) if(s >= 0 && paths[s]){ d[s] = 0; q.push(s); }
  for(let h = 0; h < q.length; h++){
    const i = q[h], c = i % GW, r = (i / GW) | 0;
    for(const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]){ const nc = c + dc, nr = r + dr; if(nc < 0 || nc >= GW || nr < 0 || nr >= GH) continue; const n = nr * GW + nc; if(paths[n] && d[n] < 0){ d[n] = d[i] + 1; q.push(n); } }
  }
  return d;
}
/* why something can't go there: '' = fine */
function placeWhy(lay, k, c, r, o){
  const f = fpOf(k, o);
  if(c < 0 || r < 0 || c + f.w > GW || r + f.d > GH) return 'out';
  for(let rr = r; rr < r + f.d; rr++) for(let cc = c; cc < c + f.w; cc++){ const i = rr * GW + cc; if(GATE_CELLS.includes(i)) return 'gate'; if(lay.paths[i] || occAt(lay, i)) return 'busy'; }
  return '';
}
function occAt(lay, i){ if(lay === curLay() && sceneVer === layVer) return occ[i]; for(const it of lay.items) if(itemCells(it).includes(i)) return it.u; return 0; }
const WHY = {
  out:L('هون برّا الملاهي', "That's outside the park", 'Orası parkın dışında'),
  busy:L('المكان مش فاضي 🙈', 'That spot is taken 🙈', 'Orası dolu 🙈'),
  gate:L('هون باب الملاهي 🚪', "That's the entrance 🚪", 'Orası giriş 🚪'),
  money:L('بدّك قروش أكتر 💰', 'You need more coins 💰', 'Daha çok para 💰 lazım'),
  lock:L('بتنفتح بنجوم أكتر ⭐', 'Unlocks with more stars ⭐', 'Daha çok yıldızla açılır ⭐'),
  max:L('الملاهي مليانة!', 'The park is full!', 'Park dolu!'),
  nohelp:L('صاحب الملاهي سكّر البناء', 'The park owner turned building off', 'Park sahibi inşayı kapattı')
};
const unlockedK = (k, best) => (defOf(k).need || 0) <= best + 1e-6;
/* the operations (yours, or the host's for a helping friend). Each returns '' when done, or why not. */
function opPlace(k, c, r, o){
  const d = CAT[k]; if(!d) return 'out';
  if(!unlockedK(k, SAVE.best)) return 'lock';
  if(OWN.items.length >= 90) return 'max';
  const why = placeWhy(OWN, k, c, r, o); if(why) return why;
  if(SAVE.money < d.price) return 'money';
  SAVE.money -= d.price;
  const it = { u:SAVE.uid++, k, c, r, o:o & 3 }; OWN.items.push(it);
  layChanged(); return '';
}
function opPath(i, on){
  if(i < 0 || i >= NC || GATE_CELLS.includes(i)) return 'gate';
  if(on){ if(OWN.paths[i]) return ''; if(occAt(OWN, i)) return 'busy'; if(SAVE.money < PATH_PRICE) return 'money'; SAVE.money -= PATH_PRICE; OWN.paths[i] = 1; }
  else { if(!OWN.paths[i]) return ''; OWN.paths[i] = 0; SAVE.money += PATH_PRICE; }
  layChanged(); return '';
}
const refundOf = k => Math.floor(CAT[k].price / 2);
function opRemove(u){
  const j = OWN.items.findIndex(it => it.u === u); if(j < 0) return 'out';
  const it = OWN.items[j]; OWN.items.splice(j, 1); SAVE.money += refundOf(it.k);
  layChanged(); return '';
}
function layChanged(){ layVer++; hudKey = ''; persist(); if(mpActive() && MP.isHost) MP.parkDirty = true; }

/* ---------- what the layout looks like in 3D ---------- */
const parkGrp = new THREE.Group(); world.add(parkGrp);
const pathTex = canvasTex(128, 128, x => { x.fillStyle = '#f6e3bb'; x.fillRect(0, 0, 128, 128); x.fillStyle = 'rgba(190,150,100,.18)'; x.fillRect(0, 0, 128, 4); x.fillRect(0, 0, 4, 128); x.fillRect(0, 62, 128, 3); x.fillRect(62, 0, 3, 64); x.fillRect(30, 64, 3, 64); x.fillRect(94, 64, 3, 64); x.fillStyle = 'rgba(255,255,255,.35)'; for(let i = 0; i < 30; i++) x.fillRect((i * 37) % 128, (i * 61) % 128, 3, 3); });
const pathMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(CELL, .08, CELL), new THREE.MeshStandardMaterial({ map:pathTex, roughness:.95 }), NC);
pathMesh.receiveShadow = true; pathMesh.count = 0; parkGrp.add(pathMesh);
const edgeMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, .1, 1), new THREE.MeshStandardMaterial({ color:0xd9b98a, roughness:.9 }), NC * 4);
edgeMesh.receiveShadow = true; edgeMesh.count = 0; parkGrp.add(edgeMesh);
let staticMesh = null, staticKey = '';
const RIDES = new Map();             // uid → running ride
const fountains = [], lampGlows = [];
for(let i = 0; i < 40; i++){ const s = new THREE.Sprite(new THREE.SpriteMaterial({ map:glowTex, color:0xffe7a0, transparent:true, opacity:.6, depthWrite:false, blending:THREE.AdditiveBlending })); s.visible = false; s.scale.setScalar(1.3); parkGrp.add(s); lampGlows.push(s); }
const STATIC_KINDS = new Set(KINDS.filter(k => CAT[k].cat !== 'ride'));
function syncScene(){
  sceneVer = layVer;
  const lay = curLay();
  /* occupancy and paths */
  occ.fill(0);
  for(const it of lay.items) for(const i of itemCells(it)) occ[i] = it.u;
  let n = 0, e = 0;
  for(let i = 0; i < NC; i++){
    if(!lay.paths[i]) continue;
    const c = i % GW, r = (i / GW) | 0, x = cellX(c), z = cellZ(r);
    _m.compose(_v.set(x, .04, z), _q.identity(), _s.set(1, 1, 1)); pathMesh.setMatrixAt(n++, _m);
    /* a little kerb on sides with no path next door */
    for(const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]){
      const nc = c + dc, nr = r + dr, out = nc < 0 || nc >= GW || nr < 0 || nr >= GH, np = !out && lay.paths[nr * GW + nc];
      if(np || (out && GATE_CELLS.includes(i) && dr === 1)) continue;
      _m.compose(_v.set(x + dc * (CELL / 2 - .06), .07, z + dr * (CELL / 2 - .06)), _q.identity(), _s.set(dc ? .12 : CELL, 1, dr ? .12 : CELL)); edgeMesh.setMatrixAt(e++, _m);
    }
  }
  pathMesh.count = n; edgeMesh.count = e; pathMesh.instanceMatrix.needsUpdate = edgeMesh.instanceMatrix.needsUpdate = true;
  /* stalls and decorations: one merged mesh */
  const st = lay.items.filter(it => STATIC_KINDS.has(it.k));
  const key = st.map(it => it.u + it.k + it.c + ',' + it.r + it.o).join('|');
  if(key !== staticKey){
    staticKey = key;
    if(staticMesh){ parkGrp.remove(staticMesh); staticMesh.geometry.dispose(); staticMesh = null; }
    if(st.length){ const M = new TM(); for(const it of st){ const p = centerOf(it.k, it.c, it.r, it.o); PM.addStatic(M, it.k, p.x, p.z, rotY(it.o), it.u); } staticMesh = meshOf(M); parkGrp.add(staticMesh); }
    fountains.length = 0; let li = 0;
    for(const it of st){ const p = centerOf(it.k, it.c, it.r, it.o); if(it.k === 'fountain') fountains.push(p); if(it.k === 'lamp' && li < lampGlows.length){ lampGlows[li].position.set(p.x, 2.55, p.z); lampGlows[li++].visible = true; } }
    for(; li < lampGlows.length; li++) lampGlows[li].visible = false;
  }
  /* rides: keep the running ones, add new, remove gone */
  const want = new Set();
  for(const it of lay.items){
    if(CAT[it.k].cat !== 'ride') continue;
    want.add(it.u);
    let rr = RIDES.get(it.u);
    if(rr && (rr.k !== it.k || rr.c !== it.c || rr.r !== it.r || rr.o !== it.o)){ dropRide(rr); rr = null; }
    if(!rr) RIDES.set(it.u, makeRide(it));
  }
  for(const [u, rr] of RIDES) if(!want.has(u)) dropRide(rr);
  /* reachability: which path cell each thing is used from, and walking distances */
  gateDist = bfs(GATE_CELLS, lay.paths);
  const seen = new Set();
  for(const it of lay.items){
    seen.add(it.u);
    const d = CAT[it.k], p = centerOf(it.k, it.c, it.r, it.o), ry = rotY(it.o), fx = Math.sin(ry), fz = Math.cos(ry);
    let info = ITM.get(it.u);
    if(!info){ info = { it }; ITM.set(it.u, info); }
    info.it = it; info.def = d; info.cx = p.x; info.cz = p.z; info.hw = p.w / 2; info.hd = p.d / 2; info.fx = fx; info.fz = fz;
    info.acc = -1; info.dist = null; info.reach = false;
    if(d.cat === 'ride' || d.cat === 'stall' || it.k === 'bench'){
      const cells = new Set(itemCells(it)); let best = -1, bd = 1e9;
      const ex = p.x + fx * (Math.max(p.w, p.d) / 2 + 1), ez = p.z + fz * (Math.max(p.w, p.d) / 2 + 1);
      for(const i of cells){ const c = i % GW, r = (i / GW) | 0; for(const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]){ const nc = c + dc, nr = r + dr; if(nc < 0 || nc >= GW || nr < 0 || nr >= GH) continue; const nb = nr * GW + nc; if(cells.has(nb) || !lay.paths[nb]) continue; const dd = Math.hypot(cellX(nc) - ex, cellZ(nr) - ez) + (gateDist[nb] < 0 ? 100 : 0); if(dd < bd){ bd = dd; best = nb; } } }
      info.acc = best;
      if(best >= 0){ info.dist = bfs([best], lay.paths); info.reach = gateDist[best] >= 0; }
    }
  }
  for(const u of [...ITM.keys()]) if(!seen.has(u)) ITM.delete(u);
  for(const v of visitors) if(v.tgt && !ITM.has(v.tgt)) v.redo = true;
}

/* ======================================================================
   Rides at runtime: idle → load (riders take seats, pay) → run → unload
   ====================================================================== */
const rideGrp = new THREE.Group(); parkGrp.add(rideGrp);
function makeRide(it){
  const obj = RIDE_BUILD[it.k](), p = centerOf(it.k, it.c, it.r, it.o);
  obj.grp.position.set(p.x, 0, p.z); obj.grp.rotation.y = rotY(it.o);
  obj.grp.traverse(o => { if(o.isMesh && !o.isInstancedMesh){ o.castShadow = true; o.receiveShadow = true; } else if(o.isInstancedMesh && o.material === MAT) o.castShadow = true; });
  rideGrp.add(obj.grp);
  const rr = { u:it.u, k:it.k, c:it.c, r:it.r, o:it.o, obj, phase:'idle', t:0, e:0, sp:0, riders:obj.seats.map(() => null), queue:[], wantP:false, remotes:new Set(), cx:p.x, cz:p.z,
    dur:CAT[it.k].run || obj.runDur || 12 };
  if(obj.onBump !== undefined) obj.onBump = (x, z) => { if(nearCam(rr)) SFX.bump(); _v.set(x, .6, z).applyMatrix4(obj.grp.matrixWorld); burst(_v.x, .6, _v.z, 6, [0xffe14d, 0xffffff], 2.5, .6); };
  if(obj.onSplash !== undefined) obj.onSplash = (x, z) => { _v.set(x, .3, z).applyMatrix4(obj.grp.matrixWorld); if(nearCam(rr)) SFX.splash(); for(let k = 0; k < 4; k++) spray(_v.x, .4, _v.z, (Math.random() - .5) * 3, (Math.random() - .5) * 3, 14, 5, .8); };
  if(obj.onWhoosh !== undefined) obj.onWhoosh = () => { if(nearCam(rr)) SFX.whoosh(); };
  if(obj.onDrop !== undefined) obj.onDrop = () => { if(nearCam(rr)) SFX.wee(); };
  return rr;
}
const nearCam = rr => P.ride && P.ride.u === rr.u || Math.hypot(camLook.x - rr.cx, camLook.z - rr.cz) < 14;
function dropRide(rr){
  unloadRide(rr, true);
  for(const v of rr.queue){ v.st = 'walk'; v.redo = true; }
  rr.queue.length = 0;
  rideGrp.remove(rr.obj.grp);
  rr.obj.grp.traverse(o => { if(o.geometry && o.geometry !== undefined && !o.isInstancedMesh) o.geometry.dispose(); });
  RIDES.delete(rr.u);
  if(P.wait === rr.u) P.wait = 0;
}
const freeSeat = rr => rr.riders.findIndex(x => !x);
function startLoad(rr, long){ rr.phase = 'load'; rr.t = long ? 3.4 : 2.4; if(nearCam(rr)) SFX.ding(); }
function seatPlayer(rr){
  const s = freeSeat(rr); if(s < 0) return false;
  rr.riders[s] = { kind:'p' }; P.ride = { u:rr.u, s }; P.wait = 0; P.goal = null; rideCam.mode = rideCam.mode || 'seat';
  if(mpActive()) mpSend('board', { r:rr.u });
  hudKey = ''; return true;
}
function boardPlayer(u){
  const rr = RIDES.get(u); if(!rr || P.ride) return false;
  if(rr.phase === 'run'){ P.wait = u; return true; }
  if(rr.phase === 'idle'){ startLoad(rr, true); }
  else rr.t = Math.max(rr.t, 2.2);
  if(!seatPlayer(rr)){ P.wait = u; return true; }
  return true;
}
function unloadRide(rr, quiet){
  rr.riders.forEach((x, s) => {
    if(!x) return;
    if(x.kind === 'v'){ const v = x.v; v.seat = null; v.st = 'walk'; v.ride = 0; placeAtAcc(v, rr.u); if(!quiet){ v.happy = Math.min(1, v.happy + .18 * CAT[rr.k].fun); v.energy = Math.max(0, v.energy - .08); bubble(v, pick(['🤩', '😄', '😆'])); } v.redo = true; }
    else if(x.kind === 'p'){ playerOff(rr, quiet); }
    rr.riders[s] = null;
  });
  rr.remotes.clear();
}
function playerOff(rr, quiet){
  if(!P.ride || P.ride.u !== rr.u) return;
  P.ride = null;
  const info = ITM.get(rr.u);
  if(info && info.acc >= 0){ const c = info.acc % GW, r = (info.acc / GW) | 0; P.x = cellX(c); P.z = cellZ(r); }
  else { P.x = rr.cx; P.z = rr.cz + 4; }
  P.face = Math.atan2(rr.cx - P.x, rr.cz - P.z) + Math.PI;
  P.vx = P.vz = 0; snapCam = true; hudKey = '';
  if(mpActive()) mpSend('board', { r:0 });
  if(!quiet && !visiting){
    SAVE.rides++; persist(); SFX.star(); burst(P.x, 1.2, P.z, 26, CONFETTI, 4, 1);
    if(SAVE.tut === 5){ SAVE.tut = 6; persist(); setTimeout(() => { if(state === 'play') say(LINES.decor, 7000); }, 600); }
    else if(Math.random() < .5) say(pick(LINES.after), 2600);
  }
}
function rideTick(rr, dt){
  if(rr.phase === 'idle'){
    rr.t -= dt;
    if(rr.t <= 0 && (rr.queue.length || rr.wantP || rr.remotes.size)) startLoad(rr, rr.wantP || rr.remotes.size);
  }
  if(rr.phase === 'load'){
    if(P.wait === rr.u && !P.ride) seatPlayer(rr);
    while(rr.queue.length && freeSeat(rr) >= 0){ const v = rr.queue.shift(); seatVisitor(rr, v); }
    rr.t -= dt;
    if(rr.t <= 0){
      if(rr.riders.some(Boolean) || rr.remotes.size){ rr.phase = 'run'; rr.e = 0; if(P.ride && P.ride.u === rr.u) SFX.wee(); }
      else { rr.phase = 'idle'; rr.t = .5; }
    }
  } else if(rr.phase === 'run'){
    rr.e += dt;
    const end = rr.dur - rr.e;
    rr.sp += ((end > 2.4 ? 1 : 0) - rr.sp) * Math.min(1, dt * (end > 2.4 ? 1.2 : 1.6));
    if(rr.e >= rr.dur){ rr.phase = 'idle'; rr.t = 1.4; rr.sp = 0; unloadRide(rr); }
  }
  if(rr.phase !== 'run') rr.sp = Math.max(0, rr.sp - dt * 1.5);
  rr.wantP = false;
  rr.obj.update(dt, T, rr);
}

/* ======================================================================
   Visitors: arrive at the gate, walk the paths, queue and ride, buy snacks, sit, and go home.
   Drawn with instancing (one draw call per body part for everybody).
   ====================================================================== */
const VP = PM.visitorParts(MAXV);
for(const k in VP) scene.add(VP[k]);
const SHIRTS = [0xff8fb1, 0x6cc4ff, 0x5ed6a0, 0xffc23d, 0xb99cff, 0xff9f5a, 0xffffff, 0x4f8fe8, 0xe8455f];
const PANTS = [0x3f5fae, 0x4a4f63, 0x8a6a4a, 0x2f8f8a, 0x6a4fa0, 0x5a7ad0];
const SKINS = [0xffd9b8, 0xf2c39b, 0xd9a07a, 0xb57c55, 0x8a5a3c, 0xffe3cc];
const HAIRS = [0x3a2a20, 0x6a4430, 0x1f1a17, 0xc98a3a, 0x8a5a2a, 0xe8c070];
const BALLOON_COLS = [0xe8455f, 0x6cc4ff, 0xffd23f, 0xff8fb1, 0x5ed6a0];
const visitors = [];
const freeSlots = Array.from({ length:MAXV }, (_, i) => MAXV - 1 - i);
let spawnT = 2, vSerial = 0;
function spawnVisitor(){
  if(!freeSlots.length) return null;
  const slot = freeSlots.pop(), gx = pick([-1, 1]);
  const v = { id:++vSerial, slot, x:(Math.random() - .5) * 6, z:HALF_Z + 11 + Math.random() * 2, face:Math.PI, st:'enter', cell:-1, wp:{ x:gx * 1, z:HALF_Z + 1.2 }, gx,
    tgt:0, lx:(Math.random() - .5) * .9, lz:(Math.random() - .5) * .9, money:18 + Math.floor(Math.random() * 22), happy:.72, hunger:Math.random() * .4, thirst:Math.random() * .4, toilet:Math.random() * .3, energy:.75 + Math.random() * .25,
    ridden:{}, sc:.82 + Math.random() * .28, ph:Math.random() * 9, t:0, stay:110 + Math.random() * 100, bub:'', bubT:0, snackT:0, balloon:-1, seat:null, ride:0, wait:0, bored:0, timer:0, redo:false, hide:false, move:0, why:'' };
  VP.torso.setColorAt(slot, _c.set(pick(SHIRTS))); const sk = pick(SKINS);
  VP.head.setColorAt(slot, _c.set(sk)); VP.arms.setColorAt(slot * 2, _c); VP.arms.setColorAt(slot * 2 + 1, _c);
  _c.set(pick(PANTS)); VP.legs.setColorAt(slot * 2, _c); VP.legs.setColorAt(slot * 2 + 1, _c);
  VP.hair.setColorAt(slot, _c.set(pick(HAIRS)));
  for(const k of ['torso', 'head', 'arms', 'legs', 'hair']) if(VP[k].instanceColor) VP[k].instanceColor.needsUpdate = true;
  visitors.push(v);
  if(!visiting){ SAVE.guests++; if(SAVE.guests % 10 === 0) persist(); }
  return v;
}
function removeVisitor(v){
  const j = visitors.indexOf(v); if(j < 0) return;
  visitors.splice(j, 1); freeSlots.push(v.slot);
  if(v.ride){ const rr = RIDES.get(v.ride); if(rr) rr.riders = rr.riders.map(x => x && x.v === v ? null : x); }
  for(const rr of RIDES.values()){ const q = rr.queue.indexOf(v); if(q >= 0) rr.queue.splice(q, 1); }
}
function clearVisitors(){ for(const v of visitors.slice()) removeVisitor(v); for(const rr of RIDES.values()){ rr.queue.length = 0; rr.riders = rr.riders.map(x => x && x.kind === 'v' ? null : x); } litter.length = 0; litterDirty = true; }
const cellPos = (i, v) => ({ x:cellX(i % GW) + (v ? v.lx : 0), z:cellZ((i / GW) | 0) + (v ? v.lz : 0) });
function placeAtAcc(v, u){
  const info = ITM.get(u); let i = info && info.acc >= 0 ? info.acc : -1;
  if(i < 0){ i = nearestPath(v.x, v.z); }
  if(i < 0){ v.st = 'exit'; v.wp = { x:v.gx, z:HALF_Z + 1.2 }; return; }
  v.cell = i; const p = cellPos(i, v); v.x = p.x; v.z = p.z; v.wp = p;
}
function nearestPath(x, z){ const lay = curLay(); let best = -1, bd = 1e9; for(let i = 0; i < NC; i++) if(lay.paths[i]){ const p = cellPos(i), d = Math.hypot(p.x - x, p.z - z); if(d < bd){ bd = d; best = i; } } return best; }
function bubble(v, e, t = 2.6){ v.bub = e; v.bubT = t; }
/* where to next: needs first, then rides they haven't tried; nothing to do → wander, then go home */
function decide(v){
  v.redo = false; v.tgt = 0; v.why = '';
  const here = v.cell;
  if(here < 0) return;
  if(v.money < 2 || v.t > v.stay || v.energy < .06){ goHome(v); return; }
  const opts = [];
  for(const info of ITM.values()){ if(!info.reach || !info.dist || info.dist[here] < 0) continue; opts.push(info); }
  const stallOf = sat => opts.filter(o => o.def.cat === 'stall' && o.def.sat === sat && v.money >= o.def.sell);
  const go = (o, why, e) => { v.tgt = o.it.u; v.why = why; if(e) bubble(v, e, 2.2); };
  if(v.toilet > .75){ const o = stallOf('toilet'); if(o.length){ go(pick(o), 'toilet', '🚻'); return; } }
  if(v.thirst > .7){ const o = stallOf('thirst'); if(o.length){ go(pick(o), 'drink', '🥤'); return; } }
  if(v.hunger > .7){ const o = stallOf('hunger'); if(o.length){ go(pick(o), 'eat', '😋'); return; } }
  if(v.energy < .3){ const o = opts.filter(o => o.it.k === 'bench' && benchUsers(o.it.u) < 2); if(o.length){ go(pick(o), 'sit', '😴'); return; } }
  if(v.balloon < 0 && Math.random() < .25){ const o = stallOf('balloon'); if(o.length){ go(pick(o), 'balloon'); return; } }
  if(v.hunger > .5 && Math.random() < .4){ const o = stallOf('hunger'); if(o.length){ go(pick(o), 'eat', '😋'); return; } }
  const rides = opts.filter(o => o.def.cat === 'ride' && v.money >= o.def.ticket);
  if(rides.length){
    let tot = 0; const w = rides.map(o => { const rr = RIDES.get(o.it.u), q = rr ? rr.queue.length / Math.max(1, rr.riders.length) : 0; const x = (v.ridden[o.it.k] ? .25 : 2) * o.def.fun / (1 + q * 2); tot += x; return x; });
    let r = Math.random() * tot; for(let i = 0; i < rides.length; i++){ r -= w[i]; if(r <= 0){ go(rides[i], 'ride'); return; } }
    go(rides[rides.length - 1], 'ride'); return;
  }
  v.bored++;
  if(v.bored > 3){ bubble(v, '😕'); goHome(v); return; }
  bubble(v, '🤔', 2); v.timer = 4 + Math.random() * 3; v.why = 'wander';
}
function goHome(v){ v.st = 'leave'; v.tgt = 0; v.why = 'home'; }
const benchUsers = u => visitors.filter(v => v.st === 'sit' && v.tgt === u).length;
function nextCell(v){
  const lay = curLay(), here = v.cell;
  const field = v.st === 'leave' ? gateDist : v.tgt ? (ITM.get(v.tgt) || {}).dist : null;
  const c = here % GW, r = (here / GW) | 0, nb = [];
  for(const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]){ const nc = c + dc, nr = r + dr; if(nc < 0 || nc >= GW || nr < 0 || nr >= GH) continue; const n = nr * GW + nc; if(lay.paths[n]) nb.push(n); }
  if(field && field[here] > 0){ const down = nb.filter(n => field[n] === field[here] - 1); if(down.length) return pick(down); }
  if(!nb.length) return -1;
  const fwd = nb.filter(n => n !== v.prev);
  return pick(fwd.length ? fwd : nb);
}
function pay(v, amt, x, y, z){
  if(v.money < amt) return false;
  v.money -= amt;
  if(!visiting){ SAVE.money += amt; SAVE.earned += amt; hudKey = ''; bumpChip('#hudMoney');
    if(SAVE.tut === 4){ SAVE.tut = 5; persist(); setTimeout(() => { if(state === 'play' && !build.on) say(LINES.rideIt, 7000); }, 900); } }
  moneyTag(x, y, z, amt);
  if(Math.hypot(camLook.x - x, camLook.z - z) < 16 && Math.random() < .5) SFX.coins();
  return true;
}
function seatVisitor(rr, v){
  const s = freeSeat(rr); if(s < 0) return false;
  if(!pay(v, CAT[rr.k].ticket, rr.cx, 3.2, rr.cz)){ v.st = 'walk'; v.redo = true; bubble(v, '💸'); return false; }
  STATS.tickets++;
  rr.riders[s] = { kind:'v', v }; v.st = 'ride'; v.seat = rr.obj.seats[s]; v.ride = rr.u; v.ridden[rr.k] = 1; v.wait = 0;
  return true;
}
function arrive(v){
  const info = ITM.get(v.tgt); if(!info){ v.redo = true; return; }
  const d = info.def;
  v.face = Math.atan2(info.cx - v.x, info.cz - v.z);
  if(d.cat === 'ride'){
    const rr = RIDES.get(v.tgt); if(!rr){ v.redo = true; return; }
    if(rr.queue.length >= rr.riders.length * 2){ bubble(v, '⏳'); v.ridden[rr.k] = 1; v.redo = true; return; }
    rr.queue.push(v); v.st = 'queue'; v.wait = 0;
    return;
  }
  if(info.it.k === 'bench'){
    if(benchUsers(v.tgt) >= 2){ v.redo = true; return; }
    const side = benchUsers(v.tgt) ? .35 : -.35, ry = rotY(info.it.o);
    v.st = 'sit'; v.timer = 6 + Math.random() * 4;
    v.x = info.cx + Math.cos(ry) * side + info.fx * .05; v.z = info.cz - Math.sin(ry) * side + info.fz * .05; v.face = ry;
    return;
  }
  v.st = d.sat === 'toilet' ? 'toilet' : 'buy'; v.timer = d.sat === 'toilet' ? 3 : 1.5;
}
function finishStall(v){
  const info = ITM.get(v.tgt); v.st = 'walk'; v.redo = true;
  if(!info){ return; }
  const d = info.def;
  if(!pay(v, d.sell, info.cx, 3, info.cz)){ bubble(v, '💸'); return; }
  if(d.sat === 'hunger' || d.sat === 'thirst') STATS.snacks++; else if(d.sat === 'balloon') STATS.balloons++; else STATS.toilets++;
  if(d.sat === 'hunger'){ v.hunger = 0; v.happy = Math.min(1, v.happy + .1); v.snackT = 5 + Math.random() * 6; bubble(v, info.it.k === 'ice' ? '🍦' : '🍿'); }
  else if(d.sat === 'thirst'){ v.thirst = 0; v.happy = Math.min(1, v.happy + .08); v.snackT = 5 + Math.random() * 6; bubble(v, '🧃'); }
  else if(d.sat === 'toilet'){ v.toilet = 0; v.happy = Math.min(1, v.happy + .05); v.hide = false; bubble(v, '😌'); }
  else if(d.sat === 'balloon'){ v.balloon = Math.floor(Math.random() * BALLOON_COLS.length); VP.ball.setColorAt(v.slot, _c.set(BALLOON_COLS[v.balloon])); VP.ball.instanceColor.needsUpdate = true; v.happy = Math.min(1, v.happy + .12); bubble(v, '🎈'); }
}
/* litter: a snack wrapper is dropped if there is no bin close by; walk over it to pick it up */
const litter = []; let litterDirty = true;
const litterMesh = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(.13, 0), new THREE.MeshStandardMaterial({ roughness:.7, flatShading:true }), 40);
litterMesh.count = 0; litterMesh.castShadow = true; scene.add(litterMesh);
function binNear(x, z){ for(const it of curLay().items){ if(it.k !== 'bin') continue; const p = centerOf(it.k, it.c, it.r, it.o); if(Math.hypot(p.x - x, p.z - z) < 4.2) return p; } return null; }
function dropLitter(v){
  const b = binNear(v.x, v.z);
  if(b){ burst(b.x, .8, b.z, 4, [0xffffff, 0x5ed6a0], 1.2, .5); return; }
  if(litter.length >= 40) return;
  litter.push({ x:v.x + (Math.random() - .5) * .4, z:v.z + (Math.random() - .5) * .4, r:Math.random() * 6, c:pick([0xffffff, 0xffd6e4, 0xfff0b0, 0xd8f0ff]) }); litterDirty = true;
  if(!visiting && !SAVE.ms.litterTip && state === 'play' && !build.on){ SAVE.ms.litterTip = 1; say(LINES.litter, 6000); }
}
function cleanLitter(j, byMe){
  const l = litter[j]; if(!l) return;
  litter.splice(j, 1); litterDirty = true;
  burst(l.x, .3, l.z, 10, [0xffffff, 0x5ed6a0, 0xffe14d], 2, .7); SFX.pick();
  if(byMe && !visiting){ SAVE.money += 1; hudKey = ''; moneyTag(l.x, 1.2, l.z, 1); }
}
function litterFrame(){
  if(!litterDirty) return; litterDirty = false;
  litter.forEach((l, i) => { _m.compose(_v.set(l.x, .1, l.z), _q.setFromEuler(_e.set(l.r, l.r * 2, 0)), _s.set(1, .6, 1.2)); litterMesh.setMatrixAt(i, _m); litterMesh.setColorAt(i, _c.set(l.c)); });
  litterMesh.count = litter.length; litterMesh.instanceMatrix.needsUpdate = true; if(litterMesh.instanceColor) litterMesh.instanceColor.needsUpdate = true;
}
/* the visitor simulation (runs in your own park, and also as decoration in a friend's park) */
function openRides(){ let n = 0; for(const info of ITM.values()) if(info.def.cat === 'ride' && info.reach) n++; return n; }
function simVisitors(dt){
  const lay = curLay(), nr = openRides(), rating = visiting ? visiting.rating : RATE.total;
  /* new visitors */
  spawnT -= dt;
  const cap = Math.min(MAXV - 4, 5 + nr * 4 + Math.round(rating * 3));
  if(spawnT <= 0){ spawnT = clamp(7.5 - rating * 1.0 - nr * .4, 1.6, 8) * (.7 + Math.random() * .6); if(nr && visitors.length < cap) spawnVisitor(); }
  for(const v of visitors.slice()){
    v.t += dt; v.bubT = Math.max(0, v.bubT - dt);
    if(v.st !== 'ride'){ v.hunger = Math.min(1, v.hunger + dt * .007); v.thirst = Math.min(1, v.thirst + dt * .009); v.toilet = Math.min(1, v.toilet + dt * .005); }
    v.energy = Math.max(0, v.energy - dt * (v.st === 'sit' ? -.12 : .004));
    if(v.snackT > 0){ v.snackT -= dt; if(v.snackT <= 0) dropLitter(v); }
    let walk = false;
    switch(v.st){
      case 'enter': walk = true;
        if(stepTo(v, dt)){ const i = GATE_CELLS[v.gx < 0 ? 0 : 1]; v.cell = i; v.st = 'walk'; v.redo = true; v.wp = cellPos(i, v); }
        break;
      case 'walk': walk = true;
        if(!lay.paths[v.cell] && v.cell >= 0){ v.st = 'exit'; v.wp = { x:v.gx, z:HALF_Z + 1.2 }; break; }
        if(stepTo(v, dt)){
          if(v.redo || (!v.tgt && v.why !== 'wander')) decide(v);
          if(v.st !== 'walk') break;
          const info = v.tgt ? ITM.get(v.tgt) : null;
          if(v.tgt && (!info || !info.dist || info.dist[v.cell] < 0)){ v.redo = true; v.tgt = 0; }
          if(info && info.acc === v.cell){ arrive(v); break; }
          if(v.why === 'wander'){ v.timer -= .6; if(v.timer <= 0) v.redo = true; }
          const n = nextCell(v); if(n < 0){ goHome(v); break; }
          v.prev = v.cell; v.cell = n; v.wp = cellPos(n, v);
        }
        break;
      case 'leave': walk = true;
        if(!lay.paths[v.cell]){ v.st = 'exit'; v.wp = { x:v.gx, z:HALF_Z + 1.2 }; break; }
        if(stepTo(v, dt)){
          if(gateDist[v.cell] === 0 || gateDist[v.cell] < 0 && GATE_CELLS.includes(v.cell)){ v.st = 'exit'; v.wp = { x:cellX(v.cell % GW), z:HALF_Z + 2 }; break; }
          if(gateDist[v.cell] < 0){ v.st = 'exit'; v.wp = { x:v.gx, z:HALF_Z + 1.2 }; break; }
          const n = nextCell(v); if(n < 0){ v.st = 'exit'; break; } v.prev = v.cell; v.cell = n; v.wp = cellPos(n, v);
        }
        break;
      case 'exit': walk = true;
        if(stepTo(v, dt)){ if(v.wp.z < HALF_Z + 10){ v.wp = { x:(Math.random() - .5) * 8, z:HALF_Z + 14 }; } else removeVisitor(v); }
        break;
      case 'queue':
        v.wait += dt; { const info = ITM.get(v.tgt); if(!info){ v.st = 'walk'; v.redo = true; break; }
          const rr = RIDES.get(v.tgt), q = rr ? rr.queue.indexOf(v) : -1; if(q < 0){ v.st = 'walk'; v.redo = true; break; }
          const p = cellPos(info.acc), dx = info.cx - p.x, dz = info.cz - p.z, dl = Math.hypot(dx, dz) || 1, row = q % 3, col = Math.floor(q / 3);
          v.wp = { x:p.x + dx / dl * (.6 - col * .55) + (row - 1) * .55 * (dz / dl), z:p.z + dz / dl * (.6 - col * .55) - (row - 1) * .55 * (dx / dl) };
          if(stepTo(v, dt, .8)) v.face = Math.atan2(dx, dz); else walk = true;
          if(v.wait > 45){ rr.queue.splice(q, 1); v.st = 'walk'; v.redo = true; v.ridden[rr.k] = 1; bubble(v, '😴'); } }
        break;
      case 'buy': v.timer -= dt; if(v.timer <= 0) finishStall(v); break;
      case 'toilet': v.timer -= dt; v.hide = v.timer > .2; if(v.timer <= 0){ v.hide = false; finishStall(v); } break;
      case 'sit': if(v.timer > 5.95 && v.timer - dt <= 5.95) STATS.sits++; v.timer -= dt; if(v.timer <= 0){ v.energy = 1; v.st = 'walk'; placeAtAcc(v, v.tgt); v.redo = true; bubble(v, '😊'); } break;
      case 'ride': break;
    }
    v.move = lerp(v.move, walk ? 1 : 0, Math.min(1, dt * 8));
    /* mood: decorations cheer, litter and unmet needs don't */
    if(Math.random() < dt){
      if(v.cell >= 0 && beautyAt[v.cell]) v.happy = Math.min(1, v.happy + .012 * Math.min(3, beautyAt[v.cell]));
      for(const l of litter) if(Math.abs(l.x - v.x) < 2 && Math.abs(l.z - v.z) < 2){ v.happy = Math.max(0, v.happy - .03); if(!v.bubT && Math.random() < .12) bubble(v, '🙁', 1.6); break; }
      if(v.hunger > .95 || v.thirst > .95) v.happy = Math.max(0, v.happy - .01);
      if(!v.bubT && v.st === 'walk' && Math.random() < .08){ const e = v.hunger > .8 ? '😋' : v.thirst > .8 ? '🥤' : v.energy < .25 ? '😴' : v.toilet > .8 ? '🚻' : v.happy > .8 ? '😄' : ''; if(e) bubble(v, e, 2); }
    }
  }
}
const beautyAt = new Float32Array(NC);
function calcBeauty(){
  beautyAt.fill(0);
  for(const it of curLay().items){ const d = CAT[it.k]; if(d.cat !== 'deco') continue; const c0 = it.c, r0 = it.r;
    for(let r = r0 - 2; r <= r0 + 2; r++) for(let c = c0 - 2; c <= c0 + 2; c++){ if(c < 0 || c >= GW || r < 0 || r >= GH) continue; beautyAt[r * GW + c] += d.beauty * .5; } }
}
function stepTo(v, dt, sp = 1){
  const dx = v.wp.x - v.x, dz = v.wp.z - v.z, d = Math.hypot(dx, dz), s = 1.55 * v.sc * sp * dt;
  if(d <= s + .01){ v.x = v.wp.x; v.z = v.wp.z; return true; }
  v.x += dx / d * s; v.z += dz / d * s; v.face += angDiff(Math.atan2(dx, dz), v.face) * Math.min(1, dt * 10);
  return false;
}
/* drawing everybody */
const ZERO = new THREE.Matrix4().makeScale(0, 0, 0);
const _B = new THREE.Matrix4(), _L = new THREE.Matrix4(), _o = new THREE.Matrix4();
function part(mesh, i, x, y, z, rx, ry, rz){ _L.compose(_v.set(x, y, z), _q.setFromEuler(_e.set(rx, ry, rz)), _s.set(1, 1, 1)); _o.multiplyMatrices(_B, _L); mesh.setMatrixAt(i, _o); }
function drawVisitors(){
  const used = new Set();
  for(const v of visitors){
    const i = v.slot; used.add(i);
    let seated = false, cheer = 0;
    if(v.hide){ hideSlot(i); continue; }
    if(v.st === 'ride' && v.seat){
      v.seat.updateWorldMatrix(true, false);
      _m2.compose(_v.set(0, -.42 * v.sc, -.04), _q.identity(), _s.set(v.sc, v.sc, v.sc)); _B.multiplyMatrices(v.seat.matrixWorld, _m2);
      _v2.setFromMatrixPosition(v.seat.matrixWorld); v.x = _v2.x; v.z = _v2.z;
      seated = true; const rr = RIDES.get(v.ride); cheer = rr && rr.sp > .6 && Math.sin(T * 2 + v.ph) > .2 ? 1 : 0;
    } else if(v.st === 'sit'){
      _B.compose(_v.set(v.x, -.0, v.z), _q.setFromEuler(_e.set(0, v.face, 0)), _s.set(v.sc, v.sc, v.sc)); seated = true;
    } else {
      const bob = Math.abs(Math.sin(T * 9 * (1 / v.sc) + v.ph)) * .05 * v.move;
      _B.compose(_v.set(v.x, bob, v.z), _q.setFromEuler(_e.set(0, v.face, 0)), _s.set(v.sc, v.sc, v.sc));
    }
    const sw = seated ? 0 : Math.sin(T * 9 * (1 / v.sc) + v.ph) * .7 * v.move;
    const legX = seated ? -1.45 : 0;
    part(VP.legs, i * 2, -.085, .43, 0, legX + sw, 0, 0); part(VP.legs, i * 2 + 1, .085, .43, 0, legX - sw, 0, 0);
    part(VP.torso, i, 0, .64, 0, 0, 0, 0);
    const az = cheer ? 2.6 + Math.sin(T * 8 + v.ph) * .2 : .14;
    part(VP.arms, i * 2, -.22, .82, 0, cheer ? 0 : -sw, 0, -az); part(VP.arms, i * 2 + 1, .22, .82, 0, cheer ? 0 : sw, 0, az);
    const hr = Math.sin(T * .7 + v.ph) * .25 * (1 - v.move);
    part(VP.head, i, 0, 1.06, 0, 0, hr, 0); part(VP.hair, i, 0, 1.08, -.01, -.15, hr, 0);
    part(VP.eyes, i, Math.sin(hr) * .19, 1.08, Math.cos(hr) * .19, 0, hr, 0);
    if(v.balloon >= 0){ const b = Math.sin(T * 1.7 + v.ph) * .06; part(VP.ball, i, .34 + b, 1.95, .05, 0, 0, b); part(VP.str, i, .29, .66, .03, 0, 0, -.06 + b * .5); }
    else { VP.ball.setMatrixAt(i, ZERO); VP.str.setMatrixAt(i, ZERO); }
  }
  for(let i = 0; i < MAXV; i++) if(!used.has(i)) hideSlot(i);
  for(const k in VP){ VP[k].count = VP[k] === VP.legs || VP[k] === VP.arms ? MAXV * 2 : MAXV; VP[k].instanceMatrix.needsUpdate = true; }
}
function hideSlot(i){ for(const k of ['torso', 'head', 'hair', 'eyes', 'ball', 'str']) VP[k].setMatrixAt(i, ZERO); for(const k of ['legs', 'arms']){ VP[k].setMatrixAt(i * 2, ZERO); VP[k].setMatrixAt(i * 2 + 1, ZERO); } }

/* ======================================================================
   Park rating (stars): variety of rides, stalls, decorations, cleanliness, happy visitors
   ====================================================================== */
const RATE = { v:0, f:0, d:0, c:.5, h:.4, total:0 };
const STATS = { tickets:0, snacks:0, balloons:0, toilets:0, sits:0 };
function computeRating(){
  if(visiting) return;
  const kinds = new Set(), stalls = new Set(); let beauty = 0, open = 0;
  for(const it of OWN.items){ const info = ITM.get(it.u), d = CAT[it.k];
    if(d.cat === 'ride'){ if(info && info.reach){ kinds.add(it.k); open++; } }
    else if(d.cat === 'stall'){ if(info && info.reach) stalls.add(it.k); }
    else beauty += d.beauty; }
  RATE.v = Math.min(2, kinds.size * .4);
  RATE.f = Math.min(1, stalls.size * .2);
  RATE.d = Math.min(1, beauty / 16);
  RATE.c = .5 * (1 - Math.min(1, litter.length / 8));
  const hv = visitors.filter(v => v.st !== 'enter' && v.st !== 'exit');
  RATE.h = .5 * Math.min(1, (hv.length ? hv.reduce((a, v) => a + v.happy, 0) / hv.length : .75) / .85);
  RATE.total = open ? clamp(RATE.v + RATE.f + RATE.d + RATE.c + RATE.h, 0, 5) : 0;
  const shown = Math.floor(RATE.total * 2 + 1e-6) / 2;
  if(shown > SAVE.best){ const old = SAVE.best; SAVE.best = shown; persist(); onBest(old, shown); }
  checkMilestones();
}
const shownRating = () => visiting ? visiting.rating : Math.floor(RATE.total * 2 + 1e-6) / 2;
function onBest(old, now){
  const fresh = KINDS.filter(k => CAT[k].need > old && CAT[k].need <= now);
  bumpChip('#hudRate');
  if(!fresh.length) return;
  SFX.unlock(); hudKey = ''; build.dirty = true;
  if(state === 'play') pop('🔓 ' + fresh.map(k => CAT[k].e).join(' '));
  setTimeout(() => { if(state === 'play') say(L('انفتحت أشيا جديدة! 🔓 ', 'New things unlocked! 🔓 ', 'Yeni şeyler açıldı! 🔓 ') + fresh.map(k => CAT[k].e + ' ' + CAT[k].name).join('، '), 5000, build.on); }, 900);
}
function checkMilestones(){
  if(visiting) return;
  for(const m of MILESTONES){
    if(SAVE.ms[m.id] || !m.test()) continue;
    SAVE.ms[m.id] = 1; persist();
    try{ if(window.World) World.addCoins(m.coins, L('من ملاهي بوبو', 'from Bobo Theme Park', 'Bobo Lunaparkı\'ndan')); }catch(e){}
    if(state === 'play') setTimeout(() => say('🏅 ' + m.txt, 5000, build.on), 1500);
    SFX.star();
  }
}

/* ======================================================================
   The player, cameras (walk / build / ride), input
   ====================================================================== */
const SPAWN = { x:0, z:HALF_Z + 4, f:Math.PI };
const P = { x:SPAWN.x, z:SPAWN.z, vx:0, vz:0, face:SPAWN.f, move:0, goal:null, ride:null, wait:0 };
let heroM = null, T = 0;
function shadowAll(g){ g.traverse(o => { if(o.isMesh) o.castShadow = true; }); }
function setHero(id){
  heroId = HEROES[id] ? id : 'sara';
  if(heroM) scene.remove(heroM.grp);
  heroM = HEROES[heroId](); shadowAll(heroM.grp); scene.add(heroM.grp);
}
const cam = { yaw:0, pitch:.62, dist:10.5, tx:P.x, tz:P.z, pAdj:0 };
const bcam = { x:0, z:1, dist:30 };
const rideCam = { mode:'seat', a:0 };
let snapCam = true, closeup = null;
const camPos = new THREE.Vector3(), camLook = new THREE.Vector3();
const BC_PITCH = .98;
function seatWorld(rr, s){ const o = rr.obj.seats[s]; o.updateWorldMatrix(true, false); return o.matrixWorld; }
function updateCamera(dt){
  if(closeup){
    camPos.lerp(_v.set(closeup.px, closeup.py, closeup.pz), 1 - Math.exp(-5 * dt)); camLook.lerp(_s.set(closeup.lx, closeup.ly, closeup.lz), 1 - Math.exp(-6 * dt));
    camera.position.copy(camPos); camera.lookAt(camLook); return;
  }
  let fov = 50;
  if(build.on){
    bcam.x = clamp(bcam.x, -HALF_X, HALF_X); bcam.z = clamp(bcam.z, -HALF_Z, HALF_Z + 6); bcam.dist = clamp(bcam.dist, 10, 40);
    _v.set(bcam.x, Math.sin(BC_PITCH) * bcam.dist, bcam.z + Math.cos(BC_PITCH) * bcam.dist);
    const k = snapCam ? 1 : 1 - Math.exp(-9 * dt); snapCam = false;
    camPos.lerp(_v, k); camLook.lerp(_s.set(bcam.x, 0, bcam.z), k);
  } else if(P.ride && RIDES.get(P.ride.u)){
    const rr = RIDES.get(P.ride.u), W = seatWorld(rr, P.ride.s);
    _v2.setFromMatrixPosition(W); _q.setFromRotationMatrix(W);
    if(rideCam.mode === 'seat'){
      _v.set(0, 1.9, -2.7).applyQuaternion(_q).add(_v2); _s.set(0, .7, 3).applyQuaternion(_q).add(_v2);
      if(_v.y < .6) _v.y = .6;
      const k = 1 - Math.exp(-7 * dt); camPos.lerp(_v, snapCam ? 1 : k); camLook.lerp(_s, snapCam ? 1 : k);
      fov = 50 + Math.min(14, rr.sp * 8 + (rr.k === 'coaster' || rr.k === 'drop' ? 6 * rr.sp : 0));
    } else {
      rideCam.a += dt * .25; const c = rr.obj.cam || { d:9, h:5 };
      _v.set(rr.cx + Math.sin(rideCam.a) * c.d, c.h + 1, rr.cz + Math.cos(rideCam.a) * c.d);
      const k = 1 - Math.exp(-3 * dt); camPos.lerp(_v, snapCam ? 1 : k); camLook.lerp(_s.set(rr.cx, 2, rr.cz), snapCam ? 1 : k);
    }
    snapCam = false;
  } else {
    cam.pitch = lerp(cam.pitch, clamp(.62 + cam.pAdj, .3, 1.2), Math.min(1, dt * 3));
    const k = snapCam ? 1 : 1 - Math.exp(-7 * dt);
    cam.tx = lerp(cam.tx, P.x, k); cam.tz = lerp(cam.tz, P.z, k);
    const dx = Math.sin(cam.yaw) * Math.cos(cam.pitch), dy = Math.sin(cam.pitch), dz = Math.cos(cam.yaw) * Math.cos(cam.pitch);
    _v.set(cam.tx + dx * cam.dist, .9 + dy * cam.dist, cam.tz + dz * cam.dist);
    if(snapCam){ camPos.copy(_v); camLook.set(cam.tx, .9, cam.tz); snapCam = false; } else { camPos.lerp(_v, 1 - Math.exp(-10 * dt)); camLook.lerp(_s.set(cam.tx, .9, cam.tz), 1 - Math.exp(-14 * dt)); }
  }
  if(Math.abs(camera.fov - fov) > .05){ camera.fov = lerp(camera.fov, fov, Math.min(1, dt * 3)); camera.updateProjectionMatrix(); }
  camera.position.copy(camPos); camera.lookAt(camLook);
}
const joy = { x:0, y:0, id:null, ox:0, oy:0 }, look = { id:null, x:0, y:0, sx:0, sy:0, t0:0 }, keys = {};
const joyEl = $('#joy'), knob = $('#knob'), actBtn = $('#btnAct'), touch = $('#touch');
let joyHome = [90, 0];
function placeJoyHome(){ joyHome = [Math.max(84, SAL + 78), SH - Math.max(92, SH * .16) - SAB * .5]; if(joy.id == null) setJoy(joyHome[0], joyHome[1]); }
function setJoy(x, y){ joyEl.style.left = x + 'px'; joyEl.style.top = y + 'px'; }
const ptrs = new Map(); let pinch = null, painting = 0;
touch.addEventListener('pointerdown', e => {
  e.preventDefault(); ac();
  const p = toLayer(e.clientX, e.clientY);
  try{ touch.setPointerCapture(e.pointerId); }catch(err){}
  if(state !== 'play') return;
  if(build.on){ buildDown(e.pointerId, p); return; }
  if(P.ride) { look.id = e.pointerId; look.sx = look.x = p.x; look.sy = look.y = p.y; look.t0 = performance.now(); return; }
  if(p.x < SW * .3 && p.y > SH * .3 && joy.id == null){
    joy.id = e.pointerId; joy.ox = clamp(p.x, Math.max(70, SAL + 64), SW * .3); joy.oy = clamp(p.y, 140, SH - 70);
    setJoy(joy.ox, joy.oy); joyEl.classList.add('on'); moveJoy(p.x, p.y);
  } else if(look.id == null){ look.id = e.pointerId; look.sx = look.x = p.x; look.sy = look.y = p.y; look.t0 = performance.now(); }
});
function moveJoy(x, y){
  let dx = x - joy.ox, dy = y - joy.oy; const d = Math.hypot(dx, dy), m = 52;
  if(d > m){ dx *= m / d; dy *= m / d; }
  knob.style.transform = `translate(${dx}px,${dy}px)`;
  joy.x = dx / m; joy.y = dy / m;
}
touch.addEventListener('pointermove', e => {
  const p = toLayer(e.clientX, e.clientY);
  if(build.on && state === 'play'){ buildMove(e.pointerId, p, e); return; }
  if(e.pointerId === joy.id) moveJoy(p.x, p.y);
  else if(e.pointerId === look.id && state === 'play' && Math.hypot(p.x - look.sx, p.y - look.sy) > 14){ if(P.ride && rideCam.mode === 'wide') rideCam.a -= (p.x - look.x) * .008; else cam.yaw -= (p.x - look.x) * .0075; cam.pAdj = clamp(cam.pAdj + (p.y - look.y) * .004, -.3, .45); look.x = p.x; look.y = p.y; }
  else if(e.pointerId === look.id){ look.x = p.x; look.y = p.y; }
});
function endPtr(e){
  const p = toLayer(e.clientX, e.clientY);
  if(build.on && ptrs.has(e.pointerId)){ buildUp(e.pointerId, p, e.type === 'pointerup'); return; }
  if(e.pointerId === joy.id){ joy.id = null; joy.x = joy.y = 0; knob.style.transform = ''; joyEl.classList.remove('on'); setJoy(...joyHome); }
  if(e.pointerId === look.id){
    look.id = null;
    if(Math.hypot(p.x - look.sx, p.y - look.sy) < 14 && performance.now() - look.t0 < 500 && e.type === 'pointerup') tapAt(p.x, p.y);
  }
}
touch.addEventListener('pointerup', endPtr); touch.addEventListener('pointercancel', endPtr);
touch.addEventListener('wheel', e => { if(build.on){ bcam.dist *= e.deltaY > 0 ? 1.1 : .9; e.preventDefault(); } }, { passive:false });
actBtn.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); ac(); actBtn.classList.add('on'); doAction(); });
['pointerup', 'pointercancel', 'pointerleave'].forEach(t => actBtn.addEventListener(t, () => actBtn.classList.remove('on')));
const KEYMAP = { KeyW:'f', ArrowUp:'f', KeyS:'b', ArrowDown:'b', KeyA:'l', ArrowLeft:'l', KeyD:'r', ArrowRight:'r', KeyQ:'cl', KeyE:'cr' };
addEventListener('keydown', e => {
  if(KEYMAP[e.code]){ keys[KEYMAP[e.code]] = true; e.preventDefault(); }
  if((e.code === 'Space' || e.code === 'Enter') && state === 'play' && !e.repeat && !build.on){ doAction(); e.preventDefault(); }
  if(e.code === 'KeyR' && build.on && state === 'play') rotateTool();
  if((e.code === 'Escape' || e.code === 'KeyP') && state === 'play') showPause();
});
addEventListener('keyup', e => { if(KEYMAP[e.code]) keys[KEYMAP[e.code]] = false; });
addEventListener('blur', () => { for(const k in keys) keys[k] = false; });
function clearInput(){ joy.id = null; joy.x = joy.y = 0; look.id = null; knob.style.transform = ''; joyEl.classList.remove('on'); for(const k in keys) keys[k] = false; ptrs.clear(); pinch = null; painting = 0; }
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
function rayAt(x, y){ ndc.set(x / SW * 2 - 1, -(y / SH * 2 - 1)); ray.setFromCamera(ndc, camera); return ray; }
function groundAt(x, y){ const r = rayAt(x, y); return r.ray.intersectPlane(groundPlane, new THREE.Vector3()); }
const _box = new THREE.Box3();
/* tap the world while walking: a ride (walk there and get on), litter, or just walk */
function tapAt(x, y){
  if(state !== 'play' || P.ride) return;
  const r = rayAt(x, y); let best = null, bd = 1e9;
  for(const info of ITM.values()){
    if(info.def.cat !== 'ride') continue;
    _box.min.set(info.cx - info.hw + .2, 0, info.cz - info.hd + .2); _box.max.set(info.cx + info.hw - .2, info.it.k === 'ferris' || info.it.k === 'drop' ? 6 : 3.5, info.cz + info.hd - .2);
    const hit = r.ray.intersectBox(_box, _v); if(hit){ const d = hit.distanceTo(camera.position); if(d < bd){ bd = d; best = info; } }
  }
  if(best){ const u = best.it.u, gp = boardSpot(best); walkTo(gp.x, gp.z, .5, () => { if(!boardPlayer(u)) SFX.bonk(); }); return; }
  const hit = r.ray.intersectPlane(groundPlane, _v); if(!hit) return;
  const lj = litter.findIndex(l => Math.hypot(l.x - hit.x, l.z - hit.z) < 1.1);
  if(lj >= 0){ walkTo(litter[lj].x, litter[lj].z, .3, null); return; }
  walkTo(hit.x, hit.z, .3, null);
}
function boardSpot(info){ if(info.acc >= 0){ return cellPos(info.acc); } return { x:info.cx + info.fx * (info.hd + 1), z:info.cz + info.fz * (info.hd + 1) }; }
function walkTo(x, z, r, fn){ P.goal = { x, z, r, fn, t:6 }; }
const inp = { x:0, z:0, m:0 };
function readInput(dt){
  let ix = joy.x + (keys.r ? 1 : 0) - (keys.l ? 1 : 0), iy = joy.y + (keys.b ? 1 : 0) - (keys.f ? 1 : 0);
  let m = Math.hypot(ix, iy); if(m > 1){ ix /= m; iy /= m; m = 1; } if(m < .12){ ix = iy = 0; m = 0; }
  if(keys.cl) cam.yaw += 2.2 * dt; if(keys.cr) cam.yaw -= 2.2 * dt;
  const fx = -Math.sin(cam.yaw), fz = -Math.cos(cam.yaw), rx = Math.cos(cam.yaw), rz = -Math.sin(cam.yaw);
  inp.x = rx * ix - fx * iy; inp.z = rz * ix - fz * iy; inp.m = m;
  if(m > 0){ P.goal = null; if(P.wait){ P.wait = 0; hudKey = ''; } }
  else if(P.goal){
    const g = P.goal, dx = g.x - P.x, dz = g.z - P.z, d = Math.hypot(dx, dz); g.t -= dt;
    if(d <= g.r || g.t <= 0){ P.goal = null; if(d > .05) P.face = Math.atan2(dx, dz); if(g.fn) g.fn(); }
    else { const sp = clamp((d - g.r) * 1.5, .35, 1); inp.x = dx / d * sp; inp.z = dz / d * sp; inp.m = sp; }
  }
}
const SPEED = 5.4;
function collide(o, r){
  o.x = clamp(o.x, -HALF_X - .1 + r, HALF_X + .1 - r); o.z = clamp(o.z, -HALF_Z - .1 + r, HALF_Z + 13);
  const rect = (x0, z0, x1, z1) => {
    const cx = clamp(o.x, x0, x1), cz = clamp(o.z, z0, z1), dx = o.x - cx, dz = o.z - cz, q = dx * dx + dz * dz;
    if(q < r * r){ if(q > 1e-6){ const s = Math.sqrt(q); o.x = cx + dx / s * r; o.z = cz + dz / s * r; } else { const l = o.x - x0, rr = x1 - o.x, t = o.z - z0, bt = z1 - o.z, mn = Math.min(l, rr, t, bt); if(mn === l) o.x = x0 - r; else if(mn === rr) o.x = x1 + r; else if(mn === t) o.z = z0 - r; else o.z = z1 + r; } }
  };
  for(const b of BOXES) rect(b.x0, b.z0, b.x1, b.z1);
  for(const info of ITM.values()){
    const k = info.it.k; if(k === 'flowers') continue;
    const ins = info.def.cat === 'ride' ? .25 : k === 'lamp' || k === 'bin' ? .75 : .35;
    rect(info.cx - info.hw + ins, info.cz - info.hd + ins, info.cx + info.hw - ins, info.cz + info.hd - ins);
  }
}
function stepPlayer(dt){
  P.vx += (inp.x * SPEED - P.vx) * Math.min(1, 14 * dt); P.vz += (inp.z * SPEED - P.vz) * Math.min(1, 14 * dt);
  P.x += P.vx * dt; P.z += P.vz * dt; collide(P, .42);
  if(inp.m > 0) P.face += angDiff(Math.atan2(inp.x, inp.z), P.face) * Math.min(1, 12 * dt);
  P.move = Math.min(1, Math.hypot(P.vx, P.vz) / SPEED);
  /* pick up litter by walking over it */
  for(let j = litter.length - 1; j >= 0; j--) if(Math.hypot(litter[j].x - P.x, litter[j].z - P.z) < .85) cleanLitter(j, true);
}
function poseOnSeat(h, rr, s, t, dt){
  const W = seatWorld(rr, s);
  _m2.compose(_v.set(0, -.46, -.08), _q.identity(), _s.set(1, 1, 1)); _o.multiplyMatrices(W, _m2);
  _o.decompose(h.grp.position, h.grp.quaternion, _s);
  poseHero(h, { t, dt, run:0, grounded:true, vy:0, sq:0, flip:0 });
  h.legs.forEach(l => { l.rotation.x = -1.35; });
  if(rr.sp > .55 && Math.sin(t * 1.8) > -.2) h.arms.forEach(a => { a.rotation.x = -.2; a.rotation.z = -a.userData.side * (2.5 + Math.sin(t * 9) * .15); });
}

/* ======================================================================
   Build mode: tabs, items, rotate, remove, ghost preview, paths painted by dragging
   ====================================================================== */
const build = { on:false, tab:'ride', sel:'carousel', rot:0, del:false, pend:null, delSel:0, dirty:true, hover:-1 };
const bbar = $('#bbar'), bItems = $('#bItems'), bTabs = $('#bTabs'), placeBtn = $('#btnPlace'), bMsg = $('#bMsg');
const ghostMat = new THREE.MeshBasicMaterial({ color:0x5ed6a0, transparent:true, opacity:.5, depthWrite:false });
const ghostPlane = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ color:0x5ed6a0, transparent:true, opacity:.45, depthWrite:false }));
ghostPlane.rotation.x = -Math.PI / 2; ghostPlane.visible = false; ghostPlane.renderOrder = 3; scene.add(ghostPlane);
const ghosts = {}; let ghostNow = null;
function ghostFor(k){
  if(ghosts[k]) return ghosts[k];
  let g;
  if(CAT[k].cat === 'ride'){ const o = RIDE_BUILD[k](); g = o.grp; o.update(0, 0, { phase:'idle', sp:0, e:0 }); }
  else { const M = new TM(); PM.addStatic(M, k, 0, 0, 0, 1); g = new THREE.Mesh(M.geometry(), ghostMat); }
  g.traverse(o => { if(o.isMesh){ o.material = ghostMat; o.castShadow = false; o.receiveShadow = false; o.renderOrder = 4; } });
  g.visible = false; scene.add(g); ghosts[k] = g; return g;
}
function bbarH(){
  const on = build.on && !bbar.hidden, h = on ? bbar.offsetHeight : 0;
  if(on) stage.style.setProperty('--bbh', h + 'px');
  if(on && h) camera.setViewOffset(SW, SH, 0, Math.round(h * .5), SW, SH); else camera.clearViewOffset();
  camera.updateProjectionMatrix();
}
function setBuild(on){
  if(on && visiting && !visiting.help){ say(WHY.nohelp, 2500); return; }
  if(on && P.ride) return;
  build.on = on; build.pend = null; build.delSel = 0; build.del = false; painting = 0; ptrs.clear(); pinch = null;
  bbar.hidden = !on; gridMesh.visible = on; placeBtn.hidden = true; bMsg.hidden = true;
  stage.classList.toggle('building', on);
  $('#btnBuild').classList.toggle('on', on); $('#btnBuild').textContent = on ? '🚶' : '🔨';
  $('#btnZoomIn').hidden = $('#btnZoomOut').hidden = !on;
  joyEl.hidden = on || state !== 'play'; actBtn.hidden = true; actKey = '';
  P.goal = null; P.wait = 0; clearInput();
  if(on){
    bcam.x = clamp(P.x * .6, -10, 10); bcam.z = clamp(P.z * .5, -6, 6); bcam.dist = 33; snapCam = false;
    if(SAVE.tut <= 1 && !visiting){ SAVE.tut = 2; persist(); selectTab('ride'); build.sel = 'carousel'; say(LINES.placeRide, 7000, true); }
    else if(SAVE.tut === 3 && !visiting){ selectTab('path'); say(LINES.makePath, 7000, true); }
  } else {
    hideGhost(); snapCam = true;
    if(SAVE.tut === 4 && !visiting) say(LINES.visitors, 6000);
  }
  renderBuildBar(); bbarH(); requestAnimationFrame(bbarH); hudKey = '';
}
function selectTab(id){ build.tab = id; const t = TABS.find(t => t.id === id); if(!t.items.includes(build.sel)) build.sel = t.items[0]; build.pend = null; build.del = false; build.delSel = 0; build.dirty = true; }
const bestNow = () => visiting ? (visiting.best || visiting.rating) : SAVE.best;
const moneyNow = () => visiting ? visiting.money : SAVE.money;
function renderBuildBar(){
  build.dirty = false;
  bTabs.innerHTML = TABS.map(t => `<button data-t="${t.id}" class="${t.id === build.tab ? 'on' : ''}" aria-label="${t.name}">${t.e}</button>`).join('');
  const tab = TABS.find(t => t.id === build.tab), best = bestNow(), money = moneyNow();
  bItems.innerHTML = tab.items.map(k => { const d = defOf(k), lock = !unlockedK(k, best);
    return `<button class="bit${k === build.sel && !build.del ? ' on' : ''}${lock ? ' lock' : money < d.price ? ' poor' : ''}" data-k="${k}">${lock ? `<span class="lk">⭐${rateTxt(d.need)}</span>` : ''}<i>${d.e}</i><b>${d.name}</b><span class="price">${COIN} ${N(d.price)}</span></button>`; }).join('');
  bTabs.querySelectorAll('[data-t]').forEach(b => b.onclick = () => { SFX.tap(); selectTab(b.dataset.t); renderBuildBar(); updateGhost(); });
  bItems.querySelectorAll('[data-k]').forEach(b => b.onclick = () => {
    const k = b.dataset.k;
    if(!unlockedK(k, bestNow())){ SFX.bonk(); bmsg('🔒 ' + WHY.lock + ' ' + '⭐' + rateTxt(defOf(k).need)); return; }
    SFX.tap(); build.sel = k; build.del = false; build.delSel = 0; build.pend = null; renderBuildBar(); updateGhost();
  });
  $('#bDel').classList.toggle('on', build.del);
}
let bmsgTO = 0;
function bmsg(t){ bMsg.textContent = t; bMsg.hidden = false; clearTimeout(bmsgTO); bmsgTO = setTimeout(() => { bMsg.hidden = true; }, 2200); }
function rotateTool(){ build.rot = (build.rot + 1) % 4; SFX.tap(); if(build.pend){ const f0 = fpOf(build.pend.k, build.pend.o), cc = build.pend.c + (f0.w - 1) / 2, rc = build.pend.r + (f0.d - 1) / 2; build.pend.o = build.rot; const f = fpOf(build.pend.k, build.rot); build.pend.c = Math.round(cc - (f.w - 1) / 2); build.pend.r = Math.round(rc - (f.d - 1) / 2); } updateGhost(); }
$('#bRot').onclick = () => rotateTool();
$('#bDel').onclick = () => { SFX.tap(); build.del = !build.del; build.pend = null; build.delSel = 0; renderBuildBar(); updateGhost(); };
$('#bDone').onclick = () => { SFX.tap(); setBuild(false); };
$('#btnBuild').onclick = () => { if(state !== 'play') return; SFX.tap(); setBuild(!build.on); };
$('#btnZoomIn').onclick = () => { bcam.dist *= .8; SFX.tap(); };
$('#btnZoomOut').onclick = () => { bcam.dist *= 1.25; SFX.tap(); };
placeBtn.onclick = () => {
  SFX.tap();
  if(build.delSel){ doOp({ op:'remove', u:build.delSel }); build.delSel = 0; updateGhost(); return; }
  if(build.pend){ const p = build.pend; doOp({ op:'place', k:p.k, c:p.c, r:p.r, o:p.o }); updateGhost(); }
};
function cellFromScreen(p){ const g = groundAt(p.x, p.y); return g ? cellAtXZ(g.x, g.z) : -1; }
function anchorFor(k, i, o){ const f = fpOf(k, o), c = i % GW, r = (i / GW) | 0; return { c:clamp(c - Math.floor((f.w - 1) / 2), 0, GW - f.w), r:clamp(r - Math.floor((f.d - 1) / 2), 0, GH - f.d) }; }
function buildDown(id, p){
  ptrs.set(id, { x:p.x, y:p.y, sx:p.x, sy:p.y, moved:false });
  if(ptrs.size === 2){ const [a, b] = [...ptrs.values()]; pinch = { d0:Math.hypot(a.x - b.x, a.y - b.y) || 1, dist0:bcam.dist, mx:(a.x + b.x) / 2, my:(a.y + b.y) / 2 }; painting = 0; return; }
  if(ptrs.size > 1) return;
  const i = cellFromScreen(p);
  if(i < 0) return;
  const lay = curLay();
  if(build.del && lay.paths[i] && !GATE_CELLS.includes(i)){ painting = -1; paintCell(i); }
  else if(!build.del && build.sel === 'path'){ painting = 1; paintCell(i); }
}
function paintCell(i){
  if(i < 0) return;
  const lay = curLay();
  if(painting > 0 && !lay.paths[i]){ const why = doOp({ op:'path', i, on:1 }); if(why && why !== 'busy') painting = 0; }
  else if(painting < 0 && lay.paths[i]) doOp({ op:'path', i, on:0 });
}
function buildMove(id, p, e){
  const q = ptrs.get(id);
  if(!q){ if(e.pointerType === 'mouse'){ const i = cellFromScreen(p); if(i !== build.hover){ build.hover = i; if(!build.pend) updateGhost(); } } return; }
  const dx = p.x - q.x, dy = p.y - q.y; q.x = p.x; q.y = p.y;
  if(Math.hypot(p.x - q.sx, p.y - q.sy) > 10) q.moved = true;
  if(pinch && ptrs.size >= 2){
    const [a, b] = [...ptrs.values()], d = Math.hypot(a.x - b.x, a.y - b.y) || 1, mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
    bcam.dist = clamp(pinch.dist0 * pinch.d0 / d, 10, 40);
    const k = bcam.dist / SH * 1.15; bcam.x -= (mx - pinch.mx) * k; bcam.z -= (my - pinch.my) * k / Math.sin(BC_PITCH); pinch.mx = mx; pinch.my = my;
    return;
  }
  if(painting){ paintCell(cellFromScreen(p)); return; }
  if(q.moved){ const k = bcam.dist / SH * 1.15; bcam.x -= dx * k; bcam.z -= dy * k / Math.sin(BC_PITCH); }
}
function buildUp(id, p, isUp){
  const q = ptrs.get(id); ptrs.delete(id);
  if(ptrs.size < 2) pinch = null;
  const wasPaint = painting; if(!ptrs.size) painting = 0;
  if(!q || q.moved || wasPaint || !isUp || ptrs.size) return;
  buildTap(cellFromScreen(p));
}
function buildTap(i){
  if(i < 0) return;
  const lay = curLay();
  if(build.del){
    const u = occAt(lay, i);
    if(u){ if(build.delSel === u){ doOp({ op:'remove', u }); build.delSel = 0; } else { build.delSel = u; SFX.tap(); } updateGhost(); return; }
    build.delSel = 0; updateGhost(); return;
  }
  const k = build.sel; if(k === 'path') return;
  if(!unlockedK(k, bestNow())){ SFX.bonk(); bmsg('🔒 ' + WHY.lock); return; }
  if(CAT[k].cat === 'ride'){
    const pd = build.pend;
    if(pd && pd.k === k && itemCells(pd).includes(i)){ doOp({ op:'place', k, c:pd.c, r:pd.r, o:pd.o }); updateGhost(); return; }
    const a = anchorFor(k, i, build.rot); build.pend = { k, c:a.c, r:a.r, o:build.rot }; SFX.tap();
    const why = placeWhy(lay, k, a.c, a.r, build.rot) || (moneyNow() < CAT[k].price ? 'money' : '');
    if(why) bmsg(WHY[why]); else if(SAVE.tut === 2 && !visiting) bmsg(L('كبوس ✅ لتحطها', 'Press ✅ to place it', 'Koymak için ✅ bas'));
    updateGhost(); return;
  }
  const a = anchorFor(k, i, build.rot);
  build.pend = { k, c:a.c, r:a.r, o:build.rot, flash:1 };
  doOp({ op:'place', k, c:a.c, r:a.r, o:build.rot });
  updateGhost();
}
/* run an operation: yourself, or ask the host when helping a friend build */
function doOp(op){
  if(visiting){
    if(!visiting.help){ bmsg(WHY.nohelp); SFX.bonk(); return 'nohelp'; }
    const k = op.k, d = op.op === 'path' ? PATH_DEF : op.op === 'place' ? CAT[k] : null;
    if(op.op === 'place' && placeWhy(visiting, k, op.c, op.r, op.o)){ const w = placeWhy(visiting, k, op.c, op.r, op.o); bmsg(WHY[w]); SFX.bonk(); return w; }
    if(d && op.on !== 0 && visiting.money < d.price){ bmsg(WHY.money); SFX.bonk(); return 'money'; }
    mpSend('bop', op);
    if(op.op === 'path'){ visiting.paths[op.i] = op.on ? 1 : 0; layVer++; SFX.path(); }
    else if(op.op === 'place'){ SFX.place(); const p = centerOf(k, op.c, op.r, op.o); burst(p.x, 1, p.z, 30, CONFETTI, 5, 1); build.pend = null; }
    else SFX.remove();
    return '';
  }
  let why = '';
  if(op.op === 'place') why = opPlace(op.k, op.c, op.r, op.o);
  else if(op.op === 'path') why = opPath(op.i, !!op.on);
  else if(op.op === 'remove'){ const it = OWN.items.find(x => x.u === op.u); why = opRemove(op.u); if(!why && it){ const p = centerOf(it.k, it.c, it.r, it.o); burst(p.x, .8, p.z, 20, [0xd9b98a, 0xffffff], 3, .9); SFX.remove(); } }
  if(why){ if(why !== 'busy' || op.op !== 'path') { bmsg(WHY[why] || why); SFX.bonk(); } return why; }
  if(op.op === 'place'){
    SFX.place(); const p = centerOf(op.k, op.c, op.r, op.o); burst(p.x, 1.2, p.z, CAT[op.k].cat === 'ride' ? 50 : 18, CONFETTI, 5, 1.1);
    build.pend = null; bumpChip('#hudMoney');
    if(CAT[op.k].cat === 'ride' && SAVE.tut === 2){ SAVE.tut = 3; persist(); selectTab('path'); build.dirty = true; say(LINES.makePath, 8000, true); }
  } else if(op.op === 'path') SFX.path();
  build.dirty = true;
  return '';
}
function hideGhost(){ if(ghostNow){ ghostNow.visible = false; ghostNow = null; } ghostPlane.visible = false; placeBtn.hidden = true; }
function updateGhost(){
  hideGhost();
  if(!build.on) return;
  const lay = curLay();
  if(build.del){
    if(!build.delSel) return;
    const it = lay.items.find(x => x.u === build.delSel); if(!it){ build.delSel = 0; return; }
    const p = centerOf(it.k, it.c, it.r, it.o);
    ghostPlane.material.color.set(0xff6b6b); ghostPlane.scale.set(p.w, p.d, 1); ghostPlane.position.set(p.x, .12, p.z); ghostPlane.visible = true;
    placeBtn.textContent = '🗑️ ' + L('شيلها', 'Remove it', 'Kaldır') + ' · +' + N(refundOf(it.k)) + ' ' + COIN; placeBtn.className = 'big-btn pink place-btn'; placeBtn.hidden = false;
    return;
  }
  let pd = build.pend;
  if(!pd && build.hover >= 0 && build.sel !== 'path'){ const a = anchorFor(build.sel, build.hover, build.rot); pd = { k:build.sel, c:a.c, r:a.r, o:build.rot }; }
  if(!pd || pd.k === 'path') return;
  const p = centerOf(pd.k, pd.c, pd.r, pd.o), ok = !placeWhy(lay, pd.k, pd.c, pd.r, pd.o) && moneyNow() >= CAT[pd.k].price;
  const g = ghostFor(pd.k); g.position.set(p.x, .02, p.z); g.rotation.y = rotY(pd.o); g.visible = true; ghostNow = g;
  ghostMat.color.set(ok ? 0x7dffc0 : 0xff7b7b); ghostPlane.material.color.set(ok ? 0x5ed6a0 : 0xff6b6b);
  ghostPlane.scale.set(p.w, p.d, 1); ghostPlane.position.set(p.x, .12, p.z); ghostPlane.visible = true;
  if(build.pend && CAT[pd.k].cat === 'ride' && ok){ placeBtn.textContent = '✅ ' + L('حطها هون', 'Place it here', 'Buraya koy') + ' · ' + N(CAT[pd.k].price) + ' ' + COIN; placeBtn.className = 'big-btn mint place-btn'; placeBtn.hidden = false; }
}

/* ======================================================================
   Aunt Laila, pop-ups, bubbles over visitors, money tags, HUD, action button
   ====================================================================== */
const guideEl = $('#guide'), guideT = $('#guideT');
let sayTO = 0;
function say(text, ms = 4200, top = false){
  clearTimeout(sayTO); guideT.textContent = text; guideEl.classList.toggle('top', !!top || build.on);
  guideEl.hidden = false; guideEl.style.animation = 'none'; void guideEl.offsetWidth; guideEl.style.animation = '';
  sayTO = setTimeout(() => { guideEl.hidden = true; }, ms);
}
function hush(){ clearTimeout(sayTO); guideEl.hidden = true; }
const popEl = $('#pop');
function pop(text){ popEl.textContent = text; popEl.classList.remove('go'); void popEl.offsetWidth; popEl.classList.add('go'); }
function bumpChip(sel){ const el = $(sel); if(!el) return; el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump'); }
const LINES = {
  hi:       L('أهلا حبيبي! أنا العمة ليلى 👵 هاي أرضك الفاضية — رح نعمل فيها ملاهي! 🎡', "Hello sweetie! I'm Aunt Laila 👵 This empty land is yours — let's build a theme park! 🎡", 'Merhaba tatlım! Ben Leyla Teyze 👵 Bu boş arazi senin — hadi lunapark kuralım! 🎡'),
  build:    L('كبوس على المطرقة 🔨 لتبلّش تبني', 'Tap the hammer 🔨 to start building', 'İnşaya başlamak için çekice 🔨 dokun'),
  placeRide:L('اختار دوّارة الخيول 🎠 وكبوس عالعشب لتحطها', 'Pick the carousel 🎠 and tap the grass to place it', 'Atlıkarıncayı 🎠 seç ve koymak için çimene dokun'),
  makePath: L('هلّق اعمل طريق 🛤️ من الباب 🚪 لعند اللعبة — اسحب إصبعك عالأرض', 'Now make a path 🛤️ from the gate 🚪 to the ride — drag your finger on the ground', 'Şimdi girişten 🚪 oyuncağa bir yol 🛤️ yap — parmağını yerde sürükle'),
  connected:L('برافو! 🎉 الطريق وصل. كبوس ✅ وشوف الزوار جايين 👥', 'Bravo! 🎉 The path is connected. Press ✅ and watch the visitors come 👥', 'Bravo! 🎉 Yol bağlandı. ✅ bas ve ziyaretçilerin gelişini izle 👥'),
  visitors: L('الزوار جايين! 👥 كل تذكرة بتعطيك قروش الملاهي 💰', 'Visitors are coming! 👥 Every ticket gives you park coins 💰', 'Ziyaretçiler geliyor! 👥 Her bilet sana park parası 💰 verir'),
  rideIt:   L('هلّق امشي لعند اللعبة واركبها إنت كمان! 🎠', 'Now walk to the ride and ride it yourself! 🎠', 'Şimdi oyuncağa yürü ve kendin de bin! 🎠'),
  decor:    L('شو حلو! 🤩 حط أكشاك 🍦 وزينة 🌳 وسلّة زبالة 🗑️ لتطلع النجوم ⭐ وتنفتح ألعاب جديدة', 'So fun! 🤩 Add stalls 🍦, decorations 🌳 and a bin 🗑️ to earn stars ⭐ and unlock new rides', 'Çok eğlenceli! 🤩 Yıldız ⭐ kazanmak ve yeni oyuncaklar açmak için büfe 🍦, süs 🌳 ve çöp kutusu 🗑️ koy'),
  litter:   L('في زبالة عالأرض! 🙈 امشي عليها لتلمّها، أو حط سلّة زبالة 🗑️', "There's litter! 🙈 Walk over it to pick it up, or add a bin 🗑️", 'Yerde çöp var! 🙈 Toplamak için üstünden yürü ya da çöp kutusu 🗑️ koy'),
  back:     L('أهلا فيك من جديد بملاهيك! 🎡', 'Welcome back to your park! 🎡', 'Parkına tekrar hoş geldin! 🎡'),
  after:   [L('ووووي! 🤩', 'Wheee! 🤩', 'Yuppii! 🤩'), L('كمان مرة؟ 😄', 'Again? 😄', 'Bir daha? 😄'), L('أحلى لعبة! 🎉', 'Best ride ever! 🎉', 'En güzel oyuncak! 🎉')]
};
/* DOM tags over the 3D world: visitor bubbles, money, "no path" warnings */
const tagsEl = $('#tags');
const mkTag = cls => { const e = document.createElement('div'); e.className = 'vb ' + cls; e.hidden = true; tagsEl.appendChild(e); return e; };
const bubEls = Array.from({ length:14 }, () => mkTag(''));
const monEls = Array.from({ length:10 }, () => ({ el:mkTag('money'), life:0, x:0, y:0, z:0 }));
const warnEls = Array.from({ length:10 }, () => mkTag('warn'));
let monNext = 0;
function moneyTag(x, y, z, amt){ const m = monEls[monNext]; monNext = (monNext + 1) % monEls.length; m.life = 1.3; m.x = x + (Math.random() - .5) * .8; m.y = y; m.z = z; m.el.textContent = '+' + N(amt) + ' ' + COIN; }
function screenOf(x, y, z){ _v.set(x, y, z).project(camera); return { x:(_v.x * .5 + .5) * SW, y:(-_v.y * .5 + .5) * SH, ok:_v.z < 1 && _v.z > -1 }; }
function tagsFrame(dt){
  const show = state === 'play' || state === 'card' || state === 'pause';
  /* bubbles: the closest visitors with something to say */
  const c = [];
  if(show) for(const v of visitors) if(v.bubT > 0 && !v.hide){ const d = (v.x - camera.position.x) ** 2 + (v.z - camera.position.z) ** 2; c.push([d, v]); }
  c.sort((a, b) => a[0] - b[0]);
  for(let k = 0; k < bubEls.length; k++){
    const el = bubEls[k], v = c[k] && c[k][1];
    if(!v){ if(!el.hidden) el.hidden = true; continue; }
    const p = screenOf(v.x, (v.st === 'ride' && v.seat ? _v2.setFromMatrixPosition(v.seat.matrixWorld).y : (v.st === 'sit' ? -.4 : 0)) + 1.55 * v.sc + (v.balloon >= 0 ? .1 : 0), v.z);
    if(!p.ok){ el.hidden = true; continue; }
    if(el.textContent !== v.bub) el.textContent = v.bub;
    el.hidden = false; el.style.transform = `translate(${p.x}px,${p.y}px) translate(-50%,-100%)`; el.style.opacity = Math.min(1, v.bubT * 3);
  }
  for(const m of monEls){
    if(m.life <= 0 || !show){ if(!m.el.hidden) m.el.hidden = true; continue; }
    m.life -= dt; m.y += dt * 1.1;
    const p = screenOf(m.x, m.y, m.z); if(!p.ok){ m.el.hidden = true; continue; }
    m.el.hidden = false; m.el.style.transform = `translate(${p.x}px,${p.y}px) translate(-50%,-100%)`; m.el.style.opacity = Math.min(1, m.life * 2);
  }
  /* rides and stalls that can't be reached yet */
  let w = 0;
  if(show) for(const info of ITM.values()){
    if(w >= warnEls.length) break;
    if(!(info.def.cat === 'ride' || info.def.cat === 'stall') || info.reach) continue;
    const p = screenOf(info.cx, info.def.cat === 'ride' ? 4.4 : 3.4, info.cz); if(!p.ok) continue;
    const el = warnEls[w++]; el.textContent = '🛤️❓'; el.hidden = false; el.style.transform = `translate(${p.x}px,${p.y + Math.sin(T * 4) * 4}px) translate(-50%,-100%)`;
  }
  for(; w < warnEls.length; w++) if(!warnEls[w].hidden) warnEls[w].hidden = true;
}
let ctxNow = null, actKey = '';
function context(){
  if(P.ride || build.on) return null;
  let best = null, bd = 1.6;
  for(const info of ITM.values()){
    if(info.def.cat !== 'ride') continue;
    const dx = Math.max(0, Math.abs(P.x - info.cx) - info.hw), dz = Math.max(0, Math.abs(P.z - info.cz) - info.hd), d = Math.hypot(dx, dz);
    if(d < bd){ bd = d; best = info; }
  }
  return best ? { k:'ride', u:best.it.u, e:best.def.e } : null;
}
function updateActBtn(){
  ctxNow = context();
  const key = ctxNow ? ctxNow.k + ctxNow.u + (P.wait === ctxNow.u ? 'w' : '') : '';
  if(key === actKey) return; actKey = key;
  if(!ctxNow || P.wait === ctxNow.u){ actBtn.hidden = true; return; }
  $('#actI').textContent = ctxNow.e; $('#actB').textContent = L('اركب', 'Ride', 'Bin'); actBtn.style.setProperty('--ac', '#ffc23d');
  actBtn.hidden = false; actBtn.classList.toggle('pulse', SAVE.tut === 5);
}
function doAction(){
  if(state !== 'play' || build.on) return;
  const c = ctxNow || context(); if(!c) return;
  P.goal = null;
  if(c.k === 'ride'){ if(boardPlayer(c.u)) SFX.tap(); else SFX.bonk(); }
  actKey = '';
}
const rideBar = $('#rideBar');
$('#btnCam').onclick = () => { SFX.tap(); rideCam.mode = rideCam.mode === 'seat' ? 'wide' : 'seat'; snapCam = false; };
let rideKey = '';
function rideBarFrame(){
  const rr = P.ride ? RIDES.get(P.ride.u) : P.wait ? RIDES.get(P.wait) : null;
  const key = !rr || state !== 'play' ? '' : (P.ride ? 'r' : 'w') + rr.u + rr.phase + (rr.phase === 'load' ? Math.ceil(rr.t) : '');
  if(key === rideKey) return; rideKey = key;
  rideBar.hidden = !key;
  if(!key) return;
  const d = CAT[rr.k];
  $('#rideT').textContent = P.ride ? d.e + ' ' + d.name + (rr.phase === 'load' ? ' · ' + N(Math.ceil(rr.t)) + '…' : '') : '⏳ ' + L('استنّى دورك', 'Wait for your turn', 'Sıranı bekle') + ' ' + d.e;
  $('#btnCam').hidden = !P.ride;
}
const hudEl = $('#hud');
let hudKey = '';
function hudFrame(){
  const mp = mpActive(), money = moneyNow(), rating = shownRating(), vc = visiting ? visiting.vc : visitors.length;
  const canBuild = !visiting || visiting.help;
  const key = [money, rating, vc, mp ? MP.players.map(p => p.id + p.hero).join(',') : '', MP.code, canBuild, build.on, !!P.ride, MP.isHost, MP.help, SAVE.tut].join('|');
  if(key === hudKey) return; hudKey = key;
  $('#hudMoney').textContent = COIN + ' ' + N(money);
  $('#hudRate').innerHTML = '⭐ ' + rateTxt(rating);
  $('#hudVis').textContent = '👥 ' + N(vc);
  const bb = $('#btnBuild'); bb.hidden = !canBuild || !!P.ride; bb.classList.toggle('pulse', !visiting && (SAVE.tut === 1 && !build.on));
  $('#bDone').classList.toggle('pulse', SAVE.tut === 4 && build.on);
  const hb = $('#btnHelp'); hb.hidden = !(mp && MP.isHost); hb.classList.toggle('on', !!MP.help);
  hb.innerHTML = '🤝<small>' + (MP.help ? L('شغّال', 'On', 'Açık') : L('مطفي', 'Off', 'Kapalı')) + '</small>';
  const bar = $('#mpBar'); bar.hidden = !mp;
  if(mp) bar.innerHTML = `<span class="chip roomchip">🎡 ${[...MP.code].map(N).join('')}</span>` + MP.players.map(p => `<span class="chip ps" style="--c:${MCOL[p.c] || '#fff'}"><img src="${charImg(p.hero)}" alt="">${BoboRT.chipH(p.id)}${p.id === MP.hostId ? '🎡' : ''}</span>`).join('');
  if(build.dirty && build.on) renderBuildBar();
}
$('#hudRate').onclick = () => { if(state !== 'play') return; SFX.tap(); openRating(); };
$('#btnHelp').onclick = () => { if(state !== 'play' || !MP.isHost) return; SFX.tap(); MP.help = !MP.help; MP.parkDirty = true; hudKey = ''; say(MP.help ? L('أصحابك بيقدروا يساعدوك تبني 🤝🔨', 'Your friends can help you build 🤝🔨', 'Arkadaşların inşaya yardım edebilir 🤝🔨') : L('بس إنت بتبني هلّق 🔨', 'Only you can build now 🔨', 'Şimdi sadece sen inşa edebilirsin 🔨'), 3000); };
/* the guide arrow (tutorial) */
function guideTarget(){
  if(state !== 'play' || visiting || P.ride) return null;
  if(SAVE.tut === 3 && build.on) return { x:0, z:cellZ(GH - 1), y:1 };
  if(SAVE.tut === 5 && !build.on){ for(const info of ITM.values()) if(info.def.cat === 'ride' && info.reach){ const b = boardSpot(info); return { x:b.x, z:b.z, y:1.4 }; } }
  return null;
}
function animGuide(){
  const g = guideTarget();
  const show = !!g && (build.on || Math.hypot(g.x - P.x, g.z - P.z) > 1.4);
  guideArrow.visible = guideRing.visible = show;
  if(!show) return;
  guideArrow.position.set(g.x, g.y + .6 + Math.abs(Math.sin(T * 3.5)) * .5, g.z); guideArrow.rotation.y = T * 2; guideArrow.scale.setScalar(build.on ? 1.6 : 1);
  guideRing.position.set(g.x, .14, g.z); const s = 1 + (T * .8 % 1) * .6; guideRing.scale.set(s, s, s); guideRing.material.opacity = .9 * (1 - T * .8 % 1);
}

/* ======================================================================
   Cards: menu, hero picker, pause, rating
   ====================================================================== */
const overlay = $('#overlay'), card = $('#card');
let state = 'menu';
function setPlayUI(on){
  hudEl.hidden = !on; joyEl.hidden = !on || build.on;
  bbar.hidden = !on || !build.on;
  if(!on){ actBtn.hidden = true; actKey = ''; rideBar.hidden = true; rideKey = ''; placeBtn.hidden = true; }
  else if(build.on) updateGhost();
  bbarH(); hudKey = '';
}
function openCard(wide){
  state = 'card'; setPlayUI(false); clearInput(); P.goal = null;
  overlay.hidden = false; overlay.className = 'overlay dim'; card.className = 'card' + (wide ? ' wide' : '');
}
function closeCard(){ overlay.hidden = true; state = 'play'; setPlayUI(true); placeJoyHome(); }
const xBtn = `<button class="x-btn" id="bX" aria-label="${L('سكّر', 'Close', 'Kapat')}">✖</button>`;
function wireX(fn){ const b = $('#bX'); if(b) b.onclick = () => { SFX.tap(); (fn || closeCard)(); }; }
function openRating(){
  openCard(true);
  const r = shownRating(), parts = [
    ['🎠', L('ألعاب مختلفة', 'Different rides', 'Farklı oyuncaklar'), RATE.v / 2], ['🍦', L('أكشاك', 'Stalls', 'Büfeler'), RATE.f], ['🌳', L('زينة', 'Decorations', 'Süsler'), RATE.d],
    ['🧹', L('نضافة', 'Clean', 'Temizlik'), RATE.c / .5], ['😄', L('زوار مبسوطين', 'Happy visitors', 'Mutlu ziyaretçiler'), RATE.h / .5]];
  const next = KINDS.filter(k => CAT[k].need > bestNow()).sort((a, b) => CAT[a].need - CAT[b].need).slice(0, 4);
  card.innerHTML = `${xBtn}<h2>${L('نجوم الملاهي', 'Park stars', 'Park yıldızları')}</h2><div class="stars">${starStr(r)}</div>
    ${visiting ? '' : `<div class="rgrid">${parts.map(([e, n, v]) => `<div class="item"><span class="em">${e}</span><b>${n}</b><div class="rbar"><i style="width:${Math.round(clamp(v, 0, 1) * 100)}%"></i></div></div>`).join('')}</div>`}
    ${next.length ? `<p>🔓 ${L('الجاي:', 'Coming next:', 'Sıradakiler:')} ${next.map(k => CAT[k].e + ' ⭐' + rateTxt(CAT[k].need)).join('  ')}</p>` : `<p>🏆 ${L('كل شي مفتوح!', 'Everything is unlocked!', 'Her şey açık!')}</p>`}
    <p>👥 ${N(SAVE.guests)} · 🎢 ${N(SAVE.rides)} · ${COIN} ${N(SAVE.earned)}</p>`;
  wireX();
}
function showMenu(){
  if(MP.t){ mpLeave(true); }
  if(build.on) setBuild(false);
  state = 'menu'; setPlayUI(false); overlay.hidden = false; overlay.className = 'overlay clear'; card.className = 'card bare'; clearInput(); hush(); setMusic(false);
  if(P.ride){ const rr = RIDES.get(P.ride.u); if(rr) playerOff(rr, true); P.ride = null; }
  const rotHint = ROT && !rawGet('park_rothint');
  const nrides = OWN.items.filter(it => CAT[it.k].cat === 'ride').length;
  card.innerHTML = `<div class="menu">
    ${rotHint ? `<div class="rothint"><i aria-hidden="true">📱</i><span>${L('لفّ الجوال على جنب', 'Turn your phone sideways', 'Telefonu yan çevir')}</span></div>` : ''}
    <div class="logo">🎡</div><h1>${L('ملاهي بوبو', 'Bobo Theme Park', 'Bobo Lunaparkı')}</h1>
    <p class="sub">${L('ابني ملاهيك، استقبل الزوار، واركب كل الألعاب!', 'Build your park, welcome visitors and ride every ride!', 'Parkını kur, ziyaretçileri karşıla ve tüm oyuncaklara bin!')}</p>
    <div class="row"><div class="mine"><span>${COIN} ${N(SAVE.money)}</span><span>⭐ ${rateTxt(SAVE.best)}</span><span>🎢 ${N(nrides)}</span></div>
    <button class="hero-btn" id="bHero" style="--c:${HERO_COLOR[heroId]}"><img src="${charImg(heroId)}" alt=""><span>${HERO_NAME[heroId]} 🔄</span></button></div>
    <div class="row"><button class="big-btn" id="bPlay">▶️ ${L('العب', 'Play', 'Oyna')}</button>
    <button class="big-btn pink" id="bMp">👫 ${L('العب مع أصحابك', 'Play with friends', 'Arkadaşlarla oyna')}</button></div></div>`;
  $('#bPlay').onclick = () => { ac(); SFX.tap(); startPlay(); };
  $('#bMp').onclick = () => { ac(); SFX.tap(); mpMenu(); };
  $('#bHero').onclick = () => { ac(); SFX.tap(); showSelect('menu'); };
}
let selFrom = 'menu', selPick = heroId;
function showSelect(from){
  selFrom = from; state = 'select'; setPlayUI(false); overlay.hidden = false; overlay.className = 'overlay dim'; card.className = 'card wide';
  selPick = heroId;
  card.innerHTML = `<h2>🦸 ${L('اختار شخصيتك', 'Pick your character', 'Karakterini seç')}</h2>
    <div class="heroes">${HERO_IDS.map(id => `<button class="hero${id === selPick ? ' on' : ''}" data-id="${id}" style="--c:${HERO_COLOR[id]}" aria-pressed="${id === selPick}"><img src="${charImg(id)}" alt=""><b>${HERO_NAME[id]}</b></button>`).join('')}</div>
    <button class="big-btn" id="bOkHero">✅ ${L('تمام', 'OK', 'Tamam')}</button>`;
  const btns = [...card.querySelectorAll('.hero')];
  btns.forEach(b => b.onclick = () => { selPick = b.dataset.id; SFX.tap(); btns.forEach(x => { const on = x === b; x.classList.toggle('on', on); x.setAttribute('aria-pressed', on); }); });
  $('#bOkHero').onclick = () => {
    SFX.tap(); SAVE.hero = selPick; persist(); rawSet('worlds_hero', selPick); setHero(selPick);
    if(mpActive()) mpTrack();
    if(selFrom === 'pause'){ resume(); }
    else if(selFrom === 'mp') mpMenu(); else showMenu();
  };
}
function showPause(){
  if(state !== 'play') return;
  state = 'pause'; setPlayUI(false); overlay.hidden = false; overlay.className = 'overlay dim'; card.className = 'card'; clearInput(); hush(); persist(); setMusic(false);
  const mp = mpActive();
  card.innerHTML = `<h2>⏸️ ${L('استراحة', 'Paused', 'Mola')}</h2>
    <button class="big-btn" id="bRes">▶️ ${L('كمّل', 'Continue', 'Devam')}</button>
    <div class="row"><button class="ghost-btn" id="bHeroP">🦸 ${L('غيّر الشخصية', 'Change character', 'Karakteri değiştir')}</button>
    <button class="ghost-btn" id="bSnd">${muted ? '🔇' : '🔊'} ${L('الصوت', 'Sound', 'Ses')}</button>
    ${mp && MP.isHost ? `<button class="ghost-btn" id="bHelpP">${MP.help ? '✅' : '⬜'} 🤝 ${L('ساعدني ابني', 'Help me build', 'İnşaya yardım et')}</button>` : ''}
    ${mp ? `<button class="ghost-btn" id="bLeaveR">🚪 ${L('اطلع من الغرفة', 'Leave the room', 'Odadan çık')}</button>` : ''}</div>
    <button class="exit-btn" id="bExit">🚪 ${L('خروج', 'Exit', 'Çıkış')}</button>`;
  $('#bRes').onclick = () => { SFX.tap(); resume(); };
  $('#bHeroP').onclick = () => { SFX.tap(); showSelect('pause'); };
  $('#bSnd').onclick = () => { muted = !muted; rawSet('adv3d_muted', String(muted)); $('#bSnd').innerHTML = (muted ? '🔇' : '🔊') + ' ' + L('الصوت', 'Sound', 'Ses'); SFX.tap(); };
  const hp = $('#bHelpP'); if(hp) hp.onclick = () => { SFX.tap(); MP.help = !MP.help; MP.parkDirty = true; hp.innerHTML = (MP.help ? '✅' : '⬜') + ' 🤝 ' + L('ساعدني ابني', 'Help me build', 'İnşaya yardım et'); };
  if(mp) $('#bLeaveR').onclick = () => { SFX.tap(); mpLeave(); resume(); };
  $('#bExit').onclick = () => { SFX.tap(); try{ persist(); if(MP.t) mpLeave(true); }catch(e){} setTimeout(() => { location.href = '../'; }, 150); };
}
function resume(){ overlay.hidden = true; state = 'play'; setPlayUI(true); placeJoyHome(); setMusic(true); }
$('#btnPause').onclick = () => { SFX.tap(); showPause(); };
function startPlay(where){
  if(ROT) rawSet('park_rothint', '1');
  overlay.hidden = true;
  const sp = where === 'visit' ? { x:2, z:HALF_Z + 4.5, f:Math.PI } : SPAWN;
  P.x = sp.x; P.z = sp.z; P.face = sp.f; P.vx = P.vz = 0; P.goal = null; P.ride = null; P.wait = 0;
  cam.yaw = 0; cam.pAdj = 0; snapCam = true; closeup = null;
  state = 'play'; setPlayUI(true); clearInput(); placeJoyHome(); hudKey = ''; setMusic(true);
  if(where === 'visit') return;
  if(SAVE.tut === 0){ SAVE.tut = 1; persist(); say(LINES.hi, 4200); setTimeout(() => { if(state === 'play' && SAVE.tut === 1 && !build.on) say(LINES.build, 8000); }, 4400); }
  else if(SAVE.tut === 1) say(LINES.build, 6000);
  else if(SAVE.tut === 5) say(LINES.rideIt, 6000);
  else say(LINES.back, 2500);
}

/* ======================================================================
   Main loop
   ====================================================================== */
let last = performance.now(), fpsN = 0, fpsT = 0, fps = 60, slowT = 0, menuT = 0, rateT = 0;
function simStep(dt){
  if(sceneVer !== layVer){ syncScene(); calcBeauty(); }
  for(const rr of RIDES.values()){ rideTick(rr, dt); rr.obj.grp.updateMatrixWorld(true); }
  simVisitors(dt);
  rateT -= dt; if(rateT <= 0){ rateT = 1; computeRating(); }
  if(SAVE.tut === 3 && !visiting && openRides() > 0){ SAVE.tut = 4; persist(); say(LINES.connected, 7000, true); hudKey = ''; }
}
function frame(now){
  requestAnimationFrame(frame);
  let dt = (now - last) / 1000; last = now; if(dt > .05) dt = .05; if(dt <= 0) dt = .001;
  T += dt; fpsN++; fpsT += dt;
  if(fpsT >= 1){
    fps = fpsN / fpsT; fpsN = 0; fpsT = 0;
    if(state === 'play' && fps < 42 && !hiQ){ slowT++; if(slowT >= 2){ slowT = 0; if(dpr > 1){ dpr = Math.max(1, dpr - .25); renderer.setPixelRatio(dpr); renderer.setSize(SW, SH, false); } else if(renderer.shadowMap.enabled && fps < 30){ renderer.shadowMap.enabled = false; sun.castShadow = false; scene.traverse(o => { if(o.material) o.material.needsUpdate = true; }); } } } else slowT = 0;
  }
  simStep(dt);
  if(state === 'play' && !build.on && !P.ride){ readInput(dt); stepPlayer(dt); }
  else { P.vx = P.vz = 0; P.move = lerp(P.move, 0, Math.min(1, dt * 10)); }
  if(heroM){
    const rr = P.ride && RIDES.get(P.ride.u);
    if(rr) poseOnSeat(heroM, rr, P.ride.s, T, dt);
    else { heroM.grp.position.set(P.x, 0, P.z); heroM.grp.quaternion.setFromEuler(_e.set(0, P.face, 0)); poseHero(heroM, { t:T, dt, run:P.move, grounded:true, vy:0, sq:0, flip:0 }); }
  }
  if(state === 'play'){ updateActBtn(); hudFrame(); rideBarFrame(); saveT += dt; if(saveT > 8 && !visiting) persist(); if(build.dirty && build.on) renderBuildBar(); }
  if(state === 'menu' || state === 'select' || (state === 'mp' && !mpActive())){
    menuT += dt; const a = menuT * .05 + .4;
    camera.position.set(Math.sin(a) * 30, 17, Math.cos(a) * 30 + 2); camera.lookAt(0, 0, 1); camLook.set(0, 0, 1); aimSun(0, 1);
    if(camera.fov !== 50){ camera.fov = 50; camera.updateProjectionMatrix(); }
  } else { updateCamera(dt); aimSun(clamp(camLook.x, -10, 10), clamp(camLook.z, -8, 10)); }
  /* fountains, gate lights */
  if(gateObj) gateObj.update(T);
  for(const f of fountains) if(Math.random() < .7){ spray(f.x, 1.75, f.z, 0, 0, 1, 3.2, .7); if(Math.random() < .5) spray(f.x + (Math.random() - .5) * .4, 1.4, f.z + (Math.random() - .5) * .4, (Math.random() - .5) * 1.4, (Math.random() - .5) * 1.4, 1, 1.4, .5); }
  litterFrame(); drawVisitors(); tagsFrame(dt);
  animGuide();
  mpFrame(dt);
  updateParts(dt); updateFloaters(dt);
  sky.position.copy(camera.position);
  renderer.render(scene, camera);
}
document.addEventListener('visibilitychange', () => { if(document.hidden){ if(!visiting) persist(); setMusic(false); if(state === 'play' && !mpActive()) showPause(); } });
addEventListener('pagehide', () => { if(!visiting) persist(); });

/* ======================================================================
   Online («👫 العب مع أصحابك»): a room of up to 4. Nothing is stored on a server.
   The room owner's park is the park everyone sees. Events: pos, park, preq, st, bop, bres, board, fx.
   No names, no chat: a player is a character + a colour badge.
   ====================================================================== */
const MP_URL = 'https://vgpwtrzplggvlsuvqsas.supabase.co', MP_KEY = 'sb_publishable_D9thEhZlZnfn0t06j8h1Rw_H-LVF786';
const MP_EVENTS = ['pos', 'park', 'preq', 'st', 'bop', 'bres', 'board', 'fx'];
const MP_MAX = 4, MCOL = ['#ff8fb1', '#6cc4ff', '#5ed6a0', '#ffc23d'];
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
/* the room connection itself (re-join after a drop, no HTTP fallback, watchdog) lives in the shared ../rt.js */
class SupabaseTransport{
  async open(code, id, h){
    if(navigator.onLine === false) throw new Error('offline');
    await loadSupabase();
    if(this.closed) throw new Error('cancelled');
    this.rt = window.BoboRT.open({ url:MP_URL, key:MP_KEY, topic:'bobo-park-' + code, id, events:MP_EVENTS, eps:30, h });
    await this.rt.ready;
  }
  track(meta){ if(this.rt) this.rt.track(meta); }
  send(ev, payload){ if(this.rt) this.rt.send(ev, payload); }
  close(){ this.closed = true; if(this.rt){ this.rt.close(); this.rt = null; } }
}
class LocalTransport{
  open(code, id, h){
    this.id = id; this.h = h; this.meta = null; this.peers = new Map(); this.ready = false;
    const bc = this.bc = new BroadcastChannel('bobo-park-' + code);
    bc.onmessage = e => {
      const m = e.data || {};
      if(m.k === 'hb'){ const old = this.peers.get(m.from), js = JSON.stringify(m.meta); this.peers.set(m.from, { meta:m.meta, js, last:Date.now() }); if(!old || old.js !== js) this.sync(); }
      else if(m.k === 'hello'){ if(this.meta) this.beat(); }
      else if(m.k === 'bye'){ if(this.peers.delete(m.from)) this.sync(); }
      else if(m.k === 'b') h.msg(m.ev, m.p);
    };
    this.iv = setInterval(() => {
      if(this.meta) this.beat();
      const now = Date.now(); let ch = false;
      for(const [k, p] of this.peers) if(now - p.last > 8000){ this.peers.delete(k); ch = true; }
      if(ch) this.sync();
    }, 1000);
    bc.postMessage({ k:'hello', from:id });
    return new Promise(res => setTimeout(() => { this.ready = true; res(); this.sync(); }, 400));
  }
  sync(){
    if(!this.ready || !this.bc) return;
    const list = [...this.peers].map(([k, p]) => Object.assign({}, p.meta, { id:k }));
    if(this.meta) list.push(Object.assign({}, this.meta, { id:this.id }));
    this.h.presence(list);
  }
  beat(){ if(this.bc) this.bc.postMessage({ k:'hb', from:this.id, meta:this.meta }); }
  track(meta){ this.meta = Object.assign({}, meta); this.beat(); setTimeout(() => this.sync(), 0); }
  send(ev, p){ if(this.bc) this.bc.postMessage({ k:'b', ev, p }); }
  close(){ clearInterval(this.iv); if(this.bc){ if(this.meta) this.bc.postMessage({ k:'bye', from:this.id }); this.bc.close(); this.bc = null; } }
}
const MP = { t:null, id:null, code:null, list:[], players:[], meta:null, isHost:false, hostId:null, synced:false, screen:'off', tok:0, sendT:0, parkT:0, stT:0, parkDirty:false, inviteFor:null, typed:'', help:false, parkKey:'' };
window.__boboRoom = () => (MP.t && MP.meta && MP.code) ? MP.code : null;
const mpActive = () => !!(MP.t && MP.meta);
const mpNewId = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
const mpSort = (a, b) => ((a.o || 0) - (b.o || 0)) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
const okHero = id => HEROES[id] ? id : 'sara';
/* «أصحابي»: tell friends which room I'm in. The server may not know the game id yet, so every call is guarded. */
const FR_GAME = 'park';
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
addEventListener('pagehide', () => { try{ if(frRoomCode && window.Friends){ clearInterval(frRoomIv); frRoomIv = 0; frRoomCode = null; Friends.setRoom(null, null, true); } }catch(e){} });
/* friends in the room: their character, walking or sitting on a ride */
const RM = new Map();
function remoteSync(){
  const here = new Set();
  for(const p of MP.players){
    if(p.id === MP.id) continue; here.add(p.id);
    let a = RM.get(p.id);
    if(!a){ a = { id:p.id, hero:null, h:null, x:SPAWN.x + 2, z:SPAWN.z, f:Math.PI, m:0, tx:SPAWN.x + 2, tz:SPAWN.z, tf:Math.PI, tm:0, c:p.c, t:Math.random() * 5, seen:false, rr:0 }; RM.set(p.id, a); }
    a.c = p.c;
    const hero = okHero(p.hero);
    if(a.hero !== hero){ if(a.h) scene.remove(a.h.grp); a.hero = hero; a.h = HEROES[hero](); shadowAll(a.h.grp); scene.add(a.h.grp); }
  }
  for(const [id, a] of RM) if(!here.has(id)){ if(a.h) scene.remove(a.h.grp); remoteOff(id); RM.delete(id); }
  hudKey = '';
}
function mpClose(){
  frRoom(null);
  if(MP.t){ try{ MP.t.close(); }catch(e){} }
  MP.t = null; MP.meta = null; MP.list = []; MP.players = []; MP.isHost = false; MP.hostId = null; MP.synced = false; MP.help = false; MP.parkKey = '';
  remoteSync();
  $('#mpBar').hidden = true; hudKey = '';
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
  // the server only sends the room's member list after we track something: send a short 'probe' first, then wait for the list
  t.track({ ph:'probe' });
  await new Promise(res => { const chk = () => (MP.synced || performance.now() - t0 > 6000 || !live()) ? res() : setTimeout(chk, 40); chk(); });
  if(MP.synced) await new Promise(r => setTimeout(r, 300));
  if(!live()) throw new Error('cancelled');
  const others = MP.list.filter(p => p.id !== MP.id);
  if(how === 'create' && others.length){ mpClose(); return 'busy'; }
  if(how === 'join' && !others.length){ mpClose(); return 'nobody'; }
  if(others.length >= MP_MAX){ mpClose(); return 'full'; }
  const used = new Set(others.map(p => p.c)); let c = 0; while(used.has(c)) c++;
  MP.meta = { fc:BoboRT.fc(), hero:heroId, c, o:others.reduce((m, p) => Math.max(m, p.o || 0), 0) + 1, ph:'play' };
  t.track(MP.meta);
  MP.hostId = how === 'create' ? MP.id : others.slice().sort(mpSort)[0].id;
  mpPresence(MP.list);
  frRoom(code);
  return 'ok';
}
function mpTrack(){ if(MP.t && MP.meta){ MP.meta.hero = heroId; MP.t.track(MP.meta); hudKey = ''; } }
function mpSend(ev, p){ if(MP.t) MP.t.send(ev, Object.assign({ id:MP.id }, p)); }
/* saved names: each player's friend code is in the presence meta, the name behind it comes from the server (../rt.js) */
function mpNamesIn(){ hudKey = ''; }
function mpPresence(list){
  list = (list || []).filter(p => p.ph !== 'probe');
  BoboRT.see(list, mpNamesIn);
  MP.list = list; MP.synced = true;
  if(!MP.meta) return;
  const all = list.filter(p => p.id !== MP.id).concat([Object.assign({}, MP.meta, { id:MP.id })]).sort(mpSort);
  const me = all.findIndex(p => p.id === MP.id);
  if(me >= MP_MAX){ mpLeave(); say(L('الغرفة مليانة 🙈', 'The room is full 🙈', 'Oda dolu 🙈')); return; }
  const before = MP.players.map(p => p.id);
  MP.players = all.slice(0, MP_MAX);
  MP.isHost = MP.hostId === MP.id;
  if(!MP.isHost && MP.hostId && !MP.players.some(p => p.id === MP.hostId)){ mpLeave(); say(L('صاحب الملاهي طلع 🚪 رجعنا عملاهيك', 'The park owner left 🚪 back to your park', 'Park sahibi çıktı 🚪 parkına döndün'), 4000); return; }
  const joined = MP.players.filter(p => p.id !== MP.id && !before.includes(p.id));
  if(joined.length && before.length){ SFX.flag(); if(MP.isHost){ MP.parkDirty = true; say(L('صاحبك إجا يزور ملاهيك! 🎡', 'A friend came to visit your park! 🎡', 'Bir arkadaşın parkını ziyarete geldi! 🎡'), 3500); } }
  remoteSync(); hudKey = '';
}
/* the host sends its park: paths as 0/1, things as [kind index, col, row, rotation, uid] */
function mpPark(){
  if(!mpActive() || !MP.isHost) return;
  MP.parkDirty = false; MP.parkT = 5; MP.stT = 1.5;
  mpSend('park', { p:pathsToStr(OWN.paths), it:OWN.items.map(it => [KINDS.indexOf(it.k), it.c, it.r, it.o, it.u]), hb:MP.help ? 1 : 0, m:SAVE.money, rt:shownRating(), best:SAVE.best, vc:visitors.length });
}
function parkIn(p){
  if(typeof p.p !== 'string' || p.p.length !== NC || !/^[01]+$/.test(p.p) || !Array.isArray(p.it) || p.it.length > 120) return null;
  const items = [], used = new Set();
  for(const r of p.it){
    if(!Array.isArray(r)) continue; const k = KINDS[r[0] | 0]; if(!k) continue;
    const it = { k, c:clamp(r[1] | 0, 0, GW - 1), r:clamp(r[2] | 0, 0, GH - 1), o:clamp(r[3] | 0, 0, 3), u:clamp(r[4] | 0, 1, 1e9) };
    const f = fpOf(k, it.o); if(it.c + f.w > GW || it.r + f.d > GH || used.has(it.u)) continue;
    used.add(it.u); items.push(it);
  }
  return { paths:pathsFromStr(p.p), items, key:p.p + JSON.stringify(p.it) };
}
function stIn(p){ if(!visiting) return; visiting.help = !!p.hb; visiting.money = clamp(+p.m || 0, 0, 1e9); visiting.rating = clamp(+p.rt || 0, 0, 5); visiting.best = clamp(+p.best || 0, 0, 5); visiting.vc = clamp(p.vc | 0, 0, 999); hudKey = ''; build.dirty = true; if(build.on && !visiting.help){ setBuild(false); say(WHY.nohelp, 3000); } }
function mpMsg(ev, p){
  const a = RM.get(p.id);
  if(ev === 'pos'){ if(!a) return; a.tx = clamp(+p.x || 0, -30, 40); a.tz = clamp(+p.z || 0, -30, 40); a.tf = +p.f || 0; a.tm = clamp(+p.m || 0, 0, 1); if(!a.seen){ a.seen = true; a.x = a.tx; a.z = a.tz; } if(!(p.rr | 0) && a.rr) remoteOff(p.id); }
  else if(ev === 'preq'){ if(MP.isHost) mpPark(); }
  else if(ev === 'park'){
    if(MP.isHost || p.id !== MP.hostId) return;
    if(MP.parkKey !== p.p + JSON.stringify(p.it)){
      const g = parkIn(p); if(!g) return;
      MP.parkKey = g.key;
      if(!visiting) visiting = { help:false, money:0, rating:0, best:0, vc:0 };
      visiting.paths = g.paths; visiting.items = g.items; layVer++;
      if(build.on) updateGhost();
    }
    stIn(p);
  }
  else if(ev === 'st'){ if(!MP.isHost && p.id === MP.hostId) stIn(p); }
  else if(ev === 'bop'){ if(MP.isHost) onBop(p); }
  else if(ev === 'bres'){ if(p.to === MP.id && p.why){ bmsg(WHY[p.why] || ''); SFX.bonk(); } }
  else if(ev === 'board'){ if(a) remoteBoard(a, p.r | 0); }
  else if(ev === 'fx'){ if(a && p.k === 'build'){ const x = clamp(+p.x || 0, -20, 20), z = clamp(+p.z || 0, -20, 20); burst(x, 1, z, 24, CONFETTI, 4, 1); } }
}
/* a friend asks to build (only when «ساعدني ابني» is on); it is paid from the host's coins */
function onBop(p){
  let why = '';
  if(!MP.help) why = 'nohelp';
  else if(p.op === 'place' && CAT[p.k]){ why = opPlace(p.k, p.c | 0, p.r | 0, p.o | 0); if(!why){ const q = centerOf(p.k, p.c | 0, p.r | 0, p.o | 0); burst(q.x, 1.2, q.z, 30, CONFETTI, 5, 1); SFX.place(); mpSend('fx', { k:'build', x:q.x, z:q.z }); if(state === 'play') pop('🤝 ' + CAT[p.k].e); } }
  else if(p.op === 'path') why = opPath(p.i | 0, !!p.on);
  else if(p.op === 'remove') why = opRemove(p.u | 0);
  else why = 'out';
  if(why === 'busy' && p.op === 'path') why = '';
  mpSend('bres', { to:p.id, why });
  if(why) MP.parkDirty = true;
  mpPark();
}
/* riding together: a friend who gets on a ride takes a seat on my copy of it too */
function remoteBoard(a, u){
  remoteOff(a.id);
  a.rr = u; if(!u) return;
  const rr = RIDES.get(u); if(!rr) return;
  if(rr.phase === 'run') return;
  const s = freeSeat(rr); if(s < 0) return;
  rr.riders[s] = { kind:'r', id:a.id }; rr.remotes.add(a.id); a.seat = s;
  if(rr.phase === 'idle') startLoad(rr, true); else rr.t = Math.max(rr.t, 1.6);
  if(P.ride && P.ride.u === u) SFX.flag();
}
function remoteOff(id){
  const a = RM.get(id); if(!a || !a.rr) return;
  const rr = RIDES.get(a.rr);
  if(rr && rr.phase !== 'run'){ rr.riders = rr.riders.map(x => x && x.kind === 'r' && x.id === id ? null : x); rr.remotes.delete(id); }
  a.rr = 0;
}
function mpFrame(dt){
  if(!mpActive()) return;
  MP.sendT -= dt;
  if(MP.sendT <= 0 && state !== 'menu' && state !== 'select'){ MP.sendT = .12; mpSend('pos', { x:Math.round(P.x * 100) / 100, z:Math.round(P.z * 100) / 100, f:Math.round(P.face * 100) / 100, m:Math.round(P.move * 100) / 100, rr:P.ride ? P.ride.u : 0 }); }
  if(MP.isHost){ MP.parkT -= dt; MP.stT -= dt; if(MP.parkDirty || MP.parkT <= 0) mpPark(); else if(MP.stT <= 0){ MP.stT = 1.5; mpSend('st', { m:SAVE.money, rt:shownRating(), best:SAVE.best, vc:visitors.length, hb:MP.help ? 1 : 0 }); } }
  for(const a of RM.values()){
    const k = 1 - Math.exp(-10 * dt);
    a.x = lerp(a.x, a.tx, k); a.z = lerp(a.z, a.tz, k); a.f += angDiff(a.tf, a.f) * k; a.m = lerp(a.m, a.tm, k); a.t += dt;
    if(!a.h) continue;
    const rr = a.rr ? RIDES.get(a.rr) : null, x = rr && rr.riders[a.seat];
    if(x && x.kind === 'r' && x.id === a.id) poseOnSeat(a.h, rr, a.seat, a.t, dt);
    else { a.h.grp.position.set(a.x, 0, a.z); a.h.grp.quaternion.setFromEuler(_e.set(0, a.f, 0)); poseHero(a.h, { t:a.t, dt, run:a.m, grounded:true, vy:0, sq:0, flip:0 }); }
  }
}
function leaveVisit(){ if(visiting){ visiting = null; layVer++; clearVisitors(); if(build.on) setBuild(false); } }
function mpLeave(silent){
  MP.tok++; mpClose(); MP.screen = 'off';
  if(P.ride){ const rr = RIDES.get(P.ride.u); if(rr) playerOff(rr, true); P.ride = null; }
  leaveVisit();
  if(!silent) hudKey = '';
}
function mpCard(wide){ if(build.on) setBuild(false); state = 'mp'; setPlayUI(false); overlay.hidden = false; overlay.className = 'overlay dim'; card.className = 'card' + (wide ? ' wide' : ''); setMusic(false); }
function mpMenu(){
  MP.tok++; mpClose(); MP.screen = 'menu'; mpCard(false);
  leaveVisit();
  card.innerHTML = `<h2>👫 ${L('العب مع أصحابك', 'Play with friends', 'Arkadaşlarla oyna')}</h2>
    <p>🎡 ${L('أصحابك بيزوروا ملاهيك، بتركبوا الألعاب سوا، وبيساعدوك تبني', 'Friends visit your park, you ride together, and they can help you build', 'Arkadaşların parkını ziyaret eder, birlikte binersiniz ve inşaya yardım ederler')}</p>
    <button class="hero-btn" id="bMyHero" style="--c:${HERO_COLOR[heroId]}"><img src="${charImg(heroId)}" alt=""><span>${HERO_NAME[heroId]} 🔄</span></button>
    <div class="row"><button class="big-btn" id="bCreate">🏡 ${L('اعمل غرفة', 'Create room', 'Oda kur')}</button>
    <button class="big-btn mint" id="bJoin">🔢 ${L('فوت على غرفة', 'Join room', 'Odaya katıl')}</button></div>
    <div class="row"><button class="ghost-btn" id="bBack">↩️ ${L('رجوع', 'Back', 'Geri')}</button></div>`;
  $('#bMyHero').onclick = () => { SFX.tap(); showSelect('mp'); };
  $('#bCreate').onclick = () => { SFX.tap(); mpCreate(); };
  $('#bJoin').onclick = () => { SFX.tap(); mpKeypad(''); };
  $('#bBack').onclick = () => { SFX.tap(); showMenu(); };
}
function mpConnecting(){
  MP.screen = 'connecting'; mpCard(false);
  card.innerHTML = `<div class="bigstar"><span class="spin">⏳</span></div><h2>${L('عم نتصل…', 'Connecting…', 'Bağlanıyor…')}</h2>
    <button class="ghost-btn" id="bCancel">↩️ ${L('رجوع', 'Back', 'Geri')}</button>`;
  $('#bCancel').onclick = () => { SFX.tap(); mpMenu(); };
}
function mpError(retry){
  MP.screen = 'error'; mpCard(false);
  card.innerHTML = `<div class="bigstar">📡</div><h2>${L('ما في إنترنت؟ جرّب كمان مرة', 'No internet? Try again', 'İnternet yok mu? Tekrar dene')}</h2>
    <div class="row"><button class="big-btn" id="bRetry">🔄 ${L('جرّب كمان مرة', 'Try again', 'Tekrar dene')}</button><button class="ghost-btn" id="bBack">↩️ ${L('رجوع', 'Back', 'Geri')}</button></div>`;
  $('#bRetry').onclick = () => { SFX.tap(); retry(); };
  $('#bBack').onclick = () => { SFX.tap(); mpMenu(); };
}
function mpEnter(){
  MP.screen = 'in';
  if(!MP.isHost){ visiting = { paths:pathsFromStr(pathStr0()), items:[], help:false, money:0, rating:0, best:0, vc:0 }; layVer++; clearVisitors(); }
  startPlay(MP.isHost ? 'own' : 'visit');
  if(MP.isHost){ MP.parkDirty = true; say(L('رقم غرفتك ', 'Your room number is ', 'Oda numaran ') + [...MP.code].map(N).join('') + L(' — قولو لأصحابك 👫', ' — tell your friends 👫', ' — arkadaşlarına söyle 👫'), 6000); }
  else { mpSend('preq', {}); say(L('أهلا! هاي ملاهي صاحبك 🎡 اركبوا الألعاب سوا!', "Welcome! This is your friend's park 🎡 ride together!", 'Hoş geldin! Burası arkadaşının parkı 🎡 birlikte binin!'), 5000); }
}
async function mpCreate(want){
  mpConnecting();
  try{
    for(let i = 0; i < 4; i++){
      const code = i === 0 && /^\d{4}$/.test(want || '') ? String(want) : String(1000 + Math.floor(Math.random() * 9000));
      const r = await mpOpen(code, 'create');
      if(r === 'ok'){ mpEnter(); mpSendInvite(); return; }
    }
    throw new Error('busy');
  }catch(e){ if(MP.screen === 'connecting' && String(e && e.message) !== 'cancelled') mpError(() => mpCreate(want)); }
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
    if(r === 'ok') mpEnter();
    else if(r === 'full') mpKeypad(L('الغرفة مليانة', 'The room is full', 'Oda dolu') + ' 🙈');
    else mpKeypad(L('ما لقينا هالغرفة، تأكّد من الرقم', "We couldn't find that room — check the number", 'Bu oda bulunamadı, numarayı kontrol et'));
  }catch(e){ if(MP.screen === 'connecting' && String(e && e.message) !== 'cancelled') mpError(() => mpJoin(code)); }
}
/* «تعا العب» from the friends page: ?host=1&invite=<friendCode>. The server may not accept 'park' yet: guarded. */
function mpSendInvite(){
  const who = MP.inviteFor; if(!who || !MP.code || !window.Friends) return;
  MP.inviteFor = null;
  try{
    Friends.invite(who, MP.code, FR_GAME).then(r => {
      if(r && r.status === 'sent') say(L('✉️ بعتنا دعوة لصاحبك! استنّاه يفوت', '✉️ Invite sent! Wait for your friend to join', '✉️ Davet gönderildi! Arkadaşının gelmesini bekle'));
      else say(L('ما قدرنا نبعت الدعوة 🙈 قلّو رقم الغرفة', "Couldn't send the invite 🙈 tell them the room number", 'Davet gönderilemedi 🙈 oda numarasını söyle'));
    }, () => say(L('ما قدرنا نبعت الدعوة 🙈 قلّو رقم الغرفة', "Couldn't send the invite 🙈 tell them the room number", 'Davet gönderilemedi 🙈 oda numarasını söyle')));
  }catch(e){}
}
function mpKeypad(msg){
  MP.screen = 'keypad'; MP.typed = ''; mpCard(true);
  const keys9 = [1, 2, 3, 4, 5, 6, 7, 8, 9].map(d => `<button data-k="${d}">${N(d)}</button>`).join('');
  card.innerHTML = `<h2>🔢 ${L('اكتب رقم الغرفة', 'Type the room number', 'Oda numarasını yaz')}</h2>
    <div class="mp-cols"><div class="mp-col"><div class="mp-code" id="kpCode"></div><p class="mp-msg" id="kpMsg">${msg || ''}</p>
      <button class="ghost-btn" id="bBack">↩️ ${L('رجوع', 'Back', 'Geri')}</button></div>
    <div class="keypad" id="keypad">${keys9}<button data-k="del" aria-label="${L('امسح', 'Delete', 'Sil')}">⌫</button><button data-k="0">${N(0)}</button><button class="ok" data-k="ok" aria-label="${L('تمام', 'OK', 'Tamam')}">✅</button></div></div>`;
  card.querySelectorAll('#keypad button').forEach(b => b.onclick = () => mpKey(b.dataset.k));
  $('#bBack').onclick = () => { SFX.tap(); mpMenu(); };
  mpKeyDraw();
}
function mpKeyDraw(){ const el = $('#kpCode'); if(!el) return; el.innerHTML = [0, 1, 2, 3].map(i => `<b class="${i === MP.typed.length ? 'cur' : ''}">${MP.typed[i] != null ? N(MP.typed[i]) : ''}</b>`).join(''); }
function mpKey(k){
  if(MP.screen !== 'keypad') return;
  if(k === 'del'){ MP.typed = MP.typed.slice(0, -1); SFX.tap(); }
  else if(k === 'ok'){ if(MP.typed.length === 4) mpJoin(MP.typed); else SFX.bonk(); return; }
  else if(/^\d$/.test(k) && MP.typed.length < 4){ MP.typed += k; SFX.tap(); }
  const m = $('#kpMsg'); if(m) m.textContent = '';
  mpKeyDraw();
  if(MP.typed.length === 4){ const code = MP.typed; setTimeout(() => { if(MP.screen === 'keypad' && MP.typed === code) mpJoin(code); }, 300); }
}
addEventListener('keydown', e => {
  if(state !== 'mp' || MP.screen !== 'keypad') return;
  if(/^\d$/.test(e.key)) mpKey(e.key); else if(e.key === 'Backspace') mpKey('del'); else if(e.key === 'Enter') mpKey('ok');
});

/* ---------- test hook ---------- */
const findAt = (c, r) => { const i = r * GW + c; return occAt(curLay(), i); };
window.__park = {
  get state(){ return state; }, get mpScreen(){ return MP.screen; }, menu:() => showMenu(), play:where => startPlay(where),
  save:() => JSON.parse(JSON.stringify(SAVE)), saveNow:() => persist(), get money(){ return SAVE.money; }, addMoney(n){ SAVE.money += n; hudKey = ''; build.dirty = true; persist(); },
  get best(){ return SAVE.best; }, get rating(){ return Object.assign({ shown:shownRating() }, RATE); }, get tut(){ return SAVE.tut; }, setBest(n){ SAVE.best = n; build.dirty = true; hudKey = ''; persist(); }, setTut(n){ SAVE.tut = n; persist(); hudKey = ''; },
  P, tp(x, z, f){ P.x = x; P.z = z; if(f != null) P.face = f; P.goal = null; snapCam = true; },
  GW, GH, cell:(c, r) => ({ x:cellX(c), z:cellZ(r) }), CAT, KINDS,
  build(on){ setBuild(on); }, get building(){ return build.on; }, tab(id){ selectTab(id); renderBuildBar(); }, sel(k){ build.sel = k; build.del = false; build.pend = null; renderBuildBar(); updateGhost(); },
  rotate:() => rotateTool(), get rot(){ return build.rot; }, delTool(on){ build.del = !!on; build.delSel = 0; renderBuildBar(); updateGhost(); },
  tapCell:(c, r) => buildTap(r * GW + c), get pend(){ return build.pend && Object.assign({}, build.pend); }, get delSel(){ return build.delSel; }, placeBtn:() => placeBtn.hidden ? false : (placeBtn.click(), true),
  place:(k, c, r, o = 0) => doOp({ op:'place', k, c, r, o }), path:(c, r, on = 1) => doOp({ op:'path', i:r * GW + c, on }),
  pathLine(c0, r0, c1, r1){ let n = 0; const dc = Math.sign(c1 - c0), dr = Math.sign(r1 - r0); let c = c0, r = r0; for(;;){ if(!doOp({ op:'path', i:r * GW + c, on:1 })) n++; if(c === c1 && r === r1) break; if(c !== c1) c += dc; else r += dr; } return n; },
  remove(c, r){ const u = findAt(c, r); return u ? doOp({ op:'remove', u }) : 'none'; }, at:(c, r) => findAt(c, r),
  items:() => curLay().items.map(it => Object.assign({}, it, { cells:itemCells(it), reach:!!(ITM.get(it.u) || {}).reach })), paths:() => pathsToStr(curLay().paths),
  sync(){ if(sceneVer !== layVer){ syncScene(); calcBeauty(); } },
  tick(sec){ let s = sec; while(s > 0){ const d = Math.min(.1, s); T += d; simStep(d); s -= d; } },
  get visitors(){ return visitors.map(v => ({ id:v.id, st:v.st, x:v.x, z:v.z, money:v.money, happy:v.happy, tgt:v.tgt, why:v.why, ride:v.ride, bub:v.bub, balloon:v.balloon })); },
  spawn:n => { for(let i = 0; i < (n || 1); i++) spawnVisitor(); },
  rides:() => [...RIDES.values()].map(rr => ({ u:rr.u, k:rr.k, phase:rr.phase, riders:rr.riders.map(x => x ? x.kind + (x.id || '') : null), queue:rr.queue.length, sp:rr.sp, e:rr.e, dur:rr.dur, cx:rr.cx, cz:rr.cz })),
  board:u => boardPlayer(u), get riding(){ return P.ride ? Object.assign({}, P.ride) : null; }, get waiting(){ return P.wait; }, camMode(m){ rideCam.mode = m; },
  get litter(){ return litter.map(l => ({ x:l.x, z:l.z })); }, dropLitterAt(x, z){ litter.push({ x, z, r:0, c:0xffffff }); litterDirty = true; },
  openRating:() => openRating(), pause:() => showPause(), resume:() => resume(),
  get mp(){ return { code:MP.code, active:mpActive(), isHost:MP.isHost, help:MP.help, players:MP.players.map(p => ({ id:p.id, hero:p.hero })), remotes:[...RM.values()].map(a => ({ id:a.id, hero:a.hero, x:a.x, z:a.z, rr:a.rr })), visiting:!!visiting, vItems:visiting ? visiting.items.length : 0, vMoney:visiting ? visiting.money : 0, vHelp:visiting ? visiting.help : false }; },
  setHelp(on){ MP.help = !!on; MP.parkDirty = true; hudKey = ''; },
  get fps(){ return fps; }, get dpr(){ return dpr; }, get rot2(){ return ROT; }, get shadows(){ return renderer.shadowMap.enabled; }, hiQ(on){ hiQ = !!on; },
  shot(v){ closeup = v ? { px:v[0], py:v[1], pz:v[2], lx:v[3], ly:v[4], lz:v[5] } : null; if(v){ camPos.set(v[0], v[1], v[2]); camLook.set(v[3], v[4], v[5]); } },
  bcam(x, z, d){ bcam.x = x; bcam.z = z; if(d) bcam.dist = d; snapCam = true; },
  hud(on){ hudEl.style.visibility = on ? '' : 'hidden'; },
  STATS, scr(c, r, y = 0){ return screenOf(cellX(c), y, cellZ(r)); }, scrXZ:(x, y, z) => screenOf(x, y, z)
};

/* ---------- boot ---------- */
buildWorld();
setHero(heroId);
syncScene(); calcBeauty();
resize();
showMenu();
requestAnimationFrame(frame);
(function(){
  const join = QS.get('join'), host = QS.get('host') === '1', inv = QS.get('invite'), room = QS.get('room');
  if(!/^\d{4}$/.test(join || '') && !host) return;
  const q = new URLSearchParams(location.search); ['join', 'host', 'invite', 'room'].forEach(k => q.delete(k));
  try{ history.replaceState(null, '', location.pathname + (q.toString() ? '?' + q : '') + location.hash); }catch(e){}
  if(/^\d{4}$/.test(join || '')) mpJoin(join, performance.now() + 10000);
  else { MP.inviteFor = /^[A-Z2-9]{6}$/.test(inv || '') ? inv : null; mpCreate(room); }
})();
