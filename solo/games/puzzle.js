/* Sliding puzzle: a cheerful picture of Bobo cut into tiles. Tap a tile next to the empty spot (or in its row/column)
   to slide it. 3 boards: 3×3 easy, 3×3, then 4×4. Score per board = max(10, 60 − moves/2). */
Solo.register({
  id: 'puzzle', title: 'البازل', emoji: '🧩', bg: '#3fd47a',
  help: 'اكبس على قطعة جنب المربع الفاضي لتزحطها، ورجّع صورة بوبو متل ما كانت!',
  create(api){
    const OUT = '#1c1838', PIC = 640;
    const BOARDS = [{ n: 3, mix: 12 }, { n: 3, mix: 30 }, { n: 4, mix: 40 }];
    let level = 0, n = 3, tiles = [], anim = [], path = [], moves = 0, total = 0, t = 0;
    let state = 'play', stateT = 0, peekT = 0, flash = 0, boardScore = 0, mood = 'idle', moodT = 0, bump = 0;
    const parts = [];
    const pic = document.createElement('canvas'); pic.width = pic.height = PIC;
    const S = () => Math.min(api.W, api.H);

    /* ---------- the picture ---------- */
    function cloud(c, x, y, s){ c.fillStyle = '#fff'; c.strokeStyle = OUT; c.lineWidth = 6; c.beginPath();
      c.arc(x, y, s * 0.5, Math.PI * 0.9, Math.PI * 1.9); c.arc(x + s * 0.55, y + s * 0.1, s * 0.38, Math.PI * 1.3, Math.PI * 0.4); c.arc(x - s * 0.1, y + s * 0.35, s * 0.32, 0.1, Math.PI * 0.9); c.arc(x - s * 0.55, y + s * 0.12, s * 0.33, Math.PI * 0.6, Math.PI * 1.5); c.closePath(); c.fill(); c.stroke(); }
    function flower(c, x, y, r, col){ c.strokeStyle = '#2f8f3a'; c.lineWidth = 5; c.beginPath(); c.moveTo(x, y); c.lineTo(x, y + r * 2.2); c.stroke();
      c.fillStyle = col; c.strokeStyle = OUT; c.lineWidth = 4; for(let k = 0; k < 5; k++){ const a = k / 5 * Math.PI * 2; c.beginPath(); c.arc(x + Math.cos(a) * r, y + Math.sin(a) * r, r * 0.7, 0, Math.PI * 2); c.fill(); c.stroke(); }
      c.fillStyle = '#ffcd2a'; c.beginPath(); c.arc(x, y, r * 0.6, 0, Math.PI * 2); c.fill(); c.stroke(); }
    function buildPicture(v){
      const c = pic.getContext('2d'), P = PIC; c.setTransform(1, 0, 0, 1, 0, 0); c.lineJoin = 'round'; c.lineCap = 'round';
      const skies = [['#6fcfff', '#c9f0ff'], ['#7fb8ff', '#ffe0f0'], ['#ffb36b', '#ffe9a8']][v];
      const g = c.createLinearGradient(0, 0, 0, P); g.addColorStop(0, skies[0]); g.addColorStop(0.7, skies[1]); c.fillStyle = g; c.fillRect(0, 0, P, P);
      if(v === 1){ // rainbow
        const rc = ['#ff4646', '#ff9a1f', '#ffdc3b', '#3fd45a', '#3d8bff', '#a75cff'];
        c.lineWidth = P * 0.035; rc.forEach((col, k) => { c.strokeStyle = col; c.beginPath(); c.arc(P * 0.5, P * 0.78, P * (0.46 - k * 0.035), Math.PI, 0); c.stroke(); });
      }
      // sun
      const sx = P * 0.8, sy = P * 0.19, sr = P * 0.09;
      c.strokeStyle = '#ffb800'; c.lineWidth = 10;
      for(let k = 0; k < 10; k++){ const a = k / 10 * Math.PI * 2; c.beginPath(); c.moveTo(sx + Math.cos(a) * sr * 1.3, sy + Math.sin(a) * sr * 1.3); c.lineTo(sx + Math.cos(a) * sr * 1.75, sy + Math.sin(a) * sr * 1.75); c.stroke(); }
      c.fillStyle = '#ffdc3b'; c.strokeStyle = OUT; c.lineWidth = 6; c.beginPath(); c.arc(sx, sy, sr, 0, Math.PI * 2); c.fill(); c.stroke();
      c.fillStyle = OUT; c.beginPath(); c.arc(sx - sr * 0.35, sy - sr * 0.1, sr * 0.1, 0, Math.PI * 2); c.arc(sx + sr * 0.35, sy - sr * 0.1, sr * 0.1, 0, Math.PI * 2); c.fill();
      c.lineWidth = 5; c.beginPath(); c.arc(sx, sy + sr * 0.1, sr * 0.4, 0.2 * Math.PI, 0.8 * Math.PI); c.stroke();
      cloud(c, P * 0.2, P * 0.17, P * 0.13); cloud(c, P * 0.55, P * 0.3, P * 0.09);
      if(v === 2){ // balloons
        [['#ff4646', 0.14, 0.42], ['#3d8bff', 0.86, 0.45], ['#a75cff', 0.22, 0.32]].forEach(([col, bx, by]) => {
          const x = P * bx, y = P * by, r = P * 0.045; c.strokeStyle = OUT; c.lineWidth = 3; c.beginPath(); c.moveTo(x, y + r); c.quadraticCurveTo(x + r * 0.5, y + r * 2, x, y + r * 3); c.stroke();
          c.fillStyle = col; c.lineWidth = 5; c.beginPath(); c.ellipse(x, y, r * 0.85, r, 0, 0, Math.PI * 2); c.fill(); c.stroke(); });
      }
      // hills + grass
      c.strokeStyle = OUT; c.lineWidth = 6;
      c.fillStyle = '#7fd85a'; c.beginPath(); c.moveTo(0, P * 0.68); c.quadraticCurveTo(P * 0.3, P * 0.56, P * 0.6, P * 0.66); c.quadraticCurveTo(P * 0.82, P * 0.72, P, P * 0.62); c.lineTo(P, P); c.lineTo(0, P); c.closePath(); c.fill(); c.stroke();
      c.fillStyle = '#52bf45'; c.beginPath(); c.moveTo(0, P * 0.82); c.quadraticCurveTo(P * 0.5, P * 0.74, P, P * 0.84); c.lineTo(P, P); c.lineTo(0, P); c.closePath(); c.fill(); c.stroke();
      // flowers
      [[0.08, 0.86, '#ff5fa2'], [0.2, 0.92, '#fff7e8'], [0.82, 0.88, '#a75cff'], [0.93, 0.8, '#ff9a1f'], [0.7, 0.93, '#ff4646'], [0.33, 0.8, '#ffdc3b']].forEach(([fx, fy, col]) => flower(c, P * fx, P * fy, P * 0.022, col));
      if(v === 0){ // butterfly
        const bx = P * 0.2, by = P * 0.5; c.fillStyle = '#ff9a1f'; c.strokeStyle = OUT; c.lineWidth = 4;
        for(const s of [-1, 1]){ c.beginPath(); c.ellipse(bx + s * P * 0.025, by, P * 0.025, P * 0.035, s * 0.4, 0, Math.PI * 2); c.fill(); c.stroke(); }
        c.fillStyle = OUT; c.fillRect(bx - 3, by - P * 0.03, 6, P * 0.06);
      }
      // Bobo, the star of the picture
      api.bobo(c, P * 0.5, P * 0.6, P * 0.2, ['happy', 'wow', 'happy'][v], { x: 0, y: -0.2 }, 0);
    }

    /* ---------- board ---------- */
    function geo(){
      const W = api.W, H = api.H, thumbH = Math.max(86, Math.min(130, S() * 0.25));
      const B = Math.floor(Math.min(W - 28, H - 72 - thumbH - 60, 600));
      const freeTop = 66, freeH = H - freeTop - 12, blockH = B + 22 + thumbH + 28;
      const y0 = freeTop + Math.max(0, (freeH - blockH) / 2);
      return { B, x: (W - B) / 2, y: y0, cell: B / n, thumb: thumbH, ty: y0 + B + 22 };
    }
    function thumbRect(){ const g = geo(), s = g.thumb; return { x: api.W / 2 - s / 2 - s * 0.35, y: g.ty, w: s, h: s }; }
    const solved = () => tiles.every((v, i) => i === n * n - 1 ? v === -1 : v === i);
    const nb = e => { const r = Math.floor(e / n), q = e % n, out = []; if(r > 0) out.push(e - n); if(r < n - 1) out.push(e + n); if(q > 0) out.push(e - 1); if(q < n - 1) out.push(e + 1); return out; };
    function setup(){
      const B = BOARDS[level]; n = B.n; moves = 0;
      tiles = []; for(let i = 0; i < n * n - 1; i++) tiles.push(i); tiles.push(-1);
      anim = tiles.map(() => ({ x: 0, y: 0 }));
      let e = n * n - 1, prev = -1; path = [e];
      for(let k = 0; k < B.mix || solved(); k++){
        const opts = nb(e).filter(o => o !== prev), o = api.pick(opts);
        tiles[e] = tiles[o]; tiles[o] = -1; prev = e; e = o; path.push(e);
        if(k > 400) break;
      }
      buildPicture(level); state = 'play'; stateT = 0; peekT = 0; flash = 0;
    }
    function slideFrom(pos){
      const e = tiles.indexOf(-1), er = Math.floor(e / n), ec = e % n, pr = Math.floor(pos / n), pc = pos % n;
      if(pos === e || (er !== pr && ec !== pc)) return false;
      const step = er === pr ? (pc > ec ? 1 : -1) : (pr > er ? n : -n);
      let cur = e, cnt = 0;
      while(cur !== pos){
        const nx = cur + step; tiles[cur] = tiles[nx]; tiles[nx] = -1;
        // the tile visually starts where it was (one cell away) and glides in
        anim[cur] = { x: step === 1 ? 1 : step === -1 ? -1 : 0, y: step === n ? 1 : step === -n ? -1 : 0 };
        anim[nx] = { x: 0, y: 0 }; cur = nx; cnt++;
      }
      moves += cnt; path.push(pos); api.sfx.swoosh(); api.tone(500 + Math.random() * 120, 0.06, 'triangle', 0.07);
      return true;
    }
    function confetti(x, y, k){ for(let i = 0; i < k; i++){ const a = Math.random() * Math.PI * 2, s = S() * api.rand(0.3, 1); parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - S() * 0.4, age: 0, life: api.rand(0.9, 1.6), rot: Math.random() * 6, vr: api.rand(-9, 9), col: api.pick(['#ffdc3b', '#ff5fa2', '#3d8bff', '#3fd45a', '#fff7e8', '#a75cff']), w: S() * api.rand(0.014, 0.026) }); } }
    function win(){
      state = 'solved'; stateT = 0; boardScore = Math.max(10, Math.round(60 - moves / 2)); total += boardScore;
      api.sfx.good(); api.sfx.coin(); mood = 'happy'; moodT = 3; const g = geo(); confetti(g.x + g.B / 2, g.y + g.B / 2, 60);
      api.say(level < 2 ? 'برافو! رتّبت الصورة' : 'يا سلام! خلصت كل البازل');
    }

    setup();
    api.say('رتّب صورة بوبو');

    return {
      _dbg: { get path(){ return path.slice(); }, get n(){ return n; }, get level(){ return level; }, get state(){ return state; },
        cellCenter(pos){ const g = geo(); return { x: g.x + (pos % n + 0.5) * g.cell, y: g.y + (Math.floor(pos / n) + 0.5) * g.cell }; } },
      update(dt){
        t += dt; stateT += dt; if(peekT > 0) peekT -= dt; if(bump > 0) bump -= dt; if(moodT > 0){ moodT -= dt; if(moodT <= 0) mood = 'idle'; }
        for(const a of anim){ const k = Math.min(1, dt * 14); a.x -= a.x * k; a.y -= a.y * k; if(Math.abs(a.x) < 0.002) a.x = 0; if(Math.abs(a.y) < 0.002) a.y = 0; }
        if(state === 'solved'){
          flash = Math.min(1, flash + dt * 2);
          if(stateT > 2.6){
            if(level < BOARDS.length - 1){ level++; setup(); api.toast('اللوح ' + api.AR(level + 1) + ' 🧩', 1400); api.sfx.jump(); }
            else { state = 'end'; api.end({ score: total, win: true, msg: 'برافو! خلصت كل البازل' }); }
          }
        }
        for(const p of parts){ p.age += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += S() * 1.4 * dt; p.vx *= 1 - 1.2 * dt; p.rot += p.vr * dt; }
        for(let i = parts.length - 1; i >= 0; i--) if(parts[i].age > parts[i].life) parts.splice(i, 1);
      },
      pointerDown(p){
        const T = thumbRect();
        if(p.x > T.x - 10 && p.x < T.x + T.w + T.w * 0.9 && p.y > T.y - 10 && p.y < T.y + T.h + 34){ peekT = 2.2; api.sfx.tap(); return; }
        if(state !== 'play') return;
        const g = geo(); if(p.x < g.x || p.y < g.y || p.x >= g.x + g.B || p.y >= g.y + g.B) return;
        const pos = Math.floor((p.y - g.y) / g.cell) * n + Math.floor((p.x - g.x) / g.cell);
        if(slideFrom(pos)){ peekT = 0; if(solved()) win(); }
        else if(tiles[pos] !== -1){ api.sfx.hit(); bump = 0.25; mood = 'wow'; moodT = 0.5; }
      },
      draw(c){
        const W = api.W, H = api.H, s = S(), g = geo(), cell = g.cell;
        // background: soft green with polka dots
        c.fillStyle = '#bff0c8'; c.fillRect(0, 0, W, H);
        c.fillStyle = 'rgba(63,212,122,.22)';
        for(let y = 0; y < H + 40; y += 46) for(let x = (y / 46 % 2) * 23; x < W + 40; x += 46){ c.beginPath(); c.arc(x, y, 7, 0, Math.PI * 2); c.fill(); }
        // board frame
        c.fillStyle = '#2f8f55'; c.strokeStyle = OUT; c.lineWidth = 5;
        c.beginPath(); c.roundRect(g.x - 10, g.y - 10, g.B + 20, g.B + 20, 22); c.fill(); c.stroke();
        c.fillStyle = '#1f6b3e'; c.beginPath(); c.roundRect(g.x, g.y, g.B, g.B, 12); c.fill();
        const sc = PIC / n, gap = Math.max(2, cell * 0.035), done = state !== 'play';
        for(let i = 0; i < tiles.length; i++){
          const v = tiles[i]; if(v < 0) continue;
          const a = anim[i], tx = g.x + (i % n + a.x) * cell, ty = g.y + (Math.floor(i / n) + a.y) * cell, gp = done ? gap * (1 - flash) : gap;
          c.save(); c.beginPath(); c.roundRect(tx + gp, ty + gp, cell - gp * 2, cell - gp * 2, Math.max(4, cell * 0.08 * (done ? 1 - flash : 1))); c.clip();
          c.drawImage(pic, (v % n) * sc, Math.floor(v / n) * sc, sc, sc, tx, ty, cell, cell);
          c.restore();
          if(!done || flash < 1){
            c.save(); c.globalAlpha = done ? 1 - flash : 1;
            c.strokeStyle = OUT; c.lineWidth = 3; c.beginPath(); c.roundRect(tx + gp, ty + gp, cell - gp * 2, cell - gp * 2, Math.max(4, cell * 0.08)); c.stroke();
            c.fillStyle = 'rgba(255,255,255,.55)'; c.beginPath(); c.roundRect(tx + gp + 3, ty + gp + 3, cell - gp * 2 - 6, Math.max(3, cell * 0.05), 3); c.fill();
            const nr = Math.max(11, cell * 0.12); c.globalAlpha *= 0.75;
            c.fillStyle = 'rgba(255,255,255,.8)'; c.beginPath(); c.arc(tx + gp + nr * 1.15, ty + gp + nr * 1.15, nr, 0, Math.PI * 2); c.fill();
            api.text(c, api.AR(v + 1), tx + gp + nr * 1.15, ty + gp + nr * 1.2, nr * 1.3, OUT);
            c.restore();
          }
        }
        if(done){ // fill in the last piece
          const last = n * n - 1, tx = g.x + (last % n) * cell, ty = g.y + Math.floor(last / n) * cell;
          c.save(); c.globalAlpha = flash; c.drawImage(pic, (last % n) * sc, Math.floor(last / n) * sc, sc, sc, tx, ty, cell, cell); c.restore();
          c.strokeStyle = '#ffdc3b'; c.lineWidth = 6 + Math.sin(t * 10) * 2; c.beginPath(); c.roundRect(g.x - 4, g.y - 4, g.B + 8, g.B + 8, 16); c.stroke();
        }
        if(peekT > 0 && !done){ c.save(); c.globalAlpha = Math.min(1, peekT * 3, (2.2 - peekT) * 6); c.drawImage(pic, g.x, g.y, g.B, g.B); c.restore(); }

        // preview thumbnail + label + Bobo
        const T = thumbRect();
        c.fillStyle = '#fff7e8'; c.strokeStyle = OUT; c.lineWidth = 4; c.beginPath(); c.roundRect(T.x - 6, T.y - 6, T.w + 12, T.h + 12, 14); c.fill(); c.stroke();
        c.drawImage(pic, T.x, T.y, T.w, T.h); c.strokeStyle = OUT; c.lineWidth = 2; c.strokeRect(T.x, T.y, T.w, T.h);
        api.text(c, '👀 شوف الصورة', T.x + T.w / 2, T.y + T.h + 22, Math.max(15, Math.min(20, s * 0.05)), '#1f6b3e');
        const br = T.h * 0.36, bx = T.x + T.w + T.w * 0.45, by = T.y + T.h * 0.5;
        api.bobo(c, bx, by - (mood === 'happy' ? Math.abs(Math.sin(t * 9)) * br * 0.3 : 0), br, mood === 'idle' ? 'idle' : mood, { x: -0.6, y: -0.6 }, t);

        // HUD
        const ph = 42;
        c.fillStyle = '#fff7e8'; c.strokeStyle = OUT; c.lineWidth = 3; c.beginPath(); c.roundRect(W / 2 - 60, 12, 120, ph, ph / 2); c.fill(); c.stroke();
        api.text(c, '🧩 ' + api.AR(level + 1) + ' من ' + api.AR(BOARDS.length), W / 2, 12 + ph / 2 + 1, 21, OUT);
        c.fillStyle = '#ffcd4d'; c.beginPath(); c.roundRect(W - 12 - 96, 12, 96, ph, ph / 2); c.fill(); c.stroke();
        api.text(c, '👆 ' + api.AR(moves), W - 12 - 48, 12 + ph / 2 + 1, 22, OUT);

        for(const p of parts){ c.save(); c.globalAlpha = Math.min(1, (p.life - p.age) * 3); c.translate(p.x, p.y); c.rotate(p.rot); c.fillStyle = p.col; c.fillRect(-p.w / 2, -p.w * 0.3, p.w, p.w * 0.6); c.restore(); }
        if(state === 'solved'){
          const k = Math.min(1, stateT * 3), z = 0.6 + 0.4 * k + Math.sin(Math.min(1, stateT * 2) * Math.PI) * 0.15;
          c.save(); c.translate(W / 2, g.y + g.B / 2); c.scale(z, z);
          api.text(c, 'برافو! 🎉', 0, -s * 0.05, s * 0.12, '#fff7e8');
          api.text(c, '+' + api.AR(boardScore) + ' ⭐', 0, s * 0.07, s * 0.08, '#ffdc3b');
          c.restore();
        }
      },
      resize(){}
    };
  }
});
