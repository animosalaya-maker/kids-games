/* «قلعة الألعاب» — the five new zones around the castle island (metadata + shared layout math + a small builder kit).
   Each zone is its own island far out at sea (≥ 430 m from any other, beyond the fog), built lazily the first time a kid
   travels there (dynamic import of zone_<id>.js). Only the zone you stand in is drawn.
   Coordinates in this file are LOCAL to a zone (its centre is 0,0); the zone sits at (cx, 0, cz) in the world.
   Heights (y) are absolute. Nothing here needs THREE, so the castle page can read toys/stations without building. */

const L = (a, e, t) => window.L ? window.L(a, e, t) : a;
const smooth = t => t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t);
const lerp = (a, b, t) => a + (b - a) * t;

/* ================= Snow Mountain: a terraced mountain (5 snowy tiers), switchback stairs, chairlift, ice slide, sled run ================= */
export const SNOW = { TR:[36, 29, 22, 15.5, 10], TT:[5, 10, 15, 20, 26], FLARE:.6 };
/* a smooth line over the tier edges: the ice slide and the sled chute rest on it (always above the terrace below) */
export function rampY(r){
  const P = [[10, 26], [15.5, 20], [22, 15], [29, 10], [36, 5], [44, 0]];
  if(r <= 10) return 26;
  for(let i = 1; i < P.length; i++) if(r <= P[i][0]){ const [r0, y0] = P[i - 1], [r1, y1] = P[i]; return y0 + (y1 - y0) * (r - r0) / (r1 - r0); }
  return 0;
}
/* switchback stairs: segment k climbs from tier k-1 (ground for k=0) to tier k, alternating direction (east side) */
export function snowStairs(){
  const out = []; let a0 = 1.3;
  for(let k = 0; k < 5; k++){
    const y0 = k ? SNOW.TT[k - 1] : 0, y1 = SNOW.TT[k], R = SNOW.TR[k] + 1.75, n = Math.ceil((y1 - y0) / .42), rise = (y1 - y0) / n;
    const span = (n * 1.0) / R, dir = k % 2 ? -1 : 1;
    for(let i = 1; i <= n; i++){ const a = a0 + dir * span * (i - .5) / n; out.push({ k, i, n, x:Math.sin(a) * R, z:Math.cos(a) * R, y:y0 + rise * i, a, R }); }
    a0 += dir * span;
  }
  return out;
}
/* chairlift: up line at x=-1, cable from (−1, 4.6, 48) to (−1, 32, 6); the seat hangs 2.3 below */
export const CHAIR = { A:[-1, 4.6, 48], B:[-1, 32, 6], hang:2.3 };
export function chairAt(t){ const { A, B, hang } = CHAIR; return [A[0], lerp(A[1], B[1], t) - hang + Math.sin(t * Math.PI) * -.6, lerp(A[2], B[2], t)]; }
/* ice slide: a spiral chute on the west side, from the summit down to the snow */
export function slideAt(t){ const r = 11.5 + 34.5 * t, a = 4.1 + 1.9 * t; return [Math.sin(a) * r, rampY(r) + .6, Math.cos(a) * r]; }
/* the sled run: from the summit north edge straight down the north face (with wiggles), then a long curve east on the snow */
function catmull(pts, seg){
  const out = [];
  for(let i = 0; i < pts.length - 1; i++){
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
    for(let k = 0; k < seg; k++){ const t = k / seg, t2 = t * t, t3 = t2 * t;
      out.push([0, 1].map(j => .5 * ((2 * p1[j]) + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t3))); }
  }
  out.push(pts[pts.length - 1].slice()); return out;
}
let sledMemo = null;
export function sledTrack(){
  if(sledMemo) return sledMemo;
  const ctl = [];
  for(let i = 0; i <= 10; i++){ const r = 7 + 5.2 * i, a = Math.PI + .3 * Math.sin(i * .95); ctl.push([Math.sin(a) * r, Math.cos(a) * r]); }
  for(let i = 1; i <= 7; i++){ const a = Math.PI - .12 - i * .21, r = 62 + Math.sin(i * 1.3) * 2.5; ctl.push([Math.sin(a) * r, Math.cos(a) * r]); }
  const raw = catmull(ctl, 10), pts = [];
  let s = 0;
  for(let i = 0; i < raw.length; i++){
    const [x, z] = raw[i]; if(i) s += Math.hypot(x - raw[i - 1][0], z - raw[i - 1][1]);
    pts.push({ x, z, s, y:rampY(Math.hypot(x, z)) + .25 });
  }
  // smooth the height a little (no kinks at tier edges) and add tangents/normals
  for(let pass = 0; pass < 3; pass++) for(let i = 1; i < pts.length - 1; i++) pts[i].y = Math.max(rampY(Math.hypot(pts[i].x, pts[i].z)) + .2, (pts[i - 1].y + pts[i].y * 2 + pts[i + 1].y) / 4);
  for(let i = 0; i < pts.length; i++){ const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)], l = Math.hypot(b.x - a.x, b.z - a.z) || 1; pts[i].tx = (b.x - a.x) / l; pts[i].tz = (b.z - a.z) / l; pts[i].nx = pts[i].tz; pts[i].nz = -pts[i].tx; }
  const len = s;
  function at(sv, lat = 0){
    sv = Math.max(0, Math.min(len, sv));
    let lo = 0, hi = pts.length - 1; while(hi - lo > 1){ const m = (lo + hi) >> 1; if(pts[m].s <= sv) lo = m; else hi = m; }
    const a = pts[lo], b = pts[hi], t = b.s > a.s ? (sv - a.s) / (b.s - a.s) : 0;
    const tx = lerp(a.tx, b.tx, t), tz = lerp(a.tz, b.tz, t), nx = tz, nz = -tx;
    return { x:lerp(a.x, b.x, t) + nx * lat, z:lerp(a.z, b.z, t) + nz * lat, y:lerp(a.y, b.y, t), tx, tz, nx, nz, slope:(b.y - a.y) / Math.max(.01, b.s - a.s) };
  }
  sledMemo = { pts, len, at, W:2.7 };
  return sledMemo;
}

