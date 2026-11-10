/* Bobo jumper: endless vertical bouncer. Bobo auto-bounces on clouds; hold the left/right half to steer (wraps around). */
Solo.register({
  id: 'jumper', title: 'قفز بوبو', emoji: '🦘', bg: '#7c5cff',
  help: 'اكبس يمين أو شمال ليمشي بوبو، ونطّ على الغيمات لفوق',
  create(api){
    const OUT = '#1c1838';
    const S = () => Math.min(api.W, api.H);
    const MPX = () => S() * 0.12;               // pixels per "metre"
    const R = () => S() * 0.065;                // Bobo radius
    const G = () => api.H * 1.55;               // gravity
    const JUMP = () => Math.sqrt(2 * G() * api.H * 0.27);
    const PH = () => S() * 0.05;                // platform thickness

    let groundHits = 0, t = 0, over = false, overT = 0, stars = 0, maxH = 0, hold = 0, squash = 0, mood = 'happy', moodT = 0, introT = 2.5;
    const holds = new Map();
    const B = { x: api.W / 2, y: 0, vx: 0, vy: 0 };
    let camTop = 0, startY = 0, nextY = 0;
    let plats = [], pickups = [], parts = [], pops = [];

    function heightM(){ return Math.max(0, Math.floor((startY - B.y) / MPX())); }
    function addPlat(y){
      const W = api.W, s = S(), lvl = (startY - y) / MPX();          // metres
      const w = Math.max(s * 0.2, s * (0.32 - lvl * 0.0008));
      let type = 'normal';
      const r = Math.random();
      if(lvl > 25 && r < Math.min(0.32, 0.08 + lvl * 0.0015)) type = 'move';
      else if(lvl > 55 && r < Math.min(0.55, 0.36 + lvl * 0.001)) type = 'crumble';
      const early = plats.length <= 3;
      const p = { x: early ? W / 2 + api.rand(-w * 0.25, w * 0.25) : api.rand(w / 2 + 6, W - w / 2 - 6), y, w, type, vx: 0, broken: false, fall: 0, rot: 0, squish: 0, hue: Math.random() };
      if(type === 'move') p.vx = api.pick([-1, 1]) * s * Math.min(0.55, 0.22 + lvl * 0.002);
      plats.push(p);
      if(type !== 'crumble' && Math.random() < 0.28) pickups.push({ x: p.x + api.rand(-w * 0.3, w * 0.3), y: y - s * api.rand(0.12, 0.2), got: false, ph: Math.random() * 6 });
      return p;
    }
    function gap(){
      const lvl = (startY - nextY) / MPX();
      const g = api.H * (0.09 + Math.min(0.11, lvl * 0.0009));
      return g * api.rand(0.8, 1.2);
    }
    function init(){
      plats = []; pickups = [];
      startY = api.H * 0.82; nextY = startY;
      plats.push({ x: api.W / 2, y: startY, w: api.W * 1.2, type: 'ground', vx: 0, broken: false, fall: 0, rot: 0, squish: 0, hue: 0 });
      B.x = api.W / 2; B.y = startY - R(); B.vy = -JUMP(); camTop = 0;
      nextY = startY - api.H * 0.12;
      fill();
    }
    function fill(){ while(nextY > camTop - api.H * 0.6){ addPlat(nextY); nextY -= gap(); } }

    function burst(x, y, col, n, sp){
      for(let i = 0; i < n; i++){ const a = Math.random() * 6.283, v = S() * api.rand(0.2, sp || 0.6); parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - S() * 0.2, t: 0, life: api.rand(0.4, 0.8), col, r: S() * api.rand(0.008, 0.018) }); }
    }

    function drawCloud(c, p, scr){
      const s = S(), x = p.x, y = scr, w = p.w, h = PH() * (1 - p.squish * 0.35);
      c.save(); c.translate(x, y + h / 2); if(p.rot) c.rotate(p.rot); if(p.broken) c.globalAlpha = Math.max(0, 1 - p.fall * 1.5);
      else if(p.hits && p.type !== 'ground' && p.type !== 'crumble') c.globalAlpha = p.hits >= 2 ? 0.55 : 0.8;
      let fillC = '#ffffff', shade = '#d9e4ff';
      if(p.type === 'move'){ fillC = '#ffe0f0'; shade = '#ffb3d6'; }
      if(p.type === 'crumble'){ fillC = '#e6dccb'; shade = '#c4b49b'; }
      if(p.type === 'ground'){ fillC = '#8be86f'; shade = '#5fc24a'; }
      c.lineWidth = Math.max(3, s * 0.009); c.strokeStyle = OUT; c.lineJoin = 'round';
      if(p.type === 'ground'){
        c.fillStyle = fillC; c.beginPath(); c.rect(-w / 2, -h / 2, w, api.H); c.fill(); c.stroke();
        c.restore(); return;
      }
      const puffs = Math.max(3, Math.round(w / (h * 1.3)));
      c.beginPath();
      c.roundRect(-w / 2, -h / 2, w, h, h / 2);
      for(let i = 0; i < puffs; i++){ const px = -w / 2 + w * (i + 0.5) / puffs, pr = h * (0.62 + ((i * 7) % 3) * 0.08); c.moveTo(px + pr, -h * 0.2); c.arc(px, -h * 0.2, pr, 0, 6.283); }
      c.fillStyle = fillC;
      c.save(); c.stroke(); c.restore(); c.fill();
      c.fillStyle = shade; c.beginPath(); c.roundRect(-w / 2 + h * 0.3, h * 0.05, w - h * 0.6, h * 0.3, h * 0.15); c.fill();
      if(p.type === 'crumble'){
        c.strokeStyle = '#8a7658'; c.lineWidth = Math.max(2, s * 0.005); c.beginPath();
        c.moveTo(-w * 0.15, -h * 0.5); c.lineTo(-w * 0.05, 0); c.lineTo(-w * 0.12, h * 0.4);
        c.moveTo(w * 0.2, -h * 0.4); c.lineTo(w * 0.12, h * 0.05); c.lineTo(w * 0.22, h * 0.4); c.stroke();
      }
      if(p.type === 'move'){
        c.fillStyle = OUT; const a = h * 0.35;
        for(const sx of [-1, 1]){ c.beginPath(); c.moveTo(sx * (w / 2 + a * 0.4), -h * 0.15); c.lineTo(sx * (w / 2 - a * 0.6), -h * 0.15 - a); c.lineTo(sx * (w / 2 - a * 0.6), -h * 0.15 + a); c.closePath(); c.fill(); }
      }
      // cute face on plain clouds
      if(p.type === 'normal' && w > s * 0.22){
        c.fillStyle = OUT; c.beginPath(); c.arc(-h * 0.45, -h * 0.25, h * 0.09, 0, 6.283); c.arc(h * 0.45, -h * 0.25, h * 0.09, 0, 6.283); c.fill();
        c.strokeStyle = OUT; c.lineWidth = Math.max(1.5, h * 0.07); c.beginPath(); c.arc(0, -h * 0.2, h * 0.18, 0.15 * Math.PI, 0.85 * Math.PI); c.stroke();
      }
      c.restore();
    }

    init();

    return {
      resize(){},
      pointerDown(p){ holds.set(p.id, p.x < api.W / 2 ? -1 : 1); introT = 0; },
      pointerMove(p){ if(holds.has(p.id)) holds.set(p.id, p.x < api.W / 2 ? -1 : 1); },
      pointerUp(p){ holds.delete(p.id); },
      update(dt){
        t += dt; if(introT > 0) introT -= dt;
        for(const q of parts){ q.t += dt; q.x += q.vx * dt; q.y += q.vy * dt; q.vy += S() * 1.5 * dt; }
        parts = parts.filter(q => q.t < q.life);
        for(const q of pops) q.t += dt; pops = pops.filter(q => q.t < 0.9);
        squash = Math.max(0, squash - dt * 4);
        if(moodT > 0){ moodT -= dt; if(moodT <= 0) mood = 'happy'; }
        if(over){ overT += dt; B.vy += G() * dt; B.y += B.vy * dt; if(overT > 1.1) api.end({ score: heightM() + stars * 5, msg: heightM() > 80 ? 'وصلت لفوق كتير!' : undefined }); return; }
        const W = api.W, s = S(), r = R();
        // steering
        let dir = 0; for(const v of holds.values()) dir += v; dir = Math.sign(dir);
        const target = dir * s * 1.35;
        B.vx += (target - B.vx) * Math.min(1, dt * (dir ? 9 : 6));
        B.x += B.vx * dt;
        if(B.x < -r) B.x += W + 2 * r; if(B.x > W + r) B.x -= W + 2 * r;
        // physics
        const prevFeet = B.y + r * 0.85;
        B.vy += G() * dt; B.y += B.vy * dt;
        const feet = B.y + r * 0.85;
        for(const p of plats){
          if(p.type === 'move' && !p.broken){ p.x += p.vx * dt; if(p.x < p.w / 2){ p.x = p.w / 2; p.vx = Math.abs(p.vx); } if(p.x > W - p.w / 2){ p.x = W - p.w / 2; p.vx = -Math.abs(p.vx); } }
          p.squish = Math.max(0, p.squish - dt * 5);
          if(p.broken){ p.fall += dt; p.y += s * 1.2 * dt * (1 + p.fall * 2); p.rot += dt * (p.hue > 0.5 ? 1.5 : -1.5); continue; }
          if(B.vy > 0 && prevFeet <= p.y + 2 && feet >= p.y){
            const half = p.w / 2 + r * 0.55;
            const dx = Math.min(Math.abs(B.x - p.x), Math.abs(B.x - p.x + W), Math.abs(B.x - p.x - W));
            if(p.type === 'ground' || dx < half){
              B.y = p.y - r * 0.85; B.vy = -JUMP(); squash = 1; p.squish = 1;
              api.sfx.jump(); burst(B.x, p.y, '#ffffff', 6, 0.4);
              p.hits = (p.hits || 0) + 1;
              if(p.type === 'ground' && ++groundHits >= 6){ p.broken = true; }
              if((p.type === 'normal' || p.type === 'move') && p.hits >= 3){ p.broken = true; api.sfx.pop(); burst(p.x, p.y, '#ffffff', 10, 0.5); }
              if(p.type === 'crumble'){ p.broken = true; api.sfx.pop(); burst(p.x, p.y, '#c4b49b', 10, 0.5); }
            }
          }
        }
        // stars
        for(const k of pickups){
          if(k.got) continue;
          if(Math.hypot(k.x - B.x, k.y - B.y) < r + s * 0.05){ k.got = true; stars++; api.sfx.coin(); burst(k.x, k.y, '#ffd34d', 12, 0.7); pops.push({ x: k.x, y: k.y, t: 0 }); mood = 'wow'; moodT = 0.5; }
        }
        // camera
        const want = B.y - api.H * 0.42;
        if(want < camTop) camTop += (want - camTop) * Math.min(1, dt * 8);
        maxH = Math.max(maxH, heightM());
        fill();
        plats = plats.filter(p => p.y < camTop + api.H + s * 0.5);
        pickups = pickups.filter(k => !k.got && k.y < camTop + api.H + s * 0.2);
        // fell off
        if(B.y - r > camTop + api.H){ over = true; overT = 0; B.vy = -JUMP() * 0.5; mood = 'sad'; api.sfx.bad(); api.toast('أوووه! وقع بوبو', 1300); }
      },
      draw(c){
        const W = api.W, H = api.H, s = S(), r = R(), hm = maxH;
        // sky that gets deeper as we climb
        const k = Math.min(1, hm / 400);
        const g = c.createLinearGradient(0, 0, 0, H);
        const top = k < 0.5 ? mix('#8fd8ff', '#7c5cff', k * 2) : mix('#7c5cff', '#2b1f63', (k - 0.5) * 2);
        const bot = k < 0.5 ? mix('#e8f8ff', '#c7b8ff', k * 2) : mix('#c7b8ff', '#5b3fb0', (k - 0.5) * 2);
        g.addColorStop(0, top); g.addColorStop(1, bot); c.fillStyle = g; c.fillRect(0, 0, W, H);
        // twinkly stars far up
        if(k > 0.3){ c.fillStyle = 'rgba(255,255,255,' + Math.min(0.9, (k - 0.3) * 2) + ')'; for(let i = 0; i < 40; i++){ const sx = (i * 97.3) % W, sy = ((i * 61.7 - camTop * 0.05) % H + H) % H; c.beginPath(); c.arc(sx, sy, 1 + (i % 3) * (0.6 + 0.4 * Math.sin(t * 3 + i)), 0, 6.283); c.fill(); } }
        // parallax background clouds
        c.fillStyle = 'rgba(255,255,255,.45)';
        for(let i = 0; i < 6; i++){
          const span = H + s * 0.6, cy = ((i * span / 6 - camTop * 0.3) % span + span) % span - s * 0.3, cx = ((i * 173) % W), cs = s * (0.06 + (i % 3) * 0.02);
          c.beginPath(); c.arc(cx, cy, cs, 0, 6.283); c.arc(cx + cs * 1.1, cy + cs * 0.2, cs * 0.8, 0, 6.283); c.arc(cx - cs * 1.1, cy + cs * 0.25, cs * 0.7, 0, 6.283); c.fill();
        }
        // platforms
        for(const p of plats){ const sy = p.y - camTop; if(sy > -s * 0.2 && sy < H + s * 0.3) drawCloud(c, p, sy); }
        // stars
        for(const q of pickups){ const sy = q.y - camTop; if(sy < -40 || sy > H + 40) continue; const b = Math.sin(t * 4 + q.ph) * s * 0.01; c.globalAlpha = 0.35; c.fillStyle = '#fff6b0'; c.beginPath(); c.arc(q.x, sy + b, s * 0.055, 0, 6.283); c.fill(); c.globalAlpha = 1; api.emoji(c, '⭐', q.x, sy + b, s * 0.08, Math.sin(t * 2 + q.ph) * 0.2); }
        // Bobo (with wrap ghost)
        const by = B.y - camTop;
        const drawB = x => {
          c.save(); c.translate(x, by + r * 0.8); const sq = squash * 0.25; c.scale(1 + sq, 1 - sq); c.translate(-x, -(by + r * 0.8));
          api.bobo(c, x, by, r, over ? 'sad' : (B.vy < -JUMP() * 0.6 ? 'happy' : mood), { x: api.clamp(B.vx / (s * 1.35), -1, 1), y: B.vy > 0 ? 0.7 : -0.6 }, t);
          c.restore();
        };
        drawB(B.x); if(B.x < r) drawB(B.x + W + 2 * r); if(B.x > W - r) drawB(B.x - W - 2 * r);
        for(const q of parts){ const sy = q.y - camTop; c.globalAlpha = 1 - q.t / q.life; c.fillStyle = q.col; c.strokeStyle = OUT; c.lineWidth = 1.5; c.beginPath(); c.arc(q.x, sy, q.r, 0, 6.283); c.fill(); c.stroke(); }
        c.globalAlpha = 1;
        for(const q of pops){ c.globalAlpha = 1 - q.t / 0.9; api.text(c, '+٥', q.x, q.y - camTop - q.t * s * 0.15, s * 0.07, '#ffd34d'); }
        c.globalAlpha = 1;
        // steering hints
        const held = new Set(holds.values());
        const hs = s * 0.13, hy = H - s * 0.13;
        for(const sd of [-1, 1]){
          const hx = sd < 0 ? s * 0.13 : W - s * 0.13, on = held.has(sd);
          c.globalAlpha = on ? 0.75 : (introT > 0 ? 0.55 + 0.25 * Math.sin(t * 6) : 0.3);
          c.fillStyle = on ? '#ffd34d' : '#ffffff'; c.strokeStyle = OUT; c.lineWidth = 4;
          c.beginPath(); c.arc(hx, hy, hs * 0.6, 0, 6.283); c.fill(); c.stroke();
          c.fillStyle = OUT; c.beginPath(); c.moveTo(hx + sd * hs * 0.3, hy); c.lineTo(hx - sd * hs * 0.15, hy - hs * 0.28); c.lineTo(hx - sd * hs * 0.15, hy + hs * 0.28); c.closePath(); c.fill();
        }
        c.globalAlpha = 1;
        if(introT > 0) api.text(c, 'اكبس يمين أو شمال 👆', W / 2, H * 0.62, s * 0.065, '#fff7e8');
        // HUD
        pill(c, W / 2, 34, s * 0.42, '📏 ' + api.AR(heightM()) + ' م');
        pill(c, W - s * 0.15, 34, s * 0.22, '⭐ ' + api.AR(stars));
      }
    };

    function pill(c, x, y, w, str){
      const s = S(), h = Math.max(40, s * 0.1);
      c.fillStyle = 'rgba(28,24,56,.72)'; c.beginPath(); c.roundRect(x - w / 2, y - h / 2, w, h, h / 2); c.fill();
      api.text(c, str, x, y + 1, h * 0.52, '#fff7e8');
    }
    function mix(a, b, k){
      const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
      const ch = sh => Math.round(((pa >> sh) & 255) * (1 - k) + ((pb >> sh) & 255) * k);
      return 'rgb(' + ch(16) + ',' + ch(8) + ',' + ch(0) + ')';
    }
  }
});
