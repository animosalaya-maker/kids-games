/* «بيت عمّو زعلان» — Uncle Grumpy's House (3D). Our own prank game with our neighbour «عمّو زعلان» from the 2D «مقالب» game.
   10 short prank missions: each asks for 2–4 pranks in one part of the house or the garden. Find the item, put it at the prank
   spot, then hide and watch: the uncle follows his daily routine (paper in the armchair, tea, phone, slippers, bath, watering
   the gnome, a nap in the hammock…) and when he reaches a set prank, the camera cuts to a big funny reaction with a comic word
   and stars. Noise makes him come and look, if he sees you he chases (he is slower than you), hide in wardrobes, under beds,
   behind curtains or in big bushes. If he catches you he just carries you out to the garden gate: «هيييي! برّا!».
   Online co-op («👫 العب مع أصحابك», 2–4 kids): the room owner (host) runs the uncle, the items and the pranks; the friends send
   what they do and follow the host's state (same pattern as «بيت الجدّة نونا»). See «Online co-op» near the end. */
import * as THREE from '../adventure3d/three.module.min.js';
import { makeKit } from '../worlds/kit.js';
import { buildHouse, LY, roundBox } from './house.js';
import { makeUncle, poseUncle } from './uncle.js';
import { makePranks } from './props.js';
import { makeAudio } from './audio.js';

const $ = s => document.querySelector(s);
const L = window.L || ((a) => a);
const N = n => (window.I18N ? I18N.num(n) : String(n));
const rawGet = k => { try{ return localStorage.getItem(k); }catch(e){ return null; } };
const rawSet = (k, v) => { try{ localStorage.setItem(k, v); }catch(e){} };
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const angDiff = (a, b) => { let d = a - b; while(d > Math.PI) d -= Math.PI * 2; while(d < -Math.PI) d += Math.PI * 2; return d; };
const pick = a => a[Math.floor(Math.random() * a.length)];
const shuffle = a => { for(let i = a.length - 1; i > 0; i--){ const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const RTL = (window.I18N ? I18N.dir : 'rtl') === 'rtl';
const K = makeKit(THREE, { rim:.38 });
const { HEROES, HERO_IDS, HERO_NAME, HERO_COLOR, poseHero, glowTex, canvasTex } = K;
const A = makeAudio(), SFX = A.SFX;
const charImg = id => '../worlds/chars/' + (HEROES[id] ? id : 'sara') + '.png';
const QS = new URLSearchParams(location.search);
const MP_LOCAL = QS.get('mp') === 'local';
const UNCLE = L('عمّو زعلان', 'Uncle Grumpy', 'Somurtkan Amca');
/* co-op run in progress (set by the online part) */
const R = { co:false, n:0 };
let isHostCo = () => false;
const aiHere = () => !R.co || isHostCo();

const SPD = { sneak:1.75, walk:3.3, run:4.8 };
const UNC = { go:1.55, curious:1.9, chase:2.75, sight:7.5, spot:.6, lose:3.2, chaseMax:15, catchR:.95 };
const GATE = { x:.5, z:-14.6 }, GATE_U = { x:.5, z:-13.3 };
let heroId = HEROES[rawGet('prank3d_hero')] ? rawGet('prank3d_hero') : 'sara';

/* ---------- always-landscape stage (rotated layer, never screen.orientation.lock) ---------- */
const stage = $('#stage'), saProbe = $('#saProbe');
let ROT = false, VW = innerWidth, SW = innerWidth, SH = innerHeight, SAL = 0, SAB = 0;
function layout(){
  VW = innerWidth; const vh = innerHeight; ROT = vh > VW;
  SW = ROT ? vh : VW; SH = ROT ? VW : vh;
  const st = stage.style; st.width = SW + 'px'; st.height = SH + 'px';
  st.transform = ROT ? `translateX(${VW}px) rotate(90deg)` : 'none';
  st.setProperty('--sw', SW + 'px'); st.setProperty('--sh', SH + 'px');
  stage.classList.toggle('rot', ROT); stage.classList.toggle('short', SH <= 520);
  SAL = saProbe.offsetWidth; SAB = saProbe.offsetHeight;
}
const toLayer = (cx, cy) => ROT ? { x:cy, y:VW - cx } : { x:cx, y:cy };
layout();

/* ---------- renderer, lights (a warm late-afternoon: bright garden, cosy lamp-lit rooms, a dimmer hallway) ---------- */
const canvas = $('#cv');
let renderer;
try{ renderer = new THREE.WebGLRenderer({ canvas, antialias:true, powerPreference:'high-performance' }); }
catch(e){ $('#nogl').hidden = false; $('#overlay').hidden = true; throw e; }
let dpr = Math.min(window.devicePixelRatio || 1, 1.5), quality = 2;
renderer.setPixelRatio(dpr);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0xc9a7c8, 50, 170);
const camera = new THREE.PerspectiveCamera(62, 1, .05, 700);
const hemi = new THREE.HemisphereLight(0xfff2e0, 0x8f8a9a, 1.85); scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffe0b0, 1.35);
sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024);
Object.assign(sun.shadow.camera, { left:-7.5, right:7.5, top:7.5, bottom:-7.5, near:.45, far:5.5 }); sun.shadow.camera.updateProjectionMatrix();
sun.shadow.bias = -.0008; sun.shadow.normalBias = .03; sun.shadow.radius = 2;
scene.add(sun, sun.target);
function resize(){ layout(); renderer.setSize(SW, SH, false); camera.aspect = SW / SH; camera.updateProjectionMatrix(); placeJoyHome(); if(state === 'title' || state === 'levels') setTitleView(true); }
addEventListener('resize', resize);
addEventListener('orientationchange', () => setTimeout(resize, 120));

/* ---------- the house, the pranks ---------- */
const H = buildHouse(THREE, K, scene, renderer);
const { HIDES, SPOTS, VASES } = H;
H.paintSky(.42); H.sunSpr.visible = true; H.sunSpr.position.set(-90, 45, -200); H.sunSpr.material.color.set(0xffc27a);
const _v = new THREE.Vector3(), _v2 = new THREE.Vector3(), _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _s = new THREE.Vector3(), _c = new THREE.Color(), _e = new THREE.Euler();
const RB = roundBox(THREE, 4, .25);
let T = 0;
const FX = { burst:(...a) => burst(...a), sfx:n => { if(SFX[n]) SFX[n](); } };
const PK = makePranks(THREE, K, scene, H, FX);
const PRANKS = PK.PRANKS, PBY = PK.byId;
// static vases on their stands
function makeVase(col){
  const pts = [[0, 0], [.09, 0], [.13, .08], [.14, .18], [.09, .3], [.06, .36], [.08, .42]].map(([r, y]) => new THREE.Vector2(r, y));
  const g = new THREE.Group(); const v = new THREE.Mesh(new THREE.LatheGeometry(pts, 20), new THREE.MeshLambertMaterial({ color:col, side:THREE.DoubleSide })); v.castShadow = true; g.add(v);
  const F = new K.Merge(); F.add(K.CG.cyl, 0, .55, 0, .008, .3, .008, 0, 0, .1, 0x3f9a45).add(K.CG.sm, .02, .7, 0, .06, .06, .06, 0, 0, 0, 0xffffff).add(K.CG.sm, -.04, .64, .03, .05, .05, .05, 0, 0, 0, 0xff8fb8).add(K.CG.sm, .05, .6, -.03, .05, .05, .05, 0, 0, 0, 0xffcd4d);
  g.add(new THREE.Mesh(F.geometry(), new THREE.MeshLambertMaterial({ vertexColors:true }))); return g;
}
VASES.forEach(v => { const m = makeVase(v.col); m.position.set(v.x, v.y, v.z); scene.add(m); });

/* ---------- interior doors: they swing open by themselves when someone walks through (creeeak!) ---------- */
const DOORS = [];
{
  const cols = [0xf2e6d8, 0xd9b48a, 0xc9b8e8, 0xb9e0c8];
  H.DOORS.forEach((d, i) => {
    const hinge = new THREE.Group(), M = new K.Merge(), w = 1.3, col = cols[i % cols.length];
    M.add(K.G.box, 0, 1.12, w / 2, .06, 2.22, w, 0, 0, 0, col).add(K.G.box, .035, 1.6, w / 2, .02, .7, w - .3, 0, 0, 0, new THREE.Color(col).multiplyScalar(.9).getHex()).add(K.G.box, .035, .6, w / 2, .02, .7, w - .3, 0, 0, 0, new THREE.Color(col).multiplyScalar(.9).getHex())
      .add(K.G.sm, .06, 1.05, w - .12, .05, .05, .05, 0, 0, 0, 0xe2b33c).add(K.G.sm, -.06, 1.05, w - .12, .05, .05, .05, 0, 0, 0, 0xe2b33c);
    const m = new THREE.Mesh(M.geometry(), new THREE.MeshLambertMaterial({ vertexColors:true })); m.castShadow = true; hinge.add(m);
    const y = LY[d.lv];
    if(d.ax === 'x'){ hinge.position.set(d.x, y, d.z - .66); }
    else { hinge.position.set(d.x - .66, y, d.z); hinge.rotation.y = Math.PI / 2; }
    scene.add(hinge);
    DOORS.push({ d, hinge, base:hinge.rotation.y, a:0, tgt:0, idle:0, x:d.x, z:d.z, y });
  });
}
function updateDoors(dt){
  const who = [];
  if(GS && state !== 'title' && state !== 'levels'){ who.push({ x:P.x, y:P.y, z:P.z, me:true, quiet:P.mode === 'sneak' || P.mode === 'still' }); if(G.mode !== 'sleepTitle') who.push({ x:G.vx, y:G.vy, z:G.vz, uncle:true }); for(const a of PEERS.values()) if(a.h && a.h.grp.visible) who.push({ x:a.x, y:a.y, z:a.z }); }
  for(const D of DOORS){
    let best = null, bd = 1.35;
    for(const w of who){ if(Math.abs(w.y - D.y) > 1) continue; const dd = Math.hypot(w.x - D.x, w.z - D.z); if(dd < bd){ bd = dd; best = w; } }
    if(best){
      D.idle = 0;
      if(Math.abs(D.tgt) < .1){
        const side = D.d.ax === 'x' ? Math.sign(best.x - D.x) || 1 : Math.sign(best.z - D.z) || 1;
        D.tgt = (D.d.ax === 'x' ? side : -side) * 1.5;
        if(best.me){ SFX.creakDoor(); if(!best.quiet && GS && state === 'play') makeNoise(D.x, D.y, D.z, 4.5, 'door', true); }
        else if(Math.hypot(P.x - D.x, P.z - D.z) < 7 && Math.abs(P.y - D.y) < 1.5) SFX.creakDoor();
      }
    } else { D.idle += dt; if(D.idle > 1.6) D.tgt = 0; }
    D.a += (D.tgt - D.a) * Math.min(1, dt * 5);
    D.hinge.rotation.y = D.base + D.a;
  }
}

/* ---------- characters ---------- */
let hero = null;
function setHero(id){ if(hero) scene.remove(hero.grp); hero = K.shadowHero(HEROES[id]()); scene.add(hero.grp); hero.grp.add(holder); }
const holder = new THREE.Group(); holder.position.set(0, .62, .34);
const uncle = makeUncle(THREE, K); scene.add(uncle.grp);

/* ---------- sprites: !, ?, z ---------- */
function textSprite(txt, col, size = 1){
  const t = canvasTex(128, 128, (x) => { x.font = '900 92px system-ui, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.lineWidth = 14; x.strokeStyle = '#2a1f4a'; x.strokeText(txt, 64, 70); x.fillStyle = col; x.fillText(txt, 64, 70); });
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map:t, transparent:true, depthWrite:false, depthTest:false })); s.scale.set(size, size, 1); s.renderOrder = 10; s.visible = false; scene.add(s); return s;
}
const excl = textSprite('!', '#ff5d73', .9), ques = textSprite('?', '#ffcd4d', .85);
const zzz = [0, 1, 2].map(i => textSprite('z', '#bfe1ff', .4 + i * .12));
const starSpr = [0, 1, 2, 3, 4].map(() => textSprite('★', '#ffd23f', .7));

/* ---------- particles ---------- */
const PMAX = 420, parts = [];
const pMesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(.12, .07), new THREE.MeshBasicMaterial({ side:THREE.DoubleSide }), PMAX);
pMesh.frustumCulled = false; scene.add(pMesh);
for(let i = 0; i < PMAX; i++){ parts.push({ life:0 }); pMesh.setColorAt(i, _c.set(0xffffff)); _m.makeScale(0, 0, 0); pMesh.setMatrixAt(i, _m); }
let pNext = 0;
/* o.dir (+o.spread): a heading (atan2(dx, dz) style) instead of all around */
function burst(x, y, z, n, colors, o = {}){
  for(let k = 0; k < n; k++){
    const p = parts[pNext], i = pNext; pNext = (pNext + 1) % PMAX;
    const sp = (o.speed || 2) * (.4 + Math.random());
    let vx, vz; if(o.dir != null){ const a = o.dir + (Math.random() - .5) * 2 * (o.spread || .4); vx = Math.sin(a) * sp; vz = Math.cos(a) * sp; } else { const a = Math.random() * 6.283; vx = Math.cos(a) * sp; vz = Math.sin(a) * sp; }
    Object.assign(p, { life:(o.life || 1.6) * (.6 + Math.random() * .6), x, y, z, vx, vz, vy:(o.up || 2) * (.5 + Math.random()), g:o.g != null ? o.g : 3, drag:o.drag || 1.5, rx:Math.random() * 6, ry:Math.random() * 6, spin:(Math.random() - .5) * 10, s:(o.size || 1) * (.7 + Math.random() * .6), sway:o.sway || 0, ph:Math.random() * 6 });
    pMesh.setColorAt(i, _c.set(pick(colors)));
  }
  pMesh.instanceColor.needsUpdate = true;
}
function updateParts(dt){
  for(let i = 0; i < PMAX; i++){
    const p = parts[i]; if(p.life <= 0) continue;
    p.life -= dt; p.vy -= p.g * dt; const dk = Math.exp(-p.drag * dt); p.vx *= dk; p.vz *= dk; if(p.g < 4 && p.g > 0) p.vy = Math.max(p.vy, -1.1);
    p.x += (p.vx + Math.sin(T * 3 + p.ph) * p.sway) * dt; p.y += p.vy * dt; p.z += p.vz * dt; p.rx += p.spin * dt; p.ry += p.spin * .7 * dt;
    const s = p.life > 0 ? p.s * Math.min(1, p.life * 2) : 0;
    _m.compose(_v.set(p.x, p.y, p.z), _q.setFromEuler(_e.set(p.rx, p.ry, 0)), _s.set(s, s, s)); pMesh.setMatrixAt(i, _m);
  }
  pMesh.instanceMatrix.needsUpdate = true;
}
/* noise rings */
const rings = [];
for(let i = 0; i < 6; i++){ const m = new THREE.Mesh(new THREE.RingGeometry(.86, 1, 48).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color:0xffffff, transparent:true, opacity:0, depthWrite:false })); m.visible = false; m.renderOrder = 3; scene.add(m); rings.push({ m, t:9, R:1 }); }
let ringNext = 0;
function ring(x, y, z, Rr, col){ const r = rings[ringNext]; ringNext = (ringNext + 1) % rings.length; r.t = 0; r.R = Rr; r.m.position.set(x, y + .06, z); r.m.material.color.set(col || 0xfff3a0); r.m.visible = true; }
function updateRings(dt){ for(const r of rings){ if(!r.m.visible) continue; r.t += dt; const k = r.t / .9; if(k >= 1){ r.m.visible = false; continue; } const s = .3 + k * Math.min(r.R, 9) * .55; r.m.scale.set(s, 1, s); r.m.material.opacity = (1 - k) * .85; } }

/* ---------- the missions ---------- */
const LEVELS = [
  { e:'🛋️', n:L('مفاجأة الصالون', 'Living-room surprise', 'Salon sürprizi'), pr:['whoopee', 'phone'], fill:['tea'], area:['living', 'hall'] },
  { e:'🥣', n:L('فطور عمّو', "Uncle's breakfast", 'Amca\'nın kahvaltısı'), pr:['cereal', 'tea'], fill:['whoopee'], area:['kitchen', 'hall'] },
  { e:'🩴', n:L('غرفة النوم', 'The bedroom', 'Yatak odası'), pr:['slippers', 'fan'], fill:['tonic'], area:['uncle', 'landing', 'kids'] },
  { e:'🛁', n:L('وقت الحمّام', 'Bath time', 'Banyo vakti'), pr:['bath', 'tonic'], fill:['slippers'], area:['bath', 'kids', 'landing'] },
  { e:'🌻', n:L('الحديقة', 'The garden', 'Bahçe'), pr:['gnome', 'hammock'], fill:['mat'], area:['garden'] },
  { e:'🫧', n:L('يوم الغسيل', 'Laundry day', 'Çamaşır günü'), pr:['wash', 'mat'], fill:['cake'], area:['basement', 'hall', 'kitchen'] },
  { e:'🎂', n:L('عيد ميلاد عمّو', "Uncle's birthday", 'Amca\'nın doğum günü'), pr:['cake', 'tea', 'whoopee'], fill:['phone'], area:['kitchen', 'living', 'hall'] },
  { e:'🛖', n:L('الكوخ والقزم', 'The shed and the gnome', 'Kulübe ve cüce'), pr:['shed', 'gnome', 'mat'], fill:['hammock'], area:['garden', 'hall'] },
  { e:'☀️', n:L('صباح مجنون', 'Crazy morning', 'Çılgın sabah'), pr:['cereal', 'slippers', 'tonic'], fill:['fan'], area:['kitchen', 'uncle', 'bath', 'landing'] },
  { e:'🏆', n:L('ملك المقالب', 'Prank King', 'Şaka Kralı'), pr:['cake', 'whoopee', 'hammock', 'shed'], fill:[], area:['garden', 'living', 'kitchen', 'hall'] }
];
const PAR = lv => 55 + LEVELS[lv].pr.length * 35;
/* saved progress: best stars per mission (and coins already given per mission) */
function loadProg(){ try{ const o = JSON.parse(rawGet('prank3d_prog') || '{}'); return { s:Array.isArray(o.s) ? o.s.map(v => clamp(v | 0, 0, 3)) : [], c:Array.isArray(o.c) ? o.c.map(v => clamp(v | 0, 0, 12)) : [] }; }catch(e){ return { s:[], c:[] }; } }
let PROG = loadProg();
const saveProg = () => rawSet('prank3d_prog', JSON.stringify(PROG));
const starsOf = i => PROG.s[i] | 0;
const unlocked = i => i === 0 || starsOf(i - 1) > 0 || i < 3;
const totalStars = () => PROG.s.reduce((a, b) => a + (b | 0), 0);

