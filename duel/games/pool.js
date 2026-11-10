/* Simplified turn-based billiards. Red pockets the red balls, blue pockets the blue balls. Drag back like a slingshot to shoot the white ball. */
Duel.register({
  id: 'pool', title: L('البلياردو', 'Pool', 'Bilardo'), emoji: '🎱', bg: '#3fa9ff',
  help: L('بدورك، اسحب لورا بإصبعك متل النقّيفة وفلّت لتضرب الطابة البيضا. دخّل طابات لونك الثلاثة', 'On your turn, pull back like a slingshot and let go to hit the white ball. Get your 3 balls in the holes!', 'Sıran gelince sapan gibi geri çek ve bırak, beyaz topa vur. Kendi rengindeki 3 topu deliklere sok!'),
  create(api){
    const OUT = '#1c1838', LIMIT = 90, NEED = 3;
    let turn = Math.random() < 0.5 ? 0 : 1;
    const sunk = [0, 0];
    let moving = false, shooter = -1, shotSunk = { own: 0, cue: false }, over = false, t = 0;
    let aim = null;                 // { id, sx, sy, x, y }
    const balls = [];
    let msgT = 0, settleT = 0;

    function geo(){
      const W = api.W, H = api.H, S = Math.min(W, H);
      const rail = Math.max(S * 0.07, 22), railY = Math.max(S * 0.12, 40);
      const r = Math.max(S * 0.036, 11);
      return {
        W, H, S, mid: H / 2, rail, railY, r,
        x0: rail, x1: W - rail, y0: railY, y1: H - railY,
        pc: r * 2.25, ps: r * 1.9,
        vmax: S * 5.2
      };
    }
    function pockets(g){
      return [
        { x: g.x0 + 2, y: g.y0 + 2, r: g.pc }, { x: g.x1 - 2, y: g.y0 + 2, r: g.pc },
        { x: g.x0 + 2, y: g.y1 - 2, r: g.pc }, { x: g.x1 - 2, y: g.y1 - 2, r: g.pc },
        { x: g.x0 - g.r * 0.35, y: g.mid, r: g.ps }, { x: g.x1 + g.r * 0.35, y: g.mid, r: g.ps }
      ];
    }
    function cueHome(p, g){ return { x: g.W / 2, y: p === 0 ? g.mid + (g.y1 - g.mid) * 0.55 : g.mid - (g.mid - g.y0) * 0.55 }; }
    function setup(){
      const g = geo();
      const s = turn === 0 ? 1 : -1;            // rack apex points toward the first shooter
      const dy = g.r * 2 * 0.875, dx = g.r * 2.04;
      const colors = [[0], [1, 0], [1, 0, 1]];  // 3 red (0) + 3 blue (1)
      const cy = g.mid - s * g.H * 0.05;
      for(let row = 0; row < 3; row++) for(let k = 0; k <= row; k++){
        balls.push({ x: g.W / 2 + (k - row / 2) * dx, y: cy + s * (1 - row) * dy, vx: 0, vy: 0, col: colors[row][k], on: true });
      }
      const h = cueHome(turn, g);
      balls.push({ x: h.x, y: h.y, vx: 0, vy: 0, col: -1, on: true, cue: true });
    }
    setup();
    const cue = () => balls[balls.length - 1];

    function placeCue(p){
      const g = geo(), b = cue(), h = cueHome(p, g);
      b.vx = b.vy = 0; b.on = true;
      for(let tries = 0; tries < 40; tries++){
        const x = h.x + (tries ? api.rand(-1, 1) * g.W * 0.3 : 0), y = h.y + (tries ? api.rand(-1, 1) * g.r * 4 : 0);
        if(balls.every(o => o === b || !o.on || Math.hypot(o.x - x, o.y - y) > g.r * 2.2)){ b.x = x; b.y = y; return; }
      }
      b.x = h.x; b.y = h.y;
    }
    function endShot(){
      const g = geo(); moving = false;
      if(sunk[shooter] >= NEED){ over = true; setTimeout(() => api.win(shooter), 700); return; }
      if(sunk[1 - shooter] >= NEED){ over = true; setTimeout(() => api.win(1 - shooter), 700); return; }
      if(shotSunk.cue){ turn = 1 - shooter; placeCue(turn); api.say(api.L('الطابة البيضا فاتت! 😅', 'White ball fell in! 😅', 'Beyaz top düştü! 😅'), shooter, 1200); }
      else if(shotSunk.own > 0){ turn = shooter; api.say(api.L('برافو! العب كمان 🎉', 'Yay! Go again 🎉', 'Bravo! Yine sen oyna 🎉'), shooter, 1200); }
      else turn = 1 - shooter;
      msgT = 1.2;
      void g;
    }
    function physStep(h, g){
      const P = pockets(g);
      for(const b of balls){
        if(!b.on) continue;
        b.x += b.vx * h; b.y += b.vy * h;
        for(const q of P){
          if(Math.hypot(b.x - q.x, b.y - q.y) < q.r){
            b.on = false; b.vx = b.vy = 0; api.sfx.coin();
            if(b.cue){ shotSunk.cue = true; api.sfx.buzz(); }
            else { sunk[b.col]++; if(b.col === shooter) shotSunk.own++; }
            break;
          }
        }
        if(!b.on) continue;
        const e = 0.78;
        if(b.x < g.x0 + g.r){ b.x = g.x0 + g.r; b.vx = Math.abs(b.vx) * e; if(Math.abs(b.vx) > 30) api.sfx.bounce(); }
        if(b.x > g.x1 - g.r){ b.x = g.x1 - g.r; b.vx = -Math.abs(b.vx) * e; if(Math.abs(b.vx) > 30) api.sfx.bounce(); }
        if(b.y < g.y0 + g.r){ b.y = g.y0 + g.r; b.vy = Math.abs(b.vy) * e; if(Math.abs(b.vy) > 30) api.sfx.bounce(); }
        if(b.y > g.y1 - g.r){ b.y = g.y1 - g.r; b.vy = -Math.abs(b.vy) * e; if(Math.abs(b.vy) > 30) api.sfx.bounce(); }
      }
      for(let i = 0; i < balls.length; i++){
        const a = balls[i]; if(!a.on) continue;
        for(let j = i + 1; j < balls.length; j++){
          const b = balls[j]; if(!b.on) continue;
          const dx = b.x - a.x, dy = b.y - a.y, d2 = dx * dx + dy * dy, R = g.r * 2;
          if(d2 >= R * R) continue;
          const d = Math.sqrt(d2) || 0.001, nx = dx / d, ny = dy / d, over = (R - d) / 2;
          a.x -= nx * over; a.y -= ny * over; b.x += nx * over; b.y += ny * over;
          const vn = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
          if(vn < 0){
            const imp = -vn * (1 + 0.95) / 2;
            a.vx -= imp * nx; a.vy -= imp * ny; b.vx += imp * nx; b.vy += imp * ny;
            if(imp > 40) api.tone(900 + Math.min(600, imp), 0.04, 'triangle', Math.min(0.14, 0.03 + imp / 4000));
          }
        }
      }
    }
    function down(p){
      if(over || moving || p.player !== turn || aim) return;
      aim = { id: p.id, sx: p.x, sy: p.y, x: p.x, y: p.y };
    }
    function move(p){ if(aim && aim.id === p.id){ aim.x = p.x; aim.y = p.y; } }
    function power(g){
      if(!aim) return null;
      const dx = aim.sx - aim.x, dy = aim.sy - aim.y, d = Math.hypot(dx, dy);
      if(d < 12) return null;
      return { nx: dx / d, ny: dy / d, p: Math.min(1, d / (g.S * 0.45)) };
    }
    function up(p){
      if(!aim || aim.id !== p.id) return;
      aim.x = p.x; aim.y = p.y;
      const g = geo(), pw = power(g); aim = null;
      if(!pw || moving || over) return;
      const b = cue(), sp = g.vmax * (0.12 + 0.88 * pw.p);
      b.vx = pw.nx * sp; b.vy = pw.ny * sp;
      moving = true; shooter = turn; shotSunk = { own: 0, cue: false }; settleT = 0;
      api.sfx.hit();
    }

    function drawBall(c, b, g){
      c.fillStyle = 'rgba(0,0,0,.25)'; c.beginPath(); c.arc(b.x + 3, b.y + 4, g.r, 0, Math.PI * 2); c.fill();
      const fill = b.cue ? '#fffaf0' : api.players[b.col].color;
      c.fillStyle = fill; c.strokeStyle = OUT; c.lineWidth = Math.max(2.5, g.r * 0.22);
      c.beginPath(); c.arc(b.x, b.y, g.r, 0, Math.PI * 2); c.fill(); c.stroke();
      if(!b.cue){ c.fillStyle = '#fff'; c.beginPath(); c.arc(b.x, b.y, g.r * 0.42, 0, Math.PI * 2); c.fill(); }
      c.fillStyle = 'rgba(255,255,255,.55)'; c.beginPath(); c.arc(b.x - g.r * 0.38, b.y - g.r * 0.38, g.r * 0.22, 0, Math.PI * 2); c.fill();
    }

    return {
      update(dt){
        const g = geo(); t += dt; msgT -= dt;
        if(over) return;
        if(api.time >= LIMIT && !moving){
          over = true; api.win(sunk[0] > sunk[1] ? 0 : sunk[1] > sunk[0] ? 1 : null); return;
        }
        if(!moving) return;
        let vm = 0; for(const b of balls) if(b.on) vm = Math.max(vm, Math.hypot(b.vx, b.vy));
        const n = Math.max(1, Math.min(40, Math.ceil(vm * dt / (g.r * 0.25))));
        for(let k = 0; k < n; k++) physStep(dt / n, g);
        const f = Math.exp(-0.9 * dt), lin = g.S * 0.12 * dt;
        let still = true;
        for(const b of balls){
          if(!b.on) continue;
          const s = Math.hypot(b.vx, b.vy);
          if(s <= lin){ b.vx = b.vy = 0; continue; }
          const k = Math.max(0, (s * f - lin) / s); b.vx *= k; b.vy *= k;
          if(Math.hypot(b.vx, b.vy) > 2) still = false; else b.vx = b.vy = 0;
        }
        settleT += dt;
        if(still || settleT > 12){ for(const b of balls){ b.vx = b.vy = 0; } endShot(); }
      },
      pointerDown: down, pointerMove: move, pointerUp: up,
      draw(c){
        const g = geo(), W = g.W, H = g.H, mid = g.mid;
        // wood rail
        c.fillStyle = '#8a4b2a'; c.fillRect(0, 0, W, H);
        c.fillStyle = '#a65d34'; c.fillRect(4, 4, W - 8, H - 8);
        // cloth
        c.fillStyle = '#2f9e6a'; c.strokeStyle = OUT; c.lineWidth = 5;
        c.beginPath(); c.rect(g.x0, g.y0, g.x1 - g.x0, g.y1 - g.y0); c.fill(); c.stroke();
        // turn tint
        if(!over){ c.fillStyle = turn === 0 ? 'rgba(255,90,95,.14)' : 'rgba(63,169,255,.14)'; if(turn === 0) c.fillRect(g.x0, mid, g.x1 - g.x0, g.y1 - mid); else c.fillRect(g.x0, g.y0, g.x1 - g.x0, mid - g.y0); }
        c.strokeStyle = 'rgba(255,255,255,.25)'; c.lineWidth = 2; c.setLineDash([10, 10]);
        c.beginPath(); c.moveTo(g.x0, mid); c.lineTo(g.x1, mid); c.stroke(); c.setLineDash([]);
        // rail diamonds
        c.fillStyle = '#ffe2a8';
        for(let k = 1; k < 4; k++){ for(const x of [g.x0 / 2, W - g.x0 / 2]){ for(const y of [g.y0 + (mid - g.y0) * k / 4, mid + (g.y1 - mid) * k / 4]){ c.beginPath(); c.arc(x, y, 3, 0, 7); c.fill(); } } }
        // pockets
        for(const q of pockets(g)){ c.fillStyle = '#120f26'; c.strokeStyle = '#5b2e17'; c.lineWidth = 4; c.beginPath(); c.arc(q.x, q.y, q.r, 0, Math.PI * 2); c.fill(); c.stroke(); }
        // aim
        const pw = power(g), b = cue();
        if(pw && b.on){
          const len = g.S * 0.25 + pw.p * g.S * 0.55;
          c.strokeStyle = 'rgba(255,255,255,.8)'; c.lineWidth = 4; c.setLineDash([8, 10]); c.lineCap = 'round';
          c.beginPath(); c.moveTo(b.x, b.y); c.lineTo(b.x + pw.nx * len, b.y + pw.ny * len); c.stroke(); c.setLineDash([]);
          // cue stick behind the ball
          const back = g.r * 1.6 + pw.p * g.S * 0.16, L = g.S * 0.55;
          const ax = b.x - pw.nx * back, ay = b.y - pw.ny * back;
          c.strokeStyle = OUT; c.lineWidth = 12;
          c.beginPath(); c.moveTo(ax, ay); c.lineTo(ax - pw.nx * L, ay - pw.ny * L); c.stroke();
          c.strokeStyle = '#ffcf7a'; c.lineWidth = 7;
          c.beginPath(); c.moveTo(ax, ay); c.lineTo(ax - pw.nx * L, ay - pw.ny * L); c.stroke();
          c.strokeStyle = api.players[turn].color; c.lineWidth = 7;
          c.beginPath(); c.moveTo(ax - pw.nx * L * 0.6, ay - pw.ny * L * 0.6); c.lineTo(ax - pw.nx * L, ay - pw.ny * L); c.stroke();
          c.lineCap = 'butt';
          // power bar in the shooter's half
          const s = turn === 0 ? 1 : -1, by = turn === 0 ? g.y1 - 24 : g.y0 + 24, bw = W * 0.5;
          c.fillStyle = 'rgba(28,24,56,.6)'; c.beginPath(); c.roundRect(W / 2 - bw / 2, by - 9, bw, 18, 9); c.fill();
          c.fillStyle = pw.p > 0.8 ? '#ff5a5f' : pw.p > 0.45 ? '#ffcd4d' : '#3fd47a';
          const fw = bw * pw.p;
          c.beginPath(); c.roundRect(s > 0 ? W / 2 - bw / 2 : W / 2 + bw / 2 - fw, by - 9, Math.max(18, fw), 18, 9); c.fill();
        }
        for(const bl of balls) if(bl.on) drawBall(c, bl, g);
        // ready ring around the cue ball
        if(!moving && !over && !aim && b.on){
          c.strokeStyle = api.players[turn].color; c.lineWidth = 3;
          c.beginPath(); c.arc(b.x, b.y, g.r * (1.6 + Math.sin(t * 6) * 0.2), 0, Math.PI * 2); c.stroke();
        }
        // HUD per player
        for(const i of [0, 1]){
          const s = i === 0 ? 1 : -1, ey = i === 0 ? H - g.railY / 2 : g.railY / 2;
          // pocketed balls of my colour
          for(let k = 0; k < NEED; k++){
            const x = W / 2 + s * (W * 0.06 + k * g.r * 2.4);
            c.fillStyle = k < sunk[i] ? api.players[i].color : 'rgba(28,24,56,.35)'; c.strokeStyle = OUT; c.lineWidth = 2.5;
            c.beginPath(); c.arc(x, ey, g.r * 0.95, 0, Math.PI * 2); c.fill(); c.stroke();
          }
          api.text(c, '⏱ ' + api.AR(Math.max(0, Math.ceil(LIMIT - api.time))), W / 2 - s * W * 0.2, ey, Math.min(22, g.railY * 0.5), LIMIT - api.time < 10 ? '#ffcd4d' : '#fff7e8', i);
          if(!over){
            const my = turn === i && !moving;
            const ty = i === 0 ? mid + (g.y1 - mid) * 0.84 : mid - (mid - g.y0) * 0.84;
            if(my) api.text(c, aim ? api.L('فلّت لتضرب!', 'Let go to hit!', 'Vurmak için bırak!') : api.L('دورك! اسحب لورا 👆', 'Your turn! Pull back 👆', 'Sıra sende! Geri çek 👆'), W / 2, ty, Math.min(26, W * 0.065), '#fff7e8', i);
            else if(!moving && turn !== i) api.text(c, api.L('استنى دورك', 'Wait your turn', 'Sıranı bekle'), W / 2, ty, Math.min(20, W * 0.05), 'rgba(255,255,255,.55)', i);
          }
        }
      }
    };
  }
});
