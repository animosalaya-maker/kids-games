/* Surprise Island («جزيرة المفاجآت 🌪️») — main game.
   Each round one or two funny surprise events hit the island village. A 10 s warning shows a picture + a word,
   then you survive about 60 s: 🌊 rising water (climb high), 🌬️ big wind (hide behind walls), ❄️ snowball storm (dodge),
   🍬 candy rain (sticky floor, collect candy, dodge giant gumdrops), 🫧 bubble flood (don't touch the bubbles),
   🐸 frog jump party (bouncy, frogs bump you), 🌋 the floor is lava (stand on furniture).
   Caught? You float in a bubble to the cheer balcony and cheer with emotes. Survivors get stars and a few World coins.
   Bots fill the round (simple survival AI per event). Online rooms (Supabase presence like garden; ?mp=local =
   BroadcastChannel): up to 4 kids plus bots; the host runs the events, the bots and who is caught. */
import * as THREE from '../adventure3d/three.module.min.js';
import { makeKit } from '../worlds/kit.js';
import { buildIsland, ISL_R, PIER, BAL, LAVA_Y } from './island.js';

const $ = s => document.querySelector(s);
{ const md = document.querySelector('meta[name="description"]'), dl = window.I18N && md && md.getAttribute('data-' + I18N.lang); if(dl) md.setAttribute('content', dl); }
const N = n => window.I18N ? I18N.num(n) : String(n);
const rawGet = k => { try{ return localStorage.getItem(k); }catch(e){ return null; } };
const rawSet = (k, v) => { try{ localStorage.setItem(k, v); }catch(e){} };
const K = makeKit(THREE);
const { Merge, G:GEO, canvasTex, HEROES, HERO_IDS, HERO_NAME, HERO_COLOR, poseHero } = K;
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const angDiff = (a, b) => { let d = a - b; while(d > Math.PI) d -= Math.PI * 2; while(d < -Math.PI) d += Math.PI * 2; return d; };
const pick = a => a[Math.floor(Math.random() * a.length)];
const rr = (a, b) => a + Math.random() * (b - a);
const charImg = id => '../worlds/chars/' + (HEROES[id] ? id : 'sara') + '.png';
const QS = new URLSearchParams(location.search);
const MP_LOCAL = QS.get('mp') === 'local';
const mmss = s => { s = Math.max(0, Math.ceil(s)); return N(Math.floor(s / 60)) + ':' + String(s % 60).padStart(2, '0'); };
const today = () => { const d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); };

/* ======================================================================
   Rules and numbers
   ====================================================================== */
const WARN_T = 10, RUN_T = 60, E2_WARN = 16, E2_ON = 22, END_T = 1.4;
const GRAV = 24, JUMP_V = 9.2, SPEED = 5.6, PR = .42, PH = 1.25, STEP = .46;
const WL_BASE = -.5, WL_MAX = 2.9;
const NPLAY = 6, MP_MAX = 4, COIN_CAP = 30;
const EVENTS = {
  water: { e:'🌊', c:'#4fb3f0', name:L('المي طالعة!', 'Rising water!', 'Su yükseliyor!'), hint:L('اطلع لفوق! عالسطوح أو التلة ⬆️', 'Climb up high! Roofs or the hill ⬆️', 'Yükseğe tırman! Çatılar ya da tepe ⬆️'), out:L('طفت مع المي 💦', 'The water floated you away 💦', 'Su seni sürükledi 💦') },
  wind:  { e:'🌬️', c:'#9fb6c8', name:L('ريح قوية!', 'Big wind!', 'Büyük rüzgar!'), hint:L('تخبّى ورا حيط أو جوّا بيت 🧱', 'Hide behind a wall or inside a house 🧱', 'Bir duvarın arkasına ya da eve saklan 🧱'), out:L('طيّرتك الريح متل الطيارة الورق 🪁', 'The wind blew you like a kite 🪁', 'Rüzgar seni uçurtma gibi uçurdu 🪁') },
  snow:  { e:'❄️', c:'#8fd3ff', name:L('عاصفة كرات تلج!', 'Snowball storm!', 'Kartopu fırtınası!'), hint:L('زيح عن الكرات أو اطلع على شي عالي ↔️', 'Dodge the snowballs or climb on something ↔️', 'Kartopularından kaç ya da bir şeyin üstüne çık ↔️'), out:L('صرت رجل تلج ⛄', 'You became a snowman ⛄', 'Kardan adam oldun ⛄') },
  candy: { e:'🍬', c:'#ff8fb1', name:L('مطر سكاكر!', 'Candy rain!', 'Şeker yağmuru!'), hint:L('لمّ السكاكر وانتبه من الحلوى الكبيرة 👀', 'Grab candies — watch out for the big gumdrops 👀', 'Şekerleri topla — dev jelibonlara dikkat 👀'), out:L('لزقت بالحلوى 🍬', 'Stuck in a gumdrop 🍬', 'Jelibona yapıştın 🍬') },
  bubble:{ e:'🫧', c:'#7fe0e6', name:L('فيضان فقاعات!', 'Bubble flood!', 'Baloncuk seli!'), hint:L('لا تلمس الفقاعات! اطلع لفوق 🙅', "Don't touch the bubbles! Go up high 🙅", 'Baloncuklara dokunma! Yükseğe çık 🙅'), out:L('الفقاعة شالتك 🫧', 'A bubble picked you up 🫧', 'Bir baloncuk seni kaptı 🫧') },
  frog:  { e:'🐸', c:'#6fcf5a', name:L('حفلة ضفادع!', 'Frog jump party!', 'Kurbağa zıplama partisi!'), hint:L('كلّو بينطّ! تخبّى جوّا بيت من الضفادع 🏠', 'Everyone bounces! Hide in a house from the frogs 🏠', 'Herkes zıplıyor! Kurbağalardan evde saklan 🏠'), out:L('دوّختك الضفادع 🌀', 'The frogs made you dizzy 🌀', 'Kurbağalar başını döndürdü 🌀') },
  lava:  { e:'🌋', c:'#ff7a3a', name:L('الأرض صارت لافا!', 'The floor is lava!', 'Yer lav oldu!'), hint:L('وقف على الأغراض: كنباية، طاولة، صخرة 🪑', 'Stand on furniture: a sofa, a table, a rock 🪑', 'Eşyaların üstüne çık: kanepe, masa, kaya 🪑'), out:L('لمست الأرض! 🔥 (بس لعبة)', 'You touched the floor! 🔥 (just a game)', 'Yere dokundun! 🔥 (sadece oyun)') }
};
const EV_IDS = Object.keys(EVENTS);
const SEA_OUT = L('وقعت بالبحر 💦', 'Splash! Into the sea 💦', 'Şap! Denize düştün 💦');

/* ---------- save (this device): surprise_save v1 ---------- */
const SAVE_KEY = 'surprise_save' + (MP_LOCAL && /^[a-z]$/.test(QS.get('slot') || '') ? '_' + QS.get('slot') : ''), SAVE_V = 1;
function freshSave(){ return { v:SAVE_V, hero:null, stars:0, rounds:0, survived:0, streak:0, best:0, tut:0, cd:{ d:'', n:0 }, seen:{} }; }
function loadSave(){
  try{
    const v = JSON.parse(rawGet(SAVE_KEY));
    if(v && typeof v === 'object' && v.v === SAVE_V){
      const s = Object.assign(freshSave(), v);
      for(const k of ['stars', 'rounds', 'survived', 'streak', 'best', 'tut']) s[k] = clamp(Math.floor(+s[k] || 0), 0, 9999999);
      s.best = Math.max(s.best, s.streak);
      s.cd = { d:String(v.cd && v.cd.d || ''), n:clamp((v.cd && v.cd.n) | 0, 0, 999) };
      s.seen = {}; if(v.seen && typeof v.seen === 'object') for(const k of EV_IDS) if(v.seen[k]) s.seen[k] = 1;
      return s;
    }
  }catch(e){}
  return null;
}
let SAVE = loadSave() || freshSave();
function persist(){ rawSet(SAVE_KEY, JSON.stringify(SAVE)); }
let heroId = HERO_IDS.includes(SAVE.hero) ? SAVE.hero : HERO_IDS.includes(rawGet('worlds_hero')) ? rawGet('worlds_hero') : 'sara';

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

