/* Lumberjack (Timberman style), split screen. Both trees have the same branches. First to 40 chops wins. */
Duel.register({
  id: 'chop', title: 'الحطّاب', emoji: '🪓', bg: '#5fbf4a',
  help: 'اكبس يمين أو شمال لتقطع الشجرة، وانتبه من الغصون فوق راسك',
  create(api){
    const OUT = '#1c1838', GOAL = 40;
    let seed = (Math.random() * 1e9) | 0;
    function rnd(){ seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }
    // branch sequence: 0 none, -1 left, 1 right. Never opposite branches on neighbouring segments (always solvable).
    const seq = [];
    for(let i = 0; i < GOAL + 20; i++){
      const prev = seq[i - 1] || 0;
      if(i < 3) seq.push(0);
      else if(prev !== 0) seq.push(rnd() < 0.6 ? 0 : prev);
      else { const r = rnd(); seq.push(r < 0.38 ? -1 : r < 0.76 ? 1 : 0); }
    }
    let time = 0, ended = false;
    const S = () => Math.min(api.W, api.H);
    const P = [0, 1].map(() => ({ chops: 0, side: -1, energy: 1, dead: false, deadT: 0, deadWhy: '', swing: 0, drop: 0, flying: [], chips: [] }));
    const geo = () => {
      const W = api.W, H = api.H, mid = H / 2, half = H / 2, ground = half * 0.14;
      const base = H - ground, segH = half * 0.13, tw = S() * 0.2;
      return { W, H, mid, half, ground, base, segH, tw, cx: W / 2, br: S() * 0.075 };
    };

    function die(pl, why){
      const st = P[pl]; if(st.dead) return;
      st.dead = true; st.deadT = time; st.deadWhy = why; api.sfx.hit(); api.sfx.buzz();
    }
    function chop(pl, side){
      const st = P[pl]; if(st.dead || ended) return;
      st.side = side;
      if(seq[st.chops] === side){ die(pl, 'branch'); return; }           // walked into a branch
      const g = geo();
      st.flying.push({ b: seq[st.chops], x: g.cx, y: g.base - g.segH / 2, vx: -side * S() * 1.6, vy: -S() * 0.6, rot: 0, t: 0 });
      for(let i = 0; i < 6; i++) st.chips.push({ x: g.cx + side * g.tw * 0.45, y: g.base - g.segH * 0.5, vx: side * S() * (0.3 + Math.random() * 0.6), vy: -S() * (0.3 + Math.random() * 0.7), t: 0 });
      st.chops++; st.swing = 1; st.drop = 1;
      st.energy = Math.min(1, st.energy + 0.055);
      api.sfx.tap(); api.tone(180 + Math.random() * 40, 0.06, 'square', 0.07);
      if(seq[st.chops] === side){ die(pl, 'branch'); return; }            // branch came down on your head
      if(st.chops >= GOAL){ ended = true; api.sfx.coin(); api.win(pl); }
    }

    function drawHalf(c, pl){
      const g = geo(), { W, H, mid } = g, st = P[pl], col = api.players[pl];
      c.save();
      if(pl === 1){ c.translate(W, H); c.rotate(Math.PI); }
      c.beginPath(); c.rect(0, mid, W, H - mid); c.clip();
      const sky = c.createLinearGradient(0, mid, 0, H);
      sky.addColorStop(0, '#a9e8ff'); sky.addColorStop(1, '#e8fbff');
      c.fillStyle = sky; c.fillRect(0, mid, W, H - mid);
      // hills
      c.fillStyle = '#9be07a';
      c.beginPath(); c.ellipse(W * 0.15, g.base + 10, W * 0.35, g.half * 0.28, 0, 0, 6.283); c.fill();
      c.beginPath(); c.ellipse(W * 0.9, g.base + 10, W * 0.4, g.half * 0.22, 0, 0, 6.283); c.fill();
      // ground
      c.fillStyle = '#6cc24a'; c.fillRect(0, g.base, W, g.ground);
      c.fillStyle = '#58a83b'; c.fillRect(0, g.base + g.ground * 0.55, W, g.ground);
      c.strokeStyle = OUT; c.lineWidth = 4; c.beginPath(); c.moveTo(0, g.base); c.lineTo(W, g.base); c.stroke();
      // stump
      c.fillStyle = '#8b5a2b'; c.beginPath(); c.roundRect(g.cx - g.tw * 0.62, g.base - g.segH * 0.2, g.tw * 1.24, g.segH * 0.45, 6); c.fill(); c.stroke();
      // trunk segments (with a little drop animation)
      const dropOff = st.drop * g.segH;
      const n = Math.ceil((g.base - mid) / g.segH) + 2;
      c.lineWidth = Math.max(3, S() * 0.011);
      for(let k = 0; k < n; k++){
        const i = st.chops + k, y = g.base - (k + 1) * g.segH - dropOff;
        c.fillStyle = k % 2 ? '#a0673a' : '#b07443';
        c.beginPath(); c.rect(g.cx - g.tw / 2, y, g.tw, g.segH); c.fill(); c.stroke();
        c.strokeStyle = 'rgba(28,24,56,.35)'; c.beginPath(); c.moveTo(g.cx - g.tw * 0.15, y + g.segH * 0.25); c.lineTo(g.cx - g.tw * 0.15, y + g.segH * 0.75); c.moveTo(g.cx + g.tw * 0.2, y + g.segH * 0.2); c.lineTo(g.cx + g.tw * 0.2, y + g.segH * 0.6); c.stroke();
        c.strokeStyle = OUT;
        if(i < seq.length && seq[i]) drawBranch(c, g, seq[i], y + g.segH * 0.5);
      }
      // flying chopped segments
      for(const f of st.flying){
        c.save(); c.translate(f.x, f.y); c.rotate(f.rot);
        c.fillStyle = '#b07443'; c.beginPath(); c.rect(-g.tw / 2, -g.segH / 2, g.tw, g.segH); c.fill(); c.stroke();
        if(f.b) drawBranch(c, { cx: 0, tw: g.tw, segH: g.segH }, f.b, 0);
        c.restore();
      }
      for(const p of st.chips){ c.fillStyle = '#e9b97a'; c.globalAlpha = 1 - p.t / 0.5; c.fillRect(p.x - 4, p.y - 3, 8, 6); }
      c.globalAlpha = 1;
      // lumberjack buddy
      const bx = g.cx + st.side * (g.tw / 2 + g.br * 1.35), by = g.base - g.br * 1.0;
      const t = api.time;
      api.buddy(c, bx, by, g.br, pl, t, st.dead ? 'sad' : (st.swing > 0.5 ? 'happy' : 'idle'), { x: -st.side, y: -0.3 });
      if(!st.dead){
        const d = -st.side, sw = st.swing, L = g.br * 1.55;
        const ang = d > 0 ? -Math.PI / 2 * (1 - sw) : -Math.PI / 2 - Math.PI / 2 * sw;
        c.save(); c.translate(bx + d * g.br * 0.75, by + g.br * 0.2); c.rotate(ang);
        c.lineCap = 'round'; c.strokeStyle = OUT; c.lineWidth = g.br * 0.32; c.beginPath(); c.moveTo(0, 0); c.lineTo(L, 0); c.stroke();
        c.strokeStyle = '#c98a4b'; c.lineWidth = g.br * 0.18; c.beginPath(); c.moveTo(0, 0); c.lineTo(L, 0); c.stroke();
        c.fillStyle = '#d9e2ec'; c.strokeStyle = OUT; c.lineWidth = 3;
        const hs = d > 0 ? 1 : -1; // blade faces the trunk
        c.beginPath(); c.moveTo(L - g.br * 0.35, 0); c.lineTo(L - g.br * 0.45, hs * g.br * 0.7); c.quadraticCurveTo(L + g.br * 0.05, hs * g.br * 0.85, L + g.br * 0.25, hs * g.br * 0.6); c.lineTo(L + g.br * 0.1, 0); c.closePath(); c.fill(); c.stroke();
        c.fillStyle = OUT; c.beginPath(); c.arc(L, 0, g.br * 0.12, 0, 6.283); c.fill();
        c.restore();
        // hands
        c.fillStyle = api.players[pl].color; c.strokeStyle = OUT; c.lineWidth = 3;
        c.beginPath(); c.arc(bx + d * g.br * 0.75, by + g.br * 0.2, g.br * 0.22, 0, 6.283); c.fill(); c.stroke();
      } else {
        api.emoji(c, '💫', bx, by - g.br * 1.3, g.br * 1.1, time * 3);
      }
      // tap hints
      if(st.chops === 0 && !st.dead){
        api.text(c, '👈', W * 0.12, g.base - g.half * 0.35, S() * 0.09, '#fff7e8', 0);
        api.text(c, '👉', W * 0.88, g.base - g.half * 0.35, S() * 0.09, '#fff7e8', 0);
      }
      c.restore();
      // HUD
      c.save();
      if(pl === 1){ c.translate(W, H); c.rotate(Math.PI); }
      const ey = H - g.ground * 0.5, ew = W * 0.42, ex = W * 0.07;
      c.fillStyle = 'rgba(28,24,56,.75)'; c.beginPath(); c.roundRect(ex, ey - S() * 0.028, ew, S() * 0.056, S() * 0.028); c.fill();
      c.fillStyle = st.energy < 0.3 ? '#ff5a5f' : '#ffcd4d';
      c.beginPath(); c.roundRect(ex + 3, ey - S() * 0.028 + 3, Math.max(0, (ew - 6) * st.energy), S() * 0.056 - 6, S() * 0.025); c.fill();
      c.strokeStyle = OUT; c.lineWidth = 3; c.beginPath(); c.roundRect(ex, ey - S() * 0.028, ew, S() * 0.056, S() * 0.028); c.stroke();
      api.text(c, '⚡', ex - S() * 0.0, ey, S() * 0.05, '#fff', 0);
      c.fillStyle = 'rgba(28,24,56,.75)'; c.beginPath(); c.roundRect(W * 0.58, ey - S() * 0.04, W * 0.32, S() * 0.08, S() * 0.04); c.fill();
      c.strokeStyle = col.color; c.lineWidth = 4; c.stroke();
      api.text(c, '🪵 ' + api.AR(st.chops) + ' من ' + api.AR(GOAL), W * 0.74, ey, S() * 0.05, '#fff7e8', 0);
      if(st.dead) api.text(c, st.deadWhy === 'branch' ? 'بونك! الغصن ضربك 🌳' : 'خلصت الطاقة! 😴', W / 2, mid + g.half * 0.22, S() * 0.065, '#ff5a5f', 0);
      c.restore();
    }
    function drawBranch(c, g, side, y){
      const len = g.tw * 1.15, th = g.segH * 0.32, x0 = g.cx + side * g.tw / 2;
      c.fillStyle = '#8b5a2b';
      c.beginPath(); c.rect(side > 0 ? x0 - 2 : x0 - len + 2, y - th / 2, len, th); c.fill(); c.stroke();
      const lx = x0 + side * len, ly = y;
      c.fillStyle = '#4fbf3a';
      for(const [dx, dy, r] of [[0, 0, 0.5], [-0.35, -0.25, 0.38], [0.3, -0.3, 0.36], [0.05, -0.45, 0.32]]){
        c.beginPath(); c.arc(lx + side * dx * g.segH, ly + dy * g.segH, r * g.segH, 0, 6.283); c.fill(); c.stroke();
      }
      c.fillStyle = '#7ed957'; c.beginPath(); c.arc(lx - side * 0.1 * g.segH, ly - 0.15 * g.segH, 0.15 * g.segH, 0, 6.283); c.fill();
    }

    return {
      update(dt){
        if(ended) return;
        time += dt;
        for(const pl of [0, 1]){
          const st = P[pl];
          st.swing = Math.max(0, st.swing - dt * 7); st.drop = Math.max(0, st.drop - dt * 12);
          for(const f of st.flying){ f.t += dt; f.vy += S() * 3 * dt; f.x += f.vx * dt; f.y += f.vy * dt; f.rot += -Math.sign(f.vx) * 6 * dt; }
          st.flying = st.flying.filter(f => f.t < 1);
          for(const p of st.chips){ p.t += dt; p.vy += S() * 3 * dt; p.x += p.vx * dt; p.y += p.vy * dt; }
          st.chips = st.chips.filter(p => p.t < 0.5);
          if(!st.dead && time > 0.5){
            st.energy -= dt * (0.085 + st.chops * 0.0022);
            if(st.energy <= 0){ st.energy = 0; die(pl, 'energy'); }
          }
        }
        const d0 = P[0].dead, d1 = P[1].dead;
        if(d0 || d1){
          const first = Math.min(d0 ? P[0].deadT : 1e9, d1 ? P[1].deadT : 1e9);
          if(time - first > 0.35){
            ended = true;
            if(d0 && d1) api.win(Math.abs(P[0].deadT - P[1].deadT) < 0.2 ? null : (P[0].deadT > P[1].deadT ? 0 : 1));
            else api.win(d0 ? 1 : 0);
          }
        }
      },
      pointerDown(p){
        if(p.player !== 0 && p.player !== 1) return;
        const lx = p.player === 1 ? api.W - p.x : p.x;
        chop(p.player, lx < api.W / 2 ? -1 : 1);
      },
      draw(c){
        drawHalf(c, 0); drawHalf(c, 1);
        c.fillStyle = OUT; c.fillRect(0, api.H / 2 - 3, api.W, 6);
      }
    };
  }
});
