/* «بسطات بوبو» (Bobo Booths / Bobo Tezgahları) — an island plaza at sunset with a ring of 16 wooden booths around a fountain.
   Every kid walks around the plaza (one of our 7 characters or their own 'me' avatar), picks a free booth and presses
   «🏪 احجز البسطة»: the booth shows the kid's server name, a sign the kid CHOOSES from a fixed list (no free text), a roof
   colour and a decoration. Visitors standing in front of a booth give it a free «❤️ قلب» or a sticker (🌟 🎈 🍭): it pops
   above the booth, the owner sees «<name> أعطاك ❤️», and the booth's heart counter goes up (one gift per booth every 10 s per
   kid). 10 / 25 / 50 / 100 hearts → confetti and a fanfare. «🏆 أحلى البسطات» by the fountain lists the 5 booths with most
   hearts. Two golf carts to hop in and drive around (🛺 / 🚪). Emotes 👋 ❤️ 👍 😂 🎉 💃 🙋 (only the id travels).
   No money of any kind, no shop: hearts are just for fun (this session's count lives on the booth; the kid's lifetime total
   «❤️ قلوبي» is kept on this phone only).
   Online, by default: the PUBLIC plaza (Realtime channels `bobo-booths-pub-<n>`, up to 16 kids per shard, like hara).
   No bots: only real kids. Alone → «ادعي أصحابك!» and the invite button (a private room: ?host / ?join / ?room / ?invite).
   Booth claims are host-authoritative: the earliest kid in the shard (presence order) keeps the booth table, answers
   'claim' / 'free' / 'gift' and re-broadcasts the whole table ('st') when anything changes or someone joins; hearts are
   counted by the host only ('gv'), so every phone shows the same numbers. A booth is freed when its owner leaves. */
import * as THREE from '../adventure3d/three.module.min.js';
import { makeKit } from '../worlds/kit.js';
import { makePlaza } from './world.js';
import { makeAudio } from './audio.js';

const $ = s => document.querySelector(s);
{ const md = document.querySelector('meta[name="description"]'), dl = window.I18N && md && md.getAttribute('data-' + I18N.lang); if(dl) md.setAttribute('content', dl); }
const N = n => String(n);
const rawGet = k => { try{ return localStorage.getItem(k); }catch(e){ return null; } };
const rawSet = (k, v) => { try{ localStorage.setItem(k, v); }catch(e){} };
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const angDiff = (a, b) => { let d = a - b; while(d > Math.PI) d -= Math.PI * 2; while(d < -Math.PI) d += Math.PI * 2; return d; };
const QS = new URLSearchParams(location.search);
const MP_LOCAL = QS.get('mp') === 'local';
const CAP = clamp(parseInt(QS.get('cap'), 10) || 16, 1, 16), SHARDS = 20;
const SLOT = MP_LOCAL && /^[a-z]$/.test(QS.get('slot') || '') ? '_' + QS.get('slot') : '';
const cleanName = s => String(s || '').replace(/[^\p{L} ]/gu, '').replace(/\s+/g, ' ').slice(0, 14);
const AU = makeAudio(), SFX = AU.SFX;
const K = makeKit(THREE);
const { HEROES, HERO_IDS, HERO_NAME, HERO_COLOR, poseHero } = K;
const ALL_HEROES = HERO_IDS.slice();
const heroName = id => HERO_NAME[id] || HERO_NAME.sara;
const heroCol = id => HERO_COLOR[id] || '#9c7be3';
const TITLE = L('بسطات بوبو', 'Bobo Booths', 'Bobo Tezgahları');
const DIR = (window.I18N && I18N.dir) || 'rtl';

/* ---------- what a booth can show: only these (the index travels, every phone writes it in its own language) ---------- */
const SIGNS = [
  { e:'👋', t:() => L('زوروني!', 'Visit me!', 'Beni ziyaret et!') },
  { e:'❤️', t:() => L('بحب الأصحاب', 'I love my friends', 'Arkadaşlarımı seviyorum') },
  { e:'🏆', t:() => L('أنا بطل', "I'm a champ", 'Ben bir şampiyonum') },
  { e:'🌟', t:() => L('مرحبا بالكل', 'Hello everyone', 'Herkese merhaba') },
  { e:'🎮', t:() => L('يلا نلعب', "Let's play", 'Hadi oynayalım') },
  { e:'😊', t:() => L('ابتسم!', 'Smile!', 'Gülümse!') },
  { e:'🙏', t:() => L('شكراً عالقلوب', 'Thanks for the hearts', 'Kalpler için teşekkürler') },
  { e:'🎨', t:() => L('بسطتي أحلى بسطة', 'The prettiest booth', 'En güzel tezgah') }
];
const COLORS = ['#ff6f9a', '#ffb43d', '#5ed6a0', '#6cc4ff', '#b07cff', '#ff7a4a', '#ffe14a', '#3fc4c4'];
const DECOS = ['🎈', '🌸', '⭐', '🍭', '🐻', '🦄', '🌈', '🍉', '🐱', '🚀'];
const GIFTS = [
  { k:'heart', e:'❤️', n:() => L('قلب', 'heart', 'kalp') },
  { k:'star', e:'🌟', n:() => L('نجمة', 'star', 'yıldız') },
  { k:'balloon', e:'🎈', n:() => L('بالون', 'balloon', 'balon') },
  { k:'candy', e:'🍭', n:() => L('مصّاصة', 'lollipop', 'lolipop') }
];
const GIFT = Object.fromEntries(GIFTS.map(g => [g.k, g]));
const GIFT_GAP = 10000, GIFT_GAP_HOST = 9000;
const MILESTONES = [10, 25, 50, 100];
const isMilestone = n => MILESTONES.includes(n) || (n > 100 && n % 50 === 0);

/* ======================================================================
   Save (this phone): hero, the last booth look, my lifetime hearts
   ====================================================================== */
const SAVE_KEY = 'booths_save' + SLOT, SAVE_V = 1;
function freshSave(){ return { v:SAVE_V, hero:'sara', s:0, c:0, d:0, life:0, best:0 }; }
function loadSave(){
  try{
    const v = JSON.parse(rawGet(SAVE_KEY));
    if(v && typeof v === 'object' && v.v === SAVE_V){
      const s = Object.assign(freshSave(), v);
      s.s = clamp(s.s | 0, 0, SIGNS.length - 1); s.c = clamp(s.c | 0, 0, COLORS.length - 1); s.d = clamp(s.d | 0, 0, DECOS.length - 1);
      s.life = clamp(s.life | 0, 0, 9999999); s.best = clamp(s.best | 0, 0, 9999999);
      return s;
    }
  }catch(e){}
  return null;
}
let SAVE = loadSave() || freshSave();
let saveTO = 0;
function persist(now){ clearTimeout(saveTO); if(now) rawSet(SAVE_KEY, JSON.stringify(SAVE)); else saveTO = setTimeout(() => rawSet(SAVE_KEY, JSON.stringify(SAVE)), 400); }
addEventListener('pagehide', () => persist(true));
let heroId = ALL_HEROES.includes(QS.get('hero')) ? QS.get('hero') : ALL_HEROES.includes(SAVE.hero) ? SAVE.hero : 'sara';

/* ======================================================================
   Always-landscape stage (rotated layer when the phone is held upright)
   ====================================================================== */
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

/* ======================================================================
   Renderer, camera, sunset sky, lights
   ====================================================================== */
const canvas = $('#cv');
let renderer;
try{ renderer = new THREE.WebGLRenderer({ canvas, antialias:true, powerPreference:'high-performance' }); }
catch(e){ $('#nogl').hidden = false; $('#overlay').hidden = true; throw e; }
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.1;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = window.BoboGfx && BoboGfx.weak(renderer) ? THREE.PCFShadowMap : THREE.PCFSoftShadowMap;
const MAXDPR = (window.BoboGfx ? BoboGfx.dpr(1.5, renderer) : Math.min(window.devicePixelRatio || 1, 1.5));
let quality = QS.get('q') != null ? clamp(+QS.get('q') | 0, 0, 2) : (window.BoboGfx && BoboGfx.weak(renderer) ? 1 : 2);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, 1, .2, 700);
const hemi = new THREE.HemisphereLight(0xb7a6ff, 0x5a4250, 1.05); scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffb27a, 1.35);
sun.castShadow = true; sun.shadow.bias = -.0005; sun.shadow.normalBias = .05;
Object.assign(sun.shadow.camera, { left:-22, right:22, top:22, bottom:-22, near:1, far:140 }); sun.shadow.camera.updateProjectionMatrix();
scene.add(sun); scene.add(sun.target);
const ptLights = [];
for(const [x, y, z, i, d] of [[0, 3.2, 0, 16, 16], [0, 4.2, 12, 10, 14], [0, 4.2, -12, 10, 14], [12, 4.2, 0, 10, 14], [-12, 4.2, 0, 10, 14]]){
  const p = new THREE.PointLight(0xffc98a, i, d, 1.3); p.position.set(x, y, z); scene.add(p); ptLights.push(p);
}
function applyQuality(){
  const d = quality === 2 ? MAXDPR : quality === 1 ? Math.min(MAXDPR, 1.1) : .85;
  renderer.setPixelRatio(d);
  renderer.shadowMap.enabled = quality > 0; sun.castShadow = quality > 0;
  sun.shadow.mapSize.set(quality === 2 ? 2048 : 1024, quality === 2 ? 2048 : 1024);
  if(sun.shadow.map){ sun.shadow.map.dispose(); sun.shadow.map = null; }
  ptLights.forEach((l, i) => { l.visible = quality > 1 || (quality > 0 && i === 0); });
  scene.traverse(o => { if(o.material && o.material.needsUpdate !== undefined) o.material.needsUpdate = true; });
  resize();
}
function resize(){
  layout();
  renderer.setSize(SW, SH, false);
  camera.aspect = SW / SH; camera.updateProjectionMatrix();
  placeJoyHome();
}
addEventListener('resize', () => resize());
addEventListener('orientationchange', () => setTimeout(resize, 120));
const _v = new THREE.Vector3(), _v2 = new THREE.Vector3(), _c = new THREE.Color(), _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _s = new THREE.Vector3();

/* sky dome: sunset gradient (deep blue top, pink-orange horizon) + first stars */
const skyU = { top:{ value:new THREE.Color(0x2b2a6e) }, hor:{ value:new THREE.Color(0xff9a76) }, low:{ value:new THREE.Color(0x3b4a8a) } };
const sky = new THREE.Mesh(new THREE.SphereGeometry(450, 24, 12), new THREE.ShaderMaterial({ side:THREE.BackSide, depthWrite:false, fog:false, uniforms:skyU,
  vertexShader:'varying vec3 vp; void main(){ vp = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader:'uniform vec3 top; uniform vec3 hor; uniform vec3 low; varying vec3 vp; void main(){ float h = vp.y; vec3 c = h > 0.0 ? mix(hor, top, pow(clamp(h * 1.7, 0.0, 1.0), 0.55)) : mix(hor, low, clamp(-h * 5.0, 0.0, 1.0)); gl_FragColor = vec4(c, 1.0);\n#include <colorspace_fragment>\n}' }));
sky.renderOrder = -10; scene.add(sky);
const starPts = (() => { const p = []; for(let i = 0; i < 400; i++){ const a = Math.random() * 6.283, e = .35 + Math.random() * 1.1; p.push(Math.cos(a) * Math.cos(e) * 420, Math.sin(e) * 420, Math.sin(a) * Math.cos(e) * 420); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3)); const m = new THREE.Points(g, new THREE.PointsMaterial({ color:0xffffff, size:1.5, sizeAttenuation:false, transparent:true, opacity:.55, fog:false, depthWrite:false })); scene.add(m); return m; })();
const sunDisc = new THREE.Sprite(new THREE.SpriteMaterial({ map:K.glowTex, color:0xffc070, transparent:true, opacity:.95, fog:false, depthWrite:false })); sunDisc.scale.setScalar(70); scene.add(sunDisc);
scene.fog = new THREE.Fog(0xb88aa0, 70, 260);

/* ======================================================================
   The plaza
   ====================================================================== */
const PZ = makePlaza(THREE, K);
scene.add(PZ.group);
const NB = PZ.NB;

/* ---------- particles (confetti, sparkles) and floating emoji over the booths ---------- */
const PMAX = 320, parts = [], pMesh = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(.07, 0), new THREE.MeshBasicMaterial(), PMAX);
pMesh.frustumCulled = false; scene.add(pMesh);
for(let i = 0; i < PMAX; i++){ parts.push({ life:0 }); pMesh.setMatrixAt(i, _m.makeScale(0, 0, 0)); pMesh.setColorAt(i, _c.set(0xffffff)); }
let pNext = 0;
function burst(x, y, z, n, colors, speed = 3, size = 1, grav = 6, up = 2, life = .7){
  for(let k = 0; k < n; k++){ const p = parts[pNext], i = pNext; pNext = (pNext + 1) % PMAX; const a = Math.random() * 6.283, s = speed * (.4 + Math.random() * .6);
    Object.assign(p, { life, max:life, x, y, z, vx:Math.cos(a) * s, vz:Math.sin(a) * s, vy:up + Math.random() * up, s:size * (.6 + Math.random() * .6), g:grav }); pMesh.setColorAt(i, _c.set(colors[k % colors.length])); }
  pMesh.instanceColor.needsUpdate = true;
}
function updateParts(dt){
  for(let i = 0; i < PMAX; i++){ const p = parts[i]; if(p.life <= 0) continue; p.life -= dt;
    if(p.life <= 0){ pMesh.setMatrixAt(i, _m.makeScale(0, 0, 0)); continue; }
    p.vy -= p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt; p.vx *= 1 - 2 * dt; p.vz *= 1 - 2 * dt; if(p.y < .05){ p.y = .05; p.vy *= -.3; }
    const s = p.s * Math.min(1, p.life / p.max * 2); pMesh.setMatrixAt(i, _m.compose(_v.set(p.x, p.y, p.z), _q.identity(), _s.set(s, s, s))); }
  pMesh.instanceMatrix.needsUpdate = true;
}
const HEART = [0xff6f9a, 0xff9ab8, 0xffffff], STARC = [0xffd23f, 0xfff3a0, 0xffffff], CONFETTI = [0xffc23d, 0xff8fb1, 0x5ed6a0, 0x6cc4ff, 0xffffff, 0xb07cff];
const GIFT_COL = { heart:HEART, star:STARC, balloon:[0xff6f6f, 0x6cc4ff, 0xffd23f], candy:[0xff8fb1, 0xffffff, 0x8affd0] };
const emojiTex = {};
function emojiMap(e){
  if(!emojiTex[e]){ const c = document.createElement('canvas'); c.width = c.height = 96; const x = c.getContext('2d'); x.font = '72px system-ui, "Noto Color Emoji", sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(e, 48, 54);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; emojiTex[e] = t; }
  return emojiTex[e];
}
const FLOATS = [];
for(let i = 0; i < 28; i++){ const s = new THREE.Sprite(new THREE.SpriteMaterial({ transparent:true, depthWrite:false, toneMapped:false })); s.visible = false; scene.add(s); FLOATS.push({ s, life:0 }); }
let fNext = 0;
function floatEmoji(e, x, y, z, n = 3, size = .9){
  for(let k = 0; k < n; k++){
    const f = FLOATS[fNext]; fNext = (fNext + 1) % FLOATS.length;
    f.s.material.map = emojiMap(e); f.s.material.needsUpdate = true; f.s.visible = true;
    Object.assign(f, { life:1.9 + Math.random() * .5, max:2.3, x:x + (Math.random() - .5) * 1.4, y:y + Math.random() * .3, z:z + (Math.random() - .5) * 1.4, vy:1.1 + Math.random() * .6, wob:Math.random() * 6, size:size * (.8 + Math.random() * .4) });
  }
}
function updateFloats(dt){
  for(const f of FLOATS){ if(f.life <= 0) continue; f.life -= dt;
    if(f.life <= 0){ f.s.visible = false; continue; }
    f.y += f.vy * dt; f.wob += dt * 3;
    f.s.position.set(f.x + Math.sin(f.wob) * .15, f.y, f.z);
    const k = Math.min(1, f.life / .6), g = Math.min(1, (f.max - f.life) * 5);
    f.s.scale.setScalar(f.size * g); f.s.material.opacity = k;
  }
}
const blob = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map:K.blobTex, transparent:true, depthWrite:false, polygonOffset:true, polygonOffsetFactor:-6 }));
blob.renderOrder = 6; scene.add(blob);

