import { useState } from 'react';
import CoachPanel from './CoachPanel';
import ScorerRace from './ScorerRace';
import SkillTree, { ArchetypePicker, LevelChip } from './SkillTree';
import { flagOf, nationCode } from '../data/flags';
import { getClub, getLeague } from '../data/leagues';
import { clubLeagueId, currentClubId, formatMoney, playerValue } from '../game/player';
import { halfStats } from '../game/season';
import { freePoints } from '../game/skills';
import { applyChoice, applyWinterChoice, choiceClub, seasonChoices, simulateToBreak, winterChoices, type Choice } from '../game/simple';
import { STAGES_PER_HALF } from '../game/season';
import type { Career, SeasonRecord } from '../game/types';

interface Props {
  career: Career;
  onChange: (c: Career) => void;
  onExit: () => void;
}

/** Farbe der Wertungs-Pille: Weltklasse hellblau, sonst Gold/Silber/Bronze. */
const ovrClass = (ovr: number) => (ovr >= 90 ? 'top' : ovr >= 75 ? 'gold' : ovr >= 65 ? 'silver' : 'bronze');
const money = (v: number) => (v >= 1e6 ? `€${Math.round(v / 1e6)}M` : `€${Math.round(v / 1e3)}K`);

/**
 * Karriere als Zeitleiste: eine Zeile pro Saison (Alter, Verein, Wertung, Spiele, Tore, Vorlagen).
 * Ein Knopf simuliert bis zur nächsten Pause; am Saisonende gibt es drei Möglichkeiten.
 */
