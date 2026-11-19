/* «بيت عمّو زعلان»: the pranks. Each one is our own silly idea: a thing to find in the house (the item), a place to put it
   (the spot), the uncle's daily activity that sets it off (his station) and a big funny reaction (camera cut, comic word, stars).
   Every prank owns its little 3D props (fixtures) and their animations: set(on) shows that the prank is ready,
   react(k) plays the reaction (k 0..1), done() leaves the funny result, reset() puts everything back for a new mission. */
import { roundBox } from './house.js';

export function makePranks(THREE, K, scene, H, fx){
  const L = window.L || (a => a);
  const { CG, Merge, capsule, canvasTex, glowTex } = K;
  const LY = H.LY;
  const RB = roundBox(THREE, 3, .3);
  const lam = () => new THREE.MeshLambertMaterial({ vertexColors:true });
  const meshOf = (M, cast = true) => { const m = new THREE.Mesh(M.geometry(), lam()); m.castShadow = cast; return m; };
  const add = (o, x, y, z, ry = 0) => { o.position.set(x, y, z); o.rotation.y = ry; scene.add(o); return o; };
  const grpOf = (...ms) => { const g = new THREE.Group(); ms.forEach(m => g.add(m)); return g; };
  const lerp = (a, b, t) => a + (b - a) * t;
  const sk = k => Math.sin(Math.min(1, Math.max(0, k)) * Math.PI);

  /* ---------- the items you carry (about 25 cm) ---------- */
  const ITEM = {
    whoopee(){ const M = new Merge(); M.add(CG.sph, 0, .06, 0, .2, .07, .17, 0, 0, 0, 0xff6fae).add(CG.cyl8, 0, .06, .19, .03, .08, .03, Math.PI / 2, 0, 0, 0xff8fc4).add(CG.sm, -.06, .11, -.04, .05, .015, .04, 0, 0, 0, 0xffb3d6); return meshOf(M); },
    paint(){ const M = new Merge(); M.add(CG.cyl, 0, .09, 0, .1, .18, .1, 0, 0, 0, 0xffffff).add(CG.cyl, 0, .185, 0, .095, .01, .095, 0, 0, 0, 0x3f7fff).add(CG.sm, .06, .12, .09, .03, .05, .02, 0, 0, 0, 0x3f7fff)
      .add(CG.cyl8, -.03, .26, 0, .012, .22, .012, 0, 0, .3, 0xd9a86c).add(CG.box, -.06, .37, 0, .04, .05, .03, 0, 0, .3, 0x3f7fff); return meshOf(M); },
    salt(){ const M = new Merge(); M.add(CG.cyl, 0, .08, 0, .055, .16, .055, 0, 0, 0, 0xffffff).add(CG.hemi, 0, .16, 0, .055, .05, .055, 0, 0, 0, 0xb9c0c8); for(let i = 0; i < 4; i++) M.add(CG.sm, Math.cos(i * 1.6) * .02, .2, Math.sin(i * 1.6) * .02, .008, .008, .008, 0, 0, 0, 0x333333);
      M.add(CG.box, 0, .08, .056, .05, .05, .004, 0, 0, 0, 0x5fb0e8); return meshOf(M); },
    spider(){ const M = new Merge(); M.add(CG.sph, 0, .07, 0, .08, .06, .1, 0, 0, 0, 0x2a2238).add(CG.sph, 0, .08, .1, .055, .05, .05, 0, 0, 0, 0x3a3250);
      for(const s of [-1, 1]){ for(let i = 0; i < 4; i++){ const z = -.04 + i * .04; M.add(capsule(.008, .1), s * .1, .07, z, 1, 1, 1, 0, 0, s * 1.0, 0x2a2238).add(capsule(.008, .08), s * .17, .03, z, 1, 1, 1, 0, 0, -s * .4, 0x2a2238); }
        M.add(CG.sm, s * .025, .11, .14, .022, .022, .015, 0, 0, 0, 0xffffff).add(CG.sm, s * .025, .11, .152, .01, .01, .006, 0, 0, 0, 0x111111); }
      M.add(CG.sm, 0, .12, -.02, .03, .015, .04, 0, 0, 0, 0xff6fae); return meshOf(M); },
    popper(){ const M = new Merge(); M.add(new THREE.ConeGeometry(.07, .22, 14), 0, .11, 0, 1, 1, 1, Math.PI, 0, 0, 0xffcd4d); for(let i = 0; i < 3; i++) M.add(CG.cyl, 0, .05 + i * .06, 0, .055 - i * .016, .015, .055 - i * .016, 0, 0, 0, 0xff6fae);
      for(let i = 0; i < 5; i++) M.add(CG.box, Math.cos(i * 1.3) * .04, .25 + (i % 2) * .03, Math.sin(i * 1.3) * .04, .012, .08, .012, .4 * Math.cos(i), 0, .4 * Math.sin(i), [0x5fe3b1, 0x5fb8ff, 0xff6f61][i % 3]); return meshOf(M); },
    glitter(){ const g = new THREE.Group(); const M = new Merge(); for(let i = 0; i < 14; i++) M.add(CG.sm, Math.cos(i * 2.3) * .05, .04 + (i % 5) * .025, Math.sin(i * 2.3) * .05, .022, .022, .022, 0, 0, 0, [0xffcd4d, 0xff8fb8, 0xb99bff, 0x8fe3ff][i % 4]);
      M.add(CG.cyl, 0, .19, 0, .085, .03, .085, 0, 0, 0, 0xff6fae); g.add(meshOf(M));
      g.add(new THREE.Mesh(new THREE.CylinderGeometry(.08, .08, .17, 18), new THREE.MeshLambertMaterial({ color:0xe8f6ff, transparent:true, opacity:.4, depthWrite:false })).translateY(.09)); return g; },
    jelly(){ const M = new Merge(); M.add(CG.cyl, 0, .015, 0, .15, .03, .15, 0, 0, 0, 0xffffff).add(CG.hemi, 0, .03, 0, .12, .13, .12, 0, 0, 0, 0x6fd84a).add(CG.sm, .03, .13, .02, .03, .02, .03, 0, 0, 0, 0xc8ff9a).add(CG.sm, 0, .17, 0, .025, .025, .025, 0, 0, 0, 0xff4d6d); return meshOf(M); },
    slime(){ const M = new Merge(); M.add(CG.cyl, 0, .1, 0, .11, .2, .1, 0, 0, 0, 0xffcd4d).add(CG.hemi, 0, .2, 0, .1, .07, .1, 0, 0, 0, 0x7be05a).add(CG.sm, .07, .16, .07, .03, .06, .03, 0, 0, 0, 0x7be05a).add(new THREE.TorusGeometry(.08, .012, 6, 14, Math.PI), 0, .22, 0, 1, 1, 1, 0, Math.PI / 2, 0, 0x8a959e); return meshOf(M); },
    tonic(){ const M = new Merge(); M.add(CG.cyl, 0, .1, 0, .065, .2, .065, 0, 0, 0, 0xa36bff).add(CG.cyl8, 0, .22, 0, .025, .05, .025, 0, 0, 0, 0xa36bff).add(CG.cyl, 0, .26, 0, .035, .04, .035, 0, 0, 0, 0xffcd4d).add(CG.box, 0, .1, .064, .08, .08, .005, 0, 0, 0, 0xfff4d8)
      .add(CG.sm, 0, .1, .07, .02, .012, .004, 0, 0, 0, 0x6b4226); return meshOf(M); },
    bubbles(){ const g = new THREE.Group(); const M = new Merge(); M.add(CG.cyl, 0, .1, 0, .07, .2, .05, 0, 0, 0, 0x7fd8ff).add(CG.cyl8, 0, .23, 0, .02, .06, .02, 0, 0, 0, 0xffffff).add(CG.box, .03, .27, 0, .06, .02, .02, 0, 0, 0, 0xffffff).add(CG.box, 0, .1, .051, .08, .1, .004, 0, 0, 0, 0xffffff);
      g.add(meshOf(M)); const bm = new THREE.MeshLambertMaterial({ color:0xffffff, transparent:true, opacity:.6 }); for(let i = 0; i < 3; i++){ const b = new THREE.Mesh(CG.sm, bm); b.scale.setScalar(.03 + i * .01); b.position.set(.05 + i * .03, .3 + i * .05, 0); g.add(b); } return g; },
    duck(){ const M = new Merge(); M.add(CG.sph, 0, .09, 0, .12, .09, .14, 0, 0, 0, 0xffd23f).add(CG.sph, 0, .2, .07, .07, .07, .07, 0, 0, 0, 0xffd23f).add(CG.sm, 0, .19, .14, .035, .02, .04, 0, 0, 0, 0xff8a2a).add(CG.sm, .03, .22, .12, .012, .012, .012, 0, 0, 0, 0x222222).add(CG.sm, -.03, .22, .12, .012, .012, .012, 0, 0, 0, 0x222222); return meshOf(M); },
    sprinkler(){ const M = new Merge(); M.add(CG.cyl, 0, .03, 0, .13, .06, .13, 0, 0, 0, 0x3f9a45).add(CG.cyl8, 0, .14, 0, .025, .18, .025, 0, 0, 0, 0xb9c0c8).add(CG.box, 0, .24, 0, .3, .04, .04, 0, 0, 0, 0xffcd4d).add(CG.sm, .15, .24, 0, .03, .03, .03, 0, 0, 0, 0x5fb0e8).add(CG.sm, -.15, .24, 0, .03, .03, .03, 0, 0, 0, 0x5fb0e8)
      .add(CG.torus, 0, .03, 0, .16, .16, .1, Math.PI / 2, 0, 0, 0x5fb0e8); return meshOf(M); },
    makeover(){ const M = new Merge(); M.add(RB, 0, .06, 0, .3, .12, .2, 0, 0, 0, 0xff8fb8); for(const s of [-1, 1]) M.add(CG.cyl, s * .055, .15, 0, .045, .02, .045, Math.PI / 2, 0, 0, 0x26242c); M.add(CG.box, 0, .15, 0, .04, .015, .015, 0, 0, 0, 0x26242c);
      for(const s of [-1, 1]) M.add(CG.sph, s * .05, .2, -.05, .05, .035, .02, 0, 0, s * .4, 0xff4d8d); return meshOf(M); },
    balloons(){ const g = new THREE.Group(); const sm = new THREE.MeshBasicMaterial({ color:0x8a7a6a });
      [[0xff5d73, -.06, .42], [0x5fb8ff, .06, .46], [0xffcd4d, 0, .52]].forEach(([c, x, y]) => { const b = new THREE.Mesh(CG.sph, new THREE.MeshLambertMaterial({ color:c })); b.scale.set(.09, .11, .09); b.position.set(x, y, 0); b.castShadow = true; g.add(b);
        const s = new THREE.Mesh(new THREE.CylinderGeometry(.004, .004, y - .02, 4), sm); s.position.set(x / 2, (y - .02) / 2, 0); s.rotation.z = -x * 1.2; g.add(s); });
      return g; }
  };

  /* ---------- fixtures used by several pranks ---------- */
  // a phone on the living-room sideboard
  const phone = new THREE.Group();
  { const M = new Merge(); M.add(RB, 0, .06, 0, .26, .12, .2, 0, 0, 0, 0xd0453a).add(CG.cyl, 0, .125, .02, .07, .01, .07, 0, 0, 0, 0xfff4d8); for(let i = 0; i < 10; i++){ const a = i / 10 * 6.28; M.add(CG.sm, Math.cos(a) * .05, .13, .02 + Math.sin(a) * .05, .01, .006, .01, 0, 0, 0, 0x333333); }
    phone.add(meshOf(M)); }
  const receiver = new THREE.Group(); { const M = new Merge(); M.add(capsule(.025, .2), 0, 0, 0, 1, 1, 1, 0, 0, Math.PI / 2, 0xd0453a).add(CG.sm, .12, -.02, 0, .045, .035, .045, 0, 0, 0, 0xd0453a).add(CG.sm, -.12, -.02, 0, .045, .035, .045, 0, 0, 0, 0xd0453a); receiver.add(meshOf(M)); }
  receiver.position.set(0, .17, -.05); phone.add(receiver);
  const blueDrip = new THREE.Mesh(CG.sm, new THREE.MeshLambertMaterial({ color:0x3f7fff })); blueDrip.scale.set(.05, .03, .05); blueDrip.position.set(.12, -.05, 0); blueDrip.visible = false; receiver.add(blueDrip);
  add(phone, -2.4, LY[1] + .84, .78, -Math.PI / 2);

  // tea set on the kitchen table
  const tea = new THREE.Group();
  { const M = new Merge(); M.add(CG.cyl, 0, .005, 0, .1, .01, .1, 0, 0, 0, 0xffffff).add(CG.cyl, 0, .05, 0, .055, .08, .05, 0, 0, 0, 0xffffff).add(CG.cyl, 0, .088, 0, .048, .005, .048, 0, 0, 0, 0xb5794a).add(new THREE.TorusGeometry(.028, .01, 6, 12), .065, .05, 0, 1, 1, 1, 0, 0, 0, 0xffffff);
    M.add(CG.cyl, -.22, .05, -.04, .06, .1, .06, 0, 0, 0, 0x8fd0ff).add(CG.hemi, -.22, .1, -.04, .06, .03, .06, 0, 0, 0, 0x8fd0ff).add(CG.sm, -.22, .135, -.04, .015, .015, .015, 0, 0, 0, 0xffffff);
    M.add(RB, .2, .1, -.06, .14, .2, .14, 0, 0, 0, 0xff8f6a).add(CG.cyl8, .29, .14, -.06, .015, .1, .015, 0, 0, -1, 0xff8f6a); tea.add(meshOf(M)); }
  const saltSet = ITEM.salt(); saltSet.position.set(-.12, 0, .06); saltSet.visible = false; tea.add(saltSet);
  add(tea, 5.9, LY[1] + .8, .78);
  // cereal box and bowl
  const cereal = new THREE.Group(), cbox = new THREE.Group();
  { const tx = canvasTex(64, 96, (x, w, h) => { x.fillStyle = '#ffcd4d'; x.fillRect(0, 0, w, h); x.fillStyle = '#ff5d73'; x.font = '900 26px system-ui'; x.textAlign = 'center'; x.fillText('★', w / 2, 34); x.fillStyle = '#d0453a'; x.fillRect(6, 44, w - 12, 10); for(let i = 0; i < 9; i++){ x.fillStyle = ['#c98a4a', '#e8b04a', '#ff8fb8'][i % 3]; x.beginPath(); x.arc(12 + (i % 3) * 20, 66 + Math.floor(i / 3) * 10, 5, 0, 6.3); x.fill(); } });
    const box = new THREE.Mesh(new THREE.BoxGeometry(.22, .32, .09), [0, 0, 0, 0, 1, 1].map(k => k ? new THREE.MeshLambertMaterial({ map:tx }) : new THREE.MeshLambertMaterial({ color:0xffb52e }))); box.position.y = .16; box.castShadow = true; cbox.add(box); }
  cbox.position.set(.08, 0, -.05); cereal.add(cbox);
  { const M = new Merge(); M.add(CG.hemi, -.2, .08, .05, .1, .08, .1, Math.PI, 0, 0, 0x5fb0e8).add(CG.cyl, -.2, .075, .05, .085, .01, .085, 0, 0, 0, 0xfff4d8); for(let i = 0; i < 6; i++) M.add(CG.sm, -.2 + Math.cos(i) * .05, .085, .05 + Math.sin(i * 2) * .05, .018, .012, .018, 0, 0, 0, 0xe8b04a); cereal.add(meshOf(M)); }
  const spiderLeg = new THREE.Mesh(capsule(.008, .06), new THREE.MeshLambertMaterial({ color:0x2a2238 })); spiderLeg.position.set(.04, .34, 0); spiderLeg.rotation.z = .6; spiderLeg.visible = false; cbox.add(spiderLeg);
  const spider = ITEM.spider(); spider.visible = false; scene.add(spider);
  add(cereal, 6.9, LY[1] + .79, .74);
  // birthday cake on the kitchen counter
  const cake = new THREE.Group();
  { const M = new Merge(); M.add(CG.cyl, 0, .01, 0, .24, .02, .24, 0, 0, 0, 0xffffff).add(CG.cyl, 0, .1, 0, .19, .16, .19, 0, 0, 0, 0xffb3d6).add(CG.cyl, 0, .2, 0, .19, .04, .19, 0, 0, 0, 0xfff4f8);
    for(let i = 0; i < 10; i++){ const a = i / 10 * 6.28; M.add(CG.sm, Math.cos(a) * .17, .22, Math.sin(a) * .17, .03, .025, .03, 0, 0, 0, 0xffffff).add(CG.sm, Math.cos(a) * .19, .14, Math.sin(a) * .19, .012, .012, .012, 0, 0, 0, [0xff5d73, 0x5fb8ff, 0xffcd4d][i % 3]); }
    for(let i = 0; i < 5; i++){ const a = i / 5 * 6.28; M.add(CG.cyl8, Math.cos(a) * .09, .27, Math.sin(a) * .09, .01, .08, .01, 0, 0, 0, [0x5fb8ff, 0xff6fae][i % 2]).add(CG.sm, Math.cos(a) * .09, .32, Math.sin(a) * .09, .012, .02, .012, 0, 0, 0, 0xffcd4d); }
    M.add(CG.sm, 0, .26, 0, .04, .04, .04, 0, 0, 0, 0xff4d6d); cake.add(meshOf(M)); }
  const ribbon = new THREE.Mesh(CG.box, new THREE.MeshLambertMaterial({ color:0x5fe3b1 })); ribbon.scale.set(.012, .1, .03); ribbon.position.set(.12, .27, .05); ribbon.rotation.z = .5; ribbon.visible = false; cake.add(ribbon);
  add(cake, 7.3, LY[1] + .95, 6.5);
  // standing fan in the uncle's room
  const fan = new THREE.Group(), fanHead = new THREE.Group(), blades = new THREE.Group();
  { const M = new Merge(); M.add(CG.cyl, 0, .03, 0, .24, .06, .24, 0, 0, 0, 0xf2ece0).add(CG.cyl8, 0, .6, 0, .025, 1.15, .025, 0, 0, 0, 0xb9c0c8); fan.add(meshOf(M));
    const HM = new Merge(); HM.add(CG.sph, 0, 0, -.08, .08, .08, .1, 0, 0, 0, 0xf2ece0).add(new THREE.TorusGeometry(.3, .012, 6, 30), 0, 0, .02, 1, 1, 1, 0, 0, 0, 0xb9c0c8);
    for(let i = 0; i < 8; i++) HM.add(CG.cyl8, 0, 0, .02, .006, .6, .006, 0, 0, i / 8 * Math.PI, 0xb9c0c8);
    fanHead.add(meshOf(HM)); const BM = new Merge(); for(let i = 0; i < 3; i++){ const a = i / 3 * 6.28; BM.add(CG.sph, Math.cos(a) * .14, Math.sin(a) * .14, 0, .13, .06, .01, 0, 0, a, 0x8fd0ff); } BM.add(CG.sm, 0, 0, .02, .04, .04, .03, 0, 0, 0, 0xffcd4d); blades.add(meshOf(BM)); }
  fanHead.add(blades); fanHead.position.set(0, 1.22, 0); fan.add(fanHead);
  const fanGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map:glowTex, color:0xffd36a, transparent:true, depthWrite:false, blending:THREE.AdditiveBlending })); fanGlow.scale.set(.8, .8, 1); fanGlow.position.set(0, 1.22, .1); fanGlow.visible = false; fan.add(fanGlow);
  add(fan, 3.7, LY[2], 2.4, Math.PI / 2);
  // fluffy bedroom slippers by the uncle's bed
  const slippers = new THREE.Group(), slJelly = [];
  for(const s of [-1, 1]){ const M = new Merge(); M.add(CG.sph, s * .12, .05, 0, .1, .06, .17, 0, 0, 0, 0xff8f6a).add(CG.sm, s * .12, .09, .12, .06, .05, .05, 0, 0, 0, 0xffd0b8); slippers.add(meshOf(M));
    const j = new THREE.Mesh(CG.sph, new THREE.MeshLambertMaterial({ color:0x7be05a, transparent:true, opacity:.85 })); j.scale.set(.07, .04, .1); j.position.set(s * .12, .1, -.03); j.visible = false; slippers.add(j); slJelly.push(j); }
  add(slippers, 7.1, LY[2] + .01, -1.4, -Math.PI / 2);
  // the bath: clear water, or green jelly
  const bathWater = new THREE.Mesh(new THREE.BoxGeometry(.74, .04, 1.66), new THREE.MeshLambertMaterial({ color:0x9fe0ff, transparent:true, opacity:.75 }));
  add(bathWater, -9.35, LY[2] + .62, 5.55);
  const bathJelly = new THREE.Mesh(RB, new THREE.MeshLambertMaterial({ color:0x6fd84a, transparent:true, opacity:.9 })); bathJelly.scale.set(.76, .14, 1.68); bathJelly.visible = false;
  add(bathJelly, -9.35, LY[2] + .6, 5.55);
  // hair tonic on the bathroom sink (blue; the prank swaps in the purple «super moustache» one)
  const tonicBlue = new THREE.Group(); { const M = new Merge(); M.add(CG.cyl, 0, .1, 0, .065, .2, .065, 0, 0, 0, 0x4fa8e8).add(CG.cyl8, 0, .22, 0, .025, .05, .025, 0, 0, 0, 0x4fa8e8).add(CG.cyl, 0, .26, 0, .035, .04, .035, 0, 0, 0, 0xffffff).add(CG.box, 0, .1, .064, .08, .08, .005, 0, 0, 0, 0xffffff); tonicBlue.add(meshOf(M)); }
  add(tonicBlue, -5.1, LY[2] + .93, 6.72);
  const tonicSet = ITEM.tonic(); tonicSet.visible = false; add(tonicSet, -5.1, LY[2] + .93, 6.72);
  // washing machine: a soap bottle on top, and a foam party
  const soapSet = ITEM.bubbles(); soapSet.visible = false; add(soapSet, 4.15, LY[0] + .92, 6.45);
  const FOAM = 70, foam = new THREE.InstancedMesh(CG.sm, new THREE.MeshLambertMaterial({ color:0xffffff }), FOAM); foam.visible = false; foam.frustumCulled = false; scene.add(foam);
  const foamP = []; for(let i = 0; i < FOAM; i++){ const a = Math.random() * 6.28, r = Math.sqrt(Math.random()) * 1.5; foamP.push({ x:4.0 + Math.cos(a) * r, z:5.8 + Math.sin(a) * r * .9, y:Math.random() * .7, s:.18 + Math.random() * .22, d:Math.random() }); }
  const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _v = new THREE.Vector3(), _s = new THREE.Vector3();
  function foamAt(k){ if(k <= 0){ foam.visible = false; return; } foam.visible = true; foamP.forEach((p, i) => { const g = Math.max(0, Math.min(1, k * 1.6 - p.d * .6)); const s = p.s * g; _m.compose(_v.set(p.x, LY[0] + p.y * g + .05, p.z), _q, _s.set(s, s * .85, s)); foam.setMatrixAt(i, _m); }); foam.instanceMatrix.needsUpdate = true; }
  // a squeaky duck under the hall doormat
  const matBump = new THREE.Mesh(CG.hemi, new THREE.MeshLambertMaterial({ color:0x9a6b3a })); matBump.scale.set(.18, .06, .16); matBump.visible = false; add(matBump, .55, LY[1] + .025, -6.4);
  const matDuck = ITEM.duck(); matDuck.visible = false; add(matDuck, .55, LY[1], -6.4);
  // sprinkler (placed by the kids next to the hammock)
  const sprinkler = ITEM.sprinkler(); sprinkler.visible = false; add(sprinkler, -10.9, 0, -10.5);
  // the garden gnome (and his makeover)
  const gnome = new THREE.Group(), mk = new THREE.Group();
  { const M = new Merge(); M.add(CG.cyl, 0, .18, 0, .17, .36, .15, 0, 0, 0, 0x3f7fd0).add(CG.sph, 0, .42, 0, .13, .12, .12, 0, 0, 0, 0xf5c9a0).add(new THREE.ConeGeometry(.15, .4, 16), 0, .7, -.02, 1, 1, 1, -.15, 0, 0, 0xd0453a)
      .add(CG.sph, 0, .33, .08, .12, .14, .07, 0, 0, 0, 0xffffff).add(CG.sm, 0, .43, .12, .035, .03, .03, 0, 0, 0, 0xf09c86).add(CG.sm, -.045, .47, .1, .015, .018, .01, 0, 0, 0, 0x222222).add(CG.sm, .045, .47, .1, .015, .018, .01, 0, 0, 0, 0x222222)
      .add(CG.cyl, 0, .03, 0, .2, .06, .2, 0, 0, 0, 0x8a959e).add(CG.box, .17, .2, .05, .04, .26, .04, 0, 0, .2, 0x8a5a34); gnome.add(meshOf(M));
    const MK = new Merge(); for(const s of [-1, 1]) MK.add(CG.cyl, s * .055, .475, .11, .045, .015, .045, Math.PI / 2, 0, 0, 0x26242c); MK.add(CG.box, 0, .475, .12, .04, .012, .012, 0, 0, 0, 0x26242c);
    for(const s of [-1, 1]) MK.add(CG.sph, s * .07, .86, -.08, .07, .045, .025, 0, 0, s * .4, 0xff4d8d); MK.add(CG.sm, 0, .86, -.07, .03, .03, .03, 0, 0, 0, 0xff8fb8);
    for(const s of [-1, 1]) MK.add(CG.sm, s * .08, .4, .1, .03, .02, .01, 0, 0, 0, 0xff8fb8); MK.add(CG.box, 0, .38, .135, .09, .012, .01, 0, 0, .15, 0x6b4226);
    mk.add(meshOf(MK)); mk.visible = false; gnome.add(mk); }
  gnome.scale.setScalar(1.25); add(gnome, 5.5, 0, -11.6, Math.PI * .1);
  // garden shed door (opens) and its balloons
  const shedDoor = new THREE.Group(); { const M = new Merge(); M.add(CG.box, 0, 1.0, .55, .06, 2.0, 1.1, 0, 0, 0, 0xffcd4d); for(let i = 0; i < 4; i++) M.add(CG.box, -.035, .3 + i * .5, .55, .02, .05, 1.0, 0, 0, 0, 0xe8b04a); M.add(CG.sm, -.06, 1.0, 1.0, .05, .05, .05, 0, 0, 0, 0xb9c0c8); shedDoor.add(meshOf(M)); }
  add(shedDoor, 11.3, 0, -14.85);
  const shedPeek = ITEM.balloons(); shedPeek.visible = false; shedPeek.scale.setScalar(1.4); add(shedPeek, 11.05, .3, -13.6);
  const balloons = []; for(let i = 0; i < 9; i++){ const b = new THREE.Mesh(CG.sph, new THREE.MeshLambertMaterial({ color:[0xff5d73, 0x5fb8ff, 0xffcd4d, 0x5fe3b1, 0xb99bff][i % 5] })); b.scale.set(.22, .27, .22); b.visible = false; b.castShadow = true; scene.add(b); balloons.push(b); }
  // a whoopee cushion on the armchair
  const cushion = ITEM.whoopee(); cushion.scale.setScalar(1.3); cushion.visible = false; add(cushion, -8.42, LY[1] + .58, -4.68, Math.PI * .75);

  /* ---------- the pranks ---------- */
  const U = L('عمّو زعلان', 'Uncle Grumpy', 'Somurtkan Amca');
  const P = [
    { id:'whoopee', item:'whoopee', ie:'💨', te:'🛋️', name:L('مخدّة بتزمّر', 'Whoopee cushion', 'Pırt yastığı'), target:L('كرسيه', 'his armchair', 'koltuğu'),
      word:L('بررررت!', 'PFFFRT!', 'PIRRRT!'), col:'#ff6fae', act:'sit', ra:'jump', mark:null, area:['living'],
      stand:{ x:-7.75, z:-5.3 }, at:{ x:-8.3, y:LY[1] + .02, z:-4.75, f:Math.PI * .75 }, spot:{ x:-8.42, y:LY[1] + .55, z:-4.68 }, dur:9,
      set(on){ cushion.visible = on; cushion.scale.set(1.3, 1.3, 1.3); },
      react(k){ cushion.scale.set(1.3 + sk(k * 3) * .3, 1.3 * Math.max(.25, 1 - k * 3), 1.3); if(k > .12 && !this._b){ this._b = 1; fx.burst(-8.3, LY[1] + .7, -4.7, 26, ['#e8ffe0', '#ffffff', '#d8f0c8'], { speed:1.8, up:1.2, g:-.3, drag:2.2, life:1.6, size:1.6 }); } },
      done(){ cushion.scale.set(1.3, .35, 1.3); }, reset(){ this._b = 0; cushion.visible = false; } },
    { id:'phone', item:'paint', ie:'🎨', te:'☎️', name:L('دهان أزرق', 'Blue paint', 'Mavi boya'), target:L('سمّاعة التلفون', 'the phone', 'telefon ahizesi'),
      word:L('ترررن! 💙', 'RING-RING! 💙', 'ZIRRR! 💙'), col:'#3f7fff', act:'phone', ra:'shock', mark:'ear', area:['living'],
      stand:{ x:-3.25, z:.78, f:Math.PI / 2 }, spot:{ x:-2.4, y:LY[1] + 1.0, z:.78 }, dur:8, pre:0,
      set(on){ blueDrip.visible = on; },
      react(k){ receiver.visible = k > .3; phone.position.y = LY[1] + .84 + (k < .3 ? Math.abs(Math.sin(k * 90)) * .03 : 0); if(k > .32 && !this._b){ this._b = 1; fx.sfx('splat'); fx.burst(-3.0, LY[1] + 1.65, .9, 18, ['#3f7fff', '#7fb2ff', '#ffffff'], { speed:1.4, up:1.5, g:5, life:.9, size:.8 }); } },
      done(){ receiver.visible = true; phone.position.y = LY[1] + .84; }, reset(){ this._b = 0; receiver.visible = true; blueDrip.visible = false; } },
    { id:'tea', item:'salt', ie:'🧂', te:'☕', name:L('الملح', 'Salt', 'Tuz'), target:L('كاسة الشاي', 'his tea', 'çayı'),
      word:L('تفففف! مالح!', 'PTOOEY! SALTY!', 'PÜÜÜ! TUZLU!'), col:'#ffffff', act:'tea', ra:'spit', mark:null, area:['kitchen'],
      stand:{ x:5.9, z:-.05, f:0 }, spot:{ x:5.8, y:LY[1] + .8, z:.84 }, dur:8,
      set(on){ saltSet.visible = on; },
      react(k){ if(k > .28 && k < .62 && Math.random() < .7) fx.burst(this.mouth.x, this.mouth.y, this.mouth.z, 3, ['#c98a4a', '#e8c48e', '#ffffff'], { speed:2.6, up:.6, g:6, life:.7, size:.6, dir:this.mouth.f }); if(k > .28 && !this._b){ this._b = 1; fx.sfx('spit'); } },
      done(){}, reset(){ this._b = 0; saltSet.visible = false; } },
    { id:'cereal', item:'spider', ie:'🕷️', te:'🥣', name:L('عنكبوت لعبة', 'Toy spider', 'Oyuncak örümcek'), target:L('علبة الكورن فليكس', 'the cereal box', 'mısır gevreği kutusu'),
      word:L('إيييييك!', 'EEEEEK!', 'İİİİİK!'), col:'#b99bff', act:'eat', ra:'jump', mark:null, area:['kitchen'],
      stand:{ x:6.95, z:-.05, f:0 }, spot:{ x:6.98, y:LY[1] + .8, z:.69 }, dur:8,
      set(on){ spiderLeg.visible = on; },
      react(k){ cbox.rotation.z = k < .3 ? Math.sin(k * 60) * .15 : 0; spiderLeg.visible = false; spider.visible = k > .2;
        if(spider.visible){ const e = Math.min(1, (k - .2) / .8), hop = Math.abs(Math.sin(e * Math.PI * 4)) * .35 * (1 - e * .5); spider.position.set(6.98 + e * .5, LY[1] + .8 + .3 + hop - e * .3, .69 - e * .55); spider.rotation.y = e * 9; spider.scale.setScalar(1.6); } },
      done(){ cbox.rotation.z = 0; spider.visible = true; spider.position.set(7.5, LY[1] + .8, .2); spider.rotation.y = 1; }, reset(){ spider.visible = false; spiderLeg.visible = false; cbox.rotation.z = 0; } },
    { id:'cake', item:'popper', ie:'🎉', te:'🎂', name:L('فرقيعة لمّيع', 'Glitter popper', 'Simli konfeti'), target:L('قالب الكيك', 'the birthday cake', 'doğum günü pastası'),
      word:L('بووووف! 🎊', 'KA-POOF! 🎊', 'PAAAT! 🎊'), col:'#ffcd4d', act:'reach', ra:'shock', mark:'cream', area:['kitchen'],
      stand:{ x:7.3, z:5.72, f:0 }, spot:{ x:7.3, y:LY[1] + 1.2, z:6.5 }, dur:7,
      set(on){ ribbon.visible = on; },
      react(k){ if(k > .15 && !this._b){ this._b = 1; fx.sfx('pop'); fx.burst(7.3, LY[1] + 1.3, 6.4, 90, ['#ff5d73', '#ffcd4d', '#5fb8ff', '#5fe3b1', '#b99bff', '#ffffff'], { speed:3.2, up:3.5, g:2.2, drag:1.4, life:2.6, size:1.3, sway:.6 }); ribbon.visible = false; } },
      done(){}, reset(){ this._b = 0; ribbon.visible = false; } },
    { id:'fan', item:'glitter', ie:'✨', te:'🌀', name:L('لمّيع', 'Glitter', 'Sim'), target:L('المروحة', 'his fan', 'vantilatörü'),
      word:L('لمّيييع! ✨', 'SPARKLE-BLAST! ✨', 'IŞIL IŞIL! ✨'), col:'#ffd36a', act:'reach', ra:'dance', mark:null, area:['uncle'],
      stand:{ x:4.7, z:2.4, f:-Math.PI / 2 }, spot:{ x:3.7, y:LY[2] + 1.22, z:2.4 }, dur:7,
      set(on){ fanGlow.visible = on; },
      react(k, dt){ blades.rotation.z += dt * 30 * Math.min(1, k * 5); if(k > .12 && k < .8 && Math.random() < .9) fx.burst(3.95, LY[2] + 1.22, 2.4, 4, ['#ffcd4d', '#ff8fb8', '#b99bff', '#8fe3ff', '#ffffff'], { speed:3.4, up:.4, g:.5, drag:.8, life:1.8, size:.9, sway:.5, dir:Math.PI / 2, spread:.5 }); fanGlow.visible = false; },
      done(){}, spin(dt){ blades.rotation.z += dt * 4; }, reset(){ fanGlow.visible = false; } },
    { id:'slippers', item:'jelly', ie:'🟢', te:'🩴', name:L('جيلي أخضر', 'Green jelly', 'Yeşil jöle'), target:L('شحّاطاته', 'his slippers', 'terlikleri'),
      word:L('بلوتششش!', 'SQUIIISH!', 'VIIICIK!'), col:'#7be05a', act:'look', ra:'hop', mark:'jelly', area:['uncle'],
      stand:{ x:7.1, z:-1.4, f:Math.PI / 2 }, spot:{ x:7.1, y:LY[2] + .1, z:-1.4 }, dur:6,
      set(on){ slJelly.forEach(j => j.visible = on); },
      react(k){ slippers.visible = k < .15; if(k > .15 && !this._b){ this._b = 1; fx.sfx('squish'); fx.burst(7.1, LY[2] + .15, -1.4, 30, ['#7be05a', '#a8ff7a', '#4fbf3a'], { speed:2, up:2, g:6, life:1, size:.9 }); } },
      done(){ slippers.visible = false; }, reset(){ this._b = 0; slippers.visible = true; slJelly.forEach(j => j.visible = false); } },
    { id:'bath', item:'slime', ie:'🫙', te:'🛁', name:L('سلايم أخضر', 'Green slime', 'Yeşil slime'), target:L('البانيو', 'his bath', 'küveti'),
      word:L('بلووووب!', 'BLOOOP!', 'BLUUUP!'), col:'#6fd84a', act:'reach', ra:'bounce', mark:'jelly', area:['bath'],
      stand:{ x:-8.25, z:5.4, f:-Math.PI / 2 }, at:{ x:-9.35, y:LY[2] + .32, z:5.4, f:Math.PI / 2, react:true }, spot:{ x:-9.35, y:LY[2] + .62, z:5.55 }, dur:7,
      set(on){ bathJelly.visible = on; bathWater.visible = !on; },
      react(k, dt, T){ bathJelly.scale.set(.76 + Math.sin(T * 14) * .03, .14 + Math.abs(Math.sin(T * 7)) * .06, 1.68); if(Math.random() < .25) fx.burst(-9.35, LY[2] + .75, 5.4 + (Math.random() - .5), 2, ['#7be05a', '#a8ff7a'], { speed:1.4, up:2.4, g:6, life:.8, size:.8 }); },
      done(){ bathJelly.scale.set(.76, .14, 1.68); }, reset(){ bathJelly.visible = false; bathWater.visible = true; } },
    { id:'tonic', item:'tonic', ie:'🧴', te:'🪞', name:L('تونيك الشوارب الخارق', 'Super moustache tonic', 'Süper bıyık losyonu'), target:L('المراية', 'his mirror shelf', 'aynanın rafı'),
      word:L('بوييينغ!', 'BOI-OI-OING!', 'BOYYYNG!'), col:'#a36bff', act:'comb', ra:'boing', mark:'curly', area:['bath'],
      stand:{ x:-5.25, z:5.95, f:0 }, spot:{ x:-5.1, y:LY[2] + 1.0, z:6.72 }, dur:8,
      set(on){ tonicSet.visible = on; tonicBlue.visible = !on; },
      react(k){ if(k > .3 && !this._b){ this._b = 1; fx.sfx('boing'); fx.burst(this.head.x, this.head.y - .2, this.head.z, 20, ['#a36bff', '#ffcd4d', '#ffffff'], { speed:1.6, up:1.2, g:1, life:1.2, size:.8 }); } },
      done(){}, reset(){ this._b = 0; tonicSet.visible = false; tonicBlue.visible = true; } },
    { id:'wash', item:'bubbles', ie:'🫧', te:'🧺', name:L('صابون فقاعات', 'Bubble soap', 'Köpük sabunu'), target:L('الغسّالة', 'the washing machine', 'çamaşır makinesi'),
      word:L('فقاعااااات!', 'FOAM PARTY!', 'KÖPÜÜÜK!'), col:'#8fe3ff', act:'reach', ra:'buried', mark:null, area:['basement'],
      stand:{ x:4.0, z:5.6, f:0 }, spot:{ x:4.1, y:LY[0] + .95, z:6.45 }, dur:8,
      set(on){ soapSet.visible = on; },
      react(k){ foamAt(Math.min(1, k * 1.4)); if(Math.random() < .3) fx.burst(4 + (Math.random() - .5) * 2, LY[0] + 1.2, 5.8, 2, ['#ffffff', '#cfefff'], { speed:.6, up:1.5, g:-.4, life:2, size:1.8 }); },
      done(){ foamAt(1); }, fade(k){ foamAt(k); }, reset(){ foamAt(0); soapSet.visible = false; } },
    { id:'mat', item:'duck', ie:'🦆', te:'🚪', name:L('بطّة بتزمّر', 'Squeaky duck', 'Vıklayan ördek'), target:L('دعّاسة الباب', 'the doormat', 'paspas'),
      word:L('زيييييق!', 'SQUEEEAK!', 'VIIIIIK!'), col:'#ffd23f', act:'look', ra:'jump', mark:null, area:['hall'],
      stand:{ x:.55, z:-6.4, f:0 }, spot:{ x:.55, y:LY[1] + .05, z:-6.4 }, dur:5,
      set(on){ matBump.visible = on; },
      react(k){ if(k > .08 && !this._b){ this._b = 1; fx.sfx('squeak'); } matBump.visible = false; matDuck.visible = k > .1; if(matDuck.visible){ const e = Math.min(1, (k - .1) * 2.5); matDuck.position.set(.55 + e * .9, LY[1] + Math.sin(e * Math.PI) * .9, -6.4 + e * .3); matDuck.rotation.x = e * 7; } },
      done(){ matDuck.visible = true; matDuck.rotation.set(0, .5, 0); matDuck.position.set(1.45, LY[1], -6.1); }, reset(){ this._b = 0; matBump.visible = false; matDuck.visible = false; } },
    { id:'hammock', item:'sprinkler', ie:'💦', te:'🏝️', name:L('رشّاش المي', 'Water sprinkler', 'Fıskiye'), target:L('جنب الأرجوحة', 'by his hammock', 'hamağının yanı'),
      word:L('طرطوووش!', 'SPLASH!', 'ŞAPUUR!'), col:'#5fb8ff', act:'lie', ra:'fall', mark:null, area:['garden'],
      stand:{ x:-10.4, z:-11.0, f:Math.PI }, at:{ x:-9.95, y:1.0, z:-12, f:Math.PI / 2, lie:true }, spot:{ x:-10.9, y:.05, z:-10.5 }, dur:12, pre:1.6,
      set(on){ sprinkler.visible = on; },
      react(k, dt){ sprinkler.rotation.y += dt * 9; if(k < .75 && Math.random() < .95){ const a = Math.random() * 6.28; fx.burst(-10.9, .3, -10.5, 3, ['#5fb8ff', '#9fe0ff', '#ffffff'], { speed:2.6, up:4, g:7, life:1.1, size:.7, dir:Math.PI + (Math.random() - .5) * .9, spread:.3 }); } },
      done(){}, reset(){ sprinkler.visible = false; } },
    { id:'gnome', item:'makeover', ie:'🕶️', te:'🧙', name:L('عدّة تزيين', 'Makeover kit', 'Süs seti'), target:L('قزم الحديقة', 'his garden gnome', 'bahçe cücesi'),
      word:L('شو هاااد؟!', 'WHAAAT?!', 'BU NEEE?!'), col:'#ff4d8d', act:'water', ra:'shock', mark:null, area:['garden'],
      stand:{ x:5.4, z:-9.85, f:Math.PI }, spot:{ x:5.5, y:.6, z:-11.6 }, dur:8,
      set(on){ mk.visible = on; },
      react(k){ gnome.rotation.z = Math.sin(k * 30) * .05; if(k > .05 && !this._b){ this._b = 1; fx.burst(5.5, 1.0, -11.6, 26, ['#ff4d8d', '#ffcd4d', '#ffffff'], { speed:1.6, up:2, g:2, life:1.4, size:.9 }); } },
      done(){ gnome.rotation.z = 0; }, reset(){ this._b = 0; mk.visible = false; gnome.rotation.z = 0; } },
    { id:'shed', item:'balloons', ie:'🎈', te:'🛖', name:L('بالونات', 'Balloons', 'Balonlar'), target:L('الكوخ', 'his garden shed', 'bahçe kulübesi'),
      word:L('فيييووو!', 'WHOOOSH!', 'VIIIUUV!'), col:'#ff5d73', act:'reach', ra:'float', mark:null, area:['garden'],
      stand:{ x:10.35, z:-14.1, f:Math.PI / 2 }, spot:{ x:10.9, y:.6, z:-14.1 }, dur:7, camA:Math.PI * 1.2,
      set(on){ shedPeek.visible = on; },
      react(k, dt){ shedDoor.rotation.y = -Math.min(1, k * 5) * 1.9; shedPeek.visible = false;
        balloons.forEach((b, i) => { const e = Math.max(0, k * 1.3 - i * .04); b.visible = e > 0 && e < 1.25; b.position.set(11.0 - e * 1.2 + Math.sin(e * 6 + i) * .4, .8 + e * (2.4 + i * .35), -14.1 + (i - 4) * .22 + Math.cos(e * 5 + i) * .2); }); },
      done(){ shedDoor.rotation.y = -1.9; balloons.forEach(b => b.visible = false); }, reset(){ shedDoor.rotation.y = 0; shedPeek.visible = false; balloons.forEach(b => b.visible = false); } }
  ];
  P.forEach((p, i) => { p.i = i; p.stand.f = p.stand.f != null ? p.stand.f : Math.atan2(p.spot.x - p.stand.x, p.spot.z - p.stand.z); p.lv = H.lvOf(p.spot.y - .3); p.stand.y = LY[p.lv]; });
  const byId = Object.fromEntries(P.map(p => [p.id, p]));
  function update(dt, T){ byId.fan.spin(dt); }
  return { PRANKS:P, byId, ITEM, update, foamAt };
}
