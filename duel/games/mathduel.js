/* Quick sums. The same easy sum shows in both halves; each kid has 3 answer buttons (same numbers, different order).
   First correct answer takes the point, a wrong answer locks you out of that question. First to 5 wins. */
Duel.register({
  id: 'mathduel', title: L('مين أسرع بالحساب', 'Math Race', 'Hızlı Hesap'), emoji: '🧮', bg: '#ffb020',
  help: L('حل الجمعة واكبس عالجواب الصح قبل رفيقك. إذا غلطت بتستنى السؤال الجاي', 'Solve the sum and tap the right answer before your friend. If you miss, wait for the next one', 'İşlemi çöz, doğru cevaba arkadaşından önce dokun. Yanlış yaparsan sonraki soruyu beklersin'),
  create(api){
    const OUT = '#1c1838', GOAL = 5, QT = 9, LIMIT = 80;
    const S = () => Math.min(api.W, api.H);
    const half = () => api.H / 2;
    const loc = p => p.player === 1 ? { x: api.W - p.x, y: api.H - p.y } : { x: p.x, y: p.y };
    const ri = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
    const pts = [0, 0];
    let q = null, n = 0, stage = 'ask', st = 0, time = 0, ended = false, endAt = 0, endW = null, called = false;
    let lock = [false, false], picked = [-1, -1], winner = null, press = [-1, -1], pressT = [0, 0], shake = [0, 0];

    function shuffle(a){ a = a.slice(); for(let i = a.length - 1; i > 0; i--){ const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
    function newQ(){
      let a, b, op, ans;
      if(n >= 3 && Math.random() < 0.4){ a = ri(3, 10); b = ri(1, Math.min(5, a - 1)); op = '−'; ans = a - b; }
      else { a = ri(1, 7); b = ri(1, Math.min(6, 10 - a)); op = '+'; ans = a + b; }
      const opts = new Set([ans]);
      while(opts.size < 3){ const d = ans + ri(-3, 3); if(d >= 0 && d <= 12) opts.add(d); }
      const arr = [...opts];
      q = { a, b, op, ans, order: [shuffle(arr), shuffle(arr)] };
      n++; stage = 'ask'; st = 0; lock = [false, false]; picked = [-1, -1]; winner = null;
    }
    newQ();
    function btnGeo(i){
      const bs = Math.min(api.W * 0.27, half() * 0.28), gap = bs * 1.14;
      return { x: api.W / 2 + (i - 1) * gap, y: api.H - half() * 0.23, s: bs };
    }
    function answer(pl, i){
      if(stage !== 'ask' || lock[pl]) return;
      const v = q.order[pl][i];
      picked[pl] = i; press[pl] = i; pressT[pl] = 1;
      if(v === q.ans){
        winner = pl; pts[pl]++; stage = 'show'; st = 0;
        api.sfx.coin(); api.sfx.point();
      } else {
        lock[pl] = true; shake[pl] = 1; api.sfx.buzz();
        if(lock[0] && lock[1]){ stage = 'show'; st = 0; }
      }
    }
    function finish(){
      if(ended) return; ended = true; endAt = time + 0.5;
      endW = pts[0] === pts[1] ? null : pts[0] > pts[1] ? 0 : 1;
    }
    function drawSum(c, cx, cy, size){
      const showAns = stage === 'show';
      const toks = [api.AR(q.a), q.op, api.AR(q.b), '=', showAns ? api.AR(q.ans) : L('؟', '?', '?')];
      c.save(); c.font = '800 ' + Math.round(size) + 'px ' + api.FONT;
      const gap = size * 0.28, ws = toks.map(t => Math.max(c.measureText(t).width, size * 0.45));
      const total = ws.reduce((a, b) => a + b, 0) + gap * (toks.length - 1);
      c.restore();
      const rtl = api.dir === 'rtl';                // Arabic reads right-to-left, others left-to-right
      let x = rtl ? cx + total / 2 : cx - total / 2;
      toks.forEach((t, i) => {
        const w = ws[i];
        const col = i === 4 ? (showAns ? '#3fd47a' : '#ffcd4d') : (i === 1 || i === 3 ? '#ff9f1c' : '#fff7e8');
        api.text(c, t, rtl ? x - w / 2 : x + w / 2, cy, size, col, 0);
        x += rtl ? -(w + gap) : w + gap;
      });
    }

    return {
      update(dt){
        time += dt; st += dt;
        for(const pl of [0, 1]){ pressT[pl] = Math.max(0, pressT[pl] - dt * 4); shake[pl] = Math.max(0, shake[pl] - dt * 2.5); }
        if(ended){ if(time >= endAt && !called){ called = true; api.win(endW); } return; }
        if(stage === 'ask' && st >= QT){ stage = 'show'; st = 0; api.sfx.buzz(); }
        else if(stage === 'show' && st >= 1.3){
          if(pts[0] >= GOAL || pts[1] >= GOAL || time >= LIMIT) finish();
          else newQ();
        }
      },
      pointerDown(p){
        const pl = p.player; if(ended || (pl !== 0 && pl !== 1)) return;
        const l = loc(p);
        for(let i = 0; i < 3; i++){
          const g = btnGeo(i);
          if(Math.abs(l.x - g.x) < g.s * 0.56 && Math.abs(l.y - g.y) < g.s * 0.56){ answer(pl, i); return; }
        }
      },
      draw(c){
        const W = api.W, H = api.H, mid = H / 2, hf = half(), s = S();
        // chalk-board-ish bright classroom
        c.fillStyle = '#ffe9b8'; c.fillRect(0, 0, W, H);
        c.fillStyle = 'rgba(255,90,95,.16)'; c.fillRect(0, mid, W, mid);
        c.fillStyle = 'rgba(63,169,255,.16)'; c.fillRect(0, 0, W, mid);
        const sym = ['+', '−', api.AR(3), api.AR(7), api.AR(5), '='];
        for(let i = 0; i < 18; i++){ const x = ((i * 71) % 100) / 100 * W, y = ((i * 43 + 9) % 100) / 100 * H; c.globalAlpha = 0.12; api.text(c, sym[i % 6], x, y, s * 0.07, '#1c1838', i % 2, 800); }
        c.globalAlpha = 1;
        c.fillStyle = OUT; c.fillRect(0, mid - 3, W, 6);
        for(const pl of [0, 1]){
          c.save(); if(pl === 1){ c.translate(W, H); c.rotate(Math.PI); }
          const col = api.players[pl], other = 1 - pl;
          // points
          for(let i = 0; i < GOAL; i++){
            c.globalAlpha = i < pts[pl] ? 1 : 0.22;
            api.emoji(c, '⭐', W / 2 + (i - (GOAL - 1) / 2) * s * 0.075, mid + hf * 0.1, s * 0.06);
          }
          c.globalAlpha = 1;
          // question board
          const bw = Math.min(W * 0.8, s * 0.82), bh = hf * 0.26, by = mid + hf * 0.38;
          const sx = Math.sin(time * 40) * shake[pl] * s * 0.012;
          c.fillStyle = 'rgba(28,24,56,.25)'; c.beginPath(); c.roundRect(W / 2 - bw / 2 + 4, by - bh / 2 + 6, bw, bh, s * 0.04); c.fill();
          c.fillStyle = '#2f5d50'; c.strokeStyle = OUT; c.lineWidth = Math.max(4, s * 0.012);
          c.beginPath(); c.roundRect(W / 2 - bw / 2 + sx, by - bh / 2, bw, bh, s * 0.04); c.fill(); c.stroke();
          c.strokeStyle = '#c98a4b'; c.lineWidth = Math.max(3, s * 0.01);
          c.beginPath(); c.roundRect(W / 2 - bw / 2 + sx + 6, by - bh / 2 + 6, bw - 12, bh - 12, s * 0.03); c.stroke();
          drawSum(c, W / 2 + sx, by, Math.min(bh * 0.55, s * 0.13));
          // time bar
          if(stage === 'ask'){
            const k = Math.max(0, 1 - st / QT), tw = bw * 0.8;
            c.fillStyle = 'rgba(28,24,56,.25)'; c.beginPath(); c.roundRect(W / 2 - tw / 2, by + bh / 2 + hf * 0.03, tw, s * 0.018, s * 0.009); c.fill();
            c.fillStyle = k < 0.3 ? '#ff5a5f' : col.color; c.beginPath(); c.roundRect(W / 2 - tw / 2, by + bh / 2 + hf * 0.03, tw * k, s * 0.018, s * 0.009); c.fill();
          }
          // status line
          let msg = '', mc = col.dark;
          if(stage === 'show'){
            if(winner === pl){ msg = L('صح! +١ 🎉', 'Right! +1 🎉', 'Doğru! +1 🎉'); mc = '#2a9d5c'; }
            else if(winner === other) msg = L('سبقك رفيقك!', 'Your friend was faster!', 'Arkadaşın daha hızlıydı!');
            else msg = L('ولا حدا جاوب 🤷', 'Nobody got it 🤷', 'Kimse bilemedi 🤷');
          } else if(lock[pl]) msg = L('غلط! استنى السؤال الجاي ✋', 'Oops! Wait for the next one ✋', 'Yanlış! Sonrakini bekle ✋');
          else if(n === 1 && st < 2.5) msg = L('اكبس عالجواب الصح 👇', 'Tap the right answer 👇', 'Doğru cevaba dokun 👇');
          if(msg) api.text(c, msg, W / 2, mid + hf * 0.58, Math.min(s * 0.06, 25), mc, 0);
          // answer buttons
          for(let i = 0; i < 3; i++){
            const g = btnGeo(i), v = q.order[pl][i], pr = press[pl] === i ? pressT[pl] : 0;
            const isAns = v === q.ans, mine = picked[pl] === i;
            let face = '#fff7e8', alpha = 1;
            if(stage === 'show'){ if(isAns) face = '#7ee2a0'; else if(mine) face = '#ff9a9e'; else alpha = 0.5; }
            else if(lock[pl]){ alpha = mine ? 1 : 0.45; if(mine) face = '#ff9a9e'; }
            const yy = g.y + pr * g.s * 0.05;
            c.save(); c.globalAlpha = alpha;
            c.fillStyle = 'rgba(28,24,56,.3)'; c.beginPath(); c.roundRect(g.x - g.s / 2, g.y - g.s / 2 + g.s * 0.07, g.s, g.s, g.s * 0.22); c.fill();
            c.fillStyle = face; c.strokeStyle = OUT; c.lineWidth = Math.max(3, g.s * 0.045);
            c.beginPath(); c.roundRect(g.x - g.s / 2, yy - g.s / 2, g.s, g.s, g.s * 0.22); c.fill(); c.stroke();
            c.fillStyle = col.color; c.beginPath(); c.roundRect(g.x - g.s / 2 + 6, yy + g.s * 0.3, g.s - 12, g.s * 0.12, g.s * 0.06); c.fill();
            api.text(c, api.AR(v), g.x, yy - g.s * 0.04, g.s * 0.5, OUT, 0);
            if(stage === 'show' && isAns && winner === pl) api.emoji(c, '✅', g.x + g.s * 0.38, yy - g.s * 0.38, g.s * 0.3);
            if(mine && !isAns) api.emoji(c, '❌', g.x + g.s * 0.38, yy - g.s * 0.38, g.s * 0.28);
            c.restore();
          }
          c.restore();
        }
      }
    };
  }
});
