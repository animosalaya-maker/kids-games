/* Bobo's maths: counting, then adding and taking away with pictures. Numbers up to 10, 3 big answer cards. 10 questions. */
Solo.register({
  id: 'math', title: 'حساب بوبو', emoji: '➕', bg: '#ffb020',
  help: 'عدّ الصور واختار الرقم الصح',
  create(api){
    const OUT = '#1c1838', N = 10;
    const THINGS = [
      { e: '🍎', w: 'تفاحة' }, { e: '🍌', w: 'موزة' }, { e: '🍓', w: 'فراولة' }, { e: '⭐', w: 'نجمة' },
      { e: '🐟', w: 'سمكة' }, { e: '🎈', w: 'بالون' }, { e: '🐥', w: 'صوص' }, { e: '🍪', w: 'بسكوتة' },
      { e: '🌸', w: 'وردة' }, { e: '🚗', w: 'سيارة' }, { e: '🦋', w: 'فراشة' }, { e: '🍩', w: 'دونات' }
    ];
    const BTN = ['#ff5d8f', '#4fb3ff', '#7ed957'];
    const R = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
    // plan: kind + ranges, gets harder slowly
    const PLAN = ['count5', 'count7', 'add6', 'count10', 'add6', 'add8', 'sub6', 'add10', 'sub8', 'sub10'];
    let q = -1, Q = null, first = true, score = 0, t = 0, qt = 0, mood = 'idle', moodT = 0, nextT = -1, parts = [], look = { x: 0, y: 0 };
    let L = {}, btns = [];
    const S = () => Math.min(api.W, api.H);
    const lw = () => Math.max(3, S() * 0.011);

    function make(kind){
      const th = api.pick(THINGS);
      let a, b = 0, ans, type;
      if(kind.startsWith('count')){ type = 'count'; a = R(kind === 'count5' ? 2 : kind === 'count7' ? 3 : 5, +kind.slice(5)); ans = a; }
      else if(kind.startsWith('add')){ type = 'add'; const mx = +kind.slice(3); ans = R(3, mx); a = R(1, ans - 1); b = ans - a; }
      else { type = 'sub'; const mx = +kind.slice(3); a = R(3, mx); b = R(1, a - 1); ans = a - b; }
      const opts = [ans], near = api.shuffle([ans - 1, ans + 1, ans - 2, ans + 2, ans + 3, ans - 3]).filter(n => n >= 0 && n <= 10);
      for(const n of near){ if(opts.length >= 3) break; if(!opts.includes(n)) opts.push(n); }
      return { type, th, a, b, ans, opts: api.shuffle(opts) };
    }
    function next(){
      q++; first = true; nextT = -1; qt = 0;
      if(q >= N){ api.end({ score, win: true, msg: 'بطل الحساب! 🧮' }); return; }
      Q = make(PLAN[q]);
      btns = Q.opts.map((n, i) => ({ n, col: BTN[i], wob: 0, wrong: false, ok: false, press: 0, pop: 0 }));
      layout(); api.sfx.swoosh();
      api.say(Q.type === 'count' ? 'كم ' + Q.th.w + '؟' : Q.type === 'add' ? Q.a + ' زائد ' + Q.b + '؟' : Q.a + ' ناقص ' + Q.b + '؟');
    }
    function grid(n, x, y, w, h){
      if(n <= 0) return { pts: [], size: 0 };
      let best = null;
      for(let cols = 1; cols <= n; cols++){
        const rows = Math.ceil(n / cols), size = Math.min(w / cols, h / rows), sc = size * (rows > cols + 1 ? 0.8 : 1);
        if(!best || sc > best.sc) best = { cols, rows, size, sc };
      }
      const { cols, rows, size } = best, pts = [];
      for(let i = 0; i < n; i++){
        const r = Math.floor(i / cols), inRow = Math.min(cols, n - r * cols), cIdx = i % cols;
        pts.push({ x: x + w / 2 + (inRow / 2 - cIdx - 0.5) * size, y: y + h / 2 + (r - (rows - 1) / 2) * size });   // RTL: first item on the right
      }
      return { pts, size: Math.min(size * 0.8, S() * 0.26) };
    }
    function layout(){
      const W = api.W, H = api.H, s = S();
      L.r = s * 0.075; L.bx = W / 2; L.by = 12 + L.r * 1.8;
      L.qy = L.by + L.r * 1.05 + s * 0.08;                 // question line
      const bw = Math.min((W - s * 0.12) / 3 - s * 0.04, s * 0.3, H * 0.15), bh = bw * 1.05, gap = s * 0.04;
      const by = H - s * 0.06 - bh / 2;
      btns.forEach((b, i) => { b.w = bw; b.h = bh; b.x = W / 2 + (1 - i) * (bw + gap); b.y = by; });
      const top = L.qy + s * 0.08, bottom = by - bh / 2 - s * 0.05;
      L.panel = { x: s * 0.05, y: top, w: W - s * 0.1, h: bottom - top };
      if(!Q) return;
      const P = L.panel, pad = s * 0.04;
      if(Q.type === 'add'){
        const gw = (P.w - pad * 2 - s * 0.12) / 2;
        L.g1 = grid(Q.a, P.x + P.w - pad - gw, P.y + pad, gw, P.h - pad * 2);
        L.g2 = grid(Q.b, P.x + pad, P.y + pad, gw, P.h - pad * 2);
        L.g2.size = L.g1.size = Math.min(L.g1.size, L.g2.size);
        L.boxes = [[P.x + P.w - pad * 0.5 - gw - pad * 0.5, gw + pad], [P.x + pad * 0.5, gw + pad]];
      } else {
        L.g1 = grid(Q.a, P.x + pad, P.y + pad, P.w - pad * 2, P.h - pad * 2); L.g2 = null;
      }
    }
    function burst(x, y){
      for(let i = 0; i < 20; i++){
        const a = Math.random() * Math.PI * 2, v = S() * (0.2 + Math.random() * 0.4);
        parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - S() * 0.2, life: 0.8 + Math.random() * 0.5, r: S() * (0.014 + Math.random() * 0.016), rot: Math.random() * 6, col: api.pick(['#ffd23f', '#fff7e8', '#ff5d8f', '#7ed957']) });
      }
    }
    function star(c, x, y, r, rot, col){
      c.save(); c.translate(x, y); c.rotate(rot); c.beginPath();
      for(let k = 0; k < 10; k++){ const a = -Math.PI / 2 + k * Math.PI / 5, rr = k % 2 ? r * 0.45 : r; c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
      c.closePath(); c.fillStyle = col; c.fill(); c.strokeStyle = OUT; c.lineWidth = Math.max(1.5, r * 0.2); c.stroke(); c.restore();
    }
    function answer(b){
      if(nextT >= 0 || b.wrong) return;
      b.press = 1;
      if(b.n === Q.ans){
        b.ok = true; b.pop = 1; api.sfx.coin(); api.sfx.good(); burst(b.x, b.y - b.h * 0.3);
        if(first) score += 10;
        mood = 'happy'; moodT = 1.4; nextT = 0;
        api.toast(first ? api.pick(['برافو! ⭐', 'شاطر! 🌟', 'صح! 🎉']) : 'صح! 👍', 900);
        api.say(String(Q.ans));
      } else {
        b.wrong = true; b.wob = 1; first = false; api.sfx.bad(); mood = 'sad'; moodT = 0.6;
        api.toast('جرّب كمان 🙂', 800);
      }
    }

    function drawBg(c){
      const W = api.W, H = api.H, g = c.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, '#ffd77a'); g.addColorStop(1, '#ffa412'); c.fillStyle = g; c.fillRect(0, 0, W, H);
      c.fillStyle = 'rgba(255,255,255,.18)'; const step = S() * 0.16;
      const sym = ['+', '٣', '−', '٥', '٢', '+', '٧', '١'];
      c.save(); c.font = '900 ' + Math.round(step * 0.5) + 'px ' + api.FONT; c.textAlign = 'center'; c.textBaseline = 'middle';
      let k = 0;
      for(let y = step * 0.5; y < H + step; y += step) for(let x = (Math.floor(y / step) % 2) * step / 2; x < W + step; x += step){
        c.fillText(sym[k++ % sym.length], x, y + Math.sin(t + x * 0.01) * 4);
      }
      c.restore();
    }
    function rr(c, x, y, w, h, r, fill){
      c.fillStyle = 'rgba(28,24,56,.25)'; c.beginPath(); c.roundRect(x + 3, y + 6, w, h, r); c.fill();
      c.fillStyle = fill; c.strokeStyle = OUT; c.lineWidth = lw(); c.beginPath(); c.roundRect(x, y, w, h, r); c.fill(); c.stroke();
    }
    function drawQuestion(c){
      const s = S(), y = L.qy, size = s * 0.1;
      if(Q.type === 'count'){
        const w = Math.min(api.W * 0.8, s * 0.75), h = size * 1.35;
        rr(c, api.W / 2 - w / 2, y - h / 2, w, h, h / 2, '#fff7e8');
        api.text(c, 'كم ' + Q.th.w + '؟', api.W / 2 + size * 0.5, y, size * 0.7, OUT, 800);
        api.emoji(c, Q.th.e, api.W / 2 - w / 2 + h * 0.65, y, size * 0.75);
        return;
      }
      // tokens laid out right-to-left: a  op  b  =  ?
      const solved = nextT >= 0;
      const toks = [api.AR(Q.a), Q.type === 'add' ? '+' : '−', api.AR(Q.b), '=', solved ? api.AR(Q.ans) : '؟'];
      const tw = size * 0.95, total = tw * toks.length;
      const w = total + size * 0.6, h = size * 1.35;
      rr(c, api.W / 2 - w / 2, y - h / 2, w, h, h / 2, '#fff7e8');
      toks.forEach((tk, i) => {
        const x = api.W / 2 + total / 2 - tw * (i + 0.5);
        if(i === 4){
          const bs = solved ? 1 + Math.sin(Math.min(1, nextT * 3) * Math.PI) * 0.25 : 1 + Math.sin(t * 5) * 0.06;
          c.save(); c.translate(x, y); c.scale(bs, bs);
          c.fillStyle = solved ? '#7ed957' : '#ffd23f'; c.strokeStyle = OUT; c.lineWidth = Math.max(2, lw() * 0.8);
          c.beginPath(); c.roundRect(-tw * 0.42, -size * 0.52, tw * 0.84, size * 1.04, size * 0.2); c.fill(); c.stroke();
          api.text(c, tk, 0, size * 0.04, size * 0.8, solved ? '#fff7e8' : OUT); c.restore();
        } else api.text(c, tk, x, y + size * 0.04, size * (i % 2 ? 0.75 : 0.85), i % 2 ? '#ff5d8f' : OUT);
      });
    }
    function drawItems(c, g, from, cross, delay){
      g.pts.forEach((p, i) => {
        const k = api.clamp((qt - delay - i * 0.08) * 4, 0, 1);
        if(k <= 0) return;
        const sc = k < 1 ? 1 - Math.pow(1 - k, 3) * Math.cos(k * 7) : 1;
        const bob = Math.sin(t * 3 + i) * g.size * 0.03;
        const crossed = cross && i >= g.pts.length - cross;
        const ck = crossed ? api.clamp((qt - 0.9 - (i - (g.pts.length - cross)) * 0.25) * 4, 0, 1) : 0;
        c.save(); c.globalAlpha = 1 - ck * 0.55; c.fillStyle = "#000";
        api.emoji(c, Q.th.e, p.x, p.y + bob, g.size * sc * (1 - ck * 0.15));
        c.restore();
        if(ck > 0){
          const d = g.size * 0.38 * ck;
          c.strokeStyle = '#fff7e8'; c.lineCap = 'round'; c.lineWidth = Math.max(5, g.size * 0.16);
          c.beginPath(); c.moveTo(p.x - d, p.y - d); c.lineTo(p.x + d, p.y + d); c.moveTo(p.x + d, p.y - d); c.lineTo(p.x - d, p.y + d); c.stroke();
          c.strokeStyle = '#ff3b5c'; c.lineWidth = Math.max(3, g.size * 0.09); c.stroke();
        }
        if(nextT >= 0 && (Q.type === 'count')){
          const nk = api.clamp((nextT - i * 0.12) * 5, 0, 1);
          if(nk > 0) api.text(c, api.AR(from + i + 1), p.x, p.y - g.size * 0.55, g.size * 0.42 * nk, '#fff7e8');
        }
      });
    }
    function drawBtn(c, b){
      const press = 1 - Math.sin(b.press * Math.PI) * 0.08, pop = 1 + Math.sin(b.pop * Math.PI) * 0.2;
      const wob = Math.sin(b.wob * 24) * b.wob * b.w * 0.08;
      c.save(); c.translate(b.x + wob, b.y); c.scale(press * pop, press * pop);
      const col = b.wrong ? '#c9c3d6' : b.ok ? '#7ed957' : b.col;
      c.fillStyle = 'rgba(28,24,56,.3)'; c.beginPath(); c.roundRect(-b.w / 2, -b.h / 2 + 8, b.w, b.h, b.w * 0.2); c.fill();
      c.fillStyle = col; c.strokeStyle = OUT; c.lineWidth = lw(); c.beginPath(); c.roundRect(-b.w / 2, -b.h / 2, b.w, b.h, b.w * 0.2); c.fill(); c.stroke();
      c.fillStyle = 'rgba(255,255,255,.3)'; c.beginPath(); c.roundRect(-b.w / 2 + b.w * 0.1, -b.h / 2 + b.h * 0.08, b.w * 0.8, b.h * 0.18, b.h * 0.09); c.fill();
      api.text(c, api.AR(b.n), 0, b.h * 0.05, b.h * 0.62, '#fff7e8');
      c.restore();
    }

    layout(); next();
    return {
      debug: { get q(){ return q; }, get score(){ return score; }, get ans(){ return Q && Q.ans; }, get busy(){ return nextT >= 0; },
        get btns(){ return btns.map(b => ({ n: b.n, x: b.x, y: b.y, w: b.w, h: b.h })); } },
      update(dt){
        t += dt; qt += dt;
        for(const b of btns){ b.wob = Math.max(0, b.wob - dt * 2); b.press = Math.max(0, b.press - dt * 5); b.pop = Math.max(0, b.pop - dt * 2.5); }
        if(moodT > 0){ moodT -= dt; if(moodT <= 0) mood = 'idle'; }
        look = { x: Math.sin(t * 0.8) * 0.4, y: 0.8 };
        for(const p of parts){ p.x += p.vx * dt; p.y += p.vy * dt; p.vy += S() * 0.8 * dt; p.rot += dt * 5; p.life -= dt; }
        parts = parts.filter(p => p.life > 0);
        if(nextT >= 0){ nextT += dt; const wait = Q.type === 'count' ? Math.max(1.5, Q.a * 0.12 + 0.9) : 1.5; if(nextT > wait) next(); }
      },
      draw(c){
        const W = api.W, s = S();
        drawBg(c);
        // Bobo + HUD
        const jump = mood === 'happy' ? Math.abs(Math.sin(t * 9)) * L.r * 0.3 : 0;
        api.bobo(c, L.bx, L.by - jump, L.r, mood, look, t);
        const ph = Math.max(40, s * 0.1), py = 10 + ph / 2, pw = Math.min(s * 0.3, W / 2 - L.r * 1.3 - 72);
        for(const [x, str] of [[W - 8 - pw / 2, '⭐ ' + api.AR(score)], [64 + pw / 2, api.AR(Math.min(q + 1, N)) + '/' + api.AR(N)]]){
          c.fillStyle = 'rgba(28,24,56,.72)'; c.beginPath(); c.roundRect(x - pw / 2, py - ph / 2, pw, ph, ph / 2); c.fill();
          c.strokeStyle = '#fff7e8'; c.lineWidth = 3; c.stroke(); api.text(c, str, x, py + 1, ph * 0.48, '#fff7e8');
        }
        if(!Q) return;
        drawQuestion(c);
        const P = L.panel;
        rr(c, P.x, P.y, P.w, P.h, s * 0.06, 'rgba(255,247,232,.92)');
        if(Q.type === 'add'){
          c.fillStyle = 'rgba(255,176,32,.16)';
          for(const [bx, bw] of L.boxes){ c.beginPath(); c.roundRect(bx, P.y + s * 0.025, bw, P.h - s * 0.05, s * 0.05); c.fill(); }
          drawItems(c, L.g1, 0, 0, 0);
          drawItems(c, L.g2, Q.a, 0, 0.1 + Q.a * 0.08);
          const mx = P.x + P.w / 2, my = P.y + P.h / 2, pr = s * 0.055;
          c.fillStyle = '#ff5d8f'; c.strokeStyle = OUT; c.lineWidth = lw(); c.beginPath(); c.arc(mx, my, pr, 0, Math.PI * 2); c.fill(); c.stroke();
          api.text(c, '+', mx, my + pr * 0.08, pr * 1.6, '#fff7e8');
        } else drawItems(c, L.g1, 0, Q.type === 'sub' ? Q.b : 0, 0);
        for(const b of btns) drawBtn(c, b);
        for(const p of parts){ c.globalAlpha = Math.min(1, p.life / 0.4); star(c, p.x, p.y, p.r * 1.3, p.rot, p.col); }
        c.globalAlpha = 1;
      },
      pointerDown(p){
        for(const b of btns){ if(Math.abs(p.x - b.x) < b.w / 2 + 6 && Math.abs(p.y - b.y) < b.h / 2 + 6){ answer(b); return; } }
      },
      resize(){ layout(); }
    };
  }
});
