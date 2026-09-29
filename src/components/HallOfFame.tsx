import { useMemo, useState } from 'react';
import { careerRecords, summarizeCareer, type CareerSummary } from '../game/legacy';
import { formatMoney } from '../game/player';
import { listCareers } from '../game/storage';
import type { Career } from '../game/types';
import AgeChart, { careerPoints } from './AgeChart';

interface Props {
  onBack: () => void;
  onOpen: (career: Career) => void;
}

type SortKey = 'score' | 'goals' | 'assists' | 'apps' | 'peak' | 'titles' | 'awards' | 'caps';

const COLUMNS: { key: SortKey; label: string }[] = [
  { key: 'score', label: 'Punkte' },
  { key: 'apps', label: 'Spiele' },
  { key: 'goals', label: 'Tore' },
  { key: 'assists', label: 'Vorl.' },
  { key: 'peak', label: 'Höchstw.' },
  { key: 'titles', label: 'Titel' },
  { key: 'awards', label: 'Preise' },
  { key: 'caps', label: 'Ländersp.' },
];

const MAX_COMPARE = 3;

export default function HallOfFame({ onBack, onOpen }: Props) {
  const careers = useMemo(() => listCareers().filter((c) => c.history.length > 0), []);
  const [onlyRetired, setOnlyRetired] = useState(false);
  const [sort, setSort] = useState<SortKey>('score');
  const [selected, setSelected] = useState<string[]>([]);

  const summaries = useMemo(() => careers.map(summarizeCareer), [careers]);
  const shown = summaries
    .filter((s) => !onlyRetired || s.retired)
    .sort((a, b) => b[sort] - a[sort]);
  const records = useMemo(() => careerRecords(careers), [careers]);
  const compared = selected
    .map((id) => summaries.find((s) => s.career.id === id))
    .filter((s): s is CareerSummary => !!s);

  const toggle = (id: string) =>
    setSelected((sel) =>
      sel.includes(id) ? sel.filter((x) => x !== id) : sel.length < MAX_COMPARE ? [...sel, id] : sel,
    );

  return (
    <main className="fame">
      <div className="topbar">
        <button className="nav-back" onClick={onBack}>‹ Zurück</button>
        <div className="topbar-title">
          <h1>Hall of Fame</h1>
          <small>Alle deine Karrieren im Vergleich</small>
        </div>
      </div>

      {careers.length === 0 ? (
        <div className="panel empty">Noch keine Karriere mit gespielter Saison. Starte eine Karriere – sie erscheint dann hier.</div>
      ) : (
        <>
          {records.length > 0 && (
            <div className="panel">
              <h2>Rekorde</h2>
              <div className="tiles records">
                {records.map((r) => (
                  <div key={r.label} className="tile">
                    <span className="tile-label">{r.label}</span>
                    <span className="tile-value">{r.value}</span>
                    <span className="tile-sub"><strong>{r.holder}</strong> · {r.detail}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="panel">
            <div className="panel-head">
              <h2>Rangliste</h2>
              <div className="tabs small">
                <button className={!onlyRetired ? 'active' : ''} onClick={() => setOnlyRetired(false)}>Alle</button>
                <button className={onlyRetired ? 'active' : ''} onClick={() => setOnlyRetired(true)}>Nur beendete</button>
              </div>
            </div>
            <p className="hint">
              Spalte antippen zum Sortieren. Bis zu {MAX_COMPARE} Karrieren zum Vergleichen auswählen.
              Legendenpunkte: Titel, Auszeichnungen, Höchstwertung, Spiele, Tore und Länderspiele.
            </p>
            <div className="table-scroll">
              <table className="stats fame-table">
                <thead>
                  <tr>
                    <th aria-label="Vergleichen" />
                    <th>#</th>
                    <th className="left">Spieler</th>
                    {COLUMNS.map((c) => (
                      <th key={c.key}>
                        <button className={`sort ${sort === c.key ? 'active' : ''}`} onClick={() => setSort(c.key)}>
                          {c.label}{sort === c.key ? ' ▼' : ''}
                        </button>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {shown.map((s, i) => {
                    const checked = selected.includes(s.career.id);
                    return (
                      <tr key={s.career.id} className={checked ? 'own' : ''}>
                        <td>
                          <input
                            type="checkbox"
                            checked={checked}
                            disabled={!checked && selected.length >= MAX_COMPARE}
                            onChange={() => toggle(s.career.id)}
                            aria-label={`${s.career.player.name} vergleichen`}
                          />
                        </td>
                        <td>{i + 1}</td>
                        <td className="left">
                          <button className="link" onClick={() => onOpen(s.career)}>{s.career.player.name}</button>
                          <span className="pill small">{s.retired ? 'beendet' : 'aktiv'}</span>
                          <small className="block muted">{s.career.player.position} · {s.seasons} Saisons · {s.clubs.slice(-1)[0]}</small>
                        </td>
                        {COLUMNS.map((c) => (
                          <td key={c.key} className={sort === c.key ? 'strong' : ''}>{s[c.key]}</td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {compared.length >= 2 ? <Comparison items={compared} /> : (
            <div className="panel empty">Wähle mindestens zwei Karrieren aus, um sie zu vergleichen.</div>
          )}
        </>
      )}
    </main>
  );
}

function Comparison({ items }: { items: CareerSummary[] }) {
  const rows: { label: string; value: (s: CareerSummary) => number | null; format?: (v: number) => string; lowerIsBetter?: boolean }[] = [
    { label: 'Legendenpunkte', value: (s) => s.score },
    { label: 'Saisons', value: (s) => s.seasons },
    { label: 'Spiele', value: (s) => s.apps },
    { label: 'Tore', value: (s) => s.goals },
    { label: 'Vorlagen', value: (s) => s.assists },
    { label: 'Tore pro Spiel', value: (s) => (s.apps ? s.goals / s.apps : 0), format: (v) => v.toFixed(2) },
    { label: 'Ø Note', value: (s) => s.avgRating, format: (v) => v.toFixed(2) },
    { label: 'Höchstwertung', value: (s) => s.peak },
    { label: 'Titel', value: (s) => s.titles },
    { label: 'Auszeichnungen', value: (s) => s.awards },
    { label: 'Ballon d’Or', value: (s) => s.ballonDor },
    { label: 'Länderspiele', value: (s) => s.caps },
    { label: 'Höchster Marktwert', value: (s) => s.topValue, format: formatMoney },
    { label: 'Ablösesummen gesamt', value: (s) => s.transferFees, format: formatMoney },
    { label: 'Vereinslegende', value: (s) => s.legends },
  ];

  return (
    <div className="panel">
      <h2>Vergleich</h2>
      <div className="table-scroll">
        <table className="stats compare">
          <thead>
            <tr>
              <th />
              {items.map((s, i) => (
                <th key={s.career.id}><span className={`swatch s${i + 1}`} />{s.career.player.name}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const values = items.map(r.value);
              const numeric = values.filter((v): v is number => v !== null);
              // Hervorheben nur, wenn sich die Werte unterscheiden.
              const best = numeric.length > 1 && new Set(numeric).size > 1 ? Math.max(...numeric) : null;
              return (
                <tr key={r.label}>
                  <td>{r.label}</td>
                  {values.map((v, i) => (
                    <td key={i} className={v !== null && v === best ? 'best' : ''}>
                      {v === null ? '–' : r.format ? r.format(v) : v}
                    </td>
                  ))}
                </tr>
              );
            })}
            <tr>
              <td>Vereine</td>
              {items.map((s) => <td key={s.career.id} className="wrap">{s.clubs.join(' → ')}</td>)}
            </tr>
          </tbody>
        </table>
      </div>
      <p className="hint">Fett: bester Wert im Vergleich.</p>
      <AgeChart
        title="Gesamtwertung nach Alter"
        series={items.map((s) => ({ id: s.career.id, name: s.career.player.name, points: careerPoints(s.career.history) }))}
      />
    </div>
  );
}
