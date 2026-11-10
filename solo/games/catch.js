/* Fruit catch: fruits fall from the trees, drag Bobo and his basket to catch them. Rocks and dry leaves cost a heart. */
Solo.register({
  id: 'catch', title: L('لقط الفواكه','Fruit Catch','Meyve Yakala'), emoji: '🧺', bg: '#ff9f1c',
  help: L('حرّك بوبو يمين وشمال ليلقط الفواكه بالسلة، وانتبه من الحجار والورق اليابس','Move Bobo left and right to catch fruit in the basket. Watch out for rocks and dry leaves!','Bobo\'yu sağa sola götür, meyveleri sepete topla. Taşlara ve kuru yapraklara dikkat et!'),
  create(api){
    const emoji = (c, e, x, y, sz, r) => { c.fillStyle = '#000'; api.emoji(c, e, x, y, sz, r); };
    const OUT = '#1c1838';
    const S = () => Math.min(api.W, api.H);
    const FRUITS = ['🍎', '🍌', '🍇', '🍊', '🍓', '🍐', '🍑', '🍒', '🍉'];
    const GROUNDY = () => api.H - S() * 0.07;
    const R = () => S() * 0.085;
    const BY = () => GROUNDY() - S() * 0.1 - R() * 0.45;   // Bobo centre y
    const RIM = () => BY() + R() * 0.45;              // basket rim y
    const BASKW = () => S() * 0.24;

    let t = 0, score = 0, hearts = 3, over = false, overT = 0, inv = 0, introT = 2.5, streak = 0;
    let mood = 'happy', moodT = 0, shake = 0, squash = 0;
    const B = { x: api.W / 2, target: api.W / 2, vx: 0 };
    let items = [], parts = [], pops = [], nextSpawn = 0.8, dragging = null, bounce = 0;

    const fallSpeed = () => api.H * Math.min(0.62, 0.2 + t * 0.0045);
    const spawnGap = () => Math.max(0.5, 1.25 - t * 0.009);
    const treeXs = () => { const n = Math.max(3, Math.round(api.W / (S() * 0.3))); const a = []; for(let i = 0; i < n; i++) a.push((i + 0.5) * api.W / n); return a; };

    function spawn(){
      const s = S(), r = Math.random();
      const badChance = t < 6 ? 0 : Math.min(0.3, 0.14 + t * 0.0016);
      let kind, e;
      if(r < 0.05 && t > 4){ kind = 'gold'; e = '🍯'; }
      else if(r < 0.05 + badChance){ kind = 'bad'; e = Math.random() < 0.5 ? '🪨' : '🍂'; }
      else { kind = 'fruit'; e = api.pick(FRUITS); }
      let x = api.rand(s * 0.1, api.W - s * 0.1);
      // some rocks drop near Bobo so standing still is not always safe
      if(kind === 'bad' && Math.random() < 0.35) x = api.clamp(B.x + api.rand(-s * 0.08, s * 0.08), s * 0.1, api.W - s * 0.1);
      const sp = fallSpeed() * api.rand(0.85, 1.15) * (kind === 'bad' && e === '🍂' ? 0.8 : 1);
      items.push({ kind, e, x, y: api.H * 0.17, vy: sp, rot: api.rand(-0.3, 0.3), vr: api.rand(-2, 2), wob: Math.random() * 6, size: s * (kind === 'gold' ? 0.1 : 0.09), grow: 0, state: 'fall', t: 0 });
    }
    function burst(x, y, col, n, sp){
      for(let i = 0; i < n; i++){ const a = Math.random() * 6.283, v = S() * api.rand(0.2, sp || 0.6); parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - S() * 0.35, t: 0, life: api.rand(0.4, 0.8), col, r: S() * api.rand(0.008, 0.016), star: Math.random() < 0.35 }); }
    }
    const fruitCol = e => ({ '🍎': '#ff5a5f', '🍌': '#ffe066', '🍇': '#9b6bff', '🍊': '#ff9f1c', '🍓': '#ff4d6d', '🍐': '#b5e550', '🍑': '#ffab91', '🍒': '#e63946', '🍉': '#7ed957' })[e] || '#ffd34d';

    function drawBasket(c, x, y, front){
      const s = S(), w = BASKW(), h = s * 0.1, lw = Math.max(3, s * 0.009);
      c.lineWidth = lw; c.strokeStyle = OUT; c.lineJoin = 'round';
      if(!front){
        c.fillStyle = '#8a5a2b'; c.beginPath(); c.ellipse(x, y, w / 2, h * 0.22, 0, 0, 6.283); c.fill(); c.stroke();
        return;
      }
      c.fillStyle = '#c98a4b'; c.beginPath();
      c.moveTo(x - w / 2, y); c.lineTo(x + w / 2, y); c.lineTo(x + w * 0.4, y + h); c.quadraticCurveTo(x, y + h * 1.12, x - w * 0.4, y + h); c.closePath(); c.fill(); c.stroke();
      c.strokeStyle = '#8a5a2b'; c.lineWidth = Math.max(2, s * 0.005);
      for(let i = 1; i < 3; i++){ const yy = y + h * i / 3; c.beginPath(); c.moveTo(x - w / 2 + w * 0.1 * i / 3, yy); c.lineTo(x + w / 2 - w * 0.1 * i / 3, yy); c.stroke(); }
      for(let i = -2; i <= 2; i++){ c.beginPath(); c.moveTo(x + i * w * 0.18, y); c.lineTo(x + i * w * 0.15, y + h); c.stroke(); }
      c.lineWidth = lw; c.strokeStyle = OUT; c.fillStyle = '#e0a666'; c.beginPath(); c.roundRect(x - w / 2 - lw, y - h * 0.12, w + lw * 2, h * 0.26, h * 0.13); c.fill(); c.stroke();
    }

    return {
      resize(){},
      pointerDown(p){ dragging = p.id; B.target = p.x; introT = 0; },
      pointerMove(p){ if(dragging === p.id) B.target = p.x; },
      pointerUp(p){ if(dragging === p.id) dragging = null; },
      update(dt){
        t += dt; if(introT > 0) introT -= dt;
        const s = S(), W = api.W;
        inv = Math.max(0, inv - dt); shake = Math.max(0, shake - dt * 3); squash = Math.max(0, squash - dt * 4); bounce = Math.max(0, bounce - dt * 3);
        if(moodT > 0){ moodT -= dt; if(moodT <= 0 && !over) mood = 'happy'; }
        for(const q of parts){ q.t += dt; q.x += q.vx * dt; q.y += q.vy * dt; q.vy += s * 1.6 * dt; }
        parts = parts.filter(q => q.t < q.life);
        for(const q of pops) q.t += dt; pops = pops.filter(q => q.t < 0.9);
        // Bobo follows the finger
        const half = BASKW() / 2;
        B.target = api.clamp(B.target, half, W - half);
        const prev = B.x;
        B.x += (B.target - B.x) * Math.min(1, dt * 14);
        B.vx = (B.x - prev) / Math.max(dt, 0.001);
        if(over){ overT += dt; if(overT > 1.3) api.end({ score, msg: score >= 40 ? api.L('سلة مليانة!','A full basket!','Sepet doldu!') : undefined }); }
        // spawning
        if(!over){ nextSpawn -= dt; if(nextSpawn <= 0){ spawn(); nextSpawn = spawnGap() * api.rand(0.8, 1.2); } }
        const rim = RIM(), gy = GROUNDY();
        for(const it of items){
          it.t += dt; it.grow = Math.min(1, it.grow + dt * 4);
          if(it.state === 'fall'){
            const py = it.y;
            it.y += it.vy * dt; it.rot += it.vr * dt * 0.5;
            if(it.e === '🍂') it.x += Math.sin(it.t * 3 + it.wob) * s * 0.12 * dt;
            if(!over && py < rim && it.y >= rim && Math.abs(it.x - B.x) < half + it.size * 0.2){
              it.state = 'caught';
              if(it.kind === 'bad'){
                if(inv <= 0){
                  hearts--; inv = 1.2; shake = 1; mood = 'sad'; moodT = 1; streak = 0; api.sfx.hit();
                  burst(it.x, rim, it.e === '🍂' ? '#c98a4b' : '#a3a8b8', 10, 0.5);
                  if(hearts <= 0){ over = true; overT = 0; api.sfx.bad(); api.toast(api.L('خلصوا القلوب!','No more hearts!','Kalpler bitti!'), 1300); }
                  else api.toast(it.e === '🍂' ? api.L('ورق يابس! 🍂','Dry leaf! 🍂','Kuru yaprak! 🍂') : api.L('حجرة! 🪨','A rock! 🪨','Taş! 🪨'), 800);
                }
                it.state = 'bounce'; it.vy = -s * 0.8; it.vx = (it.x < B.x ? -1 : 1) * s * 0.5;
              } else {
                const pts = it.kind === 'gold' ? 5 : 1;
                score += pts; streak++; squash = 1; bounce = 1; mood = it.kind === 'gold' ? 'wow' : 'happy'; moodT = 0.6;
                if(it.kind === 'gold'){ api.sfx.good(); api.sfx.coin(); burst(it.x, rim, '#ffd34d', 20, 0.8); }
                else { api.sfx.pop(); api.tone(600 + Math.min(12, streak) * 40, 0.08, 'triangle', 0.09, 0.03); burst(it.x, rim, fruitCol(it.e), 8, 0.45); }
                pops.push({ str: '+' + api.AR(pts), x: it.x, y: rim - s * 0.06, t: 0, gold: it.kind === 'gold' });
                if(streak > 0 && streak % 10 === 0){ api.toast(api.L('برافو! ' + api.AR(streak) + ' ورا بعض ⭐', 'Well done! ' + api.AR(streak) + ' in a row ⭐', 'Aferin! Üst üste ' + api.AR(streak) + ' ⭐'), 1000); api.sfx.win(); }
              }
            } else if(it.y > gy - it.size * 0.3){
              it.state = 'ground'; it.t = 0; it.y = gy - it.size * 0.3;
              if(it.kind !== 'bad') { streak = 0; burst(it.x, gy, fruitCol(it.e), 4, 0.2); }
            }
          } else if(it.state === 'bounce'){
            it.vy += s * 2.5 * dt; it.y += it.vy * dt; it.x += it.vx * dt; it.rot += dt * 6;
            if(it.y > api.H + s * 0.2) it.state = 'gone';
          } else if(it.state === 'ground'){
            if(it.t > 0.8) it.state = 'gone';
          }
        }
        items = items.filter(it => it.state !== 'gone' && it.state !== 'caught');
      },
      draw(c){
        const W = api.W, H = api.H, s = S(), gy = GROUNDY();
        c.save();
        if(shake > 0) c.translate(Math.sin(t * 60) * shake * s * 0.015, 0);
        // sky + meadow
        const sky = c.createLinearGradient(0, 0, 0, H); sky.addColorStop(0, '#8fdcff'); sky.addColorStop(0.7, '#e6f9ff'); sky.addColorStop(0.7, '#9be37a'); sky.addColorStop(1, '#6dd04a');
        c.fillStyle = sky; c.fillRect(-20, 0, W + 40, H);
        c.fillStyle = '#b6ee95'; c.beginPath(); c.moveTo(-20, H * 0.72);
        for(let x = -20; x <= W + 40; x += 20) c.lineTo(x, H * 0.7 - Math.sin(x / (s * 0.4)) * s * 0.04);
        c.lineTo(W + 20, H); c.lineTo(-20, H); c.closePath(); c.fill();
        c.fillStyle = '#fff';
        for(let i = 0; i < 3; i++){ const cx = ((i * W / 3 + t * s * 0.02) % (W + s * 0.4)) - s * 0.2, cy = H * (0.3 + (i % 2) * 0.08), cs = s * 0.045; c.beginPath(); c.arc(cx, cy, cs, 0, 6.283); c.arc(cx + cs, cy + cs * 0.2, cs * 0.8, 0, 6.283); c.arc(cx - cs, cy + cs * 0.25, cs * 0.7, 0, 6.283); c.fill(); }
        // flowers
        for(let i = 0; i < 9; i++){ const fx = (i * 0.137 % 1) * W, fy = H * 0.76 + ((i * 53) % 100) / 100 * (gy - H * 0.8); c.fillStyle = i % 2 ? '#ff8fb8' : '#fff7e8'; c.beginPath(); for(let k = 0; k < 5; k++){ const a = k * 1.256; c.arc(fx + Math.cos(a) * s * 0.012, fy + Math.sin(a) * s * 0.012, s * 0.01, 0, 6.283); } c.fill(); c.fillStyle = '#ffd34d'; c.beginPath(); c.arc(fx, fy, s * 0.008, 0, 6.283); c.fill(); }
        // tree canopy across the top
        const tops = treeXs(), cr = W / tops.length * 0.62;
        c.lineWidth = Math.max(3, s * 0.009); c.strokeStyle = OUT;
        c.fillStyle = '#3fae35'; c.beginPath(); c.rect(-20, 0, W + 40, H * 0.1); c.fill();
        for(const tx of tops){ c.beginPath(); c.arc(tx, H * 0.1, cr * 0.75, 0, 6.283); c.fill(); c.stroke(); }
        c.fillStyle = '#3fae35'; c.fillRect(-20, 0, W + 40, H * 0.1);
        for(const tx of tops){ c.fillStyle = '#5fd34a'; c.beginPath(); c.arc(tx - cr * 0.2, H * 0.09, cr * 0.32, 0, 6.283); c.fill(); }
        for(let i = 0; i < tops.length * 3; i++){ const fx = (i + 0.5) * W / (tops.length * 3), fy = H * 0.12 + Math.sin(i * 2.3) * s * 0.03; emoji(c, FRUITS[i % FRUITS.length], fx, fy + Math.sin(t * 2 + i) * 2, s * 0.05); }
        // ground strip
        c.fillStyle = '#5fc24a'; c.fillRect(-20, gy, W + 40, H - gy); c.strokeStyle = OUT; c.lineWidth = 3; c.beginPath(); c.moveTo(-20, gy); c.lineTo(W + 20, gy); c.stroke();
        // falling things
        for(const it of items){
          if(it.state === 'fall'){
            // shadow on the ground
            const k = Math.min(1, it.y / gy); c.fillStyle = 'rgba(0,0,0,' + (0.08 + k * 0.12) + ')'; c.beginPath(); c.ellipse(it.x, gy + 4, it.size * 0.4 * k, it.size * 0.1 * k, 0, 0, 6.283); c.fill();
          }
          c.globalAlpha = it.state === 'ground' ? Math.max(0, 1 - it.t / 0.8) : 1;
          if(it.kind === 'gold'){ c.fillStyle = 'rgba(255,230,120,.5)'; c.beginPath(); c.arc(it.x, it.y, it.size * (0.7 + Math.sin(t * 8) * 0.08), 0, 6.283); c.fill(); }
          if(it.kind === 'bad' && it.state === 'fall'){ c.strokeStyle = 'rgba(255,60,60,.55)'; c.lineWidth = 3; c.beginPath(); c.arc(it.x, it.y, it.size * 0.62, 0, 6.283); c.stroke(); }
          emoji(c, it.e, it.x, it.y, it.size * (0.4 + 0.6 * it.grow), it.rot);
          c.globalAlpha = 1;
        }
        // Bobo with basket
        const r = R(), bx = B.x, by = BY(), rim = RIM();
        const visible = !(inv > 0 && Math.floor(inv * 10) % 2 === 0);
        if(visible || over){
          c.save(); const sq = squash * 0.12; c.translate(bx, gy); c.scale(1 + sq, 1 - sq); c.translate(-bx, -gy);
          api.bobo(c, bx, by - bounce * r * 0.1, r, over ? 'sad' : mood, { x: api.clamp(B.vx / (s * 3), -1, 1), y: -0.7 }, t);
          drawBasket(c, bx, rim, false);
          drawBasket(c, bx, rim, true);
          // little hands on the basket
          const pal = window.World ? World.palette() : { color: '#9b6bff' };
          c.fillStyle = pal.color; c.strokeStyle = OUT; c.lineWidth = 3;
          for(const sd of [-1, 1]){ c.beginPath(); c.arc(bx + sd * BASKW() * 0.46, rim + s * 0.01, s * 0.022, 0, 6.283); c.fill(); c.stroke(); }
          c.restore();
        }
        for(const q of parts){ c.globalAlpha = 1 - q.t / q.life; if(q.star) emoji(c, '✨', q.x, q.y, q.r * 4); else { c.fillStyle = q.col; c.beginPath(); c.arc(q.x, q.y, q.r, 0, 6.283); c.fill(); } }
        c.globalAlpha = 1;
        for(const q of pops){ c.globalAlpha = 1 - Math.max(0, q.t - 0.45) * 2.2; api.text(c, q.str, q.x, q.y - q.t * s * 0.14, s * (q.gold ? 0.09 : 0.065), '#ffd34d'); }
        c.globalAlpha = 1;
        c.restore();
        if(introT > 0){
          api.text(c, api.L('اسحب بوبو يمين وشمال 👆','Drag Bobo left and right 👆','Bobo\'yu sağa sola kaydır 👆'), W / 2, H * 0.5, Math.min(s * 0.065, W * 0.058), '#fff7e8');
          const hx = W / 2 + Math.sin(t * 3) * s * 0.18; emoji(c, '👆', hx, BY() + s * 0.02, s * 0.1);
        }
        // HUD (capped size on tablets)
        { const s = Math.min(S(), 440);
        const ph = Math.max(40, s * 0.1);
        c.fillStyle = 'rgba(28,24,56,.72)'; c.beginPath(); c.roundRect(W / 2 - s * 0.16, 34 - ph / 2, s * 0.32, ph, ph / 2); c.fill();
        api.text(c, '🧺 ' + api.AR(score), W / 2, 35, ph * 0.55, '#fff7e8');
        c.fillStyle = 'rgba(28,24,56,.72)'; c.beginPath(); c.roundRect(W - s * 0.33, 34 - ph / 2, s * 0.3, ph, ph / 2); c.fill();
        for(let i = 0; i < 3; i++) emoji(c, i < hearts ? '❤️' : '🤍', W - s * 0.08 - i * s * 0.085, 34, s * 0.065); }
      }
    };
  }
});
