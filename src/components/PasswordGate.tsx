import { useEffect, useRef, useState, type ReactNode } from 'react';
import { motionReduced } from '../settings';

// Startbildschirm: Beim Öffnen der Seite läuft kurz ein eigener Ladebildschirm (Flutlicht-Stadion, Wappen,
// Ladebalken), danach geht es ins Spiel. Das Spiel baut sich dahinter schon auf. Pro Tab nur einmal.

export const UNLOCK_KEY = 'fc-manager-unlocked';
export const LOAD_MS = 2200;

const seen = () => { try { return sessionStorage.getItem(UNLOCK_KEY) === '1'; } catch { return false; } };
const remember = () => { try { sessionStorage.setItem(UNLOCK_KEY, '1'); } catch { /* ohne Speicher eben jedes Mal */ } };

/** Ladeverlauf wie bei echten Spielen: mal schnell, mal kurz hängend. [Zeitanteil, Fortschritt] */
const CURVE: [number, number][] = [[0, 0], [0.12, 0.09], [0.26, 0.3], [0.38, 0.36], [0.55, 0.62], [0.66, 0.68], [0.84, 0.93], [0.93, 0.97], [1, 1]];
export function loadProgress(t: number): number {
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  for (let i = 1; i < CURVE.length; i++) {
    const [t1, p1] = CURVE[i];
    if (t <= t1) {
      const [t0, p0] = CURVE[i - 1];
      const k = (t - t0) / (t1 - t0);
      return p0 + (p1 - p0) * (k * k * (3 - 2 * k));
    }
  }
  return 1;
}
const STEPS: [number, string][] = [
  [0, 'Flutlicht geht an …'],
  [35, 'Spieler laufen sich warm …'],
  [70, 'Aufstellung steht …'],
  [100, 'Anpfiff!'],
];
const stepText = (pct: number) => [...STEPS].reverse().find(([at]) => pct >= at)![1];

export default function PasswordGate({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(() => !seen());
  return (
    <>
      {children}
      {loading && <LoadingScreen onDone={() => { remember(); setLoading(false); }} />}
    </>
  );
}

function LoadingScreen({ onDone }: { onDone: () => void }) {
  const [pct, setPct] = useState(0);
  const [out, setOut] = useState(false);
  const bar = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const total = motionReduced() ? 1200 : LOAD_MS;
    const start = performance.now();
    let raf = 0;
    let last = -1;
    let t1: ReturnType<typeof setTimeout> | undefined;
    let t2: ReturnType<typeof setTimeout> | undefined;
    const tick = (now: number) => {
      const p = loadProgress((now - start) / total);
      if (bar.current) bar.current.style.transform = `scaleX(${p})`;
      const n = Math.floor(p * 100);
      if (n !== last) { last = n; setPct(n); }
      if (p < 1) raf = requestAnimationFrame(tick);
      else {
        t1 = setTimeout(() => setOut(true), 280);
        t2 = setTimeout(onDone, 280 + 420);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); clearTimeout(t1); clearTimeout(t2); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className={`boot2 ${out ? 'out' : ''}`} role="progressbar" aria-label="Spiel wird geladen" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
      <div className="boot2-lights" aria-hidden="true"><i className="l1" /><i className="l2" /></div>
      <svg className="boot2-pitch" viewBox="0 0 400 300" aria-hidden="true">
        <rect x="20" y="20" width="360" height="260" rx="6" /><line x1="200" y1="20" x2="200" y2="280" /><circle cx="200" cy="150" r="46" />
        <rect x="20" y="95" width="56" height="110" /><rect x="324" y="95" width="56" height="110" />
      </svg>
      <div className="boot2-center">
        <span className="boot2-crest" aria-hidden="true">
          <svg viewBox="0 0 100 112"><path d="M50 4 94 28v56L50 108 6 84V28Z" /><circle cx="50" cy="56" r="20" /><path d="M50 36v8M50 68v8M30 56h8M62 56h8M50 44l9 6-3 10H44l-3-10Z" /></svg>
        </span>
        <h1 className="boot2-title">Manager<span>Sim</span></h1>
        <p className="boot2-tag">Karriere · Team · Duelle</p>
      </div>
      <div className="boot2-bottom">
        <div className="boot2-status"><span key={stepText(pct)}>{stepText(pct)}</span><b>{pct} %</b></div>
        <div className="boot2-bar"><span ref={bar} /></div>
      </div>
    </div>
  );
}
