/* Basketball flick duel. Each player has a sliding hoop near the centre line and a ball at their edge.
   Both halves are simulated in the same "bottom half" frame; player 1's half is drawn rotated 180° so it is an exact mirror. */
Duel.register({
  id: 'basketball', title: 'السلة', emoji: '🏀', bg: '#ff8a3d',
  help: 'اسحب الطابة لفوق بسرعة لتفوت بالسلة. أول واحد بيجيب ٥ سلّات بيربح',
  create(api){
    const OUT = '#1c1838', TARGET = 5, LIMIT = 40;
    const P = [0, 1].map(() => ({
      score: 0, state: 'ready', x: 0, y: 0, vx: 0, vy: 0, prevY: 0, scored: false, flyT: 0, waitT: 0,
      touch: null, samples: [], flash: 0, parts: [], swish: 0
    }));
    let over = false, t = 0;

    function geo(){
      const W = api.W, H = api.H, S = Math.min(W, H), mid = H / 2;
      const r = Math.max(S * 0.06, 16);
      const hy = mid + (H / 2) * 0.3;
      const hw = r * 3.8;
      const spawnY = H - (H / 2) * 0.2;
      const g = H * 1.7;
      return { W, H, S, mid, r, hy, hw, spawnY, g, vyMax: Math.sqrt(2 * g * (spawnY - (mid + r * 1.2))) };
    }
    function hoopX(g){ return g.W / 2 + Math.sin(t * 1.25) * (g.W / 2 - g.hw * 0.75 - 6); }
    function spawn(pl){ const g = geo(); pl.x = g.W / 2; pl.y = pl.prevY = g.spawnY; pl.vx = pl.vy = 0; pl.state = 'ready'; pl.scored = false; }
    P.forEach(spawn);

    const local = (p) => p.player === 1 ? { x: api.W - p.x, y: api.H - p.y } : { x: p.x, y: p.y };

    function launch(pl){
      const g = geo(), s = pl.samples;
      if(s.length < 2){ pl.touch = null; return; }
      const a = s[s.length - 1];
      let b = s[0];
      for(let k = s.length - 1; k >= 0; k--){ b = s[k]; if(a.t - s[k].t > 90) break; }
      const dtm = Math.max(16, a.t - b.t) / 1000;
      let vx = (a.x - b.x) / dtm * 0.7, vy = (a.y - b.y) / dtm * 0.7;
      pl.touch = null; pl.samples = [];
      if(vy > -120) return;                     // not an upward flick
      vy = api.clamp(vy, -g.vyMax, -g.vyMax * 0.45);
      vx = api.clamp(vx, -g.W * 1.1, g.W * 1.1);
      pl.vx = vx; pl.vy = vy; pl.state = 'fly'; pl.flyT = 0; pl.scored = false;
      api.sfx.swoosh();
    }
    function down(p){
      const pl = P[p.player]; if(over || pl.state !== 'ready' || pl.touch !== null) return;
      const g = geo(), q = local(p);
      if(Math.hypot(q.x - pl.x, q.y - pl.y) > Math.max(g.r * 3, g.S * 0.2) || q.y < g.hy + g.r * 2) return;
      pl.touch = p.id; pl.samples = [{ x: q.x, y: q.y, t: performance.now() }];
    }
    function move(p){
      const pl = P[p.player]; if(pl.touch !== p.id) return;
      const q = local(p), now = performance.now();
      pl.samples.push({ x: q.x, y: q.y, t: now }); if(pl.samples.length > 20) pl.samples.shift();
      const s0 = pl.samples[0], g = geo();
      if(s0.y - q.y > g.S * 0.22 && pl.state === 'ready') launch(pl);
    }
    function up(p){
      const pl = P[p.player]; if(pl.touch !== p.id) return;
      const q = local(p); pl.samples.push({ x: q.x, y: q.y, t: performance.now() });
      if(pl.state === 'ready') launch(pl); else pl.touch = null;
    }
    function rimHit(pl, px, py, g){
      const dx = pl.x - px, dy = pl.y - py, d = Math.hypot(dx, dy), R = g.r + 5;
      if(d >= R || d === 0) return;
      const nx = dx / d, ny = dy / d;
      pl.x = px + nx * R; pl.y = py + ny * R;
      const vn = pl.vx * nx + pl.vy * ny;
      if(vn < 0){ pl.vx -= 1.6 * vn * nx; pl.vy -= 1.6 * vn * ny; api.sfx.bounce(); }
    }
    function basket(i){
      const pl = P[i], g = geo();
      pl.score++; pl.scored = true; pl.flash = 0.6; pl.swish = 0.4; api.sfx.coin();
      api.say('سلّة! 🏀', i, 800);
      const hx = hoopX(g);
      for(let k = 0; k < 30; k++) pl.parts.push({ x: hx, y: g.hy, vx: api.rand(-1, 1) * g.S * 0.8, vy: api.rand(-1.2, 0.3) * g.S * 0.8, life: api.rand(0.6, 1.1), col: ['#ffcd4d', '#fff', api.players[i].color, '#3fd47a'][k % 4] });
      if(pl.score >= TARGET && !over){ over = true; api.sfx.point(); setTimeout(() => api.win(i), 800); }
    }
    function stepPlayer(i, dt, g){
      const pl = P[i];
      pl.flash = Math.max(0, pl.flash - dt); pl.swish = Math.max(0, pl.swish - dt);
      for(let k = pl.parts.length - 1; k >= 0; k--){ const q = pl.parts[k]; q.vy += g.g * 0.4 * dt; q.x += q.vx * dt; q.y += q.vy * dt; q.life -= dt; if(q.life <= 0) pl.parts.splice(k, 1); }
      if(pl.state === 'wait'){ pl.waitT -= dt; if(pl.waitT <= 0) spawn(pl); return; }
      if(pl.state !== 'fly') return;
      pl.flyT += dt;
      const hx = hoopX(g);
      const n = Math.max(1, Math.ceil(Math.hypot(pl.vx, pl.vy) * dt / (g.r * 0.3)));
      const h = dt / n;
      for(let k = 0; k < n; k++){
        pl.prevY = pl.y;
        pl.vy += g.g * h; pl.x += pl.vx * h; pl.y += pl.vy * h;
        if(pl.x < g.r){ pl.x = g.r; pl.vx = Math.abs(pl.vx) * 0.7; api.sfx.bounce(); }
        if(pl.x > g.W - g.r){ pl.x = g.W - g.r; pl.vx = -Math.abs(pl.vx) * 0.7; api.sfx.bounce(); }
        if(pl.y < g.mid + g.r){ pl.y = g.mid + g.r; pl.vy = Math.abs(pl.vy) * 0.3; api.sfx.bounce(); }
        if(pl.vy > 0){
          rimHit(pl, hx - g.hw / 2, g.hy, g); rimHit(pl, hx + g.hw / 2, g.hy, g);
          if(!pl.scored && pl.prevY < g.hy && pl.y >= g.hy && Math.abs(pl.x - hx) < g.hw / 2 - 4) basket(i);
        }
      }
      if((pl.vy > 0 && pl.y > g.spawnY + g.r * 0.5) || pl.flyT > 4){
        if(!pl.scored) api.sfx.tap();
        pl.state = 'wait'; pl.waitT = 0.25;
      }
    }

    function drawBall(c, x, y, r, rot){
      c.save(); c.translate(x, y); c.rotate(rot || 0);
      c.fillStyle = '#ff8a3d'; c.strokeStyle = OUT; c.lineWidth = Math.max(3, r * 0.14);
      c.beginPath(); c.arc(0, 0, r, 0, Math.PI * 2); c.fill();
      c.lineWidth = Math.max(2, r * 0.09);
      c.beginPath(); c.moveTo(-r, 0); c.lineTo(r, 0); c.moveTo(0, -r); c.lineTo(0, r); c.stroke();
      c.beginPath(); c.arc(-r * 1.25, 0, r * 0.85, -0.85, 0.85); c.stroke();
      c.beginPath(); c.arc(r * 1.25, 0, r * 0.85, Math.PI - 0.85, Math.PI + 0.85); c.stroke();
      c.lineWidth = Math.max(3, r * 0.14); c.beginPath(); c.arc(0, 0, r, 0, Math.PI * 2); c.stroke();
      c.fillStyle = 'rgba(255,255,255,.35)'; c.beginPath(); c.ellipse(-r * 0.4, -r * 0.45, r * 0.25, r * 0.14, -0.6, 0, Math.PI * 2); c.fill();
      c.restore();
    }
    function drawHalf(c, i, g){
      const pl = P[i], col = api.players[i], W = g.W, H = g.H, mid = g.mid;
      // floor
      c.fillStyle = '#f4a259'; c.fillRect(0, mid, W, H - mid);
      c.fillStyle = 'rgba(160,80,30,.12)';
      for(let x = 0; x < W; x += 34) c.fillRect(x, mid, 2, H - mid);
      c.fillStyle = col.light; c.globalAlpha = 0.35; c.fillRect(W / 2 - g.hw * 1.2, g.hy, g.hw * 2.4, H - g.hy); c.globalAlpha = 1;
      c.strokeStyle = 'rgba(255,255,255,.85)'; c.lineWidth = 4;
      c.beginPath(); c.arc(W / 2, H, g.S * 0.42, Math.PI, Math.PI * 2); c.stroke();
      // hoop: backboard, rim, net
      const hx = hoopX(g), hw = g.hw, bh = g.S * 0.2, bw = hw * 1.55;
      c.fillStyle = 'rgba(0,0,0,.15)'; c.beginPath(); c.roundRect(hx - bw / 2 + 5, g.hy - bh + 6, bw, bh + g.S * 0.03, 10); c.fill();
      c.fillStyle = '#ffffff'; c.strokeStyle = OUT; c.lineWidth = 4;
      c.beginPath(); c.roundRect(hx - bw / 2, g.hy - bh, bw, bh + g.S * 0.03, 10); c.fill(); c.stroke();
      c.strokeStyle = col.color; c.lineWidth = 4; c.strokeRect(hx - hw * 0.4, g.hy - bh * 0.62, hw * 0.8, bh * 0.55);
      const ballBehind = pl.state === 'fly' && pl.vy > 0 && pl.y > g.hy - g.r && pl.y < g.hy + g.S * 0.12 && Math.abs(pl.x - hx) < hw / 2 + g.r;
      // back of rim
      c.strokeStyle = OUT; c.lineWidth = 7; c.beginPath(); c.ellipse(hx, g.hy, hw / 2, hw * 0.12, 0, Math.PI, Math.PI * 2); c.stroke();
      c.strokeStyle = '#ff5a1f'; c.lineWidth = 4; c.beginPath(); c.ellipse(hx, g.hy, hw / 2, hw * 0.12, 0, Math.PI, Math.PI * 2); c.stroke();
      if(ballBehind) drawBall(c, pl.x, pl.y, g.r, pl.x * 0.05);
      // net
      const nh = g.S * 0.11 * (1 + pl.swish * 0.5), sw = pl.swish * 6;
      c.strokeStyle = 'rgba(255,255,255,.95)'; c.lineWidth = 2.5;
      c.beginPath();
      for(let k = 0; k <= 6; k++){
        const tx = hx - hw / 2 + hw * k / 6, bx = hx - hw * 0.3 + hw * 0.6 * k / 6 + Math.sin(t * 20) * sw;
        c.moveTo(tx, g.hy); c.lineTo(bx, g.hy + nh);
      }
      for(let k = 1; k <= 3; k++){ const f = k / 3, y = g.hy + nh * f, half = hw / 2 - (hw / 2 - hw * 0.3) * f; c.moveTo(hx - half, y); c.lineTo(hx + half, y); }
      c.stroke();
      // front of rim
      c.strokeStyle = OUT; c.lineWidth = 8; c.beginPath(); c.ellipse(hx, g.hy, hw / 2, hw * 0.12, 0, 0, Math.PI); c.stroke();
      c.strokeStyle = pl.flash > 0 ? '#ffcd4d' : '#ff5a1f'; c.lineWidth = 5; c.beginPath(); c.ellipse(hx, g.hy, hw / 2, hw * 0.12, 0, 0, Math.PI); c.stroke();
      // ball
      if(!ballBehind && pl.state !== 'wait'){
        const sh = Math.max(0.3, 1 - (g.spawnY - pl.y) / (g.spawnY - mid));
        c.fillStyle = 'rgba(0,0,0,.18)'; c.beginPath(); c.ellipse(pl.x, g.spawnY + g.r * 0.95, g.r * sh, g.r * 0.25 * sh, 0, 0, Math.PI * 2); c.fill();
        drawBall(c, pl.x, pl.y, g.r, pl.state === 'fly' ? pl.flyT * 8 : 0);
      }
      if(pl.state === 'ready' && !over){
        const bob = Math.sin(t * 5) * 6;
        c.strokeStyle = col.color; c.lineWidth = 4; c.setLineDash([6, 8]);
        c.beginPath(); c.arc(pl.x, pl.y, g.r * 1.5, 0, Math.PI * 2); c.stroke(); c.setLineDash([]);
        if(pl.score === 0 && api.time < 6) api.text(c, '👆 اسحب لفوق', W / 2, pl.y - g.r * 2.4 + bob, 20, '#fff7e8', 0);
      }
      for(const q of pl.parts){ c.fillStyle = q.col; c.globalAlpha = Math.min(1, q.life * 2); c.fillRect(q.x - 4, q.y - 4, 8, 8); }
      c.globalAlpha = 1;
      // HUD
      const fs = Math.min(22, W * 0.056), ey = H - (H - g.spawnY) * 0.35;
      api.text(c, 'سلّات: ' + api.AR(pl.score), W * 0.8, ey, fs, '#fff7e8', 0);
      const left = Math.max(0, Math.ceil(LIMIT - api.time));
      api.text(c, '⏱ ' + api.AR(left), W * 0.2, ey, fs, left <= 10 ? '#ffe14d' : '#fff7e8', 0);
    }

    return {
      update(dt){
        const g = geo(); t += dt;
        P.forEach((_, i) => stepPlayer(i, dt, g));
        if(!over && api.time >= LIMIT){
          over = true; api.win(P[0].score > P[1].score ? 0 : P[1].score > P[0].score ? 1 : null);
        }
      },
      pointerDown: down, pointerMove: move, pointerUp: up,
      draw(c){
        const g = geo();
        c.save(); drawHalf(c, 0, g); c.restore();
        c.save(); c.translate(g.W, g.H); c.rotate(Math.PI); drawHalf(c, 1, g); c.restore();
        c.fillStyle = OUT; c.fillRect(0, g.mid - 4, g.W, 8);
        c.fillStyle = '#fff'; c.fillRect(0, g.mid - 2, g.W, 4);
      }
    };
  }
});
