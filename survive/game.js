/* Deserted Island («البقاء بالجزيرة المهجورة 🏝️») — an original 3D co-op survival game for kids.
   The plane gets tired and lands on a deserted island (a calm, friendly intro). Every kid has an axe 🪓 and a bag 🎒.
   Gather: chop trees for wood (they grow back), pick stones, vines, leaves, coconuts and berries, open crates washed ashore,
   fish with a rod. Craft (🔨): rope, a better axe (stone → metal from plane parts), fishing rod, bigger bag, campfire, tent.
   Hunger is gentle: an energy bar; when it is empty you only walk slower (no dying, ever). Sharks circle in deep water:
   swim too far and a cartoon shark bumps you back to the beach («بوينغ!»). Build the raft at the shore in 4 stages
   (logs → ropes → mast + sail → paddles), push off together, paddle past the sharks (a bump knocks a bit of raft
   health off: repair with wood) to the rescue ship → stars, a team card and coins.
   Easy / Normal / Hard change the costs, the hunger speed, the sharks and the length of the day (nights are cozy and starry).
   Online («👫 العب مع أصحابك», ../rt.js): 2–4 friends. The room owner (host) owns the world: trees, things on the ground,
   crates, campfire/tent, the raft, the sharks and the time of day; every phone owns its own kid and bag.
   Everything a kid takes from the world is asked from the host ('req') and the host gives it ('got'). */
import * as THREE from '../adventure3d/three.module.min.js';
import { makeKit } from '../worlds/kit.js';
import { makeIsland } from './world.js';
import { makeAudio } from './audio.js';

const $ = s => document.querySelector(s);
{ const md = document.querySelector('meta[name="description"]'), dl = window.I18N && md && md.getAttribute('data-' + I18N.lang); if(dl) md.setAttribute('content', dl); }
const N = n => window.I18N ? I18N.num(n) : String(n);
const rawGet = k => { try{ return localStorage.getItem(k); }catch(e){ return null; } };
const rawSet = (k, v) => { try{ localStorage.setItem(k, v); }catch(e){} };
const K = makeKit(THREE);
const { HEROES, HERO_IDS, HERO_NAME, HERO_COLOR, poseHero } = K;
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const angDiff = (a, b) => { let d = a - b; while(d > Math.PI) d -= Math.PI * 2; while(d < -Math.PI) d += Math.PI * 2; return d; };
const pick = a => a[Math.floor(Math.random() * a.length)];
const r2 = v => Math.round(v * 100) / 100;
const charImg = id => '../worlds/chars/' + (HEROES[id] ? id : 'sara') + '.png';
const QS = new URLSearchParams(location.search);
const MP_LOCAL = QS.get('mp') === 'local';
const AU = makeAudio(), SFX = AU.SFX;
const today = () => { const d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); };

/* ======================================================================
   Things, recipes, raft stages, difficulty
   ====================================================================== */
const ITEMS = {
  wood:{ e:'🪵', n:['خشب', 'Wood', 'Odun'] },
  stone:{ e:'🪨', n:['حجر', 'Stone', 'Taş'] },
  vine:{ e:'🌿', n:['عرق نبتة', 'Vine', 'Sarmaşık'] },
  leaf:{ e:'🍃', n:['ورق كبير', 'Big leaf', 'Büyük yaprak'] },
  rope:{ e:'🪢', n:['حبل', 'Rope', 'İp'] },
  cloth:{ e:'🏳️', n:['قماش', 'Cloth', 'Kumaş'] },
  metal:{ e:'⚙️', n:['قطعة طيارة', 'Plane part', 'Uçak parçası'] },
  berry:{ e:'🍓', n:['توت', 'Berries', 'Çilek'], food:14 },
  coconut:{ e:'🥥', n:['جوز هند', 'Coconut', 'Hindistan cevizi'], food:22 },
  fish:{ e:'🐟', n:['سمكة', 'Fish', 'Balık'], food:20 },
  cooked:{ e:'🍢', n:['سمكة مشوية', 'Grilled fish', 'Izgara balık'], food:45 }
};
const ITEM_IDS = Object.keys(ITEMS);
const itemName = k => ITEMS[k] ? L(...ITEMS[k].n) : '';
const STACK = 10, BAG0 = 8, BAG1 = 14;
const DIFF = {
  easy:  { e:'🐣', n:['سهل', 'Easy', 'Kolay'], s:['أغراض أقل، أكل بطيء', 'Fewer things, slow hunger', 'Az malzeme, yavaş acıkma'], col:'linear-gradient(160deg,#7fe08c,#2fa864)', cost:.6, hunger:.6, day:300, sharkGap:9.5, sharkDmg:8, crate:34, par:3 },
  normal:{ e:'🏝️', n:['عادي', 'Normal', 'Normal'], s:['متل المغامرة الحقيقية', 'A real adventure', 'Gerçek bir macera'], col:'linear-gradient(160deg,#6cc4ff,#2f7fd8)', cost:1, hunger:1, day:240, sharkGap:6.5, sharkDmg:12, crate:48, par:3 },
  hard:  { e:'🦈', n:['صعب', 'Hard', 'Zor'], s:['أغراض أكتر، قروش نشيطة', 'More things, busy sharks', 'Daha çok malzeme, hareketli köpekbalıkları'], col:'linear-gradient(160deg,#ff9a6a,#e0505f)', cost:1.4, hunger:1.5, day:180, sharkGap:4.2, sharkDmg:16, crate:64, par:4 }
};
const okDiff = d => DIFF[d] ? d : 'normal';
const cost = (base, diff) => { const o = {}; for(const k of Object.keys(base)) o[k] = Math.max(1, Math.round(base[k] * DIFF[okDiff(diff)].cost)); return o; };
/* personal tools + shared camp things */
const RECIPES = [
  { id:'rope', e:'🪢', n:['حبل', 'Rope', 'İp'], c:{ vine:3 }, give:{ rope:1 }, fixed:true },
  { id:'axe2', e:'🪓', n:['فأس حجري', 'Stone axe', 'Taş balta'], c:{ wood:2, stone:3, rope:1 }, tool:'axe', lvl:2 },
  { id:'axe3', e:'⛏️', n:['فأس حديد', 'Metal axe', 'Metal balta'], c:{ wood:2, metal:3, rope:1 }, tool:'axe', lvl:3, need:'axe2' },
  { id:'rod', e:'🎣', n:['صنّارة', 'Fishing rod', 'Olta'], c:{ wood:2, vine:2 }, tool:'rod' },
  { id:'blaster', e:'🔫', n:['بلاستر ليزر', 'Laser blaster', 'Lazer tabancası'], c:{ metal:3, rope:1 }, tool:'blaster' },
  { id:'bag', e:'🎒', n:['شنطة أكبر', 'Bigger bag', 'Büyük çanta'], c:{ leaf:4, rope:2, cloth:1 }, tool:'bag' },
  { id:'fire', e:'🔥', n:['نار المخيم', 'Campfire', 'Kamp ateşi'], c:{ wood:4, stone:4 }, shared:'fire' },
  { id:'tent', e:'⛺', n:['خيمة', 'Tent', 'Çadır'], c:{ wood:4, leaf:5, rope:1 }, shared:'tent' }
];
const recipeCost = (r, diff) => r.fixed ? Object.assign({}, r.c) : cost(r.c, diff);
const RAFT_ST = [
  { e:'🪵', n:['جذوع', 'Logs', 'Kütükler'], c:{ wood:8 } },
  { e:'🪢', n:['ربط بالحبال', 'Tie with ropes', 'İplerle bağla'], c:{ rope:4 } },
  { e:'⛵', n:['صاري وشراع', 'Mast and sail', 'Direk ve yelken'], c:{ wood:2, cloth:3 } },
  { e:'🛶', n:['مجاديف', 'Paddles', 'Kürekler'], c:{ wood:3, rope:1 } }
];
const raftCost = (i, diff) => cost(RAFT_ST[i].c, diff);
const AXE_DMG = [0, 1.5, 2, 3], TREE_HP = 6, WOOD_PER_TREE = 3;

/* ---------- save (this device) ---------- */
const SAVE_KEY = 'survive_save' + (MP_LOCAL && /^[a-z]$/.test(QS.get('slot') || '') ? '_' + QS.get('slot') : ''), SAVE_V = 1, COIN_CAP = 160;
function freshSave(){ return { v:SAVE_V, hero:null, diff:'normal', wins:{ easy:0, normal:0, hard:0 }, best:{}, played:0, tut:0, cd:{ d:'', n:0 } }; }
function loadSave(){
  try{
    const v = JSON.parse(rawGet(SAVE_KEY));
    if(v && typeof v === 'object' && v.v === SAVE_V){
      const s = Object.assign(freshSave(), v);
      s.diff = okDiff(s.diff);
      const w = { easy:0, normal:0, hard:0 }; if(s.wins && typeof s.wins === 'object') for(const k of Object.keys(w)) w[k] = clamp(s.wins[k] | 0, 0, 99999); s.wins = w;
      const b = {}; if(s.best && typeof s.best === 'object') for(const k of Object.keys(w)){ const x = s.best[k]; if(x && typeof x === 'object') b[k] = { stars:clamp(x.stars | 0, 0, 3), days:clamp(x.days | 0, 1, 999) }; } s.best = b;
      s.played = clamp(s.played | 0, 0, 99999); s.tut = clamp(s.tut | 0, 0, 9);
      if(!s.cd || typeof s.cd !== 'object') s.cd = { d:'', n:0 }; s.cd.n = clamp(s.cd.n | 0, 0, COIN_CAP);
      return s;
    }
  }catch(e){}
  return null;
}
let SAVE = loadSave() || freshSave();
function persist(){ rawSet(SAVE_KEY, JSON.stringify(SAVE)); }
let heroId = HERO_IDS.includes(SAVE.hero) ? SAVE.hero : HERO_IDS.includes(rawGet('worlds_hero')) ? rawGet('worlds_hero') : 'sara';

/* ---------- always-landscape stage ---------- */
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

/* ---------- renderer ---------- */
const canvas = $('#cv');
let renderer;
try{ renderer = new THREE.WebGLRenderer({ canvas, antialias:true, powerPreference:'high-performance' }); }
catch(e){ $('#nogl').hidden = false; $('#overlay').hidden = true; throw e; }
let dpr = Math.min(window.devicePixelRatio || 1, 1.5);
renderer.setPixelRatio(dpr);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0xe9f8ff, 170, 720);
const camera = new THREE.PerspectiveCamera(58, 1, .2, 2000);
function resize(){
  layout();
  renderer.setSize(SW, SH, false);
  camera.aspect = SW / SH; camera.updateProjectionMatrix();
  placeJoyHome();
}
addEventListener('resize', resize);
addEventListener('orientationchange', () => setTimeout(resize, 120));
const hemi = new THREE.HemisphereLight(0xdff2ff, 0xf3d9a0, 1.55); scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff1d8, 2.3);
sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024); sun.shadow.bias = -.0008; sun.shadow.normalBias = .05;
Object.assign(sun.shadow.camera, { left:-36, right:36, top:36, bottom:-36, near:1, far:220 }); sun.shadow.camera.updateProjectionMatrix();
scene.add(sun); scene.add(sun.target);
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _s = new THREE.Vector3(), _v = new THREE.Vector3(), _v2 = new THREE.Vector3(), _c = new THREE.Color(), _e = new THREE.Euler();

/* ---------- the island ---------- */
const W = makeIsland(THREE, K);
scene.add(W.root);

/* ---------- particles: wood chips, leaves, splashes, sparkles, confetti ---------- */
const PMAX = 380, parts = [], pMesh = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(.1, 0), new THREE.MeshBasicMaterial(), PMAX);
pMesh.frustumCulled = false; scene.add(pMesh);
for(let i = 0; i < PMAX; i++){ parts.push({ life:0, x:0, y:0, z:0, vx:0, vy:0, vz:0, s:1, g:12 }); pMesh.setColorAt(i, _c.set(0xffffff)); _m.makeScale(0, 0, 0); pMesh.setMatrixAt(i, _m); }
let pNext = 0;
const CONFETTI = [0xffc23d, 0xff8fb1, 0x5ed6a0, 0x6cc4ff, 0xffffff, 0xc77dff], GOLD = [0xffcf3a, 0xffe680, 0xffffff], CHIPS = [0xc98d4a, 0xe8c48a, 0x8a5a2e],
  LEAVES = [0x5fbf50, 0x46b34c, 0x8fdc6a], SPLASH = [0xbff3ff, 0xffffff, 0x7fe0f5], SAND = [0xf6dfa2, 0xe9cf8e, 0xfff0c8], BERRY = [0xe8304f, 0xff8fb1], STONE = [0xa6adb5, 0xcfd3d8];
function burst(x, y, z, n, colors, speed = 4, size = 1, grav = 12, up = 2){
  for(let k = 0; k < n; k++){
    const p = parts[pNext], i = pNext; pNext = (pNext + 1) % PMAX;
    const a = Math.random() * 6.28, u = Math.random() * 2 - 1, r = Math.sqrt(1 - u * u);
    p.life = .6 + Math.random() * .6; p.x = x; p.y = y; p.z = z; p.vx = Math.cos(a) * r * speed; p.vz = Math.sin(a) * r * speed; p.vy = Math.abs(u) * speed + up; p.s = size * (.7 + Math.random() * .8); p.g = grav;
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

/* ---------- heroes with an axe and a backpack ---------- */
const myAv = () => { try{ return heroId === 'me' && window.Avatar ? Avatar.load() : null; }catch(e){ return null; } };
const okAv = av => {
  try{
    if(!window.Avatar || !av || typeof av !== 'object') return null;
    const o = {};
    for(const k of Object.keys(av).slice(0, 30)){ const v = av[k]; if(v === null || typeof v === 'boolean' || (typeof v === 'number' && isFinite(v)) || (typeof v === 'string' && /^[A-Za-z][A-Za-z0-9]{0,15}$/.test(v) && !(v in Object.prototype))) o[k] = v; }
    return Avatar.normalize(o);
  }catch(e){ return null; }
};
const okHero = id => (typeof id === 'string' && Object.prototype.hasOwnProperty.call(HEROES, id)) ? id : 'sara';
const AXE_COL = [0, 0x8a5a2e, 0x9aa3ab, 0xc7ccd4];
function axeMesh(lvl){
  const M = new K.Merge();
  M.add(K.G.cyl8, 0, 0, .16, .03, .26, .03, Math.PI / 2, 0, 0, 0x9c6a38);
  M.add(K.G.box, 0, .07, .36, .05, .16, .14, 0, 0, 0, AXE_COL[lvl] || 0x9aa3ab);
  if(lvl >= 3) M.add(K.G.box, 0, .07, .43, .055, .2, .03, 0, 0, 0, 0xe8eef8);
  const m = new THREE.Mesh(M.geometry(), new THREE.MeshLambertMaterial({ vertexColors:true, flatShading:true })); m.castShadow = true; return m;
}
function makeHero(id, av){
  let h; try{ h = id === 'me' ? HEROES.me(av || undefined) : HEROES[id](); }catch(e){ h = HEROES.sara(); }
  K.shadowHero(h);
  // little backpack
  if(id !== 'mushakis'){ const bp = new THREE.Mesh(new THREE.BoxGeometry(.3, .3, .14), new THREE.MeshLambertMaterial({ color:0xd9823f })); bp.position.set(0, .6, -.24); bp.castShadow = true; h.body.add(bp); }
  h.axeLvl = 0; setAxe(h, 1);
  return h;
}
function setAxe(h, lvl){
  if(h.axeLvl === lvl) return;
  if(h.axe) h.axe.parent.remove(h.axe);
  h.axeLvl = lvl; h.axe = axeMesh(lvl);
  const arm = h.arms.find(a => a.userData.side > 0) || h.arms[0];
  if(arm){ h.axe.position.set(0, -.29, 0); arm.add(h.axe); }
  else { h.axe.position.set(.18, .45, .2); h.axe.scale.setScalar(.8); h.body.add(h.axe); }
}
/* pose on top of poseHero: chop swing, crouch to pick, paddle, sit */
function actPose(h, act, k, t){
  const arm = h.arms.find(a => a.userData.side > 0) || h.arms[0], arm2 = h.arms.find(a => a.userData.side < 0);
  if(act === 'chop' && arm){ const s = Math.sin(k * Math.PI); arm.rotation.x = -2.7 + s * 2.2; arm.rotation.z = -.15; h.body.rotation.y = -.25 + s * .2; }
  else if(act === 'pick'){ const s = Math.sin(k * Math.PI); h.body.rotation.x = s * .55; h.body.position.y -= s * .1; h.arms.forEach(a => { a.rotation.x = -s * 1.2; }); }
  else if(act === 'eat' && arm){ arm.rotation.x = -2 + Math.sin(t * 18) * .2; arm.rotation.z = .3; }
  else if(act === 'cheer'){ h.arms.forEach((a, i) => { a.rotation.x = -2.8 + Math.sin(t * 9 + i * 3) * .3; a.rotation.z = -a.userData.side * .3; }); }
  else if(act === 'fish' && arm){ arm.rotation.x = -1.3 + Math.sin(t * 2) * .05; if(arm2) arm2.rotation.x = -1.1; }
  else if(act === 'swim'){ h.arms.forEach((a, i) => { a.rotation.x = -2.2 + Math.sin(t * 6 + i * Math.PI) * 1.1; a.rotation.z = -a.userData.side * .5; }); }
}
function sitPose(h, t, paddle, side){
  h.body.position.y = 0; h.body.rotation.set(0, 0, 0);
  h.legs.forEach(l => { l.rotation.x = -1.45; });
  const s = paddle > 0 ? Math.sin(paddle * Math.PI * 2) : 0;
  h.arms.forEach(a => { a.rotation.x = -1.0 + s * .7; a.rotation.z = -a.userData.side * .2; });
  h.head.rotation.set(Math.sin(t * 2) * .04, 0, Math.sin(t * 1.3) * .04);
  const bt = t + h.blink, blink = (bt % 3.7) < .13, fm = h.face.material, want = blink ? h.face.userData.shut : h.face.userData.open; if(fm.map !== want){ fm.map = want; fm.needsUpdate = true; }
}

/* ---------- me ---------- */
const P = { x:W.SPAWN.x, y:W.SPAWN.y, z:W.SPAWN.z, vx:0, vz:0, vy:0, f:0, m:0, gr:true, t:0, sq:0, swim:false, wade:false, push:0, px:0, pz:0, act:null, actT:0, actD:.4, seat:-1, paddle:0 };
let heroM = null;
function setHero(id){
  heroId = HERO_IDS.includes(id) ? id : 'sara';
  if(heroM) heroM.grp.parent && heroM.grp.parent.remove(heroM.grp);
  heroM = makeHero(heroId, myAv()); scene.add(heroM.grp);
  setAxe(heroM, G.axe || 1);
}

/* ======================================================================
   Input: joystick (left half), camera drag (right half), A / B / 🎒 / 🔨
   ====================================================================== */
const cam = { yaw:0, pitch:.42, dist:8.5, pAdj:0, lookT:0, shake:0 };
const camPos = new THREE.Vector3(0, 30, 80), camLook = new THREE.Vector3();
let snapCam = true;
const joy = { x:0, y:0, id:null, ox:0, oy:0 }, look = { id:null, x:0, y:0 }, keys = {};
const joyEl = $('#joy'), knob = $('#knob'), touch = $('#touch'), aBtn = $('#btnA'), bBtn = $('#btnB'), bagBtn = $('#btnBag'), craftBtn = $('#btnCraft');
let joyHome = [90, 0], wantA = false, wantB = false;
function placeJoyHome(){ joyHome = [Math.max(84, SAL + 78), SH - Math.max(92, SH * .16) - SAB * .5]; if(joy.id == null) setJoy(joyHome[0], joyHome[1]); }
function setJoy(x, y){ joyEl.style.left = x + 'px'; joyEl.style.top = y + 'px'; }
touch.addEventListener('pointerdown', e => {
  e.preventDefault(); AU.ac();
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
  else if(e.pointerId === look.id && state === 'play'){ cam.yaw -= (p.x - look.x) * .0075; cam.pAdj = clamp(cam.pAdj + (p.y - look.y) * .004, -.3, .6); look.x = p.x; look.y = p.y; cam.lookT = performance.now(); }
});
function endPtr(e){
  if(e.pointerId === joy.id){ joy.id = null; joy.x = joy.y = 0; knob.style.transform = ''; joyEl.classList.remove('on'); setJoy(...joyHome); }
  if(e.pointerId === look.id){ look.id = null; cam.lookT = performance.now(); }
}
touch.addEventListener('pointerup', endPtr); touch.addEventListener('pointercancel', endPtr);
function holdBtn(btn, fn){
  btn.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); AU.ac(); btn.classList.add('on'); fn(); });
  ['pointerup', 'pointercancel', 'pointerleave'].forEach(t => btn.addEventListener(t, () => btn.classList.remove('on')));
}
holdBtn(aBtn, () => { wantA = true; });
holdBtn(bBtn, () => { wantB = true; });
holdBtn(bagBtn, () => { if(state === 'play'){ SFX.tap(); showBag(); } });
holdBtn(craftBtn, () => { if(state === 'play'){ SFX.tap(); showCraft(); } });
const zapBtn = $('#btnZap'); let wantZap = false;
holdBtn(zapBtn, () => { wantZap = true; });
const KEYMAP = { KeyW:'f', ArrowUp:'f', KeyS:'b', ArrowDown:'b', KeyA:'l', ArrowLeft:'l', KeyD:'r', ArrowRight:'r', KeyQ:'cl', KeyE:'cr' };
addEventListener('keydown', e => {
  if(KEYMAP[e.code]){ keys[KEYMAP[e.code]] = true; if(state === 'play') e.preventDefault(); }
  if(state === 'play' && !e.repeat){
    if(e.code === 'KeyJ' || e.code === 'Enter'){ wantA = true; e.preventDefault(); }
    if(e.code === 'Space' || e.code === 'KeyK'){ wantB = true; e.preventDefault(); }
    if(e.code === 'KeyI' || e.code === 'KeyB'){ showBag(); }
    if(e.code === 'KeyC'){ showCraft(); }
    if(e.code === 'KeyL' || e.code === 'KeyF'){ wantZap = true; }
  }
  if((e.code === 'Escape' || e.code === 'KeyP') && state === 'play') showPause();
});
addEventListener('keyup', e => { if(KEYMAP[e.code]) keys[KEYMAP[e.code]] = false; });
addEventListener('blur', () => { for(const k in keys) keys[k] = false; });
function clearInput(){ joy.id = null; joy.x = joy.y = 0; look.id = null; knob.style.transform = ''; joyEl.classList.remove('on'); for(const k in keys) keys[k] = false; wantA = wantB = false; }
const inp = { x:0, z:0, m:0, sx:0 };
let testInput = null, testGo = null, timeScale = 1;
function readInput(dt){
  let ix = joy.x + (keys.r ? 1 : 0) - (keys.l ? 1 : 0), iy = joy.y + (keys.b ? 1 : 0) - (keys.f ? 1 : 0);
  if(testInput){ ix = testInput.x; iy = testInput.y; }
  if(testGo){ const dx = testGo.x - P.x, dz = testGo.z - P.z, l = Math.hypot(dx, dz) || 1, ux = dx / l, uz = dz / l;
    if(l < (testGo.r || .6)){ testGo = null; ix = iy = 0; }
    else { ix = (ux * Math.cos(cam.yaw) - uz * Math.sin(cam.yaw)); iy = -(ux * -Math.sin(cam.yaw) + uz * -Math.cos(cam.yaw)); } }
  let m = Math.hypot(ix, iy); if(m > 1){ ix /= m; iy /= m; m = 1; } if(m < .12){ ix = iy = 0; m = 0; }
  if(keys.cl) cam.yaw += 2.2 * dt; if(keys.cr) cam.yaw -= 2.2 * dt;
  const fx = -Math.sin(cam.yaw), fz = -Math.cos(cam.yaw), rx = Math.cos(cam.yaw), rz = -Math.sin(cam.yaw);
  inp.x = rx * ix - fx * iy; inp.z = rz * ix - fz * iy; inp.m = m; inp.sx = ix;
}

