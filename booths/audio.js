/* «بسطات بوبو»: every sound is synthesised with WebAudio (no files): steps and hops, the booth bell when you take a booth,
   a sparkly «pling» for every heart or sticker, a little fanfare at 10 / 25 / 50 / 100 hearts, the golf cart's start, purr
   and horn, and the evening ambience (sea waves, the fountain, crickets). A happy little market tune plays softly.
   Mute is remembered on this phone. */
export function makeAudio(){
  const get = k => { try{ return localStorage.getItem(k); }catch(e){ return null; } };
  const set = (k, v) => { try{ localStorage.setItem(k, v); }catch(e){} };
  let ctx = null, master = null, musicBus = null, sfxBus = null, ambBus = null, noiseBuf = null;
  let muted = get('booths_muted') === '1';
  function ac(){
    if(!ctx){
      try{ ctx = new (window.AudioContext || window.webkitAudioContext)(); }catch(e){ ctx = null; return null; }
      master = ctx.createGain(); master.gain.value = muted ? 0 : 1; master.connect(ctx.destination);
      musicBus = ctx.createGain(); musicBus.gain.value = .16; musicBus.connect(master);
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
    nope(){ tone(260, .12, 'triangle', .08, 0, 200); },
    sit(){ tone(392, .1, 'triangle', .06); tone(330, .14, 'triangle', .05, .08); },
    bell(){ [1318, 1976].forEach((f, i) => tone(f, .9 - i * .3, 'sine', .06)); },
    boing(){ tone(160, .45, 'sine', .14, 0, 520); tone(320, .35, 'triangle', .04, .03, 900); },
    thump(){ tone(120, .2, 'sine', .14, 0, 60); noise(.1, .06, 300, 1, 'lowpass'); },
    spin(){ for(let i = 0; i < 6; i++) tone(500 + i * 80, .05, 'triangle', .04, i * .05); },
    found(){ [523, 784, 1046].forEach((f, i) => tone(f, .2, 'triangle', .09, i * .08)); },
    check(){ [659, 880, 1046].forEach((f, i) => tone(f, .2, 'triangle', .09, i * .1)); },
    /* the booth is mine: a shop bell and a happy run */
    claim(){ [1568, 2093].forEach((f, i) => tone(f, .7, 'sine', .05, i * .12)); [523, 659, 784, 1046].forEach((f, i) => tone(f, .16, 'triangle', .07, .2 + i * .07)); },
    /* a heart or a sticker: sparkly pling (the owner hears a brighter one) */
    gift(big){ [1046, 1318, 1568, 2093].forEach((f, i) => tone(f * (big ? 1 : .75), .2, 'triangle', big ? .08 : .05, i * .05)); tone(2637, .4, 'sine', big ? .04 : .02, .2); },
    /* 10 / 25 / 50 / 100 hearts: a short fanfare */
    cheer(){ [523, 659, 784, 1046, 0, 784, 1046, 1318, 1568].forEach((f, i) => f && tone(f, .24, 'triangle', .11, i * .1)); for(let i = 0; i < 10; i++) noise(.05, .05, 3000 + Math.random() * 3000, 3, 'bandpass', .3 + Math.random() * .8); },
    /* the golf cart: start, horn, a soft electric purr while driving */
    start(){ tone(160, .5, 'sawtooth', .03, 0, 420); tone(320, .3, 'sine', .05, .15, 520); },
    horn(){ tone(440, .18, 'square', .05); tone(554, .18, 'square', .04); tone(440, .22, 'square', .05, .25); tone(554, .22, 'square', .04, .25); },
    hum(k){ tone(120 + k * 160, .14, 'triangle', .012 + k * .012, 0, 130 + k * 170); }
  };
  /* ambience: sea waves + the fountain + crickets and a far gull */
  let ambOn = false, ambT = null;
  function ambStep(){
    if(!ambOn || !ctx || muted) return;
    noise(3.4, .02, 380, .4, 'lowpass', 0, 700, ambBus);
    noise(2.0, .012, 2600, .6, 'bandpass', 0, 0, ambBus);
    if(Math.random() < .6) for(let i = 0; i < 3; i++) tone(4200, .04, 'square', .005, i * .09, 0, ambBus);
    if(Math.random() < .08){ const f = 1300 + Math.random() * 200; tone(f, .25, 'sine', .012, .3, f * .7, ambBus); tone(f, .2, 'sine', .01, .6, f * .7, ambBus); }
  }
  function ambience(on){
    if(on && !ambOn){ if(!ac()) return; ambOn = true; ambT = setInterval(ambStep, 1600); }
    else if(!on && ambOn){ ambOn = false; clearInterval(ambT); ambT = null; }
  }
  /* a happy little market tune */
  const MEL = [[72, 0, 76, 79, 0, 76, 74, 0], [72, 0, 74, 76, 0, 74, 72, 0], [69, 0, 72, 76, 0, 74, 72, 0], [71, 0, 74, 79, 0, 77, 76, 0]];
  const BASS = [[48, 55], [53, 48], [45, 52], [43, 50]];
  const mf = m => 440 * Math.pow(2, (m - 69) / 12);
  let musicOn = false, step = 0, nextT = 0, timer = null;
  function sched(){
    const a = ctx; if(!a || !musicOn) return;
    const e = 60 / 108 / 2;
    while(nextT < a.currentTime + .25){
      const bar = Math.floor(step / 8) % 4, s = step % 8, m = MEL[bar][s], d = nextT - a.currentTime;
      if(!muted){ if(m) tone(mf(m), .32, 'triangle', .06, d, 0, musicBus); if(s % 4 === 0) tone(mf(BASS[bar][s / 4]), .6, 'sine', .08, d, 0, musicBus); if(s % 2 === 1) noise(.03, .02, 6000, 2, 'highpass', d, 0, musicBus); }
      nextT += e; step++;
    }
  }
  function music(on){
    if(on && !musicOn){ const a = ac(); if(!a) return; musicOn = true; nextT = a.currentTime + .1; timer = setInterval(sched, 90); }
    else if(!on && musicOn){ musicOn = false; clearInterval(timer); timer = null; }
  }
  function setMuted(v){ muted = v; set('booths_muted', v ? '1' : '0'); if(master) master.gain.value = v ? 0 : 1; }
  return { ac, SFX, music, ambience, get muted(){ return muted; }, setMuted };
}
