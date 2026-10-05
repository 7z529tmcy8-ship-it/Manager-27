import { useEffect, useState } from 'react';
import { PACKS, openPack, rarity, type CollectCard, type PackResult } from '../game/club';
import {
  DUEL_LEVELS, FORMATION, TASKS, autoSquad, cardById, chemistry, completeTask, fit, opponent, ownedCards, playDuel,
  setSlot, taskPick, teamRating, teamStrength, type DuelResult,
} from '../game/squad';
import { getClubState, setClubState, useClub } from '../clubStore';
import { FRIEND_REWARD, SLOT_LABELS, exportTeam, importTeam, playFriendDuel } from '../game/friends';
import { motionReduced } from '../settings';
import { PackOpening } from './Store';
import UtCard from './UtCard';

type Tab = 'squad' | 'duels' | 'friends' | 'tasks';

/** Mein Team: Aufstellung aus der Sammlung, Duelle gegen immer stärkere Gegner, Tauschaufgaben. */
export default function Team({ onBack, onStore }: { onBack: () => void; onStore: () => void }) {
  const club = useClub();
  const [tab, setTab] = useState<Tab>('squad');
  const cards = club.squad.map((id) => cardById(club, id));
  const chem = chemistry(cards);
  const rating = teamRating(cards);
  const full = cards.filter(Boolean).length === 11;

  return (
    <main className="hub">
      <header className="hub-top">
        <button className="hub-back" onClick={onBack}>‹ Hauptmenü</button>
        <span className="hub-coins">🪙 {club.coins.toLocaleString('de-DE')}</span>
      </header>
      <h1 className="hub-title">Mein Team</h1>
      <div className="team-stats">
        <div><small>Wertung</small><strong>{rating || '–'}</strong></div>
        <div><small>Chemie</small><strong>{chem.total}<em>/33</em></strong></div>
        <div><small>Duelle</small><strong>{club.duels.w}<em>S</em> {club.duels.d}<em>U</em> {club.duels.l}<em>N</em></strong></div>
      </div>
      <div className="segmented team-tabs" role="tablist">
        {([['squad', 'Aufstellung'], ['duels', 'Duelle'], ['friends', 'Freunde'], ['tasks', 'Tausch']] as [Tab, string][]).map(([id, label]) => (
          <button key={id} role="tab" aria-selected={tab === id} className={tab === id ? 'active' : ''} onClick={() => setTab(id)}>{label}</button>
        ))}
      </div>
      {tab === 'squad' && <Squad onStore={onStore} />}
      {tab === 'duels' && <Duels full={full} onSquad={() => setTab('squad')} />}
      {tab === 'friends' && <Friends full={full} onSquad={() => setTab('squad')} />}
      {tab === 'tasks' && <Tasks />}
    </main>
  );
}

// ---------- Aufstellung ----------
function Squad({ onStore }: { onStore: () => void }) {
  const club = useClub();
  const [slot, setSlotOpen] = useState<number | null>(null);
  const cards = club.squad.map((id) => cardById(club, id));
  const chem = chemistry(cards);
  const owned = ownedCards(club);

  if (!owned.length) {
    return (
      <div className="hub-empty">
        <p>Du hast noch keine Karten. Öffne zuerst ein Pack im Store.</p>
        <button className="btn primary" onClick={onStore}>Zum Store</button>
      </div>
    );
  }

  return (
    <>
      <div className="team-actions">
        <button className="btn secondary small" onClick={() => setClubState({ ...getClubState(), squad: autoSquad(getClubState()) })}>⚡ Auto-Aufstellung</button>
        <button className="btn ghost small" onClick={() => setClubState({ ...getClubState(), squad: Array(11).fill(null) })}>Leeren</button>
      </div>
      <div className="pitch">
        <div className="pitch-lines" aria-hidden="true"><i className="box top" /><i className="circle" /><i className="box bottom" /></div>
        {FORMATION.map((s, i) => {
          const c = cards[i];
          return (
            <div key={i} className="pitch-slot" style={{ left: `${s.x}%`, top: `${s.y}%` }}>
              {c ? (
                <UtCard card={c} size="xs" chem={chem.per[i]} onClick={() => setSlotOpen(i)} />
              ) : (
                <button className="slot-empty" onClick={() => setSlotOpen(i)} aria-label={`${s.label} besetzen`}>+</button>
              )}
              <span className={`slot-label ${c && fit(c, s.pos) === 'off' ? 'bad' : ''}`}>{s.label}</span>
            </div>
          );
        })}
      </div>
      <p className="hub-sub small">
        Chemie: gleiche Nation, Liga oder gleicher Verein in der Elf geben Punkte (max. 3 pro Spieler). Auf fremder Position gibt es keine Chemie,
        auf ähnlicher die Hälfte. Ikonen haben immer volle Chemie.
      </p>
      {slot !== null && <Picker slot={slot} onClose={() => setSlotOpen(null)} />}
    </>
  );
}

