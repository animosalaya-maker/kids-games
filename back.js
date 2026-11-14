/* One big, clear "Back" button for every game (top-left corner).
   BoboBack.init({ visible: () => bool, onBack: () => {}, mount: element })
   - visible: called often; the button shows only when it returns true (default: always)
   - onBack: what a tap does (default: go to the home page)
   - mount: where to put the button (default: document.body, fixed to the screen) */
(function(){
  const css = `
.bb-back{position:fixed;z-index:9000;top:calc(10px + var(--sa-t, env(safe-area-inset-top,0px)));left:calc(10px + var(--sa-l, env(safe-area-inset-left,0px)));
  display:flex;align-items:center;gap:6px;height:50px;padding:0 18px 0 10px;border-radius:25px;border:3px solid #fff;
  background:#ffcd4d;color:#3b2600;font:800 19px/1 inherit;font-family:inherit;direction:ltr;cursor:pointer;
  box-shadow:0 4px 0 #c99418,0 8px 16px rgba(0,0,0,.28);-webkit-tap-highlight-color:transparent;touch-action:manipulation;
  transition:transform .12s ease, opacity .2s ease}
.bb-back.in{position:absolute}
.bb-back:active{transform:translateY(3px);box-shadow:0 1px 0 #c99418,0 4px 10px rgba(0,0,0,.25)}
.bb-back svg{width:30px;height:30px;flex:none}
.bb-back[hidden]{display:none}
.bb-back.sm{width:50px;padding:0;justify-content:center}.bb-back.sm span{display:none}
@media (max-height:420px){.bb-back{height:42px;font-size:16px;padding:0 14px 0 8px}.bb-back svg{width:24px;height:24px}}`;
  const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
  const word = () => (window.L ? window.L('رجوع', 'Back', 'Geri') : 'رجوع');
  let btn = null, cfg = {};
  function make(){
    btn = document.createElement('button');
    btn.className = 'bb-back'; btn.type = 'button';
    btn.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="12" fill="#3b2600"/><path d="M13.5 6.5 8 12l5.5 5.5" fill="none" stroke="#ffcd4d" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/></svg><span></span>';
    btn.querySelector('span').textContent = word();
    btn.setAttribute('aria-label', word());
    btn.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); if(cfg.onBack) cfg.onBack(); else location.href = '../'; });
    ['pointerdown', 'touchstart'].forEach(t => btn.addEventListener(t, e => e.stopPropagation(), { passive:true }));
    const host = cfg.mount || document.body; if(cfg.mount) btn.classList.add('in'); host.appendChild(btn);
  }
  function tick(){ if(!btn) return; let v = true; try { v = cfg.visible ? !!cfg.visible() : true; } catch(e){} if(btn.hidden === v) btn.hidden = !v; let c = false; try { c = cfg.compact ? !!cfg.compact() : false; } catch(e){} btn.classList.toggle('sm', c); }
  window.BoboBack = {
    init(o){ cfg = o || {}; const go = () => { make(); tick(); setInterval(tick, 200); }; document.body ? go() : addEventListener('DOMContentLoaded', go); },
    refresh(){ if(btn){ btn.querySelector('span').textContent = word(); btn.setAttribute('aria-label', word()); } tick(); }
  };
})();
