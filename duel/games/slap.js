/* Hand slap: one kid attacks, the other defends, and the roles swap every turn.
   Attacker taps to slap. Defender taps to pull the hand away before the slap lands.
   Pull away when no slap is coming (a flinch) → attacker gets the point. First to 3. */
Duel.register({
  id: 'slap', title: L('ضربة الكف', 'Hand Slap', 'Şaplak'), emoji: '👋', bg: '#2ec4b6',
  help: L('اللي بيهجم بيكبس ليضرب الإيد، واللي بيدافع بيكبس ليسحب إيده بسرعة', 'The attacker taps to slap the hand. The defender taps to pull away fast!', 'Saldıran ele vurmak için dokunur, savunan elini hızlıca çekmek için dokunur!'),
  create(api){
    const OUT = '#1c1838', GOAL = 3, LAND = 0.23, LIMIT = 45, IDLE_MAX = 5;
    let attacker = Math.random() < 0.5 ? 0 : 1, t = 0, turnT = 0;
    let mode = 'wait';            // wait | slap | after
    let slapT = 0, afterT = 0, result = null, ending = null, dodged = false;
    let twitch = 0, nextTwitch = api.rand(0.6, 1.4), shakeT = 0;
    const pts = [0, 0];
    const pos = [0, 0];           // smoothed fingertip local y for each hand
    const pull = [0, 0];          // 0..1 pulled back
    const sting = [0, 0];
    let pow = null;               // { t, x, y }
    const stars = [];
    const S = () => Math.min(api.W, api.H);
    const defender = () => 1 - attacker;
    // fingertip rest positions (local y, own edge = +H/2, centre = 0)
    const restDef = () => S() * 0.03;
    const restAtk = () => S() * 0.24;
    const hitAtk = () => -S() * 0.27;       // attacker reaches over the defender's hand
    const pullDef = () => S() * 0.46;

    function side(c, pl, fn){ c.save(); c.translate(api.W / 2, api.H / 2); if(pl === 1) c.rotate(Math.PI); fn(); c.restore(); }

    // a right hand seen from above, fingertips at (0,0), pointing to -y, wrist toward +y
    function hand(c, pl, flat, squash){
      const s = S(), w = s * 0.24, col = api.players[pl], lw = Math.max(3, s * 0.013);
      const fingers = [[-0.33, 0.12], [-0.11, 0.0], [0.11, 0.05], [0.31, 0.17]];
      const shapes = [];
      const fw = w * 0.21;
      fingers.forEach(([fx, fy]) => shapes.push(p => { p.roundRect(fx * w - fw / 2, fy * w * 1.1, fw, w * 0.75 - fy * w, fw / 2); }));
      shapes.push(p => { p.roundRect(-w / 2, w * 0.55, w, w * 0.85, w * 0.28); });            // palm
      shapes.push(p => { p.save(); p.translate(-w * 0.5, w * 0.95); p.rotate(-0.75); p.roundRect(-fw * 0.55, -w * 0.62, fw * 1.1, w * 0.62, fw * 0.55); p.restore(); }); // thumb
      c.save(); c.scale(1 + (squash || 0) * 0.15, 1 - (squash || 0) * 0.12);
      // sleeve all the way to the edge
      c.fillStyle = col.dark; c.strokeStyle = OUT; c.lineWidth = lw;
      c.beginPath(); c.roundRect(-w * 0.45, w * 1.25, w * 0.9, s * 1.2, w * 0.1); c.fill(); c.stroke();
      c.fillStyle = 'rgba(255,255,255,.25)'; c.fillRect(-w * 0.45 + lw / 2, w * 1.42, w * 0.9 - lw, w * 0.1);
      // outline pass then fill pass → one clean silhouette
      c.strokeStyle = OUT; c.lineWidth = lw * 2; c.lineJoin = 'round';
      for(const sh of shapes){ c.beginPath(); sh(c); c.stroke(); }
      c.fillStyle = flat ? '#ffd0c2' : col.light;
      for(const sh of shapes){ c.beginPath(); sh(c); c.fill(); }
      // knuckle lines & cheeky face on the back of the hand
      c.strokeStyle = 'rgba(28,24,56,.35)'; c.lineWidth = Math.max(2, s * 0.006); c.lineCap = 'round';
      for(const [fx] of fingers){ c.beginPath(); c.moveTo(fx * w - fw * 0.25, w * 0.5); c.lineTo(fx * w + fw * 0.25, w * 0.5); c.stroke(); }
      c.fillStyle = OUT;
      if(flat){
        c.lineWidth = Math.max(2, s * 0.007); c.strokeStyle = OUT;
        for(const ex of [-1, 1]){ c.beginPath(); c.moveTo(ex * w * 0.2 - w * 0.06, w * 0.86); c.lineTo(ex * w * 0.2 + w * 0.06, w * 0.98); c.moveTo(ex * w * 0.2 + w * 0.06, w * 0.86); c.lineTo(ex * w * 0.2 - w * 0.06, w * 0.98); c.stroke(); }
      } else {
        for(const ex of [-1, 1]){ c.beginPath(); c.arc(ex * w * 0.18, w * 0.92, w * 0.05, 0, Math.PI * 2); c.fill(); }
        c.strokeStyle = OUT; c.lineWidth = Math.max(2, s * 0.006); c.beginPath(); c.arc(0, w * 1.0, w * 0.1, 0.15 * Math.PI, 0.85 * Math.PI); c.stroke();
      }
      c.restore();
    }

    function burst(c, x, y, r, k){
      c.save(); c.translate(x, y); c.rotate(k * 0.3);
      c.beginPath();
      for(let i = 0; i < 24; i++){ const a = i / 24 * Math.PI * 2, rr = r * (i % 2 ? 0.62 : 1); c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
      c.closePath(); c.fillStyle = '#ffcd4d'; c.strokeStyle = OUT; c.lineWidth = Math.max(3, S() * 0.012); c.fill(); c.stroke();
      c.beginPath();
      for(let i = 0; i < 24; i++){ const a = i / 24 * Math.PI * 2 + 0.13, rr = r * (i % 2 ? 0.4 : 0.66); c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
      c.closePath(); c.fillStyle = '#ff7a3d'; c.fill();
      c.restore();
    }

    function newTurn(swap){
      if(swap) attacker = 1 - attacker;
      mode = 'wait'; turnT = 0; slapT = 0; result = null; pow = null;
      nextTwitch = api.rand(0.6, 1.4);
    }
    function resolve(kind){
      result = kind; mode = 'after'; afterT = kind === 'hit' ? 1.3 : 1.0;
      const a = attacker, d = defender();
      if(kind === 'hit'){
        pts[a]++; sting[d] = 1; shakeT = 0.3;
        pow = { t: 0, x: api.W / 2, y: api.H / 2 + (d === 0 ? 1 : -1) * S() * 0.15 };
        for(let i = 0; i < 16; i++){ const an = api.rand(0, Math.PI * 2), sp = api.rand(0.5, 1.2) * S(); stars.push({ x: pow.x, y: pow.y, vx: Math.cos(an) * sp, vy: Math.sin(an) * sp, life: 1 }); }
        api.sfx.hit(); api.tone(160, 0.25, 'square', 0.12, 0, 60); api.tone(1200, 0.08, 'triangle', 0.08, 0.03);
      } else if(kind === 'dodge'){
        api.sfx.swoosh(); api.say(L('هربت! 😎', 'You got away! 😎', 'Kaçtın! 😎'), d, 900);
      } else if(kind === 'flinch'){
        pts[a]++; api.sfx.buzz(); api.say(L('خفت؟ نقطة إلو! 😜', 'Scared? Their point! 😜', 'Korktun mu? Puan onun! 😜'), d, 1000);
      } else if(kind === 'slow'){
        api.sfx.tick(); api.say(L('تأخرت! دور غيرك', 'Too slow! Switch turns', 'Geç kaldın! Sıra değişti'), a, 900);
      }
      if(pts[a] >= GOAL && !ending){ ending = { w: a, t: afterT }; }
    }

    return {
      update(dt){
        t += dt; turnT += dt;
        const a = attacker, d = defender();
        if(mode === 'wait'){
          nextTwitch -= dt;
          if(nextTwitch <= 0){ twitch = 1; nextTwitch = api.rand(0.7, 1.8); }
          if(turnT > IDLE_MAX) resolve('slow');
        } else if(mode === 'slap'){
          slapT += dt;
          if(slapT >= LAND) resolve(pull[d] > 0.05 || dodged ? 'dodge' : 'hit');
        } else if(mode === 'after'){
          afterT -= dt;
          if(afterT <= 0){
            if(ending){ api.win(ending.w); return; }
            newTurn(true);
          }
        }
        twitch = Math.max(0, twitch - dt * 5);
        // hand targets
        const slapping = mode === 'slap' || (mode === 'after' && (result === 'hit' || result === 'dodge'));
        let ta = restAtk() - twitch * S() * 0.05 + Math.sin(t * 5) * S() * 0.008;
        if(slapping){ const k = mode === 'slap' ? Math.min(1, slapT / LAND) : 1; ta = restAtk() + (hitAtk() - restAtk()) * (k * k); if(mode === 'after' && afterT < 0.45) ta = restAtk(); }
        const td = restDef() + pull[d] * (pullDef() - restDef());
        const ka = mode === 'slap' ? 1 : Math.min(1, dt * 12), kd = Math.min(1, dt * 30);
        pos[a] += (ta - pos[a]) * ka;
        pos[d] += (td - pos[d]) * kd;
        // pull back eases out again once the turn is over
        if(mode === 'after' && afterT < 0.5) pull[d] = Math.max(0, pull[d] - dt * 3);
        sting[0] = Math.max(0, sting[0] - dt * 0.9); sting[1] = Math.max(0, sting[1] - dt * 0.9);
        if(pow) pow.t += dt;
        for(const s of stars){ s.x += s.vx * dt; s.y += s.vy * dt; s.vx *= 0.92; s.vy *= 0.92; s.life -= dt * 1.4; }
        for(let i = stars.length - 1; i >= 0; i--) if(stars[i].life <= 0) stars.splice(i, 1);
        shakeT = Math.max(0, shakeT - dt);
        if(api.time >= LIMIT && !ending){ api.win(pts[0] === pts[1] ? null : pts[0] > pts[1] ? 0 : 1); }
      },
      pointerDown(p){
        if(ending) return;
        const a = attacker, d = defender();
        if(p.player === a){
          if(mode === 'wait' && turnT > 0.35){ mode = 'slap'; slapT = 0; dodged = false; api.sfx.swoosh(); }
        } else if(p.player === d){
          if(mode === 'slap'){ dodged = true; pull[d] = 1; }
          else if(mode === 'wait'){
            pull[d] = 1;
            if(turnT > 0.5) resolve('flinch'); else pull[d] = 0;
          }
        }
      },
      draw(c){
        const W = api.W, H = api.H, s = S(), a = attacker, d = defender();
        c.save();
        if(shakeT > 0) c.translate(api.rand(-1, 1) * s * 0.02 * shakeT / 0.3, api.rand(-1, 1) * s * 0.02 * shakeT / 0.3);
        // table
        c.fillStyle = '#c98a55'; c.fillRect(-20, -20, W + 40, H + 40);
        c.strokeStyle = 'rgba(28,24,56,.12)'; c.lineWidth = 3;
        for(let x = -10; x < W + 20; x += s * 0.13){ c.beginPath(); c.moveTo(x, -20); c.bezierCurveTo(x + 12, H * 0.3, x - 12, H * 0.7, x + 4, H + 20); c.stroke(); }
        c.fillStyle = 'rgba(255,90,95,.18)'; c.fillRect(-20, H / 2, W + 40, H / 2 + 20);
        c.fillStyle = 'rgba(63,169,255,.18)'; c.fillRect(-20, -20, W + 40, H / 2 + 20);
        // defender hand first, attacker on top
        side(c, d, () => { c.translate(0, pos[d]); hand(c, d, sting[d] > 0.2, sting[d]); });
        side(c, a, () => { c.translate(0, pos[a]); hand(c, a, false, 0); });
        // labels and score pips (on top of the sleeves)
        for(const pl of [0, 1]) side(c, pl, () => {
          const atk = pl === a, col = api.players[pl];
          const lbl = atk ? L('إنت بتهجم! اكبس لتضرب 👋', 'You attack! Tap to slap 👋', 'Saldır! Vurmak için dokun 👋') : L('إنت بتدافع! اكبس لتهرب 🏃', 'You defend! Tap to escape 🏃', 'Savun! Kaçmak için dokun 🏃');
          const y = H / 2 - s * 0.1;
          c.fillStyle = atk ? col.color : '#fff7e8'; c.strokeStyle = OUT; c.lineWidth = Math.max(3, s * 0.01);
          c.beginPath(); c.roundRect(-W * 0.44, y - s * 0.05, W * 0.88, s * 0.1, s * 0.05); c.fill(); c.stroke();
          api.text(c, lbl, 0, y, Math.min(22, W * 0.052), atk ? '#fff7e8' : col.dark, 0);
          for(let i = 0; i < GOAL; i++){
            const x = W * 0.3 + (i - 1) * s * 0.075, py = H / 2 - s * 0.2;
            c.fillStyle = i < pts[pl] ? '#ffcd4d' : 'rgba(28,24,56,.25)'; c.strokeStyle = OUT; c.lineWidth = Math.max(2, s * 0.007);
            c.beginPath(); for(let k = 0; k < 10; k++){ const an = -Math.PI / 2 + k * Math.PI / 5, rr = s * (k % 2 ? 0.014 : 0.03); c.lineTo(x + Math.cos(an) * rr, py + Math.sin(an) * rr); } c.closePath(); c.fill(); c.stroke();
          }
        });
        // POW
        if(pow && pow.t < 0.9){
          const k = Math.min(1, pow.t / 0.12), r = s * 0.17 * (0.6 + k * 0.5) * (1 - Math.max(0, pow.t - 0.6) * 2);
          if(r > 0){
            burst(c, pow.x, pow.y, r, pow.t);
            api.text(c, L('طاخ!', 'Smack!', 'Şap!'), pow.x, pow.y + r * 1.25, Math.min(46, s * 0.12), '#ffcd4d', 0, 900);
            api.text(c, L('طاخ!', 'Smack!', 'Şap!'), pow.x, pow.y - r * 1.25, Math.min(46, s * 0.12), '#ffcd4d', 1, 900);
          }
        }
        for(const st of stars){ c.globalAlpha = Math.max(0, st.life); api.emoji(c, '⭐', st.x, st.y, s * 0.05, st.life * 4); }
        c.globalAlpha = 1;
        c.restore();
      }
    };
  }
});