/* ======================================================================
   Characters
   ====================================================================== */
const myAv = () => { try{ return window.Avatar ? Avatar.load() : null; }catch(e){ return null; } };
function makeHero(id, av){
  let h; try{ h = HEROES[id](id === 'me' ? (av || myAv()) : undefined); }catch(e){ h = HEROES.sara(); }
  K.shadowHero(h);
  const root = new THREE.Group(), inner = new THREE.Group(); root.add(inner); inner.add(h.grp);
  root.rotation.order = 'YXZ';
  return { grp:root, inner, kit:h };
}
/* s = { t, dt, run, air, vy, sit, drive, emo } */
function poseAny(h, s){
  poseHero(h.kit, { t:s.t, dt:s.dt, run:s.sit ? 0 : s.run, grounded:s.sit ? true : !s.air, vy:s.vy || 0, sq:0, flip:0 });
  const k = h.kit;
  if(s.sit){
    k.legs.forEach(l => { l.rotation.x = -1.45; });
    k.arms.forEach(a => { a.rotation.x = s.drive ? -1.25 + Math.sin(s.t * 3) * .05 : -1.05; a.rotation.z = -a.userData.side * .15; });
    k.body.rotation.x = 0;
  }
  h.inner.position.y = s.sit ? -.42 : 0;
  h.inner.rotation.set(0, 0, 0);
  if(s.emo) emoPose(h, s.emo, !!s.sit);
}
function drawChar(h, s, x, y, z, f){ h.grp.position.set(x, y, z); h.grp.rotation.set(0, f, 0, 'YXZ'); poseAny(h, s); }
/* ---------- emotes (a fixed list: only the id travels) ---------- */
const EMOTES = [
  { k:'wave', e:'👋', n:() => L('مرحبا', 'Hi', 'Merhaba'), say:() => L('مرحبا!', 'Hi!', 'Merhaba!') },
  { k:'heart', e:'❤️', n:() => L('قلب حب', 'Love', 'Sevgi') },
  { k:'ok', e:'👍', n:() => L('تمام', 'OK', 'Tamam') },
  { k:'laugh', e:'😂', n:() => L('ضحك', 'Laugh', 'Gülmek') },
  { k:'party', e:'🎉', n:() => L('احتفال', 'Party', 'Kutlama') },
  { k:'dance', e:'💃', n:() => L('رقصة', 'Dance', 'Dans') },
  { k:'come', e:'🙋', n:() => L('تعا زورني', 'Visit me', 'Gel ziyaret et'), say:() => L('تعا زورني!', 'Come visit!', 'Gel ziyaret et!') }
];
const EMO = Object.fromEntries(EMOTES.map(x => [x.k, x]));
const EMO_SEC = 2.5, EMO_GAP = 1500, EMO_GAP_RX = 1200;
const emoText = k => EMO[k].e + (EMO[k].say ? ' ' + EMO[k].say() : '');
function emoPose(h, emo, sit){
  const k = h.kit, e = (performance.now() - emo.t0) / 1000, A = k.arms, side = a => a.userData.side;
  const arm = (a, x, z) => { if(a){ a.rotation.x = x; a.rotation.z = -side(a) * z; } };
  const hop = v => { if(!sit) h.inner.position.y += v; };
  switch(emo.k){
    case 'wave': arm(A[1], 0, 2.6 + Math.sin(e * 14) * .35); break;
    case 'heart': A.forEach(a => arm(a, -1.3, .6)); k.head.rotation.z = Math.sin(e * 4) * .15; break;
    case 'ok': arm(A[1], -1.9, .15); k.head.rotation.x = Math.abs(Math.sin(e * 6)) * .15; break;
    case 'laugh': k.body.rotation.x = -.22 + Math.sin(e * 22) * .07; A.forEach(a => arm(a, -.7, .35)); hop(Math.abs(Math.sin(e * 22)) * .04); break;
    case 'party': A.forEach((a, i) => arm(a, -.3, 2.5 + Math.sin(e * 12 + i) * .3)); hop(Math.abs(Math.sin(e * 7)) * .3); break;
    case 'dance': h.inner.rotation.y = Math.sin(e * 6) * .7; A.forEach((a, i) => arm(a, -.2, 1.3 + Math.sin(e * 9 + i * 3) * .6)); hop(Math.abs(Math.sin(e * 9)) * .12); break;
    case 'come': arm(A[1], -1.5 + Math.sin(e * 10) * .45, .1); arm(A[0], -.3, .3); break;
  }
}
function emoFx(k, x, y, z, near){
  if(k === 'heart') burst(x, y + 1.6, z, 10, HEART, 1.2, 1, -1, .6, 1.4);
  else if(k === 'party') burst(x, y + 1.7, z, 22, CONFETTI, 3.2, 1, 6, 2.4, 1);
  else if(k === 'laugh') burst(x, y + 1.7, z, 6, STARC, 1, .8, -1, .4, .8);
  if(!near) return;
  if(k === 'heart') SFX.bell(); else if(k === 'party') SFX.found(); else if(k === 'dance') SFX.spin(); else if(k === 'laugh') SFX.boing(); else SFX.sit();
}
const emoOn = c => c && c.emo && performance.now() - c.emo.t0 < EMO_SEC * 1000;
function bubbleEl(){ const d = document.createElement('div'); d.className = 'emo'; d.hidden = true; d.dir = 'auto'; labelsEl.appendChild(d); return d; }
function showBubble(el, k){ el.textContent = emoText(k); el.hidden = false; el.style.animation = 'none'; void el.offsetWidth; el.style.animation = ''; el._t = performance.now(); }
const bubOn = el => !!el._t && performance.now() - el._t < EMO_SEC * 1000;
function project(el, x, y, z, on){
  if(on){ _v.set(x, y, z).project(camera); if(_v.z > 1 || Math.abs(_v.x) > 1.15 || Math.abs(_v.y) > 1.15) on = false; }
  if(el.hidden !== !on) el.hidden = !on;
  if(on) el.style.transform = `translate(${(_v.x * SW / 2 + SW / 2).toFixed(1)}px,${(-_v.y * SH / 2 + SH / 2).toFixed(1)}px) translate(-50%,-100%)`;
  return on;
}

const P = { x:0, y:0, z:0, vx:0, vz:0, vy:0, f:0, gr:true, jumpT:-9, cart:-1, emo:null };
const RUN = 4.6, JUMP = 6.4, GRAV = 17;
let hero = null;
function setHero(id){
  heroId = ALL_HEROES.includes(id) ? id : 'sara';
  if(hero) scene.remove(hero.grp);
  hero = makeHero(heroId); scene.add(hero.grp);
  if(typeof mpTrack === 'function') try{ mpTrack(); }catch(e){}
  boothsDirty = true;
}
function placeAt(x, z, f = 0){ if(P.cart >= 0) leaveCart(true); Object.assign(P, { x, y:PZ.groundAt(x, z), z, vx:0, vz:0, vy:0, f, gr:true }); cam.yaw = f + Math.PI; cam.snap = true; }

/* ======================================================================
   Golf carts (2): hop in, drive with the joystick, hop out. Who drives travels in my position ('c' = cart + 1).
   Two kids jumping in at the same moment: the smaller id keeps it (both phones decide the same).
   ====================================================================== */
const CARTS = PZ.cartMeshes.map((mesh, i) => ({ i, mesh, x:PZ.CART_HOME[i].x, z:PZ.CART_HOME[i].z, f:PZ.CART_HOME[i].f, v:0, by:null, park:null, bump:0 }));
const CART_MAX = 7.5;
function cartSeat(c, out){ const s = PZ.CART_SEAT, cy = Math.cos(c.f), sy = Math.sin(c.f); out.x = c.x + s.x * cy + s.z * sy; out.z = c.z - s.x * sy + s.z * cy; out.y = s.y; return out; }
function enterCart(i){
  const c = CARTS[i]; if(!c) return false;
  if(c.by && c.by !== MP.id){ SFX.nope(); toast('🛺 ' + L('فيها حدا هلّق!', 'Someone is driving it!', 'Biri sürüyor!'), 1800); return false; }
  P.cart = i; c.by = MP.id; c.v = 0; c.park = null; P.vx = P.vz = P.vy = 0; P.gr = true;
  SFX.start(); hudKey = ''; MP.sig = '';
  return true;
}
function leaveCart(quiet){
  const c = CARTS[P.cart]; if(!c){ P.cart = -1; return; }
  P.cart = -1; c.by = null; c.v = 0;
  const cy = Math.cos(c.f), sy = Math.sin(c.f);
  const o = PZ.collide(c.x + 1.55 * cy, c.z - 1.55 * sy, .35);
  P.x = o.x; P.z = o.z; P.y = 0; P.vy = 0; P.gr = true;
  if(!quiet) SFX.sit();
  hudKey = ''; MP.sig = '';
}
let thumpT = 0, humT = 0;
function stepMyCart(dt){
  const c = CARTS[P.cart];
  let target = 0;
  if(inp.m > .1){
    const want = Math.atan2(inp.x, inp.z), d = angDiff(want, c.f);
    const rate = 2.6 * (.45 + .55 * Math.min(1, Math.abs(c.v) / 3));
    c.f += clamp(d, -rate * dt, rate * dt);
    target = CART_MAX * inp.m * Math.max(.3, Math.cos(Math.min(Math.abs(d), 1.4)));
  }
  const acc = target > c.v ? 5 : 9;
  c.v += clamp(target - c.v, -acc * dt, acc * dt);
  const others = CARTS.filter(o => o !== c).map(o => ({ x:o.x, z:o.z, r:1.0 }));
  const o = PZ.cartCollide(c.x + Math.sin(c.f) * c.v * dt, c.z + Math.cos(c.f) * c.v * dt, others);
  if(o.hit){ if(c.v > 3 && performance.now() - thumpT > 600){ thumpT = performance.now(); SFX.thump(); c.bump = .3; } c.v *= .5; }
  c.x = o.x; c.z = o.z;
  P.x = c.x; P.z = c.z; P.f = c.f; P.y = 0; P.vx = Math.sin(c.f) * c.v; P.vz = Math.cos(c.f) * c.v;
  humT -= dt; if(c.v > .5 && humT <= 0){ humT = .28; SFX.hum(c.v / CART_MAX); }
}
function drawCarts(t, dt){
  for(const c of CARTS){
    // a parked cart eases to where the host says it stands
    if(!c.by && c.park){ const k = 1 - Math.exp(-4 * dt); c.x = lerp(c.x, c.park.x, k); c.z = lerp(c.z, c.park.z, k); c.f += angDiff(c.park.f, c.f) * k; if(Math.hypot(c.x - c.park.x, c.z - c.park.z) < .02) c.park = null; }
    c.bump = Math.max(0, c.bump - dt);
    const moving = c.by && (c.by === MP.id ? Math.abs(c.v) > .3 : true);
    c.mesh.position.set(c.x, (moving ? Math.abs(Math.sin(t * 18)) * .015 : 0) + Math.sin(c.bump * 30) * c.bump * .1, c.z);
    c.mesh.rotation.set(0, c.f, 0);
  }
}

/* ======================================================================
   The booth table: BT[b] = null (free) or { id, s (sign), c (colour), d (deco), h (hearts) }.
   The host keeps it (see «Online» below); everyone paints the signs from it.
   ====================================================================== */