/* ======================================================================
   Game state. G = this phone (my bag, tools, energy, goals). WS = the shared world (the host decides).
   ====================================================================== */
let state = 'menu', menuT = 0;
const G = { diff:SAVE.diff, n:0, inv:[], bag:BAG0, axe:1, rod:false, energy:100, flags:{}, stats:{ wood:0, items:0, fish:0, crafted:0 }, playT:0, started:false, hungryT:0, bumpCd:0, fishT:0, fishing:null, intro:null, end:null, coins:0, late:false };
function freshWS(diff){
  return { n:G.n, diff, wt:0, d:.08, dn:1,
    trees:W.TREES.map(() => TREE_HP), grow:W.TREES.map(() => 1), picks:W.PICKS.map(() => 1), bush:W.BUSHES.map(b => b.max), nuts:W.PALMS.map(p => p.max),
    crates:[], cid:0, fire:0, tent:0, laser:0, tags:{}, raft:{ st:0, have:{}, hp:100 }, ph:'build', sail:{ x:W.RAFT.x, z:W.RAFT.z, h:W.RAFT.a, p:0, sp:0 }, aboard:[] };
}
let WS = freshWS('normal');
/* host-only timers */
const HT = { trees:[], picks:[], bush:[], nuts:[], crate:0, snap:0, sl:0, dirty:false, shark:0, boardT:0, hits:{} };

/* ---------- my bag ---------- */
function invCount(k){ let n = 0; for(const s of G.inv) if(s && s.k === k) n += s.n; return n; }
function invAdd(k, n){
  if(!ITEMS[k] || n <= 0) return 0;
  for(const s of G.inv) if(s && s.k === k && s.n < STACK){ const a = Math.min(n, STACK - s.n); s.n += a; n -= a; if(!n) break; }
  for(let i = 0; i < G.bag && n > 0; i++) if(!G.inv[i]){ const a = Math.min(n, STACK); G.inv[i] = { k, n:a }; n -= a; }
  hudKey = '';
  return n;          // what did not fit
}
function invTake(k, n){
  if(invCount(k) < n) return false;
  for(let i = G.inv.length - 1; i >= 0 && n > 0; i--){ const s = G.inv[i]; if(s && s.k === k){ const a = Math.min(n, s.n); s.n -= a; n -= a; if(!s.n) G.inv[i] = null; } }
  hudKey = ''; return true;
}
const hasAll = c => Object.keys(c).every(k => invCount(k) >= c[k]);
const payAll = c => { if(!hasAll(c)) return false; for(const k of Object.keys(c)) invTake(k, c[k]); return true; };
function gotItems(items, why){
  let lost = 0; const shown = [];
  if(items && items.blaster && !G.blaster){ G.blaster = true; G.bat = 5; shown.push('🔫✨ ' + L('بلاستر ليزر!', 'Laser blaster!', 'Lazer tabancası!')); setTimeout(() => say('🔫✨ ' + L('لقيت بلاستر ليزر! زر ⚡ بيبعت شعاع ملوّن', 'You found a laser blaster! The ⚡ button fires a colourful beam', 'Lazer tabancası buldun! ⚡ düğmesi renkli ışın atar'), 4500), 600); }
  for(const k of Object.keys(items || {})){ const n = clamp(items[k] | 0, 0, 30); if(!ITEMS[k] || !n) continue; lost += invAdd(k, n); shown.push(ITEMS[k].e + ' +' + N(n)); G.stats.items += n; if(k === 'wood') G.stats.wood += n; if(k === 'fish') G.stats.fish += n; }
  if(shown.length) popText(shown.join('  '));
  if(lost) toast('🎒 ' + L('الشنطة مليانة! اصنع شنطة أكبر أو استعمل الأغراض', 'The bag is full! Craft a bigger bag or use your things', 'Çanta dolu! Daha büyük çanta yap ya da malzemeleri kullan'));
  if(items && items.wood) G.flags.chop = 1;
  if(why === 'crate') SFX.crate(); else if(why === 'fall'){} else SFX.pick();
  hudKey = '';
}

/* ======================================================================
   Asking the host. In solo (or when I am the host) the request runs right here.
   ====================================================================== */
const isHost = () => !mpActive() || MP.isHost;
function act(req){
  req.n = G.n;
  if(isHost()) hostReq(MP.id || 'me', req);
  else mpSend('req', req);
}
function giveTo(id, items, why){
  if(!mpActive() || id === MP.id || id === 'me'){ gotItems(items, why); return; }
  mpSend('got', { to:id, n:G.n, items, why });
}
function hostReq(from, q){
  if(q.n !== G.n || G.end) return;
  const i = q.i | 0;
  if(q.k === 'hit'){
    const t = W.TREES[i]; if(!t || WS.trees[i] <= 0 || WS.grow[i] < 1) return;
    const d = clamp(+q.d || 1, .5, 3);
    WS.trees[i] = Math.max(0, WS.trees[i] - d);
    (HT.hits[i] = HT.hits[i] || {})[from] = WS.wt;
    if(WS.trees[i] <= 0){
      HT.trees[i] = WS.wt + 70; WS.grow[i] = 0;
      giveTo(from, { wood:WOOD_PER_TREE }, 'fall');
      for(const id of Object.keys(HT.hits[i] || {})) if(id !== from && WS.wt - HT.hits[i][id] < 12) giveTo(id, { wood:1 }, 'fall');
      HT.hits[i] = {};
      mpFx({ k:'fall', i });
      fxFall(i);
    } else { if(from !== (MP.id || 'me')) mpFx({ k:'shake', i }); }
    wsChanged();
  }
  else if(q.k === 'pick'){ if(WS.picks[i]){ WS.picks[i] = 0; HT.picks[i] = WS.wt + 50; const p = W.PICKS[i]; giveTo(from, { [p.type]:1 }); wsChanged(); } }
  else if(q.k === 'bush'){ if(WS.bush[i] > 0){ WS.bush[i]--; HT.bush[i] = WS.wt + 30; giveTo(from, { berry:1 }); wsChanged(); } }
  else if(q.k === 'nut'){ if(WS.nuts[i] > 0){ WS.nuts[i]--; HT.nuts[i] = WS.wt + 45; giveTo(from, { coconut:1 }); wsChanged(); } }
  else if(q.k === 'crate'){
    const c = WS.crates.find(x => x.id === q.c); if(!c) return;
    WS.crates = WS.crates.filter(x => x !== c);
    const table = ['cloth', 'cloth', 'cloth', 'rope', 'rope', 'metal', 'metal', 'coconut', 'stone', 'leaf'], items = {};
    items[pick(['cloth', 'metal', 'cloth'])] = 1;
    if(Math.random() < .2) items.blaster = 1;
    for(let k = 0, n = 1 + (Math.random() < .6 ? 1 : 0); k < n; k++){ const it = pick(table); items[it] = (items[it] || 0) + 1; }
    giveTo(from, items, 'crate'); mpFx({ k:'crate', s:c.s }); fxCrate(c.s); wsChanged();
  }
  else if(q.k === 'build'){
    const w = q.w === 'tent' ? 'tent' : 'fire', r = RECIPES.find(x => x.shared === w);
    if(WS[w]){ giveTo(from, recipeCost(r, WS.diff)); return; }
    WS[w] = 1; mpFx({ k:'built', w }); fxBuilt(w); wsChanged();
  }
  else if(q.k === 'raft'){
    if(WS.ph !== 'build' || WS.raft.st >= 4) { giveTo(from, q.give || {}); return; }
    const need = raftCost(WS.raft.st, WS.diff), back = {};
    for(const k of Object.keys(q.give || {})){
      const n = clamp(q.give[k] | 0, 0, 40); if(!n || !ITEMS[k]) continue;
      const want = Math.max(0, (need[k] || 0) - (WS.raft.have[k] || 0)), use = Math.min(want, n);
      if(use) WS.raft.have[k] = (WS.raft.have[k] || 0) + use;
      if(n - use) back[k] = n - use;
    }
    if(Object.keys(back).length) giveTo(from, back);
    if(Object.keys(need).every(k => (WS.raft.have[k] || 0) >= need[k])){ WS.raft.st++; WS.raft.have = {}; mpFx({ k:'stage', st:WS.raft.st }); fxStage(WS.raft.st); }
    else mpFx({ k:'build' }), fxRaftBuild();
    wsChanged();
  }
  else if(q.k === 'board'){
    if(WS.raft.st < 4 || WS.ph !== 'build') return;
    if(!WS.aboard.includes(from)){ WS.aboard.push(from); if(from === (MP.id || 'me') || !HT.boardT) HT.boardT = WS.wt; }
    wsChanged();
  }
  else if(q.k === 'launch'){ if(WS.raft.st >= 4 && WS.ph === 'build' && WS.aboard.length) startSail(); }
  else if(q.k === 'sleep'){
    if(!isNight()) return;
    WS.d = .01; WS.dn++; mpFx({ k:'sleep', dn:WS.dn }); fxSleep(); wsChanged();
  }
  else if(q.k === 'fix'){ if(WS.ph === 'sail'){ WS.raft.hp = Math.min(100, WS.raft.hp + 25); mpFx({ k:'fixed' }); fxFixed(); } }
  else if(q.k === 'zap') hostZap(from, q);
  else if(q.k === 'pad'){ if(WS.ph === 'sail') WS.sail.boost = Math.min(3, (WS.sail.boost || 0) + .55); }
}
function wsChanged(){ HT.dirty = true; wDirty = true; }

/* ---------- host: the world keeps living (things grow back, crates, the day) ---------- */
function hostTick(dt){
  const D = DIFF[okDiff(WS.diff)];
  WS.wt += dt;
  if(WS.ph === 'build' && !G.intro){
    const before = WS.d; WS.d = (WS.d + dt / D.day) % 1; if(WS.d < before){ WS.dn++; wsChanged(); }
  }
  const t = WS.wt;
  W.TREES.forEach((_, i) => {
    if(WS.trees[i] <= 0 && HT.trees[i] && t > HT.trees[i]){ WS.trees[i] = TREE_HP; WS.grow[i] = 0.001; HT.trees[i] = 0; wsChanged(); }
    else if(WS.trees[i] > 0 && WS.grow[i] < 1){ WS.grow[i] = Math.min(1, WS.grow[i] + dt / 8); if(WS.grow[i] >= 1) wsChanged(); }
  });
  W.PICKS.forEach((_, i) => { if(!WS.picks[i] && HT.picks[i] && t > HT.picks[i]){ WS.picks[i] = 1; HT.picks[i] = 0; wsChanged(); } });
  W.BUSHES.forEach((b, i) => { if(WS.bush[i] < b.max && HT.bush[i] && t > HT.bush[i]){ WS.bush[i]++; HT.bush[i] = WS.bush[i] < b.max ? t + 30 : 0; wsChanged(); } });
  W.PALMS.forEach((p, i) => { if(WS.nuts[i] < p.max && HT.nuts[i] && t > HT.nuts[i]){ WS.nuts[i]++; HT.nuts[i] = WS.nuts[i] < p.max ? t + 45 : 0; wsChanged(); } });
  if(WS.ph === 'build'){
    if(!HT.crate) HT.crate = t + 6;
    if(t > HT.crate){ HT.crate = t + D.crate; if(WS.crates.length < 4) spawnCrate(); }
    // all aboard → off we go (or the host waits a bit for slow friends)
    if(WS.raft.st >= 4 && WS.aboard.length){
      const kids = mpActive() ? MP.players.map(p => p.id) : ['me'];
      WS.aboard = WS.aboard.filter(id => kids.includes(id));
      if(kids.every(id => WS.aboard.includes(id)) || (HT.boardT && t - HT.boardT > 25 && WS.aboard.length)) startSail();
    }
  }
  if(WS.ph === 'sail') hostSail(dt);
  HT.snap -= dt;
  if(mpActive() && (HT.snap <= 0 || (HT.dirty && HT.snap < .85))){ HT.snap = 1; HT.dirty = false; mpSend('ws', packWS()); }
  else if(!mpActive()) HT.dirty = false;
}
function spawnCrate(){
  const used = new Set(WS.crates.map(c => c.s)), free = W.CRATE_SPOTS.map((_, i) => i).filter(i => !used.has(i));
  if(!free.length) return;
  const s = pick(free); WS.crates.push({ id:++WS.cid, s }); wsChanged();
  if(G.started) popText('📦 ' + L('صندوق وصل عالشط!', 'A crate washed ashore!', 'Kıyıya bir sandık vurdu!'));
}
function packWS(){
  return { n:WS.n, diff:WS.diff, wt:r2(WS.wt), d:Math.round(WS.d * 1e4) / 1e4, dn:WS.dn, tr:WS.trees.map(v => Math.round(v * 2) / 2), gr:WS.grow.map(v => Math.round(v * 100) / 100), pk:WS.picks.join(''),
    bu:WS.bush.join(''), nu:WS.nuts.join(''), cr:WS.crates.map(c => [c.id, c.s]), cid:WS.cid, fi:WS.fire, te:WS.tent, ra:{ st:WS.raft.st, have:WS.raft.have, hp:Math.round(WS.raft.hp) }, ph:WS.ph, ab:WS.aboard.slice(0, 4), lz:WS.laser, tg:WS.tags,
    sl:{ x:r2(WS.sail.x), z:r2(WS.sail.z), h:r2(WS.sail.h), p:r2(WS.sail.p) } };
}
const numIn = (v, a, b, d = 0) => { v = +v; return isFinite(v) ? clamp(v, a, b) : d; };
function unpackWS(p){
  if(!p || typeof p !== 'object' || (p.n | 0) !== G.n) return;
  const nT = W.TREES.length;
  WS.diff = okDiff(p.diff); WS.n = p.n | 0;
  const wt = numIn(p.wt, 0, 1e6); if(Math.abs(wt - WS.wt) > 1.5) WS.wt = wt; else WS.wt = lerp(WS.wt, wt, .3);
  const d = numIn(p.d, 0, 1); if(Math.abs(angDiff(d * 6.283, WS.d * 6.283)) > .05) WS.d = d;
  WS.dn = clamp(p.dn | 0, 1, 999);
  if(Array.isArray(p.tr)) for(let i = 0; i < nT; i++){ const v = numIn(p.tr[i], 0, TREE_HP, TREE_HP); if(v > 0 && WS.trees[i] <= 0){} WS.trees[i] = v; }
  if(Array.isArray(p.gr)) for(let i = 0; i < nT; i++) WS.grow[i] = numIn(p.gr[i], 0, 1, 1);
  if(typeof p.pk === 'string') for(let i = 0; i < W.PICKS.length; i++) WS.picks[i] = p.pk[i] === '1' ? 1 : 0;
  if(typeof p.bu === 'string') for(let i = 0; i < W.BUSHES.length; i++) WS.bush[i] = clamp(+p.bu[i] || 0, 0, 3);
  if(typeof p.nu === 'string') for(let i = 0; i < W.PALMS.length; i++) WS.nuts[i] = clamp(+p.nu[i] || 0, 0, 2);
  if(Array.isArray(p.cr)) WS.crates = p.cr.slice(0, W.CRATE_MAX).filter(c => Array.isArray(c)).map(c => ({ id:c[0] | 0, s:clamp(c[1] | 0, 0, W.CRATE_SPOTS.length - 1) }));
  WS.fire = p.fi ? 1 : 0; WS.tent = p.te ? 1 : 0; WS.laser = p.lz ? 1 : 0;
  if(p.tg && typeof p.tg === 'object'){ const t = {}; for(const k of Object.keys(p.tg).slice(0, 8)) if(/^[a-z0-9]{1,24}$/i.test(k)) t[k] = clamp(p.tg[k] | 0, 0, 999); WS.tags = t; }
  if(p.ra && typeof p.ra === 'object'){ WS.raft.st = clamp(p.ra.st | 0, 0, 4); WS.raft.hp = numIn(p.ra.hp, 0, 100, 100); const h = {}; if(p.ra.have && typeof p.ra.have === 'object') for(const k of Object.keys(p.ra.have)) if(ITEMS[k]) h[k] = clamp(p.ra.have[k] | 0, 0, 99); WS.raft.have = h; }
  if(['build', 'sail', 'end'].includes(p.ph)){ if(p.ph === 'sail' && WS.ph !== 'sail') beginSailLocal(); WS.ph = p.ph; }
  WS.aboard = Array.isArray(p.ab) ? p.ab.filter(x => typeof x === 'string').slice(0, 4) : [];
  if(p.sl && WS.ph !== 'sail'){ WS.sail.x = numIn(p.sl.x, -500, 500); WS.sail.z = numIn(p.sl.z, -500, 500); WS.sail.h = numIn(p.sl.h, -50, 50); }
  hudKey = ''; worldDirty();
}

