/* Bobo Hide & Seek: every sound is synthesised with WebAudio (no files).
   Pops, jumps, a cheerful whistle, a "poof" for the disguise, counting beeps, and a bouncy background tune. */
export function makeAudio(){
  const get = k => { try{ return localStorage.getItem(k); }catch(e){ return null; } };
  const set = (k, v) => { try{ localStorage.setItem(k, v); }catch(e){} };
  let ctx = null, master = null, musicBus = null, sfxBus = null, noiseBuf = null;
  let muted = get('hide_muted') === '1';
  function ac(){
    if(!ctx){
      try{ ctx = new (window.AudioContext || window.webkitAudioContext)(); }catch(e){ ctx = null; return null; }
      master = ctx.createGain(); master.gain.value = muted ? 0 : 1; master.connect(ctx.destination);
      musicBus = ctx.createGain(); musicBus.gain.value = .45; musicBus.connect(master);
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
    jump(){ tone(330, .16, 'sine', .1, 0, 700); },
    land(){ noise(.06, .05, 500, 1, 'lowpass'); },
    hide(){ tone(700, .08, 'triangle', .1, 0, 300); noise(.18, .06, 1200, 1, 'bandpass', .03); },
    peek(){ tone(500, .1, 'triangle', .09, 0, 900); },
    found(){ [784, 988, 1175, 1568].forEach((f, i) => tone(f, .14, 'triangle', .12, i * .07)); noise(.25, .05, 3000, 1, 'highpass', .1); },
    empty(){ tone(260, .22, 'sine', .12, 0, 520); tone(520, .12, 'sine', .06, .2, 300); },
    whistle(){ tone(1800, .25, 'sine', .1, 0, 2300); tone(2300, .3, 'sine', .09, .26, 1700); tone(1700, .35, 'sine', .08, .58, 2400); },
    poof(){ noise(.35, .12, 2500, .7, 'bandpass', 0, 600); tone(900, .2, 'sine', .07, .05, 1500); },
    unpoof(){ noise(.25, .09, 700, .7, 'bandpass', 0, 2500); },
    beep(i){ tone([523, 587, 659, 698, 784, 880][i % 6], .12, 'triangle', .1); },
    go(){ [523, 659, 784, 1046].forEach((f, i) => tone(f, .16, 'triangle', .13, i * .08)); },
    tick(){ tone(1200, .04, 'square', .035); },
    bonk(){ tone(220, .14, 'triangle', .1, 0, 120); },
    spark(){ for(let i = 0; i < 6; i++) tone(1800 + Math.random() * 1400, .1, 'sine', .05, i * .05); },
    fanfare(){ [523, 659, 784, 1046, 0, 784, 1046, 1318].forEach((f, i) => f && tone(f, .22, 'triangle', .14, i * .12)); [262, 392, 523].forEach((f, i) => tone(f, .9, 'sine', .07, .5 + i * .3)); },
    soft(){ [659, 587, 523, 659].forEach((f, i) => tone(f, .2, 'triangle', .1, i * .14)); },
    giggle(){ for(let i = 0; i < 4; i++) tone(900 + i * 60, .07, 'sine', .07, i * .09, 1200 + i * 60); }
  };

  /* background tune: a bouncy loop (C – Am – F – G). 'seek' mode is a bit quicker and brighter, never creepy. */
  const MEL = [[72, 0, 76, 79, 0, 76, 72, 0], [69, 0, 72, 76, 0, 74, 72, 0], [65, 0, 69, 72, 77, 0, 76, 74], [67, 71, 74, 0, 79, 0, 77, 74],
               [72, 76, 79, 0, 84, 0, 79, 76], [69, 72, 76, 0, 81, 0, 79, 76], [77, 0, 76, 74, 72, 0, 69, 72], [74, 0, 71, 74, 79, 0, 72, 0]];
  const BASS = [[48, 55], [45, 52], [41, 48], [43, 50], [48, 55], [45, 52], [41, 48], [43, 50]];
  const mf = m => 440 * Math.pow(2, (m - 69) / 12);
  let musicOn = false, mode = 'calm', step = 0, nextT = 0, timer = null;
  function sched(){
    const a = ctx; if(!a || !musicOn) return;
    const bpm = mode === 'seek' ? 136 : 108, e = 60 / bpm / 2;
    while(nextT < a.currentTime + .25){
      const bar = Math.floor(step / 8) % 8, s = step % 8, m = MEL[bar][s];
      if(!muted){
        if(m) tone(mf(m), mode === 'seek' ? .13 : .2, 'triangle', .05, nextT - a.currentTime, 0, musicBus);
        if(s % 2 === 0){ const b = BASS[bar][(s / 2) % 2]; tone(mf(b), .28, 'sine', .08, nextT - a.currentTime, 0, musicBus); }
        if(mode === 'seek' && s % 2 === 1) noise(.03, .025, 6000, 1, 'highpass', nextT - a.currentTime);
      }
      nextT += e; step++;
    }
  }
  function music(on, m){
    if(m) mode = m;
    if(on && !musicOn){ const a = ac(); if(!a) return; musicOn = true; nextT = a.currentTime + .1; timer = setInterval(sched, 90); }
    else if(!on && musicOn){ musicOn = false; clearInterval(timer); timer = null; }
  }
  function setMuted(v){ muted = v; set('hide_muted', v ? '1' : '0'); if(master) master.gain.value = v ? 0 : 1; }
  return { ac, SFX, music, get muted(){ return muted; }, setMuted, setMode(m){ mode = m; } };
}