const BT = new Array(NB).fill(null);
let BT_VER = 0, boothsDirty = true, boardDirty = true;
const drawnKey = new Array(NB).fill('');
let want = null, claimSentAt = 0;       // the booth I asked for: { b, s, c, d }
const myBooth = () => { for(let i = 0; i < NB; i++) if(BT[i] && BT[i].id === MP.id) return i; return -1; };
function ownerHere(id){ if(id === MP.id) return true; if(!mpActive()) return false; return MP.players.some(p => p.id === id); }
function myName(){ return (ME && ME.name) || heroName(heroId); }
function nameOf(a){
  if(!a) return '';
  const n = BoboRT.who(a.id, '');
  if(n) return n;
  return (a.hero === 'me' ? L('صاحب', 'Buddy', 'Arkadaş') : heroName(a.hero)) + (MP.pub ? ' ' + N((a.slot | 0) + 1) : '');
}
function nameById(id){ if(id === MP.id) return myName(); const a = RM.get(id); if(a) return nameOf(a); return BoboRT.who(id, L('صاحب', 'Buddy', 'Arkadaş')); }
const SIGN_WORDS = () => ({ dir:DIR, free:'🏪 ' + L('بسطة فاضية', 'Free booth', 'Boş tezgah'), claim:L('تعا احجزها!', 'Come and take it!', 'Gel, senin olsun!') });
function boothLook(e){ return { name:nameById(e.id), sign:SIGNS[e.s].e + ' ' + SIGNS[e.s].t(), col:COLORS[e.c], deco:DECOS[e.d], hearts:e.h, mine:e.id === MP.id }; }
function paintBooths(){
  boothsDirty = false;
  for(let i = 0; i < NB; i++){
    const e = BT[i], look = e ? boothLook(e) : null, key = look ? JSON.stringify(look) : 'free';
    if(key === drawnKey[i]) continue;
    drawnKey[i] = key; PZ.setBooth(i, look, SIGN_WORDS());
  }
}
function boardRows(){
  return BT.map((e, i) => e && e.h > 0 ? { i, e } : null).filter(Boolean).sort((p, q) => (q.e.h - p.e.h) || (p.i - q.i)).slice(0, 5)
    .map(({ e }) => ({ deco:DECOS[e.d], name:nameById(e.id), hearts:e.h, col:COLORS[e.c] }));
}
let boardKey = '';
function paintBoard(){
  boardDirty = false;
  const rows = boardRows(), key = JSON.stringify(rows);
  if(key === boardKey) return; boardKey = key;
  PZ.drawBoard(rows, { dir:DIR, title:'🏆 ' + L('أحلى البسطات', 'Top booths', 'En iyi tezgahlar'), empty:L('لسّا ما في قلوب… أعطوا قلوب! ❤️', 'No hearts yet… give some! ❤️', 'Henüz kalp yok… kalp verin! ❤️') });
}
function tableChanged(){ BT_VER++; boothsDirty = true; boardDirty = true; hudKey = ''; if(amHost()) MP.stDirty = true; }
/* host side (also used alone / offline: then I am the host of my own plaza) */
const okIdx = (v, n) => Number.isInteger(v) && v >= 0 && v < n;
function hostClaim(id, w){
  if(!w || !okIdx(w.b, NB) || !okIdx(w.s, SIGNS.length) || !okIdx(w.c, COLORS.length) || !okIdx(w.d, DECOS.length)) return false;
  const e = BT[w.b];
  if(e && e.id !== id && ownerHere(e.id)) return false;
  let h = 0;
  for(let i = 0; i < NB; i++) if(BT[i] && BT[i].id === id){ h = Math.max(h, BT[i].h); if(i !== w.b) BT[i] = null; }
  BT[w.b] = { id, s:w.s, c:w.c, d:w.d, h };
  tableChanged(); return true;
}
function hostFree(id, b){ if(okIdx(b, NB) && BT[b] && BT[b].id === id){ BT[b] = null; tableChanged(); } }
function hostPrune(){ let ch = false; for(let i = 0; i < NB; i++) if(BT[i] && !ownerHere(BT[i].id)){ BT[i] = null; ch = true; } if(ch) tableChanged(); }
const hostGiftAt = new Map();
function hostGift(from, b, k){
  if(!okIdx(b, NB) || !GIFT[k]) return;
  const e = BT[b]; if(!e || e.id === from || !ownerHere(from)) return;
  const key = from + ':' + b, now = performance.now();
  if(now - (hostGiftAt.get(key) || -1e9) < GIFT_GAP_HOST) return;
  hostGiftAt.set(key, now); if(hostGiftAt.size > 400) hostGiftAt.clear();
  e.h = Math.min(99999, e.h + 1);
  BT_VER++; boothsDirty = true; boardDirty = true;
  if(mpActive()) mpSend('gv', { b, f:from, k, n:e.h });
  applyGift(b, from, k, e.h);
}
/* everyone: a gift landed (counted by the host) */
function applyGift(b, from, k, n){
  const e = BT[b]; if(!e) return;
  e.h = n; boothsDirty = true; boardDirty = true; hudKey = '';
  const B = PZ.BOOTHS[b], g = GIFT[k] || GIFTS[0], fx = PZ.toWorld(B, 0, 1.4);
  const d = Math.hypot(fx.x - P.x, fx.z - P.z), inPlaza = state === 'play' || state === 'pause';
  if(d < 30 && inPlaza){ floatEmoji(g.e, fx.x, 2.4, fx.z, 3); burst(fx.x, 2.2, fx.z, 12, GIFT_COL[k] || HEART, 1.4, 1, -1, .8, 1.2); }
  if(e.id === MP.id){
    SAVE.life++; SAVE.best = Math.max(SAVE.best, n); persist();
    if(inPlaza){ SFX.gift(true); giftNote(nameById(from) + ' ' + L('أعطاك', 'gave you', 'sana verdi') + ' ' + g.e); }
  } else if(from === MP.id && inPlaza){ popText('+1 ' + g.e); }
  else if(d < 14 && inPlaza) SFX.gift(false);
  if(isMilestone(n)) celebrate(b, n, e.id === MP.id);
}
function celebrate(b, n, mine){
  const B = PZ.BOOTHS[b], p = PZ.toWorld(B, 0, 1.2);
  const near = Math.hypot(p.x - P.x, p.z - P.z) < 26;
  if(near || mine){ burst(p.x, 3.6, p.z, 70, CONFETTI, 4.5, 1.3, 5, 3.4, 1.8); floatEmoji('🎉', p.x, 3, p.z, 4, 1.1); }
  if(mine){ SFX.cheer(); popText('🎉 ' + N(n) + ' ❤️ ' + L('برافو!', 'Hooray!', 'Yaşasın!')); }
  else if(near) SFX.found();
}
/* my wish: send it to the host (again if it did not stick), or apply it myself when I am the host */
function wantCheck(){
  if(!want) return;
  const e = BT[want.b];
  if(e && e.id === MP.id && e.s === want.s && e.c === want.c && e.d === want.d) return;
  if(e && e.id !== MP.id && ownerHere(e.id)){
    want = null; hudKey = '';
    if(state === 'play' || state === 'setup'){ SFX.nope(); toast(L('سبقك حدا عهالبسطة 🙈 اختار غيرها', 'Someone took this booth first 🙈 pick another', 'Bu tezgahı başkası aldı 🙈 başka birini seç'), 3000); }
    return;
  }
  if(amHost()){ if(hostClaim(MP.id, want)) claimed(); }
  else if(performance.now() - claimSentAt > 1500){ claimSentAt = performance.now(); mpSend('claim', want); }
}
let claimedB = -1;
function claimed(){
  const b = myBooth(); if(b < 0 || b === claimedB) return;
  claimedB = b;
  if(state === 'play' || state === 'setup'){ SFX.claim(); toast('🏪 ' + L('صارت البسطة إلك!', 'The booth is yours!', 'Tezgah artık senin!'), 2400); const B = PZ.BOOTHS[b], p = PZ.toWorld(B, 0, 1.2); burst(p.x, 3.2, p.z, 30, CONFETTI, 3, 1, 5, 2.4, 1.2); }
}
function leaveBooth(){
  const b = myBooth(); want = null; claimedB = -1;
  if(b < 0) return;
  if(amHost()) hostFree(MP.id, b); else { mpSend('free', { b }); BT[b] = null; boothsDirty = true; boardDirty = true; }
  hudKey = '';
}

/* ======================================================================
   Input: joystick (left), camera drag (right), A, the context button, keyboard
   ====================================================================== */
const touch = $('#touch'), joyEl = $('#joy'), knob = $('#knob');
const aBtn = $('#btnA'), ctxBtn = $('#btnCtx'), giftsEl = $('#gifts'), giftsBox = $('#giftsBox');
const joy = { id:null, x:0, y:0, ox:0, oy:0 }, look = { id:null, x:0, y:0 };
const keys = {};
let joyHome = [90, 0];
function placeJoyHome(){ joyHome = [Math.max(90, SAL + 84), SH - Math.max(96, SH * .2) - SAB * .5]; if(joy.id == null) setJoy(joyHome[0], joyHome[1]); }
function setJoy(x, y){ joyEl.style.left = x + 'px'; joyEl.style.top = y + 'px'; }
touch.addEventListener('pointerdown', e => {
  e.preventDefault(); AU.ac();
  if(!emosEl.hidden) emosEl.hidden = true;
  const p = toLayer(e.clientX, e.clientY);
  if(state !== 'play') return;
  if(p.x < SW * .42 && joy.id == null){
    joy.id = e.pointerId; joy.ox = clamp(p.x, Math.max(70, SAL + 64), SW * .42); joy.oy = clamp(p.y, 140, SH - 70);
    setJoy(joy.ox, joy.oy); joyEl.classList.add('on'); moveJoy(p.x, p.y);
  } else if(look.id == null){ look.id = e.pointerId; look.x = p.x; look.y = p.y; }
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
  else if(e.pointerId === look.id && state === 'play'){ cam.yaw -= (p.x - look.x) * .0075; cam.pAdj = clamp(cam.pAdj + (p.y - look.y) * .004, -.25, .6); look.x = p.x; look.y = p.y; cam.lookT = performance.now(); }
});
function endPtr(e){
  if(e.pointerId === joy.id){ joy.id = null; joy.x = joy.y = 0; knob.style.transform = ''; joyEl.classList.remove('on'); setJoy(...joyHome); }
  if(e.pointerId === look.id){ look.id = null; cam.lookT = performance.now(); }
}
touch.addEventListener('pointerup', endPtr); touch.addEventListener('pointercancel', endPtr);
function holdBtn(btn, down){
  btn.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); AU.ac(); btn.classList.add('on'); down(); });
  ['pointerup', 'pointercancel', 'pointerleave'].forEach(t => btn.addEventListener(t, () => btn.classList.remove('on')));
}
let hornAt = 0;
const pressA = () => {
  if(state !== 'play') return;
  if(P.cart >= 0){ const now = performance.now(); if(now - hornAt > 900){ hornAt = now; SFX.horn(); mpSend('hn', {}); } return; }
  P.jumpT = simT;
};
holdBtn(aBtn, pressA);
holdBtn(ctxBtn, () => { if(state === 'play') doCtx(); });
const KEYMAP = { KeyW:'f', ArrowUp:'f', KeyS:'b', ArrowDown:'b', KeyA:'l', ArrowLeft:'l', KeyD:'r', ArrowRight:'r', KeyQ:'cl', KeyE:'cr' };
addEventListener('keydown', e => {
  if(KEYMAP[e.code]){ keys[KEYMAP[e.code]] = true; if(state === 'play') e.preventDefault(); }
  if(state === 'play' && !e.repeat){
    if(e.code === 'Space' || e.code === 'KeyJ'){ pressA(); e.preventDefault(); }
    if(e.code === 'KeyF' || e.code === 'Enter') doCtx();
    if(e.code === 'KeyH'){ const g = giftTarget(); if(g >= 0) give(g, 'heart'); }
  }
  if((e.code === 'Escape' || e.code === 'KeyP') && state === 'play') showPause();
});
addEventListener('keyup', e => { if(KEYMAP[e.code]) keys[KEYMAP[e.code]] = false; });
addEventListener('blur', () => { for(const k in keys) keys[k] = false; });
function clearInput(){ joy.id = null; joy.x = joy.y = 0; look.id = null; knob.style.transform = ''; joyEl.classList.remove('on'); for(const k in keys) keys[k] = false; }
const inp = { x:0, z:0, m:0 };
let testInput = null, testGo = null, simT = 0;
function readInput(dt){
  let ix = joy.x + (keys.r ? 1 : 0) - (keys.l ? 1 : 0), iy = joy.y + (keys.b ? 1 : 0) - (keys.f ? 1 : 0);
  if(testInput){ ix = testInput.x; iy = testInput.y; }
  if(testGo){ const dx = testGo.x - P.x, dz = testGo.z - P.z, l = Math.hypot(dx, dz) || 1, ux = dx / l, uz = dz / l;
    if(l < (testGo.r || .4)){ testGo = null; ix = iy = 0; }
    else { const fx = -Math.sin(cam.yaw), fz = -Math.cos(cam.yaw), rx = Math.cos(cam.yaw), rz = -Math.sin(cam.yaw); ix = ux * rx + uz * rz; iy = -(ux * fx + uz * fz); } }
  let m = Math.hypot(ix, iy); if(m > 1){ ix /= m; iy /= m; m = 1; } if(m < .12){ ix = iy = 0; m = 0; }
  if(keys.cl) cam.yaw += 2.2 * dt; if(keys.cr) cam.yaw -= 2.2 * dt;
  const fx = -Math.sin(cam.yaw), fz = -Math.cos(cam.yaw), rx = Math.cos(cam.yaw), rz = -Math.sin(cam.yaw);
  inp.x = rx * ix - fx * iy; inp.z = rz * ix - fz * iy; inp.m = m;
}

/* ======================================================================
   Camera
   ====================================================================== */
const cam = { yaw:Math.PI, pAdj:0, dist:5.6, lookT:0, snap:true, x:0, y:2, z:0, tx:0, ty:1, tz:0 };
let camFix = null;
function updateCamera(dt){
  if(camFix){ camera.position.set(camFix[0], camFix[1], camFix[2]); camera.lookAt(camFix[3], camFix[4], camFix[5]); return; }
  if(state === 'menu' || state === 'mp' || state === 'select' || state === 'name'){ const a = cam.yaw, mc = PZ.MENU_CAM; camera.position.set(Math.sin(a) * mc[0], mc[1], Math.cos(a) * mc[0]); camera.lookAt(0, 2.2, 0); cam.snap = true; return; }
  const driving = P.cart >= 0;
  const moving = inp.m > .2 || (driving && Math.abs(CARTS[P.cart].v) > .5);
  if(moving && performance.now() - cam.lookT > (driving ? 700 : 1200)){ cam.yaw += angDiff(P.f + Math.PI, cam.yaw) * Math.min(1, dt * (driving ? 2.4 : 1.6 * inp.m)); }
  // in front of (or inside) a booth the camera lifts a little so the sign board shows
  const at = !driving && state === 'play' ? boothAt(P.x, P.z) : null, liftT = at && (at.zone === 'front' || at.zone === 'in') ? 1 : 0;
  cam.lift = cam.snap ? liftT : lerp(cam.lift || 0, liftT, 1 - Math.exp(-3 * dt));
  const pitch = .34 + cam.pAdj + (driving ? .06 : 0) - cam.lift * .06;
  let dist = driving ? 7.4 : cam.dist + cam.lift * .9;
  const tx = P.x, ty = P.y + (driving ? 1.4 : 1.0) + cam.lift * 1.1, tz = P.z;
  const k = cam.snap ? 1 : 1 - Math.exp(-10 * dt);
  cam.tx = lerp(cam.tx, tx, k); cam.ty = lerp(cam.ty, ty, k); cam.tz = lerp(cam.tz, tz, k);
  const sx = Math.sin(cam.yaw) * Math.cos(pitch), sz = Math.cos(cam.yaw) * Math.cos(pitch);
  // keep the camera out of the booths (and the fountain): pull it in front of the first one in the way
  for(const B of PZ.BOOTHS){
    const ox = B.x - cam.tx, oz = B.z - cam.tz; if(ox * ox + oz * oz < 6.25 || Math.abs(ox) > dist + 2.5 || Math.abs(oz) > dist + 2.5) continue;
    const t = (ox * sx + oz * sz) / (sx * sx + sz * sz); if(t <= .5 || t > dist + 2) continue;
    const d = Math.hypot(ox - sx * t, oz - sz * t); if(d < 2.5) dist = Math.max(1.8, Math.min(dist, t - Math.sqrt(Math.max(0, 6.25 - d * d)) - .2));
  }
  let cx = cam.tx + sx * dist, cy = cam.ty + Math.sin(pitch) * dist, cz = cam.tz + sz * dist;
  cy = Math.max(cy, .5);
  const k2 = cam.snap ? 1 : 1 - Math.exp(-12 * dt);
  cam.x = lerp(cam.x, cx, k2); cam.y = lerp(cam.y, cy, k2); cam.z = lerp(cam.z, cz, k2); cam.snap = false;
  camera.position.set(cam.x, cam.y, cam.z); camera.lookAt(cam.tx, cam.ty, cam.tz);
}

