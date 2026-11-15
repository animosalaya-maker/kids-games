/* Bobo Bees («نحلات بوبو 🐝»): 3D models and data — 10 original cute bee types, 6 kinds of field flowers,
   the hive with its honeycomb slots, the honey shop, Pando the panda, a friendly ladybug and snail,
   the collecting tools, eggs, and 2D bee portraits for the cards.
   Everything is simple shapes with vertex colours (one shared material) so it stays light on phones.
   Bees are drawn white/grey and tinted per instance, so each bee is one colour (stripes are a darker shade of it).
   makeBeeModels(THREE, K) where K = makeKit(THREE) from ../worlds/kit.js. */
export function makeBeeModels(THREE, K){
  const { Merge, G } = K;
  const L = window.L || (a => a);
  const MAT = new THREE.MeshStandardMaterial({ vertexColors:true, roughness:.62, metalness:0 });
  const GOLD = new THREE.MeshStandardMaterial({ color:0xffc533, roughness:.25, metalness:.6, emissive:0x6a4200, emissiveIntensity:.3 });
  const _c = new THREE.Color();
  const shade = (hex, k) => { _c.set(hex); _c.r = Math.min(1, _c.r * k); _c.g = Math.min(1, _c.g * k); _c.b = Math.min(1, _c.b * k); return _c.getHex(); };
  const hexCss = h => '#' + h.toString(16).padStart(6, '0');
  /* low-poly shapes for things drawn hundreds of times (field flowers, bees) */
  const LG = {
    sm:new THREE.SphereGeometry(1, 6, 4), sph:new THREE.SphereGeometry(1, 8, 6), ico:new THREE.IcosahedronGeometry(1, 0),
    cyl:new THREE.CylinderGeometry(1, 1, 1, 8), cyl8:new THREE.CylinderGeometry(1, 1, 1, 5), disc:new THREE.CylinderGeometry(1, 1, 1, 10),
    cone:new THREE.ConeGeometry(1, 1, 6), cone4:G.cone4, hemi:new THREE.SphereGeometry(1, 8, 3, 0, Math.PI * 2, 0, Math.PI / 2),
    ring:new THREE.CylinderGeometry(1, 1, 1, 12, 1, true), body:new THREE.SphereGeometry(1, 12, 9), torus:new THREE.TorusGeometry(1, .2, 4, 8, Math.PI)
  };

  /* ---------- the 10 bee types ---------- */
  const RAR = [
    { id:'c', name:L('عادية', 'Common', 'Sıradan'), col:'#7fd492' },
    { id:'u', name:L('مميّزة', 'Special', 'Özel'), col:'#6cc0ff' },
    { id:'r', name:L('نادرة', 'Rare', 'Nadir'), col:'#c49bff' },
    { id:'l', name:L('أسطورية', 'Legendary', 'Efsanevi'), col:'#ffcd4d' }
  ];
  const BEES = [
    { id:'sunny',  col:0xffc93c, rar:0, pow:4, spd:1,   gt:1.6, fav:['sun'], favMul:1.5,
      name:L('شمسة', 'Sunny', 'Güneş'), info:L('نحلة شاطرة، بتحب دوّار الشمس 🌻', 'A hard worker who loves sunflowers 🌻', 'Çalışkan, ayçiçeklerini sever 🌻') },
    { id:'snow',   col:0xf2f5ff, rar:0, pow:4, spd:1,   gt:1.6, fav:['clover', 'daisy'], favMul:2,
      name:L('ثلجة', 'Snowy', 'Karlı'), info:L('بتجمع ضعف من البرسيم والأقحوان ☘️🌼', 'Double pollen from clover and daisies ☘️🌼', 'Yonca ve papatyadan iki kat polen ☘️🌼') },
    { id:'cherry', col:0xff5a6e, rar:0, pow:4, spd:1,   gt:1.6, fav:['rose', 'pine'], favMul:2,
      name:L('كرزة', 'Cherry', 'Kiraz'), info:L('بتجمع ضعف من الورد والفطر 🌹🍄', 'Double pollen from roses and mushrooms 🌹🍄', 'Gül ve mantardan iki kat polen 🌹🍄') },
    { id:'sky',    col:0x5fb6ff, rar:0, pow:4, spd:1,   gt:1.6, fav:['blue'], favMul:2.5,
      name:L('سماوية', 'Skye', 'Maviş'), info:L('بتحب الزهر الأزرق كتير 💙', 'Loves the blue flowers a lot 💙', 'Mavi çiçekleri çok sever 💙') },
    { id:'zoom',   col:0xff9ad5, rar:1, pow:3, spd:2,   gt:.9,  acc:'goggles',
      name:L('زوزو', 'Zoomy', 'Vızır'), info:L('بتطير بسرعة الضعف 💨', 'Flies twice as fast 💨', 'İki kat hızlı uçar 💨') },
    { id:'honey',  col:0xffa043, rar:1, pow:4, spd:1,   gt:1.6, honey:.1,
      name:L('عسّولة', 'Honeybun', 'Ballı'), info:L('بتزيد العسل لما تعمل عسل 🍯', 'Makes more honey at the hive 🍯', 'Kovanda daha çok bal yapar 🍯') },
    { id:'mint',   col:0x5ed6a0, rar:1, pow:4, spd:1,   gt:2.1, two:true, acc:'leaf',
      name:L('نعنوعة', 'Minty', 'Nane'), info:L('بتجمع من زهرتين بنفس الوقت 🌸🌸', 'Collects from two flowers at once 🌸🌸', 'Aynı anda iki çiçekten toplar 🌸🌸') },
    { id:'cookie', col:0xc68a5a, rar:2, pow:4, spd:1.1, gt:1.5, treat:.14,
      name:L('كعكة', 'Cookie', 'Kurabiye'), info:L('أحياناً بتلاقي حلوى للنحلات 🍬', 'Sometimes finds bee treats 🍬', 'Bazen arı şekeri bulur 🍬') },
    { id:'sleepy', col:0xb69cff, rar:2, pow:12, spd:.6, gt:2.3, nap:.25, size:1.35, acc:'cap',
      name:L('نعسان', 'Sleepy', 'Uykucu'), info:L('بيغفى شوي، بس بيحمل كتير! 😴', 'Naps a bit, but carries a lot! 😴', 'Biraz uyur ama çok taşır! 😴') },
    { id:'star',   col:0xffd23f, rar:3, pow:9, spd:1.5, gt:1.2, star:true, size:1.12, acc:'crown',
      name:L('نجمة', 'Starry', 'Yıldız'), info:L('أقوى نحلة! بتلمع وبتجمع كتير ⭐', 'The strongest bee! Sparkles and collects a lot ⭐', 'En güçlü arı! Parlar ve çok toplar ⭐') }
  ];
  const BEE_IDS = BEES.map(b => b.id);
  BEES.forEach((b, i) => { b.i = i; b.css = hexCss(b.col); b.size = b.size || 1; });

  /* ---------- one bee (faces +z, about .5 long before scaling) ---------- */
  // body: tinted by the instance colour (white parts → bee colour, grey parts → darker shade of the same colour)
  const bodyGeo = (() => {
    const M = new Merge();
    M.add(LG.body, 0, 0, 0, .22, .2, .25, 0, 0, 0, 0xffffff);
    // two soft stripes (a darker shade of the same colour) around the back half
    M.add(LG.ring, 0, 0, -.06, .214, .05, .196, Math.PI / 2, 0, 0, 0x6a6a6a);
    M.add(LG.ring, 0, 0, -.15, .178, .045, .162, Math.PI / 2, 0, 0, 0x6a6a6a);
    M.add(LG.sm, 0, -.01, -.245, .05, .05, .04, 0, 0, 0, 0x6a6a6a);          // a round little tail (no stinger)
    // antennae with little balls
    for(const s of [-1, 1]){
      M.add(LG.cyl8, s * .06, .22, .14, .012, .14, .012, -.5, 0, s * -.35, 0x5a5a5a);
      M.add(LG.ico, s * .095, .28, .19, .035, .035, .035, 0, 0, 0, 0x5a5a5a);
    }
    // tiny feet
    for(const s of [-1, 1]) for(const z of [.06, -.06]) M.add(LG.sm, s * .09, -.19, z, .03, .03, .04, 0, 0, 0, 0x707070);
    return M.geometry();
  })();
  // face: eyes, sparkles, cheeks, smile (not tinted)
  const faceGeo = (() => {
    const M = new Merge();
    for(const s of [-1, 1]){
      M.add(LG.sph, s * .075, .045, .2, .045, .055, .035, 0, 0, 0, 0x1d1410);
      M.add(LG.ico, s * .062, .07, .228, .016, .016, .01, 0, 0, 0, 0xffffff);
      M.add(LG.ico, s * .125, -.025, .18, .04, .026, .02, 0, s * .5, 0, 0xff8fa8);
    }
    M.add(LG.torus, 0, -.02, .232, .026, .026, .02, 0, 0, Math.PI, 0x1d1410);
    return M.geometry();
  })();
  const wingGeo = (() => { const g = new THREE.CircleGeometry(.16, 14); g.scale(1, .62, 1); g.translate(.15, 0, 0); g.rotateX(-Math.PI / 2); return g; })();
  const ACC = {
    crown:(() => { const M = new Merge(); M.add(G.cyl, 0, .24, .02, .09, .05, .09, 0, 0, 0, 0xffc533); for(let i = 0; i < 5; i++){ const a = i / 5 * Math.PI * 2; M.add(G.cone, Math.cos(a) * .075, .29, .02 + Math.sin(a) * .075, .028, .07, .028, 0, 0, 0, 0xffc533); } M.add(G.sm, 0, .25, .11, .022, .022, .014, 0, 0, 0, 0xff5a8a); return M.geometry(); })(),
    cap:(() => { const M = new Merge(); M.add(G.cone, .03, .27, -.04, .13, .22, .13, -.5, 0, -.45, 0x8e6fe0); M.add(G.cyl, 0, .2, -.01, .14, .04, .14, -.2, 0, 0, 0xf4efff); M.add(G.sm, .14, .3, -.13, .04, .04, .04, 0, 0, 0, 0xf4efff); return M.geometry(); })(),
    goggles:(() => { const M = new Merge(); for(const s of [-1, 1]) M.add(G.torus, s * .075, .06, .225, .05, .05, .05, 0, 0, 0, 0x6b4a8a); M.add(G.box, 0, .1, .0, .4, .03, .04, 0, 0, 0, 0x6b4a8a); return M.geometry(); })(),
    leaf:(() => { const M = new Merge(); M.add(G.cyl8, 0, .27, .04, .01, .08, .01, 0, 0, 0, 0x3f9e5a); M.add(G.sm, .05, .31, .04, .06, .015, .035, 0, 0, .4, 0x3fbf7a); return M.geometry(); })()
  };

  /* ---------- field flowers (one cell each, origin on the ground) ---------- */
  const STEM = 0x4fae4a, LEAF = 0x62c254, LEAF2 = 0x4c9e3e;
  const FLOWER = {
    sun(){
      const M = new Merge();
      for(const [x, z, h] of [[-.18, .05, .95], [.2, -.12, .78]]){
        M.add(LG.cyl8, x, h / 2, z, .035, h, .035, 0, 0, 0, STEM);
        M.add(LG.ico, x + .1, h * .45, z, .13, .025, .07, 0, 0, -.5, LEAF); M.add(LG.ico, x - .1, h * .6, z, .12, .025, .065, 0, 0, .5, LEAF2);
        const y = h + .02, tilt = -.4;
        M.add(LG.disc, x, y, z + .03, .12, .06, .12, Math.PI / 2 + tilt, 0, 0, 0x7a4a24);
        for(let i = 0; i < 8; i++){ const a = i / 8 * Math.PI * 2, r = .17; M.add(LG.ico, x + Math.cos(a) * r, y + Math.sin(a) * r * Math.cos(tilt), z + .03 - Math.sin(a) * r * Math.sin(tilt) * .5, .09, .05, .025, tilt, 0, a, 0xffc928); }
      }
      return M.geometry();
    },
    clover(){
      const M = new Merge();
      for(const [x, z] of [[-.25, -.15], [.2, -.2], [-.05, .22], [.28, .18]]) for(let k = 0; k < 3; k++){ const a = k / 3 * Math.PI * 2 + x * 5; M.add(LG.ico, x + Math.cos(a) * .07, .08, z + Math.sin(a) * .07, .08, .02, .07, 0, -a, 0, k ? LEAF : LEAF2); }
      for(const [x, z, h] of [[-.12, -.05, .38], [.15, .05, .32], [.02, .25, .28]]){
        M.add(LG.cyl8, x, h / 2, z, .018, h, .018, 0, 0, 0, STEM);
        M.add(LG.ico, x, h + .06, z, .1, .11, .1, 0, x * 7, 0, 0xffffff);
        M.add(LG.ico, x, h + .1, z, .075, .07, .075, 0, 0, 0, 0xffe0ee);
      }
      return M.geometry();
    },
    daisy(){
      const M = new Merge();
      for(const [x, z, h] of [[-.2, -.1, .5], [.18, -.16, .42], [0, .2, .36], [.26, .2, .3]]){
        M.add(LG.cyl8, x, h / 2, z, .016, h, .016, 0, 0, 0, STEM);
        M.add(LG.ico, x + .06, h * .35, z, .07, .015, .035, 0, 0, -.6, LEAF);
        M.add(LG.disc, x, h, z, .1, .014, .1, 0, 0, 0, 0xffffff);
        M.add(LG.ico, x, h + .012, z, .04, .025, .04, 0, 0, 0, 0xffcf2e);
      }
      return M.geometry();
    },
    rose(){
      const M = new Merge();
      for(const [x, z, h] of [[-.16, -.08, .6], [.18, .1, .5], [-.02, .22, .4]]){
        M.add(LG.cyl8, x, h / 2, z, .022, h, .022, 0, 0, 0, LEAF2);
        M.add(LG.ico, x + .08, h * .45, z, .09, .02, .05, 0, .3, -.5, LEAF); M.add(LG.ico, x - .08, h * .65, z, .08, .02, .045, 0, -.3, .5, LEAF);
        M.add(LG.cone, x, h - .02, z, .07, .1, .07, Math.PI, 0, 0, LEAF2);
        for(let i = 0; i < 5; i++){ const a = i / 5 * Math.PI * 2; M.add(LG.sm, x + Math.cos(a) * .055, h + .06, z + Math.sin(a) * .055, .06, .08, .045, 0, -a, 0, 0xe8364f); }
        M.add(LG.sm, x, h + .09, z, .065, .07, .065, 0, 0, 0, 0xd42a45);
      }
      return M.geometry();
    },
    blue(){
      const M = new Merge();
      for(const [x, z, h] of [[-.18, -.06, .62], [.18, -.12, .52], [.02, .2, .45]]){
        M.add(LG.cyl8, x, h / 2, z, .018, h, .018, 0, 0, 0, STEM);
        M.add(LG.ico, x, .06, z, .12, .025, .06, 0, x * 9, 0, LEAF);
        for(let k = 0; k < 3; k++){ const a = k * 2.1 + x * 3, y = h - k * .12; M.add(LG.cyl8, x + Math.cos(a) * .05, y + .02, z + Math.sin(a) * .05, .008, .08, .008, 0, 0, Math.cos(a) * .8, STEM);
          M.add(LG.cone, x + Math.cos(a) * .1, y - .04, z + Math.sin(a) * .1, .07, .12, .07, 0, 0, 0, 0x4f86ff); M.add(LG.ico, x + Math.cos(a) * .1, y - .1, z + Math.sin(a) * .1, .05, .02, .05, 0, 0, 0, 0x6f9dff); }
      }
      return M.geometry();
    },
    pine(){                                              // little toadstools in pine needles
      const M = new Merge();
      for(let i = 0; i < 6; i++){ const a = i * 1.1; M.add(G.cone4, Math.cos(a) * .3, .03, Math.sin(a) * .3, .06, .06, .2, 0, a, 0, 0x6f9a4a); }
      for(const [x, z, h, r] of [[-.15, -.05, .32, .2], [.2, .12, .22, .14], [.02, .24, .16, .1]]){
        M.add(LG.cyl8, x, h / 2, z, r * .38, h, r * .38, 0, 0, 0, 0xfff4e0);
        M.add(LG.hemi, x, h - .02, z, r, r * .75, r, 0, 0, 0, 0xe8433f);
        for(let k = 0; k < 4; k++){ const a = k * 1.6 + x * 4; M.add(LG.ico, x + Math.cos(a) * r * .55, h + r * .45, z + Math.sin(a) * r * .55, r * .16, r * .07, r * .16, 0, 0, 0, 0xffffff); }
      }
      return M.geometry();
    }
  };

  /* ---------- the hive (decor, big honey house); the slot panel is placed by the game ---------- */
  function hiveGeo(){
    const M = new Merge(), W = 4, D = 2.4, H = 3.6;
    M.add(G.box, 0, .25, 0, W + .6, .5, D + .6, 0, 0, 0, 0x9a6b3c);                    // wooden base
    M.add(G.box, 0, .5 + H / 2, 0, W, H, D, 0, 0, 0, 0xf7c95a);                          // the house
    for(const y of [1.4, 2.6]) M.add(G.box, 0, y, 0, W + .12, .14, D + .12, 0, 0, 0, 0xe0a83a);
    M.add(G.box, 0, .5 + H + .1, 0, W + .5, .22, D + .5, 0, 0, 0, 0xd9853b);              // roof slab
    for(const s of [-1, 1]) M.add(G.box, 0, .5 + H + .75, s * .78, W + .7, .18, 1.75, s * .65, 0, 0, 0xe0604a);
    M.add(G.box, 0, .5 + H + 1.32, 0, W + .75, .16, .28, 0, 0, 0, 0xc84f3c);
    for(const s of [-1, 1]) M.add(G.cone4, s * (W / 2 - .02), .5 + H + .55, 0, 1.25 / .707, .9, .12, 0, Math.PI / 4, 0, 0xf7c95a);
    // the honeycomb board on the front (slots go on it)
    M.add(G.box, 0, 2.55, D / 2 + .04, W - .5, H - .7, .08, 0, 0, 0, 0xc98a2b);
    // a little round door and a landing step
    M.add(G.cyl, 0, .85, D / 2 + .05, .32, .1, .32, Math.PI / 2, 0, 0, 0x5a3a1e); M.add(G.box, 0, .6, D / 2 + .3, 1, .08, .5, 0, 0, 0, 0xb07a44);
    // honey drips on the roof edge
    for(let i = 0; i < 7; i++){ const x = -1.8 + i * .6; M.add(G.sph, x, .5 + H - .08 - (i % 3) * .06, D / 2 + .08, .1, .16 + (i % 3) * .05, .06, 0, 0, 0, 0xffb81c); }
    // honey pots by the hive
    for(const [x, z, s] of [[-2.7, 1.2, 1], [2.75, 1.3, .85], [-3.1, .3, .7]]){ M.add(G.cyl, x, .32 * s, z, .3 * s, .64 * s, .3 * s, 0, 0, 0, 0xffa62b); M.add(G.cyl, x, .68 * s, z, .2 * s, .1 * s, .2 * s, 0, 0, 0, 0xfff1d8); M.add(G.box, x, .64 * s, z + .2 * s, .34 * s, .2 * s, .04, 0, 0, 0, 0xfff1d8); }
    return M.geometry();
  }
  const slotGeo = (() => { const g = new THREE.CylinderGeometry(1, 1, 1, 6); g.rotateX(Math.PI / 2); g.rotateZ(Math.PI / 6); return g; })();

  /* ---------- the honey shop stall ---------- */
  function shopGeo(){
    const M = new Merge();
    M.add(G.box, 0, .55, 0, 3.4, 1.1, 1.3, 0, 0, 0, 0xc98a52); M.add(G.box, 0, 1.14, .05, 3.6, .1, 1.45, 0, 0, 0, 0xe6b67e);
    for(const s of [-1, 1]) for(const q of [-1, 1]) M.add(G.cyl8, s * 1.62, 1.4, q * .6, .07, 2.8, .07, 0, 0, 0, 0xffffff);
    M.add(G.box, 0, 2.85, .1, 3.9, .12, 2, -.18, 0, 0, 0xffb347);
    for(let i = 0; i < 8; i++) M.add(G.cyl, -1.72 + i * .49, 2.62, 1.08, .24, .1, .24, Math.PI / 2, 0, 0, 0xf0902a);
    for(let i = 0; i < 5; i++){ const x = -1.3 + i * .65; M.add(G.cyl, x, 1.38, .1, .16, .38, .16, 0, 0, 0, 0xffa62b); M.add(G.cyl, x, 1.6, .1, .12, .07, .12, 0, 0, 0, 0xfff1d8); }
    // a backpack, a net and a little wand on the counter
    M.add(G.box, 1.2, 1.4, -.35, .5, .55, .3, 0, 0, 0, 0x6cc4ff); M.add(G.box, 1.2, 1.32, -.18, .36, .26, .05, 0, 0, 0, 0x4aa0dd);
    M.add(G.cyl8, -1.25, 1.75, -.4, .03, 1.2, .03, 0, 0, .25, 0x9a6b3c); M.add(G.torus, -1.43, 2.4, -.4, .22, .22, .22, 0, Math.PI / 2, 0, 0xffffff);
    for(const s of [-1, 1]){ M.add(G.cyl, s * 2.3, .3, .55, .32, .6, .32, 0, 0, 0, 0xd98a5a); M.add(G.ico1, s * 2.3, .85, .55, .4, .45, .4, 0, 0, 0, 0x5fbf4a); }
    return M.geometry();
  }

  /* ---------- Pando the panda (sits; head is separate so it can nod) ---------- */
  function buildPanda(){
    const grp = new THREE.Group(), W = 0xffffff, B = 0x2b2b33;
    const BM = new Merge();
    BM.add(G.sph, 0, .75, 0, .72, .75, .62, 0, 0, 0, W);
    for(const s of [-1, 1]){
      BM.add(G.sph, s * .45, .3, .35, .26, .24, .34, 0, 0, 0, B);            // legs
      BM.add(G.sph, s * .45, .27, .62, .17, .17, .08, 0, 0, 0, 0xffd6e0);       // paw pads
      BM.add(G.sph, s * .6, .95, .2, .2, .38, .22, .3, 0, s * .5, B);          // arms
    }
    BM.add(G.sph, 0, 1.12, -.1, .62, .22, .55, 0, 0, 0, B);                    // shoulder band
    // bamboo in the paws
    BM.add(G.cyl8, .1, 1.05, .45, .05, 1.3, .05, .2, 0, -.6, 0x7cc251); for(const k of [-.25, .2]) BM.add(G.cyl8, .1 + k * .55, 1.05 + k * .75, .45 + k * .15, .058, .04, .058, .2, 0, -.6, 0x5ea33e);
    BM.add(G.sm, .5, 1.6, .55, .12, .03, .06, 0, 0, .4, 0x7cc251);
    const body = new THREE.Mesh(BM.geometry(), MAT); body.castShadow = true; grp.add(body);
    const head = new THREE.Group(); head.position.set(0, 1.6, .05); grp.add(head);
    const HM = new Merge();
    HM.add(G.sph, 0, .15, 0, .55, .48, .5, 0, 0, 0, W);
    for(const s of [-1, 1]){
      HM.add(G.sph, s * .38, .55, -.05, .17, .17, .1, 0, 0, 0, B);
      HM.add(G.sph, s * .2, .2, .38, .13, .16, .08, 0, 0, s * .5, B);          // eye patches
      HM.add(G.sm, s * .2, .22, .45, .055, .065, .03, 0, 0, 0, 0xffffff); HM.add(G.sm, s * .19, .24, .475, .025, .03, .01, 0, 0, 0, 0x111111);
      HM.add(G.sm, s * .32, .02, .38, .07, .04, .02, 0, s * .5, 0, 0xff9fb6);
    }
    HM.add(G.sph, 0, .03, .42, .17, .12, .12, 0, 0, 0, 0xfff6ea); HM.add(G.sm, 0, .08, .53, .06, .04, .035, 0, 0, 0, B);
    HM.add(G.torus, 0, -.02, .52, .04, .03, .02, 0, 0, Math.PI, B);
    const hm = new THREE.Mesh(HM.geometry(), MAT); hm.castShadow = true; head.add(hm);
    return { grp, head };
  }

  /* ---------- friendly bugs: a ladybug and a snail (cute, slow, harmless) ---------- */
  function buildLadybug(){
    const grp = new THREE.Group(), M = new Merge();
    M.add(G.hemi, 0, .06, 0, .32, .26, .38, 0, 0, 0, 0xff4b4b);
    M.add(G.box, 0, .2, -.02, .012, .2, .7, 0, 0, 0, 0x6a1a1a);
    for(const [x, z, r] of [[.14, .12, .06], [-.14, .12, .06], [.16, -.12, .055], [-.16, -.12, .055], [0, -.25, .05]]) M.add(G.sm, x, .2 + (Math.abs(x) < .01 ? .02 : 0), z, r, .025, r, 0, 0, 0, 0x2b2020);
    M.add(G.sph, 0, .12, .36, .17, .14, .13, 0, 0, 0, 0x2b2b33);
    for(const s of [-1, 1]){
      M.add(G.sm, s * .07, .17, .46, .05, .06, .03, 0, 0, 0, 0xffffff); M.add(G.sm, s * .07, .17, .485, .025, .03, .015, 0, 0, 0, 0x111111);
      M.add(G.sm, s * .11, .1, .45, .03, .02, .015, 0, 0, 0, 0xff9fb6);
      M.add(G.cyl8, s * .06, .3, .42, .01, .14, .01, -.6, 0, s * -.4, 0x2b2b33); M.add(G.sm, s * .1, .36, .48, .025, .025, .025, 0, 0, 0, 0x2b2b33);
      for(const z of [-.15, 0, .15]) M.add(G.cyl8, s * .3, .04, z, .015, .14, .015, 0, 0, s * 1.2, 0x2b2b33);
    }
    const m = new THREE.Mesh(M.geometry(), MAT); m.castShadow = true; grp.add(m);
    return { grp, body:m };
  }
  function buildSnail(){
    const grp = new THREE.Group(), M = new Merge();
    M.add(G.sph, 0, .08, .05, .16, .1, .45, 0, 0, 0, 0xc9e6a0);
    M.add(G.sph, 0, .2, .38, .13, .15, .12, 0, 0, 0, 0xc9e6a0);
    for(const s of [-1, 1]){ M.add(G.cyl8, s * .06, .4, .4, .018, .22, .018, -.2, 0, s * -.25, 0xc9e6a0); M.add(G.sm, s * .09, .51, .42, .045, .045, .045, 0, 0, 0, 0xffffff); M.add(G.sm, s * .09, .515, .455, .02, .02, .012, 0, 0, 0, 0x111111);
      M.add(G.sm, s * .09, .17, .48, .03, .02, .012, 0, 0, 0, 0xff9fb6); }
    M.add(G.torus, 0, .17, .5, .03, .025, .02, 0, 0, Math.PI, 0x5a6e3a);
    M.add(G.sph, 0, .33, -.08, .14, .28, .28, 0, 0, 0, 0xffb35c);
    M.add(G.torus, .08, .33, -.08, .18, .18, .5, 0, Math.PI / 2, 0, 0xffd28f);
    M.add(G.sph, .14, .33, -.08, .05, .1, .1, 0, 0, 0, 0xffd28f);
    const m = new THREE.Mesh(M.geometry(), MAT); m.castShadow = true; grp.add(m);
    return { grp, body:m };
  }

  /* ---------- collecting tools (held in the hand; the head points along -y... built pointing up) ---------- */
  const TOOL_GEO = {
    scoop:(() => { const M = new Merge(); M.add(G.cyl8, 0, .3, 0, .03, .6, .03, 0, 0, 0, 0x9a6b3c); M.add(G.hemi, 0, .66, 0, .14, .1, .12, Math.PI, 0, 0, 0xffc93c); return M.geometry(); })(),
    net:(() => { const M = new Merge(); M.add(G.cyl8, 0, .4, 0, .03, .8, .03, 0, 0, 0, 0x9a6b3c); M.add(G.torus, 0, .98, 0, .2, .2, .2, Math.PI / 2, 0, 0, 0xffffff); M.add(G.cone, 0, .98, -.14, .18, .28, .18, -Math.PI / 2, 0, 0, 0xe8f6ff); return M.geometry(); })(),
    rake:(() => { const M = new Merge(); M.add(G.cyl8, 0, .45, 0, .03, .9, .03, 0, 0, 0, 0x9a6b3c); M.add(G.box, 0, .92, 0, .5, .06, .06, 0, 0, 0, 0x5ed6a0); for(let i = 0; i < 6; i++) M.add(G.box, -.22 + i * .088, .99, .0, .025, .12, .025, 0, 0, 0, 0x5ed6a0); return M.geometry(); })(),
    wand:(() => { const M = new Merge(); M.add(G.cyl8, 0, .35, 0, .028, .7, .028, 0, 0, 0, 0xffffff); M.add(G.sm, 0, .72, 0, .05, .05, .05, 0, 0, 0, 0xff8fb1); const s = new THREE.ExtrudeGeometry(K.starShape(.16, .07), { depth:.05, bevelEnabled:false }); s.translate(0, 0, -.025); M.add(s, 0, .9, 0, 1, 1, 1, 0, 0, 0, 0xffd23f); return M.geometry(); })()
  };
  /* backpack sizes (worn on the back) */
  function packGeo(level){
    const M = new Merge(), k = .75 + level * .11;
    const col = [0xffe08a, 0xffb347, 0x6cc4ff, 0xc98a52, 0x9a6b3c, 0xff8fb1][level] || 0xffb347;
    if(level === 5){ M.add(G.box, 0, .62, -.3, .34, .34, .16, 0, 0, 0, 0xc98a52); M.add(G.cyl8, 0, 1.25, -.32, .008, 1.1, .008, 0, 0, 0, 0xffffff); M.add(G.sph, 0, 2.05, -.32, .42, .5, .42, 0, 0, 0, 0xffc93c); M.add(G.cone, 0, 1.55, -.32, .1, .14, .1, Math.PI, 0, 0, 0xffc93c); return M.geometry(); }
    if(level === 4){ M.add(G.cyl, 0, .66, -.36, .24 * k, .55 * k, .24 * k, 0, 0, 0, col); for(const y of [.5, .82]) M.add(G.cyl, 0, y, -.36, .25 * k, .04, .25 * k, 0, 0, 0, 0x6a4a2a); return M.geometry(); }
    M.add(G.box, 0, .66, -.3, .36 * k, .42 * k, .2 * k, 0, 0, 0, col);
    M.add(G.box, 0, .58, -.42 * (1 + level * .05), .26 * k, .2 * k, .06, 0, 0, 0, shade(col, .85));
    M.add(G.hemi, 0, .66 + .21 * k, -.3, .18 * k, .08, .1 * k, 0, 0, 0, shade(col, .9));
    return M.geometry();
  }
  function eggGeo(gold){
    const M = new Merge();
    M.add(G.sph, 0, .32, 0, .25, .32, .25, 0, 0, 0, gold ? 0xffd23f : 0xfff3d6);
    for(let i = 0; i < 6; i++){ const a = i * 1.05, y = .2 + (i % 3) * .14; M.add(G.sm, Math.cos(a) * .22, y, Math.sin(a) * .22, .05, .05, .02, 0, -a + Math.PI / 2, 0, gold ? 0xffffff : 0xffc93c); }
    return M.geometry();
  }

  /* ---------- 2D bee portraits for the cards (canvas → data URL) ---------- */
  const PORTRAIT = {};
  function portrait(id){
    if(PORTRAIT[id]) return PORTRAIT[id];
    const b = BEES.find(x => x.id === id) || BEES[0];
    const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d');
    const col = b.css, dark = hexCss(shade(b.col, .58));
    // wings
    x.fillStyle = 'rgba(255,255,255,.85)'; x.strokeStyle = 'rgba(120,170,220,.7)'; x.lineWidth = 3;
    for(const s of [-1, 1]){ x.beginPath(); x.ellipse(64 + s * 30, 34, 22, 15, s * -.5, 0, 6.3); x.fill(); x.stroke(); }
    // body
    x.fillStyle = col; x.beginPath(); x.ellipse(64, 74, 44, 40, 0, 0, 6.3); x.fill();
    x.save(); x.beginPath(); x.ellipse(64, 74, 44, 40, 0, 0, 6.3); x.clip();
    x.fillStyle = dark; x.fillRect(16, 92, 96, 9); x.fillRect(16, 106, 96, 8);
    x.fillStyle = 'rgba(255,255,255,.35)'; x.beginPath(); x.ellipse(48, 52, 18, 10, -.5, 0, 6.3); x.fill();
    x.restore();
    x.lineWidth = 4; x.strokeStyle = dark; x.beginPath(); x.ellipse(64, 74, 44, 40, 0, 0, 6.3); x.stroke();
    // antennae
    x.strokeStyle = dark; x.lineWidth = 4; x.lineCap = 'round';
    for(const s of [-1, 1]){ x.beginPath(); x.moveTo(64 + s * 12, 38); x.quadraticCurveTo(64 + s * 18, 18, 64 + s * 28, 14); x.stroke(); x.fillStyle = dark; x.beginPath(); x.arc(64 + s * 28, 14, 6, 0, 6.3); x.fill(); }
    // face
    for(const s of [-1, 1]){
      x.fillStyle = '#1d1410'; x.beginPath(); x.ellipse(64 + s * 16, 68, 7, 9, 0, 0, 6.3); x.fill();
      x.fillStyle = '#fff'; x.beginPath(); x.arc(64 + s * 16 - 2, 64, 3, 0, 6.3); x.fill();
      x.fillStyle = 'rgba(255,120,150,.6)'; x.beginPath(); x.ellipse(64 + s * 30, 80, 8, 5, 0, 0, 6.3); x.fill();
    }
    x.strokeStyle = '#1d1410'; x.lineWidth = 3.5; x.beginPath(); x.arc(64, 78, 7, .2, Math.PI - .2); x.stroke();
    // accessory
    if(b.acc === 'crown'){ x.fillStyle = '#ffc533'; x.strokeStyle = '#c98f12'; x.lineWidth = 2; x.beginPath(); x.moveTo(44, 40); x.lineTo(44, 24); x.lineTo(54, 32); x.lineTo(64, 18); x.lineTo(74, 32); x.lineTo(84, 24); x.lineTo(84, 40); x.closePath(); x.fill(); x.stroke(); x.fillStyle = '#ff5a8a'; x.beginPath(); x.arc(64, 33, 4, 0, 6.3); x.fill(); }
    if(b.acc === 'cap'){ x.fillStyle = '#8e6fe0'; x.beginPath(); x.moveTo(36, 44); x.quadraticCurveTo(60, 6, 98, 18); x.lineTo(88, 42); x.closePath(); x.fill(); x.fillStyle = '#f4efff'; x.beginPath(); x.ellipse(62, 44, 30, 7, 0, 0, 6.3); x.fill(); x.beginPath(); x.arc(100, 18, 8, 0, 6.3); x.fill();
      x.strokeStyle = '#1d1410'; x.lineWidth = 3.5; for(const s of [-1, 1]){ x.fillStyle = col; x.beginPath(); x.ellipse(64 + s * 16, 68, 9, 10, 0, 0, 6.3); x.fill(); x.beginPath(); x.arc(64 + s * 16, 66, 7, .3, Math.PI - .3); x.stroke(); } }
    if(b.acc === 'goggles'){ x.strokeStyle = '#6b4a8a'; x.lineWidth = 5; for(const s of [-1, 1]){ x.beginPath(); x.arc(64 + s * 16, 67, 12, 0, 6.3); x.stroke(); } x.beginPath(); x.moveTo(22, 62); x.lineTo(40, 64); x.moveTo(88, 64); x.lineTo(106, 62); x.stroke(); }
    if(b.acc === 'leaf'){ x.fillStyle = '#3fbf7a'; x.beginPath(); x.ellipse(78, 28, 14, 7, -.5, 0, 6.3); x.fill(); x.strokeStyle = '#2a8a55'; x.lineWidth = 2; x.beginPath(); x.moveTo(66, 36); x.lineTo(88, 22); x.stroke(); }
    if(b.star){ x.fillStyle = '#fff6b0'; for(const [sx, sy, r] of [[22, 30, 6], [108, 46, 5], [104, 100, 4]]){ x.beginPath(); for(let i = 0; i < 8; i++){ const a = i / 8 * Math.PI * 2, rr = i % 2 ? r * .35 : r; x.lineTo(sx + Math.cos(a) * rr, sy + Math.sin(a) * rr); } x.closePath(); x.fill(); } }
    return (PORTRAIT[id] = c.toDataURL());
  }

  return { MAT, GOLD, RAR, BEES, BEE_IDS, bodyGeo, faceGeo, wingGeo, ACC, FLOWER, hiveGeo, slotGeo, shopGeo, buildPanda, buildLadybug, buildSnail, TOOL_GEO, packGeo, eggGeo, portrait, shade, hexCss };
}
