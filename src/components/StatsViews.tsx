import { useMemo, useState } from 'react';
import { getClub } from '../data/leagues';
import { careerBook, devRows, attrNames, oppName, fmtGrade, gameSeasons, gameStats, gamesOf, peerCompare, schoolGrade, type Game } from '../game/stats';
import { careerRecords } from '../game/legacy';
import { listCareers } from '../game/storage';
import type { Career } from '../game/types';

const note = (v: number | null | undefined) => (v ? v.toFixed(2).replace('.', ',') : '–');
const euro = (v: number) => (v >= 1e6 ? `${(v / 1e6).toLocaleString('de-DE', { maximumFractionDigits: 1 })} Mio.` : `${Math.round(v / 1e3)} Tsd.`);
const GRADE_KEY = 'fc-school-grade';

// ---------- Spiele ----------
export function GamesView({ career }: { career: Career }) {
  const seasons = gameSeasons(career);
  const [season, setSeason] = useState<string | 'live'>(() => seasons[0]?.id ?? 'live');
  const [school, setSchool] = useState(() => { try { return localStorage.getItem(GRADE_KEY) === '1'; } catch { return false; } });
  const games = useMemo(() => gamesOf(career, season), [career, season]);
  const st = useMemo(() => gameStats(games), [games]);
  if (!seasons.length) return <section className="cs-window st"><h2>Spiele</h2><p className="cs-sub">Ab der nächsten gespielten Partie wird jedes Spiel einzeln gespeichert.</p></section>;
  const toggle = () => { const n = !school; setSchool(n); try { localStorage.setItem(GRADE_KEY, n ? '1' : '0'); } catch { /* egal */ } };
  const showNote = (r: number | null) => (r === null ? '–' : school ? fmtGrade(schoolGrade(r)) : r.toFixed(1).replace('.', ','));
  const avgShown = st.avg === null ? '–' : school ? fmtGrade(schoolGrade(st.avg)) : note(st.avg);
  return (
    <section className="cs-window st">
      <div className="sv-head">
        <h2>Spiele</h2>
        <button className={`sv-toggle ${school ? 'on' : ''}`} onClick={toggle} aria-pressed={school}>{school ? 'Schulnoten 1–6' : 'Noten 1–10'}</button>
      </div>
      <div className="sv-seasons">{seasons.map((s) => <button key={s.id} className={season === s.id ? 'on' : ''} onClick={() => setSeason(s.id)}>{s.label}</button>)}</div>
      <div className="ss-grid">
        <Tile k="Einsätze" v={`${st.played}`} s={`${st.starts} von Beginn`} />
        <Tile k="Tore" v={`${st.goals}`} s={st.minPerGoal ? `alle ${st.minPerGoal} Min.` : undefined} />
        <Tile k="Vorlagen" v={`${st.assists}`} s={st.share !== null ? `${Math.round(st.share * 100)} % der Teamtore` : undefined} />
        <Tile k="Ø-Note" v={avgShown} s={school ? 'umgerechnet' : undefined} />
        <Tile k="Minuten" v={st.minutes.toLocaleString('de-DE')} />
        <Tile k="Team-Siege" v={`${st.wins}`} s={`${st.draws} Remis · ${st.losses} Niederl.`} />
      </div>
      <h3 className="st-h">Heim und auswärts</h3>
      <table className="hf-table">
        <thead><tr><th className="l"></th><th>Sp</th><th>T</th><th>V</th><th>Note</th></tr></thead>
        <tbody>
          <tr><td className="l">Heim</td><td>{st.home.apps}</td><td>{st.home.goals}</td><td>{st.home.assists}</td><td>{st.home.avg === null ? '–' : showNote(st.home.avg)}</td></tr>
          <tr><td className="l">Auswärts</td><td>{st.away.apps}</td><td>{st.away.goals}</td><td>{st.away.assists}</td><td>{st.away.avg === null ? '–' : showNote(st.away.avg)}</td></tr>
        </tbody>
      </table>
      <h3 className="st-h">Notenverteilung (Schulnoten)</h3>
      <div className="sv-bars">
        {st.buckets.map((b) => {
          const max = Math.max(1, ...st.buckets.map((x) => x.n));
          return <div key={b.label} className="sv-bar"><span>{b.label}</span><i><em style={{ transform: `scaleX(${b.n / max})` }} /></i><b>{b.n}</b></div>;
        })}
      </div>
      <h3 className="st-h">Serien und Höhepunkte</h3>
      <ul className="bo-eff">
        <li><span>Längste Tor-Serie</span><b>{st.scoringStreak} {st.scoringStreak === 1 ? 'Spiel' : 'Spiele'}</b></li>
        <li><span>Längste Serie ohne Niederlage</span><b>{st.unbeaten} Spiele</b></li>
        <li><span>Doppelpacks · Dreierpacks</span><b>{st.braces} · {st.hattricks}</b></li>
        {st.best && <li><span>Bestes Spiel</span><b>{showNote(st.best.rating)} gegen {oppName(st.best.opp)}</b></li>}
        {st.mostGoals && st.mostGoals.goals > 1 && <li><span>Meiste Tore in einem Spiel</span><b>{st.mostGoals.goals} gegen {oppName(st.mostGoals.opp)}</b></li>}
      </ul>
      <h3 className="st-h">Alle Spiele</h3>
      <div className="sv-log">
        <table className="hf-table">
          <thead><tr><th>#</th><th className="l">Gegner</th><th>Erg.</th><th>Min</th><th>T</th><th>V</th><th>Note</th></tr></thead>
          <tbody>{games.map((g, i) => <GameRow key={i} g={g} i={i} show={showNote} />)}</tbody>
        </table>
      </div>
    </section>
  );
}
function GameRow({ g, i, show }: { g: Game; i: number; show: (r: number | null) => string }) {
  const res = g.gf > g.ga ? 'w' : g.gf === g.ga ? 'd' : 'l';
  const comp = g.comp === 'Liga' ? '' : g.comp === 'Pokal' ? 'P' : g.comp === 'Champions League' ? 'CL' : g.comp === 'Europa League' ? 'EL' : 'CO';
  return (
    <tr className={g.min === 0 ? 'sv-off' : ''}>
      <td>{i + 1}</td>
      <td className="l">{g.home ? '' : '@ '}{oppName(g.opp)}{comp && <small> {comp}</small>}</td>
      <td className={`sv-res ${res}`}>{g.gf}:{g.ga}</td>
      <td>{g.min || (g.status === 'injured' ? 'verl.' : '–')}</td><td>{g.goals || ''}</td><td>{g.assists || ''}</td><td><b>{show(g.rating)}</b></td>
    </tr>
  );
}
function Tile({ k, v, s }: { k: string; v: string; s?: string }) {
  return <div className="ss-tile"><small>{k}</small><b>{v}</b>{s && <em>{s}</em>}</div>;
}

