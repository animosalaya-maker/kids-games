/* Grandma Nona: an original round cartoon grandma — pink polka-dot bathrobe, blue hair curlers,
   round glasses, fluffy slippers and a big soft pillow. Grumpy-funny, never scary. */
import { roundBox } from './house.js';

export function makeNona(THREE, K){
  const { CG, Merge, capsule, charMat, faceTex, facePatch, pivot } = K;
  const ROBE = 0xff9ec4, ROBE_D = 0xf27fae, SKIN = 0xf3c7a5, HAIR = 0xece8f2, CURL = 0x8fd0ff, FLUFF = 0xfffafc;
  const meshOf = M => new THREE.Mesh(M.geometry(), charMat());
  const RB = roundBox(THREE, 4, .3);
  const grp = new THREE.Group(), body = new THREE.Group(); grp.add(body);

  // robe skirt with white polka dots
  const dots = K.canvasTex(256, 128, (x, w, h) => { x.fillStyle = '#ff9ec4'; x.fillRect(0, 0, w, h); x.fillStyle = '#fff3f8';
    for(let j = 0; j < 4; j++) for(let i = 0; i < 8; i++){ x.beginPath(); x.arc(i * 32 + (j % 2) * 16 + 8, j * 32 + 16, 6, 0, 6.3); x.fill(); } });
  dots.wrapS = THREE.RepeatWrapping; dots.repeat.set(2, 1);
  const skirt = new THREE.Mesh(new THREE.CylinderGeometry(.36, .5, .78, 32, 1, true), charMat({ vertexColors:false, map:dots, side:THREE.DoubleSide }));
  skirt.position.y = .52; body.add(skirt);
  const M = new Merge();
  M.add(CG.sph, 0, 1.0, 0, .46, .44, .42, 0, 0, 0, ROBE);                       // round tummy + chest
  M.add(new THREE.CircleGeometry(1, 32), 0, .13, 0, .5, .5, .5, Math.PI / 2, 0, 0, ROBE_D);   // skirt hem underside
  M.add(new THREE.TorusGeometry(.5, .035, 10, 40), 0, .14, 0, 1, 1, 1, Math.PI / 2, 0, 0, FLUFF);
  M.add(new THREE.TorusGeometry(.42, .05, 10, 40), 0, .86, 0, 1, 1, 1, Math.PI / 2, 0, 0, ROBE_D);   // belt
  M.add(CG.sm, -.07, .84, .42, .08, .06, .05, 0, 0, .5, ROBE_D).add(CG.sm, .07, .84, .42, .08, .06, .05, 0, 0, -.5, ROBE_D).add(CG.sm, 0, .84, .43, .04, .04, .04, 0, 0, 0, ROBE_D);
  M.add(capsule(.03, .22), -.06, .7, .41, 1, 1, 1, .2, 0, .25, ROBE_D).add(capsule(.03, .22), .06, .7, .41, 1, 1, 1, .2, 0, -.25, ROBE_D);
  M.add(new THREE.TorusGeometry(.25, .09, 10, 30), 0, 1.33, .02, 1, 1, .9, Math.PI / 2 - .15, 0, 0, FLUFF);     // fluffy collar
  for(const s of [-1, 1]) M.add(RB, s * .2, .5, .38, .17, .15, .04, -.1, s * .25, 0, ROBE_D);                  // pockets
  M.add(CG.cyl8, 0, 1.42, 0, .1, .12, .1, 0, 0, 0, SKIN);
  body.add(meshOf(M));

  // head
  const hr = .37, head = pivot(body, 0, 1.68, 0);
  const H = new Merge();
  H.add(CG.sph, 0, 0, 0, hr, hr * .96, hr * .95, 0, 0, 0, SKIN);
  for(const s of [-1, 1]){ H.add(CG.sm, s * hr * .97, -.03, 0, .07, .09, .06, 0, 0, 0, SKIN); H.add(CG.sm, s * hr * .98, -.12, .01, .03, .03, .03, 0, 0, 0, 0xffffff); }
  H.add(CG.sm, 0, -.03, hr * .97, .075, .065, .06, 0, 0, 0, 0xf2a88e);                                  // round nose
  // hair: soft cap + bun
  H.add(new THREE.SphereGeometry(1, 30, 16, 0, Math.PI * 2, 0, Math.PI * .5), 0, .03, -.03, hr * 1.06, hr * 1.04, hr * 1.06, -.42, 0, 0, HAIR);
  H.add(CG.sph, 0, -.02, -.09, hr * 1.03, hr * .9, hr * .98, 0, 0, 0, HAIR);
  for(const s of [-1, 1]) H.add(CG.sm, s * hr * .86, .03, .02, .1, .18, .12, 0, 0, s * .2, HAIR);
  H.add(CG.sph, 0, hr * .78, -hr * .55, .17, .15, .17, 0, 0, 0, HAIR);
  // curlers: little blue rollers across the top
  [[-.2, .82, .25], [0, .9, .3], [.2, .82, .25], [-.27, .6, .05], [.27, .6, .05], [0, .86, -.1]].forEach(([x, y, z], i) => {
    H.add(CG.cyl, x * hr * 2.4, y * hr, z * hr * 1.2 + .05, .055, .17, .055, 0, 0, Math.PI / 2, i % 2 ? CURL : 0xb7e3ff);
    H.add(CG.cyl, x * hr * 2.4, y * hr, z * hr * 1.2 + .05, .06, .02, .06, 0, 0, Math.PI / 2, 0xffffff);
  });
  head.add(meshOf(H));
  const FACE = {
    grumpy:{ glasses:'#d9a62e', wrinkles:true, blush:true, brows:'grumpy', browCol:'#a59fb0', mouth:'wavy', lip:'#9a4a3a', iris:'#5a3a22' },
    happy:{ glasses:'#d9a62e', wrinkles:true, blush:true, mouth:'smile', lip:'#9a4a3a', iris:'#5a3a22', eye:'happy' },
    surprised:{ glasses:'#d9a62e', wrinkles:true, blush:true, brows:'up', browCol:'#a59fb0', mouth:'o', iris:'#5a3a22' }
  };
  const face = facePatch(hr * 1.012, FACE.grumpy); face.scale.z = .95; head.add(face);
  const tex = { grumpy:face.userData.open, sleep:face.userData.shut, happy:faceTex(FACE.happy, false), surprised:faceTex(FACE.surprised, false) };

  // arms: puffy robe sleeves with fluffy cuffs
  const arms = [-1, 1].map(s => {
    const p = pivot(body, s * .43, 1.22, 0), A = new Merge();
    A.add(capsule(.1, .3), 0, -.22, 0, 1, 1, 1, 0, 0, 0, ROBE);
    A.add(new THREE.TorusGeometry(.09, .04, 8, 18), 0, -.44, 0, 1, 1, 1, Math.PI / 2, 0, 0, FLUFF);
    A.add(CG.sph, 0, -.53, 0, .085, .085, .085, 0, 0, 0, SKIN);
    p.add(meshOf(A)); p.userData.side = s; p.rotation.z = -s * .35; return p;
  });
  // pillow in the right hand
  const pillow = new THREE.Group();
  const PM = new Merge(); PM.add(RB, 0, 0, 0, .6, .2, .42, 0, 0, 0, 0xfffbf2);
  for(const s of [-1, 1]) PM.add(new THREE.TorusGeometry(.04, .02, 6, 12), s * .31, 0, 0, 1, 1, 1, 0, Math.PI / 2, 0, 0xffc1d8);
  pillow.add(meshOf(PM)); pillow.position.set(0, -.58, .2); pillow.rotation.set(.3, 0, 1.2); arms[1].add(pillow);
  // legs: short with fluffy slippers
  const legs = [-1, 1].map(s => {
    const p = pivot(body, s * .16, .2, 0), Lg = new Merge();
    Lg.add(CG.cyl8, 0, -.05, 0, .07, .14, .07, 0, 0, 0, SKIN);
    Lg.add(CG.sph, 0, -.13, .06, .13, .09, .2, 0, 0, 0, 0xff7fae);
    Lg.add(CG.sph, 0, -.08, .17, .1, .08, .09, 0, 0, 0, FLUFF);
    p.add(meshOf(Lg)); return p;
  });
  grp.scale.setScalar(.86);
  grp.traverse(o => { if(o.isMesh && o !== face){ o.castShadow = true; } });

  const n = { grp, body, head, face, arms, legs, pillow, tex, faceNow:'grumpy', blinkT:1.3 };
  n.setFace = k => { n.faceNow = k; };
  return n;
}

