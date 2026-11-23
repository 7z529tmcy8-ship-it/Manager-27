import { getSettings } from './settings';

// Sounds werden live im Browser erzeugt (Web Audio API) – keine Audiodateien, nichts zu laden.
// Jeder Sound ist eine kleine Mischung aus Tönen (Oszillatoren) und Rauschen (Wind, Publikum, Pfiff).

export type SoundId =
  | 'tap' | 'coin' | 'spend' | 'whistle' | 'packShake' | 'packRip' | 'reveal' | 'revealRare' | 'walkout' | 'walkStep'
  | 'unlock' | 'levelUp' | 'fanfare' | 'transfer' | 'rise' | 'fall' | 'notify' | 'error'
  | 'tick' | 'goal' | 'cash' | 'boom' | 'jackpot';

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let noiseBuf: AudioBuffer | null = null;
// Im Casino läuft alles über den übersteuerten Kanal (Verzerrung + Begrenzer).
let loud = false;
export function setLoudSound(on: boolean): void { loud = on; }
function outNode(c: AudioContext): AudioNode { return loud ? crunchBus(c) : master!; }

function audio(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  if (!ctx) {
    try {
      ctx = new AC();
      master = ctx.createGain();
      master.connect(ctx.destination);
    } catch {
      return null;
    }
  }
  if (ctx.state === 'suspended') void ctx.resume().catch(() => {});
  master!.gain.value = getSettings().volume * 0.5;
  return ctx;
}

