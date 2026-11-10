/* Red light, green light: a sleepy traffic-light buddy sits in the middle. While it is green (eyes closed) tap to run.
   Yellow = careful! Red = it is watching: tapping sends you back 3 steps. First to the middle line wins. */
Duel.register({
  id: 'statue', title: 'ضو أحمر ضو أخضر', emoji: '🚦', bg: '#3fd47a',
  help: 'لما الضو أخضر اكبس لتركض، ولما يصير أحمر وقّف ولا تتحرك!',
  create(api){
    const OUT = '#1c1838', STEPS = 24, LIMIT = 40, BACK = 3;
    const LIGHT = { green: '#3fd47a', yellow: '#ffcd4d', red: '#ff4d4d' };
    let state = 'green', stateT = api.rand(2.2, 3.4), t = 0, ending = null, redSince = 0;
    const step = [0, 0], shown = [0, 0], hop = [0, 0], sad = [0, 0], shake = [0, 0];
    const dust = [];
    const S = () => Math.min(api.W, api.H);
    const laneX = () => Math.min(api.W * 0.26, S() * 0.3);
    const br = () => S() * 0.07;
    const startY = () => api.H / 2 - S() * 0.17;
    const finishY = () => br() * 1.05;
    const posY = v => startY() + (finishY() - startY()) * (v / STEPS);
    function side(c, pl, fn){ c.save(); c.translate(api.W / 2, api.H / 2); if(pl === 1) c.rotate(Math.PI); fn(); c.restore(); }

    function setState(s){
      state = s;
      if(s === 'green'){ stateT = api.rand(1.5, 3.6); api.tone(660, 0.12, 'triangle', 0.12); api.tone(880, 0.16, 'triangle', 0.12, 0.1); }
      else if(s === 'yellow'){ stateT = 0.55; api.sfx.tick(); }
      else { stateT = api.rand(1.3, 2.5); redSince = t; api.tone(300, 0.25, 'square', 0.08); }
    }
    function finish(w, d){ if(!ending) ending = { w, t: d }; }

    function drawLight(c){
      const s = S(), w = Math.min(s * 0.21, 2 * (laneX() - br() * 1.35) - s * 0.04), h = w * 2.9, lw = Math.max(3, s * 0.012);
      c.save(); c.translate(api.W / 2, api.H / 2);
      const wob = state === 'green' ? Math.sin(t * 3) * 0.04 : state === 'yellow' ? Math.sin(t * 30) * 0.03 : 0;
      c.rotate(wob);
      // housing
      c.fillStyle = '#3a3460'; c.strokeStyle = OUT; c.lineWidth = lw;
      c.beginPath(); c.roundRect(-w / 2, -h / 2, w, h, w * 0.45); c.fill(); c.stroke();
      c.fillStyle = 'rgba(255,255,255,.12)'; c.beginPath(); c.roundRect(-w / 2 + lw * 1.5, -h / 2 + lw * 1.5, w * 0.22, h - lw * 3, w * 0.1); c.fill();
      // three lamps stacked: red, yellow, green
      const lamps = ['red', 'yellow', 'green'], lr = w * 0.38;
      lamps.forEach((k, i) => {
        const x = 0, y = (i - 1) * h * 0.31, on = state === k;
        if(on){ c.fillStyle = LIGHT[k]; c.globalAlpha = 0.35 + Math.sin(t * 8) * 0.08; c.beginPath(); c.arc(x, y, lr * 1.45, 0, Math.PI * 2); c.fill(); c.globalAlpha = 1; }
        c.fillStyle = on ? LIGHT[k] : '#57507e'; c.strokeStyle = OUT; c.lineWidth = lw * 0.8;
        c.beginPath(); c.arc(x, y, lr, 0, Math.PI * 2); c.fill(); c.stroke();
        c.save(); c.translate(0, y);
        if(!on){ c.restore(); return; }
        // the lit lamp has the face (symmetric so both kids read it the same)
        c.strokeStyle = OUT; c.fillStyle = OUT; c.lineWidth = Math.max(2, s * 0.008); c.lineCap = 'round';
        for(const ex of [-1, 1]){
          const exx = x + ex * lr * 0.4;
          if(k === 'green'){ // sleepy closed eyes
            c.beginPath(); c.moveTo(exx - lr * 0.2, 0); c.lineTo(exx + lr * 0.2, 0); c.stroke();
          } else if(k === 'yellow'){ // peeking
            c.beginPath(); c.arc(exx, 0, lr * 0.12, 0, Math.PI * 2); c.fill();
            c.beginPath(); c.moveTo(exx - lr * 0.22, -lr * 0.12); c.lineTo(exx + lr * 0.22, -lr * 0.12); c.moveTo(exx - lr * 0.22, lr * 0.12); c.lineTo(exx + lr * 0.22, lr * 0.12); c.stroke();
          } else { // wide awake, watching
            c.fillStyle = '#fff'; c.beginPath(); c.arc(exx, 0, lr * 0.3, 0, Math.PI * 2); c.fill(); c.stroke();
            c.fillStyle = OUT; c.beginPath(); c.arc(exx, 0, lr * 0.14, 0, Math.PI * 2); c.fill();
          }
        }
        c.restore();
      });
      // zzz when sleeping (one for each player)
      if(state === 'green'){
        for(const pl of [0, 1]){ const z = (t * 0.8) % 1; api.text(c, 'z', (pl ? -1 : 1) * (w * 0.75 + z * s * 0.03), (pl ? -1 : 1) * (h * 0.31 - z * s * 0.06), s * 0.04 + z * s * 0.02, 'rgba(255,255,255,' + (1 - z) + ')', pl); }
      }
      c.restore();
    }

    return {
      update(dt){
        t += dt;
        for(const pl of [0, 1]){
          shown[pl] += (step[pl] - shown[pl]) * Math.min(1, dt * 14);
          hop[pl] = Math.max(0, hop[pl] - dt * 5); sad[pl] = Math.max(0, sad[pl] - dt); shake[pl] = Math.max(0, shake[pl] - dt * 3);
        }
        for(const d of dust){ d.x += d.vx * dt; d.y += d.vy * dt; d.life -= dt * 2; }
        for(let i = dust.length - 1; i >= 0; i--) if(dust[i].life <= 0) dust.splice(i, 1);
        if(ending){ ending.t -= dt; if(ending.t <= 0) api.win(ending.w); return; }
        stateT -= dt;
        if(stateT <= 0) setState(state === 'green' ? 'yellow' : state === 'yellow' ? 'red' : 'green');
        if(api.time >= LIMIT){ api.win(step[0] === step[1] ? null : step[0] > step[1] ? 0 : 1); }
      },
      pointerDown(p){
        if(ending) return;
        const pl = p.player;
        if(state === 'red' && t - redSince > 0.12){
          if(sad[pl] > 0.4) return; // already caught a moment ago: don't stack penalties
          step[pl] = Math.max(0, step[pl] - BACK); sad[pl] = 0.9; shake[pl] = 1;
          api.sfx.buzz(); api.say('شفتك! ارجع ٣ 🙈', pl, 900);
          return;
        }
        if(state === 'red') return;
        step[pl] = Math.min(STEPS, step[pl] + 1); hop[pl] = 1; api.sfx.tap();
        for(let i = 0; i < 2; i++) dust.push({ pl, x: api.rand(-1, 1) * br() * 0.6, y: posY(step[pl] - 1) + br(), vx: api.rand(-1, 1) * S() * 0.15, vy: S() * 0.15, life: 1 });
        if(step[pl] >= STEPS){ api.sfx.point(); finish(pl, 0.5); }
      },
      draw(c){
        const W = api.W, H = api.H, s = S(), lx = laneX(), r = br();
        // grass
        c.fillStyle = '#7fdc8c'; c.fillRect(0, 0, W, H);
        c.fillStyle = 'rgba(255,255,255,.12)';
        for(let i = 0; i < 14; i++){ const gx = (i * 97) % W, gy = (i * 173) % H; c.beginPath(); c.ellipse(gx, gy, s * 0.05, s * 0.02, 0, 0, Math.PI * 2); c.fill(); }
        // finish line in the middle (checkered)
        const sq = s * 0.035;
        for(let i = 0; i * sq < W; i++) for(let j = 0; j < 2; j++){ c.fillStyle = (i + j) % 2 ? '#fff7e8' : OUT; c.fillRect(i * sq, H / 2 - sq + j * sq, sq, sq); }
        // lanes
        for(const pl of [0, 1]) side(c, pl, () => {
          const col = api.players[pl];
          c.fillStyle = '#f3dfb0'; c.strokeStyle = OUT; c.lineWidth = Math.max(3, s * 0.01);
          c.beginPath(); c.roundRect(lx - r * 1.35, sq, r * 2.7, H / 2 - sq - s * 0.02, r * 0.6); c.fill(); c.stroke();
          // step ticks
          c.fillStyle = 'rgba(28,24,56,.14)';
          for(let k = 1; k < STEPS; k += 1){ const y = posY(k) + r * 0.2; c.fillRect(lx - r * 0.9, y, r * 1.8, Math.max(1.5, s * 0.004)); }
          // start mark
          c.fillStyle = col.color; c.fillRect(lx - r * 1.35, startY() + r * 1.2, r * 2.7, Math.max(4, s * 0.012));
          for(const d of dust){ if(d.pl !== pl) continue; c.globalAlpha = Math.max(0, d.life) * 0.6; c.fillStyle = '#c9a76a'; c.beginPath(); c.arc(lx + d.x, d.y, r * 0.2, 0, Math.PI * 2); c.fill(); }
          c.globalAlpha = 1;
          // runner
          const y = posY(shown[pl]) - Math.sin(hop[pl] * Math.PI) * r * 0.45, sx = Math.sin(shake[pl] * 30) * shake[pl] * r * 0.3;
          const mood = sad[pl] > 0 ? 'sad' : (ending && ending.w === pl) ? 'happy' : state === 'red' ? 'idle' : 'happy';
          api.buddy(c, lx + sx, y, r, pl, t, mood, { x: 0, y: -1 });
          // instruction
          const msg = state === 'green' ? 'اكبس! اركض 🏃' : state === 'yellow' ? 'انتبه! ⚠️' : 'وقّف! ✋';
          const mcol = state === 'green' ? '#14843a' : state === 'yellow' ? '#a86b00' : '#c41f1f';
          api.text(c, msg, -W * 0.12, H / 2 - s * 0.09, Math.min(30, W * 0.075), mcol, 0);
          // progress
          api.text(c, api.AR(STEPS - step[pl]) + ' خطوة', -W * 0.12, H / 2 - s * 0.19, Math.min(20, W * 0.05), col.dark, 0, 700);
          const left = Math.ceil(LIMIT - api.time);
          if(left <= 10 && !ending) api.text(c, '⏱ ' + api.AR(Math.max(0, left)), -W * 0.12, H / 2 - s * 0.27, Math.min(22, W * 0.055), OUT, 0);
        });
        // whole-screen tint while red
        if(state === 'red'){ c.fillStyle = 'rgba(255,77,77,.12)'; c.fillRect(0, 0, W, H); }
        drawLight(c);
      }
    };
  }
});
