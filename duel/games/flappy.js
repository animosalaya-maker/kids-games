/* Flappy bird, split screen. Each kid flies their own bird through the same pipes. Last bird flying wins. */
Duel.register({
  id: 'flappy', title: L('العصفور الطاير', 'Flying Bird', 'Uçan Kuş'), emoji: '🐤', bg: '#54c7ec',
  help: L('اكبس على نصّك ليطير العصفور، وفوت من بين الأنابيب', 'Tap your side to make the bird fly. Go between the pipes', 'Kuşu uçurmak için kendi tarafına dokun, boruların arasından geç'),
  create(api){
    const OUT = '#1c1838', CAP = 60;
    let seed = (Math.random() * 1e9) | 0;
    function rnd(){ seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }
    const gaps = []; let g0 = 0.5;
    for(let i = 0; i < 400; i++){ g0 = Math.max(0.3, Math.min(0.7, g0 + (rnd() - 0.5) * 0.5)); gaps.push(i < 1 ? 0.5 : g0); }

    let time = 0, dist = 0, ended = false, firstDead = -1, firstDeadT = 0;
    const S = () => Math.min(api.W, api.H);
    const geo = () => {
      const W = api.W, H = api.H, mid = H / 2, half = H / 2, ground = half * 0.11;
      const top = mid, floor = H - ground, ph = floor - top;
      return { W, H, mid, half, ground, top, floor, ph, bx: W * 0.3, br: S() * 0.05, pw: S() * 0.17, gap: ph * 0.44, spacing: Math.max(W * 0.6, S() * 0.55) };
    };
    const B = [0, 1].map(() => ({ y: 0, vy: 0, alive: true, started: false, passed: 0, wing: 0, deadT: 0, puffs: [] }));
    (function init(){ const g = geo(); for(const b of B) b.y = g.top + g.ph * 0.5; })();
    const speed = () => S() * 0.38 * (1 + time / 28);
    const pipeX = (i, g) => g.W * 1.6 + i * g.spacing - dist;

    function flap(pl){
      const b = B[pl], g = geo(); if(!b.alive || ended) return;
      b.started = true; b.vy = -g.half * 0.8; b.wing = 1; api.sfx.bounce();
      b.puffs.push({ x: g.bx - g.br, y: b.y + g.br * 0.4, t: 0 });
    }
    function crash(pl){
      const b = B[pl]; if(!b.alive) return;
      b.alive = false; b.deadT = time; b.vy = Math.min(b.vy, -geo().half * 0.4); api.sfx.hit(); api.sfx.buzz();
      if(firstDead < 0){ firstDead = pl; firstDeadT = time; }
    }
    function hitRect(cx, cy, r, x0, y0, x1, y1){
      const nx = Math.max(x0, Math.min(cx, x1)), ny = Math.max(y0, Math.min(cy, y1));
      return (cx - nx) * (cx - nx) + (cy - ny) * (cy - ny) < r * r;
    }

    function drawBird(c, x, y, r, pl, b){
      const col = api.players[pl];
      const ang = b.alive ? Math.max(-0.5, Math.min(1.1, b.vy / (geo().half * 1.4))) : 1.6;
      c.save(); c.translate(x, y); c.rotate(ang);
      c.lineWidth = Math.max(3, r * 0.16); c.strokeStyle = OUT; c.lineJoin = 'round';
      // tail
      c.fillStyle = col.dark; c.beginPath(); c.moveTo(-r * 0.8, -r * 0.1); c.lineTo(-r * 1.45, -r * 0.5); c.lineTo(-r * 1.35, r * 0.35); c.closePath(); c.fill(); c.stroke();
      // body
      c.fillStyle = col.color; c.beginPath(); c.ellipse(0, 0, r * 1.05, r * 0.92, 0, 0, 6.283); c.fill(); c.stroke();
      c.fillStyle = col.light; c.beginPath(); c.ellipse(r * 0.1, r * 0.38, r * 0.62, r * 0.4, 0, 0, 6.283); c.fill();
      // beak
      c.fillStyle = '#ffb627'; c.beginPath(); c.moveTo(r * 0.85, -r * 0.2); c.lineTo(r * 1.55, r * 0.05); c.lineTo(r * 0.85, r * 0.32); c.closePath(); c.fill(); c.stroke();
      // eye
      if(b.alive){
        c.fillStyle = '#fff'; c.beginPath(); c.arc(r * 0.42, -r * 0.32, r * 0.3, 0, 6.283); c.fill(); c.stroke();
        c.fillStyle = OUT; c.beginPath(); c.arc(r * 0.52, -r * 0.3, r * 0.13, 0, 6.283); c.fill();
      } else {
        c.beginPath(); c.moveTo(r * 0.25, -r * 0.5); c.lineTo(r * 0.6, -r * 0.15); c.moveTo(r * 0.6, -r * 0.5); c.lineTo(r * 0.25, -r * 0.15); c.stroke();
      }
      // wing
      const wa = b.alive ? (b.wing > 0 ? -0.9 * b.wing : Math.sin(time * 14) * 0.3) : 0.4;
      c.save(); c.translate(-r * 0.2, r * 0.05); c.rotate(wa);
      c.fillStyle = col.dark; c.beginPath(); c.ellipse(-r * 0.25, 0, r * 0.55, r * 0.32, 0.2, 0, 6.283); c.fill(); c.stroke();
      c.restore();
      c.restore();
    }

    function drawHalf(c, pl){
      const g = geo(), { W, H, mid } = g, b = B[pl], col = api.players[pl];
      c.save();
      if(pl === 1){ c.translate(W, H); c.rotate(Math.PI); }
      c.beginPath(); c.rect(0, mid, W, H - mid); c.clip();
      const sky = c.createLinearGradient(0, mid, 0, H);
      sky.addColorStop(0, pl ? '#8fd3ff' : '#9ee3ff'); sky.addColorStop(1, '#e6f9ff');
      c.fillStyle = sky; c.fillRect(0, mid, W, H - mid);
      // clouds (parallax)
      c.fillStyle = '#fff'; c.strokeStyle = 'rgba(28,24,56,.18)'; c.lineWidth = 3;
      for(let k = 0; k < 4; k++){
        const span = W + S() * 0.6, cx = ((k * span / 4 - dist * 0.25) % span + span) % span - S() * 0.3, cy = g.top + g.ph * (0.2 + ((k * 37) % 50) / 100), s = S() * 0.07;
        c.beginPath(); c.arc(cx, cy, s, 0, 6.283); c.arc(cx + s, cy + s * 0.2, s * 0.8, 0, 6.283); c.arc(cx - s, cy + s * 0.25, s * 0.7, 0, 6.283); c.fill();
      }
      // pipes
      const first = Math.max(0, Math.floor((dist - g.W * 1.6 - g.pw) / g.spacing));
      c.lineWidth = Math.max(3, S() * 0.011); c.strokeStyle = OUT;
      for(let i = first; i < first + 6; i++){
        const x = pipeX(i, g); if(x > W + g.pw) break;
        const gc = g.top + g.ph * gaps[i], gt = gc - g.gap / 2, gb = gc + g.gap / 2, x0 = x - g.pw / 2, lip = g.pw * 0.12, lh = g.pw * 0.32;
        for(const [y0, y1] of [[g.top - 10, gt - lh], [gb + lh, g.floor + 10]]){
          c.fillStyle = '#5fd34a'; c.beginPath(); c.rect(x0, y0, g.pw, y1 - y0); c.fill(); c.stroke();
          c.fillStyle = '#8be86f'; c.fillRect(x0 + g.pw * 0.14, y0 + 2, g.pw * 0.16, y1 - y0 - 4);
          c.fillStyle = '#3fae35'; c.fillRect(x0 + g.pw * 0.74, y0 + 2, g.pw * 0.12, y1 - y0 - 4);
        }
        for(const ly of [gt - lh, gb]){
          c.fillStyle = '#5fd34a'; c.beginPath(); c.roundRect(x0 - lip, ly, g.pw + lip * 2, lh, 6); c.fill(); c.stroke();
          c.fillStyle = '#8be86f'; c.fillRect(x0 - lip + g.pw * 0.12, ly + 4, g.pw * 0.14, lh - 8);
        }
      }
      // ground
      c.fillStyle = '#e8c872'; c.fillRect(0, g.floor, W, g.ground);
      c.fillStyle = '#6dd04a'; c.fillRect(0, g.floor, W, g.ground * 0.32);
      c.fillStyle = '#d2ab52'; const st = S() * 0.08;
      for(let x = -((dist % st) + st); x < W + st; x += st){ c.beginPath(); c.moveTo(x, g.floor + g.ground * 0.32); c.lineTo(x + st * 0.5, g.floor + g.ground * 0.32); c.lineTo(x + st * 0.2, H); c.lineTo(x - st * 0.3, H); c.closePath(); c.fill(); }
      c.strokeStyle = OUT; c.lineWidth = 4; c.beginPath(); c.moveTo(0, g.floor); c.lineTo(W, g.floor); c.stroke();
      // puffs
      for(const p of b.puffs){ c.globalAlpha = 1 - p.t / 0.4; c.fillStyle = '#fff'; c.beginPath(); c.arc(p.x - p.t * S() * 0.3, p.y, g.br * (0.3 + p.t * 1.2), 0, 6.283); c.fill(); }
      c.globalAlpha = 1;
      drawBird(c, g.bx, b.y, g.br, pl, b);
      c.restore();
      // HUD
      c.save();
      if(pl === 1){ c.translate(W, H); c.rotate(Math.PI); }
      c.fillStyle = 'rgba(28,24,56,.75)'; c.beginPath(); c.roundRect(W / 2 - S() * 0.13, H - g.ground * 0.5 - S() * 0.045, S() * 0.26, S() * 0.09, S() * 0.045); c.fill();
      c.strokeStyle = col.color; c.lineWidth = 4; c.stroke();
      api.text(c, '🏁 ' + api.AR(b.passed), W / 2, H - g.ground * 0.5, S() * 0.06, '#fff7e8', 0);
      if(!b.started && b.alive) api.text(c, L('اكبس ليطير! 👆', 'Tap to fly! 👆', 'Uçmak için dokun! 👆'), W / 2, g.top + g.ph * 0.78, S() * 0.07, col.dark, 0);
      if(!b.alive){
        const other = B[1 - pl];
        api.text(c, other.alive ? L('وقع العصفور! 💥', 'The bird fell! 💥', 'Kuş düştü! 💥') : L('وقعوا التنين!', 'Both birds fell!', 'İkisi de düştü!'), W / 2, g.top + g.ph * 0.5, S() * 0.075, '#ff5a5f', 0);
      }
      c.restore();
    }

    function finish(){
      if(ended) return; ended = true;
      const a = B[0], b = B[1];
      if(a.alive && !b.alive) return api.win(0);
      if(b.alive && !a.alive) return api.win(1);
      if(!a.alive && !b.alive){
        if(Math.abs(a.deadT - b.deadT) <= 0.3) return api.win(null);
        return api.win(a.deadT > b.deadT ? 0 : 1);
      }
      api.win(a.passed > b.passed ? 0 : b.passed > a.passed ? 1 : null);
    }

    return {
      update(dt){
        if(ended) return;
        time += dt;
        const g = geo(); dist += speed() * dt;
        const n = Math.ceil(dt / 0.008), h = dt / n;
        for(let pl = 0; pl < 2; pl++){
          const b = B[pl];
          b.wing = Math.max(0, b.wing - dt * 5);
          for(const p of b.puffs) p.t += dt;
          b.puffs = b.puffs.filter(p => p.t < 0.4);
          if(!b.started && b.alive){
            b.y = g.top + g.ph * 0.5 + Math.sin(time * 5) * g.br * 0.5;
            if(time > 1.5) b.started = true;
            continue;
          }
          for(let k = 0; k < n; k++){
            b.vy = Math.min(b.vy + g.half * 2.6 * h, g.half * 1.4); b.y += b.vy * h;
            if(b.y < g.top + g.br){ b.y = g.top + g.br; if(b.vy < 0) b.vy = 0; }
            if(b.y > g.floor - g.br){ b.y = g.floor - g.br; if(b.alive) crash(pl); b.vy = 0; }
            if(b.alive){
              const r = g.br * 0.78, first = Math.max(0, Math.floor((dist - g.W * 1.6 - g.pw) / g.spacing));
              for(let i = first; i < first + 3; i++){
                const x = pipeX(i, g); const gc = g.top + g.ph * gaps[i], gt = gc - g.gap / 2, gb = gc + g.gap / 2;
                if(hitRect(g.bx, b.y, r, x - g.pw / 2, g.top - 50, x + g.pw / 2, gt) || hitRect(g.bx, b.y, r, x - g.pw / 2, gb, x + g.pw / 2, g.floor + 50)){ crash(pl); break; }
              }
            }
          }
          if(b.alive){
            let passed = 0; while(pipeX(passed, g) + g.pw / 2 < g.bx) passed++;
            if(passed > b.passed){ b.passed = passed; api.sfx.coin(); }
          }
        }
        if(firstDead >= 0 && time - firstDeadT > 0.3) finish();
        if(time >= CAP) finish();
      },
      pointerDown(p){ if(p.player === 0 || p.player === 1) flap(p.player); },
      draw(c){
        drawHalf(c, 0); drawHalf(c, 1);
        c.fillStyle = OUT; c.fillRect(0, api.H / 2 - 3, api.W, 6);
      }
    };
  }
});
