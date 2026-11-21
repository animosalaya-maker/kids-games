/* Bobo Kart: builds a track from trackdefs.js — the road ribbon (curbs, shoulders, ramps, gaps), walls and fences, a terrain
   that hugs the road, water, a tunnel, the sky and the scenery of each theme. Everything static is merged or instanced
   (few draw calls), vertex-coloured Lambert, no shadow maps.
   buildTrack(THREE, K, def) → { root, N, S (samples), len, hw, lim, sc, query(x, z, hint), at(u, side), update(dt, t), … } */
export function buildTrack(THREE, K, def){
  const { Merge, G } = K;
  const root = new THREE.Group();
  const TH = THEMES[def.theme];
  let seed = 1; for(const ch of def.id) seed = (seed * 31 + ch.charCodeAt(0)) >>> 0;
  const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  const rr = (a, b) => a + rnd() * (b - a);
  const lam = () => new THREE.MeshLambertMaterial({ vertexColors:true });
  const col = (a, b, t) => new THREE.Color(a).lerp(new THREE.Color(b), t).getHex();
  const WATER_Y = -.45;

  /* ---------- centre line samples ---------- */
  function sample(pts, closed, step){
    const c = new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(p[0], p[2] || 0, p[1])), closed, 'centripetal');
    const len = c.getLength(), n = Math.max(8, Math.round(len / step)), sp = c.getSpacedPoints(n);
    if(closed) sp.pop();
    const S = sp.map(p => ({ x:p.x, y:p.y, z:p.z, tx:0, tz:0, nx:0, nz:0, ramp:0, gap:false, tun:false }));
    const M = S.length;
    for(let i = 0; i < M; i++){
      const a = S[closed ? (i - 1 + M) % M : Math.max(0, i - 1)], b = S[closed ? (i + 1) % M : Math.min(M - 1, i + 1)];
      let tx = b.x - a.x, tz = b.z - a.z; const l = Math.hypot(tx, tz) || 1; tx /= l; tz /= l;
      S[i].tx = tx; S[i].tz = tz; S[i].nx = -tz; S[i].nz = tx;           // n = right-hand side
    }
    return { S, len, M };
  }
  const main = sample(def.pts, true, 2);
  const S = main.S, N = main.M, LEN = main.len, hw = def.w / 2, lim = hw + 1.9;
  const segLen = LEN / N;

  // water channels → gaps (with a ramp before each one)
  const segDist = (px, pz, ax, az, bx, bz) => { const dx = bx - ax, dz = bz - az, l2 = dx * dx + dz * dz || 1; let t = ((px - ax) * dx + (pz - az) * dz) / l2; t = t < 0 ? 0 : t > 1 ? 1 : t; return Math.hypot(px - ax - dx * t, pz - az - dz * t); };
  const waterDist = (x, z) => { let best = 1e9; for(const w of def.water){ for(let k = 0; k + 1 < w.pts.length; k++){ const d = segDist(x, z, w.pts[k][0], w.pts[k][1], w.pts[k + 1][0], w.pts[k + 1][1]) - w.hw; if(d < best) best = d; } } return best; };
  for(const s of S){ s.gap = waterDist(s.x, s.z) < 1.5; s.y = s.gap ? s.y : s.y; }
  const gaps = [];
  for(let i = 0; i < N; i++) if(S[i].gap && !S[(i - 1 + N) % N].gap) gaps.push(i);
  const RAMP_N = 6, RAMP_H = 1.9;
  for(const g of gaps){
    for(let k = 1; k <= RAMP_N; k++){ const s = S[(g - k + N) % N]; s.ramp = Math.max(s.ramp, RAMP_H * (RAMP_N + 1 - k) / RAMP_N); }
    // keep the road level across the gap (landing at the same height)
    let e = g; while(S[e % N].gap) e++; const ya = S[(g - 1 + N) % N].y, yb = S[e % N].y;
    for(let i = g; i < e; i++) S[i % N].y = ya + (yb - ya) * (i - g + 1) / (e - g + 1);
  }
  for(const [u0, u1] of def.tunnels) for(let i = Math.round(u0 * N); i <= Math.round(u1 * N); i++) S[i % N].tun = true;

  // the shortcut
  let SC = null;
  if(def.sc){
    const sc = sample(def.sc.pts, false, 2);
    const nearestMain = (x, z) => { let b = 0, bd = 1e9; for(let i = 0; i < N; i++){ const d = (S[i].x - x) ** 2 + (S[i].z - z) ** 2; if(d < bd){ bd = d; b = i; } } return b; };
    const a = sc.S[0], b = sc.S[sc.M - 1];
    SC = { S:sc.S, M:sc.M, hw:def.sc.w / 2, lim:def.sc.w / 2 + .6, u0:nearestMain(a.x, a.z) / N, u1:nearestMain(b.x, b.z) / N };
  }

  // inside or outside of the loop (for the sea-side fence and the scenery)
  const inside = (x, z) => { let c = false; for(let i = 0, j = N - 1; i < N; j = i++){ const a = S[i], b = S[j]; if(((a.z > z) !== (b.z > z)) && (x < (b.x - a.x) * (z - a.z) / (b.z - a.z) + a.x)) c = !c; } return c; };
  const OUTER = inside(S[0].x + S[0].nx * 30, S[0].z + S[0].nz * 30) ? -1 : 1;   // the side (sign of n) that faces away from the loop

  /* ---------- queries ---------- */
  function projSeg(arr, M, closed, x, z, hint, win){
    let best = -1, bd = 1e18;
    if(hint >= 0 && win){
      for(let k = -win; k <= win; k++){ let j = hint + k; if(closed) j = (j + M) % M; else if(j < 0 || j >= M) continue; const s = arr[j], d = (s.x - x) ** 2 + (s.z - z) ** 2; if(d < bd){ bd = d; best = j; } }
    }
    if(best < 0 || bd > 900){ for(let j = 0; j < M; j++){ const s = arr[j], d = (s.x - x) ** 2 + (s.z - z) ** 2; if(d < bd){ bd = d; best = j; } } }
    // refine on the segment before or after
    const s = arr[best];
    const along = (x - s.x) * s.tx + (z - s.z) * s.tz;
    let j0 = best, j1;
    if(along >= 0){ j1 = closed ? (best + 1) % M : Math.min(M - 1, best + 1); } else { j0 = closed ? (best - 1 + M) % M : Math.max(0, best - 1); j1 = best; }
    const a = arr[j0], b = arr[j1];
    const dx = b.x - a.x, dz = b.z - a.z, l2 = dx * dx + dz * dz || 1;
    let f = ((x - a.x) * dx + (z - a.z) * dz) / l2; f = f < 0 ? 0 : f > 1 ? 1 : f;
    const cx = a.x + dx * f, cz = a.z + dz * f;
    const nx = a.nx + (b.nx - a.nx) * f, nz = a.nz + (b.nz - a.nz) * f, nl = Math.hypot(nx, nz) || 1;
    const d = ((x - cx) * nx + (z - cz) * nz) / nl;
    const y = a.y + (b.y - a.y) * f, ramp = a.ramp + (b.ramp - a.ramp) * f;
    return { i:best, j0, f, d, y, ramp, nx:nx / nl, nz:nz / nl, cx, cz, gap:a.gap && b.gap ? true : (f < .5 ? a.gap : b.gap), tun:a.tun || b.tun };
  }
  /* where is (x, z)? → { u (0..1 of the lap), y (road height), on ('main'|'sc'|'out'), push {x, z} back onto the road, gap, tun } */
  function query(x, z, hint = -1, scHint = -1){
    const m = projSeg(S, N, true, x, z, hint, 14);
    const r = { i:m.i, u:(m.j0 + m.f) / N, d:m.d, y:m.y, ramp:Math.abs(m.d) < hw + .3 ? m.ramp : 0, on:'main', gap:m.gap, tun:m.tun, px:0, pz:0, over:0, si:-1, tx:S[m.i].tx, tz:S[m.i].tz };
    if(r.u >= 1) r.u -= 1;
    if(Math.abs(m.d) <= lim) return r;
    if(SC){
      const s = projSeg(SC.S, SC.M, false, x, z, scHint, 10);
      const inEnds = !((s.j0 === 0 && s.f <= 0) || (s.j0 >= SC.M - 2 && s.f >= 1));
      if(Math.abs(s.d) <= SC.lim && inEnds){
        r.on = 'sc'; r.si = s.i; r.y = s.y; r.ramp = 0; r.gap = false; r.tun = false; r.d = 0;
        r.u = SC.u0 + (SC.u1 - SC.u0) * ((s.j0 + s.f) / (SC.M - 1)); r.tx = SC.S[s.i].tx; r.tz = SC.S[s.i].tz;
        return r;
      }
      const om = Math.abs(m.d) - lim, os = inEnds ? Math.abs(s.d) - SC.lim : 1e9;
      if(os < om){ r.on = 'out'; r.over = os; r.y = s.y; r.si = s.i; const k = Math.sign(s.d); r.px = -s.nx * k; r.pz = -s.nz * k; r.u = SC.u0 + (SC.u1 - SC.u0) * ((s.j0 + s.f) / (SC.M - 1)); return r; }
    }
    r.on = 'out'; r.over = Math.abs(m.d) - lim; const k = Math.sign(m.d); r.px = -m.nx * k; r.pz = -m.nz * k;
    return r;
  }
  /* a point on the lap: u in 0..1, side -1..1 across the road */
  function at(u, side = 0){
    u = ((u % 1) + 1) % 1; const fi = u * N, i = Math.floor(fi) % N, j = (i + 1) % N, f = fi - Math.floor(fi), a = S[i], b = S[j];
    const x = a.x + (b.x - a.x) * f + a.nx * side * hw, z = a.z + (b.z - a.z) * f + a.nz * side * hw;
    return { x, y:a.y + (b.y - a.y) * f, z, h:Math.atan2(a.tx, a.tz), i, gap:a.gap, ramp:a.ramp };
  }

  /* ---------- distance field to the road (for the terrain and the scenery) ---------- */
  const GR = 4, GH = 230, GN = Math.round(GH * 2 / GR) + 1;
  const dField = new Float32Array(GN * GN), yField = new Float32Array(GN * GN);
  const allS = S.filter(s => !s.gap).map(s => [s.x, s.z, s.y, hw]).concat(SC ? SC.S.map(s => [s.x, s.z, s.y, SC.hw]) : []);
  for(let gz = 0; gz < GN; gz++) for(let gx = 0; gx < GN; gx++){
    const x = -GH + gx * GR, z = -GH + gz * GR; let bd = 1e9, by = 0;
    for(const s of allS){ const d = Math.hypot(s[0] - x, s[1] - z) - s[3]; if(d < bd){ bd = d; by = s[2]; } }
    dField[gz * GN + gx] = bd; yField[gz * GN + gx] = by;
  }
  const roadDist = (x, z) => {
    const fx = (x + GH) / GR, fz = (z + GH) / GR; if(fx < 0 || fz < 0 || fx >= GN - 1 || fz >= GN - 1) return 999;
    const ix = fx | 0, iz = fz | 0, tx = fx - ix, tz = fz - iz, o = iz * GN + ix;
    return (dField[o] * (1 - tx) + dField[o + 1] * tx) * (1 - tz) + (dField[o + GN] * (1 - tx) + dField[o + GN + 1] * tx) * tz;
  };
  const free = (x, z, r) => roadDist(x, z) > 4.6 + r && waterDist(x, z) > r + 1;

  /* ---------- terrain ---------- */
  const noise = (x, z) => Math.sin(x * .045 + Math.sin(z * .03) * 2) * Math.cos(z * .05 - Math.sin(x * .02)) + Math.sin(x * .11 + z * .07) * .35;
  const smooth = (a, b, v) => { const t = Math.max(0, Math.min(1, (v - a) / (b - a))); return t * t * (3 - 2 * t); };
  const baseH = (x, z) => TH.terrain(x, z, noise, OUTER, inside);
  function groundH(x, z){
    const fx = (x + GH) / GR, fz = (z + GH) / GR;
    let h = baseH(x, z);
    if(fx >= 0 && fz >= 0 && fx < GN && fz < GN){
      const o = Math.round(fz) * GN + Math.round(fx), d = roadDist(x, z), ry = yField[o] - .12;
      h = ry + (h - ry) * smooth(2.6, 16, d);
    }
    const wd = waterDist(x, z);
    if(wd < 4) h = Math.min(h, -2.4 + smooth(-3, 4, wd) * 2.6);
    return h;
  }
  {
    const SZ = 2 * GH, SEG = 115, g = new THREE.PlaneGeometry(SZ, SZ, SEG, SEG); g.rotateX(-Math.PI / 2);
    const p = g.attributes.position, cols = new Float32Array(p.count * 3), c = new THREE.Color();
    for(let i = 0; i < p.count; i++){
      const x = p.getX(i), z = p.getZ(i), h = groundH(x, z); p.setY(i, h);
      TH.ground(c, x, z, h, roadDist(x, z), noise, waterDist(x, z)); cols[i * 3] = c.r; cols[i * 3 + 1] = c.g; cols[i * 3 + 2] = c.b;
    }
    g.setAttribute('color', new THREE.BufferAttribute(cols, 3)); g.computeVertexNormals();
    const m = new THREE.Mesh(g, lam()); m.name = 'ground'; root.add(m);
    // far ground ring so the edge never shows
    const fg = new THREE.RingGeometry(GH * 1.35, 1400, 48, 1); fg.rotateX(-Math.PI / 2);
    const far = new THREE.Mesh(fg, new THREE.MeshLambertMaterial({ color:TH.far })); far.position.y = TH.farY; root.add(far);
    const fill = new THREE.Mesh(new THREE.PlaneGeometry(GH * 2.8, GH * 2.8).rotateX(-Math.PI / 2), new THREE.MeshLambertMaterial({ color:TH.far })); fill.position.y = TH.farY - .3; root.add(fill);
  }
  // water
  let water = null;
  {
    const wg = new THREE.PlaneGeometry(2400, 2400, 1, 1); wg.rotateX(-Math.PI / 2);
    water = new THREE.Mesh(wg, new THREE.MeshLambertMaterial({ color:TH.water, transparent:true, opacity:.86, emissive:TH.waterE || 0x000000 }));
    water.position.y = WATER_Y; water.renderOrder = 1; root.add(water);
  }

  /* ---------- the road ribbon ---------- */
  {
    const P = [], C = [], c = new THREE.Color();
    const quad = (a, b, cc, dd, color) => { c.set(color); for(const v of [a, cc, b, a, dd, cc]){ P.push(v[0], v[1], v[2]); C.push(c.r, c.g, c.b); } };
    const ribbon = (arr, M, closed, halfW, theme, isMain) => {
      const pt = (s, off, dy = 0) => [s.x + s.nx * off, s.y + (Math.abs(off) <= halfW + .6 ? s.ramp : 0) + .02 + dy, s.z + s.nz * off];
      const last = closed ? M : M - 1;
      for(let i = 0; i < last; i++){
        const a = arr[i], b = arr[(i + 1) % M];
        if(a.gap || b.gap) continue;
        const stripe = ((i >> 1) & 1) === 0, ramp = a.ramp > 0 || b.ramp > 0;
        const bands = [[-halfW - 2.1, -halfW - .9, theme.shoulder], [-halfW - .9, -halfW, stripe ? theme.curbA : theme.curbB], [-halfW, 0, null], [0, halfW, null], [halfW, halfW + .9, stripe ? theme.curbA : theme.curbB], [halfW + .9, halfW + 2.1, theme.shoulder]];
        for(const [o0, o1, cc0] of bands){
          let cc = cc0;
          if(cc == null){ const k = (Math.sin(i * .9) * .5 + .5) * .06 + (o0 < 0 ? .02 : 0); cc = col(theme.road, theme.roadB, k); if(ramp) cc = stripe ? 0xffb23d : 0xfff1d6; else if(!isMain) cc = col(theme.road, theme.roadB, .5); }
          if(i === 0 && isMain && cc0 == null) continue;
          quad(pt(a, o0), pt(b, o0), pt(b, o1), pt(a, o1), cc);
        }
        if(!ramp && isMain && (i % 6) < 3){ const w = .22; quad(pt(a, -w, .005), pt(b, -w, .005), pt(b, w, .005), pt(a, w, .005), theme.dash); }
        // ramp sides
        if(ramp){ for(const sd of [-1, 1]){ const oa = sd * (halfW + .02); quad([a.x + a.nx * oa, a.y - .2, a.z + a.nz * oa], [b.x + b.nx * oa, b.y - .2, b.z + b.nz * oa], pt(b, oa), pt(a, oa), 0xc98a3a); } }
      }
      // ramp front face at the gap
      for(let i = 0; i < M; i++){ const a = arr[i], b = arr[(i + 1) % M]; if(a.ramp > 0 && b.gap){ quad(pt(a, -halfW), [a.x - a.nx * halfW, a.y - 1.5, a.z - a.nz * halfW], [a.x + a.nx * halfW, a.y - 1.5, a.z + a.nz * halfW], pt(a, halfW), 0xa8702c); } }
    };
    ribbon(S, N, true, hw, TH, true);
    if(SC) ribbon(SC.S, SC.M, false, SC.hw, TH, false);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(C, 3)); g.computeVertexNormals();
    const m = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ vertexColors:true, side:THREE.DoubleSide })); m.name = 'road'; root.add(m);
  }
  // checkered start line + boost pads + the start arch (one textured mesh for the flat decals)
  const decalTex = K.canvasTex(256, 128, (x) => {
    for(let i = 0; i < 8; i++) for(let j = 0; j < 4; j++){ x.fillStyle = (i + j) % 2 ? '#222' : '#fff'; x.fillRect(i * 16, j * 32, 16, 32); }
    // boost pad (right half): orange with yellow chevrons
    const gr = x.createLinearGradient(128, 0, 256, 0); gr.addColorStop(0, '#ff6a1a'); gr.addColorStop(1, '#ffb21a'); x.fillStyle = gr; x.fillRect(128, 0, 128, 128);
    x.strokeStyle = '#fff6b0'; x.lineWidth = 14; x.lineJoin = 'round';
    for(let k = 0; k < 3; k++){ x.beginPath(); x.moveTo(146 + k * 36, 22); x.lineTo(172 + k * 36, 64); x.lineTo(146 + k * 36, 106); x.stroke(); }
  });
  decalTex.magFilter = THREE.LinearFilter;
  const PADS = [];
  {
    const P = [], U = [];
    const put = (u, side, len, wid, u0, u1, lift) => {
      const c = at(u, side), s = S[c.i], fx = s.tx, fz = s.tz, nx = s.nx, nz = s.nz, y = c.y + lift;
      const corner = (a, b) => [c.x + fx * a + nx * b, y, c.z + fz * a + nz * b];
      // the texture's x runs along the road (forward), its y across
      const A = corner(-len / 2, -wid / 2), B = corner(len / 2, -wid / 2), C2 = corner(len / 2, wid / 2), D = corner(-len / 2, wid / 2);
      for(const [v, uv] of [[A, [u0, 0]], [C2, [u1, 1]], [B, [u1, 0]], [A, [u0, 0]], [D, [u0, 1]], [C2, [u1, 1]]]){ P.push(...v); U.push(...uv); }
    };
    put(0, 0, 2.4, def.w, 0, .5, .05);
    for(const [u, side] of def.pads){ put(u, side * .55, 5, 4.2, .5, 1, .06); const c = at(u, side * .55); PADS.push({ x:c.x, z:c.z, y:c.y, h:c.h, u }); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2));
    const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ map:decalTex, polygonOffset:true, polygonOffsetFactor:-2 })); m.name = 'decals'; root.add(m);
  }

  /* ---------- walls and fences ---------- */
  const solids = [];          // round scenery that karts bump into (none on the road; kept for future use)
  {
    const posts = { a:[], b:[] }, rails = { a:[], b:[] };
    const scMask = (x, z) => SC ? (() => { let bd = 1e9; for(const s of SC.S){ const d = Math.hypot(s.x - x, s.z - z); if(d < bd) bd = d; } return bd < SC.hw + 2.6; })() : false;
    const mainMask = (x, z) => { let bd = 1e9; for(const s of S){ const d = Math.hypot(s.x - x, s.z - z); if(d < bd) bd = d; } return bd < hw + 2.6; };
    const line = (arr, M, closed, off, kindOf, mask) => {
      for(const sd of [-1, 1]){
        let prev = null, prevKind = null, acc = 1e9;
        for(let i = 0; i < M; i++){
          const s = arr[i];
          const x = s.x + s.nx * sd * off, z = s.z + s.nz * sd * off, y = s.y;
          const kind = kindOf(sd, x, z), step = TH.walls[kind].step;
          acc += 2;
          if(acc < step && prev && kind === prevKind) continue; acc = 0;
          if(s.gap || s.tun || s.ramp > 0){ prev = null; continue; }
          if(mask(x, z)){ prev = null; continue; }
          const P = { x, y, z, h:Math.atan2(s.tx, s.tz) };
          posts.a.push(P, kind);
          if(prev && kind === prevKind && Math.hypot(prev.x - x, prev.z - z) < step * 2.5) rails.a.push([prev, P], kind);
          prev = P; prevKind = kind;
        }
      }
    };
    const pickW = (w, x, z) => typeof w === 'function' ? w(x, z) : w;
    line(S, N, true, hw + 2.6, (sd, x, z) => pickW(sd === OUTER ? TH.outerWall : TH.innerWall, x, z), scMask);
    if(SC) line(SC.S, SC.M, false, SC.hw + 1.3, () => TH.scWall, mainMask);
    // instanced posts and rails per wall kind
    const groups = {};
    const add = (list, isRail) => { for(let k = 0; k < list.length; k += 2){ const kind = list[k + 1], key = kind + (isRail ? '_r' : '_p'); (groups[key] = groups[key] || { kind, isRail, items:[] }).items.push(list[k]); } };
    add(posts.a, false); add(posts.b, false); add(rails.a, true); add(rails.b, true);
    const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3(), _s = new THREE.Vector3();
    for(const key in groups){
      const gp = groups[key], W = TH.walls[gp.kind], geo = gp.isRail ? W.rail : W.post;
      if(!geo) continue;
      const im = new THREE.InstancedMesh(geo, lam(), gp.items.length);
      gp.items.forEach((it, i) => {
        if(gp.isRail){ const [a, b] = it, dx = b.x - a.x, dz = b.z - a.z, l = Math.hypot(dx, dz); _p.set((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2); _q.setFromEuler(_e.set(0, Math.atan2(dx, dz), 0)); _s.set(1, 1, l); }
        else { _p.set(it.x, it.y, it.z); _q.setFromEuler(_e.set(0, it.h + (W.jit ? rr(-.15, .15) : 0), 0)); const k = W.jit ? rr(.85, 1.15) : 1; _s.set(1, k, 1); }
        _m.compose(_p, _q, _s); im.setMatrixAt(i, _m);
      });
      im.name = 'wall_' + key; root.add(im);
    }
  }

  /* ---------- tunnel ---------- */
  for(const [u0, u1] of def.tunnels){
    const i0 = Math.round(u0 * N), i1 = Math.round(u1 * N);
    if(TH.tunnel === 'donut'){
      const M = new Merge(), cols = [0xff8fc8, 0x8fd8ff, 0xfff08a, 0xb8f28a, 0xc8a0ff];
      for(let i = i0, k = 0; i <= i1; i += 3, k++){
        const s = S[i % N], ry = Math.atan2(s.tx, s.tz);
        M.add(new THREE.TorusGeometry(hw + 3, 1.3, 8, 22, Math.PI), s.x, s.y - .2, s.z, 1, 1.05, 1.4, 0, ry, 0, 0xd99a5c);
        M.add(new THREE.TorusGeometry(hw + 3, 1.36, 8, 22, Math.PI), s.x, s.y - .2 + .25, s.z, 1, 1.05, 1.1, 0, ry, 0, cols[k % cols.length]);
      }
      root.add(new THREE.Mesh(M.geometry(), lam()));
      continue;
    }
    const RING = 12, Rw = hw + 2.7, Rh = 7.2, P = [], C = [], idx = [], c = new THREE.Color();
    let vi = 0;
    for(let i = i0; i <= i1; i++){
      const s = S[i % N];
      for(let k = 0; k <= RING; k++){
        const a = k / RING * Math.PI, wob = (Math.sin(i * 1.7 + k * 2.3) * .35 + Math.sin(i * .5 + k) * .25), r = 1 + wob * .06;
        const ox = Math.cos(a) * Rw * r, oy = Math.sin(a) * Rh * r;
        P.push(s.x + s.nx * ox, s.y - .3 + oy, s.z + s.nz * ox);
        const band = Math.sin(oy * 1.6 + i * .2) > .2;
        c.set(band ? TH.rockA : TH.rockB); c.multiplyScalar(.55 + .25 * Math.sin(a)); C.push(c.r, c.g, c.b);
        if(i > i0 && k < RING){ const a0 = vi - RING - 1, b0 = vi; idx.push(a0, b0, a0 + 1, b0, b0 + 1, a0 + 1); }
        vi++;
      }
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(C, 3)); g.setIndex(idx); g.computeVertexNormals();
    const tm = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ vertexColors:true, side:THREE.DoubleSide })); tm.name = 'tunnel'; root.add(tm);
    // rocks on top + the two mouths + lanterns inside
    const M = new Merge(), GL = new Merge();
    for(let i = i0; i <= i1; i += 2){
      const s = S[i % N];
      for(const sd of [-1, 0, 1]) M.add(G.dode, s.x + s.nx * sd * (Rw - 1) + rr(-1, 1), s.y + Rh - 1 + rr(0, 2.5) - Math.abs(sd) * 2, s.z + s.nz * sd * (Rw - 1) + rr(-1, 1), rr(3, 4.5), rr(2.5, 4), rr(3, 4.5), rr(0, 3), rr(0, 3), 0, sd ? TH.rockA : TH.rockB);
      if((i - i0) % 6 === 0) for(const sd of [-1, 1]) GL.add(G.sm, s.x + s.nx * sd * (Rw - .6), s.y + 4.4, s.z + s.nz * sd * (Rw - .6), .32, .32, .32, 0, 0, 0, TH.lamp);
    }
    for(const i of [i0, i1]){
      const s = S[i % N], ry = Math.atan2(s.tx, s.tz);
      M.add(new THREE.TorusGeometry(Rw + .2, 1.1, 6, 14, Math.PI), s.x, s.y - .3, s.z, 1, Rh / Rw, 1.3, 0, ry, 0, TH.rockB);
    }
    if(TH.vines) for(let i = i0; i <= i1; i += 3){ const s = S[i % N]; for(const sd of [-1, 1]) M.add(G.box, s.x + s.nx * sd * (Rw - .3), s.y + 4, s.z + s.nz * sd * (Rw - .3), .12, rr(2, 4.5), .5, 0, Math.atan2(s.tx, s.tz), 0, 0x4e9a3a); }
    root.add(new THREE.Mesh(M.geometry(), lam()));
    root.add(new THREE.Mesh(GL.geometry(), new THREE.MeshBasicMaterial({ vertexColors:true })));
  }

  /* ---------- start arch ---------- */
  {
    const s = S[0], M = new Merge(), ry = Math.atan2(s.tx, s.tz), W = hw + 2.6;
    for(const sd of [-1, 1]){ M.add(G.cyl8, s.x + s.nx * sd * W, s.y + 3.4, s.z + s.nz * sd * W, .55, 6.8, .55, 0, 0, 0, TH.arch); M.add(G.sm, s.x + s.nx * sd * W, s.y + 7.1, s.z + s.nz * sd * W, .8, .8, .8, 0, 0, 0, TH.archB); }
    M.add(G.box, s.x, s.y + 6.6, s.z, W * 2 + .6, 1.5, .5, 0, ry, 0, TH.archB);
    root.add(new THREE.Mesh(M.geometry(), lam()));
    // checkered banner
    const bt = K.canvasTex(256, 32, x => { for(let i = 0; i < 32; i++) for(let j = 0; j < 4; j++){ x.fillStyle = (i + j) % 2 ? '#222' : '#fff'; x.fillRect(i * 8, j * 8, 8, 8); } });
    const bm = new THREE.Mesh(new THREE.PlaneGeometry(W * 2 - .4, 1.1), new THREE.MeshBasicMaterial({ map:bt, side:THREE.DoubleSide }));
    bm.position.set(s.x - s.tx * .27, s.y + 6.6, s.z - s.tz * .27); bm.rotation.y = ry; root.add(bm);
  }

  /* ---------- sky ---------- */
  let sky;
  {
    const g = new THREE.SphereGeometry(700, 24, 16), p = g.attributes.position, cc = new Float32Array(p.count * 3), c = new THREE.Color();
    for(let i = 0; i < p.count; i++){
      const y = p.getY(i) / 700, x = p.getX(i) / 700, z = p.getZ(i) / 700;
      const sunK = Math.max(0, x * TH.sunDir[0] + z * TH.sunDir[1] + y * .2);
      if(y < .02) c.set(TH.sky[0]);
      else if(y < .22) c.set(TH.sky[0]).lerp(new THREE.Color(TH.sky[1]), smooth(.02, .22, y));
      else c.set(TH.sky[1]).lerp(new THREE.Color(TH.sky[2]), smooth(.22, .75, y));
      c.lerp(new THREE.Color(TH.sunCol), Math.pow(sunK, 6) * .55 * (1 - smooth(.1, .6, y)));
      cc[i * 3] = c.r; cc[i * 3 + 1] = c.g; cc[i * 3 + 2] = c.b;
    }
    g.setAttribute('color', new THREE.BufferAttribute(cc, 3));
    sky = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors:true, side:THREE.BackSide, fog:false, depthWrite:false }));
    sky.renderOrder = -10; sky.frustumCulled = false; root.add(sky);
    // sun disc + glow
    const sd = new THREE.Vector3(TH.sunDir[0], TH.sunY, TH.sunDir[1]).normalize();
    const sunM = new THREE.Sprite(new THREE.SpriteMaterial({ map:K.glowTex, color:TH.sunCol, fog:false, depthWrite:false, transparent:true }));
    sunM.scale.set(TH.sunSize * 3.2, TH.sunSize * 3.2, 1); sunM.position.copy(sd).multiplyScalar(640); sky.add(sunM);
    const disc = new THREE.Mesh(new THREE.CircleGeometry(TH.sunSize * .5, 28), new THREE.MeshBasicMaterial({ color:TH.sunDisc, fog:false, depthWrite:false }));
    disc.position.copy(sd).multiplyScalar(630); disc.lookAt(0, 0, 0); sky.add(disc);
    // clouds: soft flat puffs
    const CM = new Merge();
    for(let i = 0; i < 16; i++){
      const a = rnd() * Math.PI * 2, r = 520, y = rr(70, 190), x = Math.cos(a) * r, z = Math.sin(a) * r;
      for(let k = 0; k < 4; k++) CM.add(G.sm, x + rr(-30, 30), y + rr(-4, 6), z + rr(-30, 30), rr(28, 46), rr(7, 11), rr(18, 28), 0, a, 0, TH.cloud);
    }
    const cl = new THREE.Mesh(CM.geometry(), new THREE.MeshBasicMaterial({ vertexColors:true, fog:false, transparent:true, opacity:.8, depthWrite:false }));
    cl.renderOrder = -9; sky.add(cl);
  }

  /* ---------- scenery ---------- */
  const anim = [];
  const ctx = { THREE, K, G, Merge, root, rr, rnd, free, roadDist, waterDist, groundH, S, N, hw, at, OUTER, inside, lam, anim, col, SC, WATER_Y, def };
  TH.scenery(ctx);

  /* mini-map outline (normalised to 0..1) */
  let mnx = 1e9, mxx = -1e9, mnz = 1e9, mxz = -1e9;
  for(const s of S){ mnx = Math.min(mnx, s.x); mxx = Math.max(mxx, s.x); mnz = Math.min(mnz, s.z); mxz = Math.max(mxz, s.z); }
  const span = Math.max(mxx - mnx, mxz - mnz) * 1.08, cx0 = (mnx + mxx) / 2, cz0 = (mnz + mxz) / 2;
  const toMap = (x, z) => [.5 + (x - cx0) / span, .5 + (z - cz0) / span];

  let wt = 0;
  return {
    def, root, S, N, LEN, segLen, hw, lim, SC, OUTER, WATER_Y, PADS, TH,
    query, at, groundH, waterDist, toMap, sky, solids,
    fog:TH.fog, hemi:TH.hemi, sunLight:TH.sunLight, sunPos:TH.sunPos,
    update(dt, t){ wt += dt; water.position.y = WATER_Y + Math.sin(wt * 1.3) * .06; for(const a of anim) a(dt, t); }
  };
}

