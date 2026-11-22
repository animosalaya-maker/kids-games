/* «قلعة الألعاب» progress, saved on this device under the key 'map_castle'.
   MapSave.load()  → the save object (always valid, upgraded to the current version)
   MapSave.save(s) → writes it (s defaults to the loaded object), stamps 'at'
   Shape (version 1), plain JSON so it can be synced to a server later as-is:
   { v:1, at:<ms>, hero:'sara',
     toys:[ids of collected golden toys 0…69] (0…29 the castle, then 8 per new zone: snow, candy, volcano, pirate, sky),
     st:{ tower|treasure|boat|bounce|cake|sled|candy|obby|hunt|cannon|coins : { done:bool, best:<sec or score>|null, stars:0…3, runs:n } },
     zv:[zones visited], cd:{ d:'YYYY-MM-DD', n } (repeat-play coins today), allz:1 when every new-zone game is done,
     deco:[unlocked castle decorations: 'flag','fireworks','statue','balloons','crown_arch'],
     outfit:{ own:['crown','cape'], wear:{ crown:bool, cape:bool } },
     coins:<World coins earned in this map> } */
(function(){
'use strict';
const KEY = 'map_castle', V = 1;
const STATIONS = ['tower', 'treasure', 'boat', 'bounce', 'cake', 'sled', 'candy', 'obby', 'hunt', 'cannon', 'coins'];
const TOYS_N = 70;
function blank(){
  const st = {}; STATIONS.forEach(k => st[k] = { done:false, best:null, stars:0, runs:0 });
  return { v:V, at:0, hero:null, toys:[], st, deco:[], outfit:{ own:[], wear:{ crown:false, cape:false } }, coins:0 };
}
function upgrade(d){
  const b = blank();
  if(!d || typeof d !== 'object') return b;
  const o = Object.assign(b, d);
  o.v = V;
  o.toys = Array.isArray(d.toys) ? [...new Set(d.toys.filter(n => Number.isInteger(n) && n >= 0 && n < TOYS_N))] : [];
  o.st = {}; STATIONS.forEach(k => { const s = (d.st && d.st[k]) || {}; o.st[k] = { done:!!s.done, best:typeof s.best === 'number' ? s.best : null, stars:Math.max(0, Math.min(3, s.stars | 0)), runs:s.runs | 0 }; });
  o.deco = Array.isArray(d.deco) ? d.deco.filter(x => typeof x === 'string') : [];
  const of = d.outfit || {};
  o.outfit = { own:Array.isArray(of.own) ? of.own.filter(x => typeof x === 'string') : [], wear:Object.assign({ crown:false, cape:false }, of.wear || {}) };
  o.coins = Math.max(0, o.coins | 0);
  o.zv = Array.isArray(d.zv) ? d.zv.filter(x => typeof x === 'string') : [];
  return o;
}
let mem = null;
const MapSave = {
  KEY, V, STATIONS, TOYS_N,
  load(){ if(mem) return mem; let d = null; try{ d = JSON.parse(localStorage.getItem(KEY)); }catch(e){} mem = upgrade(d); return mem; },
  save(s){ if(s) mem = s; if(!mem) mem = blank(); mem.at = Date.now(); try{ localStorage.setItem(KEY, JSON.stringify(mem)); }catch(e){} return mem; },
  reset(){ mem = blank(); try{ localStorage.removeItem(KEY); }catch(e){} return mem; },
  blank
};
window.MapSave = MapSave;
})();
