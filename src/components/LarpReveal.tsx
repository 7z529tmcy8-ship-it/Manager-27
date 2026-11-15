import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { dismissReveal } from '../game/larp';
import { fmtFollowers } from '../game/kickgram';
import type { Career } from '../game/types';
import { motionReduced } from '../settings';
import { play, playCharge } from '../sound';
import { Gauge, useCount, zoneOf } from './LookPanel';

const sfx = (id: Parameters<typeof play>[0]) => { try { play(id); } catch { /* kein Ton */ } };
const buzz = (p: number | number[]) => { try { navigator.vibrate?.(p); } catch { /* egal */ } };
const LINES = ['Fan-Accounts zoomen auf deine Schuhe …', 'Jemand vergleicht die Uhr mit dem Original …', 'Die Kommentare laden …'];

/**
 * „Fit-Check des Jahres“ am Saisonende: Antizipation (Nadel pendelt, Kommentare laden), dann der Stempel –
 * Old Money bestätigt oder Larp entlarvt (Follower zählen runter). Antippen überspringt.
 */
export default function LarpReveal({ career, onChange }: { career: Career; onChange: (c: Career) => void }) {
  const r = career.larp?.reveal;
  const [phase, setPhase] = useState<'scan' | 'result'>(() => (motionReduced() ? 'result' : 'scan'));
  const [line, setLine] = useState(0);
  const followers = useCount(phase === 'result' && r ? r.after : r?.before ?? 0, 900);

  useEffect(() => {
    if (!r || phase !== 'scan') return;
    const stop = (() => { try { return playCharge(1600); } catch { return () => {}; } })();
    buzz([10, 160, 10, 160, 10]);
    const t1 = setInterval(() => setLine((x) => (x + 1) % LINES.length), 600);
    const t2 = setTimeout(() => setPhase('result'), 1700);
    return () => { clearInterval(t1); clearTimeout(t2); stop(); };
  }, [r, phase]);
  useEffect(() => {
    if (!r || phase !== 'result') return;
    if (r.exposed) { sfx('fall'); buzz([120, 60, 200]); } else { sfx('fanfare'); buzz([30, 40, 90]); }
  }, [r, phase]);

  if (!r) return null;
  const close = () => onChange(dismissReveal(career));
  return createPortal(
    <div className={`lpr ${phase} ${phase === 'result' ? (r.exposed ? 'bad' : 'good') : ''}`} role="dialog" aria-modal="true" aria-label="Fit-Check des Jahres"
      onClick={() => phase === 'scan' && setPhase('result')}>
      <div className="lpr-card">
        <p className="lp-kicker">Saisonende</p>
        <h2 className="lpr-title">Fit-Check des Jahres</h2>
        <div className="lpr-gauge">
          <Gauge risk={phase === 'scan' ? 0 : r.risk} />
          <b>{r.risk}%</b>
          <small>{zoneOf(r.risk).name} · Aura {r.aura}</small>
        </div>
        {phase === 'scan' && <p className="lpr-line" key={line}>{LINES[line]}</p>}
        {phase === 'result' && (
          <>
            <div className={`lpr-stamp ${r.exposed ? 'bad' : 'good'}`}>{r.exposed ? 'Larp entlarvt' : 'Old Money bestätigt'}</div>
            <p className="lpr-why">{r.exposed ? `Aufgeflogen: ${r.why}.` : r.risk > 0 ? `Bei ${r.risk} % Risiko durchgekommen – keiner hat was gemerkt.` : 'Alles echt. Respekt.'}</p>
            <div className="lpr-followers">
              <small>Follower</small>
              <b className={r.exposed ? 'down' : ''}>{fmtFollowers(followers)}</b>
              {r.exposed && <em>−{fmtFollowers(r.before - r.after)}</em>}
            </div>
            {r.lost.length > 0 && <ul className="lpr-lost">{r.lost.map((n) => <li key={n}>{n} (Replika) – weg</li>)}</ul>}
            {r.kitGone && <p className="lpr-why">Dein Ausrüster beendet die Zusammenarbeit.</p>}
            <button className="lpr-go" onClick={close}>{r.exposed ? 'Durchatmen' : 'Weiter flexen'}</button>
          </>
        )}
        {phase === 'scan' && <small className="lpr-skip">Antippen zum Überspringen</small>}
      </div>
    </div>,
    document.body,
  );
}
