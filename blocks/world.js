/* Bobo Blocks: the voxel world. 160×160 blocks, 48 high, cut in 16×16 chunks.
   makeWorld(seed) grows the same hills, river, lake, beach, trees, flowers and village (paths, plots, a first house and
   lamp posts) from the same seed on every phone, so a saved world or an online room only needs the seed + the list of
   changed blocks (edits). Torch / lamp light spreads 14–15 blocks (flood fill, redone only around a change).
   meshChunk() builds one chunk: greedy-merged cube faces (only faces next to air / see-through blocks) with corner shade
   and torch light per corner, plus the small shapes (torches, flowers, fences, doors, half blocks) and the water. */
import { OPAQUE, SOLID, SHAPE, LIGHT, CUT, TOP, SIDE, BOT, VALID, SH, ID, isLeaf } from './blocks.js';
import { bpCells, treeCells } from './blueprints.js';

export const WX = 160, WZ = 160, WH = 48, CS = 16, NCX = WX / CS, NCZ = WZ / CS, SEA = 11, VH = 16;
/* the village: 3 × 2 plots of 13 × 13 with paths between */
export const VX0 = 47, VZ0 = 55, VW = 51, VD = 35, PLOT = 13;
export const PLOTS = [];
for(let r = 0; r < 2; r++) for(let c = 0; c < 3; c++) PLOTS.push({ i:PLOTS.length, x:VX0 + 3 + c * 16, z:VZ0 + 3 + r * 16, s:PLOT });
export const SPAWN = { x:VX0 + 25.5, z:VZ0 + 17.5 };
export const LAKE = { x:124, z:116, r:11 };

