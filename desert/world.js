/* Bobo Desert («صحرا بوبو 🏜️») — the world.
   Low-poly dunes, 3 stepped sandstone pyramids (the big one has a ramp up to a wide terrace, the middle one a tunnel with a
   treasure room), a big friendly cat statue, old ruins, a palm oasis with a pond, cactuses, rocks, walking camels,
   rolling tumbleweeds, puffy clouds, coins, gold rings, 5 treasure chests, jump ramps and the 10 gates of «سباق الرمل».
   Static things are merged into a few vertex-coloured meshes (one per area, so far areas are culled); moving things are instanced.
   groundAt(x, z, y) = walkable height (dunes + structures), ceilAt(x, z) = tunnel roof (Infinity elsewhere),
   circles near (x, z) = round obstacles {x, z, r, top}. Units: metres; a kid is about 1.2 tall. */
export function makeDesert(THREE, K){
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  const lerp = (a, b, t) => a + (b - a) * t;
  const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  let seed = 20261118;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const rr = (a, b) => a + rnd() * (b - a);
  const _m = new THREE.Matrix4(), _m2 = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _s = new THREE.Vector3(), _v = new THREE.Vector3(), _c = new THREE.Color();
  const root = new THREE.Group();

  /* ---------- layout ---------- */
  const STEP_W = 1.4, STEP_H = 1.25;
  const PYR = [
    { id:'A', x:0, z:-60, half:30, terrace:6, extra:5, ramp:true, cap:true },
    { id:'B', x:-78, z:-18, half:20, tunnel:true },
    { id:'C', x:72, z:-38, half:15, cap:true }
  ];
  for(const P of PYR){ P.s = []; let s = P.half, k = 0; while(s > 1.6 && k < 30){ P.s.push(s); s -= STEP_W + (P.terrace === k ? P.extra : 0); k++; } P.top = P.s.length * STEP_H; }
  const PA = PYR[0], PB = PYR[1];
  const RAMP = { hw:3.5, z0:PA.s[PA.terrace], z1:52, h:(PA.terrace + 1) * STEP_H };    // local z of pyramid A (south side)
  const OASIS = { x:66, z:62, r:14.5, wy:-.25 };
  const CAMP = { x:0, z:42 };
  const STATUE = { x:40, z:-4 };
  const RUINS = { x:-58, z:60 };
  /* jump ramps: rise along heading a (0 = +z), len long, then a drop */
  const JR = [
    { x:25, z:21.2, a:Math.atan2(28, 8) }, { x:96, z:22, a:Math.PI }, { x:-28, z:-118, a:-Math.PI / 2 }, { x:-112, z:6, a:0 },
    { x:-20, z:70, a:Math.PI / 2 }, { x:110, z:-90, a:-Math.PI * .75 }, { x:30, z:95, a:-Math.PI / 2 }
  ].map(r => Object.assign({ len:7, w:5.2, h:2.1 }, r));
  /* race gates (start/finish = 0), in driving order */
  const CPP = [[12, 18], [40, 26], [95, 0], [108, -52], [74, -74], [5, -110], [-55, -82], [-116, -36], [-100, 30], [-42, 32]];
  const CP = CPP.map(([x, z], i) => {
    const p = CPP[(i + CPP.length - 1) % CPP.length], n = CPP[(i + 1) % CPP.length];
    return { i, x, z, a:Math.atan2(n[0] - p[0], n[1] - p[1]) };
  });
  CP[0].a = Math.atan2(CPP[1][0] - CPP[0][0], CPP[1][1] - CPP[0][1]);

  /* ---------- dunes ---------- */
  const FLAT = [];
  const flatB = (x, z, hx, hz, m) => FLAT.push({ b:1, x, z, hx, hz, m });
  const flatC = (x, z, r, m) => FLAT.push({ b:0, x, z, r, m });
  for(const P of PYR) flatB(P.x, P.z, P.half + 6, P.half + 6, 14);
  flatB(PA.x, PA.z + PA.half + 12, 9, 16, 10);
  flatC(OASIS.x, OASIS.z, 25, 12); flatC(CAMP.x, CAMP.z, 15, 12); flatC(STATUE.x, STATUE.z, 15, 10); flatC(RUINS.x, RUINS.z, 17, 10);
  for(const r of JR) flatC(r.x, r.z, 9, 8);
  for(const c of CP) flatC(c.x, c.z, 8, 8);
  function flatMask(x, z){
    let k = 1;
    for(const f of FLAT){
      const d = f.b ? Math.max(Math.abs(x - f.x) - f.hx, Math.abs(z - f.z) - f.hz) : Math.hypot(x - f.x, z - f.z) - f.r;
      if(d < f.m){ k *= sstep(0, f.m, d); if(k <= 0) return 0; }
    }
    return k;
  }
  function dune(x, z){
    let h = 1.45 * Math.sin(x * .045 + Math.sin(z * .031) * 1.2) * Math.cos(z * .037 + .6) + .7 * Math.sin((x * .62 + z * .78) * .075 + 1.3) + .35 * Math.sin((x * -.8 + z * .6) * .16 + 2.1);
    const c = 1 - Math.abs(Math.sin((x * .55 - z * .83) * .03 + .4));
    return h + 2.7 * c * c * c - .55;
  }
  function hRaw(x, z){
    let h = dune(x, z) * flatMask(x, z);
    const e = Math.max(Math.abs(x), Math.abs(z));
    if(e > 122) h += sstep(122, 190, e) * (12 + 5 * Math.sin(x * .05 + 1) * Math.cos(z * .045));
    const dp = Math.hypot(x - OASIS.x, z - OASIS.z);
    if(dp < 17) h -= 1.15 * sstep(17, 8.5, dp);
    return h;
  }
  const HALF = 170, CELL = 2.5, N = Math.round(HALF * 2 / CELL), NV = N + 1;
  const H = new Float32Array(NV * NV);
  for(let j = 0; j < NV; j++) for(let i = 0; i < NV; i++) H[j * NV + i] = hRaw(-HALF + i * CELL, -HALF + j * CELL);
  function terr(x, z){
    const fx = (x + HALF) / CELL, fz = (z + HALF) / CELL;
    if(fx < 0 || fz < 0 || fx >= N || fz >= N) return hRaw(x, z);
    const i = fx | 0, j = fz | 0, u = fx - i, v = fz - j, o = j * NV + i;
    const h00 = H[o], h10 = H[o + 1], h01 = H[o + NV], h11 = H[o + NV + 1];
    return u + v <= 1 ? h00 + (h10 - h00) * u + (h01 - h00) * v : h11 + (h01 - h11) * (1 - u) + (h10 - h11) * (1 - v);
  }

  /* ---------- solid structures (walkable height field) ---------- */
  const BOX = [];          // axis-aligned blocks: {x, z, hx, hz, y, h}
  function jumpH(x, z){
    let g = 0;
    for(const r of JR){
      const dx = x - r.x, dz = z - r.z; if(dx * dx + dz * dz > 30) continue;
      const sa = Math.sin(r.a), ca = Math.cos(r.a), u = dx * sa + dz * ca + r.len / 2, v = dx * ca - dz * sa;
      if(u >= 0 && u <= r.len && Math.abs(v) <= r.w / 2) g = Math.max(g, r.h * u / r.len);
    }
    return g;
  }
  const inTunnel = (lx, lz) => (Math.abs(lx) < 1.7 && lz > 2.9 && lz < PB.half + .5) || (Math.abs(lx) < 4 && lz > -5 && lz <= 3);
  function pyrH(P, lx, lz, y){
    const d = Math.max(Math.abs(lx), Math.abs(lz));
    let n = 0;
    if(d < P.half){ while(n < P.s.length && P.s[n] > d) n++; }
    let g = n * STEP_H;
    if(P.cap && n === P.s.length && d < 1.2) g += 1.6 * (1 - d / 1.2);
    if(P.ramp && Math.abs(lx) < RAMP.hw && lz > RAMP.z0 - .01 && lz < RAMP.z1) g = Math.max(g, RAMP.h * (RAMP.z1 - lz) / (RAMP.z1 - RAMP.z0));
    if(P.tunnel && y < 2.4 && inTunnel(lx, lz)) g = 0;
    return g;
  }
  function groundAt(x, z, y = 1e3){
    let g = terr(x, z) + jumpH(x, z);
    for(const P of PYR){
      const lx = x - P.x, lz = z - P.z;
      if(Math.abs(lx) < P.half && lz > -P.half && lz < (P.ramp ? RAMP.z1 : P.half)) g = Math.max(g, pyrH(P, lx, lz, y));
    }
    for(const b of BOX) if(Math.abs(x - b.x) < b.hx && Math.abs(z - b.z) < b.hz && (b.y + b.h) > g) g = b.y + b.h;
    return g;
  }
  /* the tunnel roof (2 steps high) */
  function ceilAt(x, z){
    const lx = x - PB.x, lz = z - PB.z;
    if(!inTunnel(lx, lz)) return Infinity;
    return Math.max(Math.abs(lx), Math.abs(lz)) < PB.s[2] ? 2 * STEP_H : Infinity;
  }
  const tunnelAt = (x, z) => { const lx = x - PB.x, lz = z - PB.z; return inTunnel(lx, lz) && Math.max(Math.abs(lx), Math.abs(lz)) < PB.s[2] + 1.5 ? { lx, lz, x:PB.x, z:PB.z, out:PB.z + PB.half } : null; };
  const waterAt = (x, z) => Math.hypot(x - OASIS.x, z - OASIS.z) < OASIS.r ? OASIS.wy : -Infinity;

  /* ---------- round obstacles (spatial hash) ---------- */
  const CIRC = [], HASH = new Map(), HC = 12;
  function addCirc(x, z, r, top){ const c = { x, z, r, top:top == null ? 99 : top }; CIRC.push(c); const i0 = Math.floor((x - r) / HC), i1 = Math.floor((x + r) / HC), j0 = Math.floor((z - r) / HC), j1 = Math.floor((z + r) / HC); for(let i = i0; i <= i1; i++) for(let j = j0; j <= j1; j++){ const k = i + ',' + j; if(!HASH.has(k)) HASH.set(k, []); HASH.get(k).push(c); } return c; }
  const EMPTY = [];
  const circlesNear = (x, z) => HASH.get(Math.floor(x / HC) + ',' + Math.floor(z / HC)) || EMPTY;
  /* keep scenery off the race line, the ramps and the coin trails */
  function segDist(px, pz, ax, az, bx, bz){ const dx = bx - ax, dz = bz - az, t = clamp(((px - ax) * dx + (pz - az) * dz) / (dx * dx + dz * dz), 0, 1); return Math.hypot(px - ax - dx * t, pz - az - dz * t); }
  function clearSpot(x, z, m){
    for(let i = 0; i < CP.length; i++){ const a = CP[i], b = CP[(i + 1) % CP.length]; if(segDist(x, z, a.x, a.z, b.x, b.z) < 9 + m) return false; }
    for(const P of PYR) if(Math.max(Math.abs(x - P.x), Math.abs(z - P.z)) < P.half + 4 + m) return false;
    if(Math.abs(x - PA.x) < 8 + m && z > PA.z && z < PA.z + RAMP.z1 + 6) return false;
    for(const r of JR) if(Math.hypot(x - r.x, z - r.z) < 14 + m) return false;
    if(Math.hypot(x - OASIS.x, z - OASIS.z) < OASIS.r + 3 + m) return false;
    if(Math.hypot(x - CAMP.x, z - CAMP.z) < 14 + m || Math.hypot(x - STATUE.x, z - STATUE.z) < 14 + m || Math.hypot(x - RUINS.x, z - RUINS.z) < 16 + m) return false;
    if(Math.max(Math.abs(x), Math.abs(z)) > 138) return false;
    for(const c of circlesNear(x, z)) if(Math.hypot(x - c.x, z - c.z) < c.r + 2 + m) return false;
    return true;
  }

  /* ---------- materials ---------- */
  const flatMat = new THREE.MeshLambertMaterial({ vertexColors:true, flatShading:true });
  const stoneTex = K.canvasTex(256, 256, (x, w) => {
    x.fillStyle = '#f2cf92'; x.fillRect(0, 0, w, w);
    const rows = 2, bh = w / rows, bw = w / 2;
    let s2 = 9;
    const r2 = () => (s2 = (s2 * 16807) % 2147483647) / 2147483647;
    for(let r = 0; r < rows; r++){
      for(let b = -1; b < 3; b++){
        const x0 = b * bw + (r % 2 ? bw / 2 : 0), y0 = r * bh;
        const tint = 228 + Math.floor(r2() * 22);
        x.fillStyle = `rgb(${tint},${Math.floor(tint * .82)},${Math.floor(tint * .55)})`;
        x.fillRect(x0 + 4, y0 + 4, bw - 8, bh - 8);
        x.fillStyle = 'rgba(255,248,225,.55)'; x.fillRect(x0 + 4, y0 + 4, bw - 8, 7);
        x.fillStyle = 'rgba(150,95,40,.22)'; x.fillRect(x0 + 4, y0 + bh - 14, bw - 8, 10);
        for(let k = 0; k < 26; k++){ x.fillStyle = r2() < .5 ? 'rgba(170,110,50,.25)' : 'rgba(255,240,210,.35)'; x.fillRect(x0 + 8 + r2() * (bw - 20), y0 + 14 + r2() * (bh - 32), 3, 3); }
      }
    }
    x.fillStyle = '#c4904f';
    for(let r = 0; r <= rows; r++) x.fillRect(0, r * bh - 3, w, 6);
    for(let r = 0; r < rows; r++) for(let b = 0; b < 3; b++){ const xx = b * bw + (r % 2 ? bw / 2 : 0); x.fillRect(xx - 3, r * bh, 6, bh); }
  });
  stoneTex.wrapS = stoneTex.wrapT = THREE.RepeatWrapping; stoneTex.anisotropy = 4;
  const stoneMat = new THREE.MeshLambertMaterial({ map:stoneTex, vertexColors:true });

  /* textured blocks with world-projected UVs (one stone row per pyramid step) */
  class Stone{
    constructor(){ this.p = []; this.n = []; this.u = []; this.c = []; }
    tri(a, b, c, col){
      const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
      let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx; const l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l;
      const ax = Math.abs(nx), ay = Math.abs(ny), az = Math.abs(nz);
      for(const p of [a, b, c]){
        this.p.push(p[0], p[1], p[2]); this.n.push(nx, ny, nz); this.c.push(col.r, col.g, col.b);
        if(ay >= ax && ay >= az) this.u.push(p[0] / 5.6, p[2] / 5.6);
        else if(ax >= az) this.u.push(p[2] / 5.6, p[1] / 2.5);
        else this.u.push(p[0] / 5.6, p[1] / 2.5);
      }
    }
    quad(a, b, c, d, col){ this.tri(a, b, c, col); this.tri(a, c, d, col); }
    box(x0, y0, z0, x1, y1, z1, color, bottom){
      const col = _c.set(color).clone();
      this.quad([x0, y1, z0], [x0, y1, z1], [x1, y1, z1], [x1, y1, z0], col);
      this.quad([x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [x1, y0, z1], col);
      this.quad([x0, y0, z1], [x0, y1, z1], [x0, y1, z0], [x0, y0, z0], col);
      this.quad([x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], col);
      this.quad([x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0], col);
      if(bottom) this.quad([x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], col);
      return this;
    }
    mesh(){
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(this.n, 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute(this.u, 2)); g.setAttribute('color', new THREE.Float32BufferAttribute(this.c, 3));
      g.computeBoundingSphere();
      const m = new THREE.Mesh(g, stoneMat); m.castShadow = true; m.receiveShadow = true; return m;
    }
  }
  /* flat-shaded merge with full transforms (Y-then-X rotation for leaves and limbs) */
  class Merge{
    constructor(){ this.p = []; this.n = []; this.c = []; }
    addM(geo, m, color){
      const g = geo.index ? geo.toNonIndexed() : geo.clone(); g.applyMatrix4(m);
      const pa = g.attributes.position.array, na = g.attributes.normal.array; _c.set(color);
      for(let i = 0; i < pa.length; i++){ this.p.push(pa[i]); this.n.push(na[i]); }
      for(let i = 0; i < pa.length / 3; i++) this.c.push(_c.r, _c.g, _c.b);
      g.dispose(); return this;
    }
    add(geo, x, y, z, sx = 1, sy = 1, sz = 1, rx = 0, ry = 0, rz = 0, color = 0xffffff, order = 'XYZ'){
      _e.set(rx, ry, rz, order); _m.compose(_v.set(x, y, z), _q.setFromEuler(_e), _s.set(sx, sy, sz)); return this.addM(geo, _m, color);
    }
    get empty(){ return !this.p.length; }
    geometry(){
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(this.n, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(this.c, 3));
      g.computeBoundingSphere(); return g;
    }
    mesh(mat = flatMat, shadow = true){ const m = new THREE.Mesh(this.geometry(), mat); m.castShadow = shadow; m.receiveShadow = true; return m; }
  }
  const GEO = {
    box:new THREE.BoxGeometry(1, 1, 1), boxZ:new THREE.BoxGeometry(1, 1, 1).translate(0, 0, .5), boxY:new THREE.BoxGeometry(1, 1, 1).translate(0, .5, 0),
    cyl:new THREE.CylinderGeometry(1, 1, 1, 10), cyl6:new THREE.CylinderGeometry(1, 1, 1, 6), cylT:new THREE.CylinderGeometry(.78, 1, 1, 7),
    cone4:new THREE.ConeGeometry(1, 1, 4), cone:new THREE.ConeGeometry(1, 1, 8), sph:new THREE.SphereGeometry(1, 10, 7), sphL:new THREE.SphereGeometry(1, 6, 4), ico:new THREE.IcosahedronGeometry(1, 0), ico1:new THREE.IcosahedronGeometry(1, 1),
    dode:new THREE.DodecahedronGeometry(1, 0), torus:new THREE.TorusGeometry(1, .16, 6, 18)
  };
  /* chunks: static pieces grouped by 80 m area, so the far ones can be culled */
  const chunks = new Map();
  const chunk = (x, z) => { const k = Math.floor(x / 80) + ',' + Math.floor(z / 80); if(!chunks.has(k)) chunks.set(k, new Merge()); return chunks.get(k); };

  /* ---------- terrain meshes ---------- */
  const SAND_D = new THREE.Color('#e3a258'), SAND_L = new THREE.Color('#ffd893'), SAND_M = new THREE.Color('#f5bd72'), GRASS = new THREE.Color('#8fcf5c'), GRASS_D = new THREE.Color('#5fae4a'), WET = new THREE.Color('#c99a62');
  function faceColor(cx, cz, cy, ny, out){
    out.copy(SAND_D).lerp(SAND_L, sstep(-1.4, 4.5, cy));
    out.lerp(SAND_M, .25 + .12 * Math.sin(cx * .9 + cz * .35));
    const sl = clamp((1 - ny) * 3, 0, 1); out.multiplyScalar(1 - sl * .12);
    const dp = Math.hypot(cx - OASIS.x, cz - OASIS.z);
    if(dp < 25){ if(dp < OASIS.r + 1.5) out.lerp(WET, sstep(OASIS.r + 1.5, OASIS.r - 1, dp)); else out.lerp((Math.sin(cx * 1.7) * Math.cos(cz * 1.3) > 0) ? GRASS : GRASS_D, sstep(25, 18, dp)); }
    const j = 1 + (rnd() - .5) * .05; out.multiplyScalar(j);
    return out;
  }
  function terrainMesh(x0, z0, cell, n, dropInner, inner){
    const p = new Float32Array(n * n * 18), nn = new Float32Array(n * n * 18), cc = new Float32Array(n * n * 18);
    const hAt = (x, z) => { let h = (dropInner && Math.abs(x) < inner && Math.abs(z) < inner) ? hRaw(x, z) - 2 : (dropInner ? hRaw(x, z) : terr(x, z)); return h; };
    let o = 0; const col = new THREE.Color();
    const put = (a, b, c) => {
      const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
      let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx; const l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l;
      faceColor((a[0] + b[0] + c[0]) / 3, (a[2] + b[2] + c[2]) / 3, (a[1] + b[1] + c[1]) / 3, ny, col);
      for(const q of [a, b, c]){ p[o] = q[0]; p[o + 1] = q[1]; p[o + 2] = q[2]; nn[o] = nx; nn[o + 1] = ny; nn[o + 2] = nz; cc[o] = col.r; cc[o + 1] = col.g; cc[o + 2] = col.b; o += 3; }
    };
    for(let j = 0; j < n; j++) for(let i = 0; i < n; i++){
      const xa = x0 + i * cell, xb = xa + cell, za = z0 + j * cell, zb = za + cell;
      const p00 = [xa, hAt(xa, za), za], p10 = [xb, hAt(xb, za), za], p01 = [xa, hAt(xa, zb), zb], p11 = [xb, hAt(xb, zb), zb];
      put(p00, p01, p10); put(p10, p01, p11);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(p, 3)); g.setAttribute('normal', new THREE.BufferAttribute(nn, 3)); g.setAttribute('color', new THREE.BufferAttribute(cc, 3));
    g.computeBoundingSphere();
    const m = new THREE.Mesh(g, flatMat); m.receiveShadow = true; return m;
  }
  // the play area in 4 quarters (culling), plus a coarse ring of big dunes out to the horizon
  for(const [qx, qz] of [[0, 0], [1, 0], [0, 1], [1, 1]]) root.add(terrainMesh(-HALF + qx * HALF, -HALF + qz * HALF, CELL, N / 2, false));
  const far = terrainMesh(-442, -442, 17, 52, true, HALF - 1); far.receiveShadow = false; root.add(far);

  /* ---------- pyramids ---------- */
  const PCOL = ['#f4cf8f', '#ecc282'];
  for(const P of PYR){
    const S = new Stone();
    P.s.forEach((s, k) => {
      const y0 = k * STEP_H, y1 = y0 + STEP_H, col = PCOL[k % 2], x = P.x, z = P.z;
      if(P.tunnel && k < 2){
        // cut the tunnel + the treasure room out of the two lowest steps
        S.box(x - s, y0, z - s, x - 4, y1, z + s, col); S.box(x + 4, y0, z - s, x + s, y1, z + s, col);
        S.box(x - 4, y0, z - s, x + 4, y1, z - 5, col);
        S.box(x - 4, y0, z + 3, x - 1.7, y1, z + s, col); S.box(x + 1.7, y0, z + 3, x + 4, y1, z + s, col);
      } else S.box(x - s, y0, z - s, x + s, y1, z + s, col);
    });
    if(P.tunnel){
      // ceiling of the tunnel seen from inside (bottom face of step 3)
      const c = _c.set('#d9ae70').clone(), y = 2 * STEP_H - .001;
      S.quad([P.x - 4, y, P.z - 5], [P.x + 4, y, P.z - 5], [P.x + 4, y, P.z + 3], [P.x - 4, y, P.z + 3], c);
      S.quad([P.x - 1.7, y, P.z + 3], [P.x + 1.7, y, P.z + 3], [P.x + 1.7, y, P.z + P.s[2]], [P.x - 1.7, y, P.z + P.s[2]], c);
      // a door frame around the entrance
      const zf = P.z + P.half;
      S.box(P.x - 2.6, 0, zf - .2, P.x - 1.7, 3.3, zf + .6, '#e2b46e'); S.box(P.x + 1.7, 0, zf - .2, P.x + 2.6, 3.3, zf + .6, '#e2b46e'); S.box(P.x - 2.6, 3.3, zf - .2, P.x + 2.6, 4.1, zf + .6, '#d6a45c');
      BOX.push({ x:P.x - 2.15, z:zf + .2, hx:.45, hz:.4, y:0, h:3.3 }, { x:P.x + 2.15, z:zf + .2, hx:.45, hz:.4, y:0, h:3.3 });
    }
    if(P.ramp){
      const c = _c.set('#f7d9a4').clone(), cs = _c.set('#e0b470').clone(), x0 = P.x - RAMP.hw, x1 = P.x + RAMP.hw, za = P.z + RAMP.z0, zb = P.z + RAMP.z1, h = RAMP.h;
      S.quad([x0, h, za], [x0, 0, zb], [x1, 0, zb], [x1, h, za], c);
      S.tri([x1, 0, za], [x1, h, za], [x1, 0, zb], cs); S.tri([x0, 0, zb], [x0, h, za], [x0, 0, za], cs);
      // low side rails
      for(const xr of [x0 - .35, x1 - .05]) for(let i = 0; i < 10; i++){ const t0 = i / 10, t1 = (i + 1) / 10, zz0 = lerp(zb, za, t0), zz1 = lerp(zb, za, t1); S.box(xr, lerp(0, h, t0) - .2, Math.min(zz0, zz1), xr + .4, lerp(0, h, t1) + .5, Math.max(zz0, zz1), '#e8bd78'); }
    }
    const m = S.mesh(); root.add(m); P.mesh = m;
    if(P.cap){
      const top = P.s.length * STEP_H, cap = new THREE.Mesh(GEO.cone4, new THREE.MeshLambertMaterial({ color:0xffcc33, emissive:0x8a5a00, emissiveIntensity:.5, flatShading:true }));
      cap.scale.set(1.75, 1.8, 1.75); cap.rotation.y = Math.PI / 4; cap.position.set(P.x, top + .9, P.z); cap.castShadow = true; root.add(cap);
    }
  }
  // obelisks at the foot of the ramp, the treasure room's lanterns
  const OB = new Stone();
  for(const sx of [-7, 7]){ const x = PA.x + sx, z = PA.z + RAMP.z1 + 1; OB.box(x - 1.1, 0, z - 1.1, x + 1.1, .8, z + 1.1, '#e4b46e'); OB.box(x - .7, .8, z - .7, x + .7, 8.5, z + .7, '#f2d29a'); BOX.push({ x, z, hx:1.1, hz:1.1, y:0, h:.8 }); addCirc(x, z, 1.1, 8.5); }
  root.add(OB.mesh());
  const goldMat = new THREE.MeshLambertMaterial({ color:0xffcc33, emissive:0x8a5a00, emissiveIntensity:.5, flatShading:true });
  for(const sx of [-7, 7]){ const t = new THREE.Mesh(GEO.cone4, goldMat); t.scale.set(.75, 1.2, .75); t.rotation.y = Math.PI / 4; t.position.set(PA.x + sx, 9.1, PA.z + RAMP.z1 + 1); root.add(t); }

  /* ---------- glow sprites (lanterns, sun) ---------- */
  const glowMat = new THREE.SpriteMaterial({ map:K.glowTex, color:0xffc070, transparent:true, depthWrite:false, blending:THREE.AdditiveBlending });
  const lanterns = new Merge();
  for(const [wx, lz] of [[-1.7, 15], [1.7, 15], [-1.7, 8], [1.7, 8], [-4, -1], [4, -1]]){
    const sx = Math.sign(wx), x = PB.x + wx, z = PB.z + lz;
    lanterns.add(GEO.box, x - sx * .06, 1.6, z, .12, .5, .3, 0, 0, 0, 0x7a4a20).add(GEO.box, x - sx * .24, 1.75, z, .26, .34, .26, 0, 0, 0, 0xffd27a);
    const sp = new THREE.Sprite(glowMat); sp.scale.set(1.8, 1.8, 1); sp.position.set(x - sx * .85, 1.8, z); root.add(sp);
  }
  root.add(lanterns.mesh(new THREE.MeshBasicMaterial({ vertexColors:true }), false));

  /* ---------- the big friendly cat statue ---------- */
  {
    const S = new Stone(), x = STATUE.x, z = STATUE.z;
    S.box(x - 7, 0, z - 9, x + 7, 1, z + 9, '#e6b874');
    S.box(x - 7.6, 0, z + 7.6, x - 6.2, 2.2, z + 9.4, '#f0cd92'); S.box(x + 6.2, 0, z + 7.6, x + 7.6, 2.2, z + 9.4, '#f0cd92');
    BOX.push({ x, z, hx:7, hz:9, y:0, h:1 });
    root.add(S.mesh());
    const M = new Merge(), st = 0xf0cd92, st2 = 0xe2b878, y = 1;
    M.add(GEO.sph, x, y + 4.6, z - 3, 5.2, 5.4, 5.6, 0, 0, 0, st);                // body
    M.add(GEO.sph, x, y + 6.4, z - .2, 3.9, 4.6, 3.4, 0, 0, 0, st);               // chest
    M.add(GEO.sph, x, y + 5.6, z + 1.4, 2.3, 3.2, 1.6, 0, 0, 0, 0xfbe3b8);        // pale belly
    for(const s of [-1, 1]){
      M.add(GEO.cyl, x + s * 1.9, y + 2.6, z + 2.1, .95, 4.6, .95, 0, 0, 0, st);   // front legs
      M.add(GEO.sph, x + s * 1.9, y + .55, z + 2.9, 1.25, .75, 1.6, 0, 0, 0, st2); // paws
      M.add(GEO.sph, x + s * 4.4, y + 1.6, z - 1.4, 2.2, 1.8, 3.4, 0, 0, 0, st2);  // back legs
    }
    const hy = y + 12.2, hz = z + .6;
    M.add(GEO.sph, x, hy, hz, 3.9, 3.4, 3.4, 0, 0, 0, st);                          // head
    for(const s of [-1, 1]){
      M.add(GEO.cone4, x + s * 2.4, hy + 3.3, hz - .2, 1.35, 2.4, .8, 0, 0, s * -.32, st);    // ears
      M.add(GEO.cone4, x + s * 2.35, hy + 3.15, hz + .25, .75, 1.6, .3, 0, 0, s * -.32, 0xf3a9a0);
      M.add(GEO.sph, x + s * 1.35, hy + .55, hz + 3.05, .62, .82, .3, 0, 0, 0, 0x3b2616);      // eyes
      M.add(GEO.sph, x + s * 1.15, hy + .85, hz + 3.3, .2, .24, .1, 0, 0, 0, 0xffffff);
      M.add(GEO.sph, x + s * 2.4, hy - .55, hz + 2.65, .55, .35, .2, 0, 0, 0, 0xf5a6a0);        // cheeks
      for(const k of [-1, 1]) M.add(GEO.box, x + s * 2.9, hy - .45 + k * .3, hz + 2.7, 1.8, .07, .07, 0, 0, s * k * .12, 0x8a6a4a); // whiskers
    }
    M.add(GEO.sph, x, hy - .7, hz + 2.85, 1.25, .85, .7, 0, 0, 0, 0xfbe3b8);       // muzzle
    M.add(GEO.sph, x, hy - .3, hz + 3.45, .36, .26, .2, 0, 0, 0, 0xe8838a);         // nose
    for(const s of [-1, 1]) M.add(GEO.box, x + s * .32, hy - 1.02, hz + 3.42, .62, .12, .12, 0, 0, s * .42, 0x5a3a22); // smile
    M.add(new THREE.TorusGeometry(2.55, .42, 6, 20), x, y + 9.3, z + .1, 1, 1, .85, Math.PI / 2 - .12, 0, 0, 0x3a86e0);   // collar
    M.add(GEO.sph, x, y + 8.6, z + 2.6, .8, .8, .5, 0, 0, 0, 0xffcc33);             // gold coin pendant
    const tail = [[3.9, .9, -6.2], [5.3, 1, -4.4], [6.2, 1, -2.2], [6.2, 1.1, .1], [5.4, 1.4, 1.9]];
    tail.forEach(([tx, ty, tz], i) => M.add(GEO.sph, x + tx, y + ty, z + tz, 1 - i * .05, .9 - i * .05, 1 - i * .05, 0, 0, 0, i === tail.length - 1 ? 0xfbe3b8 : st2));
    root.add(M.mesh());
    addCirc(x, z - 3, 5.4, 12); addCirc(x, z + 1.6, 3.2, 9); addCirc(x - 4.3, z - 1.4, 2.2, 4); addCirc(x + 4.6, z - 1.2, 2.4, 4); addCirc(x + 5.6, z - .5, 1.6, 3);
  }

  /* ---------- ruins: a broken courtyard, columns, a fallen pillar ---------- */
  {
    const S = new Stone(), cx = RUINS.x, cz = RUINS.z, M = new Merge();
    const wall = (x0, z0, x1, z1, hgt) => { const x = (x0 + x1) / 2, z = (z0 + z1) / 2, hx = Math.abs(x1 - x0) / 2, hz = Math.abs(z1 - z0) / 2; S.box(x - hx, 0, z - hz, x + hx, hgt, z + hz, rnd() < .5 ? '#ebc485' : '#e0b676'); BOX.push({ x, z, hx, hz, y:0, h:hgt }); };
    const run = (x0, z0, x1, z1, gaps) => {
      const L = Math.hypot(x1 - x0, z1 - z0), n = Math.round(L / 2.4);
      for(let i = 0; i < n; i++){ if(gaps.includes(i)) continue; const t0 = i / n, t1 = (i + 1) / n, hgt = rnd() < .25 ? rr(1, 1.6) : rr(2.4, 3.8);
        const xa = lerp(x0, x1, t0), za = lerp(z0, z1, t0), xb = lerp(x0, x1, t1), zb = lerp(z0, z1, t1);
        if(Math.abs(xb - xa) > Math.abs(zb - za)) wall(xa, za - .6, xb, za + .6, hgt); else wall(xa - .6, za, xa + .6, zb, hgt); }
    };
    run(cx - 10, cz - 10, cx + 10, cz - 10, [3, 4]);    // north (gap)
    run(cx - 10, cz + 10, cx + 10, cz + 10, [3, 4, 5]); // south (gap for the buggy)
    run(cx - 10, cz - 10, cx - 10, cz + 10, [6]);
    run(cx + 10, cz - 10, cx + 10, cz + 10, [2]);
    // columns around and inside
    const col = (x, z, hgt) => { M.add(GEO.cyl, x, .3, z, 1.15, .6, 1.15, 0, 0, 0, 0xe0b676); M.add(GEO.cylT, x, .6 + hgt / 2, z, .78, hgt, .78, 0, 0, 0, 0xf1d097);
      if(hgt > 4) M.add(GEO.box, x, .6 + hgt + .3, z, 2, .6, 2, 0, 0, 0, 0xe6bd7e); addCirc(x, z, 1.05, hgt + .6); };
    for(let i = 0; i < 8; i++){ const a = i / 8 * Math.PI * 2 + .2; col(cx + Math.cos(a) * 15.5, cz + Math.sin(a) * 15.5, i % 3 === 1 ? rr(1.5, 3) : rr(5.5, 6.5)); }
    col(cx - 5, cz - 5, 6); col(cx + 5, cz - 5, 2.2); col(cx - 5, cz + 4, 3.4);
    // fallen pillar you can hop on
    for(let i = 0; i < 3; i++){ M.add(GEO.cylT, cx + 3 + i * 2.1, .75, cz + 3.5, .75, 2, .75, 0, 0, Math.PI / 2, 0xf1d097); }
    BOX.push({ x:cx + 5.1, z:cz + 3.5, hx:3.1, hz:.75, y:0, h:1.4 });
    // a broken arch near the oasis road
    S.box(-30 - .8, 0, 58 - .8, -30 + .8, 6, 58 + .8, '#ebc485'); S.box(-22 - .8, 0, 58 - .8, -22 + .8, 6, 58 + .8, '#ebc485'); S.box(-31, 6, 57.2, -21, 7.3, 58.8, '#e0b676');
    BOX.push({ x:-30, z:58, hx:.8, hz:.8, y:0, h:6 }, { x:-22, z:58, hx:.8, hz:.8, y:0, h:6 });
    root.add(S.mesh()); root.add(M.mesh());
  }

  /* ---------- camp: tent, flag, crates ---------- */
  {
    const M = new Merge(), x = CAMP.x - 8, z = CAMP.z + 4;
    for(let i = 0; i < 6; i++){ const c = i % 2 ? 0xffffff : 0xe8454f, zz = z - 2.5 + i * 1 + .5;
      M.add(GEO.box, x - 1.25, 1.5, zz, .12, 3.6, 1.0, 0, 0, .72, c); M.add(GEO.box, x + 1.25, 1.5, zz, .12, 3.6, 1.0, 0, 0, -.72, c); }
    M.add(GEO.cyl6, x, 1.6, z - 3.1, .07, 3.2, .07, 0, 0, 0, 0x8a5a2b);
    M.add(GEO.cyl6, x + 3.2, 3, z - 2.6, .08, 6, .08, 0, 0, 0, 0x8a5a2b); M.add(GEO.box, x + 3.95, 5.4, z - 2.6, 1.4, .9, .06, 0, 0, 0, 0x35c76f);
    addCirc(x, z, 2.8, 3.2);
    const crates = [[x + 6, z + 1, 0], [x + 7.1, z + 1.2, 0], [x + 6.5, z + 1.1, 1]];
    for(const [cx2, cz2, lv] of crates){ M.add(GEO.box, cx2, .5 + lv, cz2, 1, 1, 1, 0, lv * .3, 0, 0xc98a4a); M.add(GEO.box, cx2, .5 + lv, cz2, 1.04, .12, 1.04, 0, lv * .3, 0, 0x8a5a2b); }
    BOX.push({ x:x + 6.55, z:z + 1.1, hx:1.05, hz:.55, y:0, h:1 });
    root.add(M.mesh());
  }

  /* ---------- palms (oasis + camp), bushes, lily pads ---------- */
  function palm(M, x, z, hgt, lean, a){
    const base = terr(x, z), segs = 7, dx = Math.sin(a), dz = Math.cos(a);
    const pt = t => [x + dx * t * t * lean, base + t * hgt, z + dz * t * t * lean];
    for(let i = 0; i < segs; i++){
      const p0 = pt(i / segs), p1 = pt((i + 1) / segs), mx = (p0[0] + p1[0]) / 2, my = (p0[1] + p1[1]) / 2, mz = (p0[2] + p1[2]) / 2;
      const hor = Math.hypot(p1[0] - p0[0], p1[2] - p0[2]), ver = p1[1] - p0[1], tilt = Math.atan2(hor, ver), r = .36 - i * .025;
      M.add(GEO.cyl6, mx, my, mz, r, Math.hypot(hor, ver) * 1.06, r, tilt * dz, 0, -tilt * dx, i % 2 ? 0x9b6a3c : 0xb37d48);
    }
    const [tx, ty, tz] = pt(1);
    for(let k = 0; k < 8; k++){
      const yaw = k / 8 * Math.PI * 2 + rnd() * .3, len = rr(2.2, 2.8), col = k % 2 ? 0x3fae4a : 0x58c45a;
      _m.makeRotationY(yaw).multiply(_m2.makeRotationX(.25)); _m.setPosition(tx, ty, tz); _m.multiply(_m2.makeScale(.75, .1, len * .55));
      M.addM(GEO.boxZ, _m, col);
      const ex = tx + Math.sin(yaw) * Math.cos(.25) * len * .55, ey = ty - Math.sin(.25) * len * .55, ez = tz + Math.cos(yaw) * Math.cos(.25) * len * .55;
      _m.makeRotationY(yaw).multiply(_m2.makeRotationX(.85)); _m.setPosition(ex, ey, ez); _m.multiply(_m2.makeScale(.55, .09, len * .5));
      M.addM(GEO.boxZ, _m, col);
    }
    for(let k = 0; k < 3; k++){ const a2 = k * 2.1; M.add(GEO.sphL, tx + Math.sin(a2) * .3, ty - .25, tz + Math.cos(a2) * .3, .2, .22, .2, 0, 0, 0, 0x7a4a20); }
    addCirc(x, z, .5, 99);
  }
  for(let i = 0; i < 13; i++){
    const a = i / 13 * Math.PI * 2 + rr(-.15, .15), r = rr(16.5, 20.5), x = OASIS.x + Math.cos(a) * r, z = OASIS.z + Math.sin(a) * r;
    palm(chunk(x, z), x, z, rr(6.5, 9), rr(1.2, 2.6), Math.atan2(OASIS.x - x, OASIS.z - z) + rr(-.5, .5));
  }
  palm(chunk(CAMP.x + 9, CAMP.z + 6), CAMP.x + 9, CAMP.z + 6, 7.5, 2, -1); palm(chunk(CAMP.x - 14, CAMP.z - 2), CAMP.x - 14, CAMP.z - 2, 6.5, 1.6, 1.2);
  palm(chunk(-56, 74), -56, 74, 7, 2, 2.5); palm(chunk(-71, 46), -71, 46, 6, 1.4, .7);
  for(let i = 0; i < 18; i++){ const a = rr(0, Math.PI * 2), r = rr(15, 23), x = OASIS.x + Math.cos(a) * r, z = OASIS.z + Math.sin(a) * r, s = rr(.6, 1.2);
    chunk(x, z).add(GEO.ico1, x, terr(x, z) + s * .5, z, s, s * .75, s, 0, rr(0, 3), 0, rnd() < .5 ? 0x4fb34f : 0x6ccf5a); }
  {
    const M = chunk(OASIS.x, OASIS.z);
    for(let i = 0; i < 9; i++){ const a = rr(0, 6.28), r = rr(3, 11), x = OASIS.x + Math.cos(a) * r, z = OASIS.z + Math.sin(a) * r; M.add(GEO.cyl, x, OASIS.wy + .03, z, rr(.5, .8), .04, rr(.5, .8), 0, 0, 0, 0x4fbf5a);
      if(i % 3 === 0) M.add(GEO.sphL, x + .2, OASIS.wy + .15, z, .16, .12, .16, 0, 0, 0, 0xff8fbf); }
    for(let i = 0; i < 14; i++){ const a = rr(0, 6.28), r = rr(OASIS.r - 1.2, OASIS.r + .5), x = OASIS.x + Math.cos(a) * r, z = OASIS.z + Math.sin(a) * r;
      for(let k = 0; k < 3; k++) M.add(GEO.cyl6, x + rr(-.3, .3), OASIS.wy + .7, z + rr(-.3, .3), .05, rr(1.2, 1.8), .05, rr(-.15, .15), 0, rr(-.15, .15), 0x6a9a3a); }
  }
  /* water */
  const waterTex = K.canvasTex(256, 256, (x, w) => {
    const g = x.createRadialGradient(w / 2, w / 2, 10, w / 2, w / 2, w / 2); g.addColorStop(0, '#4fd6ef'); g.addColorStop(.7, '#3fc2e6'); g.addColorStop(1, '#8fe6f2');
    x.fillStyle = g; x.fillRect(0, 0, w, w);
    x.strokeStyle = 'rgba(255,255,255,.35)'; x.lineWidth = 3; for(let i = 0; i < 6; i++){ x.beginPath(); x.arc(w / 2, w / 2, 30 + i * 17, i, i + 1.6); x.stroke(); }
  });
  const water = new THREE.Mesh(new THREE.CircleGeometry(OASIS.r + 1.2, 40).rotateX(-Math.PI / 2), new THREE.MeshLambertMaterial({ map:waterTex, transparent:true, opacity:.88, emissive:0x1a6a80, emissiveIntensity:.35 }));
  water.position.set(OASIS.x, OASIS.wy, OASIS.z); water.receiveShadow = true; root.add(water);

  /* ---------- cactuses and rocks (scattered, off the race line) ---------- */
  const CACT = [];
  function cactus(M, x, z, s){
    const b = terr(x, z), g = rnd() < .5 ? 0x4fa84a : 0x5cba52, h = 3 * s;
    M.add(GEO.cyl6, x, b + h / 2, z, .45 * s, h, .45 * s, 0, rr(0, 1), 0, g); M.add(GEO.sphL, x, b + h, z, .45 * s, .4 * s, .45 * s, 0, 0, 0, g);
    const arms = rnd() < .3 ? 1 : 2;
    for(let k = 0; k < arms; k++){ const sd = k ? -1 : 1, ay = b + h * rr(.4, .6), ax = x + sd * .75 * s, ah = rr(.8, 1.3) * s;
      M.add(GEO.cyl6, x + sd * .45 * s, ay, z, .22 * s, .7 * s, .22 * s, 0, 0, Math.PI / 2, g); M.add(GEO.cyl6, ax, ay + ah / 2, z, .25 * s, ah, .25 * s, 0, 0, 0, g); M.add(GEO.sphL, ax, ay + ah, z, .25 * s, .22 * s, .25 * s, 0, 0, 0, g); }
    if(rnd() < .55) M.add(GEO.sphL, x, b + h + .35 * s, z, .2 * s, .14 * s, .2 * s, 0, 0, 0, rnd() < .5 ? 0xff7fb0 : 0xffd23f);
    addCirc(x, z, .6 * s + .2, b + h); CACT.push([x, z]);
  }
  for(let n = 0, tries = 0; n < 34 && tries < 900; tries++){ const x = rr(-135, 135), z = rr(-135, 135); if(!clearSpot(x, z, 0)) continue; cactus(chunk(x, z), x, z, rr(.8, 1.3)); n++; }
  // a cactus valley in the far north-west (the 5th chest hides there)
  for(let n = 0, tries = 0; n < 9 && tries < 200; tries++){ const x = -112 + rr(-12, 12), z = -108 + rr(-12, 12); if(Math.hypot(x + 112, z + 108) < 4 || !clearSpot(x, z, -6)) continue; cactus(chunk(x, z), x, z, rr(.9, 1.4)); n++; }
  const ROCKC = [0xd29662, 0xc3854f, 0xe0a872, 0xb8774a];
  for(let n = 0, tries = 0; n < 44 && tries < 900; tries++){
    const x = rr(-138, 138), z = rr(-138, 138); if(!clearSpot(x, z, 0)) continue;
    const s = rr(.7, 2.4), M = chunk(x, z), b = terr(x, z);
    M.add(GEO.dode, x, b + s * .35, z, s, s * .75, s * .9, rr(0, 3), rr(0, 3), 0, ROCKC[n % 4]);
    if(rnd() < .5) M.add(GEO.dode, x + s * .9, b + s * .2, z + s * .4, s * .5, s * .4, s * .5, rr(0, 3), 0, 0, ROCKC[(n + 1) % 4]);
    addCirc(x, z, s * .9, b + s * .9); n++;
  }
  // a ring of rocks outside the play edge
  for(let i = 0; i < 40; i++){ const a = i / 40 * Math.PI * 2, r = rr(150, 175), x = Math.cos(a) * r, z = Math.sin(a) * r, s = rr(2, 5); chunk(x, z).add(GEO.dode, x, terr(x, z) + s * .3, z, s, s * .7, s, rr(0, 3), rr(0, 3), 0, ROCKC[i % 4]); }

  /* ---------- jump ramps (wood planks, red-white edges) ---------- */
  for(const r of JR){
    const M = chunk(r.x, r.z), b = terr(r.x, r.z), sa = Math.sin(r.a), ca = Math.cos(r.a), ang = Math.atan2(r.h, r.len), sl = Math.hypot(r.h, r.len);
    for(let k = 0; k < 6; k++){
      const t = (k + .5) / 6, u = -r.len / 2 + t * r.len, y = b + r.h * t;
      _m.makeRotationY(r.a).multiply(_m2.makeRotationX(-ang)); _m.setPosition(r.x + sa * u, y - .12, r.z + ca * u); _m.multiply(_m2.makeScale(r.w, .24, sl / 6 * 1.02));
      M.addM(GEO.box, _m, k % 2 ? 0xd9964f : 0xc4803e);
    }
    for(const sd of [-1, 1]) for(let k = 0; k < 4; k++){
      const t = (k + .5) / 4, u = -r.len / 2 + t * r.len, vx = ca * sd * (r.w / 2 + .1), vz = -sa * sd * (r.w / 2 + .1);
      _m.makeRotationY(r.a).multiply(_m2.makeRotationX(-ang)); _m.setPosition(r.x + sa * u + vx, b + r.h * t, r.z + ca * u + vz); _m.multiply(_m2.makeScale(.22, .3, sl / 4 * 1.02));
      M.addM(GEO.box, _m, k % 2 ? 0xffffff : 0xe8454f);
    }
    // the support under the high end
    const ux = r.len / 2 - .2; M.add(GEO.box, r.x + sa * ux, b + r.h / 2, r.z + ca * ux, r.w * .9, r.h, .3, 0, r.a, 0, 0x8a5a2b);
    M.add(GEO.box, r.x, b + r.h * .25, r.z, r.w * .85, r.h * .5, .25, 0, r.a, 0, 0x8a5a2b);
  }

  /* ---------- race gates ---------- */
  const GCOL = [0xff5a6e, 0xffb13d, 0xffe14d, 0x5ed67a, 0x4fc3ff, 0x9b7bff, 0xff7ac2, 0x3fd6c6, 0xff8a3d, 0x6c9cff];
  {
    for(const c of CP){
      const M = chunk(c.x, c.z), sa = Math.sin(c.a), ca = Math.cos(c.a), px = ca * 7.5, pz = -sa * 7.5, col = c.i === 0 ? 0xffffff : GCOL[c.i];
      for(const sd of [-1, 1]){ const x = c.x + px * sd, z = c.z + pz * sd, b = terr(x, z);
        M.add(GEO.cyl6, x, b + 3.1, z, .32, 6.2, .32, 0, 0, 0, col); M.add(GEO.cyl, x, b + .2, z, .7, .4, .7, 0, 0, 0, 0x8a5a2b); M.add(GEO.sph, x, b + 6.4, z, .5, .5, .5, 0, 0, 0, 0xffcc33);
        addCirc(x, z, .45, b + 6.4); }
      const b = terr(c.x, c.z);
      if(c.i === 0){ for(let k = 0; k < 10; k++){ const t = -6.75 + k * 1.5; for(const row of [0, 1]) M.add(GEO.box, c.x + ca * t, b + 5.5 + row * .7, c.z - sa * t, 1.5, .7, .25, 0, c.a, 0, (k + row) % 2 ? 0x222222 : 0xffffff); }
        for(let k = 0; k < 14; k++){ const t = -6.5 + k * 1; for(const row of [0, 1]) M.add(GEO.box, c.x + ca * t + sa * (row - .5), terr(c.x + ca * t, c.z - sa * t) + .03, c.z - sa * t + ca * (row - .5), 1, .06, 1, 0, c.a, 0, (k + row) % 2 ? 0x222222 : 0xffffff); } }
      else M.add(GEO.box, c.x, b + 5.7, c.z, 15, .9, .3, 0, c.a, 0, col);
    }
  }
  /* signs (canvas text) */
  const signs = [];
  function sign(x, z, a, draw){
    const tex = K.canvasTex(512, 256, (cx, w, h) => draw(cx, w, h)), b = terr(x, z);
    const M = chunk(x, z);
    for(const sd of [-1, 1]) M.add(GEO.cyl6, x + Math.cos(a) * sd * 1.8, b + 1.6, z - Math.sin(a) * sd * 1.8, .12, 3.2, .12, 0, 0, 0, 0x8a5a2b);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 2.2), new THREE.MeshLambertMaterial({ map:tex, side:THREE.DoubleSide }));
    m.position.set(x, b + 3, z); m.rotation.y = a; m.castShadow = true; root.add(m); signs.push({ tex, draw }); return m;
  }
  const signFace = (cx, w, h, emoji, text) => {
    cx.fillStyle = '#c98a4a'; cx.fillRect(0, 0, w, h); cx.fillStyle = '#e0a868'; cx.fillRect(12, 12, w - 24, h - 24);
    cx.fillStyle = '#8a5a2b'; for(let y = 70; y < h; y += 62) cx.fillRect(12, y, w - 24, 4);
    cx.textAlign = 'center'; cx.textBaseline = 'middle'; cx.font = '84px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif'; cx.fillText(emoji, w / 2, 80);
    cx.fillStyle = '#4a2c10'; cx.font = '800 58px "Baloo Bhaijaan 2","Tajawal",system-ui,sans-serif'; cx.fillText(text, w / 2, 182, w - 40);
  };
  const LL = window.L || (a => a);
  sign(CP[0].x - 11, CP[0].z + 4, 0, (cx, w, h) => signFace(cx, w, h, '🏁', LL('سباق الرمل', 'Sand Race', 'Kum Yarışı')));
  sign(CAMP.x + 2, CAMP.z + 9, 0, (cx, w, h) => signFace(cx, w, h, '🏜️', LL('صحرا بوبو', 'Bobo Desert', 'Bobo Çölü')));
  sign(PB.x + 5, PB.z + PB.half + 5, 0, (cx, w, h) => signFace(cx, w, h, '🔦', LL('النفق السرّي', 'Secret tunnel', 'Gizli tünel')));
  const redrawSigns = () => signs.forEach(s => { const c = s.tex.image, x = c.getContext('2d'); x.clearRect(0, 0, c.width, c.height); s.draw(x, c.width, c.height); s.tex.needsUpdate = true; });
  try{ if(document.fonts && document.fonts.ready) document.fonts.ready.then(redrawSigns); }catch(e){}

  for(const M of chunks.values()) root.add(M.mesh());

  /* ---------- sky dome, sun glow, clouds ---------- */
  {
    const g = new THREE.SphereGeometry(620, 24, 14), pa = g.attributes.position, cols = [];
    const top = new THREE.Color('#2f8ff0'), mid = new THREE.Color('#79c4ff'), hor = new THREE.Color('#ffeccc');
    for(let i = 0; i < pa.count; i++){ const y = pa.getY(i) / 620; _c.copy(hor).lerp(mid, sstep(-.01, .16, y)).lerp(top, sstep(.16, .65, y)); cols.push(_c.r, _c.g, _c.b); }
    g.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
    const sky = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors:true, side:THREE.BackSide, fog:false, depthWrite:false }));
    sky.renderOrder = -10; sky.frustumCulled = false; root.add(sky); root.userData.sky = sky;
    const sunG = new THREE.Sprite(new THREE.SpriteMaterial({ map:K.glowTex, color:0xfff0b0, transparent:true, depthWrite:false, fog:false, blending:THREE.AdditiveBlending }));
    sunG.scale.set(170, 170, 1); sunG.position.set(250, 330, 260); root.add(sunG); root.userData.sunG = sunG;
  }
  const cloudGeo = (() => { const M = new Merge(); const puffs = [[0, 0, 0, 5], [4.5, -.6, .5, 3.8], [-4.4, -.8, -.3, 3.6], [1.8, 2.2, -.4, 3.4], [-2, 1.6, .8, 3], [7.5, -1.4, 0, 2.4], [-7.2, -1.5, .2, 2.2]];
    for(const [x, y, z, r] of puffs) M.add(GEO.ico1, x, y, z, r, r * .85, r, 0, 0, 0, 0xffffff); M.add(GEO.cyl, 0, -2.4, 0, 8, .8, 4, 0, 0, 0, 0xe2ecfb); return M.geometry(); })();
  const CLOUD_N = 18, clouds = new THREE.InstancedMesh(cloudGeo, new THREE.MeshLambertMaterial({ vertexColors:true, emissive:0xffffff, emissiveIntensity:.42, flatShading:true, fog:false }), CLOUD_N);
  const CL = [];
  for(let i = 0; i < CLOUD_N; i++){ const a = rr(0, Math.PI * 2), r = rr(90, 300); CL.push({ x:Math.cos(a) * r, z:Math.sin(a) * r, y:rr(55, 95), s:rr(1.2, 2.6), ry:rr(0, 3), v:rr(1.2, 2.6) }); }
  clouds.frustumCulled = false; root.add(clouds);

  /* ---------- coins, rings, chests, beams ---------- */
  const coinGeo = new THREE.CylinderGeometry(.48, .48, .12, 16).rotateX(Math.PI / 2);
  const coinMat = new THREE.MeshLambertMaterial({ color:0xffcf3a, emissive:0xb07800, emissiveIntensity:.55 });
  const COINS = [];
  const addCoin = (x, z, dy = 1.1, y) => COINS.push({ x, z, y:(y != null ? y : groundAt(x, z)) + dy, got:false, back:0 });
  const trail = (x0, z0, x1, z1, n, dy) => { for(let i = 0; i < n; i++){ const t = n === 1 ? .5 : i / (n - 1); addCoin(lerp(x0, x1, t), lerp(z0, z1, t), dy); } };
  // along the race (between some gates)
  for(const [a, b] of [[0, 1], [2, 3], [4, 5], [6, 7], [8, 9]]){ const p = CP[a], q = CP[b]; trail(lerp(p.x, q.x, .25), lerp(p.z, q.z, .25), lerp(p.x, q.x, .75), lerp(p.z, q.z, .75), 7); }
  // up the ramp, across the terrace
  for(let i = 0; i < 8; i++){ const lz = lerp(RAMP.z1 - 3, RAMP.z0 + 1, i / 7); addCoin(PA.x, PA.z + lz, 1.1); }
  for(let i = 0; i < 10; i++){ const a = i / 10 * Math.PI * 2, d = RAMP.z0 - 2.5, lx = Math.max(-1, Math.min(1, Math.cos(a) * 1.5)) * d, lz = Math.max(-1, Math.min(1, Math.sin(a) * 1.5)) * d; addCoin(PA.x + lx, PA.z + lz, 1.1); }
  // around the oasis, into the tunnel, around the statue and in the ruins
  for(let i = 0; i < 12; i++){ const a = i / 12 * Math.PI * 2; addCoin(OASIS.x + Math.cos(a) * 23, OASIS.z + Math.sin(a) * 23); }
  for(let i = 0; i < 6; i++) addCoin(PB.x, PB.z + PB.half + 3 - i * 3, 1, 0);
  for(let i = 0; i < 8; i++){ const a = i / 8 * Math.PI * 2; addCoin(STATUE.x + Math.cos(a) * 12, STATUE.z + Math.sin(a) * 12); }
  for(let i = 0; i < 6; i++) addCoin(RUINS.x - 6 + i * 2.4, RUINS.z - 2);
  trail(CAMP.x - 4, CAMP.z - 10, CAMP.x + 14, CAMP.z - 10, 6);
  trail(30, 75, 50, 80, 5); trail(-90, 70, -110, 50, 5); trail(110, -10, 115, -30, 4); trail(-30, -60, -40, -50, 4);
  // on top of the pyramids (a climb!)
  addCoin(PA.x, PA.z, 1.6 + .2, PA.top); addCoin(PYR[2].x, PYR[2].z, 1.8, PYR[2].top);
  const COIN_N = COINS.length, coinMesh = new THREE.InstancedMesh(coinGeo, coinMat, COIN_N); coinMesh.castShadow = true; coinMesh.frustumCulled = false; root.add(coinMesh);

  const RINGS = [];
  for(const r of JR){ const d = r.len / 2 + 5.5; RINGS.push({ x:r.x + Math.sin(r.a) * d, z:r.z + Math.cos(r.a) * d, y:terr(r.x, r.z) + r.h + 2.4, a:r.a, got:false, back:0 }); }
  for(const i of [1, 3, 5, 9]){ const p = CP[i], q = CP[(i + 1) % CP.length], x = lerp(p.x, q.x, .6), z = lerp(p.z, q.z, .6); RINGS.push({ x, z, y:terr(x, z) + 2.7, a:Math.atan2(q.x - p.x, q.z - p.z), got:false, back:0 }); }
  for(const [x, z, a] of [[40, 60, 1.2], [-85, 88, .4], [100, 62, 2.2], [-42, -48, .4]]) RINGS.push({ x, z, y:terr(x, z) + 2.7, a, got:false, back:0 });
  const ringMesh = new THREE.InstancedMesh(new THREE.TorusGeometry(2.5, .3, 8, 30), new THREE.MeshLambertMaterial({ color:0xffd23f, emissive:0xc08a00, emissiveIntensity:.6 }), RINGS.length);
  ringMesh.frustumCulled = false; ringMesh.castShadow = true; root.add(ringMesh);

  const CHESTS = [
    { id:'tunnel', x:PB.x, z:PB.z - 2.5, a:0 },
    { id:'terrace', x:PA.x + 4, z:PA.z - (RAMP.z0 - 2.6), a:0 },
    { id:'oasis', x:OASIS.x + 13, z:OASIS.z + 21, a:Math.PI },
    { id:'ruins', x:RUINS.x - 6, z:RUINS.z + 5, a:Math.PI / 2 },
    { id:'cactus', x:-112, z:-108, a:.6 }
  ];
  const chestBody = (() => { const M = new Merge(); M.add(GEO.box, 0, .38, 0, 1.3, .76, .9, 0, 0, 0, 0xb5652e); M.add(GEO.box, 0, .38, 0, 1.36, .14, .96, 0, 0, 0, 0xffcc33);
    for(const s of [-1, 1]) M.add(GEO.box, s * .5, .38, 0, .12, .8, .96, 0, 0, 0, 0xffcc33); M.add(GEO.box, 0, .62, .48, .26, .3, .08, 0, 0, 0, 0xffe680); return M.geometry(); })();
  const halfCyl = new THREE.CylinderGeometry(1, 1, 1, 12, 1, false, 0, Math.PI);
  const chestLid = (() => { const M = new Merge(); M.add(halfCyl, 0, 0, .45, .45, 1.3, .45, 0, 0, Math.PI / 2, 0xc9763a); M.add(GEO.box, 0, .03, .45, 1.32, .1, .92, 0, 0, 0, 0xb5652e);
    for(const s of [-1, 1]) M.add(halfCyl, s * .5, 0, .45, .47, .12, .47, 0, 0, Math.PI / 2, 0xffcc33); return M.geometry(); })();
  const chestMat = new THREE.MeshLambertMaterial({ vertexColors:true, flatShading:true });
  for(const c of CHESTS){
    c.y = groundAt(c.x, c.z, 1.2);
    const g = new THREE.Group(); g.position.set(c.x, c.y, c.z); g.rotation.y = c.a;
    const body = new THREE.Mesh(chestBody, chestMat), lid = new THREE.Mesh(chestLid, chestMat);
    body.castShadow = lid.castShadow = true; lid.position.set(0, .76, -.45);
    g.add(body); g.add(lid); root.add(g); c.g = g; c.lid = lid; c.open = 0; c.opened = false;
    addCirc(c.x, c.z, .75, c.y + 1);
  }
  const beamTex = K.canvasTex(32, 128, (x, w, h) => { const g = x.createLinearGradient(0, h, 0, 0); g.addColorStop(0, 'rgba(255,214,90,.62)'); g.addColorStop(.6, 'rgba(255,214,90,.22)'); g.addColorStop(1, 'rgba(255,214,90,0)'); x.fillStyle = g; x.fillRect(0, 0, w, h); });
  const beamMesh = new THREE.InstancedMesh(new THREE.CylinderGeometry(.9, .9, 26, 12, 1, true).translate(0, 13, 0), new THREE.MeshBasicMaterial({ map:beamTex, transparent:true, depthWrite:false, blending:THREE.AdditiveBlending, side:THREE.DoubleSide, fog:false }), CHESTS.length);
  beamMesh.frustumCulled = false; root.add(beamMesh);
  const beamAt = c => c.id === 'tunnel' ? [PB.x, 0, PB.z + PB.half + 3] : [c.x, c.y, c.z];

  /* ---------- camels (instanced bodies + legs) ---------- */
  const camelBodyGeo = (() => {
    const M = new Merge(), c = 0xd9a35f, d = 0xc28a48;
    M.add(GEO.box, 0, 1.75, 0, .95, .9, 2.3, 0, 0, 0, c); M.add(GEO.sph, 0, 2.35, -.1, .55, .55, .7, 0, 0, 0, d);
    M.add(GEO.box, 0, 2.05, -.1, 1.02, .12, 1.1, 0, 0, 0, 0xe8454f); M.add(GEO.box, 0, 1.92, -.1, 1.04, .12, 1.1, 0, 0, 0, 0x3fd6c6);
    M.add(GEO.box, 0, 2.3, 1.35, .42, 1.1, .45, -.55, 0, 0, c); M.add(GEO.box, 0, 2.85, 1.75, .5, .45, .85, 0, 0, 0, c); M.add(GEO.box, 0, 2.78, 2.22, .4, .34, .3, 0, 0, 0, 0xe9b878);
    for(const s of [-1, 1]){ M.add(GEO.box, s * .26, 3.0, 1.95, .06, .14, .14, 0, 0, 0, 0x2a1a10); M.add(GEO.box, s * .18, 3.12, 1.55, .12, .2, .1, 0, 0, s * .4, d); }
    M.add(GEO.box, 0, 1.6, -1.2, .1, .6, .1, .3, 0, 0, d);
    return M.geometry();
  })();
  const camelLegGeo = new THREE.BoxGeometry(.24, 1.45, .26).translate(0, -.72, 0);
  const camelMat = new THREE.MeshLambertMaterial({ vertexColors:true, flatShading:true });
  const CAMEL_PATHS = [[OASIS.x, OASIS.z, 27], [-100, 76, 12], [108, 88, 12], [22, 76, 9], [-22, 108, 10]];
  const CAMELS = CAMEL_PATHS.map(([cx, cz, r], i) => ({ cx, cz, r, a:rr(0, 6.28), dir:i % 2 ? 1 : -1, sp:rr(1.1, 1.5), x:0, z:0, y:0, f:0, stop:0, happy:0, ph:rr(0, 6) }));
  const camelBodies = new THREE.InstancedMesh(camelBodyGeo, camelMat, CAMELS.length), camelLegs = new THREE.InstancedMesh(camelLegGeo, new THREE.MeshLambertMaterial({ color:0xc8904f, flatShading:true }), CAMELS.length * 4);
  camelBodies.castShadow = camelLegs.castShadow = true; camelBodies.frustumCulled = camelLegs.frustumCulled = false; root.add(camelBodies); root.add(camelLegs);

  /* ---------- tumbleweeds ---------- */
  const twGeo = (() => { const M = new Merge(); for(let i = 0; i < 5; i++) M.add(new THREE.TorusGeometry(.62, .05, 4, 14), 0, 0, 0, 1, 1, 1, rr(0, 3), rr(0, 3), rr(0, 3), i % 2 ? 0xa8783e : 0x8d6232); M.add(GEO.ico, 0, 0, 0, .4, .4, .4, 0, 0, 0, 0x9a6a36); return M.geometry(); })();
  const TW = []; for(let i = 0; i < 9; i++) TW.push({ x:rr(-140, 140), z:rr(-120, 120), v:rr(3, 5.5), rot:0, ph:rr(0, 6), s:rr(.8, 1.3) });
  const twMesh = new THREE.InstancedMesh(twGeo, new THREE.MeshLambertMaterial({ vertexColors:true }), TW.length); twMesh.castShadow = true; twMesh.frustumCulled = false; root.add(twMesh);

  /* ---------- per frame ---------- */
  const _qa = new THREE.Quaternion(), _ax = new THREE.Vector3();
  function animate(dt, t, px, pz){
    // clouds
    CL.forEach((c, i) => { c.x += c.v * dt; if(c.x > 330) c.x = -330; _m.compose(_v.set(c.x, c.y, c.z), _q.setFromAxisAngle(_ax.set(0, 1, 0), c.ry), _s.set(c.s, c.s * .8, c.s)); clouds.setMatrixAt(i, _m); });
    clouds.instanceMatrix.needsUpdate = true;
    // coins and rings spin
    const sp = _q.setFromAxisAngle(_ax.set(0, 1, 0), t * 2.6);
    COINS.forEach((c, i) => { const show = !c.got; const s = show ? 1 : 0; _m.compose(_v.set(c.x, c.y + Math.sin(t * 3 + i) * .12, c.z), sp, _s.set(s, s, s)); coinMesh.setMatrixAt(i, _m); });
    coinMesh.instanceMatrix.needsUpdate = true;
    RINGS.forEach((r, i) => { const s = r.got ? 0 : 1 + Math.sin(t * 4 + i) * .04; _q.setFromAxisAngle(_ax.set(0, 1, 0), r.a); _m.compose(_v.set(r.x, r.y, r.z), _q, _s.set(s, s, s)); ringMesh.setMatrixAt(i, _m); });
    ringMesh.instanceMatrix.needsUpdate = true;
    // chests: lid + beams
    CHESTS.forEach((c, i) => {
      if(c.opened && c.open < 1){ c.open = Math.min(1, c.open + dt * 2.2); }
      c.lid.rotation.x = -c.open * 1.9;
      const [bx, by, bz] = beamAt(c), near = Math.hypot(bx - px, bz - pz), s = c.opened ? 0 : clamp((near - 9) / 12, 0, 1); _m.compose(_v.set(bx, by, bz), _qa.identity(), _s.set(s * (1 + Math.sin(t * 3 + i) * .1), s, s * (1 + Math.sin(t * 3 + i) * .1))); beamMesh.setMatrixAt(i, _m);
    });
    beamMesh.instanceMatrix.needsUpdate = true;
    // camels walk their loops (and stop to be patted)
    CAMELS.forEach((c, i) => {
      let walk = 1;
      if(c.stop > 0){ c.stop -= dt; walk = 0; }
      if(c.happy > 0) c.happy -= dt;
      c.a += c.dir * walk * c.sp / c.r * dt;
      c.x = c.cx + Math.cos(c.a) * c.r; c.z = c.cz + Math.sin(c.a) * c.r; c.y = groundAt(c.x, c.z);
      if(walk) c.f = Math.atan2(-Math.sin(c.a) * c.dir, Math.cos(c.a) * c.dir);
      c.ph += dt * walk * 4.2;
      const bob = walk ? Math.abs(Math.sin(c.ph)) * .06 : (c.happy > 0 ? Math.abs(Math.sin(t * 10)) * .12 : 0);
      _q.setFromAxisAngle(_ax.set(0, 1, 0), c.f); _m.compose(_v.set(c.x, c.y + bob, c.z), _q, _s.set(1, 1, 1)); camelBodies.setMatrixAt(i, _m);
      const sf = Math.sin(c.f), cf = Math.cos(c.f);
      [[-.3, .85], [.3, .85], [-.3, -.85], [.3, -.85]].forEach(([lx, lz], k) => {
        const sw = walk ? Math.sin(c.ph + (k === 0 || k === 3 ? 0 : Math.PI)) * .45 : 0;
        _q.setFromEuler(_e.set(sw, c.f, 0, 'YXZ'));
        _m.compose(_v.set(c.x + lx * cf + lz * sf, c.y + 1.45 + bob, c.z - lx * sf + lz * cf), _q, _s.set(1, 1, 1)); camelLegs.setMatrixAt(i * 4 + k, _m);
      });
    });
    camelBodies.instanceMatrix.needsUpdate = true; camelLegs.instanceMatrix.needsUpdate = true;
    // tumbleweeds roll with the wind
    TW.forEach((w, i) => {
      w.x += w.v * dt; if(w.x > 150){ w.x = -150; w.z = rr(-120, 120); }
      w.rot += w.v * dt / (.65 * w.s); w.ph += dt * 3;
      const g = groundAt(w.x, w.z, 3), y = Math.max(g, waterAt(w.x, w.z)) + .62 * w.s + Math.abs(Math.sin(w.ph)) * .9;
      _q.setFromAxisAngle(_ax.set(0, 0, -1), w.rot); _m.compose(_v.set(w.x, y, w.z), _q, _s.set(w.s, w.s, w.s)); twMesh.setMatrixAt(i, _m);
    });
    twMesh.instanceMatrix.needsUpdate = true;
    // water shimmer
    water.rotation.y += dt * .05;
    // the sky follows the camera (never reached)
  }

  return { root, groundAt, ceilAt, tunnelAt, waterAt, terr, circlesNear, CIRC, BOX, PYR, PA, PB, RAMP, OASIS, CAMP, STATUE, RUINS, JR, CP, GCOL,
    COINS, RINGS, CHESTS, CAMELS, TW, animate, STEP_H, beamAt, redrawSigns, flatMat };
}

