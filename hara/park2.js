/* «حديقة الشجر الكبيرة» (Big Tree Park / Büyük Ağaç Parkı): the second park of «حديقة الحارة», built from code (no models,
   no image files, no real names). A big, densely wooded, triangular park squeezed between busy roads and a highway
   interchange: a curving ramp along the north edge, a cloverleaf LOOP ramp with a green "island" inside it (reached by a
   kid-safe covered footbridge over the ramp), a wide road with buses and a zebra crossing along the east edge, a quiet street
   on the south-west side. Winding light paths cross the park (one makes a small loop), grassy clearings between lots of
   leafy trees, a rounded TERRACOTTA rubber playground in the middle (a two-tower play set with a straight yellow slide and a
   spiral slide, swings, spring riders, a seesaw), a fitness corner (pull-up bars, air walker, twister), a picnic area with
   tables, benches and lamps, and squirrels and birds in the trees. Everything outside the green mesh fence (wooded slopes,
   roads, traffic, ramps, apartment blocks) is backdrop: kids cannot reach it.
   Trees: instanced, with a near level (trunk + leafy crown, shadows) and a far level (crossed-quad impostors).
   Same interface as park.js (groundAt, collide, SLIDES, SWINGS, SEESAW, SPRINGS, BENCHES, HIDES, LAMPS…) plus FITS, STAR_SPOTS,
   GATE, ARRIVE. Coordinates: metres, x = east, z = south, y = up; park ground y = 0, roads y = RY. */
