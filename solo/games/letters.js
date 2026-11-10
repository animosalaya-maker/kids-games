/* Letter hunt: Bobo holds a sign with a letter + a word that starts with it. Pop the bubble with the same letter. 10 questions. */
Solo.register({
  id: 'letters', title: L('صيد الحروف','Letter Catch','Harf Avı'), emoji: '🔤', bg: '#4fb3ff',
  help: L('شوف الحرف اللي مع بوبو وفقّع الفقاعة اللي فيها نفس الحرف','Look at Bobo\'s letter and pop the bubble with the same letter','Bobo\'nun harfine bak, aynı harfli baloncuğu patlat'),
  create(api){
    const OUT = '#1c1838', N = 10;
    const LET_AR = [
      ['أ','ألف','أرنب','🐰'], ['ب','باء','بطة','🦆'], ['ت','تاء','تفاحة','🍎'], ['ث','ثاء','ثعلب','🦊'],
      ['ج','جيم','جمل','🐫'], ['ح','حاء','حصان','🐴'], ['خ','خاء','خروف','🐑'], ['د','دال','دب','🐻'],
      ['ذ','ذال','ذرة','🌽'], ['ر','راء','ريشة','🪶'], ['ز','زاي','زرافة','🦒'], ['س','سين','سمكة','🐟'],
      ['ش','شين','شمس','☀️'], ['ص','صاد','صوص','🐥'], ['ض','ضاد','ضفدع','🐸'], ['ط','طاء','طائرة','✈️'],
      ['ع','عين','عنب','🍇'], ['غ','غين','غيمة','☁️'], ['ف','فاء','فيل','🐘'], ['ق','قاف','قطة','🐱'],
      ['ك','كاف','كلب','🐶'], ['ل','لام','ليمون','🍋'], ['م','ميم','موز','🍌'], ['ن','نون','نحلة','🐝'],
      ['هـ','هاء','هدية','🎁'], ['و','واو','وردة','🌹'], ['ي','ياء','يد','✋']
    ];
    // [letter, how the letter is said, word, picture]
    const LET_EN = [
      ['A','A','Apple','🍎'], ['B','B','Ball','⚽'], ['C','C','Cat','🐱'], ['D','D','Dog','🐶'], ['E','E','Elephant','🐘'],
      ['F','F','Fish','🐟'], ['G','G','Grapes','🍇'], ['H','H','Horse','🐴'], ['I','I','Ice cream','🍦'], ['J','J','Juice','🧃'],
      ['K','K','Kite','🪁'], ['L','L','Lemon','🍋'], ['M','M','Moon','🌙'], ['N','N','Nest','🪺'], ['O','O','Orange','🍊'],
      ['P','P','Pig','🐷'], ['Q','Q','Queen','👸'], ['R','R','Rabbit','🐰'], ['S','S','Sun','☀️'], ['T','T','Tree','🌳'],
      ['U','U','Umbrella','☂️'], ['V','V','Violin','🎻'], ['W','W','Whale','🐳'], ['Y','Y','Yo-yo','🪀'], ['Z','Z','Zebra','🦓']
    ];
    const LET_TR = [
      ['A','a','Arı','🐝'], ['B','be','Balık','🐟'], ['C','ce','Ceviz','🌰'], ['Ç','çe','Çiçek','🌸'], ['D','de','Deniz','🌊'],
      ['E','e','Elma','🍎'], ['F','fe','Fil','🐘'], ['G','ge','Güneş','☀️'], ['H','he','Havuç','🥕'], ['İ','i','İnek','🐄'],
      ['J','je','Jöle','🍮'], ['K','ke','Kedi','🐱'], ['L','le','Limon','🍋'], ['M','me','Muz','🍌'], ['N','ne','Nane','🌿'],
      ['O','o','Okul','🏫'], ['Ö','ö','Ördek','🦆'], ['P','pe','Pasta','🎂'], ['R','re','Roket','🚀'], ['S','se','Saat','⏰'],
      ['Ş','şe','Şemsiye','☂️'], ['T','te','Tavşan','🐰'], ['U','u','Uçak','✈️'], ['Ü','ü','Üzüm','🍇'], ['V','ve','Vazo','🏺'],
      ['Y','ye','Yıldız','⭐'], ['Z','ze','Zürafa','🦒']
    ];
    const LET = (api.lang === 'ar' ? LET_AR : api.lang === 'tr' ? LET_TR : LET_EN).map(a => ({ ch: a[0], name: a[1], word: a[2], e: a[3] }));
    // letters that look alike, used as tricky wrong answers
    const SIBS = api.lang === 'ar' ? ['بتث', 'جحخ', 'دذ', 'رز', 'سش', 'صض', 'عغ', 'فق']
      : api.lang === 'tr' ? ['CÇG', 'OÖ', 'UÜV', 'SŞ', 'EF', 'PR', 'MN', 'İL', 'BD']
      : ['EF', 'OQC', 'MN', 'PRB', 'UV', 'IJL', 'VW', 'KX', 'ST'];
    const BCOL = ['#ff5d8f', '#ffd23f', '#7ed957', '#b48cff', '#ff9f1c', '#5fe0d3'];
    const order = api.shuffle(LET).slice(0, N);
    const CLOUDS = Array.from({ length: 5 }, () => ({ x: Math.random(), y: 0.08 + Math.random() * 0.9, s: 0.7 + Math.random() * 0.6, v: 0.01 + Math.random() * 0.015 }));
    let q = -1, cur = null, bubbles = [], first = true, score = 0, t = 0, mood = 'idle', moodT = 0, nextT = -1, parts = [], signPop = 0, look = { x: 0, y: 0 };
    let L = {};
    const S = () => Math.min(api.W, api.H);
    const lw = () => Math.max(3, S() * 0.011);

    function layout(){
      const W = api.W, H = api.H, s = S();
      L.r = s * 0.1; L.bx = W / 2; L.by = 12 + L.r * 1.75;
      L.sw = Math.min(W * 0.86, s * 1.0); L.sh = Math.min(s * 0.36, H * 0.2);
      L.sy = L.by + L.r * 0.62;               // sign top
      L.top = L.sy + L.sh + s * 0.03;          // bubble area top
      L.br = Math.min(W / 4 * 0.4, s * 0.13);
    }
    function next(){
      q++; first = true; nextT = -1;
      if(q >= N){ api.end({ score, win: true, msg: api.L('شاطر بالحروف! 🔤','Letter star! 🔤','Harf ustası! 🔤') }); return; }
      cur = order[q];
      const opts = [cur.ch], sib = SIBS.find(g => g.includes(cur.ch));
      if(sib && Math.random() < 0.75){ const o = api.pick(sib.split('').filter(c => c !== cur.ch)); opts.push(o); }
      for(const x of api.shuffle(LET)){ if(opts.length >= 4) break; if(!opts.includes(x.ch)) opts.push(x.ch); }
      const H = api.H, area = H - L.top;
      const ys = api.shuffle([0.25, 0.45, 0.65, 0.85]);
      bubbles = api.shuffle(opts).map((ch, i) => ({ ch, ok: ch === cur.ch, col: i, y: L.top + area * ys[i] + area * 0.2, ph: Math.random() * 6, wob: 0, tried: false, gone: false, a: 0, color: BCOL[(q + i) % BCOL.length] }));
      signPop = 1; api.sfx.swoosh();
      say();
    }
    function say(){ api.say(api.lang === 'en' ? cur.name + '... ' + cur.name + ' is for ' + cur.word : cur.name + '... ' + cur.word); }
    function bx(b){ const m = L.br * 1.35; return m + (api.W - 2 * m) * b.col / 3 + Math.sin(t * 1.3 + b.ph) * L.br * 0.15; }
    function burst(x, y, col){
      for(let i = 0; i < 18; i++){
        const a = Math.random() * Math.PI * 2, v = S() * (0.2 + Math.random() * 0.35);
        parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0.7 + Math.random() * 0.5, r: S() * (0.012 + Math.random() * 0.018), col: i % 3 ? col : '#fff7e8', star: i % 2 === 0, rot: Math.random() * 6 });
      }
      parts.push({ x, y, ring: true, life: 0.4, r: L.br });
    }
    function star(c, x, y, r, rot, col){
      c.save(); c.translate(x, y); c.rotate(rot); c.beginPath();
      for(let k = 0; k < 10; k++){ const a = -Math.PI / 2 + k * Math.PI / 5, rr = k % 2 ? r * 0.45 : r; c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
      c.closePath(); c.fillStyle = col; c.fill(); c.strokeStyle = OUT; c.lineWidth = Math.max(1.5, r * 0.2); c.stroke(); c.restore();
    }
    function tap(b){
      if(nextT >= 0 || b.gone) return;
      if(b.ok){
        b.gone = true; api.sfx.pop(); api.sfx.good(); burst(bx(b), b.y, b.color);
        if(first) score += 10;
        mood = 'happy'; moodT = 1.3; nextT = 0; signPop = 1;
        api.toast(first ? api.pick(api.lang === 'ar' ? ['برافو! ⭐', 'شاطر! 🌟', 'يا سلام! ✨'] : api.lang === 'tr' ? ['Aferin! ⭐', 'Süper! 🌟', 'Harika! ✨'] : ['Well done! ⭐', 'Super! 🌟', 'Wow! ✨']) : api.L('صح! 👍','Yes! 👍','Doğru! 👍'), 900);
      } else {
        b.wob = 1; b.tried = true; first = false; api.sfx.bad(); mood = 'sad'; moodT = 0.6;
      }
    }

    function drawBg(c){
      const W = api.W, H = api.H, g = c.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, '#9fd8ff'); g.addColorStop(1, '#2f8fe0'); c.fillStyle = g; c.fillRect(0, 0, W, H);
      c.fillStyle = 'rgba(255,255,255,.55)';
      for(const cl of CLOUDS){
        const x = ((cl.x + t * cl.v) % 1.3) * W * 1.0 - W * 0.15, y = cl.y * H, r = S() * 0.06 * cl.s;
        c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.arc(x + r, y + r * 0.2, r * 0.8, 0, Math.PI * 2); c.arc(x - r, y + r * 0.25, r * 0.7, 0, Math.PI * 2); c.fill();
      }
      // little rising bubbles
      c.strokeStyle = 'rgba(255,255,255,.35)'; c.lineWidth = 2;
      for(let i = 0; i < 12; i++){ const y = H - ((t * 25 + i * 97) % (H + 40)), x = (i * 131) % W; c.beginPath(); c.arc(x + Math.sin(t + i) * 6, y, 4 + (i % 3) * 3, 0, Math.PI * 2); c.stroke(); }
    }
    function drawSign(c){
      const s = S(), w = L.sw, h = L.sh, x = api.W / 2 - w / 2, y = L.sy;
      const sc = 1 + Math.sin(Math.min(1, 1 - signPop) * Math.PI) * 0.06 * (signPop > 0 ? 1 : 0);
      c.save(); c.translate(api.W / 2, y + h / 2); c.scale(sc, sc); c.translate(-api.W / 2, -(y + h / 2));
      c.fillStyle = 'rgba(28,24,56,.25)'; c.beginPath(); c.roundRect(x + 4, y + 7, w, h, h * 0.18); c.fill();
      c.fillStyle = '#ffe9a8'; c.strokeStyle = OUT; c.lineWidth = lw(); c.beginPath(); c.roundRect(x, y, w, h, h * 0.18); c.fill(); c.stroke();
      c.strokeStyle = '#f2c96b'; c.lineWidth = 2; for(let k = 1; k < 4; k++){ c.beginPath(); c.moveTo(x + h * 0.15, y + h * k / 4); c.lineTo(x + w - h * 0.15, y + h * k / 4); c.stroke(); }
      if(cur){
        // the letter (right side in RTL, left side in LTR)
        const rtl = api.dir === 'rtl';
        const lx = rtl ? x + w - h * 0.6 : x + h * 0.6, ly = y + h / 2, lr = h * 0.4;
        c.fillStyle = '#fff7e8'; c.beginPath(); c.arc(lx, ly, lr, 0, Math.PI * 2); c.fill(); c.strokeStyle = OUT; c.lineWidth = lw(); c.stroke();
        api.text(c, cur.ch, lx, ly + lr * 0.05, lr * 1.35, '#ff4d6d');
        // emoji + word
        const ex = rtl ? x + (w - h * 1.2) / 2 : x + h * 1.2 + (w - h * 1.2) / 2, spx = rtl ? x + h * 0.22 : x + w - h * 0.22;
        api.emoji(c, cur.e, ex, y + h * 0.36, h * 0.44, Math.sin(t * 2) * 0.08);
        api.text(c, cur.word, ex, y + h * 0.78, Math.min(h * 0.24, (w - h * 1.3) / Math.max(4, cur.word.length) * 1.7), '#1c1838', 800);
        c.fillStyle = '#4fb3ff'; c.beginPath(); c.arc(spx, y + h * 0.22, h * 0.12, 0, Math.PI * 2); c.fill(); c.strokeStyle = OUT; c.lineWidth = 2; c.stroke();
        api.emoji(c, '🔊', spx, y + h * 0.22, h * 0.14);
      }
      c.restore();
      // Bobo's paws on the sign edge
      const pal = window.World ? World.palette() : { color: '#9b6bff' };
      for(const sx of [-1, 1]){
        c.fillStyle = pal.color; c.strokeStyle = OUT; c.lineWidth = Math.max(2, lw() * 0.7);
        c.beginPath(); c.ellipse(L.bx + sx * L.r * 0.7, y + L.r * 0.05, L.r * 0.22, L.r * 0.17, 0, 0, Math.PI * 2); c.fill(); c.stroke();
      }
    }
    function drawBubble(c, b){
      const r = L.br, x = bx(b) + Math.sin(b.wob * 25) * b.wob * r * 0.25, y = b.y;
      const squ = 1 + Math.sin(t * 3 + b.ph) * 0.04;
      c.save(); c.globalAlpha = b.a; c.translate(x, y); c.scale(squ, 1 / squ);
      c.fillStyle = b.tried ? 'rgba(220,220,235,.75)' : b.color; c.globalAlpha = b.a * 0.9;
      c.beginPath(); c.arc(0, 0, r, 0, Math.PI * 2); c.fill(); c.globalAlpha = b.a;
      c.strokeStyle = OUT; c.lineWidth = lw(); c.stroke();
      c.fillStyle = 'rgba(255,255,255,.7)'; c.beginPath(); c.ellipse(-r * 0.42, -r * 0.45, r * 0.22, r * 0.12, -0.7, 0, Math.PI * 2); c.fill();
      c.beginPath(); c.arc(r * 0.5, r * 0.45, r * 0.07, 0, Math.PI * 2); c.fill();
      api.text(c, b.ch, 0, r * 0.06, r * 1.05, '#fff7e8');
      c.restore();
    }

    layout(); next();
    return {
      debug: { get q(){ return q; }, get score(){ return score; }, get target(){ return cur && cur.ch; }, get busy(){ return nextT >= 0; },
        get bubbles(){ return bubbles.map(b => ({ ch: b.ch, ok: b.ok, x: bx(b), y: b.y, r: L.br, a: b.a, gone: b.gone })); } },
      update(dt){
        t += dt; signPop = Math.max(0, signPop - dt * 2.5);
        const area = api.H - L.top, v = area / 10;
        for(const b of bubbles){
          b.wob = Math.max(0, b.wob - dt * 1.8);
          if(nextT >= 0){ b.y -= v * 3 * dt; b.a = Math.max(0, b.a - dt * 2); continue; }
          b.y -= v * dt;
          const fadeTop = L.top + L.br * 0.6;
          if(b.y < fadeTop){ b.a = Math.max(0, b.a - dt * 3); if(b.a <= 0){ b.y = api.H + L.br * 1.2; } }
          else b.a = Math.min(1, b.a + dt * 3);
        }
        if(moodT > 0){ moodT -= dt; if(moodT <= 0) mood = 'idle'; }
        const live = bubbles.find(b => b.ok && !b.gone);
        look = live ? { x: 0, y: 0.7 } : { x: 0, y: 0 };
        for(const p of parts){ if(!p.ring){ p.x += p.vx * dt; p.y += p.vy * dt; p.vy += S() * 0.5 * dt; p.rot += dt * 4; } p.life -= dt; }
        parts = parts.filter(p => p.life > 0);
        if(nextT >= 0){ nextT += dt; if(nextT > 1.4) next(); }
      },
      draw(c){
        const W = api.W, s = S();
        drawBg(c);
        for(const b of bubbles) if(!b.gone) drawBubble(c, b);
        for(const p of parts){
          if(p.ring){ c.globalAlpha = p.life / 0.4; c.strokeStyle = '#fff7e8'; c.lineWidth = 4; c.beginPath(); c.arc(p.x, p.y, p.r * (1.6 - p.life * 1.5), 0, Math.PI * 2); c.stroke(); }
          else { c.globalAlpha = Math.min(1, p.life / 0.4); if(p.star) star(c, p.x, p.y, p.r * 1.3, p.rot, '#ffd23f'); else { c.fillStyle = p.col; c.beginPath(); c.arc(p.x, p.y, p.r, 0, Math.PI * 2); c.fill(); } }
        }
        c.globalAlpha = 1;
        // Bobo behind the sign
        const jump = mood === 'happy' ? Math.abs(Math.sin(t * 9)) * L.r * 0.2 : 0;
        api.bobo(c, L.bx, L.by - jump, L.r, mood, look, t);
        drawSign(c);
        // HUD
        const ph = Math.max(40, s * 0.1), py = 10 + ph / 2, pw = Math.min(s * 0.3, W / 2 - L.r * 1.2 - 72);
        for(const [x, str] of [[W - 8 - pw / 2, '⭐ ' + api.AR(score)], [64 + pw / 2, api.AR(Math.min(q + 1, N)) + '/' + api.AR(N)]]){
          c.fillStyle = 'rgba(28,24,56,.72)'; c.beginPath(); c.roundRect(x - pw / 2, py - ph / 2, pw, ph, ph / 2); c.fill();
          c.strokeStyle = '#fff7e8'; c.lineWidth = 3; c.stroke(); api.text(c, str, x, py + 1, ph * 0.48, '#fff7e8');
        }
      },
      pointerDown(p){
        if(Math.abs(p.x - api.W / 2) < L.sw / 2 && p.y > L.sy && p.y < L.sy + L.sh){ say(); api.sfx.tap(); signPop = 1; return; }
        let best = null, bd = 1e9;
        for(const b of bubbles){ if(b.gone || b.a < 0.3) continue; const d = Math.hypot(p.x - bx(b), p.y - b.y); if(d < L.br * 1.15 && d < bd){ bd = d; best = b; } }
        if(best) tap(best);
      },
      resize(){ layout(); }
    };
  }
});