/* item places in the house: every surface spot of the house + places on the grass */
const ISPOTS = (() => { const out = []; for(const s of [...SPOTS.jar, ...SPOTS.pliers, ...SPOTS.note, ...SPOTS.garden]) if(!out.some(o => o.lv === s.lv && Math.hypot(o.x - s.x, o.z - s.z) < .4)) out.push(s); return out; })();

/* ---------- game state ---------- */
let state = 'boot', menuT = 0, levelI = +rawGet('prank3d_last') || 0;
const P = { x:0, y:0, z:0, vx:0, vz:0, face:0, move:0, mode:'walk', crouch:false, hidden:null, stepT:0, noiseT:0, fullT:0 };
const G = { x:0, y:0, z:0, face:0, vx:0, vy:0, vz:0, vf:0, pose:'', mode:'go', t:0, path:[], tgt:null, ri:0, sid:-1, lastSeen:null, lostT:0, spotT:0, chaseT:0, speed:0, stuck:0, act:'walk', actK:0, lastPathT:0, kid:'', react:-1 };
let GS = null, held = -1, fp = false;

/* a mission's random layout (indices only, so the host can send it to the friends) */
function makePlan(lv){
  const L0 = LEVELS[lv], used = [];
  const prs = L0.pr.map(id => PBY[id]);
  const okSpot = s => prs.every(p => Math.hypot(p.spot.x - s.x, p.spot.z - s.z) > 1.6 || p.lv !== s.lv) && used.every(u => u.lv !== s.lv || Math.hypot(u.x - s.x, u.z - s.z) > 2.2);
  const items = prs.map(p => {
    let cand = ISPOTS.filter(s => L0.area.includes(s.room) && okSpot(s));
    const other = cand.filter(s => s.room !== p.area[0] && !used.some(u => u.room === s.room));
    const s = pick(other.length ? other : cand.length ? cand : ISPOTS.filter(okSpot).length ? ISPOTS.filter(okSpot) : ISPOTS);
    used.push(s); return ISPOTS.indexOf(s);
  });
  return { lv, items };
}
function okPlan(p){
  try{
    if(!p || !Number.isInteger(p.lv) || p.lv < 0 || p.lv >= LEVELS.length || !Array.isArray(p.items) || p.items.length !== LEVELS[p.lv].pr.length) return null;
    if(!p.items.every(v => Number.isInteger(v) && v >= 0 && v < ISPOTS.length)) return null;
    return { lv:p.lv, items:p.items.slice() };
  }catch(e){ return null; }
}
function newRun(plan){
  plan = plan || makePlan(levelI);
  levelI = plan.lv;
  const L0 = LEVELS[plan.lv];
  GS = { lv:plan.lv, plan, t:0, caught:0, over:false, result:null, stats:{ noise:0 },
    pr:L0.pr.map((id, i) => { const s = ISPOTS[plan.items[i]]; return { id, p:PBY[id], st:'world', x:s.x, y:s.y, z:s.z, home:s, by:'' }; }),
    routine:[...L0.fill, ...L0.pr] };
  PRANKS.forEach(p => p.reset());
  syncFixtures();
  itemMeshes();
  held = -1; meSafe = 0;
  placeAtGate(true);
  startUncle();
}
function startUncle(){
  const p = PBY[GS.routine[0]];
  G.ri = 0; G.sid = p.i; G.mode = 'act'; G.t = 0; G.x = p.stand.x; G.z = p.stand.z; G.y = p.stand.y; G.face = p.stand.f; G.path = []; G.tgt = null; G.spotT = 0; G.chaseT = 0; G.kid = ''; G.react = -1;
  G.act = p.act; poseAt(p, false);
}
let gateOff = () => [0, 0];             // co-op: each kid has a spot of their own (online part)
function placeAtGate(snap){
  const o = gateOff(); P.x = GATE.x + o[0]; P.z = GATE.z + o[1]; P.y = 0; P.vx = P.vz = 0; P.face = 0; P.hidden = null; P.move = 0; P.crouch = false;
  if(hero) hero.grp.visible = true;
  cam.yaw = P.face + Math.PI; cam.pitch = .36; if(snap) snapCam = true; peek(null);
}

/* ---------- item meshes (one per prank in the mission) ---------- */
let IM = [];
function itemMeshes(){
  IM.forEach(o => { if(o.mesh.parent) o.mesh.parent.remove(o.mesh); scene.remove(o.spr); });
  IM = GS.pr.map(r => { const mesh = PK.ITEM[r.p.item](); mesh.traverse(o => { if(o.isMesh) o.castShadow = true; }); scene.add(mesh);
    const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map:glowTex, color:0xfff1a0, transparent:true, depthWrite:false, blending:THREE.AdditiveBlending })); spr.scale.set(.7, .7, 1); scene.add(spr); return { mesh, spr }; });
}
// glowing ring at the spot for the item you carry
const spotRing = new THREE.Mesh(new THREE.TorusGeometry(.42, .05, 8, 40).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({ color:0xffe27a, transparent:true, opacity:.9, depthWrite:false })); spotRing.visible = false; spotRing.renderOrder = 4; scene.add(spotRing);
const spotGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map:glowTex, color:0xffd36a, transparent:true, depthWrite:false, blending:THREE.AdditiveBlending })); spotGlow.scale.set(1.2, 1.2, 1); spotGlow.visible = false; scene.add(spotGlow);
// hint arrow over the head
const arrow = new THREE.Group();
{ const mat = new THREE.MeshLambertMaterial({ color:0xffcd4d, emissive:0x8a5a00 }); const head = new THREE.Mesh(new THREE.ConeGeometry(.2, .36, 16), mat); head.rotation.x = Math.PI / 2; head.position.z = .3; const tail = new THREE.Mesh(new THREE.CylinderGeometry(.07, .07, .4, 12), mat); tail.rotation.x = Math.PI / 2; arrow.add(head, tail); arrow.visible = false; scene.add(arrow); }
/* the fixtures follow the shared prank states */
function syncFixtures(){
  if(!GS) return;
  for(const r of GS.pr){ if(cine && cine.i === r.p.i) continue; if(r.st === 'set') r.p.set(true); else if(r.st === 'done'){ r.p.set(false); r.p.done(); } else r.p.set(false); }
  const m = {}; for(const r of GS.pr) if(r.st === 'done' && r.p.mark && !(G.mode === 'react' && G.react === r.p.i)) m[r.p.mark] = true;
  if(G.mode === 'react' && G.react >= 0 && PRANKS[G.react].mark && G.actK > .35) m[PRANKS[G.react].mark] = true;
  uncle.marks(m);
}

/* ---------- input ---------- */
const joy = { x:0, y:0, id:null, ox:0, oy:0 }, look = { id:null, x:0, y:0, t:0 };
const joyEl = $('#joy'), knob = $('#knob'), actBtn = $('#btnAct'), bBtn = $('#btnB');
let joyHome = [90, 0];
function placeJoyHome(){ joyHome = [Math.max(86, SAL + 80), SH - Math.max(96, SH * .2) - SAB * .5]; if(joy.id == null) setJoy(joyHome[0], joyHome[1]); }
function setJoy(x, y){ joyEl.style.left = x + 'px'; joyEl.style.top = y + 'px'; }
const touch = $('#touch'), keys = {};
touch.addEventListener('pointerdown', e => {
  if(state !== 'play') return;
  e.preventDefault(); A.ac();
  const p = toLayer(e.clientX, e.clientY);
  if(p.x < SW * .45 && joy.id == null && !P.hidden){ joy.id = e.pointerId; joy.ox = clamp(p.x, Math.max(72, SAL + 66), SW * .45); joy.oy = clamp(p.y, 130, SH - 72); setJoy(joy.ox, joy.oy); joyEl.classList.add('on'); moveJoy(p.x, p.y); }
  else if(look.id == null){ look.id = e.pointerId; look.x = p.x; look.y = p.y; }
  try{ touch.setPointerCapture(e.pointerId); }catch(err){}
});
function moveJoy(x, y){ let dx = x - joy.ox, dy = y - joy.oy; const d = Math.hypot(dx, dy), m = 54; if(d > m){ dx *= m / d; dy *= m / d; } knob.style.transform = `translate(${dx}px,${dy}px)`; joy.x = dx / m; joy.y = dy / m; }
touch.addEventListener('pointermove', e => {
  const p = toLayer(e.clientX, e.clientY);
  if(e.pointerId === joy.id) moveJoy(p.x, p.y);
  else if(e.pointerId === look.id){ const dx = p.x - look.x, dy = p.y - look.y; look.x = p.x; look.y = p.y; look.t = T;
    if(P.hidden){ cam.peekY = clamp(cam.peekY - dx * .006, -.8, .8); cam.peekP = clamp(cam.peekP + dy * .004, -.35, .35); }
    else { cam.yaw -= dx * .0075; if(fp) cam.fpPitch = clamp(cam.fpPitch - dy * .004, -.7, .6); else cam.pitch = clamp(cam.pitch + dy * .004, .05, .95); } }
});
function endPtr(e){ if(e.pointerId === joy.id){ joy.id = null; joy.x = joy.y = 0; knob.style.transform = ''; joyEl.classList.remove('on'); setJoy(...joyHome); } if(e.pointerId === look.id) look.id = null; }
touch.addEventListener('pointerup', endPtr); touch.addEventListener('pointercancel', endPtr);
function btn(el, fn){ el.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); A.ac(); el.classList.add('on'); fn(); }); ['pointerup', 'pointercancel', 'pointerleave'].forEach(t => el.addEventListener(t, () => el.classList.remove('on'))); }
btn(actBtn, () => doAction());
btn(bBtn, () => doB());
$('#btnPause').onclick = () => { SFX.tap(); showPause(); };
$('#btnEye').onclick = () => { fp = !fp; SFX.tap(); $('#btnEye').classList.toggle('lit', fp); snapCam = true; };
$('#btnSnd').onclick = () => { A.setMuted(!A.muted); $('#btnSnd').textContent = A.muted ? '🔇' : '🔊'; if(!A.muted) SFX.tap(); };
const KEYMAP = { KeyW:'f', ArrowUp:'f', KeyS:'b', ArrowDown:'b', KeyA:'l', ArrowLeft:'l', KeyD:'r', ArrowRight:'r', KeyQ:'cl', KeyE:'cr', ShiftLeft:'run', ShiftRight:'run' };
addEventListener('keydown', e => {
  if(KEYMAP[e.code]){ keys[KEYMAP[e.code]] = true; e.preventDefault(); }
  if((e.code === 'Space' || e.code === 'Enter') && state === 'play' && !e.repeat){ doAction(); e.preventDefault(); }
  if((e.code === 'KeyC' || e.code === 'KeyB' || e.code === 'ControlLeft') && state === 'play' && !e.repeat) doB();
  if(e.code === 'KeyV' && state === 'play') $('#btnEye').click();
  if((e.code === 'Escape' || e.code === 'KeyP') && state === 'play') showPause();
});
addEventListener('keyup', e => { if(KEYMAP[e.code]) keys[KEYMAP[e.code]] = false; });
addEventListener('blur', () => { for(const k in keys) keys[k] = false; });
document.addEventListener('visibilitychange', () => { if(document.hidden && state === 'play') showPause(); if(document.hidden) A.music(false); });
function clearInput(){ joy.id = null; joy.x = joy.y = 0; look.id = null; knob.style.transform = ''; joyEl.classList.remove('on'); for(const k in keys) keys[k] = false; }

/* ---------- camera ---------- */
const cam = { yaw:0, pitch:.36, dist:3.2, fpPitch:-.05, peekY:0, peekP:0 };
let snapCam = true, camOverride = null;
const camPos = new THREE.Vector3(), camLook = new THREE.Vector3();
function updateCamera(dt){
  if(P.hidden){
    const h = P.hidden; const base = Math.atan2(h.look.x - h.cam.x, h.look.z - h.cam.z) + cam.peekY;
    camera.position.set(h.cam.x, h.cam.y, h.cam.z);
    camera.lookAt(h.cam.x + Math.sin(base) * 3, h.cam.y + (h.look.y - h.cam.y) + cam.peekP * 3, h.cam.z + Math.cos(base) * 3);
    return;
  }
  if(fp){
    const ey = P.y + (hero && hero.type === 'qamar' ? .85 : .98) - (P.crouch ? .2 : 0);
    camera.position.set(P.x - Math.sin(cam.yaw) * .1, ey, P.z - Math.cos(cam.yaw) * .1);
    camera.lookAt(P.x - Math.sin(cam.yaw) * 3 * Math.cos(cam.fpPitch), ey + Math.sin(cam.fpPitch) * 3, P.z - Math.cos(cam.yaw) * 3 * Math.cos(cam.fpPitch));
    return;
  }
  const px = P.x, py = P.y + 1.15, pz = P.z;
  const dx = Math.sin(cam.yaw) * Math.cos(cam.pitch), dy = Math.sin(cam.pitch), dz = Math.cos(cam.yaw) * Math.cos(cam.pitch);
  let d = cam.dist; const n = 14;
  for(let i = 1; i <= n; i++){ const t = cam.dist * i / n; if(H.blocked(px + dx * t, py + dy * t, pz + dz * t, .16)){ d = Math.max(.35, cam.dist * (i - 1) / n - .05); break; } }
  const inside = H.roomOf(P.x, P.y, P.z) !== 'garden';
  const lv = H.lvOf(P.y), st = H.stairAt(P.x, P.z, P.y), ceil = inside ? (st ? LY[st.hi] : LY[lv]) + 2.82 : 99;
  const tx = px + dx * d, ty = Math.min(ceil, py + dy * d), tz = pz + dz * d;
  if(snapCam){ camPos.set(tx, ty, tz); camLook.set(px, py + .12, pz); snapCam = false; }
  else { const k = 1 - Math.exp(-12 * dt); camPos.lerp(_v.set(tx, ty, tz), k); camLook.lerp(_v2.set(px, py + .12, pz), 1 - Math.exp(-16 * dt)); }
  camera.position.copy(camPos); camera.lookAt(camLook);
}
function setTitleView(on){
  viewOff = 0;
  if(on){ const off = (RTL ? -1 : 1) * SW * .23; camera.setViewOffset(SW, SH, off, 0, SW, SH); }
  else camera.clearViewOffset();
}
/* a close-up of the uncle for the cut-scenes (prank reactions, carrying a kid out): tries a few angles that see him */
const shot = { p:new THREE.Vector3(), l:new THREE.Vector3(), set:false };
function aimShot(x, y, z, f, far = 2.5, turn = false, hi = 0){
  const tgt = { x, y:y + 1.15 + hi, z }, inside = H.roomOf(x, y + .5, z) !== 'garden';
  const ok = (cx, cy, cz) => !H.blocked(cx, cy, cz, .25) && !H.blocked(cx, cy - .7, cz, .2) && (!inside || H.roomAt(H.lvOf(y + .2), cx, cz)) && H.los({ x:cx, y:cy, z:cz }, tgt);
  const cand = []; for(let i = 0; i < 16; i++) cand.push(f + i / 16 * Math.PI * 2);
  cand.sort((a, b) => Math.abs(angDiff(a, f)) - Math.abs(angDiff(b, f)));
  for(const d of [far, far * .8, far * .65]) for(const a0 of cand){
    if(!turn && Math.abs(angDiff(a0, f)) > 1.6) continue;
    const a = a0 + (turn ? .35 : 0), cx = x + Math.sin(a) * d, cz = z + Math.cos(a) * d, cy = y + 1.6 + hi * 1.2;
    if(!ok(cx, cy, cz)) continue;
    shot.p.set(cx, cy, cz); shot.l.set(tgt.x, tgt.y, tgt.z); shot.set = true; shot.fb = false; shot.a = a0; return a0;
  }
  shot.p.set(x + Math.sin(f) * 1.6, y + 2.4, z + Math.cos(f) * 1.6); shot.l.set(tgt.x, tgt.y, tgt.z); shot.set = true; shot.fb = true;
  return f;
}
let viewOff = 0;
function setCineView(on){ const want = on ? -.16 : 0; if(viewOff === want) return; viewOff = want; if(on) camera.setViewOffset(SW, SH, SW * want, 0, SW, SH); else camera.clearViewOffset(); }
function shotCamera(dt, push){
  const k = push || 0;
  camera.position.copy(shot.p).lerp(shot.l, k * .18); camera.lookAt(shot.l);
}

