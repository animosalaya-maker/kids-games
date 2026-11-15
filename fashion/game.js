/* Bobo Fashion Show («عرض أزياء بوبو 👗») — main game.
   A round: a theme card («يوم بالبحر 🏖️»…) → 2 minutes in the dressing room (8 slots, colours and prints, a mirror) →
   everyone walks the runway in turn (pose button, spotlights, confetti) while the others give 1–5 stars → podium.
   Single player: 3 bots who dress by the theme's tags and vote. Wardrobe: new pieces unlock with «نجمات الموضة».
   Online rooms of up to 4 (Supabase presence like garden/pets; ?mp=local = BroadcastChannel), bots fill the empty places;
   the room owner (host) decides the theme, the timer, the walk order and counts the votes. */
import * as THREE from '../adventure3d/three.module.min.js';
import { makeKit } from '../worlds/kit.js';
import { makeWardrobe } from './items.js';

const $ = s => document.querySelector(s);
{ const md = document.querySelector('meta[name="description"]'), dl = window.I18N && md && md.getAttribute('data-' + I18N.lang); if(dl) md.setAttribute('content', dl); }
const N = n => window.I18N ? I18N.num(n) : String(n);
const RTL = (window.I18N ? I18N.dir : 'rtl') === 'rtl';
const rawGet = k => { try{ return localStorage.getItem(k); }catch(e){ return null; } };
const rawSet = (k, v) => { try{ localStorage.setItem(k, v); }catch(e){} };
const K = makeKit(THREE);
const { Merge, G:GEO, canvasTex, HEROES, HERO_IDS, HERO_NAME, HERO_COLOR, poseHero, starGeo } = K;
const W = makeWardrobe(THREE, K);
const { COLORS, PRINTS, SLOTS, SLOT_IDS, ITEMS, BY_SLOT, THEMES } = W;
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const ease = t => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
const pick = a => a[Math.floor(Math.random() * a.length)];
const shuffle = a => { a = a.slice(); for(let i = a.length - 1; i > 0; i--){ const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const charImg = id => '../worlds/chars/' + (HEROES[id] ? id : 'sara') + '.png';
const QS = new URLSearchParams(location.search);
const MP_LOCAL = QS.get('mp') === 'local';
const FSTAR = '🌟';
const mmss = s => { s = Math.max(0, Math.ceil(s)); return N(Math.floor(s / 60)) + ':' + String(s % 60).padStart(2, '0'); };

/* ======================================================================
   Rules and numbers
   ====================================================================== */
const THEME_T = 4.5, DRESS_T = 120, TURN_T = 10.4, RESULTS_T = 2.8, NSLOT = 4;
const PLACE_STARS = [6, 4, 3, 2], PLACE_COINS = [5, 3, 2, 2];
const POSES = ['star', 'hip', 'wave', 'heart', 'spin', 'peace'];
const POSE_T = 1.3;

/* ---------- save (this device): fashion_save v1 ---------- */
const SAVE_KEY = 'fashion_save' + (MP_LOCAL && /^[a-z]$/.test(QS.get('slot') || '') ? '_' + QS.get('slot') : ''), SAVE_V = 1;
function freshSave(){ return { v:SAVE_V, stars:0, owned:[], prints:[], hero:null, tut:0, rounds:0, wins:0, last:W.cloneOutfit(W.BASIC), best:0 }; }
function loadSave(){
  try{
    const v = JSON.parse(rawGet(SAVE_KEY));
    if(v && typeof v === 'object' && v.v === SAVE_V){
      const s = Object.assign(freshSave(), v);
      s.stars = clamp(Math.floor(+s.stars || 0), 0, 99999);
      s.owned = Array.isArray(v.owned) ? [...new Set(v.owned.filter(id => ITEMS[id] && ITEMS[id].price > 0))] : [];
      s.prints = Array.isArray(v.prints) ? [...new Set(v.prints.filter(i => (i | 0) === i && PRINTS[i] && PRINTS[i].price > 0))] : [];
      s.tut = clamp(s.tut | 0, 0, 99); s.rounds = clamp(s.rounds | 0, 0, 999999); s.wins = clamp(s.wins | 0, 0, 999999); s.best = clamp(+s.best || 0, 0, 5);
      s.last = W.okOutfit(v.last);
      return s;
    }
  }catch(e){}
  return null;
}
let SAVE = loadSave() || freshSave();
function persist(){ rawSet(SAVE_KEY, JSON.stringify(SAVE)); }
let heroId = HERO_IDS.includes(SAVE.hero) ? SAVE.hero : HERO_IDS.includes(rawGet('worlds_hero')) ? rawGet('worlds_hero') : 'sara';
const owns = id => { const it = ITEMS[id]; return !!it && (!it.price || SAVE.owned.includes(id)); };
const ownsPrint = i => !PRINTS[i].price || SAVE.prints.includes(i);

/* ---------- Always-landscape stage ---------- */
const stage = $('#stage'), saProbe = $('#saProbe');
let ROT = false, VW = innerWidth, SW = innerWidth, SH = innerHeight, SAL = 0, SAB = 0, PW = 0;
function layout(){
  VW = innerWidth; const vh = innerHeight; ROT = vh > VW;
  SW = ROT ? vh : VW; SH = ROT ? VW : vh;
  const st = stage.style;
  st.width = SW + 'px'; st.height = SH + 'px';
  st.transform = ROT ? `translateX(${VW}px) rotate(90deg)` : 'none';
  st.setProperty('--sw', SW + 'px'); st.setProperty('--sh', SH + 'px');
  stage.classList.toggle('rot', ROT); stage.classList.toggle('short', SH <= 520); stage.classList.toggle('rtl', RTL);
  SAL = saProbe.offsetWidth; SAB = saProbe.offsetHeight;
  PW = Math.round(Math.min(SW * .5, 470)); st.setProperty('--pw', PW + 'px');
}
function toLayer(cx, cy){ return ROT ? { x:cy, y:VW - cx } : { x:cx, y:cy }; }
layout();

/* ---------- Sound (tiny synth, no files) + an upbeat runway tune ---------- */
let actx = null, muted = rawGet('adv3d_muted') === 'true';
function ac(){
  if(!actx){ try{ actx = new (window.AudioContext || window.webkitAudioContext)(); }catch(e){ actx = null; } }
  if(actx && actx.state === 'suspended') actx.resume().catch(() => {});
  return actx;
}
function tone(freq, dur, type, vol, delay, toFreq, out){
  if(muted) return; const a = ac(); if(!a) return;
  const t0 = delay && typeof delay === 'object' ? delay.at : a.currentTime + (delay || 0), o = a.createOscillator(), g = a.createGain();
  o.type = type || 'sine'; o.frequency.setValueAtTime(freq, t0);
  if(toFreq) o.frequency.exponentialRampToValueAtTime(toFreq, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol || 0.15, t0 + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(out || a.destination); o.start(t0); o.stop(t0 + dur + 0.05);
}
let noiseBuf = null;
function noise(t0, dur, vol, hp, out){
  const a = actx; if(!a || muted) return;
  if(!noiseBuf){ noiseBuf = a.createBuffer(1, a.sampleRate * .3, a.sampleRate); const d = noiseBuf.getChannelData(0); for(let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
  const s = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain();
  s.buffer = noiseBuf; f.type = 'highpass'; f.frequency.value = hp || 6000;
  g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  s.connect(f).connect(g).connect(out || a.destination); s.start(t0); s.stop(t0 + dur + .02);
}
const SFX = {
  tap(){ tone(520, .05, 'triangle', .08); }, bonk(){ tone(300, .14, 'square', .05, 0, 140); },
  wear(){ tone(660, .07, 'triangle', .09); tone(990, .09, 'triangle', .08, .06); tone(1320, .12, 'sine', .06, .12); },
  buy(){ [660, 880, 1100, 1320].forEach((f, i) => tone(f, .11, 'triangle', .1, i * .06)); },
  star(){ [1046, 1318, 1568, 2093].forEach((f, i) => tone(f, .09, 'triangle', .08, i * .05)); },
  vote(n){ for(let i = 0; i < n; i++) tone(880 + i * 160, .08, 'triangle', .07, i * .05); },
  pose(){ tone(1200, .05, 'square', .04); noise(ac() ? actx.currentTime : 0, .12, .12, 3000); tone(1568, .15, 'sine', .06, .05); },
  flag(){ [523, 659, 784].forEach((f, i) => tone(f, .16, 'triangle', .12, i * .08)); },
  tick(){ tone(1400, .04, 'square', .035); },
  ding(){ tone(1568, .25, 'sine', .1); tone(2093, .3, 'sine', .07, .1); },
  fanfare(){ [523, 659, 784, 1046, 784, 1046].forEach((f, i) => tone(f, i === 5 ? .5 : .14, 'triangle', .11, i * .12)); },
  drum(){ const a = ac(); if(!a) return; for(let i = 0; i < 20; i++) noise(a.currentTime + i * .1, .08, .05 + i * .004, 900); },
  cheer(){ const a = ac(); if(!a) return; for(let i = 0; i < 8; i++) noise(a.currentTime + i * .06, .25, .05, 1800); }
};
/* music: C – Am – F – G, 112 bpm, bass + plucks + soft hats + a little melody */
const MUS = { want:0, lvl:0, next:0, step:0, gain:null, iv:0 };
const midi = m => 440 * Math.pow(2, (m - 69) / 12);
const PROG = [[48, 52, 55], [45, 48, 52], [41, 45, 48], [43, 47, 50]];
const MEL = [[76, 0, 79, 0, 81, 79, 76, 0, 74, 0, 76, 0, 72, 0, 0, 0], [72, 0, 76, 0, 79, 76, 72, 0, 71, 0, 72, 0, 69, 0, 0, 0],
             [69, 0, 72, 0, 77, 76, 74, 0, 72, 0, 74, 0, 76, 0, 0, 0], [74, 0, 79, 0, 83, 81, 79, 0, 77, 0, 76, 0, 74, 0, 71, 0]];
function musicTick(){
  const a = actx; if(!a || a.state !== 'running') return;
  if(!MUS.gain){ MUS.gain = a.createGain(); MUS.gain.gain.value = 0; MUS.gain.connect(a.destination); MUS.next = a.currentTime + .1; }
  const target = muted ? 0 : MUS.want * .55;
  MUS.gain.gain.setTargetAtTime(target, a.currentTime, .4);
  if(target <= 0 && MUS.gain.gain.value < .01){ MUS.next = a.currentTime + .1; return; }
  const st = 60 / 112 / 4;
  if(MUS.next < a.currentTime) MUS.next = a.currentTime + .05;
  while(MUS.next < a.currentTime + .25){
    const s = MUS.step % 16, bar = Math.floor(MUS.step / 16) % 4, cyc = Math.floor(MUS.step / 64) % 2, ch = PROG[bar], t = MUS.next, out = MUS.gain;
    if(s === 0 || s === 8 || s === 11) tone(midi(ch[0] - 12), .22, 'triangle', .16, { at:t }, 0, out);
    if(s % 2 === 0) tone(midi(ch[(s / 2) % 3] + 12), .12, 'square', .022, { at:t }, 0, out);
    if(s % 4 === 2) noise(t, .04, .05, 7000, out);
    if(s === 4 || s === 12) noise(t, .09, .08, 1500, out);
    const m = MEL[bar][s]; if(cyc === 1 && m) tone(midi(m), .2, 'sine', .07, { at:t }, 0, out);
    MUS.next += st; MUS.step++;
  }
}
setInterval(musicTick, 60);

/* ---------- Renderer ---------- */
const canvas = $('#cv');
let renderer;
try{ renderer = new THREE.WebGLRenderer({ canvas, antialias:true, powerPreference:'high-performance' }); }
catch(e){ $('#nogl').hidden = false; $('#overlay').hidden = true; throw e; }
let dpr = Math.min(window.devicePixelRatio || 1, 1.5);
renderer.setPixelRatio(dpr);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene();
const BG = new THREE.Color(0x2a1338);
scene.background = BG; scene.fog = new THREE.Fog(0x2a1338, 28, 70);
const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 300);
function resize(){
  layout();
  renderer.setSize(SW, SH, false);
  camera.aspect = SW / SH; camera.updateProjectionMatrix();
  applyViewOffset();
}
addEventListener('resize', resize);
addEventListener('orientationchange', () => setTimeout(resize, 120));
const hemi = new THREE.HemisphereLight(0xfff0f6, 0x6a4a7a, 1.2); scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff2e6, 1.6);
sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024); sun.shadow.bias = -.0006; sun.shadow.normalBias = .02;
Object.assign(sun.shadow.camera, { left:-9, right:9, top:9, bottom:-9, near:1, far:60 }); sun.shadow.camera.updateProjectionMatrix();
scene.add(sun); scene.add(sun.target);
function aimSun(x, z){ sun.target.position.set(x, 0, z); sun.position.set(x + 6, 16, z + 9); }
/* two coloured spotlights for the runway + a warm light in the dressing room */
const spots = [0, 1].map(i => { const s = new THREE.SpotLight(0xffffff, 0, 40, .32, .55, 1.2); s.position.set(i ? 5 : -5, 9, 6); scene.add(s); scene.add(s.target); return s; });
const roomLamp = new THREE.PointLight(0xffe2c8, 0, 14, 1.4); scene.add(roomLamp);
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _s = new THREE.Vector3(), _v = new THREE.Vector3(), _c = new THREE.Color();
const MAT = K.rimify(new THREE.MeshLambertMaterial({ vertexColors:true }), .15);
const GLOSS = new THREE.MeshStandardMaterial({ vertexColors:true, roughness:.42, metalness:.05 });
function meshOf(M, cast = true, receive = true, mat = MAT){ const m = new THREE.Mesh(M.geometry(), mat); m.castShadow = cast; m.receiveShadow = receive; return m; }

/* ---------- Confetti (instanced little paper squares) ---------- */
const PMAX = 360, parts = [], pMesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(.11, .07), new THREE.MeshBasicMaterial({ side:THREE.DoubleSide }), PMAX);
pMesh.frustumCulled = false; scene.add(pMesh);
for(let i = 0; i < PMAX; i++){ parts.push({ life:0, x:0, y:0, z:0, vx:0, vy:0, vz:0, s:1, r:0, rv:0 }); pMesh.setColorAt(i, _c.set(0xffffff)); _m.makeScale(0, 0, 0); pMesh.setMatrixAt(i, _m); }
let pNext = 0;
const CONFETTI = [0xffc23d, 0xff8fb1, 0x6cc4ff, 0xffffff, 0xb99cff];
function burst(x, y, z, n, colors = CONFETTI, speed = 4, up = 3){
  for(let k = 0; k < n; k++){
    const p = parts[pNext], i = pNext; pNext = (pNext + 1) % PMAX;
    const a = Math.random() * 6.28, u = Math.random();
    p.life = 1.6 + Math.random() * 1.4; p.x = x; p.y = y; p.z = z; p.vx = Math.cos(a) * u * speed; p.vz = Math.sin(a) * u * speed; p.vy = up + Math.random() * speed; p.s = .8 + Math.random() * .7; p.r = Math.random() * 6; p.rv = (Math.random() - .5) * 14;
    pMesh.setColorAt(i, _c.set(pick(colors)));
  }
  pMesh.instanceColor.needsUpdate = true;
}
function updateParts(dt){
  for(let i = 0; i < PMAX; i++){
    const p = parts[i]; if(p.life <= 0) continue;
    p.life -= dt; p.vy = Math.max(p.vy - 9 * dt, -1.4); p.vx *= 1 - dt * 1.5; p.vz *= 1 - dt * 1.5;
    p.x += p.vx * dt + Math.sin(p.r) * dt * .3; p.y += p.vy * dt; p.z += p.vz * dt; p.r += p.rv * dt;
    const s = p.life > 0 ? p.s * Math.min(1, p.life * 2) : 0;
    _m.compose(_v.set(p.x, p.y, p.z), _q.setFromEuler(_e.set(p.r, p.r * .7, p.r * .3)), _s.set(s, s, s)); pMesh.setMatrixAt(i, _m);
  }
  pMesh.instanceMatrix.needsUpdate = true;
}

/* ======================================================================
   The stage: runway (around the origin) and the dressing room (off to the side at DR.x)
   ====================================================================== */
const RUN = { top:.45, z0:-12.4, zm:-5.2, ze:2.0, endZ:2.3, endR:2.15, w:2.3 };
const DR = { x:60, z:0, mz:-2.7 };
const SIDE = [[-3.15, -1.6], [3.15, -1.6], [-3.15, -5.0], [3.15, -5.0]];
const PODIUM = [{ x:0, z:2.25, h:.62 }, { x:-1.12, z:2.4, h:.4 }, { x:1.12, z:2.4, h:.24 }, { x:1.9, z:3.0, h:0 }];
const world = new THREE.Group(); scene.add(world);
const glowT = canvasTex(64, 64, (x, w) => { const g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.35, 'rgba(255,255,255,.5)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, w, w); });
const beamT = canvasTex(8, 128, (x) => { const g = x.createLinearGradient(0, 0, 0, 128); g.addColorStop(0, 'rgba(255,255,255,.0)'); g.addColorStop(.6, 'rgba(255,255,255,.35)'); g.addColorStop(1, 'rgba(255,255,255,.75)'); x.fillStyle = g; x.fillRect(0, 0, 8, 128); });
let seed = 7;
const srnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const beams = [], bulbs = [], fans = { mesh:null, list:[] }, flashes = [];
let podiumGrp = null, curtainGrp = null, mirrorGlass = null;
function buildStage(){
  const M = new Merge(), GM = new Merge();
  /* floor: plum carpet + a glossy runway with a round end */
  const floorTex = canvasTex(256, 256, x => { x.fillStyle = '#4a2560'; x.fillRect(0, 0, 256, 256); x.fillStyle = 'rgba(255,255,255,.05)'; for(let i = 0; i < 60; i++){ x.beginPath(); x.arc((i * 73) % 256, (i * 41) % 256, 2 + (i % 3), 0, 6.3); x.fill(); } });
  floorTex.wrapS = floorTex.wrapT = THREE.RepeatWrapping; floorTex.repeat.set(10, 10);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), new THREE.MeshStandardMaterial({ map:floorTex, roughness:.9 }));
  floor.rotation.x = -Math.PI / 2; floor.position.set(0, 0, -4); floor.receiveShadow = true; world.add(floor);
  const len = RUN.endZ - RUN.z0 + 1.5;
  GM.add(GEO.box, 0, RUN.top / 2, (RUN.z0 - 1.5 + RUN.endZ) / 2, RUN.w, RUN.top, len, 0, 0, 0, 0xe9c6d8);
  GM.add(GEO.cyl, 0, RUN.top / 2, RUN.endZ, RUN.endR, RUN.top, RUN.endR, 0, 0, 0, 0xe9c6d8);
  M.add(GEO.box, 0, RUN.top / 2 - .02, (RUN.z0 - 1.5 + RUN.endZ) / 2, RUN.w + .16, RUN.top - .04, len, 0, 0, 0, 0xd9a43a);
  M.add(GEO.cyl, 0, RUN.top / 2 - .02, RUN.endZ, RUN.endR + .08, RUN.top - .04, RUN.endR + .08, 0, 0, 0, 0xd9a43a);
  M.add(GEO.cyl, 0, RUN.top + .005, RUN.endZ, RUN.endR * .62, .01, RUN.endR * .62, 0, 0, 0, 0xffd6e6);
  // light strips along the runway edge (one warm colour)
  for(let z = RUN.z0 - 1; z < RUN.endZ - 1.5; z += .55) for(const s of [-1, 1]) bulbs.push([s * (RUN.w / 2 + .02), RUN.top - .06, z, .055]);
  for(let i = 0; i < 26; i++){ const a = -Math.PI * .92 + i / 25 * Math.PI * 1.84; bulbs.push([Math.sin(a) * (RUN.endR + .1), RUN.top - .06, RUN.endZ - Math.cos(a) * (RUN.endR + .1), .055]); }
  /* back wall: velvet curtain, a gold arch with bulbs, a big star */
  const BZ = RUN.z0 - 1.6;
  M.add(GEO.box, 0, 4, BZ - .6, 30, 8, .4, 0, 0, 0, 0x2a1036);
  curtainGrp = new THREE.Group();
  const CM = new Merge();
  for(let i = -24; i <= 24; i++){ const x = i * .3; if(Math.abs(x) < 1.25) continue; CM.add(GEO.cyl8, x, 3.2, BZ - .2 + (i % 2) * .06, .19, 6.4, .12, 0, 0, 0, i % 2 ? 0xa3306f : 0x8e2864); }
  for(const s of [-1, 1]) for(let i = 0; i < 4; i++) CM.add(GEO.cyl8, s * (.45 + i * .26), 3.2, BZ - .35, .17, 6.4, .1, 0, 0, 0, i % 2 ? 0x5e1a48 : 0x6a1e52);
  curtainGrp.add(meshOf(CM, false, true)); world.add(curtainGrp);
  M.add(GEO.box, 0, 1.6, BZ - .3, 2.6, 3.2, .1, 0, 0, 0, 0x14081c);   // the dark doorway behind the curtain gap
  for(const s of [-1, 1]) M.add(GEO.box, s * 1.45, 1.75, BZ - .05, .22, 3.5, .22, 0, 0, 0, 0xe2b33c);
  M.add(new THREE.TorusGeometry(1.45, .11, 8, 30, Math.PI), 0, 3.5, BZ - .05, 1, .55, 1, 0, 0, 0, 0xe2b33c);
  for(let i = 0; i < 9; i++) bulbs.push([-1.45, .4 + i * .38, BZ + .08, .06]), bulbs.push([1.45, .4 + i * .38, BZ + .08, .06]);
  for(let i = 1; i < 12; i++){ const a = Math.PI - i / 12 * Math.PI; bulbs.push([Math.cos(a) * 1.45, 3.5 + Math.sin(a) * .8, BZ + .08, .06]); }
  M.add(starGeo, 0, 5.05, BZ - .05, .55, .55, .4, 0, 0, 0, 0xffc23d);
  for(const s of [-1, 1]) M.add(starGeo, s * 3.6, 5.6, BZ - .3, .3, .3, .25, 0, 0, s * .3, 0xffe08a);
  /* side banners in one colour each */
  for(const s of [-1, 1]) for(let i = 0; i < 3; i++) M.add(GEO.box, s * (5 + i * 3), 4.2, BZ - .3, 1.2, 3.2, .06, 0, 0, 0, i % 2 ? 0xff8fb1 : 0xb99cff);
  /* light towers with spot heads */
  for(const s of [-1, 1]) for(const z of [-9, -1]){
    M.add(GEO.box, s * 5.6, 3.5, z, .18, 7, .18, 0, 0, 0, 0x6c5a78);
    M.add(GEO.cyl, s * 5.35, 6.4, z, .26, .45, .26, .9, 0, s * .8, 0x2e2638);
    bulbs.push([s * 5.15, 6.25, z + .2, .2]);
  }
  /* audience rows (seats) */
  for(const s of [-1, 1]) for(let r = 0; r < 3; r++) for(let z = -10.5; z <= 3.5; z += .9){
    M.add(GEO.box, s * (4.4 + r * 1.05), .25 + r * .25, z, .8, .5 + r * .5, .75, 0, 0, 0, 0x5b2a6e);
    M.add(GEO.box, s * (4.75 + r * 1.05), .65 + r * .25, z, .14, .5, .72, 0, 0, 0, 0x6b3480);
  }
  world.add(meshOf(M)); world.add(meshOf(GM, false, true, GLOSS));
  /* the fans: little round people in the seats who bob and clap */
  const FB = new Merge(); FB.add(GEO.cyl, 0, .25, 0, .2, .5, .17); FB.add(GEO.sph, 0, .5, 0, .2, .08, .17);
  const FH = new Merge(); FH.add(GEO.sph, 0, .68, 0, .19, .19, .19); FH.add(GEO.sph, -.075, .71, .165, .032, .036, .02, 0, 0, 0, 0x2a1830); FH.add(GEO.sph, .075, .71, .165, .032, .036, .02, 0, 0, 0, 0x2a1830);
  const fanCols = [0xffd2b0, 0xe8b08a, 0xc68a62, 0x9a6440, 0xffe0c8];
  const fanTop = [0xff8fb1, 0x6cc4ff, 0xffd23f, 0x5ed6a0, 0xb99cff, 0xffffff, 0xff9a3c];
  for(const s of [-1, 1]) for(let r = 0; r < 3; r++) for(let z = -10.5; z <= 3.5; z += .9){ if(srnd() < .22) continue; fans.list.push({ x:s * (4.3 + r * 1.05), y:.5 + r * .5, z, f:-s * Math.PI / 2, ph:srnd() * 6, c:fanTop[Math.floor(srnd() * fanTop.length)], k:fanCols[Math.floor(srnd() * fanCols.length)] }); }
  // vertex colour (white, dark eyes) × instance colour (shirt / skin)
  fans.mesh = new THREE.InstancedMesh(FB.geometry(), new THREE.MeshLambertMaterial({ vertexColors:true }), fans.list.length);
  fans.head = new THREE.InstancedMesh(FH.geometry(), new THREE.MeshLambertMaterial({ vertexColors:true }), fans.list.length);
  fans.list.forEach((f, i) => { fans.mesh.setColorAt(i, _c.set(f.c)); fans.head.setColorAt(i, _c.set(f.k)); });
  world.add(fans.mesh); world.add(fans.head);
  /* light beams (soft cones) */
  for(let i = 0; i < 2; i++){
    const b = new THREE.Mesh(new THREE.CylinderGeometry(.06, .95, 1, 24, 1, true), new THREE.MeshBasicMaterial({ map:beamT, transparent:true, opacity:.5, blending:THREE.AdditiveBlending, depthWrite:false, side:THREE.DoubleSide, fog:false }));
    b.geometry.translate(0, -.5, 0); b.renderOrder = 4; world.add(b); beams.push(b);
  }
  /* camera flashes in the crowd */
  for(let i = 0; i < 10; i++){ const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map:glowT, color:0xffffff, transparent:true, depthWrite:false, blending:THREE.AdditiveBlending, opacity:0 })); sp.scale.setScalar(.7); world.add(sp); flashes.push({ sp, t:0 }); }
  /* podium (shown at the end) */
  podiumGrp = new THREE.Group(); podiumGrp.visible = false; world.add(podiumGrp);
  const PM = new Merge(), pcol = [0xffc23d, 0xdfe6f2, 0xe0a06a];
  PODIUM.slice(0, 3).forEach((p, i) => {
    PM.add(GEO.box, p.x, RUN.top + p.h / 2, p.z, .95, p.h, .95, 0, 0, 0, pcol[i]);
    const num = new THREE.Mesh(new THREE.PlaneGeometry(.5, .5), new THREE.MeshBasicMaterial({ map:canvasTex(64, 64, x => { x.fillStyle = '#fff'; x.font = 'bold 54px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(String(i + 1), 32, 36); }), transparent:true }));
    num.position.set(p.x, RUN.top + p.h / 2, p.z + .48); podiumGrp.add(num);
  });
  podiumGrp.add(meshOf(PM));
  /* bulbs: one instanced mesh of glowing warm spheres + soft halos */
  const bm = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 8, 6), new THREE.MeshBasicMaterial({ color:0xfff1c4 }), bulbs.length);
  bulbs.forEach((b, i) => { _m.compose(_v.set(b[0], b[1], b[2]), _q.identity(), _s.setScalar(b[3])); bm.setMatrixAt(i, _m); });
  world.add(bm);
}

/* ---------- the dressing room: pastel walls, a big mirror (a mirrored copy of the room behind the glass), a clothes rail ---------- */
const room = new THREE.Group(); scene.add(room);
function buildRoom(){
  const M = new Merge(), x0 = DR.x, mz = DR.mz;
  const woodTex = canvasTex(256, 256, x => { x.fillStyle = '#f2d8b8'; x.fillRect(0, 0, 256, 256); x.fillStyle = 'rgba(160,110,70,.18)'; for(let i = 0; i < 8; i++) x.fillRect(0, i * 32, 256, 2); for(let i = 0; i < 16; i++) x.fillRect(((i * 97) % 256), Math.floor(i / 2) * 32, 2, 32); });
  woodTex.wrapS = woodTex.wrapT = THREE.RepeatWrapping; woodTex.repeat.set(4, 6);
  const fl = new THREE.Mesh(new THREE.PlaneGeometry(9, 26), new THREE.MeshLambertMaterial({ map:woodTex })); fl.rotation.x = -Math.PI / 2; fl.position.set(x0, 0, mz - 2.6); fl.receiveShadow = true; room.add(fl);
  M.add(GEO.box, x0, 4.05, mz - 2.6, 9, .1, 26, 0, 0, 0, 0xfff3f7);   // ceiling
  const WALL = 0xffd6e4, WALL2 = 0xffe8f0;
  // back wall with a hole for the mirror (mirror: 2.6 wide, from y .25 to 2.75)
  const mw = 1.3, mt = 2.75, mb = .25;
  M.add(GEO.box, x0 - (4.5 + mw) / 2, 2, mz, 4.5 - mw, 4, .12, 0, 0, 0, WALL); M.add(GEO.box, x0 + (4.5 + mw) / 2, 2, mz, 4.5 - mw, 4, .12, 0, 0, 0, WALL);
  M.add(GEO.box, x0, (4 + mt) / 2, mz, mw * 2, 4 - mt, .12, 0, 0, 0, WALL); M.add(GEO.box, x0, mb / 2, mz, mw * 2, mb, .12, 0, 0, 0, WALL);
  // side walls (long, so the mirrored room behind the glass has walls too) + the wall behind the camera, mirrored
  for(const s of [-1, 1]) M.add(GEO.box, x0 + s * 4.5, 2, mz - 2.5, .12, 4, 19, 0, 0, 0, WALL2);
  M.add(GEO.box, x0, 2, 2 * mz - 6.5, 9, 4, .12, 0, 0, 0, WALL);   // the reflected far wall
  M.add(GEO.box, x0, 2, 6.5, 9, 4, .12, 0, 0, 0, WALL);
  // mirror frame (gold, rounded top) + bulbs
  for(const s of [-1, 1]) M.add(GEO.box, x0 + s * (mw + .06), (mt + mb) / 2, mz + .08, .12, mt - mb + .1, .08, 0, 0, 0, 0xe2b33c);
  M.add(GEO.box, x0, mt + .05, mz + .08, mw * 2 + .24, .12, .08, 0, 0, 0, 0xe2b33c); M.add(GEO.box, x0, mb - .05, mz + .08, mw * 2 + .24, .12, .08, 0, 0, 0, 0xe2b33c);
  // clothes rail on the left with garments in single colours
  const rx = x0 - 3.1, rz = mz + 1.1;
  M.add(GEO.cyl8, rx, 1.9, rz, .03, .03, 2.2, Math.PI / 2, 0, 0, 0xd0d4dc);
  for(const dz of [-1.1, 1.1]) M.add(GEO.cyl8, rx, .95, rz + dz, .03, 1.9, .03, 0, 0, 0, 0xd0d4dc), M.add(GEO.box, rx, .03, rz + dz, .5, .04, .1, 0, 0, 0, 0xd0d4dc);
  const gar = [0xff8fb1, 0x6cc4ff, 0xffd23f, 0x9c7be3, 0x5ed6a0, 0xffffff, 0xe8304f, 0x3a62d0];
  gar.forEach((c, i) => { const z = rz - .9 + i * .26; M.add(GEO.box, rx, 1.48, z, .42, .76, .05, 0, 0, (i % 2 - .5) * .06, c); M.add(GEO.box, rx, 1.87, z, .2, .04, .02, 0, 0, 0, 0xa0a6b4); });
  // a vanity table with a round mirror on the right
  const vx = x0 + 3.2, vz = mz + .9;
  M.add(GEO.box, vx, .78, vz, .9, .08, 1.3, 0, 0, 0, 0xffffff); for(const a of [-1, 1]) for(const b of [-1, 1]) M.add(GEO.cyl8, vx + a * .35, .38, vz + b * .55, .04, .76, .04, 0, 0, 0, 0xe2b33c);
  M.add(GEO.torus, vx + .3, 1.55, vz, .45, .45, .7, 0, Math.PI / 2, 0, 0xe2b33c);
  M.add(GEO.cyl, vx + .1, .87, vz - .3, .07, .1, .07, 0, 0, 0, 0xff8fb1); M.add(GEO.sph, vx + .1, .97, vz + .25, .09, .09, .09, 0, 0, 0, 0xb99cff);
  // hat boxes and a plant
  M.add(GEO.cyl, x0 + 2.6, .22, mz + 2.6, .32, .44, .32, 0, 0, 0, 0xff8fb1).add(GEO.cyl, x0 + 2.6, .46, mz + 2.6, .34, .05, .34, 0, 0, 0, 0xffffff);
  M.add(GEO.cyl, x0 + 2.6, .7, mz + 2.6, .24, .4, .24, 0, 0, 0, 0x6cc4ff).add(GEO.cyl, x0 + 2.6, .9, mz + 2.6, .26, .04, .26, 0, 0, 0, 0xffffff);
  M.add(GEO.cyl, x0 - 2.3, .25, mz + .5, .25, .5, .25, 0, 0, 0, 0xffffff); for(let i = 0; i < 7; i++) M.add(GEO.sph, x0 - 2.3 + Math.sin(i) * .18, .7 + (i % 3) * .14, mz + .5 + Math.cos(i * 2) * .14, .2, .14, .2, 0, 0, 0, 0x4fae6a);
  // a round rug + pedestal (and their reflections behind the glass)
  for(const z of [0, 2 * mz]){
    M.add(GEO.cyl, x0, .01, z, 1.4, .02, 1.4, 0, 0, 0, 0xc9a2ff); M.add(GEO.cyl, x0, .02, z, 1.1, .02, 1.1, 0, 0, 0, 0xe3cfff);
    M.add(GEO.cyl, x0, .07, z, .7, .14, .7, 0, 0, 0, 0xffffff); M.add(GEO.cyl, x0, .145, z, .72, .02, .72, 0, 0, 0, 0xe2b33c);
  }
  // star garland across the top of the back wall (one colour)
  for(let i = 0; i < 11; i++){ const x = x0 - 3.6 + i * .72; M.add(starGeo, x, 3.35 - Math.sin(i / 10 * Math.PI) * .25, mz + .12, .1, .1, .05, 0, 0, 0, 0xffc23d); }
  room.add(meshOf(M));
  const blist = [];
  for(let i = 0; i < 7; i++) for(const s of [-1, 1]) blist.push([x0 + s * (mw + .06), mb + .2 + i * .37, mz + .14]);
  for(let i = 0; i < 7; i++) blist.push([x0 - mw + .2 + i * .37, mt + .06, mz + .14]);
  const bm = new THREE.InstancedMesh(new THREE.SphereGeometry(.055, 8, 6), new THREE.MeshBasicMaterial({ color:0xfff4cc }), blist.length);
  blist.forEach((b, i) => { _m.makeTranslation(b[0], b[1], b[2]); bm.setMatrixAt(i, _m); }); room.add(bm);
  // the glass: a light tint with a soft diagonal sheen
  const sheen = canvasTex(128, 128, x => { x.fillStyle = 'rgba(220,240,255,.16)'; x.fillRect(0, 0, 128, 128); x.fillStyle = 'rgba(255,255,255,.22)'; x.beginPath(); x.moveTo(20, 128); x.lineTo(50, 128); x.lineTo(110, 0); x.lineTo(80, 0); x.fill(); x.beginPath(); x.moveTo(60, 128); x.lineTo(68, 128); x.lineTo(128, 10); x.lineTo(120, 10); x.fill(); });
  mirrorGlass = new THREE.Mesh(new THREE.PlaneGeometry(mw * 2, mt - mb), new THREE.MeshBasicMaterial({ map:sheen, transparent:true, depthWrite:false }));
  mirrorGlass.position.set(x0, (mt + mb) / 2, mz + .01); mirrorGlass.renderOrder = 5; room.add(mirrorGlass);
}

/* ======================================================================
   Characters: one per player slot on the runway, plus «me» in the dressing room and my reflection
   ====================================================================== */
function makeHero(id){ const h = HEROES[HEROES[id] ? id : 'sara'](); K.shadowHero(h); return h; }
const SM = [];                              // slot models: { h, hero, okey, ... }
function slotModel(i, hero, outfit){
  let m = SM[i];
  if(!m || m.hero !== hero){
    if(m && m.h) scene.remove(m.h.grp);
    m = SM[i] = Object.assign(m || {}, { h:makeHero(hero), hero, okey:'', pose:null, x:0, y:0, z:0, f:0, run:0, t:Math.random() * 5 });
    scene.add(m.h.grp);
  }
  const key = W.outfitKey(outfit);
  if(m.okey !== key){ W.dress(m.h, outfit); m.okey = key; }
  m.h.grp.visible = true;
  return m;
}
function hideSlots(){ for(const m of SM) if(m && m.h) m.h.grp.visible = false; }
let ME = null, MR = null, myOutfit = W.cloneOutfit(SAVE.last), meKey = '';
function buildMe(){
  for(const m of [ME, MR]) if(m) room.remove(m.grp);
  ME = makeHero(heroId); MR = makeHero(heroId);
  MR.grp.scale.set(1, 1, -1);
  room.add(ME.grp); room.add(MR.grp); meKey = '';
  dressMe();
}
function dressMe(){
  const k = W.outfitKey(myOutfit); if(k === meKey) return; meKey = k;
  W.dress(ME, myOutfit); W.dress(MR, myOutfit, false);
}
/* a showcase model for the title screen (my character in my last look) */
let SC = null, scKey = '';
function showcase(on){
  if(!on){ if(SC) SC.grp.visible = false; return; }
  const k = heroId + '|' + W.outfitKey(SAVE.last);
  if(!SC || scKey !== k){ if(SC) scene.remove(SC.grp); SC = makeHero(heroId); W.dress(SC, SAVE.last); scene.add(SC.grp); scKey = k; }
  SC.grp.visible = true;
}

/* poses: arms and body on top of the walk animation */
function applyPose(h, k, t, run){
  const e = clamp(Math.min(t * 5, (1 - t) * 5), 0, 1);
  const quad = !h.arms.length;
  const setArm = (a, rx, rz) => { a.rotation.x = lerp(a.rotation.x, rx, e); a.rotation.z = lerp(a.rotation.z, rz, e); };
  if(k === 'spin' || quad){ h.body.rotation.y = ease(clamp(t * 1.4, 0, 1)) * Math.PI * 2; h.body.position.y += Math.sin(clamp(t * 1.4, 0, 1) * Math.PI) * .18; }
  if(quad){ h.head.rotation.z = Math.sin(t * Math.PI * 2) * .3 * e; return; }
  h.arms.forEach(a => {
    const s = a.userData.side;
    if(k === 'star' || k === 'spin') setArm(a, 0, -s * 2.3);
    else if(k === 'hip') setArm(a, .35, -s * .75);
    else if(k === 'heart') setArm(a, -.4, -s * 2.85);
    else if(k === 'wave') { if(s > 0) setArm(a, 0, -2.7 + Math.sin(t * 22) * .35); else setArm(a, .2, .3); }
    else if(k === 'peace') { if(s > 0) setArm(a, -2.5, -.2); else setArm(a, .35, .75); }
  });
  if(k === 'hip' || k === 'peace') h.head.rotation.z = lerp(h.head.rotation.z, .18, e);
  if(k === 'heart') h.head.rotation.x = lerp(h.head.rotation.x, -.15, e);
}
function clapArms(h, t){
  if(!h.arms.length) return;
  h.arms.forEach(a => { const s = a.userData.side; a.rotation.x = -1.25; a.rotation.z = -s * (.15 + Math.abs(Math.sin(t * 9)) * .45) + s * .5; });
}

/* ======================================================================
   Thumbnails: each piece rendered once (in its colour) into a small picture
   ====================================================================== */
const TH = 112, thumbRT = new THREE.WebGLRenderTarget(TH, TH, { samples:0 }), thumbScene = new THREE.Scene(), thumbCam = new THREE.PerspectiveCamera(30, 1, .05, 20);
thumbScene.add(new THREE.HemisphereLight(0xffffff, 0x9a8aa8, 2.2)); { const d = new THREE.DirectionalLight(0xffffff, 1.6); d.position.set(2, 3, 4); thumbScene.add(d); }
const thumbBuf = new Uint8Array(TH * TH * 4), thumbCv = document.createElement('canvas'); thumbCv.width = thumbCv.height = TH;
const thumbCache = {};
const toSRGB = v => { v /= 255; return Math.round(255 * (v <= .0031308 ? v * 12.92 : 1.055 * Math.pow(v, 1 / 2.4) - .055)); };
const SRGB_LUT = new Uint8Array(256).map((_, i) => toSRGB(i));
function thumb(id, c, p){
  const it = ITEMS[id]; if(!it || !it.build) return null;
  const key = id + '_' + c + '_' + p; if(thumbCache[key]) return thumbCache[key];
  const m = W.pieceOnly(it.slot, id, c, p);
  thumbScene.add(m.grp); m.grp.updateMatrixWorld(true);
  const box = new THREE.Box3(); m.grp.traverse(o => { if(o.isMesh){ o.geometry.computeBoundingBox(); const b = o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld); box.union(b); } });
  const ctr = box.getCenter(new THREE.Vector3()), size = box.getSize(new THREE.Vector3()), r = Math.max(size.x, size.y, size.z * .8) * .5 + .02;
  const yaw = it.slot === 'back' ? Math.PI * .85 : .45, dist = r / Math.tan(15 * Math.PI / 180) * 1.05, pit = it.slot === 'top' || it.slot === 'bottom' || it.slot === 'shoes' ? .1 : .28;
  thumbCam.position.set(ctr.x + Math.sin(yaw) * dist, ctr.y + dist * pit, ctr.z + Math.cos(yaw) * dist); thumbCam.lookAt(ctr);
  const old = renderer.getRenderTarget(), oc = renderer.getClearColor(new THREE.Color()), oa = renderer.getClearAlpha(), osh = renderer.shadowMap.autoUpdate;
  renderer.shadowMap.autoUpdate = false;
  renderer.setRenderTarget(thumbRT); renderer.setClearColor(0x000000, 0); renderer.clear(); renderer.render(thumbScene, thumbCam);
  renderer.readRenderTargetPixels(thumbRT, 0, 0, TH, TH, thumbBuf);
  renderer.setRenderTarget(old); renderer.setClearColor(oc, oa); renderer.shadowMap.autoUpdate = osh;
  thumbScene.remove(m.grp); m.grp.traverse(o => { if(o.isMesh) o.geometry.dispose(); });
  const x = thumbCv.getContext('2d'), img = x.createImageData(TH, TH);
  for(let yy = 0; yy < TH; yy++) for(let xx = 0; xx < TH; xx++){
    const si = ((TH - 1 - yy) * TH + xx) * 4, di = (yy * TH + xx) * 4, a = thumbBuf[si + 3];
    img.data[di] = SRGB_LUT[thumbBuf[si]]; img.data[di + 1] = SRGB_LUT[thumbBuf[si + 1]]; img.data[di + 2] = SRGB_LUT[thumbBuf[si + 2]]; img.data[di + 3] = a;
  }
  x.putImageData(img, 0, 0);
  return (thumbCache[key] = thumbCv.toDataURL());
}
/* pictures are drawn a couple per frame (an emoji stands in until then) */
const thumbQ = [];
const itemPic = (id, c, p) => {
  const it = ITEMS[id], key = id + '_' + c + '_' + p;
  if(thumbCache[key]) return `<img src="${thumbCache[key]}" alt="">`;
  if(it && it.build && !thumbQ.some(q => q.key === key)) thumbQ.push({ key, id, c, p });
  return `<span class="em" data-tk="${key}">${it ? it.e : '❓'}</span>`;
};
function thumbPump(){
  const t0 = performance.now();
  while(thumbQ.length && performance.now() - t0 < 14){
    const q = thumbQ.shift(), u = thumb(q.id, q.c, q.p); if(!u) continue;
    document.querySelectorAll(`[data-tk="${q.key}"]`).forEach(el => { const img = document.createElement('img'); img.src = u; img.alt = ''; el.replaceWith(img); });
    if(thumbQ.length && performance.now() - t0 > 6) break;
  }
}

/* ======================================================================
   Aunt Laila + small UI helpers
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
const flashEl = $('#flash');
function flash(){ flashEl.classList.remove('go'); void flashEl.offsetWidth; flashEl.classList.add('go'); }
const LINES = {
  hi:     L('أهلا يا نجم! أنا العمة ليلى 👵 اليوم عرض أزياء! ✨', "Hello superstar! I'm Aunt Laila 👵 Today is a fashion show! ✨", 'Merhaba yıldız! Ben Leyla Teyze 👵 Bugün moda şovu var! ✨'),
  theme:  L('هاد هو الموضوع! البس شي بيناسبو 👀', 'This is the theme! Wear something that fits it 👀', 'Tema bu! Ona uygun bir şey giy 👀'),
  dress:  L('اختار قطعة من فوق 👕 وبعدين لون 🎨 ونقشة', 'Pick a piece above 👕 then a colour 🎨 and a print', 'Yukarıdan bir parça 👕 sonra bir renk 🎨 ve desen seç'),
  dress2: L('اسحب على الشخصية لتلفّها 🔄 وكبّس «جاهز» لما تخلص ✅', 'Swipe on your character to turn it 🔄 and press «Ready» when done ✅', 'Döndürmek için karakteri kaydır 🔄 bitince «Hazır» bas ✅'),
  walk:   L('دورك عالمنصة! كبّس «بوز» لتعمل حركة 💃', "Your turn on the runway! Press «Pose» to strike a pose 💃", 'Podyum sırası sende! Poz vermek için «Poz» bas 💃'),
  vote:   L('عطي نجوم ⭐ للّبسة! من 1 لـ 5', 'Give stars ⭐ to the outfit! From 1 to 5', 'Kıyafete yıldız ⭐ ver! 1 ile 5 arası'),
  podium: L('برافو للكل! 🎉 النجمات بتفتحلك قطع جديدة بالخزانة 👗', 'Well done everyone! 🎉 Stars unlock new pieces in the wardrobe 👗', 'Herkese aferin! 🎉 Yıldızlar dolapta yeni parçalar açar 👗'),
  back:   L('أهلا فيك من جديد بعرض الأزياء! ✨', 'Welcome back to the fashion show! ✨', 'Moda şovuna tekrar hoş geldin! ✨')
};

/* ======================================================================
   The round. The host (or me alone) runs it; others follow the host's «st» snapshots.
   R.slots[i] = { id (player id or null for a bot), hero, bot, c (colour badge), o (outfit), ready }
   ====================================================================== */
const MCOL = ['#ff8fb1', '#6cc4ff', '#5ed6a0', '#ffc23d'];
let R = null, lastTheme = -1, solo = true;
function freshRound(n){ return { n, ph:'lobby', th:0, left:0, slots:[], order:[], turn:0, tt:0, votes:{}, res:null, mine:{} }; }
const isHost = () => solo || MP.isHost;
const mySlot = () => R ? R.slots.findIndex(s => !s.bot && s.id === myPid()) : -1;
const myPid = () => solo ? 'me' : MP.id;
function botHeroes(used, n){ return shuffle(HERO_IDS.filter(h => !used.includes(h))).concat(shuffle(HERO_IDS)).slice(0, n); }
function hostSlots(){
  const humans = solo ? [{ id:'me', hero:heroId, c:0 }] : MP.players.map(p => ({ id:p.id, hero:okHero(p.hero), c:p.c | 0 }));
  const slots = humans.slice(0, NSLOT).map(p => ({ id:p.id, hero:p.hero, bot:false, c:p.c, o:null, ready:false }));
  const usedC = new Set(slots.map(s => s.c)), bh = botHeroes(slots.map(s => s.hero), NSLOT - slots.length);
  while(slots.length < NSLOT){ let c = 0; while(usedC.has(c)) c++; usedC.add(c); slots.push({ id:null, hero:bh.shift(), bot:true, c, o:null, ready:true, skill:.55 + Math.random() * .4 }); }
  return slots;
}
function newRound(){
  const n = R ? R.n + 1 : 1;
  R = freshRound(n);
  let th; do{ th = Math.floor(Math.random() * THEMES.length); }while(th === lastTheme && THEMES.length > 1);
  lastTheme = th; R.th = th;
  R.slots = hostSlots();
  for(const s of R.slots) if(s.bot) s.o = W.botOutfit(THEMES[th], s.skill);
  setPhase('theme', THEME_T);
  hostBroadcast(true);
}
/* the lobby before the first online round: show who's in (bots fill the rest when it starts) */
function lobbyRound(){
  R = freshRound(R ? R.n : 0); R.ph = 'lobby'; R.slots = hostSlots();
  onPhase('lobby'); hostBroadcast(true);
}
function setPhase(ph, left){ const old = R.ph; R.ph = ph; R.left = left || 0; if(old !== ph) onPhase(ph, old); }
/* bots give stars by the theme score (kind bots: never less than 2) */
function botStars(o, th, skill = .75){
  const k = W.themeScore(o, th) / W.SCORE_MAX;
  return clamp(Math.round(1.4 + k * 4.4 + (Math.random() - .5) * (1.6 - skill)), 2, 5);
}
function startRunway(){
  // missing outfits (a friend who never sent one) → wear the basic look
  R.slots.forEach((s, i) => { if(!s.o) s.o = i === mySlot() ? W.cloneOutfit(myOutfit) : W.cloneOutfit(W.BASIC); });
  R.order = shuffle([0, 1, 2, 3]);
  R.turn = 0; R.tt = 0;
  setPhase('runway', 0);
  botVotesFor(R.order[0]);
  hostBroadcast(true);
}
function botVotesFor(i){
  const w = R.slots[i];
  R.slots.forEach((s, j) => { if(j === i || !s.bot) return; (R.votes['b' + j] = R.votes['b' + j] || {})[i] = botStars(w.o, THEMES[R.th], s.skill); });
}
function tally(){
  const res = R.slots.map((s, i) => {
    let sum = 0, n = 0;
    for(const v in R.votes){ if(v === 'b' + i || v === 'p' + i) continue; const st = R.votes[v][i]; if(st >= 1 && st <= 5){ sum += st; n++; } }
    return { i, avg:n ? Math.round(sum / n * 10) / 10 : 3, n, sc:Math.round(W.themeScore(s.o, THEMES[R.th]) * 10) / 10 };
  });
  res.sort((a, b) => (b.avg - a.avg) || (b.sc - a.sc) || (a.i - b.i));
  return res;
}
let hostSendT = 0;
function hostTick(dt){
  if(!R || !isHost()) return;
  if(state === 'pause' && solo) return;
  if(R.ph === 'theme'){ R.left -= dt; if(R.left <= 0) setPhase('dress', DRESS_T), hostBroadcast(true); }
  else if(R.ph === 'dress'){
    R.left -= dt;
    const me = mySlot(); if(me >= 0){ R.slots[me].o = W.cloneOutfit(myOutfit); R.slots[me].ready = !!R.mine.ready; }
    const allReady = R.slots.every(s => s.bot || s.ready);
    if(allReady && R.left > 1.2) R.left = Math.min(R.left, solo ? 0 : 1.2);
    if(R.left <= 0){ R.wait = (R.wait || 0) + dt; if(solo || R.slots.every(s => s.bot || s.o) || R.wait > 2.5) startRunway(); }
  }
  else if(R.ph === 'runway'){
    R.tt += dt;
    if(R.tt >= TURN_T){
      R.turn++; R.tt = 0;
      if(R.turn >= R.order.length){ setPhase('results', RESULTS_T); }
      else botVotesFor(R.order[R.turn]);
      hostBroadcast(true);
    }
  }
  else if(R.ph === 'results'){ R.left -= dt; if(R.left <= 0){ R.res = tally(); setPhase('podium', 0); hostBroadcast(true); } }
  hostSendT -= dt; if(hostSendT <= 0) hostBroadcast(false);
}
/* followers: run the clocks locally between snapshots */
function followTick(dt){
  if(!R || isHost()) return;
  if(R.ph === 'theme' || R.ph === 'dress' || R.ph === 'results') R.left = Math.max(0, R.left - dt);
  if(R.ph === 'runway') R.tt = Math.min(TURN_T, R.tt + dt);
  if(R.ph === 'dress'){ fitSendT -= dt; if(fitSendT <= 0) sendFit(); }
}

/* ---------- my votes ---------- */
function myVoteKey(){ const i = mySlot(); return i >= 0 ? 'p' + i : 'x' + myPid(); }
function castVote(to, s){
  if(!R || R.ph !== 'runway' || R.order[R.turn] !== to || to === mySlot()) return false;
  s = clamp(s | 0, 1, 5);
  (R.votes[myVoteKey()] = R.votes[myVoteKey()] || {})[to] = s;
  R.mine['v' + R.n + '_' + to] = s;
  if(!isHost()) mpSend('vote', { r:R.n, to, s });
  SFX.vote(s); drawVote(true);
  return true;
}
/* ---------- my pose ---------- */
let poseCD = 0;
function doPose(k){
  if(!R || R.ph !== 'runway' || R.order[R.turn] !== mySlot() || poseCD > 0) return false;
  k = k != null ? k : POSES[(R.mine.pk = ((R.mine.pk || 0) + 1)) % POSES.length];
  poseCD = .6;
  startPose(mySlot(), k);
  mpSend('pose', { r:R.n, i:mySlot(), k:POSES.indexOf(k) });
  return true;
}
function botPose(i, k){ startPose(i, k); mpSend('pose', { r:R.n, i, k:POSES.indexOf(k) }); }
function startPose(i, k){
  const m = SM[i]; if(!m) return;
  m.pose = { k, t:0 }; SFX.pose(); flash(); popFlashes(5);
  burst(m.x, m.y + 1.4, m.z, 26);
}

/* ======================================================================
   Phase changes: camera, models, UI, Aunt Laila
   ====================================================================== */
let camMode = 'menu', snapCam = true;
function onPhase(ph, old){
  snapCam = true;
  if(ph === 'theme'){ R.mine = R.mine || {}; myOutfit = W.cloneOutfit(SAVE.last); dressMe(); dressTab = 'top'; colTouched = {}; SFX.ding(); MUS.want = .8; }
  if(ph === 'dress'){ MUS.want = .65; if(SAVE.tut < 2) setTimeout(() => { if(R && R.ph === 'dress' && state === 'game') say(LINES.dress, 5500, true); }, 400); }
  if(ph === 'runway'){ MUS.want = 1; SFX.cheer(); SAVE.last = W.cloneOutfit(myOutfit); persist(); }
  if(ph === 'results'){ MUS.want = .3; SFX.drum(); }
  if(ph === 'podium'){ MUS.want = .9; SFX.fanfare(); giveReward(); podiumT = 0; }
  if(ph === 'lobby'){ MUS.want = .5; }
  if(state === 'game' || state === 'pause') renderPhaseUI();
}
let podiumT = 0;
function giveReward(){
  if(!R || !R.res || R.mine.reward) return;
  const me = mySlot(); if(me < 0) return;
  const place = R.res.findIndex(r => r.i === me), my = R.res[place];
  const stars = PLACE_STARS[place] + (my && my.avg >= 4.5 ? 1 : 0), coins = PLACE_COINS[place];
  SAVE.stars += stars; SAVE.rounds++; if(place === 0) SAVE.wins++; if(my) SAVE.best = Math.max(SAVE.best, my.avg);
  if(SAVE.tut < 3) SAVE.tut = 3;
  persist();
  R.mine.reward = { stars, coins, place };
  try{ if(window.World) World.addCoins(coins, L('من عرض الأزياء', 'from the fashion show', 'moda şovundan')); }catch(e){}
  try{ if(window.World && World.track) World.track(place === 0 ? 'win' : 'play', 'fashion'); }catch(e){}
}

/* ======================================================================
   UI: HUD, dressing panel, vote bar, cards
   ====================================================================== */
const overlay = $('#overlay'), card = $('#card'), hudEl = $('#hud'), dpanel = $('#dpanel'), readyBtn = $('#btnReady'), voteBar = $('#voteBar'), poseBtn = $('#btnPose'), drumEl = $('#drum'), spinHint = $('#spinHint');
let state = 'menu';
function setGameUI(){
  const inGame = state === 'game' && R;
  const ph = inGame ? R.ph : '', me = inGame ? mySlot() : -1;
  const dressing = inGame && ph === 'dress' && me >= 0 && overlay.hidden;
  stage.classList.toggle('dressing', !!dressing);
  dpanel.hidden = !dressing; readyBtn.hidden = !dressing; spinHint.hidden = !dressing || SAVE.tut >= 3;
  hudEl.hidden = !(inGame && ['theme', 'dress', 'runway', 'results', 'podium', 'lobby'].includes(ph) && (overlay.hidden || ph === 'podium' || ph === 'lobby'));
  drumEl.hidden = !(inGame && ph === 'results');
  if(!inGame){ voteBar.hidden = true; poseBtn.hidden = true; }
  applyViewOffset();
  hudKey = ''; voteKey = '';
}
function applyViewOffset(){
  if(stage.classList.contains('dressing')) camera.setViewOffset(SW, SH, (RTL ? 1 : -1) * PW / 2, 0, SW, SH);
  else camera.clearViewOffset();
}
function openOverlay(cls, cardCls){ overlay.hidden = false; overlay.className = 'overlay ' + cls; card.className = 'card ' + (cardCls || ''); }
function closeOverlay(){ overlay.hidden = true; }
function renderPhaseUI(){
  if(!R) return;
  state = 'game'; hush();
  if(R.ph === 'lobby') lobbyCard();
  else if(R.ph === 'theme') themeCard();
  else if(R.ph === 'dress'){ if(mySlot() >= 0){ closeOverlay(); drawPanel(); } else waitCard(); }
  else if(R.ph === 'runway' || R.ph === 'results'){ closeOverlay(); drumEl.textContent = '🥁 ' + L('عم نعدّ النجوم…', 'Counting the stars…', 'Yıldızlar sayılıyor…'); }
  else if(R.ph === 'podium') podiumCard();
  setGameUI();
}
/* HUD */
let hudKey = '', lastSec = -1;
function hudFrame(){
  if(hudEl.hidden || !R) return;
  const th = THEMES[R.th], ph = R.ph, tLeft = ph === 'dress' ? Math.ceil(R.left) : -1;
  const walker = ph === 'runway' ? R.order[R.turn] : -1;
  const key = [ph, R.th, tLeft, walker, R.turn, SAVE.stars, R.slots.map(s => s.hero + s.ready + s.bot).join(','), MP.code, R.mine.ready].join('|');
  if(key === hudKey) return; hudKey = key;
  const thc = $('#hudTheme'); thc.hidden = ph === 'lobby';
  thc.textContent = th.e + ' ' + th.n + (ph === 'runway' ? '  ·  👗 ' + N(R.turn + 1) + '/' + N(R.order.length) : '');
  const tm = $('#hudTime'); tm.hidden = tLeft < 0;
  if(tLeft >= 0){ tm.textContent = '⏱️ ' + mmss(tLeft); tm.classList.toggle('hurry', tLeft <= 10); if(tLeft <= 10 && tLeft !== lastSec && tLeft > 0) SFX.tick(); lastSec = tLeft; }
  $('#hudStars').textContent = FSTAR + ' ' + N(SAVE.stars);
  const showBar = ph !== 'podium' && ph !== 'theme' && !(ph === 'dress' && solo);
  const bar = $('#mpBar'); bar.hidden = !showBar;
  if(showBar) bar.innerHTML = (MP.code && !solo ? `<span class="chip roomchip">🏠 ${[...MP.code].map(N).join('')}</span>` : '') + R.slots.map((s, i) => `<span class="chip ps${i === walker ? ' walk' : ''}" style="--c:${MCOL[s.c] || '#fff'}"><img src="${charImg(s.hero)}" alt="">${s.bot ? '🤖' : ''}${ph === 'dress' ? (s.ready ? '✅' : '👗') : ''}${i === mySlot() ? '⭐' : ''}</span>`).join('');
}
/* the dressing panel */
let dressTab = 'top', colTouched = {};
const tabsEl = $('#slotTabs'), gridEl = $('#itemGrid'), colRow = $('#colRow'), prRow = $('#prRow');
function drawPanel(){
  tabsEl.innerHTML = SLOTS.map(s => `<button data-s="${s.id}" class="${s.id === dressTab ? 'on' : ''}${ITEMS[myOutfit[s.id][0]].build ? ' has' : ''}" aria-label="${s.n}">${s.e}</button>`).join('');
  tabsEl.querySelectorAll('button').forEach(b => b.onclick = () => { SFX.tap(); dressTab = b.dataset.s; drawPanel(); });
  const sl = SLOTS.find(s => s.id === dressTab);
  $('#slotName').textContent = sl.e + ' ' + sl.n;
  const cur = myOutfit[dressTab];
  gridEl.innerHTML = BY_SLOT[dressTab].map(it => {
    const on = cur[0] === it.id, own = owns(it.id);
    const c = on ? cur[1] : it.def, p = on ? cur[2] : 0;
    const tagHit = R && it.tags.includes(THEMES[R.th].tag) ? '<span class="tg">✨</span>' : '';
    return `<button class="it${on ? ' on' : ''}${own ? '' : ' lock'}" data-id="${it.id}">${it.build ? itemPic(it.id, c, p) : `<span class="em">${it.e}</span>`}<b>${it.n}</b>${own ? '' : `<span class="lk">🔒${FSTAR}${N(it.price)}</span>`}${tagHit}</button>`;
  }).join('');
  gridEl.querySelectorAll('.it').forEach(b => b.onclick = () => pickItem(b.dataset.id));
  const it = ITEMS[cur[0]], has = !!it.build;
  $('#paints').classList.toggle('off', !has);
  colRow.innerHTML = COLORS.map((c, i) => `<button data-c="${i}" class="${i === cur[1] ? 'on' : ''}" style="--c:${W.css(i)}" aria-label="${c.n}"></button>`).join('');
  colRow.querySelectorAll('button').forEach(b => b.onclick = () => pickColor(+b.dataset.c));
  prRow.innerHTML = PRINTS.map((p, i) => `<button data-p="${i}" class="${i === cur[2] ? 'on' : ''}${ownsPrint(i) ? '' : ' lock'}" style="--c:${W.css(cur[1])}" aria-label="${p.n}">${p.e}${ownsPrint(i) ? '' : '<span class="lk">🔒</span>'}</button>`).join('');
  prRow.querySelectorAll('button').forEach(b => b.onclick = () => pickPrint(+b.dataset.p));
  readyBtn.textContent = R && R.mine.ready ? '✅ ' + L('جاهز! استنّى…', 'Ready! Waiting…', 'Hazır! Bekleniyor…') : '✅ ' + L('جاهز!', 'Ready!', 'Hazır!');
  readyBtn.classList.toggle('done', !!(R && R.mine.ready));
  spinHint.textContent = '👆 ' + L('اسحب لتلفّ', 'Swipe to turn', 'Döndürmek için kaydır');
}
function canDress(){ return state === 'game' && R && R.ph === 'dress' && mySlot() >= 0; }
function unlockItem(id){
  const it = ITEMS[id]; if(!it || owns(id)) return true;
  if(SAVE.stars < it.price){ SFX.bonk(); pop(L('بدّك ', 'You need ', 'Gerekli: ') + FSTAR + ' ' + N(it.price)); say(L('اربح نجمات موضة بالعروض 🌟 وافتح هالقطعة', 'Win fashion stars in the shows 🌟 to unlock this piece', 'Bu parçayı açmak için şovlarda moda yıldızı 🌟 kazan'), 3000, true); return false; }
  SAVE.stars -= it.price; SAVE.owned.push(id); persist(); SFX.buy(); pop('🔓 ' + it.n); hudKey = '';
  return true;
}
function unlockPrint(i){
  if(ownsPrint(i)) return true;
  if(SAVE.stars < PRINTS[i].price){ SFX.bonk(); pop(L('بدّك ', 'You need ', 'Gerekli: ') + FSTAR + ' ' + N(PRINTS[i].price)); return false; }
  SAVE.stars -= PRINTS[i].price; SAVE.prints.push(i); persist(); SFX.buy(); pop('🔓 ' + PRINTS[i].n); hudKey = '';
  return true;
}
function wear(slot, id, c, p){
  const it = ITEMS[id]; if(!it || it.slot !== slot) return false;
  myOutfit[slot] = [id, c != null ? c : myOutfit[slot][1], p != null ? p : myOutfit[slot][2]];
  dressMe(); twirl = 1;
  if(it.build){ SFX.wear(); const b = boneOf(slot); burst(DR.x + b.x, b.y, .3, 14, [0xffffff, 0xffe08a, 0xff8fb1], 1.5, 1); }
  else SFX.tap();
  R && (R.mine.ready = false);
  fitSendT = Math.min(fitSendT, .4);
  return true;
}
function pickItem(id){
  if(!canDress()) return;
  const it = ITEMS[id];
  if(!owns(id) && !unlockItem(id)) return;
  const cur = myOutfit[it.slot];
  const c = colTouched[it.slot] ? cur[1] : it.def;
  wear(it.slot, id, c, it.build ? cur[2] && ownsPrint(cur[2]) ? cur[2] : 0 : 0);
  drawPanel();
  if(SAVE.tut < 2 && it.build){ SAVE.tut = 2; persist(); setTimeout(() => { if(canDress()) say(LINES.dress2, 5000, true); }, 600); }
}
function pickColor(c){ if(!canDress()) return; const cur = myOutfit[dressTab]; if(!ITEMS[cur[0]].build) return; colTouched[dressTab] = true; wear(dressTab, cur[0], c, cur[2]); drawPanel(); }
function pickPrint(p){ if(!canDress()) return; const cur = myOutfit[dressTab]; if(!ITEMS[cur[0]].build) return; if(!unlockPrint(p)) return; wear(dressTab, cur[0], cur[1], p); drawPanel(); }
readyBtn.onclick = () => { if(!canDress()) return; SFX.flag(); R.mine.ready = !R.mine.ready; if(!isHost()) sendFit(); drawPanel(); hudKey = ''; };
/* the camera looks at the part being dressed */
function boneOf(slot){
  const f = W.fitOf(heroId), hy = f.quad ? .85 : (heroId === 'qamar' ? .93 : heroId === 'zaqzouq' ? .92 : 1);
  if(slot === 'hat' || slot === 'hair' || slot === 'glasses') return { x:0, y:hy + .15, d:2.5 };
  if(slot === 'shoes') return { x:0, y:.35, d:2.7 };
  if(slot === 'bottom') return { x:0, y:.5, d:3.1 };
  return { x:0, y:.72, d:3.4 };
}
/* vote bar + pose button */
let voteKey = '';
const vStars = $('#vStars');
function drawVote(sent){
  if(!R || R.ph !== 'runway' || state !== 'game'){ voteBar.hidden = true; poseBtn.hidden = true; return; }
  const w = R.order[R.turn], me = mySlot(), s = R.slots[w];
  poseBtn.hidden = !(w === me);
  poseBtn.querySelector('b').textContent = L('بوز!', 'Pose!', 'Poz!');
  if(w === me || !s){ voteBar.hidden = true; return; }
  const mine = R.mine['v' + R.n + '_' + w] || 0;
  const key = R.n + '_' + w + '_' + mine; if(key === voteKey && !sent) return; voteKey = key;
  voteBar.hidden = false;
  $('#voteQ').innerHTML = `<img src="${charImg(s.hero)}" alt="" style="--c:${MCOL[s.c]}"> ${mine ? L('شكراً! بتقدر تغيّر', 'Thanks! You can change it', 'Teşekkürler! Değiştirebilirsin') : L('قدّيش بتعطي؟', 'How many stars?', 'Kaç yıldız?')}`;
  vStars.innerHTML = [1, 2, 3, 4, 5].map(n => `<button data-n="${n}" class="${n <= mine ? 'on' : ''}" aria-label="${N(n)}">⭐</button>`).join('');
  vStars.classList.toggle('sent', !!sent);
  vStars.querySelectorAll('button').forEach(b => b.onclick = () => castVote(w, +b.dataset.n));
}
poseBtn.onclick = () => doPose();
$('#btnPause').onclick = () => { SFX.tap(); showPause(); };

/* cards */
function themeCard(){
  const th = THEMES[R.th];
  openOverlay('none', 'themecard');
  card.innerHTML = `<p class="tl">✨ ${L('موضوع العرض', 'Show theme', 'Şov teması')} ✨</p><div class="te">${th.e}</div><h1>${th.n}</h1>
    <p>⏱️ ${L('عندك', 'You have', 'Süren')} ${mmss(DRESS_T)} ${L('لتلبس', 'to dress up', 'giyinmek için')} 👗</p>`;
  if(SAVE.tut < 1){ say(LINES.hi, 4300); SAVE.tut = 1; persist(); }
  else say(LINES.theme, 3500);
}
function waitCard(){
  openOverlay('dim');
  card.innerHTML = `<div class="bigstar">⏳</div><h2>${L('أصحابك عم يلبسوا…', 'Your friends are dressing…', 'Arkadaşların giyiniyor…')}</h2><p>${L('بتلعب معهم بالجولة الجاية! هلّق بتقدر تصوّت 🌟', "You'll play in the next round! You can vote now 🌟", 'Sonraki turda oynayacaksın! Şimdi oy verebilirsin 🌟')}</p>`;
}
function lobbyCard(){
  openOverlay('clear', 'wide');
  const host = isHost(), code = MP.code || '';
  card.innerHTML = `<h2>👗 ${L('غرفة عرض الأزياء', 'Fashion show room', 'Moda şovu odası')}</h2>
    <div class="mp-code">${[...code].map(d => `<b>${N(d)}</b>`).join('')}</div>
    <p>${L('قول الرقم لأصحابك 👫 والروبوتات بتكمّل الأماكن الفاضية 🤖', 'Tell your friends the number 👫 robots fill the empty places 🤖', 'Numarayı arkadaşlarına söyle 👫 boş yerleri robotlar doldurur 🤖')}</p>
    <div class="plist">${R.slots.map(s => `<div class="pl${!s.bot && s.id === myPid() ? ' me' : ''}" style="--c:${MCOL[s.c]}"><img src="${charImg(s.hero)}" alt=""><b>${HERO_NAME[s.hero]}</b>${s.bot ? '<span class="bot">🤖</span>' : ''}<small>${!s.bot && s.id === MP.hostId ? '👑' : !s.bot && s.id === myPid() ? L('إنت', 'You', 'Sen') : s.bot ? L('روبوت', 'Robot', 'Robot') : '👫'}</small></div>`).join('')}</div>
    <div class="row">${host ? `<button class="big-btn mint" id="bGo">▶️ ${L('يلّا نبلّش!', "Let's start!", 'Başlayalım!')}</button>` : `<p>⏳ ${L('استنّى صاحب الغرفة يبلّش', 'Wait for the room owner to start', 'Oda sahibinin başlatmasını bekle')}</p>`}
    <button class="ghost-btn" id="bLeave">🚪 ${L('اطلع من الغرفة', 'Leave the room', 'Odadan çık')}</button></div>`;
  if(host) $('#bGo').onclick = () => { SFX.tap(); newRound(); };
  $('#bLeave').onclick = () => { SFX.tap(); mpLeave(); showMenu(); };
}
function podiumCard(){
  openOverlay('clear', 'podcard');
  const me = mySlot(), rw = R.mine.reward, medal = ['🥇', '🥈', '🥉', '🎀'];
  const rows = (R.res || []).map((r, k) => { const s = R.slots[r.i]; return `<div class="rk${r.i === me ? ' me' : ''}" style="--c:${MCOL[s.c]}"><span class="md">${medal[k]}</span><img src="${charImg(s.hero)}" alt=""><span class="nm">${HERO_NAME[s.hero]}${s.bot ? ' 🤖' : ''}${r.i === me ? ' (' + L('إنت', 'You', 'Sen') + ')' : ''}</span><span class="sc">⭐ ${N(r.avg.toFixed(1))}</span></div>`; }).join('');
  const host = isHost();
  card.innerHTML = `<h2>🏆 ${L('النتيجة', 'Results', 'Sonuçlar')} · ${THEMES[R.th].e}</h2><div class="ranks">${rows}</div>
    ${rw ? `<div class="reward"><span>+${N(rw.stars)} ${FSTAR}</span><span>+${N(rw.coins)} 🪙</span></div>` : ''}
    <div class="row">${host ? `<button class="big-btn mint" id="bAgain">🔁 ${L('جولة كمان', 'Another round', 'Bir tur daha')}</button>` : `<p>⏳ ${L('استنّى الجولة الجاية', 'Wait for the next round', 'Sonraki turu bekle')}</p>`}
    <button class="ghost-btn" id="bWard">👗 ${L('الخزانة', 'Wardrobe', 'Dolap')}</button>
    <button class="ghost-btn" id="bHome">${solo ? '🏠 ' + L('القائمة', 'Menu', 'Menü') : '🚪 ' + L('اطلع', 'Leave', 'Çık')}</button></div>`;
  if(host) $('#bAgain').onclick = () => { SFX.tap(); newRound(); };
  $('#bWard').onclick = () => { SFX.tap(); showWardrobe('podium'); };
  $('#bHome').onclick = () => { SFX.tap(); if(!solo) mpLeave(); showMenu(); };
  if(SAVE.rounds <= 1) setTimeout(() => { if(R && R.ph === 'podium' && state === 'game') say(LINES.podium, 5000, true); }, 1200);
}
function showMenu(){
  if(MP.t) mpLeave(true);
  R = null; solo = true;
  state = 'menu'; hush(); setGameUI(); openOverlay('clear', 'bare'); camMode = 'menu'; snapCam = true; MUS.want = .45;
  const rotHint = ROT && !rawGet('fashion_rothint');
  const ownedN = Object.values(ITEMS).filter(it => it.build && owns(it.id)).length, allN = Object.values(ITEMS).filter(it => it.build).length;
  card.innerHTML = `<div class="menu">
    ${rotHint ? `<div class="rothint"><i aria-hidden="true">📱</i><span>${L('لفّ الجوال على جنب', 'Turn your phone sideways', 'Telefonu yan çevir')}</span></div>` : ''}
    <div class="logo">👗</div><h1>${L('عرض أزياء بوبو', 'Bobo Fashion Show', 'Bobo Moda Şovu')}</h1>
    <p class="sub">${L('البس على الموضوع، امشي عالمنصة، وصوّت بالنجوم!', 'Dress for the theme, walk the runway, vote with stars!', 'Temaya göre giyin, podyumda yürü, yıldızla oy ver!')}</p>
    <div class="row"><div class="mine"><span>${FSTAR} ${N(SAVE.stars)}</span><span>👗 ${N(ownedN)}/${N(allN)}</span><span>🏆 ${N(SAVE.wins)}</span></div>
    <button class="hero-btn" id="bHero" style="--c:${HERO_COLOR[heroId]}"><img src="${charImg(heroId)}" alt=""><span>${HERO_NAME[heroId]} 🔄</span></button></div>
    <div class="row"><button class="big-btn" id="bPlay">▶️ ${L('العب', 'Play', 'Oyna')}</button>
    <button class="big-btn pink" id="bMp">👫 ${L('العب مع أصحابك', 'Play with friends', 'Arkadaşlarla oyna')}</button></div>
    <div class="row"><button class="ghost-btn" id="bWard">👗 ${L('خزانة الأزياء', 'Wardrobe', 'Moda dolabı')}</button></div></div>`;
  $('#bPlay').onclick = () => { ac(); SFX.tap(); startSolo(); };
  $('#bMp').onclick = () => { ac(); SFX.tap(); mpMenu(); };
  $('#bHero').onclick = () => { ac(); SFX.tap(); showSelect('menu'); };
  $('#bWard').onclick = () => { ac(); SFX.tap(); showWardrobe('menu'); };
}
let selFrom = 'menu', selPick = heroId;
function showSelect(from){
  selFrom = from; state = 'select'; setGameUI(); openOverlay('dim', 'wide');
  selPick = heroId;
  card.innerHTML = `<h2>🦸 ${L('اختار شخصيتك', 'Pick your character', 'Karakterini seç')}</h2>
    <div class="heroes">${HERO_IDS.map(id => `<button class="hero${id === selPick ? ' on' : ''}" data-id="${id}" style="--c:${HERO_COLOR[id]}" aria-pressed="${id === selPick}"><img src="${charImg(id)}" alt=""><b>${HERO_NAME[id]}</b></button>`).join('')}</div>
    <button class="big-btn" id="bOkHero">✅ ${L('تمام', 'OK', 'Tamam')}</button>`;
  const btns = [...card.querySelectorAll('.hero')];
  btns.forEach(b => b.onclick = () => { selPick = b.dataset.id; SFX.tap(); btns.forEach(x => { const on = x === b; x.classList.toggle('on', on); x.setAttribute('aria-pressed', on); }); });
  $('#bOkHero').onclick = () => { SFX.tap(); setHero(selPick); if(selFrom === 'pause') resume(); else if(selFrom === 'mp') mpMenu(); else showMenu(); };
}
function setHero(id){
  heroId = HERO_IDS.includes(id) ? id : 'sara';
  SAVE.hero = heroId; persist(); rawSet('worlds_hero', heroId);
  buildMe();
  if(R){ const i = mySlot(); if(i >= 0) R.slots[i].hero = heroId; }
  if(mpActive()) mpTrack();
}
function showPause(){
  if(state !== 'game') return;
  state = 'pause'; setGameUI(); openOverlay('dim'); hush();
  const mp = !solo && mpActive();
  card.innerHTML = `<h2>⏸️ ${L('استراحة', 'Paused', 'Mola')}</h2>
    <button class="big-btn" id="bRes">▶️ ${L('كمّل', 'Continue', 'Devam')}</button>
    <div class="row"><button class="ghost-btn" id="bHeroP">🦸 ${L('غيّر الشخصية', 'Change character', 'Karakteri değiştir')}</button>
    <button class="ghost-btn" id="bSnd">${muted ? '🔇' : '🔊'} ${L('الصوت', 'Sound', 'Ses')}</button>
    ${mp ? `<button class="ghost-btn" id="bLeaveR">🚪 ${L('اطلع من الغرفة', 'Leave the room', 'Odadan çık')}</button>` : ''}</div>
    <button class="exit-btn" id="bExit">🚪 ${L('خروج', 'Exit', 'Çıkış')}</button>`;
  $('#bRes').onclick = () => { SFX.tap(); resume(); };
  $('#bHeroP').onclick = () => { SFX.tap(); showSelect('pause'); };
  $('#bSnd').onclick = () => { muted = !muted; rawSet('adv3d_muted', String(muted)); $('#bSnd').innerHTML = (muted ? '🔇' : '🔊') + ' ' + L('الصوت', 'Sound', 'Ses'); SFX.tap(); };
  if(mp) $('#bLeaveR').onclick = () => { SFX.tap(); mpLeave(); showMenu(); };
  $('#bExit').onclick = () => { SFX.tap(); try{ persist(); if(MP.t) mpLeave(true); }catch(e){} setTimeout(() => { location.href = '../'; }, 150); };
}
function resume(){ state = 'game'; renderPhaseUI(); }
/* the wardrobe: unlock pieces with fashion stars */
let wardFrom = 'menu', wardTab = 'hat';
function showWardrobe(from){
  if(from) wardFrom = from;
  state = 'wardrobe'; setGameUI(); openOverlay('dim', 'wide');
  card.innerHTML = `<button class="x-btn" id="bX" aria-label="${L('سكّر', 'Close', 'Kapat')}">✖</button><h2>👗 ${L('خزانة الأزياء', 'Wardrobe', 'Moda dolabı')} · ${FSTAR} ${N(SAVE.stars)}</h2>
    <p>${L('افتح قطع جديدة بنجمات الموضة 🌟 اللي بتربحها بالعروض', 'Unlock new pieces with the fashion stars 🌟 you win in shows', 'Şovlarda kazandığın moda yıldızlarıyla 🌟 yeni parçalar aç')}</p>
    <div class="wtabs">${SLOTS.map(s => `<button data-s="${s.id}" class="${s.id === wardTab ? 'on' : ''}" aria-label="${s.n}">${s.e}</button>`).join('')}<button data-s="prints" class="${wardTab === 'prints' ? 'on' : ''}" aria-label="${L('نقشات', 'Prints', 'Desenler')}">⭐</button></div>
    <div class="wgrid">${wardTab === 'prints'
      ? PRINTS.map((p, i) => `<button class="it${ownsPrint(i) ? ' own' : ''}" data-p="${i}"><span class="em" style="display:grid;place-items:center;width:78px;height:78px;border-radius:18px;background:url(${W.printTex(0, i).image.toDataURL()}) center/cover">${i ? '' : '⬜'}</span><b>${p.n}</b><span class="pr">${ownsPrint(i) ? '✅' : FSTAR + ' ' + N(p.price)}</span></button>`).join('')
      : BY_SLOT[wardTab].filter(it => it.build).map(it => `<button class="it${owns(it.id) ? ' own' : ''}" data-id="${it.id}">${itemPic(it.id, it.def, 0)}<b>${it.n}</b><span class="pr">${owns(it.id) ? '✅' : FSTAR + ' ' + N(it.price)}</span></button>`).join('')}</div>`;
  $('#bX').onclick = () => { SFX.tap(); closeWardrobe(); };
  card.querySelectorAll('.wtabs button').forEach(b => b.onclick = () => { SFX.tap(); wardTab = b.dataset.s; showWardrobe(); });
  card.querySelectorAll('[data-id]').forEach(b => b.onclick = () => { if(!owns(b.dataset.id) && unlockItem(b.dataset.id)) showWardrobe(); else SFX.tap(); });
  card.querySelectorAll('[data-p]').forEach(b => b.onclick = () => { if(!ownsPrint(+b.dataset.p) && unlockPrint(+b.dataset.p)) showWardrobe(); else SFX.tap(); });
}
function closeWardrobe(){ if(wardFrom === 'podium' && R){ state = 'game'; renderPhaseUI(); } else showMenu(); }

/* ---------- start a single-player show ---------- */
function startSolo(){
  if(ROT) rawSet('fashion_rothint', '1');
  if(MP.t) mpLeave(true);
  solo = true; R = null; state = 'game';
  newRound();
}

/* ======================================================================
   Camera + per-frame animation of the people on stage
   ====================================================================== */
const camPos = new THREE.Vector3(0, 3, 10), camLook = new THREE.Vector3(0, 1, 0), wantPos = new THREE.Vector3(), wantLook = new THREE.Vector3();
let T = 0, meRot = 0, meRotV = 0, dragX = null, twirl = 0, menuT = 0;
/* where the walker is at time tt of their turn (the same on every phone) */
function walkAt(tt){
  const { z0, zm, ze } = RUN;
  if(tt < 2.9) return { z:lerp(z0, zm, tt / 2.9), run:.75, stop:false };
  if(tt < 3.9) return { z:zm, run:0, stop:true, mini:tt - 2.9 };
  if(tt < 6.2) return { z:lerp(zm, ze, (tt - 3.9) / 2.3), run:.75, stop:false };
  return { z:ze, run:0, stop:true, end:tt - 6.2 };
}
function slotSpot(i, walkerOrder){ const k = walkerOrder.indexOf(i); return SIDE[(k < 0 ? i : k) % SIDE.length]; }
function stageFrame(dt){
  const ph = R ? R.ph : 'menu';
  const inRound = R && ['runway', 'results', 'podium', 'lobby'].includes(ph);
  if(!inRound) hideSlots();
  if(ph === 'lobby'){
    R.slots.forEach((s, i) => { const m = slotModel(i, s.hero, s.o || W.BASIC); m.x = -1.5 + i; m.y = RUN.top; m.z = RUN.endZ - .2; m.f = 0; m.run = 0; });
  }
  if(ph === 'runway' || ph === 'results'){
    const walker = ph === 'runway' ? R.order[R.turn] : -1;
    R.slots.forEach((s, i) => {
      const m = slotModel(i, s.hero, s.o || W.BASIC);
      if(i === walker){
        const w = walkAt(R.tt);
        m.x = 0; m.y = RUN.top; m.z = w.z; m.run = w.run; m.f = 0;
        if(isHost() && s.bot && !m.pose && w.end != null){ if(w.end > .25 && !m.bp1){ m.bp1 = 1; botPose(i, pick(['star', 'heart', 'hip'])); } if(w.end > 2.0 && !m.bp2){ m.bp2 = 1; botPose(i, pick(['spin', 'wave', 'peace'])); } }
        if(w.mini != null && !m.pose && !m.mp){ m.mp = 1; m.pose = { k:'hip', t:0, soft:1 }; }
      } else {
        m.bp1 = m.bp2 = m.mp = 0;
        const sp = SIDE[i % SIDE.length]; m.x = sp[0]; m.y = 0; m.z = sp[1]; m.run = 0; m.f = sp[0] < 0 ? Math.PI / 2 : -Math.PI / 2;
      }
    });
  }
  if(ph === 'podium'){
    podiumT += dt;
    (R.res || []).forEach((r, k) => { const s = R.slots[r.i], m = slotModel(r.i, s.hero, s.o || W.BASIC), p = PODIUM[k]; m.x = p.x; m.y = RUN.top + p.h; m.z = p.z; m.run = 0; m.f = 0; if(k === 0 && podiumT % 3.2 < dt && !m.pose) m.pose = { k:'star', t:0 }; if(k > 0) m.clap = true; });
    if(podiumT % 1.6 < dt) burst((Math.random() - .5) * 3, 4.2, RUN.endZ, 30);
  }
  podiumGrp.visible = ph === 'podium';
  // pose + walk animation
  SM.forEach((m, i) => {
    if(!m || !m.h || !m.h.grp.visible) return;
    m.t += dt;
    const h = m.h; h.grp.position.set(m.x, m.y, m.z); h.grp.rotation.y = m.f;
    poseHero(h, { t:m.t, dt, run:m.run, grounded:true, vy:0, sq:0, flip:0, pace:.75 });
    h.body.rotation.y = 0;
    if(m.pose){ m.pose.t += dt / POSE_T; if(m.pose.t >= 1) m.pose = null; else applyPose(h, m.pose.k, m.pose.t, m.run); }
    else if(R && (ph === 'runway' || ph === 'podium') && i !== (ph === 'runway' ? R.order[R.turn] : -1) && (ph !== 'podium' || m.clap)) clapArms(h, m.t + i);
    if(ph !== 'podium') m.clap = false;
  });
  // showcase on the title screen
  const sc = state === 'menu' || state === 'select' || state === 'wardrobe' || (state === 'mp');
  showcase(sc && !R);
  if(SC && SC.grp.visible){ SC.grp.position.set(0, RUN.top, RUN.endZ); SC.grp.rotation.y = Math.sin(T * .4) * .5; poseHero(SC, { t:T, dt, run:0, grounded:true, vy:0, sq:0, flip:0 }); SC.body.rotation.y = 0; const pt = (T % 6) / POSE_T; if(pt < 1) applyPose(SC, POSES[Math.floor(T / 6) % POSES.length], pt, 0); }
  // fans bob (and cheer during the show)
  const hype = ph === 'runway' || ph === 'podium' ? 1 : .3;
  fans.list.forEach((f, i) => { const b = Math.abs(Math.sin(T * (3 + hype * 3) + f.ph)) * .08 * hype; _m.compose(_v.set(f.x, f.y + b, f.z), _q.setFromEuler(_e.set(0, f.f, Math.sin(T * 2 + f.ph) * .06)), _s.set(1, 1, 1)); fans.mesh.setMatrixAt(i, _m); fans.head.setMatrixAt(i, _m); });
  fans.mesh.instanceMatrix.needsUpdate = true; fans.head.instanceMatrix.needsUpdate = true;
  flashes.forEach(fl => { fl.t = Math.max(0, fl.t - dt * 3); fl.sp.material.opacity = fl.t; if(ph === 'runway' && Math.random() < dt * .6){ popFlash(fl); } });
}
function popFlash(fl){ const f = pick(fans.list); fl.sp.position.set(f.x, f.y + .9, f.z); fl.t = 1; }
function popFlashes(n){ for(let i = 0; i < n; i++) popFlash(pick(flashes)); }
function roomFrame(dt){
  const on = R && R.ph === 'dress' && state !== 'menu';
  room.visible = on || camMode === 'dress';
  if(!ME) return;
  const f = W.fitOf(heroId);
  ME.grp.position.set(DR.x, .155, 0);
  // rotation: swipe to turn, otherwise a gentle sway; show the back for capes and bags
  if(dragX == null){ const want = (dressTab === 'back' ? Math.PI : 0) + Math.sin(T * .6) * .35; meRotV += (angWrap(want - meRot) * 6 - meRotV * 3.5) * dt; }
  meRot += meRotV * dt; if(dragX == null) meRotV *= Math.exp(-dt * .5);
  twirl = Math.max(0, twirl - dt * 1.6);
  ME.grp.rotation.y = meRot + (twirl > 0 ? Math.sin(twirl * Math.PI) * .5 : 0);
  poseHero(ME, { t:T, dt, run:0, grounded:true, vy:0, sq:0, flip:0 }); ME.body.rotation.y = 0;
  if(twirl > 0) applyPose(ME, 'hip', 1 - twirl, 0);
  // the reflection copies everything mirrored in z
  MR.grp.position.set(DR.x, .155, 2 * DR.mz - 0);
  MR.grp.rotation.y = -ME.grp.rotation.y;
  copyPose(ME, MR);
}
const angWrap = a => { while(a > Math.PI) a -= Math.PI * 2; while(a < -Math.PI) a += Math.PI * 2; return a; };
function copyPose(a, b){
  b.body.position.copy(a.body.position); b.body.rotation.copy(a.body.rotation); b.body.scale.copy(a.body.scale);
  b.head.rotation.copy(a.head.rotation);
  a.arms.forEach((x, i) => b.arms[i] && b.arms[i].rotation.copy(x.rotation));
  a.legs.forEach((x, i) => b.legs[i] && b.legs[i].rotation.copy(x.rotation));
  a.sway.forEach((x, i) => b.sway[i] && b.sway[i].rotation.copy(x.rotation));
  const want = a.face.material.map === a.face.userData.open ? b.face.userData.open : b.face.userData.shut;
  if(b.face.material.map !== want){ b.face.material.map = want; b.face.material.needsUpdate = true; }
}
const lightNow = { hemi:1.2, sun:1.6, spot:0, lamp:0 };
function updateCamera(dt){
  const ph = R ? R.ph : 'menu';
  let mode = 'menu';
  if(R && state !== 'menu'){
    if(ph === 'dress' && mySlot() >= 0) mode = 'dress';
    else if(ph === 'theme') mode = 'theme';
    else if(ph === 'runway' || ph === 'results') mode = 'runway';
    else if(ph === 'podium') mode = 'podium';
    else if(ph === 'lobby') mode = 'menu';
    else mode = 'theme';
  }
  if(mode !== camMode){ camMode = mode; snapCam = true; }
  let L0 = { hemi:1.0, sun:1.0, spot:1, lamp:0 }, focus = [0, RUN.endZ];
  if(mode === 'menu'){
    menuT += dt; const a = Math.sin(menuT * .15) * .55;
    wantPos.set(Math.sin(a) * 6.2 + (RTL ? -1.4 : 1.4), 2.4, RUN.endZ + Math.cos(a) * 6.2); wantLook.set(RTL ? -1.7 : 1.7, 1.1, RUN.endZ - .5);
  } else if(mode === 'theme'){
    const a = (THEME_T - (R ? R.left : 0)) * .05;
    wantPos.set(Math.sin(a) * 2, 4.6, 11.5 - a * 4); wantLook.set(0, 1.4, -5); focus = [0, -4];
  } else if(mode === 'dress'){
    const b = boneOf(dressTab);
    wantPos.set(DR.x + b.x + .75, b.y + .3, b.d); wantLook.set(DR.x + b.x - .05, b.y, 0);
    L0 = { hemi:1.55, sun:1.5, spot:0, lamp:1 }; focus = [DR.x, 0];
  } else if(mode === 'runway'){
    const w = ph === 'runway' ? walkAt(R.tt) : walkAt(TURN_T);
    const end = w.end != null;
    wantPos.set(end ? 1.2 : 1.7, RUN.top + (end ? 1.4 : 1.8), Math.min(w.z + (end ? 4.3 : 5.0), 8.5)); wantLook.set(0, RUN.top + .75, w.z - (end ? 0 : .6)); focus = [0, w.z];
  } else if(mode === 'podium'){
    wantPos.set(Math.sin(T * .2) * .6 + (RTL ? -1.9 : 1.9), 2.2, RUN.endZ + 5.2); wantLook.set(RTL ? -2.0 : 2.0, 1.25, RUN.endZ); focus = [0, RUN.endZ];
  }
  const snap = snapCam, k = snap ? 1 : 1 - Math.exp(-dt * (mode === 'runway' ? 3.2 : 4));
  camPos.lerp(wantPos, k); camLook.lerp(wantLook, k); snapCam = false;
  camera.position.copy(camPos); camera.lookAt(camLook);
  aimSun(focus[0], focus[1]);
  // lights blend between the stage and the dressing room
  const lk = 1 - Math.exp(-dt * 4);
  for(const n in lightNow) lightNow[n] = lerp(lightNow[n], L0[n], snap ? 1 : lk);
  hemi.intensity = lightNow.hemi * 1.25; sun.intensity = lightNow.sun * 1.5;
  hemi.color.setHex(mode === 'dress' ? 0xfff4f8 : 0xffe6f4); hemi.groundColor.setHex(mode === 'dress' ? 0xc9a0b8 : 0x5a3a6a);
  roomLamp.position.set(DR.x + .5, 2.6, 1.6); roomLamp.intensity = lightNow.lamp * 9;
  // spotlights follow the walker (or sweep)
  const th = THEMES[R ? R.th : 1];
  const tgt = mode === 'runway' ? [0, RUN.top, walkAt(ph === 'runway' ? R.tt : TURN_T).z] : mode === 'podium' ? [0, RUN.top + .5, RUN.endZ] : mode === 'menu' ? [0, RUN.top, RUN.endZ] : [Math.sin(T * .9) * 2.5, 0, -4 + Math.cos(T * .7) * 4];
  spots.forEach((s, i) => {
    s.color.setHex(th.spot[i]); s.intensity = lightNow.spot * 160;
    s.position.set(i ? 5.15 : -5.15, 6.25, (mode === 'runway' ? tgt[2] : -1) + .2);
    s.target.position.set(tgt[0] + (i ? .25 : -.25) + (mode === 'theme' ? (i ? 1 : -1) * Math.sin(T * 1.3) : 0), tgt[1], tgt[2]);
    const b = beams[i]; b.visible = mode !== 'dress';
    if(b.visible){ b.position.copy(s.position); const d = _v.copy(s.target.position).sub(s.position), len = d.length(); b.scale.set(1, len, 1); b.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), d.normalize()); b.material.color.setHex(th.spot[i]); b.material.opacity = .13 * lightNow.spot; }
  });
}