// ---------- Entwicklung ----------
export function DevView({ career }: { career: Career }) {
  const rows = devRows(career);
  const peers = peerCompare(career);
  const p = career.player;
  const labels = attrNames(p.position);
  const withAttrs = rows.filter((r) => r.attrs);
  const [open, setOpen] = useState<string | null>(null);
  return (
    <section className="cs-window st">
      <h2>Entwicklung</h2>
      <div className="ss-grid">
        <Tile k="Wertung" v={`${p.ovr}`} s={rows.length ? `Start: ${rows[0].ovrStart}` : undefined} />
        <Tile k="Potenzial" v={`${p.potential}`} />
        <Tile k="Alter" v={`${p.age}`} />
      </div>
      {peers && (
        <>
          <h3 className="st-h">Du gegen echte {p.position}-Spieler ({p.age - 1}–{p.age + 1} Jahre)</h3>
          <ul className="bo-eff">
            <li><span>Dein Platz</span><b>{peers.rank}. von {peers.count + 1}</b></li>
            <li><span>Schnitt der anderen</span><b>{peers.avg.toFixed(1).replace('.', ',')}</b></li>
            {peers.best.map((b) => <li key={b.name}><span>{b.name}</span><b>{b.ovr}</b></li>)}
          </ul>
          <p className="hf-note">Wertungen der echten Spieler sind eigene Schätzungen, grob nach Alter fortgeschrieben.</p>
        </>
      )}
      <h3 className="st-h">Saison für Saison</h3>
      <table className="hf-table">
        <thead><tr><th className="l">Saison</th><th>Alter</th><th>OVR</th><th>+/−</th><th>Pot.</th><th>Wert</th></tr></thead>
        <tbody>
          {[...rows].reverse().map((r) => {
            const d = r.ovrEnd - r.ovrStart;
            return (
              <tr key={r.season} onClick={() => setOpen(open === r.season ? null : r.season)} className="sv-click">
                <td className="l">{r.season}<small> {getClub(r.clubId).name}</small></td><td>{r.age}</td><td><b>{r.ovrEnd}</b></td>
                <td className={d > 0 ? 'pos' : d < 0 ? 'neg' : ''}>{d > 0 ? `+${d}` : d < 0 ? `−${-d}` : '±0'}</td><td>{r.pot ?? '–'}</td><td>{euro(r.value)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {open && (() => { const r = rows.find((x) => x.season === open); return r?.reasons.length ? <p className="hf-note"><b>{r.season}:</b> {r.reasons.join(' ')}</p> : null; })()}
      <p className="hf-note">Zeile antippen: Warum ging es hoch oder runter?</p>
      {withAttrs.length > 0 && (
        <>
          <h3 className="st-h">Attribute</h3>
          <div className="sv-log">
            <table className="hf-table">
              <thead><tr><th className="l">Saison</th>{labels.map((l) => <th key={l}>{l}</th>)}</tr></thead>
              <tbody>
                {[...withAttrs].reverse().map((r, i, arr) => {
                  const prev = arr[i + 1]?.attrs;
                  return (
                    <tr key={r.season}>
                      <td className="l">{r.season}</td>
                      {r.attrs!.map((v, k) => { const d = prev ? v - prev[k] : 0; return <td key={k} className={d > 0 ? 'pos' : d < 0 ? 'neg' : ''}>{v}</td>; })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="hf-note">Grün = gestiegen, Rot = gesunken (zur Vorsaison). Attribute werden ab jetzt jede Saison gespeichert.</p>
        </>
      )}
    </section>
  );
}

// ---------- Rekorde ----------
export function RecordsView({ career }: { career: Career }) {
  const mine = careerBook(career);
  const all = useMemo(() => { try { return careerRecords(listCareers()); } catch { return []; } }, []);
  return (
    <section className="cs-window st">
      <h2>Rekordbuch</h2>
      {mine.length ? (
        <ul className="sv-recs">{mine.map((r) => <li key={r.label}><span><b>{r.label}</b><small>{r.detail}</small></span><strong>{r.value}</strong></li>)}</ul>
      ) : <p className="cs-sub">Nach deiner ersten Saison stehen hier deine Rekorde.</p>}
      {all.length > 0 && (
        <>
          <h3 className="st-h">Bestenliste über alle deine Karrieren</h3>
          <ul className="sv-recs">{all.map((r) => <li key={r.label} className={r.holder === career.player.name ? 'me' : ''}><span><b>{r.label}</b><small>{r.holder} · {r.detail}</small></span><strong>{r.value}</strong></li>)}</ul>
        </>
      )}
      <p className="hf-note">Spielrekorde (Tor-Serie, bestes Spiel) gibt es für Saisons, in denen die Einzelspiele gespeichert sind.</p>
    </section>
  );
}
