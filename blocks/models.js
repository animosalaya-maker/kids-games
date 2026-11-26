/* Bobo Blocks: blocky animals (horse with a saddle, sheep, chicken, cat, dog) made of boxes, with legs that swing,
   a head that nods and a tail that wags. makeAnimal(THREE, kind, R) → { grp, body, head, legs, tail, kind, seat, h }. */
export const KINDS = {
  horse:{ e:'🐴', n:['حصان', 'Horse', 'At'], speed:1.6, r:.7, h:2.1 },
  sheep:{ e:'🐑', n:['خاروف', 'Sheep', 'Koyun'], speed:.9, r:.55, h:1.5 },
  chicken:{ e:'🐔', n:['جاجة', 'Chicken', 'Tavuk'], speed:1.1, r:.35, h:1.1 },
  cat:{ e:'🐱', n:['بسّة', 'Cat', 'Kedi'], speed:1.3, r:.35, h:1.1 },
  dog:{ e:'🐶', n:['كلب', 'Dog', 'Köpek'], speed:1.6, r:.45, h:1.3 }
};
export function makeAnimal(THREE, kind, R){
  const mats = new Map();
  const mat = c => { if(!mats.has(c)) mats.set(c, new THREE.MeshLambertMaterial({ color:c })); return mats.get(c); };
  const geo = new THREE.BoxGeometry(1, 1, 1);
  const grp = new THREE.Group(), body = new THREE.Group(); grp.add(body);
  const B = (parent, w, h, d, x, y, z, c) => { const m = new THREE.Mesh(geo, mat(c)); m.scale.set(w, h, d); m.position.set(x, y, z); parent.add(m); return m; };
  const piv = (parent, x, y, z) => { const p = new THREE.Group(); p.position.set(x, y, z); parent.add(p); return p; };
  const legs = []; let head, tail, seat = null;
  const eyes = (h, x, y, z, s = .07) => { B(h, s, s, .02, x, y, z, 0x1d1d22); B(h, s, s, .02, -x, y, z, 0x1d1d22); B(h, s * .45, s * .45, .022, x + s * .2, y + s * .2, z + .001, 0xffffff); B(h, s * .45, s * .45, .022, -x + s * .2, y + s * .2, z + .001, 0xffffff); };
  if(kind === 'horse'){
    const coats = [[0x8b5a2b, 0x3b2414], [0xd9c3a0, 0x8c6a46], [0x3a3330, 0x1a1614], [0xf1ede4, 0xb9b2a6], [0xb8743a, 0xf1ede4]];
    const [c, m] = coats[Math.floor(R() * coats.length)];
    B(body, .7, .72, 1.5, 0, 1.25, 0, c);
    for(const [x, z] of [[-.22, .55], [.22, .55], [-.22, -.55], [.22, -.55]]){ const p = piv(body, x, .95, z); B(p, .2, .95, .22, 0, -.47, 0, c); B(p, .22, .14, .24, 0, -.9, 0, 0x2d2420); legs.push(p); }
    const neck = piv(body, 0, 1.45, .62); neck.rotation.x = -.55; B(neck, .34, .75, .38, 0, .32, 0, c); B(neck, .1, .7, .3, 0, .34, -.18, m);
    head = piv(neck, 0, .68, .05); head.rotation.x = .55;
    B(head, .36, .36, .7, 0, .02, .22, c); B(head, .3, .24, .2, 0, -.06, .6, shade(c)); B(head, .08, .14, .08, -.12, .26, -.02, c); B(head, .08, .14, .08, .12, .26, -.02, c);
    for(const s of [-1, 1]){ B(head, .02, .09, .09, s * .185, .1, .28, 0x1d1d22); B(head, .022, .04, .04, s * .186, .12, .3, 0xffffff); }
    tail = piv(body, 0, 1.45, -.75); B(tail, .14, .6, .14, 0, -.28, -.05, m);
    // saddle
    B(body, .74, .1, .55, 0, 1.64, -.05, 0x7a3e1c); B(body, .76, .3, .5, 0, 1.45, -.05, 0xd8443c); B(body, .3, .12, .1, 0, 1.73, .2, 0x7a3e1c);
    seat = { y:1.62, z:-.05 };
  } else if(kind === 'sheep'){
    const wool = R() < .2 ? 0xe8dccb : 0xf6f5f0;
    B(body, .8, .66, 1.05, 0, .82, 0, wool); B(body, .7, .2, .9, 0, 1.18, 0, wool);
    for(const [x, z] of [[-.24, .32], [.24, .32], [-.24, -.32], [.24, -.32]]){ const p = piv(body, x, .5, z); B(p, .16, .5, .16, 0, -.25, 0, 0x5a4e45); legs.push(p); }
    head = piv(body, 0, 1.0, .58); B(head, .42, .4, .4, 0, .02, .1, 0xd9c4ac); B(head, .5, .18, .3, 0, .22, .02, wool); B(head, .14, .08, .2, -.26, .02, 0, 0xc5ae96); B(head, .14, .08, .2, .26, .02, 0, 0xc5ae96);
    eyes(head, .11, .06, .305, .07);
    tail = piv(body, 0, .9, -.52); B(tail, .16, .2, .1, 0, -.08, 0, wool);
  } else if(kind === 'chicken'){
    B(body, .38, .38, .5, 0, .48, 0, 0xfbfaf4); B(body, .1, .26, .3, -.21, .5, -.02, 0xeeeae0); B(body, .1, .26, .3, .21, .5, -.02, 0xeeeae0);
    for(const x of [-.1, .1]){ const p = piv(body, x, .3, 0); B(p, .05, .3, .05, 0, -.15, 0, 0xf2b233); B(p, .14, .03, .16, 0, -.3, .04, 0xf2b233); legs.push(p); }
    head = piv(body, 0, .7, .2); B(head, .26, .3, .24, 0, .08, .02, 0xfbfaf4); B(head, .12, .08, .14, 0, .06, .2, 0xf2a13a); B(head, .06, .12, .14, 0, .28, .03, 0xe23b3b); B(head, .06, .1, .06, 0, -.04, .16, 0xe23b3b);
    eyes(head, .1, .14, .145, .05);
    tail = piv(body, 0, .6, -.25); B(tail, .2, .26, .1, 0, .1, -.04, 0xeeeae0);
  } else if(kind === 'cat'){
    const cols = [[0xf0a04b, 0xffd9a8], [0x8a8f98, 0xdfe3e8], [0x2f2f35, 0xf2f2f2], [0xfff7ec, 0xf0a04b]];
    const [c, l] = cols[Math.floor(R() * cols.length)];
    B(body, .34, .32, .72, 0, .46, 0, c); B(body, .3, .1, .5, 0, .32, .02, l);
    for(const [x, z] of [[-.11, .24], [.11, .24], [-.11, -.24], [.11, -.24]]){ const p = piv(body, x, .3, z); B(p, .1, .3, .1, 0, -.15, 0, c); legs.push(p); }
    head = piv(body, 0, .62, .38); B(head, .38, .32, .32, 0, .04, .06, c); B(head, .2, .12, .06, 0, -.04, .23, l); B(head, .1, .14, .08, -.12, .25, .04, c); B(head, .1, .14, .08, .12, .25, .04, c); B(head, .05, .04, .03, 0, .0, .26, 0xff8fb1);
    eyes(head, .09, .08, .225, .065);
    tail = piv(body, 0, .52, -.35); B(tail, .07, .07, .45, 0, .12, -.2, c); tail.rotation.x = -.7;
  } else {
    const cols = [[0xa8703a, 0x6a4022], [0xe0c08a, 0x9a7444], [0x3b3330, 0xd9c3a0], [0xf2efe8, 0x3b3330]];
    const [c, d] = cols[Math.floor(R() * cols.length)];
    B(body, .42, .4, .82, 0, .6, 0, c);
    for(const [x, z] of [[-.13, .28], [.13, .28], [-.13, -.28], [.13, -.28]]){ const p = piv(body, x, .42, z); B(p, .13, .42, .13, 0, -.21, 0, c); legs.push(p); }
    head = piv(body, 0, .82, .44); B(head, .4, .38, .38, 0, .04, .05, c); B(head, .24, .18, .22, 0, -.04, .3, shade(c)); B(head, .08, .08, .05, 0, .02, .42, 0x1d1d22); B(head, .1, .24, .14, -.24, .02, 0, d); B(head, .1, .24, .14, .24, .02, 0, d);
    eyes(head, .1, .12, .245, .07);
    tail = piv(body, 0, .72, -.42); B(tail, .08, .08, .36, 0, .1, -.14, c); tail.rotation.x = -.8;
  }
  grp.traverse(o => { if(o.isMesh) o.castShadow = false; });
  return { grp, body, head, legs, tail, kind, seat, h:KINDS[kind].h };
}
function shade(c){ const r = (c >> 16) & 255, g = (c >> 8) & 255, b = c & 255; return (Math.round(r * .85) << 16) | (Math.round(g * .85) << 8) | Math.round(b * .85); }
/* walk / idle pose: m = 0..1 moving, t = time */
export function poseAnimal(a, m, t, dt, happy){
  const k = a.kind === 'chicken' ? 18 : a.kind === 'horse' ? (m > .7 ? 13 : 8) : 11;
  a.legs.forEach((l, i) => { const ph = a.legs.length === 2 ? i * Math.PI : (i === 0 || i === 3 ? 0 : Math.PI); l.rotation.x = Math.sin(t * k + ph) * .7 * m; });
  if(a.head) a.head.rotation.y = Math.sin(t * .9 + a.grp.id) * .25 * (1 - m);
  if(a.kind === 'chicken' && a.head) a.head.position.z = .2 + Math.max(0, Math.sin(t * 6)) * .05 * (1 - m);
  if(a.tail) a.tail.rotation.z = Math.sin(t * (happy ? 16 : 3)) * (happy ? .7 : .2);
  a.body.position.y = Math.abs(Math.sin(t * k)) * .04 * m + (happy ? Math.abs(Math.sin(t * 9)) * .12 : 0);
}
