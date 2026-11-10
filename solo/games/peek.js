/* Where's Bobo? A 3×3 garden of holes. Bobo pops up: tap him (+1). Golden Bobo = +3.
   His grumpy grey cousin (a little rain cloud) = −1, don't tap him! Pop-ups get a bit faster. 40 seconds. */
Solo.register({
  id: 'peek', title: L('وين بوبو؟','Where\'s Bobo?','Bobo Nerede?'), emoji: '🕳️', bg: '#5fbf4a',
  help: L('اكبس على بوبو لما يطلع من الجورة، بس لا تكبس على الغيمة الزعلانة!','Tap Bobo when he pops out of the hole, but don\'t tap the grumpy cloud!','Bobo delikten çıkınca ona dokun, ama kızgın buluta dokunma!'),
  create(api){
    const OUT = '#1c1838', LIMIT = 40;
    const holes = [];
    for(let i = 0; i < 9; i++) holes.push({ kind: null, st: 'empty', h: 0, t: 0, up: 1, hitT: 0, shake: 0, wait: 0 });
    const parts = [], floats = [], flowers = [];
    let t = 0, score = 0, spawnT = 0.6, done = false, endT = 0, lastTick = -1, shakeT = 0, goodN = 0;
    const S = () => Math.min(api.W, api.H);
    for(let i = 0; i < 14; i++) flowers.push({ x: Math.random(), y: Math.random(), c: api.pick(['#ff5fa2', '#ffdc3b', '#fff7e8', '#a75cff', '#ff9a1f']), s: 0.7 + Math.random() * 0.6 });
    const goldCv = document.createElement('canvas'), gctx = goldCv.getContext('2d'), maskCv = document.createElement('canvas'), mctx = maskCv.getContext('2d');

    function geo(){
      const W = api.W, H = api.H, top = 76, bottom = H - 24;
      const cw = Math.min(W * 0.31, (bottom - top) / 3 * 1.05, 230), ch = Math.min((bottom - top) / 3, cw * 1.25);
      const gw = cw * 3, gh = ch * 3, x0 = (W - gw) / 2, y0 = top + (bottom - top - gh) / 2;
      return { cw, ch, x0, y0 };
    }
    function holePos(i){ const g = geo(), col = i % 3, row = Math.floor(i / 3); return { x: g.x0 + (col + 0.5) * g.cw, y: g.y0 + row * g.ch + g.ch * 0.78, rx: g.cw * 0.4, ry: g.cw * 0.13, r: g.cw * 0.29, cell: g }; }
    const prog = () => Math.min(1, t / LIMIT);

    function spawn(){
      const free = holes.map((h, i) => h.st === 'empty' && h.wait <= 0 ? i : -1).filter(i => i >= 0);
      const busy = holes.filter(h => h.st !== 'empty').length;
      if(!free.length || busy >= 2 + Math.floor(prog() * 2)) return;
      const i = api.pick(free), h = holes[i], r = Math.random();
      h.kind = r < 0.1 ? 'gold' : r < 0.1 + 0.18 + prog() * 0.1 ? 'grump' : 'bobo';
      h.st = 'rise'; h.h = 0; h.t = 0; h.up = (h.kind === 'gold' ? 0.95 : 1.45) - prog() * 0.55; h.hitT = 0;
      api.tone(h.kind === 'grump' ? 260 : 500, 0.08, 'sine', 0.06, 0, h.kind === 'grump' ? 200 : 800);
    }
    function burst(x, y, gold){
      for(let i = 0; i < (gold ? 16 : 9); i++){ const a = Math.random() * Math.PI * 2, s = S() * api.rand(0.25, 0.6);
        parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - S() * 0.2, age: 0, life: api.rand(0.5, 0.9), col: gold ? api.pick(['#ffd23b', '#fff3a6', '#ffb800']) : api.pick(['#ffdc3b', '#ff5fa2', '#fff7e8', '#7fd8ff']), sz: S() * api.rand(0.018, 0.03) }); }
    }
    function giggle(){ [880, 1046, 932, 1175].forEach((f, k) => api.tone(f, 0.07, 'triangle', 0.09, k * 0.07)); }

    function drawStar(c, x, y, r, col){
      c.fillStyle = col; c.beginPath(); for(let k = 0; k < 10; k++){ const a = -Math.PI / 2 + k * Math.PI / 5, rr = k % 2 ? r * 0.45 : r; c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } c.closePath(); c.fill();
    }
    function drawGrump(c, x, y, r, hit){
      // a grumpy little grey rain cloud with stubby feet
      const lw = Math.max(3, r * 0.1);
      c.save(); c.translate(x, y);
      c.fillStyle = '#9aa0b8'; c.strokeStyle = OUT; c.lineWidth = lw;
      c.beginPath();
      const bumps = [[-0.55, 0.1, 0.45], [-0.25, -0.35, 0.5], [0.25, -0.38, 0.52], [0.58, 0.05, 0.45], [0, 0.25, 0.6]];
      for(const [bx, by, br] of bumps){ c.moveTo(bx * r + br * r, by * r); c.arc(bx * r, by * r, br * r, 0, Math.PI * 2); }
      c.stroke(); c.fill();
      c.fillStyle = '#b9bed2'; c.beginPath(); c.ellipse(-r * 0.2, -r * 0.45, r * 0.25, r * 0.12, -0.3, 0, Math.PI * 2); c.fill();
      // angry eyebrows + eyes
      c.strokeStyle = OUT; c.lineWidth = Math.max(2, r * 0.09); c.lineCap = 'round';
      for(const s of [-1, 1]){
        c.beginPath(); c.moveTo(s * r * 0.48, -r * 0.3); c.lineTo(s * r * 0.12, -r * 0.14); c.stroke();
        c.fillStyle = '#fff'; c.beginPath(); c.arc(s * r * 0.28, 0, r * 0.15, 0, Math.PI * 2); c.fill();
        c.fillStyle = OUT; c.beginPath(); c.arc(s * r * 0.26, r * 0.03, r * 0.08, 0, Math.PI * 2); c.fill();
      }
      c.beginPath(); c.arc(0, r * 0.45, r * 0.18, 1.15 * Math.PI, 1.85 * Math.PI); c.stroke();
      // a tiny lightning bolt / raindrop over its head when grumpy
      if(!hit){ c.fillStyle = '#7fc8ff'; c.strokeStyle = OUT; c.lineWidth = 2; c.beginPath(); const dy = -r * 1.0 + Math.sin(t * 6) * r * 0.05; c.moveTo(r * 0.75, dy - r * 0.15); c.quadraticCurveTo(r * 0.88, dy + r * 0.05, r * 0.75, dy + r * 0.08); c.quadraticCurveTo(r * 0.62, dy + r * 0.05, r * 0.75, dy - r * 0.15); c.fill(); c.stroke(); }
      c.restore();
    }
    function drawGold(c, x, y, r, mood){
      const sz = Math.ceil(r * 4.2), dpr = 2;
      if(goldCv.width !== sz * dpr){ goldCv.width = maskCv.width = sz * dpr; goldCv.height = maskCv.height = sz * dpr; }
      mctx.setTransform(1, 0, 0, 1, 0, 0); mctx.clearRect(0, 0, maskCv.width, maskCv.height);
      mctx.setTransform(dpr, 0, 0, dpr, 0, 0); api.bobo(mctx, sz / 2, sz * 0.55, r, mood, { x: 0, y: 0 }, t);
      gctx.setTransform(1, 0, 0, 1, 0, 0); gctx.globalCompositeOperation = 'source-over'; gctx.clearRect(0, 0, goldCv.width, goldCv.height);
      gctx.drawImage(maskCv, 0, 0);
      gctx.globalCompositeOperation = 'color'; gctx.fillStyle = '#ffc400'; gctx.fillRect(0, 0, goldCv.width, goldCv.height);
      gctx.globalCompositeOperation = 'screen'; gctx.fillStyle = 'rgba(255,210,80,.45)'; gctx.fillRect(0, 0, goldCv.width, goldCv.height);
      gctx.globalCompositeOperation = 'destination-in'; gctx.drawImage(maskCv, 0, 0);
      gctx.globalCompositeOperation = 'source-over';
      c.drawImage(goldCv, x - sz / 2, y - sz * 0.55, sz, sz);
      for(let k = 0; k < 3; k++){ const a = t * 2 + k * 2.1; drawStar(c, x + Math.cos(a) * r * 1.2, y - r * 0.2 + Math.sin(a) * r * 0.9, r * (0.16 + 0.05 * Math.sin(t * 8 + k)), '#fff3a6'); }
    }
    function pill(c, x, y, w, h, fill){ c.fillStyle = fill; c.strokeStyle = OUT; c.lineWidth = 3; c.beginPath(); c.roundRect(x, y, w, h, h / 2); c.fill(); c.stroke(); }

    return {
      _dbg: { holes },
      update(dt){
        t += dt; if(shakeT > 0) shakeT -= dt;
        if(done){ endT += dt; if(endT > 1.2){ endT = -1e9; api.end({ score, msg: score > 0 ? api.L('لقيت بوبو ' + api.AR(goodN) + ' مرة!', 'You found Bobo ' + api.AR(goodN) + (goodN === 1 ? ' time!' : ' times!'), 'Bobo\'yu ' + api.AR(goodN) + ' kez buldun!') : api.L('حلو! جرّب كمان','Nice! Try again','Güzel! Bir daha dene') }); } }
        else {
          spawnT -= dt; if(spawnT <= 0){ spawnT = api.rand(0.75, 1.05) - prog() * 0.4; spawn(); }
          const left = Math.ceil(LIMIT - t);
          if(left <= 5 && left !== lastTick && left > 0){ lastTick = left; api.tone(880, 0.06, 'square', 0.05); }
          if(t >= LIMIT){ done = true; api.sfx.win(); for(const h of holes) if(h.st !== 'empty' && h.st !== 'hit') h.st = 'down'; }
        }
        const sp = 6;
        for(const h of holes){
          if(h.wait > 0) h.wait -= dt;
          if(h.shake > 0) h.shake -= dt;
          if(h.st === 'rise'){ h.h += dt * sp; if(h.h >= 1){ h.h = 1; h.st = 'up'; h.t = 0; } }
          else if(h.st === 'up'){ h.t += dt; if(h.t >= h.up) h.st = 'down'; }
          else if(h.st === 'hit'){ h.hitT += dt; if(h.hitT > 0.45){ h.h -= dt * sp * 0.9; if(h.h <= 0){ h.h = 0; h.st = 'empty'; h.wait = 0.3; } } }
          else if(h.st === 'down'){ h.h -= dt * sp * 0.8; if(h.h <= 0){ h.h = 0; h.st = 'empty'; h.wait = 0.25; } }
        }
        for(const p of parts){ p.age += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += S() * 1.2 * dt; }
        for(let i = parts.length - 1; i >= 0; i--) if(parts[i].age > parts[i].life) parts.splice(i, 1);
        for(const f of floats){ f.age += dt; f.y -= S() * 0.15 * dt; }
        for(let i = floats.length - 1; i >= 0; i--) if(floats[i].age > 0.9) floats.splice(i, 1);
      },
      pointerDown(p){
        if(done) return;
        let best = -1, bd = 1e9;
        holes.forEach((h, i) => {
          if((h.st !== 'rise' && h.st !== 'up' && h.st !== 'down') || h.h < 0.3) return;
          const P = holePos(i), cy = P.y - P.r * 0.5 * h.h;
          const dx = Math.abs(p.x - P.x), dy = p.y - cy;
          if(dx < P.cell.cw * 0.5 && dy > -P.r * 1.9 && dy < P.r * 1.4){ const d = Math.hypot(dx, dy); if(d < bd){ bd = d; best = i; } }
        });
        if(best < 0){ return; }
        const h = holes[best], P = holePos(best), y = P.y - P.r * 1.1;
        h.st = 'hit'; h.hitT = 0;
        if(h.kind === 'grump'){
          score = Math.max(0, score - 1); api.sfx.bad(); h.shake = 0.4; shakeT = 0.25;
          floats.push({ x: P.x, y: y - P.r, str: api.L('لا! ','No! ','Hayır! ') + '−' + api.AR(1), col: '#ffd6d6', age: 0 }); api.say(api.L('لا','No','Hayır'));
        } else {
          const gold = h.kind === 'gold', v = gold ? 3 : 1; score += v; goodN++;
          giggle(); if(gold){ api.sfx.coin(); api.sfx.good(); } else api.sfx.pop();
          burst(P.x, y, gold);
          floats.push({ x: P.x, y: y - P.r, str: gold ? '+' + api.AR(3) + ' ✨' : '+' + api.AR(1), col: gold ? '#ffe066' : '#fff7e8', age: 0 });
          if(goodN % 8 === 0) api.toast(api.pick(api.lang === 'ar' ? ['شاطر!', 'برافو!', 'سريع كتير!'] : api.lang === 'tr' ? ['Süper!', 'Aferin!', 'Çok hızlısın!'] : ['Super!', 'Well done!', 'So fast!']));
        }
      },
      draw(c){
        const W = api.W, H = api.H, s = S();
        c.save();
        if(shakeT > 0) c.translate(Math.sin(t * 80) * 5, 0);
        // garden background
        const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#9fe3ff'); g.addColorStop(0.12, '#c8f0ff'); g.addColorStop(0.13, '#7ad45f'); g.addColorStop(1, '#4fae3c');
        c.fillStyle = g; c.fillRect(-10, 0, W + 20, H);
        c.fillStyle = 'rgba(255,255,255,.12)';
        for(let k = 0; k < 6; k++){ c.beginPath(); c.ellipse(W * (k / 5), H * (0.3 + (k % 3) * 0.22), W * 0.25, H * 0.05, 0, 0, Math.PI * 2); c.fill(); }
        for(const f of flowers){ const fx = f.x * W, fy = H * 0.15 + f.y * H * 0.83, fr = s * 0.016 * f.s;
          c.fillStyle = f.c; for(let k = 0; k < 5; k++){ const a = k / 5 * Math.PI * 2; c.beginPath(); c.arc(fx + Math.cos(a) * fr, fy + Math.sin(a) * fr, fr * 0.75, 0, Math.PI * 2); c.fill(); }
          c.fillStyle = '#ffb800'; c.beginPath(); c.arc(fx, fy, fr * 0.6, 0, Math.PI * 2); c.fill(); }

        holes.forEach((h, i) => {
          const P = holePos(i), lw = Math.max(3, s * 0.01);
          // dirt mound + hole
          c.fillStyle = '#a8703f'; c.strokeStyle = OUT; c.lineWidth = lw;
          c.beginPath(); c.ellipse(P.x, P.y + P.ry * 0.35, P.rx * 1.2, P.ry * 1.9, 0, 0, Math.PI * 2); c.fill(); c.stroke();
          c.fillStyle = '#3b2414'; c.beginPath(); c.ellipse(P.x, P.y, P.rx, P.ry, 0, 0, Math.PI * 2); c.fill(); c.stroke();
          if(h.st !== 'empty' && h.h > 0){
            const e = h.h < 1 ? 1 - Math.pow(1 - h.h, 3) : 1;
            const r = P.r, cy = P.y + r * 1.7 - r * 2.15 * e;
            const sx = h.shake > 0 ? Math.sin(h.shake * 60) * r * 0.12 : 0;
            c.save();
            c.beginPath(); c.rect(P.x - P.cell.cw * 0.5, P.y - P.cell.ch * 1.2, P.cell.cw, P.cell.ch * 1.2); c.ellipse(P.x, P.y, P.rx, P.ry, 0, 0, Math.PI); c.clip();
            const hit = h.st === 'hit';
            if(h.kind === 'grump') drawGrump(c, P.x + sx, cy, r * 0.95, hit);
            else if(h.kind === 'gold') drawGold(c, P.x, cy, r, hit ? 'happy' : 'wow');
            else api.bobo(c, P.x, cy, r, hit ? 'happy' : 'idle', { x: 0, y: 0.3 }, t);
            if(hit && h.kind !== 'grump'){ c.globalAlpha = 0.8; drawStar(c, P.x - r * 0.9, cy - r * 0.9, r * 0.22, '#ffe066'); drawStar(c, P.x + r * 0.95, cy - r * 0.6, r * 0.18, '#ffe066'); c.globalAlpha = 1; }
            c.restore();
            // front lip of the hole
            c.strokeStyle = OUT; c.lineWidth = lw; c.fillStyle = '#a8703f';
            c.beginPath(); c.ellipse(P.x, P.y, P.rx, P.ry, 0, 0, Math.PI); c.ellipse(P.x, P.y + P.ry * 0.35, P.rx * 1.2, P.ry * 1.9, 0, Math.PI * 0.98, Math.PI * 0.02, true); c.closePath(); c.fill();
            c.beginPath(); c.ellipse(P.x, P.y, P.rx, P.ry, 0, 0, Math.PI); c.stroke();
            c.beginPath(); c.ellipse(P.x, P.y + P.ry * 0.35, P.rx * 1.2, P.ry * 1.9, 0, 0, Math.PI); c.stroke();
          }
        });
        for(const p of parts){ c.globalAlpha = Math.min(1, (p.life - p.age) * 3); drawStar(c, p.x, p.y, p.sz, p.col); }
        c.globalAlpha = 1;
        for(const f of floats){ c.save(); c.globalAlpha = Math.min(1, (0.9 - f.age) * 3); api.text(c, f.str, f.x, f.y, s * 0.08, f.col); c.restore(); }
        c.restore();

        const left = Math.max(0, Math.ceil(LIMIT - t)), hurry = left <= 5 && !done, ph = 42, pw = 104;
        pill(c, W / 2 - pw / 2, 12, pw, ph, hurry ? '#ff6b6b' : '#fff7e8');
        api.text(c, '⏰ ' + api.AR(left), W / 2, 12 + ph / 2 + 1, 24 * (hurry ? 1 + Math.abs(Math.sin(t * 6)) * 0.12 : 1), hurry ? '#fff7e8' : OUT);
        pill(c, W - 12 - 96, 12, 96, ph, '#ffcd4d');
        api.text(c, '⭐ ' + api.AR(score), W - 12 - 48, 12 + ph / 2 + 1, 24, OUT);
        if(done) api.text(c, api.L('خلص الوقت! 🎉',"Time's up! 🎉",'Süre bitti! 🎉'), W / 2, H * 0.45, s * 0.1, '#fff7e8');
      },
      resize(){}
    };
  }
});