/* ---------- Sound: tiny synth + a bouncy music loop (no files) ---------- */
let actx = null, muted = rawGet('adv3d_muted') === 'true', noiseBuf = null;
function ac(){
  if(!actx){ try{ actx = new (window.AudioContext || window.webkitAudioContext)(); }catch(e){ actx = null; } }
  if(actx && actx.state === 'suspended') actx.resume().catch(() => {});
  return actx;
}
function noteAt(t0, freq, dur, type, vol, toFreq){
  const a = actx; if(!a || muted) return;
  const o = a.createOscillator(), g = a.createGain();
  o.type = type || 'sine'; o.frequency.setValueAtTime(freq, t0);
  if(toFreq) o.frequency.exponentialRampToValueAtTime(toFreq, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol || 0.15, t0 + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(a.destination); o.start(t0); o.stop(t0 + dur + 0.05);
}
function tone(freq, dur, type, vol, delay, toFreq){ if(muted) return; const a = ac(); if(!a) return; noteAt(a.currentTime + (delay || 0), freq, dur, type, vol, toFreq); }
function noise(dur, vol, f0, f1, delay = 0, q = 1){
  if(muted) return; const a = ac(); if(!a) return;
  if(!noiseBuf){ noiseBuf = a.createBuffer(1, a.sampleRate, a.sampleRate); const d = noiseBuf.getChannelData(0); for(let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
  const t0 = a.currentTime + delay, s = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain();
  s.buffer = noiseBuf; s.loop = true; f.type = 'bandpass'; f.Q.value = q; f.frequency.setValueAtTime(f0, t0); f.frequency.exponentialRampToValueAtTime(f1, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol, t0 + dur * .25); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  s.connect(f).connect(g).connect(a.destination); s.start(t0); s.stop(t0 + dur + .05);
}
const SFX = {
  tap(){ tone(520, .05, 'triangle', .08); }, bonk(){ tone(300, .14, 'square', .05, 0, 140); },
  jump(){ tone(330, .16, 'sine', .1, 0, 660); },
  boing(){ tone(180, .25, 'sine', .14, 0, 520); tone(360, .2, 'triangle', .05, .05, 900); },
  horn(){ [0, .32].forEach(d => { tone(392, .22, 'square', .05, d, 380); tone(523, .22, 'triangle', .06, d); }); },
  tick(){ tone(1100, .04, 'square', .03); },
  go(){ [523, 659, 784, 1046].forEach((f, i) => tone(f, .12, 'triangle', .1, i * .07)); },
  splash(){ noise(.45, .12, 1800, 300, 0, .8); },
  whoosh(){ noise(1.4, .09, 300, 1400, 0, .7); },
  crunch(){ noise(.25, .14, 900, 200, 0, 1.5); tone(140, .15, 'sine', .08); },
  candy(){ tone(1568, .06, 'triangle', .08); tone(2093, .08, 'triangle', .07, .05); },
  bloop(){ tone(220, .2, 'sine', .14, 0, 90); },
  pop(){ tone(500, .08, 'sine', .12, 0, 1100); noise(.08, .05, 3000, 2000); },
  sizzle(){ noise(.35, .05, 4000, 2500, 0, .6); },
  caught(){ [392, 494, 587, 784, 988].forEach((f, i) => tone(f, .16, 'sine', .08, i * .09)); tone(600, .4, 'sine', .06, 0, 1400); },
  cheer(){ [784, 988, 1175, 1568].forEach((f, i) => tone(f, .1, 'triangle', .1, i * .07)); },
  star(){ [1046, 1318, 1568, 2093].forEach((f, i) => tone(f, .09, 'triangle', .08, i * .05)); },
  coins(){ [1318, 1568, 1976, 1568, 2093].forEach((f, i) => tone(f, .07, 'square', .045, i * .06)); },
  flag(){ [523, 659, 784].forEach((f, i) => tone(f, .16, 'triangle', .12, i * .08)); }
};
/* music: a cheerful island loop (C major pentatonic); faster and busier while an event runs */
const MUS = { next:0, step:0, mood:0 };
const MEL = [[0, -1, 2, 4, -1, 4, 2, 0, 1, -1, 2, -1, 4, 5, 4, -1], [4, 2, 4, 5, 7, -1, 5, 4, 2, 4, 2, 1, 0, -1, 2, -1]];
const PENTA = [261.63, 293.66, 329.63, 392, 440, 523.25, 587.33, 659.25];
const BASS = [130.81, 98, 110, 87.31];
function musicTick(){
  const a = actx; if(!a || muted || a.state !== 'running') return;
  const on = state === 'play' || state === 'pause' || state === 'results' || state === 'card';
  if(!on) { MUS.next = 0; return; }
  const run = RS.ph === 'run', bpm = run ? 132 : RS.ph === 'warn' ? 120 : 108, st = 60 / bpm / 2;
  if(MUS.next < a.currentTime) MUS.next = a.currentTime + .05;
  while(MUS.next < a.currentTime + .3){
    const i = MUS.step % 16, bar = Math.floor(MUS.step / 16) % 4, t = MUS.next, mel = MEL[bar % 2][i];
    if(mel >= 0) noteAt(t, PENTA[mel] * (run ? 2 : 1), .16, 'triangle', run ? .035 : .03);
    if(i % 4 === 0) noteAt(t, BASS[bar], .3, 'sine', .07);
    if(run && i % 2 === 1) noteAt(t, 2400, .03, 'square', .008);
    if(RS.ph === 'warn' && i % 4 === 2) noteAt(t, 1320, .05, 'square', .015);
    MUS.next += st; MUS.step++;
  }
}
setInterval(musicTick, 100);

/* ---------- Renderer ---------- */
const canvas = $('#cv');
let renderer;
try{ renderer = new THREE.WebGLRenderer({ canvas, antialias:true, powerPreference:'high-performance' }); }
catch(e){ $('#nogl').hidden = false; $('#overlay').hidden = true; throw e; }
let dpr = (window.BoboGfx ? BoboGfx.dpr(1.5, renderer) : Math.min(window.devicePixelRatio || 1, 1.5));
renderer.setPixelRatio(dpr);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = window.BoboGfx && BoboGfx.weak(renderer) ? THREE.PCFShadowMap : THREE.PCFSoftShadowMap;
const scene = new THREE.Scene();
const FOG0 = new THREE.Color(0xcdeeff);
scene.fog = new THREE.Fog(FOG0.getHex(), 60, 170);
const camera = new THREE.PerspectiveCamera(52, 1, 0.1, 800);
function resize(){
  layout();
  renderer.setSize(SW, SH, false);
  camera.aspect = SW / SH; camera.updateProjectionMatrix();
  placeJoyHome();
}
addEventListener('resize', resize);
addEventListener('orientationchange', () => setTimeout(resize, 120));
const HEMI_SKY = new THREE.Color(0xfff4e2), HEMI_GND = new THREE.Color(0x7f9a6c);
const hemi = new THREE.HemisphereLight(HEMI_SKY.getHex(), HEMI_GND.getHex(), 1.7); scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff0d4, 2.3);
sun.castShadow = true; sun.shadow.mapSize.setScalar(window.BoboGfx ? BoboGfx.shadow(1024, renderer) : 1024); sun.shadow.bias = -.0006; sun.shadow.normalBias = .03;
Object.assign(sun.shadow.camera, { left:-24, right:24, top:24, bottom:-24, near:1, far:110 }); sun.shadow.camera.updateProjectionMatrix();
scene.add(sun); scene.add(sun.target);
const SUN_OFF = new THREE.Vector3(18, 38, 20);
function aimSun(x, z){ sun.target.position.set(x, 0, z); sun.position.set(x + SUN_OFF.x, SUN_OFF.y, z + SUN_OFF.z); }
const skyMat = new THREE.MeshBasicMaterial({ vertexColors:true, side:THREE.BackSide, fog:false, depthWrite:false });
const sky = (() => {
  const g = new THREE.SphereGeometry(600, 24, 16), col = new Float32Array(g.attributes.position.count * 3);
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const m = new THREE.Mesh(g, skyMat);
  const pa = g.attributes.position, a = new THREE.Color(0x4fb0f2), h = new THREE.Color(0xfff2d6), b = new THREE.Color(0x9edcff), t = new THREE.Color();
  for(let i = 0; i < pa.count; i++){ const y = pa.getY(i) / 600; if(y >= 0) t.copy(h).lerp(a, clamp(Math.pow(y, .55) * 1.5, 0, 1)); else t.copy(h).lerp(b, clamp(-y * 2.2, 0, 1)); col[i * 3] = t.r; col[i * 3 + 1] = t.g; col[i * 3 + 2] = t.b; }
  m.renderOrder = -1; scene.add(m); return m;
})();
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _s = new THREE.Vector3(), _v = new THREE.Vector3(), _c = new THREE.Color();

/* ---------- the island ---------- */
const ISL = buildIsland(THREE, K);
scene.add(ISL.grp);
const { BOX, CYL, perches, highs, shelters, houses, spawns, balSlots } = ISL;

/* ---------- Particles (instanced puffs / sparkles / drops) ---------- */
const PMAX = 420, parts = [], pMesh = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(.08, 0), new THREE.MeshBasicMaterial(), PMAX);
pMesh.frustumCulled = false; scene.add(pMesh);
for(let i = 0; i < PMAX; i++){ parts.push({ life:0, x:0, y:0, z:0, vx:0, vy:0, vz:0, s:1, g:12 }); pMesh.setColorAt(i, _c.set(0xffffff)); _m.makeScale(0, 0, 0); pMesh.setMatrixAt(i, _m); }
let pNext = 0;
const CONFETTI = [0xffc23d, 0xff8fb1, 0x5ed6a0, 0x6cc4ff, 0xffffff];
function burst(x, y, z, n, colors, speed = 4, size = 1, grav = 12, up = 2, life = 1){
  for(let k = 0; k < n; k++){
    const p = parts[pNext], i = pNext; pNext = (pNext + 1) % PMAX;
    const a = Math.random() * 6.28, u = Math.random() * 2 - 1, r = Math.sqrt(1 - u * u);
    p.life = (.7 + Math.random() * .6) * life; p.x = x; p.y = y; p.z = z; p.vx = Math.cos(a) * r * speed; p.vz = Math.sin(a) * r * speed; p.vy = Math.abs(u) * speed + up; p.s = size * (.7 + Math.random() * .8); p.g = grav;
    pMesh.setColorAt(i, _c.set(pick(colors)));
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

/* ======================================================================
   Collisions: boxes and upright cylinders (see island.js)
   ====================================================================== */
const inIsland = (x, z) => x * x + z * z <= ISL_R * ISL_R || (x > PIER.x0 + .3 && x < PIER.x1 - .3 && z > PIER.z0 - 1 && z < PIER.z1 - .3);
function clampIsland(o){
  if(inIsland(o.x, o.z)) return;
  const d = Math.hypot(o.x, o.z) || 1, ax = o.x * ISL_R / d, az = o.z * ISL_R / d;
  const px = clamp(o.x, PIER.x0 + .3, PIER.x1 - .3), pz = clamp(o.z, PIER.z0 - 1, PIER.z1 - .3);
  if(Math.hypot(o.x - ax, o.z - az) <= Math.hypot(o.x - px, o.z - pz)){ o.x = ax; o.z = az; } else { o.x = px; o.z = pz; }
}
const baseGround = (x, z) => x * x + z * z < 31 * 31 ? 0 : -3;
/* the highest top under (x, z) that can be reached from height y (a step up of STEP) */
function supportAt(x, z, y, r = .26){
  let g = baseGround(x, z);
  for(const b of BOX){ if(b.y1 > y + STEP || b.y1 <= g) continue; if(x > b.x0 - r && x < b.x1 + r && z > b.z0 - r && z < b.z1 + r) g = b.y1; }
  for(const c of CYL){ if(c.y1 > y + STEP || c.y1 <= g) continue; const dx = x - c.x, dz = z - c.z, m = c.r + r; if(dx * dx + dz * dz < m * m) g = c.y1; }
  return g;
}
const topAt = (x, z) => supportAt(x, z, 99, .05);
/* push a body out of everything its body overlaps; returns the lowest blocking top (for auto-jump) or null */
function pushOut(o, r, y, h){
  let hit = null;
  for(const b of BOX){
    if(b.y1 <= y + STEP || b.y0 >= y + h) continue;
    const cx = clamp(o.x, b.x0, b.x1), cz = clamp(o.z, b.z0, b.z1), dx = o.x - cx, dz = o.z - cz, q = dx * dx + dz * dz;
    if(q >= r * r) continue;
    if(q > 1e-8){ const s = Math.sqrt(q); o.x = cx + dx / s * r; o.z = cz + dz / s * r; }
    else { const l = o.x - b.x0, rt = b.x1 - o.x, t = o.z - b.z0, bt = b.z1 - o.z, mn = Math.min(l, rt, t, bt); if(mn === l) o.x = b.x0 - r; else if(mn === rt) o.x = b.x1 + r; else if(mn === t) o.z = b.z0 - r; else o.z = b.z1 + r; }
    if(hit == null || b.y1 < hit) hit = b.y1;
  }
  for(const c of CYL){
    if(c.y1 <= y + STEP || c.y0 >= y + h) continue;
    const dx = o.x - c.x, dz = o.z - c.z, m = c.r + r, q = dx * dx + dz * dz;
    if(q >= m * m) continue;
    const s = Math.sqrt(q) || 1e-4; o.x = c.x + dx / s * m; o.z = c.z + dz / s * m;
    if(hit == null || c.y1 < hit) hit = c.y1;
  }
  return hit;
}
function ceilingAt(x, z, y0, y1, r = .3){
  let lo = null;
  for(const b of BOX){ if(b.y0 < y0 - .02 || b.y0 >= y1) continue; if(x > b.x0 - r && x < b.x1 + r && z > b.z0 - r && z < b.z1 + r) lo = lo == null ? b.y0 : Math.min(lo, b.y0); }
  for(const c of CYL){ if(c.y0 < y0 - .02 || c.y0 >= y1) continue; const dx = x - c.x, dz = z - c.z, m = c.r + r; if(dx * dx + dz * dz < m * m) lo = lo == null ? c.y0 : Math.min(lo, c.y0); }
  return lo;
}
function pointSolid(x, y, z){
  for(const b of BOX) if(y > b.y0 && y < b.y1 && x > b.x0 && x < b.x1 && z > b.z0 && z < b.z1) return true;
  for(const c of CYL) if(y > c.y0 && y < c.y1 && (x - c.x) ** 2 + (z - c.z) ** 2 < c.r * c.r) return true;
  return false;
}
const houseAt = (x, z, pad = 0) => houses.find(h => x > h.x0 + pad && x < h.x1 - pad && z > h.z0 + pad && z < h.z1 - pad) || null;

/* ======================================================================
   Actors: you, other kids (online) and bots — one shape for all
   ====================================================================== */
const ACT = new Map();
let me = null;
const ringGeo = new THREE.RingGeometry(.48, .62, 28); ringGeo.rotateX(-Math.PI / 2);
const MCOL = ['#ff8fb1', '#6cc4ff', '#5ed6a0', '#ffc23d'];
const bubbleMat = new THREE.MeshStandardMaterial({ color:0xd9f6ff, roughness:.05, metalness:.1, transparent:true, opacity:.32, emissive:0x9fe8ff, emissiveIntensity:.25, depthWrite:false });
const bubbleGeo = new THREE.SphereGeometry(1, 22, 16);
function shadowAll(g){ g.traverse(o => { if(o.isMesh) o.castShadow = true; }); }
function mkActor(id, kind, hero){
  const a = { id, kind, hero:null, h:null, x:0, y:0, z:0, vx:0, vy:0, vz:0, kx:0, kz:0, f:0, m:0, grounded:true, out:false, spec:false, fl:null,
    wetT:0, hotT:0, dizzy:0, cand:0, shelT:0, shel:false, jumpQ:false, ring:null, bub:null, t:Math.random() * 5, tx:0, ty:0, tz:0, tf:0, tm:0, seen:false, slot:0, ai:null, cheerT:rr(1, 4), sq:0 };
  a.bub = new THREE.Mesh(bubbleGeo, bubbleMat); a.bub.visible = false; a.bub.renderOrder = 3; scene.add(a.bub);
  setActorHero(a, hero);
  ACT.set(id, a); return a;
}
function setActorHero(a, hero){
  hero = HEROES[hero] ? hero : 'sara';
  if(a.hero === hero && a.h) return;
  if(a.h) scene.remove(a.h.grp);
  a.hero = hero; a.h = HEROES[hero](); shadowAll(a.h.grp); scene.add(a.h.grp);
  if(a.kind !== 'bot'){
    if(!a.ring){ a.ring = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color:a.kind === 'me' ? 0xffc23d : 0xffffff, transparent:true, opacity:.9, depthWrite:false })); a.ring.renderOrder = 2; }
    a.h.grp.add(a.ring); a.ring.position.y = .04;
  }
}
function dropActor(id){ const a = ACT.get(id); if(!a) return; if(a.h) scene.remove(a.h.grp); scene.remove(a.bub); ACT.delete(id); if(a.tag) a.tag.remove(); }
function placeAt(a, p, f){ a.x = p.x; a.z = p.z; a.y = topAt(p.x, p.z); a.vx = a.vy = a.vz = a.kx = a.kz = 0; a.f = f || 0; a.grounded = true; a.tx = a.x; a.ty = a.y; a.tz = a.z; a.tf = a.f; }
function toBalcony(a){ const s = balSlots[a.slot % balSlots.length]; a.x = s.x + rr(-.3, .3); a.z = s.z + rr(-.3, .3); a.y = BAL.y; a.vx = a.vy = a.vz = a.kx = a.kz = 0; a.f = Math.atan2(-a.x, -a.z); a.grounded = true; a.tx = a.x; a.ty = a.y; a.tz = a.z; a.tf = a.f; }
const alive = a => !a.out && !a.fl;
const authority = () => !mpActive() || MP.isHost;

/* ======================================================================
   Round state and the events
   ====================================================================== */
const RS = { ph:'idle', t:0, n:0, ev:[], roster:[], last:[], force:null, res:null, endT:0, freeze:false };
const EVS = { wl:WL_BASE, wa:0, wg:0, wNext:0, lava:0, snow:[], cand:[], drop:[], bub:[], frogs:[], spT:0, id:0, aggro:false };
/* is event k doing its thing right now? (warning: about to start) */
function evOn(k){
  if(RS.ph !== 'run') return false;
  if(RS.ev[0] === k) return true;
  return RS.ev[1] === k && RS.t >= E2_ON;
}
function evWarn(k){ return (RS.ph === 'warn' && RS.ev[0] === k) || (RS.ph === 'run' && RS.ev[1] === k && RS.t >= E2_WARN && RS.t < E2_ON); }
const evSoon = k => evOn(k) || evWarn(k);
function activeEvs(){ return RS.ev.filter(k => evOn(k)); }
function chooseEvents(){
  if(RS.force){ const f = RS.force.filter(k => EVENTS[k]).slice(0, 2); RS.force = null; if(f.length) return f; }
  const pool = EV_IDS.filter(k => !RS.last.includes(k));
  const a = pick(pool);
  if(RS.n >= 2 && Math.random() < .4){ const b = pick(pool.filter(k => k !== a && !(a === 'water' && k === 'lava') && !(a === 'lava' && k === 'water'))); return [a, b]; }
  return [a];
}
/* start a round (solo or host): everyone back to the plaza */
function startRound(){
  RS.n++; RS.ph = 'warn'; RS.t = 0; RS.res = null; RS.endT = 0;
  RS.ev = chooseEvents(); RS.last = RS.ev.slice();
  resetHazards();
  fillBots();
  RS.roster = [...ACT.values()].filter(a => a.kind !== 'remote' || mpHere(a.id)).map(a => a.id);
  let i = 0;
  for(const id of RS.roster){ const a = ACT.get(id); a.slot = i; respawn(a, i); i++; }
  for(const a of ACT.values()) if(!RS.roster.includes(a.id)){ a.out = true; a.spec = true; toBalcony(a); }
  roundBegan();
  if(mpActive()) mpSnap(true);
}
function respawn(a, i){
  const sp = spawns[i % spawns.length];
  a.out = false; a.spec = false; a.fl = null; a.wetT = a.hotT = a.dizzy = a.cand = 0; a.bub.visible = false;
  placeAt(a, sp, sp.f); if(a.ai) a.ai = newAI(a.ai.skill);
}
/* local side of a new round (all clients) */
let warnShown = '', lastWarnN = -1;
function roundBegan(){
  closeResults(); snapCam = true; cam.yaw = Math.atan2(me.x - ISL.PZ.x, me.z - ISL.PZ.z); cam.pAdj = 0;
  warnShown = ''; lastWarnN = -1;
  const k = RS.ev[0];
  if(!SAVE.seen[k]){ SAVE.seen[k] = 1; persist(); }
  if(SAVE.tut < 2){ say(L('شوف الصورة! هيدي المفاجأة الجاية 👀 ', 'Look at the picture! That is the next surprise 👀 ', 'Resme bak! Sıradaki sürpriz bu 👀 ') + EVENTS[k].hint, 6500, false); }
  hudKey = '';
}
function goRun(){ RS.ph = 'run'; RS.t = 0; SFX.go(); onEvStart(RS.ev[0]); }
function onEvStart(k){
  if(k === 'water'){ EVS.wl = Math.max(EVS.wl, WL_BASE); }
  if(k === 'wind'){ EVS.wa = Math.random() * Math.PI * 2; EVS.wNext = 13; }
  if(k === 'frog') spawnFrogs();
  hudKey = '';
}
function resetHazards(){
  EVS.snow.length = 0; EVS.cand.length = 0; EVS.drop.length = 0; EVS.bub.length = 0; EVS.frogs.length = 0; EVS.spT = 0; EVS.wg = 0;
}
function endRound(){
  const runT = RS.t;
  RS.ph = 'end'; RS.t = 0;
  const evRan = RS.ev.length > 1 && runT >= E2_ON ? 2 : 1;
  const res = RS.roster.map(id => { const a = ACT.get(id); if(!a) return null; const ok = !a.out && !a.fl; return [id, ok ? 1 : 0, ok ? evRan + (a.cand >= 8 ? 1 : 0) : 0, a.cand]; }).filter(Boolean);
  RS.res = res;
  if(mpActive()){ mpSend('re', { n:RS.n, res, ev:RS.ev, er:evRan }); mpSnap(true); }
  gotResults(res, evRan);
}
/* every client: my result → stars, streak, World coins */
let lastGain = null;
function gotResults(res, evRan){
  RS.res = res;
  const mine = res.find(r => r[0] === me.id);
  lastGain = null;
  if(mine){
    const ok = !!mine[1], stars = mine[2] | 0;
    SAVE.rounds++;
    let coins = 0;
    if(ok){ SAVE.survived++; SAVE.streak++; SAVE.best = Math.max(SAVE.best, SAVE.streak); SAVE.stars += stars; coins = 2 + (evRan > 1 ? 1 : 0) + ((mine[3] | 0) >= 8 ? 1 : 0); }
    else { SAVE.streak = 0; if((mine[3] | 0) >= 8){ SAVE.stars += 1; } }
    if(SAVE.cd.d !== today()) SAVE.cd = { d:today(), n:0 };
    coins = Math.max(0, Math.min(coins, COIN_CAP - SAVE.cd.n));
    if(coins > 0){ SAVE.cd.n += coins; try{ if(window.World) World.addCoins(coins, L('من جزيرة المفاجآت', 'from Surprise Island', 'Sürpriz Adası\'ndan')); }catch(e){} }
    if(SAVE.tut < 2) SAVE.tut = 2;
    persist();
    lastGain = { ok, stars:ok ? stars : ((mine[3] | 0) >= 8 ? 1 : 0), coins, cand:mine[3] | 0 };
    if(ok){ SFX.cheer(); say(pick([L('برافو! نجيت 🌟', 'Bravo! You survived 🌟', 'Bravo! Hayatta kaldın 🌟'), L('يا سلام عليك! 🎉', 'Way to go! 🎉', 'Harikasın! 🎉')]), 3000); }
  }
  hudKey = '';
  setTimeout(() => { if(RS.ph === 'end' && state === 'play') showResults(); }, END_T * 1000);
}

