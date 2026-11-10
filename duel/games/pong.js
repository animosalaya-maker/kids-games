/* Pong / table tennis seen from above. Red paddle at the bottom, blue at the top. First to 3 points wins the round. */
Duel.register({
  id: 'pong', title: 'تنس الطاولة', emoji: '🏓', bg: '#2fb36d',
  help: 'حرّك المضرب يمين وشمال بإصبعك ورجّع الطابة. أول واحد بيجيب ٣ نقاط بيربح',
  create(api){
    const OUT = '#1c1838', TARGET = 3, LIMIT = 75;
    const pts = [0, 0];
    const pad = [{ x: api.W / 2, tx: api.W / 2, flash: 0 }, { x: api.W / 2, tx: api.W / 2, flash: 0 }];
    const ball = { x: api.W / 2, y: api.H / 2, vx: 0, vy: 0, speed: 0 };
    const trail = [];
    let serveT = 1.0, serveTo = Math.random() < 0.5 ? 0 : 1, over = false, t = 0;

    function geo(){
      const W = api.W, H = api.H, S = Math.min(W, H);
      const m = S * 0.04;
      return {
        W, H, S, m,
        pw: Math.max(S * 0.3, 90), ph: Math.max(S * 0.05, 16),
        py: [H - H * 0.12, H * 0.12],
        r: Math.max(S * 0.035, 9),
        base: H * 0.5, max: H * 1.5
      };
    }
    function serve(){
      const g = geo();
      ball.x = g.W / 2; ball.y = g.H / 2;
      ball.speed = g.base;
      const a = api.rand(-0.45, 0.45);
      ball.vx = Math.sin(a) * ball.speed;
      ball.vy = Math.cos(a) * ball.speed * (serveTo === 0 ? 1 : -1);
      api.sfx.swoosh();
    }
    function point(p){
      pts[p]++; api.sfx.point();
      serveTo = 1 - p; trail.length = 0;
      if(pts[p] >= TARGET){ over = true; setTimeout(() => api.win(p), 600); api.say('نقطة! 🎉', p, 900); return; }
      api.say('نقطة! 🎉', p, 900);
      serveT = 1.1;
      const g = geo(); ball.x = g.W / 2; ball.y = g.H / 2; ball.vx = ball.vy = 0;
    }
    function hitPaddle(i, g){
      const P = pad[i];
      const off = api.clamp((ball.x - P.x) / (g.pw / 2 + g.r), -1, 1);
      const ang = off * 1.0;
      ball.speed = Math.min(g.max, ball.speed * 1.07);
      ball.vx = Math.sin(ang) * ball.speed;
      ball.vy = Math.cos(ang) * ball.speed * (i === 0 ? -1 : 1);
      ball.y = i === 0 ? g.py[0] - g.ph / 2 - g.r : g.py[1] + g.ph / 2 + g.r;
      P.flash = 0.18; api.sfx.hit();
    }
    function step(h, g){
      ball.x += ball.vx * h; ball.y += ball.vy * h;
      const left = g.m + g.r, right = g.W - g.m - g.r;
      if(ball.x < left){ ball.x = left; ball.vx = Math.abs(ball.vx); api.sfx.bounce(); }
      if(ball.x > right){ ball.x = right; ball.vx = -Math.abs(ball.vx); api.sfx.bounce(); }
      for(const i of [0, 1]){
        const py = g.py[i], P = pad[i];
        const toward = i === 0 ? ball.vy > 0 : ball.vy < 0;
        if(!toward) continue;
        if(ball.y + g.r >= py - g.ph / 2 && ball.y - g.r <= py + g.ph / 2 && Math.abs(ball.x - P.x) <= g.pw / 2 + g.r){
          // only bounce if the ball was on the playing side of the paddle
          const front = i === 0 ? ball.y <= py + g.ph * 0.2 : ball.y >= py - g.ph * 0.2;
          if(front) hitPaddle(i, g);
        }
      }
      if(ball.y - g.r > g.H) return point(1), true;
      if(ball.y + g.r < 0) return point(0), true;
      return false;
    }
    function setTarget(p){ pad[p.player].tx = p.x; }

    return {
      update(dt){
        const g = geo(); t += dt;
        for(const P of pad){
          P.tx = api.clamp(P.tx, g.m + g.pw / 2, g.W - g.m - g.pw / 2);
          P.x += (P.tx - P.x) * Math.min(1, dt * 30);
          P.flash = Math.max(0, P.flash - dt);
        }
        if(over) return;
        if(api.time >= LIMIT){
          over = true;
          api.win(pts[0] > pts[1] ? 0 : pts[1] > pts[0] ? 1 : null); return;
        }
        if(serveT > 0){ serveT -= dt; if(serveT <= 0) serve(); return; }
        const dist = ball.speed * dt, n = Math.max(1, Math.ceil(dist / (g.r * 0.4)));
        for(let k = 0; k < n; k++) if(step(dt / n, g)) return;
        trail.push({ x: ball.x, y: ball.y }); if(trail.length > 8) trail.shift();
      },
      pointerDown: setTarget, pointerMove: setTarget,
      draw(c){
        const g = geo(), W = g.W, H = g.H, mid = H / 2;
        c.fillStyle = '#1f8f55'; c.fillRect(0, 0, W, H);
        // table
        c.fillStyle = '#2fb36d'; c.fillRect(g.m, 0, W - g.m * 2, H);
        c.strokeStyle = '#fff'; c.lineWidth = Math.max(4, g.S * 0.012);
        c.strokeRect(g.m + c.lineWidth / 2, c.lineWidth / 2 + g.m * 0.5, W - g.m * 2 - c.lineWidth, H - c.lineWidth - g.m);
        c.lineWidth = Math.max(2, g.S * 0.006);
        c.beginPath(); c.moveTo(W / 2, g.m); c.lineTo(W / 2, H - g.m); c.stroke();
        // net
        c.fillStyle = OUT; c.fillRect(0, mid - 5, W, 10);
        c.fillStyle = '#fff'; c.fillRect(0, mid - 3, W, 6);
        // player half tints
        c.fillStyle = 'rgba(255,90,95,.08)'; c.fillRect(g.m, mid + 5, W - g.m * 2, mid - 5);
        c.fillStyle = 'rgba(63,169,255,.08)'; c.fillRect(g.m, 0, W - g.m * 2, mid - 5);
        // trail + ball
        trail.forEach((p, i) => { c.fillStyle = 'rgba(255,255,255,' + (0.05 + i * 0.03) + ')'; c.beginPath(); c.arc(p.x, p.y, g.r * (0.5 + i * 0.05), 0, Math.PI * 2); c.fill(); });
        c.fillStyle = 'rgba(0,0,0,.18)'; c.beginPath(); c.ellipse(ball.x + 4, ball.y + 5, g.r, g.r * 0.8, 0, 0, Math.PI * 2); c.fill();
        c.fillStyle = '#ffffff'; c.strokeStyle = OUT; c.lineWidth = Math.max(3, g.r * 0.28);
        c.beginPath(); c.arc(ball.x, ball.y, g.r, 0, Math.PI * 2); c.fill(); c.stroke();
        c.fillStyle = '#ffd56b'; c.beginPath(); c.arc(ball.x - g.r * 0.3, ball.y - g.r * 0.3, g.r * 0.28, 0, Math.PI * 2); c.fill();
        // paddles
        for(const i of [0, 1]){
          const P = pad[i], pl = api.players[i], y = g.py[i];
          c.fillStyle = 'rgba(0,0,0,.2)'; c.beginPath(); c.roundRect(P.x - g.pw / 2 + 4, y - g.ph / 2 + 6, g.pw, g.ph, g.ph / 2); c.fill();
          c.fillStyle = P.flash > 0 ? '#fff7e8' : pl.color; c.strokeStyle = OUT; c.lineWidth = 4;
          c.beginPath(); c.roundRect(P.x - g.pw / 2, y - g.ph / 2, g.pw, g.ph, g.ph / 2); c.fill(); c.stroke();
          c.fillStyle = 'rgba(255,255,255,.35)'; c.beginPath(); c.roundRect(P.x - g.pw / 2 + g.ph * 0.4, y - g.ph * 0.25 * (i === 0 ? 1 : -1) - g.ph * 0.1, g.pw - g.ph * 0.8, g.ph * 0.2, g.ph * 0.1); c.fill();
        }
        // points
        for(const i of [0, 1]){
          const s = i === 0 ? 1 : -1, ey = i === 0 ? H - H * 0.045 : H * 0.045;
          const pl = api.players[i];
          // pips
          for(let k = 0; k < TARGET; k++){
            const px = W / 2 + s * (k - 1) * 30 * -1 + s * 56, py = ey;
            c.fillStyle = k < pts[i] ? '#ffcd4d' : 'rgba(255,255,255,.35)'; c.strokeStyle = OUT; c.lineWidth = 3;
            c.beginPath(); c.arc(px, py, 10, 0, Math.PI * 2); c.fill(); c.stroke();
          }
          api.text(c, 'نقاط: ' + api.AR(pts[i]), W / 2 - s * 50, ey, 22, '#fff7e8', i);
          if(api.time < 2.5 && !over) api.text(c, 'حرّك ↔', W / 2, g.py[i] - s * (g.ph + 26), 20, '#fff7e8', i);
          const left = LIMIT - api.time;
          if(left < 10 && !over) api.text(c, '⏱ ' + api.AR(Math.ceil(left)), W / 2, mid + s * 40, 24, '#fff7e8', i);
        }
      }
    };
  }
});
