import { useEffect, useState } from 'react';
import Icon from './Icon';
import { getClub } from '../data/leagues';
import { currentClubId } from '../game/player';
import { upcomingFixtures } from '../game/season';
import {
  TALKS, TRAINER_STYLE, canTalk, ensureCompetitor, ensureTrainer, coachTalk, demandChance, duelText, roleLabel, roleRank, stageMatchdays, teamRole, trustInfo,
  type Scene, type TalkId,
} from '../game/matchday';
import { compShort } from '../game/simReplay';
import { AGENTS, canChangeAgent, deadlineDay, heatWord, setAgent, type AgentId } from '../game/agent';
import type { Career } from '../game/types';

const pct = (x: number) => `${Math.round(x * 100)} %`;
const nm = (id: string) => { try { return getClub(id).name; } catch { return id; } };
const signed = (d: number) => `${d > 0 ? '+' : ''}${String(Math.round(d * 10) / 10).replace('.', ',')}`;

/** Kabine: Rolle im Team, Vertrauen des Trainers (mit Gründen), Trainer, Konkurrent und Trainergespräch. */
export function Kabine({ career, onChange }: { career: Career; onChange: (c: Career) => void }) {
  const role = teamRole(career);
  const trust = trustInfo(career);
  const t = career.trainer;
  const comp = career.competitor?.clubId === currentClubId(career.player) ? career.competitor : null;
  const [talk, setTalk] = useState(false);
  const [agentOpen, setAgentOpen] = useState(false);
  const [answer, setAnswer] = useState<{ text: string; tone: string } | null>(null);
  const task = career.progress?.coachTask;
  // Trainer und Konkurrent gibt es ab dem ersten Blick in die Kabine (bei Vereinswechsel neu)
  const club = currentClubId(career.player);
  useEffect(() => {
    if (career.trainer?.clubId === club && career.competitor?.clubId === club) return;
    const c: Career = structuredClone(career);
    ensureTrainer(c); ensureCompetitor(c);
    onChange(c);
  }, [club]); // eslint-disable-line react-hooks/exhaustive-deps
  const pick = (id: TalkId) => {
    const r = coachTalk(career, id);
    setAnswer({ text: r.text, tone: r.tone });
    setTalk(false);
    onChange(r.career);
  };
  return (
    <section className="kb" aria-label="Kabine">
      <div className="kb-role">
        <span className={`kb-badge r-${role.id}`}>{role.captain ? 'Kapitän' : role.label}</span>
        <div className="kb-role-main">
          <small>Startelf-Chance <b>{pct(role.pct)}</b></small>
          <span className="kb-ladder" aria-hidden="true">{(['stand', 'bench', 'rotation', 'starter', 'key'] as const).map((id) => <i key={id} className={roleRank(id) <= roleRank(role.id) ? 'on' : ''} />)}</span>
          <small className="kb-next">{role.next ? `Noch ${role.next.gap} Prozentpunkte bis ${role.next.label}` : 'Höchste Stufe erreicht'}</small>
        </div>
      </div>

      <div className="kb-trust">
        <div className="kb-trust-head"><small>Vertrauen des Trainers</small><b>{trust.word}</b></div>
        <span className="kb-trust-bar"><i style={{ width: `${Math.max(4, trust.pct * 100)}%` }} /></span>
        {trust.log.length > 0 && (
          <ul className="kb-log">
            {trust.log.slice(0, 3).map((l, i) => <li key={i} className={l.d > 0 ? 'up' : 'down'}><em>{signed(l.d)}</em>{l.text}</li>)}
          </ul>
        )}
      </div>

      <div className="kb-people">
        {t && <span><Icon name="whistle" size={16} /><b>{t.name}</b><small>{TRAINER_STYLE[t.style]}</small></span>}
        {comp && <span><Icon name="duel" size={16} /><b>{comp.name}</b><small>OVR {comp.ovr} · {duelText(career)}</small></span>}
      </div>

      <div className="kb-agent">
        <span><Icon name="handshake" size={16} /><b>{career.agent ? AGENTS[career.agent].name : 'Kein Berater'}</b><small>{career.agent ? AGENTS[career.agent].title : 'Du verhandelst selbst'}</small></span>
        {canChangeAgent(career) && !agentOpen && <button className="cs-link" onClick={() => setAgentOpen(true)}>{career.agent ? 'Wechseln' : 'Berater wählen'}</button>}
      </div>
      {agentOpen && (
        <div className="kb-talk" role="group" aria-label="Berater wählen">
          {(Object.keys(AGENTS) as AgentId[]).map((id) => (
            <button key={id} className={`cs-choice kb-opt ${career.agent === id ? 'on' : ''}`} onClick={() => { onChange(setAgent(career, id)); setAgentOpen(false); }}>
              <strong>{AGENTS[id].name} · {AGENTS[id].title}</strong>
              <small><span className="up">+ {AGENTS[id].plus}</span><br /><span className="down">− {AGENTS[id].minus}</span></small>
            </button>
          ))}
          <button className="cs-choice kb-opt" onClick={() => { onChange(setAgent(career, null)); setAgentOpen(false); }}><strong>Ohne Berater</strong><small>Keine Vor- und Nachteile</small></button>
          <p className="hint">Einmal pro Saison wechselbar. Wirkt im nächsten Transferfenster.</p>
        </div>
      )}
      {(career.rumors?.length ?? 0) > 0 && (
        <div className="kb-rumors"><small>Gerüchte</small>{career.rumors!.map((r) => <span key={r.clubId} className={`h${r.heat}`}>{nm(r.clubId)} · {heatWord(r.heat)}</span>)}</div>
      )}
      {task && <p className="kb-task"><Icon name="target" size={16} /> Auftrag: {task.label}</p>}
      {answer && <p className={`kb-answer ${answer.tone}`}>{answer.text}</p>}
      {canTalk(career) && !talk && (
        <button className="btn secondary small kb-talk-btn" onClick={() => { setAnswer(null); setTalk(true); }}><Icon name="chat" size={16} /> Trainergespräch</button>
      )}
      {talk && (
        <div className="kb-talk" role="group" aria-label="Trainergespräch">
          {TALKS.map((x) => (
            <button key={x.id} className="cs-choice kb-opt" onClick={() => pick(x.id)}>
              <strong>{x.label}</strong>
              <small>{x.id === 'demand' ? `${x.hint} · Chance ${pct(demandChance(career))}` : x.hint}</small>
            </button>
          ))}
          <button className="cs-link" onClick={() => setTalk(false)}>Abbrechen</button>
        </div>
      )}
    </section>
  );
}

