/* Uncle Grumpy's House: procedural canvas textures (no image files).
   Floors (wood, tiles, carpet, concrete), wallpaper with wainscot, rugs atlas, paintings atlas, window skies. */
export function makeTextures(THREE, aniso){
  function tex(w, h, draw, rep = true){
    const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); draw(x, w, h);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = aniso;
    if(rep){ t.wrapS = t.wrapT = THREE.RepeatWrapping; }
    return t;
  }
  let sd = 7; const R = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
  const shade = (hex, k) => { const n = parseInt(hex.slice(1), 16); const f = v => Math.max(0, Math.min(255, Math.round(v * k))); return `rgb(${f(n >> 16)},${f(n >> 8 & 255)},${f(n & 255)})`; };
  function speckle(x, w, h, n, col, a, s = 1.5){ x.fillStyle = col; for(let i = 0; i < n; i++){ x.globalAlpha = a * R(); x.fillRect(R() * w, R() * h, s, s); } x.globalAlpha = 1; }

  function planks(base, rows, seam, grainK){
    return tex(512, 512, (x, w, h) => {
      const rh = h / rows;
      for(let r = 0; r < rows; r++){
        let px = -R() * 300;
        while(px < w){
          const len = 220 + R() * 260, k = .88 + R() * .22;
          x.fillStyle = shade(base, k); x.fillRect(px, r * rh, len, rh);
          // grain
          x.strokeStyle = shade(base, k * .8); x.globalAlpha = grainK; x.lineWidth = 1.4;
          for(let g = 0; g < 5; g++){ const gy = r * rh + 6 + R() * (rh - 12); x.beginPath(); x.moveTo(px, gy);
            for(let gx = px; gx < px + len; gx += 24) x.lineTo(gx, gy + Math.sin(gx * .03 + g) * 2.2); x.stroke(); }
          if(R() < .35){ x.fillStyle = shade(base, k * .7); x.beginPath(); x.ellipse(px + 30 + R() * (len - 60), r * rh + rh / 2, 7, 3.5, 0, 0, 6.3); x.fill(); }
          x.globalAlpha = 1;
          x.fillStyle = seam; x.fillRect(px, r * rh, 2.5, rh);
          px += len;
        }
        x.fillStyle = seam; x.fillRect(0, r * rh, w, 2.5);
        x.fillStyle = 'rgba(255,255,255,.08)'; x.fillRect(0, r * rh + 3, w, 3);
      }
      speckle(x, w, h, 900, '#3a2210', .12);
    });
  }
  const T = {};
  T.wood = planks('#c98f58', 8, 'rgba(70,38,18,.55)', .35);
  T.attic = planks('#d9b07c', 6, 'rgba(90,55,25,.5)', .45);
  T.dark = planks('#a8693e', 8, 'rgba(50,25,10,.6)', .3);
  // hall: cream + terracotta checker tiles
  T.tile = tex(512, 512, (x, w, h) => {
    const n = 4, s = w / n;
    for(let i = 0; i < n; i++) for(let j = 0; j < n; j++){
      const dark = (i + j) % 2; x.fillStyle = dark ? shade('#d9825b', .92 + R() * .12) : shade('#f6e7cf', .95 + R() * .06); x.fillRect(i * s, j * s, s, s);
      x.fillStyle = 'rgba(255,255,255,.12)'; x.fillRect(i * s + 6, j * s + 6, s - 12, 6);
    }
    x.strokeStyle = 'rgba(120,90,70,.6)'; x.lineWidth = 4; for(let i = 0; i <= n; i++){ x.beginPath(); x.moveTo(i * s, 0); x.lineTo(i * s, h); x.moveTo(0, i * s); x.lineTo(w, i * s); x.stroke(); }
    speckle(x, w, h, 700, '#5a3a20', .1);
  });
  // kitchen: white and soft mint diamonds
  T.kitchen = tex(512, 512, (x, w, h) => {
    x.fillStyle = '#f7f4ec'; x.fillRect(0, 0, w, h);
    const s = w / 4;
    for(let i = 0; i < 4; i++) for(let j = 0; j < 4; j++){
      const cx = i * s + s / 2, cy = j * s + s / 2;
      x.fillStyle = shade('#9fd8c4', .95 + R() * .08); x.beginPath(); x.moveTo(cx, cy - s * .32); x.lineTo(cx + s * .32, cy); x.lineTo(cx, cy + s * .32); x.lineTo(cx - s * .32, cy); x.closePath(); x.fill();
    }
    x.strokeStyle = 'rgba(150,140,120,.55)'; x.lineWidth = 3; for(let i = 0; i <= 4; i++){ x.beginPath(); x.moveTo(i * s, 0); x.lineTo(i * s, h); x.moveTo(0, i * s); x.lineTo(w, i * s); x.stroke(); }
    speckle(x, w, h, 500, '#6a6050', .08);
  });
  // bathroom: small light-blue squares
  T.bath = tex(512, 512, (x, w, h) => {
    const n = 8, s = w / n;
    for(let i = 0; i < n; i++) for(let j = 0; j < n; j++){ x.fillStyle = shade('#bfe6f2', .93 + R() * .1); x.fillRect(i * s, j * s, s, s); x.fillStyle = 'rgba(255,255,255,.25)'; x.fillRect(i * s + 4, j * s + 4, s - 14, 4); }
    x.strokeStyle = 'rgba(255,255,255,.9)'; x.lineWidth = 4; for(let i = 0; i <= n; i++){ x.beginPath(); x.moveTo(i * s, 0); x.lineTo(i * s, h); x.moveTo(0, i * s); x.lineTo(w, i * s); x.stroke(); }
  });
  // grandma's room: soft rose carpet
  T.carpet = tex(256, 256, (x, w, h) => { x.fillStyle = '#e9a9b6'; x.fillRect(0, 0, w, h); speckle(x, w, h, 4000, '#ffffff', .18, 2); speckle(x, w, h, 4000, '#a85a72', .18, 2); });
  // basement concrete
  T.concrete = tex(256, 256, (x, w, h) => { x.fillStyle = '#b9b2a6'; x.fillRect(0, 0, w, h); speckle(x, w, h, 3000, '#6a6458', .25, 2); speckle(x, w, h, 1500, '#f0ece2', .2, 2);
    x.strokeStyle = 'rgba(90,85,75,.35)'; x.lineWidth = 2; x.strokeRect(1, 1, w - 2, h - 2); });
  // grass outside
  T.grass = tex(256, 256, (x, w, h) => { x.fillStyle = '#6cbf4f'; x.fillRect(0, 0, w, h); speckle(x, w, h, 5000, '#3f8f34', .35, 2); speckle(x, w, h, 3000, '#a8e07a', .3, 2); });
  // exterior siding (one colour)
  T.siding = tex(256, 256, (x, w, h) => { x.fillStyle = '#ffffff'; x.fillRect(0, 0, w, h); for(let i = 0; i < 8; i++){ x.fillStyle = 'rgba(120,80,60,.22)'; x.fillRect(0, i * 32 + 28, w, 4); x.fillStyle = 'rgba(255,255,255,.5)'; x.fillRect(0, i * 32, w, 3); } });
  T.roof = tex(256, 256, (x, w, h) => { x.fillStyle = '#ffffff'; x.fillRect(0, 0, w, h); for(let r = 0; r < 8; r++) for(let c = 0; c < 9; c++){ const ox = (r % 2) * 16; x.fillStyle = `rgba(110,40,30,${.12 + R() * .12})`; x.beginPath(); x.arc(c * 32 + ox, r * 32 + 30, 15, 0, Math.PI); x.fill(); } });

  // wallpaper: lower wainscot panels, chair rail, upper soft flower pattern (white, tinted per room with vertex colours)
  T.wall = tex(512, 512, (x, w, h) => {
    x.fillStyle = '#fbf8f2'; x.fillRect(0, 0, w, h);
    const rail = h * .32;   // canvas y grows down; texture v=0 is the bottom of the canvas
    // pattern (upper part)
    for(let j = 0; j < 6; j++) for(let i = 0; i < 6; i++){
      const cx = i * w / 6 + (j % 2 ? w / 12 : 0) + w / 12, cy = j * (h - rail) / 6 + 30;
      x.fillStyle = 'rgba(160,120,130,.16)';
      for(let p = 0; p < 5; p++){ const a = p / 5 * 6.283; x.beginPath(); x.ellipse(cx + Math.cos(a) * 9, cy + Math.sin(a) * 9, 7, 4.5, a, 0, 6.3); x.fill(); }
      x.fillStyle = 'rgba(200,150,90,.28)'; x.beginPath(); x.arc(cx, cy, 4, 0, 6.3); x.fill();
      x.fillStyle = 'rgba(150,170,130,.18)'; x.beginPath(); x.arc(cx + w / 12, cy + 26, 3, 0, 6.3); x.fill();
    }
    // wainscot
    const y0 = h - rail;
    x.fillStyle = '#efe6d6'; x.fillRect(0, y0, w, rail);
    for(let i = 0; i < 4; i++){ const px = i * w / 4 + 14; x.strokeStyle = 'rgba(120,95,70,.28)'; x.lineWidth = 4; x.strokeRect(px, y0 + 26, w / 4 - 28, rail - 56); x.strokeStyle = 'rgba(255,255,255,.6)'; x.lineWidth = 2; x.strokeRect(px + 4, y0 + 30, w / 4 - 36, rail - 64); }
    x.fillStyle = '#d9cbb5'; x.fillRect(0, y0 - 6, w, 14); x.fillStyle = 'rgba(255,255,255,.7)'; x.fillRect(0, y0 - 6, w, 3);
    x.fillStyle = '#cdbb9f'; x.fillRect(0, h - 18, w, 18);
  });
  T.wall.wrapT = THREE.ClampToEdgeWrapping;

  // rugs atlas (2x2): 0 round living-room rug, 1 star rug, 2 hall runner, 3 oval rose rug
  T.rugs = tex(1024, 1024, (x) => {
    const q = 512;
    // 0: round rug, warm red and cream rings
    x.save(); x.translate(q / 2, q / 2);
    [[250, '#b8463f'], [228, '#f3dfbf'], [205, '#c95a4c'], [150, '#f3dfbf'], [138, '#d57a52'], [70, '#f3dfbf'], [56, '#b8463f']].forEach(([r, c]) => { x.fillStyle = c; x.beginPath(); x.arc(0, 0, r, 0, 6.3); x.fill(); });
    x.fillStyle = '#f3dfbf'; for(let i = 0; i < 16; i++){ const a = i / 16 * 6.283; x.beginPath(); x.arc(Math.cos(a) * 178, Math.sin(a) * 178, 10, 0, 6.3); x.fill(); }
    x.restore();
    // 1: navy rug with yellow stars
    x.save(); x.translate(q, 0); x.fillStyle = '#3d5aa8'; x.fillRect(8, 8, q - 16, q - 16); x.strokeStyle = '#f7d35a'; x.lineWidth = 10; x.strokeRect(28, 28, q - 56, q - 56);
    x.fillStyle = '#f7d35a';
    for(let i = 0; i < 9; i++){ const cx = 100 + (i % 3) * 156, cy = 100 + Math.floor(i / 3) * 156; x.beginPath(); for(let k = 0; k < 10; k++){ const a = k / 10 * 6.283 - 1.571, r = k % 2 ? 16 : 38; x.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); } x.fill(); }
    x.restore();
    // 2: runner, deep red with cream border
    x.save(); x.translate(0, q); x.fillStyle = '#a5333c'; x.fillRect(0, 0, q, q); x.strokeStyle = '#f3dfbf'; x.lineWidth = 14; x.strokeRect(24, 24, q - 48, q - 48);
    x.fillStyle = '#f3dfbf'; for(let i = 0; i < 4; i++){ const cy = 80 + i * 118; x.beginPath(); x.moveTo(q / 2, cy - 36); x.lineTo(q / 2 + 60, cy); x.lineTo(q / 2, cy + 36); x.lineTo(q / 2 - 60, cy); x.closePath(); x.fill(); }
    x.restore();
    // 3: oval rose rug with a flower
    x.save(); x.translate(q * 1.5, q * 1.5); x.fillStyle = '#d9768e'; x.beginPath(); x.ellipse(0, 0, 250, 250, 0, 0, 6.3); x.fill();
    x.fillStyle = '#ffd6df'; x.beginPath(); x.ellipse(0, 0, 214, 214, 0, 0, 6.3); x.fill(); x.fillStyle = '#d9768e';
    for(let i = 0; i < 6; i++){ const a = i / 6 * 6.283; x.beginPath(); x.ellipse(Math.cos(a) * 70, Math.sin(a) * 70, 60, 34, a, 0, 6.3); x.fill(); }
    x.fillStyle = '#f7d35a'; x.beginPath(); x.arc(0, 0, 40, 0, 6.3); x.fill(); x.restore();
  }, false);

  // paintings atlas (2x2): 0 sunny hills, 1 flowers in a vase, 2 a ginger cat, 3 a sailboat
  T.pics = tex(512, 512, (x) => {
    const q = 256;
    x.save(); let g = x.createLinearGradient(0, 0, 0, q); g.addColorStop(0, '#8fd3ff'); g.addColorStop(1, '#e8f7ff'); x.fillStyle = g; x.fillRect(0, 0, q, q);
    x.fillStyle = '#ffd34d'; x.beginPath(); x.arc(190, 60, 30, 0, 6.3); x.fill();
    x.fillStyle = '#7fcf5a'; x.beginPath(); x.ellipse(70, 230, 160, 90, 0, 0, 6.3); x.fill(); x.fillStyle = '#4fae4a'; x.beginPath(); x.ellipse(220, 250, 150, 90, 0, 0, 6.3); x.fill();
    x.fillStyle = '#fff'; x.fillRect(110, 150, 50, 40); x.fillStyle = '#d4553f'; x.beginPath(); x.moveTo(102, 152); x.lineTo(135, 122); x.lineTo(168, 152); x.fill(); x.restore();
    x.save(); x.translate(q, 0); x.fillStyle = '#f6e3c8'; x.fillRect(0, 0, q, q); x.fillStyle = '#4a7fc1'; x.beginPath(); x.moveTo(98, 240); x.lineTo(90, 170); x.quadraticCurveTo(128, 150, 166, 170); x.lineTo(158, 240); x.fill();
    x.strokeStyle = '#3f8f3a'; x.lineWidth = 6; for(const [a, b] of [[90, 70], [128, 50], [170, 74], [110, 95], [150, 98]]){ x.beginPath(); x.moveTo(128, 165); x.lineTo(a, b); x.stroke(); }
    for(const [a, b, c] of [[90, 70, '#ff6f91'], [128, 50, '#ffcd4d'], [170, 74, '#ff6f91'], [110, 95, '#ffffff'], [150, 98, '#ffcd4d']]){ x.fillStyle = c; for(let p = 0; p < 5; p++){ const an = p / 5 * 6.283; x.beginPath(); x.arc(a + Math.cos(an) * 11, b + Math.sin(an) * 11, 9, 0, 6.3); x.fill(); } x.fillStyle = '#7a4a1a'; x.beginPath(); x.arc(a, b, 6, 0, 6.3); x.fill(); }
    x.restore();
    x.save(); x.translate(0, q); x.fillStyle = '#cfe9d8'; x.fillRect(0, 0, q, q); x.fillStyle = '#f29a3e';
    x.beginPath(); x.ellipse(128, 190, 70, 60, 0, 0, 6.3); x.fill(); x.beginPath(); x.arc(128, 110, 52, 0, 6.3); x.fill();
    x.beginPath(); x.moveTo(84, 90); x.lineTo(92, 40); x.lineTo(118, 70); x.fill(); x.beginPath(); x.moveTo(172, 90); x.lineTo(164, 40); x.lineTo(138, 70); x.fill();
    x.fillStyle = '#2a1a10'; x.beginPath(); x.arc(108, 108, 7, 0, 6.3); x.arc(148, 108, 7, 0, 6.3); x.fill(); x.fillStyle = '#ff7f9e'; x.beginPath(); x.arc(128, 126, 6, 0, 6.3); x.fill();
    x.strokeStyle = '#2a1a10'; x.lineWidth = 3; x.beginPath(); x.arc(120, 132, 8, .2, 2.6); x.arc(136, 132, 8, .5, 2.9); x.stroke(); x.restore();
    x.save(); x.translate(q, q); g = x.createLinearGradient(0, 0, 0, q); g.addColorStop(0, '#ffd9a8'); g.addColorStop(.6, '#ffb38a'); g.addColorStop(.61, '#4f9fd6'); g.addColorStop(1, '#2f6fae'); x.fillStyle = g; x.fillRect(0, 0, q, q);
    x.fillStyle = '#7a4a2a'; x.beginPath(); x.moveTo(70, 160); x.lineTo(190, 160); x.lineTo(170, 185); x.lineTo(90, 185); x.fill();
    x.fillStyle = '#fff'; x.beginPath(); x.moveTo(130, 60); x.lineTo(130, 155); x.lineTo(80, 155); x.fill(); x.fillStyle = '#ff7a59'; x.beginPath(); x.moveTo(136, 70); x.lineTo(136, 155); x.lineTo(180, 155); x.fill(); x.restore();
  }, false);

  // window skies
  function sky(sunny){
    return tex(256, 256, (x, w, h) => {
      const g = x.createLinearGradient(0, 0, 0, h);
      if(sunny){ g.addColorStop(0, '#5fb8ff'); g.addColorStop(.7, '#bfe8ff'); g.addColorStop(1, '#e6f7ff'); }
      else { g.addColorStop(0, '#29306e'); g.addColorStop(.5, '#6a4f9a'); g.addColorStop(.85, '#e88f86'); g.addColorStop(1, '#ffc98a'); }
      x.fillStyle = g; x.fillRect(0, 0, w, h);
      if(sunny){ x.fillStyle = '#fff3a0'; x.beginPath(); x.arc(190, 60, 26, 0, 6.3); x.fill(); x.fillStyle = 'rgba(255,255,255,.9)'; for(const [a, b] of [[60, 70], [90, 60], [120, 72]]){ x.beginPath(); x.arc(a, b, 22, 0, 6.3); x.fill(); } }
      else {
        x.fillStyle = '#fff6d8'; x.beginPath(); x.arc(185, 62, 24, 0, 6.3); x.fill(); x.fillStyle = '#6a4f9a'; x.beginPath(); x.arc(198, 54, 21, 0, 6.3); x.fill();
        x.fillStyle = '#fff'; for(let i = 0; i < 26; i++){ x.globalAlpha = .4 + R() * .6; x.beginPath(); x.arc(R() * w, R() * h * .55, R() * 1.8 + .6, 0, 6.3); x.fill(); } x.globalAlpha = 1;
      }
      x.fillStyle = sunny ? '#6cc35a' : '#3b2e5e'; x.beginPath(); x.moveTo(0, h); x.lineTo(0, h * .8); x.quadraticCurveTo(w * .3, h * .66, w * .55, h * .8); x.quadraticCurveTo(w * .8, h * .7, w, h * .78); x.lineTo(w, h); x.fill();
      x.fillStyle = sunny ? '#3f9a45' : '#2a2148'; for(const tx of [40, 120, 210]){ x.beginPath(); x.arc(tx, h * .78, 20, 0, 6.3); x.arc(tx + 16, h * .74, 16, 0, 6.3); x.fill(); }
    }, false);
  }
  T.skyEve = sky(false); T.skySun = sky(true);
  return T;
}
