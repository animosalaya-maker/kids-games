/* Bobo Blocks: every sound is made with WebAudio (no files): block pops and crunches, steps, jump, coins, level up,
   construction knocks, animal voices (a horse neigh, sheep, chicken, a meow, a woof), hearts, and a calm music-box tune
   (slower and softer at night). Mute is remembered on this phone. */
export function makeAudio(){
  const get = k => { try{ return localStorage.getItem(k); }catch(e){ return null; } };
  const set = (k, v) => { try{ localStorage.setItem(k, v); }catch(e){} };
  let ctx = null, master = null, musicBus = null, sfxBus = null, noiseBuf = null;
  let muted = get('blocks_muted') === '1';
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
    env(g, t0, Math.min(.04, dur * .3), vol, dur); s.connect(f).connect(g).connect(sfxBus); s.start(t0, Math.random()); s.stop(t0 + dur + .05);
  }
  let popN = 0, popT = 0, stepT = 0;
  const SFX = {
    tap(){ tone(560, .06, 'triangle', .08); },
    place(){ const now = performance.now(); popN = now - popT < 500 ? Math.min(popN + 1, 7) : 0; popT = now; const f = 300 * Math.pow(2, popN / 12); noise(.06, .12, 1200, 1.2, 'bandpass'); tone(f, .08, 'triangle', .1, 0, f * .7); },
    brk(){ noise(.14, .16, 700, 1, 'bandpass', 0, 300); noise(.08, .08, 2400, 2, 'bandpass', .03); tone(160, .08, 'square', .03); },
    step(){ const now = performance.now(); if(now - stepT < 260) return; stepT = now; noise(.05, .025, 500 + Math.random() * 300, 1, 'lowpass'); },
    jump(){ tone(330, .14, 'sine', .08, 0, 640); },
    land(){ noise(.07, .05, 450, 1, 'lowpass'); },
    splash(){ noise(.4, .09, 1500, .7, 'bandpass', 0, 500); },
    fly(){ tone(420, .25, 'sine', .07, 0, 900); tone(630, .2, 'triangle', .04, .08, 1200); },
    coin(){ tone(988, .07, 'square', .05); tone(1318, .16, 'square', .05, .07); },
    nope(){ tone(260, .12, 'triangle', .08, 0, 200); tone(200, .16, 'triangle', .07, .1, 150); },
    build(){ noise(.05, .09, 900, 1.5, 'bandpass'); tone(220 + Math.random() * 90, .05, 'triangle', .05); },
    built(){ [523, 659, 784, 1046, 1318].forEach((f, i) => tone(f, .26, 'triangle', .11, i * .1)); noise(.6, .04, 4000, 1, 'highpass', .4); },
    level(){ [523, 659, 784, 1046, 0, 784, 1046, 1318].forEach((f, i) => f && tone(f, .24, 'triangle', .12, i * .11)); },
    task(){ [784, 988, 1318].forEach((f, i) => tone(f, .2, 'triangle', .1, i * .09)); },
    heart(){ tone(880, .12, 'sine', .07, 0, 1320); tone(1320, .14, 'sine', .05, .1, 1760); },
    grow(){ tone(300, .5, 'sine', .07, 0, 900); noise(.4, .04, 3000, 1, 'highpass', .1); },
    join(){ tone(500, .1, 'triangle', .08, 0, 800); tone(800, .12, 'triangle', .07, .1, 1100); },
    gallop(){ for(let i = 0; i < 2; i++) noise(.04, .05, 380, 1, 'lowpass', i * .09); },
    horse(){ tone(620, .5, 'sawtooth', .025, 0, 380); tone(900, .35, 'triangle', .04, .05, 520); for(let i = 0; i < 5; i++) tone(700 - i * 40, .06, 'triangle', .03, .12 + i * .06); },
    sheep(){ for(let i = 0; i < 4; i++) tone(410 + (i % 2) * 30, .09, 'sawtooth', .03, i * .08); },
    chicken(){ tone(900, .06, 'square', .03); tone(1200, .09, 'square', .03, .08, 800); tone(1000, .06, 'square', .025, .2); },
    cat(){ tone(700, .35, 'triangle', .07, 0, 1000); tone(1000, .2, 'sine', .04, .25, 600); },
    dog(){ tone(300, .08, 'square', .06, 0, 220); noise(.06, .06, 600, 1, 'bandpass'); tone(320, .08, 'square', .05, .2, 230); }
  };
  /* music box: pentatonic arpeggios over soft chords */
  const CH = [[60, 64, 67, 72], [57, 60, 64, 69], [53, 57, 60, 65], [55, 59, 62, 67]];
  const mf = m => 440 * Math.pow(2, (m - 69) / 12);
  let musicOn = false, step = 0, nextT = 0, timer = null, night = 0;
  const PAT = [0, 2, 1, 3, 2, 1, 3, 2];
  function sched(){
    const a = ctx; if(!a || !musicOn) return;
    const e = 60 / (92 - night * 20) / 2;
    while(nextT < a.currentTime + .25){
      const bar = Math.floor(step / 8) % 4, s = step % 8, c = CH[bar], d = nextT - a.currentTime;
      if(!muted){
        if(s % 2 === 0 || Math.random() < .5){ const m = c[PAT[s]] + 12; tone(mf(m), .5, 'sine', .05 * (1 - night * .4), d, 0, musicBus); tone(mf(m) * 2, .08, 'triangle', .008, d, 0, musicBus); }
        if(s === 0){ tone(mf(c[0] - 12), 1.6, 'triangle', .045, d, 0, musicBus); tone(mf(c[2] - 12), 1.6, 'sine', .03, d, 0, musicBus); }
      }
      nextT += e; step++;
    }
  }
  function music(on){
    if(on && !musicOn){ const a = ac(); if(!a) return; musicOn = true; nextT = a.currentTime + .1; timer = setInterval(sched, 90); }
    else if(!on && musicOn){ musicOn = false; clearInterval(timer); timer = null; }
  }
  function mood(n){ night = n; }
  function setMuted(v){ muted = v; set('blocks_muted', v ? '1' : '0'); if(master) master.gain.value = v ? 0 : 1; }
  return { ac, SFX, music, mood, get muted(){ return muted; }, setMuted };
}
