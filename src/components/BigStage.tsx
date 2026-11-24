import { useState } from 'react';
import Icon from './Icon';
import { getClub } from '../data/leagues';
import { galaAwards, liveWorldRace } from '../game/bigstage';
import { play } from '../sound';
import type { Career, SeasonRecord } from '../game/types';

const nm = (id: string) => { try { return getClub(id).name; } catch { return ''; } };

/** Zwischenstand im Weltfußballer-Ranking (ab Wertung 78). */
export function WorldRaceCard({ career }: { career: Career }) {
  const race = liveWorldRace(career);
  if (!race) return null;
  const me = race.findIndex((e) => e.you);
  const rows = race.slice(0, 5).map((e, i) => ({ e, rank: i + 1 }));
  if (me >= 5) rows.push({ e: race[me], rank: me + 1 });
  return (
    <section className="ws" aria-label="Weltfußballer-Ranking">
      <header><b><Icon name="crown" size={16} /> Weltfußballer-Ranking</b><small>Expertenwertung · Zwischenstand</small></header>
      <ol>
        {rows.map(({ e, rank }) => (
          <li key={e.name} className={e.you ? 'me' : ''}><i>{rank}</i><span>{e.name}<small>{nm(e.clubId)}</small></span><b>{e.points}</b></li>
        ))}
      </ol>
    </section>
  );
}

/** Saison-Gala: Umschläge nacheinander aufdecken. */
export function Gala({ career, record, onClose }: { career: Career; record: SeasonRecord; onClose: () => void }) {
  const awards = galaAwards(career, record);
  const [open, setOpen] = useState<number>(0);
  const reveal = () => {
    if (open >= awards.length) return;
    play(awards[open].won ? 'revealRare' : 'tap');
    setOpen(open + 1);
  };
  const won = awards.filter((a) => a.won).length;
  return (
    <div className="gala" role="dialog" aria-modal="true" aria-label={`Gala der Saison ${record.season}`}>
      <div className="gala-in">
        <small className="gala-kicker">Gala der Saison {record.season}</small>
        <h2>{open >= awards.length ? (won ? `${won} ${won === 1 ? 'Preis' : 'Preise'} für dich!` : 'Nächstes Jahr greifst du an') : 'Und der Preis geht an …'}</h2>
        <ul className="gala-list">
          {awards.map((a, i) => (
            <li key={a.id} className={`${i < open ? 'open' : ''} ${i < open && a.won ? 'won' : ''}`}>
              <span className="gala-env"><Icon name={i < open ? (a.won ? 'trophy' : 'close') : 'gift'} size={20} /></span>
              <span><b>{a.title}</b><small>{i < open ? a.text : 'Umschlag geschlossen'}</small></span>
            </li>
          ))}
        </ul>
        {open < awards.length ? (
          <div className="gala-btns">
            <button className="btn primary big" onClick={reveal}>Umschlag öffnen</button>
            <button className="cs-link" onClick={() => setOpen(awards.length)}>Alle aufdecken</button>
          </div>
        ) : <button className="btn primary big" onClick={onClose}>Weiter</button>}
      </div>
    </div>
  );
}