/* ======================================================================
   Moving, the context button (claim / my booth / hop in / hop out) and gifts
   ====================================================================== */
function stepHero(dt){
  simT += dt;
  readInput(dt);
  if(P.cart >= 0){ stepMyCart(dt); return; }
  const want = RUN * inp.m;
  const ax = inp.x * want, az = inp.z * want, acc = P.gr ? 14 : 6;
  P.vx += clamp(ax - P.vx, -acc * dt, acc * dt); P.vz += clamp(az - P.vz, -acc * dt, acc * dt);
  if(inp.m > .1) P.f += angDiff(Math.atan2(inp.x, inp.z), P.f) * Math.min(1, dt * 12);
  if(simT - P.jumpT < .15 && P.gr){ P.vy = JUMP; P.gr = false; P.jumpT = -9; SFX.jump(); }
  P.vy -= GRAV * dt; if(P.vy < -20) P.vy = -20;
  const o = PZ.collide(P.x + P.vx * dt, P.z + P.vz * dt, .35);
  P.x = o.x; P.z = o.z;
  const g = PZ.groundAt(P.x, P.z);
  let ny = P.y + P.vy * dt;
  if(ny <= g){ if(!P.gr && P.vy < -4) SFX.land(); ny = g; P.vy = 0; P.gr = true; }
  else if(P.gr && ny - g < .2 && P.vy <= 0){ ny = g; P.vy = 0; }
  else P.gr = false;
  P.y = ny;
}
/* which booth am I at: 'front' (a visitor), 'in' (behind the counter) or 'near' */
function boothAt(x, z){
  let best = -1, bd = 1e9, zone = '';
  for(const B of PZ.BOOTHS){
    const d = Math.hypot(x - B.x, z - B.z); if(d > 5.2 || d >= bd) continue;
    const l = PZ.toLocal(B, x, z);
    let zn = '';
    if(Math.abs(l.x) < 2.6 && l.z > .9 && l.z < 4.8) zn = 'front';
    else if(Math.abs(l.x) < 1.5 && l.z > -1.4 && l.z <= .9) zn = 'in';
    else if(d < 3.4) zn = 'near';
    if(zn){ best = B.i; bd = d; zone = zn; }
  }
  return best < 0 ? null : { b:best, zone };
}
function nearCart(){
  let best = -1, bd = 2.6;
  for(const c of CARTS){ const d = Math.hypot(c.x - P.x, c.z - P.z); if(d < bd){ bd = d; best = c.i; } }
  return best;
}
/* the context action right now: { k:'out' | 'cart' | 'claim' | 'mine', i/b } */
function ctxNow(){
  if(P.cart >= 0) return { k:'out' };
  const ci = nearCart(); if(ci >= 0 && !(CARTS[ci].by && CARTS[ci].by !== MP.id)) return { k:'cart', i:ci };
  const at = boothAt(P.x, P.z); if(!at) return null;
  const e = BT[at.b];
  if(e && e.id === MP.id) return { k:'mine', b:at.b };
  if((!e || !ownerHere(e.id)) && !(want && want.b === at.b)) return { k:'claim', b:at.b };
  return null;
}
function ctxText(c){
  if(!c) return '';
  if(c.k === 'out') return '🚪 ' + L('انزل', 'Get out', 'İn');
  if(c.k === 'cart') return '🛺 ' + L('اركب', 'Hop in', 'Bin');
  if(c.k === 'claim') return '🏪 ' + L('احجز البسطة', 'Take this booth', 'Tezgahı al');
  if(c.k === 'mine') return '✏️ ' + L('بسطتي', 'My booth', 'Tezgahım');
  return '';
}
function doCtx(){
  const c = ctxNow(); if(!c) return;
  SFX.tap();
  if(c.k === 'out') leaveCart();
  else if(c.k === 'cart') enterCart(c.i);
  else if(c.k === 'claim') showSetup(c.b);
  else if(c.k === 'mine') showSetup(c.b);
}
/* the booth I can give to: standing in front of someone else's booth */
function giftTarget(){
  if(P.cart >= 0) return -1;
  const at = boothAt(P.x, P.z); if(!at || at.zone !== 'front') return -1;
  const e = BT[at.b]; return e && e.id !== MP.id ? at.b : -1;
}
const giftAt = new Map();     // booth → last time I gave (10 s each)
function giftWait(b){ return Math.max(0, GIFT_GAP - (performance.now() - (giftAt.get(b) || -1e9))); }
function give(b, k){
  if(!okIdx(b, NB) || !GIFT[k] || state !== 'play') return false;
  const e = BT[b]; if(!e || e.id === MP.id) return false;
  if(giftWait(b) > 0){ SFX.nope(); return false; }
  giftAt.set(b, performance.now());
  const B = PZ.BOOTHS[b], p = PZ.toWorld(B, 0, 1.6);
  burst(p.x, 1.8, p.z, 8, GIFT_COL[k], 1, .9, -1, .6, .9); SFX.gift(false);
  if(amHost()) hostGift(MP.id, b, k); else mpSend('gift', { b, k });
  hudKey = '';
  return true;
}
let giftNoteTO = 0;
function giftNote(text){ const el = $('#giftNote'); el.textContent = text; el.hidden = false; el.style.animation = 'none'; void el.offsetWidth; el.style.animation = ''; clearTimeout(giftNoteTO); giftNoteTO = setTimeout(() => { el.hidden = true; }, 2600); }

/* ======================================================================
   HUD, labels
   ====================================================================== */
const hudEl = $('#hud'), labelsEl = $('#labels');
let hudKey = '', state = 'menu';
const chipEl = $('#roomChip'), plistEl = $('#plist'), emoBtn = $('#btnEmo'), emosEl = $('#emos'), aloneEl = $('#alone');
function setPlayUI(on){
  hudEl.hidden = !on; joyEl.hidden = !on; aBtn.hidden = !on; emoBtn.hidden = !on; chipEl.hidden = !on; hudKey = '';
  if(!on){ emosEl.hidden = true; plistEl.hidden = true; ctxBtn.hidden = true; giftsBox.hidden = true; aloneEl.hidden = true; $('#giftNote').hidden = true; }
}
giftsEl.innerHTML = GIFTS.map((g, i) => `<button class="gift${i ? '' : ' big'}" data-k="${g.k}" aria-label="${g.n()}"><i>${g.e}</i>${i ? '<b></b>' : `<span>${L('أعطي قلب', 'Give a heart', 'Kalp ver')}</span><b></b>`}</button>`).join('');
giftsEl.querySelectorAll('button').forEach(b => b.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); AU.ac(); const t = giftTarget(); if(t >= 0) give(t, b.dataset.k); }));
let aloneT = 0;
function hudFrame(dt){
  const c = ctxNow(), gt = giftTarget(), wait = gt >= 0 ? Math.ceil(giftWait(gt) / 1000) : 0, mine = myBooth();
  const alone = MP.pub && mpActive() && kidsHere() === 1;
  aloneT = alone ? aloneT + dt : 0;
  const tk = [c ? c.k + (c.i | 0) + (c.b | 0) : '', gt, wait, SAVE.life, mine, mine >= 0 ? BT[mine].h : 0, modeText(), aloneT > 4, P.cart].join('|');
  if(tk === hudKey) return;
  hudKey = tk;
  chipEl.textContent = modeText();
  $('#hudLife').textContent = '❤️ ' + N(SAVE.life);
  const bh = $('#hudBooth'); bh.hidden = mine < 0; if(mine >= 0) bh.textContent = '🏪 ' + DECOS[BT[mine].d] + ' ❤️ ' + N(BT[mine].h);
  ctxBtn.hidden = !c; if(c) ctxBtn.textContent = ctxText(c);
  ctxBtn.classList.toggle('claim', !!c && c.k === 'claim');
  giftsBox.hidden = gt < 0;
  if(gt >= 0){
    giftsBox.classList.toggle('wait', wait > 0);
    giftsEl.querySelectorAll('button').forEach(b => { b.disabled = wait > 0; b.querySelector('b').textContent = wait > 0 ? '⏳ ' + N(wait) : ''; });
    $('#giftWho').textContent = '🏪 ' + nameById(BT[gt].id);
  }
  aBtn.textContent = P.cart >= 0 ? '📯' : 'A';
  aloneEl.hidden = !(aloneT > 4);
}
function kidsHere(){ return 1 + [...RM.values()].filter(a => a.seen && !a.away).length; }
const pubName = () => '🌍 ' + L('ساحة الكل', "Everyone's plaza", 'Herkesin meydanı');
function modeText(){
  if(MP.pub){
    if(mpActive()) return pubName() + ' · ' + N(kidsHere()) + ' ' + (kidsHere() === 1 ? L('ولد', 'kid', 'çocuk') : L('أولاد', 'kids', 'çocuk'));
    return pubName() + ' · ' + (MP.status === 'connecting' ? '⏳' : '📡');
  }
  if(mpActive() && MP.code) return '👫 ' + L('غرفة', 'Room', 'Oda') + ' ' + MP.code + ' · ' + N(kidsHere());
  return '🏪 ' + L('لحالك', 'On your own', 'Tek başına') + ' · 📡';
}
function drawPlist(){
  plistEl.textContent = '';
  const row = (img, name) => { const d = document.createElement('div'); const i = document.createElement('img'); i.src = img; i.alt = ''; const sp = document.createElement('span'); sp.dir = 'auto'; sp.textContent = name; d.append(i, sp); plistEl.appendChild(d); };
  const h = document.createElement('b'); h.textContent = modeText(); plistEl.appendChild(h);
  row(charImg(heroId), L('إنت', 'You', 'Sen') + ((ME && ME.name) ? ' · ' + ME.name : ''));
  [...RM.values()].filter(a => a.seen && !a.away).sort((p, q) => (p.d || 0) - (q.d || 0)).slice(0, 15).forEach(a => row(heroPic(a.hero, a.av), nameOf(a)));
}
chipEl.onclick = () => { if(state !== 'play') return; SFX.tap(); plistEl.hidden = !plistEl.hidden; if(!plistEl.hidden){ drawPlist(); clearTimeout(plistEl._t); plistEl._t = setTimeout(() => { plistEl.hidden = true; }, 7000); } };
$('#bInvite').onclick = () => { SFX.tap(); mpMenu(); };
emosEl.innerHTML = EMOTES.map(x => `<button data-k="${x.k}" aria-label="${x.n()}"><i>${x.e}</i><small>${x.n()}</small></button>`).join('');
emosEl.querySelectorAll('button').forEach(b => b.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); emote(b.dataset.k); emosEl.hidden = true; }));
emoBtn.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); if(state !== 'play') return; SFX.tap(); emosEl.hidden = !emosEl.hidden; });
let lastEmo = -1e9, myBubble = null;
function emote(k, quiet){
  if(!EMO[k] || state !== 'play') return false;
  const now = performance.now(); if(now - lastEmo < EMO_GAP) return false;
  lastEmo = now;
  P.emo = { k, t0:now };
  if(!myBubble) myBubble = bubbleEl();
  showBubble(myBubble, k); emoFx(k, P.x, P.y, P.z, true);
  if(k === 'party' && P.gr && P.cart < 0){ P.vy = JUMP * .8; P.gr = false; }
  if(!quiet) mpSend('emo', { k });
  return true;
}
function popText(text){ const box = $('#pops'); while(box.children.length > 2) box.firstChild.remove(); const d = document.createElement('div'); d.className = 'pop'; d.textContent = text; box.appendChild(d); setTimeout(() => d.remove(), 1700); }
let toastTO = 0;
function toast(text, ms = 3500){ const el = $('#toast'); el.textContent = text; el.hidden = false; clearTimeout(toastTO); toastTO = setTimeout(() => { el.hidden = true; }, ms); }

/* ======================================================================
   Cards: title, hero picker, booth setup, pause
   ====================================================================== */
