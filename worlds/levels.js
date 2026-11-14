/* Bobo Worlds: the worlds. Each one is a short obstacle course (an "obby") built with the kit in index.html:
   B.start / B.box / B.round / B.mover / B.crumble / B.blink / B.spring / B.bar / B.log / B.fan / B.belt / B.cp / B.finish / B.gem / B.sign.
   Route platforms are created in order (they form the path used for help and for tests); side platforms use { path:false }.
   Kid-friendly rules: gaps of 1.5–3 between edges (one jump reaches about 5), big platforms early, slow hazards. */
const PI = Math.PI;
const T3 = (ar, en, tr) => ({ ar, en, tr });

/* ---------- decoration helpers ---------- */
function palm(B, x, y, z, s){
  const lean = B.rnd() * 6.28; let px = x, pz = z, py = y;
  for(let i = 0; i < 5; i++){
    const k = i * .12 * s; B.add('cyl8', px, py + .45 * s, pz, .2 * s, .9 * s, .2 * s, Math.sin(lean) * .12 * i, 0, Math.cos(lean) * .12 * i, i % 2 ? 0xc4935a : 0xb07f48);
    px += Math.cos(lean) * k * .5; pz += Math.sin(lean) * k * .5; py += .86 * s;
  }
  for(let i = 0; i < 6; i++){ const a = i / 6 * PI * 2; B.add('cone4', px + Math.cos(a) * .9 * s, py - .1 * s, pz + Math.sin(a) * .9 * s, .35 * s, 1.9 * s, .12 * s, 0, -a, PI / 2 + .35, 0x3fbf5c); }
  B.add('sph', px, py - .3 * s, pz + .2 * s, .2 * s, .2 * s, .2 * s, 0, 0, 0, 0x8a5a2b);
}
function rockIn(B, x, y, z, s, cols){ B.add('dode', x, y, z, s, s * .8, s * .9, B.rnd(), B.rnd() * 3, B.rnd() * .3, cols[Math.floor(B.rnd() * cols.length)]); }
function islet(B, x, z, r, sand, grass, palms){
  B.add('cyl', x, -.6, z, r, 1.8, r, 0, 0, 0, sand); B.add('cyl', x, .35, z, r * .75, .2, r * .75, 0, 0, 0, grass);
  for(let i = 0; i < palms; i++){ const a = B.rnd() * 6.28, d = B.rnd() * r * .5; palm(B, x + Math.cos(a) * d, .4, z + Math.sin(a) * d, .8 + B.rnd() * .4); }
}
function cloudPuff(B, x, y, z, s, col = 0xffffff){
  B.add('sph', x, y, z, 1.6 * s, 1 * s, 1.3 * s, 0, 0, 0, col);
  B.add('sph', x + 1.3 * s, y - .2 * s, z + .2 * s, 1.1 * s, .8 * s, 1 * s, 0, 0, 0, col);
  B.add('sph', x - 1.2 * s, y - .25 * s, z - .1 * s, 1 * s, .75 * s, .9 * s, 0, 0, 0, col);
  B.add('sph', x + .3 * s, y + .5 * s, z - .2 * s, 1 * s, .8 * s, 1 * s, 0, 0, 0, col);
}
function underPuffs(B, c, col){
  const w = c.type === 'box' ? c.w : c.r * 2, d = c.type === 'box' ? c.d : c.r * 2, y = c.y0 + .1;
  B.add('sph', c.cx, y, c.cz, w * .45, .7, d * .45, 0, 0, 0, col);
  B.add('sph', c.cx + w * .25, y - .25, c.cz - d * .1, w * .3, .55, d * .3, 0, 0, 0, col);
  B.add('sph', c.cx - w * .22, y - .2, c.cz + d * .15, w * .28, .5, d * .3, 0, 0, 0, col);
}
function lollipop(B, x, y, z, s, col){
  B.add('cyl8', x, y + 1.5 * s, z, .08 * s, 3 * s, .08 * s, 0, 0, 0, 0xffffff);
  B.add('cyl', x, y + 3.1 * s, z, .9 * s, .25 * s, .9 * s, PI / 2, B.rnd() * 3, 0, col);
  B.add('cyl', x, y + 3.1 * s, z, .55 * s, .27 * s, .55 * s, PI / 2, 0, 0, 0xffffff);
}
function mushroomTree(B, x, y, z, s, cap){
  B.add('cyl', x, y + 2 * s, z, .45 * s, 4 * s, .45 * s, 0, 0, 0, 0xf4e6cc);
  B.add('hemi', x, y + 3.8 * s, z, 2.2 * s, 1.4 * s, 2.2 * s, 0, 0, 0, cap);
  for(let i = 0; i < 5; i++){ const a = i * 1.26 + B.rnd(), r = 1.3 * s; B.add('sph', x + Math.cos(a) * r, y + 3.8 * s + .9 * s, z + Math.sin(a) * r, .3 * s, .1 * s, .3 * s, 0, 0, 0, 0xffffff); }
}
function pine(B, x, y, z, s, col = 0x2e8b6a, snow){
  B.add('cyl8', x, y + .5 * s, z, .25 * s, 1 * s, .25 * s, 0, 0, 0, 0x7a5233);
  for(let i = 0; i < 3; i++){ B.add('cone', x, y + (1.4 + i * 1.1) * s, z, (1.6 - i * .4) * s, 1.8 * s, (1.6 - i * .4) * s, 0, 0, 0, col); if(snow) B.add('cone', x, y + (1.75 + i * 1.1) * s, z, (1.0 - i * .25) * s, .9 * s, (1.0 - i * .25) * s, 0, 0, 0, 0xffffff); }
}