function noise(c: AudioContext): AudioBuffer {
  if (!noiseBuf) {
    noiseBuf = c.createBuffer(1, c.sampleRate * 2, c.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  return noiseBuf;
}

interface ToneOpts { type?: OscillatorType; gain?: number; at?: number; to?: number; attack?: number; vibrato?: number }

/** Ein Ton mit kurzer Hüllkurve; optional gleitend (to) und mit Vibrato. */
function tone(c: AudioContext, freq: number, dur: number, o: ToneOpts = {}) {
  const t0 = c.currentTime + (o.at ?? 0);
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = o.type ?? 'sine';
  osc.frequency.setValueAtTime(freq, t0);
  if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to, t0 + dur);
  if (o.vibrato) {
    const lfo = c.createOscillator();
    const lg = c.createGain();
    lfo.frequency.value = o.vibrato;
    lg.gain.value = freq * 0.06;
    lfo.connect(lg).connect(osc.frequency);
    lfo.start(t0);
    lfo.stop(t0 + dur + 0.05);
  }
  const peak = o.gain ?? 0.3;
  const attack = o.attack ?? 0.008;
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(peak, t0 + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g).connect(outNode(c));
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

interface NoiseOpts { at?: number; gain?: number; freq?: number; to?: number; q?: number; type?: BiquadFilterType; attack?: number }

/** Gefiltertes Rauschen: Wind, Rascheln, Publikum. */
function hiss(c: AudioContext, dur: number, o: NoiseOpts = {}) {
  const t0 = c.currentTime + (o.at ?? 0);
  const src = c.createBufferSource();
  src.buffer = noise(c);
  src.loop = true;
  const f = c.createBiquadFilter();
  f.type = o.type ?? 'bandpass';
  f.Q.value = o.q ?? 1;
  f.frequency.setValueAtTime(o.freq ?? 1000, t0);
  if (o.to) f.frequency.exponentialRampToValueAtTime(o.to, t0 + dur);
  const g = c.createGain();
  const peak = o.gain ?? 0.2;
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(peak, t0 + (o.attack ?? 0.02));
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(f).connect(g).connect(outNode(c));
  src.start(t0, Math.random());
  src.stop(t0 + dur + 0.05);
}

const chord = (c: AudioContext, notes: number[], dur: number, o: ToneOpts = {}) => notes.forEach((n) => tone(c, n, dur, o));

// Noten (Hz)
const C5 = 523.25, E5 = 659.25, G5 = 783.99, C6 = 1046.5, E6 = 1318.5, G4 = 392, A4 = 440, D5 = 587.33, F4 = 349.23, C4 = 261.63, E4 = 329.63;

const SOUNDS: Record<SoundId, (c: AudioContext) => void> = {
  tap: (c) => tone(c, 1800, 0.035, { type: 'triangle', gain: 0.07 }),
  coin: (c) => {
    tone(c, 1318.5, 0.08, { type: 'square', gain: 0.07 });
    tone(c, 1975.5, 0.35, { type: 'square', gain: 0.07, at: 0.07 });
  },
  spend: (c) => {
    hiss(c, 0.12, { freq: 3000, gain: 0.12, q: 0.7 });
    tone(c, 880, 0.12, { type: 'triangle', gain: 0.12, to: 660, at: 0.04 });
  },
  // Schiedsrichterpfiff: hoher Ton mit schnellem Triller, zweimal kurz, einmal lang.
  whistle: (c) => {
    for (const [at, dur] of [[0, 0.16], [0.22, 0.16], [0.44, 0.55]]) {
      tone(c, 2900, dur, { type: 'sine', gain: 0.12, at, vibrato: 28, attack: 0.02 });
      hiss(c, dur, { at, freq: 2900, q: 8, gain: 0.05 });
    }
  },
  packShake: (c) => {
    hiss(c, 1.2, { freq: 400, to: 4000, gain: 0.18, attack: 0.9 });
    for (let i = 0; i < 6; i++) tone(c, 140 + i * 25, 0.08, { type: 'triangle', gain: 0.12, at: i * 0.18 });
  },
  // Pack reißt auf: Riss-Rauschen, tiefer Schlag, heller Funke.
  packRip: (c) => {
    hiss(c, 0.28, { freq: 1200, to: 7000, gain: 0.22, q: 0.8 });
    tone(c, 90, 0.5, { type: 'sine', gain: 0.45, to: 40 });
    tone(c, C6, 0.5, { type: 'triangle', gain: 0.08, at: 0.06, to: E6 });
  },
  reveal: (c) => {
    hiss(c, 0.35, { freq: 6000, to: 800, gain: 0.12 });
    chord(c, [C5, E5, G5], 0.7, { type: 'triangle', gain: 0.1, at: 0.05 });
  },
  revealRare: (c) => {
    hiss(c, 0.5, { freq: 8000, to: 600, gain: 0.18 });
    [C5, E5, G5, C6, E6].forEach((n, i) => tone(c, n, 0.9, { type: 'triangle', gain: 0.1, at: i * 0.06 }));
    chord(c, [C4, G4, C5], 1.6, { type: 'sawtooth', gain: 0.04, at: 0.3, attack: 0.1 });
  },
  // Walkout: Publikum schwillt an, tiefer Bass-Puls.
  walkout: (c) => {
    hiss(c, 3.2, { freq: 900, q: 0.5, gain: 0.22, attack: 1.5 });
    hiss(c, 3.2, { freq: 2200, q: 0.8, gain: 0.08, attack: 2 });
    for (let i = 0; i < 4; i++) tone(c, 55, 0.4, { type: 'sine', gain: 0.35, at: i * 0.8 });
  },
  walkStep: (c) => {
    tone(c, 70, 0.35, { type: 'sine', gain: 0.4 });
    hiss(c, 0.25, { freq: 5000, to: 1500, gain: 0.08 });
  },
  unlock: (c) => {
    tone(c, G5, 0.12, { type: 'triangle', gain: 0.14 });
    tone(c, C6, 0.4, { type: 'triangle', gain: 0.14, at: 0.08 });
    hiss(c, 0.3, { freq: 7000, gain: 0.04, at: 0.08 });
  },
  levelUp: (c) => [C5, E5, G5, C6].forEach((n, i) => tone(c, n, i === 3 ? 0.6 : 0.15, { type: 'square', gain: 0.06, at: i * 0.09 })),
  // Fanfare mit Jubel – Titel, Torjägerkanone, Ballon d'Or.
  fanfare: (c) => {
    const seq: [number, number, number][] = [[G4, 0, 0.18], [C5, 0.18, 0.18], [E5, 0.36, 0.18], [G5, 0.54, 0.9]];
    for (const [n, at, d] of seq) {
      tone(c, n, d, { type: 'sawtooth', gain: 0.07, at, attack: 0.02 });
      tone(c, n * 2, d, { type: 'triangle', gain: 0.05, at });
    }
    chord(c, [C4, E4, G4], 1.4, { type: 'sawtooth', gain: 0.035, at: 0.54, attack: 0.05 });
    hiss(c, 2.4, { freq: 1100, q: 0.4, gain: 0.2, at: 0.4, attack: 0.3 });
  },
  transfer: (c) => {
    hiss(c, 0.45, { freq: 300, to: 5000, gain: 0.16, q: 2 });
    chord(c, [D5, A4 * 2], 0.5, { type: 'triangle', gain: 0.08, at: 0.35 });
  },
  rise: (c) => [C5, D5, E5, G5, C6].forEach((n, i) => tone(c, n, 0.25, { type: 'triangle', gain: 0.1, at: i * 0.07 })),
  fall: (c) => {
    [G4, F4, E4 * 0.95, C4].forEach((n, i) => tone(c, n, 0.4, { type: 'triangle', gain: 0.12, at: i * 0.22 }));
    hiss(c, 1, { freq: 400, gain: 0.05, at: 0.2 });
  },
  notify: (c) => {
    tone(c, E5, 0.18, { type: 'sine', gain: 0.14 });
    tone(c, C6, 0.45, { type: 'sine', gain: 0.12, at: 0.1 });
  },
  error: (c) => tone(c, 140, 0.18, { type: 'square', gain: 0.06 }),
  // Casino: kurzer Tick (Walzen, Rad, Plinko-Pfosten)
  tick: (c) => tone(c, 2400 + Math.random() * 600, 0.03, { type: 'square', gain: 0.035 }),
  // Tor: Publikum jubelt auf, tiefer Schlag
  goal: (c) => {
    hiss(c, 1.6, { freq: 1100, q: 0.45, gain: 0.32, attack: 0.08 });
    hiss(c, 1.2, { freq: 2600, q: 0.9, gain: 0.1, attack: 0.1 });
    tone(c, 80, 0.4, { type: 'sine', gain: 0.4, to: 45 });
  },
  // Kasse: zwei helle Glocken + Münzrascheln
  cash: (c) => {
    tone(c, 2093, 0.25, { type: 'triangle', gain: 0.12 });
    tone(c, 2637, 0.5, { type: 'triangle', gain: 0.12, at: 0.08 });
    for (let i = 0; i < 5; i++) tone(c, 3000 + i * 300, 0.05, { type: 'square', gain: 0.03, at: 0.12 + i * 0.04 });
  },
  // Verloren / Crash: dumpfer Schlag mit Rauschen
  boom: (c) => {
    tone(c, 110, 0.6, { type: 'sine', gain: 0.5, to: 35 });
    hiss(c, 0.7, { freq: 900, to: 120, gain: 0.3, q: 0.6, type: 'lowpass' });
  },
  // Jackpot: Glockenkaskade + Fanfaren-Akkord + Jubel
  jackpot: (c) => {
    for (let i = 0; i < 14; i++) tone(c, [C6, E6, G5 * 2][i % 3] * (1 + (i % 4) * 0.01), 0.3, { type: 'triangle', gain: 0.08, at: i * 0.07 });
    chord(c, [C4, E4, G4, C5], 2.2, { type: 'sawtooth', gain: 0.04, at: 0.9, attack: 0.08 });
    hiss(c, 3, { freq: 1100, q: 0.4, gain: 0.28, at: 0.6, attack: 0.4 });
  },
};

/** Ton in steigender Höhe (Spannung): Stufe 0, 1, 2 … – je höher, desto heller. */
export function playStep(step: number): void {
  if (!getSettings().sound) return;
  const c = audio();
  if (!c) return;
  try {
    const f = 440 * 2 ** (Math.min(step, 24) / 12);
    tone(c, f, 0.18, { type: 'triangle', gain: 0.11 });
    tone(c, f * 2, 0.12, { type: 'sine', gain: 0.05, at: 0.02 });
  } catch {
    // egal
  }
}

/** Sound abspielen – nur wenn Sounds in den Einstellungen an sind. Fehler werden still ignoriert. */
export function play(id: SoundId): void {
  if (!getSettings().sound) return;
  const c = audio();
  if (!c) return;
  try {
    SOUNDS[id](c);
  } catch {
    // Kein Ton ist besser als ein Absturz.
  }
}

/** Aufladeton beim Gedrückthalten (steigt an). Gibt eine Funktion zum Abbrechen zurück. */
export function playCharge(ms: number): () => void {
  if (!getSettings().sound) return () => {};
  const c = audio();
  if (!c) return () => {};
  try {
    const t0 = c.currentTime;
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(260, t0);
    osc.frequency.exponentialRampToValueAtTime(980, t0 + ms / 1000);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(0.09, t0 + 0.08);
    osc.connect(g).connect(outNode(c));
    osc.start(t0);
    osc.stop(t0 + ms / 1000 + 0.05);
    return () => {
      try {
        g.gain.cancelScheduledValues(c.currentTime);
        g.gain.setTargetAtTime(0.0001, c.currentTime, 0.03);
        osc.stop(c.currentTime + 0.12);
      } catch {
        // schon vorbei
      }
    };
  } catch {
    return () => {};
  }
}

/** Leiser Klick bei jedem Knopfdruck (einmal im App-Start registrieren). */
export function installClickSound(): () => void {
  const onDown = (e: PointerEvent) => {
    const el = (e.target as Element | null)?.closest?.('button, [role="button"], .cs-choice, a');
    if (el && !(el as HTMLButtonElement).disabled) play('tap');
  };
  document.addEventListener('pointerdown', onDown, { capture: true, passive: true });
  return () => document.removeEventListener('pointerdown', onDown, { capture: true });
}

// ---------- Plinko: übersteuerte, fette Sounds ----------
// Eigener Kanal mit Verzerrung (WaveShaper) und einem Begrenzer dahinter: klingt brachial „übersteuert“,
// bleibt aber unter einer festen Höchstlautstärke und folgt dem Lautstärkeregler.
let crunchIn: GainNode | null = null;
function crunchBus(c: AudioContext): GainNode {
  if (crunchIn) return crunchIn;
  const drive = c.createWaveShaper();
  const k = 400; const n = 2048; const curve = new Float32Array(n);
  for (let i = 0; i < n; i++) { const x = (i * 2) / n - 1; curve[i] = ((1 + k) * x) / (1 + k * Math.abs(x)); }
  drive.curve = curve;
  drive.oversample = '2x';
  const bass = c.createBiquadFilter(); bass.type = 'lowshelf'; bass.frequency.value = 140; bass.gain.value = 12;
  const limiter = c.createDynamicsCompressor();
  limiter.threshold.value = -6; limiter.knee.value = 0; limiter.ratio.value = 20; limiter.attack.value = 0.002; limiter.release.value = 0.12;
  const out = c.createGain(); out.gain.value = 2.2;
  crunchIn = c.createGain();
  crunchIn.connect(drive).connect(bass).connect(limiter).connect(out).connect(master!);
  return crunchIn;
}
function hit(c: AudioContext, bus: GainNode, freq: number, dur: number, o: { type?: OscillatorType; gain?: number; at?: number; to?: number } = {}) {
  const t0 = c.currentTime + (o.at ?? 0);
  const osc = c.createOscillator(); const g = c.createGain();
  osc.type = o.type ?? 'square';
  osc.frequency.setValueAtTime(freq, t0);
  if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(o.gain ?? 0.5, t0 + 0.004);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g).connect(bus);
  osc.start(t0); osc.stop(t0 + dur + 0.05);
}
function crack(c: AudioContext, bus: GainNode, dur: number, gain: number, at = 0, freq = 1800) {
  const t0 = c.currentTime + at;
  const src = c.createBufferSource(); src.buffer = noise(c);
  const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = 0.8;
  const g = c.createGain();
  g.gain.setValueAtTime(gain, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(f).connect(g).connect(bus);
  src.start(t0, Math.random()); src.stop(t0 + dur + 0.05);
}
let lastPeg = 0;
/** Plinko-Sounds: Abwurf, Pfosten (Tonhöhe steigt mit der Reihe), Landung nach Multiplikator. */
export function plinkoSound(kind: 'drop' | 'peg' | 'land', v = 0): void {
  if (!getSettings().sound) return;
  const c = audio();
  if (!c) return;
  try {
    const bus = crunchBus(c);
    if (kind === 'drop') {
      hit(c, bus, 90, 0.22, { type: 'sawtooth', to: 40, gain: 0.7 });
      crack(c, bus, 0.08, 0.6, 0, 3000);
    } else if (kind === 'peg') {
      const now = c.currentTime;
      if (now - lastPeg < 0.03) return; // Dauerfeuer bündeln
      lastPeg = now;
      hit(c, bus, 220 * 2 ** (Math.min(v, 16) / 8), 0.07, { type: 'square', gain: 0.32 });
    } else {
      const m = v;
      if (m < 1) { hit(c, bus, 70, 0.18, { type: 'sine', to: 45, gain: 0.45 }); return; }
      // Bass-Schlag + Knall, je höher der Multiplikator, desto mehr Schichten
      hit(c, bus, 60, 0.5, { type: 'sine', to: 30, gain: 0.9 });
      crack(c, bus, 0.25, 0.8);
      if (m >= 2) hit(c, bus, 520, 0.25, { type: 'sawtooth', to: 1040, gain: 0.45, at: 0.04 });
      if (m >= 10) {
        [523, 659, 784, 1047].forEach((f, i) => hit(c, bus, f, 0.35, { type: 'square', gain: 0.4, at: 0.08 + i * 0.07 }));
        hit(c, bus, 45, 1.1, { type: 'sawtooth', to: 25, gain: 0.9, at: 0.05 });
      }
      if (m >= 100) {
        crack(c, bus, 1.2, 1, 0.1, 900);
        [1047, 1319, 1568, 2093, 2637].forEach((f, i) => hit(c, bus, f, 0.5, { type: 'square', gain: 0.38, at: 0.4 + i * 0.09 }));
        hit(c, bus, 35, 1.8, { type: 'sawtooth', to: 20, gain: 1, at: 0.3 });
      }
    }
  } catch {
    // ohne Ton
  }
}

let lastHorn = 0;
/** Schiffshorn für große Gewinne: tiefer, übersteuerter Akkord (läuft über den Verzerrer, höchstens alle 2,5 s). */
export function playHorn(power = 1): void {
  if (!getSettings().sound) return;
  const c = audio();
  if (!c) return;
  const now = c.currentTime;
  if (now - lastHorn < 2.5) return;
  lastHorn = now;
  try {
    const bus = crunchBus(c);
    const dur = 1.6 + Math.min(1.2, power * 0.4);
    for (const [f, g] of [[55, 0.9], [82.5, 0.7], [110, 0.55], [165, 0.3]] as const) {
      const t0 = c.currentTime;
      const osc = c.createOscillator(); const gn = c.createGain();
      const lfo = c.createOscillator(); const lg = c.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(f * 0.94, t0);
      osc.frequency.linearRampToValueAtTime(f, t0 + 0.15);
      lfo.frequency.value = 5.5; lg.gain.value = f * 0.012;
      lfo.connect(lg).connect(osc.frequency);
      gn.gain.setValueAtTime(0.0001, t0);
      gn.gain.exponentialRampToValueAtTime(g, t0 + 0.08);
      gn.gain.setValueAtTime(g, t0 + dur - 0.35);
      gn.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      osc.connect(gn).connect(bus);
      osc.start(t0); lfo.start(t0); osc.stop(t0 + dur + 0.05); lfo.stop(t0 + dur + 0.05);
    }
  } catch {
    // ohne Ton
  }
}

let lastMoo = -10;
/**
 * Übersteuertes „Muuuh“ beim Fallen eines Plinko-Balls – komplett synthetisch erzeugt (keine Aufnahme).
 * Tiefe Sägezahn-Stimme mit „M“-Anfang (Filter öffnet sich), Tonhöhe erst rauf, dann runter,
 * zwei Formant-Filter machen daraus einen Kuh-Vokal. Läuft über den Verzerrer, max. alle 0,7 s.
 */
export function playMoo(): void {
  if (!getSettings().sound) return;
  const c = audio();
  if (!c) return;
  const now = c.currentTime;
  if (now - lastMoo < 0.7) return;
  lastMoo = now;
  try {
    const bus = crunchBus(c);
    const t0 = now;
    const dur = 0.85 + Math.random() * 0.25;
    const base = 105 + Math.random() * 30;
    const out = c.createGain();
    out.gain.setValueAtTime(0.0001, t0);
    out.gain.exponentialRampToValueAtTime(1.1, t0 + 0.1);
    out.gain.setValueAtTime(1.1, t0 + dur * 0.7);
    out.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    // „M“ → „UUH“: Tiefpass öffnet sich am Anfang
    const lp = c.createBiquadFilter(); lp.type = 'lowpass';
    lp.frequency.setValueAtTime(250, t0); lp.frequency.exponentialRampToValueAtTime(1800, t0 + 0.18);
    lp.frequency.exponentialRampToValueAtTime(700, t0 + dur);
    const f1 = c.createBiquadFilter(); f1.type = 'bandpass'; f1.frequency.value = 520; f1.Q.value = 3;
    const f2 = c.createBiquadFilter(); f2.type = 'bandpass'; f2.frequency.value = 1050; f2.Q.value = 5;
    const g2 = c.createGain(); g2.gain.value = 0.6;
    for (const det of [1, 1.006, 0.497]) {
      const osc = c.createOscillator(); osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(base * 0.8 * det, t0);
      osc.frequency.linearRampToValueAtTime(base * 1.15 * det, t0 + dur * 0.3);
      osc.frequency.linearRampToValueAtTime(base * 0.7 * det, t0 + dur);
      const lfo = c.createOscillator(); const lg = c.createGain();
      lfo.frequency.value = 6; lg.gain.value = base * 0.02;
      lfo.connect(lg).connect(osc.frequency);
      osc.connect(lp);
      osc.start(t0); lfo.start(t0); osc.stop(t0 + dur + 0.05); lfo.stop(t0 + dur + 0.05);
    }
    lp.connect(f1).connect(out);
    lp.connect(f2).connect(g2).connect(out);
    lp.connect(out);
    out.connect(bus);
  } catch {
    // ohne Ton
  }
}
