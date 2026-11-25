/* «حديقة الحارة»: every sound is synthesised with WebAudio (no files): steps and hops, slide whoosh, swing creak,
   spring boing, seesaw thump, star and leaf chimes, pigeon coos and wing flaps, a cat's meow and purr, tag «got you!»,
   and the park ambience: a soft evening breeze, birds chirping at dusk (crickets at night), and far-away happy
   playground «wee!» glides, and the food sounds (fizz, pour, sizzle, popcorn, the café's door bell, sips and bites). A calm little tune plays softly. Mute is remembered on this phone. */
export function makeAudio(){
  const get = k => { try{ return localStorage.getItem(k); }catch(e){ return null; } };
  const set = (k, v) => { try{ localStorage.setItem(k, v); }catch(e){} };
  let ctx = null, master = null, musicBus = null, sfxBus = null, ambBus = null, noiseBuf = null;
  let muted = get('hara_muted') === '1';
  function ac(){
    if(!ctx){
      try{ ctx = new (window.AudioContext || window.webkitAudioContext)(); }catch(e){ ctx = null; return null; }
      master = ctx.createGain(); master.gain.value = muted ? 0 : 1; master.connect(ctx.destination);
      musicBus = ctx.createGain(); musicBus.gain.value = .18; musicBus.connect(master);
      sfxBus = ctx.createGain(); sfxBus.gain.value = 1; sfxBus.connect(master);
      ambBus = ctx.createGain(); ambBus.gain.value = .5; ambBus.connect(master);
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate); const d = noiseBuf.getChannelData(0); for(let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    if(ctx.state === 'suspended') ctx.resume().catch(() => {});
    return ctx;
  }
  function env(g, t0, a, peak, dur){ g.gain.setValueAtTime(.0001, t0); g.gain.exponentialRampToValueAtTime(Math.max(.0002, peak), t0 + a); g.gain.exponentialRampToValueAtTime(.0001, t0 + dur); }
  function tone(f, dur, type = 'sine', vol = .12, delay = 0, toF = 0, bus){
    const a = ac(); if(!a || muted) return;
    const t0 = a.currentTime + Math.max(0, delay), o = a.createOscillator(), g = a.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t0); if(toF) o.frequency.exponentialRampToValueAtTime(toF, t0 + dur);
    env(g, t0, Math.min(.02, dur * .3), vol, dur); o.connect(g).connect(bus || sfxBus); o.start(t0); o.stop(t0 + dur + .05);
  }
  function noise(dur, vol, freq, q = 1, type = 'bandpass', delay = 0, toFreq = 0, bus){
    const a = ac(); if(!a || muted) return;
    const t0 = a.currentTime + delay, s = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain();
    s.buffer = noiseBuf; s.loop = true; f.type = type; f.frequency.setValueAtTime(freq, t0); if(toFreq) f.frequency.exponentialRampToValueAtTime(toFreq, t0 + dur); f.Q.value = q;
    env(g, t0, Math.min(.08, dur * .3), vol, dur); s.connect(f).connect(g).connect(bus || sfxBus); s.start(t0, Math.random()); s.stop(t0 + dur + .05);
  }
  const SFX = {
    tap(){ tone(560, .06, 'triangle', .08); },
    jump(){ tone(280, .16, 'sine', .11, 0, 560); },
    land(){ noise(.08, .06, 420, 1, 'lowpass'); },
    step(){ noise(.05, .025, 900, 1.2, 'bandpass'); },
    star(){ [784, 988, 1318, 1568].forEach((f, i) => tone(f, .22, 'triangle', .09, i * .07)); tone(2093, .5, 'sine', .04, .3); },
    leaf(){ noise(.12, .05, 3000, 2, 'bandpass', 0, 1500); tone(1320, .12, 'sine', .05, .02, 1760); },
    whoosh(){ noise(1.0, .12, 500, .9, 'bandpass', 0, 2400); tone(500, .7, 'sine', .03, .1, 900); [523, 659, 784].forEach((f, i) => tone(f, .14, 'triangle', .05, .15 + i * .08)); },
    plop(){ noise(.12, .1, 300, 1, 'lowpass'); tone(180, .15, 'sine', .08, 0, 90); },
    creak(k = 1){ const a = ac(); if(!a || muted) return; tone(260 + Math.random() * 40, .22, 'sawtooth', .012 * k, 0, 180 + Math.random() * 30); noise(.18, .02 * k, 1400, 6, 'bandpass'); },
    pump(){ tone(330, .12, 'sine', .06, 0, 520); },
    boing(){ tone(160, .45, 'sine', .14, 0, 520); tone(320, .35, 'triangle', .04, .03, 900); },
    thump(){ tone(120, .2, 'sine', .14, 0, 60); noise(.1, .06, 300, 1, 'lowpass'); },
    sit(){ tone(392, .1, 'triangle', .06); tone(330, .14, 'triangle', .05, .08); },
    coo(){ for(let i = 0; i < 2; i++) tone(310 - i * 20, .28, 'sine', .07, i * .3, 260 - i * 20); },
    flap(){ for(let i = 0; i < 6; i++) noise(.05, .06, 1800, 1, 'bandpass', i * .06); },
    seeds(){ for(let i = 0; i < 5; i++) noise(.03, .05, 4000, 2, 'highpass', i * .05); },
    meow(){ tone(620, .45, 'triangle', .07, 0, 900); tone(900, .3, 'sine', .04, .25, 520); },
    purr(){ const a = ac(); if(!a || muted) return; const t0 = a.currentTime, o = a.createOscillator(), lfo = a.createOscillator(), lg = a.createGain(), g = a.createGain(); o.type = 'sawtooth'; o.frequency.value = 55; lfo.frequency.value = 24; lg.gain.value = .03; lfo.connect(lg).connect(g.gain); g.gain.value = .03; const f = a.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 300; o.connect(f).connect(g).connect(sfxBus); o.start(t0); lfo.start(t0); g.gain.setTargetAtTime(0, t0 + 1.2, .2); o.stop(t0 + 2); lfo.stop(t0 + 2); },
    tag(){ [659, 880, 1046, 1318].forEach((f, i) => tone(f, .14, 'square', .045, i * .06)); },
    found(){ [523, 784, 1046].forEach((f, i) => tone(f, .2, 'triangle', .09, i * .08)); },
    win(){ [523, 659, 784, 1046, 0, 784, 1046, 1318].forEach((f, i) => f && tone(f, .24, 'triangle', .11, i * .11)); },
    tick(){ tone(1200, .04, 'square', .03); },
    nope(){ tone(260, .12, 'triangle', .08, 0, 200); },
    rustle(){ noise(.35, .07, 2200, .8, 'bandpass', 0, 900); },
    spin(){ for(let i = 0; i < 6; i++) tone(500 + i * 80, .05, 'triangle', .04, i * .05); },
    bell(){ [1318, 1976].forEach((f, i) => tone(f, .9 - i * .3, 'sine', .06)); },
    check(){ [659, 880, 1046].forEach((f, i) => tone(f, .2, 'triangle', .09, i * .1)); },
    /* food: a light jingle at the counter, coins, fizz, pour, sizzle, popcorn, the door bell, sips and bites, «yum» */
    jingle(){ [784, 988, 1175, 1568].forEach((f, i) => tone(f, .16, 'triangle', .06, i * .07)); tone(2349, .4, 'sine', .025, .3); },
    coin(){ tone(1318, .08, 'square', .03); tone(1760, .2, 'triangle', .05, .07); },
    fizz(){ noise(.9, .07, 5200, .8, 'highpass', 0, 7000); for(let i = 0; i < 9; i++) tone(1800 + Math.random() * 2200, .03, 'sine', .02, .05 + Math.random() * .7); },
    pour(){ noise(.8, .08, 900, 2.5, 'bandpass', 0, 1800); tone(380, .7, 'sine', .025, 0, 760); },
    sizzle(){ noise(1.2, .07, 4200, .6, 'highpass', 0, 3000); for(let i = 0; i < 6; i++) noise(.04, .04, 2500, 3, 'bandpass', .1 + Math.random() * .9); },
    pop(){ for(let i = 0; i < 7; i++){ const d = Math.random() * .8; noise(.03, .07, 1400 + Math.random() * 800, 4, 'bandpass', d); tone(500 + Math.random() * 300, .03, 'sine', .03, d); } },
    doorbell(){ [1568, 2093].forEach((f, i) => tone(f, .7, 'sine', .05, i * .12)); tone(3136, .3, 'sine', .015, .05); },
    gulp(){ tone(220, .1, 'sine', .1, 0, 140); tone(260, .09, 'sine', .07, .14, 170); },
    munch(){ for(let i = 0; i < 3; i++) noise(.06, .07, 1200 + i * 200, 1.4, 'bandpass', i * .1); },
    yum(){ tone(392, .16, 'sine', .07, 0, 523); tone(523, .25, 'sine', .07, .15, 659); [1046, 1318].forEach((f, i) => tone(f, .12, 'triangle', .03, .3 + i * .06)); }
  };
  /* ambience: breeze + birds (day/dusk) or crickets (night) + far kids' «wee!» */
  let ambOn = false, ambT = null, night = .3;
  function ambStep(){
    if(!ambOn || !ctx || muted) return;
    const r = Math.random();
    noise(3.2, .012, 500, .5, 'lowpass', 0, 0, ambBus);
    if(night < .7){ if(r < .55){ const f = 2600 + Math.random() * 1400, n = 2 + (Math.random() * 4 | 0); for(let i = 0; i < n; i++) tone(f + Math.random() * 300, .07, 'sine', .03 * (1 - night), i * .11, f * 1.25, ambBus); } }
    else if(r < .7){ for(let i = 0; i < 3; i++) tone(4200, .04, 'square', .006, i * .09, 0, ambBus); }
    if(night < .8 && Math.random() < .22){ const f = 600 + Math.random() * 300; tone(f, .5, 'sine', .015, .4, f * 1.6, ambBus); }
  }
  function ambience(on, nightK){
    if(nightK != null) night = nightK;
    if(on && !ambOn){ if(!ac()) return; ambOn = true; ambT = setInterval(ambStep, 1500); }
    else if(!on && ambOn){ ambOn = false; clearInterval(ambT); ambT = null; }
  }
  /* a calm music-box tune */
  const MEL = [[72, 0, 76, 0, 79, 0, 76, 0], [77, 0, 76, 0, 74, 0, 0, 0], [71, 0, 74, 0, 77, 0, 74, 0], [76, 0, 74, 0, 72, 0, 0, 0]];
  const BASS = [[48, 55], [53, 48], [43, 50], [48, 43]];
  const mf = m => 440 * Math.pow(2, (m - 69) / 12);
  let musicOn = false, step = 0, nextT = 0, timer = null;
  function sched(){
    const a = ctx; if(!a || !musicOn) return;
    const e = 60 / 96 / 2;
    while(nextT < a.currentTime + .25){
      const bar = Math.floor(step / 8) % 4, s = step % 8, m = MEL[bar][s], d = nextT - a.currentTime;
      if(!muted){ if(m) tone(mf(m), .5, 'sine', .07, d, 0, musicBus); if(s % 4 === 0) tone(mf(BASS[bar][s / 4]), .8, 'triangle', .06, d, 0, musicBus); }
      nextT += e; step++;
    }
  }
  function music(on){
    if(on && !musicOn){ const a = ac(); if(!a) return; musicOn = true; nextT = a.currentTime + .1; timer = setInterval(sched, 90); }
    else if(!on && musicOn){ musicOn = false; clearInterval(timer); timer = null; }
  }
  function setMuted(v){ muted = v; set('hara_muted', v ? '1' : '0'); if(master) master.gain.value = v ? 0 : 1; }
  return { ac, SFX, music, ambience, get muted(){ return muted; }, setMuted };
}