/* ---------- player ---------- */
function readInput(dt){
  let ix = joy.x + (keys.r ? 1 : 0) - (keys.l ? 1 : 0), iy = joy.y + (keys.b ? 1 : 0) - (keys.f ? 1 : 0);
  let m = Math.hypot(ix, iy); if(m > 1){ ix /= m; iy /= m; m = 1; } if(m < .1){ ix = iy = 0; m = 0; }
  if(keys.cl) cam.yaw += 2.2 * dt; if(keys.cr) cam.yaw -= 2.2 * dt;
  const fx = -Math.sin(cam.yaw), fz = -Math.cos(cam.yaw), rx = Math.cos(cam.yaw), rz = -Math.sin(cam.yaw);
  return { x:rx * ix - fx * iy, z:rz * ix - fz * iy, m, ix, iy };
}
function stepPlayer(dt){
  if(P.hidden){ P.move = 0; P.mode = 'still'; return; }
  const inp = readInput(dt);
  // full stick for a moment (or Shift) = run: fast but noisy
  if(inp.m > .92) P.fullT += dt; else P.fullT = 0;
  const run = !P.crouch && (keys.run || P.fullT > .55) && inp.m > .3;
  P.mode = inp.m === 0 ? 'still' : P.crouch ? 'sneak' : inp.m < .45 ? 'sneak' : run ? 'run' : 'walk';
  const sp = P.mode === 'sneak' ? SPD.sneak * Math.max(.5, Math.min(1, inp.m / .6)) : P.mode === 'run' ? SPD.run : SPD.walk * Math.max(.6, inp.m);
  const k = Math.min(1, 14 * dt), dirl = Math.hypot(inp.x, inp.z) || 1;
  P.vx += (inp.x / dirl * sp * (inp.m ? 1 : 0) - P.vx) * k; P.vz += (inp.z / dirl * sp * (inp.m ? 1 : 0) - P.vz) * k;
  P.x += P.vx * dt; P.z += P.vz * dt;
  const o = { x:P.x, z:P.z };
  H.collide(o, .3, P.y);
  P.x = o.x; P.z = o.z;
  const gy = H.groundY(P.x, P.z, P.y); P.y = gy > P.y ? Math.min(gy, P.y + 8 * dt + .02) : gy;
  if(inp.m > 0) P.face += angDiff(Math.atan2(inp.x, inp.z), P.face) * Math.min(1, 12 * dt);
  P.move = Math.min(1, Math.hypot(P.vx, P.vz) / SPD.walk);
  if(!fp && inp.m > .2 && Math.abs(inp.ix) < .45 && T - look.t > .8){ cam.yaw += angDiff(P.face + Math.PI, cam.yaw) * Math.min(1, 1.6 * dt * inp.m); }
  const r = H.roomAt(H.lvOf(P.y), P.x, P.z), wood = r && (r.floor === 'wood' || r.floor === 'attic');
  P.stepT -= dt * P.move * (P.mode === 'run' ? 1.6 : 1);
  if(P.stepT <= 0 && P.move > .15){ P.stepT = .36; if(P.mode === 'run'){ SFX.step(false); if(Math.random() < .5) burst(P.x, P.y + .05, P.z, 2, ['#e8dccb', '#ffffff'], { speed:.6, up:.6, g:2, life:.5, size:.7 }); } else if(P.mode === 'walk') SFX.step(true); }
  P.noiseT -= dt;
  if(P.noiseT <= 0 && P.mode === 'run'){ P.noiseT = .55; makeNoise(P.x, P.y, P.z, wood ? 7.5 : 6, 'run'); }
  else if(P.noiseT <= 0 && P.mode === 'walk' && P.move > .5){ P.noiseT = .8; makeNoise(P.x, P.y, P.z, 2.4, 'walk', true); }
}

/* ---------- noise and the uncle's ears ---------- */
function makeNoise(x, y, z, Rr, kind, quiet){
  if(!quiet) ring(x, y, z, Rr, kind === 'run' ? 0xffd36a : 0xffffff);
  if(GS) GS.stats.noise++;
  if(!aiHere()){ coNoise(x, y, z, Rr, kind); return; }
  hearNoise(x, y, z, Rr);
}
const busy = () => G.mode === 'chase' || G.mode === 'carry' || G.mode === 'react' || G.mode === 'win' || G.mode === 'toHide';
function hearNoise(x, y, z, Rr){
  if(!GS || GS.over || busy()) return;
  const d = Math.hypot(G.x - x, G.z - z) + Math.abs(G.y - y) * 1.3;
  const napping = G.mode === 'act' && G.act === 'lie';
  if(d > Rr * (napping ? .6 : 1)) return;
  if(R.co && G.mode === 'curious' && G.tgt && Math.hypot(G.x - G.tgt.x, G.z - G.tgt.z) < d) return;
  unpose();
  G.tgt = { x, y, z }; G.mode = 'curious'; G.path = detour(H.path(G, G.tgt), G); G.t = 0; showMark(ques, 1.4);
  say(napping ? 'wake' : 'hear');
}

/* ---------- the uncle's brain: routine (go → act) · curious → search · chase → (toHide → shrug) · carry · react ---------- */
const LINES = {
  hear:[L('شو هالصوت؟ 🤔', 'What was that? 🤔', 'Bu ne sesiydi? 🤔'), L('مين هون؟ 🤨', "Who's there? 🤨", 'Kim var orada? 🤨')],
  wake:[L('هاه؟! مين صحّاني؟ 😤', 'Huh?! Who woke me up? 😤', 'Ha?! Beni kim uyandırdı? 😤')],
  search:[L('همممم… 👀', 'Hmmm… 👀', 'Hımmm… 👀'), L('في حدا هون؟ 🤨', 'Anybody here? 🤨', 'Kimse var mı? 🤨')],
  spot:[L('هيييي! إنت! 😠', 'Heyyy! You! 😠', 'Heyyy! Sen! 😠'), L('شفتك يا شقي! 👀', 'I see you, rascal! 👀', 'Seni gördüm, yaramaz! 👀')],
  lost:[L('وين راح هالشقي؟ 🤷‍♂️', 'Where did that rascal go? 🤷‍♂️', 'O yaramaz nereye gitti? 🤷‍♂️')],
  shrug:[L('ما في حدا… 🤷‍♂️', 'Nobody here… 🤷‍♂️', 'Kimse yok… 🤷‍♂️'), L('يمكن كانت قطّة… 🐈', 'Maybe it was a cat… 🐈', 'Belki bir kediydi… 🐈')],
  catch:[L('هيييي! برّا! 😤', 'Heyyy! Out you go! 😤', 'Heyyy! Dışarı! 😤')],
  drop:[L('ولا تعيدها! ☝️', "And don't come back! ☝️", 'Bir daha gelme! ☝️'), L('روح العب بحديقتكن! ☝️', 'Go play in your own garden! ☝️', 'Kendi bahçende oyna! ☝️')],
  grumble:[L('مين عمل هيك؟! 😤', 'Who did this?! 😤', 'Bunu kim yaptı?! 😤'), L('أوووف! 😤', 'Hmmph! 😤', 'Höööf! 😤'), L('رح أعرف مين! 😠', "I'll find out who! 😠", 'Kim olduğunu bulacağım! 😠')],
  win:[L('أوووووف! يا ولاد! 😤😂', 'Hmmmph! You kids! 😤😂', 'Höööf! Sizi çocuklar! 😤😂')],
  sit:[L('أخيراً… جريدتي 📰', 'Ahh… my newspaper 📰', 'Ohh… gazetem 📰')], phone:[L('ألو؟ مين معي؟ ☎️', "Hello? Who's this? ☎️", 'Alo? Kim o? ☎️')],
  tea:[L('وقت الشاي ☕', 'Tea time ☕', 'Çay vakti ☕')], eat:[L('فطوري الطيّب 🥣', 'My yummy breakfast 🥣', 'Güzel kahvaltım 🥣')],
  comb:[L('شو هالشوارب الحلوة 😎', 'What a fine moustache 😎', 'Ne güzel bıyık 😎')], water:[L('اشربوا يا وردات 🌻', 'Drink up, flowers 🌻', 'İçin bakalım çiçekler 🌻')],
  lie:[L('قيلولة صغيرة… 😴', 'A little nap… 😴', 'Küçük bir şekerleme… 😴')], look:[L('همم، وين حطّيتها؟ 🤔', 'Hmm, where did I put it? 🤔', 'Hım, nereye koydum? 🤔')],
  reach:[L('خلّيني شوف… 🤔', 'Let me see… 🤔', 'Bir bakayım… 🤔')]
};
let bubbleUntil = 0;
function say(cat, i){ const l = LINES[cat]; if(!l) return; if(!(i >= 0 && i < l.length)) i = Math.floor(Math.random() * l.length); netFx({ k:'say', c:cat, i }); A.mumble(4 + Math.floor(Math.random() * 3), cat === 'spot' || cat === 'catch' ? 200 : 150); bubbleUncle(l[i], 2.6); }
function bubbleUncle(t, s){ $('#bubbleT').textContent = t; bubbleUntil = T + s; }
let topUntil = 0;
function bubbleTop(t, s){ const h = $('#hint'); h.textContent = t; h.hidden = false; topUntil = T + s; }
function showMark(spr, s){ spr.visible = true; spr.userData.until = T + s; netFx({ k:'mk', m:spr === excl ? 1 : 0, s }); }
let netFx = () => {};

/* the kids the uncle can see and catch: you in solo; in co-op (host) you and the friends */
function kids(){
  const out = [];
  if(!R.co){ out.push({ id:'me', me:true, x:P.x, y:P.y, z:P.z, mode:P.mode, hidden:P.hidden, off:state !== 'play' || T < meSafe }); return out; }
  out.push({ id:MP.id, me:true, x:P.x, y:P.y, z:P.z, mode:P.mode, hidden:P.hidden, off:!(state === 'play' || state === 'pause' || state === 'cine') || T < meSafe });
  for(const p of PEERS.values()) if(p.inRun && p.seen) out.push({ id:p.id, x:p.tx, y:p.ty, z:p.tz, mode:p.md, hidden:p.hid >= 0 ? HIDES[p.hid] : null, off:T < p.safe || p.cg, peer:p });
  return out;
}
let meSafe = 0;
const kidById = id => kids().find(k => k.id === id) || null;
function canSeeKid(k){
  if(!k || k.hidden || k.off) return false;
  const dy = Math.abs(G.y - k.y); if(dy > 1.4) return false;
  const dx = k.x - G.x, dz = k.z - G.z, d = Math.hypot(dx, dz);
  let range = (UNC.sight + GS.lv * .15) * (k.mode === 'sneak' || k.mode === 'still' ? .66 : 1);
  if(G.mode === 'act'){ if(G.act === 'lie') return false; if(G.act === 'sit' || G.act === 'phone' || G.act === 'comb') range *= .55; else range *= .8; }
  if(d > range) return false;
  const fx = Math.sin(G.face), fz = Math.cos(G.face), cos = (dx * fx + dz * fz) / (d || 1);
  if(d > 1.4 && cos < .42) return false;
  return H.los({ x:G.x, y:G.y + 1.5, z:G.z }, { x:k.x, y:k.y + .7, z:k.z });
}
function seenKid(){ let best = null, bd = 1e9; for(const k of kids()){ if(!canSeeKid(k)) continue; const d = Math.hypot(k.x - G.x, k.z - G.z); if(d < bd){ bd = d; best = k; } } return best; }
const coSlow = () => R.co ? Math.max(.8, 1 - .06 * (kids().length - 1)) : 1;
/* walking around furniture: a coarse grid per floor (A* + string pulling) for every stretch on one floor */
const NAV = {}, CELL = .4;
function navGrid(lv){
  if(NAV[lv]) return NAV[lv];
  const x0 = lv === 1 ? -17 : -10.4, x1 = -x0, z0 = lv === 1 ? -18 : -7.4, z1 = lv === 1 ? 13 : 7.4, y = LY[lv];
  const W = Math.ceil((x1 - x0) / CELL), D = Math.ceil((z1 - z0) / CELL), free = new Uint8Array(W * D);
  for(let j = 0; j < D; j++) for(let i = 0; i < W; i++){ const x = x0 + (i + .5) * CELL, z = z0 + (j + .5) * CELL;
    const inside = x > -10.1 && x < 10.1 && z > -7.1 && z < 7.1;
    free[j * W + i] = (inside ? H.floorAt(lv, x, z) : lv === 1) && !H.blocked(x, y + .5, z, .4) && !H.blocked(x, y + .15, z, .4) && !H.blocked(x, y + 1.2, z, .4) ? 1 : 0; }
  return (NAV[lv] = { x0, z0, W, D, free, y });
}
function navPath(a, b, lv){
  const g = navGrid(lv), ci = p => [clamp(Math.floor((p.x - g.x0) / CELL), 0, g.W - 1), clamp(Math.floor((p.z - g.z0) / CELL), 0, g.D - 1)];
  const near = ([i, j]) => { if(g.free[j * g.W + i]) return j * g.W + i; for(let r = 1; r < 5; r++) for(let dj = -r; dj <= r; dj++) for(let di = -r; di <= r; di++){ const ii = i + di, jj = j + dj; if(ii >= 0 && jj >= 0 && ii < g.W && jj < g.D && g.free[jj * g.W + ii]) return jj * g.W + ii; } return -1; };
  const s = near(ci(a)), t = near(ci(b)); if(s < 0 || t < 0) return null;
  const N = g.W * g.D, cost = new Float32Array(N).fill(1e9), prev = new Int32Array(N).fill(-1), open = [s]; cost[s] = 0;
  const h = k => Math.hypot((k % g.W) - (t % g.W), Math.floor(k / g.W) - Math.floor(t / g.W));
  const inOpen = new Uint8Array(N); inOpen[s] = 1; let it = 0;
  while(open.length && it++ < 6000){
    let bi = 0, bf = 1e9; for(let q = 0; q < open.length; q++){ const f = cost[open[q]] + h(open[q]); if(f < bf){ bf = f; bi = q; } }
    const u = open[bi]; open[bi] = open[open.length - 1]; open.pop(); inOpen[u] = 0;
    if(u === t) break;
    const ui = u % g.W, uj = Math.floor(u / g.W);
    for(let dj = -1; dj <= 1; dj++) for(let di = -1; di <= 1; di++){
      if(!di && !dj) continue; const ii = ui + di, jj = uj + dj; if(ii < 0 || jj < 0 || ii >= g.W || jj >= g.D) continue;
      const v = jj * g.W + ii; if(!g.free[v]) continue; if(di && dj && (!g.free[uj * g.W + ii] || !g.free[jj * g.W + ui])) continue;
      const c = cost[u] + (di && dj ? 1.414 : 1); if(c < cost[v]){ cost[v] = c; prev[v] = u; if(!inOpen[v]){ inOpen[v] = 1; open.push(v); } }
    }
  }
  if(prev[t] < 0 && s !== t) return null;
  const cells = []; for(let k = t; k >= 0; k = prev[k]){ cells.unshift({ x:g.x0 + ((k % g.W) + .5) * CELL, y:g.y, z:g.z0 + (Math.floor(k / g.W) + .5) * CELL }); if(k === s) break; }
  // string pulling: keep only the corners we need
  const out = []; let cur = a, k = 0;
  while(k < cells.length){ let far = k; for(let q = cells.length - 1; q > k; q--) if(clearSeg(cur, cells[q])){ far = q; break; } cur = cells[far]; out.push(cur); k = far + 1; }
  if(out.length && clearSeg(out.length > 1 ? out[out.length - 2] : a, b)) out.pop();
  return out;
}
function clearSeg(a, b){ const d = Math.hypot(b.x - a.x, b.z - a.z), n = Math.ceil(d / .2), y = Math.min(a.y, b.y) + .5; for(let i = 1; i < n; i++){ const t = i / n; if(H.blocked(a.x + (b.x - a.x) * t, y, a.z + (b.z - a.z) * t, .38)) return false; } return true; }
function detour(path, from){
  const out = []; let a = from;
  for(const b of path){
    if(Math.abs(a.y - b.y) < .5 && !clearSeg(a, b)){ const lv = H.lvOf(b.y), mid = navPath(a, b, lv); if(mid) out.push(...mid); }
    out.push(b); a = b;
  }
  return out;
}
function goTo(tgt){ G.tgt = tgt; G.path = detour(H.path(G, tgt), G); G.lastPathT = T; }
function moveUncle(dt, speed){
  if(!G.path.length){ G.speed = 0; return true; }
  const n = G.path[0], dx = n.x - G.x, dz = n.z - G.z, d = Math.hypot(dx, dz);
  if(d < .3 || (G.path.length > 1 && d < .55)){ G.path.shift(); return !G.path.length; }
  const s = Math.min(speed, d / dt), ox = G.x, oz = G.z;
  G.x += dx / d * s * dt; G.z += dz / d * s * dt;
  const o = { x:G.x, z:G.z }; H.collide(o, .42, G.y); G.x = o.x; G.z = o.z;
  G.y = H.groundY(G.x, G.z, G.y);
  G.face += angDiff(Math.atan2(dx, dz), G.face) * Math.min(1, 8 * dt);
  const prog = Math.hypot(G.x - ox, G.z - oz); G.speed = prog / dt;
  if(prog < s * dt * .3){ G.stuck += dt; if(G.stuck > .9){ G.stuck = 0; G.x += (Math.random() - .5) * .6; G.z += (Math.random() - .5) * .6; if(G.tgt) G.path = detour(H.path(G, G.tgt), G); } } else G.stuck = 0;
  return false;
}
/* special poses at a station (sitting in the armchair, lying in the hammock, standing in the bath) */
function poseAt(p, react){
  const a = p.at;
  if(a && (!a.react || react)){ G.pose = a.lie ? 'lie' : a.react ? 'bath' : 'sit'; G.px = a.x; G.py = a.y; G.pz = a.z; G.pf = a.f; }
  else G.pose = '';
}
function unpose(){ if(G.pose){ const p = PRANKS[G.sid]; if(p){ G.x = p.stand.x; G.z = p.stand.z; G.y = p.stand.y; } G.pose = ''; } }
function nextStation(){
  // a prank that is ready pulls him there; otherwise the next thing in his routine
  const ready = GS.pr.filter(r => r.st === 'set').map(r => r.p);
  let p;
  if(ready.length){ ready.sort((a, b) => (Math.hypot(a.stand.x - G.x, a.stand.z - G.z) + Math.abs(a.stand.y - G.y) * 6) - (Math.hypot(b.stand.x - G.x, b.stand.z - G.z) + Math.abs(b.stand.y - G.y) * 6)); p = ready[0]; }
  else { G.ri = (G.ri + 1) % GS.routine.length; p = PBY[GS.routine[G.ri]]; if(GS.routine.length > 1 && p.i === G.sid){ G.ri = (G.ri + 1) % GS.routine.length; p = PBY[GS.routine[G.ri]]; } }
  G.sid = p.i; G.mode = 'go'; G.t = 0; goTo({ x:p.stand.x, y:p.stand.y, z:p.stand.z });
}
function prOf(i){ return GS.pr.find(r => r.p.i === i) || null; }
function updateUncle(dt){
  G.t += dt;
  const sk = !busy() ? seenKid() : null;
  if(sk && (G.mode !== 'chase' || !canSeeKid(kidById(G.kid)))) G.kid = sk.id;
  if(sk && G.mode !== 'chase' && !busy()){
    G.spotT += dt; if(!excl.visible) showMark(excl, .8);
    if(G.spotT > UNC.spot){ unpose(); G.mode = 'chase'; G.t = 0; G.chaseT = 0; G.lostT = 0; SFX.spot(); SFX.hey(); netFx({ k:'sfx', n:'spot' }); say('spot'); if(!R.co || G.kid === MP.id) A.setMode('chase'); }
  } else if(!sk) G.spotT = Math.max(0, G.spotT - dt * .5);
  const slow = coSlow(), seeing = !!sk;
  G.act = 'walk'; G.actK = 0;
  switch(G.mode){
    case 'go':
      if(moveUncle(dt, UNC.go * slow)){ const p = PRANKS[G.sid]; G.mode = 'act'; G.t = 0; G.x = p.stand.x; G.z = p.stand.z; poseAt(p, false); if(Math.random() < .55) say(p.act); }
      break;
    case 'act': {
      const p = PRANKS[G.sid]; G.act = p.act; G.speed = 0;
      if(!G.pose) G.face += angDiff(p.stand.f, G.face) * Math.min(1, 6 * dt);
      const r = prOf(p.i);
      if(r && r.st === 'set' && G.t > (p.pre != null ? p.pre : .9)){ startReact(r); break; }
      if(G.t > p.dur){ unpose(); nextStation(); }
      break;
    }
    case 'curious':
      if(moveUncle(dt, UNC.curious * slow)){ G.mode = 'search'; G.t = 0; if(Math.random() < .7) say('search'); }
      break;
    case 'search':
      G.act = 'look'; G.speed = 0; G.face += Math.sin(G.t * 1.7) * dt * .8;
      if(G.t > 3.2){ say('shrug'); nextStation(); }
      break;
    case 'chase': {
      G.chaseT += dt; G.act = 'shout';
      if(seeing){ G.lostT = 0; G.lastSeen = { x:sk.x, y:sk.y, z:sk.z }; if(T - G.lastPathT > .4 || !G.path.length) goTo(G.lastSeen); }
      else { G.lostT += dt; if(!G.path.length && G.lastSeen) goTo(G.lastSeen); }
      moveUncle(dt, UNC.chase * slow);
      const kc = kids().find(k => !k.hidden && !k.off && Math.abs(G.y - k.y) < 1 && Math.hypot(G.x - k.x, G.z - k.z) < UNC.catchR);
      if(kc){ startCarry(kc); break; }
      if(G.lostT > UNC.lose){ G.mode = 'search'; G.t = 0; say('lost'); A.setMode('calm'); }
      else if(G.chaseT > UNC.chaseMax){ say('shrug'); nextStation(); A.setMode('calm'); }
      break;
    }
    case 'toHide':
      if(moveUncle(dt, UNC.curious * 1.2)){ G.mode = 'shrug'; G.t = 0; say('shrug'); }
      break;
    case 'shrug': {
      const kh = kidById(G.kid), hh = kh && kh.hidden; G.act = 'shrug'; G.actK = G.t / 2.4; G.speed = 0;
      if(hh) G.face += angDiff(Math.atan2(hh.x - G.x, hh.z - G.z), G.face) * Math.min(1, 4 * dt);
      if(G.t > 2.4) nextStation();
      break;
    }
    case 'carry': carryFrame(dt); break;
    case 'react': reactFrame(dt); break;
    case 'win': G.act = 'stomp'; G.speed = 0; break;
  }
  if(G.mode !== 'chase' && A.musicMode === 'chase') A.setMode('calm');
  visualUncle(dt);
}
/* where the uncle is drawn (a pose can put him in the armchair, the hammock or the bath) */
function visualUncle(dt){
  if(G.pose){ const k = 1 - Math.exp(-10 * dt); G.vx = lerp(G.vx, G.px, k); G.vy = lerp(G.vy, G.py, k); G.vz = lerp(G.vz, G.pz, k); G.vf += angDiff(G.pf, G.vf) * k; }
  else { G.vx = G.x; G.vy = G.y; G.vz = G.z; G.vf = G.face; }
}

