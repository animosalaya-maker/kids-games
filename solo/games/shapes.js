/* Shape sorter: drag each piece from the tray onto the hole with the same shape.
   Right hole = snaps in with sparkles; wrong hole = bounces back. 6 levels (more shapes, rotated, similar colours).
   Score = levels done ×10 − mistakes (min 0). */
Solo.register({
  id: 'shapes', title: L('الأشكال','Shapes','Şekiller'), emoji: '🔺', bg: '#9b6bff',
  help: L('اسحب كل شكل وحطّه بالجورة اللي بتشبهه!','Drag each shape into the hole that matches it!','Her şekli kendi deliğine sürükle!'),
  create(api){
    const OUT = '#1c1838';
    const NAMES = api.lang === 'ar' ? { circle: 'دائرة', square: 'مربع', triangle: 'مثلث', star: 'نجمة', heart: 'قلب' }
      : api.lang === 'tr' ? { circle: 'Daire', square: 'Kare', triangle: 'Üçgen', star: 'Yıldız', heart: 'Kalp' }
      : { circle: 'Circle', square: 'Square', triangle: 'Triangle', star: 'Star', heart: 'Heart' };
    const BRIGHT = ['#ff4f6d', '#3d8bff', '#ffcc2e', '#3fd45a', '#ff9a1f'];
    const SIMILAR = [['#3d8bff', '#4fa0ff', '#3577e6', '#5a8cff'], ['#ff5f8f', '#ff6f6f', '#ff7aa8', '#f2557a']];
    const LEVELS = [
      { kinds: ['circle', 'square', 'triangle'], rot: false, sim: -1 },
      { kinds: ['star', 'heart', 'circle'], rot: false, sim: -1 },
      { kinds: ['circle', 'square', 'triangle', 'star'], rot: false, sim: -1 },
      { kinds: ['heart', 'star', 'square', 'triangle'], rot: true, sim: -1 },
      { kinds: ['circle', 'triangle', 'star', 'heart'], rot: true, sim: 0 },
      { kinds: ['square', 'heart', 'star', 'triangle'], rot: true, sim: 1 }
    ];
    let level = 0, mistakes = 0, holes = [], pieces = [], drag = null, state = 'play', stateT = 0, t = 0;
    let mood = 'idle', moodT = 0, levelStartMistakes = 0;
    const parts = [];
    const S = () => Math.min(api.W, api.H);

    function layout(){
      const W = api.W, H = api.H, n = LEVELS[level].kinds.length;
      const cols = n === 4 && W < 560 ? 2 : n, rows = Math.ceil(n / cols);
      const top = 70, avail = H - top - 14, half = avail / 2;
      const R = Math.min(W / (cols * 2.45), half / (rows * 2.6), 82);
      const board = { x: 14, y: top, w: W - 28, h: half - 8 };
      const tray = { x: 14, y: top + half + 4, w: W - 28, h: half - 4 };
      const slot = (area, i) => {
        const cx = i % cols, cy = Math.floor(i / cols), gw = area.w / cols, gh = area.h / rows;
        return { x: area.x + gw * (cx + 0.5), y: area.y + gh * (cy + 0.5) + (area === tray ? R * 0.1 : 0) };
      };
      return { R, board, tray, slot, cols, rows };
    }
    function setup(){
      const L = LEVELS[level], n = L.kinds.length;
      const cols = L.sim >= 0 ? api.shuffle(SIMILAR[L.sim]) : api.shuffle(BRIGHT);
      holes = L.kinds.map((k, i) => ({ kind: k, col: cols[i % cols.length], slot: i, rot: L.rot && k !== 'circle' ? api.rand(-0.8, 0.8) : 0, filled: false, shake: 0, glow: 0 }));
      let tray = api.shuffle(L.kinds.map((_, i) => i));
      if(n > 1){ for(let tries = 0; tries < 20 && tray.some((h, i) => h === i); tries++) tray = api.shuffle(tray); }
      pieces = tray.map((h, i) => ({ hole: h, kind: L.kinds[h], col: holes[h].col, slot: i, x: 0, y: 0, rot: L.rot && L.kinds[h] !== 'circle' ? api.rand(-1, 1) : 0, placed: false, home: true, scale: 0, pop: 0 }));
      const g = layout();
      for(const p of pieces){ const s = g.slot(g.tray, p.slot); p.x = s.x; p.y = s.y; }
      levelStartMistakes = mistakes; state = 'play'; stateT = 0;
    }
    function homePos(p){ const g = layout(); return g.slot(g.tray, p.slot); }
    function holePos(h){ const g = layout(); return g.slot(g.board, h.slot); }

    function shapePath(c, kind, r){
      c.beginPath();
      if(kind === 'circle') c.arc(0, 0, r * 0.92, 0, Math.PI * 2);
      else if(kind === 'square') c.roundRect(-r * 0.82, -r * 0.82, r * 1.64, r * 1.64, r * 0.16);
      else if(kind === 'triangle'){ const k = r * 1.02; c.moveTo(0, -k); c.lineTo(k * 0.98, k * 0.72); c.lineTo(-k * 0.98, k * 0.72); c.closePath(); }
      else if(kind === 'star'){ for(let i = 0; i < 10; i++){ const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.46 : r * 1.02; c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } c.closePath(); }
      else if(kind === 'heart'){ const k = r * 0.98; c.moveTo(0, k * 0.85); c.bezierCurveTo(-k * 1.25, k * 0.05, -k * 0.95, -k * 0.95, 0, -k * 0.42); c.bezierCurveTo(k * 0.95, -k * 0.95, k * 1.25, k * 0.05, 0, k * 0.85); c.closePath(); }
    }
    function shade(hex, f){ const n = parseInt(hex.slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255, m = v => Math.round(f < 0 ? v * (1 + f) : v + (255 - v) * f); return 'rgb(' + m(r) + ',' + m(g) + ',' + m(b) + ')'; }
    function drawHole(c, h, R){
      const P = holePos(h), sx = h.shake > 0 ? Math.sin(h.shake * 50) * R * 0.08 : 0;
      c.save(); c.translate(P.x + sx, P.y); c.rotate(h.rot);
      shapePath(c, h.kind, R); c.fillStyle = '#54408f'; c.fill();
      c.save(); shapePath(c, h.kind, R); c.clip(); c.fillStyle = 'rgba(0,0,0,.28)'; c.translate(R * 0.08, R * 0.12); shapePath(c, h.kind, R); c.fill(); c.restore();
      c.lineJoin = 'round'; c.strokeStyle = OUT; c.lineWidth = Math.max(8, R * 0.2); shapePath(c, h.kind, R); c.stroke();
      c.strokeStyle = h.col; c.lineWidth = Math.max(5, R * 0.12); c.stroke();
      if(h.glow > 0){ c.strokeStyle = 'rgba(255,255,255,' + h.glow + ')'; c.lineWidth = R * 0.3 * h.glow; c.stroke(); }
      c.restore();
    }
    function drawPiece(c, p, R){
      const sc = p.scale * (drag && drag.p === p ? 1.12 : 1) * (1 + Math.sin(p.pop * Math.PI) * 0.18), r = R * 0.9;
      c.save(); c.translate(p.x, p.y); c.rotate(p.rot); c.scale(sc, sc);
      if(drag && drag.p === p){ c.save(); c.translate(R * 0.12, R * 0.22); shapePath(c, p.kind, r); c.fillStyle = 'rgba(0,0,0,.22)'; c.fill(); c.restore(); }
      c.lineJoin = 'round'; shapePath(c, p.kind, r); c.fillStyle = p.col; c.fill();
      c.save(); shapePath(c, p.kind, r); c.clip(); c.fillStyle = shade(p.col, -0.2); c.translate(r * 0.1, r * 0.14); c.beginPath(); c.rect(-r * 2, r * 0.45, r * 4, r * 2); c.fill(); c.restore();
      c.strokeStyle = OUT; c.lineWidth = Math.max(4, R * 0.09); shapePath(c, p.kind, r); c.stroke();
      c.fillStyle = 'rgba(255,255,255,.5)'; c.beginPath(); c.ellipse(-r * 0.3, -r * 0.35, r * 0.18, r * 0.09, -0.6, 0, Math.PI * 2); c.fill();
      // cute face (stays upright-ish)
      c.rotate(-p.rot * 0.5);
      const fy = p.kind === 'triangle' ? r * 0.2 : p.kind === 'heart' ? -r * 0.05 : 0, er = r * 0.11, ex = r * 0.24;
      for(const s of [-1, 1]){ c.fillStyle = '#fff'; c.beginPath(); c.arc(s * ex, fy - r * 0.08, er, 0, Math.PI * 2); c.fill(); c.fillStyle = OUT; c.beginPath(); c.arc(s * ex, fy - r * 0.06, er * 0.55, 0, Math.PI * 2); c.fill(); }
      c.strokeStyle = OUT; c.lineWidth = Math.max(2, r * 0.07); c.lineCap = 'round'; c.beginPath();
      if(p.placed || (drag && drag.p === p)) c.arc(0, fy + r * 0.1, r * 0.14, 0.1 * Math.PI, 0.9 * Math.PI); else c.arc(0, fy + r * 0.08, r * 0.1, 0.2 * Math.PI, 0.8 * Math.PI);
      c.stroke();
      c.restore();
    }
    function sparkle(x, y, col, k){ for(let i = 0; i < k; i++){ const a = Math.random() * Math.PI * 2, s = S() * api.rand(0.2, 0.6); parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - S() * 0.15, age: 0, life: api.rand(0.5, 1), col: i % 2 ? col : api.pick(['#fff7e8', '#ffe066']), sz: S() * api.rand(0.015, 0.03) }); } }
    function star(c, x, y, r){ c.beginPath(); for(let k = 0; k < 10; k++){ const a = -Math.PI / 2 + k * Math.PI / 5, rr = k % 2 ? r * 0.45 : r; c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } c.closePath(); c.fill(); }

    function drop(p){
      const g = layout(); let best = null, bd = 1e9;
      for(const h of holes){ const P = holePos(h), d = Math.hypot(P.x - p.x, P.y - p.y); if(d < g.R * 1.15 && d < bd){ bd = d; best = h; } }
      if(!best){ p.home = true; api.sfx.tap(); return; }
      if(best.kind === p.kind && !best.filled){
        best.filled = true; best.glow = 1; p.placed = true; p.home = false; p.target = best; p.pop = 0.001;
        api.sfx.good(); api.tone(1318, 0.12, 'triangle', 0.08, 0.12); const P = holePos(best); sparkle(P.x, P.y, p.col, 18);
        mood = 'happy'; moodT = 1; api.say(NAMES[p.kind]);
        if(holes.every(h => h.filled)){ state = 'done'; stateT = 0; api.sfx.coin(); const g2 = layout(); sparkle(api.W / 2, g2.board.y + g2.board.h / 2, '#ffe066', 30); }
      } else {
        mistakes++; best.shake = 0.4; p.home = true; api.sfx.bad(); mood = 'sad'; moodT = 0.8;
        api.toast(best.filled ? api.L('هيدي مليانة!','That one is full!','Orası dolu!') : api.L('مش هون! 🙈','Not here! 🙈','Burası değil! 🙈'), 900);
      }
    }

    setup();
    api.say(api.L('حطّ كل شكل بمكانه','Put each shape in its place','Her şekli yerine koy'));

    return {
      _dbg: { get holes(){ return holes.map(h => Object.assign({ kind: h.kind, filled: h.filled }, holePos(h))); }, get pieces(){ return pieces.map(p => ({ kind: p.kind, x: p.x, y: p.y, placed: p.placed })); }, get level(){ return level; }, get mistakes(){ return mistakes; }, get state(){ return state; } },
      update(dt){
        t += dt; stateT += dt; if(moodT > 0){ moodT -= dt; if(moodT <= 0) mood = 'idle'; }
        for(const h of holes){ if(h.shake > 0) h.shake -= dt; if(h.glow > 0) h.glow = Math.max(0, h.glow - dt * 1.5); }
        for(const p of pieces){
          p.scale = Math.min(1, p.scale + dt * 4);
          if(p.pop > 0){ p.pop += dt * 3; if(p.pop >= 1) p.pop = 0; }
          if(drag && drag.p === p) continue;
          let tx, ty, tr = p.rot;
          if(p.placed){ const P = holePos(p.target); tx = P.x; ty = P.y; tr = p.target.rot; }
          else { const P = homePos(p); tx = P.x; ty = P.y; }
          const k = Math.min(1, dt * (p.placed ? 16 : 10)); p.x += (tx - p.x) * k; p.y += (ty - p.y) * k; p.rot += (tr - p.rot) * k;
        }
        if(state === 'done' && stateT > 1.6){
          if(level < LEVELS.length - 1){ level++; setup(); api.sfx.jump(); api.toast(api.L('المرحلة ','Level ','Seviye ') + api.AR(level + 1), 1200); }
          else { state = 'end'; const score = Math.max(0, LEVELS.length * 10 - mistakes); api.end({ score, win: true, msg: mistakes === 0 ? api.L('ولا غلطة! برافو','No mistakes! Well done','Hiç hata yok! Aferin') : api.L('برافو! خلصت كل الأشكال','Well done! You did all the shapes','Aferin! Bütün şekilleri bitirdin') }); }
        }
        for(const q of parts){ q.age += dt; q.x += q.vx * dt; q.y += q.vy * dt; q.vy += S() * 1.1 * dt; }
        for(let i = parts.length - 1; i >= 0; i--) if(parts[i].age > parts[i].life) parts.splice(i, 1);
      },
      pointerDown(pt){
        if(state !== 'play' || drag) return;
        const g = layout(); let best = null, bd = 1e9;
        for(const p of pieces){ if(p.placed) continue; const d = Math.hypot(pt.x - p.x, pt.y - p.y); if(d < g.R * 1.25 && d < bd){ bd = d; best = p; } }
        if(!best) return;
        drag = { p: best, id: pt.id, ox: best.x - pt.x, oy: best.y - pt.y };
        pieces.splice(pieces.indexOf(best), 1); pieces.push(best);   // draw on top
        api.sfx.tap();
      },
      pointerMove(pt){ if(!drag || drag.id !== pt.id) return; drag.p.x = pt.x + drag.ox; drag.p.y = pt.y + drag.oy; },
      pointerUp(pt){ if(!drag || drag.id !== pt.id) return; const p = drag.p; p.x = pt.x + drag.ox; p.y = pt.y + drag.oy; drag = null; drop(p); },
      draw(c){
        const W = api.W, H = api.H, s = S(), g = layout(), R = g.R;
        const bg = c.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#b394ff'); bg.addColorStop(1, '#8a5cf0'); c.fillStyle = bg; c.fillRect(0, 0, W, H);
        c.fillStyle = 'rgba(255,255,255,.08)'; for(let i = 0; i < 12; i++){ c.save(); c.translate((i * 97) % W, (i * 173) % H); c.rotate(i); shapePath(c, ['circle', 'square', 'triangle', 'star', 'heart'][i % 5], s * 0.06); c.fill(); c.restore(); }
        // board
        c.fillStyle = '#ffd98a'; c.strokeStyle = OUT; c.lineWidth = 5;
        c.beginPath(); c.roundRect(g.board.x, g.board.y, g.board.w, g.board.h, 24); c.fill(); c.stroke();
        c.strokeStyle = 'rgba(196,130,40,.35)'; c.lineWidth = 3;
        for(let y = g.board.y + 22; y < g.board.y + g.board.h - 10; y += 26){ c.beginPath(); c.moveTo(g.board.x + 14, y); c.quadraticCurveTo(g.board.x + g.board.w / 2, y + 6, g.board.x + g.board.w - 14, y); c.stroke(); }
        for(const h of holes) drawHole(c, h, R);
        // tray
        c.fillStyle = 'rgba(28,24,56,.28)'; c.strokeStyle = OUT; c.lineWidth = 4;
        c.beginPath(); c.roundRect(g.tray.x, g.tray.y, g.tray.w, g.tray.h, 24); c.fill(); c.stroke();
        for(const p of pieces){ if(p.placed) continue; const P = homePos(p); c.fillStyle = 'rgba(255,255,255,.12)'; c.beginPath(); c.ellipse(P.x, P.y + R * 0.95, R * 0.8, R * 0.18, 0, 0, Math.PI * 2); c.fill(); }
        // placed pieces first, then tray pieces, dragged one last
        for(const p of pieces) if(p.placed) drawPiece(c, p, R);
        for(const p of pieces) if(!p.placed && !(drag && drag.p === p)) drawPiece(c, p, R);
        if(drag) drawPiece(c, drag.p, R);
        for(const q of parts){ c.globalAlpha = Math.min(1, (q.life - q.age) * 3); c.fillStyle = q.col; star(c, q.x, q.y, q.sz); }
        c.globalAlpha = 1;
        // HUD: level dots + Bobo
        const ph = 42, dw = 22 * LEVELS.length + 22;
        c.fillStyle = '#fff7e8'; c.strokeStyle = OUT; c.lineWidth = 3; c.beginPath(); c.roundRect(W / 2 - dw / 2, 12, dw, ph, ph / 2); c.fill(); c.stroke();
        for(let i = 0; i < LEVELS.length; i++){
          const x = api.dir === 'rtl' ? W / 2 + dw / 2 - 22 - i * 22 : W / 2 - dw / 2 + 22 + i * 22, done = i < level || (i === level && state !== 'play');   // first level on the right in RTL, on the left in LTR
          c.fillStyle = done ? '#ffcd2a' : i === level ? '#b394ff' : '#e4dcf7'; c.strokeStyle = OUT; c.lineWidth = 2;
          c.beginPath(); c.arc(x, 12 + ph / 2, i === level ? 8 : 6.5, 0, Math.PI * 2); c.fill(); c.stroke();
        }
        const br = 22;
        api.bobo(c, W - 12 - br * 1.2, 12 + ph / 2 + 2 - (mood === 'happy' ? Math.abs(Math.sin(t * 10)) * 5 : 0), br, mood === 'idle' ? 'idle' : mood, drag ? { x: -0.5, y: 0.6 } : { x: 0, y: 0.4 }, t);
        if(state === 'done'){
          const z = Math.min(1, stateT * 4);
          c.save(); c.translate(W / 2, g.board.y + g.board.h / 2); c.scale(0.5 + z * 0.5, 0.5 + z * 0.5);
          api.text(c, level === LEVELS.length - 1 ? api.L('خلصتها كلها! 🏆','All done! 🏆','Hepsi bitti! 🏆') : (mistakes === levelStartMistakes ? api.L('ولا غلطة! ⭐','No mistakes! ⭐','Hiç hata yok! ⭐') : api.L('برافو! ⭐','Well done! ⭐','Aferin! ⭐')), 0, 0, Math.min(s * 0.1, W * 0.085), '#fff7e8'); c.restore();
        }
      },
      resize(){}
    };
  }
});
