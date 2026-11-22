/* Tiny Bobo: geometry helpers.
   rbox(w,h,d,r,m) — a box with soft rounded edges (m bevel segments), cached.
   Builder — merges many pieces into ONE mesh per material key; UVs are box-projected in world units
   (so a wallpaper or plank texture tiles at the same size everywhere) and pieces are tinted with vertex colours. */
export function makeGeo(THREE){
  const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _s = new THREE.Vector3(), _v = new THREE.Vector3(), _c = new THREE.Color(), _n3 = new THREE.Matrix3();
  const cache = {};
  function rbox(w, h, d, r = .1, m = 2){
    const key = [w, h, d, r, m].map(v => (+v).toFixed(3)).join('_');
    if(cache[key]) return cache[key];
    r = Math.min(r, w / 2 - .001, h / 2 - .001, d / 2 - .001);
    const n = m * 2 + 1, g = new THREE.BoxGeometry(1, 1, 1, n, n, n);
    const pos = g.attributes.position, nor = g.attributes.normal;
    const map = (u, half) => { // u in [-.5,.5] on an even grid → bevel bands near both ends
      const i = Math.round((u + .5) * n);
      if(i <= m) return -half + r * (i / m);
      if(i >= n - m) return half - r * ((n - i) / m);
      return -(half - r) + (2 * (half - r)) * ((i - m) / (n - 2 * m));
    };
    const hw = w / 2, hh = h / 2, hd = d / 2, iv = new THREE.Vector3(), v = new THREE.Vector3(), nn = new THREE.Vector3();
    for(let i = 0; i < pos.count; i++){
      v.set(map(pos.getX(i), hw), map(pos.getY(i), hh), map(pos.getZ(i), hd));
      iv.set(Math.max(-(hw - r), Math.min(hw - r, v.x)), Math.max(-(hh - r), Math.min(hh - r, v.y)), Math.max(-(hd - r), Math.min(hd - r, v.z)));
      nn.subVectors(v, iv); const l = nn.length();
      if(l < 1e-6) nn.set(nor.getX(i), nor.getY(i), nor.getZ(i)); else nn.divideScalar(l);
      v.copy(iv).addScaledVector(nn, r);
      pos.setXYZ(i, v.x, v.y, v.z); nor.setXYZ(i, nn.x, nn.y, nn.z);
    }
    g.computeBoundingSphere();
    return cache[key] = g;
  }
  const BOX = new THREE.BoxGeometry(1, 1, 1);
  class Builder{
    constructor(){ this.g = {}; }
    /* geo: any geometry; key: material key; t = [x,y,z, sx,sy,sz, rx,ry,rz]; color tint; tile = texture tile size in world units */
    add(key, geo, x, y, z, sx = 1, sy = 1, sz = 1, ry = 0, color = 0xffffff, tile = 4, rx = 0, rz = 0, uvOff = 0){
      const b = this.g[key] || (this.g[key] = { p:[], n:[], u:[], c:[] });
      const g = geo.index ? geo.toNonIndexed() : geo;
      _m.compose(_v.set(x, y, z), _q.setFromEuler(_e.set(rx, ry, rz, 'YXZ')), _s.set(sx, sy, sz));
      _n3.getNormalMatrix(_m);
      const pa = g.attributes.position, na = g.attributes.normal;
      _c.set(color);
      const p = new THREE.Vector3(), nn = new THREE.Vector3();
      for(let i = 0; i < pa.count; i++){
        p.set(pa.getX(i), pa.getY(i), pa.getZ(i)).applyMatrix4(_m);
        nn.set(na.getX(i), na.getY(i), na.getZ(i)).applyMatrix3(_n3).normalize();
        b.p.push(p.x, p.y, p.z); b.n.push(nn.x, nn.y, nn.z); b.c.push(_c.r, _c.g, _c.b);
        const ax = Math.abs(nn.x), ay = Math.abs(nn.y), az = Math.abs(nn.z);
        let u, v;
        if(ay >= ax && ay >= az){ u = p.x; v = p.z; }
        else if(ax >= az){ u = nn.x > 0 ? -p.z : p.z; v = p.y; }
        else { u = nn.z > 0 ? p.x : -p.x; v = p.y; }
        b.u.push(u / tile + uvOff, v / tile);
      }
      if(g !== geo) g.dispose();
      return this;
    }
    /* an axis-aligned box from min/max corners */
    box(key, x0, y0, z0, x1, y1, z1, color = 0xffffff, tile = 4){ return this.add(key, BOX, (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2, x1 - x0, y1 - y0, z1 - z0, 0, color, tile); }
    rbox(key, x0, y0, z0, x1, y1, z1, r, color = 0xffffff, tile = 4){ return this.add(key, rbox(x1 - x0, y1 - y0, z1 - z0, r, 2), (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2, 1, 1, 1, 0, color, tile); }
    /* geometry with its OWN uvs (atlas pieces): uv rect [u0,v0,u1,v1] mapped onto the geometry's 0..1 uvs */
    addUV(key, geo, x, y, z, sx, sy, sz, ry, color, rect){
      const b = this.g[key] || (this.g[key] = { p:[], n:[], u:[], c:[] });
      const g = geo.index ? geo.toNonIndexed() : geo;
      _m.compose(_v.set(x, y, z), _q.setFromEuler(_e.set(0, ry, 0)), _s.set(sx, sy, sz)); _n3.getNormalMatrix(_m);
      const pa = g.attributes.position, na = g.attributes.normal, ua = g.attributes.uv; _c.set(color);
      const p = new THREE.Vector3(), nn = new THREE.Vector3();
      for(let i = 0; i < pa.count; i++){
        p.set(pa.getX(i), pa.getY(i), pa.getZ(i)).applyMatrix4(_m); nn.set(na.getX(i), na.getY(i), na.getZ(i)).applyMatrix3(_n3).normalize();
        b.p.push(p.x, p.y, p.z); b.n.push(nn.x, nn.y, nn.z); b.c.push(_c.r, _c.g, _c.b);
        b.u.push(rect[0] + (rect[2] - rect[0]) * ua.getX(i), rect[1] + (rect[3] - rect[1]) * ua.getY(i));
      }
      if(g !== geo) g.dispose();
      return this;
    }
    meshes(mats, group, shadows = {}){
      const out = {};
      for(const k of Object.keys(this.g)){
        const b = this.g[k]; if(!b.p.length) continue;
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.Float32BufferAttribute(b.p, 3));
        g.setAttribute('normal', new THREE.Float32BufferAttribute(b.n, 3));
        g.setAttribute('uv', new THREE.Float32BufferAttribute(b.u, 2));
        g.setAttribute('color', new THREE.Float32BufferAttribute(b.c, 3));
        g.computeBoundingSphere(); g.computeBoundingBox();
        const mesh = new THREE.Mesh(g, mats[k] || mats.plain);
        mesh.receiveShadow = true; mesh.castShadow = !!shadows[k];
        mesh.matrixAutoUpdate = false; mesh.updateMatrix();
        group.add(mesh); out[k] = mesh;
      }
      this.g = {};
      return out;
    }
  }
  return { rbox, Builder, BOX };
}
