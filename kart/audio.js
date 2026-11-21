/* Bobo Kart: every sound is synthesised with WebAudio (no files).
   Engine hum (pitch follows the speed), drift squeal, boost whoosh, item roulette and items, countdown beeps, a crowd cheer and a
   bouncy race tune. Mute is remembered on this phone. */
export function makeAudio(){
  const get = k => { try{ return localStorage.getItem(k); }catch(e){ return null; } };
  const set = (k, v) => { try{ localStorage.setItem(k, v); }catch(e){} };
  let ctx = null, master = null, musicBus = null, sfxBus = null, noiseBuf = null, eng = null, drift = null;
  let muted = get('kart_muted') === '1';
  function ac(){
    if(!ctx){
      try{ ctx = new (window.AudioContext || window.webkitAudioContext)(); }catch(e){ ctx = null; return null; }
      master = ctx.createGain(); master.gain.value = muted ? 0 : 1; master.connect(ctx.destination);
      musicBus = ctx.createGain(); musicBus.gain.value = .32; musicBus.connect(master);
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
  const SFX = {
    tap(){ tone(560, .06, 'triangle', .08); },
    beep(){ tone(660, .22, 'square', .07); tone(660, .22, 'triangle', .08); },
    go(){ tone(1046, .5, 'square', .07); tone(1318, .5, 'triangle', .09, .02); },
    star(){ tone(1318, .07, 'square', .04); tone(1976, .14, 'triangle', .06, .05); },
    box(){ [784, 988, 1175, 1568].forEach((f, i) => tone(f, .09, 'triangle', .07, i * .04)); },
    tick(){ tone(1200 + Math.random() * 400, .03, 'square', .025); },
    got(){ tone(880, .1, 'triangle', .1); tone(1320, .2, 'triangle', .1, .08); },
    hop(){ tone(300, .12, 'sine', .1, 0, 620); },
    boost(){ noise(.7, .14, 500, .8, 'bandpass', 0, 3200); tone(200, .55, 'sawtooth', .05, 0, 620); },
    mini(lvl){ noise(.4, .1, 900, .8, 'bandpass', 0, 3000); tone(lvl > 1 ? 700 : 520, .25, 'triangle', .08, 0, lvl > 1 ? 1400 : 1000); },
    spark(lvl){ tone(lvl > 1 ? 1500 : 1100, .08, 'triangle', .06); },
    pad(){ noise(.45, .1, 900, 1, 'bandpass', 0, 3500); tone(600, .3, 'triangle', .07, 0, 1200); },
    bump(){ tone(150, .16, 'triangle', .12, 0, 80); noise(.12, .07, 300, 1, 'lowpass'); },
    spin(){ for(let i = 0; i < 5; i++) tone(500 - i * 40, .09, 'triangle', .07, i * .07, 700 - i * 40); },
    boing(){ tone(180, .35, 'sine', .14, 0, 520); tone(360, .3, 'triangle', .05, .05, 900); },
    splat(){ noise(.25, .1, 400, 1, 'lowpass'); tone(140, .25, 'sine', .1, 0, 70); },
    peel(){ tone(500, .1, 'triangle', .07, 0, 300); },
    pop(){ noise(.12, .14, 2500, 1, 'highpass'); tone(900, .08, 'triangle', .06); },
    whoosh(){ noise(.5, .09, 600, .8, 'bandpass', 0, 2400); },
    shield(){ [660, 880, 1100].forEach((f, i) => tone(f, .25, 'sine', .07, i * .05)); },
    shrink(){ [1568, 1318, 1046, 784, 659].forEach((f, i) => tone(f, .12, 'triangle', .07, i * .05)); },
    splash(){ noise(.5, .12, 1600, .7, 'bandpass', 0, 400); },
    land(){ noise(.12, .08, 300, 1, 'lowpass'); },
    lap(){ [784, 988, 1175].forEach((f, i) => tone(f, .16, 'triangle', .1, i * .08)); },
    final(){ [659, 784, 988, 1318].forEach((f, i) => tone(f, .2, 'square', .05, i * .1)); },
    cheer(){
      for(let k = 0; k < 7; k++) noise(1.4, .05, 900 + k * 260, 1.5, 'bandpass', k * .05);
      [523, 659, 784, 1046, 0, 784, 1046, 1318].forEach((f, i) => f && tone(f, .22, 'triangle', .12, .2 + i * .12));
      for(let k = 0; k < 6; k++) tone(1600 + Math.random() * 900, .08, 'sine', .03, .3 + Math.random() * 1.2);
    },
    wrong(){ tone(200, .2, 'triangle', .1, 0, 140); },
    win(){ [523, 659, 784, 1046, 784, 1046, 1318].forEach((f, i) => tone(f, .24, 'triangle', .12, i * .11)); }
  };
  /* engine hum: two detuned oscillators through a low-pass; pitch and loudness follow the speed */
  function engine(on, k = 0, boost = false){
    const a = ctx; if(!a) return;
    if(on && !eng && !muted){
      const o1 = a.createOscillator(), o2 = a.createOscillator(), f = a.createBiquadFilter(), g = a.createGain();
      o1.type = 'sawtooth'; o2.type = 'square'; f.type = 'lowpass'; f.frequency.value = 500; f.Q.value = 2.5; g.gain.value = .0001;
      o1.connect(f); o2.connect(f); f.connect(g).connect(sfxBus); o1.start(); o2.start();
      eng = { o1, o2, f, g };
    }
    if(!eng) return;
    const t = a.currentTime;
    if(!on || muted){ eng.g.gain.setTargetAtTime(.0001, t, .06); const e = eng; eng = null; setTimeout(() => { try{ e.o1.stop(); e.o2.stop(); }catch(x){} }, 400); return; }
    const f0 = 60 + k * 120 + (boost ? 45 : 0);
    eng.o1.frequency.setTargetAtTime(f0, t, .06); eng.o2.frequency.setTargetAtTime(f0 * .503, t, .06);
    eng.f.frequency.setTargetAtTime(380 + k * 1100 + (boost ? 700 : 0), t, .08);
    eng.g.gain.setTargetAtTime(.022 + k * .028 + (boost ? .02 : 0), t, .08);
  }
  /* drift squeal: filtered noise, on while drifting; pitch rises with the charge */
  function driftSnd(on, lvl = 0){
    const a = ctx; if(!a) return;
    if(on && !drift && !muted){
      const s = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain();
      s.buffer = noiseBuf; s.loop = true; f.type = 'bandpass'; f.Q.value = 6; f.frequency.value = 1800; g.gain.value = .0001;
      s.connect(f).connect(g).connect(sfxBus); s.start();
      drift = { s, f, g };
    }
    if(!drift) return;
    const t = a.currentTime;
    if(!on || muted){ drift.g.gain.setTargetAtTime(.0001, t, .05); const d = drift; drift = null; setTimeout(() => { try{ d.s.stop(); }catch(x){} }, 300); return; }
    drift.f.frequency.setTargetAtTime(1700 + lvl * 500, t, .05); drift.g.gain.setTargetAtTime(.035, t, .05);
  }
  /* race tune: bright and bouncy, never loud */
  const MEL = [[76, 0, 79, 0, 81, 79, 76, 74], [72, 74, 76, 0, 74, 0, 72, 0], [76, 0, 79, 0, 84, 83, 81, 79], [81, 0, 79, 76, 74, 0, 0, 0],
               [72, 0, 76, 79, 81, 0, 79, 76], [74, 76, 74, 72, 69, 0, 71, 72], [76, 79, 81, 83, 84, 0, 83, 81], [79, 0, 76, 0, 72, 0, 0, 0]];
  const BASS = [[48, 55], [45, 52], [41, 48], [43, 50], [48, 55], [45, 52], [41, 48], [43, 55]];
  const mf = m => 440 * Math.pow(2, (m - 69) / 12);
  let musicOn = false, step = 0, nextT = 0, timer = null, tempo = 138;
  function sched(){
    const a = ctx; if(!a || !musicOn) return;
    const e = 60 / tempo / 2;
    while(nextT < a.currentTime + .25){
      const bar = Math.floor(step / 8) % 8, s = step % 8, m = MEL[bar][s];
      if(!muted){
        if(m) tone(mf(m), .16, 'square', .022, nextT - a.currentTime, 0, musicBus);
        if(m) tone(mf(m), .2, 'triangle', .035, nextT - a.currentTime, 0, musicBus);
        if(s % 2 === 0){ const b = BASS[bar][(s / 2) % 2]; tone(mf(b), .22, 'triangle', .08, nextT - a.currentTime, 0, musicBus); }
        if(s % 2 === 1) noise(.03, .02, 6000, 1, 'highpass', nextT - a.currentTime);
        if(s === 0 || s === 4) tone(70, .12, 'sine', .1, nextT - a.currentTime, 45, musicBus);
      }
      nextT += e; step++;
    }
  }
  function music(on, fast){
    tempo = fast ? 152 : 138;
    if(on && !musicOn){ const a = ac(); if(!a) return; musicOn = true; step = 0; nextT = a.currentTime + .1; timer = setInterval(sched, 90); }
    else if(!on && musicOn){ musicOn = false; clearInterval(timer); timer = null; }
  }
  function setMuted(v){ muted = v; set('kart_muted', v ? '1' : '0'); if(master) master.gain.value = v ? 0 : 1; if(v){ engine(false); driftSnd(false); } }
  return { ac, SFX, music, engine, driftSnd, get muted(){ return muted; }, setMuted };
}