/* ---------- catching: a funny bubble float up to the cheer balcony ---------- */
function catchActor(a, why, silent){
  if(!a || a.out || a.fl) return;
  a.out = true;
  startFloat(a, why);
  if(!silent && mpActive() && MP.isHost) mpSend('cg', { w:a.id, why, x:r2(a.x), y:r2(a.y), z:r2(a.z) });
}
function startFloat(a, why){
  a.out = true;
  const s = balSlots[a.slot % balSlots.length];
  a.fl = { t:0, d:3.6, x0:a.x, y0:a.y, z0:a.z, x1:s.x + rr(-.3, .3), z1:s.z + rr(-.3, .3), why };
  a.bub.visible = true; a.vx = a.vy = a.vz = a.kx = a.kz = 0;
  burst(a.x, a.y + .8, a.z, 16, [0xd9f6ff, 0xffffff, 0x9fe8ff], 2.5, 1.1, 2, 1);
  if(a === me){
    SFX.caught(); clearInput();
    pop('🫧 ' + (why === 'sea' ? SEA_OUT : EVENTS[why] ? EVENTS[why].out : ''));
    if(SAVE.tut < 3){ SAVE.tut = Math.max(SAVE.tut, 1); setTimeout(() => say(L('ولا يهمك! شجّع أصحابك من الشرفة 🎉 كبوس عالوجوه تحت', 'Never mind! Cheer your friends from the balcony 🎉 tap the faces below', 'Boş ver! Balkondan arkadaşlarını destekle 🎉 aşağıdaki yüzlere dokun'), 5000), 1200); }
  } else if(dist2(a, me) < 400) SFX.bloop();
  hudKey = '';
}
function floatFrame(a, dt){
  const f = a.fl; f.t += dt;
  const k = clamp(f.t / f.d, 0, 1), e = k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
  const top = Math.max(f.y0, BAL.y) + 6;
  const x = lerp(f.x0, f.x1, e), z = lerp(f.z0, f.z1, e);
  const y = k < 1 ? (1 - k) * (1 - k) * (f.y0 + .2) + 2 * (1 - k) * k * top + k * k * (BAL.y + .2) : BAL.y;
  a.x = x; a.y = y + Math.sin(f.t * 5) * .08 * (1 - k); a.z = z; a.f += dt * 1.5; a.grounded = false;
  if(k >= 1){
    a.fl = null; a.spec = true; a.bub.visible = false; a.y = BAL.y; a.grounded = true; a.vy = 0;
    burst(a.x, a.y + .9, a.z, 22, [0xd9f6ff, 0xffffff, 0x9fe8ff], 3, 1, 6, 2);
    if(a === me){ SFX.pop(); hudKey = ''; cam.yaw = Math.atan2(BAL.x0 + 3 - ISL.PZ.x, BAL.z0 + 2 - ISL.PZ.z); cam.pAdj = .1; }
  }
}
const r2 = n => Math.round(n * 100) / 100;
const dist2 = (a, b) => (a.x - b.x) ** 2 + (a.z - b.z) ** 2;

/* ======================================================================
   Physics for every body (you, and on the host the bots)
   ====================================================================== */
const windSpeed = () => 1.2 + EVS.wg * 7.6;
function sheltered(a, dt){
  a.shelT -= dt; if(a.shelT > 0) return a.shel;
  a.shelT = .12;
  const dx = -Math.sin(EVS.wa), dz = -Math.cos(EVS.wa), y = a.y + .75;
  let s = false;
  for(let d = .5; d <= 6.01; d += .5) if(pointSolid(a.x + dx * d, y, a.z + dz * d)){ s = true; break; }
  return (a.shel = s);
}
function physStep(a, dt, ix, iz, jump){
  if(a.fl){ floatFrame(a, dt); return; }
  const wasG = a.grounded, y0 = a.y, ev = !a.spec && RS.ph === 'run';
  const inW = !a.spec && a.y < EVS.wl - .35;
  const sticky = ev && evOn('candy') && a.grounded && a.y < .25;
  const frog = ev && evOn('frog');
  const sp = SPEED * (inW ? .6 : 1) * (sticky ? .45 : 1), im = Math.hypot(ix, iz);
  const acc = Math.min(1, (a.grounded ? 14 : 5) * dt);
  a.vx += (ix * sp - a.vx) * acc; a.vz += (iz * sp - a.vz) * acc;
  if(jump && (a.grounded || inW)){ a.vy = (inW && !a.grounded ? 6.5 : JUMP_V) * (frog ? 1.45 : 1) * (sticky ? .72 : 1); a.grounded = false; if(a === me) SFX.jump(); }
  else if(frog && a.grounded){ a.vy = 5.4; a.grounded = false; }
  let ex = a.kx, ez = a.kz;
  const kd = Math.exp(-2.4 * dt); a.kx *= kd; a.kz *= kd; if(Math.abs(a.kx) + Math.abs(a.kz) < .05) a.kx = a.kz = 0;
  if(ev && evOn('wind') && !sheltered(a, dt)){ const ws = windSpeed(); ex += Math.sin(EVS.wa) * ws; ez += Math.cos(EVS.wa) * ws; }
  a.vy -= GRAV * (inW ? .45 : 1) * dt; if(inW) a.vy = Math.max(a.vy, -4);
  a.x += (a.vx + ex) * dt; a.z += (a.vz + ez) * dt; a.y += a.vy * dt;
  if(a.spec){ a.x = clamp(a.x, BAL.x0 + .55, BAL.x1 - .55); a.z = clamp(a.z, BAL.z0 + .55, BAL.z1 - .55); }
  else if(Math.hypot(ex, ez) < .6 && a.y > -.3) clampIsland(a);
  const hit = pushOut(a, PR, a.y, PH);
  if(a.vy > 0){ const c = ceilingAt(a.x, a.z, y0 + PH, a.y + PH); if(c != null){ a.y = c - PH; a.vy = 0; } }
  const sup = supportAt(a.x, a.z, a.vy > 0 ? a.y - STEP : a.y);
  if(a.y <= sup + .001 || (wasG && a.vy <= 0 && a.y - sup < STEP)){
    if(!wasG && a.vy < -11 && a === me) SFX.bonk();
    a.y = sup; a.vy = 0; a.grounded = true;
  } else a.grounded = false;
  if(hit != null && a.grounded && im > .3 && hit - a.y > STEP && hit - a.y < 1.5){ a.vy = Math.sqrt(2 * GRAV * (hit - a.y + .35)); a.grounded = false; }
  const hs = Math.hypot(a.vx, a.vz);
  a.m = Math.min(1, hs / SPEED);
  if(hs > .3) a.f += angDiff(Math.atan2(a.vx, a.vz), a.f) * Math.min(1, 12 * dt);
}
/* water / lava / dizzy meters (everyone computes them; only the host catches) */
function meters(a, dt){
  if(!alive(a) || RS.ph !== 'run'){ a.wetT = 0; a.hotT = 0; return; }
  if(evOn('water') && EVS.wl > a.y + .85) a.wetT += dt; else a.wetT = Math.max(0, a.wetT - dt);
  if(evOn('lava') && EVS.lava > .6 && a.grounded && a.y < LAVA_Y + .07){ a.hotT += dt; if(a === me && Math.random() < dt * 5) SFX.sizzle(); }
  else a.hotT = Math.max(0, a.hotT - dt * .5);
}
function checkCatches(){
  for(const id of RS.roster){
    const a = ACT.get(id); if(!a || !alive(a)) continue;
    if(a.y < -.45 && !inIsland(a.x, a.z)) catchActor(a, 'sea');
    else if(a.wetT > 1.2) catchActor(a, 'water');
    else if(a.hotT > 1.1) catchActor(a, 'lava');
  }
}
const evT = k => RS.ev[0] === k ? RS.t : RS.t - E2_ON;
const roster = () => RS.roster.map(id => ACT.get(id)).filter(Boolean);
const targets = () => roster().filter(a => alive(a));

/* ======================================================================
   The round on the host (or solo): timers, hazards, catching
   ====================================================================== */
function simRound(dt){
  if(RS.ph === 'warn'){ RS.t += dt; EVS.lava = Math.max(0, EVS.lava - dt); EVS.wl = Math.max(WL_BASE, EVS.wl - dt * 1.5); EVS.wg = Math.max(0, EVS.wg - dt); if(RS.t >= WARN_T) goRun(); }
  else if(RS.ph === 'run'){
    const t0 = RS.t; RS.t += dt;
    if(RS.ev[1] && t0 < E2_ON && RS.t >= E2_ON) onEvStart(RS.ev[1]);
    simHazards(dt); checkCatches();
    const left = roster().filter(a => !a.out).length, flying = roster().some(a => a.fl);
    if(RS.t >= RUN_T || (left === 0 && !flying && RS.t > 3)) endRound();
  }
  else if(RS.ph === 'end'){
    RS.t += dt; simHazards(dt);
    if(mpActive() && MP.isHost && RS.t > 14) startRound();
  }
}
function spotFree(x, z){ return inIsland(x, z) && x * x + z * z < 27 * 27 && topAt(x, z) < .05 && !houseAt(x, z, -.6) && !pointSolid(x, .5, z); }
function randomGround(cx, cz, r, tries = 20){
  for(let i = 0; i < tries; i++){ const a = Math.random() * Math.PI * 2, d = Math.sqrt(Math.random()) * r, x = cx + Math.cos(a) * d, z = cz + Math.sin(a) * d; if(spotFree(x, z)) return { x, z }; }
  return null;
}
function simHazards(dt){
  /* 🌊 water rises (smoothly) then holds; it goes back down after */
  if(evOn('water')){ const k = clamp(evT('water') / 30, 0, 1); EVS.wl = WL_BASE + (WL_MAX - WL_BASE) * k * k * (3 - 2 * k); }
  else EVS.wl = Math.max(WL_BASE, EVS.wl - dt * 1.5);
  /* 🌋 lava fades in */
  EVS.lava = clamp(EVS.lava + (evOn('lava') ? dt / 1.5 : -dt), 0, 1);
  /* 🌬️ wind: gusts every 6.5 s, the direction turns every 13 s */
  if(evOn('wind')){
    const t = evT('wind'), ph = t % 6.5, g = ph < 1 ? ph : ph < 3.5 ? 1 : ph < 4.5 ? 4.5 - ph : 0;
    EVS.wg = g * Math.min(1, .45 + t / 12);
    if(t > EVS.wNext){ EVS.wNext += 13; EVS.wa += rr(1.2, 2.2) * (Math.random() < .5 ? -1 : 1); }
  } else EVS.wg = Math.max(0, EVS.wg - dt);
  /* ❄️ snowballs roll across the island */
  if(evOn('snow')){
    EVS.snT = (EVS.snT || 0) - dt;
    if(EVS.snT <= 0 && EVS.snow.length < 10){ EVS.snT = Math.max(.75, 1.7 - evT('snow') * .02); spawnSnowball(); }
  }
  for(let i = EVS.snow.length - 1; i >= 0; i--){
    const b = EVS.snow[i];
    b.x += b.vx * dt; b.z += b.vz * dt; b.rot += Math.hypot(b.vx, b.vz) / b.r * dt;
    const o = { x:b.x, z:b.z };
    const blocked = pushOut(o, b.r * .8, .14, b.r * 1.2 + .46) != null && Math.hypot(b.x, b.z) < 30.5;
    if(blocked || !evOn('snow') || Math.hypot(b.x, b.z) > 34){ if(Math.hypot(b.x, b.z) < 32) snowPuff(b); EVS.snow.splice(i, 1); continue; }
    for(const a of targets()) if(Math.hypot(a.x - b.x, a.z - b.z) < b.r + .38 && a.y < b.r * 1.15){ catchActor(a, 'snow'); }
  }
  /* 🍬 candy rain + giant gumdrops (a pink ring shows where) */
  if(evOn('candy')){
    EVS.caT = (EVS.caT || 0) - dt; EVS.gdT = (EVS.gdT == null ? 2 : EVS.gdT) - dt;
    if(EVS.caT <= 0){ EVS.caT = .22; if(EVS.cand.length < 46) spawnCandy(); }
    if(EVS.gdT <= 0){ EVS.gdT = Math.max(1.3, 2.4 - evT('candy') * .015); spawnDrop(); }
  }
  for(let i = EVS.cand.length - 1; i >= 0; i--){
    const c = EVS.cand[i];
    if(!c.ld){ c.vy -= 6 * dt; c.y += c.vy * dt; if(c.y <= c.land){ c.y = c.land; c.ld = 1; } }
    else { c.life -= dt; if(c.life <= 0){ EVS.cand.splice(i, 1); continue; } }
    for(const a of targets()) if(Math.abs(a.x - c.x) < 1 && Math.abs(a.z - c.z) < 1 && Math.hypot(a.x - c.x, a.z - c.z) < 1 && a.y - c.y < 1.4 && c.y - a.y < 1.6){ a.cand++; if(a === me){ SFX.candy(); candBump(); } burst(c.x, c.y + .3, c.z, 5, [c.col, 0xffffff], 1.8, .7, 6, 1, .6); EVS.cand.splice(i, 1); break; }
  }
  for(let i = EVS.drop.length - 1; i >= 0; i--){
    const d = EVS.drop[i];
    if(!d.hit){
      d.t -= dt;
      if(d.t <= 0){ d.hit = 1; d.life = 1.3; gumHit(d); for(const a of targets()) if(Math.hypot(a.x - d.x, a.z - d.z) < 1.6 && a.y < d.y + 1.5 && a.y > d.y - .6) catchActor(a, 'candy'); }
    } else { d.life -= dt; if(d.life <= 0) EVS.drop.splice(i, 1); }
  }
  if(!evOn('candy')) for(let i = EVS.drop.length - 1; i >= 0; i--) if(!EVS.drop[i].hit) EVS.drop.splice(i, 1);
  /* 🫧 bubbles drift around low over the ground */
  if(evOn('bubble')){
    EVS.buT = (EVS.buT || 0) - dt;
    if(EVS.buT <= 0){ EVS.buT = .65; if(EVS.bub.length < Math.min(22, 7 + evT('bubble') * .35)) spawnBubble(); }
  }
  for(let i = EVS.bub.length - 1; i >= 0; i--){
    const b = EVS.bub[i];
    b.t += dt; b.a += Math.sin(b.t * .9 + b.ph) * dt * .8;
    const d = Math.hypot(b.x, b.z);
    if(d > 28.5) b.a += angDiff(Math.atan2(-b.z, -b.x), b.a) * Math.min(1, dt * 3);
    b.vx = Math.cos(b.a) * b.sp; b.vz = Math.sin(b.a) * b.sp;
    b.x += b.vx * dt; b.z += b.vz * dt; b.y = b.by + Math.sin(b.t * 1.4 + b.ph) * .35;
    const o = { x:b.x, z:b.z };
    if(pushOut(o, b.r * .85, b.y - b.r * .7 - STEP, b.r * 1.4) != null){ b.x = o.x; b.z = o.z; b.a += Math.PI * .6; }
    if(b.t > 24 || !evOn('bubble')){ bubPop(b); EVS.bub.splice(i, 1); continue; }
    for(const a of targets()){ const dx = a.x - b.x, dy = a.y + .65 - b.y, dz = a.z - b.z; if(dx * dx + dy * dy + dz * dz < (b.r + .32) ** 2){ catchActor(a, 'bubble'); bubPop(b); EVS.bub.splice(i, 1); break; } }
  }
  /* 🐸 frogs hop around and bump people (3 bumps = too dizzy) */
  for(const fr of EVS.frogs){
    if(fr.hop){
      const hp = fr.hop; hp.t += dt; const k = Math.min(1, hp.t / hp.d);
      fr.x = lerp(hp.x0, hp.x1, k); fr.z = lerp(hp.z0, hp.z1, k); fr.y = 4 * hp.h * k * (1 - k);
      if(k >= 1){ fr.hop = null; fr.y = 0; fr.wait = rr(.5, 1.3); frogLand(fr); }
    } else if(evOn('frog')){
      fr.wait -= dt;
      if(fr.wait <= 0){
        let tg = null;
        if(EVS.aggro || Math.random() < .5){
          let best = null, bd = 14 * 14;
          for(const a of targets()){ if(a.y > .4 || houseAt(a.x, a.z, -.3)) continue; const q = dist2(a, fr); if(q < bd){ bd = q; best = a; } }
          if(best){ const g = randomGround(best.x, best.z, .7, 8); if(g) tg = g; }
        }
        if(!tg) tg = randomGround(fr.x, fr.z, 7, 12);
        if(tg){ fr.hop = { x0:fr.x, z0:fr.z, x1:tg.x, z1:tg.z, t:0, d:.8, h:2.2 }; fr.f = Math.atan2(tg.x - fr.x, tg.z - fr.z); if(dist2(fr, me) < 200) SFX.boing(); }
        else fr.wait = .4;
      }
    }
  }
}
function spawnSnowball(){
  const a = Math.random() * Math.PI * 2, sx = Math.cos(a) * 31, sz = Math.sin(a) * 31;
  let tx = rr(-10, 10), tz = rr(-10, 10);
  if(EVS.aggro || Math.random() < .4){ const c = targets().filter(p => p.y < 1); if(c.length){ const p = EVS.aggro && alive(me) ? me : pick(c); tx = p.x + rr(-1.5, 1.5); tz = p.z + rr(-1.5, 1.5); } }
  const dx = tx - sx, dz = tz - sz, d = Math.hypot(dx, dz) || 1, sp = rr(6, 8.5);
  EVS.snow.push({ id:++EVS.id, x:sx, z:sz, vx:dx / d * sp, vz:dz / d * sp, r:rr(.9, 1.45), rot:0 });
}
const CANDY_COL = [0xff8fb1, 0xffc23d, 0x6cc4ff, 0x5ed6a0, 0xb99cff, 0xff8a65];
function spawnCandy(){
  const a = Math.random() * Math.PI * 2, d = Math.sqrt(Math.random()) * 26, x = Math.cos(a) * d, z = Math.sin(a) * d, land = topAt(x, z);
  EVS.cand.push({ id:++EVS.id, x, z, land, y:land + rr(12, 17), vy:-rr(3, 6), ld:0, life:14, col:pick(CANDY_COL) });
}
function spawnDrop(){
  let x, z;
  const c = targets().filter(p => !p.spec);
  if(c.length && (EVS.aggro || Math.random() < .55)){ const p = EVS.aggro && alive(me) ? me : pick(c); x = p.x + (EVS.aggro ? 0 : rr(-1.5, 1.5)); z = p.z + (EVS.aggro ? 0 : rr(-1.5, 1.5)); }
  else { const g = randomGround(0, 2, 24) || { x:0, z:2 }; x = g.x; z = g.z; }
  EVS.drop.push({ id:++EVS.id, x, z, y:topAt(x, z), t:1.6, hit:0, life:0, col:pick(CANDY_COL) });
}
function spawnBubble(){
  let x, z, a;
  if(Math.random() < .7){ const q = Math.random() * Math.PI * 2; x = Math.cos(q) * 28.5; z = Math.sin(q) * 28.5; a = q + Math.PI + rr(-.6, .6); }
  else { x = ISL.PZ.x + rr(-1, 1); z = ISL.PZ.z + rr(-1, 1); a = Math.random() * Math.PI * 2; }
  if(EVS.aggro && alive(me)){ x = me.x + 6; z = me.z; a = Math.PI; }
  EVS.bub.push({ id:++EVS.id, x, z, y:1, by:rr(.7, 1.5), r:rr(.75, 1.15), a, sp:rr(1.6, 2.8), t:0, ph:Math.random() * 6, vx:0, vz:0 });
}
function spawnFrogs(){
  EVS.frogs.length = 0;
  for(let i = 0; i < 6; i++){ const g = randomGround(0, 2, 22) || { x:rr(-5, 5), z:rr(-3, 7) }; EVS.frogs.push({ id:++EVS.id, x:g.x, y:0, z:g.z, f:Math.random() * 6, hop:null, wait:rr(.2, 1.5), s:rr(1.25, 1.6) }); }
}
function frogLand(fr){
  burst(fr.x, .2, fr.z, 6, [0x8fd06a, 0xffffff], 2, .6, 8, 1, .6);
  if(!evOn('frog') || !authority()) return;
  for(const a of targets()){
    if(Math.hypot(a.x - fr.x, a.z - fr.z) > 1.9 || a.y > 1.4 || houseAt(a.x, a.z, -.3)) continue;
    let dx = a.x - fr.x, dz = a.z - fr.z; const d = Math.hypot(dx, dz);
    if(d < .05){ const q = Math.random() * 6.28; dx = Math.cos(q); dz = Math.sin(q); } else { dx /= d; dz /= d; }
    a.dizzy++;
    if(a.kind === 'remote') mpSend('kn', { to:a.id, x:r2(dx * 8.5), z:r2(dz * 8.5), y:6, dz:a.dizzy });
    else { a.kx = dx * 8.5; a.kz = dz * 8.5; a.vy = 6; a.grounded = false; if(a === me){ SFX.boing(); pop('🐸 ' + '🌀'.repeat(Math.min(3, a.dizzy))); } }
    if(a.dizzy >= 3) catchActor(a, 'frog');
  }
}
function snowPuff(b){ burst(b.x, b.r, b.z, 18, [0xffffff, 0xe6f6ff, 0xcfeeff], 4, 1.4, 10, 2); if(dist2(b, me) < 300) SFX.crunch(); }
function gumHit(d){ burst(d.x, d.y + .4, d.z, 20, [d.col, 0xffffff], 4, 1.2, 10, 2); if(dist2(d, me) < 300) SFX.bloop(); }
function bubPop(b){ burst(b.x, b.y, b.z, 12, [0xd9f6ff, 0xffffff], 2.5, .9, 3, 1, .8); if(dist2(b, me) < 200) SFX.pop(); }

