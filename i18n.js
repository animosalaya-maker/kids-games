/* Language for the whole app: Arabic, English or Turkish, picked from the phone's language.
   Anything else falls back to English. A saved choice (language button on the home screen) wins.
   Usage in code:  L('عربي', 'English', 'Türkçe')   and   I18N.num(5)  (digits for the current language).
   Usage in HTML:  <b data-en="Play" data-tr="Oyna">العب</b>   (also data-en-aria / data-tr-aria, data-en-ph / data-tr-ph) */
(function(){
'use strict';
const SUP = ['ar', 'en', 'tr'];
function detect(){
  try{ const s = localStorage.getItem('bobo_lang'); if(SUP.includes(s)) return s; }catch(e){}
  const list = (navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || 'en']);
  for(const l of list){ const c = String(l).toLowerCase().slice(0, 2); if(SUP.includes(c)) return c; }
  return 'en';
}
const lang = detect();
const dir = lang === 'ar' ? 'rtl' : 'ltr';
const SPEECH = { ar:'ar-SA', en:'en-US', tr:'tr-TR' };
const I18N = {
  lang, dir, speech: SPEECH[lang], langs: SUP,
  names: { ar:'العربية', en:'English', tr:'Türkçe' },
  num(n){ const s = String(n); return lang === 'ar' ? s.replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[d]) : s; },
  set(l){ if(!SUP.includes(l)) return; try{ localStorage.setItem('bobo_lang', l); }catch(e){} location.reload(); },
  apply(root){
    if(lang === 'ar') return;
    (root || document).querySelectorAll('[data-' + lang + ']').forEach(el => { el.textContent = el.getAttribute('data-' + lang); });
    (root || document).querySelectorAll('[data-' + lang + '-aria]').forEach(el => el.setAttribute('aria-label', el.getAttribute('data-' + lang + '-aria')));
    (root || document).querySelectorAll('[data-' + lang + '-ph]').forEach(el => el.setAttribute('placeholder', el.getAttribute('data-' + lang + '-ph')));
    const mf = document.querySelector('link[rel="manifest"]'); if(mf && !/manifest-/.test(mf.getAttribute('href'))) mf.setAttribute('href', mf.getAttribute('href').replace('manifest.webmanifest', 'manifest-' + lang + '.webmanifest'));
    const t = document.querySelector('title'); if(t && t.getAttribute('data-' + lang)) document.title = t.getAttribute('data-' + lang);
  }
};
window.I18N = I18N;
window.L = function(ar, en, tr){ return lang === 'ar' ? ar : lang === 'tr' ? (tr != null ? tr : en) : (en != null ? en : ar); };
document.documentElement.lang = lang;
document.documentElement.dir = dir;
if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => I18N.apply()); else I18N.apply();
})();
