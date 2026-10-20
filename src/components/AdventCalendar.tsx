import { useState } from 'react';
import { getClubState, setClubState, useClub } from '../clubStore';
import { PACKS, type CollectCard, type PackResult } from '../game/club';
import { ADVENT, adventOpen, adventToday, openAdventDoor, type AdventReward } from '../game/winter';
import Icon from './Icon';
import { PackOpening } from './Store';

const fmt = (n: number) => n.toLocaleString('de-DE');
const rewardIcon = (r: AdventReward) => (r.kind === 'coins' ? 'coin' : r.kind === 'pack' ? 'pack' : 'star');
const rewardText = (r: AdventReward) =>
  r.kind === 'coins' ? `${fmt(r.amount)} Coins` : r.kind === 'pack' ? PACKS.find((p) => p.id === r.pack)!.name : 'Winter-Wunder-Karte';

/** Adventskalender des Winter-Wunder-Events: jeden Tag ein Türchen, verpasste lassen sich nachholen. */
export default function AdventCalendar({ onClose, onCollection }: { onClose: () => void; onCollection: () => void }) {
  const club = useClub();
  const today = adventToday();
  const [opening, setOpening] = useState<{ name: string; result: PackResult } | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [popped, setPopped] = useState<number | null>(null);

  const open = (day: number) => {
    const res = openAdventDoor(getClubState(), day);
    if (!res) return;
    setClubState(res.club);
    setPopped(day);
    if (res.coins) { setToast(`Türchen ${day}: +${fmt(res.coins)} Coins`); setTimeout(() => setToast(null), 2000); }
    if (res.pack) setTimeout(() => setOpening(res.pack!), 450);
    if (res.card) setTimeout(() => setOpening({ name: 'Türchen 24', result: { cards: [{ card: res.card as CollectCard, duplicate: false }], items: [] } }), 450);
  };

  return (
    <div className="overlay advent" role="dialog" aria-modal="true" aria-label="Adventskalender">
      <div className="overlay-inner">
        <header className="overlay-head"><button className="nav-back" onClick={onClose}>‹ Zurück</button></header>
        <span className="advent-kicker">Winter-Wunder · 1.–24. Dezember</span>
        <h1 className="overlay-title advent-title">Adventskalender</h1>
        <p className="hub-sub">Jeden Tag ein Türchen – verpasste kannst du bis zum 27. Dezember nachholen. Hinter Türchen 24 wartet eine Winter-Wunder-Karte.</p>
        <ol className="advent-grid">
          {ADVENT.map((r) => {
            const isOpen = adventOpen(club, r.day);
            const ready = !isOpen && r.day <= today;
            return (
              <li key={r.day} className={`advent-door ${isOpen ? 'open' : ''} ${ready ? 'ready' : ''} ${r.day === 24 ? 'big' : ''} ${popped === r.day ? 'pop' : ''}`}>
                <button disabled={!ready} onClick={() => open(r.day)} aria-label={`Türchen ${r.day}${isOpen ? `: ${rewardText(r)}` : ready ? ', öffnen' : ', noch zu'}`}>
                  {isOpen
                    ? <><Icon name={rewardIcon(r)} size={r.day === 24 ? 34 : 24} /><small>{rewardText(r)}</small></>
                    : <><b>{r.day}</b>{ready ? <small>Öffnen</small> : <Icon name="lock" size={14} />}</>}
                </button>
              </li>
            );
          })}
        </ol>
      </div>
      {toast && <div className="coin-toast" role="status"><Icon name="coin" size={16} className="coin-ic" />{toast}</div>}
      {opening && <PackOpening name={opening.name} theme="winter" result={opening.result} onClose={() => setOpening(null)} onCollection={() => { setOpening(null); onCollection(); }} />}
    </div>
  );
}
