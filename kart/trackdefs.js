/* Bobo Kart («سباق بوبو 🏎️») — the four tracks as plain data (no three.js here, so tools can read it too).
   pts: the centre line, a closed loop in driving order [x, z, y]; the first point is the start/finish line.
   w: road width. sc: an optional narrow shortcut (open line from the main road back to the main road).
   water: channels of water [[x,z]… polyline, half width]; where the road crosses one there is a jump ramp and a gap.
   tunnels: [u0, u1] parts of the lap (0..1) under a cave/arch. boxes: item-box rows (u). pads: boost pads [u, side -1..1].
   stars: lines of shiny stars [u0, u1, side]. */
export const TRACKS = [
  {
    id:'beach', emoji:'🏖️', theme:'beach',
    name:['شط الغروب', 'Sunset Beach', 'Gün Batımı Plajı'],
    sub:['شط ونخل وسفينة قراصنة', 'Palms, cliffs and a pirate ship', 'Palmiyeler, kayalıklar ve korsan gemisi'],
    w:14,
    pts:[[-60, 62, 0], [-10, 65, 0], [40, 63, 0], [80, 50, 0], [102, 20, 0], [106, -14, 1.5], [92, -46, 3.5], [60, -66, 4], [24, -68, 4], [2, -50, 3],
         [-6, -22, 2], [-30, -4, 1], [-62, -12, .5], [-94, -6, 0], [-110, 18, 0], [-104, 46, 0], [-86, 60, 0]],
    sc:{ w:8, pts:[[2, -50, 3], [-14, -44, 2.4], [-32, -32, 1.6], [-48, -22, 1], [-62, -12, .5]] },
    water:[{ pts:[[-200, 30], [-120, 31], [-86, 28], [-70, 24]], hw:7 }],
    tunnels:[[.24, .33]],
    boxes:[.12, .45, .7, .9], pads:[[.06, 0], [.38, -.4], [.58, .4], [.8, 0]],
    stars:[[.02, .05, 0], [.16, .2, .45], [.5, .54, -.45], [.62, .66, 0], [.86, .89, .4]]
  },
  {
    id:'jungle', emoji:'🌴', theme:'jungle',
    name:['معبد الغابة', 'Jungle Temple', 'Orman Tapınağı'],
    sub:['أشجار كبيرة ومعبد قديم', 'Giant trees and an old temple', 'Dev ağaçlar ve eski bir tapınak'],
    w:14,
    pts:[[-50, 70, 0], [0, 74, 0], [50, 66, 0], [92, 48, 0], [112, 12, 0], [104, -26, 0], [76, -44, 0], [44, -36, 1], [18, -52, 2.5], [8, -84, 3], [-26, -98, 3],
         [-64, -86, 2], [-92, -56, 1], [-104, -18, 0], [-100, 22, 0], [-84, 54, 0]],
    sc:{ w:8, pts:[[8, -84, 3], [-14, -60, 4.2], [-40, -44, 4.2], [-70, -38, 2.2], [-104, -18, 0]] },
    water:[{ pts:[[140, -10], [118, -2], [96, 4], [80, 0], [60, -10], [30, 6], [0, 10]], hw:6 }],
    tunnels:[[.66, .73]],
    boxes:[.15, .42, .6, .88], pads:[[.07, 0], [.3, .4], [.55, -.4], [.78, 0]],
    stars:[[.03, .06, -.4], [.2, .24, .4], [.47, .5, 0], [.72, .75, 0], [.92, .95, -.3]]
  },
  {
    id:'snow', emoji:'🏔️', theme:'snow',
    name:['جبل الثلج', 'Snowy Mountain', 'Karlı Dağ'],
    sub:['ثلج وكهف جليد ورجال ثلج', 'Snow, an ice cave and snowmen', 'Kar, buz mağarası ve kardan adamlar'],
    w:14,
    pts:[[-70, 54, 0], [-16, 66, 0], [40, 60, 1], [84, 36, 2.5], [100, -4, 4], [84, -44, 6], [44, -62, 7], [6, -56, 6], [-14, -30, 5], [-6, 0, 4], [-30, 18, 3],
         [-64, 6, 2], [-88, -26, 1.5], [-114, -10, 1], [-112, 28, 0], [-96, 48, 0]],
    sc:{ w:8, pts:[[-6, 0, 4], [-34, -10, 3.2], [-60, -20, 2], [-88, -26, 1.5]] },
    water:[{ pts:[[60, 170], [62, 110], [64, 60], [58, 34]], hw:6 }],
    tunnels:[[.3, .42]],
    boxes:[.1, .36, .62, .86], pads:[[.05, 0], [.26, -.4], [.5, .4], [.76, 0]],
    stars:[[.02, .05, .4], [.17, .2, 0], [.45, .48, -.4], [.68, .71, .3], [.9, .93, 0]]
  },
  {
    id:'candy', emoji:'🍭', theme:'candy',
    name:['أرض الحلوى', 'Candy Land', 'Şeker Diyarı'],
    sub:['مصاصات وكب كيك ونهر صودا', 'Lollipops, cupcakes and a soda river', 'Lolipoplar, kekler ve gazoz nehri'],
    w:14,
    pts:[[-60, 60, 0], [-4, 68, 0], [52, 58, 0], [92, 30, 0], [98, -10, 0], [70, -34, 1], [36, -22, 2], [10, -40, 2.5], [24, -74, 2], [-10, -96, 1.5], [-52, -86, 1],
         [-70, -52, 1], [-50, -22, 1], [-74, 4, .5], [-104, 18, 0], [-96, 48, 0]],
    sc:{ w:8, pts:[[70, -34, 1], [62, -56, 1.6], [50, -72, 2], [24, -74, 2]] },
    water:[{ pts:[[-220, -40], [-130, -42], [-60, -38], [-28, -44]], hw:7 }],
    tunnels:[[.2, .28]],
    boxes:[.13, .4, .64, .88], pads:[[.06, 0], [.32, .4], [.56, -.4], [.8, 0]],
    stars:[[.02, .05, -.4], [.24, .27, 0], [.48, .51, .4], [.7, .73, -.3], [.92, .95, 0]]
  }
];
