import Icon from './Icon';
import { listCareers } from '../game/storage';
import { careerRecords, hallOfFame, recordHunt, summarizeCareer } from '../game/legacy';
import { halfStats } from '../game/season';
import { chapters } from '../game/story';
import type { Career } from '../game/types';

/** Ruhmeshalle: alle Karrieren nach Legendenpunkten plus Bestwerte. */
export function HallOfFame({ onClose }: { onClose: () => void }) {
  const careers = listCareers();
  const hall = hallOfFame(careers);
  const records = careerRecords(careers);
  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-label="Ruhmeshalle">
      <div className="overlay-inner">
        <header className="overlay-head"><button className="nav-back" onClick={onClose}>‹ Zurück</button></header>
        <h1 className="overlay-title">Ruhmeshalle</h1>
        {hall.length === 0 ? <p className="hint">Noch keine gespielte Saison – deine erste Legende wartet.</p> : (
          <ol className="hof">
            {hall.map((h, i) => (
              <li key={h.career.id} className={i === 0 ? 'top' : ''}>
                <i>{i + 1}</i>
                <span><b>{h.career.player.name}</b><small>{h.retired ? 'Karriere beendet' : 'aktiv'} · {h.seasons} {h.seasons === 1 ? 'Saison' : 'Saisons'} · Bestwert {h.peak} · {h.goals} Tore · {h.titles} Titel</small></span>
                <em>{h.score}<small>Punkte</small></em>
              </li>
            ))}
          </ol>
        )}
        {records.length > 0 && (
          <>
            <h2 className="hof-h">Bestwerte</h2>
            <ul className="hof-rec">
              {records.map((r) => <li key={r.label}><small>{r.label}</small><b>{r.value}</b><span>{r.holder} · {r.detail}</span></li>)}
            </ul>
          </>
        )}
        <p className="hint">Legendenpunkte: Titel, Auszeichnungen, Bestwertung, Spiele, Tore, Länderspiele und Legendenstatus.</p>
      </div>
    </div>
  );
}

/** Rekordjagd in der laufenden Saison (gegen deine eigenen Bestwerte). */
export function RecordHunt({ career }: { career: Career }) {
  const prog = career.progress;
  if (!prog || !prog.matches.length) return null;
  const st = halfStats(prog.matches);
  const hunts = recordHunt(listCareers(), career, { goals: st.goals, assists: st.assists });
  if (!hunts.length) return null;
  return (
    <section className="rh" aria-label="Rekordjagd">
      <header><b><Icon name="trophy" size={16} /> Rekordjagd</b><small>deine Bestwerte aus allen Karrieren</small></header>
      {hunts.map((h) => {
        const done = h.mine > h.record;
        return (
          <div key={h.label} className={`rh-row ${done ? 'done' : ''}`}>
            <span><b>{h.label}</b><small>Rekord {h.record} · {h.you ? 'von dir selbst' : h.holder}</small></span>
            <span className="rh-bar"><i style={{ width: `${Math.min(100, (h.mine / Math.max(1, h.record)) * 100)}%` }} /></span>
            <em>{done ? 'Neuer Rekord!' : `${h.mine} / ${h.record + 1}`}</em>
          </div>
        );
      })}
    </section>
  );
}

/** Abschied am Karriereende: Bilanz, Kapitel und Platz in der Ruhmeshalle. */
export function Farewell({ career }: { career: Career }) {
  if (!career.history.length) return null;
  const s = summarizeCareer(career);
  const hall = hallOfFame(listCareers());
  const rank = hall.findIndex((h) => h.career.id === career.id) + 1;
  const ch = chapters(career);
  const best = [...career.history].sort((a, b) => (b.goals + b.assists) - (a.goals + a.assists))[0];
  return (
    <section className="fw" aria-label="Abschiedsspiel">
      <small className="fw-kicker">Abschiedsspiel</small>
      <h3>Danke, {career.player.name}!</h3>
      <dl>
        <div><dt>Saisons</dt><dd>{s.seasons}</dd></div>
        <div><dt>Spiele</dt><dd>{s.apps}</dd></div>
        <div><dt>Tore</dt><dd>{s.goals}</dd></div>
        <div><dt>Titel</dt><dd>{s.titles}</dd></div>
        <div><dt>Bestwert</dt><dd>{s.peak}</dd></div>
      </dl>
      {best && <p>Beste Saison: {best.season} mit {best.goals} Toren und {best.assists} Vorlagen.</p>}
      {ch.length > 0 && <p className="fw-ch">{ch.map((c) => c.title).join(' · ')}</p>}
      {rank > 0 && <p className="fw-rank"><Icon name="crown" size={16} /> Platz {rank} in deiner Ruhmeshalle · {s.score} Legendenpunkte</p>}
    </section>
  );
}
