/* Bobo Desert: every sound is synthesised with WebAudio (no files).
   Engine hum (follows the buggy's speed), coins, rings, a friendly horn, boost whoosh, treasure fanfare, a silly camel «hmm»,
   race beeps and a light, sunny background tune. Mute is remembered on this phone. */
export function makeAudio(){
  const get = k => { try{ return localStorage.getItem(k); }catch(e){ return null; } };
  const set = (k, v) => { try{ localStorage.setItem(k, v); }catch(e){} };
  let ctx = null, master = null, musicBus = null, sfxBus = null, noiseBuf = null, eng = null;
  let muted = get('desert_muted') === '1';
  function ac(){
    if(!ctx){
      try{ ctx = new (window.AudioContext || window.webkitAudioContext)(); }catch(e){ ctx = null; return null; }
      master = ctx.createGain(); master.gain.value = muted ? 0 : 1; master.connect(ctx.destination);
      musicBus = ctx.createGain(); musicBus.gain.value = .38; musicBus.connect(master);
      sfxBus = ctx.createGain(); sfxBus.gain.value = 1; sfxBus.connect(master);
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate); const d = noiseBuf.getChannelData(0); for(let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    if(ctx.state === 'suspended') ctx.resume().catch(() => {});
    return ctx;
  }
  function env(g, t0, a, peak, dur){ g.gain.setValueAtTime(.0001, t0); g.gain.exponentialRampToValueAtTime(peak, t0 + a); g.gain.exponentialRampToValueAtTime(.0001, t0 + dur); }
  function tone(f, dur, type = 'sine', vol = .12, delay = 0, toF = 0, bus){
    const a = ac(); if(!a || muted) return;
    const t0 = a.currentTime + delay, o = a.createOscillator(), g = a.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t0); if(toF) o.frequency.exponentialRampToValueAtTime(toF, t0 + dur);
    env(g, t0, .012, vol, dur); o.connect(g).connect(bus || sfxBus); o.start(t0); o.stop(t0 + dur + .05);
  }
  function noise(dur, vol, freq, q = 1, type = 'bandpass', delay = 0, toFreq = 0){
    const a = ac(); if(!a || muted) return;
    const t0 = a.currentTime + delay, s = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain();
    s.buffer = noiseBuf; s.loop = true; f.type = type; f.frequency.setValueAtTime(freq, t0); if(toFreq) f.frequency.exponentialRampToValueAtTime(toFreq, t0 + dur); f.Q.value = q;
    env(g, t0, Math.min(.08, dur * .3), vol, dur); s.connect(f).connect(g).connect(sfxBus); s.start(t0, Math.random() * .5); s.stop(t0 + dur + .05);
  }
  let coinN = 0, coinT = 0;
  const SFX = {
    tap(){ tone(560, .06, 'triangle', .08); },
    jump(){ tone(330, .16, 'sine', .1, 0, 700); },
    land(){ noise(.07, .05, 500, 1, 'lowpass'); },
    coin(){ const now = performance.now(); coinN = now - coinT < 450 ? Math.min(coinN + 1, 8) : 0; coinT = now; const f = 988 * Math.pow(2, coinN / 12); tone(f, .08, 'square', .045); tone(f * 1.5, .16, 'square', .04, .06); },
    ring(){ [1046, 1318, 1568, 2093].forEach((f, i) => tone(f, .18, 'triangle', .09, i * .05)); },
    chest(){ [523, 659, 784, 1046, 784, 1046, 1318].forEach((f, i) => tone(f, .2, 'triangle', .12, i * .09)); noise(.5, .05, 3000, 1, 'highpass', .3); },
    horn(vol = 1){ for(const d of [0, .22]){ tone(392, .17, 'square', .06 * vol, d); tone(494, .17, 'square', .05 * vol, d); } },
    boost(){ noise(.6, .12, 400, .8, 'bandpass', 0, 2600); tone(180, .5, 'sawtooth', .05, 0, 520); },
    bump(){ tone(150, .16, 'triangle', .12, 0, 80); noise(.12, .07, 300, 1, 'lowpass'); },
    thud(){ noise(.16, .1, 260, 1, 'lowpass'); tone(110, .12, 'sine', .1, 0, 60); },
    splash(){ noise(.4, .09, 1600, .7, 'bandpass', 0, 500); },
    door(){ tone(300, .1, 'triangle', .08, 0, 600); tone(600, .1, 'triangle', .06, .08, 900); },
    out(){ tone(600, .1, 'triangle', .07, 0, 300); },
    camel(){ tone(150, .5, 'sawtooth', .05, 0, 120); tone(152, .5, 'sine', .07, 0, 125); tone(190, .3, 'sine', .05, .45, 140); },
    wave(){ [880, 1175].forEach((f, i) => tone(f, .12, 'sine', .07, i * .08)); },
    beep(){ tone(660, .16, 'triangle', .12); },
    go(){ tone(1046, .35, 'triangle', .14); tone(1318, .35, 'triangle', .08, .02); },
    gate(){ [784, 1046].forEach((f, i) => tone(f, .14, 'triangle', .11, i * .07)); },
    fanfare(){ [523, 659, 784, 1046, 0, 784, 1046, 1318].forEach((f, i) => f && tone(f, .22, 'triangle', .14, i * .12)); [262, 392, 523].forEach((f, i) => tone(f, .9, 'sine', .07, .5 + i * .3)); },
    star(i){ tone(880 + i * 220, .25, 'triangle', .12); tone(1760 + i * 440, .2, 'sine', .05, .05); },
    bonk(){ tone(220, .14, 'triangle', .1, 0, 120); }
  };

  /* engine hum: two detuned oscillators through a low-pass, pitch and loudness follow the speed */
  function engine(on, k = 0, boost = false){
    const a = ctx; if(!a) return;
    if(on && !eng && !muted){
      const o1 = a.createOscillator(), o2 = a.createOscillator(), f = a.createBiquadFilter(), g = a.createGain();
      o1.type = 'sawtooth'; o2.type = 'square'; f.type = 'lowpass'; f.frequency.value = 520; f.Q.value = 2; g.gain.value = .0001;
      o1.connect(f); o2.connect(f); f.connect(g).connect(sfxBus); o1.start(); o2.start();
      eng = { o1, o2, f, g };
    }
    if(!eng) return;
    const t = a.currentTime;
    if(!on || muted){ eng.g.gain.setTargetAtTime(.0001, t, .08); const e = eng; eng = null; setTimeout(() => { try{ e.o1.stop(); e.o2.stop(); }catch(x){} }, 400); return; }
    const f0 = 52 + k * 95 + (boost ? 35 : 0);
    eng.o1.frequency.setTargetAtTime(f0, t, .08); eng.o2.frequency.setTargetAtTime(f0 * .502, t, .08);
    eng.f.frequency.setTargetAtTime(420 + k * 900 + (boost ? 600 : 0), t, .1);
    eng.g.gain.setTargetAtTime(.028 + k * .03 + (boost ? .02 : 0), t, .1);
  }

  /* background tune: sunny and bouncy (C major pentatonic with a little turn), never loud */
  const MEL = [[72, 0, 74, 76, 0, 79, 76, 74], [72, 0, 69, 72, 74, 0, 0, 0], [76, 0, 79, 81, 0, 79, 76, 0], [74, 76, 74, 72, 69, 0, 72, 0],
               [79, 0, 81, 79, 76, 0, 74, 76], [72, 0, 74, 72, 69, 0, 67, 0], [69, 72, 74, 0, 76, 79, 76, 74], [72, 0, 0, 74, 72, 0, 0, 0]];
  const BASS = [[48, 55], [45, 52], [41, 48], [43, 50], [48, 55], [45, 52], [41, 48], [43, 48]];
  const mf = m => 440 * Math.pow(2, (m - 69) / 12);
  let musicOn = false, step = 0, nextT = 0, timer = null;
  function sched(){
    const a = ctx; if(!a || !musicOn) return;
    const e = 60 / 104 / 2;
    while(nextT < a.currentTime + .25){
      const bar = Math.floor(step / 8) % 8, s = step % 8, m = MEL[bar][s];
      if(!muted){
        if(m) tone(mf(m), .2, 'triangle', .045, nextT - a.currentTime, 0, musicBus);
        if(s % 2 === 0){ const b = BASS[bar][(s / 2) % 2]; tone(mf(b), .3, 'sine', .075, nextT - a.currentTime, 0, musicBus); }
        if(s % 4 === 2) noise(.04, .02, 5000, 1, 'highpass', nextT - a.currentTime);
      }
      nextT += e; step++;
    }
  }
  function music(on){
    if(on && !musicOn){ const a = ac(); if(!a) return; musicOn = true; nextT = a.currentTime + .1; timer = setInterval(sched, 90); }
    else if(!on && musicOn){ musicOn = false; clearInterval(timer); timer = null; }
  }
  function setMuted(v){ muted = v; set('desert_muted', v ? '1' : '0'); if(master) master.gain.value = v ? 0 : 1; if(v) engine(false); }
  return { ac, SFX, music, engine, get muted(){ return muted; }, setMuted };
}