/* ======================================================================
   Themes
   ====================================================================== */
const smoothT = (a, b, v) => { const t = Math.max(0, Math.min(1, (v - a) / (b - a))); return t * t * (3 - 2 * t); };
/* geometry for walls is built lazily (needs THREE) */
let WALLGEO = null;
function wallGeo(THREE, K){
  if(WALLGEO) return WALLGEO;
  const { Merge, G } = K;
  const mk = f => { const M = new Merge(); f(M); return M.geometry(); };
  WALLGEO = {
    stake:mk(M => { M.add(G.cyl8, 0, 1.1, 0, .22, 2.2, .22, 0, 0, 0, 0xa8743f); M.add(G.cone, 0, 2.45, 0, .23, .5, .23, 0, 0, 0, 0xc48a4e); M.add(G.box, 0, .5, 0, .46, .12, .46, 0, 0, 0, 0x7a5129); }),
    wpost:mk(M => { M.add(G.box, 0, .65, 0, .3, 1.3, .3, 0, 0, 0, 0x9a6a3a); M.add(G.box, 0, 1.33, 0, .38, .08, .38, 0, 0, 0, 0x7a5129); }),
    wrail:mk(M => { M.add(G.box, 0, 1.0, 0, .14, .16, 1.02, 0, 0, 0, 0xc48a4e); M.add(G.box, 0, .55, 0, .14, .16, 1.02, 0, 0, 0, 0xb17a42); }),
    log:mk(M => { M.add(G.cyl8, 0, .75, 0, .32, 1.5, .32, 0, 0, 0, 0x7a5129); M.add(G.cyl8, 0, 1.52, 0, .33, .06, .33, 0, 0, 0, 0xd9b27a); M.add(G.sm, .2, 1.2, 0, .3, .2, .3, 0, 0, 0, 0x4e9a3a); }),
    lograil:mk(M => { M.add(G.cyl8, 0, .9, 0, .2, 1.02, .2, Math.PI / 2, 0, 0, 0x8a5a30); }),
    bank:mk(M => { M.add(G.sm, 0, .1, 0, 1.3, .9, 1.6, 0, 0, 0, 0xf6fbff); M.add(G.sm, .3, .5, .4, .7, .55, .8, 0, 0, 0, 0xffffff); }),
    pole:mk(M => { for(let k = 0; k < 4; k++) M.add(G.cyl8, 0, .3 + k * .6, 0, .1, .6, .1, 0, 0, 0, k % 2 ? 0xffffff : 0xe8304f); }),
    cane:mk(M => { for(let k = 0; k < 5; k++) M.add(G.cyl8, 0, .2 + k * .4, 0, .16, .4, .16, 0, 0, 0, k % 2 ? 0xffffff : 0xff3d6e); M.add(new THREE.TorusGeometry(.32, .16, 6, 10, Math.PI), .32, 2.0, 0, 1, 1, 1, 0, 0, 0, 0xff3d6e); }),
    candyrail:mk(M => { M.add(G.box, 0, 1.1, 0, .18, .18, 1.02, 0, 0, 0, 0xffb3d9); M.add(G.box, 0, .6, 0, .18, .18, 1.02, 0, 0, 0, 0xfff0a8); }),
    rock:mk(M => { M.add(G.dode, 0, .5, 0, 1.1, .9, 1.3, 0, 0, 0, 0xc98d5a); M.add(G.dode, .4, 1.1, .2, .6, .5, .7, .5, .3, 0, 0xd9a06a); })
  };
  return WALLGEO;
}

