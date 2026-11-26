/* Bobo Blocks: ready-made buildings for «قريتي» (our own designs) and the trees.
   A blueprint gives a list of [dx, dy, dz, id] from the corner of its plot; dy 0 is the ground layer (it replaces the grass),
   so walls start at dy 1. Blocks with id 0 clear the space (trees, grass) before the building rises. */
import { ID } from './blocks.js';
const I = ID;

function maker(){
  const L = [], seen = new Map();
  const S = (x, y, z, id) => { const k = x + ',' + y + ',' + z; if(seen.has(k)) L[seen.get(k)][3] = id; else { seen.set(k, L.length); L.push([x, y, z, id]); } };
  const box = (x0, y0, z0, x1, y1, z1, id) => { for(let y = y0; y <= y1; y++) for(let z = z0; z <= z1; z++) for(let x = x0; x <= x1; x++) S(x, y, z, id); };
  const ring = (x0, y, z0, x1, z1, id) => { for(let x = x0; x <= x1; x++){ S(x, y, z0, id); S(x, y, z1, id); } for(let z = z0 + 1; z < z1; z++){ S(x0, y, z, id); S(x1, y, z, id); } };
  const disc = (cx, y, cz, r, id, hollow) => { for(let z = Math.floor(cz - r); z <= Math.ceil(cz + r); z++) for(let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++){ const d = Math.hypot(x - cx, z - cz); if(d <= r + .35 && (!hollow || d > r - .75)) S(x, y, z, id); } };
  return { L, S, box, ring, disc };
}

