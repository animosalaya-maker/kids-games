/* Bobo Hide & Seek («غميضة بوبو 🙈»): procedural canvas textures (no image files).
   Every texture is light/white-based so the furniture colour (vertex colour) tints it: one material per texture,
   many colours. Patterns are single-colour (wood grain, tiles, dotted / knitted fabric, wallpaper). */
export function makeTextures(THREE, aniso){
  function tex(w, h, draw, rep = true){
    const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); draw(x, w, h);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = aniso;
    if(rep){ t.wrapS = t.wrapT = THREE.RepeatWrapping; }
    return t;
  }
  let sd = 11; const R = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
  function speckle(x, w, h, n, col, a, s = 1.5){ x.fillStyle = col; for(let i = 0; i < n; i++){ x.globalAlpha = a * R(); x.fillRect(R() * w, R() * h, s, s); } x.globalAlpha = 1; }
  const T = {};

  /* wood grain for furniture (tinted): soft wavy lines and a few knots */
  T.wood = tex(512, 512, (x, w, h) => {
    x.fillStyle = '#ffffff'; x.fillRect(0, 0, w, h);
    for(let i = 0; i < 70; i++){
      const y0 = R() * h, amp = 2 + R() * 6, f = .008 + R() * .02, ph = R() * 6;
      x.strokeStyle = `rgba(120,70,30,${.06 + R() * .12})`; x.lineWidth = 1 + R() * 2.5;
      x.beginPath(); for(let gx = -10; gx <= w + 10; gx += 8) x.lineTo(gx, y0 + Math.sin(gx * f + ph) * amp + Math.sin(gx * .05 + ph) * 1.2); x.stroke();
    }
    for(let k = 0; k < 5; k++){ const cx = R() * w, cy = R() * h; for(let r = 3; r < 22; r += 4){ x.strokeStyle = `rgba(110,60,25,${.22 - r * .007})`; x.lineWidth = 1.6; x.beginPath(); x.ellipse(cx, cy, r * 2.2, r * .8, 0, 0, 6.3); x.stroke(); } }
    speckle(x, w, h, 1500, '#6a3a18', .08);
  });
  /* wooden floor planks (tinted) */
  T.planks = tex(512, 512, (x, w, h) => {
    const rows = 6, rh = h / rows;
    for(let r = 0; r < rows; r++){
      let px = -R() * 300;
      while(px < w){
        const len = 200 + R() * 260, k = .9 + R() * .1;
        x.fillStyle = `rgb(${Math.round(255 * k)},${Math.round(250 * k)},${Math.round(244 * k)})`; x.fillRect(px, r * rh, len, rh);
        x.strokeStyle = 'rgba(120,70,30,.13)'; x.lineWidth = 1.4;
        for(let g = 0; g < 6; g++){ const gy = r * rh + 6 + R() * (rh - 12); x.beginPath(); x.moveTo(px, gy); for(let gx = px; gx < px + len; gx += 20) x.lineTo(gx, gy + Math.sin(gx * .03 + g) * 2); x.stroke(); }
        x.fillStyle = 'rgba(80,45,20,.4)'; x.fillRect(px, r * rh, 3, rh);
        px += len;
      }
      x.fillStyle = 'rgba(80,45,20,.45)'; x.fillRect(0, r * rh, w, 3); x.fillStyle = 'rgba(255,255,255,.25)'; x.fillRect(0, r * rh + 3, w, 3);
    }
    speckle(x, w, h, 900, '#5a3010', .08);
  });
  /* big square floor tiles with grout (tinted) */
  T.tiles = tex(512, 512, (x, w, h) => {
    const n = 2, s = w / n;
    for(let i = 0; i < n; i++) for(let j = 0; j < n; j++){
      const k = .95 + R() * .05; x.fillStyle = `rgb(${Math.round(255 * k)},${Math.round(255 * k)},${Math.round(255 * k)})`; x.fillRect(i * s, j * s, s, s);
      const g = x.createLinearGradient(i * s, j * s, i * s + s, j * s + s); g.addColorStop(0, 'rgba(255,255,255,.35)'); g.addColorStop(1, 'rgba(0,0,0,.04)'); x.fillStyle = g; x.fillRect(i * s, j * s, s, s);
    }
    speckle(x, w, h, 1400, '#806a50', .1, 2);
    x.strokeStyle = 'rgba(150,130,110,.75)'; x.lineWidth = 7; for(let i = 0; i <= n; i++){ x.beginPath(); x.moveTo(i * s, 0); x.lineTo(i * s, h); x.moveTo(0, i * s); x.lineTo(w, i * s); x.stroke(); }
  });
  /* small wall tiles for the kitchen backsplash (tinted) */
  T.smallTiles = tex(256, 256, (x, w, h) => {
    const n = 4, s = w / n;
    for(let i = 0; i < n; i++) for(let j = 0; j < n; j++){ x.fillStyle = '#ffffff'; x.fillRect(i * s, j * s, s, s); x.fillStyle = 'rgba(255,255,255,.6)'; x.fillRect(i * s + 6, j * s + 6, s - 18, 5); x.fillStyle = 'rgba(0,0,0,.05)'; x.fillRect(i * s + 4, j * s + s - 10, s - 8, 6); }
    x.strokeStyle = 'rgba(140,140,140,.55)'; x.lineWidth = 4; for(let i = 0; i <= n; i++){ x.beginPath(); x.moveTo(i * s, 0); x.lineTo(i * s, h); x.moveTo(0, i * s); x.lineTo(w, i * s); x.stroke(); }
  });
  /* fabric with soft dots (one colour: lighter dots on the tint) */
  T.dots = tex(256, 256, (x, w, h) => {
    x.fillStyle = '#e9e9e9'; x.fillRect(0, 0, w, h);
    speckle(x, w, h, 3000, '#ffffff', .25, 1.5); speckle(x, w, h, 2000, '#9a9a9a', .12, 1.5);
    x.fillStyle = '#ffffff'; for(let j = 0; j < 4; j++) for(let i = 0; i < 4; i++){ x.beginPath(); x.arc(i * 64 + (j % 2 ? 32 : 0) + 16, j * 64 + 16, 9, 0, 6.3); x.fill(); }
  });
  /* knitted / woven fabric (tinted) */
  T.knit = tex(256, 256, (x, w, h) => {
    x.fillStyle = '#efefef'; x.fillRect(0, 0, w, h);
    for(let j = 0; j < 16; j++) for(let i = 0; i < 16; i++){ const cx = i * 16 + 8, cy = j * 16 + 8; x.fillStyle = 'rgba(255,255,255,.7)'; x.beginPath(); x.ellipse(cx - 3, cy, 3.2, 6.5, .5, 0, 6.3); x.fill(); x.beginPath(); x.ellipse(cx + 3, cy, 3.2, 6.5, -.5, 0, 6.3); x.fill(); x.fillStyle = 'rgba(0,0,0,.08)'; x.fillRect(cx - 1, cy - 7, 2, 14); }
  });
  /* wallpaper: soft single-colour stars (bedroom) */
  T.starPaper = tex(512, 512, (x, w, h) => {
    x.fillStyle = '#f4f4f4'; x.fillRect(0, 0, w, h);
    const star = (cx, cy, r) => { x.beginPath(); for(let k = 0; k < 10; k++){ const a = k / 10 * 6.283 - 1.571, rr = k % 2 ? r * .45 : r; x.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); } x.closePath(); x.fill(); };
    x.fillStyle = 'rgba(255,255,255,.95)'; for(let j = 0; j < 5; j++) for(let i = 0; i < 5; i++) star(i * 102 + (j % 2 ? 51 : 0) + 25, j * 102 + 40, 16);
    x.fillStyle = 'rgba(0,0,0,.05)'; for(let j = 0; j < 5; j++) for(let i = 0; i < 5; i++){ x.beginPath(); x.arc(i * 102 + (j % 2 ? 0 : 51) + 25, j * 102 + 90, 4, 0, 6.3); x.fill(); }
  });
  /* plain wall with a soft vertical paint texture */
  T.paint = tex(256, 256, (x, w, h) => { x.fillStyle = '#f6f6f6'; x.fillRect(0, 0, w, h); speckle(x, w, h, 2500, '#ffffff', .4, 2); speckle(x, w, h, 1200, '#b0b0b0', .1, 2); });
  /* grass / soil for the garden */
  T.grass = tex(256, 256, (x, w, h) => { x.fillStyle = '#e8f5e0'; x.fillRect(0, 0, w, h); for(let i = 0; i < 1600; i++){ const gx = R() * w, gy = R() * h; x.strokeStyle = `rgba(${R() < .5 ? '40,110,30' : '255,255,255'},${.12 + R() * .2})`; x.lineWidth = 1.5; x.beginPath(); x.moveTo(gx, gy); x.lineTo(gx + (R() - .5) * 4, gy - 5 - R() * 6); x.stroke(); } });
  T.soil = tex(256, 256, (x, w, h) => { x.fillStyle = '#ececec'; x.fillRect(0, 0, w, h); speckle(x, w, h, 3000, '#5a4030', .3, 3); speckle(x, w, h, 1500, '#ffffff', .3, 2); });
  /* stone / pebbles (tinted) */
  T.stone = tex(256, 256, (x, w, h) => { x.fillStyle = '#f0f0f0'; x.fillRect(0, 0, w, h); speckle(x, w, h, 4000, '#7a7a7a', .2, 2); speckle(x, w, h, 1500, '#ffffff', .4, 3); });
  /* book pages edge / paper (tinted): fine horizontal lines */
  T.paper = tex(128, 128, (x, w, h) => { x.fillStyle = '#ffffff'; x.fillRect(0, 0, w, h); x.fillStyle = 'rgba(0,0,0,.08)'; for(let i = 0; i < h; i += 4) x.fillRect(0, i, w, 1); });

  /* window view (sunny garden) */
  T.window = tex(256, 256, (x, w, h) => {
    const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#5fb8ff'); g.addColorStop(.7, '#bfe8ff'); g.addColorStop(1, '#e6f7ff'); x.fillStyle = g; x.fillRect(0, 0, w, h);
    x.fillStyle = '#fff3a0'; x.beginPath(); x.arc(190, 60, 26, 0, 6.3); x.fill();
    x.fillStyle = 'rgba(255,255,255,.92)'; for(const [a, b] of [[60, 70], [86, 60], [112, 72]]){ x.beginPath(); x.arc(a, b, 20, 0, 6.3); x.fill(); }
    x.fillStyle = '#6cc35a'; x.beginPath(); x.moveTo(0, h); x.lineTo(0, h * .78); x.quadraticCurveTo(w * .3, h * .64, w * .55, h * .78); x.quadraticCurveTo(w * .8, h * .68, w, h * .76); x.lineTo(w, h); x.fill();
    x.fillStyle = '#3f9a45'; for(const tx of [40, 120, 210]){ x.beginPath(); x.arc(tx, h * .76, 20, 0, 6.3); x.arc(tx + 16, h * .72, 16, 0, 6.3); x.fill(); }
  }, false);
  /* framed picture: a smiling sun over hills (one picture, no text) */
  T.picture = tex(256, 256, (x, w, h) => {
    x.fillStyle = '#fff6e0'; x.fillRect(0, 0, w, h);
    x.fillStyle = '#ffcf4a'; x.beginPath(); x.arc(128, 100, 48, 0, 6.3); x.fill();
    x.strokeStyle = '#ffcf4a'; x.lineWidth = 8; x.lineCap = 'round'; for(let i = 0; i < 10; i++){ const a = i / 10 * 6.283; x.beginPath(); x.moveTo(128 + Math.cos(a) * 60, 100 + Math.sin(a) * 60); x.lineTo(128 + Math.cos(a) * 78, 100 + Math.sin(a) * 78); x.stroke(); }
    x.fillStyle = '#5a3a1a'; x.beginPath(); x.arc(112, 92, 6, 0, 6.3); x.arc(144, 92, 6, 0, 6.3); x.fill();
    x.strokeStyle = '#5a3a1a'; x.lineWidth = 5; x.beginPath(); x.arc(128, 106, 18, .3, 2.84); x.stroke();
    x.fillStyle = '#7fcf5a'; x.beginPath(); x.ellipse(60, 250, 140, 70, 0, 0, 6.3); x.fill(); x.fillStyle = '#4fae4a'; x.beginPath(); x.ellipse(220, 260, 130, 70, 0, 0, 6.3); x.fill();
  }, false);
  /* the round rug in the bedroom: one colour family, concentric rings */
  T.rug = tex(512, 512, (x, w) => {
    x.translate(w / 2, w / 2);
    [[250, '#5aa9e6'], [232, '#ffffff'], [214, '#5aa9e6'], [160, '#8cc8f2'], [146, '#5aa9e6'], [80, '#8cc8f2'], [64, '#ffffff'], [48, '#5aa9e6']].forEach(([r, c]) => { x.fillStyle = c; x.beginPath(); x.arc(0, 0, r, 0, 6.3); x.fill(); });
    x.fillStyle = '#ffffff'; for(let i = 0; i < 18; i++){ const a = i / 18 * 6.283; x.beginPath(); x.arc(Math.cos(a) * 187, Math.sin(a) * 187, 9, 0, 6.3); x.fill(); }
  }, false);
  return T;
}
