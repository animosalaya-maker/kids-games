/* Bobo Land: parental gate + buy sheet (shared by the shop and the premium maps).
   ParentGate.open({ mount, onPass, onClose })  — an adult question («كم 7 × 8؟») with 3 big answers; a wrong answer closes it.
   BuySheet.open({ mount, sku, name, onDone })   — after the gate: buys through Billing, or says «قريباً» while billing is off.
   Needs i18n.js (L) and billing.js (Billing); entitlements.js (Entitlements) for unlocking after a verified purchase. */
(function(){
'use strict';
const T = (a, e, t) => window.L ? window.L(a, e, t) : a;
const css = `
.pg-back{position:absolute;inset:0;z-index:60;display:flex;align-items:center;justify-content:center;background:rgba(14,10,32,.72);padding:14px;animation:pgIn .2s ease-out}
.pg-card{width:100%;max-width:520px;background:#fff7e8;color:#2a1f4a;border-radius:28px;padding:18px 20px 20px;display:flex;flex-direction:column;align-items:center;gap:10px;text-align:center;
  box-shadow:0 10px 0 rgba(0,0,0,.25),0 24px 60px rgba(0,0,0,.5);position:relative;font-family:"Baloo Bhaijaan 2","Tajawal",system-ui,sans-serif;animation:pgPop .28s cubic-bezier(.2,1.4,.4,1)}
.pg-card h3{margin:0;font-weight:800;font-size:22px;line-height:1.2}
.pg-card p{margin:0;font-family:"Tajawal",system-ui,sans-serif;font-weight:700;font-size:15px;color:#6a5d8c;line-height:1.4}
.pg-q{font-weight:800;font-size:46px;line-height:1.1;direction:ltr;color:#2a1f4a}
.pg-ans{display:flex;gap:12px;justify-content:center;direction:ltr;width:100%}
.pg-ans button{flex:1;max-width:130px;height:78px;border:0;border-radius:22px;background:#5b8cff;color:#fff;font:800 40px/1 "Baloo Bhaijaan 2",system-ui,sans-serif;box-shadow:0 6px 0 #3555b8;cursor:pointer}
.pg-ans button:active{transform:translateY(4px);box-shadow:0 2px 0 #3555b8}
.pg-x{position:absolute;top:10px;inset-inline-end:10px;width:44px;height:44px;border:0;border-radius:50%;background:#ece2ff;color:#2a1f4a;font-size:22px;cursor:pointer}
.pg-ok{border:0;border-radius:20px;background:#ffcd4d;color:#3a2a00;font:800 22px/1 "Baloo Bhaijaan 2",system-ui,sans-serif;padding:13px 30px;min-width:170px;box-shadow:0 6px 0 #c48f12;cursor:pointer}
.pg-ok:active{transform:translateY(4px);box-shadow:0 2px 0 #c48f12}
.pg-big{font-size:56px;line-height:1}
.pg-price{display:inline-flex;gap:8px;align-items:center;background:#2a1f4a;color:#ffcd4d;border-radius:999px;padding:6px 16px;font-weight:800;font-size:20px;direction:ltr}
@keyframes pgIn{from{opacity:0}to{opacity:1}}
@keyframes pgPop{from{transform:scale(.8);opacity:0}to{transform:scale(1);opacity:1}}
@media (max-height:420px){.pg-q{font-size:38px}.pg-ans button{height:62px;font-size:32px}.pg-card{gap:7px;padding:14px 16px}}`;
let styled = false;
function style(){ if(styled) return; styled = true; const s = document.createElement('style'); s.textContent = css; document.head.appendChild(s); }
function host(m){ return m || document.getElementById('stage') || document.body; }
function sheet(mount, html){
  style();
  const back = document.createElement('div'); back.className = 'pg-back'; back.setAttribute('role', 'dialog');
  back.innerHTML = `<div class="pg-card">${html}</div>`;
  ['pointerdown', 'touchstart'].forEach(t => back.addEventListener(t, e => e.stopPropagation(), { passive:true }));
  host(mount).appendChild(back); return back;
}
const shuffle = a => { for(let i = a.length - 1; i > 0; i--){ const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

/* a multiplication fact a young child would not know: both numbers 6…9 */
function question(){
  const a = 6 + Math.floor(Math.random() * 4), b = 6 + Math.floor(Math.random() * 4), r = a * b;
  const wrong = new Set();
  for(const w of shuffle([r + a, r - a, r + b, r - b, r + 10, r - 10, r + 1, r - 2])){ if(w !== r && w > 0 && wrong.size < 2) wrong.add(w); }
  return { a, b, r, choices:shuffle([r, ...wrong]) };
}

let open = null;
const ParentGate = {
  question,
  get isOpen(){ return !!open && open.isConnected; },
  get current(){ return open && open._q; },
  open(o = {}){
    if(open && open.isConnected) open.remove();
    const q = question();
    const el = sheet(o.mount, `<button class="pg-x" aria-label="${T('سكّر', 'Close', 'Kapat')}">✕</button>
      <h3>👨‍👩‍👧 ${T('هاد السؤال لبابا وماما', 'This question is for a grown-up', 'Bu soru bir büyük için')}</h3>
      <p>${T('اطلب من بابا أو ماما يجاوبوا', 'Ask a parent to answer', 'Annenden veya babandan cevaplamasını iste')}</p>
      <div class="pg-q">${T('كم', 'What is', 'Kaç eder:')} ${q.a} × ${q.b} ${T('؟', '?', '?')}</div>
      <div class="pg-ans">${q.choices.map(c => `<button data-v="${c}">${c}</button>`).join('')}</div>`);
    el._q = q; open = el;
    const close = pass => { if(!el.isConnected) return; el.remove(); if(open === el) open = null; if(pass){ if(o.onPass) o.onPass(); } else if(o.onClose) o.onClose(); };
    el.querySelector('.pg-x').onclick = () => close(false);
    el.addEventListener('click', e => { if(e.target === el) close(false); });
    el.querySelectorAll('.pg-ans button').forEach(b => b.onclick = () => close(+b.dataset.v === q.r));
    return el;
  },
  answer(v){ if(!open) return; const b = [...open.querySelectorAll('.pg-ans button')].find(x => +x.dataset.v === v); if(b) b.click(); },
  answerWrong(){ if(!open) return; const q = open._q; this.answer(q.choices.find(c => c !== q.r)); },
  answerRight(){ if(!open) return; this.answer(open._q.r); }
};

const BuySheet = {
  get isOpen(){ return !!document.querySelector('.pg-back.buy'); },
  async open(o = {}){
    const sku = o.sku || 'map_castle', B = window.Billing;
    const can = B ? await B.available().catch(() => false) : false;
    const price = B ? B.price(sku) : '';
    if(can){
      const r = await B.buy(sku).catch(() => ({ ok:false, reason:'error' }));
      if(r.ok){ if(window.Entitlements) Entitlements.grant(sku, 'play'); if(o.onDone) o.onDone(true); return; }
      if(r.reason === 'cancelled'){ if(o.onDone) o.onDone(false); return; }
    }
    const el = sheet(o.mount, `<div class="pg-big">💛</div>
      <h3>${T('الشراء رح يكون متاح قريباً 💛', 'Buying will be available soon 💛', 'Satın alma yakında açılacak 💛')}</h3>
      ${o.name ? `<p>${o.name}${price ? ` · <span class="pg-price">${price}</span>` : ''}</p>` : ''}
      <p>${T('لسّا ما في دفع بالتطبيق. ما رح ينطلب منكم شي هلّق.', 'There are no payments in the app yet. Nothing will be charged.', 'Uygulamada henüz ödeme yok. Hiçbir ücret alınmaz.')}</p>
      <button class="pg-ok">👍 ${T('تمام', 'OK', 'Tamam')}</button>`);
    el.classList.add('buy');
    const done = () => { if(!el.isConnected) return; el.remove(); if(o.onDone) o.onDone(false); };
    el.querySelector('.pg-ok').onclick = done;
    el.addEventListener('click', e => { if(e.target === el) done(); });
  },
  close(){ const el = document.querySelector('.pg-back.buy .pg-ok'); if(el) el.click(); }
};

/* gate first, then the buy sheet */
function askParent(o = {}){ ParentGate.open({ mount:o.mount, onClose:o.onClose, onPass:() => BuySheet.open(o) }); }

window.ParentGate = ParentGate;
window.BuySheet = BuySheet;
window.askParent = askParent;
})();