export function rng(seed){ let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function hash2(x, z, s){ let h = Math.imul(x | 0, 374761393) + Math.imul(z | 0, 668265263) + Math.imul(s | 0, 1442695041); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
function vnoise(x, z, s){
  const xi = Math.floor(x), zi = Math.floor(z), xf = x - xi, zf = z - zi, u = xf * xf * (3 - 2 * xf), v = zf * zf * (3 - 2 * zf);
  const a = hash2(xi, zi, s), b = hash2(xi + 1, zi, s), c = hash2(xi, zi + 1, s), d = hash2(xi + 1, zi + 1, s);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
function fbm(x, z, s, o){ let t = 0, a = .5, f = 1, n = 0; for(let i = 0; i < o; i++){ t += vnoise(x * f, z * f, s + i * 31) * a; n += a; a *= .5; f *= 2; } return t / n; }
const sstep = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const idx = (x, y, z) => (y * WZ + z) * WX + x;
export const inWorld = (x, y, z) => x >= 0 && z >= 0 && x < WX && z < WZ && y >= 0 && y < WH;
export const inPath = (x, z) => {
  if(x < VX0 || z < VZ0 || x >= VX0 + VW || z >= VZ0 + VD) return false;
  const lx = x - VX0, lz = z - VZ0;
  return (lx % 16) < 3 || (lz % 16) < 3;
};
const riverX = z => LAKE.x - 2 + Math.sin(z / 13) * 7 + Math.sin(z / 5.3) * 1.5;

/* ---------- edits: pack / unpack (sorted index deltas as varints + the block id, base64) ---------- */
export function packEdits(m){
  const keys = [...m.keys()].sort((a, b) => a - b);
  const bytes = []; let prev = 0;
  for(const k of keys){ let d = k - prev; prev = k; while(d >= 128){ bytes.push((d & 127) | 128); d >>>= 7; } bytes.push(d); bytes.push(m.get(k) & 255); }
  let s = ''; const u = new Uint8Array(bytes);
  for(let i = 0; i < u.length; i += 8192) s += String.fromCharCode.apply(null, u.subarray(i, i + 8192));
  return btoa(s);
}
export function unpackEdits(str){
  const out = new Map(), size = WX * WZ * WH;
  if(typeof str !== 'string' || !str) return out;
  let bin; try{ bin = atob(str); }catch(e){ return out; }
  let i = 0, prev = 0;
  while(i < bin.length){
    let d = 0, sh = 0, b;
    do{ b = bin.charCodeAt(i++); d += (b & 127) * Math.pow(2, sh); sh += 7; }while(b & 128 && i < bin.length && sh < 35);
    if(i >= bin.length) break;
    const id = bin.charCodeAt(i++); prev += d;
    if(prev >= 0 && prev < size && (VALID[id] || id === 0)) out.set(prev, id);
  }
  return out;
}

export function makeWorld(seed){
  seed = seed >>> 0;
  const data = new Uint8Array(WX * WZ * WH), light = new Uint8Array(WX * WZ * WH), heights = new Int16Array(WX * WZ);
  const edits = new Map();
  const dirty = new Set();

  /* ---------- terrain height ---------- */
  function height(x, z){
    const n = fbm(x / 38, z / 38, seed, 4), m = fbm(x / 85 + 100, z / 85, seed + 7, 2);
    let h = 13 + n * 9 + m * m * 16;
    const ex = Math.max(0, Math.abs(x - WX / 2) - 52), ez = Math.max(0, Math.abs(z - WZ / 2) - 52);
    const e = Math.hypot(ex, ez) / 26 + (fbm(x / 9, z / 9, seed + 3, 2) - .5) * .25;
    if(e > 0) h = h + (5 - h) * sstep(0, 1, e);
    // lake
    const ld = Math.hypot(x - LAKE.x, z - LAKE.z) + (vnoise(x / 4, z / 4, seed + 9) - .5) * 3;
    if(ld < LAKE.r) h = Math.min(h, SEA - 1 - (1 - ld / LAKE.r) * 3.5);
    else if(ld < LAKE.r + 5) h = Math.min(h, SEA + 1 + (h - SEA - 1) * sstep(LAKE.r, LAKE.r + 5, ld));
    // river from the lake to the north shore
    if(z < LAKE.z){ const rd = Math.abs(x - riverX(z)); if(rd < 2.6) h = Math.min(h, SEA - 1.2); else if(rd < 6) h = Math.min(h, SEA + .6 + (h - SEA - .6) * sstep(2.6, 6, rd)); }
    // flat village
    const dx = Math.max(VX0 - 1 - x, 0, x - (VX0 + VW)), dz = Math.max(VZ0 - 1 - z, 0, z - (VZ0 + VD)), dv = Math.hypot(dx, dz);
    if(dv < 3) h = VH; else if(dv < 15) h = VH + (h - VH) * sstep(3, 15, dv);
    return Math.max(2, Math.min(WH - 10, Math.round(h)));
  }

  /* ---------- fill ---------- */
  for(let z = 0; z < WZ; z++) for(let x = 0; x < WX; x++){
    const h = height(x, z); heights[z * WX + x] = h;
    const sandy = h <= SEA + 1, path = inPath(x, z) && h === VH;
    for(let y = 0; y <= Math.max(h, SEA); y++){
      let id = 0;
      if(y === 0) id = ID.bedrock;
      else if(y < h - 3) id = ID.stone;
      else if(y < h) id = sandy ? ID.sand : ID.dirt;
      else if(y === h) id = path ? ID.path : sandy ? (h < SEA - 2 ? ID.gravel : ID.sand) : ID.grass;
      else if(y <= SEA) id = ID.water;
      data[idx(x, y, z)] = id;
    }
  }
  const R = rng(seed ^ 0x5bd1e995);
  const inVillage = (x, z, m) => x >= VX0 - m && z >= VZ0 - m && x < VX0 + VW + m && z < VZ0 + VD + m;
  /* trees */
  const trunks = [];
  for(let z = 3; z < WZ - 3; z++) for(let x = 3; x < WX - 3; x++){
    const h = heights[z * WX + x];
    if(data[idx(x, h, z)] !== ID.grass || inVillage(x, z, 5)) continue;
    const forest = fbm(x / 30 + 50, z / 30, seed + 11, 2);
    const p = forest > .55 ? .05 : forest > .45 ? .018 : .004;
    if(R() > p) continue;
    if(trunks.some(t => Math.abs(t[0] - x) < 4 && Math.abs(t[1] - z) < 4)) continue;
    const rr = R();
    const type = h >= 22 ? 'pine' : rr < .14 ? 'fruit' : rr < .32 ? 'birch' : rr < .4 ? 'pine' : 'oak';
    trunks.push([x, z]);
    for(const [a, b, c, id, force] of treeCells(type, x, h + 1, z, R)) if(inWorld(a, b, c) && (force || data[idx(a, b, c)] === 0)) data[idx(a, b, c)] = id;
  }
  /* a few trees near the village so it looks lived in */
  for(const [x, z, type] of [[VX0 - 3, VZ0 + 6, 'fruit'], [VX0 + VW + 2, VZ0 + 10, 'oak'], [VX0 + 8, VZ0 + VD + 3, 'birch'], [VX0 + VW + 3, VZ0 + VD + 1, 'fruit'], [VX0 + 30, VZ0 - 4, 'oak']]){
    const h = heights[z * WX + x];
    for(const [a, b, c, id, force] of treeCells(type, x, h + 1, z, R)) if(inWorld(a, b, c) && (force || data[idx(a, b, c)] === 0)) data[idx(a, b, c)] = id;
  }
  /* flowers and tall grass */
  for(let z = 1; z < WZ - 1; z++) for(let x = 1; x < WX - 1; x++){
    const h = heights[z * WX + x];
    if(data[idx(x, h, z)] !== ID.grass || data[idx(x, h + 1, z)] !== 0) continue;
    const plot = inVillage(x, z, 0);
    const r = R(), fl = fbm(x / 12, z / 12, seed + 21, 2);
    if(r < (plot ? .03 : .09)) data[idx(x, h + 1, z)] = ID.tallGrass;
    else if(r < (plot ? .035 : .09 + fl * .06)) data[idx(x, h + 1, z)] = [ID.flowerRed, ID.flowerYellow, ID.flowerBlue][Math.floor(fl * 7 + R() * 2) % 3];
  }
  /* the first house (plot 1) and lamp posts at the path crossings */
  const P1 = PLOTS[1], hc = bpCells('house', 0);
  const hx = P1.x + Math.floor((PLOT - hc.w) / 2), hz = P1.z + Math.floor((PLOT - hc.d) / 2);
  for(const [a, b, c, id] of hc.cells){ const X = hx + a, Y = VH + b, Z = hz + c; if(inWorld(X, Y, Z)) data[idx(X, Y, Z)] = id; }
  for(let r = 0; r < 3; r++) for(let c = 0; c < 4; c++){
    const x = VX0 + 1 + c * 16, z = VZ0 + 1 + r * 16;
    if(c === 0 && r === 0 || c === 3 && r === 2) continue;
    data[idx(x, VH + 1, z)] = ID.fence; data[idx(x, VH + 2, z)] = ID.fence; data[idx(x, VH + 3, z)] = ID.torch;
  }
  const builtPlots = [1];

  /* ---------- access ---------- */
  const get = (x, y, z) => (x < 0 || z < 0 || x >= WX || z >= WZ || y >= WH) ? 0 : y < 0 ? ID.bedrock : data[idx(x, y, z)];
  function markDirty(x, z){
    const cx = Math.floor(x / CS), cz = Math.floor(z / CS);
    for(let dz = -1; dz <= 1; dz++) for(let dx = -1; dx <= 1; dx++){
      const ax = Math.floor((x + dx) / CS), az = Math.floor((z + dz) / CS);
      if(ax >= 0 && az >= 0 && ax < NCX && az < NCZ) dirty.add(ax + az * NCX);
    }
    return cx + cz * NCX;
  }
  /* set one block; rec = remember it as an edit (saved, sent to friends) */
  function set(x, y, z, id, rec = true){
    if(!inWorld(x, y, z) || !VALID[id] && id !== 0) return false;
    const i = idx(x, y, z), old = data[i];
    if(old === id) return false;
    if(y === 0 && old === ID.bedrock) return false;
    data[i] = id;
    if(rec) edits.set(i, id);
    markDirty(x, z);
    if(LIGHT[old] || LIGHT[id] || (OPAQUE[old] !== OPAQUE[id] && nearLight(x, y, z))) relight(x - 15, y - 15, z - 15, x + 15, y + 15, z + 15);
    const h = heights[z * WX + x];
    if(id && SOLID[id] && y > h) heights[z * WX + x] = y;
    else if(!SOLID[id] && y === h){ let yy = y - 1; while(yy > 0 && !SOLID[data[idx(x, yy, z)]]) yy--; heights[z * WX + x] = yy; }
    return true;
  }
  function nearLight(x, y, z){
    for(let dy = -1; dy <= 1; dy++) for(let dz = -1; dz <= 1; dz++) for(let dx = -1; dx <= 1; dx++){ const X = x + dx, Y = y + dy, Z = z + dz; if(inWorld(X, Y, Z) && light[idx(X, Y, Z)]) return true; }
    return false;
  }
  /* highest solid block in a column (-1 = none) */
  function topSolid(x, z){ x = Math.floor(x); z = Math.floor(z); if(x < 0 || z < 0 || x >= WX || z >= WZ) return -1; return heights[z * WX + x]; }
  function surface(x, z){ x = Math.floor(x); z = Math.floor(z); if(x < 0 || z < 0 || x >= WX || z >= WZ) return 0; for(let y = WH - 1; y > 0; y--){ const id = data[idx(x, y, z)]; if(SOLID[id] || id === ID.water) return y; } return 0; }

  /* ---------- light: flood fill inside a box ---------- */
  let Q = new Int32Array(1 << 16);
  function relight(x0, y0, z0, x1, y1, z1){
    x0 = Math.max(0, x0); y0 = Math.max(0, y0); z0 = Math.max(0, z0); x1 = Math.min(WX - 1, x1); y1 = Math.min(WH - 1, y1); z1 = Math.min(WZ - 1, z1);
    let n = 0;
    const need = (x1 - x0 + 3) * (y1 - y0 + 3) * (z1 - z0 + 3) * 2;
    if(Q.length < need) Q = new Int32Array(need);
    for(let y = y0; y <= y1; y++) for(let z = z0; z <= z1; z++){ let i = idx(x0, y, z); for(let x = x0; x <= x1; x++, i++){ const L = LIGHT[data[i]]; light[i] = L; if(L) Q[n++] = i; } }
    // light coming in from just outside the box
    const edge = (x, y, z) => { if(inWorld(x, y, z)){ const i = idx(x, y, z); if(light[i] > 1) Q[n++] = i; } };
    for(let y = y0; y <= y1; y++) for(let z = z0; z <= z1; z++){ edge(x0 - 1, y, z); edge(x1 + 1, y, z); }
    for(let y = y0; y <= y1; y++) for(let x = x0; x <= x1; x++){ edge(x, y, z0 - 1); edge(x, y, z1 + 1); }
    for(let z = z0; z <= z1; z++) for(let x = x0; x <= x1; x++){ edge(x, y0 - 1, z); edge(x, y1 + 1, z); }
    let h = 0;
    const SY = WX * WZ;
    while(h < n){
      const i = Q[h++], L = light[i] - 1; if(L <= 0) continue;
      const x = i % WX, z = Math.floor(i / WX) % WZ, y = Math.floor(i / SY);
      const tryN = (X, Y, Z) => {
        if(X < x0 || X > x1 || Y < y0 || Y > y1 || Z < z0 || Z > z1) return;
        const j = idx(X, Y, Z); if(OPAQUE[data[j]] || light[j] >= L) return;
        light[j] = L; if(n >= Q.length){ const q2 = new Int32Array(Q.length * 2); q2.set(Q); Q = q2; } Q[n++] = j;
      };
      tryN(x + 1, y, z); tryN(x - 1, y, z); tryN(x, y + 1, z); tryN(x, y - 1, z); tryN(x, y, z + 1); tryN(x, y, z - 1);
    }
    for(let cz = Math.floor((z0 - 1) / CS); cz <= Math.floor((z1 + 1) / CS); cz++) for(let cx = Math.floor((x0 - 1) / CS); cx <= Math.floor((x1 + 1) / CS); cx++) if(cx >= 0 && cz >= 0 && cx < NCX && cz < NCZ) dirty.add(cx + cz * NCX);
  }

  function applyEdits(map){
    for(const [i, id] of map){ data[i] = id; edits.set(i, id); const x = i % WX, z = Math.floor(i / WX) % WZ, y = Math.floor(i / (WX * WZ)); const h = heights[z * WX + x]; if(SOLID[id] && y > h) heights[z * WX + x] = y; else if(!SOLID[id] && y === h){ let yy = y - 1; while(yy > 0 && !SOLID[data[idx(x, yy, z)]]) yy--; heights[z * WX + x] = yy; } }
    relightAll();
  }
  function relightAll(){ relight(0, 0, 0, WX - 1, WH - 1, WZ - 1); for(let i = 0; i < NCX * NCZ; i++) dirty.add(i); }
  relightAll();

  return { seed, data, light, heights, edits, dirty, get, set, topSolid, surface, relight, relightAll, packEdits:m => packEdits(m || edits), unpackEdits, applyEdits, idx, builtPlots, house:{ x:hx, z:hz } };
}

/* ======================================================================
   Meshing
   ====================================================================== */
const AOK = [.42, .62, .82, 1];
function buf(){ return { p:[], u:[], t:[], s:[], l:[], i:[], n:0 }; }
function quad(B, v, uv, tile, sh, tl, flip){
  const n = B.n;
  for(let k = 0; k < 4; k++){ B.p.push(v[k][0], v[k][1], v[k][2]); B.u.push(uv[k][0], uv[k][1]); B.t.push(tile); B.s.push(sh[k]); B.l.push(tl[k]); }
  if(flip) B.i.push(n + 1, n + 2, n + 3, n + 1, n + 3, n); else B.i.push(n, n + 1, n + 2, n, n + 2, n + 3);
  B.n += 4;
}
/* an axis-aligned box with world-aligned texture coordinates (so a small box shows the matching part of the tile) */
function box(B, x0, y0, z0, x1, y1, z1, tTop, tSide, tBot, tl, skip = 0, shK = 1){
  const L4 = [tl, tl, tl, tl];
  const S = k => [k * shK, k * shK, k * shK, k * shK];
  if(!(skip & 1)) quad(B, [[x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1]], [[z1, -y0], [z0, -y0], [z0, -y1], [z1, -y1]], tSide, S(.84), L4);
  if(!(skip & 2)) quad(B, [[x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0]], [[z0, -y0], [z1, -y0], [z1, -y1], [z0, -y1]], tSide, S(.84), L4);
  if(!(skip & 4)) quad(B, [[x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0]], [[x0, z1], [x1, z1], [x1, z0], [x0, z0]], tTop, S(1), L4);
  if(!(skip & 8)) quad(B, [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1]], [[x0, z0], [x1, z0], [x1, z1], [x0, z1]], tBot, S(.55), L4);
  if(!(skip & 16)) quad(B, [[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]], [[x0, -y0], [x1, -y0], [x1, -y1], [x0, -y1]], tSide, S(.72), L4);
  if(!(skip & 32)) quad(B, [[x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0]], [[x1, -y0], [x0, -y0], [x0, -y1], [x1, -y1]], tSide, S(.72), L4);
}

export function meshChunk(W, cx, cz){
  const { data, light } = W;
  const O = buf(), Wt = buf();
  const x0 = cx * CS, z0 = cz * CS;
  const size = [CS, WH, CS], org = [x0, 0, z0];
  const G = (x, y, z) => (x < 0 || z < 0 || x >= WX || z >= WZ || y >= WH) ? 0 : y < 0 ? 47 : data[(y * WZ + z) * WX + x];
  const LG = (x, y, z) => (x < 0 || z < 0 || x >= WX || z >= WZ || y >= WH || y < 0) ? 0 : light[(y * WZ + z) * WX + x];
  const mask = new Float64Array(CS * WH);
  const q = [0, 0, 0], e = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
  const FS = [.84, 1, .72];
  for(let d = 0; d < 3; d++){
    const u = (d + 1) % 3, v = (d + 2) % 3, du = size[u], dv = size[v], eu = e[u], ev = e[v];
    for(const s of [-1, 1]){
      for(let i = 0; i < size[d]; i++){
        let n = 0;
        for(let b = 0; b < dv; b++) for(let a = 0; a < du; a++){
          q[d] = i; q[u] = a; q[v] = b;
          const X = org[0] + q[0], Y = q[1], Z = org[2] + q[2];
          const id = data[(Y * WZ + Z) * WX + X];
          let key = 0;
          if(id && SHAPE[id] === 1){
            const NX = X + (d === 0 ? s : 0), NY = Y + (d === 1 ? s : 0), NZ = Z + (d === 2 ? s : 0);
            const nb = G(NX, NY, NZ);
            if(!OPAQUE[nb] && !(CUT[id] && (nb === id || (isLeaf(id) && isLeaf(nb))))){
              const tile = d === 1 ? (s > 0 ? TOP[id] : BOT[id]) : SIDE[id];
              let ao = 0, lt = 0, mul = 1;
              for(let c = 0; c < 4; c++){
                const su = (c === 1 || c === 2) ? 1 : -1, sv = c >= 2 ? 1 : -1;
                const ax = NX + eu[0] * su, ay = NY + eu[1] * su, az = NZ + eu[2] * su;
                const bx = NX + ev[0] * sv, by = NY + ev[1] * sv, bz = NZ + ev[2] * sv;
                const cxx = NX + eu[0] * su + ev[0] * sv, cy = NY + eu[1] * su + ev[1] * sv, czz = NZ + eu[2] * su + ev[2] * sv;
                const s1 = OPAQUE[G(ax, ay, az)], s2 = OPAQUE[G(bx, by, bz)], s3 = OPAQUE[G(cxx, cy, czz)];
                const a4 = (s1 && s2) ? 0 : 3 - (s1 + s2 + s3);
                let ls = LG(NX, NY, NZ), lc = 1;
                if(!s1){ ls += LG(ax, ay, az); lc++; } if(!s2){ ls += LG(bx, by, bz); lc++; } if(!s3 && !(s1 && s2)){ ls += LG(cxx, cy, czz); lc++; }
                ao += a4 * mul; lt += Math.round(ls / lc) * Math.pow(16, c); mul *= 4;
              }
              key = 1 + tile + 128 * (ao + 256 * lt);
            }
          }
          mask[n++] = key;
        }
        n = 0;
        for(let b = 0; b < dv; b++){
          for(let a = 0; a < du;){
            const k = mask[n];
            if(!k){ a++; n++; continue; }
            let w = 1; while(a + w < du && mask[n + w] === k) w++;
            let h = 1, stop = false;
            while(b + h < dv){ for(let t = 0; t < w; t++){ if(mask[n + t + h * du] !== k){ stop = true; break; } } if(stop) break; h++; }
            // emit
            let kk = k - 1; const tile = kk % 128; kk = Math.floor(kk / 128); const ao = kk % 256, lt = Math.floor(kk / 256);
            const aos = [ao & 3, (ao >> 2) & 3, (ao >> 4) & 3, (ao >> 6) & 3];
            const lts = [lt % 16, Math.floor(lt / 16) % 16, Math.floor(lt / 256) % 16, Math.floor(lt / 4096) % 16];
            const base = i + (s > 0 ? 1 : 0);
            const vs = [], uvs = [];
            for(const [ua, vb] of [[a, b], [a + w, b], [a + w, b + h], [a, b + h]]){
              const p = [0, 0, 0]; p[d] = base; p[u] = ua; p[v] = vb;
              const X = p[0] + org[0], Y = p[1], Z = p[2] + org[2];
              vs.push([X, Y, Z]);
              uvs.push(d === 1 ? [X, Z] : d === 0 ? [Z, -Y] : [X, -Y]);
            }
            const fsh = d === 1 ? (s > 0 ? 1 : .55) : FS[d];
            const sh = aos.map(x => fsh * AOK[x]), tl = lts.map(x => x / 15);
            let order = [0, 1, 2, 3];
            const flip = aos[0] + aos[2] < aos[1] + aos[3];
            if(s < 0){ order = [0, 3, 2, 1]; }
            quad(O, order.map(o => vs[o]), order.map(o => uvs[o]), tile, order.map(o => sh[o]), order.map(o => tl[o]), flip);
            for(let hh = 0; hh < h; hh++) for(let t = 0; t < w; t++) mask[n + t + hh * du] = 0;
            a += w; n += w;
          }
        }
      }
    }
  }
  /* small shapes and water */
  for(let y = 0; y < WH; y++) for(let z = z0; z < z0 + CS; z++) for(let x = x0; x < x0 + CS; x++){
    const id = data[(y * WZ + z) * WX + x];
    if(!id) continue;
    const sh = SHAPE[id];
    if(sh === 1) continue;
    const tl = LG(x, y, z) / 15;
    if(sh === SH.cross){
      const t = SIDE[id], a = .15, b = .85, top = id === ID.tallGrass ? .9 : 1;
      const v1 = [[x + a, y, z + a], [x + b, y, z + b], [x + b, y + top, z + b], [x + a, y + top, z + a]];
      const v2 = [[x + a, y, z + b], [x + b, y, z + a], [x + b, y + top, z + a], [x + a, y + top, z + b]];
      const uv = [[x + .001, -y], [x + .999, -y], [x + .999, -y - top], [x + .001, -y - top]];
      const S4 = [.95, .95, 1.05, 1.05], L4 = [tl, tl, tl, tl];
      quad(O, v1, uv, t, S4, L4); quad(O, [v1[1], v1[0], v1[3], v1[2]], [uv[1], uv[0], uv[3], uv[2]], t, S4, L4);
      quad(O, v2, uv, t, S4, L4); quad(O, [v2[1], v2[0], v2[3], v2[2]], [uv[1], uv[0], uv[3], uv[2]], t, S4, L4);
    } else if(sh === SH.torch){
      box(O, x + 7 / 16, y, z + 7 / 16, x + 9 / 16, y + 11 / 16, z + 9 / 16, SIDE[id], SIDE[id], SIDE[id], 1, 8, 1.25);
    } else if(sh === SH.slab){
      const t = TOP[id], sd = SIDE[id];
      let skip = 0;
      if(OPAQUE[G(x + 1, y, z)]) skip |= 1; if(OPAQUE[G(x - 1, y, z)]) skip |= 2; if(OPAQUE[G(x, y - 1, z)]) skip |= 8; if(OPAQUE[G(x, y, z + 1)]) skip |= 16; if(OPAQUE[G(x, y, z - 1)]) skip |= 32;
      box(O, x, y, z, x + 1, y + .5, z + 1, t, sd, BOT[id], Math.max(tl, LG(x, y + 1, z) / 15), skip);
    } else if(sh === SH.fence){
      const t = SIDE[id];
      box(O, x + 6 / 16, y, z + 6 / 16, x + 10 / 16, y + 1, z + 10 / 16, t, t, t, tl);
      const con = (X, Z) => { const n = G(X, y, Z); return SHAPE[n] === SH.fence || OPAQUE[n]; };
      for(const [yy0, yy1] of [[6 / 16, 9 / 16], [12 / 16, 15 / 16]]){
        if(con(x + 1, z)) box(O, x + 10 / 16, y + yy0, z + 7 / 16, x + 1, y + yy1, z + 9 / 16, t, t, t, tl, 3);
        if(con(x - 1, z)) box(O, x, y + yy0, z + 7 / 16, x + 6 / 16, y + yy1, z + 9 / 16, t, t, t, tl, 3);
        if(con(x, z + 1)) box(O, x + 7 / 16, y + yy0, z + 10 / 16, x + 9 / 16, y + yy1, z + 1, t, t, t, tl, 48);
        if(con(x, z - 1)) box(O, x + 7 / 16, y + yy0, z, x + 9 / 16, y + yy1, z + 6 / 16, t, t, t, tl, 48);
      }
    } else if(sh === SH.door){
      const t = SIDE[id], ax = (id === ID.doorX || id === ID.doorXH) ? 0 : 1;
      const lo = id === ID.doorX || id === ID.doorZ;
      const sk = lo ? 4 : 8;
      if(ax === 0) box(O, x, y, z + 6.5 / 16, x + 1, y + 1, z + 9.5 / 16, ID.plankDark && 9, t, 9, tl, sk);
      else box(O, x + 6.5 / 16, y, z, x + 9.5 / 16, y + 1, z + 1, 9, t, 9, tl, sk);
    } else if(sh === SH.water){
      const above = G(x, y + 1, z), topY = above === id ? y + 1 : y + .875, t = SIDE[id];
      const L4 = [tl, tl, tl, tl];
      if(above !== id && !OPAQUE[above]) quad(Wt, [[x, topY, z + 1], [x + 1, topY, z + 1], [x + 1, topY, z], [x, topY, z]], [[x, z + 1], [x + 1, z + 1], [x + 1, z], [x, z]], t, [1, 1, 1, 1], L4);
      const side = (X, Y, Z) => { const n = G(X, Y, Z); return n !== id && !OPAQUE[n]; };
      if(side(x + 1, y, z)) quad(Wt, [[x + 1, y, z + 1], [x + 1, y, z], [x + 1, topY, z], [x + 1, topY, z + 1]], [[z + 1, -y], [z, -y], [z, -topY], [z + 1, -topY]], t, [.8, .8, .8, .8], L4);
      if(side(x - 1, y, z)) quad(Wt, [[x, y, z], [x, y, z + 1], [x, topY, z + 1], [x, topY, z]], [[z, -y], [z + 1, -y], [z + 1, -topY], [z, -topY]], t, [.8, .8, .8, .8], L4);
      if(side(x, y, z + 1)) quad(Wt, [[x, y, z + 1], [x + 1, y, z + 1], [x + 1, topY, z + 1], [x, topY, z + 1]], [[x, -y], [x + 1, -y], [x + 1, -topY], [x, -topY]], t, [.7, .7, .7, .7], L4);
      if(side(x, y, z - 1)) quad(Wt, [[x + 1, y, z], [x, y, z], [x, topY, z], [x + 1, topY, z]], [[x + 1, -y], [x, -y], [x, -topY], [x + 1, -topY]], t, [.7, .7, .7, .7], L4);
      if(side(x, y - 1, z)) quad(Wt, [[x, y, z], [x + 1, y, z], [x + 1, y, z + 1], [x, y, z + 1]], [[x, z], [x + 1, z], [x + 1, z + 1], [x, z + 1]], t, [.5, .5, .5, .5], L4);
    }
  }
  return { o:O, w:Wt };
}

/* ---------- voxel ray (DDA): first block hit, with the face normal ---------- */
export function raycast(W, ox, oy, oz, dx, dy, dz, maxD, hitWater){
  let x = Math.floor(ox), y = Math.floor(oy), z = Math.floor(oz);
  const sx = dx > 0 ? 1 : -1, sy = dy > 0 ? 1 : -1, sz = dz > 0 ? 1 : -1;
  const tdx = Math.abs(1 / dx), tdy = Math.abs(1 / dy), tdz = Math.abs(1 / dz);
  let tx = (dx > 0 ? x + 1 - ox : ox - x) * tdx, ty = (dy > 0 ? y + 1 - oy : oy - y) * tdy, tz = (dz > 0 ? z + 1 - oz : oz - z) * tdz;
  let nx = 0, ny = 0, nz = 0, t = 0;
  for(let i = 0; i < 400 && t <= maxD; i++){
    const id = W.get(x, y, z);
    if(id && (id !== ID.water || hitWater) && y >= 0) return { x, y, z, nx, ny, nz, id, t };
    if(tx < ty && tx < tz){ x += sx; t = tx; tx += tdx; nx = -sx; ny = 0; nz = 0; }
    else if(ty < tz){ y += sy; t = ty; ty += tdy; nx = 0; ny = -sy; nz = 0; }
    else { z += sz; t = tz; tz += tdz; nx = 0; ny = 0; nz = -sz; }
    if(y < 0 || y >= WH + 30) break;
  }
  return null;
}
