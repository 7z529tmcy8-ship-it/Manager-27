import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { getClub } from '../data/leagues';
import { compShort, type Replay } from '../game/simReplay';
import type { GoalResult } from '../game/types';
import { motionReduced } from '../settings';
import { play } from '../sound';
import ClubCrest, { hasCrest } from './ClubCrest';
import Icon from './Icon';

const sfx = (id: Parameters<typeof play>[0]) => { try { play(id); } catch { /* kein Ton */ } };
const buzz = (ms: number | number[]) => { try { navigator.vibrate?.(ms); } catch { /* egal */ } };
const nameOf = (id: string) => { try { return getClub(id).name; } catch { return id; } };
const BIG_TEXT = { hattrick: 'Hattrick!', brace: 'Doppelpack!', goal: 'Tor!', motm: 'Mann des Spiels', win: 'Weiter!' } as const;
const SPEEDS = [1, 2, 4] as const;
const fmtRating = (r: number | null) => (r == null ? '–' : r.toFixed(1).replace('.', ','));

/** Wappen: echtes Bild, falls vorhanden – sonst ein eigenes Schild mit Kürzel in einer festen Vereinsfarbe. */
function Badge({ id, size }: { id: string; size: number }) {
  if (hasCrest(id)) return <ClubCrest id={id} size={size} />;
  const name = nameOf(id);
  let h = 0; for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) % 360;
  const words = name.replace(/[^A-Za-zÄÖÜäöüß0-9 ]/g, '').split(/\s+/).filter((w) => w.length > 2 || /^[A-Z0-9]+$/.test(w));
  const ab = (words.length >= 2 ? words[0][0] + words[words.length - 1][0] : name.slice(0, 2)).toUpperCase();
  return (
    <svg className="sim-badge" width={size} height={size} viewBox="0 0 40 44" aria-hidden="true">
      <path d="M20 2 L37 8 V22 C37 33 29 39 20 42 C11 39 3 33 3 22 V8 Z" fill={`hsl(${h} 70% 42%)`} stroke={`hsl(${h} 80% 72%)`} strokeWidth="2" />
      <path d="M20 2 L37 8 V16 H3 V8 Z" fill="rgba(255,255,255,.18)" />
      <text x="20" y="28" textAnchor="middle" fontSize="13" fontWeight="900" fill="#fff">{ab}</text>
    </svg>
  );
}

