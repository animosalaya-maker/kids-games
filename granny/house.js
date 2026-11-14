/* Grandma Nona's House: the two-floor cartoon house (plus a basement and an attic), built once from data.
   Static geometry is merged by material, colours are baked per vertex (corner darkening + warm lamp pools),
   collisions are axis-aligned boxes with a height range, stairs are ramps, and the grandma walks a portal graph. */
import { makeTextures } from './textures.js';

export const LY = [-3.2, 0, 3.2, 6.4];          // floor height of: basement, ground floor, upper floor, attic
const WH = 3.0, WT = .2;

export function buildHouse(THREE, K, scene, renderer){
  const L = window.L || (a => a);
  const TX = makeTextures(THREE, Math.min(8, renderer.capabilities.getMaxAnisotropy()));
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  const ss = (a, b, v) => { const t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _s = new THREE.Vector3(), _v = new THREE.Vector3(), _c = new THREE.Color();
  const GEO = {
    box:new THREE.BoxGeometry(1, 1, 1), cyl:new THREE.CylinderGeometry(1, 1, 1, 20), cyl8:new THREE.CylinderGeometry(1, 1, 1, 10), cone:new THREE.CylinderGeometry(.55, 1, 1, 20, 1, true),
    sph:new THREE.SphereGeometry(1, 18, 12), sm:new THREE.SphereGeometry(1, 10, 7), torus:new THREE.TorusGeometry(1, .22, 8, 18), hemi:new THREE.SphereGeometry(1, 18, 8, 0, Math.PI * 2, 0, Math.PI / 2),
    rbox:roundBox(THREE)
  };

  /* ---------------- rooms, stairs ---------------- */
  const ROOMS = [
    { id:'living',   lv:1, x0:-10, x1:-2, z0:-7, z1:7, floor:'wood',     wall:0xffdcae, lit:1.0, c:[-4.2, -1.8], name:L('غرفة القعدة', 'Living room', 'Oturma odası') },
    { id:'hall',     lv:1, x0:-2,  x1:3,  z0:-7, z1:7, floor:'tile',     wall:0xcdecd9, lit:1.0, c:[.5, -2.5], name:L('الممر', 'Hallway', 'Koridor') },
    { id:'kitchen',  lv:1, x0:3,   x1:10, z0:-7, z1:7, floor:'kitchen',  wall:0xfff0b8, lit:1.02, c:[5.6, -2.6], name:L('المطبخ', 'Kitchen', 'Mutfak') },
    { id:'kids',     lv:2, x0:-10, x1:-2, z0:-7, z1:1, floor:'wood',     wall:0xc8defd, lit:1.0, c:[-6, -3.4], name:L('غرفة الولاد', "Kids' room", 'Çocuk odası') },
    { id:'bath',     lv:2, x0:-10, x1:-2, z0:1,  z1:7, floor:'bath',     wall:0xcff2f4, lit:1.02, c:[-6, 3.6], name:L('الحمّام', 'Bathroom', 'Banyo') },
    { id:'landing',  lv:2, x0:-2,  x1:3,  z0:-7, z1:7, floor:'wood',     wall:0xf3d6ef, lit:1.0, c:[.5, -2.5], name:L('الممر الفوقاني', 'Upstairs hall', 'Üst kat koridoru') },
    { id:'nona',     lv:2, x0:3,   x1:10, z0:-7, z1:7, floor:'carpet',   wall:0xffd0dc, lit:1.0, c:[5.4, -1.2], name:L('غرفة الجدّة', "Grandma's room", 'Büyükannenin odası') },
    { id:'basement', lv:0, x0:3,   x1:10, z0:-7, z1:7, floor:'concrete', wall:0xd6d0e6, lit:.8,  c:[6, 1.5], name:L('القبو', 'Basement', 'Bodrum') },
    { id:'attic',    lv:3, x0:-7,  x1:7,  z0:-5, z1:5, floor:'attic',    wall:0xf0d8b8, lit:.92, c:[2.5, -2], name:L('السقيفة', 'Attic', 'Tavan arası') }
  ];
  const ROOM = Object.fromEntries(ROOMS.map(r => [r.id, r]));
  const STAIRS = [
    { id:'S1', x0:1.5,  x1:2.9,  z0:0,  z1:5,  lo:1, hi:2, lowAt:0 },
    { id:'S2', x0:8.4,  x1:9.9,  z0:-6, z1:-1, lo:0, hi:1, lowAt:0 },
    { id:'S3', x0:-1.9, x1:-.5,  z0:0,  z1:5,  lo:2, hi:3, lowAt:1 }
  ];
  STAIRS.forEach(s => { s.zLow = s.lowAt ? s.z1 : s.z0; s.zHigh = s.lowAt ? s.z0 : s.z1; s.cx = (s.x0 + s.x1) / 2; });
  const rampY = (s, z) => LY[s.lo] + (LY[s.hi] - LY[s.lo]) * clamp((z - s.zLow) / (s.zHigh - s.zLow), 0, 1);
  const lvOf = y => clamp(Math.round((y - LY[0]) / 3.2 + .12), 0, 3);
  const inR = (r, x, z, m = 0) => x >= r.x0 - m && x <= r.x1 + m && z >= r.z0 - m && z <= r.z1 + m;
  function roomAt(lv, x, z){ for(const r of ROOMS) if(r.lv === lv && inR(r, x, z)) return r; return null; }
  const inHouse = (x, z) => x > -10.1 && x < 10.1 && z > -7.1 && z < 7.1;
  function stairAt(x, z, y){ for(const s of STAIRS) if(x >= s.x0 && x <= s.x1 && z >= Math.min(s.z0, s.z1) && z <= Math.max(s.z0, s.z1)){ const ry = rampY(s, z); if(Math.abs(ry - y) < .9) return s; } return null; }
  function holeAt(lv, x, z){ for(const s of STAIRS) if(s.hi === lv && x > s.x0 && x < s.x1 && z > Math.min(s.z0, s.z1) && z < Math.max(s.z0, s.z1)) return true; return false; }
  function floorAt(lv, x, z){ if(lv === 1 && !inHouse(x, z)) return true; return !!roomAt(lv, x, z) && !holeAt(lv, x, z); }
  /* the height you stand at, at (x, z), coming from height y */
  function groundY(x, z, y){
    const s = stairAt(x, z, y); if(s) return rampY(s, z) + .1;
    let best = -1e9; for(let lv = 0; lv < 4; lv++){ const ly = LY[lv]; if(ly <= y + .6 && ly > best && floorAt(lv, x, z)) best = ly; }
    return best > -1e8 ? best : y;
  }
  function roomOf(x, y, z){ const s = stairAt(x, z, y); if(s) return s.id; if(!inHouse(x, z) && y > -1) return 'garden'; const r = roomAt(lvOf(y), x, z); return r ? r.id : null; }

  /* ---------------- merged geometry bags ---------------- */
  const LAMPS = [[], [], [], []];
  const colliders = [];
  class Bag{
    constructor(){ this.p = []; this.n = []; this.u = []; this.c = []; this.k = []; this.lv = []; }
    add(geo, x, y, z, sx, sy, sz, rx, ry, rz, color, lv, kind = 'furn', uvf = null){
      const g = geo.index ? geo.toNonIndexed() : geo.clone();
      _m.compose(_v.set(x, y, z), _q.setFromEuler(_e.set(rx, ry, rz, 'YXZ')), _s.set(sx, sy, sz)); g.applyMatrix4(_m);
      this.push(g, color, lv, kind, uvf); g.dispose(); return this;
    }
    push(g, color, lv, kind, uvf, filter){
      const pa = g.attributes.position.array, na = g.attributes.normal.array, ua = g.attributes.uv ? g.attributes.uv.array : null;
      for(let t = 0; t < pa.length / 9; t++){
        if(filter && !filter(pa, na, t)) continue;
        for(let v = t * 3; v < t * 3 + 3; v++){
          const x = pa[v * 3], y = pa[v * 3 + 1], z = pa[v * 3 + 2], nx = na[v * 3], ny = na[v * 3 + 1], nz = na[v * 3 + 2];
          this.p.push(x, y, z); this.n.push(nx, ny, nz);
          if(uvf){ const uv = uvf(x, y, z, nx, ny, nz); this.u.push(uv[0], uv[1]); } else if(ua) this.u.push(ua[v * 2], ua[v * 2 + 1]); else this.u.push(0, 0);
          const col = typeof color === 'function' ? color(x, y, z, nx, ny, nz) : color;
          _c.set(col); this.c.push(_c.r, _c.g, _c.b); this.k.push(kind); this.lv.push(lv);
        }
      }
    }
    mesh(mat, bake){
      const g = new THREE.BufferGeometry(), n = this.p.length / 3;
      if(bake) for(let i = 0; i < n; i++){ if(this.k[i] === 'none') continue; const f = bake(this.lv[i], this.p[i * 3], this.p[i * 3 + 1], this.p[i * 3 + 2], this.k[i], this.n[i * 3], this.n[i * 3 + 2]); this.c[i * 3] *= f[0]; this.c[i * 3 + 1] *= f[1]; this.c[i * 3 + 2] *= f[2]; }
      g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(this.n, 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute(this.u, 2)); g.setAttribute('color', new THREE.Float32BufferAttribute(this.c, 3));
      g.computeBoundingSphere();
      const m = new THREE.Mesh(g, mat); return m;
    }
  }
  const mkSet = () => ({ furn:new Bag(), wall:new Bag(), ext:new Bag(), emit:new Bag(), glass:new Bag(), extGlass:new Bag(), pic:new Bag(), plain:new Bag(), rug:new Bag(), roof:new Bag() });
  const MAIN = mkSet(), FRONT = mkSet(); let B = MAIN;
  const floorBags = {};
  const fb = t => floorBags[t] || (floorBags[t] = new Bag());

  /* furniture piece in a local frame: +z is its front, y up from its floor */
  function P(x, z, lv, ry = 0){
    const c = Math.cos(ry), s = Math.sin(ry), y0 = LY[lv];
    const tr = (lx, lz) => [x + lx * c + lz * s, z - lx * s + lz * c];
    const p = {
      x, z, lv, ry, y0, tr,
      g(geo, lx, ly, lz, sx, sy, sz, col, rx = 0, rY = 0, rz = 0, bag = 'furn', kind = 'furn'){ const [wx, wz] = tr(lx, lz); B[bag].add(geo, wx, y0 + ly, wz, sx, sy, sz, rx, ry + rY, rz, col, lv, kind); return p; },
      box(lx, ly, lz, w, h, d, col, bag, rx = 0, rz = 0){ return p.g(GEO.box, lx, ly, lz, w, h, d, col, rx, 0, rz, bag); },
      rb(lx, ly, lz, w, h, d, col, bag){ return p.g(GEO.rbox, lx, ly, lz, w, h, d, col, 0, 0, 0, bag); },
      cyl(lx, ly, lz, r, h, col, rx = 0, rz = 0, bag){ return p.g(GEO.cyl, lx, ly, lz, r, h, r, col, rx, 0, rz, bag); },
      sph(lx, ly, lz, sx, sy, sz, col, bag){ return p.g(GEO.sph, lx, ly, lz, sx, sy, sz, col, 0, 0, 0, bag); },
      col(lx, lz, w, d, h, o = {}){
        const [wx, wz] = tr(lx, lz), sw = Math.abs(Math.round(Math.sin(ry))) === 1, W = sw ? d : w, D = sw ? w : d;
        const cb = Object.assign({ x0:wx - W / 2, x1:wx + W / 2, z0:wz - D / 2, z1:wz + D / 2, y0:y0 + (o.yb || 0), y1:y0 + h, wall:false }, o); colliders.push(cb); return cb;
      },
      w:(lx, ly, lz) => { const [wx, wz] = tr(lx, lz); return { x:wx, y:y0 + ly, z:wz }; }
    };
    return p;
  }
  const LAMP_GLOW = [];
  function lamp(lv, x, y, z, r = 3.2, k = .35, glow = 1.6, col = 0xffd89a){
    LAMPS[lv].push({ x, y, z, r, k });
    if(glow){ const s = new THREE.Sprite(new THREE.SpriteMaterial({ map:K.glowTex, color:col, transparent:true, depthWrite:false, blending:THREE.AdditiveBlending, opacity:.75 })); s.position.set(x, y, z); s.scale.set(glow, glow, 1); scene.add(s); LAMP_GLOW.push(s); }
  }

  /* ---------------- walls ---------------- */
  const DOORS = [];       // interior doorways (for the grandma's map)
  const WALLMESH_FRONT = [];
  function wallBox(x0, x1, z0, z1, y0, y1, lv, opts = {}){
    const front = opts.front || (z1 < -6.85 && lv >= 1);
    const set = front ? FRONT : MAIN;
    const g = new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0, Math.max(1, Math.round((x1 - x0) / 1.2)), 3, Math.max(1, Math.round((z1 - z0) / 1.2))).toNonIndexed();
    g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
    const isExt = (pa, na, t) => { const i = t * 9, cx = (pa[i] + pa[i + 3] + pa[i + 6]) / 3, cz = (pa[i + 2] + pa[i + 5] + pa[i + 8]) / 3, cy = (pa[i + 1] + pa[i + 4] + pa[i + 7]) / 3;
      return !inHouse(cx + na[i] * .3, cz + na[i + 2] * .3) && cy > -.2; };
    const tint = (x, y, z, nx, ny, nz) => { const r = roomAt(lv, x + nx * .3, z + nz * .3); return r ? r.wall : (opts.tint || 0xf2e6d8); };
    const wuv = (x, y, z, nx, ny, nz) => [(Math.abs(nx) > .5 ? z : x) / 2.4, clamp((y - LY[lv]) / WH, 0, 1)];
    const euv = (x, y, z, nx) => [(Math.abs(nx) > .5 ? z : x) / 3, y / 3];
    set.wall.push(g, tint, lv, 'wall', wuv, (pa, na, t) => !isExt(pa, na, t));
    set.ext.push(g, opts.ext || 0xffc89a, lv, 'none', euv, isExt);
    g.dispose();
    if(!opts.nocol) colliders.push({ x0, x1, z0, z1, y0, y1, wall:true });
  }
  function trim(x0, x1, z0, z1, y0, y1, lv, col = 0xf7efe2){ const s = (z1 < -6.85 && lv >= 1) ? FRONT : MAIN; s.furn.add(GEO.box, (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2, x1 - x0, y1 - y0, z1 - z0, 0, 0, 0, col, lv); }
  /* a wall along x (axis 'z': at z = at, from x = a..b) or along z (axis 'x') with door gaps */
  function W(lv, axis, at, a, b, gaps = [], o = {}){
    const h = o.h || (o.ext ? 3.2 : WH), y0 = LY[lv], dh = o.dh || 2.3;
    const segs = []; let cur = a;
    gaps.slice().sort((p, q) => p[0] - q[0]).forEach(([g0, g1]) => { if(g0 > cur) segs.push([cur, g0]); cur = g1; });
    if(cur < b) segs.push([cur, b]);
    const mk = (s0, s1, yy0, yy1, extra = {}) => axis === 'z' ? wallBox(s0, s1, at - WT / 2, at + WT / 2, yy0, yy1, lv, Object.assign({}, o, extra)) : wallBox(at - WT / 2, at + WT / 2, s0, s1, yy0, yy1, lv, Object.assign({}, o, extra));
    segs.forEach(([s0, s1]) => mk(s0, s1, y0, y0 + h));
    gaps.forEach(([g0, g1]) => {
      const gdh = o.frontDoor ? 2.6 : dh;
      mk(g0, g1, y0 + gdh, y0 + h);
      // door frame trim
      const T = .07, D = WT / 2 + .05;
      if(axis === 'z'){ trim(g0 - T, g0, at - D, at + D, y0, y0 + gdh + T, lv); trim(g1, g1 + T, at - D, at + D, y0, y0 + gdh + T, lv); trim(g0 - T, g1 + T, at - D, at + D, y0 + gdh, y0 + gdh + T, lv); }
      else { trim(at - D, at + D, g0 - T, g0, y0, y0 + gdh + T, lv); trim(at - D, at + D, g1, g1 + T, y0, y0 + gdh + T, lv); trim(at - D, at + D, g0 - T, g1 + T, y0 + gdh, y0 + gdh + T, lv); }
      if(!o.ext){ const m = (g0 + g1) / 2; DOORS.push(axis === 'z' ? { lv, x:m, z:at, ax:'z' } : { lv, x:at, z:m, ax:'x' }); }
    });
  }
  const EXT = 0xffc89a;
  for(const lv of [1, 2]){
    W(lv, 'z', -7, -10.1, 10.1, lv === 1 ? [[-.3, 1.3]] : [], { ext:EXT, frontDoor:lv === 1 });
    W(lv, 'z', 7, -10.1, 10.1, [], { ext:EXT });
    W(lv, 'x', -10, -6.9, 6.9, [], { ext:EXT });
    W(lv, 'x', 10, -6.9, 6.9, [], { ext:EXT });
  }
  W(1, 'x', -2, -6.9, 6.9, [[-5, -3.6], [3, 4.4]]);
  W(1, 'x', 3, -6.9, 6.9, [[-4, -2.6], [5.4, 6.9]]);
  W(2, 'x', -2, -6.9, 6.9, [[-4, -2.6], [5.4, 6.8]]);
  W(2, 'x', 3, -6.9, 6.9, [[-4, -2.6], [5.4, 6.9]]);
  W(2, 'z', 1, -9.9, -2.1, [[-9.2, -7.8]]);
  // basement
  W(0, 'z', -7, 2.9, 10.1, [], { tint:0xd6d0e6 }); W(0, 'z', 7, 2.9, 10.1, [], { tint:0xd6d0e6 });
  W(0, 'x', 3, -6.9, 6.9, [], { tint:0xd6d0e6 }); W(0, 'x', 10, -6.9, 6.9, [], { tint:0xd6d0e6 });
  // attic knee walls
  W(3, 'z', -5, -7, 7, [], { h:1.25, nocolTop:true }); W(3, 'z', 5, -7, 7, [], { h:1.25 });
  // attic end walls (pentagon under the roof) at x = ±7
  for(const sx of [-1, 1]){
    const sh = new THREE.Shape(); sh.moveTo(-5.1, 0); sh.lineTo(5.1, 0); sh.lineTo(5.1, 1.2); sh.lineTo(0, 3.6); sh.lineTo(-5.1, 1.2); sh.closePath();
    const g = new THREE.ExtrudeGeometry(sh, { depth:WT, bevelEnabled:false }).toNonIndexed(); g.rotateY(Math.PI / 2); g.translate(sx * 7 - WT / 2, LY[3], 0);
    MAIN.wall.push(g, 0xf0d8b8, 3, 'wall', (x, y, z) => [z / 2.4, clamp((y - LY[3]) / WH, 0, 1)]); g.dispose();
    colliders.push({ x0:sx * 7 - .1, x1:sx * 7 + .1, z0:-5, z1:5, y0:LY[3], y1:LY[3] + 3.6, wall:true });
  }

  /* ---------------- floors and ceilings ---------------- */
  function minusHole(r, h){
    if(!h || h.x1 <= r.x0 || h.x0 >= r.x1 || h.z1 <= r.z0 || h.z0 >= r.z1) return [r];
    const o = [], hx0 = Math.max(r.x0, h.x0), hx1 = Math.min(r.x1, h.x1), hz0 = Math.max(r.z0, h.z0), hz1 = Math.min(r.z1, h.z1);
    if(hx0 > r.x0) o.push({ x0:r.x0, x1:hx0, z0:r.z0, z1:r.z1 });
    if(hx1 < r.x1) o.push({ x0:hx1, x1:r.x1, z0:r.z0, z1:r.z1 });
    if(hz0 > r.z0) o.push({ x0:hx0, x1:hx1, z0:r.z0, z1:hz0 });
    if(hz1 < r.z1) o.push({ x0:hx0, x1:hx1, z0:hz1, z1:r.z1 });
    return o;
  }
  function plane(bag, rc, y, down, col, lv, kind, uvs = 2){
    const w = rc.x1 - rc.x0, d = rc.z1 - rc.z0;
    const g = new THREE.PlaneGeometry(w, d, Math.max(1, Math.round(w / .4)), Math.max(1, Math.round(d / .4))).toNonIndexed();
    g.rotateX(down ? Math.PI / 2 : -Math.PI / 2); g.translate((rc.x0 + rc.x1) / 2, y, (rc.z0 + rc.z1) / 2);
    bag.push(g, col, lv, kind, (x, yy, z) => [x / uvs, -z / uvs]); g.dispose();
  }
  for(const r of ROOMS){
    const hole = STAIRS.find(s => s.hi === r.lv), up = STAIRS.find(s => s.lo === r.lv);
    minusHole(r, hole).forEach(rc => plane(fb(r.floor), rc, LY[r.lv], false, 0xffffff, r.lv, 'floor', r.floor === 'carpet' || r.floor === 'concrete' ? 1.5 : 2.2));
    if(r.id !== 'attic') minusHole(r, up).forEach(rc => plane(MAIN.plain, rc, LY[r.lv] + WH, true, 0xfffaf0, r.lv, 'ceil'));
  }
  // hole rims (slab thickness)
  for(const s of STAIRS){ const y = LY[s.hi], c = 0xf7efe2; for(const z of [s.z0, s.z1]) trim(s.x0, s.x1, z - .03, z + .03, y - .2, y, s.hi, c); }

  /* ---------------- stairs ---------------- */
  for(const s of STAIRS){
    const n = 14, run = s.zHigh - s.zLow, rise = LY[s.hi] - LY[s.lo], w = s.x1 - s.x0, y0 = LY[s.lo];
    for(let i = 0; i < n; i++){
      const za = s.zLow + run * i / n, zb = s.zLow + run * (i + 1) / n, top = y0 + rise * (i + 1) / n;
      MAIN.furn.add(GEO.box, s.cx, (y0 + top) / 2, (za + zb) / 2, w, top - y0, Math.abs(zb - za), 0, 0, 0, 0xa8693e, s.lo);
      MAIN.furn.add(GEO.box, s.cx, top + .005, (za + zb) / 2 + Math.sign(run) * .02, w * .62, .03, Math.abs(zb - za) * .9, 0, 0, 0, 0xb8463f, s.lo);
    }
    // side walls (with a railing on the upper floor) unless a room wall is already there
    const sides = [];
    if(!(s.x0 <= -1.85)) sides.push(s.x0 - .1);
    if(!(s.x1 >= 9.85 || Math.abs(s.x1 - 2.9) < .01)) sides.push(s.x1 + .1);
    if(s.id === 'S3') sides.push(s.x0 + .02);   // attic railing on the open side too
    const za = Math.min(s.z0, s.z1), zb = Math.max(s.z0, s.z1);
    for(const sx of sides){
      const inner = s.id === 'S3' && sx > s.x0 && sx < s.x0 + .1;
      if(!inner) wallBox(sx - .1, sx + .1, za, zb, LY[s.lo], LY[s.hi], s.lo, { tint:0xf2e6d8 });
      // railing on the upper floor
      const ry = LY[s.hi];
      MAIN.furn.add(GEO.box, sx, ry + 1.0, (za + zb) / 2, .14, .08, zb - za + .1, 0, 0, 0, 0x9a6038, s.hi);
      for(let k = 0; k <= 8; k++) MAIN.furn.add(GEO.box, sx, ry + .5, za + (zb - za) * k / 8, .05, 1.0, .05, 0, 0, 0, 0xf7efe2, s.hi);
      colliders.push({ x0:sx - .1, x1:sx + .1, z0:za, z1:zb, y0:ry, y1:ry + 1.05, wall:false });
    }
    // under the high end on the low floor: a wall; at the low end on the high floor: a railing
    const zH = s.zHigh, zL = s.zLow, dH = Math.sign(s.zHigh - s.zLow) * .1;
    wallBox(s.x0, s.x1, Math.min(zH, zH + dH), Math.max(zH, zH + dH), LY[s.lo], LY[s.hi] - .2, s.lo, { tint:0xf2e6d8 });
    const rz = zL - dH / 2, ry = LY[s.hi];
    MAIN.furn.add(GEO.box, s.cx, ry + 1.0, rz, w + .1, .08, .14, 0, 0, 0, 0x9a6038, s.hi);
    for(let k = 0; k <= 4; k++) MAIN.furn.add(GEO.box, s.x0 + w * k / 4, ry + .5, rz, .05, 1.0, .05, 0, 0, 0, 0xf7efe2, s.hi);
    colliders.push({ x0:s.x0, x1:s.x1, z0:Math.min(rz - .07, rz + .07), z1:Math.max(rz - .07, rz + .07), y0:ry, y1:ry + 1.05, wall:false });
  }

  /* ---------------- furniture kit ---------------- */
  const WOOD = 0xb07a4a, WOOD_D = 0x8a5a34, WOOD_L = 0xd9a86c, WHITE = 0xf7f3ea, CREAM = 0xf3e3c6, GOLD = 0xe2b33c, METAL = 0xb9c0c8;
  const HIDES = [], SPOTS = { jar:[], pliers:[], note:[], toy:[], creak:[] }, VASES = [];
  function hide(kind, p, o){
    const pi = p.w(o.in[0], 0, o.in[1]), cam = p.w(...o.cam), look = p.w(...o.look), out = p.w(o.out[0], 0, o.out[1]);
    HIDES.push({ id:kind + HIDES.length, kind, lv:p.lv, x:pi.x, z:pi.z, y:p.y0, cam, look, out, near:o.near || 1.25, room:(roomAt(p.lv, pi.x, pi.z) || {}).id });
  }
  function spot(kind, p, lx, ly, lz){ const w = p.w(lx, ly, lz); SPOTS[kind].push({ x:w.x, y:w.y, z:w.z, lv:p.lv, ry:p.ry, room:(roomAt(p.lv, w.x, w.z) || {}).id }); }

  function bed(p, o = {}){
    const w = o.w || 1.15, l = o.l || 2.1, fr = o.frame || WOOD;
    for(const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) p.box(a * (w / 2 - .06), .18, b * (l / 2 - .06), .1, .36, .1, fr);
    p.box(0, .38, 0, w, .14, l, fr);
    p.rb(0, .55, .02, w - .04, .22, l - .06, WHITE);
    p.rb(0, .64, l * .18, w + .06, .14, l * .64, o.blanket || 0x7fb2ff);
    p.cyl(0, .7, l * .18 - l * .32, .085, w + .06, o.blanket2 || 0xffffff, 0, Math.PI / 2);
    const np = w > 1.5 ? [-w / 4, w / 4] : [0];
    np.forEach(px => p.rb(px, .74, -l / 2 + .3, w / np.length * .78, .16, .34, o.pillow || 0xfffdf6));
    p.box(0, .72, -l / 2 + .02, w + .04, 1.1, .1, fr); p.cyl(0, 1.27, -l / 2 + .02, .075, w + .04, fr, 0, Math.PI / 2);
    p.box(0, .48, l / 2 - .03, w + .04, .6, .08, fr);
    p.col(0, 0, w + .05, l + .05, .8);
    if(o.hide !== false){ const sd = o.side || 1; hide('bed', p, { in:[0, 0], cam:[sd * w * .15, .16, 0], look:[sd * (w / 2 + 3), .4, 0], out:[sd * (w / 2 + .55), 0] }); }
  }
  function wardrobe(p, o = {}){
    const w = o.w || 1.5, d = o.d || .7, h = o.h || 2.3, col = o.col || 0xd98c6a;
    p.box(0, h / 2 + .06, 0, w, h - .1, d, col);
    p.box(0, h + .06, 0, w + .12, .12, d + .1, o.trim || WHITE); p.box(0, .05, 0, w + .06, .1, d + .06, o.trim || WHITE);
    for(const s of [-1, 1]){ p.box(s * w / 4, h / 2 + .05, d / 2 + .015, w / 2 - .06, h - .3, .03, o.door || 0xe9a283); p.box(s * w / 4, h / 2 + .05, d / 2 + .03, w / 2 - .3, h - .8, .02, col); p.sph(s * .1, 1.1, d / 2 + .07, .05, .05, .05, GOLD); }
    p.col(0, 0, w, d, h + .1, { tall:true });
    hide('wardrobe', p, { in:[0, 0], cam:[0, 1.0, d / 2 - .05], look:[0, .9, d / 2 + 3], out:[0, d / 2 + .6] });
  }
  function table(p, o = {}){
    const w = o.w || 1.6, d = o.d || 1.0, h = o.h || .78, col = o.col || WOOD;
    p.box(0, h - .03, 0, w, .06, d, col);
    for(const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) p.box(a * (w / 2 - .08), (h - .06) / 2, b * (d / 2 - .08), .07, h - .06, .07, col);
    if(o.cloth){ p.box(0, h + .005, 0, w + .14, .02, d + .14, o.cloth); for(const s of [-1, 1]){ p.box(0, h - .25, s * (d / 2 + .07), w + .14, .5, .02, o.cloth); p.box(s * (w / 2 + .07), h - .25, 0, .02, .5, d + .14, o.cloth); } }
    p.col(0, 0, w + .1, d + .1, h + .05);
  }
  function chair(p, col = WOOD_L){ p.box(0, .45, 0, .46, .06, .46, col); for(const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) p.box(a * .19, .22, b * .19, .05, .44, .05, col); p.box(0, .78, -.21, .46, .58, .05, col); p.col(0, 0, .5, .5, .95); }
  function sofa(p, o = {}){
    const w = o.w || 2.4, col = o.col || 0x6f9fd8, c2 = o.cushion || 0x86b4e8;
    p.rb(0, .25, 0, w, .4, .9, col); p.rb(0, .82, -.36, w, .7, .28, col);
    for(const s of [-1, 1]) p.rb(s * (w / 2 - .1), .55, .02, .26, .5, .92, col);
    const n = w > 1.5 ? 2 : 1; for(let i = 0; i < n; i++){ const cx = -w / 2 + .25 + (w - .5) * (i + .5) / n; p.rb(cx, .5, .06, (w - .5) / n - .04, .16, .7, c2); }
    if(o.pillows) o.pillows.forEach((pc, i) => p.rb((i ? 1 : -1) * (w / 2 - .45), .74, -.18, .38, .34, .14, pc));
    p.col(0, 0, w, .95, .95);
  }
  function plant(p, s = 1){
    p.cyl(0, .22 * s, 0, .22 * s, .44 * s, 0xd3784d); p.cyl(0, .46 * s, 0, .25 * s, .06 * s, 0xc26a40);
    for(let i = 0; i < 7; i++){ const a = i / 7 * 6.283; p.sph(Math.cos(a) * .2 * s, (.75 + (i % 3) * .14) * s, Math.sin(a) * .2 * s, .24 * s, .3 * s, .24 * s, i % 2 ? 0x4fae4a : 0x3f9a45); }
    p.sph(0, 1.08 * s, 0, .22 * s, .3 * s, .22 * s, 0x5cbf55);
    p.col(0, 0, .5 * s, .5 * s, 1.2 * s);
  }
  function floorLamp(p, col = 0xffe0a8){
    p.cyl(0, .03, 0, .2, .06, 0x6b4a33); p.cyl(0, .8, 0, .025, 1.55, 0x6b4a33);
    p.g(GEO.cone, 0, 1.62, 0, .3, .36, .3, col, 0, 0, 0, 'emit');
    const w = p.w(0, 1.55, 0); lamp(p.lv, w.x, w.y, w.z, 3.0, .32, 1.8);
    p.col(0, 0, .4, .4, 1.8);
  }
  function tableLamp(p, lx, ly, lz, col = 0xfff0c4){
    p.cyl(lx, ly + .02, lz, .1, .04, GOLD); p.cyl(lx, ly + .18, lz, .02, .3, GOLD);
    p.g(GEO.cone, lx, ly + .4, lz, .15, .2, .15, col, 0, 0, 0, 'emit');
    const w = p.w(lx, ly + .4, lz); lamp(p.lv, w.x, w.y, w.z, 2.2, .22, 1.1);
  }
  function ceilLamp(lv, x, z, col = 0xfff2cc, r = 3.6, k = .3){
    const y = LY[lv] + WH; MAIN.furn.add(GEO.cyl, x, y - .2, z, .015, .4, .015, 0, 0, 0, 0x6b4a33, lv);
    MAIN.emit.add(GEO.hemi, x, y - .45, z, .32, .22, .32, Math.PI, 0, 0, col, lv);
    MAIN.emit.add(GEO.sm, x, y - .48, z, .1, .1, .1, 0, 0, 0, 0xffffff, lv);
    lamp(lv, x, y - .6, z, r, k, 2.2);
  }
  function shelf(p, o = {}){
    const w = o.w || 1.6, h = o.h || 2.0, d = o.d || .4, col = o.col || WOOD, n = o.n || 4;
    p.box(0, h / 2, -d / 2 + .02, w, h, .04, col);
    for(const s of [-1, 1]) p.box(s * (w / 2 - .02), h / 2, 0, .04, h, d, col);
    for(let i = 0; i <= n; i++) p.box(0, .05 + (h - .1) * i / n, 0, w, .04, d, col);
    const BOOK = [0xc0504d, 0x4f81bd, 0x6aa84f, 0xf2c14e, 0x8064a2, 0xd9825b, 0x3d8f8f];
    if(o.books !== false) for(let i = 0; i < n; i++){ let x = -w / 2 + .08; const sy = .05 + (h - .1) * i / n + .02; let k = i * 3;
      while(x < w / 2 - .14){ const bw = .05 + ((k * 37) % 5) * .012, bh = (h - .1) / n * (.62 + ((k * 13) % 4) * .07); if(((k * 7) % 9) !== 0) p.box(x + bw / 2, sy + bh / 2, .02, bw, bh, d * .78, BOOK[k % BOOK.length]); x += bw + .01; k++; } }
    p.col(0, 0, w, d, h, { tall:h > 1.6 });
  }
  function counter(p, w, o = {}){
    const d = .7, h = .92, col = o.col || 0x9fd0c0, top = o.top || 0xf3efe6;
    p.box(0, (h - .05) / 2, 0, w, h - .05, d - .04, col);
    const nd = Math.max(1, Math.round(w / .6));
    for(let i = 0; i < nd; i++){ const cx = -w / 2 + w * (i + .5) / nd; p.box(cx, h / 2 - .05, d / 2 - .01, w / nd - .06, h - .25, .03, o.door || 0xb8e2d4); p.box(cx + (i % 2 ? -1 : 1) * (w / nd / 2 - .1), h - .3, d / 2 + .03, .03, .12, .03, METAL); }
    p.box(0, h - .02, .02, w + .04, .05, d + .02, top);
    p.col(0, 0, w, d, h);
  }
  function picture(lv, x, y, z, ry, w, h, idx, frame = 0xc59a3e){
    const p = P(x, z, lv, ry); p.box(0, y, 0, w + .12, h + .12, .05, frame);
    const qu = idx % 2, qv = 1 - Math.floor(idx / 2);
    const g = new THREE.PlaneGeometry(w, h).toNonIndexed(); const uv = g.attributes.uv; for(let i = 0; i < uv.count; i++) uv.setXY(i, (qu + uv.getX(i)) / 2, (qv + uv.getY(i)) / 2);
    _m.compose(_v.set(...Object.values(p.w(0, y, .03))), _q.setFromEuler(_e.set(0, ry, 0)), _s.set(1, 1, 1)); g.applyMatrix4(_m);
    B.pic.push(g, 0xffffff, lv, 'furn'); g.dispose();
  }
  function rug(lv, x, z, w, d, idx, ry = 0){
    const qu = idx % 2, qv = 1 - Math.floor(idx / 2);
    const g = new THREE.PlaneGeometry(w, d, 4, 4).toNonIndexed(); const uv = g.attributes.uv; for(let i = 0; i < uv.count; i++) uv.setXY(i, (qu + uv.getX(i)) / 2, (qv + uv.getY(i)) / 2);
    g.rotateX(-Math.PI / 2); g.rotateY(ry); g.translate(x, LY[lv] + .012, z);
    MAIN.rug.push(g, 0xffffff, lv, 'floor'); g.dispose();
  }
  /* a window on the inside face of an outer wall: +z of the piece points into the room */
  function windowAt(lv, x, z, ry, o = {}){
    const p = P(x, z, lv, ry), w = o.w || 1.3, h = o.h || 1.3, sy = o.sill || .95, cy = sy + h / 2;
    const saveB = B; if(o.front) B = FRONT;
    p.g(GEO.box, 0, cy, .012, w, h, .01, 0xffffff, 0, 0, 0, 'glass', 'none');
    for(const s of [-1, 1]){ p.box(s * (w / 2 + .05), cy, .02, .1, h + .2, .1, WHITE); p.box(0, cy + s * (h / 2 + .05), .02, w + .2, .1, .1, WHITE); }
    p.box(0, cy, .02, .05, h, .06, WHITE); p.box(0, cy, .02, w, .05, .06, WHITE);
    p.box(0, sy - .08, .1, w + .36, .06, .24, WHITE);
    if(o.curt){
      const top = Math.min(cy + h / 2 + .32, WH - .15), bot = o.long ? .04 : sy - .2, ch = top - bot;
      p.cyl(0, top + .03, .16, .025, w + 1.1, GOLD, 0, Math.PI / 2);
      for(const s of [-1, 1]) for(let i = 0; i < 4; i++) p.g(GEO.cyl, s * (w / 2 + .12 + i * .1), bot + ch / 2, .17 + (i % 2) * .03, .065, ch, .065, o.curt, 0, 0, 0);
      p.box(0, top - .12, .2, w + .9, .26, .05, o.valance || o.curt);
    }
    // outside: a frame and warm glass seen from the garden
    p.g(GEO.box, 0, cy, -.212, w, h, .01, 0xffffff, 0, 0, 0, 'extGlass', 'none');
    for(const s of [-1, 1]){ p.box(s * (w / 2 + .05), cy, -.23, .12, h + .2, .06, WHITE, 'ext'); p.box(0, cy + s * (h / 2 + .05), -.23, w + .22, .12, .06, WHITE, 'ext'); }
    p.box(0, cy, -.225, .06, h, .03, WHITE, 'ext'); p.box(0, cy, -.225, w, .06, .03, WHITE, 'ext'); p.box(0, sy - .1, -.3, w + .36, .08, .22, WHITE, 'ext');
    B = saveB;
    return p;
  }
  function pedestalVase(lv, x, z, col){
    const p = P(x, z, lv); p.cyl(0, .38, 0, .13, .76, WHITE); p.cyl(0, .78, 0, .19, .05, WHITE); p.cyl(0, .02, 0, .18, .04, WHITE);
    const cb = p.col(0, 0, .42, .42, .8, { vase:VASES.length });
    VASES.push({ lv, x, z, y:LY[lv] + .8, col, cb, down:false });
  }
  function boxPile(p, items){ items.forEach(([x, y, z, w, h, d, c]) => { p.box(x, y + h / 2, z, w, h, d, c || 0xc89a62); p.box(x, y + h + .003, z, w * .2, .01, d + .01, 0xe8d9a8); }); }

  /* ================= LIVING ROOM (ground floor, west) ================= */
  {
    const lv = 1;
    // fireplace on the west wall
    const f = P(-9.65, 0, lv, Math.PI / 2);
    f.box(0, .7, 0, 2.2, 1.4, .55, 0xc7a58a); f.box(0, 1.45, .06, 2.5, .1, .7, WHITE); f.box(0, .5, .2, 1.2, .9, .2, 0x3a2a2a);
    f.box(0, .14, .28, 1.0, .08, .14, 0x6b4a33);
    f.g(GEO.cyl, -.15, .25, .3, .08, .6, .08, 0x8a5a34, 0, 0, Math.PI / 2); f.g(GEO.cyl, .15, .3, .3, .08, .55, .08, 0x7a4a2a, 0, .5, Math.PI / 2);
    f.g(GEO.sph, 0, .38, .3, .28, .2, .1, 0xff9a3c, 0, 0, 0, 'emit'); f.g(GEO.sph, 0, .48, .3, .14, .18, .06, 0xffd36a, 0, 0, 0, 'emit');
    f.box(-.8, 1.62, .1, .2, .26, .14, 0x6aa84f).box(.75, 1.58, .1, .3, .18, .12, 0xe8b04a);
    f.col(0, 0, 2.5, .7, 1.5);
    const fw = f.w(0, .45, .35); lamp(lv, fw.x, fw.y, fw.z, 3.0, .5, 2.2, 0xffa24a);
    picture(lv, -9.88, 2.25, 0, Math.PI / 2, 1.1, .8, 0);
    sofa(P(-5.6, 0, lv, -Math.PI / 2), { w:2.6, col:0x6f9fd8, cushion:0x86b4e8, pillows:[0xffcd4d, 0xff8fb8] });
    table(P(-7.6, 0, lv), { w:.7, d:1.2, h:.45, col:WOOD_D });
    spot('note', P(-7.6, 0, lv), 0, .45, -.25); spot('jar', P(-7.6, 0, lv), 0, .45, .3);
    rug(lv, -7.3, 0, 4.4, 4.4, 0);
    // armchair
    const ac = P(-8.5, -4.6, lv, Math.PI * .75); ac.rb(0, .25, 0, 1.0, .42, .9, 0xd9768e); ac.rb(0, .8, -.36, 1.0, .7, .26, 0xd9768e); for(const s of [-1, 1]) ac.rb(s * .42, .55, 0, .22, .45, .9, 0xd9768e); ac.rb(0, .5, .06, .62, .15, .68, 0xe98ea4); ac.col(0, 0, 1.0, 1.0, .95);
    shelf(P(-5.2, -6.7, lv), { w:1.8, h:2.1, d:.42 });
    spot('note', P(-5.2, -6.7, lv), .2, 1.08, .05); spot('pliers', P(-5.2, -6.7, lv), -.4, .58, .05);
    windowAt(lv, -8.2, -6.9, 0, { curt:0xff8f9e, long:true, front:true });
    hide('curtain', P(-8.2, -6.9, lv), { in:[-1.0, .45], cam:[-1.0, 1.0, .5], look:[-.3, .9, 4], out:[-1.0, 1.0], near:1.3 });
    windowAt(lv, -6, 6.9, Math.PI, { curt:0xff8f9e, long:true });
    hide('curtain', P(-6, 6.9, lv, Math.PI), { in:[1.0, .45], cam:[1.0, 1.0, .5], look:[.3, .9, 4], out:[1.0, 1.0], near:1.3 });
    // TV on a low cabinet
    const tv = P(-8.6, 6.65, lv, Math.PI); tv.box(0, .3, 0, 1.4, .6, .5, WOOD); tv.rb(0, .9, 0, .9, .62, .5, 0x5a5f6a); tv.box(0, .92, .26, .7, .46, .02, 0x9fc4d8, 'emit'); tv.col(0, 0, 1.4, .55, 1.25);
    // sideboard between the doors (east wall)
    const sb = P(-2.4, .2, lv, -Math.PI / 2); sb.box(0, .42, 0, 2.2, .84, .5, WOOD_L); for(const s of [-1, 0, 1]) sb.box(s * .7, .42, .26, .6, .6, .02, 0xe9c08a); sb.col(0, 0, 2.2, .52, .9);
    tableLamp(sb, -.75, .84, 0); spot('jar', sb, .5, .84, 0);
    picture(lv, -2.12, 1.9, .2, -Math.PI / 2, .9, .7, 1);
    floorLamp(P(-6.65, -6.5, lv)); floorLamp(P(-3.0, 6.4, lv));
    plant(P(-9.4, 6.3, lv), 1.1); plant(P(-2.6, -6.4, lv), .9);
    pedestalVase(lv, -3.0, -2.4, 0x4f81bd);
    ceilLamp(lv, -6, -2.5);
  }
  /* ================= HALLWAY (ground floor, middle) ================= */
  {
    const lv = 1;
    rug(lv, .1, 1.2, 1.4, 5.2, 2);
    // door mat
    MAIN.furn.add(GEO.box, .5, .015, -6.45, 1.3, .03, .7, 0, 0, 0, 0x9a6b3a, lv);
    // coat rack with long coats (hide behind)
    const cr = P(-1.55, -6.45, lv, Math.PI / 4);
    cr.cyl(0, .9, 0, .03, 1.8, WOOD_D).cyl(0, .03, 0, .22, .05, WOOD_D);
    [[-.15, 0x7a5aa8], [.16, 0x3d8f8f], [0, 0xd4553f]].forEach(([dx, c], i) => cr.g(GEO.rbox, dx, 1.05, .12 + i * .04, .42, 1.25, .2, c));
    cr.sph(0, 1.88, 0, .2, .1, .2, 0x8064a2);
    cr.col(0, 0, .55, .55, 1.9);
    hide('coats', P(-1.55, -6.45, lv, Math.PI / 4), { in:[0, -.05], cam:[0, 1.0, .35], look:[0, .9, 3.5], out:[0, .95], near:1.2 });
    // shoe bench
    const sb = P(2.45, -6.6, lv); sb.box(0, .25, 0, .9, .5, .4, WOOD_L); sb.box(-.2, .55, .05, .28, .1, .2, 0xd4553f).box(.2, .55, .05, .28, .1, .2, 0x4f81bd); sb.col(0, 0, .9, .42, .55);
    spot('pliers', sb, .25, .5, 0);
    // console with a lamp (west wall, between the doors)
    const co = P(-1.7, 1.0, lv, Math.PI / 2); co.box(0, .8, 0, 1.2, .06, .4, WOOD); for(const s of [-1, 1]) co.box(s * .55, .4, 0, .06, .8, .36, WOOD); co.col(0, 0, 1.2, .42, .85);
    tableLamp(co, -.35, .83, 0); spot('note', co, .3, .83, 0); spot('jar', co, .3, .83, 0);
    picture(lv, -1.88, 1.9, 1.0, Math.PI / 2, .7, .9, 2);
    // grandfather clock at the far end
    const ck = P(.4, 6.65, lv, Math.PI); ck.box(0, 1.05, 0, .6, 2.1, .4, WOOD_D); ck.cyl(0, 1.7, .21, .2, .03, CREAM, Math.PI / 2); ck.box(0, .9, .21, .3, .6, .02, 0xd9b26a); ck.box(0, 2.18, 0, .7, .14, .46, WOOD_D); ck.col(0, 0, .62, .42, 2.2, { tall:true });
    pedestalVase(lv, -1.45, -1.6, 0xd9768e);
    plant(P(-1.5, 5.9, lv), .85);
    ceilLamp(lv, .5, -3.5); ceilLamp(lv, -.4, 3.5);
  }
  /* ================= KITCHEN (ground floor, east) ================= */
  {
    const lv = 1;
    const k1 = P(7.0, 6.62, lv, Math.PI); counter(k1, 5.6);
    // sink and stove on the counter
    k1.box(1.0, .93, 0, .8, .02, .5, METAL).box(1.0, .9, 0, .66, .06, .38, 0x8a959e); k1.cyl(1.0, 1.1, -.24, .025, .3, METAL); k1.g(GEO.torus, 1.0, 1.25, -.16, .08, .08, .08, METAL, 0, Math.PI / 2, 0);
    k1.box(-1.4, .955, .0, .8, .02, .6, 0x2f3238); for(const [a, b] of [[-.2, -.15], [.2, -.15], [-.2, .15], [.2, .15]]) k1.cyl(-1.4 + a, .97, b, .1, .01, 0x55585e);
    k1.cyl(-1.6, 1.05, -.1, .14, .16, 0xd4553f); k1.cyl(-1.6, 1.14, -.1, .15, .02, 0xd4553f);
    spot('jar', k1, -.3, .95, .05); spot('pliers', k1, 2.2, .95, .05);
    // upper cabinets
    for(let i = 0; i < 4; i++){ const cx = -2.4 + i * 1.6; if(Math.abs(cx - 1.0) < .5) continue; k1.box(cx, 2.15, -.08, 1.4, .8, .36, 0x9fd0c0).box(cx, 2.15, .11, 1.25, .66, .02, 0xb8e2d4); }
    windowAt(lv, 6.0, 6.9, Math.PI, { w:1.1, h:.75, sill:1.2, curt:0xffd36a });
    // fridge
    const fr = P(9.5, 4.2, lv, -Math.PI / 2); fr.rb(0, 1.0, 0, .9, 2.0, .75, 0xbfe6e0); fr.box(0, 1.3, .38, .86, .02, .02, 0x9fbfba); fr.box(.33, 1.6, .39, .04, .35, .04, METAL).box(.33, .8, .39, .04, .35, .04, METAL);
    fr.box(-.15, 1.75, .385, .12, .12, .01, 0xff8fb8).box(.05, 1.5, .385, .14, .1, .01, 0xffcd4d); fr.col(0, 0, .9, .78, 2.0, { tall:true });
    // east counter
    const k2 = P(9.55, 1.55, lv, -Math.PI / 2); counter(k2, 2.2); spot('jar', k2, .3, .95, 0); spot('pliers', k2, -.6, .95, 0);
    // pantry shelf on the front wall
    const pa = P(5.0, -6.75, lv); shelf(pa, { w:1.6, h:1.9, d:.4, col:WOOD_L, books:false, n:3 });
    for(let i = 0; i < 6; i++) pa.cyl(-.6 + i * .24, .7 + (i % 2) * .62 + .1, 0, .08, .18, [0xff6f61, 0xffcd4d, 0x9bd17a][i % 3]);
    spot('jar', pa, .25, 1.33, 0); spot('note', pa, -.3, .7, 0);
    // dining table with a long cloth (hide under), two chairs
    const tb = P(6.4, 1.0, lv); table(tb, { w:1.8, d:1.1, cloth:0xfff4f4 });
    tb.box(0, .79, 0, 1.9, .012, .22, 0xff8f9e); tb.cyl(.4, .86, .1, .1, .14, 0xffffff); tb.cyl(-.35, .82, -.15, .14, .02, 0xffffff);
    spot('jar', tb, -.2, .78, .1); spot('note', tb, .3, .78, -.2);
    hide('table', tb, { in:[0, 0], cam:[0, .32, .15], look:[0, .4, 3.5], out:[0, 1.1] });
    chair(P(4.95, 1.0, lv, Math.PI / 2)); chair(P(7.85, 1.0, lv, -Math.PI / 2));
    picture(lv, 3.12, 1.9, 1.5, Math.PI / 2, .8, .6, 3);
    plant(P(3.5, 6.4, lv), .8);
    ceilLamp(lv, 6.4, 1.0, 0xfff2cc, 3.8, .36); ceilLamp(lv, 5.5, -4.5);
  }
  /* ================= KIDS' ROOM (upper floor, west front) ================= */
  {
    const lv = 2;
    bed(P(-8.85, -5.75, lv, Math.PI / 2), { blanket:0x7fb2ff, blanket2:0xffffff, side:-1 });   // head on the west wall
    bed(P(-8.85, -2.0, lv, Math.PI / 2), { blanket:0xff9ec4, blanket2:0xffffff, pillow:0xfff1a8, side:-1 });
    const ns = P(-9.55, -3.85, lv, Math.PI / 2); ns.box(0, .28, 0, .5, .56, .45, WHITE); ns.col(0, 0, .5, .45, .6); tableLamp(ns, 0, .56, 0, 0xfff0c4);
    wardrobe(P(-5.0, .6, lv, Math.PI), { col:0x7fa6e8, door:0x9fbef0, trim:WHITE });
    // toy chest
    const tc = P(-6.6, -6.6, lv); tc.rb(0, .3, 0, 1.1, .6, .55, 0xffcd4d); tc.box(0, .62, 0, 1.12, .06, .56, 0xff8f6a); tc.sph(-.2, .75, 0, .14, .14, .14, 0xff6f61); tc.box(.25, .72, 0, .2, .2, .2, 0x6aa84f); tc.col(0, 0, 1.1, .6, .7);
    // little desk + chair
    const dk = P(-3.0, -6.6, lv); table(dk, { w:1.1, d:.6, h:.7, col:WHITE }); tableLamp(dk, -.35, .7, -.05, 0xc8f0ff); dk.box(.2, .72, 0, .3, .02, .22, 0xffffff);
    spot('note', dk, .2, .7, 0); spot('pliers', dk, -.05, .7, .1);
    chair(P(-3.0, -5.9, lv, Math.PI), 0xff8fb8);
    rug(lv, -6.2, -3.4, 3.2, 3.2, 1);
    windowAt(lv, -8.0, -6.9, 0, { curt:0x8fd0ff, front:true });
    windowAt(lv, -9.9, .0, Math.PI / 2, { curt:0x8fd0ff, w:1.0 });
    picture(lv, -2.12, 1.9, -1.2, -Math.PI / 2, .7, .7, 2, 0xff8fb8);
    // glow-in-the-dark stars on the ceiling
    for(let i = 0; i < 9; i++){ const sx = -9 + (i * 2.71) % 6.5, sz = -6.3 + (i * 3.17) % 6.6; const g = K.starGeo; MAIN.emit.add(g, sx, LY[lv] + WH - .02, sz, .09, .09, .02, Math.PI / 2, i, 0, 0xfff3a0, lv); }
    ceilLamp(lv, -6, -3.0, 0xfff2cc, 3.6, .3);
  }
  /* ================= BATHROOM (upper floor, west back) ================= */
  {
    const lv = 2;
    const tub = P(-9.35, 5.55, lv);
    tub.rb(0, .32, 0, .95, .62, 1.9, WHITE); tub.rb(0, .5, 0, .78, .3, 1.72, 0xbfe6f2);
    for(const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) tub.sph(a * .38, .05, b * .82, .07, .07, .07, GOLD);
    tub.cyl(0, .85, -.9, .03, .3, METAL); tub.sph(.06, .62, -.2, .1, .08, .12, 0xffd23f);
    tub.cyl(.55, 2.2, 0, .02, 2.0, METAL, Math.PI / 2);
    for(let i = 0; i < 9; i++) tub.g(GEO.cyl, .56 + (i % 2) * .03, 1.3, -.85 + i * .19, .055, 1.75, .055, i % 2 ? 0xffb8d2 : 0xffc9dc);
    tub.col(0, 0, 1.0, 1.95, 1.9);
    hide('tub', tub, { in:[0, 0], cam:[.05, .95, 0], look:[3, .9, -.5], out:[1.2, 0], near:1.5 });
    const sk = P(-5.4, 6.75, lv, Math.PI); sk.box(0, .4, 0, .9, .8, .5, 0xffffff).box(0, .4, .26, .8, .66, .02, 0xbfe6f2).rb(0, .86, 0, .74, .14, .48, WHITE).cyl(0, 1.0, -.18, .025, .25, METAL);
    sk.box(0, 1.7, -.17, .8, .9, .03, 0xc8e8f2, 'emit').box(0, 1.7, -.19, .9, 1.0, .02, GOLD);
    sk.col(0, 0, .9, .52, .95); spot('pliers', sk, -.3, .93, 0); spot('note', sk, .3, .93, 0);
    const to = P(-3.2, 1.45, lv); to.cyl(0, .22, .08, .2, .44, WHITE).box(0, .62, -.24, .5, .44, .2, WHITE).cyl(0, .46, .08, .22, .04, 0xbfe6f2); to.col(0, 0, .5, .7, .85);
    const bk = P(-6.8, 1.45, lv); bk.cyl(0, .3, 0, .25, .6, 0xd9b07c); bk.sph(0, .62, 0, .22, .1, .22, 0xffffff); bk.col(0, 0, .52, .52, .7);
    rug(lv, -6.5, 4.2, 1.6, 1.0, 3);
    windowAt(lv, -7.2, 6.9, Math.PI, { w:.9, h:.8, sill:1.4 });
    // towels on a rail
    const tr = P(-2.15, 3.6, lv, -Math.PI / 2); tr.cyl(0, 1.3, .05, .02, 1.1, METAL, 0, Math.PI / 2); tr.box(-.25, 1.0, .07, .4, .6, .04, 0x9bd17a).box(.25, 1.0, .07, .4, .6, .04, 0xffcd4d);
    ceilLamp(lv, -6, 4.2, 0xf0fbff, 3.4, .32);
  }
  /* ================= UPSTAIRS HALL (landing) ================= */
  {
    const lv = 2;
    rug(lv, .5, -3.5, 1.4, 4.0, 2);
    const co = P(.5, -6.7, lv); co.box(0, .8, 0, 1.4, .06, .4, WOOD_L); for(const s of [-1, 1]) co.box(s * .65, .4, 0, .06, .8, .36, WOOD_L); co.col(0, 0, 1.4, .42, .85);
    spot('note', co, .35, .83, 0); spot('jar', co, -.35, .83, 0);
    windowAt(lv, .5, -6.9, 0, { w:1.0, h:1.0, sill:1.15, curt:0xc9a2ff, front:true });
    plant(P(2.45, -6.45, lv), .9); plant(P(.5, 6.5, lv), .8);
    pedestalVase(lv, -1.5, -1.0, 0xffcd4d);
    picture(lv, 2.88, 1.8, -1.6, -Math.PI / 2, .8, .6, 0, 0xffffff);
    ceilLamp(lv, .5, -3.6); ceilLamp(lv, .5, 6.0, 0xfff2cc, 3.0, .28);
  }
  /* ================= GRANDMA NONA'S ROOM (upper floor, east) ================= */
  let nonaBed;
  {
    const lv = 2;
    const bp = P(8.75, .5, lv, -Math.PI / 2);   // head on the east wall
    bed(bp, { w:2.0, l:2.3, blanket:0xff9ec4, blanket2:0xffffff, pillow:0xffffff, frame:0xb5654a, side:1 });
    nonaBed = { x:8.75, z:.5, lv, headX:9.6, footX:7.6, top:LY[lv] + .68, out:{ x:7.0, z:-.6 } };
    for(const s of [-1, 1]){ const n = P(9.65, .5 + s * 1.45, lv, -Math.PI / 2); n.box(0, .3, 0, .5, .6, .45, 0xb5654a); n.col(0, 0, .5, .45, .62); tableLamp(n, 0, .6, 0, 0xffe0e8); if(s > 0) spot('note', n, .05, .6, .15); }
    wardrobe(P(5.0, -6.6, lv), { col:0xc98fb0, door:0xe0aac8, trim:WHITE, w:1.6 });
    const dr = P(8.0, -6.7, lv); dr.box(0, .45, 0, 1.4, .9, .5, 0xb5654a); for(let i = 0; i < 3; i++) dr.box(0, .2 + i * .27, .26, 1.3, .22, .02, 0xd08068); dr.col(0, 0, 1.4, .52, .95);
    dr.rb(0, 1.55, -.2, .9, 1.1, .05, 0xd8eef7); dr.box(0, 1.55, -.23, 1.0, 1.2, .04, GOLD);
    spot('jar', dr, -.35, .9, 0); spot('pliers', dr, .4, .9, 0);
    // rocking chair + knitting basket
    const rc = P(4.3, 4.6, lv, Math.PI * .8); rc.box(0, .45, 0, .6, .06, .55, WOOD).box(0, .95, -.26, .6, .9, .05, WOOD); for(const s of [-1, 1]){ rc.g(GEO.torus, s * .28, .1, 0, .5, .5, .3, WOOD_D, 0, Math.PI / 2, 0); rc.box(s * .28, .3, 0, .05, .4, .05, WOOD); }
    rc.rb(0, .52, .02, .5, .1, .45, 0xff9ec4); rc.col(0, 0, .75, .8, 1.2);
    const kb = P(5.1, 5.6, lv); kb.cyl(0, .15, 0, .22, .3, 0xd9b07c).sph(-.05, .32, 0, .1, .1, .1, 0xff8fb8).sph(.08, .3, .05, .09, .09, .09, 0x8fd0ff); kb.col(0, 0, .44, .44, .4);
    rug(lv, 6.6, .5, 2.6, 3.4, 3, Math.PI / 2);
    windowAt(lv, 9.9, -3.8, -Math.PI / 2, { curt:0xffb8d2 }); windowAt(lv, 6.5, 6.9, Math.PI, { curt:0xffb8d2 });
    picture(lv, 3.12, 1.8, .5, Math.PI / 2, .9, 1.0, 2, 0xc59a3e);
    plant(P(9.4, 6.4, lv), .9);
    ceilLamp(lv, 6.5, -1.5, 0xffe8ee, 3.8, .26);
  }
  /* ================= BASEMENT ================= */
  {
    const lv = 0;
    const wm = P(4.0, 6.55, lv, Math.PI); wm.rb(0, .45, 0, .8, .9, .75, WHITE); wm.cyl(0, .5, .38, .26, .04, 0x5a7fa8, Math.PI / 2); wm.cyl(0, .5, .4, .2, .02, 0x8fd0ff, Math.PI / 2, 0); wm.col(0, 0, .82, .78, .95);
    const dy = P(5.0, 6.55, lv, Math.PI); dy.rb(0, .45, 0, .8, .9, .75, WHITE); dy.cyl(0, .5, .38, .26, .04, 0x9aa0a8, Math.PI / 2); dy.col(0, 0, .82, .78, .95);
    const bkt = P(6.1, 6.4, lv); bkt.cyl(0, .25, 0, .26, .5, 0x8fd0ff); bkt.sph(0, .5, 0, .22, .08, .22, 0xff9ec4); bkt.col(0, 0, .55, .55, .6);
    // workbench with a pegboard
    const wb = P(9.6, 3.0, lv, -Math.PI / 2); table(wb, { w:2.2, d:.8, h:.9, col:WOOD_L }); wb.box(0, 1.6, -.38, 2.0, 1.0, .04, 0xc9a77a);
    for(let i = 0; i < 5; i++) wb.box(-.8 + i * .4, 1.6, -.34, .06, .4 + (i % 2) * .2, .04, [0xd4553f, 0x4f81bd, 0x6aa84f][i % 3]);
    spot('pliers', wb, .4, .9, .1); spot('pliers', wb, -.6, .9, .05);
    const sh = P(3.25, -1.5, lv, Math.PI / 2); shelf(sh, { w:2.0, h:1.8, d:.4, col:METAL, books:false, n:3 });
    for(let i = 0; i < 7; i++) sh.cyl(-.8 + i * .26, .66 + (i % 3) * .58, 0, .09, .2, [0xff9a3c, 0xffcd4d, 0xd4553f, 0x9bd17a][i % 4]);
    spot('note', sh, .5, 1.2, 0); spot('jar', sh, -.4, .6, 0);
    // box fort (hide)
    const bf = P(5.4, -5.6, lv);
    boxPile(bf, [[-.75, 0, 0, .6, .6, .6], [.75, 0, 0, .6, .6, .6], [-.75, .6, 0, .55, .5, .55, 0xd9ab72], [.75, .6, .05, .55, .55, .55], [0, 0, -.55, .9, .7, .5, 0xd9ab72], [0, .7, -.55, .7, .4, .5]]);
    bf.col(-.75, 0, .62, .62, 1.15); bf.col(.75, 0, .62, .62, 1.15); bf.col(0, -.55, .92, .52, 1.1);
    hide('boxes', bf, { in:[0, 0], cam:[0, .55, .05], look:[0, .6, 3.5], out:[0, .9] });
    const whz = P(9.4, 6.4, lv); whz.cyl(0, .9, 0, .38, 1.8, 0xdfe4ea); whz.cyl(0, 1.85, 0, .2, .2, METAL); whz.col(0, 0, .8, .8, 1.9, { tall:true });
    // nightlight (warm star) + a dim bulb
    const nl = P(3.12, 2.6, lv, Math.PI / 2); nl.g(K.starGeo, 0, .5, .03, .09, .09, .03, 0xfff0a0, 0, 0, 0, 'emit'); const nw = nl.w(0, .5, .2); lamp(lv, nw.x, nw.y, nw.z, 2.6, .55, 1.4, 0xffe27a);
    const bl = P(6.5, 0, lv); bl.cyl(0, 2.7, 0, .01, .6, 0x333333); bl.g(GEO.sm, 0, 2.35, 0, .12, .15, .12, 0xfff3c0, 0, 0, 0, 'emit'); lamp(lv, 6.5, LY[lv] + 2.3, 0, 4.5, .42, 1.6);
    rug(lv, 6.8, 2.6, 2.0, 2.0, 1);
  }
  /* ================= ATTIC ================= */
  {
    const lv = 3;
    const tr = P(4.4, -4.0, lv); tr.rb(0, .32, 0, 1.4, .64, .75, 0x9a6038); tr.box(0, .66, 0, 1.42, .1, .77, 0x8a5a34); for(const s of [-1, 1]) tr.box(s * .45, .35, 0, .06, .66, .79, GOLD); tr.box(0, .45, .39, .14, .18, .03, GOLD);
    tr.col(0, 0, 1.45, .8, .75);
    hide('trunk', tr, { in:[0, 0], cam:[0, .62, .3], look:[0, .7, 3.6], out:[0, 1.0] });
    const rh = P(-4.2, -2.6, lv, .6); rh.g(GEO.torus, 0, .12, 0, .6, .6, .4, 0xd4553f, 0, Math.PI / 2, 0); rh.rb(0, .55, 0, .28, .3, .75, 0xf2e6d0); rh.sph(0, .85, .36, .14, .16, .22, 0xf2e6d0); rh.box(0, .72, -.1, .2, .06, .3, 0xd4553f);
    for(const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) rh.box(a * .12, .3, b * .25, .05, .45, .05, 0xf2e6d0); rh.col(0, 0, .5, 1.1, .9);
    const ot = P(1.2, -4.2, lv); table(ot, { w:1.2, d:.7, h:.72, col:WOOD_D }); spot('jar', ot, .2, .72, 0); spot('note', ot, -.3, .72, .1);
    const tb = P(-5.4, 3.5, lv); tb.box(0, .2, 0, .7, .4, .35, 0xd4553f).box(0, .45, 0, .4, .08, .1, 0x555555); tb.col(0, 0, .72, .4, .5); spot('pliers', tb, 0, .5, 0);
    const bp = P(5.8, 3.4, lv); boxPile(bp, [[0, 0, 0, .7, .6, .7], [.1, .6, 0, .55, .45, .55, 0xd9ab72], [-.8, 0, .1, .6, .5, .6]]); bp.col(0, 0, .75, .75, 1.1); bp.col(-.8, .1, .65, .65, .55);
    spot('pliers', bp, -.8, .5, .1);
    const bx = P(-5.8, -3.8, lv); boxPile(bx, [[0, 0, 0, .7, .7, .7, 0xd9ab72], [.75, 0, .1, .6, .5, .6]]); bx.col(0, 0, .72, .72, .7); bx.col(.75, .1, .62, .62, .5);
    // old mirror (leaning) and a lamp
    const mi = P(6.6, -1.5, lv, -Math.PI / 2); mi.box(0, .8, 0, .7, 1.4, .06, GOLD, undefined, -.15).box(0, .8, .04, .58, 1.26, .02, 0xd8eef7, 'emit', -.15); mi.col(0, 0, .75, .3, 1.5);
    floorLamp(P(-6.3, 1.0, lv), 0xffd89a);
    // round windows at the gables (moonlight)
    for(const sx of [-1, 1]){ const p = P(sx * 6.88, 0, lv, -sx * Math.PI / 2); p.g(GEO.cyl, 0, 1.9, -.01, .45, .02, .45, 0xffffff, Math.PI / 2, 0, 0, 'glass', 'none'); p.g(GEO.torus, 0, 1.9, .02, .48, .48, .5, WHITE); }
    for(const [x, z] of [[-3, 0], [3.5, -1]]){ MAIN.furn.add(GEO.cyl, x, LY[lv] + 3.0, z, .01, .7, .01, 0, 0, 0, 0x333333, lv); MAIN.emit.add(GEO.sm, x, LY[lv] + 2.6, z, .11, .14, .11, 0, 0, 0, 0xfff3c0, lv); lamp(lv, x, LY[lv] + 2.55, z, 4.2, .4, 1.8); }
    rug(lv, 2.5, -1.8, 2.4, 2.4, 0);
  }

  /* ---------------- squeaky toys and creaky boards (fixed candidate places) ---------------- */
  [[-6.8, -3.0, 2], [-4.6, -4.8, 2], [.6, 1.5, 2], [-.2, -4.6, 2], [5.6, -2.4, 2], [-5.0, -3.6, 1], [.0, -.2, 1], [1.0, 4.2, 1], [5.2, -2.6, 1], [7.0, 3.6, 1],
   [-6.2, 4.6, 2], [6.5, -2.4, 0], [5.6, 1.6, 0], [-1.6, -1.6, 3], [3.0, 1.6, 3], [-3.6, 1.8, 3]].forEach(([x, z, lv]) => SPOTS.toy.push({ x, z, lv, y:LY[lv] }));
  [[.5, -3.0, 1], [-.6, 2.2, 1], [-4.4, -.4, 1], [6.0, -3.6, 1], [.6, -2.2, 2], [.5, 2.6, 2], [-5.4, -2.8, 2], [6.0, 2.6, 2], [-6.4, 3.2, 2], [0, -2.6, 3], [4.6, 1.0, 3], [7.6, -4.0, 0]]
    .forEach(([x, z, lv]) => SPOTS.creak.push({ x, z, lv, y:LY[lv] }));

  /* ---------------- outside: roof, garden, fence, trees ---------------- */
  const EXTW = 0xffc89a, ROOFC = 0xd0634c;
  {
    // roof slopes (front slope is separate, hidden in the cut-away view)
    const rise = 3.7, half = 7.7, len = Math.hypot(half, rise), ang = Math.atan2(rise, half);
    for(const s of [-1, 1]){
      const set = s < 0 ? FRONT : MAIN;
      const g = new THREE.BoxGeometry(21.4, .22, len + .2, 10, 1, 5).toNonIndexed();
      g.rotateX(s * ang); g.translate(0, 6.4 + rise / 2, s * half / 2);
      set.roof.push(g, (x, y, z, nx, ny) => ny > .3 ? ROOFC : 0xe8c49a, 3, 'none', (x, y, z) => [x / 2.2, Math.abs(z) / 2.2]); g.dispose();
      // attic lining (warm wood)
      const g2 = new THREE.BoxGeometry(14, .04, len - 1.6, 8, 1, 4).toNonIndexed(); g2.rotateX(s * ang); g2.translate(0, 6.4 + rise / 2 - .2, s * (half / 2 - .1));
      set.plain.push(g2, 0xe2c193, 3, 'furn'); g2.dispose();
    }
    // gables
    for(const sx of [-1, 1]){
      const sh = new THREE.Shape(); sh.moveTo(-7.1, 0); sh.lineTo(7.1, 0); sh.lineTo(0, 3.65); sh.closePath();
      const g = new THREE.ExtrudeGeometry(sh, { depth:.2, bevelEnabled:false }).toNonIndexed(); g.rotateY(Math.PI / 2); g.translate(sx * 10 - .1, 6.4, 0);
      MAIN.ext.push(g, EXTW, 3, 'none', (x, y, z) => [z / 3, y / 3]); g.dispose();
    }
    // chimney
    MAIN.ext.add(GEO.box, -7.5, 9.2, 2.5, .9, 2.4, .9, 0, 0, 0, 0xc7a58a, 3).add(GEO.box, -7.5, 10.45, 2.5, 1.05, .15, 1.05, 0, 0, 0, 0xb08a70, 3);
    // porch: steps, little roof, lights
    MAIN.ext.add(GEO.box, .5, .1, -7.7, 3.0, .2, 1.2, 0, 0, 0, 0xd9cbb5, 1).add(GEO.box, .5, -.05, -8.5, 3.4, .1, .6, 0, 0, 0, 0xcdbb9f, 1);
    FRONT.ext.add(GEO.box, .5, 3.0, -7.75, 3.2, .12, 1.4, -.2, 0, 0, ROOFC, 1);
    for(const s of [-1, 1]) FRONT.ext.add(GEO.cyl, .5 + s * 1.45, 1.5, -8.3, .07, 3.0, .07, 0, 0, 0, WHITE, 1);
    for(const s of [-1, 1]) FRONT.emit.add(GEO.sm, .5 + s * 1.1, 2.5, -7.18, .1, .14, .1, 0, 0, 0, 0xffe7a0, 1);
  }
  const yard = new THREE.Group(); scene.add(yard);
  {
    const gm = new THREE.Mesh(new THREE.CircleGeometry(70, 48).rotateX(-Math.PI / 2), new THREE.MeshLambertMaterial({ map:TX.grass })); TX.grass.repeat.set(40, 40);
    gm.position.y = -.02; gm.receiveShadow = true; yard.add(gm);
    const Y = new Bag();
    // stepping-stone path to the gate
    for(let i = 0; i < 9; i++) Y.add(GEO.cyl, .5 + Math.sin(i * 1.3) * .2, .0, -9.4 - i * .95, .42, .06, .32, 0, i, 0, 0xd8d2c4, 1);
    // picket fence
    const fx0 = -17, fx1 = 17, fz0 = -18, fz1 = 13;
    const fence = (ax, az, bx, bz) => { const n = Math.ceil(Math.hypot(bx - ax, bz - az) / .32); for(let i = 0; i <= n; i++){ const t = i / n, x = ax + (bx - ax) * t, z = az + (bz - az) * t; if(Math.abs(x - .5) < 1.1 && az === fz0 && bz === fz0) continue; Y.add(GEO.box, x, .5, z, .12, 1.0, .06, 0, Math.atan2(bx - ax, bz - az), 0, 0xffffff, 1); }
      Y.add(GEO.box, (ax + bx) / 2, .65, (az + bz) / 2, Math.abs(bx - ax) + .1, .07, Math.abs(bz - az) + .1, 0, 0, 0, 0xf2ece0, 1).add(GEO.box, (ax + bx) / 2, .3, (az + bz) / 2, Math.abs(bx - ax) + .1, .07, Math.abs(bz - az) + .1, 0, 0, 0, 0xf2ece0, 1); };
    fence(fx0, fz0, fx1, fz0); fence(fx0, fz1, fx1, fz1); fence(fx0, fz0, fx0, fz1); fence(fx1, fz0, fx1, fz1);
    // trees and bushes
    const tree = (x, z, s) => { Y.add(GEO.cyl, x, 1.1 * s, z, .22 * s, 2.2 * s, .22 * s, 0, 0, 0, 0x8a5a34, 1); [[0, 2.6, 0, 1.3], [-.7, 2.2, .2, .95], [.7, 2.3, -.2, 1.0], [0, 3.3, .1, .9]].forEach(([dx, dy, dz, r], i) => Y.add(GEO.sph, x + dx * s, dy * s, z + dz * s, r * s, r * s, r * s, 0, 0, 0, i % 2 ? 0x4fae4a : 0x5cbf55, 1)); };
    [[-13, -12, 1.2], [13, -11, 1.1], [-14, 6, 1.3], [14, 8, 1.2], [-6, 11, 1.0], [7, 11.5, 1.1], [-20, -4, 1.4], [21, 2, 1.5], [-3, -24, 1.4], [9, -26, 1.6]].forEach(t => tree(...t));
    const bush = (x, z, c) => { Y.add(GEO.sph, x, .35, z, .6, .5, .6, 0, 0, 0, 0x4f9e48, 1); for(let i = 0; i < 5; i++){ const a = i * 1.26; Y.add(GEO.sm, x + Math.cos(a) * .45, .55 + (i % 2) * .15, z + Math.sin(a) * .45, .09, .09, .09, 0, 0, 0, c, 1); } };
    [[-4, -8, 0xff6f91], [-7, -8, 0xffcd4d], [-10, -8, 0xffffff], [4, -8, 0xffcd4d], [7, -8, 0xff6f91], [10, -8, 0xffffff], [-11, -2, 0xff6f91], [11, 0, 0xffcd4d]].forEach(b => bush(...b));
    // a swing
    const sx = 10, sz = -13; Y.add(GEO.cyl, sx - 1.2, 1.3, sz, .07, 2.7, .07, 0, 0, .2, 0xd4553f, 1).add(GEO.cyl, sx + 1.2, 1.3, sz, .07, 2.7, .07, 0, 0, -.2, 0xd4553f, 1).add(GEO.cyl, sx, 2.6, sz, .07, 2.4, .07, 0, 0, Math.PI / 2, 0xd4553f, 1);
    Y.add(GEO.cyl, sx - .25, 1.75, sz, .015, 1.7, .015, 0, 0, 0, 0x8a5a34, 1).add(GEO.cyl, sx + .25, 1.75, sz, .015, 1.7, .015, 0, 0, 0, 0x8a5a34, 1).add(GEO.box, sx, .9, sz, .7, .06, .3, 0, 0, 0, 0xffcd4d, 1);
    // mailbox
    Y.add(GEO.cyl, -1.5, .55, -17.3, .05, 1.1, .05, 0, 0, 0, 0x8a5a34, 1).add(GEO.rbox, -1.5, 1.2, -17.3, .3, .3, .5, 0, 0, 0, 0x4f81bd, 1);
    const ym = Y.mesh(new THREE.MeshLambertMaterial({ vertexColors:true }), null); ym.castShadow = true; ym.receiveShadow = true; yard.add(ym);
  }

  /* ---------------- bake vertex colours: corner darkening and warm lamp pools ---------------- */
  const furnCols = colliders.filter(c => !c.wall);
  function bake(lv, x, y, z, kind, nx, nz){
    const r = roomAt(lv, x + nx * .05, z + nz * .05) || roomAt(lv, x, z);
    const base = r ? r.lit : .92;
    let ao = 1;
    const h = y - LY[lv];
    if(kind === 'floor' || kind === 'ceil'){
      if(r){ const d = Math.min(x - r.x0, r.x1 - x, z - r.z0, r.z1 - z); ao *= (kind === 'floor' ? .66 : .78) + (kind === 'floor' ? .34 : .22) * ss(0, 1.2, d); }
      if(kind === 'floor') for(const c of furnCols){ if(c.y0 > y + .2 || c.y1 < y + .05) continue; const dx = Math.max(c.x0 - x, 0, x - c.x1), dz = Math.max(c.z0 - z, 0, z - c.z1); const d = Math.hypot(dx, dz); if(d < .6) ao *= .7 + .3 * ss(0, .6, d); }
    } else if(kind === 'wall'){
      ao *= .7 + .3 * ss(0, .9, h); ao *= 1 - .16 * ss(2.2, 3.0, h);
      if(r){ const d = Math.abs(nx) > .5 ? Math.min(z - r.z0, r.z1 - z) : Math.min(x - r.x0, r.x1 - x); ao *= .8 + .2 * ss(0, .9, d); }
    } else if(kind === 'furn'){ ao *= .78 + .22 * ss(0, .5, h); }
    let wr = 0, wg = 0, wb = 0;
    for(const l of LAMPS[lv]){ const d2 = (x - l.x) ** 2 + (y - l.y) ** 2 * .5 + (z - l.z) ** 2; const f = l.k / (1 + d2 / (l.r * l.r)); wr += f; wg += f * .8; wb += f * .55; }
    const a = base * ao;
    return [Math.min(1.35, a * (.86 + wr)), Math.min(1.3, a * (.86 + wg)), Math.min(1.25, a * (.88 + wb))];
  }

  /* ---------------- materials and meshes ---------------- */
  const furnMat = new THREE.MeshLambertMaterial({ vertexColors:true });
  const plainMat = new THREE.MeshLambertMaterial({ vertexColors:true });
  const wallMat = new THREE.MeshLambertMaterial({ vertexColors:true, map:TX.wall });
  const extMat = new THREE.MeshLambertMaterial({ vertexColors:true, map:TX.siding });
  const emitMat = new THREE.MeshBasicMaterial({ vertexColors:true });
  const glassMat = new THREE.MeshBasicMaterial({ map:TX.skyEve });
  const extGlassMat = new THREE.MeshBasicMaterial({ color:0xffd98a });
  const picMat = new THREE.MeshLambertMaterial({ map:TX.pics, vertexColors:true });
  const rugMat = new THREE.MeshLambertMaterial({ map:TX.rugs, vertexColors:true, alphaTest:.5, transparent:false });
  TX.rugs.wrapS = TX.rugs.wrapT = THREE.ClampToEdgeWrapping;
  rugMat.polygonOffset = true; rugMat.polygonOffsetFactor = -1;
  const roofMat = new THREE.MeshLambertMaterial({ vertexColors:true, map:TX.roof });
  const house = new THREE.Group(); scene.add(house);
  const frontGrp = new THREE.Group(); scene.add(frontGrp);
  function addSet(set, grp){
    const out = {};
    const put = (name, mat, cast, rec, bake2) => { if(!set[name].p.length) return; const m = set[name].mesh(mat, bake2 ? bake : null); m.castShadow = cast; m.receiveShadow = rec; grp.add(m); out[name] = m; };
    put('furn', furnMat, true, true, true); put('plain', plainMat, false, true, true); put('wall', wallMat, false, true, true);
    put('emit', emitMat, false, false, false); put('glass', glassMat, false, false, false); put('extGlass', extGlassMat, false, false, false);
    put('pic', picMat, false, true, true); put('rug', rugMat, false, true, true); put('roof', roofMat, false, true, false);
    if(set.ext.p.length){
      // roof triangles use the roof texture: split by colour (roof is red-ish)
      const m = set.ext.mesh(extMat, null); m.receiveShadow = true; grp.add(m); out.ext = m;
    }
    return out;
  }
  const mainMeshes = addSet(MAIN, house), frontMeshes = addSet(FRONT, frontGrp);
  const FLOOR_MAT = { wood:TX.wood, tile:TX.tile, kitchen:TX.kitchen, bath:TX.bath, carpet:TX.carpet, concrete:TX.concrete, attic:TX.attic };
  for(const k in floorBags){ const m = floorBags[k].mesh(new THREE.MeshLambertMaterial({ vertexColors:true, map:FLOOR_MAT[k] }), bake); m.receiveShadow = true; house.add(m); }

  /* ---------------- front door: two leaves, a deadbolt, a chain and a colour padlock ---------------- */
  const door = new THREE.Group(); scene.add(door);
  const leaves = [];
  {
    const DC = 0x2f8f9d, DC2 = 0x3fa9b8;
    for(const s of [-1, 1]){
      const hinge = new THREE.Group(); hinge.position.set(s < 0 ? -.3 : 1.3, 0, -7); door.add(hinge);
      const M = new K.Merge(), dx = -s * .4;
      M.add(GEO.box, dx, 1.3, 0, .78, 2.58, .1, 0, 0, 0, DC);
      M.add(GEO.box, dx, .7, .06, .56, .9, .02, 0, 0, 0, DC2).add(GEO.box, dx, 1.85, .06, .56, .9, .02, 0, 0, 0, DC2);
      M.add(GEO.box, dx, 1.85, .075, .4, .7, .01, 0, 0, 0, 0xffe7a0);
      M.add(GEO.sph, -s * .7, 1.15, .1, .05, .05, .05, 0, 0, 0, GOLD).add(GEO.sph, -s * .7, 1.15, -.1, .05, .05, .05, 0, 0, 0, GOLD);
      const m = new THREE.Mesh(M.geometry(), new THREE.MeshLambertMaterial({ vertexColors:true })); m.castShadow = true; hinge.add(m);
      leaves.push(hinge);
    }
  }
  const LOCK = {};
  {
    const lm = new THREE.MeshLambertMaterial({ vertexColors:true });
    // deadbolt: brass plate with a keyhole, at the middle seam
    const M = new K.Merge(); M.add(GEO.box, 0, 0, 0, .22, .34, .03, 0, 0, 0, GOLD).add(GEO.cyl8, 0, .04, .02, .035, .02, .035, Math.PI / 2, 0, 0, 0x2a1a08).add(GEO.box, 0, -.03, .02, .02, .07, .01, 0, 0, 0, 0x2a1a08);
    const kp = new THREE.Mesh(M.geometry(), lm); kp.position.set(.5, 1.05, -6.9); door.add(kp);
    const key = makeKeyMesh(THREE, K); key.scale.setScalar(.8); key.position.set(.5, 1.09, -6.8); key.rotation.set(0, Math.PI / 2, 0); key.visible = false; door.add(key);
    LOCK.key = { plate:kp, key, done:false, x:.5, y:1.05, z:-6.85 };
    // chain from the left leaf to the right leaf, sagging
    const ch = new THREE.Group(); const CM = new K.Merge();
    for(let i = 0; i < 11; i++){ const t = i / 10, x = -.05 + t * 1.1, y = 1.62 - Math.sin(t * Math.PI) * .16; CM.add(GEO.torus, x, y, 0, .055, .085, .06, 0, i % 2 ? Math.PI / 2 : 0, Math.atan2(-Math.cos(t * Math.PI) * .5, 1), METAL); }
    CM.add(GEO.box, -.08, 1.62, -.02, .1, .16, .03, 0, 0, 0, 0x8a959e).add(GEO.box, 1.08, 1.62, -.02, .1, .16, .03, 0, 0, 0, 0x8a959e);
    const chm = new THREE.Mesh(CM.geometry(), lm); chm.castShadow = true; ch.add(chm); ch.position.set(0, 0, -6.86); door.add(ch);
    LOCK.chain = { obj:ch, done:false, x:.5, y:1.5, z:-6.85 };
    // padlock on a hasp with three coloured dots on its face
    const pl = new THREE.Group(); const PM = new K.Merge();
    PM.add(GEO.rbox, 0, 0, 0, .34, .3, .14, 0, 0, 0, 0xe7b43a).add(GEO.torus, 0, .17, 0, .12, .13, .1, 0, 0, 0, METAL).add(GEO.box, -.2, .22, -.02, .14, .06, .03, 0, 0, 0, 0x8a959e).add(GEO.box, .2, .22, -.02, .14, .06, .03, 0, 0, 0, 0x8a959e);
    const plm = new THREE.Mesh(PM.geometry(), lm); plm.castShadow = true; pl.add(plm);
    const dots = []; for(let i = 0; i < 3; i++){ const d = new THREE.Mesh(GEO.sm, new THREE.MeshBasicMaterial({ color:0xffffff })); d.scale.set(.035, .035, .015); d.position.set(-.08 + i * .08, -.03, .075); pl.add(d); dots.push(d); }
    pl.position.set(.5, .62, -6.82); door.add(pl);
    LOCK.pad = { obj:pl, dots, done:false, x:.5, y:.62, z:-6.85 };
  }
  const doorCol = { x0:-.3, x1:1.3, z0:-7.1, z1:-6.9, y0:0, y1:2.6, wall:true, door:true };
  colliders.push(doorCol);

  /* ---------------- sky ---------------- */
  const skyGeo = new THREE.SphereGeometry(300, 24, 16), skyCol = new Float32Array(skyGeo.attributes.position.count * 3);
  skyGeo.setAttribute('color', new THREE.BufferAttribute(skyCol, 3));
  const sky = new THREE.Mesh(skyGeo, new THREE.MeshBasicMaterial({ vertexColors:true, side:THREE.BackSide, fog:false, depthWrite:false })); sky.renderOrder = -1; scene.add(sky);
  function paintSky(k){   // k: 0 evening, 1 sunny
    const pa = skyGeo.attributes.position, e0 = new THREE.Color(0x2b2f6e), e1 = new THREE.Color(0xe88f86), s0 = new THREE.Color(0x4fb0ff), s1 = new THREE.Color(0xd8f2ff), a = new THREE.Color(), b = new THREE.Color();
    for(let i = 0; i < pa.count; i++){ const y = Math.max(0, pa.getY(i) / 300), t = Math.pow(y, .55);
      a.copy(e1).lerp(e0, t); b.copy(s1).lerp(s0, t); a.lerp(b, k); skyCol[i * 3] = a.r; skyCol[i * 3 + 1] = a.g; skyCol[i * 3 + 2] = a.b; }
    skyGeo.attributes.color.needsUpdate = true;
  }
  paintSky(0);
  const sunSpr = new THREE.Sprite(new THREE.SpriteMaterial({ map:K.glowTex, color:0xfff2a0, transparent:true, depthWrite:false, blending:THREE.AdditiveBlending, fog:false })); sunSpr.scale.set(60, 60, 1); sunSpr.position.set(-60, 90, -200); sunSpr.visible = false; scene.add(sunSpr);
  const moonSpr = new THREE.Sprite(new THREE.SpriteMaterial({ map:K.glowTex, color:0xfff6d8, transparent:true, depthWrite:false, blending:THREE.AdditiveBlending, fog:false })); moonSpr.scale.set(30, 30, 1); moonSpr.position.set(80, 110, -200); scene.add(moonSpr);
  function setSunny(on){ paintSky(on ? 1 : 0); glassMat.map = on ? TX.skySun : TX.skyEve; glassMat.needsUpdate = true; extGlassMat.color.set(on ? 0xbfe6ff : 0xffd98a); sunSpr.visible = on; moonSpr.visible = !on; }

  /* ---------------- portal graph for the grandma ---------------- */
  const PORT = [];
  for(const d of DOORS){
    const off = .6, a = d.ax === 'z' ? roomAt(d.lv, d.x, d.z - off) : roomAt(d.lv, d.x - off, d.z), b = d.ax === 'z' ? roomAt(d.lv, d.x, d.z + off) : roomAt(d.lv, d.x + off, d.z);
    if(a && b) PORT.push({ x:d.x, z:d.z, y:LY[d.lv], rooms:[a.id, b.id] });
  }
  for(const s of STAIRS){
    const dl = Math.sign(s.zLow - s.zHigh) * .7, dh = Math.sign(s.zHigh - s.zLow) * .7;
    const lowR = roomAt(s.lo, s.cx, s.zLow + dl), highR = roomAt(s.hi, s.cx, s.zHigh + dh);
    PORT.push({ x:s.cx, z:s.zLow + dl, y:LY[s.lo], rooms:[s.id, lowR && lowR.id] });
    PORT.push({ x:s.cx, z:s.zHigh + dh, y:LY[s.hi], rooms:[s.id, highR && highR.id] });
  }
  const d3 = (a, b) => Math.hypot(a.x - b.x, a.z - b.z) + Math.abs(a.y - b.y) * 1.2;
  function path(from, to){
    const rf = roomOf(from.x, from.y, from.z), rt = roomOf(to.x, to.y, to.z);
    if(!rf || !rt || rf === rt) return [to];
    const n = PORT.length, dist = new Array(n).fill(Infinity), prev = new Array(n).fill(-1), done = new Array(n).fill(false);
    for(let i = 0; i < n; i++) if(PORT[i].rooms.includes(rf)) dist[i] = d3(from, PORT[i]);
    let best = Infinity, bestI = -1;
    for(;;){
      let u = -1; for(let i = 0; i < n; i++) if(!done[i] && dist[i] < Infinity && (u < 0 || dist[i] < dist[u])) u = i;
      if(u < 0) break; done[u] = true;
      if(PORT[u].rooms.includes(rt)){ const c = dist[u] + d3(PORT[u], to); if(c < best){ best = c; bestI = u; } }
      for(let v = 0; v < n; v++){ if(done[v] || v === u) continue; if(!PORT[v].rooms.some(r => r && PORT[u].rooms.includes(r))) continue; const c = dist[u] + d3(PORT[u], PORT[v]); if(c < dist[v]){ dist[v] = c; prev[v] = u; } }
    }
    if(bestI < 0) return [to];
    const out = [to]; for(let i = bestI; i >= 0; i = prev[i]) out.unshift({ x:PORT[i].x, y:PORT[i].y, z:PORT[i].z });
    return out;
  }

  /* ---------------- queries ---------------- */
  function blocked(x, y, z, r = 0){ for(const c of colliders){ if(c.off) continue; if(y < c.y0 || y > c.y1) continue; if(x > c.x0 - r && x < c.x1 + r && z > c.z0 - r && z < c.z1 + r) return c; } return null; }
  /* can a see b? (both {x,y,z} at eye/chest height) */
  function los(a, b){
    const d = Math.hypot(b.x - a.x, b.z - a.z), n = Math.ceil(d / .2);
    for(let i = 1; i < n; i++){ const t = i / n; const c = blocked(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t, a.z + (b.z - a.z) * t); if(c) return false; }
    // floors/ceilings between levels
    if(Math.abs(lvOf(a.y - 1) - lvOf(b.y - .6)) > 0 && !stairAt(a.x, a.z, a.y - 1.4) && !stairAt(b.x, b.z, b.y - .7)) return false;
    return true;
  }
  /* push a circle (radius r) at height y out of every box; returns true if it touched something */
  function collide(o, r, y, cb){
    let hit = false;
    for(let it = 0; it < 2; it++) for(const c of colliders){
      if(c.off) continue; if(c.y1 <= y + .15 || c.y0 >= y + 1.0) continue;
      const nx = clamp(o.x, c.x0, c.x1), nz = clamp(o.z, c.z0, c.z1), dx = o.x - nx, dz = o.z - nz, d2 = dx * dx + dz * dz;
      if(d2 >= r * r) continue;
      hit = true; if(cb) cb(c);
      if(d2 > 1e-8){ const d = Math.sqrt(d2), k = (r - d) / d; o.x += dx * k; o.z += dz * k; }
      else { const l = o.x - c.x0, rr = c.x1 - o.x, f = o.z - c.z0, b = c.z1 - o.z, m = Math.min(l, rr, f, b);
        if(m === l) o.x = c.x0 - r; else if(m === rr) o.x = c.x1 + r; else if(m === f) o.z = c.z0 - r; else o.z = c.z1 + r; }
    }
    return hit;
  }
  function freePoint(roomId, rnd = Math.random){
    const r = ROOM[roomId]; if(!r) return null;
    for(let i = 0; i < 30; i++){ const x = r.x0 + .8 + rnd() * (r.x1 - r.x0 - 1.6), z = r.z0 + .8 + rnd() * (r.z1 - r.z0 - 1.6), y = LY[r.lv];
      if(holeAt(r.lv, x, z) || blocked(x, y + .5, z, .55)) continue; if(STAIRS.some(s => x > s.x0 - .6 && x < s.x1 + .6 && z > Math.min(s.z0, s.z1) - .6 && z < Math.max(s.z0, s.z1) + .6)) continue; return { x, y, z }; }
    return { x:r.c[0], y:LY[r.lv], z:r.c[1] };
  }
  function setTitle(on){ frontGrp.visible = !on; door.visible = !on; }
  let flick = 0;
  function update(dt, t){ flick += dt; const f = LAMP_GLOW[0]; if(f) f.material.opacity = .7 + Math.sin(t * 9) * .08 + Math.sin(t * 23) * .05; }

  return { LY, ROOMS, ROOM, STAIRS, DOORS, PORT, colliders, HIDES, SPOTS, VASES, LOCK, leaves, doorCol, door, nonaBed, sky, sunSpr,
    lvOf, roomAt, roomOf, groundY, stairAt, rampY, floorAt, blocked, los, collide, path, freePoint, setTitle, setSunny, update, house, frontGrp, yard, TX };
}

/* a little cartoon key (used in the cookie jar, the hand and the lock) */
export function makeKeyMesh(THREE, K){
  const M = new K.Merge();
  M.add(new THREE.TorusGeometry(.09, .03, 8, 18), 0, 0, 0, 1, 1, 1, 0, 0, 0, 0xffc93a);
  M.add(new THREE.BoxGeometry(1, 1, 1), .21, 0, 0, .26, .045, .03, 0, 0, 0, 0xffc93a);
  M.add(new THREE.BoxGeometry(1, 1, 1), .3, -.05, 0, .035, .08, .03, 0, 0, 0, 0xffc93a).add(new THREE.BoxGeometry(1, 1, 1), .24, -.04, 0, .035, .06, .03, 0, 0, 0, 0xffc93a);
  const m = new THREE.Mesh(M.geometry(), new THREE.MeshLambertMaterial({ vertexColors:true, emissive:0x553300 })); m.castShadow = true; return m;
}

/* unit box with rounded edges (radius r of the unit size); scaled freely afterwards */
export function roundBox(THREE, seg = 5, r = .22){
  const g = new THREE.BoxGeometry(1, 1, 1, seg, seg, seg), p = g.attributes.position, n = g.attributes.normal, h = .5 - r;
  const v = new THREE.Vector3(), c = new THREE.Vector3(), d = new THREE.Vector3(), cl = (a) => Math.max(-h, Math.min(h, a));
  for(let i = 0; i < p.count; i++){ v.fromBufferAttribute(p, i); c.set(cl(v.x), cl(v.y), cl(v.z)); d.subVectors(v, c).normalize(); p.setXYZ(i, c.x + d.x * r, c.y + d.y * r, c.z + d.z * r); n.setXYZ(i, d.x, d.y, d.z); }
  return g;
}
