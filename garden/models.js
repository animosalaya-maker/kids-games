/* Bobo Garden («جنينة بوبو 🌻»): 3D models — 10 original low-poly plants with 5 growth stages (sprout → small →
   bushy → flowering → ripe), fruit in three looks (normal / golden / crystal), the cheeky crow, the scarecrow,
   the watering can and the sprinkler. Everything is simple shapes with vertex colours (one shared material),
   so it stays light on phones. makeGardenModels(THREE, K) where K = makeKit(THREE) from ../worlds/kit.js. */
export function makeGardenModels(THREE, K){
  const { Merge, G } = K;
  const L = window.L || (a => a);
  const MAT = new THREE.MeshStandardMaterial({ vertexColors:true, roughness:.68, metalness:0 });
  const GOLD = new THREE.MeshStandardMaterial({ color:0xffc533, roughness:.22, metalness:.65, emissive:0x6a4200, emissiveIntensity:.35 });
  const CRYSTAL = new THREE.MeshStandardMaterial({ color:0x9fe9ff, roughness:.04, metalness:.15, emissive:0x3d8fb8, emissiveIntensity:.45, transparent:true, opacity:.82 });
  const FRUIT_MAT = [MAT, GOLD, CRYSTAL];
  const LEAF = 0x5fbf4a, LEAF2 = 0x4caa3e, LEAF3 = 0x7bd35c, WOOD = 0x9a6b3c;

  /* ---------- the plants (prices in «قروش البستان», times in seconds of watered growing) ---------- */
  const PLANTS = {
    carrot:    { e:'🥕', name:L('جزر', 'Carrot', 'Havuç'),           seed:5,   grow:45,  yield:3, sell:3,   regrow:0,   col:0xff8a1f },
    tomato:    { e:'🍅', name:L('بندورة', 'Tomato', 'Domates'),      seed:12,  grow:90,  yield:4, sell:4,   regrow:60,  col:0xe8402f },
    strawberry:{ e:'🍓', name:L('فراولة', 'Strawberry', 'Çilek'),    seed:18,  grow:80,  yield:4, sell:5,   regrow:55,  col:0xff3d5a },
    sunflower: { e:'🌻', name:L('دوّار الشمس', 'Sunflower', 'Ayçiçeği'), seed:25, grow:120, yield:1, sell:40, regrow:0, col:0xffc928 },
    corn:      { e:'🌽', name:L('ذرة', 'Corn', 'Mısır'),             seed:30,  grow:150, yield:3, sell:14,  regrow:100, col:0xffd93d },
    blueberry: { e:'🫐', name:L('توت أزرق', 'Blueberry', 'Yaban mersini'), seed:45, grow:170, yield:6, sell:9, regrow:110, col:0x4a5fd8 },
    pumpkin:   { e:'🎃', name:L('يقطين', 'Pumpkin', 'Balkabağı'),     seed:70,  grow:240, yield:1, sell:130, regrow:0,   col:0xff8c1a },
    watermelon:{ e:'🍉', name:L('بطيخ', 'Watermelon', 'Karpuz'),      seed:110, grow:300, yield:1, sell:210, regrow:0,   col:0x3fae4a },
    cactus:    { e:'🌵', name:L('صبّار', 'Cactus', 'Kaktüs'),         seed:160, grow:360, yield:3, sell:90,  regrow:0,   col:0xff6fae },
    apple:     { e:'🍎', name:L('شجرة تفاح', 'Apple tree', 'Elma ağacı'), seed:250, grow:600, yield:6, sell:60, regrow:240, col:0xe8302f }
  };
  const PLANT_IDS = Object.keys(PLANTS);
  const VARIANTS = [
    { id:'n', name:'', mul:1, tag:'' },
    { id:'g', name:L('ذهبي', 'Golden', 'Altın'), mul:5, tag:'✨', col:'#ffcd4d' },
    { id:'c', name:L('كريستال', 'Crystal', 'Kristal'), mul:12, tag:'💎', col:'#9fe9ff' }
  ];

  const SK = [.32, .52, .75, .92, 1];          // size of each stage
  function sprout(M, k = 1){
    M.add(G.cyl8, 0, .06 * k, 0, .018 * k, .12 * k, .018 * k, 0, 0, 0, LEAF2);
    M.add(G.sm, -.06 * k, .13 * k, 0, .07 * k, .022 * k, .04 * k, 0, 0, .45, LEAF3);
    M.add(G.sm, .06 * k, .13 * k, 0, .07 * k, .022 * k, .04 * k, 0, 0, -.45, LEAF3);
  }
  const blossom = (M, x, y, z, s = 1, col = 0xffffff) => { for(let i = 0; i < 5; i++){ const a = i / 5 * 6.283; M.add(G.sm, x + Math.cos(a) * .035 * s, y, z + Math.sin(a) * .035 * s, .03 * s, .015 * s, .03 * s, 0, 0, 0, col); } M.add(G.sm, x, y + .008, z, .02 * s, .015 * s, .02 * s, 0, 0, 0, 0xffd23f); };
  const ring = (n, r, a0 = 0) => Array.from({ length:n }, (_, i) => { const a = a0 + i / n * Math.PI * 2; return [Math.cos(a) * r, Math.sin(a) * r, a]; });

  /* each builder fills the foliage (F) and, when ripe, the fruit (R); st = 1..4 */
  const BUILD = {
    carrot(F, R, st, k){
      const pos = [[-.24, .02], [.22, .14], [.02, -.22]];
      for(const [x, z] of pos){
        for(let i = 0; i < 4; i++){ const a = i * 1.57 + x * 3, t = .35; F.add(G.cyl8, x + Math.cos(a) * .04 * k, .2 * k, z + Math.sin(a) * .04 * k, .014, .42 * k, .014, Math.sin(a) * t, 0, -Math.cos(a) * t, LEAF2);
          F.add(G.ico, x + Math.cos(a) * .12 * k, .4 * k, z + Math.sin(a) * .12 * k, .07 * k, .05 * k, .07 * k, 0, a, 0, LEAF3); }
        F.add(G.ico, x, .46 * k, z, .08 * k, .06 * k, .08 * k, 0, 0, 0, LEAF);
        if(st === 3) blossom(F, x, .52 * k, z, 1.3);
        if(st === 4 && R){ R.add(G.cone, x, .09, z, .11, .34, .11, Math.PI, 0, 0, 0xff8a1f); R.add(G.cyl8, x, .25, z, .1, .03, .1, 0, 0, 0, 0xff9a3a); }
      }
    },
    tomato(F, R, st, k){
      F.add(G.cyl8, .2, .55 * k, -.12, .03, 1.1 * k, .03, 0, 0, 0, WOOD);
      for(const [x, y, z, r] of [[0, .3, 0, .24], [.12, .52, .05, .22], [-.13, .5, -.04, .21], [0, .72, -.02, .19], [.05, .45, -.16, .18]]) F.add(G.ico1, x * k, y * k, z * k, r * k, r * k * .9, r * k, 0, x * 9, 0, x > 0 ? LEAF : LEAF2);
      if(st === 3) for(const [x, y, z] of [[.2, .5, .12], [-.2, .62, .08], [.05, .78, .17]]) blossom(F, x, y, z, 1.2, 0xffe14d);
      if(st === 4 && R) for(const [x, y, z] of [[.22, .42, .14], [-.22, .55, .1], [.06, .75, .2], [-.08, .32, .23], [.24, .66, -.06]]){ R.add(G.sph, x, y, z, .095, .085, .095, 0, 0, 0, 0xe8402f); R.add(G.cone4, x, y + .085, z, .045, .04, .045, 0, 0, 0, 0x3f9e3a); }
    },
    strawberry(F, R, st, k){
      for(const [x, z, a] of ring(7, .16 * k, .3)) F.add(G.sm, x, .1 * k + .04, z, .17 * k, .05, .11 * k, 0, -a, .2, LEAF);
      F.add(G.sm, 0, .16 * k, 0, .12 * k, .08 * k, .12 * k, 0, 0, 0, LEAF2);
      if(st === 3) for(const [x, z] of ring(4, .26, .8)) blossom(F, x, .17, z, 1.3);
      if(st === 4 && R) for(const [x, z] of ring(5, .3, .5)){ R.add(G.cone, x, .1, z, .075, .15, .075, Math.PI, 0, 0, 0xff3d5a); R.add(G.sm, x, .18, z, .07, .025, .07, 0, 0, 0, 0x4caa3e); }
    },
    sunflower(F, R, st, k){
      const h = 1.55 * k;
      F.add(G.cyl8, 0, h / 2, 0, .04, h, .04, 0, 0, 0, LEAF2);
      for(const [y, s] of [[.35, 1], [.65, -1], [.9, 1]]) if(y * 1.55 < h) F.add(G.sm, s * .17, y * h, 0, .2 * k, .03, .1 * k, 0, 0, s * -.4, LEAF);
      if(st === 3) F.add(G.sph, 0, h + .05, 0, .12, .12, .12, 0, 0, 0, LEAF3);
      if(st === 4 && R){
        const y = h + .08, tilt = -.35;
        R.add(G.cyl, 0, y, .02, .19, .07, .19, Math.PI / 2 + tilt, 0, 0, 0x7a4a24);
        for(const [x, yy, a] of ring(13, .27)) R.add(G.sm, x, y + yy * Math.cos(tilt), .02 - yy * Math.sin(tilt) * .5, .1, .055, .025, tilt, 0, a, 0xffc928);
      }
    },
    corn(F, R, st, k){
      for(const [x, z, i] of [[-.2, -.08, 0], [.18, -.16, 1], [0, .18, 2]]){
        const h = 1.6 * k * (1 - i * .08);
        F.add(G.cyl8, x, h / 2, z, .035, h, .035, 0, 0, 0, LEAF2);
        for(let j = 0; j < 3; j++){ const a = j * 2.1 + i, y = h * (.3 + j * .2); F.add(G.box, x + Math.cos(a) * .12, y + .1, z + Math.sin(a) * .12, .03, .55 * k, .09, Math.sin(a) * .6, 0, -Math.cos(a) * .6, j % 2 ? LEAF : LEAF3); }
        if(st >= 3) for(let j = 0; j < 4; j++) F.add(G.cone, x + Math.cos(j * 1.57) * .04, h + .06, z + Math.sin(j * 1.57) * .04, .02, .16, .02, Math.sin(j * 1.57) * .5, 0, -Math.cos(j * 1.57) * .5, 0xe8d27a);
        if(st === 4 && R){ const y = h * .55, a = i * 2 + .6, ox = Math.cos(a) * .09, oz = Math.sin(a) * .09 + .05;
          R.add(G.cyl8, x + ox, y, z + oz, .065, .28, .065, Math.sin(a) * .35, 0, -Math.cos(a) * .35, 0xffd93d); R.add(G.sm, x + ox, y + .14, z + oz, .066, .05, .066, 0, 0, 0, 0xffe36b);
          R.add(G.cone, x + ox * 1.1, y - .02, z + oz * 1.1, .06, .3, .03, Math.sin(a) * .35, a, -Math.cos(a) * .35, 0x7bd35c); }
      }
    },
    blueberry(F, R, st, k){
      for(const [x, y, z, r] of [[0, .26, 0, .26], [.17, .3, .1, .2], [-.18, .28, .05, .21], [.05, .45, -.08, .2], [-.05, .22, -.2, .18], [.12, .2, -.17, .17]]) F.add(G.ico1, x * k, y * k, z * k, r * k, r * k * .85, r * k, 0, x * 7, 0, x > 0 ? 0x4f9e48 : 0x3f8e3e);
      if(st === 3) for(const [x, y, z] of [[.22, .35, .18], [-.22, .4, .12], [.02, .55, .1], [.2, .3, -.2]]) blossom(F, x, y, z, 1, 0xffeef4);
      if(st === 4 && R) for(const [x, y, z] of [[.24, .34, .16], [-.24, .36, .13], [.04, .55, .14], [.22, .28, -.2], [-.18, .25, -.22], [0, .3, .3]]) for(const [dx, dy, dz] of [[0, 0, 0], [.06, -.03, .02], [-.04, -.05, .04]]) R.add(G.sm, x + dx, y + dy, z + dz, .052, .05, .052, 0, 0, 0, 0x4a5fd8);
    },
    pumpkin(F, R, st, k){
      for(const [x, z, a] of ring(5, .38 * k, .4)){ F.add(G.sm, x, .1, z, .22 * k, .04, .2 * k, .1, -a, 0, a % 2 > 1 ? LEAF : LEAF2); }
      F.add(G.torus, .2 * k, .06, .25 * k, .12 * k, .12 * k, .25, Math.PI / 2, 0, 0, LEAF2);
      if(st === 3) for(const [x, z] of ring(3, .3, 1)) F.add(G.cone, x, .18, z, .07, .12, .07, Math.PI, 0, 0, 0xffc928);
      if(st === 4 && R){
        for(const [x, z, a] of ring(7, .12)) R.add(G.sph, x, .27, z, .2, .22, .2, 0, -a, 0, 0xff8c1a);
        R.add(G.sph, 0, .27, 0, .22, .24, .22, 0, 0, 0, 0xff9a2e);
        R.add(G.cyl8, 0, .52, 0, .035, .12, .035, .2, 0, .2, 0x6a8a2a);
      }
    },
    watermelon(F, R, st, k){
      for(const [x, z, a] of ring(6, .4 * k, .1)) F.add(G.sm, x, .09, z, .2 * k, .04, .18 * k, .1, -a, 0, a % 2 > 1 ? LEAF2 : LEAF);
      F.add(G.torus, -.22 * k, .06, .22 * k, .1 * k, .1 * k, .25, Math.PI / 2, 0, 0, LEAF2);
      if(st === 3) for(const [x, z] of ring(3, .32, .5)) F.add(G.cone, x, .18, z, .06, .1, .06, Math.PI, 0, 0, 0xffe14d);
      if(st === 4 && R){ R.add(G.sph, 0, .27, 0, .42, .28, .3, 0, .5, 0, 0x3f9e4a); R.add(G.sph, 0, .3, 0, .38, .26, .27, 0, .5, 0, 0x4fb85a); R.add(G.cyl8, -.32, .4, -.19, .025, .1, .025, .3, 0, .6, 0x6a8a2a); }
    },
    cactus(F, R, st, k){
      const h = .85 * k;
      F.add(G.cyl, 0, h / 2, 0, .15, h, .15, 0, 0, 0, 0x5fae5a); F.add(G.sph, 0, h, 0, .15, .13, .15, 0, 0, 0, 0x5fae5a);
      for(let i = 0; i < 6; i++){ const a = i / 6 * 6.283; F.add(G.box, Math.cos(a) * .148, h / 2, Math.sin(a) * .148, .02, h * .9, .02, 0, -a, 0, 0x4f9a4a); }
      if(st >= 2){ for(const s of [-1, 1]){ const y = h * (s > 0 ? .45 : .6);
        F.add(G.cyl, s * .2, y, 0, .07, .06, .07, 0, 0, Math.PI / 2, 0x5fae5a); F.add(G.cyl, s * .27, y + .14, 0, .075, .3 * k + .02, .075, 0, 0, 0, 0x5fae5a); F.add(G.sph, s * .27, y + .14 + .15 * k + .01, 0, .075, .06, .075, 0, 0, 0, 0x5fae5a); } }
      for(let i = 0; i < 10; i++){ const a = i * 2.4, y = .12 + (i * .37 % 1) * h * .85; F.add(G.sm, Math.cos(a) * .15, y, Math.sin(a) * .15, .018, .018, .018, 0, 0, 0, 0xfff6d8); }
      if(st === 3) for(const [x, z] of ring(3, .08)) F.add(G.sm, x, h + .1, z, .04, .05, .04, 0, 0, 0, 0xff9fca);
      if(st === 4 && R) for(const [x, z] of ring(3, .1, .5)){ R.add(G.sph, x, h + .12, z, .07, .095, .07, 0, 0, 0, 0xff6fae); R.add(G.sm, x, h + .21, z, .03, .02, .03, 0, 0, 0, 0xd94a8a); }
    },
    apple(F, R, st, k){
      const th = .95 * k;
      F.add(G.cyl8, 0, th / 2, 0, .07 * k + .02, th, .09 * k + .02, 0, 0, 0, WOOD);
      if(st >= 2) for(const s of [-1, 1]) F.add(G.cyl8, s * .12 * k, th * .85, 0, .03, .35 * k, .03, 0, 0, -s * .7, WOOD);
      const cy = th + .32 * k;
      for(const [x, y, z, r] of [[0, 0, 0, .5], [.3, -.08, .12, .34], [-.3, -.05, .08, .36], [.05, .25, -.05, .34], [0, -.08, -.28, .32]]) F.add(G.ico1, x * k, cy + y * k, z * k, r * k, r * k * .9, r * k, 0, x * 5, 0, y > .1 ? LEAF3 : x > 0 ? LEAF : LEAF2);
      if(st === 3) for(const [x, y, z] of [[.4, .05, .3], [-.42, .1, .25], [.1, .32, .38], [.35, .3, -.2], [-.3, -.1, .42], [0, .5, .05]]) blossom(F, x, cy + y, z, 1.5, 0xffe1ec);
      if(st === 4 && R) for(const [x, y, z] of [[.42, .02, .3], [-.44, .08, .24], [.1, .3, .42], [.38, .32, -.18], [-.28, -.12, .44], [-.12, .5, .2]]){ R.add(G.sph, x, cy + y, z, .09, .085, .09, 0, 0, 0, 0xe8302f); R.add(G.cyl8, x, cy + y + .09, z, .01, .05, .01, 0, 0, 0, 0x6a4a2a); }
    }
  };
  /* geometry cache: foliage per (type, stage); fruit per type */
  const cache = new Map();
  function plantGeo(type, st){
    const key = type + st; if(cache.has(key)) return cache.get(key);
    const F = new Merge(), R = st === 4 ? new Merge() : null;
    if(st === 0) sprout(F, 1.2); else BUILD[type](F, R, st, SK[st]);
    const out = { fol:F.geometry(), fruit:R && !R.empty ? R.geometry() : null };
    cache.set(key, out); return out;
  }
  /* height of the plant at each stage (for icons above it) */
  const HEIGHT = { carrot:.6, tomato:1, strawberry:.35, sunflower:1.8, corn:1.75, blueberry:.65, pumpkin:.6, watermelon:.6, cactus:1.05, apple:1.75 };
  const plantH = (type, st) => st === 0 ? .25 : (HEIGHT[type] || .8) * SK[st];

  /* a fruit to throw around (harvest pop), small and centred */
  const fruitGeoCache = {};
  function fruitGeo(type){
    if(fruitGeoCache[type]) return fruitGeoCache[type];
    const M = new Merge(), c = PLANTS[type].col;
    if(type === 'carrot'){ M.add(G.cone, 0, 0, 0, .1, .32, .1, Math.PI, 0, 0, c); M.add(G.cone, 0, .2, 0, .06, .12, .06, 0, 0, 0, LEAF); }
    else if(type === 'corn'){ M.add(G.cyl8, 0, 0, 0, .07, .28, .07, 0, 0, 0, c); M.add(G.cone, 0, -.02, .04, .06, .3, .03, 0, 0, 0, LEAF3); }
    else if(type === 'strawberry'){ M.add(G.cone, 0, 0, 0, .09, .18, .09, Math.PI, 0, 0, c); M.add(G.sm, 0, .09, 0, .08, .03, .08, 0, 0, 0, LEAF2); }
    else if(type === 'sunflower'){ M.add(G.cyl, 0, 0, 0, .12, .05, .12, Math.PI / 2, 0, 0, 0x7a4a24); for(const [x, y, a] of ring(10, .17)) M.add(G.sm, x, y, 0, .06, .035, .02, 0, 0, a, c); }
    else if(type === 'pumpkin' || type === 'watermelon'){ M.add(G.sph, 0, 0, 0, .2, .17, .17, 0, 0, 0, c); M.add(G.cyl8, 0, .17, 0, .02, .07, .02, 0, 0, 0, 0x6a8a2a); }
    else if(type === 'blueberry'){ for(const [x, y] of [[0, 0], [.07, .02], [-.05, .05], [.02, .08]]) M.add(G.sm, x, y, 0, .06, .06, .06, 0, 0, 0, c); }
    else { M.add(G.sph, 0, 0, 0, .1, .1, .1, 0, 0, 0, c); M.add(G.cyl8, 0, .1, 0, .012, .05, .012, 0, 0, 0, 0x6a4a2a); }
    return (fruitGeoCache[type] = M.geometry());
  }

  /* ---------- the cheeky crow (round, big eyes, orange beak: funny, not scary) ---------- */
  function buildCrow(){
    const grp = new THREE.Group(), M = new Merge();
    M.add(G.sph, 0, .3, 0, .22, .2, .27, 0, 0, 0, 0x3d4466);
    M.add(G.sph, 0, .52, .14, .16, .16, .16, 0, 0, 0, 0x3d4466);
    M.add(G.sph, 0, .27, .06, .15, .14, .18, 0, 0, 0, 0x6a7398);
    for(const s of [-1, 1]){ M.add(G.sph, s * .07, .57, .26, .055, .065, .04, 0, 0, 0, 0xffffff); M.add(G.sph, s * .07, .565, .295, .028, .035, .02, 0, 0, 0, 0x1a1a24); }
    M.add(G.cone, 0, .5, .34, .05, .14, .05, Math.PI / 2, 0, 0, 0xffa53a);
    M.add(G.cone, 0, .3, -.32, .12, .2, .04, -Math.PI / 2 - .4, 0, 0, 0x2f3656);
    for(const s of [-1, 1]) M.add(G.cyl8, s * .07, .07, .02, .015, .14, .015, 0, 0, 0, 0xffa53a);
    M.add(G.sm, 0, .69, .12, .04, .06, .04, -.4, 0, 0, 0x2f3656);
    const body = new THREE.Mesh(M.geometry(), MAT); body.castShadow = true; grp.add(body);
    const wings = [];
    for(const s of [-1, 1]){
      const p = new THREE.Group(); p.position.set(s * .2, .36, 0); grp.add(p);
      const W = new Merge(); W.add(G.sph, s * .14, 0, -.02, .16, .04, .14, 0, 0, 0, 0x2f3656);
      const w = new THREE.Mesh(W.geometry(), MAT); w.castShadow = true; p.add(w); wings.push(p);
    }
    return { grp, body, wings };
  }
  /* ---------- the scarecrow (straw hat, button eyes, big smile) ---------- */
  function scarecrowGeo(){
    const M = new Merge();
    M.add(G.cyl8, 0, .8, 0, .05, 1.6, .05, 0, 0, 0, WOOD); M.add(G.box, 0, 1.15, 0, 1.3, .07, .07, 0, 0, 0, WOOD);
    M.add(G.box, 0, 1.0, 0, .5, .55, .28, 0, 0, 0, 0x5aa0e0); M.add(G.box, 0, .72, 0, .52, .1, .3, 0, 0, 0, 0xc98a52);
    for(const s of [-1, 1]){ M.add(G.box, s * .45, 1.13, 0, .45, .16, .16, 0, 0, 0, 0x5aa0e0); M.add(G.cone, s * .72, 1.13, 0, .07, .16, .07, 0, 0, s * Math.PI / 2, 0xf2d27a); }
    M.add(G.sph, 0, 1.5, 0, .22, .22, .22, 0, 0, 0, 0xf5deb0);
    for(const s of [-1, 1]) M.add(G.sph, s * .08, 1.54, .19, .035, .035, .02, 0, 0, 0, 0x2a1a10);
    M.add(G.torus, 0, 1.46, .19, .08, .08, .3, 0, 0, Math.PI, 0xc0392b);
    M.add(G.sm, -.15, 1.46, .17, .04, .025, .02, 0, 0, 0, 0xff9a9a); M.add(G.sm, .15, 1.46, .17, .04, .025, .02, 0, 0, 0, 0xff9a9a);
    M.add(G.cyl, 0, 1.68, 0, .38, .04, .38, 0, 0, 0, 0xf2d27a); M.add(G.cyl, 0, 1.78, 0, .17, .2, .19, 0, 0, 0, 0xf2d27a); M.add(G.cyl, 0, 1.72, 0, .19, .05, .2, 0, 0, 0, 0xe8304f);
    return M.geometry();
  }
  /* ---------- the watering can (held by your character while watering) ---------- */
  function canGeo(col = 0x6cc4ff){
    const M = new Merge();
    M.add(G.cyl, 0, 0, 0, .14, .22, .12, 0, 0, 0, col); M.add(G.cyl, 0, .11, 0, .145, .025, .145, 0, 0, 0, 0xffffff);
    M.add(G.cyl8, 0, .03, .2, .025, .32, .025, -1.0, 0, 0, col); M.add(G.cyl8, 0, .12, .33, .05, .04, .05, -1.0, 0, 0, col);
    M.add(G.torus, 0, .14, -.05, .1, .1, .25, 0, Math.PI / 2, 0, 0xffffff);
    return M.geometry();
  }
  function sprinklerGeo(){
    const M = new Merge();
    M.add(G.cyl8, 0, .35, 0, .04, .7, .04, 0, 0, 0, 0x8a96a8); M.add(G.cyl, 0, .74, 0, .1, .1, .1, 0, 0, 0, 0x6cc4ff);
    M.add(G.cyl8, 0, .82, 0, .02, .12, .02, 0, 0, Math.PI / 2, 0x8a96a8); M.add(G.cyl, 0, .02, 0, .16, .04, .16, 0, 0, 0, 0x8a96a8);
    return M.geometry();
  }
  return { MAT, GOLD, CRYSTAL, FRUIT_MAT, PLANTS, PLANT_IDS, VARIANTS, plantGeo, plantH, fruitGeo, buildCrow, scarecrowGeo, canGeo, sprinklerGeo };
}