/* ================= Soft Lava Volcano: an obby spiralling up a cartoon volcano; the "lava" is bouncy orange jelly ================= */
export const VOLC = { cx:0, cz:-8, base:30, top:10, H:26, jelly:38 };
export const coneR = y => VOLC.base - (VOLC.base - VOLC.top) * Math.max(0, Math.min(1, y / VOLC.H));
let obbyMemo = null;
/* kinds: s = static block, c = small drum, m = moving (radial), e = elevator (up/down), b = bounce mushroom, p = spinner platform, k = checkpoint, f = finish */
export function obbyPath(){
  if(obbyMemo) return obbyMemo;
  const seq = 'sssmskccbsessmkpcmbspskmmssf';
  const out = []; let y = 1.1, a = .08;
  for(let i = 0; i < seq.length; i++){
    const t = seq[i], prev = seq[i - 1];
    if(i){ y += prev === 'b' ? 2.6 : t === 'f' ? .6 : .82; }
    const big = t === 'k' || t === 'p' || t === 'f';
    a += i ? ((big || prev === 'k' || prev === 'p') ? 4.7 : 4.0) / (coneR(y) + 3.1) : 0;
    const r = coneR(y) + (t === 'f' ? 0 : 3.1);
    out.push({ i, t, a, y, x:VOLC.cx + Math.sin(a) * r, z:VOLC.cz + Math.cos(a) * r, R:t === 'f' ? 3.4 : big ? 2.3 : t === 'c' ? 1.15 : 1.45 });
  }
  obbyMemo = out; return out;
}

/* ================= Candy Castle: a biscuit castle, a chocolate-bar maze, 4 keys open the throne room ================= */
export const CANDY = { X0:-24, X1:24, Z0:-44, Z1:4, gate:3.5, throne:{ x0:-9, x1:9, z0:-44, z1:-30, door:2.2 },
  maze:{ x0:-20, z0:-26, cols:10, rows:6, cell:4 }, river:x => 34 + 7 * Math.sin(x / 14), riverW:4.3, bridges:[0, -26, 30] };
