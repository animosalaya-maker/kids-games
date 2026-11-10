/* Colour balloons: balloons of 6 colours float up. The banner names a colour (changes every ~8 s).
   Pop the right colour = +1 with confetti; wrong colour = "اوبس" and the combo resets. 40 seconds. */
Solo.register({
  id: 'colors', title: L('فقاعات الألوان','Color Balloons','Renkli Balonlar'), emoji: '🎈', bg: '#ff5fa2',
  help: L('فرقع البالونات باللون اللي بينقلك عليه بوبو!','Pop the balloons in the color Bobo says!','Bobo\'nun söylediği renkteki balonları patlat!'),
  create(api){
    const OUT = '#1c1838', LIMIT = 40, SWITCH = 8;
    const COLS = [
      { name: 'الأحمر', en: 'red', tr: 'Kırmızıyı', fill: '#ff4646', dark: '#c41f2f' },
      { name: 'الأزرق', en: 'blue', tr: 'Maviyi', fill: '#3d8bff', dark: '#1f5bc4' },
      { name: 'الأخضر', en: 'green', tr: 'Yeşili', fill: '#3fd45a', dark: '#1f9a3a' },
      { name: 'الأصفر', en: 'yellow', tr: 'Sarıyı', fill: '#ffdc3b', dark: '#d9a400' },
      { name: 'البرتقالي', en: 'orange', tr: 'Turuncuyu', fill: '#ff9a1f', dark: '#d46a00' },
      { name: 'البنفسجي', en: 'purple', tr: 'Moru', fill: '#a75cff', dark: '#6e2fc9' }
    ];
    // "Pop the red one" — Turkish names are already in the "-i" form (Kırmızıyı patlat)
    const popStr = C => api.L('فرقع ' + C.name, 'Pop the ' + C.en + ' one', C.tr + ' patlat');
    const balloons = [], parts = [], floats = [], clouds = [];
    let t = 0, score = 0, combo = 0, bestCombo = 0, target = Math.floor(Math.random() * 6), targetT = SWITCH;
    let spawnT = 0, bannerPop = 1, done = false, endT = 0, moodT = 0, mood = 'idle', look = { x: 0, y: 0 }, lastTick = -1;
    const S = () => Math.min(api.W, api.H);
    const br = () => Math.max(30, S() * 0.095);
    for(let i = 0; i < 4; i++) clouds.push({ x: Math.random(), y: 0.22 + Math.random() * 0.45, s: 0.7 + Math.random() * 0.6, v: 0.01 + Math.random() * 0.015 });

    function bannerRect(){ const w = Math.min(api.W - 32, 360), h = Math.max(62, S() * 0.17); return { x: (api.W - w) / 2, y: 64, w, h }; }
    function announce(){ api.say(popStr(COLS[target])); bannerPop = 0; }
    function newTarget(){
      let n; do n = Math.floor(Math.random() * 6); while(n === target); target = n; targetT = SWITCH;
      api.sfx.swoosh(); announce();
      for(let k = 0; k < 2; k++) spawn(target, k * 0.5);
    }
    function spawn(col, extraY){
      const r = br(), W = api.W;
      let x = api.rand(r * 1.1, W - r * 1.1);
      for(let k = 0; k < 6; k++){ if(!balloons.some(b => !b.gone && Math.abs(b.x - x) < r * 1.9 && b.y > api.H - r * 2)) break; x = api.rand(r * 1.1, W - r * 1.1); }
      if(col == null) col = Math.random() < 0.38 ? target : Math.floor(Math.random() * 6);
      const sp = api.H * (0.11 + Math.random() * 0.05) * (1 + t / LIMIT * 0.5);
      balloons.push({ x, y: api.H + r * 1.3 + (extraY || 0) * r * 3, col, r: r * api.rand(0.92, 1.08), vy: sp, ph: Math.random() * 6, gone: false, pop: 0 });
    }
    function confetti(x, y, col, n){
      for(let i = 0; i < n; i++){
        const a = Math.random() * Math.PI * 2, s = S() * api.rand(0.3, 0.9);
        parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - S() * 0.3, life: api.rand(0.7, 1.2), age: 0, rot: Math.random() * 6, vr: api.rand(-10, 10),
          col: i % 3 === 0 ? col : api.pick(['#ffdc3b', '#ff5fa2', '#3d8bff', '#3fd45a', '#fff7e8']), w: S() * api.rand(0.012, 0.022) });
      }
    }
    function popBalloon(b, good){
      b.gone = true;
      if(good){
        score++; combo++; bestCombo = Math.max(bestCombo, combo);
        api.sfx.pop(); api.tone(600 + Math.min(combo, 10) * 60, 0.12, 'triangle', 0.1, 0.04);
        confetti(b.x, b.y, COLS[b.col].fill, 18);
        floats.push({ x: b.x, y: b.y, str: combo >= 3 ? '+' + api.AR(1) + ' 🔥' + api.AR(combo) : '+' + api.AR(1), col: '#fff7e8', age: 0 });
        mood = 'happy'; moodT = 0.7;
        if(combo > 0 && combo % 5 === 0){ api.sfx.good(); api.toast(api.pick(api.lang === 'ar' ? ['شاطر!', 'برافو!', 'يا سلام!'] : api.lang === 'tr' ? ['Süper!', 'Aferin!', 'Harika!'] : ['Super!', 'Well done!', 'Wow!'])); }
      } else {
        combo = 0; api.sfx.pop(); api.sfx.bad();
        confetti(b.x, b.y, COLS[b.col].fill, 6);
        floats.push({ x: b.x, y: b.y, str: api.L('اوبس!','Oops!','Hay aksi!'), col: '#ffe1ec', age: 0 });
        mood = 'sad'; moodT = 0.7;
      }
    }

    function drawBalloon(c, b){
      const r = b.r, rx = r * 0.86, wob = Math.sin(t * 2 + b.ph) * 0.06, C = COLS[b.col], lw = Math.max(3, r * 0.1);
      c.save(); c.translate(b.x, b.y); c.rotate(wob);
      // string
      c.strokeStyle = OUT; c.lineWidth = Math.max(1.5, r * 0.05); c.lineCap = 'round';
      c.beginPath(); c.moveTo(0, r * 1.08);
      for(let k = 1; k <= 6; k++) c.lineTo(Math.sin(t * 3 + b.ph + k) * r * 0.1, r * 1.08 + k * r * 0.25);
      c.stroke();
      // knot
      c.fillStyle = C.dark; c.strokeStyle = OUT; c.lineWidth = lw * 0.7; c.lineJoin = 'round';
      c.beginPath(); c.moveTo(0, r * 0.95); c.lineTo(-r * 0.15, r * 1.15); c.lineTo(r * 0.15, r * 1.15); c.closePath(); c.fill(); c.stroke();
      // body
      c.fillStyle = C.fill; c.lineWidth = lw;
      c.beginPath(); c.moveTo(0, -r);
      c.bezierCurveTo(rx * 1.3, -r, rx * 1.15, r * 0.55, 0, r * 0.98);
      c.bezierCurveTo(-rx * 1.15, r * 0.55, -rx * 1.3, -r, 0, -r);
      c.fill(); c.stroke();
      c.fillStyle = 'rgba(255,255,255,.6)'; c.beginPath(); c.ellipse(-rx * 0.4, -r * 0.42, rx * 0.17, r * 0.27, 0.45, 0, Math.PI * 2); c.fill();
      c.fillStyle = 'rgba(255,255,255,.45)'; c.beginPath(); c.arc(-rx * 0.15, -r * 0.75, r * 0.07, 0, Math.PI * 2); c.fill();
      c.restore();
    }
    function drawCloud(c, x, y, s){
      c.fillStyle = 'rgba(255,255,255,.9)';
      c.beginPath(); c.arc(x, y, s * 0.5, 0, Math.PI * 2); c.arc(x + s * 0.5, y + s * 0.1, s * 0.38, 0, Math.PI * 2); c.arc(x - s * 0.5, y + s * 0.12, s * 0.35, 0, Math.PI * 2); c.arc(x + s * 0.1, y + s * 0.22, s * 0.4, 0, Math.PI * 2); c.fill();
    }
    function pill(c, x, y, w, h, fill){ c.fillStyle = fill; c.strokeStyle = OUT; c.lineWidth = 3; c.beginPath(); c.roundRect(x, y, w, h, h / 2); c.fill(); c.stroke(); }

    announce();
    for(let k = 0; k < 4; k++) spawn(k < 2 ? target : null, k * 0.6);

    return {
      update(dt){
        t += dt; bannerPop = Math.min(1, bannerPop + dt * 3); if(moodT > 0){ moodT -= dt; if(moodT <= 0) mood = 'idle'; }
        if(done){ endT += dt; if(endT > 1.2){ endT = -1e9; api.end({ score, msg: score > 0 ? api.L('فرقعت ' + api.AR(score) + ' بالون!', 'You popped ' + api.AR(score) + (score === 1 ? ' balloon!' : ' balloons!'), api.AR(score) + ' balon patlattın!') : api.L('حلو! جرّب كمان','Nice! Try again','Güzel! Bir daha dene') }); } }
        else {
          targetT -= dt; if(targetT <= 0) newTarget();
          spawnT -= dt;
          if(spawnT <= 0){ spawnT = 0.62 - t / LIMIT * 0.18; if(balloons.filter(b => !b.gone).length < 14) spawn(); }
          if(!balloons.some(b => !b.gone && b.col === target && b.y > 0 && b.y < api.H)) { if(!balloons.some(b => !b.gone && b.col === target)) spawn(target); }
          const left = Math.ceil(LIMIT - t);
          if(left <= 5 && left !== lastTick && left > 0){ lastTick = left; api.tone(880, 0.06, 'square', 0.05); }
          if(t >= LIMIT){ done = true; api.sfx.win(); api.say(api.L('خلص الوقت',"Time's up",'Süre bitti')); }
        }
        for(const b of balloons){ b.y -= b.vy * dt; b.x += Math.sin(t * 1.5 + b.ph) * S() * 0.02 * dt; }
        for(let i = balloons.length - 1; i >= 0; i--){ const b = balloons[i]; if(b.gone || b.y < -b.r * 3) balloons.splice(i, 1); }
        for(const p of parts){ p.age += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += S() * 1.4 * dt; p.vx *= 1 - 1.5 * dt; p.rot += p.vr * dt; }
        for(let i = parts.length - 1; i >= 0; i--) if(parts[i].age > parts[i].life) parts.splice(i, 1);
        for(const f of floats){ f.age += dt; f.y -= S() * 0.18 * dt; }
        for(let i = floats.length - 1; i >= 0; i--) if(floats[i].age > 0.9) floats.splice(i, 1);
        for(const cl of clouds){ cl.x += cl.v * dt; if(cl.x > 1.3) cl.x = -0.3; }
      },
      pointerDown(p){
        if(done) return;
        const R = bannerRect(); if(p.y < R.y + R.h && p.y > R.y && p.x > R.x && p.x < R.x + R.w){ api.say(popStr(COLS[target])); return; }
        let hit = null, hd = 1e9;
        for(let i = balloons.length - 1; i >= 0; i--){
          const b = balloons[i]; if(b.gone) continue;
          const d = Math.hypot(p.x - b.x, (p.y - b.y) * 0.85);
          if(d < b.r * 1.3 && d < hd){ hit = b; hd = d; }
        }
        if(!hit) return;
        look = { x: api.clamp((hit.x - api.W / 2) / (api.W / 2), -1, 1), y: -1 };
        popBalloon(hit, hit.col === target);
      },
      draw(c){
        const W = api.W, H = api.H, s = S();
        const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#8fd6ff'); g.addColorStop(0.65, '#d6f1ff'); g.addColorStop(1, '#fff0d6'); c.fillStyle = g; c.fillRect(0, 0, W, H);
        // sun
        c.fillStyle = '#ffe27a'; c.beginPath(); c.arc(W * 0.85, H * 0.32, s * 0.11, 0, Math.PI * 2); c.fill();
        for(const cl of clouds) drawCloud(c, cl.x * W, cl.y * H, s * 0.16 * cl.s);
        // hills
        c.fillStyle = '#8fe07a'; c.strokeStyle = OUT; c.lineWidth = 4;
        c.beginPath(); c.moveTo(0, H); c.lineTo(0, H * 0.88); c.quadraticCurveTo(W * 0.25, H * 0.83, W * 0.5, H * 0.88); c.quadraticCurveTo(W * 0.75, H * 0.93, W, H * 0.86); c.lineTo(W, H); c.closePath(); c.fill(); c.stroke();
        // Bobo cheering at the bottom
        const bob = Math.max(26, s * 0.085);
        api.bobo(c, W * 0.5, H - bob * 1.15 + (mood === 'happy' ? -Math.abs(Math.sin(t * 14)) * bob * 0.2 : 0), bob, mood === 'idle' ? 'idle' : mood, look, t);
        for(const b of balloons) drawBalloon(c, b);
        // confetti
        for(const p of parts){ c.save(); c.globalAlpha = Math.min(1, (p.life - p.age) * 3); c.translate(p.x, p.y); c.rotate(p.rot); c.fillStyle = p.col; c.fillRect(-p.w / 2, -p.w * 0.3, p.w, p.w * 0.6); c.restore(); }
        for(const f of floats){ c.save(); c.globalAlpha = Math.min(1, (0.9 - f.age) * 3); api.text(c, f.str, f.x, f.y, s * 0.075 * (1 + Math.max(0, 0.15 - f.age) * 3), f.col); c.restore(); }

        // HUD: timer (centre) + score (right)
        const left = Math.max(0, Math.ceil(LIMIT - t)), hurry = left <= 5 && !done;
        const pw = 104, ph = 42;
        pill(c, W / 2 - pw / 2, 12, pw, ph, hurry ? '#ff6b6b' : '#fff7e8');
        api.text(c, '⏰ ' + api.AR(left), W / 2, 12 + ph / 2 + 1, 24 * (hurry ? 1 + Math.abs(Math.sin(t * 6)) * 0.12 : 1), hurry ? '#fff7e8' : OUT);
        pill(c, W - 12 - 96, 12, 96, ph, '#ffcd4d');
        api.text(c, '🎈 ' + api.AR(score), W - 12 - 48, 12 + ph / 2 + 1, 24, OUT);

        // banner
        const R = bannerRect(), C = COLS[target], sc = 0.7 + 0.3 * (1 - Math.pow(1 - bannerPop, 3)) + Math.sin(bannerPop * Math.PI) * 0.08;
        c.save(); c.translate(R.x + R.w / 2, R.y + R.h / 2); c.scale(sc, sc);
        c.fillStyle = '#fff7e8'; c.strokeStyle = OUT; c.lineWidth = 4;
        c.beginPath(); c.roundRect(-R.w / 2, -R.h / 2, R.w, R.h, 20); c.fill(); c.stroke();
        c.fillStyle = C.fill; c.beginPath(); c.roundRect(-R.w / 2 + 6, R.h / 2 - 12, (R.w - 12) * Math.max(0, targetT / SWITCH), 6, 3); c.fill();
        let fs = Math.min(R.h * 0.5, 34); const str = popStr(C) + '!';
        c.font = '800 ' + Math.round(fs) + 'px ' + api.FONT; let tw = c.measureText(str).width;
        const sw = fs * 1.1, gap = 12;
        if(tw + gap + sw > R.w - 24){ const k = (R.w - 24 - gap - sw) / tw; fs *= k; tw *= k; }   // longer English/Turkish text
        const total = tw + gap + sw, x0 = -total / 2, rtl = api.dir === 'rtl';
        // the swatch comes after the words: on the left in RTL, on the right in LTR
        api.text(c, str, rtl ? x0 + sw + gap + tw / 2 : x0 + tw / 2, -4, fs, C.dark);
        const mini = { x: rtl ? x0 + sw / 2 : x0 + tw + gap + sw / 2, y: -6, r: sw * 0.48, col: target, ph: 0 };
        c.save(); c.translate(mini.x, mini.y); c.scale(0.9, 0.9); drawBalloon(c, { x: 0, y: 0, r: mini.r * 0.9, col: target, ph: 0 }); c.restore();
        c.restore();
        if(combo >= 3 && !done) api.text(c, '🔥 ' + api.AR(combo), W / 2, R.y + R.h + 22, 22, '#ff7a1a');
        if(done) api.text(c, api.L('خلص الوقت! 🎉',"Time's up! 🎉",'Süre bitti! 🎉'), W / 2, H * 0.45, s * 0.1, '#fff7e8');
      },
      resize(){}
    };
  }
});
