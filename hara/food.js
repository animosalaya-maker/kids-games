/* «حديقة الحارة»: food in the neighbourhood park, built from code (no models, no image files, no brand names).
   Four food carts along the paths, each with a striped awning, a menu board painted with icons and prices and a friendly
   vendor: 🥤 a fizzy drinks cart, 🧃 a fresh juice cart, ☕ a coffee caravan (coffee is for grown-ups, kids get hot
   chocolate and milk) and 🍿 a snack van (corn, ice cream, simit, popcorn). And «مطعم الحديقة» (Park Café): a little
   restaurant you walk into through its glass doors (same place, no loading): tables and chairs, a counter with a cashier,
   a menu board, a kitchen window, plants and warm lamps. Its roof lifts off while you are inside.
   Everything is paid with the park coins the kid collected (1–5 coins); water is always free. Never real money.
   Online only the fixed item index (ITEMS) and «eating or not» travel, never text.
   Everything static is merged: one vertex-coloured mesh for all carts and the café, one atlas mesh for the painted boards. */

/* the menu items. The index is what travels online: only ever ADD at the end, never reorder.
   p = price in park coins, m = held model, hot = steams, drink = gulps (else munches), adult = shown but not sold to kids */
export const ITEMS = [
  null,
  { k:'water', e:'💧', p:0, n:['مي', 'Water', 'Su'], m:'bottle', drink:1 },
  { k:'cola', e:'🥤', p:2, n:['كولا', 'Cola', 'Kola'], m:'cup', c:0xd8382c, d:0x4a2a1a, drink:1, fizz:1 },
  { k:'grape', e:'🍇', p:2, n:['غازوز عنب', 'Grape fizz', 'Üzüm gazozu'], m:'cup', c:0x7d55e8, d:0x5a2a8a, drink:1, fizz:1 },
  { k:'bubbles', e:'🫧', p:1, n:['مي فوّارة', 'Sparkling water', 'Maden suyu'], m:'cup', c:0x8fd3f0, d:0xd8f4ff, drink:1, fizz:1 },
  { k:'orange', e:'🍊', p:2, n:['عصير برتقان', 'Orange juice', 'Portakal suyu'], m:'cup', c:0xfff6e8, d:0xffa42a, fr:0xff8a1a, drink:1 },
  { k:'straw', e:'🍓', p:2, n:['عصير فريز', 'Strawberry juice', 'Çilek suyu'], m:'cup', c:0xfff6e8, d:0xff5f7e, fr:0xe8304f, drink:1 },
  { k:'lemon', e:'🍋', p:2, n:['ليموناضة', 'Lemonade', 'Limonata'], m:'cup', c:0xfff6e8, d:0xfff07a, fr:0xf5d81f, drink:1 },
  { k:'coffee', e:'☕', p:3, n:['قهوة', 'Coffee', 'Kahve'], m:'mug', c:0xffffff, d:0x4a2a14, drink:1, hot:1, adult:1 },
  { k:'cocoa', e:'🍫', p:2, n:['شوكولا سخنة', 'Hot chocolate', 'Sıcak çikolata'], m:'mug', c:0xff8fb1, d:0x7a4422, drink:1, hot:1, cream:1 },
  { k:'milk', e:'🥛', p:1, n:['حليب', 'Milk', 'Süt'], m:'mug', c:0x6cc4ff, d:0xfdfbf4, drink:1 },
  { k:'corn', e:'🌽', p:2, n:['عرنوس ذرة', 'Corn on the cob', 'Mısır'], m:'cob' },
  { k:'cone', e:'🍦', p:2, n:['بوظة', 'Ice cream', 'Dondurma'], m:'cone' },
  { k:'simit', e:'🥯', p:1, n:['كعكة سمسم', 'Sesame ring', 'Simit'], m:'ring' },
  { k:'popcorn', e:'🍿', p:2, n:['بوشار', 'Popcorn', 'Patlamış mısır'], m:'bag' },
  { k:'pizza', e:'🍕', p:4, n:['بيتزا', 'Pizza', 'Pizza'], m:'tray', f:'pizza' },
  { k:'burger', e:'🍔', p:5, n:['برغر', 'Burger', 'Hamburger'], m:'tray', f:'burger' },
  { k:'falafel', e:'🧆', p:3, n:['سندويشة فلافل', 'Falafel wrap', 'Falafel dürüm'], m:'tray', f:'wrap' },
  { k:'shawarma', e:'🌯', p:4, n:['شاورما', 'Shawarma', 'Şavurma dürüm'], m:'tray', f:'shawarma' },
  { k:'kebab', e:'🍢', p:5, n:['صحن كباب', 'Kebab plate', 'Kebap tabağı'], m:'tray', f:'kebab' },
  { k:'soup', e:'🍲', p:3, n:['شوربة', 'Soup', 'Çorba'], m:'tray', f:'soup', hot:1 },
  { k:'cake', e:'🍰', p:3, n:['كيكة', 'Cake', 'Pasta'], m:'tray', f:'cake' },
  { k:'sundae', e:'🍨', p:2, n:['بوظة بكاسة', 'Ice cream cup', 'Kup dondurma'], m:'tray', f:'sundae' }
];
export const ITEM_ID = Object.fromEntries(ITEMS.map((x, i) => [x ? x.k : '', i]).filter(x => x[0]));
const ids = s => s.split(' ').map(k => ITEM_ID[k]);
/* what each place sells (water is free everywhere) */
export const MENUS = {
  cola:{ e:'🥤', n:['عربية الكولا', 'Fizzy drinks cart', 'Gazoz arabası'], items:ids('cola grape bubbles water'), snd:'fizz', col:'#e8304f' },
  juice:{ e:'🧃', n:['عربية العصير', 'Fresh juice cart', 'Taze meyve suyu arabası'], items:ids('orange straw lemon water'), snd:'pour', col:'#3fbf6a' },
  coffee:{ e:'☕', n:['كرفان القهوة', 'Coffee caravan', 'Kahve karavanı'], items:ids('cocoa milk coffee water'), snd:'pour', col:'#2fa898' },
  snack:{ e:'🍿', n:['كرفان الأكلات الطيبة', 'Snack van', 'Atıştırmalık arabası'], items:ids('corn cone simit popcorn water'), snd:'pop', col:'#3a8fd8' },
  cafe:{ e:'🍽️', n:['مطعم الحديقة', 'Park Café', 'Park Kafe'], items:ids('pizza burger falafel shawarma kebab soup cake sundae orange lemon cola water'), snd:'sizzle', col:'#c8603e' }
};
export const BITES = it => it.m === 'tray' ? 5 : it.drink ? 3 : 4;

/* ======================================================================
   Little models: the things you hold (and the giant ones on the carts' roofs). Origin = bottom centre, metres.
   ====================================================================== */