/* ---------- visual effects that everyone sees ---------- */
function mpFx(p){ if(mpActive() && MP.isHost) mpSend('ev', Object.assign({ k:'fx', n:G.n }, { f:p })); }
function onFx(f){
  if(!f || typeof f !== 'object') return;
  const i = f.i | 0;
  if(f.k === 'fall' && W.TREES[i]){ WS.trees[i] = 0; WS.grow[i] = 0; fxFall(i); }
  else if(f.k === 'shake' && W.TREES[i]){ W.TREES[i].shake = 1; W.dirty.trees = true; if(near(W.TREES[i], 14)) SFX.chop(); }
  else if(f.k === 'crate') fxCrate(f.s | 0);
  else if(f.k === 'built'){ WS[f.w === 'tent' ? 'tent' : 'fire'] = 1; fxBuilt(f.w); }
  else if(f.k === 'stage'){ WS.raft.st = clamp(f.st | 0, 0, 4); WS.raft.have = {}; fxStage(WS.raft.st); }
  else if(f.k === 'build') fxRaftBuild();
  else if(f.k === 'sleep'){ WS.d = .01; WS.dn = clamp(f.dn | 0, 1, 999); fxSleep(); }
  else if(f.k === 'fixed') fxFixed();
  else if(f.k === 'rhit') fxRaftHit(f.s | 0);
  else if(f.k === 'beam'){ if(f.by !== MP.id) showBeam(numIn(f.x, -500, 500), numIn(f.y, -20, 60), numIn(f.z, -500, 500), numIn(f.f, -50, 50), numIn(f.len, 1, 20), f.c | 0); }
  else if(f.k === 'tag' && typeof f.by === 'string' && typeof f.to === 'string'){ if(f.tags && typeof f.tags === 'object'){ WS.tags[f.by] = clamp(f.tags | 0, 0, 999); } fxTag(f.by, f.to, clamp(f.cnt | 0, 0, 999)); }
  else if(f.k === 'flee') fxFlee(f.s | 0);
  worldDirty();
}
const near = (o, r) => Math.hypot(o.x - P.x, o.z - P.z) < r;
function fxFall(i){ const t = W.TREES[i]; burst(t.x, t.y + 2.5, t.z, 18, LEAVES, 4, 1.3, 9, 2); burst(t.x, t.y + .6, t.z, 10, CHIPS, 3, 1, 12, 2); if(near(t, 25)) SFX.fall(); W.dirty.trees = true; }
function fxCrate(s){ const c = W.CRATE_SPOTS[s]; if(!c) return; burst(c.x, c.y + .7, c.z, 14, CHIPS, 3.5, 1, 12, 3); burst(c.x, c.y + 1, c.z, 10, GOLD, 3, .9, 6, 2); }
function fxBuilt(w){ const o = w === 'tent' ? W.TENT : W.FIRE; burst(o.x, o.y + 1, o.z, 24, CONFETTI, 4, 1, 8, 3); SFX.craft();
  popText(w === 'tent' ? '⛺ ' + L('صار عنّا خيمة!', 'We have a tent!', 'Çadırımız var!') : '🔥 ' + L('ولّعنا نار المخيم!', 'The campfire is lit!', 'Kamp ateşi yandı!')); }
function fxStage(st){
  const R = W.RAFT; burst(R.x, .8, R.z, 30, CONFETTI, 5, 1.1, 8, 4); SFX.stage();
  if(st >= 4){ banner('🛶 ' + L('الطوف جاهز!', 'The raft is ready!', 'Sal hazır!'), 'long'); say('⛵ ' + L('اركبوا كلكن عالطوف (A) ويلا عالسفينة!', 'Everyone get on the raft (A) and sail to the ship!', 'Herkes sala binsin (A) ve gemiye gidelim!'), 6000); }
  else banner(RAFT_ST[st - 1].e + ' ' + L('مرحلة ', 'Stage ', 'Aşama ') + N(st) + '/' + N(4) + ' ✅', 'long');
}
function fxRaftBuild(){ const R = W.RAFT; burst(R.x, .8, R.z, 10, CHIPS, 3, 1, 12, 2); if(near(R, 20)) SFX.build(); }
function fxSleep(){ const el = $('#sleepfx'); el.classList.add('on'); SFX.sleep(); G.energy = Math.min(100, G.energy + 30); setTimeout(() => { el.classList.remove('on'); SFX.morning(); popText('☀️ ' + L('صباح الخير! يوم ', 'Good morning! Day ', 'Günaydın! Gün ') + N(WS.dn)); }, 1600); }
function fxFixed(){ const r = raftPos(); burst(r.x, .9, r.z, 12, CHIPS, 3, 1, 12, 2); SFX.fix(); }
function fxRaftHit(s){ const r = raftPos(); burst(r.x, .5, r.z, 20, SPLASH, 5, 1.2, 12, 3); SFX.boing(); cam.shake = .5; raftWob = 1; popText('🦈 ' + L('بوينغ! القرش دفش الطوف', 'Boing! A shark bumped the raft', 'Boing! Köpekbalığı sala çarptı')); void s; }
let raftWob = 0;

/* ======================================================================
   Applying the shared world to the scene
   ====================================================================== */
let wDirty = true;
function worldDirty(){ wDirty = true; }
function applyWorld(){
  if(!wDirty) return; wDirty = false;
  W.TREES.forEach((t, i) => { const hp = WS.trees[i], g = WS.grow[i]; if(t.hp !== hp || t.grow !== g){ t.hp = hp; t.grow = hp > 0 ? g : 0; t.circ.r = hp > 0 && g > .5 ? .55 : .3; W.dirty.trees = true; } });
  W.PICKS.forEach((p, i) => { const on = !!WS.picks[i]; if(p.on !== on){ p.on = on; if(on) p.pop = 0; W.dirty.picks = true; } });
  W.BUSHES.forEach((b, i) => { if(b.n !== WS.bush[i]){ b.n = WS.bush[i]; W.dirty.berries = true; } });
  W.PALMS.forEach((p, i) => { p.nuts = WS.nuts[i]; });
  W.fireGrp.visible = !!WS.fire; W.fireGhost.visible = !WS.fire && G.started;
  W.tentGrp.visible = !!WS.tent; W.tentGhost.visible = !WS.tent && G.started && !!WS.fire;
  W.fireCirc.r = WS.fire ? .9 : 0; W.tentCirc.r = WS.tent ? 1.4 : 0;
  const st = WS.raft.st, need = st < 4 ? raftCost(st, WS.diff) : null;
  let k = 0; if(need){ let a = 0, b = 0; for(const x of Object.keys(need)){ a += Math.min(need[x], WS.raft.have[x] || 0); b += need[x]; } k = b ? a / b : 0; }
  W.drawRaft(st, k);
}
const crateVis = [];
function drawCrates(t){ crateVis.length = 0; for(const c of WS.crates) crateVis.push({ s:c.s, pop:null }); W.drawCrates(crateVis, t); }

/* ======================================================================
   What can I do here? (the A button)
   ====================================================================== */
function findTarget(){
  if(WS.ph === 'sail') return { k:'paddle' };
  if(G.fishing) return null;
  const fx = Math.sin(P.f), fz = Math.cos(P.f);
  let best = null, bs = 1e9;
  const consider = (o, kind, i, reach, extra) => {
    const dx = o.x - P.x, dz = o.z - P.z, d = Math.hypot(dx, dz); if(d > reach) return;
    const face = d > .01 ? (dx * fx + dz * fz) / d : 1, s = d - face * .6 + (extra || 0);
    if(s < bs){ bs = s; best = { k:kind, i, o, d }; }
  };
  if(!P.swim){
    W.TREES.forEach((t, i) => { if(WS.trees[i] > 0 && WS.grow[i] >= 1) consider(t, 'tree', i, 2.3); });
    W.PICKS.forEach((p, i) => { if(WS.picks[i]) consider(p, 'pick', i, 1.9, -.7); });
    W.BUSHES.forEach((b, i) => { if(WS.bush[i] > 0) consider(b, 'bush', i, 2.2); });
    W.PALMS.forEach((p, i) => { if(WS.nuts[i] > 0) consider(p, 'palm', i, 2.0, .2); });
    WS.crates.forEach(c => { const s = W.CRATE_SPOTS[c.s]; if(s) consider(s, 'crate', c.id, 2.2, -.4); });
    if(WS.fire && invCount('fish') > 0) consider(W.FIRE, 'cook', 0, 2.6, -.2);
    if(WS.tent && isNight()) consider(W.TENT, 'sleep', 0, 3, -.2);
    if(WS.ph === 'build'){
      const rd = Math.hypot(W.RAFT.x - P.x, W.RAFT.z - P.z);
      if(rd < 5){
        if(WS.raft.st >= 4){ const me = MP.id || 'me'; if(!WS.aboard.includes(me)) consider(W.RAFT, 'board', 0, 5, -1); else if(isHost() && WS.aboard.length) consider(W.RAFT, 'launch', 0, 5, -1); }
        else { const need = raftCost(WS.raft.st, WS.diff); if(Object.keys(need).some(k => invCount(k) > 0 && (WS.raft.have[k] || 0) < need[k])) consider(W.RAFT, 'raft', 0, 5, -1); else consider(W.RAFT, 'raftinfo', 0, 5, 1.5); }
      }
    }
  }
  if(!best && G.rod && waterAhead()) best = { k:'fish' };
  return best;
}
function waterAhead(){
  for(const d of [1.4, 2.4]){ const x = P.x + Math.sin(P.f) * d, z = P.z + Math.cos(P.f) * d, w = W.waterAt(x, z), g = W.terr(x, z); if(w > g + .25) return true; }
  return P.wade || P.swim;
}
const A_ICON = { tree:'🪓', pick:'✋', bush:'🍓', palm:'🥥', crate:'📦', cook:'🍢', sleep:'😴', raft:'🔨', raftinfo:'🛶', board:'🛶', launch:'⛵', fish:'🎣', paddle:'🚣' };
function aLabel(t){
  if(!t) return '';
  return { tree:L('اقطع', 'Chop', 'Kes'), pick:L('لمّ', 'Pick', 'Al'), bush:L('توت', 'Berries', 'Çilek'), palm:L('هزّ', 'Shake', 'Salla'), crate:L('افتح', 'Open', 'Aç'),
    cook:L('اشوي', 'Grill', 'Pişir'), sleep:L('نام', 'Sleep', 'Uyu'), raft:L('ابني', 'Build', 'Yap'), raftinfo:L('الطوف', 'Raft', 'Sal'), board:L('اركب', 'Get on', 'Bin'),
    launch:L('انطلق', 'Go!', 'Başla'), fish:L('صيد', 'Fish', 'Balık'), paddle:L('جدّف', 'Paddle', 'Kürek') }[t.k] || '';
}
function doA(){
  if(P.act && P.actT < P.actD * .7) return;
  const t = findTarget();
  if(!t){ SFX.nope(); return; }
  const me = MP.id || 'me';
  if(t.k === 'tree'){
    startAct('chop', .42); P.f = Math.atan2(t.o.x - P.x, t.o.z - P.z);
    setTimeout(() => { if(G.end) return; SFX.chop(); const tr = W.TREES[t.i]; tr.shake = 1; W.dirty.trees = true; burst(tr.x - Math.sin(P.f) * .4, tr.y + 1.1, tr.z - Math.cos(P.f) * .4, 6, CHIPS, 2.5, .8, 12, 1.5); act({ k:'hit', i:t.i, d:AXE_DMG[G.axe] }); }, 190);
    G.flags.chopTry = 1;
  }
  else if(t.k === 'pick'){ startAct('pick', .4); const p = W.PICKS[t.i]; act({ k:'pick', i:t.i }); if(!isHost()){ WS.picks[t.i] = 0; worldDirty(); } burst(p.x, p.y + .3, p.z, 6, p.type === 'stone' || p.type === 'metal' ? STONE : LEAVES, 2, .7, 10, 1.5); }
  else if(t.k === 'bush'){ startAct('pick', .4); const b = W.BUSHES[t.i]; act({ k:'bush', i:t.i }); burst(b.x, b.y + .9, b.z, 6, BERRY, 2, .7, 10, 1.5); }
  else if(t.k === 'palm'){ startAct('chop', .42); const p = W.PALMS[t.i]; W.nutPos(p, Math.max(0, WS.nuts[t.i] - 1)); const v = _v.clone(); burst(v.x, v.y, v.z, 8, LEAVES, 2, .8, 6, 1); SFX.chop(); act({ k:'nut', i:t.i }); }
  else if(t.k === 'crate'){ startAct('pick', .45); act({ k:'crate', c:t.i }); if(!isHost()){ WS.crates = WS.crates.filter(c => c.id !== t.i); } }
  else if(t.k === 'cook'){ if(invTake('fish', 1)){ invAdd('cooked', 1); startAct('pick', .5); burst(W.FIRE.x, W.FIRE.y + 1.2, W.FIRE.z, 10, GOLD, 2, .8, 4, 2); SFX.craft(); popText('🍢 ' + L('سمكة مشوية!', 'Grilled fish!', 'Izgara balık!')); G.flags.cook = 1; } }
  else if(t.k === 'sleep'){ act({ k:'sleep' }); }
  else if(t.k === 'raft'){
    const need = raftCost(WS.raft.st, WS.diff), give = {};
    for(const k of Object.keys(need)){ const n = Math.min(invCount(k), need[k] - (WS.raft.have[k] || 0)); if(n > 0){ invTake(k, n); give[k] = n; } }
    if(Object.keys(give).length){ startAct('pick', .45); act({ k:'raft', give }); if(!isHost()){ for(const k of Object.keys(give)) WS.raft.have[k] = (WS.raft.have[k] || 0) + give[k]; worldDirty(); } }
  }
  else if(t.k === 'raftinfo'){ showRaftInfo(); }
  else if(t.k === 'board'){ act({ k:'board' }); if(!isHost() && !WS.aboard.includes(me)) WS.aboard.push(me); SFX.join(); }
  else if(t.k === 'launch'){ act({ k:'launch' }); }
  else if(t.k === 'fish'){ startFishing(); }
  else if(t.k === 'paddle'){ P.paddle = 1; act({ k:'pad' }); SFX.paddle(); const r = raftPos(); burst(r.x + Math.cos(WS.sail.h) * 2.3, .2, r.z - Math.sin(WS.sail.h) * 2.3, 5, SPLASH, 2, .7, 10, 1.5); }
}
function startAct(a, d){ P.act = a; P.actT = 0; P.actD = d; }
function startFishing(){
  if(G.fishing) return;
  G.fishing = { t:0, need:1.6 + Math.random() * 1.6 }; $('#fishing').hidden = false; SFX.cast(); startAct('fish', 99);
}
function stepFishing(dt){
  if(!G.fishing) return;
  G.fishing.t += dt;
  if(inp.m > .3 || P.swim && false){ stopFishing(); return; }
  if(G.fishing.t >= G.fishing.need){ stopFishing(); const x = P.x + Math.sin(P.f) * 2, z = P.z + Math.cos(P.f) * 2; burst(x, .3, z, 12, SPLASH, 3, 1, 12, 3); SFX.fish(); gotItems({ fish:1 }); G.flags.fish = 1; }
}
function stopFishing(){ G.fishing = null; $('#fishing').hidden = true; if(P.act === 'fish') P.act = null; }

/* ---------- eating ---------- */
const FOOD_ORDER = ['berry', 'coconut', 'fish', 'cooked'];
function eatBest(){
  if(G.energy > 97){ popText('😋 ' + L('شبعان!', "I'm full!", 'Tokum!')); return false; }
  const want = 100 - G.energy;
  let best = null, bs = 1e9;
  for(const k of FOOD_ORDER) if(invCount(k) > 0){ const s = Math.abs(ITEMS[k].food - want) + (k === 'fish' && WS.fire ? 15 : 0); if(s < bs){ bs = s; best = k; } }
  if(!best){ SFX.nope(); say('🍓 ' + L('ما معك أكل! لمّ توت من الشجيرات أو جوز هند من النخل', 'No food! Pick berries from bushes or coconuts from palms', 'Yiyecek yok! Çalılardan çilek ya da palmiyelerden hindistan cevizi topla'), 3500); return false; }
  return eat(best);
}
function eat(k){
  if(!ITEMS[k] || !ITEMS[k].food || !invTake(k, 1)) return false;
  G.energy = Math.min(100, G.energy + ITEMS[k].food); G.flags.ate = 1;
  SFX.eat(); startAct('eat', .8); popText(ITEMS[k].e + ' ' + L('يمّ!', 'Yum!', 'Nefis!') + ' +' + N(ITEMS[k].food));
  burst(P.x, P.y + 1.3, P.z, 6, k === 'berry' ? BERRY : GOLD, 1.5, .6, 4, 1);
  hudKey = ''; return true;
}
$('#hudFood').addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); if(state === 'play') eatBest(); });

/* ---------- crafting ---------- */
function canCraft(r){
  if(r.shared && WS[r.shared]) return false;
  if(r.tool === 'axe' && G.axe >= r.lvl) return false;
  if(r.need === 'axe2' && G.axe < 2) return false;
  if(r.tool === 'rod' && G.rod) return false;
  if(r.tool === 'bag' && G.bag >= BAG1) return false;
  if(r.tool === 'blaster' && G.blaster) return false;
  return hasAll(recipeCost(r, WS.diff));
}
const recipeDone = r => (r.shared && WS[r.shared]) || (r.tool === 'axe' && G.axe >= r.lvl) || (r.tool === 'rod' && G.rod) || (r.tool === 'bag' && G.bag >= BAG1) || (r.tool === 'blaster' && G.blaster);
function craft(id){
  const r = RECIPES.find(x => x.id === id); if(!r || !canCraft(r)){ SFX.nope(); return false; }
  if(r.shared && Math.hypot(W.CAMP.x - P.x, W.CAMP.z - P.z) > 14 && !testNoWalk){ toast('🏕️ ' + L('روح عالمخيم جنب الطيارة لتبني هون', 'Go to the camp next to the plane to build this', 'Bunu kurmak için uçağın yanındaki kampa git')); SFX.nope(); return false; }
  payAll(recipeCost(r, WS.diff));
  if(r.give){ for(const k of Object.keys(r.give)) invAdd(k, r.give[k]); G.flags.rope = 1; }
  if(r.tool === 'axe'){ G.axe = r.lvl; setAxe(heroM, G.axe); }
  if(r.tool === 'rod') G.rod = true;
  if(r.tool === 'blaster'){ G.blaster = true; G.bat = 5; }
  if(r.tool === 'bag'){ G.bag = BAG1; while(G.inv.length < G.bag) G.inv.push(null); }
  if(r.shared){ act({ k:'build', w:r.shared }); if(!isHost()){ WS[r.shared] = 1; worldDirty(); } }
  G.stats.crafted++; G.flags.craft = 1;
  SFX.craft(); burst(P.x, P.y + 1.2, P.z, 16, GOLD, 3, 1, 6, 2);
  if(!r.shared) popText(r.e + ' ' + L(...r.n) + ' ✨');
  hudKey = ''; return true;
}
let testNoWalk = false, camLockV = null;

/* ======================================================================
   Moving: walk, jump, wade, swim; the sharks send you back to the beach
   ====================================================================== */
