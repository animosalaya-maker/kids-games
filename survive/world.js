/* Deserted Island («البقاء بالجزيرة المهجورة»): the island world.
   A low-poly tropical island (one terrain mesh, flat shaded, vertex coloured) in a gently waving sea:
   sandy beach ring with palms, a small forest in the middle, a rocky hill, a pond with a stream to the sea,
   berry bushes, pick-ups (stones, vines, leaves, plane parts), crates washed ashore, a friendly crashed plane on the sand,
   the raft building spot, the camp (campfire, tent), shark fins circling offshore and the rescue ship on the horizon.
   Everything that repeats is instanced; the static scenery is merged. The layout is fixed (same seed on every phone),
   so online only "what is there right now" travels (see game.js). */
export function makeIsland(THREE, K){
  const { Merge, G } = K;
  const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _s = new THREE.Vector3(), _v = new THREE.Vector3(), _c = new THREE.Color(), _c2 = new THREE.Color();
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v, lerp = (a, b, t) => a + (b - a) * t;
  const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  let seed = 20261121;
  const rnd = () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const rr = (a, b) => a + rnd() * (b - a);
  const root = new THREE.Group();
  const lam = (o = {}) => new THREE.MeshLambertMaterial(Object.assign({ vertexColors:true, flatShading:true }, o));
  const MAT = lam(), MATS = lam({ side:THREE.DoubleSide });

  /* ======================================================================
     Shape of the island
     ====================================================================== */
  const EDGE = a => 47 + 5 * Math.sin(3 * a + .7) + 3 * Math.sin(5 * a + 2.1) + 1.6 * Math.sin(8 * a + .3);
  const polar = (a, r) => ({ x:Math.cos(a) * r, z:Math.sin(a) * r });
  const shoreAt = (a, inset = 0) => polar(a, EDGE(a) - inset);
  const BEACH = [[.8, 1.1], [.9, .66], [1.0, 0], [1.1, -.9], [1.28, -2.6], [1.55, -5.4], [2.0, -8.5], [9, -9]];
  function profile(d){
    for(let i = 1; i < BEACH.length; i++){ const [d1, h1] = BEACH[i]; if(d <= d1){ const [d0, h0] = BEACH[i - 1], t = (d - d0) / (d1 - d0); return lerp(h0, h1, t * t * (3 - 2 * t) * .35 + t * .65); } }
    return -9;
  }
  const HILL = { x:21, z:-23, h:5.2, s:95 };
  const FOREST = { x:-3, z:-6, r:17 };
  const POND = { x:-17, z:6, r:4.4, y:0 };
  function base(x, z){
    const r = Math.hypot(x, z), a = Math.atan2(z, x), e = EDGE(a), d = r / e;
    let h;
    if(d < .8){
      const u = (.8 - d) / .8;
      h = 1.1 + sstep(0, 1, u) * 2.3 + (Math.sin(x * .21 + 1) * Math.cos(z * .17) * .5 + Math.sin(x * .07 - z * .11) * .55) * sstep(0, .35, u);
    } else h = profile(d);
    h += HILL.h * Math.exp(-((x - HILL.x) ** 2 + (z - HILL.z) ** 2) / HILL.s) * sstep(1, .6, d);
    return h;
  }
  POND.y = base(POND.x, POND.z) - .35;
  /* the stream: from the pond down to the west beach */
  const SP = [[-20.6, 7.8], [-25.5, 10.6], [-30.5, 10.2], [-35.5, 12.6], [-40.5, 13.6], [-46, 15.8], [-52, 17.5]];
  const SEG = []; { let acc = 0; for(let i = 0; i < SP.length - 1; i++){ const [x0, z0] = SP[i], [x1, z1] = SP[i + 1], l = Math.hypot(x1 - x0, z1 - z0); SEG.push({ x0, z0, x1, z1, l, a:acc }); acc += l; } SEG.L = acc; }
  const SY = []; for(let i = 0; i <= 40; i++){ const s = i / 40, p = streamPoint(s); SY.push(Math.min(lerp(POND.y - .05, -.15, Math.pow(s, .85)), base(p.x, p.z) - .3)); }
  for(let i = 1; i < SY.length; i++) SY[i] = Math.min(SY[i], SY[i - 1]);
  function streamPoint(s){ let t = s * SEG.L; for(const g of SEG){ if(t <= g.l || g === SEG[SEG.length - 1]){ const k = clamp(t / g.l, 0, 1); return { x:lerp(g.x0, g.x1, k), z:lerp(g.z0, g.z1, k), dx:(g.x1 - g.x0) / g.l, dz:(g.z1 - g.z0) / g.l }; } t -= g.l; } return { x:0, z:0, dx:1, dz:0 }; }
  const streamY = s => { const f = clamp(s, 0, 1) * 40, i = Math.min(39, Math.floor(f)); return lerp(SY[i], SY[i + 1], f - i); };
  function streamNear(x, z){
    let best = 1e9, bs = 0;
    for(const g of SEG){ const vx = g.x1 - g.x0, vz = g.z1 - g.z0, t = clamp(((x - g.x0) * vx + (z - g.z0) * vz) / (g.l * g.l), 0, 1), px = g.x0 + vx * t, pz = g.z0 + vz * t, d = Math.hypot(x - px, z - pz); if(d < best){ best = d; bs = (g.a + t * g.l) / SEG.L; } }
    return { d:best, s:bs };
  }
  function terr(x, z){
    let h = base(x, z);
    const pd = Math.hypot(x - POND.x, z - POND.z);
    if(pd < POND.r) h = Math.min(h, POND.y - .15 - 1.0 * (1 - (pd / POND.r) ** 2));
    else if(pd < POND.r + 2.4) h = Math.min(h, POND.y - .15 + (pd - POND.r) * .42);
    const sn = streamNear(x, z);
    if(sn.d < 2.6){ const sy = streamY(sn.s); if(sn.d < 1.05) h = Math.min(h, sy - .32 - .28 * (1 - sn.d / 1.05)); else h = Math.min(h, sy - .1 + (sn.d - 1.05) * .55); }
    return h;
  }
  /* water surface at a point (sea = 0), -Infinity on dry land */
  function waterAt(x, z){
    const pd = Math.hypot(x - POND.x, z - POND.z);
    if(pd < POND.r + .3) return POND.y;
    const sn = streamNear(x, z);
    if(sn.d < 1.2) return streamY(sn.s);
    return 0;
  }
  const distN = (x, z) => Math.hypot(x, z) / EDGE(Math.atan2(z, x));

  /* ======================================================================
     Places
     ====================================================================== */
  const A_PLANE = 1.42, A_RAFT = 1.86, A_CAMP = 1.62;
  const PLANE = (() => { const p = shoreAt(A_PLANE, 8.5); return { x:p.x, z:p.z, a:Math.PI / 2 + .35 }; })();
  const RAFT = (() => { const p = shoreAt(A_RAFT, .6); return { x:p.x, z:p.z, a:A_RAFT - Math.PI / 2 }; })();     // a = heading out to sea
  RAFT.board = (() => { const p = shoreAt(A_RAFT, 4.2); return { x:p.x, z:p.z }; })();
  const CAMP = (() => { const p = shoreAt(A_CAMP, 14); return { x:p.x, z:p.z }; })();
  const FIRE = { x:CAMP.x + 2.5, z:CAMP.z + 1.2 }, TENT = { x:CAMP.x - 3.2, z:CAMP.z - 1.8 };
  const SPAWN = (() => { const p = shoreAt(A_PLANE + .12, 10.5); return { x:p.x, z:p.z }; })();
  const SHIP = { x:Math.cos(A_RAFT) * 230, z:Math.sin(A_RAFT) * 230 };
  for(const o of [PLANE, RAFT, CAMP, FIRE, TENT, SPAWN, RAFT.board]) o.y = terr(o.x, o.z);

  /* collision circles (static) in a coarse grid */
  const CELL = 8, grid = new Map(), CIRC = [];
  function addCirc(x, z, r, top = 99, o = {}){
    const c = Object.assign({ x, z, r, top }, o); CIRC.push(c);
    for(let gx = Math.floor((x - r) / CELL); gx <= Math.floor((x + r) / CELL); gx++) for(let gz = Math.floor((z - r) / CELL); gz <= Math.floor((z + r) / CELL); gz++){ const k = gx + ',' + gz; if(!grid.has(k)) grid.set(k, []); grid.get(k).push(c); }
    return c;
  }
  function circlesNear(x, z){ const k = Math.floor(x / CELL) + ',' + Math.floor(z / CELL); return grid.get(k) || []; }
  const clear = [];      // spots kept free of scenery
  const isClear = (x, z, r) => clear.every(c => Math.hypot(x - c.x, z - c.z) > c.r + r);
  clear.push({ x:PLANE.x, z:PLANE.z, r:7.5 }, { x:RAFT.x, z:RAFT.z, r:6 }, { x:RAFT.board.x, z:RAFT.board.z, r:3 }, { x:CAMP.x, z:CAMP.z, r:7 }, { x:SPAWN.x, z:SPAWN.z, r:3 }, { x:POND.x, z:POND.z, r:POND.r + 2.2 });
  const nearStream = (x, z, r) => streamNear(x, z).d < 2.4 + r;

  /* ======================================================================
     Terrain
     ====================================================================== */
  {
    const S = 70, N = 128, step = S * 2 / N, pos = [], col = [];
    const H = []; for(let j = 0; j <= N; j++){ const row = []; for(let i = 0; i <= N; i++) row.push(terr(-S + i * step, -S + j * step)); H.push(row); }
    const SAND = new THREE.Color('#f6dfa2'), SAND2 = new THREE.Color('#efd28e'), WET = new THREE.Color('#d9c084'), DEEP = new THREE.Color('#7fc9bd'),
      GRASS = new THREE.Color('#7fcc5c'), GRASS2 = new THREE.Color('#6dbd4e'), FOR = new THREE.Color('#58a845'), ROCKY = new THREE.Color('#9fae86'), BED = new THREE.Color('#cbb987'), FLOOR = new THREE.Color('#2a86b8');
    const tri = (ax, az, bx, bz, cx, cz, ha, hb, hc) => {
      const mx = (ax + bx + cx) / 3, mz = (az + bz + cz) / 3, mh = (ha + hb + hc) / 3, slope = Math.max(Math.abs(ha - hb), Math.abs(hb - hc), Math.abs(ha - hc)) / step;
      const d = distN(mx, mz), sn = streamNear(mx, mz).d, pd = Math.hypot(mx - POND.x, mz - POND.z);
      const n = Math.sin(mx * 1.7 + mz * .3) * Math.cos(mz * 1.3 - mx * .2);
      if(mh < -.25){ _c.copy(WET).lerp(DEEP, sstep(-.3, -3, mh)).lerp(FLOOR, sstep(-3, -6.5, mh)); }
      else if(sn < 1.4 || pd < POND.r + .4){ _c.copy(BED); }
      else {
        const g = sstep(.74, .8, d * (1 + n * .02)) ;          // 0 = grass, 1 = sand
        _c2.copy(n > 0 ? GRASS : GRASS2);
        const fk = sstep(FOREST.r + 4, FOREST.r - 4, Math.hypot(mx - FOREST.x, mz - FOREST.z)); _c2.lerp(FOR, fk * .8);
        _c2.lerp(ROCKY, sstep(.55, 1.1, slope) * .7 + sstep(5.5, 8, mh) * .4);
        _c.copy(n > .2 ? SAND2 : SAND).lerp(WET, sstep(.35, -.1, mh) * .8);
        _c.lerp(_c2, 1 - g);
      }
      _c.offsetHSL(0, 0, n * .012);
      pos.push(ax, ha, az, bx, hb, bz, cx, hc, cz); for(let k = 0; k < 3; k++) col.push(_c.r, _c.g, _c.b);
    };
    for(let j = 0; j < N; j++) for(let i = 0; i < N; i++){
      const x0 = -S + i * step, z0 = -S + j * step, x1 = x0 + step, z1 = z0 + step;
      const h00 = H[j][i], h10 = H[j][i + 1], h01 = H[j + 1][i], h11 = H[j + 1][i + 1];
      if(Math.max(h00, h10, h01, h11) < -8.4) continue;
      if((i + j) % 2){ tri(x0, z0, x0, z1, x1, z0, h00, h01, h10); tri(x1, z0, x0, z1, x1, z1, h10, h01, h11); }
      else { tri(x0, z0, x0, z1, x1, z1, h00, h01, h11); tri(x0, z0, x1, z1, x1, z0, h00, h11, h10); }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.computeVertexNormals();
    const m = new THREE.Mesh(g, MAT); m.receiveShadow = true; root.add(m);
    // sea floor far away
    const fl = new THREE.Mesh(new THREE.CircleGeometry(900, 32).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color:0x2a86b8 })); fl.position.y = -9; root.add(fl);
  }

  /* ======================================================================
     Water: the sea (waves in the vertex shader), shore foam, the pond and the stream
     ====================================================================== */
  const U = { t:{ value:0 } };
  const sea = (() => {
    const RINGS = [], SEGS = 128; let r = 18; while(r < 760){ RINGS.push(r); r += r < 70 ? 1.6 : r < 140 ? 4 : r * .12; } RINGS.push(800);
    const pos = [], col = [], idx = [];
    const SH = new THREE.Color('#6ff0dc'), MID = new THREE.Color('#33c3ec'), DP = new THREE.Color('#2196e0'), FAR = new THREE.Color('#3097e0');
    for(let j = 0; j < RINGS.length; j++) for(let i = 0; i < SEGS; i++){
      const a = i / SEGS * Math.PI * 2 + (j % 2) * Math.PI / SEGS, R = RINGS[j], x = Math.cos(a) * R, z = Math.sin(a) * R;
      pos.push(x, 0, z);
      const depth = -terr(x, z);
      _c.copy(SH).lerp(MID, sstep(.4, 2.6, depth)).lerp(DP, sstep(2.6, 7, depth)).lerp(FAR, sstep(150, 500, R));
      col.push(_c.r, _c.g, _c.b, lerp(.42, .93, sstep(.1, 4.5, depth)));
    }
    for(let j = 0; j < RINGS.length - 1; j++) for(let i = 0; i < SEGS; i++){
      const a = j * SEGS + i, b = j * SEGS + (i + 1) % SEGS, c = (j + 1) * SEGS + i, d = (j + 1) * SEGS + (i + 1) % SEGS;
      if(j % 2){ idx.push(a, c, b, b, c, d); } else { idx.push(a, c, d, a, d, b); }
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 4)); g.setIndex(idx);
    g.computeVertexNormals();
    const mat = new THREE.MeshPhongMaterial({ vertexColors:true, transparent:true, flatShading:true, shininess:90, specular:0x9adfff, depthWrite:false, emissive:0x0f4f6a, emissiveIntensity:.45 });
    mat.onBeforeCompile = sh => {
      sh.uniforms.uT = U.t;
      sh.vertexShader = 'uniform float uT;\nvarying float vW;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
        float rr = length(position.xz);
        float amp = smoothstep(20.0, 60.0, rr) * 0.75 + 0.25;
        float w = (sin(position.x * .16 + uT * 1.15) * .17 + sin(position.z * .2 - uT * .85) * .14 + sin((position.x - position.z) * .34 + uT * 1.9) * .05);
        vW = w / 0.36;
        transformed.y += w * amp;`);
      sh.fragmentShader = 'varying float vW;\n' + sh.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
        diffuseColor.rgb += vec3(smoothstep(.62, .95, vW)) * .32;`);
    };
    const m = new THREE.Mesh(g, mat); m.renderOrder = 3; m.frustumCulled = false; root.add(m);
    return m;
  })();
  /* foam ring along the shore */
  const foam = (() => {
    const SEGS = 200, pos = [], col = [], idx = [];
    const rows = [[-.7, 0], [.25, .95], [1.1, .55], [2.6, 0]];
    for(let i = 0; i < SEGS; i++){ const a = i / SEGS * Math.PI * 2, e = EDGE(a); for(const [o, al] of rows){ const x = Math.cos(a) * (e + o), z = Math.sin(a) * (e + o); pos.push(x, Math.max(terr(x, z), 0) + .1, z); col.push(1, 1, 1, al); } }
    for(let i = 0; i < SEGS; i++) for(let k = 0; k < 3; k++){ const a = i * 4 + k, b = ((i + 1) % SEGS) * 4 + k; idx.push(a, a + 1, b, b, a + 1, b + 1); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 4)); g.setIndex(idx);
    const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors:true, transparent:true, depthWrite:false, opacity:.8 })); m.renderOrder = 4; root.add(m); return m;
  })();
  const fresh = new THREE.MeshPhongMaterial({ color:0x58c8e8, transparent:true, opacity:.78, flatShading:true, shininess:80, specular:0xbfefff, depthWrite:false });
  const pond = new THREE.Mesh(new THREE.CircleGeometry(POND.r + .35, 28).rotateX(-Math.PI / 2), fresh); pond.position.set(POND.x, POND.y, POND.z); pond.renderOrder = 3; root.add(pond);
  const streamTex = K.canvasTex(64, 128, (x, w, h) => { x.fillStyle = '#5fcbe9'; x.fillRect(0, 0, w, h); x.strokeStyle = 'rgba(255,255,255,.55)'; x.lineWidth = 3; for(let i = 0; i < 7; i++){ const y = i * 19 + 4, xx = 8 + (i * 23) % 40; x.beginPath(); x.moveTo(xx, y); x.lineTo(xx + 14, y + 6); x.stroke(); } });
  streamTex.wrapS = streamTex.wrapT = THREE.RepeatWrapping;
  const stream = (() => {
    const pos = [], uv = [], idx = [], N = 60, W = 1.25;
    for(let i = 0; i <= N; i++){ const s = i / N, p = streamPoint(s), y = streamY(s) - .02, nx = -p.dz, nz = p.dx; pos.push(p.x + nx * W, y, p.z + nz * W, p.x - nx * W, y, p.z - nz * W); uv.push(0, s * SEG.L / 3, 1, s * SEG.L / 3); }
    for(let i = 0; i < N; i++){ const a = i * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
    const m = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ map:streamTex, transparent:true, opacity:.85, depthWrite:false, side:THREE.DoubleSide })); m.renderOrder = 3; root.add(m); return m;
  })();
  // stepping stones over the stream
  { const M = new Merge(); for(const s of [.32, .62]){ const p = streamPoint(s), nx = -p.dz, nz = p.dx; for(let k = -1; k <= 1; k++){ const x = p.x + nx * k * .8, z = p.z + nz * k * .8; M.add(G.dode, x, streamY(s) - .05, z, .5, .3, .45, 0, k, 0, 0xb8bcc2); } } const m = new THREE.Mesh(M.geometry(), MAT); m.castShadow = true; root.add(m); }

  /* ======================================================================
     Sky: gradient dome (day ↔ night), sun glow, moon, stars, clouds
     ====================================================================== */
  const SKYU = { top:{ value:new THREE.Color('#3f95ec') }, mid:{ value:new THREE.Color('#8cd0ff') }, hor:{ value:new THREE.Color('#e6f7ff') } };
  const sky = new THREE.Mesh(new THREE.SphereGeometry(900, 24, 14), new THREE.ShaderMaterial({ uniforms:SKYU, side:THREE.BackSide, depthWrite:false, fog:false,
    vertexShader:'varying float vy; void main(){ vy = normalize(position).y; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader:'uniform vec3 top; uniform vec3 mid; uniform vec3 hor; varying float vy; void main(){ vec3 c = mix(hor, mid, smoothstep(-0.02, 0.2, vy)); c = mix(c, top, smoothstep(0.2, 0.75, vy)); gl_FragColor = vec4(c, 1.0);\n#include <colorspace_fragment>\n}' }));
  sky.renderOrder = -10; sky.frustumCulled = false; root.add(sky);
  const sunG = new THREE.Sprite(new THREE.SpriteMaterial({ map:K.glowTex, color:0xfff3c0, transparent:true, depthWrite:false, fog:false, blending:THREE.AdditiveBlending }));
  sunG.scale.set(220, 220, 1); root.add(sunG);
  const moonTex = K.canvasTex(128, 128, (x, w) => { const g = x.createRadialGradient(64, 64, 20, 64, 64, 64); g.addColorStop(0, 'rgba(255,250,220,.9)'); g.addColorStop(.42, 'rgba(255,250,220,.25)'); g.addColorStop(1, 'rgba(255,250,220,0)'); x.fillStyle = g; x.fillRect(0, 0, w, w); x.fillStyle = '#fffbe6'; x.beginPath(); x.arc(64, 64, 22, 0, 6.3); x.fill(); x.fillStyle = 'rgba(220,214,180,.8)'; x.beginPath(); x.arc(56, 58, 5, 0, 6.3); x.arc(70, 72, 4, 0, 6.3); x.fill(); });
  const moon = new THREE.Sprite(new THREE.SpriteMaterial({ map:moonTex, transparent:true, depthWrite:false, fog:false, opacity:0 })); moon.scale.set(110, 110, 1); root.add(moon);
  const stars = (() => {
    const pos = [], col = []; for(let i = 0; i < 700; i++){ const a = rr(0, Math.PI * 2), y = rr(.08, 1), r = Math.sqrt(1 - y * y); pos.push(Math.cos(a) * r * 800, y * 800, Math.sin(a) * r * 800); const w = rr(.75, 1); col.push(w, w, rr(.8, 1)); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    const p = new THREE.Points(g, new THREE.PointsMaterial({ size:2.6, sizeAttenuation:false, vertexColors:true, transparent:true, opacity:0, fog:false, depthWrite:false })); p.frustumCulled = false; root.add(p); return p;
  })();
  const cloudGeo = (() => { const M = new Merge(); const puffs = [[0, 0, 0, 5], [4.5, -.6, .5, 3.8], [-4.4, -.8, -.3, 3.6], [1.8, 2.2, -.4, 3.4], [-2, 1.6, .8, 3], [7.5, -1.4, 0, 2.4], [-7.2, -1.5, .2, 2.2]];
    for(const [x, y, z, r] of puffs) M.add(G.ico1, x, y, z, r, r * .85, r, 0, 0, 0, 0xffffff); M.add(G.cyl, 0, -2.4, 0, 8, .8, 4, 0, 0, 0, 0xe2ecfb); return M.geometry(); })();
  const cloudMat = new THREE.MeshLambertMaterial({ vertexColors:true, emissive:0xffffff, emissiveIntensity:.5, flatShading:true, fog:false, transparent:true, opacity:.96 });
  const CLOUD_N = 16, clouds = new THREE.InstancedMesh(cloudGeo, cloudMat, CLOUD_N), CL = [];
  for(let i = 0; i < CLOUD_N; i++){ const a = rr(0, Math.PI * 2), r = rr(120, 420); CL.push({ a, r, y:rr(60, 110), s:rr(1.3, 2.8), ry:rr(0, 3), v:rr(.004, .01) }); }
  clouds.frustumCulled = false; root.add(clouds);

  /* ======================================================================
     Palms (instanced, with coconuts), forest trees (choppable, regrow), stumps
     ====================================================================== */
  const PALM_CROWN = new THREE.Vector3();
  /* one palm leaf: a drooping strip with a fold along the middle (double sided) */
  const frond = (() => {
    const N = 8, pos = [], idx = [];
    for(let i = 0; i <= N; i++){ const t = i / N, d = t * 3.0, y = .35 * t - t * t * 1.9, w = Math.sin(Math.PI * Math.min(1, t * 1.15)) * .55 + .04;
      pos.push(d, y + .12, 0, d, y - .02 * w, -w, d, y - .02 * w, w); }
    for(let i = 0; i < N; i++){ const a = i * 3; idx.push(a, a + 3, a + 1, a + 1, a + 3, a + 4, a, a + 2, a + 3, a + 2, a + 5, a + 3); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); return g;
  })();
  const palmGeo = (() => {
    const M = new Merge(); let x = 0, y = 0, lean = 0;
    for(let i = 0; i < 7; i++){ const seg = .95; lean += .055; M.add(G.cyl8, x, y + seg / 2, 0, .26 - i * .018, seg / 2 + .04, .26 - i * .018, 0, 0, -lean, i % 2 ? 0xa8773f : 0x8f6331); M.add(G.cyl8, x, y + seg * .96, 0, .3 - i * .018, .06, .3 - i * .018, 0, 0, -lean, 0x7a532a); x += Math.sin(lean) * seg; y += Math.cos(lean) * seg; }
    PALM_CROWN.set(x, y, 0);
    M.add(G.sph, x, y + .05, 0, .42, .32, .42, 0, 0, 0, 0x5aa83a);
    for(let k = 0; k < 9; k++){ const a = k / 9 * Math.PI * 2 + .2, tilt = (k % 3) * .12; M.add(frond, x, y + .1, 0, 1, 1, 1, tilt, -a, 0, k % 2 ? 0x46b34c : 0x2f9a40); }
    return M.geometry();
  })();
  const PALMS = [];
  for(let tries = 0; PALMS.length < 38 && tries < 3000; tries++){
    const a = rr(0, Math.PI * 2), d = rr(.7, .86), e = EDGE(a), x = Math.cos(a) * e * d, z = Math.sin(a) * e * d;
    if(!isClear(x, z, 1.4) || nearStream(x, z, 1.2) || PALMS.some(p => Math.hypot(p.x - x, p.z - z) < 4.4)) continue;
    PALMS.push({ x, z, y:terr(x, z) - .1, ry:a + Math.PI + rr(-.7, .7), s:rr(.85, 1.15), nuts:2, max:2 });
  }
  const palmMesh = new THREE.InstancedMesh(palmGeo, MATS, PALMS.length); palmMesh.castShadow = true; root.add(palmMesh);
  PALMS.forEach((p, i) => { _m.compose(_v.set(p.x, p.y, p.z), _q.setFromEuler(_e.set(0, p.ry, 0)), _s.set(p.s, p.s, p.s)); palmMesh.setMatrixAt(i, _m); p.mat = _m.clone(); addCirc(p.x, p.z, .45, p.y + 6); });
  const NUT_OFF = [[.35, -.35, .2], [-.15, -.4, -.33], [-.2, -.38, .3]];
  const nutGeo = new THREE.SphereGeometry(.26, 8, 6), nutMesh = new THREE.InstancedMesh(nutGeo, new THREE.MeshLambertMaterial({ color:0x7a4f26, flatShading:true }), PALMS.length * 2); nutMesh.castShadow = true; root.add(nutMesh);
  const nutPos = (p, k) => _v.set(PALM_CROWN.x + NUT_OFF[k][0], PALM_CROWN.y + NUT_OFF[k][1], NUT_OFF[k][2]).applyMatrix4(p.mat);

  const treeGeoA = (() => { const M = new Merge();
    M.add(G.cyl8, 0, 1.1, 0, .32, 1.1, .32, 0, 0, 0, 0x8a5a2e).add(G.cyl8, .25, 1.6, 0, .1, .5, .1, 0, 0, -.8, 0x8a5a2e);
    M.add(G.ico1, 0, 3.1, 0, 1.75, 1.45, 1.75, 0, .3, 0, 0x4fae46).add(G.ico1, .9, 2.55, .5, 1.15, 1, 1.15, 0, 0, 0, 0x5fbf50).add(G.ico1, -.85, 2.6, -.45, 1.2, 1, 1.2, 0, 0, 0, 0x45a03f).add(G.ico1, .1, 4.1, -.1, 1.1, .9, 1.1, 0, 0, 0, 0x6ccb57);
    return M.geometry(); })();
  const treeGeoB = (() => { const M = new Merge();
    M.add(G.cyl8, 0, .8, 0, .28, .8, .28, 0, 0, 0, 0x7a4f2a);
    M.add(G.cone, 0, 2.2, 0, 1.9, 1.9, 1.9, 0, 0, 0, 0x2f9a55).add(G.cone, 0, 3.25, 0, 1.5, 1.6, 1.5, 0, .4, 0, 0x37aa5e).add(G.cone, 0, 4.2, 0, 1.05, 1.3, 1.05, 0, .8, 0, 0x44b96a);
    return M.geometry(); })();
  const stumpGeo = (() => { const M = new Merge(); M.add(G.cyl8, 0, .3, 0, .36, .3, .36, 0, 0, 0, 0x8a5a2e).add(G.cyl8, 0, .61, 0, .3, .02, .3, 0, 0, 0, 0xe8c48a).add(G.sm, .3, .1, .2, .18, .1, .1, 0, .5, 0, 0x8a5a2e); return M.geometry(); })();
  const TREES = [];
  for(let tries = 0; TREES.length < 30 && tries < 4000; tries++){
    const a = rr(0, Math.PI * 2), r = Math.sqrt(rnd()) * (FOREST.r + 3), x = FOREST.x + Math.cos(a) * r, z = FOREST.z + Math.sin(a) * r * .9;
    if(distN(x, z) > .7 || !isClear(x, z, 1.6) || nearStream(x, z, 1.5) || TREES.some(t => Math.hypot(t.x - x, t.z - z) < 3.6) || Math.hypot(x - HILL.x, z - HILL.z) < 7) continue;
    TREES.push({ x, z, y:terr(x, z) - .1, ry:rr(0, 6.28), s:rr(.85, 1.12), kind:rnd() < .62 ? 0 : 1, hp:3, grow:1, shake:0 });
  }
  // a few lone trees near the camp so the first chop is close
  for(const [a, ins] of [[1.3, 17], [1.78, 19], [1.55, 21]]){ const p = shoreAt(a, ins); if(isClear(p.x, p.z, 1.6)) TREES.push({ x:p.x, z:p.z, y:terr(p.x, p.z) - .1, ry:rr(0, 6.28), s:.95, kind:0, hp:3, grow:1, shake:0 }); }
  const treeMeshA = new THREE.InstancedMesh(treeGeoA, MAT, TREES.length), treeMeshB = new THREE.InstancedMesh(treeGeoB, MAT, TREES.length), stumpMesh = new THREE.InstancedMesh(stumpGeo, MAT, TREES.length);
  for(const m of [treeMeshA, treeMeshB, stumpMesh]){ m.castShadow = true; m.frustumCulled = false; root.add(m); }
  TREES.forEach(t => { t.circ = addCirc(t.x, t.z, .55, t.y + 5); });
  function drawTrees(time){
    TREES.forEach((t, i) => {
      const up = t.hp > 0, gs = up ? t.s * (.25 + .75 * t.grow) : 0, sh = t.shake > 0 ? Math.sin(time * 40) * t.shake * .12 : 0;
      _m.compose(_v.set(t.x, t.y, t.z), _q.setFromEuler(_e.set(sh, t.ry, sh * .6)), _s.set(gs, gs, gs));
      treeMeshA.setMatrixAt(i, t.kind === 0 ? _m : _m.makeScale(0, 0, 0));
      _m.compose(_v.set(t.x, t.y, t.z), _q.setFromEuler(_e.set(sh, t.ry, sh * .6)), _s.set(gs, gs, gs));
      treeMeshB.setMatrixAt(i, t.kind === 1 ? _m : _m.makeScale(0, 0, 0));
      const st = !up || t.grow < 1 ? t.s : 0;
      _m.compose(_v.set(t.x, t.y, t.z), _q.setFromEuler(_e.set(0, t.ry, 0)), _s.set(st, st, st)); stumpMesh.setMatrixAt(i, _m);
    });
    treeMeshA.instanceMatrix.needsUpdate = treeMeshB.instanceMatrix.needsUpdate = stumpMesh.instanceMatrix.needsUpdate = true;
  }

  /* ======================================================================
     Rocks (scenery, merged), bushes with berries, grass & flowers
     ====================================================================== */
  const ROCKS = [];
  {
    const M = new Merge(), cols = [0x9aa3ab, 0xaeb4ba, 0x8b939c, 0xb9bdb7];
    const rock = (x, z, s, sink = .35) => { const y = terr(x, z); M.add(G.dode, x, y + s * .5 - sink * s, z, s * rr(.9, 1.3), s * rr(.7, 1), s * rr(.9, 1.2), rr(0, 1), rr(0, 6), rr(0, 1), cols[Math.floor(rnd() * 4)]); ROCKS.push({ x, z, s }); addCirc(x, z, s * .95, y + s * 1.1); };
    for(let i = 0; i < 9; i++){ const a = rr(0, 6.28), r = rr(1, 7); const x = HILL.x + Math.cos(a) * r, z = HILL.z + Math.sin(a) * r; if(isClear(x, z, 2)) rock(x, z, rr(1.1, 2.3)); }
    for(let i = 0; i < 14; i++){ const a = rr(0, 6.28), d = rr(.86, 1.08), e = EDGE(a), x = Math.cos(a) * e * d, z = Math.sin(a) * e * d; if(isClear(x, z, 2.5) && !nearStream(x, z, 1)) rock(x, z, rr(.8, 1.9), .45); }
    for(let i = 0; i < 6; i++){ const a = rr(0, 6.28), p = polar(a, POND.r + rr(.6, 1.4)); rock(POND.x + p.x, POND.z + p.z, rr(.5, .9)); }
    const m = new THREE.Mesh(M.geometry(), MAT); m.castShadow = true; m.receiveShadow = true; root.add(m);
  }
  const bushGeo = (() => { const M = new Merge(); M.add(G.ico1, 0, .55, 0, .85, .7, .85, 0, 0, 0, 0x3f9a3c).add(G.ico1, .55, .45, .2, .6, .5, .6, 0, .4, 0, 0x4aa944).add(G.ico1, -.5, .42, -.15, .62, .5, .62, 0, .8, 0, 0x37903a); return M.geometry(); })();
  const BUSHES = [];
  for(let tries = 0; BUSHES.length < 12 && tries < 3000; tries++){
    const a = rr(0, Math.PI * 2), r = rr(FOREST.r - 4, FOREST.r + 9), x = FOREST.x + Math.cos(a) * r, z = FOREST.z + Math.sin(a) * r;
    if(distN(x, z) > .74 || !isClear(x, z, 1.2) || nearStream(x, z, 1) || TREES.some(t => Math.hypot(t.x - x, t.z - z) < 2.4) || BUSHES.some(b => Math.hypot(b.x - x, b.z - z) < 4)) continue;
    BUSHES.push({ x, z, y:terr(x, z) - .05, ry:rr(0, 6.28), n:3, max:3 });
  }
  { const p = shoreAt(A_CAMP - .2, 17); BUSHES.push({ x:p.x, z:p.z, y:terr(p.x, p.z) - .05, ry:1, n:3, max:3 }); }
  const bushMesh = new THREE.InstancedMesh(bushGeo, MAT, BUSHES.length); bushMesh.castShadow = true; root.add(bushMesh);
  BUSHES.forEach((b, i) => { _m.compose(_v.set(b.x, b.y, b.z), _q.setFromEuler(_e.set(0, b.ry, 0)), _s.set(1, 1, 1)); bushMesh.setMatrixAt(i, _m); b.circ = addCirc(b.x, b.z, .75, b.y + 1.1); });
  const BERRY_OFF = [[.45, .95, .55], [-.55, .8, .4], [.2, 1.18, -.4], [.75, .6, -.2]];
  const berryMesh = new THREE.InstancedMesh(new THREE.SphereGeometry(.16, 8, 6), new THREE.MeshLambertMaterial({ color:0xe8304f, emissive:0x5a0010, emissiveIntensity:.3 }), BUSHES.length * 3);
  berryMesh.frustumCulled = false; root.add(berryMesh);
  function drawBerries(){
    let k = 0;
    BUSHES.forEach(b => { for(let j = 0; j < 3; j++){ const s = j < b.n ? 1 : 0, o = BERRY_OFF[j], c = Math.cos(b.ry), sn = Math.sin(b.ry); _m.compose(_v.set(b.x + o[0] * c + o[2] * sn, b.y + o[1], b.z - o[0] * sn + o[2] * c), _q.identity(), _s.set(s, s, s)); berryMesh.setMatrixAt(k++, _m); } });
    berryMesh.instanceMatrix.needsUpdate = true;
  }
  {
    const M = new Merge(), FL = [0xff6f9e, 0xffd23f, 0xffffff, 0xc77dff, 0xff9a3a];
    for(let i = 0; i < 520; i++){
      const x = rr(-60, 60), z = rr(-60, 60), d = distN(x, z); if(d > .78 || nearStream(x, z, .2) || Math.hypot(x - POND.x, z - POND.z) < POND.r + 1) continue;
      const y = terr(x, z);
      if(rnd() < .78){ for(let k = 0; k < 3; k++) M.add(G.cone4, x + rr(-.25, .25), y + .18, z + rr(-.25, .25), .07, .38, .07, rr(-.3, .3), rr(0, 3), rr(-.3, .3), rnd() < .5 ? 0x5fb446 : 0x4ea23c); }
      else { M.add(G.cyl8, x, y + .17, z, .02, .17, .02, 0, 0, 0, 0x4e9a3a); M.add(G.ico, x, y + .36, z, .11, .07, .11, 0, 0, 0, FL[Math.floor(rnd() * FL.length)]); M.add(G.ico, x, y + .37, z, .045, .045, .045, 0, 0, 0, 0xffe680); }
    }
    // beach shells and starfish
    for(let i = 0; i < 40; i++){ const a = rr(0, 6.28), d = rr(.84, .97), e = EDGE(a), x = Math.cos(a) * e * d, z = Math.sin(a) * e * d; if(!isClear(x, z, .5)) continue; const y = terr(x, z);
      if(rnd() < .5) M.add(G.cone, x, y + .05, z, .16, .08, .12, 0, rr(0, 6), Math.PI / 2 - .2, rnd() < .5 ? 0xffd9e0 : 0xfff3d6);
      else for(let k = 0; k < 5; k++){ const aa = k / 5 * Math.PI * 2; M.add(G.box, x + Math.cos(aa) * .12, y + .04, z + Math.sin(aa) * .12, .22, .04, .07, 0, -aa, 0, 0xff8a5a); } }
    const m = new THREE.Mesh(M.geometry(), MAT); root.add(m);
  }

  /* ======================================================================
     Pick-ups on the ground (respawn): stones, vines, leaves, plane parts; crates washed ashore
     ====================================================================== */
  const PICKS = [];
  const addPick = (type, x, z) => { const y = terr(x, z); PICKS.push({ type, x, z, y, on:true, ry:rr(0, 6.28) }); };
  for(let tries = 0, n = 0; n < 14 && tries < 2000; tries++){ const near = ROCKS[Math.floor(rnd() * ROCKS.length)], a = rr(0, 6.28), r = near.s + rr(.8, 2.2), x = near.x + Math.cos(a) * r, z = near.z + Math.sin(a) * r; if(distN(x, z) > .96 || !isClear(x, z, .6) || terr(x, z) < .05 || PICKS.some(p => Math.hypot(p.x - x, p.z - z) < 2)) continue; addPick('stone', x, z); n++; }
  for(let tries = 0, n = 0; n < 6 && tries < 2000; tries++){ const a = rr(1.0, 2.3), p = shoreAt(a, rr(4, 16)); if(!isClear(p.x, p.z, .6) || PICKS.some(q => Math.hypot(q.x - p.x, q.z - p.z) < 3)) continue; addPick('stone', p.x, p.z); n++; }
  for(let tries = 0, n = 0; n < 12 && tries < 2000; tries++){ const t = TREES[Math.floor(rnd() * TREES.length)], a = rr(0, 6.28), x = t.x + Math.cos(a) * 1.6, z = t.z + Math.sin(a) * 1.6; if(!isClear(x, z, .5) || nearStream(x, z, .5) || PICKS.some(p => Math.hypot(p.x - x, p.z - z) < 2.2) || CIRC.some(c => Math.hypot(c.x - x, c.z - z) < c.r + .5)) continue; addPick('vine', x, z); n++; }
  for(let tries = 0, n = 0; n < 12 && tries < 2000; tries++){ const a = rr(0, 6.28), r = rr(2, FOREST.r + 6), x = FOREST.x + Math.cos(a) * r, z = FOREST.z + Math.sin(a) * r; if(distN(x, z) > .74 || !isClear(x, z, .6) || nearStream(x, z, .6) || PICKS.some(p => Math.hypot(p.x - x, p.z - z) < 2.4) || CIRC.some(c => Math.hypot(c.x - x, c.z - z) < c.r + .6)) continue; addPick('leaf', x, z); n++; }
  for(let i = 0; i < 6; i++){ const a = PLANE.a + Math.PI + rr(-1.6, 1.6), r = rr(5, 9), x = PLANE.x + Math.cos(a) * r, z = PLANE.z + Math.sin(a) * r; if(terr(x, z) < .1) { i--; continue; } addPick('metal', x, z); }
  const pickGeo = {
    stone:(() => { const M = new Merge(); M.add(G.dode, 0, .2, 0, .34, .24, .3, .3, 0, .2, 0xa6adb5).add(G.dode, .22, .12, .12, .18, .14, .16, 0, 1, 0, 0x8f979f); return M.geometry(); })(),
    vine:(() => { const M = new Merge(); M.add(G.torus, 0, .12, 0, .38, .38, .9, Math.PI / 2, 0, 0, 0x4f8f2a).add(G.torus, 0, .24, 0, .3, .3, .9, Math.PI / 2, 0, 0, 0x5ea232);
      for(let k = 0; k < 4; k++){ const a = k * 1.6; M.add(G.sph, Math.cos(a) * .38, .2, Math.sin(a) * .38, .13, .04, .08, 0, -a, 0, 0x7ccf4a); } return M.geometry(); })(),
    leaf:(() => { const M = new Merge(); for(let k = 0; k < 5; k++){ const a = k / 5 * Math.PI * 2; M.add(G.sph, Math.cos(a) * .4, .1 + k * .02, Math.sin(a) * .4, .55, .05, .24, 0, -a, .15, k % 2 ? 0x5cc04a : 0x3faa46); M.add(G.box, Math.cos(a) * .4, .13 + k * .02, Math.sin(a) * .4, .55, .02, .02, 0, -a, .15, 0x2f8a3a); } return M.geometry(); })(),
    metal:(() => { const M = new Merge(); M.add(G.box, 0, .1, 0, .8, .1, .5, 0, 0, .1, 0xc7ccd4).add(G.box, 0, .16, 0, .82, .04, .1, 0, 0, .1, 0xe8454f); for(const [x, z] of [[-.3, -.18], [.3, -.18], [-.3, .18], [.3, .18]]) M.add(G.cyl8, x, .17, z, .05, .03, .05, 0, 0, 0, 0x6e747c); M.add(G.cyl8, .25, .22, 0, .07, .2, .07, 0, 0, 1.3, 0x8a9099); return M.geometry(); })()
  };
  const pickMesh = {};
  for(const k of Object.keys(pickGeo)){ const list = PICKS.filter(p => p.type === k); const m = new THREE.InstancedMesh(pickGeo[k], MAT, Math.max(1, list.length)); m.castShadow = true; m.frustumCulled = false; root.add(m); pickMesh[k] = { m, list }; }
  function drawPicks(time){
    for(const k of Object.keys(pickMesh)){ const { m, list } = pickMesh[k]; list.forEach((p, i) => { const s = p.on ? (p.pop ? clamp(p.pop, 0, 1) : 1) : 0, bob = k === 'metal' ? Math.sin(time * 2 + i) * .03 : 0; _m.compose(_v.set(p.x, p.y + bob, p.z), _q.setFromEuler(_e.set(0, p.ry, 0)), _s.set(s, s, s)); m.setMatrixAt(i, _m); }); m.instanceMatrix.needsUpdate = true; }
  }
  /* crate spots on the beach (in the shallow water edge) */
  const CRATE_SPOTS = [];
  for(let i = 0; i < 14; i++){ const a = i / 14 * Math.PI * 2 + .21, p = shoreAt(a, .9 + (i % 3) * .5); if(!isClear(p.x, p.z, 1.2) || nearStream(p.x, p.z, 1.5)) continue; CRATE_SPOTS.push({ x:p.x, z:p.z, y:Math.max(terr(p.x, p.z), -.25), ry:a + rr(-.5, .5) }); }
  const crateGeo = (() => { const M = new Merge(); M.add(G.box, 0, .45, 0, .9, .9, .9, 0, 0, 0, 0xc98d4a); for(const s of [-1, 1]){ M.add(G.box, s * .46, .45, 0, .04, .92, .92, 0, 0, 0, 0x9a6431); M.add(G.box, 0, .45, s * .46, .92, .92, .04, 0, 0, 0, 0x9a6431); M.add(G.box, 0, .45 + s * .44, 0, .94, .06, .94, 0, 0, 0, 0x9a6431); }
    M.add(G.box, 0, .45, .475, .16, .16, .02, 0, 0, Math.PI / 4, 0xffd23f); return M.geometry(); })();
  const CRATE_MAX = 6, crateMesh = new THREE.InstancedMesh(crateGeo, MAT, CRATE_MAX); crateMesh.castShadow = true; crateMesh.frustumCulled = false; root.add(crateMesh);
  function drawCrates(list, time){
    for(let i = 0; i < CRATE_MAX; i++){
      const c = list[i], sp = c && CRATE_SPOTS[c.s];
      if(!sp){ _m.makeScale(0, 0, 0); crateMesh.setMatrixAt(i, _m); continue; }
      const s = clamp(c.pop == null ? 1 : c.pop, 0, 1), bob = sp.y < 0 ? Math.sin(time * 1.6 + i) * .08 : 0;
      _m.compose(_v.set(sp.x, sp.y + bob - .05, sp.z), _q.setFromEuler(_e.set(Math.sin(time + i) * (sp.y < 0 ? .06 : 0), sp.ry, .04)), _s.set(s, s, s)); crateMesh.setMatrixAt(i, _m);
    }
    crateMesh.instanceMatrix.needsUpdate = true;
  }

  /* ======================================================================
     The crashed plane (friendly cartoon plane resting on the sand) + suitcases
     ====================================================================== */
  function makePlane(){
    const grp = new THREE.Group(), M = new Merge();
    const W = 0xfdf8ee, BL = 0x3a8fe0, RD = 0xff5a5f, YL = 0xffc93d;
    M.add(G.cyl, 0, 0, 0, 1.15, 5.2, 1.15, Math.PI / 2, 0, 0, W);            // body along z
    M.add(G.sph, 0, 0, 2.6, 1.15, 1.15, 1.3, 0, 0, 0, W);                     // nose
    M.add(G.cyl, 0, .2, -3.6, .55, 2.2, .55, Math.PI / 2 - .12, 0, 0, W);      // tail cone
    M.add(G.cone, 0, .25, -3.6, 1.12, 2.3, 1.12, -Math.PI / 2 - .1, 0, 0, W);
    M.add(G.cyl, 0, -.15, 0, 1.17, 5.2, 1.17, Math.PI / 2, 0, 0, BL).add(G.cyl, 0, .05, 0, 1.16, 5.3, 1.16, Math.PI / 2, 0, 0, W);   // stripe (shows as a band below)
    M.add(G.box, 0, -.05, .2, 9.8, .22, 1.8, 0, 0, -.08, RD);                  // wings (one dips to the sand)
    for(const s of [-1, 1]) M.add(G.cyl8, s * 4.8, -.05 - s * .38, .2, .16, .9, .16, Math.PI / 2, 0, 0, YL);
    M.add(G.box, 0, 1.15, -4.3, .14, 1.7, 1.2, -.3, 0, 0, RD).add(G.box, 0, .3, -4.4, 3.2, .14, .9, 0, 0, 0, RD);      // tail fins
    for(let i = 0; i < 4; i++) for(const s of [-1, 1]) M.add(G.sph, s * 1.08, .32, 1.3 - i * 1.05, .08, .26, .3, 0, 0, 0, 0x7fd3ff);   // windows
    M.add(G.sph, 0, .78, 1.7, .75, .45, .8, -.2, 0, 0, 0x7fd3ff);                // cockpit glass
    M.add(G.cyl, 0, 0, 3.85, .28, .3, .28, Math.PI / 2, 0, 0, YL);            // spinner
    M.add(G.box, -1.16, -.05, -.8, .06, 1.6, .9, 0, 0, 0, 0xffe3a8);          // open door
    M.add(G.box, -1.7, -.6, -.8, .9, .08, .9, 0, 0, .9, 0xffe3a8);            // little ramp
    for(const s of [-1, 1]) M.add(G.cyl, s * 1.3, -1.2, 1.2, .42, .26, .42, 0, 0, Math.PI / 2, 0x3a3a48).add(G.cyl8, s * 1.1, -.8, 1.2, .07, .45, .07, 0, 0, 0, 0x9aa0aa);
    const body = new THREE.Mesh(M.geometry(), MAT); body.castShadow = true; body.receiveShadow = true; grp.add(body);
    // a friendly face: two big eyes over the nose, a smile under the propeller
    { const E = new Merge(); for(const sx of [-1, 1]){ E.add(G.sph, sx * .42, .58, 3.52, .33, .38, .16, -.45, sx * .35, 0, 0xffffff); E.add(G.sph, sx * .41, .56, 3.66, .15, .19, .07, -.45, sx * .35, 0, 0x2a1608); E.add(G.sph, sx * .37, .64, 3.72, .05, .06, .03, -.45, sx * .35, 0, 0xffffff); E.add(G.sph, sx * .76, -.1, 3.5, .17, .1, .05, 0, sx * .6, 0, 0xff8fa8); }
      const em = new THREE.Mesh(E.geometry(), lam({ flatShading:false })); grp.add(em); }
    const faceTex = K.canvasTex(128, 128, (x, w) => { x.clearRect(0, 0, w, w); x.lineWidth = 8; x.strokeStyle = '#2a1608'; x.lineCap = 'round'; x.beginPath(); x.arc(64, 82, 24, .35, Math.PI - .35); x.stroke(); });
    const face = new THREE.Mesh(new THREE.SphereGeometry(1.18, 20, 12, Math.PI / 2 - .7, 1.4, Math.PI / 2 - .5, 1.0), new THREE.MeshLambertMaterial({ map:faceTex, transparent:true, depthWrite:false }));
    face.position.set(0, -.1, 2.6); face.scale.set(1.0, 1.0, 1.13); grp.add(face);
    const prop = new THREE.Group(); prop.position.set(0, 0, 4.0); grp.add(prop);
    const P = new Merge(); for(let k = 0; k < 3; k++){ const a = k / 3 * Math.PI * 2; P.add(G.box, Math.cos(a) * .75, Math.sin(a) * .75, 0, .22, 1.5, .06, 0, 0, a - Math.PI / 2, 0x4a4a58); }
    const pm = new THREE.Mesh(P.geometry(), MAT); pm.castShadow = true; prop.add(pm);
    return { grp, prop };
  }
  const plane = makePlane();
  const PLANE_REST = { x:PLANE.x, y:PLANE.y + 1.05, z:PLANE.z, ry:PLANE.a, rz:.08, rx:-.05 };
  plane.grp.position.set(PLANE_REST.x, PLANE_REST.y, PLANE_REST.z); plane.grp.rotation.set(PLANE_REST.rx, PLANE_REST.ry, PLANE_REST.rz, 'YXZ');
  root.add(plane.grp);
  { const fw = Math.sin(PLANE.a), fz = Math.cos(PLANE.a), rx = Math.cos(PLANE.a), rz = -Math.sin(PLANE.a);
    for(let k = -3; k <= 4; k++) addCirc(PLANE.x + fw * k * .95, PLANE.z + fz * k * .95, 1.25, PLANE.y + 2.5);
    for(const s of [-1, 1]) for(const w of [2.6, 4.2]) addCirc(PLANE.x + rx * s * w + fw * .2, PLANE.z + rz * s * w + fz * .2, .7, PLANE.y + 1.2 + (s > 0 ? -.4 : .4));
    // suitcases and a beach umbrella next to the plane
    const M = new Merge(), SC = [0xff8fb1, 0x6cc4ff, 0xffc23d, 0x5ed6a0];
    for(let i = 0; i < 4; i++){ const ox = PLANE.x - rx * 3.2 + fw * (i - 1.5) * 1.1 - fw * 1.4, oz = PLANE.z - rz * 3.2 + fz * (i - 1.5) * 1.1 - fz * 1.4, y = terr(ox, oz); M.add(G.box, ox, y + .32, oz, .9, .62, .38, 0, PLANE.a + i * .4, i === 2 ? .2 : 0, SC[i]).add(G.box, ox, y + .68, oz, .3, .08, .08, 0, PLANE.a + i * .4, 0, 0x5a4a3a); addCirc(ox, oz, .45, y + .7); }
    const m = new THREE.Mesh(M.geometry(), MAT); m.castShadow = true; root.add(m);
  }

  /* ======================================================================
     Camp: stone ring for the campfire, tent spot (built later), signs
     ====================================================================== */
  const camp = new THREE.Group(); root.add(camp);
  const fireGrp = new THREE.Group(); fireGrp.position.set(FIRE.x, terr(FIRE.x, FIRE.z), FIRE.z); camp.add(fireGrp);
  { const M = new Merge(); for(let k = 0; k < 9; k++){ const a = k / 9 * Math.PI * 2; M.add(G.dode, Math.cos(a) * .85, .12, Math.sin(a) * .85, .26, .2, .24, 0, a, 0, k % 2 ? 0x9aa3ab : 0x8b939c); }
    for(let k = 0; k < 4; k++){ const a = k / 4 * Math.PI * 2 + .4; M.add(G.cyl8, Math.cos(a) * .25, .16, Math.sin(a) * .25, .1, .45, .1, Math.PI / 2 - .5, a, 0, 0x8a5a2e); }
    const m = new THREE.Mesh(M.geometry(), MAT); m.castShadow = true; fireGrp.add(m); }
  const flameMat = new THREE.MeshBasicMaterial({ color:0xffa53d, transparent:true, opacity:.92 }), flame2 = new THREE.MeshBasicMaterial({ color:0xffe066, transparent:true, opacity:.95 });
  const flames = [new THREE.Mesh(new THREE.ConeGeometry(.42, 1.1, 7), flameMat), new THREE.Mesh(new THREE.ConeGeometry(.24, .7, 6), flame2)];
  flames.forEach((f, i) => { f.position.y = .55 - i * .12; fireGrp.add(f); });
  const fireGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map:K.glowTex, color:0xffa040, transparent:true, depthWrite:false, blending:THREE.AdditiveBlending, opacity:.7 })); fireGlow.scale.set(5, 5, 1); fireGlow.position.y = .8; fireGrp.add(fireGlow);
  const fireLight = new THREE.PointLight(0xffa040, 0, 16, 1.6); fireLight.position.set(0, 1.4, 0); fireGrp.add(fireLight);
  fireGrp.visible = false;
  const fireCirc = { x:FIRE.x, z:FIRE.z, r:.9, top:FIRE.y + .6 };
  const tentGrp = new THREE.Group(); tentGrp.position.set(TENT.x, terr(TENT.x, TENT.z), TENT.z); tentGrp.rotation.y = A_CAMP + Math.PI / 2; camp.add(tentGrp);
  { const M = new Merge();
    const tri = new THREE.CylinderGeometry(1, 1, 1, 3, 1); tri.rotateZ(Math.PI / 2); tri.rotateX(Math.PI / 2);
    M.add(tri, 0, .95, 0, 1.55, 1.35, 2.6, 0, 0, 0, 0xff8a5a).add(tri, 0, .93, 1.32, 1.3, 1.1, .06, 0, 0, 0, 0xffc23d);
    M.add(G.cyl8, 0, 1.0, 1.35, .05, 1.0, .05, 0, 0, 0, 0x8a5a2e).add(G.cyl8, 0, 1.0, -1.35, .05, 1.0, .05, 0, 0, 0, 0x8a5a2e);
    for(let k = 0; k < 6; k++) M.add(G.sph, rr(-.6, .6), 1.5 + rr(-.2, .2), rr(-1, 1), .55, .05, .2, rr(-.4, .4), rr(0, 3), .8, k % 2 ? 0x46b34c : 0x37a043);
    M.add(G.box, 0, .05, 2.0, 1.4, .06, 1, 0, 0, 0, 0xfff3d6);
    const m = new THREE.Mesh(M.geometry(), MAT); m.castShadow = true; tentGrp.add(m); }
  tentGrp.visible = false;
  const tentCirc = { x:TENT.x, z:TENT.z, r:1.4, top:TENT.y + 2 };
  /* ghost outlines (blueprints) where the campfire / tent will go */
  const ghostMat = new THREE.MeshBasicMaterial({ color:0x8fe3ff, transparent:true, opacity:.35, depthWrite:false });
  const ghostRing = (r, x, z) => { const m = new THREE.Mesh(new THREE.RingGeometry(r - .12, r, 32).rotateX(-Math.PI / 2), ghostMat); m.position.set(x, terr(x, z) + .08, z); root.add(m); return m; };
  const fireGhost = ghostRing(1.1, FIRE.x, FIRE.z), tentGhost = ghostRing(1.8, TENT.x, TENT.z);

  /* ======================================================================
     The raft: built in stages at the shore (logs → ropes → mast + sail → paddles + flag)
     ====================================================================== */
  const raft = new THREE.Group(); root.add(raft);
  raft.position.set(RAFT.x, Math.max(RAFT.y, -.1) + .15, RAFT.z); raft.rotation.y = RAFT.a;
  const RP = { logs:[], ropes:[], mast:null, sail:null, extra:[] };
  { const lg = new THREE.CylinderGeometry(.32, .32, 4.6, 9).rotateX(Math.PI / 2);
    const lm = lam();
    for(let i = 0; i < 6; i++){ const M = new Merge(); M.add(lg, 0, 0, 0, 1, 1, 1, 0, 0, 0, i % 2 ? 0xb07a43 : 0x9c6a38); M.add(G.cyl8, 0, 0, 2.31, .27, .02, .27, Math.PI / 2, 0, 0, 0xe8c48a).add(G.cyl8, 0, 0, -2.31, .27, .02, .27, Math.PI / 2, 0, 0, 0xe8c48a);
      const m = new THREE.Mesh(M.geometry(), lm); m.position.set((i - 2.5) * .64, .3, (i % 2) * .12 - .06); m.castShadow = true; m.visible = false; raft.add(m); RP.logs.push(m); }
    for(let i = 0; i < 4; i++){ const M = new Merge(); const z = i < 3 ? (i - 1) * 1.6 : 0;
      if(i < 3){ M.add(G.box, 0, .55, z, 4.0, .1, .16, 0, 0, 0, 0xe8d39a); for(let k = 0; k < 6; k++) M.add(G.torus, (k - 2.5) * .64, .3, z, .34, .34, .6, 0, Math.PI / 2, 0, 0xd9c27e); }
      else M.add(G.box, 0, .66, 0, 3.6, .14, .7, 0, 0, 0, 0xb5813f);
      const m = new THREE.Mesh(M.geometry(), MAT); m.castShadow = true; m.visible = false; raft.add(m); RP.ropes.push(m); }
    { const M = new Merge(); M.add(G.cyl8, 0, 2.5, -.3, .12, 2.4, .12, 0, 0, 0, 0x8a5a2e).add(G.cyl8, 0, 3.6, -.05, .07, 1.2, .07, Math.PI / 2, 0, 0, 0x8a5a2e).add(G.sph, 0, 4.95, -.3, .16, .16, .16, 0, 0, 0, 0xffc23d);
      const m = new THREE.Mesh(M.geometry(), MAT); m.castShadow = true; m.visible = false; raft.add(m); RP.mast = m; }
    { const tex = K.canvasTex(128, 160, (x, w, h) => { x.fillStyle = '#fff6e4'; x.fillRect(0, 0, w, h); x.fillStyle = '#ff8a5a'; x.fillRect(0, 40, w, 22); x.fillRect(0, 98, w, 22); x.font = '54px serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('⭐', 64, 80); });
      const sg = new THREE.PlaneGeometry(2.2, 2.6, 6, 6), pa = sg.attributes.position; for(let i = 0; i < pa.count; i++){ const X = pa.getX(i), Y = pa.getY(i); pa.setZ(i, .45 * (1 - (X / 1.1) ** 2) * (1 - (Y / 1.3) ** 2 * .3)); } sg.computeVertexNormals();
      const m = new THREE.Mesh(sg, new THREE.MeshLambertMaterial({ map:tex, side:THREE.DoubleSide })); m.position.set(0, 2.35, -.2); m.castShadow = true; m.visible = false; raft.add(m); RP.sail = m; }
    for(const s of [-1, 1]){ const M = new Merge(); M.add(G.cyl8, 0, 0, 0, .06, 1.1, .06, 0, 0, 0, 0x8a5a2e).add(G.box, 0, -1.15, 0, .3, .55, .06, 0, 0, 0, 0xc98d4a);
      const m = new THREE.Mesh(M.geometry(), MAT); m.position.set(s * 2.05, .85, .9); m.rotation.set(.3, 0, s * .5); m.castShadow = true; m.visible = false; raft.add(m); RP.extra.push(m); }
    { const M = new Merge(); M.add(G.cyl8, 0, .6, 0, .04, .6, .04, 0, 0, 0, 0x8a5a2e).add(G.box, .32, 1.05, 0, .6, .38, .03, 0, 0, 0, 0x5ed6a0).add(G.box, .32, 1.05, .02, .2, .2, .01, 0, 0, Math.PI / 4, 0xffd23f);
      const m = new THREE.Mesh(M.geometry(), MAT); m.position.set(1.4, .55, -1.9); m.castShadow = true; m.visible = false; raft.add(m); RP.extra.push(m);
      const B = new Merge(); B.add(G.box, 0, .85, 0, 1.6, .14, .5, 0, 0, 0, 0xc98d4a).add(G.box, -.6, .72, 0, .12, .3, .4, 0, 0, 0, 0x9a6431).add(G.box, .6, .72, 0, .12, .3, .4, 0, 0, 0, 0x9a6431);
      const b = new THREE.Mesh(B.geometry(), MAT); b.position.set(0, 0, 1.3); b.castShadow = true; b.visible = false; raft.add(b); RP.extra.push(b); }
  }
  const raftGhost = new THREE.Mesh(new THREE.BoxGeometry(4.1, .5, 4.8), ghostMat); raftGhost.position.y = .3; raft.add(raftGhost);
  const raftEdges = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(4.1, .5, 4.8)), new THREE.LineBasicMaterial({ color:0xffffff, transparent:true, opacity:.8 })); raftEdges.position.y = .3; raft.add(raftEdges);
  /* stage 0..4 built, k = progress 0..1 in the current stage */
  function drawRaft(stage, k){
    const show = (list, n) => list.forEach((m, i) => { m.visible = i < n; });
    show(RP.logs, stage >= 1 ? 6 : Math.floor(k * 6.01));
    show(RP.ropes, stage >= 2 ? 4 : stage === 1 ? Math.floor(k * 4.01) : 0);
    RP.mast.visible = stage >= 3 || (stage === 2 && k > .3); RP.sail.visible = stage >= 3 || (stage === 2 && k > .75);
    show(RP.extra, stage >= 4 ? 3 : stage === 3 ? Math.floor(k * 3.01) : 0);
    raftGhost.visible = raftEdges.visible = stage < 1 && k < .2;
  }
  drawRaft(0, 0);

  /* ======================================================================
     Sharks: fins circling offshore (the body is a faint shadow under the water)
     ====================================================================== */
  const finGeo = (() => { const s = new THREE.Shape(); s.moveTo(-.55, 0); s.quadraticCurveTo(-.1, .5, .25, 1.05); s.quadraticCurveTo(.2, .45, .55, 0); s.lineTo(-.55, 0); const g = new THREE.ExtrudeGeometry(s, { depth:.12, bevelEnabled:true, bevelThickness:.04, bevelSize:.04, bevelSegments:1 }); g.translate(0, 0, -.06); g.rotateY(Math.PI / 2); return g; })();
  const SHARK_N = 5;
  const finMesh = new THREE.InstancedMesh(finGeo, new THREE.MeshLambertMaterial({ color:0x5f7c99, flatShading:true }), SHARK_N); finMesh.frustumCulled = false; root.add(finMesh);
  const sBody = (() => { const M = new Merge(); M.add(G.sph, 0, 0, 0, .75, .5, 2.2, 0, 0, 0, 0x3f5f80).add(G.cone, 0, 0, -2.4, .5, 1.2, .25, -Math.PI / 2, 0, 0, 0x3f5f80); return M.geometry(); })();
  const bodyMesh = new THREE.InstancedMesh(sBody, new THREE.MeshBasicMaterial({ vertexColors:true, transparent:true, opacity:.35, depthWrite:false }), SHARK_N); bodyMesh.frustumCulled = false; bodyMesh.renderOrder = 2; root.add(bodyMesh);
  const SHARKS = []; for(let i = 0; i < SHARK_N; i++) SHARKS.push({ r:rr(68, 92), w:(i % 2 ? 1 : -1) * rr(.045, .07), ph:i / SHARK_N * Math.PI * 2 + rr(-.3, .3), x:0, z:0, h:0, wob:rr(0, 6) });
  /* the circling path at world time t (same on every phone) */
  function sharkPath(i, t){ const s = SHARKS[i], a = s.ph + t * s.w, r = s.r + Math.sin(t * .3 + s.wob) * 6; return { x:Math.cos(a) * r, z:Math.sin(a) * r, h:Math.atan2(-Math.sin(a) * s.w, Math.cos(a) * s.w) }; }
  function drawSharks(time){
    SHARKS.forEach((s, i) => {
      const y = Math.sin(time * 1.3 + s.wob) * .08 + (s.dive ? -1.2 * s.dive : 0);
      _m.compose(_v.set(s.x, y - .05, s.z), _q.setFromEuler(_e.set(0, s.h, Math.sin(time * 2 + s.wob) * .06)), _s.set(1.6, 1.6, 1.6)); finMesh.setMatrixAt(i, _m);
      _m.compose(_v.set(s.x, -.7 + y, s.z), _q.setFromEuler(_e.set(0, s.h, 0)), _s.set(1.3, 1.3, 1.3)); bodyMesh.setMatrixAt(i, _m);
    });
    finMesh.instanceMatrix.needsUpdate = bodyMesh.instanceMatrix.needsUpdate = true;
  }

  /* ======================================================================
     The rescue ship on the horizon, birds
     ====================================================================== */
  const ship = new THREE.Group(); root.add(ship);
  {
    const M = new Merge(), NV = 0x2b4a8a, WH = 0xfdf8ee, RD = 0xe8454f, YL = 0xffc93d;
    M.add(G.box, 0, 1.5, 0, 7, 3, 22, 0, 0, 0, NV).add(G.cone4, 0, 1.5, 12.6, 4.95, 3.4, 3, Math.PI / 2, Math.PI / 4, 0, NV);
    M.add(G.box, 0, 3.2, 0, 7.05, .5, 22.05, 0, 0, 0, RD).add(G.box, 0, 3.6, 0, 7.1, .35, 22.1, 0, 0, 0, WH);
    M.add(G.box, 0, 5.2, -3, 5.4, 3, 9, 0, 0, 0, WH).add(G.box, 0, 7.3, -3.6, 4.2, 1.6, 5, 0, 0, 0, WH).add(G.box, 0, 8.3, -3.6, 4.4, .25, 5.2, 0, 0, 0, RD);
    for(let i = 0; i < 5; i++) for(const s of [-1, 1]) M.add(G.cyl, s * 2.72, 5.4, -6.2 + i * 1.6, .35, .1, .35, 0, 0, Math.PI / 2, 0x7fd3ff);
    M.add(G.cyl, 0, 9.6, -5.2, .9, 2.4, .9, 0, 0, 0, YL).add(G.cyl, 0, 10.9, -5.2, .95, .35, .95, 0, 0, 0, RD);
    M.add(G.cyl8, 0, 9.5, 4.5, .12, 8, .12, 0, 0, 0, 0x8a5a2e);
    for(const s of [-1, 1]) for(let i = 0; i < 3; i++) M.add(G.torus, s * 3.6, 2.4, -4 + i * 4, .55, .55, 1.2, 0, Math.PI / 2, 0, i % 2 ? RD : WH);
    const m = new THREE.Mesh(M.geometry(), MAT); ship.add(m);
    const flagTex = K.canvasTex(64, 40, (x, w, h) => { x.fillStyle = '#ffd23f'; x.fillRect(0, 0, w, h); x.font = '28px serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('⭐', 32, 21); });
    const flag = new THREE.Mesh(new THREE.PlaneGeometry(3, 1.9), new THREE.MeshLambertMaterial({ map:flagTex, side:THREE.DoubleSide })); flag.position.set(0, 12.6, 5.9); flag.rotation.y = Math.PI / 2; ship.add(flag); ship.userData.flag = flag;
  }
  ship.position.set(SHIP.x, 0, SHIP.z); ship.rotation.y = Math.atan2(-SHIP.x, -SHIP.z) + Math.PI / 2;
  const birdGeo = (() => { const M = new Merge(); M.add(G.box, -.45, 0, 0, .9, .05, .22, 0, 0, .35, 0xffffff).add(G.box, .45, 0, 0, .9, .05, .22, 0, 0, -.35, 0xffffff).add(G.sph, 0, -.05, 0, .12, .1, .25, 0, 0, 0, 0xf2f2f2); return M.geometry(); })();
  const BIRD_N = 7, birdMesh = new THREE.InstancedMesh(birdGeo, lam({ emissive:0x444444 }), BIRD_N), BIRDS = []; birdMesh.frustumCulled = false; root.add(birdMesh);
  for(let i = 0; i < BIRD_N; i++) BIRDS.push({ cx:rr(-30, 30), cz:rr(-30, 30), r:rr(25, 60), y:rr(16, 26), w:rr(.12, .22) * (i % 2 ? 1 : -1), ph:rr(0, 6.28) });

  /* ======================================================================
     Per-frame animation
     ====================================================================== */
  const dirty = { trees:true, berries:true, picks:true };
  function animate(dt, time, cx, cz){
    U.t.value = time;
    sky.position.set(cx, 0, cz); stars.position.set(cx, 0, cz);
    foam.material.opacity = .55 + Math.sin(time * 1.4) * .25; foam.scale.setScalar(1 + Math.sin(time * 1.4 + 1) * .006);
    streamTex.offset.y = -time * .45;
    CL.forEach((c, i) => { c.a += c.v * dt; _m.compose(_v.set(Math.cos(c.a) * c.r, c.y, Math.sin(c.a) * c.r), _q.setFromEuler(_e.set(0, c.ry - c.a, 0)), _s.set(c.s, c.s * .7, c.s)); clouds.setMatrixAt(i, _m); });
    clouds.instanceMatrix.needsUpdate = true;
    BIRDS.forEach((b, i) => { const a = b.ph + time * b.w, x = b.cx + Math.cos(a) * b.r, z = b.cz + Math.sin(a) * b.r, fl = Math.sin(time * 6 + i) * .35;
      _m.compose(_v.set(x, b.y + Math.sin(time + i) * 1.5, z), _q.setFromEuler(_e.set(0, -a + (b.w > 0 ? Math.PI : 0), fl * .3)), _s.set(1.4, 1.4 + fl, 1.4)); birdMesh.setMatrixAt(i, _m); });
    birdMesh.instanceMatrix.needsUpdate = true;
    if(fireGrp.visible){ flames.forEach((f, i) => { const k = 1 + Math.sin(time * 13 + i * 2) * .12 + Math.sin(time * 7.3) * .08; f.scale.set(1 / k, k, 1 / k); f.rotation.y = time * (i ? -2 : 1.5); }); fireGlow.material.opacity = .55 + Math.sin(time * 9) * .12; }
    ship.position.y = Math.sin(time * .7) * .25; ship.rotation.z = Math.sin(time * .5) * .02;
    if(ship.userData.flag) ship.userData.flag.rotation.x = Math.sin(time * 3) * .15;
    let needT = dirty.trees; for(const t of TREES) if(t.shake > 0){ t.shake = Math.max(0, t.shake - dt * 2.5); needT = true; }
    if(needT){ drawTrees(time); dirty.trees = false; }
    if(dirty.berries){ drawBerries(); dirty.berries = false; }
    let needP = dirty.picks; for(const p of PICKS) if(p.pop != null){ p.pop += dt * 3; if(p.pop >= 1) p.pop = null; needP = true; } if(PICKS.some(p => p.type === 'metal' && p.on)) needP = true;
    if(needP){ drawPicks(time); dirty.picks = false; }
    PALMS.forEach((p, i) => { for(let k = 0; k < 2; k++){ const s = k < p.nuts ? 1 : 0; nutPos(p, k); _m.compose(_v, _q.identity(), _s.set(s, s, s)); nutMesh.setMatrixAt(i * 2 + k, _m); } });
    nutMesh.instanceMatrix.needsUpdate = true;
  }
  /* day/night: k = 0 (noon) … 1 (midnight); sunDir follows the time of day */
  const DAY = { top:new THREE.Color('#3f95ec'), mid:new THREE.Color('#8cd0ff'), hor:new THREE.Color('#e9f8ff') },
    DUSK = { top:new THREE.Color('#5a6fd0'), mid:new THREE.Color('#f7a6b8'), hor:new THREE.Color('#ffd39a') },
    NIGHT = { top:new THREE.Color('#13204a'), mid:new THREE.Color('#2b3f7a'), hor:new THREE.Color('#4a5f9a') };
  function setSky(night, dusk){
    for(const k of ['top', 'mid', 'hor']){ SKYU[k].value.copy(DAY[k]).lerp(DUSK[k], dusk).lerp(NIGHT[k], night); }
    stars.material.opacity = sstep(.35, .9, night); moon.material.opacity = sstep(.3, .8, night); sunG.material.opacity = 1 - sstep(.2, .6, night);
    cloudMat.emissiveIntensity = .5 - night * .38;
    fireLight.intensity = fireGrp.visible ? 3 * sstep(.2, .8, night) : 0;
    return SKYU.hor.value;
  }
  return { root, terr, waterAt, distN, EDGE, shoreAt, polar, circlesNear, CIRC, TREES, PALMS, BUSHES, PICKS, CRATE_SPOTS, CRATE_MAX, ROCKS, SHARKS, sharkPath, drawSharks,
    PLANE, PLANE_REST, RAFT, CAMP, FIRE, TENT, SPAWN, SHIP, POND, FOREST, HILL, plane, makePlane, raft, drawRaft, drawCrates, ship, sea, sunG, moon, stars,
    fireGrp, tentGrp, fireGhost, tentGhost, fireCirc, tentCirc, nutPos, setSky, animate, dirty, streamNear };
}
