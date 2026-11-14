/* Bobo Restaurant («مطعم بوبو 🍕»): 3D models — food (pizza that flattens, gets toppings and bakes or burns;
   burger, juice, ice cream, plate, pizza box), cute customers (chibi townsfolk with drawn faces), the delivery bike
   and the little town houses. Simple shapes with vertex colours (one shared material) so it stays light on phones.
   makeRestaurantModels(THREE, K) where K = makeKit(THREE) from ../worlds/kit.js. */
export function makeRestaurantModels(THREE, K){
  const { Merge, G, CG, capsule, facePatch, charMat, pivot } = K;
  const L = window.L || (a => a);
  const MAT = new THREE.MeshStandardMaterial({ vertexColors:true, roughness:.66, metalness:0 });
  const JUICY = new THREE.MeshStandardMaterial({ vertexColors:true, roughness:.28, metalness:.02 });   // glossy toppings
  const meshOf = (M, mat = MAT) => { const m = new THREE.Mesh(M.geometry(), mat); m.castShadow = true; m.receiveShadow = true; return m; };

  /* ---------- the menu ---------- */
  const TOPS = {
    cheese:  { e:'🧀', name:L('جبنة', 'Cheese', 'Peynir'),      col:0xffd23f, price:0 },
    tomato:  { e:'🍅', name:L('بندورة', 'Tomato', 'Domates'),    col:0xe8402f, price:0 },
    mushroom:{ e:'🍄', name:L('فطر', 'Mushroom', 'Mantar'),      col:0xe9d8bf, price:30 },
    olive:   { e:'🫒', name:L('زيتون', 'Olives', 'Zeytin'),       col:0x3b3a2e, price:50 },
    pepper:  { e:'🫑', name:L('فليفلة', 'Pepper', 'Biber'),       col:0x4fbf3a, price:70 }
  };
  const TOP_IDS = Object.keys(TOPS);
  const EXTRA = {
    burger:{ e:'🍔', name:L('برغر', 'Burger', 'Hamburger'), price:120 },
    ice:   { e:'🍦', name:L('بوظة', 'Ice cream', 'Dondurma'), price:200 }
  };

  /* ---------- pizza: a dough ball that flattens, sauce, cheese, toppings, baking colour ---------- */
  const DOUGH_RAW = new THREE.Color(0xf6e3bf), DOUGH_BAKED = new THREE.Color(0xe7a85a), DOUGH_BURNT = new THREE.Color(0x3a2a22);
  function makePizza(){
    const grp = new THREE.Group();
    const doughMat = new THREE.MeshStandardMaterial({ color:0xf6e3bf, roughness:.8 });
    const sauceMat = new THREE.MeshStandardMaterial({ color:0xd8402c, roughness:.4 });
    const cheeseMat = new THREE.MeshStandardMaterial({ color:0xffe27a, roughness:.35, emissive:0x3a2a00, emissiveIntensity:.15 });
    const ball = new THREE.Mesh(new THREE.SphereGeometry(.2, 18, 12), doughMat); ball.castShadow = true; grp.add(ball);
    const base = new THREE.Mesh(new THREE.CylinderGeometry(.42, .44, .06, 28), doughMat); base.castShadow = true; base.receiveShadow = true; grp.add(base);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(.41, .045, 8, 32), doughMat); rim.rotation.x = Math.PI / 2; rim.position.y = .035; grp.add(rim);
    const sauce = new THREE.Mesh(new THREE.CylinderGeometry(.38, .38, .012, 28), sauceMat); sauce.position.y = .036; grp.add(sauce);
    const cheese = new THREE.Mesh(new THREE.CylinderGeometry(.36, .36, .012, 24), cheeseMat); cheese.position.y = .046; grp.add(cheese);
    const tops = new THREE.Group(); grp.add(tops);
    const P = { grp, ball, base, rim, sauce, cheese, tops, doughMat, cheeseMat, flat:0, list:[], cook:0 };
    setFlat(P, 0); setCook(P, 0);
    return P;
  }
  /* k = 0 (ball) … 1 (flat round base with sauce) */
  function setFlat(P, k){
    P.flat = k;
    const b = Math.min(1, k * 1.4);
    P.ball.visible = k < .99; P.ball.scale.set(1 + b * 1.4, Math.max(.25, 1 - b * .8), 1 + b * 1.4); P.ball.position.y = .2 * P.ball.scale.y;
    const s = Math.max(.001, (k - .3) / .7);
    P.base.visible = P.rim.visible = k > .3; P.base.scale.set(s, 1, s); P.rim.scale.set(s, s, 1); P.base.position.y = .03;
    P.sauce.visible = k >= .99; P.cheese.visible = false;
  }
  /* add one topping (scatters a few juicy pieces) */
  const topGeo = {
    cheese:  (M, x, z, r) => M.add(G.box, x, .065, z, .1, .025, .05, 0, r, 0, 0xffd23f),
    tomato:  (M, x, z) => { M.add(G.cyl, x, .07, z, .065, .022, .065, 0, 0, 0, 0xe8402f); M.add(G.cyl, x, .082, z, .045, .006, .045, 0, 0, 0, 0xff7a5c); },
    mushroom:(M, x, z, r) => { M.add(G.hemi, x, .062, z, .055, .05, .045, 0, r, 0, 0xe9d8bf); M.add(G.box, x, .062, z, .022, .03, .02, 0, r, 0, 0xf8eedd); },
    olive:   (M, x, z) => M.add(G.torus, x, .07, z, .035, .035, .06, Math.PI / 2, 0, 0, 0x2e2d24),
    pepper:  (M, x, z, r) => M.add(G.torus, x, .07, z, .045, .045, .08, Math.PI / 2, 0, r, 0x4fbf3a)
  };
  const SPOTS = [[.15, .1], [-.16, .12], [.02, -.18], [-.12, -.12], [.2, -.08], [-.02, .22], [.05, .02], [-.24, -.02]];
  function addTop(P, t){
    if(!topGeo[t] || P.list.includes(t)) return;
    P.list.push(t);
    if(t === 'cheese'){ P.cheese.visible = true; }
    const M = new Merge(), off = P.list.length * 1.7;
    SPOTS.forEach(([x, z], i) => { const a = off + i * .9, rr = Math.hypot(x, z); const px = Math.cos(a) * rr * 1.05, pz = Math.sin(a) * rr * 1.05; topGeo[t](M, px, pz, a); });
    const m = meshOf(M, JUICY); m.userData.top = t; m.scale.setScalar(.01); P.tops.add(m);
    m.userData.pop = 1;
  }
  function setCook(P, k){   // 0 raw … 1 baked … 2 burnt
    P.cook = k;
    const c = k <= 1 ? DOUGH_RAW.clone().lerp(DOUGH_BAKED, k) : DOUGH_BAKED.clone().lerp(DOUGH_BURNT, Math.min(1, k - 1));
    P.doughMat.color.copy(c);
    P.cheeseMat.color.setHex(k > 1.3 ? 0x5a4a30 : k > .6 ? 0xffd25a : 0xffe9a0);
    P.tops.children.forEach(m => { m.material = k > 1.3 ? BURNT_MAT : JUICY; });
  }
  const BURNT_MAT = new THREE.MeshStandardMaterial({ color:0x2b2420, roughness:.9 });
  function animPizza(P, dt){ P.tops.children.forEach(m => { if(m.userData.pop > 0){ m.userData.pop = Math.max(0, m.userData.pop - dt * 4); const k = 1 - m.userData.pop; m.scale.setScalar(Math.max(.01, k * (1 + Math.sin(k * Math.PI) * .35))); } }); }
  /* a finished pizza as one merged geometry (held / served / on the pass) */
  function pizzaGeo(list, burnt){
    const M = new Merge(), crust = burnt ? 0x3a2a22 : 0xe7a85a;
    M.add(G.cyl, 0, .03, 0, .44, .06, .44, 0, 0, 0, crust);
    M.add(G.torus, 0, .06, 0, .41, .41, .25, Math.PI / 2, 0, 0, crust);
    M.add(G.cyl, 0, .065, 0, .38, .012, .38, 0, 0, 0, burnt ? 0x40261c : 0xd8402c);
    if(!burnt){
      if(list.includes('cheese')) M.add(G.cyl, 0, .075, 0, .36, .012, .36, 0, 0, 0, 0xffd25a);
      list.forEach((t, k) => { if(t === 'cheese' || !topGeo[t]) return; const off = (k + 1) * 1.7;
        SPOTS.forEach(([x, z], i) => { const a = off + i * .9, rr = Math.hypot(x, z); topGeo[t](M, Math.cos(a) * rr * 1.05, Math.sin(a) * rr * 1.05, a); }); });
      for(let i = 0; i < 6; i++) M.add(G.box, 0, .086, 0, .005, .004, .72, 0, i * Math.PI / 6, 0, 0xe39a4a);
    }
    return M.geometry();
  }
  function resetPizza(P){ while(P.tops.children.length){ const m = P.tops.children.pop(); m.geometry.dispose(); } P.list = []; setFlat(P, 0); setCook(P, 0); }

  /* ---------- simple food meshes (one merged geometry each, used for held / served food) ---------- */
  function burgerGeo(){
    const M = new Merge();
    M.add(G.hemi, 0, .02, 0, .26, .12, .26, Math.PI, 0, 0, 0xe0a050);
    M.add(G.cyl, 0, .07, 0, .25, .06, .25, 0, 0, 0, 0x6b3a1e);
    M.add(G.box, 0, .105, 0, .4, .018, .4, 0, Math.PI / 4, 0, 0xffc928);
    M.add(G.cyl, 0, .125, 0, .29, .02, .29, 0, 0, 0, 0x5cc04a);
    M.add(G.cyl, 0, .145, 0, .2, .02, .2, 0, 0, 0, 0xe8402f);
    M.add(G.hemi, 0, .16, 0, .27, .2, .27, 0, 0, 0, 0xe9a24e);
    for(let i = 0; i < 9; i++){ const a = i * 2.4, r = .08 + (i % 3) * .05; M.add(G.sm, Math.cos(a) * r, .16 + Math.sqrt(Math.max(0, .27 * .27 - r * r)) / .27 * .2 - .005, Math.sin(a) * r, .018, .01, .03, 0, a, 0, 0xfff6dc); }
    return M.geometry();
  }
  function juiceGeo(){
    const M = new Merge();
    M.add(G.cyl, 0, .14, 0, .085, .28, .085, 0, 0, 0, 0xffffff);
    M.add(G.cyl, 0, .13, 0, .08, .22, .08, 0, 0, 0, 0xffa020);
    M.add(G.cyl, 0, .2, 0, .087, .05, .087, 0, 0, 0, 0xffffff);
    M.add(G.cyl8, .03, .34, 0, .012, .18, .012, 0, 0, -.25, 0xff6fae);
    M.add(G.sph, .06, .27, .06, .03, .03, .03, 0, 0, 0, 0xffd23f);
    return M.geometry();
  }
  function iceGeo(){
    const M = new Merge();
    M.add(G.cone, 0, .12, 0, .07, .24, .07, Math.PI, 0, 0, 0xe2a85e);
    M.add(G.sph, 0, .27, 0, .09, .08, .09, 0, 0, 0, 0xffb3cf);
    M.add(G.sph, 0, .345, 0, .07, .06, .07, 0, 0, 0, 0xfff1e0);
    M.add(G.sm, 0, .41, 0, .025, .025, .025, 0, 0, 0, 0xe8304f);
    return M.geometry();
  }
  function plateGeo(){ const M = new Merge(); M.add(G.cyl, 0, .015, 0, .38, .03, .38, 0, 0, 0, 0xffffff); M.add(G.torus, 0, .03, 0, .36, .36, .2, Math.PI / 2, 0, 0, 0xf1f4f8); return M.geometry(); }
  function boxGeo(col = 0xd9a46a){
    const M = new Merge();
    M.add(G.box, 0, .06, 0, .62, .12, .62, 0, 0, 0, col);
    M.add(G.box, 0, .125, 0, .64, .015, .64, 0, 0, 0, 0xe8b882);
    M.add(G.cyl, 0, .135, 0, .16, .006, .16, 0, 0, 0, 0xe8304f);
    return M.geometry();
  }
  function trayGeo(){ const M = new Merge(); M.add(G.box, 0, .02, 0, .8, .04, .55, 0, 0, 0, 0xc98a52); M.add(G.box, 0, .045, -.27, .8, .05, .02, 0, 0, 0, 0xb07a44); M.add(G.box, 0, .045, .27, .8, .05, .02, 0, 0, 0, 0xb07a44); return M.geometry(); }

  /* ---------- customers: chibi townsfolk (all pieces simple; one colour per piece) ---------- */
  const LOOKS = [
    { top:0xff8fb1, bottom:0x5a6fd8, hair:0x6b3a1e, skin:0xf7cfae, hat:null, face:{ eye:'dot', blush:true } },
    { top:0x6cc4ff, bottom:0x3f4a6e, hair:0x2a1a12, skin:0xe0a87e, hat:0xffc23d, face:{ blush:true, iris:'#2a6fd8' } },
    { top:0x5ed6a0, bottom:0x8a5a36, hair:0xffd27a, skin:0xffd9bd, hat:null, face:{ eye:'dot', freckles:true } },
    { top:0xffc23d, bottom:0x4a5568, hair:0x111111, skin:0xc98c62, hat:0xe8304f, face:{ blush:true } },
    { top:0xb99cff, bottom:0x2f3b52, hair:0xa0522d, skin:0xf3c9a5, hat:null, face:{ lashes:true, blush:true, iris:'#3a8f5a' } },
    { top:0xff9f5a, bottom:0x31415e, hair:0xd9d9d9, skin:0xf0c49e, hat:null, face:{ glasses:'#5a3a22', wrinkles:true } },
    { top:0xffffff, bottom:0xe8304f, hair:0x3a2416, skin:0x8d5a3b, hat:0x5ed6a0, face:{ eye:'dot', blush:true } },
    { top:0x3a74d8, bottom:0x8a96a8, hair:0xff8a3d, skin:0xffd9bd, hat:null, face:{ freckles:true, blush:true } }
  ];
  function customer(v, vip){
    const o = LOOKS[((v % LOOKS.length) + LOOKS.length) % LOOKS.length];
    const grp = new THREE.Group(), body = new THREE.Group(); grp.add(body);
    const M = new Merge(), hr = .31;
    M.add(CG.sph, 0, .62, 0, .25, .25, .22, 0, 0, 0, o.top);
    M.add(CG.cyl, 0, .44, 0, .2, .12, .18, 0, 0, 0, o.bottom);
    if(vip){ for(let i = 0; i < 5; i++) M.add(CG.sm, Math.cos(i * 1.25 + 1) * .18, .74, Math.sin(i * 1.25 + 1) * .14 + .06, .03, .03, .03, 0, 0, 0, 0xffd23f); }
    const tm = new THREE.Mesh(M.geometry(), charMat()); body.add(tm);
    const head = pivot(body, 0, .98, 0);
    const HM = new Merge();
    HM.add(CG.sph, 0, 0, 0, hr, hr * .97, hr * .95, 0, 0, 0, o.skin);
    for(const s of [-1, 1]) HM.add(CG.sm, s * hr * .98, -.02, 0, .055, .07, .045, 0, 0, 0, o.skin);
    HM.add(new THREE.SphereGeometry(1, 26, 14, 0, Math.PI * 2, 0, Math.PI * .52), 0, .03, -.03, hr * 1.07, hr * 1.06, hr * 1.07, -.42, 0, 0, o.hair);
    if(o.hat != null){ HM.add(CG.cyl, 0, hr * .78, -.02, hr * .78, .16, hr * .78, -.15, 0, 0, o.hat); HM.add(CG.cyl, 0, hr * .66, .06, hr * .95, .03, hr * .95, -.15, 0, 0, o.hat); }
    if(vip){ HM.add(CG.cyl8, 0, hr * .98, 0, .2, .14, .2, 0, 0, 0, 0xffc23d); for(let i = 0; i < 5; i++){ const a = i / 5 * Math.PI * 2; HM.add(G.cone4, Math.cos(a) * .17, hr * .98 + .13, Math.sin(a) * .17, .05, .12, .05, 0, 0, 0, 0xffc23d); } }
    head.add(new THREE.Mesh(HM.geometry(), charMat()));
    const face = facePatch(hr * 1.012, o.face); face.scale.z = .95; head.add(face);
    const legs = [-.1, .1].map(x => { const p = pivot(body, x, .38, 0), LM = new Merge(); LM.add(capsule(.065, .22), 0, -.15, 0, 1, 1, 1, 0, 0, 0, o.bottom); LM.add(CG.sm, 0, -.31, .04, .09, .07, .13, 0, 0, 0, 0x3a2a22); p.add(new THREE.Mesh(LM.geometry(), charMat())); return p; });
    const arms = [-.26, .26].map(x => { const p = pivot(body, x, .72, 0), AM = new Merge(); AM.add(capsule(.058, .2), 0, -.14, 0, 1, 1, 1, 0, 0, 0, o.top); AM.add(CG.sm, 0, -.29, 0, .065, .065, .065, 0, 0, 0, o.skin); p.add(new THREE.Mesh(AM.geometry(), charMat())); p.userData.side = Math.sign(x); p.rotation.z = -Math.sign(x) * .25; return p; });
    grp.traverse(m => { if(m.isMesh && m !== face) m.castShadow = true; });
    return { grp, body, head, face, legs, arms, sway:[], hr, blink:Math.random() * 3 };
  }

  /* ---------- the delivery bike (one frame colour) with a pizza box rack ---------- */
  function bikeGeo(col = 0xe8304f){
    const M = new Merge();
    for(const z of [-.55, .55]){ M.add(G.torus, 0, .32, z, .3, .3, .55, 0, Math.PI / 2, 0, 0x2b2b33); M.add(G.cyl, 0, .32, z, .07, .1, .07, 0, 0, Math.PI / 2, 0xcfd6e0); }
    M.add(G.box, 0, .5, 0, .09, .09, 1.05, 0, 0, 0, col);
    M.add(G.box, 0, .62, -.2, .09, .5, .09, .4, 0, 0, col);
    M.add(G.box, 0, .62, .4, .09, .62, .09, -.35, 0, 0, col);
    M.add(G.box, 0, .86, -.3, .22, .06, .3, 0, 0, 0, 0x2b2b33);
    M.add(G.box, 0, .96, .52, .7, .06, .06, 0, 0, 0, 0x2b2b33);
    for(const s of [-1, 1]) M.add(G.cyl8, s * .36, .96, .52, .045, .14, .045, 0, 0, Math.PI / 2, 0xffffff);
    M.add(G.box, 0, .62, -.75, .5, .08, .5, 0, 0, 0, col);
    M.add(G.box, 0, .82, -.75, .52, .36, .52, 0, 0, 0, 0xffffff);
    M.add(G.box, 0, .82, -.75 + .265, .3, .14, .01, 0, 0, 0, col);
    M.add(G.sph, 0, .78, .66, .07, .07, .05, 0, 0, 0, 0xfff3b0);
    return M.geometry();
  }

  /* ---------- a town house: body colour, white roof trim, a coloured door, number plate (canvas) ---------- */
  function houseGeo(col, roof){
    const M = new Merge(), w = 5.4, d = 4.4, h = 3;
    M.add(G.box, 0, h / 2, 0, w, h, d, 0, 0, 0, col);
    M.add(G.box, 0, .15, 0, w + .2, .3, d + .2, 0, 0, 0, 0xe8dcc8);
    for(const s of [-1, 1]) M.add(G.box, 0, h + .95, s * 1.18, w + .7, .22, 2.75, s * -.7, 0, 0, roof);
    M.add(G.box, 0, h + 1.92, 0, w + .75, .18, .25, 0, 0, 0, 0xffffff);
    for(const s of [-1, 1]) M.add(G.cone4, s * (w / 2 - .04), h + .8, 0, 2.2 / .707, 1.6, .16, 0, Math.PI / 4, 0, col);
    M.add(G.box, 0, 1.05, d / 2 + .02, 1.2, 2.05, .1, 0, 0, 0, 0xffffff);
    M.add(G.box, 0, 1.0, d / 2 + .06, 1.0, 1.9, .06, 0, 0, 0, roof);
    M.add(G.sm, .35, 1.0, d / 2 + .12, .06, .06, .06, 0, 0, 0, 0xffd23f);
    M.add(G.box, 0, .12, d / 2 + .6, 1.8, .24, 1.1, 0, 0, 0, 0xd8cbb5);
    for(const s of [-1, 1]){
      const wx = s * 1.75;
      M.add(G.box, wx, 1.75, d / 2 + .03, 1.1, 1, .1, 0, 0, 0, 0xffffff); M.add(G.box, wx, 1.75, d / 2 + .06, .92, .82, .08, 0, 0, 0, 0xa8dcff);
      M.add(G.box, wx, 1.75, d / 2 + .1, .06, .82, .06, 0, 0, 0, 0xffffff);
      M.add(G.box, wx, 1.18, d / 2 + .18, 1.2, .2, .3, 0, 0, 0, 0x9a6b3c); for(let i = 0; i < 5; i++) M.add(G.sm, wx - .44 + i * .22, 1.33, d / 2 + .2, .09, .08, .09, 0, 0, 0, 0xffffff);
    }
    M.add(G.box, 1.6, h + 1.4, -.8, .6, 1.4, .6, 0, 0, 0, 0xc98a6a);
    // little bell button next to the door
    M.add(G.cyl, -.85, 1.2, d / 2 + .08, .09, .06, .09, Math.PI / 2, 0, 0, 0xffd23f);
    return M.geometry();
  }

  return { MAT, JUICY, TOPS, TOP_IDS, EXTRA, makePizza, setFlat, addTop, setCook, animPizza, resetPizza, pizzaGeo,
    burgerGeo, juiceGeo, iceGeo, plateGeo, boxGeo, trayGeo, customer, CUST_N:LOOKS.length, bikeGeo, houseGeo };
}