const WALK = 5.4, GRAV = 22, JUMP_V = 8.2, DEEP = 1.27;
function pushCircles(o, r, y){
  const test = c => { if(!c.r || y > c.top) return; const dx = o.x - c.x, dz = o.z - c.z, d = Math.hypot(dx, dz), min = c.r + r; if(d < min && d > 1e-4){ const k = (min - d) / d; o.x += dx * k; o.z += dz * k; } };
  for(const c of W.circlesNear(o.x, o.z)) test(c);
  test(W.fireCirc); test(W.tentCirc);
  if(WS.ph === 'build') test({ x:W.RAFT.x, z:W.RAFT.z, r:WS.raft.st > 0 ? 2.2 : 0, top:2 });
}
function stepWalk(dt){
  readInput(dt);
  const hungry = G.energy <= 0, slow = (hungry ? .55 : 1) * (P.swim ? .62 : P.wade ? .8 : 1) * (G.fishing ? 0 : 1);
  const sp = WALK * slow, k = 1 - Math.exp(-(P.gr ? 12 : 4) * dt);
  P.vx = lerp(P.vx, inp.x * sp, k); P.vz = lerp(P.vz, inp.z * sp, k);
  if(P.push > 0){ P.push -= dt; P.vx = P.px * (P.push + .2) * 10; P.vz = P.pz * (P.push + .2) * 10; }
  const o = { x:clamp(P.x + P.vx * dt, -140, 140), z:clamp(P.z + P.vz * dt, -140, 140) };
  pushCircles(o, .42, P.y);
  P.x = o.x; P.z = o.z;
  if(wantB && P.gr && !P.swim){ P.vy = JUMP_V; P.gr = false; SFX.jump(); P.sq = -.12; }
  wantB = false;
  const g = W.terr(P.x, P.z), wl = W.waterAt(P.x, P.z), depth = wl - g;
  const wasSwim = P.swim;
  P.swim = depth > 1.05; P.wade = !P.swim && depth > .3;
  const floor = P.swim ? wl - .78 + Math.sin(P.t * 3) * .05 : g;
  P.vy -= GRAV * dt; let ny = P.y + P.vy * dt;
  if(ny <= floor || (P.gr && P.vy <= 0 && ny > floor - .45)){ if(!P.gr && P.vy < -6){ SFX.land(); P.sq = .14; burst(P.x, g + .1, P.z, 5, SAND, 1.6, .9, 6, .8); } ny = P.swim ? lerp(P.y, floor, Math.min(1, dt * 8)) : floor; P.vy = 0; P.gr = true; }
  else P.gr = false;
  P.y = ny;
  if(P.swim && !wasSwim){ SFX.splash(); burst(P.x, wl, P.z, 12, SPLASH, 3, 1, 12, 2); if(!G.flags.swam){ G.flags.swam = 1; say('🏊 ' + L('عم تسبح! انتبه، القروش ما بتخلّيك تبعد كتير', "You're swimming! Careful, the sharks won't let you go far", 'Yüzüyorsun! Dikkat, köpekbalıkları uzağa gitmene izin vermez'), 4000); } }
  if((P.swim || P.wade) && inp.m > .2 && Math.random() < dt * 6) burst(P.x, wl + .05, P.z, 2, SPLASH, 1.5, .7, 10, 1);
  if(P.swim && inp.m > .2 && Math.random() < dt * 1.5) SFX.swim();
  if(inp.m > 0 && P.push <= 0) P.f += angDiff(Math.atan2(inp.x, inp.z), P.f) * Math.min(1, 12 * dt);
  P.m = Math.min(1, Math.hypot(P.vx, P.vz) / WALK);
  // too far out: a friendly shark bumps you back
  G.bumpCd -= dt;
  if(W.distN(P.x, P.z) > DEEP && G.bumpCd <= 0 && P.push <= 0) sharkBump();
}
let bumpShark = null;
function sharkBump(){
  const r = Math.hypot(P.x, P.z) || 1;
  P.px = -P.x / r; P.pz = -P.z / r; P.push = .9; G.bumpCd = 1.6;
  // the nearest shark dashes in from the open sea
  let best = 0, bd = 1e9; W.SHARKS.forEach((s, i) => { const d = Math.hypot(s.x - P.x, s.z - P.z); if(d < bd){ bd = d; best = i; } });
  bumpShark = { i:best, t:0, x0:W.SHARKS[best].x, z0:W.SHARKS[best].z, tx:P.x - P.px * 1.6, tz:P.z - P.pz * 1.6 };
  SFX.boing(); cam.shake = .45;
  burst(P.x, .3, P.z, 22, SPLASH, 5, 1.2, 12, 4);
  popText('🦈 ' + L('بوينغ! القرش رجّعك عالشط', 'Boing! The shark sent you back', 'Boing! Köpekbalığı seni kıyıya geri yolladı'));
  G.flags.shark = (G.flags.shark || 0) + 1;
}
function stepHunger(dt){
  if(WS.ph !== 'build' || G.intro) return;
  const D = DIFF[okDiff(WS.diff)], before = G.energy;
  G.energy = Math.max(0, G.energy - dt * 100 / 300 * D.hunger * (P.swim ? 1.5 : 1));
  if(before > 30 && G.energy <= 30) say('🍗 ' + L('جعت! كول شي (اكبس على شريط الأكل)', "I'm hungry! Eat something (tap the food bar)", 'Acıktım! Bir şey ye (yemek çubuğuna dokun)'), 4500);
  if(before > 0 && G.energy <= 0) popText('🐢 ' + L('جوعان… عم تمشي على مهلك', 'Hungry… walking slowly', 'Aç… yavaş yürüyorsun'));
  if(Math.floor(before) !== Math.floor(G.energy)) hudKey = '';
}

/* ======================================================================
   Sailing: the raft goes to the rescue ship; sharks may bump it
   ====================================================================== */
const SEATS = [[-.9, .85, .5], [.9, .85, .5], [-.9, .85, -.9], [.9, .85, -.9]];
const raftPos = () => ({ x:W.raft.position.x, z:W.raft.position.z });
function startSail(){
  if(WS.ph !== 'build') return;
  WS.ph = 'sail'; WS.sail = { x:W.RAFT.x, z:W.RAFT.z, h:W.RAFT.a, p:0, sp:0, boost:0, lat:0 };
  HT.shark = WS.wt + 5; HT.attacks = [];
  mpSend('ev', { k:'sail', n:G.n, ab:WS.aboard });
  beginSailLocal(); wsChanged();
}
function beginSailLocal(){
  if(sailOn) return;
  sailOn = true; stopFishing(); WS.ph = 'sail';
  banner('⛵ ' + L('يلّا عالسفينة!', 'To the ship!', 'Gemiye!'), 'long'); SFX.horn();
  say('🚣 ' + L('A = جدّف، الجويستك = لفّ، 🔨 = صلّح الطوف بالخشب', 'A = paddle, joystick = steer, 🔨 = repair the raft with wood', 'A = kürek çek, joystick = dön, 🔨 = salı odunla tamir et'), 6000);
  snapCam = true; hudKey = '';
}
let sailOn = false;
const SHIP_DIST = () => Math.hypot(W.SHIP.x - W.RAFT.x, W.SHIP.z - W.RAFT.z);
function hostSail(dt){
  const S = WS.sail, D = DIFF[okDiff(WS.diff)];
  const toShip = Math.atan2(W.SHIP.x - S.x, W.SHIP.z - S.z);
  // steering: average of every kid's joystick
  let st = inp.sx, n = 1; if(mpActive()) for(const r of RM.values()) if(r.seen){ st += r.sx || 0; n++; }
  st /= n;
  S.h += angDiff(toShip, S.h) * Math.min(1, dt * .25) - st * .7 * dt;
  S.h = toShip + clamp(angDiff(S.h, toShip), -.6, .6);
  S.boost = Math.max(0, (S.boost || 0) - dt);
  const hpK = .55 + .45 * WS.raft.hp / 100;
  S.sp = lerp(S.sp || 0, (4.6 + Math.min(S.boost, 2) * 2.2) * hpK, Math.min(1, dt * 1.5));
  S.x += Math.sin(S.h) * S.sp * dt; S.z += Math.cos(S.h) * S.sp * dt;
  const left = Math.hypot(W.SHIP.x - S.x, W.SHIP.z - S.z);
  S.p = clamp(1 - (left - 14) / (SHIP_DIST() - 14), 0, 1);
  // sharks: now and then one swims at the raft; steering away dodges it
  if(WS.wt > HT.shark && left > 30){
    HT.shark = WS.wt + D.sharkGap * (.8 + Math.random() * .5);
    const side = Math.random() < .5 ? -1 : 1, ahead = 9 + Math.random() * 6;
    const sx = S.x + Math.sin(S.h) * ahead + Math.cos(S.h) * side * 11, sz = S.z + Math.cos(S.h) * ahead - Math.sin(S.h) * side * 11;
    const free = [0, 1, 2].filter(k => !(W.SHARKS[k].flee > 0) && !HT.attacks.some(a => a.s === k));
    if(free.length) HT.attacks.push({ s:free[0], x:sx, z:sz, t:0, dur:2.6, hit:false });
  }
  HT.attacks = HT.attacks.filter(a => {
    a.t += dt;
    const k = a.t / a.dur, tx = S.x, tz = S.z;
    a.cx = lerp(a.x, tx, Math.min(1, k)); a.cz = lerp(a.z, tz, Math.min(1, k));
    if(k >= .92 && !a.hit){ a.hit = true; const d = Math.hypot(a.cx - S.x, a.cz - S.z); if(d < 3.6){ WS.raft.hp = Math.max(10, WS.raft.hp - D.sharkDmg); mpFx({ k:'rhit', s:a.s }); fxRaftHit(a.s); } }
    return a.t < a.dur + 1.2;
  });
  if(left < 14 && WS.ph === 'sail'){ WS.ph = 'end'; hostEnd(); }
  HT.sl -= dt;
  if(mpActive() && HT.sl <= 0){ HT.sl = .1; mpSend('sl', { n:G.n, x:r2(S.x), z:r2(S.z), h:r2(S.h), p:r2(S.p), hp:Math.round(WS.raft.hp), sh:HT.attacks.map(a => [a.s, r2(a.cx || a.x), r2(a.cz || a.z), r2(a.t / a.dur)]) }); }
}
let netAttacks = [];
function onSail(p){
  if((p.n | 0) !== G.n || isHost()) return;
  if(WS.ph === 'build') beginSailLocal();
  WS.ph = WS.ph === 'end' ? 'end' : 'sail';
  const S = WS.sail;
  S.tx = numIn(p.x, -500, 500); S.tz = numIn(p.z, -500, 500); S.th = numIn(p.h, -50, 50); S.p = numIn(p.p, 0, 1); WS.raft.hp = numIn(p.hp, 0, 100, 100);
  if(S.tx2 == null){ S.x = S.tx; S.z = S.tz; S.h = S.th; } S.tx2 = 1;
  netAttacks = Array.isArray(p.sh) ? p.sh.slice(0, 6).filter(a => Array.isArray(a)).map(a => ({ s:clamp(a[0] | 0, 0, 2), cx:numIn(a[1], -500, 500), cz:numIn(a[2], -500, 500), k:numIn(a[3], 0, 2) })) : [];
  hudKey = '';
}
function stepSailLocal(dt){
  const S = WS.sail;
  if(!isHost() && S.tx != null){ const a = 1 - Math.exp(-6 * dt); S.x = lerp(S.x, S.tx, a); S.z = lerp(S.z, S.tz, a); S.h += angDiff(S.th, S.h) * a; }
  readInput(dt);
  raftWob = Math.max(0, raftWob - dt * 1.5);
  W.raft.position.set(S.x, Math.sin(T * 1.6) * .12 + .1, S.z);
  W.raft.rotation.set(Math.sin(T * 1.3) * .03 + raftWob * Math.sin(T * 20) * .08, S.h, Math.sin(T * 1.1) * .04 + raftWob * Math.sin(T * 17) * .1);
  if(wantA){ wantA = false; doA(); }
  if(wantB){ wantB = false; repairRaft(); }
  if(wantZap){ wantZap = false; fireZap(); }
  P.paddle = Math.max(0, P.paddle - dt * 1.6);
  // sharks: attacking ones swim at the raft, the others keep circling
  const atk = isHost() ? HT.attacks.map(a => ({ s:a.s, cx:a.cx || a.x, cz:a.cz || a.z, k:a.t / a.dur })) : netAttacks;
  W.SHARKS.forEach((s, i) => {
    const a = atk.find(x => x.s === i);
    if(a){ const dx = S.x - a.cx, dz = S.z - a.cz; s.h = Math.atan2(dx, dz); s.x = lerp(s.x, a.cx, Math.min(1, dt * 8)); s.z = lerp(s.z, a.cz, Math.min(1, dt * 8)); s.dive = a.k > 1 ? clamp((a.k - 1) * 3, 0, 1) : 0; }
    else if(i < 3){ s.flee = Math.max(0, (s.flee || 0) - dt); const ang = T * .35 + i * 2.1, r = 16 + i * 3 + (s.flee > 0 ? 25 : 0), tx = S.x + Math.cos(ang) * r, tz = S.z + Math.sin(ang) * r; s.x = lerp(s.x, tx, Math.min(1, dt * .8)); s.z = lerp(s.z, tz, Math.min(1, dt * .8)); s.h = ang + Math.PI; s.dive = 0; }
  });
  // warning «!» over the shark that comes
  const a0 = atk.find(a => a.k < .92);
  warnEl.visible = !!a0; if(a0){ warnEl.position.set(a0.cx, 2.2 + Math.sin(T * 10) * .2, a0.cz); warnEl.lookAt(camera.position); }
}
function repairRaft(){
  if(WS.ph !== 'sail') return;
  if(WS.raft.hp >= 99){ popText('🛶 ' + L('الطوف منيح!', 'The raft is fine!', 'Sal sağlam!')); return; }
  if(!invTake('wood', 1)){ SFX.nope(); popText('🪵 ' + L('ما معك خشب للتصليح', 'No wood to repair', 'Tamir için odun yok')); return; }
  act({ k:'fix' }); if(!isHost()){ WS.raft.hp = Math.min(100, WS.raft.hp + 25); fxFixed(); }
  G.flags.fix = 1; hudKey = '';
}
const warnEl = (() => { const t = K.canvasTex(64, 64, (x, w) => { x.fillStyle = '#ffd23f'; x.beginPath(); x.arc(32, 32, 28, 0, 6.3); x.fill(); x.fillStyle = '#e8304f'; x.font = '900 44px system-ui,sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('!', 32, 35); });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.5), new THREE.MeshBasicMaterial({ map:t, transparent:true, depthTest:false })); m.renderOrder = 10; m.visible = false; scene.add(m); return m; })();

/* ======================================================================
   The toy laser blaster (laser tag): colourful beams; a friend who is hit gets «tagged» (stars, a dizzy spin,
   drops a few things, pops back at the plane after 3 s). Sharks that are zapped swim away for a while.
   The host checks every hit from the shooter's position and direction.
   ====================================================================== */
const BEAM_COL = [0xff4fd8, 0x4fe8ff, 0x8aff4f, 0xffe14f, 0xb57bff];
const beamPool = [];
let beamsShown = 0;
{ const g = new THREE.CylinderGeometry(1, 1, 1, 8, 1, true).rotateX(Math.PI / 2).translate(0, 0, .5);
  for(let i = 0; i < 6; i++){
    const outer = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color:0xff4fd8, transparent:true, opacity:.5, depthWrite:false, blending:THREE.AdditiveBlending, fog:false }));
    const core = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color:0xffffff, transparent:true, opacity:.95, depthWrite:false, fog:false }));
    outer.add(core); core.scale.set(.4, .4, 1); outer.visible = false; outer.renderOrder = 8; scene.add(outer); beamPool.push({ m:outer, core, life:0 });
  } }
function showBeam(x, y, z, f, len, c){
  const b = beamPool.reduce((a, q) => q.life < a.life ? q : a, beamPool[0]);
  b.life = .45; b.m.visible = true; b.m.position.set(x, y, z); b.m.rotation.set(0, f, 0); b.m.scale.set(.09, .09, len);
  b.m.material.color.setHex(BEAM_COL[Math.abs(c | 0) % BEAM_COL.length]);
  const ex = x + Math.sin(f) * len, ez = z + Math.cos(f) * len;
  burst(ex, y, ez, 8, [BEAM_COL[Math.abs(c | 0) % BEAM_COL.length], 0xffffff], 2.5, .7, 2, 1);
  beamsShown++;
  if(Math.hypot(x - P.x, z - P.z) < 30) SFX.zap();
}
function stepBeams(dt){ for(const b of beamPool){ if(b.life <= 0) continue; b.life -= dt; const k = Math.max(0, b.life / .45); b.m.material.opacity = .55 * k; b.core.material.opacity = k; const w = .09 * (.6 + k * .6); b.m.scale.x = b.m.scale.y = w; if(b.life <= 0) b.m.visible = false; } }
/* a practice target near the camp (it spins when zapped) */
const TB = { x:W.CAMP.x + 5.5, z:W.CAMP.z - 6, spin:0 };
TB.y = W.terr(TB.x, TB.z);
const tbGrp = (() => {
  const g = new THREE.Group(), tex = K.canvasTex(128, 128, (x, w) => { const c = ['#e8304f', '#ffffff', '#e8304f', '#ffffff', '#ffd23f']; for(let i = 0; i < 5; i++){ x.fillStyle = c[i]; x.beginPath(); x.arc(64, 64, 62 - i * 12, 0, 6.3); x.fill(); } });
  const post = new THREE.Mesh(new THREE.CylinderGeometry(.08, .08, 1.3, 8), new THREE.MeshLambertMaterial({ color:0x8a5a2e })); post.position.y = .65; post.castShadow = true; g.add(post);
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(.6, .6, .08, 24).rotateX(Math.PI / 2), [new THREE.MeshLambertMaterial({ color:0xc98d4a }), new THREE.MeshLambertMaterial({ map:tex }), new THREE.MeshLambertMaterial({ map:tex })]);
  disc.position.y = 1.4; disc.castShadow = true; g.add(disc); g.userData.disc = disc;
  g.position.set(TB.x, TB.y, TB.z); g.rotation.y = Math.atan2(W.CAMP.x - TB.x, W.CAMP.z - TB.z); scene.add(g); return g;
})();
function stepBlaster(dt){
  stepBeams(dt);
  if(G.blaster){ const b = Math.floor(G.bat); G.bat = Math.min(5, G.bat + dt / 1.6); G.zapCd = Math.max(0, G.zapCd - dt); if(Math.floor(G.bat) !== b) hudKey = ''; $('#zapB').textContent = '⚡'.repeat(Math.floor(G.bat)) || '🔋'; }
  if(TB.spin > 0){ TB.spin = Math.max(0, TB.spin - dt); tbGrp.userData.disc.rotation.y += dt * 18 * TB.spin; }
}
const meKey = () => MP.id || 'me';
function fireZap(){
  if(!G.blaster || G.tagged > 0 || G.zapCd > 0 || !G.started || G.end) return;
  if(G.bat < 1){ SFX.nope(); popText('🔋 ' + L('البطارية عم تنشحن…', 'Recharging…', 'Şarj oluyor…')); return; }
  G.bat -= 1; G.zapCd = .45; hudKey = '';
  const sail = WS.ph === 'sail';
  let ox = P.x, oy = P.y + .95, oz = P.z, f = P.f;
  if(sail){ heroM.grp.getWorldPosition(_v2); ox = _v2.x; oy = _v2.y + .9; oz = _v2.z; f = WS.sail.h; }
  // auto-aim at the best thing in front (friends only when laser tag is on)
  const cands = [];
  if(mpActive() && WS.laser && !sail) for(const r of RM.values()) if(r.seen && r.h && r.h.grp.visible && !r.dz) cands.push({ k:'p', id:r.id, x:r.x, z:r.z, y:r.y + .8 });
  W.SHARKS.forEach((s, i) => cands.push({ k:'s', i, x:s.x, z:s.z, y:.3 }));
  if(!sail) cands.push({ k:'t', x:TB.x, z:TB.z, y:TB.y + 1.4 });
  let best = null, bs = 1e9;
  for(const c of cands){ const dx = c.x - ox, dz = c.z - oz, d = Math.hypot(dx, dz); if(d > 17 || d < .3) continue; const a = Math.abs(angDiff(Math.atan2(dx, dz), f)); if(a > (sail ? .9 : .4)) continue; const sc = d * (1 + a * 3); if(sc < bs){ bs = sc; best = c; } }
  let len = 16;
  if(best){ f = Math.atan2(best.x - ox, best.z - oz); len = Math.hypot(best.x - ox, best.z - oz); oy = lerp(oy, best.y, .3); }
  const c = Math.floor(Math.random() * BEAM_COL.length);
  showBeam(ox, oy, oz, f, len, c); P.f = sail ? P.f : f;
  if(best && best.k === 't'){ TB.spin = 1.4; burst(TB.x, TB.y + 1.4, TB.z, 16, GOLD, 3, 1, 4, 2); SFX.star(2); popText('🎯 ' + L('إصابة!', 'Bullseye!', 'Tam isabet!')); }
  act({ k:'zap', x:r2(ox), y:r2(oy), z:r2(oz), f:r2(f), len:r2(len), c, t:best ? best.k : '', id:best && best.id, s:best && best.i != null ? best.i : -1 });
  G.flags.zap = 1;
}
function knownPos(id){ if(id === meKey() || (mpActive() && id === MP.id)) return { x:P.x, z:P.z, ok:G.tagged <= 0 }; const r = RM.get(id); return r && r.seen ? { x:r.x, z:r.z, ok:!r.dz } : null; }
function hostZap(from, q){
  HT.zapT = HT.zapT || {}; if(WS.wt - (HT.zapT[from] || -9) < .3) return; HT.zapT[from] = WS.wt;
  const ox = numIn(q.x, -500, 500), oz = numIn(q.z, -500, 500), f = numIn(q.f, -50, 50), len = numIn(q.len, 1, 18);
  const sp = WS.ph === 'sail' ? { x:WS.sail.x, z:WS.sail.z } : knownPos(from);
  if(!sp || Math.hypot(sp.x - ox, sp.z - oz) > (WS.ph === 'sail' ? 4 : 5)) return;      // shooter is not where it says
  mpFx({ k:'beam', by:from, x:ox, y:numIn(q.y, -20, 60), z:oz, f, len, c:q.c | 0 });
  if(from !== meKey() && (!mpActive() || from !== MP.id)) showBeam(ox, numIn(q.y, -20, 60), oz, f, len, q.c | 0);
  const inLine = (x, z, maxD) => { const d = Math.hypot(x - ox, z - oz); return d < maxD && Math.abs(angDiff(Math.atan2(x - ox, z - oz), f)) < .5; };
  if(q.t === 'p' && WS.laser && mpActive() && WS.ph === 'build' && typeof q.id === 'string' && q.id !== from){
    const tp = knownPos(q.id); HT.tagUntil = HT.tagUntil || {};
    if(tp && tp.ok && (HT.tagUntil[q.id] || 0) < WS.wt && inLine(tp.x, tp.z, 18)){
      HT.tagUntil[q.id] = WS.wt + 3.5; WS.tags[from] = (WS.tags[from] || 0) + 1;
      mpFx({ k:'tag', by:from, to:q.id, cnt:WS.tags[from] }); fxTag(from, q.id, WS.tags[from]); wsChanged();
    }
  } else if(q.t === 's'){
    const i = q.s | 0, sh = W.SHARKS[i];
    if(sh && inLine(sh.x, sh.z, 19)){ mpFx({ k:'flee', s:i }); fxFlee(i); if(HT.attacks) HT.attacks = HT.attacks.filter(a => a.s !== i); }
  }
}
const nameOf = id => id === meKey() ? L('إنت', 'You', 'Sen') : (BoboRT.who(id, '') || (RM.get(id) && HERO_NAME[RM.get(id).hero]) || L('صاحبك', 'Your friend', 'Arkadaşın'));
function fxTag(by, to, cnt){
  if(cnt) WS.tags[by] = cnt;
  const me = meKey(), tp = to === me ? { x:P.x, z:P.z } : knownPos(to), y = to === me ? P.y : (RM.get(to) ? RM.get(to).y : 0);
  if(tp){ burst(tp.x, y + 1.2, tp.z, 26, [0xffd23f, 0xffffff, 0xff8fb1, 0x6cc4ff], 4, 1.1, 3, 3); }
  SFX.tagged();
  if(to === me){
    G.tagged = 3; stopFishing(); clearInput();
    const lose = []; for(const k of ['wood', 'stone', 'vine', 'leaf', 'berry', 'coconut']) if(invCount(k) > 0 && lose.length < 2){ const n = Math.min(2, invCount(k)); invTake(k, n); lose.push(ITEMS[k].e + '-' + N(n)); }
    if(lose.length) burst(P.x, P.y + .6, P.z, 12, CHIPS.concat(LEAVES), 3, 1, 12, 3);
    toast('👾 ' + nameOf(by) + ' ' + L('أصابك!', 'tagged you!', 'seni vurdu!') + (lose.length ? '  ' + lose.join(' ') : ''));
  } else if(by === me) toast('⚡ ' + L('أصبت ', 'You tagged ', 'Vurdun: ') + nameOf(to) + '!');
  hudKey = '';
}
function stepTagged(dt){
  const before = G.tagged; G.tagged = Math.max(0, G.tagged - dt);
  P.vx = P.vz = 0; wantA = wantB = wantZap = false;
  if(Math.random() < dt * 5) burst(P.x, P.y + 1.55, P.z, 2, GOLD, 1, .7, -1, .5);
  if(before > 0 && G.tagged <= 0){ P.x = W.SPAWN.x + (Math.random() - .5) * 2; P.z = W.SPAWN.z + (Math.random() - .5) * 2; P.y = W.terr(P.x, P.z); snapCam = true; burst(P.x, P.y + .8, P.z, 20, CONFETTI, 3, 1, 8, 3); SFX.join(); heroM.body.rotation.z = 0; }
}
function fxFlee(i){ const s = W.SHARKS[i]; if(!s) return; s.flee = 9; burst(s.x, .5, s.z, 16, SPLASH.concat([0xff4fd8, 0x4fe8ff]), 4, 1, 10, 3); if(Math.hypot(s.x - P.x, s.z - P.z) < 30){ SFX.boing(); popText('🦈💨 ' + L('القرش سبح لبعيد!', 'The shark swam away!', 'Köpekbalığı uzaklaştı!')); } }