/** Live-Simulation: die Halbserie läuft Spiel für Spiel durch – mit Toren, Noten, Punkten und Tabellenplatz. */
export default function SimShow({ replay, onDone }: { replay: Replay; onDone: () => void }) {
  const n = replay.steps.length;
  const [i, setI] = useState(-1);
  const [speed, setSpeed] = useState<(typeof SPEEDS)[number]>(() => { try { return (Number(localStorage.getItem('fc-sim-speed')) || 1) as 1; } catch { return 1; } });
  const [pop, setPop] = useState<string | null>(null);
  const done = i >= n - 1;
  const [end, setEnd] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    if (end) return;
    if (done) { timer.current = setTimeout(() => { setEnd(true); sfx('whistle'); if (replay.position && replay.position <= 3) setTimeout(() => sfx('fanfare'), 400); }, 900 / speed); return () => clearTimeout(timer.current); }
    const nextStep = replay.steps[i + 1];
    const wait = (i < 0 ? 500 : (replay.steps[i]?.big ? 1250 : 620)) / speed;
    timer.current = setTimeout(() => {
      setI(i + 1);
      const b = nextStep.big;
      if (b === 'hattrick' || b === 'brace' || b === 'goal') { sfx('goal'); buzz(b === 'hattrick' ? [60, 40, 60, 40, 120] : 40); }
      else if (b === 'motm') sfx('revealRare');
      else sfx('tick');
      setPop(b ? BIG_TEXT[b] : null);
    }, motionReduced() ? 0 : wait);
    return () => clearTimeout(timer.current);
  }, [i, speed, done, end, n, replay]);

  const skip = () => { clearTimeout(timer.current); setI(n - 1); setPop(null); setEnd(true); };
  const setSp = (s: (typeof SPEEDS)[number]) => { setSpeed(s); try { localStorage.setItem('fc-sim-speed', String(s)); } catch { /* egal */ } };
  const cur = i >= 0 ? replay.steps[i] : null;
  const last = replay.steps[n - 1];
  const m = cur?.match;
  const us = nameOf(m?.clubId ?? replay.clubId);
  const them = m ? nameOf(m.opponent) : '';
  const res = m ? (m.goalsFor > m.goalsAgainst ? 'w' : m.goalsFor === m.goalsAgainst ? 'd' : 'l') : '';
  const played = m && (m.status === 'start' || m.status === 'sub');

  return createPortal(
    <div className={`sim ${end ? 'end' : ''}`} role="dialog" aria-modal="true" aria-label={`${replay.title} live`}>
      <header className="sim-top">
        <span className="sim-club"><Badge id={replay.clubId} size={34} /><span><b>{nameOf(replay.clubId)}</b><small>{replay.title} · {end ? 'Abpfiff' : 'Live'}</small></span></span>
        {!end && (
          <span className="sim-ctrl">
            {SPEEDS.map((s) => <button key={s} className={speed === s ? 'on' : ''} onClick={() => setSp(s)} aria-label={`Tempo ${s}-fach`}>{s}×</button>)}
            <button className="sim-skip" onClick={skip}>Überspringen</button>
          </span>
        )}
      </header>
      <div className="sim-progress" aria-hidden="true"><i style={{ width: `${((i + 1) / n) * 100}%` }} /></div>

      {!end ? (
        <>
          <section className={`sim-board r-${res}`} key={i}>
            {m ? (
              <>
                <small className="sim-comp">{compShort(m.competition)} · {m.home ? 'Heimspiel' : 'Auswärts'} · Spiel {i + 1}/{n}</small>
                <div className="sim-score">
                  <span className="sim-team">{m.home ? <><Badge id={m.clubId} size={44} /><b>{us}</b></> : <><Badge id={m.opponent} size={44} /><b>{them}</b></>}</span>
                  <b className="sim-res">{m.home ? m.goalsFor : m.goalsAgainst}<i>:</i>{m.home ? m.goalsAgainst : m.goalsFor}</b>
                  <span className="sim-team">{m.home ? <><Badge id={m.opponent} size={44} /><b>{them}</b></> : <><Badge id={m.clubId} size={44} /><b>{us}</b></>}</span>
                </div>
                <div className="sim-you">
                  {played ? (
                    <>
                      <span>{m.status === 'start' ? 'Startelf' : 'Eingewechselt'} · {m.minutes}'</span>
                      {m.goals > 0 && <span className="sim-g"><Icon name="ball" size={15} />{m.goals > 1 ? `${m.goals} Tore` : 'Tor'}</span>}
                      {m.assists > 0 && <span className="sim-a"><Icon name="link" size={15} />{m.assists > 1 ? `${m.assists} Vorlagen` : 'Vorlage'}</span>}
                      <span className={`sim-rt ${(m.rating ?? 0) >= 7.5 ? 'hi' : (m.rating ?? 6) < 6 ? 'lo' : ''}`}>{fmtRating(m.rating)}</span>
                    </>
                  ) : <span className="sim-out">{m.status === 'injured' ? 'Verletzt – nicht dabei' : 'Auf der Bank'}</span>}
                </div>
              </>
            ) : <p className="sim-kick">Anpfiff …</p>}
          </section>
          {pop && <div className={`sim-pop ${cur?.big ?? ''}`} key={`p${i}`}>{pop}</div>}
        </>
      ) : (
        <section className="sim-end">
          <small>{replay.title} beendet</small>
          {replay.position ? <b className="sim-pos">Platz {replay.position}<em>/{replay.teams}</em></b> : <b className="sim-pos">Fertig</b>}
          {replay.ovrFrom != null && replay.ovrTo != null && replay.ovrTo !== replay.ovrFrom && (
            <span className={`sim-ovr ${replay.ovrTo > replay.ovrFrom ? 'up' : 'down'}`}>Wertung {replay.ovrFrom} <Icon name="arrow" size={14} /> {replay.ovrTo} ({replay.ovrTo > replay.ovrFrom ? '+' : ''}{replay.ovrTo - replay.ovrFrom})</span>
          )}
          <span className="sim-rec">{last.w} Siege · {last.d} Remis · {last.l} Niederlagen · {last.points} Punkte</span>
          {replay.goals && <GoalBars goals={replay.goals} title={replay.title === 'Hinrunde' ? 'Saisonziele – Zwischenstand' : 'Saisonziele'} />}
        </section>
      )}

      <div className="sim-stats">
        <span><b>{cur?.apps ?? 0}</b><small>Spiele</small></span>
        <span className="g"><b>{cur?.goals ?? 0}</b><small>Tore</small></span>
        <span><b>{cur?.assists ?? 0}</b><small>Vorlagen</small></span>
        <span><b>{fmtRating(cur?.avg ?? null)}</b><small>Ø-Note</small></span>
        <span className="p"><b>{cur?.points ?? replay.startPoints}</b><small>Punkte</small></span>
      </div>

      <ul className="sim-feed" aria-label="Letzte Spiele">
        {replay.steps.slice(0, i + 1).slice(-6).reverse().map((s, k) => {
          const x = s.match;
          const r = x.goalsFor > x.goalsAgainst ? 'w' : x.goalsFor === x.goalsAgainst ? 'd' : 'l';
          return (
            <li key={`${i}-${k}`} className={`r-${r}`}>
              <i>{r === 'w' ? 'S' : r === 'd' ? 'U' : 'N'}</i>
              <span>{x.home ? 'vs' : '@'} {nameOf(x.opponent)}</span>
              <b>{x.goalsFor}:{x.goalsAgainst}</b>
              <em>{x.goals ? `${x.goals}T ` : ''}{x.assists ? `${x.assists}V` : ''}</em>
            </li>
          );
        })}
      </ul>

      {end && <button className="btn primary big sim-go" onClick={onDone}>Weiter</button>}
    </div>,
    document.body,
  );
}

/** Saisonziele des Trainers als Fortschrittsbalken. */
export function GoalBars({ goals, title }: { goals: GoalResult[]; title: string }) {
  return (
    <div className="goalbars">
      <small>{title}</small>
      {goals.map((g) => {
        const pct = Math.min(100, (g.value / Math.max(0.01, g.target)) * 100);
        const val = g.metric === 'rating' ? g.value.toFixed(2).replace('.', ',') : String(g.value);
        return (
          <div key={g.metric} className={`goalbar ${g.met ? 'met' : ''}`}>
            <span><b>{g.label}</b><em>{val}{g.met ? ' ✓' : ''}</em></span>
            <i><u style={{ width: `${pct}%` }} /></i>
          </div>
        );
      })}
    </div>
  );
}
