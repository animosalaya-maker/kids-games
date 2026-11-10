/* Car race: each player has their own 3-lane road in their half, scrolling toward them.
   Left / right buttons change lane. Obstacles make the car spin and slow down; coins push it forward.
   Both roads use the SAME track layout so it's fair. First to 100% wins; after 50 s the further car wins. */
Duel.register({
  id: 'cars', title: L('سباق السيارات', 'Car Race', 'Araba Yarışı'), emoji: '🏎️', bg: '#5b6475',
  help: L('كبس يمين ويسار لتغيّر الطريق، اهرب من الحواجز ولمّ المصاري، أوّل واحد بيوصل بيربح', 'Tap left or right to change lanes. Dodge the blocks and grab the coins. First to the finish wins!', 'Şerit değiştirmek için sağa ya da sola dokun. Engellerden kaç, paraları topla. İlk varan kazanır!'),
  create(api){
    const OUT = '#1c1838', TRACK = 25, LIMIT = 50, SPIN = 1.0;
    let t = 0, over = false, overT = 0, winner = null;

    // one shared track: items positioned in "seconds of travel at full speed"
    const items = [];
    for(let s = 2.6; s < TRACK - 0.8; s += api.rand(0.75, 1.0)){
      const lanes = [0, 1, 2].sort(() => Math.random() - 0.5);
      const nObs = Math.random() < 0.35 ? 2 : 1;
      for(let k = 0; k < nObs; k++) items.push({ s, lane: lanes[k], kind: ['cone', 'barrel', 'car'][Math.floor(Math.random() * 3)], tint: Math.floor(Math.random() * 3) });
      if(Math.random() < 0.55) items.push({ s, lane: lanes[2], kind: 'coin' });
    }
    for(let s = 3.0; s < TRACK - 1; s += api.rand(2.5, 4)){ // bonus coin trails between rows
      const lane = Math.floor(Math.random() * 3), s2 = s + 0.37;
      if(!items.some(it => Math.abs(it.s - s2) < 0.3 && it.kind !== 'coin')) items.push({ s: s2, lane, kind: 'coin' });
    }

    const cars = [0, 1].map(() => ({ lane: 1, x: null, P: 0, sp: 0, spinT: 0, safeT: 0, used: new Set(), pressed: [null, null], holdT: 0, rot: 0, pops: [] }));

    function geo(){
      const W = api.W, H = api.H, hh = H / 2, m0 = Math.min(W, H);
      const btn = api.clamp(m0 * 0.2, 70, 96), pad = Math.max(8, m0 * 0.025);
      const side = btn + pad * 2;
      const roadW = Math.max(150, Math.min(W - side * 2, m0 * 0.75));
      const rx = (W - roadW) / 2, laneW = roadW / 3;
      const carW = laneW * 0.56, carH = carW * 1.65;
      const carY = H - pad - carH / 2 - 6;
      return { W, H, hh, m0, btn, pad, side, roadW, rx, laneW, carW, carH, carY, pxs: hh * 0.78 };
    }
    const laneX = (g, l) => g.rx + g.laneW * (l + 0.5);
    const toLocal = (pl, x, y) => pl === 1 ? { x: api.W - x, y: api.H - y } : { x, y };
    function btnPos(g){ const y = g.H - g.pad - g.btn / 2; return [{ x: g.pad + g.btn / 2, y }, { x: g.W - g.pad - g.btn / 2, y }]; }
    function hitBtn(p){
      const g = geo(), L = toLocal(p.player, p.x, p.y);
      if(L.y < g.H / 2) return -1;
      const b = btnPos(g), half = g.btn / 2 + 18;
      for(let k = 0; k < 2; k++) if(Math.abs(L.x - b[k].x) < half && Math.abs(L.y - b[k].y) < half) return k;
      return L.x < g.W / 2 ? 0 : 1; // anywhere else in your half counts by side
    }
    function move(car, d){
      const n = api.clamp(car.lane + d, 0, 2);
      if(n !== car.lane){ car.lane = n; api.sfx.swoosh(); }
    }

    function finishCheck(){
      const a = cars[0].P >= TRACK, b = cars[1].P >= TRACK;
      if(a || b){
        over = true;
        winner = a && b ? (Math.abs(cars[0].P - cars[1].P) < 0.01 ? null : (cars[0].P > cars[1].P ? 0 : 1)) : (a ? 0 : 1);
        api.sfx.point();
      } else if(t >= LIMIT){
        over = true;
        const d = cars[0].P - cars[1].P;
        winner = Math.abs(d) < 0.05 ? null : (d > 0 ? 0 : 1);
        api.say(api.L('خلص الوقت! ⏰', 'Time\'s up! ⏰', 'Süre bitti! ⏰'));
      }
    }

    /* ---------- drawing (all in the player's local frame: their half is y in [H/2, H], they sit at y = H) ---------- */
    function drawCar(c, x, y, w, h, col, dark, rot, plain){
      c.save(); c.translate(x, y); c.rotate(rot);
      c.fillStyle = 'rgba(0,0,0,.25)'; c.beginPath(); c.roundRect(-w / 2 + 3, -h / 2 + 5, w, h, w * 0.3); c.fill();
      // wheels
      c.fillStyle = OUT;
      for(const sx of [-1, 1]) for(const sy of [-1, 1]) { c.beginPath(); c.roundRect(sx * w * 0.5 - w * 0.12, sy * h * 0.3 - h * 0.1, w * 0.24, h * 0.2, 3); c.fill(); }
      c.fillStyle = col; c.strokeStyle = OUT; c.lineWidth = 3;
      c.beginPath(); c.roundRect(-w / 2, -h / 2, w, h, w * 0.32); c.fill(); c.stroke();
      // windscreen (front = up = away from the player) + rear window
      c.fillStyle = '#bfe9ff';
      c.beginPath(); c.roundRect(-w * 0.34, -h * 0.26, w * 0.68, h * 0.2, 4); c.fill(); c.stroke();
      c.beginPath(); c.roundRect(-w * 0.3, h * 0.16, w * 0.6, h * 0.13, 4); c.fill(); c.stroke();
      c.fillStyle = dark; c.beginPath(); c.roundRect(-w * 0.3, -h * 0.04, w * 0.6, h * 0.18, 4); c.fill();
      if(!plain){ c.fillStyle = '#fff'; c.fillRect(-w * 0.06, -h * 0.5 + 2, w * 0.12, h * 0.22); c.fillRect(-w * 0.06, -h * 0.03, w * 0.12, h * 0.17); }
      c.fillStyle = '#ffe066';
      for(const sx of [-1, 1]){ c.beginPath(); c.arc(sx * w * 0.3, -h * 0.45, w * 0.08, 0, Math.PI * 2); c.fill(); }
      c.restore();
    }
    function drawItem(c, g, it, x, y){
      const s = g.laneW * 0.55;
      if(it.kind === 'coin'){
        const sq = Math.abs(Math.cos(t * 5 + it.s));
        c.fillStyle = '#ffcd4d'; c.strokeStyle = OUT; c.lineWidth = 3;
        c.beginPath(); c.ellipse(x, y, s * 0.36 * (0.35 + 0.65 * sq), s * 0.36, 0, 0, Math.PI * 2); c.fill(); c.stroke();
        c.fillStyle = '#fff3b0'; c.beginPath(); c.ellipse(x, y, s * 0.14 * (0.35 + 0.65 * sq), s * 0.18, 0, 0, Math.PI * 2); c.fill();
      } else if(it.kind === 'cone'){
        c.fillStyle = OUT; c.beginPath(); c.roundRect(x - s * 0.5, y + s * 0.2, s, s * 0.22, 4); c.fill();
        c.fillStyle = '#ff8a1f'; c.strokeStyle = OUT; c.lineWidth = 3;
        c.beginPath(); c.moveTo(x, y - s * 0.55); c.lineTo(x + s * 0.36, y + s * 0.26); c.lineTo(x - s * 0.36, y + s * 0.26); c.closePath(); c.fill(); c.stroke();
        c.fillStyle = '#fff'; c.beginPath(); c.moveTo(x - s * 0.16, y - s * 0.12); c.lineTo(x + s * 0.16, y - s * 0.12); c.lineTo(x + s * 0.22, y + s * 0.02); c.lineTo(x - s * 0.22, y + s * 0.02); c.closePath(); c.fill();
      } else if(it.kind === 'barrel'){
        c.fillStyle = '#e8453c'; c.strokeStyle = OUT; c.lineWidth = 3;
        c.beginPath(); c.arc(x, y, s * 0.42, 0, Math.PI * 2); c.fill(); c.stroke();
        c.strokeStyle = '#ffcd4d'; c.lineWidth = 4; c.beginPath(); c.arc(x, y, s * 0.26, 0, Math.PI * 2); c.stroke();
        c.fillStyle = OUT; c.beginPath(); c.arc(x, y, s * 0.08, 0, Math.PI * 2); c.fill();
      } else {
        const col = ['#ffd23f', '#3fd47a', '#c77dff'][it.tint], dk = ['#c99a00', '#1f9a52', '#8a46c4'][it.tint];
        drawCar(c, x, y, g.carW * 0.95, g.carH * 0.95, col, dk, Math.PI, true); // oncoming car, facing the player
      }
    }
    function drawHalf(c, g, pl){
      const car = cars[pl], P = api.players[pl], top = g.hh, H = g.H, W = g.W;
      // grass
      c.fillStyle = '#6cc04a'; c.fillRect(0, top, W, g.hh);
      const scroll = car.P * g.pxs;
      c.fillStyle = '#5aab3b';
      for(let k = -1; k < 12; k++){
        const yy = top + ((k * 70 + scroll) % (g.hh + 70)) - 35;
        c.beginPath(); c.arc(g.rx * 0.35, yy, 12, 0, Math.PI * 2); c.arc(W - g.rx * 0.35, yy + 35, 12, 0, Math.PI * 2); c.fill();
      }
      // road
      c.fillStyle = OUT; c.fillRect(g.rx - 9, top, g.roadW + 18, g.hh);
      c.fillStyle = '#fff'; c.fillRect(g.rx - 5, top, 4, g.hh); c.fillRect(g.rx + g.roadW + 1, top, 4, g.hh);
      c.fillStyle = '#4b5060'; c.fillRect(g.rx, top, g.roadW, g.hh);
      c.fillStyle = 'rgba(255,255,255,.75)';
      const dash = 46, off = scroll % (dash * 2);
      for(const k of [1, 2]){
        const lx = g.rx + g.laneW * k - 3;
        for(let yy = top - dash * 2 + off; yy < H; yy += dash * 2) c.fillRect(lx, Math.max(top, yy), 6, Math.max(0, Math.min(dash, yy + dash - top)));
      }
      // finish line
      const fy = g.carY - (TRACK - car.P) * g.pxs;
      if(fy > top - 30 && fy < H + 30){
        const n = 8, sq = g.roadW / n;
        for(let k = 0; k < n; k++) for(let r = 0; r < 2; r++){ c.fillStyle = (k + r) % 2 ? '#fff' : OUT; c.fillRect(g.rx + k * sq, fy - sq + r * sq / 1, sq, sq / 1); }
      }
      // items
      c.save(); c.beginPath(); c.rect(0, top, W, g.hh); c.clip();
      items.forEach((it, i) => {
        if(car.used.has(i)) return;
        const y = g.carY - (it.s - car.P) * g.pxs;
        if(y < top - 60 || y > H + 60) return;
        drawItem(c, g, it, laneX(g, it.lane), y);
      });
      // player's car
      const cx = car.x == null ? laneX(g, car.lane) : car.x;
      const flick = car.safeT > 0 && car.spinT <= 0 && Math.floor(t * 12) % 2;
      if(!flick) drawCar(c, cx, g.carY, g.carW, g.carH, P.color, P.dark, car.rot, false);
      if(car.spinT > 0) api.emoji(c, '💫', cx, g.carY - g.carH * 0.6, g.carW * 0.8);
      for(const pp of car.pops) api.text(c, '+', pp.x, pp.y, 26, '#ffcd4d', 0);
      c.restore();
      // buttons
      btnPos(g).forEach((b, k) => {
        const down = car.pressed[k] !== null, o = down ? 4 : 0, s = g.btn;
        c.fillStyle = OUT; c.beginPath(); c.roundRect(b.x - s / 2, b.y - s / 2 + 5, s, s, s * 0.28); c.fill();
        c.fillStyle = down ? P.dark : P.color; c.strokeStyle = OUT; c.lineWidth = 4;
        c.beginPath(); c.roundRect(b.x - s / 2, b.y - s / 2 + o, s, s, s * 0.28); c.fill(); c.stroke();
        const d = k === 0 ? -1 : 1;
        c.fillStyle = '#fff'; c.beginPath();
        c.moveTo(b.x + d * s * 0.3, b.y + o); c.lineTo(b.x - d * s * 0.02, b.y - s * 0.26 + o); c.lineTo(b.x - d * s * 0.02, b.y - s * 0.1 + o);
        c.lineTo(b.x - d * s * 0.28, b.y - s * 0.1 + o); c.lineTo(b.x - d * s * 0.28, b.y + s * 0.1 + o); c.lineTo(b.x - d * s * 0.02, b.y + s * 0.1 + o);
        c.lineTo(b.x - d * s * 0.02, b.y + s * 0.26 + o); c.closePath(); c.fill();
      });
      // progress meter (right column, from the player's view)
      const mx = W - g.side / 2, my0 = top + 44, my1 = g.H - g.side - 16, mw = 22;
      if(my1 - my0 > 60){
        c.fillStyle = 'rgba(28,24,56,.55)'; c.beginPath(); c.roundRect(mx - mw / 2 - 5, my0 - 5, mw + 10, my1 - my0 + 10, 14); c.fill();
        c.fillStyle = '#fff7e8'; c.beginPath(); c.roundRect(mx - mw / 2, my0, mw, my1 - my0, 10); c.fill();
        const f = api.clamp(car.P / TRACK, 0, 1), fh = (my1 - my0) * f;
        c.fillStyle = P.color; c.beginPath(); c.roundRect(mx - mw / 2, my1 - fh, mw, fh, 10); c.fill();
        c.strokeStyle = OUT; c.lineWidth = 3; c.beginPath(); c.roundRect(mx - mw / 2, my0, mw, my1 - my0, 10); c.stroke();
        const of = api.clamp(cars[1 - pl].P / TRACK, 0, 1), oy = my1 - (my1 - my0) * of;
        c.fillStyle = api.players[1 - pl].color; c.strokeStyle = OUT; c.lineWidth = 2.5;
        c.beginPath(); c.arc(mx - mw / 2 - 4, oy, 8, 0, Math.PI * 2); c.fill(); c.stroke();
        api.emoji(c, '🏁', mx, my0 - 4, 26);
      }
      // timer (left column)
      const left = Math.max(0, LIMIT - t), tx = g.side / 2, ty = top + 70;
      c.fillStyle = 'rgba(28,24,56,.55)'; c.beginPath(); c.roundRect(tx - 30, ty - 40, 60, 80, 18); c.fill();
      api.emoji(c, '⏰', tx, ty - 16, 24);
      api.text(c, api.AR(Math.ceil(left)), tx, ty + 16, 24, left < 10 ? '#ffcd4d' : '#fff7e8', 0);
      const py = ty + 100, pc = Math.floor(api.clamp(car.P / TRACK, 0, 1) * 100);
      c.fillStyle = 'rgba(28,24,56,.55)'; c.beginPath(); c.roundRect(tx - 36, py - 22, 72, 44, 18); c.fill();
      api.text(c, api.L(api.AR(pc) + '٪', pc + '%', '%' + pc), tx, py, 24, P.light, 0);
    }

    return {
      update(dt){
        t += dt;
        const g = geo();
        for(const car of cars){
          if(car.x == null) car.x = laneX(g, car.lane);
          const tx = laneX(g, car.lane);
          car.x += (tx - car.x) * Math.min(1, dt * 14);
          for(const pp of car.pops){ pp.y -= dt * 60; pp.life -= dt; }
          car.pops = car.pops.filter(pp => pp.life > 0);
          if(over) continue;
          // holding a button repeats the lane change
          const held = car.pressed[0] !== null ? -1 : car.pressed[1] !== null ? 1 : 0;
          if(held){ car.holdT -= dt; if(car.holdT <= 0){ move(car, held); car.holdT = 0.28; } }
          if(car.spinT > 0){
            car.spinT -= dt; car.rot = (1 - Math.max(0, car.spinT) / SPIN) * Math.PI * 4; car.sp = 0.3;
            if(car.spinT <= 0){ car.rot = 0; car.safeT = 0.6; }
          } else {
            car.safeT = Math.max(0, car.safeT - dt);
            car.sp = Math.min(1, car.sp + dt * 0.9);
          }
          car.P += car.sp * dt;
          // collisions
          items.forEach((it, i) => {
            if(car.used.has(i)) return;
            const dy = Math.abs(it.s - car.P) * g.pxs;
            if(dy > g.carH * 0.5 + g.laneW * 0.22) return;
            if(Math.abs(laneX(g, it.lane) - car.x) > g.laneW * 0.62) return;
            if(it.kind === 'coin'){ car.used.add(i); car.P += 0.45; api.sfx.coin(); car.pops.push({ x: car.x, y: g.carY - g.carH * 0.7, life: 0.6 }); }
            else if(car.spinT <= 0 && car.safeT <= 0){ car.used.add(i); car.spinT = SPIN; api.sfx.hit(); api.sfx.splash(); }
          });
        }
        if(over){ overT += dt; if(overT > 0.7) api.win(winner); return; }
        finishCheck();
      },
      pointerDown(p){
        if(over) return;
        const k = hitBtn(p); if(k < 0) return;
        const car = cars[p.player];
        car.pressed[k] = p.id; car.pressed[1 - k] = null; car.holdT = 0.38;
        move(car, k === 0 ? -1 : 1);
      },
      pointerUp(p){
        for(const car of cars) for(let k = 0; k < 2; k++) if(car.pressed[k] === p.id) car.pressed[k] = null;
      },
      draw(c){
        const g = geo();
        for(const pl of [0, 1]){
          c.save();
          if(pl === 1){ c.translate(g.W, g.H); c.rotate(Math.PI); }
          c.beginPath(); c.rect(0, g.hh, g.W, g.hh); c.clip();
          drawHalf(c, g, pl);
          c.restore();
        }
        c.fillStyle = OUT; c.fillRect(0, g.hh - 3, g.W, 6);
      }
    };
  }
});
