import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { Point } from './data';

/** Breite eines Elements beobachten (Charts zeichnen in echten Pixeln, damit Schrift nicht verzerrt). */
export function useWidth<T extends HTMLElement>(): [React.RefObject<T | null>, number] {
  const ref = useRef<T>(null);
  const [w, setW] = useState(600);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(260, Math.floor(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, w];
}

export const fmt = (v: number, d = 2) => v.toLocaleString('de-DE', { minimumFractionDigits: d, maximumFractionDigits: d });
export const pct = (v: number, d = 1) => `${v >= 0 ? '+' : '−'}${fmt(Math.abs(v * 100), d)} %`;
export const dateLabel = (t: number, withDay = true) =>
  new Date(t).toLocaleDateString('de-DE', withDay ? { day: '2-digit', month: '2-digit', year: '2-digit', timeZone: 'UTC' } : { month: 'short', year: '2-digit', timeZone: 'UTC' });

export interface Line {
  id: string;
  label: string;
  /** Kategorie-Slot 1–4 (feste Reihenfolge, Farbe folgt der Reihe, nicht dem Rang). */
  slot: number;
  values: (number | null)[];
}

interface ChartProps {
  times: number[];
  lines: Line[];
  height?: number;
  /** Formatierung der y-Werte (Achse + Tooltip). */
  format?: (v: number) => string;
  /** Optionale Referenzlinie (z. B. 100 beim Vergleich). */
  baseline?: number;
  /** Fläche unter der ersten Linie (dezent, wie in Börsen-Apps). */
  area?: boolean;
}

/** Linienchart mit Fadenkreuz-Tooltip, dezentem Raster, Legende und Endbeschriftung. */
export function LineChart({ times, lines, height = 280, format = (v) => fmt(v), baseline, area }: ChartProps) {
  const [wrapRef, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const pad = { l: 8, r: 64, t: 12, b: 24 };
  const w = width - pad.l - pad.r;
  const h = height - pad.t - pad.b;
  const all = lines.flatMap((l) => l.values.filter((v): v is number => v !== null));
  if (baseline !== undefined) all.push(baseline);
  let min = Math.min(...all);
  let max = Math.max(...all);
  const span = max - min || 1;
  min -= span * 0.06;
  max += span * 0.06;
  const n = times.length;
  const x = (i: number) => pad.l + (n <= 1 ? 0 : (i / (n - 1)) * w);
  const y = (v: number) => pad.t + (1 - (v - min) / (max - min)) * h;
  const ticks = niceTicks(min, max, 4);
  const xTicks = [0, Math.floor(n / 3), Math.floor((2 * n) / 3), n - 1].filter((v, i, a) => a.indexOf(v) === i);
  const longRange = n > 300;

  const path = (vals: (number | null)[]) => {
    let d = '';
    let pen = false;
    vals.forEach((v, i) => {
      if (v === null) {
        pen = false;
        return;
      }
      d += `${pen ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`;
      pen = true;
    });
    return d;
  };

  const onMove = (e: React.PointerEvent<SVGRectElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const k = (e.clientX - r.left) / r.width;
    setHover(Math.max(0, Math.min(n - 1, Math.round(k * (n - 1)))));
  };

  const hv = hover ?? null;
  const tipLeft = hv !== null && x(hv) > width / 2;

  return (
    <div className="tchart" ref={wrapRef}>
      {lines.length > 1 && (
        <div className="tlegend">
          {lines.map((l) => (
            <span key={l.id}><i className={`sw s${l.slot}`} />{l.label}</span>
          ))}
        </div>
      )}
      <svg width={width} height={height} role="img" aria-label={lines.map((l) => l.label).join(', ')}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={pad.l} x2={pad.l + w} y1={y(t)} y2={y(t)} className="tgrid" />
            <text x={pad.l + w + 6} y={y(t) + 4} className="taxis">{format(t)}</text>
          </g>
        ))}
        {xTicks.map((i) => (
          <text key={i} x={x(i)} y={height - 6} className="taxis" textAnchor={i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle'}>
            {dateLabel(times[i], !longRange)}
          </text>
        ))}
        {baseline !== undefined && <line x1={pad.l} x2={pad.l + w} y1={y(baseline)} y2={y(baseline)} className="tbase" />}
        {area && lines[0] && (
          <path
            d={`${path(lines[0].values)}L${x(n - 1).toFixed(1)},${pad.t + h}L${x(0).toFixed(1)},${pad.t + h}Z`}
            className={`tarea s${lines[0].slot}`}
          />
        )}
        {lines.map((l) => (
          <path key={l.id} d={path(l.values)} className={`tline s${l.slot}`} />
        ))}
        {/* Endbeschriftung: letzter Wert je Linie */}
        {lines.map((l) => {
          const last = l.values[l.values.length - 1];
          return last === null ? null : (
            <g key={`e${l.id}`}>
              <circle cx={x(n - 1)} cy={y(last)} r={4} className={`tdot s${l.slot}`} />
            </g>
          );
        })}
        {hv !== null && (
          <g pointerEvents="none">
            <line x1={x(hv)} x2={x(hv)} y1={pad.t} y2={pad.t + h} className="tcross" />
            {lines.map((l) => {
              const v = l.values[hv];
              return v === null ? null : <circle key={l.id} cx={x(hv)} cy={y(v)} r={4.5} className={`tdot s${l.slot}`} />;
            })}
          </g>
        )}
        <rect
          x={pad.l}
          y={pad.t}
          width={w}
          height={h}
          fill="transparent"
          onPointerMove={onMove}
          onPointerDown={onMove}
          onPointerLeave={() => setHover(null)}
        />
      </svg>
      {hv !== null && (
        <div className="ttip" style={tipLeft ? { left: 12 } : { right: pad.r + 8 }}>
          <div className="ttip-date">{dateLabel(times[hv])}</div>
          {lines.map((l) => {
            const v = l.values[hv];
            return v === null ? null : (
              <div key={l.id} className="ttip-row"><i className={`sw s${l.slot}`} />{l.label}<b>{format(v)}</b></div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function niceTicks(min: number, max: number, count: number): number[] {
  const raw = (max - min) / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? raw;
  const out: number[] = [];
  for (let v = Math.ceil(min / step) * step; v <= max; v += step) out.push(Math.round(v * 1e6) / 1e6);
  return out;
}

/** Winzige Verlaufslinie für Tabellen (eine Serie, keine Achsen). */
export function Sparkline({ points, width = 90, height = 22 }: { points: Point[]; width?: number; height?: number }) {
  const ps = points.map((p) => p.p);
  const min = Math.min(...ps);
  const max = Math.max(...ps);
  const d = ps
    .map((v, i) => `${i ? 'L' : 'M'}${((i / (ps.length - 1)) * (width - 2) + 1).toFixed(1)},${(height - 2 - ((v - min) / (max - min || 1)) * (height - 4)).toFixed(1)}`)
    .join('');
  return (
    <svg width={width} height={height} className="tspark" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

/** Kleine Tabellen-Hilfe: Zahl mit Vorzeichen, Pfeil und Farbe (Farbe nie allein). */
export function Change({ v, d = 1 }: { v: number; d?: number }): ReactNode {
  return <span className={v >= 0 ? 'tup' : 'tdown'}>{v >= 0 ? '▲' : '▼'} {pct(v, d)}</span>;
}
