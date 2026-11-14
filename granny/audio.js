/* Grandma Nona's House: all sounds are synthesised with WebAudio (no files).
   Soft snores, mumbles, creaks, squeaks, door, pickups, a playful background tune and a win fanfare. */
export function makeAudio(){
  const get = k => { try{ return localStorage.getItem(k); }catch(e){ return null; } };
  const set = (k, v) => { try{ localStorage.setItem(k, v); }catch(e){} };
  let ctx = null, master = null, musicBus = null, sfxBus = null, noiseBuf = null;
  let muted = get('granny_muted') === '1';
  function ac(){
    if(!ctx){
      try{ ctx = new (window.AudioContext || window.webkitAudioContext)(); }catch(e){ ctx = null; return null; }
      master = ctx.createGain(); master.gain.value = muted ? 0 : 1; master.connect(ctx.destination);
      musicBus = ctx.createGain(); musicBus.gain.value = .5; musicBus.connect(master);
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
    pickup(){ [784, 988, 1318].forEach((f, i) => tone(f, .14, 'triangle', .11, i * .06)); tone(1568, .25, 'sine', .05, .18); },
    drop(){ tone(220, .12, 'triangle', .14, 0, 120); noise(.08, .08, 600, 1); },
    creak(){ const a = ac(); if(!a || muted) return; const t0 = a.currentTime, o = a.createOscillator(), f = a.createBiquadFilter(), g = a.createGain(), l = a.createOscillator(), lg = a.createGain();
      o.type = 'sawtooth'; o.frequency.setValueAtTime(140, t0); o.frequency.linearRampToValueAtTime(230, t0 + .45); l.frequency.value = 38; lg.gain.value = 40; l.connect(lg).connect(o.frequency);
      f.type = 'bandpass'; f.frequency.value = 900; f.Q.value = 6; env(g, t0, .05, .1, .5); o.connect(f).connect(g).connect(sfxBus); o.start(t0); l.start(t0); o.stop(t0 + .55); l.stop(t0 + .55); },
    squeak(){ tone(1300, .12, 'sine', .14, 0, 2100); tone(2100, .14, 'sine', .1, .12, 1200); },
    vase(){ tone(900, .08, 'triangle', .1, 0, 700); tone(500, .1, 'triangle', .1, .12, 300); tone(160, .25, 'sine', .2, .3, 90); noise(.15, .1, 400, 1, 'lowpass', .3); },
    door(){ SFX.creak(); tone(110, .5, 'sine', .14, .1, 70); },
    clank(){ tone(1800, .08, 'square', .05); tone(1200, .18, 'triangle', .1, .04); noise(.12, .08, 3000, 2); },
    unlock(){ SFX.clank(); [659, 880, 1046].forEach((f, i) => tone(f, .14, 'triangle', .1, .15 + i * .07)); },
    chain(){ for(let i = 0; i < 6; i++) tone(1500 + Math.random() * 900, .07, 'triangle', .06, i * .05); noise(.2, .07, 4000, 3, 'bandpass', .05); },
    jar(){ tone(1500, .07, 'triangle', .1); tone(2000, .1, 'sine', .07, .06); noise(.1, .05, 5000, 2, 'highpass'); },
    boop(){ noise(.35, .14, 500, .8, 'lowpass', 0, 1800); tone(380, .18, 'sine', .16, .12, 620); },
    feathers(){ noise(.6, .07, 3000, .6, 'highpass'); },
    wrong(){ tone(330, .16, 'triangle', .1); tone(262, .26, 'triangle', .1, .14); },
    code(i){ tone([523, 587, 659, 784, 880, 988][i % 6], .14, 'triangle', .12); },
    hide(){ noise(.25, .08, 900, 1); tone(300, .12, 'triangle', .07, .05, 200); },
    yay(){ [523, 659, 784].forEach((f, i) => tone(f, .14, 'triangle', .11, i * .06)); },
    fanfare(){ [523, 659, 784, 1046, 0, 784, 1046, 1318].forEach((f, i) => f && tone(f, .22, 'triangle', .14, i * .12)); [262, 392, 523].forEach((f, i) => tone(f, .9, 'sine', .07, .5 + i * .3)); },
    step(soft){ noise(.05, soft ? .025 : .05, soft ? 500 : 800, 1, 'lowpass'); },
    wake(){ tone(300, .2, 'triangle', .1, 0, 600); tone(600, .25, 'triangle', .08, .2, 450); },
    spot(){ tone(700, .1, 'square', .05); tone(940, .16, 'square', .05, .1); }
  };
  /* a sleepy snore: one breath in (low buzz) and a soft whistle out */
  function snore(vol = .5){
    const a = ac(); if(!a || muted || vol <= .01) return;
    const t0 = a.currentTime, o = a.createOscillator(), f = a.createBiquadFilter(), g = a.createGain();
    o.type = 'sawtooth'; o.frequency.setValueAtTime(70, t0); o.frequency.linearRampToValueAtTime(95, t0 + .9);
    f.type = 'lowpass'; f.frequency.value = 380; g.gain.setValueAtTime(.0001, t0); g.gain.linearRampToValueAtTime(.06 * vol, t0 + .5); g.gain.linearRampToValueAtTime(.0001, t0 + 1.1);
    o.connect(f).connect(g).connect(sfxBus); o.start(t0); o.stop(t0 + 1.15);
    tone(900, .7, 'sine', .025 * vol, 1.3, 600);
  }
  /* grandma mumbling: a few vowel-ish blips with a grumpy pitch curve */
  function mumble(n = 5, pitch = 210){
    const a = ac(); if(!a || muted) return;
    for(let i = 0; i < n; i++){
      const t0 = a.currentTime + i * .13, o = a.createOscillator(), f = a.createBiquadFilter(), g = a.createGain();
      o.type = 'sawtooth'; const p = pitch * (1 + Math.sin(i * 1.7) * .12 - i * .02);
      o.frequency.setValueAtTime(p, t0); o.frequency.linearRampToValueAtTime(p * (.85 + Math.random() * .3), t0 + .11);
      f.type = 'bandpass'; f.frequency.value = 700 + Math.random() * 600; f.Q.value = 3;
      env(g, t0, .02, .09, .12); o.connect(f).connect(g).connect(sfxBus); o.start(t0); o.stop(t0 + .14);
    }
  }

  /* background tune: a quiet, bouncy pizzicato loop (C – Am – F – G). Chase mode is quicker and brighter, never creepy. */
  const MEL = [[72, 0, 76, 79, 0, 76, 74, 0], [72, 0, 69, 72, 76, 0, 74, 72], [69, 0, 72, 77, 0, 76, 74, 0], [71, 74, 79, 0, 77, 74, 71, 0],
               [76, 0, 79, 84, 0, 81, 79, 0], [77, 76, 74, 72, 0, 69, 72, 0], [74, 0, 77, 81, 79, 77, 74, 0], [79, 0, 74, 71, 74, 0, 72, 0]];
  const BASS = [[48, 55], [45, 52], [41, 48], [43, 50], [48, 55], [45, 52], [41, 48], [43, 50]];
  const mf = m => 440 * Math.pow(2, (m - 69) / 12);
  let musicOn = false, mode = 'calm', step = 0, nextT = 0, timer = null;
  function sched(){
    const a = ctx; if(!a || !musicOn) return;
    const bpm = mode === 'chase' ? 150 : 100, e = 60 / bpm / 2;
    while(nextT < a.currentTime + .25){
      const bar = Math.floor(step / 8) % 8, s = step % 8, m = MEL[bar][s];
      if(!muted){
        if(m){ tone(mf(m + (mode === 'chase' ? 0 : 0)), mode === 'chase' ? .12 : .2, 'triangle', mode === 'chase' ? .06 : .05, nextT - a.currentTime, 0, musicBus); }
        if(s % 2 === 0 && (mode === 'chase' || s % 4 === 0)){ const b = BASS[bar][(s / 2) % 2]; tone(mf(b), mode === 'chase' ? .14 : .3, 'sine', .08, nextT - a.currentTime, 0, musicBus); }
        if(mode === 'chase' && s % 2 === 1) noise(.03, .03, 6000, 1, 'highpass', nextT - a.currentTime);
      }
      nextT += e; step++;
    }
  }
  function music(on, m){
    if(m) mode = m;
    if(on && !musicOn){ const a = ac(); if(!a) return; musicOn = true; nextT = a.currentTime + .1; timer = setInterval(sched, 90); }
    else if(!on && musicOn){ musicOn = false; clearInterval(timer); timer = null; }
  }
  function setMuted(v){ muted = v; set('granny_muted', v ? '1' : '0'); if(master) master.gain.value = v ? 0 : 1; }
  return { ac, SFX, snore, mumble, music, get muted(){ return muted; }, setMuted, get musicMode(){ return mode; }, setMode(m){ mode = m; } };
}