/* palm tree, jungle tree, pine, lollipop … as single geometries for instancing */
function treeGeo(THREE, K, kind){
  const { Merge, G } = K, M = new Merge();
  if(kind === 'palm'){
    let x = 0, y = 0;
    for(let k = 0; k < 7; k++){ M.add(G.cyl8, x, y + .55, 0, .34 - k * .025, 1.15, .34 - k * .025, 0, 0, -.06 - k * .02, k % 2 ? 0x9a6a3a : 0xb07c46); x += .05 + k * .03; y += 1.1; }
    for(let k = 0; k < 7; k++){ const a = k / 7 * Math.PI * 2; M.add(G.box, x + Math.cos(a) * 1.5, y + .15 - .3, Math.sin(a) * 1.5, 3.2, .1, .8, 0, -a, -.35, k % 2 ? 0x3faa3f : 0x56c04a); M.add(G.box, x + Math.cos(a) * 2.9, y - .45, Math.sin(a) * 2.9, 1.2, .08, .6, 0, -a, -.8, 0x3a9a3a); }
    for(let k = 0; k < 3; k++){ const a = k * 2.1; M.add(G.ico, x + Math.cos(a) * .35, y - .25, Math.sin(a) * .35, .28, .28, .28, 0, 0, 0, 0x7a5a2a); }
  } else if(kind === 'jtree'){
    M.add(G.cyl8, 0, 3, 0, .9, 6, .9, 0, 0, 0, 0x7a5129); M.add(G.cone, 0, .4, 0, 1.6, 1.2, 1.6, 0, 0, 0, 0x6a4523);
    for(const [x, y, z, s, c] of [[0, 7, 0, 3.6, 0x3e9a3a], [1.8, 6.2, .8, 2.4, 0x52b048], [-1.7, 6.4, -.6, 2.6, 0x2f8a34], [.3, 8.4, -.5, 2.3, 0x5cbf50]]) M.add(G.ico1, x, y, z, s, s * .8, s, 0, 0, 0, c);
  } else if(kind === 'bush'){
    for(const [x, z, s, c] of [[0, 0, 1.3, 0x3e9a3a], [1, .4, .9, 0x56b44a], [-.9, .3, 1, 0x2f8a34]]) M.add(G.ico1, x, s * .6, z, s, s * .8, s, 0, 0, 0, c);
    M.add(G.sm, .5, 1.3, .6, .22, .22, .22, 0, 0, 0, 0xff5a7a); M.add(G.sm, -.6, 1.1, .7, .2, .2, .2, 0, 0, 0, 0xffd23f);
  } else if(kind === 'pine'){
    M.add(G.cyl8, 0, 1, 0, .4, 2, .4, 0, 0, 0, 0x7a5129);
    for(let k = 0; k < 4; k++){ M.add(G.cone, 0, 2.2 + k * 1.6, 0, 2.8 - k * .6, 2.6, 2.8 - k * .6, 0, k * .4, 0, k % 2 ? 0x2f7a4a : 0x3a8a55); M.add(G.cone, 0, 2.55 + k * 1.6, 0, 2.2 - k * .5, 1.5, 2.2 - k * .5, 0, k * .4, 0, 0xf6fbff); }
  } else if(kind === 'lolly'){
    M.add(G.cyl8, 0, 2.5, 0, .2, 5, .2, 0, 0, 0, 0xffffff);
    const cols = [0xff4f8b, 0xffffff, 0xffc23d, 0xffffff, 0x5ed6a0, 0xffffff];
    for(let k = 0; k < 6; k++) M.add(G.cyl, 0, 6.2, 0, 2.2 - k * .36, .5 + k * .002, 2.2 - k * .36, Math.PI / 2, 0, 0, cols[k]);
  } else if(kind === 'gum'){
    M.add(G.sph, 0, 0, 0, 1.2, 1.2, 1.2, 0, 0, 0, 0xffffff);
  }
  return M.geometry();
}