/* ---------- the end: on the rescue ship ---------- */
function hostEnd(){
  const team = mpActive() ? MP.players.map(p => ({ id:p.id, hero:okHero(p.hero), av:p.hero === 'me' ? (p.id === MP.id ? myAv() : okAv(p.av)) : null })) : [{ id:'me', hero:heroId, av:myAv() }];
  const stars = calcStars();
  mpSend('ev', { k:'end', n:G.n, team, stars, dn:WS.dn, hp:Math.round(WS.raft.hp), tg:WS.tags });
  showEnd(team, stars);
}
function calcStars(){ const D = DIFF[okDiff(WS.diff)]; return 1 + (WS.raft.hp >= 50 ? 1 : 0) + (WS.dn <= D.par ? 1 : 0); }
function showEnd(team, stars){
  if(G.end) return;
  WS.ph = 'end'; stopFishing();
  G.end = { t:0, team:(team || []).slice(0, 4), stars:clamp(stars | 0, 1, 3), card:false };
  state = 'end'; setPlayUI(false); clearInput();
  SFX.horn(); setTimeout(() => SFX.fanfare(), 900);
  // the raft parks next to the ship, everybody cheers on the deck
  W.raft.position.set(W.SHIP.x + Math.cos(W.ship.rotation.y) * 7, .1, W.SHIP.z - Math.sin(W.ship.rotation.y) * 7);
  endHeroes();
  const D = okDiff(WS.diff);
  // coins (once, capped per day) and the best result on this phone
  if(SAVE.cd.d !== today()) SAVE.cd = { d:today(), n:0 };
  const want = 25 + G.end.stars * 10 + ({ easy:0, normal:10, hard:20 })[D], give = Math.max(0, Math.min(want, COIN_CAP - SAVE.cd.n));
  G.coins = give; SAVE.cd.n += give;
  SAVE.wins[D] = (SAVE.wins[D] || 0) + 1;
  const b = SAVE.best[D]; if(!b || G.end.stars > b.stars || (G.end.stars === b.stars && WS.dn < b.days)) SAVE.best[D] = { stars:G.end.stars, days:WS.dn };
  persist();
  try{ if(window.World){ if(give > 0) World.addCoins(give, L('من الجزيرة المهجورة', 'from Deserted Island', 'Issız Ada\'dan')); if(World.track) World.track('win', 'survive'); } }catch(e){}
}
const deck = [];
function endHeroes(){
  for(const h of deck) h.grp.parent && h.grp.parent.remove(h.grp);
  deck.length = 0;
  G.end.team.forEach((m, i) => {
    const h = (m.id === (MP.id || 'me')) ? heroM : makeHero(okHero(m.hero), m.hero === 'me' ? okAv(m.av) : null);
    if(h !== heroM) deck.push(h);
    W.ship.add(h.grp); h.grp.position.set(-1.8 + i * 1.2, 3.85, 6); h.grp.rotation.set(0, Math.PI / 2, 0); h.grp.scale.setScalar(1.3);
  });
  for(const r of RM.values()) if(r.h) r.h.grp.visible = false;
}
function stepEnd(dt){
  const E = G.end; E.t += dt;
  const a = E.t * .18 + 1, sx = W.SHIP.x, sz = W.SHIP.z;
  camera.position.set(sx + Math.cos(a) * 26, 9 + Math.sin(E.t * .3) * 1.5, sz + Math.sin(a) * 26); camera.lookAt(sx, 4, sz);
  const all = [heroM].concat(deck);
  all.forEach((h, i) => { if(!h) return; poseHero(h, { t:T + i, dt, run:0, grounded:true, vy:0, sq:0, flip:0 }); actPose(h, 'cheer', 0, T + i); h.body.position.y = Math.abs(Math.sin(T * 5 + i)) * .25; });
  if(Math.random() < dt * 6){ const p = _v.set(-1.8 + Math.random() * 4, 6, 6).applyMatrix4(W.ship.matrixWorld); burst(p.x, p.y + 2, p.z, 12, CONFETTI, 5, 1.2, 6, 5); }
  if(E.t > 2.6 && !E.card){ E.card = true; endCard(); }
}
function endCard(){
  const E = G.end, D = DIFF[okDiff(WS.diff)];
  showOverlay('side'); card.className = 'card';
  const mates = E.team.map(m => { const mine = m.id === (MP.id || 'me'), hero = okHero(m.hero);
    const nm = mine ? L('إنت', 'You', 'Sen') : (BoboRT.who(m.id, '') || HERO_NAME[hero]);
    return `<div class="mate" style="--c:${HERO_COLOR[hero]}"><img src="${mine ? charImg(heroId) : heroPic(hero, m.av)}" alt=""><span dir="auto"></span>${mpActive() && WS.laser ? `<small>⚡ ${N(WS.tags[m.id] || 0)}</small>` : ''}</div>`; }).join('');
  card.innerHTML = `<div class="bigstar">🚢</div><h2>${L('وصلنا لسفينة الإنقاذ!', 'We reached the rescue ship!', 'Kurtarma gemisine ulaştık!')}</h2>
    <div class="stars">${[0, 1, 2].map(i => `<span class="${i < E.stars ? '' : 'off'}">⭐</span>`).join('')}</div>
    <div class="team">${mates}</div>
    <p>${D.e} ${L(...D.n)} · ☀️ ${L('أيام', 'Days', 'Gün')}: ${N(WS.dn)} · 🛶 ${N(Math.round(WS.raft.hp))}%</p>
    ${G.coins > 0 ? `<div class="coins">+${N(G.coins)} 🪙</div>` : ''}
    <div class="row">${mpActive() ? (MP.isHost ? `<button class="big-btn" id="bAgain">🔁 ${L('العبوا كمان', 'Play again', 'Tekrar oyna')}</button>` : `<p>${L('استنّى صاحب الغرفة…', 'Wait for the room owner…', 'Oda sahibini bekle…')}</p>`) : `<button class="big-btn" id="bAgain">🔁 ${L('كمان مرة', 'Again', 'Tekrar')}</button>`}
    <button class="ghost-btn" id="bMenu">🏝️ ${L('القائمة', 'Menu', 'Menü')}</button></div>`;
  // names: textContent only
  card.querySelectorAll('.mate span').forEach((el, i) => { const m = E.team[i], mine = m.id === (MP.id || 'me'); el.textContent = (mine ? L('إنت', 'You', 'Sen') : (BoboRT.who(m.id, '') || HERO_NAME[okHero(m.hero)])) + (mpActive() && m.id === MP.hostId ? ' 👑' : ''); });
  E.stars > 0 && [0, 1, 2].forEach(i => { if(i < E.stars) setTimeout(() => SFX.star(i), 400 + i * 250); });
  const ag = $('#bAgain'); if(ag) ag.onclick = () => { SFX.tap(); if(mpActive()) mpBackToLobby(); else beginGame(G.diff); };
  $('#bMenu').onclick = () => { SFX.tap(); showTitle(); };
}

/* ======================================================================
   The intro: the tired plane glides down and lands softly on the beach
   ====================================================================== */
function startIntro(){
  G.intro = { t:0, landed:false, out:false };
  $('#cine').hidden = false; $('#btnSkip').hidden = false; setPlayUI(false);
  cineText('✈️ ' + L('أوه! طيارتنا تعبت شوي… رح ننزل على هالجزيرة', 'Oh! Our plane is a little tired… we will land on this island', 'Ah! Uçağımız biraz yoruldu… bu adaya ineceğiz'));
  heroM.grp.visible = false; SFX.plane();
}
function cineText(t){ $('#cineT').textContent = t; }
$('#btnSkip').addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); if(G.intro) endIntro(); });
function stepIntro(dt){
  const I = G.intro; I.t += dt;
  const R = W.PLANE_REST, a = R.ry, fx = Math.sin(a), fz = Math.cos(a), sx = Math.cos(a), sz = -Math.sin(a);
  const pl = W.plane.grp;
  let x, y, z, pitch = 0, roll = 0, spin = 18;
  if(I.t < 3.8){ const k = I.t / 3.8, e = 1 - (1 - k) * (1 - k); const d = lerp(78, 12, e); x = R.x - fx * d; z = R.z - fz * d; y = R.y + lerp(20, 1.6, e) + Math.sin(I.t * 2.5) * .4; pitch = .1; roll = Math.sin(I.t * 1.7) * .12; if(Math.random() < dt * 2) SFX.putt(); }
  else if(I.t < 5.4){ const k = (I.t - 3.8) / 1.6, e = 1 - Math.pow(1 - k, 3); const d = lerp(12, 0, e); x = R.x - fx * d; z = R.z - fz * d; y = R.y + lerp(1.6, 0, Math.min(1, k * 2.2)) + Math.abs(Math.sin(k * 9)) * .25 * (1 - k); spin = 18 * (1 - k);
    if(!I.landed && k > .3){ I.landed = true; SFX.skid(); cineText('🏝️ ' + L('هبطنا على الرمل… الكل منيح! 😊', 'We landed on the sand… everyone is fine! 😊', 'Kumlara indik… herkes iyi! 😊')); }
    if(k > .3 && Math.random() < dt * 30) burst(x + (Math.random() - .5) * 3, R.y - .8, z + (Math.random() - .5) * 2, 3, SAND, 2.5, 1, 10, 2); }
  else { x = R.x; z = R.z; y = R.y; spin = 0; }
  pl.position.set(x, y, z); pl.rotation.set(I.t < 5.4 ? -pitch : R.rx, a, I.t < 5.4 ? roll : R.rz, 'YXZ');
  W.plane.prop.rotation.z += spin * dt;
  // camera: beside the plane, then at the door
  if(I.t < 5.4){ _v.set(x + sx * 15 - fx * 6, y + 4.5, z + sz * 15 - fz * 6); camera.position.lerp(_v, I.t < .1 ? 1 : Math.min(1, dt * 3)); camera.lookAt(x, y, z); }
  else { _v.set(R.x - sx * 9 + fx * 3, R.y + 2.6, R.z - sz * 9 + fz * 3); camera.position.lerp(_v, Math.min(1, dt * 2)); camera.lookAt(R.x - sx * 2.5, R.y - .2, R.z - sz * 2.5); }
  if(I.t > 5.7 && !I.out){ I.out = true; heroM.grp.visible = true; P.x = R.x - sx * 2.4 - fx * .8; P.z = R.z - sz * 2.4 - fz * .8; P.y = W.terr(P.x, P.z) + .6; P.vy = 5; P.gr = false; P.f = Math.atan2(-sx, -sz); SFX.jump();
    cineText('🪓🎒 ' + L('معنا فأس وشنطة! يلا نبني طوف ونرجع عالبيت', 'We have an axe and a bag! Let\'s build a raft and go home', 'Baltamız ve çantamız var! Bir sal yapıp eve dönelim')); }
  if(I.out){ P.vy -= GRAV * dt; P.y += P.vy * dt; const g = W.terr(P.x, P.z); if(P.y < g){ P.y = g; P.vy = 0; } P.x -= sx * dt * 1.5; P.z -= sz * dt * 1.5; }
  if(I.t > 9) endIntro();
}
function endIntro(){
  if(!G.intro) return;
  G.intro = null; $('#cine').hidden = true; $('#btnSkip').hidden = true;
  const R = W.PLANE_REST; W.plane.grp.position.set(R.x, R.y, R.z); W.plane.grp.rotation.set(R.rx, R.ry, R.rz, 'YXZ');
  heroM.grp.visible = true;
  if(Math.hypot(P.x - W.SPAWN.x, P.z - W.SPAWN.z) > 6){ P.x = W.SPAWN.x; P.z = W.SPAWN.z; }
  P.y = W.terr(P.x, P.z); P.vy = 0;
  cam.yaw = Math.atan2(P.x - W.PLANE.x, P.z - W.PLANE.z) + .6; snapCam = true;
  state = 'play'; setPlayUI(true);
  banner('🪓 + 🎒', 'long');
  setTimeout(() => say('🪓 ' + L('اقطع شجرة بزر A لتجيب خشب! السهم بيدلّك', 'Chop a tree with A to get wood! The arrow shows the way', 'Odun için A ile bir ağaç kes! Ok yolu gösterir'), 5500), 900);
}

/* ======================================================================
   Camera
   ====================================================================== */
function updateCamera(dt){
  if(WS.ph === 'sail'){
    const S = WS.sail, wantYaw = S.h + Math.PI;
    cam.yaw += angDiff(wantYaw, cam.yaw) * Math.min(1, dt * 2);
    const pitch = .34, dd = 13;
    _v.set(S.x + Math.sin(cam.yaw) * Math.cos(pitch) * dd, 1 + Math.sin(pitch) * dd, S.z + Math.cos(cam.yaw) * Math.cos(pitch) * dd);
    if(snapCam){ camPos.copy(_v); camLook.set(S.x, 1.2, S.z); snapCam = false; }
    camPos.lerp(_v, 1 - Math.exp(-6 * dt)); camLook.lerp(_s.set(S.x + Math.sin(S.h) * 4, 1.2, S.z + Math.cos(S.h) * 4), 1 - Math.exp(-8 * dt));
  } else {
    const tx = P.x, ty = P.y + 1.1, tz = P.z;
    const idle = look.id == null && performance.now() - cam.lookT > 1600;
    if(idle && inp.m > .5 && P.push <= 0) cam.yaw += angDiff(P.f + Math.PI, cam.yaw) * Math.min(1, dt * .9);
    const pitch = clamp(.42 + cam.pAdj, .08, 1.05), want = 8.5;
    const dx = Math.sin(cam.yaw) * Math.cos(pitch), dy = Math.sin(pitch), dz = Math.cos(cam.yaw) * Math.cos(pitch);
    let px = tx + dx * want, py = ty + dy * want, pz = tz + dz * want;
    py = Math.max(py, W.terr(px, pz) + .8, .6);
    _v.set(px, py, pz);
    if(snapCam){ camPos.copy(_v); camLook.set(tx, ty, tz); snapCam = false; }
    else { camPos.lerp(_v, 1 - Math.exp(-10 * dt)); camLook.lerp(_s.set(tx, ty, tz), 1 - Math.exp(-14 * dt)); }
  }
  camera.position.copy(camPos);
  if(cam.shake > 0){ cam.shake = Math.max(0, cam.shake - dt); const k = cam.shake * .5; camera.position.x += (Math.random() - .5) * k; camera.position.y += (Math.random() - .5) * k; }
  camera.lookAt(camLook);
}

/* ======================================================================
   Day and night (night is cozy: dimmer light, stars, the moon, the campfire glows)
   ====================================================================== */
let nightK = 0;
const isNight = () => nightK > .5;
const DAYC = { sun:new THREE.Color(0xfff1d8), sunN:new THREE.Color(0x9fb4ff), hemi:new THREE.Color(0xdff2ff), hemiN:new THREE.Color(0x8ea6e0), gnd:new THREE.Color(0xf3d9a0), gndN:new THREE.Color(0x5a6a8a) };
function applyDay(d, cx, cz){
  const n = sstep(.6, .7, d) * (1 - sstep(.93, .995, d));
  const dusk = sstep(.55, .64, d) * (1 - sstep(.64, .72, d)) + sstep(.9, .95, d) * (1 - sstep(.95, 1, d));
  nightK = n;
  const hor = W.setSky(n, dusk * (1 - n * .6));
  scene.fog.color.copy(hor);
  sun.intensity = 2.3 * (1 - n * .7) * (1 - dusk * .2); sun.color.copy(DAYC.sun).lerp(DAYC.sunN, n);
  hemi.intensity = 1.55 * (1 - n * .42); hemi.color.copy(DAYC.hemi).lerp(DAYC.hemiN, n); hemi.groundColor.copy(DAYC.gnd).lerp(DAYC.gndN, n);
  // the sun follows the day; the moon rises at night
  const sa = d * Math.PI * 2 - .4;
  W.sunG.position.set(cx + Math.cos(sa) * 600, 120 + Math.max(0, Math.sin(sa + .9)) * 420, cz - 520);
  W.moon.position.set(cx - 420, 300, cz + 480);
  AU.mood(n, WS.ph === 'sail');
}
function aimSun(x, z){ sun.target.position.set(x, 0, z); sun.position.set(x + 34, 70, z - 26); }

/* ======================================================================
   HUD, goals, hint arrow, tips
   ====================================================================== */
