/* Tiny Bobo: blocky models built from soft rounded boxes.
   «بوبو الدبدوب» — our own bear cub hero: honey/golden-orange fur, cream muzzle and belly, heart nose, rosy cheeks,
   big shiny round eyes, a red-and-white striped scarf, a small green explorer cap and a yellow star backpack.
   Also: villagers (frog, hen, bunny shopkeeper, hedgehog), the plush elephant «فيلو», enemies (wind-up mouse, bouncy ball,
   grumpy toy soldier), the wind-up toy cannon, coins, golden buttons, the launch pad, the lost toy drum. */
export function makeModels(THREE, GEO, TX){
  const { rbox } = GEO;
  const lam = () => new THREE.MeshLambertMaterial({ vertexColors:true });
  const MAT = lam();
  /* a small vertex-coloured merge for one part */
  function part(pieces, mat = MAT){
    const B = new GEO.Builder();
    for(const p of pieces){ const [geo, x, y, z, sx = 1, sy = 1, sz = 1, ry = 0, col = 0xffffff, rx = 0, rz = 0] = p; B.add('c', geo, x, y, z, sx, sy, sz, ry, col, 1, rx, rz); }
    const g = new THREE.Group(); const ms = B.meshes({ c:mat }, g); for(const k in ms){ ms[k].castShadow = true; ms[k].receiveShadow = false; ms[k].matrixAutoUpdate = true; }
    return g;
  }
  const R = (w, h, d, r = .05) => rbox(w, h, d, r, 2);
  const SPH = new THREE.SphereGeometry(1, 14, 10), CYL = new THREE.CylinderGeometry(1, 1, 1, 16), CONE = new THREE.ConeGeometry(1, 1, 14), TOR = new THREE.TorusGeometry(1, .3, 8, 20);
  const pivot = (parent, x, y, z) => { const p = new THREE.Group(); p.position.set(x, y, z); parent.add(p); return p; };
  const starShape = (r1, r2) => { const s = new THREE.Shape(); for(let i = 0; i < 10; i++){ const a = i / 10 * Math.PI * 2 + Math.PI / 2, r = i % 2 ? r2 : r1; if(i) s.lineTo(Math.cos(a) * r, Math.sin(a) * r); else s.moveTo(Math.cos(a) * r, Math.sin(a) * r); } return s; };
  const STAR = (() => { const g = new THREE.ExtrudeGeometry(starShape(1, .5), { depth:.35, bevelEnabled:true, bevelThickness:.12, bevelSize:.1, bevelSegments:2 }); g.translate(0, 0, -.17); return g; })();
  const heartShape = () => { const s = new THREE.Shape(); s.moveTo(0, -.9); s.bezierCurveTo(-.2, -.6, -1, -.2, -1, .3); s.bezierCurveTo(-1, .8, -.4, 1, 0, .55); s.bezierCurveTo(.4, 1, 1, .8, 1, .3); s.bezierCurveTo(1, -.2, .2, -.6, 0, -.9); return s; };
  const HEART = (() => { const g = new THREE.ExtrudeGeometry(heartShape(), { depth:.4, bevelEnabled:true, bevelThickness:.15, bevelSize:.12, bevelSegments:2 }); g.translate(0, 0, -.2); return g; })();

  /* faces: drawn on canvas, open + blink versions */
  function faceTex(o, closed){
    return TX.tex(TX.cv(128, 96, (x, w, h) => {
      x.clearRect(0, 0, w, h);
      const ey = o.eyeY || 40, ex = o.eyeX || 30, er = o.eyeR || 15;
      if(o.cheeks){ x.fillStyle = 'rgba(255,110,130,.55)'; for(const s of [-1, 1]){ x.beginPath(); x.ellipse(64 + s * (ex + 12), ey + 22, 12, 7, 0, 0, 7); x.fill(); } }
      for(const s of [-1, 1]){
        const cx = 64 + s * ex;
        if(closed){ x.strokeStyle = '#2a1608'; x.lineWidth = 5; x.lineCap = 'round'; x.beginPath(); x.arc(cx, ey - 2, er * .7, .2 * Math.PI, .8 * Math.PI); x.stroke(); continue; }
        if(o.grumpy){ x.fillStyle = '#fff'; x.beginPath(); x.ellipse(cx, ey, er * .9, er * .75, 0, 0, 7); x.fill(); x.fillStyle = '#1a1008'; x.beginPath(); x.arc(cx, ey + 2, er * .5, 0, 7); x.fill();
          x.strokeStyle = '#1a1008'; x.lineWidth = 6; x.lineCap = 'round'; x.beginPath(); x.moveTo(cx - s * er, ey - er * .9); x.lineTo(cx + s * er * .6, ey - er * .3); x.stroke(); continue; }
        x.fillStyle = o.white ? '#fff' : '#1c0f06'; x.beginPath(); x.ellipse(cx, ey, er, er * 1.1, 0, 0, 7); x.fill();
        if(o.white){ x.fillStyle = '#1c0f06'; x.beginPath(); x.ellipse(cx + s * 1, ey + 2, er * .62, er * .7, 0, 0, 7); x.fill(); }
        x.fillStyle = '#fff'; x.beginPath(); x.arc(cx - er * .3, ey - er * .4, er * .36, 0, 7); x.fill(); x.beginPath(); x.arc(cx + er * .35, ey + er * .35, er * .15, 0, 7); x.fill();
      }
      if(o.brows){ x.strokeStyle = o.brows; x.lineWidth = 4; x.lineCap = 'round'; for(const s of [-1, 1]){ x.beginPath(); x.arc(64 + s * ex, ey - 6, er * 1.2, 1.25 * Math.PI, 1.75 * Math.PI); x.stroke(); } }
      if(o.mouth){ x.strokeStyle = '#4a1a10'; x.lineWidth = 4; x.lineCap = 'round'; x.beginPath();
        if(o.mouth === 'frown') x.arc(64, ey + 34, 10, 1.15 * Math.PI, 1.85 * Math.PI); else x.arc(64, ey + 18, 10, .15 * Math.PI, .85 * Math.PI); x.stroke(); }
    }), false);
  }
  function facePlane(o, w, h){
    const open = faceTex(o, false), shut = faceTex(o, true);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshLambertMaterial({ map:open, transparent:true, depthWrite:false, polygonOffset:true, polygonOffsetFactor:-2 }));
    m.userData = { open, shut }; m.renderOrder = 1;
    return m;
  }

  /* ================= the bear cub ================= */
  const FURS = {
    honey:{ c:0xf0a640, d:0xd98a2a, n:['عسلي', 'Honey', 'Bal'], price:0 },
    caramel:{ c:0xc97a3a, d:0xa85f28, n:['كراميل', 'Caramel', 'Karamel'], price:60 },
    snow:{ c:0xf4f1ea, d:0xd9d3c6, n:['ثلجي', 'Snowy', 'Kar'], price:90 },
    pink:{ c:0xff9fc2, d:0xe57ba3, n:['زهري', 'Pink', 'Pembe'], price:80 },
    mint:{ c:0x8fdcb4, d:0x63bf92, n:['نعناعي', 'Mint', 'Nane'], price:80 },
    berry:{ c:0xa77bff, d:0x855ce0, n:['توتي', 'Berry', 'Böğürtlen'], price:120 },
    gold:{ c:0xffd23f, d:0xe0ad1a, n:['ذهبي', 'Golden', 'Altın'], price:200 }
  };
  const HATS = {
    cap:{ e:'🧢', n:['قبعة مستكشف', 'Explorer cap', 'Kaşif şapkası'], price:0 },
    none:{ e:'🚫', n:['بلا قبعة', 'No hat', 'Şapkasız'], price:0 },
    party:{ e:'🥳', n:['قبعة حفلة', 'Party hat', 'Parti şapkası'], price:40 },
    flower:{ e:'🌼', n:['وردة', 'Flower', 'Çiçek'], price:40 },
    chef:{ e:'👨‍🍳', n:['قبعة طبّاخ', 'Chef hat', 'Aşçı şapkası'], price:70 },
    propeller:{ e:'🚁', n:['قبعة مروحة', 'Propeller cap', 'Pervaneli şapka'], price:100 },
    crown:{ e:'👑', n:['تاج', 'Crown', 'Taç'], price:180 }
  };
  function hatPieces(kind, y0){
    const P = [];
    if(kind === 'cap'){ P.push([R(.6, .16, .5, .06), 0, y0 + .07, -.02, 1, 1, 1, 0, 0x3f9a4a], [R(.42, .05, .26, .025), 0, y0 + .02, .3, 1, 1, 1, 0, 0x2f7f3a], [R(.16, .06, .16, .03), 0, y0 + .17, -.02, 1, 1, 1, 0, 0xf2d34a]); }
    else if(kind === 'party'){ P.push([CONE, 0, y0 + .22, 0, .2, .44, .2, 0, 0xff5fa2], [SPH, 0, y0 + .46, 0, .06, .06, .06, 0, 0xffe14d], [TOR, 0, y0 + .02, 0, .19, .19, .19, 0, 0x5ed6f0, Math.PI / 2]); }
    else if(kind === 'flower'){ for(let i = 0; i < 6; i++){ const a = i / 6 * 6.283; P.push([SPH, .18 + Math.cos(a) * .08, y0 + .04, .1 + Math.sin(a) * .08, .06, .04, .06, 0, 0xffffff]); } P.push([SPH, .18, y0 + .06, .1, .05, .04, .05, 0, 0xffc93d]); }
    else if(kind === 'chef'){ P.push([CYL, 0, y0 + .12, 0, .24, .24, .24, 0, 0xffffff], [SPH, 0, y0 + .3, 0, .3, .17, .3, 0, 0xffffff]); }
    else if(kind === 'propeller'){ P.push([R(.56, .14, .5, .06), 0, y0 + .06, 0, 1, 1, 1, 0, 0xff5a5a], [CYL, 0, y0 + .18, 0, .03, .1, .03, 0, 0x333333]); }
    else if(kind === 'crown'){ P.push([CYL, 0, y0 + .07, 0, .22, .14, .22, 0, 0xf5b700]); for(let i = 0; i < 6; i++){ const a = i / 6 * 6.283; P.push([CONE, Math.cos(a) * .19, y0 + .19, Math.sin(a) * .19, .05, .12, .05, 0, 0xf5b700]); } P.push([SPH, 0, y0 + .08, .22, .04, .04, .03, 0, 0xe8454f]); }
    return P;
  }
  const backpackGeo = () => part([[STAR, 0, 0, 0, .25, .25, .25, 0, 0xffd23f], [SPH, 0, 0, .06, .06, .06, .04, 0, 0xff9a3c], [R(.06, .36, .04, .02), -.14, .06, .14, 1, 1, 1, 0, 0xd9a21a], [R(.06, .36, .04, .02), .14, .06, .14, 1, 1, 1, 0, 0xd9a21a]]);
  function bear(o = {}){
    const fur = FURS[o.fur] || FURS.honey, C = fur.c, D = fur.d, CREAM = 0xfff0d2;
    const root = new THREE.Group(), spin = pivot(root, 0, .55, 0), body = pivot(spin, 0, -.55, 0);
    const torso = pivot(body, 0, .42, 0);
    torso.add(part([[R(.5, .44, .38, .12), 0, 0, 0, 1, 1, 1, 0, C], [R(.3, .28, .06, .05), 0, -.03, .17, 1, 1, 1, 0, CREAM]]));
    // scarf: red/white striped ring + a tail
    const scarf = [];
    for(let i = 0; i < 10; i++){ const a = i / 10 * Math.PI * 2; scarf.push([R(.14, .1, .07, .03), Math.sin(a) * .23, .25, Math.cos(a) * .19, 1, 1, 1, a, i % 2 ? 0xffffff : 0xe8304f]); }
    torso.add(part(scarf));
    const scarfTail = pivot(torso, .12, .22, .2);
    scarfTail.add(part([[R(.1, .1, .05, .025), 0, -.06, 0, 1, 1, 1, 0, 0xe8304f], [R(.1, .1, .05, .025), 0, -.16, 0, 1, 1, 1, 0, 0xffffff], [R(.1, .1, .05, .025), 0, -.26, 0, 1, 1, 1, 0, 0xe8304f]]));
    const head = pivot(body, 0, .9, 0);
    head.add(part([[R(.66, .54, .56, .16), 0, 0, 0, 1, 1, 1, 0, C], [R(.3, .17, .12, .07), 0, -.11, .27, 1, 1, 1, 0, CREAM],
      [HEART, 0, -.06, .345, .06, .05, .06, 0, 0x4a2414]]));
    const ears = [];
    for(const s of [-1, 1]){ const e = pivot(head, s * .25, .24, -.04); e.add(part([[R(.2, .2, .1, .07), 0, .06, 0, 1, 1, 1, 0, C], [R(.11, .11, .04, .04), 0, .06, .05, 1, 1, 1, 0, 0xffc9a0]])); e.rotation.z = -s * .25; ears.push(e); }
    const face = facePlane({ cheeks:true, eyeX:27, eyeY:34, eyeR:15 }, .58, .44); face.position.set(0, .02, .284); head.add(face);
    const hat = pivot(head, 0, .26, 0);
    const arms = [], legs = [];
    for(const s of [-1, 1]){ const a = pivot(body, s * .3, .58, 0); a.add(part([[R(.14, .3, .15, .06), 0, -.13, 0, 1, 1, 1, 0, C], [R(.13, .08, .14, .05), 0, -.27, 0, 1, 1, 1, 0, D]])); a.rotation.z = -s * .15; a.userData.s = s; arms.push(a); }
    for(const s of [-1, 1]){ const l = pivot(body, s * .13, .24, 0); l.add(part([[R(.18, .22, .2, .07), 0, -.1, 0, 1, 1, 1, 0, C], [R(.19, .07, .24, .04), 0, -.2, .03, 1, 1, 1, 0, D]])); legs.push(l); }
    const pack = backpackGeo(); pack.position.set(0, .48, -.27); pack.rotation.y = Math.PI; body.add(pack);
    const h = { grp:root, spin, body, torso, head, ears, face, hat, arms, legs, scarfTail, pack, kind:'bear', hatKind:null, blink:Math.random() * 3, top:1.2 };
    setHat(h, o.hat || 'cap');
    return h;
  }
  function setHat(h, kind){
    if(h.hatKind === kind) return; h.hatKind = kind;
    while(h.hat.children.length) h.hat.remove(h.hat.children[0]);
    const p = hatPieces(kind, 0); if(p.length) h.hat.add(part(p));
    h.prop = kind === 'propeller' ? (() => { const pr = part([[R(.5, .02, .07, .01), 0, 0, 0, 1, 1, 1, 0, 0xffd23f], [R(.07, .02, .5, .01), 0, 0, 0, 1, 1, 1, 0, 0x4fb3ff]]); pr.position.y = .24; h.hat.add(pr); return pr; })() : null;
  }
  /* pose: s = { t, dt, run, air, vy, sq, flip (0..1), spin (0..1), pound, ride } */
  function poseBear(h, s){
    const t = s.t, run = s.air ? 0 : s.run;
    const k = 12;
    const bob = run ? Math.abs(Math.sin(t * k)) * .09 * run : Math.sin(t * 2.6) * .012;
    h.body.position.y = -.55 + bob;
    h.body.rotation.z = run ? Math.sin(t * k) * .06 * run : 0;
    h.body.rotation.x = run * .12;
    h.spin.scale.set(1 - s.sq * .5, 1 + s.sq, 1 - s.sq * .5);
    h.spin.rotation.x = s.flip > 0 ? (1 - s.flip) * Math.PI * 2 : 0;
    h.spin.rotation.y = s.spin > 0 ? (1 - s.spin) * Math.PI * 4 : 0;
    h.head.rotation.x = Math.sin(t * 2.1) * .04 - (s.air ? Math.max(-.2, Math.min(.2, s.vy * .015)) : 0);
    h.head.rotation.z = run ? -Math.sin(t * k) * .05 : Math.sin(t * 1.3) * .04;
    h.ears.forEach((e, i) => { e.rotation.x = Math.sin(t * k * .5 + i) * .15 * run + (s.air ? -.25 : 0); });
    h.scarfTail.rotation.x = -(run * .6 + (s.air ? .8 : 0)) + Math.sin(t * 8) * .1 * (run + .3);
    if(h.prop) h.prop.rotation.y += (s.dt || .016) * (s.air ? 30 : 6);
    const bt = t + h.blink, blink = (bt % 3.4) < .12;
    const fm = h.face.material, want = blink ? h.face.userData.shut : h.face.userData.open;
    if(fm.map !== want){ fm.map = want; fm.needsUpdate = true; }
    if(s.ride){ h.legs.forEach(l => { l.rotation.x = -1.2; }); h.arms.forEach(a => { a.rotation.x = -1.3; a.rotation.z = -a.userData.s * .2; }); return; }
    h.legs.forEach((l, i) => { l.rotation.x = s.air ? (i ? -.6 : .4) : Math.sin(t * k + i * Math.PI) * .85 * run; });
    h.arms.forEach((a, i) => {
      if(s.spin > 0){ a.rotation.x = 0; a.rotation.z = -a.userData.s * 1.45; return; }
      if(s.pound){ a.rotation.x = -2.6; a.rotation.z = -a.userData.s * .3; return; }
      if(s.air){ a.rotation.x = -.5; a.rotation.z = -a.userData.s * (1.2 + Math.sin(t * 12) * .15); }
      else { a.rotation.x = -Math.sin(t * k + i * Math.PI) * .9 * run; a.rotation.z = -a.userData.s * (.15 + Math.sin(t * 2 + i) * .03); }
    });
  }

  /* ================= villagers ================= */
  function animal(kind){
    const root = new THREE.Group(), body = pivot(root, 0, 0, 0);
    let face, top = 1.3, arms = [];
    if(kind === 'frog'){
      body.add(part([[R(.8, .5, .7, .2), 0, .3, 0, 1, 1, 1, 0, 0x6cc84f], [R(.6, .3, .1, .08), 0, .26, .33, 1, 1, 1, 0, 0xd8f5a0], [R(.7, .45, .6, .18), 0, .78, 0, 1, 1, 1, 0, 0x6cc84f],
        [R(.24, .2, .2, .08), -.22, 1.05, .1, 1, 1, 1, 0, 0x6cc84f], [R(.24, .2, .2, .08), .22, 1.05, .1, 1, 1, 1, 0, 0x6cc84f], [R(.3, .12, .3, .05), 0, .03, .25, 1, 1, 1, 0, 0x4fae3a],
        [R(.4, .14, .36, .05), 0, 1.02, -.05, 1, 1, 1, 0, 0xffd23f], [R(.5, .04, .5, .02), 0, .96, -.05, 1, 1, 1, 0, 0xe8b42a]]));
      face = facePlane({ white:true, eyeX:22, eyeY:30, eyeR:13, mouth:'smile', cheeks:true }, .62, .46); face.position.set(0, .92, .31); top = 1.35;
    } else if(kind === 'hen'){
      body.add(part([[R(.7, .65, .7, .25), 0, .45, 0, 1, 1, 1, 0, 0xfff6e8], [R(.5, .5, .5, .18), 0, 1.0, .1, 1, 1, 1, 0, 0xfff6e8], [R(.16, .2, .3, .06), 0, 1.33, .05, 1, 1, 1, 0, 0xe8304f],
        [R(.14, .1, .2, .04), 0, .94, .4, 1, 1, 1, 0, 0xffb43d], [R(.1, .14, .06, .03), 0, .82, .37, 1, 1, 1, 0, 0xe8304f], [R(.1, .3, .1, .03), -.12, .1, 0, 1, 1, 1, 0, 0xffb43d], [R(.1, .3, .1, .03), .12, .1, 0, 1, 1, 1, 0, 0xffb43d],
        [R(.16, .4, .5, .1), -.4, .5, 0, 1, 1, 1, 0, 0xf0e2c8], [R(.16, .4, .5, .1), .4, .5, 0, 1, 1, 1, 0, 0xf0e2c8], [R(.5, .14, .3, .06), 0, .74, .3, 1, 1, 1, 0, 0x6cc4ff]]));
      face = facePlane({ eyeX:16, eyeY:36, eyeR:8, cheeks:true }, .44, .34); face.position.set(0, 1.05, .356); top = 1.5;
    } else if(kind === 'bunny'){
      body.add(part([[R(.6, .6, .5, .2), 0, .4, 0, 1, 1, 1, 0, 0xf4f0ea], [R(.66, .5, .5, .2), 0, .96, 0, 1, 1, 1, 0, 0xf4f0ea], [R(.14, .5, .1, .06), -.15, 1.4, -.05, 1, 1, 1, 0, 0xf4f0ea], [R(.14, .5, .1, .06), .15, 1.4, -.05, 1, 1, 1, 0, 0xf4f0ea],
        [R(.08, .36, .05, .03), -.15, 1.4, 0, 1, 1, 1, 0, 0xffb7c8], [R(.08, .36, .05, .03), .15, 1.4, 0, 1, 1, 1, 0, 0xffb7c8], [R(.5, .4, .1, .06), 0, .45, .26, 1, 1, 1, 0, 0x3fa7e0], [R(.12, .08, .06, .03), 0, .86, .28, 1, 1, 1, 0, 0xff8fb1]]));
      face = facePlane({ eyeX:20, eyeY:32, eyeR:11, cheeks:true, mouth:'smile' }, .56, .42); face.position.set(0, .98, .256); top = 1.75;
    } else if(kind === 'hedgehog'){
      const spikes = []; for(let i = 0; i < 14; i++){ const a = i / 14 * Math.PI * 2; spikes.push([CONE, Math.sin(a) * .3, .55 + Math.cos(a) * .3, -.25, .12, .3, .12, 0, 0x7a5232, Math.cos(a) * -1.2 - .9 * 0, Math.sin(a) * 1.1]); }
      body.add(part([[R(.7, .7, .6, .25), 0, .5, 0, 1, 1, 1, 0, 0x9a6a42], [R(.5, .45, .3, .15), 0, .5, .22, 1, 1, 1, 0, 0xf2d2a8], [SPH, 0, .55, .4, .045, .04, .04, 0, 0x5a3418], ...spikes]));
      face = facePlane({ eyeX:16, eyeY:30, eyeR:9, cheeks:true, mouth:'smile' }, .44, .32); face.position.set(0, .62, .376); top = 1.15;
    } else if(kind === 'elephant'){
      body.add(part([[R(1.1, .9, .9, .32), 0, .55, 0, 1, 1, 1, 0, 0x9fb4d8], [R(1.0, .85, .8, .3), 0, 1.35, .05, 1, 1, 1, 0, 0x9fb4d8],
        [R(.12, .7, .55, .08), -.6, 1.4, -.05, 1, 1, 1, 0, 0x8fa4cc, 0, .2], [R(.12, .7, .55, .08), .6, 1.4, -.05, 1, 1, 1, 0, 0x8fa4cc, 0, -.2],
        [R(.08, .5, .4, .05), -.65, 1.4, 0, 1, 1, 1, 0, 0xffb7c8, 0, .2], [R(.08, .5, .4, .05), .65, 1.4, 0, 1, 1, 1, 0, 0xffb7c8, 0, -.2],
        [R(.24, .5, .24, .1), 0, 1.0, .5, 1, 1, 1, 0, 0x9fb4d8, .35], [R(.3, .3, .3, .1), -.32, .15, .3, 1, 1, 1, 0, 0x8fa4cc], [R(.3, .3, .3, .1), .32, .15, .3, 1, 1, 1, 0, 0x8fa4cc],
        [R(.6, .14, .2, .05), 0, .9, .32, 1, 1, 1, 0, 0xff8fb1], [R(.2, .2, .1, .05), 0, .9, .44, 1, 1, 1, 0, 0xffe14d]]));
      face = facePlane({ eyeX:26, eyeY:30, eyeR:12, cheeks:true }, .8, .5); face.position.set(0, 1.48, .456); top = 2.0;
    }
    if(face) body.add(face);
    return { grp:root, body, face, arms, kind, top, blink:Math.random() * 3 };
  }
  function poseNpc(n, t, talk){
    n.body.position.y = Math.abs(Math.sin(t * (talk ? 6 : 2))) * (talk ? .06 : .03);
    n.body.rotation.z = Math.sin(t * 1.5) * .04;
    const bt = t + n.blink, blink = (bt % 3.9) < .12, fm = n.face.material, want = blink ? n.face.userData.shut : n.face.userData.open;
    if(fm.map !== want){ fm.map = want; fm.needsUpdate = true; }
  }

  /* ================= enemies (cute, harmless) ================= */
  function enemy(kind){
    const root = new THREE.Group(), body = pivot(root, 0, 0, 0); let extra = null, r = .5, h = .7;
    if(kind === 'mouse'){
      body.add(part([[R(.7, .5, 1.0, .22), 0, .32, 0, 1, 1, 1, 0, 0xb9bcc4], [R(.5, .4, .4, .16), 0, .4, .55, 1, 1, 1, 0, 0xb9bcc4], [SPH, 0, .38, .78, .07, .07, .07, 0, 0xff7fa0],
        [R(.26, .26, .06, .08), -.24, .7, .45, 1, 1, 1, 0, 0xb9bcc4], [R(.26, .26, .06, .08), .24, .7, .45, 1, 1, 1, 0, 0xb9bcc4], [R(.16, .16, .03, .05), -.24, .7, .48, 1, 1, 1, 0, 0xffb7c8], [R(.16, .16, .03, .05), .24, .7, .48, 1, 1, 1, 0, 0xffb7c8],
        [CYL, 0, .1, .2, .12, .12, .12, 0, 0x444a55, 0, Math.PI / 2], [CYL, 0, .1, -.3, .12, .12, .12, 0, 0x444a55, 0, Math.PI / 2], [R(.06, .06, .5, .03), 0, .3, -.7, 1, 1, 1, 0, 0xff9fb8, .4]]));
      const f = facePlane({ grumpy:true, eyeX:18, eyeY:44, eyeR:10 }, .4, .3); f.position.set(0, .48, .755); body.add(f); body.userData.face = f;
      extra = part([[R(.06, .3, .06, .02), 0, .15, 0, 1, 1, 1, 0, 0xd9a21a], [R(.36, .2, .05, .05), 0, .36, 0, 1, 1, 1, 0, 0xf5c518]]); extra.position.set(0, .55, -.15); body.add(extra);
      r = .55; h = .8;
    } else if(kind === 'ball'){
      const B = new GEO.Builder(); const g = new THREE.Group();
      body.add(part([[new THREE.SphereGeometry(1, 18, 14), 0, .55, 0, .55, .55, .55, 0, 0xff5a7a], [new THREE.TorusGeometry(1, .08, 8, 26), 0, .55, 0, .56, .56, .56, 0, 0xffffff, Math.PI / 2]]));
      const f = facePlane({ grumpy:true, eyeX:18, eyeY:40, eyeR:10, mouth:'frown' }, .5, .38); f.position.set(0, .62, .6); body.add(f); void B; void g;
      r = .55; h = 1.1;
    } else if(kind === 'soldier'){
      body.add(part([[R(.5, .6, .4, .1), 0, .65, 0, 1, 1, 1, 0, 0x2f5fc0], [R(.52, .1, .42, .03), 0, .4, 0, 1, 1, 1, 0, 0xf5c518], [R(.18, .4, .2, .06), -.13, .2, 0, 1, 1, 1, 0, 0x22252c], [R(.18, .4, .2, .06), .13, .2, 0, 1, 1, 1, 0, 0x22252c],
        [R(.44, .4, .4, .12), 0, 1.15, 0, 1, 1, 1, 0, 0xf7cfae], [R(.4, .5, .4, .1), 0, 1.55, 0, 1, 1, 1, 0, 0xc8282f], [R(.42, .06, .42, .02), 0, 1.32, 0, 1, 1, 1, 0, 0xf5c518], [SPH, 0, 1.82, 0, .07, .07, .07, 0, 0xf5c518],
        [R(.12, .45, .14, .05), -.32, .7, 0, 1, 1, 1, 0, 0x2f5fc0], [R(.12, .45, .14, .05), .32, .7, 0, 1, 1, 1, 0, 0x2f5fc0], [R(.1, .1, .1, .03), 0, .8, .21, 1, 1, 1, 0, 0xf5c518]]));
      const f = facePlane({ grumpy:true, eyeX:14, eyeY:40, eyeR:8, mouth:'frown' }, .4, .3); f.position.set(0, 1.12, .205); body.add(f);
      r = .45; h = 1.9;
    }
    return { grp:root, body, extra, kind, r, h };
  }

  /* ================= the wind-up toy cannon ================= */
  function cannon(){
    const root = new THREE.Group(), body = pivot(root, 0, 0, 0);
    body.add(part([[R(1.8, .6, 2.4, .2), 0, .75, 0, 1, 1, 1, 0, 0x3a7fd8], [R(1.9, .12, 2.5, .05), 0, 1.07, 0, 1, 1, 1, 0, 0xffd23f], [R(1.2, .5, .9, .16), 0, 1.3, -.6, 1, 1, 1, 0, 0xe8304f]]));
    const wheels = [];
    for(const [x, z] of [[-1, .8], [1, .8], [-1, -.8], [1, -.8]]){ const w = pivot(body, x, .5, z); w.add(part([[CYL, 0, 0, 0, .5, .3, .5, 0, 0xffd23f, 0, Math.PI / 2], [CYL, 0, 0, 0, .2, .34, .2, 0, 0xe8304f, 0, Math.PI / 2]])); wheels.push(w); }
    const barrel = pivot(body, 0, 1.5, .1);
    barrel.add(part([[CYL, 0, 0, .6, .36, 1.6, .36, 0, 0x5ed67a, Math.PI / 2], [TOR, 0, 0, 1.4, .36, .36, .36, 0, 0xffd23f], [SPH, 0, 0, -.2, .45, .45, .45, 0, 0x5ed67a]]));
    const key = pivot(body, 0, 1.2, -1.3);
    key.add(part([[CYL, 0, 0, 0, .06, .5, .06, 0, 0xc9a227, Math.PI / 2], [R(.7, .4, .08, .15), 0, 0, -.3, 1, 1, 1, 0, 0xf5c518]]));
    const seat = pivot(body, 0, 1.12, -.1);
    return { grp:root, body, wheels, barrel, key, seat };
  }

  /* ================= collectibles and props ================= */
  /* coin: a thick gold disc with a raised rim and a star — one instanced mesh for all coins */
  const coinGeo = (() => {
    const B = new GEO.Builder(), fs = new THREE.ShapeGeometry(starShape(1, .5));
    B.add('c', new THREE.CylinderGeometry(1, 1, .2, 16), 0, 0, 0, .42, 1, .42, 0, 0xffc928, 1, Math.PI / 2);
    B.add('c', new THREE.TorusGeometry(1, .13, 4, 16), 0, 0, 0, .38, .38, .55, 0, 0xffe27a, 1);
    B.add('c', fs, 0, 0, .105, .17, .17, 1, 0, 0xfff0a0, 1); B.add('c', fs, 0, 0, -.105, .17, .17, 1, Math.PI, 0xfff0a0, 1);
    const g = new THREE.Group(); const m = B.meshes({ c:MAT }, g).c; return m.geometry;
  })();
  const coinMat = new THREE.MeshPhongMaterial({ vertexColors:true, shininess:70, specular:0xfff2b0, emissive:0x8a5a00, emissiveIntensity:.55 });
  const buttonGeo = (() => {
    const B = new GEO.Builder();
    B.add('c', new THREE.CylinderGeometry(1, 1, .22, 24), 0, 0, 0, .5, 1, .5, 0, 0xffc21a, 1, Math.PI / 2);
    B.add('c', new THREE.TorusGeometry(1, .16, 8, 24), 0, 0, .06, .4, .4, .5, 0, 0xffe58a, 1);
    for(const [x, y] of [[-.1, .1], [.1, .1], [-.1, -.1], [.1, -.1]]) B.add('c', new THREE.CylinderGeometry(1, 1, .3, 10), x, y, 0, .055, 1, .055, 0, 0x9a6a08, 1, Math.PI / 2);
    const g = new THREE.Group(); return B.meshes({ c:MAT }, g).c.geometry;
  })();
  function pad(){
    const root = new THREE.Group(), top = pivot(root, 0, 0, 0);
    root.add(part([[CYL, 0, .12, 0, 1.15, .24, 1.15, 0, 0x2f9a4a], [TOR, 0, .25, 0, 1.08, 1.08, 1.08, 0, 0x5ed67a, Math.PI / 2]]));
    const spring = part([[TOR, 0, .32, 0, .55, .55, .55, 0, 0x9aa3ab, Math.PI / 2], [TOR, 0, .44, 0, .55, .55, .55, 0, 0x9aa3ab, Math.PI / 2]]); root.add(spring);
    const arrowTex = TX.tex(TX.cv(128, 128, (x) => { x.fillStyle = '#ffd23f'; x.beginPath(); x.arc(64, 64, 62, 0, 7); x.fill(); x.fillStyle = '#ffe98a'; x.beginPath(); x.arc(64, 64, 52, 0, 7); x.fill();
      x.fillStyle = '#e8304f'; x.beginPath(); x.moveTo(64, 14); x.lineTo(104, 58); x.lineTo(78, 58); x.lineTo(78, 108); x.lineTo(50, 108); x.lineTo(50, 58); x.lineTo(24, 58); x.closePath(); x.fill(); }), false);
    const plate = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, .16, 26), [new THREE.MeshLambertMaterial({ color:0xffc928 }), new THREE.MeshLambertMaterial({ map:arrowTex }), new THREE.MeshLambertMaterial({ color:0xffc928 })]);
    plate.scale.set(1.02, 1, 1.02); plate.position.y = .58; plate.castShadow = true; top.add(plate);
    return { grp:root, top, spring };
  }
  function drum(){
    return part([[CYL, 0, .45, 0, .55, .7, .55, 0, 0xe8304f], [CYL, 0, .82, 0, .57, .06, .57, 0, 0xfff6e0], [CYL, 0, .08, 0, .57, .06, .57, 0, 0xfff6e0], [TOR, 0, .45, 0, .56, .56, .3, 0, 0xffd23f, Math.PI / 2],
      [CYL, .3, 1.0, .1, .04, .5, .04, 0, 0xc98a4b, .3, .5], [SPH, .42, 1.2, .16, .07, .07, .07, 0, 0xffffff]]);
  }
  function bell(){ return part([[new THREE.SphereGeometry(1, 16, 10, 0, 6.283, 0, 1.9), 0, .4, 0, .6, .7, .6, 0, 0xffc928], [SPH, 0, -.05, 0, .15, .15, .15, 0, 0xc98a1a], [TOR, 0, 1.1, 0, .14, .14, .14, 0, 0xc98a1a]]); }
  function flagPole(){ return part([[CYL, 0, 1.2, 0, .07, 2.4, .07, 0, 0xffffff], [SPH, 0, 2.45, 0, .12, .12, .12, 0, 0xffd23f], [R(.9, .55, .05, .04), .48, 2.0, 0, 1, 1, 1, 0, 0xe8304f], [CYL, 0, .1, 0, .35, .2, .35, 0, 0x3a7fd8]]); }
  function crate(){ return part([[R(1.2, 1.2, 1.2, .08), 0, .6, 0, 1, 1, 1, 0, 0xc98a4b], [R(1.25, .2, 1.25, .04), 0, .6, 0, 1, 1, 1, 0, 0x9a6232], [R(.2, 1.25, 1.25, .04), 0, .6, 0, 1, 1, 1, 0, 0x9a6232], [STAR, 0, .6, .64, .25, .25, .1, 0, 0xffd23f]]); }
  function duck(){
    return part([[R(2.6, 1.3, 3.2, .6), 0, .45, 0, 1, 1, 1, 0, 0xffd23f], [R(1.8, 1.6, 1.6, .7), 0, 1.6, .9, 1, 1, 1, 0, 0xffd23f], [R(.9, .3, .7, .14), 0, 1.4, 1.95, 1, 1, 1, 0, 0xff8a1a],
      [SPH, -.55, 1.95, 1.62, .16, .16, .1, 0, 0x1c0f06], [SPH, .55, 1.95, 1.62, .16, .16, .1, 0, 0x1c0f06], [SPH, -.5, 2.0, 1.7, .05, .05, .05, 0, 0xffffff], [SPH, .6, 2.0, 1.7, .05, .05, .05, 0, 0xffffff],
      [R(.8, .5, .8, .2), 0, 1.0, -1.6, 1, 1, 1, 0, 0xffd23f, -.5]]);
  }
  function boat(){
    return part([[R(2.6, .9, 4.4, .3), 0, .3, 0, 1, 1, 1, 0, 0xe8304f], [R(2.2, .2, 4.0, .08), 0, .76, 0, 1, 1, 1, 0, 0xfff6e0], [CYL, 0, 2.2, 0, .1, 3, .1, 0, 0xc98a4b], [new THREE.ConeGeometry(1, 1, 3), .7, 2.4, 0, 1.2, 2.2, .1, 0, 0xffffff]]);
  }
  return { FURS, HATS, bear, setHat, poseBear, animal, poseNpc, enemy, cannon, coinGeo, coinMat, buttonGeo, pad, drum, bell, flagPole, crate, duck, boat, backpackGeo, part, R, STAR, SPH, CYL, CONE, TOR, HEART, facePlane };
}
