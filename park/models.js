/* Bobo Theme Park («ملاهي بوبو 🎡»): 3D models — 8 original low-poly rides that really move (carousel, teacups,
   swing ride, small ferris wheel, bumper cars, splash boat, gentle drop tower, mini roller coaster on a looped
   preset track), 5 stalls, 6 decorations, the entrance gate and the cute instanced park visitors.
   Everything is simple shapes with vertex colours (one shared material); ride lights are instanced bulbs in warm
   gold/white only (no rainbows, no multi-colour stripes).
   makeParkModels(THREE, K) where K = makeKit(THREE) from ../worlds/kit.js.
   Model space: a footprint of w×d cells (CELL = 2) centred on the origin, the front (entrance) faces +z. */
export function makeParkModels(THREE, K){
  const { G } = K;
  const MAT = new THREE.MeshStandardMaterial({ vertexColors:true, roughness:.58, metalness:0 });
  const WATER_MAT = new THREE.MeshStandardMaterial({ color:0x5fc8f5, roughness:.1, metalness:.05, transparent:true, opacity:.88 });
  const BULB_MAT = new THREE.MeshBasicMaterial({ color:0xffffff });
  const BULB_GEO = new THREE.SphereGeometry(1, 8, 6);
  const WHITE = 0xffffff, CREAM = 0xfff1d8, GOLD = 0xffc23d, PINK = 0xff8fb1, SKY = 0x6cc4ff, MINT = 0x5ed6a0, RED = 0xe8455f, WOOD = 0x9a6b3c, LEAF = 0x5cbf54;
  const WARM = new THREE.Color(0xfff4c0), DIM = new THREE.Color(0xe0a040);
  const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _s = new THREE.Vector3(), _v = new THREE.Vector3(), _c = new THREE.Color(), UP = new THREE.Vector3(0, 1, 0);
  const CUP = new THREE.CylinderGeometry(1, .68, 1, 20), RIM = new THREE.TorusGeometry(1, .035, 6, 48), TOR = new THREE.TorusGeometry(1, .12, 8, 28);
  const L = window.L || (a => a);

  /* merge with an optional base transform (to put rotated pieces into one big static mesh) */
  const niCache = new Map(), SHARED = new Set([...Object.values(G), CUP, RIM, TOR]);
  const nonIdx = g => { if(!SHARED.has(g)) return g.index ? g.toNonIndexed() : g; let r = niCache.get(g); if(!r){ r = g.index ? g.toNonIndexed() : g; niCache.set(g, r); } return r; };
  class TM{
    constructor(){ this.p = []; this.n = []; this.c = []; this.base = new THREE.Matrix4(); this.hasBase = false; }
    setBase(x, y, z, ry){ this.base.compose(_v.set(x, y, z), _q.setFromEuler(_e.set(0, ry, 0)), _s.set(1, 1, 1)); this.hasBase = true; return this; }
    add(geo, x, y, z, sx = 1, sy = 1, sz = 1, rx = 0, ry = 0, rz = 0, color = 0xffffff){
      const g = nonIdx(geo).clone();
      _m.compose(_v.set(x, y, z), _q.setFromEuler(_e.set(rx, ry, rz)), _s.set(sx, sy, sz));
      if(this.hasBase) _m.premultiply(this.base);
      g.applyMatrix4(_m);
      const pa = g.attributes.position.array, na = g.attributes.normal.array; _c.set(color);
      for(let i = 0; i < pa.length; i++){ this.p.push(pa[i]); this.n.push(na[i]); }
      for(let i = 0; i < pa.length / 3; i++) this.c.push(_c.r, _c.g, _c.b);
      g.dispose(); return this;
    }
    get empty(){ return !this.p.length; }
    geometry(){
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3));
      g.setAttribute('normal', new THREE.Float32BufferAttribute(this.n, 3));
      g.setAttribute('color', new THREE.Float32BufferAttribute(this.c, 3));
      g.computeBoundingSphere(); return g;
    }
  }
  const mesh = (M, cast = true, recv = true, mat = MAT) => { const m = new THREE.Mesh(M.geometry(), mat); m.castShadow = cast; m.receiveShadow = recv; return m; };
  /* a box from point a to point b (thickness t) */
  function beam(M, a, b, t, col, round){
    const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2], len = Math.hypot(dx, dy, dz);
    _q.setFromUnitVectors(UP, _v.set(dx, dy, dz).normalize()); _e.setFromQuaternion(_q);
    M.add(round ? G.cyl8 : G.box, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2, t, len, t, _e.x, _e.y, _e.z, col);
  }
  /* ride lights: instanced bulbs; chase while running, soft twinkle when waiting */
  function bulbs(parent, pts, r = .075){
    const im = new THREE.InstancedMesh(BULB_GEO, BULB_MAT, pts.length);
    pts.forEach((p, i) => { _m.compose(_v.set(p[0], p[1], p[2]), _q.identity(), _s.set(r, r, r)); im.setMatrixAt(i, _m); im.setColorAt(i, WARM); });
    im.userData.n = pts.length; parent.add(im); return im;
  }
  function lights(list, T, sp){
    const step = Math.floor(T * 9);
    for(const im of list){
      const n = im.userData.n;
      for(let i = 0; i < n; i++){
        const lit = sp > .05 ? ((i + step) % 4) < 2 : Math.sin(T * 1.6 + i * .9) > -.6;
        im.setColorAt(i, lit ? WARM : DIM);
      }
      im.instanceColor.needsUpdate = true;
    }
  }
  const ring = (n, r, y, a0 = 0) => Array.from({ length:n }, (_, i) => { const a = a0 + i / n * Math.PI * 2; return [Math.sin(a) * r, y, Math.cos(a) * r]; });
  const seatAt = (parent, x, y, z, ry = 0) => { const o = new THREE.Object3D(); o.position.set(x, y, z); o.rotation.y = ry; parent.add(o); return o; };
  /* a time → track position table: speed(u) in units per second along the curve */
  function timeline(lenOf, speed, N = 400){
    const ts = new Float32Array(N + 1); let t = 0;
    for(let i = 1; i <= N; i++){ const u = (i - .5) / N; t += lenOf / N / Math.max(.05, speed(u)); ts[i] = t; }
    return { total:t, at(e){ e = ((e % t) + t) % t; let lo = 0, hi = N; while(hi - lo > 1){ const mid = (lo + hi) >> 1; if(ts[mid] <= e) lo = mid; else hi = mid; } return (lo + (e - ts[lo]) / Math.max(1e-6, ts[hi] - ts[lo])) / N; } };
  }
  const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

  /* ======================================================================
     Rides. Each returns { grp, seats:[Object3D], lights:[InstancedMesh], update(dt, T, S) }.
     S = { phase:'idle'|'load'|'run', sp:0..1 (spin speed), e:seconds into the run, dur }.
     ====================================================================== */
  function carousel(){
    const grp = new THREE.Group(), B = new TM();
    B.add(G.cyl, 0, .12, 0, 2.75, .24, 2.75, 0, 0, 0, CREAM).add(G.cyl, 0, .27, 0, 2.62, .06, 2.62, 0, 0, 0, GOLD);
    B.add(G.box, 0, .07, 2.85, 1.3, .14, .6, 0, 0, 0, CREAM);
    grp.add(mesh(B));
    const rot = new THREE.Group(); rot.position.y = .3; grp.add(rot);
    const R = new TM();
    R.add(G.cyl, 0, .05, 0, 2.45, .1, 2.45, 0, 0, 0, 0xffe6ef);
    R.add(G.cyl, 0, 1.45, 0, .36, 2.8, .36, 0, 0, 0, PINK);
    for(const y of [.25, 2.7]) R.add(G.cyl, 0, y, 0, .5, .22, .5, 0, 0, 0, GOLD);
    R.add(G.cyl, 0, 2.97, 0, 2.75, .24, 2.75, 0, 0, 0, WHITE);
    R.add(G.cone, 0, 3.66, 0, 2.9, 1.15, 2.9, 0, 0, 0, PINK);
    for(let i = 0; i < 18; i++){ const a = i / 18 * Math.PI * 2; R.add(G.sm, Math.sin(a) * 2.72, 2.8, Math.cos(a) * 2.72, .3, .2, .3, 0, 0, 0, PINK); }
    R.add(G.sph, 0, 4.32, 0, .24, .24, .24, 0, 0, 0, GOLD).add(G.cyl8, 0, 4.7, 0, .03, .7, .03, 0, 0, 0, WHITE).add(G.box, .2, 4.9, 0, .36, .22, .02, 0, 0, 0, PINK);
    for(let i = 0; i < 8; i++){ const a = i / 8 * Math.PI * 2; R.add(G.cyl8, Math.sin(a) * 1.75, 1.45, Math.cos(a) * 1.75, .045, 2.8, .045, 0, 0, 0, GOLD); }
    const rm = mesh(R); rot.add(rm);
    /* a horse, facing +z, saddle at the origin */
    const H = new TM();
    H.add(G.sph, 0, 0, 0, .2, .22, .46, 0, 0, 0, WHITE);
    H.add(G.box, 0, .2, .34, .14, .36, .16, -.5, 0, 0, WHITE);
    H.add(G.sph, 0, .38, .5, .12, .12, .2, .3, 0, 0, WHITE);
    H.add(G.sm, 0, .43, .4, .05, .14, .14, -.3, 0, 0, GOLD);
    for(const s of [-1, 1]){ H.add(G.cone4, s * .06, .52, .42, .035, .09, .035, 0, 0, 0, WHITE); for(const f of [-1, 1]) H.add(G.cyl8, s * .1, -.24, f * .26, .04, .3, .04, f * .5, 0, 0, WHITE); }
    H.add(G.sm, 0, .05, -.48, .06, .22, .06, -.8, 0, 0, GOLD);
    H.add(G.box, 0, .14, 0, .3, .07, .3, 0, 0, 0, GOLD);
    const horses = new THREE.InstancedMesh(H.geometry(), MAT, 8); horses.castShadow = true; rot.add(horses);
    const seats = [];
    for(let i = 0; i < 8; i++){ const a = i / 8 * Math.PI * 2; seats.push(seatAt(rot, Math.sin(a) * 1.75, 1.2, Math.cos(a) * 1.75, a + Math.PI / 2)); }
    const L1 = bulbs(rot, ring(24, 2.78, 2.97)), L2 = bulbs(rot, ring(10, .4, 2.0));
    let ang = 0;
    function update(dt, T, S){
      ang += S.sp * dt * 1.0; rot.rotation.y = ang;
      for(let i = 0; i < 8; i++){
        const a = i / 8 * Math.PI * 2, y = 1.0 + Math.sin(ang * 3 + i * 1.7) * .22;
        _m.compose(_v.set(Math.sin(a) * 1.75, y, Math.cos(a) * 1.75), _q.setFromEuler(_e.set(0, a + Math.PI / 2, 0)), _s.set(1, 1, 1)); horses.setMatrixAt(i, _m);
        seats[i].position.y = y + .16;
      }
      horses.instanceMatrix.needsUpdate = true;
      lights([L1, L2], T, S.sp);
    }
    update(0, 0, { sp:0 });
    return { grp, seats, update, cam:{ d:8, h:4 } };
  }

  function teacups(){
    const grp = new THREE.Group(), B = new TM();
    B.add(G.cyl, 0, .1, 0, 2.85, .2, 2.85, 0, 0, 0, CREAM).add(G.cyl, 0, .22, 0, 2.72, .05, 2.72, 0, 0, 0, SKY);
    B.add(G.box, 0, .06, 2.9, 1.2, .12, .5, 0, 0, 0, CREAM);
    for(let i = 0; i < 12; i++){ const a = i / 12 * Math.PI * 2; if(Math.abs(a - Math.PI * 0) < .2 || Math.abs(a - Math.PI * 2) < .2) continue; B.add(G.cyl8, Math.sin(a) * 2.78, .5, Math.cos(a) * 2.78, .05, .6, .05, 0, 0, 0, WHITE); }
    grp.add(mesh(B));
    const fence = new TM(); for(let i = 0; i < 12; i++){ const a1 = i / 12 * Math.PI * 2, a2 = (i + 1) / 12 * Math.PI * 2; if(i === 0 || i === 11) continue; beam(fence, [Math.sin(a1) * 2.78, .8, Math.cos(a1) * 2.78], [Math.sin(a2) * 2.78, .8, Math.cos(a2) * 2.78], .07, WHITE, true); }
    grp.add(mesh(fence, false));
    const rot = new THREE.Group(); rot.position.y = .25; grp.add(rot);
    const R = new TM();
    R.add(G.cyl, 0, .05, 0, 2.5, .1, 2.5, 0, 0, 0, 0xd8f3ff);
    R.add(G.sph, 0, .55, 0, .55, .45, .55, 0, 0, 0, WHITE).add(G.sph, 0, .98, 0, .22, .14, .22, 0, 0, 0, PINK).add(G.sm, 0, 1.12, 0, .07, .07, .07, 0, 0, 0, GOLD);
    R.add(G.cyl8, .6, .7, 0, .07, .5, .07, 0, 0, -.9, WHITE).add(G.torus, -.55, .6, 0, .2, .2, .2, 0, 0, 0, WHITE);
    rot.add(mesh(R));
    const cols = [PINK, SKY, 0xffd23f], cups = [], seats = [];
    for(let k = 0; k < 3; k++){
      const a = k / 3 * Math.PI * 2, holder = new THREE.Group(); holder.position.set(Math.sin(a) * 1.55, .1, Math.cos(a) * 1.55); rot.add(holder);
      const spin = new THREE.Group(); holder.add(spin);
      const C = new TM();
      C.add(G.cyl, 0, .08, 0, .45, .16, .45, 0, 0, 0, WHITE);
      C.add(CUP, 0, .5, 0, .78, .62, .78, 0, 0, 0, cols[k]);
      C.add(RIM, 0, .81, 0, .78, .78, .78, Math.PI / 2, 0, 0, WHITE);
      C.add(G.torus, .82, .52, 0, .2, .2, .25, 0, 0, Math.PI / 2, cols[k]);
      C.add(G.cyl, 0, .35, 0, .62, .05, .62, 0, 0, 0, 0xfff6e6);
      C.add(G.box, 0, .45, -.3, .9, .3, .12, 0, 0, 0, 0xfff6e6);
      const cm = mesh(C); spin.add(cm); cups.push(spin);
      seats.push(seatAt(spin, -.25, .36, -.05, 0), seatAt(spin, .25, .36, -.05, 0));
    }
    const L1 = bulbs(grp, ring(20, 2.78, .9));
    let ang = 0, spinA = 0;
    function update(dt, T, S){
      ang += S.sp * dt * .7; spinA += S.sp * dt * 2.1; rot.rotation.y = ang;
      cups.forEach((c, k) => { c.rotation.y = spinA * (k % 2 ? -1 : 1) + k; });
      lights([L1], T, S.sp);
    }
    return { grp, seats, update, cam:{ d:8, h:4.5 } };
  }

  function swings(){
    const grp = new THREE.Group(), B = new TM();
    B.add(G.cyl, 0, .1, 0, 1.3, .2, 1.3, 0, 0, 0, CREAM).add(G.cyl, 0, 2.2, 0, .3, 4.3, .3, 0, 0, 0, WHITE);
    for(const y of [.4, 2.2, 4.1]) B.add(G.cyl, 0, y, 0, .4, .16, .4, 0, 0, 0, MINT);
    B.add(G.cyl, 0, .03, 0, 2.95, .06, 2.95, 0, 0, 0, 0xd8f3c8);
    grp.add(mesh(B));
    const top = new THREE.Group(); top.position.y = 4.35; grp.add(top);
    const R = new TM();
    R.add(G.cone, 0, .55, 0, 1.75, .9, 1.75, 0, 0, 0, MINT).add(G.cyl, 0, .05, 0, 1.6, .2, 1.6, 0, 0, 0, WHITE);
    for(let i = 0; i < 16; i++){ const a = i / 16 * Math.PI * 2; R.add(G.sm, Math.sin(a) * 1.62, -.06, Math.cos(a) * 1.62, .2, .15, .2, 0, 0, 0, MINT); }
    R.add(G.sph, 0, 1.1, 0, .2, .2, .2, 0, 0, 0, GOLD);
    top.add(mesh(R));
    const SW = new TM();
    for(const s of [-1, 1]) SW.add(G.cyl8, s * .17, -.95, 0, .015, 1.9, .015, 0, 0, 0, 0xc9ccd6);
    SW.add(G.box, 0, -1.92, 0, .42, .07, .4, 0, 0, 0, SKY).add(G.box, 0, -1.72, -.18, .42, .38, .06, 0, 0, 0, SKY).add(G.cyl8, 0, -1.75, .18, .025, .4, .025, 0, 0, Math.PI / 2, WHITE);
    const swGeo = SW.geometry(), tilts = [], seats = [];
    for(let i = 0; i < 8; i++){
      const a = i / 8 * Math.PI * 2, piv = new THREE.Group(); piv.position.set(Math.sin(a) * 1.3, -.02, Math.cos(a) * 1.3); piv.rotation.y = a; top.add(piv);
      const tilt = new THREE.Group(); piv.add(tilt); tilts.push(tilt);
      const m = new THREE.Mesh(swGeo, MAT); m.castShadow = true; m.rotation.y = Math.PI / 2; tilt.add(m);
      seats.push(seatAt(tilt, 0, -1.86, 0, Math.PI / 2));
    }
    const L1 = bulbs(top, ring(20, 1.62, .06));
    let ang = 0, tl = 0;
    function update(dt, T, S){
      ang += S.sp * dt * 1.5; top.rotation.y = ang;
      tl += (S.sp * .8 - tl) * Math.min(1, dt * 2.5);
      for(const t of tilts) t.rotation.x = -tl;
      lights([L1], T, S.sp);
    }
    return { grp, seats, update, cam:{ d:9, h:5 } };
  }

  function ferris(){
    const grp = new THREE.Group(), B = new TM(), HUB = 3.2, RAD = 2.45;
    B.add(G.box, 0, .1, 0, 5.6, .2, 3.4, 0, 0, 0, CREAM).add(G.box, 0, .23, 0, 5.4, .06, 3.2, 0, 0, 0, SKY);
    B.add(G.box, 0, .07, 1.85, 1.4, .14, .5, 0, 0, 0, CREAM);
    for(const z of [-.62, .62]) for(const x of [-1.9, 1.9]) beam(B, [x, .2, z * 1.4], [0, HUB, z], .16, WHITE);
    B.add(G.cyl, 0, HUB, 0, .22, 1.6, .22, Math.PI / 2, 0, 0, GOLD);
    grp.add(mesh(B));
    const wheel = new THREE.Group(); wheel.position.set(0, HUB, 0); grp.add(wheel);
    const W = new TM();
    for(const z of [-.42, .42]){ W.add(RIM, 0, 0, z, RAD, RAD, RAD, 0, 0, 0, WHITE); W.add(RIM, 0, 0, z, RAD * .55, RAD * .55, RAD * .55, 0, 0, 0, WHITE); for(let i = 0; i < 8; i++){ const a = i / 8 * Math.PI * 2; beam(W, [0, 0, z], [Math.cos(a) * RAD, Math.sin(a) * RAD, z], .06, WHITE); } }
    for(let i = 0; i < 8; i++){ const a = i / 8 * Math.PI * 2; W.add(G.cyl8, Math.cos(a) * RAD, Math.sin(a) * RAD, 0, .05, .9, .05, Math.PI / 2, 0, 0, GOLD); }
    W.add(G.sph, 0, 0, .5, .3, .3, .12, 0, 0, 0, PINK).add(G.sph, 0, 0, -.5, .3, .3, .12, 0, 0, 0, PINK);
    wheel.add(mesh(W));
    const LP = []; for(let i = 0; i < 28; i++){ const a = i / 28 * Math.PI * 2; LP.push([Math.cos(a) * RAD, Math.sin(a) * RAD, .48]); }
    const L1 = bulbs(wheel, LP, .07);
    const GD = new TM();
    GD.add(G.cyl8, 0, -.12, 0, .03, .3, .03, 0, 0, 0, 0xc9ccd6);
    GD.add(G.cyl, 0, -.62, 0, .42, .5, .32, 0, 0, 0, SKY).add(G.cyl, 0, -.88, 0, .44, .06, .34, 0, 0, 0, WHITE);
    GD.add(G.cone, 0, -.22, 0, .46, .22, .36, 0, 0, 0, WHITE).add(G.box, 0, -.66, -.18, .6, .3, .06, 0, 0, 0, 0xfff6e6);
    const gond = new THREE.InstancedMesh(GD.geometry(), MAT, 8); gond.castShadow = true; grp.add(gond);
    const seats = []; for(let i = 0; i < 8; i++) seats.push(seatAt(grp, 0, 0, 0, 0));
    let ang = 0;
    function update(dt, T, S){
      ang += S.sp * dt * .45; wheel.rotation.z = ang;
      for(let i = 0; i < 8; i++){
        const a = i / 8 * Math.PI * 2 + ang, x = Math.cos(a) * RAD, y = HUB + Math.sin(a) * RAD;
        _m.compose(_v.set(x, y, 0), _q.setFromEuler(_e.set(0, 0, Math.sin(T * 1.3 + i) * .04 * S.sp)), _s.set(1, 1, 1)); gond.setMatrixAt(i, _m);
        seats[i].position.set(x, y - .72, .02);
      }
      gond.instanceMatrix.needsUpdate = true;
      lights([L1], T, S.sp);
    }
    update(0, 0, { sp:0 });
    return { grp, seats, update, cam:{ d:10, h:4 } };
  }

  function bumper(){
    const grp = new THREE.Group(), B = new TM(), HW = 3.7, HD = 2.7;
    B.add(G.box, 0, .08, 0, HW * 2 + .3, .16, HD * 2 + .3, 0, 0, 0, 0x8fa3cf);
    for(const [x, z, w, d] of [[0, -HD, HW * 2, .2], [-HW, 0, .2, HD * 2], [HW, 0, .2, HD * 2], [-HW / 2 - .5, HD, HW - 1, .2], [HW / 2 + .5, HD, HW - 1, .2]]){ B.add(G.box, x, .38, z, w, .44, d, 0, 0, 0, WHITE); B.add(G.box, x, .62, z, w + .04, .08, d + .04, 0, 0, 0, GOLD); }
    for(const x of [-HW, HW]) for(const z of [-HD, HD]){ B.add(G.cyl8, x, 1.65, z, .09, 3.3, .09, 0, 0, 0, WHITE); }
    for(const z of [-HD, HD]) B.add(G.box, 0, 3.3, z, HW * 2 + .2, .16, .16, 0, 0, 0, PINK);
    for(const x of [-HW, HW]) B.add(G.box, x, 3.3, 0, .16, .16, HD * 2 + .2, 0, 0, 0, PINK);
    for(let i = 1; i < 6; i++) B.add(G.box, -HW + i * HW / 3, 3.3, 0, .04, .04, HD * 2, 0, 0, 0, 0xc9ccd6);
    B.add(G.box, 0, .07, HD + .45, 1.3, .14, .6, 0, 0, 0, CREAM);
    grp.add(mesh(B));
    const LP = []; for(let i = 0; i < 14; i++){ const x = -HW + i / 13 * HW * 2; LP.push([x, 3.42, -HD], [x, 3.42, HD]); } for(let i = 1; i < 9; i++){ const z = -HD + i / 9 * HD * 2; LP.push([-HW, 3.42, z], [HW, 3.42, z]); }
    const L1 = bulbs(grp, LP);
    const cols = [RED, SKY, 0xffd23f, MINT, PINK, 0xb99cff].slice(0, 6);
    const cars = [], seats = [];
    for(let k = 0; k < 6; k++){
      const C = new TM();
      C.add(G.box, 0, .28, 0, .9, .32, 1.2, 0, 0, 0, cols[k]).add(G.box, 0, .5, -.28, .8, .4, .3, 0, 0, 0, cols[k]);
      C.add(G.torus, 0, .2, 0, .62, .78, .9, Math.PI / 2, 0, 0, 0x4a4f63);
      C.add(G.box, 0, .45, .1, .6, .08, .5, 0, 0, 0, 0xfff6e6).add(G.cyl8, 0, .6, .38, .03, .25, .03, -.6, 0, 0, 0x4a4f63).add(G.torus, 0, .72, .46, .12, .12, .12, -.6, 0, 0, 0x4a4f63);
      C.add(G.cyl8, 0, 1.9, -.38, .02, 2.8, .02, 0, 0, 0, 0xc9ccd6).add(G.sm, 0, 3.25, -.38, .07, .07, .07, 0, 0, 0, GOLD);
      const m = mesh(C); grp.add(m);
      const x0 = -2.6 + k * 1.05;
      cars.push({ m, x:x0, z:-1.6, a:0, hx:x0, hz:-1.6, tx:0, tz:0, tt:0, v:0 });
      seats.push(seatAt(m, 0, .3, -.05, 0));
      m.position.set(x0, 0, -1.6);
    }
    let bumpCd = 0;
    const api = { grp, seats, update, cam:{ d:9, h:6 }, onBump:null };
    function update(dt, T, S){
      bumpCd -= dt;
      for(const c of cars){
        if(S.sp > .02){
          c.tt -= dt; if(c.tt <= 0 || Math.hypot(c.tx - c.x, c.tz - c.z) < .6){ c.tt = 1.2 + Math.random() * 2; c.tx = (Math.random() - .5) * (HW * 2 - 1.4); c.tz = (Math.random() - .5) * (HD * 2 - 1.4); }
          const want = Math.atan2(c.tx - c.x, c.tz - c.z); let d = want - c.a; while(d > Math.PI) d -= Math.PI * 2; while(d < -Math.PI) d += Math.PI * 2;
          c.a += d * Math.min(1, dt * 2.5); c.v += (1.7 * S.sp - c.v) * Math.min(1, dt * 3);
        } else {
          c.v *= Math.max(0, 1 - dt * 3);
          if(S.phase !== 'run'){ c.x += (c.hx - c.x) * Math.min(1, dt * 1.5); c.z += (c.hz - c.z) * Math.min(1, dt * 1.5); let d = 0 - c.a; while(d > Math.PI) d -= Math.PI * 2; while(d < -Math.PI) d += Math.PI * 2; c.a += d * Math.min(1, dt * 2); }
        }
        c.x += Math.sin(c.a) * c.v * dt; c.z += Math.cos(c.a) * c.v * dt;
        const lx = HW - .65, lz = HD - .75;
        if(Math.abs(c.x) > lx){ c.x = Math.sign(c.x) * lx; c.a = -c.a; }
        if(Math.abs(c.z) > lz){ c.z = Math.sign(c.z) * lz; c.a = Math.PI - c.a; }
      }
      for(let i = 0; i < cars.length; i++) for(let j = i + 1; j < cars.length; j++){
        const a = cars[i], b = cars[j], dx = b.x - a.x, dz = b.z - a.z, d = Math.hypot(dx, dz);
        if(d < 1.15 && d > 1e-4){ const p = (1.15 - d) / 2; a.x -= dx / d * p; a.z -= dz / d * p; b.x += dx / d * p; b.z += dz / d * p;
          if(S.sp > .3 && bumpCd <= 0){ bumpCd = .35; a.a += Math.PI * .6; b.a -= Math.PI * .6; if(api.onBump) api.onBump((a.x + b.x) / 2, (a.z + b.z) / 2); } }
      }
      for(const c of cars){ c.m.position.set(c.x, 0, c.z); c.m.rotation.y = c.a; c.m.rotation.z = Math.sin(T * 9 + c.x) * .03 * S.sp; }
      lights([L1], T, S.sp);
    }
    return api;
  }

  function splash(){
    const grp = new THREE.Group(), A = 3.0, BZ = 2.1, N = 72;
    const hOf = u => .32 + 2.1 * smooth(.16, .44, u) - 2.1 * smooth(.56, .64, u);
    const ptOf = (u, out) => { const a = Math.PI / 2 + u * Math.PI * 2; return out.set(Math.cos(a) * A, hOf(u), Math.sin(a) * BZ); };
    const B = new TM(), Wt = new TM();
    B.add(G.box, 0, .05, 0, 7.6, .1, 5.6, 0, 0, 0, 0xd8f3c8);
    const p0 = new THREE.Vector3(), p1 = new THREE.Vector3();
    for(let i = 0; i < N; i++){
      ptOf(i / N, p0); ptOf((i + 1) / N, p1);
      const dx = p1.x - p0.x, dz = p1.z - p0.z, dy = p1.y - p0.y, len = Math.hypot(dx, dz), ry = Math.atan2(dx, dz), rx = -Math.atan2(dy, len), mx = (p0.x + p1.x) / 2, my = (p0.y + p1.y) / 2, mz = (p0.z + p1.z) / 2;
      const ox = Math.cos(ry) * .5, oz = -Math.sin(ry) * .5, segL = Math.hypot(len, dy) + .08;
      B.add(G.box, mx, my - .12, mz, 1.1, .12, segL, rx, ry, 0, WOOD);
      for(const s of [-1, 1]) B.add(G.box, mx + ox * s * 1.0, my + .08, mz + oz * s * 1.0, .1, .42, segL, rx, ry, 0, 0xc98a52);
      Wt.add(G.box, mx, my - .02, mz, .92, .06, segL, rx, ry, 0, 0x5fc8f5);
      if(my > .7 && i % 3 === 0) for(const s of [-1, 1]) B.add(G.cyl8, mx + ox * s * .9, (my - .2) / 2, mz + oz * s * .9, .06, my - .2, .06, 0, 0, 0, WHITE);
    }
    /* the splash pool at the bottom of the drop and a little hut at the station */
    { const u = .66; ptOf(u, p0); B.add(G.cyl, p0.x, .06, p0.z, 1.3, .12, 1.0, 0, 0, 0, 0xb8e6ff); }
    B.add(G.box, 0, .07, BZ + .9, 1.3, .14, .6, 0, 0, 0, CREAM);
    for(const s of [-1, 1]) B.add(G.cyl8, s * .9, .9, BZ + .5, .06, 1.8, .06, 0, 0, 0, WHITE);
    B.add(G.box, 0, 1.85, BZ + .5, 2.2, .1, .9, -.15, 0, 0, SKY);
    grp.add(mesh(B));
    const wm = new THREE.Mesh(Wt.geometry(), MAT); wm.receiveShadow = true; grp.add(wm);
    const lift = []; for(let i = 0; i < 8; i++){ ptOf(.18 + i * .033, p0); lift.push([p0.x, p0.y + .7, p0.z]); }
    for(const s of [-1, 1]) lift.push([s * .9, 1.95, BZ + .5]);
    const L1 = bulbs(grp, lift, .08);
    const BT = new TM();
    BT.add(G.box, 0, .18, 0, .78, .3, 1.7, 0, 0, 0, WOOD).add(G.sph, 0, .2, .82, .38, .2, .26, 0, 0, 0, WOOD).add(G.sph, 0, .2, -.82, .38, .2, .26, 0, 0, 0, WOOD);
    BT.add(G.box, 0, .36, 0, .64, .06, 1.4, 0, 0, 0, 0xffd9a8);
    for(const z of [-.35, .35]) BT.add(G.box, 0, .45, z - .2, .66, .2, .06, 0, 0, 0, 0xc98a52);
    BT.add(G.cyl8, 0, .65, .86, .03, .5, .03, 0, 0, 0, WHITE).add(G.box, 0, .8, .96, .02, .18, .22, 0, 0, 0, RED);
    const boat = mesh(BT); grp.add(boat);
    const seats = [];
    for(const z of [.35, -.35]) for(const x of [-.17, .17]) seats.push(seatAt(boat, x, .36, z - .05, 0));
    const curveLen = (() => { let l = 0; for(let i = 0; i < 200; i++){ ptOf(i / 200, p0); ptOf((i + 1) / 200, p1); l += p0.distanceTo(p1); } return l; })();
    const TL = timeline(curveLen, u => (u > .14 && u < .46) ? 1.1 : (u > .55 && u < .66) ? 6 : u > .9 ? 1.4 : 2.6);
    const api = { grp, seats, update, cam:{ d:9, h:5 }, onSplash:null, runDur:TL.total + 1.2 };
    let u = 0, splashed = false;
    function update(dt, T, S){
      if(S.phase === 'run'){ u = Math.min(.9999, TL.at(Math.min(S.e, TL.total - .001))); if(S.e >= TL.total) u = 0; }
      else u = 0;
      ptOf(u, p0); ptOf(u + .004, p1);
      boat.position.copy(p0); boat.position.y -= .02 - Math.sin(T * 2.4) * .03;
      const dx = p1.x - p0.x, dz = p1.z - p0.z; boat.rotation.set(0, Math.atan2(dx, dz), 0); boat.rotateX(-Math.atan2(p1.y - p0.y, Math.hypot(dx, dz)));
      if(u > .63 && u < .7 && !splashed){ splashed = true; if(api.onSplash) api.onSplash(p0.x, p0.z); }
      if(u < .5) splashed = false;
      lights([L1], T, S.phase === 'run' ? 1 : 0);
    }
    update(0, 0, { phase:'idle' });
    return api;
  }

  function drop(){
    const grp = new THREE.Group(), B = new TM(), TOP = 6.4;
    B.add(G.cyl, 0, .1, 0, 1.85, .2, 1.85, 0, 0, 0, CREAM).add(G.cyl, 0, .22, 0, 1.75, .05, 1.75, 0, 0, 0, PINK);
    B.add(G.cyl, 0, TOP / 2, 0, .36, TOP, .36, 0, 0, 0, WHITE);
    B.add(G.cyl, 0, TOP + .15, 0, .62, .3, .62, 0, 0, 0, PINK).add(G.cone, 0, TOP + .75, 0, .62, .9, .62, 0, 0, 0, PINK).add(G.sph, 0, TOP + 1.28, 0, .14, .14, .14, 0, 0, 0, GOLD);
    for(let i = 0; i < 4; i++){ const a = i / 4 * Math.PI * 2 + Math.PI / 4; beam(B, [Math.sin(a) * 1.4, .2, Math.cos(a) * 1.4], [Math.sin(a) * .3, 2.6, Math.cos(a) * .3], .1, WHITE, true); }
    B.add(G.box, 0, .07, 1.95, 1.2, .14, .5, 0, 0, 0, CREAM);
    grp.add(mesh(B));
    const L1 = bulbs(grp, Array.from({ length:16 }, (_, i) => { const a = (i % 2) * Math.PI; return [Math.sin(a) * .38, .8 + Math.floor(i / 2) * .72, Math.cos(a) * .38]; }), .07);
    const car = new THREE.Group(); grp.add(car);
    const C = new TM();
    C.add(TOR, 0, 0, 0, .62, .62, .9, Math.PI / 2, 0, 0, PINK).add(G.cyl, 0, 0, 0, .5, .3, .5, 0, 0, 0, WHITE);
    for(let i = 0; i < 6; i++){ const a = i / 6 * Math.PI * 2, x = Math.sin(a) * .95, z = Math.cos(a) * .95; C.add(G.box, x, -.05, z, .42, .08, .4, 0, a, 0, SKY); C.add(G.box, Math.sin(a) * .74, .18, Math.cos(a) * .74, .42, .45, .07, 0, a, 0, SKY); C.add(G.cyl8, Math.sin(a) * 1.15, .1, Math.cos(a) * 1.15, .025, .38, .025, 0, 0, 0, GOLD); }
    car.add(mesh(C));
    const seats = []; for(let i = 0; i < 6; i++){ const a = i / 6 * Math.PI * 2; seats.push(seatAt(car, Math.sin(a) * .95, .0, Math.cos(a) * .95, a)); }
    const BASE = .6;
    const yOf = k => {
      if(k < .38) return BASE + (5.3 - BASE) * smooth(0, .38, k);
      if(k < .5) return 5.3 + Math.sin((k - .38) * 40) * .03;
      if(k < .58) return 5.3 - 4.1 * smooth(.5, .58, k);
      if(k < .7) return 1.2 + 1.3 * Math.sin((k - .58) / .12 * Math.PI);
      if(k < .78) return 1.2 + .5 * Math.sin((k - .7) / .08 * Math.PI);
      return 1.2 - (1.2 - BASE) * smooth(.78, .92, k);
    };
    const api = { grp, seats, update, cam:{ d:8, h:4 }, runDur:15, onDrop:null };
    let dropped = false;
    function update(dt, T, S){
      const k = S.phase === 'run' ? Math.min(1, S.e / api.runDur) : 0;
      car.position.y = yOf(k); car.rotation.y = k * .6;
      if(k > .5 && k < .52 && !dropped){ dropped = true; if(api.onDrop) api.onDrop(); }
      if(k < .4) dropped = false;
      lights([L1], T, S.phase === 'run' ? 1 : 0);
    }
    update(0, 0, { phase:'idle' });
    return api;
  }

  /* the mini roller coaster: a looped preset track with a lift hill, a drop, a bunny hill and a station at the front */
  function coaster(){
    const grp = new THREE.Group();
    const P = [[-2.4, .95, 3.0], [0, .95, 3.15], [2.3, 1.0, 3.0], [3.9, 1.45, 1.9], [4.2, 2.5, -.1], [3.7, 3.55, -2.3], [2.0, 3.85, -3.25], [.2, 2.4, -3.3], [-1.5, .95, -2.9], [-3.0, 1.95, -2.2], [-4.1, 1.5, -.5], [-4.0, 1.0, 1.6]];
    const curve = new THREE.CatmullRomCurve3(P.map(p => new THREE.Vector3(p[0], p[1], p[2])), true, 'centripetal');
    const NS = 260, pts = curve.getSpacedPoints(NS), len = curve.getLength();
    const side = [], tan = [];
    for(let i = 0; i < NS; i++){ const t = curve.getTangentAt(i / NS); tan.push(t); side.push(new THREE.Vector3().crossVectors(t, UP).normalize()); }
    const M = new TM();
    M.add(G.box, 0, .04, 0, 9.6, .08, 7.6, 0, 0, 0, 0xd8f3c8);
    for(const s of [-1, 1]){
      const rail = new THREE.CatmullRomCurve3(pts.slice(0, NS).map((p, i) => p.clone().addScaledVector(side[i], s * .3)), true);
      M.add(new THREE.TubeGeometry(rail, 300, .055, 6, true), 0, 0, 0, 1, 1, 1, 0, 0, 0, RED);
    }
    const spine = new THREE.CatmullRomCurve3(pts.slice(0, NS).map(p => p.clone().add(_v.set(0, -.16, 0))), true);
    M.add(new THREE.TubeGeometry(spine, 300, .09, 6, true), 0, 0, 0, 1, 1, 1, 0, 0, 0, RED);
    for(let i = 0; i < NS; i += 2){ const p = pts[i], t = tan[i]; M.add(G.box, p.x, p.y - .06, p.z, .74, .05, .1, 0, Math.atan2(t.x, t.z), 0, 0x5a5f7a); }
    for(let i = 0; i < NS; i += 9){ const p = pts[i]; if(p.y < .55) continue; M.add(G.cyl8, p.x, (p.y - .2) / 2, p.z, .07, p.y - .2, .07, 0, 0, 0, WHITE); M.add(G.cyl8, p.x, .05, p.z, .16, .1, .16, 0, 0, 0, WHITE); }
    /* the station */
    M.add(G.box, 0, .45, 3.75, 4.6, .9, .9, 0, 0, 0, CREAM).add(G.box, 0, .92, 3.75, 4.7, .06, 1.0, 0, 0, 0, SKY);
    for(const x of [-2.1, 2.1]) M.add(G.cyl8, x, 1.9, 3.95, .07, 1.9, .07, 0, 0, 0, WHITE);
    M.add(G.box, 0, 2.9, 3.4, 4.8, .12, 1.8, .12, 0, 0, RED);
    grp.add(mesh(M));
    const L1 = bulbs(grp, Array.from({ length:12 }, (_, i) => [-2.2 + i * .4, 2.98, 4.28]), .07);
    const cars = [], seats = [];
    for(let k = 0; k < 3; k++){
      const C = new TM();
      C.add(G.box, 0, .22, 0, .78, .34, .95, 0, 0, 0, k ? GOLD : 0xffb020).add(G.box, 0, .44, -.38, .74, .3, .12, 0, 0, 0, k ? GOLD : 0xffb020);
      if(!k){ C.add(G.sph, 0, .24, .5, .4, .2, .24, 0, 0, 0, 0xffb020); C.add(G.sm, .2, .28, .62, .07, .07, .03, 0, 0, 0, WHITE).add(G.sm, -.2, .28, .62, .07, .07, .03, 0, 0, 0, WHITE); }
      C.add(G.box, 0, .4, .02, .62, .06, .7, 0, 0, 0, 0xfff6e6).add(G.cyl8, 0, .6, .3, .025, .62, .025, 0, 0, Math.PI / 2, 0x4a4f63);
      for(const z of [-.3, .3]) for(const x of [-.3, .3]) C.add(G.cyl8, x, .02, z, .08, .06, .08, 0, 0, Math.PI / 2, 0x4a4f63);
      const m = mesh(C); grp.add(m); cars.push(m);
      for(const x of [-.16, .16]) seats.push(seatAt(m, x, .38, -.08, 0));
    }
    const hMax = Math.max(...P.map(p => p[1]));
    const liftU = [.2, .47];
    const TL = timeline(len, u => (u > liftU[0] && u < liftU[1]) ? 1.15 : 1.6 + 3.4 * Math.sqrt(Math.max(0, hMax + .3 - curve.getPointAt(u).y) / hMax));
    const api = { grp, seats, update, cam:{ d:11, h:6 }, runDur:TL.total * 2 + .6, curve, onWhoosh:null };
    const tmpM = new THREE.Matrix4(), aim = new THREE.Vector3();
    let lastU = 0;
    function update(dt, T, S){
      let u = 0;
      if(S.phase === 'run' && S.e < TL.total * 2) u = TL.at(S.e);
      cars.forEach((m, k) => {
        const uk = ((u * len - k * 1.02) / len % 1 + 1) % 1;
        curve.getPointAt(uk, m.position); curve.getTangentAt(uk, aim);
        tmpM.lookAt(_v.copy(m.position).add(aim), m.position, UP); m.quaternion.setFromRotationMatrix(tmpM);
      });
      if(S.phase === 'run' && lastU < .5 && u >= .5 && api.onWhoosh) api.onWhoosh();
      lastU = u;
      lights([L1], T, S.phase === 'run' ? 1 : 0);
    }
    update(0, 0, { phase:'idle' });
    return api;
  }

  const RIDE_BUILD = { carousel, teacups, swings, ferris, bumper, splash, drop, coaster };

  /* ======================================================================
     Stalls and decorations: static pieces added into one big merged mesh (TM with a base transform)
     ====================================================================== */
  function kiosk(M, roofCol, bodyCol = CREAM){
    M.add(G.box, 0, .5, -.1, 1.5, 1.0, 1.0, 0, 0, 0, bodyCol).add(G.box, 0, 1.02, .05, 1.65, .08, 1.15, 0, 0, 0, WHITE);
    M.add(G.box, 0, .5, .41, 1.3, .5, .03, 0, 0, 0, roofCol);
    for(const s of [-1, 1]) M.add(G.cyl8, s * .72, 1.5, .5, .04, 1.0, .04, 0, 0, 0, WHITE);
    M.add(G.box, 0, 2.0, .15, 1.75, .1, 1.25, -.12, 0, 0, roofCol);
    for(let i = 0; i < 7; i++) M.add(G.sm, -.75 + i * .25, 1.92, .78, .13, .1, .08, 0, 0, 0, roofCol);
  }
  const STATIC = {
    ice(M){ kiosk(M, PINK); M.add(G.cone, 0, 2.55, -.15, .3, .7, .3, Math.PI, 0, 0, 0xe0a860).add(G.sph, 0, 3.0, -.15, .33, .3, .33, 0, 0, 0, 0xffc4da).add(G.sph, 0, 3.25, -.15, .26, .22, .26, 0, 0, 0, 0xffc4da).add(G.sm, 0, 3.48, -.15, .08, .08, .08, 0, 0, 0, RED); },
    popcorn(M){ kiosk(M, RED); M.add(G.cyl8, 0, 2.55, -.15, .36, .7, .3, 0, Math.PI / 8, 0, RED); for(let i = 0; i < 9; i++) M.add(G.ico, Math.sin(i * 2.4) * .22, 2.95 + (i % 3) * .08, -.15 + Math.cos(i * 2.4) * .18, .13, .13, .13, i, i, 0, 0xfff6d8); },
    juice(M){ kiosk(M, 0xffa63d); M.add(G.cyl, 0, 2.6, -.15, .3, .7, .3, 0, 0, 0, 0xffa63d).add(G.cyl, 0, 2.97, -.15, .33, .06, .33, 0, 0, 0, WHITE).add(G.cyl8, .08, 3.25, -.15, .03, .55, .03, 0, 0, .25, WHITE).add(G.cyl, -.3, 2.85, -.15, .16, .04, .16, Math.PI / 2, 0, .3, 0xffd23f); },
    balloons(M){ kiosk(M, SKY); const b = [[0, 3.3, -.2, RED], [-.35, 3.05, -.1, SKY], [.35, 3.1, -.25, 0xffd23f], [-.15, 2.85, .1, PINK], [.2, 2.9, .05, MINT]];
      for(const [x, y, z, c] of b){ M.add(G.sph, x, y, z, .24, .3, .24, 0, 0, 0, c); beam(M, [x, y - .3, z], [0, 2.05, .1], .015, WHITE, true); } },
    toilets(M){ M.add(G.box, 0, .8, -.05, 1.7, 1.6, 1.5, 0, 0, 0, 0xe8f4ff).add(G.box, 0, 1.66, -.05, 1.9, .14, 1.7, 0, 0, 0, SKY);
      M.add(G.box, -.4, .62, .71, .55, 1.15, .05, 0, 0, 0, SKY).add(G.box, .4, .62, .71, .55, 1.15, .05, 0, 0, 0, PINK);
      for(const [x, c] of [[-.4, SKY], [.4, PINK]]){ M.add(G.sm, x, 1.42, .74, .1, .1, .03, 0, 0, 0, WHITE); M.add(G.box, x, 1.2, .74, .14, .2, .02, 0, 0, 0, WHITE); M.add(G.sm, x + .15, .62, .76, .04, .04, .03, 0, 0, 0, GOLD); }
      M.add(G.box, 0, 1.9, -.05, 1.2, .3, 1.2, 0, 0, 0, SKY); },
    tree(M, v){ const s = .9 + (v % 3) * .12; M.add(G.cyl8, 0, .7 * s, 0, .16, 1.4 * s, .16, 0, 0, 0, WOOD).add(G.ico1, 0, 1.95 * s, 0, .95 * s, .9 * s, .95 * s, 0, v, 0, v % 2 ? LEAF : 0x4fae4a).add(G.ico1, .25 * s, 2.65 * s, -.15 * s, .55 * s, .52 * s, .55 * s, 0, v + 1, 0, 0x7ad46a); },
    flowers(M, v){ const col = [PINK, 0xffd23f, WHITE, 0xb99cff][v % 4]; M.add(G.cyl, 0, .12, 0, .85, .24, .85, 0, 0, 0, 0x9a6b44).add(G.cyl, 0, .25, 0, .8, .04, .8, 0, 0, 0, 0x6fbf4f);
      for(let i = 0; i < 11; i++){ const a = i * 2.4, r = .2 + (i % 3) * .2, x = Math.sin(a) * r, z = Math.cos(a) * r; M.add(G.cyl8, x, .38, z, .02, .26, .02, 0, 0, 0, 0x4caa3e).add(G.sm, x, .52, z, .1, .07, .1, 0, 0, 0, col).add(G.sm, x, .55, z, .04, .03, .04, 0, 0, 0, 0xffd23f); } },
    fountain(M){ M.add(G.cyl, 0, .25, 0, 1.75, .5, 1.75, 0, 0, 0, 0xe6e2da).add(G.cyl, 0, .48, 0, 1.55, .06, 1.55, 0, 0, 0, 0x8fd8ff);
      M.add(G.cyl, 0, .9, 0, .2, 1.0, .2, 0, 0, 0, 0xe6e2da).add(G.cyl, 0, 1.4, 0, .75, .14, .75, 0, 0, 0, 0xe6e2da).add(G.cyl, 0, 1.48, 0, .62, .04, .62, 0, 0, 0, 0x8fd8ff).add(G.sph, 0, 1.7, 0, .18, .25, .18, 0, 0, 0, 0xe6e2da); },
    lamp(M){ M.add(G.cyl8, 0, .12, 0, .2, .24, .2, 0, 0, 0, 0x4a4f63).add(G.cyl8, 0, 1.3, 0, .06, 2.4, .06, 0, 0, 0, 0x4a4f63).add(G.sph, 0, 2.55, 0, .22, .25, .22, 0, 0, 0, 0xfff1b0).add(G.cone, 0, 2.86, 0, .26, .2, .26, 0, 0, 0, 0x4a4f63); },
    bench(M){ M.add(G.box, 0, .42, 0, 1.4, .08, .45, 0, 0, 0, 0xc98a52).add(G.box, 0, .72, -.22, 1.4, .3, .06, -.15, 0, 0, 0xc98a52);
      for(const s of [-1, 1]){ M.add(G.box, s * .6, .22, 0, .08, .42, .4, 0, 0, 0, 0x4a4f63); M.add(G.box, s * .6, .6, -.2, .08, .4, .06, -.15, 0, 0, 0x4a4f63); } },
    bin(M){ M.add(G.cyl, 0, .35, 0, .26, .7, .26, 0, 0, 0, MINT).add(G.cyl, 0, .72, 0, .3, .06, .3, 0, 0, 0, 0x2a9c74).add(G.box, 0, .4, .25, .16, .16, .02, 0, 0, 0, WHITE); }
  };
  function addStatic(M, kind, x, z, ry, v = 0){ M.setBase(x, 0, z, ry); STATIC[kind](M, v); }

  /* ======================================================================
     The entrance gate (fixed, at the front of the park), with a sign drawn on a canvas
     ====================================================================== */
  function gate(signTex){
    const grp = new THREE.Group(), M = new TM();
    for(const s of [-1, 1]){
      const x = s * 3.0;
      M.add(G.cyl, x, 2.0, 0, .55, 4.0, .55, 0, 0, 0, WHITE).add(G.cyl, x, 4.05, 0, .68, .2, .68, 0, 0, 0, PINK).add(G.cone, x, 4.75, 0, .7, 1.2, .7, 0, 0, 0, PINK).add(G.sph, x, 5.45, 0, .14, .14, .14, 0, 0, 0, GOLD);
      M.add(G.cyl, x, .2, 0, .7, .4, .7, 0, 0, 0, PINK);
      M.add(G.cyl8, x, 5.8, 0, .03, .7, .03, 0, 0, 0, WHITE).add(G.box, x + .2, 5.98, 0, .38, .24, .02, 0, 0, 0, s < 0 ? SKY : MINT);
    }
    M.add(G.box, 0, 4.35, 0, 6.6, 1.1, .4, 0, 0, 0, PINK).add(G.box, 0, 4.95, 0, 6.8, .12, .5, 0, 0, 0, WHITE).add(G.box, 0, 3.75, 0, 6.8, .12, .5, 0, 0, 0, WHITE);
    for(let i = 0; i < 9; i++) M.add(G.sm, -2.4 + i * .6, 5.15, 0, .22, .22, .22, 0, 0, 0, i % 2 ? WHITE : GOLD);
    /* ticket booth */
    M.add(G.box, 5.2, .8, .8, 1.4, 1.6, 1.2, 0, 0, 0, CREAM).add(G.box, 5.2, 1.0, 1.42, 1.0, .6, .05, 0, 0, 0, 0xa8dcff).add(G.box, 5.2, 1.7, .9, 1.7, .12, 1.5, 0, 0, 0, PINK).add(G.cone, 5.2, 2.15, .9, 1.1, .8, 1.0, 0, Math.PI / 4, 0, PINK);
    const gm = mesh(M); grp.add(gm);
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(6.2, 1.0), new THREE.MeshBasicMaterial({ map:signTex, transparent:true }));
    sign.position.set(0, 4.35, .22); grp.add(sign);
    const sign2 = sign.clone(); sign2.position.z = -.22; sign2.rotation.y = Math.PI; grp.add(sign2);
    const L1 = bulbs(grp, [...Array.from({ length:12 }, (_, i) => [-3 + i * 6 / 11, 3.62, .26]), ...Array.from({ length:12 }, (_, i) => [-3 + i * 6 / 11, 3.62, -.26])], .07);
    return { grp, update(T){ lights([L1], T, 1); } };
  }

  /* ======================================================================
     Park visitors: 6 instanced parts (legs ×2, torso, arms ×2, head, hair, held balloon) — drawn by the game
     ====================================================================== */
  function visitorParts(max){
    const mk = (geo, n, mat) => { const m = new THREE.InstancedMesh(geo, mat || new THREE.MeshStandardMaterial({ roughness:.6 }), n); m.castShadow = true; m.frustumCulled = false; m.count = 0; return m; };
    const leg = new THREE.BoxGeometry(.13, .42, .15); leg.translate(0, -.21, 0);
    const arm = new THREE.CapsuleGeometry(.05, .26, 3, 8); arm.translate(0, -.16, 0);
    const torso = new THREE.CylinderGeometry(.16, .21, .44, 12);
    const head = new THREE.SphereGeometry(.2, 16, 12);
    const hair = new THREE.SphereGeometry(.215, 14, 8, 0, Math.PI * 2, 0, Math.PI * .55);
    const ball = new THREE.SphereGeometry(.22, 12, 10); ball.scale(1, 1.18, 1);
    const str = new THREE.CylinderGeometry(.008, .008, .9, 4); str.translate(0, .45, 0);
    const eyes = new THREE.BoxGeometry(.2, .05, .02);
    return {
      legs:mk(leg, max * 2), arms:mk(arm, max * 2), torso:mk(torso, max), head:mk(head, max), hair:mk(hair, max),
      eyes:mk(eyes, max, new THREE.MeshBasicMaterial({ vertexColors:true })),
      ball:mk(ball, max, new THREE.MeshStandardMaterial({ roughness:.25, metalness:.05 })), str:mk(str, max, new THREE.MeshBasicMaterial({ color:0xffffff }))
    };
  }

  /* ---------- catalogue: names, footprints, prices, unlocks (rating stars), what each does ---------- */
  const R = (o) => Object.assign({ cat:'ride' }, o);
  const CAT = {
    carousel:R({ e:'🎠', name:L('دوّارة الخيول', 'Carousel', 'Atlıkarınca'), w:3, d:3, price:120, need:0, ticket:3, fun:.7, run:12 }),
    teacups: R({ e:'☕', name:L('الفناجين الدوّارة', 'Teacups', 'Dönen fincanlar'), w:3, d:3, price:220, need:1, ticket:4, fun:.75, run:12 }),
    swings:  R({ e:'💺', name:L('المراجيح الطايرة', 'Swing ride', 'Uçan salıncak'), w:3, d:3, price:350, need:1.5, ticket:5, fun:.8, run:13 }),
    ferris:  R({ e:'🎡', name:L('دولاب الهوا', 'Ferris wheel', 'Dönme dolap'), w:3, d:2, price:500, need:2, ticket:6, fun:.8, run:16 }),
    bumper:  R({ e:'🚗', name:L('سيارات التصادم', 'Bumper cars', 'Çarpışan arabalar'), w:4, d:3, price:650, need:2.5, ticket:6, fun:.85, run:14 }),
    splash:  R({ e:'🛶', name:L('قارب الشلال', 'Splash boat', 'Su kayığı'), w:4, d:3, price:850, need:3, ticket:8, fun:.9, run:0 }),
    drop:    R({ e:'🗼', name:L('البرج الطاير', 'Drop tower', 'Kule'), w:2, d:2, price:1000, need:3.5, ticket:8, fun:.9, run:0 }),
    coaster: R({ e:'🎢', name:L('قطار الأفعوانية', 'Roller coaster', 'Hız treni'), w:5, d:4, price:1500, need:4, ticket:12, fun:1, run:0 }),
    ice:     { cat:'stall', e:'🍦', name:L('بوظة', 'Ice cream', 'Dondurma'), w:1, d:1, price:40, need:0, sell:3, sat:'hunger' },
    popcorn: { cat:'stall', e:'🍿', name:L('فشار', 'Popcorn', 'Patlamış mısır'), w:1, d:1, price:60, need:1, sell:3, sat:'hunger' },
    juice:   { cat:'stall', e:'🧃', name:L('عصير', 'Juice', 'Meyve suyu'), w:1, d:1, price:50, need:1, sell:2, sat:'thirst' },
    balloons:{ cat:'stall', e:'🎈', name:L('بالونات', 'Balloons', 'Balonlar'), w:1, d:1, price:80, need:2, sell:4, sat:'balloon' },
    toilets: { cat:'stall', e:'🚻', name:L('حمّامات', 'Toilets', 'Tuvalet'), w:1, d:1, price:70, need:1.5, sell:1, sat:'toilet' },
    tree:    { cat:'deco', e:'🌳', name:L('شجرة', 'Tree', 'Ağaç'), w:1, d:1, price:10, need:0, beauty:2 },
    flowers: { cat:'deco', e:'🌷', name:L('ورد', 'Flowers', 'Çiçekler'), w:1, d:1, price:8, need:0, beauty:2 },
    bin:     { cat:'deco', e:'🗑️', name:L('سلّة زبالة', 'Bin', 'Çöp kutusu'), w:1, d:1, price:10, need:0, beauty:.5 },
    bench:   { cat:'deco', e:'🪑', name:L('مقعد', 'Bench', 'Bank'), w:1, d:1, price:15, need:0, beauty:1 },
    lamp:    { cat:'deco', e:'💡', name:L('عمود ضو', 'Lamp', 'Lamba'), w:1, d:1, price:15, need:.5, beauty:1 },
    fountain:{ cat:'deco', e:'⛲', name:L('نافورة', 'Fountain', 'Çeşme'), w:2, d:2, price:90, need:1.5, beauty:6 }
  };
  const KINDS = Object.keys(CAT);
  return { MAT, WATER_MAT, TM, CAT, KINDS, RIDE_BUILD, addStatic, gate, visitorParts, bulbs, lights, beam };
}
