import { useEffect, useRef, useState } from 'react';

export interface AgePoint {
  age: number;
  ovr: number;
  /** Zusätzliche Zeilen im Tooltip (nur bei einer einzelnen Linie genutzt). */
  detail?: string[];
}

export interface AgeSeries {
  id: string;
  name: string;
  points: AgePoint[];
}

interface ChartProps {
  series: AgeSeries[];
  title: string;
  /** Bezeichnung des Werts im Tooltip. */
  valueLabel?: string;
  format?: (v: number) => string;
  /** Abstand der Achsenmarken; ohne Angabe automatisch. */
  step?: number;
  padLeft?: number;
}

/** „Schöne“ Schrittweite für Achsenmarken (1, 2, 5 × 10^n). */
export function niceStep(raw: number): number {
  const pow = 10 ** Math.floor(Math.log10(Math.max(raw, 1e-9)));
  const n = raw / pow;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * pow;
}

/**
 * Werte nach Alter – eine Linie pro Karriere (Gesamtwertung, Marktwert …).
 * Farben folgen der Reihenfolge der Serien (series-1 … series-3), nie dem Rang.
 */
export default function AgeChart({ series, title, valueLabel = 'Gesamtwertung', format = String, step, padLeft = 36 }: ChartProps) {
  const PAD = { top: 16, right: 16, bottom: 30, left: padLeft };
  const [hoverAge, setHoverAge] = useState<number | null>(null);
  // Echte Breite messen, damit Schrift und Punkte auf dem Handy nicht mitschrumpfen.
  const boxRef = useRef<HTMLDivElement>(null);
  const [W, setW] = useState(640);
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setW(Math.max(280, Math.round(entry.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const H = W < 480 ? 200 : 240;
  const all = series.flatMap((s) => s.points);
  if (!all.length) return null;

  const minAge = Math.min(...all.map((p) => p.age));
  const maxAge = Math.max(...all.map((p) => p.age));
  const lo = Math.min(...all.map((p) => p.ovr));
  const hi = Math.max(...all.map((p) => p.ovr));
  const st = step ?? niceStep(Math.max(hi - lo, 1) / 4);
  const min = Math.max(lo >= 0 ? 0 : -Infinity, Math.floor((lo - st * 0.3) / st) * st);
  const max = Math.max(min + st, Math.ceil((hi + st * 0.3) / st) * st);
  const span = Math.max(1, maxAge - minAge);
  const x = (age: number) => PAD.left + ((age - minAge) * (W - PAD.left - PAD.right)) / span;
  const y = (v: number) => PAD.top + ((max - v) * (H - PAD.top - PAD.bottom)) / (max - min);
  const ticks: number[] = [];
  for (let v = min; v <= max + 1e-9; v += st) ticks.push(v);
  const ages = Array.from({ length: maxAge - minAge + 1 }, (_, i) => minAge + i);
  const labelEvery = Math.ceil(ages.length / Math.max(4, Math.floor(W / 55)));
  const half = (W - PAD.left - PAD.right) / span / 2;
  const multi = series.length > 1;

  const hovered = hoverAge === null
    ? []
    : series
        .map((s, i) => ({ s, i, p: s.points.find((p) => p.age === hoverAge) }))
        .filter((h) => h.p);
  // Direkte Beschriftung am Linienende, bei Überschneidung auseinandergeschoben.
  const endLabels = multi
    ? series
        .map((s, i) => {
          const last = s.points[s.points.length - 1];
          return { i, name: s.name.split(' ').slice(-1)[0], x: x(last.age), y: y(last.ovr) - 10 };
        })
        .sort((a, b) => a.y - b.y)
    : [];
  for (let k = 1; k < endLabels.length; k++) {
    if (endLabels[k].y - endLabels[k - 1].y < 13) endLabels[k].y = endLabels[k - 1].y + 13;
  }

  const anchor = hovered.length ? Math.min(...hovered.map((h) => h.p!.ovr)) : 0;

  return (
    <figure className="chart">
      <figcaption>{title}</figcaption>
      {multi && (
        <ul className="legend">
          {series.map((s, i) => (
            <li key={s.id}><span className={`swatch s${i + 1}`} />{s.name}</li>
          ))}
        </ul>
      )}
      <div className="chart-box" ref={boxRef}>
        <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} role="img" aria-label={title} onMouseLeave={() => setHoverAge(null)}>
          {ticks.map((t) => (
            <g key={t}>
              <line x1={PAD.left} x2={W - PAD.right} y1={y(t)} y2={y(t)} className="grid" />
              <text x={PAD.left - 8} y={y(t)} className="axis" textAnchor="end" dominantBaseline="middle">{format(t)}</text>
            </g>
          ))}
          {ages.map((a, i) =>
            i % labelEvery === 0 || a === maxAge ? (
              <text key={a} x={x(a)} y={H - 10} className="axis" textAnchor="middle">{a}</text>
            ) : null,
          )}
          {hoverAge !== null && <line x1={x(hoverAge)} x2={x(hoverAge)} y1={PAD.top} y2={H - PAD.bottom} className="crosshair" />}
          {series.map((s, i) => (
            <g key={s.id} className={`s${i + 1}`}>
              <path d={s.points.map((p, k) => `${k ? 'L' : 'M'}${x(p.age)},${y(p.ovr)}`).join(' ')} className="series" />
              {s.points.map((p) => (
                <circle key={p.age} cx={x(p.age)} cy={y(p.ovr)} r={hoverAge === p.age ? 6 : 4} className="marker" />
              ))}
            </g>
          ))}
          {endLabels.map((l) => (
            <text key={l.i} x={l.x} y={l.y} className="end-label" textAnchor="end">{l.name}</text>
          ))}
          {ages.map((a) => (
            <rect
              key={a}
              x={x(a) - half}
              y={0}
              width={half * 2}
              height={H}
              fill="transparent"
              onMouseEnter={() => setHoverAge(a)}
              onTouchStart={() => setHoverAge(a)}
            />
          ))}
        </svg>
        {hovered.length > 0 && hoverAge !== null && (
          <div className="tooltip" style={{ left: `${(x(hoverAge) / W) * 100}%`, top: `${(y(anchor) / H) * 100}%` }}>
            <strong>{hoverAge} Jahre</strong>
            {hovered.map(({ s, i, p }) => (
              <small key={s.id}>
                {multi && <span className={`swatch s${i + 1}`} />}
                {multi ? `${s.name}: ` : `${valueLabel} `}<strong>{format(p!.ovr)}</strong>
                {!multi && p!.detail?.map((d) => <span key={d} className="block">{d}</span>)}
              </small>
            ))}
          </div>
        )}
      </div>
    </figure>
  );
}

/** Punkte einer Karriere: Startwert plus Wert am Ende jeder Saison. */
export function careerPoints(history: { age: number; ovrStart: number; ovrEnd: number }[]): AgePoint[] {
  if (!history.length) return [];
  return [{ age: history[0].age, ovr: history[0].ovrStart }, ...history.map((s) => ({ age: s.age + 1, ovr: s.ovrEnd }))];
}