/* ---------- the buildings ---------- */
function house(){
  const M = maker(), { S, box, ring } = M;
  box(-1, 1, -1, 9, 10, 9, 0);
  box(0, 0, 0, 8, 0, 8, I.cobble); box(1, 0, 1, 7, 0, 7, I.plankOak);
  for(let y = 1; y <= 3; y++){ ring(0, y, 0, 8, 8, I.timber); for(const [x, z] of [[0, 0], [8, 0], [0, 8], [8, 8], [4, 0], [4, 8], [0, 4], [8, 4]]) S(x, y, z, I.logOak); }
  for(const [x, z] of [[2, 0], [6, 0], [2, 8], [6, 8], [0, 2], [0, 6], [8, 2], [8, 6]]) S(x, 2, z, I.window);
  S(4, 1, 0, I.doorX); S(4, 2, 0, I.doorXH); S(4, 3, 0, I.timberX);
  ring(0, 4, 0, 8, 8, I.logOak);
  for(let k = 0; k <= 5; k++){
    const y = 4 + k;
    for(let x = -1; x <= 9; x++){ S(x, y, k - 1, I.roofRed); S(x, y, 9 - k, I.roofRed); }
    if(k >= 1) for(let z = k; z <= 8 - k; z++){ S(0, y, z, I.timber); S(8, y, z, I.timber); }
  }
  for(let x = -1; x <= 9; x++) S(x, 9, 4, I.slabRed);
  S(1, 1, 1, I.books); S(2, 1, 1, I.books); S(7, 1, 1, I.crate); S(6, 1, 6, I.wRed); S(6, 1, 7, I.wWhite); S(1, 1, 7, I.plankDark);
  S(4, 3, 4, I.lamp);
  S(3, 1, -1, I.torch); S(5, 1, -1, I.torch);
  S(1, 1, -1, I.flowerRed); S(7, 1, -1, I.flowerYellow);
  return M.L;
}
function treeHouse(){
  const M = maker(), { S, box, ring, disc } = M;
  box(0, 1, 0, 8, 14, 8, 0);
  for(let y = 1; y <= 11; y++) S(4, y, 4, I.logOak);
  S(3, 1, 4, I.logOak); S(5, 1, 4, I.logOak); S(4, 1, 3, I.logOak); S(4, 1, 5, I.logOak);
  box(1, 5, 1, 7, 5, 7, I.plankOak); S(4, 5, 4, I.logOak);
  ring(1, 6, 1, 7, 7, I.fence); S(7, 6, 3, 0); S(7, 6, 4, 0);
  for(let y = 6; y <= 8; y++) ring(2, y, 2, 6, 6, I.plankBirch);
  for(let y = 6; y <= 8; y++) S(4, y, 4, I.logOak);
  S(4, 6, 2, I.doorX); S(4, 7, 2, I.doorXH); S(2, 7, 4, I.window); S(6, 7, 4, I.window); S(4, 7, 6, I.window);
  for(let y = 9; y <= 10; y++) disc(4, y, 4, y === 9 ? 3.2 : 2.4, I.slabBlue === undefined ? I.roofBlue : I.roofBlue, true);
  box(2, 9, 2, 6, 9, 6, I.plankDark); S(4, 9, 4, I.logOak);
  for(let y = 10; y <= 13; y++) disc(4, y, 4, [3.4, 3.8, 3, 1.8][y - 10], I.leafOak);
  S(4, 11, 4, I.logOak);
  for(let h = 1; h <= 4; h++){ S(8, h, 8 - h, I.plankDark); S(8, h - 1, 8 - h, h === 1 ? I.plankDark : 0); }
  S(8, 0, 7, I.plankDark);
  S(3, 6, 3, I.torch); S(5, 6, 5, I.crate);
  return M.L;
}
function tower(){
  const M = maker(), { S, box, disc } = M;
  box(0, 1, 0, 6, 16, 6, 0);
  disc(3, 0, 3, 3, I.stoneBrick);
  for(let y = 1; y <= 10; y++) disc(3, y, 3, 3, y % 4 === 0 ? I.cobble : I.stoneBrick, true);
  disc(3, 5, 3, 2.2, I.slabStone);
  for(const y of [3, 7]){ S(3, y, 0, I.glass); S(0, y, 3, I.glass); S(6, y, 3, I.glass); S(3, y, 6, I.glass); }
  S(3, 1, 0, I.doorX); S(3, 2, 0, I.doorXH); S(2, 1, 0, I.stoneBrick); S(4, 1, 0, I.stoneBrick);
  disc(3, 10, 3, 2.3, I.plankDark);
  for(const [x, z] of [[0, 3], [6, 3], [3, 0], [3, 6], [1, 1], [5, 1], [1, 5], [5, 5]]) S(x, 11, z, I.stoneBrick);
  for(let k = 0; k < 5; k++) disc(3, 12 + k, 3, [3.3, 2.5, 1.7, 1, .3][k], I.roofBlue, k < 3);
  S(3, 17, 3, I.fence); S(3, 18, 3, I.wYellow);
  S(2, 1, 4, I.torch); S(3, 11, 3, I.lamp);
  return M.L;
}
function barn(){
  const M = maker(), { S, box, ring } = M;
  box(-1, 1, -1, 11, 12, 9, 0);
  box(0, 0, 0, 10, 0, 8, I.plankDark);
  for(let y = 1; y <= 4; y++){ ring(0, y, 0, 10, 8, I.wRed); for(const [x, z] of [[0, 0], [10, 0], [0, 8], [10, 8]]) S(x, y, z, I.wWhite); }
  ring(0, 5, 0, 10, 8, I.wWhite);
  for(let y = 1; y <= 3; y++) for(let x = 4; x <= 6; x++) S(x, y, 0, 0);
  for(let x = 3; x <= 7; x++) S(x, 4, 0, I.wWhite); S(3, 1, 0, I.wWhite); S(7, 1, 0, I.wWhite); S(3, 2, 0, I.wWhite); S(7, 2, 0, I.wWhite); S(3, 3, 0, I.wWhite); S(7, 3, 0, I.wWhite);
  S(2, 3, 8, I.window); S(8, 3, 8, I.window); S(0, 3, 4, I.window); S(10, 3, 4, I.window);
  const prof = [[-1, 5], [0, 6], [1, 7], [2, 8], [3, 8], [4, 9], [5, 9]];
  for(const [z, y] of prof){ for(let x = -1; x <= 11; x++){ S(x, y, z, I.plankDark); S(x, y, 8 - z, I.plankDark); } }
  for(let x = -1; x <= 11; x++) S(x, 9, 4, I.plankDark);
  for(let y = 6; y <= 8; y++) for(let z = 0; z <= 8; z++){ const top = prof.find(p => p[0] === Math.min(z, 8 - z)); if(top && y < top[1]) { S(0, y, z, I.wRed); S(10, y, z, I.wRed); } }
  S(5, 7, 8, I.wWhite);
  for(const [x, z] of [[1, 1], [2, 1], [1, 2], [8, 6], [9, 6], [9, 7]]) S(x, 1, z, I.hay); S(1, 2, 1, I.hay); S(9, 2, 7, I.hay);
  S(5, 4, 4, I.lamp); S(3, 1, -1, I.torch); S(7, 1, -1, I.torch);
  return M.L;
}
function well(){
  const M = maker(), { S, box, ring } = M;
  box(0, 1, 0, 4, 6, 4, 0);
  box(1, -2, 1, 3, -2, 3, I.cobble);
  ring(0, -1, 0, 4, 4, I.cobble); ring(0, 0, 0, 4, 4, I.cobble); ring(0, 1, 0, 4, 4, I.mossy);
  box(1, -1, 1, 3, 0, 3, I.water);
  for(const [x, z] of [[0, 0], [4, 0], [0, 4], [4, 4]]){ S(x, 2, z, I.fence); S(x, 3, z, I.fence); }
  box(0, 4, 0, 4, 4, 4, I.slabRed); box(1, 4, 1, 3, 4, 3, I.roofRed); S(2, 5, 2, I.slabRed);
  S(2, 3, 2, I.fence);
  return M.L;
}
function shop(){
  const M = maker(), { S, box, ring } = M;
  box(-1, 1, -2, 9, 9, 7, 0);
  box(0, 0, 0, 8, 0, 6, I.plankBirch); for(let x = 0; x <= 8; x++) S(x, 0, -1, I.path);
  for(let y = 1; y <= 4; y++){ ring(0, y, 0, 8, 6, I.plankBirch); for(const [x, z] of [[0, 0], [8, 0], [0, 6], [8, 6]]) S(x, y, z, I.logBirch); }
  for(let x = 1; x <= 7; x++){ S(x, 2, 0, 0); S(x, 3, 0, 0); }
  for(let x = 1; x <= 7; x++) S(x, 1, 0, I.crate);
  S(3, 1, 0, I.plankOak); S(4, 1, 0, I.plankOak); S(5, 1, 0, I.plankOak);
  S(0, 2, 3, I.window); S(8, 2, 3, I.window); S(4, 1, 6, I.doorX); S(4, 2, 6, I.doorXH);
  for(let x = -1; x <= 9; x++) for(let z = -2; z <= 0; z++) S(x, 5 - (z < 0 ? 1 : 0) + (z === -2 ? 0 : 0), z, x % 2 ? I.wRed : I.wWhite);
  for(let x = -1; x <= 9; x++){ S(x, 4, -2, x % 2 ? I.wRed : I.wWhite); S(x, 4, -1, x % 2 ? I.wRed : I.wWhite); S(x, 5, 0, x % 2 ? I.wRed : I.wWhite); }
  box(0, 5, 1, 8, 5, 6, I.plankOak); box(1, 6, 2, 7, 6, 5, I.slabOak);
  for(let x = 2; x <= 6; x++) S(x, 6, 0, x % 2 ? I.wYellow : I.wOrange);
  S(4, 7, 0, I.gold);
  S(1, 2, 5, I.books); S(7, 2, 5, I.books); S(1, 1, 5, I.crate); S(7, 1, 5, I.crate); S(2, 2, 1, I.hay);
  S(4, 4, 3, I.lamp); S(-1, 1, -1, I.torch); S(9, 1, -1, I.torch);
  return M.L;
}
function windmill(){
  const M = maker(), { S, box, disc } = M;
  box(-2, 1, -2, 8, 17, 6, 0);
  disc(3, 0, 3, 3, I.cobble);
  for(let y = 1; y <= 4; y++) disc(3, y, 3, 3, I.cobble, true);
  S(3, 1, 0, I.doorX); S(3, 2, 0, I.doorXH);
  for(let y = 5; y <= 10; y++) disc(3, y, 3, 2.3, y % 3 === 0 ? I.plankDark : I.plaster, true);
  S(1, 7, 3, I.window); S(5, 7, 3, I.window); S(3, 7, 5, I.window);
  for(let k = 0; k < 4; k++) disc(3, 11 + k, 3, [2.8, 2, 1.2, .3][k], I.plankDark);
  const cx = 3, cy = 9, z = 0;
  S(cx, cy, z, I.logOak); S(cx, cy, z - 1, I.logOak);
  for(let i = 1; i <= 6; i++){
    S(cx + i, cy, z - 1, I.fence); S(cx - i, cy, z - 1, I.fence); S(cx, cy + i, z - 1, I.fence); if(cy - i > 1) S(cx, cy - i, z - 1, I.fence);
    if(i >= 2){ S(cx + i, cy + 1, z - 1, I.wWhite); S(cx - i, cy - 1, z - 1, I.wWhite); S(cx - 1, cy + i, z - 1, I.wWhite); if(cy - i > 1) S(cx + 1, cy - i, z - 1, I.wWhite); }
  }
  S(3, 4, 3, I.lamp); S(2, 1, -1, I.torch); S(4, 1, -1, I.torch);
  S(6, 1, 0, I.hay); S(6, 1, 6, I.hay); S(0, 1, 6, I.crate);
  return M.L;
}
function castle(){
  const M = maker(), { S, box, ring } = M;
  box(0, 1, 0, 12, 14, 6, 0);
  box(0, 0, 0, 12, 0, 6, I.cobble);
  for(const tx of [0, 9]){
    for(let y = 1; y <= 10; y++) ring(tx, y, 1, tx + 3, 5, y === 1 ? I.mossy : I.stoneBrick);
    for(const [x, z] of [[tx, 1], [tx + 3, 1], [tx, 5], [tx + 3, 5], [tx + 1, 1], [tx + 2, 5]]) S(x, 11, z, I.stoneBrick);
    S(tx + 1, 6, 1, I.glass); S(tx + 2, 6, 5, I.glass); S(tx + 1, 3, 1, I.glass);
    box(tx + 1, 10, 2, tx + 2, 10, 4, I.plankDark);
    S(tx + 1, 11, 3, I.fence); S(tx + 1, 12, 3, I.fence); S(tx + 1, 13, 3, I.fence); S(tx + 2, 13, 3, tx ? I.wBlue : I.wRed); S(tx + 2, 12, 3, tx ? I.wBlue : I.wRed);
  }
  for(let y = 1; y <= 7; y++) for(let x = 4; x <= 8; x++){ S(x, y, 2, I.stoneBrick); S(x, y, 4, I.stoneBrick); }
  box(4, 7, 2, 8, 7, 4, I.stoneBrick);
  for(let x = 4; x <= 8; x += 2){ S(x, 8, 2, I.stoneBrick); S(x, 8, 4, I.stoneBrick); }
  for(let y = 1; y <= 4; y++) for(let x = 5; x <= 7; x++) for(let z = 2; z <= 4; z++) S(x, y, z, 0);
  for(let x = 5; x <= 7; x++){ S(x, 5, 2, I.stoneBrick); }
  S(6, 5, 2, I.gold);
  S(5, 6, 1, I.wRed); S(7, 6, 1, I.wBlue);
  S(4, 1, 1, I.torch); S(8, 1, 1, I.torch); S(4, 3, 1, I.lamp); S(8, 3, 1, I.lamp);
  S(1, 1, 0, I.flowerBlue); S(11, 1, 0, I.flowerRed);
  return M.L;
}

