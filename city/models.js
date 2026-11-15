/* Bobo City («مدينة بوبو 🏙️») — models: furniture, vehicles, role outfits and props, held items, pets, townsfolk.
   Everything is low-poly, vertex-coloured, built with the shared kit's Merge helper (one draw call per model).
   Units: 1 = 1 m. Characters are about 1.3 tall. Vehicles and furniture face +z. */
export function makeCityModels(THREE, K){
  const { Merge, G } = K;
  const L = window.L || (a => a);
  const MAT = new THREE.MeshStandardMaterial({ vertexColors:true, roughness:.62, metalness:0 });
  const GLASS = new THREE.MeshStandardMaterial({ vertexColors:true, roughness:.15, metalness:.1, transparent:true, opacity:.55 });
  const mesh = (M, mat = MAT, cast = true) => { const m = new THREE.Mesh(M.geometry(), mat); m.castShadow = cast; m.receiveShadow = true; return m; };
  /* triangular prism (gable roofs, slides): base −.5..+.5 on x, apex at y=1, z −.5..+.5 */
  const PRISM = (() => { const s = new THREE.Shape(); s.moveTo(-.5, 0); s.lineTo(.5, 0); s.lineTo(0, 1); s.closePath(); const g = new THREE.ExtrudeGeometry(s, { depth:1, bevelEnabled:false }); g.translate(0, 0, -.5); return g; })();
  const WHEEL = new THREE.CylinderGeometry(1, 1, 1, 14).rotateZ(Math.PI / 2);
  const RING = new THREE.TorusGeometry(1, .12, 6, 18);

  /* ======================================================================
     Furniture: footprint w×d cells of 1 m, origin at the footprint centre on the floor, front = +z.
     rug: lies under other things. wall: hangs on the nearest wall (edge cells only).
     ====================================================================== */
  const FURN = {
    bed:      { w:2, d:3, cat:'bed', e:'🛏️', name:L('سرير', 'Bed', 'Yatak') },
    bigbed:   { w:3, d:3, cat:'bed', e:'🛌', name:L('سرير كبير', 'Big bed', 'Büyük yatak') },
    bunk:     { w:2, d:3, cat:'bed', e:'🪜', name:L('سرير طابقين', 'Bunk bed', 'Ranza') },
    sofa:     { w:3, d:1, cat:'sofa', e:'🛋️', name:L('كنباية', 'Sofa', 'Kanepe') },
    armchair: { w:1, d:1, cat:'sofa', e:'💺', name:L('كرسي مريح', 'Armchair', 'Koltuk') },
    beanbag:  { w:1, d:1, cat:'sofa', e:'🟣', name:L('كيس قعدة', 'Bean bag', 'Armut koltuk') },
    tv:       { w:2, d:1, cat:'tv', e:'📺', name:L('تلفزيون', 'TV', 'Televizyon') },
    coffee:   { w:2, d:1, cat:'tv', e:'☕', name:L('طاولة صغيرة', 'Coffee table', 'Sehpa') },
    counter:  { w:2, d:1, cat:'kitchen', e:'🚰', name:L('مجلى', 'Sink counter', 'Lavabo tezgâhı') },
    stove:    { w:1, d:1, cat:'kitchen', e:'🍳', name:L('غاز', 'Stove', 'Ocak') },
    fridge:   { w:1, d:1, cat:'kitchen', e:'🧊', name:L('براد', 'Fridge', 'Buzdolabı') },
    dining:   { w:2, d:2, cat:'kitchen', e:'🍽️', name:L('طاولة سفرة', 'Dining table', 'Yemek masası') },
    chair:    { w:1, d:1, cat:'kitchen', e:'🪑', name:L('كرسي', 'Chair', 'Sandalye') },
    plant:    { w:1, d:1, cat:'plant', e:'🪴', name:L('نبتة', 'Plant', 'Bitki') },
    bigplant: { w:1, d:1, cat:'plant', e:'🌴', name:L('نخلة صغيرة', 'Little palm', 'Küçük palmiye') },
    flowers:  { w:1, d:1, cat:'plant', e:'🌷', name:L('ورد', 'Flowers', 'Çiçekler') },
    lamp:     { w:1, d:1, cat:'lamp', e:'💡', name:L('ضو', 'Floor lamp', 'Lambader') },
    deskLamp: { w:2, d:1, cat:'lamp', e:'📚', name:L('مكتب وضو', 'Desk & lamp', 'Masa ve lamba') },
    rugRound: { w:3, d:3, cat:'rug', rug:true, e:'⭕', name:L('سجادة مدوّرة', 'Round rug', 'Yuvarlak halı') },
    rugRect:  { w:3, d:2, cat:'rug', rug:true, e:'🟦', name:L('سجادة', 'Rug', 'Halı') },
    rugSmall: { w:2, d:1, cat:'rug', rug:true, e:'🟩', name:L('سجادة صغيرة', 'Small rug', 'Küçük halı') },
    picSun:   { w:1, d:1, cat:'pic', wall:true, e:'🌞', name:L('صورة شمس', 'Sun picture', 'Güneş tablosu') },
    picBoat:  { w:1, d:1, cat:'pic', wall:true, e:'⛵', name:L('صورة شختورة', 'Boat picture', 'Tekne tablosu') },
    picTree:  { w:1, d:1, cat:'pic', wall:true, e:'🌳', name:L('صورة شجرة', 'Tree picture', 'Ağaç tablosu') },
    shelf:    { w:2, d:1, cat:'more', e:'📖', name:L('مكتبة', 'Bookshelf', 'Kitaplık') },
    toybox:   { w:1, d:1, cat:'more', e:'🧸', name:L('صندوق ألعاب', 'Toy box', 'Oyuncak kutusu') },
    wardrobe: { w:2, d:1, cat:'more', e:'🚪', name:L('خزانة', 'Wardrobe', 'Gardırop') },
    piano:    { w:2, d:1, cat:'more', e:'🎹', name:L('بيانو', 'Piano', 'Piyano') },
    bath:     { w:2, d:1, cat:'more', e:'🛁', name:L('بانيو', 'Bathtub', 'Küvet') }
  };
  const FURN_IDS = Object.keys(FURN);
  const FCATS = [
    ['bed', '🛏️', L('أسرّة', 'Beds', 'Yataklar')], ['sofa', '🛋️', L('كنباية', 'Sofas', 'Kanepeler')], ['tv', '📺', L('تلفزيون', 'TV', 'TV')],
    ['kitchen', '🍳', L('مطبخ', 'Kitchen', 'Mutfak')], ['plant', '🪴', L('نباتات', 'Plants', 'Bitkiler')], ['lamp', '💡', L('ضو', 'Lamps', 'Lambalar')],
    ['rug', '🟦', L('سجّاد', 'Rugs', 'Halılar')], ['pic', '🖼️', L('صور', 'Pictures', 'Tablolar')], ['more', '🧸', L('غيرهن', 'More', 'Diğer')]
  ];
  const FGEO = {};
  function furnGeo(k){
    if(FGEO[k]) return FGEO[k];
    const M = new Merge(), wood = 0xc98a52, woodD = 0xa86c3c, white = 0xfaf6ee;
    switch(k){
      case 'bed':
        M.add(G.box, 0, .22, 0, 1.6, .3, 2.7, 0, 0, 0, wood); M.add(G.box, 0, .45, .1, 1.5, .2, 2.4, 0, 0, 0, white);
        M.add(G.box, 0, .5, .45, 1.52, .16, 1.6, 0, 0, 0, 0x7fb6f0); M.add(G.box, 0, .6, -.9, .9, .16, .45, 0, 0, 0, 0xffffff);
        M.add(G.box, 0, .65, -1.3, 1.6, 1, .12, 0, 0, 0, woodD); break;
      case 'bigbed':
        M.add(G.box, 0, .22, 0, 2.6, .3, 2.7, 0, 0, 0, wood); M.add(G.box, 0, .45, .1, 2.5, .2, 2.4, 0, 0, 0, white);
        M.add(G.box, 0, .5, .45, 2.52, .16, 1.6, 0, 0, 0, 0xf2a0b8); for(const s of [-1, 1]) M.add(G.box, s * .6, .6, -.9, .9, .16, .45, 0, 0, 0, 0xffffff);
        M.add(G.box, 0, .75, -1.3, 2.6, 1.2, .14, 0, 0, 0, woodD); break;
      case 'bunk':
        for(const [x, z] of [[-.75, -1.25], [.75, -1.25], [-.75, 1.25], [.75, 1.25]]) M.add(G.box, x, 1, z, .1, 2, .1, 0, 0, 0, woodD);
        for(const y of [.3, 1.35]){ M.add(G.box, 0, y, 0, 1.6, .16, 2.6, 0, 0, 0, wood); M.add(G.box, 0, y + .14, .1, 1.45, .14, 2.3, 0, 0, 0, white); M.add(G.box, 0, y + .2, .45, 1.47, .1, 1.5, 0, 0, 0, y < 1 ? 0x6fcf97 : 0xffb84d); }
        for(let i = 0; i < 5; i++) M.add(G.box, .8, .45 + i * .3, .9, .06, .06, .5, 0, 0, 0, woodD); break;
      case 'sofa': M.add(G.box, 0, .24, 0, 2.7, .3, .82, 0, 0, 0, 0x5f9ee8); M.add(G.box, 0, .58, -.3, 2.7, .62, .22, 0, 0, 0, 0x5f9ee8); for(const s of [-1, 1]) M.add(G.box, s * 1.28, .45, 0, .2, .44, .82, 0, 0, 0, 0x4a86cf);
        for(const s of [-1, 0, 1]) M.add(G.box, s * .82, .44, .06, .76, .12, .62, 0, 0, 0, 0x8ab9f2); for(const s of [-1, 1]) M.add(G.sph, s * .7, .66, -.12, .3, .22, .1, 0, 0, s * .2, 0xffd38a); break;
      case 'armchair': M.add(G.box, 0, .24, 0, .86, .3, .8, 0, 0, 0, 0xe8724f); M.add(G.box, 0, .6, -.3, .86, .6, .2, 0, 0, 0, 0xe8724f); for(const s of [-1, 1]) M.add(G.box, s * .38, .45, 0, .14, .38, .8, 0, 0, 0, 0xd8603f); M.add(G.box, 0, .43, .05, .6, .1, .6, 0, 0, 0, 0xf6997c); break;
      case 'beanbag': M.add(G.sph, 0, .28, 0, .45, .3, .45, 0, 0, 0, 0xa98be8); M.add(G.sph, 0, .4, -.18, .35, .3, .2, 0, 0, 0, 0x9478db); break;
      case 'tv': M.add(G.box, 0, .25, 0, 1.7, .5, .55, 0, 0, 0, wood); M.add(G.box, 0, .25, .28, 1.5, .36, .02, 0, 0, 0, woodD);
        M.add(G.box, 0, .58, 0, .3, .12, .2, 0, 0, 0, 0x333344); M.add(G.box, 0, 1.05, -.05, 1.5, .85, .08, 0, 0, 0, 0x2b2b38); M.add(G.box, 0, 1.05, -.005, 1.38, .73, .02, 0, 0, 0, 0x6fd0ff); M.add(G.sph, -.35, 1.15, .01, .12, .12, .01, 0, 0, 0, 0xfff1a8); break;
      case 'coffee': M.add(G.box, 0, .35, 0, 1.4, .08, .7, 0, 0, 0, wood); for(const [x, z] of [[-.6, -.27], [.6, -.27], [-.6, .27], [.6, .27]]) M.add(G.box, x, .16, z, .07, .32, .07, 0, 0, 0, woodD);
        M.add(G.cyl, .3, .45, 0, .1, .14, .1, 0, 0, 0, 0xffffff); M.add(G.box, -.3, .41, .05, .3, .05, .22, 0, .3, 0, 0xff8a7e); break;
      case 'counter': M.add(G.box, 0, .45, 0, 1.9, .9, .8, 0, 0, 0, 0xf4f1ea); M.add(G.box, 0, .92, 0, 1.96, .06, .86, 0, 0, 0, 0x9aa7b4);
        M.add(G.box, -.4, .93, .02, .6, .04, .45, 0, 0, 0, 0x7fb0d6); M.add(G.cyl8, -.4, 1.1, -.25, .03, .32, .03, 0, 0, 0, 0xbfc6cf); M.add(G.box, -.4, 1.25, -.15, .04, .04, .22, 0, 0, 0, 0xbfc6cf);
        for(const x of [-.47, .47]) M.add(G.box, x, .5, .41, .85, .7, .02, 0, 0, 0, 0xe5dfd2); M.add(G.sph, .5, 1.02, 0, .12, .1, .12, 0, 0, 0, 0xff6b5e); break;
      case 'stove': M.add(G.box, 0, .45, 0, .9, .9, .8, 0, 0, 0, 0xe9edf2); M.add(G.box, 0, .91, 0, .92, .04, .82, 0, 0, 0, 0x3a3a46); for(const [x, z] of [[-.2, -.18], [.2, -.18], [-.2, .18], [.2, .18]]) M.add(G.cyl, x, .94, z, .12, .02, .12, 0, 0, 0, 0x55555f);
        M.add(G.box, 0, .45, .41, .7, .45, .02, 0, 0, 0, 0x2b2b38); M.add(G.cyl, .2, 1.02, .18, .16, .14, .16, 0, 0, 0, 0xff8a3d); break;
      case 'fridge': M.add(G.box, 0, .95, 0, .85, 1.9, .8, 0, 0, 0, 0xe8f4ff); M.add(G.box, 0, 1.3, .41, .82, .02, .02, 0, 0, 0, 0xb0c4d6); for(const y of [.8, 1.55]) M.add(G.box, .3, y, .42, .05, .3, .04, 0, 0, 0, 0x9aa7b4);
        M.add(G.sph, -.15, 1.6, .41, .08, .08, .02, 0, 0, 0, 0xffc23d); break;
      case 'dining': M.add(G.box, 0, .7, 0, 1.6, .08, 1.6, 0, 0, 0, wood); M.add(G.cyl8, 0, .35, 0, .1, .7, .1, 0, 0, 0, woodD); M.add(G.cyl, 0, .03, 0, .45, .06, .45, 0, 0, 0, woodD);
        for(let i = 0; i < 4; i++){ const a = i * Math.PI / 2, x = Math.sin(a) * .95, z = Math.cos(a) * .95; M.add(G.box, x, .4, z, .4, .06, .4, 0, a, 0, 0xe0a46a); M.add(G.box, x + Math.sin(a) * .18, .62, z + Math.cos(a) * .18, .4, .45, .06, 0, a, 0, 0xe0a46a); }
        M.add(G.cyl, 0, .8, 0, .3, .08, .3, 0, 0, 0, 0xffffff); for(let i = 0; i < 3; i++) M.add(G.sph, (i - 1) * .12, .88, (i % 2) * .08, .09, .08, .09, 0, 0, 0, 0xff6b5e); break;
      case 'chair': M.add(G.box, 0, .42, 0, .5, .07, .5, 0, 0, 0, 0xe0a46a); M.add(G.box, 0, .72, -.22, .5, .55, .07, 0, 0, 0, 0xe0a46a); for(const [x, z] of [[-.2, -.2], [.2, -.2], [-.2, .2], [.2, .2]]) M.add(G.box, x, .2, z, .06, .4, .06, 0, 0, 0, woodD); break;
      case 'plant': M.add(G.cyl, 0, .18, 0, .2, .36, .2, 0, 0, 0, 0xd9784a); M.add(G.torus, 0, .36, 0, .2, .2, .4, Math.PI / 2, 0, 0, 0xc4673c); for(let i = 0; i < 5; i++){ const a = i * 1.26; M.add(G.sph, Math.cos(a) * .12, .5 + (i % 2) * .1, Math.sin(a) * .12, .14, .2, .14, 0, 0, 0, i % 2 ? 0x4fbf5a : 0x62cf6a); } break;
      case 'bigplant': M.add(G.cyl, 0, .24, 0, .24, .48, .24, 0, 0, 0, 0xe8d6b8); M.add(G.cyl8, 0, .8, 0, .05, .7, .05, 0, 0, 0, 0x9a6b3c); for(let i = 0; i < 6; i++){ const a = i / 6 * Math.PI * 2; M.add(G.sph, Math.cos(a) * .32, 1.16, Math.sin(a) * .32, .38, .06, .13, 0, -a, -.4, i % 2 ? 0x46b85a : 0x5cc86a); } break;
      case 'flowers': M.add(G.cyl, 0, .2, 0, .16, .4, .16, 0, 0, 0, 0x8fc9f0); for(let i = 0; i < 6; i++){ const a = i * 1.05; M.add(G.cyl8, Math.cos(a) * .06, .55, Math.sin(a) * .06, .015, .35, .015, 0, 0, 0, 0x4fae4a); M.add(G.sm, Math.cos(a) * .1, .75 + (i % 2) * .06, Math.sin(a) * .1, .08, .06, .08, 0, 0, 0, 0xff8fb1); } break;
      case 'lamp': M.add(G.cyl, 0, .03, 0, .22, .06, .22, 0, 0, 0, 0x6a5a8a); M.add(G.cyl8, 0, .7, 0, .035, 1.3, .035, 0, 0, 0, 0x6a5a8a); M.add(G.cone, 0, 1.35, 0, .32, .36, .32, 0, 0, 0, 0xfff1c2); M.add(G.sm, 0, 1.22, 0, .1, .1, .1, 0, 0, 0, 0xffffff); break;
      case 'deskLamp': M.add(G.box, 0, .7, 0, 1.7, .07, .7, 0, 0, 0, 0xf2e2c4); for(const s of [-1, 1]) M.add(G.box, s * .78, .35, 0, .07, .7, .65, 0, 0, 0, 0xe0c9a0);
        M.add(G.cyl, .55, .76, -.15, .1, .04, .1, 0, 0, 0, 0x3f8ef0); M.add(G.cyl8, .55, .95, -.15, .02, .38, .02, 0, 0, 0, 0x3f8ef0); M.add(G.cone, .48, 1.15, -.1, .13, .16, .13, 0, 0, -.6, 0x3f8ef0);
        M.add(G.box, -.3, .77, 0, .5, .06, .35, 0, .2, 0, 0xffffff); M.add(G.box, -.3, .81, 0, .46, .02, .32, 0, .2, 0, 0x9ad7a8); break;
      case 'rugRound': M.add(G.cyl, 0, .015, 0, 1.4, .03, 1.4, 0, 0, 0, 0xf6c36a); M.add(G.cyl, 0, .025, 0, .95, .03, .95, 0, 0, 0, 0xffe2a8); break;
      case 'rugRect': M.add(G.box, 0, .015, 0, 2.8, .03, 1.8, 0, 0, 0, 0x6fb3f0); M.add(G.box, 0, .025, 0, 2.5, .03, 1.5, 0, 0, 0, 0xa9d4ff); break;
      case 'rugSmall': M.add(G.box, 0, .015, 0, 1.8, .03, .8, 0, 0, 0, 0x6fcf97); M.add(G.box, 0, .025, 0, 1.6, .03, .6, 0, 0, 0, 0xa6e6c0); break;
      case 'picSun': case 'picBoat': case 'picTree': {
        // hangs on a wall: the back of the frame is at z = −.5 (the wall side); centred 1.5 high
        M.add(G.box, 0, 1.5, -.46, .8, .64, .06, 0, 0, 0, woodD); M.add(G.box, 0, 1.5, -.42, .68, .52, .02, 0, 0, 0, 0xfff6e0);
        if(k === 'picSun'){ M.add(G.cyl, 0, 1.5, -.405, .14, .02, .14, Math.PI / 2, 0, 0, 0xffc23d); for(let i = 0; i < 8; i++){ const a = i / 8 * Math.PI * 2; M.add(G.box, Math.cos(a) * .2, 1.5 + Math.sin(a) * .2, -.405, .07, .02, .02, 0, 0, a, 0xffc23d); } }
        else if(k === 'picBoat'){ M.add(G.box, 0, 1.33, -.41, .68, .16, .01, 0, 0, 0, 0x7fc8ff); M.add(G.box, 0, 1.42, -.4, .34, .08, .01, 0, 0, 0, 0xc98a52); M.add(PRISM, .02, 1.46, -.4, .22, .26, .01, 0, 0, 0, 0xffffff); }
        else { M.add(G.box, 0, 1.31, -.41, .68, .14, .01, 0, 0, 0, 0x8bd66a); M.add(G.box, 0, 1.42, -.405, .05, .16, .01, 0, 0, 0, 0x9a6b3c); M.add(G.cyl, 0, 1.58, -.405, .16, .01, .16, Math.PI / 2, 0, 0, 0x4fae4a); }
        break; }
      case 'shelf': M.add(G.box, 0, .8, -.05, 1.8, 1.6, .5, 0, 0, 0, wood); for(const y of [.35, .85, 1.35]){ M.add(G.box, 0, y, .05, 1.6, .38, .38, 0, 0, 0, 0x7a4f2c);
          for(let i = 0; i < 6; i++){ const hh = .22 + ((i * 7 + y * 10) % 3) * .03; M.add(G.box, -.6 + i * .2 + (y > 1 ? .1 : 0), y - .17 + hh / 2, .08, .14, hh, .28, 0, 0, i === 5 ? .2 : 0, [0x3f8ef0, 0xff8a7e, 0x5ed6a0][(i + (y * 2 | 0)) % 3]); } } break;
      case 'toybox': M.add(G.box, 0, .22, 0, .7, .44, .6, 0, 0, 0, 0x4fb8a8); M.add(G.box, 0, .46, -.2, .74, .06, .3, -.5, 0, 0, 0x3f9c8e); M.add(G.sm, -.12, .5, .05, .13, .13, .13, 0, 0, 0, 0xffc83a); M.add(G.box, .15, .5, 0, .16, .16, .16, 0, .4, 0, 0xff6f9c); break;
      case 'wardrobe': M.add(G.box, 0, 1, 0, 1.8, 2, .7, 0, 0, 0, 0xe6c7a0); M.add(G.box, 0, 1, .36, .03, 1.8, .02, 0, 0, 0, 0xb8936a); for(const s of [-1, 1]) M.add(G.cyl8, s * .12, 1.05, .38, .03, .2, .03, 0, 0, 0, 0x8a6a4a); M.add(G.box, 0, 2.03, 0, 1.9, .08, .76, 0, 0, 0, 0xd2b088); break;
      case 'piano': M.add(G.box, 0, .65, -.1, 1.7, 1.3, .5, 0, 0, 0, 0x2b2b38); M.add(G.box, 0, .78, .25, 1.6, .1, .3, 0, 0, 0, 0x2b2b38); M.add(G.box, 0, .84, .27, 1.5, .03, .24, 0, 0, 0, 0xffffff);
        for(let i = 0; i < 10; i++) M.add(G.box, -.66 + i * .15, .865, .22, .06, .02, .13, 0, 0, 0, 0x2b2b38); M.add(G.box, 0, .3, .2, 1.5, .08, .25, 0, 0, 0, 0x2b2b38); break;
      case 'bath': M.add(G.box, 0, .3, 0, 1.8, .55, .8, 0, 0, 0, 0xf6f7ff); M.add(G.box, 0, .56, 0, 1.6, .03, .6, 0, 0, 0, 0x9fdcff); for(let i = 0; i < 6; i++) M.add(G.sm, -.5 + i * .2, .6, Math.sin(i * 1.7) * .18, .1, .07, .1, 0, 0, 0, 0xffffff);
        M.add(G.sm, .55, .65, .1, .09, .07, .07, 0, 0, 0, 0xffd23f); break;
    }
    return (FGEO[k] = M.geometry());
  }
  function buildFurn(k){ const m = new THREE.Mesh(furnGeo(k), MAT); m.castShadow = !FURN[k].rug; m.receiveShadow = true; m.userData.k = k; return m; }

  /* ======================================================================
     Vehicles. seats: { x, y, z, pose:'sit'|'stand'|'bike' } — y is the hip height.
     wheels spin around x. Each vehicle has one main colour.
     ====================================================================== */
  const VEH = {
    car:      { e:'🚗', name:L('سيارة', 'Car', 'Araba'), speed:13, acc:9, turn:2.1, r:1.3, len:3.3 },
    scooter:  { e:'🛵', name:L('موتور', 'Scooter', 'Scooter'), speed:11, acc:9, turn:2.6, r:.8, len:1.8 },
    bicycle:  { e:'🚲', name:L('بسكليت', 'Bicycle', 'Bisiklet'), speed:8, acc:7, turn:2.8, r:.7, len:1.7 },
    bus:      { e:'🚌', name:L('باص', 'Bus', 'Otobüs'), speed:10, acc:6.5, turn:1.4, r:2, len:7 },
    icecream: { e:'🍦', name:L('سيارة البوظة', 'Ice-cream truck', 'Dondurma arabası'), speed:10, acc:7.5, turn:1.7, r:1.6, len:4.6, unlock:'icecream' },
    firetruck:{ e:'🚒', name:L('سيارة الإطفاء', 'Fire truck', 'İtfaiye aracı'), speed:11, acc:7, turn:1.5, r:1.8, len:6, unlock:'firefighter' },
    boat:     { e:'🚤', name:L('شختورة', 'Boat', 'Tekne'), speed:10, acc:5, turn:1.6, r:1.6, len:4.4, water:true, unlock:'pier' }
  };
  const VEH_IDS = Object.keys(VEH);
  function vehicleGeo(k){
    const M = new Merge(), wheels = [];
    let seats = [], extra = {};
    const wheel = (x, y, z, r, w) => { wheels.push([x, y, z, r, w]); };
    switch(k){
      case 'car': {
        const C = 0xff5a5f, D = 0xd9474c;
        M.add(G.box, 0, .5, 0, 1.7, .5, 3.2, 0, 0, 0, C); M.add(G.box, 0, .72, 1.25, 1.6, .2, .7, -.12, 0, 0, C); M.add(G.box, 0, .74, -1.35, 1.6, .22, .5, .1, 0, 0, C);
        M.add(G.box, 0, .28, 0, 1.76, .14, 3.26, 0, 0, 0, D);
        for(const s of [-1, 1]){ M.add(G.box, s * .82, .85, -.1, .08, .22, 2.1, 0, 0, 0, C); M.add(G.sph, s * .55, .55, 1.61, .14, .11, .04, 0, 0, 0, 0xfff6c8); M.add(G.box, s * .6, .58, -1.61, .22, .1, .03, 0, 0, 0, 0xff2a3a); }
        M.add(G.box, 0, 1.08, .78, 1.5, .5, .06, -.35, 0, 0, 0xbfe8ff); M.add(G.box, 0, .62, .1, 1.5, .1, 1.1, 0, 0, 0, 0x4a3a3a); M.add(G.box, 0, .62, -.85, 1.5, .1, .9, 0, 0, 0, 0x4a3a3a);
        M.add(G.box, 0, .85, .25, 1.45, .45, .1, -.15, 0, 0, 0xffe0c0); M.add(G.box, 0, .85, -.45, 1.45, .45, .1, -.15, 0, 0, 0xffe0c0);
        M.add(G.cyl8, -.4, .88, .55, .03, .25, .03, -.8, 0, 0, 0x333333); M.add(RING, -.4, .98, .48, .15, .15, .15, -.9, 0, 0, 0x333333);
        for(const [x, z] of [[-.82, 1.05], [.82, 1.05], [-.82, -1.05], [.82, -1.05]]) wheel(x, .32, z, .32, .26);
        seats = [{ x:-.4, y:.62, z:.05, pose:'sit' }, { x:.4, y:.62, z:.05, pose:'sit' }, { x:-.4, y:.62, z:-.85, pose:'sit' }, { x:.4, y:.62, z:-.85, pose:'sit' }];
        break; }
      case 'scooter': {
        const C = 0x5ed6a0;
        M.add(G.box, 0, .32, 0, .45, .14, 1.2, 0, 0, 0, C); M.add(G.sph, 0, .55, -.35, .32, .28, .5, 0, 0, 0, C); M.add(G.box, 0, .78, -.35, .34, .1, .7, 0, 0, 0, 0x3a3a46);
        M.add(G.box, 0, .7, .55, .4, .7, .16, -.25, 0, 0, C); M.add(G.cyl8, 0, 1.1, .64, .04, .4, .04, -.25, 0, 0, 0x777788); M.add(G.box, 0, 1.28, .7, .8, .06, .06, 0, 0, 0, 0x555566);
        M.add(G.sph, 0, 1.1, .78, .1, .1, .06, 0, 0, 0, 0xfff6c8); M.add(G.sph, 0, .38, .62, .3, .14, .3, 0, 0, 0, C);
        wheel(0, .22, .62, .22, .14); wheel(0, .22, -.55, .22, .14);
        seats = [{ x:0, y:.82, z:-.15, pose:'sit' }, { x:0, y:.82, z:-.6, pose:'sit' }];
        break; }
      case 'bicycle': {
        const C = 0x3f8ef0;
        M.add(G.cyl8, 0, .55, 0, .035, 1.05, .035, Math.PI / 2 - .25, 0, 0, C); M.add(G.cyl8, 0, .45, -.25, .035, .7, .035, -.35, 0, 0, C); M.add(G.cyl8, 0, .55, .55, .035, .8, .035, -.3, 0, 0, C);
        M.add(G.box, 0, .86, -.4, .2, .06, .3, 0, 0, 0, 0x3a3a46); M.add(G.box, 0, 1.0, .68, .6, .04, .04, 0, 0, 0, 0x555566); M.add(G.box, 0, .5, .2, .06, .06, .3, 0, 0, 0, 0x555566);
        M.add(G.box, 0, .75, .82, .22, .16, .16, 0, 0, 0, 0xc98a52);
        wheel(0, .33, .65, .33, .06); wheel(0, .33, -.6, .33, .06);
        seats = [{ x:0, y:.92, z:-.42, pose:'bike' }];
        break; }
      case 'bus': {
        const C = 0xffc23d, D = 0xe8a92a;
        M.add(G.box, 0, .75, 0, 2.3, .9, 7, 0, 0, 0, C); M.add(G.box, 0, .32, 0, 2.36, .14, 7.06, 0, 0, 0, D);
        for(const [x, z] of [[-1.1, 3.4], [1.1, 3.4], [-1.1, -3.4], [1.1, -3.4], [-1.1, 0], [1.1, 0]]) M.add(G.cyl8, x, 2.0, z, .06, 1.6, .06, 0, 0, 0, 0xffffff);
        M.add(G.box, 0, 2.85, 0, 2.5, .12, 7.3, 0, 0, 0, C); M.add(G.box, 0, 2.97, 0, 2.2, .12, 6.8, 0, 0, 0, 0xffffff);
        M.add(G.box, 0, 1.7, 3.5, 2.1, .9, .06, -.1, 0, 0, 0xbfe8ff); for(const s of [-1, 1]) M.add(G.sph, s * .8, .7, 3.51, .15, .12, .04, 0, 0, 0, 0xfff6c8);
        for(const z of [2.4, .8, -.8, -2.4]){ for(const s of [-1, 1]){ M.add(G.box, s * .55, 1.25, z, .8, .12, .7, 0, 0, 0, 0x3f8ef0); M.add(G.box, s * .55, 1.55, z - .35, .8, .55, .1, 0, 0, 0, 0x3f8ef0); } }
        M.add(G.cyl8, -.55, 1.45, 3.0, .03, .3, .03, -.8, 0, 0, 0x333333); M.add(RING, -.55, 1.55, 2.95, .2, .2, .2, -.9, 0, 0, 0x333333);
        for(const [x, z] of [[-1.1, 2.4], [1.1, 2.4], [-1.1, -2.4], [1.1, -2.4]]) wheel(x, .42, z, .42, .3);
        seats = [{ x:-.55, y:1.3, z:2.4, pose:'sit' }, { x:.55, y:1.3, z:.8, pose:'sit' }, { x:-.55, y:1.3, z:-.8, pose:'sit' }, { x:.55, y:1.3, z:-2.4, pose:'sit' }];
        break; }
      case 'icecream': {
        const C = 0xffb3c7, Wt = 0xffffff;
        M.add(G.box, 0, .55, 1.45, 1.8, .6, 1.6, 0, 0, 0, C); M.add(G.box, 0, .3, 0, 1.86, .14, 4.4, 0, 0, 0, 0xe68aa4);
        M.add(G.box, 0, 1.35, -.75, 1.9, 2, 2.9, 0, 0, 0, Wt); M.add(G.box, .96, 1.5, -.75, .04, .8, 1.8, 0, 0, 0, 0x9a6b4a); M.add(G.box, 1.05, 1.08, -.75, .3, .06, 1.9, 0, 0, 0, C);
        M.add(G.box, 0, 2.4, -.75, 2, .12, 3, 0, 0, 0, C);
        M.add(G.cone, 0, 3.0, -.75, .35, .9, .35, Math.PI, 0, 0, 0xf2c27a); M.add(G.sph, 0, 3.55, -.75, .42, .38, .42, 0, 0, 0, 0xff9fc0); M.add(G.sph, 0, 3.9, -.75, .3, .28, .3, 0, 0, 0, 0xfff1d6);
        M.add(G.box, 0, 1.15, 2.1, 1.6, .5, .06, -.3, 0, 0, 0xbfe8ff); M.add(G.box, 0, .85, .55, 1.7, .5, .1, 0, 0, 0, Wt);
        for(const s of [-1, 1]) M.add(G.sph, s * .6, .6, 2.26, .13, .1, .04, 0, 0, 0, 0xfff6c8);
        M.add(G.cyl8, -.4, .95, 1.55, .03, .25, .03, -.8, 0, 0, 0x333333); M.add(RING, -.4, 1.05, 1.48, .15, .15, .15, -.9, 0, 0, 0x333333);
        for(const [x, z] of [[-.9, 1.4], [.9, 1.4], [-.9, -1.4], [.9, -1.4]]) wheel(x, .36, z, .36, .26);
        seats = [{ x:-.4, y:.75, z:1.2, pose:'sit' }, { x:.4, y:.75, z:1.2, pose:'sit' }];
        break; }
      case 'firetruck': {
        const C = 0xe8394a, D = 0xc22a3a;
        M.add(G.box, 0, .65, 0, 2.1, .8, 6, 0, 0, 0, C); M.add(G.box, 0, .3, 0, 2.16, .14, 6.06, 0, 0, 0, D);
        M.add(G.box, 0, 1.35, 2.3, 2.0, .7, .1, -.15, 0, 0, 0xbfe8ff); M.add(G.box, 0, 1.75, 1.8, 2.1, .08, 1.2, 0, 0, 0, C);
        for(const s of [-1, 1]) M.add(G.cyl8, s * .98, 1.4, 1.3, .05, 1, .05, 0, 0, 0, 0xdddddd);
        M.add(G.box, 0, 1.35, -1.1, 2, 1.2, 3.6, 0, 0, 0, C); for(const s of [-1, 1]) for(let i = 0; i < 3; i++) M.add(G.box, s * 1.01, 1.3, -2.3 + i * 1.2, .02, .9, 1, 0, 0, 0, D);
        for(const s of [-1, 1]) M.add(G.box, s * .4, 2.05, -1.1, .08, .08, 4.2, 0, 0, 0, 0xeeeeee); for(let i = 0; i < 9; i++) M.add(G.box, 0, 2.05, -3 + i * .48, .8, .06, .06, 0, 0, 0, 0xeeeeee);
        M.add(G.cyl, 0, 1.0, -3.05, .3, .2, .3, Math.PI / 2, 0, 0, 0xc0c0c8); M.add(G.cyl8, .65, 2.15, -2.9, .08, .5, .08, Math.PI / 2, 0, 0, 0xffd23f);
        for(const s of [-1, 1]) M.add(G.sph, s * .75, .62, 3.01, .14, .11, .04, 0, 0, 0, 0xfff6c8);
        M.add(G.cyl8, -.45, 1.0, 1.85, .03, .25, .03, -.8, 0, 0, 0x333333); M.add(RING, -.45, 1.1, 1.78, .16, .16, .16, -.9, 0, 0, 0x333333);
        for(const [x, z] of [[-1, 2], [1, 2], [-1, -2], [1, -2]]) wheel(x, .42, z, .42, .3);
        seats = [{ x:-.45, y:1.05, z:1.4, pose:'sit' }, { x:.45, y:1.05, z:1.4, pose:'sit' }, { x:0, y:1.05, z:.6, pose:'sit' }];
        extra = { siren:[[-.6, 1.86, 1.8], [.6, 1.86, 1.8]], nozzle:[.65, 2.15, -3.2] };
        break; }
      case 'boat': {
        const C = 0xffffff, B = 0x3a8fd8;
        M.add(G.box, 0, .25, -.2, 1.8, .55, 3.4, 0, 0, 0, C); M.add(G.cone4, 0, .25, 1.85, .9 * 1.41, .9, .28 * 1.41, Math.PI / 2, Math.PI / 4, 0, C);
        M.add(G.box, 0, .02, 0, 1.6, .2, 3.6, 0, 0, 0, B); M.add(G.box, 0, .5, -.2, 1.84, .08, 3.44, 0, 0, 0, B);
        M.add(G.box, 0, .85, .8, 1.4, .5, .06, -.4, 0, 0, 0xbfe8ff); M.add(G.box, 0, .36, -.4, 1.5, .1, 2.6, 0, 0, 0, 0xd8b88a);
        M.add(G.cyl8, -.4, .7, .5, .03, .25, .03, -.8, 0, 0, 0x333333); M.add(RING, -.4, .8, .43, .15, .15, .15, -.9, 0, 0, 0x333333);
        M.add(G.box, 0, .5, -1.95, .3, .5, .3, 0, 0, 0, 0x555566);
        seats = [{ x:-.4, y:.5, z:.15, pose:'sit' }, { x:.4, y:.5, z:.15, pose:'sit' }, { x:-.4, y:.5, z:-.9, pose:'sit' }, { x:.4, y:.5, z:-.9, pose:'sit' }];
        break; }
      case 'plane': {
        const C = 0xff9f43, D = 0xe8892e;
        M.add(G.cyl, 0, 1.1, 0, .7, 5, .7, Math.PI / 2, 0, 0, C); M.add(G.cone, 0, 1.1, 2.9, .7, .8, .7, Math.PI / 2, 0, 0, C); M.add(G.cone, 0, 1.15, -3.2, .7, 1.4, .5, -Math.PI / 2, 0, 0, C);
        M.add(G.box, 0, 1.0, .6, 7.5, .12, 1.4, 0, 0, 0, D); M.add(G.box, 0, 1.3, -3.4, 2.6, .1, .8, 0, 0, 0, D); M.add(G.box, 0, 1.8, -3.5, .1, 1.1, .8, 0, 0, 0, D);
        M.add(G.cyl, 0, 1.1, 3.35, .18, .2, .18, Math.PI / 2, 0, 0, 0x555566);
        M.add(G.box, 0, 1.75, 1.6, 1.1, .45, .06, -.5, 0, 0, 0xbfe8ff); M.add(G.box, 0, 1.55, -.1, 1.1, .1, 3, 0, 0, 0, 0x4a3a3a);
        for(const s of [-1, 1]){ M.add(G.cyl8, s * .7, .45, 1.2, .04, .7, .04, 0, 0, s * .3, 0x666677); }
        M.add(G.cyl8, 0, .45, -2.8, .04, .7, .04, 0, 0, 0, 0x666677);
        for(const [x, z] of [[-.9, 1.2], [.9, 1.2], [0, -2.8]]) wheel(x, .25, z, .25, .16);
        seats = [{ x:0, y:1.55, z:1.0, pose:'sit' }, { x:0, y:1.55, z:.1, pose:'sit' }, { x:0, y:1.55, z:-.8, pose:'sit' }, { x:0, y:1.55, z:-1.6, pose:'sit' }];
        extra = { prop:[0, 1.1, 3.5] };
        break; }
    }
    return { body:M.geometry(), wheels, seats, extra };
  }
  const VCACHE = {};
  function buildVehicle(k){
    const def = VCACHE[k] || (VCACHE[k] = vehicleGeo(k));
    const grp = new THREE.Group(), body = new THREE.Mesh(def.body, MAT); body.castShadow = true; body.receiveShadow = true; grp.add(body);
    const wheels = def.wheels.map(([x, y, z, r, w]) => {
      const M = new Merge(); M.add(WHEEL, 0, 0, 0, w, r, r, 0, 0, 0, 0x2f2f3a); M.add(WHEEL, Math.sign(x || 1) * .01, 0, 0, w + .02, r * .5, r * .5, 0, 0, 0, 0xe8e8f0);
      M.add(G.box, 0, 0, 0, w + .03, r * 1.2, r * .18, 0, 0, 0, 0x9a9aa8);
      const m = new THREE.Mesh(M.geometry(), MAT); m.position.set(x, y, z); m.castShadow = true; grp.add(m); return m;
    });
    const out = { k, grp, wheels, seats:def.seats, extra:def.extra };
    if(def.extra.siren){ out.siren = def.extra.siren.map(p => { const s = new THREE.Mesh(G.sm, new THREE.MeshBasicMaterial({ color:0xff3a4a })); s.scale.set(.16, .12, .16); s.position.set(p[0], p[1], p[2]); grp.add(s); return s; }); }
    if(def.extra.prop){ const M = new Merge(); M.add(G.box, 0, 0, 0, .14, 1.6, .06, 0, 0, 0, 0x444455); const p = new THREE.Mesh(M.geometry(), MAT); p.position.set(...def.extra.prop); grp.add(p); out.prop = p; }
    return out;
  }
  /* closed little cars for the gentle town traffic: a tinted body and the untinted details (instanced) */
  function trafficGeo(){
    const B = new Merge(), D = new Merge();
    B.add(G.box, 0, .5, 0, 1.6, .5, 3, 0, 0, 0, 0xffffff); B.add(G.box, 0, 1.02, -.15, 1.4, .55, 1.7, 0, 0, 0, 0xffffff); B.add(G.box, 0, .74, 1.2, 1.5, .1, .55, -.1, 0, 0, 0xffffff);
    D.add(G.box, 0, 1.02, -.15, 1.43, .4, 1.5, 0, 0, 0, 0xbfe8ff); D.add(G.box, 0, .28, 0, 1.66, .14, 3.06, 0, 0, 0, 0x55555f);
    for(const s of [-1, 1]){ D.add(G.sph, s * .55, .55, 1.51, .14, .11, .04, 0, 0, 0, 0xfff6c8); D.add(G.box, s * .55, .58, -1.51, .22, .1, .03, 0, 0, 0, 0xff2a3a); }
    for(const [x, z] of [[-.78, .95], [.78, .95], [-.78, -.95], [.78, -.95]]) D.add(WHEEL, x, .3, z, .24, .3, .3, 0, 0, 0, 0x2f2f3a);
    return { body:B.geometry(), detail:D.geometry() };
  }

  /* ======================================================================
     Roles: an outfit (hat on the head, a vest on the body) and a prop in the hand
     ====================================================================== */
  const ROLES = {
    doctor:     { e:'🩺', col:'#7fd0ff', name:L('دكتور', 'Doctor', 'Doktor') },
    firefighter:{ e:'🧑‍🚒', col:'#ff8a7e', name:L('إطفائي', 'Firefighter', 'İtfaiyeci') },
    chef:       { e:'👨‍🍳', col:'#ffe0a8', name:L('طبّاخ', 'Chef', 'Aşçı') },
    teacher:    { e:'📚', col:'#a6e6c0', name:L('أستاذ', 'Teacher', 'Öğretmen') },
    builder:    { e:'👷', col:'#ffd23f', name:L('عامل بناء', 'Builder', 'İnşaatçı') },
    icecream:   { e:'🍦', col:'#ffc4d6', name:L('بيّاع بوظة', 'Ice-cream seller', 'Dondurmacı') },
    pilot:      { e:'✈️', col:'#c4b5ff', name:L('طيّار', 'Pilot', 'Pilot') }
  };
  const ROLE_IDS = Object.keys(ROLES);
  /* hat in head space (head centre 0, radius about .33), vest in body space, prop in hand space (hand at 0) */
  function outfitGeo(role){
    const H = new Merge(), V = new Merge(), P = new Merge();
    switch(role){
      case 'doctor':
        H.add(G.torus, 0, .12, 0, .34, .34, .25, Math.PI / 2 - .25, 0, 0, 0xdddddd); H.add(G.cyl, 0, .22, .3, .09, .02, .09, Math.PI / 2 - .3, 0, 0, 0xe8f4ff);
        V.add(G.cyl, 0, .56, 0, .235, .36, .205, 0, 0, 0, 0xffffff); V.add(G.box, 0, .6, .2, .05, .3, .02, 0, 0, 0, 0xe6e6e6);
        V.add(G.torus, 0, .72, .06, .12, .12, .25, 1.3, 0, 0, 0x3a6fb0); V.add(G.cyl8, .06, .6, .2, .015, .2, .015, 0, 0, 0, 0x3a6fb0); V.add(G.cyl, .06, .49, .21, .045, .02, .045, Math.PI / 2, 0, 0, 0xc0c0c8);
        P.add(G.box, 0, -.08, .02, .22, .16, .1, 0, 0, 0, 0xffffff); P.add(G.box, 0, -.08, .075, .06, .1, .01, 0, 0, 0, 0xff5d8f); P.add(G.box, 0, -.08, .075, .1, .04, .01, 0, 0, 0, 0xff5d8f); break;
      case 'firefighter':
        H.add(G.hemi, 0, .14, 0, .38, .32, .4, 0, 0, 0, 0xe8394a); H.add(G.cyl, 0, .13, -.05, .44, .03, .5, 0, 0, 0, 0xe8394a); H.add(G.box, 0, .3, .33, .12, .14, .04, -.2, 0, 0, 0xffd23f);
        V.add(G.cyl, 0, .56, 0, .235, .36, .205, 0, 0, 0, 0x3a3a46); V.add(G.box, 0, .5, .2, .4, .04, .02, 0, 0, 0, 0xffd23f); V.add(G.box, 0, .64, .2, .4, .04, .02, 0, 0, 0, 0xffd23f);
        P.add(G.cyl8, 0, -.05, .1, .05, .3, .05, Math.PI / 2, 0, 0, 0xc0c0c8); P.add(G.cone, 0, -.05, .3, .07, .12, .07, Math.PI / 2, 0, 0, 0xffd23f); break;
      case 'chef':
        H.add(G.cyl, 0, .32, 0, .24, .22, .24, 0, 0, 0, 0xffffff); for(let i = 0; i < 5; i++){ const a = i / 5 * Math.PI * 2; H.add(G.sph, Math.cos(a) * .15, .5, Math.sin(a) * .15, .16, .14, .16, 0, 0, 0, 0xffffff); } H.add(G.sph, 0, .54, 0, .18, .14, .18, 0, 0, 0, 0xffffff);
        V.add(G.box, 0, .5, .17, .34, .38, .06, 0, 0, 0, 0xffffff); V.add(G.torus, 0, .7, 0, .2, .2, .12, Math.PI / 2, 0, 0, 0xffffff); V.add(G.sm, 0, .64, .21, .03, .03, .02, 0, 0, 0, 0xff8a7e);
        P.add(G.cyl8, 0, -.04, .12, .02, .3, .02, Math.PI / 2 - .5, 0, 0, 0xc98a52); P.add(G.sph, 0, .06, .28, .07, .03, .08, 0, 0, 0, 0xc98a52); break;
      case 'teacher':
        H.add(G.torus, 0, .02, .3, .07, .07, .12, 0, 0, 0, 0x5a3a2a); H.add(G.torus, .1, .02, .3, .07, .07, .12, 0, 0, 0, 0x5a3a2a);
        V.add(G.cyl, 0, .56, 0, .235, .36, .205, 0, 0, 0, 0x5cb87a); V.add(G.box, 0, .58, .2, .1, .34, .02, 0, 0, 0, 0xffffff);
        P.add(G.box, 0, -.06, .06, .2, .26, .06, .2, 0, 0, 0x3f8ef0); P.add(G.box, .005, -.06, .06, .18, .24, .065, .2, 0, 0, 0xffffff); break;
      case 'builder':
        H.add(G.hemi, 0, .15, 0, .36, .3, .38, 0, 0, 0, 0xffd23f); H.add(G.cyl, 0, .15, .06, .4, .03, .46, 0, 0, 0, 0xffd23f); H.add(G.box, 0, .38, 0, .06, .06, .5, 0, 0, 0, 0xf2c21a);
        V.add(G.cyl, 0, .56, 0, .235, .36, .205, 0, 0, 0, 0xff9a3d); V.add(G.box, 0, .55, .2, .4, .05, .02, 0, 0, 0, 0xffffff);
        P.add(G.cyl8, 0, -.05, .1, .025, .3, .025, Math.PI / 2, 0, 0, 0xc98a52); P.add(G.box, 0, -.05, .26, .16, .07, .07, 0, 0, 0, 0x777788); break;
      case 'icecream':
        H.add(G.box, 0, .3, 0, .5, .14, .26, 0, 0, 0, 0xffffff); H.add(G.box, 0, .25, 0, .52, .05, .28, 0, 0, 0, 0xff8fb1);
        V.add(G.box, 0, .5, .17, .34, .38, .06, 0, 0, 0, 0xff8fb1); V.add(G.torus, 0, .7, 0, .2, .2, .12, Math.PI / 2, 0, 0, 0xff8fb1);
        P.add(G.cone, 0, -.02, .08, .07, .2, .07, Math.PI, 0, 0, 0xf2c27a); P.add(G.sph, 0, .1, .08, .08, .07, .08, 0, 0, 0, 0xffb3c7); break;
      case 'pilot':
        H.add(G.cyl, 0, .3, 0, .3, .14, .3, 0, 0, 0, 0x2b3a7a); H.add(G.cyl, 0, .38, .02, .34, .03, .36, 0, 0, 0, 0x2b3a7a); H.add(G.box, 0, .25, .3, .3, .03, .14, .2, 0, 0, 0x1a1a2a); H.add(G.sm, 0, .32, .3, .05, .05, .02, 0, 0, 0, 0xffd23f);
        V.add(G.cyl, 0, .56, 0, .235, .36, .205, 0, 0, 0, 0x8a5a3a); V.add(G.torus, 0, .72, 0, .19, .19, .25, Math.PI / 2, 0, 0, 0xfff1d6);
        P.add(G.box, 0, -.06, .05, .18, .2, .1, 0, 0, 0, 0x6a4a3a); break;
    }
    return { hat:H.empty ? null : H.geometry(), vest:V.empty ? null : V.geometry(), prop:P.empty ? null : P.geometry() };
  }
  const OCACHE = {};
  const outfit = r => OCACHE[r] || (OCACHE[r] = outfitGeo(r));

  /* ======================================================================
     Things you hold (from the shop counters, fishing, the ice-cream seller)
     ====================================================================== */
  const ITEMS = {
    bread:   { e:'🥖', name:L('خبز', 'Bread', 'Ekmek'), eat:true },
    cake:    { e:'🧁', name:L('كاب كيك', 'Cupcake', 'Kek'), eat:true },
    balloon: { e:'🎈', name:L('بالون', 'Balloon', 'Balon') },
    icecream:{ e:'🍦', name:L('بوظة', 'Ice cream', 'Dondurma'), eat:true },
    apple:   { e:'🍎', name:L('تفاحة', 'Apple', 'Elma'), eat:true },
    juice:   { e:'🧃', name:L('عصير', 'Juice', 'Meyve suyu'), eat:true },
    book:    { e:'📖', name:L('كتاب', 'Book', 'Kitap') },
    fish:    { e:'🐟', name:L('سمكة', 'Fish', 'Balık') }
  };
  const BALLOON_COLS = [0xff5d73, 0x3f8ef0, 0xffc23d, 0x5ed6a0, 0xb99cff, 0xff9f43];
  function itemGeo(k, col){
    const M = new Merge();
    switch(k){
      case 'bread': M.add(G.sph, 0, 0, .12, .07, .07, .26, 0, 0, 0, 0xe0a050); for(let i = 0; i < 3; i++) M.add(G.box, 0, .055, .02 + i * .1, .08, .015, .03, 0, .5, 0, 0xf6d89a); break;
      case 'cake': M.add(G.cyl, 0, -.02, .08, .08, .1, .08, 0, 0, 0, 0x8fd8ff); M.add(G.sph, 0, .06, .08, .09, .07, .09, 0, 0, 0, 0xffe0ec); M.add(G.sm, 0, .13, .08, .025, .025, .025, 0, 0, 0, 0xff5d73); break;
      case 'icecream': M.add(G.cone, 0, -.02, .08, .07, .2, .07, Math.PI, 0, 0, 0xf2c27a); M.add(G.sph, 0, .1, .08, .085, .075, .085, 0, 0, 0, col || 0xffb3c7); M.add(G.sph, 0, .19, .08, .065, .06, .065, 0, 0, 0, 0xfff1d6); break;
      case 'apple': M.add(G.sph, 0, 0, .08, .09, .085, .09, 0, 0, 0, 0xff4d5e); M.add(G.cyl8, 0, .1, .08, .01, .05, .01, 0, 0, 0, 0x6a4a2a); M.add(G.sph, .03, .11, .08, .03, .01, .02, 0, 0, .5, 0x4fae4a); break;
      case 'juice': M.add(G.box, 0, 0, .08, .11, .17, .07, 0, 0, 0, 0xffa23d); M.add(G.box, 0, 0, .116, .08, .08, .01, 0, 0, 0, 0xffffff); M.add(G.cyl8, .03, .12, .08, .008, .1, .008, 0, 0, .2, 0xffffff); break;
      case 'book': M.add(G.box, 0, -.02, .08, .2, .26, .05, .2, 0, 0, 0x5ed6a0); M.add(G.box, .005, -.02, .08, .18, .24, .055, .2, 0, 0, 0xffffff); break;
      case 'fish': M.add(G.sph, 0, 0, .1, .05, .08, .17, 0, 0, 0, 0xffa94d); M.add(G.cone4, 0, 0, -.1, .08, .1, .02, -Math.PI / 2, 0, 0, 0xff8a3d); M.add(G.sm, .03, .03, .2, .015, .015, .01, 0, 0, 0, 0x222222); break;
      case 'balloon': break;
    }
    return M.empty ? null : M.geometry();
  }
  const ICACHE = {};
  function buildItem(k, col){
    if(k === 'balloon'){
      const g = new THREE.Group(), M = new Merge(); const c = col != null ? col : BALLOON_COLS[0];
      M.add(G.sph, 0, 0, 0, .3, .36, .3, 0, 0, 0, c); M.add(G.cone, 0, -.38, 0, .06, .08, .06, Math.PI, 0, 0, c); M.add(G.sm, -.1, .12, .2, .06, .09, .03, 0, 0, 0, 0xffffff);
      const b = new THREE.Mesh(M.geometry(), MAT); b.castShadow = true; b.position.y = 1.1; g.add(b);
      const s = new THREE.Mesh(new THREE.CylinderGeometry(.006, .006, 1, 4), new THREE.MeshBasicMaterial({ color:0xffffff })); s.position.y = .5; g.add(s);
      g.userData.balloon = b; return g;
    }
    const key = k + (col || ''); const geo = ICACHE[key] || (ICACHE[key] = itemGeo(k, col));
    const m = new THREE.Mesh(geo, MAT); m.castShadow = true; return m;
  }

  /* ======================================================================
     Pets that follow you: low-poly dogs and cats
     ====================================================================== */
  const PETS = {
    dog:  { e:'🐶', kind:'dog', col:0xc98a52, light:0xf6e3c6, name:L('كلب بني', 'Brown dog', 'Kahverengi köpek') },
    pup:  { e:'🐕', kind:'dog', col:0xf4f1ea, light:0xffffff, spot:0x4a3a3a, name:L('كلب أبيض', 'White dog', 'Beyaz köpek') },
    cat:  { e:'🐱', kind:'cat', col:0xf2983a, light:0xffd9a8, name:L('بسّة برتقالية', 'Orange cat', 'Turuncu kedi') },
    kitty:{ e:'🐈', kind:'cat', col:0x9da0aa, light:0xe8e9ee, name:L('بسّة رمادية', 'Grey cat', 'Gri kedi') }
  };
  const PET_IDS = Object.keys(PETS);
  function buildPet(id){
    const S = PETS[id] || PETS.dog, dog = S.kind === 'dog';
    const grp = new THREE.Group(), body = new THREE.Group(); grp.add(body);
    const B = new Merge();
    B.add(G.sph, 0, .38, 0, .2, .18, .32, 0, 0, 0, S.col); B.add(G.sph, 0, .34, .08, .14, .12, .2, 0, 0, 0, S.light);
    if(S.spot) B.add(G.sph, .1, .44, -.08, .1, .08, .12, 0, 0, 0, S.spot);
    if(dog) B.add(G.torus, 0, .5, .24, .11, .11, .3, Math.PI / 2 - .4, 0, 0, 0xff5d73);
    body.add(mesh(B));
    const head = new THREE.Group(); head.position.set(0, .58, .28); body.add(head);
    const H = new Merge();
    H.add(G.sph, 0, 0, 0, .19, .17, .18, 0, 0, 0, S.col); H.add(G.sph, 0, -.05, .14, dog ? .1 : .08, dog ? .08 : .065, dog ? .1 : .07, 0, 0, 0, S.light);
    H.add(G.sm, 0, -.01, dog ? .23 : .2, .035, .03, .03, 0, 0, 0, dog ? 0x2a1a1a : 0xff8fa8);
    for(const s of [-1, 1]){
      H.add(G.sm, s * .075, .04, .155, .03, .035, .02, 0, 0, 0, 0x1a1418); H.add(G.sm, s * .065, .055, .17, .01, .01, .006, 0, 0, 0, 0xffffff);
      if(dog) H.add(G.sph, s * .16, .02, -.01, .05, .13, .08, 0, 0, s * .3, S.spot || 0x8a5a32);
      else { H.add(G.cone4, s * .1, .17, -.01, .07, .12, .05, 0, 0, -s * .25, S.col); H.add(G.cone4, s * .1, .16, .01, .04, .08, .02, 0, 0, -s * .25, 0xffa7b8); }
    }
    head.add(mesh(H));
    const legs = [[-.1, .14], [.1, .14], [-.1, -.16], [.1, -.16]].map(([x, z]) => { const p = new THREE.Group(); p.position.set(x, .26, z); const Lg = new Merge(); Lg.add(G.cyl8, 0, -.12, 0, .045, .24, .045, 0, 0, 0, S.col); Lg.add(G.sm, 0, -.24, .02, .055, .04, .065, 0, 0, 0, S.light); p.add(mesh(Lg)); body.add(p); return p; });
    const tail = new THREE.Group(); tail.position.set(0, .45, -.3); body.add(tail);
    const T = new Merge(); if(dog) T.add(G.cyl8, 0, .1, -.04, .035, .24, .035, -.6, 0, 0, S.col); else { T.add(G.cyl8, 0, .14, -.06, .03, .34, .03, -.35, 0, 0, S.col); T.add(G.sm, 0, .3, -.12, .04, .04, .04, 0, 0, 0, S.light); }
    tail.add(mesh(T));
    return { id, grp, body, head, legs, tail, dog };
  }
  function posePet(M, t, move, happy){
    M.legs.forEach((l, i) => { l.rotation.x = Math.sin(t * 14 + (i === 0 || i === 3 ? 0 : Math.PI)) * .7 * move; });
    M.body.position.y = Math.abs(Math.sin(t * 14)) * .03 * move + (happy ? Math.abs(Math.sin(t * 9)) * .12 : 0);
    M.tail.rotation.z = Math.sin(t * (M.dog ? (happy ? 22 : 9) : 3)) * (M.dog ? .6 : .3);
    M.head.rotation.x = Math.sin(t * 2) * .06; M.head.rotation.z = happy ? Math.sin(t * 8) * .2 : Math.sin(t * 1.3) * .05;
  }

  /* ======================================================================
     Townsfolk: simple friendly walkers (not the owner's characters)
     ====================================================================== */
  const SHIRTS = [0x6cc4ff, 0xff8fb1, 0x5ed6a0, 0xffc23d, 0xb99cff, 0xff9f43, 0x7fd0c8, 0xf28b82];
  const HAIRS = [0x4a2f1d, 0x2a1a12, 0xc98a52, 0x1a1418, 0x8a5a32, 0xe8c785];
  const SKINS = [0xf7cfae, 0xe8b48a, 0xc98e66, 0xf2d6c0, 0xa86f4c];
  function buildFolk(i){
    const grp = new THREE.Group(), body = new THREE.Group(); grp.add(body);
    const M = new Merge(), shirt = SHIRTS[i % SHIRTS.length], skin = SKINS[i % SKINS.length], hair = HAIRS[(i * 3) % HAIRS.length];
    M.add(G.cyl, 0, .66, 0, .2, .42, .17, 0, 0, 0, shirt); M.add(G.sph, 0, .86, 0, .2, .1, .17, 0, 0, 0, shirt);
    M.add(G.sph, 0, 1.12, 0, .2, .2, .19, 0, 0, 0, skin); M.add(G.hemi, 0, 1.15, -.02, .215, .2, .21, -.3, 0, 0, hair);
    for(const s of [-1, 1]){ M.add(G.sm, s * .07, 1.13, .17, .025, .03, .02, 0, 0, 0, 0x1a1418); M.add(G.sm, s * .12, 1.06, .15, .035, .02, .01, 0, 0, 0, 0xffa3a3); }
    M.add(G.box, 0, 1.05, .185, .07, .015, .01, 0, 0, 0, 0x9a4a3a);
    if(i % 3 === 1) M.add(G.cyl, 0, 1.33, 0, .22, .06, .22, 0, 0, 0, SHIRTS[(i + 3) % SHIRTS.length]);
    body.add(mesh(M));
    const legs = [-1, 1].map(s => { const p = new THREE.Group(); p.position.set(s * .08, .45, 0); const Lg = new Merge(); Lg.add(G.box, 0, -.2, 0, .1, .4, .11, 0, 0, 0, 0x4a5a7a); Lg.add(G.sm, 0, -.42, .03, .07, .04, .1, 0, 0, 0, 0x3a3a46); p.add(mesh(Lg)); body.add(p); return p; });
    const arms = [-1, 1].map(s => { const p = new THREE.Group(); p.position.set(s * .23, .82, 0); const A = new Merge(); A.add(G.box, 0, -.15, 0, .08, .3, .09, 0, 0, 0, shirt); A.add(G.sm, 0, -.32, 0, .05, .05, .05, 0, 0, 0, skin); p.add(mesh(A)); body.add(p); return p; });
    return { grp, body, legs, arms };
  }
  function poseFolk(F, t, move){
    F.legs.forEach((l, i) => { l.rotation.x = Math.sin(t * 9 + i * Math.PI) * .6 * move; });
    F.arms.forEach((a, i) => { a.rotation.x = -Math.sin(t * 9 + i * Math.PI) * .5 * move; });
    F.body.position.y = Math.abs(Math.sin(t * 9)) * .04 * move;
  }

  return { MAT, GLASS, PRISM, mesh, FURN, FURN_IDS, FCATS, buildFurn, furnGeo, VEH, VEH_IDS, buildVehicle, trafficGeo,
    ROLES, ROLE_IDS, outfit, ITEMS, BALLOON_COLS, buildItem, PETS, PET_IDS, buildPet, posePet, buildFolk, poseFolk };
}