/* ---------- floors (canvas drawings for the big plane under each course) ---------- */
const drawSea = (x, w) => {
  x.fillStyle = '#d9f2ff'; x.fillRect(0, 0, w, w); x.strokeStyle = 'rgba(255,255,255,.95)'; x.lineWidth = 3; x.lineCap = 'round';
  for(let i = 0; i < 7; i++){ const px = (i * 37) % 128, py = (i * 53) % 128; x.beginPath(); x.arc(px, py, 10 + i % 3 * 4, .3, 1.6); x.stroke(); }
};
const drawCream = (x, w) => {
  x.fillStyle = '#ffd6ea'; x.fillRect(0, 0, w, w);
  const cs = ['#ff5d8f', '#5fd3ff', '#ffd23f', '#7fe0a0', '#b28dff', '#ffffff'];
  for(let i = 0; i < 26; i++){ x.save(); x.translate((i * 47) % 128, (i * 71) % 128); x.rotate(i); x.fillStyle = cs[i % cs.length]; x.fillRect(-5, -1.6, 10, 3.2); x.restore(); }
};
const drawLava = (x, w) => {
  const g = x.createLinearGradient(0, 0, w, w); g.addColorStop(0, '#ff5a1a'); g.addColorStop(.5, '#ff8a1f'); g.addColorStop(1, '#ff4a12'); x.fillStyle = g; x.fillRect(0, 0, w, w);
  x.strokeStyle = 'rgba(255,230,120,.9)'; x.lineWidth = 3;
  for(let i = 0; i < 6; i++){ x.beginPath(); let px = (i * 41) % 128, py = (i * 29) % 128; x.moveTo(px, py); for(let k = 0; k < 4; k++){ px += 10 + (k * 7) % 9; py += (k % 2 ? 9 : -7); x.lineTo(px, py); } x.stroke(); }
  x.fillStyle = 'rgba(120,20,10,.45)'; for(let i = 0; i < 5; i++){ x.beginPath(); x.ellipse((i * 53) % 128, (i * 37 + 20) % 128, 12, 7, i, 0, 6.3); x.fill(); }
};
const drawSwamp = (x, w) => {
  x.fillStyle = '#3f7a5c'; x.fillRect(0, 0, w, w);
  x.fillStyle = '#5fae6e'; for(let i = 0; i < 5; i++){ const px = (i * 43) % 128, py = (i * 61) % 128; x.beginPath(); x.arc(px, py, 9, .4, 6.0); x.lineTo(px, py); x.fill(); }
  x.strokeStyle = 'rgba(200,255,220,.45)'; x.lineWidth = 2; for(let i = 0; i < 5; i++){ x.beginPath(); x.arc((i * 29 + 60) % 128, (i * 45) % 128, 7 + i % 2 * 4, .2, 1.8); x.stroke(); }
};
const drawCloudSea = (x, w) => {
  x.fillStyle = '#e9f3ff'; x.fillRect(0, 0, w, w);
  for(let i = 0; i < 9; i++){ const g = x.createRadialGradient((i * 41) % 128, (i * 67) % 128, 0, (i * 41) % 128, (i * 67) % 128, 26); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, w, w); }
};
const drawIce = (x, w) => {
  x.fillStyle = '#7cc8e8'; x.fillRect(0, 0, w, w);
  x.fillStyle = 'rgba(240,252,255,.85)'; for(let i = 0; i < 6; i++){ const px = (i * 43) % 128, py = (i * 59) % 128; x.beginPath(); x.moveTo(px, py); x.lineTo(px + 14, py + 3); x.lineTo(px + 10, py + 13); x.lineTo(px - 3, py + 10); x.closePath(); x.fill(); }
};

