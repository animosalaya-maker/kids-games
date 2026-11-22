/* «مدينة الملاهي بالغيم» Sky Fun Park: cloud islands high over a little island, reached by a giant beanstalk, a hot-air
   balloon or a rainbow spring. Rainbow bridges, a Ferris wheel, a zipline tour between clouds and the 60-second coin rush. Local coords. */
import { SKY, skyBridge, stalkLeaves, wheelSeat, zipAt, ZSTN, zkit, portal, ZONES } from './zones.js';

const smooth = t => t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t);

export function build(api, Z){
  const { THREE, K, L, N } = api;
  function ground(x, z){ const r = Math.hypot(x, z); if(r < 42) return 0; if(r < 50) return -1.6 * smooth((r - 42) / 8); return -1.6 - 2.4 * smooth((r - 50) / 16); }
  const k = zkit(THREE, K, Z, ground), { M, CG, G, Merge, addC, addB, rnd, group } = k;
  const C = { grass:0x8ad86a, grass2:0x6cc45a, white:0xffffff, cloud2:0xe8e0ff, lilac:0xc8b4ff, pink:0xff8fb8, gold:0xffc83a, red:0xff5d73, blue:0x7fc8ff, green:0x5fe3b1, stalk:0x4fb04a, stalk2:0x3f9a3f, wood:0xb87a48, woodD:0x8a5532 };
  const RAIN = [0xff6f8e, 0xffb070, 0xffe27a, 0x7fe8a8, 0x7fc8ff, 0xb48cff];
  const P = api.P, CL = SKY.clouds;

  /* ---------- the little island ---------- */
  const rings = []; for(let r = 0; r <= 90; r += r < 42 ? 3 : r < 52 ? 1 : 6) rings.push(r);
  k.groundMesh(90, rings, (x, z, r, y, c) => { const nz = Math.sin(x * .3 + Math.cos(z * .2) * 2) * .5 + Math.sin(z * .2 - x * .1) * .5;
    if(r < 41) c.set(C.grass).lerp(new THREE.Color(C.grass2), .5 + nz * .5); else c.set(0xf6deb0).lerp(new THREE.Color(C.grass), smooth((42 - r) / 2)); }, 110);

  /* ---------- clouds (walkable, fluffy) ---------- */
  for(const id in CL){
    const c = CL[id], m = M(c.x, c.z);
    m.add(CG.sph, c.x, c.y - 1.5, c.z, c.r + .3, 1.5, c.r + .3, 0, 0, 0, C.white);
    m.add(CG.sph, c.x, c.y - 2.6, c.z, c.r * .85, 1.8, c.r * .85, 0, 0, 0, C.cloud2);
    const n = Math.round(c.r * 1.6);
    for(let q = 0; q < n; q++){ const a = q / n * 6.283 + rnd() * .3, r = c.r + .1, s = 1.2 + rnd() * .8; m.add(CG.sph, c.x + Math.sin(a) * r, c.y - .9 + rnd() * .3, c.z + Math.cos(a) * r, s, s * .8, s, 0, 0, 0, q % 3 ? C.white : 0xf4f0ff);
      m.add(CG.sph, c.x + Math.sin(a + .2) * r * .85, c.y - 2.6, c.z + Math.cos(a + .2) * r * .85, s * 1.1, s * .9, s * 1.1, 0, 0, 0, C.lilac); }
    for(let q = 0; q < 5; q++){ const a = rnd() * 6.283, r = rnd() * c.r * .6; m.add(CG.sph, c.x + Math.sin(a) * r, c.y - .25, c.z + Math.cos(a) * r, 1.4 + rnd(), .4, 1.4 + rnd(), 0, 0, 0, C.white); }
    addC(c.x, c.z, c.r, c.y - 2.4, c.y);
  }
  /* rainbow bridges */
  for(const [a, b] of SKY.bridges){
    const br = skyBridge(a, b), ry = Math.atan2(br.ux, br.uz);
    br.pts.forEach((p, i) => { const m = M(p.x, p.z); RAIN.forEach((col, q) => { const l = -1.25 + (q + .5) * 2.5 / 6; m.add(G.box, p.x + br.uz * l, p.y - .15, p.z - br.ux * l, 2.5 / 6 + .01, .3, 1.25, 0, ry, 0, col); });
      if(i % 3 === 0) for(const sd of [-1, 1]){ const x = p.x + br.uz * sd * 1.35, z = p.z - br.ux * sd * 1.35; m.add(CG.cyl8, x, p.y + .4, z, .06, .8, .06, 0, 0, 0, C.white); m.add(CG.sph, x, p.y + .85, z, .16, .16, .16, 0, 0, 0, RAIN[(i / 3) % 6 | 0]); }
      addC(p.x, p.z, 1.3, p.y - .5, p.y); });
  }

  /* ---------- the beanstalk ---------- */
  const leaves = stalkLeaves();
  (() => {
    const pts = []; for(let i = 0; i <= 40; i++){ const t = i / 40, y = t * (SKY.stalk.top + 2); pts.push(new THREE.Vector3(SKY.stalk.x + Math.sin(t * 9) * .5, y, SKY.stalk.z + Math.cos(t * 9) * .5)); }
    const tube = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 80, 1, 10), new THREE.MeshLambertMaterial({ color:C.stalk })); tube.castShadow = true; group.add(tube);
    const vine = []; for(let i = 0; i <= 80; i++){ const t = i / 80, y = t * (SKY.stalk.top + 1), a = t * 26; vine.push(new THREE.Vector3(SKY.stalk.x + Math.sin(a) * 1.05, y, SKY.stalk.z + Math.cos(a) * 1.05)); }
    group.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(vine), 200, .2, 6), new THREE.MeshLambertMaterial({ color:C.stalk2 })));
    addC(SKY.stalk.x, SKY.stalk.z, 1.1, 0, SKY.stalk.top + 2);
    leaves.forEach((l, i) => { const m = M(l.x, l.z), r = l.big ? 2.2 : 1.3;
      m.add(CG.sph, l.x, l.y - .18, l.z, r, .22, r * 1.25, 0, l.a, 0, i % 2 ? 0x5fc45a : 0x6fd46a); m.add(G.box, l.x, l.y - .02, l.z, .08, .04, r * 2, 0, l.a, 0, 0x3f9a3f);
      if(!l.big){ const sx = (l.x + SKY.stalk.x) / 2, sz = (l.z + SKY.stalk.z) / 2; m.add(CG.cyl8, sx, l.y - .3, sz, .12, 2.6, .12, Math.PI / 2, l.a, 0, C.stalk2); }
      addC(l.x, l.z, r, l.y - .5, l.y); });
    k.sign(L('شجرة الفول', 'Beanstalk', 'Fasulye sırığı'), '#5fe3b1', SKY.stalk.x, 4.6, SKY.stalk.z + 3.4, 3.4);
  })();

  /* ---------- the Ferris wheel on cloud M ---------- */
  const WH = SKY.wheel, HUBY = WH.y + WH.R + 1.6;
  const wheel = (() => {
    const fm = M(WH.x, WH.z);
    for(const sz of [-1.4, 1.4]) for(const sx of [-1, 1]){ const x0 = WH.x + sx * 5.5, h = HUBY - WH.y, len = Math.hypot(5.5, h), ang = Math.atan2(5.5, h) * sx;
      fm.add(CG.cyl8, (x0 + WH.x) / 2, WH.y + h / 2, WH.z + sz, .25, len, .25, 0, 0, ang, 0xfff7e8); addC(x0, WH.z + sz, .35, WH.y, WH.y + 2); }
    fm.add(CG.cyl, WH.x, HUBY, WH.z, .5, 3.2, .5, Math.PI / 2, 0, 0, C.gold);
    const g = new THREE.Group(); g.position.set(WH.x, HUBY, WH.z); group.add(g);
    const wm = new Merge();
    for(const sz of [-.6, .6]){ wm.add(new THREE.TorusGeometry(WH.R, .16, 8, 60), 0, 0, sz, 1, 1, 1, 0, 0, 0, C.pink); }
    for(let q = 0; q < 16; q++){ const a = q / 16 * 6.283; wm.add(CG.cyl8, Math.sin(a) * WH.R / 2, -Math.cos(a) * WH.R / 2, 0, .07, WH.R, .07, 0, 0, a, 0xfff7e8); }
    for(let q = 0; q < 24; q++){ const a = q / 24 * 6.283; wm.add(CG.sph, Math.sin(a) * WH.R, -Math.cos(a) * WH.R, .75, .16, .16, .16, 0, 0, 0, RAIN[q % 6]); }
    const wmesh = new THREE.Mesh(wm.geometry(), new THREE.MeshLambertMaterial({ vertexColors:true })); g.add(wmesh);
    const cabGeo = (() => { const m = new Merge(); m.add(G.box, 0, -.9, 0, 1.6, .2, 1.4, 0, 0, 0, 0xffffff); for(const sx of [-1, 1]) m.add(G.box, sx * .78, -.4, 0, .08, 1, 1.4, 0, 0, 0, 0xffffff); m.add(G.box, 0, -.45, -.66, 1.6, .9, .08, 0, 0, 0, 0xffffff);
      m.add(CG.hemi, 0, .5, 0, 1, .55, .85, 0, 0, 0, 0xffffff); m.add(CG.cyl8, 0, .7, 0, .06, .6, .06, 0, 0, 0, 0x888899); return m.geometry(); })();
    const cabs = []; for(let q = 0; q < 8; q++){ const c = new THREE.Mesh(cabGeo, new THREE.MeshLambertMaterial({ color:RAIN[q % 6] })); group.add(c); cabs.push(c); }
    return { g, cabs, cabGeo };
  })();
  const myCab = new THREE.Mesh(wheel.cabGeo, new THREE.MeshLambertMaterial({ color:0xffe27a })); myCab.visible = false; group.add(myCab);

  /* ---------- zipline tour: posts on the clouds and cables ---------- */
  (() => {
    for(const id of new Set(SKY.zip)){ const c = CL[id], m = M(c.x, c.z); m.add(CG.cyl8, c.x, c.y + 2.3, c.z, .2, 4.6, .2, 0, 0, 0, C.woodD); m.add(G.box, c.x, c.y + 4.5, c.z, 1.4, .2, .2, 0, 0, 0, C.woodD); addC(c.x, c.z, .3, c.y, c.y + 4.6); }
    const pts = []; for(let i = 0; i <= 200; i++){ const p = zipAt(i / 200); pts.push(new THREE.Vector3(p[0], p[1] + 2.05, p[2])); }
    group.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 300, .05, 5), new THREE.MeshLambertMaterial({ color:0x4a3a2a })));
  })();
  /* ---------- the hot-air balloon and the rainbow spring ---------- */
  const balloon = (() => { const g = new THREE.Group(), m = new Merge();
    for(let q = 0; q < 12; q++) m.add(new THREE.SphereGeometry(3.2, 6, 14, q / 12 * 6.283, 6.283 / 12), 0, 6.5, 0, 1, 1.15, 1, 0, 0, 0, q % 2 ? 0xff6f8e : 0xffe27a);
    m.add(G.box, 0, .5, 0, 1.8, 1, 1.8, 0, 0, 0, C.wood); for(const [x, z] of [[-.8, -.8], [.8, -.8], [-.8, .8], [.8, .8]]) m.add(CG.cyl8, x, 2.2, z, .03, 2.6, .03, 0, 0, 0, 0x5a4a3a);
    const mesh = new THREE.Mesh(m.geometry(), new THREE.MeshLambertMaterial({ vertexColors:true })); mesh.castShadow = true; g.add(mesh); g.position.set(SKY.balloon.x, 0, SKY.balloon.z); group.add(g); return g; })();
  const bpad = { x:SKY.balloon.x, z:SKY.balloon.z + 2.6 };
  const BTOP = { x:8, z:-12, y:CL.M.y };
  (() => { const s = SKY.spring, m = M(s.x, s.z); m.add(CG.cyl, s.x, .25, s.z, 1.8, .5, 1.8, 0, 0, 0, 0x7fc8ff); for(let q = 0; q < 6; q++) m.add(CG.cyl, s.x, .55 + q * .02, s.z, 1.6 - q * .25, .05, 1.6 - q * .25, 0, 0, 0, RAIN[q]);
    addC(s.x, s.z, 1.6, 0, .55, { bounce:1, bv:44, lx:(BTOP.x - 4 - s.x) / 2.05, lz:(BTOP.z - s.z) / 2.05, air:2.3, bc:'#b48cff' });
    k.sign(L('النابض السحري', 'Magic spring', 'Sihirli yay'), '#b48cff', s.x, 3.4, s.z, 3.4); })();
  // decor on the island: a carousel, flowers, a candy-floss cart, floating balloons around
  const carousel = (() => { const x = -22, z = -10, g = new THREE.Group(), m = new Merge();
    m.add(CG.cyl, 0, .2, 0, 4.4, .4, 4.4, 0, 0, 0, 0xfff7e8); m.add(CG.cyl, 0, 2.3, 0, .3, 4.2, .3, 0, 0, 0, C.gold); m.add(CG.cone, 0, 5.1, 0, 4.8, 1.6, 4.8, 0, 0, 0, C.pink); m.add(CG.sph, 0, 6.1, 0, .4, .4, .4, 0, 0, 0, C.gold);
    for(let q = 0; q < 6; q++){ const a = q / 6 * 6.283, px = Math.sin(a) * 3.2, pz = Math.cos(a) * 3.2; m.add(CG.cyl8, px, 2.4, pz, .06, 4, .06, 0, 0, 0, C.gold); m.add(CG.sph, px, 1.4, pz, .45, .45, .75, 0, a + Math.PI / 2, 0, RAIN[q]); m.add(CG.sph, px + Math.cos(a) * .55, 1.9, pz - Math.sin(a) * .55, .26, .3, .3, 0, 0, 0, RAIN[q]); }
    const mesh = new THREE.Mesh(m.geometry(), new THREE.MeshLambertMaterial({ vertexColors:true })); mesh.castShadow = true; g.add(mesh); g.position.set(x, 0, z); group.add(g); addC(x, z, 4.4, 0, 5); return g; })();
  for(let i = 0; i < 80; i++){ const a = rnd() * 6.283, r = 6 + rnd() * 34, x = Math.sin(a) * r, z = Math.cos(a) * r;
    if(Math.hypot(x + 22, z + 10) < 6 || Math.hypot(x - 14, z - 10) < 5 || Math.hypot(x - SKY.spring.x, z - SKY.spring.z) < 3 || Math.hypot(x, z) < 5 || (Math.abs(x) < 4 && z > 26)) continue;
    const m = M(x, z, true); for(let q = 0; q < 4; q++){ const b = q / 4 * 6.283; m.add(CG.sm, x + Math.sin(b) * .12, .45, z + Math.cos(b) * .12, .1, .06, .1, 0, 0, 0, RAIN[i % 6]); } m.add(CG.cyl8, x, .2, z, .03, .4, .03, 0, 0, 0, 0x3f9a48); }
  const floaters = []; for(let i = 0; i < 5; i++){ const g = balloon.clone(); g.scale.setScalar(.7); group.add(g); floaters.push({ g, a:i / 5 * 6.283, r:70 + i * 9, y:24 + i * 7 }); }

  /* ---------- pads, signs, portal ---------- */
  const sC = ZSTN.coins; k.pad(sC.x, sC.z, sC.y, sC.col); k.sign(sC.name, sC.col, sC.x, sC.y + 3.4, sC.z);
  const PADS = { balloon:{ x:bpad.x, z:bpad.z, y:0 }, wheel:{ x:WH.x, z:WH.z + 3, y:WH.y }, zip:{ x:CL.E.x, z:CL.E.z + 3, y:CL.E.y } };
  k.pad(PADS.balloon.x, PADS.balloon.z, 0, '#ff6f8e'); k.sign(L('المنطاد', 'Balloon', 'Balon'), '#ff6f8e', bpad.x, 3.2, bpad.z + .6, 3);
  k.pad(PADS.wheel.x, PADS.wheel.z, WH.y, '#ff8fb8'); k.sign(L('دولاب الهوا', 'Ferris wheel', 'Dönme dolap'), '#ff8fb8', PADS.wheel.x + 3.2, WH.y + 2.6, PADS.wheel.z + 1, 3.4);
  k.pad(PADS.zip.x, PADS.zip.z, CL.E.y, '#ffb070'); k.sign(L('جولة الحبال', 'Zipline tour', 'Zipline turu'), '#ffb070', PADS.zip.x, CL.E.y + 6.2, PADS.zip.z, 3.4);
  const back = portal(THREE, K, group, Z.portal.x, 0, Z.portal.z, 0, '#ffcd4d', ZONES.castle.name, k.ox, k.oz); back.to = 'castle';

  /* ---------- coins for the coin rush ---------- */
  const COINS = [];
  for(const id in CL){ const c = CL[id], n = id === 'M' ? 6 : 4; for(let q = 0; q < n; q++){ const a = q / n * 6.283 + .4, r = c.r * .55; COINS.push({ x:c.x + Math.sin(a) * r, z:c.z + Math.cos(a) * r, y:c.y + (q % 2 ? 2.2 : 1) }); } }
  for(const [a, b] of SKY.bridges){ const br = skyBridge(a, b); [.3, .7].forEach(t => { const p = br.pts[Math.round(t * (br.pts.length - 1))]; COINS.push({ x:p.x, z:p.z, y:p.y + 1 }); }); }
  COINS.length = Math.min(COINS.length, 40);
  const coinGeo = new THREE.CylinderGeometry(.55, .55, .14, 20).rotateX(Math.PI / 2);
  const coinMesh = new THREE.InstancedMesh(coinGeo, new THREE.MeshPhongMaterial({ color:0xffc83a, emissive:0x6a4000, shininess:90, specular:0xfff2b0 }), COINS.length); coinMesh.frustumCulled = false; coinMesh.visible = false; group.add(coinMesh);
  k.finish();

  /* ---------- rides ---------- */
  let bRide = false;
  function rideBalloon(up){
    bRide = true;
    api.startRide({ dur:10, pose:'stand', md:6, dist:12, pitch:.3,
      at:t => { const u = smooth(t), x = up ? SKY.balloon.x + (BTOP.x - SKY.balloon.x) * smooth((t - .4) / .6) : BTOP.x + (SKY.balloon.x - BTOP.x) * smooth(t / .6), z = up ? SKY.balloon.z + (BTOP.z - SKY.balloon.z) * smooth((t - .4) / .6) : BTOP.z + (SKY.balloon.z - BTOP.z) * smooth(t / .6);
        const y = up ? (u < 1 ? Math.min(BTOP.y + .2, (BTOP.y + 4) * smooth(t / .75)) : BTOP.y) : (BTOP.y + .2) * (1 - smooth((t - .3) / .7)); return [x + k.ox, y + .45, z + k.oz]; },
      step:() => { balloon.position.set(P.x - k.ox, P.y - .45, P.z - k.oz); },
      end:() => { bRide = false; if(up){ api.tp(BTOP.x - 2.5 + k.ox, BTOP.y, BTOP.z - 1.5 + k.oz, Math.PI); balloon.position.set(SKY.balloon.x, 0, SKY.balloon.z); } else { balloon.position.set(SKY.balloon.x, 0, SKY.balloon.z); api.tp(bpad.x + k.ox, 0, bpad.z + 1.5 + k.oz, Math.PI); } } });
    api.tone(300, .8, 'sine', .06, 0, 500);
  }
  let wheelT0 = 0;
  function rideWheel(){
    myCab.visible = true; wheelT0 = api.T;
    api.startRide({ dur:20, pose:'sit', md:6, dist:16, pitch:.25, face:Math.PI,
      at:t => { const p = wheelSeat(t * 6.283); return [p[0] + k.ox, p[1], p[2] + k.oz]; },
      step:() => { myCab.position.set(P.x - k.ox, P.y + .95, P.z - k.oz); },
      end:() => { myCab.visible = false; api.tp(PADS.wheel.x + k.ox, WH.y, PADS.wheel.z + 1.2 + k.oz, 0); } });
  }
  function rideZip(){
    api.startRide({ dur:26, pose:'hang', md:9, dist:9, pitch:.3, at:t => { const p = zipAt(t); return [p[0] + k.ox, p[1], p[2] + k.oz]; },
      end:() => { api.tp(PADS.zip.x + k.ox, CL.E.y, PADS.zip.z + 1.5 + k.oz, 0); } });
    api.SFX.zip();
  }

  /* ---------- coin rush ---------- */
  let CR = null;
  const coinsMode = {
    start(run){ CR = { got:new Set(), run }; coinMesh.visible = true; api.tp(sC.x + k.ox, sC.y, sC.z - 1.5 + k.oz, Math.PI); },
    step(){
      if(!CR) return; const T = api.T;
      if(T >= CR.run.cdEnd) COINS.forEach((c, i) => { if(CR.got.has(i)) return; if(Math.abs(P.x - k.ox - c.x) < 1.3 && Math.abs(P.z - k.oz - c.z) < 1.3 && Math.abs(P.y + .7 - c.y) < 1.5){ CR.got.add(i); api.SFX.coin(); api.burst(c.x + k.ox, c.y, c.z + k.oz, 10, ['#ffd23f', '#ffffff'], 3); } });
      const n = CR.got.size;
      if(n >= COINS.length){ api.finishStation('coins', n); return; }
      if(api.runTime() >= 60){ if(n >= 20) api.finishStation('coins', n); else api.failStation('coins', n); }
    },
    hud(t){ return '🪙 ' + N(CR ? CR.got.size : 0) + '/' + N(COINS.length) + '  ⏳ ' + api.fmtSec(60 - t); },
    prog(){ return CR ? CR.got.size : 0; },
    end(){ coinMesh.visible = false; CR = null; }
  };

  /* ---------- per frame ---------- */
  const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _v = new THREE.Vector3(), _s = new THREE.Vector3();
  function animate(T, dt, camPos){
    const wa = T * .3; wheel.g.rotation.z = wa;
    wheel.cabs.forEach((c, q) => { const a = q / 8 * 6.283 + wa; c.position.set(WH.x + Math.sin(a) * WH.R, HUBY - Math.cos(a) * WH.R + .05, WH.z); c.rotation.z = Math.sin(T + q) * .05; });
    carousel.rotation.y = T * .5;
    if(!bRide) balloon.position.set(SKY.balloon.x, Math.sin(T * 1.2) * .1 + .1, SKY.balloon.z);
    floaters.forEach((f, i) => { const a = f.a + T * .02; f.g.position.set(Math.sin(a) * f.r, f.y + Math.sin(T * .5 + i) * 1.5, Math.cos(a) * f.r); });
    if(CR) COINS.forEach((c, i) => { const s = CR.got.has(i) ? 0 : 1; _m.compose(_v.set(c.x, c.y + Math.sin(T * 3 + i) * .12, c.z), _q.setFromEuler(_e.set(0, T * 3 + i, 0)), _s.set(s, s, s)); coinMesh.setMatrixAt(i, _m); });
    if(CR) coinMesh.instanceMatrix.needsUpdate = true;
    for(const m of k.culled){ const c = m.userData.c; m.visible = Math.hypot(camPos.x - c[0], camPos.z - c[1]) < 95; }
  }
  const near = (p, r = 1.6) => Math.hypot(P.x - k.ox - p.x, P.z - k.oz - p.z) < r && Math.abs(P.y - p.y) < 1.2;
  function ctx(){
    if(near(PADS.balloon)) return { k:'z', key:'balloon', icon:'🎈', label:L('طير', 'Fly', 'Uç'), col:'#ff6f8e', go:() => rideBalloon(true) };
    if(near({ x:BTOP.x, z:BTOP.z, y:BTOP.y }, 2)) return { k:'z', key:'balloonDn', icon:'🎈', label:L('انزل', 'Down', 'İn'), col:'#ff6f8e', go:() => rideBalloon(false) };
    if(near(PADS.wheel)) return { k:'z', key:'wheel', icon:'🎡', label:L('اركب', 'Ride', 'Bin'), col:'#ff8fb8', go:rideWheel };
    if(near(PADS.zip)) return { k:'z', key:'zip', icon:'🎢', label:L('انزلق', 'Zip!', 'Kay!'), col:'#ffb070', go:rideZip };
    return null;
  }
  function miniBg(x, s){
    x.fillStyle = '#f6deb0'; x.beginPath(); x.arc(0, 0, 50 * s, 0, 7); x.fill();
    x.fillStyle = '#8ad86a'; x.beginPath(); x.arc(0, 0, 42 * s, 0, 7); x.fill();
    for(const [a, b] of SKY.bridges){ const A = CL[a], B = CL[b]; x.strokeStyle = '#ff8fb8'; x.lineWidth = 2.6 * s; x.beginPath(); x.moveTo(A.x * s, A.z * s); x.lineTo(B.x * s, B.z * s); x.stroke(); }
    for(const id in CL){ const c = CL[id]; x.fillStyle = 'rgba(255,255,255,.92)'; x.beginPath(); x.arc(c.x * s, c.z * s, c.r * s, 0, 7); x.fill(); }
    x.fillStyle = '#4fb04a'; x.beginPath(); x.arc(0, 0, 2.2 * s, 0, 7); x.fill();
  }
  function miniDots(x, s){ if(!CR) return; x.fillStyle = '#ffd23f'; COINS.forEach((c, i) => { if(CR.got.has(i)) return; x.beginPath(); x.arc(c.x * s, c.z * s, 2.4, 0, 7); x.fill(); }); }
  const test = { coins:COINS.map(c => ({ x:c.x + k.ox, z:c.z + k.oz, y:c.y })), get got(){ return CR ? CR.got.size : 0; }, rideBalloon:() => rideBalloon(true), rideWheel, rideZip, leaves:leaves.map(l => ({ x:l.x + k.ox, z:l.z + k.oz, y:l.y })), pads:Object.fromEntries(Object.entries(PADS).map(([n, p]) => [n, { x:p.x + k.ox, z:p.z + k.oz, y:p.y }])) };
  return { atmo:{ hemi:0xfff0f8, hemiG:0x9a8ac8, sun:0xffd8b8, sunI:2.4, fog:0xf8d0d8 }, group, solids:k.solids, movers:k.movers, ground, portals:[back], animate, ctx, modes:{ coins:coinsMode }, miniBg, miniDots, test };
}