/* s = { t, dt, move 0..1, act: 'walk'|'look'|'shrug'|'boop'|'yawn'|'wave'|'sleep', k: 0..1 progress of the act } */
export function poseNona(n, s){
  const t = s.t, mv = s.move || 0, act = s.act || 'walk', k = s.k || 0;
  const w = Math.sin(t * 8);
  n.body.position.y = Math.abs(w) * .045 * mv + Math.sin(t * 2) * .012;
  n.body.rotation.set(mv * .06, 0, w * .09 * mv);
  n.legs.forEach((l, i) => { l.rotation.x = Math.sin(t * 8 + i * Math.PI) * .55 * mv; });
  n.head.rotation.set(Math.sin(t * 2.2) * .03, 0, Math.sin(t * 1.4) * .04 - w * .05 * mv);
  const [aL, aR] = n.arms;
  aL.rotation.set(-Math.sin(t * 8) * .35 * mv, 0, .35 + Math.sin(t * 2) * .03);
  aR.rotation.set(-.55 - Math.sin(t * 8 + Math.PI) * .2 * mv, 0, -.3);
  let fk = n.faceNow;
  if(act === 'look'){ n.head.rotation.y = Math.sin(t * 1.6) * .75; aL.rotation.z = .9; aL.rotation.x = -.4; }
  else if(act === 'shrug'){ const e = Math.min(1, k * 4) * (k > .85 ? (1 - k) / .15 : 1); aL.rotation.set(-.3 * e, 0, .35 + 1.25 * e); aR.rotation.set(-.3 * e - .3, 0, -.3 - 1.0 * e); n.head.rotation.z = .2 * e; n.body.position.y += .03 * e; fk = 'surprised'; }
  else if(act === 'boop'){ const e = k < .45 ? k / .45 : 1 - (k - .45) / .55; aR.rotation.set(-.6 - 2.1 * Math.sin(Math.min(1, k / .45) * Math.PI / 2) + (k > .45 ? 2.4 * (k - .45) / .55 : 0), 0, -.3); n.body.rotation.x = .15 * e; fk = 'happy'; }
  else if(act === 'yawn'){ const e = Math.sin(Math.min(1, k) * Math.PI); aL.rotation.set(-2.6 * e, 0, .35 + .4 * e); aR.rotation.set(-.55 - 2.0 * e, 0, -.3 - .4 * e); n.head.rotation.x = -.2 * e; fk = e > .3 ? 'surprised' : 'sleep'; }
  else if(act === 'wave'){ aL.rotation.set(-.2, 0, 2.4 + Math.sin(t * 9) * .35); fk = 'happy'; }
  else if(act === 'sleep'){ fk = 'sleep'; aL.rotation.set(-.2, 0, .5); aR.rotation.set(-.2, 0, -.5); n.legs.forEach(l => l.rotation.x = 0); n.body.rotation.set(0, 0, 0); n.body.position.y = Math.sin(t * 1.3) * .02; }
  // blink
  if(fk === 'grumpy'){ const bt = (t + n.blinkT) % 4.1; if(bt < .14) fk = 'sleep'; }
  const want = n.tex[fk] || n.tex.grumpy, fm = n.face.material;
  if(fm.map !== want){ fm.map = want; fm.needsUpdate = true; }
}