/* ---------- swipe to turn the character in the dressing room ---------- */
const touch = $('#touch');
touch.addEventListener('pointerdown', e => { if(!canDress()) return; const p = toLayer(e.clientX, e.clientY); dragX = p.x; meRotV = 0; touch.setPointerCapture(e.pointerId); ac(); });
touch.addEventListener('pointermove', e => { if(dragX == null) return; const p = toLayer(e.clientX, e.clientY), dx = p.x - dragX; dragX = p.x; meRot += dx * .012; meRotV = dx * .7; if(SAVE.tut < 3 && Math.abs(dx) > 3) spinHint.hidden = true; });
const endDrag = () => { dragX = null; };
touch.addEventListener('pointerup', endDrag); touch.addEventListener('pointercancel', endDrag);

/* ======================================================================
   Main loop
   ====================================================================== */
let TS = 1, last = performance.now(), fpsN = 0, fpsT = 0, fps = 60, slowT = 0, fitSendT = 0, lastPh = '', voteSaid = false;
function frame(now){
  requestAnimationFrame(frame);
  let dt = (now - last) / 1000; last = now; if(dt > .05) dt = .05; if(dt <= 0) dt = .001;
  fpsN++; fpsT += dt; dt *= TS; T += dt;
  if(fpsT >= 1){
    fps = fpsN / fpsT; fpsN = 0; fpsT = 0;
    if(state === 'game' && fps < 42){ slowT++; if(slowT >= 2){ slowT = 0; if(dpr > 1){ dpr = Math.max(1, dpr - .25); renderer.setPixelRatio(dpr); renderer.setSize(SW, SH, false); } else if(renderer.shadowMap.enabled && fps < 30){ renderer.shadowMap.enabled = false; sun.castShadow = false; scene.traverse(o => { if(o.material) o.material.needsUpdate = true; }); } } } else slowT = 0;
  }
  poseCD = Math.max(0, poseCD - dt);
  hostTick(dt); followTick(dt);
  if(R && R.ph === 'runway' && state === 'game'){
    const tk = R.n + '_' + R.turn;
    if(tk !== lastPh){ lastPh = tk; const w = R.order[R.turn]; SFX.flag(); snapCam = R.turn > 0;
      if(w === mySlot()) say(LINES.walk, 3800, true); else if(!voteSaid){ voteSaid = true; say(LINES.vote, 3800, true); } }
  }
  stageFrame(dt); roomFrame(dt);
  updateCamera(dt);
  if(state === 'game'){ hudFrame(); drawVote(false); }
  mpFrame(dt); thumbPump();
  updateParts(dt);
  renderer.render(scene, camera);
}
document.addEventListener('visibilitychange', () => { if(document.hidden){ persist(); if(state === 'game' && solo && R && R.ph !== 'podium') showPause(); } });
addEventListener('pagehide', () => persist());

