import { useState } from 'react';
import { getClubState, setClubState, useClub } from '../clubStore';
import { PACKS, type PackResult } from '../game/club';
import {
  POLAR, POLAR_UNLOCK, openPolarDoor, polarDoorPrice, polarDoorState, polarFreeUpTo, polarNextBuyable, polarRestPrice, unlockPolar, type PolarReward,
} from '../game/polar';
import Icon, { type IconName } from './Icon';
import { PackOpening } from './Store';

const fmt = (n: number) => n.toLocaleString('de-DE');
const rewardIcon = (r: PolarReward): IconName => (r.kind === 'coins' ? 'coin' : r.kind === 'pack' ? 'pack' : r.best ? 'crown' : 'snow');
const rewardText = (r: PolarReward) =>
  r.kind === 'coins' ? `${fmt(r.amount)} Coins` : r.kind === 'pack' ? PACKS.find((p) => p.id === r.pack)!.name : r.best ? 'Top-Winterkarte' : 'Winter-Karte';

/** Polarlicht-Kalender: Premium-Adventskalender, jetzt für 1 Mio. freischaltbar – warten oder Türchen vorab freikaufen. */
export default function PolarCalendar({ onClose, onCollection }: { onClose: () => void; onCollection: () => void }) {
  const club = useClub();
  const [opening, setOpening] = useState<{ name: string; result: PackResult } | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [popped, setPopped] = useState<number | null>(null);
  const unlocked = !!club.polar?.unlocked;
  const openedCount = club.polar?.opened.length ?? 0;
  const free = polarFreeUpTo();
  const next = polarNextBuyable(club);
  const rest = polarRestPrice(club);

  const say = (t: string) => { setToast(t); setTimeout(() => setToast(null), 2200); };

  const unlock = () => {
    const res = unlockPolar(getClubState());
    if (!res) { say(`Dir fehlen ${fmt(POLAR_UNLOCK - getClubState().coins)} Coins.`); return; }
    setClubState(res);
    say('Polarlicht-Kalender freigeschaltet!');
  };

  const open = (r: PolarReward) => {
    const state = polarDoorState(getClubState(), r.day);
    if (state === 'buy') {
      const price = polarDoorPrice(r.day);
      if (getClubState().coins < price) { say(`Türchen ${r.day} kostet ${fmt(price)} Coins.`); return; }
      if (!window.confirm(`Türchen ${r.day} jetzt für ${fmt(price)} Coins öffnen? Am ${r.day}. Dezember wäre es gratis.`)) return;
    }
    const res = openPolarDoor(getClubState(), r.day);
    if (!res) return;
    setClubState(res.club);
    setPopped(r.day);
    if (res.coins) say(`Türchen ${r.day}: +${fmt(res.coins)} Coins`);
    if (res.pack) setTimeout(() => setOpening(res.pack!), 450);
    if (res.card) setTimeout(() => setOpening({ name: `Türchen ${r.day}`, result: { cards: [{ card: res.card!, duplicate: false }], items: [] } }), 450);
  };

  return (
    <div className="overlay polar" role="dialog" aria-modal="true" aria-label="Polarlicht-Kalender">
      <div className="polar-sky" aria-hidden="true"><i /><i /><i /></div>
      <div className="overlay-inner">
        <header className="overlay-head"><button className="nav-back" onClick={onClose}>‹ Zurück</button></header>

        <section className="polar-hero">
          <span className="polar-kicker"><Icon name="snow" size={14} /> Premium · Winter-Wunder 2026</span>
          <h1 className="polar-title">Polarlicht-<br />Kalender</h1>
          <p className="polar-sub">
            24 Türchen mit 5 Winter-Wunder-Karten, Ikonen- und Ultimate-Pack. Ab dem 1. Dezember öffnet jeden Tag ein Türchen gratis –
            oder du kaufst sie jetzt schon der Reihe nach frei.
          </p>
          <div className="polar-meter" aria-label={`${openedCount} von 24 geöffnet`}>
            <span><b>{openedCount}</b>/24 geöffnet</span>
            <div className="polar-track"><i style={{ width: `${(openedCount / 24) * 100}%` }} /></div>
          </div>
          {!unlocked ? (
            <button className="polar-unlock" onClick={unlock}>
              <span>Jetzt freischalten</span>
              <b><Icon name="coin" size={18} />{fmt(POLAR_UNLOCK)}</b>
            </button>
          ) : (
            <p className="polar-status">
              {next
                ? <>Nächstes Türchen: <b>{next}</b> für <b>{fmt(polarDoorPrice(next))}</b> Coins{free ? '' : ` – oder gratis am ${next}. Dezember`}. Alle restlichen jetzt: {fmt(rest)} Coins.</>
                : openedCount < 24 ? 'Die übrigen Türchen sind heute gratis – einfach antippen.' : 'Alle 24 Türchen geöffnet. Frohe Weihnachten!'}
            </p>
          )}
        </section>

        <ol className={`polar-grid ${unlocked ? '' : 'is-locked'}`}>
          {POLAR.map((r) => {
            const state = polarDoorState(club, r.day);
            const card = r.kind === 'card';
            return (
              <li key={r.day} className={`polar-door s-${state} ${card ? 'is-card' : ''} ${r.day === 24 ? 'is-big' : ''} ${popped === r.day ? 'pop' : ''}`}>
                <button disabled={state === 'locked'} onClick={() => open(r)}
                  aria-label={`Türchen ${r.day}: ${rewardText(r)}${state === 'open' ? ', geöffnet' : state === 'free' ? ', gratis öffnen' : state === 'buy' ? `, für ${fmt(polarDoorPrice(r.day))} Coins kaufen` : ', gesperrt'}`}>
                  <span className="polar-num">{r.day}</span>
                  <span className="polar-reward"><Icon name={rewardIcon(r)} size={20} /><small>{rewardText(r)}</small></span>
                  {state === 'free' && <span className="polar-tag free">Gratis</span>}
                  {state === 'buy' && <span className="polar-tag buy"><Icon name="coin" size={12} />{fmt(polarDoorPrice(r.day))}</span>}
                  {state === 'locked' && <span className="polar-lock"><Icon name="lock" size={12} /></span>}
                  {state === 'open' && <span className="polar-tag done"><Icon name="check" size={12} /></span>}
                </button>
              </li>
            );
          })}
        </ol>
        <p className="polar-foot">Gratis-Türchen vom 1. bis 24. Dezember, verpasste bis 27. Dezember nachholbar. Danach schließt der Kalender.</p>
      </div>
      {toast && <div className="coin-toast" role="status"><Icon name="coin" size={16} className="coin-ic" />{toast}</div>}
      {opening && <PackOpening name={opening.name} theme="winter" result={opening.result} onClose={() => setOpening(null)} onCollection={() => { setOpening(null); onCollection(); }} />}
    </div>
  );
}