/* ======================================================================
   Hazard visuals (host and guests draw the same lists)
   ====================================================================== */
const MATV = new THREE.MeshStandardMaterial({ vertexColors:true, roughness:.6 });
const snowGeo = new THREE.IcosahedronGeometry(1, 2), snowMat = new THREE.MeshStandardMaterial({ color:0xf4fbff, roughness:.9, flatShading:true });
const snowPool = Array.from({ length:12 }, () => { const m = new THREE.Mesh(snowGeo, snowMat); m.castShadow = true; m.visible = false; scene.add(m); return m; });
const candyGeo = (() => { const M = new Merge(); M.add(GEO.sm, 0, 0, 0, .2, .17, .17, 0, 0, 0, 0xffffff); M.add(GEO.cone4, .27, 0, 0, .12, .18, .12, 0, 0, Math.PI / 2, 0xffffff); M.add(GEO.cone4, -.27, 0, 0, .12, .18, .12, 0, 0, -Math.PI / 2, 0xffffff); return M.geometry(); })();
const candyMesh = new THREE.InstancedMesh(candyGeo, new THREE.MeshStandardMaterial({ roughness:.35, emissive:0x331122, emissiveIntensity:.2 }), 60);
candyMesh.frustumCulled = false; candyMesh.castShadow = true; scene.add(candyMesh);
for(let i = 0; i < 60; i++) candyMesh.setColorAt(i, _c.set(0xffffff));
const gumGeo = new THREE.SphereGeometry(1, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2);
const gumPool = Array.from({ length:8 }, () => { const m = new THREE.Mesh(gumGeo, new THREE.MeshStandardMaterial({ color:0xff8fb1, roughness:.25, transparent:true, opacity:.92 })); m.castShadow = true; m.visible = false; scene.add(m); return m; });
const ringPool = Array.from({ length:8 }, () => { const m = new THREE.Mesh(new THREE.RingGeometry(1.15, 1.6, 32), new THREE.MeshBasicMaterial({ color:0xff5d8f, transparent:true, opacity:.7, depthWrite:false, side:THREE.DoubleSide })); m.rotation.x = -Math.PI / 2; m.visible = false; m.renderOrder = 2; scene.add(m); return m; });
const bubMesh = new THREE.InstancedMesh(bubbleGeo, new THREE.MeshStandardMaterial({ color:0xc9f3ff, roughness:.05, metalness:.15, transparent:true, opacity:.38, emissive:0x8fe6ff, emissiveIntensity:.3, depthWrite:false }), 24);
bubMesh.frustumCulled = false; bubMesh.renderOrder = 3; scene.add(bubMesh);
const shineMesh = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 8, 6), new THREE.MeshBasicMaterial({ color:0xffffff, transparent:true, opacity:.85 }), 24);
shineMesh.frustumCulled = false; scene.add(shineMesh);
const frogGeo = (() => {
  const M = new Merge(), G2 = 0x5fc24a, B = 0xc8f08a;
  M.add(GEO.sph, 0, .38, 0, .55, .4, .6, 0, 0, 0, G2); M.add(GEO.sph, 0, .3, .2, .42, .26, .42, 0, 0, 0, B);
  for(const s of [-1, 1]){
    M.add(GEO.sph, s * .25, .78, .22, .17, .17, .17, 0, 0, 0, G2); M.add(GEO.sm, s * .27, .84, .33, .1, .1, .07, 0, 0, 0, 0xffffff); M.add(GEO.sm, s * .28, .85, .39, .05, .06, .03, 0, 0, 0, 0x222222);
    M.add(GEO.sph, s * .45, .18, -.2, .22, .18, .38, 0, 0, 0, G2); M.add(GEO.sph, s * .5, .06, .1, .18, .06, .22, 0, 0, 0, G2); M.add(GEO.sph, s * .3, .1, .45, .1, .1, .15, 0, 0, 0, G2);
  }
  M.add(GEO.box, 0, .5, .58, .3, .03, .04, 0, 0, 0, 0x2b6d2b);
  return M.geometry();
})();
const frogPool = Array.from({ length:8 }, () => { const m = new THREE.Mesh(frogGeo, MATV); m.castShadow = true; m.visible = false; scene.add(m); return m; });
const FL_N = 140, flakes = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(.07, 0), new THREE.MeshBasicMaterial({ color:0xffffff }), FL_N);
flakes.frustumCulled = false; flakes.visible = false; scene.add(flakes);
const flk = Array.from({ length:FL_N }, () => ({ x:rr(-18, 18), y:rr(0, 14), z:rr(-18, 18), s:rr(.6, 1.4) }));
const WS_N = 50, streaks = new THREE.InstancedMesh(new THREE.BoxGeometry(.04, .04, 2.6), new THREE.MeshBasicMaterial({ color:0xffffff, transparent:true, opacity:.55, depthWrite:false }), WS_N);
streaks.frustumCulled = false; streaks.visible = false; scene.add(streaks);
const wst = Array.from({ length:WS_N }, () => ({ x:rr(-20, 20), y:rr(.3, 5), z:rr(-20, 20), s:rr(.7, 1.3) }));
let prevWg = 0;
const TINT = { water:0xd9f1ff, wind:0xe4ecf2, snow:0xf0f8ff, candy:0xffe3ee, bubble:0xdcfbff, frog:0xe9ffdc, lava:0xffdcc4 };
const tintC = new THREE.Color(), fogT = new THREE.Color();
function hazardVisuals(dt, cx, cz){
  // sea level, lava sheet
  ISL.sea.position.y = EVS.wl; ISL.seaTex.offset.set(T * .01, T * .006);
  ISL.lava.visible = EVS.lava > .01; ISL.lava.material.opacity = EVS.lava * (.82 + Math.sin(T * 3) * .08); ISL.lavaTex.offset.set(T * .015, -T * .01);
  // snowballs
  for(let i = 0; i < snowPool.length; i++){ const m = snowPool[i], b = EVS.snow[i]; m.visible = !!b; if(b){ m.position.set(b.x, b.r * .92, b.z); m.scale.setScalar(b.r); m.rotation.set(0, Math.atan2(b.vx, b.vz), 0); m.rotateX(b.rot); } }
  // candies
  let n = 0;
  for(const c of EVS.cand){ if(n >= 60) break; _m.compose(_v.set(c.x, c.y + .22 + (c.ld ? Math.sin(T * 3 + c.id) * .05 : 0), c.z), _q.setFromEuler(_e.set(0, T * 2 + c.id, c.ld ? .3 : T * 5)), _s.set(1.3, 1.3, 1.3)); candyMesh.setMatrixAt(n, _m); candyMesh.setColorAt(n, _c.set(c.col)); n++; }
  candyMesh.count = n; candyMesh.instanceMatrix.needsUpdate = true; if(candyMesh.instanceColor) candyMesh.instanceColor.needsUpdate = true;
  // gumdrops + their warning rings
  for(let i = 0; i < gumPool.length; i++){
    const m = gumPool[i], rg = ringPool[i], d = EVS.drop[i];
    m.visible = rg.visible = !!d; if(!d) continue;
    if(m.material.color.getHex() !== d.col) m.material.color.set(d.col);
    rg.position.set(d.x, d.y + .06, d.z); rg.visible = !d.hit; rg.material.opacity = .45 + Math.sin(T * 14) * .3; rg.scale.setScalar(1 + Math.max(0, d.t) * .25);
    if(!d.hit){ const y = d.y + Math.max(0, d.t) * 9; m.position.set(d.x, y, d.z); m.scale.set(1.3, 1.6, 1.3); }
    else { const k = clamp(d.life / 1.3, 0, 1); m.position.set(d.x, d.y, d.z); m.scale.set(1.6 + (1 - k) * .3, .9 * k + .05, 1.6 + (1 - k) * .3); }
  }
  // bubbles
  n = 0;
  for(const b of EVS.bub){ if(n >= 24) break; const w = 1 + Math.sin(T * 4 + b.ph) * .04; _m.compose(_v.set(b.x, b.y, b.z), _q.identity(), _s.set(b.r * w, b.r / w, b.r * w)); bubMesh.setMatrixAt(n, _m); _m.compose(_v.set(b.x - b.r * .35, b.y + b.r * .45, b.z + b.r * .3), _q.identity(), _s.setScalar(b.r * .14)); shineMesh.setMatrixAt(n, _m); n++; }
  bubMesh.count = shineMesh.count = n; bubMesh.instanceMatrix.needsUpdate = shineMesh.instanceMatrix.needsUpdate = true;
  // frogs
  for(let i = 0; i < frogPool.length; i++){ const m = frogPool[i], fr = EVS.frogs[i]; m.visible = !!fr; if(!fr) continue; const air = fr.y > .05; m.position.set(fr.x, fr.y, fr.z); m.rotation.set(air ? -.3 : 0, fr.f, 0); const sq = air ? 1.15 : 1 - Math.abs(Math.sin(T * 6 + i)) * .06; m.scale.set(fr.s / Math.sqrt(sq), fr.s * sq, fr.s / Math.sqrt(sq)); }
  // falling snow around the camera target
  const sn = activeEvs().includes('snow');
  flakes.visible = sn;
  if(sn){ for(let i = 0; i < FL_N; i++){ const f = flk[i]; f.y -= dt * 2.2 * f.s; f.x += Math.sin(T + i) * dt * .4; if(f.y < 0){ f.y = 14; f.x = rr(-18, 18); f.z = rr(-18, 18); } _m.compose(_v.set(cx + f.x, f.y, cz + f.z), _q.identity(), _s.setScalar(f.s)); flakes.setMatrixAt(i, _m); } flakes.instanceMatrix.needsUpdate = true; }
  // wind streaks
  const wv = EVS.wg > .08 && RS.ph === 'run';
  streaks.visible = wv;
  if(wv){ const dx = Math.sin(EVS.wa), dz = Math.cos(EVS.wa), sp = windSpeed() * 2.4; _q.setFromEuler(_e.set(0, EVS.wa, 0)); for(let i = 0; i < WS_N; i++){ const s = wst[i]; s.x += dx * sp * dt * s.s; s.z += dz * sp * dt * s.s; if(Math.abs(s.x) > 20 || Math.abs(s.z) > 20){ s.x = -dx * 19 + rr(-12, 12) * Math.abs(dz) + rr(-3, 3); s.z = -dz * 19 + rr(-12, 12) * Math.abs(dx) + rr(-3, 3); } _m.compose(_v.set(cx + s.x, s.y, cz + s.z), _q, _s.set(1, 1, s.s * EVS.wg)); streaks.setMatrixAt(i, _m); } streaks.instanceMatrix.needsUpdate = true; streaks.material.opacity = .25 + EVS.wg * .45; }
  if(EVS.wg > .15 && prevWg <= .15) SFX.whoosh();
  prevWg = EVS.wg;
  // water splashes around anyone wading
  if(EVS.wl > WL_BASE + .2) for(const a of ACT.values()) if(alive(a) && a.y < EVS.wl && a.y > EVS.wl - 1.6 && a.m > .2 && Math.random() < dt * 8) burst(a.x, EVS.wl + .05, a.z, 2, [0xbfe9ff, 0xffffff], 1.6, .8, 9, 1.5, .5);
  // lava sparkles under hot feet
  if(EVS.lava > .5) for(const a of ACT.values()) if(alive(a) && a.hotT > 0 && Math.random() < dt * 10) burst(a.x, LAVA_Y + .1, a.z, 2, [0xffd23f, 0xff7a1a], 1.2, .7, 2, 2, .5);
  // mood tint
  const k1 = activeEvs()[0] || (RS.ph === 'warn' ? null : null);
  tintC.set(k1 ? TINT[k1] : 0xfff4e2); hemi.color.lerp(tintC, Math.min(1, dt * 1.5));
  fogT.copy(FOG0); if(k1) fogT.lerp(tintC, .5); scene.fog.color.lerp(fogT, Math.min(1, dt * 1.5));
  ISL.clouds.rotation.y += dt * .004;
}

/* ======================================================================
   Bots: fill the round; simple survival per event (go high, perch, shelter, hide, collect, dodge)
   ====================================================================== */