/* ---------- the sand buggy (body + 4 wheels), seat anchor for a kid ---------- */
export function makeBuggy(THREE, K, color){
  const { Merge } = K, G = K.G;
  const grp = new THREE.Group(), body = new THREE.Group(); grp.add(body);
  const M = new Merge(), dark = 0x2c2a33, light = new THREE.Color(color).lerp(new THREE.Color(0xffffff), .35).getHex();
  M.add(G.box, 0, .62, 0, 1.5, .34, 2.3, 0, 0, 0, color);                // tub
  M.add(G.box, 0, .5, 0, 1.3, .2, 2.5, 0, 0, 0, dark);                   // floor
  M.add(G.box, 0, .78, .95, 1.36, .24, .62, -.28, 0, 0, light);          // nose
  M.add(G.box, 0, .5, 1.38, 1.6, .2, .18, 0, 0, 0, dark);                // bumper
  M.add(G.box, 0, .5, -1.32, 1.6, .2, .18, 0, 0, 0, dark);
  for(const s of [-1, 1]){
    M.add(G.box, s * .78, .7, .85, .2, .14, .9, 0, 0, 0, color);         // front fenders
    M.add(G.box, s * .78, .7, -.85, .2, .14, .9, 0, 0, 0, color);
    M.add(G.cyl8, s * .6, 1.22, -.55, .055, 1.05, .055, 0, 0, 0, 0xf4f1ea); // roll bar posts
    M.add(G.cyl8, s * .55, 1.12, .2, .05, .95, .05, -.42, 0, 0, 0xf4f1ea);
    M.add(G.box, s * .45, .76, 1.36, .26, .16, .06, 0, 0, 0, 0xfff3b0);   // headlights
    M.add(G.box, s * .5, .68, -1.36, .22, .1, .05, 0, 0, 0, 0xff4a4a);
  }
  M.add(G.cyl8, 0, 1.74, -.55, .055, 1.25, .055, 0, 0, Math.PI / 2, 0xf4f1ea);
  M.add(G.cyl8, 0, 1.55, .38, .05, 1.15, .05, 0, 0, Math.PI / 2, 0xf4f1ea);
  M.add(G.box, 0, .86, -.3, .78, .2, .7, 0, 0, 0, dark);                 // seat
  M.add(G.box, 0, 1.04, -.64, .78, .4, .14, -.12, 0, 0, dark);
  M.add(G.cyl8, 0, 1.0, .42, .04, .4, .04, -.9, 0, 0, dark);             // steering column
  M.add(new THREE.TorusGeometry(.2, .035, 6, 16), 0, 1.13, .3, 1, 1, 1, -.7, 0, 0, dark);
  M.add(G.cyl, 0, .84, -1.02, .3, .16, .3, 0, 0, 0, dark); M.add(G.cyl, 0, .9, -1.02, .13, .06, .13, 0, 0, 0, light);   // spare tyre on the back deck
  M.add(G.cyl8, -.62, 1.7, -1.05, .025, 1.9, .025, 0, 0, 0, 0xdddddd);  // flag pole + flag
  M.add(G.box, -.62 - .001, 2.45, -1.32, .02, .34, .5, 0, 0, 0, light);
  const bm = new THREE.Mesh(M.geometry(), K.charMat()); body.add(bm);
  const tyre = new THREE.CylinderGeometry(.44, .44, .36, 14).rotateZ(Math.PI / 2), hub = new THREE.CylinderGeometry(.2, .2, .38, 8).rotateZ(Math.PI / 2);
  const WM = new Merge(); WM.add(tyre, 0, 0, 0, 1, 1, 1, 0, 0, 0, dark); WM.add(hub, 0, 0, 0, 1, 1, 1, 0, 0, 0, light);
  for(let k = 0; k < 6; k++){ const a = k / 6 * Math.PI * 2; WM.add(G.box, 0, Math.cos(a) * .42, Math.sin(a) * .42, .38, .08, .12, a, 0, 0, 0x444048); }
  const wg = WM.geometry(), wmat = K.charMat();
  const wheels = [];
  for(const [x, z] of [[-.86, .85], [.86, .85], [-.86, -.85], [.86, -.85]]){
    const piv = new THREE.Group(); piv.position.set(x, .44, z); body.add(piv);
    const w = new THREE.Mesh(wg, wmat); piv.add(w); wheels.push({ piv, w, front:z > 0 });
  }
  const seat = new THREE.Group(); seat.position.set(0, .96, -.3); body.add(seat);
  grp.traverse(o => { if(o.isMesh){ o.castShadow = true; } });
  return { grp, body, wheels, seat, spin:0 };
}