/* ---------- prank reactions: a camera cut, a comic word and stars ---------- */
const REACT_T = 3.6;
function startReact(r){
  const p = r.p;
  r.st = 'done'; G.mode = 'react'; G.react = p.i; G.t = 0; G.path = []; poseAt(p, true);
  coShare('prank', { i:p.i });
  reactFx(p.i);
}
function reactFrame(dt){
  const p = PRANKS[G.react]; G.act = G.t < .5 && p.act === 'comb' ? 'comb' : p.ra; G.actK = clamp(G.t / REACT_T, 0, 1); G.speed = 0;
  if(!G.pose && cine && cine.face != null && G.t > .25) G.face += angDiff(cine.face, G.face) * Math.min(1, 8 * dt);
  if(G.t > REACT_T){
    p.done(); unpose(); G.react = -1;
    if(GS.pr.every(r => r.st === 'done')){ G.mode = 'win'; G.t = 0; if(R.co) coWin(); else startWinSeq(); return; }
    say('grumble'); nextStation();
  }
}
/* every phone: the cut-scene and the effects (host and friends alike) */
let cine = null;
function reactFx(i){
  const p = PRANKS[i];
  cine = { i, t:0, word:false, stars:false };
  if(state === 'play' || state === 'cine'){ state = 'cine'; clearInput(); }
  const posed = p.at && (p.at.react || p.at.lie || p.act === 'sit');
  const vx = posed ? p.at.x : p.stand.x, vz = posed ? p.at.z : p.stand.z, vy = p.stand.y;
  const lie = p.at && p.at.lie, cx = lie ? vx - .95 : vx;
  const hi = p.ra === 'float' ? .55 : p.ra === 'jump' ? .3 : 0;
  const fa = p.camA != null ? aimShot(cx, vy, vz, p.camA, 3.6, false, hi) : aimShot(cx, lie ? .1 : vy, vz, lie ? 0 : posed ? p.at.f : p.stand.f, lie ? 3.6 : 2.8, !posed, hi);
  if(p.camA != null) cine.face = null;
  else if(!posed) cine.face = fa;
  $('#hint').hidden = true; topUntil = 0;
  if(p.id === 'phone') SFX.ring(); else if(p.id === 'whoopee') setTimeout(() => SFX.pfft(), 300); else if(p.id === 'cereal') setTimeout(() => SFX.eek(), 500); else if(p.id === 'fan') SFX.sparkle(); else if(p.id === 'wash') SFX.foam(); else if(p.id === 'hammock') SFX.splash(); else if(p.id === 'shed') SFX.whoosh(); else if(p.id === 'bath') SFX.squish(); else if(p.id === 'gnome') SFX.spot();
  A.setMode('calm');
}
function cineFrame(dt){
  if(!cine) return;
  cine.t += dt;
  const p = PRANKS[cine.i], k = clamp(cine.t / REACT_T, 0, 1);
  p.mouth = { x:G.vx + Math.sin(G.vf) * .4, y:G.vy + 1.45, z:G.vz + Math.cos(G.vf) * .4, f:G.vf }; p.head = { x:G.vx, y:G.vy + 1.75, z:G.vz };
  if(k < 1) p.react(k, dt, T);
  if(cine.t > .45 && !cine.word){ cine.word = true; comicWord(p.word, p.col); SFX.honk(); }
  if(cine.t > .9 && !cine.stars){ cine.stars = true; starPop(G.vx, G.vy + 2.3, G.vz); SFX.giggle(); }
  if(cine.t > REACT_T){ const was = cine; cine = null; p.done(); $('#comic').hidden = true; syncFixtures();
    if(state === 'cine') { state = 'play'; snapCam = true; }
    if(!GS.over && was) bubbleTop(prDoneText(), 2.8); }
}
function prDoneText(){ const left = GS.pr.filter(r => r.st !== 'done').length; return left ? '😂 ' + L('ضل ', '', '') + N(left) + L(' مقلب!', left === 1 ? ' prank to go!' : ' pranks to go!', ' şaka kaldı!') : '🎉'; }
function comicWord(w, col){ const el = $('#comic'); el.hidden = false; el.style.setProperty('--cc', col); $('#comicT').textContent = w; el.classList.remove('go'); void el.offsetWidth; el.classList.add('go'); }
function starPop(x, y, z){ starSpr.forEach((s, i) => { s.visible = true; s.userData.t0 = T + i * .08; s.userData.a = i / 5 * Math.PI * 2; s.userData.c = { x, y, z }; }); burst(x, y, z, 30, ['#ffd23f', '#fff1a0', '#ffffff'], { speed:2.4, up:2, g:2, life:1.4, size:1.1 }); }
function updateStars(){ for(const s of starSpr){ if(!s.visible) continue; const e = T - s.userData.t0; if(e > 1.8){ s.visible = false; continue; } const c = s.userData.c, a = s.userData.a + e * 3, r = .5 + e * .5; s.position.set(c.x + Math.cos(a) * r, c.y + e * .3 + Math.sin(e * 6) * .05, c.z + Math.sin(a) * r); const sc = .8 * Math.min(1, e * 4) * (1 - Math.max(0, e - 1.3) / .5); s.scale.set(sc, sc, 1); } }

/* ---------- caught: the uncle carries the kid out to the garden gate ---------- */
const CARRY_T = 1.3, DROP_T = 3.0;
function startCarry(k){
  unpose(); G.mode = 'carry'; G.t = 0; G.kid = k.id; G.path = []; G.face = Math.atan2(k.x - G.x, k.z - G.z);
  say('catch'); SFX.hey(); netFx({ k:'sfx', n:'hey' });
  if(k.peer){ k.peer.safe = T + DROP_T + 4; }
  GS.caught++;
  const hid = heldBy(k.id); if(hid >= 0) itemHome(hid);
  coShare('carry', { t:k.id });
  onCarry(k.id);
  A.setMode('calm');
}
function carryFrame(dt){
  G.speed = 0;
  if(G.t < CARRY_T){ G.act = 'grab'; }
  else {
    if(!G.atGate){ G.atGate = true; burst(G.x, G.y + 1, G.z, 20, ['#ffffff', '#e8dccb'], { speed:2, up:1.5, g:1, life:1, size:1.6 }); G.x = GATE_U.x; G.z = GATE_U.z; G.y = 0; G.face = Math.PI; burst(G.x, 1, G.z, 20, ['#ffffff', '#e8dccb'], { speed:2, up:1.5, g:1, life:1, size:1.6 }); say('drop'); }
    G.act = 'drop';
  }
  if(G.t > DROP_T){ G.atGate = false; G.kid = ''; nextStation(); }
}
/* every phone: the kid who was caught */
let carryT = -1;
function onCarry(id){
  if(id === myId()) carryMe();
  else { const a = PEERS.get(id); if(a) a.cg = T; bubbleTop('😤 ' + peerName(id) + ' ' + L('انمسك! عمّو طلّعه عالبوّابة 😆', 'got caught! Out to the gate 😆', 'yakalandı! Kapıya kadar götürüldü 😆'), 2.8); }
}
function carryMe(){
  if(state === 'won' || state === 'win') return;
  if(state === 'pause' || state === 'select'){ overlay.hidden = true; setPlayUI(true); }
  if(P.hidden) exitHide();
  state = 'caught'; carryT = 0; clearInput(); meSafe = T + DROP_T + 4; held = heldBy(myId());
  aimShot(G.x, G.y, G.z, G.face + 1.0, 3.3, true, .75);
  const fl = $('#flash'); fl.classList.remove('go'); void fl.offsetWidth;
}
function caughtFrame(dt){
  carryT += dt;
  if(carryT < CARRY_T){
    // up over his head, wiggling
    P.x = G.vx; P.z = G.vz; P.y = G.vy + 1.85; P.face = G.vf + Math.PI / 2; P.move = .8;
    shotCamera(dt, carryT / CARRY_T);
  } else {
    if(!caughtFrame.gate){ caughtFrame.gate = true; const fl = $('#flash'); fl.classList.remove('go'); void fl.offsetWidth; fl.classList.add('go'); SFX.whoosh(); placeAtGate(false); aimShot(GATE_U.x, 0, GATE_U.z, Math.PI * .75, 3.4); coPosNow(); }
    shotCamera(dt, 0);
  }
  if(carryT > DROP_T - .3){ caughtFrame.gate = false; state = 'play'; carryT = -1; snapCam = true; cam.yaw = Math.PI; A.music(true, 'calm'); bubbleTop(L('طلعت برّا 😆 جرّب كمان مرّة بشويش!', 'Out you go 😆 try again, quietly!', 'Dışarı atıldın 😆 sessizce tekrar dene!'), 2.6); }
}

/* ---------- hiding ---------- */
function nearHide(){ let best = null, bd = 1e9; for(const h of HIDES){ if(Math.abs(h.y - P.y) > .8) continue; const d = Math.min(Math.hypot(h.out.x - P.x, h.out.z - P.z), Math.hypot(h.x - P.x, h.z - P.z) - .25); if(d < h.near && d < bd){ bd = d; best = h; } } return best; }
function enterHide(h){
  P.hidden = h; P.vx = P.vz = 0; hero.grp.visible = false; cam.peekY = 0; cam.peekP = 0; clearInput();
  SFX.hide(); peek(h.kind);
  if(aiHere()){ if(hideReact(myId(), h, P.x, P.z)) A.setMode('calm'); }
  else coPosNow();
  bubbleTop(L('تخبّيت! 🤫 استنّى عمّو يروح', 'Hidden! 🤫 Wait for the uncle to leave', 'Saklandın! 🤫 Amcanın gitmesini bekle'), 2.5);
}
function hideReact(id, h, x, z){
  const d = Math.hypot(G.x - x, G.z - z);
  if((G.mode === 'chase' && (!R.co || G.kid === id)) || ((G.mode === 'curious' || G.mode === 'search') && d < 6 && G.spotT > 0)){
    G.mode = 'toHide'; G.kid = id; goTo({ x:h.out.x, y:h.y, z:h.out.z }); return true;
  }
  return false;
}
function exitHide(){
  const h = P.hidden; if(!h) return;
  P.hidden = null; P.x = h.out.x; P.z = h.out.z; P.y = H.groundY(P.x, P.z, h.y + .1); P.face = Math.atan2(h.out.x - h.x, h.out.z - h.z);
  hero.grp.visible = true; cam.yaw = P.face + Math.PI; snapCam = true; peek(null); SFX.hide();
}
function peek(kind){ const el = $('#peek'); el.className = 'peek' + (kind ? ' ' + kind : ''); el.hidden = !kind; }

/* ---------- items: pick up, put at the prank spot, drop ---------- */
const myId = () => R.co ? MP.id : 'me';
function heldBy(who){ if(!GS) return -1; return GS.pr.findIndex(r => r.st === 'held' && r.by === who); }
function holderOf(who){ if(who === myId()) return holder; const p = R.co && PEERS.get(who); return (p && p.holder) || null; }
function syncHeld(){
  if(!GS) return;
  held = heldBy(myId());
  GS.pr.forEach((r, i) => { const m = IM[i] && IM[i].mesh; if(!m) return; const hd = r.st === 'held' ? holderOf(r.by) : null;
    if(hd){ if(m.parent !== hd){ hd.add(m); m.position.set(0, 0, 0); m.rotation.set(0, 0, 0); } } else if(m.parent !== scene) scene.add(m); });
}
function nearItem(){ let best = -1, bd = 1.25; GS.pr.forEach((r, i) => { if(r.st !== 'world' || Math.abs(r.y - P.y) > 1.6) return; const d = Math.hypot(r.x - P.x, r.z - P.z); if(d < bd){ bd = d; best = i; } }); return best; }
function nearSpot(i, k = P){ const r = GS.pr[i]; if(!r) return false; const s = r.p.spot; return Math.abs(s.y - k.y) < 1.9 && Math.hypot(s.x - k.x, s.z - k.z) < 1.35; }
function context(){
  if(state !== 'play' || !GS) return null;
  if(P.hidden) return { k:'out', i:'👀', t:L('اطلع', 'Get out', 'Çık'), c:'#8fd0ff' };
  if(held >= 0 && nearSpot(held)) return { k:'place', i:GS.pr[held].p.ie, t:L('حطّ المقلب', 'Set prank', 'Şakayı kur'), c:'#5fe3b1', pulse:true };
  const it = nearItem(); if(it >= 0) return { k:'pick', id:it, i:GS.pr[it].p.ie, t:L('خود', 'Pick up', 'Al'), c:'#ffcd4d', pulse:true };
  if(held >= 0) return { k:'drop', i:GS.pr[held].p.ie, t:L('حط', 'Put down', 'Bırak'), c:'#ffb38a', dim:true };
  return null;
}
function bContext(){
  if(state !== 'play') return null;
  if(P.hidden) return { k:'out', i:'👀', t:L('اطلع', 'Get out', 'Çık') };
  const h = nearHide(); if(h) return { k:'hide', h, i:'🫣', t:L('تخبّى', 'Hide', 'Saklan'), lit:true };
  return P.crouch ? { k:'stand', i:'🧍', t:L('قوم', 'Stand', 'Kalk'), lit:true } : { k:'crouch', i:'🐢', t:L('دبّ', 'Crouch', 'Eğil') };
}
function doAction(){
  const c = context(); if(!c) return;
  if(c.k === 'out') exitHide();
  else if(!aiHere()) coAsk(c);
  else if(c.k === 'pick') pickUp(c.id);
  else if(c.k === 'drop') dropHeld(true);
  else if(c.k === 'place') placePrank();
}
function doB(){
  const c = bContext(); if(!c) return;
  if(c.k === 'out') exitHide();
  else if(c.k === 'hide') enterHide(c.h);
  else { P.crouch = !P.crouch; SFX.tap(); if(P.crouch) bubbleTop(L('🐢 دبّ بشويش: ما في صوت، وعمّو ما بيشوفك منيح', '🐢 Crouching: silent, and harder to see', '🐢 Eğildin: sessiz ve zor görünürsün'), 2.2); }
}
function pickUp(i, who = myId()){
  const r = GS.pr[i]; if(!r || r.st !== 'world') return false;
  const h = heldBy(who); if(h >= 0) dropHeld(false, who);
  r.st = 'held'; r.by = who; syncHeld();
  burst(r.x, r.y + .2, r.z, 14, ['#fff1a0', '#ffffff', '#ffcd4d'], { speed:1.5, up:2, g:3, life:.8, size:.7 });
  if(who === myId()){ SFX.pickup(); bubbleTop(r.p.ie + ' ' + r.p.name + ' → ' + r.p.te + ' ' + r.p.target, 3.2); }
  coShare('pick', { by:who, i });
  return true;
}
function dropHeld(noisy, who = myId(), at){
  const i = heldBy(who); if(i < 0) return;
  const r = GS.pr[i];
  let fx, fz, py;
  if(who === myId()){ fx = P.x + Math.sin(P.face) * .45; fz = P.z + Math.cos(P.face) * .45; py = P.y; }
  else { const k = kidById(who) || { x:r.x, y:r.y, z:r.z }; py = k.y; fx = k.x; fz = k.z; if(at && Math.hypot(at.x - k.x, at.z - k.z) < 1.2){ fx = at.x; fz = at.z; } }
  const o = { x:fx, z:fz }; H.collide(o, .15, py);
  r.x = o.x; r.z = o.z; r.y = H.groundY(o.x, o.z, py); r.st = 'world'; r.by = '';
  syncHeld();
  if(noisy){ if(who === myId()) SFX.drop(); makeNoise(r.x, r.y, r.z, 3.5, 'drop', true); }
  coShare('drop', { by:who, i });
}
function placePrank(who = myId()){
  const i = heldBy(who); if(i < 0) return;
  const r = GS.pr[i]; r.st = 'set'; r.by = ''; syncHeld(); syncFixtures();
  placeFx(i, who);
  coShare('place', { by:who, i });
}
function placeFx(i, who){
  const r = GS.pr[i], s = r.p.spot;
  burst(s.x, s.y + .2, s.z, 24, ['#5fe3b1', '#ffffff', '#ffcd4d', '#ff8fb8'], { speed:1.8, up:2.2, g:3, life:1, size:.9 });
  if(who === myId()){ SFX.place(); const left = GS.pr.filter(q => q.st === 'world' || q.st === 'held').length;
    bubbleTop('🤭 ' + L('المقلب جاهز! ', 'Prank set! ', 'Şaka hazır! ') + (left ? L('يلّا عالتاني ⬆️', 'On to the next ⬆️', 'Sıradakine ⬆️') : L('هلّق تخبّى وتفرّج على ' + UNCLE + ' 👀', 'Now hide and watch ' + UNCLE + ' 👀', 'Şimdi saklan ve ' + UNCLE + '\'yı izle 👀')), 3.2); }
  else SFX.yay();
}
function itemHome(i){ const r = GS.pr[i], h = r.home; r.x = h.x; r.y = h.y; r.z = h.z; r.st = 'world'; r.by = ''; syncHeld(); }

