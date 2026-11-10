/* Snake duel: two snakes share one grid. Each player turns their snake left / right (relative to its heading).
   Red starts at the bottom heading up, blue at the top heading down. Crash = lose; after 45 s the longer snake wins. */
Duel.register({
  id: 'snake', title: L('الأفعى', 'Snake', 'Yılan'), emoji: '🐍', bg: '#7c5cff',
  help: L('كبس عالأسهم لتلفّ الأفعى، كول التفاح وما تخبط بالحيط ولا بالأفعى التانية', 'Tap the arrows to turn. Eat apples, don\'t hit the wall or the other snake!', 'Oklara dokunup dön. Elmaları ye, duvara ve öbür yılana çarpma!'),
  create(api){
    const OUT = '#1c1838', COLS = 13, STEP = 0.16, LIMIT = 45;
    let ROWS = 21, t = 0, acc = 0, over = false, overT = 0, winner = null, flash = 0;

    function sizes(){
      const W = api.W, H = api.H, m0 = Math.min(W, H);
      const btn = api.clamp(m0 * 0.2, 70, 96), pad = Math.max(8, m0 * 0.025);
      const strip = btn + pad * 2;
      return { W, H, m0, btn, pad, strip, availW: W * 0.94, availH: H - strip * 2 - 8 };
    }
    { const s = sizes(); ROWS = api.clamp(Math.floor(s.availH / (s.availW / COLS)), 13, 31); }
    function geo(){
      const s = sizes(), cell = Math.min(s.availW / COLS, s.availH / ROWS);
      s.cell = cell; s.ox = (s.W - COLS * cell) / 2; s.oy = (s.H - ROWS * cell) / 2; return s;
    }

    function mkSnake(x, y, dx, dy){
      const body = [];
      for(let k = 0; k < 3; k++) body.push({ x: x - dx * k, y: y - dy * k });
      return { body, prev: body.map(p => ({ x: p.x, y: p.y })), dir: { x: dx, y: dy }, q: [], grow: 0, dead: false, pressed: [null, null], eatT: 0 };
    }
    const snakes = [mkSnake(3, ROWS - 3, 0, -1), mkSnake(COLS - 4, 2, 0, 1)];
    const apples = [];
    const mir = p => ({ x: COLS - 1 - p.x, y: ROWS - 1 - p.y });
    for(const a of [{ x: 3, y: ROWS - 9 }, { x: 8, y: ROWS - 6 }]){ apples.push(a, mir(a)); }

    function occupied(x, y){
      for(const s of snakes) for(const b of s.body) if(b.x === x && b.y === y) return true;
      for(const a of apples) if(a.x === x && a.y === y) return true;
      return false;
    }
    function spawnApple(){
      for(let k = 0; k < 200; k++){
        const x = Math.floor(Math.random() * COLS), y = Math.floor(Math.random() * ROWS);
        if(!occupied(x, y)){ apples.push({ x, y, born: t }); return; }
      }
    }

    function turn(s, d){ // d = -1 left, +1 right (relative to heading; same handedness for both players)
      const { x, y } = s.dir;
      s.dir = d < 0 ? { x: y, y: -x } : { x: -y, y: x };
    }

    function tick(){
      for(const s of snakes){
        s.prev = s.body.map(p => ({ x: p.x, y: p.y }));
        if(s.q.length) turn(s, s.q.shift());
        const h = s.body[0], nh = { x: h.x + s.dir.x, y: h.y + s.dir.y };
        const ai = apples.findIndex(a => a.x === nh.x && a.y === nh.y);
        if(ai >= 0){ apples.splice(ai, 1); s.grow += 1; s.eatT = 0.3; api.sfx.coin(); }
        s.body.unshift(nh);
        if(s.grow > 0) s.grow--; else s.body.pop();
      }
      snakes.forEach((s, i) => {
        const h = s.body[0], o = snakes[1 - i];
        if(h.x < 0 || h.y < 0 || h.x >= COLS || h.y >= ROWS) s.dead = true;
        for(let k = 1; k < s.body.length; k++) if(s.body[k].x === h.x && s.body[k].y === h.y) s.dead = true;
        for(const b of o.body) if(b.x === h.x && b.y === h.y) s.dead = true;
      });
      const d0 = snakes[0].dead, d1 = snakes[1].dead;
      if(d0 || d1){
        over = true; overT = 0; winner = d0 && d1 ? null : (d0 ? 1 : 0);
        api.sfx.hit(); api.sfx.buzz();
        if(d0 && !d1) api.say(api.L('أوف! خبطت 💥', 'Oops! You crashed 💥', 'Eyvah! Çarptın 💥'), 0); else if(d1 && !d0) api.say(api.L('أوف! خبطت 💥', 'Oops! You crashed 💥', 'Eyvah! Çarptın 💥'), 1); else api.say(api.L('خبطتوا التنين! 💥', 'You both crashed! 💥', 'İkiniz de çarptınız! 💥'));
      }
      while(apples.length < 4) spawnApple();
    }

    /* each player sees the screen from their own side: local coords = rotate 180° for player 1 */
    const toLocal = (pl, x, y) => pl === 1 ? { x: api.W - x, y: api.H - y } : { x, y };
    function btnRects(g){
      const y = g.H - g.pad - g.btn / 2;
      return [{ x: g.pad + g.btn / 2, y }, { x: g.W - g.pad - g.btn / 2, y }];
    }
    function hitBtn(p){
      const g = geo(), L = toLocal(p.player, p.x, p.y);
      if(L.y < g.H / 2) return -1;
      const r = btnRects(g), half = g.btn / 2 + 18;
      for(let k = 0; k < 2; k++) if(Math.abs(L.x - r[k].x) < half && Math.abs(L.y - r[k].y) < half) return k;
      return L.x < g.W / 2 ? 0 : 1; // anywhere else in your half: left side / right side
    }

    function drawBtn(c, x, y, s, dir, pl, down){
      const P = api.players[pl], o = down ? 4 : 0;
      c.fillStyle = OUT; c.beginPath(); c.roundRect(x - s / 2, y - s / 2 + 5, s, s, s * 0.28); c.fill();
      c.fillStyle = down ? P.dark : P.color; c.strokeStyle = OUT; c.lineWidth = 4;
      c.beginPath(); c.roundRect(x - s / 2, y - s / 2 + o, s, s, s * 0.28); c.fill(); c.stroke();
      // curved "turn" arrow
      c.save(); c.translate(x, y + o); c.scale(dir, 1);
      c.strokeStyle = '#fff'; c.lineWidth = s * 0.11; c.lineCap = 'round'; c.lineJoin = 'round';
      c.beginPath(); c.moveTo(s * 0.16, s * 0.24); c.lineTo(s * 0.16, 0); c.quadraticCurveTo(s * 0.16, -s * 0.12, 0, -s * 0.12); c.lineTo(-s * 0.14, -s * 0.12); c.stroke();
      c.fillStyle = '#fff'; c.beginPath(); c.moveTo(-s * 0.3, -s * 0.12); c.lineTo(-s * 0.1, -s * 0.3); c.lineTo(-s * 0.1, s * 0.06); c.closePath(); c.fill();
      c.restore();
    }

    function drawSnake(c, g, s, i, frac){
      const P = api.players[i], cell = g.cell;
      const pts = s.body.map((b, k) => {
        const a = s.prev[k] || s.prev[s.prev.length - 1];
        const f = over ? 1 : frac;
        return { x: g.ox + (a.x + (b.x - a.x) * f + 0.5) * cell, y: g.oy + (a.y + (b.y - a.y) * f + 0.5) * cell };
      });
      const blink = s.dead && Math.floor(overT * 8) % 2 === 0;
      c.lineCap = 'round'; c.lineJoin = 'round';
      c.strokeStyle = OUT; c.lineWidth = cell * 0.84;
      c.beginPath(); pts.forEach((p, k) => k ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y)); c.stroke();
      c.strokeStyle = blink ? '#fff' : P.color; c.lineWidth = cell * 0.62; c.stroke();
      // belly spots
      c.fillStyle = P.light;
      for(let k = 2; k < pts.length; k += 2){ c.beginPath(); c.arc(pts[k].x, pts[k].y, cell * 0.13, 0, Math.PI * 2); c.fill(); }
      // head
      const h = pts[0], d = s.dir, R = cell * (0.55 + s.eatT * 0.4);
      c.fillStyle = blink ? '#fff' : P.color; c.strokeStyle = OUT; c.lineWidth = 3;
      c.beginPath(); c.arc(h.x, h.y, R, 0, Math.PI * 2); c.fill(); c.stroke();
      // tongue
      if(!s.dead && Math.sin(t * 10 + i * 2) > 0.3){
        c.strokeStyle = '#ff3b5c'; c.lineWidth = 2.5;
        const tx = h.x + d.x * R * 1.55, ty = h.y + d.y * R * 1.55;
        c.beginPath(); c.moveTo(h.x + d.x * R * 0.9, h.y + d.y * R * 0.9); c.lineTo(tx, ty);
        c.lineTo(tx + (d.x - d.y) * R * 0.25, ty + (d.y + d.x) * R * 0.25);
        c.moveTo(tx, ty); c.lineTo(tx + (d.x + d.y) * R * 0.25, ty + (d.y - d.x) * R * 0.25); c.stroke();
      }
      // eyes
      const px = -d.y, py = d.x;
      for(const sd of [-1, 1]){
        const ex = h.x + d.x * R * 0.3 + px * sd * R * 0.45, ey = h.y + d.y * R * 0.3 + py * sd * R * 0.45, er = R * 0.33;
        if(s.dead){
          c.strokeStyle = OUT; c.lineWidth = 2.5; c.beginPath();
          c.moveTo(ex - er * 0.7, ey - er * 0.7); c.lineTo(ex + er * 0.7, ey + er * 0.7); c.moveTo(ex + er * 0.7, ey - er * 0.7); c.lineTo(ex - er * 0.7, ey + er * 0.7); c.stroke();
        } else {
          c.fillStyle = '#fff'; c.strokeStyle = OUT; c.lineWidth = 2; c.beginPath(); c.arc(ex, ey, er, 0, Math.PI * 2); c.fill(); c.stroke();
          c.fillStyle = OUT; c.beginPath(); c.arc(ex + d.x * er * 0.4, ey + d.y * er * 0.4, er * 0.5, 0, Math.PI * 2); c.fill();
        }
      }
    }

    return {
      update(dt){
        t += dt;
        for(const s of snakes) s.eatT = Math.max(0, s.eatT - dt);
        if(over){ overT += dt; if(overT > 0.9) api.win(winner); return; }
        acc += dt;
        while(acc >= STEP && !over){ acc -= STEP; tick(); }
        if(!over && t >= LIMIT){
          over = true; overT = 0.3;
          const a = snakes[0].body.length, b = snakes[1].body.length;
          winner = a === b ? null : (a > b ? 0 : 1);
          api.say(winner === null ? api.L('نفس الطول!', 'Same size!', 'Aynı boy!') : api.L('خلص الوقت! ⏰', 'Time\'s up! ⏰', 'Süre bitti! ⏰'));
        }
      },
      pointerDown(p){
        if(over) return;
        const k = hitBtn(p); if(k < 0) return;
        const s = snakes[p.player];
        if(s.q.length < 2) s.q.push(k === 0 ? -1 : 1);
        s.pressed[k] = p.id; api.sfx.tap();
      },
      pointerUp(p){
        for(const s of snakes) for(let k = 0; k < 2; k++) if(s.pressed[k] === p.id) s.pressed[k] = null;
      },
      draw(c){
        const g = geo(), W = g.W, H = g.H, cell = g.cell;
        c.fillStyle = '#5b3fd6'; c.fillRect(0, 0, W, H);
        // player halves tint
        c.fillStyle = 'rgba(255,90,95,.18)'; c.fillRect(0, H / 2, W, H / 2);
        c.fillStyle = 'rgba(63,169,255,.18)'; c.fillRect(0, 0, W, H / 2);
        // arena
        const aw = COLS * cell, ah = ROWS * cell;
        c.fillStyle = OUT; c.beginPath(); c.roundRect(g.ox - 7, g.oy - 7, aw + 14, ah + 14, 16); c.fill();
        c.fillStyle = '#9be36b'; c.fillRect(g.ox, g.oy, aw, ah);
        c.fillStyle = '#8bd65c';
        for(let y = 0; y < ROWS; y++) for(let x = (y % 2); x < COLS; x += 2) c.fillRect(g.ox + x * cell, g.oy + y * cell, cell, cell);
        // apples
        for(const a of apples){
          const pop = a.born != null ? api.clamp((t - a.born) * 4, 0, 1) : 1;
          const bob = Math.sin(t * 4 + a.x + a.y) * cell * 0.04;
          api.emoji(c, '🍎', g.ox + (a.x + 0.5) * cell, g.oy + (a.y + 0.5) * cell + bob, cell * 0.85 * pop);
        }
        const frac = api.clamp(acc / STEP, 0, 1);
        snakes.forEach((s, i) => drawSnake(c, g, s, i, frac));
        // each player's strip with buttons + info, drawn from their own point of view
        const left = Math.max(0, LIMIT - t);
        for(const pl of [0, 1]){
          c.save();
          if(pl === 1){ c.translate(W, H); c.rotate(Math.PI); }
          const r = btnRects(g), s = snakes[pl];
          drawBtn(c, r[0].x, r[0].y, g.btn, 1, pl, s.pressed[0] !== null);
          drawBtn(c, r[1].x, r[1].y, g.btn, -1, pl, s.pressed[1] !== null);
          const cy = H - g.strip / 2, fs = api.clamp(g.m0 * 0.06, 17, 28);
          api.emoji(c, '🐍', W / 2 - fs * 0.8, cy - fs * 0.6, fs);
          api.text(c, api.AR(s.body.length), W / 2 + fs * 0.6, cy - fs * 0.6, fs * 1.05, api.players[pl].light, 0);
          api.emoji(c, '⏰', W / 2 - fs * 0.8, cy + fs * 0.75, fs * 0.8);
          api.text(c, api.AR(Math.ceil(left)), W / 2 + fs * 0.6, cy + fs * 0.75, fs * 0.9, left < 10 ? '#ffcd4d' : '#fff7e8', 0);
          c.restore();
        }
      }
    };
  }
});
