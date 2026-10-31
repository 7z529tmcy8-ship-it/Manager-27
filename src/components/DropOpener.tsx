import { useEffect, useState } from 'react';
import { getClubState, setClubState } from '../clubStore';
import { DROP_LABEL, DROP_ORDER, dropRewardText, openAllDrops, openDrop, type DropKind, type DropOpen, type DropRarity } from '../game/glory';
import { PACKS } from '../game/club';
import { play } from '../sound';
import Icon from './Icon';
import UtCard from './UtCard';

// ---------- Drop öffnen (nach dem Vorbild der Starr Drops, eigenes Design) ----------
// Antippen statt Halten: Jeder Tipp lässt den Drop federn. Bei einem Aufstieg wechselt der ganze Bildschirm
// die Farbe und die Seltenheit springt groß ins Bild. Der letzte Tipp öffnet ihn sauber – die Belohnung steigt heraus.
// Die Seltenheit steht beim Öffnen schon fest (openDrop); die Tipps zeigen sie nur Schritt für Schritt.

const upgradesOf = (d: DropOpen) => d.steps.length - 1;
const vibrate = (p: number | number[]) => { try { navigator.vibrate?.(p); } catch { /* nicht unterstützt */ } };
const RUMBLE: Record<DropRarity, number[]> = {
  selten: [30], superselten: [40, 30, 40], episch: [60, 40, 60], mythisch: [80, 40, 80, 40, 120], legendaer: [120, 50, 120, 50, 260],
};

/** Alle Drops auf einmal: erst Mega-Drops, dann normale – als eine Übersicht. */
function collectAll(): DropOpen[] {
  let club = getClubState();
  const out: DropOpen[] = [];
  for (const k of ['mega', 'normal'] as const) {
    const res = openAllDrops(club, k);
    club = res.club;
    out.push(...res.opened);
  }
  setClubState(club);
  return out;
}

