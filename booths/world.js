/* «بسطات بوبو» (Bobo Booths): the island plaza at sunset. A round paved plaza with a fountain in the middle (its tall mast
   carries the string lights), a ring of 16 wooden booths facing the fountain (striped roof in the owner's colour and a sign
   board painted on a small canvas), the «🏆 أحلى البسطات» board by the fountain, palm trees on the grass, a sandy beach and
   the sea, lamp posts, a path to the beach and two golf carts. Repeated things are instanced (booth bodies, coloured roof
   stripes, palms, bulbs, lamps) so a mid phone draws the whole plaza in a few dozen calls. Everything is flat (ground y = 0).
   makePlaza(THREE, K) → { group, BOOTHS, toLocal, toWorld, collide, cartCollide, setBooth, drawBoard, CARTS (meshes), tick } */
export function makePlaza(THREE, K){
  const group = new THREE.Group();
  const { Merge, G } = K;
  const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _s = new THREE.Vector3(), _v = new THREE.Vector3(), _c = new THREE.Color();
  let seed = 4242;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const lambert = (o = {}) => new THREE.MeshLambertMaterial(Object.assign({ vertexColors:true }, o));
  const mesh = (geo, mat, cast = true, recv = true) => { const m = new THREE.Mesh(geo, mat); m.castShadow = cast; m.receiveShadow = recv; group.add(m); return m; };
  function cv(w, h, draw){ const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); return c; }
  function tex(c, rep){ const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; if(rep){ t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep, rep); } t.anisotropy = 4; return t; }
  const noise = (x, w, h, a, n = 1500) => { for(let i = 0; i < n; i++){ x.fillStyle = `rgba(${rnd() < .5 ? '0,0,0' : '255,255,255'},${a * rnd()})`; x.fillRect(rnd() * w, rnd() * h, 2, 2); } };

  /* ---------- ground: sea, beach, grass, the paved plaza, a path ring and a path to the beach ---------- */
  const PLAZA_R = 18.6, GRASS_R = 26, SAND_R = 37, WALK_R = 33.5;
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(900, 900).rotateX(-Math.PI / 2), new THREE.MeshLambertMaterial({ color:0x2f5e9e, emissive:0x1a2a55 }));
  sea.position.y = -.45; sea.receiveShadow = false; group.add(sea);
  const sandTex = tex(cv(256, 256, (x, w, h) => { x.fillStyle = '#e8c98e'; x.fillRect(0, 0, w, h); noise(x, w, h, .12, 2600); }), 14);
  const sandGeo = new THREE.RingGeometry(GRASS_R - 1, SAND_R, 72, 6).rotateX(-Math.PI / 2);
  { const p = sandGeo.attributes.position; for(let i = 0; i < p.count; i++){ const r = Math.hypot(p.getX(i), p.getZ(i)); p.setY(i, r > 31 ? -(r - 31) / (SAND_R - 31) * .62 : 0); } sandGeo.computeVertexNormals(); }
  const sand = new THREE.Mesh(sandGeo, new THREE.MeshLambertMaterial({ map:sandTex })); sand.receiveShadow = true; group.add(sand);
  const foam = new THREE.Mesh(new THREE.RingGeometry(SAND_R - .6, SAND_R + .9, 72).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color:0xf4f0ff, transparent:true, opacity:.5, depthWrite:false }));
  foam.position.y = -.4; group.add(foam);
  const grassTex = tex(cv(256, 256, (x, w, h) => { x.fillStyle = '#5f9a4a'; x.fillRect(0, 0, w, h); for(let i = 0; i < 1800; i++){ x.fillStyle = ['#6aa852', '#558e42', '#79b45c', '#4c8a3e'][(rnd() * 4) | 0]; x.fillRect(rnd() * w, rnd() * h, 2, 4); } }), 10);
  const grass = new THREE.Mesh(new THREE.CircleGeometry(GRASS_R, 72).rotateX(-Math.PI / 2), new THREE.MeshLambertMaterial({ map:grassTex }));
  grass.position.y = .005; grass.receiveShadow = true; group.add(grass);
  const tileTex = tex(cv(256, 256, (x, w, h) => {
    x.fillStyle = '#b9a58c'; x.fillRect(0, 0, w, h);
    const n = 4, s = w / n;
    for(let i = 0; i < n; i++) for(let j = 0; j < n; j++){ const l = 70 + rnd() * 10; x.fillStyle = `hsl(${30 + rnd() * 10},${24 + rnd() * 10}%,${l}%)`; x.fillRect(i * s + 3, j * s + 3, s - 6, s - 6); }
    noise(x, w, h, .1, 1800);
  }), 12);
  const plaza = new THREE.Mesh(new THREE.CircleGeometry(PLAZA_R, 96).rotateX(-Math.PI / 2), new THREE.MeshLambertMaterial({ map:tileTex }));
  plaza.position.y = .02; plaza.receiveShadow = true; group.add(plaza);
  // the walking ring in front of the booths (terracotta) and a lighter ring around the fountain
  const ringTex = tex(cv(128, 128, (x, w, h) => { x.fillStyle = '#b8694a'; x.fillRect(0, 0, w, h); for(let i = 0; i < 4; i++) for(let j = 0; j < 2; j++){ x.fillStyle = `hsl(14,${40 + rnd() * 10}%,${46 + rnd() * 8}%)`; x.fillRect(i * 32 + (j ? 16 : 0) + 2, j * 64 + 2, 28, 60); } noise(x, w, h, .1, 500); }));
  ringTex.wrapS = ringTex.wrapT = THREE.RepeatWrapping; ringTex.repeat.set(60, 1);
  const ringGeo = (r0, r1, n) => { const g = new THREE.RingGeometry(r0, r1, n, 1).rotateX(-Math.PI / 2); const p = g.attributes.position, uv = g.attributes.uv; for(let i = 0; i < p.count; i++){ const a = Math.atan2(p.getZ(i), p.getX(i)), r = Math.hypot(p.getX(i), p.getZ(i)); uv.setXY(i, a / (Math.PI * 2) + .5, (r - r0) / (r1 - r0)); } return g; };
  const walk = new THREE.Mesh(ringGeo(10.4, 12.2, 128), new THREE.MeshLambertMaterial({ map:ringTex })); walk.position.y = .03; walk.receiveShadow = true; group.add(walk);
  const ring2Tex = ringTex.clone(); ring2Tex.needsUpdate = true; ring2Tex.repeat.set(22, 1);
  const inner = new THREE.Mesh(ringGeo(3.6, 4.6, 64), new THREE.MeshLambertMaterial({ map:ring2Tex, color:0xffe2c8 })); inner.position.y = .03; inner.receiveShadow = true; group.add(inner);
  // the path from the plaza to the beach (+z), between two booths
  const pathTex = ringTex.clone(); pathTex.needsUpdate = true; pathTex.repeat.set(1, 6);
  const path = new THREE.Mesh(new THREE.PlaneGeometry(3, 16).rotateX(-Math.PI / 2), new THREE.MeshLambertMaterial({ map:pathTex, color:0xffd9c0 }));
  path.position.set(0, .025, PLAZA_R + 6.5); path.receiveShadow = true; group.add(path);

  /* ---------- the fountain (+ the light mast) ---------- */
  const FOUNTAIN = { x:0, z:0, r:3.45 };
  {
    const M = new Merge();
    M.add(G.cyl, 0, .3, 0, 3.35, .6, 3.35, 0, 0, 0, 0xe9dcc8);
    M.add(G.cyl, 0, .62, 0, 3.45, .08, 3.45, 0, 0, 0, 0xf6ecdc);
    M.add(G.cyl, 0, 1.0, 0, .45, 1.6, .45, 0, 0, 0, 0xe9dcc8);
    M.add(G.cyl, 0, 1.72, 0, 1.35, .22, 1.35, 0, 0, 0, 0xf6ecdc);
    M.add(G.cyl, 0, 1.55, 0, .7, .3, .7, 0, 0, 0, 0xe0d0b8);
    M.add(G.cyl8, 0, 4.7, 0, .1, 5.8, .1, 0, 0, 0, 0x6a5a7a);
    M.add(G.sph, 0, 2.0, 0, .28, .28, .28, 0, 0, 0, 0xf6ecdc);
    M.add(K.starGeo, 0, 7.85, 0, .42, .42, .42, 0, 0, 0, 0xffd23f);
    mesh(M.geometry(), lambert());
    const water = new THREE.MeshLambertMaterial({ color:0x58c4e8, emissive:0x1f5f8a });
    const w1 = new THREE.Mesh(new THREE.CircleGeometry(3.15, 40).rotateX(-Math.PI / 2), water); w1.position.y = .56; group.add(w1);
    const w2 = new THREE.Mesh(new THREE.CircleGeometry(1.22, 28).rotateX(-Math.PI / 2), water); w2.position.y = 1.84; group.add(w2);
  }
  // water drops falling from the upper bowl into the basin
  const DROPS = 48, drops = new THREE.InstancedMesh(new THREE.SphereGeometry(.06, 6, 4), new THREE.MeshBasicMaterial({ color:0xbfeaff }), DROPS);
  drops.frustumCulled = false; group.add(drops);
  const dropS = []; for(let i = 0; i < DROPS; i++) dropS.push({ a:i / DROPS * 6.283 + rnd() * .2, t:rnd(), sp:.7 + rnd() * .3 });

  /* ---------- the booths: 16 around the fountain, each facing it (local +z = toward the fountain) ---------- */
  const NB = 16, BR = 14.6;
  const BOOTHS = [];
  for(let i = 0; i < NB; i++){
    const a = (i + .5) / NB * Math.PI * 2, x = Math.cos(a) * BR, z = Math.sin(a) * BR;
    const yaw = Math.atan2(-x, -z);
    BOOTHS.push({ i, x, z, yaw, cy:Math.cos(yaw), sy:Math.sin(yaw) });
  }
  const toLocal = (b, x, z) => { const dx = x - b.x, dz = z - b.z; return { x:dx * b.cy - dz * b.sy, z:dx * b.sy + dz * b.cy }; };
  const toWorld = (b, lx, lz) => ({ x:b.x + lx * b.cy + lz * b.sy, z:b.z - lx * b.sy + lz * b.cy });
  // body (wood), one geometry for all 16 (instanced)
  const ROOF_A = Math.atan2(.45, 2.6);
  const body = (() => {
    const M = new Merge();
    M.add(G.box, 0, .07, 0, 3.3, .14, 2.5, 0, 0, 0, 0xb98a5a);
    M.add(G.box, 0, .58, .86, 3.0, .9, .46, 0, 0, 0, 0xd9a066);
    M.add(G.box, 0, 1.07, .86, 3.24, .09, .7, 0, 0, 0, 0x8a5a32);
    for(const s of [-1, 1]){
      M.add(G.box, s * 1.52, .58, -.08, .12, .9, 1.9, 0, 0, 0, 0xc89056);
      M.add(G.cyl8, s * 1.52, 1.47, -1.1, .08, 2.94, .08, 0, 0, 0, 0x7a4a2a);
      M.add(G.cyl8, s * 1.52, 1.27, 1.12, .08, 2.54, .08, 0, 0, 0, 0x7a4a2a);
      M.add(G.cyl8, s * 1.1, 3.0, 1.2, .05, .9, .05, 0, 0, 0, 0x7a4a2a);
    }
    M.add(G.box, 0, 2.95, -1.22, 3.3, .1, .1, 0, 0, 0, 0x7a4a2a);
    M.add(G.box, 0, 2.52, 1.25, 3.3, .1, .1, 0, 0, 0, 0x7a4a2a);
    M.add(G.box, 0, 3.32, 1.17, 3.3, 1.38, .08, 0, 0, 0, 0x6a3f22);
    // white roof stripes (the coloured ones are a separate instanced mesh)
    for(let k = 0; k < 8; k += 2) M.add(G.box, -1.65 + (k + .5) * .4125, 2.77, .05, .4125, .06, 2.72, ROOF_A, 0, 0, 0xfff6ea);
    // little crates and jars on the counter
    M.add(G.box, -1.0, 1.24, .82, .38, .28, .3, 0, .2, 0, 0xc8925a);
    M.add(G.cyl8, 1.05, 1.24, .86, .13, .28, .13, 0, 0, 0, 0xbfe6ff);
    M.add(G.sph, 1.05, 1.42, .86, .11, .07, .11, 0, 0, 0, 0xff8fb1);
    return M.geometry();
  })();
  const tint = (() => {
    const M = new Merge();
    for(let k = 1; k < 8; k += 2) M.add(G.box, -1.65 + (k + .5) * .4125, 2.77, .05, .4125, .065, 2.72, ROOF_A, 0, 0, 0xffffff);
    for(let k = 0; k < 8; k++) M.add(G.cyl, -1.65 + (k + .5) * .4125, 2.47, 1.33, .2, .05, .2, Math.PI / 2, 0, 0, 0xffffff);
    M.add(G.box, 0, .74, 1.1, 3.02, .26, .03, 0, 0, 0, 0xffffff);
    return M.geometry();
  })();
  const bodyMesh = new THREE.InstancedMesh(body, lambert(), NB), tintMesh = new THREE.InstancedMesh(tint, lambert(), NB);
  for(const b of BOOTHS){
    _m.compose(_v.set(b.x, 0, b.z), _q.setFromEuler(_e.set(0, b.yaw, 0)), _s.set(1, 1, 1));
    bodyMesh.setMatrixAt(b.i, _m); tintMesh.setMatrixAt(b.i, _m); tintMesh.setColorAt(b.i, _c.set(0xd8d0c8));
  }
  for(const m of [bodyMesh, tintMesh]){ m.castShadow = true; m.receiveShadow = true; group.add(m); }
  // sign boards: one small canvas each (painted again only when its booth changes)
  const SIGN_W = 384, SIGN_H = 176;
  for(const b of BOOTHS){
    const c = document.createElement('canvas'); c.width = SIGN_W; c.height = SIGN_H;
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(2.9, 2.9 * SIGN_H / SIGN_W), new THREE.MeshBasicMaterial({ map:t, toneMapped:false }));
    const p = toWorld(b, 0, 1.22); m.position.set(p.x, 3.32, p.z); m.rotation.y = b.yaw; group.add(m);
    b.cv = c; b.tex = t; b.sign = m;
  }
  const rr = (x, X, Y, w, h, r) => { x.beginPath(); x.moveTo(X + r, Y); x.arcTo(X + w, Y, X + w, Y + h, r); x.arcTo(X + w, Y + h, X, Y + h, r); x.arcTo(X, Y + h, X, Y, r); x.arcTo(X, Y, X + w, Y, r); x.closePath(); };
  const FONT = '"Baloo Bhaijaan 2","Tajawal",system-ui,sans-serif';
  const fit = (x, text, max, size, weight = 800) => { let s = size; do{ x.font = `${weight} ${s}px ${FONT}`; s -= 2; }while(x.measureText(text).width > max && s > 12); };
  /* paint one booth: o = null (free) or { name, sign, col (css), deco, hearts, mine, dir } */
  function setBooth(i, o, words){
    const b = BOOTHS[i]; if(!b) return;
    const x = b.cv.getContext('2d'), w = SIGN_W, h = SIGN_H;
    x.clearRect(0, 0, w, h);
    x.direction = (words && words.dir) || 'rtl'; x.textAlign = 'center'; x.textBaseline = 'middle';
    if(!o){
      x.fillStyle = '#f3e6d2'; rr(x, 4, 4, w - 8, h - 8, 26); x.fill();
      x.lineWidth = 8; x.strokeStyle = '#b48a62'; x.setLineDash([18, 12]); x.stroke(); x.setLineDash([]);
      x.fillStyle = '#7a5a40'; fit(x, words.free, w - 40, 44); x.fillText(words.free, w / 2, h * .38);
      x.fillStyle = '#a07a5a'; fit(x, words.claim, w - 40, 30, 700); x.fillText(words.claim, w / 2, h * .72);
      tintMesh.setColorAt(i, _c.set(0xd8d0c8));
    } else {
      x.fillStyle = '#fffaf0'; rr(x, 4, 4, w - 8, h - 8, 26); x.fill();
      x.lineWidth = 12; x.strokeStyle = o.col; x.stroke();
      if(o.mine){ x.lineWidth = 4; x.strokeStyle = '#ffd23f'; rr(x, 14, 14, w - 28, h - 28, 18); x.stroke(); }
      x.fillStyle = '#3a2410'; const t1 = o.deco + ' ' + o.name + ' ' + o.deco; fit(x, t1, w - 44, 42); x.fillText(t1, w / 2, h * .27);
      x.fillStyle = '#6a4a30'; fit(x, o.sign, w - 44, 32, 700); x.fillText(o.sign, w / 2, h * .55);
      x.fillStyle = '#e8305f'; x.font = `800 36px ${FONT}`; x.direction = 'ltr'; x.fillText('❤️ ' + String(o.hearts), w / 2, h * .81);
      tintMesh.setColorAt(i, _c.set(o.col));
    }
    tintMesh.instanceColor.needsUpdate = true;
    b.tex.needsUpdate = true;
  }

  /* ---------- «🏆 أحلى البسطات» board by the fountain (two faces) ---------- */
  const BOARD = { x:0, z:5.4, r:.5 };
  const boardCv = document.createElement('canvas'); boardCv.width = 512; boardCv.height = 384;
  const boardTex = new THREE.CanvasTexture(boardCv); boardTex.colorSpace = THREE.SRGBColorSpace; boardTex.anisotropy = 4;
  {
    const M = new Merge();
    for(const s of [-1, 1]) M.add(G.cyl8, s * 1.35, 1.2, 0, .1, 2.4, .1, 0, 0, 0, 0x6a3f22);
    M.add(G.box, 0, 2.15, 0, 3.1, 2.35, .12, 0, 0, 0, 0x6a3f22);
    M.add(K.starGeo, 0, 3.55, 0, .3, .3, .3, 0, 0, 0, 0xffd23f);
    const m = mesh(M.geometry(), lambert()); m.position.set(BOARD.x, 0, BOARD.z);
    for(const s of [1, -1]){
      const f = new THREE.Mesh(new THREE.PlaneGeometry(2.92, 2.19), new THREE.MeshBasicMaterial({ map:boardTex, toneMapped:false }));
      f.position.set(BOARD.x, 2.15, BOARD.z + s * .07); f.rotation.y = s > 0 ? 0 : Math.PI; group.add(f);
    }
  }
  /* rows = [{ deco, name, hearts, col }] (best first); words = { title, empty, dir } */
  function drawBoard(rows, words){
    const x = boardCv.getContext('2d'), w = boardCv.width, h = boardCv.height;
    const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#3b2a78'); g.addColorStop(1, '#5a3a9a'); x.fillStyle = g; x.fillRect(0, 0, w, h);
    x.strokeStyle = '#ffd23f'; x.lineWidth = 10; rr(x, 6, 6, w - 12, h - 12, 22); x.stroke();
    x.direction = words.dir || 'rtl'; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillStyle = '#ffe27a'; fit(x, words.title, w - 40, 44); x.fillText(words.title, w / 2, 44);
    if(!rows.length){ x.fillStyle = '#fff'; fit(x, words.empty, w - 50, 30, 700); x.fillText(words.empty, w / 2, h * .55); }
    rows.slice(0, 5).forEach((r, k) => {
      const y = 100 + k * 56, rtl = (words.dir || 'rtl') === 'rtl';
      x.fillStyle = k % 2 ? 'rgba(255,255,255,.08)' : 'rgba(255,255,255,.15)'; rr(x, 22, y - 24, w - 44, 48, 14); x.fill();
      x.fillStyle = r.col; x.beginPath(); x.arc(rtl ? w - 48 : 48, y, 16, 0, 7); x.fill();
      x.fillStyle = '#3a2410'; x.font = `800 22px ${FONT}`; x.direction = 'ltr'; x.fillText(String(k + 1), rtl ? w - 48 : 48, y + 1);
      x.direction = words.dir || 'rtl'; x.textAlign = rtl ? 'right' : 'left'; x.fillStyle = '#fff';
      const nm = r.deco + ' ' + r.name; fit(x, nm, w - 210, 34); x.fillText(nm, rtl ? w - 78 : 78, y + 2);
      x.textAlign = rtl ? 'left' : 'right'; x.fillStyle = '#ffb3c8'; x.font = `800 32px ${FONT}`; x.direction = 'ltr'; x.fillText('❤️ ' + String(r.hearts), rtl ? 40 : w - 40, y + 2);
      x.textAlign = 'center';
    });
    boardTex.needsUpdate = true;
  }

  /* ---------- palms (instanced), lamp posts, string lights ---------- */
  const PALMS = [];
  for(let k = 0; k < 16; k++){
    const a = k / 16 * 6.283 + .2 + rnd() * .2, r = 21 + rnd() * 3.5;
    if(Math.abs(Math.atan2(Math.sin(a - Math.PI / 2), Math.cos(a - Math.PI / 2))) < .2) continue;   // keep the beach path free
    PALMS.push({ x:Math.cos(a) * r, z:Math.sin(a) * r, s:.85 + rnd() * .35, ry:rnd() * 6.28 });
  }
  for(let k = 0; k < 7; k++){ const a = k / 7 * 6.283 + 1.0, r = 29 + rnd() * 1.6; if(Math.abs(Math.atan2(Math.sin(a - Math.PI / 2), Math.cos(a - Math.PI / 2))) < .2) continue; PALMS.push({ x:Math.cos(a) * r, z:Math.sin(a) * r, s:.9 + rnd() * .3, ry:rnd() * 6.28 }); }
  const palmGeo = (() => {
    const M = new Merge();
    let px = 0, py = 0;
    for(let k = 0; k < 8; k++){ const y = k * .62; px = Math.sin(k * .22) * .25 * k / 8 * 2; M.add(G.cyl8, px, y + .31, 0, .2 - k * .012, .66, .2 - k * .012, 0, 0, .05, k % 2 ? 0x8a6a48 : 0x9a7a52); py = y + .62; }
    for(let k = 0; k < 7; k++){ const a = k / 7 * 6.283; M.add(G.box, px + Math.cos(a) * 1.05, py - .18, Math.sin(a) * 1.05, 2.2, .05, .5, 0, -a, -.42, k % 2 ? 0x3f9a4a : 0x2f8a3c); }
    for(let k = 0; k < 3; k++) M.add(G.sph, px + Math.cos(k * 2.1) * .2, py - .2, Math.sin(k * 2.1) * .2, .14, .14, .14, 0, 0, 0, 0x6a4a2a);
    return M.geometry();
  })();
  const palms = new THREE.InstancedMesh(palmGeo, lambert(), PALMS.length);
  PALMS.forEach((p, k) => palms.setMatrixAt(k, _m.compose(_v.set(p.x, 0, p.z), _q.setFromEuler(_e.set(0, p.ry, 0)), _s.set(p.s, p.s, p.s))));
  palms.castShadow = true; palms.receiveShadow = true; group.add(palms);
  // lamp posts in every other gap between booths, behind the ring
  const LAMPS = [];
  for(let k = 0; k < 8; k++){ const a = (k * 2 + 1) / NB * Math.PI * 2; LAMPS.push({ x:Math.cos(a) * 17.4, z:Math.sin(a) * 17.4 }); }
  const lampGeo = (() => { const M = new Merge(); M.add(G.cyl8, 0, 2.3, 0, .09, 4.6, .09, 0, 0, 0, 0x3a3550); M.add(G.cyl8, 0, .15, 0, .22, .3, .22, 0, 0, 0, 0x3a3550); M.add(G.cone, 0, 4.85, 0, .32, .3, .32, 0, 0, 0, 0x3a3550); return M.geometry(); })();
  const lamps = new THREE.InstancedMesh(lampGeo, lambert(), LAMPS.length);
  LAMPS.forEach((l, k) => lamps.setMatrixAt(k, _m.compose(_v.set(l.x, 0, l.z), _q.identity(), _s.set(1, 1, 1))));
  lamps.castShadow = true; group.add(lamps);
  const lampGlobe = new THREE.InstancedMesh(new THREE.SphereGeometry(.26, 12, 8), new THREE.MeshBasicMaterial({ color:0xffe2a8, toneMapped:false }), LAMPS.length);
  LAMPS.forEach((l, k) => lampGlobe.setMatrixAt(k, _m.compose(_v.set(l.x, 4.5, l.z), _q.identity(), _s.set(1, 1, 1)))); group.add(lampGlobe);
  // string lights: from the mast to every lamp post, and around between the lamp posts (sagging wires)
  const BULB_COLS = [0xffd23f, 0xff6f9a, 0x6cf0ff, 0x8aff7a, 0xffa04a, 0xc89aff];
  const wirePts = [], bulbA = [], bulbB = [];
  const strand = (x0, y0, z0, x1, y1, z1, sag, n) => {
    let prev = null;
    for(let k = 0; k <= n; k++){
      const t = k / n, x = x0 + (x1 - x0) * t, z = z0 + (z1 - z0) * t, y = y0 + (y1 - y0) * t - Math.sin(t * Math.PI) * sag;
      if(prev) wirePts.push(prev[0], prev[1], prev[2], x, y, z);
      prev = [x, y, z];
      if(k > 0 && k < n) (k % 2 ? bulbA : bulbB).push([x, y - .08, z, BULB_COLS[(k + bulbA.length) % BULB_COLS.length]]);
    }
  };
  for(const l of LAMPS) strand(0, 7.3, 0, l.x, 4.55, l.z, .9, 18);
  for(let k = 0; k < LAMPS.length; k++){ const a = LAMPS[k], b = LAMPS[(k + 1) % LAMPS.length]; strand(a.x, 4.55, a.z, b.x, 4.55, b.z, .8, 12); }
  const wire = new THREE.LineSegments(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(wirePts, 3)), new THREE.LineBasicMaterial({ color:0x2a2238 }));
  group.add(wire);
  const bulbGeo = new THREE.SphereGeometry(.09, 8, 6);
  const bulbMats = [];
  for(const list of [bulbA, bulbB]){
    const mat = new THREE.MeshBasicMaterial({ color:0xffffff, toneMapped:false }); bulbMats.push(mat);
    const im = new THREE.InstancedMesh(bulbGeo, mat, list.length);
    list.forEach((p, k) => { im.setMatrixAt(k, _m.compose(_v.set(p[0], p[1], p[2]), _q.identity(), _s.set(1, 1, 1))); im.setColorAt(k, _c.set(p[3])); });
    im.frustumCulled = false; group.add(im);
  }
  // a few flower pots on the plaza
  {
    const M = new Merge();
    for(let k = 0; k < 8; k++){ const a = (k + .5) / 8 * 6.283, x = Math.cos(a) * 8.2, z = Math.sin(a) * 8.2; M.add(G.cyl, x, .3, z, .5, .6, .5, 0, 0, 0, 0xc0704a); M.add(G.sph, x, .75, z, .5, .38, .5, 0, 0, 0, 0x4a9a4a);
      for(let j = 0; j < 5; j++){ const b = j / 5 * 6.283; M.add(G.sm, x + Math.cos(b) * .32, .98, z + Math.sin(b) * .32, .11, .11, .11, 0, 0, 0, [0xff6f9a, 0xffd23f, 0xffffff, 0xff9a4a, 0xc89aff][(j + k) % 5]); } }
    mesh(M.geometry(), lambert());
  }
  const POTS = []; for(let k = 0; k < 8; k++){ const a = (k + .5) / 8 * 6.283; POTS.push({ x:Math.cos(a) * 8.2, z:Math.sin(a) * 8.2, r:.62 }); }

  /* ---------- golf carts (2): forward is local +z, the driver sits on the left (local +x) ---------- */
  const CART_COLS = [0xff7aa8, 0x5ed6a0];
  const CART_SEAT = { x:.3, y:.86, z:-.18 };
  const cartMeshes = CART_COLS.map(col => {
    const M = new Merge();
    M.add(G.box, 0, .5, 0, 1.3, .36, 2.3, 0, 0, 0, col);
    M.add(G.box, 0, .8, .92, 1.26, .42, .5, 0, 0, 0, col);
    M.add(G.box, 0, .74, -.25, 1.2, .2, .62, 0, 0, 0, 0xfff3e0);
    M.add(G.box, 0, 1.12, -.56, 1.2, .62, .14, 0, 0, 0, 0xfff3e0);
    for(const s of [-1, 1]){
      M.add(G.cyl8, s * .58, 1.42, .72, .035, 1.1, .035, 0, 0, 0, 0xeeeeee);
      M.add(G.cyl8, s * .58, 1.42, -.68, .035, 1.1, .035, 0, 0, 0, 0xeeeeee);
      for(const z of [-.75, .78]){ M.add(G.cyl, s * .63, .3, z, .3, .2, .3, 0, 0, Math.PI / 2, 0x26262e); M.add(G.cyl8, s * .74, .3, z, .14, .04, .14, 0, 0, Math.PI / 2, 0xdddddd); }
      M.add(G.sph, s * .42, .82, 1.18, .1, .1, .06, 0, 0, 0, 0xfff6b0);
    }
    M.add(G.box, 0, 1.98, .02, 1.42, .08, 1.82, 0, 0, 0, 0xffffff);
    M.add(G.cyl8, .3, 1.05, .45, .04, .5, .04, -.5, 0, 0, 0x333340);
    M.add(G.torus, .3, 1.25, .34, .16, .16, .16, -1.0, 0, 0, 0x333340);
    const m = mesh(M.geometry(), lambert()); m.receiveShadow = false;
    return m;
  });
  const CART_HOME = [{ x:-1.6, z:22.5, f:Math.PI }, { x:1.6, z:22.5, f:Math.PI }];

  /* ---------- collisions (circles and booth boxes) ---------- */
  const CIRCLES = [{ x:0, z:0, r:FOUNTAIN.r }, { x:BOARD.x - 1.35, z:BOARD.z, r:.25 }, { x:BOARD.x + 1.35, z:BOARD.z, r:.25 }]
    .concat(PALMS.map(p => ({ x:p.x, z:p.z, r:.35 * p.s }))).concat(LAMPS.map(l => ({ x:l.x, z:l.z, r:.25 }))).concat(POTS);
  // booth boxes in booth-local coordinates: the counter and the two low side walls (the back is open: the owner walks in)
  const BOXES = [[-1.6, 1.6, .6, 1.2], [-1.62, -1.4, -1.1, 1.0], [1.4, 1.62, -1.1, 1.0]];
  const out = { x:0, z:0, hit:false };
  function pushCircle(x, z, r, c){ const dx = x - c.x, dz = z - c.z, d = Math.hypot(dx, dz), m = r + c.r; if(d < m && d > 1e-4){ out.hit = true; return [c.x + dx / d * m, c.z + dz / d * m]; } return null; }
  /* walk: push a kid (radius r) out of everything; returns { x, z, hit } */
  function collide(x, z, r = .35){
    out.hit = false;
    for(const c of CIRCLES){ if(Math.abs(x - c.x) > c.r + r || Math.abs(z - c.z) > c.r + r) continue; const p = pushCircle(x, z, r, c); if(p){ x = p[0]; z = p[1]; } }
    for(const b of BOOTHS){
      if(Math.abs(x - b.x) > 3 || Math.abs(z - b.z) > 3) continue;
      const l = toLocal(b, x, z); let lx = l.x, lz = l.z, moved = false;
      for(const q of BOXES){
        if(lx > q[0] - r && lx < q[1] + r && lz > q[2] - r && lz < q[3] + r){
          const dl = lx - (q[0] - r), dr = q[1] + r - lx, db = lz - (q[2] - r), df = q[3] + r - lz, m = Math.min(dl, dr, db, df);
          if(m === dl) lx = q[0] - r; else if(m === dr) lx = q[1] + r; else if(m === db) lz = q[2] - r; else lz = q[3] + r;
          moved = true;
        }
      }
      if(moved){ const w = toWorld(b, lx, lz); x = w.x; z = w.z; out.hit = true; }
    }
    const d = Math.hypot(x, z); if(d > WALK_R){ x *= WALK_R / d; z *= WALK_R / d; out.hit = true; }
    out.x = x; out.z = z; return out;
  }
  /* a cart (radius ~1): booths are round obstacles here */
  const BOOTH_C = BOOTHS.map(b => ({ x:b.x, z:b.z, r:1.75 }));
  function cartCollide(x, z, others){
    out.hit = false; const r = 1.0;
    for(const list of [CIRCLES, BOOTH_C, others || []]) for(const c of list){ if(Math.abs(x - c.x) > c.r + r || Math.abs(z - c.z) > c.r + r) continue; const p = pushCircle(x, z, r, c); if(p){ x = p[0]; z = p[1]; } }
    const d = Math.hypot(x, z); if(d > WALK_R - .5){ x *= (WALK_R - .5) / d; z *= (WALK_R - .5) / d; out.hit = true; }
    out.x = x; out.z = z; return out;
  }

  /* ---------- per frame: fountain drops, twinkling bulbs ---------- */
  function tick(t, dt){
    for(let i = 0; i < DROPS; i++){
      const d = dropS[i]; d.t += dt * d.sp * .9; if(d.t > 1) d.t -= 1;
      const r = 1.25 + d.t * 1.1, y = 1.86 + Math.sin(d.t * Math.PI * .9) * .35 - d.t * d.t * 1.35;
      drops.setMatrixAt(i, _m.compose(_v.set(Math.cos(d.a) * r, Math.max(.56, y), Math.sin(d.a) * r), _q.identity(), _s.set(1, 1.6, 1)));
    }
    drops.instanceMatrix.needsUpdate = true;
    const k = .75 + .25 * Math.sin(t * 2.2);
    bulbMats[0].color.setScalar(k * 1.15); bulbMats[1].color.setScalar((1.75 - k) * 1.15);
  }

  /* the booth floors are a step up (.14) */
  function groundAt(x, z){
    for(const b of BOOTHS){ if(Math.abs(x - b.x) > 2.2 || Math.abs(z - b.z) > 2.2) continue; const l = toLocal(b, x, z); if(Math.abs(l.x) < 1.65 && Math.abs(l.z) < 1.25) return .14; }
    return 0;
  }

  return { group, NB, BR, BOOTHS, toLocal, toWorld, collide, cartCollide, setBooth, drawBoard, BOARD, FOUNTAIN, PALMS, LAMPS, POTS,
    cartMeshes, CART_HOME, CART_SEAT, CART_COLS, groundAt, tick, WALK_R, PLAZA_R,
    spawn:{ x:0, z:9.2, f:Math.PI }, MENU_CAM:[25, 10] };
}
