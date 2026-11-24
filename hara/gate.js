/* «حديقة الحارة»: the park gate between our two parks — two brick pillars, a green iron arch with leaves, a painted sign
   (a little tree / slide icon and the other park's name in the kid's language, painted on a canvas: no image files, no real
   place names) and a soft shimmering "portal" in the opening. Walk through it to go to the other park.
   x, z = the middle of the opening on the ground; yaw = the direction you walk through it (0 = towards +z). */
export function makeGate(THREE, K, o){
  const { Merge, G } = K;
  const grp = new THREE.Group(); grp.position.set(o.x, o.y || 0, o.z); grp.rotation.y = o.yaw;
  const W = 3.4, H = 3.1;          // opening width, pillar height
  const M = new Merge();
  for(const s of [-1, 1]){
    M.add(G.box, s * (W / 2 + .3), H / 2, 0, .62, H, .62, 0, 0, 0, o.pillar || 0xb5543a);
    M.add(G.box, s * (W / 2 + .3), H + .07, 0, .78, .14, .78, 0, 0, 0, 0xe9dcc8);
    M.add(G.sm, s * (W / 2 + .3), H + .3, 0, .2, .2, .2, 0, 0, 0, 0xf5cf1f);
    for(let k = 0; k < 4; k++) M.add(G.box, s * (W / 2 + .3), .35 + k * .72, 0, .64, .05, .64, 0, 0, 0, 0x8f3a24);
  }
  // the arch: half a torus over the opening, with leaves along it
  const arch = new THREE.TorusGeometry(W / 2 + .3, .12, 8, 28, Math.PI);
  M.add(arch, 0, H, 0, 1, 1, 1, 0, 0, 0, 0x2f6b3a);
  const rr = W / 2 + .3;
  for(let k = 0; k <= 12; k++){ const a = k / 12 * Math.PI; M.add(G.ico, Math.cos(a) * rr, H + Math.sin(a) * rr, (k % 2 ? .12 : -.12), .26 + (k % 3) * .05, .2, .26, k, k * 2, 0, [0x3f8a3a, 0x5aa83f, 0x2f7a35][k % 3]); }
  // little flowers on the arch
  for(let k = 1; k < 12; k += 2){ const a = k / 12 * Math.PI; M.add(G.sm, Math.cos(a) * rr, H + Math.sin(a) * rr + .12, 0, .09, .09, .09, 0, 0, 0, [0xff8fb1, 0xffd23f, 0xffffff][k % 3]); }
  // sign board frame
  M.add(G.box, 0, H + .35, 0, 3.0, .86, .1, 0, 0, 0, 0x6b4428);
  for(const s of [-1, 1]) M.add(G.cyl8, s * 1.1, H + .9, 0, .03, .5, .03, 0, 0, 0, 0x2f6b3a);
  const mesh = new THREE.Mesh(M.geometry(), new THREE.MeshLambertMaterial({ vertexColors:true }));
  mesh.castShadow = true; mesh.receiveShadow = true; grp.add(mesh);
  // the painted sign (both faces)
  const cv = document.createElement('canvas'); cv.width = 512; cv.height = 140;
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
  function paint(){
    const x = cv.getContext('2d'), w = cv.width, h = cv.height;
    x.clearRect(0, 0, w, h);
    x.fillStyle = '#fff3d6'; x.beginPath(); x.roundRect ? x.roundRect(6, 6, w - 12, h - 12, 26) : x.rect(6, 6, w - 12, h - 12); x.fill();
    x.lineWidth = 8; x.strokeStyle = o.ring || '#3f8a3a'; x.stroke();
    // icon: a round tree, or a little slide
    const ix = 70, iy = 70;
    if(o.icon === 'slide'){
      x.fillStyle = '#7d55e8'; x.fillRect(ix - 34, iy - 34, 10, 64); x.fillRect(ix - 34, iy - 34, 30, 8);
      x.strokeStyle = '#f5cf1f'; x.lineWidth = 12; x.lineCap = 'round'; x.beginPath(); x.moveTo(ix - 8, iy - 28); x.quadraticCurveTo(ix + 10, iy + 26, ix + 38, iy + 30); x.stroke();
    } else {
      x.fillStyle = '#6b4428'; x.fillRect(ix - 6, iy, 12, 40);
      x.fillStyle = '#3f8a3a'; for(const [dx, dy, r] of [[0, -14, 30], [-20, 2, 22], [20, 2, 22], [0, 8, 22]]){ x.beginPath(); x.arc(ix + dx, iy + dy, r, 0, 7); x.fill(); }
      x.fillStyle = '#5aa83f'; x.beginPath(); x.arc(ix - 8, iy - 22, 12, 0, 7); x.fill();
    }
    let fs = 54; const font = s => `800 ${s}px "Baloo Bhaijaan 2", Tajawal, Arial, sans-serif`;
    x.font = font(fs); while(x.measureText(o.text).width > w - 170 && fs > 22){ fs -= 2; x.font = font(fs); }
    x.fillStyle = '#4a2f1d'; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillText(o.text, (w + 120) / 2, h / 2 + 4);
    tex.needsUpdate = true;
  }
  paint();
  try{ if(document.fonts && document.fonts.ready) document.fonts.ready.then(paint, () => {}); }catch(e){}
  const smat = new THREE.MeshBasicMaterial({ map:tex });
  for(const s of [1, -1]){ const p = new THREE.Mesh(new THREE.PlaneGeometry(2.86, .78), smat); p.position.set(0, H + .35, s * .056); if(s < 0) p.rotation.y = Math.PI; grp.add(p); }
  // the soft portal shimmer in the opening (additive)
  const pc = document.createElement('canvas'); pc.width = 64; pc.height = 128;
  { const x = pc.getContext('2d'), g = x.createLinearGradient(0, 128, 0, 0); g.addColorStop(0, 'rgba(255,240,170,.85)'); g.addColorStop(.6, 'rgba(170,255,200,.35)'); g.addColorStop(1, 'rgba(170,220,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 128);
    const g2 = x.createLinearGradient(0, 0, 64, 0); g2.addColorStop(0, 'rgba(0,0,0,1)'); g2.addColorStop(.2, 'rgba(0,0,0,0)'); g2.addColorStop(.8, 'rgba(0,0,0,0)'); g2.addColorStop(1, 'rgba(0,0,0,1)'); x.globalCompositeOperation = 'destination-out'; x.fillStyle = g2; x.fillRect(0, 0, 64, 128); }
  const ptex = new THREE.CanvasTexture(pc); ptex.colorSpace = THREE.SRGBColorSpace;
  const pmat = new THREE.MeshBasicMaterial({ map:ptex, transparent:true, depthWrite:false, blending:THREE.AdditiveBlending, side:THREE.DoubleSide, opacity:.55 });
  const portal = new THREE.Mesh(new THREE.PlaneGeometry(W, H - .1), pmat); portal.position.y = (H - .1) / 2; portal.renderOrder = 4; grp.add(portal);
  // sparkles going up in the opening
  const sp = new THREE.InstancedMesh(new THREE.OctahedronGeometry(.06, 0), new THREE.MeshBasicMaterial({ color:0xfff3a0 }), 14);
  sp.frustumCulled = false; grp.add(sp);
  const _m = new THREE.Matrix4();
  function tick(t){
    pmat.opacity = .38 + Math.sin(t * 2.4) * .12;
    for(let i = 0; i < 14; i++){ const k = (t * .35 + i / 14) % 1, x = Math.sin(i * 7.1) * W * .42, z = Math.cos(i * 3.3) * .15; _m.makeTranslation(x, k * (H - .3), z); const s = Math.sin(k * Math.PI); _m.scale({ x:s, y:s, z:s }); sp.setMatrixAt(i, _m); }
    sp.instanceMatrix.needsUpdate = true;
  }
  // collision: the two pillars (world coordinates)
  const c = Math.cos(o.yaw), s = Math.sin(o.yaw);
  const pillars = [-1, 1].map(k => ({ x:o.x + k * (W / 2 + .3) * c, z:o.z - k * (W / 2 + .3) * s, r:.42, top:H + .4 }));
  return { grp, tick, pillars, x:o.x, z:o.z, yaw:o.yaw, top:H + 1.1 };
}