const EMOS = ['👏', '😂', '🎉', '❤️', '👋'];
function newAI(skill){ return { skill:skill != null ? skill : rr(.45, .95), goal:null, path:[], pi:0, think:0, react:0, key:'', stuckT:0, lastD:1e9, stuckN:0, detour:0, ds:1, jump:false, claim:null }; }
function fillBots(){
  const humans = [...ACT.values()].filter(a => a.kind !== 'bot').length;
  const want = Math.max(0, NPLAY - humans);
  const bots = [...ACT.values()].filter(a => a.kind === 'bot');
  for(let i = bots.length - 1; i >= want; i--) dropActor(bots[i].id);
  const used = new Set([...ACT.values()].map(a => a.hero));
  for(let i = 0; i < want; i++){
    const id = 'b' + i; if(ACT.has(id)) continue;
    const free = HERO_IDS.filter(h => !used.has(h)), hero = pick(free.length ? free : HERO_IDS); used.add(hero);
    const b = mkActor(id, 'bot', hero); b.ai = newAI(); placeAt(b, spawns[(i + 2) % spawns.length], 0);
  }
}
function segBox(ax, az, bx, bz, x0, x1, z0, z1){
  let t0 = 0, t1 = 1; const dx = bx - ax, dz = bz - az;
  for(const [p, q] of [[-dx, ax - x0], [dx, x1 - ax], [-dz, az - z0], [dz, z1 - az]]){
    if(Math.abs(p) < 1e-9){ if(q < 0) return false; continue; }
    const r = q / p; if(p < 0){ if(r > t1) return false; if(r > t0) t0 = r; } else { if(r < t0) return false; if(r < t1) t1 = r; }
  }
  return true;
}
/* go around houses: up to two corner points */
function detour(from, to){
  for(const h of houses){
    const pad = .55;
    if(from.x > h.x0 - .1 && from.x < h.x1 + .1 && from.z > h.z0 - .1 && from.z < h.z1 + .1) continue;
    if(to.x > h.x0 && to.x < h.x1 && to.z > h.z0 && to.z < h.z1) continue;
    if(!segBox(from.x, from.z, to.x, to.z, h.x0 - pad, h.x1 + pad, h.z0 - pad, h.z1 + pad)) continue;
    const o = 1.4, C = [{ x:h.x0 - o, z:h.z0 - o }, { x:h.x1 + o, z:h.z0 - o }, { x:h.x1 + o, z:h.z1 + o }, { x:h.x0 - o, z:h.z1 + o }];
    const vis = (p, q) => !segBox(p.x, p.z, q.x, q.z, h.x0 - .3, h.x1 + .3, h.z0 - .3, h.z1 + .3);
    let best = null, bl = 1e9;
    for(let i = 0; i < 4; i++){
      const c = C[i]; if(!vis(from, c)) continue;
      if(vis(c, to)){ const l = Math.hypot(c.x - from.x, c.z - from.z) + Math.hypot(to.x - c.x, to.z - c.z); if(l < bl){ bl = l; best = [c]; } }
      else for(const j of [(i + 1) % 4, (i + 3) % 4]){ const c2 = C[j]; if(!vis(c2, to)) continue; const l = Math.hypot(c.x - from.x, c.z - from.z) + Math.hypot(c2.x - c.x, c2.z - c.z) + Math.hypot(to.x - c2.x, to.z - c2.z); if(l < bl){ bl = l; best = [c, c2]; } }
    }
    if(best) return best;
  }
  return [];
}
function mkPath(b, pts){ if(!pts.length) return []; return detour({ x:b.x, z:b.z }, pts[0]).concat(pts); }
function setGoal(b, kind, pts, extra){ const ai = b.ai; if(ai.claim){ ai.claim.claim = null; ai.claim = null; } ai.goal = Object.assign({ kind }, extra || {}); ai.path = mkPath(b, pts); ai.pi = 0; ai.stuckN = 0; ai.lastD = 1e9; ai.stuckT = 0; }
function highGoal(b, minY){
  if(b.grounded && b.y >= minY - .05) return setGoal(b, 'stay', []);
  let best = null, bs = 1e9;
  for(const h of highs){
    if(h.y < minY) continue;
    const p0 = h.route ? h.route[0] : h, s = Math.hypot(p0.x - b.x, p0.z - b.z) + rr(0, 7) + (h.kind === 'tower' ? 7 : 0) + (h.kind === 'roof' ? 2 : 0);
    if(s < bs){ bs = s; best = h; }
  }
  if(!best) return wanderGoal(b);
  let pts;
  if(best.route) pts = best.route.map(p => ({ x:p.x, z:p.z }));
  else { const a = Math.atan2(b.z - best.z, b.x - best.x) + rr(-.4, .4), r = best.ring ? best.r : rr(0, .4); pts = [{ x:best.x + Math.cos(a) * r, z:best.z + Math.sin(a) * r }]; }
  setGoal(b, 'high', pts, { y:best.y });
}
function houseGoal(b){
  let best = null, bd = 1e9;
  for(const h of houses){ const d = Math.hypot(h.door.x - b.x, h.door.z - b.z) + rr(0, 4); if(d < bd){ bd = d; best = h; } }
  if(houseAt(b.x, b.z, .3)) return setGoal(b, 'stay', []);
  setGoal(b, 'house', [best.door, { x:best.inside.x + rr(-.6, .6), z:best.inside.z + rr(-.8, .8) }]);
}
function perchGoal(b, minY){
  let best = null, bs = 1e9;
  for(const p of perches){
    if(p.y < minY || (p.claim && p.claim !== b.id && ACT.has(p.claim))) continue;
    if([...ACT.values()].some(a => a !== b && !a.out && Math.abs(a.y - p.y) < .3 && Math.hypot(a.x - p.x, a.z - p.z) < p.r + .6)) continue;
    const s = Math.hypot(p.x - b.x, p.z - b.z) + rr(0, 3) + (p.y > 1.1 ? 1.5 : 0);
    if(s < bs){ bs = s; best = p; }
  }
  if(!best) return highGoal(b, minY);
  setGoal(b, 'perch', [{ x:best.x, z:best.z }], { y:best.y }); best.claim = b.id; b.ai.claim = best;
}
function shelterGoal(b){
  const wx = Math.sin(EVS.wa), wz = Math.cos(EVS.wa);
  let best = null, bs = 1e9;
  for(const s of shelters){
    const ext = s.round ? s.r : s.hx * Math.abs(wx) + s.hz * Math.abs(wz);
    const p = { x:s.x + wx * (ext + .75), z:s.z + wz * (ext + .75) };
    if(!inIsland(p.x, p.z) || pointSolid(p.x, .6, p.z)) continue;
    const sc = Math.hypot(p.x - b.x, p.z - b.z) + rr(0, 2) - (s.round ? 0 : 1);
    if(sc < bs){ bs = sc; best = p; }
  }
  if(!best) return houseGoal(b);
  setGoal(b, 'shelter', [best]);
}
function candyGoal(b){
  let best = null, bd = 1e9;
  for(const c of EVS.cand){ if(!c.ld || c.y > b.y + 1.2 || c.y < b.y - 2) continue; if(EVS.drop.some(d => !d.hit && Math.hypot(d.x - c.x, d.z - c.z) < 2.2)) continue; const q = Math.hypot(c.x - b.x, c.z - b.z); if(q < bd){ bd = q; best = c; } }
  if(!best) return wanderGoal(b);
  setGoal(b, 'candy', [{ x:best.x, z:best.z }]); b.ai.think = .6;
}
function wanderGoal(b){ const g = randomGround(ISL.PZ.x, ISL.PZ.z, 9, 10) || { x:rr(-4, 4), z:rr(-2, 6) }; setGoal(b, 'wander', [g]); b.ai.think = rr(2.5, 5); }
function chooseGoal(b){
  const ai = b.ai, evs = RS.ev.filter(evSoon);
  ai.think = 999;
  if(RS.ph === 'end' || RS.ph === 'idle' || !evs.length) return wanderGoal(b);
  if(Math.random() < (1 - ai.skill) * .3) return wanderGoal(b);           // a silly moment
  const has = k => evs.includes(k);
  if(has('water') || has('bubble')) return highGoal(b, 2.7);
  if(has('frog')) return Math.random() < .65 ? houseGoal(b) : highGoal(b, 3);
  if(has('lava')) return perchGoal(b, .3);
  if(has('snow')) return Math.random() < .55 ? perchGoal(b, .85) : highGoal(b, 1.8);
  if(has('wind')) return shelterGoal(b);
  if(has('candy')) return candyGoal(b);
  return wanderGoal(b);
}
/* reflexes: step away from snowballs, bubbles, gumdrop rings and frogs */
function dodge(b){
  let fx = 0, fz = 0;
  for(const s of EVS.snow){
    const sp = Math.hypot(s.vx, s.vz) || 1, ux = s.vx / sp, uz = s.vz / sp, rx = b.x - s.x, rz = b.z - s.z, along = rx * ux + rz * uz, lat = rx * uz - rz * ux;
    if(along > -1 && along < 9 && Math.abs(lat) < s.r + 1.4 && b.y < s.r * 1.2){ const side = lat >= 0 ? 1 : -1; fx += uz * side * 2.2; fz += -ux * side * 2.2; }
  }
  for(const s of EVS.bub){ const dx = b.x - s.x, dz = b.z - s.z, d = Math.hypot(dx, dz); if(d < s.r + 2.4 && Math.abs(b.y + .65 - s.y) < s.r + 1.2){ fx += dx / (d || 1) * 1.6; fz += dz / (d || 1) * 1.6; } }
  for(const s of EVS.drop){ if(s.hit) continue; const dx = b.x - s.x, dz = b.z - s.z, d = Math.hypot(dx, dz); if(d < 2.5 && Math.abs(b.y - s.y) < 1.5){ fx += dx / (d || 1) * 2.5; fz += dz / (d || 1) * 2.5; } }
  for(const s of EVS.frogs){ const dx = b.x - s.x, dz = b.z - s.z, d = Math.hypot(dx, dz); if(d < 2.8 && b.y < 1.2 && !houseAt(b.x, b.z, -.3)){ fx += dx / (d || 1) * 1.2; fz += dz / (d || 1) * 1.2; } }
  return { fx, fz };
}
const botIn = { x:0, z:0, j:false };
function botCtl(b, dt){
  const ai = b.ai; botIn.x = botIn.z = 0; botIn.j = false;
  if(b.fl) return botIn;
  if(b.out){
    b.cheerT -= dt;
    if(b.cheerT <= 0){ b.cheerT = rr(2.5, 6); if(RS.ph === 'run' || RS.ph === 'end'){ showEmote(b, pick(EMOS)); if(mpActive() && MP.isHost) mpSend('em', { w:b.id, e:b.lastEmo }); botIn.j = true; } }
    return botIn;
  }
  const key = RS.ph + ':' + RS.ev.filter(evSoon).join(',') + (evOn('wind') ? ':' + Math.round(EVS.wa * 2) : '');
  const nSoon = RS.ev.filter(evSoon).length;
  if(key !== ai.key){ const fresh = nSoon > (ai.nSoon || 0); ai.key = key; ai.nSoon = nSoon; ai.react = fresh ? rr(.4, 3) * (1.5 - ai.skill) : rr(.1, .8); ai.goal = null; }
  if(ai.react > 0) ai.react -= dt;
  else { ai.think -= dt; if(!ai.goal || ai.think <= 0 || (ai.goal.kind === 'candy' && ai.pi >= ai.path.length)) chooseGoal(b); }
  const wp = ai.path[ai.pi];
  if(wp){
    let dx = wp.x - b.x, dz = wp.z - b.z; const d = Math.hypot(dx, dz), last = ai.pi === ai.path.length - 1;
    if(d < (last ? .3 : .55)){ ai.pi++; ai.lastD = 1e9; ai.stuckT = 0; }
    else {
      const sp = last ? clamp(d * 1.6, .25, 1) : 1;
      dx /= d; dz /= d;
      ai.stuckT += dt;
      if(ai.stuckT > .8){ if(ai.lastD - d < .3){ ai.detour = .7; ai.ds = Math.random() < .5 ? 1 : -1; ai.stuckN++; botIn.j = true; } ai.lastD = d; ai.stuckT = 0; }
      if(ai.stuckN > 6){ ai.goal = null; ai.think = 0; ai.stuckN = 0; }
      if(ai.detour > 0){ ai.detour -= dt; const c = Math.cos(1.25 * ai.ds), s = Math.sin(1.25 * ai.ds); const nx = dx * c - dz * s, nz = dx * s + dz * c; dx = nx; dz = nz; }
      botIn.x = dx * sp; botIn.z = dz * sp;
    }
  }
  if(ai.skill > .5 || Math.random() < ai.skill){
    const dg = dodge(b);
    if(dg.fx || dg.fz){ botIn.x += dg.fx; botIn.z += dg.fz; const m = Math.hypot(botIn.x, botIn.z); if(m > 1){ botIn.x /= m; botIn.z /= m; } }
  }
  return botIn;
}

/* ======================================================================
   Input (joystick on the left, drag to look, big jump button), camera
   ====================================================================== */
let T = 0, state = 'menu', jumpQ = false;
const joy = { x:0, y:0, id:null, ox:0, oy:0 }, look = { id:null, x:0, y:0, sx:0, sy:0 }, keys = {};
const joyEl = $('#joy'), knob = $('#knob'), jumpBtn = $('#btnJump'), touch = $('#touch');
let joyHome = [90, 0];
function placeJoyHome(){ joyHome = [Math.max(84, SAL + 78), SH - Math.max(92, SH * .16) - SAB * .5]; if(joy.id == null) setJoy(joyHome[0], joyHome[1]); }
function setJoy(x, y){ joyEl.style.left = x + 'px'; joyEl.style.top = y + 'px'; }
touch.addEventListener('pointerdown', e => {
  e.preventDefault(); ac();
  const p = toLayer(e.clientX, e.clientY);
  if(state !== 'play') return;
  if(p.x < SW * .32 && p.y > SH * .28 && joy.id == null){
    joy.id = e.pointerId; joy.ox = clamp(p.x, Math.max(70, SAL + 64), SW * .3); joy.oy = clamp(p.y, 140, SH - 70);
    setJoy(joy.ox, joy.oy); joyEl.classList.add('on'); moveJoy(p.x, p.y);
  } else if(look.id == null){ look.id = e.pointerId; look.sx = look.x = p.x; look.sy = look.y = p.y; }
  try{ touch.setPointerCapture(e.pointerId); }catch(err){}
});
function moveJoy(x, y){
  let dx = x - joy.ox, dy = y - joy.oy; const d = Math.hypot(dx, dy), m = 52;
  if(d > m){ dx *= m / d; dy *= m / d; }
  knob.style.transform = `translate(${dx}px,${dy}px)`;
  joy.x = dx / m; joy.y = dy / m;
}
touch.addEventListener('pointermove', e => {
  const p = toLayer(e.clientX, e.clientY);
  if(e.pointerId === joy.id) moveJoy(p.x, p.y);
  else if(e.pointerId === look.id && state === 'play'){ cam.yaw -= (p.x - look.x) * .0075; cam.pAdj = clamp(cam.pAdj + (p.y - look.y) * .004, -.35, .55); look.x = p.x; look.y = p.y; }
});
function endPtr(e){
  if(e.pointerId === joy.id){ joy.id = null; joy.x = joy.y = 0; knob.style.transform = ''; joyEl.classList.remove('on'); setJoy(...joyHome); }
  if(e.pointerId === look.id) look.id = null;
}
touch.addEventListener('pointerup', endPtr); touch.addEventListener('pointercancel', endPtr);
jumpBtn.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); ac(); jumpBtn.classList.add('on'); jumpQ = true; });
['pointerup', 'pointercancel', 'pointerleave'].forEach(t => jumpBtn.addEventListener(t, () => jumpBtn.classList.remove('on')));
const KEYMAP = { KeyW:'f', ArrowUp:'f', KeyS:'b', ArrowDown:'b', KeyA:'l', ArrowLeft:'l', KeyD:'r', ArrowRight:'r', KeyQ:'cl', KeyE:'cr' };
addEventListener('keydown', e => {
  if(KEYMAP[e.code]){ keys[KEYMAP[e.code]] = true; e.preventDefault(); }
  if(e.code === 'Space' && state === 'play' && !e.repeat){ jumpQ = true; e.preventDefault(); }
  if((e.code === 'Escape' || e.code === 'KeyP') && state === 'play') showPause();
});
addEventListener('keyup', e => { if(KEYMAP[e.code]) keys[KEYMAP[e.code]] = false; });
addEventListener('blur', () => { for(const k in keys) keys[k] = false; });
function clearInput(){ joy.id = null; joy.x = joy.y = 0; look.id = null; knob.style.transform = ''; joyEl.classList.remove('on'); for(const k in keys) keys[k] = false; jumpQ = false; }
const inp = { x:0, z:0 };
function readInput(dt){
  let ix = joy.x + (keys.r ? 1 : 0) - (keys.l ? 1 : 0), iy = joy.y + (keys.b ? 1 : 0) - (keys.f ? 1 : 0);
  let m = Math.hypot(ix, iy); if(m > 1){ ix /= m; iy /= m; m = 1; } if(m < .12){ ix = iy = 0; }
  if(keys.cl) cam.yaw += 2.2 * dt; if(keys.cr) cam.yaw -= 2.2 * dt;
  const fx = -Math.sin(cam.yaw), fz = -Math.cos(cam.yaw), rx = Math.cos(cam.yaw), rz = -Math.sin(cam.yaw);
  inp.x = rx * ix - fx * iy; inp.z = rz * ix - fz * iy;
}
const cam = { yaw:0, pitch:.5, dist:10.5, pAdj:0 };
let snapCam = true, closeup = null;
const camPos = new THREE.Vector3(), camLook = new THREE.Vector3(), camTgt = new THREE.Vector3();
function updateCamera(dt){
  if(closeup){ camPos.lerp(_v.set(closeup.px, closeup.py, closeup.pz), 1 - Math.exp(-5 * dt)); camLook.lerp(_s.set(closeup.lx, closeup.ly, closeup.lz), 1 - Math.exp(-6 * dt)); camera.position.copy(camPos); camera.lookAt(camLook); return; }
  const inH = !me.spec && !me.fl && houseAt(me.x, me.z, .2) && me.y < 3;
  const wantD = me.spec || me.fl ? 13 : inH ? 7.2 : 10.5, wantP = clamp((me.spec ? .4 : inH ? .98 : .5) + cam.pAdj, .12, 1.3);
  const k = snapCam ? 1 : 1 - Math.exp(-4 * dt);
  cam.dist = lerp(cam.dist, wantD, k); cam.pitch = lerp(cam.pitch, wantP, k);
  _s.set(me.x, me.y + 1.1, me.z);
  if(snapCam) camTgt.copy(_s); else camTgt.lerp(_s, 1 - Math.exp(-10 * dt));
  const dx = Math.sin(cam.yaw) * Math.cos(cam.pitch), dy = Math.sin(cam.pitch), dz = Math.cos(cam.yaw) * Math.cos(cam.pitch);
  _v.set(camTgt.x + dx * cam.dist, camTgt.y + dy * cam.dist, camTgt.z + dz * cam.dist);
  _v.y = Math.max(_v.y, Math.max(.6, EVS.wl + .4));
  if(snapCam){ camPos.copy(_v); snapCam = false; } else camPos.lerp(_v, 1 - Math.exp(-10 * dt));
  camLook.copy(camTgt);
  camera.position.copy(camPos); camera.lookAt(camLook);
}
/* houses fade (and lose their roof) when you are inside or they hide you */
function segAABB3(p, q, b){
  let t0 = 0, t1 = 1;
  for(const [a, bb, lo, hi] of [[p.x, q.x, b.x0, b.x1], [p.y, q.y, 0, 3.4], [p.z, q.z, b.z0, b.z1]]){
    const d = bb - a;
    if(Math.abs(d) < 1e-9){ if(a < lo || a > hi) return false; continue; }
    let u0 = (lo - a) / d, u1 = (hi - a) / d; if(u0 > u1){ const t = u0; u0 = u1; u1 = t; }
    t0 = Math.max(t0, u0); t1 = Math.min(t1, u1); if(t0 > t1) return false;
  }
  return true;
}
function houseFades(dt){
  const chest = { x:me.x, y:me.y + .8, z:me.z };
  for(const h of houses){
    const inside = !me.spec && me.x > h.x0 && me.x < h.x1 && me.z > h.z0 && me.z < h.z1 && me.y < 3;
    const hide = state !== 'menu' && (inside || segAABB3(camera.position, chest, h));
    h.fade = clamp(h.fade + (hide ? dt * 4 : -dt * 3), 0, 1);
    const op = 1 - h.fade * .78, tr = h.fade > .01;
    if(h.wallMat.transparent !== tr){ h.wallMat.transparent = tr; h.wallMat.needsUpdate = true; }
    h.wallMat.opacity = op; h.wallMat.depthWrite = !tr;
    h.roof.visible = h.fade < .5;
    h.walls.castShadow = true;
  }
}

