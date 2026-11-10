/* Money grab: coins and bills pop up on both halves (always in mirrored pairs, so it's fair).
   Tap the ones in YOUR half to drop them in your piggy bank. Golden coin = +3. Bee = −2! 25 seconds. */
Duel.register({
  id: 'coins', title: L('جمع المصاري', 'Coin Grab', 'Para Topla'), emoji: '💰', bg: '#ff6f61',
  help: L('اكبس على المصاري اللي بنصّك بسرعة، بس لا تكبس على النحلة!', 'Tap the coins on your side fast, but don\'t tap the bee!', 'Kendi tarafındaki paralara hızlıca dokun, ama arıya dokunma!'),
  create(api){
    const OUT = '#1c1838', LIMIT = 25, LIFE = 1.4;
    const VAL = { coin: 1, bill: 1, gold: 3, bee: -2 };
    const items = [];      // { x, y, half, type, age, gone }
    const flyers = [];     // grabbed items flying to the piggy
    const pops = [];       // floating +1 texts
    const score = [0, 0], squish = [0, 0];
    let t = 0, spawnT = 0.3, done = false;
    const S = () => Math.min(api.W, api.H);
    const ir = () => S() * 0.08;
    const piggyY = () => api.H / 2 - S() * 0.13;     // local y (own edge = +H/2)
    function side(c, pl, fn){ c.save(); c.translate(api.W / 2, api.H / 2); if(pl === 1) c.rotate(Math.PI); fn(); c.restore(); }
    const toScreen = (pl, x, y) => pl === 0 ? { x: api.W / 2 + x, y: api.H / 2 + y } : { x: api.W / 2 - x, y: api.H / 2 - y };

    function pickType(){ const r = Math.random(); return r < 0.16 ? 'bee' : r < 0.28 ? 'gold' : r < 0.55 ? 'bill' : 'coin'; }
    function spawn(){
      const s = S(), r = ir(), W = api.W, H = api.H;
      // position in local coords of player 0 (centre origin, +y = bottom edge)
      for(let tries = 0; tries < 10; tries++){
        const x = api.rand(-W / 2 + r * 1.3, W / 2 - r * 1.3), y = api.rand(r * 1.2, piggyY() - s * 0.13 - r);
        if(x < -W / 2 + 95 && y < r * 1.8) continue;   // keep clear of the score badge
        if(x > W / 2 - 70 && y < r * 1.5) continue;    // and of the ✕ button
        const p0 = toScreen(0, x, y);
        if(items.some(it => !it.gone && it.half === 0 && Math.hypot(it.x - p0.x, it.y - p0.y) < r * 2.4)) continue;
        const type = pickType(), p1 = toScreen(1, x, y);
        items.push({ x: p0.x, y: p0.y, half: 0, type, age: 0, gone: false, seed: Math.random() * 6 });
        items.push({ x: p1.x, y: p1.y, half: 1, type, age: 0, gone: false, seed: Math.random() * 6 });
        return;
      }
    }

    function drawCoin(c, r, gold){
      const lw = Math.max(3, S() * 0.011);
      c.fillStyle = gold ? '#ffb800' : '#ffd84d'; c.strokeStyle = OUT; c.lineWidth = lw;
      c.beginPath(); c.arc(0, 0, r, 0, Math.PI * 2); c.fill(); c.stroke();
      c.strokeStyle = gold ? '#e08a00' : '#e0a800'; c.lineWidth = Math.max(2, r * 0.1);
      c.beginPath(); c.arc(0, 0, r * 0.7, 0, Math.PI * 2); c.stroke();
      c.fillStyle = 'rgba(255,255,255,.55)'; c.beginPath(); c.ellipse(-r * 0.35, -r * 0.4, r * 0.22, r * 0.12, -0.7, 0, Math.PI * 2); c.fill();
      if(gold){
        c.fillStyle = '#fff7e8'; c.strokeStyle = OUT; c.lineWidth = Math.max(2, r * 0.07);
        c.beginPath(); for(let k = 0; k < 10; k++){ const a = -Math.PI / 2 + k * Math.PI / 5, rr = r * (k % 2 ? 0.2 : 0.45); c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } c.closePath(); c.fill(); c.stroke();
      } else {
        c.fillStyle = '#e0a800'; c.beginPath(); c.arc(0, 0, r * 0.22, 0, Math.PI * 2); c.fill();
      }
    }
    function drawBill(c, r){
      const w = r * 2.1, h = r * 1.2, lw = Math.max(3, S() * 0.011);
      c.fillStyle = '#7ed957'; c.strokeStyle = OUT; c.lineWidth = lw;
      c.beginPath(); c.roundRect(-w / 2, -h / 2, w, h, h * 0.15); c.fill(); c.stroke();
      c.strokeStyle = '#3f9d2e'; c.lineWidth = Math.max(2, r * 0.07); c.beginPath(); c.roundRect(-w / 2 + r * 0.15, -h / 2 + r * 0.15, w - r * 0.3, h - r * 0.3, h * 0.1); c.stroke();
      c.fillStyle = '#c9f2a8'; c.strokeStyle = OUT; c.lineWidth = Math.max(2, r * 0.06);
      c.beginPath(); c.arc(0, 0, h * 0.3, 0, Math.PI * 2); c.fill(); c.stroke();
      c.fillStyle = '#3f9d2e'; for(const sx of [-1, 1]){ c.beginPath(); c.arc(sx * w * 0.33, 0, r * 0.1, 0, Math.PI * 2); c.fill(); }
    }
    function drawBee(c, r, tt){
      const lw = Math.max(3, S() * 0.011);
      c.strokeStyle = OUT; c.lineWidth = lw;
      // wings
      const fl = Math.sin(tt * 40) * 0.25;
      c.fillStyle = 'rgba(220,240,255,.9)';
      for(const sx of [-1, 1]){ c.save(); c.rotate(sx * (0.5 + fl)); c.beginPath(); c.ellipse(0, -r * 0.75, r * 0.32, r * 0.5, 0, 0, Math.PI * 2); c.fill(); c.stroke(); c.restore(); }
      // body
      c.fillStyle = '#ffd23f'; c.beginPath(); c.ellipse(0, 0, r * 0.85, r * 0.62, 0, 0, Math.PI * 2); c.fill(); c.stroke();
      c.save(); c.beginPath(); c.ellipse(0, 0, r * 0.85, r * 0.62, 0, 0, Math.PI * 2); c.clip();
      c.fillStyle = OUT; for(const sx of [-0.15, 0.25]) c.fillRect(sx * r * 2 - r * 0.1, -r, r * 0.2, r * 2);
      c.restore();
      c.beginPath(); c.ellipse(0, 0, r * 0.85, r * 0.62, 0, 0, Math.PI * 2); c.stroke();
      // stinger + face
      c.fillStyle = OUT; c.beginPath(); c.moveTo(r * 0.82, -r * 0.12); c.lineTo(r * 1.1, 0); c.lineTo(r * 0.82, r * 0.12); c.fill();
      c.fillStyle = '#fff'; c.beginPath(); c.arc(-r * 0.5, -r * 0.12, r * 0.16, 0, Math.PI * 2); c.fill();
      c.fillStyle = OUT; c.beginPath(); c.arc(-r * 0.53, -r * 0.1, r * 0.08, 0, Math.PI * 2); c.fill();
      // angry brow
      c.lineWidth = Math.max(2, r * 0.08); c.beginPath(); c.moveTo(-r * 0.72, -r * 0.38); c.lineTo(-r * 0.36, -r * 0.26); c.stroke();
    }
    function drawItem(c, type, r, tt){
      if(type === 'bee') drawBee(c, r, tt);
      else if(type === 'bill') drawBill(c, r);
      else drawCoin(c, type === 'gold' ? r * 1.12 : r, type === 'gold');
    }
    function drawPiggy(c, pl){
      const s = S(), col = api.players[pl], r = s * 0.085, lw = Math.max(3, s * 0.012), q = squish[pl];
      c.save(); c.translate(0, piggyY()); c.scale(1 + q * 0.15, 1 - q * 0.12);
      c.fillStyle = 'rgba(28,24,56,.2)'; c.beginPath(); c.ellipse(0, r * 0.95, r * 1.1, r * 0.2, 0, 0, Math.PI * 2); c.fill();
      c.fillStyle = col.dark; c.strokeStyle = OUT; c.lineWidth = lw;
      for(const lx of [-0.6, 0.6]){ c.beginPath(); c.roundRect(lx * r - r * 0.17, r * 0.4, r * 0.34, r * 0.5, r * 0.1); c.fill(); c.stroke(); }
      // ears
      c.fillStyle = col.color;
      for(const ex of [-1, 1]){ c.beginPath(); c.moveTo(ex * r * 0.25, -r * 0.6); c.lineTo(ex * r * 0.55, -r * 1.0); c.lineTo(ex * r * 0.7, -r * 0.45); c.closePath(); c.fill(); c.stroke(); }
      // body
      c.beginPath(); c.ellipse(0, 0, r * 1.25, r * 0.85, 0, 0, Math.PI * 2); c.fill(); c.stroke();
      c.fillStyle = 'rgba(255,255,255,.28)'; c.beginPath(); c.ellipse(-r * 0.5, -r * 0.4, r * 0.35, r * 0.15, -0.4, 0, Math.PI * 2); c.fill();
      // coin slot
      c.fillStyle = OUT; c.beginPath(); c.roundRect(-r * 0.35, -r * 0.72, r * 0.7, r * 0.13, r * 0.06); c.fill();
      // snout + eyes
      c.fillStyle = col.light; c.beginPath(); c.ellipse(0, r * 0.18, r * 0.4, r * 0.28, 0, 0, Math.PI * 2); c.fill(); c.stroke();
      c.fillStyle = OUT; for(const nx of [-1, 1]){ c.beginPath(); c.ellipse(nx * r * 0.13, r * 0.18, r * 0.06, r * 0.1, 0, 0, Math.PI * 2); c.fill(); }
      for(const ex of [-1, 1]){ c.beginPath(); c.arc(ex * r * 0.5, -r * 0.18, r * 0.1, 0, Math.PI * 2); c.fill(); }
      c.restore();
    }

    return {
      update(dt){
        t += dt;
        spawnT -= dt;
        const live = items.filter(it => !it.gone).length / 2;
        if(spawnT <= 0 && !done){ if(live < 5) spawn(); spawnT = api.rand(0.4, 0.65); }
        for(const it of items) it.age += dt;
        for(let i = items.length - 1; i >= 0; i--) if(items[i].gone || items[i].age > LIFE) items.splice(i, 1);
        for(const f of flyers) f.k += dt / 0.45;
        for(let i = flyers.length - 1; i >= 0; i--){
          const f = flyers[i];
          if(f.k >= 1){
            flyers.splice(i, 1);
            if(f.type !== 'bee'){ squish[f.pl] = 1; api.tone(1318, 0.06, 'triangle', 0.08); }
          }
        }
        for(const p of pops){ p.life -= dt; }
        for(let i = pops.length - 1; i >= 0; i--) if(pops[i].life <= 0) pops.splice(i, 1);
        squish[0] = Math.max(0, squish[0] - dt * 5); squish[1] = Math.max(0, squish[1] - dt * 5);
        if(api.time >= LIMIT && !done){ done = true; api.win(score[0] === score[1] ? null : score[0] > score[1] ? 0 : 1); }
      },
      pointerDown(p){
        if(done) return;
        const pl = p.player, r = ir();
        let best = null, bd = 1e9;
        for(const it of items){
          if(it.gone || it.half !== pl || it.age > LIFE - 0.05) continue;
          const d = Math.hypot(it.x - p.x, it.y - p.y);
          if(d < r * 1.45 && d < bd){ bd = d; best = it; }
        }
        if(!best) return;
        best.gone = true;
        const v = VAL[best.type];
        score[pl] = Math.max(0, score[pl] + v);
        const tgt = toScreen(pl, 0, piggyY());
        if(best.type === 'bee'){
          api.sfx.buzz(); api.say(L('قرصتك النحلة! 🐝', 'The bee got you! 🐝', 'Arı seni soktu! 🐝'), pl, 900);
          flyers.push({ pl, type: 'bee', x0: best.x, y0: best.y, x1: best.x + (Math.random() < 0.5 ? -1 : 1) * api.W, y1: best.y + api.rand(-1, 1) * S() * 0.3, k: 0 });
        } else {
          api.sfx.coin();
          flyers.push({ pl, type: best.type, x0: best.x, y0: best.y, x1: tgt.x, y1: tgt.y, k: 0 });
        }
        pops.push({ pl, x: best.x, y: best.y, str: (v > 0 ? '+' : '−') + api.AR(Math.abs(v)), good: v > 0, life: 0.8 });
      },
      draw(c){
        const W = api.W, H = api.H, s = S(), r = ir();
        c.fillStyle = '#ffe6c9'; c.fillRect(0, 0, W, H);
        c.fillStyle = 'rgba(255,90,95,.16)'; c.fillRect(0, H / 2, W, H / 2);
        c.fillStyle = 'rgba(63,169,255,.16)'; c.fillRect(0, 0, W, H / 2);
        // polka dots
        c.fillStyle = 'rgba(28,24,56,.05)';
        for(let y = s * 0.06; y < H; y += s * 0.14) for(let x = s * 0.06 + ((y / (s * 0.14)) % 2) * s * 0.07; x < W; x += s * 0.14){ c.beginPath(); c.arc(x, y, s * 0.02, 0, Math.PI * 2); c.fill(); }
        c.strokeStyle = 'rgba(28,24,56,.35)'; c.lineWidth = 4; c.setLineDash([10, 10]);
        c.beginPath(); c.moveTo(0, H / 2); c.lineTo(W, H / 2); c.stroke(); c.setLineDash([]);
        // piggies & counts
        for(const pl of [0, 1]) side(c, pl, () => {
          drawPiggy(c, pl);
          const col = api.players[pl];
          c.fillStyle = '#fff7e8'; c.strokeStyle = OUT; c.lineWidth = Math.max(3, s * 0.01);
          const bx = W * 0.3, by = piggyY();
          c.beginPath(); c.roundRect(bx - s * 0.1, by - s * 0.055, s * 0.2, s * 0.11, s * 0.05); c.fill(); c.stroke();
          api.text(c, api.AR(score[pl]), bx, by + 1, Math.min(34, s * 0.085), col.dark, 0, 900);
          const left = Math.max(0, Math.ceil(LIMIT - api.time));
          api.text(c, '⏱ ' + api.AR(left), -W * 0.3, by, Math.min(24, s * 0.06), left <= 5 ? '#c41f1f' : OUT, 0);
        });
        // items
        for(const it of items){
          const a = it.age, pop = Math.min(1, a / 0.15), out = Math.max(0, (a - (LIFE - 0.2)) / 0.2);
          const sc = (pop < 1 ? 0.4 + pop * 0.75 : 1.15 - Math.min(0.15, (a - 0.15) * 1.5)) * (1 - out);
          if(sc <= 0) continue;
          c.save(); c.translate(it.x, it.y + (it.type === 'bee' ? Math.sin(t * 6 + it.seed) * r * 0.15 : 0));
          if(it.half === 1) c.rotate(Math.PI);
          c.rotate(Math.sin(t * 13 + it.seed) * (it.type === 'bee' ? 0.12 : 0.28));
          c.scale(sc, sc);
          // soft glow so items pop out from the background
          c.fillStyle = it.type === 'bee' ? 'rgba(255,77,77,.18)' : 'rgba(255,255,255,.55)'; c.beginPath(); c.arc(0, 0, r * 1.25, 0, Math.PI * 2); c.fill();
          drawItem(c, it.type, r, t + it.seed);
          c.restore();
        }
        // flying grabbed items
        for(const f of flyers){
          const k = Math.min(1, f.k), e = k * k * (3 - 2 * k);
          const x = f.x0 + (f.x1 - f.x0) * e, y = f.y0 + (f.y1 - f.y0) * e - Math.sin(k * Math.PI) * s * 0.12 * (f.pl === 0 ? 1 : -1);
          c.save(); c.translate(x, y); if(f.pl === 1) c.rotate(Math.PI); c.rotate(k * 6);
          const sc = f.type === 'bee' ? 1 : 1 - k * 0.6; c.scale(sc, sc); drawItem(c, f.type, r, t); c.restore();
        }
        for(const p of pops){
          const k = 1 - p.life / 0.8;
          api.text(c, p.str, p.x, p.y + (p.pl === 0 ? -1 : 1) * (r * 1.1 + k * s * 0.08), Math.min(34, s * 0.085), p.good ? '#ffcd4d' : '#ff4d4d', p.pl, 900);
        }
      }
    };
  }
});
