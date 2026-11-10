/* Sumo push: two buddies on a round ring. Each one keeps slowly spinning and shows an arrow where it faces.
   Tap anywhere in your half to dash that way (short cooldown). Bump the other one out of the ring!
   After 30 s the one closer to the centre wins. */
Duel.register({
  id: 'sumo', title: 'دفّش برّا', emoji: '🥊', bg: '#ffb347',
  help: 'كبس بنصّك لتنطّ لقدّام عاتجاه السهم، ودفّش رفيقك برّا الحلبة',
  create(api){
    const OUT = '#1c1838', LIMIT = 30, COOL = 0.45, SPINW = 2.4, FRICTION = 2.2;
    let t = 0, over = false, overT = 0, winner = null, shake = 0;
    const sparks = [];

    function geo(){
      const W = api.W, H = api.H, m0 = Math.min(W, H);
      const R = Math.min(W * 0.43, H * 0.3);
      return { W, H, m0, R, cx: W / 2, cy: H / 2, r: R * 0.2 };
    }
    // positions in units of R (ring radius) so resizing keeps the game state
    const bods = [
      { x: 0, y: 0.5, vx: 0, vy: 0, a: -Math.PI / 2, cool: 0, out: false, fall: 0, squash: 0, mass: 1 },
      { x: 0, y: -0.5, vx: 0, vy: 0, a: Math.PI / 2, cool: 0, out: false, fall: 0, squash: 0, mass: 1 }
    ];
    const RB = 0.2, DASH = 1.7; // body radius and dash speed (in R units)

    function dash(i){
      const b = bods[i];
      if(over || b.out || b.cool > 0) return;
      b.vx += Math.cos(b.a) * DASH; b.vy += Math.sin(b.a) * DASH;
      const sp = Math.hypot(b.vx, b.vy), MAX = DASH * 1.5;
      if(sp > MAX){ b.vx *= MAX / sp; b.vy *= MAX / sp; }
      b.cool = COOL; b.squash = 1; api.sfx.swoosh();
    }

    function collide(){
      const a = bods[0], b = bods[1];
      if(a.out || b.out) return;
      const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy), min = RB * 2;
      if(d >= min || d < 1e-6) return;
      const nx = dx / d, ny = dy / d, ov = min - d, tm = a.mass + b.mass;
      a.x -= nx * ov * b.mass / tm; a.y -= ny * ov * b.mass / tm;
      b.x += nx * ov * a.mass / tm; b.y += ny * ov * a.mass / tm;
      const rv = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
      if(rv >= 0) return;
      const e = 1.05, j = -(1 + e) * rv / (1 / a.mass + 1 / b.mass);
      a.vx -= j * nx / a.mass; a.vy -= j * ny / a.mass;
      b.vx += j * nx / b.mass; b.vy += j * ny / b.mass;
      if(-rv > 0.6){
        api.sfx.hit(); api.sfx.bounce(); shake = Math.min(1, -rv / 3);
        sparks.push({ x: a.x + nx * RB, y: a.y + ny * RB, life: 0.35 });
      }
    }

    function endWith(w){ if(over) return; over = true; overT = 0; winner = w; }

    return {
      update(dt){
        t += dt;
        shake = Math.max(0, shake - dt * 3);
        for(const s of sparks) s.life -= dt;
        while(sparks.length && sparks[0].life <= 0) sparks.shift();
        for(const b of bods){
          b.squash = Math.max(0, b.squash - dt * 4);
          if(b.out){ b.fall += dt; b.x += b.vx * dt * 0.4; b.y += b.vy * dt * 0.4; continue; }
          b.cool = Math.max(0, b.cool - dt);
          b.a += SPINW * dt; // same screen handedness for both = mirror-fair
        }
        if(over){ overT += dt; if(overT > 1.0) api.win(winner); }
        // physics sub-steps
        const N = 4, h = dt / N;
        for(let s = 0; s < N; s++){
          for(const b of bods){
            if(b.out) continue;
            const f = Math.exp(-FRICTION * h);
            b.vx *= f; b.vy *= f;
            b.x += b.vx * h; b.y += b.vy * h;
          }
          collide();
        }
        if(over) return;
        const outs = bods.map(b => !b.out && Math.hypot(b.x, b.y) > 1);
        if(outs[0] || outs[1]){
          bods.forEach((b, i) => { if(outs[i]){ b.out = true; } });
          api.sfx.splash();
          if(outs[0] && outs[1]) { endWith(null); api.say('طلعتوا التنين! 😅'); }
          else { const w = outs[0] ? 1 : 0; endWith(w); api.say('طلعت برّا! 😵', 1 - w); }
          return;
        }
        if(t >= LIMIT){
          const d0 = Math.hypot(bods[0].x, bods[0].y), d1 = Math.hypot(bods[1].x, bods[1].y);
          endWith(Math.abs(d0 - d1) < 0.01 ? null : (d0 < d1 ? 0 : 1));
          api.say('خلص الوقت! الأقرب للنص بيربح');
        }
      },
      pointerDown(p){ dash(p.player); },
      draw(c){
        const g = geo(), W = g.W, H = g.H, R = g.R;
        c.fillStyle = '#ffcf8a'; c.fillRect(0, 0, W, H);
        c.fillStyle = 'rgba(255,90,95,.2)'; c.fillRect(0, H / 2, W, H / 2);
        c.fillStyle = 'rgba(63,169,255,.2)'; c.fillRect(0, 0, W, H / 2);
        c.save();
        if(shake > 0) c.translate(api.rand(-1, 1) * shake * 6, api.rand(-1, 1) * shake * 6);
        // raised clay platform
        const pw = R * 2.5;
        c.fillStyle = OUT; c.beginPath(); c.roundRect(g.cx - pw / 2 - 6, g.cy - pw / 2 - 6 + 10, pw + 12, pw + 12, 30); c.fill();
        c.fillStyle = '#c98a4b'; c.strokeStyle = OUT; c.lineWidth = 5;
        c.beginPath(); c.roundRect(g.cx - pw / 2, g.cy - pw / 2, pw, pw, 26); c.fill(); c.stroke();
        // sand circle
        c.fillStyle = '#f3dca6'; c.beginPath(); c.arc(g.cx, g.cy, R, 0, Math.PI * 2); c.fill();
        // straw rope edge
        c.strokeStyle = OUT; c.lineWidth = R * 0.1 + 6; c.beginPath(); c.arc(g.cx, g.cy, R, 0, Math.PI * 2); c.stroke();
        c.strokeStyle = '#e0b04a'; c.lineWidth = R * 0.1; c.stroke();
        c.strokeStyle = 'rgba(120,80,20,.45)'; c.lineWidth = 2;
        for(let k = 0; k < 48; k++){
          const an = k / 48 * Math.PI * 2;
          c.beginPath(); c.moveTo(g.cx + Math.cos(an) * R * 0.95, g.cy + Math.sin(an) * R * 0.95); c.lineTo(g.cx + Math.cos(an + 0.05) * R * 1.05, g.cy + Math.sin(an + 0.05) * R * 1.05); c.stroke();
        }
        // centre and start lines
        c.strokeStyle = 'rgba(28,24,56,.18)'; c.lineWidth = 3; c.setLineDash([6, 8]);
        c.beginPath(); c.arc(g.cx, g.cy, R * 0.35, 0, Math.PI * 2); c.stroke(); c.setLineDash([]);
        c.fillStyle = '#fff'; c.strokeStyle = OUT; c.lineWidth = 2;
        for(const s of [-1, 1]){ c.beginPath(); c.roundRect(g.cx - R * 0.15, g.cy + s * R * 0.18 - 3, R * 0.3, 6, 3); c.fill(); c.stroke(); }
        // bodies (falling ones underneath)
        const order = [0, 1].sort((i, j) => (bods[j].out ? 1 : 0) - (bods[i].out ? 1 : 0));
        for(const i of order){
          const b = bods[i], P = api.players[i];
          const x = g.cx + b.x * R, y = g.cy + b.y * R;
          const sc = b.out ? Math.max(0.15, 1 - b.fall * 1.1) : 1, r = g.r * sc;
          // facing arrow
          if(!b.out){
            const ready = b.cool <= 0;
            c.save(); c.translate(x, y); c.rotate(b.a);
            c.fillStyle = ready ? P.color : P.light; c.strokeStyle = OUT; c.lineWidth = 3; c.lineJoin = 'round';
            const r0 = r * 1.15, r1 = r * 1.95;
            c.beginPath(); c.moveTo(r1, 0); c.lineTo(r0 + r * 0.25, -r * 0.42); c.lineTo(r0 + r * 0.25, -r * 0.18); c.lineTo(r0, -r * 0.18);
            c.lineTo(r0, r * 0.18); c.lineTo(r0 + r * 0.25, r * 0.18); c.lineTo(r0 + r * 0.25, r * 0.42); c.closePath(); c.fill(); c.stroke();
            c.restore();
            // cooldown ring
            if(b.cool > 0){
              c.strokeStyle = 'rgba(28,24,56,.35)'; c.lineWidth = 5;
              c.beginPath(); c.arc(x, y, r * 1.12, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (b.cool / COOL)); c.stroke();
            }
          }
          c.save(); c.translate(x, y);
          if(b.out) c.rotate(b.fall * 8);
          else if(i === 1) c.rotate(Math.PI);
          const sq = 1 + b.squash * 0.15;
          c.scale(sq, 1 / sq);
          const mood = b.out ? 'sad' : (over && winner === i ? 'happy' : 'idle');
          const lx = Math.cos(b.a) * (i === 1 ? -1 : 1), ly = Math.sin(b.a) * (i === 1 ? -1 : 1);
          api.buddy(c, 0, 0, r, i, t + i * 0.7, mood, { x: lx, y: ly });
          c.restore();
        }
        for(const s of sparks) api.emoji(c, '💥', g.cx + s.x * R, g.cy + s.y * R, g.r * 1.2 * (0.6 + s.life * 1.5));
        c.restore();
        // HUD: timer + hint for each player at their edge
        const left = Math.max(0, LIMIT - t), fs = api.clamp(g.m0 * 0.065, 18, 30);
        for(const pl of [0, 1]){
          c.save(); if(pl === 1){ c.translate(W, H); c.rotate(Math.PI); }
          const y = H - Math.max(40, (H / 2 - R * 1.25) * 0.45);
          api.emoji(c, '⏰', W / 2 - fs * 0.7, y - fs * 1.1, fs * 0.85);
          api.text(c, api.AR(Math.ceil(left)), W / 2 + fs * 0.6, y - fs * 1.1, fs, left < 6 ? '#ff5a5f' : '#fff7e8', 0);
          api.text(c, 'كبس لتنطّ 👆', W / 2, y + fs * 0.3, fs * 0.8, api.players[pl].dark, 0);
          c.restore();
        }
      }
    };
  }
});
