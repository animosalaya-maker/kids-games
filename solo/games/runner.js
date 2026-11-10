/* Bobo runner: side-scrolling endless run through a park. Tap to jump (double jump in the air). 3 hearts. */
Solo.register({
  id: 'runner', title: 'بوبو الراكض', emoji: '🏃', bg: '#2fb36d',
  help: 'اكبس لينطّ بوبو، واكبس مرة تانية بالهوا لنطّة أعلى. لم المصاري!',
  create(api){
    const OUT = '#1c1838';
    const S = () => Math.min(api.W, api.H);
    const GROUND = () => api.H * 0.74;
    const R = () => S() * 0.085;
    const BX = () => Math.min(api.W * 0.25, S() * 0.32);
    const GRAV = () => S() * 4.2;
    const JV = () => Math.sqrt(2 * GRAV() * S() * 0.36);
    const MPX = () => S() * 0.2;

    let t = 0, dist = 0, coins = 0, hearts = 3, inv = 0, over = false, overT = 0, introT = 2.2;
    const B = { y: 0, vy: 0, onGround: true, jumps: 0, squash: 0, mood: 'happy', moodT: 0 };
    let obs = [], items = [], parts = [], pops = [], nextObs = 0, nextCoin = 0;

    const speed = () => S() * Math.min(1.45, 0.62 + t * 0.006);
    function reset(){ B.y = GROUND() - R() * 0.9; nextObs = api.W * 1.1; nextCoin = api.W * 0.7; }
    reset();

    function spawnObs(x){
      const s = S(), lvl = t;
      const types = lvl < 15 ? ['rock', 'puddle'] : ['rock', 'puddle', 'fence', 'fence'];
      const type = api.pick(types);
      let w, h;
      if(type === 'rock'){ w = s * api.rand(0.12, 0.15); h = w * 0.7; }
      else if(type === 'puddle'){ w = s * api.rand(0.2, 0.26); h = s * 0.03; }
      else { w = s * 0.16; h = s * 0.13; }
      obs.push({ x, w, h, type, hit: false });
      // a coin arc over the obstacle sometimes
      if(Math.random() < 0.5){ for(let i = 0; i < 3; i++) items.push({ x: x + w / 2 + (i - 1) * s * 0.1, y: GROUND() - s * (0.3 + (i === 1 ? 0.08 : 0)), got: false, ph: Math.random() * 6 }); }
    }
    function burst(x, y, col, n, sp){
      for(let i = 0; i < n; i++){ const a = Math.random() * 6.283, v = S() * api.rand(0.2, sp || 0.6); parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - S() * 0.3, t: 0, life: api.rand(0.4, 0.8), col, r: S() * api.rand(0.008, 0.016) }); }
    }
    function jump(){
      if(over) return;
      introT = 0;
      if(B.onGround){ B.vy = -JV(); B.onGround = false; B.jumps = 1; api.sfx.jump(); burst(BX(), GROUND(), '#c9a66b', 6, 0.3); }
      else if(B.jumps < 2){ B.vy = -JV() * 0.85; B.jumps = 2; api.tone(600, 0.15, 'sine', 0.1, 0, 1100); burst(BX(), B.y + R() * 0.8, '#ffffff', 8, 0.35); }
    }

    function drawObs(c, o){
      const s = S(), gy = GROUND(), lw = Math.max(3, s * 0.009);
      c.lineWidth = lw; c.strokeStyle = OUT; c.lineJoin = 'round';
      if(o.type === 'rock'){
        c.fillStyle = '#a3a8b8'; c.beginPath();
        c.moveTo(o.x, gy); c.quadraticCurveTo(o.x - o.w * 0.05, gy - o.h * 0.9, o.x + o.w * 0.35, gy - o.h);
        c.quadraticCurveTo(o.x + o.w * 0.95, gy - o.h * 1.05, o.x + o.w, gy); c.closePath(); c.fill(); c.stroke();
        c.fillStyle = '#c9cdd9'; c.beginPath(); c.ellipse(o.x + o.w * 0.38, gy - o.h * 0.72, o.w * 0.15, o.h * 0.12, -0.3, 0, 6.283); c.fill();
        c.fillStyle = '#6dd04a'; c.beginPath(); c.ellipse(o.x + o.w * 0.65, gy - o.h * 0.85, o.w * 0.12, o.h * 0.1, 0.2, 0, 6.283); c.fill();
      } else if(o.type === 'puddle'){
        c.fillStyle = '#4fb6ff'; c.beginPath(); c.ellipse(o.x + o.w / 2, gy + o.h * 0.2, o.w / 2, o.h * 1.1, 0, 0, 6.283); c.fill(); c.stroke();
        c.fillStyle = '#bfe6ff'; c.beginPath(); c.ellipse(o.x + o.w * 0.35, gy + o.h * 0.05, o.w * 0.14, o.h * 0.3, 0, 0, 6.283); c.fill();
        const rp = (t * 1.5) % 1; c.strokeStyle = 'rgba(255,255,255,' + (1 - rp) + ')'; c.lineWidth = 2;
        c.beginPath(); c.ellipse(o.x + o.w * 0.62, gy + o.h * 0.2, o.w * 0.2 * rp, o.h * 0.5 * rp, 0, 0, 6.283); c.stroke();
      } else {
        const posts = 3, pw = o.w * 0.16;
        c.fillStyle = '#ffd08a';
        c.beginPath(); c.rect(o.x, gy - o.h * 0.72, o.w, o.h * 0.14); c.fill(); c.stroke();
        c.beginPath(); c.rect(o.x, gy - o.h * 0.38, o.w, o.h * 0.14); c.fill(); c.stroke();
        for(let i = 0; i < posts; i++){
          const px = o.x + (o.w - pw) * i / (posts - 1);
          c.fillStyle = '#fff3d6'; c.beginPath(); c.moveTo(px, gy); c.lineTo(px, gy - o.h * 0.85); c.lineTo(px + pw / 2, gy - o.h); c.lineTo(px + pw, gy - o.h * 0.85); c.lineTo(px + pw, gy); c.closePath(); c.fill(); c.stroke();
        }
      }
    }
    function hitTest(o){
      const s = S(), bx = BX(), r = R() * 0.62, by = B.y + R() * 0.2, gy = GROUND();
      if(o.type === 'puddle'){
        // only counts if Bobo's feet are on the ground over the middle of the puddle
        return B.onGround && bx > o.x + o.w * 0.2 && bx < o.x + o.w * 0.8;
      }
      const x0 = o.x + o.w * 0.12, x1 = o.x + o.w * 0.88, y0 = gy - o.h * 0.85;
      const nx = Math.max(x0, Math.min(bx, x1)), ny = Math.max(y0, Math.min(by, gy));
      return (bx - nx) * (bx - nx) + (by - ny) * (by - ny) < r * r;
    }

    function hill(c, off, y, amp, len, col){
      const W = api.W, H = api.H;
      c.fillStyle = col; c.beginPath(); c.moveTo(0, H);
      for(let x = 0; x <= W + 20; x += 20){ const wx = x + off; c.lineTo(x, y - amp * (0.6 + 0.4 * Math.sin(wx / len) * Math.sin(wx / (len * 0.37) + 1))); }
      c.lineTo(W, H); c.closePath(); c.fill();
    }

    return {
      resize(){ if(B.onGround) B.y = GROUND() - R() * 0.9; },
      pointerDown(){ jump(); },
      update(dt){
        t += dt; if(introT > 0) introT -= dt;
        for(const q of parts){ q.t += dt; q.x += q.vx * dt; q.y += q.vy * dt; q.vy += S() * 1.8 * dt; }
        parts = parts.filter(q => q.t < q.life);
        for(const q of pops) q.t += dt; pops = pops.filter(q => q.t < 0.8);
        B.squash = Math.max(0, B.squash - dt * 4);
        if(B.moodT > 0){ B.moodT -= dt; if(B.moodT <= 0) B.mood = 'happy'; }
        if(over){ overT += dt; if(overT > 1.2) api.end({ score: Math.floor(dist / MPX()) + coins, coins: undefined }); return; }
        const sp = speed(), dx = sp * dt, gy = GROUND(), r = R();
        dist += dx; inv = Math.max(0, inv - dt);
        // Bobo
        if(!B.onGround){
          B.vy += GRAV() * dt; B.y += B.vy * dt;
          if(B.y >= gy - r * 0.9){ B.y = gy - r * 0.9; B.vy = 0; B.onGround = true; B.jumps = 0; B.squash = 1; burst(BX(), gy, '#c9a66b', 4, 0.25); }
        }
        // world scroll
        for(const o of obs) o.x -= dx;
        for(const k of items) k.x -= dx;
        nextObs -= dx; nextCoin -= dx;
        if(nextObs <= api.W + S() * 0.1){
          spawnObs(api.W + S() * 0.2);
          const minGap = sp * Math.max(0.95, 1.6 - t * 0.008);
          nextObs = api.W + S() * 0.2 + minGap + sp * api.rand(0.2, 1.3);
        }
        if(nextCoin <= api.W){
          const n = 3 + Math.floor(Math.random() * 3), hy = Math.random() < 0.5 ? 0.12 : 0.42;
          for(let i = 0; i < n; i++) items.push({ x: api.W + S() * 0.15 + i * S() * 0.1, y: gy - S() * hy, got: false, ph: i * 0.6 });
          nextCoin = api.W + sp * api.rand(1.4, 2.6);
        }
        // collisions
        for(const o of obs){
          if(o.hit || inv > 0) continue;
          if(hitTest(o)){
            o.hit = true; hearts--; inv = 1.6; api.sfx.hit(); B.mood = 'sad'; B.moodT = 1;
            burst(BX(), B.y, o.type === 'puddle' ? '#4fb6ff' : '#ff6b6b', 12, 0.6);
            if(hearts <= 0){ over = true; overT = 0; api.sfx.bad(); api.toast('خلصوا القلوب!', 1300); }
            else api.toast(o.type === 'puddle' ? 'تبلّل بوبو! 💦' : 'آخ! 💥', 800);
          }
        }
        for(const k of items){
          if(k.got) continue;
          if(Math.hypot(k.x - BX(), k.y - B.y) < r + S() * 0.04){ k.got = true; coins++; api.sfx.coin(); burst(k.x, k.y, '#ffd34d', 6, 0.4); pops.push({ x: k.x, y: k.y, t: 0 }); if(B.moodT <= 0){ B.mood = 'wow'; B.moodT = 0.3; } }
        }
        obs = obs.filter(o => o.x + o.w > -S() * 0.3);
        items = items.filter(k => !k.got && k.x > -S() * 0.2);
      },
      draw(c){
        const W = api.W, H = api.H, s = S(), gy = GROUND(), r = R();
        const sky = c.createLinearGradient(0, 0, 0, gy); sky.addColorStop(0, '#6fd0ff'); sky.addColorStop(1, '#d9f6ff');
        c.fillStyle = sky; c.fillRect(0, 0, W, gy);
        // sun
        c.fillStyle = '#ffe066'; c.strokeStyle = OUT; c.lineWidth = 4;
        const sx = W - s * 0.2, sy = H * 0.2;
        c.save(); c.translate(sx, sy); c.rotate(t * 0.3); c.fillStyle = '#ffd34d';
        for(let i = 0; i < 10; i++){ c.rotate(Math.PI / 5); c.beginPath(); c.moveTo(s * 0.085, -s * 0.02); c.lineTo(s * 0.13, 0); c.lineTo(s * 0.085, s * 0.02); c.fill(); }
        c.restore();
        c.fillStyle = '#ffe066'; c.beginPath(); c.arc(sx, sy, s * 0.075, 0, 6.283); c.fill(); c.stroke();
        // clouds
        c.fillStyle = '#fff';
        for(let i = 0; i < 4; i++){
          const span = W + s * 0.8, cx = ((i * span / 4 - dist * 0.08) % span + span) % span - s * 0.4, cy = H * (0.14 + (i % 2) * 0.1), cs = s * 0.05;
          c.beginPath(); c.arc(cx, cy, cs, 0, 6.283); c.arc(cx + cs * 1.1, cy + cs * 0.25, cs * 0.8, 0, 6.283); c.arc(cx - cs * 1.1, cy + cs * 0.3, cs * 0.7, 0, 6.283); c.fill();
        }
        // hills
        hill(c, dist * 0.15, gy - s * 0.18, s * 0.22, s * 0.5, '#9be37a');
        hill(c, dist * 0.35, gy - s * 0.04, s * 0.14, s * 0.3, '#6dd04a');
        // trees
        const tsp = s * 0.7;
        for(let x = -((dist * 0.6) % tsp); x < W + tsp; x += tsp){
          const tx = x + s * 0.2, ty = gy - s * 0.02, th = s * 0.26;
          c.fillStyle = '#a06a3c'; c.strokeStyle = OUT; c.lineWidth = 3;
          c.beginPath(); c.rect(tx - s * 0.02, ty - th * 0.6, s * 0.04, th * 0.6); c.fill(); c.stroke();
          c.fillStyle = '#3fae35'; c.beginPath(); c.arc(tx, ty - th * 0.75, s * 0.09, 0, 6.283); c.arc(tx - s * 0.06, ty - th * 0.55, s * 0.065, 0, 6.283); c.arc(tx + s * 0.06, ty - th * 0.55, s * 0.065, 0, 6.283); c.fill(); c.stroke();
          c.fillStyle = '#ff6b6b'; c.beginPath(); c.arc(tx - s * 0.03, ty - th * 0.78, s * 0.012, 0, 6.283); c.arc(tx + s * 0.04, ty - th * 0.62, s * 0.012, 0, 6.283); c.fill();
        }
        // ground
        c.fillStyle = '#e8c872'; c.fillRect(0, gy, W, H - gy);
        c.fillStyle = '#6dd04a'; c.fillRect(0, gy, W, s * 0.04);
        c.fillStyle = '#d2ab52'; const st = s * 0.12;
        for(let x = -((dist % st) + st); x < W + st; x += st){ c.beginPath(); c.ellipse(x, gy + s * 0.1 + (Math.round(x / st) % 2) * s * 0.06, s * 0.02, s * 0.01, 0, 0, 6.283); c.fill(); }
        c.fillStyle = '#ff8fb8';
        for(let x = -((dist % (st * 2.3)) + st); x < W + st; x += st * 2.3){ c.beginPath(); c.arc(x, gy + s * 0.02, s * 0.012, 0, 6.283); c.fill(); }
        c.strokeStyle = OUT; c.lineWidth = 4; c.beginPath(); c.moveTo(0, gy); c.lineTo(W, gy); c.stroke();
        // obstacles & coins
        for(const o of obs) drawObs(c, o);
        for(const k of items){ const bob = Math.sin(t * 5 + k.ph) * s * 0.01; api.emoji(c, '🪙', k.x, k.y + bob, s * 0.07); }
        // Bobo
        const bx = BX();
        c.fillStyle = 'rgba(0,0,0,.18)'; const sh = 1 - Math.min(0.7, (gy - r * 0.9 - B.y) / (s * 0.5));
        c.beginPath(); c.ellipse(bx, gy + s * 0.005, r * 0.8 * sh, r * 0.18 * sh, 0, 0, 6.283); c.fill();
        if(!(inv > 0 && Math.floor(inv * 10) % 2 === 0) || over){
          c.save();
          const run = B.onGround && !over ? Math.abs(Math.sin(t * 14)) * r * 0.12 : 0;
          const sq = B.squash * 0.22, ang = B.onGround ? 0 : api.clamp(B.vy / JV() * 0.25, -0.25, 0.25);
          c.translate(bx, B.y + r * 0.8 - run); c.rotate(ang); c.scale(1 + sq, 1 - sq); c.translate(-bx, -(B.y + r * 0.8));
          // little running feet
          if(B.onGround && !over){
            c.fillStyle = OUT; const ph = t * 14;
            c.beginPath(); c.ellipse(bx - r * 0.35 + Math.sin(ph) * r * 0.25, B.y + r * 0.88, r * 0.2, r * 0.1, 0, 0, 6.283); c.ellipse(bx + r * 0.35 - Math.sin(ph) * r * 0.25, B.y + r * 0.88, r * 0.2, r * 0.1, 0, 0, 6.283); c.fill();
          }
          api.bobo(c, bx, B.y, r, over ? 'sad' : B.mood, { x: 1, y: B.vy > 0 ? 0.5 : -0.2 }, t);
          c.restore();
        }
        for(const q of parts){ c.globalAlpha = 1 - q.t / q.life; c.fillStyle = q.col; c.beginPath(); c.arc(q.x, q.y, q.r, 0, 6.283); c.fill(); }
        c.globalAlpha = 1;
        for(const q of pops){ c.globalAlpha = 1 - q.t / 0.8; api.text(c, '+١', q.x, q.y - q.t * s * 0.15, s * 0.06, '#ffd34d'); }
        c.globalAlpha = 1;
        if(introT > 0) api.text(c, 'اكبس لتنطّ! 👆', W / 2, H * 0.45, s * 0.075, '#fff7e8');
        // HUD
        const ph = Math.max(40, s * 0.1);
        c.fillStyle = 'rgba(28,24,56,.72)'; c.beginPath(); c.roundRect(W / 2 - s * 0.2, 34 - ph / 2, s * 0.4, ph, ph / 2); c.fill();
        api.text(c, '🏃 ' + api.AR(Math.floor(dist / MPX())) + ' م', W / 2, 35, ph * 0.5, '#fff7e8');
        c.fillStyle = 'rgba(28,24,56,.72)'; c.beginPath(); c.roundRect(W - s * 0.26 - 8, 34 - ph / 2, s * 0.26, ph, ph / 2); c.fill();
        api.text(c, '🪙 ' + api.AR(coins), W - s * 0.13 - 8, 35, ph * 0.5, '#fff7e8');
        for(let i = 0; i < 3; i++) api.emoji(c, i < hearts ? '❤️' : '🤍', W / 2 + (i - 1) * s * 0.1, 34 + ph * 0.95, s * 0.07);
      }
    };
  }
});
