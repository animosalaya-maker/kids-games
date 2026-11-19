/* «عمّو زعلان» Uncle Grumpy in 3D: our own neighbour from the 2D «مقالب» game — big and round, bald with grey tufts,
   a huge moustache, a white vest, green trousers with red braces and fluffy blue slippers. Grumpy-funny, never scary.
   Hand props (newspaper, teacup, watering can, phone receiver, comb) and prank marks (blue ear, green jelly feet,
   curly moustache, glitter) are switched on per action. */
import { roundBox } from './house.js';

export function makeUncle(THREE, K){
  const { CG, Merge, capsule, charMat, faceTex, facePatch, pivot, canvasTex } = K;
  const SKIN = 0xf5c9a0, VEST = 0xf1ede3, PANTS = 0x5f9e6e, BRACE = 0xd0453a, SLIP = 0x3d7fd6, SLIP2 = 0x8fc0ff, TUFT = 0xc9c4cf, MOU = 0x6b5a52;
  const meshOf = M => new THREE.Mesh(M.geometry(), charMat());
  const RB = roundBox(THREE, 4, .3);
  const grp = new THREE.Group(), body = new THREE.Group(); grp.add(body);

  // round body: vest on a big tummy, trousers, braces, a belt buckle
  const M = new Merge();
  M.add(CG.sph, 0, .98, 0, .52, .55, .48, 0, 0, 0, VEST);
  M.add(CG.sph, 0, .62, 0, .5, .34, .46, 0, 0, 0, PANTS);
  M.add(CG.cyl, 0, .5, 0, .44, .22, .41, 0, 0, 0, PANTS);
  M.add(new THREE.TorusGeometry(.47, .03, 8, 36), 0, .72, 0, 1, 1, .93, Math.PI / 2, 0, 0, 0x4a7d57);
  // red braces hugging the round tummy (front and back), with gold clips
  for(const s of [-1, 1]) for(const zs of [1, -1]) for(let i = 0; i <= 30; i++){
    const y = 1.44 - i * .022, x = s * (.17 + i * .0025), q = 1 - (x / .52) ** 2 - ((y - .98) / .55) ** 2;
    const zz = zs * (Math.sqrt(Math.max(0, q)) * .48 + .008);
    M.add(CG.sm, x, y, zz, .042, .03, .016, 0, 0, 0, BRACE);
    if(i === 30 && zs > 0) M.add(CG.box, x, y - .01, zz + .01, .075, .055, .02, 0, 0, 0, 0xffcd4d);
  }
  M.add(CG.sm, 0, .97, .5, .025, .025, .02, 0, 0, 0, 0xd8d2c4).add(CG.sm, 0, 1.1, .48, .025, .025, .02, 0, 0, 0, 0xd8d2c4);
  M.add(CG.cyl8, 0, 1.47, 0, .13, .1, .13, 0, 0, 0, SKIN);
  body.add(meshOf(M));

  // head: bald and shiny, grey tufts over the ears, a big round nose
  const hr = .38, head = pivot(body, 0, 1.78, 0);
  const H = new Merge();
  H.add(CG.sph, 0, 0, 0, hr, hr * .95, hr * .95, 0, 0, 0, SKIN);
  for(const s of [-1, 1]){
    H.add(CG.sm, s * hr * .98, -.03, 0, .08, .1, .06, 0, 0, 0, SKIN);
    for(let i = 0; i < 4; i++) H.add(CG.sm, s * hr * (.86 + (i % 2) * .06), .02 + i * .03, -.1 - i * .07, .09, .08, .1, 0, 0, 0, TUFT);
  }
  H.add(CG.sm, -.1, hr * .82, .12, .09, .03, .06, 0, 0, 0, 0xfff1e0);                         // shine on the bald top
  H.add(CG.sph, 0, -.04, hr * .97, .1, .085, .085, 0, 0, 0, 0xf09c86);                          // round nose
  head.add(meshOf(H));
  const FACE = {
    grumpy:{ brows:'grumpy', browCol:'#7a6f78', mouth:'wavy', lip:'#9a4a3a', mouthY:176, iris:'#4a3a28', blush:true },
    angry:{ brows:'grumpy', browCol:'#7a6f78', mouth:'open', mouthY:170, iris:'#4a3a28', blush:true },
    surprised:{ brows:'up', browCol:'#7a6f78', mouth:'o', mouthY:178, iris:'#4a3a28', blush:true },
    happy:{ mouth:'smile', mouthY:186, iris:'#4a3a28', eye:'happy', blush:true },
    sleep:{ brows:'up', browCol:'#7a6f78', mouth:'wavy', mouthY:176, blush:true }
  };
  const face = facePatch(hr * 1.012, FACE.grumpy); face.scale.z = .95; head.add(face);
  const tex = { grumpy:face.userData.open, blink:face.userData.shut, angry:faceTex(FACE.angry, false), surprised:faceTex(FACE.surprised, false), happy:faceTex(FACE.happy, false), sleep:faceTex(FACE.sleep, true) };

  // the famous moustache (normal) and its prank twin (wild and curly)
  const mous = new THREE.Group(); mous.position.set(0, -.12, hr * .9); head.add(mous);
  { const MM = new Merge();
    for(const s of [-1, 1]){
      MM.add(CG.sph, s * .1, 0, .02, .13, .06, .07, 0, 0, s * -.25, MOU);
      MM.add(CG.sph, s * .22, -.04, -.02, .09, .045, .05, 0, 0, s * -.55, MOU);
      MM.add(CG.sm, s * .3, -.03, -.05, .05, .03, .03, 0, 0, s * -.2, MOU);
    }
    mous.add(meshOf(MM)); }
  const curly = new THREE.Group(); curly.position.copy(mous.position); curly.visible = false; head.add(curly);
  { const MC = new Merge();
    for(const s of [-1, 1]){
      MC.add(CG.sph, s * .12, 0, .03, .16, .08, .09, 0, 0, s * -.2, 0x7a4a2a);
      for(let i = 0; i < 9; i++){ const a = i * .8, r = .2 - i * .018; MC.add(CG.sm, s * (.26 + Math.cos(a) * r * .6 + i * .03), .06 + Math.sin(a) * r * .6 + i * .015, -.02, .055 - i * .003, .055 - i * .003, .05, 0, 0, 0, i % 2 ? 0x8a5a34 : 0x6b4226); }
    }
    curly.add(meshOf(MC)); }
  // blue paint on the ear (phone prank) and a glitter tint
  const blueEar = new THREE.Mesh(CG.sm, new THREE.MeshLambertMaterial({ color:0x3f7fff })); blueEar.scale.set(.1, .13, .1); blueEar.position.set(hr * .98, -.03, .02); blueEar.visible = false; head.add(blueEar);
  const creamNose = new THREE.Mesh(CG.sm, new THREE.MeshLambertMaterial({ color:0xfff4f8 })); creamNose.scale.set(.12, .09, .1); creamNose.position.set(0, .0, hr * 1.0); creamNose.visible = false; head.add(creamNose);

  // arms: short sleeves of the vest, round hands
  const arms = [-1, 1].map(s => {
    const p = pivot(body, s * .5, 1.24, 0), A = new Merge();
    A.add(CG.sm, 0, -.04, 0, .15, .14, .15, 0, 0, 0, VEST);
    A.add(capsule(.095, .3), 0, -.26, 0, 1, 1, 1, 0, 0, 0, SKIN);
    A.add(CG.sph, 0, -.5, 0, .11, .11, .11, 0, 0, 0, SKIN);
    p.add(meshOf(A)); p.userData.side = s; p.rotation.z = -s * .3; return p;
  });
  const hand = (arm) => { const h = new THREE.Group(); h.position.set(0, -.56, .04); arm.add(h); return h; };
  const handR = hand(arms[1]), handL = hand(arms[0]);
  // newspaper (held in both hands, lives on the right hand)
  const paperTex = canvasTex(128, 96, (x, w, h) => { x.fillStyle = '#f6f2e6'; x.fillRect(0, 0, w, h); x.fillStyle = '#3a3a3a'; x.fillRect(8, 6, 112, 12);
    x.fillStyle = '#8a8a8a'; for(let r = 0; r < 7; r++) for(let c = 0; c < 2; c++) x.fillRect(8 + c * 58, 26 + r * 9, 50 - (r * 7 % 13), 4); x.fillStyle = '#c9a26a'; x.fillRect(70, 28, 48, 30); });
  const paper = new THREE.Mesh(new THREE.BoxGeometry(.62, .46, .01), [0, 0, 0, 0, 1, 1].map(k => k ? new THREE.MeshLambertMaterial({ map:paperTex }) : new THREE.MeshLambertMaterial({ color:0xf6f2e6 })));
  paper.position.set(-.3, .05, .12); paper.visible = false; handR.add(paper);
  const cup = new THREE.Group(); { const C = new Merge(); C.add(CG.cyl, 0, .05, 0, .07, .1, .07, 0, 0, 0, 0xffffff).add(new THREE.TorusGeometry(.035, .012, 6, 14), .08, .05, 0, 1, 1, 1, 0, 0, 0, 0xffffff).add(CG.cyl, 0, .1, 0, .06, .005, .06, 0, 0, 0, 0x8a5a34); cup.add(meshOf(C)); }
  cup.position.set(0, -.02, .1); cup.visible = false; handR.add(cup);
  const can = new THREE.Group(); { const C = new Merge(); C.add(CG.cyl, 0, 0, 0, .13, .22, .11, 0, 0, 0, 0x5fb0e8).add(CG.cyl8, .2, .05, 0, .025, .32, .025, 0, 0, -1.0, 0x5fb0e8).add(new THREE.TorusGeometry(.09, .02, 6, 16, Math.PI), 0, .12, 0, 1, 1, 1, 0, Math.PI / 2, 0, 0x4f90c8); can.add(meshOf(C)); }
  can.position.set(0, -.12, .12); can.visible = false; handR.add(can);
  const phone = new THREE.Group(); { const C = new Merge(); C.add(capsule(.03, .18), 0, 0, 0, 1, 1, 1, 0, 0, 0, 0xd0453a).add(CG.sm, 0, .12, .03, .05, .04, .05, 0, 0, 0, 0xd0453a).add(CG.sm, 0, -.12, .03, .05, .04, .05, 0, 0, 0, 0xd0453a); phone.add(meshOf(C)); }
  phone.position.set(0, .02, .06); phone.visible = false; handR.add(phone);
  const comb = new THREE.Mesh(new THREE.BoxGeometry(.04, .2, .02), new THREE.MeshLambertMaterial({ color:0xff8fb8 })); comb.position.set(0, .05, .06); comb.visible = false; handR.add(comb);
  const strings = new THREE.Group(); strings.visible = false; handR.add(strings);
  { const sm = new THREE.MeshBasicMaterial({ color:0x8a7a6a }); for(let i = 0; i < 5; i++){ const l = new THREE.Mesh(new THREE.CylinderGeometry(.005, .005, 1.4, 4), sm); l.position.set((i - 2) * .06, .7, 0); l.rotation.z = (i - 2) * .12; strings.add(l); } }

  // legs: short trousers legs with fluffy blue slippers; green jelly blobs for the slippers prank
  const legs = [-1, 1].map(s => {
    const p = pivot(body, s * .2, .32, 0), Lg = new Merge();
    Lg.add(capsule(.11, .14), 0, -.1, 0, 1, 1, 1, 0, 0, 0, PANTS);
    Lg.add(CG.sph, 0, -.25, .07, .15, .1, .23, 0, 0, 0, SLIP);
    Lg.add(CG.sm, 0, -.2, .23, .07, .06, .06, 0, 0, 0, SLIP2);
    p.add(meshOf(Lg));
    const jelly = new THREE.Mesh(CG.sph, new THREE.MeshLambertMaterial({ color:0x7be05a, transparent:true, opacity:.82 })); jelly.scale.set(.19, .1, .26); jelly.position.set(0, -.22, .07); jelly.visible = false; p.add(jelly); p.userData.jelly = jelly;
    return p;
  });
  grp.scale.setScalar(.9);
  grp.traverse(o => { if(o.isMesh && o !== face){ o.castShadow = true; } });

  const u = { grp, body, head, face, arms, legs, tex, mous, curly, blueEar, creamNose, props:{ paper, cup, can, phone, comb, strings }, blinkT:.7 };
  u.marks = (m) => { blueEar.visible = !!(m && m.ear); creamNose.visible = !!(m && m.cream); curly.visible = !!(m && m.curly); mous.visible = !curly.visible; legs.forEach(l => l.userData.jelly.visible = !!(m && m.jelly)); };
  return u;
}

