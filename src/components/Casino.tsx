import { useEffect, useRef, useState } from 'react';
import { PAY2, PAY2_SEVEN, SYMBOLS, betOptions, randomSymbol, spin, symbolIcon } from '../game/casino';
import { cashOf, formatMoney } from '../game/player';
import type { Career } from '../game/types';
import { useCountUp } from '../hooks/useCountUp';
import Confetti from './Confetti';

interface Props {
  career: Career;
  onChange: (c: Career) => void;
  onClose: () => void;
}

const ROW = 76;
const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

/** Glückspalast: ein Spielautomat mit drei echten, nacheinander stoppenden Walzen. Nur Spielgeld. */
export default function Casino({ career, onChange, onClose }: Props) {
  const options = betOptions(career);
  const [bet, setBet] = useState(() => options[Math.min(1, options.length - 1)]?.amount ?? 0);
  const [spinId, setSpinId] = useState(0);
  const [pending, setPending] = useState<Career | null>(null);
  const [stopped, setStopped] = useState(0);
  const [pulled, setPulled] = useState(false);
  const spinning = !!pending;
  const cash = cashOf(career);
  const shownCash = useCountUp(spinning ? cash - (pending?.casino?.last?.bet ?? 0) : cash, { duration: 700 });
  const last = career.casino?.last;
  const targets = (pending ?? career).casino?.last?.reels ?? ['seven', 'trophy', 'ball'];
  // Einsatz passt nicht mehr (z. B. nach Verlust)? Auf den größten möglichen gehen.
  const effectiveBet = Math.min(bet, cash);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !spinning) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const go = () => {
    if (spinning || effectiveBet <= 0) return;
    const next = spin(career, effectiveBet);
    if (next === career) return;
    setPulled(true);
    setTimeout(() => setPulled(false), 450);
    setStopped(0);
    setPending(next);
    setSpinId((n) => n + 1);
  };

  const onReelStop = (index: number) => {
    setStopped(index + 1);
    if (index === 2 && pending) {
      onChange(pending);
      setPending(null);
    }
  };

  const showResult = !spinning && spinId > 0 && last;
  const bigWin = showResult && last.factor >= 10;

  return (
    <div className="casino" role="dialog" aria-modal="true" aria-label="Glückspalast">
      {bigWin && <Confetti key={spinId} pieces={90} />}
      <div className="casino-inner">
        <header className="casino-head">
          <button className="nav-back casino-back" onClick={onClose} disabled={spinning}>‹ Zurück</button>
          <p className="eyebrow">Glückspalast</p>
          <h1>Einarmiger Bandit</h1>
          <p className="casino-balance">
            Konto <strong>{formatMoney(Math.max(0, Math.round(shownCash)))}</strong>
          </p>
        </header>

        <div className={`slot ${showResult && last.win > 0 ? 'won' : ''} ${bigWin ? 'big' : ''}`}>
          <div className="slot-lights" aria-hidden="true">
            {Array.from({ length: 14 }, (_, i) => <span key={i} className={spinning ? 'blink' : ''} style={{ animationDelay: `${(i % 2) * 0.25}s` }} />)}
          </div>
          <div className="slot-window">
            {[0, 1, 2].map((i) => (
              <Reel key={i} index={i} target={targets[i]} spinId={spinId} onStop={onReelStop} highlight={!!showResult && last.win > 0 && isWinning(last.reels, i)} />
            ))}
            <div className="slot-payline" aria-hidden="true" />
          </div>
          <div className={`lever ${pulled ? 'pulled' : ''}`} aria-hidden="true" onClick={go}>
            <span className="lever-stick" />
            <span className="lever-knob" />
          </div>
        </div>

        <p className="slot-result" aria-live="polite">
          {spinning
            ? stopped < 3 ? 'Die Walzen drehen …' : ''
            : showResult
              ? last.win > 0
                ? `${last.factor >= 50 ? 'JACKPOT! ' : last.factor >= 10 ? 'Großer Gewinn! ' : 'Gewonnen: '}+${formatMoney(last.win)} (×${last.factor.toLocaleString('de-DE')})`
                : `Leider nichts. −${formatMoney(last.bet)}`
              : 'Einsatz wählen und drehen.'}
          {showResult && last.paparazzi && <span className="slot-paparazzi">📸 Ein Paparazzo hat dich erwischt – Trainervertrauen −1.</span>}
        </p>

        <div className="chips casino-bets" role="radiogroup" aria-label="Einsatz">
          {options.map((o) => (
            <button
              key={o.label}
              role="radio"
              aria-checked={bet === o.amount}
              className={`chip ${bet === o.amount ? 'active' : ''}`}
              disabled={spinning || o.amount > cash}
              onClick={() => setBet(o.amount)}
            >
              {o.label}
              <small>{formatMoney(o.amount)}</small>
            </button>
          ))}
        </div>

        <button className="btn primary big spin-btn" onClick={go} disabled={spinning || effectiveBet <= 0}>
          {cash <= 0 ? 'Pleite 💸' : spinning ? 'Dreht …' : `Drehen · ${formatMoney(effectiveBet)}`}
        </button>

        <details className="paytable">
          <summary>Gewinntabelle</summary>
          <ul>
            {SYMBOLS.map((s) => (
              <li key={s.id}><span>{s.icon}{s.icon}{s.icon}</span><strong>×{s.pay3}</strong></li>
            ))}
            <li><span>{symbolIcon('seven')}{symbolIcon('seven')} + beliebig</span><strong>×{PAY2_SEVEN}</strong></li>
            <li><span>Zwei Gleiche</span><strong>×{PAY2.toLocaleString('de-DE')}</strong></li>
          </ul>
        </details>

        {career.casino && (
          <p className="casino-stats">
            {career.casino.spins} Drehungen · eingesetzt {formatMoney(career.casino.wagered)} · gewonnen {formatMoney(career.casino.won)}
            {career.casino.biggestWin > 0 && ` · höchster Gewinn ${formatMoney(career.casino.biggestWin)}`}
          </p>
        )}
        <p className="casino-note">Nur Spielgeld aus dem Gehalt deines Spielers. Auf Dauer gewinnt die Bank – hier wie im echten Leben.</p>
      </div>
    </div>
  );
}

