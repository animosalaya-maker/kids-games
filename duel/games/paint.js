/* Paint war: a shared floor grid. Each player steers a paint roller by holding a finger in their own half:
   the direction from the middle of your half to your finger is where the roller goes (like a joystick).
   Let go and it keeps rolling straight. Cells under a roller take its colour. After 30 s the most painted floor wins. */
Duel.register({
  id: 'paint', title: 'حرب الألوان', emoji: '🎨', bg: '#ff7aa8',
  help: 'حطّ إصبعك بنصّك وحرّكه لتوجّه الرولّو، لوّن أكتر شي من الأرض بلونك',
  create(api){
    const OUT = '#1c1838', COLS = 14, ROWS = 22, LIMIT = 30, SPEED = 3.6, TURN = 6, BRUSH = 0.95;
    const grid = new Int8Array(COLS * ROWS).fill(-1);
    const count = [0, 0];
    let t = 0, over = false, overT = 0, winner = null;

    function geo(){
      const W = api.W, H = api.H, m0 = Math.min(W, H);
      const strip = api.clamp(H * 0.11, 64, 120);
      const cell = Math.min(W * 0.95 / COLS, (H - strip * 2) / ROWS);
      return { W, H, m0, strip, cell, ox: (W - COLS * cell) / 2, oy: (H - ROWS * cell) / 2 };
    }
    // rollers (cell units); blue is red rotated 180° around the arena centre
    const rollers = [
      { x: COLS * 0.32, y: ROWS - 2.2, a: -Math.PI / 2, want: null, ptr: null, wob: 0 },
      { x: COLS * 0.68, y: 2.2, a: Math.PI / 2, want: null, ptr: null, wob: 0 }
    ];
    let lastPaintSfx = 0;
    function paintAt(pl, r){
      const x0 = Math.max(0, Math.floor(r.x - BRUSH)), x1 = Math.min(COLS - 1, Math.floor(r.x + BRUSH));
      const y0 = Math.max(0, Math.floor(r.y - BRUSH)), y1 = Math.min(ROWS - 1, Math.floor(r.y + BRUSH));
      let fresh = 0;
      for(let y = y0; y <= y1; y++) for(let x = x0; x <= x1; x++){
        const dx = x + 0.5 - r.x, dy = y + 0.5 - r.y;
        if(dx * dx + dy * dy > BRUSH * BRUSH) continue;
        const i = y * COLS + x, o = grid[i];
        if(o === pl) continue;
        if(o >= 0) count[o]--;
        grid[i] = pl; count[pl]++; fresh++;
      }
      if(fresh && t - lastPaintSfx > 0.12){ lastPaintSfx = t; api.tone(300 + pl * 80 + Math.random() * 120, 0.05, 'triangle', 0.035); }
    }
    rollers.forEach((r, i) => paintAt(i, r));

    const pct = i => count[i] / (COLS * ROWS) * 100;

    function steer(p){
      const g = geo(), r = rollers[p.player];
      const cx = g.W / 2, cy = p.player === 0 ? g.H * 0.75 : g.H * 0.25;
      const dx = p.x - cx, dy = p.y - cy;
      if(dx * dx + dy * dy < 14 * 14) return;
      r.want = Math.atan2(dy, dx);
    }

    function drawRoller(c, g, r, pl){
      const P = api.players[pl], cs = g.cell, X = g.ox + r.x * cs, Y = g.oy + r.y * cs;
      c.save(); c.translate(X, Y); c.rotate(r.a);
      // handle from the roller back to the buddy
      c.strokeStyle = OUT; c.lineWidth = 5; c.lineCap = 'round';
      c.beginPath(); c.moveTo(cs * 0.2, 0); c.lineTo(-cs * 0.95, 0); c.stroke();
      c.strokeStyle = '#c9c4d8'; c.lineWidth = 2.5; c.stroke();
      // roller drum (perpendicular to motion, in front)
      const len = cs * 2.0, dep = cs * 0.78;
      c.fillStyle = P.dark; c.strokeStyle = OUT; c.lineWidth = 3;
      c.beginPath(); c.roundRect(cs * 0.25, -len / 2, dep, len, dep * 0.45); c.fill(); c.stroke();
      c.fillStyle = P.color; c.beginPath(); c.roundRect(cs * 0.3, -len / 2 + 4, dep * 0.55, len - 8, dep * 0.3); c.fill();
      // stripes rolling
      c.strokeStyle = 'rgba(255,255,255,.45)'; c.lineWidth = 3;
      const ph = (r.wob * 3) % 1;
      for(let k = 0; k < 2; k++){ const xx = cs * 0.3 + ((k * 0.5 + ph) % 1) * dep * 0.7; c.beginPath(); c.moveTo(xx, -len / 2 + 6); c.lineTo(xx, len / 2 - 6); c.stroke(); }
      c.restore();
      // buddy pushing it, upright for its own player
      const bx = X - Math.cos(r.a) * cs * 1.15, by = Y - Math.sin(r.a) * cs * 1.15;
      c.save(); c.translate(bx, by); if(pl === 1) c.rotate(Math.PI);
      api.buddy(c, 0, 0, cs * 0.62, pl, t + pl, over && winner === pl ? 'happy' : 'idle', null);
      c.restore();
      // direction arrow hint while steering
      if(r.ptr && r.want != null){
        const ax = X + Math.cos(r.want) * cs * 2.3, ay = Y + Math.sin(r.want) * cs * 2.3;
        c.save(); c.translate(ax, ay); c.rotate(r.want);
        c.fillStyle = P.light; c.strokeStyle = OUT; c.lineWidth = 2.5;
        c.beginPath(); c.moveTo(cs * 0.45, 0); c.lineTo(-cs * 0.25, -cs * 0.35); c.lineTo(-cs * 0.25, cs * 0.35); c.closePath(); c.fill(); c.stroke();
        c.restore();
      }
    }

    return {
      update(dt){
        t += dt;
        if(over){ overT += dt; if(overT > 0.8) api.win(winner); return; }
        rollers.forEach((r, i) => {
          if(r.ptr && r.want != null){
            let d = r.want - r.a; d = Math.atan2(Math.sin(d), Math.cos(d));
            r.a += api.clamp(d, -TURN * dt, TURN * dt);
          }
          const step = SPEED * dt;
          r.x += Math.cos(r.a) * step; r.y += Math.sin(r.a) * step; r.wob += step;
          const m = 0.6;
          if(r.x < m){ r.x = m; r.a = Math.PI - r.a; if(r.want != null && r.ptr) r.want = r.a; api.sfx.bounce(); }
          if(r.x > COLS - m){ r.x = COLS - m; r.a = Math.PI - r.a; if(r.want != null && r.ptr) r.want = r.a; api.sfx.bounce(); }
          if(r.y < m){ r.y = m; r.a = -r.a; if(r.want != null && r.ptr) r.want = r.a; api.sfx.bounce(); }
          if(r.y > ROWS - m){ r.y = ROWS - m; r.a = -r.a; if(r.want != null && r.ptr) r.want = r.a; api.sfx.bounce(); }
        });
        // rollers bump each other softly
        const a = rollers[0], b = rollers[1], dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy), min = 1.6;
        if(d < min && d > 0.001){ const push = (min - d) / 2, nx = dx / d, ny = dy / d; a.x -= nx * push; a.y -= ny * push; b.x += nx * push; b.y += ny * push; }
        rollers.forEach((r, i) => { r.x = api.clamp(r.x, 0.6, COLS - 0.6); r.y = api.clamp(r.y, 0.6, ROWS - 0.6); paintAt(i, r); });
        if(t >= LIMIT){
          over = true; const d0 = pct(0) - pct(1);
          winner = Math.abs(d0) <= 0.5 ? null : (d0 > 0 ? 0 : 1);
          api.sfx.splash(); api.say('خلص الوقت! ⏰');
        }
      },
      pointerDown(p){
        const r = rollers[p.player];
        r.ptr = p.id; steer(p);
      },
      pointerMove(p){ if(rollers[p.player].ptr === p.id) steer(p); },
      pointerUp(p){ const r = rollers[p.player]; if(r.ptr === p.id){ r.ptr = null; r.want = null; } },
      draw(c){
        const g = geo(), W = g.W, H = g.H, cs = g.cell;
        c.fillStyle = '#3b2c66'; c.fillRect(0, 0, W, H);
        c.fillStyle = 'rgba(255,90,95,.25)'; c.fillRect(0, H / 2, W, H / 2);
        c.fillStyle = 'rgba(63,169,255,.25)'; c.fillRect(0, 0, W, H / 2);
        const aw = COLS * cs, ah = ROWS * cs;
        c.fillStyle = OUT; c.beginPath(); c.roundRect(g.ox - 7, g.oy - 7, aw + 14, ah + 14, 14); c.fill();
        for(let y = 0; y < ROWS; y++) for(let x = 0; x < COLS; x++){
          const v = grid[y * COLS + x], X = g.ox + x * cs, Y = g.oy + y * cs;
          c.fillStyle = v === 0 ? api.players[0].color : v === 1 ? api.players[1].color : ((x + y) % 2 ? '#fff7e8' : '#f1e6d2');
          c.fillRect(X, Y, cs + 0.5, cs + 0.5);
        }
        // subtle splat texture on painted cells
        c.fillStyle = 'rgba(255,255,255,.18)';
        for(let y = 0; y < ROWS; y++) for(let x = 0; x < COLS; x++){
          if(grid[y * COLS + x] < 0 || (x * 7 + y * 3) % 5) continue;
          c.beginPath(); c.arc(g.ox + (x + 0.35) * cs, g.oy + (y + 0.35) * cs, cs * 0.14, 0, Math.PI * 2); c.fill();
        }
        rollers.forEach((r, i) => drawRoller(c, g, r, i));
        // HUD strip for each player, from their own side
        const left = Math.max(0, LIMIT - t);
        for(const pl of [0, 1]){
          c.save(); if(pl === 1){ c.translate(W, H); c.rotate(Math.PI); }
          const y0 = g.oy + ah + 7, sh = H - y0, cy = y0 + sh / 2;
          const bw = Math.min(W * 0.62, 340), bh = api.clamp(sh * 0.28, 16, 30), bx = (W - bw) / 2, by = cy + sh * 0.12 - bh / 2;
          const me = pct(pl), op = pct(1 - pl);
          c.fillStyle = '#fff7e8'; c.beginPath(); c.roundRect(bx - 6, by - 6, bw + 12, bh + 12, bh / 2 + 6); c.fill();
          c.fillStyle = OUT; c.beginPath(); c.roundRect(bx - 3, by - 3, bw + 6, bh + 6, bh / 2 + 3); c.fill();
          c.fillStyle = '#e9e1d2'; c.beginPath(); c.roundRect(bx, by, bw, bh, bh / 2); c.fill();
          c.save(); c.beginPath(); c.roundRect(bx, by, bw, bh, bh / 2); c.clip();
          c.fillStyle = api.players[pl].color; c.fillRect(bx, by, bw * me / 100, bh);
          c.fillStyle = api.players[1 - pl].color; c.fillRect(bx + bw - bw * op / 100, by, bw * op / 100, bh);
          c.fillStyle = 'rgba(255,255,255,.3)'; c.fillRect(bx, by, bw, bh * 0.35);
          c.restore();
          c.fillStyle = OUT; c.fillRect(W / 2 - 1.5, by - 6, 3, bh + 12);
          const fs = api.clamp(sh * 0.3, 16, 30);
          api.text(c, api.AR(Math.round(me)) + '٪', bx + fs * 1.2, by - fs * 0.75, fs, api.players[pl].color, 0);
          api.text(c, api.AR(Math.round(op)) + '٪', bx + bw - fs * 1.2, by - fs * 0.75, fs * 0.8, api.players[1 - pl].color, 0);
          api.emoji(c, '⏰', W / 2 - fs * 0.6, by - fs * 0.75, fs * 0.8);
          api.text(c, api.AR(Math.ceil(left)), W / 2 + fs * 0.6, by - fs * 0.75, fs * 0.9, left < 6 ? '#ffcd4d' : '#fff7e8', 0);
          c.restore();
        }
      }
    };
  }
});
