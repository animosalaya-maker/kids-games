/* Surprise Island («جزيرة المفاجآت») — the island map.
   A round island village: a plaza with a fountain, 4 houses you can walk into (flat roofs with outside stairs),
   a terraced hill, a small hill, a tall look-out tower with spiral steps, stone walls, rocks, crates, benches,
   stepping stones, a wooden pier and the «شرفة المشجعين» spectator balcony on tall stilts.
   Everything that can be stood on or bumped into is an axis-aligned box or an upright cylinder (BOX / CYL).
   Also returned: perches (low things to stand on), high spots with routes (for the bots), shelters (wind). */
export const ISL_R = 30.3;                    // you can walk up to here (plus the pier)
export const PIER = { x0:-1.6, x1:1.6, z0:26, z1:41, y:.35 };
export const BAL = { x0:17.4, x1:23.6, z0:12.6, z1:17.4, y:10 };    // the spectator balcony (top surface)
export const LAVA_Y = .14;

export function buildIsland(THREE, K){
  const { Merge, G, canvasTex } = K;
  const grp = new THREE.Group();
  const MAT = new THREE.MeshStandardMaterial({ vertexColors:true, roughness:.82, metalness:0 });
  const MATF = new THREE.MeshStandardMaterial({ vertexColors:true, roughness:.9, flatShading:true });
  const BOX = [], CYL = [], perches = [], highs = [], shelters = [], houses = [], spawns = [];
  let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const PI = Math.PI;
  const _c = new THREE.Color(), _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _v = new THREE.Vector3(), _s = new THREE.Vector3(), _e = new THREE.Euler();
  const mesh = (M, mat = MAT, cast = true, recv = true) => { const m = new THREE.Mesh(M.geometry(), mat); m.castShadow = cast; m.receiveShadow = recv; grp.add(m); return m; };
  const S = new Merge(), N = new Merge(), FL = new Merge();     // S: built things, N: nature (flat shaded), FL: flat ground decals
  const sbox = (M, x0, x1, z0, z1, y0, y1, col, tag) => { M.add(G.box, (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2, x1 - x0, y1 - y0, z1 - z0, 0, 0, 0, col); const b = { x0, x1, z0, z1, y0, y1, tag }; BOX.push(b); return b; };
  const scyl = (M, x, z, r, y0, y1, col, geo = G.cyl, tag) => { M.add(geo, x, (y0 + y1) / 2, z, r, y1 - y0, r, 0, 0, 0, col); const c = { x, z, r, y0, y1, tag }; CYL.push(c); return c; };
  const perch = (x, z, y, r = .5) => perches.push({ x, z, y, r });

  /* ---------- ground: grass disc, sandy beach sloping into the sea ---------- */
  {
    const g = new THREE.CircleGeometry(28.4, 80); g.rotateX(-PI / 2);
    const pa = g.attributes.position, col = new Float32Array(pa.count * 3), a = new THREE.Color(0x96d86a), b = new THREE.Color(0x7cc95a);
    for(let i = 0; i < pa.count; i++){ const x = pa.getX(i), z = pa.getZ(i), n = (Math.sin(x * .21) + Math.cos(z * .17) + Math.sin((x + z) * .09)) / 3 * .5 + .5; _c.copy(a).lerp(b, n * .8); col.set([_c.r, _c.g, _c.b], i * 3); }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors:true, roughness:1 })); m.receiveShadow = true; m.position.y = .005; grp.add(m);
    const r = new THREE.RingGeometry(27.6, 38, 80, 6); r.rotateX(-PI / 2);
    const rp = r.attributes.position, rc = new Float32Array(rp.count * 3), s1 = new THREE.Color(0xffe7b0), s2 = new THREE.Color(0xf2d08f);
    for(let i = 0; i < rp.count; i++){ const x = rp.getX(i), z = rp.getZ(i), d = Math.hypot(x, z); rp.setY(i, d < 29 ? -.005 : -(d - 29) * .16); _c.copy(s1).lerp(s2, Math.min(1, Math.max(0, (d - 29) / 6))); rc.set([_c.r, _c.g, _c.b], i * 3); }
    r.setAttribute('color', new THREE.BufferAttribute(rc, 3)); r.computeVertexNormals();
    const rm = new THREE.Mesh(r, new THREE.MeshStandardMaterial({ vertexColors:true, roughness:1 })); rm.receiveShadow = true; grp.add(rm);
  }
  /* the sea (moves up in the «المي طالعة» event) */
  const seaTex = canvasTex(256, 256, x => {
    x.fillStyle = '#ffffff'; x.fillRect(0, 0, 256, 256);
    x.strokeStyle = 'rgba(120,190,230,.55)'; x.lineWidth = 5; x.lineCap = 'round';
    for(let i = 0; i < 26; i++){ const cx = (i * 97) % 256, cy = (i * 57) % 256; x.beginPath(); x.arc(cx, cy, 10 + (i % 4) * 4, PI * 1.15, PI * 1.85); x.stroke(); }
  });
  seaTex.wrapS = seaTex.wrapT = THREE.RepeatWrapping; seaTex.repeat.set(40, 40);
  const sea = new THREE.Mesh(new THREE.CircleGeometry(420, 64), new THREE.MeshStandardMaterial({ color:0x58c6f0, map:seaTex, roughness:.25, metalness:.05, transparent:true, opacity:.9, depthWrite:false }));
  sea.rotation.x = -PI / 2; sea.position.y = -.5; sea.receiveShadow = true; sea.renderOrder = 1; grp.add(sea);

  /* ---------- plaza, paths ---------- */
  const PZ = { x:0, z:2 };
  { const d = new THREE.Mesh(new THREE.CircleGeometry(6.6, 48), new THREE.MeshStandardMaterial({ color:0xf6e3c0, roughness:1 })); d.rotation.x = -PI / 2; d.position.set(PZ.x, .02, PZ.z); d.receiveShadow = true; grp.add(d); }
  const path = (x1, z1, x2, z2, w = 1.8) => { const L2 = Math.hypot(x2 - x1, z2 - z1); FL.add(G.box, (x1 + x2) / 2, .015, (z1 + z2) / 2, w, .03, L2, 0, Math.atan2(x2 - x1, z2 - z1), 0, 0xf3dcb0); };
  path(0, 2, -9.5, -3); path(0, 2, 9.5, -3); path(0, 2, -7, 10.5); path(0, 2, 7, 10.5); path(0, 2, 0, 27); path(0, 2, -3, -9); path(4, -1, 13.5, -10.5, 1.4);
  /* fountain: basin (stand on it), column, bowl on top */
  scyl(S, PZ.x, PZ.z, 1.7, 0, .7, 0xe9eef2, G.cyl, 'fountain'); perch(PZ.x + 1.3, PZ.z, .7, .3);
  S.add(G.cyl, PZ.x, .66, PZ.z, 1.45, .1, 1.45, 0, 0, 0, 0x8fdcff);
  scyl(S, PZ.x, PZ.z, .35, .7, 1.5, 0xdfe6ea, G.cyl8); scyl(S, PZ.x, PZ.z, .95, 1.5, 1.8, 0xe9eef2, G.cyl, 'fountain');
  S.add(G.cyl, PZ.x, 1.79, PZ.z, .8, .04, .8, 0, 0, 0, 0x8fdcff);
  /* benches around the plaza */
  for(const [x, z, ax] of [[0, -3.9, 1], [-5.4, 2, 0], [5.4, 2, 0], [-3.9, 6.1, 1]]){
    const hx = ax ? 1.0 : .32, hz = ax ? .32 : 1.0;
    sbox(S, x - hx, x + hx, z - hz, z + hz, 0, .5, 0xe0a060); perch(x, z, .5, .3);
    for(const s of [-1, 1]) S.add(G.box, x + (ax ? s * .8 : 0), .22, z + (ax ? 0 : s * .8), ax ? .12 : .5, .44, ax ? .5 : .12, 0, 0, 0, 0x9a6b3c);
  }
  /* lamp posts */
  for(const [x, z] of [[4.8, -2.6], [-4.8, -2.6], [4.8, 6.6], [-4.8, 6.6]]){ scyl(S, x, z, .12, 0, 2.6, 0x4a5a6a, G.cyl8); S.add(G.sm, x, 2.75, z, .28, .28, .28, 0, 0, 0, 0xfff3b0); }

  /* ---------- houses (walk in through the door, stairs outside up to the flat roof) ---------- */
  const STAIR_C = 0xd9a46a;
  function house(cx, cz, k, wallC, roofC, trimC, furnC){
    const tf = (lx, lz) => k === 0 ? [cx + lx, cz + lz] : k === 1 ? [cx - lz, cz + lx] : k === 2 ? [cx - lx, cz - lz] : [cx + lz, cz - lx];
    const wb = (lx0, lx1, lz0, lz1) => { const a = tf(lx0, lz0), b = tf(lx1, lz1); return [Math.min(a[0], b[0]), Math.max(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[1], b[1])]; };
    const W = new Merge(), R = new Merge();
    const lb = (M, lx0, lx1, lz0, lz1, y0, y1, col, solid = true) => { const [x0, x1, z0, z1] = wb(lx0, lx1, lz0, lz1); if(solid) return sbox(M, x0, x1, z0, z1, y0, y1, col, 'house'); M.add(G.box, (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2, x1 - x0, y1 - y0, z1 - z0, 0, 0, 0, col); return null; };
    const HX = 3, HZ = 2.5, H = 3, T = .3;
    lb(W, -HX, HX, -HZ, -HZ + T, 0, H, wallC); lb(W, -HX, HX, HZ - T, HZ, 0, H, wallC); lb(W, -HX, -HX + T, -HZ, HZ, 0, H, wallC);
    lb(W, HX - T, HX, -HZ, -.85, 0, H, wallC); lb(W, HX - T, HX, .85, HZ, 0, H, wallC); lb(W, HX - T, HX, -.85, .85, 2.25, H, wallC, false);
    // trims: door frame, windows (sky blue glass with white frames), flower boxes
    lb(W, HX - .02, HX + .06, -.98, -.85, 0, 2.38, trimC, false); lb(W, HX - .02, HX + .06, .85, .98, 0, 2.38, trimC, false); lb(W, HX - .02, HX + .06, -.98, .98, 2.25, 2.38, trimC, false);
    for(const [a0, a1, side] of [[-2.2, -.9, 1], [.9, 2.2, 1], [-2.2, -.9, -1], [.9, 2.2, -1]]){
      const lz = side > 0 ? HZ : -HZ, o = side > 0 ? 0 : -.06;
      lb(W, a0, a1, lz + o - .01, lz + o + .07, 1.25, 2.15, 0xa8dcff, false);
      lb(W, (a0 + a1) / 2 - .05, (a0 + a1) / 2 + .05, lz + o - .02, lz + o + .09, 1.25, 2.15, 0xffffff, false);
      lb(W, a0 - .08, a1 + .08, lz + o - .02, lz + o + .09, 1.17, 1.27, 0xffffff, false);
      if(side > 0){ lb(W, a0, a1, lz, lz + .3, .9, 1.15, 0x9a6b3c, false); for(let i = 0; i < 5; i++){ const [fx, fz] = tf(a0 + .15 + i * (a1 - a0 - .3) / 4, lz + .15); W.add(G.sm, fx, 1.22, fz, .09, .08, .09, 0, 0, 0, trimC); } }
    }
    lb(W, -HX - .05, -HX + .03, -1, 1, 1.25, 2.15, 0xa8dcff, false);
    // floor, rug and furniture (always visible)
    lb(S, -HX + T, HX - T, -HZ + T, HZ - T, 0, .1, 0xe8c597);
    lb(FL, -1.2, 1.4, -.9, .9, .1, .12, furnC, false);
    const fb = (lx0, lx1, lz0, lz1, y1, col) => { const b = lb(S, lx0, lx1, lz0, lz1, 0, y1, col); perch((b.x0 + b.x1) / 2, (b.z0 + b.z1) / 2, y1, Math.min(b.x1 - b.x0, b.z1 - b.z0) / 2 - .05); return b; };
    fb(-2.6, -.9, 1.25, 2.2, .55, 0xffd1dc); lb(S, -2.6, -2.25, 1.25, 2.2, .55, .78, 0xffffff, false);                     // bed + pillow
    fb(-1.2, 0, -2.2, -1.25, .8, 0xc98a52); lb(S, -.95, -.6, -1.85, -1.55, .8, 1.0, 0xffffff, false);                       // table + cup
    fb(-2.7, -1.95, -1.6, .5, .6, furnC);                                                                                   // sofa
    fb(.4, 1.0, -2.2, -1.6, .5, 0xe0a060);                                                                                  // chair
    lb(S, .9, 2.4, 1.9, 2.2, 0, 1.8, 0xb07a4c); for(const y of [.6, 1.2]) lb(S, .95, 2.35, 1.85, 2.1, y, y + .25, 0xffe08a, false);   // shelf with books
    // roof slab (hidden while you are inside), rim, chimney
    lb(R, -HX - .2, HX + .2, -HZ - .2, HZ + .2, H, H + .25, roofC);
    for(const [a0, a1, b0, b1] of [[-HX - .2, HX + .2, HZ + .02, HZ + .2], [-HX - .2, -HX - .02, -HZ - .2, HZ + .2], [HX + .02, HX + .2, -HZ - .2, HZ + .2]]) lb(R, a0, a1, b0, b1, H + .25, H + .5, roofC, false);
    lb(R, -2.2, -1.5, .8, 1.5, H + .25, H + 1.1, 0xc96a52, false);
    // outside stairs along the back (-z local), rising toward the door side
    for(let i = 0; i < 8; i++){ const b = lb(S, -HX + i * .75, -HX + (i + 1) * .75, -HZ - 1.1, -HZ, 0, .4 * (i + 1), STAIR_C); if(i < 3) perch((b.x0 + b.x1) / 2, (b.z0 + b.z1) / 2, b.y1, .3); }
    const wallMat = MAT.clone(), roofMat = MAT.clone();
    const wm = mesh(W, wallMat), rm = mesh(R, roofMat);
    const [x0, x1, z0, z1] = wb(-HX, HX, -HZ, HZ);
    const P = (lx, lz) => { const [x, z] = tf(lx, lz); return { x, z }; };
    const hs = { x0, x1, z0, z1, walls:wm, roof:rm, wallMat, roofMat, door:P(HX + 1.3, 0), inside:P(.4, 0), cx, cz, fade:0 };
    houses.push(hs);
    highs.push({ kind:'roof', y:H + .25, x:cx, z:cz, r:2, route:[P(-HX - .8, -HZ - .55), P(-HX + .45, -HZ - .55), P(HX - .4, -HZ - .55), P(.2, -.3)] });
    shelters.push({ x:cx, z:cz, hx:(x1 - x0) / 2, hz:(z1 - z0) / 2 });
    return hs;
  }
  house(-13, -3, 0, 0xfff1d8, 0xff8a65, 0xff8fb1, 0xffc9a8);
  house(13, -3, 2, 0xdff5e8, 0x3fb59e, 0xffd23f, 0xbfe9d9);
  house(-7, 14, 3, 0xffe8f0, 0xb48cf0, 0x6cc4ff, 0xe3d4ff);
  house(8, 14, 3, 0xe6f3ff, 0x4f9fe0, 0xff8a65, 0xcfe6ff);

  /* ---------- terraced hills ---------- */
  const hill = (x, z, rs, step) => {
    rs.forEach((r, i) => {
      const y1 = step * (i + 1);
      scyl(N, x, z, r, 0, y1, i % 2 ? 0x74c257 : 0x6bb84f, G.cyl, 'hill');
      N.add(G.cyl, x, y1 + .03, z, r + .06, .08, r + .06, 0, 0, 0, i % 2 ? 0x9ee07a : 0x92d86f);
      perch(x + (r - .45) * Math.cos(i * 1.7), z + (r - .45) * Math.sin(i * 1.7), y1, .35);
      for(let f = 0; f < r * 2; f++){ const a = rnd() * PI * 2, d = (rs[i + 1] || 0) + .3 + rnd() * (r - (rs[i + 1] || 0) - .5); FL.add(G.sm, x + Math.cos(a) * d, y1 + .1, z + Math.sin(a) * d, .1, .07, .1, 0, 0, 0, [0xffffff, 0xffd23f, 0xff8fb1][f % 3]); }
      if(y1 >= 2.7) highs.push({ kind:'hill', y:y1, x, z, r:Math.max(.8, (r + (rs[i + 1] || 0)) / 2 - .2), ring:!!rs[i + 1] });
    });
    shelters.push({ x, z, r:rs[0] - .2, round:true });
  };
  hill(-4, -17, [8, 6.2, 4.4, 2.8, 1.4], .9);
  hill(-19, 10, [5, 3.4, 1.8], .9);
  // a flag on the big hill
  S.add(G.cyl8, -4, 5.8, -17, .07, 2.6, .07, 0, 0, 0, 0xffffff); S.add(G.box, -3.45, 6.7, -17, 1, .65, .05, 0, 0, 0, 0xffc23d);

  /* ---------- the look-out tower with spiral steps ---------- */
  const TW = { x:16, z:-14, top:8.5 };
  {
    scyl(S, TW.x, TW.z, 1.8, 0, TW.top, 0xfff6e6, G.cyl, 'tower');
    for(const y of [2.2, 4.6, 7]) S.add(G.box, TW.x, y, TW.z + 1.78, .5, .7, .08, 0, 0, 0, 0x6cc4ff);
    scyl(S, TW.x, TW.z, 2.7, TW.top - .3, TW.top, 0x3fb59e, G.cyl, 'tower');
    const route = [];
    const n = 20, a0 = PI * .5, da = .33;
    for(let i = 0; i < n; i++){
      const a = a0 + i * da, x = TW.x + Math.cos(a) * 3, z = TW.z + Math.sin(a) * 3, y = .425 * (i + 1);
      scyl(S, x, z, .78, y - .3, y, i % 2 ? 0xd59a5e : 0xc98a52, G.cyl8, 'pad');
      S.add(G.box, TW.x + Math.cos(a) * 2.05, y - .22, TW.z + Math.sin(a) * 2.05, 1.1, .14, .3, 0, -a, 0, 0xb07a4c);
      if(i < 2) perch(x, z, y, .4);
      if(i % 3 === 0 || i === n - 1) route.push({ x, z });
    }
    const ae = a0 + (n - 1) * da;
    route.unshift({ x:TW.x + Math.cos(a0 - .5) * 4.2, z:TW.z + Math.sin(a0 - .5) * 4.2 });
    route.push({ x:TW.x + Math.cos(ae) * 1.6, z:TW.z + Math.sin(ae) * 1.6 });
    highs.push({ kind:'tower', y:TW.top, x:TW.x, z:TW.z, r:1.2, route });
    // railing posts on the platform (visual) and a flag
    for(let i = 0; i < 16; i++){ const a = i / 16 * PI * 2; if(Math.abs(Math.atan2(Math.sin(a - ae), Math.cos(a - ae))) < .5) continue; S.add(G.cyl8, TW.x + Math.cos(a) * 2.55, TW.top + .35, TW.z + Math.sin(a) * 2.55, .06, .7, .06, 0, 0, 0, 0xffffff); }
    S.add(G.cyl8, TW.x, TW.top + 1.6, TW.z, .08, 3.2, .08, 0, 0, 0, 0xffffff); S.add(G.box, TW.x + .6, TW.top + 2.8, TW.z, 1.1, .7, .05, 0, 0, 0, 0xff8a65);
    shelters.push({ x:TW.x, z:TW.z, r:1.8, round:true });
  }

  /* ---------- stone walls, rocks, crates, barrels, picnic table, stepping stones ---------- */
  for(const [x0, x1, z0, z1] of [[-4.5, .5, -7.6, -7], [19.4, 20, -2.5, 2.5], [-2, 3, 20.6, 21.2], [-22, -21.4, -7, -2]]){
    sbox(S, x0, x1, z0, z1, 0, 1.8, 0xd8cbb8, 'wall');
    for(let i = 0; i < 6; i++){ const t = (i + .5) / 6; S.add(G.box, x0 + (x1 - x0) * (x1 - x0 > 1 ? t : .5), 1.85, z0 + (z1 - z0) * (z1 - z0 > 1 ? t : .5), x1 - x0 > 1 ? (x1 - x0) / 6.3 : x1 - x0 + .08, .14, z1 - z0 > 1 ? (z1 - z0) / 6.3 : z1 - z0 + .08, 0, 0, 0, 0xc4b59e); }
    shelters.push({ x:(x0 + x1) / 2, z:(z0 + z1) / 2, hx:(x1 - x0) / 2, hz:(z1 - z0) / 2 });
  }
  for(const [x, z, r, h] of [[-18, -12, 1.3, 1.2], [6, -20, 1.1, .95], [22, 7, 1.2, 1.1], [-23, 0, 1, .85], [14, 21, 1.1, 1], [-13, 21, 1.2, 1.2], [3, 24.5, .9, .75], [-9, -12, 1, .9], [24, -5, 1, .9], [-15, -18, .9, .8]]){
    scyl(N, x, z, r, 0, h, 0xb9b3a8, G.cyl8, 'rock'); N.add(G.dode, x + .1, h - .05, z - .1, r * .95, .35, r * .95, 0, rnd() * 3, 0, 0xc9c3b8);
    perch(x, z, h, r * .6); if(r >= 1.1) shelters.push({ x, z, r, round:true });
  }
  const crate = (x, z, h = .9, s = .5) => { sbox(S, x - s, x + s, z - s, z + s, 0, h, 0xd59a5e, 'crate'); for(let y = .45; y < h; y += .9){ S.add(G.box, x, y, z, s * 2 + .04, .12, s * 2 + .04, 0, 0, 0, 0xb07a4c); } perch(x, z, h, s - .1); };
  crate(3.6, 23.5); crate(4.8, 23.6, 1.8); crate(-3.2, 23.4); crate(-9.3, -7.6); crate(9.6, .9); crate(-3.2, 17.8); crate(11.8, 18.2, 1.8); crate(-16.5, 4.5); crate(17.5, 3.8);
  for(const [x, z] of [[6.8, -6.5], [-6.8, 9.6], [-1.5, 25], [17, 8.6], [-20.5, -9]]){ scyl(S, x, z, .45, 0, 1, 0x8fd06a, G.cyl, 'barrel'); S.add(G.cyl, x, .5, z, .47, .08, .47, 0, 0, 0, 0x6e9e4a); perch(x, z, 1, .3); }
  { const x = -6.5, z = 6.6; sbox(S, x - .9, x + .9, z - .55, z + .55, 0, .78, 0xe0a060); perch(x, z, .78, .4); for(const s of [-1, 1]){ sbox(S, x - .9, x + .9, z + s * .95 - .2, z + s * .95 + .2, 0, .45, 0xc98a52); } }
  for(let i = 0; i < 8; i++){ const z = 9.5 + i * 2.1, x = Math.sin(i * 1.3) * .9; scyl(S, x, z, .62, 0, .3, 0xd8d2c8, G.cyl8, 'stone'); perch(x, z, .3, .4); }

  /* ---------- the pier ---------- */
  {
    const p = PIER;
    sbox(S, p.x0, p.x1, p.z0, p.z1, -3, p.y, 0xd6a46c, 'pier');
    for(let z = p.z0 + .5; z < p.z1; z += .7) S.add(G.box, 0, p.y + .005, z, p.x1 - p.x0 - .05, .01, .06, 0, 0, 0, 0xb98652);
    for(let z = p.z0 + 2; z <= p.z1; z += 3) for(const s of [-1, 1]){ S.add(G.cyl8, s * 1.55, 0, z, .14, 2.2, .14, 0, 0, 0, 0x9a6b3c); }
    for(let i = 0; i < 5; i++) perch(0, p.z0 + 2 + i * 3, p.y, .8);
    crate(.8, 35.2, 1.15); BOX[BOX.length - 1].y0 = p.y - .01; crate(-.8, 38.6, 1.15); BOX[BOX.length - 1].y0 = p.y - .01;
    // a lifebuoy (single colour) on a post
    S.add(G.cyl8, -1.3, 1, p.z1 - .3, .08, 1.3, .08, 0, 0, 0, 0xffffff); S.add(G.torus, -1.3, 1.3, p.z1 - .2, .32, .32, .5, 0, 0, 0, 0xff8a65);
  }

  /* ---------- the spectator balcony (high on stilts, no stairs: only bubbles get you there) ---------- */
  {
    const b = BAL, cx = (b.x0 + b.x1) / 2, cz = (b.z0 + b.z1) / 2;
    sbox(S, b.x0, b.x1, b.z0, b.z1, b.y - .4, b.y, 0xffd27a, 'balcony');
    S.add(G.box, cx, b.y + .005, cz, b.x1 - b.x0 - .3, .01, b.z1 - b.z0 - .3, 0, 0, 0, 0xffe2a6);
    for(const [x, z] of [[b.x0 + .4, b.z0 + .4], [b.x1 - .4, b.z0 + .4], [b.x0 + .4, b.z1 - .4], [b.x1 - .4, b.z1 - .4]]){ scyl(S, x, z, .28, 0, b.y - .4, 0xffffff, G.cyl8, 'stilt'); S.add(G.cyl8, x, b.y + 1.6, z, .08, 3.2, .08, 0, 0, 0, 0xffffff); }
    for(const [x0, x1, z0, z1] of [[b.x0, b.x1, b.z0, b.z0 + .1], [b.x0, b.x1, b.z1 - .1, b.z1], [b.x0, b.x0 + .1, b.z0, b.z1], [b.x1 - .1, b.x1, b.z0, b.z1]]) S.add(G.box, (x0 + x1) / 2, b.y + .9, (z0 + z1) / 2, x1 - x0, .12, z1 - z0, 0, 0, 0, 0xffffff);
    for(let i = 0; i <= 12; i++){ const x = b.x0 + (b.x1 - b.x0) * i / 12; for(const z of [b.z0 + .05, b.z1 - .05]) S.add(G.box, x, b.y + .45, z, .06, .9, .06, 0, 0, 0, 0xffffff); }
    // awning (one colour) on top
    S.add(G.box, cx, b.y + 3.25, cz, b.x1 - b.x0 + .6, .18, b.z1 - b.z0 + .6, 0, 0, 0, 0x6cc4ff);
    for(let i = 0; i < 7; i++) S.add(G.sm, b.x0 - .1 + i * (b.x1 - b.x0 + .2) / 6, b.y + 3.1, b.z0 - .3, .2, .2, .2, 0, 0, 0, 0x6cc4ff);
    for(let i = 0; i < 7; i++) S.add(G.sm, b.x0 - .1 + i * (b.x1 - b.x0 + .2) / 6, b.y + 3.1, b.z1 + .3, .2, .2, .2, 0, 0, 0, 0x6cc4ff);
  }

  /* ---------- trees and palms (instanced crowns), flowers ---------- */
  const T = [];
  const tree = (x, z, s) => { T.push([x, z, s]); CYL.push({ x, z, r:.3 * s, y0:0, y1:2.2 * s, tag:'tree' }); };
  for(const [x, z] of [[-18.5, 3], [15.5, 8], [-17, -6], [20, -8], [-11, 19], [15, 13], [2, -10], [-24, 6], [10, -18], [-14, -13], [21, 1], [-1, 14.5]]) tree(x, z, .9 + rnd() * .35);
  const trunk = new THREE.InstancedMesh(new THREE.CylinderGeometry(.2, .3, 1.8, 7), new THREE.MeshStandardMaterial({ color:0x9a6b3c, roughness:.9 }), T.length);
  const crown = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1.2, 1), new THREE.MeshStandardMaterial({ roughness:.8, flatShading:true }), T.length * 2);
  T.forEach(([x, z, s], i) => {
    _m.compose(_v.set(x, .9 * s, z), _q.identity(), _s.set(s, s, s)); trunk.setMatrixAt(i, _m);
    _m.compose(_v.set(x, 2.5 * s, z), _q.setFromEuler(_e.set(0, i, 0)), _s.set(s, s * .95, s)); crown.setMatrixAt(i * 2, _m); crown.setColorAt(i * 2, _c.set(i % 3 ? 0x5cbf54 : 0x4fae4a));
    _m.compose(_v.set(x + .35 * s, 3.3 * s, z - .2 * s), _q.identity(), _s.set(s * .62, s * .6, s * .62)); crown.setMatrixAt(i * 2 + 1, _m); crown.setColorAt(i * 2 + 1, _c.set(0x7ad46a));
  });
  trunk.castShadow = crown.castShadow = true; grp.add(trunk, crown);
  // palms on the beach
  const PM = new Merge(), palms = [];
  for(let i = 0; i < 16; i++){
    const a = i / 16 * PI * 2 + .2, r = 27.6 + (i % 3) * .6, x = Math.cos(a) * r, z = Math.sin(a) * r;
    if(Math.abs(x) < 4 && z > 0) continue;
    if(x > 15 && x < 26 && z > 10 && z < 20) continue;
    const lean = (rnd() - .5) * .5, h = 3.6 + rnd() * 1.2;
    for(let k = 0; k < 6; k++){ const t = k / 6; PM.add(G.cyl8, x + lean * t * t * 2, (k + .5) * h / 6, z, .22 - t * .06, h / 6 + .05, .22 - t * .06, 0, 0, lean * .3, k % 2 ? 0xb98652 : 0xa77847); }
    const tx = x + lean * 2, ty = h;
    for(let l = 0; l < 6; l++){ const la = l / 6 * PI * 2 + rnd(); PM.add(G.cone4, tx + Math.cos(la) * 1.1, ty - .15, z + Math.sin(la) * 1.1, .55, 2.4, .12, PI / 2 - .35, -la + PI / 2, 0, 0x4fae4a); }
    PM.add(G.sm, tx, ty - .25, z, .25, .25, .25, 0, 0, 0, 0x8a5a36);
    CYL.push({ x, z, r:.28, y0:0, y1:h, tag:'tree' }); palms.push({ x, z });
  }
  { const m = new THREE.Mesh(PM.geometry(), MATF); m.castShadow = true; grp.add(m); }
  // flower clumps and bushes
  for(let i = 0; i < 70; i++){
    const a = rnd() * PI * 2, d = 7 + rnd() * 19, x = Math.cos(a) * d, z = Math.sin(a) * d;
    if(inSolid(x, z, .8)) continue;
    const col = [0xffffff, 0xffd23f, 0xff8fb1, 0xb99cff][i % 4];
    for(let f = 0; f < 4; f++){ const fx = x + (rnd() - .5) * .8, fz = z + (rnd() - .5) * .8; FL.add(G.sm, fx, .16, fz, .1, .07, .1, 0, 0, 0, col); FL.add(G.sm, fx, .1, fz, .14, .06, .14, 0, 0, 0, 0x4fae4a); }
  }
  for(let i = 0; i < 22; i++){ const a = rnd() * PI * 2, d = 9 + rnd() * 17, x = Math.cos(a) * d, z = Math.sin(a) * d; if(inSolid(x, z, 1.2)) continue; N.add(G.ico1, x, .35, z, .6 + rnd() * .3, .5, .6 + rnd() * .3, 0, rnd() * 3, 0, i % 2 ? 0x58b84e : 0x67c45a); }
  function inSolid(x, z, pad){
    for(const b of BOX) if(x > b.x0 - pad && x < b.x1 + pad && z > b.z0 - pad && z < b.z1 + pad) return true;
    for(const c of CYL) if(Math.hypot(x - c.x, z - c.z) < c.r + pad) return true;
    return Math.hypot(x - PZ.x, z - PZ.z) < 7;
  }

  /* far little islands and clouds */
  const FAR = new Merge();
  for(let i = 0; i < 7; i++){ const a = i / 7 * PI * 2 + .4, r = 95 + rnd() * 40; FAR.add(G.sph, Math.cos(a) * r, -3, Math.sin(a) * r, 14 + rnd() * 10, 6 + rnd() * 5, 12 + rnd() * 8, 0, a, 0, 0x8fd06a); FAR.add(G.sph, Math.cos(a) * r, -3.4, Math.sin(a) * r, 17 + rnd() * 10, 3, 15 + rnd() * 8, 0, a, 0, 0xffe2a6); }
  { const m = new THREE.Mesh(FAR.geometry(), MATF); grp.add(m); }
  const CL = new Merge();
  for(let i = 0; i < 12; i++){ const a = i / 12 * PI * 2, r = 60 + rnd() * 50, x = Math.cos(a) * r, z = Math.sin(a) * r, y = 30 + rnd() * 14; for(let k = 0; k < 4; k++) CL.add(G.ico1, x + (k - 1.5) * 3.2, y + (k % 2) * 1.2, z + (rnd() - .5) * 2, 3 + rnd() * 1.5, 2.2 + rnd(), 2.6, 0, 0, 0, 0xffffff); }
  const clouds = new THREE.Mesh(CL.geometry(), new THREE.MeshStandardMaterial({ vertexColors:true, roughness:1, flatShading:true, emissive:0xffffff, emissiveIntensity:.35, fog:false }));
  grp.add(clouds);

  mesh(S, MAT); mesh(N, MATF); mesh(FL, MAT, false, true);

  /* signs (drawn text, no emoji in textures) */
  const sign = (text, bg, w, h, x, y, z, ry) => {
    const tex = canvasTex(512, 128, x2 => { x2.fillStyle = bg; x2.beginPath(); x2.roundRect(4, 4, 504, 120, 40); x2.fill(); x2.lineWidth = 8; x2.strokeStyle = '#fff'; x2.stroke(); x2.fillStyle = '#fff'; x2.textAlign = 'center'; x2.textBaseline = 'middle'; x2.direction = (window.I18N && I18N.dir) || 'rtl'; x2.font = '800 62px "Baloo Bhaijaan 2","Tajawal",system-ui,sans-serif'; x2.fillText(text, 256, 70); });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map:tex, transparent:true, side:THREE.DoubleSide })); m.position.set(x, y, z); m.rotation.y = ry; grp.add(m); return m;
  };
  const L = window.L || ((a) => a);
  sign(L('شرفة المشجعين', 'Cheer balcony', 'Tezahürat balkonu'), '#3a8fd0', 4.6, 1.15, (BAL.x0 + BAL.x1) / 2, BAL.y + 2.4, BAL.z0 - .2, Math.PI);
  sign(L('جزيرة المفاجآت', 'Surprise Island', 'Sürpriz Adası'), '#ff8a65', 4, 1, 0, 1.5, 26.2, Math.PI);
  { // its post
    const M2 = new Merge(); for(const s of [-1, 1]) M2.add(G.cyl8, s * 1.7, .5, 26.25, .08, 1.1, .08, 0, 0, 0, 0xffffff); mesh(M2);
  }

  /* lava (the «الأرض صارت لافا» game): a glowing sheet just above the ground */
  const lavaTex = canvasTex(256, 256, x => {
    const g = x.createLinearGradient(0, 0, 256, 256); g.addColorStop(0, '#ff7a1a'); g.addColorStop(1, '#ff4d2e'); x.fillStyle = g; x.fillRect(0, 0, 256, 256);
    for(let i = 0; i < 40; i++){ const cx = (i * 73) % 256, cy = (i * 151) % 256, r = 8 + (i % 5) * 6, rg = x.createRadialGradient(cx, cy, 0, cx, cy, r); rg.addColorStop(0, 'rgba(255,230,120,.95)'); rg.addColorStop(1, 'rgba(255,200,80,0)'); x.fillStyle = rg; x.beginPath(); x.arc(cx, cy, r, 0, 7); x.fill(); }
  });
  lavaTex.wrapS = lavaTex.wrapT = THREE.RepeatWrapping; lavaTex.repeat.set(9, 9);
  const lava = new THREE.Mesh(new THREE.CircleGeometry(31.5, 72), new THREE.MeshBasicMaterial({ map:lavaTex, transparent:true, opacity:0, depthWrite:false, color:0xffffff }));
  lava.rotation.x = -PI / 2; lava.position.y = LAVA_Y; lava.visible = false; lava.renderOrder = 2; grp.add(lava);

  /* spawn spots around the fountain; balcony slots */
  for(let i = 0; i < 8; i++){ const a = i / 8 * PI * 2 + .2; spawns.push({ x:PZ.x + Math.cos(a) * 3.6, z:PZ.z + Math.sin(a) * 3.6, f:Math.atan2(-Math.cos(a), -Math.sin(a)) }); }
  const balSlots = [];
  for(let i = 0; i < 8; i++){ balSlots.push({ x:BAL.x0 + .9 + (i % 4) * ((BAL.x1 - BAL.x0 - 1.8) / 3), z:BAL.z0 + 1.2 + Math.floor(i / 4) * 2.3 }); }

  return { grp, MAT, MATF, BOX, CYL, perches, highs, shelters, houses, spawns, balSlots, sea, seaTex, lava, lavaTex, clouds, PZ, TW };
}