/* ======================================================================
   Aunt Laila, pop-ups, tags over heads (emotes, water/lava/dizzy)
   ====================================================================== */
const guideEl = $('#guide'), guideT = $('#guideT');
let sayTO = 0;
function say(text, ms = 4200, top = false){
  clearTimeout(sayTO); guideT.textContent = text; guideEl.classList.toggle('top', top);
  guideEl.hidden = false; guideEl.style.animation = 'none'; void guideEl.offsetWidth; guideEl.style.animation = '';
  sayTO = setTimeout(() => { guideEl.hidden = true; }, ms);
}
function hush(){ clearTimeout(sayTO); guideEl.hidden = true; }
const popEl = $('#pop');
function pop(text){ popEl.textContent = text; popEl.classList.remove('go'); void popEl.offsetWidth; popEl.classList.add('go'); }
const tagsEl = $('#tags'), emos = [];
function screenOf(x, y, z){ _v.set(x, y, z).project(camera); return { x:(_v.x * .5 + .5) * SW, y:(-_v.y * .5 + .5) * SH, ok:_v.z < 1 }; }
function showEmote(a, e){
  if(!a || !EMOS.includes(e)) return;
  a.lastEmo = e;
  const el = document.createElement('i'); el.className = 'ttag emo'; el.textContent = e; tagsEl.appendChild(el);
  emos.push({ el, a, t:2 });
  if(emos.length > 14){ const o = emos.shift(); o.el.remove(); }
  if(a === me || dist2(a, me) < 400) tone(880 + Math.random() * 400, .08, 'sine', .06);
}
function myEmote(e){ if(!me) return; showEmote(me, e); jumpQ = true; if(mpActive()) mpSend('em', { e }); }
document.querySelectorAll('#emoBar button').forEach(b => b.addEventListener('pointerdown', ev => { ev.preventDefault(); ev.stopPropagation(); ac(); myEmote(b.dataset.e); }));
let meTag = null;
function tagsFrame(dt){
  for(let i = emos.length - 1; i >= 0; i--){
    const o = emos[i]; o.t -= dt;
    if(o.t <= 0 || !ACT.has(o.a.id)){ o.el.remove(); emos.splice(i, 1); continue; }
    const p = screenOf(o.a.x, o.a.y + 2.1, o.a.z);
    o.el.style.transform = `translate(${p.x}px,${p.y}px) translate(-50%,-100%)`; o.el.style.visibility = p.ok ? '' : 'hidden';
  }
  // my meter: 💧 / 🔥 / 🌀
  const txt = !me || !alive(me) || state !== 'play' ? '' : me.wetT > .05 ? '💧 ' + '●'.repeat(1 + Math.floor(me.wetT / .4)) : me.hotT > .05 ? '🔥 ' + '●'.repeat(1 + Math.floor(me.hotT / .37)) : me.dizzy > 0 && evOn('frog') ? '🌀'.repeat(Math.min(3, me.dizzy)) : '';
  if(txt){
    if(!meTag){ meTag = document.createElement('span'); meTag.className = 'ttag me'; tagsEl.appendChild(meTag); }
    if(meTag.textContent !== txt) meTag.textContent = txt;
    const p = screenOf(me.x, me.y + 1.9, me.z); meTag.style.transform = `translate(${p.x}px,${p.y}px) translate(-50%,-100%)`;
  } else if(meTag){ meTag.remove(); meTag = null; }
}

/* ======================================================================
   HUD and the warning banner
   ====================================================================== */
const hudEl = $('#hud'), warnEl = $('#warn');
let hudKey = '';
function candBump(){ const c = $('#hudCand'); c.classList.remove('bump'); void c.offsetWidth; c.classList.add('bump'); hudKey = ''; }
function setPlayUI(on){
  hudEl.hidden = !on; joyEl.hidden = !on;
  if(!on){ jumpBtn.hidden = true; $('#emoBar').hidden = true; warnEl.hidden = true; }
  hudKey = '';
}
function hudFrame(){
  // warning banner (the event that is coming)
  const wk = RS.ev.find(evWarn);
  if(wk && state === 'play'){
    const left = RS.ph === 'warn' ? WARN_T - RS.t : E2_ON - RS.t, n = Math.max(1, Math.ceil(left));
    const key = RS.n + wk;
    if(key !== warnShown){
      warnShown = key; const E = EVENTS[wk];
      $('#warnE').textContent = E.e; $('#warnT').textContent = E.name; $('#warnH').textContent = E.hint;
      warnEl.style.setProperty('--ec', E.c); warnEl.hidden = false; warnEl.style.animation = 'none'; void warnEl.offsetWidth; warnEl.style.animation = '';
      SFX.horn(); if(RS.ph === 'run') say(L('كمان مفاجأة! ', 'Another surprise! ', 'Bir sürpriz daha! ') + E.hint, 4500);
    }
    if(n !== lastWarnN){ lastWarnN = n; $('#warnN').textContent = N(n); if(n <= 3) SFX.tick(); }
  } else if(!warnEl.hidden) warnEl.hidden = true;
  // jump / emotes
  const playing = state === 'play';
  jumpBtn.hidden = !playing || !!(me && me.fl);
  $('#emoBar').hidden = !playing || !(me && (me.out || RS.ph === 'end'));
  const ro = roster(), left = ro.filter(a => !a.out).length;
  const evs = activeEvs();
  const ph = RS.ph === 'warn' ? 'w' + Math.ceil(WARN_T - RS.t) : RS.ph === 'run' ? 'r' + Math.ceil(RUN_T - RS.t) + evs.join() : RS.ph;
  const key = [SAVE.stars, SAVE.streak, ph, left, ro.length, me ? me.cand : 0, evOn('candy'), mpActive() ? MP.players.map(p => p.id + p.hero).join() : ''].join('|');
  if(key === hudKey) return; hudKey = key;
  $('#hudStars').textContent = '⭐ ' + N(SAVE.stars);
  $('#hudStreak').textContent = '🔥 ' + N(SAVE.streak);
  const phEl = $('#hudPhase');
  phEl.hidden = RS.ph === 'idle';
  if(RS.ph === 'warn'){ phEl.textContent = '⏳ ' + N(Math.ceil(WARN_T - RS.t)); phEl.style.setProperty('--ec', EVENTS[RS.ev[0]].c); phEl.classList.remove('hurry'); }
  else if(RS.ph === 'run'){ const s = RUN_T - RS.t; phEl.textContent = evs.map(k => EVENTS[k].e).join(' ') + '  ⏱️ ' + mmss(s); phEl.style.setProperty('--ec', EVENTS[evs[0] || RS.ev[0]].c); phEl.classList.toggle('hurry', s <= 10); }
  else if(RS.ph === 'end'){ phEl.textContent = '🏁'; phEl.classList.remove('hurry'); }
  const al = $('#hudAlive'); al.hidden = !ro.length; al.textContent = '🙂 ' + N(left) + '/' + N(ro.length);
  const cd = $('#hudCand'); cd.hidden = !(evOn('candy') || (me && me.cand > 0 && RS.ph !== 'warn')); cd.textContent = '🍬 ' + N(me ? me.cand : 0);
  const bar = $('#mpBar');
  if(mpActive()){
    bar.hidden = false;
    bar.innerHTML = `<span class="chip roomchip">🔢 ${[...MP.code].map(N).join('')}</span>` + MP.players.map(p => `<span class="chip ps" style="--c:${MCOL[p.c] || '#fff'}"><img src="${charImg(p.hero)}" alt="">${BoboRT.chipH(p.id)}${p.id === MP.id ? '⭐' : ''}</span>`).join('');
  } else bar.hidden = true;
}

/* ======================================================================
   Screens: menu, character picker, pause, results
   ====================================================================== */
const overlay = $('#overlay'), card = $('#card');
function showMenu(){
  if(MP.t) mpLeave(true);
  state = 'menu'; setPlayUI(false); overlay.hidden = false; overlay.className = 'overlay clear'; card.className = 'card bare'; clearInput(); hush();
  RS.ph = 'idle'; resetHazards(); EVS.lava = 0;
  for(const a of [...ACT.values()]) if(a !== me) dropActor(a.id);
  if(me){ me.out = me.spec = false; me.fl = null; me.bub.visible = false; placeAt(me, { x:ISL.PZ.x + 2.4, z:ISL.PZ.z + 1.2 }, .6); }
  const rotHint = ROT && !rawGet('surprise_rothint');
  card.innerHTML = `<div class="menu">
    ${rotHint ? `<div class="rothint"><i aria-hidden="true">📱</i><span>${L('لفّ الجوال على جنب', 'Turn your phone sideways', 'Telefonu yan çevir')}</span></div>` : ''}
    <div class="logo">🌪️</div><h1>${L('جزيرة المفاجآت', 'Surprise Island', 'Sürpriz Adası')}</h1>
    <p class="sub">${L('كل جولة مفاجأة مضحكة! نجّي وجمّع نجوم', 'A funny surprise every round! Survive and collect stars', 'Her tur komik bir sürpriz! Hayatta kal, yıldız topla')}</p>
    <div class="row"><div class="mine"><span>⭐ ${N(SAVE.stars)}</span><span>🔥 ${L('أحسن سلسلة', 'Best streak', 'En iyi seri')} ${N(SAVE.best)}</span></div>
    <button class="hero-btn" id="bHero" style="--c:${HERO_COLOR[heroId]}"><img src="${charImg(heroId)}" alt=""><span>${HERO_NAME[heroId]} 🔄</span></button></div>
    <div class="row"><button class="big-btn" id="bPlay">▶️ ${L('العب', 'Play', 'Oyna')}</button>
    <button class="big-btn pink" id="bMp">👫 ${L('العب مع أصحابك', 'Play with friends', 'Arkadaşlarla oyna')}</button></div></div>`;
  $('#bPlay').onclick = () => { ac(); SFX.tap(); startSolo(); };
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
    SFX.tap(); heroId = selPick; SAVE.hero = selPick; persist(); rawSet('worlds_hero', selPick); setActorHero(me, selPick);
    if(mpActive()) mpTrack();
    if(selFrom === 'pause'){ resume(); }
    else if(selFrom === 'mp') mpMenu(); else showMenu();
  };
}
function showPause(){
  if(state !== 'play') return;
  state = 'pause'; setPlayUI(false); overlay.hidden = false; overlay.className = 'overlay dim'; card.className = 'card'; clearInput(); hush(); persist();
  const mp = mpActive();
  card.innerHTML = `<h2>⏸️ ${L('استراحة', 'Paused', 'Mola')}</h2>
    <button class="big-btn" id="bRes">▶️ ${L('كمّل', 'Continue', 'Devam')}</button>
    <div class="row"><button class="ghost-btn" id="bHeroP">🦸 ${L('غيّر الشخصية', 'Change character', 'Karakteri değiştir')}</button>
    <button class="ghost-btn" id="bSnd">${muted ? '🔇' : '🔊'} ${L('الصوت', 'Sound', 'Ses')}</button>
    ${mp ? `<button class="ghost-btn" id="bLeaveR">🚪 ${L('اطلع من الغرفة', 'Leave the room', 'Odadan çık')}</button>` : ''}</div>
    <button class="exit-btn" id="bExit">🚪 ${L('خروج', 'Exit', 'Çıkış')}</button>`;
  $('#bRes').onclick = () => { SFX.tap(); resume(); };
  $('#bHeroP').onclick = () => { SFX.tap(); showSelect('pause'); };
  $('#bSnd').onclick = () => { muted = !muted; rawSet('adv3d_muted', String(muted)); $('#bSnd').innerHTML = (muted ? '🔇' : '🔊') + ' ' + L('الصوت', 'Sound', 'Ses'); SFX.tap(); };
  if(mp) $('#bLeaveR').onclick = () => { SFX.tap(); showMenu(); };
  $('#bExit').onclick = () => { SFX.tap(); try{ persist(); if(MP.t) mpLeave(true); }catch(e){} setTimeout(() => { location.href = '../'; }, 150); };
}
function resume(){ overlay.hidden = true; state = 'play'; setPlayUI(true); placeJoyHome(); if(RS.ph === 'end' && RS.res) showResults(); }
$('#btnPause').onclick = () => { SFX.tap(); showPause(); };
function showResults(){
  if(!RS.res || state === 'pause' || state === 'select') return;
  state = 'results'; setPlayUI(false); overlay.hidden = false; overlay.className = 'overlay dim'; card.className = 'card wide'; clearInput();
  const g = lastGain, auth = authority();
  const evRan = RS.res.some(r => r[2] >= 2) || RS.ev.length > 1 ? RS.ev : RS.ev.slice(0, 1);
  card.innerHTML = `<div class="bigstar">${g ? (g.ok ? '🎉' : '🫧') : '🏁'}</div>
    <h2>${g ? (g.ok ? L('نجيت من المفاجأة!', 'You survived the surprise!', 'Sürprizden kurtuldun!') : L('مسكتك المفاجأة! المرة الجاية 💪', 'The surprise got you! Next time 💪', 'Sürpriz seni yakaladı! Bir dahakine 💪')) : L('خلصت الجولة', 'Round over', 'Tur bitti')}</h2>
    <div class="evlist">${evRan.map(k => `<span style="--ec:${EVENTS[k].c}">${EVENTS[k].e}</span>`).join('')}</div>
    <div class="res">${RS.res.map(([id, ok, st]) => { const a = ACT.get(id); if(!a) return ''; const col = a.kind === 'bot' ? '' : MCOL[(MP.players.find(p => p.id === id) || {}).c] || '#ffc23d';
      return `<div class="p${ok ? '' : ' out'}" style="${col ? '--c:' + col : ''}">${a === me ? `<span class="you">${L('إنت', 'You', 'Sen')}</span>` : ''}<img src="${charImg(a.hero)}" alt=""><b>${a.kind === 'bot' || a === me ? HERO_NAME[a.hero] : BoboRT.whoH(id, HERO_NAME[a.hero])}</b><span class="r">${ok ? '✅' : '🫧'} ${ok ? '⭐'.repeat(Math.min(3, st)) : ''}</span></div>`; }).join('')}</div>
    ${g ? `<div class="gain"><span>⭐ +${N(g.stars)}</span>${g.coins ? `<span>🪙 +${N(g.coins)}</span>` : ''}<span>🔥 ${N(SAVE.streak)}</span>${g.cand ? `<span>🍬 ${N(g.cand)}</span>` : ''}</div>` : ''}
    <div class="row">${auth ? `<button class="big-btn mint" id="bNext">▶️ ${L('جولة جديدة', 'New round', 'Yeni tur')}</button>` : `<p>⏳ ${L('استنّى صاحب الغرفة…', 'Waiting for the room owner…', 'Oda sahibi bekleniyor…')}</p>`}
    <button class="ghost-btn" id="bMenu">🏠 ${L('القائمة', 'Menu', 'Menü')}</button></div>`;
  if(auth) $('#bNext').onclick = () => { SFX.tap(); closeResults(); startRound(); };
  $('#bMenu').onclick = () => { SFX.tap(); showMenu(); };
  if(g && g.ok) burst(me.x, me.y + 1.5, me.z, 40, CONFETTI, 5, 1.2);
}
function closeResults(){ if(state === 'results'){ overlay.hidden = true; state = 'play'; setPlayUI(true); placeJoyHome(); } }
function ensureMe(id){
  if(!me){ me = mkActor(id, 'me', heroId); return; }
  if(me.id !== id){ ACT.delete(me.id); me.id = id; ACT.set(id, me); }
}
function startSolo(){
  if(MP.t) mpLeave(true);
  for(const a of [...ACT.values()]) if(a !== me && a.kind !== 'bot') dropActor(a.id);
  ensureMe('me');
  if(ROT) rawSet('surprise_rothint', '1');
  overlay.hidden = true; state = 'play'; setPlayUI(true); clearInput(); placeJoyHome();
  RS.n = 0; RS.last = [];
  startRound();
  if(SAVE.tut === 0){ SAVE.tut = 1; persist(); say(L('أهلا حبيبي! أنا العمة ليلى 👵 أهلا بجزيرة المفاجآت 🏝️', "Hello sweetie! I'm Aunt Laila 👵 Welcome to Surprise Island 🏝️", 'Merhaba tatlım! Ben Leyla Teyze 👵 Sürpriz Adası\'na hoş geldin 🏝️'), 3600, true); setTimeout(() => { if(state === 'play' && RS.ph === 'warn') say(L('امشي بالعصا 🕹️ ونطّ بالزر الأخضر 🦘 وشوف الصورة فوق 👀', 'Walk with the stick 🕹️, jump with the green button 🦘 and look at the picture above 👀', 'Çubukla yürü 🕹️, yeşil düğmeyle zıpla 🦘 ve yukarıdaki resme bak 👀'), 5500); }, 3800); }
}