const hudEl = $('#hud'), goalsEl = $('#goals'), labelsEl = $('#labels');
let hudKey = '', aKey = '';
function setPlayUI(on){
  for(const el of [hudEl, joyEl, aBtn, bBtn, bagBtn, craftBtn]) el.hidden = !on;
  zapBtn.hidden = !on || !G.blaster;
  if(!on){ $('#guide').hidden = true; }
  clearInput(); hudKey = ''; aKey = ''; placeJoyHome();
}
function goals(){
  const st = WS.raft.st;
  return [
    { id:'chop', e:'🪓', t:L('اقطع شجرة', 'Chop a tree', 'Bir ağaç kes'), done:!!G.flags.chop },
    { id:'eat', e:'🍓', t:L('كول شي', 'Eat something', 'Bir şey ye'), done:!!G.flags.ate },
    { id:'rope', e:'🪢', t:L('اصنع حبل', 'Craft a rope', 'İp yap'), done:!!G.flags.rope || st >= 2 },
    { id:'fire', e:'🔥', t:L('ابنوا نار المخيم', 'Build the campfire', 'Kamp ateşi yapın'), done:!!WS.fire },
    { id:'raft', e:'🛶', t:L('ابنوا الطوف', 'Build the raft', 'Salı yapın'), done:st >= 4, x:`${N(st)}/${N(4)}` },
    { id:'sail', e:'⛵', t:L('ابحروا للسفينة', 'Sail to the ship', 'Gemiye yelken açın'), done:WS.ph === 'end' }
  ];
}
const curGoal = () => goals().find(g => !g.done) || null;
function nearestOf(list, ok){ let b = null, bd = 1e9; list.forEach((o, i) => { if(!ok(o, i)) return; const d = Math.hypot(o.x - P.x, o.z - P.z); if(d < bd){ bd = d; b = o; } }); return b; }
const nearTree = () => nearestOf(W.TREES, (t, i) => WS.trees[i] > 0 && WS.grow[i] >= 1);
const nearPick = type => nearestOf(W.PICKS, (p, i) => p.type === type && WS.picks[i]);
const nearCrate = () => nearestOf(WS.crates.map(c => W.CRATE_SPOTS[c.s]).filter(Boolean), () => true);
function sourceOf(k){
  if(k === 'wood') return nearTree();
  if(k === 'stone' || k === 'vine' || k === 'leaf' || k === 'metal') return nearPick(k) || (k === 'metal' ? nearCrate() : null);
  if(k === 'rope') return nearPick('vine');
  if(k === 'cloth') return nearCrate();
  return null;
}
function goalTarget(){
  const g = curGoal(); if(!g) return null;
  if(g.id === 'chop') return nearTree();
  if(g.id === 'eat') return nearestOf(W.BUSHES, (b, i) => WS.bush[i] > 0) || nearestOf(W.PALMS, (p, i) => WS.nuts[i] > 0);
  if(g.id === 'rope') return invCount('vine') >= 3 ? null : nearPick('vine');
  if(g.id === 'fire'){ const c = recipeCost(RECIPES.find(r => r.id === 'fire'), WS.diff); const miss = Object.keys(c).find(k => invCount(k) < c[k]); return miss ? sourceOf(miss) : W.FIRE; }
  if(g.id === 'raft'){
    const need = raftCost(WS.raft.st, WS.diff);
    if(Object.keys(need).some(k => invCount(k) > 0 && (WS.raft.have[k] || 0) < need[k])) return W.RAFT;
    const miss = Object.keys(need).find(k => (WS.raft.have[k] || 0) < need[k]);
    if(miss === 'rope' && invCount('vine') >= 3) return null;
    return sourceOf(miss) || W.RAFT;
  }
  if(g.id === 'sail') return WS.ph === 'build' ? W.RAFT : null;
  return null;
}
const arrow = (() => {
  const g = new THREE.Group(), M = new K.Merge();
  M.add(K.G.cone, 0, 0, .55, .32, .6, .32, Math.PI / 2, 0, 0, 0xffd23f).add(K.G.cyl8, 0, 0, .05, .12, .55, .12, Math.PI / 2, 0, 0, 0xffd23f);
  const m = new THREE.Mesh(M.geometry(), new THREE.MeshBasicMaterial({ vertexColors:true, depthTest:false, transparent:true, opacity:.92 })); m.renderOrder = 9; g.add(m); g.visible = false; scene.add(g);
  return g;
})();
const marker = (() => { const M = new K.Merge(); M.add(K.G.cone, 0, 0, 0, .35, .6, .35, Math.PI, 0, 0, 0xffd23f); const m = new THREE.Mesh(M.geometry(), new THREE.MeshBasicMaterial({ vertexColors:true, transparent:true, opacity:.9 })); m.visible = false; scene.add(m); return m; })();
function drawHint(){
  const t = state === 'play' && WS.ph === 'build' && !G.intro ? goalTarget() : null;
  if(!t){ arrow.visible = marker.visible = false; return; }
  const d = Math.hypot(t.x - P.x, t.z - P.z);
  arrow.visible = d > 4.5; marker.visible = d < 40;
  arrow.position.set(P.x, P.y + 2.35 + Math.sin(T * 4) * .1, P.z); arrow.rotation.y = Math.atan2(t.x - P.x, t.z - P.z);
  const ty = (t.y != null ? t.y : W.terr(t.x, t.z));
  marker.position.set(t.x, ty + (t === W.RAFT ? 3.2 : (t.kind != null ? 6.2 : 2.2)) + Math.abs(Math.sin(T * 3)) * .4, t.z); marker.rotation.y = T * 2;
}
function hudFrame(){
  const S = WS.ph === 'sail';
  const key = [G.blaster ? Math.floor(G.bat) : -1, Math.round(G.energy), WS.dn, isNight() ? 1 : 0, G.inv.filter(Boolean).length, G.bag, WS.raft.st, JSON.stringify(WS.raft.have), WS.fire, WS.tent, Math.round(WS.raft.hp), WS.ph, Object.keys(G.flags).length, G.axe, G.rod ? 1 : 0, invHash()].join('|');
  if(key !== hudKey){
    hudKey = key;
    const day = $('#hudDay'); day.textContent = (isNight() ? '🌙 ' : '☀️ ') + L('يوم ', 'Day ', 'Gün ') + N(WS.dn); day.classList.toggle('night', isNight());
    const fb = $('#hudFood'); fb.style.setProperty('--p', Math.round(G.energy) + '%'); fb.querySelector('b').style.width = Math.round(G.energy) + '%'; fb.classList.toggle('low', G.energy < 25);
    $('#hudEat').hidden = !(G.energy < 75 && FOOD_ORDER.some(k => invCount(k) > 0));
    const rb = $('#hudRaft'); rb.hidden = !S; if(S) rb.querySelector('b').style.width = Math.round(WS.raft.hp) + '%';
    $('#bagN').textContent = N(G.inv.filter(Boolean).length) + '/' + N(G.bag);
    craftBtn.classList.toggle('ready', RECIPES.some(r => canCraft(r)));
    const gl = goals(), ci = gl.findIndex(g => !g.done);
    goalsEl.innerHTML = `<h4>🎯 ${L('المهمّات', 'Goals', 'Görevler')}</h4><ul>${gl.map((g, i) => `<li class="${g.done ? 'done' : i === ci ? 'cur' : i === ci + 1 ? 'next' : ''}">${g.done ? '✅' : g.e} ${g.t}${g.x ? ` <em>${g.x}</em>` : ''}</li>`).join('')}</ul>`;
    zapBtn.hidden = !G.blaster || !!G.end;
    $('#bI').textContent = S ? '🔨' : '⤴️'; $('#bB').textContent = S ? L('صلّح', 'Repair', 'Tamir') : L('نط', 'Jump', 'Zıpla');
    $('#hudRoom').hidden = !(mpActive() && MP.code); if(mpActive() && MP.code) $('#hudRoom').textContent = '🏠 ' + MP.code;
  }
  const t = state === 'play' ? findTarget() : null, ak = t ? t.k : '';
  if(ak !== aKey){ aKey = ak; $('#aI').textContent = t ? A_ICON[t.k] : '✋'; $('#aB').textContent = aLabel(t); aBtn.classList.toggle('idle', !t); aBtn.classList.toggle('pulse', !!t && ['tree', 'crate', 'raft', 'board', 'launch'].includes(t.k)); }
}
const invHash = () => G.inv.map(s => s ? s.k[0] + s.n : '-').join('');
let sayTO = 0;
function say(text, ms = 4200){ const g = $('#guide'); clearTimeout(sayTO); $('#guideT').textContent = text; g.hidden = false; g.style.animation = 'none'; void g.offsetWidth; g.style.animation = ''; sayTO = setTimeout(() => { g.hidden = true; }, ms); }
function popText(text){ const box = $('#pops'); while(box.children.length > 2) box.firstChild.remove(); const d = document.createElement('div'); d.className = 'pop'; d.textContent = text; box.appendChild(d); setTimeout(() => d.remove(), 1600); }
let bannerTO = 0;
function banner(text, cls){ const el = $('#banner'); el.className = 'banner'; void el.offsetWidth; el.textContent = text; el.className = 'banner go ' + (cls || ''); clearTimeout(bannerTO); bannerTO = setTimeout(() => { el.className = 'banner'; }, 2600); }
let toastTO = 0;
function toast(text, ms = 3500){ const el = $('#toast'); el.textContent = text; el.hidden = false; clearTimeout(toastTO); toastTO = setTimeout(() => { el.hidden = true; }, ms); }

/* ======================================================================
   Bag, crafting, raft info
   ====================================================================== */
const overlay = $('#overlay'), card = $('#card');
function showOverlay(cls){ overlay.hidden = false; overlay.className = 'overlay ' + (cls || ''); }
function hideOverlay(){ overlay.hidden = true; }
const costChips = c => Object.keys(c).map(k => `<span class="${invCount(k) >= c[k] ? '' : 'no'}">${ITEMS[k].e}${N(c[k])}</span>`).join('');
function showBag(){
  if(state !== 'play' || G.intro) return;
  state = 'bag'; clearInput(); showOverlay('dim'); card.className = 'card wide panel'; drawBag();
}
function drawBag(){
  const slots = []; for(let i = 0; i < G.bag; i++){ const s = G.inv[i]; slots.push(s ? `<button class="slot${ITEMS[s.k].food ? ' food' : ''}" data-i="${i}" aria-label="${itemName(s.k)}">${ITEMS[s.k].e}<b>${N(s.n)}</b>${ITEMS[s.k].food ? '<small>🍽️</small>' : ''}</button>` : '<div class="slot empty"></div>'); }
  card.innerHTML = `<h2>🎒 ${L('شنطتي', 'My bag', 'Çantam')} <small dir="ltr">${N(G.inv.filter(Boolean).length)}/${N(G.bag)}</small></h2>
    <div class="tools"><span>🪓 ${L(...RECIPES.find(r => r.lvl === G.axe) ? RECIPES.find(r => r.lvl === G.axe).n : ['فأس', 'Axe', 'Balta'])}</span>${G.rod ? `<span>🎣 ${L('صنّارة', 'Fishing rod', 'Olta')}</span>` : ''}<span>🍗 ${N(Math.round(G.energy))}%</span></div>
    <div class="slots">${slots.join('')}</div>
    <p>🍽️ ${L('اكبس على الأكل لتاكلو', 'Tap food to eat it', 'Yemek için yiyeceğe dokun')}</p>
    <div class="row"><button class="big-btn" id="bCraftGo">🔨 ${L('اصنع', 'Craft', 'Yap')}</button><button class="big-btn mint" id="bClose">✅ ${L('تمام', 'OK', 'Tamam')}</button></div>`;
  card.querySelectorAll('.slot[data-i]').forEach(b => b.onclick = () => { const s = G.inv[b.dataset.i | 0]; if(!s) return; if(ITEMS[s.k].food){ eat(s.k); drawBag(); } else { SFX.tap(); popText(ITEMS[s.k].e + ' ' + itemName(s.k)); } });
  $('#bClose').onclick = () => { SFX.tap(); closePanel(); };
  $('#bCraftGo').onclick = () => { SFX.tap(); state = 'craft'; drawCraft(); };
}
function showCraft(){
  if(state !== 'play' || G.intro) return;
  state = 'craft'; clearInput(); showOverlay('dim'); card.className = 'card wide panel'; drawCraft();
}
function drawCraft(){
  const recs = RECIPES.map(r => { const c = recipeCost(r, WS.diff), ok = canCraft(r), done = recipeDone(r), locked = r.need === 'axe2' && G.axe < 2;
    return `<button class="rec${ok ? ' ok' : ''}${done ? ' done' : ''}${!ok && !done ? ' no' : ''}" data-r="${r.id}"><i>${r.e}</i><b>${L(...r.n)}</b><div class="cost">${locked ? '<span>🪓→⛏️</span>' : costChips(c)}</div></button>`; }).join('');
  const st = WS.raft.st;
  card.innerHTML = `<h2>🔨 ${L('اصنع', 'Craft', 'Yap')}</h2>
    <div class="recipes">${recs}<button class="rec" id="bRaftInfo"><i>🛶</i><b>${L('الطوف', 'Raft', 'Sal')} ${N(st)}/${N(4)}</b><div class="cost"><span>🏖️ ${L('عالشط', 'at the beach', 'kumsalda')}</span></div></button></div>
    <div class="row"><button class="ghost-btn" id="bBag2">🎒 ${L('الشنطة', 'Bag', 'Çanta')}</button><button class="big-btn mint" id="bClose">✅ ${L('تمام', 'OK', 'Tamam')}</button></div>`;
  card.querySelectorAll('.rec[data-r]').forEach(b => b.onclick = () => { if(craft(b.dataset.r)) drawCraft(); });
  $('#bRaftInfo').onclick = () => { SFX.tap(); showRaftInfo(); };
  $('#bBag2').onclick = () => { SFX.tap(); state = 'bag'; drawBag(); };
  $('#bClose').onclick = () => { SFX.tap(); closePanel(); };
}
function showRaftInfo(){
  state = 'raftinfo'; clearInput(); showOverlay('dim'); card.className = 'card wide panel';
  const st = WS.raft.st;
  card.innerHTML = `<h2>🛶 ${L('الطوف', 'The raft', 'Sal')} ${N(st)}/${N(4)}</h2>
    <div class="stages">${RAFT_ST.map((s, i) => { const c = raftCost(i, WS.diff); return `<div class="stg${i < st ? ' done' : i === st ? ' cur' : ''}"><i>${i < st ? '✅' : s.e}</i>${L(...s.n)}<div class="cost">${Object.keys(c).map(k => `<span>${ITEMS[k].e}${i === st ? N(WS.raft.have[k] || 0) + '/' : ''}${N(c[k])}</span>`).join('')}</div></div>`; }).join('')}</div>
    <p>${st >= 4 ? '⛵ ' + L('جاهز! اركبوا كلكن وانطلقوا', 'Ready! Everyone get on and go', 'Hazır! Herkes binsin ve gidin') : '🏖️ ' + L('جيب الأغراض للطوف عالشط واكبس A', 'Bring the things to the raft on the beach and press A', 'Malzemeleri kumsaldaki sala getir ve A\'ya bas')}</p>
    <div class="row"><button class="big-btn mint" id="bClose">✅ ${L('تمام', 'OK', 'Tamam')}</button></div>`;
  $('#bClose').onclick = () => { SFX.tap(); closePanel(); };
}
function closePanel(){ hideOverlay(); state = 'play'; hudKey = ''; aKey = ''; last = performance.now(); }

/* ======================================================================
   Menus
   ====================================================================== */
function myHeroBtn(id = 'bMyHero'){ return `<button class="hero-btn" id="${id}" style="--c:${HERO_COLOR[heroId]}"><img src="${charImg(heroId)}" alt=""><span>${HERO_NAME[heroId]}</span> 🔄</button>`; }
function sndBtn(){ return `<button class="icon-btn sndbtn" id="bSnd" aria-label="${L('الصوت', 'Sound', 'Ses')}">${AU.muted ? '🔇' : '🔊'}</button>`; }
function wireSnd(){ const b = $('#bSnd'); if(b) b.onclick = () => { AU.setMuted(!AU.muted); b.textContent = AU.muted ? '🔇' : '🔊'; if(!AU.muted) SFX.tap(); }; }
function resetScene(){
  G.started = false; G.end = null; G.intro = null; sailOn = false; stopFishing();
  WS = freshWS(G.diff); worldDirty();
  for(const h of deck) h.grp.parent && h.grp.parent.remove(h.grp); deck.length = 0;
  if(heroM && heroM.grp.parent !== scene){ scene.add(heroM.grp); heroM.grp.scale.setScalar(1); }
  if(heroM) heroM.grp.visible = true;
  W.raft.position.set(W.RAFT.x, Math.max(W.RAFT.y, -.1) + .15, W.RAFT.z); W.raft.rotation.set(0, W.RAFT.a, 0);
  const R = W.PLANE_REST; W.plane.grp.position.set(R.x, R.y, R.z); W.plane.grp.rotation.set(R.rx, R.ry, R.rz, 'YXZ');
  for(const r of RM.values()) if(r.h) r.h.grp.visible = r.seen;
  $('#cine').hidden = true; $('#btnSkip').hidden = true; warnEl.visible = false;
}
function showTitle(){
  if(MP.t) coStop();
  resetScene();
  state = 'menu'; setPlayUI(false); AU.music(false); AU.sea(false);
  P.x = W.SPAWN.x; P.z = W.SPAWN.z; P.y = W.terr(P.x, P.z); P.f = 2.4;
  showOverlay('clear'); card.className = 'card bare';
  const b = SAVE.best[G.diff];
  card.innerHTML = `${sndBtn()}<div class="menu">
    <div class="logo">🏝️</div>
    <h1>${L('البقاء بالجزيرة المهجورة', 'Deserted Island Survival', "Issız Ada'da Hayatta Kalma")}</h1>
    <p class="sub">🪓 ${L('اقطع، لمّ، اصنع، وابني طوف لترجع عالبيت!', 'Chop, gather, craft and build a raft to get home!', 'Kes, topla, üret ve eve dönmek için bir sal yap!')} 🛶</p>
    ${myHeroBtn()}
    ${b ? `<span class="best">${DIFF[G.diff].e} ${'⭐'.repeat(b.stars)} · ☀️ ${N(b.days)}</span>` : ''}
    <div class="row"><button class="big-btn" id="bPlay">▶️ ${L('العب', 'Play', 'Oyna')}</button>
    <button class="big-btn pink" id="bMP">👫 ${L('العب مع أصحابك', 'Play with friends', 'Arkadaşlarla oyna')}</button></div></div>`;
  wireSnd();
  $('#bMyHero').onclick = () => { SFX.tap(); showSelect('menu'); };
  $('#bPlay').onclick = () => { AU.ac(); SFX.tap(); showDiff(); };
  $('#bMP').onclick = () => { AU.ac(); SFX.tap(); mpMenu(); };
}
const diffCards = sel => `<div class="diffs">${Object.keys(DIFF).map(k => `<button class="diff${k === sel ? ' on' : ''}" data-d="${k}" style="--dc:${DIFF[k].col}"><i>${DIFF[k].e}</i><b>${L(...DIFF[k].n)}</b><small>${L(...DIFF[k].s)}</small></button>`).join('')}</div>`;
function showDiff(){
  state = 'diff'; showOverlay('dim'); card.className = 'card wide';
  card.innerHTML = `<h2>🏝️ ${L('قديش بدك تكون المغامرة صعبة؟', 'How hard should the adventure be?', 'Macera ne kadar zor olsun?')}</h2>
    ${diffCards(G.diff)}
    <div class="row">${myHeroBtn()}<button class="big-btn mint" id="bGo">▶️ ${L('يلّا', "Let's go", 'Hadi')}</button><button class="ghost-btn" id="bBack">↩️ ${L('رجوع', 'Back', 'Geri')}</button></div>`;
  card.querySelectorAll('.diff').forEach(b => b.onclick = () => { G.diff = okDiff(b.dataset.d); SAVE.diff = G.diff; persist(); SFX.tap(); card.querySelectorAll('.diff').forEach(x => x.classList.toggle('on', x === b)); });
  $('#bMyHero').onclick = () => { SFX.tap(); showSelect('diff'); };
  $('#bGo').onclick = () => { AU.ac(); SFX.tap(); beginGame(G.diff); };
  $('#bBack').onclick = () => { SFX.tap(); showTitle(); };
}
let selFrom = 'menu';
function showSelect(from){
  selFrom = from || 'menu'; const was = state; state = 'select'; if(was === 'pause') selFrom = 'pause';
  showOverlay('dim'); card.className = 'card wide';
  card.innerHTML = `<h2>🏝️ ${L('مين رح يعيش المغامرة؟', 'Who goes on the adventure?', 'Maceraya kim gidiyor?')}</h2>
    <div class="heroes">${HERO_IDS.map(id => `<button class="hero${id === heroId ? ' on' : ''}" data-h="${id}" style="--c:${HERO_COLOR[id]}"><img src="${charImg(id)}" alt=""><b>${HERO_NAME[id]}</b></button>`).join('')}</div>
    <div class="row"><button class="big-btn" id="bOk">✅ ${L('تمام', 'OK', 'Tamam')}</button></div>`;
  card.querySelectorAll('.hero').forEach(b => b.onclick = () => { SAVE.hero = b.dataset.h; persist(); rawSet('worlds_hero', b.dataset.h); setHero(b.dataset.h); SFX.tap(); card.querySelectorAll('.hero').forEach(x => x.classList.toggle('on', x === b)); });
  $('#bOk').onclick = () => { SFX.tap(); backFromSelect(); };
}
function backFromSelect(){
  if(selFrom === 'mp'){ if(mpActive() && MP.screen === 'lobby'){ mpTrack(); mpLobby(); } else mpMenu(); }
  else if(selFrom === 'diff') showDiff();
  else if(selFrom === 'pause'){ mpTrack(); showPause(true); }
  else showTitle();
}
function showPause(force){
  if(state !== 'play' && !force) return;
  state = 'pause'; clearInput(); stopFishing();
  showOverlay('dim'); card.className = 'card';
  card.innerHTML = `${sndBtn()}<div class="bigstar">⏸️</div><h2>${L('استراحة', 'Paused', 'Mola')}</h2>
    ${mpActive() ? `<p>👫 ${L('أصحابك لسّا عم يلعبوا', 'Your friends keep playing', 'Arkadaşların oynamaya devam ediyor')}</p>` : ''}
    <div class="row"><button class="big-btn mint" id="bResume">▶️ ${L('كمّل', 'Continue', 'Devam')}</button></div>
    <div class="row"><button class="ghost-btn" id="bMenu">🏝️ ${L('القائمة', 'Menu', 'Menü')}</button></div>
    <button class="exit-btn" id="bExit">🚪 ${L('اطلع من اللعبة', 'Leave the game', 'Oyundan çık')}</button>`;
  wireSnd();
  $('#bResume').onclick = () => { SFX.tap(); closePanel(); };
  $('#bMenu').onclick = () => { SFX.tap(); showTitle(); };
  $('#bExit').onclick = () => { try{ coStop(); }catch(e){} location.href = '../'; };
}
$('#btnPause').onclick = () => { SFX.tap(); showPause(); };

