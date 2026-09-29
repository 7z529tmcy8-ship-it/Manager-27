import { useEffect, useRef, useState } from 'react';
import { niceStep } from './AgeChart';
import type { SeasonRecord } from '../game/types';

const PAD = { top: 16, right: 12, bottom: 30, left: 32 };

/** Tore und Vorlagen pro Saison als gruppierte Balken. */
export default function SeasonBars({ history }: { history: SeasonRecord[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const [W, setW] = useState(640);
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(280, Math.round(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  if (!history.length) return null;

  const H = W < 480 ? 190 : 230;
  const maxV = Math.max(1, ...history.map((s) => Math.max(s.goals, s.assists)));
  const st = niceStep(maxV / 4);
  const top = Math.ceil(maxV / st) * st;
  const ticks = Array.from({ length: Math.round(top / st) + 1 }, (_, i) => i * st);
  const slot = (W - PAD.left - PAD.right) / history.length;
  const barW = Math.max(3, Math.min(18, (slot - 6) / 2 - 1));
  const y = (v: number) => PAD.top + ((top - v) * (H - PAD.top - PAD.bottom)) / top;
  const base = y(0);
  const labelEvery = Math.ceil(history.length / Math.max(3, Math.floor(W / 70)));
  // Balken mit abgerundeter Oberkante, unten bündig auf der Grundlinie.
  const bar = (x: number, v: number) => {
    const h = base - y(v);
    if (h <= 0) return '';
    const r = Math.min(4, h, barW / 2);
    return `M${x},${base} V${base - h + r} Q${x},${base - h} ${x + r},${base - h} H${x + barW - r} Q${x + barW},${base - h} ${x + barW},${base - h + r} V${base} Z`;
  };
  const h = hover !== null ? history[hover] : null;

  return (
    <figure className="chart">
      <figcaption>Tore und Vorlagen pro Saison</figcaption>
      <ul className="legend">
        <li><span className="swatch s1" />Tore</li>
        <li><span className="swatch s2" />Vorlagen</li>
      </ul>
      <div className="chart-box" ref={boxRef}>
        <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} role="img" aria-label="Tore und Vorlagen pro Saison" onMouseLeave={() => setHover(null)}>
          {ticks.map((t) => (
            <g key={t}>
              <line x1={PAD.left} x2={W - PAD.right} y1={y(t)} y2={y(t)} className="grid" />
              <text x={PAD.left - 8} y={y(t)} className="axis" textAnchor="end" dominantBaseline="middle">{t}</text>
            </g>
          ))}
          {history.map((s, i) => {
            const cx = PAD.left + slot * i + slot / 2;
            return (
              <g key={s.season} opacity={hover === null || hover === i ? 1 : 0.45}>
                <path d={bar(cx - barW - 1, s.goals)} className="bar-fill s1" />
                <path d={bar(cx + 1, s.assists)} className="bar-fill s2" />
                {(i % labelEvery === 0 || i === history.length - 1) && (
                  <text x={cx} y={H - 10} className="axis" textAnchor="middle">{s.season.slice(2)}</text>
                )}
                <rect x={PAD.left + slot * i} y={0} width={slot} height={H} fill="transparent"
                  onMouseEnter={() => setHover(i)} onTouchStart={() => setHover(i)} />
              </g>
            );
          })}
        </svg>
        {h && hover !== null && (
          <div className="tooltip" style={{ left: `${((PAD.left + slot * hover + slot / 2) / W) * 100}%`, top: `${(y(Math.max(h.goals, h.assists)) / H) * 100}%` }}>
            <strong>{h.season}</strong>
            <small><span className="swatch s1" />Tore: <strong>{h.goals}</strong></small>
            <small><span className="swatch s2" />Vorlagen: <strong>{h.assists}</strong></small>
            <small>{h.apps} Spiele</small>
          </div>
        )}
      </div>
    </figure>
  );
}
