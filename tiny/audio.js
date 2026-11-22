/* Tiny Bobo: every sound is synthesised with WebAudio (no files): jump boing, double-jump twirl, coin ding (rising combo),
   spin whoosh, ground-pound thud, launch-pad BOING, enemy pop, ouch, golden button fanfare, splash, door swoosh,
   villager talk blips, soft cannon «puff», bell ding and a cheerful bouncy tune. Mute is remembered on this phone. */
export function makeAudio(){
  const get = k => { try{ return localStorage.getItem(k); }catch(e){ return null; } };
  const set = (k, v) => { try{ localStorage.setItem(k, v); }catch(e){} };
  let ctx = null, master = null, musicBus = null, sfxBus = null, noiseBuf = null;
  let muted = get('tiny_muted') === '1';
  function ac(){
    if(!ctx){
      try{ ctx = new (window.AudioContext || window.webkitAudioContext)(); }catch(e){ ctx = null; return null; }
      master = ctx.createGain(); master.gain.value = muted ? 0 : 1; master.connect(ctx.destination);
      musicBus = ctx.createGain(); musicBus.gain.value = .3; musicBus.connect(master);
      sfxBus = ctx.createGain(); sfxBus.gain.value = 1; sfxBus.connect(master);
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate); const d = noiseBuf.getChannelData(0); for(let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    if(ctx.state === 'suspended') ctx.resume().catch(() => {});
    return ctx;
  }
  function env(g, t0, a, peak, dur){ g.gain.setValueAtTime(.0001, t0); g.gain.exponentialRampToValueAtTime(peak, t0 + a); g.gain.exponentialRampToValueAtTime(.0001, t0 + dur); }
  function tone(f, dur, type = 'sine', vol = .12, delay = 0, toF = 0, bus){
    const a = ac(); if(!a || muted) return;
    const t0 = a.currentTime + Math.max(0, delay), o = a.createOscillator(), g = a.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t0); if(toF) o.frequency.exponentialRampToValueAtTime(toF, t0 + dur);
    env(g, t0, .01, vol, dur); o.connect(g).connect(bus || sfxBus); o.start(t0); o.stop(t0 + dur + .05);
  }
  function noise(dur, vol, freq, q = 1, type = 'bandpass', delay = 0, toFreq = 0){
    const a = ac(); if(!a || muted) return;
    const t0 = a.currentTime + delay, s = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain();
    s.buffer = noiseBuf; s.loop = true; f.type = type; f.frequency.setValueAtTime(freq, t0); if(toFreq) f.frequency.exponentialRampToValueAtTime(toFreq, t0 + dur); f.Q.value = q;
    env(g, t0, Math.min(.05, dur * .3), vol, dur); s.connect(f).connect(g).connect(sfxBus); s.start(t0, Math.random()); s.stop(t0 + dur + .05);
  }
  let coinN = 0, coinT = 0, talkT = 0;
  const SFX = {
    tap(){ tone(560, .06, 'triangle', .08); },
    jump(){ tone(260, .18, 'sine', .13, 0, 620); tone(520, .1, 'triangle', .03, .02, 900); },
    djump(){ tone(420, .2, 'sine', .11, 0, 980); noise(.18, .05, 2500, 1, 'bandpass', 0, 5000); },
    land(k = .5){ noise(.08, .04 + k * .06, 450, 1, 'lowpass'); },
    coin(){ const now = performance.now(); coinN = now - coinT < 500 ? Math.min(coinN + 1, 10) : 0; coinT = now; const f = 988 * Math.pow(2, coinN / 24); tone(f, .07, 'square', .045); tone(f * 1.5, .22, 'square', .04, .06); },
    spin(){ noise(.32, .1, 700, 1.4, 'bandpass', 0, 2600); tone(300, .3, 'triangle', .04, 0, 600); },
    pound(){ tone(500, .12, 'sine', .06, 0, 900); },
    thud(){ tone(110, .3, 'sine', .2, 0, 50); noise(.25, .15, 300, 1, 'lowpass'); },
    boing(){ tone(160, .5, 'sine', .16, 0, 760); tone(320, .45, 'triangle', .05, .04, 1300); noise(.2, .05, 1800, 1, 'bandpass', .02, 600); },
    bounce(){ tone(200, .3, 'sine', .14, 0, 560); },
    pop(){ noise(.12, .14, 1500, 1, 'bandpass', 0, 300); tone(700, .12, 'sine', .08, 0, 1400); [880, 1175].forEach((f, i) => tone(f, .1, 'triangle', .05, .08 + i * .06)); },
    hurt(){ tone(520, .14, 'square', .06, 0, 300); tone(330, .25, 'triangle', .08, .12, 180); },
    button(){ [784, 988, 1175, 1568].forEach((f, i) => tone(f, .25, 'triangle', .1, i * .09)); tone(2093, .4, 'sine', .05, .36); },
    star(){ [523, 659, 784, 1046, 0, 784, 1046, 1318].forEach((f, i) => f && tone(f, .24, 'triangle', .12, i * .11)); [262, 392, 523].forEach((f, i) => tone(f, .8, 'sine', .07, .45 + i * .25)); },
    splash(){ noise(.45, .1, 1600, .7, 'bandpass', 0, 500); tone(700, .1, 'sine', .04, .02, 300); },
    door(){ noise(.5, .07, 400, .7, 'bandpass', 0, 1800); tone(400, .3, 'sine', .05, .1, 700); },
    talk(){ const now = performance.now(); if(now - talkT < 70) return; talkT = now; tone(300 + Math.random() * 300, .06, 'triangle', .06); },
    shoot(){ noise(.15, .12, 800, 1, 'lowpass'); tone(200, .16, 'sine', .1, 0, 90); tone(600, .1, 'triangle', .04, .02, 1200); },
    bell(){ [1318, 1976, 2637].forEach((f, i) => tone(f, 1.1 - i * .3, 'sine', .08 - i * .02)); },
    crate(){ noise(.15, .14, 700, 1, 'bandpass'); [523, 659, 784, 1046].forEach((f, i) => tone(f, .16, 'triangle', .08, .08 + i * .06)); },
    check(){ [659, 880, 1046].forEach((f, i) => tone(f, .2, 'triangle', .09, i * .1)); },
    buy(){ [880, 1175, 1568].forEach((f, i) => tone(f, .18, 'square', .04, i * .07)); },
    nope(){ tone(260, .12, 'triangle', .08, 0, 200); tone(200, .16, 'triangle', .07, .1, 150); },
    wind(){ for(let i = 0; i < 4; i++) noise(.04, .08, 3000, 3, 'bandpass', i * .07); },
    swim(){ noise(.18, .035, 1200, .8, 'bandpass', 0, 700); }
  };
  /* a cheerful bouncy tune: plucky lead (square + sine), walking bass, light percussion */
  const MEL = [[72, 0, 76, 79, 0, 76, 74, 0], [72, 0, 69, 0, 67, 69, 72, 0], [74, 0, 77, 81, 0, 79, 77, 76], [74, 0, 0, 72, 74, 0, 0, 0],
               [76, 0, 79, 84, 0, 81, 79, 0], [77, 76, 74, 0, 72, 74, 76, 0], [74, 0, 72, 69, 0, 67, 69, 71], [72, 0, 0, 0, 79, 0, 72, 0]];
  const BASS = [[48, 55, 52, 55], [45, 52, 48, 52], [50, 57, 53, 57], [43, 50, 47, 50], [48, 55, 52, 55], [41, 48, 45, 48], [43, 50, 47, 50], [48, 43, 48, 0]];
  const mf = m => 440 * Math.pow(2, (m - 69) / 12);
  let musicOn = false, step = 0, nextT = 0, timer = null;
  function sched(){
    const a = ctx; if(!a || !musicOn) return;
    const e = 60 / 126 / 2;
    while(nextT < a.currentTime + .25){
      const bar = Math.floor(step / 8) % 8, s = step % 8, m = MEL[bar][s], d = nextT - a.currentTime;
      if(!muted){
        if(m){ tone(mf(m), .16, 'square', .022, d, 0, musicBus); tone(mf(m), .22, 'sine', .05, d, 0, musicBus); }
        if(s % 2 === 0){ const b = BASS[bar][s / 2]; if(b) tone(mf(b), .2, 'triangle', .075, d, 0, musicBus); }
        if(s % 4 === 0) tone(90, .1, 'sine', .07, d, 50, musicBus);
        if(s % 2 === 1) noise(.03, .02, 7000, 1, 'highpass', d);
      }
      nextT += e; step++;
    }
  }
  function music(on){
    if(on && !musicOn){ const a = ac(); if(!a) return; musicOn = true; nextT = a.currentTime + .1; timer = setInterval(sched, 90); }
    else if(!on && musicOn){ musicOn = false; clearInterval(timer); timer = null; }
  }
  function setMuted(v){ muted = v; set('tiny_muted', v ? '1' : '0'); if(master) master.gain.value = v ? 0 : 1; }
  return { ac, SFX, music, get muted(){ return muted; }, setMuted };
}