/* ---------- start a game ---------- */
function beginGame(diff, o = {}){
  diff = okDiff(diff); G.diff = diff;
  if(!o.online){ if(MP.t) coStop(); G.n = (G.n | 0) + 1; }
  else G.n = o.n | 0;
  resetScene();
  Object.assign(G, { blaster:false, bat:5, zapCd:0, tagged:0, inv:new Array(BAG0).fill(null), bag:BAG0, axe:1, rod:false, energy:100, flags:{}, stats:{ wood:0, items:0, fish:0, crafted:0 }, playT:0, started:true, bumpCd:0, fishing:null, end:null, coins:0, late:!!o.late });
  WS = freshWS(diff); WS.n = G.n; WS.laser = o.online && o.laser ? 1 : 0;
  Object.assign(HT, { trees:[], picks:[], bush:[], nuts:[], crate:0, snap:0, sl:0, dirty:true, shark:0, boardT:0, hits:{}, attacks:[] });
  if(isHost()){ for(let i = 0; i < 3; i++) spawnCrate(); }
  setHero(heroId);
  P.x = W.SPAWN.x; P.z = W.SPAWN.z; P.y = W.terr(P.x, P.z); P.vx = P.vz = P.vy = 0; P.push = 0; P.act = null; P.f = 0;
  hideOverlay(); worldDirty(); applyWorld();
  SAVE.played++; persist();
  AU.music(true); AU.sea(true, .5);
  if(o.late || o.noIntro || QS.get('nointro') === '1'){ G.intro = { t:99 }; endIntro(); if(o.late) toast('👫 ' + L('فتت عاللعبة! أصحابك هون', "You joined the game! Your friends are here", 'Oyuna katıldın! Arkadaşların burada')); }
  else { state = 'play'; startIntro(); }
}

/* ======================================================================
   Remote players (online)
   ====================================================================== */
const RM = new Map();
function labelEl(){ const d = document.createElement('div'); d.className = 'nm'; d.hidden = true; labelsEl.appendChild(d); return d; }
function dropRemote(id){ const a = RM.get(id); if(!a) return; if(a.h) a.h.grp.parent && a.h.grp.parent.remove(a.h.grp); a.lbl.remove(); RM.delete(id); }
function remoteSync(list){
  const here = new Set();
  for(const p of list){
    if(p.id === MP.id) continue;
    here.add(p.id);
    let a = RM.get(p.id);
    if(!a){ a = { id:p.id, hero:null, avK:'', h:null, lbl:labelEl(), buf:[], seen:false, t:Math.random() * 5, x:0, y:0, z:0, f:0, m:0, act:null, actK:0, sw:0, sx:0, pd:0, ax:1, born:performance.now() }; RM.set(p.id, a); }
    const hero = okHero(p.hero), av = hero === 'me' ? okAv(p.av) : null, avK = av ? JSON.stringify(av) : '';
    if(a.hero !== hero || a.avK !== avK){ if(a.h) a.h.grp.parent && a.h.grp.parent.remove(a.h.grp); a.hero = hero; a.avK = avK; a.av = av; a.h = makeHero(hero, av); a.h.grp.visible = false; scene.add(a.h.grp); }
    a.lbl.style.setProperty('--c', HERO_COLOR[hero] || '#fff');
  }
  for(const id of [...RM.keys()]) if(!here.has(id)) dropRemote(id);
}
function onPos(p){
  if((p.n | 0) !== G.n || !G.started) return;
  const a = RM.get(p.id); if(!a) return;
  a.buf.push({ t:performance.now(), x:numIn(p.x, -200, 200), y:numIn(p.y, -20, 60), z:numIn(p.z, -200, 200), f:numIn(p.f, -1e3, 1e3), m:numIn(p.m, 0, 1) });
  if(a.buf.length > 12) a.buf.shift();
  if(!a.seen){ a.x = a.buf[0].x; a.y = a.buf[0].y; a.z = a.buf[0].z; a.f = a.buf[0].f; }
  a.seen = true; a.sw = p.sw ? 1 : 0; a.sx = numIn(p.sx, -1, 1); a.ax = clamp(p.ax | 0, 1, 3);
  if(typeof p.a === 'string' && p.a && p.a !== a.act){ a.act = ['chop', 'pick', 'eat', 'fish', 'cheer'].includes(p.a) ? p.a : null; a.actT = 0; }
  if(!p.a) a.act = null;
  if(p.pd) a.pd = 1;
  a.dz = p.dz ? 1 : 0;
}
function stepRemotes(dt){
  const now = performance.now(), rt = now - 200;
  for(const a of RM.values()){
    a.t += dt;
    if(a.buf.length){
      let i = a.buf.length - 1; while(i > 0 && a.buf[i - 1].t > rt) i--;
      const q = a.buf[i], pr = i > 0 ? a.buf[i - 1] : null; let s = q;
      if(pr && q.t > rt){ const k = clamp((rt - pr.t) / Math.max(1, q.t - pr.t), 0, 1); s = { x:lerp(pr.x, q.x, k), y:lerp(pr.y, q.y, k), z:lerp(pr.z, q.z, k), m:lerp(pr.m, q.m, k), f:pr.f + angDiff(q.f, pr.f) * k }; }
      const k = 1 - Math.exp(-16 * dt);
      a.x = lerp(a.x, s.x, k); a.y = lerp(a.y, s.y, k); a.z = lerp(a.z, s.z, k); a.f += angDiff(s.f, a.f) * k; a.m = lerp(a.m, s.m, k);
    }
    if(!a.h) continue;
    const show = a.seen && G.started && !G.end && !(G.intro && !G.intro.out);
    a.h.grp.visible = show; if(!show) continue;
    setAxe(a.h, a.ax || 1);
    const seat = WS.ph === 'sail' ? WS.aboard.indexOf(a.id) : -1;
    if(seat >= 0){
      if(a.h.grp.parent !== W.raft){ W.raft.add(a.h.grp); }
      const s = SEATS[seat % 4]; a.h.grp.position.set(s[0], s[1], s[2]); a.h.grp.rotation.set(0, 0, 0);
      a.pd = Math.max(0, (a.pd || 0) - dt * 1.6); sitPose(a.h, a.t, a.pd);
    } else {
      if(a.h.grp.parent !== scene) scene.add(a.h.grp);
      a.h.grp.position.set(a.x, a.y, a.z); a.h.grp.rotation.y = a.f;
      poseHero(a.h, { t:a.t, dt, run:a.m, grounded:true, vy:0, sq:0, flip:0 });
      if(a.sw) actPose(a.h, 'swim', 0, a.t);
      if(a.dz){ a.h.grp.rotation.y = a.f + a.t * 9; a.h.body.rotation.z = Math.sin(a.t * 6) * .25; if(Math.random() < dt * 4) burst(a.x, a.y + 1.5, a.z, 2, GOLD, 1, .7, -1, .5); }
      if(a.act){ a.actT = (a.actT || 0) + dt; const d = a.act === 'chop' ? .42 : a.act === 'eat' ? .8 : .4; actPose(a.h, a.act, (a.actT % d) / d, a.t); }
    }
  }
}
function placeLabels(){
  const w2 = SW / 2, h2 = SH / 2;
  for(const a of RM.values()){
    const show = (state === 'play' || state === 'pause' || state === 'bag' || state === 'craft' || state === 'raftinfo') && a.h && a.h.grp.visible;
    if(a.lbl.hidden !== !show) a.lbl.hidden = !show;
    if(!show) continue;
    const txt = BoboRT.who(a.id, '') || HERO_NAME[a.hero] || '';
    if(a.lbl.textContent !== txt) a.lbl.textContent = txt;
    a.h.grp.getWorldPosition(_v); _v.y += 1.75;
    _v.project(camera);
    if(_v.z > 1 || _v.z < -1 || Math.abs(_v.x) > 1.1 || Math.abs(_v.y) > 1.1){ a.lbl.style.visibility = 'hidden'; continue; }
    a.lbl.style.visibility = ''; a.lbl.style.transform = `translate(${(_v.x * w2 + w2).toFixed(1)}px,${(-_v.y * h2 + h2).toFixed(1)}px) translate(-50%,-100%)`;
  }
}

/* ======================================================================
   Main loop
   ====================================================================== */
let T = 0, last = performance.now(), fpsN = 0, fpsT = 0, fps = 60, slowT = 0;
const PANEL = ['bag', 'craft', 'raftinfo', 'pause', 'select'];
function frame(now){
  requestAnimationFrame(frame);
  let rdt = (now - last) / 1000; last = now; if(rdt > .05) rdt = .05; if(rdt <= 0) rdt = .001;
  fpsN++; fpsT += rdt;
  if(fpsT >= 1){
    fps = fpsN / fpsT; fpsN = 0; fpsT = 0;
    if(state === 'play' && fps < 42){ slowT++; if(slowT >= 2){ slowT = 0; if(dpr > 1){ dpr = Math.max(1, dpr - .25); renderer.setPixelRatio(dpr); renderer.setSize(SW, SH, false); } else if(renderer.shadowMap.enabled && fps < 30){ renderer.shadowMap.enabled = false; sun.castShadow = false; scene.traverse(o => { if(o.material) o.material.needsUpdate = true; }); } } } else slowT = 0;
  }
  const steps = Math.max(1, Math.ceil(timeScale)), dt = rdt * timeScale / steps;
  for(let s = 0; s < steps; s++) step(dt);
  const cx = camera.position.x, cz = camera.position.z;
  W.animate(rdt, T, cx, cz); W.drawSharks(T); drawCrates(T);
  applyDay(G.started ? WS.d : .1, cx, cz); aimSun(G.started && !G.end ? (WS.ph === 'sail' ? WS.sail.x : P.x) : 0, G.started && !G.end ? (WS.ph === 'sail' ? WS.sail.z : P.z) : 20);
  updateParts(rdt);
  renderer.render(scene, camera);
  placeLabels();
  mpFrame(rdt);
}
function step(dt){
  T += dt;
  const inGame = G.started && !G.end && (state === 'play' || PANEL.includes(state));
  const live = inGame && (state === 'play' || mpActive());
  if(live){
    if(isHost()) hostTick(dt);
    else { WS.wt += dt; if(WS.ph === 'build') WS.d = (WS.d + dt / DIFF[okDiff(WS.diff)].day) % 1; }
    applyWorld();
    G.playT += dt;
    if(G.intro) stepIntro(dt);
    else if(state === 'play' && WS.ph === 'build' && G.tagged > 0) stepTagged(dt);
    else if(state === 'play' && WS.ph === 'build'){
      stepWalk(dt);
      if(wantZap){ wantZap = false; fireZap(); }
      if(wantA && !(P.act && P.act !== 'fish' && P.actT < P.actD * .7)){ wantA = false; doA(); }
      stepFishing(dt); stepHunger(dt);
    } else if(WS.ph === 'sail' && state === 'play') stepSailLocal(dt);
    else if(WS.ph === 'sail') stepSailLocal(0);
    stepBlaster(dt);
    poseMe(dt);
    if(G.tagged > 0 && WS.ph === 'build'){ heroM.grp.rotation.y = P.f + T * 9; heroM.body.rotation.z = Math.sin(T * 6) * .25; }
    if(WS.ph !== 'sail') islandSharks(dt);
    stepRemotes(dt);
    if(!G.intro) updateCamera(dt);
    if(camLockV){ camera.position.set(camLockV[0], camLockV[1], camLockV[2]); camera.lookAt(camLockV[3], camLockV[4], camLockV[5]); }
    if(state === 'play' && !G.intro) hudFrame();
    drawHint();
    const shore = Math.abs(W.distN(camera.position.x, camera.position.z) - 1);
    AU.sea(true, WS.ph === 'sail' ? .8 : clamp(1 - shore * 2.2, .2, 1));
  } else if(state === 'end' && G.end){ stepEnd(dt); applyWorld(); }
  else if(!inGame){
    menuT += dt; const a = menuT * .04 + 1.2;
    camera.position.set(Math.cos(a) * 92, 40 + Math.sin(menuT * .2) * 4, Math.sin(a) * 92); camera.lookAt(0, 0, 8);
    islandSharks(dt);
    if(heroM && state !== 'mp'){ heroM.grp.position.set(P.x, P.y, P.z); heroM.grp.rotation.y = P.f; poseHero(heroM, { t:T, dt, run:0, grounded:true, vy:0, sq:0, flip:0 }); }
    arrow.visible = marker.visible = false;
  }
}
function poseMe(dt){
  if(!heroM) return;
  const seat = WS.ph === 'sail' ? WS.aboard.indexOf(MP.id || 'me') : -1;
  if(WS.ph === 'sail' && seat < 0 && !isHost()){ /* not on the raft: just watch */ }
  if(WS.ph === 'sail'){
    const s = SEATS[Math.max(0, seat) % 4];
    if(heroM.grp.parent !== W.raft) W.raft.add(heroM.grp);
    heroM.grp.position.set(s[0], s[1], s[2]); heroM.grp.rotation.set(0, 0, 0);
    sitPose(heroM, T, P.paddle);
    return;
  }
  if(heroM.grp.parent !== scene && !G.end) scene.add(heroM.grp);
  P.t += dt; P.sq = lerp(P.sq, 0, Math.min(1, dt * 10));
  heroM.grp.position.set(P.x, P.y, P.z); heroM.grp.rotation.y = P.f;
  poseHero(heroM, { t:P.t, dt, run:P.m, grounded:P.gr || P.swim, vy:P.vy, sq:P.sq, flip:0 });
  if(P.swim) actPose(heroM, 'swim', 0, P.t);
  if(P.act){ P.actT += dt; if(P.actT >= P.actD){ P.act = null; } else actPose(heroM, P.act, P.actT / P.actD, P.t); }
}
function islandSharks(dt){
  W.SHARKS.forEach((s, i) => { const p = W.sharkPath(i, WS.wt || T); s.flee = Math.max(0, (s.flee || 0) - dt); s.fk = lerp(s.fk || 0, s.flee > 0 ? 1 : 0, Math.min(1, dt * 1.2)); const k = 1 + .55 * s.fk; s.x = p.x * k; s.z = p.z * k; s.h = p.h; s.dive = s.fk * .5; });
  if(bumpShark){
    const b = bumpShark, s = W.SHARKS[b.i]; b.t += dt;
    const k = b.t < .5 ? b.t / .5 : 1 - (b.t - .5) / 1.6;
    s.x = lerp(s.x, b.tx, clamp(k, 0, 1)); s.z = lerp(s.z, b.tz, clamp(k, 0, 1)); if(b.t < .6) s.h = Math.atan2(b.tx - b.x0, b.tz - b.z0);
    if(b.t > 2.1) bumpShark = null;
  }
}
document.addEventListener('visibilitychange', () => { if(document.hidden){ persist(); AU.sea(false); if(state === 'play' && !mpActive() && !G.intro) showPause(); } });
addEventListener('pagehide', () => { persist(); });

/* ======================================================================
   Online («👫 العب مع أصحابك»): 2–4 kids on one island. Nothing is stored on a server.
   Events: pos (each kid ~10×/s), ws (host: the world, every second and on changes), sl (host: the raft and sharks while sailing),
   ev (host: start / fx / sail / end), req (kid → host: chop, pick, build…), got (host → one kid: things for the bag),
   lob (lobby: the difficulty the host picked), hi (ask the host for the world).
   Names never travel: only the friend code (presence 'fc'); every phone asks the server for the name (../rt.js).
   ====================================================================== */
const MP_URL = 'https://vgpwtrzplggvlsuvqsas.supabase.co', MP_KEY = 'sb_publishable_D9thEhZlZnfn0t06j8h1Rw_H-LVF786';
const MP_EVENTS = ['pos', 'ws', 'sl', 'ev', 'req', 'got', 'lob', 'hi'];
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
    if(this.closed) throw new Error('cancelled');
    this.rt = window.BoboRT.open({ url:MP_URL, key:MP_KEY, topic:'bobo-survive-' + code, id, events:MP_EVENTS, eps:40, h });
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
    const bc = this.bc = new BroadcastChannel('bobo-survive-' + code);
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
const MP = { laser:true, t:null, id:null, code:null, list:[], players:[], meta:null, isHost:false, hostId:null, synced:false, screen:'off', tok:0, posT:0, lobT:0, inviteFor:null, typed:'', hostGone:0, diff:'normal' };
window.__boboRoom = () => (MP.t && MP.meta && MP.code) ? MP.code : null;
const mpActive = () => !!(MP.t && MP.meta);
const mpNewId = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
const mpSort = (a, b) => ((a.o || 0) - (b.o || 0)) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
const avPic = new Map();
function heroPic(hero, av){ if(hero !== 'me' || !av || !window.Avatar) return charImg(hero); const k = JSON.stringify(av); if(!avPic.has(k)){ try{ avPic.set(k, Avatar.portrait(av)); }catch(e){ avPic.set(k, charImg('sara')); } } return avPic.get(k); }

/* «أصحابي»: tell friends which room I'm in. The server may not know the game id: every call is guarded. */
const FR_GAME = 'survive';
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

