import Icon from './Icon';
import ClubCrest from './ClubCrest';
import { getClub } from '../data/leagues';
import { chapters, rivalView } from '../game/story';
import type { Career } from '../game/types';

const nm = (id: string) => { try { return getClub(id).name; } catch { return ''; } };

/** Dein Rivale: gleicher Jahrgang, gleiche Position – Bilanz über die ganze Karriere. */
export function RivalCard({ career }: { career: Career }) {
  const r = rivalView(career);
  if (!r) return null;
  const me = career.player.ovr;
  return (
    <section className="rv" aria-label="Dein Rivale">
      <header><b><Icon name="duel" size={16} /> Dein Rivale</b>{r.retired && <small>Karriere beendet</small>}</header>
      <div className="rv-main">
        <span className="rv-who"><b>{r.name}</b><small><ClubCrest id={r.clubId} size={16} /> {nm(r.clubId)} · {r.age} J.</small></span>
        <span className="rv-ovr"><em className={me >= r.ovr ? 'up' : ''}>{me}</em><i>:</i><em className={r.ovr > me ? 'up' : ''}>{r.ovr}</em><small>Wertung du : er</small></span>
      </div>
      <div className="rv-rec">
        <span><b>{r.record.player}</b><small>Saisons vorn</small></span>
        <span><b>{r.record.draw}</b><small>Gleichauf</small></span>
        <span><b>{r.record.rival}</b><small>Er vorn</small></span>
      </div>
      {r.theirs !== null && (
        <p className="rv-now">Diese Saison: deine Torbeteiligungen <b>{r.mine}</b> – seine (hochgerechnet) <b>~{r.theirs}</b></p>
      )}
    </section>
  );
}

/** Karriere in Kapiteln: eine Überschrift je Vereinsstation. */
export function Chapters({ career }: { career: Career }) {
  const list = chapters(career);
  if (list.length < 1) return null;
  return (
    <ol className="chap" aria-label="Karriere-Kapitel">
      {list.map((c, i) => (
        <li key={`${c.clubId}-${c.from}`}>
          <i>{i + 1}</i>
          <span><b>{c.title}</b><small><ClubCrest id={c.clubId} size={14} /> {c.from === c.to ? c.from : `${c.from} – ${c.to}`} · {c.seasons} {c.seasons === 1 ? 'Saison' : 'Saisons'}</small></span>
        </li>
      ))}
    </ol>
  );
}