export default function CareerScreen({ career, onChange, onExit }: Props) {
  const p = career.player;
  const clubId = currentClubId(p);
  const [picked, setPicked] = useState<number | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [tree, setTree] = useState(false);
  const needType = !p.skills && career.phase !== 'retired';
  const xpNote = p.skills?.note;
  const choices = career.phase === 'winter' ? winterChoices(career) : seasonChoices(career);
  const prog = career.progress;
  const secondHalf = career.phase === 'winter' || (career.phase === 'season' && (prog?.stage ?? 0) >= STAGES_PER_HALF);
  const half = secondHalf && prog ? halfStats(prog.matches) : null;
  const note = career.decisionResult;
  const totals = career.history.reduce((a, r) => ({ apps: a.apps + r.apps, goals: a.goals + r.goals, assists: a.assists + r.assists }), { apps: 0, goals: 0, assists: 0 });
  const retired = career.phase === 'retired';

  const run = () => {
    setPicked(null);
    onChange(simulateToBreak(career));
  };
  const confirm = () => {
    if (picked === null) return;
    const c = choices[picked];
    if (c.kind === 'retire' && !window.confirm('Karriere wirklich beenden?')) return;
    setPicked(null);
    onChange(career.phase === 'winter' ? applyWinterChoice(career, c) : applyChoice(career, c));
  };

  return (
    <main className="cs">
      <div className="cs-nav">
        <button className="cs-link" onClick={onExit}>‹ Menü</button>
        <span className="cs-nav-name">{p.name}</span>
        <LevelChip career={career} onOpen={() => setTree(true)} />
      </div>
      {tree && p.skills && <SkillTree career={career} onChange={onChange} onClose={() => setTree(false)} />}

      {/* Kopf: Wertung, Nation, Position, Alter, Verein, Marktwert */}
      <header className="cs-head">
        <div className={`cs-ovr ${ovrClass(p.ovr)}`}>
          <small>OVR</small>
          <strong>{p.ovr}</strong>
        </div>
        <div className="cs-head-main">
          <div className="cs-head-row">
            <span className="cs-nat">{flagOf(p.nation)} {nationCode(p.nation)}</span>
            <span className="cs-pos">{p.position}</span>
            <span className="cs-age"><small>Alter</small> {p.age}</span>
          </div>
          <div className="cs-club">{retired ? (career.coach ? 'Trainer' : 'Karriere beendet') : getClub(clubId).name}</div>
          <div className="cs-head-row">
            <span className="cs-league">{retired ? `${career.history.length} Saisons` : getLeague(clubLeagueId(career, clubId)).name}{p.loan ? ' · Leihe' : ''}</span>
            <span className="cs-value"><small>Wert</small> {money(playerValue(p))}</span>
          </div>
        </div>
      </header>

      {/* Zeitleiste */}
      <div className="cs-table" role="table" aria-label="Karriereverlauf">
        <div className="cs-row cs-th" role="row">
          <span>Alter</span><span>Verein</span><span>OVR</span><span title="Spiele">👕</span><span title="Tore">⚽</span><span title="Vorlagen">👟</span>
        </div>
        {career.history.map((r) => (
          <SeasonRow key={r.season} r={r} open={open === r.season} onToggle={() => setOpen(open === r.season ? null : r.season)} />
        ))}

        {!retired && (
          <div className={`cs-row cs-current ${career.phase === 'window' ? 'pending' : ''}`} role="row">
            <span className="cs-agebox">{p.age}</span>
            {career.phase === 'window' ? (
              <span className="cs-clubcell muted">? <em>Karriere-Entscheidung …</em></span>
            ) : (
              <>
                <span className="cs-clubcell">{getClub(clubId).name}<small>{career.phase === 'winter' ? 'Winterpause' : half ? 'Rückrunde' : 'neue Saison'}</small></span>
                <span><b className={`cs-pill ${ovrClass(p.ovr)}`}>{p.ovr}</b></span>
                <span>{half ? `👕 ${half.apps}` : '–'}</span>
                <span>{half ? `⚽ ${half.goals}` : '–'}</span>
                <span>{half ? `👟 ${half.assists}` : '–'}</span>
              </>
            )}
          </div>
        )}
        {!retired && [1, 2].map((k) => (
          <div key={k} className={`cs-row cs-future f${k}`} aria-hidden="true"><span className="cs-agebox">{p.age + k}</span></div>
        ))}

        {p.caps > 0 && (
          <div className="cs-row cs-nation" role="row">
            <span className="cs-flag">{flagOf(p.nation)}</span>
            <span className="cs-clubcell">{p.nation}<small>Nationalmannschaft</small></span>
            <span />
            <span>👕 {p.caps}</span>
            <span>⚽ {p.internationalGoals}</span>
            <span />
          </div>
        )}
        {career.history.length > 0 && (
          <div className="cs-row cs-total" role="row">
            <span />
            <span className="cs-clubcell">Gesamt</span>
            <span />
            <span>{totals.apps}</span>
            <span>{totals.goals}</span>
            <span>{totals.assists}</span>
          </div>
        )}
      </div>

      {/* Aktion */}
      {needType && <ArchetypePicker career={career} onChange={onChange} />}

      {!needType && xpNote && career.phase !== 'retired' && (
        <button className="cs-note good sk-note" onClick={() => setTree(true)}>⭐ {xpNote}{p.skills && freePoints(p) > 0 ? ' → Fähigkeiten öffnen' : ''}</button>
      )}

      {!needType && career.phase === 'window' && choices.length > 0 && (
        <section className="cs-window">
          <h2>Transferfenster</h2>
          <p className="cs-sub">Die Saison ist vorbei. Wähle, wie es weitergeht.</p>
          <ScorerRace career={career} />
          <div className="cs-choices">
            {choices.map((c, i) => (
              <ChoiceCard key={c.offer?.id ?? c.kind} career={career} c={c} selected={picked === i} onPick={() => setPicked(i)} />
            ))}
          </div>
          <button className="btn primary big cs-go" disabled={picked === null} onClick={confirm}>
            {picked === null ? 'Möglichkeit wählen' : `${choices[picked].title} bestätigen`}
          </button>
          {p.age >= 30 && !choices.some((c) => c.kind === 'retire') && (
            <button className="btn secondary small cs-go" onClick={() => window.confirm('Karriere wirklich beenden?') && onChange(applyChoice(career, { kind: 'retire', title: 'Karriere beenden' }))}>
              Karriere beenden
            </button>
          )}
        </section>
      )}

      {!needType && (career.phase === 'season' || career.phase === 'winter' || career.phase === 'final') && (
        <section className="cs-window">
          {career.phase === 'winter' && <h2>Winterpause</h2>}
          {half && (
            <p className="cs-sub">
              Hinrunde: {half.apps} Spiele, {half.goals} Tore, {half.assists} Vorlagen
              {half.avgRating ? ` · Ø-Note ${half.avgRating.toFixed(2)}` : ''} · Wertung jetzt {p.ovr}
            </p>
          )}
          {note && <p className={`cs-note ${note.tone}`}><b>{note.title}:</b> {note.text}</p>}
          {career.phase === 'winter' && <ScorerRace career={career} />}
          {career.phase === 'winter' && choices.length > 0 && (
            <>
              <p className="cs-sub">Willst du die Pause nutzen? Optional – du kannst auch einfach weiterspielen.</p>
              <div className={`cs-choices n${choices.length}`}>
                {choices.map((c, i) => (
                  <ChoiceCard key={c.offer?.id ?? c.kind} career={career} c={c} selected={picked === i} onPick={() => setPicked(picked === i ? null : i)} />
                ))}
              </div>
              {picked !== null && (
                <button className="btn secondary big cs-go" onClick={confirm}>{choices[picked].title} bestätigen</button>
              )}
            </>
          )}
          <button className="btn primary big cs-go" onClick={run}>
            {secondHalf ? 'Bis Saisonende simulieren' : 'Bis zur Winterpause simulieren'}
          </button>
        </section>
      )}

      {retired && <CoachPanel career={career} onChange={onChange} onExit={onExit} />}
    </main>
  );
}