function mpClose(){
  frRoom(null);
  if(MP.t){ try{ MP.t.close(); }catch(e){} }
  MP.t = null; MP.meta = null; MP.list = []; MP.players = []; MP.isHost = false; MP.hostId = null; MP.synced = false; MP.hostGone = 0;
  for(const id of [...RM.keys()]) dropRemote(id);
}
async function mpOpen(code, how){
  mpClose();
  const t = MP_LOCAL ? new LocalTransport() : new SupabaseTransport(), tok = ++MP.tok;
  MP.t = t; MP.code = code; MP.id = MP.id || mpNewId();
  const live = () => MP.t === t && MP.tok === tok;
  try{
    await t.open(code, MP.id, {
      presence:list => { if(live()) mpPresence(list); },
      msg:(ev, p) => { if(live() && p && typeof p === 'object' && typeof p.id === 'string') mpMsg(ev, p); },
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
  const used = new Set(others.map(p => p.c)); let c = 0; while(used.has(c)) c++;
  MP.meta = { fc:BoboRT.fc(), hero:heroId, av:myAv(), c, o:others.reduce((m, p) => Math.max(m, p.o || 0), 0) + 1, ph:'play' };
  t.track(MP.meta);
  MP.hostId = how === 'create' ? MP.id : others.slice().sort(mpSort)[0].id;
  mpPresence(MP.list);
  frRoom(code);
  return 'ok';
}
function mpTrack(){ if(MP.t && MP.meta){ MP.meta.hero = heroId; MP.meta.av = myAv(); MP.meta.fc = MP.meta.fc || BoboRT.fc(); MP.t.track(MP.meta); } }
function mpSend(ev, p){ if(MP.t && MP.meta) MP.t.send(ev, Object.assign({ id:MP.id }, p)); }
function mpPresence(list){
  list = (list || []).filter(p => p && p.ph !== 'probe');
  BoboRT.see(list, () => { if(MP.screen === 'lobby') mpLobbyDraw(); if(G.end && G.end.card) endCard(); });
  MP.list = list; MP.synced = true;
  if(!MP.meta) return;
  const all = list.filter(p => p.id !== MP.id).concat([Object.assign({}, MP.meta, { id:MP.id })]).sort(mpSort);
  if(all.findIndex(p => p.id === MP.id) >= MP_MAX){ coStop(); showTitle(); toast(L('الغرفة مليانة 🙈', 'The room is full 🙈', 'Oda dolu 🙈')); return; }
  const before = MP.players.map(p => p.id);
  MP.players = all.slice(0, MP_MAX);
  MP.isHost = MP.hostId === MP.id;
  if(!MP.isHost && MP.hostId && !MP.players.some(p => p.id === MP.hostId)){ if(!MP.hostGone) MP.hostGone = performance.now(); }
  else MP.hostGone = 0;
  const joined = MP.players.filter(p => p.id !== MP.id && !before.includes(p.id));
  if(joined.length && before.length) SFX.join();
  remoteSync(MP.players);
  // a friend who comes in while we play gets the island as it is now
  if(MP.isHost && MP.screen === 'in' && G.started && !G.end) for(const p of joined){ mpSend('ev', { k:'start', n:G.n, diff:WS.diff, lz:WS.laser, to:p.id, late:1 }); HT.snap = 0; }
  if(MP.screen === 'lobby') mpLobbyDraw();
}
function mpMsg(ev, p){
  if(ev === 'pos'){ onPos(p); return; }
  if(ev === 'req'){ if(MP.isHost && G.started && !G.end && MP.players.some(x => x.id === p.id)) hostReq(p.id, p); return; }
  if(ev === 'got'){ if(p.to === MP.id && (p.n | 0) === G.n && G.started && p.id === MP.hostId && p.items && typeof p.items === 'object') gotItems(p.items, p.why); return; }
  if(ev === 'hi'){ if(MP.isHost){ if(MP.screen === 'in' && G.started && !G.end){ if(p.late) mpSend('ev', { k:'start', n:G.n, diff:WS.diff, lz:WS.laser, to:p.id, late:1 }); HT.snap = 0; } else if(MP.screen === 'lobby') mpSend('lob', { diff:MP.diff, lz:MP.laser ? 1 : 0, ph:'idle' }); } MP.posT = 0; return; }
  if(p.id !== MP.hostId) return;                    // only the room owner decides
  if(ev === 'lob'){ if(!MP.isHost){ MP.diff = okDiff(p.diff); if(p.lz != null) MP.laser = !!p.lz; if(p.ph === 'idle' && (state === 'end' || MP.screen === 'in')){ MP.screen = 'lobby'; G.started = false; mpLobby(); } else if(MP.screen === 'lobby') mpLobbyDraw(); } return; }
  if(MP.isHost) return;
  if(ev === 'ws'){ if(G.started) unpackWS(p); return; }
  if(ev === 'sl'){ if(G.started) onSail(p); return; }
  if(ev !== 'ev') return;
  if(p.k === 'start') onStart(p);
  else if((p.n | 0) !== G.n || !G.started) return;
  else if(p.k === 'fx') onFx(p.f);
  else if(p.k === 'sail'){ if(Array.isArray(p.ab)) WS.aboard = p.ab.filter(x => typeof x === 'string').slice(0, 4); beginSailLocal(); }
  else if(p.k === 'end' && Array.isArray(p.team)){ if(p.tg && typeof p.tg === 'object'){ const t = {}; for(const k of Object.keys(p.tg).slice(0, 8)) if(/^[a-z0-9]{1,24}$/i.test(k)) t[k] = clamp(p.tg[k] | 0, 0, 999); WS.tags = t; } WS.dn = clamp(p.dn | 0, 1, 999); WS.raft.hp = numIn(p.hp, 0, 100, 100); showEnd(p.team.slice(0, 4).filter(m => m && typeof m.id === 'string').map(m => ({ id:m.id.slice(0, 24), hero:okHero(m.hero), av:m.hero === 'me' ? okAv(m.av) : null })), clamp(p.stars | 0, 1, 3)); }
}
function onStart(p){
  if(p.to && p.to !== MP.id) return;
  if(MP.screen !== 'lobby' && MP.screen !== 'in' && state !== 'end') return;
  if(G.started && (p.n | 0) === G.n && !G.end) return;
  MP.screen = 'in'; MP.diff = okDiff(p.diff); MP.laser = !!p.lz;
  beginGame(MP.diff, { online:true, n:p.n | 0, late:!!p.late, laser:MP.laser });
  mpSend('hi', {});
}
function coStart(){
  if(!MP.isHost || !mpActive()) return;
  const n = (G.n | 0) + 1;
  MP.screen = 'in';
  mpSend('ev', { k:'start', n, diff:MP.diff, lz:MP.laser ? 1 : 0 });
  beginGame(MP.diff, { online:true, n, laser:MP.laser });
}
function mpBackToLobby(){ if(!MP.isHost) return; G.started = false; mpLobby(); mpSend('lob', { diff:MP.diff, lz:MP.laser ? 1 : 0, ph:'idle' }); }
function mpFrame(dt){
  if(!mpActive()) return;
  if(MP.hostGone && performance.now() - MP.hostGone > 5000){
    MP.hostGone = 0; coStop(); showTitle();
    toast(L('صاحب الغرفة طلع 🚪 بتقدر تلعب لحالك أو تعمل غرفة جديدة', 'The room owner left 🚪 play alone or make a new room', 'Oda sahibi çıktı 🚪 tek başına oyna ya da yeni oda kur'), 5000);
    return;
  }
  MP.posT -= dt; MP.lobT -= dt; MP.fcT = (MP.fcT || 0) - dt;
  if(MP.meta && !MP.meta.fc && MP.fcT <= 0){
    MP.fcT = 2; const c = BoboRT.fc();
    if(c){ MP.meta.fc = c; MP.t.track(MP.meta); }
    else if(!MP.fcAsked && window.Friends && Friends.has && Friends.has()){ MP.fcAsked = true; try{ const q = Friends.me(); if(q && q.catch) q.catch(() => {}); }catch(e){} }
  }
  if(G.started && MP.screen === 'in' && MP.posT <= 0){
    MP.posT = .1;
    mpSend('pos', { n:G.n, x:r2(P.x), y:r2(P.y), z:r2(P.z), f:r2(P.f), m:r2(P.m), sw:P.swim ? 1 : 0, a:P.act || (G.end ? 'cheer' : ''), ax:G.axe, dz:G.tagged > 0 ? 1 : 0, bl:G.blaster ? 1 : 0, sx:r2(inp.sx || 0), pd:P.paddle > .8 ? 1 : 0 });
  }
  // a friend who opened the game while we were already playing asks for it
  if(!MP.isHost && MP.screen === 'lobby' && MP.lobT <= 0){ MP.lobT = 2; mpSend('hi', { late:1 }); }
  if(MP.isHost && MP.screen === 'lobby' && MP.lobT <= 0){ MP.lobT = 1; mpSend('lob', { diff:MP.diff, lz:MP.laser ? 1 : 0, ph:'idle' }); }
}
function coStop(){ MP.tok++; mpClose(); MP.screen = 'off'; }

/* ---------- lobby, keypad ---------- */
function mpCard(wide){ state = 'mp'; setPlayUI(false); showOverlay('dim'); card.className = 'card' + (wide ? ' wide' : ''); }
function mpMenu(){
  MP.tok++; mpClose(); MP.screen = 'menu'; resetScene(); mpCard(false); AU.music(false);
  card.innerHTML = `<h2>👫 ${L('العب مع أصحابك', 'Play with friends', 'Arkadaşlarla oyna')}</h2>
    <p>🏝️ ${L('لحتى 4 أصحاب على نفس الجزيرة: قطّعوا، اصنعوا، وابنوا الطوف سوا!', 'Up to 4 friends on the same island: chop, craft and build the raft together!', 'Aynı adada 4 arkadaşa kadar: birlikte kesin, üretin ve salı yapın!')}</p>
    ${myHeroBtn()}
    <div class="row"><button class="big-btn" id="bCreate">🏠 ${L('اعمل غرفة', 'Create room', 'Oda kur')}</button>
    <button class="big-btn mint" id="bJoin">🔢 ${L('فوت على غرفة', 'Join room', 'Odaya katıl')}</button></div>
    <div class="row"><button class="ghost-btn" id="bBack">↩️ ${L('رجوع', 'Back', 'Geri')}</button></div>`;
  $('#bMyHero').onclick = () => { SFX.tap(); showSelect('mp'); };
  $('#bCreate').onclick = () => { SFX.tap(); mpCreate(); };
  $('#bJoin').onclick = () => { SFX.tap(); mpKeypad(''); };
  $('#bBack').onclick = () => { SFX.tap(); showTitle(); };
}
function mpBack(){ if(MP.screen === 'menu') showTitle(); else if(MP.screen === 'lobby'){ mpLeave(); mpMenu(); } else mpMenu(); }
function mpLeave(){ MP.tok++; mpClose(); MP.screen = 'off'; }
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
  MP.screen = 'lobby'; resetScene(); mpCard(true); AU.music(false);
  mpLobbyDraw();
  if(MP.isHost) mpSend('lob', { diff:MP.diff, lz:MP.laser ? 1 : 0, ph:'idle' });
}
function mpLobbyDraw(){
  if(MP.screen !== 'lobby' || state !== 'mp') return;
  const pl = MP.players, code = [...(MP.code || '')].map(N).join('');
  const slots = [0, 1, 2, 3].map(i => { const p = pl[i]; if(!p) return `<div class="pslot empty"><div class="wt">⏳</div><small>${L('استنّى…', 'Waiting…', 'Bekle…')}</small></div>`;
    const hero = okHero(p.hero), mine = p.id === MP.id;
    return `<div class="pslot" style="--c:${HERO_COLOR[hero]}"><img src="${mine ? charImg(heroId) : heroPic(hero, okAv(p.av))}" alt=""><span dir="auto">${mine ? L('إنت', 'You', 'Sen') : ('👫 ' + BoboRT.whoH(p.id, '')).trim()}${p.id === MP.hostId ? ' 👑' : ''}</span></div>`; }).join('');
  const D = DIFF[MP.diff];
  card.innerHTML = `<h2>🏠 ${L('غرفة رقم', 'Room number', 'Oda numarası')} <bdi dir="ltr">${code}</bdi></h2>
    <div class="pslots">${slots}</div>
    ${MP.isHost ? `<p>${L('قلّ لأصحابك رقم الغرفة 👆 واختار الصعوبة:', 'Tell your friends the room number 👆 and pick how hard:', 'Arkadaşlarına oda numarasını söyle 👆 ve zorluğu seç:')}</p>
      ${diffCards(MP.diff)}
      <div class="row"><button class="ghost-btn" id="bLaser">⚡ ${L('ليزر بين الأصحاب', 'Laser tag between friends', 'Arkadaşlar arası lazer')}: ${MP.laser ? '✅ ' + L('تشغيل', 'On', 'Açık') : '⛔ ' + L('إيقاف', 'Off', 'Kapalı')}</button></div>
      <div class="row">${myHeroBtn()}<button class="big-btn" id="bStart">🏝️ ${L('ابدأ المغامرة', 'Start the adventure', 'Macerayı başlat')}</button><button class="ghost-btn" id="bLeave">🚪 ${L('اطلع', 'Leave', 'Çık')}</button></div>`
    : `<p>${D.e} ${L(...D.n)} · ⚡ ${MP.laser ? L('ليزر: تشغيل', 'Laser: on', 'Lazer: açık') : L('ليزر: إيقاف', 'Laser: off', 'Lazer: kapalı')} · ${L('استنّى صاحب الغرفة يبدأ…', 'Wait for the room owner to start…', 'Oda sahibinin başlatmasını bekle…')}</p>
      <div class="row">${myHeroBtn()}<button class="ghost-btn" id="bLeave">🚪 ${L('اطلع', 'Leave', 'Çık')}</button></div>`}`;
  if(MP.isHost){
    card.querySelectorAll('.diff').forEach(b => b.onclick = () => { MP.diff = okDiff(b.dataset.d); G.diff = MP.diff; SAVE.diff = MP.diff; persist(); SFX.tap(); mpSend('lob', { diff:MP.diff, lz:MP.laser ? 1 : 0, ph:'idle' }); mpLobbyDraw(); });
    $('#bStart').onclick = () => { AU.ac(); SFX.tap(); coStart(); };
    $('#bLaser').onclick = () => { MP.laser = !MP.laser; SFX.tap(); mpSend('lob', { diff:MP.diff, lz:MP.laser ? 1 : 0, ph:'idle' }); mpLobbyDraw(); };
  }
  $('#bMyHero').onclick = () => { SFX.tap(); showSelect('mp'); };
  $('#bLeave').onclick = () => { SFX.tap(); mpLeave(); mpMenu(); };
}
async function mpCreate(want){
  mpConnecting();
  MP.diff = G.diff;
  const limit = performance.now() + 20000;
  try{
    for(let i = 0; i < 4; i++){
      const code = i === 0 && /^\d{4}$/.test(want || '') ? String(want) : String(1000 + Math.floor(Math.random() * 9000));
      const r = await mpOpenRetry(code, 'create', limit);
      if(MP.screen !== 'connecting'){ if(r === 'ok') mpLeave(); return; }
      if(r === 'ok'){ mpLobby(); mpSendInvite(); return; }
    }
    throw new Error('busy');
  }catch(e){ MP.err = String(e && (e.stack || e.message)).slice(0, 400); if(MP.screen === 'connecting' && String(e && e.message) !== 'cancelled') mpError(() => mpCreate(want)); }
}
async function mpOpenRetry(code, how, until){
  for(;;){
    try{ return await mpOpen(code, how); }
    catch(e){ if(String(e && e.message) === 'cancelled' || MP.screen !== 'connecting' || performance.now() > until - 3000) throw e; await new Promise(r => setTimeout(r, 800)); if(MP.screen !== 'connecting') throw new Error('cancelled'); }
  }
}
async function mpJoin(code, until){
  mpConnecting();
  const limit = until || performance.now() + 20000;
  try{
    let r = await mpOpenRetry(code, 'join', limit);
    if(MP.screen !== 'connecting'){ if(r === 'ok') mpLeave(); return; }
    while(r === 'nobody' && until && performance.now() < until){
      await new Promise(res => setTimeout(res, 700)); if(MP.screen !== 'connecting') return;
      r = await mpOpenRetry(code, 'join', limit); if(MP.screen !== 'connecting'){ if(r === 'ok') mpLeave(); return; }
    }
    if(r === 'ok'){ mpLobby(); MP.lobT = 0; mpSend('hi', { late:1 }); }
    else if(r === 'full') mpKeypad(L('الغرفة مليانة', 'The room is full', 'Oda dolu') + ' 🙈');
    else mpKeypad(L('ما لقينا هالغرفة، تأكّد من الرقم', "We couldn't find that room — check the number", 'Bu oda bulunamadı, numarayı kontrol et'));
  }catch(e){ MP.err = String(e && (e.stack || e.message)).slice(0, 400); if(MP.screen === 'connecting' && String(e && e.message) !== 'cancelled') mpError(() => mpJoin(code)); }
}
/* «تعا العب» from the friends page: ?host=1&invite=<friendCode>. The server may not accept 'survive' yet: guarded. */
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
  MP.tok++; mpClose();
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

/* ======================================================================
   Test hook
   ====================================================================== */
window.__surv = {
  get state(){ return state; }, get phase(){ return WS.ph; }, get diff(){ return WS.diff; }, get n(){ return G.n; }, get intro(){ return !!G.intro; },
  get inv(){ const o = {}; for(const s of G.inv) if(s) o[s.k] = (o[s.k] || 0) + s.n; return o; }, get bag(){ return G.bag; }, get energy(){ return G.energy; }, get axe(){ return G.axe; }, get rod(){ return G.rod; },
  get me(){ return { x:r2(P.x), y:r2(P.y), z:r2(P.z), swim:P.swim, push:P.push, f:r2(P.f) }; }, get flags(){ return Object.assign({}, G.flags); },
  get ws(){ return JSON.parse(JSON.stringify(packWS())); }, get raft(){ return { st:WS.raft.st, have:Object.assign({}, WS.raft.have), hp:WS.raft.hp, ph:WS.ph, aboard:WS.aboard.slice(), p:WS.sail.p, x:WS.sail.x, z:WS.sail.z }; },
  get target(){ const t = findTarget(); return t ? { k:t.k, i:t.i, d:t.d } : null; }, get goal(){ const g = curGoal(); return g ? g.id : null; }, get night(){ return nightK; }, get day(){ return WS.d; },
  get end(){ return G.end ? { stars:G.end.stars, team:G.end.team.map(m => m.id), card:G.end.card, coins:G.coins } : null; }, get save(){ return JSON.parse(JSON.stringify(SAVE)); },
  get world(){ return { trees:W.TREES.map(t => ({ x:t.x, z:t.z })), picks:W.PICKS.map(p => ({ type:p.type, x:p.x, z:p.z })), bushes:W.BUSHES.map(b => ({ x:b.x, z:b.z })), palms:W.PALMS.map(p => ({ x:p.x, z:p.z })), crates:W.CRATE_SPOTS.map(c => ({ x:c.x, z:c.z })), raft:{ x:W.RAFT.x, z:W.RAFT.z }, fire:{ x:W.FIRE.x, z:W.FIRE.z }, tent:{ x:W.TENT.x, z:W.TENT.z }, plane:{ x:W.PLANE.x, z:W.PLANE.z }, spawn:{ x:W.SPAWN.x, z:W.SPAWN.z }, ship:W.SHIP }; },
  costs:d => ({ raft:RAFT_ST.map((_, i) => raftCost(i, d || WS.diff)), recipes:Object.fromEntries(RECIPES.map(r => [r.id, recipeCost(r, d || WS.diff)])) }),
  get remotes(){ return [...RM.values()].map(a => ({ id:a.id, seen:a.seen, x:r2(a.x), z:r2(a.z), name:a.lbl.hidden ? null : a.lbl.textContent, label:a.lbl.textContent, vis:!!(a.h && a.h.grp.visible) })); },
  get mpScreen(){ return MP.screen; }, get mp(){ return { code:MP.code, active:mpActive(), isHost:MP.isHost, hostId:MP.hostId, screen:MP.screen, id:MP.id, diff:MP.diff, players:MP.players.map(p => ({ id:p.id, hero:p.hero })) }; }, get mpErr(){ return MP.err || ''; },
  get fps(){ return fps; }, get calls(){ return renderer.info.render.calls; }, get tris(){ return renderer.info.render.triangles; },
  start:(d, o) => beginGame(d || 'normal', o || {}), skipIntro:() => endIntro(), menu:() => showTitle(), back:() => { if(state === 'mp') mpBack(); else if(state === 'select') backFromSelect(); else showTitle(); },
  tp:(x, z, f) => { P.x = x; P.z = z; P.y = W.terr(x, z); P.vx = P.vz = 0; if(f != null) P.f = f; snapCam = true; }, face:(x, z) => { P.f = Math.atan2(x - P.x, z - P.z); cam.yaw = P.f + Math.PI + .5; snapCam = true; },
  go:(x, z, r) => { testGo = x == null ? null : { x, z, r }; }, get going(){ return !!testGo; }, input:(x, y) => { testInput = x == null ? null : { x, y }; },
  A:() => { wantA = true; }, B:() => { wantB = true; }, doA:() => doA(), give:(k, n) => invAdd(k, n), take:(k, n) => invTake(k, n), craft:id => craft(id), eat:k => k ? eat(k) : eatBest(), setEnergy:v => { G.energy = v; },
  bag:() => showBag(), craftMenu:() => showCraft(), raftInfo:() => showRaftInfo(), close:() => closePanel(), pause:() => showPause(), noWalk:v => { testNoWalk = !!v; },
  speed:v => { timeScale = v; }, setDay:d => { WS.d = d; }, select:() => showSelect('menu'), diffMenu:() => showDiff(),
  shot:(x, y, z, lx, ly, lz) => { camera.position.set(x, y, z); camera.lookAt(lx, ly, lz); },
  camLock:v => { camLockV = v || null; }, clearBag:() => { G.inv = G.inv.map(() => null); hudKey = ''; }, giveBlaster:() => { G.blaster = true; G.bat = 5; hudKey = ''; }, zap:() => { wantZap = true; }, fireNow:() => fireZap(), get blaster(){ return { has:G.blaster, bat:G.bat, tagged:G.tagged, tags:Object.assign({}, WS.tags), laser:WS.laser, beams:beamsShown }; },
  get sharks(){ return W.SHARKS.map(s => ({ x:r2(s.x), z:r2(s.z), flee:r2(s.flee || 0) })); }, mpLaser:v => { MP.laser = !!v; mpSend('lob', { diff:MP.diff, lz:MP.laser ? 1 : 0, ph:'idle' }); mpLobbyDraw(); },
  mpMenu:() => mpMenu(), mpCreate:c => mpCreate(c), mpJoin:c => mpJoin(c), mpStart:() => coStart(), mpDiff:d => { MP.diff = okDiff(d); mpSend('lob', { diff:MP.diff, lz:MP.laser ? 1 : 0, ph:'idle' }); mpLobbyDraw(); }, mpLeave:() => { coStop(); showTitle(); }, mpAgain:() => mpBackToLobby()
};

/* ---------- boot ---------- */
setHero(heroId);
resize();
showTitle();
requestAnimationFrame(frame);
/* ?host=1 (&room=<4 digits>, &invite=<friendCode>, &accept=<id> for invitepop.js) makes a room; ?join=<room> joins one
   (it keeps trying for 20 s while nobody is there yet) */
(function(){
  const join = QS.get('join'), host = QS.get('host') === '1', inv = QS.get('invite'), room = QS.get('room');
  if(!/^\d{4}$/.test(join || '') && !host) return;
  const q = new URLSearchParams(location.search); ['join', 'host', 'invite', 'room'].forEach(k => q.delete(k));
  try{ history.replaceState(history.state, '', location.pathname + (q.toString() ? '?' + q : '') + location.hash); }catch(e){}
  if(/^\d{4}$/.test(join || '')) mpJoin(join, performance.now() + 20000);
  else { MP.inviteFor = /^[A-Z2-9]{6}$/.test(inv || '') ? inv : null; mpCreate(/^\d{4}$/.test(room || '') ? room : null); }
})();
