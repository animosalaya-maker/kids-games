/* «جبل التلج» Snow Mountain: a terraced snowy mountain with switchback stairs, a chairlift, an ice slide, a cozy cabin
   on the summit and the sled race down the north face. Built on the first visit (see zones.js). Local coords. */
import { SNOW, rampY, snowStairs, chairAt, slideAt, sledTrack, ZSTN, zkit, portal, ZONES } from './zones.js';

const smooth = t => t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t);

/* a U-shaped chute along sampled points [{x,y,z,nx,nz}] → arrays for one BufferGeometry */
export function trough(THREE, pts, w, cols, floorFn, out){
  const prof = [[-w - .45, .62, cols.rim], [-w - .12, .7, cols.rim], [-w, .3, cols.side], [-w * .55, 0, cols.floor], [w * .55, 0, cols.floor], [w, .3, cols.side], [w + .12, .7, cols.rim], [w + .45, .62, cols.rim], [w + .45, -.28, cols.under], [-w - .45, -.28, cols.under]];
  const base = out.pos.length / 3, n = prof.length, c = new THREE.Color();
  pts.forEach((p, i) => { for(const [l, dy, col] of prof){ out.pos.push(p.x + p.nx * l, p.y + dy, p.z + p.nz * l); c.set(col); const k = .92 + .08 * Math.sin(i * .7); out.col.push(c.r * k, c.g * k, c.b * k); } });
  for(let i = 0; i < pts.length - 1; i++) for(let j = 0; j < n; j++){ const a = base + i * n + j, b = base + i * n + (j + 1) % n, d = a + n, e = b + n; out.idx.push(a, b, d, b, e, d); }
}
function geoOf(THREE, o){ const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(o.pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(o.col, 3)); g.setIndex(o.idx); g.computeVertexNormals(); return g; }

