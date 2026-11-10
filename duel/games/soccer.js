/* Top-down soccer / air hockey. Each player drags a round striker in their own half. First to 2 goals wins the round. */
Duel.register({
  id: 'soccer', title: 'كرة القدم', emoji: '⚽', bg: '#4cc35a',
  help: 'حرّك اللاعب تبعك بإصبعك واضرب الطابة على جول صاحبك. أول واحد بيجيب جولين بيربح',
  create(api){
    const OUT = '#1c1838', TARGET = 2, LIMIT = 60;
    const goals = [0, 0];
    let pauseT = 0, over = false, lastScorer = -1, t = 0, spin = 0;
    const ball = { x: api.W / 2, y: api.H / 2, vx: 0, vy: 0 };
    const st = [0, 1].map(i => ({ x: api.W / 2, y: 0, tx: api.W / 2, ty: 0, vx: 0, vy: 0, pid: null, hitT: 0 }));
    const confetti = [];

    function geo(){
      const W = api.W, H = api.H, S = Math.min(W, H);
      const gd = Math.max(S * 0.1, 36);                // depth of the goal strip at each edge
      const gw = Math.max(W * 0.42, S * 0.42);
      return {
        W, H, S, mid: H / 2, gd, m: S * 0.03,
        gx0: W / 2 - gw / 2, gx1: W / 2 + gw / 2,
        rs: Math.max(S * 0.085, 26), rb: Math.max(S * 0.05, 15),
        vmaxS: S * 7, vmaxB: S * 4.5
      };
    }
    function home(i){
      const g = geo();
      st[i].x = st[i].tx = g.W / 2;
      st[i].y = st[i].ty = i === 0 ? g.H - g.gd - g.H * 0.12 : g.gd + g.H * 0.12;
      st[i].vx = st[i].vy = 0;
    }
    home(0); home(1);
    function clampStriker(i, x, y, g){
      x = api.clamp(x, g.m + g.rs, g.W - g.m - g.rs);
      if(i === 0) y = api.clamp(y, g.mid + g.rs, g.H - g.gd - g.rs * 0.4);
      else y = api.clamp(y, g.gd + g.rs * 0.4, g.mid - g.rs);
      return [x, y];
    }
    function resetBall(){ const g = geo(); ball.x = g.W / 2; ball.y = g.mid; ball.vx = ball.vy = 0; }

    function goal(scorer){
      goals[scorer]++; lastScorer = scorer; api.sfx.point();
      api.say('جوووول! ⚽', scorer, 1100);
      const g = geo();
      for(let k = 0; k < 40; k++) confetti.push({ x: ball.x, y: ball.y, vx: api.rand(-1, 1) * g.S * 0.9, vy: api.rand(-1, 1) * g.S * 0.9, life: api.rand(0.6, 1.2), col: ['#ffcd4d', '#fff', api.players[scorer].color][k % 3] });
      if(goals[scorer] >= TARGET){ over = true; setTimeout(() => api.win(scorer), 900); }
      pauseT = 1.3;
    }
    function collideStriker(i, g){
      const s = st[i];
      const dx = ball.x - s.x, dy = ball.y - s.y, R = g.rs + g.rb;
      const d2 = dx * dx + dy * dy;
      if(d2 >= R * R) return;
      const d = Math.sqrt(d2) || 0.001, nx = dx / d, ny = dy / d;
      ball.x = s.x + nx * R; ball.y = s.y + ny * R;
      const rvx = ball.vx - s.vx, rvy = ball.vy - s.vy, vn = rvx * nx + rvy * ny;
      if(vn < 0){
        ball.vx -= 1.85 * vn * nx; ball.vy -= 1.85 * vn * ny;
        const sp = Math.hypot(ball.vx, ball.vy);
        if(sp > g.vmaxB){ ball.vx *= g.vmaxB / sp; ball.vy *= g.vmaxB / sp; }
        if(s.hitT <= 0){ if(-vn > g.S * 0.5) api.sfx.hit(); else api.sfx.tap(); s.hitT = 0.12; }
      }
    }
    function collidePost(px, py, g){
      const dx = ball.x - px, dy = ball.y - py, d = Math.hypot(dx, dy), R = g.rb + 4;
      if(d >= R || d === 0) return;
      const nx = dx / d, ny = dy / d;
      ball.x = px + nx * R; ball.y = py + ny * R;
      const vn = ball.vx * nx + ball.vy * ny;
      if(vn < 0){ ball.vx -= 1.8 * vn * nx; ball.vy -= 1.8 * vn * ny; api.sfx.bounce(); }
    }
    function walls(g){
      const r = g.rb, e = 0.85;
      const inMouth = ball.x > g.gx0 + r * 0.2 && ball.x < g.gx1 - r * 0.2;
      const inBoxTop = ball.y < g.gd, inBoxBot = ball.y > g.H - g.gd;
      let lo = g.m + r, hi = g.W - g.m - r;
      if(inBoxTop || inBoxBot){ lo = g.gx0 + r; hi = g.gx1 - r; }
      if(ball.x < lo){ ball.x = lo; ball.vx = Math.abs(ball.vx) * e; api.sfx.bounce(); }
      if(ball.x > hi){ ball.x = hi; ball.vx = -Math.abs(ball.vx) * e; api.sfx.bounce(); }
      if(!inMouth){
        if(ball.y < g.gd + r){ ball.y = g.gd + r; ball.vy = Math.abs(ball.vy) * e; api.sfx.bounce(); }
        if(ball.y > g.H - g.gd - r){ ball.y = g.H - g.gd - r; ball.vy = -Math.abs(ball.vy) * e; api.sfx.bounce(); }
      }
      collidePost(g.gx0, g.gd, g); collidePost(g.gx1, g.gd, g);
      collidePost(g.gx0, g.H - g.gd, g); collidePost(g.gx1, g.H - g.gd, g);
      if(ball.y < r){ ball.y = r; ball.vy = Math.abs(ball.vy) * 0.3; }
      if(ball.y > g.H - r){ ball.y = g.H - r; ball.vy = -Math.abs(ball.vy) * 0.3; }
      // ball fully over the goal line = goal
      if(ball.y < g.gd - r * 0.6) { goal(0); return true; }
      if(ball.y > g.H - g.gd + r * 0.6) { goal(1); return true; }
      return false;
    }
    function onDown(p){ const s = st[p.player]; s.pid = p.id; s.tx = p.x; s.ty = p.y; }
    function onMove(p){ const s = st[p.player]; if(s.pid !== null && s.pid !== p.id) return; s.pid = p.id; s.tx = p.x; s.ty = p.y; }
    function onUp(p){ const s = st[p.player]; if(s.pid === p.id) s.pid = null; }

    function drawBall(c, x, y, r){
      c.fillStyle = 'rgba(0,0,0,.22)'; c.beginPath(); c.ellipse(x + 4, y + 5, r, r * 0.85, 0, 0, Math.PI * 2); c.fill();
      c.save(); c.translate(x, y);
      c.fillStyle = '#fff'; c.strokeStyle = OUT; c.lineWidth = Math.max(3, r * 0.18);
      c.beginPath(); c.arc(0, 0, r, 0, Math.PI * 2); c.fill();
      c.save(); c.clip(); c.rotate(spin);
      c.fillStyle = OUT;
      const pent = (cx, cy, rr) => { c.beginPath(); for(let k = 0; k < 5; k++){ const a = -Math.PI / 2 + k * Math.PI * 2 / 5; c.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); } c.closePath(); c.fill(); };
      pent(0, 0, r * 0.36);
      for(let k = 0; k < 5; k++){ const a = -Math.PI / 2 + k * Math.PI * 2 / 5; pent(Math.cos(a) * r * 0.95, Math.sin(a) * r * 0.95, r * 0.3); }
      c.restore();
      c.beginPath(); c.arc(0, 0, r, 0, Math.PI * 2); c.stroke();
      c.restore();
    }

    return {
      update(dt){
        const g = geo(); t += dt;
        for(const s of st) s.hitT -= dt;
        for(let k = confetti.length - 1; k >= 0; k--){ const q = confetti[k]; q.x += q.vx * dt; q.y += q.vy * dt; q.vx *= 0.96; q.vy *= 0.96; q.life -= dt; if(q.life <= 0) confetti.splice(k, 1); }
        // striker targets -> velocity, capped
        const disp = st.map((s, i) => {
          const [tx, ty] = clampStriker(i, s.tx, s.ty, g);
          let dx = tx - s.x, dy = ty - s.y; const d = Math.hypot(dx, dy), mx = g.vmaxS * dt;
          if(d > mx){ dx *= mx / d; dy *= mx / d; }
          s.vx = dx / dt; s.vy = dy / dt; return [dx, dy];
        });
        if(over && pauseT <= 0){ st.forEach((s, i) => { s.x += disp[i][0]; s.y += disp[i][1]; }); return; }
        if(!over && api.time >= LIMIT){ over = true; api.win(goals[0] > goals[1] ? 0 : goals[1] > goals[0] ? 1 : null); return; }
        if(pauseT > 0){
          st.forEach((s, i) => { s.x += disp[i][0]; s.y += disp[i][1]; });
          pauseT -= dt; if(pauseT <= 0 && !over){ resetBall(); api.sfx.go(); }
          return;
        }
        const fast = Math.max(Math.hypot(ball.vx, ball.vy) * dt, Math.hypot(disp[0][0], disp[0][1]), Math.hypot(disp[1][0], disp[1][1]));
        const n = Math.max(1, Math.min(30, Math.ceil(fast / (g.rb * 0.3))));
        const h = dt / n;
        for(let k = 0; k < n; k++){
          st.forEach((s, i) => { s.x += disp[i][0] / n; s.y += disp[i][1] / n; });
          ball.x += ball.vx * h; ball.y += ball.vy * h;
          collideStriker(0, g); collideStriker(1, g);
          if(walls(g)) return;
        }
        const f = Math.exp(-0.55 * dt); ball.vx *= f; ball.vy *= f;
        spin += (ball.vx + ball.vy) * dt / g.rb * 0.5;
      },
      pointerDown: onDown, pointerMove: onMove, pointerUp: onUp,
      draw(c){
        const g = geo(), W = g.W, H = g.H, mid = g.mid;
        // grass stripes
        const bands = 10;
        for(let k = 0; k < bands; k++){ c.fillStyle = k % 2 ? '#4cc35a' : '#43b552'; c.fillRect(0, k * H / bands, W, H / bands + 1); }
        // out-of-play strips behind goal lines
        c.fillStyle = 'rgba(28,24,56,.18)'; c.fillRect(0, 0, W, g.gd); c.fillRect(0, H - g.gd, W, g.gd);
        // lines
        c.strokeStyle = 'rgba(255,255,255,.9)'; c.lineWidth = Math.max(3, g.S * 0.01);
        c.strokeRect(g.m, g.gd, W - g.m * 2, H - g.gd * 2);
        c.beginPath(); c.moveTo(g.m, mid); c.lineTo(W - g.m, mid); c.stroke();
        c.beginPath(); c.arc(W / 2, mid, g.S * 0.17, 0, Math.PI * 2); c.stroke();
        c.fillStyle = '#fff'; c.beginPath(); c.arc(W / 2, mid, 5, 0, Math.PI * 2); c.fill();
        const bw = (g.gx1 - g.gx0) * 1.5, bh = H * 0.11;
        c.strokeRect(W / 2 - bw / 2, g.gd, bw, bh); c.strokeRect(W / 2 - bw / 2, H - g.gd - bh, bw, bh);
        c.beginPath(); c.arc(W / 2, g.gd + bh, g.S * 0.08, 0, Math.PI); c.stroke();
        c.beginPath(); c.arc(W / 2, H - g.gd - bh, g.S * 0.08, Math.PI, Math.PI * 2); c.stroke();
        // goals (coloured by the defender)
        for(const i of [0, 1]){
          const y0 = i === 0 ? H - g.gd : 0, pl = api.players[i];
          c.fillStyle = 'rgba(255,255,255,.85)'; c.fillRect(g.gx0, y0, g.gx1 - g.gx0, g.gd);
          c.strokeStyle = 'rgba(28,24,56,.25)'; c.lineWidth = 1.5; c.beginPath();
          for(let x = g.gx0; x <= g.gx1; x += 10){ c.moveTo(x, y0); c.lineTo(x, y0 + g.gd); }
          for(let y = y0; y <= y0 + g.gd; y += 10){ c.moveTo(g.gx0, y); c.lineTo(g.gx1, y); }
          c.stroke();
          c.strokeStyle = OUT; c.lineWidth = 9; c.lineCap = 'round';
          const ly = i === 0 ? H - g.gd : g.gd, by = i === 0 ? H - 3 : 3;
          c.beginPath(); c.moveTo(g.gx0, ly); c.lineTo(g.gx0, by); c.lineTo(g.gx1, by); c.lineTo(g.gx1, ly); c.stroke();
          c.strokeStyle = pl.color; c.lineWidth = 5;
          c.beginPath(); c.moveTo(g.gx0, ly); c.lineTo(g.gx0, by); c.lineTo(g.gx1, by); c.lineTo(g.gx1, ly); c.stroke();
          c.lineCap = 'butt';
        }
        // labels
        for(const i of [0, 1]){
          const sx = i === 0 ? 1 : -1;
          const ey = i === 0 ? H - g.gd / 2 : g.gd / 2;
          const lx = W / 2 - sx * (W / 2 - g.gx0 / 2 + 0), rx = W / 2 + sx * (W / 2 - g.gx0 / 2);
          const fs = Math.min(22, g.gd * 0.62);
          api.text(c, 'أهداف: ' + api.AR(goals[i]), lx, ey, fs, '#fff7e8', i);
          api.text(c, '⏱ ' + api.AR(Math.max(0, Math.ceil(LIMIT - api.time))), rx, ey, fs, LIMIT - api.time < 10 ? '#ffcd4d' : '#fff7e8', i);
        }
        // ball
        if(!(pauseT > 0 && lastScorer >= 0)) drawBall(c, ball.x, ball.y, g.rb);
        else if(pauseT < 0.4 && !over){ /* ball about to reappear */ }
        // strikers
        st.forEach((s, i) => {
          const pl = api.players[i];
          c.fillStyle = 'rgba(0,0,0,.2)'; c.beginPath(); c.arc(s.x + 4, s.y + 6, g.rs, 0, Math.PI * 2); c.fill();
          c.fillStyle = pl.dark; c.strokeStyle = OUT; c.lineWidth = 4;
          c.beginPath(); c.arc(s.x, s.y, g.rs, 0, Math.PI * 2); c.fill(); c.stroke();
          let lx = ball.x - s.x, ly = ball.y - s.y; const d = Math.hypot(lx, ly) || 1; lx /= d; ly /= d;
          const mood = pauseT > 0 && lastScorer >= 0 ? (lastScorer === i ? 'happy' : 'sad') : 'idle';
          c.save(); c.translate(s.x, s.y); if(i === 1) c.rotate(Math.PI);
          api.buddy(c, 0, g.rs * 0.08, g.rs * 0.78, i, t, mood, i === 1 ? { x: -lx, y: -ly } : { x: lx, y: ly });
          c.restore();
        });
        for(const q of confetti){ c.fillStyle = q.col; c.globalAlpha = Math.min(1, q.life * 2); c.fillRect(q.x - 4, q.y - 4, 8, 8); }
        c.globalAlpha = 1;
        if(api.time < 2.5) for(const i of [0, 1]) api.text(c, 'حرّك اللاعب 👆', W / 2, i === 0 ? H * 0.62 : H * 0.38, 22, '#fff7e8', i);
      }
    };
  }
});