function SeasonRow({ r, open, onToggle }: { r: SeasonRecord; open: boolean; onToggle: () => void }) {
  const titles = [...r.trophies, ...r.awards];
  return (
    <>
      <button className={`cs-row cs-season ${open ? 'open' : ''}`} role="row" onClick={onToggle} aria-expanded={open}>
        <span className="cs-agebox">{r.age}</span>
        <span className="cs-clubcell">
          {getClub(r.clubId).name}
          {r.onLoan && <i className="cs-tag">Leihe</i>}
          {titles.length > 0 && <i className="cs-trophy" title={titles.join(', ')}>{'🏆'.repeat(Math.min(3, r.trophies.length))}{r.awards.length ? '⭐' : ''}</i>}
        </span>
        <span><b className={`cs-pill ${ovrClass(r.ovrEnd)}`}>{r.ovrEnd}</b></span>
        <span>👕 {r.apps}</span>
        <span>⚽ {r.goals}</span>
        <span>👟 {r.assists}</span>
      </button>
      {open && (
        <div className="cs-detail">
          <span>Saison {r.season} · {getLeague(r.leagueId).name} · Platz {r.leaguePosition}</span>
          <span>Ø-Note {r.avgRating?.toFixed(2) ?? '–'} · Wertung {r.ovrStart} → {r.ovrEnd} · Marktwert {formatMoney(r.marketValue)}</span>
          {titles.length > 0 && <span>🏆 {titles.join(' · ')}</span>}
          {(r.events ?? []).length > 0 && <span>⚡ {(r.events ?? []).map((e) => e.title).join(' · ')}</span>}
        </div>
      )}
    </>
  );
}

function ChoiceCard({ career, c, selected, onPick }: { career: Career; c: Choice; selected: boolean; onPick: () => void }) {
  const o = c.offer;
  const league = o ? getLeague(clubLeagueId(career, o.clubId)).name : c.kind === 'stay' ? getLeague(clubLeagueId(career, career.player.contract.clubId)).name : '';
  return (
    <button className={`cs-choice k-${c.kind} ${selected ? 'on' : ''}`} onClick={onPick} aria-pressed={selected}>
      <small>{c.title}</small>
      <strong>{c.kind === 'retire' ? 'Schuhe an den Nagel' : c.kind === 'camp' ? '☀️ Ab in den Süden' : choiceClub(career, c)}</strong>
      {league && <span className="cs-choice-league">{league}</span>}
      {o && (
        <span className="cs-choice-meta">
          {o.role}
          <br />
          {formatMoney(o.wage)}/Woche{o.type !== 'Leihe' ? ` · ${o.years} J.` : ''}
          {o.fee > 0 ? <><br />Ablöse {formatMoney(o.fee)}</> : null}
        </span>
      )}
      {c.kind === 'home' && <span className="cs-choice-meta">🏠 Zurück, wo alles begann</span>}
      {c.kind === 'exotic' && <span className="cs-choice-meta">✈️ Abenteuer mit Top-Gehalt</span>}
      {c.kind === 'stay' && <span className="cs-choice-meta">Vertrag noch {career.player.contract.yearsLeft} J.</span>}
      {c.kind === 'retire' && <span className="cs-choice-meta">Mit {career.player.age} Jahren aufhören</span>}
      {c.kind === 'camp' && <span className="cs-choice-meta">Chance auf +1 Wertung – je mehr Spielpraxis, desto besser. Kleines Verletzungsrisiko.</span>}
    </button>
  );
}