const overlay = $('#overlay'), card = $('#card');
function showOverlay(cls){ overlay.hidden = false; overlay.className = 'overlay ' + (cls || ''); }
function hideOverlay(){ overlay.hidden = true; }
const charImg = id => '../worlds/chars/' + (HEROES[id] ? id : 'sara') + '.png';
function myHeroBtn(id = 'bMyHero'){ return `<button class="hero-btn" id="${id}" style="--c:${heroCol(heroId)}"><img src="${charImg(heroId)}" alt=""><span>${heroName(heroId)}</span> 🔄</button>`; }
function sndBtn(){ return `<button class="icon-btn sndbtn" id="bSnd" aria-label="${L('الصوت', 'Sound', 'Ses')}">${AU.muted ? '🔇' : '🔊'}</button>`; }
function wireSnd(){ const b = $('#bSnd'); if(b) b.onclick = () => { AU.setMuted(!AU.muted); b.textContent = AU.muted ? '🔇' : '🔊'; if(!AU.muted) SFX.tap(); }; }
function showTitle(){
  if(!MP.pub && (MP.t || MP.screen !== 'off')) coStop();
  if(P.cart >= 0) leaveCart(true);
  state = 'menu'; setPlayUI(false); AU.music(false); clearInput(); AU.ambience(false);
  cam.yaw = 2.6; cam.snap = true;
  showOverlay('clear'); card.className = 'card bare';
  card.innerHTML = `${sndBtn()}<div class="menu">
    <div class="logo">🏪</div>
    <h1>${TITLE}</h1>
    <p class="sub">🌴 ${L('احجز بسطة بالساحة، زيّنها، وزور بسطات أصحابك وأعطيهن قلوب!', "Take a booth on the plaza, decorate it, visit your friends' booths and give them hearts!", 'Meydanda bir tezgah al, süsle, arkadaşlarının tezgahlarını gez ve onlara kalp ver!')}</p>
    ${myHeroBtn()}
    <div class="stars"><span>❤️ ${L('قلوبي', 'My hearts', 'Kalplerim')}: ${N(SAVE.life)}</span><span>🏆 ${N(SAVE.best)}</span></div>
    <p class="sub publine" id="pubLine"></p>
    <div class="row"><button class="big-btn" id="bPlay">▶️ ${L('العب', 'Play', 'Oyna')}</button>
    <button class="big-btn pink" id="bMP">👫 ${L('العب مع أصحابك', 'Play with friends', 'Arkadaşlarla oyna')}</button></div></div>`;
  wireSnd();
  $('#bMP').onclick = () => { AU.ac(); SFX.tap(); mpMenu(); };
  $('#bMyHero').onclick = () => { SFX.tap(); showSelect('menu'); };
  $('#bPlay').onclick = () => { AU.ac(); SFX.tap(); beginGame(); };
  pubLine(); pubEnsure();
}
function pubLine(){
  const el = $('#pubLine'); if(!el) return;
  const n = kidsHere() - 1;
  const t = !MP.pub ? '' : !mpActive() ? '🌍 ' + L('عم نفتح ساحة الكل…', "Opening everyone's plaza…", 'Herkesin meydanı açılıyor…') + (MP.status === 'connecting' ? ' ⏳' : ' 📡')
    : n > 0 ? pubName() + ': ' + N(n) + ' ' + L('أولاد عم يلعبوا هلّق', 'kids playing now', 'çocuk şu an oynuyor')
    : pubName() + ': ' + L('إنت أول واحد هون!', "you're the first one here!", 'ilk gelen sensin!');
  if(el.textContent !== t) el.textContent = t;
  el.hidden = !t;
}
setInterval(() => { if(state === 'menu') pubLine(); }, 700);
let selFrom = 'menu';
function showSelect(from){
  selFrom = from || 'menu'; state = 'select';
  showOverlay('dim'); card.className = 'card wide';
  card.innerHTML = `<h2>🏪 ${L('مين بدو يلعب؟', 'Who will play?', 'Kim oynayacak?')}</h2>
    <div class="heroes">${ALL_HEROES.map(id => `<button class="hero${id === heroId ? ' on' : ''}" data-h="${id}" style="--c:${heroCol(id)}"><img src="${charImg(id)}" alt=""><b>${heroName(id)}</b></button>`).join('')}</div>
    <div class="row"><button class="big-btn" id="bOk">✅ ${L('تمام', 'OK', 'Tamam')}</button></div>`;
  card.querySelectorAll('.hero').forEach(b => b.onclick = () => { SAVE.hero = b.dataset.h; persist(); setHero(b.dataset.h); SFX.tap(); card.querySelectorAll('.hero').forEach(x => x.classList.toggle('on', x === b)); });
  $('#bOk').onclick = () => { SFX.tap(); backFromSelect(); };
}
function backFromSelect(){ if(selFrom === 'pause') showPause(true); else if(selFrom === 'mp'){ if(mpActive() && MP.screen === 'lobby') mpLobby(); else mpMenu(); } else showTitle(); }
/* «🏪 بسطتك»: pick the sign, the colour and the decoration (no free text) */
let setupB = -1, pick = null;
function showSetup(b){
  if(!okIdx(b, NB)) return;
  setupB = b; state = 'setup'; clearInput();
  const mine = BT[b] && BT[b].id === MP.id;
  pick = mine ? { s:BT[b].s, c:BT[b].c, d:BT[b].d } : { s:SAVE.s, c:SAVE.c, d:SAVE.d };
  showOverlay('dim'); card.className = 'card wide setup';
  card.innerHTML = `<button class="x-btn" id="bX" aria-label="${L('رجوع', 'Back', 'Geri')}">✕</button>
    <h2>🏪 ${mine ? L('بسطتي', 'My booth', 'Tezgahım') : L('بسطتك', 'Your booth', 'Tezgahın')} <small>#${N(b + 1)}</small></h2>
    <div class="setcols">
      <div class="setleft"><div class="signprev" id="sPrev"></div>
        <div class="row"><button class="big-btn" id="bClaim">✅ ${mine ? L('احفظ', 'Save', 'Kaydet') : L('احجز البسطة', 'Take this booth', 'Tezgahı al')}</button>
        ${mine ? `<button class="ghost-btn" id="bFree">👋 ${L('اترك البسطة', 'Leave the booth', 'Tezgahı bırak')}</button>` : ''}</div></div>
      <div class="setright">
        <b class="lbl">📜 ${L('اللافتة', 'Sign', 'Tabela')}</b><div class="opts signs">${SIGNS.map((s, i) => `<button data-s="${i}">${s.e} ${s.t()}</button>`).join('')}</div>
        <b class="lbl">🎨 ${L('اللون', 'Colour', 'Renk')}</b><div class="opts cols">${COLORS.map((c, i) => `<button data-c="${i}" style="--sw:${c}" aria-label="${N(i + 1)}"></button>`).join('')}</div>
        <b class="lbl">✨ ${L('الزينة', 'Decoration', 'Süs')}</b><div class="opts decos">${DECOS.map((d, i) => `<button data-d="${i}">${d}</button>`).join('')}</div>
      </div></div>`;
  const draw = () => {
    const pv = $('#sPrev'); pv.style.setProperty('--sc', COLORS[pick.c]);
    pv.innerHTML = ''; const a = document.createElement('b'), c = document.createElement('span'), d = document.createElement('i');
    a.textContent = DECOS[pick.d] + ' ' + myName() + ' ' + DECOS[pick.d]; c.textContent = SIGNS[pick.s].e + ' ' + SIGNS[pick.s].t(); d.textContent = '❤️ ' + N(mine ? BT[b].h : 0);
    pv.append(a, c, d);
    card.querySelectorAll('[data-s]').forEach(x => x.classList.toggle('on', +x.dataset.s === pick.s));
    card.querySelectorAll('[data-c]').forEach(x => x.classList.toggle('on', +x.dataset.c === pick.c));
    card.querySelectorAll('[data-d]').forEach(x => x.classList.toggle('on', +x.dataset.d === pick.d));
  };
  card.querySelectorAll('[data-s]').forEach(x => x.onclick = () => { SFX.tap(); pick.s = +x.dataset.s; draw(); });
  card.querySelectorAll('[data-c]').forEach(x => x.onclick = () => { SFX.tap(); pick.c = +x.dataset.c; draw(); });
  card.querySelectorAll('[data-d]').forEach(x => x.onclick = () => { SFX.tap(); pick.d = +x.dataset.d; draw(); });
  $('#bX').onclick = () => { SFX.tap(); resume(); };
  $('#bClaim').onclick = () => { SFX.tap(); confirmSetup(); };
  const f = $('#bFree'); if(f) f.onclick = () => { SFX.tap(); leaveBooth(); resume(); toast('👋 ' + L('تركت البسطة', 'You left the booth', 'Tezgahı bıraktın'), 2000); };
  draw();
}
function confirmSetup(){
  const b = setupB; if(!okIdx(b, NB) || !pick) return false;
  const e = BT[b];
  if(e && e.id !== MP.id && ownerHere(e.id)){ SFX.nope(); toast(L('سبقك حدا عهالبسطة 🙈', 'Someone took this booth first 🙈', 'Bu tezgahı başkası aldı 🙈'), 2500); resume(); return false; }
  SAVE.s = pick.s; SAVE.c = pick.c; SAVE.d = pick.d; persist();
  const was = myBooth();
  want = { b, s:pick.s, c:pick.c, d:pick.d }; claimSentAt = 0;
  if(was !== b) claimedB = -1;
  resume();
  // walk in behind the counter, facing the plaza
  const B = PZ.BOOTHS[b], p = PZ.toWorld(B, 0, -.3);
  if(was !== b) placeAt(p.x, p.z, B.yaw);
  wantCheck();
  if(amHost()) claimed();
  return true;
}
function showPause(force){
  if(state !== 'play' && !force) return;
  state = 'pause'; clearInput(); AU.music(false);
  showOverlay('dim'); card.className = 'card wide';
  const mb = myBooth();
  card.innerHTML = `${sndBtn()}<h2>⏸️ ${L('استراحة', 'Paused', 'Mola')}</h2>
    ${mpActive() && !MP.pub ? `<p>👫 ${L('أصحابك لسّا عم يلعبوا · غرفة', 'Your friends keep playing · room', 'Arkadaşların oynuyor · oda')} <bdi dir="ltr">${MP.code}</bdi></p>` : MP.pub ? `<p>${modeText()}</p>` : ''}
    <div class="row"><span class="tag" style="--rc:#ffc2d4">❤️ ${L('قلوبي', 'My hearts', 'Kalplerim')}: ${N(SAVE.life)}</span>${mb >= 0 ? `<span class="tag" style="--rc:#ffe27a">🏪 ${DECOS[BT[mb].d]} ❤️ ${N(BT[mb].h)}</span>` : ''}</div>
    <div class="row"><button class="big-btn mint" id="bResume">▶️ ${L('كمّل', 'Continue', 'Devam')}</button>${myHeroBtn()}</div>
    <div class="row">${mb >= 0 ? `<button class="ghost-btn" id="bGoBooth">🏪 ${L('روح على بسطتي', 'Go to my booth', 'Tezgahıma git')}</button>` : ''}<button class="ghost-btn" id="bFriends">👫 ${L('العب مع أصحابك', 'Play with friends', 'Arkadaşlarla oyna')}</button><button class="ghost-btn" id="bMenu">🏠 ${L('القائمة', 'Menu', 'Menü')}</button></div>
    <button class="exit-btn" id="bExit">🚪 ${L('اطلع من اللعبة', 'Leave the game', 'Oyundan çık')}</button>`;
  wireSnd();
  $('#bResume').onclick = () => { SFX.tap(); resume(); };
  $('#bMyHero').onclick = () => { SFX.tap(); showSelect('pause'); };
  const gb = $('#bGoBooth'); if(gb) gb.onclick = () => { SFX.tap(); resume(); const B = PZ.BOOTHS[myBooth()]; if(B){ const p = PZ.toWorld(B, 0, -.3); placeAt(p.x, p.z, B.yaw); } };
  $('#bFriends').onclick = () => { SFX.tap(); mpMenu(); };
  $('#bMenu').onclick = () => { SFX.tap(); persist(true); showTitle(); };
  $('#bExit').onclick = () => { persist(true); try{ coStop(); }catch(e){} location.href = '../'; };
}
function resume(){ hideOverlay(); state = 'play'; setPlayUI(true); hudKey = ''; AU.music(true); AU.ambience(true); last = performance.now(); }
$('#btnPause').onclick = () => { SFX.tap(); showPause(); };

/* ======================================================================
   Start / main loop / auto quality
   ====================================================================== */
let started = false;
function beginGame(){
  hideOverlay(); state = 'play'; setPlayUI(true); hudKey = '';
  if(!started){ started = true; const a = (Math.random() - .5) * 1.2; placeAt(PZ.spawn.x + Math.sin(a) * 2, PZ.spawn.z + Math.abs(Math.cos(a)) * .5, PZ.spawn.f); }
  cam.snap = true;
  AU.music(true); AU.ambience(true);
  toast(L('أهلا وسهلا', 'Welcome', 'Hoş geldin') + (ME && ME.name ? ' ' + ME.name : '') + ' 👋 ' + (myBooth() >= 0 ? '' : L('اختار بسطة فاضية واحجزها!', 'Pick a free booth and take it!', 'Boş bir tezgah seç ve al!')), 3200);
  clearTimeout(beginGame.t);
  beginGame.t = setTimeout(() => { if(state === 'play' && mpActive() && kidsHere() > 1) emote('wave'); }, 1200);
}
let last = performance.now(), fpsT = 0, fpsN = 0, lowT = 0, frozen = false, lastFps = 0, slowT = 0;
function frame(now){
  requestAnimationFrame(frame);
  if(frozen) return;
  const rdt = Math.min(.5, Math.max(0, (now - last) / 1000)); const dt = Math.min(.05, rdt); last = now;
  const t = now / 1000;
  if(state === 'play') stepHero(dt);
  if(state === 'play') hudFrame(dt);
  mpFrame(dt); stepRemotes(dt);
  slowT -= dt; if(slowT <= 0){ slowT = .5; wantCheck(); if(myBooth() >= 0) claimed(); }
  if(boothsDirty) paintBooths();
  if(boardDirty) paintBoard();
  if(state === 'menu' || state === 'mp' || state === 'select' || state === 'name') cam.yaw += dt * .07;
  // me
  const inCart = P.cart >= 0, seat = inCart ? cartSeat(CARTS[P.cart], _v2) : null;
  drawCarts(t, dt);
  hero.grp.visible = started || state === 'play';
  drawChar(hero, { t, dt, run:clamp(Math.hypot(P.vx, P.vz) / RUN, 0, 1), air:!P.gr && !inCart, vy:P.vy, sit:inCart ? 1 : 0, drive:inCart, emo:emoOn(P) ? P.emo : null },
    inCart ? seat.x : P.x, inCart ? seat.y : P.y, inCart ? seat.z : P.z, P.f);
  const gy = PZ.groundAt(P.x, P.z); blob.visible = !inCart; blob.position.set(P.x, gy + .03, P.z); const bs = clamp(1 - (P.y - gy) * .3, .4, 1); blob.scale.set(bs, 1, bs);
  PZ.tick(t, dt);
  updateCamera(dt); updateParts(dt); updateFloats(dt);
  const se = 14 * Math.PI / 180;
  sun.position.set(P.x - 34, Math.sin(se) * 40 + 4, P.z - 22); sun.target.position.set(P.x, 0, P.z);
  sky.position.copy(camera.position); starPts.position.copy(camera.position);
  sunDisc.position.set(camera.position.x - 300, camera.position.y + 26, camera.position.z - 190);
  if(!myBubble) myBubble = bubbleEl();
  project(myBubble, P.x, P.y + (inCart ? 2.4 : 1.95), P.z, (state === 'play' || state === 'pause') && bubOn(myBubble));
  placeRemoteLabels();
  renderer.render(scene, camera);
  fpsT += rdt; fpsN++;
  if(fpsT > 2){ const fps = fpsN / fpsT; lastFps = fps; fpsT = 0; fpsN = 0; if(fps < 42 && state === 'play' && quality > 0 && QS.get('q') == null){ lowT++; if(lowT >= 2){ quality--; lowT = 0; applyQuality(); } } else lowT = 0; }
}

/* ======================================================================
   Online. Public plaza `bobo-booths-pub-<n>` (16 per shard) or a private room `bobo-booths-<4 digits>`.
   Events: 'pos' (~7×/s while moving; 'c' = the cart I drive + 1), 'hi' (send me yours now), 'emo' (an emote id),
   'hn' (cart horn), 'claim' {b,s,c,d} / 'free' {b} / 'gift' {b,k} → to the host; 'st' (the host's booth table and parked
   carts), 'gv' {b,f,k,n} (the host counted a gift). Names never travel: only the friend code (presence 'fc').
   Nothing is stored on a server.
   ====================================================================== */
