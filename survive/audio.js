/* Deserted Island: every sound is synthesised with WebAudio (no files).
   Chop (wood knock), pick-up pops, crafting hammer + sparkle, eat crunch, splash, a cartoon shark «boing», soft sea waves
   (filtered noise that swells and fades), a crackling campfire, a ship horn, a fanfare, and a cheerful island tune
   (marimba-like, calmer and softer at night). Mute is remembered on this phone. */
export function makeAudio(){
  const get = k => { try{ return localStorage.getItem(k); }catch(e){ return null; } };
  const set = (k, v) => { try{ localStorage.setItem(k, v); }catch(e){} };
  let ctx = null, master = null, musicBus = null, sfxBus = null, noiseBuf = null, waves = null;
  let muted = get('survive_muted') === '1';
  function ac(){
    if(!ctx){
      try{ ctx = new (window.AudioContext || window.webkitAudioContext)(); }catch(e){ ctx = null; return null; }
      master = ctx.createGain(); master.gain.value = muted ? 0 : 1; master.connect(ctx.destination);
      musicBus = ctx.createGain(); musicBus.gain.value = .34; musicBus.connect(master);
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
    env(g, t0, Math.min(.06, dur * .3), vol, dur); s.connect(f).connect(g).connect(sfxBus); s.start(t0, Math.random()); s.stop(t0 + dur + .05);
  }
  let popN = 0, popT = 0;
  const SFX = {
    tap(){ tone(560, .06, 'triangle', .08); },
    chop(){ noise(.09, .16, 900, 1.5, 'bandpass'); tone(210, .1, 'triangle', .12, 0, 120); tone(420, .05, 'square', .03); },
    fall(){ noise(.5, .1, 600, .8, 'lowpass', 0, 150); tone(160, .4, 'triangle', .1, .25, 70); noise(.25, .12, 300, 1, 'lowpass', .55); },
    pick(){ const now = performance.now(); popN = now - popT < 600 ? Math.min(popN + 1, 6) : 0; popT = now; const f = 660 * Math.pow(2, popN / 12); tone(f, .08, 'sine', .1, 0, f * 1.5); tone(f * 2, .1, 'triangle', .04, .05); },
    crate(){ noise(.12, .1, 700, 1, 'bandpass'); [523, 659, 784, 1046].forEach((f, i) => tone(f, .16, 'triangle', .09, .08 + i * .07)); },
    craft(){ for(let i = 0; i < 3; i++){ tone(300, .06, 'square', .05, i * .14); noise(.05, .08, 2500, 2, 'bandpass', i * .14); } [784, 988, 1318].forEach((f, i) => tone(f, .22, 'triangle', .09, .45 + i * .08)); },
    eat(){ for(let i = 0; i < 3; i++) noise(.06, .08, 1800, 1.2, 'bandpass', i * .11); tone(520, .12, 'sine', .07, .36, 780); },
    nope(){ tone(260, .12, 'triangle', .08, 0, 200); tone(200, .16, 'triangle', .07, .1, 150); },
    jump(){ tone(330, .16, 'sine', .1, 0, 700); },
    land(){ noise(.07, .05, 500, 1, 'lowpass'); },
    splash(){ noise(.45, .1, 1600, .7, 'bandpass', 0, 500); tone(700, .1, 'sine', .04, .02, 300); },
    swim(){ noise(.18, .035, 1200, .8, 'bandpass', 0, 700); },
    boing(){ tone(140, .35, 'sine', .14, 0, 420); tone(280, .3, 'triangle', .05, .05, 560); noise(.3, .08, 1400, .8, 'bandpass', .05, 400); },
    fish(){ noise(.2, .08, 1500, 1, 'bandpass'); [880, 1175, 1568].forEach((f, i) => tone(f, .14, 'triangle', .08, .1 + i * .07)); },
    cast(){ tone(900, .25, 'sine', .04, 0, 300); noise(.15, .05, 1200, 1, 'bandpass', .25); },
    build(){ for(let i = 0; i < 4; i++){ noise(.06, .1, 900, 1.5, 'bandpass', i * .12); tone(240 + i * 40, .06, 'triangle', .07, i * .12); } },
    stage(){ [523, 659, 784, 1046, 1318].forEach((f, i) => tone(f, .26, 'triangle', .11, i * .1)); noise(.6, .04, 4000, 1, 'highpass', .4); },
    horn(){ for(const d of [0, .7]){ tone(147, .55, 'sawtooth', .05, d); tone(220, .55, 'sine', .08, d); } },
    bump(){ tone(120, .2, 'triangle', .14, 0, 70); noise(.2, .1, 400, 1, 'lowpass'); },
    fix(){ for(let i = 0; i < 2; i++){ tone(340, .06, 'square', .05, i * .15); noise(.05, .07, 2200, 2, 'bandpass', i * .15); } },
    paddle(){ noise(.22, .07, 900, .8, 'bandpass', 0, 400); },
    sleep(){ [523, 440, 392, 330].forEach((f, i) => tone(f, .4, 'sine', .07, i * .22)); },
    morning(){ [392, 523, 659, 784].forEach((f, i) => tone(f, .3, 'triangle', .08, i * .14)); },
    join(){ tone(500, .1, 'triangle', .08, 0, 800); tone(800, .12, 'triangle', .07, .1, 1100); },
    zap(){ tone(1500, .16, 'square', .035, 0, 320); tone(2200, .1, 'sine', .04, 0, 900); },
    tagged(){ [1318, 1046, 1318, 1568].forEach((f, i) => tone(f, .12, 'triangle', .07, i * .07)); tone(300, .5, 'sine', .06, .1, 600); },
    star(i){ tone(880 + i * 220, .25, 'triangle', .12); tone(1760 + i * 440, .2, 'sine', .05, .05); },
    fanfare(){ [523, 659, 784, 1046, 0, 784, 1046, 1318].forEach((f, i) => f && tone(f, .24, 'triangle', .13, i * .12)); [262, 392, 523].forEach((f, i) => tone(f, .9, 'sine', .07, .5 + i * .3)); },
    plane(){ tone(110, 1.6, 'sawtooth', .025, 0, 90); tone(55, 1.6, 'square', .02); },
    putt(){ tone(90, .1, 'square', .04); noise(.08, .05, 300, 1, 'lowpass'); },
    skid(){ noise(1.1, .1, 500, .6, 'lowpass', 0, 200); }
  };
  /* sea waves: a slow swell of filtered noise, loud near the water */
  function sea(on, k = .5){
    const a = ctx; if(!a) return;
    if(on && !waves && !muted){
      const s = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain(), lfo = a.createOscillator(), lg = a.createGain();
      s.buffer = noiseBuf; s.loop = true; f.type = 'lowpass'; f.frequency.value = 520; g.gain.value = 0;
      lfo.frequency.value = .13; lg.gain.value = .5; lfo.connect(lg);
      const vg = a.createGain(); vg.gain.value = .5; lg.connect(vg.gain);
      s.connect(f).connect(vg).connect(g).connect(sfxBus); s.start(); lfo.start();
      waves = { s, f, g, lfo };
    }
    if(!waves) return;
    const t = a.currentTime;
    if(!on || muted){ waves.g.gain.setTargetAtTime(0, t, .3); const w = waves; waves = null; setTimeout(() => { try{ w.s.stop(); w.lfo.stop(); }catch(x){} }, 1500); return; }
    waves.g.gain.setTargetAtTime(.02 + k * .07, t, .4); waves.f.frequency.setTargetAtTime(380 + k * 400, t, .4);
  }

  /* the island tune: bouncy marimba (sine + quick triangle click), pentatonic, softer and slower at night */
  const MEL = [[67, 0, 72, 0, 74, 76, 0, 74], [72, 0, 69, 0, 67, 0, 0, 0], [69, 0, 72, 74, 76, 0, 79, 76], [74, 0, 72, 0, 74, 0, 0, 0],
               [76, 0, 79, 0, 81, 79, 76, 0], [74, 76, 74, 72, 69, 0, 67, 0], [69, 72, 0, 74, 76, 0, 74, 72], [72, 0, 0, 0, 67, 0, 72, 0]];
  const BASS = [[48, 55], [45, 52], [41, 48], [43, 50], [48, 55], [45, 52], [41, 48], [43, 48]];
  const mf = m => 440 * Math.pow(2, (m - 69) / 12);
  let musicOn = false, step = 0, nextT = 0, timer = null, night = 0, sailing = false;
  function sched(){
    const a = ctx; if(!a || !musicOn) return;
    const e = 60 / (sailing ? 124 : 108 - night * 22) / 2;
    while(nextT < a.currentTime + .25){
      const bar = Math.floor(step / 8) % 8, s = step % 8, m = MEL[bar][s], d = nextT - a.currentTime;
      if(!muted){
        if(m){ tone(mf(m), .28, 'sine', .07 * (1 - night * .45), d, 0, musicBus); tone(mf(m) * 4, .03, 'triangle', .012, d, 0, musicBus); }
        if(s % 2 === 0){ const b = BASS[bar][(s / 2) % 2]; tone(mf(b), .32, 'triangle', .06 * (1 - night * .3), d, 0, musicBus); }
        if(s % 4 === 2 && night < .5) noise(.035, .018, 6000, 1, 'highpass', d);
      }
      nextT += e; step++;
    }
  }
  function music(on){
    if(on && !musicOn){ const a = ac(); if(!a) return; musicOn = true; nextT = a.currentTime + .1; timer = setInterval(sched, 90); }
    else if(!on && musicOn){ musicOn = false; clearInterval(timer); timer = null; }
  }
  function mood(n, sail){ night = n; sailing = !!sail; }
  function setMuted(v){ muted = v; set('survive_muted', v ? '1' : '0'); if(master) master.gain.value = v ? 0 : 1; if(v) sea(false); }
  return { ac, SFX, music, mood, sea, get muted(){ return muted; }, setMuted };
}
