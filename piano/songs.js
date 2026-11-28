/* «بيانو بوبو» songs: public-domain classics, traditional children's tunes and a few original Bobo tunes.
   Melody format (one token per note, separated by spaces; '|' is only for reading):
     C4  = one tick        E5:3 = three ticks        F#4 / Bb3 = sharps / flats        - or -:2 = a rest
     C4+E4 = a chord (on «صعب» songs each note becomes its own tile; on the others only the top note is a tile)
   One tick = one tile row; `tempo` = ticks per minute (= rows per minute at the base speed).
   Notes of `hold` ticks or more become long «hold» tiles; shorter ones are a single tile followed by an empty gap.
   Accompaniment: `ch` lists one chord per `cb` ticks (e.g. 'C G Am F'); without it the chords are picked from the melody
   (`key` = tonic + 'm' for minor). lvl: 0 سهل / 1 عادي / 2 صعب. by = composer (classical pieces only). */
(function(){
'use strict';
const SONGS = [
  { id:'bobo', em:'💜', lvl:0, tempo:112, key:'C', cb:4, mine:1,
    t:['أغنية بوبو', "Bobo's Song", "Bobo'nun Şarkısı"],
    mel:'C4 E4 G4 E4 F4:2 A4:2 | G4 E4 C4 E4 D4:4 | C4 E4 G4 C5 B4:2 G4:2 | A4 F4 D4 B3 C4:4 |' +
        'E4 G4 A4 G4 E4 G4 C5:2 | B4 A4 G4 E4 D4:4 | C4 E4 G4 C5 B4:2 G4:2 | A4 B4 C5 D5 C5:4' },
  { id:'twinkle', em:'⭐', lvl:0, tempo:110, key:'C', cb:2,
    t:['لمعي يا نجمة', 'Twinkle Little Star', 'Parla Küçük Yıldız'],
    mel:'C4 C4 G4 G4 A4 A4 G4:2 | F4 F4 E4 E4 D4 D4 C4:2 | G4 G4 F4 F4 E4 E4 D4:2 | G4 G4 F4 F4 E4 E4 D4:2 |' +
        'C4 C4 G4 G4 A4 A4 G4:2 | F4 F4 E4 E4 D4 D4 C4:2',
    ch:'C C F C F C G C C F C G C F C G C C F C F C G C' },
  { id:'mary', em:'🐑', lvl:0, tempo:120, key:'C', cb:4,
    t:['ماري وخروفها الصغير', "Mary's Little Lamb", "Mary'nin Kuzusu"],
    mel:'E4 D4 C4 D4 | E4 E4 E4:2 | D4 D4 D4:2 | E4 G4 G4:2 | E4 D4 C4 D4 | E4 E4 E4 E4 | D4 D4 E4 D4 | C4:4',
    ch:'C C G C C C G C' },
  { id:'frere', em:'🔔', lvl:0, tempo:150, key:'C', cb:8, hold:3,
    t:['الأخ جاك', 'Brother John', 'Jak Kardeş'],
    mel:'C4:2 D4:2 E4:2 C4:2 | C4:2 D4:2 E4:2 C4:2 | E4:2 F4:2 G4:4 | E4:2 F4:2 G4:4 |' +
        'G4 A4 G4 F4 E4:2 C4:2 | G4 A4 G4 F4 E4:2 C4:2 | C4:2 G3:2 C4:4 | C4:2 G3:2 C4:4',
    ch:'C C C C C C C C' },
  { id:'row', em:'🚣', lvl:0, tempo:138, key:'C', cb:6, hold:3,
    t:['جدّف جدّف بالقارب', 'Row Your Boat', 'Kayığını Kürekle'],
    mel:'C4:3 C4:3 | C4:2 D4 E4:3 | E4:2 D4 E4:2 F4 | G4:6 | C5 C5 C5 G4 G4 G4 | E4 E4 E4 C4 C4 C4 | G4:2 F4 E4:2 D4 | C4:6',
    ch:'C C C C C C G C' },
  { id:'london', em:'🌉', lvl:0, tempo:150, key:'C', cb:8, hold:3,
    t:['جسر لندن', 'London Bridge', 'Londra Köprüsü'],
    mel:'G4:3 A4 G4:2 F4:2 | E4:2 F4:2 G4:4 | D4:2 E4:2 F4:4 | E4:2 F4:2 G4:4 |' +
        'G4:3 A4 G4:2 F4:2 | E4:2 F4:2 G4:4 | D4:4 G4:4 | E4:2 C4:6',
    ch:'C C G C C C G C' },
  { id:'farm', em:'🐄', lvl:0, tempo:132, key:'G', cb:2,
    t:['مزرعة العم ماكدونالد', "Old MacDonald's Farm", "MacDonald Amca'nın Çiftliği"],
    mel:'G4 G4 G4 D4 | E4 E4 D4:2 | B4 B4 A4 A4 | G4:4 | G4 G4 G4 D4 | E4 E4 D4:2 | B4 B4 A4 A4 | G4:4 |' +
        'G4 G4 G4:2 | G4 G4 G4:2 | G4 G4 G4 G4 | G4 G4 G4:2 | G4 G4 G4 D4 | E4 E4 D4:2 | B4 B4 A4 A4 | G4:4',
    ch:'G G C G G D G G G G C G G D G G G G G G G G G G G G C G G D G G' },
  { id:'bday', em:'🎂', lvl:0, tempo:140, key:'C', cb:6, hold:3,
    t:['سنة حلوة يا جميل', 'Happy Birthday', 'İyi ki Doğdun'],
    mel:'G4 G4 A4:2 G4:2 C5:2 B4:4 | G4 G4 A4:2 G4:2 D5:2 C5:4 | G4 G4 G5:2 E5:2 C5:2 B4:2 A4:2 | F5 F5 E5:2 C5:2 D5:2 C5:4',
    ch:'C G G C C F G C' },
  { id:'lullaby', em:'🌙', lvl:0, tempo:120, key:'C', cb:4, hold:3, by:['برامز', 'Brahms', 'Brahms'],
    t:['تهويدة النوم', 'Lullaby', 'Ninni'],
    mel:'E4 E4 G4:4 | E4 E4 G4:4 | E4 G4 C5:2 B4:2 A4:2 G4:2 | D4 E4 F4:2 D4:2 | D4 E4 F4:4 | D4 F4 B4:2 A4:2 G4:2 B4:2 C5:4 |' +
        'C4 C4 C5:4 A4 F4 G4:4 | E4 C4 F4:2 G4:2 A4:2 G4:4 | C4 C4 C5:4 A4 F4 G4:4 | E4 C4 F4 E4 D4 C4:4' },
  { id:'icecream', em:'🍦', lvl:1, tempo:184, key:'C', cb:8, hold:4, mine:1,
    t:['سيارة البوظة', 'Ice-Cream Truck', 'Dondurma Arabası'],
    mel:'G4 C5 E5 C5 D5:2 B4:2 | A4 C5 F5 C5 E5:4 | F5 E5 D5 C5 B4 C5 D5 G4 | C5 E5 G5 E5 C5:4 |' +
        'A4 B4 C5 A4 G4:2 E4:2 | F4 A4 C5 F5 E5:4 | D5 C5 B4 A4 G4 A4 B4 D5 | C5:2 G4:2 C5:4',
    ch:'C F G C F F G C' },
  { id:'jingle', em:'🛷', lvl:1, tempo:200, key:'C', cb:8, hold:3,
    t:['أجراس العيد', 'Jingle Bells', 'Çan Sesleri'],
    mel:'E4:2 E4:2 E4:4 | E4:2 E4:2 E4:4 | E4:2 G4:2 C4:3 D4 | E4:8 | F4:2 F4:2 F4:3 F4 | F4:2 E4:2 E4:2 E4 E4 | E4:2 D4:2 D4:2 E4:2 | D4:4 G4:4 |' +
        'E4:2 E4:2 E4:4 | E4:2 E4:2 E4:4 | E4:2 G4:2 C4:3 D4 | E4:8 | F4:2 F4:2 F4:3 F4 | F4:2 E4:2 E4:2 E4 E4 | G4:2 G4:2 F4:2 D4:2 | C4:8',
    ch:'C C C C F C G G C C C C F C G C' },
  { id:'ode', em:'🎶', lvl:1, tempo:200, key:'C', cb:8, hold:3, by:['بيتهوفن', 'Beethoven', 'Beethoven'],
    t:['نشيد الفرح', 'Ode to Joy', 'Neşeye Övgü'],
    mel:'E4:2 E4:2 F4:2 G4:2 | G4:2 F4:2 E4:2 D4:2 | C4:2 C4:2 D4:2 E4:2 | E4:3 D4 D4:4 |' +
        'E4:2 E4:2 F4:2 G4:2 | G4:2 F4:2 E4:2 D4:2 | C4:2 C4:2 D4:2 E4:2 | D4:3 C4 C4:4 |' +
        'D4:2 D4:2 E4:2 C4:2 | D4:2 E4 F4 E4:2 C4:2 | D4:2 E4 F4 E4:2 D4:2 | C4:2 D4:2 G3:4 |' +
        'E4:2 E4:2 F4:2 G4:2 | G4:2 F4:2 E4:2 D4:2 | C4:2 C4:2 D4:2 E4:2 | D4:3 C4 C4:4',
    ch:'C C C G C C G C G C G C C C G C' },
  { id:'capy', em:'🦫', lvl:1, tempo:200, key:'G', cb:8, hold:4, mine:1,
    t:['رقصة الكابيبارا', 'Capybara Dance', 'Kapibara Dansı'],
    mel:'G4 B4 D5 B4 G4:2 D4:2 | E4 G4 B4 G4 E4:2 B3:2 | C4 E4 G4 E4 A4:2 F#4:2 | G4:2 B4:2 D5:4 |' +
        'D5 C5 B4 A4 B4:2 G4:2 | C5 B4 A4 G4 A4:2 D4:2 | E4 F#4 G4 A4 B4 C5 D5 E5 | D5:2 B4:2 G4:4 |' +
        'G4 B4 D5 B4 G4:2 D4:2 | E4 G4 B4 G4 E4:2 B3:2 | C4 E4 G4 E4 A4:2 F#4:2 | G4:2 B4:2 D5:4',
    ch:'G Em C D G C D G G Em C D' },
  { id:'minuet', em:'💃', lvl:1, tempo:200, key:'G', cb:6, hold:4, by:['بيتسولد', 'Petzold', 'Petzold'],
    t:['مينويت', 'Minuet in G', 'Sol Majör Minuet'],
    mel:'D5:2 G4 A4 B4 C5 | D5:2 G4:2 G4:2 | E5:2 C5 D5 E5 F#5 | G5:2 G4:2 G4:2 | C5:2 D5 C5 B4 A4 | B4:2 C5 B4 A4 G4 | F#4:2 G4 A4 B4 G4 | A4:6 |' +
        'D5:2 G4 A4 B4 C5 | D5:2 G4:2 G4:2 | E5:2 C5 D5 E5 F#5 | G5:2 G4:2 G4:2 | C5:2 D5 C5 B4 A4 | B4:2 C5 B4 A4 G4 | A4:2 B4 A4 G4 F#4 | G4:6',
    ch:'G G C G C G D D G G C G C G D G' },
  { id:'canon', em:'🎻', lvl:1, tempo:190, key:'D', cb:4, hold:3, by:['باخيلبل', 'Pachelbel', 'Pachelbel'],
    t:['كانون', 'Canon in D', 'Re Majör Kanon'],
    mel:'F#5:4 E5:4 D5:4 C#5:4 B4:4 A4:4 B4:4 C#5:4 | D5:4 C#5:4 B4:4 A4:4 G4:4 F#4:4 G4:4 E4:4 |' +
        'D4 F#4 A4 G4 F#4 D4 F#4 E4 | D4 B3 D4 A4 G4 B4 A4 G4 | F#4 D4 E4 C#5 D5 F#5 A5 A4 | B4 G4 A4 F#4 D4 D5 D5:2',
    ch:'D A Bm F#m G D G A D A Bm F#m G D G A D A Bm F#m G D G A' },
  { id:'elise', em:'🌸', lvl:1, tempo:210, key:'Am', cb:6, hold:3, by:['بيتهوفن', 'Beethoven', 'Beethoven'],
    t:['لأجل إليزا', 'Für Elise', 'Für Elise'],
    mel:'E5 D#5 E5 D#5 E5 B4 D5 C5 A4:3 C4 E4 A4 B4:3 E4 G#4 B4 C5:3 E4 |' +
        'E5 D#5 E5 D#5 E5 B4 D5 C5 A4:3 C4 E4 A4 B4:3 E4 C5 B4 A4:6',
    ch:'- - Am E Am - - - Am E Am' },
  { id:'cancan', em:'🎪', lvl:2, tempo:240, key:'C', cb:8, hold:3, by:['أوفنباخ', 'Offenbach', 'Offenbach'],
    t:['رقصة الكان كان', 'Can-Can', 'Kankan'],
    mel:'C4:2 D4 F4 E4 D4 G4:2 | G4:2 G4 A4 E4 F4 D4:2 | D4:2 D4 F4 E4 D4 C4 C5 | B4 A4 G4 F4 E4 D4 C4 D4 |' +
        'C4:2 D4 F4 E4 D4 G4:2 | G4:2 G4 A4 E4 F4 D4:2 | D4:2 D4 F4 E4 D4 C4 G4 | D4 E4 C4:2 C4+C5:4',
    ch:'C G G C C G G C' },
  { id:'mountain', em:'⛰️', lvl:2, tempo:228, key:'Am', cb:8, hold:3, by:['غريغ', 'Grieg', 'Grieg'],
    t:['في قصر ملك الجبل', 'Hall of the Mountain King', 'Dağ Kralının Salonunda'],
    mel:'A3 B3 C4 D4 E4 C4 E4:2 | D#4 B3 D#4:2 D4 A#3 D4:2 | A3 B3 C4 D4 E4 C4 E4 A4 | G4 E4 C4 E4 G4:4 |' +
        'E4 F#4 G#4 A4 B4 G#4 B4:2 | C5 G#4 C5:2 B4 G#4 B4:2 | E4 F#4 G#4 A4 B4 G#4 B4:2 | C5 G#4 C5:2 B4:4 |' +
        'A3 B3 C4 D4 E4 C4 E4:2 | D#4 B3 D#4:2 D4 A#3 D4:2 | A3 B3 C4 D4 E4 C4 E4 A4 | G4 E4 C4 E4 A3+A4:4',
    ch:'Am B7 Am Am E E E E Am B7 Am Am' },
  { id:'tell', em:'🐎', lvl:2, tempo:270, key:'C', cb:8, hold:4, by:['روسيني', 'Rossini', 'Rossini'],
    t:['سباق الأحصنة', 'William Tell Gallop', 'Wilhelm Tell Dörtnala'],
    mel:'G4 G4 G4:2 G4 G4 G4:2 | G4 G4 C5:2 D5:2 E5:2 | G4 G4 G4:2 G4 G4 G4:2 | G4 G4 D5:2 B4:2 G4:2 |' +
        'G4 G4 G4:2 G4 G4 G4:2 | G4 G4 C5:2 D5:2 E5:2 | C5 C5 C5:2 C5 C5 C5:2 | C5 C5 F5:2 G5:2 A5:2 |' +
        'G5 G5 F5 F5 E5 E5 D5 D5 | C5:2 E5:2 D5:2 B4:2 | C5:2 G4:2 E4:2 G4:2 | C4+C5:4 -:4',
    ch:'C C C G C C F F C G C C' },
  { id:'stars', em:'🚀', lvl:2, tempo:256, key:'Am', cb:8, hold:4, mine:1,
    t:['نجوم الفضاء', 'Space Stars', 'Uzay Yıldızları'],
    mel:'A4 C5 E5 C5 A4 C5 E5 A5 | G4 B4 D5 B4 G4 B4 D5 G5 | F4 A4 C5 A4 F4 A4 C5 F5 | E4 G#4 B4 D5 E5:4 |' +
        'A4 C5 E5 C5 A5 G5 E5 C5 | D5 F5 A5 F5 D5 C5 B4 A4 | B4 D5 F5 D5 E5 D5 C5 B4 | A4:4 E5:2 A4+A5:2',
    ch:'Am G F E Am Dm E Am' },
  { id:'turkish', em:'🥁', lvl:2, tempo:280, key:'Am', cb:8, hold:4, by:['موتسارت', 'Mozart', 'Mozart'],
    t:['المارش التركي', 'Turkish March', 'Türk Marşı'],
    mel:'B4 A4 G#4 A4 C5:4 | D5 C5 B4 C5 E5:4 | F5 E5 D#5 E5 B5 A5 G#5 A5 | B5 A5 G#5 A5 C6:4 | A5:2 C6:2 B5:2 A5:2 | G5:2 A5:2 B5:2 A5:2 | G5:2 A5:2 B5:2 A5:2 | G5:2 F#5:2 E5:4 |' +
        'B4 A4 G#4 A4 C5:4 | D5 C5 B4 C5 E5:4 | F5 E5 D#5 E5 B5 A5 G#5 A5 | B5 A5 G#5 A5 C6:4 | A5:2 C6:2 B5:2 A5:2 | G5:2 A5:2 B5:2 A5:2 | G5:2 A5:2 B5:2 G#5:2 | A4+A5:8',
    ch:'Am C E Am Am C E Em Am C E Am Am C E Am' }
];

/* ---------- parsing ---------- */
const PC = { C:0, D:2, E:4, F:5, G:7, A:9, B:11 };
function midiOf(n){
  const m = /^([A-G])(#|b)?(-?\d)$/.exec(n); if(!m) throw new Error('bad note ' + n);
  return 12 * (+m[3] + 1) + PC[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
}
/* → { ev:[{ t, d, n:[midi…] }], len } (times in ticks) */
function parse(str){
  const ev = []; let t = 0;
  for(const tok of String(str).split(/[\s|]+/)){
    if(!tok) continue;
    const [head, dd] = tok.split(':'), d = dd ? +dd : 1;
    if(!(d > 0)) throw new Error('bad duration ' + tok);
    if(head !== '-') ev.push({ t, d, n:head.split('+').map(midiOf).sort((a, b) => b - a) });
    t += d;
  }
  return { ev, len:t };
}
const ROOTS = { C:0, 'C#':1, Db:1, D:2, 'D#':3, Eb:3, E:4, F:5, 'F#':6, Gb:6, G:7, 'G#':8, Ab:8, A:9, 'A#':10, Bb:10, B:11 };
/* chord name → pitch classes (root first): C, Am, F#m, B7 */
function chordPcs(name){
  const m = /^([A-G][#b]?)(m)?(7)?$/.exec(name); if(!m) return null;
  const r = ROOTS[m[1]], third = m[2] ? 3 : 4, out = [r, (r + third) % 12, (r + 7) % 12];
  if(m[3]) out.push((r + 10) % 12);
  return out;
}
/* chords picked from the melody: for every `cb` ticks, the diatonic triad that covers the most melody time */
function autoChords(song, mel){
  const minor = /m$/.test(song.key), tonic = ROOTS[song.key.replace(/m$/, '')];
  const deg = minor ? [[0, 'm', 0.3], [7, '', 0.2], [5, 'm', 0.12], [8, '', 0.08], [3, '', 0.05]] : [[0, '', 0.3], [7, '', 0.2], [5, '', 0.15], [9, 'm', 0.05], [2, 'm', 0.02]];
  const names = Object.keys(ROOTS).filter(k => k.length === 1 || k[1] === '#');
  const nameOf = pc => names.find(k => ROOTS[k] === pc);
  const cands = deg.map(([o, q, bias]) => { const nm = nameOf((tonic + o) % 12) + q; return { nm, pcs:chordPcs(nm), bias }; });
  const out = [], cb = song.cb || 4;
  for(let s = 0; s < mel.len; s += cb){
    let best = cands[0], bs = -1;
    for(const c of cands){
      let sc = c.bias;
      for(const e of mel.ev){
        const a = Math.max(s, e.t), b = Math.min(s + cb, e.t + e.d); if(b <= a) continue;
        if(c.pcs.includes(e.n[0] % 12)) sc += (b - a) * (e.t === s ? 1.5 : 1);
      }
      if(sc > bs){ bs = sc; best = c; }
    }
    out.push(best.nm);
  }
  return out;
}
/* accompaniment events (ticks): bass on the chord's first tick, a soft chord in the middle of it */
function accomp(song, mel){
  const list = song.ch ? song.ch.split(/\s+/).filter(Boolean) : autoChords(song, mel);
  const cb = song.cb || 4, ev = [];
  let prev = null;
  for(let i = 0; i * cb < mel.len; i++){
    let nm = list[i % list.length]; if(nm === '-') nm = prev; if(!nm) continue; prev = nm;
    const pcs = chordPcs(nm); if(!pcs) continue;
    const bass = 40 + ((pcs[0] - 4 + 12) % 12);                    // E2..D#3
    ev.push({ t:i * cb, n:[bass], v:0.55, d:Math.min(cb, 4) });
    const mid = pcs.slice(0, 3).map(pc => 55 + ((pc - 7 + 12) % 12)); // G3..F#4
    if(cb >= 2) ev.push({ t:i * cb + cb / 2, n:mid, v:0.28, d:Math.max(1, cb / 2) });
    else ev.push({ t:i * cb, n:mid, v:0.22, d:1 });
  }
  return ev;
}
function build(song){
  if(song._b) return song._b;
  const mel = parse(song.mel);
  return (song._b = { mel, acc:accomp(song, mel), hold:song.hold || 2 });
}
window.PianoSongs = { list:SONGS, parse, build, midiOf, chordPcs, autoChords };
})();