/* ======================================================================
   Main loop
   ====================================================================== */
let last = performance.now(), lastRaf = performance.now(), fpsN = 0, fpsT = 0, fps = 60, slowT = 0, menuT = 0;
function live(){ return state === 'play' || state === 'results' || state === 'card' || (mpActive() && (state === 'pause' || state === 'select')); }
function tick(dt, force){
  T += dt;
  if(!me) return;
  if(!force && (RS.freeze || !live())) return;
  if(RS.ph === 'idle') return;
  if(state === 'play' && !me.fl) readInput(dt); else inp.x = inp.z = 0;
  physStep(me, dt, inp.x, inp.z, jumpQ && state === 'play'); jumpQ = false;
  const auth = authority(), k = 1 - Math.exp(-12 * dt);
  for(const a of ACT.values()){
    if(a === me) continue;
    if(a.kind === 'bot' && auth){ const c = botCtl(a, dt); physStep(a, dt, c.x, c.z, c.j); }
    else if(a.fl) floatFrame(a, dt);
    else {
      if(Math.hypot(a.tx - a.x, a.tz - a.z) > 8 || Math.abs(a.ty - a.y) > 6){ a.x = a.tx; a.y = a.ty; a.z = a.tz; }
      a.x = lerp(a.x, a.tx, k); a.y = lerp(a.y, a.ty, k); a.z = lerp(a.z, a.tz, k); a.f += angDiff(a.tf, a.f) * k; a.m = lerp(a.m, a.tm, k);
    }
  }
  separate(auth);
  for(const a of ACT.values()) meters(a, dt);
  if(auth) simRound(dt); else clientHazards(dt);
}
/* bodies don't stand inside each other (only the ones this device moves are pushed) */
function separate(auth){
  const L = [...ACT.values()].filter(a => !a.fl);
  for(let i = 0; i < L.length; i++) for(let j = i + 1; j < L.length; j++){
    const a = L[i], b = L[j]; if(Math.abs(a.y - b.y) > 1) continue;
    let dx = b.x - a.x, dz = b.z - a.z; const d = Math.hypot(dx, dz); if(d >= .8) continue;
    if(d < 1e-4){ dx = 1; dz = 0; } else { dx /= d; dz /= d; }
    const ma = a === me || (auth && a.kind === 'bot'), mb = b === me || (auth && b.kind === 'bot'), push = .8 - d;
    if(ma && mb){ a.x -= dx * push / 2; a.z -= dz * push / 2; b.x += dx * push / 2; b.z += dz * push / 2; }
    else if(ma){ a.x -= dx * push; a.z -= dz * push; } else if(mb){ b.x += dx * push; b.z += dz * push; }
  }
}
function drawActors(dt){
  for(const a of ACT.values()){
    if(!a.h) continue;
    a.t += dt;
    a.h.grp.position.set(a.x, a.y, a.z); a.h.grp.rotation.y = a.f;
    poseHero(a.h, { t:a.t, dt, run:a.fl ? 0 : a.m, grounded:a.fl ? false : a.grounded, vy:a.fl ? 2 : a.vy, sq:0, flip:0 });
    if(a.fl){ a.bub.visible = true; a.bub.position.set(a.x, a.y + .72, a.z); const w = 1 + Math.sin(a.t * 6) * .05; a.bub.scale.set(1.05 * w, 1.05 / w, 1.05 * w); }
    else if(a.bub.visible) a.bub.visible = false;
    if(a.ring) a.ring.visible = !a.fl && state !== 'menu';
  }
}
function frame(now){
  requestAnimationFrame(frame);
  lastRaf = now;
  let dt = (now - last) / 1000; last = now; if(dt > .05) dt = .05; if(dt <= 0) dt = .001;
  fpsN++; fpsT += dt;
  if(fpsT >= 1){
    fps = fpsN / fpsT; fpsN = 0; fpsT = 0;
    if((state === 'play') && fps < 40){ slowT++; if(slowT >= 2){ slowT = 0; if(dpr > 1){ dpr = Math.max(1, dpr - .25); renderer.setPixelRatio(dpr); renderer.setSize(SW, SH, false); } else if(renderer.shadowMap.enabled && fps < 28){ renderer.shadowMap.enabled = false; sun.castShadow = false; scene.traverse(o => { if(o.material) o.material.needsUpdate = true; }); } } } else slowT = 0;
  }
  tick(dt);
  mpFrame(dt);
  drawActors(dt);
  if(state === 'menu' || state === 'select' || (state === 'mp' && !mpActive())){
    menuT += dt; const a = menuT * .05 + .5;
    camera.position.set(Math.sin(a) * 30, 15, Math.cos(a) * 30); camera.lookAt(0, 1, 0); camLook.set(0, 1, 0); aimSun(0, 0);
  } else { updateCamera(dt); aimSun(camLook.x, camLook.z); }
  hazardVisuals(dt, camLook.x, camLook.z);
  houseFades(dt);
  if(state === 'play' || state === 'results') hudFrame();
  tagsFrame(dt);
  updateParts(dt);
  sky.position.copy(camera.position);
  renderer.render(scene, camera);
}
/* background tabs get no animation frames: keep the round going (host) with a slow timer */
setInterval(() => {
  const now = performance.now();
  if(now - lastRaf < 400) return;
  let dt = Math.min(1, (now - last) / 1000); last = now;
  while(dt > 0){ const d = Math.min(.05, dt); tick(d); dt -= d; }
  mpFrame(.25);
}, 250);
document.addEventListener('visibilitychange', () => { if(document.hidden){ persist(); if(state === 'play' && !mpActive()) showPause(); } });
addEventListener('pagehide', () => persist());

/* ======================================================================
   Online («👫 العب مع أصحابك»): a room of up to 4 kids; bots fill the rest. Nothing is stored on a server.
   The room owner (host) runs the round: events, hazards, bots, who is caught. Events:
   pos (everyone, 10/s), snap (host, 6/s), cg (caught), re (results), kn (frog bump), em (emote), hi (ask for a snap).
   No names, no chat: a player is a character + a colour badge.
   ====================================================================== */
