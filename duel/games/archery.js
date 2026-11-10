/* Archery. A target slides left and right across the middle line and keeps changing speed.
   Tap your half to shoot your arrow straight at the middle. 5 arrows each, bullseye 10, middle ring 5, outer ring 2. */
Duel.register({
  id: 'archery', title: 'الرماية', emoji: '🏹', bg: '#2ec4b6',
  help: 'اكبس لترمي سهمك لما يكون الهدف قدّامك. النص الأصفر بيعطي ١٠',
  create(api){
    const OUT = '#1c1838', N = 5, COOL = 0.6, LIMIT = 40;
    const S = () => Math.min(api.W, api.H);
    const half = () => api.H / 2;
    const R = () => S() * 0.13;
    const bowY = () => api.H - half() * 0.2;            // own-frame y of the bow
    const ALEN = () => S() * 0.2;
    const xmin = () => Math.min(api.W / 2, R() + 40), xmax = () => Math.max(api.W / 2, api.W - R() - 50);
    let ph = Math.random() * Math.PI * 2, w = 1.6, wt = 1.6, nextChange = api.rand(1.2, 2.4), tx = api.W / 2;
    let time = 0, ended = false, endAt = 0, endW = null, called = false, wobble = 0;
    const score = [0, 0], left = [N, N], cool = [0, 0], recoil = [0, 0];
    const flying = [], stuck = [], pops = [], misses = [];
    const RINGS = [{ k: 0.34, p: 10, c: '#ffcd4d' }, { k: 0.67, p: 5, c: '#ff5a5f' }, { k: 1, p: 2, c: '#3fa9ff' }];

    function targetX(){ const a = (xmax() - xmin()) / 2; return (xmin() + xmax()) / 2 + Math.sin(ph) * a; }
    function shoot(pl){
      if(ended || left[pl] <= 0 || cool[pl] > 0) return;
      left[pl]--; cool[pl] = COOL; recoil[pl] = 1;
      flying.push({ pl, d: bowY() - api.H / 2 - ALEN() * 0.6 });     // d = distance of the tip from the middle line (own frame)
      api.sfx.swoosh(); api.tone(pl ? 330 : 300, 0.08, 'triangle', 0.08, 0, 160);
    }
    function arrive(f){
      const dx = (f.pl === 0 ? api.W / 2 : api.W / 2) - tx, ad = Math.abs(dx), r = R();
      if(ad <= r){
        const ring = RINGS.find(g => ad <= g.k * r);
        score[f.pl] += ring.p; wobble = 1;
        stuck.push({ pl: f.pl, dx, t: time });
        pops.push({ pl: f.pl, x: api.W / 2, s: '+' + api.AR(ring.p), t: 0, big: ring.p === 10 });
        if(ring.p === 10){ api.sfx.point(); api.say('بالنص! 🎯', f.pl, 900); } else api.sfx.hit();
      } else {
        misses.push({ pl: f.pl, d: 0, life: 1 });
        pops.push({ pl: f.pl, x: api.W / 2, s: 'فاتت!', t: 0 });
        api.sfx.buzz();
      }
    }
    function judge(){
      if(ended) return; ended = true; endAt = time + 0.9;
      endW = score[0] === score[1] ? null : score[0] > score[1] ? 0 : 1;
    }

    function arrow(c, pl, len, alpha){        // tip at (0,0), tail toward +y
      const s = S(), wd = s * 0.02, lw = Math.max(2, s * 0.008), col = api.players[pl];
      c.save(); if(alpha != null) c.globalAlpha = alpha;
      c.lineJoin = 'round'; c.strokeStyle = OUT; c.lineWidth = lw;
      c.fillStyle = col.color;
      for(const sx of [-1, 1]){ c.beginPath(); c.moveTo(0, len * 0.7); c.lineTo(sx * wd * 1.8, len * 0.84); c.lineTo(sx * wd * 1.8, len * 1.02); c.lineTo(0, len * 0.9); c.closePath(); c.fill(); c.stroke(); }
      c.fillStyle = '#c98a4b'; c.beginPath(); c.roundRect(-wd * 0.35, len * 0.1, wd * 0.7, len * 0.88, wd * 0.3); c.fill(); c.stroke();
      c.fillStyle = '#d9e2ec'; c.beginPath(); c.moveTo(0, -len * 0.02); c.lineTo(wd * 0.9, len * 0.14); c.lineTo(-wd * 0.9, len * 0.14); c.closePath(); c.fill(); c.stroke();
      c.restore();
    }
    function drawTarget(c){
      const r = R(), s = S(), mid = api.H / 2, wb = Math.sin(time * 40) * wobble * r * 0.04;
      c.save(); c.translate(tx + wb, mid);
      c.fillStyle = 'rgba(28,24,56,.25)'; c.beginPath(); c.arc(s * 0.01, s * 0.015, r * 1.08, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#fff7e8'; c.strokeStyle = OUT; c.lineWidth = Math.max(3, s * 0.012);
      c.beginPath(); c.arc(0, 0, r * 1.06, 0, Math.PI * 2); c.fill(); c.stroke();
      for(let i = RINGS.length - 1; i >= 0; i--){
        c.fillStyle = RINGS[i].c; c.lineWidth = Math.max(2, s * 0.007);
        c.beginPath(); c.arc(0, 0, r * RINGS[i].k, 0, Math.PI * 2); c.fill(); c.stroke();
      }
      c.fillStyle = '#fff7e8'; c.beginPath(); c.arc(0, 0, r * 0.09, 0, Math.PI * 2); c.fill();
      c.restore();
    }
    function drawBow(c, pl){
      const s = S(), W = api.W, by = bowY(), bw = s * 0.2, col = api.players[pl];
      const ready = left[pl] > 0 && cool[pl] <= 0 && !ended, pull = ready ? 1 : Math.max(0, 1 - cool[pl] / COOL) * (left[pl] > 0 ? 1 : 0);
      const rc = recoil[pl] * s * 0.02;
      c.save(); c.translate(W / 2, by + rc);
      const sy = s * 0.04 + pull * s * 0.05;            // string pull-back
      c.strokeStyle = '#fff7e8'; c.lineWidth = 2.5;
      c.beginPath(); c.moveTo(-bw, s * 0.04); c.lineTo(0, sy); c.lineTo(bw, s * 0.04); c.stroke();
      if(left[pl] > 0 && !ended){ c.save(); c.translate(0, sy - ALEN() * 0.95); arrow(c, pl, ALEN(), ready ? 1 : 0.35 + 0.65 * pull); c.restore(); }
      c.lineCap = 'round';
      c.strokeStyle = OUT; c.lineWidth = s * 0.045;
      c.beginPath(); c.moveTo(-bw, s * 0.04); c.quadraticCurveTo(0, -s * 0.11, bw, s * 0.04); c.stroke();
      c.strokeStyle = col.color; c.lineWidth = s * 0.025;
      c.beginPath(); c.moveTo(-bw, s * 0.04); c.quadraticCurveTo(0, -s * 0.11, bw, s * 0.04); c.stroke();
      c.fillStyle = col.dark; c.strokeStyle = OUT; c.lineWidth = 3;
      c.beginPath(); c.roundRect(-s * 0.03, -s * 0.05, s * 0.06, s * 0.06, s * 0.015); c.fill(); c.stroke();
      c.restore();
    }

    return {
      update(dt){
        time += dt;
        nextChange -= dt;
        if(nextChange <= 0){ nextChange = api.rand(1.2, 2.6); wt = api.rand(1.0, 3.2) * (Math.random() < 0.3 ? -1 : 1) * Math.sign(wt || 1); }
        w += (wt - w) * Math.min(1, dt * 2);
        ph += w * dt * (ended ? 0.3 : 1);
        tx = targetX();
        wobble = Math.max(0, wobble - dt * 3);
        for(const pl of [0, 1]){ cool[pl] = Math.max(0, cool[pl] - dt); recoil[pl] = Math.max(0, recoil[pl] - dt * 6); }
        const sp = S() * 3.2;
        for(const f of flying){ f.d -= sp * dt; if(f.d <= 0 && !f.done){ f.done = true; arrive(f); } }
        for(let i = flying.length - 1; i >= 0; i--) if(flying[i].done) flying.splice(i, 1);
        for(const m of misses){ m.d -= sp * dt * 0.8; m.life -= dt * 2.5; }
        for(let i = misses.length - 1; i >= 0; i--) if(misses[i].life <= 0) misses.splice(i, 1);
        for(const p of pops) p.t += dt;
        for(let i = pops.length - 1; i >= 0; i--) if(pops[i].t > 1) pops.splice(i, 1);
        if(ended){ if(time >= endAt && !called){ called = true; api.win(endW); } return; }
        if((left[0] === 0 && left[1] === 0 && flying.length === 0) || time >= LIMIT) judge();
      },
      pointerDown(p){ if(p.player === 0 || p.player === 1) shoot(p.player); },
      draw(c){
        const W = api.W, H = api.H, mid = H / 2, hf = half(), s = S(), r = R(), len = ALEN();
        // meadow
        c.fillStyle = '#8fe3a0'; c.fillRect(0, 0, W, H);
        c.fillStyle = 'rgba(255,90,95,.15)'; c.fillRect(0, mid, W, mid);
        c.fillStyle = 'rgba(63,169,255,.15)'; c.fillRect(0, 0, W, mid);
        c.strokeStyle = 'rgba(40,120,60,.35)'; c.lineWidth = 3; c.lineCap = 'round';
        for(let i = 0; i < 18; i++){
          const x = ((i * 97) % 100) / 100 * W, y = ((i * 61 + 13) % 100) / 100 * H;
          if(Math.abs(y - mid) < r * 1.3) continue;
          c.beginPath(); c.moveTo(x - 5, y); c.lineTo(x - 8, y - 9); c.moveTo(x, y); c.lineTo(x, y - 12); c.moveTo(x + 5, y); c.lineTo(x + 8, y - 9); c.stroke();
        }
        // track the target slides on
        c.fillStyle = '#c98a4b'; c.strokeStyle = OUT; c.lineWidth = 4;
        c.beginPath(); c.roundRect(xmin() - r * 0.3, mid - s * 0.012, xmax() - xmin() + r * 0.6, s * 0.024, s * 0.012); c.fill(); c.stroke();
        // aim lines
        c.strokeStyle = 'rgba(28,24,56,.2)'; c.lineWidth = 4; c.setLineDash([6, 12]);
        c.beginPath(); c.moveTo(W / 2, mid + r * 1.2); c.lineTo(W / 2, H - hf * 0.42); c.moveTo(W / 2, mid - r * 1.2); c.lineTo(W / 2, hf * 0.42); c.stroke();
        c.setLineDash([]);
        drawTarget(c);
        // arrows stuck in the target (move with it)
        for(const a of stuck){
          c.save(); c.translate(tx + a.dx, mid); if(a.pl === 1) c.rotate(Math.PI);
          c.translate(0, -r * 0.02); arrow(c, a.pl, len * 0.75); c.restore();
        }
        // flying arrows
        for(const f of flying){ c.save(); if(f.pl === 1){ c.translate(W, H); c.rotate(Math.PI); } c.translate(W / 2, mid + f.d); arrow(c, f.pl, len); c.restore(); }
        for(const m of misses){ c.save(); if(m.pl === 1){ c.translate(W, H); c.rotate(Math.PI); } c.translate(W / 2, mid + m.d); arrow(c, m.pl, len, Math.max(0, m.life)); c.restore(); }
        // each player's bow + HUD
        for(const pl of [0, 1]){
          c.save(); if(pl === 1){ c.translate(W, H); c.rotate(Math.PI); }
          drawBow(c, pl);
          const col = api.players[pl], hy = H - hf * 0.08;
          // quiver: arrows left
          for(let i = 0; i < N; i++){
            c.save(); c.translate(W * 0.08 + i * s * 0.045, hy - s * 0.06); c.scale(0.45, 0.45);
            arrow(c, pl, len, i < left[pl] ? 1 : 0.18); c.restore();
          }
          // score badge
          c.fillStyle = 'rgba(28,24,56,.7)'; c.beginPath(); c.roundRect(W * 0.7, hy - s * 0.045, W * 0.25, s * 0.09, s * 0.045); c.fill();
          c.strokeStyle = col.color; c.lineWidth = 4; c.stroke();
          api.text(c, '🎯 ' + api.AR(score[pl]), W * 0.825, hy, s * 0.055, '#fff7e8', 0);
          if(time < 3 && !ended) api.text(c, 'اكبس لترمي 👆', W / 2, mid + hf * 0.42, s * 0.06, col.dark, 0);
          else if(left[pl] === 0 && !ended) api.text(c, 'خلصت أسهمك!', W / 2, mid + hf * 0.42, s * 0.055, col.dark, 0);
          for(const p of pops){
            if(p.pl !== pl) continue;
            api.text(c, p.s, p.x + W * 0.22, mid + r * 0.9 + hf * 0.12 - p.t * hf * 0.1, s * (p.big ? 0.085 : 0.065) * (1 + Math.max(0, 0.3 - p.t)), p.s === 'فاتت!' ? '#fff7e8' : '#ffcd4d', 0);
          }
          c.restore();
        }
        const tl = Math.max(0, Math.ceil(LIMIT - time));
        if(tl <= 10 && !ended) for(const pl of [0, 1]) api.text(c, '⏱ ' + api.AR(tl), pl ? W * 0.2 : W * 0.8, pl ? mid - hf * 0.3 : mid + hf * 0.3, s * 0.05, '#ff5a5f', pl);
      }
    };
  }
});
