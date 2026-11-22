/* Tiny Bobo: every texture is painted on a canvas at start (no image files).
   Tileable surfaces (wallpaper, stripes, tiles, mosaic, wood planks, tablecloth, fabric, grass, dirt, bark, roof, planks…)
   plus special pictures (book spines with our own funny titles, toy-block letters, the TV title screen, posters, the sun patch). */
export function makeTextures(THREE, maxAniso = 4){
  const rnd = (() => { let s = 1234567; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
  function cv(w, h, draw){ const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); draw(x, w, h); return c; }
  function tex(c, rep = true, srgb = true){
    const t = new THREE.CanvasTexture(c);
    if(srgb) t.colorSpace = THREE.SRGBColorSpace;
    if(rep){ t.wrapS = t.wrapT = THREE.RepeatWrapping; }
    t.anisotropy = maxAniso; t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter;
    return t;
  }
  const noise = (x, w, h, a, n = 2000, size = 2) => { for(let i = 0; i < n; i++){ x.fillStyle = `rgba(${rnd() < .5 ? '0,0,0' : '255,255,255'},${a * rnd()})`; x.fillRect(rnd() * w, rnd() * h, size, size); } };
  const T = {};

  /* living-room wallpaper: warm cream with soft rose sprigs and gold dots in a half-drop repeat */
  T.wallpaper = tex(cv(256, 256, (x, w, h) => {
    x.fillStyle = '#f6e6c8'; x.fillRect(0, 0, w, h);
    x.fillStyle = 'rgba(230,200,160,.35)'; for(let i = 0; i < w; i += 32) x.fillRect(i, 0, 14, h);
    const sprig = (cx, cy) => {
      x.strokeStyle = '#7aa36b'; x.lineWidth = 3; x.beginPath(); x.moveTo(cx, cy + 22); x.quadraticCurveTo(cx - 6, cy + 6, cx, cy - 8); x.stroke();
      x.fillStyle = '#86b277'; for(const s of [-1, 1]){ x.beginPath(); x.ellipse(cx + s * 9, cy + 10, 8, 4, s * .6, 0, 7); x.fill(); }
      x.fillStyle = '#e88f8a'; for(let k = 0; k < 5; k++){ const a = k / 5 * 6.28; x.beginPath(); x.arc(cx + Math.cos(a) * 7, cy - 10 + Math.sin(a) * 7, 6, 0, 7); x.fill(); }
      x.fillStyle = '#f7c65c'; x.beginPath(); x.arc(cx, cy - 10, 4.5, 0, 7); x.fill();
    };
    for(const [cx, cy] of [[64, 64], [192, 192], [192, -64], [-64, 192], [64, 320], [320, 64]]) sprig(cx, cy);
    x.fillStyle = '#d9a84a'; for(const [cx, cy] of [[192, 64], [64, 192], [0, 0], [256, 0], [0, 256], [256, 256], [128, 128]]){ x.beginPath(); x.arc(cx, cy, 4, 0, 7); x.fill(); }
    noise(x, w, h, .05, 1500);
  }));
  /* kids' room: green and white stripes with a thin darker line */
  T.stripes = tex(cv(128, 128, (x, w, h) => {
    x.fillStyle = '#fbfff4'; x.fillRect(0, 0, w, h);
    x.fillStyle = '#8fd27a'; x.fillRect(0, 0, 48, h);
    x.fillStyle = '#76bf63'; x.fillRect(46, 0, 3, h); x.fillRect(0, 0, 3, h);
    x.fillStyle = 'rgba(143,210,122,.45)'; x.fillRect(84, 0, 10, h);
    noise(x, w, h, .04, 500);
  }));
  /* white square tiles with grey grout */
  T.tiles = tex(cv(256, 256, (x, w, h) => {
    x.fillStyle = '#c9cdd2'; x.fillRect(0, 0, w, h);
    for(let i = 0; i < 4; i++) for(let j = 0; j < 4; j++){
      const g = x.createLinearGradient(i * 64, j * 64, i * 64 + 64, j * 64 + 64); g.addColorStop(0, '#ffffff'); g.addColorStop(1, '#eef1f4');
      x.fillStyle = g; x.fillRect(i * 64 + 3, j * 64 + 3, 58, 58);
      x.fillStyle = 'rgba(255,255,255,.9)'; x.fillRect(i * 64 + 6, j * 64 + 6, 20, 4);
    }
  }));
  /* black and white checker floor tiles (kitchen) */
  T.checkTiles = tex(cv(256, 256, (x, w, h) => {
    x.fillStyle = '#9aa0a6'; x.fillRect(0, 0, w, h);
    for(let i = 0; i < 4; i++) for(let j = 0; j < 4; j++){ x.fillStyle = (i + j) % 2 ? '#f4f1ea' : '#e2534d'; x.fillRect(i * 64 + 2, j * 64 + 2, 60, 60); x.fillStyle = 'rgba(255,255,255,.18)'; x.fillRect(i * 64 + 6, j * 64 + 6, 52, 8); }
    noise(x, w, h, .05, 800);
  }));
  /* blue mosaic: small squares in several blues */
  T.mosaic = tex(cv(256, 256, (x, w, h) => {
    x.fillStyle = '#dfe8ee'; x.fillRect(0, 0, w, h);
    const cols = ['#2f7fd0', '#3e95e2', '#5aaef0', '#1f63b3', '#7cc3f5', '#2a8ac4', '#4aa0d8'];
    for(let i = 0; i < 16; i++) for(let j = 0; j < 16; j++){ x.fillStyle = cols[Math.floor(rnd() * cols.length)]; x.fillRect(i * 16 + 1.5, j * 16 + 1.5, 13, 13); x.fillStyle = 'rgba(255,255,255,.25)'; x.fillRect(i * 16 + 3, j * 16 + 3, 6, 2); }
  }));
  /* wood floor: long planks with dark seams and grain */
  function planks(base, dark, light, n = 4){
    return cv(256, 256, (x, w, h) => {
      const ph = h / n;
      for(let j = 0; j < n; j++){
        const off = (j * 97) % w;
        for(let k = -1; k < 2; k++){
          const x0 = off + k * w;
          const g = x.createLinearGradient(0, j * ph, 0, j * ph + ph); g.addColorStop(0, light); g.addColorStop(.5, base); g.addColorStop(1, light);
          x.fillStyle = g; x.fillRect(x0, j * ph, w, ph);
          x.strokeStyle = dark; x.globalAlpha = .25; x.lineWidth = 1;
          for(let l = 0; l < 7; l++){ const y = j * ph + 4 + rnd() * (ph - 8); x.beginPath(); x.moveTo(x0, y); x.bezierCurveTo(x0 + w * .3, y + rnd() * 6 - 3, x0 + w * .6, y + rnd() * 6 - 3, x0 + w, y); x.stroke(); }
          x.globalAlpha = 1;
          x.fillStyle = dark; x.fillRect(x0, j * ph, 3, ph);
        }
        x.fillStyle = dark; x.fillRect(0, j * ph, w, 3);
      }
      noise(x, w, h, .06, 1200);
    });
  }
  T.wood = tex(planks('#c98a4b', '#5a3416', '#d99b5a'));
  T.woodLight = tex(planks('#e2b57a', '#8a5a2e', '#ecc58e'));
  T.woodDark = tex(planks('#8a5532', '#3a1f0e', '#9a6440', 3));
  /* plain painted/varnished wood for furniture (vertical grain, no seams) */
  T.grain = tex(cv(128, 128, (x, w, h) => {
    x.fillStyle = '#d8a46a'; x.fillRect(0, 0, w, h);
    x.strokeStyle = 'rgba(110,60,25,.25)'; for(let i = 0; i < 26; i++){ const y = rnd() * h; x.lineWidth = .5 + rnd() * 1.5; x.beginPath(); x.moveTo(0, y); x.bezierCurveTo(w * .3, y + rnd() * 8 - 4, w * .7, y + rnd() * 8 - 4, w, y); x.stroke(); }
    noise(x, w, h, .05, 400);
  }));
  /* blue and white checkered tablecloth */
  T.cloth = tex(cv(128, 128, (x, w, h) => {
    x.fillStyle = '#ffffff'; x.fillRect(0, 0, w, h);
    x.fillStyle = 'rgba(52,118,214,.55)'; for(let i = 0; i < 4; i++){ x.fillRect(i * 32, 0, 16, h); x.fillRect(0, i * 32, w, 16); }
    x.fillStyle = 'rgba(40,96,190,.45)'; for(let i = 0; i < 4; i++) for(let j = 0; j < 4; j++) x.fillRect(i * 32, j * 32, 16, 16);
    x.strokeStyle = 'rgba(255,255,255,.25)'; for(let i = 0; i < w; i += 3){ x.beginPath(); x.moveTo(i, 0); x.lineTo(i, h); x.stroke(); }
  }));
  /* soft woven fabric (sofa) — tinted by vertex colour */
  T.fabric = tex(cv(128, 128, (x, w, h) => {
    x.fillStyle = '#e8e8e8'; x.fillRect(0, 0, w, h);
    for(let j = 0; j < h; j += 4) for(let i = 0; i < w; i += 4){ x.fillStyle = ((i + j) / 4) % 2 ? 'rgba(255,255,255,.5)' : 'rgba(0,0,0,.07)'; x.fillRect(i, j, 4, 2); x.fillRect(i + 2, j + 2, 2, 2); }
    noise(x, w, h, .06, 1500, 1);
  }));
  /* plaster / paint (walls, ceiling, plain plastic) */
  T.plaster = tex(cv(128, 128, (x, w, h) => { x.fillStyle = '#f4f4f4'; x.fillRect(0, 0, w, h); noise(x, w, h, .04, 1600, 2); }));
  /* plastic with a soft sheen (toys, appliances): almost white so the vertex colour shows */
  T.plastic = tex(cv(64, 64, (x, w, h) => { x.fillStyle = '#fbfbfb'; x.fillRect(0, 0, w, h); noise(x, w, h, .02, 200, 2); }));
  /* rugs */
  T.rug = tex(cv(256, 256, (x, w, h) => {
    x.fillStyle = '#c84f4a'; x.fillRect(0, 0, w, h);
    x.strokeStyle = '#f2d39a'; x.lineWidth = 10; x.strokeRect(14, 14, w - 28, h - 28);
    x.strokeStyle = '#2e5e8a'; x.lineWidth = 6; x.strokeRect(34, 34, w - 68, h - 68);
    x.fillStyle = '#f2d39a'; x.save(); x.translate(w / 2, h / 2); x.rotate(Math.PI / 4); x.fillRect(-46, -46, 92, 92); x.fillStyle = '#2e5e8a'; x.fillRect(-26, -26, 52, 52); x.restore();
    for(const [cx, cy] of [[60, 60], [196, 60], [60, 196], [196, 196]]){ x.fillStyle = '#e88f3a'; x.beginPath(); x.arc(cx, cy, 12, 0, 7); x.fill(); }
    noise(x, w, h, .1, 5000, 1);
  }, false), false);
  T.playmat = tex(cv(256, 256, (x, w, h) => {
    const cols = ['#ffd23f', '#5ed6a0', '#6cc4ff', '#ff8fb1'];
    for(let i = 0; i < 4; i++) for(let j = 0; j < 4; j++){ x.fillStyle = cols[(i + j * 2) % 4]; x.fillRect(i * 64, j * 64, 64, 64);
      x.fillStyle = 'rgba(255,255,255,.55)'; x.beginPath(); if((i + j) % 2) x.arc(i * 64 + 32, j * 64 + 32, 14, 0, 7); else { x.moveTo(i * 64 + 32, j * 64 + 14); x.lineTo(i * 64 + 50, j * 64 + 48); x.lineTo(i * 64 + 14, j * 64 + 48); } x.fill(); }
    x.strokeStyle = 'rgba(0,0,0,.12)'; x.lineWidth = 2; for(let i = 0; i <= 4; i++){ x.beginPath(); x.moveTo(i * 64, 0); x.lineTo(i * 64, h); x.moveTo(0, i * 64); x.lineTo(w, i * 64); x.stroke(); }
  }));
  /* bed blanket: stars on soft blue quilt */
  T.quilt = tex(cv(128, 128, (x, w, h) => {
    x.fillStyle = '#7fb6f0'; x.fillRect(0, 0, w, h);
    x.fillStyle = '#9cc8f5'; x.fillRect(0, 0, 64, 64); x.fillRect(64, 64, 64, 64);
    x.strokeStyle = 'rgba(255,255,255,.6)'; x.setLineDash([4, 4]); x.lineWidth = 2; x.strokeRect(4, 4, 56, 56); x.strokeRect(68, 68, 56, 56); x.strokeRect(68, 4, 56, 56); x.strokeRect(4, 68, 56, 56); x.setLineDash([]);
    const star = (cx, cy, r) => { x.beginPath(); for(let i = 0; i < 10; i++){ const a = i / 10 * 6.283 - 1.57, rr = i % 2 ? r * .45 : r; x[i ? 'lineTo' : 'moveTo'](cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); } x.fill(); };
    x.fillStyle = '#ffe27a'; star(32, 32, 14); star(96, 96, 14); x.fillStyle = '#fff'; star(96, 32, 9); star(32, 96, 9);
  }));
  /* outdoor */
  T.grass = tex(cv(256, 256, (x, w, h) => {
    x.fillStyle = '#7cc957'; x.fillRect(0, 0, w, h);
    for(let i = 0; i < 2600; i++){ const g = 140 + rnd() * 80; x.strokeStyle = `rgba(${60 + rnd() * 40},${g},${40 + rnd() * 30},.55)`; const px = rnd() * w, py = rnd() * h; x.lineWidth = 1.2; x.beginPath(); x.moveTo(px, py); x.lineTo(px + rnd() * 4 - 2, py - 3 - rnd() * 5); x.stroke(); }
    for(let i = 0; i < 18; i++){ x.fillStyle = rnd() < .5 ? 'rgba(255,255,255,.7)' : 'rgba(255,220,90,.7)'; x.beginPath(); x.arc(rnd() * w, rnd() * h, 1.6, 0, 7); x.fill(); }
  }));
  T.dirt = tex(cv(128, 128, (x, w, h) => {
    x.fillStyle = '#d9a86a'; x.fillRect(0, 0, w, h);
    for(let i = 0; i < 160; i++){ x.fillStyle = rnd() < .5 ? 'rgba(150,100,55,.35)' : 'rgba(250,215,160,.4)'; x.beginPath(); x.ellipse(rnd() * w, rnd() * h, 1 + rnd() * 3, 1 + rnd() * 2, rnd() * 3, 0, 7); x.fill(); }
    noise(x, w, h, .08, 1500, 1);
  }));
  T.bark = tex(cv(64, 128, (x, w, h) => {
    x.fillStyle = '#8a5a35'; x.fillRect(0, 0, w, h);
    for(let i = 0; i < 14; i++){ x.strokeStyle = 'rgba(60,35,18,.5)'; x.lineWidth = 2 + rnd() * 2; const px = rnd() * w; x.beginPath(); x.moveTo(px, 0); x.bezierCurveTo(px + 6, h * .3, px - 6, h * .6, px, h); x.stroke(); }
  }));
  T.leaves = tex(cv(128, 128, (x, w, h) => {
    x.fillStyle = '#4fae46'; x.fillRect(0, 0, w, h);
    for(let i = 0; i < 260; i++){ x.fillStyle = rnd() < .5 ? 'rgba(40,120,40,.5)' : 'rgba(150,220,100,.45)'; x.beginPath(); x.ellipse(rnd() * w, rnd() * h, 3 + rnd() * 5, 2 + rnd() * 3, rnd() * 3, 0, 7); x.fill(); }
  }));
  T.roof = tex(cv(128, 128, (x, w, h) => {
    x.fillStyle = '#d8d0c8'; x.fillRect(0, 0, w, h);
    for(let j = 0; j < 8; j++) for(let i = -1; i < 5; i++){ const ox = i * 32 + (j % 2) * 16; x.fillStyle = j % 2 ? '#ffffff' : '#ece4dc'; x.beginPath(); x.moveTo(ox, j * 16); x.lineTo(ox + 30, j * 16); x.lineTo(ox + 30, j * 16 + 10); x.quadraticCurveTo(ox + 15, j * 16 + 18, ox, j * 16 + 10); x.fill(); }
  }));
  T.boards = tex(cv(128, 128, (x, w, h) => {
    for(let i = 0; i < 4; i++){ x.fillStyle = ['#c08a55', '#b57f4b', '#c9945e', '#ba844f'][i]; x.fillRect(i * 32, 0, 32, h); x.fillStyle = '#6e4423'; x.fillRect(i * 32, 0, 2, h);
      x.fillStyle = '#5a3a20'; x.beginPath(); x.arc(i * 32 + 16, 10, 2, 0, 7); x.arc(i * 32 + 16, h - 10, 2, 0, 7); x.fill(); }
    noise(x, w, h, .06, 800);
  }));
  T.stone = tex(cv(128, 128, (x, w, h) => {
    x.fillStyle = '#9a9aa0'; x.fillRect(0, 0, w, h);
    for(let j = 0; j < 4; j++) for(let i = -1; i < 4; i++){ const ox = i * 40 + (j % 2) * 20; x.fillStyle = `hsl(30,${5 + rnd() * 10}%,${62 + rnd() * 14}%)`; x.beginPath(); x.roundRect ? x.roundRect(ox + 2, j * 32 + 2, 36, 28, 7) : x.rect(ox + 2, j * 32 + 2, 36, 28); x.fill(); }
    noise(x, w, h, .06, 800);
  }));
  T.water = tex(cv(128, 128, (x, w, h) => {
    x.fillStyle = '#5cc6ee'; x.fillRect(0, 0, w, h);
    x.strokeStyle = 'rgba(255,255,255,.55)'; x.lineWidth = 2;
    for(let i = 0; i < 14; i++){ const px = rnd() * w, py = rnd() * h, l = 8 + rnd() * 16; x.beginPath(); x.moveTo(px, py); x.quadraticCurveTo(px + l / 2, py - 3, px + l, py); x.stroke(); }
  }));
  /* striped awnings: one canvas per colour */
  T.awning = col => tex(cv(64, 64, (x, w, h) => { x.fillStyle = '#fffaf0'; x.fillRect(0, 0, w, h); x.fillStyle = col; x.fillRect(0, 0, 32, h); x.fillStyle = 'rgba(0,0,0,.08)'; x.fillRect(30, 0, 2, h); }));
  /* toy blocks: 4×4 atlas of bright faces with a letter, number or shape */
  T.blocks = (() => {
    const glyphs = ['A', 'B', 'C', 'أ', 'ب', 'ت', '1', '2', '3', '★', '♥', '●', 'D', 'ث', '4', '▲'];
    const cols = ['#ff6b6b', '#ffb43d', '#ffe14d', '#5ed67a', '#4fb3ff', '#a77bff', '#ff8fc8', '#3fd1c4'];
    const t = tex(cv(512, 512, (x) => {
      for(let i = 0; i < 16; i++){
        const cx = (i % 4) * 128, cy = Math.floor(i / 4) * 128, c = cols[i % cols.length];
        x.fillStyle = c; x.fillRect(cx, cy, 128, 128);
        const g = x.createLinearGradient(cx, cy, cx + 128, cy + 128); g.addColorStop(0, 'rgba(255,255,255,.28)'); g.addColorStop(1, 'rgba(0,0,0,.12)'); x.fillStyle = g; x.fillRect(cx, cy, 128, 128);
        x.strokeStyle = 'rgba(255,255,255,.55)'; x.lineWidth = 6; x.strokeRect(cx + 14, cy + 14, 100, 100);
        x.font = '800 62px "Baloo Bhaijaan 2",Arial,sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
        x.fillStyle = 'rgba(0,0,0,.18)'; x.fillText(glyphs[i], cx + 67, cy + 71);
        x.fillStyle = '#ffffff'; x.fillText(glyphs[i], cx + 64, cy + 67);
      }
    }), false);
    return t;
  })();
  /* book spines: atlas of 8 spines (title, colour, bands) — the funny titles are our own */
  T.books = (titles) => {
    const cols = ['#c8463d', '#2f6db5', '#3a9a5b', '#e0a52a', '#7a4fb0', '#e06f9a', '#2aa3a3', '#9a5a2e'];
    return tex(cv(1024, 256, (x) => {
      for(let i = 0; i < 8; i++){
        const cx = i * 128, c = cols[i];
        x.fillStyle = c; x.fillRect(cx, 0, 128, 256);
        x.fillStyle = 'rgba(255,255,255,.18)'; x.fillRect(cx + 8, 0, 10, 256);
        x.fillStyle = '#f5d36b'; x.fillRect(cx, 22, 128, 8); x.fillRect(cx, 226, 128, 8); x.fillRect(cx, 36, 128, 3); x.fillRect(cx, 219, 128, 3);
        x.save(); x.translate(cx + 64, 128); x.rotate(-Math.PI / 2);
        x.fillStyle = '#fff8e0'; x.textAlign = 'center'; x.textBaseline = 'middle';
        const t = titles[i % titles.length]; let fs = 34; x.font = `800 ${fs}px "Baloo Bhaijaan 2","Tajawal",Arial,sans-serif`;
        while(x.measureText(t).width > 168 && fs > 14){ fs -= 2; x.font = `800 ${fs}px "Baloo Bhaijaan 2","Tajawal",Arial,sans-serif`; }
        x.fillText(t, 0, 2); x.restore();
      }
    }), false);
  };
  /* a framed picture (our own drawings): hills + sun, or a rocket, or a cat */
  T.poster = kind => tex(cv(128, 96, (x, w, h) => {
    if(kind === 0){ const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#8fd3ff'); g.addColorStop(1, '#d8f2ff'); x.fillStyle = g; x.fillRect(0, 0, w, h);
      x.fillStyle = '#ffd23f'; x.beginPath(); x.arc(100, 24, 12, 0, 7); x.fill(); x.fillStyle = '#6cc75a'; x.beginPath(); x.ellipse(30, 96, 60, 36, 0, 0, 7); x.fill(); x.fillStyle = '#4fae46'; x.beginPath(); x.ellipse(105, 100, 50, 30, 0, 0, 7); x.fill(); }
    else if(kind === 1){ x.fillStyle = '#26315e'; x.fillRect(0, 0, w, h); x.fillStyle = '#fff'; for(let i = 0; i < 30; i++) x.fillRect(rnd() * w, rnd() * h, 1.5, 1.5);
      x.fillStyle = '#e8e8f0'; x.beginPath(); x.ellipse(64, 48, 12, 28, .5, 0, 7); x.fill(); x.fillStyle = '#ff5a5a'; x.beginPath(); x.moveTo(74, 24); x.lineTo(88, 18); x.lineTo(80, 32); x.fill(); x.fillStyle = '#ffb43d'; x.beginPath(); x.ellipse(50, 70, 5, 10, .5, 0, 7); x.fill(); }
    else { x.fillStyle = '#ffe8c2'; x.fillRect(0, 0, w, h); x.fillStyle = '#ff9a3c'; x.beginPath(); x.arc(64, 54, 26, 0, 7); x.fill(); x.beginPath(); x.moveTo(42, 40); x.lineTo(46, 18); x.lineTo(58, 32); x.fill(); x.beginPath(); x.moveTo(86, 40); x.lineTo(82, 18); x.lineTo(70, 32); x.fill();
      x.fillStyle = '#3a2410'; x.beginPath(); x.arc(55, 50, 3.5, 0, 7); x.arc(73, 50, 3.5, 0, 7); x.fill(); x.fillStyle = '#ff6f8f'; x.beginPath(); x.arc(64, 59, 3, 0, 7); x.fill(); }
    x.strokeStyle = '#fff'; x.lineWidth = 6; x.strokeRect(3, 3, w - 6, h - 6);
  }), false);
  /* a soft window-shaped sun patch (4 panes) for floors */
  T.sunPatch = tex(cv(128, 128, (x, w, h) => {
    x.filter = 'blur(5px)'; x.fillStyle = '#fff';
    for(const [i, j] of [[0, 0], [1, 0], [0, 1], [1, 1]]) x.fillRect(14 + i * 52, 14 + j * 52, 46, 46);
    x.filter = 'none';
  }, false), false);
  T.ray = tex(cv(64, 128, (x, w, h) => { const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, 'rgba(255,255,255,.9)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, w, h);
    const g2 = x.createLinearGradient(0, 0, w, 0); g2.addColorStop(0, 'rgba(0,0,0,1)'); g2.addColorStop(.25, 'rgba(0,0,0,0)'); g2.addColorStop(.75, 'rgba(0,0,0,0)'); g2.addColorStop(1, 'rgba(0,0,0,1)');
    x.globalCompositeOperation = 'destination-out'; x.fillStyle = g2; x.fillRect(0, 0, w, h); }, false), false);
  T.sky = tex(cv(16, 256, (x, w, h) => { const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#5fb4f4'); g.addColorStop(.55, '#aee0ff'); g.addColorStop(1, '#fff3d6'); x.fillStyle = g; x.fillRect(0, 0, w, h); }, false), false);
  T.cloud = tex(cv(128, 64, (x) => { x.fillStyle = '#fff'; x.filter = 'blur(3px)'; for(const [cx, cy, r] of [[34, 40, 20], [60, 30, 26], [90, 38, 20], [72, 44, 18]]){ x.beginPath(); x.arc(cx, cy, r, 0, 7); x.fill(); } }, false), false);
  T.glint = tex(cv(64, 64, (x) => { const g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.25, 'rgba(255,245,200,.6)'); g.addColorStop(1, 'rgba(255,240,180,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64);
    x.fillStyle = 'rgba(255,255,255,.9)'; x.fillRect(30, 2, 4, 60); x.fillRect(2, 30, 60, 4); }, false), false);
  T.blob = tex(cv(64, 64, (x) => { const g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(40,25,10,.55)'); g.addColorStop(.6, 'rgba(40,25,10,.25)'); g.addColorStop(1, 'rgba(40,25,10,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); }, false), false);
  T.cv = cv; T.tex = tex;
  return T;
}
