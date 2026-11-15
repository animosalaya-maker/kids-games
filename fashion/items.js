/* Bobo Fashion Show («عرض أزياء بوبو 👗») — the wardrobe.
   8 slots (hat, hair accessory, top, bottom/dress, shoes, glasses, cape/backpack, held prop), every piece in 12 single colours
   and 4 simple prints (plain, dots, stars, hearts). Pieces are built as extra layers on top of the 7 characters from worlds/kit.js
   (nothing in the kit is changed). Themes + tag-based scoring (bots dress and vote with it). */
export function makeWardrobe(THREE, K){
  const L = window.L || (a => a);
  const { Merge, CG, starGeo, canvasTex } = K;
  const PI = Math.PI;

  /* ---------- colours (single colours only) and prints ---------- */
  const COLORS = [
    { h:0xff8fb1, n:L('زهري', 'Pink', 'Pembe') }, { h:0xe8304f, n:L('أحمر', 'Red', 'Kırmızı') }, { h:0xff9a3c, n:L('برتقالي', 'Orange', 'Turuncu') },
    { h:0xffd23f, n:L('أصفر', 'Yellow', 'Sarı') }, { h:0x4cc98a, n:L('أخضر', 'Green', 'Yeşil') }, { h:0x6cc4ff, n:L('سماوي', 'Sky blue', 'Açık mavi') },
    { h:0x3a62d0, n:L('أزرق', 'Blue', 'Mavi') }, { h:0x9c7be3, n:L('بنفسجي', 'Purple', 'Mor') }, { h:0xf8f6f2, n:L('أبيض', 'White', 'Beyaz') },
    { h:0x2b2b3a, n:L('أسود', 'Black', 'Siyah') }, { h:0xe2b33c, n:L('ذهبي', 'Gold', 'Altın') }, { h:0x9a6440, n:L('بني', 'Brown', 'Kahverengi') }
  ];
  const PRINTS = [
    { id:'plain', e:'⬜', n:L('سادة', 'Plain', 'Düz'), price:0 },
    { id:'dots', e:'⚪', n:L('منقّط', 'Dots', 'Puantiyeli'), price:0 },
    { id:'stars', e:'⭐', n:L('نجوم', 'Stars', 'Yıldızlı'), price:3 },
    { id:'hearts', e:'💗', n:L('قلوب', 'Hearts', 'Kalpli'), price:3 }
  ];
  const css = c => '#' + COLORS[c].h.toString(16).padStart(6, '0');
  const motifCol = c => c === 8 ? '#ff7fa8' : c === 3 ? '#ff9a3c' : c === 10 ? '#fff6d8' : '#ffffff';
  function drawMotif(x, k, px, py, s){
    x.save(); x.translate(px, py);
    if(k === 1){ x.beginPath(); x.arc(0, 0, s * .55, 0, 6.3); x.fill(); }
    else if(k === 2){ x.beginPath(); for(let i = 0; i < 10; i++){ const a = i / 10 * PI * 2 - PI / 2, r = i % 2 ? s * .4 : s; x.lineTo(Math.cos(a) * r, Math.sin(a) * r); } x.closePath(); x.fill(); }
    else if(k === 3){ x.beginPath(); x.moveTo(0, s * .85); x.bezierCurveTo(-s * 1.4, -s * .1, -s * .55, -s * 1.05, 0, -s * .35); x.bezierCurveTo(s * .55, -s * 1.05, s * 1.4, -s * .1, 0, s * .85); x.fill(); }
    x.restore();
  }
  const texCache = {};
  function printTex(c, p){
    const k = c + '_' + p; if(texCache[k]) return texCache[k];
    const t = canvasTex(128, 128, x => {
      x.fillStyle = css(c); x.fillRect(0, 0, 128, 128); x.fillStyle = motifCol(c);
      for(let r = 0; r < 4; r++) for(let q = 0; q < 4; q++) drawMotif(x, p, q * 32 + (r % 2 ? 24 : 8), r * 32 + 16, 8.5);
    });
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(3, 2); t.anisotropy = 2;
    return (texCache[k] = t);
  }
  const matCache = {};
  function mainMat(c, p){
    const k = c + '_' + p; if(matCache[k]) return matCache[k];
    const m = p ? new THREE.MeshLambertMaterial({ color:0xffffff, map:printTex(c, p), side:THREE.DoubleSide })
                : new THREE.MeshLambertMaterial({ color:COLORS[c].h, side:THREE.DoubleSide });
    return (matCache[k] = K.rimify(m, .22));
  }
  const accMat = K.rimify(new THREE.MeshLambertMaterial({ vertexColors:true, side:THREE.DoubleSide }), .22);
  const glassMat = new THREE.MeshPhongMaterial({ color:0xdff4ff, transparent:true, opacity:.28, shininess:120, specular:0xffffff, depthWrite:false, side:THREE.DoubleSide });
  const glowMat = new THREE.MeshBasicMaterial({ color:0xffe7a0 });
  const tint = (hex, k) => { const c = new THREE.Color(hex); return k > 0 ? c.lerp(new THREE.Color(0xffffff), k).getHex() : c.lerp(new THREE.Color(0x10101a), -k).getHex(); };

  /* ---------- geometry helpers (cached) ---------- */
  const gc = {};
  const geo = (k, f) => gc[k] || (gc[k] = f());
  const cone = (rt, rb, open = false, a0 = 0, al = PI * 2) => geo('c' + rt + '_' + rb + open + a0 + al, () => new THREE.CylinderGeometry(rt, rb, 1, 28, 1, open, a0, al));
  const shell = (t0, tl, p0 = 0, pl = PI * 2) => geo('s' + t0 + '_' + tl + '_' + p0 + '_' + pl, () => new THREE.SphereGeometry(1, 26, 14, p0, pl, t0, tl));
  const torus = (tube, arc = PI * 2) => geo('t' + tube + '_' + arc, () => new THREE.TorusGeometry(1, tube, 8, 28, arc));
  const halfDisc = () => geo('hd', () => new THREE.CylinderGeometry(1, 1, 1, 18, 1, false, -PI / 2, PI));
  const heartGeo = () => geo('heart', () => {
    const s = new THREE.Shape(); s.moveTo(0, -.9); s.bezierCurveTo(-1.5, .1, -.6, 1.1, 0, .4); s.bezierCurveTo(.6, 1.1, 1.5, .1, 0, -.9);
    const g = new THREE.ExtrudeGeometry(s, { depth:.3, bevelEnabled:true, bevelThickness:.08, bevelSize:.06, bevelSegments:1, curveSegments:10 }); g.translate(0, 0, -.15); return g;
  });
  const jarGeo = () => geo('jar', () => new THREE.LatheGeometry([[0, 0], [.55, .05], [.8, .35], [.85, .6], [.6, .95], [.32, 1.15], [.3, 1.35], [.42, 1.42]].map(([x, y]) => new THREE.Vector2(x, y)), 18));
  const capsule = (r, l) => K.capsule(r, l);

  /* ---------- body fits: where clothes go on each character ---------- */
  const KID = {
    hr:.33, hairR:.355, hatY:.24, eyeY:.03, faceZ:.315,
    top:{ sy:.64, sr:[.25, .225, .212], cy:.53, ch:.24, crt:.236, crb:.236, zk:.88 }, neckY:.79, chestZ:.205, backZ:-.2, waistY:.46,
    hip:{ y:.43, h:.17, rt:.226, rb:.226, zk:.9 }, skirtTop:.53, skirtR:.235, floor:.05,
    leg:{ len:.3, r:.065 }, shoe:{ y:-.305, z:.045, r:[.105, .078, .152] }, arm:{ len:.27, r:.058 }, propRX:0, foot:0xf7cfae
  };
  const FIT = {
    sara:KID, sidra:KID, samir:Object.assign({}, KID, { hatY:.26, hairR:.37 }),
    qamar:Object.assign({}, KID, { hr:.37, hairR:.4, hatY:.27, eyeY:.03, faceZ:.35, top:{ sy:.64, sr:[.26, .225, .222], cy:.53, ch:.24, crt:.25, crb:.262, zk:.92 },
      hip:{ y:.41, h:.25, rt:.27, rb:.36, zk:1 }, skirtTop:.55, skirtR:.27, leg:{ len:.3, r:.07 }, shoe:{ y:-.305, z:.045, r:[.112, .082, .16] } }),
    laila:Object.assign({}, KID, { hr:.31, hairR:.36, hatY:.25, eyeY:.02, faceZ:.3, top:{ sy:.72, sr:[.275, .2, .255], cy:.57, ch:.3, crt:.245, crb:.295, zk:.93 },
      neckY:.84, chestZ:.245, backZ:-.245, waistY:.45, hip:{ y:.27, h:.46, rt:.3, rb:.375, zk:.96 }, skirtTop:.5, skirtR:.31, long:true,
      leg:null, shoe:{ y:-.04, z:.09, r:[.098, .07, .158] }, arm:{ len:.26, r:.065 }, foot:0x6b4022 }),
    zaqzouq:Object.assign({}, KID, { hr:.3, hairR:.3, hatY:.2, eyeY:.03, faceZ:.29, top:{ sy:.56, sr:[.245, .24, .225], cy:.41, ch:.14, crt:.232, crb:.222, zk:.92 },
      neckY:.79, chestZ:.22, backZ:-.22, waistY:.36, hip:{ y:.33, h:.14, rt:.226, rb:.215, zk:.92 }, skirtTop:.4, skirtR:.235, floor:.05,
      leg:{ len:.2, r:.06 }, shoe:{ y:-.23, z:.065, r:[.082, .062, .138] }, arm:{ len:.2, r:.05 }, propRX:1.2, foot:0xffa3b6 }),
    mushakis:{ quad:true, hr:.3, hairR:.29, hatY:.19, eyeY:.03, faceZ:.29, leg:{ len:.24, r:.075 }, shoe:{ y:-.26, z:.035, r:[.1, .07, .126] }, foot:0xffd9a8 }
  };
  const fitOf = type => FIT[type] || KID;

  /* ---------- the builder: B.m = main colour/print, B.a = fixed accent colour, B.g = glass, B.x = custom mesh ---------- */
  class UMerge{
    constructor(){ this.p = []; this.n = []; this.u = []; }
    add(g0, x, y, z, sx, sy, sz, rx, ry, rz){
      const g = g0.index ? g0.toNonIndexed() : g0.clone();
      const m = new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new THREE.Vector3(sx, sy, sz));
      g.applyMatrix4(m);
      const pa = g.attributes.position.array, na = g.attributes.normal.array, ua = g.attributes.uv ? g.attributes.uv.array : null;
      for(let i = 0; i < pa.length; i++){ this.p.push(pa[i]); this.n.push(na[i]); }
      if(ua) for(let i = 0; i < ua.length; i++) this.u.push(ua[i]); else for(let i = 0; i < pa.length / 3; i++) this.u.push(0, 0);
      g.dispose();
    }
    geometry(){
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(this.n, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(this.u, 2));
      g.computeBoundingSphere(); return g;
    }
  }
  function builder(c, p){
    const parts = {};   // target → { m:UMerge, a:Merge, g:UMerge, x:[] }
    const T = k => parts[k] || (parts[k] = { m:new UMerge(), a:new Merge(), g:new UMerge(), x:[], nm:0, na:0, ng:0 });
    const B = {
      col:COLORS[c].h, lite:tint(COLORS[c].h, .45), dark:tint(COLORS[c].h, -.35),
      m(t, g, x, y, z, sx = 1, sy = 1, sz = 1, rx = 0, ry = 0, rz = 0){ const q = T(t); q.m.add(g, x, y, z, sx, sy, sz, rx, ry, rz); q.nm++; return B; },
      a(t, g, x, y, z, sx = 1, sy = 1, sz = 1, rx = 0, ry = 0, rz = 0, col = 0xffffff){ const q = T(t); q.a.add(g, x, y, z, sx, sy, sz, rx, ry, rz, col); q.na++; return B; },
      g(t, g, x, y, z, sx = 1, sy = 1, sz = 1, rx = 0, ry = 0, rz = 0){ const q = T(t); q.g.add(g, x, y, z, sx, sy, sz, rx, ry, rz); q.ng++; return B; },
      x(t, mesh){ T(t).x.push(mesh); return B; },
      parts, c, p
    };
    return B;
  }
  /* turn the builder's parts into meshes on a character frame { body, head, arms:[l, r], legs:[...] } */
  function attach(B, fr, out, shadow, f){
    const mm = mainMat(B.c, B.p);
    for(const t in B.parts){
      const q = B.parts[t];
      const targets = t === 'body' ? [fr.body] : t === 'head' ? [fr.head] : t === 'arm' ? fr.arms : t === 'armR' ? (fr.arms.length ? [fr.arms[1]] : [fr.mouth || fr.head]) : t === 'leg' ? fr.legs : [];
      if(!targets.length) continue;
      const geos = [];
      if(q.nm) geos.push([q.m.geometry(), mm]);
      if(q.na) geos.push([q.a.geometry(), accMat]);
      if(q.ng) geos.push([q.g.geometry(), glassMat]);
      targets.forEach((tg, i) => {
        if(!tg) return;
        let host = tg;
        if(t === 'armR'){
          host = new THREE.Group();
          if(!fr.arms.length){ host.position.set(0, -.2, .3); host.rotation.x = -1.3; host.scale.setScalar(.8); }
          else { host.position.set(0, -f.arm.len - .03, .03); host.rotation.x = f.propRX || 0; }
          tg.add(host); out.push(host);
        }
        for(const [g, m] of geos){ const me = new THREE.Mesh(g, m); me.castShadow = shadow && m !== glassMat; if(m === glassMat) me.renderOrder = 3; host.add(me); out.push(me); }
        if(i === 0) for(const x of q.x){ host.add(x); out.push(x); }
        else for(const x of q.x){ const y = x.clone(); host.add(y); out.push(y); }
      });
    }
  }

  /* ---------- pieces shared by several items ---------- */
  function torsoShell(B, f, k = 1, puff = 0){
    if(f.quad){ B.m('body', CG.sph, 0, .465, .08, .29 * k, .27 * k, .27 * k); return; }
    const t = f.top;
    B.m('body', CG.sph, 0, t.sy, 0, t.sr[0] * k, t.sr[1] * k, t.sr[2] * k);
    B.m('body', cone(t.crt * k, t.crb * k), 0, t.cy, 0, 1, t.ch, t.zk);
    if(puff) for(const y of [t.cy - t.ch * .3, t.cy + t.ch * .15, t.sy + .04]) B.m('body', CG.torus, 0, y, 0, (t.crt + .012) * k, (t.crt + .012) * k * t.zk, puff, PI / 2, 0, 0);
  }
  function sleeves(B, f, len, k = 1){
    if(!f.arm) return;
    const r = (f.arm.r + .013) * k, L = f.arm.len * len;
    B.m('arm', capsule(r, Math.max(.01, L - r)), 0, -L / 2 + .01, 0);
  }
  function hips(B, f, k = 1){
    if(f.quad){ B.m('body', CG.sph, 0, .45, -.21, .285 * k, .262 * k, .245 * k); return; }
    const h = f.hip; B.m('body', cone(h.rt * k, h.rb * k), 0, h.y, 0, 1, h.h, h.zk);
  }
  function pantLegs(B, f, len, k = 1){
    if(!f.leg) return;
    const r = (f.leg.r + .017) * k, L = f.leg.len * len;
    B.m('leg', capsule(r, Math.max(.01, L - r)), 0, -L / 2 + .02, 0);
  }
  function skirt(B, f, len, flare){
    if(f.quad){ B.m('body', cone(.27, .27 + flare * .5, true), 0, .45, -.2, 1, .26, 1, PI / 2, 0, 0); return; }
    const top = f.skirtTop, bot = Math.max(f.floor, top - len), r0 = f.skirtR, r1 = r0 + flare;
    B.m('body', cone(r0, r1, true), 0, (top + bot) / 2, 0, 1, top - bot, f.hip.zk);
    B.m('body', CG.cyl, 0, top - .005, 0, r0, .01, r0 * f.hip.zk);
  }
  function shoeBase(B, f, k = 1, sole = null){
    const s = f.shoe;
    B.m('leg', CG.sm, 0, s.y, s.z, s.r[0] * k, s.r[1] * k, s.r[2] * k);
    if(sole != null) B.a('leg', CG.cyl, 0, s.y - s.r[1] * .7, s.z, s.r[0] * k * 1.04, .03, s.r[2] * k * 1.02, 0, 0, 0, sole);
  }
  const eyeX = f => f.hr * .36;
  /* the body point where things hang on the back / sit at the neck */
  const backPt = f => f.quad ? { y:.7, z:-.08 } : { y:f.top.sy - .02, z:f.backZ - .02 };

  /* ---------- the catalogue ---------- */
  const SLOTS = [
    { id:'hat', e:'👒', n:L('قبعة', 'Hat', 'Şapka'), opt:true },
    { id:'hair', e:'🎀', n:L('للشعر', 'Hair', 'Saç'), opt:true },
    { id:'top', e:'👕', n:L('بلوزة', 'Top', 'Üst') },
    { id:'bottom', e:'👗', n:L('تحت / فستان', 'Bottom / dress', 'Alt / elbise') },
    { id:'shoes', e:'👟', n:L('صبابيط', 'Shoes', 'Ayakkabı') },
    { id:'glasses', e:'🕶️', n:L('نضارات', 'Glasses', 'Gözlük'), opt:true },
    { id:'back', e:'🦸', n:L('كاب وشنتة', 'Cape & bag', 'Pelerin ve çanta'), opt:true },
    { id:'prop', e:'🎈', n:L('بإيدك', 'In your hand', 'Elinde'), opt:true }
  ];
  const SLOT_IDS = SLOTS.map(s => s.id);
  const ITEMS = {};
  const item = (slot, id, e, n, tags, price, def, build) => { ITEMS[id] = { id, slot, e, n, tags, price, def, build }; };
  const NONE = slot => item(slot, slot + '_none', '🚫', L('ولا شي', 'Nothing', 'Hiçbiri'), [], 0, 8, null);

  /* hats */
  NONE('hat');
  item('hat', 'sunhat', '👒', L('برنيطة شمس', 'Sun hat', 'Hasır şapka'), ['beach'], 0, 3, (B, f) => {
    const R = f.hairR, y = f.hatY;
    B.m('head', CG.hemi, 0, y, -.01, R * .92, R * .62, R * .92).m('head', CG.cyl, 0, y + .01, 0, R * 1.9, .02, R * 1.9, -.1, 0, 0);
    B.a('head', CG.cyl, 0, y + .05, -.01, R * .93, .06, R * .93, 0, 0, 0, 0xffffff).a('head', CG.sm, R * .7, y + .07, R * .5, .06, .05, .04, 0, 0, 0, 0xff8fb1);
  });
  item('hat', 'cap', '🧢', L('كاب', 'Cap', 'Kep'), ['school', 'beach'], 0, 6, (B, f) => {
    const R = f.hairR, y = f.hatY - .03;
    B.m('head', CG.hemi, 0, y, -.01, R * 1.04, R * .78, R * 1.04).m('head', halfDisc(), 0, y + .01, R * .62, R * .82, .025, R * .82, .1, 0, 0);
    B.a('head', CG.sm, 0, y + R * .78, -.01, .04, .03, .04, 0, 0, 0, B.lite);
  });
  item('hat', 'partyhat', '🥳', L('طاقية حفلة', 'Party hat', 'Parti şapkası'), ['party'], 0, 0, (B, f) => {
    const y = f.hatY + .08;
    B.m('head', CG.cone, .03, y + .17, 0, .16, .4, .16, 0, 0, -.15).a('head', CG.sm, .095, y + .38, 0, .06, .06, .06, 0, 0, 0, 0xffffff);
    B.a('head', CG.torus, .002, y - .03, 0, .155, .155, .25, PI / 2, 0, -.15, 0xffffff);
  });
  item('hat', 'beanie', '🧶', L('طاقية صوف', 'Wool hat', 'Bere'), ['snow'], 0, 1, (B, f) => {
    const R = f.hairR, y = f.hatY - .07;
    B.m('head', CG.hemi, 0, y, -.01, R * 1.05, R * .98, R * 1.05).m('head', CG.cyl, 0, y + .02, -.01, R * 1.09, .1, R * 1.09);
    B.a('head', CG.sph, 0, y + R * .98 + .04, -.01, .085, .085, .085, 0, 0, 0, 0xffffff);
  });
  item('hat', 'grad', '🎓', L('قبعة تخرّج', 'Graduation cap', 'Mezuniyet kepi'), ['school'], 3, 9, (B, f) => {
    const R = f.hairR, y = f.hatY;
    B.m('head', CG.hemi, 0, y - .04, -.01, R * .98, R * .5, R * .98).m('head', CG.box, 0, y + .14, -.01, .56, .03, .56, 0, PI / 4, 0);
    B.a('head', CG.sm, 0, y + .16, -.01, .03, .02, .03, 0, 0, 0, 0xe2b33c).a('head', CG.cyl8, .24, y + .07, .1, .012, .16, .012, 0, 0, 0, 0xe2b33c).a('head', CG.sm, .24, y - .02, .1, .03, .04, .03, 0, 0, 0, 0xe2b33c);
  });
  item('hat', 'crown', '👑', L('تاج', 'Crown', 'Taç'), ['fancy', 'party'], 6, 10, (B, f) => {
    const R = f.hairR * .72, y = f.hatY + .06;
    B.m('head', cone(R, R * .92, true), 0, y, 0, 1, .13, 1);
    for(let i = 0; i < 6; i++){ const a = i / 6 * PI * 2; B.m('head', CG.cone4, Math.sin(a) * R * .98, y + .11, Math.cos(a) * R * .98, .05, .1, .03, 0, a, 0); B.a('head', CG.sm, Math.sin(a) * R * 1.0, y + .17, Math.cos(a) * R * 1.0, .025, .025, .025, 0, 0, 0, 0xffffff); }
    B.a('head', CG.sm, 0, y, R * 1.0, .04, .04, .025, 0, 0, 0, 0xe8304f);
  });
  item('hat', 'tophat', '🎩', L('قبعة طويلة', 'Top hat', 'Silindir şapka'), ['fancy'], 5, 9, (B, f) => {
    const y = f.hatY + .02;
    B.m('head', CG.cyl, 0, y + .17, -.01, .2, .32, .2).m('head', CG.cyl, 0, y + .01, -.01, .32, .025, .32);
    B.a('head', CG.cyl, 0, y + .06, -.01, .205, .06, .205, 0, 0, 0, B.lite);
  });
  item('hat', 'helmet', '👩‍🚀', L('خوذة فضاء', 'Space helmet', 'Uzay kaskı'), ['space'], 6, 8, (B, f) => {
    const R = Math.max(f.hairR, f.hr) * 1.32;
    B.g('head', CG.sph, 0, .02, .02, R, R, R);
    B.m('head', torus(.16), 0, -f.hr * .9, 0, R * .66, R * .66, R * .66, PI / 2, 0, 0).m('head', CG.cyl8, R * .55, R * .65, 0, .02, .2, .02, 0, 0, -.5);
    B.a('head', CG.sm, R * .62, R * .78, 0, .045, .045, .045, 0, 0, 0, 0xe8304f);
  });
  item('hat', 'fez', '🟥', L('طربوش', 'Fez', 'Fes'), ['heritage'], 4, 1, (B, f) => {
    const y = f.hatY + .02;
    B.m('head', cone(.15, .19), 0, y + .11, -.02, 1, .25, 1).m('head', CG.cyl, 0, y + .235, -.02, .15, .01, .15);
    B.a('head', CG.cyl8, .1, y + .14, -.02, .012, .2, .012, 0, 0, .2, 0x2b2b3a).a('head', CG.sm, .12, y + .03, -.02, .035, .05, .035, 0, 0, 0, 0x2b2b3a);
  });

  /* hair accessories */
  NONE('hair');
  item('hair', 'bow', '🎀', L('فيونكة', 'Bow', 'Fiyonk'), ['party', 'school', 'fancy'], 0, 0, (B, f) => {
    const x = f.hairR * .55, y = f.hr * .78;
    B.m('head', CG.sph, x - .07, y, -.04, .085, .06, .035, 0, .3, .5).m('head', CG.sph, x + .07, y + .06, -.04, .085, .06, .035, 0, .3, .5).m('head', CG.sph, x, y + .03, -.03, .04, .04, .04);
  });
  item('hair', 'flower', '🌸', L('وردة', 'Flower', 'Çiçek'), ['beach', 'heritage', 'party'], 0, 0, (B, f) => {
    const x = f.hairR * .86, y = f.hr * .4, z = .1;
    for(let i = 0; i < 5; i++){ const a = i / 5 * PI * 2; B.m('head', CG.sph, x + .02, y + Math.sin(a) * .055, z + Math.cos(a) * .055, .03, .045, .045, a, 0, 0); }
    B.a('head', CG.sm, x + .04, y, z, .03, .03, .03, 0, 0, 0, 0xffd23f);
  });
  item('hair', 'starclips', '⭐', L('مشابك نجوم', 'Star clips', 'Yıldız tokalar'), ['space', 'party'], 0, 3, (B, f) => {
    for(const s of [-1, 1]) B.m('head', starGeo, s * f.hairR * .72, f.hr * .62, .12, .065, .065, .05, -.4, s * .5, s * .3);
  });
  item('hair', 'headband', '🎽', L('طوق', 'Headband', 'Saç bandı'), ['school', 'hero'], 0, 5, (B, f) => {
    const R = f.hairR * 1.0;
    B.m('head', torus(.09, PI), 0, f.hr * .05, .02, R, R, R * .9, -.35, 0, 0);
  });
  item('hair', 'earmuffs', '🎧', L('دفّاية دينين', 'Earmuffs', 'Kulaklık'), ['snow'], 3, 0, (B, f) => {
    const R = f.hairR;
    for(const s of [-1, 1]) B.m('head', CG.sph, s * R * .98, -.02, .02, .07, .1, .1);
    B.a('head', torus(.06, PI), 0, -.02, .02, R * .98, R * 1.05, R, 0, 0, 0, B.dark);
  });
  item('hair', 'tiara', '💎', L('تاج صغير', 'Tiara', 'Tiara'), ['fancy', 'party'], 5, 10, (B, f) => {
    const R = f.hairR * .95, y = f.hr * .55;
    B.m('head', torus(.05, PI * .8), 0, y, .02, R * .85, R * .85, R * .85, -PI / 2 + .35, 0, PI * .1);
    for(const a of [-.45, 0, .45]) B.m('head', CG.cone4, Math.sin(a) * R * .8, y + .08 + (a ? 0 : .03), Math.cos(a) * R * .6, .04, a ? .09 : .13, .02, -.3, a, 0);
    B.a('head', CG.sm, 0, y + .05, R * .62, .03, .03, .02, 0, 0, 0, 0xffffff);
  });
  item('hair', 'antenna', '👽', L('قرون فضائية', 'Antennae', 'Anten'), ['space'], 4, 4, (B, f) => {
    const R = f.hairR;
    B.a('head', torus(.08, PI), 0, f.hr * .1, 0, R, R, R * .9, -.15, 0, 0, B.dark);
    for(const s of [-1, 1]){ B.a('head', CG.cyl8, s * R * .4, R * .95, 0, .012, .25, .012, 0, 0, -s * .3, B.dark); B.m('head', CG.sph, s * R * .45, R * 1.08, 0, .055, .055, .055); }
  });
  item('hair', 'shell', '🐚', L('صدفة', 'Seashell', 'Deniz kabuğu'), ['beach'], 3, 8, (B, f) => {
    const x = f.hairR * .84, y = f.hr * .45;
    B.m('head', shell(0, PI / 2, -PI / 2, PI), x, y, .06, .09, .1, .03, PI / 2 - .3, PI / 2, 0);
    for(const a of [-.6, -.2, .2, .6]) B.a('head', CG.cyl8, x + .015, y + Math.cos(a) * .045, .06 + Math.sin(a) * .045, .006, .1, .006, a, 0, 0, B.dark);
  });
  item('hair', 'asba', '🪙', L('عصبة ليرات', 'Coin headband', 'Altınlı taç'), ['heritage'], 4, 1, (B, f) => {
    const R = f.hairR * 1.01, y = f.hr * .35;
    B.m('head', torus(.06, PI * 1.1), 0, y, 0, R, R, R, PI / 2, 0, PI * -.05);
    for(let i = -3; i <= 3; i++){ const a = i * .28; B.a('head', CG.cyl, Math.sin(a) * R * 1.02, y - .05, Math.cos(a) * R * 1.02, .03, .008, .03, PI / 2, a, 0, 0xe2b33c); }
  });

  /* tops */
  item('top', 'tee', '👕', L('تيشيرت', 'T-shirt', 'Tişört'), ['school', 'beach', 'basic'], 0, 8, (B, f) => {
    torsoShell(B, f); sleeves(B, f, .38);
    if(!f.quad) B.a('body', CG.torus, 0, f.neckY - .03, .01, .085, .075, .25, PI / 2, 0, 0, B.dark);
  });
  item('top', 'hoodie', '🧥', L('هودي', 'Hoodie', 'Kapüşonlu'), ['school', 'snow'], 0, 7, (B, f) => {
    torsoShell(B, f, 1.03); sleeves(B, f, .88, 1.05);
    const bp = backPt(f);
    B.m('body', CG.sph, 0, bp.y + .1, bp.z + .03, .18, .13, .09);
    if(!f.quad){ B.a('body', CG.box, 0, f.top.cy - .02, f.chestZ * f.top.zk + .03, .2, .09, .02, 0, 0, 0, B.dark); for(const s of [-1, 1]) B.a('body', CG.cyl8, s * .04, f.top.sy - .02, f.chestZ + .025, .008, .12, .008, 0, 0, 0, 0xffffff); }
  });
  item('top', 'puffer', '🧥', L('جاكيت منفوخ', 'Puffer jacket', 'Şişme mont'), ['snow'], 0, 5, (B, f) => {
    torsoShell(B, f, 1.1, .2); sleeves(B, f, .9, 1.3);
    if(!f.quad) B.m('body', cone(.13, .16), 0, f.neckY - .02, 0, 1, .1, .9);
    else B.m('body', CG.torus, 0, .62, .17, .16, .14, .5, PI / 2 - .3, 0, 0);
  });
  item('top', 'herosuit', '🦸', L('بدلة بطل', 'Hero suit', 'Kahraman giysisi'), ['hero'], 0, 1, (B, f) => {
    torsoShell(B, f); sleeves(B, f, .92);
    if(f.quad){ B.a('body', starGeo, 0, .5, .36, .07, .07, .05, -.3, 0, 0, 0xffd23f); return; }
    B.a('body', CG.cyl, 0, f.top.sy - .02, f.chestZ * 1.0 + .015, .085, .02, .085, PI / 2, 0, 0, 0xffffff).a('body', starGeo, 0, f.top.sy - .02, f.chestZ + .03, .06, .06, .04, 0, 0, 0, B.col === 0xe2b33c ? 0xe8304f : 0xe2b33c);
    B.a('body', cone(f.top.crb + .012, f.top.crb + .012), 0, f.top.cy - f.top.ch * .4, 0, 1, .05, f.top.zk, 0, 0, 0, 0xe2b33c);
  });
  item('top', 'rash', '🏄', L('بلوزة سباحة', 'Swim shirt', 'Yüzme tişörtü'), ['beach', 'sport'], 0, 5, (B, f) => {
    torsoShell(B, f, .99); sleeves(B, f, .9, .95);
    if(!f.quad) B.a('body', CG.box, 0, f.top.sy - .02, f.chestZ + .005, .02, .2, .02, -.1, 0, 0, 0xffffff).a('body', CG.cyl, 0, f.neckY - .02, 0, .1, .06, .1, 0, 0, 0, B.lite);
  });
  item('top', 'blouse', '👚', L('بلوزة كشكش', 'Frilly blouse', 'Fırfırlı bluz'), ['party', 'fancy', 'school'], 3, 0, (B, f) => {
    torsoShell(B, f); if(f.arm){ B.m('arm', CG.sph, 0, -.04, 0, .1, .1, .1); sleeves(B, f, .85, .95); }
    if(f.quad){ B.a('body', CG.torus, 0, .62, .17, .15, .13, .5, PI / 2 - .3, 0, 0, 0xffffff); return; }
    B.a('body', CG.torus, 0, f.neckY - .03, .01, .11, .1, .45, PI / 2, 0, 0, 0xffffff);
    for(const y of [.02, -.06, -.14]) B.a('body', CG.sm, 0, f.top.sy + y, f.chestZ + .015, .02, .02, .01, 0, 0, 0, 0xffffff);
  });
  item('top', 'spacesuit', '🧑‍🚀', L('بدلة فضاء', 'Space suit', 'Uzay giysisi'), ['space'], 5, 8, (B, f) => {
    torsoShell(B, f, 1.08); sleeves(B, f, .92, 1.25);
    if(f.arm) B.a('arm', CG.cyl, 0, -f.arm.len * .78, 0, .085, .04, .085, 0, 0, 0, B.dark);
    if(f.quad){ B.a('body', CG.box, 0, .5, .35, .14, .1, .03, -.4, 0, 0, 0x3a62d0); return; }
    B.a('body', CG.box, 0, f.top.sy - .06, f.chestZ * 1.08 + .015, .17, .12, .03, 0, 0, 0, 0x50607a);
    for(const x of [-.045, 0, .045]) B.a('body', CG.sm, x, f.top.sy - .06, f.chestZ * 1.08 + .035, .016, .016, .01, 0, 0, 0, 0x6cc4ff);
    B.a('body', CG.torus, 0, f.neckY - .02, 0, .13, .12, .35, PI / 2, 0, 0, B.dark);
  });
  item('top', 'vest', '🏺', L('صدرية مطرّزة', 'Embroidered vest', 'İşlemeli yelek'), ['heritage'], 4, 1, (B, f) => {
    torsoShell(B, f);
    if(f.arm) B.a('arm', capsule(f.arm.r + .012, f.arm.len * .85), 0, -f.arm.len * .44, 0, 1, 1, 1, 0, 0, 0, 0xf8f6f2);
    if(f.quad){ B.a('body', CG.torus, 0, .5, .24, .14, .12, .25, PI / 2 - .3, 0, 0, 0xe2b33c); return; }
    for(const s of [-1, 1]){ B.a('body', CG.box, s * .05, f.top.sy - .06, f.chestZ + .012, .018, .26, .015, 0, 0, -s * .12, 0xe2b33c); for(const y of [-.12, -.03, .06]) B.a('body', CG.sm, s * .11, f.top.sy + y, f.chestZ - .015, .022, .022, .012, 0, s * .4, 0, 0xe2b33c); }
  });
  item('top', 'jacket', '✨', L('جاكيت حفلات', 'Party jacket', 'Parti ceketi'), ['fancy', 'party'], 5, 7, (B, f) => {
    torsoShell(B, f, 1.04); sleeves(B, f, .9, 1.08);
    if(f.quad){ B.a('body', CG.torus, 0, .62, .17, .15, .13, .4, PI / 2 - .3, 0, 0, 0xe2b33c); return; }
    for(const s of [-1, 1]) B.a('body', CG.box, s * .07, f.top.sy - .01, f.chestZ * 1.04 + .01, .05, .2, .015, 0, 0, s * .35, B.lite);
    for(const y of [-.1, -.18]) B.a('body', CG.sm, 0, f.top.sy + y, f.chestZ * 1.04 + .012, .022, .022, .012, 0, 0, 0, 0xe2b33c);
  });

  /* bottoms and dresses */
  item('bottom', 'pants', '👖', L('بنطلون', 'Trousers', 'Pantolon'), ['school', 'snow', 'basic'], 0, 6, (B, f) => { hips(B, f); pantLegs(B, f, .9); });
  item('bottom', 'shorts', '🩳', L('شورت للركبة', 'Knee shorts', 'Diz şort'), ['beach', 'sport'], 0, 5, (B, f) => { hips(B, f); pantLegs(B, f, .5); });
  item('bottom', 'skirt', '🩷', L('تنورة', 'Skirt', 'Etek'), ['school', 'party'], 0, 0, (B, f) => { if(f.quad){ hips(B, f, .98); skirt(B, f, 0, .12); return; } hips(B, f, .99); skirt(B, f, f.long ? .45 : .22, f.long ? .06 : .11); if(!f.long) pantLegs(B, f, .25, .9); });
  item('bottom', 'herotights', '🦸', L('بنطلون بطل', 'Hero trousers', 'Kahraman pantolonu'), ['hero'], 0, 6, (B, f) => {
    hips(B, f); pantLegs(B, f, .92, .96);
    if(f.leg && !f.quad) B.a('leg', starGeo, f.leg.r + .02, -.08, 0, .035, .035, .025, 0, PI / 2, 0, 0xe2b33c);
  });
  item('bottom', 'gown', '👗', L('فستان طويل', 'Long dress', 'Uzun elbise'), ['fancy', 'party'], 4, 7, (B, f) => {
    if(f.quad){ hips(B, f); skirt(B, f, 0, .2); return; }
    hips(B, f, 1.01); skirt(B, f, 1, f.long ? .14 : .2);
    B.a('body', cone(f.skirtR + .012, f.skirtR + .012), 0, f.skirtTop - .02, 0, 1, .05, f.hip.zk, 0, 0, 0, B.lite);
    B.a('body', CG.sph, .1, f.skirtTop - .02, f.skirtR * f.hip.zk, .05, .04, .03, 0, 0, 0, B.lite);
  });
  item('bottom', 'snowpants', '⛄', L('بنطلون تلج', 'Snow trousers', 'Kar pantolonu'), ['snow'], 3, 1, (B, f) => { hips(B, f, 1.08); pantLegs(B, f, .92, 1.3); if(f.leg) B.a('leg', CG.torus, 0, -f.leg.len * .78, 0, f.leg.r + .03, f.leg.r + .03, .3, PI / 2, 0, 0, 0xffffff); });
  item('bottom', 'spacepants', '🚀', L('بنطلون فضاء', 'Space trousers', 'Uzay pantolonu'), ['space'], 4, 8, (B, f) => {
    hips(B, f, 1.04); pantLegs(B, f, .92, 1.2);
    if(f.leg) B.a('leg', CG.sph, 0, -f.leg.len * .5, .07, .055, .05, .03, 0, 0, 0, 0x50607a);
    if(!f.quad && f.hip) B.a('body', cone(f.hip.rt * 1.05, f.hip.rt * 1.05), 0, f.hip.y + f.hip.h * .4, 0, 1, .04, f.hip.zk, 0, 0, 0, 0x50607a);
  });
  item('bottom', 'thobe', '🏺', L('ثوب مطرّز', 'Embroidered dress', 'İşlemeli elbise'), ['heritage'], 5, 9, (B, f) => {
    if(f.quad){ hips(B, f); skirt(B, f, 0, .18); B.a('body', CG.torus, 0, .45, -.43, .3, .3, .2, 0, 0, 0, 0xe2b33c); return; }
    hips(B, f, 1.01); skirt(B, f, 1, .1);
    const bot = Math.max(f.floor, f.skirtTop - 1), r1 = f.skirtR + .1;
    B.a('body', cone(r1 + .006, r1 + .006, true), 0, bot + .04, 0, 1, .045, f.hip.zk, 0, 0, 0, B.col === 0xe2b33c ? 0xe8304f : 0xe2b33c);
    B.a('body', CG.box, 0, (f.skirtTop + bot) / 2 + .05, (f.skirtR + .06) * f.hip.zk, .1, (f.skirtTop - bot) * .55, .01, -.1, 0, 0, B.col === 0xe2b33c ? 0xe8304f : 0xe2b33c);
  });

  /* shoes */
  item('shoes', 'sneakers', '👟', L('سبور', 'Sneakers', 'Spor ayakkabı'), ['school', 'sport', 'basic'], 0, 8, (B, f) => {
    shoeBase(B, f, 1, 0xffffff); const s = f.shoe;
    B.a('leg', CG.box, 0, s.y + s.r[1] * .75, s.z + s.r[2] * .35, s.r[0] * 1.1, .012, .02, 0, 0, 0, B.dark);
  });
  item('shoes', 'sandals', '🩴', L('صندل', 'Sandals', 'Sandalet'), ['beach'], 0, 11, (B, f) => {
    const s = f.shoe;
    B.a('leg', CG.sm, 0, s.y + .005, s.z, s.r[0] * 1.06, s.r[1] * 1.04, s.r[2] * 1.04, 0, 0, 0, f.foot);
    B.m('leg', CG.cyl, 0, s.y - s.r[1] * .75, s.z, s.r[0] * 1.15, .03, s.r[2] * 1.15).m('leg', CG.torus, 0, s.y, s.z + s.r[2] * .3, s.r[0] * .95, s.r[1] * 1.0, .2, 0, 0, 0);
  });
  item('shoes', 'boots', '🥾', L('جزمة', 'Boots', 'Çizme'), ['snow', 'hero'], 0, 1, (B, f) => {
    shoeBase(B, f, 1.05);
    if(f.leg) B.m('leg', capsule(f.leg.r + .025, f.leg.len * .35), 0, -f.leg.len * .78, 0);
    if(f.leg) B.a('leg', CG.torus, 0, -f.leg.len * .55, 0, f.leg.r + .03, f.leg.r + .03, .4, PI / 2, 0, 0, B.lite);
  });
  item('shoes', 'flats', '🥿', L('صبابيط حفلة', 'Party shoes', 'Parti ayakkabısı'), ['party', 'fancy'], 3, 0, (B, f) => {
    shoeBase(B, f, 1.02); const s = f.shoe;
    B.a('leg', CG.sm, 0, s.y + s.r[1] * .7, s.z + s.r[2] * .6, .035, .025, .02, 0, 0, 0, 0xffffff).a('leg', CG.sm, 0, s.y + s.r[1] * .75, s.z + s.r[2] * .4, .02, .02, .02, 0, 0, 0, 0xffffff);
  });
  item('shoes', 'spaceboots', '🚀', L('جزمة فضاء', 'Space boots', 'Uzay botu'), ['space'], 4, 8, (B, f) => {
    shoeBase(B, f, 1.15, 0x50607a);
    if(f.leg) B.m('leg', capsule(f.leg.r + .035, f.leg.len * .3), 0, -f.leg.len * .8, 0).a('leg', CG.torus, 0, -f.leg.len * .62, 0, f.leg.r + .04, f.leg.r + .04, .35, PI / 2, 0, 0, 0x50607a);
  });
  item('shoes', 'slippers', '🏺', L('بابوج', 'Slippers', 'Yemeni'), ['heritage'], 3, 1, (B, f) => {
    shoeBase(B, f, 1.03); const s = f.shoe;
    B.m('leg', CG.cone, 0, s.y + .015, s.z + s.r[2] * 1.15, s.r[0] * .5, s.r[2] * .7, s.r[1] * .6, PI / 2 + .35, 0, 0);
    B.a('leg', CG.torus, 0, s.y + s.r[1] * .25, s.z - s.r[2] * .1, s.r[0] * 1.02, s.r[2] * .95, .12, PI / 2, 0, 0, 0xe2b33c);
  });

  /* glasses */
  NONE('glasses');
  const lens = (B, f, r, main) => { for(const s of [-1, 1]){ if(main) B.m('head', CG.cyl, s * eyeX(f), f.eyeY, f.faceZ + .03, r, .012, r, PI / 2, 0, 0); else B.g('head', CG.cyl, s * eyeX(f), f.eyeY, f.faceZ + .03, r, .01, r, PI / 2, 0, 0); } };
  const temples = (B, f, col) => { for(const s of [-1, 1]) B.a('head', CG.box, s * f.hr * .78, f.eyeY + .01, f.faceZ * .55, .014, .014, f.faceZ * .8, 0, -s * .12, 0, col); B.a('head', CG.box, 0, f.eyeY + .02, f.faceZ + .04, .06, .012, .012, 0, 0, 0, col); };
  item('glasses', 'sunglasses', '🕶️', L('نضارة شمس', 'Sunglasses', 'Güneş gözlüğü'), ['beach', 'fancy'], 0, 9, (B, f) => {
    for(const s of [-1, 1]) B.m('head', CG.sph, s * eyeX(f), f.eyeY, f.faceZ + .025, f.hr * .27, f.hr * .22, .03); temples(B, f, 0x2b2b3a);
  });
  item('glasses', 'round', '👓', L('نضارة مدوّرة', 'Round glasses', 'Yuvarlak gözlük'), ['school'], 0, 11, (B, f) => {
    for(const s of [-1, 1]) B.m('head', CG.torus, s * eyeX(f), f.eyeY, f.faceZ + .03, f.hr * .27, f.hr * .27, .55); lens(B, f, f.hr * .25, false); temples(B, f, B.dark);
  });
  let maskTex = null;
  item('glasses', 'heromask', '🦹', L('قناع بطل', 'Hero mask', 'Kahraman maskesi'), ['hero'], 0, 9, (B, f) => {
    if(!maskTex) maskTex = canvasTex(256, 192, x => {
      // same face patch mapping as the kit's faces (eyes at x 82/174, y 100)
      x.fillStyle = '#fff'; x.beginPath(); x.ellipse(128, 104, 112, 40, 0, 0, 6.3); x.fill();
      x.globalCompositeOperation = 'destination-out'; for(const s of [-1, 1]){ x.beginPath(); x.ellipse(128 + s * 46, 100, 26, 29, 0, 0, 6.3); x.fill(); }
    });
    const g = new THREE.SphereGeometry(f.hr * 1.03, 26, 18, PI / 2 - 1, 2, .7, 1.5);
    const m = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ map:maskTex, color:B.col, transparent:true, alphaTest:.5, side:THREE.DoubleSide, depthWrite:true }));
    if(f.quad) m.scale.set(1.08, .94, 1); else m.scale.z = .97;
    B.x('head', m);
  });
  item('glasses', 'goggles', '🥽', L('نضارة تزلّج', 'Ski goggles', 'Kayak gözlüğü'), ['snow'], 3, 5, (B, f) => {
    B.m('head', CG.box, 0, f.eyeY + .01, f.faceZ + .025, f.hr * 1.15, f.hr * .45, .05).a('head', CG.box, 0, f.eyeY + .01, f.faceZ + .055, f.hr * 1.0, f.hr * .33, .02, 0, 0, 0, 0xffb347);
    B.a('head', torus(.08), 0, f.eyeY + .02, 0, f.hairR * 1.0, f.hairR * 1.0, .3, PI / 2, 0, 0, B.dark);
  });
  item('glasses', 'starglasses', '🤩', L('نضارة نجوم', 'Star glasses', 'Yıldız gözlük'), ['party', 'space'], 3, 3, (B, f) => {
    for(const s of [-1, 1]) B.m('head', starGeo, s * eyeX(f), f.eyeY, f.faceZ + .03, f.hr * .3, f.hr * .3, .06); temples(B, f, B.dark);
  });
  item('glasses', 'heartglasses', '😍', L('نضارة قلوب', 'Heart glasses', 'Kalp gözlük'), ['party', 'fancy'], 3, 0, (B, f) => {
    for(const s of [-1, 1]) B.m('head', heartGeo(), s * eyeX(f), f.eyeY + .01, f.faceZ + .03, f.hr * .22, f.hr * .22, .06); temples(B, f, B.dark);
  });

  /* capes and bags */
  NONE('back');
  const capeShell = (B, f, len, flare) => {
    if(f.quad){ B.m('body', shell(0, PI * .42), 0, .43, -.1, .32, .32, .43); return; }
    const top = f.neckY - .02, bot = Math.max(f.floor + .06, top - len), r0 = Math.abs(f.backZ) * .95;
    B.m('body', cone(r0, r0 + flare, true, PI / 2 + .25, PI - .5), 0, (top + bot) / 2, -.015, 1.05, top - bot, 1);
  };
  item('back', 'cape', '🦸', L('كاب بطل', 'Hero cape', 'Kahraman pelerini'), ['hero', 'fancy'], 0, 1, (B, f) => {
    capeShell(B, f, f.long ? .7 : .62, .2);
    if(!f.quad) B.a('body', CG.torus, 0, f.neckY - .02, 0, .14, .12, .3, PI / 2, 0, 0, B.dark);
  });
  item('back', 'backpack', '🎒', L('شنتة مدرسة', 'School bag', 'Okul çantası'), ['school'], 0, 2, (B, f) => {
    const bp = backPt(f);
    if(f.quad){ B.m('body', CG.box, 0, .74, -.12, .26, .12, .24).a('body', CG.box, 0, .74, .01, .2, .05, .04, 0, 0, 0, B.dark); return; }
    B.m('body', CG.box, 0, bp.y - .04, bp.z - .08, .32, .34, .16).m('body', CG.box, 0, bp.y - .13, bp.z - .17, .24, .12, .05);
    for(const s of [-1, 1]) B.a('body', CG.box, s * .12, f.top.sy, 0, .04, .3, Math.abs(f.backZ) * 2 + .04, 0, 0, 0, B.dark);
  });
  item('back', 'swimring', '🛟', L('عوّامة', 'Swim ring', 'Can simidi'), ['beach'], 0, 1, (B, f) => {
    if(f.quad){ B.m('body', torus(.28), 0, .45, -.05, .34, .32, .34, 0, 0, 0); return; }
    const r = (f.hip ? f.hip.rt : .23) + .1;
    B.m('body', torus(.3), 0, f.waistY + .02, 0, r, r * (f.hip ? f.hip.zk : 1), r, PI / 2, 0, 0);
  });
  item('back', 'scarf', '🧣', L('لفحة', 'Scarf', 'Atkı'), ['snow'], 0, 1, (B, f) => {
    if(f.quad){ B.m('body', CG.torus, 0, .62, .17, .16, .14, .55, PI / 2 - .3, 0, 0).m('body', CG.box, .06, .5, .3, .07, .18, .03, -.3, 0, .1); return; }
    B.m('body', CG.torus, 0, f.neckY - .02, .01, .12, .11, .55, PI / 2, 0, 0).m('body', CG.box, .07, f.top.sy - .06, f.chestZ + .03, .07, .22, .03, 0, 0, .08);
  });
  item('back', 'wings', '🧚', L('جوانح', 'Wings', 'Kanatlar'), ['fancy', 'party'], 4, 8, (B, f) => {
    const bp = backPt(f);
    for(const s of [-1, 1]){ B.m('body', CG.sph, s * .2, bp.y + .12, bp.z - .06, .22, .14, .02, 0, s * .35, s * .5); B.m('body', CG.sph, s * .16, bp.y - .08, bp.z - .05, .14, .09, .02, 0, s * .35, -s * .5); }
    B.a('body', CG.sm, 0, bp.y + .02, bp.z - .03, .04, .04, .04, 0, 0, 0, 0xe2b33c);
  });
  item('back', 'jetpack', '🚀', L('حقيبة صاروخ', 'Jetpack', 'Jet çantası'), ['space'], 5, 8, (B, f) => {
    const bp = backPt(f), y = bp.y - .05, z = bp.z - .1;
    for(const s of [-1, 1]){ B.m('body', CG.cyl, s * .09, y, z, .08, .34, .08).m('body', CG.cone, s * .09, y + .22, z, .08, .1, .08); B.a('body', CG.cone, s * .09, y - .21, z, .06, .08, .06, PI, 0, 0, 0x50607a).a('body', CG.cone, s * .09, y - .3, z, .045, .1, .045, PI, 0, 0, 0xffa53c); }
    if(!f.quad) for(const s of [-1, 1]) B.a('body', CG.box, s * .12, f.top.sy, 0, .04, .3, Math.abs(f.backZ) * 2 + .04, 0, 0, 0, 0x50607a);
  });
  item('back', 'cloak', '🏺', L('عباية مطرّزة', 'Embroidered cloak', 'İşlemeli pelerin'), ['heritage', 'fancy'], 4, 9, (B, f) => {
    capeShell(B, f, 1.2, .14);
    if(f.quad) return;
    const top = f.neckY - .02, bot = Math.max(f.floor + .06, top - 1.2), r0 = Math.abs(f.backZ) * .95 + .14;
    B.a('body', cone(r0, r0, true, PI / 2 + .25, PI - .5), 0, bot + .03, -.015, 1.06, .04, 1, 0, 0, 0, 0xe2b33c);
  });

  /* held props (right hand; the cat holds them in its mouth) */
  NONE('prop');
  item('prop', 'icecream', '🍦', L('بوظة', 'Ice cream', 'Dondurma'), ['beach'], 0, 0, B => {
    B.a('armR', CG.cone, 0, -.05, .07, .045, .14, .045, PI, 0, 0, 0xe0a860).m('armR', CG.sph, 0, .04, .07, .055, .055, .055).m('armR', CG.sph, 0, .1, .07, .045, .045, .045);
  });
  item('prop', 'balloon', '🎈', L('بالون', 'Balloon', 'Balon'), ['party'], 0, 1, B => {
    B.a('armR', CG.cyl8, 0, .32, .05, .006, .7, .006, 0, 0, 0, 0xffffff).m('armR', CG.sph, 0, .78, .05, .17, .2, .17).m('armR', CG.cone, 0, .57, .05, .03, .04, .03, PI, 0, 0);
  });
  item('prop', 'book', '📚', L('كتاب', 'Book', 'Kitap'), ['school'], 0, 6, B => {
    B.m('armR', CG.box, 0, -.02, .07, .04, .2, .15).a('armR', CG.box, .012, -.02, .07, .03, .18, .13, 0, 0, 0, 0xffffff);
  });
  item('prop', 'cocoa', '☕', L('كاسة كاكاو', 'Hot cocoa', 'Sıcak kakao'), ['snow'], 0, 8, B => {
    B.m('armR', CG.cyl, 0, .02, .08, .05, .1, .05).m('armR', CG.torus, .05, .02, .08, .03, .03, .5, 0, 0, 0).a('armR', CG.cyl, 0, .07, .08, .044, .01, .044, 0, 0, 0, 0x7a4a2a);
  });
  item('prop', 'wand', '🪄', L('عصاية نجمة', 'Star wand', 'Yıldız asa'), ['fancy', 'party', 'space'], 3, 10, B => {
    B.a('armR', CG.cyl8, 0, .08, .06, .012, .3, .012, 0, 0, 0, 0xffffff).m('armR', starGeo, 0, .27, .06, .07, .07, .04);
  });
  item('prop', 'shield', '🛡️', L('درع', 'Shield', 'Kalkan'), ['hero'], 3, 6, B => {
    B.m('armR', CG.cyl, .06, 0, .02, .17, .03, .17, 0, 0, PI / 2).a('armR', starGeo, .08, 0, .02, .07, .07, .03, 0, PI / 2, 0, 0xe2b33c);
  });
  item('prop', 'rocket', '🚀', L('صاروخ لعبة', 'Toy rocket', 'Oyuncak roket'), ['space'], 4, 8, B => {
    B.m('armR', CG.cyl, 0, .06, .08, .045, .18, .045).a('armR', CG.cone, 0, .19, .08, .045, .08, .045, 0, 0, 0, 0xe8304f);
    for(const a of [0, 2.1, 4.2]) B.a('armR', CG.box, Math.sin(a) * .05, -.01, .08 + Math.cos(a) * .05, .01, .06, .04, 0, a, 0, 0xe8304f);
    B.a('armR', CG.cyl, 0, .08, .126, .018, .005, .018, PI / 2, 0, 0, 0x6cc4ff);
  });
  item('prop', 'beachball', '🏐', L('طابة بحر', 'Beach ball', 'Plaj topu'), ['beach'], 3, 3, B => { B.m('armR', CG.sph, 0, .02, .16, .15, .15, .15); });
  item('prop', 'jar', '🏺', L('جرّة', 'Clay jar', 'Testi'), ['heritage'], 4, 11, B => {
    B.m('armR', jarGeo(), 0, -.08, .09, .1, .14, .1);
    for(const s of [-1, 1]) B.m('armR', CG.torus, s * .065, .05, .09, .03, .035, .5, 0, PI / 2, 0);
  });
  item('prop', 'lantern', '🏮', L('فانوس', 'Lantern', 'Fener'), ['heritage', 'party'], 4, 10, B => {
    B.m('armR', CG.cyl8, 0, -.02, .07, .07, .03, .07).m('armR', CG.cone, 0, .15, .07, .08, .07, .08).m('armR', CG.torus, 0, .21, .07, .025, .025, .4, 0, 0, 0);
    B.x('armR', (() => { const m = new THREE.Mesh(new THREE.CylinderGeometry(.055, .055, .13, 8), glowMat); m.position.set(0, .06, .07); return m; })());
    for(let i = 0; i < 4; i++){ const a = i / 4 * PI * 2 + PI / 4; B.m('armR', CG.box, Math.sin(a) * .06, .06, .07 + Math.cos(a) * .06, .012, .14, .012); }
  });
  item('prop', 'gift', '🎁', L('هدية', 'Present', 'Hediye'), ['party'], 3, 7, B => {
    B.m('armR', CG.box, 0, .0, .1, .16, .14, .16).a('armR', CG.box, 0, .0, .1, .03, .145, .165, 0, 0, 0, 0xffffff).a('armR', CG.box, 0, .0, .1, .165, .145, .03, 0, 0, 0, 0xffffff);
    B.a('armR', CG.sph, -.03, .09, .1, .04, .03, .02, 0, 0, .5, 0xffffff).a('armR', CG.sph, .03, .09, .1, .04, .03, .02, 0, 0, -.5, 0xffffff);
  });

  const BY_SLOT = {}; SLOT_IDS.forEach(s => { BY_SLOT[s] = Object.values(ITEMS).filter(it => it.slot === s); });
  const FREE = Object.values(ITEMS).filter(it => !it.price).map(it => it.id);

  /* ---------- themes ---------- */
  const THEMES = [
    { id:'beach', e:'🏖️', n:L('يوم بالبحر', 'Beach day', 'Plaj günü'), tag:'beach', cols:[5, 3, 8, 2, 4], spot:[0x7fe0ff, 0xffe28a] },
    { id:'party', e:'🎂', n:L('حفلة عيد ميلاد', 'Birthday party', 'Doğum günü partisi'), tag:'party', cols:[0, 7, 3, 5, 10], spot:[0xff8fc8, 0xc9a2ff] },
    { id:'hero', e:'🦸', n:L('أبطال خارقين', 'Superheroes', 'Süper kahramanlar'), tag:'hero', cols:[1, 6, 10, 9], spot:[0xff6a6a, 0x7fa8ff] },
    { id:'snow', e:'⛄', n:L('رحلة تلج', 'Snow trip', 'Kar gezisi'), tag:'snow', cols:[8, 5, 6, 1, 7], spot:[0xcff0ff, 0x9fc8ff] },
    { id:'school', e:'🏫', n:L('مدرسة', 'School', 'Okul'), tag:'school', cols:[6, 8, 1, 11, 9], spot:[0xfff0c8, 0x9fd0ff] },
    { id:'space', e:'🚀', n:L('فضاء', 'Space', 'Uzay'), tag:'space', cols:[7, 9, 8, 5, 6], spot:[0xb48cff, 0x7fe0ff] },
    { id:'heritage', e:'🏺', n:L('تراث', 'Heritage', 'Gelenek'), tag:'heritage', cols:[1, 10, 9, 11, 8], spot:[0xffc070, 0xff8a6a] },
    { id:'royal', e:'👑', n:L('حفلة ملكية', 'Royal ball', 'Kraliyet balosu'), tag:'fancy', cols:[10, 7, 8, 0, 1], spot:[0xffe08a, 0xd8a8ff] }
  ];

  /* ---------- outfits: { hat:[id, colour, print], ... } ---------- */
  const BASIC = { hat:['hat_none', 8, 0], hair:['hair_none', 8, 0], top:['tee', 8, 0], bottom:['pants', 6, 0], shoes:['sneakers', 8, 0], glasses:['glasses_none', 8, 0], back:['back_none', 8, 0], prop:['prop_none', 8, 0] };
  const cloneOutfit = o => { const r = {}; for(const s of SLOT_IDS) r[s] = (o && o[s] ? o[s] : BASIC[s]).slice(); return r; };
  function okOutfit(o){
    const r = {};
    for(const s of SLOT_IDS){
      const v = o && Array.isArray(o[s]) ? o[s] : null, it = v && ITEMS[v[0]];
      r[s] = it && it.slot === s ? [it.id, Math.max(0, Math.min(COLORS.length - 1, v[1] | 0)), Math.max(0, Math.min(PRINTS.length - 1, v[2] | 0))] : BASIC[s].slice();
    }
    return r;
  }
  const outfitKey = o => SLOT_IDS.map(s => o[s].join(':')).join('|');

  /* score how well an outfit fits a theme: matching pieces, theme colours, a complete look */
  function themeScore(o, th){
    let sc = 0, filled = 0;
    for(const s of SLOT_IDS){
      const [id, c, p] = o[s], it = ITEMS[id]; if(!it || !it.build) continue;
      filled++;
      if(it.tags.includes(th.tag)) sc += 3; else if(it.tags.includes('basic')) sc += .6;
      if(th.cols.includes(c)) sc += 1.1;
      if(p && (th.tag === 'party' || th.tag === 'fancy' || (th.tag === 'space' && p === 2))) sc += .5;
    }
    return sc + Math.min(filled, 8) * .35;
  }
  const SCORE_MAX = 8 * 4.6;
  /* a bot picks pieces that match the theme (skill 0..1 = how often it gets it right) */
  function botOutfit(th, skill = .75, rnd = Math.random){
    const o = {};
    const pick = a => a[Math.floor(rnd() * a.length)];
    for(const sl of SLOTS){
      const all = BY_SLOT[sl.id], match = all.filter(it => it.tags.includes(th.tag)), real = all.filter(it => it.build);
      let it;
      if(match.length && rnd() < skill) it = pick(match);
      else if(sl.opt && rnd() < .45) it = all.find(x => !x.build);
      else it = pick(real);
      const c = rnd() < skill ? pick(th.cols) : Math.floor(rnd() * COLORS.length);
      const p = rnd() < .25 ? 1 + Math.floor(rnd() * 3) : 0;
      o[sl.id] = [it.id, it.build ? c : 8, it.build ? p : 0];
    }
    return o;
  }

  /* ---------- dressing a character ---------- */
  function frameOf(h){
    const f = fitOf(h.type);
    return { body:h.body, head:h.head, arms:f.quad ? [] : h.arms, legs:h.legs, mouth:f.quad ? h.head : null };
  }
  /* (re)dress a kit character: removes the old layers and adds the new ones */
  function dress(h, outfit, shadow = true){
    if(h.__ofit) for(const m of h.__ofit){ if(m.parent) m.parent.remove(m); if(m.isMesh && m.geometry) m.geometry.dispose(); }
    h.__ofit = [];
    const f = fitOf(h.type), fr = frameOf(h);
    for(const s of SLOT_IDS){
      const [id, c, p] = outfit[s], it = ITEMS[id]; if(!it || !it.build) continue;
      const B = builder(c, p); it.build(B, f); attach(B, fr, h.__ofit, shadow, f);
    }
    h.__okey = outfitKey(outfit);
    return h;
  }
  /* a stand-in frame (a kid's proportions) for item thumbnails */
  function mannequin(){
    const grp = new THREE.Group(), body = new THREE.Group(); grp.add(body);
    const head = new THREE.Group(); head.position.set(0, 1, 0); body.add(head);
    const arms = [-1, 1].map(s => { const a = new THREE.Group(); a.position.set(s * .25, .72, 0); a.rotation.z = -s * .25; body.add(a); return a; });
    const legs = [-1, 1].map(s => { const l = new THREE.Group(); l.position.set(s * .1, .38, 0); body.add(l); return l; });
    return { grp, body, head, arms, legs, type:'sara' };
  }
  function pieceOnly(slot, id, c, p){
    const m = mannequin(), it = ITEMS[id];
    m.__ofit = [];
    if(it && it.build){ const B = builder(c, p); it.build(B, KID); attach(B, frameOf(m), m.__ofit, false, KID); }
    return m;
  }

  return { COLORS, PRINTS, SLOTS, SLOT_IDS, ITEMS, BY_SLOT, FREE, THEMES, BASIC, FIT, fitOf, cloneOutfit, okOutfit, outfitKey, themeScore, SCORE_MAX, botOutfit, dress, pieceOnly, css, printTex, mainMat };
}
