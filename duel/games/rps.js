/* Rock paper scissors. Each kid picks secretly with 3 big buttons, then 3-2-1 and the hands meet in the middle. First to 3 points wins. */
Duel.register({
  id: 'rps', title: 'حجرة ورقة مقص', emoji: '✊', bg: '#ff7aa8',
  help: 'اختار حجرة أو ورقة أو مقص، والحجرة بتكسر المقص والمقص بيقص الورقة والورقة بتلف الحجرة',
  create(api){
    const OUT = '#1c1838', GOAL = 3, LIMIT = 75, BEAT = 0.42;
    const OPTS = [{ e: '✊', n: 'حجرة' }, { e: '✋', n: 'ورقة' }, { e: '✌️', n: 'مقص' }];
    const BEATS = ['حجرة…', 'ورقة…', 'مقص!'];
    const pts = [0, 0], pick = [null, null], press = [-1, -1], pressT = [0, 0];
    let stage = 'pick', st = 0, res = null, time = 0, ended = false, endAt = 0, endWinner = null, shake = 0;
    const S = () => Math.min(api.W, api.H);
    const half = () => api.H / 2;
    const loc = p => p.player === 1 ? { x: api.W - p.x, y: api.H - p.y } : { x: p.x, y: p.y };
    function side(c, pl, fn){ c.save(); if(pl === 1){ c.translate(api.W, api.H); c.rotate(Math.PI); } fn(); c.restore(); }
    function btnGeo(i){
      const bs = Math.min(api.W * 0.28, half() * 0.3), gap = bs * 1.13;
      return { x: api.W / 2 + (i - 1) * gap, y: api.H - half() * 0.2, s: bs };
    }
    const beats = (a, b) => (a - b + 3) % 3 === 1;   // 1 (paper) beats 0 (rock), 2 beats 1, 0 beats 2

    function resolve(){
      const a = pick[0], b = pick[1];
      if(a === b) res = { w: null };
      else res = { w: beats(a, b) ? 0 : 1 };
      if(res.w === null){ api.sfx.buzz(); }
      else { pts[res.w]++; api.sfx.point(); shake = 1; }
      api.sfx.hit();
    }
    function finish(w){ if(ended) return; ended = true; endWinner = w; endAt = time + 0.7; }

    function drawHand(c, pl, ch, x, y, size, rot, alpha){
      c.save(); c.globalAlpha = alpha == null ? 1 : alpha;
      // soft round badge behind the hand
      c.fillStyle = api.players[pl].light; c.strokeStyle = OUT; c.lineWidth = Math.max(3, size * 0.05);
      c.beginPath(); c.arc(x, y, size * 0.62, 0, Math.PI * 2); c.fill(); c.stroke();
      api.emoji(c, ch, x, y, size * 0.82, rot || 0);
      c.restore();
    }

    return {
      update(dt){
        time += dt; shake = Math.max(0, shake - dt * 2.5);
        for(const pl of [0, 1]) pressT[pl] = Math.max(0, pressT[pl] - dt * 4);
        if(ended){ if(time >= endAt){ api.win(endWinner); } return; }
        if(stage === 'reveal'){
          const prevBeat = Math.floor(st / BEAT);
          st += dt;
          const b = Math.floor(st / BEAT);
          if(b !== prevBeat && b < 3) api.sfx.tick();
          if(st >= BEAT * 3){ stage = 'show'; st = 0; resolve(); }
        } else if(stage === 'show'){
          st += dt;
          if(st >= 1.6){
            if(pts[0] >= GOAL || pts[1] >= GOAL){ finish(pts[0] >= GOAL ? 0 : 1); return; }
            stage = 'pick'; st = 0; pick[0] = pick[1] = null; res = null;
          }
        }
        if(time >= LIMIT && stage === 'pick') finish(pts[0] === pts[1] ? null : pts[0] > pts[1] ? 0 : 1);
      },
      pointerDown(p){
        const pl = p.player;
        if(ended || stage !== 'pick' || (pl !== 0 && pl !== 1) || pick[pl] !== null) return;
        const q = loc(p);
        for(let i = 0; i < 3; i++){
          const g = btnGeo(i);
          if(Math.abs(q.x - g.x) < g.s * 0.56 && Math.abs(q.y - g.y) < g.s * 0.6){
            pick[pl] = i; press[pl] = i; pressT[pl] = 1; api.sfx.tap(); api.tone(pl ? 700 : 600, 0.08, 'triangle', 0.08);
            if(pick[1 - pl] !== null){ stage = 'reveal'; st = 0; api.sfx.tick(); }
            return;
          }
        }
      },
      draw(c){
        const W = api.W, H = api.H, mid = H / 2, hf = half(), s = S();
        c.fillStyle = '#ffd3e2'; c.fillRect(0, 0, W, H);
        c.fillStyle = 'rgba(255,90,95,.16)'; c.fillRect(0, mid, W, mid);
        c.fillStyle = 'rgba(63,169,255,.16)'; c.fillRect(0, 0, W, mid);
        // confetti dots
        c.fillStyle = 'rgba(255,255,255,.5)';
        for(let i = 0; i < 26; i++){ const x = ((i * 89) % 100) / 100 * W, y = ((i * 53 + 7) % 100) / 100 * H; c.beginPath(); c.arc(x, y, s * 0.012 + (i % 3) * 2, 0, Math.PI * 2); c.fill(); }
        // centre stripe + VS badge
        c.fillStyle = OUT; c.fillRect(0, mid - 3, W, 6);
        const vsr = s * 0.065;
        c.fillStyle = '#ffcd4d'; c.strokeStyle = OUT; c.lineWidth = 4;
        c.beginPath(); c.arc(W / 2, mid, vsr, 0, Math.PI * 2); c.fill(); c.stroke();
        api.emoji(c, '⚡', W / 2, mid, vsr * 1.2);

        for(const pl of [0, 1]) side(c, pl, () => {
          const col = api.players[pl], other = 1 - pl;
          // points: three stars on the left of the hand
          for(let i = 0; i < GOAL; i++){
            const x = W * 0.1 + i * s * 0.085, y = mid + hf * 0.33;
            c.globalAlpha = i < pts[pl] ? 1 : 0.25;
            api.emoji(c, '⭐', x, y, s * 0.075);
          }
          c.globalAlpha = 1;
          // hand
          const hs = hf * 0.34;
          let hx = W / 2, hy = mid + hf * 0.33, ch = '✊', scale = 1, rot = 0, alpha = 1;
          if(stage === 'reveal'){
            const f = (st % BEAT) / BEAT;
            hy -= Math.sin(f * Math.PI) * hf * 0.12;
          } else if(stage === 'show' || (ended && res)){
            ch = OPTS[pick[pl]].e;
            const k = Math.min(1, st / 0.18);
            hy = mid + hf * (0.33 - 0.12 * k);
            scale = 1 + 0.25 * Math.sin(k * Math.PI) ;
            if(res && res.w === pl){ scale *= 1.12 + Math.sin(time * 8) * 0.04; }
            else if(res && res.w === other){ alpha = 0.75; rot = Math.sin(time * 30) * 0.12 * shake; scale *= 0.9; }
          } else if(pick[pl] !== null){
            scale = 1 + Math.sin(time * 6) * 0.03;
          } else {
            rot = Math.sin(time * 3) * 0.08;
          }
          if(res && res.w === pl && (stage === 'show' || ended)){
            c.fillStyle = 'rgba(255,205,77,.55)';
            c.beginPath(); c.arc(hx, hy, hs * 0.85 * scale, 0, Math.PI * 2); c.fill();
          }
          drawHand(c, pl, ch, hx, hy, hs * scale, rot, alpha);
          // status text
          let msg, mc = col.dark;
          if(ended && res) msg = res.w === pl || endWinner === pl ? 'ربحت! 🎉' : 'خسرت 😅';
          else if(stage === 'pick') msg = pick[pl] === null ? 'اختار وحدة 👇' : (pick[other] === null ? 'اخترت ✔ استنى…' : 'اخترت ✔');
          else if(stage === 'reveal') msg = BEATS[Math.min(2, Math.floor(st / BEAT))];
          else { msg = res.w === null ? 'تعادل! 🤝' : res.w === pl ? 'نقطة إلك! 🎉' : 'نقطة إلو'; mc = res.w === pl ? '#ffcd4d' : res.w === null ? '#fff7e8' : col.dark; }
          api.text(c, msg, W / 2, mid + hf * 0.6, Math.min(s * 0.075, 30), mc, 0);
          // buttons
          const locked = pick[pl] !== null || stage !== 'pick' || ended;
          for(let i = 0; i < 3; i++){
            const g = btnGeo(i), pr = press[pl] === i ? pressT[pl] : 0;
            const yy = g.y + pr * g.s * 0.05;
            c.save(); c.globalAlpha = locked ? 0.45 : 1;
            c.fillStyle = 'rgba(28,24,56,.3)'; c.beginPath(); c.roundRect(g.x - g.s / 2, g.y - g.s * 0.55 + g.s * 0.07, g.s, g.s * 1.1, g.s * 0.2); c.fill();
            c.fillStyle = locked ? '#e8e2f5' : '#fff7e8'; c.strokeStyle = OUT; c.lineWidth = Math.max(3, g.s * 0.045);
            c.beginPath(); c.roundRect(g.x - g.s / 2, yy - g.s * 0.55, g.s, g.s * 1.1, g.s * 0.2); c.fill(); c.stroke();
            c.fillStyle = col.color; c.beginPath(); c.roundRect(g.x - g.s / 2 + 5, yy + g.s * 0.22, g.s - 10, g.s * 0.27, g.s * 0.12); c.fill();
            api.emoji(c, OPTS[i].e, g.x, yy - g.s * 0.12, g.s * 0.5);
            api.text(c, OPTS[i].n, g.x, yy + g.s * 0.355, g.s * 0.19, '#fff7e8', 0);
            c.restore();
          }
          if(pick[pl] !== null && stage === 'pick'){
            const g = btnGeo(1);
            c.fillStyle = 'rgba(28,24,56,.78)'; c.beginPath(); c.roundRect(W / 2 - g.s * 1.3, g.y - g.s * 0.2, g.s * 2.6, g.s * 0.4, g.s * 0.2); c.fill();
            api.text(c, 'اخترت ✔', W / 2, g.y, g.s * 0.22, '#3fd47a', 0);
          }
        });
      }
    };
  }
});
