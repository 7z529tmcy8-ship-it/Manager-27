import { useState } from 'react';
import { getClub } from '../data/leagues';
import type { SeasonRecord } from '../game/types';

const W = 640;
const H = 220;
const PAD = { top: 16, right: 16, bottom: 30, left: 36 };

/** Verlauf der Gesamtwertung über die Karriere (Wert jeweils am Saisonende). */
export default function OvrChart({ history }: { history: SeasonRecord[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const points = [
    { label: `${history[0].age}`, ovr: history[0].ovrStart, season: null as SeasonRecord | null },
    ...history.map((s) => ({ label: `${s.age + 1}`, ovr: s.ovrEnd, season: s })),
  ];
  const values = points.map((p) => p.ovr);
  const min = Math.floor((Math.min(...values) - 2) / 5) * 5;
  const max = Math.ceil((Math.max(...values) + 2) / 5) * 5;
  const x = (i: number) => PAD.left + (i * (W - PAD.left - PAD.right)) / Math.max(1, points.length - 1);
  const y = (v: number) => PAD.top + ((max - v) * (H - PAD.top - PAD.bottom)) / (max - min);
  const ticks: number[] = [];
  for (let v = min; v <= max; v += 5) ticks.push(v);
  const labelEvery = Math.ceil(points.length / 12);
  const path = points.map((p, i) => `${i ? 'L' : 'M'}${x(i)},${y(p.ovr)}`).join(' ');
  const h = hover !== null ? points[hover] : null;

  return (
    <figure className="chart">
      <figcaption>Gesamtwertung nach Alter</figcaption>
      <div className="chart-box">
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Verlauf der Gesamtwertung" onMouseLeave={() => setHover(null)}>
          {ticks.map((t) => (
            <g key={t}>
              <line x1={PAD.left} x2={W - PAD.right} y1={y(t)} y2={y(t)} className="grid" />
              <text x={PAD.left - 8} y={y(t)} className="axis" textAnchor="end" dominantBaseline="middle">{t}</text>
            </g>
          ))}
          {points.map((p, i) =>
            i % labelEvery === 0 || i === points.length - 1 ? (
              <text key={i} x={x(i)} y={H - 10} className="axis" textAnchor="middle">{p.label}</text>
            ) : null,
          )}
          {hover !== null && <line x1={x(hover)} x2={x(hover)} y1={PAD.top} y2={H - PAD.bottom} className="crosshair" />}
          <path d={path} className="series" />
          {points.map((p, i) => (
            <circle key={i} cx={x(i)} cy={y(p.ovr)} r={hover === i ? 6 : 4} className="marker" />
          ))}
          {points.map((_, i) => {
            const half = (W - PAD.left - PAD.right) / Math.max(1, points.length - 1) / 2;
            return (
              <rect
                key={i}
                x={x(i) - half}
                y={0}
                width={half * 2}
                height={H}
                fill="transparent"
                onMouseEnter={() => setHover(i)}
                onTouchStart={() => setHover(i)}
              />
            );
          })}
        </svg>
        {h && hover !== null && (
          <div
            className="tooltip"
            style={{ left: `${(x(hover) / W) * 100}%`, top: `${(y(h.ovr) / H) * 100}%` }}
          >
            <strong>{h.ovr}</strong> mit {h.label} Jahren
            {h.season && (
              <small>
                nach {h.season.season} · {getClub(h.season.clubId).name}
                <br />
                {h.season.apps} Sp. · {h.season.goals} T · {h.season.assists} V
              </small>
            )}
          </div>
        )}
      </div>
    </figure>
  );
}
