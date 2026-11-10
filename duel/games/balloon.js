/* Balloon pump. Both kids pump their balloon at the same time for 15 s. Both balloons burst at the same hidden size.
   Burst = you lose. When time is up (or both pressed "خلص!") the bigger balloon wins. */
Duel.register({
  id: 'balloon', title: L('نفخ البالون', 'Balloon Pump', 'Balon Şişirme'), emoji: '🎈', bg: '#ff5a5f',
  help: L('اكبس لتنفخ البالون. الأكبر بيربح، بس إذا فقع بتخسر! اكبس خلص لتوقف', 'Tap to blow up the balloon. Biggest wins, but if it pops you lose! Tap Stop to stop', 'Balonu şişirmek için dokun. Büyük olan kazanır, ama patlarsa kaybedersin! Durmak için Dur\'a dokun'),
  create(api){
    const OUT = '#1c1838', DUR = 15, STEP = 0.034;
    const BURST = api.rand(0.6, 0.97);                 // same hidden limit for both kids
    const S = () => Math.min(api.W, api.H);
    const half = () => api.H / 2;
    const loc = p => p.player === 1 ? { x: api.W - p.x, y: api.H - p.y } : { x: p.x, y: p.y };
    const P = [0, 1].map(() => ({ s: 0, stopped: false, burst: false, press: 0, wob: 0, burstT: 0, taps: 0 }));
    const shards = [];
    let called = false, time = 0, ended = false, endAt = 0, endW = null, verdict = null;

    const geo = () => {
      const W = api.W, H = api.H, hf = half(), s = S();
      const rmax = Math.min(hf * 0.36, W * 0.34);
      return {
        rmax, rmin: rmax * 0.28,
        bx: W * 0.56, knotY: H - hf * 0.14,
        px: W * 0.17, pumpBase: H - hf * 0.06, pumpTop: H - hf * 0.32, pw: s * 0.11,
        stop: { x: W - s * 0.15, y: H - hf * 0.08, w: s * 0.22, h: s * 0.11 }
      };
    };
    const radius = st => { const g = geo(); return g.rmin + (g.rmax - g.rmin) * st.s; };
    const inStop = (q, g) => Math.abs(q.x - g.stop.x) < g.stop.w * 0.62 && Math.abs(q.y - g.stop.y) < g.stop.h * 0.75;

    function pop(pl){
      const st = P[pl]; st.burst = true; st.burstT = time;
      const g = geo(), r = radius(st), cx = g.bx, cy = g.knotY - r * 1.1;
      for(let i = 0; i < 26; i++){
        const a = Math.random() * Math.PI * 2, v = S() * api.rand(0.6, 1.8);
        shards.push({ pl, x: cx + Math.cos(a) * r * 0.6, y: cy + Math.sin(a) * r * 0.6, vx: Math.cos(a) * v, vy: Math.sin(a) * v, rot: Math.random() * 6, va: api.rand(-12, 12), life: 1, sz: S() * api.rand(0.02, 0.05) });
      }
      api.tone(1400, 0.06, 'square', 0.18); api.tone(220, 0.35, 'sawtooth', 0.16, 0.01, 50); api.sfx.splash();
      api.say(L('بووم! 💥', 'Boom! 💥', 'Bum! 💥'), pl, 1300);
      if(!ended){ ended = true; endW = 1 - pl; endAt = time + 1.4; verdict = { burst: pl }; }
    }
    function pump(pl){
      const st = P[pl];
      if(ended || st.stopped || st.burst) return;
      st.s += STEP; st.press = 1; st.wob = 1; st.taps++;
      const close = st.s / BURST;
      api.tone(260 + st.s * 500, 0.09, 'triangle', 0.08, 0, 340 + st.s * 600);
      if(close > 0.8) api.tone(900 + close * 300, 0.04, 'sine', 0.04, 0.05);
      if(st.s >= BURST) pop(pl);
    }
    function judge(){
      if(ended) return;
      ended = true; endAt = time + 1.5;
      const a = P[0].s, b = P[1].s;
      endW = Math.abs(a - b) < 0.001 ? null : a > b ? 0 : 1;
      verdict = { big: endW };
      if(endW === null) api.sfx.buzz(); else api.sfx.coin();
    }

    function drawPump(c, pl, g, st){
      const col = api.players[pl], s = S(), pr = st.press;
      const bodyTop = g.pumpTop + s * 0.02, hy = g.pumpTop - s * 0.05 + pr * s * 0.07;
      c.lineJoin = 'round'; c.strokeStyle = OUT; c.lineWidth = Math.max(3, s * 0.01);
      // hose
      c.strokeStyle = OUT; c.lineWidth = s * 0.03; c.lineCap = 'round';
      c.beginPath(); c.moveTo(g.px + g.pw * 0.5, g.pumpBase - s * 0.03); c.quadraticCurveTo((g.px + g.bx) / 2, g.pumpBase + s * 0.01, g.bx, g.knotY + s * 0.02); c.stroke();
      c.strokeStyle = '#6dd3a8'; c.lineWidth = s * 0.016;
      c.beginPath(); c.moveTo(g.px + g.pw * 0.5, g.pumpBase - s * 0.03); c.quadraticCurveTo((g.px + g.bx) / 2, g.pumpBase + s * 0.01, g.bx, g.knotY + s * 0.02); c.stroke();
      c.lineWidth = Math.max(3, s * 0.01); c.strokeStyle = OUT;
      // rod + handle
      c.fillStyle = '#c9c4dd'; c.beginPath(); c.rect(g.px - s * 0.012, hy, s * 0.024, bodyTop - hy + s * 0.02); c.fill(); c.stroke();
      c.fillStyle = '#ffcd4d'; c.beginPath(); c.roundRect(g.px - g.pw * 0.95, hy - s * 0.035, g.pw * 1.9, s * 0.045, s * 0.022); c.fill(); c.stroke();
      // body
      c.fillStyle = st.stopped ? '#b9b3cc' : col.color;
      c.beginPath(); c.roundRect(g.px - g.pw / 2, bodyTop, g.pw, g.pumpBase - bodyTop, s * 0.02); c.fill(); c.stroke();
      c.fillStyle = 'rgba(255,255,255,.3)'; c.fillRect(g.px - g.pw * 0.32, bodyTop + s * 0.02, g.pw * 0.14, g.pumpBase - bodyTop - s * 0.05);
      // foot plate
      c.fillStyle = '#5b4f8a'; c.beginPath(); c.roundRect(g.px - g.pw * 1.1, g.pumpBase - s * 0.012, g.pw * 2.2, s * 0.035, s * 0.015); c.fill(); c.stroke();
    }
    function mix(h1, h2, k){
      const a = parseInt(h1.slice(1), 16), b = parseInt(h2.slice(1), 16);
      const ch = sh => Math.round(((a >> sh) & 255) * (1 - k) + ((b >> sh) & 255) * k);
      return 'rgb(' + ch(16) + ',' + ch(8) + ',' + ch(0) + ')';
    }
    function drawBalloon(c, pl, g, st){
      if(st.burst){
        // little torn knot left behind
        c.fillStyle = api.players[pl].dark; c.strokeStyle = OUT; c.lineWidth = 3;
        c.beginPath(); c.moveTo(g.bx, g.knotY); c.lineTo(g.bx - S() * 0.03, g.knotY - S() * 0.05); c.lineTo(g.bx, g.knotY - S() * 0.03); c.lineTo(g.bx + S() * 0.03, g.knotY - S() * 0.055); c.closePath(); c.fill(); c.stroke();
        return;
      }
      const s = S(), r = radius(st), close = Math.min(1, st.s / BURST);
      const danger = Math.max(0, (close - 0.6) / 0.4);                 // 0..1 near the limit
      const shakeA = danger * danger * s * 0.008;
      const jx = Math.sin(time * 47 + pl) * shakeA, jy = Math.cos(time * 39 + pl) * shakeA;
      const sq = 1 + st.wob * 0.06 * Math.sin(time * 30);
      const cx = g.bx + jx, cy = g.knotY - r * 1.12 + jy;
      const base = api.players[pl].color, hot = pl === 0 ? '#e0102f' : '#7b3cff';
      c.save(); c.translate(cx, cy); c.scale(sq, 1 / sq);
      // body
      c.fillStyle = danger > 0 ? mix(base, hot, danger * 0.8) : base;
      c.strokeStyle = OUT; c.lineWidth = Math.max(3, s * 0.011);
      c.beginPath();
      c.moveTo(0, r * 1.1);
      c.bezierCurveTo(-r * 0.6, r * 1.0, -r * 1.0, r * 0.45, -r * 0.95, -r * 0.1);
      c.bezierCurveTo(-r * 0.9, -r * 0.75, -r * 0.45, -r * 1.02, 0, -r * 1.02);
      c.bezierCurveTo(r * 0.45, -r * 1.02, r * 0.9, -r * 0.75, r * 0.95, -r * 0.1);
      c.bezierCurveTo(r * 1.0, r * 0.45, r * 0.6, r * 1.0, 0, r * 1.1);
      c.closePath(); c.fill(); c.stroke();
      // shine (gets bigger & brighter near the limit)
      c.fillStyle = 'rgba(255,255,255,' + (0.35 + danger * 0.5) + ')';
      c.beginPath(); c.ellipse(-r * 0.45, -r * 0.5, r * (0.16 + danger * 0.08), r * (0.28 + danger * 0.1), -0.5, 0, Math.PI * 2); c.fill();
      if(danger > 0.3){ c.beginPath(); c.arc(-r * 0.22, -r * 0.78, r * 0.06 * danger, 0, Math.PI * 2); c.fill(); }
      // face
      const er = r * 0.11 * (1 + danger * 0.5), ex = r * 0.3, ey = -r * 0.1;
      for(const sx of [-1, 1]){
        c.fillStyle = '#fff'; c.lineWidth = Math.max(2, r * 0.03);
        c.beginPath(); c.arc(sx * ex, ey, er, 0, Math.PI * 2); c.fill(); c.stroke();
        c.fillStyle = OUT; c.beginPath(); c.arc(sx * ex, ey + er * 0.15, er * (danger > 0.5 ? 0.35 : 0.5), 0, Math.PI * 2); c.fill();
      }
      c.strokeStyle = OUT; c.lineWidth = Math.max(2.5, r * 0.045); c.lineCap = 'round';
      c.beginPath();
      if(danger > 0.5){ // nervous wavy mouth
        const mw = r * 0.34, my = r * 0.28;
        c.moveTo(-mw, my); for(let i = 1; i <= 6; i++) c.lineTo(-mw + mw * 2 * i / 6, my + (i % 2 ? -1 : 1) * r * 0.05);
      } else c.arc(0, r * 0.14, r * 0.22, 0.2 * Math.PI, 0.8 * Math.PI);
      c.stroke();
      if(danger > 0.55) api.emoji(c, '💦', r * 0.78, -r * 0.62, r * 0.32);
      c.restore();
      // knot
      c.fillStyle = danger > 0 ? mix(base, hot, danger * 0.8) : base; c.strokeStyle = OUT; c.lineWidth = 3;
      c.beginPath(); c.moveTo(g.bx, g.knotY - S() * 0.005); c.lineTo(g.bx - S() * 0.028, g.knotY + S() * 0.025); c.lineTo(g.bx + S() * 0.028, g.knotY + S() * 0.025); c.closePath(); c.fill(); c.stroke();
    }

    return {
      update(dt){
        time += dt;
        for(const st of P){ st.press = Math.max(0, st.press - dt * 7); st.wob = Math.max(0, st.wob - dt * 4); }
        for(const sh of shards){ sh.x += sh.vx * dt; sh.y += sh.vy * dt; sh.vx *= 0.94; sh.vy = sh.vy * 0.94 + S() * 1.2 * dt; sh.rot += sh.va * dt; sh.life -= dt * 0.7; }
        for(let i = shards.length - 1; i >= 0; i--) if(shards[i].life <= 0) shards.splice(i, 1);
        if(ended){ if(time >= endAt && !called){ called = true; api.win(endW); } return; }
        if(time >= DUR || (P[0].stopped && P[1].stopped)) judge();
      },
      pointerDown(p){
        const pl = p.player; if(pl !== 0 && pl !== 1 || ended) return;
        const st = P[pl], q = loc(p), g = geo();
        if(inStop(q, g)){
          if(!st.stopped && !st.burst && st.taps > 0){ st.stopped = true; api.sfx.tick(); }
          return;
        }
        pump(pl);
      },
      draw(c){
        const W = api.W, H = api.H, mid = H / 2, hf = half(), s = S();
        // party sky
        c.fillStyle = '#ffe3ef'; c.fillRect(0, 0, W, H);
        c.fillStyle = 'rgba(255,90,95,.16)'; c.fillRect(0, mid, W, mid);
        c.fillStyle = 'rgba(63,169,255,.16)'; c.fillRect(0, 0, W, mid);
        const bunt = ['#ffcd4d', '#6dd3a8', '#b07cff', '#ff9f1c'];
        for(let i = 0; i < 22; i++){ const x = ((i * 79) % 100) / 100 * W, y = ((i * 37 + 11) % 100) / 100 * H; c.fillStyle = bunt[i % 4]; c.globalAlpha = 0.35; c.fillRect(x, y, s * 0.018, s * 0.03); }
        c.globalAlpha = 1;
        c.fillStyle = OUT; c.fillRect(0, mid - 3, W, 6);
        const left = Math.max(0, Math.ceil(DUR - time));
        for(const pl of [0, 1]){
          const st = P[pl], g = geo(), col = api.players[pl];
          c.save(); if(pl === 1){ c.translate(W, H); c.rotate(Math.PI); }
          drawPump(c, pl, g, st);
          drawBalloon(c, pl, g, st);
          // stop button
          const b = g.stop, on = !st.stopped && !st.burst && !ended && st.taps > 0;
          c.globalAlpha = on || st.stopped ? 1 : 0.5;
          c.fillStyle = 'rgba(28,24,56,.3)'; c.beginPath(); c.roundRect(b.x - b.w / 2, b.y - b.h / 2 + 5, b.w, b.h, b.h / 2); c.fill();
          c.fillStyle = st.stopped ? '#3fd47a' : '#ffcd4d'; c.strokeStyle = OUT; c.lineWidth = 4;
          c.beginPath(); c.roundRect(b.x - b.w / 2, b.y - b.h / 2, b.w, b.h, b.h / 2); c.fill(); c.stroke();
          api.text(c, st.stopped ? L('خلّصت ✔', 'Done ✔', 'Bitti ✔') : L('خلص! ✋', 'Stop! ✋', 'Dur! ✋'), b.x, b.y, b.h * 0.42, '#fff7e8', 0);
          c.globalAlpha = 1;
          // timer + hint
          api.text(c, '⏱ ' + api.AR(left), W - s * 0.14, mid + hf * 0.16, s * 0.06, left <= 3 ? '#ff5a5f' : col.dark, 0);
          if(st.taps === 0 && !ended) api.text(c, L('اكبس لتنفخ! 👆', 'Tap to blow! 👆', 'Şişirmek için dokun! 👆'), W / 2, mid + hf * 0.5, s * 0.065, col.dark, 0);
          if(verdict && !called){
            let m = '';
            if(verdict.burst === pl) m = L('فقع بالونك! 😱', 'Your balloon popped! 😱', 'Balonun patladı! 😱');
            else if(verdict.burst === 1 - pl) m = L('بالون رفيقك فقع! 🎉', 'Friend\'s balloon popped! 🎉', 'Arkadaşının balonu patladı! 🎉');
            else if('big' in verdict) m = verdict.big === null ? L('نفس الحجم! 🤝', 'Same size! 🤝', 'Aynı boy! 🤝') : verdict.big === pl ? L('بالونك أكبر! 🎉', 'Yours is bigger! 🎉', 'Seninki daha büyük! 🎉') : L('بالون رفيقك أكبر', 'Friend\'s is bigger', 'Arkadaşınınki büyük');
            if(m){
              c.fillStyle = 'rgba(28,24,56,.7)'; c.beginPath(); c.roundRect(W / 2 - s * 0.4, mid + hf * 0.3 - s * 0.05, s * 0.8, s * 0.1, s * 0.05); c.fill();
              api.text(c, m, W / 2, mid + hf * 0.3, Math.min(s * 0.065, 28), '#ffcd4d', 0);
            }
          }
          c.restore();
        }
        // rubber shards from a burst
        for(const sh of shards){
          c.save(); c.translate(sh.pl === 1 ? W - sh.x : sh.x, sh.pl === 1 ? H - sh.y : sh.y); c.rotate(sh.rot);
          c.globalAlpha = Math.max(0, sh.life); c.fillStyle = api.players[sh.pl].color; c.strokeStyle = OUT; c.lineWidth = 2;
          c.beginPath(); c.moveTo(-sh.sz, -sh.sz * 0.4); c.lineTo(sh.sz * 0.8, -sh.sz * 0.6); c.lineTo(sh.sz * 0.3, sh.sz * 0.5); c.lineTo(-sh.sz * 0.6, sh.sz * 0.3); c.closePath(); c.fill(); c.stroke();
          c.restore();
        }
        c.globalAlpha = 1;
        // big POP star where a balloon burst
        for(const pl of [0, 1]){
          const st = P[pl]; if(!st.burst) continue;
          const k = time - st.burstT; if(k > 0.7) continue;
          const g = geo(), r = g.rmin + (g.rmax - g.rmin) * st.s;
          let x = g.bx, y = g.knotY - r * 1.1; if(pl === 1){ x = W - x; y = H - y; }
          c.save(); c.translate(x, y); c.scale(0.6 + k * 2, 0.6 + k * 2); c.globalAlpha = 1 - k / 0.7;
          c.fillStyle = '#fff3a8'; c.strokeStyle = OUT; c.lineWidth = 3;
          c.beginPath(); for(let i = 0; i < 16; i++){ const a = i / 16 * Math.PI * 2, rr = i % 2 ? r * 0.45 : r * 0.9; c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } c.closePath(); c.fill(); c.stroke();
          api.text(c, L('بوب!', 'Pop!', 'Pat!'), 0, 0, r * 0.4, '#ff5a5f', pl);
          c.restore();
        }
        c.globalAlpha = 1;
      }
    };
  }
});
