/* Bobo Kart: the kart, the item pieces (banana peel, jelly blob, balloon, shield bubble, rocket), item boxes and stars. */
export function makeModels(THREE, K){
  const { Merge, G } = K;
  const lam = () => new THREE.MeshLambertMaterial({ vertexColors:true });
  const lighter = (c, k) => new THREE.Color(c).lerp(new THREE.Color(0xffffff), k).getHex();
  const darker = (c, k) => new THREE.Color(c).lerp(new THREE.Color(0x000000), k).getHex();

  /* a small round go-kart: body in the racer's colour, big bumpers, a seat, steering wheel, exhausts.
     faces +z; the hero sits in `seat` */
  const wheelGeo = (() => { const W = new Merge(), t = new THREE.CylinderGeometry(.36, .36, .34, 16).rotateZ(Math.PI / 2), h = new THREE.CylinderGeometry(.19, .19, .36, 10).rotateZ(Math.PI / 2);
    W.add(t, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0x2c2a33); W.add(h, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0xe8e8f0); W.add(G.box, 0, 0, 0, .37, .08, .3, 0, 0, 0, 0xb8b8c8); return W.geometry(); })();
  const flameGeo = new THREE.ConeGeometry(.15, .8, 8).rotateX(-Math.PI / 2).translate(0, 0, -.4);
  const flameIn = new THREE.ConeGeometry(.08, .5, 8).rotateX(-Math.PI / 2).translate(0, 0, -.25);
  const flameMat = new THREE.MeshBasicMaterial({ color:0xff8a1a, transparent:true, opacity:.9, depthWrite:false });
  const flameMatIn = new THREE.MeshBasicMaterial({ color:0xfff3a0, transparent:true, opacity:.95, depthWrite:false });
  const sparkTex = K.glowTex;
  function kart(color, opts = {}){
    const grp = new THREE.Group(), body = new THREE.Group(); grp.add(body);
    const M = new Merge(), lite = lighter(color, .35), dark = 0x2c2a33, dk = darker(color, .25);
    M.add(G.box, 0, .42, .05, 1.3, .3, 2.2, 0, 0, 0, color);                 // tub
    M.add(G.sph, 0, .5, .95, .66, .3, .55, 0, 0, 0, lite);                  // rounded nose
    M.add(G.box, 0, .58, .8, .9, .18, .7, -.18, 0, 0, color);                // hood
    M.add(G.box, 0, .3, 1.42, 1.65, .22, .26, 0, 0, 0, dark);                // front bumper
    M.add(G.box, 0, .3, -1.2, 1.7, .24, .26, 0, 0, 0, dark);                 // rear bumper
    for(const s of [-1, 1]){
      M.add(G.box, s * .72, .42, .05, .16, .26, 1.3, 0, 0, 0, dk);          // side pods
      M.add(G.sm, s * .3, .62, 1.3, .12, .1, .06, 0, 0, 0, 0xfff3b0);       // headlights
      M.add(G.cyl8, s * .32, .58, -1.25, .1, .36, .1, Math.PI / 2 - .3, 0, 0, 0x9a9aa8);  // exhausts
      M.add(G.box, s * .75, .55, .95, .3, .1, .5, 0, 0, 0, color);          // front fenders
      M.add(G.box, s * .78, .65, -.75, .34, .1, .6, 0, 0, 0, color);        // rear fenders
    }
    M.add(G.box, 0, .62, -.38, .72, .22, .7, 0, 0, 0, dark);                // seat
    M.add(G.box, 0, .78, -.74, .66, .34, .14, -.2, 0, 0, dk);               // back rest
    M.add(G.box, 0, .86, -1.22, 1.5, .08, .36, 0, 0, 0, lite);              // little wing (low, at the very back)
    for(const s of [-1, 1]) M.add(G.box, s * .55, .7, -1.2, .08, .3, .26, 0, 0, 0, dark);
    M.add(G.cyl8, 0, .78, .38, .04, .42, .04, -1.0, 0, 0, dark);             // steering column
    M.add(new THREE.TorusGeometry(.17, .035, 6, 14), 0, .92, .24, 1, 1, 1, -.9, 0, 0, dark);
    M.add(G.cyl, 0, .52, 1.43, .2, .05, .2, Math.PI / 2, 0, 0, 0xffffff);   // number disc
    const bm = new THREE.Mesh(M.geometry(), lam()); body.add(bm);
    const wheels = [];
    for(const [x, z, s] of [[-.78, .95, .88], [.78, .95, .88], [-.82, -.82, 1.05], [.82, -.82, 1.05]]){
      const piv = new THREE.Group(); piv.position.set(x, .36 * s, z); body.add(piv);
      const w = new THREE.Mesh(wheelGeo, lam()); w.scale.setScalar(s); piv.add(w); wheels.push({ piv, w, front:z > 0 });
    }
    const seat = new THREE.Group(); seat.position.set(0, .62, -.3); body.add(seat);
    const flames = [-.32, .32].map(x => { const g = new THREE.Group(); g.position.set(x, .62, -1.42); const a = new THREE.Mesh(flameGeo, flameMat), b = new THREE.Mesh(flameIn, flameMatIn); g.add(a, b); g.visible = false; body.add(g); return g; });
    // drift sparks: two glowing sprites at the back wheels
    const sparks = [-.85, .85].map(x => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map:sparkTex, color:0x5ab8ff, transparent:true, depthWrite:false })); s.position.set(x, .25, -1.0); s.scale.set(1.4, 1.4, 1); s.visible = false; s.renderOrder = 3;
      const core = new THREE.Sprite(new THREE.SpriteMaterial({ map:sparkTex, color:0xffffff, transparent:true, depthWrite:false })); core.scale.set(.5, .5, 1); core.renderOrder = 4; s.add(core); body.add(s); return s; });
    if(opts.ghost){ grp.traverse(o => { if(o.isMesh){ o.material = o.material.clone(); o.material.transparent = true; o.material.opacity = .42; o.material.depthWrite = false; } }); }
    return { grp, body, wheels, seat, flames, sparks, spin:0 };
  }

  /* banana peel (a cartoon peel: three yellow petals around a small stub) */
  const bananaGeo = (() => { const B = new Merge();
    for(let k = 0; k < 3; k++){ const a = k / 3 * Math.PI * 2; B.add(G.sph, Math.cos(a) * .32, .08, Math.sin(a) * .32, .38, .1, .16, 0, -a, .35, 0xffd23f); B.add(G.sph, Math.cos(a) * .6, .05, Math.sin(a) * .6, .14, .06, .12, 0, -a, 0, 0x8a6a1a); }
    B.add(G.cyl8, 0, .3, 0, .13, .5, .13, 0, 0, 0, 0xf2e6a0); B.add(G.cyl8, 0, .58, 0, .06, .1, .06, 0, 0, 0, 0x6a4a1a); return B.geometry(); })();
  /* jelly blob: wobbly green dome with two eyes */
  const jellyGeo = (() => { const J = new Merge(); J.add(G.hemi, 0, 0, 0, 1, .7, 1, 0, 0, 0, 0x6ee04a); J.add(G.sm, -.3, .48, .62, .17, .2, .1, 0, 0, 0, 0xffffff); J.add(G.sm, .3, .48, .62, .17, .2, .1, 0, 0, 0, 0xffffff);
    J.add(G.sm, -.3, .47, .7, .08, .1, .05, 0, 0, 0, 0x222222); J.add(G.sm, .3, .47, .7, .08, .1, .05, 0, 0, 0, 0x222222); return J.geometry(); })();
  const balloonGeo = (() => { const B = new Merge(); B.add(G.sph, 0, 1.0, 0, .62, .75, .62, 0, 0, 0, 0xff4f6e); B.add(G.cone, 0, .22, 0, .1, .14, .1, Math.PI, 0, 0, 0xff4f6e); B.add(G.cyl8, 0, -.4, 0, .015, 1.1, .015, 0, 0, 0, 0xffffff);
    B.add(G.sm, -.2, 1.3, .45, .12, .2, .06, 0, 0, 0, 0xffc0cc); return B.geometry(); })();
  const shieldGeo = new THREE.SphereGeometry(1.65, 20, 14);
  const shieldMat = new THREE.MeshBasicMaterial({ color:0x9fe6ff, transparent:true, opacity:.28, depthWrite:false });
  const shieldRim = new THREE.MeshBasicMaterial({ color:0xffffff, transparent:true, opacity:.35, depthWrite:false, side:THREE.BackSide });
  function shield(){ const g = new THREE.Group(); const a = new THREE.Mesh(shieldGeo, shieldMat), b = new THREE.Mesh(shieldGeo, shieldRim); b.scale.setScalar(1.03); g.add(a, b); g.position.y = .8; return g; }
  const items = {
    banana:() => new THREE.Mesh(bananaGeo, lam()),
    jelly:() => { const m = new THREE.Mesh(jellyGeo, new THREE.MeshLambertMaterial({ vertexColors:true, transparent:true, opacity:.88 })); m.scale.set(1.3, 1.3, 1.3); return m; },
    balloon:() => new THREE.Mesh(balloonGeo, lam()),
    shield
  };
  /* item box: a see-through rainbow cube with a «?» — instanced */
  const boxTex = K.canvasTex(128, 128, (x, w) => {
    const g = x.createLinearGradient(0, 0, w, w); ['#ff6b8b', '#ffc23d', '#5ed6a0', '#6cc4ff', '#c77dff'].forEach((c, i) => g.addColorStop(i / 4, c));
    x.fillStyle = g; x.fillRect(0, 0, w, w); x.strokeStyle = 'rgba(255,255,255,.9)'; x.lineWidth = 10; x.strokeRect(5, 5, w - 10, w - 10);
    x.fillStyle = '#fff'; x.font = '900 84px system-ui,sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.shadowColor = 'rgba(0,0,0,.35)'; x.shadowBlur = 6; x.fillText('?', w / 2, w / 2 + 6);
  });
  function boxes(n){
    const m = new THREE.InstancedMesh(new THREE.BoxGeometry(1.5, 1.5, 1.5), new THREE.MeshLambertMaterial({ map:boxTex, transparent:true, opacity:.92, emissive:0x332244 }), n);
    m.frustumCulled = false; return m;
  }
  function stars(n){
    const m = new THREE.InstancedMesh(K.starGeo, new THREE.MeshLambertMaterial({ color:0xffd23f, emissive:0x7a5200 }), n);
    m.frustumCulled = false; return m;
  }
  /* podium: three blocks 1/2/3 */
  function podium(){
    const g = new THREE.Group(), M = new Merge();
    const blk = [[0, 2.4, 0xffc23d], [-3.1, 1.6, 0xc8d2e0], [3.1, 1.1, 0xe0965a]];
    for(const [x, h, c] of blk){ M.add(G.box, x, h / 2, 0, 3, h, 3, 0, 0, 0, c); M.add(G.box, x, h + .05, 0, 3.15, .14, 3.15, 0, 0, 0, 0xffffff); }
    g.add(new THREE.Mesh(M.geometry(), lam()));
    blk.forEach(([x, h], i) => {
      const t = K.canvasTex(64, 64, (c) => { c.fillStyle = '#fff'; c.font = '900 52px system-ui,sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(String(i + 1), 32, 36); });
      const p = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 1.4), new THREE.MeshBasicMaterial({ map:t, transparent:true })); p.position.set(x, h * .5, 1.52); g.add(p);
    });
    g.userData.tops = blk.map(([x, h]) => [x, h]);
    return g;
  }
  return { kart, items, boxes, stars, podium, wheelGeo };
}
