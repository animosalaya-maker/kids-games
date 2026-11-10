/* Darts & log: a wooden log slice spins in the middle. Tap your half to throw a suction-cup arrow at it.
   Hit an arrow that is already stuck → it bounces off and you lose. First to stick all 6 wins. */
Duel.register({
  id: 'darts', title: L('الأسهم والجذع', 'Arrows & Log', 'Ok ve Kütük'), emoji: '🎯', bg: '#b07cff',
  help: L('اكبس لترمي سهمك على الجذع، بس دير بالك لا تضرب سهم تاني!', 'Tap to throw your arrow at the log, but don\'t hit another arrow!', 'Okunu kütüğe atmak için dokun, ama başka bir oka çarpma!'),
  create(api){
    const OUT = '#1c1838', N = 6, COOL = 0.35, LIMIT = 40;
    let rot = 0, omega = 1.8, target = 1.8, nextChange = api.rand(1.2, 2.4), t = 0;
    const stuck = [];            // { a: local angle on log, pl }
    const flying = [];           // { pl, y: local tip y, done }
    const bouncers = [];         // { x, y, vx, vy, a, va, pl, life }
    const sparks = [];
    const thrown = [0, 0], cool = [0, 0], wob = [0, 0];
    let ending = null, hitFlash = 0;
    const S = () => Math.min(api.W, api.H);
    const R = () => S() * 0.24;
    const L = () => S() * 0.17;
    const startY = () => api.H / 2 - S() * 0.34;       // local y of a thrown arrow's tip (own edge = +H/2)
    const TH = 0.23;                                    // clash threshold (radians on the rim)
    const impactAngle = pl => pl === 0 ? Math.PI / 2 : -Math.PI / 2;
    const angDist = (a, b) => { let d = (a - b) % (Math.PI * 2); if(d < 0) d += Math.PI * 2; return Math.min(d, Math.PI * 2 - d); };

    function side(c, pl, fn){ c.save(); c.translate(api.W / 2, api.H / 2); if(pl === 1) c.rotate(Math.PI); fn(); c.restore(); }

    // arrow in a frame where the tip is at (0,0) and the tail is along +y
    function arrow(c, pl, len, alpha){
      const s = S(), w = s * 0.022, lw = Math.max(2, s * 0.008), col = api.players[pl];
      c.save(); if(alpha != null) c.globalAlpha = alpha;
      c.lineJoin = 'round'; c.strokeStyle = OUT; c.lineWidth = lw;
      // fletching
      c.fillStyle = col.color;
      for(const sx of [-1, 1]){
        c.beginPath(); c.moveTo(0, len * 0.62); c.lineTo(sx * w * 2.1, len * 0.86); c.lineTo(sx * w * 2.1, len * 1.04); c.lineTo(0, len * 0.86); c.closePath(); c.fill(); c.stroke();
      }
      // shaft
      c.fillStyle = '#ffe7a3'; c.beginPath(); c.roundRect(-w / 2, len * 0.08, w, len * 0.92, w / 2); c.fill(); c.stroke();
      c.fillStyle = col.dark; c.fillRect(-w / 2 + lw / 2, len * 0.5, w - lw, len * 0.06);
      // suction cup
      c.fillStyle = '#ff7a3d';
      c.beginPath(); c.moveTo(-w * 1.6, 0); c.quadraticCurveTo(0, -w * 0.7, w * 1.6, 0); c.lineTo(w * 0.55, len * 0.12); c.lineTo(-w * 0.55, len * 0.12); c.closePath(); c.fill(); c.stroke();
      c.restore();
    }

    function drawLog(c){
      const r = R(), s = S();
      c.save(); c.translate(api.W / 2, api.H / 2);
      c.fillStyle = 'rgba(28,24,56,.25)'; c.beginPath(); c.arc(s * 0.012, s * 0.02, r * 1.08, 0, Math.PI * 2); c.fill();
      c.rotate(rot);
      // bark
      c.fillStyle = '#7a4a26'; c.strokeStyle = OUT; c.lineWidth = Math.max(3, s * 0.012);
      c.beginPath();
      for(let i = 0; i <= 36; i++){ const a = i / 36 * Math.PI * 2, rr = r * (1.06 + (i % 2 ? 0.025 : 0)); c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
      c.closePath(); c.fill(); c.stroke();
      // wood face
      c.fillStyle = '#f3c27a'; c.beginPath(); c.arc(0, 0, r * 0.93, 0, Math.PI * 2); c.fill();
      c.lineWidth = Math.max(2, s * 0.006); c.stroke();
      c.strokeStyle = '#c98a45'; c.lineWidth = Math.max(2, s * 0.007);
      for(const k of [0.75, 0.56, 0.38, 0.2]){ c.beginPath(); c.ellipse(r * 0.04 * (1 - k), 0, r * k, r * k * 0.96, 0, 0, Math.PI * 2); c.stroke(); }
      c.fillStyle = '#c98a45'; c.beginPath(); c.arc(r * 0.02, 0, r * 0.07, 0, Math.PI * 2); c.fill();
      // a knot and a crack so the spin is easy to see
      c.fillStyle = '#a86a32'; c.beginPath(); c.ellipse(r * 0.48, -r * 0.3, r * 0.11, r * 0.07, 0.5, 0, Math.PI * 2); c.fill();
      c.strokeStyle = '#8a5428'; c.lineWidth = Math.max(2, s * 0.008); c.lineCap = 'round';
      c.beginPath(); c.moveTo(-r * 0.9, r * 0.05); c.lineTo(-r * 0.62, r * 0.1); c.lineTo(-r * 0.5, r * 0.02); c.stroke();
      // centre target dot
      c.fillStyle = '#ff5a5f'; c.strokeStyle = OUT; c.lineWidth = Math.max(2, s * 0.006);
      c.beginPath(); c.arc(0, 0, r * 0.12, 0, Math.PI * 2); c.fill(); c.stroke();
      c.fillStyle = '#fff7e8'; c.beginPath(); c.arc(0, 0, r * 0.05, 0, Math.PI * 2); c.fill();
      c.restore();
    }

    function finish(winner, delay){ if(!ending) ending = { winner, t: delay }; }

    function throwArrow(pl){
      if(ending || thrown[pl] >= N || cool[pl] > 0) return;
      thrown[pl]++; cool[pl] = COOL; wob[pl] = 1;
      flying.push({ pl, y: startY() });
      api.sfx.swoosh();
    }

    function land(f){
      const ia = impactAngle(f.pl);
      const clash = stuck.some(s => angDist(s.a + rot, ia) < TH);
      const r = R();
      if(clash){
        const sx = api.W / 2, sy = api.H / 2 + (f.pl === 0 ? r : -r), dir = f.pl === 0 ? 1 : -1;
        bouncers.push({ x: sx, y: sy, vx: api.rand(-1, 1) * S() * 1.2, vy: dir * S() * 1.6, a: f.pl === 0 ? 0 : Math.PI, va: api.rand(8, 14) * (Math.random() < 0.5 ? -1 : 1), pl: f.pl, life: 1 });
        for(let i = 0; i < 12; i++) sparks.push({ x: sx, y: sy, vx: api.rand(-1, 1) * S() * 0.9, vy: api.rand(-1, 1) * S() * 0.9, life: api.rand(0.3, 0.6), col: '#ffcd4d' });
        api.sfx.bounce(); api.sfx.buzz(); hitFlash = 0.35;
        api.say(api.L('طار السهم! 💥', 'Arrow flew off! 💥', 'Ok uçup gitti! 💥'), f.pl, 1100);
        finish(1 - f.pl, 0.9);
      } else {
        stuck.push({ a: ia - rot, pl: f.pl });
        api.sfx.hit();
        const sx = api.W / 2, sy = api.H / 2 + (f.pl === 0 ? r : -r);
        for(let i = 0; i < 6; i++) sparks.push({ x: sx, y: sy, vx: api.rand(-1, 1) * S() * 0.5, vy: api.rand(-1, 1) * S() * 0.5, life: api.rand(0.2, 0.4), col: '#c98a45' });
        if(thrown[f.pl] >= N && !flying.some(o => o.pl === f.pl && !o.done)){ api.sfx.point(); finish(f.pl, 0.7); }
      }
    }

    return {
      update(dt){
        t += dt;
        // log speed & direction changes now and then
        nextChange -= dt;
        if(nextChange <= 0){
          nextChange = api.rand(1.3, 2.8);
          const sp = api.rand(1.1, 3.1), flip = Math.random() < 0.4 ? -1 : 1;
          target = Math.sign(target || 1) * flip * sp;
        }
        omega += (target - omega) * Math.min(1, dt * 2.5);
        rot += omega * dt;
        for(const pl of [0, 1]){ cool[pl] = Math.max(0, cool[pl] - dt); wob[pl] = Math.max(0, wob[pl] - dt * 4); }
        const sp = S() * 4.2, r = R();
        for(const f of flying){
          if(f.done) continue;
          f.y -= sp * dt;
          if(f.y <= r){ f.y = r; f.done = true; land(f); }
        }
        for(let i = flying.length - 1; i >= 0; i--) if(flying[i].done) flying.splice(i, 1);
        for(const b of bouncers){ b.x += b.vx * dt; b.y += b.vy * dt; b.a += b.va * dt; b.vx *= 0.97; b.vy *= 0.97; b.life -= dt * 0.9; }
        for(const p of sparks){ p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.9; p.vy *= 0.9; p.life -= dt; }
        for(let i = sparks.length - 1; i >= 0; i--) if(sparks[i].life <= 0) sparks.splice(i, 1);
        hitFlash = Math.max(0, hitFlash - dt);
        if(ending){ ending.t -= dt; if(ending.t <= 0) api.win(ending.winner); return; }
        if(api.time >= LIMIT){
          const a = stuck.filter(s => s.pl === 0).length, b = stuck.filter(s => s.pl === 1).length;
          api.win(a === b ? null : a > b ? 0 : 1);
        }
      },
      pointerDown(p){ throwArrow(p.player); },
      draw(c){
        const W = api.W, H = api.H, s = S(), r = R(), len = L();
        // background: two soft halves
        c.fillStyle = '#e9dcff'; c.fillRect(0, 0, W, H);
        c.fillStyle = 'rgba(255,90,95,.14)'; c.fillRect(0, H / 2, W, H / 2);
        c.fillStyle = 'rgba(63,169,255,.14)'; c.fillRect(0, 0, W, H / 2);
        // dotted aim lines
        c.strokeStyle = 'rgba(28,24,56,.18)'; c.lineWidth = 4; c.setLineDash([6, 12]); c.lineCap = 'round';
        c.beginPath(); c.moveTo(W / 2, H / 2 + r * 1.15); c.lineTo(W / 2, H - s * 0.36); c.moveTo(W / 2, H / 2 - r * 1.15); c.lineTo(W / 2, s * 0.36); c.stroke();
        c.setLineDash([]);
        // stuck arrows (behind the log's bark edge, so draw them first and their tips under the bark)
        for(const st of stuck){
          c.save(); c.translate(W / 2, H / 2); c.rotate(st.a + rot - Math.PI / 2);
          c.translate(0, r * 0.97); arrow(c, st.pl, len); c.restore();
        }
        drawLog(c);
        if(hitFlash > 0){ c.fillStyle = 'rgba(255,255,255,' + (hitFlash * 1.2) + ')'; c.beginPath(); c.arc(W / 2, H / 2, r * 1.1, 0, Math.PI * 2); c.fill(); }
        // flying arrows
        for(const f of flying) side(c, f.pl, () => { c.translate(0, f.y); arrow(c, f.pl, len); });
        // bouncing arrows
        for(const b of bouncers){ if(b.life <= 0) continue; c.save(); c.translate(b.x, b.y); c.rotate(b.a); arrow(c, b.pl, len * 0.9, Math.max(0, b.life)); c.restore(); }
        for(const p of sparks){ c.globalAlpha = Math.min(1, p.life * 3); c.fillStyle = p.col; c.beginPath(); c.arc(p.x, p.y, s * 0.014, 0, Math.PI * 2); c.fill(); }
        c.globalAlpha = 1;
        // each player's supply & ready arrow
        for(const pl of [0, 1]) side(c, pl, () => {
          const left = N - thrown[pl], by = H / 2 - s * 0.065, gap = Math.min(W * 0.11, s * 0.1);
          // tray
          c.fillStyle = 'rgba(28,24,56,.12)'; c.beginPath(); c.roundRect(-gap * 3.3, by - s * 0.055, gap * 6.6, s * 0.11, s * 0.05); c.fill();
          for(let i = 0; i < N; i++){
            const x = (i - (N - 1) / 2) * gap;
            c.save(); c.translate(x, by - s * 0.04); c.scale(0.5, 0.5);
            arrow(c, pl, len, i < left ? 1 : 0.18); c.restore();
          }
          // the next arrow, ready to throw
          if(left > 0 && !ending){
            const ready = cool[pl] <= 0, wy = Math.sin(t * 6) * s * 0.006 + wob[pl] * s * 0.03;
            c.save(); c.translate(0, startY() + wy); arrow(c, pl, len, ready ? 1 : 0.35); c.restore();
          }
          api.text(c, left > 0 ? api.L('اكبس لترمي 👆', 'Tap to throw 👆', 'Dokun ve at 👆') : api.L('خلصت أسهمك!', 'No more arrows!', 'Okların bitti!'), W * 0.27, startY() + len * 0.55, Math.min(20, W * 0.05), api.players[pl].dark, 0);
          api.text(c, api.AR(left), -W * 0.3, startY() + len * 0.55, Math.min(30, W * 0.075), api.players[pl].dark, 0);
        });
      }
    };
  }
});