let mazeMemo = null;
export function candyMaze(){
  if(mazeMemo) return mazeMemo;
  const { cols, rows } = CANDY.maze, N = cols * rows;
  let sd = 4242; const r = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
  const open = new Set(), seen = new Uint8Array(N), key = (a, b) => a < b ? a + '_' + b : b + '_' + a;
  const ent = (rows - 1) * cols + 5, exit = 4;                                    // bottom row col 5 (gate side), top row col 4 (throne side)
  const st = [ent]; seen[ent] = 1;
  while(st.length){
    const c = st[st.length - 1], cx = c % cols, cy = (c / cols) | 0, nb = [];
    if(cx > 0 && !seen[c - 1]) nb.push(c - 1); if(cx < cols - 1 && !seen[c + 1]) nb.push(c + 1);
    if(cy > 0 && !seen[c - cols]) nb.push(c - cols); if(cy < rows - 1 && !seen[c + cols]) nb.push(c + cols);
    if(!nb.length){ st.pop(); continue; }
    const n = nb[Math.floor(r() * nb.length)]; open.add(key(c, n)); seen[n] = 1; st.push(n);
  }
  // a few extra openings so it is a friendly maze (loops)
  for(const [a, b] of [[12, 13], [33, 43], [26, 27], [47, 48]]) open.add(key(a, b));
  // distance from the entrance, dead ends
  const dist = new Array(N).fill(-1); dist[ent] = 0; const q = [ent];
  const nbs = c => { const cx = c % cols, cy = (c / cols) | 0, o = []; if(cx > 0) o.push(c - 1); if(cx < cols - 1) o.push(c + 1); if(cy > 0) o.push(c - cols); if(cy < rows - 1) o.push(c + cols); return o.filter(n => open.has(key(c, n))); };
  while(q.length){ const c = q.shift(); for(const n of nbs(c)) if(dist[n] < 0){ dist[n] = dist[c] + 1; q.push(n); } }
  const center = c => ({ x:CANDY.maze.x0 + (c % cols + .5) * CANDY.maze.cell, z:CANDY.maze.z0 + (((c / cols) | 0) + .5) * CANDY.maze.cell });
  const dead = [...Array(N).keys()].filter(c => c !== ent && c !== exit && nbs(c).length === 1).sort((a, b) => dist[b] - dist[a]);
  // spread the 4 keys: farthest dead ends, not two in the same column pair
  const keys = []; for(const c of dead){ if(keys.length >= 4) break; if(keys.every(k => Math.abs(k % cols - c % cols) + Math.abs(((k / cols) | 0) - ((c / cols) | 0)) > 3)) keys.push(c); }
  for(const c of dead){ if(keys.length >= 4) break; if(!keys.includes(c)) keys.push(c); }
  const toyCells = dead.filter(c => !keys.includes(c)).slice(0, 2);
  mazeMemo = { cols, rows, open, key, ent, exit, dist, center, keys:keys.map(center), toys:toyCells.map(center), dead };
  return mazeMemo;
}

/* ================= Pirate Bay: a crescent island around a round bay that opens south to the sea ================= */
export const BAY = { cx:0, cz:52, r:36, pier:{ x:0, z0:12, z1:27, y:.45 }, ship:{ x:0, z:35 }, cannon:{ x:-14, z:12.5 },
  X:[[-30, -12], [34, -20], [-52, 18], [52, 22], [-8, -44], [24, -54], [-44, -40], [46, -42]] };

/* ================= Sky Fun Park: cloud islands over a little island with a giant beanstalk ================= */
export const SKY = {
  clouds:{ M:{ x:0, z:-20, y:36, r:13 }, A:{ x:30, z:-32, y:38, r:8 }, B:{ x:36, z:4, y:40, r:7 }, C:{ x:-30, z:-32, y:38, r:8 }, D:{ x:-36, z:4, y:40, r:7 }, E:{ x:0, z:-54, y:42, r:9 } },
  bridges:[['M', 'A'], ['A', 'B'], ['M', 'C'], ['C', 'D'], ['A', 'E'], ['C', 'E']],
  stalk:{ x:0, z:0, top:36 }, wheel:{ x:0, z:-24, y:36, R:8.5 }, balloon:{ x:14, z:10 }, spring:{ x:-12, z:8 },
  zip:['E', 'B', 'D', 'C', 'E']
};
export function skyBridge(a, b){
  const A = SKY.clouds[a], B = SKY.clouds[b], d = Math.hypot(B.x - A.x, B.z - A.z), ux = (B.x - A.x) / d, uz = (B.z - A.z) / d;
  const s0 = A.r - 1.2, s1 = d - B.r + 1.2, n = Math.max(2, Math.ceil((s1 - s0) / 1.15)), pts = [];
  for(let i = 0; i <= n; i++){ const t = i / n, s = lerp(s0, s1, t); pts.push({ x:A.x + ux * s, z:A.z + uz * s, y:lerp(A.y, B.y, t) + Math.sin(t * Math.PI) * 2.2 }); }
  return { pts, ux, uz };
}
/* beanstalk leaves: a spiral of leaf platforms around the stalk (each a small jump up), the last one reaches cloud M */
export function stalkLeaves(){
  const out = [], n = 34; let a = 1.2;
  for(let i = 0; i < n; i++){ const y = 1.1 + i * (SKY.stalk.top - 1.1) / (n - 1); a += .62; const r = 3.4; out.push({ x:SKY.stalk.x + Math.sin(a) * r, z:SKY.stalk.z + Math.cos(a) * r, y, a }); }
  // final leaf: points at cloud M
  out.push({ x:0, z:-5.6, y:SKY.stalk.top, a:Math.PI, big:true });
  return out;
}
export function wheelSeat(ang){ const W = SKY.wheel, cy = W.y + W.R + 1.6; return [W.x + Math.sin(ang) * W.R, cy - Math.cos(ang) * W.R - .9, W.z]; }
export function zipAt(t){
  const P = SKY.zip.map(k => { const c = SKY.clouds[k]; return [c.x, c.y + 4.2, c.z]; }), n = P.length - 1, f = Math.min(n - 1e-6, t * n), i = Math.floor(f), u = f - i;
  const a = P[i], b = P[i + 1];
  return [lerp(a[0], b[0], u), lerp(a[1], b[1], u) - Math.sin(u * Math.PI) * 3 - 2.05, lerp(a[2], b[2], u)];
}

