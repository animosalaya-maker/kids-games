/* «قراصنة الخليج» Pirate Bay: a crescent island around a round bay. A friendly pirate ship to sail, a treasure hunt
   with a map and X marks, and soft-ball cannon practice at floating targets. Local coords. */
import { BAY, ZSTN, zkit, portal, ZONES } from './zones.js';

const smooth = t => t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t);

export function build(api, Z){
  const { THREE, K, L, N } = api;
  const WY = api.WATER_Y, SHIP_Y = WY + .3, SS = 1.5, DECK = SHIP_Y + 1.575 * SS;
  function ground(x, z){
    const r = Math.hypot(x, z);
    let y = r < 76 ? 0 : r < 86 ? -1.8 * smooth((r - 76) / 10) : -1.8 - 2.2 * smooth((r - 86) / 18);
    const d = Math.hypot(x - BAY.cx, z - BAY.cz);
    if(d < BAY.r + 2) y = Math.min(y, -2.6 * smooth((BAY.r + 2 - d) / 5));
    return y;
  }
  const k = zkit(THREE, K, Z, ground), { M, CG, G, Merge, addC, addB, rnd, group } = k;
  const C = { sand:0xf6deb0, sand2:0xeccf98, grass:0x8ad06a, grass2:0x6cbc5a, wood:0xb87a48, woodD:0x8a5532, red:0xe8505b, white:0xfffaf0, gold:0xffc83a, blue:0x4f7fe8, teal:0x2fb7b0 };
  const P = api.P;

  /* ---------- ground ---------- */
  k.gridGround(112, 2, (x, z, r, y, c) => {
    const d = Math.hypot(x - BAY.cx, z - BAY.cz), nz = Math.sin(x * .21 + Math.cos(z * .17) * 2) * .5 + Math.sin(z * .13 - x * .07) * .5;
    const shore = Math.min(r > 70 ? (r - 70) : 99, d < BAY.r + 9 ? (BAY.r + 9 - d) : 99);
    c.set(C.grass).lerp(new THREE.Color(C.grass2), .5 + nz * .5);
    if(shore < 99) c.lerp(new THREE.Color(C.sand), smooth(shore / 4));
    if(y < -.4) c.set(0xd8c290).lerp(new THREE.Color(0x6aa8a8), smooth(-y / 2.4));
  });

  /* ---------- the pier and the moored ship ---------- */
  const PR = BAY.pier;
  (() => { const m = M(0, 20);
    for(let z = PR.z0; z <= PR.z1; z += .6) m.add(G.box, 0, PR.y - .1, z, 3, .2, .5, 0, 0, 0, Math.round(z / .6) % 2 ? C.wood : 0xc28854);
    for(const sd of [-1, 1]) for(let z = PR.z0 + 1; z <= PR.z1; z += 2.5){ m.add(CG.cyl8, sd * 1.45, PR.y - 1.5, z, .16, 3.2, .16, 0, 0, 0, C.woodD); m.add(CG.cyl8, sd * 1.45, PR.y + .45, z, .12, .9, .12, 0, 0, 0, C.woodD); }
    for(const sd of [-1, 1]) m.add(G.box, sd * 1.45, PR.y + .8, (PR.z0 + PR.z1) / 2 + .5, .08, .08, PR.z1 - PR.z0 - 1, 0, 0, 0, 0xd8c8a0);
    addB(0, (PR.z0 + PR.z1) / 2, 1.5, (PR.z1 - PR.z0) / 2, -3, PR.y);
    for(const sd of [-1, 1]) addB(sd * 1.55, (PR.z0 + PR.z1) / 2 + .5, .1, (PR.z1 - PR.z0) / 2 - .5, PR.y, PR.y + 1); })();
  const shipMesh = (() => {
    const g = new THREE.Group(); const hull = new THREE.Mesh(api.vehGeo('ship', 0xe8505b), new THREE.MeshLambertMaterial({ vertexColors:true })); hull.castShadow = true; g.add(hull);
    // a friendly sail emblem: a smiling sun + a parrot feather, painted on the main sail
    const tex = k.canvasTex(256, 200, (c, w, h) => { c.fillStyle = '#fff7e8'; c.fillRect(0, 0, w, h); c.fillStyle = '#ffc83a'; c.beginPath(); c.arc(w / 2, h / 2, 54, 0, 7); c.fill();
      c.strokeStyle = '#ffc83a'; c.lineWidth = 10; for(let i = 0; i < 12; i++){ const a = i / 12 * 6.283; c.beginPath(); c.moveTo(w / 2 + Math.cos(a) * 64, h / 2 + Math.sin(a) * 64); c.lineTo(w / 2 + Math.cos(a) * 84, h / 2 + Math.sin(a) * 84); c.stroke(); }
      c.fillStyle = '#2a1f4a'; c.beginPath(); c.arc(w / 2 - 18, h / 2 - 10, 7, 0, 7); c.arc(w / 2 + 18, h / 2 - 10, 7, 0, 7); c.fill(); c.lineWidth = 7; c.strokeStyle = '#2a1f4a'; c.beginPath(); c.arc(w / 2, h / 2 + 4, 24, .3, Math.PI - .3); c.stroke();
      c.fillStyle = '#ff8fb8'; c.beginPath(); c.arc(w / 2 - 34, h / 2 + 10, 9, 0, 7); c.arc(w / 2 + 34, h / 2 + 10, 9, 0, 7); c.fill(); });
    const sail = new THREE.Mesh(new THREE.PlaneGeometry(4.5, 3.5, 6, 4), new THREE.MeshLambertMaterial({ map:tex, side:THREE.DoubleSide })); sail.position.set(0, 5.2, -.12); g.add(sail);
    const p = sail.geometry.attributes.position; for(let i = 0; i < p.count; i++){ const x = p.getX(i); p.setZ(i, -(1 - (x / 2.25) ** 2) * .45); } sail.geometry.computeVertexNormals();
    const fl = new THREE.Mesh(new THREE.PlaneGeometry(1.2, .7), new THREE.MeshLambertMaterial({ color:0x5fe3b1, side:THREE.DoubleSide })); fl.position.set(0, 8.9, -.6); fl.rotation.y = Math.PI / 2; g.add(fl);
    const wheel = new THREE.Mesh(new THREE.TorusGeometry(.45, .07, 6, 16), new THREE.MeshLambertMaterial({ color:0x7a4a2a })); wheel.position.set(0, 2.5, -2.7); g.add(wheel);
    g.scale.setScalar(SS); g.position.set(BAY.ship.x, SHIP_Y, BAY.ship.z); group.add(g); return g; })();
  const ship = { x:BAY.ship.x, z:BAY.ship.z, h:0, v:0, sail:false };

  /* ---------- the cannon on the north shore ---------- */
  const CN = BAY.cannon;
  const cannon = (() => { const g = new THREE.Group(), m = new Merge();
    m.add(G.box, 0, .45, 0, 1.8, .6, 2.4, 0, 0, 0, C.wood); for(const sd of [-1, 1]) for(const z of [-.8, .8]) m.add(CG.cyl, sd * 1, .45, z, .45, .2, .45, 0, 0, Math.PI / 2, C.gold);
    const base = new THREE.Mesh(m.geometry(), new THREE.MeshLambertMaterial({ vertexColors:true })); base.castShadow = true; g.add(base);
    const bm = new Merge(); bm.add(CG.cyl, 0, 0, .6, .5, 2.6, .5, Math.PI / 2, 0, 0, 0x4f7fe8); for(const z of [-.4, .6, 1.6]) bm.add(CG.cyl, 0, 0, z, .58, .2, .58, Math.PI / 2, 0, 0, C.gold); bm.add(CG.sph, 0, 0, -.75, .55, .55, .55, 0, 0, 0, 0x4f7fe8);
    const barrel = new THREE.Group(); barrel.position.y = 1.15; const bmesh = new THREE.Mesh(bm.geometry(), new THREE.MeshLambertMaterial({ vertexColors:true })); bmesh.castShadow = true; barrel.add(bmesh); g.add(barrel); g.userData.barrel = barrel;
    g.position.set(CN.x, 0, CN.z); group.add(g); addC(CN.x, CN.z, 1.3, 0, 1.6); return g; })();
  const ring = new THREE.Mesh(new THREE.TorusGeometry(2.2, .2, 8, 32).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({ color:0xff5d73 })); ring.visible = false; group.add(ring);
  const ringIn = new THREE.Mesh(new THREE.TorusGeometry(1.1, .16, 8, 24).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({ color:0xffffff })); ring.add(ringIn);
  const targetGeo = (() => { const m = new Merge(); m.add(CG.cyl, 0, 0, 0, 1, 1.2, 1, 0, 0, 0, 0xa86a3c); for(const y of [-.35, .35]) m.add(CG.cyl, 0, y, 0, 1.04, .12, 1.04, 0, 0, 0, 0x6a4a2a);
    [[1.25, 0xffffff], [1, 0xe8505b], [.72, 0xffffff], [.45, 0xe8505b], [.2, 0xffc83a]].forEach(([r, c], i) => m.add(CG.cyl, 0, .62 + i * .02, 0, r, .05, r, 0, 0, 0, c)); return m.geometry(); })();
  const TG = []; const tgMesh = new THREE.InstancedMesh(targetGeo, new THREE.MeshLambertMaterial({ vertexColors:true }), 7); tgMesh.visible = false; group.add(tgMesh);
  const balls = []; for(let i = 0; i < 4; i++){ const b = new THREE.Mesh(new THREE.SphereGeometry(.45, 14, 10), new THREE.MeshPhongMaterial({ color:[0xff6f8e, 0x7fc8ff, 0xffe27a, 0x5fe3b1][i], shininess:60 })); b.visible = false; group.add(b); balls.push({ m:b, on:false }); }

  /* ---------- decor: palms, a lookout tower, tents, barrels, a lighthouse, a parrot ---------- */
  const busy = (x, z) => Math.hypot(x - BAY.cx, z - BAY.cz) < BAY.r + 6 || Math.hypot(x, z) > 74 || (Math.abs(x) < 5 && z > -76 && z < 14) || Math.hypot(x - CN.x, z - CN.z) < 6 || Math.hypot(x - 14, z - 7) < 6 || Math.hypot(x - 10, z + 28) < 8 || BAY.X.some(([a, b]) => Math.hypot(x - a, z - b) < 4) || Math.hypot(x - 62, z + 34) < 7 || (x > -32 && x < 4 && z > -16 && z < 14);
  const palms = [];
  for(let i = 0; i < 400 && palms.length < 70; i++){ const a = rnd() * 6.283, r = 10 + rnd() * 66, x = Math.sin(a) * r, z = Math.cos(a) * r; if(busy(x, z) || palms.some(p => Math.hypot(p[0] - x, p[2] - z) < 5)) continue; palms.push([x, 0, z, .9 + rnd() * .5, rnd() * 6]); addC(x, z, .4, 0, 5); }
  (() => { const m = new Merge();
    for(let q = 0; q < 7; q++) m.add(CG.cyl8, Math.sin(q * .25) * .5 * q / 7, .45 + q * .75, 0, .28 - q * .02, .8, .28 - q * .02, 0, 0, -.08, q % 2 ? 0x9a6a42 : 0xb88a58);
    for(let q = 0; q < 7; q++){ const a = q / 7 * 6.283; m.add(G.box, .5 + Math.sin(a) * 1.4, 5.2, Math.cos(a) * 1.4, .7, .08, 3.2, -.35, a, 0, q % 2 ? 0x3fae5a : 0x55c46a); }
    for(let q = 0; q < 3; q++) m.add(CG.sph, .5 + Math.sin(q * 2) * .3, 5, Math.cos(q * 2) * .3, .22, .22, .22, 0, 0, 0, 0x7a5030);
    k.inst(m.geometry(), palms); })();
  // lookout tower with stairs (a toy waits on top)
  (() => { const x = 10, z = -28, top = 4.1, m = M(x, z);
    for(const [ox, oz] of [[-1.7, -1.7], [1.7, -1.7], [-1.7, 1.7], [1.7, 1.7]]) m.add(CG.cyl8, x + ox, top / 2 + 1, z + oz, .2, top + 2, .2, 0, 0, 0, C.woodD);
    m.add(G.box, x, top - .15, z, 4, .3, 4, 0, 0, 0, C.wood);
    for(const [ox, oz, w, d] of [[0, -1.9, 4, .12], [0, 1.9, 4, .12], [1.9, 0, .12, 4]]) m.add(G.box, x + ox, top + .5, z + oz, w, .1, d, 0, 0, 0, C.woodD);
    m.add(G.box, x, top + 2.1, z, 4.6, .2, 4.6, 0, 0, 0, C.red); m.add(CG.cyl8, x, top + 3.4, z, .07, 2.6, .07, 0, 0, 0, C.woodD); m.add(CG.cone4, x + .5, top + 4.2, z, .55, 1, .06, 0, 0, Math.PI / 2, 0x5fe3b1);
    addB(x, z, 2, 2, top - .3, top);
    for(let i = 0; i < 10; i++){ const sx = x - 2.3 - i * .6, sy = (i + 1) * top / 10; m.add(G.box, sx + .1, sy - .12, z + .2, .6, .24, 1.4, 0, 0, 0, i % 2 ? C.wood : 0xc28854); addB(sx + .1, z + .2, .3, .7, sy - .3, sy); }
    void top; })();
  // tents with stripes, barrels, crates, treasure piles, rowboats, umbrellas, shells
  [[-28, -12, C.red], [-40, -2, C.blue], [32, -26, 0x9b6bff], [38, -10, C.teal]].forEach(([x, z, col], i) => { const m = M(x, z);
    for(let q = 0; q < 8; q++){ const a = q / 8 * 6.283; m.add(CG.cone4, x + Math.sin(a) * .01, 1.6, z, 2.6, 3.2, 2.6, 0, a + .39, 0, q % 2 ? col : C.white); }
    m.add(G.box, x, .8, z + 1.9, .9, 1.6, .05, 0, 0, 0, 0x5a3a2a); addC(x, z, 2.3, 0, 3); });
  for(let i = 0; i < 18; i++){ const a = rnd() * 6.283, r = 14 + rnd() * 56, x = Math.sin(a) * r, z = Math.cos(a) * r; if(busy(x, z)) continue; const m = M(x, z, true);
    if(i % 3 === 0){ m.add(CG.cyl, x, .55, z, .5, 1.1, .5, 0, 0, 0, 0xa86a3c); for(const y of [.25, .85]) m.add(CG.cyl, x, y, z, .53, .08, .53, 0, 0, 0, 0x6a4a2a); addC(x, z, .55, 0, 1.1); }
    else if(i % 3 === 1){ m.add(G.box, x, .45, z, .9, .9, .9, 0, a, 0, 0xc89058); m.add(G.box, x, .45, z, .95, .12, .95, 0, a, 0, 0x8a5532); addC(x, z, .6, 0, .9); }
    else { m.add(CG.hemi, x, 0, z, 1, .6, 1, 0, 0, 0, C.gold); for(let q = 0; q < 5; q++) m.add(CG.cyl, x + Math.sin(q) * .8, .1, z + Math.cos(q) * .8, .2, .05, .2, 0, 0, 0, C.gold); } }
  [[-50, -30, C.blue], [44, 14, C.red], [-24, 30, 0x5fe3b1]].forEach(([x, z, col]) => { const m = M(x, z); m.add(CG.sph, x, .2, z, 1, .45, 2, 0, .4, 0, col); m.add(G.box, x, .35, z, 1.5, .1, .4, 0, .4, 0, C.wood); });
  [[-46, -46, 0xff8fb8], [20, -60, 0x7fc8ff], [56, 4, 0xffe27a]].forEach(([x, z, col]) => { const m = M(x, z); m.add(CG.cyl8, x, 1.3, z, .06, 2.6, .06, 0, 0, 0, C.white);
    for(let q = 0; q < 8; q++) m.add(CG.cone4, x, 2.5, z, 1.8, .7, 1.8, 0, q / 8 * 6.283, 0, q % 2 ? col : C.white); m.add(G.box, x + 1.3, .12, z + .3, 1, .1, 1.8, 0, 0, 0, col); });
  // lighthouse on the south-east tip
  (() => { const x = 62, z = -34, m = M(x, z);
    for(let i = 0; i < 6; i++) m.add(new THREE.CylinderGeometry(1.9 - i * .15, 2 - i * .15, 2, 18), x, 1 + i * 2, z, 1, 1, 1, 0, 0, 0, i % 2 ? C.red : C.white);
    m.add(CG.cyl, x, 12.3, z, 1.6, .3, 1.6, 0, 0, 0, 0x3a3048); k.glow.add(CG.cyl, x, 13.2, z, 1, 1.5, 1, 0, 0, 0, 0xffe7a0); m.add(CG.cone, x, 14.6, z, 1.5, 1.4, 1.5, 0, 0, 0, C.red);
    addC(x, z, 2, 0, 14); })();
  const lhGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map:k.glowTex, color:0xffe08a, transparent:true, opacity:.8, depthWrite:false, blending:THREE.AdditiveBlending })); lhGlow.position.set(62, 13.2, -34); lhGlow.scale.set(7, 7, 1); group.add(lhGlow);
  // a friendly parrot on a perch by the map board
  const parrot = (() => { const x = 20, z = 9.5, m = M(x, z); m.add(CG.cyl8, x, 1.2, z, .08, 2.4, .08, 0, 0, 0, C.woodD); m.add(CG.cyl8, x, 2.4, z, .06, 1.2, .06, 0, 0, Math.PI / 2, C.woodD);
    m.add(G.box, x - 3, 1.5, z - .2, 2.4, 1.6, .12, 0, 0, 0, 0xf0dca8); m.add(G.box, x - 3, 1.5, z - .26, 2.6, 1.8, .06, 0, 0, 0, C.woodD); for(const sd of [-1, 1]) m.add(CG.cyl8, x - 3 + sd * 1.2, .8, z - .3, .07, 1.6, .07, 0, 0, 0, C.woodD);
    addB(x - 3, z - .2, 1.3, .2, 0, 2.4);
    const g = new THREE.Group(), pm = new Merge(); pm.add(CG.sph, 0, .3, 0, .22, .3, .22, 0, 0, 0, 0xe8505b); pm.add(CG.sph, 0, .66, .02, .18, .18, .18, 0, 0, 0, 0xe8505b); pm.add(CG.cone, 0, .62, .2, .06, .14, .06, Math.PI / 2, 0, 0, 0xffd23f);
    for(const sd of [-1, 1]){ pm.add(CG.sph, sd * .2, .32, -.02, .08, .24, .16, 0, 0, sd * .2, 0x4f7fe8); pm.add(CG.sph, sd * .08, .72, .14, .04, .04, .03, 0, 0, 0, 0x222233); }
    pm.add(G.box, 0, .05, -.2, .1, .35, .06, -.6, 0, 0, 0xffd23f);
    const mesh = new THREE.Mesh(pm.geometry(), new THREE.MeshLambertMaterial({ vertexColors:true })); g.add(mesh); g.position.set(x, 2.45, z); group.add(g); return g; })();
  // X marks (shown during the hunt) and chests that pop up
  const xMarks = BAY.X.map(([x, z]) => { const g = new THREE.Group(); const mat = new THREE.MeshBasicMaterial({ color:0xe8303b });
    for(const a of [.785, -.785]){ const b = new THREE.Mesh(new THREE.BoxGeometry(2.6, .06, .45), mat); b.rotation.y = a; g.add(b); }
    g.position.set(x, .05, z); g.visible = false; group.add(g); return g; });
  const chestGeo = (() => { const m = new Merge(); m.add(G.box, 0, .4, 0, 1.4, .8, .9, 0, 0, 0, 0x9a5a2a); m.add(CG.cyl, 0, .8, 0, .45, 1.4, .45, 0, 0, Math.PI / 2, 0x9a5a2a); m.add(G.box, 0, .5, .46, 1.44, .16, .04, 0, 0, 0, C.gold); m.add(G.box, 0, .62, .48, .22, .28, .05, 0, 0, 0, C.gold); m.add(CG.sph, 0, 1.05, 0, .4, .2, .3, 0, 0, 0, C.gold); return m.geometry(); })();
  const chests = BAY.X.map(([x, z]) => { const c = new THREE.Mesh(chestGeo, new THREE.MeshLambertMaterial({ vertexColors:true })); c.position.set(x, -1.2, z); c.visible = false; group.add(c); return c; });

  const sH = ZSTN.hunt, sC = ZSTN.cannon;
  k.pad(sH.x, sH.z, 0, sH.col); k.sign(sH.name, sH.col, sH.x, 3.8, sH.z);
  k.pad(sC.x, sC.z, 0, sC.col); k.sign(sC.name, sC.col, sC.x, 3.8, sC.z - 1);
  const PADS = { ship:{ x:0, z:PR.z1 - .8, y:PR.y } };
  k.pad(PADS.ship.x, PADS.ship.z, PR.y, '#ffc83a'); k.sign(L('السفينة', 'The ship', 'Gemi'), '#ffc83a', 0, PR.y + 3.4, PR.z1 - 1.6, 3);
  const back = portal(THREE, K, group, Z.portal.x, 0, Z.portal.z, Math.PI, '#ffcd4d', ZONES.castle.name, k.ox, k.oz); back.to = 'castle';
  k.finish();

  /* ---------- sailing ---------- */
  const inWater = (x, z) => ground(x, z) < -1.5 && Math.hypot(x, z) < 150;
  function sail(){
    ship.sail = true; ship.x = BAY.ship.x; ship.z = BAY.ship.z; ship.h = 0; ship.v = 0;
    api.startVeh({ md:4, pose:'stand',
      step(dt){
        const T = api.T, inp = api.inp;
        if(inp.m > .05) ship.h += api.angDiff(Math.atan2(inp.x, inp.z), ship.h) * Math.min(1, 1.3 * dt);
        ship.v += (9.5 * inp.m - ship.v) * Math.min(1, (inp.m > ship.v / 9.5 ? .9 : 1.6) * dt);
        const nx = ship.x + Math.sin(ship.h) * ship.v * dt, nz = ship.z + Math.cos(ship.h) * ship.v * dt;
        const fx = nx + Math.sin(ship.h) * 7, fz = nz + Math.cos(ship.h) * 7;
        if(inWater(fx, fz) && inWater(nx, nz)){ ship.x = nx; ship.z = nz; } else if(ship.v > 2){ ship.v = 0; api.SFX.bonk(); } else ship.v = 0;
        P.x = ship.x - Math.sin(ship.h) * 3.6 + k.ox; P.z = ship.z - Math.cos(ship.h) * 3.6 + k.oz; P.y = DECK + Math.sin(T * 1.6) * .08; P.face = ship.h; P.move = 0;
        if(ship.v > 2 && Math.random() < dt * 25) api.burst(ship.x - Math.sin(ship.h) * 5 + k.ox, WY + .2, ship.z - Math.cos(ship.h) * 5 + k.oz, 1, ['#ffffff', '#d8f0ff'], 1.6, 1, 6, .4);
      },
      cam:() => ({ yaw:Math.atan2(-Math.sin(ship.h), -Math.cos(ship.h)), dist:16, pitch:.33, k:2 }),
      ctx:() => ({ k:'z', key:'land', icon:'⚓', label:L('انزل', 'Land', 'İn'), col:'#ffc83a', go:() => api.endVeh() }),
      end:() => { ship.sail = false; ship.x = BAY.ship.x; ship.z = BAY.ship.z; ship.h = 0; ship.v = 0; api.tp(k.ox, PR.y, PR.z1 - 2 + k.oz, Math.PI); }
    });
    api.say(L('حرّك الجويستيك لتبحر! ⛵', 'Move the joystick to sail! ⛵', 'Yelken açmak için joystick\'i oynat! ⛵'), 3000);
  }

  /* ---------- cannon practice ---------- */
  let CA = null;
  const bayPt = () => { const a = Math.random() * 6.283, r = Math.sqrt(Math.random()) * 26; return { x:BAY.cx + Math.sin(a) * r, z:BAY.cz - 6 + Math.cos(a) * r * .9 }; };
  const cannonMode = {
    start(run){
      CA = { hits:0, ax:CN.x + 4, az:BAY.cz - 10, cool:0, run };
      TG.length = 0; for(let i = 0; i < 6; i++){ const p = bayPt(); TG.push({ x:p.x, z:p.z, ph:Math.random() * 6, dead:0, pop:0 }); }
      tgMesh.visible = true; ring.visible = true;
      api.tp(CN.x + k.ox, 0, CN.z - 2.2 + k.oz, 0);
      api.startVeh({ md:8, pose:'stand', space:true,
        step(dt){
          const inp = api.inp, frozen = api.run && api.T < api.run.cdEnd;
          if(!frozen){ CA.ax += inp.x * 15 * dt; CA.az += inp.z * 15 * dt; }
          const dx = CA.ax - BAY.cx, dz = CA.az - BAY.cz, d = Math.hypot(dx, dz); if(d > 31){ CA.ax = BAY.cx + dx / d * 31; CA.az = BAY.cz + dz / d * 31; }
          const ang = Math.atan2(CA.ax - CN.x, CA.az - CN.z); cannon.userData.barrel.rotation.set(-.35, ang, 0);
          P.x = CN.x - Math.sin(ang) * 2.2 + k.ox; P.z = CN.z - Math.cos(ang) * 2.2 + k.oz; P.y = 0; P.face = ang; P.move = 0;
        },
        cam:() => ({ yaw:Math.PI, dist:17, pitch:.62, k:3, tx:(CN.x + CA.ax) / 2 + k.ox, ty:0, tz:(CN.z + CA.az) / 2 - 4 + k.oz }),
        ctx:() => ({ k:'z', key:'fire', icon:'💥', label:L('إطلاق', 'Fire!', 'Ateş!'), col:'#ff6f8e', big:true, go:fire }),
        end:() => {}
      });
      api.cam.yaw = Math.PI; api.snapCam = true;
    },
    step(dt){
      if(!CA) return;
      if(CA.hits >= 10){ api.finishStation('cannon', api.runTime()); return; }
      if(api.runTime() >= 60){ api.failStation('cannon', CA.hits); }
    },
    hud(t){ return '🎯 ' + N(CA ? CA.hits : 0) + '/' + N(10) + '  ⏳ ' + api.fmtSec(60 - t); },
    prog(){ return CA ? CA.hits : 0; },
    end(){ if(P.mode === 'veh') api.endVeh(); tgMesh.visible = false; ring.visible = false; balls.forEach(b => { b.on = false; b.m.visible = false; }); CA = null; cannon.userData.barrel.rotation.set(-.35, 0, 0); api.tp(sC.x + k.ox, 0, sC.z - 1.5 + k.oz, 0); }
  };
  function fire(){
    if(!CA || api.T < CA.cool || (api.run && api.T < api.run.cdEnd)) return;
    const b = balls.find(q => !q.on); if(!b) return;
    CA.cool = api.T + .45; b.on = true; b.t = 0; b.dur = .85; b.x0 = CN.x; b.z0 = CN.z; b.x1 = CA.ax; b.z1 = CA.az; b.m.visible = true;
    api.tone(160, .18, 'sine', .14, 0, 90); api.tone(900, .08, 'triangle', .06, .02, 1300);
    api.burst(CN.x + Math.sin(Math.atan2(CA.ax - CN.x, CA.az - CN.z)) * 1.9 + k.ox, 1.5, CN.z + Math.cos(Math.atan2(CA.ax - CN.x, CA.az - CN.z)) * 1.9 + k.oz, 10, ['#ffffff', '#ffe27a'], 3);
  }
  function landBall(b){
    let hit = false;
    for(const t of TG){ if(t.dead > api.T) continue; if(Math.hypot(t.x - b.x1, t.z - b.z1) < 2.7){ hit = true; t.dead = api.T + 1.3; CA.hits++;
      api.SFX.pop(); api.burst(t.x + k.ox, WY + 1.4, t.z + k.oz, 28, ['#ff6f8e', '#ffe27a', '#7fc8ff', '#5fe3b1', '#ffffff'], 6); api.popText('🎯 ' + N(CA.hits) + '/' + N(10)); break; } }
    if(!hit){ api.SFX.splash(); api.burst(b.x1 + k.ox, WY + .3, b.z1 + k.oz, 14, ['#ffffff', '#bfe8ff'], 4); }
  }

  /* ---------- treasure hunt ---------- */
  let HU = null;
  function mapImg(){
    const c = document.createElement('canvas'); c.width = c.height = 420; const x = c.getContext('2d'), s = 420 / 190, o = 210;
    x.fillStyle = '#f3e2b8'; x.fillRect(0, 0, 420, 420);
    for(let gz = -95; gz < 95; gz += 2) for(let gx = -95; gx < 95; gx += 2){ const y = ground(gx, gz); x.fillStyle = y < -.9 ? '#8cc4c8' : y < -.2 ? '#d8c290' : Math.hypot(gx, gz) > 70 || Math.hypot(gx - BAY.cx, gz - BAY.cz) < BAY.r + 8 ? '#e8cf90' : '#a8cc78'; x.fillRect(o + gx * s, o + gz * s, s * 2 + .5, s * 2 + .5); }
    x.strokeStyle = 'rgba(120,80,40,.5)'; x.lineWidth = 6; x.strokeRect(6, 6, 408, 408);
    x.fillStyle = '#7a4a2a'; x.fillRect(o - 3, o + PR.z0 * s, 6, (PR.z1 - PR.z0) * s);
    x.fillStyle = '#c84a3a'; x.beginPath(); x.arc(o + 62 * s, o - 34 * s, 5, 0, 7); x.fill();
    if(HU) HU.spots.forEach(i => { const [px, pz] = BAY.X[i], done = HU.found.has(i); x.strokeStyle = done ? 'rgba(80,150,80,.9)' : '#d8202b'; x.lineWidth = 8; x.lineCap = 'round';
      const X = o + px * s, Y = o + pz * s; x.beginPath(); x.moveTo(X - 11, Y - 11); x.lineTo(X + 11, Y + 11); x.moveTo(X + 11, Y - 11); x.lineTo(X - 11, Y + 11); x.stroke(); });
    const mx = o + (P.x - k.ox) * s, mz = o + (P.z - k.oz) * s; x.fillStyle = '#4f7fe8'; x.strokeStyle = '#fff'; x.lineWidth = 3; x.beginPath(); x.arc(mx, mz, 8, 0, 7); x.fill(); x.stroke();
    // compass
    x.fillStyle = '#7a4a2a'; x.font = '800 26px sans-serif'; x.textAlign = 'center'; x.fillText('N', 380, 46); x.beginPath(); x.moveTo(380, 52); x.lineTo(372, 76); x.lineTo(388, 76); x.fill();
    return c.toDataURL();
  }
  function showMap(first){
    api.showCard(`<h2>🗺️ ${L('خريطة الكنز', 'Treasure map', 'Hazine haritası')}</h2><img class="pmap" src="${mapImg()}" alt=""><p>${L('روح لعلامات X الحمرا واحفر ⛏️', 'Go to the red X marks and dig ⛏️', 'Kırmızı X işaretlerine git ve kaz ⛏️')}</p>`,
      first ? () => { if(api.run && api.run.id === 'hunt'){ api.run.t0 = api.T; api.run.cdEnd = api.T; } } : null);
  }
  const huntMode = {
    start(run){
      const ids = [...BAY.X.keys()].sort(() => Math.random() - .5).slice(0, 3);
      HU = { spots:ids, found:new Set(), run };
      xMarks.forEach((m, i) => m.visible = ids.includes(i)); chests.forEach(c => { c.visible = false; c.position.y = -1.2; });
      showMap(true);
    },
    step(){ if(HU && HU.found.size >= 3){ api.finishStation('hunt', api.runTime()); } },
    ctx(){
      if(!HU) return null;
      for(const i of HU.spots){ if(HU.found.has(i)) continue; const [x, z] = BAY.X[i]; if(Math.hypot(P.x - k.ox - x, P.z - k.oz - z) < 2.2) return { k:'z', key:'dig' + i, icon:'⛏️', label:L('احفر', 'Dig', 'Kaz'), col:'#ffc83a', go:() => dig(i) }; }
      return { k:'z', key:'map', icon:'🗺️', label:L('الخريطة', 'Map', 'Harita'), col:'#e8cf90', go:() => showMap(false) };
    },
    hud(t){ return '🗺️ ' + N(HU ? HU.found.size : 0) + '/' + N(3) + '  ⏱️ ' + api.fmtSec(t); },
    prog(){ return HU ? HU.found.size : 0; },
    end(){ xMarks.forEach(m => m.visible = false); setTimeout(() => { if(!HU) chests.forEach(c => c.visible = false); }, 5000); HU = null; }
  };
  function dig(i){
    if(!HU || HU.found.has(i)) return;
    HU.found.add(i); xMarks[i].visible = false; const c = chests[i]; c.visible = true; c.userData.t = api.T;
    const [x, z] = BAY.X[i]; api.burst(x + k.ox, .5, z + k.oz, 26, ['#f6deb0', '#ffd23f', '#ffffff'], 5); api.SFX.toy(); api.popText('💰 ' + N(HU.found.size) + '/' + N(3));
  }

  /* ---------- per frame ---------- */
  const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _v = new THREE.Vector3(), _s = new THREE.Vector3();
  function animate(T, dt, camPos){
    shipMesh.position.set(ship.x, SHIP_Y + Math.sin(T * 1.6) * .08, ship.z); shipMesh.rotation.set(Math.sin(T * 1.1) * .03, ship.h, Math.sin(T * 1.3) * .04 - (ship.sail ? api.angDiff(Math.atan2(api.inp.x, api.inp.z), ship.h) * .05 * api.inp.m : 0));
    parrot.rotation.y = Math.sin(T * .8) * .6; parrot.position.y = 2.45 + Math.abs(Math.sin(T * 3)) * .05;
    lhGlow.material.opacity = .6 + Math.sin(T * 2) * .25;
    if(CA){
      TG.forEach((t, i) => {
        const s = t.dead > T ? Math.max(0, (t.dead - T - 1) * 3) : 1; _m.compose(_v.set(t.x, WY + .5 + Math.sin(T * 1.8 + t.ph) * .12, t.z), _q.setFromEuler(_e.set(Math.sin(T + i) * .06, 0, Math.cos(T * 1.2 + i) * .06)), _s.set(s, s, s)); tgMesh.setMatrixAt(i, _m); });
      tgMesh.count = TG.length; tgMesh.instanceMatrix.needsUpdate = true;
      ring.position.set(CA.ax, WY + .1, CA.az); ring.rotation.y = T; const pulse = 1 + Math.sin(T * 6) * .06; ring.scale.set(pulse, 1, pulse);
    }
    chests.forEach(c => { if(!c.visible || c.userData.t == null) return; const u = Math.min(1, (T - c.userData.t) / .6); c.position.y = -1.2 + u * 1.25; c.rotation.y = (1 - u) * 6; });
    for(const m of k.culled){ const c = m.userData.c; m.visible = Math.hypot(camPos.x - c[0], camPos.z - c[1]) < 95; }
  }
  function tick(dt, T){
    if(!CA) return;
    TG.forEach(t => { if(t.dead && t.dead <= T){ const p = bayPt(); t.x = p.x; t.z = p.z; t.dead = 0; } t.x += Math.sin(T * .3 + t.ph) * dt * .8; t.z += Math.cos(T * .25 + t.ph) * dt * .8; });
    balls.forEach(b => { if(!b.on) return; b.t += dt / b.dur; const t = Math.min(1, b.t); b.m.position.set(b.x0 + (b.x1 - b.x0) * t, 1.8 + (WY - 1.8) * t + Math.sin(t * Math.PI) * 9, b.z0 + (b.z1 - b.z0) * t);
      if(b.t >= 1){ b.on = false; b.m.visible = false; landBall(b); } });
  }
  function ctx(){
    if(Math.hypot(P.x - k.ox - PADS.ship.x, P.z - k.oz - PADS.ship.z) < 1.8 && Math.abs(P.y - PR.y) < 1) return { k:'z', key:'sail', icon:'⛵', label:L('ابحر', 'Sail', 'Yelken'), col:'#ffc83a', go:sail };
    return null;
  }
  function miniBg(x, s){
    for(let gz = -95; gz < 95; gz += 3) for(let gx = -95; gx < 95; gx += 3){ const y = ground(gx, gz); if(y < -.9) continue; x.fillStyle = y < -.2 ? '#d8c290' : Math.hypot(gx, gz) > 72 || Math.hypot(gx - BAY.cx, gz - BAY.cz) < BAY.r + 6 ? '#f6deb0' : '#8ad06a'; x.fillRect(gx * s, gz * s, 3 * s + .6, 3 * s + .6); }
    x.fillStyle = '#7a4a2a'; x.fillRect(-1.5 * s, PR.z0 * s, 3 * s, (PR.z1 - PR.z0) * s);
  }
  function miniDots(x, s){
    if(HU) HU.spots.forEach(i => { if(HU.found.has(i)) return; const [px, pz] = BAY.X[i]; x.strokeStyle = '#d8202b'; x.lineWidth = 3; x.beginPath(); x.moveTo(px * s - 5, pz * s - 5); x.lineTo(px * s + 5, pz * s + 5); x.moveTo(px * s + 5, pz * s - 5); x.lineTo(px * s - 5, pz * s + 5); x.stroke(); });
    x.fillStyle = '#e8505b'; x.beginPath(); x.arc(ship.x * s, ship.z * s, 4, 0, 7); x.fill();
    if(CA){ x.strokeStyle = '#ff5d73'; x.lineWidth = 2; x.beginPath(); x.arc(CA.ax * s, CA.az * s, 4, 0, 7); x.stroke(); }
  }
  const test = {
    sail, get ship(){ return { x:ship.x + k.ox, z:ship.z + k.oz, sail:ship.sail } }, shipPad:{ x:PADS.ship.x + k.ox, z:PADS.ship.z + k.oz, y:PR.y },
    get hunt(){ return HU ? { spots:HU.spots.map(i => ({ x:BAY.X[i][0] + k.ox, z:BAY.X[i][1] + k.oz, i })), found:HU.found.size } : null; }, dig,
    get cannon(){ return CA ? { hits:CA.hits, targets:TG.map(t => ({ x:t.x + k.ox, z:t.z + k.oz, dead:t.dead > api.T })) } : null; },
    aimAt(x, z){ if(CA){ CA.ax = x - k.ox; CA.az = z - k.oz; } }, fire
  };
  return { atmo:{ hemi:0xffe8c8, hemiG:0x5a7a9a, sun:0xffc890, sunI:2.5, fog:0xf4c0a0 }, group, solids:k.solids, movers:k.movers, ground, portals:[back], animate, tick, ctx, modes:{ hunt:huntMode, cannon:cannonMode }, miniBg, miniDots, test };
}