/* ---------- mission complete ---------- */
let winT = 0;
function startWinSeq(){
  if(GS.over && state === 'win') return;
  GS.over = true; state = 'win'; winT = 0; clearInput(); if(P.hidden) exitHide(); fp = false; $('#btnEye').classList.remove('lit'); setPlayUI(false);
  G.mode = 'win'; G.act = 'stomp'; G.path = []; unpose();
  say('win'); A.music(false); setTimeout(() => SFX.fanfare(), 400);
  aimShot(G.x, G.y, G.z, G.face, 3.0);
  if(!GS.result){ const secs = Math.round(GS.t), stars = 1 + (GS.caught === 0 ? 1 : 0) + (secs <= PAR(GS.lv) ? 1 : 0); GS.result = { stars, secs, caught:GS.caught }; }
}
function winFrame(dt){
  winT += dt; G.act = 'stomp'; G.t += dt;
  shotCamera(dt, Math.min(1, winT / 3));
  if(Math.random() < dt * 10) burst(G.vx + (Math.random() - .5) * 3, G.vy + 3, G.vz + (Math.random() - .5) * 3, 8, ['#ff5d73', '#ffcd4d', '#5fb8ff', '#5fe3b1', '#b99bff'], { speed:1.6, up:.8, g:2.2, drag:1.2, life:2.4, size:1.2, sway:.6 });
  if(winT > 2.4 && !winFrame.shown){ winFrame.shown = true; showWin(); }
}
function awardCoins(lv, stars){
  const want = stars * 4, had = PROG.c[lv] | 0, give = Math.max(0, Math.min(12, want) - had);
  if(give > 0){ PROG.c[lv] = had + give; if(window.World) try{ World.addCoins(give, L('من بيت عمّو زعلان', "for Uncle Grumpy's House", "Somurtkan Amca'nın Evi için")); }catch(e){} }
  if(stars > starsOf(lv)) PROG.s[lv] = stars;
  saveProg();
  if(window.World && World.track) try{ World.track('win', 'prank3d'); }catch(e){}
  return give;
}
let coinsGiven = '';
function showWin(){
  const r = GS.result || { stars:1, secs:Math.round(GS.t), caught:GS.caught };
  const stars = clamp(r.stars | 0, 1, 3), secs = clamp(r.secs | 0, 0, 36000), caught = clamp(r.caught | 0, 0, 999);
  const key = (R.co ? 'co' + R.n : 'solo') + ':' + GS.lv + ':' + GS.t.toFixed(2);
  let coins = 0; if(coinsGiven !== key){ coinsGiven = key; coins = awardCoins(GS.lv, stars); GS.coins = coins; } else coins = GS.coins || 0;
  GS.result = { stars, secs, caught, coins };
  state = 'won'; showOverlay('clear'); card.className = 'card' + (R.co ? ' wide' : '');
  drawWin();
  [0, 1, 2].forEach(i => { if(i < stars) setTimeout(() => SFX.star(i), 350 + i * 260); });
}
function drawWin(){
  const r = GS.result, mm = Math.floor(r.secs / 60), ss = r.secs % 60, last = GS.lv >= LEVELS.length - 1;
  const items = GS.pr.map(q => `<span>${q.p.ie}→${q.p.te}</span>`).join('');
  card.innerHTML = `<div class="bigstar">${[0, 1, 2].map(i => i < r.stars ? `<span class="st" style="animation-delay:${.15 + i * .26}s">⭐</span>` : '<span class="off">⭐</span>').join('')}</div>
    <h2>🎉 ${L('المهمّة خلصت!', 'Mission complete!', 'Görev tamam!')}</h2>
    <p>${R.co ? L('عملتوا كل المقالب سوا! ' + UNCLE + ' زعلان كتير 😤😂', 'You pulled all the pranks together! ' + UNCLE + ' is sooo grumpy 😤😂', 'Bütün şakaları birlikte yaptınız! ' + UNCLE + ' çok kızgın 😤😂') : L(UNCLE + ' زعلان كتير… وإنت عم تضحك! 😂', UNCLE + ' is sooo grumpy… and you are laughing! 😂', UNCLE + ' çok kızgın… sen de gülüyorsun! 😂')}</p>
    ${R.co ? teamSlots(r.stars) : ''}
    <div class="tally mini">${items}</div>
    <div class="tally"><span>⏱️ ${N(mm)}:${N((ss < 10 ? '0' : '') + ss)}</span><span>${r.caught ? '😤 ' + N(r.caught) : '🤫 ' + L('ما انمسكت', 'never caught', 'hiç yakalanmadın')}</span><span>🪙 +${N(r.coins || 0)}</span></div>
    ${R.co ? endButtons() : `<div class="row">${last ? '' : `<button class="big-btn" id="bNext">▶️ ${L('المهمّة الجاية', 'Next mission', 'Sonraki görev')}</button>`}
      <button class="ghost-btn" id="bAgain">🔁 ${L('كمان مرّة', 'Play again', 'Tekrar oyna')}</button><button class="ghost-btn" id="bLv">🗺️ ${L('المهمّات', 'Missions', 'Görevler')}</button></div>`}`;
  if(R.co){ wireEnd(); return; }
  const nx = $('#bNext'); if(nx) nx.onclick = () => { SFX.tap(); winFrame.shown = false; levelI = GS.lv + 1; startGame(); };
  $('#bAgain').onclick = () => { SFX.tap(); winFrame.shown = false; startGame(); };
  $('#bLv').onclick = () => { SFX.tap(); winFrame.shown = false; showLevels(); };
}

/* ---------- HUD ---------- */
const hudCache = {};
const setTxt = (id, t) => { if(hudCache[id] !== t){ hudCache[id] = t; $('#' + id).textContent = t; } };
function setPlayUI(on){ ['#hud', '#joy'].forEach(s => $(s).hidden = !on); if(!on){ actBtn.hidden = true; bBtn.hidden = true; $('#slot').hidden = true; $('#bubble').hidden = true; $('#hint').hidden = true; } }
function checklist(){
  const key = GS.pr.map(r => r.st + (r.st === 'held' && r.by !== myId() ? 'o' : '')).join(',');
  if(hudCache.list === key) return; hudCache.list = key;
  $('#hList').innerHTML = GS.pr.map(r => { const s = r.st === 'held' && r.by !== myId() ? 'friend' : r.st;
    return `<span class="mi" data-s="${s}"><i>${r.p.ie}</i><b>›</b><i>${r.p.te}</i>${s === 'set' ? '<em>⏳</em>' : s === 'done' ? '<em>⭐</em>' : s === 'held' ? '<em>✋</em>' : s === 'friend' ? '<em>👫</em>' : ''}</span>`; }).join('');
}
function hudFrame(){
  setTxt('hLv', LEVELS[GS.lv].e + ' ' + N(GS.lv + 1));
  const s = Math.floor(GS.t), mm = Math.floor(s / 60), ss = s % 60; setTxt('hTime', '⏱️ ' + N(mm) + ':' + N((ss < 10 ? '0' : '') + ss));
  $('#hTime').classList.toggle('late', GS.t > PAR(GS.lv));
  checklist();
  const m = G.mode, chaseMe = !R.co || G.kid === MP.id;
  const mood = m === 'chase' || m === 'carry' ? (chaseMe ? ['😠', L('عمّو شافك! اهرب!', 'He saw you! Run!', 'Seni gördü! Kaç!'), 'chase'] : ['🏃‍♂️', L('عمّو لاحق صاحبك!', 'He is chasing your friend!', 'Arkadaşını kovalıyor!'), 'chase']) :
    m === 'curious' || m === 'search' || m === 'toHide' || m === 'shrug' ? ['🤨', L('عمّو عم يدوّر', 'Uncle is looking around', 'Amca etrafa bakıyor'), 'awake'] :
    m === 'react' || m === 'win' ? ['😤', L('عمّو زعلان!', 'Uncle is fuming!', 'Amca çok kızgın!'), 'awake'] :
    G.act === 'lie' && m === 'act' ? ['😴', L('عمّو نايم', 'Uncle is napping', 'Amca uyukluyor'), 'sleep'] : ['🙂', ACT_NAME[PRANKS[G.sid] ? PRANKS[G.sid].act : 'walk'] || L('عمّو عم يتمشّى', 'Uncle is pottering about', 'Amca dolaşıyor'), 'calm'];
  setTxt('hMood', mood[0] + ' ' + mood[1]); $('#hMood').dataset.m = mood[2];
  const sl = $('#slot'); sl.hidden = held < 0; if(held >= 0){ setTxt('slotI', GS.pr[held].p.ie); setTxt('slotB', GS.pr[held].p.te + ' ' + GS.pr[held].p.target); }
  const c = context(), key = c ? c.k + (c.id || '') + c.t : '';
  if(hudCache.act !== key){ hudCache.act = key; actBtn.hidden = !c; if(c){ $('#actI').textContent = c.i; $('#actB').textContent = c.t; actBtn.style.setProperty('--ac', c.c); actBtn.classList.toggle('pulse', !!c.pulse); actBtn.classList.toggle('dim', !!c.dim); } }
  const b = bContext(), bk = b ? b.k : '';
  if(hudCache.b !== bk){ hudCache.b = bk; bBtn.hidden = !b; if(b){ $('#bI').textContent = b.i; $('#bB').textContent = b.t; bBtn.classList.toggle('lit', !!b.lit); } }
  joyEl.hidden = !!P.hidden;
  $('#hCrouch').hidden = !P.crouch || !!P.hidden; $('#hRun').hidden = P.mode !== 'run';
  // the uncle's speech bubble follows his head when he is on screen
  const bub = $('#bubble');
  if(T < bubbleUntil){
    const p = _v.set(G.vx, G.vy + 2.2, G.vz);
    p.project(camera); const on = p.z < 1 && Math.abs(p.x) < .92 && Math.abs(p.y) < .9;
    const seen = on && (P.hidden || state === 'cine' || H.los({ x:camera.position.x, y:camera.position.y, z:camera.position.z }, { x:G.vx, y:G.vy + 1.6, z:G.vz }));
    bub.hidden = false; bub.classList.toggle('top', !seen);
    if(seen){ bub.style.left = ((p.x + 1) / 2 * SW) + 'px'; bub.style.top = ((1 - p.y) / 2 * SH) + 'px'; } else { bub.style.left = ''; bub.style.top = ''; }
  } else bub.hidden = true;
  if(T > topUntil) $('#hint').hidden = true;
}
const ACT_NAME = { sit:L('عمّو عم يقرا الجريدة', 'Uncle is reading', 'Amca gazete okuyor'), phone:L('عمّو عالتلفون', 'Uncle is on the phone', 'Amca telefonda'), tea:L('عمّو عم يشرب شاي', 'Uncle is having tea', 'Amca çay içiyor'),
  eat:L('عمّو عم يفطر', 'Uncle is having breakfast', 'Amca kahvaltı ediyor'), comb:L('عمّو عم يمشّط شواربه', 'Uncle is combing his moustache', 'Amca bıyığını tarıyor'), water:L('عمّو عم يسقي الزرع', 'Uncle is watering', 'Amca çiçek suluyor'),
  reach:L('عمّو مشغول', 'Uncle is busy', 'Amca meşgul'), look:L('عمّو عم يدوّر على شي', 'Uncle is looking for something', 'Amca bir şey arıyor'), lie:L('عمّو نايم', 'Uncle is napping', 'Amca uyukluyor') };

/* ---------- the yellow arrow: always to the next thing to do ---------- */
function hintTarget(){
  if(held >= 0) return GS.pr[held].p.spot;
  const c = GS.pr.filter(r => r.st === 'world');
  if(!c.length) return null;
  c.sort((a, b) => (Math.hypot(a.x - P.x, a.z - P.z) + Math.abs(a.y - P.y) * 4) - (Math.hypot(b.x - P.x, b.z - P.z) + Math.abs(b.y - P.y) * 4));
  return c[0];
}
function updateHint(){
  arrow.visible = state === 'play' && !P.hidden && !fp;
  const t = arrow.visible ? hintTarget() : null;
  if(!t){ arrow.visible = false; return; }
  const path = H.path({ x:P.x, y:P.y, z:P.z }, { x:t.x, y:t.y, z:t.z }), n = path[0];
  arrow.position.set(P.x, P.y + 1.75 + Math.sin(T * 4) * .08, P.z);
  arrow.rotation.set(0, Math.atan2(n.x - P.x, n.z - P.z), 0);
  if(Math.abs(n.y - P.y) > 1.2 && Math.hypot(n.x - P.x, n.z - P.z) < 1.5) arrow.rotation.x = n.y > P.y ? -.6 : .6;
}