function isWinning(reels: string[], i: number): boolean {
  const same = reels.filter((r) => r === reels[i]).length;
  return same >= 2;
}

/** Eine Walze: ein Streifen Symbole, der nach unten durchläuft und auf dem Ziel stoppt. */
function Reel({ index, target, spinId, onStop, highlight }: { index: number; target: string; spinId: number; onStop: (i: number) => void; highlight: boolean }) {
  const [strip, setStrip] = useState<string[]>(() => [randomSymbol(), target, randomSymbol()]);
  const [offset, setOffset] = useState(0);
  const [moving, setMoving] = useState(false);
  const [duration, setDuration] = useState(0);
  const stripRef = useRef(strip);
  stripRef.current = strip;
  const stopRef = useRef(onStop);
  stopRef.current = onStop;

  useEffect(() => {
    if (!spinId) return;
    const quick = reducedMotion();
    const ms = quick ? 250 : 1300 + index * 500;
    const fillers = Array.from({ length: quick ? 3 : 22 + index * 8 }, randomSymbol);
    // Oben das Ergebnis, unten die aktuell sichtbaren Symbole – der Streifen läuft von unten nach oben ins Bild, also rollen die Symbole nach unten.
    const s = [randomSymbol(), target, randomSymbol(), ...fillers, ...stripRef.current];
    const start = -(s.length - 3) * ROW;
    setMoving(false);
    setDuration(ms);
    setStrip(s);
    setOffset(start);
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        setMoving(true);
        setOffset(0);
      });
    });
    const t = setTimeout(() => {
      setMoving(false);
      setStrip(s.slice(0, 3));
      stopRef.current(index);
    }, ms + 60);
    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
      clearTimeout(t);
    };
    // Nur bei einer neuen Drehung starten.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spinId]);

  return (
    <div className={`reel ${moving ? 'spinning' : ''} ${highlight ? 'hit' : ''}`}>
      <div
        className="reel-strip"
        style={{
          transform: `translateY(${offset}px)`,
          transition: moving ? `transform ${duration}ms cubic-bezier(.15,.75,.25,1.03)` : 'none',
        }}
      >
        {strip.map((id, k) => (
          <div key={k} className={`reel-cell ${k === 1 && !moving ? 'center' : ''}`} style={{ height: ROW }}>{symbolIcon(id)}</div>
        ))}
      </div>
    </div>
  );
}