export const BLUEPRINTS = [
  { id:'well', e:'🪣', n:['بير', 'Well', 'Kuyu'], cost:30, lvl:1, time:5, fn:well },
  { id:'house', e:'🏠', n:['بيت', 'House', 'Ev'], cost:60, lvl:1, time:9, fn:house },
  { id:'treehouse', e:'🌳', n:['بيت الشجرة', 'Tree house', 'Ağaç ev'], cost:80, lvl:2, time:11, fn:treeHouse },
  { id:'shop', e:'🏪', n:['دكّان', 'Shop', 'Dükkân'], cost:90, lvl:2, time:10, fn:shop },
  { id:'barn', e:'🐴', n:['اسطبل', 'Barn', 'Ahır'], cost:110, lvl:3, time:12, fn:barn },
  { id:'tower', e:'🗼', n:['برج', 'Tower', 'Kule'], cost:120, lvl:3, time:14, fn:tower },
  { id:'windmill', e:'🌬️', n:['طاحونة هوا', 'Windmill', 'Yel değirmeni'], cost:150, lvl:4, time:16, fn:windmill },
  { id:'castle', e:'🏰', n:['بوابة القلعة', 'Castle gate', 'Kale kapısı'], cost:220, lvl:5, time:20, fn:castle }
];
export const BP = {}; BLUEPRINTS.forEach(b => { BP[b.id] = b; });