function instanced(ctx, geo, list, colors){
  const { THREE, root } = ctx;
  const mat = new THREE.MeshLambertMaterial({ vertexColors:true });
  const im = new THREE.InstancedMesh(geo, mat, Math.max(1, list.length)); im.count = list.length;
  const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), c = new THREE.Color();
  list.forEach((t, i) => { _m.compose(_p.set(t.x, t.y, t.z), _q.setFromEuler(_e.set(t.rx || 0, t.r || 0, t.rz || 0)), _s.set(t.s, t.sy || t.s, t.s)); im.setMatrixAt(i, _m); if(colors){ im.setColorAt(i, c.set(t.c)); } });
  if(colors && im.instanceColor) im.instanceColor.needsUpdate = true;
  root.add(im); return im;
}
/* scatter n things on free ground (away from the road), with a test */
function scatter(ctx, n, r, test, tries = 30){
  const out = [];
  for(let i = 0; i < n; i++){
    for(let k = 0; k < tries; k++){
      const x = ctx.rr(-215, 215), z = ctx.rr(-215, 215);
      if(!ctx.free(x, z, r) || (test && !test(x, z))) continue;
      if(out.some(o => Math.hypot(o.x - x, o.z - z) < r * 1.6)) continue;
      out.push({ x, z, y:ctx.groundH(x, z) }); break;
    }
  }
  return out;
}
/* along the road, just outside the fence */
function roadside(ctx, every, off, prob, test){
  const out = [];
  for(let i = 0; i < ctx.N; i += every){
    const s = ctx.S[i];
    for(const sd of [-1, 1]){
      if(ctx.rnd() > prob) continue;
      const o = ctx.hw + off + ctx.rr(0, 6), x = s.x + s.nx * sd * o, z = s.z + s.nz * sd * o;
      if(!ctx.free(x, z, 1.2) || (test && !test(x, z, sd))) continue;
      out.push({ x, z, y:ctx.groundH(x, z), sd, h:Math.atan2(s.tx, s.tz) });
    }
  }
  return out;
}