const MP_URL = 'https://vgpwtrzplggvlsuvqsas.supabase.co', MP_KEY = 'sb_publishable_D9thEhZlZnfn0t06j8h1Rw_H-LVF786';
const MP_EVENTS = ['pos', 'hi', 'emo', 'hn', 'claim', 'free', 'gift', 'st', 'gv'];
const MP_MAX = 8;
const topicOf = code => 'bobo-booths-' + code;
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
    this.rt = window.BoboRT.open({ url:MP_URL, key:MP_KEY, topic:topicOf(code), id, events:MP_EVENTS, eps:30, h });
    await this.rt.ready;
  }
  track(meta){ if(this.rt) this.rt.track(meta); }
  send(ev, payload){ if(this.rt) this.rt.send(ev, payload); }
  close(){ this.closed = true; if(this.rt){ this.rt.close(); this.rt = null; } }
}
/* ?mp=local: tabs of the same browser talk through a BroadcastChannel (tests) */
class LocalTransport{
  open(code, id, h){
    this.id = id; this.h = h; this.meta = null; this.peers = new Map(); this.ready = false;
    const bc = this.bc = new BroadcastChannel(topicOf(code));
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
      for(const [k, p] of this.peers) if(now - p.last > 6000){ this.peers.delete(k); ch = true; }
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
const mpNewId = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
const MP = { t:null, id:mpNewId(), code:null, list:[], players:[], meta:null, hostId:null, synced:false, screen:'off', tok:0, posT:0, typed:'', inviteFor:null, err:'',
  pub:false, lx:0, lz:0, ly:0, sentAt:0, shard:0, status:'off', joining:0, back:0, reT:0, sig:'', wasMoving:false, away:false, joinToastT:0, stDirty:false, stAt:0, stIn:0 };
window.__boboRoom = () => (MP.t && MP.meta && MP.code && !MP.pub) ? MP.code : null;
let ME = null, BOOTED = false;
const mpActive = () => !!(MP.t && MP.meta);
const amHost = () => !mpActive() || MP.hostId === MP.id;
const mpSort = (a, b) => ((a.o || 0) - (b.o || 0)) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
const okHero = h => ALL_HEROES.includes(h) ? h : 'sara';
const okAv = av => {
  try{
    if(!window.Avatar || !av || typeof av !== 'object') return null;
    const o = {};
    for(const k of Object.keys(av).slice(0, 30)){ const v = av[k]; if(v === null || typeof v === 'boolean' || (typeof v === 'number' && isFinite(v)) || (typeof v === 'string' && /^[A-Za-z][A-Za-z0-9]{0,15}$/.test(v) && !(v in Object.prototype))) o[k] = v; }
    return Avatar.normalize(o);
  }catch(e){ return null; }
};
const numIn = (v, a, b, d = 0) => { v = +v; return isFinite(v) ? clamp(v, a, b) : d; };
const r2 = v => Math.round(v * 100) / 100;
const okId = s => typeof s === 'string' && /^[a-z0-9]{4,24}$/.test(s);
const avPic = new Map();
function heroPic(hero, av){ if(hero !== 'me' || !av || !window.Avatar) return charImg(hero); const k = JSON.stringify(av); if(!avPic.has(k)){ try{ avPic.set(k, Avatar.portrait(av)); }catch(e){ avPic.set(k, charImg('sara')); } } return avPic.get(k); }

/* «أصحابي»: tell friends which room I'm in (every call is guarded) */
const FR_GAME = 'booths';
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
addEventListener('pagehide', () => { try{ if(MP.t) mpClose(); }catch(e){} });

/* a new plaza (another shard, a private room, or back on my own): an empty table; my wish is asked again */
function resetTable(){
  for(let i = 0; i < NB; i++) BT[i] = null;
  hostGiftAt.clear(); claimedB = -1; tableChanged();
  for(const c of CARTS){ if(c.by && c.by !== MP.id) c.by = null; }
}
function mpClose(){
  frRoom(null);
  if(MP.t){ try{ MP.t.close(); }catch(e){} }
  MP.t = null; MP.meta = null; MP.list = []; MP.players = []; MP.hostId = null; MP.synced = false;
  for(const id of [...RM.keys()]) dropRemote(id);
  resetTable();
}
function myMeta(){ return { fc:BoboRT.fc(), hero:heroId, av:heroId === 'me' ? myAv() : null }; }
async function mpOpen(code, how){
  mpClose(); MP.pub = false; clearTimeout(MP.reT); MP.reT = 0;
  const t = MP_LOCAL ? new LocalTransport() : new SupabaseTransport(), tok = ++MP.tok;
  MP.t = t; MP.code = code;
  const live = () => MP.t === t && MP.tok === tok;
  try{ await t.open(code, MP.id, mpHandlers(t, live)); }catch(e){ if(live()) mpClose(); throw e; }
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
  MP.meta = Object.assign(myMeta(), { o:others.reduce((m, p) => Math.max(m, +p.o || 0), 0) + 1, ph:'play' });
  t.track(MP.meta);
  mpPresence(MP.list);
  frRoom(code);
  MP.sig = ''; mpSend('hi', {});
  return 'ok';
}
function mpHandlers(t, live){
  return {
    presence:list => { if(live()) mpPresence(list); },
    msg:(ev, p) => { if(live() && p && typeof p === 'object' && okId(p.id) && p.id !== MP.id) mpMsg(ev, p); },
    status:s => { if(!live()) return; if(s === 'up'){ mpTrack(); MP.sig = ''; mpSend('hi', {}); } hudKey = ''; }
  };
}
/* ---------- «🌍 ساحة الكل»: join the first shard `bobo-booths-pub-<n>` with room (< CAP kids) ---------- */
async function pubJoin(from = 1){
  if(!BOOTED || MP.joining || (MP.screen !== 'off' && MP.screen !== 'pub')) return;
  const tok = ++MP.tok; MP.joining = tok;
  MP.pub = true; MP.screen = 'pub'; MP.status = 'connecting'; hudKey = '';
  clearTimeout(MP.reT); MP.reT = 0;
  try{
    for(let n = Math.max(1, from); n <= SHARDS; n++){
      if(MP.tok !== tok) return;
      mpClose(); MP.pub = true;
      const t = MP_LOCAL ? new LocalTransport() : new SupabaseTransport();
      MP.t = t; MP.code = 'pub-' + n;
      const live = () => MP.t === t && MP.tok === tok;
      try{ await t.open(MP.code, MP.id, mpHandlers(t, live)); }catch(e){ if(live()) mpClose(); throw e; }
      if(!live()) return;
      const t0 = performance.now(); t.track({ ph:'probe' });
      await new Promise(res => { const chk = () => (MP.synced || performance.now() - t0 > 6000 || !live()) ? res() : setTimeout(chk, 40); chk(); });
      if(MP.synced) await new Promise(r => setTimeout(r, 250));
      if(!live()) return;
      const others = MP.list.filter(p => p.id !== MP.id);
      if(others.length >= CAP) continue;
      const used = new Set(others.map(p => p.c | 0)); let c = 0; while(used.has(c)) c++;
      MP.shard = n; MP.back = 0;
      MP.meta = Object.assign(myMeta(), { ph:'play', c, o:others.reduce((m, p) => Math.max(m, +p.o || 0), 0) + 1 });
      t.track(MP.meta); MP.status = 'on'; hudKey = '';
      mpPresence(MP.list);
      MP.sig = ''; MP.posT = 0; mpSend('hi', {});
      return;
    }
    mpClose(); MP.status = 'full'; pubRetry(30000);
  }catch(e){ if(MP.tok === tok){ mpClose(); MP.status = 'down'; MP.joining = 0; pubRetry(); } }
  finally{ if(MP.joining === tok) MP.joining = 0; hudKey = ''; }
}
function pubRetry(ms){
  if(MP.reT || MP.screen !== 'pub') return;
  MP.back = Math.min(30000, MP.back ? MP.back * 2 : 2000);
  MP.reT = setTimeout(() => { MP.reT = 0; if(MP.screen === 'pub' && !MP.joining && !mpActive()) pubJoin(MP.shard || 1); }, ms || MP.back);
}
function pubEnsure(){ if(BOOTED && (MP.screen === 'off' || (MP.screen === 'pub' && !mpActive() && !MP.joining && !MP.reT))){ MP.screen = 'off'; pubJoin(MP.shard || 1); } }
addEventListener('online', () => { if(MP.screen === 'pub' && !mpActive()){ clearTimeout(MP.reT); MP.reT = 0; MP.back = 0; pubEnsure(); } });
function mpTrack(){ if(MP.t && MP.meta){ Object.assign(MP.meta, myMeta()); MP.meta.fc = MP.meta.fc || BoboRT.fc(); MP.t.track(MP.meta); } }
function mpSend(ev, p){ if(MP.t && MP.meta) MP.t.send(ev, Object.assign({ id:MP.id }, p)); }
function mpPresence(list){
  list = (list || []).filter(p => p && p.ph !== 'probe' && okId(p.id));
  BoboRT.see(list, () => { boothsDirty = true; boardDirty = true; if(MP.screen === 'lobby') mpLobbyDraw(); if(!plistEl.hidden) drawPlist(); });
  MP.list = list; MP.synced = true;
  if(!MP.meta) return;
  const all = list.filter(p => p.id !== MP.id).concat([Object.assign({}, MP.meta, { id:MP.id })]).sort(mpSort);
  const max = MP.pub ? CAP : MP_MAX, mine = all.findIndex(p => p.id === MP.id);
  if(mine >= max){
    if(MP.pub){ if(!MP.joining){ const n = MP.shard + 1; MP.tok++; mpClose(); MP.screen = 'pub'; setTimeout(() => pubJoin(n), 50); } return; }
    coStop(); showTitle(); toast(L('الغرفة مليانة 🙈', 'The room is full 🙈', 'Oda dolu 🙈')); return;
  }
  const before = MP.players.map(p => p.id), wasHost = MP.hostId;
  MP.players = all.slice(0, max);
  MP.hostId = MP.players[0] ? MP.players[0].id : MP.id;
  remoteSync(MP.players);
  const joined = MP.players.filter(p => p.id !== MP.id && !before.includes(p.id));
  // the host: owners who left lose their booth; a newcomer (or a new host) gets the whole table
  if(MP.hostId === MP.id){ hostPrune(); if(joined.length || wasHost !== MP.id) MP.stDirty = true; }
  const now = performance.now();
  if(joined.length && before.length && state === 'play' && now - MP.joinToastT > 4000){
    MP.joinToastT = now; SFX.check();
    toast('👋 ' + joined.slice(0, 3).map(p => nameOf(RM.get(p.id))).join('، ') + ' ' + L('إجا عالساحة!', 'came to the plaza!', 'meydana geldi!'), 2600);
  }
  MP.posT = 0; MP.sig = ''; boothsDirty = true; boardDirty = true;
  if(MP.screen === 'lobby') mpLobbyDraw();
  hudKey = '';
}
function sendSt(){
  MP.stDirty = false; MP.stAt = performance.now();
  mpSend('st', { v:BT_VER, b:BT.map(e => e ? [e.id, e.s, e.c, e.d, e.h] : 0), k:CARTS.map(c => c.by ? 0 : [r2(c.x), r2(c.z), r2(c.f)]) });
}
function onSt(p){
  if(p.id !== MP.hostId || !Array.isArray(p.b) || p.b.length !== NB) return;
  MP.stIn = performance.now();
  let ch = false;
  for(let i = 0; i < NB; i++){
    const q = p.b[i];
    let e = null;
    if(Array.isArray(q) && okId(q[0]) && okIdx(q[1], SIGNS.length) && okIdx(q[2], COLORS.length) && okIdx(q[3], DECOS.length)) e = { id:q[0], s:q[1], c:q[2], d:q[3], h:clamp(q[4] | 0, 0, 99999) };
    const o = BT[i];
    if(!o !== !e || (o && (o.id !== e.id || o.s !== e.s || o.c !== e.c || o.d !== e.d || o.h !== e.h))){ BT[i] = e; ch = true; }
  }
  if(ch){ BT_VER++; boothsDirty = true; boardDirty = true; hudKey = ''; }
  if(Array.isArray(p.k)) p.k.forEach((q, i) => { const c = CARTS[i]; if(c && Array.isArray(q) && !c.by){ const x = numIn(q[0], -40, 40, c.x), z = numIn(q[1], -40, 40, c.z), f = numIn(q[2], -1e3, 1e3, c.f); if(Math.hypot(x - c.x, z - c.z) > .05 || Math.abs(angDiff(f, c.f)) > .02) c.park = { x, z, f }; } });
  wantCheck(); if(myBooth() >= 0) claimed();
}
function mpMsg(ev, p){
  if(ev === 'pos'){ onPos(p); return; }
  if(ev === 'hi'){ MP.posT = 0; MP.sig = ''; if(amHost()) MP.stDirty = true; return; }
  if(ev === 'st'){ onSt(p); return; }
  if(ev === 'gv'){
    if(p.id !== MP.hostId) return;
    const b = p.b, n = p.n | 0;
    if(!okIdx(b, NB) || !BT[b] || !GIFT[p.k] || !okId(p.f) || n < 0 || n > 99999) return;
    applyGift(b, p.f, p.k, n); return;
  }
  if(ev === 'claim'){ if(amHost() && !hostClaim(p.id, { b:p.b, s:p.s, c:p.c, d:p.d })) MP.stDirty = true; return; }   // refused: the table goes out again so the kid sees why
  if(ev === 'free'){ if(amHost()) hostFree(p.id, p.b); return; }
  if(ev === 'gift'){ if(amHost()) hostGift(p.id, p.b, p.k); return; }
  if(ev === 'emo'){
    const a = RM.get(p.id), k = typeof p.k === 'string' && EMO[p.k] ? p.k : null, now = performance.now();
    if(!a || !k || now - (a.emoAt || -1e9) < EMO_GAP_RX) return;
    a.emoAt = now; a.emo = { k, t0:now };
    if(a.bub) showBubble(a.bub, k);
    if(a.drawn) emoFx(k, a.dx, a.dy, a.dz, Math.hypot(a.dx - P.x, a.dz - P.z) < 12 && state === 'play');
    return;
  }
  if(ev === 'hn'){ const a = RM.get(p.id), now = performance.now(); if(a && a.drawn && a.d < 18 && now - (a.hnAt || 0) > 800 && state === 'play'){ a.hnAt = now; SFX.horn(); } return; }
}
const POS_HZ = 7;
function mpFrame(dt){
  if(!mpActive()) return;
  MP.posT -= dt; MP.fcT = (MP.fcT || 0) - dt;
  if(MP.meta && !MP.meta.fc && MP.fcT <= 0){
    MP.fcT = 2; const c = BoboRT.fc();
    if(c){ MP.meta.fc = c; MP.t.track(MP.meta); }
    else if(!MP.fcAsked && window.Friends && Friends.has && Friends.has()){ MP.fcAsked = true; try{ const q = Friends.me(); if(q && q.catch) q.catch(() => {}); }catch(e){} }
  }
  const now = performance.now();
  // the host: the booth table goes out when it changed (at most 4×/s) and every 5 s while others are here
  if(amHost() && MP.players.length > 1 && ((MP.stDirty && now - MP.stAt > 250) || now - MP.stAt > 5000)) sendSt();
  // not the host and no table for a while: ask again
  if(!amHost() && now - MP.stIn > 8000 && now - (MP.hiAt || 0) > 4000){ MP.hiAt = now; mpSend('hi', {}); }
  const inPlaza = state === 'play' || state === 'pause' || state === 'setup';
  if(!inPlaza){
    if(MP.posT <= 0){ MP.away = true; MP.posT = 3; mpSend('pos', { away:1 }); }
    return;
  }
  const moved = Math.abs(P.x - MP.lx) + Math.abs(P.z - MP.lz) + Math.abs(P.y - MP.ly) > .03;
  const moving = Math.hypot(P.vx, P.vz) > .05 || !P.gr || moved;
  const sig = (P.cart + 1) + ':' + (MP.away ? 1 : 0), since = now - (MP.sentAt || 0);
  const due = sig !== MP.sig || (moving ? since >= 1000 / POS_HZ : (MP.wasMoving || since > 3000));
  MP.wasMoving = moving;
  if(!due) return;
  MP.posT = 1 / POS_HZ; MP.sig = sig; MP.away = false; MP.sentAt = now; MP.lx = P.x; MP.lz = P.z; MP.ly = P.y;
  mpSend('pos', { x:r2(P.x), y:r2(P.y), z:r2(P.z), f:r2(P.f), m:r2(clamp(Math.hypot(P.vx, P.vz) / RUN, 0, 1)), air:P.gr ? 0 : 1, vy:r2(P.vy), c:P.cart + 1 });
}
function coStop(){ MP.tok++; mpClose(); MP.pub = false; MP.joining = 0; clearTimeout(MP.reT); MP.reT = 0; MP.screen = 'off'; }

/* ---------- the other kids ---------- */
const RM = new Map();
function labelEl(){ const d = document.createElement('div'); d.className = 'nm'; d.hidden = true; d.dir = 'auto'; labelsEl.appendChild(d); return d; }
function dropRemote(id){ const a = RM.get(id); if(!a) return; if(a.h) a.h.grp.parent && a.h.grp.parent.remove(a.h.grp); a.lbl.remove(); a.bub.remove(); RM.delete(id); for(const c of CARTS) if(c.by === id) c.by = null; }
function remoteSync(list){
  const here = new Set();
  for(const p of list){
    if(p.id === MP.id) continue;
    here.add(p.id);
    let a = RM.get(p.id);
    if(!a){ a = { id:p.id, key:'', h:null, lbl:labelEl(), bub:bubbleEl(), buf:[], seen:false, away:false, t:Math.random() * 5, x:0, y:0, z:0, f:0, m:0, air:0, vy:0, cart:0, slot:0, vis:false, emo:null, posAt:0 }; RM.set(p.id, a); }
    a.slot = numIn(p.c, 0, 99) | 0;
    const hero = okHero(p.hero), av = hero === 'me' ? okAv(p.av) : null;
    const key = hero + '|' + (av ? JSON.stringify(av) : '');
    if(a.key !== key){ if(a.h) a.h.grp.parent && a.h.grp.parent.remove(a.h.grp); a.key = key; a.hero = hero; a.av = av; a.h = null; }
  }
  for(const id of [...RM.keys()]) if(!here.has(id)) dropRemote(id);
}
function onPos(p){
  const a = RM.get(p.id); if(!a) return;
  if(p.away){ a.away = true; a.buf.length = 0; a.cart = 0; return; }
  const now = performance.now();
  a.posAt = now;
  a.buf.push({ t:now, x:numIn(p.x, -60, 60), y:numIn(p.y, -2, 20), z:numIn(p.z, -60, 60), f:numIn(p.f, -1e3, 1e3), m:numIn(p.m, 0, 2) });
  if(a.buf.length > 12) a.buf.shift();
  if(!a.seen || a.away){ const b = a.buf[a.buf.length - 1]; a.x = b.x; a.y = b.y; a.z = b.z; a.f = b.f; }
  a.seen = true; a.away = false; a.air = p.air ? 1 : 0; a.vy = numIn(p.vy, -40, 40);
  const ci = numIn(p.c, 0, CARTS.length) | 0;
  a.cart = ci;
  if(ci){
    const c = CARTS[ci - 1];
    // both of us jumped into the same cart: the smaller id keeps it
    if(P.cart === ci - 1 && p.id < MP.id){ leaveCart(); toast('🛺 ' + L('سبقك حدا عالسيارة', 'Someone got the cart first', 'Arabaya başkası bindi'), 2000); }
    if(c.by !== MP.id && (!c.by || c.by === p.id || p.id < c.by)) c.by = p.id;
  }
}
const INTERP = 250, FULL_MAX = 12, LABEL_MAX = 8, LABEL_DIST = 26;
const rBlobs = new THREE.InstancedMesh(blob.geometry, blob.material, FULL_MAX); rBlobs.count = 0; rBlobs.frustumCulled = false; rBlobs.renderOrder = 6; scene.add(rBlobs);
function stepRemotes(dt){
  const now = performance.now(), rt = now - INTERP, inPlaza = state !== 'menu' && state !== 'mp' && state !== 'select' && state !== 'name';
  for(const a of RM.values()){
    a.t += dt;
    if(a.buf.length){
      let i = a.buf.length - 1; while(i > 0 && a.buf[i - 1].t > rt) i--;
      const q = a.buf[i], pr = i > 0 ? a.buf[i - 1] : null; let s = q;
      if(pr && q.t > rt){ const k = clamp((rt - pr.t) / Math.max(1, q.t - pr.t), 0, 1); s = { x:lerp(pr.x, q.x, k), y:lerp(pr.y, q.y, k), z:lerp(pr.z, q.z, k), m:lerp(pr.m, q.m, k), f:pr.f + angDiff(q.f, pr.f) * k }; }
      else if(now - q.t > 900) s = { x:q.x, y:q.y, z:q.z, f:q.f, m:0 };
      const k = 1 - Math.exp(-16 * dt);
      a.x = lerp(a.x, s.x, k); a.y = lerp(a.y, s.y, k); a.z = lerp(a.z, s.z, k); a.f += angDiff(s.f, a.f) * k; a.m = lerp(a.m, s.m, k);
    }
    a.vis = a.seen && !a.away && inPlaza;
    a.d = Math.hypot(a.x - P.x, a.z - P.z);
    // a remote driver moves the cart on my screen too
    if(a.cart && a.seen && !a.away){ const c = CARTS[a.cart - 1]; if(c && c.by === a.id){ c.x = a.x; c.z = a.z; c.f = a.f; c.park = null; } }
  }
  for(const c of CARTS){ if(c.by && c.by !== MP.id){ const a = RM.get(c.by); if(!a || a.cart !== c.i + 1 || a.away) c.by = null; } }
  const near = [...RM.values()].filter(a => a.vis).sort((p, q) => p.d - q.d);
  let nb = 0;
  const full = new Set(near.slice(0, FULL_MAX)), named = new Set(near.slice(0, LABEL_MAX).filter(a => a.d < LABEL_DIST));
  for(const a of RM.values()){
    a.named = named.has(a);
    const show = full.has(a);
    a.drawn = show;
    if(show && !a.h){ a.h = makeHero(a.hero, a.av); if(MP.pub) a.h.grp.traverse(o => { if(o.isMesh) o.castShadow = false; }); scene.add(a.h.grp); }
    if(!a.h) continue;
    a.h.grp.visible = show; if(!show) continue;
    let x = a.x, y = a.y, z = a.z;
    const c = a.cart ? CARTS[a.cart - 1] : null, inC = !!(c && c.by === a.id);
    if(inC){ cartSeat(c, _v2); x = _v2.x; y = _v2.y; z = _v2.z; }
    drawChar(a.h, { t:a.t, dt, run:inC ? 0 : Math.min(1, a.m), air:!!a.air && !inC, vy:a.vy, sit:inC ? 1 : 0, drive:inC, emo:emoOn(a) ? a.emo : null }, x, y, z, a.f);
    a.dx = x; a.dy = y; a.dz = z;
    if(nb < FULL_MAX && !inC){ const g = PZ.groundAt(x, z), bs = clamp(1 - (y - g) * .3, .4, 1); rBlobs.setMatrixAt(nb++, _m.compose(_v.set(x, g + .03, z), _q.identity(), _s.set(bs, 1, bs))); }
  }
  rBlobs.count = nb; rBlobs.instanceMatrix.needsUpdate = true;
}
function placeRemoteLabels(){
  const play = state === 'play' || state === 'pause' || state === 'setup';
  for(const a of RM.values()){
    const on = play && a.drawn && a.named;
    if(on){ const txt = nameOf(a); if(a.lbl.textContent !== txt) a.lbl.textContent = txt; }
    const top = a.cart ? 2.15 : 1.75;
    const nm = project(a.lbl, a.dx, a.dy + top, a.dz, on);
    project(a.bub, a.dx, a.dy + top + (nm ? .55 : .15), a.dz, play && a.drawn && bubOn(a.bub) && a.d < 34);
  }
}

/* ---------- «👫 العب مع أصحابك»: menu, lobby, keypad ---------- */
function mpCard(wide){ state = 'mp'; setPlayUI(false); showOverlay('dim'); card.className = 'card' + (wide ? ' wide' : ''); }
function mpMenu(){
  if(P.cart >= 0) leaveCart(true);
  MP.tok++; mpClose(); MP.pub = false; clearTimeout(MP.reT); MP.reT = 0; MP.joining = 0; MP.screen = 'menu'; mpCard(false); AU.music(false);
  card.innerHTML = `<h2>👫 ${L('العب مع أصحابك', 'Play with friends', 'Arkadaşlarla oyna')}</h2>
    <p>🏪 ${L('ساحة إلكن لحالكن، لحتى 8 أصحاب: كل واحد بياخد بسطة وبتزوروا بعض!', 'Your own plaza for up to 8 friends: each one takes a booth and you visit each other!', '8 arkadaşa kadar size özel bir meydan: herkes bir tezgah alır, birbirinizi ziyaret edersiniz!')}</p>
    ${myHeroBtn()}
    <div class="row"><button class="big-btn" id="bCreate">🏠 ${L('اعمل غرفة', 'Create room', 'Oda kur')}</button>
    <button class="big-btn mint" id="bJoin">🔢 ${L('فوت على غرفة', 'Join room', 'Odaya katıl')}</button></div>
    <div class="row"><button class="ghost-btn" id="bBack">↩️ ${L('رجوع', 'Back', 'Geri')}</button></div>`;
  $('#bMyHero').onclick = () => { SFX.tap(); showSelect('mp'); };
  $('#bCreate').onclick = () => { SFX.tap(); mpCreate(); };
  $('#bJoin').onclick = () => { SFX.tap(); mpKeypad(''); };
  $('#bBack').onclick = () => { SFX.tap(); MP.screen = 'off'; showTitle(); };
}
function mpBack(){ if(MP.screen === 'menu'){ MP.screen = 'off'; showTitle(); } else if(MP.screen === 'lobby'){ coStop(); mpMenu(); } else mpMenu(); }
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
function mpLobby(){
  if(!mpActive()){ mpMenu(); return; }
  MP.screen = 'lobby'; mpCard(true); AU.music(false);
  mpLobbyDraw();
}
function mpLobbyDraw(){
  if(MP.screen !== 'lobby' || state !== 'mp') return;
  const pl = MP.players, code = [...(MP.code || '')].map(N).join('');
  const slots = [0, 1, 2, 3].map(i => { const p = pl[i]; if(!p) return `<div class="pslot empty"><div class="wt">⏳</div><small>${L('استنّى…', 'Waiting…', 'Bekle…')}</small></div>`;
    const hero = okHero(p.hero), mine = p.id === MP.id;
    return `<div class="pslot" style="--c:${heroCol(hero)}"><img src="${mine ? charImg(heroId) : heroPic(hero, okAv(p.av))}" alt=""><span dir="auto">${mine ? L('إنت', 'You', 'Sen') : ('👫 ' + BoboRT.whoH(p.id, '')).trim()}${p.id === MP.hostId ? ' 👑' : ''}</span></div>`; }).join('');
  card.innerHTML = `<h2>🏪 ${L('غرفة رقم', 'Room number', 'Oda numarası')} <bdi dir="ltr">${code}</bdi></h2>
    <div class="pslots">${slots}</div>
    <p>${L('قلّ لأصحابك رقم الغرفة 👆 وكل واحد بيقدر يبلّش هلّق، والباقي بيلحقوه عالساحة!', 'Tell your friends the room number 👆 Everyone can start now, the others catch up on the plaza!', 'Arkadaşlarına oda numarasını söyle 👆 Herkes şimdi başlayabilir, diğerleri meydana gelir!')}</p>
    <div class="row">${myHeroBtn()}<button class="big-btn" id="bGo">▶️ ${L('يلّا نلعب', "Let's play", 'Hadi oynayalım')}</button><button class="ghost-btn" id="bLeave">🚪 ${L('اطلع', 'Leave', 'Çık')}</button></div>`;
  $('#bGo').onclick = () => { AU.ac(); SFX.tap(); MP.screen = 'in'; beginGame(); mpSend('hi', {}); };
  $('#bMyHero').onclick = () => { SFX.tap(); showSelect('mp'); };
  $('#bLeave').onclick = () => { SFX.tap(); coStop(); mpMenu(); };
}
async function mpOpenRetry(code, how, until){
  for(;;){
    try{ return await mpOpen(code, how); }
    catch(e){ if(String(e && e.message) === 'cancelled' || MP.screen !== 'connecting' || performance.now() > until - 3000) throw e; await new Promise(r => setTimeout(r, 800)); if(MP.screen !== 'connecting') throw new Error('cancelled'); }
  }
}
async function mpCreate(wantCode){
  mpConnecting();
  const limit = performance.now() + 20000;
  try{
    for(let i = 0; i < 4; i++){
      const code = i === 0 && /^\d{4}$/.test(wantCode || '') ? String(wantCode) : String(1000 + Math.floor(Math.random() * 9000));
      const r = await mpOpenRetry(code, 'create', limit);
      if(MP.screen !== 'connecting'){ if(r === 'ok') coStop(); return; }
      if(r === 'ok'){ mpLobby(); mpSendInvite(); return; }
    }
    throw new Error('busy');
  }catch(e){ MP.err = String(e && (e.stack || e.message)).slice(0, 400); if(MP.screen === 'connecting' && String(e && e.message) !== 'cancelled') mpError(() => mpCreate(wantCode)); }
}
async function mpJoin(code, until){
  mpConnecting();
  const limit = until || performance.now() + 20000;
  try{
    let r = await mpOpenRetry(code, 'join', limit);
    if(MP.screen !== 'connecting'){ if(r === 'ok') coStop(); return; }
    while(r === 'nobody' && until && performance.now() < until){
      await new Promise(res => setTimeout(res, 700)); if(MP.screen !== 'connecting') return;
      r = await mpOpenRetry(code, 'join', limit); if(MP.screen !== 'connecting'){ if(r === 'ok') coStop(); return; }
    }
    if(r === 'ok'){ mpLobby(); mpSend('hi', {}); }
    else if(r === 'full') mpKeypad(L('الغرفة مليانة', 'The room is full', 'Oda dolu') + ' 🙈');
    else mpKeypad(L('ما لقينا هالغرفة، تأكّد من الرقم', "We couldn't find that room — check the number", 'Bu oda bulunamadı, numarayı kontrol et'));
  }catch(e){ MP.err = String(e && (e.stack || e.message)).slice(0, 400); if(MP.screen === 'connecting' && String(e && e.message) !== 'cancelled') mpError(() => mpJoin(code)); }
}
function mpSendInvite(){
  const who = MP.inviteFor; if(!who || !MP.code || !window.Friends) return;
  MP.inviteFor = null;
  const no = () => toast(L('ما قدرنا نبعت الدعوة 🙈 قلّو رقم الغرفة', "Couldn't send the invite 🙈 tell them the room number", 'Davet gönderilemedi 🙈 oda numarasını söyle'));
  try{
    Friends.invite(who, MP.code, FR_GAME).then(r => {
      if(r && r.status === 'sent') toast(L('✉️ بعتنا دعوة لصاحبك! استنّاه يفوت', '✉️ Invite sent! Wait for your friend to join', '✉️ Davet gönderildi! Arkadaşının gelmesini bekle'));
      else no();
    }, no);
  }catch(e){ no(); }
}
function mpKeypad(msg){
  MP.tok++; mpClose(); MP.pub = false; MP.joining = 0;
  MP.screen = 'keypad'; MP.typed = ''; mpCard(true);
  const keys9 = [1, 2, 3, 4, 5, 6, 7, 8, 9].map(d => `<button data-k="${d}">${N(d)}</button>`).join('');
  card.innerHTML = `<h2>🔢 ${L('اكتب رقم الغرفة', 'Type the room number', 'Oda numarasını yaz')}</h2>
    <div class="mp-cols"><div class="mp-col"><div class="mp-code" id="kpCode"></div><p class="mp-msg" id="kpMsg"></p>
      <button class="ghost-btn" id="bBack">↩️ ${L('رجوع', 'Back', 'Geri')}</button></div>
    <div class="keypad" id="keypad">${keys9}<button data-k="del" aria-label="${L('امسح', 'Delete', 'Sil')}">⌫</button><button data-k="0">${N(0)}</button><button class="ok" data-k="ok" aria-label="${L('تمام', 'OK', 'Tamam')}">✅</button></div></div>`;
  $('#kpMsg').textContent = msg || '';
  card.querySelectorAll('#keypad button').forEach(b => b.onclick = () => mpKey(b.dataset.k));
  $('#bBack').onclick = () => { SFX.tap(); mpMenu(); };
  mpKeyDraw();
}
function mpKeyDraw(){ const el = $('#kpCode'); if(!el) return; el.innerHTML = [0, 1, 2, 3].map(i => `<b class="${i === MP.typed.length ? 'cur' : ''}">${MP.typed[i] != null ? N(MP.typed[i]) : ''}</b>`).join(''); }
function mpKey(k){
  if(MP.screen !== 'keypad') return;
  if(k === 'del'){ MP.typed = MP.typed.slice(0, -1); SFX.tap(); }
  else if(k === 'ok'){ if(MP.typed.length === 4) mpJoin(MP.typed); else SFX.nope(); return; }
  else if(/^\d$/.test(k) && MP.typed.length < 4){ MP.typed += k; SFX.tap(); }
  const m = $('#kpMsg'); if(m) m.textContent = '';
  mpKeyDraw();
  if(MP.typed.length === 4){ const code = MP.typed; setTimeout(() => { if(MP.screen === 'keypad' && MP.typed === code) mpJoin(code); }, 300); }
}
addEventListener('keydown', e => {
  if(state !== 'mp' || MP.screen !== 'keypad') return;
  if(/^\d$/.test(e.key)) mpKey(e.key); else if(e.key === 'Backspace') mpKey('del'); else if(e.key === 'Enter') mpKey('ok');
});
document.addEventListener('visibilitychange', () => { if(document.hidden){ persist(true); if(state === 'play' && !mpActive()) showPause(); } });

/* ======================================================================
   Test hooks (used by the automated tests only)
   ====================================================================== */
const boothInfo = i => { const e = BT[i]; return e ? { id:e.id, s:e.s, c:e.c, d:e.d, h:e.h, mine:e.id === MP.id, name:nameById(e.id) } : null; };
window.__booths = {
  get state(){ return state; }, get P(){ return { x:r2(P.x), y:r2(P.y), z:r2(P.z), f:r2(P.f), gr:P.gr, cart:P.cart }; },
  get booths(){ return BT.map((e, i) => boothInfo(i)); }, get myBooth(){ return myBooth(); }, get want(){ return want ? Object.assign({}, want) : null; },
  spot(i, where){ const B = PZ.BOOTHS[i]; const p = PZ.toWorld(B, 0, where === 'in' ? -.3 : 2.4); return { x:r2(p.x), z:r2(p.z), f:where === 'in' ? r2(B.yaw) : r2(B.yaw + Math.PI) }; },
  get ctx(){ const c = ctxNow(); return c ? c.k + ':' + (c.k === 'cart' ? c.i : c.k === 'out' ? '' : c.b) : null; }, get ctxText(){ return ctxBtn.hidden ? null : ctxBtn.textContent; },
  get giftTarget(){ return giftTarget(); }, giftWait(b){ return giftWait(b); }, get giftsShown(){ return !giftsBox.hidden; }, get giftNote(){ const el = $('#giftNote'); return el.hidden ? null : el.textContent; },
  get board(){ return boardRows(); }, get life(){ return SAVE.life; }, get save(){ return JSON.parse(JSON.stringify(SAVE)); }, get alone(){ return !aloneEl.hidden; },
  get carts(){ return CARTS.map(c => ({ x:r2(c.x), z:r2(c.z), f:r2(c.f), v:r2(c.v), by:c.by })); },
  play(){ beginGame(); }, menu(){ showTitle(); }, pause(){ showPause(); }, resume(){ resume(); }, select(){ showSelect('menu'); }, hero(id){ setHero(id); },
  tp(x, z, f){ placeAt(x, z, f != null ? f : P.f); }, go(x, z, r){ testGo = { x, z, r }; }, get going(){ return !!testGo; }, input(x, y){ testInput = x == null ? null : { x, y }; },
  A(){ pressA(); }, ctxDo(){ doCtx(); }, setup(b){ showSetup(b); }, pick(s, c, d){ if(pick){ if(s != null) pick.s = s; if(c != null) pick.c = c; if(d != null) pick.d = d; } }, confirm(){ return confirmSetup(); },
  claim(b, s = 0, c = 0, d = 0){ showSetup(b); pick = { s, c, d }; return confirmSetup(); }, leaveBooth(){ leaveBooth(); },
  give(b, k = 'heart'){ return give(b, k); }, enterCart(i){ return enterCart(i); }, leaveCart(){ leaveCart(); },
  yaw(a){ cam.yaw = a; cam.lookT = performance.now(); }, pitch(a){ cam.pAdj = a; cam.lookT = performance.now(); }, face(x, z){ P.f = Math.atan2(x - P.x, z - P.z); cam.yaw = P.f + Math.PI; cam.snap = true; cam.lookT = performance.now(); },
  camFix(a){ camFix = a || null; }, freeze(v){ frozen = !!v; }, get quality(){ return quality; }, get fps(){ return lastFps; }, setQuality(q){ quality = q; applyQuality(); },
  info(){ const i = renderer.info.render; return { calls:i.calls, tris:i.triangles, geos:renderer.info.memory.geometries, tex:renderer.info.memory.textures }; },
  back(){ if(state === 'mp') mpBack(); else if(state === 'select') backFromSelect(); else if(state === 'setup') resume(); else showTitle(); },
  get mpScreen(){ return MP.screen; }, get mp(){ return { code:MP.code, active:mpActive(), hostId:MP.hostId, host:amHost(), screen:MP.screen, id:MP.id, players:MP.players.map(p => ({ id:p.id, hero:p.hero })) }; }, get mpErr(){ return MP.err || ''; },
  get remotes(){ return [...RM.values()].map(a => ({ id:a.id, seen:a.seen, away:a.away, hero:a.hero, x:r2(a.x), y:r2(a.y), z:r2(a.z), cart:a.cart, vis:!!(a.h && a.h.grp.visible), name:a.lbl.hidden ? null : a.lbl.textContent, who:nameOf(a), emo:emoOn(a) ? a.emo.k : null, last:a.emo ? a.emo.k : null, bub:a.bub.hidden ? null : a.bub.textContent })); },
  get pub(){ return { on:MP.pub, active:mpActive(), shard:MP.shard, code:MP.code, status:MP.status, kids:kidsHere(), chip:modeText() }; },
  get me(){ return ME; }, get booted(){ return BOOTED; }, submitName(n, raw){ return submitName(n, showName.done || (() => {}), raw); }, skipName(){ const b = $('#bSkip'); if(b) b.click(); },
  emote(k){ return emote(k); }, get myBubble(){ return myBubble && !myBubble.hidden ? myBubble.textContent : null; }, emotes:EMOTES.map(x => x.k),
  pubJoin(n){ return pubJoin(n); }, mpMenu(){ mpMenu(); }, mpCreate(c){ return mpCreate(c); }, mpJoin(c){ return mpJoin(c); }, mpGo(){ const b = document.querySelector('#bGo'); if(b) b.click(); }, mpLeave(){ coStop(); showTitle(); },
  hud(){ hudKey = ''; }
};

/* ---------- boot ---------- */
setHero(heroId);
applyQuality();
paintBooths(); paintBoard();
showTitle();
requestAnimationFrame(t => { last = t; frame(t); });
/* «شو اسمك؟» once, before the public plaza: the name is checked and kept by the server (Friends.setName). Skipped or
   refused: the others see «<hero> <number>». Asked only once on this phone (shared with the other public games' key). */
const NAME_ASKED = 'booths_name_asked' + SLOT;
function showName(msg, done){
  state = 'name'; setPlayUI(false); clearInput(); showOverlay('dim'); card.className = 'card namecard';
  card.innerHTML = `<div class="bigq">👋</div><h1>${L('شو اسمك؟', "What's your name?", 'Adın ne?')}</h1>
    <p>${L('هيك بيكتبوه على بسطتك والأولاد بيعرفوك 🏪', 'It goes on your booth so the kids know you 🏪', 'Tezgahında yazar, çocuklar seni tanır 🏪')}</p>
    <input id="nameIn" maxlength="14" autocomplete="off" autocapitalize="words" spellcheck="false" dir="auto" aria-label="${L('اسمك', 'Your name', 'Adın')}">
    <p class="mp-msg" id="nameMsg"></p>
    <div class="row"><button class="big-btn" id="bName">✅ ${L('تمام', 'OK', 'Tamam')}</button><button class="ghost-btn" id="bSkip">⏭️ ${L('بعدين', 'Later', 'Sonra')}</button></div>`;
  $('#nameMsg').textContent = msg || '';
  const inp = $('#nameIn');
  inp.addEventListener('input', () => { const v = cleanName(inp.value); if(v !== inp.value) inp.value = v; $('#nameMsg').textContent = ''; });
  inp.addEventListener('keydown', e => { if(e.key === 'Enter') submitName(inp.value, done); });
  $('#bName').onclick = () => { SFX.tap(); submitName(inp.value, done); };
  $('#bSkip').onclick = () => { SFX.tap(); done(); };
  showName.done = done;
  setTimeout(() => { try{ inp.focus(); }catch(e){} }, 300);
}
let nameBusy = false;
async function submitName(raw, done, noClean){
  const n = noClean ? String(raw || '') : cleanName(raw).trim();
  if(!n){ SFX.nope(); const m = $('#nameMsg'); if(m) m.textContent = L('اكتب اسمك 🙂', 'Type your name 🙂', 'Adını yaz 🙂'); return false; }
  if(nameBusy || state !== 'name') return false; nameBusy = true;
  const b = $('#bName'); if(b) b.disabled = true;
  try{
    const c = await Friends.setName(n); ME = Object.assign({}, ME, c);
    if(!ME.name) throw Object.assign(new Error('bad_name'), { code:'22023' });
    nameBusy = false; boothsDirty = true; toast('👋 ' + ME.name, 2000); done(); return true;
  }catch(e){
    nameBusy = false;
    showName(e && e.offline ? Friends.errText(e) : L('هالاسم ما بيصير، جرّب اسم تاني 🙈', "That name isn't allowed, try another 🙈", 'Bu isim olmaz, başka dene 🙈'), done);
    const inp = $('#nameIn'); if(inp) inp.value = cleanName(raw); SFX.nope(); return false;
  }
}
const withTimeout = (p, ms) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))]);
async function bootPublic(){
  if(window.Friends){
    try{
      ME = await withTimeout(Friends.me(), 10000); boothsDirty = true;
      if(ME && !ME.name && !rawGet(NAME_ASKED) && !rawGet('hara_name_asked' + SLOT) && state === 'menu'){
        rawSet(NAME_ASKED, '1');
        await new Promise(res => showName('', res));
        if(state === 'name') showTitle();
      }
    }catch(e){ /* no internet: the plaza still opens (names come later); rt.js keeps trying */ }
  }
  BOOTED = true;
  if(state === 'menu') showTitle(); else pubEnsure();
}
/* ?host=1 (&room=<4 digits>, &invite=<friendCode>, &accept=<id> for invitepop.js) makes a room; ?join=<room> joins one */
(function(){
  const join = QS.get('join'), host = QS.get('host') === '1', inv = QS.get('invite'), room = QS.get('room');
  if(!/^\d{4}$/.test(join || '') && !host){ bootPublic(); return; }
  if(window.Friends) withTimeout(Friends.me(), 10000).then(m => { ME = m; boothsDirty = true; }, () => {});
  BOOTED = true;
  const q = new URLSearchParams(location.search); ['join', 'host', 'invite', 'room'].forEach(k => q.delete(k));
  try{ history.replaceState(history.state, '', location.pathname + (q.toString() ? '?' + q : '') + location.hash); }catch(e){}
  if(/^\d{4}$/.test(join || '')) mpJoin(join, performance.now() + 20000);
  else { MP.inviteFor = /^[A-Z2-9]{6}$/.test(inv || '') ? inv : null; mpCreate(/^\d{4}$/.test(room || '') ? room : null); }
})();