/* ======================================================================
   Online («👫 العب مع أصحابك»): a room of up to 4. Nothing is stored on a server.
   Events: st (host snapshot), fit (my outfit + ready), vote, pose. No names, no chat: a player is a character + a colour badge.
   ====================================================================== */
const MP_URL = 'https://vgpwtrzplggvlsuvqsas.supabase.co', MP_KEY = 'sb_publishable_D9thEhZlZnfn0t06j8h1Rw_H-LVF786';
const MP_EVENTS = ['st', 'fit', 'vote', 'pose', 'req'];
const MP_MAX = 4;
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
    if(!SupabaseTransport.client) SupabaseTransport.client = window.supabase.createClient(MP_URL, MP_KEY, {
      auth:{ persistSession:false, autoRefreshToken:false, detectSessionInUrl:false }, realtime:{ params:{ eventsPerSecond:30 } } });
    const sb = SupabaseTransport.client;
    const ch = this.ch = sb.channel('bobo-fashion-' + code, { config:{ broadcast:{ self:false, ack:false }, presence:{ key:id, enabled:true } } });
    ch.on('presence', { event:'sync' }, () => {
      const st = ch.presenceState(), list = [];
      for(const k in st){ const m = st[k]; if(m && m.length) list.push(Object.assign({}, m[m.length - 1], { id:k })); }
      h.presence(list);
    });
    MP_EVENTS.forEach(ev => ch.on('broadcast', { event:ev }, m => h.msg(ev, m && m.payload)));
    await new Promise((res, rej) => {
      let first = true;
      const to = setTimeout(() => { if(first){ first = false; rej(new Error('timeout')); } }, 9000);
      ch.subscribe(status => {
        if(status === 'SUBSCRIBED'){ if(first){ first = false; clearTimeout(to); res(); } else h.status('up'); }
        else if(status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED'){
          if(first){ first = false; clearTimeout(to); rej(new Error(status)); } else if(!this.closed) h.status('down');
        }
      });
    });
  }
  track(meta){ try{ const p = this.ch && this.ch.track(Object.assign({}, meta)); if(p && p.catch) p.catch(() => {}); }catch(e){} }
  send(ev, payload){ try{ const p = this.ch && this.ch.send({ type:'broadcast', event:ev, payload }); if(p && p.catch) p.catch(() => {}); }catch(e){} }
  close(){
    this.closed = true; const ch = this.ch, sb = SupabaseTransport.client; this.ch = null;
    if(!ch || !sb) return;
    try{ const p = ch.untrack(); if(p && p.catch) p.catch(() => {}); }catch(e){}
    try{ const p = sb.removeChannel(ch); if(p && p.catch) p.catch(() => {}); }catch(e){}
  }
}
class LocalTransport{
  open(code, id, h){
    this.id = id; this.h = h; this.meta = null; this.peers = new Map(); this.ready = false;
    const bc = this.bc = new BroadcastChannel('bobo-fashion-' + code);
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
const MP = { t:null, id:null, code:null, list:[], players:[], meta:null, isHost:false, hostId:null, synced:false, screen:'off', tok:0, inviteFor:null, typed:'' };
window.__boboRoom = () => (MP.t && MP.meta && MP.code) ? MP.code : null;
const mpActive = () => !!(MP.t && MP.meta);
const mpNewId = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
const mpSort = (a, b) => ((a.o || 0) - (b.o || 0)) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
const okHero = id => HEROES[id] ? id : 'sara';
/* «أصحابي»: tell friends which room I'm in. The server may not know the game id yet, so every call is guarded. */
const FR_GAME = 'fashion';
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
function mpClose(){
  frRoom(null);
  if(MP.t){ try{ MP.t.close(); }catch(e){} }
  MP.t = null; MP.meta = null; MP.list = []; MP.players = []; MP.isHost = false; MP.hostId = null; MP.synced = false;
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
  MP.meta = { hero:heroId, c, o:others.reduce((m, p) => Math.max(m, p.o || 0), 0) + 1, ph:'play' };
  t.track(MP.meta);
  MP.hostId = how === 'create' ? MP.id : others.slice().sort(mpSort)[0].id;
  mpPresence(MP.list);
  frRoom(code);
  return 'ok';
}
function mpTrack(){ if(MP.t && MP.meta){ MP.meta.hero = heroId; MP.t.track(MP.meta); hudKey = ''; } }
function mpSend(ev, p){ if(MP.t && !solo) MP.t.send(ev, Object.assign({ id:MP.id }, p)); }
function mpPresence(list){
  list = (list || []).filter(p => p.ph !== 'probe');
  MP.list = list; MP.synced = true;
  if(!MP.meta) return;
  const all = list.filter(p => p.id !== MP.id).concat([Object.assign({}, MP.meta, { id:MP.id })]).sort(mpSort);
  const me = all.findIndex(p => p.id === MP.id);
  if(me >= MP_MAX){ mpLeave(); showMenu(); say(L('الغرفة مليانة 🙈', 'The room is full 🙈', 'Oda dolu 🙈')); return; }
  const before = MP.players.map(p => p.id);
  MP.players = all.slice(0, MP_MAX);
  MP.isHost = MP.hostId === MP.id;
  if(!MP.isHost && MP.hostId && !MP.players.some(p => p.id === MP.hostId)){ mpLeave(); showMenu(); say(L('صاحب الغرفة طلع 🚪', 'The room owner left 🚪', 'Oda sahibi çıktı 🚪'), 4000); return; }
  const joined = MP.players.filter(p => p.id !== MP.id && !before.includes(p.id));
  if(joined.length && before.length) SFX.flag();
  if(MP.isHost && R){
    // humans who left become bots; heroes follow what players picked
    const here = new Map(MP.players.map(p => [p.id, p]));
    R.slots.forEach(s => {
      if(s.bot){ if(s.was && here.has(s.was)){ s.bot = false; s.id = s.was; s.was = null; } return; }   // back after a short drop-out
      const p = here.get(s.id);
      if(!p){ s.was = s.id; s.bot = true; s.id = null; s.ready = true; s.skill = .7; if(!s.o) s.o = W.botOutfit(THEMES[R.th], .7); } else s.hero = okHero(p.hero);
    });
    if(R.ph === 'lobby'){ R.slots = hostSlots(); if(state === 'game') lobbyCard(); }
    hostBroadcast(true);
  }
  hudKey = '';
}
/* the host's snapshot of the round */
function hostBroadcast(force){
  if(solo || !MP.isHost || !R || !mpActive()) return;
  hostSendT = force ? 1.5 : 1.5;
  const showO = R.ph === 'runway' || R.ph === 'results' || R.ph === 'podium' || R.ph === 'lobby';
  mpSend('st', { n:R.n, ph:R.ph, th:R.th, left:Math.round(R.left * 10) / 10, turn:R.turn, tt:Math.round(R.tt * 100) / 100, order:R.order,
    s:R.slots.map(s => ({ id:s.id, h:s.hero, b:s.bot ? 1 : 0, c:s.c, r:s.ready ? 1 : 0, o:showO && s.o ? s.o : null })), res:R.ph === 'podium' ? R.res : null });
}
function stIn(p){
  if(MP.isHost || p.id !== MP.hostId) return;
  if(!Array.isArray(p.s) || p.s.length !== NSLOT || !['lobby', 'theme', 'dress', 'runway', 'results', 'podium'].includes(p.ph)) return;
  const newRoundNo = !R || R.n !== (p.n | 0);
  if(!R || newRoundNo){ const old = R; R = freshRound(p.n | 0); if(old && old.n === R.n) R.mine = old.mine; }
  R.th = clamp(p.th | 0, 0, THEMES.length - 1);
  R.slots = p.s.map((s, i) => ({ id:typeof s.id === 'string' ? s.id : null, hero:okHero(s.h), bot:!!s.b, c:clamp(s.c | 0, 0, 3), ready:!!s.r, o:s.o ? W.okOutfit(s.o) : (R.slots[i] && R.slots[i].o) || null }));
  R.order = Array.isArray(p.order) ? p.order.map(x => clamp(x | 0, 0, 3)).slice(0, NSLOT) : [];
  R.turn = clamp(p.turn | 0, 0, NSLOT);
  if(R.ph !== 'runway' || R.turn !== (p.turn | 0) || Math.abs(R.tt - (+p.tt || 0)) > .4) R.tt = clamp(+p.tt || 0, 0, TURN_T);
  if(Math.abs(R.left - (+p.left || 0)) > .6 || R.ph !== p.ph) R.left = Math.max(0, +p.left || 0);
  if(Array.isArray(p.res)) R.res = p.res.filter(r => r && typeof r === 'object').map(r => ({ i:clamp(r.i | 0, 0, 3), avg:clamp(+r.avg || 0, 0, 5), n:r.n | 0, sc:+r.sc || 0 })).slice(0, NSLOT);
  if(R.ph !== p.ph){ const old = R.ph; R.ph = p.ph; onPhase(p.ph, old); }
  else if((newRoundNo || R.ph === 'lobby') && state === 'game') renderPhaseUI();
  hudKey = '';
}
let lastFitKey = '';
function sendFit(){
  fitSendT = 1.5;
  if(solo || !R || R.ph !== 'dress' || mySlot() < 0) return;
  mpSend('fit', { r:R.n, o:myOutfit, ready:R.mine.ready ? 1 : 0 });
}
function mpMsg(ev, p){
  if(ev === 'st'){ stIn(p); return; }
  if(!R) return;
  if(ev === 'fit'){
    if(!MP.isHost || (p.r | 0) !== R.n || !(R.ph === 'dress' || R.ph === 'theme')) return;
    const s = R.slots.find(x => !x.bot && x.id === p.id); if(!s) return;
    s.o = W.okOutfit(p.o); s.ready = !!p.ready; hudKey = '';
  }
  else if(ev === 'vote'){
    if(!MP.isHost || (p.r | 0) !== R.n || R.ph !== 'runway') return;
    const to = p.to | 0; if(R.order[R.turn] !== to) return;
    const vi = R.slots.findIndex(x => !x.bot && x.id === p.id), key = vi >= 0 ? 'p' + vi : 'x' + String(p.id).slice(0, 20);
    if(vi === to) return;
    (R.votes[key] = R.votes[key] || {})[to] = clamp(p.s | 0, 1, 5);
  }
  else if(ev === 'pose'){
    if((p.r | 0) !== R.n || R.ph !== 'runway') return;
    const i = clamp(p.i | 0, 0, 3); if(R.order[R.turn] !== i || i === mySlot()) return;
    const s = R.slots[i]; if(!(s.bot ? p.id === MP.hostId : s.id === p.id)) return;
    startPose(i, POSES[clamp(p.k | 0, 0, POSES.length - 1)]);
  }
  else if(ev === 'req'){ if(MP.isHost) hostBroadcast(true); }
}
function mpFrame(dt){ }
function mpLeave(silent){
  MP.tok++; mpClose(); MP.screen = 'off';
  solo = true;
}
function mpCard(wide){ state = 'mp'; setGameUI(); openOverlay('dim', wide ? 'wide' : ''); }
function mpMenu(){
  MP.tok++; mpClose(); MP.screen = 'menu'; R = null; solo = true; mpCard(false);
  card.innerHTML = `<h2>👫 ${L('العب مع أصحابك', 'Play with friends', 'Arkadaşlarla oyna')}</h2>
    <p>👗 ${L('كل واحد بيلبس على الموضوع، بتمشوا عالمنصة، وبتصوّتوا لبعض بالنجوم', 'Everyone dresses for the theme, you walk the runway and vote for each other with stars', 'Herkes temaya göre giyinir, podyumda yürür ve birbirinize yıldızla oy verirsiniz')}</p>
    <button class="hero-btn" id="bMyHero" style="--c:${HERO_COLOR[heroId]}"><img src="${charImg(heroId)}" alt=""><span>${HERO_NAME[heroId]} 🔄</span></button>
    <div class="row"><button class="big-btn" id="bCreate">🏠 ${L('اعمل غرفة', 'Create room', 'Oda kur')}</button>
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
  MP.screen = 'in'; solo = false; state = 'game';
  if(ROT) rawSet('fashion_rothint', '1');
  if(MP.isHost){ R = null; lobbyRound(); say(L('رقم غرفتك ', 'Your room number is ', 'Oda numaran ') + [...MP.code].map(N).join('') + L(' — قولو لأصحابك 👫', ' — tell your friends 👫', ' — arkadaşlarına söyle 👫'), 6000, true); }
  else { R = null; mpSend('req', {}); openOverlay('dim'); card.innerHTML = `<div class="bigstar"><span class="spin">⏳</span></div><h2>${L('عم نفوت عالغرفة…', 'Entering the room…', 'Odaya giriliyor…')}</h2>`; setGameUI(); }
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
/* «تعا العب» from the friends page: ?host=1&invite=<friendCode>. The server may not accept 'fashion' yet: guarded. */
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
window.__fashion = {
  get state(){ return state; }, get mpScreen(){ return MP.screen; }, menu:() => showMenu(), solo:() => startSolo(),
  get ph(){ return R ? R.ph : null; }, get round(){ return R ? JSON.parse(JSON.stringify({ n:R.n, ph:R.ph, th:R.th, theme:THEMES[R.th].id, left:R.left, turn:R.turn, tt:R.tt, order:R.order, slots:R.slots, votes:R.votes, res:R.res, reward:R.mine.reward || null })) : null; },
  setLeft(s){ if(R) R.left = s; }, skipTurn(){ if(R && R.ph === 'runway') R.tt = TURN_T; }, setTT(s){ if(R){ R.tt = s; snapCam = true; } },
  ready:() => { if(canDress() && !R.mine.ready) readyBtn.onclick(); }, get mySlot(){ return mySlot(); },
  wear:(slot, id, c, p) => { if(!canDress()) return false; if(!owns(id)) return false; const ok = wear(slot, id, c, p); drawPanel(); return ok; },
  pick:id => pickItem(id), color:c => pickColor(c), print:p => pickPrint(p), tab:s => { dressTab = s; if(canDress()) drawPanel(); },
  get outfit(){ return W.cloneOutfit(myOutfit); }, unlock:id => unlockItem(id), unlockPrint:i => unlockPrint(i), owns:id => owns(id),
  vote:(to, s) => castVote(to, s), pose:k => doPose(k),
  save:() => JSON.parse(JSON.stringify(SAVE)), saveNow:() => persist(), addStars(n){ SAVE.stars += n; persist(); hudKey = ''; },
  wardrobe:() => showWardrobe('menu'), setHero:id => setHero(id), get hero(){ return heroId; },
  get mp(){ return { code:MP.code, active:mpActive(), isHost:MP.isHost, solo, players:MP.players.map(p => ({ id:p.id, hero:p.hero })) }; },
  get models(){ return SM.map((m, i) => m && m.h ? { i, hero:m.hero, vis:m.h.grp.visible, key:m.okey, x:m.x, z:m.z } : null); },
  THEMES:THEMES.map(t => t.id), ITEMS:Object.keys(ITEMS), themeScore:(o, th) => W.themeScore(W.okOutfit(o), THEMES[th]), botOutfit:th => W.botOutfit(THEMES[th]),
  get fps(){ return fps; }, get dpr(){ return dpr; }, get rot(){ return ROT; }, get shadows(){ return renderer.shadowMap.enabled; },
  hud(on){ $('#free').style.visibility = on ? '' : 'hidden'; dpanel.style.visibility = on ? '' : 'hidden'; poseBtn.style.visibility = on ? '' : 'hidden'; },
  speed(k){ TS = k || 1; },
  thumbs:() => Object.keys(thumbCache).length, rotate:a => { meRot = a; meRotV = 0; }, cam:() => ({ p:camPos.toArray(), l:camLook.toArray() })
};

/* ---------- boot ---------- */
buildStage(); buildRoom();
buildMe();
resize();
/* warm up the shader programs once (prints, glass, the mask) so the first dressing room doesn't stutter */
try{
  const warm = W.okOutfit({ hat:['helmet', 8, 0], top:['tee', 0, 1], glasses:['heromask', 9, 0], prop:['lantern', 10, 0] });
  W.dress(ME, warm); room.visible = true; renderer.compile(scene, camera); thumb('tee', 0, 1);
  meKey = ''; dressMe();
}catch(e){}
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