/* s = { t, move 0..1, act, k 0..1 (progress of a timed act) }
   acts: walk, read, sit, phone, tea, eat, reach, water, comb, lie, look, shrug, yawn, shout, grab, drop, wave, stomp,
   and the prank reactions: jump, spit, shock, dance, hop, bounce, boing, buried, fall, float */
const PROP = { read:'paper', sit:'paper', phone:'phone', tea:'cup', eat:'cup', water:'can', comb:'comb', float:'strings', spit:'cup' };
export function poseUncle(u, s){
  const t = s.t, mv = s.move || 0, act = s.act || 'walk', k = s.k || 0;
  const w = Math.sin(t * 7);
  const b = u.body, [aL, aR] = u.arms, [lL, lR] = u.legs;
  b.position.set(0, Math.abs(w) * .05 * mv + Math.sin(t * 2) * .012, 0);
  b.rotation.set(mv * .05, 0, w * .1 * mv);
  b.scale.set(1, 1, 1);
  lL.rotation.set(Math.sin(t * 7) * .5 * mv, 0, 0); lR.rotation.set(Math.sin(t * 7 + Math.PI) * .5 * mv, 0, 0);
  u.head.rotation.set(Math.sin(t * 2.2) * .03, 0, Math.sin(t * 1.4) * .04 - w * .05 * mv);
  aL.rotation.set(-Math.sin(t * 7) * .4 * mv, 0, .3); aR.rotation.set(-Math.sin(t * 7 + Math.PI) * .4 * mv, 0, -.3);
  u.mous.rotation.z = 0; u.mous.scale.set(1, 1, 1); u.curly.scale.setScalar(1);
  let fk = 'grumpy';
  const sit = () => { lL.rotation.x = lR.rotation.x = -1.45; b.position.y = -.28; };
  switch(act){
    case 'read': case 'sit':
      if(act === 'sit') sit();
      aL.rotation.set(-1.25, 0, -.35); aR.rotation.set(-1.25, 0, .35); u.head.rotation.x = .12 + Math.sin(t * .7) * .04; u.head.rotation.y = Math.sin(t * .5) * .15;
      if(Math.sin(t * .9) > .93){ u.mous.rotation.z = Math.sin(t * 30) * .08; }
      break;
    case 'phone': aR.rotation.set(-.5, 0, 2.55); u.head.rotation.z = -.15; fk = Math.sin(t * 1.3) > 0 ? 'angry' : 'grumpy'; u.mous.rotation.z = Math.sin(t * 12) * .06; break;
    case 'tea': case 'eat': { const sip = Math.max(0, Math.sin(t * 1.4)); aR.rotation.set(-.9 - sip * .9, 0, .25 + sip * .2); u.head.rotation.x = -sip * .15; aL.rotation.set(-.4, 0, .5); break; }
    case 'reach': aR.rotation.set(-1.3 + Math.sin(t * 5) * .1, 0, -.1); aL.rotation.set(-.6, 0, .4); b.rotation.x = .12; break;
    case 'water': aR.rotation.set(-1.0, 0, -.1); u.props.can.rotation.z = -.5 + Math.sin(t * 2) * .15; b.rotation.x = .08; fk = 'happy'; break;
    case 'comb': aR.rotation.set(-1.9, 0, -.9 + Math.sin(t * 9) * .2); u.head.rotation.y = Math.sin(t * 1.2) * .2; fk = Math.sin(t * .6) > .3 ? 'happy' : 'grumpy'; break;
    case 'lie': aL.rotation.set(-.4, 0, -.6); aR.rotation.set(-.4, 0, .6); lL.rotation.x = lR.rotation.x = 0; b.position.y = Math.sin(t * 1.3) * .02; fk = 'sleep'; break;
    case 'look': u.head.rotation.y = Math.sin(t * 1.6) * .75; aL.rotation.set(-.4, 0, .9); aR.rotation.set(-.2, 0, -.6); break;
    case 'shrug': { const e = Math.min(1, k * 4) * (k > .85 ? (1 - k) / .15 : 1); aL.rotation.set(-.3 * e, 0, .3 + 1.25 * e); aR.rotation.set(-.3 * e, 0, -.3 - 1.25 * e); u.head.rotation.z = .2 * e; fk = 'surprised'; break; }
    case 'yawn': { const e = Math.sin(Math.min(1, k) * Math.PI); aL.rotation.set(-2.6 * e, 0, .35 + .4 * e); aR.rotation.set(-2.6 * e, 0, -.35 - .4 * e); u.head.rotation.x = -.2 * e; fk = e > .3 ? 'surprised' : 'blink'; break; }
    case 'shout': aL.rotation.set(-.3, 0, 2.3 + Math.sin(t * 14) * .3); aR.rotation.set(-.3, 0, -2.3 - Math.sin(t * 14 + 1) * .3); fk = 'angry'; u.mous.rotation.z = Math.sin(t * 20) * .1; break;
    case 'grab': aL.rotation.set(-.2, 0, 2.75); aR.rotation.set(-.2, 0, -2.75); b.position.y += Math.abs(Math.sin(t * 9)) * .06; fk = 'angry'; u.mous.rotation.z = Math.sin(t * 20) * .1; break;
    case 'drop': aL.rotation.set(-.2, 0, .35); aR.rotation.set(-1.5, 0, -.2 + Math.sin(t * 12) * .35); fk = 'grumpy'; u.head.rotation.z = Math.sin(t * 6) * .08; break;
    case 'wave': aL.rotation.set(-.2, 0, 2.4 + Math.sin(t * 9) * .35); fk = 'happy'; break;
    case 'stomp': { const st = Math.abs(Math.sin(t * 8)); lL.rotation.x = -st * .6; lR.rotation.x = -(1 - st) * .6; aL.rotation.set(-.2, 0, 1.0); aR.rotation.set(-.2, 0, -1.0); b.position.y += st * .08; fk = 'angry'; u.mous.rotation.z = Math.sin(t * 16) * .12; break; }
    // ---- prank reactions ----
    case 'jump': { const j = Math.abs(Math.sin(k * Math.PI * 3)); b.position.y += j * .38; aL.rotation.set(-.2, 0, 2.6); aR.rotation.set(-.2, 0, -2.6); lL.rotation.x = -j * .8; lR.rotation.x = -j * .5; fk = 'surprised'; b.scale.set(1 - j * .08, 1 + j * .12, 1 - j * .08); break; }
    case 'spit': { const e = Math.min(1, k * 3); b.rotation.x = .3 * e; aR.rotation.set(-1.2, 0, .2); aL.rotation.set(-.2, 0, 1.6 + Math.sin(t * 14) * .3); u.head.rotation.x = .25 * e; fk = k > .2 ? 'surprised' : 'grumpy'; b.scale.set(1 + Math.sin(t * 30) * .03 * e, 1, 1); break; }
    case 'shock': aL.rotation.set(-.2, 0, 2.5 + Math.sin(t * 20) * .2); aR.rotation.set(-.2, 0, -2.5 - Math.sin(t * 20) * .2); b.position.x = Math.sin(t * 40) * .04; fk = 'surprised'; u.head.scale.setScalar(1 + Math.sin(k * Math.PI) * .08); break;
    case 'dance': b.rotation.y = k * Math.PI * 4; aL.rotation.set(-.2, 0, 2.0 + Math.sin(t * 10) * .4); aR.rotation.set(-.2, 0, -2.0 - Math.sin(t * 10) * .4); fk = Math.sin(t * 4) > 0 ? 'surprised' : 'happy'; break;
    case 'hop': { const j = Math.abs(Math.sin(t * 9)); b.position.y += j * .3; lL.rotation.x = -1.2; lR.rotation.x = -j * .2; aL.rotation.set(-.2, 0, 1.6 + Math.sin(t * 9) * .4); aR.rotation.set(-.2, 0, -1.6); b.rotation.z = Math.sin(t * 9) * .15; fk = 'surprised'; break; }
    case 'bounce': { const j = Math.abs(Math.sin(t * 7)); b.position.y += j * .35 - .2; b.scale.set(1 + (1 - j) * .1, 1 - (1 - j) * .1, 1 + (1 - j) * .1); aL.rotation.set(-.2, 0, 2.2); aR.rotation.set(-.2, 0, -2.2); fk = 'surprised'; break; }
    case 'boing': { const e = Math.min(1, k * 2.5); u.curly.scale.setScalar(1 + e * .5 + Math.sin(t * 18) * .08 * e); aL.rotation.set(-.2, 0, 1.8); aR.rotation.set(-1.9, 0, -.6); fk = k > .5 ? 'happy' : 'surprised'; u.head.rotation.z = Math.sin(t * 8) * .1; break; }
    case 'buried': aL.rotation.set(-.2, 0, 2.6 + Math.sin(t * 12) * .3); aR.rotation.set(-.2, 0, -2.6 - Math.sin(t * 12 + 1) * .3); b.position.y += Math.sin(t * 6) * .05; fk = 'surprised'; break;
    case 'fall': aL.rotation.set(-.2, 0, 2.4); aR.rotation.set(-.2, 0, -2.4); lL.rotation.x = -1.0; lR.rotation.x = -.6; fk = 'surprised'; break;
    case 'float': { aR.rotation.set(-.1, 0, -2.9); aL.rotation.set(-.2, 0, 1.4 + Math.sin(t * 6) * .4); lL.rotation.x = Math.sin(t * 8) * .6; lR.rotation.x = -Math.sin(t * 8) * .6; fk = 'surprised'; break; }
  }
  if(act !== 'shock') u.head.scale.setScalar(1);
  const prop = PROP[act];
  for(const n in u.props) u.props[n].visible = n === prop;
  if(fk === 'grumpy'){ const bt = (t + u.blinkT) % 3.9; if(bt < .14) fk = 'blink'; }
  const want = u.tex[fk] || u.tex.grumpy, fm = u.face.material;
  if(fm.map !== want){ fm.map = want; fm.needsUpdate = true; }
}