/* ---------- screens ---------- */
const overlay = $('#overlay'), card = $('#card');
function showOverlay(cls){ overlay.hidden = false; overlay.className = 'overlay ' + (cls || ''); }
function showTitle(){
  if(R.co || MP.t) coStop();
  state = 'title'; setPlayUI(false); showOverlay('clear'); card.className = 'card bare'; clearInput(); peek(null); A.music(false); $('#comic').hidden = true;
  if(!GS) newRun(); placeTitleScene(); setTitleView(true); H.setTitle(true);
  const ts = totalStars();
  card.innerHTML = `<div class="menu">
    ${ROT ? `<div class="rothint"><i aria-hidden="true">📱</i><span>${L('لفّ الجوال على جنب', 'Turn your phone sideways', 'Telefonu yan çevir')}</span></div>` : ''}
    <div class="top"><div class="logo">👴🏻</div><h1>${L('بيت عمّو زعلان', "Uncle Grumpy's House", "Somurtkan Amca'nın Evi")}</h1></div>
    <p class="sub">${L('جارنا عمّو زعلان دايماً معصّب! تسلّل لبيته وحضّرله مقالب مضحكة 🤭', 'Our neighbour Uncle Grumpy is always grumpy! Sneak in and set up silly pranks 🤭', 'Komşumuz Somurtkan Amca hep somurtuyor! Gizlice gir ve komik şakalar hazırla 🤭')}</p>
    <button class="hero-btn" id="bHero" style="--c:${HERO_COLOR[heroId]}"><img src="${charImg(heroId)}" alt=""><span>${HERO_NAME[heroId]} 🔄</span></button>
    <button class="big-btn" id="bPlay">▶️ ${L('يلّا نعمل مقالب!', "Let's prank!", 'Hadi şaka yapalım!')}</button>
    <button class="big-btn pink" id="bMp">👫 ${L('العب مع أصحابك', 'Play with friends', 'Arkadaşlarla oyna')}</button>
    ${ts ? `<div class="mine"><span>⭐ ${N(ts)}/${N(LEVELS.length * 3)}</span></div>` : ''}
  </div>`;
  $('#bPlay').onclick = () => { A.ac(); SFX.tap(); showLevels(); };
  $('#bHero').onclick = () => { A.ac(); SFX.tap(); showSelect('title'); };
  $('#bMp').onclick = () => { A.ac(); SFX.tap(); mpMenu(); };
}
function placeTitleScene(){
  P.x = -1.0; P.z = -4.6; P.y = 0; P.face = -Math.PI / 2; P.hidden = null; P.move = 0; P.crouch = true; if(hero) hero.grp.visible = true;
  const p = PBY.whoopee; G.sid = p.i; G.mode = 'act'; G.act = 'sit'; G.x = p.stand.x; G.z = p.stand.z; G.y = 0; G.face = p.stand.f; poseAt(p, false); G.vx = G.px; G.vy = G.py; G.vz = G.pz; G.vf = G.pf;
}
/* the mission picker (also used by the room owner in co-op) */
function showLevels(forMp){
  state = forMp ? 'mp' : 'levels'; setPlayUI(false); showOverlay('dim'); card.className = 'card wide'; if(!forMp){ setTitleView(true); H.setTitle(true); }
  const ts = totalStars();
  card.innerHTML = `<h2>🗺️ ${L('مهمّات المقالب', 'Prank missions', 'Şaka görevleri')} <small class="tot">⭐ ${N(ts)}/${N(LEVELS.length * 3)}</small></h2>
    <div class="levels">${LEVELS.map((lv, i) => { const ok = unlocked(i) || forMp && i <= 2 + PROG.s.filter(Boolean).length, st = starsOf(i);
      return `<button class="lvl${ok ? '' : ' locked'}${i === levelI ? ' cur' : ''}" data-i="${i}" ${ok ? '' : 'disabled'}><b class="num">${N(i + 1)}</b><span class="le">${ok ? lv.e : '🔒'}</span><span class="ln">${lv.n}</span>
        <span class="lp">${lv.pr.map(id => PBY[id].ie).join('')}</span><span class="ls">${[0, 1, 2].map(k => k < st ? '⭐' : '<i>☆</i>').join('')}</span></button>`; }).join('')}</div>
    <div class="row"><button class="ghost-btn" id="bLvBack">↩️ ${L('رجوع', 'Back', 'Geri')}</button></div>`;
  card.querySelectorAll('.lvl:not(.locked)').forEach(b => b.onclick = () => { A.ac(); SFX.tap(); levelI = +b.dataset.i; rawSet('prank3d_last', String(levelI)); if(forMp){ MP.lv = levelI; mpLobby(); } else startGame(); });
  $('#bLvBack').onclick = () => { SFX.tap(); if(forMp) mpLobby(); else showTitle(); };
}
let selFrom = 'title', selPick = heroId;
function showSelect(from){
  selFrom = from; state = 'select'; setPlayUI(false); showOverlay('dim'); card.className = 'card wide'; selPick = heroId;
  card.innerHTML = `<h2>🦸 ${L('اختار شخصيتك', 'Pick your hero', 'Kahramanını seç')}</h2>
    <div class="heroes">${HERO_IDS.map(id => `<button class="hero${id === selPick ? ' on' : ''}" data-id="${id}" style="--c:${HERO_COLOR[id]}" aria-pressed="${id === selPick}"><img src="${charImg(id)}" alt=""><b>${HERO_NAME[id]}</b></button>`).join('')}</div>
    <button class="big-btn" id="bOkHero">✅ ${L('تمام', 'OK', 'Tamam')}</button>`;
  const btns = [...card.querySelectorAll('.hero')];
  btns.forEach(b => b.onclick = () => { selPick = b.dataset.id; SFX.tap(); btns.forEach(x => { const on = x === b; x.classList.toggle('on', on); x.setAttribute('aria-pressed', on); }); });
  $('#bOkHero').onclick = () => { SFX.tap(); if(selPick !== heroId){ heroId = selPick; rawSet('prank3d_hero', heroId); setHero(heroId); syncHeld(); if(MP.t) mpTrack(); } if(selFrom === 'pause') showPause(true); else if(selFrom === 'mp') mpBackFromSelect(); else showTitle(); };
}
function startGame(plan){
  winFrame.shown = false; cine = null; $('#comic').hidden = true; caughtFrame.gate = false; carryT = -1;
  newRun(plan); setTitleView(false); H.setTitle(false); rawSet('prank3d_last', String(levelI));
  overlay.hidden = true; state = 'play'; setPlayUI(true); placeJoyHome(); for(const k in hudCache) delete hudCache[k];
  fp = false; $('#btnEye').classList.remove('lit'); $('#btnSnd').textContent = A.muted ? '🔇' : '🔊';
  A.music(true, 'calm');
  const L0 = LEVELS[GS.lv];
  bubbleTop(L0.e + ' ' + L0.n + ' · ' + L('حضّر ', 'Set ', '') + N(L0.pr.length) + L(' مقالب: ', ' pranks: ', ' şaka hazırla: ') + GS.pr.map(r => r.p.ie + '→' + r.p.te).join('  '), 5);
}
function showPause(fromSelect){
  if(state !== 'play' && !fromSelect) return;
  state = 'pause'; setPlayUI(false); showOverlay('dim'); card.className = 'card'; clearInput(); A.music(false);
  card.innerHTML = `<h2>⏸️ ${L('استراحة', 'Paused', 'Mola')}</h2>
    <p>${LEVELS[GS.lv].e} ${LEVELS[GS.lv].n} · ${GS.pr.map(r => (r.st === 'done' ? '⭐' : r.st === 'set' ? '⏳' : '') + r.p.ie).join(' ')}</p>
    ${R.co ? `<p>👫 ${L('أصحابك لسّا عم يلعبوا، وعمّو ما بيستنّى!', "Your friends are still playing — the uncle doesn't wait!", 'Arkadaşların hâlâ oynuyor — amca beklemez!')}</p>` : ''}
    <button class="big-btn" id="bRes">▶️ ${L('كمّل', 'Continue', 'Devam')}</button>
    <div class="row">${R.co ? `<button class="ghost-btn" id="bLeaveP">🚪 ${L('اطلع من الغرفة', 'Leave the room', 'Odadan çık')}</button>` : `<button class="ghost-btn" id="bRestart">🔁 ${L('من الأول', 'Start over', 'Baştan')}</button><button class="ghost-btn" id="bLvP">🗺️ ${L('المهمّات', 'Missions', 'Görevler')}</button>`}
    <button class="ghost-btn" id="bChar">🦸 ${L('غيّر الشخصية', 'Change hero', 'Kahraman değiştir')}</button>
    <button class="ghost-btn" id="bSnd2">${A.muted ? '🔇' : '🔊'} ${L('الصوت', 'Sound', 'Ses')}</button></div>
    <button class="exit-btn">🚪 ${L('خروج', 'Exit', 'Çıkış')}</button>`;
  $('#bRes').onclick = () => { SFX.tap(); resume(); };
  if(R.co) $('#bLeaveP').onclick = () => { SFX.tap(); coStop(); showTitle(); };
  else { $('#bRestart').onclick = () => { SFX.tap(); startGame(); }; $('#bLvP').onclick = () => { SFX.tap(); showLevels(); }; }
  $('#bChar').onclick = () => { SFX.tap(); showSelect('pause'); };
  $('#bSnd2').onclick = () => { A.setMuted(!A.muted); $('#bSnd2').innerHTML = (A.muted ? '🔇' : '🔊') + ' ' + L('الصوت', 'Sound', 'Ses'); $('#btnSnd').textContent = A.muted ? '🔇' : '🔊'; if(!A.muted) SFX.tap(); };
}
function resume(){ if(state !== 'pause' && state !== 'select') return; overlay.hidden = true; state = cine ? 'cine' : 'play'; setPlayUI(true); placeJoyHome(); for(const k in hudCache) delete hudCache[k]; A.music(true, G.mode === 'chase' ? 'chase' : 'calm'); snapCam = true; }

/* ---------- drawing the kid, the uncle, the items ---------- */
function renderKid(dt){
  if(!hero) return;
  hero.grp.position.set(P.x, P.y, P.z); hero.grp.rotation.y = P.face;
  hero.grp.visible = !P.hidden && !(fp && state === 'play');
  const carried = state === 'caught' && carryT >= 0 && carryT < CARRY_T;
  hero.snk = lerp(hero.snk || 0, P.crouch || P.mode === 'sneak' ? 1 : 0, Math.min(1, 8 * dt));
  poseHero(hero, { t:T, dt, run:carried ? 1 : clamp(P.move * (P.mode === 'run' ? 1.15 : 1), 0, 1), grounded:!carried, vy:0, sq:0, flip:0, sneak:hero.snk, pace:P.mode === 'sneak' ? .6 : 1 });
  if(state === 'title' || state === 'levels'){ hero.arms[0].rotation.z = 2.3 + Math.sin(T * 8) * .3; }
}
function renderUncle(dt){
  const u = uncle;
  u.grp.position.set(G.vx, G.vy, G.vz);
  u.grp.rotation.set(0, G.vf, 0, 'YXZ');
  let act = G.act, k = G.actK;
  if(state === 'title' || state === 'levels' || (state === 'mp' && !R.co)){ act = 'sit'; }
  const lying = act === 'lie' || (act === 'fall' && G.pose === 'lie');
  if(lying){
    let roll = -Math.PI / 2, y = G.vy;
    if(act === 'fall'){ const e = clamp((k - .35) / .4, 0, 1); roll = -Math.PI / 2 * (1 - e); y = lerp(G.vy, 0, e) + Math.sin(e * Math.PI) * .6; u.grp.position.x = lerp(G.vx, PBY.hammock.stand.x, e); u.grp.position.z = lerp(G.vz, PBY.hammock.stand.z + .3, e); }
    u.grp.rotation.set(roll, G.vf, 0, 'YXZ'); u.grp.position.y = y;
  }
  if(act === 'float'){ u.grp.position.y += Math.sin(clamp(k * 1.25, 0, 1) * Math.PI) * .8; }
  if(act === 'bounce'){ u.grp.position.y += 0; }
  poseUncle(u, { t:T, move:clamp(G.speed / 2, 0, 1), act, k });
  zzz.forEach((z, i) => { const on = act === 'lie' && G.mode === 'act'; z.visible = on; if(on){ const q = ((T * .45 + i / 3) % 1); z.position.set(G.vx - 1.6 + q * .3, G.vy + .6 + q * 1.1, G.vz + Math.sin(q * 6 + i) * .2); z.material.opacity = Math.sin(q * Math.PI); } });
  for(const s of [excl, ques]){ if(!s.visible) continue; if(T > s.userData.until){ s.visible = false; continue; } s.position.set(G.vx, G.vy + 2.5 + Math.sin(T * 8) * .05, G.vz); }
}
function renderItems(dt){
  if(!GS) return;
  GS.pr.forEach((r, i) => {
    const o = IM[i]; if(!o) return;
    o.mesh.visible = r.st === 'world' || r.st === 'held'; o.spr.visible = false;
    if(r.st === 'world'){ if(o.mesh.parent !== scene) scene.add(o.mesh); o.mesh.position.set(r.x, r.y + Math.sin(T * 2.5 + i) * .03, r.z); o.mesh.rotation.y = T * .8 + i;
      if(state !== 'title' && state !== 'levels'){ o.spr.visible = true; o.spr.position.set(r.x, r.y + .3, r.z); const s = .6 + Math.sin(T * 3 + r.x) * .15; o.spr.scale.set(s, s, 1); } }
  });
  // the spot for what you carry
  const sp = held >= 0 && state === 'play' ? GS.pr[held].p.spot : null;
  spotRing.visible = spotGlow.visible = !!sp;
  if(sp){ const gy = H.groundY(sp.x, sp.z, sp.y + .1); spotRing.position.set(sp.x, Math.min(sp.y, gy) + .04 + (sp.y - gy > .3 ? sp.y - gy - .05 : 0), sp.z); const s = 1 + Math.sin(T * 5) * .12; spotRing.scale.set(s, 1, s); spotRing.rotation.y = T; spotGlow.position.set(sp.x, sp.y + .35, sp.z); spotGlow.material.opacity = .6 + Math.sin(T * 5) * .3; }
}

/* ---------- main loop ---------- */
let last = performance.now(), fps = 60, fpsN = 0, fpsT = 0, slowT = 0;
function update(dt){
  GS.t += dt;
  stepPlayer(dt); if(!R.co) updateUncle(dt); updateHint();
}
function shadowFollow(){
  const f = state === 'cine' || state === 'caught' || state === 'win' || state === 'won' ? { x:G.vx, y:G.vy, z:G.vz } : P;
  const lv = H.lvOf(f.y), st = H.stairAt(f.x, f.z, f.y), fy = st && f.y > LY[st.lo] + 1.8 ? LY[st.hi] : st ? LY[st.lo] : (f.y > -.5 && f.y < 2 && H.roomOf(f.x, f.y, f.z) === 'garden' ? 0 : LY[lv]);
  const tx = Math.round(f.x * 20) / 20, tz = Math.round(f.z * 20) / 20;
  sun.target.position.set(tx, fy, tz); sun.position.set(tx + .3, fy + 2.85, tz + .22);
}
function frame(now){
  requestAnimationFrame(frame);
  let dt = (now - last) / 1000; last = now; if(dt > .05) dt = .05; if(dt <= 0) dt = .001;
  T += dt; fpsN++; fpsT += dt;
  if(fpsT >= 1){ fps = fpsN / fpsT; fpsN = 0; fpsT = 0; if(state === 'play' && fps < 40){ slowT++; if(slowT >= 2){ slowT = 0; degrade(); } } else slowT = 0; }
  if(R.co && GS) coWorld(dt);
  if(cine) cineFrame(dt);
  if(state === 'play'){ update(dt); updateCamera(dt); hudFrame(); }
  else if(state === 'cine'){ GS.t += dt; if(!R.co) updateUncle(dt); shotCamera(dt, cine ? clamp(cine.t / REACT_T, 0, 1) : 0); hudFrame(); arrow.visible = false; }
  else if(state === 'caught'){ GS.t += dt; if(!R.co) updateUncle(dt); caughtFrame(dt); hudFrame(); arrow.visible = false; }
  else if(state === 'win' || state === 'won'){ if(!R.co) G.t += dt; winFrame(dt); arrow.visible = false; }
  else if(state === 'title' || state === 'select' || state === 'levels' || state === 'mp'){
    menuT += dt; const a = Math.sin(menuT * .12) * .14;
    camera.position.set(Math.sin(a) * 27 - 1.5, 5.0, -Math.cos(a) * 27); camera.lookAt(-1.5, 2.5, 0);
    camera.fov = 38; camera.updateProjectionMatrix(); arrow.visible = false;
  }
  if(state === 'play' || state === 'caught' || state === 'cine' || state === 'pause' || state === 'win' || state === 'won'){ if(camera.fov !== 62){ camera.fov = 62; camera.updateProjectionMatrix(); } }
  if(state === 'cine' || state === 'win' || state === 'won') setCineView(true); else if(viewOff && state !== 'title' && state !== 'levels' && state !== 'mp' && state !== 'select') setCineView(false);
  if(camOverride){ camera.position.set(camOverride[0], camOverride[1], camOverride[2]); camera.lookAt(camOverride[3], camOverride[4], camOverride[5]); }
  shadowFollow();
  renderKid(dt); renderUncle(dt); renderItems(dt); renderPeers(dt); updateParts(dt); updateRings(dt); updateStars(); updateDoors(dt); PK.update(dt, T); H.update(dt, T);
  mpFrame(dt);
  H.sky.position.copy(camera.position);
  if(state === 'mp' && MP.screen === 'connecting' && (fpsN & 7)) return;
  renderer.render(scene, camera);
}
function degrade(){
  if(quality === 2 && dpr > 1){ dpr = 1; renderer.setPixelRatio(dpr); renderer.setSize(SW, SH, false); quality = 1; return; }
  if(quality >= 1){ quality = 0; sun.shadow.mapSize.set(512, 512); if(sun.shadow.map){ sun.shadow.map.dispose(); sun.shadow.map = null; } renderer.shadowMap.type = THREE.BasicShadowMap; return; }
}

/* ======================================================================
   Online co-op («👫 العب مع أصحابك»): 2–4 kids in the same house. Nothing is stored on a server.
   The room owner (host) runs the uncle, the noise, the items, the pranks and the mission.
   Events: pos (every kid, ≤ 8 a second while moving), st (host snapshot), ev (host events), req (a friend asks the host), lob (lobby)
   Names never travel between phones: only the friend code (presence 'fc'); every phone asks the server for the name (../rt.js).
   ====================================================================== */
