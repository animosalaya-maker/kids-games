/* Bowling. One lane from top to bottom with 6 pins in the middle. Take turns: swipe from your edge to roll the ball.
   3 rolls each (pins reset every roll). Most pins in total wins. */
Duel.register({
  id: 'bowling', title: 'البولينغ', emoji: '🎳', bg: '#5b6cff',
  help: 'لما يجي دورك اسحب الطابة لقدّام بسرعة لتوقّع القناني',
  create(api){
    const OUT = '#1c1838', ROLLS = 3, AUTO = 12;
    const S = () => Math.min(api.W, api.H);
    const half = () => api.H / 2;
    const LW = () => Math.min(api.W * 0.56, api.H * 0.34);
    const lx0 = () => api.W / 2 - LW() / 2, lx1 = () => api.W / 2 + LW() / 2;
    const GW = () => LW() * 0.1;
    const BR = () => LW() * 0.085, PR = () => LW() * 0.05;
    const toW = (pl, ly) => pl === 0 ? ly : api.H - ly;          // own-frame y (bottom view) → screen y
    const restY = () => api.H - half() * 0.22, foulY = () => api.H / 2 + half() * 0.5;

    const totals = [0, 0], rolls = [0, 0];
    let turn = Math.random() < 0.5 ? 0 : 1, stage = 'aim', stT = 0, time = 0, ended = false;
    let pins = [], ball = null, grab = null, lastHit = 0, pop = null, endAt = 0, endW = null;

    function setPins(shooter){
      const d = shooter === 0 ? 1 : -1, sp = LW() * 0.2, rh = sp * 0.87, cx = api.W / 2, cy = api.H / 2;
      pins = [];
      const rows = [[0], [-0.5, 0.5], [-1, 0, 1]];
      rows.forEach((row, k) => row.forEach(o => pins.push({ x: cx + o * sp, y: cy + d * rh * (1 - k), vx: 0, vy: 0, down: false, dt: 0, ang: 0, gone: false })));
    }
    function setBall(){ ball = { x: api.W / 2, y: toW(turn, restY()), vx: 0, vy: 0, curve: 0, rolling: false, gutter: false, spin: 0, t: 0 }; }
    setPins(turn); setBall();

    function release(){
      if(!grab) return;
      const h = grab.hist, now = h[h.length - 1];
      let old = h[0];
      for(const q of h){ if(now.t - q.t <= 0.12){ old = q; break; } }
      const dtt = Math.max(0.016, now.t - old.t);
      let vx = (now.x - old.x) / dtt, vy = (now.y - old.y) / dtt;   // own frame (bottom view)
      // curve: compare early and late halves of the stroke
      const midI = Math.floor(h.length / 2), a = h[0], m = h[midI];
      const early = (m.x - a.x) / Math.max(0.016, m.t - a.t), late = (now.x - m.x) / Math.max(0.016, now.t - m.t);
      grab = null;
      if(vy > -S() * 0.6){ setBall(); api.say('اسحب لقدّام أسرع! ☝️', turn, 1000); return; }
      const sp = api.clamp(Math.hypot(vx, vy), S() * 1.1, S() * 3.2);
      vx = api.clamp(vx, vy * 0.45, -vy * 0.45);
      const k = sp / Math.hypot(vx, vy); vx *= k; vy *= k;
      const sgn = turn === 0 ? 1 : -1;
      ball.vx = vx * sgn; ball.vy = vy * sgn;
      ball.curve = api.clamp((late - early) * 0.35, -S() * 0.7, S() * 0.7) * sgn;
      ball.rolling = true; stage = 'roll'; stT = 0;
      api.sfx.swoosh(); api.tone(110, 0.6, 'triangle', 0.08, 0.05, 80);
    }
    function autoRoll(){
      const sgn = turn === 0 ? 1 : -1;
      ball.x = api.W / 2 + api.rand(-1, 1) * LW() * 0.25; ball.y = toW(turn, restY());
      ball.vx = api.rand(-0.15, 0.15) * S() * sgn; ball.vy = -S() * 1.4 * sgn; ball.curve = 0;
      ball.rolling = true; stage = 'roll'; stT = 0; grab = null; api.sfx.swoosh();
    }
    function knock(pn, vx, vy){
      if(pn.down) return;
      pn.down = true; pn.ang = Math.atan2(vy, vx) + Math.PI / 2; pn.dt = 0;
      if(time - lastHit > 0.05){ api.tone(api.rand(380, 520), 0.07, 'square', 0.07, 0, 200); lastHit = time; }
    }
    function collide(a, ra, ma, b, rb, mb, onHit){
      const dx = b.x - a.x, dy = b.y - a.y, dist = Math.hypot(dx, dy), md = ra + rb;
      if(dist >= md || dist === 0) return;
      const nx = dx / dist, ny = dy / dist, ov = md - dist;
      a.x -= nx * ov * mb / (ma + mb); a.y -= ny * ov * mb / (ma + mb);
      b.x += nx * ov * ma / (ma + mb); b.y += ny * ov * ma / (ma + mb);
      const rv = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
      if(rv < 0){
        const j = -(1 + 0.55) * rv / (1 / ma + 1 / mb);
        a.vx -= j * nx / ma; a.vy -= j * ny / ma; b.vx += j * nx / mb; b.vy += j * ny / mb;
        if(onHit) onHit(-rv);
      }
    }
    function step(dt){
      const br = BR(), pr = PR(), x0 = lx0(), x1 = lx1(), gw = GW();
      if(ball.rolling){
        ball.t += dt;
        if(!ball.gutter){ ball.vx += ball.curve * dt; }
        ball.x += ball.vx * dt; ball.y += ball.vy * dt;
        ball.spin += Math.hypot(ball.vx, ball.vy) * dt / br;
        ball.vx *= 1 - 0.12 * dt; ball.vy *= 1 - 0.12 * dt;
        if(!ball.gutter && (ball.x < x0 + br * 0.2 || ball.x > x1 - br * 0.2)){
          ball.gutter = true; ball.x = ball.x < api.W / 2 ? x0 - gw / 2 : x1 + gw / 2; ball.vx = 0; api.sfx.bounce();
          api.say('عالقناة! 😅', turn, 900);
        }
        if(!ball.gutter) for(const pn of pins) if(!pn.gone) collide(ball, br, 5, pn, pr, 1, () => knock(pn, pn.vx, pn.vy));
      }
      for(let i = 0; i < pins.length; i++){
        const pn = pins[i]; if(pn.gone) continue;
        pn.x += pn.vx * dt; pn.y += pn.vy * dt;
        const f = Math.exp(-2.6 * dt); pn.vx *= f; pn.vy *= f;
        if(pn.down) pn.dt += dt;
        if(pn.x < x0 - pr || pn.x > x1 + pr){ if(!pn.down) knock(pn, pn.vx, pn.vy); }
        if(pn.x < x0 - gw * 2 || pn.x > x1 + gw * 2 || pn.y < -pr * 4 || pn.y > api.H + pr * 4) pn.gone = true;
        for(let j = i + 1; j < pins.length; j++){
          const q = pins[j]; if(q.gone) continue;
          collide(pn, pr, 1, q, pr, 1, imp => { if(imp > S() * 0.08){ if(pn.down || Math.hypot(pn.vx, pn.vy) > S() * 0.1) knock(q, q.vx, q.vy); if(q.down || Math.hypot(q.vx, q.vy) > S() * 0.1) knock(pn, pn.vx, pn.vy); } });
        }
      }
    }
    function endRoll(){
      const n = pins.filter(p => p.down).length;
      totals[turn] += n; rolls[turn]++;
      pop = { n, pl: turn, t: 0 };
      if(n === 6){ api.sfx.win(); } else if(n > 0) api.sfx.coin(); else api.sfx.buzz();
      stage = 'score'; stT = 0;
    }
    function nextTurn(){
      pop = null;
      if(rolls[0] >= ROLLS && rolls[1] >= ROLLS){
        ended = true; endW = totals[0] === totals[1] ? null : totals[0] > totals[1] ? 0 : 1; endAt = time + 0.6; stage = 'done'; return;
      }
      turn = rolls[1 - turn] < ROLLS ? 1 - turn : turn;
      setPins(turn); setBall(); stage = 'aim'; stT = 0;
    }

    function drawPin(c, pn, pr){
      if(pn.gone) return;
      c.save(); c.translate(pn.x, pn.y);
      if(!pn.down){
        c.fillStyle = 'rgba(28,24,56,.25)'; c.beginPath(); c.arc(pr * 0.18, pr * 0.25, pr * 1.05, 0, Math.PI * 2); c.fill();
        c.fillStyle = '#ffffff'; c.strokeStyle = OUT; c.lineWidth = Math.max(2.5, pr * 0.2);
        c.beginPath(); c.arc(0, 0, pr, 0, Math.PI * 2); c.fill(); c.stroke();
        c.strokeStyle = '#ff4d5a'; c.lineWidth = pr * 0.22; c.beginPath(); c.arc(0, 0, pr * 0.62, 0, Math.PI * 2); c.stroke();
        c.fillStyle = '#ffffff'; c.strokeStyle = OUT; c.lineWidth = Math.max(2, pr * 0.14); c.beginPath(); c.arc(0, 0, pr * 0.36, 0, Math.PI * 2); c.fill(); c.stroke();
      } else {
        // lying pin, spinning a little as it slides
        c.rotate(pn.ang + pn.dt * 4 * Math.exp(-pn.dt * 2));
        c.globalAlpha = Math.max(0.55, 1 - pn.dt * 0.3);
        c.fillStyle = '#ffffff'; c.strokeStyle = OUT; c.lineWidth = Math.max(2.5, pr * 0.18);
        const L = pr * 2.6;
        c.beginPath(); c.ellipse(0, L * 0.18, pr * 0.95, L * 0.42, 0, 0, Math.PI * 2); c.fill(); c.stroke();
        c.beginPath(); c.ellipse(0, -L * 0.36, pr * 0.55, L * 0.24, 0, 0, Math.PI * 2); c.fill(); c.stroke();
        c.fillStyle = '#ff4d5a'; c.fillRect(-pr * 0.5, -L * 0.2, pr, pr * 0.22); c.fillRect(-pr * 0.5, -L * 0.12, pr, pr * 0.22);
      }
      c.restore();
    }
    function drawBall(c){
      const br = BR(), col = api.players[turn];
      c.save(); c.translate(ball.x, ball.y);
      c.fillStyle = 'rgba(28,24,56,.3)'; c.beginPath(); c.arc(br * 0.15, br * 0.22, br, 0, Math.PI * 2); c.fill();
      c.fillStyle = col.color; c.strokeStyle = OUT; c.lineWidth = Math.max(3, br * 0.14);
      c.beginPath(); c.arc(0, 0, br, 0, Math.PI * 2); c.fill(); c.stroke();
      c.save(); c.beginPath(); c.arc(0, 0, br * 0.93, 0, Math.PI * 2); c.clip();
      const ph = ball.spin % (Math.PI * 2), dir = ball.vy < 0 ? -1 : 1;
      const oy = Math.sin(ph) * br * 0.9 * dir, vis = Math.cos(ph);
      if(vis > -0.2){
        c.fillStyle = col.dark;
        for(const [hx, hy] of [[-0.25, -0.2], [0.25, -0.2], [0, 0.25]]){ c.beginPath(); c.ellipse(hx * br, hy * br * Math.max(0.2, vis) + oy, br * 0.15, br * 0.15 * Math.max(0.3, vis), 0, 0, Math.PI * 2); c.fill(); }
      }
      c.restore();
      c.fillStyle = 'rgba(255,255,255,.45)'; c.beginPath(); c.ellipse(-br * 0.38, -br * 0.42, br * 0.28, br * 0.16, -0.6, 0, Math.PI * 2); c.fill();
      c.restore();
    }

    function move(p){
      if(!grab || grab.id !== p.id || stage !== 'aim') return;
      const lx = turn === 0 ? p.x : api.W - p.x, ly = turn === 0 ? p.y : api.H - p.y;
      grab.hist.push({ x: lx, y: ly, t: performance.now() / 1000 });
      if(grab.hist.length > 30) grab.hist.shift();
      const br = BR();
      const bx = api.clamp(lx, lx0() + br * 1.1, lx1() - br * 1.1);
      const by = api.clamp(ly, foulY() + br, api.H - br * 1.1);
      ball.x = turn === 0 ? bx : api.W - bx; ball.y = toW(turn, by);
      if(ly < foulY()) release();
    }
    return {
      update(dt){
        time += dt; stT += dt;
        if(ended){ if(time >= endAt) api.win(endW); return; }
        if(stage === 'aim' && stT > AUTO && !grab){ autoRoll(); api.say('رمية تلقائية 🎳', turn, 900); }
        if(stage === 'roll'){
          const n = 4; for(let i = 0; i < n; i++) step(dt / n);
          const off = ball.y < -BR() * 2 || ball.y > api.H + BR() * 2;
          const slow = Math.hypot(ball.vx, ball.vy) < S() * 0.15;
          const pinsStill = pins.every(p => p.gone || Math.hypot(p.vx, p.vy) < S() * 0.05);
          if(((off || slow) && pinsStill && stT > 0.4) || stT > 4.5) endRoll();
        } else if(stage === 'score'){
          if(pop) pop.t += dt;
          for(const pn of pins) if(pn.down) pn.dt += dt;
          if(stT > 1.6) nextTurn();
        }
      },
      pointerDown(p){
        if(ended || stage !== 'aim' || p.player !== turn || grab) return;
        const ly = turn === 0 ? p.y : api.H - p.y;
        if(ly < foulY()) return;
        grab = { id: p.id, hist: [] };
        move(p);
        api.sfx.tap();
      },
      pointerMove: move,
      pointerUp(p){
        if(!grab || grab.id !== p.id) return;
        move(p);
        if(grab) release();
      },
      draw(c){
        const W = api.W, H = api.H, mid = H / 2, hf = half(), s = S(), lw = LW(), x0 = lx0(), x1 = lx1(), gw = GW(), br = BR(), pr = PR();
        // alley
        c.fillStyle = '#3a3f8f'; c.fillRect(0, 0, W, H);
        c.fillStyle = 'rgba(255,90,95,.18)'; c.fillRect(0, mid, W, mid);
        c.fillStyle = 'rgba(63,169,255,.18)'; c.fillRect(0, 0, W, mid);
        // side stars decoration
        c.fillStyle = 'rgba(255,255,255,.12)';
        for(let i = 0; i < 14; i++){ const x = i % 2 ? (W - x1 - gw) * 0.5 + x1 + gw : (x0 - gw) * 0.5, y = (i + 0.5) / 14 * H; c.beginPath(); c.arc(x, y, s * 0.012, 0, Math.PI * 2); c.fill(); }
        // gutters
        c.fillStyle = '#23275e'; c.strokeStyle = OUT; c.lineWidth = 4;
        c.beginPath(); c.roundRect(x0 - gw, -10, lw + gw * 2, H + 20, gw); c.fill(); c.stroke();
        // lane wood
        c.fillStyle = '#f2c48d'; c.fillRect(x0, -10, lw, H + 20);
        c.strokeStyle = 'rgba(160,103,58,.35)'; c.lineWidth = 2;
        for(let k = 1; k < 8; k++){ const x = x0 + lw * k / 8; c.beginPath(); c.moveTo(x, 0); c.lineTo(x, H); c.stroke(); }
        c.strokeStyle = OUT; c.lineWidth = 4; c.beginPath(); c.moveTo(x0, -10); c.lineTo(x0, H + 10); c.moveTo(x1, -10); c.lineTo(x1, H + 10); c.stroke();
        // pin deck
        c.fillStyle = 'rgba(255,255,255,.25)'; c.beginPath(); c.ellipse(W / 2, mid, lw * 0.42, lw * 0.4, 0, 0, Math.PI * 2); c.fill();
        // each player's foul line, arrows, and rack
        for(const pl of [0, 1]){
          c.save(); if(pl === 1){ c.translate(W, H); c.rotate(Math.PI); }
          const fy = foulY(), col = api.players[pl], active = turn === pl && !ended;
          c.fillStyle = col.color; c.fillRect(x0, fy - 3, lw, 6);
          c.fillStyle = active ? col.dark : 'rgba(160,103,58,.5)';
          for(let k = -2; k <= 2; k++){ const ax = W / 2 + k * lw * 0.17, ay = fy - hf * 0.12 - Math.abs(k) * hf * 0.025; c.beginPath(); c.moveTo(ax, ay - lw * 0.05); c.lineTo(ax - lw * 0.035, ay + lw * 0.03); c.lineTo(ax + lw * 0.035, ay + lw * 0.03); c.closePath(); c.fill(); }
          // rolls left: little balls in the right margin
          const rx = (x1 + gw + W) / 2;
          for(let i = 0; i < ROLLS; i++){
            const ry = H - hf * 0.12 - i * s * 0.085, on = i < ROLLS - rolls[pl];
            c.globalAlpha = on ? 1 : 0.25;
            c.fillStyle = col.color; c.strokeStyle = OUT; c.lineWidth = 3;
            c.beginPath(); c.arc(rx, ry, s * 0.03, 0, Math.PI * 2); c.fill(); c.stroke();
          }
          c.globalAlpha = 1;
          // total in the left margin
          const tx = (x0 - gw) / 2;
          api.emoji(c, '🎳', tx, H - hf * 0.31, s * 0.07);
          api.text(c, api.AR(totals[pl]), tx, H - hf * 0.18, s * 0.085, col.light, 0);
          c.restore();
        }
        for(const pn of pins) if(pn.down) drawPin(c, pn, pr);
        for(const pn of pins) if(!pn.down) drawPin(c, pn, pr);
        if(stage !== 'score' && stage !== 'done' && ball) drawBall(c);
        // turn text in each half
        for(const pl of [0, 1]){
          c.save(); if(pl === 1){ c.translate(W, H); c.rotate(Math.PI); }
          const ty = mid + hf * 0.66;
          let msg, colr;
          if(ended) msg = '';
          else if(turn === pl){ msg = stage === 'aim' ? 'دورك! اسحب الطابة ☝️' : ''; colr = '#fff7e8'; }
          else { msg = 'دور رفيقك… 👀'; colr = 'rgba(255,247,232,.8)'; }
          if(msg){
            c.fillStyle = 'rgba(28,24,56,.6)'; c.beginPath(); c.roundRect(W / 2 - s * 0.36, ty - s * 0.045, s * 0.72, s * 0.09, s * 0.045); c.fill();
            api.text(c, msg, W / 2, ty, Math.min(s * 0.055, 24), colr, 0);
          }
          if(turn === pl && stage === 'aim' && !grab){
            // pulsing hand hint
            const k = (time * 1.2) % 1;
            api.emoji(c, '👆', W / 2 + lw * 0.32, H - hf * 0.12 - k * hf * 0.2, s * 0.08);
          }
          if(pop){
            const big = pop.n === 6 ? 'سترايك! 🎉' : pop.n === 0 ? 'ولا وحدة! 😅' : '+' + api.AR(pop.n) + ' 🎳';
            const sc = 1 + 0.3 * Math.max(0, 1 - pop.t * 4);
            api.text(c, big, W / 2, mid + hf * 0.3, Math.min(s * 0.1, 40) * sc, pop.pl === pl ? '#ffcd4d' : '#fff7e8', 0);
          }
          c.restore();
        }
      }
    };
  }
});