export default function DropOpener({ kind, all, onClose, onStore }: { kind: DropKind; all?: boolean; onClose: () => void; onStore?: () => void }) {
  const [drop, setDrop] = useState<DropOpen | null>(null);
  const [taps, setTaps] = useState(0);
  const [bump, setBump] = useState(0);
  const [bulk, setBulk] = useState<DropOpen[] | null>(null);

  const left = () => (kind === 'mega' ? getClubState().megaDrops ?? 0 : getClubState().drops ?? 0);
  const next = () => {
    const res = openDrop(getClubState(), Math.random, Date.now(), kind);
    if (!res) { onClose(); return; }
    setClubState(res.club);
    setDrop(res);
    setTaps(0);
    setBump(0);
  };
  const cheer = () => {
    try { play('fanfare'); } catch { /* kein Ton */ }
    vibrate([40, 30, 80]);
  };
  useEffect(() => {
    if (!all) { next(); return; }
    const list = collectAll();
    if (!list.length) { onClose(); return; }
    setBulk(list);
    cheer();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const openAll = () => {
    const res = openAllDrops(getClubState(), kind);
    setClubState(res.club);
    setBulk(drop && taps < upgradesOf(drop) + 2 ? [drop, ...res.opened] : res.opened);
    cheer();
  };

  if (bulk) return <DropSummary list={bulk} onClose={onClose} onStore={onStore} />;
  if (!drop) return null;
  const upgrades = upgradesOf(drop);
  const total = upgrades + 2;
  const opened = taps >= total;
  const rarity = drop.steps[Math.min(taps, upgrades)];
  const remaining = left();

  const tap = () => {
    if (opened) return;
    const t = taps + 1;
    setTaps(t);
    setBump((b) => b + 1);
    if (t >= total) {
      vibrate(RUMBLE[drop.rarity]);
      try { play(drop.rarity === 'legendaer' ? 'walkout' : drop.rarity === 'mythisch' ? 'revealRare' : 'reveal'); } catch { /* kein Ton */ }
    } else if (t <= upgrades) {
      vibrate([30, 20, 50]);
      try { play('revealRare'); } catch { /* kein Ton */ }
    } else {
      vibrate(15);
      try { play('tap'); } catch { /* kein Ton */ }
    }
  };
  const upgraded = taps > 0 && taps <= upgrades;

  return (
    <div className={`dx r-${rarity} ${opened ? 'open' : ''}`} role="dialog" aria-modal="true" aria-label="Drop öffnen" onClick={tap}>
      {/* Hintergrund je Seltenheit – nur Deckkraft wird überblendet */}
      {DROP_ORDER.map((r) => <span key={r} className={`dx-bg b-${r} ${r === rarity ? 'on' : ''}`} aria-hidden="true" />)}
      <span className="dx-rays" aria-hidden="true" />

      <span key={`l-${rarity}`} className={`dx-label ${upgraded ? 'up' : ''}`}>{DROP_LABEL[rarity]}</span>
      {kind === 'mega' && !opened && <span className="dx-mega">Mega-Drop</span>}

      {!opened ? (
        <>
          <button className="dx-drop" aria-label="Antippen" onClick={(e) => { e.stopPropagation(); tap(); }}>
            <span key={`b-${bump}`} className={`dx-body ${bump ? 'hit' : ''} ${upgraded ? 'big' : ''}`}>
              <i className="dx-shine" />
              <Icon name="spark" size={44} />
            </span>
            <span key={`w-${bump}`} className={`dx-ring ${bump ? 'go' : ''} ${upgraded ? 'big' : ''}`} aria-hidden="true" />
          </button>
          <span className="dx-dots" aria-label={`${total - taps} Tipps übrig`}>
            {Array.from({ length: total }, (_, i) => <i key={i} className={i < taps ? 'done' : ''} />)}
          </span>
          <small className="dx-hint">Antippen</small>
        </>
      ) : (
        <div className="dx-reward" onClick={(e) => e.stopPropagation()}>
          <span className="dx-burst" aria-hidden="true" />
          <div className="dx-prize">
            {drop.reward.kind === 'card' ? <UtCard card={drop.reward.card} size="md" shine />
              : <span className={`dx-token ${drop.reward.kind}`}><Icon name={drop.reward.kind === 'coins' ? 'coin' : 'pack'} size={56} /></span>}
          </div>
          <strong className="dx-what">{dropRewardText(drop.reward)}</strong>
          <small className="dx-where">{drop.reward.kind === 'pack' ? 'Liegt in deiner Pack-Ablage' : drop.reward.kind === 'card' ? (drop.duplicate ? 'Doppelt – in deiner Sammlung' : 'Neu in deiner Sammlung') : 'Gutgeschrieben'}</small>
          <div className="dx-actions">
            {remaining > 0 && <button className="btn primary big" onClick={next}>Nächster Drop ({remaining})</button>}
            {remaining > 1 && <button className="btn secondary big" onClick={openAll}>Alle öffnen ({remaining})</button>}
            {drop.reward.kind === 'pack' && onStore && <button className="btn secondary big" onClick={() => { onClose(); onStore(); }}>Zur Ablage</button>}
            <button className={`btn ${remaining > 0 ? 'ghost' : 'primary'} big`} onClick={onClose}>{remaining > 0 ? 'Später' : 'Fertig'}</button>
          </div>
        </div>
      )}
      {!opened && remaining > 0 && (
        <button className="dx-all" onClick={(e) => { e.stopPropagation(); openAll(); }}>Alle öffnen ({remaining + 1})</button>
      )}
    </div>
  );
}

/** Übersicht nach „Alle öffnen“: Seltenheiten zählen, Coins summieren, Karten und Packs zeigen. */
function DropSummary({ list, onClose, onStore }: { list: DropOpen[]; onClose: () => void; onStore?: () => void }) {
  const coins = list.reduce((a, o) => a + (o.reward.kind === 'coins' ? o.reward.amount : 0), 0);
  const cards = list.flatMap((o) => (o.reward.kind === 'card' ? [o.reward.card] : []));
  const packs = list.flatMap((o) => (o.reward.kind === 'pack' ? [o.reward.pack] : []));
  const best = list.reduce((b, o) => (DROP_ORDER.indexOf(o.rarity) > DROP_ORDER.indexOf(b) ? o.rarity : b), list[0]?.rarity ?? 'selten');
  const count = (r: DropRarity) => list.filter((o) => o.rarity === r).length;
  const packCount = packs.reduce<Record<string, number>>((m, p) => ({ ...m, [p]: (m[p] ?? 0) + 1 }), {});
  return (
    <div className={`dx summary r-${best}`} role="dialog" aria-modal="true" aria-label="Alle Drops geöffnet">
      {DROP_ORDER.map((r) => <span key={r} className={`dx-bg b-${r} ${r === best ? 'on' : ''}`} aria-hidden="true" />)}
      <div className="dx-sum">
        <h2>{list.length} {list.every((o) => o.kind === 'mega') ? 'Mega-Drops' : 'Drops'} geöffnet</h2>
        <ul className="dx-rarities">
          {DROP_ORDER.filter((r) => count(r) > 0).map((r) => <li key={r} className={`rr-${r}`}><b>{count(r)}×</b>{DROP_LABEL[r]}</li>)}
        </ul>
        {coins > 0 && <p className="dx-coins"><Icon name="coin" size={22} />+{coins.toLocaleString('de-DE')} Coins</p>}
        {packs.length > 0 && (
          <ul className="dx-packs">
            {Object.entries(packCount).map(([id, n]) => <li key={id}><Icon name="pack" size={18} />{n}× {PACKS.find((p) => p.id === id)?.name ?? id}</li>)}
          </ul>
        )}
        {cards.length > 0 && <div className="dx-cards">{cards.map((c, i) => <UtCard key={`${c.id}-${i}`} card={c} size="sm" shine />)}</div>}
        <div className="dx-actions">
          {packs.length > 0 && onStore && <button className="btn secondary big" onClick={() => { onClose(); onStore(); }}>Packs in der Ablage öffnen</button>}
          <button className="btn primary big" onClick={onClose}>Fertig</button>
        </div>
      </div>
    </div>
  );
}
