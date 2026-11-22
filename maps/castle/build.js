/* «قلعة الألعاب» world: a toy castle on an island at sunset.
   buildCastle(THREE, K, scene, L) builds every static thing once (merged by area, baked contact shading, one baked
   shadow map), plus a few instanced/animated sets, and returns the gameplay data (solids, stations, toys, …).
   Axes: y up; a "dir" angle a means x = sin(a)·r, z = cos(a)·r (a = 0 is south, the side the kid arrives from). */

export const ISL_R = 76, MOAT_IN = 29.6, MOAT_OUT = 38.4, MOAT_MID = 34, WALL_R = 24, GATE_W = 3, BRIDGE_W = 2.5, WATER_Y = -0.6;
export const KEEP = { x:0, z:-10, r:5, top:26 };
export const DIRS = [[0, 1], [1, 0], [0, -1], [-1, 0]];         // the 4 bridges and gates: south, east, north, west
export const SPOTS = {
  tower:{ x:0, z:-1.6 }, treasure:{ x:6, z:13.5 }, boat:{ x:-14.6, z:37.8 }, bounce:{ x:31, z:33 }, cake:{ x:-8.2, z:7.4 },
  laila:{ x:4.2, z:15.2 }, statue:{ x:-4.6, z:17 }, zipTop:{ x:0, y:KEEP.top, z:-5.8 }, zipEnd:{ x:5, y:0, z:52 }, spawn:{ x:-3, z:45 }
};
export const BOAT_A0 = -0.42;                                   // boat race start angle on the moat
export const PARK = { x:42, z:42 };                             // bounce park centre

const smooth = t => t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t);
/* radial ground profile: [r, y] */
const PROF = [[0, .04], [22.4, .04], [23.2, 0], [29, 0], [29.8, -.5], [30.4, -1.5], [37.6, -1.5], [38.2, -.5], [39, 0], [70, 0], [73.5, -.15], [80, -1.6], [110, -4]];
function profY(r){ for(let i = 1; i < PROF.length; i++){ if(r <= PROF[i][0]){ const [r0, y0] = PROF[i - 1], [r1, y1] = PROF[i]; return y0 + (y1 - y0) * smooth((r - r0) / (r1 - r0)); } } return -4; }
/* bridge: an arch over the moat */
export function bridgeAt(x, z){
  for(const [dx, dz] of DIRS){ const al = x * dx + z * dz, lat = Math.abs(x * dz - z * dx);
    if(al > 28.4 && al < 39.6 && lat < BRIDGE_W + .5) return { al, lat, y:3.2 * Math.cos(Math.min(1, Math.abs(al - MOAT_MID) / 5.6) * Math.PI / 2) + .1 }; }
  return null;
}
export function groundAt(x, z){
  const r = Math.hypot(x, z); let y = profY(r);
  const b = bridgeAt(x, z); if(b && b.lat < BRIDGE_W + .2) y = Math.max(y, b.y);
  return y;
}
export function inGate(x, z){ for(const [dx, dz] of DIRS){ const al = x * dx + z * dz, lat = Math.abs(x * dz - z * dx); if(al > 20 && al < 28 && lat < GATE_W - .1) return true; } return false; }
export function onBridge(x, z){ const b = bridgeAt(x, z); return !!(b && b.lat < BRIDGE_W - .1); }

