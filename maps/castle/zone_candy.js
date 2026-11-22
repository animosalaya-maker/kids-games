/* «قلعة الحلويات» Candy Castle: a biscuit castle with a chocolate-bar maze in the courtyard; 4 golden keys open the
   throne room and its treasure. Bouncy gummy floors, a chocolate river with donut rafts, lollipop trees. Local coords. */
import { CANDY, candyMaze, ZSTN, zkit, portal, ZONES } from './zones.js';

const smooth = t => t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t);

export function build(api, Z){
  const { THREE, K, L, N } = api;
  const RV = CANDY.river, RW = CANDY.riverW;
  const riverD = (x, z) => Math.abs(z - RV(x)) * Math.cos(Math.atan(7 / 14 * Math.cos(x / 14)));
  function ground(x, z){
    const r = Math.hypot(x, z);
    let y = r < 80 ? 0 : r < 88 ? -1.6 * smooth((r - 80) / 8) : -1.6 - 2.4 * smooth((r - 88) / 18);
    const d = riverD(x, z); if(d < RW + 1.4) y = Math.min(y, -1.4 * smooth((RW + 1.4 - d) / 1.8));
    return y;
  }
  const k = zkit(THREE, K, Z, ground), { M, CG, G, Merge, addC, addB, rnd, group } = k;
  const C = { mint:0xa8ecc8, mint2:0x8fdcb8, pink:0xff8fc8, pink2:0xffb6d8, biscuit:0xe8b878, biscuitD:0xc8925a, cream:0xfff3dc, choc:0x6a3a22, choc2:0x8a5032, red:0xff5d73, gold:0xffc83a, blue:0x7fc8ff, lilac:0xc8a8ff, yellow:0xffe27a, white:0xfffaf0 };
  const COLS = [C.pink, C.blue, C.yellow, 0x7fe8a8, C.lilac, 0xff9a6a];

  /* ---------- ground: pastel mint with candy speckles, sand beach, chocolate banks ---------- */
  k.gridGround(112, 2, (x, z, r, y, c) => {
    const nz = Math.sin(x * .23 + Math.cos(z * .19) * 2) * .5 + Math.sin(z * .15 - x * .06) * .5;
    if(r < 79) c.set(C.mint).lerp(new THREE.Color(C.mint2), .5 + nz * .5);
    else c.set(0xffe8c8).lerp(new THREE.Color(C.mint), smooth((80 - r) / 2));
    if(y < -.2) c.set(0x7a4a2a);
    else if(riverD(x, z) < RW + 2.2) c.lerp(new THREE.Color(0xd8a070), .6);
    if(x > CANDY.X0 - 1 && x < CANDY.X1 + 1 && z > CANDY.Z0 - 1 && z < CANDY.Z1 + 1) c.set(0xffe0ec).lerp(new THREE.Color(0xffd0e4), (Math.floor(x / 2) + Math.floor(z / 2)) & 1 ? .6 : 0);
  });

  /* ---------- the chocolate river (a flowing ribbon) + biscuit bridges ---------- */
  const chocTex = k.canvasTex(128, 256, (x, w, h) => { x.fillStyle = '#7a4424'; x.fillRect(0, 0, w, h); for(let i = 0; i < 26; i++){ const px = (i * 37) % w, py = (i * 61) % h; x.strokeStyle = i % 2 ? 'rgba(160,96,56,.7)' : 'rgba(80,40,20,.6)'; x.lineWidth = 5; x.beginPath(); x.moveTo(px, py); x.bezierCurveTo(px + 20, py + 15, px - 20, py + 35, px, py + 50); x.stroke(); } });
  chocTex.wrapS = chocTex.wrapT = THREE.RepeatWrapping;
  (() => {
    const pos = [], uv = [], idx = []; let s = 0, px = null, pz = null;
    for(let x = -112, i = 0; x <= 112; x += 1.5, i++){
      const z = RV(x), d = Math.atan(.5 * Math.cos(x / 14)), nx = -Math.sin(d), nz = Math.cos(d); if(px != null) s += Math.hypot(x - px, z - pz); px = x; pz = z;
      for(const l of [-RW - .6, RW + .6]){ pos.push(x + nx * l * 0 + 0, -.32, z + l); uv.push(l > 0 ? 1 : 0, s / 10); }
      if(i){ const a = (i - 1) * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
    const m = new THREE.Mesh(g, new THREE.MeshPhongMaterial({ map:chocTex, color:0xffffff, specular:0xffd0a0, shininess:70, side:THREE.DoubleSide })); m.receiveShadow = true; group.add(m);
  })();
  for(const bx of CANDY.bridges){
    const z0 = RV(bx), m = M(bx, z0);
    for(let dz = -6.6; dz <= 6.6; dz += .55){ const arch = Math.cos(dz / 6.6 * Math.PI / 2) * .5; m.add(G.box, bx, .1 + arch, z0 + dz, 3.4, .3, .5, 0, 0, 0, Math.round(dz / .55) % 2 ? C.biscuit : C.biscuitD);
      for(let q = 0; q < 3; q++) m.add(CG.sm, bx - 1 + q, .27 + arch, z0 + dz, .07, .04, .07, 0, 0, 0, C.biscuitD); }
    for(const sd of [-1, 1]) for(let dz = -6; dz <= 6; dz += 2){ const arch = Math.cos(dz / 6.6 * Math.PI / 2) * .5; m.add(CG.cyl8, bx + sd * 1.6, .7 + arch, z0 + dz, .1, 1, .1, 0, 0, 0, C.white); m.add(CG.sph, bx + sd * 1.6, 1.25 + arch, z0 + dz, .22, .22, .22, 0, 0, 0, COLS[(dz + 6) / 2 % 6]); }
    for(let dz = -6.6; dz <= 6.6; dz += 1.1){ const arch = Math.cos(dz / 6.6 * Math.PI / 2) * .5; addB(bx, z0 + dz, 1.55, .6, -2, .25 + arch); }
    for(const sd of [-1, 1]) addB(bx + sd * 1.75, z0, .12, 6.6, .3, 1.5);
  }

  /* ---------- the biscuit castle ---------- */
  const { X0, X1, Z0, Z1 } = CANDY, WT = 2.4, WH = 7;
  function wall(x0, z0, x1, z1){ // axis-aligned
    const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, lx = Math.abs(x1 - x0) || WT, lz = Math.abs(z1 - z0) || WT, along = lx > lz, len = Math.max(lx, lz);
    const n = Math.max(1, Math.round(len / 8));
    for(let i = 0; i < n; i++){ const t0 = i / n, t1 = (i + 1) / n, sx = along ? x0 + (x1 - x0) * (t0 + t1) / 2 : cx, sz = along ? cz : z0 + (z1 - z0) * (t0 + t1) / 2, sl = len / n, m = M(sx, sz);
      m.add(G.box, sx, WH / 2, sz, along ? sl : WT, WH, along ? WT : sl, 0, 0, 0, C.biscuit);
      m.add(G.box, sx, WH - .5, sz, along ? sl + .02 : WT + .12, .5, along ? WT + .12 : sl + .02, 0, 0, 0, C.cream);
      // icing drips and candy dots
      for(let q = 0; q < sl / 1.1; q++){ const u = -sl / 2 + .55 + q * 1.1; for(const sd of [-1, 1]){ const ox = along ? u : sd * (WT / 2 + .05), oz = along ? sd * (WT / 2 + .05) : u;
        m.add(CG.hemi, sx + ox, WH - .75, sz + oz, .32, -.45 - (q % 3) * .2, .32, 0, 0, 0, C.pink);
        if(q % 2) m.add(CG.sm, sx + ox * (along ? 1 : 1.02), 2 + (q % 3) * 1.2, sz + oz * (along ? 1.02 : 1), .16, .16, .16, 0, 0, 0, COLS[q % 6]); } }
      for(let q = 0; q < sl / 1.6; q++){ const u = -sl / 2 + .8 + q * 1.6; if(q % 2) continue; m.add(G.box, sx + (along ? u : 0), WH + .45, sz + (along ? 0 : u), along ? .9 : WT, .9, along ? WT : .9, 0, 0, 0, (q / 2) % 2 ? C.pink2 : C.cream); }
    }
    addB(cx, cz, lx / 2, lz / 2, 0, WH + .9);
  }
  wall(X0, Z0, X1, Z0); wall(X0, Z0, X0, Z1); wall(X1, Z0, X1, Z1);
  wall(X0, Z1, -CANDY.gate, Z1); wall(CANDY.gate, Z1, X1, Z1);
  function tower(x, z, r, h, cols){
    const m = M(x, z), n = 6;
    for(let i = 0; i < n; i++) m.add(CG.cyl, x, (i + .5) * h / n, z, r, h / n, r, 0, 0, 0, cols[i % cols.length]);
    m.add(CG.cyl, x, h + .2, z, r + .35, .4, r + .35, 0, 0, 0, C.cream);
    for(let q = 0; q < 5; q++){ const rr = (r + .2) * (1 - q * .17); m.add(CG.torus, x, h + .7 + q * .75, z, rr, rr, 2.6, Math.PI / 2, 0, 0, q % 2 ? C.white : cols[0]); }
    m.add(CG.cone, x, h + 4.4, z, .5, 1.2, .5, 0, 0, 0, C.white); m.add(CG.sph, x, h + 5.2, z, .45, .45, .45, 0, 0, 0, C.red); m.add(CG.cyl8, x + .15, h + 5.8, z, .04, .7, .04, 0, 0, .3, 0x3a8a3a);
    addC(x, z, r, 0, h + .4);
  }
  tower(X0, Z0, 3.6, 13, [C.pink, C.cream]); tower(X1, Z0, 3.6, 13, [0x7fe8a8, C.cream]); tower(X0, Z1, 3.6, 13, [C.blue, C.cream]); tower(X1, Z1, 3.6, 13, [C.lilac, C.cream]);
  for(const sd of [-1, 1]){ const x = sd * (CANDY.gate + 1.4), m = M(x, Z1); m.add(CG.cyl, x, 4.5, Z1, .5, 9, .5, 0, 0, 0, C.white); for(let q = 0; q < 9; q++) m.add(CG.cyl, x, .5 + q, Z1, .52, .35, .52, 0, 0, 0, C.red);
    m.add(CG.cyl, x, 10.4, Z1, 2, .5, 2, Math.PI / 2, 0, 0, sd > 0 ? C.pink : C.blue); m.add(CG.torus, x, 10.4, Z1 + .02, 1.3, 1.3, 1.4, 0, 0, 0, C.white); addC(x, Z1, .7, 0, 9); }
  { const m = M(0, Z1); m.add(new THREE.TorusGeometry(CANDY.gate, .5, 10, 24, Math.PI), 0, WH - 2, Z1, 1, 1, 2, 0, 0, 0, C.pink); }
  k.sign(L('قلعة الحلويات', 'Candy Castle', 'Şeker Kalesi'), '#ff8fd0', 0, 12.4, Z1 + 1.6, 5.4);

  /* ---------- the throne room ---------- */
  const TH = CANDY.throne, TY = 10;
  (() => {
    const m = M(0, -37), D = TH.door;
    m.add(G.box, TH.x0 + .4, TY / 2, (TH.z0 + TH.z1) / 2, .8, TY, TH.z1 - TH.z0, 0, 0, 0, C.pink2);
    m.add(G.box, TH.x1 - .4, TY / 2, (TH.z0 + TH.z1) / 2, .8, TY, TH.z1 - TH.z0, 0, 0, 0, C.pink2);
    for(const sd of [-1, 1]) m.add(G.box, sd * (D + (TH.x1 - D) / 2), TY / 2, TH.z1 - .4, TH.x1 - D, TY, .8, 0, 0, 0, C.pink2);
    m.add(G.box, 0, TY - 1.6, TH.z1 - .4, D * 2, 3.2, .8, 0, 0, 0, C.pink2);
    m.add(G.box, 0, TY + .2, (TH.z0 + TH.z1) / 2, TH.x1 - TH.x0 + .6, .4, TH.z1 - TH.z0 + .6, 0, 0, 0, C.cream);
    for(let q = -4; q <= 4; q++) m.add(CG.hemi, q * 2, TY - .1, TH.z1 + .05, .5, -.7, .3, 0, 0, 0, C.choc2);
    m.add(new THREE.TorusGeometry(D, .35, 8, 20, Math.PI), 0, TY - 3.25, TH.z1 - .05, 1, 1, 2.6, 0, 0, 0, C.gold);
    // a crown on the roof
    m.add(new THREE.CylinderGeometry(2.4, 2.1, 1.4, 20, 1, true), 0, TY + 1.1, -37, 1, 1, 1, 0, 0, 0, C.gold);
    for(let q = 0; q < 6; q++){ const a = q / 6 * 6.283; m.add(CG.cone, Math.sin(a) * 2.3, TY + 2.2, -37 + Math.cos(a) * 2.3, .4, 1.1, .4, 0, 0, 0, C.gold); m.add(CG.sph, Math.sin(a) * 2.3, TY + 2.85, -37 + Math.cos(a) * 2.3, .2, .2, .2, 0, 0, 0, COLS[q]); }
    // inside: a checkered floor, the throne, banners
    for(let ix = 0; ix < 8; ix++) for(let iz = 0; iz < 6; iz++) m.add(G.box, -7 + ix * 2, .03, -42.5 + iz * 2, 2, .06, 2, 0, 0, 0, (ix + iz) % 2 ? C.cream : C.pink);
    m.add(G.box, 0, 1, -42.6, 2.6, 2, 1.4, 0, 0, 0, C.gold); m.add(G.box, 0, 3, -43.3, 2.6, 3.2, .4, 0, 0, 0, C.gold); m.add(G.box, 0, 1.15, -42.4, 2.2, .3, 1.1, 0, 0, 0, C.red);
    for(let q = 0; q < 3; q++) m.add(CG.sph, -.9 + q * .9, 4.8, -43.3, .3, .3, .3, 0, 0, 0, COLS[q]);
    addB(TH.x0 + .4, (TH.z0 + TH.z1) / 2, .4, (TH.z1 - TH.z0) / 2, 0, TY); addB(TH.x1 - .4, (TH.z0 + TH.z1) / 2, .4, (TH.z1 - TH.z0) / 2, 0, TY);
    for(const sd of [-1, 1]) addB(sd * (D + (TH.x1 - D) / 2), TH.z1 - .4, (TH.x1 - D) / 2, .4, 0, TY);
    addB(0, -42.6, 1.3, .9, 0, 2);
  })();
  // the candy-bar door (slides down when the 4 keys are found)
  const door = (() => { const m = new Merge(); for(let q = 0; q < 5; q++) m.add(G.box, -1.76 + q * .88, 3.25, 0, .7, 6.5, .35, 0, 0, 0, q % 2 ? C.red : C.white); m.add(G.box, 0, 6.6, 0, 4.4, .4, .5, 0, 0, 0, C.gold); m.add(CG.sph, 0, 3.3, .3, .45, .45, .2, 0, 0, 0, C.gold);
    const mesh = new THREE.Mesh(m.geometry(), new THREE.MeshLambertMaterial({ vertexColors:true })); mesh.position.set(0, 0, TH.z1 - .4); group.add(mesh); return mesh; })();
  const doorS = addB(0, TH.z1 - .4, TH.door, .45, 0, 6.6);
  const chest = (() => { const g = new THREE.Group(), m = new Merge();
    m.add(G.box, 0, .45, 0, 1.6, .9, 1, 0, 0, 0, 0x9a5a2a); m.add(G.box, 0, .45, .51, 1.64, .2, .04, 0, 0, 0, C.gold); m.add(G.box, 0, .55, .53, .25, .3, .05, 0, 0, 0, C.gold);
    const base = new THREE.Mesh(m.geometry(), new THREE.MeshLambertMaterial({ vertexColors:true })); g.add(base);
    const lm = new Merge(); lm.add(new THREE.CylinderGeometry(.5, .5, 1.6, 16, 1, false, 0, Math.PI), 0, 0, 0, 1, 1, 1, 0, 0, Math.PI / 2, 0x9a5a2a); lm.add(G.box, 0, .02, .5, 1.64, .2, .04, 0, 0, 0, C.gold);
    const lid = new THREE.Mesh(lm.geometry(), new THREE.MeshLambertMaterial({ vertexColors:true })); lid.position.set(0, .9, -.5); lid.children = []; const piv = new THREE.Group(); piv.position.set(0, .9, -.5); lid.position.set(0, 0, .5); piv.add(lid); g.add(piv); g.userData.lid = piv;
    g.position.set(0, 0, -37); group.add(g); return g; })();
  addB(0, -37, .85, .55, 0, .9);

  /* ---------- the maze (chocolate bars and pink wafers) ---------- */
  const MZ = candyMaze(), mz = CANDY.maze;
  (() => {
    const seg = (x0, z0, x1, z1, i) => { const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, lx = Math.abs(x1 - x0) + .7, lz = Math.abs(z1 - z0) + .7, m = M(cx, cz), h = 2.7, wafer = i % 5 === 0;
      m.add(G.box, cx, h / 2, cz, lx, h, lz, 0, 0, 0, wafer ? C.pink2 : C.choc);
      const n = Math.max(1, Math.round(Math.max(lx, lz) / 1.1));
      for(let q = 0; q < n; q++){ const t = (q + .5) / n - .5, x = cx + (lx > lz ? t * (lx - .2) : 0), z = cz + (lz > lx ? t * (lz - .2) : 0); m.add(G.box, x, h + .08, z, lx > lz ? (lx - .2) / n - .12 : lx - .16, .16, lz > lx ? (lz - .2) / n - .12 : lz - .16, 0, 0, 0, wafer ? C.cream : C.choc2); }
      addB(cx, cz, lx / 2, lz / 2, 0, h); };
    let i = 0;
    const X = c => mz.x0 + c * mz.cell, Zr = r => mz.z0 + r * mz.cell;
    for(let r = 0; r < mz.rows; r++) for(let c = 0; c < mz.cols; c++){
      const id = r * mz.cols + c;
      if(c < mz.cols - 1 && !MZ.open.has(MZ.key(id, id + 1))) seg(X(c + 1), Zr(r), X(c + 1), Zr(r + 1), i++);
      if(r < mz.rows - 1 && !MZ.open.has(MZ.key(id, id + mz.cols))) seg(X(c), Zr(r + 1), X(c + 1), Zr(r + 1), i++);
    }
    for(let c = 0; c < mz.cols; c++){ if(c !== MZ.exit % mz.cols) seg(X(c), Zr(0), X(c + 1), Zr(0), i++); if(c !== MZ.ent % mz.cols) seg(X(c), Zr(mz.rows), X(c + 1), Zr(mz.rows), i++); }
    seg(X(0), Zr(0), X(0), Zr(mz.rows), i++); seg(X(mz.cols), Zr(0), X(mz.cols), Zr(mz.rows), i++);
    // close the side strips between the maze and the castle walls
    for(const zz of [Zr(0), Zr(mz.rows)]){ seg(X0 + WT / 2, zz, X(0), zz, 1); seg(X(mz.cols), zz, X1 - WT / 2, zz, 1); }
  })();
  // keys (only during the game) and the 4 key slots on the door
  const keyGeo = (() => { const m = new Merge(); m.add(CG.torus, 0, .45, 0, .32, .32, 1.2, 0, 0, 0, 0xffffff); m.add(G.box, 0, -.15, 0, .14, .9, .14, 0, 0, 0, 0xffffff); m.add(G.box, .15, -.45, 0, .25, .12, .12, 0, 0, 0, 0xffffff); m.add(G.box, .15, -.25, 0, .2, .1, .12, 0, 0, 0, 0xffffff); return m.geometry(); })();
  const keyMesh = new THREE.InstancedMesh(keyGeo, new THREE.MeshPhongMaterial({ color:0xffc83a, emissive:0x5a3600, shininess:90, specular:0xfff2b0 }), 4); keyMesh.frustumCulled = false; group.add(keyMesh);
  const keyGlow = MZ.keys.map(p => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map:k.glowTex, color:0xffe08a, transparent:true, opacity:.7, depthWrite:false, blending:THREE.AdditiveBlending })); s.position.set(p.x, 1.3, p.z); s.scale.set(2.4, 2.4, 1); s.visible = false; group.add(s); return s; });

  /* ---------- the gummy yard (bouncy floors and gumdrop steps) ---------- */
  const gummyMat = new THREE.MeshPhongMaterial({ vertexColors:true, shininess:100, specular:0xffffff, transparent:true, opacity:.9 });
  const gm = new Merge(), gummies = [];
  [[34, -6], [40, -2], [46, -8], [36, -14], [46, -22], [52, -14], [34, -24]].forEach(([x, z], i) => { const col = COLS[i % 6]; gm.add(G.box, x, .25, z, 3.4, .5, 3.4, 0, 0, 0, col); gm.add(G.box, x, .52, z, 3, .06, 3, 0, 0, 0, new THREE.Color(col).lerp(new THREE.Color(0xffffff), .4).getHex()); addB(x, z, 1.7, 1.7, 0, .5, { bounce:1, bv:13, bc:'#ff8fd0' }); gummies.push([x, z]); });
  [[44, -4, 3, 1.7], [42, -11, 5.6, 1.6], [40, -16, 8.2, 1.9]].forEach(([x, z, y, r], i) => { const col = [C.red, 0x7fe8a8, C.yellow][i];
    gm.add(new THREE.SphereGeometry(1, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), x, y - 1.2, z, r, 1.3, r, 0, 0, 0, col); gm.add(CG.cyl, x, y - 1.6, z, r, .8, r, 0, 0, 0, col);
    M(x, z).add(CG.cyl8, x, (y - 2) / 2, z, .25, y - 2, .25, 0, 0, 0, C.white);
    addC(x, z, r, y - 2, y, i < 2 ? { bounce:1, bv:13, bc:'#ffe27a' } : {}); });
  { const mesh = new THREE.Mesh(gm.geometry(), gummyMat); mesh.castShadow = true; mesh.receiveShadow = true; group.add(mesh); }
  k.sign(L('أرض الجيلي', 'Gummy yard', 'Jöle bahçesi'), '#ff8fd0', 42, 4.4, 3, 3.6);

  /* ---------- decor: lollipop trees, candy canes, cotton candy, cupcakes, donuts ---------- */
  const inCastle = (x, z, pad = 4) => x > X0 - pad && x < X1 + pad && z > Z0 - pad && z < Z1 + pad;
  const busy = (x, z) => inCastle(x, z, 5) || riverD(x, z) < RW + 3 || Math.hypot(x - 42, z + 13) < 16 || (Math.abs(x) < 6 && z > 4) || Math.hypot(x, z - 80) < 9 || CANDY.bridges.some(b => Math.abs(x - b) < 4 && Math.abs(z - RV(b)) < 9);
  const spots = [];
  for(let i = 0; i < 400 && spots.length < 90; i++){ const a = rnd() * 6.283, r = 10 + rnd() * 68, x = Math.sin(a) * r, z = Math.cos(a) * r; if(busy(x, z) || spots.some(p => Math.hypot(p[0] - x, p[1] - z) < 4.5)) continue; spots.push([x, z, i % 5]); }
  spots.forEach(([x, z, kind], i) => {
    const m = M(x, z, kind > 2), col = COLS[i % 6];
    if(kind === 0){ // lollipop tree
      m.add(CG.cyl8, x, 2, z, .14, 4, .14, 0, 0, 0, C.white); m.add(CG.cyl, x, 4.6, z, 1.5, .4, 1.5, Math.PI / 2, i, 0, col);
      for(let q = 0; q < 3; q++) m.add(CG.torus, x, 4.6, z, 1.2 - q * .38, 1.2 - q * .38, .9, Math.PI / 2, i, 0, q % 2 ? col : C.white);
      addC(x, z, .3, 0, 5);
    } else if(kind === 1){ // candy cane
      for(let q = 0; q < 8; q++) m.add(CG.cyl8, x, .25 + q * .45, z, .28, .45, .28, 0, 0, 0, q % 2 ? C.red : C.white);
      m.add(new THREE.TorusGeometry(.7, .28, 8, 14, Math.PI), x + .7, 3.6, z, 1, 1, 1, 0, i, 0, C.red); addC(x, z, .35, 0, 4);
    } else if(kind === 2){ // cotton candy tree
      m.add(CG.cyl8, x, 1.3, z, .16, 2.6, .16, 0, 0, 0, 0xfff3dc);
      for(let q = 0; q < 4; q++) m.add(CG.sph, x + Math.sin(q * 2) * .7, 3.2 + (q % 2) * .5, z + Math.cos(q * 2) * .7, 1.2, 1, 1.2, 0, 0, 0, q % 2 ? C.pink2 : C.lilac);
      addC(x, z, .35, 0, 4);
    } else if(kind === 3){ // gumdrops
      for(let q = 0; q < 3; q++) m.add(CG.hemi, x + (q - 1) * 1.1, 0, z + (q % 2) * .8, .55, .9, .55, 0, 0, 0, COLS[(i + q) % 6]);
    } else { // a giant donut
      m.add(CG.torus, x, .6, z, 1.6, 1.6, 2.4, Math.PI / 2, 0, 0, 0xe0a060); m.add(new THREE.TorusGeometry(1, .2, 8, 20), x, .78, z, 1.6, 1.6, 1.6, Math.PI / 2, 0, 0, col); addC(x, z, 2, 0, 1);
    }
  });
  // cupcake houses near the river
  [[-40, 12, C.pink], [-62, -8, C.blue], [62, 10, C.lilac], [18, 54, 0x7fe8a8]].forEach(([x, z, col]) => { const m = M(x, z);
    m.add(new THREE.CylinderGeometry(3.2, 2.6, 3.4, 18), x, 1.7, z, 1, 1, 1, 0, 0, 0, col);
    for(let q = 0; q < 18; q++){ const a = q / 18 * 6.283; m.add(G.box, x + Math.sin(a) * 2.95, 1.7, z + Math.cos(a) * 2.95, .3, 3.4, .1, 0, a, 0, new THREE.Color(col).multiplyScalar(.85).getHex()); }
    for(let q = 0; q < 3; q++) m.add(CG.sph, x, 3.8 + q * 1, z, 3.4 - q * .95, 1.1, 3.4 - q * .95, 0, 0, 0, C.cream);
    m.add(CG.sph, x, 6.6, z, .6, .6, .6, 0, 0, 0, C.red);
    m.add(G.box, x, 1, z + 3, 1.2, 2, .2, 0, 0, 0, C.choc); k.glow.add(G.box, x + 1.5, 2.2, z + 2.85, .7, .6, .05, 0, 0, 0, 0xffe0a0);
    addC(x, z, 3.2, 0, 7); });

  /* ---------- donut rafts on the river ---------- */
  const DOCK = { a:-55, b:50 };
  const dockZ = x => RV(x) - RW - 1.2;
  for(const x of [DOCK.a, DOCK.b]){ const z = dockZ(x), m = M(x, z); for(let q = 0; q < 4; q++) m.add(G.box, x, .1, z + 1 - q * .9, 3, .2, .8, 0, 0, 0, q % 2 ? C.biscuit : C.biscuitD); addB(x, z - .3, 1.5, 1.8, -2, .2); }
  const raftGeo = api.vehGeo('donut', 0xff8fc8);
  const rafts = []; for(let i = 0; i < 6; i++){ const mesh = new THREE.Mesh(raftGeo, new THREE.MeshLambertMaterial({ vertexColors:true })); group.add(mesh); rafts.push({ mesh, ph:i / 6 }); }
  const myRaft = new THREE.Mesh(api.vehGeo('donut', 0xff5d73), new THREE.MeshLambertMaterial({ vertexColors:true })); myRaft.visible = false; group.add(myRaft);
  const PADS = { raft:{ x:DOCK.a, z:dockZ(DOCK.a) - 1.4, y:0 } };
  k.pad(PADS.raft.x, PADS.raft.z, 0, '#ffb070'); k.sign(L('طوافة الدونات', 'Donut raft', 'Donut sal'), '#ffb070', PADS.raft.x, 3.6, PADS.raft.z, 3.6);

  const st = ZSTN.candy; k.pad(st.x, st.z, 0, st.col); k.sign(st.name, st.col, st.x, 3.6, st.z);
  const back = portal(THREE, K, group, Z.portal.x, 0, Z.portal.z, 0, '#ffcd4d', ZONES.castle.name, k.ox, k.oz); back.to = 'castle';
  k.finish();

  /* ---------- gameplay ---------- */
  const P = api.P;
  let G1 = null, doorOpen = 0, doorWant = 0, chestOpen = 0;
  const setDoor = open => { doorWant = open ? 1 : 0; };
  setDoor(api.save.st.candy && api.save.st.candy.done);
  const keysMode = {
    start(run){
      G1 = { got:new Set(), run, opened:false }; setDoor(0); chestOpen = 0;
      keyGlow.forEach(s => s.visible = true);
      api.tp(st.x + k.ox, 0, st.z - 2 + k.oz, Math.PI);
    },
    step(){
      if(!G1) return;
      MZ.keys.forEach((p, i) => { if(G1.got.has(i)) return; if(Math.hypot(P.x - k.ox - p.x, P.z - k.oz - p.z) < 1.3 && P.y < 2){ G1.got.add(i); keyGlow[i].visible = false; api.SFX.key(); api.burst(P.x, 1.5, P.z, 18, ['#ffd23f', '#ffffff'], 4); api.popText('🗝️ ' + N(G1.got.size) + '/' + N(4)); } });
      if(G1.got.size >= 4 && !G1.opened){ G1.opened = true; setDoor(1); api.SFX.win(); api.say(L('انفتح باب العرش! روح عالكنز 👑', 'The throne room is open! Go to the treasure 👑', 'Taht odası açıldı! Hazineye git 👑'), 3600); }
      if(G1.opened && Math.hypot(P.x - k.ox, P.z - k.oz + 37) < 1.8){ chestOpen = 1; api.burst(P.x, 2, P.z, 40, ['#ffd23f', '#ff8fd0', '#7fc8ff', '#ffffff'], 6); api.finishStation('candy', api.runTime()); return; }
    },
    hud(t){ return '🗝️ ' + N(G1 ? G1.got.size : 0) + '/' + N(4) + '  ⏱️ ' + api.fmtSec(t); },
    prog(){ return G1 ? G1.got.size : 0; },
    end(){ keyGlow.forEach(s => s.visible = false); if(!(api.save.st.candy && api.save.st.candy.done)) setDoor(0); else setDoor(1); G1 = null; }
  };
  function rideRaft(){
    myRaft.visible = true;
    api.startRide({ dur:15, pose:'sit', md:7, dist:9, pitch:.34,
      at:t => { const x = DOCK.a + (DOCK.b - DOCK.a) * t, z = t < .05 ? dockZ(DOCK.a) + (RV(DOCK.a) - dockZ(DOCK.a)) * t / .05 : t > .95 ? RV(DOCK.b) + (dockZ(DOCK.b) - RV(DOCK.b)) * (t - .95) / .05 : RV(x) + Math.sin(t * 20) * .6; return [x + k.ox, -.35 + .55 + Math.sin(t * 40) * .04, z + k.oz]; },
      step:(t) => { myRaft.position.set(P.x - k.ox, P.y - .55, P.z - k.oz); myRaft.rotation.y = api.T * .4; },
      end:() => { myRaft.visible = false; api.tp(DOCK.b + k.ox, null, dockZ(DOCK.b) - 2.2 + k.oz, Math.PI); } });
  }
  function preStep(dt){
    doorOpen += (doorWant - doorOpen) * Math.min(1, 2.5 * dt);
    door.position.y = -doorOpen * 6.7; door.visible = doorOpen < .98; doorS.off = doorOpen > .6;
    const lid = chest.userData.lid; lid.rotation.x += ((chestOpen ? -1.6 : 0) - lid.rotation.x) * Math.min(1, 4 * dt);
  }
  const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _v = new THREE.Vector3(), _s = new THREE.Vector3();
  function animate(T, dt, camPos){
    MZ.keys.forEach((p, i) => { const on = G1 && !G1.got.has(i), s = on ? 1 : 0; _m.compose(_v.set(p.x, 1.3 + Math.sin(T * 2 + i) * .15, p.z), _q.setFromEuler(_e.set(0, T * 2 + i, 0)), _s.set(s, s, s)); keyMesh.setMatrixAt(i, _m); });
    keyMesh.instanceMatrix.needsUpdate = true;
    chocTex.offset.y = -T * .12;
    rafts.forEach((r, i) => { const u = (T * .015 + r.ph) % 1, x = -100 + u * 200; r.mesh.position.set(x, -.35 + Math.sin(T * 2 + i) * .05, RV(x) + Math.sin(i * 2.3) * 1.5); r.mesh.rotation.y = T * .3 + i; r.mesh.visible = Math.abs(x - DOCK.a) > 4; });
    gummyMat.opacity = .88 + Math.sin(T * 3) * .03;
    for(const m of k.culled){ const c = m.userData.c; m.visible = Math.hypot(camPos.x - c[0], camPos.z - c[1]) < 95; }
  }
  function ctx(){
    if(Math.hypot(P.x - k.ox - PADS.raft.x, P.z - k.oz - PADS.raft.z) < 1.6 && P.y < 1) return { k:'z', key:'raft', icon:'🍩', label:L('اركب', 'Ride', 'Bin'), col:'#ffb070', go:rideRaft };
    return null;
  }
  function camFix(x, y, z){ // keep the camera inside the throne room when you are in it
    const px = P.x - k.ox, pz = P.z - k.oz;
    if(px > TH.x0 + .8 && px < TH.x1 - .8 && pz > TH.z0 && pz < TH.z1 - .8){ return [Math.max(TH.x0 + 1, Math.min(TH.x1 - 1, x)), Math.min(y, TY - 1), Math.max(TH.z0 + 1, Math.min(TH.z1 - 1.2, z))]; }
    return null;
  }
  function miniBg(x, s){
    x.fillStyle = '#ffe8c8'; x.beginPath(); x.arc(0, 0, 88 * s, 0, 7); x.fill();
    x.fillStyle = '#a8ecc8'; x.beginPath(); x.arc(0, 0, 80 * s, 0, 7); x.fill();
    x.strokeStyle = '#7a4424'; x.lineWidth = RW * 2 * s; x.beginPath(); for(let q = -100; q <= 100; q += 4) q > -100 ? x.lineTo(q * s, RV(q) * s) : x.moveTo(q * s, RV(q) * s); x.stroke();
    x.fillStyle = '#e8b878'; for(const b of CANDY.bridges) x.fillRect((b - 1.7) * s, (RV(b) - 6.6) * s, 3.4 * s, 13.2 * s);
    x.fillStyle = '#ffe0ec'; x.fillRect(X0 * s, Z0 * s, (X1 - X0) * s, (Z1 - Z0) * s); x.strokeStyle = '#e8b878'; x.lineWidth = 2.4 * s; x.strokeRect(X0 * s, Z0 * s, (X1 - X0) * s, (Z1 - Z0) * s);
    x.fillStyle = '#6a3a22'; x.fillRect(mz.x0 * s, mz.z0 * s, mz.cols * mz.cell * s, mz.rows * mz.cell * s);
    x.fillStyle = '#ffb6d8'; x.fillRect(TH.x0 * s, TH.z0 * s, (TH.x1 - TH.x0) * s, (TH.z1 - TH.z0) * s);
    x.fillStyle = 'rgba(255,143,208,.6)'; x.beginPath(); x.arc(42 * s, -13 * s, 13 * s, 0, 7); x.fill();
  }
  function miniDots(x, s){ if(!G1) return; MZ.keys.forEach((p, i) => { if(G1.got.has(i)) return; x.fillStyle = '#ffd23f'; x.strokeStyle = '#2b2350'; x.lineWidth = 2; x.beginPath(); x.arc(p.x * s, p.z * s, 4.5, 0, 7); x.fill(); x.stroke(); }); }
  const test = { keys:MZ.keys.map(p => ({ x:p.x + k.ox, z:p.z + k.oz })), chest:{ x:k.ox, z:k.oz - 37 }, get door(){ return doorOpen; }, get got(){ return G1 ? G1.got.size : 0; }, rideRaft, raftPad:{ x:PADS.raft.x + k.ox, z:PADS.raft.z + k.oz } };
  return { atmo:{ hemi:0xfff0f6, hemiG:0x8a6a9a, sun:0xffd0b0, sunI:2.4, fog:0xf8c4cc }, group, solids:k.solids, movers:k.movers, ground, portals:[back], preStep, animate, ctx, camFix, modes:{ candy:keysMode }, miniBg, miniDots, test };
}
