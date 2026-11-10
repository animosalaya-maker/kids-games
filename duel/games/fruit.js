/* Fruit slicing, split screen. Each kid has their own half; the same fruit sequence is tossed in both halves. */
Duel.register({
  id: 'fruit', title: 'تقطيع الفواكه', emoji: '🍉', bg: '#8e5cf7',
  help: 'مرّق إصبعك على الفواكه لتقطّعها، وانتبه من القنبلة 💣',
  create(api){
    const DUR = 25, OUT = '#1c1838';
    const KINDS = [
      { e: '🍉', juice: '#ff4d6d' }, { e: '🍊', juice: '#ff9f1c' }, { e: '🍎', juice: '#e63946' },
      { e: '🍌', juice: '#ffd23f' }, { e: '🍍', juice: '#ffc93c' }
    ];
    // seeded PRNG so both halves get the same sequence
    let seed = (Math.random() * 1e9) | 0;
    function rnd(){ seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }
    // pre-generate the toss schedule (fractions, scaled to screen at spawn time)
    const sched = [];
    for(let t = 0.5; t < DUR - 0.8;){
      const n = rnd() < 0.25 ? 2 : 1;
      for(let k = 0; k < n; k++){
        const bomb = t > 3 && rnd() < 0.14;
        sched.push({ t: t + k * 0.12, x: 0.15 + rnd() * 0.7, vx: (rnd() - 0.5) * 0.5, peak: 0.12 + rnd() * 0.3, kind: bomb ? -1 : (rnd() * KINDS.length) | 0, spin: (rnd() - 0.5) * 6 });
      }
      t += 0.55 + rnd() * 0.45 - Math.min(0.2, t * 0.008);
    }
    const P = [0, 1].map(() => ({ score: 0, next: 0, fruits: [], halves: [], drops: [], trails: new Map(), pops: [], flash: 0 }));
    let time = 0;
    const S = () => Math.min(api.W, api.H);
    const R = () => S() * 0.085;
    const loc = p => p.player === 1 ? { x: api.W - p.x, y: api.H - p.y } : { x: p.x, y: p.y };

    function spawn(pl, s){
      const W = api.W, H = api.H, half = H / 2, r = R();
      const peakY = H / 2 + half * s.peak + r;           // highest point, inside this half
      const h = (H + r) - peakY, T = 1.05;               // time to peak
      const g = 2 * h / (T * T), vy = -g * T;
      P[pl].fruits.push({ x: W * s.x, y: H + r, vx: W * s.vx / T * 0.6, vy, g, kind: s.kind, rot: 0, spin: s.spin });
    }
    function segHit(ax, ay, bx, by, cx, cy, r){
      const dx = bx - ax, dy = by - ay, L = dx * dx + dy * dy;
      let u = L ? ((cx - ax) * dx + (cy - ay) * dy) / L : 0; u = Math.max(0, Math.min(1, u));
      const px = ax + dx * u - cx, py = ay + dy * u - cy;
      return px * px + py * py <= r * r;
    }
    function slice(pl, f, dx, dy){
      const st = P[pl], r = R();
      if(f.kind < 0){
        st.score = Math.max(0, st.score - 3); st.flash = 0.5; api.sfx.buzz(); api.sfx.hit();
        st.pops.push({ x: f.x, y: f.y, s: '-٣', t: 0, bad: true });
        for(let i = 0; i < 22; i++){ const a = Math.random() * 6.28, v = r * (3 + Math.random() * 6); st.drops.push({ x: f.x, y: f.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, col: i % 2 ? '#ffcd4d' : '#ff6b3d', life: 0.6, max: 0.6, sz: r * (0.12 + Math.random() * 0.12) }); }
        return;
      }
      st.score++; api.sfx.swoosh(); api.sfx.splash();
      st.pops.push({ x: f.x, y: f.y, s: '+١', t: 0 });
      const ang = Math.atan2(dy, dx) + Math.PI / 2, nx = Math.cos(ang), ny = Math.sin(ang);
      for(const s of [-1, 1]) st.halves.push({ x: f.x + nx * s * r * 0.2, y: f.y + ny * s * r * 0.2, vx: f.vx + nx * s * r * 2.2, vy: Math.min(f.vy, 0) * 0.3 + ny * s * r * 1.5, g: f.g, rot: ang - Math.PI / 2, spin: s * 3, side: s, kind: f.kind, life: 2 });
      const col = KINDS[f.kind].juice;
      for(let i = 0; i < 14; i++){ const a = Math.random() * 6.28, v = r * (1.5 + Math.random() * 4); st.drops.push({ x: f.x, y: f.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, col, life: 0.5 + Math.random() * 0.3, max: 0.8, sz: r * (0.1 + Math.random() * 0.14) }); }
      st.drops.push({ x: f.x, y: f.y, vx: 0, vy: 0, col, life: 0.9, max: 0.9, sz: r * 1.1, splat: true });
    }
    function swipe(p){
      if(p.player !== 0 && p.player !== 1) return;
      const st = P[p.player], q = loc(p), tr = st.trails.get(p.id);
      if(!tr) return;
      const last = tr.pts[tr.pts.length - 1];
      tr.pts.push({ x: q.x, y: q.y, t: time });
      const r = R() * 1.05;
      for(let i = st.fruits.length - 1; i >= 0; i--){
        const f = st.fruits[i];
        if(segHit(last.x, last.y, q.x, q.y, f.x, f.y, r)){ st.fruits.splice(i, 1); slice(p.player, f, q.x - last.x, q.y - last.y); }
      }
    }

    function drawHalf(c, pl){
      const W = api.W, H = api.H, mid = H / 2, st = P[pl], r = R(), col = api.players[pl];
      c.save();
      if(pl === 1){ c.translate(W, H); c.rotate(Math.PI); }
      c.beginPath(); c.rect(0, mid, W, H - mid); c.clip();
      // wooden board background
      c.fillStyle = '#7a4a2a'; c.fillRect(0, mid, W, H - mid);
      const pw = (H - mid) / 6;
      for(let i = 0; i < 6; i++){ c.fillStyle = i % 2 ? '#8a5733' : '#946139'; c.fillRect(0, mid + i * pw, W, pw - 3); }
      c.fillStyle = col.color; c.globalAlpha = 0.16; c.fillRect(0, mid, W, H - mid); c.globalAlpha = 1;
      if(st.flash > 0){ c.fillStyle = 'rgba(255,60,40,' + (st.flash * 0.7) + ')'; c.fillRect(0, mid, W, H - mid); }
      // splats and drops
      for(const d of st.drops){
        c.globalAlpha = Math.max(0, d.life / d.max) * (d.splat ? 0.45 : 1); c.fillStyle = d.col;
        c.beginPath(); c.arc(d.x, d.y, d.sz, 0, 6.283); c.fill();
      }
      c.globalAlpha = 1;
      // halves
      for(const h of st.halves){
        c.save(); c.translate(h.x, h.y); c.rotate(h.rot);
        c.beginPath(); c.rect(h.side < 0 ? -r * 1.5 : 0, -r * 1.5, r * 1.5, r * 3); c.clip();
        api.emoji(c, KINDS[h.kind].e, 0, 0, r * 2.1);
        c.restore();
        c.save(); c.translate(h.x, h.y); c.rotate(h.rot);
        c.fillStyle = KINDS[h.kind].juice; c.globalAlpha = 0.8; c.fillRect(-r * 0.06, -r * 0.8, r * 0.12, r * 1.6); c.restore();
      }
      // fruits
      for(const f of st.fruits){
        if(f.kind < 0){
          c.save(); c.translate(f.x, f.y); c.rotate(f.rot);
          c.fillStyle = 'rgba(255,60,40,.35)'; c.beginPath(); c.arc(0, 0, r * 1.15 + Math.sin(time * 18) * r * 0.08, 0, 6.283); c.fill();
          c.restore();
          api.emoji(c, '💣', f.x, f.y, r * 2.1, f.rot);
        } else api.emoji(c, KINDS[f.kind].e, f.x, f.y, r * 2.1, f.rot);
      }
      // trails
      for(const tr of st.trails.values()){
        const pts = tr.pts.filter(p => time - p.t < 0.16);
        if(pts.length < 2) continue;
        c.lineCap = 'round'; c.lineJoin = 'round';
        for(let i = 1; i < pts.length; i++){
          const k = i / pts.length;
          c.strokeStyle = 'rgba(255,255,255,' + (0.35 + k * 0.6) + ')'; c.lineWidth = 3 + k * r * 0.35;
          c.beginPath(); c.moveTo(pts[i - 1].x, pts[i - 1].y); c.lineTo(pts[i].x, pts[i].y); c.stroke();
        }
      }
      // score pops
      for(const p of st.pops) api.text(c, p.s, p.x, p.y - p.t * r * 2, r * 0.9, p.bad ? '#ff5a5f' : '#ffcd4d', 0);
      c.restore();
      // HUD (outside clip, in this player's orientation)
      c.save();
      if(pl === 1){ c.translate(W, H); c.rotate(Math.PI); }
      const hy = H - S() * 0.09;
      c.fillStyle = 'rgba(28,24,56,.7)'; c.beginPath(); c.roundRect(W / 2 - S() * 0.2, hy - S() * 0.05, S() * 0.4, S() * 0.1, S() * 0.05); c.fill();
      c.strokeStyle = col.color; c.lineWidth = 4; c.stroke();
      api.text(c, '🍉 ' + api.AR(st.score), W / 2, hy, S() * 0.065, '#fff7e8', 0);
      const left = Math.max(0, Math.ceil(DUR - time));
      api.text(c, '⏱ ' + api.AR(left), W - S() * 0.13, hy, S() * 0.05, left <= 5 ? '#ffcd4d' : '#fff7e8', 0);
      c.restore();
    }

    return {
      update(dt){
        time += dt;
        for(const pl of [0, 1]){
          const st = P[pl];
          while(st.next < sched.length && sched[st.next].t <= time){ spawn(pl, sched[st.next]); st.next++; }
          for(const f of st.fruits){ f.vy += f.g * dt; f.x += f.vx * dt; f.y += f.vy * dt; f.rot += f.spin * dt; if(f.x < R() || f.x > api.W - R()) f.vx = -f.vx * 0.8; }
          st.fruits = st.fruits.filter(f => !(f.vy > 0 && f.y > api.H + R() * 1.2));
          for(const h of st.halves){ h.vy += h.g * dt; h.x += h.vx * dt; h.y += h.vy * dt; h.rot += h.spin * dt; h.life -= dt; }
          st.halves = st.halves.filter(h => h.life > 0 && h.y < api.H + R() * 2);
          for(const d of st.drops){ if(!d.splat){ d.vy += R() * 14 * dt; d.x += d.vx * dt; d.y += d.vy * dt; } d.life -= dt; }
          st.drops = st.drops.filter(d => d.life > 0);
          for(const p of st.pops) p.t += dt;
          st.pops = st.pops.filter(p => p.t < 0.7);
          st.flash = Math.max(0, st.flash - dt);
          for(const tr of st.trails.values()) tr.pts = tr.pts.filter(p => time - p.t < 0.3);
        }
        if(time >= DUR){
          const a = P[0].score, b = P[1].score;
          api.win(a > b ? 0 : b > a ? 1 : null);
        }
      },
      pointerDown(p){
        const st = P[p.player]; if(!st) return;
        const q = loc(p); st.trails.set(p.id, { pts: [{ x: q.x, y: q.y, t: time }] });
      },
      pointerMove(p){ swipe(p); },
      pointerUp(p){ swipe(p); const st = P[p.player]; if(st) setTimeout(() => st.trails.delete(p.id), 200); },
      draw(c){
        const W = api.W, H = api.H;
        drawHalf(c, 0); drawHalf(c, 1);
        c.fillStyle = OUT; c.fillRect(0, H / 2 - 3, W, 6);
      }
    };
  }
});