/* ================= the zones ================= */
export const ZONE_IDS = ['snow', 'candy', 'volcano', 'pirate', 'sky'];
export const ZONES = {
  castle:{ id:'castle', cx:0, cz:0, R:80, e:'🏰', col:'#ffcd4d', name:L('قلعة الألعاب', 'Toy Castle', 'Oyuncak Kalesi') },
  snow:{ id:'snow', cx:0, cz:-560, R:92, e:'⛰️', col:'#7fd6ff', file:'./zone_snow.js', name:L('جبل التلج', 'Snow Mountain', 'Karlı Dağ'),
    sub:L('تلفريك، زحليطة تلج، وسباق زلاجات!', 'Chairlift, ice slide and a sled race!', 'Teleferik, buz kaydırağı ve kızak yarışı!'),
    spawn:{ x:0, z:70, f:Math.PI }, portal:{ x:0, z:84 },
    toys:[[6.5, -4, 26], [-25, -3, 10], [2.5, 13.2, 20], [-40, 50, 0], [-1, 27, 16], [-27.2, 9.4, 10.8], [-45, -38, 0], [-70, 15, 0]] },
  candy:{ id:'candy', cx:560, cz:0, R:88, e:'🍭', col:'#ff8fd0', file:'./zone_candy.js', name:L('قلعة الحلويات', 'Candy Castle', 'Şeker Kalesi'),
    sub:L('متاهة شوكولا، أرض جيلي بتنطّ، ونهر شوكولا!', 'A chocolate maze, bouncy gummy floors and a chocolate river!', 'Çikolata labirenti, zıplayan jöle zemin ve çikolata nehri!'),
    spawn:{ x:0, z:66, f:Math.PI }, portal:{ x:0, z:80 },
    toys:null },
  volcano:{ id:'volcano', cx:-560, cz:0, R:88, e:'🌋', col:'#ff8a3c', file:'./zone_volcano.js', name:L('بركان الحمم الطري', 'Soft Lava Volcano', 'Yumuşak Lav Yanardağı'),
    sub:L('اطلع عالبركان! الحمم جيلي طري بيرجعك لعند العلم', 'Climb the volcano! The lava is soft jelly that bounces you back to the flag', 'Yanardağa tırman! Lav, seni bayrağa geri zıplatan yumuşak jöle'),
    spawn:{ x:0, z:66, f:Math.PI }, portal:{ x:0, z:80 },
    toys:null },
  pirate:{ id:'pirate', cx:0, cz:560, R:86, e:'🏴‍☠️', col:'#ffc83a', file:'./zone_pirate.js', name:L('قراصنة الخليج', 'Pirate Bay', 'Korsan Koyu'),
    sub:L('سفينة قراصنة لطيفة، خريطة كنز، ومدفع طابات طرية!', 'A friendly pirate ship, a treasure map and a soft-ball cannon!', 'Sevimli korsan gemisi, hazine haritası ve yumuşak top atan top!'),
    spawn:{ x:0, z:-60, f:0 }, portal:{ x:0, z:-74 },
    toys:[[0, 26, .45], [24, 52, 1.25], [-20, 44, 1.25], [-34, -26, 0], [58, -10, 0], [-62, 8, 0], [10, -28, 4.1], [-4, 74, 1.25]] },
  sky:{ id:'sky', cx:420, cz:-420, R:52, e:'☁️', col:'#b48cff', file:'./zone_sky.js', name:L('مدينة الملاهي بالغيم', 'Sky Fun Park', 'Bulut Lunaparkı'),
    sub:L('شجرة فول عملاقة، دولاب هوا، تلفريك بين الغيمات، وسباق عملات!', 'A giant beanstalk, a Ferris wheel, ziplines between clouds and a coin rush!', 'Dev fasulye sırığı, dönme dolap, bulutlar arası zipline ve altın koşusu!'),
    spawn:{ x:0, z:30, f:Math.PI }, portal:{ x:0, z:44 },
    toys:null }
};
/* toys that depend on layout math */
(() => {
  const ob = obbyPath();
  ZONES.volcano.toys = [[ob[6].x, ob[6].z, ob[6].y + 1.2], [ob[12].x, ob[12].z, ob[12].y + 1.4], [ob[20].x, ob[20].z, ob[20].y + 1.2], [ob[25].x, ob[25].z, ob[25].y + 1.3],
    [0, -50, 0], [-48, 30, 0], [52, 26, 0], [-30, -56, 0]];
  const mz = candyMaze();
  ZONES.candy.toys = [[mz.toys[0].x, mz.toys[0].z, 0], [mz.toys[1].x, mz.toys[1].z, 0], [0, -40.5, 0], [40, -16, 8.2], [-52, 18, 0], [60, 40, 0], [-36, -58, 0], [46, -50, 0]];
  const st = stalkLeaves(), C = SKY.clouds, ws = wheelSeat(Math.PI), zp = zipAt(.37);
  ZONES.sky.toys = [[st[14].x, st[14].z, st[14].y], [C.E.x + 4, C.E.z - 3, C.E.y], [C.B.x + 2, C.B.z + 3, C.B.y], [C.D.x - 2, C.D.z + 3, C.D.y], [ws[0], ws[2], ws[1]], [zp[0], zp[2], zp[1]], [-30, 18, 0], [32, -14, 0]];
})();

