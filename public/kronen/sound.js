/* =========================================================
   Kronenkampf – Klänge, komplett im Browser erzeugt (Web Audio, keine Dateien)
   ========================================================= */
let AC = null;
let noiseBuf = null;
let master = null;
let muted = false;
const lastPlayed = {};

/** Muss nach einer Berührung/einem Klick laufen (Browser-Regel für Ton). */
function audioUnlock() {
  if (AC) { if (AC.state === 'suspended') AC.resume(); return; }
  try {
    AC = new (window.AudioContext || window.webkitAudioContext)();
  } catch { return; }
  master = AC.createGain();
  master.gain.value = muted ? 0 : 0.5;
  master.connect(AC.destination);
  noiseBuf = AC.createBuffer(1, AC.sampleRate * 0.6, AC.sampleRate);
  const d = noiseBuf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
}
function setMuted(m) {
  muted = m;
  if (master) master.gain.value = m ? 0 : 0.5;
}

function tone(freq, to, dur, type = 'sine', vol = 0.2, delay = 0) {
  const t = AC.currentTime + delay;
  const o = AC.createOscillator();
  const g = AC.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g); g.connect(master);
  o.start(t); o.stop(t + dur + 0.02);
}
function noise(dur, freq, vol = 0.2, type = 'bandpass', to = 0) {
  const t = AC.currentTime;
  const s = AC.createBufferSource();
  s.buffer = noiseBuf;
  const f = AC.createBiquadFilter();
  f.type = type;
  f.frequency.setValueAtTime(freq, t);
  if (to) f.frequency.exponentialRampToValueAtTime(to, t + dur);
  const g = AC.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  s.connect(f); f.connect(g); g.connect(master);
  s.start(t); s.stop(t + dur + 0.02);
}

/** Einen Klang abspielen. Gleiche Klänge höchstens alle paar Millisekunden, sonst wird es Matsch. */
function sfx(name) {
  if (!AC || muted) return;
  const now = performance.now();
  const gap = { hit: 70, shot: 70, boom: 120 }[name] ?? 30;
  if (now - (lastPlayed[name] ?? 0) < gap) return;
  lastPlayed[name] = now;
  switch (name) {
    case 'hit': noise(0.07, 900 + Math.random() * 400, 0.18); break;
    case 'shot': tone(1100, 500, 0.07, 'triangle', 0.07); break;
    case 'deploy': tone(260, 520, 0.12, 'sine', 0.18); noise(0.12, 300, 0.12, 'lowpass'); break;
    case 'boom': noise(0.45, 1200, 0.45, 'lowpass', 120); tone(110, 40, 0.4, 'sine', 0.35); break;
    case 'whoosh': noise(0.3, 600, 0.12, 'bandpass', 2400); break;
    case 'tower': noise(0.9, 900, 0.5, 'lowpass', 80); tone(80, 30, 0.8, 'sine', 0.45); break;
    case 'tick': tone(660, 0, 0.12, 'square', 0.08); break;
    case 'go': tone(990, 0, 0.25, 'square', 0.1); tone(1320, 0, 0.3, 'square', 0.08, 0.08); break;
    case 'nope': tone(220, 160, 0.15, 'square', 0.06); break;
    case 'win': [523, 659, 784, 1046].forEach((f, i) => tone(f, 0, 0.3, 'triangle', 0.18, i * 0.12)); break;
    case 'lose': [392, 330, 262].forEach((f, i) => tone(f, 0, 0.4, 'triangle', 0.16, i * 0.18)); break;
    default:
  }
}