function geoms(THREE){
  if(geoms.g) return geoms.g;
  const half = new THREE.CylinderGeometry(1, 1, 1, 16, 1, false, -Math.PI / 2, Math.PI).rotateZ(Math.PI / 2).rotateX(-Math.PI / 2);
  return (geoms.g = { tri:new THREE.CylinderGeometry(1, 1, 1, 3), half, tiny:new THREE.SphereGeometry(1, 7, 5), tor:new THREE.TorusGeometry(1, .18, 6, 16) });
}
function addItem(THREE, G, M, id, s = 1, ox = 0, oy = 0, oz = 0){
  const it = ITEMS[id]; if(!it) return;
  const X = geoms(THREE), SM = s >= 3 ? G.sm : X.tiny;
  const a = (geo, x, y, z, sx, sy, sz, rx, ry, rz, c) => M.add(geo, ox + x * s, oy + y * s, oz + z * s, sx * s, sy * s, sz * s, rx, ry, rz, c);
  const cup = (c, d, fr, k = 1, x = 0, z = 0) => {
    a(G.cyl8, x, .065 * k, z, .042 * k, .13 * k, .042 * k, 0, 0, 0, c);
    if(c === 0xfff6e8) a(G.cyl8, x, .05 * k, z, .043 * k, .085 * k, .043 * k, 0, 0, 0, d);      // a clear cup: the juice shows
    a(G.cyl8, x, .133 * k, z, .046 * k, .014 * k, .046 * k, 0, 0, 0, c === 0xfff6e8 ? 0xffffff : 0xf4f4f4);
    a(G.cyl8, x + .012 * k, .18 * k, z, .007 * k, .09 * k, .007 * k, 0, 0, .25, fr ? 0x3fbf6a : 0xffffff);
    if(fr) a(G.cyl8, x - .04 * k, .13 * k, z + .01 * k, .028 * k, .006 * k, .028 * k, Math.PI / 2, 0, 0, fr);
    else a(G.box, x, .07 * k, z + .043 * k, .05 * k, .03 * k, .004 * k, 0, 0, 0, 0xffffff);
  };
  switch(it.m){
    case 'cup': cup(it.c, it.d, it.fr); break;
    case 'bottle': a(G.cyl8, 0, .075, 0, .032, .15, .032, 0, 0, 0, 0xcdeeff); a(G.cyl8, 0, .08, 0, .033, .045, .033, 0, 0, 0, 0x3a9ad9); a(G.cyl8, 0, .162, 0, .022, .025, .022, 0, 0, 0, 0xbfe6ff); a(G.cyl8, 0, .182, 0, .017, .022, .017, 0, 0, 0, 0x2d78d0); break;
    case 'mug':
      a(G.cyl, 0, .045, 0, .045, .09, .045, 0, 0, 0, it.c); a(G.cyl, 0, .089, 0, .039, .004, .039, 0, 0, 0, it.d);
      a(X.tor, .052, .048, 0, .026, .026, .03, 0, 0, 0, it.c);
      if(it.cream){ a(SM, 0, .095, 0, .03, .016, .03, 0, 0, 0, 0xffffff); a(SM, .01, .108, 0, .012, .012, .012, 0, 0, 0, 0xfff3f0); }
      break;
    case 'cob': a(G.sm, 0, .1, 0, .034, .095, .034, 0, 0, 0, 0xf5c43a); for(let k = 0; k < 3; k++) a(G.cone, Math.cos(k * 2.1) * .02, .035, Math.sin(k * 2.1) * .02, .022, .09, .012, Math.cos(k * 2.1) * .35, 0, Math.sin(k * 2.1) * .35, 0x7aa83a); a(G.cyl8, 0, .01, 0, .008, .04, .008, 0, 0, 0, 0xe8d2a0); break;
    case 'cone': a(G.cone, 0, .05, 0, .036, .1, .036, Math.PI, 0, 0, 0xd9a35a); a(SM, 0, .11, 0, .04, .036, .04, 0, 0, 0, 0xffb8cc); a(SM, 0, .148, 0, .033, .03, .033, 0, 0, 0, 0xfff1cf); a(SM, 0, .182, 0, .011, .011, .011, 0, 0, 0, 0xe8304f); break;
    case 'ring': a(X.tor, 0, .075, 0, .062, .062, .09, 0, 0, 0, 0xc8843a); a(X.tor, 0, .075, .004, .063, .063, .05, 0, 0, 0, 0xd99a50); break;
    case 'bag':
      a(G.box, 0, .055, 0, .085, .11, .055, 0, 0, 0, 0xffffff); for(const x of [-.028, .028]) a(G.box, x, .055, 0, .017, .112, .057, 0, 0, 0, 0xe8304f);
      for(let k = 0; k < 7; k++) a(SM, (k % 4 - 1.5) * .02, .115 + (k > 3 ? .015 : 0), ((k * 7) % 3 - 1) * .012, .017, .015, .017, 0, 0, 0, k % 2 ? 0xfff6d8 : 0xffe9a8);
      break;
    case 'tray': {
      a(G.box, 0, .01, 0, .32, .02, .23, 0, 0, 0, 0xe0762a); a(G.box, 0, .024, -.11, .32, .012, .012, 0, 0, 0, 0xc05a1a);
      a(G.cyl, -.04, .026, 0, .095, .008, .095, 0, 0, 0, 0xffffff);
      const px = -.04, py = .03;
      if(it.f === 'pizza'){ a(X.tri, px, py + .008, 0, .085, .014, .085, 0, .5, 0, 0xf5c04a); for(const [x, z] of [[-.02, -.02], [.02, .01], [-.01, .03]]) a(G.cyl8, px + x, py + .016, z, .013, .003, .013, 0, 0, 0, 0xd8382c); }
      else if(it.f === 'burger'){ a(G.cyl, px, py + .01, 0, .052, .02, .052, 0, 0, 0, 0xd9963a); a(G.cyl, px, py + .03, 0, .054, .018, .054, 0, 0, 0, 0x6a3a1e); a(G.box, px, py + .041, 0, .085, .005, .085, 0, .6, 0, 0xffc23d); a(G.cyl, px, py + .046, 0, .057, .006, .057, 0, 0, 0, 0x5ab83a); a(G.hemi, px, py + .049, 0, .053, .042, .053, 0, 0, 0, 0xe0a046); }
      else if(it.f === 'wrap'){ a(G.cyl8, px, py + .03, 0, .03, .14, .03, 0, 0, Math.PI / 2 - .2, 0xead49a); a(SM, px + .065, py + .045, 0, .022, .022, .022, 0, 0, 0, 0x5ab83a); for(const z of [-.06, .06]) a(SM, px + z * .6, py + .01, .065, .017, .017, .017, 0, 0, 0, 0x8a5a22); }
      else if(it.f === 'shawarma'){ a(G.cyl8, px, py + .065, 0, .03, .13, .03, .25, 0, 0, 0xead49a); a(G.cyl8, px, py + .04, .006, .033, .075, .033, .25, 0, 0, 0xf4f0e6); a(SM, px, py + .13, .03, .026, .02, .026, 0, 0, 0, 0x9a5a2a); }
      else if(it.f === 'kebab'){ for(const z of [-.025, .025]){ a(G.box, px, py + .014, z, .15, .022, .024, 0, 0, 0, 0x8a4a22); a(G.cyl8, px + .085, py + .014, z, .003, .05, .003, 0, 0, Math.PI / 2, 0xd9c09a); } a(G.hemi, px - .02, py, -.065, .035, .025, .03, 0, 0, 0, 0xfffaf0); a(SM, px + .045, py + .01, .065, .016, .016, .016, 0, 0, 0, 0xe8304f); }
      else if(it.f === 'soup'){ a(G.hemi, px, py + .055, 0, .07, .05, .07, Math.PI, 0, 0, 0x6cc4ff); a(G.cyl, px, py + .05, 0, .064, .004, .064, 0, 0, 0, 0xf0a030); a(G.box, px + .07, py + .055, .03, .1, .006, .014, 0, .6, -.3, 0xc8c8d0); }
      else if(it.f === 'cake'){ a(G.box, px, py + .025, 0, .07, .05, .1, 0, .4, 0, 0xffb0c8); a(G.box, px, py + .026, 0, .072, .01, .102, 0, .4, 0, 0xffffff); a(G.box, px, py + .052, 0, .072, .008, .102, 0, .4, 0, 0xffffff); a(SM, px, py + .066, 0, .014, .014, .014, 0, 0, 0, 0xe8304f); }
      else if(it.f === 'sundae'){ a(G.cyl, px, py + .02, 0, .04, .04, .04, 0, 0, 0, 0xcfeeff); a(SM, px - .015, py + .05, 0, .03, .028, .03, 0, 0, 0, 0xffb8cc); a(SM, px + .018, py + .052, .006, .028, .026, .028, 0, 0, 0, 0x8a5a3a); a(SM, px, py + .078, 0, .012, .012, .012, 0, 0, 0, 0xe8304f); }
      cup(0xfff6e8, 0xffa42a, 0, .75, .1, .045);
      break;
    }
  }
}
/* one geometry per held item (cached) */
export function itemGeo(THREE, K, id){
  const c = itemGeo.c || (itemGeo.c = {});
  if(!c[id]){ const M = new K.Merge(); addItem(THREE, K.G, M, id); c[id] = M.empty ? null : M.geometry(); }
  return c[id];
}