/* the new stations (modes). Pads in local coords, y = floor height of the pad */
export const ZSTN = {
  sled:  { zone:'snow', e:'🛷', col:'#7fd6ff', x:0, z:-6.5, y:26, race:true, kind:'time', name:L('سباق الزلاجات', 'Sled Race', 'Kızak Yarışı'), stars:t => t < 16 ? 3 : t < 24 ? 2 : 1 },
  candy: { zone:'candy', e:'🗝️', col:'#ff8fd0', x:7, z:9, y:0, kind:'time', name:L('مفاتيح العرش', 'Throne Keys', 'Taht Anahtarları'), stars:t => t < 75 ? 3 : t < 130 ? 2 : 1 },
  obby:  { zone:'volcano', e:'🌋', col:'#ff8a3c', x:2.6, z:42, y:0, race:true, kind:'time', name:L('تحدي البركان', 'Volcano Obby', 'Yanardağ Parkuru'), stars:t => t < 80 ? 3 : t < 140 ? 2 : 1 },
  hunt:  { zone:'pirate', e:'🗺️', col:'#ffc83a', x:14, z:7, y:0, kind:'time', name:L('صيد الكنز', 'Treasure Hunt', 'Hazine Avı'), stars:t => t < 60 ? 3 : t < 100 ? 2 : 1 },
  cannon:{ zone:'pirate', e:'🎯', col:'#ff6f8e', x:-14, z:8, y:0, kind:'time', name:L('مدفع الطابات', 'Cannon Practice', 'Top Atışı'), stars:t => t < 35 ? 3 : t < 48 ? 2 : 1 },
  coins: { zone:'sky', e:'🪙', col:'#ffd23f', x:-7, z:-14, y:36, race:true, kind:'score', hi:true, name:L('سباق العملات', 'Coin Rush', 'Altın Koşusu'), stars:n => n >= 33 ? 3 : n >= 26 ? 2 : 1 }
};
export const ZSTN_IDS = Object.keys(ZSTN);
/* castle hub: 5 rainbow portals on an arc south of the moat */
export const HUB = { r:62, list:[['volcano', -.5], ['pirate', -.25], ['snow', 0], ['sky', .25], ['candy', .5]] };

/* which zone a world point belongs to */
export function zoneAt(x, z){
  if(x * x + z * z < 170 * 170) return 'castle';
  for(const id of ZONE_IDS){ const Z = ZONES[id]; const dx = x - Z.cx, dz = z - Z.cz; if(dx * dx + dz * dz < 170 * 170) return id; }
  return 'sea';
}