function Picker({ slot, onClose }: { slot: number; onClose: () => void }) {
  const club = useClub();
  const pos = FORMATION[slot].pos;
  const current = club.squad[slot];
  const list = ownedCards(club)
    .map((c) => ({ c, f: fit(c, pos) }))
    .sort((a, b) => ({ ok: 0, near: 1, off: 2 }[a.f] - { ok: 0, near: 1, off: 2 }[b.f]) || b.c.ovr - a.c.ovr);
  const pick = (c: CollectCard | null) => {
    setClubState(setSlot(getClubState(), slot, c ? c.id : null));
    onClose();
  };
  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-label={`Spieler für ${FORMATION[slot].label}`}>
      <div className="overlay-inner">
        <header className="overlay-head">
          <button className="nav-back" onClick={onClose}>‹ Zurück</button>
          {current && <button className="btn link small" onClick={() => pick(null)}>Platz leeren</button>}
        </header>
        <h1 className="overlay-title">Position {FORMATION[slot].label}</h1>
        <p className="muted">Passende Spieler zuerst. Ein Spieler, der schon woanders steht, wechselt auf diese Position.</p>
        <div className="collection-grid">
          {list.map(({ c, f }) => (
            <div key={c.id} className={`pick-wrap f-${f} ${c.id === current ? 'current' : ''}`}>
              <UtCard card={c} size="sm" shine={rarity(c) >= 200} onClick={() => pick(c)} />
              <span className="pick-fit">{f === 'ok' ? 'passt' : f === 'near' ? 'ähnlich' : 'fremd'}{club.squad.includes(c.id) ? ' · aufgestellt' : ''}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------- Duelle ----------
function Duels({ full, onSquad }: { full: boolean; onSquad: () => void }) {
  const club = useClub();
  const [live, setLive] = useState<{ level: number; result: DuelResult } | null>(null);
  const strength = teamStrength(club.squad.map((id) => cardById(club, id)));

  const play = (level: number) => {
    const res = playDuel(getClubState(), level);
    if (!res) return;
    setClubState(res.club);
    setLive({ level, result: res.result });
  };

  if (!full) {
    return (
      <div className="hub-empty">
        <p>Für Duelle brauchst du eine vollständige Elf (11 Spieler).</p>
        <button className="btn primary" onClick={onSquad}>Zur Aufstellung</button>
      </div>
    );
  }
  return (
    <>
      <p className="hub-sub">Deine Spielstärke: <strong>{strength.toFixed(1)}</strong> (Wertung + Chemie). Gewinne, um die nächste Stufe freizuschalten.</p>
      <ol className="duel-list">
        {Array.from({ length: DUEL_LEVELS }, (_, k) => opponent(k + 1)).map((o) => {
          const locked = o.level > club.duelLevel;
          const odds = strength - o.strength;
          return (
            <li key={o.level} className={`duel ${locked ? 'locked' : ''} ${o.level < club.duelLevel ? 'beaten' : ''}`}>
              <span className="duel-lvl">{o.level}</span>
              <span className="duel-name"><strong>{o.name}</strong><small>Stärke {Math.round(o.strength)} · {odds >= 3 ? 'Favorit' : odds <= -3 ? 'Außenseiter' : 'Ausgeglichen'}</small></span>
              <span className="duel-reward">🪙 {o.reward}</span>
              <button className="btn primary small" disabled={locked} onClick={() => play(o.level)}>{locked ? '🔒' : 'Spielen'}</button>
            </li>
          );
        })}
      </ol>
      {live && <DuelLive name={opponent(live.level).name} result={live.result} onClose={() => setLive(null)} />}
    </>
  );
}

/** Kurzer Live-Ticker: die Minuten laufen hoch, Tore erscheinen nacheinander. */
function DuelLive({ name, result, onClose }: { name: string; result: DuelResult; onClose: () => void }) {
  const [minute, setMinute] = useState(motionReduced() ? 90 : 0);
  useEffect(() => {
    if (minute >= 90) return;
    const t = setTimeout(() => setMinute((m) => Math.min(90, m + 3)), 60);
    return () => clearTimeout(t);
  }, [minute]);
  const shown = result.goals.filter((g) => g.minute <= minute);
  const own = shown.filter((g) => g.own).length;
  const opp = shown.length - own;
  const done = minute >= 90;
  return (
    <div className="pack-open" role="dialog" aria-modal="true" aria-label="Duell">
      <div className="duel-live">
        <small>{done ? 'Abpfiff' : `${minute}. Minute`}</small>
        <div className="duel-score"><span>Dein Team</span><strong>{own} : {opp}</strong><span>{name}</span></div>
        <ul className="duel-goals">
          {shown.map((g, i) => <li key={i} className={g.own ? 'own' : 'opp'}>{g.minute}′ {g.own ? '⚽ Tor für dich!' : 'Gegentor'}</li>)}
        </ul>
        {done && (
          <>
            <p className={`duel-result ${result.outcome}`}>
              {result.outcome === 'win' ? (result.coins ? `Sieg! +${result.coins} Coins` : 'Sieg!') : result.outcome === 'draw' ? (result.coins ? `Unentschieden · +${result.coins} Coins` : 'Unentschieden') : 'Niederlage – stell dein Team um und versuch es nochmal.'}
            </p>
            <button className="btn primary big" onClick={onClose}>Weiter</button>
          </>
        )}
        {!done && <button className="pack-skip" onClick={() => setMinute(90)}>Überspringen</button>}
      </div>
    </div>
  );
}

// ---------- Freunde-Duell per Code ----------
function Friends({ full, onSquad }: { full: boolean; onSquad: () => void }) {
  const club = useClub();
  const [name, setName] = useState(club.teamName ?? '');
  const [msg, setMsg] = useState('');
  const [paste, setPaste] = useState('');
  const [live, setLive] = useState<{ name: string; result: DuelResult } | null>(null);
  const code = full ? exportTeam(club, name) : null;
  const friend = paste.trim() ? importTeam(paste) : null;
  const strength = teamStrength(club.squad.map((id) => cardById(club, id)));

  const saveName = (v: string) => {
    setName(v);
    setClubState({ ...getClubState(), teamName: v.slice(0, 30) });
  };
  const copy = async () => {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setMsg('Code kopiert – schick ihn deinen Freunden!');
    } catch {
      setMsg('Kopieren ging nicht automatisch – markiere den Code im Feld und kopiere ihn selbst.');
    }
  };
  const playFriend = () => {
    if (!friend || typeof friend === 'string') return;
    const res = playFriendDuel(getClubState(), friend);
    if (!res) return;
    setClubState(res.club);
    setLive({ name: friend.name, result: res.result });
  };

  if (!full) {
    return (
      <div className="hub-empty">
        <p>Für Freunde-Duelle brauchst du eine vollständige Elf (11 Spieler).</p>
        <button className="btn primary" onClick={onSquad}>Zur Aufstellung</button>
      </div>
    );
  }
  return (
    <div className="friends">
      <section className="backup-box">
        <h3>Dein Team-Code</h3>
        <small className="muted">Schick den Code an Freunde – sie können dann gegen deine aktuelle Elf spielen.</small>
        <label className="friends-name">
          Teamname
          <input value={name} onChange={(e) => saveName(e.target.value)} placeholder="z. B. Ayris Allstars" maxLength={30} />
        </label>
        <textarea className="backup-text" readOnly value={code ?? ''} rows={3} onFocus={(e) => e.target.select()} aria-label="Dein Team-Code" />
        <button className="btn primary" onClick={copy}>📋 Code kopieren</button>
        {msg && <small className="muted">{msg}</small>}
      </section>

      <section className="backup-box">
        <h3>Gegen einen Freund spielen</h3>
        <textarea className="backup-text" value={paste} onChange={(e) => setPaste(e.target.value)} rows={3} placeholder="Team-Code deines Freundes hier einfügen" spellCheck={false} aria-label="Team-Code eines Freundes" />
        {typeof friend === 'string' && <p className="cs-note bad">{friend}</p>}
        {friend && typeof friend !== 'string' && (
          <div className="friend-team">
            <div className="friend-head">
              <strong>{friend.name}</strong>
              <small>Stärke {friend.strength.toFixed(1)} · Wertung {friend.rating} · Chemie {friend.chemistry}/33 · deine Stärke {strength.toFixed(1)}</small>
            </div>
            <ol className="friend-players">
              {friend.players.map((pl, i) => <li key={i}><b>{pl.ovr}</b> {pl.name} <small>{SLOT_LABELS[i]}</small></li>)}
            </ol>
            <button className="btn primary big" onClick={playFriend}>⚔️ Duell starten</button>
            <small className="muted">Erster Sieg gegen dieses Team: +{FRIEND_REWARD} Coins.</small>
          </div>
        )}
      </section>
      {live && <DuelLive name={live.name} result={live.result} onClose={() => setLive(null)} />}
    </div>
  );
}

// ---------- Tauschaufgaben ----------
function Tasks() {
  const club = useClub();
  const [opening, setOpening] = useState<{ name: string; result: PackResult } | null>(null);
  const run = (taskId: string) => {
    const task = TASKS.find((t) => t.id === taskId)!;
    const pick = taskPick(getClubState(), task);
    if (!pick) return;
    if (!confirm(`Diese Karten abgeben?\n\n${pick.map((id) => cardById(getClubState(), id)!.name).join(', ')}`)) return;
    const done = completeTask(getClubState(), task);
    if (!done) return;
    const pack = openPack(done.club, task.reward, Math.random, true)!;
    setClubState(pack.club);
    setOpening({ name: PACKS.find((p) => p.id === task.reward)!.name, result: pack.result });
  };
  return (
    <>
      <p className="hub-sub">Gib Karten ab und bekomme dafür ein Pack. Aufgestellte Spieler und deine eigenen Sonderkarten werden nie abgegeben.</p>
      <div className="task-list">
        {TASKS.map((t) => {
          const pick = taskPick(club, t);
          return (
            <div key={t.id} className="task">
              <div className="grow">
                <strong>{t.name}</strong>
                <small>{t.text}</small>
                <small className="task-reward">Belohnung: {PACKS.find((p) => p.id === t.reward)!.name}{club.tasksDone[t.id] ? ` · schon ${club.tasksDone[t.id]}× erledigt` : ''}</small>
              </div>
              <button className="btn primary small" disabled={!pick} onClick={() => run(t.id)}>{pick ? 'Tauschen' : 'Fehlt noch'}</button>
            </div>
          );
        })}
      </div>
      {opening && <PackOpening name={opening.name} result={opening.result} onClose={() => setOpening(null)} onCollection={() => setOpening(null)} />}
    </>
  );
}
