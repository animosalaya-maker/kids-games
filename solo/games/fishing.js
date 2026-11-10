/* Fishing: Bobo in a boat. Tap where to fish: the boat rows there and drops the hook straight down. 45-second round. */
Solo.register({
  id: 'fishing', title: 'صيد السمك', emoji: '🎣', bg: '#1fa2d6',
  help: 'اكبس فوق السمكة، بوبو بيروح بالقارب وبنزّل الصنارة',
  create(api){
    const emoji = (c, e, x, y, sz, r) => { c.fillStyle = '#000'; api.emoji(c, e, x, y, sz, r); };
    const OUT = '#1c1838', ROUND = 45;
    const S = () => Math.min(api.W, api.H);
    const SEA = () => api.H * 0.26;                 // water surface
    const FLOOR = () => api.H - S() * 0.09;         // sand
    const KINDS = [
      { e: '🐟', draw: 'small', col: '#ff9f1c', fin: '#ff6b3d', pts: 1, sp: 0.22, depth: [0.05, 0.5], w: 5 },
      { e: '🐠', draw: 'stripe', col: '#ffd34d', fin: '#4fb6ff', pts: 2, sp: 0.3, depth: [0.2, 0.7], w: 4 },
      { e: '🐡', draw: 'puff', col: '#ff8fb8', fin: '#e85a95', pts: 3, sp: 0.18, depth: [0.45, 0.92], w: 3 },
      { e: '🦑', pts: 4, sp: 0.36, depth: [0.6, 0.92], w: 1.2 },
      { e: '🥾', pts: 0, sp: 0.1, depth: [0.3, 0.9], w: 1.1, junk: true },
      { e: '🦀', pts: 0, sp: 0.12, depth: [1, 1], w: 0.9, junk: true, crab: true }
    ];

    let t = 0, score = 0, caught = 0, ended = false, endT = 0, introT = 3, lastWarn = 99;
    let mood = 'happy', moodT = 0, funny = 0;
    const boat = { x: api.W / 2, target: api.W / 2, drift: 0, side: 1 };
    const hook = { state: 'idle', y: 0, fish: null, depthMax: 0 };    // idle | wait | down | up
    let fish = [], parts = [], pops = [], bubbles = [], flyers = [];

    function pickKind(){
      const tot = KINDS.reduce((a, k) => a + k.w, 0); let r = Math.random() * tot;
      for(const k of KINDS){ r -= k.w; if(r <= 0) return k; } return KINDS[0];
    }
    function spawnFish(anywhere){
      const k = pickKind(), dir = Math.random() < 0.5 ? -1 : 1, s = S();
      const top = SEA() + s * 0.12, bot = FLOOR() - s * 0.07;
      const y = k.crab ? FLOOR() - s * 0.035 : top + (bot - top) * api.rand(k.depth[0], k.depth[1]);
      const x = anywhere ? api.rand(s * 0.1, api.W - s * 0.1) : (dir > 0 ? -s * 0.1 : api.W + s * 0.1);
      fish.push({ k, x, y, dir, sp: s * k.sp * api.rand(0.85, 1.2), ph: Math.random() * 6, size: s * (k.crab ? 0.08 : k.draw === 'puff' ? 0.12 : k.draw ? 0.13 : 0.095) });
    }
    for(let i = 0; i < 7; i++) spawnFish(true);

    function burst(x, y, col, n, sp){
      for(let i = 0; i < n; i++){ const a = Math.random() * 6.283, v = S() * api.rand(0.15, sp || 0.5); parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - S() * 0.25, t: 0, life: api.rand(0.4, 0.8), col, r: S() * api.rand(0.008, 0.016) }); }
    }
    const rodTip = () => ({ x: boat.x + boat.side * S() * 0.13, y: SEA() - S() * 0.2 });
    const bmin = () => Math.min(api.W / 2, S() * 0.23), bmax = () => Math.max(api.W / 2, api.W - S() * 0.23);

    function cast(x){
      if(ended || hook.state !== 'idle') return;
      introT = 0;
      if(Math.abs(boat.x - x) > S() * 0.05 || boat.side * (x - boat.x) < 0) boat.side = x < api.W / 2 ? -1 : 1;
      boat.target = api.clamp(x - boat.side * S() * 0.13, bmin(), bmax());
      hook.state = 'wait'; api.sfx.tap();
    }

    // drawn fish face right (+x); flip for dir < 0
    function drawFish(c, k, size, ph){
      const s = S(), L = size * 0.55, Hh = k.draw === 'puff' ? size * 0.42 : size * 0.3, lw = Math.max(2.5, s * 0.007);
      c.lineWidth = lw; c.strokeStyle = OUT; c.lineJoin = 'round';
      const wag = Math.sin(ph * 10) * 0.25;
      // tail
      c.save(); c.translate(-L * 0.8, 0); c.rotate(wag);
      c.fillStyle = k.fin; c.beginPath(); c.moveTo(L * 0.15, 0); c.lineTo(-L * 0.55, -Hh * 0.8); c.quadraticCurveTo(-L * 0.35, 0, -L * 0.55, Hh * 0.8); c.closePath(); c.fill(); c.stroke();
      c.restore();
      // body
      c.fillStyle = k.col; c.beginPath(); c.ellipse(0, 0, L, Hh, 0, 0, 6.283); c.fill();
      if(k.draw === 'stripe'){ c.save(); c.clip(); c.fillStyle = '#4fb6ff'; for(const sx of [-0.35, 0.15]){ c.fillRect(L * sx, -Hh, L * 0.2, Hh * 2); } c.restore(); }
      if(k.draw === 'puff'){ c.fillStyle = '#fff1f6'; c.beginPath(); c.ellipse(L * 0.05, Hh * 0.35, L * 0.6, Hh * 0.45, 0, 0, 6.283); c.fill(); }
      c.beginPath(); c.ellipse(0, 0, L, Hh, 0, 0, 6.283); c.stroke();
      if(k.draw === 'puff'){ c.fillStyle = OUT; for(let i = 0; i < 7; i++){ const a = -2.6 + i * 0.75; c.beginPath(); c.arc(Math.cos(a) * L * 1.02, Math.sin(a) * Hh * 1.02, lw * 0.7, 0, 6.283); c.fill(); } }
      // top fin
      c.fillStyle = k.fin; c.beginPath(); c.moveTo(-L * 0.3, -Hh * 0.9); c.quadraticCurveTo(-L * 0.05, -Hh * 1.6, L * 0.25, -Hh * 0.92); c.closePath(); c.fill(); c.stroke();
      // eye + smile
      c.fillStyle = '#fff'; c.beginPath(); c.arc(L * 0.5, -Hh * 0.2, Hh * 0.32, 0, 6.283); c.fill(); c.stroke();
      c.fillStyle = OUT; c.beginPath(); c.arc(L * 0.58, -Hh * 0.2, Hh * 0.15, 0, 6.283); c.fill();
      c.beginPath(); c.arc(L * 0.72, Hh * 0.22, Hh * 0.16, 0.1 * Math.PI, 0.9 * Math.PI); c.stroke();
      c.fillStyle = 'rgba(255,90,120,.5)'; c.beginPath(); c.arc(L * 0.3, Hh * 0.25, Hh * 0.14, 0, 6.283); c.fill();
    }
    function drawCreature(c, k, size, ph, rot){
      if(k.draw){ if(rot) c.rotate(rot); drawFish(c, k, size, ph); }
      else emoji(c, k.e, 0, 0, size, rot || 0);
    }

    function drawBoat(c){
      const s = S(), bx = boat.x, wy = SEA(), bob = Math.sin(t * 2.2) * s * 0.008, rock = Math.sin(t * 1.7) * 0.04;
      c.save(); c.translate(bx, wy + bob); c.rotate(rock);
      // Bobo sits in the boat
      const br = s * 0.075, sd = boat.side;
      api.bobo(c, -sd * s * 0.02, -s * 0.07, br, funny > 0 ? 'wow' : (ended ? 'happy' : mood), { x: 0.6 * sd, y: hook.state === 'idle' ? 0 : 0.9 }, t);
      // rod
      c.strokeStyle = '#7a4a22'; c.lineWidth = Math.max(4, s * 0.012); c.lineCap = 'round';
      c.beginPath(); c.moveTo(sd * s * 0.03, -s * 0.03); c.lineTo(sd * s * 0.13, -s * 0.2 - bob); c.stroke();
      c.lineCap = 'butt';
      // hull
      const hw = s * 0.22, hh = s * 0.075;
      c.lineWidth = Math.max(3, s * 0.009); c.strokeStyle = OUT; c.lineJoin = 'round';
      c.fillStyle = '#ff7a59'; c.beginPath(); c.moveTo(-hw, -hh * 0.6); c.lineTo(hw, -hh * 0.6); c.quadraticCurveTo(hw * 0.9, hh, hw * 0.5, hh); c.lineTo(-hw * 0.5, hh); c.quadraticCurveTo(-hw * 0.9, hh, -hw, -hh * 0.6); c.closePath(); c.fill(); c.stroke();
      c.fillStyle = '#fff7e8'; c.fillRect(-hw * 0.86, -hh * 0.2, hw * 1.72, hh * 0.26);
      c.fillStyle = '#ffd34d'; c.beginPath(); c.arc(-hw * 0.45, hh * 0.45, hh * 0.18, 0, 6.283); c.arc(0, hh * 0.45, hh * 0.18, 0, 6.283); c.arc(hw * 0.45, hh * 0.45, hh * 0.18, 0, 6.283); c.fill();
      c.restore();
    }

    return {
      resize(){},
      pointerDown(p){ cast(p.x); },
      update(dt){
        t += dt; if(introT > 0) introT -= dt;
        const s = S();
        funny = Math.max(0, funny - dt);
        if(moodT > 0){ moodT -= dt; if(moodT <= 0) mood = 'happy'; }
        for(const q of parts){ q.t += dt; q.x += q.vx * dt; q.y += q.vy * dt; q.vy += s * 1.5 * dt; }
        parts = parts.filter(q => q.t < q.life);
        for(const q of pops) q.t += dt; pops = pops.filter(q => q.t < 1);
        for(const b of bubbles){ b.t += dt; b.y -= s * 0.12 * dt; b.x += Math.sin(b.t * 5 + b.ph) * s * 0.02 * dt; }
        bubbles = bubbles.filter(b => b.y > SEA() + 4 && b.t < 4);
        if(Math.random() < dt * 3) bubbles.push({ x: api.rand(0, api.W), y: FLOOR() - 6, t: 0, ph: Math.random() * 6, r: s * api.rand(0.006, 0.014) });
        for(const f of flyers){ f.t += dt; } flyers = flyers.filter(f => f.t < 0.7);
        // clock
        const left = ROUND - t;
        if(!ended && left <= 5 && Math.ceil(left) < lastWarn){ lastWarn = Math.ceil(left); api.tone(880, 0.08, 'square', 0.06); }
        if(!ended && left <= 0){
          ended = true; endT = 0; api.toast('خلص الوقت! ⏰', 1300);
        }
        if(ended){ endT += dt; if(endT > 1.4) api.end({ score, win: true, msg: score >= 30 ? 'صيّاد شاطر كتير!' : score > 0 ? 'صيد حلو!' : 'جرّب مرة كمان!' }); }
        // boat
        if(hook.state === 'idle' && !ended){ boat.drift += dt; boat.target = api.clamp(boat.target + Math.sin(boat.drift * 0.6) * s * 0.05 * dt, bmin(), bmax()); }
        const dx = boat.target - boat.x, bs = s * 1.6 * dt;
        boat.x += Math.abs(dx) < bs ? dx : Math.sign(dx) * bs;
        // hook
        const tip = rodTip();
        if(hook.state === 'wait'){ hook.y = tip.y; if(Math.abs(boat.target - boat.x) < 1){ hook.state = 'down'; api.sfx.swoosh(); hook.y = tip.y; } }
        else if(hook.state === 'down'){
          hook.y += s * 0.95 * dt;
          if(hook.y > SEA() && hook.y - s * 0.95 * dt <= SEA()){ burst(tip.x, SEA(), '#bfe6ff', 8, 0.3); api.sfx.pop(); }
          const reach = s * 0.08;
          for(const f of fish){
            if(Math.abs(f.x - tip.x) < reach + f.size * 0.3 && Math.abs(f.y - hook.y) < reach){
              hook.fish = f; hook.state = 'up'; fish = fish.filter(o => o !== f);
              api.sfx.pop(); burst(f.x, f.y, '#bfe6ff', 8, 0.3); break;
            }
          }
          if(hook.state === 'down' && hook.y >= FLOOR() - s * 0.02){ hook.state = 'up'; }
        } else if(hook.state === 'up'){
          hook.y -= s * (hook.fish ? 0.75 : 1.2) * dt;
          if(hook.fish){ hook.fish.x = tip.x; hook.fish.y = hook.y + hook.fish.size * 0.45; }
          if(hook.y <= tip.y){
            hook.y = tip.y; hook.state = 'idle';
            const f = hook.fish; hook.fish = null;
            if(f){
              caught++;
              if(f.k.junk){
                funny = 1.2; mood = 'sad'; moodT = 1.2; api.sfx.bad();
                api.toast(f.k.crab ? 'قرصني السلطعون! 🦀😂' : 'جزمة؟! 😂', 1100);
                pops.push({ str: '٠', x: tip.x, y: tip.y, t: 0 });
              } else {
                score += f.k.pts; mood = 'happy'; moodT = 1; api.sfx.coin(); if(f.k.pts >= 3) api.sfx.good();
                pops.push({ str: '+' + api.AR(f.k.pts), x: tip.x, y: tip.y, t: 0 });
                burst(tip.x, tip.y, '#ffd34d', 12, 0.6);
              }
              flyers.push({ k: f.k, x0: tip.x, y0: tip.y, x1: boat.x - s * 0.1, y1: SEA() - s * 0.02, t: 0 });
            }
          }
        }
        // fish swim
        for(const f of fish){
          f.x += f.dir * f.sp * dt; f.ph += dt;
          if(!f.k.crab) f.y += Math.sin(f.ph * 2) * s * 0.02 * dt;
          if(Math.random() < dt * 0.05 && !f.k.crab) f.dir *= -1;
        }
        fish = fish.filter(f => f.x > -s * 0.2 && f.x < api.W + s * 0.2);
        while(fish.length < 7) spawnFish(false);
      },
      draw(c){
        const W = api.W, H = api.H, s = S(), wy = SEA(), fl = FLOOR();
        // sky
        const sky = c.createLinearGradient(0, 0, 0, wy); sky.addColorStop(0, '#7fd3ff'); sky.addColorStop(1, '#d9f6ff');
        c.fillStyle = sky; c.fillRect(0, 0, W, wy + 2);
        c.fillStyle = '#ffe066'; c.strokeStyle = OUT; c.lineWidth = 3; c.beginPath(); c.arc(W - s * 0.15, wy * 0.42, s * 0.06, 0, 6.283); c.fill(); c.stroke();
        c.fillStyle = '#fff';
        for(let i = 0; i < 3; i++){ const cx = ((i * W / 3 + t * s * 0.02) % (W + s * 0.4)) - s * 0.2, cy = wy * (0.35 + (i % 2) * 0.2), cs = s * 0.04; c.beginPath(); c.arc(cx, cy, cs, 0, 6.283); c.arc(cx + cs, cy + cs * 0.2, cs * 0.8, 0, 6.283); c.arc(cx - cs, cy + cs * 0.25, cs * 0.7, 0, 6.283); c.fill(); }
        // sea
        const sea = c.createLinearGradient(0, wy, 0, H); sea.addColorStop(0, '#36c3ef'); sea.addColorStop(1, '#0f6aa8');
        c.fillStyle = sea; c.fillRect(0, wy, W, H - wy);
        // light rays
        c.fillStyle = 'rgba(255,255,255,.06)';
        for(let i = 0; i < 4; i++){ const x = ((i * W / 4 + t * 8) % W); c.beginPath(); c.moveTo(x, wy); c.lineTo(x + s * 0.08, wy); c.lineTo(x - s * 0.1, H); c.lineTo(x - s * 0.22, H); c.closePath(); c.fill(); }
        // sand + weeds
        c.fillStyle = '#f3d98b'; c.beginPath(); c.moveTo(0, H);
        for(let x = 0; x <= W + 20; x += 20) c.lineTo(x, fl + Math.sin(x / (s * 0.15)) * s * 0.012);
        c.lineTo(W, H); c.closePath(); c.fill(); c.strokeStyle = OUT; c.lineWidth = 3; c.stroke();
        c.strokeStyle = '#3fae35'; c.lineWidth = Math.max(4, s * 0.014); c.lineCap = 'round';
        for(let i = 0; i < 6; i++){
          const x = (i + 0.5) * W / 6 + ((i * 37) % 20), hgt = s * (0.08 + (i % 3) * 0.03);
          c.beginPath(); c.moveTo(x, fl + 4);
          for(let k = 1; k <= 4; k++) c.lineTo(x + Math.sin(t * 1.5 + i + k) * s * 0.015, fl - hgt * k / 4);
          c.stroke();
        }
        c.lineCap = 'butt';
        for(const b of bubbles){ c.strokeStyle = 'rgba(255,255,255,.6)'; c.lineWidth = 2; c.beginPath(); c.arc(b.x, b.y, b.r, 0, 6.283); c.stroke(); }
        // fish
        for(const f of fish){
          c.save(); c.translate(f.x, f.y + (f.k.crab ? Math.abs(Math.sin(f.ph * 8)) * -s * 0.006 : 0));
          if(f.k.draw && f.dir < 0) c.scale(-1, 1);
          drawCreature(c, f.k, f.size, f.ph, f.k.crab ? 0 : Math.sin(f.ph * 3) * 0.08);
          c.restore();
        }
        // waves on top of water
        c.fillStyle = '#9fe6ff'; c.beginPath(); c.moveTo(0, wy);
        for(let x = 0; x <= W + 10; x += 10) c.lineTo(x, wy + Math.sin(x / (s * 0.06) + t * 2) * s * 0.008);
        c.lineTo(W, wy + s * 0.025); c.lineTo(0, wy + s * 0.025); c.closePath(); c.fill();
        c.strokeStyle = OUT; c.lineWidth = 3; c.beginPath();
        for(let x = 0; x <= W + 10; x += 10) (x ? c.lineTo : c.moveTo).call(c, x, wy + Math.sin(x / (s * 0.06) + t * 2) * s * 0.008);
        c.stroke();
        // boat + line + hook
        drawBoat(c);
        const tip = rodTip();
        if(hook.state === 'down' || hook.state === 'up'){
          c.strokeStyle = '#fff7e8'; c.lineWidth = 2; c.beginPath(); c.moveTo(tip.x, tip.y); c.lineTo(tip.x, hook.y); c.stroke();
          c.strokeStyle = OUT; c.lineWidth = Math.max(3, s * 0.008); c.lineCap = 'round';
          c.beginPath(); c.moveTo(tip.x, hook.y); c.lineTo(tip.x, hook.y + s * 0.03); c.arc(tip.x - s * 0.015, hook.y + s * 0.03, s * 0.015, 0, Math.PI); c.stroke(); c.lineCap = 'butt';
          c.fillStyle = '#ff5a5f'; c.beginPath(); c.arc(tip.x, hook.y - s * 0.005, s * 0.012, 0, 6.283); c.fill();
          if(hook.fish){ c.save(); c.translate(hook.fish.x, hook.fish.y); drawCreature(c, hook.fish.k, hook.fish.size, t * 3, -Math.PI / 2 + Math.sin(t * 20) * 0.25); c.restore(); }
        } else {
          c.strokeStyle = '#fff7e8'; c.lineWidth = 2; c.beginPath(); c.moveTo(tip.x, tip.y); c.lineTo(tip.x, tip.y + s * 0.05); c.stroke();
          c.fillStyle = '#ff5a5f'; c.strokeStyle = OUT; c.beginPath(); c.arc(tip.x, tip.y + s * 0.05, s * 0.012, 0, 6.283); c.fill(); c.stroke();
        }
        if(hook.state === 'wait'){ const lx = boat.target + boat.side * s * 0.13; c.globalAlpha = 0.5; c.strokeStyle = '#fff'; c.setLineDash([6, 8]); c.lineWidth = 3; c.beginPath(); c.moveTo(lx, wy + 10); c.lineTo(lx, fl); c.stroke(); c.setLineDash([]); c.globalAlpha = 1; }
        // catches flying into the boat
        for(const f of flyers){ const k = f.t / 0.7, x = f.x0 + (f.x1 - f.x0) * k, y = f.y0 + (f.y1 - f.y0) * k - Math.sin(k * Math.PI) * s * 0.15; c.save(); c.translate(x, y); drawCreature(c, f.k, s * 0.1 * (1 - k * 0.4), t, k * 6); c.restore(); }
        for(const q of parts){ c.globalAlpha = 1 - q.t / q.life; c.fillStyle = q.col; c.beginPath(); c.arc(q.x, q.y, q.r, 0, 6.283); c.fill(); }
        c.globalAlpha = 1;
        for(const q of pops){ c.globalAlpha = 1 - Math.max(0, q.t - 0.5) * 2; api.text(c, q.str, q.x, q.y - s * 0.05 - q.t * s * 0.12, s * 0.085, q.str === '٠' ? '#ffb3b3' : '#ffd34d'); }
        c.globalAlpha = 1;
        if(introT > 0) api.text(c, 'اكبس على سمكة 👆', W / 2, wy + (fl - wy) * 0.45, s * 0.07, '#fff7e8');
        // HUD (capped size on tablets)
        { const s = Math.min(S(), 440);
        const ph = Math.max(40, s * 0.1), left = Math.max(0, Math.ceil(ROUND - t));
        c.fillStyle = 'rgba(28,24,56,.72)'; c.beginPath(); c.roundRect(W / 2 - s * 0.16, 34 - ph / 2, s * 0.32, ph, ph / 2); c.fill();
        api.text(c, '🎣 ' + api.AR(score), W / 2, 35, ph * 0.55, '#fff7e8');
        c.fillStyle = left <= 5 ? 'rgba(255,90,95,.9)' : 'rgba(28,24,56,.72)'; c.beginPath(); c.roundRect(W - s * 0.24 - 8, 34 - ph / 2, s * 0.24, ph, ph / 2); c.fill();
        api.text(c, '⏰ ' + api.AR(left), W - s * 0.12 - 8, 35, ph * 0.5 * (left <= 5 ? 1 + Math.sin(t * 12) * 0.06 : 1), '#fff7e8');
        // time bar
        c.fillStyle = 'rgba(28,24,56,.4)'; c.fillRect(0, 0, W, 6); c.fillStyle = '#ffd34d'; c.fillRect(0, 0, W * Math.max(0, 1 - t / ROUND), 6); }
      }
    };
  }
});