export function build(api, Z){
  const { THREE, K, L, N } = api;
  const { TR, TT, FLARE } = SNOW;
  /* ground: snow plain + beach; the mountain tiers count as ground (for shading, the camera and blobs) */
  function ground(x, z){
    const r = Math.hypot(x, z);
    for(let k = TR.length - 1; k >= 0; k--) if(r <= TR[k] + .35) return TT[k];
    if(r < 84) return 0; if(r < 92) return -1.6 * smooth((r - 84) / 8); return -1.6 - 2.4 * smooth((r - 92) / 18);
  }
  const k = zkit(THREE, K, Z, ground), { M, CG, G, Merge, addC, addB, rnd, group } = k;
  const C = { snow:0xf4f8ff, snow2:0xe3ecfb, rock:0x9aa2c8, rock2:0x7f88b4, wood:0xb87a48, woodD:0x8a5532, red:0xe8505b, blue:0x4f7fe8, ice:0x9fe0ff, pine:0x2f7a5a, pine2:0x3f9a6a, gold:0xffc83a, orange:0xff9a3c };

  /* ---------- ground ---------- */
  const rings = []; for(let r = 37.4; r <= 120; r += r < 84 ? 3 : r < 96 ? 1.2 : 6) rings.push(r);
  k.groundMesh(120, rings, (x, z, r, y, c) => {
    const nz = Math.sin(x * .19 + Math.cos(z * .13) * 2) * .5 + Math.sin(z * .11 - x * .05) * .5;
    if(r < 83) c.set(0xf2f6ff).lerp(new THREE.Color(0xc4d4fa), .3 + nz * .25);
    else c.set(0xe9e2d0).lerp(new THREE.Color(C.snow), smooth((84 - r) / 2));
  }, 140);

  /* ---------- the mountain: 5 rocky tiers with snow caps (one lathe mesh) ---------- */
  (() => {
    const o = { pos:[], col:[], idx:[] }, NA = 96, cc = new THREE.Color();
    for(let t = 0; t < TR.length; t++){
      const R = TR[t], y1 = TT[t], y0 = t ? TT[t - 1] - .3 : -.4;
      const prof = [[R + FLARE + .25, y0, C.rock2], [R + FLARE, y0 + (y1 - y0) * .3, C.rock], [R + .45, y0 + (y1 - y0) * .75, C.rock], [R + .3, y1 - .55, C.rock2], [R + .45, y1 - .3, C.snow2], [R + .2, y1, C.snow], [R - 1.2, y1 + .06, C.snow], [0, y1 + .06, C.snow]];
      const base = o.pos.length / 3;
      for(let j = 0; j <= NA; j++){
        const a = j / NA * Math.PI * 2, wob = Math.sin(a * 7 + t * 2) * .22 + Math.sin(a * 17 + t) * .12;
        prof.forEach(([r, y, col], pi) => { const rr = r + (pi < 4 && r > 0 ? wob : 0); o.pos.push(Math.sin(a) * rr, y, Math.cos(a) * rr);
          cc.set(col); if(pi < 4){ const s = .9 + .1 * Math.sin(y * 3.1 + a * 5); cc.multiplyScalar(s); } o.col.push(cc.r, cc.g, cc.b); });
      }
      const n = prof.length;
      for(let j = 0; j < NA; j++) for(let i = 0; i < n - 1; i++){ const a = base + j * n + i, b = a + 1, d = a + n, e = b + n; o.idx.push(a, d, b, b, d, e); }
      addC(0, 0, R + .35, -2, y1);
    }
    const g = geoOf(THREE, o), m = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ vertexColors:true })); m.castShadow = m.receiveShadow = true; group.add(m);
    // icicles under the snow lips and soft snow lumps on the tier tops
    for(let t = 0; t < TR.length; t++) for(let j = 0; j < 22; j++){ const a = j / 22 * 6.283 + t, R = TR[t] + .55, x = Math.sin(a) * R, z = Math.cos(a) * R;
      M(x, z, true).add(CG.cone, x, TT[t] - .75, z, .14, .7 + rnd() * .5, .14, Math.PI, 0, 0, C.ice); }
  })();

  /* ---------- switchback stairs (wooden planks with snow) ---------- */
  const stairs = snowStairs();
  stairs.forEach((s, i) => {
    const m = M(s.x, s.z), lower = s.k ? TT[s.k - 1] : 0;
    m.add(G.box, s.x, s.y - .2, s.z, 1.95, .4, 1.55, 0, s.a + Math.PI / 2, 0, i % 2 ? C.wood : 0xc28854);
    m.add(G.box, s.x, s.y + .02, s.z, 1.8, .06, 1.4, 0, s.a + Math.PI / 2, 0, C.snow);
    m.add(G.box, s.x, (lower + s.y - .4) / 2, s.z, .5, Math.max(.05, s.y - .4 - lower), .5, 0, 0, 0, C.woodD);
    if(i % 2 === 0){ const px = Math.sin(s.a) * (s.R + .9), pz = Math.cos(s.a) * (s.R + .9); m.add(CG.cyl8, px, s.y + .5, pz, .07, 1.1, .07, 0, 0, 0, C.woodD); m.add(CG.sph, px, s.y + 1.1, pz, .13, .13, .13, 0, 0, 0, s.k % 2 ? C.red : C.blue); }
    addC(s.x, s.z, 1.0, s.y - .4, s.y);
  });

  /* ---------- summit: the cozy cabin ---------- */
  const smoke = [];
  (() => {
    const x = 4.5, z = 1, y = TT[4], m = M(x, z);
    for(let i = 0; i < 7; i++) m.add(CG.cyl8, x, y + .22 + i * .42, z, 2.65, .44, 2.15, 0, 0, Math.PI / 2, i % 2 ? C.wood : 0xa86a3c);   // log walls (a stack of logs)
    m.add(G.box, x, y + 1.5, z, 5.2, 3, 4.2, 0, 0, 0, 0xb07040);
    for(const s of [-1, 1]){ m.add(G.box, x, y + 3.95, z + s * 1.25, 6, .25, 2.9, s * .62, 0, 0, C.red); m.add(G.box, x, y + 4.16, z + s * 1.2, 6.1, .2, 2.7, s * .62, 0, 0, C.snow); }
    m.add(G.box, x, y + 4.75, z, 6.1, .35, .6, 0, 0, 0, C.snow);
    m.add(G.box, x + 1.6, y + 4.6, z - .8, .8, 2, .8, 0, 0, 0, 0x8a8fa8); m.add(G.box, x + 1.6, y + 5.65, z - .8, 1, .2, 1, 0, 0, 0, C.snow);
    m.add(G.box, x - .4, y + 1.1, z + 2.13, 1.1, 2.2, .1, 0, 0, 0, C.woodD); m.add(CG.sph, x - .05, y + 1.1, z + 2.2, .07, .07, .07, 0, 0, 0, C.gold);
    m.add(CG.torus, x - .4, y + 2.55, z + 2.2, .32, .32, .5, 0, 0, 0, 0x2f8a4a);
    for(const wx of [x - 1.9, x + 1.3]){ k.glow.add(G.box, wx, y + 1.5, z + 2.12, .9, .8, .04, 0, 0, 0, 0xffd27a); m.add(G.box, wx, y + 1.5, z + 2.15, .1, .9, .06, 0, 0, 0, C.woodD); m.add(G.box, wx, y + 1.05, z + 2.25, 1.1, .12, .3, 0, 0, 0, C.snow); }
    // bench, lantern, a sign
    m.add(G.box, x - 1, y + .45, z + 3.6, 2, .12, .5, 0, 0, 0, C.wood); for(const s of [-1, 1]) m.add(G.box, x - 1 + s * .8, y + .22, z + 3.6, .12, .44, .45, 0, 0, 0, C.woodD);
    m.add(CG.cyl8, x + 2.9, y + 1.2, z + 2.6, .07, 2.4, .07, 0, 0, 0, 0x3a3048); k.glow.add(CG.cyl8, x + 2.9, y + 2.5, z + 2.6, .2, .4, .2, 0, 0, 0, 0xffd27a);
    addB(x, z, 2.75, 2.25, y, y + 4.6);
    for(let i = 0; i < 4; i++){ const s = new THREE.Sprite(new THREE.SpriteMaterial({ map:k.glowTex, color:0xf2f0ff, transparent:true, opacity:.6, depthWrite:false })); s.userData.ph = i / 4; group.add(s); smoke.push(s); }
  })();

  /* ---------- the chairlift ---------- */
  const chair = (() => {
    const g = new Merge();
    g.add(G.box, 0, 0, 0, 1.3, .12, .7, 0, 0, 0, 0xffffff); g.add(G.box, 0, .38, -.34, 1.3, .7, .1, 0, 0, 0, 0xffffff);
    g.add(CG.cyl8, 0, 1.4, -.3, .04, 2.2, .04, 0, 0, 0, 0x555566); g.add(G.box, 0, .55, .25, 1.3, .06, .06, 0, 0, 0, 0x555566);
    return g.geometry();
  })();
  const chairMat = new THREE.MeshLambertMaterial({ vertexColors:true });
  const NCH = 12, chairs = new THREE.InstancedMesh(chair, chairMat, NCH); group.add(chairs);
  const chairCols = [0xe8505b, 0x4f7fe8, 0xffc83a, 0x3fbf7f, 0x9b6bff, 0xff9a3c];
  for(let i = 0; i < NCH; i++) chairs.setColorAt(i, new THREE.Color(chairCols[i % chairCols.length]));
  const cableAt = (t, side) => { const p = chairAt(t); return [side, p[1] + 2.3 + .6 * Math.sin(t * Math.PI) * 0, p[2]]; };
  (() => {
    for(const side of [-1, 1]){ const pts = []; for(let i = 0; i <= 30; i++){ const p = chairAt(i / 30); pts.push(new THREE.Vector3(side, p[1] + 2.3 + .6 * Math.sin(i / 30 * Math.PI) - .6 * Math.sin(i / 30 * Math.PI), p[2])); }
      const tube = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, .05, 5), new THREE.MeshLambertMaterial({ color:0x3a3048 })); group.add(tube); }
    // stations
    const b = M(0, 50); b.add(G.box, 0, .25, 50, 5.2, .5, 4, 0, 0, 0, 0xc9b28a);
    for(const [ox, oz] of [[-2.2, 48.5], [2.2, 48.5], [-2.2, 51.6], [2.2, 51.6]]) b.add(CG.cyl8, ox, 3, oz, .16, 6, .16, 0, 0, 0, C.woodD);
    b.add(G.box, 0, 6.1, 50, 5.8, .3, 4.6, 0, 0, 0, C.red); b.add(G.box, 0, 6.32, 50, 5.6, .2, 4.4, 0, 0, 0, C.snow);
    b.add(new THREE.TorusGeometry(1, .14, 8, 24), 0, 4.6, 48.6, 1, 1, 1, Math.PI / 2, 0, 0, 0x555566);
    addB(0, 51.2, 2.6, .9, 0, 6);
    const t = M(0, 4), ty = TT[4];
    for(const [ox, oz] of [[-2.2, 3], [2.2, 3], [-2.2, 6.6], [2.2, 6.6]]) t.add(CG.cyl8, ox, ty + 3.5, oz, .16, 7, .16, 0, 0, 0, C.woodD);
    t.add(G.box, 0, ty + 7.1, 4.8, 5.8, .3, 4.8, 0, 0, 0, C.red); t.add(G.box, 0, ty + 7.32, 4.8, 5.6, .2, 4.6, 0, 0, 0, C.snow);
    t.add(new THREE.TorusGeometry(1, .14, 8, 24), 0, 32, 5.6, 1, 1, 1, Math.PI / 2, 0, 0, 0x555566);
    for(const [ox, oz] of [[-2.2, 3], [2.2, 3], [-2.2, 6.6], [2.2, 6.6]]) addC(ox, oz, .25, ty, ty + 7);
    // pylons
    for(const [pz, py0] of [[40, 0], [19, TT[2]]]){ const tt = (48 - pz) / 42, top = 4.6 + 27.4 * tt + .1, m = M(0, pz);
      m.add(CG.cyl8, 0, (py0 + top) / 2, pz, .3, top - py0, .3, 0, 0, 0, 0x8a8fa8); m.add(G.box, 0, top, pz, 3, .25, .35, 0, 0, 0, 0x6a6f88); addC(0, pz, .35, py0, top); }
    k.sign(L('التلفريك', 'Chairlift', 'Teleferik'), '#ff6f8e', 0, 7.6, 47, 3.4);
  })();
  void cableAt;
  const myChair = new THREE.Mesh(chair, new THREE.MeshLambertMaterial({ color:0xff5d73 })); myChair.visible = false; group.add(myChair);

  /* ---------- the ice slide (spiral chute, west side) ---------- */
  (() => {
    const pts = []; for(let i = 0; i <= 90; i++){ const t = i / 90, p = slideAt(t), q = slideAt(Math.min(1, t + .01)), p0 = slideAt(Math.max(0, t - .01)), tx = q[0] - p0[0], tz = q[2] - p0[2], l = Math.hypot(tx, tz) || 1;
      pts.push({ x:p[0], y:p[1] - .55, z:p[2], nx:tz / l, nz:-tx / l }); }
    // run-out on the snow
    const e = pts[pts.length - 1]; for(let i = 1; i <= 6; i++){ const a = 6 + 0, r = 46 + i; pts.push({ x:Math.sin(a) * r, y:Math.max(.05, e.y - i * .1), z:Math.cos(a) * r, nx:e.nx, nz:e.nz }); }
    const o = { pos:[], col:[], idx:[] }; trough(THREE, pts, 1.1, { rim:0xffffff, side:0xbfeaff, floor:0x8fd8ff, under:0x6fb0d8 }, null, o);
    const m = new THREE.Mesh(geoOf(THREE, o), new THREE.MeshPhongMaterial({ vertexColors:true, shininess:90, specular:0x99aabb })); m.castShadow = true; m.receiveShadow = true; group.add(m);
    pts.forEach((p, i) => { if(i % 6) return; const f = ground(p.x, p.z); if(p.y - f < 1) return; M(p.x, p.z).add(G.box, p.x, (f + p.y - .3) / 2, p.z, .35, p.y - .3 - f, .35, 0, 0, 0, C.woodD); });
  })();

  /* ---------- the sled run (a snowy chute on wooden trestles down the north face, then a long curve on the snow) ---------- */
  const TRK = sledTrack();
  const flakes = [], bumps = [];
  (() => {
    const pts = []; for(let s = 0; s <= TRK.len; s += 1.2){ const p = TRK.at(s); pts.push({ x:p.x, y:p.y - .25, z:p.z, nx:p.nx, nz:p.nz }); }
    const o = { pos:[], col:[], idx:[] }; trough(THREE, pts, TRK.W, { rim:0x7fc8ff, side:0xffffff, floor:0xf4f8ff, under:0xb8c6e8 }, null, o);
    const m = new THREE.Mesh(geoOf(THREE, o), new THREE.MeshLambertMaterial({ vertexColors:true })); m.castShadow = true; m.receiveShadow = true; group.add(m);
    pts.forEach((p, i) => {
      const f = ground(p.x, p.z);
      if(i % 4 === 0 && p.y - f > .6) for(const s of [-1, 1]){ const x = p.x + p.nx * s * (TRK.W + .2), z = p.z + p.nz * s * (TRK.W + .2); M(x, z).add(G.box, x, (f + p.y - .3) / 2, z, .3, p.y - .3 - f, .3, 0, 0, 0, C.woodD); }
      if(i % 6 === 3) for(const s of [-1, 1]){ const x = p.x + p.nx * s * (TRK.W + .7), z = p.z + p.nz * s * (TRK.W + .7), dm = M(x, z, true);
        dm.add(CG.cyl8, x, p.y + .9, z, .05, 1.8, .05, 0, 0, 0, 0xffffff); dm.add(CG.cone4, x, p.y + 1.55, z, .35, .55, .06, 0, Math.atan2(p.nx, p.nz), Math.PI / 2, (i / 6 | 0) % 2 ? C.red : C.blue); }
    });
    // start and finish arches
    for(const [s, col, txt] of [[3, '#7fd6ff', L('البداية', 'Start', 'Başlangıç')], [TRK.len - 3, '#ffcd4d', L('النهاية', 'Finish', 'Bitiş')]]){
      const p = TRK.at(s), m = M(p.x, p.z), ang = Math.atan2(p.nx, p.nz);
      for(const sd of [-1, 1]) m.add(CG.cyl8, p.x + p.nx * sd * (TRK.W + .6), p.y + 1.8, p.z + p.nz * sd * (TRK.W + .6), .18, 3.6, .18, 0, 0, 0, 0xfff7e8);
      m.add(G.box, p.x, p.y + 3.7, p.z, (TRK.W + .8) * 2, .7, .2, 0, ang + Math.PI / 2, 0, new THREE.Color(col).getHex());
      for(let q = 0; q < 6; q++){ const l = -TRK.W + q * TRK.W * 2 / 5; m.add(G.box, p.x + p.nx * l, p.y + 3.3, p.z + p.nz * l, .45, .3, .05, 0, ang + Math.PI / 2, 0, q % 2 ? 0x222233 : 0xffffff); }
      k.sign(txt, col, p.x, p.y + 5, p.z, 3);
    }
    // snowflake boosters and soft snowball bumps on the track
    [[14, 0], [24, -1.5], [33, 1.6], [44, 0], [55, -1.4], [66, 1.5], [78, 0], [90, -1.6], [101, 1.4], [112, 0], [124, -1.5], [136, 1.5], [148, 0], [160, -1.2]].forEach(([s, l]) => { if(s < TRK.len - 6) flakes.push({ s, l }); });
    [[19, 1.2], [38, -1.3], [60, 0], [84, 1.3], [107, -1.2], [130, .2], [152, 1.3]].forEach(([s, l]) => { if(s < TRK.len - 6){ bumps.push({ s, l }); const p = TRK.at(s, l), m = M(p.x, p.z);
      m.add(CG.sph, p.x, p.y + .35, p.z, .62, .5, .62, 0, 0, 0, C.snow); m.add(CG.sph, p.x, p.y + .95, p.z, .42, .4, .42, 0, 0, 0, C.snow);
      for(const sd of [-1, 1]) m.add(CG.sm, p.x + p.tx * .38 + p.nx * sd * .14, p.y + 1.02, p.z + p.tz * .38 + p.nz * sd * .14, .05, .05, .05, 0, 0, 0, 0x222233);
      m.add(CG.cone, p.x + p.tx * .5, p.y + .95, p.z + p.tz * .5, .07, .32, .07, Math.PI / 2, Math.atan2(p.tx, p.tz), 0, C.orange); } });
  })();
  const flakeMesh = new THREE.InstancedMesh(K.starGeo, new THREE.MeshPhongMaterial({ color:0xbfeaff, emissive:0x2a6a9a, shininess:90, specular:0xffffff }), flakes.length); group.add(flakeMesh);
  const mySled = new THREE.Mesh(api.vehGeo('sled', 0xff5d73), new THREE.MeshLambertMaterial({ vertexColors:true })); mySled.visible = false; group.add(mySled);

  /* ---------- snowmen, pine trees, a frozen pond, rocks ---------- */
  function snowman(x, z, s, scarf, hat){
    const m = M(x, z), y = ground(x, z);
    m.add(CG.sph, x, y + .9 * s, z, 1 * s, .95 * s, 1 * s, 0, 0, 0, C.snow); m.add(CG.sph, x, y + 2.25 * s, z, .72 * s, .7 * s, .72 * s, 0, 0, 0, C.snow); m.add(CG.sph, x, y + 3.25 * s, z, .52 * s, .5 * s, .52 * s, 0, 0, 0, C.snow);
    const fz = z + .48 * s; for(const sd of [-1, 1]) m.add(CG.sm, x + sd * .18 * s, y + 3.38 * s, fz, .07 * s, .07 * s, .05 * s, 0, 0, 0, 0x222233);
    m.add(CG.cone, x, y + 3.22 * s, fz + .2 * s, .09 * s, .5 * s, .09 * s, Math.PI / 2, 0, 0, C.orange);
    m.add(CG.torus, x, y + 2.85 * s, z, .6 * s, .6 * s, .9 * s, Math.PI / 2, 0, 0, scarf); m.add(G.box, x + .35 * s, y + 2.5 * s, z + .5 * s, .22 * s, .6 * s, .1 * s, 0, 0, .2, scarf);
    for(let i = 0; i < 3; i++) m.add(CG.sm, x, y + (1.9 + i * .35) * s, z + .7 * s, .06 * s, .06 * s, .04 * s, 0, 0, 0, 0x222233);
    m.add(CG.cone, x, y + 3.95 * s, z, .5 * s, .8 * s, .5 * s, 0, 0, 0, hat); m.add(CG.sph, x, y + 4.4 * s, z, .16 * s, .16 * s, .16 * s, 0, 0, 0, 0xffffff);
    for(const sd of [-1, 1]) m.add(CG.cyl8, x + sd * .9 * s, y + 2.4 * s, z, .04 * s, 1.1 * s, .04 * s, 0, 0, sd * .9, C.woodD);
    addC(x, z, 1 * s, y, y + 4 * s);
  }
  [[22, 60, 1.1, C.red, C.blue], [-20, 62, 1, C.blue, C.red], [48, 22, 1.2, 0x3fbf7f, C.gold], [-50, 10, 1, 0x9b6bff, 0x3fbf7f], [-35, -55, 1.1, C.gold, C.red], [-62, 40, .9, C.red, 0x9b6bff], [70, 40, 1, C.blue, C.gold], [-70, -20, 1, 0x3fbf7f, C.red], [-4.5, 3, .5, C.red, C.blue]]
    .forEach(([x, z, s, a, b]) => snowman(x, z, s, a, b));
  // pond
  const pond = { x:-45, z:-38, r:8.6 };
  (() => { const m = new THREE.Mesh(new THREE.CircleGeometry(pond.r, 40).rotateX(-Math.PI / 2), new THREE.MeshPhongMaterial({ color:0xbfeaff, specular:0xffffff, shininess:120, transparent:true, opacity:.92 })); m.position.set(pond.x, .04, pond.z); m.receiveShadow = true; group.add(m);
    for(let j = 0; j < 26; j++){ const a = j / 26 * 6.283, x = pond.x + Math.sin(a) * (pond.r + .4), z = pond.z + Math.cos(a) * (pond.r + .4); M(x, z, true).add(CG.sm, x, .1, z, .55 + rnd() * .3, .3, .5, 0, a, 0, C.snow2); } })();
  // pine trees with snow (instanced)
  const sledNear = (x, z) => { for(let s = 0; s < TRK.len; s += 3){ const p = TRK.at(s); if(Math.hypot(p.x - x, p.z - z) < 6) return true; } return false; };
  const treeSpots = [];
  for(let i = 0; i < 260 && treeSpots.length < 120; i++){
    const a = rnd() * 6.283, r = 42 + rnd() * 40, x = Math.sin(a) * r, z = Math.cos(a) * r;
    if(Math.abs(x) < 7 && z > 34) continue; if(Math.hypot(x - pond.x, z - pond.z) < 12) continue; if(Math.abs(x) < 9 && z > 64) continue;
    if(sledNear(x, z) || treeSpots.some(t => Math.hypot(t[0] - x, t[2] - z) < 4)) continue;
    if([[22, 60], [-20, 62], [48, 22], [-50, 10], [-35, -55], [-62, 40], [70, 40], [-70, -20], [-40, 50], [-70, 15]].some(([sx, sz]) => Math.hypot(sx - x, sz - z) < 4.5)) continue;
    if(Math.abs(Math.atan2(x, z) - 6) < .25 && r < 56) continue;
    const s = .9 + rnd() * .6; treeSpots.push([x, 0, z, s, rnd() * 6]); addC(x, z, .45 * s, 0, 4);
  }
  // small pines and snow lumps on the terraces, away from the stairs, the slide, the sled run and the chairlift
  for(let t = 0; t < 4; t++){ const r0 = TR[t + 1] + 2.2, r1 = TR[t] - 1.1; if(r1 <= r0) continue;
    for(let j = 0; j < 40; j++){ const a = rnd() * 6.283, ok = (a > .3 && a < .95) || (a > 2.4 && a < 2.62) || (a > 3.66 && a < 3.98); if(!ok) continue;
      const r = r0 + rnd() * (r1 - r0), x = Math.sin(a) * r, z = Math.cos(a) * r; if(treeSpots.some(q => Math.hypot(q[0] - x, q[2] - z) < 3)) continue;
      if(rnd() < .55){ const s = .5 + rnd() * .3; treeSpots.push([x, TT[t], z, s, rnd() * 6]); addC(x, z, .45 * s, TT[t], TT[t] + 3); }
      else M(x, z, true).add(CG.sph, x, TT[t] + .1, z, .9 + rnd() * .6, .45, .8 + rnd() * .5, 0, rnd() * 3, 0, C.snow2); } }
  (() => {
    const m = new Merge();
    m.add(CG.cyl8, 0, .6, 0, .25, 1.2, .25, 0, 0, 0, C.woodD);
    [[1.9, 1.9, 1.7], [1.5, 1.7, 2.9], [1.05, 1.5, 4], [.6, 1.2, 4.95]].forEach(([r, h, y], i) => { m.add(CG.cone, 0, y, 0, r, h, r, 0, 0, 0, i % 2 ? C.pine : C.pine2); m.add(CG.cone, 0, y + h * .22, 0, r * .72, h * .55, r * .72, 0, i, 0, C.snow); });
    k.inst(m.geometry(), treeSpots);
  })();
  // a few sparkly blue rocks
  for(let i = 0; i < 26; i++){ const a = rnd() * 6.283, r = 40 + rnd() * 42, x = Math.sin(a) * r, z = Math.cos(a) * r; if(sledNear(x, z) || (Math.abs(x) < 7 && z > 34)) continue; M(x, z, true).add(G.ico, x, .2, z, .6 + rnd() * .7, .45 + rnd() * .4, .6 + rnd() * .6, rnd(), rnd() * 3, 0, i % 3 ? 0xc8d4f0 : C.ice); }

  /* ---------- falling snow (a box of flakes around the camera) ---------- */
  const SN = 260, snowM = new THREE.InstancedMesh(new THREE.SphereGeometry(.06, 5, 4), new THREE.MeshBasicMaterial({ color:0xffffff, transparent:true, opacity:.9 }), SN); snowM.frustumCulled = false;
  const fl = []; for(let i = 0; i < SN; i++) fl.push([rnd() * 60 - 30, rnd() * 30, rnd() * 60 - 30, .6 + rnd() * .8, rnd() * 6]);
  group.add(snowM);

  /* ---------- pads, signs, portal ---------- */
  const st = ZSTN.sled; k.pad(st.x, st.z, st.y, st.col); k.sign(st.name, st.col, st.x, st.y + 3.4, st.z);
  const PADS = { chairUp:{ x:-1, z:46, y:0 }, chairDown:{ x:-1, z:3.6, y:TT[4] }, slide:{ x:-7, z:-4.9, y:TT[4] } };
  k.pad(PADS.chairUp.x, PADS.chairUp.z, 0, '#ff6f8e'); k.pad(PADS.chairDown.x, PADS.chairDown.z, TT[4], '#ff6f8e'); k.pad(PADS.slide.x, PADS.slide.z, TT[4], '#7fd6ff');
  k.sign(L('زحليطة التلج', 'Ice slide', 'Buz kaydırağı'), '#7fd6ff', PADS.slide.x, TT[4] + 3.2, PADS.slide.z, 3.4);
  const back = portal(THREE, K, group, Z.portal.x, 0, Z.portal.z, 0, '#ffcd4d', ZONES.castle.name, k.ox, k.oz); back.to = 'castle';

  k.finish();
  const W = (x, z) => [x + k.ox, z + k.oz];
  const near = (p, r = 1.6) => Math.hypot(api.P.x - (p.x + k.ox), api.P.z - (p.z + k.oz)) < r && Math.abs(api.P.y - p.y) < 1.2;

  /* ---------- rides ---------- */
  function rideChair(up){
    myChair.visible = true;
    api.startRide({ dur:14, pose:'sit', md:6, dist:10, pitch:.32,
      at:t => { const p = chairAt(up ? t : 1 - t), [x, z] = W(up ? -1 : 1, p[2]); return [x, p[1], z]; },
      face:up ? Math.PI : 0,
      step:() => { myChair.position.set(api.P.x - k.ox, api.P.y + .45, api.P.z - k.oz); myChair.rotation.y = up ? Math.PI : 0; },
      end:() => { myChair.visible = false; if(up){ const [x, z] = W(-1, 2.5); api.tp(x, TT[4], z, Math.PI); } else { const [x, z] = W(-1, 44.5); api.tp(x, 0, z, 0); } } });
    api.SFX.zip();
  }
  function rideSlide(){
    const [sx, sz] = W(PADS.slide.x, PADS.slide.z);
    api.startRide({ dur:7.5, pose:'sit', md:6, dist:9, pitch:.4,
      at:t => { if(t < .06){ const u = t / .06, p = slideAt(0); const [x, z] = W(p[0], p[2]); return [sx + (x - sx) * u, TT[4] + (p[1] - TT[4]) * u, sz + (z - sz) * u]; }
        const u = Math.min(1, (t - .06) / .86); if(t <= .92){ const p = slideAt(u * u * .25 + u * .75); const [x, z] = W(p[0], p[2]); return [x, p[1], z]; }
        const v = (t - .92) / .08, r = 46 + v * 6, a = 6; const [x, z] = W(Math.sin(a) * r, Math.cos(a) * r); return [x, .6 * (1 - v), z]; },
      step:(t) => { if(Math.random() < .5) api.burst(api.P.x, api.P.y + .1, api.P.z, 1, ['#ffffff', '#bfeaff'], 1.5, .8, 4, .3); },
      end:() => { api.P.vx = Math.sin(api.P.face) * 4; api.P.vz = Math.cos(api.P.face) * 4; } });
    api.SFX.zip();
  }

  /* ---------- the sled race ---------- */
  let S = null;
  const sledMode = {
    start(run){
      S = { s:.5, l:0, v:0, boost:0, slow:0, got:new Set(), hit:{}, run };
      flakes.forEach((f, i) => { f.on = true; });
      mySled.visible = true; place(0);
      api.startVeh({ md:5, pose:'sit', step:sledStep, cam:() => { const p = TRK.at(S.s); return { yaw:Math.atan2(-p.tx, -p.tz), dist:7.2, pitch:.3, k:4 }; }, end:() => { mySled.visible = false; } });
      api.snapCam = true; api.cam.yaw = Math.atan2(-TRK.at(1).tx, -TRK.at(1).tz); api.cam.pitch = .3;
    },
    step(){},
    hud(t){ return '🛷 ' + N(Math.min(100, Math.round(S ? S.s / TRK.len * 100 : 0))) + '%  ⏱️ ' + api.fmtSec(t); },
    prog(){ return S ? S.s : 0; },
    end(ok){
      if(api.P.mode === 'veh') api.endVeh();
      mySled.visible = false;
      const p = TRK.at(TRK.len - 1, 0); const x = p.x + p.nx * (TRK.W + 2.5), z = p.z + p.nz * (TRK.W + 2.5);
      if(S) api.tp(x + k.ox, null, z + k.oz, Math.atan2(p.tx, p.tz));
      S = null;
    }
  };
  function place(dt){
    const p = TRK.at(S.s, S.l), P = api.P;
    P.x = p.x + k.ox; P.z = p.z + k.oz; P.y = p.y + .38 + Math.max(0, S.hop || 0); P.face = Math.atan2(p.tx, p.tz); P.move = 0;
    mySled.position.set(p.x, P.y - .38, p.z); mySled.rotation.set(0, P.face, 0); mySled.rotateX(Math.atan(-p.slope) * .8); mySled.rotation.z = -api.inp.sx * .15 * (dt ? 1 : 0);
  }
  function sledStep(dt){
    const run = api.run; if(!S) return;
    const go = !run || api.T >= run.cdEnd;
    const p = TRK.at(S.s), T = api.T;
    const target = !go ? 0 : S.slow > T ? 4.5 : (10 + Math.min(7, Math.max(0, -p.slope * 16))) + (S.boost > T ? 6 : 0);
    S.v += (target - S.v) * Math.min(1, (target > S.v ? 1.4 : 3.5) * dt);
    S.s += S.v * dt;
    S.l = api.clamp(S.l - (api.inp.sx || 0) * 6 * dt, -TRK.W + .6, TRK.W - .6);
    if(go){
      flakes.forEach((f, i) => { if(!f.on) return; if(Math.abs(f.s - S.s) < 1.7 && Math.abs(f.l - S.l) < 1.3){ f.on = false; S.boost = T + 1.3; api.SFX.star(); const q = TRK.at(f.s, f.l); api.burst(q.x + k.ox, q.y + 1, q.z + k.oz, 12, ['#bfeaff', '#ffffff'], 4); } });
      bumps.forEach((b, i) => { if((S.hit[i] || 0) > T) return; if(Math.abs(b.s - S.s) < 1.2 && Math.abs(b.l - S.l) < 1.15){ S.hit[i] = T + 2; S.slow = T + .9; S.v = Math.min(S.v, 4); api.SFX.bonk(); const q = TRK.at(b.s, b.l); api.burst(q.x + k.ox, q.y + 1, q.z + k.oz, 16, ['#ffffff', '#e3ecfb'], 4); api.popText('☃️'); } });
      if(S.v > 6 && Math.random() < dt * 30) api.burst(api.P.x - p.tx * .9, api.P.y - .2, api.P.z - p.tz * .9, 1, ['#ffffff', '#e3ecfb'], 1.6, .9, 6, .35);
    }
    place(dt);
    if(S.s >= TRK.len - 3 && run && run.id === 'sled'){ api.finishStation('sled', api.runTime()); }
  }

  /* ---------- per frame ---------- */
  const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _v = new THREE.Vector3(), _s = new THREE.Vector3();
  function animate(T, dt, camPos){
    for(let i = 0; i < NCH; i++){
      const u = (T * .02 + i / NCH) % 1, up = u < .5, t = up ? u * 2 : 2 - u * 2, p = chairAt(t);
      _m.compose(_v.set(up ? -1 : 1, p[1] + .45, p[2]), _q.setFromEuler(_e.set(0, up ? Math.PI : 0, Math.sin(T * 1.3 + i) * .04)), _s.set(1, 1, 1)); chairs.setMatrixAt(i, _m);
    }
    chairs.instanceMatrix.needsUpdate = true;
    flakes.forEach((f, i) => { const on = S ? f.on !== false : true, q = TRK.at(f.s, f.l), sc = on ? .42 : 0; _m.compose(_v.set(q.x, q.y + 1 + Math.sin(T * 2 + i) * .15, q.z), _q.setFromEuler(_e.set(0, T * 2 + i, 0)), _s.set(sc, sc, sc)); flakeMesh.setMatrixAt(i, _m); });
    flakeMesh.instanceMatrix.needsUpdate = true;
    smoke.forEach(s => { const u = (T * .18 + s.userData.ph) % 1; s.position.set(6.1 + u * 1.5, TT[4] + 5.9 + u * 4, .2 - u * .8); const sc = .8 + u * 2.4; s.scale.set(sc, sc, 1); s.material.opacity = .55 * (1 - u); });
    const cx = camPos.x - k.ox, cz = camPos.z - k.oz, cy = camPos.y;
    for(let i = 0; i < SN; i++){ const f = fl[i]; let y = (f[1] - T * f[3] * 1.4) % 30; if(y < 0) y += 30;
      const x = cx + (((f[0] + Math.sin(T * .6 + f[4]) * 1.2 - cx) % 60 + 90) % 60) - 30, z = cz + (((f[2] - cz) % 60 + 90) % 60) - 30;
      _m.makeTranslation(x, cy - 12 + y, z); snowM.setMatrixAt(i, _m); }
    snowM.instanceMatrix.needsUpdate = true;
    for(const m of k.culled){ const c = m.userData.c; m.visible = Math.hypot(camPos.x - c[0], camPos.z - c[1]) < 90; }
  }
  function tick(){
    const P = api.P;
    if(P.mode === 'walk' && P.ground && Math.hypot(P.x - k.ox - pond.x, P.z - k.oz - pond.z) < pond.r && P.y < .5) P.slip = true;
  }
  function ctx(){
    if(near(PADS.chairUp)) return { k:'z', key:'chairUp', icon:'🚡', label:L('اركب', 'Ride', 'Bin'), col:'#ff6f8e', go:() => rideChair(true) };
    if(near(PADS.chairDown)) return { k:'z', key:'chairDn', icon:'🚡', label:L('انزل', 'Down', 'İn'), col:'#ff6f8e', go:() => rideChair(false) };
    if(near(PADS.slide)) return { k:'z', key:'slide', icon:'🛝', label:L('زحليطة', 'Slide!', 'Kay!'), col:'#7fd6ff', go:rideSlide };
    return null;
  }
  function miniBg(x, s){
    x.fillStyle = '#f6deb0'; x.beginPath(); x.arc(0, 0, 92 * s, 0, 7); x.fill();
    x.fillStyle = '#eef4ff'; x.beginPath(); x.arc(0, 0, 84 * s, 0, 7); x.fill();
    TR.forEach((r, i) => { x.fillStyle = ['#cfd6ee', '#dfe5f6', '#c9d0ea', '#e6ebf8', '#ffffff'][i]; x.beginPath(); x.arc(0, 0, r * s, 0, 7); x.fill(); x.strokeStyle = '#9aa2c8'; x.lineWidth = 1.5; x.stroke(); });
    x.strokeStyle = '#7fc8ff'; x.lineWidth = 5; x.lineCap = 'round'; x.beginPath(); for(let q = 0; q <= TRK.len; q += 3){ const p = TRK.at(q); q ? x.lineTo(p.x * s, p.z * s) : x.moveTo(p.x * s, p.z * s); } x.stroke();
    x.strokeStyle = '#ff6f8e'; x.lineWidth = 2.5; x.setLineDash([4, 4]); x.beginPath(); x.moveTo(-1 * s, 48 * s); x.lineTo(-1 * s, 4 * s); x.stroke(); x.setLineDash([]);
    x.fillStyle = '#bfeaff'; x.beginPath(); x.arc(pond.x * s, pond.z * s, pond.r * s, 0, 7); x.fill();
  }
  const test = {
    track:TRK.len, flakes:flakes.length,
    sledTo(sv){ if(S) S.s = sv; }, get sled(){ return S ? { s:S.s, l:S.l, v:S.v } : null },
    rideChair:() => rideChair(true), rideSlide, pads:Object.fromEntries(Object.entries(PADS).map(([n, p]) => [n, { x:p.x + k.ox, z:p.z + k.oz, y:p.y }])),
    stairs:stairs.map(s => ({ x:s.x + k.ox, z:s.z + k.oz, y:s.y }))
  };
  return { atmo:{ hemi:0xeef2ff, hemiG:0x7a7aa8, sun:0xffd8b0, sunI:2.2, fog:0xf6d2c4 }, group, solids:k.solids, movers:k.movers, ground, portals:[back], animate, tick, ctx, modes:{ sled:sledMode }, miniBg, test };
}