/* ================= shared builder kit ================= */
export function zkit(THREE, K, Z, gLocal){
  const { Merge, G, canvasTex, glowTex } = K;
  const CG = { sph:new THREE.SphereGeometry(1, 14, 10), sm:new THREE.SphereGeometry(1, 7, 5), cyl:new THREE.CylinderGeometry(1, 1, 1, 22), cyl8:new THREE.CylinderGeometry(1, 1, 1, 8),
    cone:new THREE.ConeGeometry(1, 1, 16), cone4:G.cone4, hemi:new THREE.SphereGeometry(1, 12, 5, 0, Math.PI * 2, 0, Math.PI / 2), torus:new THREE.TorusGeometry(1, .18, 6, 20), box:G.box, ico:G.ico };
  let sd = 9871 + Z.cx * 7 + Z.cz * 3; sd = Math.abs(Math.round(sd)) % 2147483646 + 1;
  const rnd = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
  const group = new THREE.Group(); group.position.set(Z.cx, 0, Z.cz); group.name = 'zone_' + Z.id;
  const solids = [], movers = [], ox = Z.cx, oz = Z.cz;
  const addC = (x, z, r, y0, y1, o) => { const s = Object.assign({ t:'c', x:x + ox, z:z + oz, r, y0, y1 }, o || {}); solids.push(s); return s; };
  const addB = (x, z, hx, hz, y0, y1, o) => { const s = Object.assign({ t:'b', x:x + ox, z:z + oz, hx, hz, y0, y1 }, o || {}); solids.push(s); return s; };
  const mover = (o) => { const s = Object.assign({ mv:1, dx:0, dz:0, _t:0 }, o); s.x += ox; s.z += oz; movers.push(s); return s; };
  const matV = new THREE.MeshLambertMaterial({ vertexColors:true });
  const matGlow = new THREE.MeshBasicMaterial({ vertexColors:true });
  const CH = 40, chunks = new Map(), glow = new Merge();
  function M(x, z, detail){
    const k = (detail ? 'd' : 's') + Math.floor((x + 200) / CH) + '_' + Math.floor((z + 200) / CH);
    let c = chunks.get(k); if(!c){ c = { m:new Merge(), detail:!!detail, cx:0, cz:0, n:0 }; chunks.set(k, c); }
    c.cx += x; c.cz += z; c.n++; return c.m;
  }
  function bake(g, floor){
    const p = g.attributes.position, n = g.attributes.normal, c = g.attributes.color;
    for(let i = 0; i < p.count; i++){
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i), h = y - Math.max(floor ? floor(x, z) : gLocal(x, z), -1.5);
      let k = .62 + .38 * smooth(h / 1.4);
      const ny = n.getY(i); if(ny < -.5) k *= .8; else if(ny > .7) k *= 1.04;
      c.setXYZ(i, Math.min(1, c.getX(i) * k), Math.min(1, c.getY(i) * k), Math.min(1, c.getZ(i) * k));
    }
  }
  const culled = [];
  function finish(floor){
    for(const c of chunks.values()){
      if(c.m.empty) continue;
      const g = c.m.geometry(); bake(g, floor);
      const mesh = new THREE.Mesh(g, matV); mesh.castShadow = true; mesh.receiveShadow = true; mesh.matrixAutoUpdate = false; group.add(mesh);
      if(c.detail){ mesh.userData.c = [c.cx / c.n + ox, c.cz / c.n + oz]; culled.push(mesh); }
    }
    if(!glow.empty){ const gm = new THREE.Mesh(glow.geometry(), matGlow); gm.matrixAutoUpdate = false; group.add(gm); }
  }
  /* a radial lathe ground with vertex colours: prof(r) → y, col(x, z, r, y, c) sets c */
  function groundMesh(Rmax, rings, colFn, N = 120){
    const pos = [], col = [], idx = [], c = new THREE.Color();
    for(let i = 0; i < rings.length; i++) for(let j = 0; j < N; j++){
      const a = j / N * Math.PI * 2, r = rings[i], x = Math.sin(a) * r, z = Math.cos(a) * r, y = gLocal(x, z);
      pos.push(x, y, z); colFn(x, z, r, y, c); col.push(c.r, c.g, c.b);
    }
    for(let i = 0; i < rings.length - 1; i++) for(let j = 0; j < N; j++){ const a = i * N + j, b = i * N + (j + 1) % N, d = (i + 1) * N + j, e = (i + 1) * N + (j + 1) % N; idx.push(a, d, b, b, d, e); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setIndex(idx); g.computeVertexNormals();
    const m = new THREE.Mesh(g, matV); m.receiveShadow = true; m.matrixAutoUpdate = false; group.add(m); return m;
  }
  /* a grid ground (for zones that are not round, e.g. the bay or the river) */
  function gridGround(R, step, colFn){
    const n = Math.ceil(R * 2 / step), pos = [], col = [], idx = [], c = new THREE.Color();
    for(let i = 0; i <= n; i++) for(let j = 0; j <= n; j++){ const x = -R + j * step, z = -R + i * step, y = gLocal(x, z); pos.push(x, y, z); colFn(x, z, Math.hypot(x, z), y, c); col.push(c.r, c.g, c.b); }
    for(let i = 0; i < n; i++) for(let j = 0; j < n; j++){ const a = i * (n + 1) + j, b = a + 1, d = a + n + 1, e = d + 1; idx.push(a, d, b, b, d, e); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setIndex(idx); g.computeVertexNormals();
    const m = new THREE.Mesh(g, matV); m.receiveShadow = true; m.matrixAutoUpdate = false; group.add(m); return m;
  }
  const FONT = '"Baloo Bhaijaan 2","Tajawal",system-ui,sans-serif';
  function sign(text, col, x, y, z, w = 4.2){
    const tex = canvasTex(512, 128, (c, W, H) => {
      c.clearRect(0, 0, W, H);
      const r = 46; c.beginPath(); c.moveTo(r, 8); c.arcTo(W - 8, 8, W - 8, H - 8, r); c.arcTo(W - 8, H - 8, 8, H - 8, r); c.arcTo(8, H - 8, 8, 8, r); c.arcTo(8, 8, W - 8, 8, r); c.closePath();
      c.fillStyle = '#fff7e8'; c.fill(); c.lineWidth = 12; c.strokeStyle = col; c.stroke();
      c.fillStyle = '#2a1f4a'; c.font = '800 58px ' + FONT; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(text, W / 2, H / 2 + 4, W - 60);
    });
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map:tex, transparent:true, depthWrite:false })); s.position.set(x, y, z); s.scale.set(w, w / 4, 1); group.add(s); return s;
  }
  const padRing = new THREE.RingGeometry(1.05, 1.45, 40).rotateX(-Math.PI / 2), padDisc = new THREE.CircleGeometry(1.05, 32).rotateX(-Math.PI / 2);
  function pad(x, z, y, col){
    const m = new THREE.Mesh(padRing, new THREE.MeshBasicMaterial({ color:col, transparent:true, opacity:.9, depthWrite:false })); m.position.set(x, y + .06, z); m.renderOrder = 2; group.add(m);
    const d = new THREE.Mesh(padDisc, new THREE.MeshBasicMaterial({ color:col, transparent:true, opacity:.28, depthWrite:false })); d.position.copy(m.position); d.renderOrder = 2; group.add(d);
    return m;
  }
  /* instanced copies of one merged geometry: list of [x, y, z, s, ry] */
  function inst(geo, list, mat, shadow = true){
    const im = new THREE.InstancedMesh(geo, mat || matV, Math.max(1, list.length)), mt = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), sv = new THREE.Vector3();
    list.forEach(([x, y, z, s = 1, ry = 0, sy], i) => { mt.compose(v.set(x, y, z), q.setFromEuler(e.set(0, ry, 0)), sv.set(s, sy || s, s)); im.setMatrixAt(i, mt); });
    im.count = list.length; im.castShadow = shadow; im.receiveShadow = true; group.add(im); return im;
  }
  return { THREE, K, Merge, G, CG, Z, group, solids, movers, addC, addB, mover, M, glow, finish, groundMesh, gridGround, sign, pad, inst, rnd, matV, matGlow, culled, canvasTex, glowTex, FONT, ox, oz };
}

