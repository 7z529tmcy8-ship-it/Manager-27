import { useMemo, useState } from 'react';
import Icon from './Icon';
import ClubCrest from './ClubCrest';
import { getClub, getLeague } from '../data/leagues';
import { nationCode } from '../data/flags';
import { clubLeagueId, currentClubId, seasonLabel } from '../game/player';
import { leagueClubs, leagueStars, prognosisCheck, seasonRankings, squadOf, teamOfSeason, type RankEntry, type StarEntry } from '../game/preview';
import { clubStrength, playerValue } from '../game/player';
import { sortTable } from '../game/season';
import type { Career, SeasonRecord } from '../game/types';

const euro = (v: number) => (v >= 1e9 ? `${(v / 1e9).toLocaleString('de-DE', { maximumFractionDigits: 2 })} Mrd.` : v >= 1e6 ? `${(v / 1e6).toLocaleString('de-DE', { maximumFractionDigits: 1 })} Mio.` : `${Math.round(v / 1e3)} Tsd.`);
const note = (v: number) => v.toFixed(2).replace('.', ',');

function Tabs<T extends string>({ value, tabs, onChange }: { value: T; tabs: [T, string][]; onChange: (t: T) => void }) {
  return (
    <nav className="hf-tabs" role="tablist">
      {tabs.map(([id, label]) => <button key={id} role="tab" aria-selected={value === id} className={value === id ? 'on' : ''} onClick={() => onChange(id)}>{label}</button>)}
    </nav>
  );
}

