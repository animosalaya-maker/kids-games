/* «حديقة الحارة»: every texture is painted on a canvas at start (no image files).
   Grey interlocking pavers, grass with fallen autumn leaves, the round blue rubber floor with its painted moon, stars and
   the red-brown ring, dark stacked-stone retaining wall, concrete cap, the black iron railing with heart ornaments
   (alpha), tree-pit bricks, asphalt, building facades (terracotta, cream, grey with a blue zigzag band, grey-green with
   teal balconies) with a matching night-window map, red roof tiles, climbing panels with round holes, the perforated
   black stair, decorative arch panels and the activity panels. No text, no signs. */
export function makeTextures(THREE, maxAniso = 4){
  let seed = 7771;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  function cv(w, h, draw){ const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); draw(x, w, h); return c; }
  function tex(c, rep = true, srgb = true){
    const t = new THREE.CanvasTexture(c);
    if(srgb) t.colorSpace = THREE.SRGBColorSpace;
    if(rep){ t.wrapS = t.wrapT = THREE.RepeatWrapping; }
    t.anisotropy = maxAniso; t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter;
    return t;
  }
  const noise = (x, w, h, a, n = 2000, size = 2) => { for(let i = 0; i < n; i++){ x.fillStyle = `rgba(${rnd() < .5 ? '0,0,0' : '255,255,255'},${a * rnd()})`; x.fillRect(rnd() * w, rnd() * h, size, size); } };
  const leaf = (x, cx, cy, s, a) => {
    const cols = ['#d9a23a', '#c9772a', '#e8c04a', '#a8642a', '#8a5226', '#d98a3a', '#b9a040'];
    x.save(); x.translate(cx, cy); x.rotate(a); x.fillStyle = cols[(rnd() * cols.length) | 0];
    x.beginPath(); x.ellipse(0, 0, s, s * .55, 0, 0, 7); x.fill();
    x.strokeStyle = 'rgba(80,50,20,.35)'; x.lineWidth = 1; x.beginPath(); x.moveTo(-s, 0); x.lineTo(s, 0); x.stroke(); x.restore();
  };
  const T = { cv, tex };

  /* grey interlocking pavers (rectangles in a stretcher/herringbone mix like the park paths); 512 px = 2 m */
  T.pavers = tex(cv(512, 512, (x, w, h) => {
    x.fillStyle = '#77797d'; x.fillRect(0, 0, w, h);
    const bw = 64, bh = 32;
    for(let r = 0; r < h / bh; r++) for(let c = -1; c < w / bw + 1; c++){
      const ox = (r % 2) * bw / 2, X = c * bw + ox, Y = r * bh;
      const g = 168 + (rnd() * 30 - 15) | 0, tint = rnd() < .15 ? 8 : 0;
      x.fillStyle = `rgb(${g + tint},${g + tint},${g + 4})`;
      x.beginPath(); x.roundRect ? x.roundRect(X + 2, Y + 2, bw - 4, bh - 4, 5) : x.rect(X + 2, Y + 2, bw - 4, bh - 4); x.fill();
      x.fillStyle = 'rgba(255,255,255,.08)'; x.fillRect(X + 4, Y + 3, bw - 8, 3);
      // I-shape notch of the interlocking stone
      x.fillStyle = '#77797d'; x.fillRect(X + bw / 2 - 2, Y + 2, 4, 5); x.fillRect(X + bw / 2 - 2, Y + bh - 7, 4, 5);
    }
    noise(x, w, h, .12, 6000, 2);
    x.fillStyle = 'rgba(90,110,60,.18)'; for(let i = 0; i < 40; i++) x.fillRect(rnd() * w, rnd() * h, 6 + rnd() * 20, 2); // moss in the joints
    for(let i = 0; i < 26; i++) leaf(x, rnd() * w, rnd() * h, 5 + rnd() * 5, rnd() * 6);
  }));
  /* concrete curb / cap */
  T.concrete = tex(cv(256, 128, (x, w, h) => {
    x.fillStyle = '#b9b6ae'; x.fillRect(0, 0, w, h); noise(x, w, h, .18, 3000, 2);
    x.fillStyle = 'rgba(0,0,0,.12)'; for(let i = 0; i < w; i += 128) x.fillRect(i, 0, 2, h);
    x.fillStyle = 'rgba(70,90,50,.15)'; x.fillRect(0, h - 14, w, 14);
  }));
  /* grass with fallen autumn leaves and a few bare patches; 512 px = 4 m */
  T.grass = tex(cv(512, 512, (x, w, h) => {
    x.fillStyle = '#4f7a2e'; x.fillRect(0, 0, w, h);
    for(let i = 0; i < 70; i++){ x.fillStyle = `rgba(${rnd() < .5 ? '96,140,52' : '62,98,34'},.35)`; x.beginPath(); x.ellipse(rnd() * w, rnd() * h, 20 + rnd() * 60, 12 + rnd() * 40, rnd() * 3, 0, 7); x.fill(); }
    for(let i = 0; i < 9; i++){ x.fillStyle = 'rgba(120,98,60,.25)'; x.beginPath(); x.ellipse(rnd() * w, rnd() * h, 10 + rnd() * 30, 8 + rnd() * 16, rnd() * 3, 0, 7); x.fill(); }
    for(let i = 0; i < 4000; i++){ x.fillStyle = rnd() < .5 ? 'rgba(120,170,70,.5)' : 'rgba(40,70,25,.5)'; x.fillRect(rnd() * w, rnd() * h, 1.5, 4); }
    for(let i = 0; i < 70; i++) leaf(x, rnd() * w, rnd() * h, 4 + rnd() * 4, rnd() * 6);
  }));
  /* the playground's round blue rubber floor, one picture for the whole circle (u,v = x,z across the circle) */
  T.rubber = tex(cv(1024, 1024, (x, w, h) => {
    const C = w / 2;
    x.fillStyle = '#5f86c2'; x.fillRect(0, 0, w, h);
    const g = x.createRadialGradient(C, C, 100, C, C, C); g.addColorStop(0, 'rgba(255,255,255,.0)'); g.addColorStop(1, 'rgba(255,255,255,.12)'); x.fillStyle = g; x.fillRect(0, 0, w, h);
    // red-brown rubber ring path with a yellow-green inside (under the yellow slide, east side)
    const rx = C + 300, ry = C - 120;
    x.fillStyle = '#a04a32'; x.beginPath(); x.arc(rx, ry, 190, 0, 7); x.fill();
    x.fillStyle = '#b8c44a'; x.beginPath(); x.arc(rx, ry, 130, 0, 7); x.fill();
    // a red-brown band around part of the circle
    x.strokeStyle = '#9a4630'; x.lineWidth = 46; x.beginPath(); x.arc(C, C, 400, 2.2, 3.6); x.stroke();
    // yellow moon and stars, a little sun
    x.fillStyle = '#f2c230';
    x.beginPath(); x.arc(C - 230, C + 200, 92, 0, 7); x.fill();
    x.fillStyle = '#5f86c2'; x.beginPath(); x.arc(C - 196, C + 172, 82, 0, 7); x.fill();
    const star = (cx, cy, r, col, rot = 0) => { x.fillStyle = col; x.beginPath(); for(let i = 0; i < 10; i++){ const a = rot + i * Math.PI / 5 - Math.PI / 2, rr = i % 2 ? r * .45 : r; x.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); } x.closePath(); x.fill(); };
    star(C - 70, C + 300, 62, '#f2c230', .3); star(C + 140, C + 260, 44, '#f29a30', -.2); star(C - 330, C - 80, 40, '#f2c230', .1); star(C + 60, C - 330, 50, '#f2c230', .5);
    x.fillStyle = '#f29a30'; x.beginPath(); x.arc(C - 90, C - 140, 60, 0, 7); x.fill();
    for(let i = 0; i < 12; i++){ const a = i / 12 * 6.283; x.beginPath(); x.moveTo(C - 90 + Math.cos(a) * 66, C - 140 + Math.sin(a) * 66); x.lineTo(C - 90 + Math.cos(a + .2) * 96, C - 140 + Math.sin(a + .2) * 96); x.lineTo(C - 90 + Math.cos(a + .4) * 66, C - 140 + Math.sin(a + .4) * 66); x.fill(); }
    // speckles of the rubber granulate
    for(let i = 0; i < 30000; i++){ x.fillStyle = rnd() < .5 ? 'rgba(20,40,90,.35)' : 'rgba(200,220,255,.3)'; x.fillRect(rnd() * w, rnd() * h, 2, 2); }
    // dark wet-leaf stains and a few leaves
    for(let i = 0; i < 90; i++){ x.fillStyle = 'rgba(50,50,40,.22)'; x.beginPath(); x.ellipse(rnd() * w, rnd() * h, 8 + rnd() * 26, 5 + rnd() * 14, rnd() * 3, 0, 7); x.fill(); }
    for(let i = 0; i < 70; i++) leaf(x, rnd() * w, rnd() * h, 6 + rnd() * 6, rnd() * 6);
  }), false);
  /* dark grey stacked flat stones (retaining wall); 256 px = 1.5 m */
  T.stone = tex(cv(256, 256, (x, w, h) => {
    x.fillStyle = '#2f3032'; x.fillRect(0, 0, w, h);
    let y = 0;
    while(y < h){
      const rh = 9 + (rnd() * 12 | 0); let X = -rnd() * 30;
      while(X < w){ const bw = 26 + rnd() * 60, g = 70 + rnd() * 40 | 0; x.fillStyle = `rgb(${g},${g},${g + 3})`; x.fillRect(X + 1.5, y + 1.5, bw - 3, rh - 3); x.fillStyle = 'rgba(255,255,255,.08)'; x.fillRect(X + 2, y + 2, bw - 4, 2); X += bw; }
      y += rh;
    }
    noise(x, w, h, .15, 2500, 2);
    x.fillStyle = 'rgba(70,90,50,.12)'; x.fillRect(0, 0, w, 18);
  }));
  /* black iron railing: two top rails with a band of heart/scroll ornaments, round bars; alpha. 512 x 256 = 2 m x 1 m */
  T.rail = tex(cv(512, 256, (x, w, h) => {
    x.clearRect(0, 0, w, h); x.fillStyle = '#16171a'; x.strokeStyle = '#16171a';
    x.fillRect(0, 8, w, 9); x.fillRect(0, 62, w, 7); x.fillRect(0, h - 12, w, 9);
    for(let i = 0; i < 16; i++){ const X = i * 32 + 14; x.fillRect(X, 8, 5, h - 12); }
    x.lineWidth = 4;
    for(let i = 0; i < 16; i++){ const X = i * 32 + 30, Y = 40; // a pair of scrolls making a heart between two bars
      x.beginPath(); x.moveTo(X, Y + 18); x.bezierCurveTo(X - 16, Y + 4, X - 12, Y - 18, X, Y - 6); x.bezierCurveTo(X + 12, Y - 18, X + 16, Y + 4, X, Y + 18); x.stroke(); }
    x.fillStyle = 'rgba(255,255,255,.18)'; for(let i = 0; i < 16; i++) x.fillRect(i * 32 + 15, 8, 1.5, h - 12);
  }), true);
  /* tree-pit bricks (red-brown) */
  T.brick = tex(cv(128, 64, (x, w, h) => {
    x.fillStyle = '#7a4a3a'; x.fillRect(0, 0, w, h);
    for(let r = 0; r < 2; r++) for(let c = -1; c < 3; c++){ const g = rnd() * 30 | 0; x.fillStyle = `rgb(${128 + g},${76 + g / 2},${62})`; x.fillRect(c * 64 + (r % 2) * 32 + 2, r * 32 + 2, 60, 28); }
    noise(x, w, h, .15, 600, 2);
  }));
  T.soil = tex(cv(128, 128, (x, w, h) => { x.fillStyle = '#4a3a2a'; x.fillRect(0, 0, w, h); noise(x, w, h, .3, 2000, 2); for(let i = 0; i < 18; i++) leaf(x, rnd() * w, rnd() * h, 5 + rnd() * 4, rnd() * 6); }));
  /* asphalt + sidewalk */
  T.asphalt = tex(cv(256, 256, (x, w, h) => {
    x.fillStyle = '#4b4d52'; x.fillRect(0, 0, w, h); noise(x, w, h, .22, 7000, 2);
    for(let i = 0; i < 6; i++){ x.fillStyle = 'rgba(30,30,35,.25)'; x.beginPath(); x.ellipse(rnd() * w, rnd() * h, 20 + rnd() * 40, 10 + rnd() * 20, rnd() * 3, 0, 7); x.fill(); }
    x.strokeStyle = 'rgba(20,20,22,.4)'; x.lineWidth = 1.5; for(let i = 0; i < 5; i++){ x.beginPath(); let X = rnd() * w, Y = rnd() * h; x.moveTo(X, Y); for(let k = 0; k < 6; k++){ X += rnd() * 30 - 15; Y += rnd() * 30 - 15; x.lineTo(X, Y); } x.stroke(); }
  }));
  T.walk = tex(cv(256, 256, (x, w, h) => {
    x.fillStyle = '#8f8c86'; x.fillRect(0, 0, w, h);
    for(let r = 0; r < 8; r++) for(let c = 0; c < 8; c++){ const g = 140 + rnd() * 26 | 0; x.fillStyle = `rgb(${g},${g - 3},${g - 8})`; x.fillRect(c * 32 + 1, r * 32 + 1, 30, 30); }
    noise(x, w, h, .1, 2000, 2);
  }));
  /* building facades: one floor = 128 px tall, one window bay = 128 px wide; 4 bays x 6 floors in a 512 x 768 tile.
     Each style also gets a night map (lit windows only, random warm / cool / off). */
  function facade(st){
    const W = 512, H = 768, bays = 4, floors = 6;
    const lit = []; for(let f = 0; f < floors; f++) for(let b = 0; b < bays; b++) lit.push(rnd());
    const day = cv(W, H, (x) => {
      x.fillStyle = st.wall; x.fillRect(0, 0, W, H); noise(x, W, H, .08, 5000, 3);
      for(let f = 0; f < floors; f++){
        const y0 = f * 128;
        x.fillStyle = st.slab; x.fillRect(0, y0 + 118, W, 10);
        if(st.band && f % 2 === 1){ // blue zigzag band
          x.fillStyle = st.band; x.fillRect(0, y0 + 110, W, 16); x.fillStyle = st.wall; for(let i = 0; i < W; i += 16){ x.beginPath(); x.moveTo(i, y0 + 126); x.lineTo(i + 8, y0 + 114); x.lineTo(i + 16, y0 + 126); x.fill(); }
        }
        for(let b = 0; b < bays; b++){
          const x0 = b * 128 + 22, wy = y0 + 24, ww = 84, wh = 74;
          if(st.balc && (b === 1 || b === 2) && f > 0){ // balcony: deeper door, slab, rail in the balcony colour
            x.fillStyle = '#2b3036'; x.fillRect(x0 + 8, wy - 6, ww - 16, wh + 10);
            x.fillStyle = 'rgba(255,255,255,.15)'; x.fillRect(x0 + 12, wy - 2, ww / 2 - 14, wh + 2);
            x.fillStyle = st.balc; x.fillRect(b === 1 ? x0 - 22 : x0 - 8, wy + wh - 26, ww + 30, 34);
            x.fillStyle = 'rgba(0,0,0,.18)'; x.fillRect(b === 1 ? x0 - 22 : x0 - 8, wy + wh + 6, ww + 30, 4);
          } else {
            x.fillStyle = st.frame; x.fillRect(x0 - 5, wy - 5, ww + 10, wh + 10);
            x.fillStyle = '#39424c'; x.fillRect(x0, wy, ww, wh);
            const gg = x.createLinearGradient(x0, wy, x0 + ww, wy + wh); gg.addColorStop(0, 'rgba(190,205,225,.45)'); gg.addColorStop(1, 'rgba(60,70,90,.1)'); x.fillStyle = gg; x.fillRect(x0, wy, ww, wh);
            x.fillStyle = st.frame; x.fillRect(x0 + ww / 2 - 3, wy, 6, wh); x.fillRect(x0, wy + 26, ww, 5);
            if(rnd() < .35){ x.fillStyle = rnd() < .5 ? '#e8e0d0' : '#c9b48f'; x.fillRect(x0 + 2, wy + 2, ww * (.3 + rnd() * .3), wh - 4); } // curtain
            x.fillStyle = 'rgba(0,0,0,.2)'; x.fillRect(x0 - 6, wy + wh + 5, ww + 12, 5);
          }
        }
      }
      if(st.ground){ x.fillStyle = st.ground; x.fillRect(0, H - 128, W, 128); for(let b = 0; b < bays; b++){ x.fillStyle = '#3a3f46'; x.fillRect(b * 128 + 20, H - 104, 88, 92); } }
    });
    const night = cv(W, H, (x) => {
      x.fillStyle = '#000'; x.fillRect(0, 0, W, H);
      let k = 0;
      for(let f = 0; f < floors; f++) for(let b = 0; b < bays; b++){
        const v = lit[k++]; if(v > .55) continue;
        const x0 = b * 128 + 22, wy = f * 128 + 24;
        x.fillStyle = v < .4 ? '#ffcf7a' : v < .48 ? '#ffe9b8' : '#bcd6ff';
        if(st.balc && (b === 1 || b === 2) && f > 0) x.fillRect(x0 + 8, wy - 6, ww2(), 60); else { x.fillRect(x0, wy, 84, 74); x.fillStyle = '#000'; x.fillRect(x0 + 39, wy, 6, 74); x.fillRect(x0, wy + 26, 84, 5); }
      }
      function ww2(){ return 68; }
    });
    const d = tex(day), n = tex(night); return { map:d, night:n };
  }
  T.fac = {
    terra:facade({ wall:'#c4553a', slab:'#e9d9c4', frame:'#f1ece4', balc:'#e9d9c4' }),
    cream:facade({ wall:'#e7d4b0', slab:'#f4ead6', frame:'#ffffff', balc:'#c9b48f' }),
    zig:facade({ wall:'#a9acb0', slab:'#d8d8d8', frame:'#f4f4f4', band:'#2e5fa8' }),
    green:facade({ wall:'#aeb8a4', slab:'#d9dccf', frame:'#f2f2ee', balc:'#2b9a96' }),
    orange:facade({ wall:'#de8a4a', slab:'#f2e6d2', frame:'#ffffff', balc:'#f2e6d2' }),
    pale:facade({ wall:'#ddd6cc', slab:'#efe9e0', frame:'#ffffff', balc:'#b6ab9c', ground:'#9a9088' })
  };
  /* red clay roof tiles */
  T.roof = tex(cv(256, 128, (x, w, h) => {
    x.fillStyle = '#8f3a24'; x.fillRect(0, 0, w, h);
    for(let r = 0; r < 8; r++) for(let c = 0; c < 16; c++){ const g = rnd() * 30 | 0; x.fillStyle = `rgb(${170 + g},${70 + g / 2},${44})`; x.beginPath(); x.ellipse(c * 16 + (r % 2) * 8 + 8, r * 16 + 10, 8, 9, 0, 0, Math.PI); x.fill(); }
    noise(x, w, h, .15, 1200, 2);
  }));
  /* teal climbing panel with round holes (alpha) */
  T.holes = (col) => tex(cv(256, 256, (x, w, h) => {
    x.fillStyle = col; x.beginPath(); x.roundRect ? x.roundRect(4, 4, w - 8, h - 8, 26) : x.rect(4, 4, w - 8, h - 8); x.fill();
    x.globalCompositeOperation = 'destination-out';
    for(let r = 0; r < 5; r++) for(let c = 0; c < 4; c++){ x.beginPath(); x.ellipse(40 + c * 58 + (r % 2) * 18, 30 + r * 48, 15, 12, 0, 0, 7); x.fill(); }
    x.globalCompositeOperation = 'source-over';
    x.fillStyle = 'rgba(255,255,255,.18)'; x.fillRect(10, 10, w - 20, 8);
  }), false);
  T.tealHoles = T.holes('#2fb8b0');
  /* black perforated metal (stairs, deck) */
  T.perf = tex(cv(128, 128, (x, w, h) => {
    x.fillStyle = '#25272b'; x.fillRect(0, 0, w, h);
    x.globalCompositeOperation = 'destination-out';
    for(let r = 0; r < 8; r++) for(let c = 0; c < 8; c++){ x.beginPath(); x.arc(8 + c * 16 + (r % 2) * 8, 8 + r * 16, 4, 0, 7); x.fill(); }
    x.globalCompositeOperation = 'source-over';
  }));
  /* decorative panels with a window / arch relief */
  T.archPanel = (base, dark) => tex(cv(256, 320, (x, w, h) => {
    x.fillStyle = base; x.beginPath(); x.moveTo(10, h - 6); x.lineTo(10, 80); x.quadraticCurveTo(w / 2, -20, w - 10, 80); x.lineTo(w - 10, h - 6); x.closePath(); x.fill();
    x.strokeStyle = dark; x.lineWidth = 10; x.stroke();
    x.fillStyle = dark; x.beginPath(); x.moveTo(70, 250); x.lineTo(70, 130); x.quadraticCurveTo(w / 2, 60, w - 70, 130); x.lineTo(w - 70, 250); x.closePath(); x.fill();
    x.fillStyle = base; x.fillRect(w / 2 - 5, 110, 10, 140); x.fillRect(70, 170, w - 140, 10);
    x.fillStyle = 'rgba(255,255,255,.2)'; x.fillRect(22, 90, 10, h - 110);
  }), false);
  T.orangePanel = T.archPanel('#f0a24a', '#c9742a');
  T.tealPanel = T.archPanel('#3fb8b0', '#22857f');
  /* activity panels (no letters): tic-tac-toe, coloured beads, shapes, maze, flower clock */
  T.activity = [0, 1, 2, 3, 4].map(k => tex(cv(256, 256, (x, w, h) => {
    x.fillStyle = '#f6f0e0'; x.fillRect(0, 0, w, h); x.strokeStyle = '#f2c230'; x.lineWidth = 20; x.strokeRect(10, 10, w - 20, h - 20);
    const cols = ['#e8454f', '#3a8fd8', '#3fbf6a', '#f2a020', '#9b6bff'];
    if(k === 0){ for(let r = 0; r < 3; r++) for(let c = 0; c < 3; c++){ x.fillStyle = cols[(r + c) % 5]; x.fillRect(42 + c * 60, 42 + r * 60, 52, 52); x.fillStyle = '#fff'; x.font = '800 40px Arial'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText((r + c) % 2 ? '○' : '✕', 68 + c * 60, 70 + r * 60); } }
    else if(k === 1){ for(let r = 0; r < 5; r++){ x.fillStyle = '#888'; x.fillRect(36, 52 + r * 36, 184, 4); for(let c = 0; c < 6; c++){ x.fillStyle = cols[r]; x.beginPath(); x.arc(52 + c * 18 + (c > 2 ? 60 : 0), 54 + r * 36, 9, 0, 7); x.fill(); } } }
    else if(k === 2){ x.fillStyle = cols[0]; x.beginPath(); x.arc(82, 82, 34, 0, 7); x.fill(); x.fillStyle = cols[1]; x.fillRect(140, 48, 68, 68); x.fillStyle = cols[2]; x.beginPath(); x.moveTo(82, 140); x.lineTo(120, 210); x.lineTo(44, 210); x.fill(); x.fillStyle = cols[3]; x.beginPath(); for(let i = 0; i < 10; i++){ const a = i * Math.PI / 5 - Math.PI / 2, r = i % 2 ? 16 : 36; x.lineTo(174 + Math.cos(a) * r, 178 + Math.sin(a) * r); } x.fill(); }
    else if(k === 3){ x.strokeStyle = '#3a8fd8'; x.lineWidth = 12; x.lineCap = 'round'; x.beginPath(); x.moveTo(40, 60); x.lineTo(200, 60); x.lineTo(200, 110); x.lineTo(60, 110); x.lineTo(60, 160); x.lineTo(200, 160); x.lineTo(200, 210); x.lineTo(40, 210); x.stroke(); x.fillStyle = '#e8454f'; x.beginPath(); x.arc(40, 60, 12, 0, 7); x.fill(); x.fillStyle = '#3fbf6a'; x.beginPath(); x.arc(40, 210, 12, 0, 7); x.fill(); }
    else { for(let i = 0; i < 12; i++){ const a = i / 12 * 6.283; x.fillStyle = cols[i % 5]; x.beginPath(); x.arc(128 + Math.cos(a) * 80, 128 + Math.sin(a) * 80, 16, 0, 7); x.fill(); } x.strokeStyle = '#4a2f1d'; x.lineWidth = 8; x.beginPath(); x.moveTo(128, 128); x.lineTo(128, 70); x.moveTo(128, 128); x.lineTo(170, 140); x.stroke(); }
    noise(x, w, h, .06, 800, 2);
  }), false));
  /* plain cream-pink electrical kiosk walls with vents (no posters, no text) */
  T.kiosk = tex(cv(256, 256, (x, w, h) => {
    x.fillStyle = '#e9cdbf'; x.fillRect(0, 0, w, h); noise(x, w, h, .08, 2000, 2);
    x.fillStyle = '#cdb0a2'; x.fillRect(0, h - 26, w, 26); x.fillRect(0, 0, w, 10);
    x.fillStyle = '#b89a8c'; x.fillRect(40, 60, 70, 150); x.fillRect(146, 60, 70, 150);
    x.fillStyle = '#d9bcae'; for(let i = 0; i < 10; i++){ x.fillRect(46, 70 + i * 13, 58, 6); x.fillRect(152, 70 + i * 13, 58, 6); }
  }));
  /* sprites: soft blob shadow, warm lamp glow, ground light pool */
  T.blob = tex(cv(64, 64, (x) => { const g = x.createRadialGradient(32, 32, 2, 32, 32, 30); g.addColorStop(0, 'rgba(0,0,0,.42)'); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); }), false);
  T.glow = tex(cv(128, 128, (x) => { const g = x.createRadialGradient(64, 64, 2, 64, 64, 62); g.addColorStop(0, 'rgba(255,250,230,1)'); g.addColorStop(.18, 'rgba(255,226,160,.75)'); g.addColorStop(.5, 'rgba(255,190,110,.18)'); g.addColorStop(1, 'rgba(255,170,90,0)'); x.fillStyle = g; x.fillRect(0, 0, 128, 128); }), false);
  T.pool = tex(cv(128, 128, (x) => { const g = x.createRadialGradient(64, 64, 2, 64, 64, 62); g.addColorStop(0, 'rgba(255,214,150,.75)'); g.addColorStop(.5, 'rgba(255,190,120,.25)'); g.addColorStop(1, 'rgba(255,170,90,0)'); x.fillStyle = g; x.fillRect(0, 0, 128, 128); }), false);
  T.star = tex(cv(128, 128, (x) => { x.fillStyle = '#ffd23f'; x.strokeStyle = '#fff6c0'; x.lineWidth = 6; x.beginPath(); for(let i = 0; i < 10; i++){ const a = i * Math.PI / 5 - Math.PI / 2, r = i % 2 ? 24 : 56; x.lineTo(64 + Math.cos(a) * r, 66 + Math.sin(a) * r); } x.closePath(); x.fill(); x.stroke(); }), false);
  return T;
}
