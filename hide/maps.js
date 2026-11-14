/* Bobo Hide & Seek: the three giant rooms (kitchen, kids' bedroom, garden), the toy-sized physics and the bots' map.
   Scale: 1 unit = 10 cm, so a character (1.2 tall) is a 12 cm toy and a kitchen counter is 9.2 tall.
   - boxes: solid axis-aligned boxes (you stand on top, bump into the sides, crawl under raised ones)
   - ramps: leaning boards you can walk up
   - conts: hiding containers (cups, pots, toy box, sock drawer…): walk up and press «اختبي» to hop inside
   - spots: open hiding places (under the sofa, behind the books…) for the bots
   - nav: waypoint graph for the bots; every edge is checked by simulating a bot walking/jumping it */
import { makeTextures } from './textures.js';

export const PHYS = { G:22, JUMP:8.8, STEP:.45, R:.42, H:1.2 };

export function makeMaps(THREE, K, renderer){
  const L = window.L || (a => a);
  const TX = makeTextures(THREE, Math.min(8, renderer.capabilities.getMaxAnisotropy()));
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _s = new THREE.Vector3(), _v = new THREE.Vector3(), _c = new THREE.Color();
  function roundBox(seg = 5, rad = .22){
    const g = new THREE.BoxGeometry(1, 1, 1, seg, seg, seg), p = g.attributes.position, n = g.attributes.normal, inner = .5 - rad;
    for(let i = 0; i < p.count; i++){
      _v.set(p.getX(i), p.getY(i), p.getZ(i)); _s.set(clamp(_v.x, -inner, inner), clamp(_v.y, -inner, inner), clamp(_v.z, -inner, inner));
      _v.sub(_s).normalize(); p.setXYZ(i, _s.x + _v.x * rad, _s.y + _v.y * rad, _s.z + _v.z * rad); n.setXYZ(i, _v.x, _v.y, _v.z);
    }
    return g;
  }
  const GEO = {
    box:new THREE.BoxGeometry(1, 1, 1), rbox:roundBox(), soft:roundBox(6, .4),
    cyl:new THREE.CylinderGeometry(1, 1, 1, 24), cyl8:new THREE.CylinderGeometry(1, 1, 1, 10), cone:new THREE.ConeGeometry(1, 1, 18),
    tub:new THREE.CylinderGeometry(1, .78, 1, 24), sph:new THREE.SphereGeometry(1, 20, 14), sm:new THREE.SphereGeometry(1, 10, 8),
    hemi:new THREE.SphereGeometry(1, 20, 8, 0, Math.PI * 2, 0, Math.PI / 2), torus:new THREE.TorusGeometry(1, .2, 8, 20), disc:new THREE.CircleGeometry(1, 24)
  };
  GEO.disc.rotateX(-Math.PI / 2);
  // materials: one per texture; vertex colours tint them
  const MATS = {};
  function mat(k){
    if(MATS[k]) return MATS[k];
    const map = k === 'plain' ? null : TX[k];
    const rough = { plain:.75, wood:.62, planks:.6, tiles:.35, smallTiles:.3, dots:.95, knit:.95, paper:.9, stone:.85, soil:.95, grass:.95, starPaper:.9, paint:.9, gingham:.9 }[k] || .8;
    return (MATS[k] = new THREE.MeshStandardMaterial({ map, vertexColors:true, roughness:rough, metalness:0 }));
  }
  const TS = { plain:1, wood:6, planks:16, tiles:8, smallTiles:3, dots:4, knit:3, paper:2, stone:6, soil:8, grass:6, starPaper:12, paint:10, gingham:6 };

  /* ---------------- geometry bags (merged per material, world-space UVs, soft floor shading) ---------------- */
  class Bag{
    constructor(k){ this.k = k; this.p = []; this.n = []; this.u = []; this.c = []; }
    add(geo, x, y, z, sx, sy, sz, rx, ry, rz, color, ts){
      const g = geo.index ? geo.toNonIndexed() : geo.clone();
      _m.compose(_v.set(x, y, z), _q.setFromEuler(_e.set(rx, ry, rz, 'YXZ')), _s.set(sx, sy, sz)); g.applyMatrix4(_m);
      const pa = g.attributes.position.array, na = g.attributes.normal.array, sc = 1 / (ts || TS[this.k] || 4);
      _c.set(color);
      for(let i = 0; i < pa.length; i += 3){
        const px = pa[i], py = pa[i + 1], pz = pa[i + 2], nx = Math.abs(na[i]), ny = Math.abs(na[i + 1]);
        this.p.push(px, py, pz); this.n.push(na[i], na[i + 1], na[i + 2]);
        if(ny > .6) this.u.push(px * sc, pz * sc); else if(nx > .6) this.u.push(pz * sc, py * sc); else this.u.push(px * sc, py * sc);
        const f = .74 + .26 * clamp(py / 2.6, 0, 1);       // soft contact shadow near the floor
        this.c.push(_c.r * f, _c.g * f, _c.b * f);
      }
      g.dispose(); return this;
    }
    mesh(){
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(this.n, 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute(this.u, 2)); g.setAttribute('color', new THREE.Float32BufferAttribute(this.c, 3));
      g.computeBoundingSphere(); const m = new THREE.Mesh(g, mat(this.k)); m.castShadow = true; m.receiveShadow = true; return m;
    }
  }

  /* ---------------- physics ---------------- */
  function makePhys(W){
    const { boxes, ramps } = W, R = PHYS.R, H = PHYS.H, STEP = PHYS.STEP;
    const rampY = (r, x, z) => { const t = clamp(((r.ax === 'x' ? x : z) - r.a0) / (r.a1 - r.a0), 0, 1); return r.ya + (r.yb - r.ya) * t; };
    const inRect = (b, x, z, m) => x > b.x0 - m && x < b.x1 + m && z > b.z0 - m && z < b.z1 + m;
    /* the highest surface under (x, z) that you can stand on, coming from height y */
    function support(x, z, y){
      let best = 0; const m = R * .55;
      for(const b of boxes){ if(b.y1 <= y + STEP && b.y1 > best && inRect(b, x, z, m)) best = b.y1; }
      for(const r of ramps){ if(inRect(r, x, z, 0)){ const ry = rampY(r, x, z); if(ry <= y + STEP + .35 && ry > best) best = ry; } }
      return best;
    }
    /* push a circle out of everything that is too tall to step on */
    function collide(o){
      for(let it = 0; it < 2; it++){
        for(const b of boxes){
          if(b.y1 <= o.y + STEP || b.y0 >= o.y + H) continue;
          const cx = clamp(o.x, b.x0, b.x1), cz = clamp(o.z, b.z0, b.z1), dx = o.x - cx, dz = o.z - cz, d2 = dx * dx + dz * dz;
          if(d2 >= R * R) continue;
          if(d2 > 1e-8){ const d = Math.sqrt(d2), k = (R - d) / d; o.x += dx * k; o.z += dz * k; }
          else { // centre inside: leave by the nearest side
            const l = o.x - b.x0, r = b.x1 - o.x, f = o.z - b.z0, k = b.z1 - o.z, mn = Math.min(l, r, f, k);
            if(mn === l) o.x = b.x0 - R; else if(mn === r) o.x = b.x1 + R; else if(mn === f) o.z = b.z0 - R; else o.z = b.z1 + R;
          }
          o.hit = true;
        }
        for(const r of ramps){
          if(!inRect(r, o.x, o.z, 0)) continue;
          const ry = rampY(r, o.x, o.z); if(ry <= o.y + STEP + .35 || r.ylo >= o.y + H) continue;
          const l = o.x - r.x0, rr = r.x1 - o.x, f = o.z - r.z0, k = r.z1 - o.z, mn = Math.min(l, rr, f, k);
          if(mn === l) o.x = r.x0 - .01; else if(mn === rr) o.x = r.x1 + .01; else if(mn === f) o.z = r.z0 - .01; else o.z = r.z1 + .01;
          o.hit = true;
        }
      }
      o.x = clamp(o.x, W.bx0 + R, W.bx1 - R); o.z = clamp(o.z, W.bz0 + R, W.bz1 - R);
    }
    /* one physics step for anything that walks: o {x,y,z,vx,vz,vy,gr}, wanted velocity (wx, wz), jump request */
    function step(o, wx, wz, jump, dt){
      const k = Math.min(1, (o.gr ? 14 : 5) * dt);
      o.vx += (wx - o.vx) * k; o.vz += (wz - o.vz) * k;
      const px = o.x, pz = o.z, py = o.y;
      o.hit = false; o.x += o.vx * dt; o.z += o.vz * dt; collide(o);
      if(jump && o.gr){ o.vy = PHYS.JUMP; o.gr = false; o.jumped = true; }
      o.vy -= PHYS.G * dt; if(o.vy < -30) o.vy = -30;
      let ny = o.y + o.vy * dt;
      if(o.vy > 0){ // bump the head on things above (under the cupboard, under the bed)
        for(const b of boxes){ if(b.y0 >= py + H - .05 && ny + H > b.y0 && inRect(b, o.x, o.z, -R * .2)){ ny = b.y0 - H; o.vy = 0; } }
      }
      const g = support(o.x, o.z, Math.max(py, ny));
      const wasGr = o.gr;
      if(ny <= g){ if(!o.gr && o.vy < -6) o.landed = true; ny = g; o.vy = 0; o.gr = true; }
      else if(wasGr && o.vy <= 0 && ny - g < .5){ ny = g; o.vy = 0; o.gr = true; }   // stick to slopes and small steps down
      else o.gr = false;
      o.y = ny;
      o.moved = Math.hypot(o.x - px, o.z - pz);
    }
    /* is the straight line a→b free of solid boxes? (vision and the camera) */
    function rayHit(ax, ay, az, bx, by, bz, cam = false){
      const dx = bx - ax, dy = by - ay, dz = bz - az; let tmin = 1;
      for(const b of boxes){
        if(cam && b.nocam) continue;
        let t0 = 0, t1 = tmin, ok = true;
        for(const [o, d, lo, hi] of [[ax, dx, b.x0, b.x1], [ay, dy, b.y0, b.y1], [az, dz, b.z0, b.z1]]){
          if(Math.abs(d) < 1e-9){ if(o < lo || o > hi){ ok = false; break; } continue; }
          let ta = (lo - o) / d, tb = (hi - o) / d; if(ta > tb){ const t = ta; ta = tb; tb = t; }
          if(ta > t0) t0 = ta; if(tb < t1) t1 = tb; if(t0 > t1){ ok = false; break; }
        }
        if(ok && t0 < tmin) tmin = t0;
      }
      return tmin;    // 1 = clear, else the fraction where it hits
    }
    return { support, collide, step, rayHit, rampY };
  }

  /* a walking agent steering toward a point; shared by the bots and the graph checker */
  function steer(P, o, tx, ty, tz, speed, dt){
    const dx = tx - o.x, dz = tz - o.z, d = Math.hypot(dx, dz);
    let wx = 0, wz = 0, jump = false;
    if(d > .05){ const v = Math.min(speed, d * 6); wx = dx / d * v; wz = dz / d * v; }
    const up = ty - o.y;
    if(o.gr && up > .5 && (d < 2.6 || (o.hit && o.moved < speed * dt * .4))) jump = true;
    if(o.gr && up > .3 && d > .8){ const lx = o.x + dx / d * .7, lz = o.z + dz / d * .7; if(P.support(lx, lz, o.y) < o.y - .3) jump = true; }   // a ledge: jump across, don't fall
    if(o.gr && o.hit && o.moved < speed * dt * .2 && up > -.3 && d > .6) jump = true;
    P.step(o, wx, wz, jump, dt);
    return d;
  }

  /* ======================================================================
     The builder: one call per map
     ====================================================================== */
  function build(id){
    const W = { id, boxes:[], ramps:[], conts:[], spots:[], navPts:[], group:new THREE.Group(), bx0:-30, bx1:30, bz0:-22, bz1:22 };
    const bags = {};
    const bag = k => { if(bags[k]) return bags[k]; const b = new Bag(k.replace('wall:', '')); if(k.startsWith('wall:')) b.noCast = true; return (bags[k] = b); };
    const solid = (x0, y0, z0, x1, y1, z1, o = {}) => { const b = Object.assign({ x0:Math.min(x0, x1), x1:Math.max(x0, x1), y0:Math.min(y0, y1), y1:Math.max(y0, y1), z0:Math.min(z0, z1), z1:Math.max(z0, z1) }, o); W.boxes.push(b); return b; };
    /* a box from corner to corner */
    function box(x0, y0, z0, x1, y1, z1, col, m = 'plain', o = {}){
      const g = o.round ? (o.round === 'soft' ? GEO.soft : GEO.rbox) : GEO.box;
      bag(m).add(g, (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2, Math.abs(x1 - x0), Math.abs(y1 - y0), Math.abs(z1 - z0), 0, o.ry || 0, 0, col, o.ts);
      if(!o.nocol) return solid(x0, y0, z0, x1, y1, z1, o.cam === false ? { nocam:true } : {});
      return null;
    }
    /* a cylinder standing at (x, z) from y0, height h, radius r (collider: square inside it) */
    function cyl(x, z, y0, h, r, col, m = 'plain', o = {}){
      bag(m).add(o.geo || GEO.cyl, x, y0 + h / 2, z, r, h, r, o.rx || 0, o.ry || 0, o.rz || 0, col, o.ts);
      if(!o.nocol){ const s = r * (o.cs || .82); return solid(x - s, y0, z - s, x + s, y0 + h, z + s); }
      return null;
    }
    const ball = (x, z, y0, r, col, m = 'plain') => { bag(m).add(GEO.sph, x, y0 + r, z, r, r, r, 0, 0, 0, col); return solid(x - r * .72, y0, z - r * .72, x + r * .72, y0 + r * 1.9, z + r * .72); };
    const deco = (geo, x, y, z, sx, sy, sz, col, m = 'plain', rx = 0, ry = 0, rz = 0) => bag(m).add(geo, x, y, z, sx, sy, sz, rx, ry, rz, col);
    function ramp(x0, x1, z0, z1, ax, a0, a1, ya, yb, col, m = 'wood', th = .5){
      const r = { x0, x1, z0, z1, ax, a0, a1, ya, yb, ylo:Math.min(ya, yb) }; W.ramps.push(r);
      const len = Math.hypot((ax === 'x' ? x1 - x0 : z1 - z0), yb - ya), ang = Math.atan2(yb - ya, (ax === 'x' ? a1 - a0 : a1 - a0));
      const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, cy = (ya + yb) / 2 - th / 2;
      if(ax === 'x') bag(m).add(GEO.box, cx, cy, cz, len, th, z1 - z0, 0, 0, ang, col);
      else bag(m).add(GEO.box, cx, cy, cz, x1 - x0, th, len, -ang, 0, 0, col);
      return r;
    }
    /* a hiding container. mk(M) draws it into a Merge in local space (centred on its base) */
    function cont(kind, x, z, y0, r, h, name, mk, o = {}){
      const M = new K.Merge(); mk(M);
      const mesh = new THREE.Mesh(M.geometry(), new THREE.MeshStandardMaterial({ vertexColors:true, roughness:.55 }));
      mesh.position.set(x, y0, z); mesh.rotation.y = o.ry || 0; mesh.castShadow = true; mesh.receiveShadow = true; W.group.add(mesh);
      const s = r * (o.cs || .8);
      if(!o.nocol) solid(x - s, y0, z - s, x + s, y0 + h, z + s);
      const c = { i:W.conts.length, kind, x, z, y:y0, r, h, name, mesh, wob:0, ax:x + (o.ax || 0), az:z + (o.az != null ? o.az : r + 1.1) };
      W.conts.push(c); return c;
    }
    const spot = (x, z, y, name) => W.spots.push({ x, z, y, name });
    const nav = (x, z, y = 0) => W.navPts.push([x, z, y]);
    /* walls: room box, paint texture, a white skirting board */
    function walls(col, m, h = 30, skirt = 0xffffff){
      const { bx0, bx1, bz0, bz1 } = W;
      const wm = 'wall:' + m;
      box(bx0 - 1, 0, bz0 - 1, bx1 + 1, h, bz0, col, wm);
      box(bx0 - 1, 0, bz1, bx1 + 1, h, bz1 + 1, col, wm);
      box(bx0 - 1, 0, bz0, bx0, h, bz1, col, wm);
      box(bx1, 0, bz0, bx1 + 1, h, bz1, col, wm);
      deco(GEO.box, 0, .6, bz0 + .15, bx1 - bx0, 1.2, .3, skirt); deco(GEO.box, 0, .6, bz1 - .15, bx1 - bx0, 1.2, .3, skirt);
      deco(GEO.box, bx0 + .15, .6, 0, .3, 1.2, bz1 - bz0, skirt); deco(GEO.box, bx1 - .15, .6, 0, .3, 1.2, bz1 - bz0, skirt);
    }
    function floor(m, col){ bag(m).add(GEO.box, 0, -.5, 0, W.bx1 - W.bx0 + 2, 1, W.bz1 - W.bz0 + 2, 0, 0, 0, col); }
    function texPlane(tex, w, h, x, y, z, ry, o = {}){
      const pm = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map:tex, roughness:o.rough || .8, transparent:!!o.alpha }));
      pm.position.set(x, y, z); pm.rotation.set(o.rx || 0, ry, 0); pm.receiveShadow = true; W.group.add(pm); return pm;
    }
    const chairAt = (x0, z0, back, col, seat = 4.6) => { // 6 x 6 chair, back on side 'n' (z0) or 's'
      const x1 = x0 + 6, z1 = z0 + 6;
      for(const [lx, lz] of [[x0 + .5, z0 + .5], [x1 - .5, z0 + .5], [x0 + .5, z1 - .5], [x1 - .5, z1 - .5]]) box(lx - .45, 0, lz - .45, lx + .45, seat - .5, lz + .45, col, 'wood');
      box(x0, seat - .5, z0, x1, seat, z1, col, 'wood');
      if(back === 's') box(x0, seat, z1 - .6, x1, seat + 5.5, z1, col, 'wood'); else if(back === 'n') box(x0, seat, z0, x1, seat + 5.5, z0 + .6, col, 'wood');
    };
    const books = (x0, z0, along, n, y0, cols, hBase = 6, thick = 1.4, depth = 4, o = {}) => { // a row of standing books
      let p = 0;
      for(let i = 0; i < n; i++){
        const h = hBase + ((i * 37) % 5) * .35, t = thick + ((i * 13) % 3) * .2, col = cols[i % cols.length];
        if(along === 'z') box(x0, y0, z0 + p, x0 + depth, y0 + h, z0 + p + t, col, 'paper', o); else box(x0 + p, y0, z0, x0 + p + t, y0 + h, z0 + depth, col, 'paper', o);
        p += t + .05;
      }
      return p;
    };

    /* ---------- containers' looks ---------- */
    const C = {
      mug:(col) => M => { M.add(K.G.cyl, 0, 1.5, 0, 1.6, 3, 1.6, 0, 0, 0, col); M.add(K.G.cyl, 0, 3.01, 0, 1.35, .02, 1.35, 0, 0, 0, 0x6b4a2e); M.add(K.G.torus, 1.75, 1.6, 0, .8, .9, .8, 0, 0, 0, col); },
      teapot:(col) => M => { M.add(K.G.sph, 0, 1.7, 0, 2.2, 1.7, 2.2, 0, 0, 0, col); M.add(K.G.cyl, 0, 3.3, 0, 1.1, .3, 1.1, 0, 0, 0, col); M.add(K.G.sph, 0, 3.6, 0, .35, .35, .35, 0, 0, 0, 0xffffff);
        M.add(K.G.cyl8, 2.3, 2.3, 0, .28, 1.8, .28, 0, 0, -.8, col); M.add(K.G.torus, -2.2, 1.9, 0, .8, .9, .8, 0, 0, 0, col); M.add(K.G.cyl, 0, .1, 0, 1.6, .2, 1.6, 0, 0, 0, 0xffffff); },
      jar:(col) => M => { M.add(K.G.cyl, 0, 1.9, 0, 1.8, 3.8, 1.8, 0, 0, 0, col); M.add(K.G.cyl, 0, 3.9, 0, 1.6, .5, 1.6, 0, 0, 0, 0xd99a5b); M.add(K.G.sph, 0, 4.3, 0, .45, .35, .45, 0, 0, 0, 0xd99a5b);
        for(let i = 0; i < 6; i++){ const a = i * 1.1; M.add(K.G.cyl, Math.cos(a) * 1.81, 1 + (i % 3) * .9, Math.sin(a) * 1.81, .45, .12, .45, Math.PI / 2, -a, 0, 0xc98f4a); } },
      bowl:(col) => M => { M.add(K.G.hemi, 0, 1.4, 0, 1.7, -1.4, 1.7, 0, 0, 0, col); M.add(K.G.cyl, 0, 1.4, 0, 1.55, .05, 1.55, 0, 0, 0, 0xfff8ee); M.add(K.G.cyl, 0, 1.55, 0, 1.6, .3, 1.6, 0, 0, 0, col); M.add(K.G.sph, 0, 1.9, 0, .3, .3, .3, 0, 0, 0, col); },
      pot:(col) => M => { M.add(K.G.cyl, 0, 1.5, 0, 2.6, 3, 2.6, 0, 0, 0, col); M.add(K.G.cyl, 0, 3.05, 0, 2.7, .25, 2.7, 0, 0, 0, col); M.add(K.G.sph, 0, 3.3, 0, .45, .3, .45, 0, 0, 0, 0x4a4a5a);
        M.add(K.G.box, 2.9, 2.4, 0, .9, .35, .5, 0, 0, 0, 0x4a4a5a); M.add(K.G.box, -2.9, 2.4, 0, .9, .35, .5, 0, 0, 0, 0x4a4a5a); },
      plant:(col) => M => { M.add(K.G.cyl, 0, 2.5, 0, 3, 5, 3, 0, 0, 0, col); M.add(K.G.cyl, 0, 4.7, 0, 3.3, .7, 3.3, 0, 0, 0, col); M.add(K.G.cyl, 0, 4.9, 0, 2.7, .1, 2.7, 0, 0, 0, 0x6a4a30);
        for(let i = 0; i < 7; i++){ const a = i / 7 * 6.283; M.add(K.G.sph, Math.cos(a) * 1.5, 7.5 + (i % 2) * 1.2, Math.sin(a) * 1.5, 1.1, 3, .35, .4 * Math.sin(a), -a, .4 * Math.cos(a), i % 2 ? 0x5cb85a : 0x48a34a); }
        M.add(K.G.sph, 0, 9.4, 0, .9, 2.4, .9, 0, 0, 0, 0x5cb85a); },
      bucket:(col) => M => { M.add(K.G.cyl, 0, 2, 0, 2.5, 4, 2.5, 0, 0, 0, col); M.add(K.G.cyl, 0, 4.02, 0, 2.2, .04, 2.2, 0, 0, 0, 0xdff3ff); M.add(K.G.torus, 0, 4, 0, 2.5, 2.5, 1.2, Math.PI / 2, 0, 0, 0xffffff); M.add(K.G.torus, 0, 4.4, 0, 2.3, 2.3, 1, 0, 0, 0, 0xb0b0b0); },
      toybox:(col) => M => { M.add(K.G.box, 0, 2.6, 0, 8, 5.2, 5.6, 0, 0, 0, col); M.add(K.G.box, 0, 5.22, 0, 7.4, .05, 5, 0, 0, 0, 0x7a4a2a); M.add(K.G.box, 0, 7.4, -3.1, 8.2, 4.6, .5, -.25, 0, 0, col);
        M.add(K.G.sph, -2, 5.6, .8, 1, 1, 1, 0, 0, 0, 0xff6f91); M.add(K.G.box, 2, 5.6, -.5, 1.4, 1.4, 1.4, 0, .4, 0, 0x6cc4ff); M.add(K.G.cyl, .4, 5.7, 1.5, .5, 2, .5, .3, 0, 1.2, 0xffc23d);
        for(const sx of [-1, 1]) M.add(K.G.box, sx * 4.02, 2.6, 0, .1, 1, 2.8, 0, 0, 0, 0xffffff); },
      drawer:(col) => M => { M.add(K.G.box, 0, .2, 0, 10, .4, 7, 0, 0, 0, col); M.add(K.G.box, 0, 1, 3.3, 10, 2, .4, 0, 0, 0, col); M.add(K.G.box, 0, 1, -3.3, 10, 2, .4, 0, 0, 0, col);
        M.add(K.G.box, -4.8, 1, 0, .4, 2, 7, 0, 0, 0, col); M.add(K.G.box, 4.8, 1, 0, .4, 2, 7, 0, 0, 0, col); M.add(K.G.box, 0, 1.1, 3.6, 2, .5, .5, 0, 0, 0, 0xffffff);
        const sc = [0xff8fb1, 0x6cc4ff, 0xffc23d, 0x5ed6a0, 0xffffff, 0xb48cff];
        for(let i = 0; i < 12; i++) M.add(K.G.sph, -3.6 + (i % 5) * 1.8, 1.3 + (i % 3) * .2, -2.4 + Math.floor(i / 5) * 2.2 + (i % 2) * .5, 1, .6, 1.2, 0, i, 0, sc[i % 6]); },
      jewel:(col) => M => { M.add(K.G.box, 0, 1, 0, 3.4, 2, 2.6, 0, 0, 0, col); M.add(K.G.box, 0, 2.6, -1.2, 3.4, 1.8, .3, -.5, 0, 0, col); M.add(K.G.sph, 0, 1.9, 0, .5, .5, .5, 0, 0, 0, 0xffe066); M.add(K.G.box, 0, 2.02, 0, 3, .04, 2.2, 0, 0, 0, 0xb4436a); },
      pencils:(col) => M => { M.add(K.G.cyl, 0, 1.6, 0, 1.4, 3.2, 1.4, 0, 0, 0, col); const pc = [0xffc23d, 0x6cc4ff, 0xff6f91, 0x5ed6a0];
        for(let i = 0; i < 4; i++){ const a = i * 1.6; M.add(K.G.cyl8, Math.cos(a) * .6, 3.8, Math.sin(a) * .6, .22, 3, .22, Math.sin(a) * .2, 0, Math.cos(a) * .2, pc[i]); } },
      house:(col) => M => { M.add(K.G.box, 0, 4, 0, 8, 8, 6, 0, 0, 0, col); M.add(K.G.cone4, 0, 10, 0, 6.2, 4, 4.8, 0, Math.PI / 4, 0, 0xff6f6f); M.add(K.G.box, 0, 1.8, 3.02, 2.2, 3.6, .1, 0, 0, 0, 0x8a5a3a);
        for(const sx of [-1, 1]){ M.add(K.G.box, sx * 2.6, 5.4, 3.02, 1.8, 1.8, .1, 0, 0, 0, 0xbfe8ff); } M.add(K.G.sph, .7, 1.8, 3.12, .18, .18, .18, 0, 0, 0, 0xffe066); },
      slipper:(col) => M => { M.add(K.G.sph, 0, .9, 0, 1.8, 1, 3, 0, 0, 0, col); M.add(K.G.box, 0, .25, 0, 3.2, .5, 5.6, 0, 0, 0, 0xffffff); M.add(K.G.sph, 0, 1.9, 1.6, .7, .7, .7, 0, 0, 0, 0xffffff); },
      can:(col) => M => { M.add(K.G.cyl, 0, 2, 0, 2.2, 4, 2.2, 0, 0, 0, col); M.add(K.G.cyl, 0, 4.02, 0, 1.4, .05, 1.4, 0, 0, 0, 0x2a5a8a); M.add(K.G.cyl8, 2.8, 3.2, 0, .3, 4, .3, 0, 0, -1, col);
        M.add(K.G.cyl, 4.4, 4.5, 0, .6, .4, .6, 0, 0, -1, col); M.add(K.G.torus, -1.2, 4.6, 0, 1.4, 1.4, 1.2, 0, 0, 0, col); },
      basket:(col) => M => { M.add(K.G.cyl, 0, 1.6, 0, 2.6, 3.2, 2, 0, 0, 0, col); M.add(K.G.box, 0, 3.22, 0, 4.6, .05, 3.4, 0, 0, 0, 0xe8463e); M.add(K.G.torus, 0, 3.3, 0, 2.4, 2.6, 1.2, 0, 0, 0, col);
        for(let i = 0; i < 4; i++) M.add(K.G.box, 0, .5 + i * .8, 0, 5.25, .12, 4.05, 0, 0, 0, 0xb07a3a); },
      bird:(col) => M => { M.add(K.G.box, 0, 2.2, 0, 3.6, 4.4, 3.6, 0, 0, 0, col); M.add(K.G.cone4, 0, 5.4, 0, 3.4, 2.2, 3.4, 0, Math.PI / 4, 0, 0xff8a5a); M.add(K.G.cyl, 0, 2.6, 1.81, .8, .05, .8, Math.PI / 2, 0, 0, 0x5a3a2a); M.add(K.G.cyl8, 0, 1.4, 2.2, .12, .8, .12, Math.PI / 2, 0, 0, 0x8a5a3a); }
    };

    /* ================================================================
       KITCHEN 🍳
       ================================================================ */
    if(id === 'kitchen'){
      W.name = L('المطبخ العملاق', 'Giant kitchen', 'Dev mutfak'); W.e = '🍳';
      W.sky = 0xfff3dc; W.hemi = [0xfff4e2, 0xcbb79a];
      floor('tiles', 0xf3e2c6);
      walls(0xffe4a3, 'paint');
      // backsplash and window
      box(-30, 9.2, -22, 10, 16, -21.9, 0xbfe9de, 'smallTiles', { nocol:true });
      texPlane(TX.window, 12, 9, -19, 19, -21.85, 0);
      for(const [x, w, h, y] of [[-19, 13, .8, 14.3], [-19, 13, .8, 23.7], [-25.3, .8, 10.2, 19], [-12.7, .8, 10.2, 19], [-19, .5, 9, 19]]) deco(GEO.box, x, y, -21.7, w, h, .5, 0xffffff);
      deco(GEO.box, -19, 14, -21, 14, .5, 2, 0xffffff);
      // counter run (raised cupboards: you can crawl under them)
      box(-30, 0, -22, 10, 1.6, -19.2, 0xd8c2a0, 'wood');                    // plinth at the back
      box(-30, 1.6, -22, 10, 8.6, -16, 0x8fd3c1, 'wood');                     // cupboards
      box(-30, 8.6, -22, 10.3, 9.2, -15.6, 0xf7f3ea, 'stone', { ts:5 });      // worktop
      for(let x = -28; x < 10; x += 6.4){ deco(GEO.rbox, x + 2.9, 5.1, -15.95, 5.8, 6.4, .2, 0x9fdccb); deco(GEO.rbox, x + 2.9, 7.6, -15.75, 2, .45, .45, 0xffffff); }
      // sink and tap
      deco(GEO.box, -19, 9.21, -19, 9, .04, 5, 0xc9d3dc); deco(GEO.cyl, -19, 10.6, -21.2, .45, 2.8, .45, 0xd0d6de); deco(GEO.cyl, -19, 12, -20.3, .35, .35, 2, 0xd0d6de, 'plain', Math.PI / 2);
      // oven front and hob
      deco(GEO.box, -3, 4.6, -15.9, 7.6, 5.6, .3, 0x4a4a5a); deco(GEO.box, -3, 4.6, -15.7, 5.6, 3.4, .2, 0x2e3440); deco(GEO.box, -3, 7.8, -15.7, 5, .4, .5, 0xd0d6de);
      for(const [dx, dz] of [[-1.6, -1.4], [1.6, -1.4], [-1.6, 1.4], [1.6, 1.4]]) deco(GEO.cyl, -3 + dx, 9.25, -19 + dz, 1.1, .1, 1.1, 0x3a3a46);
      // fridge
      box(12, 0, -22, 20, 26, -14.5, 0xfafafa, 'plain');
      deco(GEO.box, 16, 17.5, -14.45, 7.8, .15, .1, 0xdadada); deco(GEO.rbox, 13, 21, -14.3, .6, 4, .6, 0xd0d6de); deco(GEO.rbox, 13, 12, -14.3, .6, 4, .6, 0xd0d6de);
      for(const [x, y, c] of [[16, 22, 0xff6f91], [18, 20, 0x6cc4ff], [15.5, 13, 0xffc23d], [18.4, 11, 0x5ed6a0]]) deco(GEO.sph, x, y, -14.4, .6, .6, .25, c);
      // cutting-board ramp up to the worktop
      ramp(4, 9, -15.6, -2, 'z', -2, -15.6, 0, 9.2, 0xe2b07a, 'wood', .6);
      deco(GEO.cyl, 6.5, 1, -1.2, 1, .7, 1, 0xe2b07a, 'wood', Math.PI / 2);
      // on the worktop
      cont('mug', -25, -19.2, 9.2, 1.6, 3, L('الكاسة الزهرية', 'the pink mug', 'pembe kupa'), C.mug(0xff8fb1), { az:2.7 });
      cont('teapot', -9.5, -19.6, 9.2, 2.2, 3.5, L('إبريق الشاي', 'the teapot', 'çaydanlık'), C.teapot(0x6cc4ff), { az:2.9 });
      cont('jar', 4.5, -19.8, 9.2, 1.8, 4, L('مرطبان البسكوت', 'the cookie jar', 'kurabiye kavanozu'), C.jar(0xffe9b8), { az:2.3, ax:-1 });
      box(-15, 9.2, -19.6, -11, 12.6, -17.3, 0xff9a6c, 'plain', { round:true }); deco(GEO.box, -14, 12.62, -18.45, .8, .1, 1.6, 0x333333); deco(GEO.box, -12, 12.62, -18.45, .8, .1, 1.6, 0x333333);
      spot(-13, -20.8, 9.2, L('ورا التوستر', 'behind the toaster', 'tost makinesinin arkası'));
      box(-2, 9.2, -21.5, 0, 16, -19.5, 0xffd34d, 'plain'); box(.2, 9.2, -21.6, 2.4, 14, -19.4, 0xff8fb1, 'plain'); // cereal and flour boxes
      nav(-25, -16.4, 9.2); nav(-18, -16.8, 9.2); nav(-9.5, -16.4, 9.2); nav(-3, -17, 9.2); nav(1, -17.4, 9.2); nav(6.5, -17.5, 9.2); nav(-13, -20.8, 9.2); nav(-13, -16.4, 9.2); nav(-28, -17, 9.2); nav(-21.5, -20, 9.2);
      // crawl space under the cupboards
      spot(-22, -17.6, 0, L('تحت الخزانة', 'under the cupboard', 'dolabın altı')); spot(-6, -17.6, 0, L('تحت الخزانة', 'under the cupboard', 'dolabın altı')); spot(6, -17.6, 0, L('تحت الخزانة', 'under the cupboard', 'dolabın altı'));
      nav(-26, -17.6); nav(-14, -17.6); nav(0, -17.6); nav(8.5, -17.6);
      // dining table, rug and chairs
      texPlane(TX.rug, 26, 26, 0, .03, 7, 0, { rx:-Math.PI / 2 });
      box(-9, 7.2, 1, 9, 7.9, 12, 0xd99a5b, 'wood');
      for(const [x, z] of [[-8.2, 1.8], [8.2, 1.8], [-8.2, 11.2], [8.2, 11.2]]) box(x - .55, 0, z - .55, x + .55, 7.2, z + .55, 0xc4884e, 'wood');
      chairAt(-6.5, 13.4, 's', 0xff9a6c);
      chairAt(3.5, 13.4, 's', 0xff9a6c);
      chairAt(-4, -6.4, 'n', 0xff9a6c);
      box(-4.7, 4.6, 14.2, -1.7, 6.2, 16.6, 0xffffff, 'knit');                   // a folded napkin pile on the chair
      box(-15, 0, 13, -11.5, 1.6, 17, 0x5aa9e6, 'paper'); box(-11.5, 0, 13.4, -7.5, 3.1, 16.6, 0xff6f91, 'paper');  // cookbooks: steps up to the chair
      nav(-13.2, 15, 1.6); nav(-9.5, 15, 3.1); nav(-3.5, 17.7, 4.6); nav(-3.2, 15.4, 6.2); nav(-6, 6, 7.9); nav(0, 3, 7.9); nav(6, 6, 7.9); nav(-3, 10, 7.9); nav(5, 3, 7.9); nav(3, 10.8, 7.9);
      cont('bowl', -4.5, 4, 7.9, 1.7, 2, L('صحن السكر', 'the sugar bowl', 'şekerlik'), C.bowl(0xffffff), { az:2.6 });
      cont('mug', 6, 9.5, 7.9, 1.6, 3, L('الكاسة الصفرا', 'the yellow mug', 'sarı kupa'), C.mug(0xffc23d), { az:-2.6, ax:-1.6 });
      // fruit bowl (open hiding among the apples)
      deco(GEO.hemi, 1, 8.9, 7, 3.2, -1, 3.2, 0x6cc4ff);
      for(const [dx, dz, c] of [[-2.2, 0, 0xe8463e], [2.2, .4, 0xe8463e], [0, -2.2, 0xffc23d], [.6, 2.2, 0x7ccf5a]]) ball(1 + dx, 7 + dz, 7.9, 1.1, c);
      spot(1, 7, 7.9, L('بين التفاح', 'among the apples', 'elmaların arasında'));
      spot(0, 7, 0, L('تحت الطاولة', 'under the table', 'masanın altı')); nav(-4, 4); nav(4, 9); nav(0, 7);
      // floor things
      cont('plant', -25.5, 17.5, 0, 3, 5, L('أصيص الزرع', 'the plant pot', 'saksı'), C.plant(0xd9825b), { az:-4.2 });
      cont('bucket', 25.5, -10.5, 0, 2.5, 4, L('السطل', 'the bucket', 'kova'), C.bucket(0x6cc4ff), { ax:-3.6, az:0 });
      cont('pot', -14, -11, 0, 2.6, 3.4, L('الطنجرة', 'the big pot', 'tencere'), C.pot(0xc0c6d0), { az:3.8 });
      box(-12.5, 0, -9, -10.5, 3, -6.5, 0xd0d6de, 'plain', { round:true });       // a lid leaning
      // big cookbooks standing by the right wall: hide behind them
      books(23.6, -4, 'z', 8, 0, [0xff6f91, 0x5aa9e6, 0xffc23d, 0x5ed6a0, 0xb48cff], 7, 1.5, 2.6);
      spot(28.2, 0, 0, L('ورا الكتب', 'behind the books', 'kitapların arkası')); nav(28.2, -5.5); nav(28.2, 9);
      // a basket of oranges and a rolling pin
      cont('basket', 24.5, 16, 0, 2.6, 3.4, L('سلة البرتقال', 'the orange basket', 'portakal sepeti'), C.basket(0xd9a35b), { az:-3.8 });
      deco(GEO.cyl, 14, 1, 4, 1, 9, 1, 0xe2b07a, 'wood', 0, 0, Math.PI / 2);
      for(const sx of [-1, 1]) deco(GEO.cyl, 14 + sx * 5.6, 1, 4, .45, 2.2, .45, 0xc98f58, 'wood', 0, 0, Math.PI / 2);
      solid(9.5, 0, 3, 18.5, 2, 5);
      spot(-27.5, 12.5, 0, L('ورا الأصيص', 'behind the plant', 'saksının arkası'));
      W.spawn = { seeker:[0, -9], hiders:[[-3, 20.8], [3, 20.8], [10, 20], [-10, 20.5]] };
      W.podium = { x:16, z:13, f:Math.PI * .85 };
      W.disg = ['cookie', 'apple', 'sugar'];
    }

    /* ================================================================
       KIDS' BEDROOM 🧸
       ================================================================ */
    if(id === 'bedroom'){
      W.name = L('غرفة الولاد العملاقة', "Giant kids' room", 'Dev çocuk odası'); W.e = '🧸';
      W.sky = 0xeaf4ff; W.hemi = [0xfff4ea, 0xb8a9c8];
      floor('planks', 0xe7c49a);
      walls(0xbfd9ff, 'starPaper');
      // window + curtains on the left wall (hide behind the curtain)
      texPlane(TX.window, 11, 10, -29.85, 16, 6, Math.PI / 2);
      deco(GEO.box, -29.6, 16, 6, .4, 11, 12, 0xffffff); deco(GEO.box, -29.4, 16, 6, .4, 10, 11, 0xbfe8ff);
      box(-28.8, 0, 0, -28.3, 22, 5, 0xff9ab8, 'knit', { cam:false }); box(-28.8, 0, 7, -28.3, 22, 12, 0xff9ab8, 'knit', { cam:false });
      deco(GEO.cyl, -28.5, 22.4, 6, .3, 16, .3, 0xd9a35b, 'wood', Math.PI / 2);
      spot(-29.3, 2.5, 0, L('ورا البرداية', 'behind the curtain', 'perdenin arkası')); nav(-29.2, -.9); nav(-29.3, 9.5); nav(-29.2, 13.4);
      // the bed (crawl under it; climb up with the toy blocks)
      box(-29, 0, -21.5, -27.6, 2.6, -20.1, 0xb07a4a, 'wood'); box(-11.4, 0, -21.5, -10, 2.6, -20.1, 0xb07a4a, 'wood');
      box(-29, 0, -3.4, -27.6, 2.6, -2, 0xb07a4a, 'wood'); box(-11.4, 0, -3.4, -10, 2.6, -2, 0xb07a4a, 'wood');
      box(-29, 2.2, -21.5, -10, 3, -2, 0xc98f58, 'wood');
      box(-28.6, 3, -21.2, -10.4, 5.2, -2.4, 0xffffff, 'knit', { round:'soft' });
      box(-28.9, 5.2, -14, -10.1, 5.36, -1.9, 0x8cc8f2, 'dots', { nocol:true, round:true });     // the blanket
      box(-29, 0, -22, -10, 12, -21.3, 0xc98f58, 'wood');                                        // headboard
      box(-26, 5.2, -20.6, -19.5, 7.4, -16.6, 0xffffff, 'dots', { round:'soft' }); box(-18.5, 5.2, -20.6, -12.5, 7.2, -16.6, 0xffe9a8, 'dots', { round:'soft' });
      spot(-19.2, -12, 0, L('تحت التخت', 'under the bed', 'yatağın altı')); spot(-24, -6, 0, L('تحت التخت', 'under the bed', 'yatağın altı'));
      nav(-24, -17); nav(-15, -17); nav(-19.2, -12); nav(-24, -6); nav(-14, -6);
      // teddy bear on the bed
      deco(GEO.sph, -14, 7.6, -9, 2.2, 2.4, 2, 0xc98f58); deco(GEO.sph, -14, 10.6, -9, 1.6, 1.5, 1.5, 0xc98f58);
      deco(GEO.sph, -15.2, 11.8, -9, .6, .6, .4, 0xc98f58); deco(GEO.sph, -12.8, 11.8, -9, .6, .6, .4, 0xc98f58); deco(GEO.sph, -14, 10.3, -7.7, .6, .45, .4, 0xffe0b8);
      deco(GEO.sph, -14.6, 10.9, -7.6, .16, .16, .1, 0x2a1608); deco(GEO.sph, -13.4, 10.9, -7.6, .16, .16, .1, 0x2a1608);
      solid(-15.6, 5.2, -10.4, -12.4, 10, -7.6);
      spot(-14, -11.6, 5.2, L('ورا الدبدوب', 'behind the teddy', 'ayıcığın arkası'));
      nav(-22, -12, 5.2); nav(-18, -11, 5.2); nav(-12.2, -4.2, 5.2); nav(-16, -5, 5.2); nav(-25, -6, 5.2); nav(-14, -11.6, 5.2); nav(-18, -15, 5.2);
      // toy blocks: steps up to the bed
      const blk = [0xff6f91, 0x6cc4ff, 0xffc23d, 0x5ed6a0];
      box(-9.4, 0, -1.6, -5.8, 1.7, 2, blk[0], 'plain', { round:true }); box(-9.6, 0, -6, -6, 3.5, -2.4, blk[1], 'plain', { round:true });
      for(const [x, y, z, c] of [[-7.6, 1.72, .2, 0xffffff], [-7.8, 3.52, -4.2, 0xffffff]]) deco(GEO.cyl, x, y, z, .9, .05, .9, c);
      nav(-7.6, .2, 1.7); nav(-7.8, -4.2, 3.5);
      // chest of drawers: the drawers are pulled out like stairs; the bottom one is the sock drawer
      box(10, 0, -22, 26, 11, -15.5, 0xf2b8c6, 'wood');
      deco(GEO.box, 18, 11.2, -18.7, 16.6, .4, 7, 0xffffff);
      cont('drawer', 18, -12, 0, 2.2, 2, L('جارور الكلسات', 'the sock drawer', 'çorap çekmecesi'), C.drawer(0xf7cbd6), { nocol:true, az:4.9 });
      solid(13, 0, -15.5, 23, 2, -8.5);
      for(const [y, zf] of [[3.8, -10], [5.6, -11.4], [7.4, -12.8], [9.2, -14.2]]){ box(13, y - 1.8, -15.5, 23, y, zf, 0xf7cbd6, 'wood'); deco(GEO.box, 18, y - .9, zf + .1, 2, .5, .4, 0xffffff); }
      deco(GEO.cyl, 22.5, 12.2, -19, 1.6, 2, 1.6, 0xffc23d); deco(GEO.cyl, 22.5, 16, -19, .3, 6, .3, 0xffffff); deco(GEO.tub, 22.5, 20, -19, 3, 3, 3, 0xfff1c4);
      solid(21, 11, -20.5, 24, 13.2, -17.5);
      cont('jewel', 14, -18.4, 11, 1.7, 2.2, L('علبة المجوهرات', 'the jewellery box', 'mücevher kutusu'), C.jewel(0xb48cff), { az:2.4 });
      nav(18, -9.2, 2); nav(18, -10.7, 3.8); nav(18, -12.1, 5.6); nav(18, -13.5, 7.4); nav(18, -14.85, 9.2); nav(17, -16.8, 11); nav(19, -19.5, 11);
      spot(25, -12, 0, L('جنب الجارور', 'beside the drawers', 'çekmecelerin yanı')); nav(25, -12);
      // toy box
      cont('toybox', 0, -18.5, 0, 4, 5.2, L('صندوق الألعاب', 'the toy box', 'oyuncak sandığı'), C.toybox(0xff8a5a), { az:4.9, cs:1 });
      // bookshelf on the right wall: books on the bottom shelf, a gap behind them
      box(25.6, 0, -9, 30, .8, 7, 0xffffff, 'wood'); box(25.6, 0, -9.6, 30, 17, -9, 0xffffff, 'wood'); box(25.6, 0, 7, 30, 17, 7.6, 0xffffff, 'wood');
      box(25.6, 6, -9, 30, 6.6, 7, 0xffffff, 'wood'); box(25.6, 11.6, -9, 30, 12.2, 7, 0xffffff, 'wood'); box(25.6, 16.6, -9.6, 30, 17.2, 7.6, 0xffffff, 'wood');
      books(25.8, -8.6, 'z', 9, .8, [0x6cc4ff, 0xff6f91, 0x5ed6a0, 0xffc23d, 0xb48cff], 4.4, 1.3, 1.7);
      books(26, -8, 'z', 10, 6.6, [0xffc23d, 0x5ed6a0, 0xb48cff, 0x6cc4ff, 0xff6f91], 4.2, 1.2, 3.6, { nocol:true });
      solid(26, 6.6, -8, 29.6, 11, 4.6);
      spot(28.7, -2, .8, L('ورا الكتب', 'behind the books', 'kitapların arkası')); nav(27, 5.8, .8); nav(28.7, 4.4, .8); nav(28.7, -6.5, .8);
      // round rug, big ball, toy train, bean bag
      texPlane(TX.rug, 22, 22, 2, .03, 4, 0, { rx:-Math.PI / 2 });
      ball(-4, 9, 0, 3, 0xff6f91);
      for(let i = 0; i < 7; i++){ const a = i * 2.4, u = .9 - (i % 3) * .55, rr = Math.sqrt(1 - u * u) * 3.02; deco(GEO.sm, -4 + Math.cos(a) * rr, 3 + u * 3.02, 9 + Math.sin(a) * rr, .55, .55, .55, 0xffffff); }
      for(let i = 0; i < 3; i++){ const x = 4 + i * 4.6; box(x, .8, -2, x + 4, 3.8, 1, [0x6cc4ff, 0xffc23d, 0x5ed6a0][i], 'plain', { round:true }); for(const zz of [-1.6, .6]) for(const xx of [x + .9, x + 3.1]) deco(GEO.cyl, xx, .8, zz, .8, .5, .8, 0x333344, 'plain', Math.PI / 2); }
      deco(GEO.cyl, 5.2, 5, -.5, .7, 2.4, .7, 0x6cc4ff);
      box(16, 0, 2, 23, 4.4, 8.5, 0xffc23d, 'knit', { round:'soft' });
      spot(24.4, 5, 0, L('ورا الكيس', 'behind the bean bag', 'armut koltuğun arkası'));
      // desk with a pencil cup, chair with books on the seat
      box(6, 7.2, 13, 22, 8, 21.6, 0xf7f3ea, 'wood');
      for(const [x, z] of [[6.6, 13.6], [21.4, 13.6], [6.6, 21], [21.4, 21]]) box(x - .5, 0, z - .5, x + .5, 7.2, z + .5, 0xf7f3ea, 'wood');
      chairAt(10, 6.8, 'n', 0x6cc4ff, 4.4);
      box(11, 4.4, 9.6, 15, 6.2, 12.4, 0xff6f91, 'paper');
      box(5.2, 0, 7, 8.8, 3, 10.6, 0x5ed6a0, 'knit', { round:'soft' });   // a backpack
      box(2.5, 0, 7.5, 5, 1.5, 10, 0xffc23d, 'plain', { round:true });    // a toy block: the first step
      cont('pencils', 18, 19, 8, 1.4, 3.2, L('كاسة الأقلام', 'the pencil cup', 'kalemlik'), C.pencils(0xff6f91), { az:-2.6 });
      deco(GEO.sph, 9, 10.8, 19, 2, 2, 2, 0x6cc4ff); deco(GEO.cyl, 9, 8.4, 19, .8, .8, .8, 0xd9a35b); deco(GEO.torus, 9, 11, 19, 2.3, 2.3, 2.3, 0xd9a35b, 'plain', 0, .5, .3);
      solid(7.6, 8, 17.6, 10.4, 13, 20.4);
      spot(14, 17, 0, L('تحت الطاولة', 'under the desk', 'masanın altı'));
      nav(3.7, 8.7, 1.5); nav(7, 8.8, 3); nav(13, 8.5, 4.4); nav(13, 11, 6.2); nav(14, 15, 8); nav(18, 15.6, 8); nav(10, 15, 8); nav(14, 17); nav(20, 17);
      // dollhouse, slippers, plant pot
      cont('house', -23, 15, 0, 4, 8, L('بيت اللعبة', 'the dollhouse', 'oyuncak ev'), C.house(0xfff1c4), { az:-5, cs:1, ry:Math.PI });
      cont('slipper', -9, 18, 0, 1.8, 2.2, L('الشحّاطة', 'the slipper', 'terlik'), C.slipper(0xff9ab8), { az:-3.6, cs:.9 });
      deco(GEO.sph, -5, .9, 18.6, 1.8, 1, 3, 0xff9ab8); deco(GEO.box, -5, .25, 18.6, 3.2, .5, 5.6, 0xffffff); deco(GEO.sph, -5, 1.9, 17, .7, .7, .7, 0xffffff);
      cont('plant', 26.5, 18, 0, 3, 5, L('أصيص الزرع', 'the plant pot', 'saksı'), C.plant(0x6cc4ff), { az:-4.2, ax:-1 });
      texPlane(TX.picture, 8, 8, 0, 19, -21.9, 0); deco(GEO.box, 0, 19, -21.95, 9, 9, .2, 0xd9a35b);
      W.spawn = { seeker:[0, -6], hiders:[[-2, 6], [2, 6], [6, 4], [-6, 4]] };
      W.podium = { x:-14, z:9, f:Math.PI * .15 };
      W.disg = ['block', 'ball', 'sock'];
    }

    /* ================================================================
       GARDEN 🌻
       ================================================================ */
    if(id === 'garden'){
      W.name = L('الجنينة العملاقة', 'Giant garden', 'Dev bahçe'); W.e = '🌻';
      W.sky = 0xbfe6ff; W.hemi = [0xfffbe6, 0x8fb070]; W.outdoor = true;
      floor('grass', 0x7ccf5a);
      // a wooden fence all around (tall, like walls)
      const fz = (x0, x1, z, t) => box(x0, 0, z, x1, 14, z + t, 0xf3d9a8, 'wood');
      fz(-31, 31, -23, 1); fz(-31, 31, 22, 1); box(-31, 0, -22, -30, 14, 22, 0xf3d9a8, 'wood'); box(30, 0, -22, 31, 14, 22, 0xf3d9a8, 'wood');
      for(let x = -29; x <= 29; x += 3) for(const z of [-21.9, 21.9]) deco(GEO.box, x, 7, z, .2, 14, .2, 0xc9a670);
      // stepping stones path and a small pond
      for(let i = 0; i < 8; i++) deco(GEO.cyl, -20 + i * 5.4, .08, 2 + Math.sin(i) * 3, 1.6, .16, 1.3, 0xcfc8bc, 'stone');
      const pond = new THREE.Mesh(new THREE.CircleGeometry(6, 36), new THREE.MeshStandardMaterial({ color:0x6cc8f2, roughness:.15, metalness:.05 }));
      pond.rotation.x = -Math.PI / 2; pond.position.set(14, .06, 12); pond.receiveShadow = true; W.group.add(pond);
      for(let i = 0; i < 16; i++){ const a = i / 16 * 6.283; deco(GEO.sm, 14 + Math.cos(a) * 6.3, .3, 12 + Math.sin(a) * 6.3, 1, .6, .8, 0xb8b0a4, 'stone'); }
      solid(9.4, 0, 7.4, 18.6, 3.2, 16.6);   // you can't walk on the water
      // big grass tufts (good cover)
      const tuft = (x, z, s = 1) => { for(let i = 0; i < 7; i++){ const a = i * 2.4; deco(GEO.cone, x + Math.cos(a) * .9 * s, 3.5 * s, z + Math.sin(a) * .9 * s, .5 * s, 7 * s + (i % 3), .3 * s, i % 2 ? 0x5cb85a : 0x48a34a, 'plain', Math.sin(a) * .25, a, Math.cos(a) * .25); } solid(x - 1.2 * s, 0, z - 1.2 * s, x + 1.2 * s, 6 * s, z + 1.2 * s); };
      for(const [x, z, s] of [[-26, -8, 1.2], [-6, 10, 1], [4, -12, 1.1], [24, -4, 1.2], [-14, 18, 1], [26, 17, 1], [-2, 18.5, .9], [-24, 6, 1]]) tuft(x, z, s);
      spot(-27.4, -10, 0, L('بين العشب', 'in the tall grass', 'uzun otların arasında')); spot(25.6, -6.4, 0, L('بين العشب', 'in the tall grass', 'uzun otların arasında'));
      // garden bench with a crate staircase
      box(-24, 4.6, -21, -6, 5.4, -15, 0xff9a6c, 'wood');
      for(const x of [-23, -7]) box(x - .6, 0, -20.6, x + .6, 4.6, -15.4, 0x8a5a3a, 'wood');
      box(-24, 5.4, -21.4, -6, 11, -20.8, 0xff9a6c, 'wood');
      box(-2, 0, -18, 1.4, 1.8, -14.6, 0xd9a35b, 'wood'); box(-5.4, 0, -18, -2, 3.6, -14.6, 0xc98f58, 'wood');
      spot(-15, -18, 0, L('تحت المقعد', 'under the bench', 'bankın altı')); nav(-20, -18); nav(-11, -18); nav(-15, -18);
      nav(-.3, -16.3, 1.8); nav(-3.7, -16.3, 3.6); nav(-9, -17.5, 5.4); nav(-15, -16, 5.4); nav(-21, -18, 5.4);
      cont('basket', -12, -18.8, 5.4, 2.6, 3.4, L('سلة البيكنيك', 'the picnic basket', 'piknik sepeti'), C.basket(0xd9a35b), { az:2.8 });
      // toadstool jumps up to the tree stump with a bird house
      const toad = (x, z, h, r, col) => { deco(GEO.cyl, x, (h - .5) / 2, z, .7, h - .5, .7, 0xfff1dc); deco(GEO.hemi, x, h - .6, z, r, 1.2, r, col); solid(x - r * .8, 0, z - r * .8, x + r * .8, h, z + r * .8); for(let i = 0; i < 4; i++){ const a = i * 1.7; deco(GEO.sm, x + Math.cos(a) * r * .5, h + .45, z + Math.sin(a) * r * .5, .32, .14, .32, 0xffffff); } nav(x, z, h); };
      toad(18, -4, 1.6, 2, 0xff6f6f); toad(18.5, -9, 3.2, 2.2, 0xffc23d); toad(22.6, -12, 4.8, 2.2, 0xff6f6f); toad(22, -16.8, 6.4, 2.4, 0x6cc4ff);
      box(24, 0, -22, 30, 8, -15, 0xa5713f, 'wood'); deco(GEO.cyl, 27, 8.05, -18.5, 2.6, .1, 2.6, 0xe9c48f, 'wood');
      cont('bird', 28, -19.5, 8, 1.8, 5.5, L('بيت العصافير', 'the bird house', 'kuş evi'), C.bird(0x6cc4ff), { az:3 });
      nav(26.5, -16.2, 8); nav(25, -19, 8);
      // flower pots, watering can, bucket and a wheelbarrow
      cont('plant', -27, 19.2, 0, 3, 5, L('أصيص الورد', 'the flower pot', 'çiçek saksısı'), C.plant(0xd9825b), { az:0, ax:4.2 });
      cont('plant', 6, 18.5, 0, 3, 5, L('أصيص الزرع', 'the plant pot', 'saksı'), C.plant(0xff9ab8), { az:-4.2 });
      cont('can', -12, 6, 0, 2.2, 4, L('المرشّة', 'the watering can', 'sulama kabı'), C.can(0x5ed6a0), { az:3.4, ax:-1.6 });
      cont('bucket', 6.5, -18, 0, 2.5, 4, L('سطل الرمل', 'the sand bucket', 'kum kovası'), C.bucket(0xff8fb1), { az:3.6 });
      for(const [x, z, c] of [[-27, 21, 0xff6f91], [-21, 20.5, 0xffc23d], [10.5, 20.8, 0xb48cff]]){ deco(GEO.cyl, x, 3, z, .25, 6, .25, 0x48a34a); for(let i = 0; i < 6; i++){ const a = i / 6 * 6.283; deco(GEO.sph, x + Math.cos(a) * 1.1, 6.2, z + Math.sin(a) * 1.1, .8, .5, .8, c); } deco(GEO.sph, x, 6.3, z, .6, .5, .6, 0xffe066); }
      // wheelbarrow you can climb on, and a log to jump over
      box(-20, 2, 10, -12, 4.6, 16, 0xff6f6f, 'plain'); deco(GEO.cyl, -21.5, 1.5, 13, 1.5, .8, 1.5, 0x333344, 'plain', 0, 0, Math.PI / 2);
      for(const z of [10.6, 15.4]){ box(-12.6, 0, z - .4, -11.8, 2, z + .4, 0x8a5a3a, 'wood'); deco(GEO.box, -10, 3, z, 5, .5, .5, 0x8a5a3a, 'wood', 0, 0, -.3); }
      ramp(-28.4, -20, 11.4, 14.6, 'x', -28.4, -20, 0, 4.6, 0xe2b07a, 'wood', .5);
      spot(-16, 18.6, 0, L('ورا العربانة', 'behind the wheelbarrow', 'el arabasının arkası'));
      nav(-26, 13, 2.2); nav(-16, 13, 4.6); nav(-16, 18.6); nav(-16, 7.6);
      deco(GEO.cyl, 2, 1, 4, 1, 10, 1, 0xa5713f, 'wood', 0, 0, Math.PI / 2); solid(-3, 0, 3, 7, 2, 5);
      // a picnic blanket
      texPlane(TX.gingham, 14, 10, 0, .04, -4, 0, { rx:-Math.PI / 2 });
      spot(9, 18.4, 0, L('ورا الأصيص', 'behind the pot', 'saksının arkası'));
      W.spawn = { seeker:[0, -6], hiders:[[-2, 9], [2, 9], [6, 8], [-6, 8]] };
      W.podium = { x:0, z:12, f:0 };
      W.disg = ['pebble', 'flower', 'acorn'];
    }

    for(const k in bags){ const m = bags[k].mesh(); if(bags[k].noCast) m.castShadow = false; W.group.add(m); }
    W.P = makePhys(W);
    buildNav(W);
    return W;
  }

  /* ---------------- the bots' map: nodes + edges checked by simulation ---------------- */
  function buildNav(W){
    const P = W.P, nodes = [];
    const free = (x, z) => { for(const b of W.boxes){ if(b.y0 < 1.3 && b.y1 > .45 && x > b.x0 - .8 && x < b.x1 + .8 && z > b.z0 - .8 && z < b.z1 + .8) return false; } for(const r of W.ramps) if(x > r.x0 - .6 && x < r.x1 + .6 && z > r.z0 - .6 && z < r.z1 + .6) return false; return true; };
    const add = (x, z, y, kind) => { const gy = P.support(x, z, y + .3); nodes.push({ x, z, y:gy, kind, e:[] }); return nodes.length - 1; };
    for(let x = W.bx0 + 3; x <= W.bx1 - 3; x += 4.5) for(let z = W.bz0 + 3; z <= W.bz1 - 3; z += 4.5) if(free(x, z)) add(x, z, 0, 'g');
    for(const [x, z, y] of W.navPts) add(x, z, y, 'n');
    for(const r of W.ramps){ for(const t of [.08, .25, .42, .58, .75, .92]){ const x = r.ax === 'x' ? r.a0 + (r.a1 - r.a0) * t : (r.x0 + r.x1) / 2, z = r.ax === 'z' ? r.a0 + (r.a1 - r.a0) * t : (r.z0 + r.z1) / 2; add(x, z, P.rampY(r, x, z), 'r'); } }
    for(const s of W.spots) s.node = add(s.x, s.z, s.y, 's');
    for(const c of W.conts) c.node = add(c.ax, c.az, c.y, 'c');
    // edges: try to walk from each node to its neighbours
    const o = { x:0, y:0, z:0, vx:0, vz:0, vy:0, gr:true };
    for(let i = 0; i < nodes.length; i++) for(let j = 0; j < nodes.length; j++){
      if(i === j) continue; const a = nodes[i], b = nodes[j], d = Math.hypot(a.x - b.x, a.z - b.z);
      if(d > 7.2 || b.y - a.y > 2.1) continue;
      if(a.kind === 'g' && b.kind === 'g' && d > 4.6) continue;
      Object.assign(o, { x:a.x, y:a.y, z:a.z, vx:0, vz:0, vy:0, gr:true, hit:false, moved:0, jumped:false, landed:false });
      let ok = false, t = 0, best = 1e9, stuck = 0;
      const dt = 1 / 30;
      while(t < 5){
        const dd = steer(P, o, b.x, b.y, b.z, 5, dt); t += dt;
        if(dd < .45 && Math.abs(o.y - b.y) < .35 && o.gr){ ok = true; break; }
        if(dd < best - .05){ best = dd; stuck = 0; } else if((stuck += dt) > 1.2) break;
      }
      if(ok) a.e.push([j, d + Math.max(0, b.y - a.y) * 1.5 + t * .5]);
    }
    W.nodes = nodes;
  }

  /* shortest path (Dijkstra, small graph) from node a to node b: list of node indexes */
  function path(W, a, b){
    const N = W.nodes, n = N.length, dist = new Float64Array(n).fill(Infinity), prev = new Int32Array(n).fill(-1), done = new Uint8Array(n);
    dist[a] = 0;
    for(;;){
      let u = -1, bd = Infinity; for(let i = 0; i < n; i++) if(!done[i] && dist[i] < bd){ bd = dist[i]; u = i; }
      if(u < 0 || u === b) break; done[u] = 1;
      for(const [v, w] of N[u].e){ const nd = dist[u] + w; if(nd < dist[v]){ dist[v] = nd; prev[v] = u; } }
    }
    if(dist[b] === Infinity) return null;
    const out = []; for(let u = b; u >= 0; u = prev[u]) out.unshift(u); return out;
  }
  /* the node nearest to a point that is at about the same height */
  function nearest(W, x, y, z, filt){
    let best = -1, bd = 1e9;
    W.nodes.forEach((nd, i) => { if(filt && !filt(nd, i)) return; const d = Math.hypot(nd.x - x, nd.z - z) + Math.abs(nd.y - y) * 3; if(d < bd){ bd = d; best = i; } });
    return best;
  }
  return { build, steer, path, nearest, GEO, TX, MATS };
}