/* ======================= 1. جزيرة القفز — Hop Island (tutorial) ======================= */
const island = {
  id:'island', emoji:'🏝️', name:T3('جزيرة القفز', 'Hop Island', 'Zıplama Adası'),
  sub:T3('منصّات طايرة فوق البحر. هون منتعلّم نمشي وننطّ!', 'Floating platforms over the sea. Learn to walk and jump here!', 'Denizin üstünde uçan platformlar. Burada yürümeyi ve zıplamayı öğren!'),
  card:['#3ad1ff', '#1b8fd6', '#0f5f9a'], par:110, intro:'walk',
  theme:{ plat:0xe9c98a, cap:0x7fd65a, mover:0xff8fb8, skyTop:0x3d9bff, skyHor:0xc8ecff, skyBot:0x8fd6ff, hemiGround:0x5f8a3c,
    floor:{ y:0, color:0x3fc8f0, draw:drawSea, rep:90, opacity:.9, flow:[.01, .006] }, splash:[0x7fd0ff, 0xffffff] },
  death:'splash', view:{ x:0, y:26, z:-52, r:52, ly:2 },
  build(B){
    const S = 0xf6dc9c, GR = 0x7fd65a;
    B.start(0, 1, 0, 11, 11, { round:true, yaw:PI, col:S, cap:GR });
    palm(B, -3.6, 1, 2.6, 1); palm(B, 3.8, 1, 1.5, .9); palm(B, -2.5, 1, -3, .7);
    B.sign(0, 0, 3, 'walk'); B.sign(0, -4.2, 1.8, 'jumpBtn');
    B.box(0, 1, -9.5, 4, 4); B.sign(0, -9.5, 2, 'jump');
    B.box(0, 1, -15, 3.5, 3.5);
    B.box(0, 1.8, -20.5, 3.5, 3.5); B.sign(0, -15, 1.6, 'up');
    B.box(0, 2.6, -26, 3.5, 3.5);
    B.box(4.2, 2.6, -26, 2, 2, { path:false }); B.gem(4.2, 3.7, -26); B.sign(0, -25, 2.2, 'gemHint');
    B.cp(0, 2.6, -32.5, 5, 5);
    B.box(-3.2, 2.6, -38.5, 3, 3);
    B.box(1, 2.6, -43, 3, 3);
    B.box(-2.5, 3.4, -47.5, 3, 3);
    B.round(1, 4.2, -52, 1.7);
    B.round(-2, 5, -56.5, 1.7);
    B.round(0, 5, -61, 1.3); B.round(0, 5, -65, 1.3); B.round(0, 5, -69, 1.3);
    B.box(3.6, 6.6, -65, 1.6, 1.6, { path:false }); B.gem(3.6, 7.6, -65);
    B.cp(0, 5, -75, 5, 5); B.sign(0, -76, 2.2, 'mover');
    B.mover(0, 5, -82, 3, 3, { axis:'x', amp:3, speed:.9 });
    B.box(0, 5, -88, 3.5, 3.5);
    B.mover(0, 5.5, -94, 3, 3, { axis:'y', amp:1.2, speed:1 });
    B.box(0, 7.5, -100, 3.5, 3.5); B.gem(0, 11.5, -100); B.sign(0, -100, 1.6, 'djump');
    B.finish(0, 7.5, -107, 3.8); B.sign(0, -101.5, 1.4, 'finishSoon');
    // scenery: little islands, rocks in the sea, far islands
    [[-14, -20, 5, 2], [15, -45, 6, 3], [-16, -70, 4.5, 2], [14, -98, 5, 2], [-20, -112, 7, 3], [22, -8, 5, 2]].forEach(([x, z, r, n]) => islet(B, x, z, r, S, GR, n));
    for(let i = 0; i < 22; i++){ const x = (B.rnd() - .5) * 60, z = -B.rnd() * 120 + 6; if(Math.abs(x) < 7) continue; rockIn(B, x, .1, z, .5 + B.rnd() * .9, [0xa8a3b8, 0x9b96ad, 0xb6b0c4]); }
    for(let i = 0; i < 8; i++){ const a = i / 8 * 6.28, r = 110 + B.rnd() * 30; B.add('cone', Math.cos(a) * r, 6, -50 + Math.sin(a) * r, 18, 16, 18, 0, B.rnd(), 0, 0x5fbf7a); }
    for(let i = 0; i < 9; i++) cloudPuff(B, (B.rnd() - .5) * 120, 26 + B.rnd() * 10, -B.rnd() * 140 + 10, 2 + B.rnd() * 2);
  }
};

