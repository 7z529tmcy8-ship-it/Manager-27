import { getSettings } from './settings';

// Sounds werden live im Browser erzeugt (Web Audio API) – keine Audiodateien, nichts zu laden.
// Jeder Sound ist eine kleine Mischung aus Tönen (Oszillatoren) und Rauschen (Wind, Publikum, Pfiff).

export type SoundId =
  | 'tap' | 'coin' | 'spend' | 'whistle' | 'packShake' | 'reveal' | 'revealRare' | 'walkout' | 'walkStep'
  | 'unlock' | 'levelUp' | 'fanfare' | 'transfer' | 'rise' | 'fall' | 'notify' | 'error';

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let noiseBuf: AudioBuffer | null = null;

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
  osc.connect(g).connect(master!);
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
  src.connect(f).connect(g).connect(master!);
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
};

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
    osc.connect(g).connect(master!);
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
