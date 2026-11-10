/* Memory: flip two cards, find matching pictures. 3 rounds: 3, 6, then 8 pairs. Bobo cheers from the top. */
Solo.register({
  id: 'memory', title: L('الذاكرة','Memory','Hafıza'), emoji: '🃏', bg: '#ff8fa3',
  help: L('اقلب البطاقات ولاقي كل صورتين متل بعض','Flip the cards and find two pictures that match','Kartları çevir, aynı iki resmi bul'),
  create(api){
    const OUT = '#1c1838';
    const PICS = ['🐶','🐱','🐰','🦊','🐻','🐼','🐸','🐵','🦁','🐷','🐮','🐥','🐙','🦄','🐢','🍎','🍌','🍓','🍉','🍇','🍒','🍍','🥕'];
    const ROUNDS = [{ pairs: 3, cols: 2, rows: 3 }, { pairs: 6, cols: 3, rows: 4 }, { pairs: 8, cols: 4, rows: 4 }];
    const BACKS = [['#7a5cff', '#9d86ff'], ['#2ec4b6', '#5fe0d3'], ['#ff9f1c', '#ffc15e']];
    const BLOBS = Array.from({ length: 9 }, (_, i) => ({ x: Math.random(), y: Math.random(), r: 0.05 + Math.random() * 0.1, sp: 0.01 + Math.random() * 0.02, ph: i }));
    let round = 0, moves = 0, found = 0, score = 0, cards = [], open = [], pending = null, waitT = 0;
    let mood = 'idle', moodT = 0, sparks = [], doneT = -1, t = 0, look = { x: 0, y: 0 }, hudPop = 0, bonusTxt = null;
    let L = { cw: 60, ch: 75, boboX: 0, boboY: 0, boboR: 30 };
    const S = () => Math.min(api.W, api.H);
    const lw = () => Math.max(3, S() * 0.011);

    function deal(){
      const R = ROUNDS[round], pics = api.shuffle(PICS).slice(0, R.pairs);
      cards = api.shuffle(pics.concat(pics)).map((e, i) => ({ e, f: 0, target: 0, matched: false, pop: 0, wob: 0, appear: -i * 0.06, tw: Math.random() * 6 }));
      moves = 0; found = 0; open = []; pending = null; waitT = 0; doneT = -1;
      place();
    }
    function place(){
      const R = ROUNDS[round], W = api.W, H = api.H, s = S();
      L.boboR = s * 0.085; L.boboX = W / 2; L.boboY = 10 + L.boboR * 1.8;
      const top = L.boboY + L.boboR * 1.25, bottom = H - s * 0.04, left = s * 0.04, right = W - s * 0.04;
      const aw = right - left, ah = bottom - top;
      let cols = R.cols, rows = R.rows;
      if(aw > ah * 1.1){ cols = R.rows; rows = R.cols; }
      const gap = s * 0.03;
      const cw = Math.min((aw - gap * (cols - 1)) / cols, (ah - gap * (rows - 1)) / rows / 1.22, s * 0.34);
      const ch = cw * 1.22;
      const gw = cols * cw + (cols - 1) * gap, gh = rows * ch + (rows - 1) * gap;
      const x0 = W / 2 - gw / 2 + cw / 2, y0 = top + (ah - gh) * 0.4 + ch / 2;
      L.cw = cw; L.ch = ch;
      cards.forEach((cd, i) => { cd.x = x0 + (i % cols) * (cw + gap); cd.y = y0 + Math.floor(i / cols) * (ch + gap); });
    }
    function setMood(m, d){ mood = m; moodT = d; }
    function burst(x, y, n, big){
      const cols = ['#ffd23f', '#fff7e8', '#ff5d8f', '#5fe0d3', '#9d86ff'];
      for(let i = 0; i < n; i++){
        const a = Math.random() * Math.PI * 2, v = S() * (big ? 0.35 : 0.22) * (0.4 + Math.random());
        sparks.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - S() * 0.1, life: 0.8 + Math.random() * 0.4, max: 1.2, r: S() * (0.012 + Math.random() * 0.016), col: api.pick(cols), rot: Math.random() * 6, sp: (Math.random() - 0.5) * 8 });
      }
    }
    function star(c, x, y, r, rot, col){
      c.save(); c.translate(x, y); c.rotate(rot); c.beginPath();
      for(let k = 0; k < 10; k++){ const a = -Math.PI / 2 + k * Math.PI / 5, rr = k % 2 ? r * 0.45 : r; c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
      c.closePath(); c.fillStyle = col; c.fill(); c.strokeStyle = OUT; c.lineWidth = Math.max(1.5, r * 0.22); c.stroke(); c.restore();
    }
    function tapCard(cd){
      if(doneT >= 0 || pending || cd.matched || cd.target === 1 || open.length >= 2) return;
      cd.target = 1; open.push(cd); api.sfx.swoosh();
      look = { x: api.clamp((cd.x - L.boboX) / (api.W * 0.4), -1, 1), y: 1 };
      if(open.length === 2){
        moves++; hudPop = 1;
        const [a, b] = open;
        pending = a.e === b.e ? 'match' : 'miss'; waitT = pending === 'match' ? 0.35 : 1.05;
      }
    }
    function resolve(){
      const [a, b] = open;
      if(pending === 'match'){
        a.matched = b.matched = true; a.pop = b.pop = 1; found++; score += 10;
        api.sfx.good(); burst(a.x, a.y, 12); burst(b.x, b.y, 12); setMood('happy', 1.2);
        if(found === ROUNDS[round].pairs){
          const P = ROUNDS[round].pairs, bonus = Math.max(0, 2 * P - moves) * 5;
          score += bonus; doneT = 0; setMood('wow', 2.2); api.sfx.coin();
          api.toast(round < 2 ? api.L('برافو! 🎉','Well done! 🎉','Aferin! 🎉') : api.L('ذاكرة قوية! 🧠','Super memory! 🧠','Süper hafıza! 🧠'), 1500);
          if(bonus > 0) bonusTxt = { s: '+' + api.AR(bonus) + ' ⭐', t: 0 };
          for(const cd of cards) burst(cd.x, cd.y, 4, true);
        }
      } else {
        a.target = b.target = 0; a.wob = b.wob = 1;
        api.tone(330, 0.12, 'triangle', 0.08); api.tone(262, 0.16, 'triangle', 0.08, 0.1);
      }
      open = []; pending = null;
    }

    function drawBg(c){
      const W = api.W, H = api.H, g = c.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, '#ffc2cf'); g.addColorStop(1, '#ff8fa3'); c.fillStyle = g; c.fillRect(0, 0, W, H);
      c.fillStyle = 'rgba(255,255,255,.22)';
      for(const b of BLOBS){
        const y = ((b.y - t * b.sp) % 1 + 1) % 1;
        c.beginPath(); c.arc(b.x * W + Math.sin(t * 0.7 + b.ph) * 10, y * H * 1.2 - H * 0.1, b.r * S(), 0, Math.PI * 2); c.fill();
      }
    }
    function pill(c, x, y, str, w){
      const s = S(), h = Math.max(40, s * 0.1);
      c.fillStyle = 'rgba(28,24,56,.72)'; c.beginPath(); c.roundRect(x - w / 2, y - h / 2, w, h, h / 2); c.fill();
      c.strokeStyle = '#fff7e8'; c.lineWidth = 3; c.stroke();
      api.text(c, str, x, y + 1, h * 0.5, '#fff7e8');
    }
    function drawCard(c, cd){
      const w = L.cw, h = L.ch, s = S();
      const ap = api.clamp(cd.appear, 0, 1); if(ap <= 0) return;
      const appearS = ap < 1 ? 1 - Math.pow(1 - ap, 3) * Math.cos(ap * 6) : 1;
      const popS = 1 + Math.sin(cd.pop * Math.PI) * 0.18;
      const sx = Math.max(0.02, Math.abs(Math.cos(cd.f * Math.PI))), face = cd.f > 0.5;
      const wob = Math.sin(cd.wob * 22) * cd.wob * w * 0.06;
      c.save(); c.translate(cd.x + wob, cd.y + (cd.matched ? Math.sin(t * 3 + cd.tw) * h * 0.015 : 0));
      c.scale(sx * appearS * popS, appearS * popS);
      c.fillStyle = 'rgba(28,24,56,.25)'; c.beginPath(); c.roundRect(-w / 2 + 3, -h / 2 + 6, w, h, w * 0.16); c.fill();
      c.lineWidth = lw(); c.strokeStyle = OUT;
      if(face){
        c.fillStyle = cd.matched ? '#fff3b8' : '#fff7e8'; c.beginPath(); c.roundRect(-w / 2, -h / 2, w, h, w * 0.16); c.fill(); c.stroke();
        c.strokeStyle = cd.matched ? '#ffc93c' : '#ffd6df'; c.lineWidth = Math.max(2, w * 0.05);
        c.beginPath(); c.roundRect(-w / 2 + w * 0.09, -h / 2 + w * 0.09, w - w * 0.18, h - w * 0.18, w * 0.1); c.stroke();
        api.emoji(c, cd.e, 0, 0, w * 0.6);
      } else {
        const col = BACKS[round];
        c.fillStyle = col[0]; c.beginPath(); c.roundRect(-w / 2, -h / 2, w, h, w * 0.16); c.fill();
        c.save(); c.clip(); c.fillStyle = col[1];
        for(let yy = -h / 2; yy < h / 2 + w * 0.2; yy += w * 0.22) for(let xx = -w / 2; xx < w / 2 + w * 0.2; xx += w * 0.22){
          if(((Math.round((xx + w) / (w * 0.22)) + Math.round((yy + h) / (w * 0.22))) & 1) === 0){ c.beginPath(); c.arc(xx, yy, w * 0.05, 0, Math.PI * 2); c.fill(); }
        }
        c.restore();
        c.beginPath(); c.roundRect(-w / 2, -h / 2, w, h, w * 0.16); c.stroke();
        c.fillStyle = '#fff7e8'; c.beginPath(); c.arc(0, 0, w * 0.26, 0, Math.PI * 2); c.fill(); c.lineWidth = Math.max(2, lw() * 0.8); c.stroke();
        api.text(c, api.L('؟','?','?'), 0, w * 0.02, w * 0.36, col[0]);
      }
      c.restore();
      if(cd.matched && face){
        const k = (Math.sin(t * 4 + cd.tw) + 1) / 2;
        star(c, cd.x + w * 0.36, cd.y - h * 0.38, w * (0.08 + k * 0.05), t * 1.5 + cd.tw, '#ffd23f');
      }
    }

    deal();
    return {
      debug: { get round(){ return round; }, get score(){ return score; }, get moves(){ return moves; },
        get busy(){ return !!pending || open.length >= 2 || doneT >= 0 || cards.some(c => c.appear < 1); },
        get cards(){ return cards.map(c => ({ e: c.e, x: c.x, y: c.y, matched: c.matched, up: c.target === 1 })); } },
      update(dt){
        t += dt;
        for(const cd of cards){
          cd.appear = Math.min(1, cd.appear + dt * 3);
          const d = cd.target - cd.f; cd.f += Math.sign(d) * Math.min(Math.abs(d), dt * 4.5);
          cd.pop = Math.max(0, cd.pop - dt * 2.5); cd.wob = Math.max(0, cd.wob - dt * 2);
        }
        if(pending){ waitT -= dt; if(waitT <= 0) resolve(); }
        if(moodT > 0){ moodT -= dt; if(moodT <= 0) mood = 'idle'; }
        look.x *= Math.pow(0.3, dt); look.y *= Math.pow(0.3, dt);
        hudPop = Math.max(0, hudPop - dt * 4);
        for(const p of sparks){ p.x += p.vx * dt; p.y += p.vy * dt; p.vy += S() * 0.6 * dt; p.life -= dt; p.rot += p.sp * dt; }
        sparks = sparks.filter(p => p.life > 0);
        if(bonusTxt){ bonusTxt.t += dt; if(bonusTxt.t > 1.6) bonusTxt = null; }
        if(doneT >= 0){
          doneT += dt;
          if(doneT > 1.9){
            round++;
            if(round >= ROUNDS.length){ doneT = -99; api.end({ score, win: true, msg: api.L('ذاكرة قوية! 🧠','Super memory! 🧠','Süper hafıza! 🧠') }); }
            else deal();
          }
        }
      },
      draw(c){
        const W = api.W, s = S();
        drawBg(c);
        for(const cd of cards) drawCard(c, cd);
        for(const p of sparks){ c.globalAlpha = Math.min(1, p.life / 0.4); star(c, p.x, p.y, p.r, p.rot, p.col); }
        c.globalAlpha = 1;
        // Bobo + HUD
        const jump = mood === 'happy' || mood === 'wow' ? Math.abs(Math.sin(t * 9)) * L.boboR * 0.25 : 0;
        api.bobo(c, L.boboX, L.boboY - jump, L.boboR, mood, look, t);
        const ph = Math.max(40, s * 0.1), py = 10 + ph / 2;
        const pw = Math.min((W / 2 - L.boboR * 1.3) - 70, s * 0.36);
        pill(c, W - 8 - pw / 2, py, api.L('جولة ','Round ','Tur ') + api.AR(round + 1) + '/' + api.AR(ROUNDS.length), pw);
        c.save(); const hs = 1 + hudPop * 0.15, hx = 64 + pw / 2; c.translate(hx, py); c.scale(hs, hs);
        pill(c, 0, 0, '👆 ' + api.AR(moves), pw); c.restore();
        if(bonusTxt) api.text(c, bonusTxt.s, W / 2, L.boboY + L.boboR * 1.6 - bonusTxt.t * s * 0.05, s * 0.08, '#ffd23f');
      },
      pointerDown(p){
        for(const cd of cards){
          if(Math.abs(p.x - cd.x) < L.cw / 2 && Math.abs(p.y - cd.y) < L.ch / 2){ tapCard(cd); return; }
        }
      },
      resize(){ place(); }
    };
  }
});