/* ======================= 2. برج الحلوى — Candy Tower (spiral climb with moving platforms) ======================= */
const R2 = 9.5, STEP = .42, RISE = .85;
const pos2 = n => [R2 * Math.sin(n * STEP), 1 + n * RISE, R2 * Math.cos(n * STEP)];
const candy = {
  id:'candy', emoji:'🍭', name:T3('برج الحلوى', 'Candy Tower', 'Şeker Kulesi'),
  sub:T3('اطلع لراس برج الكيك! في منصّات بتتحرّك، انتبه.', 'Climb to the top of the cake tower! Some platforms move — careful.', 'Pasta kulesinin tepesine tırman! Bazı platformlar hareket ediyor, dikkat.'),
  card:['#ff9ad0', '#c56bff', '#8a3fc0'], par:150, intro:'candy', fallLimit:6,
  theme:{ plat:0xc98a4b, cap:0xf3d7a8, mover:0x7fe0c4, skyTop:0xb98cff, skyHor:0xffd8ee, skyBot:0xffb3d9, hemiSky:0xfff0fa, hemiGround:0xb06a9a,
    floor:{ y:-1, color:0xffffff, draw:drawCream, rep:70 }, splash:[0xffd6ea, 0xffffff, 0xff5d8f] },
  death:'poof', killY:-.6, camOrbit:{ x:0, z:0, lead:.85 }, view:{ x:0, y:28, z:0, r:34, ly:12 },
  build(B){
    const N = 34, cols = [[0xc98a4b, 0xf3d7a8], [0xff6fae, 0xffc2dd], [0x7fe0c4, 0xd7fff1], [0xffd23f, 0xfff2b0], [0xb28dff, 0xe6d9ff]];
    const p1 = pos2(1);
    B.start(0, 1, 12.5, 7, 7, { round:true, yaw:Math.atan2(p1[0], p1[2] - 12.5), col:0xff9ec7, cap:0xfff1dc });
    const top = 1 + N * RISE + .85;
    // the cake tower (collider for walls + camera), drawn as layers with icing
    B.round(0, top - .03, 0, 6, { h:top + 2, path:false, cam:true, invisible:true });
    const bands = [0xff9ec7, 0xfff1dc, 0x8a4b2a, 0xffc2dd, 0xfff1dc, 0x7fe0c4];
    for(let y = -1, i = 0; y < top; y += 3, i++){
      const h = Math.min(3, top - y);
      B.add('cyl', 0, y + h / 2, 0, 6, h, 6, 0, 0, 0, bands[i % bands.length]);
      for(let k = 0; k < 14; k++){ const a = k / 14 * 6.28 + i; B.add('sph', Math.sin(a) * 5.95, y + h - .1 - (k % 3) * .25, Math.cos(a) * 5.95, .45, .7 + (k % 3) * .25, .45, 0, 0, 0, 0xffffff); }
    }
    B.add('cyl', 0, top - .05, 0, 6.3, .3, 6.3, 0, 0, 0, 0xffffff);
    B.add('sph', 3.4, top + .7, -2.6, .7, .7, .7, 0, 0, 0, 0xe8304a); B.add('cyl8', 3.5, top + 1.6, -2.5, .05, 1.2, .05, .3, 0, .2, 0x3f9f3f);
    const movers = { 6:'t', 13:'t', 16:'y', 22:'t', 30:'y' }, cps = { 9:1, 18:1, 27:1 }, gems = { 5:1, 15:1, 24:1 };
    for(let n = 1; n <= N; n++){
      const [x, y, z] = pos2(n), c = cols[n % cols.length];
      if(cps[n]) B.cp(x, y, z, 4.6, 4.6, { round:true, col:0xff9ec7, cap:0xfff1dc });
      else if(movers[n] === 't'){ const a = n * STEP, ax = Math.abs(Math.cos(a)) > Math.abs(Math.sin(a)) ? 'x' : 'z'; B.mover(x, y, z, 2.7, 2.7, { round:true, axis:ax, amp:1.3, speed:.9, col:0x7fe0c4 }); }
      else if(movers[n] === 'y') B.mover(x, y, z, 2.7, 2.7, { round:true, axis:'y', amp:.9, speed:1, col:0xb28dff });
      else B.round(x, y, z, 1.4, { col:c[0], cap:c[1] });
      if(gems[n]){ const a = n * STEP, gx = 12.9 * Math.sin(a), gz = 12.9 * Math.cos(a); B.round(gx, y + .6, gz, 1.1, { path:false, col:0xff6fae, cap:0xffc2dd }); B.gem(gx, y + 1.7, gz); }
      if(n === 3) B.sign(x, z, 2, 'up');
      if(n === 5) B.sign(x, z, 2, 'moving');
    }
    B.finish(0, top, 0, 4.6);
    for(let i = 0; i < 26; i++){ const a = B.rnd() * 6.28, r = 18 + B.rnd() * 40; lollipop(B, Math.cos(a) * r, -1, Math.sin(a) * r, 1 + B.rnd() * 1.6, [0xff5d8f, 0x5fd3ff, 0xffd23f, 0x7fe0a0, 0xb28dff][i % 5]); }
    for(let i = 0; i < 30; i++){ const a = B.rnd() * 6.28, r = 16 + B.rnd() * 45; B.add('cone', Math.cos(a) * r, -.2, Math.sin(a) * r, 1.4, 2, 1.4, 0, 0, 0, [0xff6fae, 0x7fe0c4, 0xffd23f, 0xb28dff][i % 4]); }
    for(let i = 0; i < 10; i++) cloudPuff(B, (B.rnd() - .5) * 140, 34 + B.rnd() * 14, (B.rnd() - .5) * 140, 2.5 + B.rnd() * 2, 0xffeaf6);
  }
};

