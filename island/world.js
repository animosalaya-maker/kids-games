/* «جزيرة بوبو الكبيرة 🏝️» world: one big island where all the game maps live side by side.
   A plaza in the middle (fountain, swings, slide, benches, lamps, balloons, the big sign), a river ring with 8 bridges,
   and 8 zones around it: castle with its moat, the farm (plot, farmhouse, stalls), the pet town and park, the restaurant
   and city («قريباً»), Grandma's house, the giant house (kitchen + bedroom) and the egg market (belt + 4 nests).
   Static pieces are merged per zone (one draw call each, vertex colours), trees are instanced, far zones swap to a
   tiny silhouette. Walking data: circles / oriented boxes (with a top height), platforms (flat / ramp / arch) that give
   the ground height (stairs, bridges, the bed), and water rings you cannot walk into.
   Axes: y up; a zone at angle a sits at (sin a, cos a)·ZR and its local +z points to the plaza. */

export const ISL = { R:96, RIVER0:32, RIVER1:38, ZR:66, ZRAD:22, PLAZA:14, PATH_W:3.6 };

export function zoneDefs(L){
  return [
    { id:'castle', path:'maps/castle/', mp:true, emoji:'🏰', col:0xb07cff, css:'#b07cff', name:L('قلعة الألعاب', 'Toy Castle', 'Oyuncak Kalesi') },
    { id:'garden', path:'garden/', mp:true, emoji:'🌻', col:0x5cc46a, css:'#5cc46a', name:L('حديقة بوبو', 'Bobo Garden', 'Bobo Bahçesi') },
    { id:'pets', path:'pets/', mp:true, emoji:'🐾', col:0xff8fb8, css:'#ff8fb8', name:L('حيوانات بوبو', 'Bobo Pets', 'Bobo Hayvanları') },
    { id:'restaurant', soon:true, emoji:'🍕', col:0xff7a45, css:'#ff7a45', name:L('المطعم', 'Restaurant', 'Restoran') },
    { id:'city', soon:true, emoji:'🏙️', col:0x5b8cff, css:'#5b8cff', name:L('المدينة', 'The City', 'Şehir') },
    { id:'granny', path:'granny/', mp:true, emoji:'👵🏻', col:0xf07aa8, css:'#f07aa8', name:L('بيت الجدّة', "Grandma's House", 'Büyükannenin Evi') },
    { id:'hide', path:'hide/', mp:true, emoji:'🙈', col:0xff9f43, css:'#ff9f43', name:L('البيت العملاق', 'The Giant House', 'Dev Ev') },
    { id:'heist', path:'heist/', mp:true, emoji:'🥚', col:0x3fc47a, css:'#3fc47a', name:L('سوق البيض', 'Egg Market', 'Yumurta Pazarı') }
  ];
}