/* a friendly vendor (an adult, facing +z): apron, a hat, a big smile */
function vendorGeo(THREE, K, o){
  const { G, Merge } = K, M = new Merge(), SK = o.skin || 0xe8b48a, X = geoms(THREE);
  for(const s of [-1, 1]){ M.add(G.cyl8, s * .1, .42, 0, .075, .84, .075, 0, 0, 0, 0x34384a); M.add(G.box, s * .1, .04, .04, .12, .08, .2, 0, 0, 0, 0x2a2a2e); }
  M.add(G.box, 0, 1.1, 0, .44, .58, .26, 0, 0, 0, o.shirt);
  M.add(G.box, 0, 1.02, .135, .34, .56, .02, 0, 0, 0, o.apron || 0xffffff);
  M.add(G.box, 0, 1.24, .147, .08, .07, .01, 0, 0, 0, o.shirt);
  for(const s of [-1, 1]){ M.add(G.cyl8, s * .27, 1.1, .05, .06, .5, .06, -.35, 0, s * .12, o.shirt); M.add(X.tiny, s * .3, .86, .14, .055, .055, .055, 0, 0, 0, SK); }
  M.add(G.cyl8, 0, 1.43, 0, .06, .1, .06, 0, 0, 0, SK);
  M.add(G.sm, 0, 1.6, 0, .17, .19, .17, 0, 0, 0, SK);
  for(const s of [-1, 1]){ M.add(X.tiny, s * .06, 1.63, .155, .022, .028, .012, 0, 0, 0, 0x1a1a1a); M.add(X.tiny, s * .1, 1.56, .135, .03, .02, .01, 0, 0, 0, 0xff9a9a); M.add(X.tiny, s * .17, 1.6, 0, .03, .04, .03, 0, 0, 0, SK); }
  M.add(G.box, 0, 1.535, .158, .07, .018, .01, 0, 0, 0, 0xa83a3a);
  if(o.mustache) M.add(G.box, 0, 1.575, .165, .1, .022, .02, 0, 0, 0, o.hair);
  if(o.hat === 'chef'){ M.add(G.cyl, 0, 1.79, 0, .15, .14, .15, 0, 0, 0, 0xffffff); M.add(G.sm, 0, 1.9, 0, .19, .1, .19, 0, 0, 0, 0xffffff); }
  else if(o.hat === 'cap'){ M.add(G.hemi, 0, 1.68, 0, .175, .14, .175, 0, 0, 0, o.capc); M.add(G.box, 0, 1.69, .17, .2, .02, .14, 0, 0, 0, o.capc); }
  else if(o.hat === 'scarf'){ M.add(G.hemi, 0, 1.62, -.01, .185, .2, .19, 0, 0, 0, o.capc); M.add(G.box, 0, 1.52, -.12, .3, .2, .05, .2, 0, 0, o.capc); }
  else { M.add(G.hemi, 0, 1.66, -.01, .18, .16, .18, 0, 0, 0, o.hair); }
  return M.geometry();
}

/* ======================================================================
   The board painter (one atlas canvas for every board and sign)
   ====================================================================== */
const AW = 1024, AH = 1536;
const RECT = { cola:[0, 0, 512, 256], juice:[512, 0, 512, 256], coffee:[0, 256, 512, 256], snack:[512, 256, 512, 256], cafe:[0, 512, 1024, 384], sign:[0, 896, 1024, 128], kitchen:[0, 1024, 512, 256], chalk:[512, 1024, 512, 256] };
function paintAtlas(THREE){
  const cv = document.createElement('canvas'); cv.width = AW; cv.height = AH;
  const x = cv.getContext('2d');
  const font = (px, w = 800) => `${w} ${px}px "Baloo Bhaijaan 2","Tajawal",system-ui,sans-serif`;
  const emo = px => `${px}px "Noto Color Emoji","Apple Color Emoji","Segoe UI Emoji",sans-serif`;
  const rr = (X, Y, W, H, r) => { x.beginPath(); if(x.roundRect) x.roundRect(X, Y, W, H, r); else x.rect(X, Y, W, H); };
  const coin = (cx, cy, r) => { x.fillStyle = '#c98a12'; x.beginPath(); x.arc(cx, cy + 2, r, 0, 7); x.fill(); x.fillStyle = '#ffd23f'; x.beginPath(); x.arc(cx, cy, r, 0, 7); x.fill(); x.fillStyle = '#fff3b0'; x.font = font(r * 1.2); x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('★', cx, cy + 1); };
  /* a board: coloured frame, chalk-dark inside, the icons in a grid, each with its price in coins */
  function board(key, list, frame, cols){
    const [X, Y, W, H] = RECT[key];
    x.save(); x.fillStyle = frame; x.fillRect(X, Y, W, H);
    rr(X + 12, Y + 12, W - 24, H - 24, 22); x.fillStyle = '#2f3a36'; x.fill();
    x.strokeStyle = 'rgba(255,255,255,.25)'; x.lineWidth = 3; rr(X + 22, Y + 22, W - 44, H - 44, 16); x.stroke();
    const n = list.length, rows = Math.ceil(n / cols), cw = (W - 40) / cols, ch = (H - 40) / rows;
    list.forEach((id, i) => {
      const it = ITEMS[id], cx = X + 20 + cw * (i % cols) + cw / 2, cy = Y + 20 + ch * Math.floor(i / cols);
      const es = Math.min(cw, ch) * .5;
      x.textAlign = 'center'; x.textBaseline = 'middle'; x.font = emo(es); x.fillStyle = '#fff'; x.fillText(it.e, cx, cy + ch * .38);
      const py = cy + ch * .8, cs = Math.min(cw, ch) * .1;
      if(it.adult){ x.font = emo(cs * 2.2); x.fillText('🧑', cx, py); return; }
      coin(cx - cs * 1.3, py, cs); x.font = font(cs * 2.6); x.fillStyle = '#ffffff'; x.textAlign = 'left'; x.fillText(String(it.p), cx - cs * .1, py + 2);
    });
    x.restore();
  }
  board('cola', MENUS.cola.items, '#e8304f', 4);
  board('juice', MENUS.juice.items, '#3fbf6a', 4);
  board('coffee', MENUS.coffee.items, '#2fa898', 4);
  board('snack', MENUS.snack.items, '#3a8fd8', 5);
  board('cafe', MENUS.cafe.items, '#8a5634', 6);
  // the café sign: its name in the kid's language between two icons
  { const [X, Y, W, H] = RECT.sign; x.fillStyle = '#fff3dc'; x.fillRect(X, Y, W, H); x.fillStyle = '#c8603e'; x.fillRect(X, Y, W, 10); x.fillRect(X, Y + H - 10, W, 10);
    x.textAlign = 'center'; x.textBaseline = 'middle'; x.font = emo(70); x.fillText('🍕', X + 80, Y + H / 2 + 4); x.fillText('☕', X + W - 80, Y + H / 2 + 4);
    const name = window.L ? L(...MENUS.cafe.n) : MENUS.cafe.n[1]; x.direction = /[؀-ۿ]/.test(name) ? 'rtl' : 'ltr';
    x.fillStyle = '#8a3a1e'; x.font = font(78); x.fillText(name, X + W / 2, Y + H / 2 + 6); x.direction = 'ltr'; }
  // the kitchen through the pass-through window: tiles, a stove with pots, pans on hooks, shelves
  { const [X, Y, W, H] = RECT.kitchen;
    x.fillStyle = '#dff1f2'; x.fillRect(X, Y, W, H); x.strokeStyle = 'rgba(90,140,150,.35)'; x.lineWidth = 2; for(let i = 0; i <= W; i += 32){ x.beginPath(); x.moveTo(X + i, Y); x.lineTo(X + i, Y + H); x.stroke(); } for(let j = 0; j <= H; j += 32){ x.beginPath(); x.moveTo(X, Y + j); x.lineTo(X + W, Y + j); x.stroke(); }
    x.fillStyle = '#8a5634'; x.fillRect(X + 20, Y + 60, 180, 10); x.fillRect(X + 310, Y + 60, 180, 10);
    for(const [i, c] of [['#e8304f', 0], ['#ffc23d', 1], ['#3fbf6a', 2], ['#6cc4ff', 3]].entries()){ x.fillStyle = c[0]; rr(X + 34 + i * 40, Y + 22, 28, 38, 6); x.fill(); }
    for(let i = 0; i < 3; i++){ x.fillStyle = '#6a6f78'; x.beginPath(); x.arc(X + 350 + i * 52, Y + 40, 20, 0, 7); x.fill(); x.fillRect(X + 348 + i * 52, Y + 8, 4, 14); }
    x.fillStyle = '#4a4f58'; x.fillRect(X + 90, Y + 150, 330, 106); x.fillStyle = '#2a2d33'; x.fillRect(X + 90, Y + 140, 330, 16);
    for(const [cx, c] of [[170, '#9aa0a8'], [340, '#c8603e']]){ x.fillStyle = c; rr(X + cx - 55, Y + 92, 110, 52, 10); x.fill(); x.fillStyle = 'rgba(255,255,255,.65)'; x.lineWidth = 6; x.strokeStyle = 'rgba(255,255,255,.7)'; for(let k = 0; k < 3; k++){ x.beginPath(); x.moveTo(X + cx - 25 + k * 25, Y + 86); x.bezierCurveTo(X + cx - 40 + k * 25, Y + 70, X + cx - 10 + k * 25, Y + 58, X + cx - 25 + k * 25, Y + 40); x.stroke(); } }
    x.fillStyle = '#ffb43d'; for(let k = 0; k < 4; k++){ x.beginPath(); x.arc(X + 140 + k * 70, Y + 200, 14, 0, 7); x.fill(); } }
  // the chalkboard by the door: food icons and a big smile
  { const [X, Y, W, H] = RECT.chalk; x.fillStyle = '#8a5634'; x.fillRect(X, Y, W, H); x.fillStyle = '#2f3a36'; x.fillRect(X + 14, Y + 14, W - 28, H - 28);
    x.textAlign = 'center'; x.textBaseline = 'middle'; x.font = emo(64); ['🍕', '🍔', '🌯', '🍰'].forEach((e, i) => x.fillText(e, X + 76 + i * 120, Y + 80)); x.font = emo(84); x.fillText('😋', X + W / 2, Y + 180);
    x.strokeStyle = 'rgba(255,255,255,.6)'; x.lineWidth = 4; for(const s of [-1, 1]){ x.beginPath(); x.arc(X + W / 2 + s * 120, Y + 180, 22, 0, 7); x.stroke(); } }
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}