/* ======================= 3. أرض الحمم — Lava Land (floor is lava) ======================= */
const lava = {
  id:'lava', emoji:'🌋', name:T3('أرض الحمم', 'Lava Land', 'Lav Diyarı'),
  sub:T3('الأرض حمم! بلاط بيوقع، وعصيان بتلفّ.', 'The floor is lava! Falling tiles and spinning bars.', 'Yer lav! Düşen fayanslar ve dönen çubuklar.'),
  card:['#ff9a3c', '#e8384f', '#8f1d33'], par:165, intro:'lava',
  theme:{ plat:0x4a4256, cap:0x6e6582, mover:0xff9a3c, crumble:0xc8743e, blink:0x6fd8ff, hazard:0xff5d3a, hazard2:0xffd23f,
    skyTop:0x2a1240, skyHor:0xff8a5c, skyBot:0xff6a2a, hemiSky:0xffd2b0, hemiGround:0x6a2a3a, sunCol:0xffc890, sunI:1.8, glow:0xff9a5c, flat:true,
    floor:{ y:0, color:0xffffff, draw:drawLava, rep:50, glow:true, flow:[.012, .02] }, fogNear:50, fogFar:190, embers:true },
  death:'lava', killY:.3, view:{ x:0, y:24, z:-55, r:50, ly:3 },
  build(B){
    B.start(0, 2, 0, 6, 6, { yaw:PI });
    B.box(0, 2, -7, 3, 3);
    B.box(0, 2.5, -12.5, 3, 3); B.sign(0, -13, 2, 'crumble');
    const rows = [-17, -19.4, -21.8, -24.2, -26.6];
    rows.forEach((z, r) => { for(const x of [-2.4, 0, 2.4]) B.crumble(x, 2.5, z, 2.2, 2.2, { path:x === 0 }); });
    B.gem(-2.4, 3.7, -21.8);
    B.cp(0, 2.5, -32.5, 5, 5); B.sign(0, -33, 2, 'bars');
    B.round(0, 2.5, -40.5, 4.2); B.bar(0, 2.95, -40.5, 3.9, 1.0); B.round(0, 3.7, -40.5, .38, { path:false, h:1.2, invisible:true });
    B.box(0, 2.5, -48, 2.6, 2.6);
    B.round(0, 2.5, -55, 4.2); B.bar(0, 2.95, -55, 3.9, -1.05, { ph:1.2 }); B.round(0, 3.7, -55, .38, { path:false, h:1.2, invisible:true });
    B.box(5.6, 3.3, -55, 1.8, 1.8, { path:false }); B.gem(5.6, 4.4, -55);
    B.cp(0, 2.5, -64, 5, 5); B.sign(0, -65, 2, 'blink');
    [-70, -73.5, -77, -80.5, -84, -87.5].forEach((z, i) => B.blink(0, 2.5, z, 2.6, 2.6, { period:4, on:2.8, offset:i % 2 ? 2 : 0 }));
    B.gem(0, 5.0, -80.5);
    B.mover(0, 2.5, -93, 3, 3, { axis:'x', amp:2.5, speed:.85 });
    B.box(0, 2.5, -99, 3, 3);
    B.mover(0, 3.5, -104.5, 3, 3, { axis:'y', amp:1, speed:1 });
    B.finish(0, 4.5, -111, 3.6);
    // scenery: basalt columns, rocks, a volcano
    for(let i = 0; i < 40; i++){ const x = (B.rnd() - .5) * 70, z = 10 - B.rnd() * 130; if(Math.abs(x) < 7) continue; const h = 1 + B.rnd() * 6; B.add('cyl8', x, h / 2 - .5, z, .8 + B.rnd(), h, .8 + B.rnd(), 0, B.rnd(), 0, [0x3e3650, 0x4a4256, 0x2f2a3e][i % 3]); }
    for(let i = 0; i < 18; i++){ const x = (B.rnd() - .5) * 50, z = 6 - B.rnd() * 120; if(Math.abs(x) < 6) continue; rockIn(B, x, .3, z, .6 + B.rnd(), [0x3e3650, 0x5a5470]); }
    B.add('cone', 0, 14, -175, 60, 34, 60, 0, 0, 0, 0x3a2f48); B.add('cyl', 0, 31.2, -175, 9, .6, 9, 0, 0, 0, 0xff7a1a);
    B.add('cone', -70, 8, -140, 35, 20, 35, 0, 0, 0, 0x2f2a3e); B.add('cone', 80, 9, -130, 40, 22, 40, 0, 0, 0, 0x2f2a3e);
  }
};