const MP_URL = 'https://vgpwtrzplggvlsuvqsas.supabase.co', MP_KEY = 'sb_publishable_D9thEhZlZnfn0t06j8h1Rw_H-LVF786';
const MP_EVENTS = ['pos', 'snap', 'cg', 're', 'kn', 'em', 'hi'];
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
    this.rt = window.BoboRT.open({ url:MP_URL, key:MP_KEY, topic:'bobo-surprise-' + code, id, events:MP_EVENTS, eps:30, h });
    await this.rt.ready;
  }
  track(meta){ if(this.rt) this.rt.track(meta); }
  send(ev, payload){ if(this.rt) this.rt.send(ev, payload); }
  close(){ this.closed = true; if(this.rt){ this.rt.close(); this.rt = null; } }
}
class LocalTransport{
  open(code, id, h){
    this.id = id; this.h = h; this.meta = null; this.peers = new Map(); this.ready = false;
    const bc = this.bc = new BroadcastChannel('bobo-surprise-' + code);
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
const MP = { t:null, id:null, code:null, list:[], players:[], meta:null, isHost:false, hostId:null, synced:false, screen:'off', tok:0, sendT:0, snapT:0, inviteFor:null, typed:'' };
window.__boboRoom = () => (MP.t && MP.meta && MP.code) ? MP.code : null;
const mpActive = () => !!(MP.t && MP.meta);
const mpHere = id => MP.players.some(p => p.id === id);
const mpNewId = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
const mpSort = (a, b) => ((a.o || 0) - (b.o || 0)) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
/* «أصحابي»: tell friends which room I'm in. The server may not know the game id yet, so every call is guarded. */
const FR_GAME = 'surprise';
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
/* other kids in the room */
function remoteSync(){
  const here = new Set();
  for(const p of MP.players){
    if(p.id === MP.id) continue; here.add(p.id);
    let a = ACT.get(p.id);
    if(!a){ a = mkActor(p.id, 'remote', p.hero); a.out = true; a.spec = true; toBalcony(a); }
    else setActorHero(a, p.hero);
    if(a.ring) a.ring.material.color.set(MCOL[p.c] || '#ffffff');
  }
  for(const a of [...ACT.values()]) if(a.kind === 'remote' && !here.has(a.id)) dropActor(a.id);
  hudKey = '';
}
function mpClose(){
  frRoom(null);
  if(MP.t){ try{ MP.t.close(); }catch(e){} }
  MP.t = null; MP.meta = null; MP.list = []; MP.players = []; MP.isHost = false; MP.hostId = null; MP.synced = false;
  remoteSync();
  $('#mpBar').hidden = true; hudKey = '';
}
async function mpOpen(code, how){
  mpClose();
  const t = MP_LOCAL ? new LocalTransport() : new SupabaseTransport(), tok = ++MP.tok;
  MP.t = t; MP.code = code; MP.id = MP.id || mpNewId();
  const liveT = () => MP.t === t && MP.tok === tok;
  try{
    await t.open(code, MP.id, {
      presence:list => { if(liveT()) mpPresence(list); },
      msg:(ev, p) => { if(liveT() && p && typeof p === 'object') mpMsg(ev, p); },
      status:s => { if(liveT() && s === 'up') mpTrack(); }
    });
  }catch(e){ if(liveT()) mpClose(); throw e; }
  if(!liveT()) throw new Error('cancelled');
  const t0 = performance.now();
  // the server only sends the room's member list after we track something: send a short 'probe' first, then wait for the list
  t.track({ ph:'probe' });
  await new Promise(res => { const chk = () => (MP.synced || performance.now() - t0 > 6000 || !liveT()) ? res() : setTimeout(chk, 40); chk(); });
  if(MP.synced) await new Promise(r => setTimeout(r, 300));
  if(!liveT()) throw new Error('cancelled');
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
  const meI = all.findIndex(p => p.id === MP.id);
  if(meI >= MP_MAX){ showMenu(); say(L('الغرفة مليانة 🙈', 'The room is full 🙈', 'Oda dolu 🙈')); return; }
  const before = MP.players.map(p => p.id);
  MP.players = all.slice(0, MP_MAX);
  MP.isHost = MP.hostId === MP.id;
  if(!MP.isHost && MP.hostId && !MP.players.some(p => p.id === MP.hostId)){ showMenu(); say(L('صاحب الغرفة طلع 🚪', 'The room owner left 🚪', 'Oda sahibi çıktı 🚪'), 4000); return; }
  const joined = MP.players.filter(p => p.id !== MP.id && !before.includes(p.id));
  remoteSync();
  if(joined.length && before.length){
    SFX.flag();
    if(MP.isHost){
      say(L('صاحبك فات عالجزيرة! 🏝️', 'A friend arrived on the island! 🏝️', 'Bir arkadaşın adaya geldi! 🏝️'), 3000);
      if(RS.ph === 'warn' && RS.t < WARN_T - 2.5) for(const p of joined) if(!RS.roster.includes(p.id)){ const a = ACT.get(p.id); RS.roster.push(p.id); a.slot = RS.roster.length - 1; respawn(a, a.slot); }
      mpSnap();
    }
  }
}
function mpSnap(){
  if(!mpActive() || !MP.isHost) return;
  MP.snapT = 1 / 6;
  const bt = [], out = [], cc = {};
  for(const a of ACT.values()){
    if(a.kind === 'bot') bt.push([a.id, a.hero, r2(a.x), r2(a.y), r2(a.z), r2(a.f), r2(a.m), a.grounded ? 1 : 0, a.out ? 1 : 0, a.fl ? 1 : 0, a.cand]);
    else { if(a.out) out.push(a.id); cc[a.id] = a.cand; }
  }
  mpSend('snap', { n:RS.n, ph:RS.ph, t:r2(RS.t), ev:RS.ev, ro:RS.roster, out, bt, cc, wl:r2(EVS.wl), wa:r2(EVS.wa), wg:r2(EVS.wg), lv:r2(EVS.lava),
    sb:EVS.snow.map(b => [b.id, r2(b.x), r2(b.z), r2(b.r), r2(b.vx), r2(b.vz)]),
    bu:EVS.bub.map(b => [b.id, r2(b.x), r2(b.y), r2(b.z), r2(b.r), r2(b.vx), r2(b.vz), r2(b.ph)]),
    fr:EVS.frogs.map(f => [f.id, r2(f.x), r2(f.y), r2(f.z), r2(f.f), r2(f.s)]),
    dr:EVS.drop.map(d => [d.id, r2(d.x), r2(d.z), r2(d.y), r2(d.t), d.hit, r2(d.life), d.col]),
    cd:EVS.cand.map(c => [c.id, r2(c.x), r2(c.y), r2(c.z), c.ld, r2(c.vy), c.col, r2(c.land)]) });
}
const num = (v, lo, hi) => clamp(+v || 0, lo, hi);
const arr = v => Array.isArray(v) ? v : [];
function applySnap(p){
  if(MP.isHost || p.id !== MP.hostId) return;
  const newRound = (p.n | 0) !== RS.n, prevPh = RS.ph;
  RS.n = p.n | 0; RS.ev = arr(p.ev).filter(k => EVENTS[k]).slice(0, 2); RS.ph = ['warn', 'run', 'end', 'idle'].includes(p.ph) ? p.ph : 'idle'; RS.t = num(p.t, 0, 999);
  RS.roster = arr(p.ro).filter(id => typeof id === 'string').slice(0, 10);
  // bots
  const seen = new Set();
  for(const r of arr(p.bt)){
    const [id, hero, x, y, z, f, m, g, o, fl, cand] = r; if(typeof id !== 'string' || !/^b\d$/.test(id)) continue; seen.add(id);
    let a = ACT.get(id); if(!a){ a = mkActor(id, 'bot', hero); a.x = a.tx = +x || 0; a.y = a.ty = +y || 0; a.z = a.tz = +z || 0; } else setActorHero(a, hero);
    a.tx = num(x, -60, 60); a.ty = num(y, -5, 30); a.tz = num(z, -60, 60); a.tf = +f || 0; a.tm = num(m, 0, 1); a.grounded = !!g; a.cand = cand | 0; a.slot = Math.max(0, RS.roster.indexOf(id));
    if(fl && !a.fl && !a.out) startFloat(a, '?');
    else if(o && !fl && !a.fl){ a.out = true; a.spec = true; }
    else if(!o && a.out && !a.fl){ a.out = false; a.spec = false; a.x = a.tx; a.y = a.ty; a.z = a.tz; }
  }
  for(const a of [...ACT.values()]) if(a.kind === 'bot' && !seen.has(a.id)) dropActor(a.id);
  // the kids
  const outs = new Set(arr(p.out));
  if(newRound){
    RS.res = null; resetHazards();
    RS.roster.forEach((id, i) => { const a = ACT.get(id); if(a && a.kind !== 'bot'){ a.slot = i; respawn(a, i); } });
    roundBegan();
  } else if(RS.ph === 'warn' && RS.roster.includes(me.id) && me.out && !outs.has(me.id) && !me.fl){ me.slot = RS.roster.indexOf(me.id); respawn(me, me.slot); snapCam = true; }
  if(!RS.roster.includes(me.id) && !me.out){ me.out = true; me.spec = true; toBalcony(me); snapCam = true; }
  for(const id of outs){ const a = ACT.get(id); if(a && !a.out) startFloat(a, '?'); }
  if(prevPh === 'warn' && RS.ph === 'run') SFX.go();
  const cc = p.cc && typeof p.cc === 'object' ? p.cc : {};
  for(const a of ACT.values()) if(a.kind !== 'bot' && cc[a.id] != null){ const n = cc[a.id] | 0; if(a === me && n > me.cand){ SFX.candy(); candBump(); } a.cand = n; }
  EVS.wl = num(p.wl, WL_BASE, 6); EVS.wa = +p.wa || 0; EVS.wg = num(p.wg, 0, 1); EVS.lava = num(p.lv, 0, 1);
  // hazards (keep the spin of old snowballs)
  const oldSnow = new Map(EVS.snow.map(b => [b.id, b]));
  EVS.snow = arr(p.sb).slice(0, 12).map(([id, x, z, r, vx, vz]) => ({ id, x:+x, z:+z, r:num(r, .5, 2), vx:+vx, vz:+vz, rot:(oldSnow.get(id) || { rot:0 }).rot }));
  for(const [id, b] of oldSnow) if(!EVS.snow.some(s => s.id === id) && Math.hypot(b.x, b.z) < 32) snowPuff(b);
  const oldBub = new Set(EVS.bub.map(b => b.id)), newBub = arr(p.bu).slice(0, 24).map(([id, x, y, z, r, vx, vz, ph]) => ({ id, x:+x, y:+y, z:+z, by:+y, r:num(r, .3, 2), vx:+vx, vz:+vz, ph:+ph || 0, t:0 }));
  for(const b of EVS.bub) if(!newBub.some(n => n.id === b.id)) bubPop(b);
  EVS.bub = newBub; void oldBub;
  const oldFr = new Map(EVS.frogs.map(f => [f.id, f]));
  EVS.frogs = arr(p.fr).slice(0, 8).map(([id, x, y, z, f, s]) => { const o = oldFr.get(id); const fr = o || { id, x:+x, y:+y, z:+z, f:+f }; fr.tx = +x; fr.ty = +y; fr.tz = +z; fr.tf = +f; fr.s = num(s, .5, 3); if(o && o.ty > .2 && fr.ty <= .05 && o.y > .2) burst(fr.tx, .2, fr.tz, 6, [0x8fd06a, 0xffffff], 2, .6, 8, 1, .6); return fr; });
  const oldDr = new Map(EVS.drop.map(d => [d.id, d]));
  EVS.drop = arr(p.dr).slice(0, 8).map(([id, x, z, y, t, hit, life, col]) => { const o = oldDr.get(id); const d = { id, x:+x, z:+z, y:+y, t:+t, hit:hit ? 1 : 0, life:+life, col:col | 0 }; if(o && !o.hit && d.hit) gumHit(d); return d; });
  EVS.cand = arr(p.cd).slice(0, 60).map(([id, x, y, z, ld, vy, col, land]) => ({ id, x:+x, y:+y, z:+z, ld:ld ? 1 : 0, vy:+vy, col:col | 0, land:+land }));
  hudKey = '';
}
function clientHazards(dt){
  if(RS.ph === 'warn' || RS.ph === 'run') RS.t += dt;
  for(const b of EVS.snow){ b.x += b.vx * dt; b.z += b.vz * dt; b.rot += Math.hypot(b.vx, b.vz) / b.r * dt; }
  for(const b of EVS.bub){ b.t += dt; b.x += b.vx * dt; b.z += b.vz * dt; }
  const k = 1 - Math.exp(-14 * dt);
  for(const f of EVS.frogs){ if(f.tx == null) continue; f.x = lerp(f.x, f.tx, k); f.y = lerp(f.y, f.ty, k); f.z = lerp(f.z, f.tz, k); f.f += angDiff(f.tf, f.f) * k; }
  for(const d of EVS.drop){ if(!d.hit) d.t -= dt; else d.life -= dt; }
  for(const c of EVS.cand){ if(!c.ld){ c.vy -= 6 * dt; c.y = Math.max(c.land, c.y + c.vy * dt); } }
}
function mpMsg(ev, p){
  if(ev === 'snap'){ applySnap(p); return; }
  if(ev === 'pos'){
    const a = ACT.get(p.id); if(!a || a.kind !== 'remote') return;
    a.tx = num(p.x, -60, 60); a.ty = num(p.y, -5, 30); a.tz = num(p.z, -60, 60); a.tf = +p.f || 0; a.tm = num(p.m, 0, 1); a.grounded = !!p.g;
    if(!a.seen){ a.seen = true; a.x = a.tx; a.y = a.ty; a.z = a.tz; }
    return;
  }
  if(ev === 'hi'){ if(MP.isHost) mpSnap(); return; }
  if(ev === 'em'){ const a = ACT.get(typeof p.w === 'string' ? p.w : p.id); if(a && EMOS.includes(p.e)) showEmote(a, p.e); return; }
  if(MP.isHost || p.id !== MP.hostId) return;          // the rest only comes from the host
  if(ev === 'cg'){ const a = ACT.get(p.w); if(a && !a.fl && !a.spec){ a.x = num(p.x, -60, 60); a.y = num(p.y, -5, 30); a.z = num(p.z, -60, 60); a.out = false; startFloat(a, EVENTS[p.why] || p.why === 'sea' ? p.why : '?'); } }
  else if(ev === 're'){ if((p.n | 0) === RS.n){ RS.ph = 'end'; RS.t = 0; gotResults(arr(p.res).filter(r => Array.isArray(r) && typeof r[0] === 'string').map(r => [r[0], r[1] ? 1 : 0, clamp(r[2] | 0, 0, 3), clamp(r[3] | 0, 0, 999)]), clamp(p.er | 0, 1, 2)); } }
  else if(ev === 'kn'){ if(p.to === MP.id && alive(me)){ me.kx = num(p.x, -12, 12); me.kz = num(p.z, -12, 12); me.vy = num(p.y, 0, 9); me.grounded = false; me.dizzy = clamp(p.dz | 0, 0, 3); SFX.boing(); pop('🐸 ' + '🌀'.repeat(Math.max(1, me.dizzy))); } }
}
function mpFrame(dt){
  if(!mpActive()) return;
  MP.sendT -= dt;
  if(MP.sendT <= 0 && me){ MP.sendT = .1; mpSend('pos', { x:r2(me.x), y:r2(me.y), z:r2(me.z), f:r2(me.f), m:r2(me.m), g:me.grounded ? 1 : 0 }); }
  if(MP.isHost){ MP.snapT -= dt; if(MP.snapT <= 0) mpSnap(); }
}
function mpLeave(silent){
  MP.tok++; mpClose(); MP.screen = 'off';
  for(const a of [...ACT.values()]) if(a.kind === 'bot' || a.kind === 'remote') dropActor(a.id);
  if(me && me.id !== 'me') ensureMe('me');
  if(!silent) hudKey = '';
}
function mpCard(wide){ state = 'mp'; setPlayUI(false); overlay.hidden = false; overlay.className = 'overlay dim'; card.className = 'card' + (wide ? ' wide' : ''); }
function mpMenu(){
  MP.tok++; mpClose(); MP.screen = 'menu'; mpCard(false);
  card.innerHTML = `<h2>👫 ${L('العب مع أصحابك', 'Play with friends', 'Arkadaşlarla oyna')}</h2>
    <p>🏝️ ${L('لحد ٤ أصحاب على نفس الجزيرة، ومين بيضل لآخر الجولة بياخد نجوم!', 'Up to 4 friends on the same island — whoever lasts the round gets stars!', '4 arkadaşa kadar aynı adada — turu atlatan yıldız kazanır!').replace('٤', N(4))}</p>
    <button class="hero-btn" id="bMyHero" style="--c:${HERO_COLOR[heroId]}"><img src="${charImg(heroId)}" alt=""><span>${HERO_NAME[heroId]} 🔄</span></button>
    <div class="row"><button class="big-btn" id="bCreate">🏝️ ${L('اعمل غرفة', 'Create room', 'Oda kur')}</button>
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
  for(const a of [...ACT.values()]) if(a.kind === 'bot') dropActor(a.id);
  ensureMe(MP.id);
  if(ROT) rawSet('surprise_rothint', '1');
  overlay.hidden = true; state = 'play'; setPlayUI(true); clearInput(); placeJoyHome(); snapCam = true;
  remoteSync();
  if(MP.isHost){
    RS.n = 0; RS.last = []; startRound();
    say(L('رقم غرفتك ', 'Your room number is ', 'Oda numaran ') + [...MP.code].map(N).join('') + L(' — قولو لأصحابك 👫', ' — tell your friends 👫', ' — arkadaşlarına söyle 👫'), 6000);
  } else {
    RS.ph = 'idle'; RS.n = -1; me.out = true; me.spec = true; me.slot = 7; toBalcony(me);
    mpSend('hi', {});
    say(L('أهلا! استنّى عالشرفة لتبلّش الجولة الجاية 🎉', 'Welcome! Wait on the balcony for the next round 🎉', 'Hoş geldin! Sonraki tur için balkonda bekle 🎉'), 5000);
  }
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
/* «تعا العب» from the friends page: ?host=1&invite=<friendCode>. The server may not accept 'surprise' yet: guarded. */
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
const actInfo = a => a && { path:a.ai ? a.ai.path.length + ':' + a.ai.pi + (a.ai.goal && a.ai.goal.y != null ? '^' + a.ai.goal.y : '') + (a.ai.path[a.ai.pi] ? '@' + r2(a.ai.path[a.ai.pi].x) + ',' + r2(a.ai.path[a.ai.pi].z) : '') : '', id:a.id, kind:a.kind, hero:a.hero, x:r2(a.x), y:r2(a.y), z:r2(a.z), out:a.out, spec:a.spec, fl:!!a.fl, cand:a.cand, wet:a.wetT, hot:a.hotT, dizzy:a.dizzy, grounded:a.grounded, goal:a.ai && a.ai.goal ? a.ai.goal.kind : null, shel:a.shel };
window.__surprise = {
  get state(){ return state; }, get mpScreen(){ return MP.screen; }, menu:() => showMenu(), play:() => startSolo(),
  get round(){ return { ph:RS.ph, t:RS.t, n:RS.n, ev:RS.ev.slice(), roster:RS.roster.slice(), on:activeEvs(), warn:RS.ev.filter(evWarn), res:RS.res && RS.res.map(r => r.slice()) }; },
  force(evs){ RS.force = evs; }, next(evs){ if(evs) RS.force = evs; closeResults(); startRound(); },
  skipWarn(){ if(RS.ph === 'warn') RS.t = WARN_T - .01; }, setT(t){ RS.t = t; }, endNow(){ if(RS.ph === 'run') RS.t = RUN_T; },
  freeze(on){ RS.freeze = !!on; }, aggro(on){ EVS.aggro = !!on; },
  get me(){ return actInfo(me); }, get bots(){ return [...ACT.values()].filter(a => a.kind === 'bot').map(actInfo); }, get actors(){ return [...ACT.values()].map(actInfo); },
  tp(x, z, y){ me.x = x; me.z = z; me.y = y != null ? y : topAt(x, z); me.vx = me.vz = me.vy = me.kx = me.kz = 0; me.grounded = true; snapCam = true; },
  tpBot(i, x, z){ const b = ACT.get('b' + i); if(b){ b.x = x; b.z = z; b.y = topAt(x, z); b.ai.goal = null; } },
  step(sec, ix = 0, iz = 0){ let s = sec; while(s > 0){ const d = Math.min(.05, s); if(ix || iz){ keys.r = ix > 0; keys.l = ix < 0; keys.b = iz > 0; keys.f = iz < 0; } tick(d, true); s -= d; } for(const k in keys) keys[k] = false; },
  walk(x, z, sec = 6){ const goal = { x, z }; let s = sec; while(s > 0 && Math.hypot(me.x - goal.x, me.z - goal.z) > .3){ const dx = goal.x - me.x, dz = goal.z - me.z, d = Math.hypot(dx, dz); physStep(me, .05, dx / d, dz / d, false); for(const a of ACT.values()) if(a !== me && a.kind === 'bot' && authority()){ const c = botCtl(a, .05); physStep(a, .05, c.x, c.z, c.j); } if(authority()) simRound(.05); s -= .05; } return actInfo(me); },
  jump(){ jumpQ = true; }, catchMe(why = 'water'){ catchActor(me, why); },
  setWind(a){ EVS.wa = a; EVS.wNext = 999; }, get evs(){ return { wl:EVS.wl, wa:EVS.wa, wg:EVS.wg, lava:EVS.lava, snow:EVS.snow.length, cand:EVS.cand.length, drop:EVS.drop.length, bub:EVS.bub.length, frogs:EVS.frogs.length, frogY:EVS.frogs.map(f => r2(f.y)) }; },
  spawn(k){ if(k === 'snow') spawnSnowball(); else if(k === 'bubble') spawnBubble(); else if(k === 'drop') spawnDrop(); else if(k === 'candy') spawnCandy(); },
  candyAt(x, z){ const land = topAt(x, z); EVS.cand.push({ id:++EVS.id, x, z, land, y:land, vy:0, ld:1, life:14, col:CANDY_COL[0] }); },
  dropAt(x, z){ EVS.drop.push({ id:++EVS.id, x, z, y:topAt(x, z), t:1.6, hit:0, life:0, col:CANDY_COL[1] }); },
  snowAt(x, z){ const sx = x - 7, sz = z; EVS.snow.push({ id:++EVS.id, x:sx, z:sz, vx:7, vz:0, r:1.2, rot:0 }); },
  bubbleAt(x, y, z){ EVS.bub.push({ id:++EVS.id, x, z, y, by:y, r:1, a:0, sp:0, t:0, ph:0, vx:0, vz:0 }); },
  emote:e => myEmote(e), get emotes(){ return emos.map(o => ({ who:o.a.id, e:o.el.textContent })); },
  highs, perches:perches.length, get houses(){ return houses.map(h => ({ x0:h.x0, x1:h.x1, z0:h.z0, z1:h.z1, door:h.door, inside:h.inside, fade:h.fade, roof:h.roof.visible })); }, BAL, PIER, spawns,
  topAt, sheltered:() => { me.shelT = 0; return sheltered(me, 0); },
  save:() => JSON.parse(JSON.stringify(SAVE)), saveNow:() => persist(), lastGain:() => lastGain,
  get mp(){ return { code:MP.code, active:mpActive(), isHost:MP.isHost, id:MP.id, players:MP.players.map(p => ({ id:p.id, hero:p.hero })), remotes:[...ACT.values()].filter(a => a.kind === 'remote').map(actInfo) }; },
  get fps(){ return fps; }, get dpr(){ return dpr; }, get rot(){ return ROT; }, get shadows(){ return renderer.shadowMap.enabled; },
  shot(v){ closeup = v ? { px:v[0], py:v[1], pz:v[2], lx:v[3], ly:v[4], lz:v[5] } : null; if(v){ camPos.set(v[0], v[1], v[2]); camLook.set(v[3], v[4], v[5]); } },
  cam(yaw, pAdj){ cam.yaw = yaw; if(pAdj != null) cam.pAdj = pAdj; snapCam = true; },
  hud(on){ hudEl.style.visibility = on ? '' : 'hidden'; }
};

/* ---------- boot ---------- */
ensureMe('me');
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
