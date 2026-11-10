/* Bobo Land: coins, wardrobe and daily gift shared by every game (saved on this device only). */
(function(){
'use strict';
const KEY = 'bobo_world';
const T = window.L || ((a) => a);
const COLORS = {
  purple:{ name:T('بنفسجي','Purple','Mor'), price:0,   color:'#9b6bff', light:'#d2bcff', belly:'#b993ff' },
  pink:  { name:T('زهري','Pink','Pembe'),   price:40,  color:'#ff6fae', light:'#ffc2dd', belly:'#ff9fca' },
  green: { name:T('أخضر','Green','Yeşil'),   price:40,  color:'#35c76f', light:'#b6f2cc', belly:'#6fe39d' },
  orange:{ name:T('برتقالي','Orange','Turuncu'), price:60,  color:'#ff9334', light:'#ffd2a6', belly:'#ffb46b' },
  blue:  { name:T('أزرق','Blue','Mavi'),   price:60,  color:'#3b9cff', light:'#b4dcff', belly:'#6fc0ff' },
  gold:  { name:T('ذهبي','Gold','Altın'),   price:150, color:'#f5b700', light:'#ffe6a3', belly:'#ffd466' }
};
const HATS = { cap:{ e:'🧢', name:T('كاب','Cap','Şapka'), price:30 }, bow:{ e:'🎀', name:T('فيونكة','Bow','Fiyonk'), price:30 }, top:{ e:'🎩', name:T('قبعة','Top hat','Silindir'), price:50 },
  flower:{ e:'🌸', name:T('وردة','Flower','Çiçek'), price:40 }, grad:{ e:'🎓', name:T('تخرّج','Grad cap','Kep'), price:80 }, crown:{ e:'👑', name:T('تاج','Crown','Taç'), price:200 } };
const GLASSES = { round:{ e:'👓', name:T('نضارة','Glasses','Gözlük'), price:30 }, sun:{ e:'🕶️', name:T('نضارة شمس','Sunglasses','Güneş gözlüğü'), price:50 }, goggles:{ e:'🥽', name:T('نضارة سباحة','Goggles','Yüzücü gözlüğü'), price:70 } };

function today(){ const d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); }
function blank(){ return { coins:0, owned:['color:purple'], outfit:{ color:'purple', hat:null, glasses:null }, gift:{ last:null, streak:0 }, total:0 }; }
let mem = null;
function load(){
  if(mem) return mem;
  try{ const v = JSON.parse(localStorage.getItem(KEY)); mem = Object.assign(blank(), v || {}); }catch(e){ mem = blank(); }
  if(!mem.outfit) mem.outfit = blank().outfit;
  return mem;
}
function save(){ try{ localStorage.setItem(KEY, JSON.stringify(mem)); }catch(e){} }

const AR = n => (window.I18N ? I18N.num(n) : String(n).replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[d]));
function toast(text){
  try{
    const el = document.createElement('div');
    el.textContent = text;
    el.style.cssText = 'position:fixed;left:50%;top:calc(18px + env(safe-area-inset-top,0px));transform:translateX(-50%);z-index:99;background:#ffcd4d;color:#3a2a00;' +
      'font:800 20px "Baloo Bhaijaan 2","Tajawal",system-ui,sans-serif;padding:8px 18px;border-radius:999px;box-shadow:0 6px 0 #c48f12,0 10px 30px rgba(0,0,0,.4);pointer-events:none;transition:opacity .4s,transform .4s';
    document.body.appendChild(el);
    setTimeout(() => { el.style.opacity = '0'; el.style.transform = 'translateX(-50%) translateY(-20px)'; }, 1800);
    setTimeout(() => el.remove(), 2400);
  }catch(e){}
}

const World = {
  COLORS, HATS, GLASSES, AR,
  get coins(){ return load().coins; },
  get outfit(){ return load().outfit; },
  addCoins(n, why){ const w = load(); w.coins += n; w.total = (w.total || 0) + n; save(); if(why === 'لخزانة بوبو') why = T(why, "for Bobo's wardrobe", 'Bobo\'nun dolabı için'); toast('+' + AR(n) + ' 🪙' + (why ? '  ' + why : '')); return w.coins; },
  owns(id){ return load().owned.includes(id); },
  buy(id, price){ const w = load(); if(w.owned.includes(id)) return true; if(w.coins < price) return false; w.coins -= price; w.owned.push(id); save(); return true; },
  wear(kind, key){ const w = load(); w.outfit[kind] = key; save(); },
  palette(){ return COLORS[load().outfit.color] || COLORS.purple; },
  giftReady(){ return load().gift.last !== today(); },
  openGift(){
    const w = load(); if(w.gift.last === today()) return 0;
    const y = new Date(); y.setDate(y.getDate() - 1);
    const yk = y.getFullYear() + '-' + (y.getMonth() + 1) + '-' + y.getDate();
    w.gift.streak = w.gift.last === yk ? Math.min(7, w.gift.streak + 1) : 1;
    w.gift.last = today();
    const amount = 10 + w.gift.streak * 5 + Math.floor(Math.random() * 6);
    w.coins += amount; w.total = (w.total || 0) + amount; save();
    return amount;
  },
  get streak(){ return load().gift.streak || 0; },
  /* play statistics for the sticker album */
  track(kind, id, score){ const w = load(); w.stats = w.stats || { plays:0, games:{}, wins:0 }; w.stats.plays++; w.stats.games[id] = (w.stats.games[id] || 0) + 1; if(kind === 'win') w.stats.wins++; save(); },
  get stats(){ const w = load(); return w.stats || { plays:0, games:{}, wins:0 }; },
  get total(){ return load().total || 0; },
  get owned(){ return load().owned.slice(); },
  exportCode(){ const w = load(); return 'BOBO-' + btoa(unescape(encodeURIComponent(JSON.stringify(w)))).replace(/=+$/, ''); },
  importCode(code){
    try{
      const raw = String(code).trim().replace(/^BOBO-/, '').replace(/\s+/g, '');
      const data = JSON.parse(decodeURIComponent(escape(atob(raw))));
      if(typeof data !== 'object' || typeof data.coins !== 'number' || !Array.isArray(data.owned)) return false;
      mem = Object.assign(blank(), data); save(); return true;
    }catch(e){ return false; }
  },
  /* draws the hat and glasses on top of a Bobo drawn at (x,y) with radius r */
  drawOutfit(c, x, y, r, outfit){
    const o = outfit || load().outfit, F = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
    c.save(); c.textAlign = 'center'; c.textBaseline = 'middle';
    if(o.glasses && GLASSES[o.glasses]){ c.font = Math.round(r * 0.95) + 'px ' + F; c.fillText(GLASSES[o.glasses].e, x, y - r * 0.2); }
    if(o.hat && HATS[o.hat]){ c.font = Math.round(r * (HATS[o.hat].face ? 1.0 : 0.95)) + 'px ' + F; c.fillText(HATS[o.hat].e, x, y - r * 0.95); }
    c.restore();
  }
};
window.World = World;
})();
