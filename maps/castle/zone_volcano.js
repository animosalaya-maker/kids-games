/* «بركان الحمم الطري» Soft Lava Volcano: an obby spiralling up a cartoon volcano on a tropical island.
   The "lava" is soft bouncy orange jelly: touching it just boings you back to your last flag. Local coords. */
import { VOLC, coneR, obbyPath, ZSTN, zkit, portal, ZONES } from './zones.js';

const smooth = t => t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t);

export function build(api, Z){
  const { THREE, K, L, N } = api;
  const VX = VOLC.cx, VZ = VOLC.cz;
  function ground(x, z){
    const r = Math.hypot(x, z);
    if(r < 80) return 0; if(r < 88) return -1.6 * smooth((r - 80) / 8); return -1.6 - 2.4 * smooth((r - 88) / 18);
  }
  const k = zkit(THREE, K, Z, ground), { M, CG, G, Merge, addC, addB, rnd, group } = k;
  const C = { grass:0x6cc45a, grass2:0x4fae4f, sand:0xf3d9a0, rock:0x8a5a6a, rock2:0x6a4458, moss:0x5fae55, jelly:0xff8a2c, wood:0xb87a48, woodD:0x8a5532, gold:0xffc83a, white:0xfffaf0 };
  const OB = obbyPath();

  /* ---------- ground: tropical grass, sand beach ---------- */
  const rings = []; for(let r = 0; r <= 120; r += r < 40 ? 4 : r < 80 ? 3 : r < 92 ? 1.2 : 6) rings.push(r);
  k.groundMesh(120, rings, (x, z, r, y, c) => {
    const nz = Math.sin(x * .21 + Math.cos(z * .17) * 2) * .5 + Math.sin(z * .13 - x * .07) * .5;
    if(r < 78) c.set(C.grass).lerp(new THREE.Color(C.grass2), .5 + nz * .5).lerp(new THREE.Color(0xffd27a), .06);
    else c.set(C.sand).lerp(new THREE.Color(C.grass), smooth((79 - r) / 2));
    const vr = Math.hypot(x - VX, z - VZ); if(vr < 40) c.lerp(new THREE.Color(0x8a6a5a), smooth((40 - vr) / 6) * .5);
  }, 140);

  /* ---------- the volcano (one lathe) + soft jelly ring + glowing crater ---------- */
  (() => {
    const o = { pos:[], col:[], idx:[] }, NA = 110, cc = new THREE.Color(), H = VOLC.H;
    const prof = []; for(let i = 0; i <= 14; i++){ const y = -0.3 + i / 14 * (H + .3); prof.push([coneR(y) + .45, y]); }
    prof.push([VOLC.top + 1.2, H + .7], [VOLC.top - .2, H + 1.1], [VOLC.top - 1.2, H + .4], [VOLC.top - 2.6, H - 2.5]);
    const base = 0;
    for(let j = 0; j <= NA; j++){
      const a = j / NA * Math.PI * 2;
      prof.forEach(([r, y], pi) => {
        const wob = pi < 15 ? Math.sin(a * 9 + y * .4) * .25 + Math.sin(a * 23) * .12 : 0, rr = r + wob;
        o.pos.push(VX + Math.sin(a) * rr, y, VZ + Math.cos(a) * rr);
        const h = y / H; cc.set(C.rock).lerp(new THREE.Color(C.rock2), h * .8);
        if(y < 3.5) cc.lerp(new THREE.Color(C.moss), smooth((3.5 - y) / 3) * .85);
        if(pi >= 15) cc.set(pi === 16 ? 0x7a4a5a : 0x5a3448);
        const st = Math.sin(y * 1.4 + Math.sin(a * 3) * .8); if(pi < 15 && y > 4) cc.multiplyScalar(.93 + .07 * st);
        o.col.push(cc.r, cc.g, cc.b);
      });
    }
    const n = prof.length;
    for(let j = 0; j < NA; j++) for(let i = 0; i < n - 1; i++){ const a = base + j * n + i, b = a + 1, d = a + n, e = b + n; o.idx.push(a, d, b, b, d, e); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(o.pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(o.col, 3)); g.setIndex(o.idx); g.computeVertexNormals();
    const m = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ vertexColors:true })); m.castShadow = m.receiveShadow = true; group.add(m);
    // collision: bands you cannot stand on (you slide down into the jelly)
    for(let y = 0; y < H; y += 2) addC(VX, VZ, coneR(y) + .3, y, y + 2, { nofloor:1 });
    // drips of jelly down the sides (glowing), the crater jelly
    for(let j = 0; j < 9; j++){ const a = j / 9 * 6.283 + .4, len = 3 + (j % 3) * 2.2;
      for(let q = 0; q < 6; q++){ const y = H + .4 - q / 5 * len, r = coneR(y) + .55, w = .55 - q * .04;
        k.glow.add(CG.sph, VX + Math.sin(a) * r, y, VZ + Math.cos(a) * r, w, .7, w, 0, 0, 0, q === 5 ? 0xffb050 : 0xff8a2c); } }
    const crater = new THREE.Mesh(new THREE.CircleGeometry(VOLC.top - 1.4, 40).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color:0xff9a3c })); crater.position.set(VX, H - 1.2, VZ); group.add(crater);
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map:k.glowTex, color:0xff8a3c, transparent:true, opacity:.7, depthWrite:false, blending:THREE.AdditiveBlending })); glow.position.set(VX, H + 2, VZ); glow.scale.set(30, 16, 1); group.add(glow);
  })();
  // the jelly ring (shiny, wobbles)
  const jelly = new THREE.Mesh(new THREE.RingGeometry(VOLC.base - .5, VOLC.jelly + .3, 90, 3).rotateX(-Math.PI / 2), new THREE.MeshPhongMaterial({ color:0xff8a2c, emissive:0x8a2a00, specular:0xffe0b0, shininess:110 }));
  jelly.position.set(VX, .14, VZ); jelly.receiveShadow = true; group.add(jelly);
  (() => { const m = M(VX, VZ + VOLC.jelly); for(let j = 0; j < 70; j++){ const a = j / 70 * 6.283, r = VOLC.jelly + .45, x = VX + Math.sin(a) * r, z = VZ + Math.cos(a) * r; M(x, z, true).add(CG.sm, x, .15, z, .55, .35, .55, 0, 0, 0, j % 2 ? 0x8a6a5a : 0x9a7a62); } void m; })();
  // wobble blobs on the jelly
  const blobs = []; for(let j = 0; j < 14; j++){ const a = rnd() * 6.283, r = VOLC.base + 1.5 + rnd() * 5.5; blobs.push({ x:VX + Math.sin(a) * r, z:VZ + Math.cos(a) * r, ph:rnd() * 6, s:.5 + rnd() * .5 }); }
  const blobM = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 12, 8), new THREE.MeshPhongMaterial({ color:0xffa040, emissive:0x8a3000, shininess:110, specular:0xffe0b0 }), blobs.length); group.add(blobM);

  /* ---------- the obby ---------- */
  const PCOL = [0xff5d73, 0xffc83a, 0x4fa3ff, 0x5fe3b1, 0xb48cff, 0xff9a3c];
  const moving = [], spinners = [], checkpoints = [];
  const platParts = (m, x, y, z, R, col, top = 0xfff7e8) => { m.add(CG.cyl, x, y - .35, z, R, .7, R, 0, 0, 0, col); m.add(CG.cyl, x, y - .01, z, R - .12, .04, R - .12, 0, 0, 0, top); for(let q = 0; q < 8; q++){ const a = q / 8 * 6.283; m.add(CG.sm, x + Math.sin(a) * (R - .05), y - .35, z + Math.cos(a) * (R - .05), .14, .14, .14, 0, 0, 0, top); } };
  const platGeo = (R, col, top = 0xfff7e8) => { const m = new Merge(); m.add(CG.cyl, 0, -.35, 0, R, .7, R, 0, 0, 0, col); m.add(CG.cyl, 0, -.01, 0, R - .12, .04, R - .12, 0, 0, 0, top); for(let q = 0; q < 8; q++){ const a = q / 8 * 6.283; m.add(CG.sm, Math.sin(a) * (R - .05), -.35, Math.cos(a) * (R - .05), .14, .14, .14, 0, 0, 0, top); } return m.geometry(); };
  const flagParts = (m, x, y, z, a, col) => { m.add(CG.cyl8, x, y + 1.3, z, .06, 2.6, .06, 0, 0, 0, 0xfff7e8); m.add(CG.sph, x, y + 2.65, z, .12, .12, .12, 0, 0, 0, C.gold); m.add(CG.cone4, x + Math.cos(a) * .55, y + 2.2, z - Math.sin(a) * .55, .45, 1.1, .08, 0, a, Math.PI / 2, col); };
  OB.forEach((e, i) => {
    const col = PCOL[i % PCOL.length], ux = Math.sin(e.a), uz = Math.cos(e.a);
    // a peg into the volcano under each platform
    const px = VX + ux * (coneR(e.y) + 1.2), pz = VZ + uz * (coneR(e.y) + 1.2);
    if(e.t !== 'm' && e.t !== 'e' && e.t !== 'f') M(px, pz).add(G.box, px, e.y - .55, pz, .35, .35, 2.6, 0, e.a, 0, C.woodD);
    if(e.t === 'm' || e.t === 'e'){
      const mesh = new THREE.Mesh(platGeo(e.R, col), new THREE.MeshLambertMaterial({ vertexColors:true })); mesh.castShadow = true; group.add(mesh);
      const s = k.mover({ t:'c', x:e.x, z:e.z, r:e.R, y0:e.y - .7, y1:e.y, ob:i });
      moving.push({ e, s, mesh, ux, uz, ph:i * 1.7, kind:e.t, bx:e.x, bz:e.z, by:e.y });
      return;
    }
    const m = M(e.x, e.z);
    if(e.t === 'b'){ // a bouncy mushroom
      m.add(CG.cyl, e.x, e.y - 1, e.z, .45, 2, .45, 0, 0, 0, 0xfff3dc);
      m.add(CG.hemi, e.x, e.y - .2, e.z, e.R + .1, .7, e.R + .1, 0, 0, 0, 0xff5d73);
      for(let q = 0; q < 6; q++){ const a = q / 6 * 6.283; m.add(CG.sm, e.x + Math.sin(a) * e.R * .6, e.y + .22, e.z + Math.cos(a) * e.R * .6, .2, .09, .2, 0, 0, 0, 0xffffff); }
      addC(e.x, e.z, e.R, e.y - .7, e.y, { bounce:1, bv:16.5, bc:'#ff8fb8', ob:i });
      return;
    }
    const top = e.t === 'f' ? C.gold : e.t === 'k' ? 0xfff7e8 : 0xfff7e8, cc = e.t === 'f' ? 0xffb020 : e.t === 'k' ? 0x5fe3b1 : col;
    platParts(m, e.x, e.y, e.z, e.R, cc, top);
    addC(e.x, e.z, e.R, e.y - .7, e.y, { ob:i });
    if(e.t === 'k'){ flagParts(m, e.x + ux * (e.R - .4), e.y, e.z + uz * (e.R - .4), e.a, 0xff5d73); checkpoints.push(i); }
    if(e.t === 'p'){ const bar = new THREE.Mesh(new THREE.CylinderGeometry(.22, .22, e.R * 2 + .3, 12).rotateZ(Math.PI / 2), new THREE.MeshPhongMaterial({ color:0xff5d73, shininess:60 }));
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(.35, .35, 1, 14), new THREE.MeshLambertMaterial({ color:0xfff7e8 })); hub.position.set(e.x, e.y + .5, e.z); group.add(hub);
      for(const sd of [-1, 1]){ const b = new THREE.Mesh(new THREE.SphereGeometry(.32, 12, 8), new THREE.MeshPhongMaterial({ color:0xffc83a })); b.position.x = sd * (e.R + .15); bar.add(b); }
      bar.position.set(e.x, e.y + .75, e.z); group.add(bar); spinners.push({ e, bar, ph:i }); addC(e.x, e.z, .35, e.y, e.y + 1); }
    if(e.t === 'f'){ // the golden bell arch at the top
      const ang = e.a; for(const sd of [-1, 1]){ const x = e.x + Math.cos(ang) * sd * 2.4, z = e.z - Math.sin(ang) * sd * 2.4; m.add(CG.cyl8, x, e.y + 1.6, z, .16, 3.2, .16, 0, 0, 0, C.gold); addC(x, z, .2, e.y, e.y + 3.2); }
      m.add(G.box, e.x, e.y + 3.3, e.z, 5.2, .3, .3, 0, ang + Math.PI / 2, 0, C.gold);
      m.add(CG.hemi, e.x, e.y + 2.3, e.z, .7, .9, .7, 0, 0, 0, 0xffd23f); m.add(CG.sph, e.x, e.y + 2.25, e.z, .16, .16, .16, 0, 0, 0, 0xb07a10);
    }
  });
  // start: a little wooden bridge over the jelly to the first block
  (() => { const e = OB[0], m = M(e.x, 32);
    for(let z = 25.6; z <= 38.6; z += .6) m.add(G.box, e.x, .55, z, 2.2, .3, .5, 0, 0, 0, Math.round(z / .6) % 2 ? C.wood : 0xc28854);
    for(const sd of [-1, 1]){ for(let z = 26; z <= 38.6; z += 2.2) m.add(CG.cyl8, e.x + sd * 1.15, .3, z, .1, 1.2, .1, 0, 0, 0, C.woodD); m.add(G.box, e.x + sd * 1.15, .9, 32.1, .08, .08, 13, 0, 0, 0, C.woodD); }
    m.add(G.box, e.x, .2, 39.1, 2.2, .4, 1, 0, 0, 0, C.woodD);
    addB(e.x, 32.1, 1.1, 6.5, -1, .7); addB(e.x, 39.1, 1.1, .5, -1, .35);
    for(const sd of [-1, 1]) addB(e.x + sd * 1.2, 32.1, .08, 6.5, .7, 1.1);
  })();
  const st = ZSTN.obby; k.pad(st.x, st.z, 0, st.col); k.sign(st.name, st.col, st.x, 3.6, st.z);

  /* ---------- tropical decor: palms, tiki torches, rocks, ferns, a friendly dino ---------- */
  const avoid = (x, z) => Math.hypot(x - VX, z - VZ) < 44 || (Math.abs(x) < 8 && z > 38) || Math.hypot(x, z - 80) < 10;
  const palms = [];
  for(let i = 0; i < 220 && palms.length < 70; i++){ const a = rnd() * 6.283, r = 46 + rnd() * 34, x = Math.sin(a) * r, z = Math.cos(a) * r; if(avoid(x, z) || palms.some(p => Math.hypot(p[0] - x, p[2] - z) < 5)) continue; palms.push([x, 0, z, .9 + rnd() * .5, rnd() * 6]); addC(x, z, .4, 0, 5); }
  (() => { const m = new Merge();
    for(let q = 0; q < 7; q++) m.add(CG.cyl8, Math.sin(q * .25) * .5 * q / 7, .45 + q * .75, 0, .28 - q * .02, .8, .28 - q * .02, 0, 0, -.08, q % 2 ? 0x9a6a42 : 0xb88a58);
    for(let q = 0; q < 7; q++){ const a = q / 7 * 6.283; m.add(G.box, .5 + Math.sin(a) * 1.4, 5.5 - .3, Math.cos(a) * 1.4, .7, .08, 3.2, -.35, a, 0, q % 2 ? 0x3fae5a : 0x55c46a); }
    for(let q = 0; q < 3; q++) m.add(CG.sph, .5 + Math.sin(q * 2) * .3, 5.2, Math.cos(q * 2) * .3, .22, .22, .22, 0, 0, 0, 0x7a5030);
    k.inst(m.geometry(), palms); })();
  const torches = [];
  [[-6, 44], [11, 44], [-12, 60], [16, 60], [-30, 30], [32, 28]].forEach(([x, z]) => { const m = M(x, z); m.add(CG.cyl8, x, 1, z, .12, 2, .12, 0, 0, 0, C.woodD); m.add(CG.cyl8, x, 2.1, z, .25, .35, .25, 0, 0, 0, 0x5a3a20); k.glow.add(CG.cone, x, 2.55, z, .2, .55, .2, 0, 0, 0, 0xffb030); addC(x, z, .2, 0, 2.3); torches.push([x, z]); });
  torches.forEach(([x, z]) => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map:k.glowTex, color:0xffa040, transparent:true, opacity:.8, depthWrite:false, blending:THREE.AdditiveBlending })); s.position.set(x, 2.6, z); s.scale.set(2.2, 2.2, 1); group.add(s); });
  for(let i = 0; i < 40; i++){ const a = rnd() * 6.283, r = 42 + rnd() * 38, x = Math.sin(a) * r, z = Math.cos(a) * r; if(avoid(x, z)) continue; const m = M(x, z, true);
    if(i % 2) m.add(G.ico, x, .3, z, .8 + rnd(), .55 + rnd() * .5, .8 + rnd(), rnd(), rnd() * 3, 0, 0x8a6a7a);
    else for(let q = 0; q < 5; q++){ const b = q / 5 * 6.283; m.add(G.box, x + Math.sin(b) * .4, .4, z + Math.cos(b) * .4, .25, .05, 1.2, -.7, b, 0, 0x3fae5a); } }
  // a cute dino statue (friendly, smiling)
  (() => { const x = -40, z = 44, m = M(x, z), col = 0x5fe3b1;
    m.add(CG.sph, x, 1.6, z, 1.5, 1.2, 2.1, 0, 0, 0, col); m.add(CG.cyl, x, 3.2, z + 1.5, .55, 2.4, .55, .5, 0, 0, col); m.add(CG.sph, x, 4.4, z + 2.3, .85, .7, 1.05, 0, 0, 0, col);
    for(const sd of [-1, 1]){ m.add(CG.sph, x + sd * .45, 4.7, z + 2.95, .15, .15, .12, 0, 0, 0, 0xffffff); m.add(CG.sph, x + sd * .45, 4.72, z + 3.05, .08, .08, .06, 0, 0, 0, 0x222233); }
    for(const [ox, oz] of [[-.9, -.9], [.9, -.9], [-.9, 1], [.9, 1]]) m.add(CG.cyl, x + ox, .5, z + oz, .4, 1, .4, 0, 0, 0, col);
    m.add(CG.cone, x, 1.4, z - 2.8, .6, 2.4, .6, -Math.PI / 2 + .3, 0, 0, col);
    for(let q = 0; q < 5; q++) m.add(CG.cone, x, 2.85 + Math.sin(q * .7) * .1, z - 1.3 + q * .6, .25, .5, .12, 0, 0, 0, 0xffc83a);
    addC(x, z, 2, 0, 4); })();
  // steam puffs from the crater
  const puffs = []; for(let i = 0; i < 6; i++){ const s = new THREE.Sprite(new THREE.SpriteMaterial({ map:k.glowTex, color:0xffe8f0, transparent:true, opacity:.5, depthWrite:false })); s.userData.ph = i / 6; s.userData.a = i * 1.7; group.add(s); puffs.push(s); }

  const back = portal(THREE, K, group, Z.portal.x, 0, Z.portal.z, 0, '#ffcd4d', ZONES.castle.name, k.ox, k.oz); back.to = 'castle';
  k.finish();

  /* ---------- gameplay ---------- */
  const startSpot = () => ({ x:st.x, z:st.z - 1.5, f:Math.PI });
  let jellyCool = 0;
  function toSpot(i){ // checkpoint element index i, or the start
    if(i == null){ const s = startSpot(); api.tp(s.x + k.ox, 0, s.z + k.oz, s.f); return; }
    const e = OB[i]; api.tp(e.x + k.ox, e.y, e.z + k.oz, e.a + Math.PI / 2);
  }
  let R = null;            // the obby run
  const obbyMode = {
    start(run){ R = { cp:null, best:0, run }; toSpot(null); },
    step(){
      const P = api.P, lo = api.landedOn;
      if(!R) return;
      if(lo && lo.ob != null && P.ground){
        R.best = Math.max(R.best, lo.ob);
        const e = OB[lo.ob];
        if(e.t === 'k' && R.cp !== lo.ob && (R.cp == null || lo.ob > R.cp)){ R.cp = lo.ob; api.SFX.cp(); api.burst(P.x, P.y + 1, P.z, 16, ['#5fe3b1', '#ffffff'], 4); api.popText('🚩 ' + L('نقطة حفظ!', 'Checkpoint!', 'Kontrol noktası!')); }
        if(e.t === 'f'){ api.finishStation('obby', api.runTime()); return; }
      }
      if(P.ground && P.y < .5 && Math.hypot(P.x - k.ox - st.x, P.z - k.oz - st.z) > 60){ api.endRun(false); api.say(L('بعدت كتير، وقّفنا التحدي 🙂', 'You went too far, the challenge stopped 🙂', 'Çok uzaklaştın, meydan okuma durdu 🙂')); }
    },
    hud(t){ return '🌋 ' + N(Math.max(0, Math.round((R ? R.best : 0) / (OB.length - 1) * 100))) + '%  ⏱️ ' + api.fmtSec(t); },
    prog(){ return R ? Math.max(R.best, api.P.y / 30) : 0; },
    end(){ R = null; }
  };
  function preStep(dt, T){
    for(const m of moving){
      let x = m.bx, z = m.bz, y = m.by;
      if(m.kind === 'm'){ const o = Math.sin(T * 1.1 + m.ph) * 1.7; x += m.ux * o; z += m.uz * o; }
      else y += Math.sin(T * .9 + m.ph) * 1.1;
      const s = m.s; s.dx = x + k.ox - s.x; s.dz = z + k.oz - s.z; s.x = x + k.ox; s.z = z + k.oz; s.y0 = y - .7; s.y1 = y;
      m.mesh.position.set(x, y, z);
    }
  }
  function tick(dt, T){
    const P = api.P;
    // spinning bars knock you softly
    for(const sp of spinners){
      const e = sp.e, ang = T * 1.6 + sp.ph, cx = e.x + k.ox, cz = e.z + k.oz;
      if(P.mode !== 'walk' || Math.abs(P.x - cx) > e.R + 1 || Math.abs(P.z - cz) > e.R + 1) continue;
      if(P.y > e.y + .95 || P.y < e.y - .3) continue;
      const dx = Math.cos(ang), dz = -Math.sin(ang), px = P.x - cx, pz = P.z - cz, along = Math.max(-e.R - .2, Math.min(e.R + .2, px * dx + pz * dz)), qx = px - dx * along, qz = pz - dz * along;
      if(Math.hypot(qx, qz) < .62){ const sgn = Math.sign(along) || 1; P.vx = -dz * 7 * sgn; P.vz = dx * 7 * sgn; P.vy = 6.5; P.ground = false; P.airT = T + .5; api.SFX.boing(); api.burst(P.x, P.y + 1, P.z, 8, ['#ff5d73', '#ffffff'], 3); }
    }
    // the jelly: boing back to the flag
    if(P.mode === 'walk' && P.ground && P.y < .6 && T > jellyCool){
      const r = Math.hypot(P.x - k.ox - VX, P.z - k.oz - VZ);
      if(r > VOLC.base - 1.5 && r < VOLC.jelly + .2){
        jellyCool = T + .6; api.SFX.boing(); api.burst(P.x, .6, P.z, 22, ['#ff8a2c', '#ffb050', '#ffffff'], 5);
        api.popText('🍮 ' + L('بوينغ!', 'Boing!', 'Boing!'));
        const run = api.run; toSpot(run && run.id === 'obby' && R ? R.cp : null);
      }
    }
  }
  const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _v = new THREE.Vector3(), _s = new THREE.Vector3();
  function animate(T, dt, camPos){
    for(const sp of spinners) sp.bar.rotation.y = T * 1.6 + sp.ph;
    blobs.forEach((b, i) => { const k2 = .5 + .5 * Math.sin(T * 2 + b.ph); _m.compose(_v.set(b.x, .1, b.z), _q.identity(), _s.set(b.s * (1 + k2 * .3), b.s * (.35 + k2 * .3), b.s * (1 + k2 * .3))); blobM.setMatrixAt(i, _m); });
    blobM.instanceMatrix.needsUpdate = true;
    jelly.material.emissive.setRGB(.5 + Math.sin(T * 2) * .08, .16, 0);
    puffs.forEach(s => { const u = (T * .12 + s.userData.ph) % 1, a = s.userData.a + T * .2; s.position.set(VX + Math.sin(a) * 3 * u, VOLC.H + 1 + u * 12, VZ + Math.cos(a) * 3 * u); const sc = 3 + u * 9; s.scale.set(sc, sc, 1); s.material.opacity = .5 * (1 - u); });
    for(const m of k.culled){ const c = m.userData.c; m.visible = Math.hypot(camPos.x - c[0], camPos.z - c[1]) < 95; }
  }
  function camFix(x, y, z){
    const dx = x - VX, dz = z - VZ, r = Math.hypot(dx, dz), want = coneR(y) + 1.6;
    if(y < VOLC.H + 1 && r < want){ const k2 = want / (r || 1); return [VX + dx * k2, y, VZ + dz * k2]; }
    return null;
  }
  function miniBg(x, s){
    x.fillStyle = '#f3d9a0'; x.beginPath(); x.arc(0, 0, 88 * s, 0, 7); x.fill();
    x.fillStyle = '#6cc45a'; x.beginPath(); x.arc(0, 0, 79 * s, 0, 7); x.fill();
    x.fillStyle = '#ff8a2c'; x.beginPath(); x.arc(VX * s, VZ * s, VOLC.jelly * s, 0, 7); x.fill();
    x.fillStyle = '#8a5a6a'; x.beginPath(); x.arc(VX * s, VZ * s, VOLC.base * s, 0, 7); x.fill();
    x.fillStyle = '#ffb050'; x.beginPath(); x.arc(VX * s, VZ * s, VOLC.top * s, 0, 7); x.fill();
    OB.forEach(e => { x.fillStyle = e.t === 'k' ? '#5fe3b1' : e.t === 'f' ? '#ffc83a' : '#fff7e8'; x.beginPath(); x.arc(e.x * s, e.z * s, Math.max(1.6, e.R * s), 0, 7); x.fill(); });
  }
  const test = { OB:OB.map(e => ({ x:e.x + k.ox, z:e.z + k.oz, y:e.y, t:e.t })), get cp(){ return R ? R.cp : null; }, toCp:i => toSpot(i), start:startSpot };
  return { atmo:{ hemi:0xffe0c0, hemiG:0x7a5a6a, sun:0xffb070, sunI:2.6, fog:0xf6b08a }, group, solids:k.solids, movers:k.movers, ground, portals:[back], preStep, tick, animate, camFix, modes:{ obby:obbyMode }, miniBg, test };
}