/* ======================= 4. غابة الفطر — Mushroom Forest (trampolines + swinging logs) ======================= */
const mushroom = {
  id:'mushroom', emoji:'🍄', name:T3('غابة الفطر', 'Mushroom Forest', 'Mantar Ormanı'),
  sub:T3('نطّ عالفطر الزهري ليطيّرك، وانتبه عالجذوع اللي بتتمرجح!', 'Bounce on the pink mushrooms and watch out for swinging logs!', 'Pembe mantarlarda zıpla, sallanan kütüklere dikkat et!'),
  card:['#7fe08a', '#2fa36b', '#1b6a4a'], par:165, intro:'mush',
  theme:{ plat:0x8a5a34, cap:0x6fcf6a, mover:0xffb347, spring:0xff6fae, skyTop:0x2f8f8a, skyHor:0xd8ffd0, skyBot:0x9fe0b0, hemiSky:0xeaffea, hemiGround:0x3f6a3a,
    floor:{ y:0, color:0xffffff, draw:drawSwamp, rep:60, opacity:.95, flow:[.004, .003] }, splash:[0x5fae6e, 0xd8ffd0], fogNear:45, fogFar:170 },
  death:'splash', killY:.2, view:{ x:0, y:26, z:-52, r:46, ly:8 },
  build(B){
    const STUMP = 0x8a5a34, MOSS = 0x6fcf6a;
    B.start(0, 1.5, 0, 9, 9, { round:true, yaw:PI });
    B.spring(0, 1.5, -8, 1.8, 16, { mushroom:true });
    B.round(0, 4.5, -14, 2.2, { col:STUMP, cap:MOSS });
    B.round(4.6, 4.5, -14, 1.2, { path:false, col:STUMP, cap:MOSS }); B.gem(4.6, 5.6, -14);
    B.spring(0, 4.5, -20.4, 1.8, 16, { mushroom:true });
    B.cp(0, 7.5, -27, 4, 5, { col:STUMP, cap:MOSS }); B.sign(0, -28.5, 2, 'logs');
    // branch bridge with low rails and three swinging logs (timed like a wave so a steady walk gets through)
    const bz0 = -32, bz1 = -50;
    B.box(0, 7.5, (bz0 + bz1) / 2, 2.8, bz0 - bz1, { col:0x7a4e2c, cap:0x9a6a3c });
    for(const s of [-1, 1]){ B.box(s * 1.55, 8.8, (bz0 + bz1) / 2, .3, bz0 - bz1, { path:false, h:1.3, col:0x6b4a2b, cap:0x8a6a44 }); }
    [-36, -41, -46].forEach((z, k) => B.log(0, 11.9, z, 3.4, 1.05, 1.7, { len:1.6, ph:-1.7 * ((-32 - z) / 4.5) + k * .35 }));
    B.gem(0, 9.7, -41);
    B.round(0, 7.5, -54.5, 2.2, { col:STUMP, cap:MOSS });
    B.spring(0, 7.5, -61, 1.8, 16, { mushroom:true });
    B.cp(0, 11, -67, 6.4, 6.4, { round:true, col:0xfff1dc, cap:0xff8fb8 });
    B.spring(-5.1, 11, -67, 1.3, 18, { mushroom:true, path:false, col:0xb28dff }); B.gem(-5.1, 16.8, -67);
    B.round(-3, 11, -73, 1.6, { col:STUMP, cap:MOSS });
    B.round(0, 11.8, -78, 1.6, { col:STUMP, cap:MOSS });
    B.spring(3, 11.8, -83, 1.6, 16, { mushroom:true });
    B.box(3, 15.5, -88, 3, 3, { col:STUMP, cap:MOSS });
    B.box(3, 15.5, -95, 2.8, 8, { col:0x7a4e2c, cap:0x9a6a3c });
    for(const s of [-1, 1]) B.box(3 + s * 1.55, 16.8, -95, .3, 8, { path:false, h:1.3, col:0x6b4a2b, cap:0x8a6a44 });
    B.log(3, 19.9, -95, 3.4, 1.05, 1.6, { len:1.6 });
    B.finish(3, 15.5, -103.5, 3.6);
    // stems under the high platforms + forest
    B.add('cyl', 0, 2, -27, 1.2, 5.5, 1.2, 0, 0, 0, 0x7a4e2c); B.add('cyl', 0, 5, -67, 1.1, 11, 1.1, 0, 0, 0, 0xf4e6cc);
    B.add('cyl', 3, 7.5, -88, 1, 15, 1, 0, 0, 0, 0x7a4e2c); B.add('cyl', 3, 7.5, -103.5, 1.2, 15, 1.2, 0, 0, 0, 0x7a4e2c);
    B.add('cyl', 0, 3.5, -54.5, 1, 7, 1, 0, 0, 0, 0x7a4e2c); B.add('cyl', -3, 5.5, -73, .8, 11, .8, 0, 0, 0, 0x7a4e2c); B.add('cyl', 0, 6, -78, .8, 12, .8, 0, 0, 0, 0x7a4e2c);
    B.add('cyl', 0, 2.3, -14, .9, 4.5, .9, 0, 0, 0, 0x7a4e2c);
    for(let i = 0; i < 34; i++){ const x = (B.rnd() < .5 ? -1 : 1) * (9 + B.rnd() * 30), z = 8 - B.rnd() * 125; mushroomTree(B, x, 0, z, 1 + B.rnd() * 1.8, [0xff6fae, 0xff9a3c, 0xb28dff, 0xffd23f, 0xe8384f][i % 5]); }
    for(let i = 0; i < 26; i++){ const x = (B.rnd() < .5 ? -1 : 1) * (14 + B.rnd() * 40), z = 10 - B.rnd() * 130; pine(B, x, 0, z, 1.6 + B.rnd() * 1.5, [0x2e8b6a, 0x3fa36b, 0x24745a][i % 3]); }
    for(let i = 0; i < 16; i++){ const x = (B.rnd() - .5) * 40, z = 4 - B.rnd() * 110; if(Math.abs(x) < 5) continue; B.add('cyl', x, .05, z, .9 + B.rnd(), .1, .9 + B.rnd(), 0, 0, 0, 0x5fae6e); }
  }
};