/* ======================================================================
   The builder
   o = { root, circles, blocks, carts:[{ k, x, z, yaw }], cafe:{ x0, z0, x1, z1, door } }
   ====================================================================== */
export function makeFood(THREE, K, o){
  const { G, Merge } = K;
  const lam = p => new THREE.MeshLambertMaterial(p);
  const vc = lam({ vertexColors:true });
  const parts = [], aparts = [];
  const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _v = new THREE.Vector3(), _s = new THREE.Vector3(1, 1, 1), _e = new THREE.Euler();
  const place = (g, x, z, yaw) => { g.applyMatrix4(_m.compose(_v.set(x, 0, z), _q.setFromEuler(_e.set(0, yaw, 0)), _s)); return g; };
  const W = (x, z, yaw, lx, lz) => [x + lx * Math.cos(yaw) + lz * Math.sin(yaw), z - lx * Math.sin(yaw) + lz * Math.cos(yaw)];
  /* atlas quads: corners a (bottom-left), b (bottom-right), c (top-right), d (top-left) seen from the front */
  class AQ{
    constructor(){ this.p = []; this.n = []; this.u = []; }
    quad(a, b, c, d, key){
      const [X, Y, Wd, H] = RECT[key], u0 = X / AW, u1 = (X + Wd) / AW, v1 = 1 - Y / AH, v0 = 1 - (Y + H) / AH;
      const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = d[0] - a[0], vy = d[1] - a[1], vz = d[2] - a[2];
      let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx; const l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l;
      for(const [p, uv] of [[a, [u0, v0]], [b, [u1, v0]], [c, [u1, v1]], [a, [u0, v0]], [c, [u1, v1]], [d, [u0, v1]]]){ this.p.push(...p); this.n.push(nx, ny, nz); this.u.push(...uv); }
    }
    /* a board facing +z in the x/y plane at depth z */
    front(cx, cy, z, w, h, key){ this.quad([cx - w / 2, cy - h / 2, z], [cx + w / 2, cy - h / 2, z], [cx + w / 2, cy + h / 2, z], [cx - w / 2, cy + h / 2, z], key); }
    /* the same, facing -z */
    back(cx, cy, z, w, h, key){ this.quad([cx + w / 2, cy - h / 2, z], [cx - w / 2, cy - h / 2, z], [cx - w / 2, cy + h / 2, z], [cx + w / 2, cy + h / 2, z], key); }
    geometry(){ const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(this.n, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(this.u, 2)); return g; }
  }
  /* a striped awning: n stripes across w, from (z0, y0) sloping out by len at angle */
  function awning(M, w, n, y0, z0, len, ang, c1, c2){
    const sw = w / n, cz = z0 + Math.cos(ang) * len / 2, cy = y0 - Math.sin(ang) * len / 2;
    for(let k = 0; k < n; k++) M.add(G.box, -w / 2 + sw * (k + .5), cy, cz, sw + .002, .035, len, ang, 0, 0, k % 2 ? c2 : c1);
    const fz = z0 + Math.cos(ang) * len, fy = y0 - Math.sin(ang) * len;
    M.add(G.box, 0, fy - .06, fz, w, .12, .025, 0, 0, 0, c1);
    for(let k = 0; k < n; k++) M.add(G.cone, -w / 2 + sw * (k + .5), fy - .15, fz, sw * .42, .12, .03, Math.PI, 0, 0, k % 2 ? c1 : c2);
  }
  const wheel = (M, x, y, z, r, axisX) => {
    M.add(geoms(THREE).tor, x, y, z, r, r, r * 1.6, 0, axisX ? Math.PI / 2 : 0, 0, 0x26282d);
    M.add(G.cyl8, x, y, z, r * .35, .08, r * .35, axisX ? 0 : Math.PI / 2, 0, axisX ? Math.PI / 2 : 0, 0xd8d8de);
    for(let k = 0; k < 3; k++) M.add(G.cyl8, x, y, z, .012, r * 1.8, .012, axisX ? k * Math.PI / 3 : 0, 0, axisX ? 0 : k * Math.PI / 3, 0xc8c8d0);
  };
  const vendors = [], steam = [], carts = [], STEAM = [];
  const V = {
    cola:{ shirt:0xe8304f, hat:'cap', capc:0xffffff, hair:0x3a2a20, mustache:1 },
    juice:{ shirt:0x3fbf6a, hat:'scarf', capc:0xffc23d, hair:0x2a1a14, skin:0xc98a62 },
    coffee:{ shirt:0x2fa898, hat:'none', hair:0x6a4a3a, skin:0xf1c6a3, mustache:1 },
    snack:{ shirt:0x3a8fd8, hat:'cap', capc:0xffc23d, hair:0x1a1a1a, skin:0xb07a52 },
    cafe:{ shirt:0xc8603e, hat:'chef', hair:0x2a1a14, skin:0xe0a47a }
  };

  /* ---------- a pushcart with two big wheels (fizzy drinks, juice) ---------- */
  function pushcart(c){
    const M = new Merge(), A = new AQ(), body = c.k === 'cola' ? 0xe8304f : 0xff9a2a, trim = c.k === 'cola' ? 0xffffff : 0xffd23f, aw = c.k === 'cola' ? [0xe8304f, 0xffffff] : [0x3fbf6a, 0xffffff];
    M.add(G.box, 0, .8, 0, 2.0, .9, 1.0, 0, 0, 0, body);
    for(const y of [.4, 1.2]) M.add(G.box, 0, y, 0, 2.04, .1, 1.04, 0, 0, 0, trim);
    M.add(G.box, 0, 1.285, 0, 2.3, .07, 1.2, 0, 0, 0, 0xf4efe6);
    for(const s of [-1, 1]) wheel(M, s * 1.07, .38, 0, .34, true);
    M.add(G.cyl8, 0, .17, .3, .04, .34, .04, 0, 0, 0, 0x5a5e66);
    M.add(G.box, 0, 1.05, -.82, 1.5, .05, .05, 0, 0, 0, 0x5a5e66); for(const s of [-1, 1]) M.add(G.box, s * .72, 1.05, -.64, .05, .05, .38, 0, 0, 0, 0x5a5e66);
    for(const sx of [-1, 1]) for(const sz of [-1, 1]) M.add(G.cyl8, sx * .98, 1.95, sz * .5, .03, 1.32, .03, 0, 0, 0, trim);
    awning(M, 2.3, 8, 2.64, -.66, 1.5, .16, aw[0], aw[1]);
    if(c.k === 'cola'){
      M.add(G.box, .62, 1.47, -.15, .55, .3, .42, 0, 0, 0, 0x8fd3f0); M.add(G.box, .62, 1.635, -.15, .58, .04, .45, 0, 0, 0, 0xffffff);
      for(let k = 0; k < 3; k++) addItem(THREE, G, M, [2, 3, 4][k], 1.6, -.75 + k * .3, 1.32, .25);
      for(let k = 0; k < 4; k++) M.add(G.cyl8, -.1 + (k % 2) * .12, 1.36 + (k > 1 ? .12 : 0), -.25, .045, .11, .045, 0, 0, 0, 0xffffff);
      addItem(THREE, G, M, 2, 5, 0, 2.66, .02);
    } else {
      for(let k = 0; k < 3; k++){ M.add(G.cyl, -.6 + k * .32, 1.46, -.15, .1, .28, .1, 0, 0, 0, [0xffa42a, 0xff5f7e, 0xfff07a][k]); M.add(G.cyl, -.6 + k * .32, 1.61, -.15, .105, .03, .105, 0, 0, 0, 0xffffff); }
      M.add(G.cyl, .55, 1.37, .1, .26, .1, .2, 0, 0, 0, 0xb07a3a);
      for(let k = 0; k < 8; k++) M.add(geoms(THREE).tiny, .4 + (k % 4) * .1, 1.45 + (k > 3 ? .06 : 0), .02 + ((k * 3) % 4) * .05, .055, .055, .055, 0, 0, 0, k % 3 === 2 ? 0xf5d81f : 0xff8a1a);
      M.add(G.sm, 0, 3.05, .02, .38, .36, .38, 0, 0, 0, 0xff9a1a); M.add(G.cyl8, 0, 3.43, .02, .03, .1, .03, 0, 0, 0, 0x5a3a20); M.add(geoms(THREE).tiny, .12, 3.44, .02, .14, .04, .07, 0, 0, .3, 0x3fbf6a);
      for(let k = 0; k < 10; k++){ const a = k / 10 * Math.PI * 2; M.add(geoms(THREE).tiny, Math.cos(a) * .3, 3.05 + Math.sin(a * 2) * .05, .02 + Math.sin(a) * .3, .02, .02, .02, 0, 0, 0, 0xffb84a); }
    }
    A.front(0, .8, .52, 1.4, .7, c.k);
    return { M, A, vendor:[0, 0, -1.2], depth:1.0, w:2.3 };
  }
  /* ---------- a caravan / van with a serving hatch on its long side (coffee, snacks) ---------- */
  function hatchBody(M, A, w, body, body2, key, roofRound){
    M.add(G.box, 0, .44, 0, w + .1, .1, 1.9, 0, 0, 0, 0x3a3d42);
    M.add(G.box, 0, .9, 0, w, .8, 1.8, 0, 0, 0, body);
    M.add(G.box, 0, .58, .905, w, .14, .01, 0, 0, 0, body2);
    M.add(G.box, 0, 1.775, -.5, w, .95, .8, 0, 0, 0, body);
    for(const s of [-1, 1]) M.add(G.box, s * (w / 2 - .175), 1.775, .4, .35, .95, 1.0, 0, 0, 0, body);
    M.add(G.box, 0, 2.1, .4, w, .3, 1.0, 0, 0, 0, body);
    M.add(G.box, 0, 2.0, .905, w, .06, .02, 0, 0, 0, body2);
    M.add(G.box, 0, 1.32, .1, w - .7, .02, .8, 0, 0, 0, 0xd9c8a8);                         // inside floor of the hatch
    M.add(G.box, 0, 1.33, 1.06, w - .2, .06, .36, 0, 0, 0, 0xc89a62);                        // the serving shelf
    if(roofRound) M.add(geoms(THREE).half, 0, 2.25, 0, w + .04, .45, .93, 0, 0, 0, body2);
    else { M.add(G.box, 0, 2.3, 0, w + .1, .1, 1.9, 0, 0, 0, body2); }
    awning(M, w - .1, 10, 2.18, .92, .75, .4, ...(key === 'coffee' ? [0x8a5634, 0xfff3dc] : [0x3a8fd8, 0xffffff]));
    A.front(0, .92, .91, 1.3, .65, key);
  }
  function caravan(c){
    const M = new Merge(), A = new AQ(), w = 3.2;
    hatchBody(M, A, w, 0x7fd1c0, 0xfff3dc, 'coffee', true);
    wheel(M, 0, .33, .96, .3, false); wheel(M, 0, .33, -.96, .3, false);
    M.add(G.box, 0, .66, .94, 1.0, .08, .08, 0, 0, 0, 0x5fb0a0);
    M.add(G.box, w / 2 + .4, .5, 0, .8, .07, .07, 0, 0, 0, 0x3a3d42); M.add(G.cyl8, w / 2 + .72, .25, 0, .03, .45, .03, 0, 0, 0, 0x3a3d42); M.add(G.torus, w / 2 + .72, .08, 0, .07, .07, .1, 0, Math.PI / 2, 0, 0x26282d);
    for(const s of [-1, 1]) M.add(G.cyl, s * (w / 2 + .01), 1.75, -.45, .22, .02, .22, 0, 0, Math.PI / 2, 0xbfe6ff);
    // the coffee machine, cups and jars in the hatch
    M.add(G.box, .75, 1.58, -.05, .55, .5, .4, 0, 0, 0, 0xc8c8d0); M.add(G.box, .75, 1.86, -.05, .57, .06, .42, 0, 0, 0, 0x5a5e66);
    for(const s of [-1, 1]){ M.add(G.cyl8, .75 + s * .13, 1.42, .16, .02, .06, .02, 0, 0, 0, 0x3a3d42); }
    M.add(geoms(THREE).tiny, .75, 1.65, .16, .05, .05, .02, 0, 0, 0, 0x3fbf6a);
    for(let k = 0; k < 4; k++) addItem(THREE, G, M, [9, 10, 9, 10][k], 1.1, -1.1 + k * .25, 1.36, 1.0);
    M.add(G.cyl, -.35, 1.45, .05, .1, .22, .1, 0, 0, 0, 0xfff3dc); M.add(G.cyl, -.35, 1.57, .05, .105, .03, .105, 0, 0, 0, 0x8a5634);
    addItem(THREE, G, M, 8, 4.2, 0, 2.68, 0);
    steam.push({ lx:.75, ly:1.95, lz:.1, r:1.2 }, { lx:0, ly:3.15, lz:0, r:.7, big:1 });
    return { M, A, vendor:[-.25, .12, .12], depth:1.9, w };
  }
  function van(c){
    const M = new Merge(), A = new AQ(), w = 3.0;
    hatchBody(M, A, w, 0xffc23d, 0xffffff, 'snack', false);
    M.add(G.box, 0, .74, .906, w, .1, .01, 0, 0, 0, 0x3a8fd8);
    // the cab at +x
    M.add(G.box, w / 2 + .45, 1.0, 0, .9, 1.1, 1.8, 0, 0, 0, 0xffc23d); M.add(G.box, w / 2 + .35, 1.85, 0, .7, .6, 1.76, 0, 0, 0, 0xffc23d);
    M.add(G.box, w / 2 + .71, 1.85, 0, .02, .48, 1.5, 0, 0, -.25, 0x2a3a4a); for(const s of [-1, 1]) M.add(G.box, w / 2 + .38, 1.85, s * .885, .5, .4, .02, 0, 0, 0, 0x2a3a4a);
    M.add(G.box, w / 2 + .91, .62, 0, .04, .2, 1.6, 0, 0, 0, 0xd8d8de); for(const s of [-1, 1]) M.add(G.sm, w / 2 + .91, .85, s * .65, .03, .07, .1, 0, 0, 0, 0xfff3b0);
    for(const x of [-.9, w / 2 + .4]) for(const s of [-1, 1]) wheel(M, x, .34, s * .92, .32, false);
    // popcorn machine, corn pot, ice cream freezer
    M.add(G.box, .7, 1.62, -.05, .5, .55, .45, 0, 0, 0, 0xe8304f); M.add(G.box, .7, 1.64, .19, .42, .42, .02, 0, 0, 0, 0xfff3d0);
    for(let k = 0; k < 10; k++) M.add(geoms(THREE).tiny, .55 + (k % 5) * .07, 1.47 + Math.floor(k / 5) * .05, .1, .03, .03, .03, 0, 0, 0, 0xfff6d8);
    M.add(G.cyl, -.2, 1.48, 0, .2, .3, .2, 0, 0, 0, 0x9aa0a8); for(let k = 0; k < 3; k++) addItem(THREE, G, M, 11, 1.3, -.28 + k * .08, 1.5, -.02 + (k % 2) * .06);
    M.add(G.box, -.95, 1.5, 0, .5, .32, .45, 0, 0, 0, 0xffffff); M.add(G.box, -.95, 1.67, 0, .52, .03, .47, 0, 0, 0, 0x8fd3f0);
    for(let k = 0; k < 3; k++) addItem(THREE, G, M, [12, 13, 14][k], 1.2, -1.0 + k * .35, 1.36, 1.0);
    addItem(THREE, G, M, 11, 4.5, -.5, 2.35, 0); addItem(THREE, G, M, 12, 4.5, .5, 2.35, 0);
    steam.push({ lx:-.2, ly:1.7, lz:0, r:.8 });
    return { M, A, vendor:[-.3, .12, .12], depth:1.9, w:w + 1.0, off:.45 };
  }

  /* ---------- the carts ---------- */
  for(const c of o.carts){
    const b = c.k === 'coffee' ? caravan(c) : c.k === 'snack' ? van(c) : pushcart(c);
    parts.push(place(b.M.geometry(), c.x, c.z, c.yaw)); aparts.push(place(b.A.geometry(), c.x, c.z, c.yaw));
    // blockers along the cart
    const n = Math.max(2, Math.round(b.w / 1.1)), r = b.depth / 2 + .08;
    for(let k = 0; k < n; k++){ const lx = (b.off || 0) - b.w / 2 + r * .8 + (b.w - r * 1.6) * (n > 1 ? k / (n - 1) : .5), p = W(c.x, c.z, c.yaw, lx, 0); o.circles.push({ x:p[0], z:p[1], r, top:2.6, food:1 }); }
    const vp = W(c.x, c.z, c.yaw, b.vendor[0], b.vendor[2]);
    const vm = new THREE.Mesh(vendorGeo(THREE, K, V[c.k]), vc); vm.position.set(vp[0], b.vendor[1], vp[1]); vm.rotation.y = c.yaw; vm.castShadow = true; o.root.add(vm);
    vendors.push({ m:vm, k:c.k, x:vp[0], y:b.vendor[1], z:vp[1], yaw:c.yaw, hop:0, top:b.vendor[1] + 2.05 });
    const up = W(c.x, c.z, c.yaw, 0, b.depth / 2 + .95);
    carts.push({ k:c.k, x:c.x, z:c.z, yaw:c.yaw, ux:up[0], uz:up[1], v:vendors.length - 1 });
    for(const s of steam.splice(0)){ const p = W(c.x, c.z, c.yaw, s.lx, s.lz); STEAM.push({ x:p[0], y:s.ly, z:p[1], r:s.r, big:s.big }); }
  }

  /* ---------- «مطعم الحديقة»: the café (axis-aligned box; door in the north wall) ---------- */
  const cafe = (() => {
    const q = o.cafe, x0 = q.x0, x1 = q.x1, z0 = q.z0, z1 = q.z1, H = 3.1, T = .2, dx = q.door, DW = 2.0;
    const M = new Merge(), A = new AQ(), R = new Merge(), GL = new Merge();
    const WALL = 0xf6e6c8, BASE = 0xc8603e, FRAME = 0xffffff, IN = 0xfff4e2;
    const u = v => x0 + v, w = v => z0 + v;
    const wallX = (xa, xb, z, ya, yb, col = WALL) => M.add(G.box, (xa + xb) / 2, (ya + yb) / 2, z, xb - xa, yb - ya, T, 0, 0, 0, col);
    const wallZ = (za, zb, x, ya, yb, col = WALL) => M.add(G.box, x, (ya + yb) / 2, (za + zb) / 2, T, yb - ya, zb - za, 0, 0, 0, col);
    /* a wall along x at z with openings [[a, b, y0, y1, glass]] (x in world) */
    function wallAlongX(z, openings){
      let cur = x0 - T / 2; const end = x1 + T / 2;
      for(const [a, b, y0, y1, glass] of openings.sort((p, q) => p[0] - q[0])){
        if(a > cur) wallX(cur, a, z, 0, H);
        if(y0 > 0) wallX(a, b, z, 0, y0); if(y1 < H) wallX(a, b, z, y1, H);
        if(glass){ GL.add(G.box, (a + b) / 2, (y0 + y1) / 2, z, b - a, y1 - y0, .04, 0, 0, 0, 0xbfe6ff); for(const xx of [a, b]) M.add(G.box, xx, (y0 + y1) / 2, z, .08, y1 - y0, T + .04, 0, 0, 0, FRAME); M.add(G.box, (a + b) / 2, y0, z, b - a + .08, .08, T + .08, 0, 0, 0, FRAME); M.add(G.box, (a + b) / 2, y1, z, b - a + .08, .08, T + .04, 0, 0, 0, FRAME); if(b - a > 2.4){ const n = Math.round((b - a) / 1.6); for(let k = 1; k < n; k++) M.add(G.box, a + (b - a) * k / n, (y0 + y1) / 2, z, .06, y1 - y0, T + .02, 0, 0, 0, FRAME); } }
        cur = b;
      }
      if(cur < end) wallX(cur, end, z, 0, H);
    }
    function wallAlongZ(x, openings){
      let cur = z0;
      for(const [a, b, y0, y1, glass] of openings){
        if(a > cur) wallZ(cur, a, x, 0, H);
        wallZ(a, b, x, 0, y0); wallZ(a, b, x, y1, H);
        if(glass){ GL.add(G.box, x, (y0 + y1) / 2, (a + b) / 2, .04, y1 - y0, b - a, 0, 0, 0, 0xbfe6ff); for(const zz of [a, b]) M.add(G.box, x, (y0 + y1) / 2, zz, T + .04, y1 - y0, .08, 0, 0, 0, FRAME); M.add(G.box, x, y0, (a + b) / 2, T + .08, .08, b - a, 0, 0, 0, FRAME); M.add(G.box, x, y1, (a + b) / 2, T + .04, .08, b - a, 0, 0, 0, FRAME); const n = Math.round((b - a) / 1.6); for(let k = 1; k < n; k++) M.add(G.box, x, (y0 + y1) / 2, a + (b - a) * k / n, T + .02, y1 - y0, .06, 0, 0, 0, FRAME); }
        cur = b;
      }
      if(cur < z1) wallZ(cur, z1, x, 0, H);
    }
    const dA = dx - DW / 2, dB = dx + DW / 2;
    wallAlongX(z0, [[x0 + .5, dA - .5, 1.0, 2.25, 1], [dA, dB, 0, 2.45, 0], [dB + .5, x1 - .5, 1.0, 2.25, 1]]);
    wallAlongX(z1, [[u(5.0), u(6.7), 1.05, 1.95, 0]]);
    wallAlongZ(x1, [[w(1.0), z1 - 1.0, 1.0, 2.25, 1]]);
    wallAlongZ(x0, [[w(1.2), w(3.2), 1.0, 2.25, 1]]);
    // a terracotta base band and a cream cornice outside; corners
    for(const [a, b, z] of [[x0, dA, z0 - T / 2 - .015], [dB, x1, z0 - T / 2 - .015]]) M.add(G.box, (a + b) / 2, .25, z, b - a, .5, .03, 0, 0, 0, BASE);
    M.add(G.box, (x0 + x1) / 2, .25, z1 + T / 2 + .015, x1 - x0, .5, .03, 0, 0, 0, BASE);
    for(const x of [x0 - T / 2 - .015, x1 + T / 2 + .015]) M.add(G.box, x, .25, (z0 + z1) / 2, .03, .5, z1 - z0, 0, 0, 0, BASE);
    // inside: warm paint lower band
    for(const [a, b] of [[x0, dA], [dB, x1]]) M.add(G.box, (a + b) / 2, .45, z0 + T / 2 + .012, b - a, .9, .02, 0, 0, 0, 0xe8a070);
    M.add(G.box, (x0 + x1) / 2, .45, z1 - T / 2 - .012, x1 - x0, .9, .02, 0, 0, 0, 0xe8a070);
    for(const [x, s] of [[x0 + T / 2 + .012, 1], [x1 - T / 2 - .012, -1]]) M.add(G.box, x, .45, (z0 + z1) / 2, .02, .9, z1 - z0, 0, 0, 0, 0xe8a070);
    // the roof (lifted off while you are inside): slab, parapet, a chimney
    R.add(G.box, (x0 + x1) / 2, H + .1, (z0 + z1) / 2, x1 - x0 + .5, .2, z1 - z0 + .5, 0, 0, 0, 0xb5543a);
    for(const s of [-1, 1]){ R.add(G.box, (x0 + x1) / 2, H + .32, (s < 0 ? z0 : z1) + s * .22, x1 - x0 + .5, .26, .1, 0, 0, 0, 0xe9dcc8); R.add(G.box, (s < 0 ? x0 : x1) + s * .22, H + .32, (z0 + z1) / 2, .1, .26, z1 - z0 + .5, 0, 0, 0, 0xe9dcc8); }
    const chim = { x:u(5.9), z:z1 - .6 }; R.add(G.box, chim.x, H + .7, chim.z, .5, 1.0, .5, 0, 0, 0, 0x9a8a80); R.add(G.box, chim.x, H + 1.22, chim.z, .6, .08, .6, 0, 0, 0, 0x6a5e58);
    STEAM.push({ x:chim.x, y:H + 1.35, z:chim.z, r:1.4, big:1, roof:1 });
    // floor: checker tiles
    { const nx = Math.round(x1 - x0), nz = Math.round(z1 - z0), tw = (x1 - x0) / nx, td = (z1 - z0) / nz; for(let i = 0; i < nx; i++) for(let j = 0; j < nz; j++) M.add(G.box, x0 + (i + .5) * tw, .012, z0 + (j + .5) * td, tw, .024, td, 0, 0, 0, (i + j) % 2 ? 0xf3e3c8 : 0xd98a5a); }
    M.add(G.box, dx, .03, z0 - .6, 1.6, .04, .9, 0, 0, 0, 0xb5543a);                      // the welcome mat
    // a striped canopy over the door, two lanterns, flower pots and the chalkboard by the door
    { const Mx = new Merge(); awning(Mx, DW + .9, 7, 2.56, 0, .8, .3, 0xc8603e, 0xfff3dc); const g = Mx.geometry(); g.applyMatrix4(_m.compose(_v.set(dx, 0, z0 - T / 2), _q.setFromEuler(_e.set(0, Math.PI, 0)), _s)); parts.push(g); }
    for(const s of [-1, 1]){ M.add(G.box, dx + s * (DW / 2 + .3), 2.15, z0 - .18, .14, .22, .14, 0, 0, 0, 0x3a3d42); }
    for(const x of [dA - .55, dB + .55]){ M.add(G.cyl, x, .25, z0 - .45, .25, .5, .25, 0, 0, 0, 0xc8603e); M.add(G.ico1, x, .7, z0 - .45, .32, .32, .32, 0, 0, 0, 0x3f8a3a); for(let k = 0; k < 4; k++) M.add(geoms(THREE).tiny, x + Math.cos(k * 1.6) * .25, .82 + (k % 2) * .1, z0 - .45 + Math.sin(k * 1.6) * .25, .06, .06, .06, 0, 0, 0, [0xff8fb1, 0xffd23f, 0xffffff, 0xff6f6f][k]); o.circles.push({ x, z:z0 - .45, r:.32, top:1, food:1 }); }
    { const cx = dA - 1.4, cz = z0 - 1.0; for(const s of [-1, 1]) M.add(G.box, cx, .5, cz + s * .16, .9, 1.0, .04, -s * .17, 0, 0, 0x8a5634); A.quad([cx + .37, .18, cz - .275], [cx - .37, .18, cz - .275], [cx - .37, .92, cz - .15], [cx + .37, .92, cz - .15], 'chalk'); o.circles.push({ x:cx, z:cz, r:.45, top:1.1, food:1 }); }
    // the sign over the door (outside, facing the path)
    M.add(G.box, dx, 2.83, z0 - T / 2 - .05, 4.2, .5, .06, 0, 0, 0, 0x8a3a1e);
    A.quad([dx + 1.6, 2.63, z0 - T / 2 - .085], [dx - 1.6, 2.63, z0 - T / 2 - .085], [dx - 1.6, 3.03, z0 - T / 2 - .085], [dx + 1.6, 3.03, z0 - T / 2 - .085], 'sign');
    // the counter, a till, a cake display; the menu board behind it and the kitchen window with a pass shelf
    const cx0 = u(.45), cx1 = u(4.4), cz0 = w(4.85), cz1 = w(5.55);
    M.add(G.box, (cx0 + cx1) / 2, .52, (cz0 + cz1) / 2, cx1 - cx0, 1.04, cz1 - cz0, 0, 0, 0, 0x8a5634);
    M.add(G.box, (cx0 + cx1) / 2, 1.07, (cz0 + cz1) / 2 - .04, cx1 - cx0 + .1, .06, cz1 - cz0 + .18, 0, 0, 0, 0xf4efe6);
    for(let k = 0; k < 5; k++) M.add(G.box, cx0 + .4 + k * .8, .5, cz0 - .01, .5, .7, .02, 0, 0, 0, 0xa8703f);
    M.add(G.box, u(1.4), 1.22, w(5.25), .36, .24, .3, 0, 0, 0, 0x3a3d42); M.add(G.box, u(1.4), 1.42, w(5.15), .3, .2, .04, -.4, 0, 0, 0x6cc4ff);
    M.add(G.box, u(3.4), 1.3, w(5.2), .8, .4, .45, 0, 0, 0, 0xdff4ff); for(let k = 0; k < 3; k++) addItem(THREE, G, M, 21, 1.5, u(3.15 + k * .25) + .06, 1.11, w(5.2));
    for(let k = 0; k < 3; k++) addItem(THREE, G, M, [5, 7, 2][k], 1.1, u(2.0 + k * .22), 1.1, w(5.4));
    A.back((u(.6) + u(4.3)) / 2, 2.4, z1 - T / 2 - .06, 2.9, 1.09, 'cafe');
    M.add(G.box, (u(.6) + u(4.3)) / 2, 2.4, z1 - T / 2 - .025, 3.06, 1.24, .05, 0, 0, 0, 0x8a5634);
    { const kx0 = u(5.0), kx1 = u(6.7); A.quad([kx1, 1.05, z1 + .06], [kx0, 1.05, z1 + .06], [kx0, 1.95, z1 + .06], [kx1, 1.95, z1 + .06], 'kitchen');
      M.add(G.box, (kx0 + kx1) / 2, 1.05, z1 - .2, kx1 - kx0 + .2, .05, .3, 0, 0, 0, 0xf4efe6); addItem(THREE, G, M, 15, 1.2, (kx0 + kx1) / 2 - .3, 1.08, z1 - .22); addItem(THREE, G, M, 20, 1.2, (kx0 + kx1) / 2 + .35, 1.08, z1 - .22);
      M.add(G.box, (kx0 + kx1) / 2, 2.05, z1 - .2, kx1 - kx0 + .3, .1, .3, 0, 0, 0, 0xc8603e);
      STEAM.push({ x:(kx0 + kx1) / 2, y:1.8, z:z1 - .1, r:.8, inside:1 }); }
    o.blocks.push({ x0:cx0, x1:cx1, z0:cz0, z1:cz1 + .9, top:1.1, bot:0 });
    // tables and chairs (seats face their table)
    const seats = [], tables = [[u(1.3), w(2.0), 'ns'], [u(6.7), w(1.9), 'ew'], [u(9.3), w(1.9), 'ew'], [u(7.3), w(4.5), 'ew'], [u(9.6), w(4.6), 'ns']];
    const lampsAt = [];
    for(const [tx, tz, dir] of tables){
      M.add(G.cyl, tx, .74, tz, .52, .05, .52, 0, 0, 0, 0xfff3dc); M.add(G.cyl, tx, .715, tz, .5, .02, .5, 0, 0, 0, 0xc8603e);
      M.add(G.cyl8, tx, .37, tz, .05, .72, .05, 0, 0, 0, 0x3a3d42); M.add(G.cyl, tx, .02, tz, .26, .04, .26, 0, 0, 0, 0x3a3d42);
      M.add(G.cyl8, tx + .1, .8, tz - .08, .04, .08, .04, 0, 0, 0, 0xffffff); M.add(geoms(THREE).tiny, tx + .1, .86, tz - .08, .04, .03, .04, 0, 0, 0, [0xff8fb1, 0xffd23f, 0x6cc4ff][seats.length % 3]);
      o.circles.push({ x:tx, z:tz, r:.55, top:.8, food:1 });
      for(const s of [-1, 1]){
        const cx = dir === 'ew' ? tx + s * .8 : tx, cz = dir === 'ew' ? tz : tz + s * .8, f = Math.atan2(tx - cx, tz - cz);
        const c = Math.cos(f), sn = Math.sin(f), Pp = (lx, lz) => [cx + lx * c + lz * sn, cz - lx * sn + lz * c];
        M.add(G.box, cx, .43, cz, .46, .06, .46, 0, f, 0, 0xc89a62);
        for(const [lx, lz] of [[-.19, -.19], [.19, -.19], [-.19, .19], [.19, .19]]){ const p = Pp(lx, lz); M.add(G.cyl8, p[0], .2, p[1], .025, .4, .025, 0, 0, 0, 0x3a3d42); }
        const bp = Pp(0, -.21); M.add(G.box, bp[0], .72, bp[1], .44, .5, .05, -.08, f, 0, [0xe8304f, 0x3fbf6a, 0x3a8fd8, 0xffc23d][seats.length % 4]);
        seats.push({ x:cx, z:cz, f, tx, tz });
      }
      lampsAt.push([tx, tz]);
    }
    // plants in pots inside
    for(const [px, pz] of [[x1 - .45, z0 + .45], [x1 - .45, z1 - .45], [dB + .45, z0 + .45], [u(4.75), z1 - .4]]){ M.add(G.cyl, px, .22, pz, .22, .44, .22, 0, 0, 0, 0xc8603e); for(let k = 0; k < 5; k++) M.add(G.cone, px + Math.cos(k * 1.3) * .08, .75 + (k % 2) * .1, pz + Math.sin(k * 1.3) * .08, .09, .65, .09, Math.cos(k * 1.3) * .35, 0, Math.sin(k * 1.3) * .35, [0x3f8a3a, 0x5aa83f][k % 2]); o.circles.push({ x:px, z:pz, r:.28, top:1, food:1 }); }
    // pendant lamps over the tables (warm bulbs, glows at dusk and night) + a lamp over the counter
    lampsAt.push([(cx0 + cx1) / 2 - .8, (cz0 + cz1) / 2], [(cx0 + cx1) / 2 + .9, (cz0 + cz1) / 2]);
    const B = new Merge();
    for(const [lx, lz] of lampsAt){ M.add(G.cyl8, lx, H - .35, lz, .01, .7, .01, 0, 0, 0, 0x26282d); M.add(G.cone, lx, 2.3, lz, .22, .2, .22, 0, 0, 0, 0xc8603e); B.add(G.sm, lx, 2.18, lz, .08, .08, .08, 0, 0, 0, 0xffffff); }
    for(const s of [-1, 1]) B.add(G.box, dx + s * (DW / 2 + .3), 2.15, z0 - .26, .1, .16, .02, 0, 0, 0, 0xffffff);
    // the door: two glass leaves that swing inwards when someone is near
    const leaves = [];
    for(const s of [-1, 1]){
      const piv = new THREE.Group(); piv.position.set(dx + s * DW / 2, 0, z0); o.root.add(piv);
      const L = new Merge(); const lw = DW / 2 - .04;
      L.add(G.box, -s * lw / 2, 1.22, 0, lw, 2.4, .06, 0, 0, 0, 0x8a5634); L.add(G.box, -s * lw / 2, 1.4, 0, lw - .22, 1.5, .07, 0, 0, 0, 0xcfeeff); L.add(G.box, -s * (lw - .14), 1.15, -.06, .04, .3, .04, 0, 0, 0, 0xd9c09a);
      const lm = new THREE.Mesh(L.geometry(), vc); lm.castShadow = true; piv.add(lm); leaves.push({ piv, s, a:0 });
    }
    // the cashier behind the counter (facing the room) and, through the kitchen window, the cook
    const cash = new THREE.Mesh(vendorGeo(THREE, K, V.cafe), vc); cash.position.set(u(2.6), 0, w(5.95)); cash.rotation.y = Math.PI; cash.castShadow = true; o.root.add(cash);
    vendors.push({ m:cash, k:'cafe', x:u(2.6), y:0, z:w(5.95), yaw:Math.PI, hop:0, top:2.05 });
    // blockers: the four walls (the door gap stays open)
    o.blocks.push({ x0:x0 - T / 2, x1:dA, z0:z0 - T / 2, z1:z0 + T / 2, top:H, bot:0 }, { x0:dB, x1:x1 + T / 2, z0:z0 - T / 2, z1:z0 + T / 2, top:H, bot:0 },
      { x0:x0 - T / 2, x1:x1 + T / 2, z0:z1 - T / 2, z1:z1 + T / 2, top:H, bot:0 }, { x0:x0 - T / 2, x1:x0 + T / 2, z0:z0, z1:z1, top:H, bot:0 }, { x0:x1 - T / 2, x1:x1 + T / 2, z0:z0, z1:z1, top:H, bot:0 });
    parts.push(M.geometry()); aparts.push(A.geometry());
    const roof = new THREE.Mesh(R.geometry(), vc); roof.castShadow = false; roof.receiveShadow = true; o.root.add(roof);
    const glassMat = lam({ color:0xcfeeff, transparent:true, opacity:.32, depthWrite:false, emissive:0x000000 });
    const glass = new THREE.Mesh(GL.geometry(), glassMat); glass.renderOrder = 2; o.root.add(glass);
    const bulbMat = new THREE.MeshBasicMaterial({ color:0xffe0a8 }); o.root.add(new THREE.Mesh(B.geometry(), bulbMat));
    return { x0, x1, z0, z1, H, door:{ x:dx, z:z0 }, counter:{ x:u(2.6), z:w(4.2) }, seats, roof, leaves, glassMat, bulbMat, lamps:lampsAt,
      inside:(x, z) => x > x0 && x < x1 && z > z0 && z < z1 };
  })();

  // one mesh for everything static (carts + café), one for the painted boards
  const merged = concat(THREE, parts, ['position', 'normal', 'color']);
  const mm = new THREE.Mesh(merged, vc); mm.castShadow = true; mm.receiveShadow = true; o.root.add(mm);
  const atlas = paintAtlas(THREE);
  const am = new THREE.Mesh(concat(THREE, aparts, ['position', 'normal', 'uv']), lam({ map:atlas, polygonOffset:true, polygonOffsetFactor:-2, polygonOffsetUnits:-2 })); am.receiveShadow = true; o.root.add(am);
  // warm glows (café lamps): sprites, brighter at dusk / night
  const glowMat = new THREE.SpriteMaterial({ map:o.glow, color:0xffc98a, transparent:true, depthWrite:false, blending:THREE.AdditiveBlending, opacity:.35 });
  for(const [lx, lz] of cafe.lamps){ const sp = new THREE.Sprite(glowMat); sp.position.set(lx, 2.12, lz); sp.scale.setScalar(1.3); o.root.add(sp); }

  function setNight(dusk, night){
    const k = Math.min(1, dusk * .5 + night);
    glowMat.opacity = .3 + k * .6;
    cafe.glassMat.emissive.setRGB(k * .55, k * .4, k * .2); cafe.glassMat.opacity = .32 + k * .4;
  }
  /* t, dt, camera position, the player: doors swing, the roof lifts, vendors look at you */
  function tick(t, dt, cam, P){
    const near = Math.hypot(P.x - cafe.door.x, P.z - cafe.door.z) < 2.3 && P.y < 1;
    for(const l of cafe.leaves){ l.a += ((near ? 1.35 : 0) - l.a) * Math.min(1, dt * 6); l.piv.rotation.y = l.s * l.a; }
    const camIn = cam && cam.x > cafe.x0 - .3 && cam.x < cafe.x1 + .3 && cam.z > cafe.z0 - .3 && cam.z < cafe.z1 + .3 && cam.y < cafe.H + 1.2;
    cafe.roof.visible = !(cafe.inside(P.x, P.z) || camIn);
    for(const v of vendors){
      const d = Math.hypot(P.x - v.x, P.z - v.z);
      let want = v.yaw; if(d < 7){ const a = Math.atan2(P.x - v.x, P.z - v.z); let df = a - v.yaw; while(df > Math.PI) df -= 2 * Math.PI; while(df < -Math.PI) df += 2 * Math.PI; want = v.yaw + Math.max(-.7, Math.min(.7, df)); }
      v.m.rotation.y += (want - v.m.rotation.y) * Math.min(1, dt * 4);
      v.hop = Math.max(0, v.hop - dt);
      v.m.position.y = v.y + Math.abs(Math.sin(v.hop * 12)) * v.hop * .5;
      v.m.rotation.z = Math.sin(t * 1.6 + v.x) * .025 + (v.hop ? Math.sin(v.hop * 20) * .06 : 0);
      v.m.scale.y = 1 + Math.sin(t * 2.2 + v.z) * .012;
    }
  }
  return { carts, cafe, vendors, steam:STEAM, setNight, tick, inCafe:(x, z) => cafe.inside(x, z) };
}
/* join non-indexed geometries with the same attributes into one */
function concat(THREE, list, names){
  const out = new THREE.BufferGeometry();
  for(const n of names){
    const sz = list[0].attributes[n].itemSize; let len = 0; for(const g of list) len += g.attributes[n].array.length;
    const arr = new Float32Array(len); let off = 0; for(const g of list){ arr.set(g.attributes[n].array, off); off += g.attributes[n].array.length; }
    out.setAttribute(n, new THREE.BufferAttribute(arr, sz));
  }
  out.computeBoundingSphere(); return out;
}
