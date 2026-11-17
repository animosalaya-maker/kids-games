/* Bobo Worlds: shared 3D kit — geometry merge helper, small textures and the 7 playable characters
   (Sara, Sidra, Qamar, Samir, Mushakis, Zaqzouq, Aunt Laila), built as chibi low-poly models with
   canvas-drawn faces. All characters share one size for collisions (radius .42, about 1.2 tall), face +z.
   makeKit(THREE, opts) — opts (all optional): rim (soft rim light strength, default .3; 0 = off), toon (true = soft 3-step toon shading).
   Characters use smoother geometry (more segments, capsule limbs); level geometry G is unchanged.
   8th hero 'me' («شخصيتي»): a 3D chibi of the kid's own avatar from the home wardrobe (../avatar.js, saved in bobo_world.avatar).
   It is listed first in HERO_IDS; its picker picture (chars/me.png) is swapped for a live drawing of the saved avatar. */
import '../avatar.js';
export function makeKit(THREE, opts = {}){
  const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _s = new THREE.Vector3(), _v = new THREE.Vector3(), _c = new THREE.Color();
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;

  /* one draw call for many static, vertex-coloured pieces */
  class Merge{
    constructor(){ this.p = []; this.n = []; this.c = []; }
    add(geo, x, y, z, sx = 1, sy = 1, sz = 1, rx = 0, ry = 0, rz = 0, color = 0xffffff){
      const g = geo.index ? geo.toNonIndexed() : geo.clone();
      _m.compose(_v.set(x, y, z), _q.setFromEuler(_e.set(rx, ry, rz)), _s.set(sx, sy, sz));
      g.applyMatrix4(_m);
      const pa = g.attributes.position.array, na = g.attributes.normal.array;
      _c.set(color);
      for(let i = 0; i < pa.length; i++){ this.p.push(pa[i]); this.n.push(na[i]); }
      for(let i = 0; i < pa.length / 3; i++) this.c.push(_c.r, _c.g, _c.b);
      g.dispose(); return this;
    }
    get empty(){ return this.p.length === 0; }
    geometry(){
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3));
      g.setAttribute('normal', new THREE.Float32BufferAttribute(this.n, 3));
      g.setAttribute('color', new THREE.Float32BufferAttribute(this.c, 3));
      g.computeBoundingSphere(); return g;
    }
  }
  const G = {
    box:new THREE.BoxGeometry(1, 1, 1), cyl:new THREE.CylinderGeometry(1, 1, 1, 20), cyl8:new THREE.CylinderGeometry(1, 1, 1, 8),
    cone:new THREE.ConeGeometry(1, 1, 12), cone4:new THREE.ConeGeometry(1, 1, 4), sph:new THREE.SphereGeometry(1, 16, 12), sm:new THREE.SphereGeometry(1, 10, 8),
    ico:new THREE.IcosahedronGeometry(1, 0), ico1:new THREE.IcosahedronGeometry(1, 1), dode:new THREE.DodecahedronGeometry(1, 0),
    hemi:new THREE.SphereGeometry(1, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), torus:new THREE.TorusGeometry(1, .18, 8, 24)
  };
  /* smoother shapes for the characters only (level geometry keeps the light G set) */
  const CG = {
    box:G.box, cyl:new THREE.CylinderGeometry(1, 1, 1, 28), cyl8:new THREE.CylinderGeometry(1, 1, 1, 14),
    cone:new THREE.ConeGeometry(1, 1, 20), cone4:G.cone4, sph:new THREE.SphereGeometry(1, 28, 20), sm:new THREE.SphereGeometry(1, 18, 12),
    ico:G.ico, ico1:G.ico1, dode:G.dode, hemi:new THREE.SphereGeometry(1, 24, 10, 0, Math.PI * 2, 0, Math.PI / 2), torus:new THREE.TorusGeometry(1, .18, 12, 32)
  };
  const capCache = {};
  /* a rounded limb: capsule of radius r whose straight part is len long (centered on 0) */
  function capsule(r, len){ const k = r.toFixed(3) + '_' + len.toFixed(3); return capCache[k] || (capCache[k] = new THREE.CapsuleGeometry(r, Math.max(.001, len), 5, 14)); }
  function canvasTex(w, h, draw){
    const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  }
  const glowTex = canvasTex(64, 64, (x, w) => { const g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.4, 'rgba(255,255,255,.45)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, w, w); });
  const blobTex = canvasTex(64, 64, (x, w) => { const g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(20,20,40,.6)'); g.addColorStop(.6, 'rgba(20,20,40,.32)'); g.addColorStop(1, 'rgba(20,20,40,0)'); x.fillStyle = g; x.fillRect(0, 0, w, w); });
  function starShape(r1, r2){
    const s = new THREE.Shape();
    for(let i = 0; i < 10; i++){ const a = i / 10 * Math.PI * 2 + Math.PI / 2, r = i % 2 ? r2 : r1; const x = Math.cos(a) * r, y = Math.sin(a) * r; if(i) s.lineTo(x, y); else s.moveTo(x, y); }
    return s;
  }
  const starGeo = (() => { const g = new THREE.ExtrudeGeometry(starShape(1, .45), { depth:.3, bevelEnabled:true, bevelThickness:.1, bevelSize:.08, bevelSegments:1 }); g.translate(0, 0, -.15); return g; })();

  /* ---------- faces: drawn on a canvas and wrapped on a patch of the head sphere ---------- */
  const PHI = 2.0, TH0 = .7, THL = 1.5;            // patch: 2 rad wide, from .7 rad below the top, 1.5 rad tall (128 px per rad)
  function drawFace(x, o, closed){
    const W = 256, cx = 128, ey = 100, ex = 46;
    const ink = o.ink || '#2a1608';
    if(o.blush){ x.fillStyle = 'rgba(255,120,140,.42)'; for(const s of [-1, 1]){ x.beginPath(); x.ellipse(cx + s * 76, 134, 19, 11, 0, 0, 6.3); x.fill(); } }
    if(o.freckles){ x.fillStyle = 'rgba(150,80,40,.7)'; for(const s of [-1, 1]) for(const [dx, dy] of [[0, 0], [10, 5], [-8, 6], [4, 12]]){ x.beginPath(); x.arc(cx + s * (72 + dx), 126 + dy, 2.3, 0, 6.3); x.fill(); } }
    if(o.wrinkles){ x.strokeStyle = 'rgba(140,90,60,.55)'; x.lineWidth = 2.5; for(const s of [-1, 1]){ x.beginPath(); x.arc(cx + s * 70, ey + 4, 30, s > 0 ? -.2 : Math.PI - .5, s > 0 ? .5 : Math.PI + .2); x.stroke(); } }
    for(const s of [-1, 1]){
      const X = cx + s * ex;
      if(o.eye === 'happy' || (closed && o.eye !== 'dot')){
        x.strokeStyle = ink; x.lineWidth = 6; x.lineCap = 'round';
        x.beginPath(); x.arc(X, ey + 8, 15, Math.PI * 1.15, Math.PI * 1.85); x.stroke();
        continue;
      }
      if(o.eye === 'dot'){
        x.fillStyle = '#141018'; x.beginPath(); x.ellipse(X, ey, 17, closed ? 3 : 20, 0, 0, 6.3); x.fill();
        if(!closed){ x.fillStyle = '#fff'; x.beginPath(); x.arc(X - 6, ey - 7, 6, 0, 6.3); x.fill(); x.beginPath(); x.arc(X + 6, ey + 7, 2.6, 0, 6.3); x.fill(); }
        continue;
      }
      x.fillStyle = '#fff'; x.beginPath(); x.ellipse(X, ey, 22, 25, 0, 0, 6.3); x.fill();
      x.fillStyle = o.iris || '#6b3a17'; x.beginPath(); x.ellipse(X + s * 1, ey + 2, 18, 22, 0, 0, 6.3); x.fill();
      x.fillStyle = '#1d0e06'; x.beginPath(); x.ellipse(X + s * 1, ey + 4, 10, 13, 0, 0, 6.3); x.fill();
      x.fillStyle = '#fff'; x.beginPath(); x.arc(X - 6, ey - 7, 7, 0, 6.3); x.fill(); x.beginPath(); x.arc(X + 7, ey + 9, 3.2, 0, 6.3); x.fill();
      x.strokeStyle = ink; x.lineWidth = 5; x.lineCap = 'round'; x.beginPath(); x.ellipse(X, ey, 23, 26, 0, Math.PI * 1.08, Math.PI * 1.92); x.stroke();
      if(o.lashes){ x.lineWidth = 4; x.beginPath(); x.moveTo(X + s * 19, ey - 16); x.lineTo(X + s * 28, ey - 24); x.stroke(); }
    }
    if(o.brows){   // 'grumpy' (slanted down to the middle) or 'up' (surprised)
      x.strokeStyle = o.browCol || ink; x.lineWidth = 7; x.lineCap = 'round';
      for(const s of [-1, 1]){ const X = cx + s * ex; x.beginPath();
        if(o.brows === 'grumpy'){ x.moveTo(X - s * 22, ey - 44); x.lineTo(X + s * 18, ey - 34); }
        else { x.moveTo(X - 20, ey - 40); x.quadraticCurveTo(X, ey - 54, X + 20, ey - 40); }
        x.stroke(); }
    }
    if(o.glasses){
      if(o.lens){ x.fillStyle = o.lens; for(const s of [-1, 1]){ x.beginPath(); x.arc(cx + s * ex, ey + 2, 33, 0, 6.3); x.fill(); } }
      x.strokeStyle = o.glasses; x.lineWidth = 7;
      for(const s of [-1, 1]){ x.beginPath(); x.arc(cx + s * ex, ey + 2, 33, 0, 6.3); x.stroke(); }
      x.beginPath(); x.moveTo(cx - 13, ey - 4); x.quadraticCurveTo(cx, ey - 12, cx + 13, ey - 4); x.stroke();
      x.beginPath(); x.moveTo(cx - ex - 33, ey - 2); x.lineTo(cx - 128, ey - 8); x.moveTo(cx + ex + 33, ey - 2); x.lineTo(cx + 128, ey - 8); x.stroke();
    }
    if(o.nose === 'pink'){ x.fillStyle = '#ff7f9e'; x.beginPath(); x.moveTo(cx - 10, 124); x.lineTo(cx + 10, 124); x.lineTo(cx, 135); x.closePath(); x.fill(); }
    else if(o.nose !== false){ x.fillStyle = 'rgba(200,120,90,.55)'; x.beginPath(); x.ellipse(cx, 126, 6, 4, 0, 0, 6.3); x.fill(); }
    if(o.whiskers){ x.strokeStyle = 'rgba(60,40,40,.65)'; x.lineWidth = 2.5; for(const s of [-1, 1]) for(const k of [-1, 0, 1]){ x.beginPath(); x.moveTo(cx + s * 30, 140 + k * 6); x.lineTo(cx + s * 100, 132 + k * 14); x.stroke(); } }
    const my = o.mouthY || 152;
    if(o.mouth === 'open'){
      x.fillStyle = '#7a1f2b'; x.beginPath(); x.moveTo(cx - 20, my - 4); x.quadraticCurveTo(cx, my + 30, cx + 20, my - 4); x.closePath(); x.fill();
      x.fillStyle = '#ff8fa0'; x.beginPath(); x.ellipse(cx, my + 11, 9, 5, 0, 0, 6.3); x.fill();
      x.fillStyle = '#fff'; x.fillRect(cx - 13, my - 4, 26, 5);
    } else if(o.mouth === 'wavy'){
      x.strokeStyle = o.lip || '#8a2a2a'; x.lineWidth = 5; x.lineCap = 'round';
      x.beginPath(); x.moveTo(cx - 22, my - 8); x.bezierCurveTo(cx - 10, my - 18, cx - 4, my + 2, cx + 6, my - 8); x.quadraticCurveTo(cx + 14, my - 16, cx + 22, my - 6); x.stroke();
    } else if(o.mouth === 'o'){
      x.fillStyle = '#7a1f2b'; x.beginPath(); x.ellipse(cx, my - 4, 11, 14, 0, 0, 6.3); x.fill();
    } else if(o.mouth === 'cat'){
      x.strokeStyle = ink; x.lineWidth = 4.5; x.lineCap = 'round';
      x.beginPath(); x.moveTo(cx, 134); x.lineTo(cx, my - 6); x.stroke();
      x.fillStyle = '#7a1f2b'; x.beginPath(); x.moveTo(cx - 26, my - 8); x.quadraticCurveTo(cx, my + 26, cx + 26, my - 8); x.closePath(); x.fill();
      x.fillStyle = '#fff'; x.fillRect(cx - 20, my - 8, 40, 7);
    } else {
      x.strokeStyle = o.lip || '#8a2a2a'; x.lineWidth = 5; x.lineCap = 'round';
      x.beginPath(); x.arc(cx, my - 18, 18, Math.PI * .22, Math.PI * .78); x.stroke();
    }
  }
  function faceTex(o, closed){ return canvasTex(256, 192, x => drawFace(x, o, closed)); }
  function facePatch(r, o){
    const geo = new THREE.SphereGeometry(r, 26, 18, Math.PI / 2 - PHI / 2, PHI, TH0, THL);
    const open = faceTex(o, false), shut = faceTex(o, true);
    const fo = { map:open, transparent:true, depthWrite:false, polygonOffset:true, polygonOffsetFactor:-2 };
    const mat = opts.toon ? new THREE.MeshToonMaterial(Object.assign({ gradientMap:gradMap() }, fo)) : new THREE.MeshLambertMaterial(fo);
    const m = new THREE.Mesh(geo, mat); m.renderOrder = 1; m.userData = { open, shut };
    return m;
  }

  /* character shading: lambert (or soft toon) + a gentle rim light that keeps the heroes readable in dim places */
  const RIM = opts.rim != null ? opts.rim : .3;
  let toonGrad = null;
  function gradMap(){
    if(toonGrad) return toonGrad;
    toonGrad = new THREE.DataTexture(new Uint8Array([150, 205, 240, 255]), 4, 1, THREE.RedFormat);
    toonGrad.minFilter = toonGrad.magFilter = THREE.LinearFilter; toonGrad.needsUpdate = true; return toonGrad;
  }
  function rimify(m, k = RIM){
    if(!k) return m;
    m.onBeforeCompile = sh => {
      sh.uniforms.rimK = { value:k };
      sh.fragmentShader = sh.fragmentShader.replace('void main() {', 'uniform float rimK;\nvoid main() {')
        .replace('#include <opaque_fragment>', 'float rimF = 1.0 - clamp(dot(normalize(vViewPosition), normal), 0.0, 1.0);\noutgoingLight += (diffuseColor.rgb * .7 + .3) * pow(rimF, 2.6) * rimK;\n#include <opaque_fragment>');
    };
    m.customProgramCacheKey = () => 'kitrim' + k;
    return m;
  }
  function charMat(o = {}){
    const p = Object.assign({ vertexColors:true }, o);
    return rimify(opts.toon ? new THREE.MeshToonMaterial(Object.assign({ gradientMap:gradMap() }, p)) : new THREE.MeshLambertMaterial(p));
  }
  const lam = () => charMat();
  const meshOf = M => new THREE.Mesh(M.geometry(), lam());
  function pivot(parent, x, y, z){ const p = new THREE.Group(); p.position.set(x, y, z); parent.add(p); return p; }
  /* a leg hanging from a hip pivot: thigh + shoe */
  function leg(parent, x, y, len, r, legCol, shoeCol, soleCol){
    const p = pivot(parent, x, y, 0), M = new Merge();
    M.add(capsule(r, len - r), 0, -len / 2, 0, 1, 1, 1, 0, 0, 0, legCol);
    M.add(CG.sm, 0, -len - .01, .04, r * 1.45, r * 1.05, r * 2.1, 0, 0, 0, shoeCol);
    if(soleCol != null) M.add(CG.cyl8, 0, -len - .06, .04, r * 1.5, .03, r * 2.1, 0, 0, 0, soleCol);
    p.add(meshOf(M)); return p;
  }
  function arm(parent, x, y, len, r, sleeveCol, skinCol){
    const p = pivot(parent, x, y, 0), M = new Merge();
    M.add(capsule(r, len - r * .6), 0, -len / 2, 0, 1, 1, 1, 0, 0, 0, sleeveCol);
    M.add(CG.sm, 0, -len - .02, 0, r * 1.15, r * 1.15, r * 1.15, 0, 0, 0, skinCol);
    p.add(meshOf(M)); p.userData.side = Math.sign(x); return p;
  }
  /* pieces hanging from a pivot that sway (braid, ponytail, tail) */
  function chain(parent, x, y, z, pts, col, endCol){
    const p = pivot(parent, x, y, z), M = new Merge();
    pts.forEach(([px, py, pz, r], i) => M.add(CG.sm, px, py, pz, r, r, r, 0, 0, 0, i === pts.length - 1 && endCol != null ? endCol : col));
    p.add(meshOf(M)); return p;
  }
  const SKIN = 0xf7cfae, SKIN0 = SKIN;

  /* generic chibi kid: o = { hair, top, topLight, bottom, skirt, legs, shoes, sole, headR, headY, scale } */
  function kid(o){
    const grp = new THREE.Group(), body = new THREE.Group(); grp.add(body);
    const S = o.scale || 1, hr = o.headR || .33, hy = o.headY || 1.0, SKIN = o.skin != null ? o.skin : SKIN0;
    const M = new Merge();
    // torso (hoodie / jacket)
    M.add(CG.sph, 0, .64, 0, .23, .21, .19, 0, 0, 0, o.top);
    M.add(CG.cyl, 0, .55, 0, .21, .2, .18, 0, 0, 0, o.top);
    if(o.inner != null) M.add(CG.sph, 0, .64, .1, .11, .15, .11, 0, 0, 0, o.inner);
    // skirt or shorts
    if(o.skirt != null) M.add(new THREE.CylinderGeometry(.2, .29, 1, 16), 0, .42, 0, 1, .2, 1, 0, 0, 0, o.skirt);
    else M.add(CG.cyl, 0, .44, 0, .2, .14, .18, 0, 0, 0, o.bottom);
    // neck + head
    M.add(CG.cyl8, 0, .76, 0, .07, .08, .07, 0, 0, 0, SKIN);
    body.add(meshOf(M));
    const head = pivot(body, 0, hy, 0);
    const HM = new Merge();
    HM.add(CG.sph, 0, 0, 0, hr, hr * .97, hr * .95, 0, 0, 0, SKIN);
    for(const s of [-1, 1]) HM.add(CG.sm, s * hr * .98, -.02, 0, .06, .075, .05, 0, 0, 0, SKIN);
    head.add(meshOf(HM));
    const face = facePatch(hr * 1.012, o.face); face.scale.z = .95; head.add(face);
    const legs = [leg(body, -.1, .38, .3, o.legR || .065, o.legs, o.shoes, o.sole), leg(body, .1, .38, .3, o.legR || .065, o.legs, o.shoes, o.sole)];
    const arms = [arm(body, -.25, .72, .27, .058, o.sleeve || o.top, SKIN), arm(body, .25, .72, .27, .058, o.sleeve || o.top, SKIN)];
    arms.forEach(a => { a.rotation.z = -a.userData.side * .25; });
    grp.scale.setScalar(S);
    return { grp, body, head, face, legs, arms, sway:[], hr, blink:Math.random() * 3 };
  }
  /* hair cap: a bigger half-sphere tilted back + a fringe */
  function hairCap(head, hr, col, fringe = true){
    const M = new Merge();
    M.add(new THREE.SphereGeometry(1, 30, 16, 0, Math.PI * 2, 0, Math.PI * .56), 0, .02, -.02, hr * 1.07, hr * 1.07, hr * 1.07, -.38, 0, 0, col);
    M.add(CG.sph, 0, -.03, -.06, hr * 1.04, hr * .95, hr * 1.0, 0, 0, 0, col);
    if(fringe) for(const [x, r] of [[-.16, .1], [-.06, .11], [.05, .11], [.15, .1]]) M.add(CG.sm, x, hr * .62, hr * .72, r, r * .7, r * .6, .5, 0, 0, col);
    for(const s of [-1, 1]) M.add(CG.sm, s * hr * .86, -.02, .03, .07, .2, .1, 0, 0, s * .15, col);
    head.add(meshOf(M));
  }

  const HEROES = {};
  // سارة — long brown braid with a purple scrunchie, purple hoodie, white top + star necklace, denim skirt, purple sneakers
  HEROES.sara = () => {
    const h = kid({ top:0x9c7be3, inner:0xffffff, skirt:0x5d87c6, legs:SKIN, shoes:0x8c64dc, sole:0xffffff, face:{ blush:true, freckles:true, lashes:true, mouth:'smile' } });
    hairCap(h.head, h.hr, 0x6e4224);
    const M = new Merge(); M.add(starGeo, 0, .6, .205, .035, .035, .03, 0, 0, 0, 0xdfe6f2); M.add(CG.torus, 0, .7, .13, .09, .09, .2, 1.25, 0, 0, 0xdfe6f2);
    M.add(CG.sph, 0, .72, -.17, .17, .12, .08, 0, 0, 0, 0x8a6ad0);          // hood
    h.body.add(meshOf(M));
    const pts = []; for(let i = 0; i < 7; i++) pts.push([.04 * Math.sin(i * .6), -.06 - i * .085, -.02 * i, .075 - i * .004]);
    pts.push([.03, -.66, -.14, .065]);
    h.sway.push(chain(h.head, .18, -.06, -.24, pts, 0x6e4224, 0x9c6ee8));
    return Object.assign(h, { type:'sara' });
  };
  // سيدرة — brown ponytail with a teal scrunchie, round teal glasses, teal jacket, white tee + pink flower, olive skirt, black leggings, teal sneakers
  HEROES.sidra = () => {
    const h = kid({ top:0x1fa6a9, inner:0xffffff, skirt:0x7e8a4b, legs:0x26242c, shoes:0x1f9fa3, sole:0xffffff, face:{ blush:true, freckles:true, glasses:'#127f86', mouth:'smile', lashes:true } });
    hairCap(h.head, h.hr, 0x7b4b29);
    const M = new Merge(); M.add(CG.sm, 0, .66, .2, .04, .04, .02, 0, 0, 0, 0xff7fae).add(CG.sm, 0, .66, .215, .015, .015, .01, 0, 0, 0, 0xffe066);
    h.body.add(meshOf(M));
    const S = new Merge(); S.add(CG.torus, 0, h.hr * .78, -h.hr * .55, .07, .07, .3, -.9, 0, 0, 0x14a3a0); h.head.add(meshOf(S));
    h.sway.push(chain(h.head, 0, h.hr * .78, -h.hr * .6, [[0, .02, -.08, .1], [0, -.08, -.16, .095], [0, -.2, -.2, .085], [0, -.32, -.2, .07], [0, -.42, -.17, .05]], 0x7b4b29));
    return Object.assign(h, { type:'sidra' });
  };
  // قمر — toddler, black pigtails with yellow star clips, yellow dress with white moons and stars, pink shoes
  HEROES.qamar = () => {
    const dress = canvasTex(128, 64, x => {
      x.fillStyle = '#ffd84a'; x.fillRect(0, 0, 128, 64); x.fillStyle = '#fff';
      for(let i = 0; i < 9; i++){ const px = (i * 29) % 128 + 6, py = (i * 17) % 52 + 8;
        if(i % 2){ x.beginPath(); x.arc(px, py, 6, 0, 6.3); x.fill(); x.fillStyle = '#ffd84a'; x.beginPath(); x.arc(px + 3, py - 2, 5, 0, 6.3); x.fill(); x.fillStyle = '#fff'; }
        else { x.save(); x.translate(px, py); x.beginPath(); for(let k = 0; k < 10; k++){ const a = k / 10 * 6.283 - 1.571, r = k % 2 ? 2.4 : 5.5; x.lineTo(Math.cos(a) * r, Math.sin(a) * r); } x.fill(); x.restore(); } }
    });
    dress.wrapS = THREE.RepeatWrapping; dress.repeat.set(2, 1);
    const h = kid({ top:0xffd84a, skirt:null, bottom:0xffd84a, legs:SKIN, shoes:0xff7fb0, sole:0xffc1d8, headR:.37, headY:.93, face:{ blush:true, lashes:true, mouth:'open', ink:'#1a0f0a', iris:'#3a2210' }, legR:.07 });
    const d = new THREE.Mesh(new THREE.CylinderGeometry(.17, .33, .4, 18, 1, true), new THREE.MeshLambertMaterial({ map:dress, side:THREE.DoubleSide }));
    d.position.y = .5; h.body.add(d);
    hairCap(h.head, h.hr, 0x1e1b22);
    for(const s of [-1, 1]){
      const M = new Merge();
      M.add(CG.sm, 0, 0, 0, .1, .1, .1, 0, 0, 0, 0x1e1b22).add(CG.cone, s * .05, .1, 0, .06, .16, .06, 0, 0, -s * .5, 0x1e1b22).add(CG.cone, s * .1, .06, 0, .05, .14, .05, 0, 0, -s * 1.1, 0x1e1b22);
      M.add(starGeo, -s * .02, -.02, .09, .06, .06, .05, 0, 0, s * .3, 0xffd23f);
      const p = pivot(h.head, s * h.hr * .78, h.hr * .62, -.04); p.add(meshOf(M)); h.sway.push(p);
    }
    return Object.assign(h, { type:'qamar' });
  };
  // سمير — blue cap with a gold star, blue hoodie, navy backpack, grey pants, blue sneakers
  HEROES.samir = () => {
    const h = kid({ top:0x3a74d8, bottom:0x80858f, legs:0x80858f, shoes:0x2f62c8, sole:0xffffff, legR:.072, face:{ blush:true, mouth:'open' } });
    hairCap(h.head, h.hr, 0x5c3a1e, false);
    const C = new Merge();
    C.add(new THREE.SphereGeometry(1, 20, 10, 0, Math.PI * 2, 0, Math.PI * .56), 0, .04, -.02, h.hr * 1.16, h.hr * 1.0, h.hr * 1.16, -.3, 0, 0, 0x2f66cc);
    C.add(CG.cyl, 0, h.hr * .26, h.hr * .9, .2, .03, .16, .12, 0, 0, 0x2a5bb8);
    C.add(starGeo, 0, h.hr * .62, h.hr * .86, .065, .065, .05, -.45, 0, 0, 0xffc93a);
    h.head.add(meshOf(C));
    const B = new Merge();
    B.add(CG.box, 0, .6, -.24, .34, .36, .16, 0, 0, 0, 0x23345e).add(CG.box, 0, .5, -.33, .24, .14, .05, 0, 0, 0, 0x2c4278);
    B.add(starGeo, -.08, .7, -.325, .03, .03, .02, 0, Math.PI, 0, 0xffa94d);
    for(const s of [-1, 1]) B.add(CG.box, s * .13, .66, .02, .04, .3, .4, 0, 0, 0, 0x23345e);
    B.add(CG.sph, 0, .74, -.15, .17, .11, .08, 0, 0, 0, 0x3268c6); // hood
    B.add(CG.cyl8, -.04, .6, .19, .008, .12, .008, 0, 0, 0, 0xdde3f0).add(CG.cyl8, .04, .6, .19, .008, .12, .008, 0, 0, 0, 0xdde3f0);
    h.body.add(meshOf(B));
    return Object.assign(h, { type:'samir' });
  };
  // العمة ليلى — navy hijab and abaya with gold embroidery, round gold glasses, wooden cane
  HEROES.laila = () => {
    const NAVY = 0x1f2b5c, GOLD = 0xe2b33c;
    const grp = new THREE.Group(), body = new THREE.Group(); grp.add(body);
    const hr = .31, M = new Merge();
    M.add(new THREE.CylinderGeometry(.2, .34, 1, 18), 0, .43, 0, 1, .72, 1, 0, 0, 0, NAVY);   // abaya
    M.add(CG.sph, 0, .73, 0, .25, .17, .23, 0, 0, 0, NAVY);                                    // shoulders + scarf drape
    M.add(new THREE.TorusGeometry(.335, .018, 6, 28), 0, .1, 0, 1, 1, 1, Math.PI / 2, 0, 0, GOLD);
    M.add(new THREE.TorusGeometry(.27, .016, 6, 28), 0, .5, 0, 1, 1, 1, Math.PI / 2, 0, 0, GOLD);
    M.add(CG.box, 0, .45, .27, .05, .3, .02, -.17, 0, 0, GOLD).add(CG.sm, 0, .6, .24, .04, .04, .02, 0, 0, 0, GOLD);
    for(let i = 0; i < 7; i++){ const a = -1.1 + i * .37; M.add(CG.sm, Math.sin(a) * .24, .7 - Math.abs(Math.sin(a)) * .03, Math.cos(a) * .21, .022, .022, .022, 0, 0, 0, GOLD); }
    body.add(meshOf(M));
    const head = pivot(body, 0, .98, 0);
    const HM = new Merge();
    HM.add(CG.sph, 0, 0, 0, hr, hr * .97, hr * .95, 0, 0, 0, 0xf1c6a3);
    // hijab: a shell around the head with an opening for the face
    HM.add(new THREE.SphereGeometry(1, 22, 14, Math.PI / 2 + .62, Math.PI * 2 - 1.24, 0, Math.PI * .82), 0, 0, 0, hr * 1.13, hr * 1.13, hr * 1.13, 0, 0, 0, NAVY);
    HM.add(new THREE.SphereGeometry(1, 10, 6, Math.PI / 2 - .64, 1.28, 0, .78), 0, 0, 0, hr * 1.13, hr * 1.13, hr * 1.13, 0, 0, 0, NAVY);
    HM.add(new THREE.SphereGeometry(1, 10, 6, Math.PI / 2 - .64, 1.28, 2.25, .6), 0, 0, 0, hr * 1.13, hr * 1.13, hr * 1.13, 0, 0, 0, NAVY);
    HM.add(new THREE.TorusGeometry(hr * 1.02, .018, 6, 20, 2.0), 0, .05, .1, 1, 1, .8, 0, 0, Math.PI / 2 - 1.0, GOLD);
    for(const s of [-1, 1]) HM.add(CG.torus, s * hr * .95, -.1, .06, .03, .03, .03, 0, Math.PI / 2, 0, GOLD);
    head.add(meshOf(HM));
    const face = facePatch(hr * 1.012, { glasses:'#d9a62e', wrinkles:true, blush:true, mouth:'smile', lip:'#9a4a3a' }); face.scale.z = .95; head.add(face);
    const legs = [-1, 1].map(s => { const p = pivot(body, s * .1, .1, 0); const L = new Merge().add(CG.sm, 0, -.04, .08, .085, .06, .14, 0, 0, 0, 0x6b4022); p.add(meshOf(L)); return p; });
    const arms = [-1, 1].map(s => arm(body, s * .27, .7, .26, .065, NAVY, 0xf1c6a3));
    arms.forEach(a => { a.rotation.z = -a.userData.side * .2; });
    const cane = new Merge().add(CG.cyl8, 0, -.28, .02, .025, .52, .025, 0, 0, 0, 0x8a5a2b).add(new THREE.TorusGeometry(.06, .022, 6, 10, Math.PI), -.06, -.05, .02, 1, 1, 1, 0, 0, 0, 0x8a5a2b);
    const cm = meshOf(cane); cm.position.set(0, -.2, .04); arms[1].add(cm);
    return { type:'laila', grp, body, head, face, legs, arms, sway:[], hr, blink:1.7, slow:true };
  };
  // مشاكس — orange tabby cat with a blue star bandana (on four paws)
  HEROES.mushakis = () => {
    const OR = 0xf2983a, LIGHT = 0xffd9a8;
    const grp = new THREE.Group(), body = new THREE.Group(); grp.add(body);
    const fur = canvasTex(128, 64, x => { x.fillStyle = '#f2983a'; x.fillRect(0, 0, 128, 64); x.fillStyle = '#d4691f'; for(let i = 0; i < 7; i++){ x.beginPath(); x.ellipse(i * 19 + 6, 32, 4, 30, 0, 0, 6.3); x.fill(); } x.fillStyle = '#ffd9a8'; x.fillRect(0, 54, 128, 10); });
    const torso = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14).rotateX(Math.PI / 2), new THREE.MeshLambertMaterial({ map:fur }));
    torso.scale.set(.27, .25, .36); torso.position.set(0, .44, -.06); body.add(torso);
    const M = new Merge();
    M.add(CG.sph, 0, .4, .14, .18, .15, .12, 0, 0, 0, LIGHT);
    M.add(new THREE.ConeGeometry(1, 1, 3), 0, .55, .24, .2, .2, .05, Math.PI / 2 + .5, 0, Math.PI, 0x2f6fb6);   // bandana
    M.add(CG.torus, 0, .62, .17, .17, .15, .3, Math.PI / 2 - .3, 0, 0, 0x2f6fb6);
    for(const [x, y] of [[-.06, .47], [.07, .5], [0, .42]]) M.add(starGeo, x, y, .3, .02, .02, .01, -.5, 0, 0, 0xffffff);
    body.add(meshOf(M));
    const hr = .3, head = pivot(body, 0, .78, .2);
    const HM = new Merge();
    HM.add(CG.sph, 0, 0, 0, hr * 1.06, hr * .92, hr * .95, 0, 0, 0, OR);
    HM.add(CG.sph, 0, -.09, .19, .13, .09, .1, 0, 0, 0, LIGHT);
    for(const s of [-1, 1]){
      HM.add(new THREE.ConeGeometry(1, 1, 4), s * .19, .25, -.02, .1, .18, .07, 0, 0, -s * .3, OR);
      HM.add(new THREE.ConeGeometry(1, 1, 4), s * .19, .24, .01, .06, .12, .03, 0, 0, -s * .3, 0xffa7b8);
    }
    for(const x of [-.07, 0, .07]) HM.add(CG.box, x, .23, .17, .025, .1, .02, -.5, 0, 0, 0xd4691f);
    head.add(meshOf(HM));
    const face = facePatch(hr * 1.02, { eye:'happy', mouth:'cat', nose:'pink', whiskers:true, blush:true, ink:'#5a2a10', mouthY:156 }); face.scale.set(1.05, .93, 1); head.add(face);
    const legs = [[-.14, .2], [.14, -.3], [.14, .2], [-.14, -.3]].map(([x, z]) => {
      const p = pivot(body, x, .3, z); const L = new Merge().add(CG.cyl8, 0, -.12, 0, .075, .24, .075, 0, 0, 0, OR).add(CG.sm, 0, -.26, .03, .09, .06, .11, 0, 0, 0, LIGHT); p.add(meshOf(L)); return p;
    });
    const tail = chain(body, 0, .5, -.4, [[0, .02, -.06, .07], [0, .1, -.14, .065], [0, .2, -.18, .06], [0, .31, -.17, .055], [0, .4, -.12, .05]], 0xe07f2a, 0xd4691f);
    return { type:'mushakis', grp, body, head, face, legs, arms:[], sway:[tail], hr, blink:.4, quad:true };
  };
  // زقزوق — grey mouse with pink ears and tail, denim vest, small backpack, holding a cheese
  HEROES.zaqzouq = () => {
    const GREY = 0x9da0aa, PINK = 0xffa3b6;
    const grp = new THREE.Group(), body = new THREE.Group(); grp.add(body);
    const M = new Merge();
    M.add(CG.sph, 0, .5, 0, .22, .26, .2, 0, 0, 0, GREY);
    M.add(CG.sph, 0, .47, .07, .15, .18, .14, 0, 0, 0, 0xd9dbe2);
    for(const s of [-1, 1]) M.add(CG.box, s * .14, .56, .1, .1, .26, .14, 0, s * .35, 0, 0x4f78b0);   // vest
    M.add(CG.box, 0, .54, -.2, .24, .28, .12, 0, 0, 0, 0x7a5636).add(CG.box, 0, .47, -.27, .18, .1, .04, 0, 0, 0, 0x2f8f8a);   // backpack
    // cheese held in front
    M.add(new THREE.CylinderGeometry(.13, .13, .13, 3), 0, .5, .25, 1, 1, 1, Math.PI / 2, 0, .3, 0xffd23f);
    for(const [x, y] of [[-.04, .52], [.05, .47], [.02, .56]]) M.add(CG.sm, x, y, .32, .022, .022, .01, 0, 0, 0, 0xe0a91f);
    body.add(meshOf(M));
    const hr = .3, head = pivot(body, 0, .92, 0);
    const HM = new Merge();
    HM.add(CG.sph, 0, 0, 0, hr, hr * .92, hr * .95, 0, 0, 0, GREY);
    HM.add(CG.sph, 0, -.08, .2, .11, .08, .1, 0, 0, 0, 0xd9dbe2).add(CG.sm, 0, -.06, .3, .04, .035, .03, 0, 0, 0, 0xff7f9e);
    for(const s of [-1, 1]){ HM.add(CG.sph, s * .27, .2, -.04, .17, .17, .05, 0, s * .3, 0, GREY); HM.add(CG.sph, s * .27, .2, -.01, .12, .12, .03, 0, s * .3, 0, PINK); }
    HM.add(CG.cone, 0, .3, .02, .05, .1, .05, 0, 0, 0, 0xb3b5be);
    head.add(meshOf(HM));
    const face = facePatch(hr * 1.015, { eye:'dot', mouth:'open', nose:false, whiskers:true, blush:true, mouthY:150 }); head.add(face);
    const legs = [-1, 1].map(s => { const p = pivot(body, s * .1, .28, 0); const L = new Merge().add(CG.cyl8, 0, -.1, 0, .06, .2, .06, 0, 0, 0, GREY).add(CG.sm, 0, -.23, .06, .07, .05, .12, 0, 0, 0, PINK); p.add(meshOf(L)); return p; });
    const arms = [-1, 1].map(s => { const a = arm(body, s * .2, .64, .2, .05, GREY, PINK); a.rotation.x = -1.2; a.rotation.z = s * -.35; a.userData.hold = true; return a; });
    const tail = chain(body, 0, .32, -.18, [[0, -.02, -.08, .04], [.03, -.04, -.18, .035], [.06, 0, -.27, .032], [.06, .08, -.33, .03], [.03, .16, -.35, .027], [0, .22, -.32, .025]], PINK);
    return { type:'zaqzouq', grp, body, head, face, legs, arms, sway:[tail], hr, blink:2.2 };
  };

  // شخصيتي — the kid's own avatar (girl or boy) dressed in the home wardrobe; av = an avatar object (default: the saved one)
  const hexN = c => parseInt(String(c).slice(1), 16);
  HEROES.me = av => {
    const A = window.Avatar;
    if(!A) return Object.assign(HEROES.sara(), { type:'me' });
    const a = av ? A.normalize(av) : A.load();
    const skin = hexN(A.SKINS[a.skin]), hc = hexN(A.HAIRC[a.hairCol].c), tc = hexN(A.CLOTH[a.topCol].c), pc = hexN(A.PANTS[a.botCol].c);
    const sc = hexN(A.CLOTH[a.shoeCol].c), ac = hexN(A.CLOTH[a.accCol].c), top = a.top, robe = top === 'robe';
    const longSl = { hoodie:1, jacket:1, shirt:1, sweater:1, robe:1 }[top], bareLegs = !robe && (a.bottom === 'shorts' || a.bottom === 'skirt');
    const G3 = { round:['#3a2a5a'], sun:['#1a1a22', 'rgba(25,22,35,.88)'], goggles:['#2b7fd6', 'rgba(150,220,255,.45)'] }[a.glasses];
    const face = { blush:a.cheeks, freckles:a.freckles, lashes:a.body === 'girl' || a.eyes === 'sparkle', mouth:'smile',
      eye:a.eyes === 'happy' ? 'happy' : a.eyes === 'dot' ? 'dot' : undefined, iris:a.eyes === 'sparkle' ? '#5a3a8a' : undefined, glasses:G3 && G3[0], lens:G3 && G3[1] };
    const h = kid({ skin, top:tc, inner:top === 'jacket' ? 0xffffff : null, skirt:top === 'dress' ? tc : (!robe && a.bottom === 'skirt') ? pc : null, bottom:robe ? tc : pc,
      legs:bareLegs ? skin : pc, shoes:a.shoes === 'sandals' ? skin : sc, sole:a.shoes === 'boots' ? 0x3a2a22 : a.shoes === 'sandals' ? sc : 0xffffff, sleeve:longSl ? tc : skin,
      legR:a.bottom === 'leggings' ? .06 : .066, face });
    const hr = h.hr, B = new Merge();
    if(!longSl) for(const s of [-1, 1]) B.add(CG.sm, s * .245, .7, 0, .085, .085, .085, 0, 0, 0, tc);          // short sleeves
    if(robe) B.add(new THREE.CylinderGeometry(.2, .32, 1, 18), 0, .41, 0, 1, .68, 1, 0, 0, 0, tc);              // long modest robe
    if(top === 'dress') B.add(new THREE.CylinderGeometry(.21, .3, 1, 18), 0, .43, 0, 1, .22, 1, 0, 0, 0, tc);
    if(top === 'hoodie') B.add(CG.sph, 0, .72, -.17, .17, .12, .08, 0, 0, 0, tc).add(CG.cyl8, -.04, .6, .19, .008, .12, .008, 0, 0, 0, 0xffffff).add(CG.cyl8, .04, .6, .19, .008, .12, .008, 0, 0, 0, 0xffffff);
    if(top === 'sweater') B.add(CG.cyl, 0, .47, 0, .215, .04, .19, 0, 0, 0, new THREE.Color(tc).multiplyScalar(.82).getHex());
    if(top === 'shirt') for(const s of [-1, 1]) B.add(CG.box, s * .05, .76, .14, .09, .04, .06, 0, 0, s * .4, 0xffffff);
    if(a.shoes === 'boots') for(const s of [-1, 1]) B.add(CG.cyl8, s * .1, .14, 0, .075, .12, .075, 0, 0, 0, sc);
    if(a.bottom === 'jeans' && !robe) B.add(CG.cyl, 0, .47, 0, .205, .025, .185, 0, 0, 0, 0x6b4a2a);           // belt
    if(a.extra === 'scarf') B.add(CG.torus, 0, .78, 0, .13, .13, .3, Math.PI / 2, 0, 0, ac).add(CG.box, .07, .66, .16, .07, .16, .03, 0, 0, 0, ac);
    if(a.back === 'backpack') B.add(CG.box, 0, .6, -.24, .34, .36, .16, 0, 0, 0, ac).add(CG.box, 0, .5, -.33, .24, .14, .05, 0, 0, 0, new THREE.Color(ac).multiplyScalar(.8).getHex())
      .add(CG.box, -.13, .66, .02, .04, .3, .4, 0, 0, 0, ac).add(CG.box, .13, .66, .02, .04, .3, .4, 0, 0, 0, ac);
    if(a.back === 'wings') for(const s of [-1, 1]){ const lc = new THREE.Color(ac).lerp(new THREE.Color(0xffffff), .45).getHex();
      B.add(CG.sph, s * .24, .72, -.24, .22, .13, .025, 0, s * .35, s * .5, lc).add(CG.sph, s * .2, .52, -.23, .14, .08, .025, 0, s * .35, -s * .5, lc); }
    if(!B.empty) h.body.add(meshOf(B));
    if(top === 'jersey'){
      const num = canvasTex(64, 64, (x, w) => { x.fillStyle = A.CLOTH[a.topCol].c === '#f4f1ea' || A.CLOTH[a.topCol].c === '#ffd23f' ? '#2b3a7a' : '#ffffff'; x.font = '800 52px system-ui,sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(String(a.num), 32, 36); });
      const m = new THREE.Mesh(new THREE.PlaneGeometry(.17, .17), new THREE.MeshLambertMaterial({ map:num, transparent:true, depthWrite:false })); m.position.set(0, .6, .215); h.body.add(m);
    }
    if(a.back === 'cape'){ const p = pivot(h.body, 0, .76, -.17), C = new Merge(); C.add(CG.box, 0, -.27, -.03, .4, .56, .025, 0, 0, 0, ac); C.add(CG.sm, -.1, .0, .12, .03, .03, .03, 0, 0, 0, 0xffd23f).add(CG.sm, .1, 0, .12, .03, .03, .03, 0, 0, 0, 0xffd23f); p.add(meshOf(C)); h.sway.push(p); }
    // hair
    const st = a.hair, H = new Merge();
    if(st === 'hijab'){
      const hj = hexN(A.CLOTH[a.hijabCol].c);
      H.add(new THREE.SphereGeometry(1, 22, 14, Math.PI / 2 + .62, Math.PI * 2 - 1.24, 0, Math.PI * .82), 0, 0, 0, hr * 1.13, hr * 1.13, hr * 1.13, 0, 0, 0, hj);
      H.add(new THREE.SphereGeometry(1, 10, 6, Math.PI / 2 - .64, 1.28, 0, .78), 0, 0, 0, hr * 1.13, hr * 1.13, hr * 1.13, 0, 0, 0, hj);
      H.add(new THREE.SphereGeometry(1, 10, 6, Math.PI / 2 - .64, 1.28, 2.25, .6), 0, 0, 0, hr * 1.13, hr * 1.13, hr * 1.13, 0, 0, 0, hj);
      h.body.add(meshOf(new Merge().add(CG.sph, 0, .76, 0, .24, .12, .22, 0, 0, 0, hj)));
    } else {
      hairCap(h.head, hr, hc, !['side', 'buzz', 'spiky', 'curlyb', 'caphair', 'afro'].includes(st));
      if(st === 'long') H.add(CG.sph, 0, -hr * .6, -hr * .45, hr * 1.02, hr * 1.15, hr * .55, 0, 0, 0, hc);
      if(st === 'longb') H.add(CG.sph, 0, -hr * .35, -hr * .4, hr * 1.0, hr * .85, hr * .55, 0, 0, 0, hc);
      if(st === 'bob') H.add(CG.sph, 0, -hr * .25, -.1, hr * 1.12, hr * .8, hr * 1.06, 0, 0, 0, hc);
      if(st === 'bun') H.add(CG.sph, 0, hr * 1.0, -hr * .25, hr * .36, hr * .36, hr * .36, 0, 0, 0, hc);
      if(st === 'afro') H.add(CG.sph, 0, hr * .15, -.1, hr * 1.3, hr * 1.22, hr * 1.1, 0, 0, 0, hc);
      if(st === 'side') H.add(CG.sm, -hr * .18, hr * .8, hr * .5, hr * .5, hr * .17, hr * .3, .5, 0, .3, hc);
      if(st === 'buzz') H.add(CG.sph, 0, .01, -.01, hr * 1.02, hr * 1.0, hr * 1.0, 0, 0, 0, hc);
      if(st === 'spiky') for(let i = 0; i < 7; i++){ const t = -1 + i / 3; H.add(CG.cone, Math.sin(t) * hr * .7, hr * (.95 - Math.abs(t) * .15), -hr * .1 + Math.cos(i) * .03, .07, .17, .07, -.3, 0, -t * .9, hc); }
      if(st === 'curlyb' || st === 'curly') for(let i = 0; i < 14; i++){ const t = i / 14 * Math.PI * 2, r = st === 'curly' ? hr * 1.02 : hr * .9;
        if(st === 'curly' && Math.sin(t) > .2) continue;   // keep the face clear
        H.add(CG.sm, Math.cos(t) * r, (st === 'curly' ? -hr * .1 : hr * .62) + Math.sin(t * 2) * .03, Math.sin(t) * r * .9 - .04, .09, .09, .09, 0, 0, 0, hc); }
      if(st === 'curly') for(let i = 0; i < 6; i++) H.add(CG.sm, (i - 2.5) * hr * .32, -hr * .7, -hr * .55, .1, .1, .1, 0, 0, 0, hc);
      if(st === 'caphair'){
        H.add(new THREE.SphereGeometry(1, 20, 10, 0, Math.PI * 2, 0, Math.PI * .56), 0, .04, -.02, hr * 1.16, hr * 1.0, hr * 1.16, -.3, 0, 0, ac);
        H.add(CG.cyl, 0, hr * .26, hr * .9, .2, .03, .16, .12, 0, 0, ac);
      }
      if(st === 'ponytail') h.sway.push(chain(h.head, 0, hr * .78, -hr * .6, [[0, .02, -.08, .1], [0, -.08, -.16, .095], [0, -.2, -.2, .085], [0, -.32, -.2, .07], [0, -.42, -.17, .05]], hc));
      if(st === 'braid'){ const pts = []; for(let i = 0; i < 7; i++) pts.push([.04 * Math.sin(i * .6), -.06 - i * .085, -.02 * i, .075 - i * .004]); pts.push([.03, -.66, -.14, .065]); h.sway.push(chain(h.head, .18, -.06, -.24, pts, hc, ac)); }
      if(st === 'pigtails') for(const s of [-1, 1]) h.sway.push(chain(h.head, s * hr * .88, hr * .35, -.04, [[s * .04, 0, 0, .1], [s * .08, -.1, 0, .09], [s * .09, -.21, 0, .075]], hc));
    }
    // hats from the wardrobe
    const hy = hr * .86;
    if(a.hat === 'cap'){ H.add(new THREE.SphereGeometry(1, 20, 10, 0, Math.PI * 2, 0, Math.PI * .56), 0, .04, -.02, hr * 1.17, hr * 1.0, hr * 1.17, -.3, 0, 0, 0x3a74d8).add(CG.cyl, 0, hr * .26, hr * .9, .2, .03, .16, .12, 0, 0, 0x2a5bb8); }
    else if(a.hat === 'top'){ H.add(CG.cyl, 0, hy + .14, 0, .17, .26, .17, 0, 0, 0, 0x26242c).add(CG.cyl, 0, hy + .02, 0, .27, .025, .27, 0, 0, 0, 0x26242c).add(CG.cyl, 0, hy + .05, 0, .175, .04, .175, 0, 0, 0, 0xd8343f); }
    else if(a.hat === 'grad'){ H.add(CG.cyl, 0, hy + .03, 0, .2, .08, .2, 0, 0, 0, 0x26242c).add(CG.box, 0, hy + .08, 0, .42, .025, .42, 0, Math.PI / 4, 0, 0x26242c).add(CG.cyl8, .14, hy - .02, .14, .012, .16, .012, 0, 0, 0, 0xffd23f); }
    else if(a.hat === 'crown'){ H.add(CG.cyl, 0, hy + .04, 0, .2, .1, .2, 0, 0, 0, 0xf5b700); for(let i = 0; i < 6; i++){ const t = i / 6 * Math.PI * 2; H.add(CG.cone, Math.cos(t) * .18, hy + .13, Math.sin(t) * .18, .045, .09, .045, 0, 0, 0, 0xf5b700); } H.add(CG.sm, 0, hy + .05, .2, .03, .03, .02, 0, 0, 0, 0xe8454f); }
    else if(a.hat === 'bow'){ for(const s of [-1, 1]) H.add(CG.sph, s * .08, hy, hr * .3, .08, .055, .04, 0, 0, s * .4, 0xff6fae); H.add(CG.sm, 0, hy, hr * .32, .03, .03, .03, 0, 0, 0, 0xe8458f); }
    else if(a.hat === 'flower'){ for(let i = 0; i < 5; i++){ const t = i / 5 * Math.PI * 2; H.add(CG.sm, hr * .55 + Math.cos(t) * .05, hy - .02 + Math.sin(t) * .05, hr * .35, .04, .04, .02, 0, 0, 0, 0xff8fbf); } H.add(CG.sm, hr * .55, hy - .02, hr * .37, .025, .025, .02, 0, 0, 0, 0xffd23f); }
    if(a.extra === 'phones'){ H.add(new THREE.TorusGeometry(hr * 1.12, .025, 6, 24, Math.PI), 0, 0, 0, 1, 1, 1, 0, 0, 0, ac); for(const s of [-1, 1]) H.add(CG.cyl, s * hr * 1.1, 0, 0, .07, .05, .07, 0, 0, Math.PI / 2, ac); }
    if(!H.empty) h.head.add(meshOf(H));
    return Object.assign(h, { type:'me' });
  };

  const HERO_IDS = ['me', 'sara', 'sidra', 'qamar', 'samir', 'mushakis', 'zaqzouq', 'laila'];
  const L = window.L || (a => a);
  const HERO_NAME = {
    me:L('شخصيتي', 'My character', 'Karakterim'), sara:L('سارة', 'Sara', 'Sara'), sidra:L('سيدرة', 'Sidra', 'Sidra'), qamar:L('قمر', 'Qamar', 'Kamer'), samir:L('سمير', 'Samir', 'Semir'),
    mushakis:L('مشاكس', 'Mushakis', 'Muşakis'), zaqzouq:L('زقزوق', 'Zaqzouq', 'Zakzuk'), laila:L('العمة ليلى', 'Aunt Laila', 'Leyla Teyze')
  };
  let meCol = '#9b6bff'; try{ const A = window.Avatar; if(A) meCol = A.CLOTH[A.load().topCol].c; }catch(e){}
  const HERO_COLOR = { me:meCol, sara:'#9c7be3', sidra:'#1fa6a9', qamar:'#f5c518', samir:'#3a74d8', mushakis:'#f2983a', zaqzouq:'#8e93a3', laila:'#2b3a7a' };

  /* s = { t, dt, run, grounded, vy, sq, flip }  (+ optional sneak 0..1: tiptoe crouch, and pace: step-speed factor) */
  function poseHero(h, s){
    const t = s.t, dt = s.dt || 0, run = s.grounded ? s.run : 0, air = !s.grounded, sn = s.sneak || 0;
    const k = (h.slow ? 9 : 13) * (s.pace || 1);
    const bounce = s.grounded ? Math.abs(Math.sin(t * k)) * .07 * run + Math.sin(t * 3) * .015 * (1 - run) : 0;
    const sy = 1 + s.sq, sxz = 1 - s.sq * .6;
    h.body.scale.set(sxz, sy, sxz); h.body.position.y = bounce - sn * .07; h.body.rotation.set(run * .1 + sn * .2, 0, 0);
    if(s.flip > 0) h.body.rotation.x = (1 - s.flip) * Math.PI * 2;
    h.head.rotation.x = Math.sin(t * 2.1) * .04 - (air ? clamp(s.vy * .015, -.15, .15) : 0);
    h.head.rotation.z = Math.sin(t * 1.3) * .04;
    const bt = t + h.blink, blink = (bt % 3.7) < .13 || ((bt + 1.3) % 6.1) < .1;
    const fm = h.face.material, want = blink ? h.face.userData.shut : h.face.userData.open;
    if(fm.map !== want){ fm.map = want; fm.needsUpdate = true; }
    if(h.quad){
      h.legs.forEach((l, i) => { l.rotation.x = air ? (i % 2 ? .6 : -.6) : Math.sin(t * 14 + (i === 0 || i === 1 ? 0 : Math.PI)) * .8 * run; });
    } else {
      h.legs.forEach((l, i) => { l.rotation.x = air ? (i ? -.5 : .35) : Math.sin(t * k + i * Math.PI) * .75 * run; });
    }
    h.arms.forEach((a, i) => {
      if(a.userData.hold){ a.rotation.x = -1.2 + (air ? -.3 : Math.sin(t * k) * .08 * run); return; }
      const side = a.userData.side;
      if(air){ a.rotation.x = -.4; a.rotation.z = -side * (1.5 + Math.sin(t * 10) * .1); }
      else { a.rotation.x = -Math.sin(t * k + i * Math.PI) * (h.slow ? .45 : .9) * run * (1 - sn * .6) - sn * .7; a.rotation.z = -side * (.22 + Math.sin(t * 2 + i) * .03 + sn * .25); }
    });
    h.sw = h.sw || { a:0, v:0 };
    const target = air ? clamp(s.vy * .05, -.6, .5) : -run * .35 + Math.sin(t * 2.4) * .06;
    h.sw.v += ((target - h.sw.a) * 90 - h.sw.v * 7) * dt; h.sw.a += h.sw.v * dt;
    h.sway.forEach((p, i) => { p.rotation.x = h.sw.a * (i % 2 ? .9 : 1); p.rotation.z = Math.sin(t * 3 + i) * .08 * (1 + run); });
  }

  /* all meshes of a hero cast (and optionally receive) shadows */
  function shadowHero(h, receive = false){ h.grp.traverse(o => { if(o.isMesh && o !== h.face){ o.castShadow = true; o.receiveShadow = receive; } }); return h; }

  mePictures();
  return { Merge, G, CG, canvasTex, glowTex, blobTex, starGeo, starShape, HEROES, HERO_IDS, HERO_NAME, HERO_COLOR, poseHero, clamp,
    capsule, charMat, rimify, meshOf, pivot, faceTex, facePatch, drawFace, shadowHero, SKIN };
}

/* hero pickers show chars/me.png for 'me': swap it for a live drawing of the saved avatar, and give the 8-hero picker 8 columns.
   Runs once per page, whatever game imported the kit. */
let mePicSet = false;
function mePictures(){
  if(mePicSet || typeof document === 'undefined' || !window.Avatar || !window.MutationObserver) return;
  mePicSet = true;
  let url = null;
  const pic = () => url || (url = window.Avatar.portrait());
  const SEL = 'img[src$="chars/me.png"]';
  const fix = el => { if(el.nodeType !== 1) return; if(el.matches(SEL)) el.src = pic(); else if(el.querySelectorAll) el.querySelectorAll(SEL).forEach(i => { i.src = pic(); }); };
  try{
    const css = document.createElement('style');
    css.textContent = '.heroes:has(> :nth-child(8)){grid-template-columns:repeat(8,minmax(0,1fr))}';
    document.head.appendChild(css);
  }catch(e){}
  new MutationObserver(list => { for(const m of list){ if(m.type === 'attributes') fix(m.target); else m.addedNodes.forEach(fix); } })
    .observe(document.documentElement, { childList:true, subtree:true, attributes:true, attributeFilter:['src'] });
  fix(document.documentElement);
}