/* the cells of a blueprint turned 0..3 quarter turns, moved so its footprint starts at (0,0); with its size */
const cache = new Map();
export function bpCells(id, rot){
  const k = id + ':' + (rot & 3);
  if(cache.has(k)) return cache.get(k);
  const b = BP[id]; let L = b.fn().map(c => c.slice());
  let mnx = 1e9, mnz = 1e9, mxx = -1e9, mxz = -1e9;
  for(const c of L){ mnx = Math.min(mnx, c[0]); mxx = Math.max(mxx, c[0]); mnz = Math.min(mnz, c[2]); mxz = Math.max(mxz, c[2]); }
  const w = mxx - mnx + 1, d = mxz - mnz + 1;
  for(const c of L){ c[0] -= mnx; c[2] -= mnz; }
  let W = w, D = d;
  for(let r = 0; r < (rot & 3); r++){
    for(const c of L){ const x = c[0], z = c[2]; c[0] = D - 1 - z; c[2] = x; if(c[3] === ID.doorX) c[3] = ID.doorZ; else if(c[3] === ID.doorZ) c[3] = ID.doorX; else if(c[3] === ID.doorXH) c[3] = ID.doorZH; else if(c[3] === ID.doorZH) c[3] = ID.doorXH; }
    const t = W; W = D; D = t;
  }
  let mny = 1e9, mxy = -1e9; for(const c of L){ mny = Math.min(mny, c[1]); mxy = Math.max(mxy, c[1]); }
  // build order: clear first, then from the ground up (inside a layer: a spiral feel by distance from the middle)
  const air = L.filter(c => c[3] === 0), solid = L.filter(c => c[3] !== 0);
  solid.sort((a, b) => (a[1] - b[1]) || (Math.atan2(a[2] - D / 2, a[0] - W / 2) - Math.atan2(b[2] - D / 2, b[0] - W / 2)));
  const out = { cells:air.concat(solid), w:W, d:D, y0:mny, y1:mxy, nAir:air.length };
  cache.set(k, out);
  return out;
}

