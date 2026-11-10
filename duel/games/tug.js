/* Tug of war. One rope across the middle; tap your half fast to pull the knot to your line. */
Duel.register({
  id: 'tug', title: L('شد الحبل', 'Tug of War', 'Halat Çekme'), emoji: '🪢', bg: '#ffa94d',
  help: L('اكبس بسرعة على نصّك لتشد الحبل لعندك', 'Tap fast on your side to pull the rope to you', 'İpi kendine çekmek için kendi tarafına hızlı hızlı dokun'),
  create(api){
    const OUT = '#1c1838', DUR = 30, STEP = 0.042;
    let winner = -1, winAt = 0, time = 0, pos = 0, shown = 0, ended = false, ropeOff = 0;  // pos: +1 = knot on red (bottom) line, -1 = blue (top) line
    const P = [0, 1].map(() => ({ taps: [], pull: 0, dust: [] }));
    const S = () => Math.min(api.W, api.H);
    const lineD = () => api.H / 2 * 0.62;     // distance from centre to each player's line
    const knotY = v => api.H / 2 + v * lineD();

    function tap(pl){
      if(ended) return;
      const st = P[pl];
      pos += pl === 0 ? STEP : -STEP;
      st.taps.push(time); st.pull = 1;
      api.tone(pl === 0 ? 300 : 360, 0.05, 'triangle', 0.08, 0, pl === 0 ? 240 : 290);
      const fy = pl === 0 ? api.H - S() * 0.1 : S() * 0.1;
      for(let i = 0; i < 3; i++) st.dust.push({ x: api.W / 2 + S() * 0.1 * (pl === 0 ? 1 : -1) + (Math.random() - 0.5) * S() * 0.3, y: fy, vx: (Math.random() - 0.5) * S() * 0.6, vy: (pl === 0 ? -1 : 1) * S() * (0.1 + Math.random() * 0.3), t: 0, r: S() * (0.02 + Math.random() * 0.025) });
      if(Math.abs(pos) >= 1){ pos = Math.sign(pos); ended = true; api.sfx.coin(); winner = pl; winAt = time + 0.35; }
    }
    const rate = pl => P[pl].taps.filter(t => time - t < 1).length;

    function drawPuller(c, pl, ropeShift){
      // drawn in the bottom (player 0) orientation; caller rotates for player 1
      const W = api.W, H = api.H, r = S() * 0.1, st = P[pl];
      const lean = 0.12 + Math.min(0.35, rate(pl) * 0.05) + st.pull * 0.08;
      const footY = H - S() * 0.11 + ropeShift, cx = W / 2, bx = cx + r * 0.95;
      // body leans back (toward own edge)
      c.save(); c.translate(bx, footY); c.rotate(lean * 0.5);
      api.buddy(c, 0, -r * 1.0, r, pl, time * (1 + st.pull), st.pull > 0.4 ? 'happy' : 'idle', { x: -0.6, y: -1 });
      c.restore();
      // arms + hands gripping the rope
      const hands = [footY - r * 1.75, footY - r * 0.75];
      c.lineCap = 'round';
      for(const hy of hands){
        c.strokeStyle = OUT; c.lineWidth = r * 0.26; c.beginPath(); c.moveTo(bx - r * 0.5, footY - r * 1.05); c.lineTo(cx + r * 0.1, hy); c.stroke();
        c.strokeStyle = api.players[pl].dark; c.lineWidth = r * 0.14; c.beginPath(); c.moveTo(bx - r * 0.5, footY - r * 1.05); c.lineTo(cx + r * 0.1, hy); c.stroke();
      }
      c.fillStyle = api.players[pl].color; c.strokeStyle = OUT; c.lineWidth = 3;
      for(const hy of hands){ c.beginPath(); c.arc(cx, hy, r * 0.26, 0, 6.283); c.fill(); c.stroke(); }
    }

    return {
      update(dt){
        time += dt;
        if(winner >= 0 && time >= winAt){ api.win(winner); winner = -1; }
        if(!ended){
          pos -= pos * 0.12 * dt;                         // gentle drift back to the centre
          if(time >= DUR){
            ended = true;
            if(Math.abs(pos) < 0.02) api.win(null); else api.win(pos > 0 ? 0 : 1);
          }
        }
        const prev = shown;
        shown += (pos - shown) * Math.min(1, dt * 14);
        ropeOff += (shown - prev) * lineD();
        for(const st of P){
          st.pull = Math.max(0, st.pull - dt * 5);
          st.taps = st.taps.filter(t => time - t < 1);
          for(const d of st.dust){ d.t += dt; d.x += d.vx * dt; d.y += d.vy * dt; }
          st.dust = st.dust.filter(d => d.t < 0.6);
        }
      },
      pointerDown(p){ if(p.player === 0 || p.player === 1) tap(p.player); },
      draw(c){
        const W = api.W, H = api.H, mid = H / 2, s = S();
        // field: sandy ground, each half tinted
        c.fillStyle = '#ffd59a'; c.fillRect(0, 0, W, H);
        c.fillStyle = 'rgba(255,90,95,.18)'; c.fillRect(0, mid, W, mid);
        c.fillStyle = 'rgba(63,169,255,.18)'; c.fillRect(0, 0, W, mid);
        // grass tufts
        c.strokeStyle = 'rgba(80,150,60,.55)'; c.lineWidth = 3; c.lineCap = 'round';
        for(let i = 0; i < 16; i++){
          const x = ((i * 97) % 100) / 100 * W, y = ((i * 61 + 13) % 100) / 100 * H;
          if(Math.abs(x - W / 2) < s * 0.15) continue;
          c.beginPath(); c.moveTo(x - 5, y); c.lineTo(x - 8, y - 9); c.moveTo(x, y); c.lineTo(x, y - 12); c.moveTo(x + 5, y); c.lineTo(x + 8, y - 9); c.stroke();
        }
        // mud puddle in the centre
        c.fillStyle = '#a0673a'; c.strokeStyle = OUT; c.lineWidth = 4;
        c.beginPath(); c.ellipse(W / 2, mid, W * 0.32, s * 0.07, 0, 0, 6.283); c.fill(); c.stroke();
        c.fillStyle = '#b9794a'; c.beginPath(); c.ellipse(W / 2 - W * 0.08, mid - s * 0.015, W * 0.1, s * 0.022, 0, 0, 6.283); c.fill();
        // win lines
        for(const pl of [0, 1]){
          const y = mid + (pl === 0 ? 1 : -1) * lineD(), col = api.players[pl];
          c.strokeStyle = col.dark; c.lineWidth = 6; c.setLineDash([16, 12]);
          c.beginPath(); c.moveTo(s * 0.06, y); c.lineTo(W - s * 0.06, y); c.stroke(); c.setLineDash([]);
          c.save(); if(pl === 1){ c.translate(W, H); c.rotate(Math.PI); }
          const ly = H / 2 + lineD();
          api.emoji(c, '🚩', W * 0.14, ly - s * 0.05, s * 0.09);
          api.emoji(c, '🚩', W * 0.86, ly - s * 0.05, s * 0.09);
          c.restore();
        }
        // rope
        const ky = knotY(shown), rw = s * 0.055;
        const tension = Math.min(1, (rate(0) + rate(1)) / 10);
        c.save();
        c.beginPath();
        const segs = 24, wob = s * 0.012 * (1 - tension * 0.7);
        c.moveTo(W / 2, -10);
        for(let i = 1; i <= segs; i++){ const y = -10 + (H + 20) * i / segs; c.lineTo(W / 2 + Math.sin(i * 1.3 + time * 8) * wob * Math.sin(Math.PI * i / segs), y); }
        c.lineWidth = rw + 8; c.strokeStyle = OUT; c.lineCap = 'butt'; c.stroke();
        c.lineWidth = rw; c.strokeStyle = '#e0b46a'; c.stroke();
        // braid stripes (scroll with the rope)
        c.beginPath(); c.rect(W / 2 - rw / 2, 0, rw, H); c.clip();
        c.strokeStyle = '#b8883f'; c.lineWidth = rw * 0.28;
        const step = rw * 0.9, off = ((ropeOff % step) + step) % step;
        for(let y = -step * 2 + off; y < H + step; y += step){ c.beginPath(); c.moveTo(W / 2 - rw, y); c.lineTo(W / 2 + rw, y + rw * 0.8); c.stroke(); }
        c.restore();
        // dust
        for(const st of P) for(const d of st.dust){ c.globalAlpha = 0.7 * (1 - d.t / 0.6); c.fillStyle = '#e8c48a'; c.beginPath(); c.arc(d.x, d.y, d.r * (1 + d.t * 2), 0, 6.283); c.fill(); }
        c.globalAlpha = 1;
        // pullers (move a little with the knot)
        const shift = shown * S() * 0.06;
        drawPuller(c, 0, shift);
        c.save(); c.translate(W, H); c.rotate(Math.PI); drawPuller(c, 1, -shift); c.restore();
        // knot with flag
        c.fillStyle = '#ffcd4d'; c.strokeStyle = OUT; c.lineWidth = 4;
        c.beginPath(); c.arc(W / 2, ky, rw * 1.05, 0, 6.283); c.fill(); c.stroke();
        c.beginPath(); c.moveTo(W / 2 - rw * 0.6, ky - rw * 0.3); c.lineTo(W / 2 + rw * 0.6, ky + rw * 0.3); c.stroke();
        const fc = shown > 0.05 ? api.players[0].color : shown < -0.05 ? api.players[1].color : '#fff7e8';
        c.fillStyle = fc; c.lineWidth = 3;
        c.beginPath(); c.moveTo(W / 2 + rw, ky - rw * 0.2); c.lineTo(W / 2 + rw * 3.4, ky - rw * 0.9 + Math.sin(time * 9) * rw * 0.25); c.lineTo(W / 2 + rw * 3.1, ky + rw * 0.7 + Math.sin(time * 9 + 1) * rw * 0.25); c.closePath(); c.fill(); c.stroke();
        // HUD: time + hint in each player's view
        const left = Math.max(0, Math.ceil(DUR - time));
        for(const pl of [0, 1]){
          c.save(); if(pl === 1){ c.translate(W, H); c.rotate(Math.PI); }
          const hy = H / 2 + lineD() * 0.5;
          api.text(c, '⏱ ' + api.AR(left), W * 0.8, hy, s * 0.06, left <= 5 ? '#ff5a5f' : '#fff7e8', 0);
          if(time < 3) api.text(c, L('اكبس بسرعة! 👆', 'Tap fast! 👆', 'Hızlı dokun! 👆'), W * 0.27, hy, s * 0.055, api.players[pl].dark, 0);
          c.restore();
        }
      }
    };
  }
});
