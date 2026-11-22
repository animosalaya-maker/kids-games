/* Tiny Bobo: the places. One place is shown at a time (merged geometry, one mesh per texture).
   hub  — «قرية بوبو»: grass hills, dirt paths, a river with a waterfall and a bridge, little wooden houses, market stalls,
          villagers, and the GIANT house: its front door leads in, a toy portal leads upstairs.
   down — the giant house downstairs: living room (sofa, TV with our pixel title screen, dining table, bookshelf, funny books,
          stairs up) and the kitchen (green cupboards, oven, fridge) through a wide arch.
   up   — upstairs: the kids' room (striped wallpaper, bed, toy train, toy-block wall, toy house, block arch, plush elephant,
          the wind-up toy cannon) and the bathroom (tiles, mosaic, sink, bathtub with water, rubber duck, toy boat, soap).
   The hero is about 1.2 tall, so a sofa seat is ~4.5 and a table ~9: everything is giant.
   Every place lists: colliders (axis-aligned boxes; b = bouncy, slip = soapy), coins, golden buttons, enemies, villagers,
   launch pads, doors, rooms, checkpoints, water and floor crates. */
export function makeWorld(THREE, GEO, TX, MD, L){
  const { Builder } = GEO;
  const PI = Math.PI;
  /* ---------- materials ---------- */
  const lam = (map, o = {}) => new THREE.MeshLambertMaterial(Object.assign({ map, vertexColors:true }, o));
  const phong = (map, sh = 40) => new THREE.MeshPhongMaterial({ map, vertexColors:true, shininess:sh, specular:0x444444 });
  const MATS = {
    plain:lam(TX.plaster), plaster:lam(TX.plaster), wallpaper:lam(TX.wallpaper), stripes:lam(TX.stripes), tiles:phong(TX.tiles, 60), checkTiles:phong(TX.checkTiles, 50),
    mosaic:phong(TX.mosaic, 70), wood:phong(TX.wood, 25), woodLight:phong(TX.woodLight, 25), woodDark:phong(TX.woodDark, 30), grain:phong(TX.grain, 30), cloth:lam(TX.cloth), fabric:lam(TX.fabric),
    plastic:phong(TX.plastic, 60), rug:lam(TX.rug), playmat:lam(TX.playmat), quilt:lam(TX.quilt), grass:lam(TX.grass), dirt:lam(TX.dirt), bark:lam(TX.bark), leaves:lam(TX.leaves),
    roof:lam(TX.roof), boards:lam(TX.boards), stone:lam(TX.stone), blocks:phong(TX.blocks, 50),
    awnR:lam(TX.awning('#e8304f')), awnB:lam(TX.awning('#3a8fd8')), awnG:lam(TX.awning('#3fae5a')), awnY:lam(TX.awning('#f5a623'))
  };
  const BOOK_TITLES = [
    L('كيف تطبخ غيمة', 'How to Cook a Cloud', 'Bulut Nasıl Pişirilir'), L('الجوربة الضايعة', 'The Lost Sock Saga', 'Kayıp Çorap Destanı'),
    L('1001 نكتة دبدوب', '1001 Bear Jokes', '1001 Ayı Fıkrası'), L('الطيران بالمخدة', 'Flying with a Pillow', 'Yastıkla Uçmak'),
    L('سرّ آخر بسكوتة', 'The Last Cookie Mystery', 'Son Kurabiye Gizemi'), L('النملة الملكة', 'The Ant Queen', 'Kraliçe Karınca'),
    L('دليل العطسة المهذبة', 'Polite Sneezing Guide', 'Kibar Hapşırma Rehberi'), L('حكايات للكنبايات', 'Bedtime Tales for Sofas', 'Kanepe Masalları')
  ];
  const booksV = TX.books(BOOK_TITLES);
  const booksH = TX.tex(TX.cv(512, 512, (x) => {
    const cols = ['#c8463d', '#2f6db5', '#3a9a5b', '#e0a52a', '#7a4fb0', '#e06f9a', '#2aa3a3', '#9a5a2e'];
    for(let i = 0; i < 8; i++){ const y = i * 64; x.fillStyle = cols[i]; x.fillRect(0, y, 512, 64); x.fillStyle = '#f5d36b'; x.fillRect(20, y, 8, 64); x.fillRect(484, y, 8, 64);
      x.fillStyle = '#fff8e0'; x.textAlign = 'center'; x.textBaseline = 'middle'; let fs = 36; x.font = `800 ${fs}px "Baloo Bhaijaan 2","Tajawal",Arial,sans-serif`;
      while(x.measureText(BOOK_TITLES[i]).width > 430 && fs > 14){ fs -= 2; x.font = `800 ${fs}px "Baloo Bhaijaan 2","Tajawal",Arial,sans-serif`; } x.fillText(BOOK_TITLES[i], 256, y + 34); }
  }), false);
  MATS.booksV = lam(booksV); MATS.booksH = lam(booksH);
  const posters = [0, 1, 2].map(k => new THREE.MeshLambertMaterial({ map:TX.poster(k) }));
  MATS.poster0 = posters[0]; MATS.poster1 = posters[1]; MATS.poster2 = posters[2];
  const glowMat = (col, op = .35, map = TX.sunPatch) => new THREE.MeshBasicMaterial({ map, color:col, transparent:true, opacity:op, depthWrite:false, blending:THREE.AdditiveBlending, polygonOffset:true, polygonOffsetFactor:-4 });
  const PLANE = new THREE.PlaneGeometry(1, 1), BOXG = GEO.BOX, CYL = new THREE.CylinderGeometry(1, 1, 1, 18), CYL8 = new THREE.CylinderGeometry(1, 1, 1, 8), SPH = new THREE.SphereGeometry(1, 14, 10), CONE = new THREE.ConeGeometry(1, 1, 12);
  const R = (w, h, d, r) => GEO.rbox(w, h, d, r, 2), R1 = (w, h, d, r) => GEO.rbox(w, h, d, r, 1);

  /* ---------- area skeleton ---------- */
  function area(id){
    const A = { id, group:new THREE.Group(), B:new Builder(), cols:[], dyn:[], coins:[], buttons:[], enemies:[], npcs:[], pads:[], doors:[], spawns:{}, rooms:[], checks:[], water:[], crates:[], bells:[], props:{}, tick:[], ground:null };
    A.group.name = id;
    /* solid box (visual + collider) */
    A.S = (key, x0, y0, z0, x1, y1, z1, col = 0xffffff, tile = 4, f = {}) => {
      if(f.r) A.B.rbox(key, x0, y0, z0, x1, y1, z1, f.r, col, tile); else A.B.box(key, x0, y0, z0, x1, y1, z1, col, tile);
      if(!f.nc) A.col(x0, y0, z0, x1, y1, z1, f);
    };
    A.V = (key, x0, y0, z0, x1, y1, z1, col = 0xffffff, tile = 4, r = 0) => { if(r) A.B.rbox(key, x0, y0, z0, x1, y1, z1, r, col, tile); else A.B.box(key, x0, y0, z0, x1, y1, z1, col, tile); };
    A.col = (x0, y0, z0, x1, y1, z1, f = {}) => { const c = { x0:Math.min(x0, x1), y0:Math.min(y0, y1), z0:Math.min(z0, z1), x1:Math.max(x0, x1), y1:Math.max(y0, y1), z1:Math.max(z0, z1), b:f.b || 0, slip:!!f.slip, cam:f.cam !== false }; A.cols.push(c); return c; };
    A.line = (x0, y0, z0, x1, y1, z1, n) => { for(let i = 0; i < n; i++){ const k = n > 1 ? i / (n - 1) : 0; A.coins.push([x0 + (x1 - x0) * k, y0 + (y1 - y0) * k, z0 + (z1 - z0) * k]); } };
    A.ring = (x, y, z, r, n) => { for(let i = 0; i < n; i++){ const a = i / n * PI * 2; A.coins.push([x + Math.cos(a) * r, y, z + Math.sin(a) * r]); } };
    A.flush = () => {
      const ms = A.B.meshes(new Proxy({}, { get:(o, k) => MATS[String(k).split('|')[0]] || MATS.plain }), A.group);
      for(const k in ms){ ms[k].castShadow = !k.endsWith('|w') && !k.endsWith('|f'); ms[k].receiveShadow = true; }
      return ms;
    };
    /* a soft sun patch on a floor + a few light rays from a window */
    A.sunlight = (cx, y, cz, w, d, rot, win) => {
      const m = new THREE.Mesh(PLANE, glowMat(0xffd59a, .55)); m.rotation.set(-PI / 2, 0, rot); m.scale.set(w, d, 1); m.position.set(cx, y + .03, cz); m.renderOrder = 3; A.group.add(m);
      if(win){ const rm = glowMat(0xffe2b0, .09, TX.ray); rm.side = THREE.DoubleSide;
        for(let i = 0; i < 3; i++){ const r = new THREE.Mesh(PLANE, rm); const [wx, wy, wz] = win, dx = cx - wx, dy = y - wy, dz = cz - wz, len = Math.hypot(dx, dy, dz);
          r.scale.set(w * (.5 + i * .25), len, 1); r.position.set(wx + dx / 2 + (i - 1) * 1.5, wy + dy / 2, wz + dz / 2 + (i - 1) * 1.5);
          r.lookAt(cx, y, cz); r.rotateX(PI / 2); r.rotateY(i * .9); r.renderOrder = 4; A.group.add(r); } }
    };
    A.picture = (mat, x, y, z, w, h, ry) => { const m = new THREE.Mesh(PLANE, mat); m.scale.set(w, h, 1); m.position.set(x, y, z); m.rotation.y = ry; A.group.add(m);
      A.V('woodDark|w', x - Math.cos(ry) * (w / 2 + .3) - Math.sin(ry) * .1, y - h / 2 - .3, z + Math.sin(ry) * (w / 2 + .3) - Math.cos(ry) * .1, x + Math.cos(ry) * (w / 2 + .3) - Math.sin(ry) * .2, y + h / 2 + .3, z - Math.sin(ry) * (w / 2 + .3) - Math.cos(ry) * .2, 0xffffff, 3); };
    return A;
  }
  /* a room shell: floor, walls with optional window holes, baseboards, ceiling */
  function shell(A, o){
    const { x0, x1, z0, z1, h } = o, t = 1;
    A.S(o.floor + '|f', x0 - t, -1, z0 - t, x1 + t, 0, z1 + t, o.floorCol || 0xffffff, o.floorTile || 10);
    A.V('plaster|w', x0 - t, h, z0 - t, x1 + t, h + 1, z1 + t, 0xfffaf0, 8); A.col(x0 - t, h, z0 - t, x1 + t, h + 4, z1 + t, { cam:false });
    // walls: list of [side, holes[{a0,a1,y0,y1}]]
    for(const side of ['n', 's', 'w', 'e']){
      if(o.skip && o.skip.includes(side)) continue;
      const holes = (o.holes && o.holes[side]) || [];
      const along = side === 'n' || side === 's', a0 = along ? x0 : z0, a1 = along ? x1 : z1;
      const put = (b0, b1, y0, y1) => {
        if(b1 - b0 < .01 || y1 - y0 < .01) return;
        const box = along ? [b0, y0, side === 'n' ? z0 - t : z1, b1, y1, side === 'n' ? z0 : z1 + t] : [side === 'w' ? x0 - t : x1, y0, b0, side === 'w' ? x0 : x1 + t, y1, b1];
        const split = o.lowH || 0;
        if(split && y0 < split){ A.V(o.low + '|w', box[0], box[1], box[2], box[3], Math.min(y1, split), box[5], o.lowCol || 0xffffff, o.lowTile || 4); if(y1 > split) A.V(o.wall + '|w', box[0], split, box[2], box[3], y1, box[5], o.wallCol || 0xffffff, o.wallTile || 8); }
        else A.V(o.wall + '|w', box[0], box[1], box[2], box[3], y1, box[5], o.wallCol || 0xffffff, o.wallTile || 8);
        A.col(box[0], y0, box[2], box[3], y1, box[5]);
      };
      // split along the wall by holes
      const hs = holes.slice().sort((p, q) => p.a0 - q.a0); let a = a0;
      for(const hl of hs){ put(a, hl.a0, 0, h); put(hl.a0, hl.a1, 0, hl.y0); put(hl.a0, hl.a1, hl.y1, h); a = hl.a1; }
      put(a, a1, 0, h);
      // baseboard
      const bb = .35, bh = .9;
      if(o.base !== false){ const segs = []; let s = a0; for(const hl of hs){ if(hl.y0 < .1){ segs.push([s, hl.a0]); s = hl.a1; } } segs.push([s, a1]);
        for(const [b0, b1] of segs){ if(b1 - b0 < .1) continue; if(along) A.V('plastic|w', b0, 0, side === 'n' ? z0 : z1 - bb, b1, bh, side === 'n' ? z0 + bb : z1, 0xfffaf0, 2); else A.V('plastic|w', side === 'w' ? x0 : x1 - bb, 0, b0, side === 'w' ? x0 + bb : x1, bh, b1, 0xfffaf0, 2); } }
    }
  }
  /* a window: frame + glowing sky glass + sill, on a wall hole */
  function windowOn(A, side, wx, wz, a0, a1, y0, y1){
    const along = side === 'n' || side === 's', fr = .5, depth = .6, glass = new THREE.MeshBasicMaterial({ color:0xcfeeff });
    const mid = (a0 + a1) / 2, w = a1 - a0, h = y1 - y0;
    const g = new THREE.Mesh(PLANE, glass); g.scale.set(w, h, 1);
    if(along){ g.position.set(mid, (y0 + y1) / 2, wz); g.rotation.y = side === 'n' ? 0 : PI; }
    else { g.position.set(wx, (y0 + y1) / 2, mid); g.rotation.y = side === 'w' ? PI / 2 : -PI / 2; }
    A.group.add(g);
    const sgn = side === 'n' || side === 'w' ? 1 : -1;
    const F = (b0, b1, c0, c1) => { if(along) A.V('plastic|w', b0, c0, wz - .2 * sgn, b1, c1, wz + depth * sgn, 0xffffff, 2); else A.V('plastic|w', wx - .2 * sgn, c0, b0, wx + depth * sgn, c1, b1, 0xffffff, 2); };
    F(a0 - fr, a0, y0 - fr, y1 + fr); F(a1, a1 + fr, y0 - fr, y1 + fr); F(a0, a1, y1, y1 + fr); F(mid - .2, mid + .2, y0, y1); F(a0, a1, (y0 + y1) / 2 - .2, (y0 + y1) / 2 + .2);
    if(along) A.S('plastic|w', a0 - 1, y0 - .7, wz, a1 + 1, y0, wz + 1.6 * sgn, 0xffffff, 2); else A.S('plastic|w', wx, y0 - .7, a0 - 1, wx + 1.6 * sgn, y0, a1 + 1, 0xffffff, 2);
    // light curtains
    const cc = 0xfff0c8;
    if(along){ A.V('fabric|w', a0 - 2.4, y0 - 2, wz + .7 * sgn, a0 - .6, y1 + 2, wz + 1.2 * sgn, cc, 2); A.V('fabric|w', a1 + .6, y0 - 2, wz + .7 * sgn, a1 + 2.4, y1 + 2, wz + 1.2 * sgn, cc, 2); }
    else { A.V('fabric|w', wx + .7 * sgn, y0 - 2, a0 - 2.4, wx + 1.2 * sgn, y1 + 2, a0 - .6, cc, 2); A.V('fabric|w', wx + .7 * sgn, y0 - 2, a1 + .6, wx + 1.2 * sgn, y1 + 2, a1 + 2.4, cc, 2); }
  }
  /* plane with full uv onto a material key, via addUV (pictures, rugs, labels) */
  function flat(A, key, x, y, z, w, d, rect = [0, 0, 1, 1], col = 0xffffff){ A.B.addUV(key, new THREE.PlaneGeometry(1, 1).rotateX(-PI / 2), x, y, z, w, 1, d, 0, col, rect); }
  /* a lying book (cover box + title label on the +z side + cream pages on -z) */
  function lyingBook(A, i, x, y, z, w, h, d, col){
    const cols = [0xc8463d, 0x2f6db5, 0x3a9a5b, 0xe0a52a, 0x7a4fb0, 0xe06f9a, 0x2aa3a3, 0x9a5a2e];
    A.S('plastic', x - w / 2, y, z - d / 2, x + w / 2, y + h, z + d / 2, col || cols[i % 8], 3, { r:.12 });
    A.B.addUV('booksH', PLANE, x, y + h / 2, z + d / 2 + .02, w * .96, h * .8, 1, 0, 0xffffff, [0, 1 - (i % 8 + 1) / 8, 1, 1 - (i % 8) / 8]);
    A.V('plastic', x - w / 2 + .15, y + .12, z - d / 2 - .05, x + w / 2 - .4, y + h - .12, z - d / 2 + .2, 0xfff6e0, 2);
  }
  function standingBooks(A, x0, x1, y, z0, z1, seed){
    let x = x0, i = seed;
    while(x < x1 - .5){ const w = .7 + ((i * 37) % 5) * .15, h = 3.2 + ((i * 53) % 7) * .25; const xe = Math.min(x1, x + w);
      A.B.addUV('booksV', BOXG, (x + xe) / 2, y + h / 2, (z0 + z1) / 2, xe - x, h, z1 - z0, 0, 0xffffff, [(i % 8) / 8, 0, (i % 8 + 1) / 8, 1]);
      x = xe + .04; i++; }
    A.col(x0, y, z0, x1, y + 3.2, z1);
  }
  const blockCell = i => { const c = i % 16; return [(c % 4) / 4, 1 - (Math.floor(c / 4) + 1) / 4, (c % 4 + 1) / 4, 1 - Math.floor(c / 4) / 4]; };
  function toyBlock(A, x, y, z, s, i, solid = true){ A.B.addUV('blocks', R(s, s, s, s * .07), x, y + s / 2, z, 1, 1, 1, 0, 0xffffff, blockCell(i)); if(solid) A.col(x - s / 2, y, z - s / 2, x + s / 2, y + s, z + s / 2); }
  function plant(A, x, z, s = 1){
    A.S('plastic', x - 1.3 * s, 0, z - 1.3 * s, x + 1.3 * s, 2.6 * s, z + 1.3 * s, 0xd9764a, 2, { r:.3 * s });
    A.V('dirt', x - 1.1 * s, 2.5 * s, z - 1.1 * s, x + 1.1 * s, 2.7 * s, z + 1.1 * s, 0x8a5a30, 2);
    for(let k = 0; k < 7; k++){ const a = k / 7 * PI * 2, r = .7 * s; A.B.add('leaves', R(.9 * s, 3 * s, .3 * s, .14 * s), x + Math.cos(a) * r, 4 * s, z + Math.sin(a) * r, 1, 1, 1, -a, 0x5fbf55, 2, Math.sin(a) * .35, -Math.cos(a) * .35); }
  }

  /* ======================================================================
     DOWN: living room (x -30..30) + kitchen (x 31..66)
     ====================================================================== */
  function buildDown(){
    const A = area('down'), H = 30;
    A.rooms = [{ id:'living', x0:-31, z0:-26, x1:30.5, z1:26 }, { id:'kitchen', x0:30.5, z0:-26, x1:67, z1:26 }];
    shell(A, { x0:-30, x1:30, z0:-25, z1:25, h:H, floor:'wood', floorTile:12, wall:'wallpaper', wallTile:9, low:'woodDark', lowH:6, lowTile:5, skip:['e'],
      holes:{ w:[{ a0:-7, a1:7, y0:12, y1:22 }], s:[{ a0:-21, a1:-9, y0:0, y1:21 }, { a0:22, a1:29.6, y0:18, y1:27 }] } });
    windowOn(A, 'w', -30, 0, -7, 7, 12, 22);
    // the arch between the rooms (wall x 30..31 with an opening z -9..9 up to y 18)
    A.S('wallpaper|w', 30, 0, -25, 31, H, -9, 0xffffff, 9); A.S('wallpaper|w', 30, 0, 9, 31, H, 25, 0xffffff, 9); A.S('wallpaper|w', 30, 18, -9, 31, H, 9, 0xffffff, 9);
    A.V('plastic|w', 29.6, 0, -9.6, 31.4, 18.6, -9, 0xfffaf0, 2); A.V('plastic|w', 29.6, 0, 9, 31.4, 18.6, 9.6, 0xfffaf0, 2); A.V('plastic|w', 29.6, 18, -9.6, 31.4, 18.7, 9.6, 0xfffaf0, 2);
    // kitchen shell
    shell(A, { x0:31, x1:66, z0:-25, z1:25, h:H, floor:'checkTiles', floorTile:8, wall:'plaster', wallCol:0xffe9a8, wallTile:8, low:'tiles', lowH:10, lowTile:5, skip:['w'],
      holes:{ e:[{ a0:-6, a1:6, y0:12, y1:22 }] } });
    windowOn(A, 'e', 66, 0, -6, 6, 12, 22);
    A.sunlight(-12, 0, 2, 16, 13, .15, [-30, 18, 0]);
    A.sunlight(52, 0, 2, 13, 10, -.1, [66, 18, 0]);
    A.sun = { dir:[-1, 1.2, -.25], col:0xffe6c0, int:2.3, hemi:[0xfff2e0, 0x9a7a5a, 1.25], bg:0xf6e2c0 };

    /* --- rug --- */
    flat(A, 'rug', -4, .03, 0, 26, 20);
    /* --- sofa (bouncy seat cushions) --- */
    const SC = 0xd9614f;
    A.S('fabric', -29, 0, -12, -19, 2.6, 12, SC, 3, { r:.4 });
    for(let k = 0; k < 3; k++) A.S('fabric', -28.4, 2.6, -12 + k * 8 + .15, -18.6, 4.5, -12 + (k + 1) * 8 - .15, 0xe5735f, 3, { r:.6, b:17 });
    A.S('fabric', -30, 0, -12, -27, 10, 12, SC, 3, { r:.5 });
    for(let k = 0; k < 3; k++) A.V('fabric', -27.6, 4.4, -12 + k * 8 + .3, -25.4, 9.4, -12 + (k + 1) * 8 - .3, 0xe5735f, 3, .7);
    A.col(-27.6, 4.4, -12, -25.4, 9.4, 12);
    for(const s of [-1, 1]) A.S('fabric', -30, 0, s > 0 ? 12 : -14.2, -18.4, 6.4, s > 0 ? 14.2 : -12, SC, 3, { r:.8 });
    A.S('fabric', -24, 4.5, 4.6, -21, 7.4, 7.2, 0xffd23f, 2, { r:.7, b:15 });
    for(const [x, z] of [[-28.5, -13.5], [-19, -13.5], [-28.5, 13.5], [-19, 13.5]]) A.V('woodDark', x - .5, -.01, z - .5, x + .5, .5, z + .5, 0xffffff, 1);
    A.buttons.push({ id:'d_sofa', x:-28.5, y:11.1, z:0 });
    A.line(-23, 5.4, -10, -23, 5.4, 10, 5); A.line(-28.5, 11, -8, -28.5, 11, -3, 3);
    // footstool
    A.S('fabric', -15, 0, -3, -11, 2.2, 3, 0x4f9fb0, 3, { r:.5 });
    A.coins.push([-13, 3.1, 0]);
    /* --- floor lamp + side table + plant --- */
    A.S('woodDark', -26, 0, 16, -22, 5, 20, 0xffffff, 3, { r:.2 });
    A.V('plastic', -24.3, 5, 17.7, -23.7, 15, 18.3, 0x333333, 1); A.B.add('fabric', CONE, -24, 15.5, 18, 2.4, 3.2, 2.4, 0, 0xfff0c0, 2);
    const lampGlow = new THREE.Mesh(new THREE.SphereGeometry(1.4, 12, 8), new THREE.MeshBasicMaterial({ color:0xfff2c0 })); lampGlow.position.set(-24, 14.6, 18); A.group.add(lampGlow);
    plant(A, -26, -20, 1.2);
    /* --- TV stand + TV with our pixel title screen --- */
    A.S('woodDark', -8, 0, -25, 8, 5, -20, 0xffffff, 4, { r:.15 });
    for(const x of [-4, 4]){ A.V('grain', x - 3.6, .6, -20.05, x + 3.6, 4.4, -19.9, 0xb07a48, 2); A.V('plastic', x - .4, 2.3, -19.95, x + .4, 2.7, -19.7, 0xffd23f, 1); }
    A.S('plastic', -7.2, 5, -23.6, 7.2, 14, -22, 0x22252c, 2, { r:.3 });
    A.V('plastic', -1.5, 5, -23.2, 1.5, 5.4, -21.5, 0x22252c, 1);
    const tvCv = document.createElement('canvas'); tvCv.width = 160; tvCv.height = 90; const tvX = tvCv.getContext('2d');
    const tvTex = new THREE.CanvasTexture(tvCv); tvTex.colorSpace = THREE.SRGBColorSpace; tvTex.magFilter = THREE.NearestFilter; tvTex.minFilter = THREE.NearestFilter; tvTex.generateMipmaps = false;
    const tv = new THREE.Mesh(PLANE, new THREE.MeshBasicMaterial({ map:tvTex })); tv.scale.set(13.4, 8, 1); tv.position.set(0, 9.5, -21.95); A.group.add(tv);
    const tvGlow = new THREE.Mesh(PLANE, glowMat(0x88c8ff, .25)); tvGlow.rotation.x = -PI / 2; tvGlow.scale.set(16, 10, 1); tvGlow.position.set(0, .04, -14); A.group.add(tvGlow);
    const title = L('بوبو الصغير', 'TINY BOBO', 'MİNİK BOBO'), press = L('اضغط ★ للعب', 'PRESS ★ TO PLAY', '★ BAS VE OYNA');
    let tvT = 0;
    const drawTV = t => {
      const x = tvX; x.imageSmoothingEnabled = false;
      const sky = ['#3a2a7a', '#5a3aa0', '#8a4ab8', '#d86aa0', '#ff9a7a', '#ffc86a'];
      sky.forEach((c, i) => { x.fillStyle = c; x.fillRect(0, i * 9, 160, 9); });
      x.fillStyle = '#ffe9a0'; x.fillRect(118, 14, 12, 12); x.fillStyle = '#fff'; for(let i = 0; i < 12; i++) x.fillRect((i * 37 + Math.floor(t * 8)) % 160, (i * 13) % 30, 1, 1);
      const off = Math.floor(t * 12) % 32;
      x.fillStyle = '#3a8a4a'; for(let i = -1; i < 7; i++){ const bx = i * 32 - off; x.fillRect(bx, 62, 32, 28); x.fillRect(bx + 8, 54, 16, 8); }
      x.fillStyle = '#5ec46a'; for(let i = -1; i < 7; i++){ const bx = i * 32 - off; x.fillRect(bx, 62, 32, 4); }
      x.fillStyle = '#c98a4b'; for(let i = -1; i < 12; i++){ const bx = i * 16 - (Math.floor(t * 24) % 16); x.fillRect(bx, 76, 15, 14); x.fillStyle = '#e2a868'; x.fillRect(bx, 76, 15, 2); x.fillStyle = '#c98a4b'; }
      // a pixel bear cub jumping
      const jy = Math.floor(Math.abs(Math.sin(t * 3)) * 14);
      const bx = 40, by = 62 - jy;
      x.fillStyle = '#f0a640'; x.fillRect(bx, by - 14, 10, 8); x.fillRect(bx - 1, by - 16, 3, 3); x.fillRect(bx + 8, by - 16, 3, 3); x.fillRect(bx + 1, by - 6, 8, 6);
      x.fillStyle = '#fff0d2'; x.fillRect(bx + 3, by - 9, 4, 2); x.fillStyle = '#1c0f06'; x.fillRect(bx + 2, by - 12, 2, 2); x.fillRect(bx + 6, by - 12, 2, 2);
      x.fillStyle = '#e8304f'; x.fillRect(bx + 1, by - 6, 8, 2); x.fillStyle = '#3f9a4a'; x.fillRect(bx, by - 16, 10, 3); x.fillStyle = '#ffd23f'; x.fillRect(bx - 3, by - 5, 3, 4);
      // coins
      x.fillStyle = '#ffd23f'; for(let i = 0; i < 4; i++){ const cx = 70 + i * 16 - (Math.floor(t * 24) % 16); if(Math.floor(t * 4 + i) % 2) x.fillRect(cx, 44, 4, 6); else x.fillRect(cx + 1, 44, 2, 6); }
      // title
      x.textAlign = 'center'; x.textBaseline = 'middle'; x.font = '800 19px "Baloo Bhaijaan 2",Arial,sans-serif';
      x.fillStyle = '#2a1608'; x.fillText(title, 81, 24); x.fillStyle = '#ffd23f'; x.fillText(title, 80, 22);
      if(Math.floor(t * 2) % 2){ x.font = '700 9px Arial,sans-serif'; x.fillStyle = '#fff'; x.fillText(press, 80, 40); }
      tvTex.needsUpdate = true;
    };
    drawTV(0);
    A.tick.push((t, dt) => { tvT += dt; if(tvT > .12){ tvT = 0; drawTV(t); } });
    A.coins.push([-5, 5.9, -21], [0, 5.9, -21], [5, 5.9, -21]);
    // speakers
    for(const x of [-10.5, 10.5]){ A.S('plastic', x - 1.5, 0, -25, x + 1.5, 7, -22, 0x2a2d35, 2, { r:.25 }); A.B.add('plastic', CYL, x, 4.6, -21.95, 1, .1, 1, 0, 0x555a66, 1, PI / 2); A.B.add('plastic', CYL, x, 2, -21.95, .6, .1, .6, 0, 0x555a66, 1, PI / 2); }
    // book stack next to the stand (steps up onto it)
    lyingBook(A, 0, 15, 0, -21, 6, 1.4, 4); lyingBook(A, 1, 14.6, 1.4, -21.2, 5.4, 1.2, 3.6);
    A.picture(MATS.poster0, 0, 19, -24.4, 9, 6.6, 0);
    A.picture(MATS.poster2, 16, 16, -24.4, 5, 3.8, 0);
    /* --- bookshelf (north-west) --- */
    const BX0 = -28.5, BX1 = -13.5, BZ0 = -25, BZ1 = -20.5;
    A.S('grain', BX0 - .6, 0, BZ0, BX0, 22.6, BZ1, 0xb07a48, 3); A.S('grain', BX1, 0, BZ0, BX1 + .6, 22.6, BZ1, 0xb07a48, 3);
    A.V('grain|w', BX0, 0, BZ0, BX1, 22.6, BZ0 + .3, 0x9a6a3e, 3);
    for(const y of [0, 6, 12, 18]) A.S('grain', BX0, y, BZ0, BX1, y + .6, BZ1, 0xb07a48, 3);
    A.S('grain', BX0 - .6, 22, BZ0, BX1 + .6, 22.8, BZ1 + .3, 0xb07a48, 3);
    standingBooks(A, BX0 + .1, -22, .6, BZ0 + .4, BZ1 - .3, 0); standingBooks(A, BX0 + .1, -23, 6.6, BZ0 + .4, BZ1 - .3, 3);
    standingBooks(A, -18, BX1 - .1, 12.6, BZ0 + .4, BZ1 - .3, 5); standingBooks(A, BX0 + .1, -21, 18.6, BZ0 + .4, BZ1 - .3, 2);
    lyingBook(A, 2, -17, .6, -22.8, 5, 1.3, 3.5); lyingBook(A, 3, -18, 6.6, -22.8, 5, 1.4, 3.5); lyingBook(A, 4, -18, 8, -22.8, 4.4, 1.2, 3.2);
    lyingBook(A, 5, -24.5, 12.6, -22.8, 5, 1.4, 3.5);
    // floor book stack to climb onto the first shelf
    lyingBook(A, 6, -19, 0, -17.5, 6, 1.5, 4.4); lyingBook(A, 7, -19.4, 1.5, -17.8, 5.2, 1.3, 3.8);
    A.buttons.push({ id:'d_shelf', x:-24, y:23.6, z:-22.8 });
    A.coins.push([-17, 2.4, -22.8], [-18, 8.4, -22.8], [-18, 9.8, -22.8], [-20, 13.5, -22.8], [-25, 14.6, -22.8], [-17, 19.4, -22.8], [-15.5, 19.4, -22.8]);
    A.pads.push({ x:-10.5, y:0, z:-16, to:[-21, 22.8, -22.6] });
    /* --- dining table with a blue checkered tablecloth --- */
    const TX0 = 4, TX1 = 24, TZ0 = -16, TZ1 = -2, TY = 8.8;
    for(const [x, z] of [[TX0 + 1, TZ0 + 1], [TX1 - 1, TZ0 + 1], [TX0 + 1, TZ1 - 1], [TX1 - 1, TZ1 - 1]]) A.S('woodDark', x - .6, 0, z - .6, x + .6, TY - .8, z + .6, 0xffffff, 2);
    A.S('woodDark', TX0, TY - .8, TZ0, TX1, TY - .2, TZ1, 0xffffff, 3);
    A.S('cloth', TX0 - .3, TY - .2, TZ0 - .3, TX1 + .3, TY, TZ1 + .3, 0xffffff, 4);
    A.V('cloth', TX0 - .4, TY - 2.6, TZ0 - .4, TX1 + .4, TY - .2, TZ0 - .2, 0xffffff, 4); A.V('cloth', TX0 - .4, TY - 2.6, TZ1 + .2, TX1 + .4, TY - .2, TZ1 + .4, 0xffffff, 4);
    A.V('cloth', TX0 - .4, TY - 2.6, TZ0 - .4, TX0 - .2, TY - .2, TZ1 + .4, 0xffffff, 4); A.V('cloth', TX1 + .2, TY - 2.6, TZ0 - .4, TX1 + .4, TY - .2, TZ1 + .4, 0xffffff, 4);
    A.col(TX0 - .4, TY - 2.6, TZ0 - .4, TX1 + .4, TY - .2, TZ1 + .4);
    // on the table: plates, cups, teapot, fruit bowl with bananas, a vase
    for(const [x, z] of [[8, -5], [14, -5], [20, -5], [8, -13], [20, -13]]){ A.B.add('plastic', CYL, x, TY + .1, z, 1.6, .2, 1.6, 0, 0xffffff, 1); A.B.add('plastic', CYL, x, TY + .22, z, 1.1, .05, 1.1, 0, 0xe9f3ff, 1); }
    A.B.add('plastic', SPH, 14, TY + 1.6, -10, 2, 1.7, 2, 0, 0x4fb3ff, 1); A.B.add('plastic', CYL, 14, TY + 3.3, -10, .5, .5, .5, 0, 0x4fb3ff, 1);
    A.B.add('plastic', CYL, 16.2, TY + 2, -10, .3, 1.8, .3, 0, 0x4fb3ff, 1, 0, -.9); A.B.add('plastic', new THREE.TorusGeometry(1, .2, 6, 14), 11.9, TY + 1.8, -10, .8, .8, .8, 0, 0x4fb3ff, 1);
    A.col(12, TY, -12, 16, TY + 3.2, -8);
    A.B.add('plastic', new THREE.SphereGeometry(1, 16, 8, 0, PI * 2, PI / 2, PI / 2), 20, TY + 1.4, -9, 2, 1.3, 2, 0, 0xffffff, 1);
    for(let k = 0; k < 4; k++) A.B.add('plastic', new THREE.TorusGeometry(1, .28, 6, 12, 2), 20 + (k - 1.5) * .7, TY + 1.4, -9 + (k % 2) * .5, .9, .9, .9, 0, 0xffd23f, 1, 0, PI * .1 * k);
    A.B.add('plastic', SPH, 19, TY + 1.5, -8.5, .6, .6, .6, 0, 0xe8304f, 1); A.B.add('plastic', SPH, 21, TY + 1.5, -9.6, .6, .6, .6, 0, 0x7ad04a, 1);
    A.col(18.2, TY, -10.8, 21.8, TY + 1.4, -7.2);
    A.B.add('plastic', CYL, 8, TY + 1.5, -9, .7, 3, .7, 0, 0x8fd3ff, 1); for(let k = 0; k < 4; k++) A.B.add('plastic', SPH, 8 + Math.cos(k * 1.6) * .6, TY + 3.4 + (k % 2) * .4, -9 + Math.sin(k * 1.6) * .6, .45, .45, .45, 0, [0xff8fb1, 0xffd23f, 0xffffff, 0xc77dff][k], 1);
    A.col(7.2, TY, -9.8, 8.8, TY + 3, -8.2);
    A.ring(14, TY + .9, -9, 5, 10);
    A.buttons.push({ id:'d_table', x:20, y:TY + 3.2, z:-9 });
    // chairs (one with a bouncy cushion)
    for(const [cx, bouncy] of [[10, true], [18, false]]){
      const z0 = .2, z1 = 4.6, y = 4.4;
      for(const [x, z] of [[cx - 1.8, z0 + .4], [cx + 1.8, z0 + .4], [cx - 1.8, z1 - .4], [cx + 1.8, z1 - .4]]) A.S('grain', x - .35, 0, z - .35, x + .35, y, z + .35, 0xb07a48, 2);
      A.S('grain', cx - 2.3, y, z0, cx + 2.3, y + .6, z1, 0xb07a48, 2, { r:.15 });
      A.S('grain', cx - 2.3, y + .6, z1 - .6, cx + 2.3, y + 7.4, z1, 0xb07a48, 2, { r:.15 });
      if(bouncy) A.S('fabric', cx - 1.9, y + .6, z0 + .3, cx + 1.9, y + 1.5, z1 - .8, 0x3a8fd8, 2, { r:.4, b:16 });
    }
    lyingBook(A, 1, 10, 0, 8, 6, 1.4, 4); lyingBook(A, 2, 10.4, 1.4, 7.8, 5, 1.2, 3.4);
    A.line(10, 3.5, 7.8, 10, 6.6, 2.5, 3);
    A.pads.push({ x:-2, y:0, z:-7, to:[8, TY, -12] });
    /* --- stairs up to the kids' room (south wall, rising east) --- */
    const SZ0 = 17.5, SZ1 = 25;
    for(let i = 0; i < 11; i++){ const x0 = 2 + i * 2.2, top = (i + 1) * 1.5;
      A.S('wood', x0, 0, SZ0, x0 + 2.2, top, SZ1, 0xffffff, 8); A.V('plastic', x0 - .05, top - .25, SZ0 - .15, x0 + 2.25, top + .05, SZ1, 0xfffaf0, 2);
      if(i % 2 === 0){ A.S('plastic', x0 + .8, top, SZ0, x0 + 1.4, top + 5, SZ0 + .6, 0xfffaf0, 2); }
      if(i % 3 === 1) A.coins.push([x0 + 1.1, top + .9, 21]);
    }
    A.S('wood', 26.2, 0, SZ0, 30, 18, SZ1, 0xffffff, 8);
    A.B.add('woodDark', BOXG, 15, 9.2, SZ0 + .3, 1, .6, .6, -Math.atan2(16.5, 24.2), 0xffffff, 2, 0, 0); // (rail drawn below)
    { const len = Math.hypot(24.2, 16.5); A.B.add('woodDark', BOXG, 14.1, 6.75 + 5, SZ0 + .3, len, .5, .5, 0, 0xffffff, 2, 0, Math.atan2(16.5, 24.2)); }
    // door at the top of the stairs (to the kids' room)
    A.V('plastic|w', 21.4, 18, 24.6, 22, 27.6, 25.2, 0xfffaf0, 2); A.V('plastic|w', 29.6, 18, 24.6, 30, 27.6, 25.2, 0xfffaf0, 2); A.V('plastic|w', 21.4, 27, 24.6, 30, 27.6, 25.2, 0xfffaf0, 2);
    const door2 = new THREE.Mesh(PLANE, new THREE.MeshBasicMaterial({ color:0xfff1c8 })); door2.scale.set(7.6, 9, 1); door2.rotation.y = PI; door2.position.set(25.8, 22.5, 25.3); A.group.add(door2);
    A.doors.push({ x:27.5, y:18, z:23, r:2.4, to:'up', at:'stairs', icon:'🧸', name:L('غرفة الولاد', "Kids' room", 'Çocuk odası') });
    /* --- front door (to the village) --- */
    A.V('woodDark|w', -21.6, 0, 24.6, -21, 21.6, 25.4, 0xffffff, 3); A.V('woodDark|w', -9, 0, 24.6, -8.4, 21.6, 25.4, 0xffffff, 3); A.V('woodDark|w', -21.6, 21, 24.6, -8.4, 21.6, 25.4, 0xffffff, 3);
    A.B.add('woodDark', BOXG, -15.6, 10.5, 22.6, 11.2, 21, .8, -.55, 0xffffff, 4);
    A.col(-21, 0, 24.9, -16.5, 21, 25.3); A.V('plastic', -11.6, 9.5, 19.6, -11.1, 11.5, 20.2, 0xffd23f, 1);
    const outside = new THREE.Mesh(PLANE, new THREE.MeshBasicMaterial({ color:0xd9f6ff })); outside.scale.set(12, 21, 1); outside.rotation.y = PI; outside.position.set(-15, 10.5, 25.5); A.group.add(outside);
    A.sunlight(-13, 0, 19, 8, 9, 0, null);
    flat(A, 'fabric', -15, .04, 21.5, 10, 4, [0, 0, 2, 1], 0x9a6a3e);
    A.doors.push({ x:-13, y:0, z:22.8, r:2.6, to:'hub', at:'house', icon:'🌳', name:L('قرية بوبو', 'Bobo Village', 'Bobo Köyü') });
    A.spawns.front = [-13, 0, 18, PI]; A.spawns.stairs = [24, 18, 21, -PI / 2]; A.spawns.start = A.spawns.front;
    A.checks.push({ x:-6, y:0, z:15 }, { x:40, y:0, z:6 });
    /* --- kitchen --- */
    const KZ0 = -25, KZ1 = -19, CT = 9.8, GREEN = 0x5aa86a;
    A.S('grain', 31, 0, KZ0, 57, 9, KZ1, GREEN, 3);
    for(let x = 31.2; x < 56.5; x += 4.4){ A.V('grain', x + .2, .8, KZ1, x + 4.2, 8.2, KZ1 + .25, 0x6cbc7c, 3, .12); A.V('plastic', x + 3.4, 4.2, KZ1 + .2, x + 3.8, 5.2, KZ1 + .6, 0xffffff, 1); }
    A.S('stone', 30.8, 9, KZ0, 57.4, CT, KZ1 + .6, 0xfff6ea, 4);
    // open drawers as steps
    A.S('grain', 34, 1.4, KZ1, 38.4, 2.4, -15.6, 0x6cbc7c, 2, { r:.1 }); A.S('grain', 40.4, 4.8, KZ1, 44.8, 5.8, -16, 0x6cbc7c, 2, { r:.1 });
    A.coins.push([36.2, 3.2, -17], [42.6, 6.6, -17.4]);
    // oven with a warm window + stove
    A.V('plastic', 46, 1, KZ1 + .05, 52, 7.6, KZ1 + .4, 0xe8e8ea, 2, .15);
    const ovenWin = new THREE.Mesh(PLANE, new THREE.MeshBasicMaterial({ color:0xffa040 })); ovenWin.scale.set(4.4, 3, 1); ovenWin.position.set(49, 4, KZ1 + .42); A.group.add(ovenWin);
    A.V('plastic', 46.4, 6.6, KZ1 + .4, 51.6, 7, KZ1 + .8, 0x9aa0a8, 1);
    for(const [x, z] of [[47.5, -23], [50.5, -23], [47.5, -20.5], [50.5, -20.5]]) A.B.add('plastic', new THREE.TorusGeometry(1, .18, 6, 16), x, CT + .05, z, .8, .8, .8, 0, 0x2a2d35, 1, PI / 2);
    A.S('plastic', 46.6, CT, -24.4, 49.4, CT + 2.6, -21.6, 0xe8304f, 2, { r:.5 }); A.V('plastic', 46.3, CT + 2.5, -24.7, 49.7, CT + 2.9, -21.3, 0xc82838, 1, .15);
    A.coins.push([48, CT + 3.6, -23]);
    // toaster and microwave
    A.S('plastic', 35, CT, -23.4, 38.4, CT + 2.4, -20.4, 0xc9cfd6, 2, { r:.4 });
    A.S('plastic', 52.2, CT, KZ0, 56.8, CT + 3.8, -20.4, 0xf4f4f4, 2, { r:.3 }); const mw = new THREE.Mesh(PLANE, new THREE.MeshBasicMaterial({ color:0x3a3f4a })); mw.scale.set(3, 2.6, 1); mw.position.set(54, CT + 1.9, -20.38); A.group.add(mw);
    A.line(33, CT + .9, -21, 45, CT + .9, -21, 6);
    // upper green cupboards to jump between
    const UP = [[33, 40, 15.5, 20.5], [42.6, 49.6, 16.5, 21.5], [52.2, 58, 18.4, 23.4]];
    for(const [x0, x1, y0, y1] of UP){ A.S('grain', x0, y0, KZ0, x1, y1, -21, GREEN, 3, { r:.2 }); A.V('grain', x0 + .3, y0 + .3, -21, (x0 + x1) / 2 - .1, y1 - .3, -20.8, 0x6cbc7c, 3); A.V('grain', (x0 + x1) / 2 + .1, y0 + .3, -21, x1 - .3, y1 - .3, -20.8, 0x6cbc7c, 3);
      A.coins.push([(x0 + x1) / 2, y1 + .9, -23]); }
    A.pads.push({ x:41.4, y:CT, z:-22.4, to:[36.5, 20.5, -23] });
    A.pads.push({ x:44, y:0, z:-8, to:[42.4, CT, -21.8] });
    // fridge
    A.S('plastic', 59, 0, KZ0, 66, 25, -17.4, 0xf2f4f6, 3, { r:.4 }); A.V('plastic', 59.2, 15.6, -17.5, 65.8, 15.9, -17.2, 0xc9cfd6, 1);
    A.V('plastic', 60, 9, -17.4, 60.5, 14, -16.8, 0xc9cfd6, 1); A.V('plastic', 60, 17, -17.4, 60.5, 22, -16.8, 0xc9cfd6, 1);
    for(const [x, y, c] of [[62.5, 19, 0xff6b6b], [64, 12, 0x5ed67a], [62, 8, 0x4fb3ff], [64.2, 21, 0xffd23f]]) A.V('plastic', x - .5, y - .5, -17.4, x + .5, y + .5, -17.1, c, 1, .2);
    A.picture(MATS.poster1, 63, 12.5, -17.35, 2.6, 2, 0);
    A.buttons.push({ id:'d_fridge', x:64.5, y:26.2, z:-21 });
    A.props.drumAt = [61, 25, -21.5];
    // trash bin, cat bowl, mop
    A.S('plastic', 32, 0, 18, 36, 6, 22, 0x4fb3ff, 2, { r:.6 }); A.V('plastic', 31.7, 6, 17.7, 36.3, 6.6, 22.3, 0x3a8fd8, 1, .2);
    A.B.add('plastic', CYL, 55, .5, 15, 2, 1, 2, 0, 0xff8fb1, 1); A.col(53, 0, 13, 57, 1, 17);
    A.coins.push([34, 7.3, 20], [55, 1.8, 15]);
    // kitchen floor coins
    A.line(36, .9, 0, 60, .9, 0, 8); A.line(48, .9, 12, 48, .9, 22, 3);
    // floor crates (ground pound opens them)
    A.crates.push({ x:-2, y:0, z:12 }, { x:58, y:0, z:10 });
    /* --- enemies --- */
    A.enemies.push({ kind:'ball', path:[[-6, 8], [6, 8]], y:0, sp:3 }, { kind:'ball', path:[[-7, -12], [-7, 4]], y:0, sp:2.6 },
      { kind:'mouse', path:[[36, -10], [60, -10]], y:0, sp:3.2 }, { kind:'mouse', path:[[40, 6], [56, 6]], y:0, sp:2.8 }, { kind:'mouse', path:[[32.5, -19.6], [45, -19.6]], y:CT, sp:2.2 },
      { kind:'soldier', path:[[5, 13], [5, -0.5]], y:0, sp:1.6 });
    return A;
  }

  /* ======================================================================
     UP: kids' room (x -30..30) + bathroom (x 31..60, z -25..8)
     ====================================================================== */
  function buildUp(){
    const A = area('up'), H = 30;
    A.rooms = [{ id:'kids', x0:-31, z0:-26, x1:30.5, z1:26 }, { id:'bath', x0:30.5, z0:-26, x1:61, z1:9 }];
    shell(A, { x0:-30, x1:30, z0:-25, z1:25, h:H, floor:'wood', floorTile:12, wall:'stripes', wallTile:7, low:'woodLight', lowH:4, lowTile:5, skip:['e'],
      holes:{ n:[{ a0:-6, a1:6, y0:12, y1:22 }], s:[{ a0:-24, a1:-16, y0:0, y1:15 }] } });
    windowOn(A, 'n', 0, -25, -6, 6, 12, 22);
    A.S('stripes|w', 30, 0, -25, 31, H, -15, 0xffffff, 7); A.S('stripes|w', 30, 0, -5, 31, H, 25, 0xffffff, 7); A.S('stripes|w', 30, 15, -15, 31, H, -5, 0xffffff, 7);
    A.V('plastic|w', 29.6, 0, -15.6, 31.4, 15.6, -15, 0xfffaf0, 2); A.V('plastic|w', 29.6, 0, -5, 31.4, 15.6, -4.4, 0xfffaf0, 2); A.V('plastic|w', 29.6, 15, -15.6, 31.4, 15.6, -4.4, 0xfffaf0, 2);
    shell(A, { x0:31, x1:60, z0:-25, z1:8, h:H, floor:'tiles', floorTile:6, wall:'tiles', wallTile:5, low:'mosaic', lowH:10, lowTile:4, skip:['w'] });
    A.sunlight(3, 0, -9, 14, 12, 0, [0, 18, -25]);
    A.sun = { dir:[-.2, 1.2, -1], col:0xffe8c8, int:2.3, hemi:[0xfff6ea, 0x8a7a6a, 1.25], bg:0xe6f4e0 };
    // door back down
    A.V('plastic|w', -24.6, 0, 24.6, -24, 15.6, 25.4, 0xfffaf0, 2); A.V('plastic|w', -16, 0, 24.6, -15.4, 15.6, 25.4, 0xfffaf0, 2); A.V('plastic|w', -24.6, 15, 24.6, -15.4, 15.6, 25.4, 0xfffaf0, 2);
    const back = new THREE.Mesh(PLANE, new THREE.MeshBasicMaterial({ color:0xf6e2c0 })); back.scale.set(8, 15, 1); back.rotation.y = PI; back.position.set(-20, 7.5, 25.5); A.group.add(back);
    A.doors.push({ x:-20, y:0, z:23, r:2.4, to:'down', at:'stairs', icon:'🛋️', name:L('غرفة القعدة', 'Living room', 'Oturma odası') });
    A.spawns.stairs = [-20, 0, 19, PI]; A.spawns.portal = [-12, 0, 12, PI]; A.spawns.start = A.spawns.stairs;
    A.checks.push({ x:-14, y:0, z:18 }, { x:36, y:0, z:2 });
    flat(A, 'playmat', 2, .03, 5, 30, 20, [0, 0, 3, 2]);
    /* --- bed (bouncy mattress) + a wall shelf above it --- */
    for(const [x, z] of [[-29.5, -24.5], [-12.5, -24.5], [-29.5, -10.5], [-12.5, -10.5]]) A.S('woodLight', x - .5, 0, z - .5, x + .5, 3, z + .5, 0xffffff, 2);
    A.S('woodLight', -30, 2.4, -25, -12, 3.4, -10, 0xffffff, 4);
    A.S('quilt', -29.8, 3.4, -24, -12.2, 7.6, -10.2, 0xffffff, 6, { r:.8, b:19 });
    A.S('fabric', -27, 7.4, -24, -15, 9, -20.5, 0xfffaf0, 3, { r:.7, b:14 });
    A.S('woodLight', -30.4, 0, -25.4, -11.6, 13, -24.4, 0xffffff, 4, { r:.3 });
    A.S('woodLight', -30.4, 0, -10.4, -11.6, 8.6, -9.6, 0xffffff, 4, { r:.3 });
    for(let k = 0; k < 3; k++) A.B.add('plastic', MD.STAR, -26 + k * 5, 11, -24.3, .8, .8, .3, 0, 0xffd23f, 1);
    A.S('fabric', -16.5, 0, -7.5, -12.5, 1.6, -3.5, 0xff8fb1, 2, { r:.7, b:17 });
    A.S('grain', -29, 15, -25, -17, 15.8, -21.5, 0xb07a48, 3);
    A.B.add('plastic', MD.R(1.6, 2.4, 1.4, .3), -26.5, 17, -23.3, 1, 1, 1, 0, 0x9aa3ab, 1); A.B.add('plastic', MD.R(1.2, 1, 1, .3), -26.5, 18.7, -23.3, 1, 1, 1, 0, 0xb4bcc4, 1);
    A.B.add('plastic', new THREE.ConeGeometry(.8, 2.4, 10), -19, 17, -23.3, 1, 1, 1, 0, 0xe8304f, 1); A.B.add('plastic', CYL, -19, 16.3, -23.3, .8, 1.2, .8, 0, 0xffffff, 1);
    A.col(-27.5, 15.8, -24.2, -25.5, 19.2, -22.4); A.col(-19.8, 15.8, -24.1, -18.2, 18.2, -22.5);
    A.buttons.push({ id:'u_shelf', x:-22.8, y:16.9, z:-23.2 });
    A.line(-27, 9.2, -16, -15, 9.2, -16, 5); A.coins.push([-14.5, 2.8, -5.5]);
    /* --- toys lying around: crayons, a toy car, a spinning top, small blocks, a xylophone --- */
    const HEX = new THREE.CylinderGeometry(1, 1, 1, 6);
    [[-2, -16, .4, 0xe8304f], [0, -15, 1.2, 0x3a8fd8], [4, -18, 2.2, 0x5ed67a], [-24, 12, .9, 0xffb43d], [24, -6, 1.8, 0xa77bff]].forEach(([x, z, a, c]) => {
      A.B.add('plastic', HEX, x, .45, z, .45, 5, .45, a, c, 1, PI / 2); A.B.add('plastic', CONE, x + Math.cos(a) * 3, .45, z - Math.sin(a) * 3, .45, 1, .45, a, 0xf2d2a8, 1, 0, -PI / 2);
      A.col(x - 1.2, 0, z - 1.2, x + 1.2, .9, z + 1.2); });
    { const cx = -18, cz = 18; A.S('plastic', cx - 2.2, .6, cz - 1.2, cx + 2.2, 2.2, cz + 1.2, 0x3a8fd8, 2, { r:.4 }); A.S('plastic', cx - 1.2, 2.2, cz - 1, cx + 1, 3.2, cz + 1, 0x8fd3ff, 1, { r:.3 });
      for(const [x, z] of [[-1.4, -1.25], [1.4, -1.25], [-1.4, 1.25], [1.4, 1.25]]) A.B.add('plastic', CYL, cx + x, .6, cz + z, .6, .4, .6, 0, 0x22252c, 1, PI / 2); }
    A.B.add('plastic', CONE, 8, 1.6, -11, 1.2, 1.6, 1.2, 0, 0xff8fb1, 1, PI); A.B.add('plastic', CYL, 8, 2.6, -11, .2, .9, .2, 0, 0xffd23f, 1); A.col(7, 0, -12, 9, 2.2, -10);
    { const xs = 22, zs = 3; A.S('woodLight', xs - 3, 0, zs - 1.2, xs + 3, .6, zs + 1.2, 0xffffff, 2); const kc = [0xe8304f, 0xffb43d, 0xffe14d, 0x5ed67a, 0x4fb3ff, 0xa77bff];
      kc.forEach((c, i) => A.V('plastic', xs - 2.7 + i * .92, .6, zs - 1 + i * .08, xs - 1.95 + i * .92, .9, zs + 1 - i * .08, c, 1, .1)); A.col(xs - 3, .6, zs - 1, xs + 3, .9, zs + 1); }
    [[-14, -2, 1], [-15.2, -1.2, 5], [-14.6, -1.6, 9, 1.2], [6, 20, 2], [26, 12, 11], [26.2, 13.3, 14, 0]].forEach(([x, z, i, y = 0]) => toyBlock(A, x, y, z, 1.2, i));
    /* --- toy box --- */
    A.S('grain', -11, 0, -24, -4, 4, -19.5, 0xe8304f, 3, { r:.3 }); A.V('grain', -11.2, 4, -24.2, -3.8, 4.6, -19.3, 0xffd23f, 2, .2);
    A.coins.push([-7.5, 5.5, -21.8]);
    /* --- plush elephant Filo sits near the bed --- */
    A.npcs.push({ id:'filo', kind:'elephant', x:-7, y:0, z:-13, f:.4 });
    /* --- toy train on an oval track --- */
    const TCX = 2, TCZ = 5, TRX = 15, TRZ = 9;
    { const n = 64; for(let i = 0; i < n; i++){ const a0 = i / n * PI * 2, a1 = (i + 1) / n * PI * 2;
      for(const off of [-.7, .7]){ const p0 = [TCX + Math.cos(a0) * (TRX + off), TCZ + Math.sin(a0) * (TRZ + off)], p1 = [TCX + Math.cos(a1) * (TRX + off), TCZ + Math.sin(a1) * (TRZ + off)];
        const mx = (p0[0] + p1[0]) / 2, mz = (p0[1] + p1[1]) / 2, len = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]) + .05, ang = Math.atan2(p1[1] - p0[1], p1[0] - p0[0]);
        A.B.add('plastic|f', BOXG, mx, .25, mz, len, .2, .2, -ang, 0x9aa3ab, 1); }
      if(i % 2 === 0){ const mx = TCX + Math.cos(a0) * TRX, mz = TCZ + Math.sin(a0) * TRZ; A.B.add('woodLight|f', BOXG, mx, .08, mz, .5, .16, 2.2, PI / 2 - Math.atan2(Math.sin(a0) * TRX, Math.cos(a0) * TRZ), 0xffffff, 2); } } }
    const trainCars = [];
    const tcol = [0xe8304f, 0x3a8fd8, 0xffd23f];
    for(let k = 0; k < 3; k++){
      const B = new Builder(), g = new THREE.Group();
      if(k === 0){ B.add('plastic', MD.R(2.8, 1.8, 1.8, .3), 0, 1.3, 0, 1, 1, 1, 0, 0xe8304f, 1); B.add('plastic', MD.R(1.2, 1.4, 1.9, .2), -.8, 2.8, 0, 1, 1, 1, 0, 0x3a8fd8, 1);
        B.add('plastic', CYL, .9, 2.6, 0, .35, 1.2, .35, 0, 0x22252c, 1); B.add('plastic', CYL, 1.45, 1.3, 0, .7, .3, .7, 0, 0xffd23f, 1, 0, PI / 2); }
      else { B.add('plastic', MD.R(2.6, 1.4, 1.8, .25), 0, 1.1, 0, 1, 1, 1, 0, tcol[k], 1); B.add('plastic', MD.R(2.2, .3, 1.5, .1), 0, 1.85, 0, 1, 1, 1, 0, 0xffffff, 1); }
      for(const s of [-1, 1]) for(const zz of [-.95, .95]) B.add('plastic', CYL, s * .8, .45, zz, .45, .2, .45, 0, 0x22252c, 1, PI / 2);
      B.meshes({ plastic:MATS.plastic }, g); g.traverse(o => { if(o.isMesh){ o.castShadow = true; o.matrixAutoUpdate = true; } });
      A.group.add(g);
      const c = { x0:0, y0:0, z0:0, x1:0, y1:0, z1:0, b:0, cam:false, dx:0, dz:0 }; A.dyn.push(c);
      trainCars.push({ g, c, h:k === 0 ? 2.2 : 2.0, lag:k * .23 });
    }
    let trainU = 0;
    A.tick.push((t, dt) => {
      trainU += dt * .22;
      for(const tc of trainCars){
        const a = trainU - tc.lag, x = TCX + Math.cos(a) * TRX, z = TCZ + Math.sin(a) * TRZ;
        const nx = -Math.sin(a) * TRX, nz = Math.cos(a) * TRZ;
        tc.g.position.set(x, 0, z); tc.g.rotation.y = -Math.atan2(nz, nx);
        const c = tc.c, ox = (c.x0 + c.x1) / 2, oz = (c.z0 + c.z1) / 2;
        Object.assign(c, { x0:x - 1.2, x1:x + 1.2, z0:z - 1.2, z1:z + 1.2, y0:0, y1:tc.h });
        c.dx = x - ox; c.dz = z - oz;
      }
    });
    A.props.train = trainCars;
    A.ring(TCX, 3, TCZ, 10, 8);
    /* --- toy-block wall (stairs of blocks) --- */
    const BS = 2.4; let bi = 0;
    for(let col = 0; col < 7; col++){ const hgt = Math.min(col + 1, 6); for(let row = 0; row < 2; row++) for(let k = 0; k < hgt; k++){ toyBlock(A, 11.6 + col * BS, k * BS, -23.8 + row * BS, BS, bi++, true); } }
    for(let k = 0; k < 6; k++) toyBlock(A, 11.6 + 7 * BS, k * BS, -23.8, BS, bi++, true);
    A.buttons.push({ id:'u_blocks', x:11.6 + 7 * BS, y:6 * BS + 1.1, z:-23.8 });
    for(let col = 0; col < 6; col++) A.coins.push([11.6 + col * BS, (col + 1) * BS + .9, -21.4]);
    A.pads.push({ x:14, y:0, z:-15, to:[24, 6 * BS, -22.6] });
    /* --- block arch --- */
    for(let k = 0; k < 3; k++){ toyBlock(A, -8.4, k * BS, 14, BS, k + 3); toyBlock(A, 0, k * BS, 14, BS, k + 7); }
    for(let k = 0; k < 4; k++) toyBlock(A, -8.4 + k * 2.8, 3 * BS, 14, BS, k + 9);
    A.coins.push([-4.2, 1, 14], [-4.2, 3 * BS + 3.4, 14]);
    /* --- toy house (walk in through the door, stand on the flat roof) --- */
    const HX0 = 13, HX1 = 25, HZ0 = 10, HZ1 = 20, HH = 7;
    A.S('plastic', HX0, 0, HZ1 - .6, HX1, HH, HZ1, 0xfff0c8, 3); A.S('plastic', HX0, 0, HZ0, HX0 + .6, HH, HZ1, 0xfff0c8, 3); A.S('plastic', HX1 - .6, 0, HZ0, HX1, HH, HZ1, 0xfff0c8, 3);
    A.S('plastic', HX0, 0, HZ0, 17.5, HH, HZ0 + .6, 0xfff0c8, 3); A.S('plastic', 20.5, 0, HZ0, HX1, HH, HZ0 + .6, 0xfff0c8, 3); A.S('plastic', 17.5, 4, HZ0, 20.5, HH, HZ0 + .6, 0xfff0c8, 3);
    A.S('plastic', HX0 - .4, HH, HZ0 - .4, HX1 + .4, HH + .6, HZ1 + .4, 0xe8304f, 3);
    for(const [x0, z0, x1, z1] of [[HX0 - .4, HZ0 - .4, HX1 + .4, HZ0 + .2], [HX0 - .4, HZ1 - .2, HX1 + .4, HZ1 + .4], [HX0 - .4, HZ0 - .4, HX0 + .2, HZ1 + .4], [HX1 - .2, HZ0 - .4, HX1 + .4, HZ1 + .4]]) A.S('plastic', x0, HH + .6, z0, x1, HH + 1.4, z1, 0xffd23f, 2);
    A.S('plastic', 22, HH + .6, 17, 23.6, HH + 3, 18.6, 0xc8463d, 2);
    for(const x of [14.8, 22.6]){ A.V('plastic', x - 1.2, 3, HZ0 - .1, x + 1.2, 5.4, HZ0 + .7, 0x8fd3ff, 1); A.V('plastic', x - 1.5, 2.8, HZ0 - .2, x + 1.5, 3.1, HZ0 + .7, 0xffffff, 1); }
    A.V('plastic', 17.3, 0, HZ0 - .1, 17.6, 4.2, HZ0 + .7, 0x3a8fd8, 1); A.V('plastic', 20.4, 0, HZ0 - .1, 20.7, 4.2, HZ0 + .7, 0x3a8fd8, 1);
    A.line(15, 1, 14, 23, 1, 16, 5);
    A.pads.push({ x:19, y:0, z:5.5, to:[20, HH + .6, 15.5] });
    A.coins.push([16, HH + 1.5, 13], [19, HH + 1.5, 13], [16, HH + 1.5, 17]);
    /* --- trampoline toy --- */
    A.B.add('plastic', CYL, -20, .8, 4, 2.6, 1.6, 2.6, 0, 0x3a8fd8, 1); A.S('fabric', -22.4, 1.6, 1.6, -17.6, 1.8, 6.4, 0x22252c, 2, { b:20 }); A.col(-22.6, 0, 1.4, -17.4, 1.6, 6.6);
    A.line(-20, 6, 4, -20, 14, 4, 5);
    /* --- the wind-up toy cannon + three bells to ring --- */
    A.props.cannonAt = [-12, 0, 6, PI * .75];
    A.bells.push({ x:-20, y:5.6, z:-4 }, { x:2, y:5.2, z:-17 }, { x:10, y:5.8, z:22 });
    /* posters, lamp, toy shelf */
    A.picture(MATS.poster1, -27, 14, -24.3, .1, .1, 0);
    A.picture(MATS.poster1, 22, 16, -24.4, 6, 4.5, 0); A.picture(MATS.poster2, -29.4, 12, 6, 6, 4.5, PI / 2);
    A.S('grain', 25, 9, 20, 30, 9.6, 25, 0xb07a48, 3); A.B.add('plastic', SPH, 27.5, 10.8, 22.5, 1.2, 1.2, 1.2, 0, 0x4fb3ff, 1); A.col(26.3, 9.6, 21.3, 28.7, 12, 23.7);
    A.coins.push([27.5, 13, 22.5]);
    A.crates.push({ x:-4, y:0, z:-4 }, { x:20, y:0, z:13 });
    /* ---------- bathroom ---------- */
    // bathtub with water, a rubber duck and a toy boat
    const BX0 = 40, BX1 = 59.5, BZ0 = -25, BZ1 = -15, RIM = 7, WY = 5.2;
    A.S('plastic', BX0, .8, BZ0, BX1, 1.4, BZ1, 0xffffff, 3);
    A.S('plastic', BX0, .8, BZ0, BX0 + 1.2, RIM - .4, BZ1, 0xf4f8fb, 3); A.S('plastic', BX1 - .6, .8, BZ0, BX1, RIM - .4, BZ1, 0xf4f8fb, 3);
    A.S('plastic', BX0, .8, BZ1 - 2.2, BX1, RIM - .4, BZ1, 0xf4f8fb, 3, { r:.6 });
    // rounded rim all around (stand on it)
    A.S('plastic', BX0 - .2, RIM - .6, BZ1 - 2.4, BX1 + .1, RIM, BZ1 + .2, 0xffffff, 2, { r:.3 }); A.S('plastic', BX0 - .2, RIM - .6, BZ0, BX0 + 1.4, RIM, BZ1, 0xffffff, 2, { r:.3 });
    A.S('plastic', BX1 - .8, RIM - .6, BZ0, BX1 + .1, RIM, BZ1, 0xffffff, 2, { r:.3 });
    A.V('plastic', BX0 + .6, RIM - 2.4, BZ1 + .02, BX1 - .4, RIM - 2.1, BZ1 + .12, 0x8fd3ff, 1);
    for(const x of [41.2, 58.4]) for(const dz of [BZ1 - .9, BZ0 + 1.4]) A.S('plastic', x - .7, 0, dz - .7, x + .7, .9, dz + .7, 0xffc928, 1, { r:.35 });
    // faucet + a shelf with colourful bottles
    A.V('plastic', 48.8, RIM, -25, 50.2, RIM + 2.6, -24, 0xc9cfd6, 1, .3); A.V('plastic', 48.9, RIM + 1.8, -24.4, 50.1, RIM + 2.4, -22.4, 0xc9cfd6, 1, .25);
    A.S('plastic', 54, 10.6, -25, 59.4, 11.2, -23, 0xffffff, 2, { r:.15 });
    [[54.8, 0xff8fb1, 2.2], [56.2, 0x5ed6a0, 2.8], [57.6, 0xffb43d, 1.8], [58.8, 0x6cc4ff, 2.4]].forEach(([x, c, h]) => { A.B.add('plastic', MD.R(1, h, .9, .3), x, 11.2 + h / 2, -24, 1, 1, 1, 0, c, 1); A.B.add('plastic', CYL, x, 11.2 + h + .25, -24, .2, .5, .2, 0, 0xffffff, 1); });
    A.col(54.2, 11.2, -24.5, 59.3, 13.4, -23.5);
    plant(A, 58, 5, .9);
    A.water.push({ x0:BX0 + 1.2, z0:BZ0, x1:BX1 - .6, z1:BZ1 - 2.2, y:WY, floor:1 });
    const wmat = new THREE.MeshPhongMaterial({ map:TX.water, color:0xbfefff, transparent:true, opacity:.78, shininess:120, specular:0xffffff, depthWrite:false });
    const tubW = new THREE.Mesh(PLANE, wmat); tubW.rotation.x = -PI / 2; tubW.scale.set(BX1 - BX0 - 1.8, BZ1 - BZ0 - 2.2, 1); tubW.position.set((BX0 + 1.2 + BX1 - .6) / 2, WY, (BZ0 + BZ1 - 2.2) / 2); tubW.renderOrder = 5; A.group.add(tubW);
    A.tick.push((t, dt) => { TX.water.offset.x += dt * .02; TX.water.offset.y += dt * .013; });
    // foam bubbles
    { const bm = new THREE.MeshLambertMaterial({ color:0xffffff, transparent:true, opacity:.85 }); const bi = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 10, 8), bm, 26); const m4 = new THREE.Matrix4();
      for(let i = 0; i < 26; i++){ const s = .4 + Math.random() * .7; m4.makeScale(s, s * .7, s); m4.setPosition(BX0 + 1.5 + Math.random() * 3, WY + .1, BZ0 + .5 + Math.random() * 7); if(i > 13) m4.setPosition(BX1 - 1 - Math.random() * 2.5, WY + .1, BZ0 + .5 + Math.random() * 7); bi.setMatrixAt(i, m4); }
      A.group.add(bi); }
    const duck = MD.duck(); A.group.add(duck);
    const duckC = { x0:0, y0:0, z0:0, x1:0, y1:0, z1:0, b:0, cam:false, dx:0, dz:0 }; A.dyn.push(duckC);
    const boat = MD.boat(); A.group.add(boat);
    const boatC = { x0:0, y0:0, z0:0, x1:0, y1:0, z1:0, b:0, cam:false, dx:0, dz:0 }; A.dyn.push(boatC);
    const soaps = [];
    for(let k = 0; k < 2; k++){ const g = new THREE.Group(); const sb = new Builder(); sb.add('plastic', MD.R(2.6, .9, 1.8, .4), 0, 0, 0, 1, 1, 1, 0, k ? 0xff9fc2 : 0x8fdcb4, 1); sb.meshes({ plastic:MATS.plastic }, g); A.group.add(g);
      const c = { x0:0, y0:0, z0:0, x1:0, y1:0, z1:0, b:0, slip:true, cam:false, dx:0, dz:0 }; A.dyn.push(c); soaps.push({ g, c, x:46 + k * 6, z:-20 + k * 1.5, p:k * 2 }); }
    const setDyn = (c, x, y0, y1, z, rx, rz) => { const ox = (c.x0 + c.x1) / 2, oz = (c.z0 + c.z1) / 2, oy = c.y1; Object.assign(c, { x0:x - rx, x1:x + rx, z0:z - rz, z1:z + rz, y0, y1 }); c.dx = x - ox; c.dz = z - oz; c.dy = y1 - oy; };
    let duckT = 0;
    A.tick.push((t, dt) => {
      duckT += dt * .28;
      const dxp = 49.8 + Math.sin(duckT) * 6.2, dzp = -20 + Math.sin(duckT * 2) * 2.2, bob = Math.sin(t * 2) * .12;
      duck.position.set(dxp, WY - .55 + bob, dzp); duck.rotation.y = Math.atan2(Math.cos(duckT) * 6.2, Math.cos(duckT * 2) * 4.4) * .25 + (Math.cos(duckT) > 0 ? PI / 2 : -PI / 2);
      setDyn(duckC, dxp, WY - 2, WY + .9 + bob, dzp, 1.3, 1.3);
      const bxp = 49.8 - Math.sin(duckT * .8 + 1) * 5.5, bzp = -21.6;
      boat.position.set(bxp, WY - .45 + Math.sin(t * 1.7) * .1, bzp); boat.rotation.y = PI / 2;
      setDyn(boatC, bxp, WY - 2, WY + .45 + Math.sin(t * 1.7) * .1, bzp, 2.1, 1.2);
      for(const s of soaps){ const y = WY + .1 + Math.sin(t * 1.5 + s.p) * .25; s.g.position.set(s.x, y, s.z); setDyn(s.c, s.x, y - .45, y + .45, s.z, 1.3, .9); }
    });
    A.props.duck = { c:duckC };
    A.line(44, 7.9, -16.2, 56, 7.9, -16.2, 5); A.ring(50, 7.4, -20, 3, 6);
    // soap dish on the wall above the tub (golden button)
    A.S('plastic', 47, 11.6, -25, 53, 12.4, -22.6, 0xdfe8ee, 2, { r:.2 });
    A.S('plastic', 48, 12.4, -24.6, 50.6, 13.4, -23, 0xffc0d8, 2, { r:.4, slip:true });
    A.buttons.push({ id:'b_dish', x:52, y:13.5, z:-23.8 });
    A.pads.push({ x:44, y:0, z:-8, to:[50, 12.4, -23.6] });
    // sink with a mirror
    A.S('plastic', 33.5, 0, -25, 36.5, 10, -22, 0xffffff, 3, { r:.5 });
    A.S('plastic', 32, 10, -25, 39, 12, -19, 0xffffff, 3, { r:.6 });
    A.B.add('plastic', CYL, 35.5, 12.02, -21.8, 2, .05, 2, 0, 0xbfe6f5, 1);
    A.V('plastic', 35.2, 12, -25, 35.8, 14.5, -23.6, 0xc9cfd6, 1); A.V('plastic', 35.2, 14, -24, 35.8, 14.6, -21.8, 0xc9cfd6, 1);
    const mirror = new THREE.Mesh(PLANE, new THREE.MeshPhongMaterial({ color:0xdff3ff, shininess:150, specular:0xffffff })); mirror.scale.set(7, 8, 1); mirror.position.set(35.5, 19, -24.9); A.group.add(mirror);
    A.S('plastic', 37, 12, -24.6, 38.4, 14.4, -23.2, 0x5ed67a, 1, { r:.3 });
    A.buttons.push({ id:'b_sink', x:33.2, y:13.2, z:-21 });
    A.pads.push({ x:46, y:0, z:2, to:[34.5, 12, -20.5] });
    // laundry basket, towels, bath mat
    A.S('woodLight', 51, 0, 2, 57, 5, 7, 0xe2c08a, 2, { r:.5 }); A.V('fabric', 51.6, 4.6, 2.6, 56.4, 5.6, 6.4, 0x8fd3ff, 2, .4);
    A.V('plastic', 33, 15, 7.6, 41, 15.5, 8, 0xc9cfd6, 1); A.V('fabric', 34, 9, 7, 39.5, 15.4, 7.8, 0xff9fc2, 2, .3);
    flat(A, 'fabric', 50, .04, -11.5, 10, 4, [0, 0, 2, 1], 0x5ed6a0);
    A.coins.push([54, 6.4, 4.5]); A.line(34, .9, -6, 56, .9, -6, 7); A.line(36, 13, -21.5, 36, 13, -21.5, 1);
    /* enemies */
    A.enemies.push({ kind:'soldier', path:[[-26, 0], [-26, 14]], y:0, sp:1.5 }, { kind:'soldier', path:[[8, 22], [26, 22]], y:0, sp:1.6 }, { kind:'ball', path:[[-6, -6], [10, -6]], y:0, sp:2.8 },
      { kind:'mouse', path:[[34, -2], [56, -2]], y:0, sp:3 }, { kind:'ball', path:[[38, -12], [38, 4]], y:0, sp:2.4 });
    return A;
  }

  /* ======================================================================
     HUB: «قرية بوبو» — outdoor village
     ====================================================================== */
  function buildHub(){
    const A = area('hub');
    A.rooms = [{ id:'hub', x0:-200, z0:-200, x1:200, z1:200 }];
    const RIV = z => z > 19 && z < 27;
    const terr = (x, z) => {
      let h = Math.sin(x * .045) * 1.4 + Math.cos(z * .05 + 1) * 1.2 + Math.sin((x + z) * .03) * 1.5;
      const r = Math.hypot(x, z - 2); h *= Math.min(1, Math.max(0, (r - 18) / 26)); // flat plaza
      const dr = Math.abs(z - 23); if(dr < 9) h = h * (dr / 9) - (1 - dr / 9) * 3.2; // river bed
      if(x < -60) h += (Math.min(1, (-60 - x) / 4)) * 11;  // cliff west
      if(z < -38) h = Math.max(h, 0);
      return h;
    };
    A.ground = terr; A.groundY = terr;
    // terrain mesh
    { const N = 120, S = 170, g = new THREE.PlaneGeometry(S * 2, S * 2, N, N); g.rotateX(-PI / 2); const p = g.attributes.position, cols = [];
      for(let i = 0; i < p.count; i++){ const x = p.getX(i), z = p.getZ(i); const y = terr(x, z); p.setY(i, y);
        const sand = Math.abs(z - 23) < 6.5, c = sand ? [1, .93, .75] : y > 6 ? [.85, .92, .8] : [1, 1, 1]; cols.push(...c); }
      g.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3)); g.computeVertexNormals();
      const uv = g.attributes.uv; for(let i = 0; i < uv.count; i++) uv.setXY(i, p.getX(i) / 9, p.getZ(i) / 9);
      const m = new THREE.Mesh(g, MATS.grass); m.receiveShadow = true; A.group.add(m); }
    // dirt paths (ribbons following the ground)
    const path = (pts, w) => {
      for(let i = 0; i < pts.length - 1; i++){ const [x0, z0] = pts[i], [x1, z1] = pts[i + 1], n = Math.ceil(Math.hypot(x1 - x0, z1 - z0) / 2);
        for(let k = 0; k < n; k++){ const a = k / n, b = (k + 1) / n, ax = x0 + (x1 - x0) * a, az = z0 + (z1 - z0) * a, bx = x0 + (x1 - x0) * b, bz = z0 + (z1 - z0) * b;
          const mx = (ax + bx) / 2, mz = (az + bz) / 2, len = Math.hypot(bx - ax, bz - az) + .6, ang = Math.atan2(bz - az, bx - ax);
          if(RIV(mz) && Math.abs(mx) < 5) continue;
          A.B.add('dirt|f', PLANE.clone().rotateX(-PI / 2), mx, terr(mx, mz) + .06, mz, len, 1, w, -ang, 0xffffff, 6); } }
    };
    path([[0, -36], [0, 0], [0, 40], [0, 70]], 5); path([[0, 4], [30, 6], [44, 30], [40, 60]], 4); path([[0, 4], [-26, 2], [-40, 30], [-30, 52]], 4); path([[0, 44], [-30, 44]], 3.5); path([[0, 50], [26, 46]], 3.5);
    // plaza stones
    { const n = 40; for(let i = 0; i < n; i++){ const a = i / n * PI * 2; A.B.add('stone|f', R1(2.2, .3, 1.4, .12), Math.cos(a) * 9, .1, 2 + Math.sin(a) * 9, 1, 1, 1, -a, 0xffffff, 3); } }
    // river water + waterfall
    const wmat = new THREE.MeshPhongMaterial({ map:TX.water, color:0x9fe4ff, transparent:true, opacity:.85, shininess:110, specular:0xffffff, depthWrite:false });
    const riv = new THREE.Mesh(new THREE.PlaneGeometry(340, 12), wmat); riv.rotation.x = -PI / 2; riv.position.set(0, -1.1, 23); riv.renderOrder = 5; A.group.add(riv);
    A.water.push({ x0:-170, z0:17, x1:170, z1:29, y:-1.1, floor:-4 });
    const fallTex = TX.water.clone(); fallTex.needsUpdate = true; fallTex.repeat.set(2, 3);
    const fall = new THREE.Mesh(new THREE.PlaneGeometry(10, 13), new THREE.MeshLambertMaterial({ map:fallTex, color:0xd8f6ff, transparent:true, opacity:.9, side:THREE.DoubleSide })); fall.position.set(-60.5, 5.2, 23); fall.rotation.y = PI / 2; A.group.add(fall);
    const foam = new THREE.Mesh(new THREE.CircleGeometry(5, 20), new THREE.MeshBasicMaterial({ color:0xffffff, transparent:true, opacity:.7 })); foam.rotation.x = -PI / 2; foam.position.set(-57, -1, 23); A.group.add(foam);
    A.tick.push((t, dt) => { TX.water.offset.x += dt * .03; fallTex.offset.y += dt * .9; foam.scale.setScalar(1 + Math.sin(t * 6) * .05); });
    // cliff rocks around the waterfall (+ a secret ledge behind the water)
    A.S('stone', -64, -2, 8, -61, 12, 18, 0xd8d2c8, 4, { r:.8 }); A.S('stone', -64, -2, 28, -61, 12, 40, 0xd8d2c8, 4, { r:.8 });
    A.S('stone', -64, 8, 18, -61.6, 8.8, 28, 0xd8d2c8, 3);
    A.buttons.push({ id:'h_fall', x:-62.8, y:10, z:23 });
    A.pads.push({ x:-52, y:terr(-52, 12), z:12, to:[-62.6, 8.8, 20] });
    A.S('woodDark', -61.5, 7.2, 14, -59.6, 8, 32, 0xffffff, 3);
    for(const [x, y, z, s] of [[-62, 12.5, 12, 3], [-63, 13, 34, 3.4], [-61, 1, 14.5, 2], [-61, 1, 31.5, 2.2], [-57, -1, 16.5, 1.6], [-57.5, -1, 30, 1.8], [-64, 15, 20, 2.4], [-64, 15, 27, 2.4]])
      A.S('stone', x - s, y - s * .8, z - s, x + s, y + s * .8, z + s, 0xe2dcd2, 3, { r:s * .4 });
    { const top = new THREE.Mesh(new THREE.PlaneGeometry(14, 9), wmat); top.rotation.x = -PI / 2; top.position.set(-68, 11.75, 23); A.group.add(top);
      const spray = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), new THREE.MeshBasicMaterial({ color:0xffffff, transparent:true, opacity:.45, depthWrite:false })); spray.scale.set(6, 1.6, 4.5); spray.position.set(-58.5, -.6, 23); A.group.add(spray);
      A.tick.push(t => { spray.scale.y = 1.4 + Math.sin(t * 7) * .25; spray.material.opacity = .38 + Math.sin(t * 5) * .08; }); }
    // bridge
    A.S('boards', -4, .2, 15, 4, .8, 31, 0xffffff, 4); for(const x of [-3.8, 3.8]) for(const z of [15.5, 23, 30.5]) A.S('woodDark', x - .3, -3, z - .3, x + .3, 2.2, z + .3, 0xffffff, 2);
    for(const x of [-3.8, 3.8]) A.V('woodDark', x - .15, 1.8, 15, x + .15, 2.1, 31, 0xffffff, 2);
    A.col(-4.2, .8, 15, -3.5, 2.2, 31); A.col(3.5, .8, 15, 4.2, 2.2, 31);
    A.line(0, 1.7, 16, 0, 1.7, 30, 6);
    /* --- the GIANT house (north): wall, door ajar, windows, roof --- */
    const HZ = -40, HX0 = -70, HX1 = 50;
    A.S('wallpaper|w', HX0, -2, HZ - 4, -12, 62, HZ, 0xfff3d8, 14); A.S('wallpaper|w', 12, -2, HZ - 4, HX1, 62, HZ, 0xfff3d8, 14); A.S('wallpaper|w', -12, 40, HZ - 4, 12, 62, HZ, 0xfff3d8, 14);
    A.V('stone|w', HX0, -2, HZ - .6, HX1, 6, HZ + .6, 0xffffff, 5);
    A.V('woodDark|w', -13.4, 0, HZ - .5, -12, 41.4, HZ + .8, 0xffffff, 4); A.V('woodDark|w', 12, 0, HZ - .5, 13.4, 41.4, HZ + .8, 0xffffff, 4); A.V('woodDark|w', -13.4, 40, HZ - .5, 13.4, 41.4, HZ + .8, 0xffffff, 4);
    A.B.add('woodDark', BOXG, -6.5, 20, HZ - 4, 13, 40, 1.4, -.9, 0xffffff, 5); A.col(-12, 0, HZ - 4, -10, 40, HZ - 1);
    const dark = new THREE.Mesh(PLANE, new THREE.MeshBasicMaterial({ color:0x6a4a30 })); dark.scale.set(24, 40, 1); dark.position.set(0, 20, HZ - 3.9); A.group.add(dark);
    const doorGlow = new THREE.Mesh(PLANE, glowMat(0xffd59a, .4)); doorGlow.scale.set(10, 30, 1); doorGlow.position.set(4, 15, HZ - 3.5); A.group.add(doorGlow);
    A.S('stone', -16, 0, HZ, 16, 1.4, HZ + 6, 0xffffff, 4); A.S('stone', -14, 1.4, HZ, 14, 2.6, HZ + 3, 0xffffff, 4);
    flat(A, 'fabric', 0, 2.65, HZ + 1.5, 12, 2.6, [0, 0, 2, 1], 0x8a5a30);
    A.doors.push({ x:2, y:2.6, z:HZ + 1, r:3, to:'down', at:'front', icon:'🛋️', name:L('البيت الكبير', 'The big house', 'Büyük ev') });
    for(const wx of [-45, -28, 28, 42]) for(const wy of [18, 44]){ const win = new THREE.Mesh(PLANE, new THREE.MeshBasicMaterial({ color:wy > 30 ? 0xcfeeff : 0xffe9b0 })); win.scale.set(11, 14, 1); win.position.set(wx, wy, HZ + .05); A.group.add(win);
      A.V('plastic|w', wx - 6, wy - 7.6, HZ, wx + 6, wy + 7.6, HZ + .6, 0xffffff, 3); A.V('plastic|w', wx - 6.5, wy - 8.4, HZ, wx + 6.5, wy - 7.6, HZ + 2.4, 0xffffff, 3); }
    // the window ledge is a secret spot (button) — a pad sends you up
    A.col(-34.5, 0, HZ, -21.5, 9.6, HZ + 2.4);
    A.buttons.push({ id:'h_window', x:-28, y:10.8, z:HZ + 1.4 });
    A.pads.push({ x:-28, y:terr(-28, -26), z:-26, to:[-28, 9.6, HZ + 1.2] });
    A.B.add('roof|w', BOXG, -10, 70, HZ - 14, 130, 3, 34, 0, 0xd4554a, 8, .55); A.B.add('roof|w', BOXG, -10, 70, HZ + 8, 130, 3, 34, 0, 0xd4554a, 8, -.55);
    A.S('plastic|w', -22, 0, HZ, -16, 4, HZ + 4, 0x7ec850, 3, { r:1.2 }); A.S('plastic|w', 16, 0, HZ, 22, 4, HZ + 4, 0x7ec850, 3, { r:1.2 });
    // toy portal to the kids' room (rainbow ring)
    { const g = new THREE.Group(); const rc = [0xff5a5a, 0xffb43d, 0xffe14d, 0x5ed67a, 0x4fb3ff, 0xa77bff];
      rc.forEach((c, i) => { const m = new THREE.Mesh(new THREE.TorusGeometry(3.6 - i * .28, .16, 8, 36), new THREE.MeshLambertMaterial({ color:c, emissive:c, emissiveIntensity:.35 })); g.add(m); });
      const core = new THREE.Mesh(new THREE.CircleGeometry(2.1, 30), new THREE.MeshBasicMaterial({ color:0xe8f6ff, transparent:true, opacity:.75 })); g.add(core);
      g.position.set(30, terr(30, -30) + 4, -30); A.group.add(g); A.tick.push(t => { core.material.opacity = .55 + Math.sin(t * 3) * .2; g.rotation.z = Math.sin(t) * .05; });
      A.S('stone', 27, terr(30, -30) - 1, -31, 33, terr(30, -30) + .4, -29, 0xffffff, 3); }
    A.doors.push({ x:30, y:terr(30, -30), z:-29.6, r:2.6, to:'up', at:'portal', icon:'🧸', name:L('غرفة الولاد', "Kids' room", 'Çocuk odası') });
    /* --- little wooden houses (hero-sized) --- */
    const smallHouse = (x, z, ry, col, roofCol) => {
      const y = terr(x, z) - .3, w = 7, d = 6, h = 5;
      const c = Math.cos(ry), s = Math.sin(ry);
      A.B.add('boards', R1(w, h, d, .3), x, y + h / 2, z, 1, 1, 1, ry, col, 4);
      A.B.add('roof', BOXG, x + s * 1.6, y + h + 1.5, z + c * 1.6, w + 1.2, .5, 4.2, ry, roofCol, 4, .65);
      A.B.add('roof', BOXG, x - s * 1.6, y + h + 1.5, z - c * 1.6, w + 1.2, .5, 4.2, ry, roofCol, 4, -.65);
      A.B.add('boards', BOXG, x, y + h + .9, z, w - .2, 2, .3, ry, col, 4);
      A.B.add('woodDark', BOXG, x + s * (d / 2 + .05), y + 1.5, z + c * (d / 2 + .05), 1.8, 3, .2, ry, 0xffffff, 2);
      for(const k of [-1, 1]) A.B.add('plastic', BOXG, x + s * (d / 2 + .05) + c * k * 2.3, y + 3, z + c * (d / 2 + .05) - s * k * 2.3, 1.3, 1.2, .2, ry, 0x8fd3ff, 1);
      A.B.add('woodDark', BOXG, x - c * 2.2, y + h + 2.6, z + s * 2.2, .9, 2, .9, ry, 0x9a5a3a, 2);
      const hw = Math.abs(c) * w / 2 + Math.abs(s) * d / 2, hd = Math.abs(s) * w / 2 + Math.abs(c) * d / 2;
      A.col(x - hw, y - 2, z - hd, x + hw, y + h + .1, z + hd);
      return y + h;
    };
    const roofY = smallHouse(-30, 40, 0, 0xffffff, 0xe0584c); smallHouse(26, 48, -.4, 0xf2e2c8, 0x7ab8e8); smallHouse(-12, 62, .3, 0xffe8d0, 0x8ad07a); smallHouse(42, 26, -1.2, 0xffffff, 0xf5a623);
    A.S('boards', -33.5, roofY + .1, 38, -26.5, roofY + .6, 42, 0xffffff, 3);
    A.buttons.push({ id:'h_roof', x:-30, y:roofY + 1.8, z:40 });
    A.pads.push({ x:-30, y:terr(-30, 32), z:32, to:[-30, roofY + .6, 40] });
    /* --- market stalls with striped awnings --- */
    const stall = (x, z, ry, awn, goods) => {
      const y = terr(x, z), c = Math.cos(ry), s = Math.sin(ry);
      A.B.add('woodLight', R1(5, 2.2, 2.2, .2), x, y + 1.1, z, 1, 1, 1, ry, 0xffffff, 3);
      for(const k of [-1, 1]) for(const j of [-1, 1]) A.B.add('woodDark', BOXG, x + c * k * 2.3 - s * j * 1.6 * 0 + s * (j > 0 ? -1.4 : 1), y + 2.2, z - s * k * 2.3 + c * (j > 0 ? -1.4 : 1), .25, 4.4, .25, ry, 0xffffff, 2);
      A.B.add(awn, BOXG, x, y + 4.5, z, 5.8, .2, 3.6, ry, 0xffffff, 1, .25);
      for(let k = 0; k < 6; k++) A.B.add(awn, new THREE.CylinderGeometry(.48, .48, .3, 10, 1, false, 0, PI), x + c * (-2.4 + k * .97) + s * 1.8, y + 3.98, z - s * (-2.4 + k * .97) + c * 1.8, 1, 1, 1, ry + PI / 2, 0xffffff, 1, PI / 2);
      goods.forEach((g, i) => A.B.add('plastic', SPH, x + c * (-1.6 + i * 1.1) + s * .3, y + 2.5, z - s * (-1.6 + i * 1.1) + c * .3, .45, .45, .45, 0, g, 1));
      const hw = Math.abs(c) * 2.6 + Math.abs(s) * 1.2, hd = Math.abs(s) * 2.6 + Math.abs(c) * 1.2; A.col(x - hw, y - 1, z - hd, x + hw, y + 2.2, z + hd);
    };
    stall(16, -4, 0, 'awnR', [0xffd23f, 0x3f9a4a, 0xff5fa2, 0xe8304f]); stall(24, 8, -PI / 2, 'awnB', [0xe8304f, 0xffd23f, 0x7ad04a, 0xff8a1a]); stall(-16, -6, 0, 'awnG', [0xff8a1a, 0xc77dff, 0xffd23f, 0xff5a7a]);
    /* --- villagers with quests --- */
    A.npcs.push({ id:'bunny', kind:'bunny', x:16, y:terr(16, -1.6), z:-1.6, f:0, shop:true }, { id:'frog', kind:'frog', x:-8, y:terr(-8, 12), z:12, f:.6 }, { id:'hen', kind:'hen', x:-24, y:terr(-24, 4), z:4, f:.9 },
      { id:'hog', kind:'hedgehog', x:6, y:terr(6, -24), z:-24, f:-.3 });
    /* --- trees, fences, crates, flowers, rocks --- */
    const tree = (x, z, s = 1) => { const y = terr(x, z) - .2;
      A.B.add('bark', R1(1.2 * s, 6 * s, 1.2 * s, .3 * s), x, y + 3 * s, z, 1, 1, 1, 0, 0xffffff, 3);
      const L2 = [[0, 7.5, 0, 5], [1.6, 6.4, .8, 3.4], [-1.5, 6.6, -.6, 3.6], [.3, 9.2, -.3, 3.4]];
      for(const [dx, dy, dz, r] of L2) A.B.add('leaves', R1(r * s, r * .85 * s, r * s, r * .3 * s), x + dx * s, y + dy * s, z + dz * s, 1, 1, 1, (x * 7) % 1, 0xffffff, 4);
      A.col(x - .6 * s, y - 2, z - .6 * s, x + .6 * s, y + 6 * s, z + .6 * s); };
    for(const [x, z, s] of [[-50, -20, 1.2], [-44, -8, 1], [-58, 50, 1.3], [-48, 64, 1], [52, -10, 1.2], [60, 10, 1], [58, 60, 1.3], [38, 70, 1], [-20, 74, 1.1], [14, 72, 1],
      [-42, 18, .9], [46, 16, .9], [-70, -24, 1.4], [70, -26, 1.4], [70, 40, 1.2], [-74, 60, 1.3], [24, -24, 1], [-36, -28, 1.1], [56, 36, 1]]) tree(x, z, s);
    const fence = (x0, z0, x1, z1) => { const n = Math.ceil(Math.hypot(x1 - x0, z1 - z0) / 2.4); for(let i = 0; i <= n; i++){ const x = x0 + (x1 - x0) * i / n, z = z0 + (z1 - z0) * i / n, y = terr(x, z); A.B.add('woodLight', R1(.35, 1.8, .35, .1), x, y + .8, z, 1, 1, 1, 0, 0xffffff, 2); }
      const ang = Math.atan2(z1 - z0, x1 - x0), len = Math.hypot(x1 - x0, z1 - z0); for(const hy of [.7, 1.4]) for(let i = 0; i < n; i++){ const a = (i + .5) / n, x = x0 + (x1 - x0) * a, z = z0 + (z1 - z0) * a; A.B.add('woodLight', BOXG, x, terr(x, z) + hy, z, len / n + .2, .25, .15, -ang, 0xffffff, 2); } };
    fence(-40, 32, -40, 50); fence(-40, 50, -20, 50); fence(34, 38, 50, 38); fence(10, 34, 10, 40);
    for(const [x, z] of [[8, 36], [9.4, 37.3], [-36, 10], [36, -6], [-46, 40], [30, 62]]){ const y = terr(x, z); A.crates.push({ x, y, z }); }
    { const fl = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(.32, 0), new THREE.MeshLambertMaterial(), 220), st = new THREE.InstancedMesh(new THREE.CylinderGeometry(.05, .05, .7, 4), new THREE.MeshLambertMaterial({ color:0x3f9a3a }), 220), m4 = new THREE.Matrix4(), cc = new THREE.Color();
      const fcols = [0xff6b8f, 0xffd23f, 0xffffff, 0xc77dff, 0xff9a3c, 0x6cc4ff];
      let n = 0; const rr = (() => { let s = 99; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
      while(n < 220){ const x = rr() * 160 - 80, z = rr() * 110 - 30; if(Math.abs(z - 23) < 8 || (Math.abs(x) < 6) || Math.hypot(x, z - 2) < 12 || x < -60) continue;
        const y = terr(x, z); m4.makeTranslation(x, y + .7, z); fl.setMatrixAt(n, m4); fl.setColorAt(n, cc.set(fcols[n % fcols.length])); m4.makeTranslation(x, y + .35, z); st.setMatrixAt(n, m4); n++; }
      A.group.add(fl); A.group.add(st); }
    for(const [x, z, s] of [[-20, 30, 1.4], [30, 34, 1], [-56, -4, 1.8], [62, 24, 1.6], [12, 58, 1.2]]){ const y = terr(x, z); A.S('stone', x - s, y - .5, z - s * .8, x + s, y + s * 1.1, z + s * .8, 0xffffff, 3, { r:s * .45 }); }
    // sky dome, clouds, distant hills
    { const sky = new THREE.Mesh(new THREE.SphereGeometry(400, 24, 12), new THREE.MeshBasicMaterial({ map:TX.sky, side:THREE.BackSide, fog:false, depthWrite:false })); sky.renderOrder = -1; A.group.add(sky); A.sky = sky;
      const cm = new THREE.SpriteMaterial({ map:TX.cloud, transparent:true, opacity:.95, fog:false, depthWrite:false });
      for(let i = 0; i < 14; i++){ const s = new THREE.Sprite(cm); const a = i / 14 * PI * 2; s.position.set(Math.cos(a) * 220, 70 + (i % 3) * 18, Math.sin(a) * 220); s.scale.set(90, 45, 1); A.group.add(s); }
      for(let i = 0; i < 18; i++){ const a = i / 18 * PI * 2; A.B.add('grass|w', new THREE.SphereGeometry(1, 12, 8), Math.cos(a) * 175, -6, Math.sin(a) * 175, 50 + (i % 4) * 12, 22 + (i % 3) * 10, 40, a, 0xa8d890, 20); } }
    // coins, checkpoints, spawns
    A.ring(0, 1, 2, 6, 10); A.line(0, 1.2, -12, 0, 3, -32, 6); A.line(8, 1.2, 5, 36, 1.2, 10, 7); A.line(-6, 1.2, 3, -34, 1.2, 10, 7); A.line(-30, 1.5, 34, -30, 1.5, 48, 4);
    A.line(26, 1.5, 40, 26, 1.5, 52, 4); A.ring(-12, terr(-12, 50) + 1.2, 50, 3, 6); A.line(-50, terr(-50, 14) + 1.2, 14, -56, terr(-56, 18) + 1.2, 18, 3); A.line(30, 6, -30, 30, 6, -30, 1);
    for(const c of A.coins) c[1] = Math.max(c[1], terr(c[0], c[2]) + 1.1);
    A.spawns.start = [0, 0, -6, 0]; A.spawns.house = [2, 2.6, -32, 0]; A.spawns.portal = [30, terr(30, -25), -25, 0];
    for(const k in A.spawns){ const s = A.spawns[k]; s[1] = Math.max(s[1], terr(s[0], s[2])); }
    A.checks.push({ x:-6, y:terr(-6, -6), z:-6 }, { x:-8, y:terr(-8, 40), z:40 });
    A.enemies.push({ kind:'mouse', path:[[10, 14], [30, 14]], y:null, sp:2.6 }, { kind:'ball', path:[[-14, 36], [-14, 54]], y:null, sp:2.4 }, { kind:'soldier', path:[[20, 60], [36, 60]], y:null, sp:1.5 }, { kind:'mouse', path:[[-48, -14], [-30, -14]], y:null, sp:2.6 });
    A.sun = { dir:[-.6, 1.25, .45], col:0xfff0d2, int:2.5, hemi:[0xd8efff, 0x9ab870, 1.3], bg:0xbfe4ff, fog:[0xd6efff, 90, 330] };
    return A;
  }

  const BUILD = { hub:buildHub, down:buildDown, up:buildUp };
  const cache = {};
  function get(id){ if(!cache[id]){ const A = BUILD[id](); A.flush(); cache[id] = A; } return cache[id]; }
  const ROOM_NAME = { hub:L('قرية بوبو', 'Bobo Village', 'Bobo Köyü'), living:L('غرفة القعدة', 'Living room', 'Oturma odası'), kitchen:L('المطبخ', 'Kitchen', 'Mutfak'), kids:L('غرفة الولاد', "Kids' room", 'Çocuk odası'), bath:L('الحمّام', 'Bathroom', 'Banyo') };
  const ROOM_ICON = { hub:'🌳', living:'🛋️', kitchen:'🍳', kids:'🧸', bath:'🛁' };
  return { get, MATS, ROOM_NAME, ROOM_ICON };
}
