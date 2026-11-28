/* «بيانو بوبو» sound: a small synthesized piano (no audio files).
   Each note = a few slightly detuned harmonics through a low-pass filter that closes as the note fades, plus a soft
   room (generated reverb) and a light echo. Hold notes sustain until released. A gentle «boop» for a missed tile.
   PianoAudio.note(midi, vel, hold) → voice (voice.release() ends a held note); .acc(notes, when, vel, dur) schedules the soft
   accompaniment at an AudioContext time; .now(); .sfx(kind); .mute(bool); .suspend() / .resume(). */
(function(){
'use strict';
let ac = null, master = null, dry = null, wet = null, echo = null, muted = false, voices = [];
const MAX_VOICES = 18;
function init(){
  if(ac) return ac;
  try{
    const AC = window.AudioContext || window.webkitAudioContext; if(!AC) return null;
    ac = new AC();
    master = ac.createGain(); master.gain.value = muted ? 0 : 0.8;
    const comp = ac.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4; comp.attack.value = 0.004; comp.release.value = 0.2;
    master.connect(comp); comp.connect(ac.destination);
    dry = ac.createGain(); dry.gain.value = 1; dry.connect(master);
    // room: a short decaying noise impulse
    const len = Math.floor(ac.sampleRate * 1.7), ir = ac.createBuffer(2, len, ac.sampleRate);
    for(let c = 0; c < 2; c++){ const d = ir.getChannelData(c); for(let i = 0; i < len; i++){ const k = 1 - i / len; d[i] = (Math.random() * 2 - 1) * k * k * k; } }
    const conv = ac.createConvolver(); conv.buffer = ir;
    wet = ac.createGain(); wet.gain.value = 0.22; wet.connect(conv); conv.connect(master);
    // echo
    const dl = ac.createDelay(1), fb = ac.createGain(), eo = ac.createGain(), lp = ac.createBiquadFilter();
    dl.delayTime.value = 0.27; fb.gain.value = 0.22; eo.gain.value = 0.1; lp.type = 'lowpass'; lp.frequency.value = 2400;
    echo = ac.createGain(); echo.gain.value = 1;
    echo.connect(dl); dl.connect(lp); lp.connect(fb); fb.connect(dl); lp.connect(eo); eo.connect(master);
  }catch(e){ ac = null; }
  return ac;
}
const hz = m => 440 * Math.pow(2, (m - 69) / 12);
const PARTS = [[1, 'triangle', 0.55, 0], [1, 'sine', 0.5, 4], [2, 'sine', 0.22, -3], [3, 'sine', 0.08, 2], [4, 'sine', 0.035, 0]];
/* one piano voice. when = AudioContext time (default now), vel 0..1, hold = sustain until release(), dur = auto release after dur s */
function voice(midi, vel, when, hold, dur, soft){
  if(!ac) return null;
  const t0 = Math.max(when || 0, ac.currentTime), f = hz(midi);
  const decay = Math.max(0.5, 2.4 - (midi - 48) * 0.035) * (soft ? 0.8 : 1);
  const env = ac.createGain(), flt = ac.createBiquadFilter();
  flt.type = 'lowpass'; flt.Q.value = 0.4;
  flt.frequency.setValueAtTime(Math.min(16000, f * (soft ? 5 : 9)), t0);
  flt.frequency.exponentialRampToValueAtTime(Math.min(12000, f * (soft ? 1.8 : 2.6)), t0 + decay * 0.6);
  const peak = vel * (soft ? 0.32 : 0.42);
  env.gain.setValueAtTime(0.0001, t0);
  env.gain.linearRampToValueAtTime(peak, t0 + (soft ? 0.02 : 0.006));
  if(hold) env.gain.setTargetAtTime(peak * 0.45, t0 + 0.02, 0.35);
  else env.gain.setTargetAtTime(0.0001, t0 + 0.02, decay / 4);
  flt.connect(env); env.connect(dry); env.connect(wet); if(!soft) env.connect(echo);
  const oscs = [];
  for(const [mul, type, g, det] of PARTS){
    if(soft && mul > 2) continue;
    const o = ac.createOscillator(), og = ac.createGain();
    o.type = type; o.frequency.value = f * mul; o.detune.value = det; og.gain.value = g;
    o.connect(og); og.connect(flt); o.start(t0); oscs.push(o);
  }
  const end = hold ? t0 + 30 : t0 + (dur ? dur + 0.5 : decay * 1.3);
  oscs.forEach(o => o.stop(end));
  const v = { env, oscs, t0, done:false,
    release(){
      if(v.done || !ac) return; v.done = true;
      const t = Math.max(ac.currentTime, v.t0 + 0.03);
      try{ env.gain.cancelScheduledValues(t); env.gain.setTargetAtTime(0.0001, t, 0.09); oscs.forEach(o => o.stop(t + 0.6)); }catch(e){}
    } };
  if(dur) setTimeout(() => v.release(), Math.max(0, (t0 - ac.currentTime + dur) * 1000));
  if(!soft){ voices.push(v); if(voices.length > MAX_VOICES) voices.shift().release(); }
  return v;
}
function tone(f0, f1, len, type, vol, when){
  if(!ac) return;
  const t = Math.max(when || 0, ac.currentTime), o = ac.createOscillator(), g = ac.createGain();
  o.type = type || 'sine'; o.frequency.setValueAtTime(f0, t); if(f1) o.frequency.exponentialRampToValueAtTime(f1, t + len);
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t + len);
  o.connect(g); g.connect(dry); g.connect(wet); o.start(t); o.stop(t + len + 0.05);
}
const PianoAudio = {
  init,
  get ctx(){ return ac; },
  now(){ return ac ? ac.currentTime : 0; },
  note(midi, vel, hold){ init(); return voice(midi, vel == null ? 0.9 : vel, 0, !!hold); },
  acc(notes, when, vel, dur){ if(!ac || muted) return; for(let i = 0; i < notes.length; i++) voice(notes[i], vel, when, false, dur, true); },
  boop(){ init(); tone(330, 190, 0.22, 'sine', 0.16); tone(247, 150, 0.26, 'triangle', 0.06, ac && ac.currentTime + 0.05); },
  sfx(kind){
    if(!init()) return;
    const t = ac.currentTime;
    if(kind === 'click') tone(880, 1200, 0.07, 'sine', 0.08);
    else if(kind === 'star'){ [76, 79, 84].forEach((m, i) => tone(hz(m), 0, 0.3, 'triangle', 0.1, t + i * 0.07)); }
    else if(kind === 'crown'){ [72, 76, 79, 84, 88].forEach((m, i) => tone(hz(m), 0, 0.35, 'triangle', 0.1, t + i * 0.06)); }
    else if(kind === 'heart') tone(520, 300, 0.25, 'sine', 0.1);
    else if(kind === 'count') tone(660, 0, 0.12, 'sine', 0.12);
    else if(kind === 'go') tone(990, 0, 0.25, 'triangle', 0.12);
    else if(kind === 'win'){ [72, 76, 79, 84].forEach((m, i) => voice(m, 0.7, t + i * 0.12, false, 0)); voice(60, 0.5, t + 0.48, false, 0); voice(64, 0.5, t + 0.48, false, 0); voice(67, 0.5, t + 0.48, false, 0); }
    else if(kind === 'end'){ [67, 64, 60].forEach((m, i) => voice(m, 0.55, t + i * 0.16, false, 0)); }
  },
  stopAll(){ voices.forEach(v => v.release()); voices = []; },
  mute(m){ muted = !!m; if(master) master.gain.value = muted ? 0 : 0.8; },
  get muted(){ return muted; },
  suspend(){ if(ac && ac.state === 'running'){ try{ ac.suspend(); }catch(e){} } },
  resume(){ init(); if(ac && ac.state !== 'running'){ try{ ac.resume(); }catch(e){} } }
};
window.PianoAudio = PianoAudio;
})();