export function buildCastle(THREE, K, scene, L){
  const { Merge, G, canvasTex, glowTex } = K;
  /* scenery geometry: smooth enough to look round, light enough for phones */
  const CG = { sph:new THREE.SphereGeometry(1, 14, 10), sm:new THREE.SphereGeometry(1, 7, 5), cyl:new THREE.CylinderGeometry(1, 1, 1, 22), cyl8:new THREE.CylinderGeometry(1, 1, 1, 8),
    cone:new THREE.ConeGeometry(1, 1, 16), cone4:G.cone4, hemi:new THREE.SphereGeometry(1, 12, 5, 0, Math.PI * 2, 0, Math.PI / 2), torus:new THREE.TorusGeometry(1, .18, 6, 20) };
  const petal = new THREE.OctahedronGeometry(1, 0);
  const rnd = (() => { let s = 1234567; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
  const solids = [];
  const addC = (x, z, r, y0, y1, o) => solids.push(Object.assign({ t:'c', x, z, r, y0, y1 }, o || {}));
  const addB = (x, z, hx, hz, y0, y1, o) => solids.push(Object.assign({ t:'b', x, z, hx, hz, y0, y1 }, o || {}));
  const C = {
    stone:0xf1e2c4, stone2:0xe2cfa9, stoneD:0xc9b28a, wood:0xb87a48, woodD:0x8a5532, grass:0x7cc95a, grass2:0x5fb24a, hedge:0x3f9a48,
    red:0xe8505b, blue:0x4f7fe8, purple:0x9b6bff, green:0x3fbf7f, gold:0xffc83a, pink:0xff8fb8, cream:0xfff3dc, teal:0x2fb7b0, orange:0xff9a3c, navy:0x2b3a7a, white:0xfffaf0
  };

  /* ---------- chunked merges (each area is one draw call; small details are culled far away) ---------- */
  const CH = 40, chunks = new Map();
  function M(x, z, detail){
    const k = (detail ? 'd' : 's') + Math.floor((x + 120) / CH) + '_' + Math.floor((z + 120) / CH);
    let c = chunks.get(k); if(!c){ c = { m:new Merge(), detail:!!detail, cx:0, cz:0, n:0 }; chunks.set(k, c); }
    c.cx += x; c.cz += z; c.n++; return c.m;
  }
  const matV = new THREE.MeshLambertMaterial({ vertexColors:true });
  function bake(g){
    const p = g.attributes.position, n = g.attributes.normal, c = g.attributes.color;
    for(let i = 0; i < p.count; i++){
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i), h = y - Math.max(groundAt(x, z), -1.5);
      let k = .6 + .4 * smooth(h / 1.5);
      const ny = n.getY(i); if(ny < -.5) k *= .78; else if(ny > .7) k *= 1.05;
      c.setXYZ(i, Math.min(1, c.getX(i) * k), Math.min(1, c.getY(i) * k), Math.min(1, c.getZ(i) * k));
    }
  }
  const culled = [];
  function finish(){
    for(const c of chunks.values()){
      if(c.m.empty) continue;
      const g = c.m.geometry(); bake(g);
      const mesh = new THREE.Mesh(g, matV); mesh.castShadow = true; mesh.receiveShadow = true; mesh.matrixAutoUpdate = false; scene.add(mesh);
      if(c.detail){ mesh.userData.c = [c.cx / c.n, c.cz / c.n]; culled.push(mesh); }
    }
  }

  /* ---------- ground (radial lathe: plaza, grass, moat bed, beach) ---------- */
  (() => {
    const RS = [], N = 160;
    for(let r = 0; r <= 110; r += r < 20 ? 4 : r < 42 ? .6 : r < 70 ? 4 : 1.5) RS.push(r);
    const pos = [], col = [], idx = [], c = new THREE.Color(), cg = new THREE.Color(C.grass), cg2 = new THREE.Color(C.grass2), cp = new THREE.Color(0xe9d3a6), cs = new THREE.Color(0xf6deb0), cb = new THREE.Color(0x6b8f8a);
    const noise = (x, z) => Math.sin(x * .21 + Math.cos(z * .17) * 2) * .5 + Math.sin(z * .13 - x * .07) * .5;
    for(let i = 0; i < RS.length; i++) for(let j = 0; j < N; j++){
      const a = j / N * Math.PI * 2, r = RS[i], x = Math.sin(a) * r, z = Math.cos(a) * r;
      const y = profY(r); pos.push(x, y, z);
      const nz = noise(x, z);
      if(r < 22.6){ c.copy(cp).multiplyScalar(.96 + nz * .04); if(Math.floor(x / 2.2) % 2 === Math.floor(z / 2.2) % 2) c.multiplyScalar(.97); }
      else if(r < 29.2 || (r > 38.8 && r < 72)){ c.copy(cg).lerp(cg2, .5 + nz * .5); c.lerp(new THREE.Color(0xffd27a), .08); }
      else if(r >= 72){ c.copy(cs).lerp(cg, smooth((73 - r) / 2)); }
      else c.copy(cb).lerp(new THREE.Color(0x8a7a5a), smooth(Math.abs(r - 34) / 4.5));
      col.push(c.r, c.g, c.b);
    }
    for(let i = 0; i < RS.length - 1; i++) for(let j = 0; j < N; j++){ const a = i * N + j, b = i * N + (j + 1) % N, d = (i + 1) * N + j, e = (i + 1) * N + (j + 1) % N; idx.push(a, d, b, b, d, e); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setIndex(idx); g.computeVertexNormals();
    const m = new THREE.Mesh(g, matV); m.receiveShadow = true; m.matrixAutoUpdate = false; scene.add(m);
  })();

  /* paths: light stone discs from each bridge to the gate and on to the stations */
  function path(ax, az, bx, bz, w = 1.6){
    const d = Math.hypot(bx - ax, bz - az), n = Math.ceil(d / .9);
    for(let i = 0; i <= n; i++){ const t = i / n, x = ax + (bx - ax) * t, z = az + (bz - az) * t; if(onBridge(x, z) || Math.abs(Math.hypot(x, z) - MOAT_MID) < 4.6) continue;
      M(x, z).add(G.cyl8, x + (rnd() - .5) * .25, groundAt(x, z) + .03, z + (rnd() - .5) * .25, w * (.36 + rnd() * .1), .06, w * (.33 + rnd() * .1), 0, rnd() * 3, 0, rnd() < .5 ? 0xf3e6cc : 0xe8d7b4); }
  }
  DIRS.forEach(([dx, dz]) => path(dx * 39.5, dz * 39.5, dx * 60, dz * 60));
  path(-12.5, 39.5, 0, 42); path(3, 41, 28, 32); path(0, 42, 4, 50);

  /* ---------- the curtain wall (a ring), gatehouses, 4 big towers ---------- */
  const towerCols = [C.red, C.blue, C.purple, C.green];
  const banners = [], flags = [];
  (() => {
    const segs = 64;
    for(let s = 0; s < segs; s++){
      const a = (s + .5) / segs * Math.PI * 2, x = Math.sin(a) * WALL_R, z = Math.cos(a) * WALL_R;
      if(inGate(x, z)) continue;
      const len = 2 * Math.PI * WALL_R / segs + .08, m = M(x, z);
      m.add(G.box, x, 3, z, len, 6, 1.6, 0, a, 0, C.stone);
      m.add(G.box, Math.sin(a) * (WALL_R - .02), .45, Math.cos(a) * (WALL_R - .02), len, .9, 1.9, 0, a, 0, C.stoneD);
      m.add(G.box, x, 6.1, z, len, .25, 1.9, 0, a, 0, C.stone2);
      for(const off of [-.55, .55]){ const ox = Math.sin(a) * off, oz = Math.cos(a) * off;
        if(s % 2 === 0) m.add(G.box, x + ox, 6.75, z + oz, len * .5, 1.1, .45, 0, a, 0, C.stone); }
      if(s % 4 === 1){ const wx = Math.sin(a) * (WALL_R + .82), wz = Math.cos(a) * (WALL_R + .82); m.add(G.box, wx, 3.6, wz, .8, 1.3, .06, 0, a, 0, 0x3a4a7a); }
    }
    // gatehouses: two round towers and a bridge with a single-colour banner
    DIRS.forEach(([dx, dz], gi) => {
      const ry = Math.atan2(dx, dz), px = -dz, pz = dx;
      for(const s of [-1, 1]){
        const x = dx * WALL_R + px * s * (GATE_W + 1.2), z = dz * WALL_R + pz * s * (GATE_W + 1.2), m = M(x, z);
        m.add(CG.cyl, x, 4.2, z, 1.9, 8.4, 1.9, 0, 0, 0, C.stone);
        m.add(CG.cyl, x, 8.6, z, 2.2, .5, 2.2, 0, 0, 0, C.stone2);
        for(let k = 0; k < 8; k++){ const b = k / 8 * Math.PI * 2; m.add(G.box, x + Math.sin(b) * 1.95, 9.25, z + Math.cos(b) * 1.95, .7, .9, .5, 0, b, 0, C.stone); }
        m.add(CG.cone, x, 11.2, z, 2.4, 3.6, 2.4, 0, 0, 0, towerCols[gi]);
        addC(x, z, 2.0, 0, 8.6);
        flags.push({ x, y:13.1, z, col:towerCols[gi] });
      }
      const x = dx * WALL_R, z = dz * WALL_R, m = M(x, z);
      m.add(G.box, x, 7.4, z, 2.2, 2.6, GATE_W * 2 + 2, 0, ry + Math.PI / 2, 0, C.stone);
      for(let k = -3; k <= 3; k++) if(k % 2 === 0) m.add(G.box, x + px * k * 1.05, 9.1, z + pz * k * 1.05, .8, .9, 2.2, 0, ry, 0, C.stone2);
      m.add(new THREE.TorusGeometry(GATE_W, .32, 8, 20, Math.PI), x, 5.1, z, 1, 1, 6, 0, ry + Math.PI / 2, 0, C.stone2);
      banners.push({ x:x + dx * 1.2, y:7.2, z:z + dz * 1.2, ry, col:towerCols[gi], w:1.5, h:2.6 });
      banners.push({ x:x - dx * 1.2, y:7.2, z:z - dz * 1.2, ry:ry + Math.PI, col:towerCols[gi], w:1.5, h:2.6 });
      // the gate floor and two lanterns
      m.add(G.box, x, .05, z, GATE_W * 2, .1, 2.4, 0, ry, 0, C.stone2);
    });
    // big corner towers on the diagonals
    [Math.PI / 4, 3 * Math.PI / 4, 5 * Math.PI / 4, 7 * Math.PI / 4].forEach((a, i) => {
      const x = Math.sin(a) * WALL_R, z = Math.cos(a) * WALL_R, m = M(x, z), col = towerCols[i];
      m.add(CG.cyl, x, 6.5, z, 3.6, 13, 3.6, 0, 0, 0, C.stone);
      m.add(CG.cyl, x, .6, z, 3.9, 1.2, 3.9, 0, 0, 0, C.stoneD);
      m.add(CG.cyl, x, 13.2, z, 4.2, .6, 4.2, 0, 0, 0, C.stone2);
      for(let k = 0; k < 12; k++){ const b = k / 12 * Math.PI * 2; m.add(G.box, x + Math.sin(b) * 3.95, 14, z + Math.cos(b) * 3.95, .9, 1.1, .55, 0, b, 0, C.stone); }
      m.add(CG.cyl, x, 15.5, z, 2.6, 3, 2.6, 0, 0, 0, C.stone);
      m.add(CG.cone, x, 19.8, z, 3.4, 5.8, 3.4, 0, 0, 0, col);
      m.add(CG.sph, x, 22.9, z, .35, .35, .35, 0, 0, 0, C.gold);
      for(let k = 0; k < 4; k++){ const b = a + Math.PI + (k - 1.5) * .55, wx = x + Math.sin(b) * 3.62, wz = z + Math.cos(b) * 3.62;
        m.add(G.box, wx, 9, wz, .9, 1.5, .1, 0, b, 0, 0x34407a); m.add(CG.hemi, wx, 9.75, wz, .45, .45, .1, Math.PI / 2, b, 0, 0x34407a); }
      addC(x, z, 3.9, 0, 13.2);
      flags.push({ x, y:24.2, z, col });
      const bb = a + Math.PI; banners.push({ x:x + Math.sin(bb) * 3.7, y:10.5, z:z + Math.cos(bb) * 3.7, ry:bb, col, w:1.6, h:3.4 });
      banners.push({ x:x + Math.sin(a) * 3.7, y:10.5, z:z + Math.cos(a) * 3.7, ry:a, col, w:1.6, h:3.4 });
    });
  })();

  /* ---------- the keep: the tall tower in the middle (the climb goes around it) ---------- */
  (() => {
    const { x, z, r, top } = KEEP, m = M(x, z);
    m.add(new THREE.CylinderGeometry(r, r + .4, top, 40), x, top / 2, z, 1, 1, 1, 0, 0, 0, C.stone);
    m.add(CG.cyl, x, top + .2, z, r + .7, .5, r + .7, 0, 0, 0, C.stone2);
    for(let k = 0; k < 7; k++) m.add(CG.cyl, x, 3.5 + k * 3.5, z, r + .12, .25, r + .12, 0, 0, 0, C.stone2);
    for(let k = 0; k < 20; k++){ const b = k / 20 * Math.PI * 2; m.add(G.box, x + Math.sin(b) * (r + .4), top + 1, z + Math.cos(b) * (r + .4), .9, 1.1, .45, 0, b, 0, C.stone); }
    for(let lv = 0; lv < 6; lv++) for(let k = 0; k < 6; k++){ const b = k / 6 * Math.PI * 2 + lv * .5, wx = x + Math.sin(b) * (r + .1), wz = z + Math.cos(b) * (r + .1), wy = 5 + lv * 3.6;
      m.add(G.box, wx, wy, wz, .8, 1.3, .1, 0, b, 0, 0x34407a); m.add(CG.hemi, wx, wy + .65, wz, .4, .4, .1, Math.PI / 2, b, 0, 0x34407a); }
    // door
    m.add(G.box, x, 1.4, z + r + .08, 2, 2.8, .2, 0, 0, 0, C.woodD); m.add(CG.hemi, x, 2.8, z + r + .08, 1, 1, .2, Math.PI / 2, 0, 0, C.woodD);
    // a little turret on the roof terrace (north side), roof in royal purple with a gold ball
    const tx = x, tz = z - 2.4;
    m.add(CG.cyl, tx, top + 2.2, tz, 1.6, 4, 1.6, 0, 0, 0, C.stone);
    m.add(CG.cone, tx, top + 6, tz, 2.2, 3.6, 2.2, 0, 0, 0, C.navy);
    m.add(CG.sph, tx, top + 8, tz, .3, .3, .3, 0, 0, 0, C.gold);
    addC(x, z, r + .3, 0, top + .45);
    addC(tx, tz, 1.7, top, top + 4.2);
    // terrace ring (crenellation) blocks the outer edge except the zipline gap
    for(let k = 0; k < 20; k++){ const b = k / 20 * Math.PI * 2; if(Math.abs(Math.sin(b / 2)) < .14) continue; addC(x + Math.sin(b) * (r + .5), z + Math.cos(b) * (r + .5), .55, top, top + 1.6); }
    // gap for the climb arrival (east) and the zipline (south)
    flags.push({ x:tx, y:top + 9, z:tz, col:C.navy });
  })();

  /* ---------- the climb: toy blocks and drums spiralling around the keep, 3 checkpoints ---------- */
  const spiral = [], checkpoints = [];
  (() => {
    const R = KEEP.r + 2.7, N = 26, step = .42, rise = (KEEP.top - .4) / N, cols = [C.red, C.blue, C.gold, C.green, C.purple, C.orange, C.pink, C.teal];
    for(let i = 0; i < N; i++){
      const a = .45 + i * step, x = KEEP.x + Math.sin(a) * R, z = KEEP.z + Math.cos(a) * R, y = .8 + i * rise, col = cols[i % cols.length];
      const cp = i === 8 || i === 17;
      const m = M(x, z);
      if(cp || i % 3 !== 1){
        const s = cp ? 1.35 : 1.05;
        m.add(G.box, x, y - .45, z, s * 2, .9, s * 2, 0, 0, 0, col); m.add(G.box, x, y - .02, z, s * 2 - .2, .06, s * 2 - .2, 0, 0, 0, C.white);
        for(const [ox, oz] of [[-.5, -.5], [.5, -.5], [-.5, .5], [.5, .5]]) m.add(CG.cyl8, x + ox * s, y + .08, z + oz * s, .3, .16, .3, 0, 0, 0, col);
        addB(x, z, s, s, y - .9, y, { plat:i });
      } else {
        m.add(CG.cyl, x, y - .5, z, 1.2, 1, 1.2, 0, 0, 0, col); m.add(CG.cyl, x, y - .02, z, 1.1, .06, 1.1, 0, 0, 0, C.white);
        addC(x, z, 1.2, y - 1, y, { plat:i });
      }
      // support stick down to the keep wall (a toy peg)
      const sx = KEEP.x + Math.sin(a) * (KEEP.r + .9), sz = KEEP.z + Math.cos(a) * (KEEP.r + .9);
      m.add(G.box, sx, y - .7, sz, .3, .3, 2.2, 0, a, 0, C.woodD);
      spiral.push({ x, y, z, a });
      if(i === 0 || cp) checkpoints.push({ i, x, y, z });
    }
    checkpoints.push({ i:N, x:KEEP.x + 2.2, y:KEEP.top + .45, z:KEEP.z + 2.4, top:true });
  })();

  /* ---------- courtyard: market stalls, fountains, the cake table, Laila's board ---------- */
  const fountains = [];
  function fountain(x, z, s){
    const m = M(x, z), y = groundAt(x, z);
    m.add(CG.cyl, x, y + .4 * s, z, 3 * s, .8 * s, 3 * s, 0, 0, 0, C.stone2);
    m.add(CG.cyl, x, y + .82 * s, z, 3.15 * s, .14 * s, 3.15 * s, 0, 0, 0, C.stone);
    m.add(CG.cyl, x, y + .7 * s, z, 2.7 * s, .1, 2.7 * s, 0, 0, 0, 0x6fd0e8);
    m.add(CG.cyl, x, y + 1.6 * s, z, .45 * s, 1.8 * s, .45 * s, 0, 0, 0, C.stone);
    m.add(new THREE.SphereGeometry(1, 24, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), x, y + 2.5 * s, z, 1.4 * s, .55 * s, 1.4 * s, 0, 0, 0, C.stone);
    m.add(CG.cyl, x, y + 2.5 * s, z, 1.3 * s, .06, 1.3 * s, 0, 0, 0, 0x8fe0f0);
    m.add(CG.sph, x, y + 3 * s, z, .3 * s, .3 * s, .3 * s, 0, 0, 0, C.gold);
    addC(x, z, 3.15 * s, -1, y + .9 * s);
    fountains.push({ x, y:y + 3 * s, z, s, base:y + .75 * s });
  }
  fountain(0, 4, 1);
  function stall(x, z, ry, col, goods){
    const m = M(x, z), cs = Math.cos(ry), sn = Math.sin(ry), P = (lx, lz) => [x + lx * cs + lz * sn, z - lx * sn + lz * cs];
    const W = 3.2, D = 1.8;
    { const [a, b] = P(0, 0); m.add(G.box, a, .55, b, W, 1.1, D, 0, ry, 0, C.wood); m.add(G.box, a, 1.13, b, W + .2, .12, D + .2, 0, ry, 0, C.woodD); }
    for(const [lx, lz] of [[-W / 2, -D / 2], [W / 2, -D / 2], [-W / 2, D / 2], [W / 2, D / 2]]){ const [a, b] = P(lx, lz); m.add(CG.cyl8, a, 1.6, b, .09, 3.2, .09, 0, 0, 0, C.woodD); }
    { const [a, b] = P(0, -.1); m.add(G.box, a, 3.25, b, W + .5, .14, D + .9, -.2, ry, 0, col);
      for(let k = 0; k < 7; k++){ const [c, d] = P(-W / 2 - .1 + k * (W + .2) / 6, D / 2 + .32); m.add(CG.hemi, c, 3.12, d, .3, -.28, .3, 0, 0, 0, col); } }
    const gcols = goods || [C.red, C.orange, C.gold, C.green];
    for(let k = 0; k < 6; k++){ const [a, b] = P(-1.2 + (k % 3) * 1.2, -.35 + Math.floor(k / 3) * .6); m.add(k % 2 ? G.box : CG.sm, a, 1.38, b, .26, .26, .26, k * .4, k, 0, gcols[k % gcols.length]); }
    const [a, b] = P(0, 0); addB(a, b, Math.abs(cs) * W / 2 + Math.abs(sn) * D / 2 + .1, Math.abs(sn) * W / 2 + Math.abs(cs) * D / 2 + .1, 0, 1.2);
  }
  const stallCols = [C.red, C.blue, C.purple, C.green, C.orange, C.teal];
  [.78, -1.35, 1.35, -1.95, 1.95].forEach((a, i) => { const x = Math.sin(a) * 13.2, z = Math.cos(a) * 13.2; stall(x, z, a + Math.PI, stallCols[i + 1]); });
  // «طاولة الحلويات»: the cake stall (pink awning) with a long table
  (() => {
    const { x, z } = SPOTS.cake, m = M(x, z), ty = 1.05;
    m.add(G.box, x, ty - .06, z - 1.8, 4.4, .12, 2.2, 0, 0, 0, C.cream);
    for(const [ox, oz] of [[-2, -2.7], [2, -2.7], [-2, -.9], [2, -.9]]) m.add(CG.cyl8, x + ox, ty / 2, z + oz, .1, ty, .1, 0, 0, 0, C.woodD);
    for(const [ox, oz] of [[-2.3, -3.1], [2.3, -3.1], [-2.3, -.5], [2.3, -.5]]) m.add(CG.cyl8, x + ox, 1.8, z + oz, .1, 3.6, .1, 0, 0, 0, C.white);
    m.add(G.box, x, 3.7, z - 1.8, 5.2, .16, 3.2, 0, 0, 0, C.pink);
    for(let k = 0; k < 9; k++) m.add(CG.hemi, x - 2.5 + k * .625, 3.6, z - .2, .32, -.3, .32, 0, 0, 0, C.pink);
    m.add(CG.cyl, x, ty + .02, z - 1.8, 1.5, .05, 1.5, 0, 0, 0, C.white);        // the cake plate
    for(const [ox, c] of [[-1.7, C.pink], [1.7, C.cream]]){ m.add(CG.cyl, x + ox, ty + .25, z - 2.2, .45, .5, .45, 0, 0, 0, c); m.add(CG.sm, x + ox, ty + .6, z - 2.2, .1, .1, .1, 0, 0, 0, C.red); }
    addB(x, z - 1.8, 2.3, 1.2, 0, ty);
  })();
  const cakeTable = { x:SPOTS.cake.x, y:1.07, z:SPOTS.cake.z - 1.8 };
  // Laila's treasure board
  (() => {
    const { x, z } = SPOTS.treasure, m = M(x, z);
    m.add(G.box, x, 1.7, z - .6, 2.6, 1.8, .16, 0, 0, 0, C.woodD);
    m.add(G.box, x, 1.7, z - .5, 2.3, 1.5, .06, 0, 0, 0, 0xfff3d6);
    for(const s of [-1, 1]) m.add(G.box, x + s * 1.2, .9, z - .6, .16, 1.8, .16, 0, 0, 0, C.woodD);
    m.add(CG.cone4, x, 2.95, z - .6, 1.9, .7, .5, 0, Math.PI / 4, 0, C.gold);
    addB(x, z - .6, 1.35, .2, 0, 2.6);
  })();
  // statue pedestal (the statue appears when the bounce park is done)
  (() => { const { x, z } = SPOTS.statue, m = M(x, z); m.add(CG.cyl, x, .5, z, 1.1, 1, 1.1, 0, 0, 0, C.stone2); m.add(CG.cyl, x, 1.05, z, 1.25, .12, 1.25, 0, 0, 0, C.stone); addC(x, z, 1.2, 0, 1.1); })();

  /* ---------- bridges with lanterns ---------- */
  const lamps = [];
  DIRS.forEach(([dx, dz]) => {
    const px = -dz, pz = dx;
    for(let al = 28.6; al <= 39.4; al += .55){
      const b = bridgeAt(dx * al, dz * al); if(!b) continue; const y = b.y;
      const m = M(dx * al, dz * al);
      m.add(G.box, dx * al, y - .25, dz * al, dx ? .62 : BRIDGE_W * 2 + .4, .5, dz ? .62 : BRIDGE_W * 2 + .4, 0, 0, 0, (Math.round(al / .55) % 2) ? C.wood : 0xc28854);
      for(const s of [-1, 1]){ const rx = dx * al + px * s * (BRIDGE_W + .1), rz = dz * al + pz * s * (BRIDGE_W + .1);
        m.add(G.box, rx, y + .7, rz, dx ? .62 : .14, .14, dz ? .62 : .14, 0, 0, 0, C.woodD);
        if(Math.round(al / .55) % 3 === 0) m.add(G.box, rx, y + .35, rz, .14, .75, .14, 0, 0, 0, C.woodD); }
    }
    // stone feet under the arch
    for(const al of [29, 39]) for(const s of [-1, 1]){ const x = dx * al + px * s * BRIDGE_W, z = dz * al + pz * s * BRIDGE_W; M(x, z).add(G.box, x, -.6, z, 1, 1.6, 1, 0, 0, 0, C.stoneD); }
    for(const al of [27.2, 40.8]) for(const s of [-1, 1]) lamps.push([dx * al + px * s * (BRIDGE_W + .7), dz * al + pz * s * (BRIDGE_W + .7)]);
  });
  [[8, 18], [-8, 18], [16, 2], [-16, 2], [10, -16], [-10, -16], [3, 44], [-3, 44], [40, -3], [40, 3], [-40, -3], [-40, 3], [24, 30], [-12, 33.5], [-18, 39.5], [52, 32], [32, 52]].forEach(p => lamps.push(p));

  /* ---------- outside: gardens with fountains, hedges, statues, trees, flowers, toy blocks, a windmill ---------- */
  fountain(-54, 0, 1.25); fountain(40, -40, 1.1);
  function hedge(x, z, w, d, ry = 0){ const m = M(x, z); m.add(G.box, x, .55, z, w, 1.1, d, 0, ry, 0, C.hedge); m.add(CG.sm, x, 1.05, z, w * .52, .3, d * .55, 0, ry, 0, 0x4fae55); addB(x, z, (Math.abs(Math.cos(ry)) * w + Math.abs(Math.sin(ry)) * d) / 2, (Math.abs(Math.sin(ry)) * w + Math.abs(Math.cos(ry)) * d) / 2, 0, 1.1); }
  // west garden: a ring of hedges around the big fountain, with 4 openings
  for(let k = 0; k < 12; k++){ if(k % 3 === 0) continue; const a = k / 12 * Math.PI * 2, x = -54 + Math.sin(a) * 9, z = Math.cos(a) * 9; hedge(x, z, 4.2, 1, a + Math.PI / 2); }
  // north-east garden: hedge squares
  for(const [x, z, w, d] of [[30, -48, 8, 1], [50, -48, 8, 1], [30, -32, 8, 1], [50, -32, 8, 1], [26, -40, 1, 6], [54, -40, 1, 6]]) hedge(x, z, w, d);
  function statue(x, z, kind, ry){
    const m = M(x, z), y = groundAt(x, z), S = 0xd8d0c4;
    m.add(G.box, x, y + .5, z, 1.4, 1, 1.4, 0, ry, 0, C.stone2); m.add(G.box, x, y + 1.05, z, 1.55, .1, 1.55, 0, ry, 0, C.stone);
    if(kind === 0){ // toy soldier
      m.add(CG.cyl, x, y + 1.9, z, .38, 1.4, .38, 0, 0, 0, S); m.add(CG.sph, x, y + 2.85, z, .38, .38, .38, 0, 0, 0, S); m.add(CG.cyl, x, y + 3.45, z, .3, .7, .3, 0, 0, 0, S);
      for(const s of [-1, 1]) m.add(CG.cyl8, x + s * .48, y + 2.1, z, .12, 1, .12, 0, 0, s * .1, S);
    } else if(kind === 1){ // teddy
      m.add(CG.sph, x, y + 1.75, z, .62, .7, .55, 0, 0, 0, S); m.add(CG.sph, x, y + 2.75, z, .5, .48, .46, 0, 0, 0, S);
      for(const s of [-1, 1]){ m.add(CG.sph, x + s * .36, y + 3.15, z, .17, .17, .1, 0, 0, 0, S); m.add(CG.sph, x + s * .6, y + 1.9, z + .1, .2, .34, .2, 0, 0, s * .5, S); }
    } else { // a rocking horse head
      m.add(CG.cyl, x, y + 1.7, z, .3, 1.2, .3, 0, 0, 0, S); m.add(G.box, x, y + 2.5, z + .25, .5, .6, 1.1, .5, ry, 0, S); m.add(CG.cone4, x, y + 3, z, .2, .4, .2, 0, 0, 0, S);
    }
    addC(x, z, 1, 0, y + 1.1);
  }
  statue(-54, 11.5, 0, 0); statue(-54, -11.5, 1, Math.PI); statue(-42.5, 7, 2, 0); statue(26, -26, 1, 0); statue(-26, -26, 0, 0); statue(-26, 26, 1, 0); statue(8, 47, 0, 0);

  // trees (instanced): round toy trees in two greens, plus pointy ones
  const treeSpots = [];
  for(let k = 0; k < 140; k++){
    const a = rnd() * Math.PI * 2, r = 41 + rnd() * 30, x = Math.sin(a) * r, z = Math.cos(a) * r;
    if(Math.hypot(x + 54, z) < 13 || Math.hypot(x - 40, z + 40) < 15 || Math.hypot(x - PARK.x, z - PARK.z) < 17 || Math.hypot(x - SPOTS.boat.x, z - SPOTS.boat.z) < 6) continue;
    if(DIRS.some(([dx, dz]) => { const al = x * dx + z * dz, lat = Math.abs(x * dz - z * dx); return al > 0 && lat < 5; })) continue;
    if(Math.hypot(x, z - 50) < 7 || Math.hypot(x - 5, z - 52) < 6 || Math.hypot(x, z + 56) < 8) continue;
    if(z > 30 && Math.abs(Math.atan2(x, z)) < .68 && Math.abs(Math.hypot(x, z) - 62) < 6.5) continue;     // the portal hub
    if(treeSpots.some(t => Math.hypot(t[0] - x, t[1] - z) < 3.6)) continue;
    treeSpots.push([x, z, .8 + rnd() * .55, rnd() < .3 ? 1 : 0]);
  }
  for(const [x, z] of [[-18, 30], [18, 30], [27, 15], [-27, 15], [27, -15], [-27, -15]]) treeSpots.push([x, z, .7, 0]);
  (() => {
    const mk = (pointy) => { const m = new Merge();
      m.add(CG.cyl8, 0, .9, 0, .28, 1.8, .28, 0, 0, 0, C.woodD);
      if(pointy){ m.add(CG.cone, 0, 2.6, 0, 1.5, 2.2, 1.5, 0, 0, 0, 0x3f9a58); m.add(CG.cone, 0, 3.8, 0, 1.15, 1.8, 1.15, 0, 0, 0, 0x4fb066); m.add(CG.cone, 0, 4.8, 0, .75, 1.3, .75, 0, 0, 0, 0x60c070); }
      else { m.add(CG.sph, 0, 2.9, 0, 1.6, 1.45, 1.6, 0, 0, 0, 0x55b85a); m.add(CG.sph, .8, 2.5, .5, 1.05, .95, 1.05, 0, 0, 0, 0x4aa850); m.add(CG.sph, -.7, 3.4, -.3, 1, .95, 1, 0, 0, 0, 0x6ac868); }
      const g = m.geometry(); const c = g.attributes.color, p = g.attributes.position;
      for(let i = 0; i < p.count; i++){ const k = .62 + .38 * smooth(p.getY(i) / 2.2); c.setXYZ(i, c.getX(i) * k, c.getY(i) * k, c.getZ(i) * k); }
      return g; };
    for(const pointy of [0, 1]){
      const list = treeSpots.filter(t => t[3] === pointy), im = new THREE.InstancedMesh(mk(pointy), matV, list.length), mt = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
      list.forEach(([x, z, s], i) => { mt.compose(new THREE.Vector3(x, groundAt(x, z), z), q.setFromEuler(e.set(0, rnd() * 6, 0)), new THREE.Vector3(s, s * (.9 + rnd() * .2), s)); im.setMatrixAt(i, mt); addC(x, z, .5 * s + .15, 0, 4); });
      im.castShadow = true; im.receiveShadow = true; scene.add(im);
    }
  })();
  // flowers (instanced, each flower one colour), in beds around gardens and along the wall
  (() => {
    const fm = new Merge(); fm.add(new THREE.CylinderGeometry(1, 1, 1, 4), 0, .2, 0, .03, .4, .03, 0, 0, 0, 0x3f9a48);
    for(let k = 0; k < 4; k++){ const a = k / 4 * Math.PI * 2; fm.add(petal, Math.sin(a) * .1, .42, Math.cos(a) * .1, .09, .05, .09, 0, 0, 0, 0xffffff); }
    fm.add(petal, 0, .44, 0, .06, .06, .06, 0, 0, 0, 0xffd23f);
    const g = fm.geometry(), pts = [], cols = [0xff6f8e, 0xffffff, 0xffd23f, 0xb48cff, 0xff9a3c, 0x7fc8ff];
    const bed = (cx, cz, r, n) => { for(let k = 0; k < n; k++){ const a = rnd() * 6.283, d = Math.sqrt(rnd()) * r, x = cx + Math.sin(a) * d, z = cz + Math.cos(a) * d; pts.push([x, z, cols[Math.floor(rnd() * cols.length)]]); } };
    for(let k = 0; k < 16; k++){ const a = (k + .5) / 16 * Math.PI * 2, x = Math.sin(a) * 26.6, z = Math.cos(a) * 26.6; if(DIRS.some(([dx, dz]) => Math.abs(x * dz - z * dx) < 4 && x * dx + z * dz > 0)) continue; bed(x, z, 1.4, 14); }
    bed(-54, 0, 7.5, 120); bed(40, -40, 9, 90); bed(-40, -40, 8, 60); bed(-38, 40, 7, 50); bed(0, -50, 7, 50); bed(55, 15, 6, 40); bed(-60, 25, 6, 40);
    for(let k = 0; k < 6; k++){ const a = k / 6 * 6.283; bed(Math.sin(a) * 9, Math.cos(a) * 9 + 4, .8, 6); }
    const im = new THREE.InstancedMesh(g, new THREE.MeshLambertMaterial({ vertexColors:true }), pts.length), mt = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), c = new THREE.Color();
    let n = 0; pts.forEach(([x, z, col]) => { if(Math.hypot(x, z - 4) < 3.6 || Math.hypot(x + 54, z) < 4) return; const s = .9 + rnd() * .7; mt.compose(new THREE.Vector3(x, groundAt(x, z), z), q.setFromEuler(e.set(0, rnd() * 6, 0)), new THREE.Vector3(s, s, s)); im.setMatrixAt(n, mt); im.setColorAt(n, c.set(col)); n++; });
    im.count = n; im.userData.c = [0, 0]; scene.add(im); culled.push(im); im.userData.far = 200;
  })();
  // giant toy blocks in single colours (stacks), and a toy playground in the north-west
  const blockCols = [C.red, C.blue, C.gold, C.green, C.purple, C.orange];
  function blocks(cx, cz, n){
    for(let k = 0; k < n; k++){ const x = cx + (rnd() - .5) * 8, z = cz + (rnd() - .5) * 8, s = .8 + rnd() * .7, col = blockCols[Math.floor(rnd() * blockCols.length)], m = M(x, z, true), ry = rnd() * 1.5;
      m.add(G.box, x, s / 2, z, s, s, s, 0, ry, 0, col);
      for(const [ox, oz] of [[-.25, -.25], [.25, -.25], [-.25, .25], [.25, .25]]) m.add(CG.cyl8, x + (ox * Math.cos(ry) + oz * Math.sin(ry)) * s, s + .06, z + (-ox * Math.sin(ry) + oz * Math.cos(ry)) * s, .14 * s, .12, .14 * s, 0, 0, 0, col);
      addC(x, z, s * .62, 0, s); }
  }
  blocks(-40, -40, 12); blocks(-38, 40, 6); blocks(55, 15, 5); blocks(-60, 25, 4); blocks(14, 46, 4);
  // a toy windmill in the north (one colour sails, turning)
  const windmill = (() => {
    const x = 0, z = -58, m = M(x, z);
    m.add(new THREE.CylinderGeometry(2.2, 3.2, 9, 16), x, 4.5, z, 1, 1, 1, 0, 0, 0, C.cream);
    m.add(CG.cone, x, 10.4, z, 3.2, 2.8, 3.2, 0, 0, 0, C.red);
    m.add(G.box, x, 1.3, z + 2.85, 1.4, 2.6, .3, 0, 0, 0, C.woodD);
    addC(x, z, 3.1, 0, 9);
    const sails = new THREE.Group(); sails.position.set(x, 8.2, z + 2.9);
    const sm = new Merge(); sm.add(CG.cyl8, 0, 0, 0, .35, .5, .35, Math.PI / 2, 0, 0, C.woodD);
    for(let k = 0; k < 4; k++){ const a = k * Math.PI / 2; sm.add(G.box, Math.sin(a) * 2.6, Math.cos(a) * 2.6, .2, .35, 5, .12, 0, 0, -a, C.woodD); sm.add(G.box, Math.sin(a) * 3.1 + Math.cos(a) * .7, Math.cos(a) * 3.1 - Math.sin(a) * .7, .25, 1.3, 3.6, .06, 0, 0, -a, C.white); }
    const mesh = new THREE.Mesh(sm.geometry(), matV); mesh.castShadow = true; sails.add(mesh); scene.add(sails); return sails;
  })();

  /* ---------- the boat dock + moored boats ---------- */
  const bobbers = [];
  const boatGeo = (col) => { const m = new Merge();
    m.add(CG.sph, 0, .15, 0, .95, .55, 1.65, 0, 0, 0, col); m.add(G.box, 0, .45, 0, 1.5, .16, 2.6, 0, 0, 0, C.wood);
    m.add(CG.cyl8, 0, .58, -.2, .5, .2, .5, 0, 0, 0, C.cream); m.add(CG.cone, 0, .35, 1.75, .6, .9, .45, Math.PI / 2, 0, 0, col);
    m.add(CG.torus, 0, .5, 0, .9, .9, 1.55, Math.PI / 2, 0, 0, C.white);
    const g = m.geometry(); g.translate(0, 0, 0); return g; };
  (() => {
    const a = BOAT_A0, x = Math.sin(a) * 39.6, z = Math.cos(a) * 39.6, m = M(x, z);
    for(let k = -2; k <= 2; k++){ const px = x + Math.cos(a) * k * .9, pz = z - Math.sin(a) * k * .9; m.add(G.box, px, .1, pz, .8, .2, 4, 0, a, 0, k % 2 ? C.wood : 0xc28854); }
    for(const s of [-1, 1]) for(const t of [-1.8, 1.8]){ const px = x + Math.cos(a) * s * 2.1 + Math.sin(a) * t * .5, pz = z - Math.sin(a) * s * 2.1 + Math.cos(a) * t * .5; m.add(CG.cyl8, px, 0, pz, .16, 1.6, .16, 0, 0, 0, C.woodD); }
    [[-1.1, C.blue], [-.75, C.green], [-.6, C.purple]].forEach(([b, col]) => { const g = boatGeo(col), mesh = new THREE.Mesh(g, matV); const bx = Math.sin(a + b * .1) * 36.6, bz = Math.cos(a + b * .1) * 36.6; mesh.position.set(Math.sin(a + b * .1 + .08) * 37.4, WATER_Y + .1, Math.cos(a + b * .1 + .08) * 37.4); mesh.rotation.y = a + Math.PI / 2; mesh.castShadow = true; scene.add(mesh); mesh.userData.bob = rnd() * 6; bobbers.push(mesh); void bx; void bz; });
  })();

  /* ---------- the bounce park: trampolines in single colours + 10 stars up high ---------- */
  const pads = [], bounceStars = [];
  (() => {
    const cols = [C.blue, C.pink, C.gold, C.green, C.purple, C.orange, C.teal, C.red];
    const P = [[0, 0], [5, -2], [-4, 4], [3, 6], [-6, -3], [8, 4], [-1, -7], [7, -7], [-8, 8]];
    P.forEach(([ox, oz], i) => {
      const x = PARK.x + ox, z = PARK.z + oz, r = 1.8 + (i % 3) * .2, m = M(x, z), col = cols[i % cols.length];
      m.add(CG.cyl, x, .45, z, r + .25, .3, r + .25, 0, 0, 0, col);
      m.add(CG.cyl, x, .62, z, r - .05, .06, r - .05, 0, 0, 0, 0x2a2a3e);
      for(let k = 0; k < 6; k++){ const b = k / 6 * 6.283; m.add(CG.cyl8, x + Math.sin(b) * r, .15, z + Math.cos(b) * r, .1, .3, .1, 0, 0, 0, C.navy); }
      addC(x, z, r + .25, 0, .62, { bounce:1 });
      pads.push({ x, z, r });
    });
    // fence of soft posts around the park
    for(let k = 0; k < 28; k++){ const a = k / 28 * 6.283; if(Math.abs(Math.sin((a - 3.93) / 2)) < .1) continue; const x = PARK.x + Math.sin(a) * 13.5, z = PARK.z + Math.cos(a) * 13.5; M(x, z, true).add(CG.cyl8, x, .45, z, .18, .9, .18, 0, 0, 0, C.cream); M(x, z, true).add(CG.sm, x, .95, z, .24, .24, .24, 0, 0, 0, cols[k % cols.length]); }
    [[0, 0, 6.5], [5, -2, 7.4], [-4, 4, 6], [3, 6, 7], [-6, -3, 5.6], [8, 4, 7.6], [-1, -7, 6.6], [7, -7, 8], [-8, 8, 6.2], [2.5, -4.5, 9.2]].forEach(([ox, oz, y]) => bounceStars.push({ x:PARK.x + ox, y, z:PARK.z + oz }));
  })();

  /* ---------- balloons, lanterns, banners and flags (instanced / animated) ---------- */
  const balloonSpots = [[9.5, 18.5], [-9.5, 18.5], [12, 6], [-12, 6], [PARK.x - 10, PARK.z - 8], [PARK.x + 9, PARK.z - 9], [-48, -8], [-48, 8], [-13, 40], [3.5, 45], [36, -33], [44, -33]];
  const balloons = (() => {
    const g = new THREE.SphereGeometry(.42, 14, 10); g.scale(1, 1.2, 1);
    const cols = [0xff6f8e, 0xffd23f, 0x5fb8ff, 0x5fe3b1, 0xb48cff, 0xff9a3c];
    const n = balloonSpots.length * 3, im = new THREE.InstancedMesh(g, new THREE.MeshPhongMaterial({ shininess:70, specular:0x555555 }), n);
    const list = []; balloonSpots.forEach(([x, z], i) => { for(let k = 0; k < 3; k++) list.push({ x:x + (k - 1) * .5, z:z + (k % 2) * .4, y:groundAt(x, z) + 3 + k * .35, c:cols[(i + k) % cols.length], ph:rnd() * 6 }); });
    list.forEach((b, i) => im.setColorAt(i, new THREE.Color(b.c)));
    const sm = new Merge(); list.forEach(b => sm.add(CG.cyl8, b.x, (b.y + groundAt(b.x, b.z)) / 2, b.z, .015, b.y - groundAt(b.x, b.z), .015, 0, 0, 0, 0xffffff));
    const strings = new THREE.Mesh(sm.geometry(), matV); scene.add(strings);
    for(const [x, z] of balloonSpots) M(x, z, true).add(G.box, x, groundAt(x, z) + .15, z, .5, .3, .5, 0, 0, 0, C.wood);
    scene.add(im); return { im, list };
  })();
  const lampMesh = (() => {
    const pm = new Merge(); pm.add(CG.cyl8, 0, 1.2, 0, .08, 2.4, .08, 0, 0, 0, 0x3a3048); pm.add(CG.cyl8, 0, .05, 0, .25, .1, .25, 0, 0, 0, 0x3a3048); pm.add(CG.cone4, 0, 2.95, 0, .36, .22, .36, 0, Math.PI / 4, 0, 0x3a3048);
    const posts = new THREE.InstancedMesh(pm.geometry(), matV, lamps.length);
    const glass = new THREE.InstancedMesh(new THREE.CylinderGeometry(.2, .16, .42, 8), new THREE.MeshBasicMaterial({ color:0xffd27a }), lamps.length);
    const mt = new THREE.Matrix4();
    lamps.forEach(([x, z], i) => { const y = groundAt(x, z); mt.makeTranslation(x, y, z); posts.setMatrixAt(i, mt); mt.makeTranslation(x, y + 2.62, z); glass.setMatrixAt(i, mt); addC(x, z, .2, 0, 3);
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map:glowTex, color:0xffb45a, transparent:true, opacity:.75, depthWrite:false, blending:THREE.AdditiveBlending })); s.position.set(x, y + 2.62, z); s.scale.set(1.6, 1.6, 1); scene.add(s); });
    posts.castShadow = true; scene.add(posts); scene.add(glass); return posts;
  })();
  void lampMesh;
  const bannerMesh = (() => {
    const g = new THREE.PlaneGeometry(1, 1, 1, 6); g.translate(0, -.5, 0);
    const p = g.attributes.position; for(let i = 0; i < p.count; i++){ if(p.getY(i) < -.99) p.setY(i, -1 + Math.abs(p.getX(i)) * .35); }   // a swallow-tail bottom
    const im = new THREE.InstancedMesh(g, new THREE.MeshLambertMaterial({ side:THREE.DoubleSide }), banners.length);
    banners.forEach((b, i) => { im.setColorAt(i, new THREE.Color(b.col)); });
    const rod = new Merge(); banners.forEach(b => rod.add(CG.cyl8, b.x, b.y + .06, b.z, .06, b.w + .3, .06, 0, b.ry, Math.PI / 2, C.gold));
    scene.add(new THREE.Mesh(rod.geometry(), matV));
    scene.add(im); return im;
  })();
  const flagMesh = (() => {
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 0, -.9, 0, 1.5, -.45, 0], 3)); g.computeVertexNormals();
    const im = new THREE.InstancedMesh(g, new THREE.MeshLambertMaterial({ side:THREE.DoubleSide }), flags.length);
    flags.forEach((f, i) => im.setColorAt(i, new THREE.Color(f.col)));
    const pm = new Merge(); flags.forEach(f => pm.add(CG.cyl8, f.x, f.y - 1, f.z, .05, 2.2, .05, 0, 0, 0, 0x8a7a6a));
    scene.add(new THREE.Mesh(pm.geometry(), matV)); scene.add(im); return im;
  })();

  /* ---------- station signs (text drawn on canvas, no emoji in textures) ---------- */
  const FONT = '"Baloo Bhaijaan 2","Tajawal",system-ui,sans-serif';
  function sign(text, col, x, y, z, w = 4.2){
    const tex = canvasTex(512, 128, (c, W, H) => {
      c.fillStyle = 'rgba(0,0,0,0)'; c.clearRect(0, 0, W, H);
      const r = 46; c.beginPath(); c.moveTo(r, 8); c.arcTo(W - 8, 8, W - 8, H - 8, r); c.arcTo(W - 8, H - 8, 8, H - 8, r); c.arcTo(8, H - 8, 8, 8, r); c.arcTo(8, 8, W - 8, 8, r); c.closePath();
      c.fillStyle = '#fff7e8'; c.fill(); c.lineWidth = 12; c.strokeStyle = col; c.stroke();
      c.fillStyle = '#2a1f4a'; c.font = '800 58px ' + FONT; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(text, W / 2, H / 2 + 4, W - 60);
    });
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map:tex, transparent:true, depthWrite:false })); s.position.set(x, y, z); s.scale.set(w, w / 4, 1); scene.add(s); return s;
  }
  // start pads: glowing rings
  const padRing = new THREE.RingGeometry(1.05, 1.45, 40).rotateX(-Math.PI / 2);
  const padMats = {};
  function startPad(id, x, z, col){
    const mat = padMats[id] = new THREE.MeshBasicMaterial({ color:col, transparent:true, opacity:.9, depthWrite:false });
    const m = new THREE.Mesh(padRing, mat); m.position.set(x, groundAt(x, z) + .06, z); m.renderOrder = 2; scene.add(m);
    const d = new THREE.Mesh(new THREE.CircleGeometry(1.05, 32).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color:col, transparent:true, opacity:.28, depthWrite:false })); d.position.copy(m.position); d.renderOrder = 2; scene.add(d);
    return m;
  }

  /* ---------- the zipline ---------- */
  const zip = (() => {
    const a = new THREE.Vector3(SPOTS.zipTop.x, SPOTS.zipTop.y + 3.4, SPOTS.zipTop.z), b = new THREE.Vector3(SPOTS.zipEnd.x, 3.6, SPOTS.zipEnd.z);
    const at = t => new THREE.Vector3().lerpVectors(a, b, t).add(new THREE.Vector3(0, -Math.sin(t * Math.PI) * 2.2, 0));
    const pts = []; for(let i = 0; i <= 40; i++) pts.push(at(i / 40));
    const tube = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 60, .05, 5), new THREE.MeshLambertMaterial({ color:0x4a3a2a })); scene.add(tube);
    // posts at both ends
    const m1 = M(a.x, a.z), m2 = M(b.x, b.z);
    m1.add(G.box, a.x - .9, a.y - 1.7, a.z, .25, 3.6, .25, 0, 0, 0, C.woodD); m1.add(G.box, a.x + .9, a.y - 1.7, a.z, .25, 3.6, .25, 0, 0, 0, C.woodD); m1.add(G.box, a.x, a.y, a.z, 2.2, .25, .25, 0, 0, 0, C.woodD);
    m2.add(G.box, b.x - .9, b.y / 2, b.z, .3, b.y + .2, .3, 0, 0, 0, C.woodD); m2.add(G.box, b.x + .9, b.y / 2, b.z, .3, b.y + .2, .3, 0, 0, 0, C.woodD); m2.add(G.box, b.x, b.y, b.z, 2.2, .3, .3, 0, 0, 0, C.woodD);
    m2.add(CG.cyl, b.x, .15, b.z - 2.6, 2.2, .3, 2.2, 0, 0, 0, C.gold);
    addC(b.x - .9, b.z, .3, 0, b.y); addC(b.x + .9, b.z, .3, 0, b.y);
    return { a, b, at, len:a.distanceTo(b) };
  })();

  /* ---------- reward decorations (hidden until unlocked) ---------- */
  const deco = {};
  deco.flag = (() => { // a golden flag on top of the keep
    const g = new THREE.Group(); const pole = new THREE.Mesh(new THREE.CylinderGeometry(.08, .08, 5, 8), new THREE.MeshPhongMaterial({ color:0xffd24a, shininess:90, emissive:0x3a2600 })); pole.position.y = 2.5; g.add(pole);
    const fg = new THREE.PlaneGeometry(2.6, 1.6, 8, 1); fg.translate(1.3, 0, 0);
    const f = new THREE.Mesh(fg, new THREE.MeshPhongMaterial({ color:0xffc83a, shininess:80, emissive:0x4a3000, side:THREE.DoubleSide })); f.position.y = 4.1; g.add(f); g.userData.f = f;
    g.position.set(KEEP.x + 2.6, KEEP.top + .4, KEEP.z + 1.2); g.visible = false; scene.add(g); return g; })();
  deco.crown = (() => { // a giant golden crown over the south gate
    const m = new Merge(); m.add(new THREE.CylinderGeometry(1.6, 1.4, 1.2, 24, 1, true), 0, 0, 0, 1, 1, 1, 0, 0, 0, 0xffc83a);
    for(let k = 0; k < 6; k++){ const a = k / 6 * 6.283; m.add(CG.cone, Math.sin(a) * 1.5, 1, Math.cos(a) * 1.5, .32, 1, .32, 0, 0, 0, 0xffc83a); m.add(CG.sm, Math.sin(a) * 1.5, 1.6, Math.cos(a) * 1.5, .16, .16, .16, 0, 0, 0, 0xffe9a0); }
    const g = new THREE.Mesh(m.geometry(), new THREE.MeshPhongMaterial({ vertexColors:true, shininess:90, specular:0xffeeaa, emissive:0x332000, side:THREE.DoubleSide }));
    g.position.set(0, 11.6, WALL_R); g.visible = false; scene.add(g); return g; })();
  deco.balloons = (() => { // a big arch of balloons over the market (each balloon one colour)
    const g = new THREE.Group(), geo = new THREE.SphereGeometry(.55, 14, 10), cols = [0xff6f8e, 0xffd23f, 0xfff7e8];
    for(let k = 0; k <= 16; k++){ const t = k / 16, a = t * Math.PI, x = -6 + t * 12, y = Math.sin(a) * 6 + .3;
      const b = new THREE.Mesh(geo, new THREE.MeshPhongMaterial({ color:cols[k % 3], shininess:70 })); b.position.set(x, y, 0); g.add(b); }
    g.position.set(0, 0, 19.5); g.visible = false; scene.add(g); return g; })();
  deco.statue = null;           // made from the player's hero by the game (gold)
  deco.fireworks = { on:false };

  /* ---------- far islands and soft clouds ---------- */
  (() => {
    for(let k = 0; k < 7; k++){ const a = k / 7 * 6.283 + .3, r = 190 + rnd() * 60, x = Math.sin(a) * r, z = Math.cos(a) * r, s = 14 + rnd() * 16;
      const m = new Merge(); m.add(CG.sph, 0, -s * .3, 0, s * 1.4, s * .7, s, 0, 0, 0, 0x6e9a6a); m.add(CG.sph, s * .5, -s * .1, s * .2, s * .7, s * .6, s * .6, 0, 0, 0, 0x7aa874);
      const mesh = new THREE.Mesh(m.geometry(), new THREE.MeshLambertMaterial({ vertexColors:true })); mesh.position.set(x, WATER_Y, z); scene.add(mesh); }
  })();

  finish();
  // instanced matrices for banners and flags are set every frame by animate()
  const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _v = new THREE.Vector3(), _s = new THREE.Vector3(1, 1, 1);
  function animate(t, camPos){
    for(let i = 0; i < banners.length; i++){ const b = banners[i]; _m.compose(_v.set(b.x, b.y, b.z), _q.setFromEuler(_e.set(Math.sin(t * 1.7 + i) * .06, b.ry, 0)), _s.set(b.w, b.h, 1)); bannerMesh.setMatrixAt(i, _m); }
    bannerMesh.instanceMatrix.needsUpdate = true;
    for(let i = 0; i < flags.length; i++){ const f = flags[i]; _m.compose(_v.set(f.x, f.y, f.z), _q.setFromEuler(_e.set(0, t * .4 + i + Math.sin(t * 3 + i) * .25, 0)), _s.set(1, 1, 1)); flagMesh.setMatrixAt(i, _m); }
    flagMesh.instanceMatrix.needsUpdate = true;
    const bl = balloons.list; for(let i = 0; i < bl.length; i++){ const b = bl[i]; _m.compose(_v.set(b.x + Math.sin(t + b.ph) * .12, b.y + Math.sin(t * 1.3 + b.ph) * .1, b.z), _q.identity(), _s.set(1, 1, 1)); balloons.im.setMatrixAt(i, _m); }
    balloons.im.instanceMatrix.needsUpdate = true;
    windmill.rotation.z = t * .6;
    for(const b of bobbers){ b.position.y = WATER_Y + .1 + Math.sin(t * 1.6 + b.userData.bob) * .06; b.rotation.z = Math.sin(t * 1.2 + b.userData.bob) * .05; }
    if(deco.flag.visible){ const f = deco.flag.userData.f, p = f.geometry.attributes.position; for(let i = 0; i < p.count; i++){ const x = p.getX(i); p.setZ(i, Math.sin(x * 2 - t * 5) * .18 * x / 2.6); } p.needsUpdate = true; }
    if(deco.crown.visible) deco.crown.rotation.y = t * .3;
    // far small details: hide beyond 70 m (flowers beyond 90 m)
    for(const m of culled){ const c = m.userData.c, far = m.userData.far || 75; m.visible = m.userData.far ? true : Math.hypot(camPos.x - c[0], camPos.z - c[1]) < far; }
  }

  return { solids, spiral, checkpoints, fountains, pads, bounceStars, zip, deco, animate, sign, startPad, padMats, cakeTable, boatGeo, bobbers, culled };
}