const MP_URL = 'https://vgpwtrzplggvlsuvqsas.supabase.co', MP_KEY = 'sb_publishable_D9thEhZlZnfn0t06j8h1Rw_H-LVF786';
const MP_EVENTS = ['pos', 'st', 'ev', 'req', 'lob'];
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
/* the room connection itself (re-join after a drop, no HTTP fallback, watchdog, reconnect chip) lives in the shared ../rt.js */
class SupabaseTransport{
  async open(code, id, h){
    if(navigator.onLine === false) throw new Error('offline');
    await loadSupabase();
    if(this.closed) throw new Error('cancelled');
    this.rt = window.BoboRT.open({ url:MP_URL, key:MP_KEY, topic:'bobo-prank3d-' + code, id, events:MP_EVENTS, eps:30, h });
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
    const bc = this.bc = new BroadcastChannel('bobo-prank3d-' + code);
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
const MP = { t:null, id:null, code:null, list:[], players:[], meta:null, isHost:false, hostId:null, synced:false, screen:'off', tok:0, stT:0, lobT:0, posAt:0, posK:'', inviteFor:null, typed:'', hostGone:0, lv:null };
window.__boboRoom = () => (MP.t && MP.meta && MP.code) ? MP.code : null;
const mpActive = () => !!(MP.t && MP.meta);
isHostCo = () => MP.isHost;
const mpNewId = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
const mpSort = (a, b) => ((a.o || 0) - (b.o || 0)) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
const okHero = id => (typeof id === 'string' && Object.prototype.hasOwnProperty.call(HEROES, id)) ? id : 'sara';
const r2 = v => Math.round(v * 100) / 100;
const numIn = (v, a, b, d = 0) => { v = +v; return isFinite(v) ? clamp(v, a, b) : d; };
const MODES = ['still', 'sneak', 'walk', 'run'];
const myAv = () => { try{ return heroId === 'me' && window.Avatar ? Avatar.load() : null; }catch(e){ return null; } };
const okAv = av => {
  try{
    if(!window.Avatar || !av || typeof av !== 'object') return null;
    const o = {};
    for(const k of Object.keys(av).slice(0, 30)){ const v = av[k]; if(v === null || typeof v === 'boolean' || (typeof v === 'number' && isFinite(v)) || (typeof v === 'string' && /^[A-Za-z][A-Za-z0-9]{0,15}$/.test(v) && !(v in Object.prototype))) o[k] = v; }
    return Avatar.normalize(o);
  }catch(e){ return null; }
};
const avPic = new Map();
function heroPic(hero, av){ if(hero !== 'me' || !av || !window.Avatar) return charImg(hero); const k = JSON.stringify(av); if(!avPic.has(k)){ try{ avPic.set(k, Avatar.portrait(av)); }catch(e){ avPic.set(k, charImg('sara')); } } return avPic.get(k); }
/* each kid starts on their own spot by the gate */
const GATE_OFF = [[0, 0], [-.8, .3], [.8, .3], [0, .9]];
gateOff = () => R.co && MP.meta ? GATE_OFF[(MP.meta.c | 0) % 4] : [0, 0];

/* «أصحابي»: tell friends which room I'm in. The server may not know the game id: every call is guarded. */
const FR_GAME = 'prank3d';
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
  peersSync();
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
function mpSend(ev, p){ if(MP.t) MP.t.send(ev, Object.assign({ id:MP.id }, p)); }
function mpPresence(list){
  list = (list || []).filter(p => p && p.ph !== 'probe');
  BoboRT.see(list, () => { if(MP.screen === 'lobby') mpLobbyDraw(); peersNames(); if(state === 'won') drawWin(); });
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
  if(joined.length && before.length) SFX.yay();
  peersSync();
  if(MP.isHost && R.co && GS && !GS.over && joined.length) coSendStart();
  if(MP.screen === 'lobby') mpLobbyDraw();
}

/* ---------- the other kids in the house ---------- */
const PEERS = new Map();
function peersSync(){
  const ids = new Set();
  for(const p of MP.players){
    if(p.id === MP.id) continue;
    ids.add(p.id);
    let a = PEERS.get(p.id);
    if(!a){
      const lbl = document.createElement('div'); lbl.className = 'ntag'; lbl.hidden = true; stage.appendChild(lbl);
      const hd = new THREE.Group(); hd.position.set(0, .62, .34);
      a = { id:p.id, c:0, hero:null, av:null, avK:'', h:null, holder:hd, lbl, x:0, y:0, z:0, f:0, m:0, tx:0, ty:0, tz:0, tf:0, tm:0, md:'still', hid:-1, seen:false, inRun:false, safe:0, snk:0, nm:'', cg:0 };
      PEERS.set(p.id, a);
    }
    a.c = p.c | 0;
    const hero = okHero(p.hero), av = hero === 'me' ? okAv(p.av) : null, avK = av ? JSON.stringify(av) : '';
    if(a.hero !== hero || a.avK !== avK){
      if(a.h){ a.h.grp.remove(a.holder); scene.remove(a.h.grp); }
      a.hero = hero; a.av = av; a.avK = avK;
      try{ a.h = hero === 'me' ? HEROES.me(av || undefined) : HEROES[hero](); }catch(e){ a.h = HEROES.sara(); }
      K.shadowHero(a.h); a.h.grp.add(a.holder); a.h.grp.visible = false; scene.add(a.h.grp);
      a.lbl.style.setProperty('--c', HERO_COLOR[hero] || '#ffcd4d');
      if(GS) syncHeld();
    }
  }
  for(const a of [...PEERS.values()]) if(!ids.has(a.id)) peerGone(a);
  peersNames();
}
function peerName(id){ const a = PEERS.get(id); return BoboRT.who(id, a ? HERO_NAME[a.hero] : '') || L('صاحبك', 'Your friend', 'Arkadaşın'); }
function peersNames(){ for(const a of PEERS.values()){ const n = peerName(a.id); if(a.nm !== n){ a.nm = n; a.lbl.textContent = n; } } }
function peerGone(a){
  if(a.h) scene.remove(a.h.grp);
  a.lbl.remove(); PEERS.delete(a.id);
  if(!GS) return;
  if(R.co && MP.isHost && !GS.over){
    const i = heldBy(a.id);
    if(i >= 0){ const r = GS.pr[i]; r.st = 'world'; r.by = ''; r.x = a.tx; r.z = a.tz; r.y = H.groundY(a.tx, a.tz, a.ty); coShare('drop', { by:a.id, i }); }
    if(G.kid === a.id && (G.mode === 'chase' || G.mode === 'toHide' || G.mode === 'shrug')) nextStation();
  }
  syncHeld();
}
function renderPeers(dt){
  const inHouse = R.co && GS && (state === 'play' || state === 'pause' || state === 'cine' || state === 'caught' || state === 'win' || state === 'won' || state === 'select');
  const k = 1 - Math.exp(-10 * dt);
  for(const a of PEERS.values()){
    if(!a.h) continue;
    const vis = inHouse && a.inRun && a.seen && a.hid < 0;
    if(Math.hypot(a.tx - a.x, a.tz - a.z) > 3 || Math.abs(a.ty - a.y) > 1.5){ a.x = a.tx; a.y = a.ty; a.z = a.tz; a.f = a.tf; }
    a.x = lerp(a.x, a.tx, k); a.y = lerp(a.y, a.ty, k); a.z = lerp(a.z, a.tz, k); a.f += angDiff(a.tf, a.f) * k; a.m = lerp(a.m, a.tm, k);
    a.h.grp.visible = vis;
    if(!vis){ a.lbl.hidden = true; continue; }
    a.h.grp.position.set(a.x, a.y, a.z); a.h.grp.rotation.y = a.f;
    a.snk = lerp(a.snk, a.md === 'sneak' ? 1 : 0, Math.min(1, 8 * dt));
    const up = a.y - H.groundY(a.x, a.z, a.y) > 1;
    poseHero(a.h, { t:T + a.c, dt, run:up ? 1 : clamp(a.m * (a.md === 'run' ? 1.15 : 1), 0, 1), grounded:!up, vy:0, sq:0, flip:0, sneak:a.snk, pace:a.md === 'sneak' ? .6 : 1 });
    _v.set(a.x, a.y + (a.hero === 'qamar' ? 1.35 : 1.6), a.z).project(camera);
    const on = _v.z < 1 && Math.abs(_v.x) < 1.02 && Math.abs(_v.y) < 1.02;
    a.lbl.hidden = !on;
    if(on){
      a.lbl.style.left = ((_v.x + 1) / 2 * SW).toFixed(1) + 'px'; a.lbl.style.top = ((1 - _v.y) / 2 * SH).toFixed(1) + 'px';
      if(((T * 4) | 0) % 2 === (a.c & 1)) a.lbl.classList.toggle('far', !H.los({ x:camera.position.x, y:camera.position.y, z:camera.position.z }, { x:a.x, y:a.y + 1.2, z:a.z }));
    }
  }
}

/* ---------- my position for everyone ---------- */
function mpPos(force){
  if(!mpActive() || !R.co || !GS) return;
  const now = performance.now();
  const hid = P.hidden ? HIDES.indexOf(P.hidden) : -1;
  const key = hid + ':' + P.mode + ':' + state;
  const moving = P.move > .03 || Math.hypot(P.vx, P.vz) > .05 || state === 'caught';
  if(!force){
    if(now - MP.posAt < 125) return;
    if(!moving && key === MP.posK && now - MP.posAt < 1000) return;
  }
  MP.posAt = now; MP.posK = key;
  mpSend('pos', { r:R.n, x:r2(P.x), y:r2(P.y), z:r2(P.z), f:r2(P.face), m:r2(P.move), md:P.mode, h:hid });
}
function coPosNow(){ mpPos(true); }
function onPos(p){
  const a = PEERS.get(p.id); if(!a || !R.co || p.r !== R.n) return;
  a.tx = numIn(p.x, -40, 40); a.ty = numIn(p.y, -6, 12); a.tz = numIn(p.z, -40, 40); a.tf = numIn(p.f, -1e4, 1e4); a.tm = numIn(p.m, 0, 1.5);
  a.md = MODES.includes(p.md) ? p.md : 'walk';
  const h = Number.isInteger(p.h) && p.h >= 0 && p.h < HIDES.length ? p.h : -1;
  if(!a.seen){ a.seen = true; a.x = a.tx; a.y = a.ty; a.z = a.tz; a.f = a.tf; }
  a.inRun = true;
  if(h !== a.hid){ a.hid = h; if(h >= 0 && MP.isHost && GS && !GS.over) hideReact(a.id, HIDES[h], a.tx, a.tz); }
}

/* ---------- host: share the house ---------- */
const PR_ST = ['world', 'held', 'set', 'done'];
function packShared(){ return { p:GS.pr.map(r => [r.st, r2(r.x), r2(r.y), r2(r.z), r.by || '']), c:GS.caught }; }
function coShare(k, extra){ if(R.co && MP.isHost && GS) mpSend('ev', Object.assign({ r:R.n, k, s:packShared() }, extra || {})); }
netFx = o => { if(R.co && MP.isHost) mpSend('ev', Object.assign({ r:R.n }, o)); };
const G_MODES = ['go', 'act', 'curious', 'search', 'chase', 'toHide', 'shrug', 'carry', 'react', 'win'];
const G_ACTS = ['walk', 'read', 'sit', 'phone', 'tea', 'eat', 'reach', 'water', 'comb', 'lie', 'look', 'shrug', 'yawn', 'shout', 'grab', 'drop', 'wave', 'stomp', 'jump', 'spit', 'shock', 'dance', 'hop', 'bounce', 'boing', 'buried', 'fall', 'float'];
function hostSnap(){
  mpSend('st', { r:R.n, g:[r2(G.vx), r2(G.vy), r2(G.vz), r2(G.vf), G.mode, G.act, r2(G.actK), r2(G.speed), G.pose || '', G.sid, G.react, r2(G.x), r2(G.z)], k:G.kid || '', s:packShared() });
}
/* a friend's phone: apply the host's mission state */
function applyShared(s){
  if(!s || typeof s !== 'object' || !GS) return;
  if(Array.isArray(s.p)) s.p.forEach((q, i) => {
    const r = GS.pr[i]; if(!r || !Array.isArray(q)) return;
    const st = PR_ST.includes(q[0]) ? q[0] : r.st, by = typeof q[4] === 'string' ? q[4].slice(0, 40) : '';
    if(st === 'held' && by === MP.id && !(r.st === 'held' && r.by === MP.id)){ SFX.pickup(); burst(r.x, r.y + .2, r.z, 14, ['#fff1a0', '#ffffff', '#ffcd4d'], { speed:1.5, up:2, g:3, life:.8, size:.7 }); bubbleTop(r.p.ie + ' ' + r.p.name + ' → ' + r.p.te + ' ' + r.p.target, 3.2); }
    if(st === 'set' && r.st !== 'set') placeFx(i, r.by);
    r.st = st; r.by = st === 'held' ? by : '';
    r.x = numIn(q[1], -40, 40, r.x); r.y = numIn(q[2], -6, 12, r.y); r.z = numIn(q[3], -40, 40, r.z);
  });
  if(Number.isFinite(+s.c)) GS.caught = clamp(+s.c | 0, 0, 999);
  syncHeld(); syncFixtures();
}
const GT = { x:0, y:0, z:0, f:0, set:false };
function onSnap(p){
  if(MP.isHost || !R.co || !GS || p.r !== R.n || GS.over) return;
  const g = p.g;
  if(Array.isArray(g)){
    GT.x = numIn(g[0], -40, 40); GT.y = numIn(g[1], -6, 12); GT.z = numIn(g[2], -40, 40); GT.f = numIn(g[3], -1e4, 1e4);
    if(!GT.set){ GT.set = true; G.vx = GT.x; G.vy = GT.y; G.vz = GT.z; G.vf = GT.f; }
    if(G_MODES.includes(String(g[4]))) G.mode = String(g[4]);
    if(G_ACTS.includes(String(g[5]))) G.act = String(g[5]);
    G.actK = numIn(g[6], 0, 1.5); G.speed = numIn(g[7], 0, 8); G.pose = ['', 'sit', 'lie', 'bath'].includes(g[8]) ? g[8] : '';
    const sid = g[9] | 0; if(sid >= 0 && sid < PRANKS.length) G.sid = sid;
    G.react = Number.isInteger(g[10]) && g[10] >= 0 && g[10] < PRANKS.length ? g[10] : -1;
    G.x = numIn(g[11], -40, 40, GT.x); G.z = numIn(g[12], -40, 40, GT.z); G.y = GT.y; G.face = GT.f;
  }
  G.kid = typeof p.k === 'string' ? p.k : '';
  applyShared(p.s);
}
/* a friend's phone: the uncle moves smoothly between the host's snapshots */
function clientUncle(dt){
  const k = 1 - Math.exp(-10 * dt);
  if(Math.hypot(GT.x - G.vx, GT.z - G.vz) > 3 || Math.abs(GT.y - G.vy) > 1.5){ G.vx = GT.x; G.vy = GT.y; G.vz = GT.z; }
  G.vx = lerp(G.vx, GT.x, k); G.vy = lerp(G.vy, GT.y, k); G.vz = lerp(G.vz, GT.z, k); G.vf += angDiff(GT.f, G.vf) * k;
  if(state === 'play'){ if(G.mode === 'chase' && G.kid === MP.id){ if(A.musicMode !== 'chase') A.setMode('chase'); } else if(A.musicMode === 'chase') A.setMode('calm'); }
}
/* the house keeps going in co-op whatever this kid is doing */
function coWorld(dt){
  if(!GS || !(state === 'play' || state === 'pause' || state === 'cine' || state === 'caught' || state === 'select' || state === 'win' || state === 'won')) return;
  if(state !== 'play' && state !== 'caught' && state !== 'cine') GS.t += GS.over ? 0 : dt;
  if(GS.over && G.mode !== 'win') return;
  if(MP.isHost) updateUncle(dt); else clientUncle(dt);
}
/* a friend's phone: noise and actions go to the host */
function coReq(p){ coPosNow(); mpSend('req', Object.assign({ r:R.n }, p)); }
function coNoise(x, y, z, Rr){ if(R.co && GS && !GS.over) coReq({ k:'n', x:r2(x), y:r2(y), z:r2(z), R:r2(Rr) }); }
function coAsk(c){
  if(c.k === 'pick') coReq({ k:'pick', i:c.id });
  else if(c.k === 'drop') coReq({ k:'drop', x:r2(P.x + Math.sin(P.face) * .45), z:r2(P.z + Math.cos(P.face) * .45) });
  else if(c.k === 'place') coReq({ k:'place' });
  SFX.tap();
}
/* host: a friend asks */
function onReq(p){
  if(!MP.isHost || !R.co || !GS || GS.over || p.r !== R.n) return;
  const a = PEERS.get(p.id); if(!a || !a.seen) return;
  const k = kidById(a.id); if(!k) return;
  const near = (x, y, z, r) => Math.hypot(k.x - x, k.z - z) < r && Math.abs(k.y - y) < 2;
  if(p.k === 'n'){ const x = +p.x, y = +p.y, z = +p.z, rr = numIn(p.R, 0, 12); if(isFinite(x) && isFinite(y) && isFinite(z) && near(x, y, z, 5)){ ring(x, y, z, rr); hearNoise(x, y, z, rr); } }
  else if(p.k === 'pick'){ const i = p.i | 0, r = GS.pr[i]; if(r && r.st === 'world' && near(r.x, r.y, r.z, 2.4)) pickUp(i, a.id); }
  else if(p.k === 'drop'){ dropHeld(true, a.id, { x:numIn(p.x, -40, 40), z:numIn(p.z, -40, 40) }); }
  else if(p.k === 'place'){ const i = heldBy(a.id); if(i >= 0){ const s = GS.pr[i].p.spot; if(Math.hypot(k.x - s.x, k.z - s.z) < 2.2 && Math.abs(k.y - s.y) < 2.3) placePrank(a.id); } }
}

/* ---------- win together ---------- */
function coWin(){
  if(!GS || GS.over) return;
  const secs = Math.round(GS.t), stars = 1 + (GS.caught === 0 ? 1 : 0) + (secs <= PAR(GS.lv) ? 1 : 0);
  GS.result = { stars, secs, caught:GS.caught };
  mpSend('ev', { r:R.n, k:'win', res:GS.result, s:packShared() });
  startWinSeq();
}
function teamList(){
  const out = [{ id:MP.id, hero:heroId, av:myAv(), me:true, c:MP.meta ? MP.meta.c : 0 }];
  for(const a of PEERS.values()) if(a.inRun && a.h) out.push({ id:a.id, hero:a.hero, av:a.av, c:a.c });
  return out.sort((p, q) => p.c - q.c);
}
function teamSlots(stars){
  return `<div class="pslots">${teamList().map(p => `<div class="pslot" style="--c:${HERO_COLOR[p.hero] || '#ffcd4d'}"><img src="${p.me ? charImg(p.hero) : heroPic(p.hero, p.av)}" alt=""><span dir="auto">${p.me ? L('إنت', 'You', 'Sen') : BoboRT.whoH(p.id, HERO_NAME[p.hero])}${p.id === MP.hostId ? ' 👑' : ''}</span>${stars != null ? `<small>${'⭐'.repeat(stars)}</small>` : ''}</div>`).join('')}</div>`;
}
function endButtons(){
  const nx = GS && GS.lv < LEVELS.length - 1;
  return `<div class="row">${MP.isHost ? `${nx ? `<button class="big-btn" id="bNextCo">▶️ ${L('المهمّة الجاية', 'Next mission', 'Sonraki görev')}</button>` : ''}<button class="ghost-btn" id="bAgainCo">🔁 ${L('كمان مرّة', 'Play again', 'Tekrar oyna')}</button>` : `<p>${L('استنّى صاحب الغرفة…', 'Waiting for the room owner…', 'Oda sahibini bekle…')}</p>`}
    <button class="ghost-btn" id="bLeaveCo">🚪 ${L('اطلع من الغرفة', 'Leave the room', 'Odadan çık')}</button></div>`;
}
function wireEnd(){
  const a = $('#bAgainCo'); if(a) a.onclick = () => { SFX.tap(); winFrame.shown = false; coStartRun(GS.lv); };
  const n = $('#bNextCo'); if(n) n.onclick = () => { SFX.tap(); winFrame.shown = false; coStartRun(GS.lv + 1); };
  $('#bLeaveCo').onclick = () => { SFX.tap(); winFrame.shown = false; coStop(); showTitle(); };
}

/* ---------- starting a run ---------- */
function coSendStart(){ mpSend('ev', { r:R.n, k:'start', n:R.n, plan:GS.plan, s:packShared(), t:Math.round(GS.t) }); }
function coStartRun(lv){
  if(!MP.isHost || !mpActive()) return;
  R.n++;
  levelI = clamp(lv != null ? lv : (MP.lv != null ? MP.lv : levelI), 0, LEVELS.length - 1); MP.lv = levelI;
  const plan = makePlan(levelI);
  R.co = true; MP.screen = 'in';
  coBegin(plan);
  coSendStart();
}
function coBegin(plan){
  for(const a of PEERS.values()){ a.inRun = false; a.seen = false; a.hid = -1; a.safe = 0; a.cg = 0; }
  GT.set = false; meSafe = 0;
  startGame(plan);
  coPosNow();
}
function onStart(p){
  const plan = okPlan(p.plan); if(!plan) return;
  const n = p.n | 0;
  if(R.co && n === R.n && GS && !GS.over) return;
  if(MP.screen !== 'lobby' && MP.screen !== 'in') return;
  R.n = n; R.co = true; MP.screen = 'in';
  coBegin(plan);
  applyShared(p.s); GS.t = numIn(p.t, 0, 36000);
}
function mpMsg(ev, p){
  if(ev === 'pos'){ onPos(p); return; }
  if(ev === 'req'){ onReq(p); return; }
  if(p.id !== MP.hostId) return;
  if(ev === 'lob'){ if(!MP.isHost){ if(Number.isInteger(p.lv) && p.lv >= 0 && p.lv < LEVELS.length) MP.lv = p.lv; if(MP.screen === 'lobby') mpLobbyDraw(); } return; }
  if(MP.isHost) return;
  if(ev === 'st'){ onSnap(p); return; }
  if(ev !== 'ev') return;
  if(p.k === 'start'){ onStart(p); return; }
  if(!R.co || !GS || p.r !== R.n) return;
  if(p.k === 'say'){ const l = Object.prototype.hasOwnProperty.call(LINES, p.c) ? LINES[p.c] : null; if(l && l[p.i | 0]){ A.mumble(5, 160); bubbleUncle(l[p.i | 0], 2.6); } }
  else if(p.k === 'mk'){ showMark(p.m ? excl : ques, numIn(p.s, .2, 3, 1)); }
  else if(p.k === 'sfx'){ if(p.n === 'spot'){ SFX.spot(); SFX.hey(); } else if(p.n === 'hey') SFX.hey(); }
  else if(p.k === 'prank'){ const i = p.i | 0; if(i >= 0 && i < PRANKS.length && !(cine && cine.i === i)){ G.mode = 'react'; G.react = i; reactFx(i); } applyShared(p.s); }
  else if(p.k === 'carry'){ applyShared(p.s); if(typeof p.t === 'string'){ G.mode = 'carry'; onCarry(p.t); } }
  else if(p.k === 'win'){ if(GS.over) return; applyShared(p.s); GS.result = p.res && typeof p.res === 'object' ? { stars:p.res.stars, secs:p.res.secs, caught:p.res.caught } : null; G.mode = 'win'; startWinSeq(); }
  else applyShared(p.s);
}
function mpFrame(dt){
  if(!mpActive()) return;
  if(MP.hostGone && performance.now() - MP.hostGone > 5000){
    MP.hostGone = 0; coStop(); showTitle();
    toast(L('صاحب الغرفة طلع 🚪 بتقدر تلعب لحالك أو تعمل غرفة جديدة', 'The room owner left 🚪 play alone or make a new room', 'Oda sahibi çıktı 🚪 tek başına oyna ya da yeni oda kur'), 5000);
    return;
  }
  MP.stT -= dt; MP.lobT -= dt; MP.fcT = (MP.fcT || 0) - dt;
  if(MP.meta && !MP.meta.fc && MP.fcT <= 0){
    MP.fcT = 2; const c = BoboRT.fc();
    if(c){ MP.meta.fc = c; MP.t.track(MP.meta); }
    else if(!MP.fcAsked && window.Friends && Friends.has && Friends.has()){ MP.fcAsked = true; try{ const q = Friends.me(); if(q && q.catch) q.catch(() => {}); }catch(e){} }
  }
  if(R.co && GS && !GS.over && state !== 'mp') mpPos(false);
  if(MP.isHost && R.co && GS && !GS.over && MP.stT <= 0){ MP.stT = .15; hostSnap(); }
  if(MP.isHost && MP.screen === 'lobby' && MP.lobT <= 0){ MP.lobT = 1; mpSend('lob', { lv:MP.lv != null ? MP.lv : levelI, ph:'idle' }); }
}
function coStop(){
  const was = R.co;
  MP.tok++; mpClose(); MP.screen = 'off'; R.co = false; meSafe = 0; GT.set = false;
  for(const a of [...PEERS.values()]) peerGone(a);
  if(was){ GS = null; held = -1; cine = null; }
}

/* ---------- menu, lobby, keypad ---------- */
let toastTO = 0;
function toast(text, ms = 3500){ const el = $('#toast'); el.textContent = text; el.hidden = false; clearTimeout(toastTO); toastTO = setTimeout(() => { el.hidden = true; }, ms); }
function mpCard(wide){ state = 'mp'; setPlayUI(false); showOverlay('dim'); card.className = 'card' + (wide ? ' wide' : ''); }
function myHeroBtn(){ return `<button class="hero-btn" id="bMyHero" style="--c:${HERO_COLOR[heroId]}"><img src="${charImg(heroId)}" alt=""><span>${HERO_NAME[heroId]} 🔄</span></button>`; }
function mpMenu(){
  MP.tok++; mpClose(); MP.screen = 'menu'; R.co = false; mpCard(false);
  card.innerHTML = `<h2>👫 ${L('العب مع أصحابك', 'Play with friends', 'Arkadaşlarla oyna')}</h2>
    <p>👴🏻 ${L('لحتى 4 أصحاب ببيت عمّو زعلان: حضّروا المقالب سوا!', "Up to 4 friends in Uncle Grumpy's house: set the pranks together!", "Somurtkan Amca'nın evinde 4 arkadaşa kadar: şakaları birlikte kurun!")}</p>
    ${myHeroBtn()}
    <div class="row"><button class="big-btn" id="bCreate">🏠 ${L('اعمل غرفة', 'Create room', 'Oda kur')}</button>
    <button class="big-btn mint" id="bJoin">🔢 ${L('فوت على غرفة', 'Join room', 'Odaya katıl')}</button></div>
    <div class="row"><button class="ghost-btn" id="bBack">↩️ ${L('رجوع', 'Back', 'Geri')}</button></div>`;
  $('#bMyHero').onclick = () => { SFX.tap(); showSelect('mp'); };
  $('#bCreate').onclick = () => { SFX.tap(); mpCreate(); };
  $('#bJoin').onclick = () => { SFX.tap(); mpKeypad(''); };
  $('#bBack').onclick = () => { SFX.tap(); showTitle(); };
}
function mpBack(){
  if(MP.screen === 'menu') showTitle();
  else if(MP.screen === 'lobby'){ mpLeave(); mpMenu(); }
  else mpMenu();
}
function mpBackFromSelect(){ if(mpActive() && MP.screen === 'lobby'){ mpTrack(); mpLobby(); } else mpMenu(); }
function mpLeave(){ MP.tok++; mpClose(); MP.screen = 'off'; R.co = false; }
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
  R.co = false; MP.screen = 'lobby'; if(MP.lv == null) MP.lv = levelI; mpCard(true); mpLobbyDraw();
  if(MP.isHost) mpSend('lob', { lv:MP.lv, ph:'idle' });
}
function mpLobbyDraw(){
  if(MP.screen !== 'lobby' || state !== 'mp') return;
  const pl = MP.players, code = [...(MP.code || '')].map(N).join('');
  const slots = [0, 1, 2, 3].map(i => { const p = pl[i]; if(!p) return `<div class="pslot empty"><div class="wait">⏳</div><small>${L('استنّى…', 'Waiting…', 'Bekle…')}</small></div>`;
    const hero = okHero(p.hero), me = p.id === MP.id;
    return `<div class="pslot" style="--c:${HERO_COLOR[hero]}"><img src="${me ? charImg(hero) : heroPic(hero, okAv(p.av))}" alt=""><span dir="auto">${me ? L('إنت', 'You', 'Sen') : ('👫 ' + BoboRT.whoH(p.id, '')).trim()}${p.id === MP.hostId ? ' 👑' : ''}</span></div>`; }).join('');
  const lv = LEVELS[clamp(MP.lv != null ? MP.lv : levelI, 0, LEVELS.length - 1)], li = LEVELS.indexOf(lv);
  const lvTag = `<span class="lvtag">${lv.e} ${N(li + 1)} · ${lv.n} <i>${lv.pr.map(id => PBY[id].ie).join('')}</i></span>`;
  card.innerHTML = `<h2>🏠 ${L('غرفة رقم', 'Room number', 'Oda numarası')} <bdi dir="ltr">${code}</bdi></h2>
    <div class="pslots">${slots}</div>
    ${MP.isHost ? `<p>${L('قلّ لأصحابك رقم الغرفة 👆', 'Tell your friends the room number 👆', 'Arkadaşlarına oda numarasını söyle 👆')}</p>
      <div class="row" style="align-items:center"><button class="ghost-btn" id="bPickLv">🗺️ ${lvTag}</button>${myHeroBtn()}</div>
      <div class="row"><button class="big-btn" id="bStart">▶️ ${L('ابدأ', 'Start', 'Başla')}</button><button class="ghost-btn" id="bLeave">🚪 ${L('اطلع', 'Leave', 'Çık')}</button></div>`
    : `<p>${lvTag} · ${L('استنّى صاحب الغرفة يبدأ…', 'Wait for the room owner to start…', 'Oda sahibinin başlatmasını bekle…')}</p>
      <div class="row">${myHeroBtn()}<button class="ghost-btn" id="bLeave">🚪 ${L('اطلع', 'Leave', 'Çık')}</button></div>`}`;
  if(MP.isHost){
    $('#bPickLv').onclick = () => { SFX.tap(); MP.screen = 'lobby'; showLevels(true); };
    $('#bStart').onclick = () => { A.ac(); SFX.tap(); coStartRun(); };
  }
  $('#bMyHero').onclick = () => { SFX.tap(); showSelect('mp'); };
  $('#bLeave').onclick = () => { SFX.tap(); mpLeave(); mpMenu(); };
}
async function mpCreate(want){
  mpConnecting();
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
    if(r === 'ok'){ mpLobby(); mpSend('lob', { ask:1 }); }
    else if(r === 'full') mpKeypad(L('الغرفة مليانة', 'The room is full', 'Oda dolu') + ' 🙈');
    else mpKeypad(L('ما لقينا هالغرفة، تأكّد من الرقم', "We couldn't find that room — check the number", 'Bu oda bulunamadı, numarayı kontrol et'));
  }catch(e){ MP.err = String(e && (e.stack || e.message)).slice(0, 400); if(MP.screen === 'connecting' && String(e && e.message) !== 'cancelled') mpError(() => mpJoin(code)); }
}
/* «تعا العب» from the friends page: ?host=1&invite=<friendCode>. The server may not accept 'prank3d': guarded. */
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
  else if(k === 'ok'){ if(MP.typed.length === 4) mpJoin(MP.typed); else SFX.wrong(); return; }
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
window.__prank = {
  get state(){ return state; }, get fps(){ return fps; }, get dpr(){ return dpr; }, get hero(){ return heroId; }, get level(){ return GS ? GS.lv : levelI; },
  get pranks(){ return GS ? GS.pr.map(r => ({ id:r.id, st:r.st, by:r.by, x:r.x, y:r.y, z:r.z, spot:r.p.spot })) : null; }, get held(){ return held; },
  get player(){ return { x:P.x, y:P.y, z:P.z, lv:H.lvOf(P.y), hidden:P.hidden && P.hidden.kind, mode:P.mode, crouch:P.crouch, room:H.roomOf(P.x, P.y, P.z) }; },
  get uncle(){ return { x:G.x, y:G.y, z:G.z, vx:G.vx, vy:G.vy, vz:G.vz, mode:G.mode, act:G.act, sid:G.sid, station:PRANKS[G.sid] && PRANKS[G.sid].id, room:H.roomOf(G.x, G.y, G.z), path:G.path.length, react:G.react, kid:G.kid }; },
  get ctx(){ const c = context(); return c && c.k; }, get bctx(){ const c = bContext(); return c && c.k; }, get result(){ return GS && GS.result; }, get caught(){ return GS && GS.caught; },
  get hides(){ return HIDES.map(h => ({ kind:h.kind, x:h.x, z:h.z, lv:h.lv, out:h.out })); }, get prog(){ return JSON.parse(JSON.stringify(PROG)); }, get cine(){ return cine && { i:cine.i, t:cine.t, shot:[shot.p.x, shot.p.y, shot.p.z, shot.fb, shot.a], cam:[camera.position.x, camera.position.y, camera.position.z] }; },
  levels:LEVELS.length, start(lv){ if(lv != null) levelI = lv; startGame(); }, title:() => showTitle(), showLevels:() => showLevels(),
  back(){ if(state === 'select' && selFrom === 'pause') showPause(true); else if(state === 'select' && selFrom === 'mp') mpBackFromSelect(); else if(state === 'mp') mpBack(); else showTitle(); },
  pause:() => showPause(), resume:() => resume(), act:() => doAction(), b:() => doB(),
  teleport(x, z, lv){
    if(typeof x === 'string'){ const n = x;
      if(n === 'gate'){ x = GATE.x; z = GATE.z; lv = 1; }
      else if(n.startsWith('item') || n.startsWith('spot')){ const i = +n.slice(4) || 0, r = GS.pr[i]; const t = n.startsWith('item') ? r : r.p.spot; lv = H.lvOf(t.y - .3); const free = [[.7, 0], [-.7, 0], [0, .7], [0, -.7], [.9, .5], [-.9, .5], [.5, -.9], [-.5, -.9]].map(([a, b]) => ({ x:t.x + a, z:t.z + b })).find(q => (H.floorAt(lv, q.x, q.z)) && !H.blocked(q.x, LY[lv] + .5, q.z, .3) && !H.blocked(q.x, LY[lv] + .2, q.z, .3)) || { x:t.x + .6, z:t.z }; x = free.x; z = free.z; }
      else if(PBY[n]){ const p = PBY[n]; x = p.stand.x; z = p.stand.z; lv = p.lv; }
      else if(H.ROOM[n]){ const r = H.ROOM[n]; x = r.c[0]; z = r.c[1]; lv = r.lv; } }
    if(P.hidden) exitHide(); P.x = x; P.z = z; P.y = LY[lv != null ? lv : H.lvOf(P.y)]; P.vx = P.vz = 0; snapCam = true; return this.player;
  },
  face(a){ P.face = a; cam.yaw = a + Math.PI; snapCam = true; }, yaw(a, p){ cam.yaw = a; if(p != null) cam.pitch = p; snapCam = true; },
  hideAt(kind, n = 0){ const h = HIDES.filter(h => h.kind === kind)[n]; if(!h) return null; this.teleport(h.out.x, h.out.z, H.lvOf(h.y + .1)); enterHide(h); return h.kind; },
  setUncle(x, z, lv, mode){ unpose(); G.x = x; G.z = z; G.y = LY[lv]; G.mode = mode || 'search'; G.t = 0; G.path = []; if(mode === 'chase'){ G.chaseT = 0; G.lostT = 0; G.lastSeen = { x:P.x, y:P.y, z:P.z }; G.kid = myId(); say('spot'); } visualUncle(1); return this.uncle; },
  faceUncleTo(x, z){ G.face = Math.atan2(x - G.x, z - G.z); },
  uncleTo(id){ const p = PBY[id]; unpose(); G.sid = p.i; G.x = p.stand.x; G.z = p.stand.z; G.y = p.stand.y; G.mode = 'act'; G.t = 0; G.face = p.stand.f; poseAt(p, false); return this.uncle; },
  noise(x, y, z, Rr){ makeNoise(x, y, z, Rr, 'test'); return this.uncle; },
  setFP(b){ fp = b; snapCam = true; }, crouch(b){ P.crouch = !!b; },
  /* run the simulation n seconds without waiting for frames (deterministic tests) */
  sim(sec, input){ const dt = 1 / 30; for(let i = 0; i < sec * 30; i++){ T += dt; if(input){ joy.x = input.x || 0; joy.y = input.y || 0; } if(cine) cineFrame(dt);
      if(state === 'play') update(dt); else if(state === 'cine'){ GS.t += dt; if(!R.co) updateUncle(dt); } else if(state === 'caught'){ GS.t += dt; if(!R.co) updateUncle(dt); caughtFrame(dt); } else if(state === 'win' || state === 'won'){ if(!R.co) G.t += dt; winFrame(dt); }
      if(R.co && GS) coWorld(dt); } joy.x = joy.y = 0; return state; },
  cam(a){ camOverride = a; }, peek:(y, p) => { cam.peekY = y; cam.peekP = p || 0; },
  overview(){ state = 'overview'; overlay.hidden = true; setPlayUI(false); H.setTitle(true); camera.clearViewOffset(); },
  H, PRANKS:PRANKS.map(p => p.id),
  get mpScreen(){ return MP.screen; }, get co(){ return R.co; }, get run(){ return R.n; },
  get mp(){ return { code:MP.code, active:mpActive(), isHost:MP.isHost, hostId:MP.hostId, screen:MP.screen, id:MP.id, lv:MP.lv, players:MP.players.map(p => ({ id:p.id, hero:p.hero, c:p.c })) }; },
  get peers(){ return [...PEERS.values()].map(a => ({ id:a.id, hero:a.hero, x:a.x, y:a.y, z:a.z, tx:a.tx, tz:a.tz, hid:a.hid, inRun:a.inRun, seen:a.seen, visible:!!(a.h && a.h.grp.visible), label:a.lbl.hidden ? null : a.lbl.textContent, held:heldBy(a.id) })); },
  get mpErr(){ return MP.err || ''; }, get over(){ return GS && GS.over; },
  mpMenu:() => mpMenu(), mpCreate:(c) => mpCreate(c), mpJoin:(c) => mpJoin(c), mpStart:(lv) => coStartRun(lv), mpLeave:() => { coStop(); showTitle(); }, mpLevel(lv){ MP.lv = lv; if(MP.screen === 'lobby') mpLobbyDraw(); },
  pos:() => coPosNow()
};

/* ---------- boot ---------- */
setHero(heroId);
resize();
showTitle();
requestAnimationFrame(frame);
[1, 2, 0, 3].forEach((lv, i) => setTimeout(() => { try{ navGrid(lv); }catch(e){} }, 600 + i * 250));
/* ?host=1 (&room=<4 digits>, &invite=<friendCode>, &accept=<id> for invitepop.js) makes a room; ?join=<room> joins one */
(function(){
  const join = QS.get('join'), host = QS.get('host') === '1', inv = QS.get('invite'), room = QS.get('room');
  if(!/^\d{4}$/.test(join || '') && !host) return;
  const q = new URLSearchParams(location.search); ['join', 'host', 'invite', 'room'].forEach(k => q.delete(k));
  try{ history.replaceState(history.state, '', location.pathname + (q.toString() ? '?' + q : '') + location.hash); }catch(e){}
  if(/^\d{4}$/.test(join || '')) mpJoin(join, performance.now() + 20000);
  else { MP.inviteFor = /^[A-Z2-9]{6}$/.test(inv || '') ? inv : null; mpCreate(/^\d{4}$/.test(room || '') ? room : null); }
})();