const THEMES = {
  /* ---------------- sunset beach ---------------- */
  beach:{
    sky:[0xffb46a, 0xf06a92, 0x5a3c9c], sunCol:0xffc070, sunDisc:0xfff0c0, sunDir:[0, 1], sunY:.07, sunSize:120, cloud:0xffb0c8,
    fog:0xf49a8c, fogNear:160, fogFar:560, hemi:[0xffd0e0, 0xc98a5a, 1.6], sunLight:[0xffc79a, 2.0], sunPos:[-30, 40, 120],
    water:0x3ab6c8, waterE:0x0c2a3a, far:0x2f9fb8, farY:-.6,
    road:0xe7c48e, roadB:0xd2a46a, dash:0xfff3d8, curbA:0xe8483f, curbB:0xffffff, shoulder:0x7cbf4c,
    rockA:0xd98c55, rockB:0xb86e40, lamp:0xffd27a, arch:0x9a6a3a, archB:0xe8483f,
    outerWall:(x, z) => (z > 30 || x < -96) ? 'stake' : 'wood', innerWall:'wood', scWall:'wood',
    walls:null,
    terrain(x, z, noise){
      // the sea to the south (+z) and the west, cliffs to the north and the east
      let h = noise(x, z) * 1.2 + 1;
      const sea = Math.max(smoothT(80, 104, z), smoothT(-128, -150, x) * smoothT(-20, 20, z));
      h = h * (1 - sea) - 4.5 * sea;
      const cliff = Math.max(smoothT(-90, -128, z), smoothT(128, 150, x) * smoothT(60, 0, z));
      h += cliff * (16 + noise(x * 1.7, z * 1.7) * 6);
      return h;
    },
    ground(c, x, z, h, rd, noise, wd){
      if(h < -.3) c.set(0xd8b47a).lerp(new THREE_C(0x7ecfc8), smoothT(-.3, -3, h));
      else if(h > 6) c.set(Math.sin(h * 1.3) > 0 ? 0xd98c55 : 0xc27548);
      else { c.set(0xf2d6a0); const g = noise(x * 1.9 + 7, z * 1.9) + (rd < 8 ? .2 : 0); if(g > .55 && z < 70) c.lerp(new THREE_C(0x86c252), smoothT(.55, .8, g)); if(h < .4 && z > 70) c.lerp(new THREE_C(0xe2bf86), .6); }
    },
    scenery(ctx){ beachScenery(ctx); }
  },
  /* ---------------- jungle temple ---------------- */
  jungle:{
    sky:[0xd8f5d0, 0x8fd0f0, 0x3d8ad8], sunCol:0xfff6c8, sunDisc:0xffffff, sunDir:[-.6, -.8], sunY:.55, sunSize:60, cloud:0xffffff,
    fog:0xb8e2c0, fogNear:140, fogFar:520, hemi:[0xe0f6ff, 0x5a8a3a, 1.7], sunLight:[0xfff2d0, 2.1], sunPos:[-60, 90, -60],
    water:0x3aa6a0, waterE:0x072a22, far:0x3e8a3a, farY:0,
    road:0xc08a56, roadB:0xa87442, dash:0xe8d0a8, curbA:0xf2c14e, curbB:0x6a4523, shoulder:0x4e9a3a,
    rockA:0x8a8a7a, rockB:0x6e6e60, lamp:0xffc85a, arch:0x8a8a7a, archB:0x4e9a3a, vines:true,
    outerWall:'log', innerWall:'log', scWall:'log',
    terrain(x, z, noise){ const r = Math.hypot(x, z); return noise(x, z) * 2 + 1 + smoothT(150, 220, r) * 14; },
    ground(c, x, z, h, rd, noise){ c.set(0x5aa845); const g = noise(x * 2.1, z * 2.1); if(g > .4) c.lerp(new THREE_C(0x3e8a36), .7); if(g < -.6) c.lerp(new THREE_C(0x8cc65a), .5); if(h < -.3) c.set(0x6a7a4a); if(rd < 4) c.lerp(new THREE_C(0x9a7a4a), .4); },
    scenery(ctx){ jungleScenery(ctx); }
  },
  /* ---------------- snowy mountain ---------------- */
  snow:{
    sky:[0xeaf4ff, 0xa8d0f8, 0x4f8fe0], sunCol:0xfff8e0, sunDisc:0xffffff, sunDir:[.7, -.7], sunY:.45, sunSize:60, cloud:0xffffff,
    fog:0xdfeaf8, fogNear:130, fogFar:500, hemi:[0xeaf4ff, 0x9ab0d0, 1.7], sunLight:[0xfffaf0, 2.0], sunPos:[80, 80, -60],
    water:0x6fd0f0, waterE:0x0a2a40, far:0xeef5ff, farY:0,
    road:0xc4d2e4, roadB:0xaebfd6, dash:0xffffff, curbA:0xe8304f, curbB:0xffffff, shoulder:0xf2f7ff,
    rockA:0x9fd8f5, rockB:0x6fb8e6, lamp:0xbff0ff, arch:0x6a7aa0, archB:0xe8304f,
    outerWall:'bank', innerWall:'bank', scWall:'pole',
    terrain(x, z, noise){ const r = Math.hypot(x, z); return noise(x, z) * 2.5 + 1.5 + smoothT(140, 220, r) * 22; },
    ground(c, x, z, h, rd, noise){ c.set(0xf4f8ff); const g = noise(x * 2, z * 2); if(g > .5) c.lerp(new THREE_C(0xd6e4f6), .7); if(h > 12) c.lerp(new THREE_C(0xc9d8ee), .5); if(h < -.3) c.set(0x8ad0ee); },
    scenery(ctx){ snowScenery(ctx); }
  },
  /* ---------------- candy land ---------------- */
  candy:{
    sky:[0xffe2f0, 0xffb8dc, 0xa98cff], sunCol:0xfff0f8, sunDisc:0xffffff, sunDir:[-.7, .7], sunY:.4, sunSize:70, cloud:0xffe6f4,
    fog:0xffd2ea, fogNear:140, fogFar:520, hemi:[0xfff0fa, 0xc890c8, 1.75], sunLight:[0xfff0f6, 1.9], sunPos:[-60, 90, 60],
    water:0xff7fc0, waterE:0x3a0a2a, far:0xbff2da, farY:0,
    road:0x8a5a44, roadB:0x7a4a36, dash:0xfff6e8, curbA:0xffffff, curbB:0xff5a8a, shoulder:0xfff6fa,
    rockA:0xff8fc8, rockB:0xffc2e0, lamp:0xfff08a, arch:0xffffff, archB:0xff5a8a, tunnel:'donut',
    outerWall:'cane', innerWall:'cane', scWall:'cane',
    terrain(x, z, noise){ const r = Math.hypot(x, z); return noise(x, z) * 1.5 + 1 + smoothT(150, 220, r) * 10; },
    ground(c, x, z, h, rd, noise){ const g = noise(x * 1.6, z * 1.6); c.set(g > .2 ? 0xbff2da : 0xffd0e6); if(Math.abs(g - .2) < .06) c.set(0xffffff); if(h < -.3) c.set(0xff9fd0); },
    scenery(ctx){ candyScenery(ctx); }
  }
};
let THREE_C = null;   // THREE.Color, set by setThree()
export function setThree(THREE, K){
  THREE_C = THREE.Color;
  const W = wallGeo(THREE, K);
  THEMES.beach.walls = { stake:{ step:.9 * 2, post:W.stake, jit:true }, wood:{ step:6, post:W.wpost, rail:W.wrail } };
  // stakes: one post every sample (2 m) on the sea side is a bit sparse — the geometry holds two stakes
  THEMES.beach.walls.stake.post = (() => { const M = new K.Merge(); const g = K.G;
    for(const [x, s] of [[0, 1], [.95, .88]]){ M.add(g.cyl8, 0, 1.1 * s, x, .22, 2.2 * s, .22, 0, 0, 0, s < 1 ? 0x9a683a : 0xab7642); M.add(g.cone, 0, 2.2 * s + .25, x, .23, .5, .23, 0, 0, 0, 0xc48a4e); }
    M.add(g.box, 0, 1.5, .5, .16, .18, 2.1, 0, 0, 0, 0x7a5129); M.add(g.box, 0, .55, .5, .16, .18, 2.1, 0, 0, 0, 0x7a5129); return M.geometry(); })();
  THEMES.jungle.walls = { log:{ step:4, post:W.log, rail:W.lograil, jit:true } };
  THEMES.snow.walls = { bank:{ step:4, post:W.bank, jit:true }, pole:{ step:6, post:W.pole } };
  THEMES.candy.walls = { cane:{ step:5, post:W.cane, rail:W.candyrail } };
}

