/* Bobo Land: "my character" avatar — the item catalogue, a cute chibi 2D drawing (home wardrobe + 3D hero portrait)
   and helpers. Loaded as a classic script on the home page and imported by worlds/kit.js (it only sets window.Avatar).
   An avatar is a small plain object saved by world.js under the key "avatar" (v:1); normalize() repairs anything missing. */
(function(){
'use strict';
const T = (a, e, t) => (window.L ? window.L(a, e, t) : a);

const SKINS = ['#ffe3cc', '#f7cfae', '#e6b088', '#c98e62', '#9a6440', '#6b4428'];
const HAIRC = [
  { c:'#1e1b22', n:T('أسود', 'Black', 'Siyah') }, { c:'#4a2c17', n:T('بني غامق', 'Dark brown', 'Koyu kahve') }, { c:'#7b4b29', n:T('بني', 'Brown', 'Kahverengi') },
  { c:'#a8703f', n:T('عسلي', 'Caramel', 'Karamel') }, { c:'#e8c46a', n:T('أشقر', 'Blonde', 'Sarı') }, { c:'#c8622a', n:T('أحمر', 'Ginger', 'Kızıl') },
  { c:'#b9bcc8', n:T('فضي', 'Silver', 'Gümüş') }, { c:'#f08cb6', n:T('زهري', 'Pink', 'Pembe') }
];
const CLOTH = [
  { c:'#e8454f', n:T('أحمر', 'Red', 'Kırmızı') }, { c:'#ffd23f', n:T('أصفر', 'Yellow', 'Sarı') }, { c:'#35c76f', n:T('أخضر', 'Green', 'Yeşil') },
  { c:'#3b8cf0', n:T('أزرق', 'Blue', 'Mavi') }, { c:'#2b3a7a', n:T('كحلي', 'Navy', 'Lacivert') }, { c:'#9b6bff', n:T('بنفسجي', 'Purple', 'Mor') },
  { c:'#ff6fae', n:T('زهري', 'Pink', 'Pembe') }, { c:'#f4f1ea', n:T('أبيض', 'White', 'Beyaz') }
];
const PANTS = [
  { c:'#4f74b8', n:T('جينز', 'Denim', 'Kot') }, { c:'#2f4a7a', n:T('جينز غامق', 'Dark denim', 'Koyu kot') }, { c:'#2a2830', n:T('أسود', 'Black', 'Siyah') },
  { c:'#80858f', n:T('رمادي', 'Grey', 'Gri') }, { c:'#b89a6a', n:T('بيج', 'Beige', 'Bej') }, { c:'#7a5232', n:T('بني', 'Brown', 'Kahverengi') },
  { c:'#ff8fbf', n:T('زهري', 'Pink', 'Pembe') }, { c:'#8a6ad0', n:T('بنفسجي', 'Purple', 'Mor') }
];

const it = (ar, en, tr, price, extra) => Object.assign({ name:T(ar, en, tr), price:price || 0 }, extra || {});
const HAIR = {
  long:it('طويل', 'Long', 'Uzun', 0, { g:'girl' }), ponytail:it('ذيل حصان', 'Ponytail', 'At kuyruğu', 0, { g:'girl' }), pigtails:it('جديلتين', 'Pigtails', 'İki tutam', 20, { g:'girl' }),
  braid:it('ضفيرة', 'Braid', 'Örgü', 30, { g:'girl' }), bob:it('قصير ناعم', 'Bob', 'Küt', 0, { g:'girl' }), curly:it('كيرلي', 'Curly', 'Kıvırcık', 30, { g:'girl' }),
  bun:it('كعكة', 'Bun', 'Topuz', 20, { g:'girl' }), hijab:it('حجاب', 'Hijab', 'Başörtüsü', 0, { g:'girl' }),
  short:it('قصير', 'Short', 'Kısa', 0, { g:'boy' }), spiky:it('مشوّك', 'Spiky', 'Dikenli', 20, { g:'boy' }), curlyb:it('مجعّد', 'Short curls', 'Kısa kıvırcık', 20, { g:'boy' }),
  side:it('فرق جنب', 'Side part', 'Yandan ayrık', 0, { g:'boy' }), buzz:it('محلوق', 'Buzz', 'Kazınmış', 0, { g:'boy' }), caphair:it('مع كاب', 'With cap', 'Şapkalı', 30, { g:'boy' }),
  longb:it('لحد الكتف', 'Shoulder length', 'Omuz boyu', 0, { g:'boy' }), afro:it('أفرو', 'Afro', 'Afro', 30, { g:'boy' })
};
const EYES = { round:it('مدوّرة', 'Round', 'Yuvarlak'), happy:it('مبسوطة', 'Happy', 'Mutlu'), dot:it('نقطة', 'Dots', 'Nokta'), sparkle:it('بتلمع', 'Sparkly', 'Pırıltılı', 30) };
const TOPS = {
  tee:it('تيشيرت', 'T-shirt', 'Tişört'), hoodie:it('هودي', 'Hoodie', 'Kapüşonlu'), dress:it('فستان', 'Dress', 'Elbise'), robe:it('ثوب / عباية', 'Robe', 'Uzun elbise'),
  shirt:it('قميص', 'Shirt', 'Gömlek', 20), sweater:it('كنزة', 'Sweater', 'Kazak', 20), jacket:it('جاكيت', 'Jacket', 'Ceket', 40), jersey:it('قميص رياضة', 'Jersey', 'Forma', 40)
};
const PATS = { plain:it('سادة', 'Plain', 'Düz'), dots:it('منقّط', 'Dots', 'Puantiyeli', 20), stars:it('نجوم', 'Stars', 'Yıldızlı', 30), hearts:it('قلوب', 'Hearts', 'Kalpli', 30) };
const BOTTOMS = { jeans:it('جينز', 'Jeans', 'Kot pantolon'), trousers:it('بنطلون', 'Trousers', 'Pantolon'), shorts:it('شورت', 'Shorts', 'Şort'), skirt:it('تنورة', 'Skirt', 'Etek'), leggings:it('ليجن', 'Leggings', 'Tayt') };
const SHOES = { sneakers:it('سبورت', 'Sneakers', 'Spor ayakkabı'), sandals:it('صندل', 'Sandals', 'Sandalet'), boots:it('جزمة', 'Boots', 'Bot', 30) };
const BACKS = { backpack:it('شنطة ظهر', 'Backpack', 'Sırt çantası', 30), cape:it('كاب سوبر', 'Cape', 'Pelerin', 50), wings:it('جوانح', 'Wings', 'Kanatlar', 80) };
const EXTRAS = { scarf:it('لفحة', 'Scarf', 'Atkı', 20), phones:it('سماعات', 'Headphones', 'Kulaklık', 40) };

const DEFAULT = {
  girl:{ v:1, body:'girl', skin:1, hair:'long', hairCol:2, hijabCol:4, eyes:'round', glasses:null, freckles:false, cheeks:true, top:'tee', topCol:5, pat:'plain', num:7, bottom:'skirt', botCol:0, shoes:'sneakers', shoeCol:6, hat:null, back:null, extra:null, accCol:3 },
  boy:{ v:1, body:'boy', skin:1, hair:'short', hairCol:1, hijabCol:4, eyes:'round', glasses:null, freckles:false, cheeks:true, top:'tee', topCol:3, pat:'plain', num:7, bottom:'jeans', botCol:0, shoes:'sneakers', shoeCol:0, hat:null, back:null, extra:null, accCol:0 }
};
const inRange = (v, n, d) => (Number.isInteger(v) && v >= 0 && v < n ? v : d);
function normalize(a){
  a = a && typeof a === 'object' ? a : {};
  const d = DEFAULT[a.body === 'boy' ? 'boy' : 'girl'], o = Object.assign({}, d);
  const W = window.World;
  o.skin = inRange(a.skin, SKINS.length, d.skin); o.hairCol = inRange(a.hairCol, HAIRC.length, d.hairCol); o.hijabCol = inRange(a.hijabCol, CLOTH.length, d.hijabCol);
  o.topCol = inRange(a.topCol, CLOTH.length, d.topCol); o.botCol = inRange(a.botCol, PANTS.length, d.botCol); o.shoeCol = inRange(a.shoeCol, CLOTH.length, d.shoeCol); o.accCol = inRange(a.accCol, CLOTH.length, d.accCol);
  o.num = Number.isInteger(a.num) && a.num >= 1 && a.num <= 9 ? a.num : d.num;
  if(HAIR[a.hair]) o.hair = a.hair; if(EYES[a.eyes]) o.eyes = a.eyes; if(TOPS[a.top]) o.top = a.top; if(PATS[a.pat]) o.pat = a.pat;
  if(BOTTOMS[a.bottom]) o.bottom = a.bottom; if(SHOES[a.shoes]) o.shoes = a.shoes;
  o.back = BACKS[a.back] ? a.back : null; o.extra = EXTRAS[a.extra] ? a.extra : null;
  o.hat = typeof a.hat === 'string' && (!W || W.HATS[a.hat]) ? a.hat : null;
  o.glasses = typeof a.glasses === 'string' && (!W || W.GLASSES[a.glasses]) ? a.glasses : null;
  o.freckles = !!a.freckles; o.cheeks = a.cheeks == null ? d.cheeks : !!a.cheeks;
  return o;
}
/* the saved avatar, read straight from the shared save (works in the games too, where world.js may not be loaded) */
function load(){
  try{ const w = JSON.parse(localStorage.getItem('bobo_world')); if(w && w.avatar) return normalize(w.avatar); }catch(e){}
  return normalize(null);
}

/* ---------- drawing (units: the character is 100 tall, feet at y = 0, head centre at y = -74) ---------- */
function shade(hex, k){
  let n = parseInt(hex.slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255;
  if(k < 0){ r *= 1 + k; g *= 1 + k; b *= 1 + k; } else { r += (255 - r) * k; g += (255 - g) * k; b += (255 - b) * k; }
  return 'rgb(' + (r | 0) + ',' + (g | 0) + ',' + (b | 0) + ')';
}
const light = hex => { const n = parseInt(hex.slice(1), 16); return ((n >> 16) * .3 + ((n >> 8) & 255) * .59 + (n & 255) * .11) > 185; };
function rr(c, x, y, w, h, r){ r = Math.min(r, w / 2, h / 2); c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
function ell(c, x, y, rx, ry, rot){ c.beginPath(); c.ellipse(x, y, rx, ry, rot || 0, 0, Math.PI * 2); }
function paint(c, col, line){ c.fillStyle = col; c.fill(); c.lineWidth = 1.3; c.strokeStyle = line || shade(col, -.32); c.stroke(); }
function star(c, x, y, r){ c.beginPath(); for(let i = 0; i < 10; i++){ const a = i / 10 * Math.PI * 2 - Math.PI / 2, q = i % 2 ? r * .45 : r; c.lineTo(x + Math.cos(a) * q, y + Math.sin(a) * q); } c.closePath(); }
function heart(c, x, y, r){ c.beginPath(); c.moveTo(x, y + r * .9); c.bezierCurveTo(x - r * 1.4, y - r * .1, x - r * .6, y - r * 1.1, x, y - r * .35); c.bezierCurveTo(x + r * .6, y - r * 1.1, x + r * 1.4, y - r * .1, x, y + r * .9); c.closePath(); }
/* fill the current path with a colour + optional print, then outline it */
function cloth(c, col, pat){
  c.fillStyle = col; c.fill(); c.lineWidth = 1.3; c.strokeStyle = shade(col, -.32); c.stroke();
  if(pat && pat !== 'plain'){
    c.save(); c.clip(); c.fillStyle = light(col) ? 'rgba(60,70,140,.55)' : 'rgba(255,255,255,.75)';
    for(let y = -110, row = 0; y < 5; y += 7, row++) for(let x = -40 + (row % 2) * 4; x < 40; x += 8){
      if(pat === 'dots'){ c.beginPath(); c.arc(x, y, 1.3, 0, 7); c.fill(); }
      else if(pat === 'stars'){ star(c, x, y, 2.1); c.fill(); }
      else { heart(c, x, y, 1.8); c.fill(); }
    }
    c.restore();
  }
}
const HEAD_Y = -74, HR = 22;

function hairCapPath(c, style){
  c.beginPath();
  const R = style === 'buzz' ? 22.6 : style === 'afro' || style === 'curly' ? 25 : 24;
  c.arc(0, HEAD_Y - 1, R, Math.PI * .93, Math.PI * 2.07);
  if(style === 'side'){ c.lineTo(20, -79); c.quadraticCurveTo(6, -80, -2, -91); c.quadraticCurveTo(-12, -82, -21, -80); }
  else if(style === 'buzz'){ c.lineTo(20, -82); c.quadraticCurveTo(0, -92, -20, -82); }
  else if(style === 'pigtails' || style === 'bun' || style === 'ponytail' || style === 'braid'){ c.lineTo(20, -78); c.quadraticCurveTo(12, -90, 0, -89); c.quadraticCurveTo(-12, -90, -20, -78); }
  else {
    c.lineTo(20, -78);
    const n = style === 'short' || style === 'spiky' || style === 'caphair' ? 4 : 5;
    for(let i = 0; i < n; i++){ const x0 = 20 - i * 40 / n, x1 = 20 - (i + 1) * 40 / n; c.quadraticCurveTo((x0 + x1) / 2, -79 - (i % 2 ? 1 : 4), x1, -84 + (i === n - 1 ? 6 : 0)); }
  }
  c.closePath();
}
function hairShine(c, col){ c.strokeStyle = shade(col, .35); c.lineWidth = 2; c.lineCap = 'round'; c.beginPath(); c.arc(0, HEAD_Y - 1, 18, Math.PI * 1.2, Math.PI * 1.42); c.stroke(); }

function hairBack(c, a, col){
  const s = a.hair;
  if(s === 'long'){ rr(c, -26, -86, 52, 52, 14); paint(c, col); }
  else if(s === 'longb'){ rr(c, -25, -86, 50, 30, 12); paint(c, col); }
  else if(s === 'bob'){ rr(c, -26, -92, 52, 36, 13); paint(c, col); }
  else if(s === 'ponytail'){ c.save(); c.translate(22, -84); c.rotate(-.35); ell(c, 6, 14, 7, 17); paint(c, col); c.restore(); }
  else if(s === 'pigtails'){ for(const k of [-1, 1]){ ell(c, k * 28, -70, 7, 13, k * .35); paint(c, col); } }
  else if(s === 'bun'){ c.beginPath(); c.arc(0, -98, 9.5, 0, 7); paint(c, col); }
  else if(s === 'curly'){ for(let i = 0; i < 13; i++){ const t = i / 12, x = -26 + t * 52, y = -60 - Math.sin(t * Math.PI) * 32; c.beginPath(); c.arc(x, y, 8, 0, 7); paint(c, col); }
    for(const x of [-24, -16, 16, 24]){ c.beginPath(); c.arc(x, -54, 7, 0, 7); paint(c, col); } }
  else if(s === 'afro'){ c.beginPath(); for(let i = 0; i < 16; i++){ const t = i / 16 * Math.PI * 2; c.arc(Math.cos(t) * 26, -80 + Math.sin(t) * 24, 8, 0, 7); } c.fillStyle = col; c.fill(); c.beginPath(); c.arc(0, -80, 29, 0, 7); c.fill(); }
  else if(s === 'hijab'){ const h = CLOTH[a.hijabCol].c; c.beginPath(); c.moveTo(-20, -44); c.quadraticCurveTo(-30, -62, -27, -78); c.arc(0, -76, 27, Math.PI, Math.PI * 2); c.quadraticCurveTo(30, -62, 20, -44); c.quadraticCurveTo(0, -40, -20, -44); c.closePath(); paint(c, h); }
}
function hairFront(c, a, col){
  const s = a.hair;
  if(s === 'hijab'){
    const h = CLOTH[a.hijabCol].c;
    c.beginPath(); c.arc(0, -76, 25.5, 0, Math.PI * 2); c.ellipse(0, -71, 17.5, 19.5, 0, 0, Math.PI * 2, true);
    c.fillStyle = h; c.fill('evenodd'); c.lineWidth = 1.3; c.strokeStyle = shade(h, -.32); c.stroke();
    c.beginPath(); c.moveTo(-17, -60); c.quadraticCurveTo(0, -48, 17, -60); c.lineTo(20, -52); c.quadraticCurveTo(0, -42, -20, -52); c.closePath(); paint(c, h);
    c.strokeStyle = shade(h, .3); c.lineWidth = 1.5; c.beginPath(); c.arc(0, -76, 22, Math.PI * 1.2, Math.PI * 1.8); c.stroke();
    return;
  }
  if(s === 'afro'){ hairCapPath(c, 'afro'); paint(c, col); for(let i = 0; i < 7; i++){ c.beginPath(); c.arc(-18 + i * 6, -84 + (i % 2) * 2, 4, 0, 7); c.fillStyle = col; c.fill(); } return; }
  if(s === 'curlyb'){ hairCapPath(c, 'short'); paint(c, col); for(let i = 0; i < 9; i++){ const t = Math.PI * (1.05 + i * .1); c.beginPath(); c.arc(Math.cos(t) * 23, HEAD_Y - 2 + Math.sin(t) * 23, 5.5, 0, 7); paint(c, col); } hairShine(c, col); return; }
  if(s === 'spiky'){ c.beginPath(); for(let i = 0; i < 6; i++){ const t = Math.PI * (1.12 + i * .15), x = Math.cos(t) * 22, y = HEAD_Y + Math.sin(t) * 22; c.moveTo(x - 6, y + 3); c.lineTo(Math.cos(t) * 33, HEAD_Y + Math.sin(t) * 33); c.lineTo(x + 6, y + 3); } paint(c, col); }
  hairCapPath(c, s); paint(c, col);
  if(s === 'long' || s === 'longb' || s === 'bob'){ const yb = s === 'long' ? -48 : s === 'bob' ? -60 : -58; for(const k of [-1, 1]){ rr(c, k > 0 ? 17 : -26, -80, 9, yb + 80, 4.5); paint(c, col); } }
  if(s === 'curly'){ for(const k of [-1, 1]) for(let i = 0; i < 3; i++){ c.beginPath(); c.arc(k * 23, -76 + i * 8, 5.5, 0, 7); paint(c, col); } }
  if(s === 'braid'){ for(let i = 0; i < 6; i++){ ell(c, 19 + i * .6, -64 + i * 5.2, 5 - i * .3, 3.8, .3); paint(c, col); } c.beginPath(); c.arc(22.5, -34.5, 2.8, 0, 7); paint(c, CLOTH[a.accCol].c); ell(c, 22.8, -30, 3, 4); paint(c, col); }
  if(s === 'ponytail'){ c.beginPath(); c.arc(22, -86, 3.4, 0, 7); paint(c, CLOTH[a.accCol].c); }
  if(s === 'pigtails'){ for(const k of [-1, 1]){ c.beginPath(); c.arc(k * 23, -78, 3.2, 0, 7); paint(c, CLOTH[a.accCol].c); } }
  if(s === 'caphair'){
    const cc = CLOTH[a.accCol].c;
    c.beginPath(); c.ellipse(0, -84, 24.5, 19, 0, Math.PI, Math.PI * 2); c.closePath(); paint(c, cc);
    ell(c, 4, -84, 25, 4.5); paint(c, shade(cc, -.15));
    c.beginPath(); c.arc(0, -101.5, 2.4, 0, 7); paint(c, shade(cc, .25));
  }
  if(s !== 'buzz') hairShine(c, col);
}

function face(c, a, blink){
  const ink = '#2a1608';
  if(a.cheeks){ c.fillStyle = 'rgba(255,110,140,.4)'; for(const k of [-1, 1]){ ell(c, k * 13.5, -64.5, 4.2, 2.6); c.fill(); } }
  if(a.freckles){ c.fillStyle = 'rgba(150,80,40,.75)'; for(const k of [-1, 1]) for(const [dx, dy] of [[0, 0], [2.6, 1.4], [-2, 1.6], [1, 3]]){ c.beginPath(); c.arc(k * (13 + dx), -67 + dy, .65, 0, 7); c.fill(); } }
  for(const k of [-1, 1]){
    const X = k * 8.5, Y = -71;
    if(blink || a.eyes === 'happy'){ c.strokeStyle = ink; c.lineWidth = 1.6; c.lineCap = 'round'; c.beginPath(); c.arc(X, Y + 1.8, 3.6, Math.PI * 1.15, Math.PI * 1.85); c.stroke(); continue; }
    if(a.eyes === 'dot'){ c.fillStyle = '#141018'; ell(c, X, Y, 2.6, 3.4); c.fill(); c.fillStyle = '#fff'; c.beginPath(); c.arc(X - .9, Y - 1.2, .9, 0, 7); c.fill(); continue; }
    const big = a.eyes === 'sparkle' ? 1.12 : 1;
    c.fillStyle = '#fff'; ell(c, X, Y, 4.4 * big, 5.1 * big); c.fill();
    c.fillStyle = a.eyes === 'sparkle' ? '#5a3a8a' : '#6b3a17'; ell(c, X + k * .2, Y + .5, 3.6 * big, 4.4 * big); c.fill();
    c.fillStyle = '#1d0e06'; ell(c, X + k * .2, Y + .9, 2 * big, 2.6 * big); c.fill();
    c.fillStyle = '#fff'; c.beginPath(); c.arc(X - 1.3, Y - 1.5, 1.4 * big, 0, 7); c.fill(); c.beginPath(); c.arc(X + 1.4, Y + 1.8, .65, 0, 7); c.fill();
    if(a.eyes === 'sparkle'){ star(c, X + 1.6, Y - 2, 1.1); c.fill(); }
    c.strokeStyle = ink; c.lineWidth = 1.1; c.lineCap = 'round'; c.beginPath(); c.ellipse(X, Y, 4.6 * big, 5.3 * big, 0, Math.PI * 1.08, Math.PI * 1.92); c.stroke();
    if(a.eyes === 'sparkle' || a.body === 'girl'){ c.lineWidth = .9; c.beginPath(); c.moveTo(X + k * 3.8 * big, Y - 3.4 * big); c.lineTo(X + k * 5.8 * big, Y - 5 * big); c.stroke(); }
  }
  c.fillStyle = 'rgba(200,120,90,.6)'; ell(c, 0, -66, 1.3, .9); c.fill();
  c.strokeStyle = '#8a2a2a'; c.lineWidth = 1.2; c.lineCap = 'round'; c.beginPath(); c.arc(0, -64.5, 3.8, Math.PI * .2, Math.PI * .8); c.stroke();
}

function glasses(c, g){
  if(g === 'goggles'){ c.strokeStyle = '#2b7fd6'; c.lineWidth = 2.2; c.beginPath(); c.moveTo(-23, -72); c.lineTo(23, -72); c.stroke();
    for(const k of [-1, 1]){ rr(c, k * 8.5 - 6, -77, 12, 10, 4.5); c.fillStyle = 'rgba(150,220,255,.45)'; c.fill(); c.lineWidth = 1.8; c.strokeStyle = '#2b7fd6'; c.stroke(); } return; }
  for(const k of [-1, 1]){ c.beginPath(); c.arc(k * 8.5, -71, 6.2, 0, 7); if(g === 'sun'){ c.fillStyle = 'rgba(25,22,35,.88)'; c.fill(); } c.lineWidth = 1.5; c.strokeStyle = g === 'sun' ? '#1a1a22' : '#3a2a5a'; c.stroke(); }
  c.beginPath(); c.moveTo(-2.4, -72); c.quadraticCurveTo(0, -74, 2.4, -72); c.stroke();
  if(g === 'sun') for(const k of [-1, 1]){ c.fillStyle = 'rgba(255,255,255,.5)'; ell(c, k * 8.5 - 2, -73.5, 1.6, 1, -.5); c.fill(); }
}

function legs(c, a){
  const skin = SKINS[a.skin], pc = PANTS[a.botCol].c, b = a.bottom, sc = CLOTH[a.shoeCol].c;
  const robe = a.top === 'robe';
  for(const k of [-1, 1]){
    const x = k * 6.2;
    if(robe){ rr(c, x - 4, -14, 8, 10, 3); paint(c, PANTS[a.botCol].c); }
    else if(b === 'shorts' || b === 'skirt'){ rr(c, x - 3.6, -30, 7.2, 26, 3.5); paint(c, skin); }
    else { const w = b === 'leggings' ? 7.4 : 9; rr(c, x - w / 2, -33, w, 29, 3.5); paint(c, pc);
      if(b === 'jeans'){ c.strokeStyle = shade(pc, .3); c.lineWidth = .8; c.beginPath(); c.moveTo(x + k * 1.5, -28); c.lineTo(x + k * 1.5, -6); c.stroke(); rr(c, x - 4.6, -8, 9.2, 3, 1); paint(c, shade(pc, .12)); } }
    // shoes
    if(a.shoes === 'boots'){ rr(c, x - 5, -13, 10, 11, 3); paint(c, sc); ell(c, x + k * .5, -2.5, 6.6, 3.2); paint(c, sc); rr(c, x - 6.6, -1.6, 13.2, 2.4, 1.2); paint(c, '#3a2a22'); }
    else if(a.shoes === 'sandals'){ ell(c, x + k * .5, -2.8, 5.6, 3); paint(c, skin); rr(c, x - 6, -1.4, 12, 2.4, 1.2); paint(c, shade(sc, -.1)); c.strokeStyle = sc; c.lineWidth = 1.8; for(const dy of [-4.6, -2.6]){ c.beginPath(); c.moveTo(x - 4.6, dy); c.lineTo(x + 4.6, dy); c.stroke(); } }
    else { ell(c, x + k * .5, -3.4, 6.6, 3.8); paint(c, sc); rr(c, x - 6.6, -1.8, 13.2, 2.6, 1.3); paint(c, '#ffffff', '#c9c9d4'); c.fillStyle = '#fff'; for(const dx of [-1.6, 1.6]){ c.beginPath(); c.arc(x + dx, -5, .7, 0, 7); c.fill(); } }
  }
  if(robe) return;
  if(b === 'shorts'){ c.beginPath(); c.moveTo(-13, -36); c.lineTo(13, -36); c.lineTo(14, -24); c.lineTo(1, -24); c.lineTo(0, -28); c.lineTo(-1, -24); c.lineTo(-14, -24); c.closePath(); paint(c, pc); }
  else if(b === 'skirt'){ c.beginPath(); c.moveTo(-12.5, -37); c.lineTo(12.5, -37); c.lineTo(19, -21); c.quadraticCurveTo(0, -18, -19, -21); c.closePath(); paint(c, pc); c.strokeStyle = shade(pc, -.2); c.lineWidth = .8; for(const x of [-6, 0, 6]){ c.beginPath(); c.moveTo(x * .7, -35); c.lineTo(x * 1.2, -20.5); c.stroke(); } }
  else { rr(c, -12.8, -37, 25.6, 8, 3); paint(c, pc); }
}

const LONG_SLEEVE = { hoodie:1, jacket:1, shirt:1, sweater:1, robe:1 };
function arms(c, a){
  const skin = SKINS[a.skin], col = CLOTH[a.topCol].c, long = LONG_SLEEVE[a.top];
  for(const k of [-1, 1]){
    const x0 = k * 12.5, y0 = -49, x1 = k * 17.5, y1 = -33, w = a.top === 'robe' ? 8.6 : 7.4;
    c.lineCap = 'round';
    c.strokeStyle = shade(long ? col : skin, -.32); c.lineWidth = w + 2.4; c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke();
    c.strokeStyle = long ? col : skin; c.lineWidth = w; c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke();
    if(!long){ c.save(); c.translate(x0 + k * 1.5, y0 + 3); c.rotate(-k * .3); rr(c, -5, -4, 10, 9, 4); cloth(c, col, a.pat); c.restore(); }
    else if(a.top === 'sweater' || a.top === 'hoodie'){ c.strokeStyle = shade(col, -.15); c.lineWidth = w; c.beginPath(); c.moveTo(x1 - k * .4, y1 - 2.6); c.lineTo(x1, y1 - .4); c.stroke(); }
    c.beginPath(); c.arc(x1 + k * .3, y1 + 2.4, 3.7, 0, 7); paint(c, skin);
  }
}
function torso(c, a){
  const col = CLOTH[a.topCol].c, t = a.top, dk = shade(col, -.18);
  if(t === 'hoodie'){ ell(c, 0, -52, 13, 5); paint(c, dk); }
  if(t === 'robe'){ c.beginPath(); c.moveTo(-12.5, -52); c.quadraticCurveTo(0, -55, 12.5, -52); c.lineTo(19, -5); c.quadraticCurveTo(0, -2, -19, -5); c.closePath(); cloth(c, col, a.pat);
    c.strokeStyle = shade(col, light(col) ? -.25 : .45); c.lineWidth = 1.2; c.beginPath(); c.moveTo(0, -50); c.lineTo(0, -8); c.stroke(); return; }
  if(t === 'dress'){ c.beginPath(); c.moveTo(-11.5, -42); c.lineTo(11.5, -42); c.lineTo(20, -19); c.quadraticCurveTo(0, -15, -20, -19); c.closePath(); cloth(c, col, a.pat); }
  rr(c, -13.5, -53, 27, t === 'dress' ? 13 : 22, 7); cloth(c, col, a.pat);
  if(t === 'dress'){ c.strokeStyle = shade(col, -.3); c.lineWidth = 1.6; c.beginPath(); c.moveTo(-11.5, -41); c.lineTo(11.5, -41); c.stroke(); }
  const trim = light(col) ? shade(col, -.25) : '#ffffff';
  if(t === 'hoodie'){ rr(c, -8, -40, 16, 6.5, 3); paint(c, dk); c.strokeStyle = '#fff'; c.lineWidth = .9; for(const x of [-3, 3]){ c.beginPath(); c.moveTo(x, -50); c.lineTo(x, -44); c.stroke(); } }
  if(t === 'jacket'){ rr(c, -4, -52.5, 8, 21, 2); paint(c, '#ffffff', '#d0d0d8'); c.strokeStyle = shade(col, -.35); c.lineWidth = 1; c.beginPath(); c.moveTo(-4, -52); c.lineTo(-4, -31.5); c.moveTo(4, -52); c.lineTo(4, -31.5); c.stroke();
    for(const k of [-1, 1]){ c.beginPath(); c.moveTo(k * 4, -53); c.lineTo(k * 10, -53); c.lineTo(k * 4.5, -45); c.closePath(); paint(c, dk); } }
  if(t === 'shirt'){ for(const k of [-1, 1]){ c.beginPath(); c.moveTo(0, -50.5); c.lineTo(k * 7.5, -53.5); c.lineTo(k * 5, -47); c.closePath(); paint(c, shade(col, .35)); }
    c.fillStyle = shade(col, -.35); for(let y = -46; y < -32; y += 4.5){ c.beginPath(); c.arc(0, y, .8, 0, 7); c.fill(); } }
  if(t === 'sweater'){ rr(c, -13.5, -35, 27, 4, 2); paint(c, dk); c.strokeStyle = shade(col, -.32); c.lineWidth = .6; for(let x = -12; x <= 12; x += 2){ c.beginPath(); c.moveTo(x, -34.5); c.lineTo(x, -31.5); c.stroke(); }
    c.beginPath(); c.ellipse(0, -52.5, 6, 2.6, 0, 0, Math.PI); c.lineWidth = 2; c.strokeStyle = dk; c.stroke(); }
  if(t === 'jersey'){ c.strokeStyle = trim; c.lineWidth = 1.6; c.beginPath(); c.moveTo(-5, -52.5); c.lineTo(0, -47.5); c.lineTo(5, -52.5); c.stroke();
    c.fillStyle = trim; c.font = '800 12px system-ui,sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(String(a.num), 0, -39.5); }
  if(t === 'tee'){ c.beginPath(); c.ellipse(0, -52.8, 5, 2.4, 0, 0, Math.PI); c.lineWidth = 1.2; c.strokeStyle = shade(col, -.32); c.stroke(); }
}
function backItem(c, a){
  const col = CLOTH[a.accCol].c;
  if(a.back === 'cape'){ c.beginPath(); c.moveTo(-11, -53); c.lineTo(11, -53); c.lineTo(23, -10); c.quadraticCurveTo(0, -5, -23, -10); c.closePath(); paint(c, col); }
  if(a.back === 'wings'){ for(const k of [-1, 1]){ ell(c, k * 22, -52, 14, 8, k * -.5); paint(c, shade(col, .35), col); ell(c, k * 18, -40, 9, 5.5, k * .4); paint(c, shade(col, .5), col); } }
  if(a.back === 'backpack'){ rr(c, -17.5, -51, 35, 23, 7); paint(c, col); }
}
function frontAcc(c, a){
  const col = CLOTH[a.accCol].c;
  if(a.back === 'backpack'){ c.strokeStyle = shade(col, -.2); c.lineWidth = 2.6; c.lineCap = 'round'; for(const k of [-1, 1]){ c.beginPath(); c.moveTo(k * 9.5, -52); c.quadraticCurveTo(k * 10.5, -42, k * 9.5, -33); c.stroke(); } }
  if(a.back === 'cape'){ for(const k of [-1, 1]){ c.beginPath(); c.arc(k * 6, -51.5, 2.2, 0, 7); paint(c, '#ffd23f'); } }
  if(a.extra === 'scarf'){ rr(c, -12, -56.5, 24, 6.5, 3.2); paint(c, col); rr(c, 3, -52, 6.5, 15, 2.5); paint(c, col); c.strokeStyle = shade(col, -.25); c.lineWidth = .9; c.beginPath(); c.moveTo(4, -40); c.lineTo(8.5, -40); c.stroke(); }
}
function headphones(c, a){
  const col = CLOTH[a.accCol].c;
  c.strokeStyle = shade(col, -.3); c.lineWidth = 4.6; c.lineCap = 'round'; c.beginPath(); c.arc(0, -76, 27, Math.PI * 1.08, Math.PI * 1.92); c.stroke();
  c.strokeStyle = col; c.lineWidth = 3; c.beginPath(); c.arc(0, -76, 27, Math.PI * 1.08, Math.PI * 1.92); c.stroke();
  for(const k of [-1, 1]){ rr(c, k * 24 - 4.5, -81, 9, 14, 4.5); paint(c, col); }
}
function hatEmoji(c, a){
  const W = window.World; if(!a.hat || !W || !W.HATS[a.hat]) return;
  c.save(); c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = '34px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
  const tall = a.hair === 'afro' || a.hair === 'bun' || a.hair === 'curly' ? 4 : 0;
  c.fillText(W.HATS[a.hat].e, 0, -101 - tall); c.restore();
}

/* draw the avatar: feet centred at (x, y), h pixels tall; opt = { t (seconds, for idle bob + blinking) } */
function draw(c, a, x, y, h, opt){
  a = a && a.v ? a : normalize(a);
  const t = opt && opt.t, k = h / 100, bob = t != null ? Math.sin(t * 2.2) * .8 : 0;
  const blink = t != null && ((t % 3.6) < .12);
  const skin = SKINS[a.skin], hc = HAIRC[a.hairCol].c;
  c.save(); c.translate(x, y); c.scale(k, k);
  c.lineJoin = 'round';
  c.fillStyle = 'rgba(20,16,50,.25)'; ell(c, 0, 0, 22, 3.4); c.fill();
  c.translate(0, bob);
  backItem(c, a);
  hairBack(c, a, hc);
  legs(c, a);
  torso(c, a);
  arms(c, a);
  rr(c, -4, -56, 8, 6, 2); paint(c, skin);
  frontAcc(c, a);
  if(a.hair !== 'hijab') for(const s of [-1, 1]){ c.beginPath(); c.arc(s * 21.6, -72, 4, 0, 7); paint(c, skin); }
  c.beginPath(); c.arc(0, HEAD_Y, HR, 0, 7); paint(c, skin);
  face(c, a, blink);
  hairFront(c, a, hc);
  if(a.extra === 'phones') headphones(c, a);
  if(a.glasses) glasses(c, a.glasses);
  hatEmoji(c, a);
  c.restore();
}
/* draw into a canvas, fitting the unit box crop = [x0, y0, w, h] (default: whole body) */
const CROPS = { all:[-46, -112, 92, 114], head:[-36, -110, 72, 70], face:[-26, -96, 52, 44], top:[-30, -62, 60, 50], bottom:[-26, -42, 52, 44], shoes:[-16, -16, 32, 18] };
function drawFit(cv, a, crop, opt){
  const c = cv.getContext('2d'), [x0, y0, w, h] = Array.isArray(crop) ? crop : CROPS[crop || 'all'], k = Math.min(cv.width / w, cv.height / h);
  c.clearRect(0, 0, cv.width, cv.height);
  draw(c, a, cv.width / 2 - (x0 + w / 2) * k, cv.height / 2 - (y0 + h / 2) * k, 100 * k, opt);
}
/* a full-body picture like the other heroes' cards (232 x 360, transparent) */
function portrait(a){ const cv = document.createElement('canvas'); cv.width = 232; cv.height = 360; drawFit(cv, a || load(), [-40, -120, 80, 122]); return cv.toDataURL('image/png'); }

const pick = arr => arr[Math.floor(Math.random() * arr.length)];
/* a random outfit using only free or already-owned things (owns(id) -> bool) */
function random(body, owns){
  const ok = (slot, list) => Object.keys(list).filter(k => !list[k].price || owns('av:' + slot + ':' + k));
  const hairs = ok('hair', HAIR).filter(k => HAIR[k].g === body), W = window.World;
  const a = normalize({ body });
  Object.assign(a, {
    skin:a.skin, hair:pick(hairs.length ? hairs : [DEFAULT[body].hair]), hairCol:Math.floor(Math.random() * 6), hijabCol:Math.floor(Math.random() * 8),
    eyes:pick(ok('eyes', EYES)), cheeks:Math.random() < .7, freckles:Math.random() < .3,
    top:pick(ok('top', TOPS)), topCol:Math.floor(Math.random() * 8), pat:pick(ok('pat', PATS)), num:1 + Math.floor(Math.random() * 9),
    bottom:pick(Object.keys(BOTTOMS)), botCol:Math.floor(Math.random() * 8), shoes:pick(ok('shoes', SHOES)), shoeCol:Math.floor(Math.random() * 8), accCol:Math.floor(Math.random() * 8),
    back:Math.random() < .5 ? pick([null].concat(ok('back', BACKS))) : null, extra:Math.random() < .4 ? pick([null].concat(ok('extra', EXTRAS))) : null
  });
  if(W){ const hats = Object.keys(W.HATS).filter(k => !W.HATS[k].price || owns('hat:' + k)), gl = Object.keys(W.GLASSES).filter(k => !W.GLASSES[k].price || owns('glasses:' + k));
    a.hat = hats.length && Math.random() < .35 ? pick(hats) : null; a.glasses = gl.length && Math.random() < .3 ? pick(gl) : null; }
  return a;
}

window.Avatar = { SKINS, HAIRC, CLOTH, PANTS, HAIR, EYES, TOPS, PATS, BOTTOMS, SHOES, BACKS, EXTRAS, DEFAULT, CROPS,
  normalize, load, draw, drawFit, portrait, random, shade };
})();