/** Spieltag-Karte: kommende Etappe mit Gegnern und Knöpfen. */
export function StageCard({ career, onPlay, onQuick }: { career: Career; onPlay: () => void; onQuick: () => void }) {
  const prog = career.progress;
  const stage = prog?.stage ?? 0;
  const days = stageMatchdays(career);
  const fixtures = (() => { try { return prog ? upcomingFixtures(career, prog, stage) : []; } catch { return []; } })();
  const form = prog?.form ?? 6.8;
  return (
    <div className="md-card">
      <header>
        <b>Etappe {stage + 1} von 6</b>
        <small>{days ? `Spieltage ${days[0]}–${days[1]}` : 'Saisonstart'}{stage + 1 === 3 ? ' · danach Winterpause' : stage + 1 === 6 ? ' · danach Saisonende' : ''}</small>
      </header>
      <div className="md-steps" aria-hidden="true">{Array.from({ length: 6 }, (_, i) => <i key={i} className={i < stage ? 'done' : i === stage ? 'now' : ''} />)}</div>
      {fixtures.length > 0 && (
        <ul className="md-fix">
          {fixtures.slice(0, 6).map((f, i) => <li key={i}><em>{f.home ? 'H' : 'A'}</em>{nm(f.opponentId)}</li>)}
        </ul>
      )}
      <div className="md-form">
        <span><small>Form</small><b className={form >= 7.2 ? 'up' : form <= 6.4 ? 'down' : ''}><Icon name={form >= 7.2 ? 'rise' : 'dot'} size={14} className={form <= 6.4 ? 'md-down' : ''} />{form.toFixed(1).replace('.', ',')}</b></span>
      </div>
      <button className="btn primary big cs-go md-play" onClick={onPlay}>Etappe {stage + 1} spielen</button>
      <button className="cs-link md-quick" onClick={onQuick}>{stage < 3 ? 'Bis zur Winterpause durchsimulieren' : 'Bis Saisonende durchsimulieren'}</button>
    </div>
  );
}

/** Szene des Spieltags: eine Entscheidung mit sichtbarer Chance. */
export function SceneCard({ scene, onPick }: { scene: Scene; onPick: (id: string | null) => void }) {
  return (
    <div className="md-scene" role="group" aria-label="Szene des Spieltags">
      <small className="md-scene-kicker">Szene des Spieltags</small>
      <h3>{scene.title}</h3>
      <p>{scene.text}</p>
      <div className="md-scene-opts">
        {scene.options.map((o) => (
          <button key={o.id} className={`md-opt ${o.risky ? 'risky' : ''}`} onClick={() => onPick(o.id)}>
            <strong>{o.label}</strong>
            <small>{o.hint}</small>
            <b>{pct(o.chance)}</b>
          </button>
        ))}
      </div>
      <button className="cs-link" onClick={() => onPick(null)}>Szene überspringen</button>
    </div>
  );
}