/* ---------------- beach scenery ---------------- */
function beachScenery(ctx){
  const { THREE, K, G, Merge, root, rr, rnd, groundH, S, N, hw, free, anim, lam } = ctx;
  const M = new Merge();
  // palm trees: by the road and on the sand
  const palms = roadside(ctx, 9, 4, .55, (x, z) => groundH(x, z) > -.2 && groundH(x, z) < 5).concat(scatter(ctx, 40, 3, (x, z) => { const h = groundH(x, z); return h > -.1 && h < 5; }));
  instanced(ctx, treeGeo(THREE, K, 'palm'), palms.map(p => ({ x:p.x, y:p.y - .2, z:p.z, r:rr(0, 6.28), s:rr(.9, 1.3) })));
  // tall layered sandstone cliffs (mesas) on the land side: stacks of wide rough discs with stripes and grass tops
  const mesa = (x, z, r, h, grass) => {
    const y0 = groundH(x, z) - 1, layers = Math.max(3, Math.round(h / 3.2));
    for(let k = 0; k < layers; k++){
      const t = k / layers, rad = r * (1 - t * .18) + rr(-.6, .6);
      M.add(G.cyl8, x + rr(-.5, .5), y0 + k * (h / layers) + h / layers / 2, z + rr(-.5, .5), rad, h / layers + .05, rad * rr(.85, 1.1), 0, rr(0, 1), 0, k % 2 ? 0xd98c55 : (k % 3 ? 0xe9a46a : 0xc27548));
    }
    if(grass){ M.add(G.cyl8, x, y0 + h + .25, z, r * .86, .5, r * .86, 0, 0, 0, 0x6db04a); for(let k = 0; k < 3; k++) M.add(G.ico1, x + rr(-r * .5, r * .5), y0 + h + .9, z + rr(-r * .5, r * .5), rr(1, 1.8), .8, rr(1, 1.8), 0, 0, 0, 0x5aa040); }
  };
  for(let i = 0; i < 26; i++){
    let x, z, ok = false;
    for(let k = 0; k < 40 && !ok; k++){ x = rr(-200, 210); z = rr(-210, 20); ok = free(x, z, 14) && (z < -86 || x > 122); }
    if(ok) mesa(x, z, rr(8, 16), rr(16, 34), rnd() < .7);
  }
  // cliffs right behind the tunnel (the road dives through them)
  for(const [u, side] of [[.25, 1.9], [.27, -2], [.31, 1.9], [.3, -2.1]]){ const p = ctx.at(u, side * ctx.OUTER); if(ctx.roadDist(p.x, p.z) > 6) mesa(p.x, p.z, 9, 18, true); }
  // the mushroom rock pillar (grass on top), by the shortcut
  const mush = (x, z, s) => {
    const y = groundH(x, z);
    M.add(G.cyl8, x, y + 1, z, 2.6 * s, 2, 2.6 * s, 0, 0, 0, 0xc27548);
    for(let k = 0; k < 4; k++) M.add(G.cyl8, x, y + 2 + k * 2.2 + 1.1, z, (1.5 - k * .12) * s, 2.25, (1.5 - k * .12) * s, 0, k, 0, k % 2 ? 0xd98c55 : 0xe9a46a);
    M.add(G.cyl8, x, y + 11.6, z, 5.4 * s, 2.6, 5.4 * s, 0, .3, 0, 0xd98c55); M.add(G.cyl8, x, y + 10.1, z, 4.4 * s, .8, 4.4 * s, 0, .1, 0, 0xb86e40);
    M.add(G.cyl8, x, y + 13.05, z, 5.1 * s, .4, 5.1 * s, 0, .3, 0, 0x6db04a); for(let k = 0; k < 4; k++) M.add(G.ico1, x + rr(-3, 3), y + 13.6, z + rr(-3, 3), rr(1.2, 2), .9, rr(1.2, 2), 0, 0, 0, 0x5aa040);
    M.add(G.ico1, x + 2, y + 13.9, z - 1, .9, 1.2, .9, 0, 0, 0, 0x3f8a32);
  };
  mush(-24, -24, 1); mush(-74, -46, .8); mush(56, -14, .9);
  // rocks on the beach + crates by the road + beach umbrellas and towels
  for(const p of scatter(ctx, 30, 2, (x, z) => groundH(x, z) > -1)) M.add(G.dode, p.x, p.y, p.z, rr(1, 2.4), rr(.8, 1.6), rr(1, 2.4), rr(0, 3), rr(0, 3), 0, rnd() < .5 ? 0xc98d5a : 0xb8794a);
  for(const p of roadside(ctx, 9, 3.2, .45, (x, z) => groundH(x, z) > -.2)){
    const n = 1 + Math.floor(rnd() * 3);
    for(let k = 0; k < n; k++){ const s = rr(1, 1.4), ox = rr(-1.2, 1.2), oz = rr(-1.2, 1.2), y = p.y + (k === 2 ? 2.1 : s / 2);
      M.add(G.box, p.x + (k === 2 ? 0 : ox), y, p.z + (k === 2 ? 0 : oz), s, s, s, 0, p.h + rr(-.3, .3), 0, 0xc08a4e);
      M.add(G.box, p.x + (k === 2 ? 0 : ox), y, p.z + (k === 2 ? 0 : oz), s * 1.02, s * .16, s * 1.02, 0, p.h, 0, 0x8a5a30); }
  }
  const umbCols = [0xff5a7a, 0x3aa0ff, 0xffc23d, 0x5ed6a0];
  for(const p of scatter(ctx, 12, 3, (x, z) => z > 76 && groundH(x, z) > -.25 && groundH(x, z) < 1.2)){
    const c = umbCols[Math.floor(rnd() * 4)];
    M.add(G.cyl8, p.x, p.y + 1.4, p.z, .07, 2.8, .07, 0, 0, 0, 0xffffff);
    M.add(G.cone, p.x, p.y + 2.9, p.z, 1.8, .7, 1.8, 0, 0, 0, c); M.add(G.cone, p.x, p.y + 2.92, p.z, 1.0, .5, 1.0, 0, .3, 0, 0xffffff);
    M.add(G.box, p.x + 1.4, p.y + .05, p.z, 1, .06, 2, 0, rr(0, 3), 0, umbCols[(Math.floor(rnd() * 4))]);
  }
  // wooden pier into the sea
  for(let k = 0; k < 10; k++){ M.add(G.box, -10, .45, 80 + k * 1.9, 3.2, .2, 1.8, 0, 0, 0, k % 2 ? 0xb17a42 : 0xc48a4e); if(k % 3 === 0) for(const s of [-1, 1]) M.add(G.cyl8, -10 + s * 1.5, -.5, 80 + k * 1.9, .18, 2.6, .18, 0, 0, 0, 0x7a5129); }
  for(const s of [-1, 1]) M.add(G.cyl8, -10 + s * 1.5, 1.0, 97.5, .2, 1.4, .2, 0, 0, 0, 0x7a5129);   // the mooring posts by the ship
  M.add(G.cyl8, -10, 2.2, 99.2, .05, 2.6, .05, .9, 0, 0, 0xe8d8b0);                                  // a rope to the ship
  // background mesas far to the north (the horizon line)
  for(let i = 0; i < 18; i++){ const a = -Math.PI * .05 - i / 17 * Math.PI * .95, r = rr(300, 380); M.add(G.cyl8, Math.cos(a) * r, rr(10, 25), Math.sin(a) * r, rr(30, 60), rr(30, 70), rr(30, 60), 0, rr(0, 3), 0, i % 2 ? 0xc77a58 : 0xb0684e); }
  // a little lighthouse on the point
  { const x = -150, z = 90, y = groundH(x, z) + .2; for(let k = 0; k < 6; k++) M.add(G.cyl, x, y + 1 + k * 2, z, 2 - k * .15, 2, 2 - k * .15, 0, 0, 0, k % 2 ? 0xe8483f : 0xffffff); M.add(G.cyl8, x, y + 13, z, 1.4, 2, 1.4, 0, 0, 0, 0x3a3a4a); M.add(G.cone, x, y + 14.8, z, 1.8, 1.6, 1.8, 0, 0, 0, 0xe8483f);
    M.add(G.dode, x, y - 1, z, 5, 2.5, 5, 0, 0, 0, 0xb8794a); }
  root.add(new THREE.Mesh(M.geometry(), lam()));
  // the friendly pirate ship in the bay (bobs on the waves)
  const ship = pirateShip(ctx); ship.position.set(-14, -.6, 104); ship.rotation.y = Math.PI / 2 + .25; ship.scale.setScalar(1.2); root.add(ship);
  anim.push((dt, t) => { ship.position.y = -.6 + Math.sin(t * .9) * .25; ship.rotation.x = Math.sin(t * .7) * .03; });
  const ship2 = pirateShip(ctx, true); ship2.position.set(-190, -.6, 150); ship2.rotation.y = .6; ship2.scale.setScalar(.8); root.add(ship2);
  anim.push((dt, t) => { ship2.position.y = -.6 + Math.sin(t * .8 + 1) * .22; ship2.rotation.z = Math.sin(t * .6 + 1) * .04; });
}
function pirateShip(ctx, alt){
  const { THREE, K, G, Merge } = ctx, M = new Merge(), g = new THREE.Group();
  const wood = 0x8a4f2a, woodL = 0xa8653a, trim = alt ? 0x3aa0ff : 0xffc23d;
  // hull: stacked boxes that get narrower to the bottom, a raised back deck, a pointy front
  for(let k = 0; k < 4; k++){ const w = 6.4 - k * .9; M.add(G.box, 0, 1.6 - k * .8, 0, w, .8, 20 - k * 1.6, 0, 0, 0, k === 0 ? woodL : wood); }
  M.add(G.box, 0, 2.15, 0, 6.6, .3, 20.2, 0, 0, 0, trim);
  M.add(G.box, 0, 3.0, -7.2, 6.2, 1.8, 5.6, 0, 0, 0, woodL); M.add(G.box, 0, 3.95, -7.2, 6.5, .25, 5.9, 0, 0, 0, trim);
  M.add(G.cone4, 0, 1.4, 11.6, 3.2, 4.2, 3.2, Math.PI / 2, Math.PI / 4, 0, wood);
  M.add(G.cyl8, 0, 3.2, 12.8, .18, 5, .18, -1.1, 0, 0, woodL);
  for(let k = -3; k <= 3; k++) for(const s of [-1, 1]) M.add(G.cyl8, s * 3.22, 1.2, k * 2.4, .38, .1, .38, 0, 0, Math.PI / 2, 0xffe7a0);
  // masts, sails with stripes, a crow's nest, rope ladders
  for(const [z, h] of [[3, 15], [-3.5, 12.5]]){
    M.add(G.cyl8, 0, 2 + h / 2, z, .32, h, .32, 0, 0, 0, 0x6a3a1e);
    for(const [y, w, hh] of [[2 + h * .45, 7.6, 4.2], [2 + h * .78, 5.6, 3]]){
      M.add(G.box, 0, y, z + .35, w, hh, .14, 0, 0, 0, 0xfff6e6);
      M.add(G.box, 0, y, z + .44, w + .02, hh * .3, .1, 0, 0, 0, alt ? 0x3aa0ff : 0xe8483f);
      M.add(G.cyl8, 0, y + hh / 2, z + .3, .12, w + .6, .12, 0, 0, Math.PI / 2, 0x6a3a1e);
    }
    M.add(G.cyl, 0, 2 + h - 1.5, z, 1, .8, 1, 0, 0, 0, woodL);
  }
  // the flag: a smiling sun on blue (friendly crew!)
  M.add(G.box, 0, 18.2, 3, .06, 1.6, 2.4, 0, 0, 0, alt ? 0xff5a7a : 0x3a6ad8);
  M.add(G.cyl, .05, 18.2, 2.9, .5, .02, .5, 0, 0, Math.PI / 2, 0xffd23f);
  for(const s of [-1, 1]) M.add(G.box, .08, 18.35, 2.9 + s * .17, .02, .1, .07, 0, 0, 0, 0x222222);
  M.add(G.box, .08, 18.05, 2.9, .02, .06, .26, 0, 0, 0, 0x222222);
  // barrels and a treasure chest on deck, round life rings on the sides
  for(const [x, z] of [[1.6, -1], [-1.8, 6], [1.9, 7.2]]) M.add(G.cyl8, x, 2.85, z, .55, 1.1, .55, 0, 0, 0, 0x9a6a3a);
  M.add(G.box, -1.2, 2.75, -1.5, 1.4, .9, 1, 0, .3, 0, 0x8a4f2a); M.add(G.box, -1.2, 3.25, -1.5, 1.45, .2, 1.05, 0, .3, 0, 0xffc23d);
  for(const s of [-1, 1]) M.add(G.torus, s * 3.3, 2.6, 4, .6, .6, .6, 0, Math.PI / 2, 0, 0xff5a5a);
  // windows on the back
  for(const x of [-1.6, 0, 1.6]) M.add(G.box, x, 3.1, -10.05, .9, .9, .1, 0, 0, 0, 0xffe7a0);
  const m = new THREE.Mesh(M.geometry(), new THREE.MeshLambertMaterial({ vertexColors:true })); g.add(m);
  return g;
}