export function makePark2(THREE, K, TX){
  const { Merge, G } = K;
  let seed = 5151;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  const lerp = (a, b, t) => a + (b - a) * t;
  const root = new THREE.Group();
  const lam = o => new THREE.MeshLambertMaterial(o);
  const vcMat = lam({ vertexColors:true });
  const vcMat2 = lam({ vertexColors:true, side:THREE.DoubleSide });
  const _c2 = new THREE.Color();
  const _v = new THREE.Vector3(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _up = new THREE.Vector3(0, 1, 0), _m = new THREE.Matrix4(), _s = new THREE.Vector3(), _c = new THREE.Color();
  const RY = -1.3;                         // road level (the park sits a little higher, on wooded slopes)
  const hs = () => RY;

  /* ---------- tiny geometry builder with uvs (as in park.js) ---------- */
  class GB{
    constructor(){ this.p = []; this.n = []; this.u = []; }
    tri(a, b, c, ua, ub, uc){
      const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
      let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx; const l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l;
      for(const [p, uv] of [[a, ua], [b, ub], [c, uc]]){ this.p.push(p[0], p[1], p[2]); this.n.push(nx, ny, nz); this.u.push(uv[0], uv[1]); }
    }
    quad(a, b, c, d, ua, ub, uc, ud){ this.tri(a, b, c, ua, ub, uc); this.tri(a, c, d, ua, uc, ud); }
    box(x, y0, z, sx, sy, sz, yaw = 0, us = 1, top = true){
      const c = Math.cos(yaw), s = Math.sin(yaw);
      const P = (lx, ly, lz) => [x + lx * c + lz * s, y0 + ly, z - lx * s + lz * c];
      const hx = sx / 2, hz = sz / 2;
      const f = [[-hx, hz, hx, hz, sx], [hx, hz, hx, -hz, sz], [hx, -hz, -hx, -hz, sx], [-hx, -hz, -hx, hz, sz]];
      for(const [ax, az, bx, bz, w] of f) this.quad(P(ax, 0, az), P(bx, 0, bz), P(bx, sy, bz), P(ax, sy, az), [0, 0], [w / us, 0], [w / us, sy / us], [0, sy / us]);
      if(top) this.quad(P(-hx, sy, hz), P(hx, sy, hz), P(hx, sy, -hz), P(-hx, sy, -hz), [0, 0], [sx / us, 0], [sx / us, sz / us], [0, sz / us]);
    }
    mesh(mat, shadow = 0, parent = root){
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3));
      g.setAttribute('normal', new THREE.Float32BufferAttribute(this.n, 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute(this.u, 2));
      g.computeBoundingSphere();
      const m = new THREE.Mesh(g, mat); m.receiveShadow = !!(shadow & 1); m.castShadow = !!(shadow & 2); parent.add(m); return m;
    }
  }
  const vcMesh = (M, shadow = 3, mat = vcMat) => { const m = new THREE.Mesh(M.geometry(), mat); m.castShadow = !!(shadow & 2); m.receiveShadow = !!(shadow & 1); root.add(m); return m; };
  const flatUV = (g, s) => { const p = g.attributes.position, uv = new Float32Array(p.count * 2); for(let i = 0; i < p.count; i++){ uv[i * 2] = p.getX(i) / s; uv[i * 2 + 1] = -p.getZ(i) / s; } g.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); return g; };
  function rod(M, a, b, r, col, geo = G.cyl8){
    _v.set(b[0] - a[0], b[1] - a[1], b[2] - a[2]); const len = _v.length(); _v.normalize();
    _q.setFromUnitVectors(_up, _v); _e.setFromQuaternion(_q);
    M.add(geo, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2, r, len, r, _e.x, _e.y, _e.z, col);
  }
  const canvas = (w, h, draw, rep = true) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; if(rep) t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4; return t; };
  const speck = (x, w, h, a, n, s = 2) => { for(let i = 0; i < n; i++){ x.fillStyle = `rgba(${rnd() < .5 ? '0,0,0' : '255,255,255'},${a * rnd()})`; x.fillRect(rnd() * w, rnd() * h, s, s); } };

  /* ---------- this park's own textures ---------- */
  const T2 = {
    // terracotta rubber granules with a painted hopscotch and dots
    rubber:canvas(512, 512, (x, w, h) => { x.fillStyle = '#b9583d'; x.fillRect(0, 0, w, h); speck(x, w, h, .22, 22000, 2); for(let i = 0; i < 1500; i++){ x.fillStyle = ['#c86a48', '#a84c34', '#d07a55'][(rnd() * 3) | 0]; x.fillRect(rnd() * w, rnd() * h, 3, 3); } }),
    // dense grass, darker under trees
    lawn:canvas(512, 512, (x, w, h) => { x.fillStyle = '#5f8a3a'; x.fillRect(0, 0, w, h); for(let i = 0; i < 9000; i++){ const g = rnd(); x.fillStyle = g < .4 ? '#6f9a44' : g < .7 ? '#557f33' : g < .9 ? '#7aa64c' : '#8a9a4a'; x.fillRect(rnd() * w, rnd() * h, 2, 5); } speck(x, w, h, .08, 3000, 2); }),
    slope:canvas(256, 256, (x, w, h) => { x.fillStyle = '#4c6e30'; x.fillRect(0, 0, w, h); for(let i = 0; i < 4000; i++){ const g = rnd(); x.fillStyle = g < .5 ? '#577a36' : g < .8 ? '#40602a' : '#6a7a3a'; x.fillRect(rnd() * w, rnd() * h, 2, 4); } }),
    // light beige concrete path
    path:canvas(256, 256, (x, w, h) => { x.fillStyle = '#cfc3ad'; x.fillRect(0, 0, w, h); speck(x, w, h, .14, 6000, 2); x.strokeStyle = 'rgba(90,80,60,.25)'; x.lineWidth = 2; for(let k = 0; k <= 4; k++){ x.beginPath(); x.moveTo(0, k * 64); x.lineTo(w, k * 64); x.stroke(); } }),
    asphalt:canvas(256, 256, (x, w, h) => { x.fillStyle = '#5b5d61'; x.fillRect(0, 0, w, h); speck(x, w, h, .18, 9000, 2); }),
    // green welded-mesh fence (alpha)
    fence:canvas(256, 128, (x, w, h) => { x.clearRect(0, 0, w, h); x.strokeStyle = '#2f6a45'; x.lineWidth = 3; for(let i = 0; i <= w; i += 16){ x.beginPath(); x.moveTo(i, 0); x.lineTo(i, h); x.stroke(); } for(let j = 0; j <= h; j += 32){ x.beginPath(); x.moveTo(0, j + 1); x.lineTo(w, j + 1); x.stroke(); } x.lineWidth = 6; x.beginPath(); x.moveTo(0, 3); x.lineTo(w, 3); x.moveTo(0, h - 3); x.lineTo(w, h - 3); x.stroke(); }),
    // far tree impostors: a round leafy tree and a dark pine (alpha)
    impRound:canvas(128, 128, (x, w, h) => { x.fillStyle = '#5a4030'; x.fillRect(58, 70, 12, 58); for(const [cx, cy, r, c] of [[64, 52, 40, '#3b6a2c'], [40, 62, 26, '#335f27'], [88, 62, 26, '#335f27'], [64, 30, 26, '#4a7c34'], [50, 40, 18, '#5a8c3c'], [80, 44, 16, '#4f8236']]){ x.fillStyle = c; x.beginPath(); x.arc(cx, cy, r, 0, 7); x.fill(); } for(let i = 0; i < 160; i++){ x.fillStyle = rnd() < .5 ? 'rgba(120,170,80,.5)' : 'rgba(20,50,20,.4)'; x.beginPath(); x.arc(30 + rnd() * 68, 18 + rnd() * 70, 2 + rnd() * 3, 0, 7); x.fill(); } }, false),
    impPine:canvas(64, 128, (x, w, h) => { x.fillStyle = '#4a3428'; x.fillRect(28, 100, 8, 28); x.fillStyle = '#244a2c'; x.beginPath(); x.moveTo(32, 2); x.lineTo(58, 108); x.lineTo(6, 108); x.closePath(); x.fill(); x.fillStyle = 'rgba(70,120,70,.5)'; for(let i = 0; i < 60; i++){ const yy = 10 + rnd() * 95, hw = (yy / 108) * 24; x.fillRect(32 - hw + rnd() * hw * 2, yy, 3, 2); } }, false)
  };

  /* ======================================================================
     The park outline: a big curved triangle (west tip, north edge along the ramp, east edge along the wide road)
     ====================================================================== */
  const CTRL = [[-62, 4], [-52, -8], [-38, -20], [-22, -30], [-6, -36], [10, -37.6], [19, -34], [22.5, -20], [24.5, 0], [26, 20], [24, 36], [19, 45], [6, 41.5], [-14, 33], [-34, 23], [-50, 13]];
  const BP = [];
  { const cv = new THREE.CatmullRomCurve3(CTRL.map(p => new THREE.Vector3(p[0], 0, p[1])), true, 'centripetal', .5);
    const n = Math.round(cv.getLength()); const pts = cv.getSpacedPoints(n);
    let s = 0; for(let i = 0; i < n; i++){ if(i) s += pts[i].distanceTo(pts[i - 1]); BP.push([pts[i].x, pts[i].z, s]); } }
  const NB = BP.length;
  const at = k => BP[((k % NB) + NB) % NB];
  const inPoly = (x, z) => { let c = false; for(let i = 0, j = NB - 1; i < NB; j = i++){ const a = BP[i], b = BP[j]; if((a[1] > z) !== (b[1] > z) && x < (b[0] - a[0]) * (z - a[1]) / (b[1] - a[1]) + a[0]) c = !c; } return c; };
  // orientation-safe outward normal: test which side is inside
  const outN = i => { const a = at(i), b = at(i + 1), dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz) || 1; let n = [dz / l, -dx / l]; const mx = (a[0] + b[0]) / 2, mz = (a[1] + b[1]) / 2; if(inPoly(mx + n[0] * .5, mz + n[1] * .5)) n = [-n[0], -n[1]]; return n; };
  const ON = []; for(let i = 0; i < NB; i++) ON.push(outN(i));
  const vN = i => { const a = ON[((i - 1) % NB + NB) % NB], b = ON[((i % NB) + NB) % NB]; const x = a[0] + b[0], z = a[1] + b[1], l = Math.hypot(x, z) || 1; return [x / l, z / l]; };
  const distEdge = (x, z) => { let bd = 1e9; for(let i = 0; i < NB; i++){ const a = BP[i], b = at(i + 1), dx = b[0] - a[0], dz = b[1] - a[1], l2 = dx * dx + dz * dz; const t = clamp(((x - a[0]) * dx + (z - a[1]) * dz) / l2, 0, 1); const d = Math.hypot(x - a[0] - dx * t, z - a[1] - dz * t); if(d < bd) bd = d; } return bd; };

  /* the loop island inside the cloverleaf ramp, and the covered footbridge over the ramp */
  const I = { x:2, z:-62, R:12 };                         // island lawn radius
  const RING = { r0:14.2, r1:21.2 };                      // the loop ramp (road) around it
  const BR = { x0:.7, x1:3.3, zFoot:-25, zUp:-35.6, zDown:-51.2, zEnd:-59.4, h:4.6 };   // footbridge corridor (x range), ramps and deck
  const brY = z => z >= BR.zFoot ? 0 : z > BR.zUp ? BR.h * (BR.zFoot - z) / (BR.zFoot - BR.zUp) : z >= BR.zDown ? BR.h : z > BR.zEnd ? BR.h * (z - BR.zEnd) / (BR.zDown - BR.zEnd) : 0;
  const inBridge = (x, z, m = 0) => x >= BR.x0 + m && x <= BR.x1 - m && z <= BR.zFoot + 1 && z >= BR.zEnd - 1;
  const inIsland = (x, z, m = 0) => Math.hypot(x - I.x, z - I.z) <= I.R - m;
  const inPark = (x, z) => inPoly(x, z) || inIsland(x, z) || inBridge(x, z);

  /* ---------- the playground: a rounded terracotta rubber area ---------- */
  const PG = { x:-12, z:4, rot:-.35, hu:10, hv:6.5, cr:4.6 };
  const pgC = Math.cos(PG.rot), pgS = Math.sin(PG.rot);
  const PW = (u, v) => [PG.x + u * pgC - v * pgS, PG.z + u * pgS + v * pgC];          // playground local → world
  const pgLocal = (x, z) => { const dx = x - PG.x, dz = z - PG.z; return [dx * pgC + dz * pgS, -dx * pgS + dz * pgC]; };
  const pgDist = (x, z) => { const [u, v] = pgLocal(x, z); const qx = Math.abs(u) - (PG.hu - PG.cr), qz = Math.abs(v) - (PG.hv - PG.cr); return Math.hypot(Math.max(qx, 0), Math.max(qz, 0)) + Math.min(Math.max(qx, qz), 0) - PG.cr; };
  const C = { x:PG.x, z:PG.z };

  /* ---------- paths ---------- */
  const PATHS = [
    { w:2.6, pts:[[-58, 4], [-46, 3], [-34, 0], [-24, -6], [-14, -13], [-4, -20], [2, -23.5], [2, -25.5]] },
    { w:2.4, pts:[[2, -24.5], [5, -14], [7.5, -2], [8.5, 10], [10, 22], [14, 32], [17.5, 39.5]] },
    { w:2.2, pts:[[-46, 3], [-38, 10], [-26, 18], [-12, 24], [0, 26.5], [10, 22]] },
    { w:2.0, pts:[[-21, -8.4], [-17.5, -4.5], [-15.6, -1.8]] },
    { w:2.0, pts:[[7.5, -2], [3, -.6], [-1.6, -.2]] },
    { w:2.0, pts:[[7.5, -4], [11, -9], [13, -13.5]] },
    { w:2.0, loop:true, pts:[[15, 2.6], [19.6, 5.2], [20.2, 9.8], [16.6, 13.4], [11.6, 12.4], [10, 7.6], [11.6, 3.6]] },
    { w:2.0, pts:[[2, -58.6], [2.6, -64], [3.8, -69], [4.6, -72]] },
    { w:2.0, pts:[[-7.2, -66.4], [-1, -63.6], [5.4, -60.2], [10.2, -57]] },
    { w:2.0, pts:[[-34, 0], [-33, -6.5], [-31, -11]] }
  ];
  const pathSamples = [];
  const pathMat = lam({ map:T2.path, side:THREE.DoubleSide, polygonOffset:true, polygonOffsetFactor:-2, polygonOffsetUnits:-2 });
  { const gb = new GB(), M = new Merge();
    for(const P of PATHS){
      const curve = new THREE.CatmullRomCurve3(P.pts.map(p => new THREE.Vector3(p[0], 0, p[1])), !!P.loop, 'centripetal');
      const len = curve.getLength(), n = Math.max(2, Math.ceil(len / .6)), pts = curve.getSpacedPoints(n), hw = P.w / 2;
      for(let i = 0; i < n; i++){
        const a = pts[i], b = pts[i + 1], t0 = curve.getTangentAt(i / n), t1 = curve.getTangentAt(Math.min(1, (i + 1) / n));
        const la = [-t0.z, t0.x], lb = [-t1.z, t1.x];
        const ya = groundBase(a.x, a.z) + .03, yb = groundBase(b.x, b.z) + .03;
        const A = [a.x - la[0] * hw, ya, a.z - la[1] * hw], B = [a.x + la[0] * hw, ya, a.z + la[1] * hw], Cc = [b.x + lb[0] * hw, yb, b.z + lb[1] * hw], D = [b.x - lb[0] * hw, yb, b.z - lb[1] * hw];
        const uv = p => [p[0] / 2.5, -p[2] / 2.5];
        gb.quad(A, D, Cc, B, uv(A), uv(D), uv(Cc), uv(B));
        if(i % 3 === 0) for(const s of [-1, 1]){ const l = s < 0 ? la : lb; M.add(G.box, (a.x + b.x) / 2 + s * l[0] * (hw + .05), ya + .02, (a.z + b.z) / 2 + s * l[1] * (hw + .05), .1, .08, 1.9, 0, Math.atan2(b.x - a.x, b.z - a.z), 0, 0xb8b0a0); }
        pathSamples.push([a.x, a.z, hw]);
      }
      pathSamples.push([pts[n].x, pts[n].z, hw]);
    }
    const m = gb.mesh(pathMat, 1); m.renderOrder = 1;
    vcMesh(M, 1);
  }
  function groundBase(x, z){ return 0; }
  const distPath = (x, z) => { let d = 1e9; for(const s of pathSamples){ const v = Math.hypot(s[0] - x, s[1] - z) - s[2]; if(v < d) d = v; } return d; };

  /* ---------- ground: lawn inside the outline and on the island, wooded slopes down to the roads ---------- */
  const lawnMat = lam({ map:T2.lawn });
  { const sh = new THREE.Shape(); BP.forEach((p, i) => i ? sh.lineTo(p[0], -p[1]) : sh.moveTo(p[0], -p[1]));
    const g = new THREE.ShapeGeometry(sh); g.rotateX(-Math.PI / 2); flatUV(g, 5);
    const m = new THREE.Mesh(g, lawnMat); m.receiveShadow = true; root.add(m);
    const ig = new THREE.CircleGeometry(I.R + .5, 48); ig.rotateX(-Math.PI / 2); ig.translate(I.x, 0, I.z); flatUV(ig, 5);
    const im = new THREE.Mesh(ig, lawnMat); im.receiveShadow = true; root.add(im);
    // slopes: from the fence line (y 0) out and down to road level
    const sl = new GB();
    for(let i = 0; i < NB; i++){
      const a = BP[i], b = at(i + 1), n0 = vN(i), n1 = vN(i + 1), W = 6.5;
      const P = (p, n, d, y) => [p[0] + n[0] * d, y, p[1] + n[1] * d];
      sl.quad(P(a, n0, 0, .02), P(a, n0, W, RY), P(b, n1, W, RY), P(b, n1, 0, .02), [a[0] / 4, a[1] / 4], [(a[0] + n0[0] * W) / 4, (a[1] + n0[1] * W) / 4], [(b[0] + n1[0] * W) / 4, (b[1] + n1[1] * W) / 4], [b[0] / 4, b[1] / 4]);
    }
    for(let k = 0; k < 48; k++){ const a0 = k / 48 * Math.PI * 2, a1 = (k + 1) / 48 * Math.PI * 2, r0 = I.R + .4, r1 = RING.r0 - .3;
      const P = (a, r, y) => [I.x + Math.cos(a) * r, y, I.z + Math.sin(a) * r];
      sl.quad(P(a0, r0, .02), P(a1, r0, .02), P(a1, r1, RY), P(a0, r1, RY), [0, 0], [1, 0], [1, 1], [0, 1]); }
    sl.mesh(lam({ map:T2.slope, side:THREE.DoubleSide }), 1);
    // far ground under everything (verges of the interchange)
    const fg = new THREE.PlaneGeometry(900, 900); fg.rotateX(-Math.PI / 2); fg.translate(0, RY - .04, 0); flatUV(fg, 8);
    root.add(new THREE.Mesh(fg, lam({ map:T2.slope, color:0xb8c0a8 })));
  }

  /* ---------- the terracotta rubber playground floor with a concrete edge ---------- */
  { const sh = new THREE.Shape(), u = PG.hu - PG.cr, v = PG.hv - PG.cr, r = PG.cr;
    sh.moveTo(-u, -PG.hv); sh.lineTo(u, -PG.hv); sh.absarc(u, -v, r, -Math.PI / 2, 0); sh.lineTo(PG.hu, v); sh.absarc(u, v, r, 0, Math.PI / 2); sh.lineTo(-u, PG.hv); sh.absarc(-u, v, r, Math.PI / 2, Math.PI); sh.lineTo(-PG.hu, -v); sh.absarc(-u, -v, r, Math.PI, Math.PI * 1.5);
    // the shape is convex: a triangle fan from the middle, wound so it faces up
    const outline = sh.getSpacedPoints(120).map(q => PW(q.x, q.y)), pos = [], nor = [], uvs = [];
    for(let i = 0; i < outline.length - 1; i++){ let a = outline[i], b = outline[i + 1]; if((a[0] - PG.x) * (b[1] - PG.z) - (a[1] - PG.z) * (b[0] - PG.x) > 0){ const t = a; a = b; b = t; }
      for(const q of [[PG.x, PG.z], a, b]){ pos.push(q[0], .08, q[1]); nor.push(0, 1, 0); uvs.push(q[0] / 4, -q[1] / 4); } }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    const mat = lam({ map:T2.rubber });
    const m = new THREE.Mesh(g, mat); m.receiveShadow = true; root.add(m);
    // edge curb
    const M = new Merge(); const pts = sh.getSpacedPoints(90);
    for(let i = 0; i < pts.length - 1; i++){ const [ax, az] = PW(pts[i].x, pts[i].y), [bx, bz] = PW(pts[i + 1].x, pts[i + 1].y); M.add(G.box, (ax + bx) / 2, .06, (az + bz) / 2, .18, .14, Math.hypot(bx - ax, bz - az) + .04, 0, Math.atan2(bx - ax, bz - az), 0, 0xc9c2b4); }
    vcMesh(M, 1);
    // painted hopscotch squares on the rubber (yellow / blue)
    const H = new Merge(); for(let k = 0; k < 6; k++){ const [x, z] = PW(4.4 + (k % 2 ? .45 : 0) * (k > 1 && k < 5 ? 1 : 0), -1.2 + k * .62); H.add(G.box, x, .085, z, .55, .01, .55, 0, PG.rot * -1, 0, k % 2 ? 0xf5cf1f : 0x3a8fd8); }
    vcMesh(H, 1);
  }

  /* ======================================================================
     Fence, slopes and the footbridge
     ====================================================================== */
  const blocks = [], circles = [], floors = [];
  /* rotated rectangles (floors and solid blocks): local u = dx·cosR + dz·sinR, v = −dx·sinR + dz·cosR */
  const rect = (cx, cz, R, hu, hv, extra) => Object.assign({ cx, cz, c:Math.cos(R), s:Math.sin(R), hu, hv, br:Math.hypot(hu, hv) }, extra);
  const pgRect = (u, v, hu, hv, extra) => { const [x, z] = PW(u, v); return rect(x, z, PG.rot, hu, hv, extra); };
  const inRect = (q, x, z, m = 0) => { const dx = x - q.cx, dz = z - q.cz, u = dx * q.c + dz * q.s, v = -dx * q.s + dz * q.c; return Math.abs(u) <= q.hu + m && Math.abs(v) <= q.hv + m; };
  const fenceMat = lam({ map:T2.fence, alphaTest:.45, side:THREE.DoubleSide, transparent:false });
  const GATE = { x:-56.4, z:4, yaw:-Math.PI / 2 };           // the gate back to the neighbourhood park (yaw = the way out: walk through it towards -x)
  const ARRIVE = { x:-50.4, z:4, f:Math.PI / 2 };
  { const fence = new GB(), M = new Merge();
    const nearBridge = (x, z) => x > BR.x0 - .4 && x < BR.x1 + .4 && z < BR.zFoot && z > BR.zEnd;
    for(let i = 0; i < NB; i++){
      const a = BP[i], b = at(i + 1), n0 = vN(i), n1 = vN(i + 1), mx = (a[0] + b[0]) / 2, mz = (a[1] + b[1]) / 2;
      if(nearBridge(mx, mz)) continue;
      const A = [a[0] + n0[0] * .25, a[1] + n0[1] * .25], B = [b[0] + n1[0] * .25, b[1] + n1[1] * .25];
      fence.quad([A[0], .12, A[1]], [B[0], .12, B[1]], [B[0], 1.75, B[1]], [A[0], 1.75, A[1]], [a[2] / 2, 0], [(a[2] + 1) / 2, 0], [(a[2] + 1) / 2, .82], [a[2] / 2, .82]);
      M.add(G.box, (A[0] + B[0]) / 2, .06, (A[1] + B[1]) / 2, .22, .16, Math.hypot(B[0] - A[0], B[1] - A[1]) + .05, 0, Math.atan2(B[0] - A[0], B[1] - A[1]), 0, 0xbdb6a8);
      if(i % 3 === 0) M.add(G.cyl8, A[0], .9, A[1], .045, 1.8, .045, 0, 0, 0, 0x2a5a3c);
    }
    // the island fence (ring), open where the bridge lands
    for(let k = 0; k < 96; k++){ const a0 = k / 96 * Math.PI * 2, a1 = (k + 1) / 96 * Math.PI * 2, r = I.R + .25;
      const A = [I.x + Math.cos(a0) * r, I.z + Math.sin(a0) * r], B = [I.x + Math.cos(a1) * r, I.z + Math.sin(a1) * r];
      if(nearBridge((A[0] + B[0]) / 2, (A[1] + B[1]) / 2)) continue;
      fence.quad([A[0], .12, A[1]], [B[0], .12, B[1]], [B[0], 1.75, B[1]], [A[0], 1.75, A[1]], [k * .4, 0], [k * .4 + .4, 0], [k * .4 + .4, .82], [k * .4, .82]);
      if(k % 2 === 0) M.add(G.cyl8, A[0], .9, A[1], .045, 1.8, .045, 0, 0, 0, 0x2a5a3c);
      M.add(G.box, (A[0] + B[0]) / 2, .06, (A[1] + B[1]) / 2, .22, .16, Math.hypot(B[0] - A[0], B[1] - A[1]) + .05, 0, Math.atan2(B[0] - A[0], B[1] - A[1]), 0, 0xbdb6a8);
    }
    fence.mesh(fenceMat, 2).customDepthMaterial = new THREE.MeshDepthMaterial({ depthPacking:THREE.RGBADepthPacking, map:T2.fence, alphaTest:.45 });
    vcMesh(M, 3);
  }
  /* the covered footbridge: stair-ramps on both ends, a deck high over the loop ramp, mesh walls and green hoops on top */
  { const xc = (BR.x0 + BR.x1) / 2, w = BR.x1 - BR.x0, M = new Merge(), side = new GB(), deck = new GB();
    // ramps as small steps (a smooth floor under them for walking)
    for(const [za, zb] of [[BR.zFoot, BR.zUp], [BR.zEnd, BR.zDown]]){
      const n = 16; for(let k = 0; k < n; k++){ const z0 = za + (zb - za) * k / n, z1 = za + (zb - za) * (k + 1) / n, y = brY((z0 + z1) / 2 + (zb - za) / n * .5);
        M.add(G.box, xc, y / 2, (z0 + z1) / 2, w, y + .02, Math.abs(z1 - z0) + .01, 0, 0, 0, k % 2 ? 0xd8cdb8 : 0xcfc3ad);
        M.add(G.box, xc, y + .01, z1 - Math.sign(zb - za) * .04, w, .03, .07, 0, 0, 0, 0xf5cf1f); }
      // side walls of the ramp (concrete), with a handrail
      for(const sx of [BR.x0 - .12, BR.x1 + .12]){ const zz = [za, zb]; side.quad([sx, 0, zz[0]], [sx, 0, zz[1]], [sx, brY(zz[1]) + 1.1, zz[1]], [sx, brY(zz[0]) + 1.1, zz[0]], [zz[0] / 2, 0], [zz[1] / 2, 0], [zz[1] / 2, 1], [zz[0] / 2, 1]);
        rod(M, [sx, brY(za) + 1.15, za], [sx, brY(zb) + 1.15, zb], .05, 0xf2a020); }
    }
    // deck slab and its mesh walls
    M.add(G.box, xc, BR.h - .3, (BR.zUp + BR.zDown) / 2, w + .5, .6, BR.zUp - BR.zDown + .2, 0, 0, 0, 0xbab3a6);
    M.add(G.box, xc, BR.h + .005, (BR.zUp + BR.zDown) / 2, w, .02, BR.zUp - BR.zDown, 0, 0, 0, 0xcfc3ad);
    for(const sx of [BR.x0 - .1, BR.x1 + .1]){ deck.quad([sx, BR.h, BR.zUp], [sx, BR.h, BR.zDown], [sx, BR.h + 2.1, BR.zDown], [sx, BR.h + 2.1, BR.zUp], [0, 0], [7.8, 0], [7.8, 1.05], [0, 1.05]);
      rod(M, [sx, BR.h + 1.05, BR.zUp], [sx, BR.h + 1.05, BR.zDown], .05, 0xf2a020); }
    for(let z = BR.zUp; z >= BR.zDown - .01; z -= 1.9){
      for(const sx of [BR.x0 - .1, BR.x1 + .1]) M.add(G.cyl8, sx, BR.h + 1.05, z, .05, 2.1, .05, 0, 0, 0, 0x2a7a4a);
      const arc = new THREE.TorusGeometry(w / 2 + .1, .05, 6, 16, Math.PI); M.add(arc, xc, BR.h + 2.1, z, 1, 1, 1, 0, 0, 0, 0x2a7a4a);
    }
    // piers down to the road, outside the ramp lanes
    for(const z of [-38.6, -49.6]) for(const sx of [BR.x0 + .2, BR.x1 - .2]) M.add(G.box, sx, (BR.h + RY) / 2 - .3, z, .5, BR.h - RY - .6, .5, 0, 0, 0, 0xa8a296);
    vcMesh(M, 3);
    side.mesh(lam({ map:TX.concrete }), 3);
    deck.mesh(fenceMat, 2);
  }

  /* ======================================================================
     Roads, the interchange ramps and the traffic behind the fence
     ====================================================================== */
  const asphaltMat = lam({ map:T2.asphalt });
  const ROADY = RY + .02;
  function ribbon(gb, pts, w, y, closed = false, ys = null){
    const n = pts.length - (closed ? 0 : 1);
    for(let i = 0; i < n; i++){
      const a = pts[i], b = pts[(i + 1) % pts.length], pa = pts[(i - 1 + pts.length) % pts.length], pb = pts[(i + 2) % pts.length];
      const ta = closed || i > 0 ? [b[0] - pa[0], b[1] - pa[1]] : [b[0] - a[0], b[1] - a[1]], tb = closed || i < n - 1 ? [pb[0] - a[0], pb[1] - a[1]] : [b[0] - a[0], b[1] - a[1]];
      const la = Math.hypot(...ta) || 1, lb = Math.hypot(...tb) || 1, na = [-ta[1] / la, ta[0] / la], nb = [-tb[1] / lb, tb[0] / lb], h = w / 2;
      const ya = ys ? ys[i] : y, yb = ys ? ys[(i + 1) % pts.length] : y;
      gb.quad([a[0] - na[0] * h, ya, a[1] - na[1] * h], [a[0] + na[0] * h, ya, a[1] + na[1] * h], [b[0] + nb[0] * h, yb, b[1] + nb[1] * h], [b[0] - nb[0] * h, yb, b[1] - nb[1] * h],
        [a[0] / 6, a[1] / 6], [(a[0] + na[0] * w) / 6, (a[1] + na[1] * w) / 6], [(b[0] + nb[0] * w) / 6, (b[1] + nb[1] * w) / 6], [b[0] / 6, b[1] / 6]);
    }
  }
  const curvePts = (ctrl, step = 2, closed = false) => { const cv = new THREE.CatmullRomCurve3(ctrl.map(p => new THREE.Vector3(p[0], 0, p[1])), closed, 'centripetal'); const n = Math.max(2, Math.round(cv.getLength() / step)); return cv.getSpacedPoints(n).map(v => [v.x, v.z]).slice(0, closed ? n : n + 1); };
  const ringPts = (cx, cz, r, n = 72) => { const a = []; for(let k = 0; k < n; k++){ const t = k / n * Math.PI * 2; a.push([cx + Math.cos(t) * r, cz + Math.sin(t) * r]); } return a; };
  const marks = new Merge(), lines = new GB();
  /* lane lines: flat white quads along a polyline at an offset; dash = 0 for a solid line */
  const dashes = (pts, off, y, every = 6, len = 3, col, wdt = .15) => { const solid = len >= every; let acc = 0;
    for(let i = 0; i < pts.length - 1; i++){ const a = pts[i], b = pts[i + 1], dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz); if(!l) continue; const ux = dx / l, uz = dz / l, nx = -uz, nz = ux;
      const seg = (s0, s1) => { const P = (s, k) => [a[0] + ux * s + nx * (off + k * wdt / 2), y + .015, a[1] + uz * s + nz * (off + k * wdt / 2)]; lines.quad(P(s0, -1), P(s0, 1), P(s1, 1), P(s1, -1), [0, 0], [1, 0], [1, 1], [0, 1]); };
      if(solid) seg(0, l); else { let s = 0; while(s < l){ const k = (acc + s) % every; if(k < len){ const e = Math.min(l, s + len - k); seg(s, e); s = e; } else s += every - k; } }
      acc += l; } };
  // the wide road along the east edge (two lanes each way, a median with a low wall), with a zebra crossing
  const EAST = { x:40, z0:-170, z1:170 };
  const eastPts = [[EAST.x, EAST.z0], [EAST.x, EAST.z1]];
  // the curving ramp along the north edge, joining the loop
  const A_IN = 110 * Math.PI / 180, A_OUT = Math.PI / 4, RM_ = (RING.r0 + RING.r1) / 2;     // the ramp joins the loop at 110°, cars leave it at 45°
  const rampCtrl = [[-170, -4], [-120, -14], [-84, -27], [-56, -38], [-32, -45.5], [-16, -46.6], [I.x + RM_ * Math.cos(A_IN), I.z + RM_ * Math.sin(A_IN)]];
  const rampPts = curvePts(rampCtrl, 2);
  const RINGR = (RING.r0 + RING.r1) / 2;
  const ring = ringPts(I.x, I.z, RINGR, 96);
  // the connector from the loop to the wide road, the quiet street on the south-west side, a second (far) loop
  const conPts = curvePts([[I.x + RINGR * Math.cos(A_OUT), I.z + RINGR * Math.sin(A_OUT)], [21, -56], [29, -63], [36, -72], [42, -84], [43.4, -98]], 2);
  const swCtrl = []; { for(const k of [0, .25, .5, .75, 1]){ const i = Math.round(lerp(BP.findIndex(p => Math.hypot(p[0] - 19, p[1] - 45) < 3) , BP.findIndex(p => Math.hypot(p[0] + 50, p[1] - 13) < 3), k)); const p = at(i), n = vN(i); swCtrl.push([p[0] + n[0] * 11, p[1] + n[1] * 11]); } }
  const swPts = curvePts([[swCtrl[0][0] + 30, swCtrl[0][1] + 18]].concat(swCtrl, [[swCtrl[4][0] - 40, swCtrl[4][1] - 10]]), 2);
  const far = { x:-74, z:-88, r:17 };
  const farRing = ringPts(far.x, far.z, far.r, 64);
  const HWY = { z:-112, y:7.2, w:18 };
  { const gb = new GB();
    ribbon(gb, eastPts, 18, ROADY);
    ribbon(gb, rampPts, 8.5, ROADY);
    ribbon(gb, ring, RING.r1 - RING.r0, ROADY, true);
    ribbon(gb, conPts, 8, ROADY);
    ribbon(gb, swPts, 7.5, ROADY);
    ribbon(gb, farRing, 7, ROADY, true);
    gb.mesh(asphaltMat, 1);
    // lane markings
    dashes(eastPts, -5.4, ROADY); dashes(eastPts, 5.4, ROADY); dashes(eastPts, -8.6, ROADY, 1, 1, 0xf2f2ea, .12); dashes(eastPts, 8.6, ROADY, 1, 1, 0xf2f2ea, .12);
    dashes(rampPts, -4, ROADY, 1, 1, 0xf2f2ea, .12); dashes(rampPts, 4, ROADY, 1, 1, 0xf2f2ea, .12);
    dashes(ring.concat([ring[0]]), -3.3, ROADY, 1, 1, 0xf2f2ea, .12); dashes(ring.concat([ring[0]]), 3.3, ROADY, 1, 1, 0xf2f2ea, .12);
    dashes(swPts, 0, ROADY, 5, 2.4, 0xf2f2ea, .12);
    // zebra crossing on the wide road (south, by the crossing corner of the park)
    for(let k = 0; k < 9; k++) marks.add(G.box, EAST.x - 8 + k * 2, ROADY + .015, 42, .9, .01, 3.2, 0, 0, 0, 0xf4f4ee);
    vcMesh(marks, 1);
    // median: low concrete wall with a green strip; jersey wall on the park side of the road
    const M = new Merge();
    M.add(G.box, EAST.x, RY + .35, 0, 1.4, .7, EAST.z1 - EAST.z0, 0, 0, 0, 0xb8b2a6); M.add(G.box, EAST.x, RY + .72, 0, .9, .06, EAST.z1 - EAST.z0, 0, 0, 0, 0x5e8a3a);
    M.add(G.box, EAST.x - 9.3, RY + .45, 0, .45, .9, EAST.z1 - EAST.z0, 0, 0, 0, 0xc9c2b4);
    // traffic light poles at the crossing
    for(const [x, z, f] of [[EAST.x - 9.8, 44.2, 0], [EAST.x + 9.8, 39.8, Math.PI]]){ M.add(G.cyl8, x, RY + 2, z, .08, 4, .08, 0, 0, 0, 0x2e3034); M.add(G.box, x, RY + 3.5, z, .32, .9, .3, 0, f, 0, 0x1e2024); M.add(G.sm, x + Math.sin(f) * .16, RY + 3.75, z + Math.cos(f) * .16, .09, .09, .04, 0, f, 0, 0xe33b2e); M.add(G.sm, x + Math.sin(f) * .16, RY + 3.25, z + Math.cos(f) * .16, .09, .09, .04, 0, f, 0, 0x3fcf6a); }
    // a covered bus stop on the far side of the wide road
    M.add(G.box, EAST.x + 11.4, RY + 2.5, 14, 1.6, .08, 5, 0, 0, 0, 0xd5dbe0); for(const z of [11.8, 16.2]) M.add(G.cyl8, EAST.x + 12, RY + 1.25, z, .05, 2.5, .05, 0, 0, 0, 0x8a9098); M.add(G.box, EAST.x + 12.1, RY + 1.3, 14, .05, 1.8, 4.6, 0, 0, 0, 0xa8c8e0);
    vcMesh(M, 3);
  }
  // the elevated highway in the north, on round piers, with a ramp sweeping down to the wide road
  { const M = new Merge();
    M.add(G.box, 0, HWY.y - .5, HWY.z, 520, 1, HWY.w, 0, 0, 0, 0x9d988e);
    for(const s of [-1, 1]) M.add(G.box, 0, HWY.y + .45, HWY.z + s * (HWY.w / 2 - .2), 520, .9, .35, 0, 0, 0, 0xc9c2b4);
    for(let x = -250; x <= 250; x += 26) for(const s of [-1, 1]) M.add(G.cyl, x, (HWY.y + RY) / 2 - .5, HWY.z + s * 4.5, .75, HWY.y - RY - 1, .75, 0, 0, 0, 0xb3ada1);
    // ramp from the wide road (northbound) up onto the highway (eastbound lanes on its south half)
    const gb = new GB(); const rp = curvePts([[EAST.x + 6.9, -40], [EAST.x + 7.5, -66], [54, -88], [72, -101], [100, HWY.z + 6.4], [125, HWY.z + 6.4]], 2);
    const ys = rp.map((p, i) => lerp(ROADY, HWY.y, clamp(i / (rp.length - 1) * 1.15, 0, 1)));
    ribbon(gb, rp, 7.5, 0, false, ys); gb.mesh(asphaltMat, 1);
    rp.forEach((p, i) => { if(i % 8 === 4 && ys[i] > RY + 1.2) M.add(G.cyl, p[0], (ys[i] + RY) / 2 - .4, p[1], .55, ys[i] - RY - .6, .55, 0, 0, 0, 0xb3ada1); });
    const hp = []; for(let x = -260; x <= 260; x += 4) hp.push([x, HWY.z]);
    const g2 = new GB(); ribbon(g2, hp, HWY.w - .8, HWY.y + .01); g2.mesh(asphaltMat, 1);
    dashes(hp, -4.3, HWY.y + .01); dashes(hp, 4.3, HWY.y + .01);
    vcMesh(M, 3);
    var rampHwy = { pts:rp, ys };
  }
  lines.mesh(lam({ color:0xeeeee6, polygonOffset:true, polygonOffsetFactor:-3, polygonOffsetUnits:-3 }), 1);

  /* ---------- traffic: simple low-poly cars and buses moving along lane paths ---------- */
  const carGeo = (() => { const M = new Merge();
    M.add(G.box, 0, .55, 0, 1.75, .6, 4.1, 0, 0, 0, 0xffffff); M.add(G.box, 0, 1.05, -.2, 1.55, .5, 2.2, 0, 0, 0, 0x2a3440);
    M.add(G.box, 0, 1.33, -.2, 1.5, .06, 2.0, 0, 0, 0, 0xffffff);
    for(const sx of [-.86, .86]) for(const sz of [-1.35, 1.35]) M.add(G.cyl8, sx, .33, sz, .33, .22, .33, 0, 0, Math.PI / 2, 0x16171a);
    M.add(G.box, 0, .62, 2.06, 1.4, .14, .04, 0, 0, 0, 0xfff6d0); M.add(G.box, 0, .62, -2.06, 1.4, .14, .04, 0, 0, 0, 0xd83a2e);
    return M.geometry(); })();
  const busGeo = (() => { const M = new Merge();
    M.add(G.box, 0, 1.75, 0, 2.5, 2.8, 12, 0, 0, 0, 0xffffff); M.add(G.box, 0, 2.15, 0, 2.54, .95, 11.4, 0, 0, 0, 0x2a3440);
    M.add(G.box, 0, .85, 0, 2.54, .35, 12.02, 0, 0, 0, 0xc8352a);
    for(const sz of [-4, 3.6]) for(const sx of [-1.2, 1.2]) M.add(G.cyl8, sx, .5, sz, .5, .32, .5, 0, 0, Math.PI / 2, 0x16171a);
    M.add(G.box, 0, 1.2, 6.02, 2.1, .2, .04, 0, 0, 0, 0xfff6d0);
    return M.geometry(); })();
  const vehMat = lam({ vertexColors:true });
  const CAR_COLS = [0xf2f2f2, 0x1e1f24, 0xb8bcc4, 0xc0392b, 0x2e5fa8, 0xf5c518, 0xf5c518, 0x6a7280, 0x3a6a4a, 0xe8e0d0];
  const PATHS_V = [];
  function mkPath(pts, ys, y0 = ROADY){
    const L = [0]; for(let i = 1; i < pts.length; i++) L.push(L[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    const p = { pts, ys, y0, L, len:L[L.length - 1] }; PATHS_V.push(p); return p;
  }
  const offsetPts = (pts, off) => pts.map((a, i) => { const b = pts[Math.min(pts.length - 1, i + 1)], c = pts[Math.max(0, i - 1)], dx = b[0] - c[0], dz = b[1] - c[1], l = Math.hypot(dx, dz) || 1; return [a[0] - dz / l * off, a[1] + dx / l * off]; });
  const rev = a => a.slice().reverse();
  const lanes = [];
  // wide road: southbound (+z) on the west half, northbound on the east half (the car's left is +x when going +z)
  for(const off of [-6.9, -3.4]) lanes.push({ p:mkPath([[EAST.x + off, EAST.z0], [EAST.x + off, EAST.z1]]), n:6, bus:.4, v:11 });
  for(const off of [3.4, 6.9]) lanes.push({ p:mkPath([[EAST.x + off, EAST.z1], [EAST.x + off, EAST.z0]]), n:6, bus:.4, v:11 });
  // the ramp into the loop, around 3/4 of it, out on the connector and north
  { const pts = rampPts.slice(0, -1);
    for(let k = 0; k <= 24; k++){ const a = A_IN + (A_OUT - A_IN) * k / 24; pts.push([I.x + Math.cos(a) * RINGR, I.z + Math.sin(a) * RINGR]); }
    for(const q of conPts.slice(1)) pts.push(q);
    for(let z = -104; z >= -170; z -= 6) pts.push([EAST.x + 3.4, z]);
    lanes.push({ p:mkPath(pts), n:5, bus:.15, v:9 }); }
  // cars going round and round the loop (clockwise on the map, like the ramp traffic)
  { const pts = []; for(let k = 0; k <= 64; k++){ const a = A_IN - k / 64 * Math.PI * 2; pts.push([I.x + Math.cos(a) * (RINGR + 1.6), I.z + Math.sin(a) * (RINGR + 1.6)]); } lanes.push({ p:mkPath(pts), n:3, bus:0, v:8 }); }
  // the highway (both ways) and the sweeping ramp down from it
  for(const off of [2.2, 6.4]) lanes.push({ p:mkPath([[-260, HWY.z + off], [260, HWY.z + off]], null, HWY.y), n:5, bus:.25, v:15 });
  for(const off of [-6.4, -2.2]) lanes.push({ p:mkPath([[260, HWY.z + off], [-260, HWY.z + off]], null, HWY.y), n:5, bus:.25, v:15 });
  lanes.push({ p:mkPath(rampHwy.pts.concat([[260, HWY.z + 6.4]]), rampHwy.ys.concat([HWY.y])), n:3, bus:0, v:10 });
  // the quiet street (both ways) and the far loop
  lanes.push({ p:mkPath(offsetPts(swPts, -1.8)), n:2, bus:0, v:7 });
  lanes.push({ p:mkPath(rev(offsetPts(swPts, 1.8))), n:2, bus:0, v:7 });
  lanes.push({ p:mkPath(farRing.concat([farRing[0]])), n:3, bus:0, v:8 });
  const VEH = [];
  let nCar = 0, nBus = 0;
  for(const l of lanes) for(let k = 0; k < l.n; k++){ const bus = rnd() < l.bus; VEH.push({ p:l.p, d:(k + rnd() * .6) / l.n * l.p.len, v:l.v * (.85 + rnd() * .3), bus, idx:bus ? nBus++ : nCar++, col:bus ? (rnd() < .5 ? 0xffffff : 0xf0f0ea) : CAR_COLS[(rnd() * CAR_COLS.length) | 0] }); }
  // parked buses on the far side of the wide road and parked cars along the quiet street (static)
  const PARKED = [];
  for(let z = -20; z < 70; z += 13.5) PARKED.push({ bus:true, x:EAST.x + 15, z, f:Math.PI + .02 });
  { const sp = offsetPts(swPts, 4.6); for(let i = 6; i < sp.length - 6; i += 3){ if(rnd() < .35) continue; const a = sp[i], b = sp[i + 1]; PARKED.push({ bus:false, x:a[0], z:a[1], f:Math.atan2(b[0] - a[0], b[1] - a[1]) }); } }
  for(const p of PARKED){ p.idx = p.bus ? nBus++ : nCar++; p.col = p.bus ? 0xf4f4f0 : CAR_COLS[(rnd() * CAR_COLS.length) | 0]; }
  const carMesh = new THREE.InstancedMesh(carGeo, vehMat, nCar), busMesh = new THREE.InstancedMesh(busGeo, vehMat, Math.max(1, nBus));
  for(const m of [carMesh, busMesh]){ m.frustumCulled = false; m.castShadow = false; m.receiveShadow = false; root.add(m); }
  for(const v of VEH) (v.bus ? busMesh : carMesh).setColorAt(v.idx, _c.set(v.col));
  for(const p of PARKED){ (p.bus ? busMesh : carMesh).setColorAt(p.idx, _c.set(p.col)); (p.bus ? busMesh : carMesh).setMatrixAt(p.idx, _m.compose(_v.set(p.x, ROADY, p.z), _q.setFromEuler(_e.set(0, p.f, 0)), _s.set(1, 1, 1))); }
  function samplePath(p, d, out){
    d = ((d % p.len) + p.len) % p.len; let lo = 0, hi = p.L.length - 1; while(hi - lo > 1){ const mid = (lo + hi) >> 1; if(p.L[mid] <= d) lo = mid; else hi = mid; }
    const a = p.pts[lo], b = p.pts[hi], t = (d - p.L[lo]) / Math.max(1e-6, p.L[hi] - p.L[lo]);
    out.x = a[0] + (b[0] - a[0]) * t; out.z = a[1] + (b[1] - a[1]) * t; out.y = p.ys ? p.ys[lo] + (p.ys[hi] - p.ys[lo]) * t : p.y0; out.f = Math.atan2(b[0] - a[0], b[1] - a[1]);
    return out;
  }
  const _sp = { x:0, y:0, z:0, f:0 };
  function stepTraffic(dt){
    for(const v of VEH){ v.d += v.v * dt; if(v.d > v.p.len) v.d -= v.p.len; samplePath(v.p, v.d, _sp);
      (v.bus ? busMesh : carMesh).setMatrixAt(v.idx, _m.compose(_v.set(_sp.x, _sp.y, _sp.z), _q.setFromEuler(_e.set(0, _sp.f, 0)), _s.set(1, 1, 1))); }
    carMesh.instanceMatrix.needsUpdate = true; busMesh.instanceMatrix.needsUpdate = true;
  }
  stepTraffic(0);
  if(carMesh.instanceColor) carMesh.instanceColor.needsUpdate = true;

  /* ---------- apartment blocks beyond the roads ---------- */
  const FAC = TX.fac, styles = Object.keys(FAC);
  const bMats = {}, bGB = {}, nightMats = [];
  for(const k of styles){ bMats[k] = lam({ map:FAC[k].map, emissiveMap:FAC[k].night, emissive:0x000000 }); bGB[k] = new GB(); nightMats.push(bMats[k]); }
  const roofs = new Merge(), placed = [];
  const clearOf = (x, z, r) => !(inPark(x, z) || distEdge(x, z) < 14 + r || Math.hypot(x - I.x, z - I.z) < RING.r1 + 4 + r || Math.abs(x - EAST.x) < 13 + r || Math.abs(z - HWY.z) < 13 + r || Math.hypot(x - far.x, z - far.z) < far.r + 8 + r || placed.some(p => Math.hypot(p[0] - x, p[1] - z) < (p[2] + r) * .72));
  function building(x, z, yaw, w, d, fl, st){
    const r = Math.max(w, d) / 2; if(!clearOf(x, z, r)) return false;
    if(rampPts.some(p => Math.hypot(p[0] - x, p[1] - z) < 6 + r) || swPts.some(p => Math.hypot(p[0] - x, p[1] - z) < 5 + r) || conPts.some(p => Math.hypot(p[0] - x, p[1] - z) < 6 + r) || rampHwy.pts.some(p => Math.hypot(p[0] - x, p[1] - z) < 6 + r)) return false;
    placed.push([x, z, r * 2]);
    const y0 = RY - .5, h = fl * 3 + 1.5, gb = bGB[st], c = Math.cos(yaw), s = Math.sin(yaw), hx = w / 2, hz = d / 2;
    const P = (lx, ly, lz) => [x + lx * c + lz * s, y0 + ly, z - lx * s + lz * c];
    for(const [ax, az, bx, bz, ww] of [[-hx, hz, hx, hz, w], [hx, hz, hx, -hz, d], [hx, -hz, -hx, -hz, w], [-hx, -hz, -hx, hz, d]]) gb.quad(P(ax, 0, az), P(bx, 0, bz), P(bx, h, bz), P(ax, h, az), [0, 0], [ww / 12.8, 0], [ww / 12.8, h / 18], [0, h / 18]);
    roofs.add(G.box, x, y0 + h + .1, z, w + .2, .2, d + .2, 0, yaw, 0, 0x8d8a85);
    if(rnd() < .4) roofs.add(G.cone4, x, y0 + h + 1.1, z, (hx + .4) * 1.414, 2, (hz + .4) * 1.414, 0, yaw + Math.PI / 4, 0, 0xb5543a);
    return true;
  }
  // rows: east of the wide road, south-west beyond the street, north beyond the highway, west beyond the ramp
  for(let z = -90; z < 150; z += 14 + rnd() * 6) building(EAST.x + 30 + rnd() * 6, z, -Math.PI / 2, 10 + rnd() * 6, 10 + rnd() * 4, 5 + (rnd() * 5 | 0), styles[(rnd() * styles.length) | 0]);
  for(let z = -80; z < 150; z += 15 + rnd() * 6) building(EAST.x + 52 + rnd() * 8, z, -Math.PI / 2, 11 + rnd() * 5, 11 + rnd() * 4, 7 + (rnd() * 5 | 0), styles[(rnd() * styles.length) | 0]);
  { const sp = offsetPts(swPts, 15); for(let i = 0; i < sp.length - 1; i += 7){ const a = sp[i], b = sp[i + 1], f = Math.atan2(b[0] - a[0], b[1] - a[1]); building(a[0], a[1], f + Math.PI / 2, 12 + rnd() * 5, 10 + rnd() * 3, 4 + (rnd() * 4 | 0), styles[(rnd() * styles.length) | 0]); }
    const sp2 = offsetPts(swPts, 33); for(let i = 2; i < sp2.length - 1; i += 8){ const a = sp2[i], b = sp2[i + 1], f = Math.atan2(b[0] - a[0], b[1] - a[1]); building(a[0], a[1], f + Math.PI / 2, 12 + rnd() * 5, 11 + rnd() * 3, 6 + (rnd() * 5 | 0), styles[(rnd() * styles.length) | 0]); } }
  for(let x = -200; x < 200; x += 16 + rnd() * 6) building(x, HWY.z - 24 - rnd() * 5, 0, 11 + rnd() * 5, 10 + rnd() * 4, 6 + (rnd() * 6 | 0), styles[(rnd() * styles.length) | 0]);
  for(let x = -200; x < 200; x += 18 + rnd() * 6) building(x, HWY.z - 48 - rnd() * 6, 0, 12 + rnd() * 5, 11 + rnd() * 4, 8 + (rnd() * 6 | 0), styles[(rnd() * styles.length) | 0]);
  for(let z = -60; z < 80; z += 16 + rnd() * 6) building(-118 - rnd() * 8, z, Math.PI / 2, 11 + rnd() * 5, 10 + rnd() * 4, 5 + (rnd() * 5 | 0), styles[(rnd() * styles.length) | 0]);
  for(const k of styles) if(bGB[k].p.length) bGB[k].mesh(bMats[k]);
  vcMesh(roofs, 0);

  /* ======================================================================
     Playground equipment (Istanbul municipal style, warm colours to match the terracotta floor)
     ====================================================================== */
  const ORA = 0xf08a24, RED = 0xd8382c, YEL = 0xf5cf1f, GRN = 0x3fae4a, BLU = 0x2d7fd0, DARK = 0x26282d, CRM = 0xf2e6cf;
  const play = new Merge();
  const pYaw = -PG.rot;                // yaw that turns local +z (v) into the playground's v axis
  const towers = [{ u:-4.6, v:-1.6, h:1.4 }, { u:-1.6, v:-1.6, h:1.4 }];
  for(const t of towers){
    const [x, z] = PW(t.u, t.v);
    play.add(G.box, x, t.h - .05, z, 1.5, .1, 1.5, 0, pYaw, 0, 0x6b4428);
    for(const su of [-.72, .72]) for(const sv of [-.72, .72]){ const [px, pz] = PW(t.u + su, t.v + sv);
      play.add(G.cyl8, px, 1.55, pz, .08, 3.1, .08, 0, 0, 0, ORA); play.add(G.sm, px, 3.12, pz, .1, .1, .1, 0, 0, 0, YEL); circles.push({ x:px, z:pz, r:.13, top:3.2 }); }
    play.add(G.cone4, x, 3.55, z, 1.32, 1.1, 1.32, 0, pYaw + Math.PI / 4, 0, RED); play.add(G.sm, x, 4.12, z, .14, .14, .14, 0, 0, 0, YEL);
    // yellow side panels
    const [ax, az] = PW(t.u, t.v + (t.u < -3 ? -.76 : .76));     // one side panel each (the other sides keep the slide, the net and the bridge open)
    play.add(G.box, ax, t.h + .45, az, 1.3, .7, .06, 0, pYaw, 0, t.u < -3 ? GRN : YEL);
    floors.push(pgRect(t.u, t.v, .75, .75, { y:t.h }));
    blocks.push(pgRect(t.u, t.v, .75, .75, { top:t.h, bot:t.h - .14 }));
  }
  // flat bridge between the towers, with side nets
  { const [x, z] = PW(-3.1, -1.6); play.add(G.box, x, 1.35, z, 1.6, .08, 1.0, 0, pYaw, 0, 0x6b4428);
    for(const sv of [-.5, .5]){ const [a, b] = PW(-3.1, -1.6 + sv); play.add(G.box, a, 1.8, b, 1.6, .05, .04, 0, pYaw, 0, ORA); }
    floors.push(pgRect(-3.1, -1.6, .8, .5, { y:1.4 })); }
  // stairs up to tower A from the west (local -u), green steps with orange rails
  { const n = 6, u0 = -7.6, u1 = -5.35;
    for(let k = 0; k < n; k++){ const t = (k + .5) / n, [x, z] = PW(u0 + (u1 - u0) * t, -1.6); play.add(G.box, x, 1.4 * t - .05, z, .36, .08, 1.1, 0, pYaw, 0, GRN); }
    for(const sv of [-.62, .62]){ const [ax, az] = PW(u0, -1.6 + sv), [bx, bz] = PW(u1, -1.6 + sv); rod(play, [ax, .9, az], [bx, 2.2, bz], .04, ORA); rod(play, [ax, 0, az], [ax, .9, az], .045, ORA); circles.push({ x:ax, z:az, r:.08, top:1 }); }
    floors.push(pgRect((u0 + u1) / 2, -1.6, (u1 - u0) / 2, .6, { y:(x, z) => { const [u] = pgLocal(x, z); return 1.4 * clamp((u - u0) / (u1 - u0), 0, 1); } })); }
  // climbing net / ladder on tower B (north side, local -v): a climbable ramp
  const climb = { u0:-1.6, v0:-3.9, v1:-2.35 };
  { const [x0, z0] = PW(-1.6, -3.9), [x1, z1] = PW(-1.6, -2.35);
    const N2 = new Merge(); for(let k = 0; k <= 5; k++){ const t = k / 5; for(const su of [-.55, .55]){ const [a, b] = PW(-1.6 + su, -3.9 + 1.55 * t); void a; void b; } const [ax, az] = PW(-2.15, -3.9 + 1.55 * t), [bx, bz] = PW(-1.05, -3.9 + 1.55 * t); rod(N2, [ax, .05 + 1.35 * t, az], [bx, .05 + 1.35 * t, bz], .03, BLU); }
    for(const su of [-.55, -.2, .2, .55]){ const [ax, az] = PW(-1.6 + su, -3.9), [bx, bz] = PW(-1.6 + su, -2.35); rod(N2, [ax, .05, az], [bx, 1.4, bz], .03, BLU); }
    for(const g of [N2]){ const m = new THREE.Mesh(g.geometry(), vcMat); m.castShadow = true; root.add(m); }
    floors.push(pgRect(-1.6, -3.125, .6, .775, { y:(x, z) => { const [, v] = pgLocal(x, z); return 1.4 * clamp((v + 3.9) / 1.55, 0, 1); }, climb:true }));
    Object.assign(climb, { x0:Math.min(x0, x1), x1:Math.max(x0, x1), z0:Math.min(z0, z1), z1:Math.max(z0, z1) }); }

  /* slides: a U-shaped bed swept along a path; rider path is the bed centre (as in park.js) */
  function slide(fn, col, n = 64, wide = 1){
    const pts = []; for(let i = 0; i <= n; i++) pts.push(fn(i / n));
    const prof = [[-.44, .36], [-.36, .36], [-.35, .12], [-.28, .02], [-.14, -.02], [0, -.03], [.14, -.02], [.28, .02], [.35, .12], [.36, .36], [.44, .36]].map(([u, v]) => [u * wide, v]);
    const pos = [], idx = [];
    for(let i = 0; i <= n; i++){
      const p = pts[i], q = pts[Math.min(n, i + 1)], o = pts[Math.max(0, i - 1)];
      const tx = q[0] - o[0], tz = q[2] - o[2]; let lx = -tz, lz = tx; const ll = Math.hypot(lx, lz) || 1; lx /= ll; lz /= ll;
      for(const [u, v] of prof) pos.push(p[0] + lx * u, p[1] + v + .05, p[2] + lz * u);
    }
    const m = prof.length;
    for(let i = 0; i < n; i++) for(let j = 0; j < m - 1; j++){ const a = i * m + j, b = a + 1, c = a + m, d = c + 1; idx.push(a, c, b, b, c, d); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
    play.add(g, 0, 0, 0, 1, 1, 1, 0, 0, 0, col);
    const e = pts[n]; play.add(G.cyl8, e[0], e[1] / 2, e[2], .05, e[1], .05, 0, 0, 0, ORA);
    const L = [0]; for(let i = 1; i <= n; i++) L.push(L[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1], pts[i][2] - pts[i - 1][2]));
    const len = L[n];
    const sample = (d) => { d = clamp(d, 0, len); let i = 0; while(i < n - 1 && L[i + 1] < d) i++; const t = (d - L[i]) / Math.max(1e-6, L[i + 1] - L[i]), a = pts[i], b = pts[i + 1];
      return { x:a[0] + (b[0] - a[0]) * t, y:a[1] + (b[1] - a[1]) * t + .07, z:a[2] + (b[2] - a[2]) * t, dx:(b[0] - a[0]), dy:(b[1] - a[1]), dz:(b[2] - a[2]), seg:L[i + 1] - L[i] }; };
    return { pts, len, sample };
  }
  const SLIDES = [];
  { // wide YELLOW straight slide from tower A towards local +v (south)
    const s1 = slide(s => { const y = s < .85 ? 1.4 - 1.08 * (s / .85) : .32; const [x, z] = PW(-4.6, -.8 + 3.9 * s); return [x, Math.max(.32, y), z]; }, YEL, 48, 1.2);
    const [tx, tz] = PW(-4.6, -1.15); SLIDES.push(Object.assign(s1, { id:'yellow2', top:{ x:tx, y:1.4, z:tz }, col:'#f5cf1f' }));
    // BLUE spiral slide from tower B: 1¼ turns around a pole east of the tower
    const cu = .25, cv = -1.6, R = 1.15;
    const s2 = slide(s => { if(s < .86){ const k = s / .86, a = Math.PI + k * Math.PI * 1.5; const [x, z] = PW(cu + Math.cos(a) * R, cv + Math.sin(a) * R); return [x, 1.4 - 1.08 * k, z]; }
      const k = (s - .86) / .14; const [x, z] = PW(cu - k * 1.0, cv + R); return [x, .32, z]; }, BLU, 80, 1);
    const [px, pz] = PW(cu, cv); play.add(G.cyl8, px, 1.0, pz, .09, 2.0, .09, 0, 0, 0, ORA); circles.push({ x:px, z:pz, r:.15, top:2 });
    const [sx, sz] = PW(cu - R + .02, cv); SLIDES.push(Object.assign(s2, { id:'spiral', top:{ x:sx, y:1.4, z:sz }, col:'#7fb8ff' }));
    // a little platform from tower B to the spiral's start
    const [bx, bz] = PW(-.65, cv); play.add(G.box, bx, 1.35, bz, .4, .08, .9, 0, pYaw, 0, 0x6b4428);
    floors.push(pgRect(-.675, cv, .25, .45, { y:1.4 }));
  }
  // swings: two frames (A-frames, green and orange), two seats each
  const SWINGS = [];
  function swingSet(u, v, col, seats){
    const yaw = pYaw, H = 2.45, [x, z] = PW(u, v), c = Math.cos(yaw), s = Math.sin(yaw);
    const P = (bx, y, bz) => [x + bx * c + bz * s, y, z - bx * s + bz * c];
    rod(play, P(-1.7, H, 0), P(1.7, H, 0), .07, col);
    for(const e of [-1.65, 1.65]) for(const f of [-1, 1]){ rod(play, P(e, H, 0), P(e, .1, f * 1.2), .06, col); const g = P(e, 0, f * 1.2); circles.push({ x:g[0], z:g[2], r:.12, top:H }); }
    for(const bx of seats){
      const piv = new THREE.Group(); const pp = P(bx, H, 0); piv.position.set(pp[0], pp[1], pp[2]); piv.rotation.y = yaw;
      const M = new Merge(); const L = 1.85;
      for(const sx of [-.22, .22]) M.add(G.cyl8, sx, -L / 2, 0, .012, L, .012, 0, 0, 0, 0x8a8f96);
      M.add(G.box, 0, -L - .02, 0, .5, .06, .24, 0, 0, 0, 0x1d1e22);
      const m = new THREE.Mesh(M.geometry(), vcMat); m.castShadow = true; piv.add(m); root.add(piv);
      SWINGS.push({ piv, L, yaw, ang:0, vel:0, x:pp[0], z:pp[2], top:H });
    }
  }
  // the swing frame beam runs along local u; seats swing along local v
  swingSet(5.4, -3.6, GRN, [-.8, .8]);
  swingSet(5.4, 3.4, ORA, [-.8, .8]);
  // spring riders
  const SPRINGS = [];
  function springRider(u, v, col, kind){
    const [x, z] = PW(u, v), grp = new THREE.Group(); grp.position.set(x, .08, z); grp.rotation.y = pYaw;
    const base = new Merge(); base.add(G.cyl, 0, .03, 0, .35, .06, .35, 0, 0, 0, 0x2a2a2e);
    for(let k = 0; k < 6; k++) base.add(G.torus, 0, .1 + k * .065, 0, .13, .13, .25, Math.PI / 2, 0, 0, 0x9aa0a8);
    grp.add(new THREE.Mesh(base.geometry(), vcMat));
    const body = new THREE.Group(); body.position.y = .5; grp.add(body);
    const b = new Merge();
    if(kind === 'bee'){ b.add(G.sph, 0, .12, 0, .3, .28, .45, 0, 0, 0, YEL); for(const z of [-.15, .1]) b.add(G.box, 0, .12, z, .62, .5, .08, 0, 0, 0, DARK); b.add(G.sph, 0, .32, .42, .18, .18, .18, 0, 0, 0, DARK); b.add(G.cyl8, 0, .5, .3, .025, .36, .025, 0, 0, Math.PI / 2, RED); }
    else if(kind === 'moto'){ b.add(G.box, 0, .12, 0, .3, .22, .9, 0, 0, 0, col); b.add(G.cyl8, 0, .1, .5, .2, .08, .2, 0, 0, Math.PI / 2, DARK); b.add(G.cyl8, 0, .1, -.45, .2, .08, .2, 0, 0, Math.PI / 2, DARK); b.add(G.cyl8, 0, .48, .35, .025, .5, .025, 0, 0, Math.PI / 2, 0xc0c4ca); }
    else { b.add(G.sph, 0, .12, 0, .32, .26, .42, 0, 0, 0, col); b.add(G.sph, 0, .36, .38, .17, .17, .17, 0, 0, 0, col); b.add(G.cone, 0, .34, .58, .07, .14, .05, Math.PI / 2, 0, 0, ORA); b.add(G.cyl8, 0, .48, .26, .025, .34, .025, 0, 0, Math.PI / 2, YEL); }
    const bm = new THREE.Mesh(b.geometry(), vcMat); bm.castShadow = true; body.add(bm);
    root.add(grp);
    circles.push({ x, z, r:.42, top:1.0, spring:SPRINGS.length });
    SPRINGS.push({ x, z, grp, body, ax:0, az:0, vx:0, vz:0, seatY:.08 + .5 + .3, kind });
  }
  springRider(.4, 3.6, YEL, 'bee');
  springRider(2.0, 4.6, RED, 'moto');
  springRider(-1.2, 4.8, 0xf6f2e6, 'duck');
  // seesaw (orange beam on a green base)
  const SEESAW = (() => {
    const [x, z] = PW(-7.6, 3.4), yaw = pYaw - Math.PI / 2, grp = new THREE.Group(); grp.position.set(x, .08, z); grp.rotation.y = yaw;
    const base = new Merge(); base.add(G.box, 0, .25, 0, .3, .5, .5, 0, 0, 0, GRN); base.add(G.cyl8, 0, .5, 0, .09, .4, .09, Math.PI / 2, 0, 0, YEL);
    grp.add(new THREE.Mesh(base.geometry(), vcMat));
    const beam = new THREE.Group(); beam.position.y = .5; grp.add(beam);
    const b = new Merge(); b.add(G.box, 0, .05, 0, 3.4, .1, .24, 0, 0, 0, ORA);
    for(const s of [-1, 1]){ b.add(G.box, s * 1.45, .12, 0, .42, .06, .36, 0, 0, 0, RED); b.add(G.cyl8, s * 1.15, .3, 0, .03, .36, .03, 0, 0, 0, YEL); b.add(G.cyl8, s * 1.15, .48, 0, .025, .34, .025, Math.PI / 2, 0, 0, YEL); }
    const bm = new THREE.Mesh(b.geometry(), vcMat); bm.castShadow = true; beam.add(bm);
    root.add(grp);
    const c = Math.cos(yaw), s = Math.sin(yaw);
    for(const k of [-1.3, 0, 1.3]) circles.push({ x:x + k * c, z:z - k * s, r:.3, top:.75, seesaw:true });
    return { x, z, yaw, grp, beam, ang:.28, v:0, end:(side, out) => { const lx = (side ? 1 : -1) * 1.45; beam.updateWorldMatrix(true, false); return out.set(lx, .2, 0).applyMatrix4(beam.matrixWorld); } };
  })();
  const playMesh = vcMesh(play, 3, vcMat2);

  /* ---------- the fitness corner: pull-up bars, an air walker and a twister (blue and yellow) ---------- */
  const FITS = [];
  { const M = new Merge(), pad = new THREE.CircleGeometry(5.2, 40); pad.rotateX(-Math.PI / 2); pad.translate(14, .05, -12.6); flatUV(pad, 4);
    const pm = new THREE.Mesh(pad, lam({ map:T2.rubber, color:0x9fb6d8 })); pm.receiveShadow = true; root.add(pm);
    const POST = 0x2d6fc0, Y2 = 0xf5c518;
    const bar = (x, z, yaw, h, w) => { const c = Math.cos(yaw), s = Math.sin(yaw);
      for(const e of [-w / 2, w / 2]){ M.add(G.cyl8, x + e * c, h / 2 + .05, z - e * s, .07, h + .1, .07, 0, 0, 0, POST); M.add(G.sm, x + e * c, h + .12, z - e * s, .09, .09, .09, 0, 0, 0, Y2); circles.push({ x:x + e * c, z:z - e * s, r:.12, top:h + .2 }); }
      rod(M, [x - w / 2 * c, h, z + w / 2 * s], [x + w / 2 * c, h, z - w / 2 * s], .035, 0xd0d4da);
      FITS.push({ kind:'bar', x, z, yaw, h, ux:x + Math.sin(yaw) * .55, uz:z + Math.cos(yaw) * .55 }); };
    bar(11.4, -16.4, .5, 2.05, 1.5);
    bar(13.6, -17.4, .5, 1.6, 1.3);
    // air walker: an A-frame with two swinging foot pedals
    { const x = 16.4, z = -12.2, yaw = -.6, c = Math.cos(yaw), s = Math.sin(yaw);
      for(const e of [-.5, .5]){ rod(M, [x + e * c - Math.sin(yaw) * .6, 0, z - e * s - Math.cos(yaw) * .6], [x + e * c, 1.8, z - e * s], .07, POST); rod(M, [x + e * c + Math.sin(yaw) * .6, 0, z - e * s + Math.cos(yaw) * .6], [x + e * c, 1.8, z - e * s], .07, POST); }
      rod(M, [x - .5 * c, 1.8, z + .5 * s], [x + .5 * c, 1.8, z - .5 * s], .06, Y2); rod(M, [x - .3 * c, 1.25, z + .3 * s], [x + .3 * c, 1.25, z - .3 * s], .035, 0xd0d4da);
      circles.push({ x, z, r:.55, top:1.9 });
      FITS.push({ kind:'walker', x, z, yaw, h:.32, ux:x + Math.sin(yaw) * .9, uz:z + Math.cos(yaw) * .9 }); }
    // twister: a round turntable with a handle bar
    { const x = 12.6, z = -9.0, yaw = 2.4;
      M.add(G.cyl, x, .12, z, .45, .14, .45, 0, 0, 0, Y2); M.add(G.cyl8, x + Math.sin(yaw) * -.55, .7, z + Math.cos(yaw) * -.55, .06, 1.4, .06, 0, 0, 0, POST);
      rod(M, [x + Math.sin(yaw) * -.55 - Math.cos(yaw) * .4, 1.35, z + Math.cos(yaw) * -.55 + Math.sin(yaw) * .4], [x + Math.sin(yaw) * -.55 + Math.cos(yaw) * .4, 1.35, z + Math.cos(yaw) * -.55 - Math.sin(yaw) * .4], .035, 0xd0d4da);
      circles.push({ x:x + Math.sin(yaw) * -.55, z:z + Math.cos(yaw) * -.55, r:.1, top:1.4 });
      FITS.push({ kind:'twist', x, z, yaw, h:.2, ux:x + Math.sin(yaw) * .6, uz:z + Math.cos(yaw) * .6 }); }
    vcMesh(M, 3);
  }

  /* ---------- picnic area: wooden tables with benches, a bin; benches along the paths ---------- */
  const BENCHES = [];
  const PICNIC = [];
  { const M = new Merge(), WOOD = 0x9a6a3c, WOOD2 = 0x7a5230, LEG = 0x5a4632;
    const table = (x, z, f) => { const c = Math.cos(f), s = Math.sin(f), P = (lx, lz) => [x + lx * c + lz * s, z - lx * s + lz * c];
      for(const k of [-.25, -.08, .08, .25]){ const p = P(0, k); M.add(G.box, p[0], .74, p[1], 1.9, .05, .16, 0, f, 0, WOOD); }
      for(const e of [-.7, .7]){ const p = P(e, 0); M.add(G.box, p[0], .37, p[1], .08, .74, .7, 0, f, 0, LEG); }
      for(const sd of [-1, 1]){ for(const k of [-.07, .07]){ const p = P(0, sd * .72 + k); M.add(G.box, p[0], .44, p[1], 1.9, .05, .14, 0, f, 0, WOOD2); } for(const e of [-.7, .7]){ const p = P(e, sd * .72); M.add(G.box, p[0], .22, p[1], .08, .44, .08, 0, f, 0, LEG); }
        const sp = P(0, sd * .72); BENCHES.push({ x:sp[0], z:sp[1], f:f + (sd > 0 ? Math.PI : 0), picnic:true }); }
      blocks.push(rect(x, z, -f, .98, .42, { top:.77, bot:0 }));
      for(const sd of [-1, 1]) for(const e of [-.6, 0, .6]){ const p = P(e, sd * .72); circles.push({ x:p[0], z:p[1], r:.2, top:.47, bench:BENCHES.length - (sd < 0 ? 2 : 1) }); }
      PICNIC.push({ x, z, f }); };
    table(-37, -12.4, .2); table(-31, -15.6, -.3); table(-28.4, -9.6, .5);
    // a green bin
    M.add(G.cyl8, -33.6, .45, -8.6, .28, .9, .28, 0, 0, 0, 0x2f7a45); M.add(G.cyl8, -33.6, .92, -8.6, .3, .06, .3, 0, 0, 0, 0x22583a); circles.push({ x:-33.6, z:-8.6, r:.3, top:1 });
    // benches along the paths (wood on concrete legs, facing the path)
    const bench = (x, z, f) => { const c = Math.cos(f), s = Math.sin(f), P = (lx, lz) => [x + lx * c + lz * s, z - lx * s + lz * c];
      for(const e of [-.7, .7]){ const p = P(e, 0); M.add(G.box, p[0], .2, p[1], .18, .4, .5, 0, f, 0, 0xa8a49b); }
      for(const k of [-.15, 0, .15]){ const p = P(0, k); M.add(G.box, p[0], .43, p[1], 1.8, .05, .12, 0, f, 0, 0x8a5634); }
      for(const y of [.62, .8]){ const p = P(0, -.25); M.add(G.box, p[0], y, p[1], 1.8, .1, .04, -.15, f, 0, 0x8a5634); }
      BENCHES.push({ x, z, f }); for(const e of [-.6, 0, .6]){ const p = P(e, 0); circles.push({ x:p[0], z:p[1], r:.32, top:.47, bench:BENCHES.length - 1 }); } };
    // place a bench beside a path point, facing it
    const byPath = (pi, k, side) => { const P = PATHS[pi], a = P.pts[k], b = P.pts[k + 1], dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz), nx = -dz / l * side, nz = dx / l * side, x = (a[0] + b[0]) / 2 + nx * (P.w / 2 + 1.1), z = (a[1] + b[1]) / 2 + nz * (P.w / 2 + 1.1); bench(x, z, Math.atan2(-nx, -nz)); };
    byPath(0, 1, 1); byPath(0, 4, -1); byPath(1, 2, -1); byPath(1, 4, 1); byPath(2, 2, 1); byPath(2, 4, -1); byPath(7, 1, 1);
    // two benches by the playground, facing it
    for(const [u, v] of [[0, -8.6], [-9, 8.4]]){ const [x, z] = PW(u, v); bench(x, z, Math.atan2(PG.x - x, PG.z - z)); }
    vcMesh(M, 3);
  }

  /* ---------- hidden stars (14) ---------- */
  const wp = (u, v, y) => { const [x, z] = PW(u, v); return [x, y, z]; };
  const s1 = SLIDES[0].sample(SLIDES[0].len * .5), s2 = SLIDES[1].sample(SLIDES[1].len * .45);
  const STAR_SPOTS = [
    wp(-4.6, -1.6, 2.1), wp(-1.6, -1.6, 2.1), [s1.x, s1.y + .55, s1.z], [s2.x, s2.y + .55, s2.z],
    (() => { const s = SWINGS[2]; return [s.x + Math.sin(s.yaw) * 1.4, 1.9, s.z + Math.cos(s.yaw) * 1.4]; })(),
    [PICNIC[1].x, 1.25, PICNIC[1].z],
    [FITS[0].x, FITS[0].h - .15, FITS[0].z],
    [(BR.x0 + BR.x1) / 2, BR.h + .8, (BR.zUp + BR.zDown) / 2],
    [I.x + 6.5, .8, I.z - 4.5], [I.x - 7, .8, I.z + 1],
    [16, .8, 8], [GATE.x + 2.2, .8, GATE.z + 3.6], [21.2, .8, 33.5], [-47, .8, -5]
  ];
  /* ======================================================================
     Trees: lots of big leafy trees (instanced, near level + far impostors), a few dark pines; shrubs
     ====================================================================== */
  const TREES = [];          // { x, z, y, s, kind (0 round, 1 tall, 2 pine), col, walk }
  const GLADES = [[-42, 8, 6], [-2, 13, 7], [-20, 20, 4.5], [-6, -27, 4], [16, 8, 4.2], [4, 34, 5]];
  const okIn = (x, z) => {
    if(!inPark(x, z) || inBridge(x, z, -2.2)) return false;
    if(inIsland(x, z)){ if(Math.hypot(x - I.x, z - I.z) > I.R - 1.4) return false; }
    else if(distEdge(x, z) < 1.6) return false;
    if(distPath(x, z) < 1.3 || pgDist(x, z) < 2.6) return false;
    if(Math.hypot(x - 14, z - 12.6 * -1) < 6.2 || PICNIC.some(p => Math.hypot(p.x - x, p.z - z) < 3.2) || Math.hypot(x - GATE.x, z - GATE.z) < 8) return false;
    if(GLADES.some(g => Math.hypot(x - g[0], z - g[1]) < g[2])) return false;
    if(BENCHES.some(b => Math.hypot(b.x - x, b.z - z) < 1.8) || STAR_SPOTS.some(p => Math.hypot(p[0] - x, p[2] - z) < 1.8)) return false;
    return !TREES.some(t => Math.hypot(t.x - x, t.z - z) < 3.1 * Math.max(.8, Math.min(1.3, t.s)));
  };
  const leafy = () => [0x4f8a3a, 0x5a9a40, 0x467f34, 0x3f7a30, 0x6aa848, 0x3a6e2e, 0x7ab04e, 0x5d8f3c][(rnd() * 8) | 0];
  { let tries = 0;
    while(TREES.length < 190 && tries < 9000){ tries++; const x = -62 + rnd() * 90, z = -76 + rnd() * 122;
      if(!okIn(x, z)) continue; const s = .95 + rnd() * .75, kind = rnd() < .07 ? 2 : rnd() < .25 ? 1 : 0;
      TREES.push({ x, z, y:0, s, kind, col:kind === 2 ? 0x24472a : leafy(), walk:true }); }
    // wooded slopes outside the fence and round the island
    for(let i = 0; i < NB; i += 2){ if(rnd() < .25) continue; const p = BP[i], n = vN(i), d = 1.6 + rnd() * 4.6, x = p[0] + n[0] * d, z = p[1] + n[1] * d;
      if(x > BR.x0 - 3 && x < BR.x1 + 3 && z < -30) continue;
      if(Math.hypot(x - GATE.x, z - GATE.z) < 4) continue;
      TREES.push({ x, z, y:lerp(0, RY, d / 6.5), s:.9 + rnd() * .7, kind:rnd() < .1 ? 2 : rnd() < .3 ? 1 : 0, col:leafy(), walk:false }); }
    // green islands of the interchange (far backdrop: impostors)
    const farSpot = (x, z) => !inPark(x, z) && Math.hypot(x - I.x, z - I.z) > RING.r1 + 2 && Math.abs(x - EAST.x) > 11 && !rampPts.some(p => Math.hypot(p[0] - x, p[1] - z) < 6) && !conPts.some(p => Math.hypot(p[0] - x, p[1] - z) < 6) && !rampHwy.pts.some(p => Math.hypot(p[0] - x, p[1] - z) < 6) && !swPts.some(p => Math.hypot(p[0] - x, p[1] - z) < 5) && Math.abs(z - HWY.z) > 11 && distEdge(x, z) > 7 && Math.abs(Math.hypot(x - far.x, z - far.z) - far.r) > 5 && !placed.some(b => Math.hypot(b[0] - x, b[1] - z) < b[2] * .6 + 2);
    tries = 0; let n = 0;
    while(n < 260 && tries < 9000){ tries++; const x = -150 + rnd() * 230, z = -105 + rnd() * 190; if(!farSpot(x, z)) continue; n++;
      TREES.push({ x, z, y:RY, s:.9 + rnd() * .8, kind:rnd() < .12 ? 2 : rnd() < .3 ? 1 : 0, col:leafy(), walk:false }); }
    for(const t of TREES) if(t.walk) circles.push({ x:t.x, z:t.z, r:.32 * t.s + .05, top:9, tree:true });
  }
  // geometry: trunk, a leafy crown of a few lumpy blobs (shaded light → dark), a pine of stacked cones, impostor cross quads
  const trunkGeo = new THREE.CylinderGeometry(.16, .24, 1, 6); trunkGeo.translate(0, .5, 0);
  const crownGeo = (() => { const M = new Merge(); for(const [x, y, z, sx, sy, sz, c] of [[0, 0, 0, 1.6, 1.25, 1.6, 0xe8e8e8], [.85, -.25, .3, 1.05, .9, 1.05, 0xd4d4d4], [-.75, -.2, -.45, 1.1, .95, 1.0, 0xd0d0d0], [.1, .75, .15, 1.05, .85, 1.05, 0xffffff]]) M.add(G.ico1, x, y, z, sx, sy, sz, x * 2, y * 3, z, c); const g = M.geometry(); const p = g.attributes.position; for(let i = 0; i < p.count; i++){ const y = p.getY(i), k = .82 + clamp((y + 1.2) / 3.2, 0, 1) * .35; const c = g.attributes.color; c.setXYZ(i, c.getX(i) * k, c.getY(i) * k, c.getZ(i) * k); } return g; })();
  const pineGeo = (() => { const M = new Merge(); M.add(G.cone, 0, 1.4, 0, 1.15, 2.4, 1.15, 0, 0, 0, 0xd8d8d8); M.add(G.cone, 0, 2.6, 0, .9, 2.2, .9, 0, .5, 0, 0xeeeeee); M.add(G.cone, 0, 3.6, 0, .6, 1.8, .6, 0, 1, 0, 0xffffff); return M.geometry(); })();
  const crossGeo = (() => { const a = new THREE.PlaneGeometry(1, 1).toNonIndexed(); a.translate(0, .5, 0); const b = a.clone(); b.rotateY(Math.PI / 2);
    const g = new THREE.BufferGeometry(); for(const k of ['position', 'normal', 'uv']){ const A = a.attributes[k].array, B = b.attributes[k].array, o = new Float32Array(A.length * 2); o.set(A, 0); o.set(B, A.length); g.setAttribute(k, new THREE.BufferAttribute(o, a.attributes[k].itemSize)); }
    g.computeBoundingSphere(); return g; })();
  const NT = TREES.length;
  const trunkMesh = new THREE.InstancedMesh(trunkGeo, lam({ color:0x5a4434 }), NT);
  const crownMesh = new THREE.InstancedMesh(crownGeo, lam({ vertexColors:true }), NT);
  const pineMesh = new THREE.InstancedMesh(pineGeo, lam({ vertexColors:true }), NT);
  const impMesh = new THREE.InstancedMesh(crossGeo, lam({ map:T2.impRound, alphaTest:.5, side:THREE.DoubleSide }), NT);
  const impPine = new THREE.InstancedMesh(crossGeo, lam({ map:T2.impPine, alphaTest:.5, side:THREE.DoubleSide }), NT);
  trunkMesh.castShadow = crownMesh.castShadow = pineMesh.castShadow = true; crownMesh.receiveShadow = true;
  for(const m of [trunkMesh, crownMesh, pineMesh, impMesh, impPine]){ m.frustumCulled = false; m.count = 0; root.add(m); }
  const crownAt = t => ({ y:t.y + (t.kind === 1 ? 4.8 : 3.9) * t.s, r:(t.kind === 1 ? 1.6 : 2.2) * t.s });
  const NEAR0 = 38, FAR_HYS = 4; let lodHigh = false;
  let lodX = 1e9, lodZ = 1e9, lodT = 0, nearSet = new Uint8Array(NT);
  function treeLOD(cx, cz, force, high){
    if(!force && Math.hypot(cx - lodX, cz - lodZ) < 2.5 && !!high === lodHigh) return;
    lodX = cx; lodZ = cz; lodHigh = !!high;
    const NEAR = high ? 1e9 : NEAR0;      // a camera high above (overview) sees every tree in full
    let nt = 0, nc = 0, np = 0, ni = 0, nip = 0;
    for(let i = 0; i < NT; i++){
      const t = TREES[i], d = Math.hypot(t.x - cx, t.z - cz), near = nearSet[i] ? d < NEAR + FAR_HYS : d < NEAR - FAR_HYS;
      nearSet[i] = near ? 1 : 0;
      const s = t.s, tall = t.kind === 1;
      if(near){
        if(t.kind === 2){ pineMesh.setMatrixAt(np, _m.compose(_v.set(t.x, t.y, t.z), _q.identity(), _s.set(s, s * 1.1, s))); pineMesh.setColorAt(np, _c.set(0x9fc09a)); np++; trunkMesh.setMatrixAt(nt++, _m.compose(_v.set(t.x, t.y, t.z), _q.identity(), _s.set(s, .9 * s, s))); }
        else { const h = (tall ? 4.0 : 3.1) * s; trunkMesh.setMatrixAt(nt++, _m.compose(_v.set(t.x, t.y, t.z), _q.identity(), _s.set(s * 1.1, h + .6, s * 1.1)));
          const c = crownAt(t); crownMesh.setMatrixAt(nc, _m.compose(_v.set(t.x, c.y, t.z), _q.setFromEuler(_e.set(0, t.x * 1.7 + t.z, 0)), _s.set(s * (tall ? .95 : 1.25), s * (tall ? 1.6 : 1.15), s * (tall ? .95 : 1.25)))); crownMesh.setColorAt(nc, _c.set(t.col)); nc++; }
      } else {
        if(t.kind === 2){ impPine.setMatrixAt(nip++, _m.compose(_v.set(t.x, t.y, t.z), _q.setFromEuler(_e.set(0, t.x, 0)), _s.set(2.6 * s, 6 * s, 2.6 * s))); }
        else { const c = crownAt(t); impMesh.setMatrixAt(ni, _m.compose(_v.set(t.x, t.y, t.z), _q.setFromEuler(_e.set(0, t.x + t.z, 0)), _s.set(c.r * 2.3, c.y - t.y + c.r * 1.05, c.r * 2.3))); impMesh.setColorAt(ni, _c.set(0xffffff).lerp(_c2.set(t.col).multiplyScalar(3), .35)); ni++; }
      }
    }
    trunkMesh.count = nt; crownMesh.count = nc; pineMesh.count = np; impMesh.count = ni; impPine.count = nip;
    for(const m of [trunkMesh, crownMesh, pineMesh, impMesh, impPine]){ m.instanceMatrix.needsUpdate = true; if(m.instanceColor) m.instanceColor.needsUpdate = true; }
  }
  // shrubs: lumpy balls along paths and the fence (one instanced mesh)
  const BUSHES = [];
  { let k = 0, tries = 0;
    while(k < 70 && tries < 8000){ tries++; const x = -60 + rnd() * 86, z = -74 + rnd() * 118, r = .55 + rnd() * .5;
      if(!inPark(x, z) || inBridge(x, z, -1.5) || (inIsland(x, z) ? Math.hypot(x - I.x, z - I.z) > I.R - 1.2 : distEdge(x, z) < 1.2) || pgDist(x, z) < 2 + r || distPath(x, z) < .9 + r || distPath(x, z) > 5 || TREES.some(t => t.walk && Math.hypot(t.x - x, t.z - z) < 1.4 + r) || BUSHES.some(b => Math.hypot(b.x - x, b.z - z) < b.r + r + .7) || BENCHES.some(b => Math.hypot(b.x - x, b.z - z) < 1.6) || Math.hypot(x - GATE.x, z - GATE.z) < 4 || FITS.some(f => Math.hypot(f.x - x, f.z - z) < 2.2) || STAR_SPOTS.some(p => Math.hypot(p[0] - x, p[2] - z) < r + 1.2)) continue;
      k++; BUSHES.push({ x, z, r, y:r * .8, lolly:false }); } }
  const bushGeo = (() => { const g = new THREE.SphereGeometry(1, 10, 8); const p = g.attributes.position; for(let i = 0; i < p.count; i++){ _v.fromBufferAttribute(p, i); const k = 1 + (Math.sin(_v.x * 7) * Math.sin(_v.y * 6) * Math.sin(_v.z * 8)) * .06; p.setXYZ(i, _v.x * k, _v.y * k * .9, _v.z * k); } g.computeVertexNormals(); return g; })();
  const bushMesh = new THREE.InstancedMesh(bushGeo, lam({ color:0xffffff }), Math.max(1, BUSHES.length));
  BUSHES.forEach((b, i) => { bushMesh.setMatrixAt(i, _m.compose(_v.set(b.x, b.y, b.z), _q.setFromEuler(_e.set(0, rnd() * 6, 0)), _s.set(b.r, b.r * .85, b.r))); bushMesh.setColorAt(i, _c.setHSL(.26 + rnd() * .07, .45, .2 + rnd() * .07)); circles.push({ x:b.x, z:b.z, r:b.r * .8, top:b.y + b.r, bush:i }); });
  bushMesh.count = BUSHES.length; bushMesh.castShadow = true; bushMesh.receiveShadow = true; root.add(bushMesh);
  const HIDES = [];
  for(const b of BUSHES.filter(b => b.r > .75).slice(0, 14)){ const dx = b.x - PG.x, dz = b.z - PG.z, l = Math.hypot(dx, dz) || 1, x = b.x + dx / l * (b.r + .45), z = b.z + dz / l * (b.r + .45); if(inPark(x, z) && !inBridge(x, z, -1)) HIDES.push({ x, z, bush:b }); }
  if(!HIDES.length) HIDES.push({ x:-40, z:8, bush:null });

  /* ---------- lamps along the paths and a tall floodlight by the playground ---------- */
  const LAMPS = [];
  { const M = new Merge(), heads = new Merge();
    const lamp = (x, z, h = 4.6) => {
      M.add(G.cyl8, x, h / 2, z, .07, h, .07, 0, 0, 0, 0x2e4a3a); M.add(G.cyl8, x, .25, z, .13, .5, .13, 0, 0, 0, 0x2e4a3a);
      M.add(G.sm, x, h + .12, z, .26, .3, .26, 0, 0, 0, 0x2e4a3a); heads.add(G.sm, x, h - .08, z, .22, .2, .22, 0, 0, 0, 0xffffff);
      LAMPS.push({ x, y:h - .1, z, big:false }); circles.push({ x, z, r:.14, top:h });
    };
    for(const P of PATHS.slice(0, 3)) for(let k = 1; k < P.pts.length - 1; k += 2){ const a = P.pts[k], b = P.pts[k + 1], dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz) || 1; const x = a[0] - dz / l * (P.w / 2 + .5), z = a[1] + dx / l * (P.w / 2 + .5); if(inPark(x, z) && !TREES.some(t => t.walk && Math.hypot(t.x - x, t.z - z) < 1.2)) lamp(x, z); }
    lamp(-1, -60); lamp(6, -66);
    const [fx, fz] = PW(2, -7.6), fh = 8;
    M.add(G.cyl8, fx, fh / 2, fz, .1, fh, .1, 0, 0, 0, 0x6c7076); M.add(G.box, fx, fh, fz, 1.2, .08, .08, 0, .3, 0, 0x6c7076);
    for(const [ox, oz] of [[-.45, .12], [.45, -.12]]){ M.add(G.box, fx + ox, fh + .2, fz + oz, .34, .26, .14, -.5, .3, 0, 0x2a2c30); heads.add(G.box, fx + ox, fh + .17, fz + oz + .07, .28, .2, .02, -.5, .3, 0, 0xffffff); }
    LAMPS.push({ x:fx, y:fh, z:fz, big:true }); circles.push({ x:fx, z:fz, r:.2, top:fh });
    vcMesh(M, 2);
    var headMat = new THREE.MeshBasicMaterial({ color:0xdcdcd0 }); root.add(new THREE.Mesh(heads.geometry(), headMat));
  }
  const glowMat = new THREE.SpriteMaterial({ map:TX.glow, color:0xffffff, transparent:true, depthWrite:false, blending:THREE.AdditiveBlending, opacity:0 });
  const poolMat = new THREE.MeshBasicMaterial({ map:TX.pool, transparent:true, depthWrite:false, blending:THREE.AdditiveBlending, opacity:0, polygonOffset:true, polygonOffsetFactor:-4 });
  for(const l of LAMPS){ const sp = new THREE.Sprite(glowMat); sp.position.set(l.x, l.y, l.z); sp.scale.setScalar(l.big ? 4 : 2); root.add(sp);
    const pg = new THREE.PlaneGeometry(1, 1); pg.rotateX(-Math.PI / 2); const pm = new THREE.Mesh(pg, poolMat); pm.position.set(l.x, .12, l.z); pm.scale.setScalar(l.big ? 20 : 9); pm.renderOrder = 3; root.add(pm); }
  // street lights along the roads (backdrop; heads glow at night)
  const roadHeads = new Merge(), roadPoles = new Merge();
  for(let z = -160; z < 170; z += 26){ roadPoles.add(G.cyl8, EAST.x, RY + 4.5, z, .1, 9, .1, 0, 0, 0, 0x8e9298); for(const s of [-1, 1]){ roadPoles.add(G.box, EAST.x + s * 1.6, RY + 9, z, 3.2, .1, .1, 0, 0, 0, 0x8e9298); roadHeads.add(G.box, EAST.x + s * 3.1, RY + 8.9, z, .6, .1, .25, 0, 0, 0, 0xffffff); } }
  const rhMat = new THREE.MeshBasicMaterial({ color:0x9a9a92 });
  { const m = new THREE.Mesh(roadPoles.geometry(), vcMat); root.add(m); root.add(new THREE.Mesh(roadHeads.geometry(), rhMat)); }

  /* ======================================================================
     Squirrels (run between trees, climb the trunks; they run up when a kid comes close) and birds in the crowns
     ====================================================================== */
  const sqGeo = (() => { const M = new Merge(), F = 0xa0582a, L2 = 0xd9a878;
    M.add(G.sph, 0, .13, 0, .08, .08, .14, 0, 0, 0, F); M.add(G.sph, 0, .2, .13, .06, .06, .065, 0, 0, 0, F); M.add(G.sm, 0, .155, .02, .05, .05, .09, 0, 0, 0, L2);
    for(const s of [-1, 1]){ M.add(G.cone, s * .035, .27, .13, .018, .05, .018, 0, 0, 0, F); M.add(G.sm, s * .03, .215, .185, .012, .012, .012, 0, 0, 0, 0x111111); }
    M.add(G.sph, 0, .25, -.15, .07, .14, .07, -.5, 0, 0, F); M.add(G.sph, 0, .36, -.1, .065, .08, .065, .6, 0, 0, F);
    return M.geometry(); })();
  const NSQ = 7, sqMesh = new THREE.InstancedMesh(sqGeo, lam({ vertexColors:true }), NSQ); sqMesh.castShadow = true; sqMesh.frustumCulled = false; root.add(sqMesh);
  const walkTrees = TREES.filter(t => t.walk && t.kind !== 2);
  const SQ = []; for(let i = 0; i < NSQ; i++){ const t = walkTrees[(i * 23 + 5) % walkTrees.length]; SQ.push({ x:t.x + .5, z:t.z, y:0, f:0, st:'ground', tree:t, to:null, t:1 + rnd() * 3, up:0 }); }
  const birdBody = (() => { const M = new Merge(); M.add(G.sph, 0, 0, 0, .07, .065, .12, 0, 0, 0, 0xffffff); M.add(G.sph, 0, .05, .09, .05, .05, .05, 0, 0, 0, 0xffffff); M.add(G.cone, 0, .05, .155, .015, .04, .015, Math.PI / 2, 0, 0, 0xe0a040); M.add(G.box, 0, .01, -.13, .08, .015, .08, 0, 0, 0, 0xffffff); return M.geometry(); })();
  const wingGeo = (() => { const g = new THREE.BufferGeometry(); const p = [0, 0, .05, .2, .12, 0, 0, 0, -.06, 0, 0, .05, -.2, .12, 0, 0, 0, -.06]; g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3)); g.computeVertexNormals(); return g; })();
  const NBIRD = 12, birdMesh = new THREE.InstancedMesh(birdBody, lam({ vertexColors:true }), NBIRD), wingMesh = new THREE.InstancedMesh(wingGeo, lam({ color:0xffffff, side:THREE.DoubleSide }), NBIRD);
  for(const m of [birdMesh, wingMesh]){ m.frustumCulled = false; root.add(m); }
  const BIRD_COLS = [0x6a6e78, 0x4a4e58, 0xb87a4a, 0x2a2a30, 0x8a94a8];
  const BIRDS = []; for(let i = 0; i < NBIRD; i++){ const t = TREES.filter(t => t.walk)[(i * 17 + 3) % TREES.filter(t => t.walk).length], c = crownAt(t); BIRDS.push({ t, x:t.x, y:c.y + c.r * .8, z:t.z, f:rnd() * 6, fly:0, from:null, to:null, wait:2 + rnd() * 6, ph:rnd() * 6 }); birdMesh.setColorAt(i, _c.set(BIRD_COLS[i % BIRD_COLS.length])); wingMesh.setColorAt(i, _c.set(BIRD_COLS[i % BIRD_COLS.length]).multiplyScalar(.85)); }
  const perch = t => { const c = crownAt(t); const a = rnd() * 6.28; return { x:t.x + Math.cos(a) * c.r * .5, y:c.y + c.r * (t.kind === 1 ? 1.1 : .85), z:t.z + Math.sin(a) * c.r * .5 }; };
  function stepCritters(t, dt, px, pz){
    for(let i = 0; i < NSQ; i++){ const s = SQ[i]; s.t -= dt;
      const dp = Math.hypot(s.x - px, s.z - pz);
      if(s.st === 'ground'){
        if(dp < 2.6){ s.st = 'climb'; s.to = s.tree; s.up = 0; }
        else if(s.t <= 0){ s.st = 'run'; s.to = walkTrees[(rnd() * walkTrees.length) | 0]; if(Math.hypot(s.to.x - s.x, s.to.z - s.z) > 18) s.to = walkTrees.filter(q => Math.hypot(q.x - s.x, q.z - s.z) < 14)[0] || s.tree; }
        else { s.y = 0; s.hop = (s.hop || 0) + dt; }
      } else if(s.st === 'run'){
        const tx = s.to.x + .35, tz = s.to.z, dx = tx - s.x, dz = tz - s.z, l = Math.hypot(dx, dz), sp = dp < 3 ? 5 : 3.2;
        if(l < .2){ s.tree = s.to; s.st = rnd() < .5 || dp < 4 ? 'climb' : 'ground'; s.t = 1 + rnd() * 3; s.up = 0; }
        else { s.x += dx / l * Math.min(l, sp * dt); s.z += dz / l * Math.min(l, sp * dt); s.f = Math.atan2(dx, dz); s.y = Math.abs(Math.sin(t * 16 + i)) * .08; }
      } else if(s.st === 'climb'){
        const top = crownAt(s.tree).y - .6; s.up = Math.min(top, s.up + dt * 2.4); s.y = s.up; s.x = s.tree.x + .3 * s.tree.s; s.z = s.tree.z; s.f = -Math.PI / 2;
        if(s.up >= top){ s.st = 'top'; s.t = 3 + rnd() * 5; }
      } else if(s.st === 'top'){
        if(s.t <= 0 && dp > 5){ s.st = 'down'; }
      } else if(s.st === 'down'){ s.up -= dt * 2; s.y = Math.max(0, s.up); if(s.up <= 0){ s.st = 'ground'; s.x = s.tree.x + .45; s.t = 1 + rnd() * 3; } }
      const climbing = s.st === 'climb' || s.st === 'top' || s.st === 'down';
      _q.setFromEuler(climbing ? _e.set(s.st === 'down' ? Math.PI / 2 : -Math.PI / 2, -Math.PI / 2, 0, 'YXZ') : _e.set(0, s.f, 0, 'YXZ'));
      sqMesh.setMatrixAt(i, _m.compose(_v.set(s.x, s.y + (climbing ? 0 : .0), s.z), _q, _s.set(1.4, 1.4, 1.4)));
    }
    sqMesh.instanceMatrix.needsUpdate = true;
    for(let i = 0; i < NBIRD; i++){ const b = BIRDS[i]; let flap = .15;
      if(b.fly > 0){ b.fly -= dt * .55; const k = 1 - Math.max(0, b.fly); b.x = lerp(b.from.x, b.to.x, k); b.z = lerp(b.from.z, b.to.z, k); b.y = lerp(b.from.y, b.to.y, k) + Math.sin(k * Math.PI) * 4; b.f = Math.atan2(b.to.x - b.from.x, b.to.z - b.from.z); flap = Math.sin(t * 34 + i); if(b.fly <= 0){ b.wait = 3 + rnd() * 8; } }
      else { b.wait -= dt; if(b.wait <= 0 || (Math.hypot(b.x - px, b.z - pz) < 3 && b.y < 4)){ b.from = { x:b.x, y:b.y, z:b.z }; const nt = walkTrees[(rnd() * walkTrees.length) | 0]; b.to = perch(Math.hypot(nt.x - b.x, nt.z - b.z) < 30 ? nt : b.t); b.fly = 1; }
        else if(Math.sin(t * 3 + b.ph) > .97) b.f += dt * 4; }
      const hop = b.fly > 0 ? 0 : Math.max(0, Math.sin(t * 5 + b.ph)) * .03;
      _q.setFromEuler(_e.set(0, b.f, 0)); birdMesh.setMatrixAt(i, _m.compose(_v.set(b.x, b.y + hop, b.z), _q, _s.set(1.3, 1.3, 1.3)));
      wingMesh.setMatrixAt(i, _m.compose(_v.set(b.x, b.y + hop + .03, b.z), _q, _s.set(1.3, 1.3 * flap, 1.3)));
    }
    birdMesh.instanceMatrix.needsUpdate = true; wingMesh.instanceMatrix.needsUpdate = true;
  }

  const PIGEON = { x:-24, z:-1 };

  /* ---------- physics queries ---------- */
  const STEP = .5;
  function groundAt(x, z, y = 99){
    let g = pgDist(x, z) < 0 ? .08 : 0, climbing = false;
    if(inBridge(x, z)){ const h = brY(z); if(h <= y + STEP && h > g) g = h; }
    for(const f of floors){ if(Math.abs(x - f.cx) > f.br || Math.abs(z - f.cz) > f.br || !inRect(f, x, z)) continue; const h = typeof f.y === 'function' ? f.y(x, z) : f.y; if(h <= y + STEP && h > g){ g = h; climbing = !!f.climb; } }
    groundAt.climb = climbing; return g;
  }
  /* push a mover out of blockers and keep it in the walkable area (the park, the bridge, the island) */
  function collide(o, r = .35){
    for(const c of circles){ if(o.y > c.top - .05 || c.off) continue; const dx = o.x - c.x, dz = o.z - c.z; if(dx > 3 || dx < -3 || dz > 3 || dz < -3) continue; const d = Math.hypot(dx, dz), m = c.r + r; if(d < m && d > 1e-5){ o.x = c.x + dx / d * m; o.z = c.z + dz / d * m; } }
    for(const b of blocks){ if(o.y > b.top - STEP || o.y + 1.2 < b.bot) continue;
      const dx = o.x - b.cx, dz = o.z - b.cz; if(Math.abs(dx) > b.br + r || Math.abs(dz) > b.br + r) continue;
      let u = dx * b.c + dz * b.s, v = -dx * b.s + dz * b.c; const pu = b.hu + r - Math.abs(u), pv = b.hv + r - Math.abs(v);
      if(pu <= 0 || pv <= 0) continue;
      if(pu < pv) u = Math.sign(u || 1) * (b.hu + r); else v = Math.sign(v || 1) * (b.hv + r);
      o.x = b.cx + u * b.c - v * b.s; o.z = b.cz + u * b.s + v * b.c; }
    // the ramps and the deck are solid from the side: a kid on the ground can't walk into them
    if(o.x > BR.x0 - r && o.x < BR.x1 + r && o.z < BR.zFoot && o.z > BR.zEnd){
      const h = brY(o.z);
      if(o.y + STEP < h){ const xc = (BR.x0 + BR.x1) / 2; o.x = o.x < xc ? BR.x0 - r : BR.x1 + r; }
      else if(h > .4 && (o.x < BR.x0 + r || o.x > BR.x1 - r)) o.x = clamp(o.x, BR.x0 + r, BR.x1 - r);    // railings on the ramps and deck
    }
    // walkable area: the park outline (fence), the island (fence), the footbridge corridor
    const m = r + .3;
    if(inBridge(o.x, o.z, r) && o.z <= BR.zFoot && o.z >= BR.zEnd) return false;
    if(inIsland(o.x, o.z, m)) return false;
    let bd = 1e9, bi = 0, px = 0, pz = 0;
    for(let i = 0; i < NB; i++){ const a = BP[i], b = at(i + 1), dx = b[0] - a[0], dz = b[1] - a[1], l2 = dx * dx + dz * dz; const t = clamp(((o.x - a[0]) * dx + (o.z - a[1]) * dz) / l2, 0, 1); const qx = a[0] + dx * t, qz = a[1] + dz * t, d = Math.hypot(o.x - qx, o.z - qz); if(d < bd){ bd = d; bi = i; px = qx; pz = qz; } }
    const inside = inPoly(o.x, o.z);
    if(inside && bd >= m) return false;
    // candidates: back into the park, onto the island, into the bridge corridor — the nearest one
    const n = ON[bi], cand = [[px - n[0] * m, pz - n[1] * m]];
    const di = Math.hypot(o.x - I.x, o.z - I.z) || 1, ri = I.R - m; cand.push([I.x + (o.x - I.x) / di * ri, I.z + (o.z - I.z) / di * ri]);
    cand.push([clamp(o.x, BR.x0 + r, BR.x1 - r), clamp(o.z, BR.zEnd, BR.zFoot)]);
    let best = cand[0], bdd = 1e9; for(const c of cand){ const d = Math.hypot(c[0] - o.x, c[1] - o.z); if(d < bdd){ bdd = d; best = c; } }
    o.x = best[0]; o.z = best[1];
    return true;
  }

  /* ---------- day / dusk / night ---------- */
  function setNight(dusk, night){
    const lampsOn = clamp(dusk * .6 + night, 0, 1);
    glowMat.opacity = lampsOn * .95; poolMat.opacity = lampsOn * (.25 + night * .45);
    headMat.color.setRGB(.85 + lampsOn * .15, .85 + lampsOn * .1, .8); rhMat.color.setRGB(.6 + lampsOn * .4, .6 + lampsOn * .35, .58 + lampsOn * .1);
    const w = clamp(dusk * .18 + night, 0, 1);
    for(const m of nightMats) m.emissive.setRGB(w * .95, w * .82, w * .6);
  }
  let lodAcc = 0;
  function tick(t, dt, cam, P){
    stepTraffic(dt);
    const px = P ? P.x : C.x, pz = P ? P.z : C.z;
    stepCritters(t, dt, px, pz);
    lodAcc += dt; if(lodAcc > .2 || lodX > 1e8){ lodAcc = 0; treeLOD(cam ? cam.x : px, cam ? cam.z : pz, false, cam && cam.y > 50); }
  }
  treeLOD(C.x, C.z, true);
  const spawn = { x:ARRIVE.x, z:ARRIVE.z, f:ARRIVE.f };
  const LEAF_BOX = [-60, 26, -74, 44], MENU_CAM = [15, 15];
  return { group:root, C, R_RUB:PG.hu, R_RING:PG.hu + 2, BP, ENT:[], groundAt, collide, inPark, SLIDES, SWINGS, SEESAW, SPRINGS, BENCHES, PANELS:[], PITS:[], TREES, BUSHES, HIDES, LAMPS, KIOSK:null, climb, circles,
    setNight, tick, spawn, playMesh, hs, distPath, FITS, STAR_SPOTS, GATE, ARRIVE, PIGEON, LEAF_BOX, LEAF_AVOID:0, MENU_CAM, PICNIC, ISLAND:I, BRIDGE:BR, PG, VEH, SQ, BIRDS, treeLOD, pgDist, id:2 };
}