/* a rainbow portal: an arch with a swirling disc. Returns { x, z (world), update(t) } */
let swirlTex = null;
export function portal(THREE, K, parent, x, y, z, ry, col, label, ox = 0, oz = 0){
  const { Merge, canvasTex, glowTex } = K;
  if(!swirlTex) swirlTex = canvasTex(256, 256, (c, w) => {
    const o = w / 2, cols = ['#ff6f8e', '#ffb070', '#ffe27a', '#7fe8a8', '#7fc8ff', '#b48cff'];
    for(let r = o; r > 0; r -= 4){ const k = Math.floor(r / 14) % cols.length; c.fillStyle = cols[k]; c.beginPath(); c.arc(o, o, r, 0, 7); c.fill(); }
    c.globalCompositeOperation = 'lighter'; c.strokeStyle = 'rgba(255,255,255,.55)'; c.lineWidth = 7;
    for(let k = 0; k < 6; k++){ c.beginPath(); for(let t = 0; t < 1; t += .02){ const a = k / 6 * Math.PI * 2 + t * 4, r = t * o; c.lineTo(o + Math.cos(a) * r, o + Math.sin(a) * r); } c.stroke(); }
    const g = c.createRadialGradient(o, o, 0, o, o, o); g.addColorStop(0, 'rgba(255,255,255,.9)'); g.addColorStop(.35, 'rgba(255,255,255,0)'); c.fillStyle = g; c.fillRect(0, 0, w, w);
  });
  const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = ry; parent.add(g);
  const m = new Merge(), C = new THREE.Color(col).getHex(), cyl = new THREE.CylinderGeometry(1, 1, 1, 14), tor = new THREE.TorusGeometry(2.55, .42, 10, 30, Math.PI), sph = new THREE.SphereGeometry(1, 12, 8);
  for(const s of [-1, 1]){ m.add(cyl, s * 2.55, 1.6, 0, .42, 3.2, .42, 0, 0, 0, C); m.add(cyl, s * 2.55, .15, 0, .75, .3, .75, 0, 0, 0, 0xfff3dc); m.add(sph, s * 2.55, 3.25, 0, .5, .5, .5, 0, 0, 0, 0xffc83a); }
  m.add(tor, 0, 3.2, 0, 1, 1, 1, 0, 0, 0, C);
  m.add(sph, 0, 5.95, 0, .55, .55, .55, 0, 0, 0, 0xffc83a);
  const arch = new THREE.Mesh(m.geometry(), new THREE.MeshLambertMaterial({ vertexColors:true })); arch.castShadow = true; g.add(arch);
  const discM = new THREE.MeshBasicMaterial({ map:swirlTex, transparent:true, opacity:.9, side:THREE.DoubleSide, depthWrite:false });
  const disc = new THREE.Mesh(new THREE.CircleGeometry(2.3, 40), discM); disc.position.y = 3.05; g.add(disc);
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map:glowTex, color:col, transparent:true, opacity:.7, depthWrite:false, blending:THREE.AdditiveBlending })); glow.position.y = 3; glow.scale.set(8, 8, 1); g.add(glow);
  if(label){
    const tex = canvasTex(512, 128, (c, W, H) => {
      const r = 46; c.beginPath(); c.moveTo(r, 8); c.arcTo(W - 8, 8, W - 8, H - 8, r); c.arcTo(W - 8, H - 8, 8, H - 8, r); c.arcTo(8, H - 8, 8, 8, r); c.arcTo(8, 8, W - 8, 8, r); c.closePath();
      c.fillStyle = '#fff7e8'; c.fill(); c.lineWidth = 12; c.strokeStyle = col; c.stroke();
      c.fillStyle = '#2a1f4a'; c.font = '800 54px "Baloo Bhaijaan 2","Tajawal",system-ui,sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(label, W / 2, H / 2 + 4, W - 56);
    });
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map:tex, transparent:true, depthWrite:false })); s.position.y = 7.4; s.scale.set(4.6, 1.15, 1); g.add(s);
  }
  return { x:x + ox, z:z + oz, y, g, update(t){ disc.rotation.z = -t * 1.6; const k = 1 + Math.sin(t * 3) * .04; disc.scale.set(k, k, 1); glow.material.opacity = .55 + Math.sin(t * 2.2) * .15; } };
}