// ---------- Sonderheft vor der Saison ----------
type HTab = 'league' | 'club' | 'you' | 'stars';
export function SeasonHeft({ career, onClose }: { career: Career; onClose: () => void }) {
  const [tab, setTab] = useState<HTab>('league');
  const p = career.player;
  const clubId = currentClubId(p);
  const leagueId = clubLeagueId(career, clubId);
  const season = seasonLabel(career.year);
  const clubs = useMemo(() => leagueClubs(career, leagueId), [career, leagueId]);
  const squad = useMemo(() => squadOf(clubId, career.year, clubStrength(career, clubId)).filter((x) => x.name !== p.name), [career, clubId, p.name]);
  const stars = useMemo(() => leagueStars(career, leagueId), [career, leagueId]);
  const pg = career.prognoses?.[season];
  const last = career.history[career.history.length - 1];
  const myEntry = { name: p.name, pos: p.position, age: p.age, nation: p.nation, ovr: p.ovr, pot: p.potential, value: playerValue(p), real: false, you: true };
  const fullSquad = [...squad, myEntry].sort((a, b) => ['TW', 'IV', 'AV', 'ZDM', 'ZM', 'ZOM', 'FL', 'ST'].indexOf(a.pos) - ['TW', 'IV', 'AV', 'ZDM', 'ZM', 'ZOM', 'FL', 'ST'].indexOf(b.pos) || b.ovr - a.ovr);
  const squadValue = fullSquad.reduce((a, x) => a + x.value, 0);
  const avgAge = fullSquad.reduce((a, x) => a + x.age, 0) / fullSquad.length;
  return (
    <div className="overlay hf" role="dialog" aria-modal="true" aria-label="Saison-Sonderheft">
      <header className="hf-head">
        <div><small>Saison-Sonderheft</small><b>{season} · {getLeague(leagueId).name}</b></div>
        <button className="hf-x" onClick={onClose} aria-label="Schließen"><Icon name="close" size={20} /></button>
      </header>
      <Tabs<HTab> value={tab} tabs={[['league', 'Liga'], ['club', 'Dein Verein'], ['you', 'Prognose'], ['stars', 'Stars']]} onChange={setTab} />
      <div className="hf-body">
        {tab === 'league' && (
          <>
            <p className="hf-note">Prognose nach Kaderstärke. Kaderwert = Summe der Marktwerte (Schätzung).</p>
            <table className="hf-table">
              <thead><tr><th>Prog.</th><th className="l">Verein</th><th>Stärke</th><th>Kaderwert</th><th>Vorj.</th></tr></thead>
              <tbody>
                {clubs.map((c, i) => (
                  <tr key={c.clubId} className={c.clubId === clubId ? 'me' : ''}>
                    <td>{i + 1}.</td>
                    <td className="l"><span className="hf-club"><i className="hf-crest"><ClubCrest id={c.clubId} size={16} /></i>{getClub(c.clubId).name}{c.promoted && <em className="hf-tag">neu</em>}</span></td>
                    <td>{c.strength.toFixed(0)}</td><td>{euro(c.value)}</td><td>{c.lastPos ? `${c.lastPos}.` : '–'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
        {tab === 'club' && (
          <>
            <div className="hf-kpis">
              <span><small>Kaderwert</small><b>{euro(squadValue)} €</b></span>
              <span><small>Ø-Alter</small><b>{avgAge.toFixed(1).replace('.', ',')}</b></span>
              <span><small>Prognose</small><b>{(clubs.findIndex((c) => c.clubId === clubId) + 1) || '–'}. Platz</b></span>
            </div>
            <table className="hf-table">
              <thead><tr><th className="l">Pos</th><th className="l">Spieler</th><th>Alter</th><th>Nat</th><th>OVR</th><th>Wert</th></tr></thead>
              <tbody>
                {fullSquad.map((x) => (
                  <tr key={x.name} className={x.you ? 'me' : ''}>
                    <td className="l">{x.pos}</td><td className="l">{x.name}</td><td>{x.age}</td><td>{nationCode(x.nation)}</td><td><b>{x.ovr}</b></td><td>{euro(x.value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="hf-note">Echte Spieler aus der Datenbank, der Rest des Kaders ist erfunden. Wertungen sind eigene Schätzungen.</p>
          </>
        )}
        {tab === 'you' && (
          <>
            <div className="hf-you">
              <span className="hf-crest-lg"><ClubCrest id={clubId} size={32} /></span>
              <div><b>{p.name}</b><small>{p.position} · {p.age} Jahre · OVR {p.ovr} · Potenzial {p.potential}</small></div>
            </div>
            {pg ? (
              <table className="hf-table hf-cmp">
                <thead><tr><th className="l">Wert</th><th>Prognose</th><th>Vorjahr</th></tr></thead>
                <tbody>
                  <tr><td className="l">Einsätze</td><td><b>{pg.apps}</b></td><td>{last ? last.apps : '–'}</td></tr>
                  <tr><td className="l">Tore</td><td><b>{pg.goals}</b></td><td>{last ? last.goals : '–'}</td></tr>
                  <tr><td className="l">Vorlagen</td><td><b>{pg.assists}</b></td><td>{last ? last.assists : '–'}</td></tr>
                  <tr><td className="l">Ø-Note</td><td><b>{note(pg.rating)}</b></td><td>{last?.avgRating ? note(last.avgRating) : '–'}</td></tr>
                  <tr><td className="l">Tabellenplatz Verein</td><td><b>{pg.clubRank}.</b></td><td>{last?.leaguePosition ? `${last.leaguePosition}.` : '–'}</td></tr>
                </tbody>
              </table>
            ) : <p className="hf-note">Die Prognose entsteht beim Start der Saison.</p>}
            <p className="hf-note">Die Prognose rechnet mit deiner Wertung, der Stärke des Vereins und deiner Vorsaison. Am Saisonende siehst du, ob du sie geschlagen hast.</p>
          </>
        )}
        {tab === 'stars' && (
          <>
            <StarTable title="Die Besten der Liga" list={stars.top} />
            <StarTable title="Torjäger-Favoriten" list={stars.scorers} />
            <StarTable title="Talente (bis 21)" list={stars.talents} pot />
          </>
        )}
      </div>
    </div>
  );
}
function StarTable({ title, list, pot }: { title: string; list: StarEntry[]; pot?: boolean }) {
  return (
    <>
      <h3 className="hf-h">{title}</h3>
      <table className="hf-table">
        <thead><tr><th>#</th><th className="l">Spieler</th><th className="l">Verein</th><th>Alter</th><th>{pot ? 'Pot.' : 'OVR'}</th></tr></thead>
        <tbody>
          {list.map((x, i) => (
            <tr key={x.name} className={x.you ? 'me' : ''}>
              <td>{i + 1}.</td><td className="l">{x.name} <small>{x.pos}</small></td><td className="l"><span className="hf-club"><i className="hf-crest"><ClubCrest id={x.clubId} size={14} /></i>{getClub(x.clubId).name}</span></td><td>{x.age}</td><td><b>{pot ? x.pot : x.ovr}</b></td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

// ---------- Rückblick nach der Saison ----------
type RTab = 'season' | 'plan' | 'ranks' | 'xi' | 'table';
/** Reiter für die Saisonbilanz: deine Saison (children), Prognose, Ranglisten, Elf der Saison, Tabelle. */
export function SeasonReview({ career, record, children }: { career: Career; record: SeasonRecord; children: React.ReactNode }) {
  const [tab, setTab] = useState<RTab>('season');
  const check = useMemo(() => prognosisCheck(career, record), [career, record]);
  const ranks = useMemo(() => seasonRankings(career, record), [career, record]);
  const xi = useMemo(() => teamOfSeason(career, record), [career, record]);
  const table = record.table?.length ? sortTable(record.table) : [];
  const tabs: [RTab, string][] = [['season', 'Saison'], ...(check ? [['plan', 'Prognose'] as [RTab, string]] : []), ...(ranks ? [['ranks', 'Ranglisten'] as [RTab, string]] : []), ...(xi.length ? [['xi', 'Elf'] as [RTab, string]] : []), ...(table.length ? [['table', 'Tabelle'] as [RTab, string]] : [])];
  return (
    <>
      {tabs.length > 1 && <Tabs<RTab> value={tab} tabs={tabs} onChange={setTab} />}
      {tab === 'season' && children}
      {tab === 'plan' && check && (
        <>
          <table className="hf-table hf-cmp">
            <thead><tr><th className="l">Wert</th><th>Prognose</th><th>Wirklich</th></tr></thead>
            <tbody>{check.map((c) => <tr key={c.label}><td className="l">{c.label}</td><td>{c.plan}</td><td className={c.good === true ? 'pos' : c.good === false ? 'neg' : ''}><b>{c.real}</b></td></tr>)}</tbody>
          </table>
          <p className="hf-note">{check.filter((c) => c.good === true).length} von {check.length} Werten besser als vorhergesagt.</p>
        </>
      )}
      {tab === 'ranks' && ranks && (
        <>
          <RankTable title="Torjäger (Liga)" list={ranks.scorers} unit="Tore" />
          <RankTable title="Scorer: Tore + Vorlagen" list={ranks.points} unit="Pkt." />
          <RankTable title="Notenschnitt" list={ranks.ratings} unit="Note" dec />
          <p className="hf-note">Werte der anderen Spieler sind im Spiel berechnet.</p>
        </>
      )}
      {tab === 'xi' && (
        <>
          <ol className="hf-xi">{xi.map((x, i) => <li key={i} className={x.you ? 'me' : ''}><em>{x.pos}</em><span><b>{x.name}</b><small>{getClub(x.clubId).name}</small></span><strong>{note(x.rating)}</strong></li>)}</ol>
          <p className="hf-note">{xi.some((x) => x.you) ? 'Du stehst in der Elf der Saison!' : 'Für die Elf der Saison hat es nicht gereicht.'}</p>
        </>
      )}
      {tab === 'table' && (
        <table className="hf-table">
          <thead><tr><th>#</th><th className="l">Verein</th><th>Sp</th><th>Tore</th><th>Pkt</th></tr></thead>
          <tbody>{table.map((r, i) => <tr key={r.clubId} className={r.clubId === record.clubId ? 'me' : ''}><td>{i + 1}.</td><td className="l">{getClub(r.clubId).name}</td><td>{r.played}</td><td>{r.goalsFor}:{r.goalsAgainst}</td><td><b>{r.points}</b></td></tr>)}</tbody>
        </table>
      )}
    </>
  );
}
function RankTable({ title, list, unit, dec }: { title: string; list: RankEntry[]; unit: string; dec?: boolean }) {
  return (
    <>
      <h3 className="hf-h">{title}</h3>
      <table className="hf-table">
        <thead><tr><th>#</th><th className="l">Spieler</th><th className="l">Verein</th><th>{unit}</th></tr></thead>
        <tbody>
          {list.map((e, i) => (
            <tr key={`${e.name}-${i}`} className={e.you ? 'me' : ''}>
              <td>{e.extra?.includes('Platz') ? e.extra.replace(/.*Platz /, '') : i + 1}.</td>
              <td className="l">{e.name}{e.extra && !e.extra.startsWith('Platz') ? <small> {e.extra.replace(/ · Platz \d+/, '')}</small> : null}</td>
              <td className="l">{getClub(e.clubId).name}</td>
              <td><b>{dec ? note(e.value) : e.value}</b></td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
