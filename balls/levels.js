/* Bobo Balls levels: shapes on a 9-wide grid, turned into 64 levels with numbers, balls and pickups.
   Cell codes: '#' square block, triangles by their square corner: 'A' ◣  'B' ◢  'C' ◤  'D' ◥,
   pickups: '+' extra ball ring, '$' coin, 'h' row laser, 'v' column laser, 's' split ball, 'b' big ball, '.' empty.
   window.BALLS_LEVELS = [{ name, emoji, rows:[...], hp:[[...]], balls, par }] (hp 0 = no block). Deterministic (seeded). */
(function(){
'use strict';
const COLS = 9;
const SHAPES = {
  line:{ e:'🌟', rows:['.........', '.#######.', '.........', '..#####..'] },
  steps:{ e:'📶', rows:['#........', '##.......', '###......', '####.....', '#####....'] },
  heart:{ e:'❤️', rows:['.B#A.B#A.', '#########', '#########', 'D#######C', '.D#####C.', '..D###C..', '...D#C...'] },
  smile:{ e:'😊', rows:['..B###A..', '.B#####A.', 'B#$###$#A', '#########', '#########', '#.#####.#', 'D#.....#C', '.D#####C.', '..D###C..'] },
  diamond:{ e:'💎', rows:['....#....', '...B#A...', '..B###A..', '.B#####A.', '#########', '.D#####C.', '..D###C..', '...D#C...', '....#....'] },
  letterB:{ e:'🅱️', rows:['..####A..', '..#...#..', '..#..B#..', '..####...', '..#..D#..', '..#...#..', '..####C..'] },
  star:{ e:'⭐', rows:['....#....', '...B#A...', 'D#######C', '.D#####C.', '..#####..', '.B##.##A.', '.#.....#.'] },
  letterO:{ e:'⭕', rows:['..B###A..', '..#...#..', '..#...#..', '..#.+.#..', '..#...#..', '..#...#..', '..D###C..'] },
  house:{ e:'🏠', rows:['....#....', '...B#A...', '..B###A..', '.B#####A.', '#########', '.#######.', '.#$#.#$#.', '.#######.', '.###.###.', '.###.###.'] },
  bobo:{ e:'🐻', rows:['B#A...B#A', 'D#C...D#C', '.B#####A.', 'B#######A', '##$###$##', '####+####', '###...###', 'D#######C', '.D#####C.', '..D###C..'] },
  tree:{ e:'🌲', rows:['....#....', '...B#A...', '..B###A..', '...###...', '..B###A..', '.B#####A.', 'B#######A', '....#....', '....#....'] },
  letterA:{ e:'🅰️', rows:['....#....', '...B#A...', '..B#.#A..', '..#...#..', '..#####..', '..#...#..', '..#...#..'] },
  fish:{ e:'🐟', rows:['...B###A.', '#.B#####A', '######$##', '#.D#####C', '...D###C.'] },
  moon:{ e:'🌙', rows:['...B##...', '..B#C..$.', '.B#C.....', '.##...$..', '.##......', '.D#A.....', '..D#A..$.', '...D##...'] },
  crown:{ e:'👑', rows:['#...#...#', '#A.B#A.B#', '#########', '#$##$##$#', '#########'] },
  rocket:{ e:'🚀', rows:['....#....', '...B#A...', '...###...', '...#$#...', '...###...', '..B###A..', '.B#####A.', '.#.#.#.#.'] },
  mushroom:{ e:'🍄', rows:['..B###A..', '.B#####A.', 'B##$#$##A', '#########', '...###...', '...###...', '..B###A..'] },
  cat:{ e:'🐱', rows:['#A.....B#', '##A...B##', '#########', '##$###$##', '####+####', 'D#######C', '.D#####C.'] },
  letterS:{ e:'🐍', rows:['..B####..', '..#......', '..#......', '..D###A..', '......#..', '......#..', '..####C..'] },
  ghost:{ e:'👻', rows:['..B###A..', '.B#####A.', '.#$###$#.', '.#######.', '.#######.', '.D#C.D#C.'] },
  rainbow:{ e:'🌈', rows:['..B###A..', '.B#####A.', 'B##...##A', '##.....##', '##.....##', '##..+..##'] },
  pyramid:{ e:'🔺', rows:['....#....', '...B#A...', '...###...', '..B###A..', '..#####..', '.B#####A.', '.#######.', 'B#######A'] },
  hourglass:{ e:'⏳', rows:['#########', 'D#######C', '.D#####C.', '..D###C..', '...B#A...', '..B###A..', '.B#####A.', '#########'] },
  plus:{ e:'➕', rows:['...###...', '...###...', '#########', '####+####', '#########', '...###...', '...###...'] },
  icecream:{ e:'🍦', rows:['...B#A...', '..B###A..', '.B#$#$#A.', '.#######.', '.D#####C.', '..D###C..', '...D#C...'] },
  letterH:{ e:'🔠', rows:['..#...#..', '..#...#..', '..#...#..', '..#####..', '..#...#..', '..#...#..', '..#...#..'] },
  butterfly:{ e:'🦋', rows:['B#A.#.B#A', '###A#B###', '#########', 'D###.###C', '..##.##..', '.B##.##A.', '.D#C.D#C.'] },
  arrow:{ e:'⬆️', rows:['....#....', '...B#A...', '..B###A..', '.B#####A.', '...###...', '...###...', '...###...', '...###...'] },
  flower:{ e:'🌸', rows:['..B#.#A..', '.B#####A.', '..##$##..', '.D#####C.', '..D#.#C..', '....#....', '...B#....', '....#....'] },
  letterT:{ e:'🔤', rows:['.#######.', '.#######.', '....#....', '....#....', '....#....', '....#....', '...B#A...'] },
  // generated patterns
  checker:{ e:'🏁', gen:(r, c) => r < 8 && (r + c) % 2 === 0 ? '#' : '.' },
  frame:{ e:'🖼️', gen:(r, c) => r < 8 && (r === 0 || r === 7 || c === 0 || c === 8) ? '#' : (r === 4 && c === 4 ? '+' : '.') },
  zigzag:{ e:'〰️', gen:(r, c) => r < 9 && ((r + Math.abs(4 - c)) % 4 === 0) ? '#' : '.' },
  wall:{ e:'🧱', gen:(r, c) => r < 6 ? '#' : '.' },
  stripes:{ e:'🟰', gen:(r, c) => r < 9 && r % 2 === 0 ? '#' : '.' },
  waves:{ e:'🌊', gen:(r, c) => r < 9 && Math.abs(Math.round(Math.sin(c * 0.8) * 1.5) + 4 - r) <= 1 ? '#' : '.' }
};
Object.keys(SHAPES).forEach(k => {
  const s = SHAPES[k];
  if(s.gen){ s.rows = []; for(let r = 0; r < 10; r++){ let row = ''; for(let c = 0; c < COLS; c++) row += s.gen(r, c); s.rows.push(row); } while(s.rows.length && !/[^.]/.test(s.rows[s.rows.length - 1])) s.rows.pop(); }
});
const ORDER = [
  'line', 'steps', 'heart', 'smile', 'letterB', 'diamond', 'star', 'letterO', 'house', 'bobo',
  'tree', 'checker', 'fish', 'letterA', 'moon', 'crown', 'frame', 'rocket', 'mushroom', 'cat',
  'letterS', 'ghost', 'zigzag', 'rainbow', 'pyramid', 'hourglass', 'plus', 'icecream', 'letterH', 'butterfly',
  'arrow', 'flower', 'wall', 'letterT', 'stripes', 'waves', 'heart', 'bobo', 'star', 'smile',
  'diamond', 'cat', 'house', 'letterB', 'crown', 'butterfly', 'rocket', 'checker', 'ghost', 'tree',
  'mushroom', 'icecream', 'letterO', 'moon', 'pyramid', 'hourglass', 'flower', 'fish', 'rainbow', 'frame',
  'zigzag', 'plus', 'letterO', 'bobo'
];
function rng(seed){ let a = seed >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const SPECIALS = ['h', 'v', 's', 'b'];
/* 3-star turn goals, measured: median turns of a random-aiming bot over 7 runs × 0.8 */
const PAR = [5,6,8,6,4,4,4,4,3,4,5,2,5,4,5,5,5,6,6,4,6,6,3,5,6,4,6,6,6,7,9,7,6,11,3,8,6,5,7,4,6,6,6,8,7,9,9,7,9,8,10,10,7,9,7,8,9,10,8,4,5,9,6,6];
const LEVELS = ORDER.map((name, i) => {
  const sh = SHAPES[name], R = rng(1000 + i * 7919);
  const rows = sh.rows.map(r => r.split(''));
  const h = rows.length;
  const empties = [];
  for(let r = 0; r < Math.min(h + 1, 11); r++) for(let c = 0; c < COLS; c++){ if(!rows[r]) rows[r] = '.........'.split(''); if(rows[r][c] === '.') empties.push([r, c]); }
  const take = () => { if(!empties.length) return null; const k = Math.floor(R() * empties.length); return empties.splice(k, 1)[0]; };
  const put = ch => { const p = take(); if(p) rows[p[0]][p[1]] = ch; };
  // pickups: rings every level, coins, a special from level 5 on (a laser first, so kids meet it early)
  const rings = 1 + (i % 3 === 0 ? 1 : 0) + (i > 20 ? 1 : 0);
  for(let k = 0; k < rings; k++) put('+');
  put('$'); if(i % 2) put('$');
  if(i >= 4) put(i === 4 ? 'h' : SPECIALS[(i * 3 + 1) % 4]);
  if(i >= 30 && i % 3 === 0) put(SPECIALS[(i + 2) % 4]);
  // numbers: a total that the starting balls clear in a few turns; styled per level (top-heavy, centre-heavy, wavy, mixed)
  const balls = Math.min(60, 5 + Math.floor(i * 0.9));
  const turns = 3 + Math.min(3, Math.floor(i / 14));
  let n = 0; rows.forEach(r => r.forEach(ch => { if('#ABCD'.includes(ch)) n += ch === '#' ? 1 : 0.6; }));
  const base = Math.max(i < 2 ? 1.2 : 1.8, balls * 2.6 * turns / Math.max(1, n));
  const style = i < 2 ? 0 : i < 8 ? 1 + i % 3 : i % 4;
  const hp = rows.map((r, ri) => r.map((ch, ci) => {
    if(!'#ABCD'.includes(ch)) return 0;
    let f = 1;
    if(style === 1) f = 1.35 - 0.7 * ri / Math.max(1, h - 1);
    else if(style === 2) f = 1.4 - 0.8 * Math.hypot(ci - 4, ri - h / 2) / 5;
    else if(style === 3) f = 0.7 + 0.6 * R();
    if(ch !== '#') f *= 0.6;
    return Math.max(1, Math.round(base * f));
  }));
  return { name, emoji:sh.e, rows:rows.map(r => r.join('')), hp, balls, par:PAR[i] || turns + 2 };
});
window.BALLS_LEVELS = LEVELS;
window.BALLS_SHAPES = SHAPES;
})();