/* small vehicle meshes shared by zones and by friends' avatars online */
export function vehGeo(THREE, K, kind, col = 0xff5d73){
  const { Merge, G } = K, m = new Merge();
  const cyl = new THREE.CylinderGeometry(1, 1, 1, 16), sph = new THREE.SphereGeometry(1, 14, 10), tor = new THREE.TorusGeometry(1, .42, 12, 26);
  if(kind === 'sled'){
    m.add(G.box, 0, .32, 0, 1.15, .14, 2.1, 0, 0, 0, col);
    m.add(G.box, 0, .48, -.8, 1.15, .32, .14, 0, 0, 0, col);
    for(const s of [-1, 1]){ m.add(cyl, s * .48, .1, -.05, .06, 2.1, .06, Math.PI / 2, 0, 0, 0xffd23f); m.add(tor, s * .48, .28, .98, .18, .18, .5, 0, Math.PI / 2, 0, 0xffd23f);
      for(const z of [-.6, .5]) m.add(G.box, s * .48, .2, z, .08, .22, .08, 0, 0, 0, 0xffd23f); }
  } else if(kind === 'donut'){
    m.add(tor, 0, .25, 0, 1.25, 1.25, 1.1, Math.PI / 2, 0, 0, 0xf0b36a);
    m.add(new THREE.TorusGeometry(1, .42, 8, 26, Math.PI * 2), 0, .42, 0, 1.24, 1.24, .7, Math.PI / 2, 0, 0, col);
    for(let k = 0; k < 14; k++){ const a = k / 14 * 6.283; m.add(G.box, Math.sin(a) * 1.25, .72, Math.cos(a) * 1.25, .1, .04, .26, 0, a * 3, 0, [0xffffff, 0x5fb8ff, 0xffd23f, 0x5fe3b1][k % 4]); }
  } else if(kind === 'ship'){
    // a small friendly pirate ship (also the friends' ship online)
    m.add(sph, 0, .6, 0, 2.2, 1.2, 5.2, 0, 0, 0, 0x9a5a32);
    m.add(G.box, 0, 1.45, 0, 3.6, .25, 8.4, 0, 0, 0, 0xc98a52);
    m.add(G.box, 0, 1.95, -3.4, 3.5, 1, 2, 0, 0, 0, 0x8a4a2a);
    for(const s of [-1, 1]) m.add(G.box, s * 1.85, 1.85, 0, .2, .6, 8.2, 0, 0, 0, col);
    m.add(cyl, 0, 5, 0, .16, 7, .16, 0, 0, 0, 0x7a4a2a);
    m.add(G.box, 0, 5.2, .05, 4.6, 3.6, .1, 0, 0, 0, 0xfff7e8);
    m.add(G.box, 0, 8.6, 0, .05, .6, 1.1, 0, 0, 0, col);
  }
  return m.geometry();
}