export function buildIsland(THREE, K, scene, deps){
  const L = window.L || (a => a);
  const { G, CG, canvasTex, glowTex } = K;
  const GM = deps.GM, PM = deps.PM;
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  const _m = new THREE.Matrix4(), _m2 = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _s = new THREE.Vector3(), _v = new THREE.Vector3(), _c = new THREE.Color();
  let seed = 4242;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const TAU = Math.PI * 2;
  const GE = {
    ring:(a, b, n = 64) => new THREE.RingGeometry(a, b, n).rotateX(-Math.PI / 2),
    disc:new THREE.CircleGeometry(1, 32).rotateX(-Math.PI / 2),
    open:new THREE.CylinderGeometry(1, .82, 1, 20, 1, true),
    egg:(() => { const g = new THREE.SphereGeometry(.5, 16, 12), p = g.attributes.position;
      for(let i = 0; i < p.count; i++){ const y = p.getY(i), k = y > 0 ? 1 - y * .36 : 1 + y * .06; p.setX(i, p.getX(i) * k); p.setZ(i, p.getZ(i) * k); p.setY(i, y * 1.28 + .64); }
      g.computeVertexNormals(); return g; })(),
    prism:(() => { const s = new THREE.Shape(); s.moveTo(-.5, 0); s.lineTo(.5, 0); s.lineTo(0, .5); s.closePath(); const g = new THREE.ExtrudeGeometry(s, { depth:1, bevelEnabled:false }); g.translate(0, 0, -.5); return g; })()
  };
  const MAT = new THREE.MeshLambertMaterial({ vertexColors:true });

  /* ---------- a merge bag that takes full matrices ---------- */
  class Bag{
    constructor(){ this.p = []; this.n = []; this.c = []; }
    put(geo, m4, color){
      const g = geo.index ? geo.toNonIndexed() : geo.clone(); g.applyMatrix4(m4);
      const pa = g.attributes.position.array, na = g.attributes.normal.array; _c.set(color);
      for(let i = 0; i < pa.length; i++){ this.p.push(pa[i]); this.n.push(na[i]); }
      for(let i = 0; i < pa.length / 3; i++) this.c.push(_c.r, _c.g, _c.b);
      g.dispose(); return this;
    }
    add(geo, x, y, z, sx = 1, sy = 1, sz = 1, rx = 0, ry = 0, rz = 0, color = 0xffffff){ return this.put(geo, _m.compose(_v.set(x, y, z), _q.setFromEuler(_e.set(rx, ry, rz, 'YXZ')), _s.set(sx, sy, sz)), color); }
    mesh(cast = true, recv = true){
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3));
      g.setAttribute('normal', new THREE.Float32BufferAttribute(this.n, 3));
      g.setAttribute('color', new THREE.Float32BufferAttribute(this.c, 3));
      g.computeBoundingSphere();
      const m = new THREE.Mesh(g, MAT); m.castShadow = cast; m.receiveShadow = recv; m.matrixAutoUpdate = false; m.updateMatrix(); return m;
    }
  }

  /* ---------- walking data (spatial grid, 8 m cells) ---------- */
  const CELL = 8, grid = new Map();
  const key = (i, j) => i * 1000 + j;
  function insert(o, x, z, rad){
    const i0 = Math.floor((x - rad) / CELL), i1 = Math.floor((x + rad) / CELL), j0 = Math.floor((z - rad) / CELL), j1 = Math.floor((z + rad) / CELL);
    for(let i = i0; i <= i1; i++) for(let j = j0; j <= j1; j++){ const k = key(i, j); let a = grid.get(k); if(!a){ a = []; grid.set(k, a); } a.push(o); }
  }
  const near = (x, z) => grid.get(key(Math.floor(x / CELL), Math.floor(z / CELL))) || [];
  const COLL = { circ:0, box:0, plat:0, water:0 };
  function addCirc(x, z, r, top = 99){ const o = { t:'c', x, z, r, top }; insert(o, x, z, r + 1); COLL.circ++; return o; }
  function addBox(x, z, hw, hd, ry, top = 99){ const o = { t:'b', x, z, hw, hd, c:Math.cos(ry), s:Math.sin(ry), top }; insert(o, x, z, Math.hypot(hw, hd) + 1); COLL.box++; return o; }
  /* platforms give the ground height: flat (h0), ramp (h0 at local +z edge → h1 at local −z edge), arch (peak h0 at the middle) */
  function addPlat(x, z, hw, hd, ry, kind, h0, h1 = 0){ const o = { t:'p', x, z, hw, hd, c:Math.cos(ry), s:Math.sin(ry), kind, h0, h1 }; insert(o, x, z, Math.hypot(hw, hd) + 1); COLL.plat++; return o; }
  function addWater(x, z, r0, r1){ const o = { t:'w', x, z, r0, r1 }; insert(o, x, z, r1 + 1); COLL.water++; return o; }
  // local coordinates of a world point in an oriented thing (local x = (c, -s), local z = (s, c))
  const locX = (o, x, z) => (x - o.x) * o.c - (z - o.z) * o.s;
  const locZ = (o, x, z) => (x - o.x) * o.s + (z - o.z) * o.c;
  function platY(o, x, z){
    const lx = locX(o, x, z), lz = locZ(o, x, z);
    if(Math.abs(lx) > o.hw || Math.abs(lz) > o.hd) return null;
    if(o.kind === 'flat') return o.h0;
    if(o.kind === 'ramp') return o.h0 + (o.h1 - o.h0) * (o.hd - lz) / (2 * o.hd);
    return o.h0 * Math.cos(clamp(lz / o.hd, -1, 1) * Math.PI / 2);
  }
  /* ground height here (−1 = water / off the island: not walkable) */
  function heightAt(x, z){
    const r = Math.hypot(x, z);
    if(r > ISL.R) return -1;
    let h = null, wet = r > ISL.RIVER0 && r < ISL.RIVER1;
    for(const o of near(x, z)){
      if(o.t === 'p'){ const y = platY(o, x, z); if(y != null && (h == null || y > h)) h = y; }
      else if(o.t === 'w' && !wet){ const d = Math.hypot(x - o.x, z - o.z); if(d > o.r0 && d < o.r1) wet = true; }
    }
    if(h != null) return h;
    return wet ? -1 : 0;
  }
  /* how tall the solid things at this point are (walls, houses, towers…; thin posts and trees are ignored): for the camera */
  function solidTop(x, z){
    let top = -1;
    for(const c of near(x, z)){
      if(c.t === 'c'){ if(c.r < .8) continue; if((x - c.x) ** 2 + (z - c.z) ** 2 < c.r * c.r && c.top > top) top = c.top; }
      else if(c.t === 'b'){ if(c.noCam || c.hw < .25 || c.hd < .25) continue; if(Math.abs(locX(c, x, z)) < c.hw && Math.abs(locZ(c, x, z)) < c.hd && c.top > top) top = c.top; }
      else if(c.t === 'p'){ const y = platY(c, x, z); if(y != null && y > top) top = y; }
    }
    return top;
  }
  /* push a walker (x, z, radius r, feet at y) out of solid things that reach above its feet */
  function pushOut(o, r, y){
    for(const c of near(o.x, o.z)){
      if(c.t === 'c'){
        if(y > c.top - .05) continue;
        const dx = o.x - c.x, dz = o.z - c.z, m = c.r + r, q = dx * dx + dz * dz;
        if(q < m * m && q > 1e-6){ const s = Math.sqrt(q); o.x = c.x + dx / s * m; o.z = c.z + dz / s * m; }
      } else if(c.t === 'b'){
        if(y > c.top - .05) continue;
        const lx = locX(c, o.x, o.z), lz = locZ(c, o.x, o.z);
        const cx = clamp(lx, -c.hw, c.hw), cz = clamp(lz, -c.hd, c.hd), dx = lx - cx, dz = lz - cz, q = dx * dx + dz * dz;
        if(q >= r * r) continue;
        let nx = lx, nz = lz;
        if(q > 1e-6){ const s = Math.sqrt(q); nx = cx + dx / s * r; nz = cz + dz / s * r; }
        else { const ex = c.hw - Math.abs(lx), ez = c.hd - Math.abs(lz); if(ex < ez) nx = Math.sign(lx || 1) * (c.hw + r); else nz = Math.sign(lz || 1) * (c.hd + r); }
        o.x = c.x + nx * c.c + nz * c.s; o.z = c.z - nx * c.s + nz * c.c;
      }
    }
  }

  /* ---------- textures ---------- */
  const FONT = '"Baloo Bhaijaan 2","Tajawal",system-ui,sans-serif';
  const redraws = [];
  function liveTex(w, h, draw){ const t = canvasTex(w, h, draw); redraws.push(() => { const x = t.image.getContext('2d'); x.clearRect(0, 0, w, h); draw(x, w, h); t.needsUpdate = true; }); return t; }
  if(document.fonts && document.fonts.ready) { document.fonts.ready.then(() => redraws.forEach(f => f())).catch(() => {}); document.fonts.addEventListener('loadingdone', () => redraws.forEach(f => f())); }
  function signTex(text, bg, sub){
    return liveTex(512, 168, (x, w, h) => {
      x.fillStyle = bg; x.beginPath(); x.roundRect(6, 6, w - 12, h - 12, 44); x.fill();
      x.lineWidth = 10; x.strokeStyle = '#fff'; x.stroke();
      x.fillStyle = '#fff'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.direction = (window.I18N && I18N.dir) || 'rtl';
      let fs = 70; x.font = `800 ${fs}px ${FONT}`; while(x.measureText(text).width > w - 60 && fs > 30){ fs -= 4; x.font = `800 ${fs}px ${FONT}`; }
      x.shadowColor = 'rgba(0,0,0,.25)'; x.shadowOffsetY = 4; x.fillText(text, w / 2, sub ? 70 : h / 2 + 4); x.shadowColor = 'transparent';
      if(sub){ x.font = `800 40px ${FONT}`; x.fillStyle = 'rgba(255,255,255,.92)'; x.fillText(sub, w / 2, 128); }
    });
  }
  function twoSided(m){ m.material.side = THREE.FrontSide; const back = new THREE.Mesh(m.geometry, m.material); back.rotation.y = Math.PI; m.add(back); return m; }
  const waterTex = canvasTex(128, 128, (x, w) => { x.fillStyle = '#5cc8f0'; x.fillRect(0, 0, w, w); x.strokeStyle = 'rgba(255,255,255,.45)'; x.lineWidth = 3; x.lineCap = 'round'; for(let i = 0; i < 7; i++){ const px = (i * 47) % 128, py = (i * 71) % 128; x.beginPath(); x.moveTo(px, py); x.quadraticCurveTo(px + 8, py - 5, px + 16, py); x.stroke(); } });
  waterTex.wrapS = waterTex.wrapT = THREE.RepeatWrapping; waterTex.repeat.set(10, 10);
  const oceanTex = waterTex.clone(); oceanTex.needsUpdate = true; oceanTex.wrapS = oceanTex.wrapT = THREE.RepeatWrapping; oceanTex.repeat.set(60, 60);
  const waterMat = new THREE.MeshLambertMaterial({ map:waterTex, color:0xd8f3ff });
  function swirlTex(css){
    return canvasTex(256, 256, (x, w) => {
      const g = x.createRadialGradient(128, 128, 8, 128, 128, 128); g.addColorStop(0, '#ffffff'); g.addColorStop(.35, css); g.addColorStop(1, 'rgba(255,255,255,0)');
      x.fillStyle = g; x.fillRect(0, 0, w, w);
      x.strokeStyle = 'rgba(255,255,255,.7)'; x.lineWidth = 9; x.lineCap = 'round';
      for(let k = 0; k < 4; k++){ x.beginPath(); for(let t = 0; t < 1; t += .02){ const a = k * Math.PI / 2 + t * 4.2, r = 10 + t * 108; const px = 128 + Math.cos(a) * r, py = 128 + Math.sin(a) * r; if(t) x.lineTo(px, py); else x.moveTo(px, py); } x.stroke(); }
    });
  }

  /* ---------- the island: ground, beach, ocean, river, paths, bridges ---------- */
  const root = new THREE.Group(); scene.add(root);
  const ZD = zoneDefs(L), N = ZD.length;
  const zoneAng = i => Math.PI + i * TAU / N;
  const ocean = new THREE.Mesh(new THREE.PlaneGeometry(1400, 1400).rotateX(-Math.PI / 2), new THREE.MeshLambertMaterial({ map:oceanTex, color:0xc8ecff }));
  ocean.position.y = -.55; root.add(ocean);
  const base = new Bag();
  base.add(new THREE.CylinderGeometry(ISL.R + 4.5, ISL.R + 12, 1.2, 96), 0, -.62, 0, 1, 1, 1, 0, 0, 0, 0xf2dc9b);    // beach
  base.add(new THREE.CircleGeometry(ISL.R + 4.4, 96).rotateX(-Math.PI / 2), 0, -.02, 0, 1, 1, 1, 0, 0, 0, 0xf2dc9b);
  base.add(new THREE.CircleGeometry(ISL.R + 1.5, 96).rotateX(-Math.PI / 2), 0, 0, 0, 1, 1, 1, 0, 0, 0, 0x86d46a);   // grass
  // darker grass patches
  for(let k = 0; k < 40; k++){ const a = rnd() * TAU, r = 18 + rnd() * 74, s = 3 + rnd() * 5; base.add(GE.disc, Math.sin(a) * r, .02, Math.cos(a) * r, s, 1, s * (.6 + rnd() * .5), 0, rnd() * 3, 0, 0x7cc962); }
  // plaza
  base.add(new THREE.CircleGeometry(ISL.PLAZA, 64).rotateX(-Math.PI / 2), 0, .07, 0, 1, 1, 1, 0, 0, 0, 0xf3e6cf);
  base.add(new THREE.TorusGeometry(ISL.PLAZA, .2, 6, 72), 0, .08, 0, 1, 1, 1, Math.PI / 2, 0, 0, 0xd9c6a4);
  for(let k = 0; k < 3; k++) base.add(new THREE.TorusGeometry(4.5 + k * 3, .09, 4, 64), 0, .08, 0, 1, 1, 1, Math.PI / 2, 0, 0, 0xe6d3b2);
  // river ring: banks + water
  const river = new THREE.Mesh(GE.ring(ISL.RIVER0, ISL.RIVER1, 128), waterMat); river.position.y = .08; river.receiveShadow = true; root.add(river);
  for(const r of [ISL.RIVER0, ISL.RIVER1]) base.add(new THREE.TorusGeometry(r, .35, 5, 128), 0, .05, 0, 1, 1, .5, Math.PI / 2, 0, 0, 0xcdbf9e);
  for(let k = 0; k < 70; k++){ const a = rnd() * TAU, r = (rnd() < .5 ? ISL.RIVER0 - .6 : ISL.RIVER1 + .6), s = .3 + rnd() * .5; base.add(G.dode, Math.sin(a) * r, .1, Math.cos(a) * r, s, s * .6, s, rnd(), rnd(), 0, 0xb8b2c8); }
  // paths from the plaza to every zone + arch bridges over the river
  for(let i = 0; i < N; i++){
    const a = zoneAng(i), ux = Math.sin(a), uz = Math.cos(a), r0 = ISL.PLAZA - .3, r1 = ISL.ZR - ISL.ZRAD + 3;
    for(const [ra, rb] of [[r0, ISL.RIVER0 - 1.2], [ISL.RIVER1 + 1.2, r1]]){ const mid = (ra + rb) / 2; base.add(G.box, ux * mid, .045, uz * mid, ISL.PATH_W, .03, rb - ra, 0, a, 0, 0xeedcb8); }
    for(const s of [-1, 1]) for(let k = 0; k < 2; k++){ const rr = k ? ISL.RIVER1 + 1 : ISL.RIVER0 - 1; base.add(G.cyl8, ux * rr + uz * s * 2.1, .45, uz * rr - ux * s * 2.1, .18, .9, .18, 0, 0, 0, 0xa0703f); }
    // bridge: deck planks along an arch, rails
    const bm = (ISL.RIVER0 + ISL.RIVER1) / 2, hd = (ISL.RIVER1 - ISL.RIVER0) / 2 + 1.6, peak = 1.1;
    addPlat(ux * bm, uz * bm, 1.9, hd, a, 'arch', peak);
    for(let k = 0; k <= 12; k++){
      const t = k / 12, lz = -hd + t * 2 * hd, y = peak * Math.cos(lz / hd * Math.PI / 2), dy = -peak * Math.PI / 2 / hd * Math.sin(lz / hd * Math.PI / 2);
      const rr = bm - lz;
      base.add(G.box, ux * rr, y - .08, uz * rr, 3.8, .16, hd * 2 / 12 + .05, -Math.atan(dy) * -1, a, 0, k % 2 ? 0xc98a52 : 0xb87a45);
      if(k % 2 === 0) for(const s of [-1, 1]) base.add(G.cyl8, ux * rr + uz * s * 1.85, y + .45, uz * rr - ux * s * 1.85, .07, .9, .07, 0, 0, 0, 0xffffff);
    }
    for(const s of [-1, 1]) for(let k = 0; k < 12; k++){
      const l0 = -hd + k / 12 * 2 * hd, l1 = -hd + (k + 1) / 12 * 2 * hd, y0 = peak * Math.cos(l0 / hd * Math.PI / 2) + .88, y1 = peak * Math.cos(l1 / hd * Math.PI / 2) + .88;
      const rr = bm - (l0 + l1) / 2, len = Math.hypot(l1 - l0, y1 - y0);
      base.add(G.box, ux * rr + uz * s * 1.85, (y0 + y1) / 2, uz * rr - ux * s * 1.85, .12, .1, len, Math.atan2(y1 - y0, l1 - l0), a, 0, 0xffffff);
    }
  }

  /* ---------- zones ---------- */
  const zones = [];
  function zoneHelper(i){
    const d = ZD[i], a = zoneAng(i), cx = Math.sin(a) * ISL.ZR, cz = Math.cos(a) * ISL.ZR, ry = a + Math.PI;
    const ZM = new THREE.Matrix4().compose(_v.set(cx, 0, cz), _q.setFromEuler(_e.set(0, ry, 0)), _s.set(1, 1, 1));
    const c = Math.cos(ry), s = Math.sin(ry);
    const wx = (lx, lz) => cx + lx * c + lz * s, wz = (lx, lz) => cz - lx * s + lz * c;
    const det = new Bag(), far = new Bag(), grp = new THREE.Group(), farGrp = new THREE.Group();
    root.add(grp); root.add(farGrp);
    const mk = (lx, y, lz, sx, sy, sz, rx, lr, rz) => _m2.multiplyMatrices(ZM, _m.compose(_v.set(lx, y, lz), _q.setFromEuler(_e.set(rx, lr, rz, 'YXZ')), _s.set(sx, sy, sz)));
    const Z = Object.assign({}, d, { i, a, cx, cz, ry, c, s, wx, wz, grp, farGrp, det, farBag:far, extra:[] });
    Z.add = (geo, lx, y, lz, sx = 1, sy = 1, sz = 1, rx = 0, lr = 0, rz = 0, col = 0xffffff, bag = det) => { bag.put(geo, mk(lx, y, lz, sx, sy, sz, rx, lr, rz), col); };
    Z.far = (geo, lx, y, lz, sx, sy, sz, rx, lr, rz, col) => Z.add(geo, lx, y, lz, sx, sy, sz, rx, lr, rz, col, far);
    Z.both = (geo, lx, y, lz, sx, sy, sz, rx, lr, rz, col) => { Z.add(geo, lx, y, lz, sx, sy, sz, rx, lr, rz, col); Z.far(geo, lx, y, lz, sx, sy, sz, rx, lr, rz, col); };
    Z.box = (lx, lz, hw, hd, lr = 0, top = 99) => addBox(wx(lx, lz), wz(lx, lz), hw, hd, ry + lr, top);
    Z.circ = (lx, lz, r, top = 99) => addCirc(wx(lx, lz), wz(lx, lz), r, top);
    Z.plat = (lx, lz, hw, hd, lr, kind, h0, h1) => addPlat(wx(lx, lz), wz(lx, lz), hw, hd, ry + lr, kind, h0, h1);
    Z.water = (lx, lz, r0, r1, y = .09) => { addWater(wx(lx, lz), wz(lx, lz), r0, r1); const m = new THREE.Mesh(r0 > 0 ? GE.ring(r0, r1, 72) : new THREE.CircleGeometry(r1, 40).rotateX(-Math.PI / 2), waterMat); m.position.set(wx(lx, lz), y, wz(lx, lz)); m.receiveShadow = true; grp.add(m); Z.add(new THREE.TorusGeometry(1, .06, 5, 72), lx, .05, lz, r1, r1, 4, Math.PI / 2, 0, 0, 0xcdbf9e); if(r0 > 0) Z.add(new THREE.TorusGeometry(1, .06, 5, 72), lx, .05, lz, r0, r0, 4, Math.PI / 2, 0, 0, 0xcdbf9e); };
    Z.obj = (o, lx, y, lz, lr = 0) => { o.position.set(wx(lx, lz), y, wz(lx, lz)); o.rotation.y = ry + lr; grp.add(o); return o; };
    Z.sign = (text, lx, y, lz, w = 4.4, lr = 0, sub) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, w * 168 / 512), new THREE.MeshBasicMaterial({ map:signTex(text, d.css, sub), transparent:true, side:THREE.DoubleSide }));
      return Z.obj(twoSided(m), lx, y, lz, lr);
    };
    Z.post = (lx, lz, h, col = 0xa0703f) => { Z.add(G.cyl8, lx, h / 2, lz, .12, h, .12, 0, 0, 0, col); };
    // the zone's ground: a soft disc in the zone colour family + the path to the centre
    Z.add(new THREE.CircleGeometry(ISL.ZRAD, 48).rotateX(-Math.PI / 2), 0, .03, 0, 1, 1, 1, 0, 0, 0, d.ground || 0x8fd873);
    return Z;
  }
  function finishZone(Z){
    const m = Z.det.mesh(); Z.grp.add(m);
    if(Z.farBag.p.length){ const f = Z.farBag.mesh(false, false); Z.farGrp.add(f); }
    Z.farGrp.visible = false;
    zones.push(Z);
  }
  const lamp = (Z, lx, lz, col = 0xfff3c4) => { Z.add(G.cyl8, lx, 1.4, lz, .08, 2.8, .08, 0, 0, 0, 0x4a4e66); Z.add(G.sph, lx, 2.95, lz, .26, .26, .26, 0, 0, 0, col); Z.add(G.cone, lx, 3.25, lz, .3, .18, .3, 0, 0, 0, 0x4a4e66); Z.circ(lx, lz, .2); };
  const flowersAt = (Z, lx, lz, rad, n, cols) => { for(let k = 0; k < n; k++){ const a = rnd() * TAU, r = Math.sqrt(rnd()) * rad, x = lx + Math.cos(a) * r, z = lz + Math.sin(a) * r; Z.add(G.cyl8, x, .12, z, .03, .24, .03, 0, 0, 0, 0x3f9a4a); Z.add(G.sm, x, .28, z, .13, .08, .13, 0, 0, 0, cols[k % cols.length]); } };
  const bush = (Z, lx, lz, s = 1, col = 0x4fae55) => { Z.add(G.ico1, lx, .45 * s, lz, .8 * s, .6 * s, .8 * s, 0, rnd() * 3, 0, col); Z.circ(lx, lz, .6 * s, .9 * s); };
  const tinyTree = (Z, lx, lz, s = 1, col = 0x5cc46a) => { Z.add(G.cyl8, lx, .9 * s, lz, .18 * s, 1.8 * s, .18 * s, 0, 0, 0, 0x9a6a3c); Z.add(G.ico1, lx, 2.3 * s, lz, 1.2 * s, 1.1 * s, 1.2 * s, 0, rnd() * 3, 0, col); Z.circ(lx, lz, .35 * s); Z.far(G.ico1, lx, 2.3 * s, lz, 1.2 * s, 1.1 * s, 1.2 * s, 0, 0, 0, col); };
  const fence = (Z, ax, az, bx, bz, col = 0xfff6e6, h = .9, gaps = []) => {
    const len = Math.hypot(bx - ax, bz - az), n = Math.max(1, Math.round(len / 1.2)), ang = Math.atan2(bx - ax, bz - az);
    for(let k = 0; k <= n; k++){ const t = k / n, x = ax + (bx - ax) * t, z = az + (bz - az) * t; if(gaps.some(g => t > g[0] && t < g[1])) continue; Z.add(G.box, x, h / 2, z, .14, h, .14, 0, ang, 0, col); }
    let t0 = 0; const segs = [];
    for(const g of gaps.concat([[1, 1]])){ segs.push([t0, g[0]]); t0 = g[1]; }
    for(const [u, v] of segs){ if(v - u < .01) continue; const x0 = ax + (bx - ax) * u, z0 = az + (bz - az) * u, x1 = ax + (bx - ax) * v, z1 = az + (bz - az) * v, l = Math.hypot(x1 - x0, z1 - z0);
      for(const y of [h * .45, h * .85]) Z.add(G.box, (x0 + x1) / 2, y, (z0 + z1) / 2, .07, .1, l, 0, ang, 0, col);
      Z.box((x0 + x1) / 2, (z0 + z1) / 2, .1, l / 2, ang, h); }
  };
  const stall = (Z, lx, lz, lr, col, goods) => {
    const at = (x, z) => [lx + x * Math.cos(lr) + z * Math.sin(lr), lz - x * Math.sin(lr) + z * Math.cos(lr)];
    let p = at(0, 0); Z.add(G.box, p[0], .55, p[1], 3.2, 1.1, 1.3, 0, lr, 0, 0xc98a52); Z.add(G.box, p[0], 1.14, p[1], 3.4, .1, 1.45, 0, lr, 0, 0xe6b67e);
    for(const s of [-1, 1]) for(const q of [-1, 1]){ p = at(s * 1.55, q * .6); Z.add(G.cyl8, p[0], 1.4, p[1], .07, 2.8, .07, 0, 0, 0, 0xffffff); }
    p = at(0, 0); Z.add(G.box, p[0], 2.85, p[1], 3.7, .14, 2.1, .12, lr, 0, col);
    goods.forEach((g, k) => { const q = at(-1.1 + k * 1.1, 0); Z.add(G.box, q[0], 1.3, q[1], .8, .22, .7, 0, lr, 0, 0x9a6b3c); for(let j = 0; j < 4; j++) Z.add(G.sm, q[0] + (j % 2 - .5) * .3, 1.5, q[1] + (j > 1 ? .15 : -.15), .14, .14, .14, 0, 0, 0, g); });
    p = at(0, 0); Z.box(p[0], p[1], 1.7, .75, lr, 1.2);
    Z.far(G.box, p[0], 1.4, p[1], 3.4, 2.8, 1.6, 0, lr, 0, col);
  };
  const house = (Z, lx, lz, w, d, h, wall, roof, lr = 0, door = 0x8a5a36) => {
    const at = (x, z) => [lx + x * Math.cos(lr) + z * Math.sin(lr), lz - x * Math.sin(lr) + z * Math.cos(lr)];
    Z.both(G.box, lx, h / 2, lz, w, h, d, 0, lr, 0, wall);
    Z.add(G.box, lx, .15, lz, w + .14, .3, d + .14, 0, lr, 0, 0xd9a46a);
    Z.both(GE.prism, lx, h, lz, d + .6, 2.4, w + .7, 0, lr + Math.PI / 2, 0, roof);
    let p = at(0, d / 2 + .03); Z.add(G.box, p[0], 1.05, p[1], 1.2, 2.1, .1, 0, lr, 0, door);
    for(const s of [-1, 1]){ p = at(s * w * .3, d / 2 + .04); Z.add(G.box, p[0], h * .58, p[1], 1.1, .95, .1, 0, lr, 0, 0xa8dcff); Z.add(G.box, p[0], h * .58 - .55, p[1], 1.25, .14, .3, 0, lr, 0, 0xffffff); }
    Z.box(lx, lz, w / 2 + .1, d / 2 + .1, lr);
  };

  /* --- 0: castle with its moat --- */
  const climbTops = [];
  {
    const Z = zoneHelper(0), C = { x:0, z:-3 }, WR = 10, WH = 3.6, PUR = 0x8f63d9, STONE = 0xe9e2f2, STONE_D = 0xcfc4e2;
    Z.water(C.x, C.z, 12.2, 15.6);
    // bridge over the moat (front)
    Z.plat(0, C.z + 13.9, 1.9, 2.6, 0, 'arch', .9);
    for(let k = 0; k <= 8; k++){ const lz = -2.6 + k * 5.2 / 8, y = .9 * Math.cos(lz / 2.6 * Math.PI / 2); Z.add(G.box, 0, y - .08, C.z + 13.9 - lz, 3.8, .16, .7, 0, 0, 0, k % 2 ? 0xc98a52 : 0xb87a45); for(const s of [-1, 1]) if(k % 2 === 0) Z.add(G.cyl8, s * 1.85, y + .4, C.z + 13.9 - lz, .07, .8, .07, 0, 0, 0, 0xffffff); }
    Z.add(G.box, 0, .05, C.z + 18.5, ISL.PATH_W, .03, 7, 0, 0, 0, 0xeedcb8);
    // walls (ring, gate at the front)
    const NS = 20;
    for(let k = 0; k < NS; k++){
      const am = (k + .5) / NS * TAU; if(Math.abs(Math.atan2(Math.sin(am), Math.cos(am))) < .2) continue;
      const x = C.x + Math.sin(am) * WR, z = C.z + Math.cos(am) * WR, len = 2 * WR * Math.sin(Math.PI / NS) + .15;
      Z.both(G.box, x, WH / 2, z, len, WH, 1.0, 0, am + Math.PI / 2, 0, STONE);
      for(let j = 0; j < 2; j++){ const t = (j + .5) / 2 - .5; Z.add(G.box, x + Math.cos(am) * t * len, WH + .3, z - Math.sin(am) * t * len, .55, .6, 1.0, 0, am + Math.PI / 2, 0, STONE_D); }
      Z.box(x, z, len / 2, .5, am + Math.PI / 2, WH);
    }
    // gate towers + arch
    for(const s of [-1, 1]){ const x = s * 2.5, z = C.z + WR; Z.both(G.cyl, x, 2.6, z, 1.2, 5.2, 1.2, 0, 0, 0, STONE); Z.both(G.cone, x, 6.0, z, 1.5, 1.8, 1.5, 0, 0, 0, PUR); Z.circ(x, z, 1.2); }
    Z.add(G.box, 0, 4.4, C.z + WR, 4, 1.4, 1.1, 0, 0, 0, STONE_D); Z.add(G.box, 0, 3.6, C.z + WR + .56, 2.6, .5, .05, 0, 0, 0, PUR);
    // corner towers
    for(const am of [Math.PI / 4, 3 * Math.PI / 4, -Math.PI / 4, -3 * Math.PI / 4]){
      const x = C.x + Math.sin(am) * WR, z = C.z + Math.cos(am) * WR;
      Z.both(G.cyl, x, 3.4, z, 1.9, 6.8, 1.9, 0, 0, 0, STONE); Z.add(G.cyl, x, 7.0, z, 2.1, .5, 2.1, 0, 0, 0, STONE_D);
      Z.both(G.cone, x, 8.6, z, 2.2, 2.8, 2.2, 0, 0, 0, PUR); Z.add(G.cyl8, x, 10.6, z, .05, 1.4, .05, 0, 0, 0, 0xffffff); Z.add(G.box, x + .4, 11, z, .8, .45, .04, 0, 0, 0, 0xffcd4d);
      for(let k = 0; k < 3; k++) Z.add(G.box, x + Math.sin(am + k) * 1.96, 4 + k * .9, z + Math.cos(am + k) * 1.96, .4, .6, .1, 0, am + k, 0, 0x5d4a8a);
      Z.circ(x, z, 1.9);
    }
    // the keep
    const KX = 0, KZ = C.z - 4.8;
    Z.both(G.box, KX, 3.6, KZ, 7, 7.2, 5, 0, 0, 0, STONE);
    for(let k = 0; k < 6; k++) Z.add(G.box, KX - 3 + k * 1.2, 7.5, KZ + 2.4, .6, .6, .3, 0, 0, 0, STONE_D);
    for(const s of [-1, 1]){ Z.both(G.cyl, KX + s * 3.4, 4.8, KZ + 2.4, 1.1, 9.6, 1.1, 0, 0, 0, STONE); Z.both(G.cone, KX + s * 3.4, 11, KZ + 2.4, 1.35, 2.6, 1.35, 0, 0, 0, PUR); }
    Z.both(G.cone, KX, 9.6, KZ, 2.6, 4.6, 2.6, 0, 0, 0, PUR); Z.add(G.cyl8, KX, 12.4, KZ, .06, 1.6, .06, 0, 0, 0, 0xffffff); Z.add(G.box, KX + .5, 12.9, KZ, 1, .55, .04, 0, 0, 0, 0xffcd4d);
    Z.add(G.box, KX, 1.4, KZ + 2.52, 1.8, 2.8, .1, 0, 0, 0, 0x8a5a36); Z.add(G.cyl, KX, 2.8, KZ + 2.52, .9, .1, .9, Math.PI / 2, 0, 0, 0x8a5a36);
    for(const s of [-1, 1]) Z.add(G.box, KX + s * 2, 4.8, KZ + 2.52, .9, 1.2, .1, 0, 0, 0, 0xffd98a);
    Z.box(KX, KZ, 3.6, 2.6);
    // lookout platform with stairs (climb the castle steps!)
    const TX = 5.5, TZ = C.z - 3.5, TH = 3.2;
    Z.both(G.box, TX, TH / 2, TZ, 3, TH, 3, 0, 0, 0, STONE_D);
    for(const [dx, dz] of [[-1.3, -1.3], [1.3, -1.3], [-1.3, 1.3], [1.3, 1.3], [0, -1.3], [1.3, 0]]) Z.add(G.box, TX + dx, TH + .3, TZ + dz, .45, .6, .45, 0, 0, 0, STONE);
    Z.add(G.cyl8, TX + 1.2, TH + 1.3, TZ - 1.2, .05, 2.6, .05, 0, 0, 0, 0xffffff); Z.add(G.box, TX + 1.6, TH + 2.3, TZ - 1.2, .8, .5, .04, 0, 0, 0, PUR);
    Z.plat(TX, TZ, 1.5, 1.5, 0, 'flat', TH);
    const SZ0 = TZ + 1.5, SL = 4.6, NSt = 8;
    Z.plat(TX, SZ0 + SL / 2, 1, SL / 2, 0, 'ramp', 0, TH);
    for(let k = 0; k < NSt; k++){ const h = (k + 1) / NSt * TH, zz = SZ0 + SL - (k + .5) * SL / NSt; Z.add(G.box, TX, h / 2, zz, 2, h, SL / NSt + .02, 0, 0, 0, k % 2 ? STONE : STONE_D); }
    climbTops.push({ x:Z.wx(TX, TZ), z:Z.wz(TX, TZ), h:TH, zone:0 });
    // gardens around: hedges, flowers, lamps
    for(const s of [-1, 1]){ for(let k = 0; k < 3; k++) bush(Z, s * (5 + k * 2.2), 17.5, 1.1, 0x4fae55); lamp(Z, s * 2.6, 17); }
    flowersAt(Z, -12, 14, 3, 20, [0xb28dff, 0xffffff]); flowersAt(Z, 12, 14, 3, 20, [0xff8fb8, 0xffffff]);
    Z.portal = { lx:0, lz:C.z + 3.4 };
    finishZone(Z);
  }

  /* --- 1: the farm (plot, farmhouse, stalls, scarecrow, well) --- */
  const plants = [];
  {
    const Z = zoneHelper(1);
    Z.add(G.box, 0, .05, 12, ISL.PATH_W, .03, 20, 0, 0, 0, 0xeedcb8);
    house(Z, -9, -8, 7, 5, 3, 0xfff1d8, 0xe0604a, .5);
    { const p = [-9 + Math.sin(.5) * 0, -8]; Z.add(G.box, p[0] + 1.6, 4.6, p[1] - .6, .7, 1.6, .7, 0, .5, 0, 0xd7b08a); }
    Z.sign(L('بيت المزرعة', 'Farmhouse', 'Çiftlik evi'), -7.4, 5.9, -5.4, 3.2, .5);
    stall(Z, -9, 6, Math.PI / 2 + .3, 0xff9f43, [0xff8a1f, 0xe8402f, 0xffc928]);
    Z.sign(L('السوق', 'Market', 'Pazar'), -9.6, 3.6, 6.2, 2.4, Math.PI / 2 + .3);
    stall(Z, 9.5, 8, -Math.PI / 2 - .3, 0x5cc46a, [0x8a5a36, 0xc98a52, 0x8a5a36]);
    Z.sign(L('البذور', 'Seeds', 'Tohumlar'), 10.1, 3.6, 8.2, 2.4, -Math.PI / 2 - .3);
    // soil plot: 4 × 3 tiles with real garden plants
    const PX = 6, PZ = -3, T = 1.7, TYPES = ['carrot', 'tomato', 'sunflower', 'corn', 'pumpkin', 'strawberry', 'watermelon', 'blueberry'];
    Z.add(G.box, PX, .08, PZ, 4 * T + .5, .16, 3 * T + .5, 0, 0, 0, 0xb07a4a);
    for(let r = 0; r < 3; r++) for(let c = 0; c < 4; c++){
      const lx = PX + (c - 1.5) * T, lz = PZ + (r - 1) * T;
      Z.add(G.box, lx, .2, lz, T - .2, .1, T - .2, 0, 0, 0, 0x8a5634);
      const type = TYPES[(r * 4 + c) % TYPES.length], st = 1 + Math.floor(rnd() * 3);
      const p = { x:Z.wx(lx, lz), z:Z.wz(lx, lz), type, st, zone:1, grp:new THREE.Group(), wet:0 };
      p.grp.position.set(p.x, .25, p.z); p.grp.rotation.y = rnd() * TAU; Z.grp.add(p.grp); plants.push(p); setPlant(p, st);
    }
    fence(Z, PX - 3.8, PZ - 2.9, PX + 3.8, PZ - 2.9); fence(Z, PX + 3.8, PZ - 2.9, PX + 3.8, PZ + 2.9);
    // scarecrow, watering can stand, well, hay
    { const m = new THREE.Mesh(GM.scarecrowGeo(), GM.MAT); m.castShadow = true; Z.obj(m, PX + 2.5, .2, PZ - 4.5, .3); Z.circ(PX + 2.5, PZ - 4.5, .3); }
    Z.add(G.box, 1.6, .45, -1, .8, .9, .8, 0, 0, 0, 0xc98a52); { const m = new THREE.Mesh(GM.canGeo(), GM.MAT); Z.obj(m, 1.6, 1.0, -1, 1); m.scale.setScalar(1.4); } Z.box(1.6, -1, .45, .45, 0, .9);
    Z.add(G.cyl, 9, .5, -11, 1.2, 1, 1.2, 0, 0, 0, 0xb8b2c8); Z.add(G.cyl, 9, 1.02, -11, .95, .05, .95, 0, 0, 0, 0x5cc8f0);
    for(const s of [-1, 1]) Z.add(G.cyl8, 9 + s * 1, 1.6, -11, .08, 2.2, .08, 0, 0, 0, 0x8a5a36); Z.add(GE.prism, 9, 2.6, -11, 1.6, 1, 2.6, 0, Math.PI / 2, 0, 0xe0604a); Z.circ(9, -11, 1.3);
    for(const [x, z] of [[-3, -12], [-1.5, -12.6], [-13, -1]]){ Z.add(G.cyl, x, .5, z, .7, 1, .7, Math.PI / 2, .3, 0, 0xf2d27a); Z.circ(x, z, .8, 1); }
    tinyTree(Z, -14, -12, 1.2, 0x4fae55); tinyTree(Z, 14, -8, 1.1); tinyTree(Z, -15, 10, 1); tinyTree(Z, 15, 13, 1.2, 0x4fae55);
    flowersAt(Z, -4, 14, 2.5, 16, [0xffc928, 0xffffff]); flowersAt(Z, 4, 15, 2.5, 16, [0xffc928]);
    Z.far(G.box, PX, .5, PZ, 7, 1, 5, 0, 0, 0, 0x6aa84f);
    Z.portal = { lx:-1.5, lz:-14 };
    finishZone(Z);
  }
  function setPlant(p, st){
    p.st = clamp(st, 0, 4);
    while(p.grp.children.length) p.grp.remove(p.grp.children[0]);
    const g = GM.plantGeo(p.type, p.st), f = new THREE.Mesh(g.fol, GM.MAT); f.castShadow = true; p.grp.add(f);
    if(g.fruit){ const r = new THREE.Mesh(g.fruit, GM.FRUIT_MAT ? GM.FRUIT_MAT[0] : GM.MAT); r.castShadow = true; p.grp.add(r); }
    p.h = GM.plantH(p.type, p.st);
  }

  /* --- 2: the pet town and park --- */
  const roamPets = [];
  {
    const Z = zoneHelper(2);
    Z.add(G.box, 0, .05, 10, ISL.PATH_W, .03, 24, 0, 0, 0, 0xeedcb8);
    house(Z, -9, -9, 6.5, 5, 2.8, 0xfff0e2, 0xf28fb4, .4);
    Z.sign(L('بيت الحيوانات', 'Pet House', 'Hayvan Evi'), -7.6, 5.2, -6.6, 3.4, .4);
    // pet shop
    house(Z, -14, 3, 5, 4, 2.6, 0xffe9a8, 0x6cc4ff, Math.PI / 2);
    Z.sign(L('دكانة الحيوانات', 'Pet Shop', 'Pet Shop'), -11.4, 4.6, 3, 3.2, Math.PI / 2);
    // park: darker lawn, trees, benches, a path loop
    Z.add(GE.disc, 8.5, .05, -7, 7, 1, 7, 0, 0, 0, 0x7cc962);
    Z.add(new THREE.TorusGeometry(4.6, .5, 3, 40), 8.5, .07, -7, 1, 1, .06, Math.PI / 2, 0, 0, 0xeedcb8);
    for(let k = 0; k < 6; k++){ const a = k / 6 * TAU + .3; tinyTree(Z, 8.5 + Math.cos(a) * 6.6, -7 + Math.sin(a) * 6.6, .9 + rnd() * .3, k % 2 ? 0x4fae55 : 0x6fcf5a); }
    for(const a of [0, Math.PI]){ const x = 8.5 + Math.cos(a) * 3.3, z = -7 + Math.sin(a) * 3.3; Z.add(G.box, x, .45, z, .5, .1, 2, 0, 0, 0, 0xc98a52); Z.add(G.box, x + (a ? -.25 : .25), .75, z, .1, .5, 2, 0, 0, 0, 0xc98a52); Z.box(x, z, .3, 1, 0, .5); }
    // pond
    Z.water(9, 7, 0, 3.4);
    for(let k = 0; k < 5; k++){ const a = k / 5 * TAU; Z.add(GE.disc, 9 + Math.cos(a) * 2, .05, 7 + Math.sin(a) * 2, .4, 1, .4, 0, 0, 0, 0x4fae55); }
    // playground: slide + swings
    Z.add(G.box, -7, 1.1, 10.5, 1.2, .1, 1.2, 0, 0, 0, 0xff8fb8); for(const [dx, dz] of [[-.55, -.55], [.55, -.55], [-.55, .55], [.55, .55]]) Z.add(G.cyl8, -7 + dx, .55, 10.5 + dz, .06, 1.1, .06, 0, 0, 0, 0xffffff);
    Z.add(G.box, -7, .6, 12.3, 1, .08, 2.6, .5, 0, 0, 0x6cc4ff); Z.box(-7, 11.3, .7, 1.9, 0, 1.2);
    Z.add(G.box, -11.5, 2.2, 10.5, 3.4, .14, .14, 0, 0, 0, 0xff8fb8); for(const s of [-1, 1]){ Z.add(G.cyl8, -11.5 + s * 1.6, 1.1, 10.1, .07, 2.3, .07, -.2, 0, 0, 0xff8fb8); Z.add(G.cyl8, -11.5 + s * 1.6, 1.1, 10.9, .07, 2.3, .07, .2, 0, 0, 0xff8fb8); Z.circ(-11.5 + s * 1.6, 10.5, .3); }
    for(const s of [-1, 1]){ Z.add(G.box, -11.5 + s * .7, .55, 10.5, .55, .07, .35, 0, 0, 0, 0xffcd4d); for(const q of [-1, 1]) Z.add(G.cyl8, -11.5 + s * .7 + q * .25, 1.38, 10.5, .015, 1.65, .015, 0, 0, 0, 0x888888); }
    // ice cream stand
    stall(Z, 6, 14, -Math.PI / 2, 0xff8fb8, [0xfff1d8, 0xff8fb8, 0x8a5a36]);
    Z.add(G.cone, 6.6, 3.8, 14, .35, .8, .35, Math.PI, 0, 0, 0xf2c27a); Z.add(G.sph, 6.6, 4.35, 14, .4, .4, .4, 0, 0, 0, 0xff8fb8);
    // roaming pets you can pet
    const SPS = ['puppy', 'kitten', 'bunny', 'duck', 'panda', 'fox'].filter(s => PM.SPECIES[s]);
    SPS.forEach((sp, k) => {
      const M = PM.buildPet(sp, 1 + (k % 2), null); M.grp.traverse(o => { if(o.isMesh) o.castShadow = true; });
      const a = k / SPS.length * TAU, lx = Math.cos(a) * 5, lz = -2 + Math.sin(a) * 5;
      root.add(M.grp);
      roamPets.push({ M, x:Z.wx(lx, lz), z:Z.wz(lx, lz), f:0, move:0, t:rnd() * 9, happyT:0, idleT:rnd() * 3, tgt:null, Z, zone:2 });
    });
    flowersAt(Z, 0, -12, 3, 24, [0xff8fb8, 0xffffff]);
    Z.portal = { lx:0, lz:-14.5 };
    finishZone(Z);
  }

  /* --- 3: the restaurant («قريباً») --- */
  {
    const Z = zoneHelper(3);
    Z.add(G.box, 0, .05, 12, ISL.PATH_W, .03, 20, 0, 0, 0, 0xeedcb8);
    Z.both(G.box, 0, 2.2, -6, 11, 4.4, 7, 0, 0, 0, 0xfff1d8); Z.box(0, -6, 5.6, 3.6);
    Z.add(G.box, 0, 4.6, -6, 11.6, .4, 7.6, 0, 0, 0, 0xff7a45);
    Z.add(G.box, 0, 2.9, -2.1, 11.4, .12, 1.6, -.35, 0, 0, 0xe85d2a);
    Z.add(G.box, 0, 1.2, -2.45, 1.8, 2.4, .1, 0, 0, 0, 0x8a5a36);
    for(const s of [-1, 1]) Z.add(G.box, s * 3.4, 2, -2.45, 2.4, 1.6, .1, 0, 0, 0, 0xa8dcff);
    Z.both(G.cyl, 0, 6.6, -6, 2.4, .3, 2.4, Math.PI / 2, 0, 0, 0xf2c27a); Z.add(G.cyl, 0, 6.6, -5.82, 2.1, .1, 2.1, Math.PI / 2, 0, 0, 0xe8402f);
    for(let k = 0; k < 7; k++){ const a = k / 7 * TAU; Z.add(G.cyl, Math.cos(a) * 1.2, 6.6 + Math.sin(a) * 1.2, -5.74, .28, .06, .28, Math.PI / 2, 0, 0, k % 2 ? 0xffcd4d : 0xb33a2a); }
    Z.add(G.box, 0, 4.9, -6, .3, .6, .3, 0, 0, 0, 0x8a5a36);
    for(const [x, z] of [[-6, 4], [6, 4], [-6, 9], [6, 9]]){ Z.add(G.cyl, x, .75, z, .9, .08, .9, 0, 0, 0, 0xffffff); Z.add(G.cyl8, x, .37, z, .08, .75, .08, 0, 0, 0, 0x888888); Z.add(G.cone, x, 2.4, z, 1.6, .6, 1.6, 0, 0, 0, 0xff7a45); Z.add(G.cyl8, x, 1.6, z, .04, 1.7, .04, 0, 0, 0, 0xffffff); Z.circ(x, z, .9, .8); }
    for(let k = 0; k < 5; k++){ const x = -4 + k * 2; Z.add(G.cyl8, x, .5, 1, .1, 1, .1, 0, 0, 0, 0xd94a3a); Z.circ(x, 1, .15); }
    Z.add(G.box, 0, .85, 1, 8, .06, .06, 0, 0, 0, 0xd94a3a); Z.box(0, 1, 4.1, .2, 0, 1);
    Z.sign(L('قريباً', 'Coming soon', 'Yakında'), 0, 2.2, 1.4, 3.6, 0, L('المطعم 🍕', 'Restaurant 🍕', 'Restoran 🍕'));
    Z.post(-1.4, 1.2, 1.4); Z.post(1.4, 1.2, 1.4);
    finishZone(Z);
  }

  /* --- 4: the city («قريباً») --- */
  {
    const Z = zoneHelper(4);
    Z.add(G.box, 0, .05, 4, 6, .04, 36, 0, 0, 0, 0x5a5f73);
    for(let k = 0; k < 9; k++) Z.add(G.box, 0, .08, -12 + k * 4, .25, .02, 1.6, 0, 0, 0, 0xffffff);
    const B = [[-7, -10, 5, 12, 0x8fb4ff], [-7, -2, 5, 8, 0xffcd4d], [-7, 6, 5, 14, 0x5b8cff], [7, -10, 5, 9, 0xff8fb8], [7, -2, 5, 16, 0x7ad3a1], [7, 6, 5, 7, 0xb07cff]];
    for(const [x, z, w, h, col] of B){
      Z.both(G.box, x, h / 2, z, w, h, 5, 0, 0, 0, col); Z.box(x, z, w / 2, 2.5);
      for(let fy = 1.6; fy < h - 1; fy += 2.2) for(const s of [-1, 1]) Z.add(G.box, x - Math.sign(x) * (w / 2 + .03), fy, z + s * 1.2, .06, 1.1, 1, 0, 0, 0, 0xe8f6ff);
      Z.add(G.box, x, h + .2, z, w + .2, .4, 5.2, 0, 0, 0, 0xffffff);
    }
    for(const z of [-6, 2, 10]){ Z.add(G.cyl8, -3.6, 1.6, z, .07, 3.2, .07, 0, 0, 0, 0x4a4e66); Z.add(G.sph, -3.6, 3.3, z, .25, .25, .25, 0, 0, 0, 0xfff3c4); Z.circ(-3.6, z, .15); }
    for(let k = 0; k < 4; k++){ const x = -2 + k * 1.3; Z.add(G.cone, x, .4, 12, .3, .8, .3, 0, 0, 0, 0xff7a45); Z.circ(x, 12, .3); }
    Z.box(0, 12, 2.8, .3, 0, 1);
    Z.sign(L('قريباً', 'Coming soon', 'Yakında'), 0, 2.3, 13, 3.6, 0, L('المدينة 🏙️', 'The City 🏙️', 'Şehir 🏙️'));
    Z.post(-1.4, 12.8, 1.4); Z.post(1.4, 12.8, 1.4);
    finishZone(Z);
  }

  /* --- 5: Grandma's house (outside) --- */
  {
    const Z = zoneHelper(5), HZ = -7, W = 11, D = 8, H = 6.2, WALL = 0xffe3c2, ROOF = 0xb5523b;
    Z.add(G.box, 0, .05, 8, 2.6, .03, 16, 0, 0, 0, 0xe0cfae);
    Z.both(G.box, 0, H / 2, HZ, W, H, D, 0, 0, 0, WALL); Z.box(0, HZ, W / 2 + .1, D / 2 + .1);
    Z.add(G.box, 0, 3.1, HZ, W + .2, .25, D + .2, 0, 0, 0, 0xf0c9a0);
    Z.both(GE.prism, 0, H, HZ, D + .8, 4.2, W + .9, 0, Math.PI / 2, 0, ROOF);
    Z.both(G.box, 3, H + 2.2, HZ - 1.4, 1, 3, 1, 0, 0, 0, 0xc98a6a); Z.add(G.box, 3, H + 3.75, HZ - 1.4, 1.2, .2, 1.2, 0, 0, 0, 0x8a5a46);
    Z.add(G.box, 0, 1.15, HZ + D / 2 + .04, 1.4, 2.3, .1, 0, 0, 0, 0x7a4a2e); Z.add(G.sm, .5, 1.15, HZ + D / 2 + .12, .09, .09, .09, 0, 0, 0, 0xffc83a);
    for(const s of [-1, 1]) for(const y of [1.6, 4.6]){ const x = s * 3.4; Z.add(G.box, x, y, HZ + D / 2 + .05, 1.5, 1.2, .1, 0, 0, 0, 0xfff0b8); Z.add(G.box, x, y, HZ + D / 2 + .08, .08, 1.2, .08, 0, 0, 0, 0xffffff); for(const q of [-1, 1]) Z.add(G.box, x + q * .95, y, HZ + D / 2 + .08, .35, 1.25, .06, 0, 0, 0, 0x6aa86a); Z.add(G.box, x, y - .72, HZ + D / 2 + .2, 1.6, .25, .35, 0, 0, 0, 0x9a6b3c); for(let k = 0; k < 5; k++) Z.add(G.sm, x - .6 + k * .3, y - .55, HZ + D / 2 + .22, .12, .1, .12, 0, 0, 0, 0xff8fb8); }
    Z.add(G.box, 0, 1.15, HZ + D / 2 + 1.2, .05, .05, .05); // spacer
    Z.add(G.box, 0, 2.6, HZ + D / 2 + .9, 3.2, .12, 1.8, -.2, 0, 0, ROOF);
    for(const s of [-1, 1]) Z.add(G.cyl8, s * 1.4, 1.25, HZ + D / 2 + 1.6, .08, 2.5, .08, 0, 0, 0, 0xffffff);
    Z.add(G.box, 0, .1, HZ + D / 2 + .9, 3.4, .2, 1.8, 0, 0, 0, 0xd9a46a);
    // garden fence with a gate, a tree with a swing, flower beds, mailbox, bench
    fence(Z, -12, -16, 12, -16, 0xffffff); fence(Z, -12, -16, -12, 6, 0xffffff); fence(Z, 12, -16, 12, 6, 0xffffff);
    fence(Z, -12, 6, 12, 6, 0xffffff, .9, [[.44, .56]]);
    Z.add(G.cyl8, 8, 1.6, 1.5, .35, 3.2, .35, 0, 0, 0, 0x8a5a36); Z.add(G.ico1, 8, 4.4, 1.5, 2.6, 2.2, 2.6, 0, 0, 0, 0x5cc46a); Z.far(G.ico1, 8, 4.4, 1.5, 2.6, 2.2, 2.6, 0, 0, 0, 0x5cc46a); Z.circ(8, 1.5, .4);
    Z.add(G.box, 9.4, 3.3, 1.5, 2.6, .25, .25, 0, 0, 0, 0x8a5a36);
    const swing = new THREE.Group(); { const b = new Bag(); for(const s of [-1, 1]) b.add(G.cyl8, s * .35, -1.2, 0, .02, 2.4, .02, 0, 0, 0, 0x777777); b.add(G.box, 0, -2.4, 0, .9, .08, .4, 0, 0, 0, 0xff8fb8); swing.add(b.mesh()); }
    swing.rotation.order = 'YXZ'; Z.obj(swing, 9.8, 3.3, 1.5, Math.PI / 2); Z.extra.push(t => { swing.rotation.x = Math.sin(t * 1.6) * .35; });
    for(const s of [-1, 1]){ Z.add(G.box, s * 6, .2, 2, 5, .4, 1.6, 0, 0, 0, 0x8a5634); flowersAt(Z, s * 6, 2, 1.2, 18, s < 0 ? [0xff8fb8, 0xffffff] : [0xffd23f, 0xffffff]); Z.box(s * 6, 2, 2.5, .8, 0, .4); }
    Z.add(G.cyl8, 3.6, .6, 6.8, .06, 1.2, .06, 0, 0, 0, 0x8a5a36); Z.add(G.box, 3.6, 1.3, 6.8, .5, .35, .7, 0, 0, 0, 0x5b8cff); Z.circ(3.6, 6.8, .2);
    Z.add(G.box, -8, .45, -11, 2, .1, .6, 0, 0, 0, 0xc98a52); Z.add(G.box, -8, .8, -11.3, 2, .6, .1, 0, 0, 0, 0xc98a52); Z.box(-8, -11, 1, .35, 0, .5);
    Z.portal = { lx:0, lz:HZ + D / 2 + 3.1 };
    finishZone(Z);
  }

  /* --- 6: the giant house (kitchen + bedroom, toy-sized you) --- */
  const cups = [], walls6 = { grp:null, box:null };
  {
    const Z = zoneHelper(6), X0 = -11, X1 = 11, Z0 = -15, Z1 = 4, WH = 7, T = .8, WALL = 0xfff2dc;
    Z.add(G.box, 0, .05, 12, ISL.PATH_W, .03, 16, 0, 0, 0, 0xeedcb8);
    // floors: tiles in the kitchen, wood + a rug in the bedroom
    for(let i = 0; i < 6; i++) for(let j = 0; j < 10; j++){ const x = X0 + .9 + i * 1.83, z = Z0 + .95 + j * 1.9; Z.add(G.box, x, .07, z, 1.8, .04, 1.87, 0, 0, 0, (i + j) % 2 ? 0xffffff : 0xcfe6f7); }
    Z.add(G.box, 5.5, .07, -5.5, 11, .04, 19, 0, 0, 0, 0xd9a46a); Z.add(GE.disc, 5.5, .1, -1.5, 3.2, 1, 2.4, 0, 0, 0, 0x8fb4ff);
    // the walls (they sink while you are inside: dollhouse view)
    const WB = new Bag(), wall = (x, z, w, d) => { WB.add(G.box, x, WH / 2, z, w, WH, d, 0, 0, 0, WALL); Z.far(G.box, x, WH / 2, z, w, WH, d, 0, 0, 0, WALL); Z.box(x, z, w / 2, d / 2).noCam = true; };
    wall(0, Z0, X1 - X0 + T, T); wall(X0, (Z0 + Z1) / 2, T, Z1 - Z0); wall(X1, (Z0 + Z1) / 2, T, Z1 - Z0);
    wall((X0 - 2.8) / 2, Z1, -2.8 - X0, T); wall((X1 + 2.8) / 2, Z1, X1 - 2.8, T);
    wall(0, -11.5, .5, 7);
    for(const s of [-1, 1]) WB.add(G.box, s * 6.5, 3.6, Z1 + .42, 3.2, 2.4, .1, 0, 0, 0, 0xa8dcff);
    WB.add(G.box, 0, WH + .25, Z1, 6.6, .5, 1, 0, 0, 0, 0xff9f43); WB.add(G.box, 0, WH - .1, Z0 - .1, X1 - X0 + 1, .3, .3, 0, 0, 0, 0xff9f43);
    const wm = WB.mesh(); const wg = new THREE.Group(); wg.add(wm); Z.obj(wg, 0, 0, 0); walls6.grp = wg;
    walls6.box = { x:Z.wx(0, (Z0 + Z1) / 2), z:Z.wz(0, (Z0 + Z1) / 2), hw:(X1 - X0) / 2, hd:(Z1 - Z0) / 2, c:Math.cos(Z.ry), s:Math.sin(Z.ry) };
    // giant counter, fridge, table + chairs, giant cups
    Z.add(G.box, -5.5, 2.3, Z0 + 1.6, 10, 4.6, 2.6, 0, 0, 0, 0xffffff); Z.add(G.box, -5.5, 4.7, Z0 + 1.6, 10.3, .25, 2.9, 0, 0, 0, 0x6c7290); Z.box(-5.5, Z0 + 1.6, 5, 1.3);
    for(let k = 0; k < 4; k++) Z.add(G.box, -9.4 + k * 2.6, 2.3, Z0 + 2.95, 2.3, 4, .08, 0, 0, 0, 0xcfe6f7);
    Z.add(G.box, -9.6, 4, -6.5, 2.2, 8, 2.4, 0, 0, 0, 0xe8f6ff); Z.add(G.box, -8.46, 4.6, -6.5, .1, 1.6, .3, 0, 0, 0, 0xb8b2c8); Z.box(-9.6, -6.5, 1.1, 1.2); Z.far(G.box, -9.6, 4, -6.5, 2.2, 8, 2.4, 0, 0, 0, 0xe8f6ff);
    const TBX = -5, TBZ = -2.6, TH = 3.6;
    Z.add(G.box, TBX, TH, TBZ, 6, .35, 4, 0, 0, 0, 0xc98a52);
    for(const [dx, dz] of [[-2.7, -1.7], [2.7, -1.7], [-2.7, 1.7], [2.7, 1.7]]){ Z.add(G.box, TBX + dx, TH / 2, TBZ + dz, .4, TH, .4, 0, 0, 0, 0xa0703f); Z.circ(TBX + dx, TBZ + dz, .3); }
    Z.add(G.cyl, TBX - 1.5, TH + .7, TBZ, .8, 1.1, .8, 0, 0, 0, 0xffffff); Z.add(G.cyl, TBX + 1.4, TH + .25, TBZ + .5, 1.3, .2, 1.3, 0, 0, 0, 0xfff1d8);
    for(const s of [-1, 1]){ const cx = TBX + s * 4.1; Z.add(G.box, cx, 2.1, TBZ, 2, .25, 2, 0, 0, 0, 0xff9f43); Z.add(G.box, cx + s * .9, 3.6, TBZ, .25, 3, 2, 0, 0, 0, 0xff9f43); for(const [dx, dz] of [[-.8, -.8], [.8, -.8], [-.8, .8], [.8, .8]]){ Z.add(G.box, cx + dx, 1, TBZ + dz, .22, 2, .22, 0, 0, 0, 0xe0862e); Z.circ(cx + dx, TBZ + dz, .18); } }
    const CUPS = [[-9.3, 1.9, 0xffffff], [-2.4, 2.4, 0xff8fb8], [-9.4, -10.3, 0x6cc4ff]];
    for(const [x, z, col] of CUPS){
      Z.add(GE.open, x, .8, z, 1.15, 1.6, 1.15, 0, 0, 0, col); Z.add(G.cyl, x, .06, z, .95, .1, .95, 0, 0, 0, col);
      Z.add(new THREE.TorusGeometry(.5, .14, 8, 16, Math.PI * 1.2), x + 1.15, .8, z, 1, 1.2, 1, 0, 0, -Math.PI * .6, col);
      Z.add(GE.open, x, .8, z, 1.05, 1.58, 1.05, 0, 0, 0, 0xd9cfc2);
      Z.circ(x, z, 1.15, 1.6); cups.push({ x:Z.wx(x, z), z:Z.wz(x, z), r:1.15, top:1.6, zone:6 });
    }
    // bedroom: giant bed (climb up on the books), toy blocks, a big ball, a toy box
    const BX = 6, BZ = -10.5, BH = 2.2;
    Z.add(G.box, BX, BH / 2, BZ, 5, BH, 7, 0, 0, 0, 0x8fb4ff); Z.add(G.box, BX, BH + .02, BZ + 1, 5.1, .1, 5, 0, 0, 0, 0xffffff);
    Z.add(G.box, BX, 2.8, BZ - 2.5, 3.6, .9, 1.4, 0, 0, 0, 0xffffff); Z.add(G.box, BX, 3.4, BZ - 3.6, 5.2, 3, .4, 0, 0, 0, 0x5b8cff);
    Z.plat(BX, BZ, 2.5, 3.5, 0, 'flat', BH);
    Z.plat(BX - 1, BZ + 5, 1.3, 1.5, 0, 'ramp', 0, BH);
    const BOOK = [0xe8402f, 0x3fc47a, 0xffcd4d, 0x5b8cff, 0xff8fb8];
    for(let k = 0; k < 5; k++){ const h = (k + 1) / 5 * BH, zz = BZ + 6.5 - (k + .5) * .6; Z.add(G.box, BX - 1, h / 2, zz, 2.6, h, .62, 0, 0, 0, BOOK[k]); }
    climbTops.push({ x:Z.wx(BX, BZ), z:Z.wz(BX, BZ), h:BH, zone:6 });
    const BLK = [0xe8402f, 0x5b8cff, 0xffcd4d];
    for(let k = 0; k < 3; k++){ Z.add(G.box, 9 - k * .1, .6 + k * 1.2, -1 + k * .1, 1.2, 1.2, 1.2, 0, k * .3, 0, BLK[k]); } Z.circ(9, -1, .9, 3.6);
    Z.add(G.sph, 2.6, 1.2, -3.2, 1.2, 1.2, 1.2, 0, 0, 0, 0xff7a45); Z.circ(2.6, -3.2, 1.2, 2.4);
    Z.add(G.box, 8.6, .9, 2.2, 3, 1.8, 2, 0, 0, 0, 0xffcd4d); Z.box(8.6, 2.2, 1.5, 1, 0, 1.8);
    Z.add(G.box, -.8, .3, 8, 2.8, .1, 2, 0, 0, 0, 0xff9f43);
    Z.add(G.cyl, 5, 1, 7, 1, 2, 1, 0, 0, 0, 0xc98a6a); Z.add(G.ico1, 5, 3, 7, 1.6, 1.6, 1.6, 0, 0, 0, 0x5cc46a); Z.circ(5, 7, 1);
    Z.portal = { lx:-4.6, lz:-8.6 };
    finishZone(Z);
  }

  /* --- 7: the egg market (egg house, belt, 4 nests, egg stall) --- */
  const nests = [], eggStalls = [];
  let belt = null;
  {
    const Z = zoneHelper(7), EX = 0, EZ = -3, BR = 6.4, BCOL = [0x5b8cff, 0xff8fb8, 0x3fc47a, 0xffcd4d];
    Z.add(G.box, 0, .05, 13, ISL.PATH_W, .03, 18, 0, 0, 0, 0xeedcb8);
    Z.add(GE.disc, EX, .055, EZ, 8, 1, 8, 0, 0, 0, 0xf3e6cf);
    Z.add(GE.ring(BR - .85, BR + .85, 64), EX, .09, EZ, 1, 1, 1, 0, 0, 0, 0x4a4e66);
    for(const r of [BR - .9, BR + .9]) Z.add(new THREE.TorusGeometry(r, .12, 6, 64), EX, .14, EZ, 1, 1, 1, Math.PI / 2, 0, 0, 0xffcd4d);
    Z.both(G.cyl, EX, .3, EZ, 3, .6, 3, 0, 0, 0, 0xff9f6b);
    Z.both(GE.egg, EX, .5, EZ, 4.4, 4, 4.4, 0, 0, 0, 0xfff3d6);
    Z.add(new THREE.TorusGeometry(1.95, .2, 8, 32), EX, 2.3, EZ, 1, 1, 1, Math.PI / 2, 0, 0, 0xff8fb8);
    Z.add(K.starGeo, EX, 6.1, EZ, .5, .5, .4, 0, 0, 0, 0xffcd4d);
    Z.circ(EX, EZ, 3.1);
    { const S = new Bag(); for(let k = 0; k < 40; k++){ const a = k / 40 * TAU; S.add(G.box, Math.cos(a) * BR, 0, Math.sin(a) * BR, 1.5, .06, .6, 0, -a, 0, k % 2 ? 0x5b6078 : 0x7a82a6); }
      for(let k = 0; k < 8; k++){ const a = k / 8 * TAU; S.add(GE.egg, Math.cos(a) * BR, .05, Math.sin(a) * BR, .5, .5, .5, 0, 0, 0, 0xfff3d6); }
      belt = new THREE.Group(); belt.add(S.mesh()); Z.obj(belt, EX, .12, EZ); }
    // the 4 nests: fenced squares, one colour each
    [[-8.6, EZ + 8.6], [8.6, EZ + 8.6], [8.6, EZ - 8.6], [-8.6, EZ - 8.6]].forEach(([x, z], k) => {
      const col = BCOL[k], H = 2.4;
      Z.add(G.box, x, .06, z, 2 * H, .12, 2 * H, 0, 0, 0, new THREE.Color(col).lerp(new THREE.Color(0xffffff), .6).getHex());
      const tx = Math.sign(-x), tz = Math.sign(EZ - z);    // gate side: toward the egg house (x side)
      fence(Z, x - H, z - H, x + H, z - H, col, .9, tz < 0 ? [[.35, .65]] : []);
      fence(Z, x - H, z + H, x + H, z + H, col, .9, tz > 0 ? [[.35, .65]] : []);
      fence(Z, x - H, z - H, x - H, z + H, col, .9, tx < 0 ? [[.35, .65]] : []);
      fence(Z, x + H, z - H, x + H, z + H, col, .9, tx > 0 ? [[.35, .65]] : []);
      Z.add(new THREE.TorusGeometry(.8, .3, 8, 20), x, .3, z, 1, 1, .8, Math.PI / 2, 0, 0, 0xb5874e);
      Z.add(G.cyl, x, .2, z, .8, .2, .8, 0, 0, 0, 0x9a6b3c);
      Z.add(G.cyl8, x + H - .4, 1.8, z - H + .4, .07, 3.6, .07, 0, 0, 0, 0xffffff); Z.add(G.box, x + H, 3.3, z - H + .4, .9, .55, .04, 0, 0, 0, col);
      Z.far(G.box, x, .5, z, 2 * H, 1, 2 * H, 0, 0, 0, col);
      const ng = new THREE.Group(); Z.obj(ng, x, .3, z);
      const n = { x:Z.wx(x, z), z:Z.wz(x, z), col, grp:ng, eggs:0, zone:7 };
      nests.push(n); for(let j = 0; j < 2; j++) addNestEgg(n);
    });
    stall(Z, 6.5, 14, -Math.PI / 2, 0x3fc47a, [0xfff3d6, 0xfff3d6, 0xfff3d6]);
    Z.sign(L('🥚 بيض', '🥚 Eggs', '🥚 Yumurta'), 7.1, 3.7, 14, 2.4, -Math.PI / 2);
    eggStalls.push({ x:Z.wx(5.3, 14), z:Z.wz(5.3, 14), zone:7 });
    lamp(Z, -2.6, 9); lamp(Z, 2.6, 9);
    Z.portal = { lx:0, lz:-15.5 };
    finishZone(Z);
  }
  function addNestEgg(n){
    if(n.eggs >= 6) return false;
    const m = new THREE.Mesh(GE.egg, new THREE.MeshLambertMaterial({ color:0xfff3d6 }));
    const a = n.eggs * 1.1 + .4, r = n.eggs ? .45 : 0; m.position.set(Math.cos(a) * r, .1, Math.sin(a) * r); m.scale.setScalar(.55); m.rotation.z = (n.eggs % 2 - .5) * .3; m.castShadow = true;
    n.grp.add(m); n.eggs++; return true;
  }

  /* ---------- portals (glowing arch + swirl + ring), entrance signs ---------- */
  const portals = [];
  const PR = 2.4;
  for(const Z of zones){
    // entrance sign at the end of the path
    const er = ISL.ZRAD - 1.5;
    Z.add(G.cyl8, -2.6, 1.3, er, .1, 2.6, .1, 0, 0, 0, 0xa0703f); Z.add(G.cyl8, 2.6, 1.3, er, .1, 2.6, .1, 0, 0, 0, 0xa0703f);
    Z.circ(-2.6, er, .2); Z.circ(2.6, er, .2);
    Z.sign(Z.emoji + ' ' + Z.name, 0, 2.9, er, 5.2, 0, Z.soon ? L('قريباً', 'Coming soon', 'Yakında') : null);
    const fs = new THREE.Mesh(new THREE.PlaneGeometry(9, 9 * 168 / 512), new THREE.MeshBasicMaterial({ map:signTex(Z.emoji + ' ' + Z.name, Z.css, Z.soon ? L('قريباً', 'Coming soon', 'Yakında') : null), transparent:true, side:THREE.DoubleSide, fog:false }));
    twoSided(fs); fs.position.set(Z.cx, 9, Z.cz); fs.rotation.y = Z.ry; Z.farGrp.add(fs);
    if(!Z.portal) continue;
    const { lx, lz } = Z.portal, px = Z.wx(lx, lz), pz = Z.wz(lx, lz), col = Z.col;
    const g = new THREE.Group(); Z.obj(g, lx, 0, lz);
    const glowM = new THREE.MeshBasicMaterial({ color:col });
    const arch = new THREE.Mesh(new THREE.TorusGeometry(PR, .32, 10, 32, Math.PI), glowM); arch.position.y = 2.0; g.add(arch);
    for(const s of [-1, 1]){ const pil = new THREE.Mesh(new THREE.CylinderGeometry(.34, .42, 2.0, 12), glowM); pil.position.set(s * PR, 1.0, 0); g.add(pil); Z.circ(lx + s * PR, lz, .45); }
    const pb = new THREE.Mesh(new THREE.CylinderGeometry(.55, .6, .3, 12), new THREE.MeshLambertMaterial({ color:0xffffff })); for(const s of [-1, 1]){ const c2 = pb.clone(); c2.position.set(s * PR, .15, 0); g.add(c2); }
    const swirl = new THREE.Mesh(new THREE.CircleGeometry(PR - .1, 40), new THREE.MeshBasicMaterial({ map:swirlTex(Z.css), transparent:true, opacity:.85, side:THREE.DoubleSide, depthWrite:false }));
    swirl.position.y = 2.0; g.add(swirl);
    const ring = new THREE.Mesh(GE.ring(PR - .25, PR + .2, 48), new THREE.MeshBasicMaterial({ color:col, transparent:true, opacity:.75, depthWrite:false })); ring.position.y = .06; g.add(ring);
    const pad = new THREE.Mesh(new THREE.CircleGeometry(PR - .25, 40).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color:col, transparent:true, opacity:.22, depthWrite:false })); pad.position.y = .05; g.add(pad);
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map:glowTex, color:col, transparent:true, opacity:.55, depthWrite:false, blending:THREE.AdditiveBlending })); glow.scale.set(8, 8, 1); glow.position.y = 2.2; g.add(glow);
    const sparks = [];
    for(let k = 0; k < 6; k++){ const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map:glowTex, color:0xffffff, transparent:true, depthWrite:false, blending:THREE.AdditiveBlending })); sp.scale.setScalar(.35); g.add(sp); sparks.push({ sp, t:k / 6 }); }
    const top = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 4.6 * 168 / 512), new THREE.MeshBasicMaterial({ map:signTex(Z.emoji + ' ' + Z.name, Z.css), transparent:true, side:THREE.DoubleSide }));
    twoSided(top); top.position.y = 5.1; g.add(top);
    Z.far(G.torus, lx, 2, lz, PR, PR, 1.6, 0, 0, 0, col);
    portals.push({ zone:Z.i, id:Z.id, x:px, z:pz, r:PR, g, swirl, ring, glow, sparks, arch });
  }

  /* ---------- the plaza: fountain, swings, slide, benches, lamps, balloons, the big sign ---------- */
  const plaza = new Bag();
  let fountainWater = null;
  const swings = [], balloons = new THREE.Group(); root.add(balloons);
  {
    const P = plaza;
    P.add(G.cyl, 0, .35, 0, 3.4, .7, 3.4, 0, 0, 0, 0xe9e2f2); P.add(new THREE.TorusGeometry(3.4, .22, 8, 48), 0, .72, 0, 1, 1, 1, Math.PI / 2, 0, 0, 0xffffff);
    P.add(G.cyl, 0, 1.3, 0, .45, 2.6, .45, 0, 0, 0, 0xe9e2f2); P.add(G.cyl, 0, 2.6, 0, 1.5, .3, 1.5, 0, 0, 0, 0xe9e2f2); P.add(G.cyl, 0, 3.3, 0, .25, 1.2, .25, 0, 0, 0, 0xe9e2f2); P.add(G.sph, 0, 4.0, 0, .45, .45, .45, 0, 0, 0, 0xffcd4d);
    addCirc(0, 0, 3.5, .75);
    fountainWater = new THREE.Mesh(new THREE.CircleGeometry(3.2, 40).rotateX(-Math.PI / 2), waterMat); fountainWater.position.y = .62; root.add(fountainWater);
    const fw2 = new THREE.Mesh(new THREE.CircleGeometry(1.35, 24).rotateX(-Math.PI / 2), waterMat); fw2.position.y = 2.77; root.add(fw2);
    // swings
    { const x = -8.5, z = 5; P.add(G.box, x, 2.6, z, 4, .16, .16, 0, 0, 0, 0xff8fb8);
      for(const s of [-1, 1]) for(const q of [-1, 1]){ P.add(G.cyl8, x + s * 1.9, 1.3, z + q * .5, .08, 2.7, .08, q * .2, 0, 0, 0xff8fb8); addCirc(x + s * 1.9, z, .35); }
      for(const s of [-1, 1]){ const sg = new THREE.Group(); const b = new Bag(); for(const q of [-1, 1]) b.add(G.cyl8, q * .3, -1.05, 0, .02, 2.1, .02, 0, 0, 0, 0x888888); b.add(G.box, 0, -2.1, 0, .75, .08, .4, 0, 0, 0, 0xffcd4d); sg.add(b.mesh()); sg.position.set(x + s * .9, 2.6, z); root.add(sg); swings.push({ g:sg, ph:s }); } }
    // slide
    { const x = 8.5, z = 5, h = 2.2; P.add(G.box, x, h, z - 1.2, 1.4, .12, 1.4, 0, 0, 0, 0x6cc4ff);
      for(const [dx, dz] of [[-.65, -1.85], [.65, -1.85], [-.65, -.55], [.65, -.55]]) P.add(G.cyl8, x + dx, h / 2, z + dz, .07, h, .07, 0, 0, 0, 0xffffff);
      for(let k = 0; k < 5; k++) P.add(G.box, x, .4 + k * .42, z - 2.05, 1.1, .07, .12, 0, 0, 0, 0xffffff);
      P.add(G.box, x, h / 2 + .05, z + 1.1, 1.1, .1, 3.6, Math.atan2(h, 3.2), 0, 0, 0xff8fb8);
      for(const s of [-1, 1]) P.add(G.box, x + s * .55, h / 2 + .25, z + 1.1, .08, .3, 3.6, Math.atan2(h, 3.2), 0, 0, 0xff8fb8);
      addBox(x, z - .4, .8, 2.4, 0, 2.4); }
    // benches + lamps between the paths, balloons tied to the lamps
    const BAL = [0xff5d6c, 0xffcd4d, 0x6cc4ff, 0xb07cff, 0x5ed6a0, 0xff8fb8];
    for(let i = 0; i < N; i++){
      const a = zoneAng(i) + Math.PI / N, ux = Math.sin(a), uz = Math.cos(a);
      if(Math.abs(Math.cos(a)) > .9 && Math.abs(Math.sin(a)) < .45 && uz > 0) {/* keep the spawn side open */}
      const bx = ux * 11.5, bz = uz * 11.5;
      if(!(Math.abs(bx + 8.5) < 3 && Math.abs(bz - 5) < 2) && !(Math.abs(bx - 8.5) < 3 && Math.abs(bz - 5) < 3)){
        P.add(G.box, bx, .45, bz, 2.2, .1, .55, 0, a + Math.PI / 2, 0, 0xc98a52); P.add(G.box, bx + ux * .25, .75, bz + uz * .25, 2.2, .5, .1, 0, a + Math.PI / 2, 0, 0xc98a52);
        for(const s of [-1, 1]) P.add(G.box, bx + uz * s * .95, .22, bz - ux * s * .95, .1, .44, .5, 0, a, 0, 0x7a5a3a);
        addBox(bx, bz, 1.1, .35, a + Math.PI / 2, .5);
      }
      const la = zoneAng(i), lx = Math.sin(la), lz = Math.cos(la);
      for(const s of [-1, 1]){ const x = lx * 13 + lz * s * 2.6, z = lz * 13 - lx * s * 2.6; P.add(G.cyl8, x, 1.5, z, .08, 3, .08, 0, 0, 0, 0x4a4e66); P.add(G.sph, x, 3.15, z, .26, .26, .26, 0, 0, 0, 0xfff3c4); P.add(G.cone, x, 3.45, z, .3, .18, .3, 0, 0, 0, 0x4a4e66); addCirc(x, z, .18); }
      // a balloon cluster on one lamp of every other path (single colours, no stripes)
      if(i % 2 === 0){ const x = lx * 13 + lz * 2.6, z = lz * 13 - lx * 2.6; const bb = new Bag();
        for(let k = 0; k < 3; k++){ const ox = (k - 1) * .45, oy = 4.6 + (k % 2) * .4; bb.add(G.sph, x + ox, oy, z, .38, .46, .38, 0, 0, 0, BAL[(i + k) % BAL.length]); bb.add(G.cyl8, x + ox * .5, oy - 1.05, z, .01, 1.5, .01, 0, 0, 0, 0xffffff); }
        balloons.add(bb.mesh(false, false)); }
    }
    // the big «جزيرة بوبو» sign arch over the front path
    { const a = zoneAng(0), ux = Math.sin(a), uz = Math.cos(a), r = 15.5;
      for(const s of [-1, 1]){ const x = ux * r + uz * s * 3.2, z = uz * r - ux * s * 3.2; P.add(G.cyl, x, 2.5, z, .3, 5, .3, 0, 0, 0, 0xffffff); P.add(G.sph, x, 5.2, z, .45, .45, .45, 0, 0, 0, 0xffcd4d); addCirc(x, z, .35); }
      const m = new THREE.Mesh(new THREE.PlaneGeometry(7, 7 * 168 / 512), new THREE.MeshBasicMaterial({ map:signTex(L('جزيرة بوبو 🏝️', 'Bobo Island 🏝️', 'Bobo Adası 🏝️'), '#ff9f43'), transparent:true, side:THREE.DoubleSide }));
      twoSided(m); m.position.set(ux * r, 4.6, uz * r); m.rotation.y = a; root.add(m); }
  }
  root.add(plaza.mesh());

  /* ---------- trees (instanced), bushes, rocks, flowers, hills on the edge ---------- */
  const okSpot = (x, z, m) => {
    const r = Math.hypot(x, z);
    if(r < ISL.PLAZA + 2 + m || r > ISL.R - 3 || (r > ISL.RIVER0 - 2 - m && r < ISL.RIVER1 + 2 + m)) return false;
    for(const Z of zones){ if(Math.hypot(x - Z.cx, z - Z.cz) < ISL.ZRAD + 1 + m) return false; }
    const a = Math.atan2(x, z);
    for(let i = 0; i < N; i++){ const za = zoneAng(i), d = Math.atan2(Math.sin(a - za), Math.cos(a - za)); if(Math.abs(d) < Math.PI / 2 && Math.abs(Math.sin(d) * r) < 3 + m && r < ISL.ZR) return false; }
    return true;
  };
  const treeA = new Bag(), treeB = new Bag();
  treeA.add(G.cyl8, 0, .8, 0, .22, 1.6, .22, 0, 0, 0, 0x9a6a3c); treeA.add(G.ico1, 0, 2.3, 0, 1.3, 1.15, 1.3, 0, 0, 0, 0x5cc46a); treeA.add(G.ico, .4, 2.9, .3, .8, .7, .8, 0, 0, 0, 0x6fcf5a);
  treeB.add(G.cyl8, 0, .7, 0, .2, 1.4, .2, 0, 0, 0, 0x9a6a3c); treeB.add(G.cone, 0, 2.2, 0, 1.25, 2, 1.25, 0, 0, 0, 0x3fb06a); treeB.add(G.cone, 0, 3.2, 0, .9, 1.6, .9, 0, 0, 0, 0x55c47a);
  const spotsA = [], spotsB = [];
  for(let k = 0; k < 2600 && spotsA.length + spotsB.length < 190; k++){
    const a = rnd() * TAU, r = 16 + rnd() * 80, x = Math.sin(a) * r, z = Math.cos(a) * r;
    if(!okSpot(x, z, 1) || spotsA.concat(spotsB).some(t => Math.hypot(t.x - x, t.z - z) < 3.4)) continue;
    const s = .8 + rnd() * .6; (rnd() < .55 ? spotsA : spotsB).push({ x, z, s, ry:rnd() * TAU }); addCirc(x, z, .45 * s);
  }
  const inst = (bag, list) => {
    const g = bag.mesh().geometry, m = new THREE.InstancedMesh(g, MAT, list.length); m.castShadow = true; m.receiveShadow = true;
    list.forEach((t, i) => m.setMatrixAt(i, _m.compose(_v.set(t.x, 0, t.z), _q.setFromEuler(_e.set(0, t.ry, 0)), _s.set(t.s, t.s, t.s))));
    m.instanceMatrix.needsUpdate = true; m.computeBoundingSphere(); root.add(m); return m;
  };
  inst(treeA, spotsA); inst(treeB, spotsB);
  const deco = new Bag();
  for(let k = 0; k < 900; k++){
    const a = rnd() * TAU, r = 15 + rnd() * 82, x = Math.sin(a) * r, z = Math.cos(a) * r; if(!okSpot(x, z, 0)) continue;
    const t = rnd();
    if(t < .08){ const s = .6 + rnd() * .6; deco.add(G.ico1, x, .4 * s, z, .9 * s, .6 * s, .9 * s, 0, rnd() * 3, 0, 0x4fae55); }
    else if(t < .14){ const s = .4 + rnd() * .5; deco.add(G.dode, x, .2 * s, z, s, s * .6, s, rnd(), rnd(), 0, 0xb8b2c8); }
    else { const c = [0xffffff, 0xffd84a, 0xff8fb8, 0xb28dff][k % 4]; deco.add(G.cyl8, x, .12, z, .03, .24, .03, 0, 0, 0, 0x3f9a4a); deco.add(G.sm, x, .28, z, .13, .08, .13, 0, 0, 0, c); }
  }
  for(let k = 0; k < 22; k++){ const a = k / 22 * TAU + rnd() * .1, r = ISL.R + 1 + rnd() * 2, s = 3 + rnd() * 4; deco.add(G.ico1, Math.sin(a) * r, -.2, Math.cos(a) * r, s, s * .55, s, 0, rnd() * 3, 0, rnd() < .5 ? 0x6fcf5a : 0x5cc46a); }
  for(let k = 0; k < 16; k++){ const a = rnd() * TAU, r = ISL.R + 4 + rnd() * 3, s = 1 + rnd() * 1.6; deco.add(G.dode, Math.sin(a) * r, 0, Math.cos(a) * r, s, s * .7, s, rnd(), rnd(), 0, 0xb8b2c8); }
  root.add(deco.mesh(false, true));
  root.add(base.mesh(false, true));

  /* ---------- per-frame: water, portals, belt, swings, balloons, pets, LOD ---------- */
  const LOD_FAR = 95;
  function animate(t, dt, camPos, focus){
    waterTex.offset.set(t * .02, t * .012); oceanTex.offset.set(t * .006, t * .004);
    for(const p of portals){
      p.swirl.rotation.z = -t * 1.6; p.ring.material.opacity = .55 + Math.sin(t * 3 + p.zone) * .25; p.glow.material.opacity = .4 + Math.sin(t * 2 + p.zone) * .15;
      for(const s of p.sparks){ s.t = (s.t + dt * .35) % 1; const a = s.t * 9 + p.zone; s.sp.position.set(Math.cos(a) * (PR - .4) * (1 - s.t * .5), .2 + s.t * 4.2, Math.sin(a) * .5); s.sp.material.opacity = 1 - s.t; }
    }
    if(belt) belt.rotation.y = t * .25;
    for(const s of swings) s.g.rotation.x = Math.sin(t * 1.7 + s.ph) * .4;
    balloons.position.y = Math.sin(t * 1.2) * .15;
    for(const Z of zones){
      const d = Math.hypot(camPos.x - Z.cx, camPos.z - Z.cz), farOn = d > LOD_FAR;
      if(Z.grp.visible === farOn){ Z.grp.visible = !farOn; Z.farGrp.visible = farOn; }
      if(!farOn) Z.extra.forEach(f => f(t));
    }
    // giant house walls sink while the player is inside (dollhouse view)
    if(walls6.grp && focus){ const b = walls6.box, lx = locX(b, focus.x, focus.z), lz = locZ(b, focus.x, focus.z), inside = Math.abs(lx) < b.hw + .5 && Math.abs(lz) < b.hd + .5;
      const k = walls6.grp.scale.y + ((inside ? .3 : 1) - walls6.grp.scale.y) * Math.min(1, dt * 5); walls6.grp.scale.y = k; walls6.grp.visible = zones[6].grp.visible; }
    // pets wander around the pet town
    const Zp = zones[2];
    for(const p of roamPets){
      p.t += dt; if(p.happyT > 0) p.happyT -= dt;
      if(!Zp.grp.visible){ p.M.grp.visible = false; continue; }
      p.M.grp.visible = true; p.idleT -= dt;
      if(!p.tgt && p.idleT <= 0){ const a = rnd() * TAU, r = 2 + rnd() * 6; p.tgt = { x:Zp.wx(Math.cos(a) * r, -2 + Math.sin(a) * r), z:Zp.wz(Math.cos(a) * r, -2 + Math.sin(a) * r) }; }
      if(p.tgt && p.happyT <= 0){ const dx = p.tgt.x - p.x, dz = p.tgt.z - p.z, dd = Math.hypot(dx, dz);
        if(dd < .25){ p.tgt = null; p.idleT = 2 + rnd() * 4; p.move += (0 - p.move) * Math.min(1, dt * 6); }
        else { const sp = 1.6; p.x += dx / dd * sp * dt; p.z += dz / dd * sp * dt; let df = Math.atan2(dx, dz) - p.f; while(df > Math.PI) df -= TAU; while(df < -Math.PI) df += TAU; p.f += df * Math.min(1, dt * 8); p.move += (1 - p.move) * Math.min(1, dt * 6); } }
      else p.move += (0 - p.move) * Math.min(1, dt * 6);
      p.M.grp.position.set(p.x, 0, p.z); p.M.grp.rotation.y = p.f;
      PM.posePet(p.M, { t:p.t, dt, move:p.move, mode:p.happyT > 0 ? 'happy' : (p.move < .1 && p.idleT > 2.5 ? 'sit' : 'idle') });
    }
  }

  /* ---------- the mini-map background (drawn once) ---------- */
  function drawMap(x, S){
    const k = S / (2 * (ISL.R + 8)), c = S / 2, P = (wx, wz) => [c + wx * k, c + wz * k];
    x.clearRect(0, 0, S, S);
    x.fillStyle = '#5cc8f0'; x.beginPath(); x.arc(c, c, S / 2, 0, TAU); x.fill();
    x.fillStyle = '#f2dc9b'; x.beginPath(); x.arc(c, c, (ISL.R + 4.5) * k, 0, TAU); x.fill();
    x.fillStyle = '#86d46a'; x.beginPath(); x.arc(c, c, (ISL.R + 1.5) * k, 0, TAU); x.fill();
    x.strokeStyle = '#5cc8f0'; x.lineWidth = (ISL.RIVER1 - ISL.RIVER0) * k; x.beginPath(); x.arc(c, c, (ISL.RIVER0 + ISL.RIVER1) / 2 * k, 0, TAU); x.stroke();
    x.strokeStyle = '#f6ead0'; x.lineWidth = Math.max(2, ISL.PATH_W * k); x.lineCap = 'round';
    for(let i = 0; i < N; i++){ const a = zoneAng(i), [x0, y0] = P(Math.sin(a) * ISL.PLAZA, Math.cos(a) * ISL.PLAZA), [x1, y1] = P(Math.sin(a) * ISL.ZR, Math.cos(a) * ISL.ZR); x.beginPath(); x.moveTo(x0, y0); x.lineTo(x1, y1); x.stroke(); }
    x.fillStyle = '#f6ead0'; x.beginPath(); x.arc(c, c, ISL.PLAZA * k, 0, TAU); x.fill();
    for(const Z of zones){ const [zx, zy] = P(Z.cx, Z.cz); x.fillStyle = Z.css; x.globalAlpha = Z.soon ? .35 : .55; x.beginPath(); x.arc(zx, zy, ISL.ZRAD * k, 0, TAU); x.fill(); x.globalAlpha = 1;
      x.font = `${Math.round(S * .085)}px system-ui,sans-serif`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(Z.emoji, zx, zy); }
  }

  return { solidTop, zones, portals, plants, setPlant, cups, nests, addNestEgg, eggStalls, roamPets, climbTops, heightAt, pushOut, animate, drawMap, zoneAng, COLL,
    spawn:{ x:0, z:7, f:Math.PI }, mapScale:S => S / (2 * (ISL.R + 8)) };
}