/* ---------------- jungle scenery ---------------- */
function jungleScenery(ctx){
  const { THREE, K, G, Merge, root, rr, rnd, groundH, free, lam } = ctx;
  const M = new Merge();
  const trees = roadside(ctx, 7, 4, .6).concat(scatter(ctx, 90, 4));
  instanced(ctx, treeGeo(THREE, K, 'jtree'), trees.map(p => ({ x:p.x, y:p.y - .2, z:p.z, r:rr(0, 6.28), s:rr(.9, 1.5) })));
  instanced(ctx, treeGeo(THREE, K, 'bush'), roadside(ctx, 4, 2, .5).map(p => ({ x:p.x, y:p.y, z:p.z, r:rr(0, 6.28), s:rr(.7, 1.2) })));
  // the stepped temple next to the shortcut
  const temple = (x, z, base, steps) => {
    const y0 = groundH(x, z) - .5;
    for(let k = 0; k < steps; k++){ const w = base - k * (base / (steps + 1.5)); M.add(G.box, x, y0 + k * 2.2 + 1.1, z, w, 2.2, w, 0, 0, 0, k % 2 ? 0x9a9a88 : 0x8a8a7a); M.add(G.box, x, y0 + k * 2.2 + 2.15, z, w + .3, .2, w + .3, 0, 0, 0, 0x5aa040); }
    const top = y0 + steps * 2.2, tw = base - steps * (base / (steps + 1.5));
    M.add(G.box, x, top + 2, z, tw * .7, 4, tw * .7, 0, 0, 0, 0x7a7a6a); M.add(G.box, x, top + 4.2, z, tw * .8, .5, tw * .8, 0, 0, 0, 0x6e6e60);
    M.add(G.box, x, top + 1.6, z + tw * .35 + .01, tw * .3, 2.6, .2, 0, 0, 0, 0x2a2a22);
    // the stairs on the front
    for(let k = 0; k < steps * 2; k++) M.add(G.box, x, y0 + k * 1.1 + .55, z + base / 2 - k * (base / (steps + 1.5)) / 2 + .6, base * .22, 1.1, 1.4, 0, 0, 0, 0xa8a898);
    // a big friendly stone face
    M.add(G.box, x - base / 2 - .1, y0 + 4, z, .4, 3, 3, 0, 0, 0, 0x7a7a6a); for(const s of [-1, 1]) M.add(G.box, x - base / 2 - .35, y0 + 4.6, z + s * .7, .15, .5, .5, 0, 0, 0, 0x2a2a22); M.add(G.box, x - base / 2 - .35, y0 + 3.3, z, .15, .25, 1.4, 0, 0, 0, 0x2a2a22);
  };
  temple(-34, -72, 26, 4); temple(150, -120, 40, 6); temple(-170, 120, 30, 5);
  // stone pillars, heads and ruins
  for(const p of scatter(ctx, 18, 3)){ const h = rr(4, 9); M.add(G.box, p.x, p.y + h / 2, p.z, 1.6, h, 1.6, 0, rr(0, 1), rr(-.08, .08), 0x9a9a88); M.add(G.box, p.x, p.y + h + .3, p.z, 2.1, .6, 2.1, 0, 0, 0, 0x5aa040); }
  for(const p of scatter(ctx, 30, 2)) M.add(G.dode, p.x, p.y, p.z, rr(1, 2.2), rr(.8, 1.6), rr(1, 2.2), rr(0, 3), rr(0, 3), 0, 0x8a8a7a);
  // flowers
  for(const p of scatter(ctx, 60, 1)) M.add(G.sm, p.x, p.y + .4, p.z, .4, .3, .4, 0, 0, 0, [0xff5a7a, 0xffd23f, 0xff8fd0, 0xffffff][Math.floor(rnd() * 4)]);
  // distant green hills
  for(let i = 0; i < 26; i++){ const a = i / 26 * Math.PI * 2, r = rr(300, 380); M.add(G.sph, Math.cos(a) * r, -10, Math.sin(a) * r, rr(40, 70), rr(40, 80), rr(40, 70), 0, 0, 0, i % 2 ? 0x3e8a3a : 0x4e9a44); }
  // a waterfall at the end of the river
  { const x = 150, z = -14, y = groundH(x, z); M.add(G.box, x + 8, y + 8, z, 6, 18, 18, 0, 0, 0, 0x7a7a6a); const wf = new THREE.Mesh(new THREE.PlaneGeometry(10, 16), new THREE.MeshBasicMaterial({ color:0xbff3ff, transparent:true, opacity:.75 })); wf.position.set(x + 4.9, y + 7, z); wf.rotation.y = -Math.PI / 2; root.add(wf); }
  root.add(new THREE.Mesh(M.geometry(), lam()));
  // butterflies / fireflies: small glowing dots
  const fl = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(Array.from({ length:240 }, (_, i) => i % 3 === 1 ? rr(1, 6) : rr(-150, 150)), 3)), new THREE.PointsMaterial({ color:0xfff6a0, size:.5 }));
  root.add(fl);
}

