/* Bobo Blocks: the block list and the pixel-art texture atlas (16×16 tiles drawn on a canvas, nothing loaded).
   Every block has an id (one byte in the world), a name in ar/en/tr, the tiles of its faces, a shape
   (cube, cross, torch, slab, fence, door, water) and flags: solid (you bump into it), opaque (hides faces / makes shade),
   cut (see-through pixels), light (a torch or lamp lights the blocks around it at night). */

export const TS = 16, ATLAS = 256, PER = ATLAS / TS;

/* ---------- tiles ---------- */
const TILE_NAMES = ['grassTop', 'grassSide', 'dirt', 'stone', 'cobble', 'sand', 'gravel', 'plankOak', 'plankBirch', 'plankDark',
  'logOak', 'logTop', 'logBirch', 'logPine', 'leafOak', 'leafPine', 'leafFruit', 'brick', 'roofRed', 'roofBlue', 'glass', 'window',
  'timber', 'plaster', 'stoneBrick', 'wWhite', 'wRed', 'wOrange', 'wYellow', 'wGreen', 'wBlue', 'wPurple', 'wPink', 'wBrown', 'wSky',
  'torch', 'doorLo', 'doorHi', 'flowerRed', 'flowerYellow', 'flowerBlue', 'tallGrass', 'water', 'haySide', 'hayTop', 'books',
  'sapling', 'gold', 'bedrock', 'pathTop', 'lamp', 'logBirchTop', 'logPineTop', 'timberX', 'mossy', 'crate'];
export const T = {}; TILE_NAMES.forEach((n, i) => { T[n] = i; });