/* ---------- trees (the world and the saplings use the same shapes) ---------- */
export function treeCells(type, x, y, z, R){
  const out = [];
  const S = (a, b, c, id, force) => out.push([a, b, c, id, force ? 1 : 0]);
  if(type === 'pine'){
    const h = 6 + Math.floor(R() * 3);
    for(let i = 0; i < h; i++) S(x, y + i, z, ID.logPine, 1);
    let r = 2;
    for(let yy = y + 2; yy <= y + h; yy++){
      const rr = yy === y + h ? 0 : r;
      for(let dz = -rr; dz <= rr; dz++) for(let dx = -rr; dx <= rr; dx++){ if(Math.abs(dx) + Math.abs(dz) > rr + (rr > 1 ? 1 : 0)) continue; if(dx || dz || yy >= y + h) S(x + dx, yy, z + dz, ID.leafPine); }
      r = r === 2 ? 1 : 2; if(yy > y + h - 3) r = 1;
    }
    S(x, y + h, z, ID.leafPine); S(x, y + h + 1, z, ID.leafPine);
  } else {
    const birch = type === 'birch', fruit = type === 'fruit';
    const h = (birch ? 5 : 4) + Math.floor(R() * 2);
    const log = birch ? ID.logBirch : ID.logOak;
    for(let i = 0; i < h; i++) S(x, y + i, z, log, 1);
    const top = y + h;
    for(let yy = top - 2; yy <= top + 1; yy++){
      const r = yy >= top ? 1 : 2;
      for(let dz = -r; dz <= r; dz++) for(let dx = -r; dx <= r; dx++){
        if(Math.abs(dx) === r && Math.abs(dz) === r && (yy === top + 1 || R() < .5)) continue;
        if(!dx && !dz && yy < top) continue;
        S(x + dx, yy, z + dz, fruit && R() < .4 ? ID.leafFruit : ID.leafOak);
      }
    }
  }
  return out;
}
