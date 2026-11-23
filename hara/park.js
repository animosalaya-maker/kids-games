/* «حديقة الحارة»: the neighbourhood park, built from code (no models, no image files).
   Shape and layout follow the real park: a raised lens / curved-triangle block between sloping streets, held up by a dark
   stacked-stone retaining wall with a light concrete cap and a black iron railing (ball-topped posts, heart ornaments),
   square stone pillars at the corners and entrances (steps down to the street), one straight diagonal paver path,
   the round blue rubber playground in the open lawn with a paver ring around it, tree pits with brick borders, wooden
   benches on concrete legs, trimmed round and lollipop shrubs, bare trees and a couple of dark cypresses, street lamps
   and a tall floodlight with four lamps, a plain little electrical kiosk, and the apartment blocks all around.
   Playground: the purple two-tower structure (indigo posts with yellow rings, star-shaped purple roofs, a purple WAVY
   slide, a YELLOW slide, teal climbing panels with holes, a black perforated stair, teal and orange arch panels),
   a red-posted structure under a blue fabric canopy with spring riders, two red A-frame swing sets, a purple seesaw,
   a yellow round spring toy and a row of activity panels.
   Coordinates: metres, x = east, z = south, y = up; park ground y = 0. */
export function makePark(THREE, K, TX){
  const { Merge, G } = K;
  let seed = 4242;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  const root = new THREE.Group();
  const lam = o => new THREE.MeshLambertMaterial(o);
  const vcMat = lam({ vertexColors:true });
  const vcMat2 = lam({ vertexColors:true, side:THREE.DoubleSide });
  const _v = new THREE.Vector3(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _up = new THREE.Vector3(0, 1, 0);
  const C = { x:4, z:1 };                 // playground centre
  const R_RUB = 10, R_RING = 14.5;
  const hs = x => -.8 - .018 * (x + 46);  // street level falls to the east

  /* ---------- tiny geometry builder with uvs ---------- */
  class GB{
    constructor(){ this.p = []; this.n = []; this.u = []; }
    tri(a, b, c, ua, ub, uc){
      const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
      let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx; const l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l;
      for(const [p, uv] of [[a, ua], [b, ub], [c, uc]]){ this.p.push(p[0], p[1], p[2]); this.n.push(nx, ny, nz); this.u.push(uv[0], uv[1]); }
    }
    quad(a, b, c, d, ua, ub, uc, ud){ this.tri(a, b, c, ua, ub, uc); this.tri(a, c, d, ua, uc, ud); }
    /* a box (no bottom) centred at x,z with base y0, size sx,sy,sz, yaw; uv = world size / us */
    box(x, y0, z, sx, sy, sz, yaw = 0, us = 1, top = true){
      const c = Math.cos(yaw), s = Math.sin(yaw);
      const P = (lx, ly, lz) => [x + lx * c + lz * s, y0 + ly, z - lx * s + lz * c];
      const hx = sx / 2, hz = sz / 2;
      const f = [[-hx, hz, hx, hz, sx], [hx, hz, hx, -hz, sz], [hx, -hz, -hx, -hz, sx], [-hx, -hz, -hx, hz, sz]];
      for(const [ax, az, bx, bz, w] of f) this.quad(P(ax, 0, az), P(bx, 0, bz), P(bx, sy, bz), P(ax, sy, az), [0, 0], [w / us, 0], [w / us, sy / us], [0, sy / us]);
      if(top) this.quad(P(-hx, sy, hz), P(hx, sy, hz), P(hx, sy, -hz), P(-hx, sy, -hz), [0, 0], [sx / us, 0], [sx / us, sz / us], [0, sz / us]);
    }
    mesh(mat, shadow = 0){
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3));
      g.setAttribute('normal', new THREE.Float32BufferAttribute(this.n, 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute(this.u, 2));
      g.computeBoundingSphere();
      const m = new THREE.Mesh(g, mat); m.receiveShadow = !!(shadow & 1); m.castShadow = !!(shadow & 2); root.add(m); return m;
    }
  }
  const vcMesh = (M, shadow = 3, mat = vcMat) => { const m = new THREE.Mesh(M.geometry(), mat); m.castShadow = !!(shadow & 2); m.receiveShadow = !!(shadow & 1); root.add(m); return m; };
  const flatUV = (g, s, ox = 0, oz = 0) => { const p = g.attributes.position, uv = new Float32Array(p.count * 2); for(let i = 0; i < p.count; i++){ uv[i * 2] = (p.getX(i) - ox) / s; uv[i * 2 + 1] = -(p.getZ(i) - oz) / s; } g.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); return g; };
  /* cylinder piece between two points (for branches, bars, chains) */
  function rod(M, a, b, r, col, geo = G.cyl8){
    _v.set(b[0] - a[0], b[1] - a[1], b[2] - a[2]); const len = _v.length(); _v.normalize();
    _q.setFromUnitVectors(_up, _v); _e.setFromQuaternion(_q);
    M.add(geo, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2, r, len, r, _e.x, _e.y, _e.z, col);
  }

  /* ======================================================================
     The park outline (railing line): a lens / curved triangle, sharp corner to the west
     ====================================================================== */
  const bez = (a, c, b, t) => [(1 - t) * (1 - t) * a[0] + 2 * t * (1 - t) * c[0] + t * t * b[0], (1 - t) * (1 - t) * a[1] + 2 * t * (1 - t) * c[1] + t * t * b[1]];
  const TIP = [-46, 0], CN = [-5, -34], NE = [30, -27], CE = [41, 0], SE = [34, 24], CS = [-5, 30];
  const coarse = [];
  for(const [a, c, b, n] of [[TIP, CN, NE, 40], [NE, CE, SE, 20], [SE, CS, TIP, 40]]) for(let i = 0; i < n; i++) coarse.push(bez(a, c, b, i / n));
  // resample to ~1 m pieces
  const BP = [];
  { const L = []; let tot = 0; for(let i = 0; i < coarse.length; i++){ const a = coarse[i], b = coarse[(i + 1) % coarse.length]; L.push(tot); tot += Math.hypot(b[0] - a[0], b[1] - a[1]); }
    const n = Math.round(tot); let j = 0;
    for(let k = 0; k < n; k++){ const s = k / n * tot; while(j < coarse.length - 1 && L[j + 1] <= s) j++; const a = coarse[j], b = coarse[(j + 1) % coarse.length], seg = (j + 1 < L.length ? L[j + 1] : tot) - L[j], t = (s - L[j]) / seg; BP.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, s]); } }
  const NB = BP.length;
  const inPoly = (x, z) => { let c = false; for(let i = 0, j = NB - 1; i < NB; j = i++){ const a = BP[i], b = BP[j]; if((a[1] > z) !== (b[1] > z) && x < (b[0] - a[0]) * (z - a[1]) / (b[1] - a[1]) + a[0]) c = !c; } return c; };
  const outN = i => { i = ((i % NB) + NB) % NB; const a = BP[i], b = BP[(i + 1) % NB], dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz) || 1; return [dz / l, -dx / l]; };   // outward
  const vN = i => { const a = outN((i - 1 + NB) % NB), b = outN(i); const x = a[0] + b[0], z = a[1] + b[1], l = Math.hypot(x, z) || 1; return [x / l, z / l]; };
  const at = (k) => BP[((k % NB) + NB) % NB];
  // entrances (index along the outline): near the west corner, the north-east, the east, the south
  const nearestIdx = (x, z) => { let bi = 0, bd = 1e9; BP.forEach((p, i) => { const d = Math.hypot(p[0] - x, p[1] - z); if(d < bd){ bd = d; bi = i; } }); return bi; };
  const ENT = [[-39.5, -5.2], [24.4, -27.8], [36.6, -.7], [-5.5, 21]].map(([x, z]) => { const i = nearestIdx(x, z); return { i, x:BP[i][0], z:BP[i][1] }; });
  const nearEnt = (x, z, r) => ENT.some(e => Math.hypot(e.x - x, e.z - z) < r);
  const CORNERS = [TIP, NE, SE].map(([x, z]) => nearestIdx(x, z));

  /* ---------- ground: lawn inside the outline ---------- */
  { const sh = new THREE.Shape(); BP.forEach((p, i) => i ? sh.lineTo(p[0], -p[1]) : sh.moveTo(p[0], -p[1]));
    const g = new THREE.ShapeGeometry(sh); g.rotateX(-Math.PI / 2); flatUV(g, 4);
    const m = new THREE.Mesh(g, lam({ map:TX.grass })); m.receiveShadow = true; root.add(m); }

  /* ---------- paths: one straight diagonal path + curving links, interlocking pavers with curbs ---------- */
  const pavMat = lam({ map:TX.pavers, side:THREE.DoubleSide, polygonOffset:true, polygonOffsetFactor:-2, polygonOffsetUnits:-2 });
  const PATHS = [
    { w:2.8, pts:[[-39.5, -4.6], [24.3, -27.2]] },
    { w:2.4, pts:[[2.6, -13.2], [1.6, -15.8], [.8, -18.4]] },
    { w:2.4, pts:[[18.3, .4], [26, -.2], [36.4, -.7]] },
    { w:2.4, pts:[[-1.5, 13.4], [-3.8, 17.2], [-5.5, 20.8]] },
    { w:2.2, pts:[[-10.3, 2.4], [-18, 1.6], [-26, -1.6], [-32.5, -6.3]] }
  ];
  const pathSamples = [];
  { const gb = new GB(), M = new Merge();
    for(const P of PATHS){
      const curve = new THREE.CatmullRomCurve3(P.pts.map(p => new THREE.Vector3(p[0], 0, p[1])));
      const len = curve.getLength(), n = Math.max(2, Math.ceil(len / .6)), pts = curve.getSpacedPoints(n);
      const hw = P.w / 2;
      for(let i = 0; i < n; i++){
        const a = pts[i], b = pts[i + 1], t0 = curve.getTangentAt(i / n), t1 = curve.getTangentAt((i + 1) / n);
        const la = [-t0.z, t0.x], lb = [-t1.z, t1.x];
        const A = [a.x - la[0] * hw, .03, a.z - la[1] * hw], B = [a.x + la[0] * hw, .03, a.z + la[1] * hw], Cc = [b.x + lb[0] * hw, .03, b.z + lb[1] * hw], D = [b.x - lb[0] * hw, .03, b.z - lb[1] * hw];
        const uv = p => [p[0] / 2, -p[2] / 2];
        gb.quad(A, D, Cc, B, uv(A), uv(D), uv(Cc), uv(B));
        if(i % 2 === 0) for(const s of [-1, 1]){ const l = s < 0 ? la : lb; M.add(G.box, (a.x + b.x) / 2 + s * l[0] * (hw + .06), .04, (a.z + b.z) / 2 + s * l[1] * (hw + .06), .14, .1, 1.25, 0, Math.atan2(b.x - a.x, b.z - a.z), 0, 0xb5b2aa); }
        pathSamples.push([a.x, a.z, hw]);
      }
      pathSamples.push([pts[n].x, pts[n].z, hw]);
    }
    const m = gb.mesh(pavMat, 1); m.renderOrder = 1;
    // the paver ring around the playground
    const rg = new THREE.RingGeometry(R_RUB + .2, R_RING, 72, 2); rg.rotateX(-Math.PI / 2); rg.translate(C.x, .028, C.z); flatUV(rg, 2);
    const rm = new THREE.Mesh(rg, pavMat); rm.receiveShadow = true; rm.renderOrder = 1; root.add(rm);
    for(let i = 0; i < 72; i++){ const a = i / 72 * Math.PI * 2; M.add(G.box, C.x + Math.cos(a) * (R_RING + .06), .04, C.z + Math.sin(a) * (R_RING + .06), .14, .1, 1.3, 0, -a, 0, 0xb5b2aa); }
    vcMesh(M, 1);
  }
  const distPath = (x, z) => { let d = 1e9; for(const s of pathSamples){ const v = Math.hypot(s[0] - x, s[1] - z) - s[2]; if(v < d) d = v; } return d; };

  /* ---------- the round blue rubber floor with its concrete edge ---------- */
  { const g = new THREE.CircleGeometry(R_RUB, 72); g.rotateX(-Math.PI / 2); g.translate(C.x, .12, C.z);
    const p = g.attributes.position, uv = g.attributes.uv; for(let i = 0; i < p.count; i++) uv.setXY(i, (p.getX(i) - C.x) / 20 + .5, 1 - ((p.getZ(i) - C.z) / 20 + .5));
    const m = new THREE.Mesh(g, lam({ map:TX.rubber })); m.receiveShadow = true; root.add(m);
    const e = new THREE.CylinderGeometry(R_RUB + .2, R_RUB + .2, .2, 72, 1, true); e.translate(C.x, .06, C.z);
    const t = new THREE.RingGeometry(R_RUB, R_RUB + .2, 72); t.rotateX(-Math.PI / 2); t.translate(C.x, .16, C.z);
    const cm = lam({ color:0xbdb9b0 }); root.add(new THREE.Mesh(e, cm)); const tm = new THREE.Mesh(t, cm); tm.receiveShadow = true; root.add(tm); }

  /* ======================================================================
     Perimeter: retaining wall, cap, railing, pillars, entrance steps, sidewalks and streets
     ====================================================================== */
  const blocks = [], circles = [], floors = [];
  { const wall = new GB(), cap = new GB(), rail = new GB(), steps = new GB(), street = new GB(), walk = new GB(), M = new Merge();
    for(let i = 0; i < NB; i++){
      const a = BP[i], b = at(i + 1), n0 = vN(i), n1 = vN(i + 1), s0 = a[2], s1 = s0 + Math.hypot(b[0] - a[0], b[1] - a[1]);
      const mx = (a[0] + b[0]) / 2, mz = (a[1] + b[1]) / 2, gap = nearEnt(mx, mz, 1.6);
      const O = (p, n, d, y) => [p[0] + n[0] * d, y, p[1] + n[1] * d];
      // wall (outer face, stone)
      const ya = hs(a[0]) - .3, yb = hs(b[0]) - .3;
      wall.quad(O(b, n1, .3, yb), O(a, n0, .3, ya), O(a, n0, .3, .06), O(b, n1, .3, .06), [s1 / 1.5, yb / 1.5], [s0 / 1.5, ya / 1.5], [s0 / 1.5, .04], [s1 / 1.5, .04]);
      // cap: top, outer and inner edge
      const ct = .2;
      cap.quad(O(a, n0, -.18, ct), O(b, n1, -.18, ct), O(b, n1, .38, ct), O(a, n0, .38, ct), [s0 / 2, 0], [s1 / 2, 0], [s1 / 2, .28], [s0 / 2, .28]);
      cap.quad(O(b, n1, .38, .04), O(a, n0, .38, .04), O(a, n0, .38, ct), O(b, n1, .38, ct), [s1 / 2, 0], [s0 / 2, 0], [s0 / 2, .08], [s1 / 2, .08]);
      cap.quad(O(a, n0, -.18, 0), O(b, n1, -.18, 0), O(b, n1, -.18, ct), O(a, n0, -.18, ct), [s0 / 2, 0], [s1 / 2, 0], [s1 / 2, .1], [s0 / 2, .1]);
      if(!gap){
        rail.quad(O(a, n0, .1, ct), O(b, n1, .1, ct), O(b, n1, .1, ct + 1.05), O(a, n0, .1, ct + 1.05), [s0 / 2, 0], [s1 / 2, 0], [s1 / 2, 1], [s0 / 2, 1]);
        if(i % 2 === 0){ const p = O(a, n0, .1, 0); M.add(G.cyl8, p[0], ct + .6, p[2], .045, 1.2, .045, 0, 0, 0, 0x141518); M.add(G.sm, p[0], ct + 1.24, p[2], .075, .075, .075, 0, 0, 0, 0x141518); }
      }
      // sidewalk + curb + road
      const w0 = .3, w1 = 2.8, r1 = 11;
      const ha = hs(a[0]), hb = hs(b[0]);
      walk.quad(O(a, n0, w0, ha + .12), O(a, n0, w1, ha + .12), O(b, n1, w1, hb + .12), O(b, n1, w0, hb + .12), ...[O(a, n0, w0, 0), O(a, n0, w1, 0), O(b, n1, w1, 0), O(b, n1, w0, 0)].map(p => [p[0] / 2, -p[2] / 2]));
      walk.quad(O(a, n0, w1, ha), O(b, n1, w1, hb), O(b, n1, w1, hb + .12), O(a, n0, w1, ha + .12), [s0, 0], [s1, 0], [s1, .1], [s0, .1]);
      street.quad(O(a, n0, w1, ha), O(a, n0, r1, ha), O(b, n1, r1, hb), O(b, n1, w1, hb), ...[O(a, n0, w1, 0), O(a, n0, r1, 0), O(b, n1, r1, 0), O(b, n1, w1, 0)].map(p => [p[0] / 6, -p[2] / 6]));
      walk.quad(O(a, n0, r1, ha + .12), O(a, n0, r1 + 2, ha + .12), O(b, n1, r1 + 2, hb + .12), O(b, n1, r1, hb + .12), ...[O(a, n0, r1, 0), O(a, n0, r1 + 2, 0), O(b, n1, r1 + 2, 0), O(b, n1, r1, 0)].map(p => [p[0] / 2, -p[2] / 2]));
    }
    // entrance steps down to the street, with square stone pillars at the sides
    const pil = new GB();
    for(const e of ENT){
      const n = vN(e.i), yaw = Math.atan2(n[0], n[1]), drop = .2 - hs(e.x), k = Math.min(8, Math.ceil(drop / .2)), rise = drop / k;
      for(let j = 0; j < k; j++){ const d = .38 + j * .34 + .17; steps.box(e.x + n[0] * d, hs(e.x) - .2, e.z + n[1] * d, 3, .2 + drop - rise * (j + 1), .34, yaw, 1); }
      const tx = -n[1], tz = n[0];
      for(const s of [-1, 1]) pil.box(e.x + tx * s * 1.85 + n[0] * .1, -.2, e.z + tz * s * 1.85 + n[1] * .1, .62, 1.75, .62, yaw, 1.2);
    }
    for(const i of CORNERS){ const p = BP[i], n = vN(i); pil.box(p[0] + n[0] * .1, -.2, p[1] + n[1] * .1, .7, 1.8, .7, Math.atan2(n[0], n[1]), 1.2); }
    const stoneMat = lam({ map:TX.stone }), capMat = lam({ map:TX.concrete });
    wall.mesh(stoneMat); cap.mesh(capMat, 1); steps.mesh(capMat, 1); pil.mesh(lam({ map:TX.stone, color:0xb8b8bc }), 3);
    const pc = new Merge(); for(const e of ENT){ const n = vN(e.i), tx = -n[1], tz = n[0]; for(const s of [-1, 1]) pc.add(G.box, e.x + tx * s * 1.85 + n[0] * .1, 1.6, e.z + tz * s * 1.85 + n[1] * .1, .78, .12, .78, 0, Math.atan2(n[0], n[1]), 0, 0xc9c6bd); }
    for(const i of CORNERS){ const p = BP[i], n = vN(i); pc.add(G.box, p[0] + n[0] * .1, 1.65, p[1] + n[1] * .1, .86, .12, .86, 0, Math.atan2(n[0], n[1]), 0, 0xc9c6bd); }
    vcMesh(pc, 3);
    const rm = rail.mesh(lam({ map:TX.rail, transparent:false, alphaTest:.5, side:THREE.DoubleSide })); rm.castShadow = true;
    rm.customDepthMaterial = new THREE.MeshDepthMaterial({ depthPacking:THREE.RGBADepthPacking, map:TX.rail, alphaTest:.5 });
    vcMesh(M, 2);
    street.mesh(lam({ map:TX.asphalt }), 1); walk.mesh(lam({ map:TX.walk }), 1);
  }
  // far ground under everything
  { const g = new THREE.PlaneGeometry(700, 700); g.rotateX(-Math.PI / 2); g.translate(0, -4.2, 0); root.add(new THREE.Mesh(g, lam({ color:0x5a5652 }))); }

  /* ---------- apartment blocks and low houses around the park ---------- */
  const FAC = TX.fac, styles = ['terra', 'cream', 'zig', 'green', 'orange', 'pale', 'terra', 'cream'];
  const bMats = {}, bGB = {}, nightMats = [];
  for(const k of Object.keys(FAC)){ bMats[k] = lam({ map:FAC[k].map, emissiveMap:FAC[k].night, emissive:0x000000 }); bGB[k] = new GB(); nightMats.push(bMats[k]); }
  const roofTop = new Merge(), HIP = G.cone4.clone().rotateY(Math.PI / 4);
  const placed = [];
  function building(x, z, yaw, w, d, floors, st, tileRoof){
    if(placed.some(p => Math.hypot(p[0] - x, p[1] - z) < (p[2] + Math.max(w, d)) * .5)) return;
    if(inPoly(x, z)) return;
    placed.push([x, z, Math.max(w, d)]);
    const y0 = hs(x) - 1.5, h = floors * 3 + 1.5;
    const gb = bGB[st], c = Math.cos(yaw), s = Math.sin(yaw), hx = w / 2, hz = d / 2;
    const P = (lx, ly, lz) => [x + lx * c + lz * s, y0 + ly, z - lx * s + lz * c];
    const f = [[-hx, hz, hx, hz, w], [hx, hz, hx, -hz, d], [hx, -hz, -hx, -hz, w], [-hx, -hz, -hx, hz, d]];
    for(const [ax, az, bx, bz, ww] of f) gb.quad(P(ax, 0, az), P(bx, 0, bz), P(bx, h, bz), P(ax, h, az), [0, 0], [ww / 12.8, 0], [ww / 12.8, h / 18], [0, h / 18]);
    if(tileRoof) roofTop.add(HIP, x, y0 + h + 1.1, z, (hx + .45) * 1.4142, 2.2, (hz + .45) * 1.4142, 0, yaw, 0, [0xb5543a, 0xa84a32, 0xc0603e][(rnd() * 3) | 0]);
else roofTop.add(G.box, x, y0 + h + .1, z, w + .2, .2, d + .2, 0, yaw, 0, 0x8d8a85);
  }
  { let s = 0; const total = BP[NB - 1][2];
    for(let ring = 0; ring < 2; ring++){
      s = ring * 7;
      while(s < total){
        const w = 9 + rnd() * 7, d = 9 + rnd() * 4, i = Math.floor(s) % NB, p = BP[i], n = vN(i);
        const off = (ring ? 27 : 13.2) + d / 2 + rnd() * 1.5;
        const x = p[0] + n[0] * off, z = p[1] + n[1] * off, yaw = Math.atan2(n[0], n[1]);
        const low = !ring && rnd() < .2;
        building(x, z, yaw, w, d, low ? 2 : (5 + (rnd() * 3 | 0)) + ring, styles[(rnd() * styles.length) | 0], low || rnd() < .3);
        s += w + .6 + rnd() * 2.5;
      }
    }
    for(const k of Object.keys(bGB)) if(bGB[k].p.length) bGB[k].mesh(bMats[k]);
    vcMesh(roofTop, 0);
  }
  /* utility poles with wires along the streets */
  { const M = new Merge(), wires = []; let prev = null;
    for(let s = 3; s < BP[NB - 1][2]; s += 19){
      const i = Math.floor(s) % NB, p = BP[i], n = vN(i), x = p[0] + n[0] * 10.6, z = p[1] + n[1] * 10.6, y = hs(x);
      M.add(G.cyl8, x, y + 4.5, z, .13, 9, .13, 0, 0, 0, 0x8e8a82);
      M.add(G.box, x, y + 8.4, z, 1.6, .12, .12, 0, Math.atan2(n[0], n[1]), 0, 0x6e6a62);
      const tops = [-.7, 0, .7].map(o => [x - n[1] * o, y + 8.5, z + n[0] * o]);
      if(prev) for(let k = 0; k < 3; k++){ const a = prev[k], b = tops[k]; for(let j = 0; j < 6; j++){ const t0 = j / 6, t1 = (j + 1) / 6; const sag = t => -Math.sin(t * Math.PI) * .7; wires.push(a[0] + (b[0] - a[0]) * t0, a[1] + (b[1] - a[1]) * t0 + sag(t0), a[2] + (b[2] - a[2]) * t0, a[0] + (b[0] - a[0]) * t1, a[1] + (b[1] - a[1]) * t1 + sag(t1), a[2] + (b[2] - a[2]) * t1); } }
      prev = tops;
    }
    vcMesh(M, 0);
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(wires, 3));
    root.add(new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color:0x1c1c20 })));
  }

  /* ======================================================================
     Playground equipment (local coords around C)
     ====================================================================== */
  const W = (lx, lz) => [C.x + lx, C.z + lz];
  const PUR = 0x4b37b8, PUR2 = 0x7d55e8, YEL = 0xf5cf1f, TEAL = 0x2fb8b0, RED = 0xd8382c, BLUE = 0x2d55c8, DARK = 0x26282d;
  const play = new Merge();
  const towers = [{ id:'A', lx:-2.5, lz:-4.0, h:1.25 }, { id:'B', lx:1.0, lz:-4.6, h:1.0 }];
  for(const t of towers){
    const [x, z] = W(t.lx, t.lz);
    play.add(G.box, x, t.h - .04, z, 1.5, .08, 1.5, 0, 0, 0, DARK);
    for(const sx of [-.72, .72]) for(const sz of [-.72, .72]){
      play.add(G.cyl8, x + sx, 1.6, z + sz, .075, 3.2, .075, 0, 0, 0, PUR);
      for(const y of [t.h + .45, 2.75]) play.add(G.torus, x + sx, y, z + sz, .1, .1, .1, Math.PI / 2, 0, 0, YEL);
      play.add(G.sm, x + sx, 3.22, z + sz, .1, .1, .1, 0, 0, 0, YEL);
      circles.push({ x:x + sx, z:z + sz, r:.12, top:3.3 });
    }
    // star / sun roof: a purple dome with spikes around the rim and a knob
    play.add(G.hemi, x, 3.05, z, 1.12, .6, 1.12, 0, 0, 0, PUR2);
    play.add(G.cyl, x, 3.03, z, 1.16, .08, 1.16, 0, 0, 0, PUR);
    for(let k = 0; k < 10; k++){ const a = k / 10 * Math.PI * 2; play.add(G.cone, x + Math.cos(a) * 1.18, 3.12, z + Math.sin(a) * 1.18, .17, .42, .17, 0, -a, -Math.PI / 2 + .35, PUR2); }
    for(let k = 0; k < 6; k++){ const a = k / 6 * Math.PI * 2 + .3; play.add(G.sm, x + Math.cos(a) * .62, 3.47, z + Math.sin(a) * .62, .12, .07, .12, 0, 0, 0, 0x3a2a9a); }
    play.add(G.sm, x, 3.7, z, .14, .14, .14, 0, 0, 0, YEL);
    floors.push({ x0:x - .75, x1:x + .75, z0:z - .75, z1:z + .75, y:t.h });
    blocks.push({ x0:x - .75, x1:x + .75, z0:z - .75, z1:z + .75, top:t.h, bot:t.h - .12 });
  }
  // bridge from A to B
  { const [ax, az] = W(-1.75, -4.3), [bx] = W(.25, -4.3);
    floors.push({ x0:ax, x1:bx, z0:az - .5, z1:az + .5, y:(x) => 1.25 + (1.0 - 1.25) * clamp((x - ax) / (bx - ax), 0, 1) });
    play.add(G.box, (ax + bx) / 2, 1.08, az, 2, .07, 1, 0, 0, Math.atan2(-.25, 2), DARK); }
  // black perforated stair up to tower A (from the north) with purple handrails
  const perf = new GB();
  { const [x, z0] = W(-2.5, -7.0), z1 = C.z - 4.75;
    for(let k = 0; k < 6; k++){ const t = (k + .5) / 6, z = z0 + (z1 - z0) * t; perf.box(x, 1.25 * t - .05, z, 1.1, .05, .36, 0, .5); }
    for(const s of [-.57, .57]) rod(play, [x + s, .02, z0], [x + s, 1.22, z1], .04, DARK);
    floors.push({ x0:x - .6, x1:x + .6, z0:z0, z1:z1, y:(xx, zz) => 1.25 * clamp((zz - z0) / (z1 - z0), 0, 1) });
    for(const s of [-.6, .6]){ rod(play, [x + s, .9, z0], [x + s, 2.05, z1], .035, PUR); rod(play, [x + s, 0, z0], [x + s, .9, z0], .045, PUR); circles.push({ x:x + s, z:z0, r:.08, top:1 }); } }
  // teal climbing wall on tower B (north side), climbable ramp
  const tealHoleMat = lam({ map:TX.tealHoles, alphaTest:.5, side:THREE.DoubleSide });
  const panelsGB = { teal:new GB() };
  const climb = { x0:0, x1:0, z0:0, z1:0 };
  { const [x, z0] = W(1.0, -6.4), z1 = C.z - 5.35;
    panelsGB.teal.quad([x - .6, .1, z0], [x + .6, .1, z0], [x + .6, 1.0, z1], [x - .6, 1.0, z1], [0, 0], [1, 0], [1, 1], [0, 1]);
    floors.push({ x0:x - .6, x1:x + .6, z0, z1, y:(xx, zz) => 1.0 * clamp((zz - z0) / (z1 - z0), 0, 1), climb:true });
    Object.assign(climb, { x0:x - .6, x1:x + .6, z0, z1 }); }
  // teal panels with holes as bridge rails, and on tower A west side
  { const [ax, az] = W(-1.75, -4.3), [bx] = W(.25, -4.3);
    for(const s of [-.5, .5]) panelsGB.teal.quad([ax, 1.25, az + s], [bx, 1.0, az + s], [bx, 1.9, az + s], [ax, 2.15, az + s], [0, 0], [1.6, 0], [1.6, .9], [0, .9]);
    const [x, z] = W(1.0, -4.6); panelsGB.teal.quad([x - .72, 1.0, z - .74], [x + .72, 1.0, z - .74], [x + .72, 1.85, z - .74], [x - .72, 1.85, z - .74], [0, 0], [1, 0], [1, .7], [0, .7]); }
  panelsGB.teal.mesh(tealHoleMat, 3).customDepthMaterial = new THREE.MeshDepthMaterial({ depthPacking:THREE.RGBADepthPacking, map:TX.tealHoles, alphaTest:.5 });
  // decorative arch panels: teal on tower A (west), orange on tower B (south)
  { const g1 = new GB(), g2 = new GB();
    const [ax, az] = W(-2.5, -4.0); g1.quad([ax - .74, 1.25, az + .7], [ax - .74, 1.25, az - .7], [ax - .74, 2.45, az - .7], [ax - .74, 2.45, az + .7], [0, 0], [1, 0], [1, 1], [0, 1]);
    const [bx, bz] = W(1.0, -4.6); g2.quad([bx - .7, 1.0, bz + .74], [bx + .7, 1.0, bz + .74], [bx + .7, 2.2, bz + .74], [bx - .7, 2.2, bz + .74], [0, 0], [1, 0], [1, 1], [0, 1]);
    g1.mesh(lam({ map:TX.tealPanel, alphaTest:.5, side:THREE.DoubleSide }), 3); g2.mesh(lam({ map:TX.orangePanel, alphaTest:.5, side:THREE.DoubleSide }), 3); }
  perf.mesh(lam({ map:TX.perf, alphaTest:.5, side:THREE.DoubleSide }), 3);

  /* slides: a U-shaped bed swept along the path; rider path is the bed centre */
  function slide(fn, col, n = 64, wide = 1){
    const pts = []; for(let i = 0; i <= n; i++) pts.push(fn(i / n));
    const prof = [[-.44, .36], [-.36, .36], [-.35, .12], [-.28, .02], [-.14, -.02], [0, -.03], [.14, -.02], [.28, .02], [.35, .12], [.36, .36], [.44, .36]].map(([u, v]) => [u * wide, v]);
    const pos = [], idx = [];
    for(let i = 0; i <= n; i++){
      const p = pts[i], q = pts[Math.min(n, i + 1)], o = pts[Math.max(0, i - 1)];
      const tx = q[0] - o[0], ty = q[1] - o[1], tz = q[2] - o[2], tl = Math.hypot(tx, ty, tz);
      let lx = -tz, lz = tx; const ll = Math.hypot(lx, lz); lx /= ll; lz /= ll;           // lateral (flat)
      const ux = -(ty / tl) * (tx / tl) * 0, uy = 1;                                          // up ≈ world up
      for(const [u, v] of prof){ pos.push(p[0] + lx * u + ux, p[1] + v * uy + .05, p[2] + lz * u); }
      prof.slice(0, 1); // lip on the left too
    }
    const m = prof.length;
    for(let i = 0; i < n; i++) for(let j = 0; j < m - 1; j++){ const a = i * m + j, b = a + 1, c = a + m, d = c + 1; idx.push(a, c, b, b, c, d); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
    play.add(g, 0, 0, 0, 1, 1, 1, 0, 0, 0, col);
    // support legs at the end
    const e = pts[n]; play.add(G.cyl8, e[0], e[1] / 2, e[2], .05, e[1], .05, 0, 0, 0, col === YEL ? PUR : PUR);
    // arc-length table for riding
    const L = [0]; for(let i = 1; i <= n; i++) L.push(L[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1], pts[i][2] - pts[i - 1][2]));
    const len = L[n];
    const sample = (d) => { d = clamp(d, 0, len); let i = 0; while(i < n - 1 && L[i + 1] < d) i++; const t = (d - L[i]) / Math.max(1e-6, L[i + 1] - L[i]), a = pts[i], b = pts[i + 1];
      return { x:a[0] + (b[0] - a[0]) * t, y:a[1] + (b[1] - a[1]) * t + .07, z:a[2] + (b[2] - a[2]) * t, dx:(b[0] - a[0]), dy:(b[1] - a[1]), dz:(b[2] - a[2]), seg:L[i + 1] - L[i] }; };
    return { pts, len, sample };
  }
  const SLIDES = [];
  { // purple WAVY slide from tower A towards the south
    const [sx, sz] = W(-2.5, -3.25);
    const s1 = slide(s => { const y = s < .88 ? 1.25 - .93 * (s / .88) + .13 * Math.sin(s / .88 * Math.PI * 3) * (1 - s * .7) : .32; return [sx - .6 * s * s, Math.max(.32, y), sz + 4.1 * s]; }, PUR2);
    SLIDES.push(Object.assign(s1, { id:'wavy', top:{ x:sx, y:1.25, z:sz - .35 }, col:'#7d55e8' }));
    // YELLOW slide from tower B towards the east, ending on the red-brown ring
    const [tx, tz] = W(1.75, -4.6);
    const s2 = slide(s => { const y = s < .82 ? 1.0 - .68 * (s / .82) : .32; return [tx + 2.7 * s, y, tz + .5 * s * s]; }, YEL, 48, 1.25);
    SLIDES.push(Object.assign(s2, { id:'yellow', top:{ x:tx - .35, y:1.0, z:tz }, col:'#f5cf1f' }));
  }

  /* blue fabric canopy over the red-posted structure, with spring riders under it */
  { const [x, z] = W(-6.5, 1.5);
    for(const sx of [-1.5, 1.5]) for(const sz of [-1.5, 1.5]){ play.add(G.cyl8, x + sx, 1.35, z + sz, .08, 2.7, .08, 0, 0, 0, RED); circles.push({ x:x + sx, z:z + sz, r:.12, top:2.7 }); }
    for(const s of [-1.5, 1.5]){ play.add(G.box, x, 2.66, z + s, 3.1, .1, .1, 0, 0, 0, RED); play.add(G.box, x + s, 2.66, z, .1, .1, 3.1, 0, 0, 0, RED); }
    const cg = new THREE.ConeGeometry(2.45, 1.0, 4, 1, true); cg.rotateY(Math.PI / 4);
    play.add(cg, x, 3.2, z, 1, 1, 1, 0, 0, 0, BLUE);
    for(let k = 0; k < 4; k++){ const a = k * Math.PI / 2; for(let j = -2; j <= 2; j++) play.add(G.sm, x + Math.cos(a) * 1.73 - Math.sin(a) * j * .7, 2.62, z + Math.sin(a) * 1.73 + Math.cos(a) * j * .7, .2, .12, .2, 0, 0, 0, BLUE); }
  }
  // spring riders: a body on a spring, sways when you bounce
  const SPRINGS = [];
  function springRider(lx, lz, col, kind){
    const [x, z] = W(lx, lz), grp = new THREE.Group(); grp.position.set(x, .12, z);
    const base = new Merge(); base.add(G.cyl, 0, .03, 0, .35, .06, .35, 0, 0, 0, 0x2a2a2e);
    for(let k = 0; k < 6; k++) base.add(G.torus, 0, .1 + k * .065, 0, .13, .13, .25, Math.PI / 2, 0, 0, 0x9aa0a8);
    grp.add(new THREE.Mesh(base.geometry(), vcMat));
    const body = new THREE.Group(); body.position.y = .5; grp.add(body);
    const b = new Merge();
    if(kind === 'ball'){ b.add(G.sph, 0, .1, 0, .42, .3, .32, 0, 0, 0, col); b.add(G.cyl8, 0, .45, .18, .03, .4, .03, 0, 0, 0, YEL); b.add(G.cyl8, 0, .62, .18, .025, .4, .025, 0, 0, Math.PI / 2, YEL); }
    else if(kind === 'round'){ b.add(G.cyl, 0, .12, 0, .55, .1, .55, 0, 0, 0, col); for(const s of [-1, 1]) b.add(G.cyl8, s * .35, .35, 0, .03, .45, .03, 0, 0, 0, PUR); }
    else { b.add(G.box, 0, .12, 0, .32, .22, .8, 0, 0, 0, col); b.add(G.sph, 0, .32, .42, .2, .2, .2, 0, 0, 0, col); b.add(G.cyl8, 0, .48, .3, .025, .36, .025, 0, 0, Math.PI / 2, YEL); }
    const bm = new THREE.Mesh(b.geometry(), vcMat); bm.castShadow = true; body.add(bm);
    root.add(grp);
    circles.push({ x, z, r:.42, top:1.0, spring:SPRINGS.length });
    SPRINGS.push({ x, z, grp, body, ax:0, az:0, vx:0, vz:0, seatY:.12 + .5 + .3, kind });
  }
  springRider(-7.2, .9, 0x3fbf4a, 'ball');
  springRider(-5.7, 2.3, 0xf07a2a, 'horse');
  springRider(-6.3, 6.2, YEL, 'round');

  // purple seesaw
  const SEESAW = (() => {
    const [x, z] = W(-2.6, 6.6), grp = new THREE.Group(); grp.position.set(x, .12, z); grp.rotation.y = .25;
    const base = new Merge(); base.add(G.box, 0, .25, 0, .3, .5, .5, 0, 0, 0, PUR); base.add(G.cyl8, 0, .5, 0, .09, .4, .09, Math.PI / 2, 0, 0, YEL);
    grp.add(new THREE.Mesh(base.geometry(), vcMat));
    const beam = new THREE.Group(); beam.position.y = .5; grp.add(beam);
    const b = new Merge(); b.add(G.box, 0, .05, 0, 3.4, .1, .24, 0, 0, 0, PUR2);
    for(const s of [-1, 1]){ b.add(G.box, s * 1.45, .12, 0, .42, .06, .36, 0, 0, 0, PUR); b.add(G.cyl8, s * 1.15, .3, 0, .03, .36, .03, 0, 0, 0, YEL); b.add(G.cyl8, s * 1.15, .48, 0, .025, .34, .025, Math.PI / 2, 0, 0, YEL); }
    const bm = new THREE.Mesh(b.geometry(), vcMat); bm.castShadow = true; beam.add(bm);
    root.add(grp);
    const c = Math.cos(.25), s = Math.sin(.25);
    for(const k of [-1.3, 0, 1.3]) circles.push({ x:x + k * c, z:z - k * s, r:.3, top:.75, seesaw:true });
    return { x, z, yaw:.25, grp, beam, ang:.28, v:0, end:(side, out) => { const lx = (side ? 1 : -1) * 1.45; beam.updateWorldMatrix(true, false); return out.set(lx, .2, 0).applyMatrix4(beam.matrixWorld); } };
  })();

  // red A-frame swing sets (curved legs), each with two seats
  const SWINGS = [];
  function swingSet(lx, lz, yaw, seats){
    const [x, z] = W(lx, lz), c = Math.cos(yaw), s = Math.sin(yaw), H = 2.45;
    const P = (bx, y, bz) => [x + bx * c + bz * s, y, z - bx * s + bz * c];
    rod(play, P(-1.65, H, 0), P(1.65, H, 0), .07, RED, G.cyl8);
    for(const e of [-1.6, 1.6]) for(const f of [-1, 1]){
      const pts = []; for(let k = 0; k <= 6; k++){ const t = k / 6; pts.push(P(e, .12 + (H - .12) * (1 - t), f * 1.25 * Math.sin(t * Math.PI / 2) ** .8)); }
      for(let k = 0; k < 6; k++) rod(play, pts[k], pts[k + 1], .065, RED, G.cyl8);
      const g = P(e, 0, f * 1.25); circles.push({ x:g[0], z:g[2], r:.12, top:H });
    }
    for(const bx of seats){
      const piv = new THREE.Group(); const pp = P(bx, H, 0); piv.position.set(pp[0], pp[1], pp[2]); piv.rotation.y = yaw;
      const M = new Merge(); const L = 1.85;
      for(const sx of [-.22, .22]) M.add(G.cyl8, sx, -L / 2, 0, .012, L, .012, 0, 0, 0, 0x8a8f96);
      M.add(G.box, 0, -L - .02, 0, .52, .05, .24, 0, 0, 0, 0x1d1e22);
      const m = new THREE.Mesh(M.geometry(), vcMat); m.castShadow = true; piv.add(m); root.add(piv);
      SWINGS.push({ piv, L, yaw, ang:0, vel:0, x:pp[0], z:pp[2], top:H });
    }
  }
  swingSet(6.9, -.6, Math.PI / 2, [-.75, .75]);
  swingSet(3.4, 6.6, .45, [-.75, .75]);

  // activity panels on purple posts with yellow frames, along the south-west edge
  const PANELS = [];
  { const g = TX.activity.map(() => new GB());
    [115, 126, 137, 148, 159].forEach((deg, k) => {
      const a = deg * Math.PI / 180, x = C.x + Math.cos(a) * 9.1, z = C.z + Math.sin(a) * 9.1, yaw = Math.atan2(C.x - x, C.z - z), c = Math.cos(yaw), s = Math.sin(yaw);
      const P = (lx, y) => [x + lx * c, y, z - lx * s];
      g[k].quad(P(-.48, .55), P(.48, .55), P(.48, 1.5), P(-.48, 1.5), [0, 0], [1, 0], [1, 1], [0, 1]);
      for(const e of [-.56, .56]){ const p = P(e, 0); play.add(G.cyl8, p[0], .9, p[2], .07, 1.8, .07, 0, 0, 0, PUR); play.add(G.sm, p[0], 1.82, p[2], .09, .09, .09, 0, 0, 0, YEL); circles.push({ x:p[0], z:p[2], r:.1, top:1.8 }); }
      const pb = P(0, 0); play.add(G.box, pb[0] - s * .03, 1.025, pb[2] - c * .03, 1.06, 1.06, .05, 0, yaw, 0, YEL);
      PANELS.push({ x, z, yaw, spin:0 });
    });
    g.forEach((gb, k) => gb.mesh(lam({ map:TX.activity[k] }), 3));
  }
  const playMesh = vcMesh(play, 3, vcMat2);

  /* ======================================================================
     Benches, tree pits, trees, shrubs, lamps, floodlight, kiosk
     ====================================================================== */
  const BENCHES = [];
  { const M = new Merge();
    for(const deg of [62, 100, 168, 205, 300, 335]){
      const a = deg * Math.PI / 180, x = C.x + Math.cos(a) * 15.3, z = C.z + Math.sin(a) * 15.3, f = Math.atan2(C.x - x, C.z - z);
      const c = Math.cos(f), s = Math.sin(f), P = (lx, lz) => [x + lx * c + lz * s, z - lx * s + lz * c];
      for(const e of [-.7, .7]){ const p = P(e, 0); M.add(G.box, p[0], .2, p[1], .18, .4, .5, 0, f, 0, 0xa8a49b); }
      for(const k of [-.15, 0, .15]){ const p = P(0, k); M.add(G.box, p[0], .43, p[1], 1.8, .05, .12, 0, f, 0, 0x8a5634); }
      for(const y of [.62, .8]){ const p = P(0, -.25); M.add(G.box, p[0], y, p[1], 1.8, .1, .04, -.15, f, 0, 0x8a5634); }
      for(const e of [-.7, .7]){ const p = P(e, -.24); M.add(G.box, p[0], .62, p[1], .06, .45, .05, 0, f, 0, 0x5a4a3a); }
      BENCHES.push({ x, z, f });
      for(const e of [-.6, 0, .6]){ const p = P(e, 0); circles.push({ x:p[0], z:p[1], r:.32, top:.47, bench:BENCHES.length - 1 }); }
    }
    vcMesh(M, 3);
  }
  const PITS = [];
  { const gb = new GB(), sg = new GB();
    for(const deg of [92, 35, 145, 215, 262, 320]){
      const a = deg * Math.PI / 180, x = C.x + Math.cos(a) * 12.6, z = C.z + Math.sin(a) * 12.6, yaw = (deg % 2) * .2;
      for(const [lx, lz, sx, sz] of [[0, .72, 1.6, .16], [0, -.72, 1.6, .16], [.72, 0, .16, 1.3], [-.72, 0, .16, 1.3]]){ const c = Math.cos(yaw), s = Math.sin(yaw); gb.box(x + lx * c + lz * s, 0, z - lx * s + lz * c, sx, .26, sz, yaw, .5); }
      sg.box(x, 0, z, 1.3, .12, 1.3, yaw, 1);
      PITS.push({ x, z });
      floors.push({ x0:x - .8, x1:x + .8, z0:z - .8, z1:z + .8, y:.26 });
    }
    gb.mesh(lam({ map:TX.brick }), 3); sg.mesh(lam({ map:TX.soil }), 1);
  }
  // trees: bare deciduous (most), a few leafy autumn ones, dark cypresses
  const TREES = [], BUSHES = [];
  const okSpot = (x, z, m) => inPoly(x, z) && !nearEdge(x, z, m) && Math.hypot(x - C.x, z - C.z) > R_RING + m && distPath(x, z) > m && !TREES.some(t => Math.hypot(t.x - x, t.z - z) < 2.2) && !BUSHES.some(b => Math.hypot(b.x - x, b.z - z) < b.r + 1.1);
  function nearEdge(x, z, m){ for(const p of BP) if(Math.hypot(p[0] - x, p[1] - z) < m) return true; return false; }
  const trunkCol = 0x3b2f28;
  function bareTree(M, x, z, sc, yaw){
    const grow = (a, dir, len, r, depth) => {
      const b = [a[0] + dir[0] * len, a[1] + dir[1] * len, a[2] + dir[2] * len];
      rod(M, a, b, r, trunkCol, depth > 1 ? G.cyl8 : TWIG);
      if(depth <= 0) return;
      const n = depth > 3 ? 3 : depth > 1 ? 3 : 2 + (rnd() < .5 ? 1 : 0);
      for(let k = 0; k < n; k++){
        const th = (k / n) * Math.PI * 2 + rnd() * 1.2 + yaw, tilt = .45 + rnd() * .35;
        const d = [dir[0] * .55 + Math.cos(th) * Math.sin(tilt), dir[1] * .7 + Math.cos(tilt) * .5, dir[2] * .55 + Math.sin(th) * Math.sin(tilt)]; const l = Math.hypot(...d);
        grow(b, d.map(v => v / l), len * (.7 + rnd() * .15), r * .6, depth - 1);
      }
    };
    grow([x, 0, z], [0, 1, 0], 2.0 * sc, .13 * sc, 4);
  }
  const TWIG = new THREE.CylinderGeometry(.6, 1, 1, 4, 1, true);
  { const M = new Merge(), F = new Merge();
    // tree in each pit (the big bare one in front of the playground first)
    PITS.forEach((p, i) => { bareTree(M, p.x, p.z, i === 0 ? 1.15 : .9 + rnd() * .25, rnd() * 6); TREES.push({ x:p.x, z:p.z, r:.25, kind:'bare' }); });
    let tries = 0;
    const want = [['leafy', 16], ['bare', 16], ['cypress', 4]];
    for(const [kind, n] of want){ let k = 0;
      while(k < n && tries < 4000){ tries++;
        const x = -44 + rnd() * 82, z = -30 + rnd() * 58;
        if(!okSpot(x, z, 2.2)) continue;
        k++; TREES.push({ x, z, r:kind === 'cypress' ? .5 : .25, kind });
        if(kind === 'bare') bareTree(M, x, z, .85 + rnd() * .45, rnd() * 6);
        else if(kind === 'leafy'){ M.add(G.cyl8, x, 1.4, z, .17, 2.8, .17, 0, 0, 0, trunkCol);
          const tint = rnd(); for(let j = 0; j < 9; j++){ const a = rnd() * 6.28, r = rnd() * 1.4; const col = tint < .6 ? [0x3f6a2a, 0x4f7a30, 0x5a8434, 0x6a8a3a, 0x8a9a3a][(rnd() * 5) | 0] : [0x6a8a2a, 0xa8a038, 0xc9a032, 0x8a9a3a, 0xb8782a][(rnd() * 5) | 0]; F.add(G.ico1, x + Math.cos(a) * r, 3.3 + rnd() * 1.8, z + Math.sin(a) * r, 1.1 + rnd() * .6, .95 + rnd() * .5, 1.1 + rnd() * .6, rnd(), rnd(), 0, col); } rod(M, [x, 2.4, z], [x + .8, 3.6, z + .3], .09, trunkCol); rod(M, [x, 2.4, z], [x - .6, 3.8, z - .4], .09, trunkCol); }
        else { M.add(G.cyl8, x, .4, z, .14, .8, .14, 0, 0, 0, trunkCol); F.add(G.cone, x, 3.4, z, 1.0 + rnd() * .3, 6 + rnd() * 2, 1.0 + rnd() * .3, 0, 0, 0, 0x1f3a24); F.add(G.cone, x, 2.2, z, 1.25, 3.2, 1.25, 0, 1, 0, 0x234228); }
      }
    }
    // shrubs: trimmed balls and lollipops (a ball on a short trunk), along paths and the railing
    const want2 = 60; let k = 0; tries = 0;
    while(k < want2 && tries < 6000){ tries++;
      const x = -44 + rnd() * 82, z = -30 + rnd() * 58, r = .55 + rnd() * .45, lolly = rnd() < .45;
      if(!inPoly(x, z) || nearEdge(x, z, 1.2) || Math.hypot(x - C.x, z - C.z) < R_RING + 1.2 || distPath(x, z) < 1.0 + r || TREES.some(t => Math.hypot(t.x - x, t.z - z) < 1.8) || BUSHES.some(b => Math.hypot(b.x - x, b.z - z) < b.r + r + .6)) continue;
      // prefer spots near a path (like the real park)
      if(distPath(x, z) > 6 && rnd() < .6) continue;
      k++; const cy = lolly ? .9 + r * .8 : r * .8;
      if(lolly) M.add(G.cyl8, x, (cy - r * .6) / 2, z, .06, cy - r * .6, .06, 0, 0, 0, trunkCol);
      BUSHES.push({ x, z, r, y:cy, lolly });
    }
    const tm = vcMesh(M, 3); void tm;
    const fm = vcMesh(F, 3); void fm;
  }
  // shrub balls as one instanced mesh with a bumpy sphere
  const bushGeo = (() => { const g = new THREE.SphereGeometry(1, 20, 14); const p = g.attributes.position; for(let i = 0; i < p.count; i++){ _v.fromBufferAttribute(p, i); const k = 1 + (Math.sin(_v.x * 7) * Math.sin(_v.y * 6) * Math.sin(_v.z * 8)) * .05; p.setXYZ(i, _v.x * k, _v.y * k * .92, _v.z * k); } g.computeVertexNormals(); return g; })();
  const bushMesh = new THREE.InstancedMesh(bushGeo, lam({ color:0xffffff }), BUSHES.length);
  BUSHES.forEach((b, i) => { const m = new THREE.Matrix4().compose(new THREE.Vector3(b.x, b.y, b.z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, rnd() * 6, 0)), new THREE.Vector3(b.r, b.r * (b.lolly ? .95 : .85), b.r)); bushMesh.setMatrixAt(i, m); bushMesh.setColorAt(i, new THREE.Color().setHSL(.27 + rnd() * .06, .45, .2 + rnd() * .07)); circles.push({ x:b.x, z:b.z, r:b.r * .8, top:b.y + b.r, bush:i }); });
  bushMesh.castShadow = true; bushMesh.receiveShadow = true; root.add(bushMesh);
  TREES.forEach(t => circles.push({ x:t.x, z:t.z, r:t.r, top:9 }));

  // street lamps (tall pole, LED head) and the floodlight with a cluster of 4 lamps
  const LAMPS = [];
  { const M = new Merge(), heads = new Merge();
    const lamp = (x, z, h = 5.6) => {
      M.add(G.cyl8, x, h / 2, z, .07, h, .07, 0, 0, 0, 0x3a3d42); M.add(G.cyl8, x, .25, z, .13, .5, .13, 0, 0, 0, 0x3a3d42);
      const yaw = Math.atan2(C.x - x, C.z - z), hx = x + Math.sin(yaw) * .55, hz = z + Math.cos(yaw) * .55;
      M.add(G.box, (x + hx) / 2, h - .05, (z + hz) / 2, .06, .06, .6, 0, yaw, 0, 0x3a3d42);
      M.add(G.box, hx, h - .12, hz, .3, .12, .45, 0, yaw, 0, 0x2e3034); heads.add(G.box, hx, h - .19, hz, .24, .03, .38, 0, yaw, 0, 0xffffff);
      LAMPS.push({ x:hx, y:h - .25, z:hz, big:false }); circles.push({ x, z, r:.14, top:h });
    };
    for(const deg of [-58, 58, 180, 245]){ const a = deg * Math.PI / 180; lamp(C.x + Math.cos(a) * 15.6, C.z + Math.sin(a) * 15.6); }
    lamp(-27, -6.6); lamp(9.5, -21.2); lamp(-20, 3.4); lamp(-2.6, 17.2); lamp(28, 1.3);
    // floodlight: tall pole, a bar with four boxy lamps
    const fx = -6, fz = -12.6, fh = 9;
    M.add(G.cyl8, fx, fh / 2, fz, .1, fh, .1, 0, 0, 0, 0x6c7076); M.add(G.cyl8, fx, .3, fz, .18, .6, .18, 0, 0, 0, 0x6c7076);
    M.add(G.box, fx, fh, fz, 1.3, .08, .08, 0, .4, 0, 0x6c7076);
    for(const [ox, oz] of [[-.5, .15], [.5, -.15], [-.2, .35], [.2, -.35]]){ const x = fx + ox, z = fz + oz; M.add(G.box, x, fh + .2, z, .34, .26, .14, -.5, .4, 0, 0x2a2c30); heads.add(G.box, x + Math.sin(.4) * .08, fh + .17, z + Math.cos(.4) * .08, .28, .2, .02, -.5, .4, 0, 0xffffff); }
    LAMPS.push({ x:fx, y:fh, z:fz, big:true }); circles.push({ x:fx, z:fz, r:.2, top:fh });
    vcMesh(M, 2);
    var headMat = new THREE.MeshBasicMaterial({ color:0xdcdcd0 });
    { const hm = new THREE.Mesh(heads.geometry(), headMat); root.add(hm); }
  }
  // lamp glows (sprites) and light pools on the ground (additive); shown at dusk and night
  const glowMat = new THREE.SpriteMaterial({ map:TX.glow, color:0xffffff, transparent:true, depthWrite:false, blending:THREE.AdditiveBlending, opacity:0 });
  const poolMat = new THREE.MeshBasicMaterial({ map:TX.pool, transparent:true, depthWrite:false, blending:THREE.AdditiveBlending, opacity:0, polygonOffset:true, polygonOffsetFactor:-4 });
  for(const l of LAMPS){
    const sp = new THREE.Sprite(glowMat); sp.position.set(l.x, l.y - (l.big ? 0 : .1), l.z); sp.scale.setScalar(l.big ? 4.2 : 2.2); root.add(sp);
    const pg = new THREE.PlaneGeometry(1, 1); pg.rotateX(-Math.PI / 2); const pm = new THREE.Mesh(pg, poolMat); pm.position.set(l.x, l.big ? .16 : .15, l.z); pm.scale.setScalar(l.big ? 22 : 11); pm.renderOrder = 3; root.add(pm);
  }
  // the little plain electrical kiosk with a hip roof, near the west corner
  const KIOSK = { x:-40.4, z:.6 };
  { const gb = new GB(); gb.box(KIOSK.x, 0, KIOSK.z, 1.5, 2.1, 2.2, .1, 2.2, false); gb.mesh(lam({ map:TX.kiosk }), 3);
    const M = new Merge(); M.add(G.cone4, KIOSK.x, 2.42, KIOSK.z, 1.45, .65, 1.75, 0, Math.PI / 4 + .1, 0, 0xc9a596); M.add(G.box, KIOSK.x, 2.12, KIOSK.z, 1.66, .1, 2.36, 0, .1, 0, 0xd9bcae); vcMesh(M, 3);
    blocks.push({ x0:KIOSK.x - .8, x1:KIOSK.x + .8, z0:KIOSK.z - 1.15, z1:KIOSK.z + 1.15, top:2.2, bot:0 }); }

  /* ---------- hiding spots: behind shrubs (away from the playground) ---------- */
  const HIDES = [];
  { const list = BUSHES.filter(b => !b.lolly && b.r > .7).slice(0, 14);
    for(const b of list){ const dx = b.x - C.x, dz = b.z - C.z, l = Math.hypot(dx, dz) || 1; const x = b.x + dx / l * (b.r + .45), z = b.z + dz / l * (b.r + .45); if(inPoly(x, z) && !nearEdge(x, z, .8)) HIDES.push({ x, z, bush:b }); }
    for(const p of [[-41.5, -1.6], [-39.4, 2.4]]) HIDES.push({ x:p[0], z:p[1], bush:null });   // behind the kiosk
  }

  /* ---------- physics queries ---------- */
  const STEP = .5;
  function groundAt(x, z, y = 99){
    let g = Math.hypot(x - C.x, z - C.z) < R_RUB + .2 ? .12 : 0, climbing = false;
    for(const f of floors){ if(x < f.x0 || x > f.x1 || z < f.z0 || z > f.z1) continue; const h = typeof f.y === 'function' ? f.y(x, z) : f.y; if(h <= y + STEP && h > g){ g = h; climbing = !!f.climb; } }
    groundAt.climb = climbing; return g;
  }
  /* push a mover (o.x, o.z, o.y) out of blockers and keep it inside the railing */
  function collide(o, r = .35){
    for(const c of circles){ if(o.y > c.top - .05 || c.off) continue; const dx = o.x - c.x, dz = o.z - c.z, d = Math.hypot(dx, dz), m = c.r + r; if(d < m && d > 1e-5){ o.x = c.x + dx / d * m; o.z = c.z + dz / d * m; } }
    for(const b of blocks){ if(o.y > b.top - STEP || o.y + 1.2 < b.bot) continue; if(o.x > b.x0 - r && o.x < b.x1 + r && o.z > b.z0 - r && o.z < b.z1 + r){ const p = [o.x - (b.x0 - r), b.x1 + r - o.x, o.z - (b.z0 - r), b.z1 + r - o.z], m = Math.min(...p), i = p.indexOf(m); if(i === 0) o.x = b.x0 - r; else if(i === 1) o.x = b.x1 + r; else if(i === 2) o.z = b.z0 - r; else o.z = b.z1 + r; } }
    // railing: closest outline point; push inside by r + .25
    let bd = 1e9, bi = 0, px = 0, pz = 0;
    for(let i = 0; i < NB; i++){ const a = BP[i], b = at(i + 1), dx = b[0] - a[0], dz = b[1] - a[1], l2 = dx * dx + dz * dz; let t = ((o.x - a[0]) * dx + (o.z - a[1]) * dz) / l2; t = clamp(t, 0, 1); const qx = a[0] + dx * t, qz = a[1] + dz * t, d = Math.hypot(o.x - qx, o.z - qz); if(d < bd){ bd = d; bi = i; px = qx; pz = qz; } }
    const n = outN(bi), m = r + .3, inside = inPoly(o.x, o.z);
    if(!inside || bd < m){ o.x = px - n[0] * m; o.z = pz - n[1] * m; return true; }
    return false;
  }
  const inPark = (x, z) => inPoly(x, z);

  /* ---------- day / dusk / night ---------- */
  let poolOn = 0;
  function setNight(dusk, night){   // dusk 0..1 (evening light), night 0..1
    const lampsOn = clamp(dusk * .6 + night, 0, 1);
    glowMat.opacity = lampsOn * .95; poolMat.opacity = lampsOn * (.25 + night * .45); poolOn = lampsOn;
    headMat.color.setRGB(.85 + lampsOn * .15, .85 + lampsOn * .1, .8);
    const w = clamp(dusk * .18 + night, 0, 1);
    for(const m of nightMats) m.emissive.setRGB(w * .95, w * .82, w * .6);
  }
  function tick(t, dt){
    for(const p of PANELS) if(p.spin > 0) p.spin = Math.max(0, p.spin - dt);
    void poolOn;
  }
  const spawn = { x:C.x + 2.2, z:C.z + 14.6, f:Math.PI };
  return { group:root, C, R_RUB, R_RING, BP, ENT, groundAt, collide, inPark, SLIDES, SWINGS, SEESAW, SPRINGS, BENCHES, PANELS, PITS, TREES, BUSHES, HIDES, LAMPS, KIOSK, climb, circles,
    setNight, tick, spawn, playMesh, hs, distPath };
}
