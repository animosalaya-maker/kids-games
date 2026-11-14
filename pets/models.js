/* Bobo Pets («حيوانات بوبو»): 3D models — 10 original chibi pets with 3 growth stages, eggs, pet hats and house furniture.
   Everything is built from simple shapes with vertex colours (one shared material), so it is light and casts soft shadows.
   makePetModels(THREE, K) where K = makeKit(THREE) from ../worlds/kit.js (uses only K.Merge and K.G). */
export function makePetModels(THREE, K){
  const { Merge, G } = K;
  const L = window.L || (a => a);
  const MAT = new THREE.MeshStandardMaterial({ vertexColors:true, roughness:.62, metalness:0 });
  const GLOSS = new THREE.MeshStandardMaterial({ vertexColors:true, roughness:.15, metalness:0 });
  const lerp = (a, b, t) => a + (b - a) * t;
  const _c = new THREE.Color();
  const shade = (hex, k) => { _c.set(hex); _c.r = Math.min(1, _c.r * k); _c.g = Math.min(1, _c.g * k); _c.b = Math.min(1, _c.b * k); return _c.getHex(); };
  function mesh(M, mat = MAT, cast = true){ const m = new THREE.Mesh(M.geometry(), mat); m.castShadow = cast; return m; }
  function piv(parent, x = 0, y = 0, z = 0){ const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g); return g; }
  const SPH = new THREE.SphereGeometry(1, 26, 18);
  const SMILE = new THREE.TorusGeometry(1, .22, 6, 12, Math.PI);
  const WING_BAT = (() => {
    const s = new THREE.Shape(); s.moveTo(0, 0); s.quadraticCurveTo(.5, .55, 1, .5); s.quadraticCurveTo(.8, .25, .85, .05); s.quadraticCurveTo(.6, .12, .55, -.1); s.quadraticCurveTo(.35, .02, .3, -.2); s.quadraticCurveTo(.15, -.05, 0, 0);
    const g = new THREE.ExtrudeGeometry(s, { depth:.04, bevelEnabled:false }); g.translate(0, 0, -.02); return g;
  })();
  const WING_FEATHER = (() => {
    const s = new THREE.Shape(); s.moveTo(0, 0); s.quadraticCurveTo(.25, .5, .75, .62); s.quadraticCurveTo(1.05, .6, .95, .42); s.quadraticCurveTo(.85, .34, .9, .24); s.quadraticCurveTo(.78, .18, .78, .08); s.quadraticCurveTo(.5, .02, .45, -.12); s.quadraticCurveTo(.2, -.1, 0, 0);
    const g = new THREE.ExtrudeGeometry(s, { depth:.05, bevelEnabled:true, bevelThickness:.02, bevelSize:.02, bevelSegments:1 }); g.translate(0, 0, -.025); return g;
  })();

  /* ---------- the pets ---------- */
  const RAR = [
    { id:'common',    name:L('عادي', 'Common', 'Sıradan'),     col:'#7fd492', stars:0 },
    { id:'uncommon',  name:L('مميّز', 'Uncommon', 'Özel'),      col:'#6cc0ff', stars:2 },
    { id:'rare',      name:L('نادر', 'Rare', 'Nadir'),         col:'#c49bff', stars:4 },
    { id:'legendary', name:L('أسطوري', 'Legendary', 'Efsanevi'), col:'#ffcd4d', stars:7 }
  ];
  const SPECIES = {
    kitten:{ rar:0, e:'🐱', name:L('قطّة صغيرة', 'Kitten', 'Kedi yavrusu'), col:0xf6a453, belly:0xfff0da, acc:0xff9fb4, nose:0xff7f98, ears:'cat', tail:'cat', muzzle:true, size:1 },
    puppy:{ rar:0, e:'🐶', name:L('جرو', 'Puppy', 'Köpek yavrusu'), col:0xdcaa72, belly:0xfff5e6, acc:0x8f5d36, nose:0x3a2a22, ears:'flop', tail:'wag', muzzle:true, size:1.02 },
    bunny:{ rar:0, e:'🐰', name:L('أرنوب', 'Bunny', 'Tavşancık'), col:0xf7f2f4, belly:0xffffff, acc:0xffb3c8, nose:0xff8fab, ears:'long', tail:'pom', muzzle:true, size:.95 },
    duck:{ rar:0, e:'🐥', name:L('بطّوطة', 'Duckling', 'Ördek yavrusu'), col:0xffd84a, belly:0xfff1a0, acc:0xff9a2e, kind:'bird', beak:'duck', size:.9 },
    fox:{ rar:1, e:'🦊', name:L('ثعلوب', 'Fox cub', 'Tilki yavrusu'), col:0xf2803a, belly:0xfff6ec, acc:0x4a342a, nose:0x2e2420, ears:'fox', tail:'bushy', muzzle:true, size:1.02 },
    turtle:{ rar:1, e:'🐢', name:L('سلحوفة', 'Turtle', 'Kaplumbağa'), col:0x9ad57a, belly:0xe2f3b8, acc:0x5f9e4a, kind:'turtle', size:.95 },
    owl:{ rar:2, e:'🦉', name:L('بومة صغيرة', 'Owl chick', 'Baykuş yavrusu'), col:0xa97a52, belly:0xf5e3c6, acc:0xffb13a, kind:'bird', beak:'owl', size:.92 },
    panda:{ rar:2, e:'🐼', name:L('باندا', 'Panda cub', 'Panda yavrusu'), col:0xfbfbfb, belly:0xffffff, acc:0x2d2d36, nose:0x2d2d36, ears:'round', tail:'pom', muzzle:true, size:1.05 },
    dragon:{ rar:3, e:'🐉', name:L('تنّين صغير', 'Baby dragon', 'Ejderha yavrusu'), col:0x5cc56c, belly:0xdaf6a0, acc:0x2f8f4a, nose:0x2f8f4a, ears:'none', tail:'dragon', muzzle:true, wings:'bat', horns:true, size:1.05 },
    pony:{ rar:3, e:'🐴', name:L('حصان بجناحين', 'Winged pony', 'Kanatlı midilli'), col:0xd9cbff, belly:0xebe3ff, acc:0xa98ff0, nose:0x8a74d6, kind:'pony', wings:'feather', size:1.12 }
  };
  const SP_IDS = Object.keys(SPECIES);
  const STAGES = [L('بيبي', 'Baby', 'Bebek'), L('صغير', 'Kid', 'Çocuk'), L('كبير', 'Big', 'Büyük')];

  function eyes(head, hr, k, big, y0 = .08, zf = .84){
    const ep = piv(head, 0, hr * y0, hr * zf), er = hr * lerp(.2, .165, k) * (big || 1), ex = hr * (big ? .4 : .41);
    const M = new Merge();
    for(const s of [-1, 1]){
      M.add(G.sph, s * ex, 0, 0, er * .82, er, er * .55, 0, 0, 0, 0x231a16);
      M.add(G.sm, s * ex - er * .28, er * .38, er * .42, er * .32, er * .32, er * .2, 0, 0, 0, 0xffffff);
      M.add(G.sm, s * ex + er * .3, -er * .38, er * .45, er * .14, er * .14, er * .1, 0, 0, 0, 0xffffff);
    }
    ep.add(mesh(M, GLOSS, false));
    return ep;
  }
  function faceBits(M, hr, S, o = {}){
    const mz = o.mz || .78;
    for(const s of [-1, 1]) M.add(G.sm, s * hr * .62, -hr * .2, hr * .72, hr * .14, hr * .09, hr * .05, 0, s * .6, 0, 0xff9fb2);       // blush
    if(o.mouth !== false) M.add(SMILE, 0, -hr * (o.my || .38), hr * mz * 1.17, hr * .07, hr * .07, hr * .07, Math.PI, 0, 0, 0x5a2a2a);
  }

  function buildPet(sp, st, hat){
    const S = SPECIES[sp] || SPECIES.kitten; sp = SPECIES[sp] ? sp : 'kitten';
    st = Math.max(0, Math.min(2, st | 0));
    const k = st / 2, kind = S.kind || 'quad';
    const grp = new THREE.Group(), root = piv(grp);
    const P = { sp, st, grp, root, legs:[], ears:[], wings:[], tail:null, kind, hat:null, hatKind:null, t:Math.random() * 10, blinkT:2 + Math.random() * 3 };
    let body, head, hr;
    if(kind === 'quad' || kind === 'pony'){
      const pony = kind === 'pony';
      hr = pony ? lerp(.33, .26, k) : lerp(.36, .29, k);
      const rx = lerp(.25, .27, k), ry = lerp(.22, .245, k), rz = lerp(.27, pony ? .4 : .37, k), ll = pony ? lerp(.15, .3, k) : lerp(.085, .19, k);
      const by = ll + ry * .85;
      body = piv(root, 0, by, 0);
      const M = new Merge();
      M.add(SPH, 0, 0, 0, rx, ry, rz, 0, 0, 0, S.col);
      if(!pony) M.add(SPH, 0, -ry * .18, rz * .42, rx * .74, ry * .72, rz * .6, 0, 0, 0, S.belly);
      if(pony) M.add(G.cyl, 0, ry * .75, rz * .62, .13, .42, .12, .55, 0, 0, S.col);
      if(sp === 'panda') M.add(G.sph, 0, ry * .05, rz * .1, rx * 1.04, ry * 1.04, rz * .38, 0, 0, 0, S.acc);
      if(sp === 'dragon'){ for(let i = 0; i < 4; i++){ const z = rz * (.5 - i * .38); M.add(G.cone, 0, ry * .92 - Math.abs(z) * .2, z, .055, .12, .05, -.3, 0, 0, S.acc); } }
      if(pony){ for(let i = 0; i < 6; i++) M.add(G.sm, 0, ry * .55 + i * .05, rz * (.55 + i * .07), .09 - i * .006, .1, .08, 0, 0, 0, S.acc); }
      body.add(mesh(M));
      // head
      const hy = pony ? ry * 1.05 + hr * .75 : ry * .5 + hr * .62, hz = pony ? rz * .95 : rz * .6;
      head = piv(body, 0, hy, hz);
      const H = new Merge();
      H.add(SPH, 0, 0, 0, hr * 1.06, hr * .96, hr, 0, 0, 0, S.col);
      if(S.muzzle) H.add(SPH, 0, -hr * .3, hr * .68, hr * .44, hr * .3, hr * .34, 0, 0, 0, S.belly);
      if(pony) H.add(SPH, 0, -hr * .32, hr * .72, hr * .5, hr * .42, hr * .62, .15, 0, 0, S.belly);
      if(sp === 'dragon') H.add(G.sph, 0, -hr * .28, hr * .6, hr * .5, hr * .32, hr * .42, 0, 0, 0, S.col);
      if(pony) for(const s of [-1, 1]) H.add(G.sm, s * hr * .17, -hr * .28, hr * 1.3, hr * .05, hr * .07, hr * .04, 0, 0, 0, S.nose);
      else H.add(G.sm, 0, -hr * .16, hr * 1.0, hr * .11, hr * .08, hr * .07, 0, 0, 0, S.nose);
      if(sp === 'panda') for(const s of [-1, 1]) H.add(G.sph, s * hr * .4, hr * .04, hr * .8, hr * .24, hr * .3, hr * .12, 0, s * .35, s * -.5, S.acc);
      if(sp === 'kitten' || sp === 'fox') for(const s of [-1, 1]) for(const a of [-.12, .08]) H.add(G.cyl8, s * hr * .62, -hr * .2 + a * hr, hr * .78, .006, hr * .3, .006, 0, 0, Math.PI / 2 + s * a * 1.5, 0x8a6a5a);
      faceBits(H, hr, S, { my:pony ? .55 : .4, mz:pony ? 1.04 : .8 });
      if(S.horns) for(const s of [-1, 1]) H.add(G.cone, s * hr * .38, hr * .9, -hr * .1, hr * .11, hr * lerp(.28, .5, k), hr * .11, -.35, 0, s * -.25, 0xfff1c7);
      if(sp === 'dragon') for(const s of [-1, 1]) H.add(G.cone, s * hr * .78, hr * .35, -hr * .2, hr * .09, hr * .3, hr * .05, 0, 0, s * -1.2, S.acc);
      if(pony){ for(let i = 0; i < 5; i++) H.add(G.sm, 0, hr * (.95 - i * .08), -hr * (.05 + i * .2), hr * .22, hr * .2, hr * .2, 0, 0, 0, S.acc); H.add(G.sm, hr * .18, hr * .82, hr * .45, hr * .2, hr * .14, hr * .16, 0, 0, -.4, S.acc); }
      head.add(mesh(H));
      P.eyes = eyes(head, hr, k);
      // ears
      const earCol = sp === 'panda' ? S.acc : sp === 'puppy' ? S.acc : S.col;
      for(const s of [-1, 1]){
        let e;
        if(S.ears === 'cat' || S.ears === 'fox' || pony){
          const big = S.ears === 'fox' ? 1.35 : pony ? .7 : 1;
          e = piv(head, s * hr * .5, hr * .66, -hr * .05); e.rotation.z = s * -.32;
          const E = new Merge(); E.add(G.cone, 0, hr * .2 * big, 0, hr * .27 * big, hr * .48 * big, hr * .14 * big, 0, 0, 0, earCol);
          E.add(G.cone, 0, hr * .17 * big, hr * .06, hr * .16 * big, hr * .32 * big, hr * .06, 0, 0, 0, S.ears === 'fox' ? 0xfff6ec : S.acc);
          if(S.ears === 'fox') E.add(G.cone, 0, hr * .5 * big, 0, hr * .1 * big, hr * .14 * big, hr * .07 * big, 0, 0, 0, S.acc);
          e.add(mesh(E));
        } else if(S.ears === 'flop'){
          e = piv(head, s * hr * .8, hr * .42, -hr * .05); e.rotation.z = s * .25;
          const E = new Merge(); E.add(G.sph, 0, -hr * .32, 0, hr * .22, hr * .46, hr * .3, 0, 0, 0, S.acc); e.add(mesh(E));
        } else if(S.ears === 'long'){
          const len = hr * lerp(.62, .85, k);
          e = piv(head, s * hr * .3, hr * .78, -hr * .1); e.rotation.z = s * -.18; e.rotation.x = -.15;
          const E = new Merge(); E.add(G.sph, 0, len, 0, hr * .19, len, hr * .12, 0, 0, 0, S.col); E.add(G.sph, 0, len, hr * .06, hr * .1, len * .8, hr * .06, 0, 0, 0, S.acc);
          e.add(mesh(E));
        } else if(S.ears === 'round'){
          e = piv(head, s * hr * .64, hr * .66, -hr * .05);
          const E = new Merge(); E.add(G.sph, 0, 0, 0, hr * .25, hr * .25, hr * .15, 0, 0, 0, earCol); e.add(mesh(E));
        }
        if(e){ e.userData.side = s; e.userData.rz = e.rotation.z; P.ears.push(e); }
      }
      // legs
      const lr = lerp(.075, .085, k) * (pony ? .9 : 1), legCol = sp === 'panda' ? S.acc : sp === 'fox' ? S.acc : S.col, paw = pony ? S.acc : sp === 'panda' || sp === 'fox' ? S.acc : S.belly;
      for(const [sx, sz] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]){
        const l = piv(body, sx * rx * .55, ll + .02 - by, sz * rz * .5);
        const E = new Merge(); E.add(G.cyl8, 0, -ll / 2, 0, lr, ll, lr, 0, 0, 0, legCol); E.add(G.sm, 0, -ll + lr * .3, lr * .25, lr * 1.18, lr * .8, lr * 1.3, 0, 0, 0, paw);
        l.add(mesh(E)); P.legs.push(l);
      }
      // tail
      const tp = P.tail = piv(body, 0, ry * .2, -rz * .9), T = new Merge();
      if(S.tail === 'cat'){ for(let i = 0; i < 7; i++){ const a = i / 6; T.add(G.sm, 0, a * .3 * lerp(.8, 1.2, k), -Math.sin(a * 1.6) * .12, .055 - a * .012, .07, .055 - a * .012, 0, 0, 0, i > 4 ? S.belly : S.col); } }
      else if(S.tail === 'wag'){ T.add(G.sph, 0, .06, -.04, .05, .13, .05, -.6, 0, 0, S.col); T.add(G.sm, 0, .15, -.1, .05, .05, .05, 0, 0, 0, S.belly); }
      else if(S.tail === 'pom'){ T.add(G.sph, 0, 0, -.02, .09, .09, .08, 0, 0, 0, sp === 'panda' ? S.col : 0xffffff); }
      else if(S.tail === 'bushy'){ const s2 = lerp(.85, 1.2, k); T.add(G.sph, 0, .1 * s2, -.12 * s2, .12 * s2, .13 * s2, .24 * s2, -.7, 0, 0, S.col); T.add(G.sph, 0, .25 * s2, -.27 * s2, .08 * s2, .08 * s2, .1 * s2, -.7, 0, 0, 0xfff6ec); }
      else if(S.tail === 'dragon'){ for(let i = 0; i < 6; i++){ const a = i / 5; T.add(G.sm, 0, -a * .05, -a * .34 * lerp(.85, 1.2, k), .085 - a * .05, .085 - a * .05, .1, 0, 0, 0, S.col); } T.add(G.cone4, 0, -.06, -.42 * lerp(.85, 1.2, k), .1, .14, .03, -1.57, 0, 0, S.acc); }
      if(pony){ for(let i = 0; i < 5; i++) T.add(G.sm, 0, -i * .07, -i * .05, .07, .1, .07, 0, 0, 0, S.acc); }
      if(!T.empty) tp.add(mesh(T));
      // wings
      if(S.wings){
        for(const s of [-1, 1]){
          const w = piv(body, s * rx * .55, ry * .62, -rz * .05), ws = (S.wings === 'bat' ? .32 : .36) * lerp(.75, 1.25, k);
          const W = new THREE.Mesh(S.wings === 'bat' ? WING_BAT : WING_FEATHER, MAT); W.castShadow = true;
          const geoCol = S.wings === 'bat' ? S.acc : 0xffffff;
          W.geometry = W.geometry.clone(); const n = W.geometry.attributes.position.count, ca = new Float32Array(n * 3); _c.set(S.wings === 'bat' ? geoCol : shade(S.col, 1.08));
          for(let i = 0; i < n; i++){ ca[i * 3] = _c.r; ca[i * 3 + 1] = _c.g; ca[i * 3 + 2] = _c.b; }
          W.geometry.setAttribute('color', new THREE.BufferAttribute(ca, 3));
          W.scale.set(ws * s, ws, ws);
          const wp = piv(w); wp.rotation.y = s * .45; wp.add(W);
          w.userData.side = s; P.wings.push(w);
        }
      }
      P.hr = hr; P.headTop = by + hy + hr;
    } else if(kind === 'bird'){
      const owl = S.beak === 'owl';
      const rx = lerp(.25, .3, k), ry = lerp(.24, .31, k), rz = lerp(.23, .27, k), ll = lerp(.05, .1, k);
      hr = owl ? lerp(.3, .28, k) : lerp(.27, .23, k);
      const by = ll + ry;
      body = piv(root, 0, by, 0);
      const M = new Merge();
      M.add(SPH, 0, 0, 0, rx, ry, rz, 0, 0, 0, S.col);
      M.add(SPH, 0, -ry * .12, rz * .4, rx * .75, ry * .78, rz * .6, 0, 0, 0, S.belly);
      M.add(G.cone, 0, ry * .1, -rz * .95, .08, .16, .05, -1.1, 0, 0, S.col);
      body.add(mesh(M));
      const hy = owl ? ry * .55 + hr * .55 : ry * .7 + hr * .7;
      head = piv(body, 0, hy, owl ? rz * .1 : rz * .2);
      const H = new Merge();
      H.add(SPH, 0, 0, 0, hr * 1.06, hr * .97, hr, 0, 0, 0, S.col);
      if(owl){
        for(const s of [-1, 1]) H.add(G.sph, s * hr * .38, hr * .02, hr * .66, hr * .4, hr * .42, hr * .3, 0, 0, 0, S.belly);
        H.add(G.cone, 0, -hr * .2, hr * .95, hr * .1, hr * .2, hr * .08, Math.PI, 0, 0, S.acc);
        for(const s of [-1, 1]) H.add(G.cone, s * hr * .62, hr * .9, 0, hr * .14, hr * lerp(.25, .42, k), hr * .1, 0, 0, s * -.35, shade(S.col, .8));
      } else {
        H.add(G.sph, 0, -hr * .18, hr * .9, hr * .4, hr * .12, hr * .32, -.1, 0, 0, S.acc);
        for(let i = 0; i < 3; i++) H.add(G.sm, (i - 1) * hr * .12, hr * (.98 + (i === 1 ? .1 : 0)), -hr * .05, hr * .1, hr * lerp(.18, .28, k), hr * .08, 0, 0, (i - 1) * .4, S.col);
      }
      faceBits(H, hr, S, { mouth:false });
      head.add(mesh(H));
      P.eyes = eyes(head, hr, k, owl ? 1.25 : 1, owl ? .04 : .12, owl ? .98 : .84);
      for(const s of [-1, 1]){
        const w = piv(body, s * rx * .95, ry * .15, -rz * .05);
        const W = new Merge(); W.add(G.sph, 0, -ry * .2, 0, .05, ry * lerp(.42, .55, k), rz * .55, 0, 0, s * .15, owl ? shade(S.col, .82) : S.col);
        w.add(mesh(W)); w.userData.side = s; w.userData.flat = true; P.wings.push(w);
      }
      for(const s of [-1, 1]){
        const l = piv(body, s * rx * .42, ll + .02 - by, rz * .1);
        const E = new Merge(); E.add(G.cyl8, 0, -ll / 2, 0, .035, ll, .035, 0, 0, 0, S.acc); E.add(G.sph, 0, -ll, .07, .09, .035, .12, 0, 0, 0, S.acc);
        l.add(mesh(E)); P.legs.push(l);
      }
      P.hr = hr; P.headTop = by + hy + hr;
    } else {          // turtle
      const rs = lerp(.3, .44, k), ll = lerp(.06, .1, k), by = ll + .05;
      hr = lerp(.25, .2, k);
      body = piv(root, 0, by, 0);
      const M = new Merge();
      M.add(G.sph, 0, -.02, 0, rs * .92, .07, rs * 1.0, 0, 0, 0, S.belly);
      M.add(G.hemi, 0, 0, 0, rs, rs * .78, rs * 1.08, 0, 0, 0, S.acc);
      M.add(G.cyl, 0, .01, 0, rs * 1.02, .05, rs * 1.1, 0, 0, 0, 0xd8eda8);
      for(const [x, z, r] of [[0, 0, .3], [.45, .35, .2], [-.45, .35, .2], [.45, -.35, .2], [-.45, -.35, .2], [0, .62, .17], [0, -.62, .17]]){
        const y = Math.sqrt(Math.max(0, 1 - x * x - z * z * .85)) * rs * .78;
        M.add(G.sph, x * rs, y - .015, z * rs * 1.08, rs * r, rs * .09, rs * r, Math.atan2(z, 1) * .2 * 0, 0, 0, shade(S.acc, 1.18));
      }
      M.add(G.cone, 0, 0, -rs * 1.1, .05, .12, .04, -1.57, 0, 0, S.col);
      body.add(mesh(M));
      head = piv(body, 0, .14 + hr * .3, rs * 1.05 + hr * .5);
      const H = new Merge(); H.add(G.sph, 0, 0, 0, hr * 1.05, hr, hr * 1.02, 0, 0, 0, S.col);
      H.add(G.sph, 0, -hr * .65, -hr * .6, hr * .45, hr * .45, hr * .7, .5, 0, 0, S.col);
      faceBits(H, hr, S, { my:.3, mz:.82 }); head.add(mesh(H));
      P.eyes = eyes(head, hr, k, 1.05);
      for(const [sx, sz] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]){
        const l = piv(body, sx * rs * .82, ll + .03 - by, sz * rs * .7);
        const E = new Merge(); E.add(G.sph, 0, -ll * .4, 0, .09, ll + .04, .1, 0, 0, 0, S.col); l.add(mesh(E)); P.legs.push(l);
      }
      P.hr = hr; P.headTop = by + .14 + hr * 1.3;
    }
    P.body = body; P.head = head;
    P.hatPiv = piv(head, 0, hr * .86, 0); P.hatPiv.scale.setScalar(hr);
    const scale = [.74, .9, 1.08][st] * S.size;
    root.scale.setScalar(scale); P.scale = scale;
    P.h = P.headTop * scale; P.r = (kind === 'pony' ? .5 : .4) * scale;
    P.bodyY = body.position.y; P.headRest = head.rotation.x;
    setHat(P, hat);
    return P;
  }
  function disposePet(P){
    if(!P) return;
    P.grp.traverse(o => { if(o.isMesh && o.geometry && o.geometry !== WING_BAT && o.geometry !== WING_FEATHER && !HAT_GEO_SET.has(o.geometry)) o.geometry.dispose(); });
    if(P.grp.parent) P.grp.parent.remove(P.grp);
  }

  /* ---------- pet animation ----------
     a = { t, dt, move (0..1), mode:'idle'|'walk'|'eat'|'sleep'|'bath'|'play'|'happy'|'drink'|'sit', hop (0..1 phase) } */
  function posePet(P, a){
    const t = a.t, m = a.move || 0, mode = a.mode || 'idle', sp = P.sp;
    P.t = t;
    const fly = P.wings.length && !P.wings[0].userData.flat;
    let by = 0, rx = 0, rz = 0, hx = 0, hz = 0, hy = 0, sleep = mode === 'sleep';
    const hopK = sp === 'bunny' ? 9 : sp === 'turtle' ? 7 : 11;
    const hopH = sp === 'bunny' ? .2 : sp === 'turtle' ? .03 : fly ? .14 : .1;
    const ph = t * hopK;
    if(m > .05){ by = Math.abs(Math.sin(ph)) * hopH * m; rx = -Math.cos(ph) * .1 * m; }
    else by = Math.sin(t * 2.4) * .008;
    if(mode === 'happy'){ by = Math.abs(Math.sin(t * 9)) * .28; rz = Math.sin(t * 9) * .1; hx = -.25; }
    if(mode === 'play'){ by = Math.abs(Math.sin(t * 8)) * .22; hx = -.15; }
    if(mode === 'eat' || mode === 'drink'){ hx = .45 + Math.sin(t * 12) * .12; rx = .12; }
    if(mode === 'bath'){ rz = Math.sin(t * 20) * .12; by = .02; }
    if(sleep){ by = -P.bodyY * .35; rx = 0; hx = .35; hz = .3; }
    if(mode === 'sit'){ rx = -.25; by = -.03; }
    P.body.position.y = P.bodyY + by / P.scale;
    P.body.rotation.x = rx; P.body.rotation.z = rz;
    P.head.rotation.x = P.headRest + hx + Math.sin(t * 1.7) * .05 * (sleep ? 0 : 1);
    P.head.rotation.z = hz + (mode === 'idle' ? Math.sin(t * .9) * .12 : 0);
    P.head.rotation.y = mode === 'idle' ? Math.sin(t * .6) * .3 : 0;
    // legs
    P.legs.forEach((l, i) => {
      if(sleep){ l.rotation.x = (i < 2 ? -1 : 1) * .9; return; }
      const off = P.legs.length === 2 ? i * Math.PI : (i === 0 || i === 3 ? 0 : Math.PI);
      l.rotation.x = m > .05 ? Math.sin(ph + off) * .7 * m : mode === 'sit' && i >= 2 ? -1.1 : 0;
    });
    // tail wag
    if(P.tail){
      const wag = mode === 'happy' || mode === 'play' ? 22 : m > .05 ? 14 : 5, amp = mode === 'happy' ? .7 : m > .05 ? .45 : .3;
      P.tail.rotation.y = Math.sin(t * wag) * amp;
      P.tail.rotation.x = sleep ? .4 : -.15 + Math.sin(t * 2) * .08;
    }
    // ears
    P.ears.forEach(e => { e.rotation.z = e.userData.rz + Math.sin(t * 3 + e.userData.side) * .06 + (m > .05 ? Math.sin(ph) * .12 * e.userData.side : 0) + (sleep && sp === 'bunny' ? e.userData.side * .8 : 0); });
    // wings
    P.wings.forEach(w => {
      const s = w.userData.side;
      const flap = mode === 'happy' || mode === 'play' ? Math.sin(t * 24) * .6 : m > .05 ? Math.sin(t * 18) * .5 * m : Math.sin(t * 2) * .08;
      if(w.userData.flat) w.rotation.z = s * (.1 + Math.max(0, flap) * .9);
      else w.rotation.z = s * (.25 + flap);
    });
    // blink (closed while asleep)
    P.blinkT -= a.dt || 0;
    let ey = 1; if(P.blinkT < 0){ ey = .12; if(P.blinkT < -.12) P.blinkT = 2 + Math.random() * 3.5; }
    if(sleep) ey = .1; if(mode === 'happy') ey = .45;
    P.eyes.scale.y = ey;
  }

  /* ---------- hats ---------- */
  const HATS = {
    bow:   { e:'🎀', name:L('فيونكة', 'Bow', 'Fiyonk'), price:20 },
    cap:   { e:'🧢', name:L('كاب', 'Cap', 'Şapka'), price:25 },
    flower:{ e:'🌼', name:L('وردة', 'Flower', 'Çiçek'), price:25 },
    beanie:{ e:'🧶', name:L('طاقية صوف', 'Beanie', 'Bere'), price:30 },
    party: { e:'🥳', name:L('قبعة حفلة', 'Party hat', 'Parti şapkası'), price:35 },
    top:   { e:'🎩', name:L('قبعة طويلة', 'Top hat', 'Silindir şapka'), price:50 },
    crown: { e:'👑', name:L('تاج', 'Crown', 'Taç'), price:80 }
  };
  const HAT_IDS = Object.keys(HATS);
  const HAT_GEO = {}, HAT_GEO_SET = new Set();
  function hatGeo(kind){
    if(HAT_GEO[kind]) return HAT_GEO[kind];
    const M = new Merge();
    if(kind === 'bow'){ const c = 0xff6f9c; M.add(G.sph, -.32, .05, .1, .3, .2, .1, 0, 0, .35, c); M.add(G.sph, .32, .05, .1, .3, .2, .1, 0, 0, -.35, c); M.add(G.sph, 0, .05, .12, .13, .13, .11, 0, 0, 0, shade(c, .85)); }
    else if(kind === 'cap'){ const c = 0x3f8ef0; M.add(G.hemi, 0, -.05, 0, .82, .55, .82, 0, 0, 0, c); M.add(G.cyl, 0, -.04, .55, .62, .04, .55, 0, 0, 0, c); M.add(G.sm, 0, .48, 0, .1, .07, .1, 0, 0, 0, 0xffffff); }
    else if(kind === 'flower'){ for(let i = 0; i < 6; i++){ const a = i / 6 * Math.PI * 2; M.add(G.sph, Math.cos(a) * .2, .08 + Math.sin(a) * .2, .1, .14, .14, .06, 0, 0, a, 0xffffff); } M.add(G.sph, 0, .08, .16, .12, .12, .07, 0, 0, 0, 0xffc42e); }
    else if(kind === 'beanie'){ const c = 0x3cbf7a; M.add(G.hemi, 0, -.12, 0, .86, .72, .86, 0, 0, 0, c); M.add(G.cyl, 0, -.08, 0, .88, .16, .88, 0, 0, 0, shade(c, .85)); M.add(G.sph, 0, .66, 0, .2, .2, .2, 0, 0, 0, shade(c, .85)); }
    else if(kind === 'party'){ const c = 0x9b6bff; M.add(G.cone, 0, .38, 0, .42, .85, .42, 0, 0, 0, c); M.add(G.sph, 0, .84, 0, .14, .14, .14, 0, 0, 0, 0xffffff); M.add(G.torus, 0, -.02, 0, .42, .42, .6, Math.PI / 2, 0, 0, 0xffffff); }
    else if(kind === 'top'){ M.add(G.cyl, 0, .35, 0, .45, .7, .45, 0, 0, 0, 0x2b2840); M.add(G.cyl, 0, .02, 0, .72, .05, .72, 0, 0, 0, 0x2b2840); M.add(G.cyl, 0, .12, 0, .47, .14, .47, 0, 0, 0, 0xe8304f); }
    else if(kind === 'crown'){ const c = 0xffc83a; M.add(G.cyl, 0, .12, 0, .55, .3, .55, 0, 0, 0, c); for(let i = 0; i < 5; i++){ const a = i / 5 * Math.PI * 2; M.add(G.cone, Math.sin(a) * .48, .38, Math.cos(a) * .48, .12, .26, .12, 0, 0, 0, c); M.add(G.sm, Math.sin(a) * .56, .14, Math.cos(a) * .56, .07, .07, .05, 0, a, 0, 0xff5d73); } }
    const g = M.geometry(); HAT_GEO[kind] = g; HAT_GEO_SET.add(g); return g;
  }
  function setHat(P, kind){
    if(P.hat){ P.hatPiv.remove(P.hat); P.hat = null; }
    P.hatKind = HATS[kind] ? kind : null;
    if(!P.hatKind) return;
    const m = new THREE.Mesh(hatGeo(kind), MAT); m.castShadow = true;
    if(kind === 'bow' || kind === 'flower'){ m.position.set(.45, .05, .2); m.rotation.z = -.5; m.scale.setScalar(.85); }
    if(P.kind === 'turtle' || P.sp === 'pony') m.position.z -= .15;
    P.hatPiv.add(m); P.hat = m;
  }

  /* ---------- eggs ---------- */
  const EGGS = {
    basic: { e:'🥚', name:L('بيضة الحديقة', 'Garden egg', 'Bahçe yumurtası'), price:60,  col:'#fff3dc', dot:'#ffc79e', odds:[70, 25, 5, 0] },
    forest:{ e:'🥚', name:L('بيضة الغابة', 'Forest egg', 'Orman yumurtası'), price:160, col:'#b5ecb0', dot:'#5fbf6f', odds:[35, 40, 20, 5] },
    star:  { e:'🥚', name:L('بيضة النجوم', 'Star egg', 'Yıldız yumurtası'),  price:400, col:'#cdb8ff', dot:'#ffd54a', odds:[0, 30, 45, 25], stars:true }
  };
  const EGG_IDS = Object.keys(EGGS);
  const eggGeo = (() => {
    const pts = []; for(let i = 0; i <= 20; i++){ const t = i / 20 * Math.PI, y = -Math.cos(t), r = Math.sin(t) * (1 + .14 * Math.cos(t)) * .74; pts.push(new THREE.Vector2(Math.max(.001, r), y + 1)); }
    return new THREE.LatheGeometry(pts, 24);
  })();
  function drawEgg(x, type, cracks){
    const E = EGGS[type] || EGGS.basic, w = 256, h = 256;
    x.fillStyle = E.col; x.fillRect(0, 0, w, h);
    x.fillStyle = E.dot;
    let s = 7; const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
    for(let i = 0; i < 22; i++){
      const cx = r() * w, cy = 40 + r() * 170, rr = 8 + r() * 10;
      if(E.stars){ x.beginPath(); for(let j = 0; j < 10; j++){ const a = j / 10 * Math.PI * 2 - Math.PI / 2, q = j % 2 ? rr * .45 : rr; x.lineTo(cx + Math.cos(a) * q, cy + Math.sin(a) * q * 1.4); } x.closePath(); x.fill(); }
      else { x.beginPath(); x.ellipse(cx, cy, rr, rr * 1.3, 0, 0, 6.3); x.fill(); }
    }
    if(cracks > 0){
      x.strokeStyle = '#4a3020'; x.lineWidth = 8; x.lineCap = 'round'; x.lineJoin = 'round';
      let q = 3; const rr = () => (q = (q * 48271) % 2147483647) / 2147483647;
      for(let c = 0; c < cracks; c++){
        let px = 20 + c * 51 + rr() * 20, py = 100 + rr() * 40; x.beginPath(); x.moveTo(px, py);
        const n = 3 + c; for(let j = 0; j < n; j++){ px += 12 + rr() * 14; py += (rr() - .5) * 46; x.lineTo(px, py); }
        x.stroke();
      }
    }
  }
  function buildEgg(type){
    const c = document.createElement('canvas'); c.width = c.height = 256;
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
    const mat = new THREE.MeshStandardMaterial({ map:tex, roughness:.45 });
    const m = new THREE.Mesh(eggGeo, mat); m.castShadow = true;
    const egg = { mesh:m, type, cracks:-1, setCracks(n){ if(n === egg.cracks) return; egg.cracks = n; drawEgg(c.getContext('2d'), type, n); tex.needsUpdate = true; }, dispose(){ tex.dispose(); mat.dispose(); } };
    egg.setCracks(0);
    return egg;
  }

  /* ---------- furniture (footprint w×d cells of 1 m, origin at the footprint centre on the floor, front = +z) ---------- */
  const FURN = {
    petbed:   { w:2, d:2, price:0,  need:'sleepy', e:'🛏️', name:L('سرير ناعم', 'Soft bed', 'Yumuşak yatak') },
    cloudbed: { w:2, d:2, price:60, need:'sleepy', e:'☁️', name:L('سرير الغيمة', 'Cloud bed', 'Bulut yatak') },
    foodbowl: { w:1, d:1, price:10, need:'hungry', e:'🍎', name:L('صحن أكل', 'Food bowl', 'Mama kabı') },
    waterbowl:{ w:1, d:1, price:10, need:'thirsty', e:'💧', name:L('صحن مي', 'Water bowl', 'Su kabı') },
    tub:      { w:2, d:2, price:45, need:'dirty', e:'🛁', name:L('بانيو', 'Bathtub', 'Küvet') },
    ball:     { w:1, d:1, price:10, need:'bored', e:'⚽', name:L('طابة', 'Ball', 'Top'), flat:true },
    toybox:   { w:1, d:1, price:30, need:'bored', e:'🧸', name:L('صندوق ألعاب', 'Toy box', 'Oyuncak kutusu') },
    scratch:  { w:1, d:1, price:30, need:'bored', e:'🪵', name:L('عمود لعب', 'Play post', 'Oyun direği') },
    plant:    { w:1, d:1, price:15, e:'🪴', name:L('نبتة', 'Plant', 'Bitki') },
    bigplant: { w:1, d:1, price:25, e:'🌴', name:L('نخلة صغيرة', 'Little palm', 'Küçük palmiye') },
    rugRound: { w:3, d:3, price:20, rug:true, e:'🟠', name:L('سجادة مدوّرة', 'Round rug', 'Yuvarlak halı') },
    rugRect:  { w:3, d:2, price:20, rug:true, e:'🟦', name:L('سجادة', 'Rug', 'Halı') },
    lamp:     { w:1, d:1, price:25, e:'💡', name:L('ضو', 'Lamp', 'Lamba') },
    sofa:     { w:3, d:1, price:50, e:'🛋️', name:L('كنباية', 'Sofa', 'Kanepe') },
    table:    { w:2, d:2, price:35, e:'🪑', name:L('طاولة', 'Table', 'Masa') },
    shelf:    { w:2, d:1, price:40, e:'📚', name:L('مكتبة', 'Bookshelf', 'Kitaplık') },
    nest:     { w:2, d:2, price:0, fixed:true, e:'🪺', name:L('عش البيض', 'Egg nest', 'Yumurta yuvası') }
  };
  const FURN_IDS = Object.keys(FURN).filter(k => !FURN[k].fixed);
  const FGEO = {};
  function furnGeo(k){
    if(FGEO[k]) return FGEO[k];
    const M = new Merge();
    const wood = 0xc98a52, woodD = 0xa86c3c;
    switch(k){
      case 'petbed': M.add(G.cyl, 0, .12, 0, .82, .24, .82, 0, 0, 0, 0xe98b6d); M.add(G.torus, 0, .26, 0, .7, .7, .9, Math.PI / 2, 0, 0, 0xf2a385); M.add(G.sph, 0, .24, 0, .64, .1, .64, 0, 0, 0, 0xffe4cc); break;
      case 'cloudbed': M.add(G.cyl, 0, .1, 0, .8, .2, .8, 0, 0, 0, 0xb9c8ff); for(let i = 0; i < 9; i++){ const a = i / 9 * Math.PI * 2; M.add(G.sph, Math.cos(a) * .72, .28, Math.sin(a) * .72, .26, .22, .26, 0, 0, 0, 0xffffff); } M.add(G.sph, 0, .24, 0, .62, .1, .62, 0, 0, 0, 0xdfe6ff); break;
      case 'foodbowl': M.add(G.cyl, 0, .09, 0, .3, .18, .3, 0, 0, 0, 0xff6b5e); M.add(G.torus, 0, .18, 0, .3, .3, .4, Math.PI / 2, 0, 0, 0xff8a7e); for(let i = 0; i < 7; i++) M.add(G.sm, Math.cos(i * 2.4) * .14 * (i % 3) * .6, .2, Math.sin(i * 2.4) * .14 * (i % 3) * .6, .08, .06, .08, 0, 0, 0, 0xc9803f); break;
      case 'waterbowl': M.add(G.cyl, 0, .09, 0, .3, .18, .3, 0, 0, 0, 0x4aa3ff); M.add(G.torus, 0, .18, 0, .3, .3, .4, Math.PI / 2, 0, 0, 0x73b9ff); M.add(G.cyl, 0, .17, 0, .26, .02, .26, 0, 0, 0, 0xa8e4ff); break;
      case 'tub': M.add(G.box, 0, .32, 0, 1.6, .5, 1.1, 0, 0, 0, 0xf6f7ff); for(const s of [-1, 1]) M.add(G.cyl, s * .8, .32, 0, .55, .5, .55, 0, 0, 0, 0xf6f7ff); M.add(G.box, 0, .56, 0, 1.6, .03, .9, 0, 0, 0, 0x9fdcff);
        for(const [x, z] of [[-.55, -.4], [.55, -.4], [-.55, .4], [.55, .4]]) M.add(G.sm, x, .06, z, .09, .09, .09, 0, 0, 0, 0xffc83a);
        for(let i = 0; i < 8; i++) M.add(G.sm, -.5 + i * .14, .62, Math.sin(i * 1.7) * .25, .1 + (i % 3) * .03, .08, .1, 0, 0, 0, 0xffffff); break;
      case 'ball': M.add(G.sph, 0, .2, 0, .2, .2, .2, 0, 0, 0, 0xff5d73); M.add(G.sm, -.07, .32, .1, .05, .04, .03, 0, 0, 0, 0xffd0d8); break;
      case 'toybox': M.add(G.box, 0, .22, 0, .7, .44, .6, 0, 0, 0, 0x4fb8a8); M.add(G.box, 0, .46, -.2, .74, .06, .3, -.5, 0, 0, 0x3f9c8e); M.add(G.sm, -.12, .5, .05, .13, .13, .13, 0, 0, 0, 0xffc83a); M.add(G.box, .15, .5, 0, .16, .16, .16, 0, .4, 0, 0xff6f9c); break;
      case 'scratch': M.add(G.box, 0, .05, 0, .7, .1, .7, 0, 0, 0, woodD); M.add(G.cyl, 0, .5, 0, .12, .8, .12, 0, 0, 0, 0xe2c08a); M.add(G.box, 0, .92, 0, .55, .08, .55, 0, 0, 0, woodD); M.add(G.cyl8, .2, .78, .2, .01, .2, .01, 0, 0, 0, 0x666666); M.add(G.sm, .2, .66, .2, .07, .07, .07, 0, 0, 0, 0xff6f9c); break;
      case 'plant': M.add(G.cyl, 0, .18, 0, .2, .36, .2, 0, 0, 0, 0xd9784a); M.add(G.torus, 0, .36, 0, .2, .2, .4, Math.PI / 2, 0, 0, 0xc4673c); for(let i = 0; i < 5; i++){ const a = i * 1.26; M.add(G.sph, Math.cos(a) * .12, .5 + (i % 2) * .1, Math.sin(a) * .12, .14, .2, .14, 0, 0, 0, i % 2 ? 0x4fbf5a : 0x3aa64c); } break;
      case 'bigplant': M.add(G.cyl, 0, .24, 0, .24, .48, .24, 0, 0, 0, 0xe8d6b8); M.add(G.cyl8, 0, .8, 0, .05, .7, .05, 0, 0, 0, 0x9a6b3c); for(let i = 0; i < 6; i++){ const a = i / 6 * Math.PI * 2; M.add(G.sph, Math.cos(a) * .32, 1.16, Math.sin(a) * .32, .38, .06, .13, 0, -a, -.4, i % 2 ? 0x46b85a : 0x2f9e48); } break;
      case 'rugRound': M.add(G.cyl, 0, .015, 0, 1.4, .03, 1.4, 0, 0, 0, 0xf6c36a); M.add(G.cyl, 0, .025, 0, .95, .03, .95, 0, 0, 0, 0xffe2a8); break;
      case 'rugRect': M.add(G.box, 0, .015, 0, 2.8, .03, 1.8, 0, 0, 0, 0x6fb3f0); M.add(G.box, 0, .025, 0, 2.5, .03, 1.5, 0, 0, 0, 0xa9d4ff); break;
      case 'lamp': M.add(G.cyl, 0, .03, 0, .22, .06, .22, 0, 0, 0, 0x6a5a8a); M.add(G.cyl8, 0, .7, 0, .035, 1.3, .035, 0, 0, 0, 0x6a5a8a); M.add(G.cone, 0, 1.35, 0, .32, .36, .32, 0, 0, 0, 0xfff1c2); M.add(G.sm, 0, 1.22, 0, .1, .1, .1, 0, 0, 0, 0xffffff); break;
      case 'sofa': M.add(G.box, 0, .24, 0, 2.7, .3, .82, 0, 0, 0, 0xe8724f); M.add(G.box, 0, .58, -.3, 2.7, .62, .22, 0, 0, 0, 0xe8724f); for(const s of [-1, 1]) M.add(G.box, s * 1.28, .45, 0, .2, .44, .82, 0, 0, 0, 0xd8603f);
        for(const s of [-1, 0, 1]) M.add(G.box, s * .82, .44, .06, .76, .12, .62, 0, 0, 0, 0xf6997c); for(const s of [-1, 1]) M.add(G.sph, s * .7, .66, -.12, .3, .22, .1, 0, 0, s * .2, 0xffd38a); break;
      case 'table': M.add(G.cyl, 0, .62, 0, .82, .08, .82, 0, 0, 0, wood); M.add(G.cyl8, 0, .32, 0, .08, .6, .08, 0, 0, 0, woodD); M.add(G.cyl, 0, .03, 0, .4, .06, .4, 0, 0, 0, woodD);
        M.add(G.cyl, .2, .76, 0, .1, .22, .1, 0, 0, 0, 0x7fc8ff); for(let i = 0; i < 3; i++) M.add(G.sph, .2 + (i - 1) * .06, .92, (i - 1) * .04, .06, .06, .06, 0, 0, 0, 0xff8fb0); break;
      case 'shelf': M.add(G.box, 0, .7, -.05, 1.8, 1.4, .5, 0, 0, 0, wood); for(const y of [.35, .8, 1.25]){ M.add(G.box, 0, y, .05, 1.6, .36, .38, 0, 0, 0, 0x7a4f2c);
          for(let i = 0; i < 6; i++){ const hh = .22 + ((i * 7 + y * 10) % 3) * .03; M.add(G.box, -.6 + i * .2 + (y > 1 ? .1 : 0), y - .16 + hh / 2, .08, .14, hh, .28, 0, 0, i === 5 ? .2 : 0, 0x2f9e9a); } } break;
      case 'nest': M.add(G.torus, 0, .18, 0, .72, .72, 1.5, Math.PI / 2, 0, 0, 0xc59a5a); M.add(G.cyl, 0, .08, 0, .7, .14, .7, 0, 0, 0, 0xe2bf7a);
        for(let i = 0; i < 16; i++){ const a = i / 16 * Math.PI * 2; M.add(G.cyl8, Math.cos(a) * .78, .26, Math.sin(a) * .78, .02, .4, .02, .3 * Math.sin(a * 3), 0, 1.2 + .3 * Math.cos(a * 2), 0xe8c785); } break;
    }
    return (FGEO[k] = M.geometry());
  }
  function buildFurn(k){ const m = new THREE.Mesh(furnGeo(k), MAT); m.castShadow = !FURN[k].rug; m.receiveShadow = true; m.userData.k = k; return m; }

  return { MAT, GLOSS, RAR, SPECIES, SP_IDS, STAGES, buildPet, posePet, disposePet, setHat, HATS, HAT_IDS, hatGeo, EGGS, EGG_IDS, buildEgg, FURN, FURN_IDS, buildFurn, shade };
}