/* ---------------- snow scenery ---------------- */
function snowScenery(ctx){
  const { THREE, K, G, Merge, root, rr, rnd, groundH, lam, anim } = ctx;
  const M = new Merge();
  const pines = roadside(ctx, 6, 4, .6).concat(scatter(ctx, 110, 3));
  instanced(ctx, treeGeo(THREE, K, 'pine'), pines.map(p => ({ x:p.x, y:p.y - .2, z:p.z, r:rr(0, 6.28), s:rr(.8, 1.5) })));
  // snowmen with scarves and carrot noses
  for(const p of roadside(ctx, 29, 3, .6)){
    const y = p.y, c = [0xe8304f, 0x3aa0ff, 0x35c76f, 0xffc23d][Math.floor(rnd() * 4)];
    M.add(G.sph, p.x, y + 1, p.z, 1.2, 1.1, 1.2, 0, 0, 0, 0xffffff); M.add(G.sph, p.x, y + 2.5, p.z, .85, .8, .85, 0, 0, 0, 0xffffff); M.add(G.sph, p.x, y + 3.6, p.z, .6, .6, .6, 0, 0, 0, 0xffffff);
    M.add(G.cyl, p.x, y + 3.15, p.z, .62, .2, .62, 0, 0, 0, c); M.add(G.cyl, p.x, y + 4.2, p.z, .45, .6, .45, 0, 0, 0, 0x2a2a3a); M.add(G.cyl, p.x, y + 3.95, p.z, .65, .08, .65, 0, 0, 0, 0x2a2a3a);
    const fx = Math.sin(p.h + Math.PI / 2 * p.sd) , fz = Math.cos(p.h + Math.PI / 2 * p.sd);
    M.add(G.cone, p.x - fx * .7, y + 3.6, p.z - fz * .7, .1, .6, .1, 0, 0, 0, 0xff8a2a);
    for(const s of [-1, 1]) M.add(G.sm, p.x - fx * .55 + fz * s * .2, y + 3.8, p.z - fz * .55 - fx * s * .2, .07, .07, .07, 0, 0, 0, 0x222222);
  }
  // ice crystals, igloos, a cabin
  for(const p of scatter(ctx, 16, 3)){ for(let k = 0; k < 3; k++) M.add(G.cone4, p.x + rr(-1, 1), p.y + 1.5, p.z + rr(-1, 1), rr(.5, .9), rr(3, 5), rr(.5, .9), rr(-.3, .3), rr(0, 1), rr(-.3, .3), 0x9fe0ff); }
  for(const p of scatter(ctx, 4, 6)){ M.add(G.hemi, p.x, p.y - .2, p.z, 3.4, 3, 3.4, 0, 0, 0, 0xf4faff); M.add(G.box, p.x + 3.2, p.y + .8, p.z, 1.6, 1.6, 1.6, 0, 0, 0, 0xe6f0fa); M.add(G.box, p.x + 4, p.y + .8, p.z, .2, 1.2, 1.1, 0, 0, 0, 0x3a4a6a); }
  for(const p of scatter(ctx, 3, 7)){ M.add(G.box, p.x, p.y + 2, p.z, 7, 4, 6, 0, 0, 0, 0x9a5a3a); M.add(G.cone4, p.x, p.y + 5.5, p.z, 6, 3, 5, 0, Math.PI / 4, 0, 0xffffff); M.add(G.box, p.x + 3.55, p.y + 2, p.z, .1, 1.4, 1.4, 0, 0, 0, 0xffe08a); M.add(G.box, p.x, p.y + 6, p.z + 1.5, .9, 2, .9, 0, 0, 0, 0x7a7a8a); }
  // the big mountains all around
  for(let i = 0; i < 22; i++){ const a = i / 22 * Math.PI * 2 + rr(-.1, .1), r = rr(290, 380), h = rr(90, 170), w = rr(60, 100), x = Math.cos(a) * r, z = Math.sin(a) * r;
    M.add(G.cone, x, h / 2 - 10, z, w, h, w, 0, rr(0, 3), 0, i % 2 ? 0x8fa6c8 : 0x7f98bf); M.add(G.cone, x, h - 10 - h * .2 + .5, z, w * .4, h * .4, w * .4, 0, rr(0, 3), 0, 0xffffff); }
  root.add(new THREE.Mesh(M.geometry(), lam()));
  // gentle snowfall around the camera (moved by the game)
  const n = 500, pos = new Float32Array(n * 3); for(let i = 0; i < n; i++){ pos[i * 3] = rr(-60, 60); pos[i * 3 + 1] = rr(0, 40); pos[i * 3 + 2] = rr(-60, 60); }
  const snow = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(pos, 3)), new THREE.PointsMaterial({ color:0xffffff, size:.35, transparent:true, opacity:.9 }));
  snow.frustumCulled = false; snow.name = 'snowfall'; root.add(snow);
  anim.push(dt => { for(let i = 0; i < n; i++){ pos[i * 3 + 1] -= dt * 3; pos[i * 3] += Math.sin(i + pos[i * 3 + 1] * .2) * dt * .6; if(pos[i * 3 + 1] < 0) pos[i * 3 + 1] += 40; } snow.geometry.attributes.position.needsUpdate = true; });
  root.userData.snow = snow;
}

/* ---------------- candy scenery ---------------- */
function candyScenery(ctx){
  const { THREE, K, G, Merge, root, rr, rnd, groundH, lam } = ctx;
  const M = new Merge();
  const lol = roadside(ctx, 8, 4, .55).concat(scatter(ctx, 50, 3));
  const lolC = [0xff4f8b, 0x5ed6a0, 0x6cc4ff, 0xffc23d, 0xc77dff];
  instanced(ctx, treeGeo(THREE, K, 'lolly'), lol.map(p => ({ x:p.x, y:p.y - .2, z:p.z, r:rr(0, 6.28), s:rr(.8, 1.3) })));
  instanced(ctx, (() => { const g = new THREE.SphereGeometry(1, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2); const c = new Float32Array(g.attributes.position.count * 3).fill(1); g.setAttribute('color', new THREE.BufferAttribute(c, 3)); return g; })(),
    scatter(ctx, 70, 1.5).map(p => ({ x:p.x, y:p.y - .1, z:p.z, s:rr(.8, 1.8), sy:rr(1, 1.6), c:lolC[Math.floor(rnd() * 5)] })), true);
  // giant cupcakes, donuts, ice creams, toy blocks
  const cup = (x, z, s) => { const y = groundH(x, z) - .2; const c = lolC[Math.floor(rnd() * 5)];
    M.add(G.cyl, x, y + 2 * s, z, 3.4 * s, 4 * s, 2.6 * s, 0, 0, 0, 0xf6c48a); for(let k = 0; k < 10; k++){ const a = k / 10 * Math.PI * 2; M.add(G.box, x + Math.cos(a) * 3.05 * s, y + 2 * s, z + Math.sin(a) * 3.05 * s, .3 * s, 4 * s, .5 * s, 0, -a, 0, 0xe8a86a); }
    M.add(G.sph, x, y + 4.6 * s, z, 3.8 * s, 1.8 * s, 3.8 * s, 0, 0, 0, c); M.add(G.sph, x, y + 5.9 * s, z, 2.6 * s, 1.4 * s, 2.6 * s, 0, 0, 0, c); M.add(G.sph, x, y + 7.2 * s, z, .8 * s, .8 * s, .8 * s, 0, 0, 0, 0xe8304f);
    for(let k = 0; k < 8; k++) M.add(G.box, x + rr(-2.5, 2.5) * s, y + 5.4 * s + rr(0, 1) * s, z + rr(-2.5, 2.5) * s, .14 * s, .14 * s, .5 * s, rr(0, 3), rr(0, 3), 0, lolC[k % 5]); };
  for(const p of scatter(ctx, 12, 8)) cup(p.x, p.z, rr(1, 1.6));
  for(const p of scatter(ctx, 10, 6)){ const s = rr(1.5, 2.6); M.add(new THREE.TorusGeometry(2.2 * s, 1 * s, 10, 22), p.x, p.y + 1.2 * s, p.z, 1, .7, 1, Math.PI / 2, 0, 0, 0xf0b070); M.add(new THREE.TorusGeometry(2.2 * s, 1.02 * s, 10, 22), p.x, p.y + 1.5 * s, p.z, 1, .5, 1, Math.PI / 2, 0, 0, lolC[Math.floor(rnd() * 5)]); }
  for(const p of scatter(ctx, 10, 4)){ M.add(G.cone, p.x, p.y + 2.5, p.z, 1.6, 5, 1.6, Math.PI, 0, 0, 0xf0b070); M.add(G.sph, p.x, p.y + 5.6, p.z, 1.9, 1.9, 1.9, 0, 0, 0, [0xfff0f6, 0xffa0c8, 0x9a5a3a][Math.floor(rnd() * 3)]); M.add(G.sph, p.x, p.y + 7.2, p.z, .5, .5, .5, 0, 0, 0, 0xe8304f); }
  for(const p of scatter(ctx, 16, 3)){ for(let k = 0; k < 3; k++){ const s = 2.2; M.add(G.box, p.x + (k === 2 ? 1.1 : k * 2.3), p.y + (k === 2 ? s * 1.5 : s / 2), p.z, s, s, s, 0, .2, 0, lolC[(k + Math.floor(rnd() * 5)) % 5]); } }
  // cotton candy hills far away
  for(let i = 0; i < 26; i++){ const a = i / 26 * Math.PI * 2, r = rr(290, 380); M.add(G.sph, Math.cos(a) * r, -8, Math.sin(a) * r, rr(40, 70), rr(40, 75), rr(40, 70), 0, 0, 0, [0xffb8dc, 0xc8b0ff, 0xa8e8ff][i % 3]); }
  root.add(new THREE.Mesh(M.geometry(), lam()));
}