function rng(seed){ let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const hex = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const shadeC = (c, k) => [Math.max(0, Math.min(255, Math.round(c[0] * k))), Math.max(0, Math.min(255, Math.round(c[1] * k))), Math.max(0, Math.min(255, Math.round(c[2] * k)))];

export function drawAtlas(){
  const cv = document.createElement('canvas'); cv.width = cv.height = ATLAS;
  const x = cv.getContext('2d');
  const img = x.createImageData(ATLAS, ATLAS), D = img.data;
  let tx = 0, ty = 0, R = rng(1);
  const put = (px, py, c, a = 255) => { if(px < 0 || py < 0 || px > 15 || py > 15) return; const i = ((ty * TS + py) * ATLAS + tx * TS + px) * 4; D[i] = c[0]; D[i + 1] = c[1]; D[i + 2] = c[2]; D[i + 3] = a; };
  const get = (px, py) => { const i = ((ty * TS + py) * ATLAS + tx * TS + px) * 4; return [D[i], D[i + 1], D[i + 2], D[i + 3]]; };
  const noise = (cols, amp = .08) => { const cs = cols.map(hex); for(let py = 0; py < 16; py++) for(let px = 0; px < 16; px++){ const c = cs[Math.floor(R() * cs.length)]; put(px, py, shadeC(c, 1 + (R() - .5) * amp * 2)); } };
  const rect = (x0, y0, w, h, c, a = 255) => { const cc = typeof c === 'string' ? hex(c) : c; for(let py = y0; py < y0 + h; py++) for(let px = x0; px < x0 + w; px++) put(px, py, cc, a); };
  const clear = () => { for(let py = 0; py < 16; py++) for(let px = 0; px < 16; px++) put(px, py, [0, 0, 0], 0); };
  const tile = (name, fn) => { const i = T[name]; tx = i % PER; ty = Math.floor(i / PER); R = rng(i * 977 + 13); fn(); };

  const dirtCols = ['#8b5a36', '#7a4d2d', '#966541', '#6e4428', '#84552f'];
  const grassCols = ['#5cbc43', '#68c94c', '#53ad3b', '#74d556', '#4ea537'];
  tile('grassTop', () => { noise(grassCols, .06); for(let k = 0; k < 10; k++) put(Math.floor(R() * 16), Math.floor(R() * 16), hex('#8de06a')); });
  tile('dirt', () => { noise(dirtCols, .05); for(let k = 0; k < 8; k++) put(Math.floor(R() * 16), Math.floor(R() * 16), hex('#a7774e')); });
  tile('grassSide', () => { noise(dirtCols, .05); for(let px = 0; px < 16; px++){ const d = 3 + (R() < .5 ? 1 : 0) + (R() < .25 ? 1 : 0); for(let py = 0; py < d; py++) put(px, py, shadeC(hex(grassCols[Math.floor(R() * 5)]), 1 + (R() - .5) * .1)); } });
  tile('stone', () => { noise(['#8e9297', '#858a8f', '#979ba0', '#7d8287'], .05); for(let k = 0; k < 5; k++){ let px = Math.floor(R() * 16), py = Math.floor(R() * 16); for(let s = 0; s < 4; s++){ put(px, py, hex('#6d7176')); px += R() < .5 ? 1 : 0; py += R() < .5 ? 1 : -1; } } });
  tile('bedrock', () => { noise(['#4c4f55', '#3d4045', '#5a5d63', '#34363a'], .1); });
  tile('cobble', () => {
    noise(['#6b6f74'], .05);
    for(const [cx, cy, w, h] of [[0, 0, 7, 5], [8, 0, 8, 4], [0, 6, 5, 5], [6, 5, 6, 6], [13, 5, 3, 6], [0, 12, 8, 4], [9, 12, 7, 4]]){
      const base = hex(['#9a9ea3', '#a7abb0', '#8f9398'][Math.floor(R() * 3)]);
      for(let py = cy; py < cy + h; py++) for(let px = cx; px < cx + w; px++){ const edge = py === cy + h - 1 || px === cx + w - 1; const corner = (py === cy || py === cy + h - 1) && (px === cx || px === cx + w - 1); if(corner) continue; put(px, py, edge ? shadeC(base, .78) : shadeC(base, 1 + (R() - .5) * .12)); }
      put(cx + 1, cy + 1, shadeC(base, 1.15));
    }
  });
  tile('sand', () => { noise(['#ead594', '#f1dea2', '#e0c884', '#e6d08c'], .04); for(let k = 0; k < 6; k++) put(Math.floor(R() * 16), Math.floor(R() * 16), hex('#cfb470')); });
  tile('gravel', () => { noise(['#8a8580', '#9d9893', '#77726d', '#a8a39d', '#8c7d70'], .1); });
  tile('pathTop', () => { noise(['#b08a56', '#a17c4b', '#bb9662', '#9c774a'], .05); for(let k = 0; k < 7; k++){ const px = Math.floor(R() * 15), py = Math.floor(R() * 15); rect(px, py, 2, 1, '#c9b48d'); } });
  const planks = (name, base, dark) => tile(name, () => {
    const b = hex(base), d = hex(dark);
    for(let row = 0; row < 4; row++){
      const off = [0, 7, 3, 11][row];
      for(let py = row * 4; py < row * 4 + 4; py++) for(let px = 0; px < 16; px++){
        const seam = py === row * 4 + 3 || (px + 16 - off) % 16 === 0;
        put(px, py, seam ? d : shadeC(b, 1 + (R() - .5) * .08 + (py === row * 4 ? .06 : 0)));
      }
      put((off + 5) % 16, row * 4 + 1, shadeC(d, 1.1));
    }
  });
  planks('plankOak', '#bd8a50', '#7d5531'); planks('plankBirch', '#e2c88c', '#a98f5a'); planks('plankDark', '#76492a', '#472b17');
  const bark = (name, a, b, c) => tile(name, () => { for(let px = 0; px < 16; px++){ const col = hex([a, b, c][(px * 7 + Math.floor(R() * 2)) % 3]); for(let py = 0; py < 16; py++) put(px, py, shadeC(col, 1 + (R() - .5) * .14 - ((px % 4 === 0) ? .18 : 0))); } });
  bark('logOak', '#6f4b2b', '#5e3e22', '#7b5532'); bark('logPine', '#4c3221', '#3f2919', '#583b27');
  tile('logBirch', () => { noise(['#ece8df', '#e2ddd2', '#f4f1ea'], .03); for(let k = 0; k < 7; k++){ const px = Math.floor(R() * 13), py = Math.floor(R() * 16); rect(px, py, 2 + Math.floor(R() * 3), 1, '#2f2d2a'); } });
  const ring = (name, wood, barkC) => tile(name, () => { for(let py = 0; py < 16; py++) for(let px = 0; px < 16; px++){ const d = Math.max(Math.abs(px - 7.5), Math.abs(py - 7.5)); const edge = d > 6.6; const r = Math.floor(d) % 3 === 0; put(px, py, edge ? hex(barkC) : shadeC(hex(wood), r ? .82 : 1 + (R() - .5) * .06)); } });
  ring('logTop', '#c29359', '#6f4b2b'); ring('logBirchTop', '#e2c88c', '#ece8df'); ring('logPineTop', '#a7774a', '#4c3221');
  const leaves = (name, cols, fruit) => tile(name, () => {
    for(let py = 0; py < 16; py++) for(let px = 0; px < 16; px++){ const hole = R() < .1; const c = hex(cols[Math.floor(R() * cols.length)]); if(hole) put(px, py, [0, 0, 0], 0); else put(px, py, shadeC(c, 1 + (R() - .5) * .16)); }
    if(fruit) for(const [fx, fy] of [[2, 3], [10, 2], [6, 9], [12, 11], [1, 12]]){ rect(fx, fy, 2, 2, fruit); put(fx, fy, shadeC(hex(fruit), 1.3)); }
  });
  leaves('leafOak', ['#3f9b35', '#4aa93c', '#358a2d', '#57b847']); leaves('leafPine', ['#2c6b3c', '#336f42', '#24583a', '#3a7b4a']);
  leaves('leafFruit', ['#45a23a', '#50b043', '#3b9132'], '#e8453c');
  tile('brick', () => { noise(['#d6cbbd'], .03); for(let row = 0; row < 4; row++){ const off = row % 2 ? 4 : 0; for(let k = -1; k < 2; k++){ const bx = k * 8 + off, base = hex(['#b4523b', '#a84a34', '#bf5c42'][Math.floor(R() * 3)]); for(let py = row * 4; py < row * 4 + 3; py++) for(let px = bx; px < bx + 7; px++) put(px, py, shadeC(base, 1 + (R() - .5) * .1)); } } });
  tile('stoneBrick', () => { noise(['#6e7277'], .03); for(let row = 0; row < 2; row++){ const off = row % 2 ? 4 : 0; for(let k = -1; k < 2; k++){ const bx = k * 8 + off, base = hex(['#a0a4a9', '#979ba0', '#aaaeb3'][Math.floor(R() * 3)]); for(let py = row * 8; py < row * 8 + 7; py++) for(let px = bx; px < bx + 7; px++) put(px, py, shadeC(base, (py === row * 8 ? 1.1 : 1) + (R() - .5) * .08)); } } });
  const roof = (name, a, b) => tile(name, () => { const A = hex(a), Bc = hex(b); for(let row = 0; row < 4; row++){ const off = row % 2 ? 2 : 0; for(let py = row * 4; py < row * 4 + 4; py++) for(let px = 0; px < 16; px++){ const k = (px + off) % 4; const t = py - row * 4; let c = A; if(t === 3 || (k === 3 && t > 0)) c = Bc; else if(t === 0) c = shadeC(A, 1.15); put(px, py, shadeC(c, 1 + (R() - .5) * .06)); } } });
  roof('roofRed', '#cf4a3d', '#8f2c25'); roof('roofBlue', '#4277cf', '#284f96');
  tile('glass', () => { clear(); for(let i = 0; i < 16; i++){ put(i, 0, hex('#dff3ff'), 235); put(i, 15, hex('#b6d7ea'), 235); put(0, i, hex('#dff3ff'), 235); put(15, i, hex('#b6d7ea'), 235); } for(let i = 3; i < 7; i++) put(i, 9 - i, hex('#ffffff'), 200); for(let i = 9; i < 12; i++) put(i, 16 - i, hex('#ffffff'), 200); });
  tile('window', () => { for(let py = 0; py < 16; py++) for(let px = 0; px < 16; px++){ const frame = px < 2 || px > 13 || py < 2 || py > 13 || px === 7 || px === 8 || py === 7 || py === 8; put(px, py, frame ? shadeC(hex('#7a4f2c'), 1 + (R() - .5) * .1) : shadeC(hex('#9fd6f2'), 1 + (py < 7 ? .08 : 0) - px * .006)); } put(3, 3, hex('#ffffff')); put(4, 3, hex('#e8f8ff')); put(3, 4, hex('#e8f8ff')); put(10, 10, hex('#ffffff')); });
  tile('plaster', () => { noise(['#f0e8d4', '#ebe2cc', '#f4eedd'], .02); });
  tile('timber', () => { noise(['#f0e8d4', '#ebe2cc', '#f4eedd'], .02); const d = hex('#5c3a22'); for(let i = 0; i < 16; i++){ put(i, 0, d); put(i, 1, d); put(i, 14, d); put(i, 15, d); put(0, i, d); put(1, i, d); put(14, i, d); put(15, i, d); } });
  tile('timberX', () => { noise(['#f0e8d4', '#ebe2cc', '#f4eedd'], .02); const d = hex('#5c3a22'); for(let i = 0; i < 16; i++){ put(i, 0, d); put(i, 15, d); put(0, i, d); put(15, i, d); put(i, i, d); put(Math.min(15, i + 1), i, d); } });
  const wool = (name, c) => tile(name, () => { const b = hex(c); for(let py = 0; py < 16; py++) for(let px = 0; px < 16; px++) put(px, py, shadeC(b, 1 + ((px + py * 2) % 4 === 0 ? -.06 : 0) + (R() - .5) * .07)); });
  wool('wWhite', '#f2f2ee'); wool('wRed', '#d8443c'); wool('wOrange', '#f0892e'); wool('wYellow', '#f5cf33'); wool('wGreen', '#5cbb46');
  wool('wBlue', '#3b6fd6'); wool('wPurple', '#8e55d1'); wool('wPink', '#f08bb6'); wool('wBrown', '#7b5333'); wool('wSky', '#6fc5ee');
  tile('torch', () => { clear(); for(let py = 8; py < 16; py++){ put(7, py, hex('#7a5230')); put(8, py, hex('#5e3e22')); } put(7, 7, hex('#ffd54a')); put(8, 7, hex('#ffb02e')); put(7, 6, hex('#fff3a8')); put(8, 6, hex('#ffd54a')); put(7, 5, hex('#ff8a2a')); put(8, 5, hex('#fff3a8')); });
  tile('lamp', () => { for(let py = 0; py < 16; py++) for(let px = 0; px < 16; px++){ const frame = px === 0 || px === 15 || py === 0 || py === 15; const d = Math.hypot(px - 7.5, py - 7.5); put(px, py, frame ? hex('#5a3c22') : shadeC(hex('#ffd977'), 1.2 - d * .04 + (R() - .5) * .05)); } for(const [a, b] of [[4, 4], [11, 4], [4, 11], [11, 11]]) put(a, b, hex('#fff6cc')); });
  const door = (name, top) => tile(name, () => { for(let py = 0; py < 16; py++) for(let px = 0; px < 16; px++){ const frame = px < 2 || px > 13 || (top ? py < 2 : py > 13); const seam = px === 7 || px === 8; put(px, py, frame ? hex('#5e3c21') : shadeC(hex(seam ? '#8c5e35' : '#a8723f'), 1 + (R() - .5) * .07)); } if(top){ rect(4, 4, 3, 5, '#9fd6f2'); rect(9, 4, 3, 5, '#9fd6f2'); put(4, 4, hex('#ffffff')); } else { rect(11, 3, 2, 2, '#f5cf33'); rect(3, 6, 10, 1, '#5e3c21'); } });
  door('doorLo', false); door('doorHi', true);
  const flower = (name, petal, center) => tile(name, () => { clear(); for(let py = 7; py < 16; py++) put(7, py, hex('#3c8f31')); put(6, 11, hex('#4fae3a')); put(5, 10, hex('#4fae3a')); put(8, 12, hex('#4fae3a')); put(9, 11, hex('#4fae3a')); const p = hex(petal); for(const [dx, dy] of [[0, -2], [-2, 0], [2, 0], [0, 2], [-1, -1], [1, -1], [-1, 1], [1, 1], [0, -1], [-1, 0], [1, 0], [0, 1]]) put(7 + dx, 5 + dy, shadeC(p, 1 + (R() - .5) * .1)); put(7, 5, hex(center)); });
  flower('flowerRed', '#e5383b', '#2b1d14'); flower('flowerYellow', '#ffd23f', '#e98b1c'); flower('flowerBlue', '#5aa2ff', '#ffffff');
  tile('tallGrass', () => { clear(); for(let k = 0; k < 9; k++){ let px = 1 + Math.floor(R() * 14), h = 5 + Math.floor(R() * 9); const c = hex(grassCols[Math.floor(R() * 5)]); for(let py = 15; py > 15 - h; py--){ put(px, py, shadeC(c, .9 + (15 - py) * .02)); if(R() < .2) px += R() < .5 ? 1 : -1; } } });
  tile('sapling', () => { clear(); for(let py = 9; py < 16; py++) put(7, py, hex('#6f4b2b')); for(const [dx, dy] of [[0, 0], [-1, 0], [1, 0], [0, -1], [-2, 1], [2, 1], [-1, 1], [1, 1], [0, 1], [-1, -1], [1, -1], [0, -2], [-3, 2], [3, 2], [-1, 2], [1, 2]]) put(7 + dx, 5 + dy, hex(grassCols[Math.floor(R() * 5)])); });
  tile('water', () => { noise(['#3c84dc', '#3a7fd6', '#4590e2'], .03); for(let k = 0; k < 6; k++){ const px = Math.floor(R() * 12), py = Math.floor(R() * 16); rect(px, py, 3 + Math.floor(R() * 3), 1, '#6db0f0'); } });
  tile('haySide', () => { for(let py = 0; py < 16; py++) for(let px = 0; px < 16; px++){ const band = py === 4 || py === 11; put(px, py, band ? hex('#9a3b22') : shadeC(hex(['#e0b83c', '#d4a930', '#e8c450'][(px + Math.floor(R() * 2)) % 3]), 1 + (R() - .5) * .1)); } });
  tile('hayTop', () => { for(let py = 0; py < 16; py++) for(let px = 0; px < 16; px++){ const d = Math.hypot(px - 7.5, py - 7.5); put(px, py, shadeC(hex(Math.floor(d) % 2 ? '#d9b136' : '#e8c552'), 1 + (R() - .5) * .1)); } });
  tile('books', () => { for(let py = 0; py < 16; py++) for(let px = 0; px < 16; px++) put(px, py, hex('#a8723f')); rect(0, 0, 16, 1, '#6b4426'); rect(0, 7, 16, 2, '#6b4426'); rect(0, 15, 16, 1, '#6b4426');
    for(const row of [1, 9]){ let px = 1; while(px < 15){ const w = 1 + Math.floor(R() * 2), c = ['#c0392b', '#2e86de', '#27ae60', '#f39c12', '#8e44ad', '#e8e2d0'][Math.floor(R() * 6)]; rect(px, row, w, 6, c); put(px, row + 1, shadeC(hex(c), 1.3)); px += w + (R() < .3 ? 1 : 0); } } });
  tile('gold', () => { noise(['#f6c531', '#f3bb22', '#fbd24c'], .04); for(let i = 0; i < 16; i++){ put(i, 0, hex('#ffe68a')); put(0, i, hex('#ffe68a')); put(i, 15, hex('#c98f12')); put(15, i, hex('#c98f12')); } for(const [a, b] of [[3, 3], [4, 3], [3, 4], [10, 9], [11, 9]]) put(a, b, hex('#fff6cc')); });
  x.putImageData(img, 0, 0);
  // copies: mossy = cobble with moss, crate = planks with a frame
  const copy = (from, to, after) => { const f = T[from], t = T[to]; x.drawImage(cv, (f % PER) * TS, Math.floor(f / PER) * TS, TS, TS, (t % PER) * TS, Math.floor(t / PER) * TS, TS, TS); if(after) after((t % PER) * TS, Math.floor(t / PER) * TS); };
  copy('cobble', 'mossy', (ox, oy) => { const r = rng(55); x.fillStyle = '#5c9a3a'; for(let k = 0; k < 26; k++) x.fillRect(ox + Math.floor(r() * 16), oy + Math.floor(r() * 16), 1 + Math.floor(r() * 2), 1); });
  copy('plankOak', 'crate', (ox, oy) => { x.fillStyle = '#6a4424'; x.fillRect(ox, oy, 16, 2); x.fillRect(ox, oy + 14, 16, 2); x.fillRect(ox, oy, 2, 16); x.fillRect(ox + 14, oy, 2, 16); for(let i = 0; i < 12; i++) x.fillRect(ox + 2 + i, oy + 2 + i, 2, 1); });
  return cv;
}

/* ---------- blocks ---------- */
export const CATS = [
  { id:'nature', e:'🌱', n:['طبيعة', 'Nature', 'Doğa'] },
  { id:'wood', e:'🪵', n:['خشب', 'Wood', 'Ahşap'] },
  { id:'build', e:'🧱', n:['بناء', 'Building', 'Yapı'] },
  { id:'color', e:'🎨', n:['ألوان', 'Colours', 'Renkler'] },
  { id:'deco', e:'💡', n:['زينة', 'Decor', 'Süs'] }
];
export const BL = [];
export const ID = {};
function B(id, key, n, tiles, o = {}){
  const t = typeof tiles === 'string' ? { t:T[tiles], s:T[tiles], b:T[tiles] } : { t:T[tiles.t], s:T[tiles.s], b:T[tiles.b != null ? tiles.b : tiles.t] };
  const shape = o.shape || 'cube';
  const d = Object.assign({ id, key, n, tile:t, shape, solid:shape !== 'cross' && shape !== 'torch' && shape !== 'door' && shape !== 'water', opaque:shape === 'cube' && !o.cut, cut:false, light:0, cat:null, hide:false, h:shape === 'slab' ? .5 : 1 }, o);
  d.opaque = shape === 'cube' && !d.cut;
  BL[id] = d; ID[key] = id;
}
B(1, 'grass', ['عشب', 'Grass', 'Çimen'], { t:'grassTop', s:'grassSide', b:'dirt' }, { cat:'nature' });
B(2, 'dirt', ['تراب', 'Dirt', 'Toprak'], 'dirt', { cat:'nature' });
B(3, 'stone', ['صخر', 'Stone', 'Taş'], 'stone', { cat:'nature' });
B(4, 'cobble', ['حجارة', 'Cobblestone', 'Parke taşı'], 'cobble', { cat:'build' });
B(5, 'sand', ['رمل', 'Sand', 'Kum'], 'sand', { cat:'nature' });
B(6, 'gravel', ['حصى', 'Gravel', 'Çakıl'], 'gravel', { cat:'nature' });
B(7, 'plankOak', ['خشب بلّوط', 'Oak planks', 'Meşe tahta'], 'plankOak', { cat:'wood' });
B(8, 'plankBirch', ['خشب فاتح', 'Birch planks', 'Huş tahta'], 'plankBirch', { cat:'wood' });
B(9, 'plankDark', ['خشب غامق', 'Dark planks', 'Koyu tahta'], 'plankDark', { cat:'wood' });
B(10, 'logOak', ['جذع بلّوط', 'Oak log', 'Meşe kütük'], { t:'logTop', s:'logOak' }, { cat:'wood' });
B(11, 'logBirch', ['جذع أبيض', 'Birch log', 'Huş kütük'], { t:'logBirchTop', s:'logBirch' }, { cat:'wood' });
B(12, 'logPine', ['جذع صنوبر', 'Pine log', 'Çam kütük'], { t:'logPineTop', s:'logPine' }, { cat:'wood' });
B(13, 'leafOak', ['ورق شجر', 'Leaves', 'Yaprak'], 'leafOak', { cat:'nature', cut:true });
B(14, 'leafPine', ['ورق صنوبر', 'Pine leaves', 'Çam yaprağı'], 'leafPine', { cat:'nature', cut:true });
B(15, 'leafFruit', ['ورق مع تفاح', 'Apple leaves', 'Elmalı yaprak'], 'leafFruit', { cat:'nature', cut:true });
B(16, 'brick', ['طوب أحمر', 'Bricks', 'Tuğla'], 'brick', { cat:'build' });
B(17, 'roofRed', ['قرميد أحمر', 'Red roof', 'Kırmızı kiremit'], 'roofRed', { cat:'build' });
B(18, 'roofBlue', ['قرميد أزرق', 'Blue roof', 'Mavi kiremit'], 'roofBlue', { cat:'build' });
B(19, 'glass', ['زجاج', 'Glass', 'Cam'], 'glass', { cat:'build', cut:true });
B(20, 'window', ['شبّاك', 'Window', 'Pencere'], 'window', { cat:'build' });
B(21, 'timber', ['حيط بخشب', 'Timber wall', 'Ahşap duvar'], 'timber', { cat:'build' });
B(22, 'plaster', ['حيط أبيض', 'White wall', 'Beyaz duvar'], 'plaster', { cat:'build' });
B(23, 'stoneBrick', ['طوب حجر', 'Stone bricks', 'Taş tuğla'], 'stoneBrick', { cat:'build' });
const WOOL = [['wWhite', 'أبيض', 'White', 'Beyaz'], ['wRed', 'أحمر', 'Red', 'Kırmızı'], ['wOrange', 'برتقالي', 'Orange', 'Turuncu'], ['wYellow', 'أصفر', 'Yellow', 'Sarı'],
  ['wGreen', 'أخضر', 'Green', 'Yeşil'], ['wBlue', 'أزرق', 'Blue', 'Mavi'], ['wPurple', 'بنفسجي', 'Purple', 'Mor'], ['wPink', 'زهري', 'Pink', 'Pembe'], ['wBrown', 'بنّي', 'Brown', 'Kahverengi'], ['wSky', 'سماوي', 'Sky blue', 'Açık mavi']];
WOOL.forEach((w, i) => B(24 + i, w[0], ['صوف ' + w[1], w[2] + ' wool', w[3] + ' yün'], w[0], { cat:'color', wool:true }));
B(34, 'torch', ['شعلة', 'Torch', 'Meşale'], 'torch', { cat:'deco', shape:'torch', light:14 });
B(35, 'doorX', ['باب', 'Door', 'Kapı'], { t:'doorLo', s:'doorLo' }, { cat:'deco', shape:'door', axis:0 });
B(36, 'doorXH', ['باب', 'Door', 'Kapı'], { t:'doorHi', s:'doorHi' }, { shape:'door', axis:0, hide:true, upper:true });
B(37, 'fence', ['سياج', 'Fence', 'Çit'], 'plankOak', { cat:'wood', shape:'fence' });
B(38, 'flowerRed', ['وردة حمرا', 'Red flower', 'Kırmızı çiçek'], 'flowerRed', { cat:'nature', shape:'cross' });
B(39, 'flowerYellow', ['وردة صفرا', 'Yellow flower', 'Sarı çiçek'], 'flowerYellow', { cat:'nature', shape:'cross' });
B(40, 'flowerBlue', ['وردة زرقا', 'Blue flower', 'Mavi çiçek'], 'flowerBlue', { cat:'nature', shape:'cross' });
B(41, 'tallGrass', ['حشيش', 'Tall grass', 'Uzun ot'], 'tallGrass', { cat:'nature', shape:'cross' });
B(42, 'water', ['مي', 'Water', 'Su'], 'water', { cat:'nature', shape:'water' });
B(43, 'hay', ['قش', 'Hay bale', 'Saman'], { t:'hayTop', s:'haySide' }, { cat:'deco' });
B(44, 'books', ['مكتبة', 'Bookshelf', 'Kitaplık'], { t:'plankOak', s:'books' }, { cat:'deco' });
B(45, 'sapling', ['شتلة شجرة', 'Sapling', 'Fidan'], 'sapling', { cat:'nature', shape:'cross', sapling:true });
B(46, 'gold', ['دهب', 'Gold block', 'Altın blok'], 'gold', { cat:'deco' });
B(47, 'bedrock', ['صخر قاسي', 'Bedrock', 'Ana kaya'], 'bedrock', { hide:true, hard:true });
B(48, 'slabOak', ['نص بلوك خشب', 'Oak half block', 'Yarım meşe'], 'plankOak', { cat:'wood', shape:'slab' });
B(49, 'slabStone', ['نص بلوك حجر', 'Stone half block', 'Yarım taş'], 'stoneBrick', { cat:'build', shape:'slab' });
B(50, 'slabRed', ['نص قرميد أحمر', 'Red roof half', 'Yarım kırmızı kiremit'], 'roofRed', { cat:'build', shape:'slab' });
B(51, 'slabBlue', ['نص قرميد أزرق', 'Blue roof half', 'Yarım mavi kiremit'], 'roofBlue', { cat:'build', shape:'slab' });
B(52, 'path', ['طريق', 'Path', 'Patika'], { t:'pathTop', s:'dirt' }, { cat:'nature' });
B(53, 'lamp', ['ضو', 'Lamp', 'Lamba'], 'lamp', { cat:'deco', light:15 });
B(54, 'doorZ', ['باب', 'Door', 'Kapı'], { t:'doorLo', s:'doorLo' }, { shape:'door', axis:1, hide:true });
B(55, 'doorZH', ['باب', 'Door', 'Kapı'], { t:'doorHi', s:'doorHi' }, { shape:'door', axis:1, hide:true, upper:true });
B(56, 'timberX', ['حيط بخشب مايل', 'Timber cross', 'Çapraz ahşap'], 'timberX', { cat:'build' });
B(57, 'mossy', ['حجارة خضرا', 'Mossy stones', 'Yosunlu taş'], 'mossy', { cat:'build' });
B(58, 'crate', ['صندوق', 'Crate', 'Sandık'], 'crate', { cat:'deco' });
B(59, 'wWhiteBig', ['غيمة', 'Cloud', 'Bulut'], 'wWhite', { hide:true });
export const NB = 64;
/* fast lookup tables for the mesher and the physics */
export const OPAQUE = new Uint8Array(256), SOLID = new Uint8Array(256), SHAPE = new Uint8Array(256), LIGHT = new Uint8Array(256), CUT = new Uint8Array(256), TOP = new Uint8Array(256), SIDE = new Uint8Array(256), BOT = new Uint8Array(256), VALID = new Uint8Array(256);
export const SH = { cube:1, cross:2, torch:3, slab:4, fence:5, door:6, water:7 };
BL.forEach(b => { if(!b) return; VALID[b.id] = 1; OPAQUE[b.id] = b.opaque ? 1 : 0; SOLID[b.id] = b.solid ? 1 : 0; SHAPE[b.id] = SH[b.shape]; LIGHT[b.id] = b.light; CUT[b.id] = b.cut ? 1 : 0; TOP[b.id] = b.tile.t; SIDE[b.id] = b.tile.s; BOT[b.id] = b.tile.b; });
export const isDoor = id => SHAPE[id] === SH.door;
export const isLeaf = id => id === 13 || id === 14 || id === 15;
/* the block shown in the palette for a door is the X door; placing picks the axis from where you look */
export const PALETTE = BL.filter(b => b && !b.hide && b.cat);

/* ---------- little pictures of the blocks for the hotbar and the palette ---------- */
export function makeIcons(atlas){
  const out = {};
  const S = 64;
  const src = i => [(i % PER) * TS, Math.floor(i / PER) * TS];
  for(const b of BL){
    if(!b) continue;
    const c = document.createElement('canvas'); c.width = c.height = S; const x = c.getContext('2d'); x.imageSmoothingEnabled = false;
    const sh = b.shape;
    if(sh === 'cube' || sh === 'slab' || sh === 'water'){
      const h = sh === 'slab' ? .5 : 1, s = 22, cx = 32, top = sh === 'slab' ? 22 : 12;
      const face = (tile, m, k, clipH) => { x.save(); x.setTransform(m[0], m[1], m[2], m[3], m[4], m[5]); const [sx, sy] = src(tile); x.drawImage(atlas, sx, sy + (clipH ? 16 * (1 - h) : 0), 16, 16 * (clipH ? h : 1), 0, 0, 16, 16 * (clipH ? h : 1)); if(k < 1){ x.fillStyle = 'rgba(0,0,0,' + (1 - k) + ')'; x.fillRect(0, 0, 16, 16 * (clipH ? h : 1)); } x.restore(); };
      const u = s / 16;
      face(b.tile.t, [u, u * .5, -u, u * .5, cx, top], 1);
      face(b.tile.s, [u, u * .5, 0, u, cx - s, top + s * .5], .78, true);
      face(b.tile.s, [u, -u * .5, 0, u, cx, top + s], .62, true);
      if(sh === 'water'){ x.globalCompositeOperation = 'destination-in'; x.fillStyle = 'rgba(0,0,0,.85)'; x.fillRect(0, 0, S, S); }
    } else if(sh === 'fence'){
      const [sx, sy] = src(T.plankOak);
      for(const px of [14, 40]) x.drawImage(atlas, sx, sy, 4, 16, px, 10, 10, 46);
      for(const py of [20, 38]) x.drawImage(atlas, sx, sy, 16, 2, 8, py, 48, 7);
    } else if(sh === 'door'){
      const a = src(T.doorHi), l = src(T.doorLo);
      x.drawImage(atlas, a[0], a[1], 16, 16, 16, 0, 32, 32); x.drawImage(atlas, l[0], l[1], 16, 16, 16, 32, 32, 32);
    } else {
      const [sx, sy] = src(b.tile.s); x.drawImage(atlas, sx, sy, 16, 16, 4, 4, 56, 56);
    }
    out[b.id] = c.toDataURL();
  }
  return out;
}
