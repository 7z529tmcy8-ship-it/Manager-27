import { useEffect, useRef, useState, type ReactNode } from 'react';
import { motionReduced } from '../settings';
import SecretPage from './SecretPage';

// Startbildschirm: Beim Öffnen der Seite läuft 5 Sekunden ein Ladebildschirm (Titelbild + Ladebalken 0–100 %),
// danach geht es ins Spiel. Das Spiel baut sich dahinter schon auf. Pro Tab nur einmal.
// Die geheime Seite erreicht man über die Adresse …/#larp.

export const UNLOCK_KEY = 'fc-manager-unlocked';
const SECRET_HASH = '#larp';
export const LOAD_MS = 5000;

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
  [0, 'Inhalt wird geladen …'],
  [25, 'Stadion wird aufgebaut …'],
  [50, 'Spieler laufen sich warm …'],
  [75, 'Karten werden gemischt …'],
  [100, 'Anpfiff!'],
];
const stepText = (pct: number) => [...STEPS].reverse().find(([at]) => pct >= at)![1];

export default function PasswordGate({ children }: { children: ReactNode }) {
  const [secret, setSecret] = useState(() => location.hash.toLowerCase() === SECRET_HASH);
  const [loading, setLoading] = useState(() => !seen());
  if (secret) return <SecretPage onLeave={() => { history.replaceState(null, '', location.pathname + location.search); setSecret(false); }} />;
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
    <div className={`boot ${out ? 'out' : ''}`} role="progressbar" aria-label="Spiel wird geladen" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
      <div className="boot-bg" aria-hidden="true" />
      <img className="boot-art" src="/loading.webp" alt="Manager Simulator" width="941" height="1672" fetchPriority="high" decoding="async" />
      <div className="boot-bottom">
        <div className="boot-status">
          <span key={stepText(pct)} className="boot-step">{stepText(pct)}</span>
          <b className="boot-pct">{pct} %</b>
        </div>
        <div className="boot-bar"><span ref={bar} className="boot-fill" /><i className="boot-shine" aria-hidden="true" /></div>
      </div>
    </div>
  );
}