/* ======================= 5. مدينة الغيوم — Cloud City (belts, fans, big finish) ======================= */
const clouds = {
  id:'clouds', emoji:'☁️', name:T3('مدينة الغيوم', 'Cloud City', 'Bulut Şehri'),
  sub:T3('أحزمة بتمشّيك، ومراوح بتطيّرك لفوق، ونهاية كبيرة!', 'Moving belts, fans that blow you up high, and a big finish!', 'Seni taşıyan bantlar, yukarı uçuran vantilatörler ve büyük final!'),
  card:['#9fd8ff', '#5f8fff', '#3a5fc0'], par:180, intro:'clouds',
  theme:{ plat:0xdfe8ff, cap:0xffffff, mover:0xffcd4d, blink:0xb6e3ff, skyTop:0x4f8fff, skyHor:0xe8f6ff, skyBot:0xffffff, hemiSky:0xffffff, hemiGround:0x9fb8e0,
    floor:{ y:-6, color:0xffffff, draw:drawCloudSea, rep:40, flow:[.004, .002] }, fogNear:70, fogFar:240, fireworks:true },
  death:'poof', killY:-4.5, view:{ x:0, y:30, z:-58, r:52, ly:9 },
  build(B){
    const puffs = [], P = c => { puffs.push(c); return c; };
    P(B.start(0, 2, 0, 6, 6, { yaw:PI }));
    P(B.box(0, 2, -7, 3, 3)); B.sign(0, -7, 1.6, 'belt');
    B.belt(0, 2, -15, 3, 8, 0, -2.5);
    P(B.box(0, 2, -23, 3, 3));
    B.belt(0, 2, -31, 3, 8, 0, 2.5);
    P(B.box(0, 2, -37.5, 3, 2.5));
    B.belt(0, 2, -44, 5, 8, 1.6, 0);
    P(B.box(5.2, 3.5, -44, 2, 2, { path:false })); B.gem(5.2, 4.6, -44);
    P(B.cp(0, 2, -51, 5, 5)); B.sign(0, -52, 2, 'fan');
    const f1 = P(B.box(0, 2, -58, 4, 4)); f1.fanAssist = true; B.fan(0, 2, -58, 1.6, 9);
    B.gem(0, 12.2, -58);
    P(B.box(0, 10, -63, 3, 3));
    P(B.box(0, 10, -68.5, 3, 3));
    const f2 = P(B.box(0, 10, -74.5, 4, 4)); f2.fanAssist = true; B.fan(0, 10, -74.5, 1.6, 8);
    P(B.cp(0, 17, -80.5, 5, 5)); B.sign(0, -82, 2, 'moving');
    B.mover(0, 17, -87, 3, 3, { axis:'x', amp:2.5, speed:.85, col:0xffcd4d });
    P(B.box(0, 17, -93, 3, 3));
    B.blink(0, 17, -97.5, 2.6, 2.6, { period:4, on:2.8, offset:0 });
    B.blink(0, 17, -101.5, 2.6, 2.6, { period:4, on:2.8, offset:2 });
    B.gem(0, 19.4, -101.5);
    B.mover(0, 18, -107, 3, 3, { axis:'y', amp:1, speed:1, col:0xffcd4d });
    const fin = B.finish(0, 19, -114.5, 5); P(fin);
    puffs.forEach(c => underPuffs(B, c, 0xffffff));
    // the golden finish island
    B.add('cone', 0, 15.5, -114.5, 5, 7, 5, PI, 0, 0, 0xffe38a);
    for(let i = 0; i < 8; i++){ const a = i / 8 * 6.28; B.add('sph', Math.cos(a) * 4.6, 18.7, -114.5 + Math.sin(a) * 4.6, .35, .35, .35, 0, 0, 0, 0xffcd4d); }
    // sky city: towers with domes rising from the cloud sea, floating balloons
    const pastel = [0xffc2dd, 0xb6e3ff, 0xd9c8ff, 0xfff0b0, 0xc8f5dd];
    for(let i = 0; i < 26; i++){
      const x = (B.rnd() < .5 ? -1 : 1) * (12 + B.rnd() * 40), z = 10 - B.rnd() * 140, h = 10 + B.rnd() * 22, r = 2 + B.rnd() * 2.5, c = pastel[i % pastel.length];
      B.add('cyl', x, -6 + h / 2, z, r, h, r, 0, 0, 0, c); B.add('hemi', x, -6 + h, z, r * 1.05, r * 1.1, r * 1.05, 0, 0, 0, [0xffcd4d, 0x5f8fff, 0xff8fb8][i % 3]);
      for(let k = 1; k < h / 3; k++) B.add('box', x, -6 + k * 3, z + r * .98, r * .5, .9, .1, 0, 0, 0, 0x5a6aa0);
      B.add('cyl8', x, -6 + h + r * 1.1 + .6, z, .06, 1.2, .06, 0, 0, 0, 0xffffff);
    }
    for(let i = 0; i < 7; i++){ const x = (B.rnd() < .5 ? -1 : 1) * (10 + B.rnd() * 25), z = -B.rnd() * 120, y = 8 + B.rnd() * 18, c = [0xff5d73, 0xffcd4d, 0x5fb8ff, 0x5fe3b1][i % 4];
      B.add('sph', x, y, z, 2, 2.4, 2, 0, 0, 0, c); B.add('box', x, y - 3.4, z, .9, .7, .9, 0, 0, 0, 0x9a6a3c); for(const s of [-1, 1]) B.add('cyl8', x + s * .4, y - 2.4, z, .03, 1.6, .03, 0, 0, 0, 0x6b4a2b); }
    for(let i = 0; i < 16; i++) cloudPuff(B, (B.rnd() - .5) * 150, -4 + B.rnd() * 3, 20 - B.rnd() * 170, 3 + B.rnd() * 3);
    for(let i = 0; i < 8; i++) cloudPuff(B, (B.rnd() - .5) * 160, 34 + B.rnd() * 12, -B.rnd() * 160, 2 + B.rnd() * 2);
  }
};

