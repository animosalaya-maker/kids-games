/* Bobo Land: what this device owns from the shop, and the free preview of premium maps.
   Entitlements.has('map_castle')            → true when the map is owned on this device
   Entitlements.grant(id, source)            → mark as owned ('play' after a verified purchase, 'restore', 'dev')
   Entitlements.list()                       → [{ id, source, at }]
   The test-only unlock is the URL parameter ?dev=unlock (grants every product on this device; never shown in the UI).

   Trial (free preview): 300 seconds in TOTAL per kid, counted on the server (bobo_trial RPC via Friends.trial).
   Trial.fetch(map)       → Promise<{ left, limit, online }>: sends unsynced seconds, then reads what is left
   Trial.use(map, sec)    → counts seconds locally right away (works offline); Trial.flush(map) sends them
   Trial.left(map)        → seconds left as far as this device knows (never more than the server last said)
   Offline: a local counter with the same 300 s limit; the unsynced seconds go to the server when it is reachable. */
(function(){
'use strict';
const KEY = 'bobo_ent', LIMIT = 300;
const ls = () => { try{ return window.localStorage; }catch(e){ return null; } };
function read(k){ try{ return JSON.parse(ls().getItem(k)); }catch(e){ return null; } }
function write(k, v){ try{ ls().setItem(k, JSON.stringify(v)); }catch(e){} }

const PRODUCTS = ['map_castle'];
function data(){ const d = read(KEY); return d && typeof d === 'object' && d.own ? d : { v:1, own:{} }; }

const Entitlements = {
  PRODUCTS,
  has(id){ return !!data().own[id]; },
  grant(id, source){ const d = data(); if(!d.own[id]) d.own[id] = { source:source || 'play', at:Date.now() }; write(KEY, d); return true; },
  revoke(id){ const d = data(); delete d.own[id]; write(KEY, d); },
  list(){ const d = data(); return Object.keys(d.own).map(id => Object.assign({ id }, d.own[id])); },
  get dev(){ return DEV; }
};

let DEV = false;
try{ DEV = new URLSearchParams(location.search).get('dev') === 'unlock'; }catch(e){}
if(DEV) PRODUCTS.forEach(id => Entitlements.grant(id, 'dev'));

/* ---------- free preview ---------- */
const tk = map => 'bobo_trial_' + map;
function tget(map){ const t = read(tk(map)); return t && typeof t.used === 'number' ? t : { used:0, pend:0, srv:null }; }
function tput(map, t){ write(tk(map), t); }
let busy = {};
const Trial = {
  LIMIT,
  left(map){ const t = tget(map); return Math.max(0, LIMIT - t.used); },
  use(map, sec){ const t = tget(map); const s = Math.max(0, Math.min(sec, LIMIT - t.used)); t.used += s; t.pend = (t.pend || 0) + s; tput(map, t); return LIMIT - t.used; },
  async fetch(map){
    if(busy[map]) return busy[map];
    const F = window.Friends;
    const run = (async () => {
      if(!F || !F.trial) return { left:Trial.left(map), limit:LIMIT, online:false };
      try{
        let t = tget(map), r = null;
        // send the seconds counted offline (at most 60 per call), then read
        while((t.pend || 0) > 0){
          const n = Math.min(60, Math.ceil(t.pend));
          r = await F.trial(map, n);
          t = tget(map); t.pend = Math.max(0, (t.pend || 0) - n); tput(map, t);
        }
        if(!r) r = await F.trial(map, 0);
        t = tget(map);
        const used = Math.max(t.used, LIMIT - Math.max(0, Math.min(LIMIT, +r.left)));     // never more than the server says
        t.used = Math.min(LIMIT, used); t.srv = Date.now(); tput(map, t);
        return { left:LIMIT - t.used, limit:LIMIT, online:true };
      }catch(e){ return { left:Trial.left(map), limit:LIMIT, online:false }; }
    })();
    busy[map] = run;
    try{ return await run; } finally { busy[map] = null; }
  },
  flush(map){ return Trial.fetch(map); },
  _reset(map){ tput(map, { used:0, pend:0, srv:null }); }
};

window.Entitlements = Entitlements;
window.Trial = Trial;
})();