/** Rückblick der letzten Etappe: Bilanz, Rolle und Vertrauen vorher → nachher. */
export function StageRecap({ career }: { career: Career }) {
  const prog = career.progress;
  const rc = prog?.recap;
  const log = prog?.stageLog?.find((s) => s.stage === rc?.stage);
  if (!prog || !rc || !log || prog.scene) return null;
  const role = teamRole(career);
  const dTrust = (career.player.morale ?? 0) - rc.trustFrom;
  const moved = roleRank(role.id) - roleRank(rc.roleFrom);
  // Flutlicht: Pokal- und Europapokal-Spiele der Etappe extra zeigen
  const nights = prog.matches.filter((m) => m.stage === rc.stage && m.competition !== 'Liga' && m.status !== 'injured');
  return (
    <div className="md-recap" aria-label="Rückblick Etappe">
      <small>Rückblick Etappe {rc.stage + 1}</small>
      <dl>
        <div><dt>Spiele</dt><dd>{log.apps}</dd></div>
        <div><dt>{career.player.position === 'TW' ? 'Note' : 'Tore'}</dt><dd>{career.player.position === 'TW' ? (log.avgRating?.toFixed(1).replace('.', ',') ?? '–') : log.goals}</dd></div>
        <div><dt>Vorl.</dt><dd>{log.assists}</dd></div>
        <div><dt>Ø-Note</dt><dd>{log.avgRating != null ? log.avgRating.toFixed(1).replace('.', ',') : '–'}</dd></div>
        <div><dt>Platz</dt><dd>{log.position || '–'}</dd></div>
      </dl>
      {nights.length > 0 && (
        <ul className="md-nights" aria-label="Flutlicht-Spiele">
          {nights.map((m, i) => (
            <li key={i} className={m.goalsFor > m.goalsAgainst ? 'w' : m.goalsFor < m.goalsAgainst ? 'l' : ''}>
              <small>{compShort(m.competition)}</small>
              <span>{m.home ? 'vs' : 'bei'} {nm(m.opponent)}</span>
              <b>{m.goalsFor}:{m.goalsAgainst}</b>
              {(m.goals > 0 || m.assists > 0) && <em>{m.goals > 0 ? `${m.goals} Tor${m.goals > 1 ? 'e' : ''}` : ''}{m.goals > 0 && m.assists > 0 ? ' · ' : ''}{m.assists > 0 ? `${m.assists} Vorl.` : ''}</em>}
            </li>
          ))}
        </ul>
      )}
      <p className="md-recap-line">
        {moved > 0 ? <span className="up">Aufgestiegen: {roleLabel(rc.roleFrom)} → {role.label}</span>
          : moved < 0 ? <span className="down">Abgerutscht: {roleLabel(rc.roleFrom)} → {role.label}</span>
            : <span>Rolle: {role.label}</span>}
        {Math.abs(dTrust) >= 0.1 && <span className={dTrust > 0 ? 'up' : 'down'}> · Vertrauen {signed(dTrust)}</span>}
      </p>
    </div>
  );
}

/** Deadline-Day: Ticker läuft ab, am Ende vielleicht ein Last-Minute-Angebot. */
export function DeadlineDay({ career, onChange }: { career: Career; onChange: (c: Career) => void }) {
  const [lines, setLines] = useState<string[] | null>(null);
  const [shown, setShown] = useState(0);
  const [pending, setPending] = useState<Career | null>(null);
  useEffect(() => {
    if (!lines || shown >= lines.length) return;
    const t = setTimeout(() => setShown((n) => n + 1), shown === lines.length - 1 ? 900 : 650);
    return () => clearTimeout(t);
  }, [lines, shown]);
  useEffect(() => { if (lines && shown >= lines.length && pending) { onChange(pending); setPending(null); } }, [shown]); // eslint-disable-line react-hooks/exhaustive-deps
  const start = () => { const r = deadlineDay(career); setLines(r.lines); setShown(1); setPending(r.career); };
  return (
    <div className="dd">
      {!lines ? (
        <button className="btn secondary small dd-btn" onClick={start}><Icon name="clock" size={16} /> Deadline-Day abwarten</button>
      ) : (
        <ul className="dd-ticker" aria-live="polite">
          {lines.slice(0, shown).map((l, i) => <li key={i} className={i === lines.length - 1 ? 'last' : ''}>{l}</li>)}
        </ul>
      )}
    </div>
  );
}