/* ======================= 6. مملكة الثلج — Snow Kingdom (slippery ice) ======================= */
const ice = {
  id:'ice', emoji:'❄️', name:T3('مملكة الثلج', 'Snow Kingdom', 'Kar Krallığı'),
  sub:T3('الأرض زلقة! امشِ على مهلك ولا تتزحلق عالمي.', 'Slippery ice! Go slowly so you don\'t slide into the water.', 'Kaygan buz! Suya kaymamak için yavaş git.'),
  card:['#d9f4ff', '#7cc8e8', '#3f8fb8'], par:150, intro:'ice',
  theme:{ plat:0x9fd8f0, cap:0xf2fbff, mover:0x8fb8ff, skyTop:0x7fb8ff, skyHor:0xf0f8ff, skyBot:0xe0f4ff, hemiSky:0xffffff, hemiGround:0x8fb0d0,
    floor:{ y:0, color:0xffffff, draw:drawIce, rep:60, flow:[.003, .002] }, splash:[0x9fe0ff, 0xffffff] },
  death:'splash', killY:.2, view:{ x:0, y:24, z:-45, r:44, ly:3 },
  build(B){
    B.start(0, 2, 0, 6, 6, { yaw:PI, kind:'ice' });
    B.box(0, 2, -8.5, 4, 6, { kind:'ice' });
    B.box(0, 2, -17, 4, 6, { kind:'ice' });
    B.box(2.5, 2.8, -24, 3, 3);
    B.box(4.8, 2.8, -24, 1.6, 1.6, { path:false });
    B.box(-3, 3.6, -24.5, 2, 2, { path:false }); B.gem(-3, 4.7, -24.5);
    B.cp(0, 2.8, -30.5, 5, 5, { kind:'ice' });
    B.mover(0, 2.8, -37.3, 3, 3, { axis:'x', amp:2, speed:.85 });
    B.box(0, 2.8, -43.2, 3.5, 3.5, { kind:'ice' });
    B.box(-2.5, 2.8, -51, 3, 7, { kind:'ice' });
    B.box(2, 2.8, -58.5, 3, 5, { kind:'ice' }); B.gem(2, 4.1, -58.5);
    B.cp(0, 3.6, -65.5, 5, 5);
    B.box(-2.5, 3.6, -72, 3, 3, { kind:'ice' });
    B.mover(0, 3.6, -78, 3, 3, { axis:'z', amp:1.2, speed:1 });
    B.box(2.5, 4.4, -84, 3, 3, { kind:'ice' }); B.gem(2.5, 7.4, -84);
    B.box(0, 5.2, -89.5, 3, 3, { kind:'ice' });
    B.finish(0, 5.2, -96.5, 3.6);
    // snowy scenery: icebergs, pines with snow, snowmen
    for(let i = 0; i < 24; i++){ const x = (B.rnd() < .5 ? -1 : 1) * (8 + B.rnd() * 35), z = 6 - B.rnd() * 115; B.add('cone4', x, 1, z, 2 + B.rnd() * 3, 3 + B.rnd() * 6, 2 + B.rnd() * 3, 0, B.rnd() * 3, 0, [0xe8f8ff, 0xc8ecff, 0xffffff][i % 3]); }
    for(let i = 0; i < 18; i++){ const x = (B.rnd() < .5 ? -1 : 1) * (18 + B.rnd() * 30), z = 6 - B.rnd() * 120; B.add('cyl', x, .3, z, 3, .8, 3, 0, 0, 0, 0xffffff); pine(B, x, .6, z, 1.4 + B.rnd(), 0x2e7d6a, true); }
    for(const [x, z] of [[-2, 2.2], [14, -40], [-15, -80]]){ const y = x === -2 ? 2 : .7; B.add('sph', x, y + .6, z, .7, .7, .7, 0, 0, 0, 0xffffff).add('sph', x, y + 1.5, z, .5, .5, .5, 0, 0, 0, 0xffffff).add('cone', x, y + 1.5, z + .5, .08, .35, .08, PI / 2, 0, 0, 0xff8a2a).add('cyl', x, y + 2.05, z, .35, .4, .35, 0, 0, 0, 0x2a2a3a); }
    for(let i = 0; i < 8; i++) cloudPuff(B, (B.rnd() - .5) * 120, 26 + B.rnd() * 10, -B.rnd() * 130, 2 + B.rnd() * 2);
  }
};

export const WORLDS = [island, candy, lava, mushroom, clouds, ice];
