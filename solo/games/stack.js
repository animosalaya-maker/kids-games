/* Block tower: a block slides above the tower, tap to drop it. The overhang is cut off; perfect drops keep full width. */
Solo.register({
  id: 'stack', title: L('برج المكعبات','Block Tower','Küp Kulesi'), emoji: '🧱', bg: '#ff7a59',
  help: L('اكبس لتنزّل المكعب فوق البرج. كل ما كان مظبوط أكتر، بيضل البرج عريض','Tap to drop the block on the tower. The better you line it up, the wider the tower stays','Küpü kulenin üstüne bırakmak için dokun. Ne kadar tam denk getirirsen kule o kadar geniş kalır'),
  create(api){
    const emoji = (c, e, x, y, sz, r) => { c.fillStyle = '#000'; api.emoji(c, e, x, y, sz, r); };
    const OUT = '#1c1838';
    const S = () => Math.min(api.W, api.H);
    const BH = () => S() * 0.075;
    const GROUND = () => api.H * 0.84;
    const COLS = ['#ff5a5f', '#ff9f1c', '#ffd34d', '#7ed957', '#2ec4b6', '#4fb6ff', '#7c5cff', '#ff7ac6'];

    let t = 0, over = false, overT = 0, combo = 0, cam = 0, camT = 0, flash = 0, introT = 2.5;
    let mood = 'happy', moodT = 0;
    const baseW = Math.min(api.W * 0.56, S() * 0.62);
    const tower = [{ x: api.W / 2 - baseW / 2, w: baseW, col: '#a06a3c', land: 0 }];
    let mover = null, chunks = [], parts = [], pops = [];

    const topY = i => GROUND() - (i + 1) * BH();          // world y of the top edge of block i
    const scr = y => y + cam;

    function newMover(){
      const top = tower[tower.length - 1], n = tower.length;
      const w = top.w, side = n % 2 ? -1 : 1;
      const A = Math.min(api.W / 2 - w * 0.1, Math.max(w * 0.95, api.W * 0.3));
      mover = { w, cx: api.W / 2 + side * A, dir: -side, A, col: COLS[(n - 1) % COLS.length], bounces: 0, drop: 0, dropping: false, lift: BH() * 1.6 };
    }
    newMover();

    const speed = () => api.W * Math.min(1.05, 0.36 + (tower.length - 1) * 0.018);

    function burst(x, y, col, n, sp){
      for(let i = 0; i < n; i++){ const a = Math.random() * 6.283, v = S() * api.rand(0.2, sp || 0.6); parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - S() * 0.3, t: 0, life: api.rand(0.5, 0.9), col, r: S() * api.rand(0.008, 0.018), star: Math.random() < 0.4 }); }
    }

    function drop(){
      if(over || !mover || mover.dropping) return;
      mover.dropping = true; mover.drop = 0; api.sfx.swoosh(); introT = 0;
    }
    function land(){
      const m = mover, top = tower[tower.length - 1], i = tower.length, y = topY(i);
      let x0 = m.cx - m.w / 2, x1 = x0 + m.w;
      const tol = Math.max(7, S() * 0.024);
      if(Math.abs(x0 - top.x) <= tol){
        // perfect
        combo++;
        let w = top.w, x = top.x;
        if(combo >= 3 && w < baseW){ const grow = Math.min(baseW - w, BH() * 0.5); w += grow; x -= grow / 2; x = api.clamp(x, 4, api.W - w - 4); }
        tower.push({ x, w, col: m.col, land: 1 });
        api.sfx.good(); flash = 1; mood = 'wow'; moodT = 0.8;
        burst(x + w / 2, scr(y), '#fff6b0', 18, 0.7);
        pops.push({ str: combo >= 3 ? api.L('ممتاز! ×','Perfect! ×','Mükemmel! ×') + api.AR(combo) : api.L('ممتاز!','Perfect!','Mükemmel!'), x: x + w / 2, y, t: 0 });
        if(combo === 3 || combo === 6 || combo === 10) api.say(api.L('ممتاز','Perfect','Mükemmel'));
      } else {
        combo = 0;
        const ox0 = Math.max(x0, top.x), ox1 = Math.min(x1, top.x + top.w);
        if(ox1 - ox0 <= 0){
          // missed completely
          chunks.push({ x: x0, w: m.w, y, vy: 0, vx: (x0 < top.x ? -1 : 1) * S() * 0.3, rot: 0, vr: x0 < top.x ? -2.5 : 2.5, col: m.col });
          over = true; overT = 0; mood = 'sad'; api.sfx.bad(); api.toast(api.L('وقع المكعب!','The block fell!','Küp düştü!'), 1300); mover = null; return;
        }
        // cut the overhang
        const left = x0 < ox0, cw = m.w - (ox1 - ox0);
        chunks.push({ x: left ? x0 : ox1, w: cw, y, vy: 0, vx: (left ? -1 : 1) * S() * 0.25, rot: 0, vr: left ? -3 : 3, col: m.col });
        tower.push({ x: ox0, w: ox1 - ox0, col: m.col, land: 1 });
        api.sfx.pop(); api.tone(300 + Math.min(600, tower.length * 18), 0.12, 'triangle', 0.1);
        burst(left ? ox0 : ox1, scr(y) + BH() / 2, m.col, 6, 0.3);
        const lost = cw / m.w;
        mood = lost > 0.4 ? 'sad' : 'happy'; moodT = 0.9;
        if(lost < 0.15) pops.push({ str: api.L('حلو!','Nice!','Güzel!'), x: ox0 + (ox1 - ox0) / 2, y, t: 0 });
      }
      newMover();
    }

    function block(c, x, y, w, h, col, sq){
      const s = S(), lw = Math.max(3, s * 0.008);
      c.save();
      if(sq){ c.translate(x + w / 2, y + h); c.scale(1 + sq * 0.06, 1 - sq * 0.15); c.translate(-(x + w / 2), -(y + h)); }
      c.lineWidth = lw; c.strokeStyle = OUT; c.lineJoin = 'round';
      c.fillStyle = col; c.beginPath(); c.roundRect(x, y, w, h, Math.min(8, h * 0.2)); c.fill(); c.stroke();
      c.fillStyle = 'rgba(255,255,255,.35)'; c.beginPath(); c.roundRect(x + lw * 1.5, y + lw * 1.3, Math.max(0, w - lw * 3), h * 0.22, h * 0.1); c.fill();
      c.fillStyle = 'rgba(0,0,0,.12)'; c.fillRect(x + lw, y + h * 0.72, Math.max(0, w - lw * 2), h * 0.2);
      if(w > h * 1.2){ c.fillStyle = 'rgba(255,255,255,.55)'; c.beginPath(); c.arc(x + h * 0.4, y + h * 0.5, h * 0.09, 0, 6.283); c.arc(x + w - h * 0.4, y + h * 0.5, h * 0.09, 0, 6.283); c.fill(); }
      c.restore();
    }

    return {
      resize(){},
      pointerDown(){ drop(); },
      update(dt){
        t += dt; if(introT > 0) introT -= dt;
        flash = Math.max(0, flash - dt * 2.5);
        if(moodT > 0){ moodT -= dt; if(moodT <= 0 && !over) mood = 'happy'; }
        for(const b of tower) b.land = Math.max(0, b.land - dt * 5);
        for(const q of parts){ q.t += dt; q.x += q.vx * dt; q.y += q.vy * dt; q.vy += S() * 1.6 * dt; }
        parts = parts.filter(q => q.t < q.life);
        for(const q of pops) q.t += dt; pops = pops.filter(q => q.t < 1);
        for(const ch of chunks){ ch.vy += S() * 3 * dt; ch.y += ch.vy * dt; ch.x += ch.vx * dt; ch.rot += ch.vr * dt; }
        chunks = chunks.filter(ch => scr(ch.y) < api.H + S());
        // camera: keep the top of the tower around the middle of the screen
        const want = Math.max(0, api.H * 0.5 - topY(tower.length - 1));
        camT = want; cam += (camT - cam) * Math.min(1, dt * 4);
        if(over){ overT += dt; if(overT > 1.3) api.end({ score: tower.length - 1, msg: tower.length > 25 ? api.L('برج عالي كتير!','A super tall tower!','Çok yüksek bir kule!') : undefined }); return; }
        const m = mover; if(!m) return;
        if(m.dropping){
          m.drop += dt / 0.14;
          if(m.drop >= 1) land();
          return;
        }
        m.cx += m.dir * speed() * dt;
        const lo = api.W / 2 - m.A, hi = api.W / 2 + m.A;
        if(m.cx < lo){ m.cx = lo; m.dir = 1; m.bounces++; }
        if(m.cx > hi){ m.cx = hi; m.dir = -1; m.bounces++; }
        // nobody tapped for a long while: the block drops by itself
        if(m.bounces >= 5) drop();
      },
      draw(c){
        const W = api.W, H = api.H, s = S(), bh = BH();
        const h = Math.min(1, cam / (s * 6));
        const g = c.createLinearGradient(0, 0, 0, H);
        g.addColorStop(0, h < 0.5 ? '#7fd3ff' : '#6a7dff'); g.addColorStop(1, h < 0.5 ? '#ffe2c4' : '#c6b8ff');
        c.fillStyle = g; c.fillRect(0, 0, W, H);
        c.fillStyle = 'rgba(255,255,255,.6)';
        for(let i = 0; i < 6; i++){
          const span = H + s * 0.6, cy = ((i * span / 6 + cam * 0.3) % span + span) % span - s * 0.3, cx = (i * 151) % W, cs = s * (0.05 + (i % 3) * 0.02);
          c.beginPath(); c.arc(cx, cy, cs, 0, 6.283); c.arc(cx + cs * 1.1, cy + cs * 0.2, cs * 0.8, 0, 6.283); c.arc(cx - cs * 1.1, cy + cs * 0.25, cs * 0.7, 0, 6.283); c.fill();
        }
        // ground
        const gy = scr(GROUND());
        if(gy < H){
          c.fillStyle = '#7ed957'; c.fillRect(0, gy, W, H - gy + 2);
          c.fillStyle = '#5fc24a'; c.fillRect(0, gy + s * 0.04, W, H);
          c.strokeStyle = OUT; c.lineWidth = 4; c.beginPath(); c.moveTo(0, gy); c.lineTo(W, gy); c.stroke();
        }
        // height marks every 10 blocks
        for(let i = 10; i < tower.length + 10; i += 10){ const y = scr(topY(i - 1)); if(y > -20 && y < H){ c.strokeStyle = 'rgba(255,255,255,.6)'; c.setLineDash([8, 8]); c.lineWidth = 2; c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke(); c.setLineDash([]); api.text(c, api.AR(i), W - s * 0.07, y - s * 0.03, s * 0.045, '#fff7e8'); } }
        // tower
        const first = Math.max(0, Math.floor((cam - (H - GROUND())) / bh) - 2);
        for(let i = first; i < tower.length; i++){ const b = tower[i], y = scr(topY(i)); if(y > H + bh) continue; block(c, b.x, y, b.w, bh, b.col, b.land); }
        if(flash > 0){ const tb = tower[tower.length - 1]; c.globalAlpha = flash; c.strokeStyle = '#fff6b0'; c.lineWidth = 6; c.beginPath(); c.roundRect(tb.x - 4, scr(topY(tower.length - 1)) - 4, tb.w + 8, bh + 8, 10); c.stroke(); c.globalAlpha = 1; }
        // chunks
        for(const ch of chunks){ c.save(); c.translate(ch.x + ch.w / 2, scr(ch.y) + bh / 2); c.rotate(ch.rot); block(c, -ch.w / 2, -bh / 2, ch.w, bh, ch.col, 0); c.restore(); }
        // mover
        if(mover){
          const m = mover, ty = scr(topY(tower.length));
          const y = ty - m.lift * (m.dropping ? 1 - m.drop * m.drop : 1);
          if(!m.dropping){ c.fillStyle = 'rgba(28,24,56,.15)'; c.fillRect(m.cx - m.w / 2, ty, m.w, bh); }
          block(c, m.cx - m.w / 2, y, m.w, bh, m.col, 0);
        }
        // particles
        for(const q of parts){
          c.globalAlpha = 1 - q.t / q.life;
          if(q.star){ emoji(c, '✨', q.x, q.y, q.r * 4); }
          else { c.fillStyle = q.col; c.beginPath(); c.arc(q.x, q.y, q.r, 0, 6.283); c.fill(); }
        }
        c.globalAlpha = 1;
        for(const q of pops){ c.globalAlpha = 1 - Math.max(0, q.t - 0.5) * 2; const k = Math.min(1, q.t * 6); api.text(c, q.str, api.clamp(q.x, s * 0.25, W - s * 0.25), scr(q.y) - s * 0.08 - q.t * s * 0.1, s * 0.08 * (0.6 + 0.4 * k), '#fff6b0'); }
        c.globalAlpha = 1;
        // Bobo watching from his cloud at the bottom
        const br = s * 0.085, bx = s * 0.13, by = H - br * 1.5;
        c.fillStyle = '#ffffff'; c.strokeStyle = OUT; c.lineWidth = 3;
        c.beginPath(); c.ellipse(bx, by + br * 0.95, br * 1.25, br * 0.32, 0, 0, 6.283); c.fill(); c.stroke();
        const lookX = mover ? api.clamp((mover.cx - bx) / (W * 0.5), -1, 1) : 0;
        const jumpY = mood === 'wow' ? -Math.abs(Math.sin(moodT * 10)) * br * 0.4 : 0;
        api.bobo(c, bx, by + jumpY, br, over ? 'sad' : mood, { x: lookX, y: -0.8 }, t);
        if(introT > 0) api.text(c, api.L('اكبس لتنزّل المكعب 👆','Tap to drop the block 👆','Küpü bırakmak için dokun 👆'), W / 2, H * 0.32, Math.min(s * 0.065, W * 0.056), '#fff7e8');
        else if(mover && mover.bounces >= 3 && !mover.dropping) api.text(c, api.L('اكبس! 👆','Tap! 👆','Dokun! 👆'), W / 2, H * 0.32, s * 0.07 * (1 + Math.sin(t * 8) * 0.06), '#fff7e8');
        // HUD (capped size on tablets)
        { const s = Math.min(S(), 440);
        const ph = Math.max(40, s * 0.1);
        c.fillStyle = 'rgba(28,24,56,.72)'; c.beginPath(); c.roundRect(W / 2 - s * 0.18, 34 - ph / 2, s * 0.36, ph, ph / 2); c.fill();
        api.text(c, '🧱 ' + api.AR(tower.length - 1), W / 2, 35, ph * 0.55, '#fff7e8'); }
      }
    };
  }
});
