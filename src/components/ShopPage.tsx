import { useState } from 'react';
import { getClubState, setClubState, useClub } from '../clubStore';
import { TOTW_PACK, activePacks, oddsAtLeast, openPack, openTotwPack, teamOfTheWeek, type PackResult } from '../game/club';
import { claimFreePack, freePackReady, milestoneState } from '../game/collection';
import Icon from './Icon';
import PackOpen from './PackOpen';
import UtCard from './UtCard';

const fmt = (n: number) => Math.round(n).toLocaleString('de-DE');
const pct = (n: number) => (n >= 10 ? Math.round(n) : n >= 1 ? n.toFixed(1) : n.toFixed(2)).toString().replace('.', ',');

/** Shop: Packs für Coins, täglicher Gratis-Pack, Pack der Woche – und wie man an Coins kommt. */
export default function ShopPage({ onCollection, onCasino, onDuels }: { onCollection: () => void; onCasino: () => void; onDuels: () => void }) {
  const club = useClub();
  const [open, setOpen] = useState<{ name: string; result: PackResult } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const free = freePackReady(club);
  const totw = teamOfTheWeek();
  const ms = milestoneState(club);

  const buy = (id: string, name: string) => {
    const r = openPack(getClubState(), id);
    if (!r) { setErr(`Für das ${name} fehlen dir noch Coins.`); return; }
    setErr(null);
    setClubState(r.club);
    setOpen({ name, result: r.result });
  };
  const buyTotw = () => {
    const r = openTotwPack(getClubState());
    if (!r) { setErr('Für das Pack der Woche fehlen dir noch Coins.'); return; }
    setClubState(r.club);
    setOpen({ name: TOTW_PACK.name, result: r.result });
  };
  const freeOpen = () => {
    const r = claimFreePack(getClubState());
    if (!r) return;
    setClubState(r.club);
    setOpen({ name: 'Gratis-Pack', result: r.result });
  };

  return (
    <main className="hub sh">
      <header className="sh-top">
        <h1 className="ch-title">Shop</h1>
        <span className="sh-coins"><Icon name="coin" size={18} />{fmt(club.coins)}</span>
      </header>

      <button className={`sh-free ${free ? 'ready' : ''}`} onClick={freeOpen} disabled={!free}>
        <span className="sh-free-ic"><Icon name="gift" size={30} /></span>
        <span><b>{free ? 'Gratis-Pack wartet!' : 'Gratis-Pack abgeholt'}</b><small>{free ? 'Jeden Tag ein Standard-Pack geschenkt' : 'Morgen gibt es den nächsten'}</small></span>
        {free && <em>Öffnen</em>}
      </button>

      <section className="sh-totw">
        <div className="sh-totw-head"><b>Pack der Woche</b><small>1 Karte aus dem Team der Woche + 2 Gold-Karten</small></div>
        <div className="sh-totw-cards">{totw.slice(0, 5).map((c) => <UtCard key={c.id} card={c} size="xs" />)}</div>
        <button className="btn primary" disabled={club.coins < TOTW_PACK.price} onClick={buyTotw}><Icon name="coin" size={16} />{fmt(TOTW_PACK.price)}</button>
      </section>

      {err && <p className="sh-err" role="status">{err}</p>}

      <h2 className="ch-h">Packs</h2>
      <ul className="sh-packs">
        {activePacks().map((p) => (
          <li key={p.id} className={`sh-pack p-${p.id}`}>
            <span className="sh-pack-ic"><Icon name="pack" size={28} /><b>{p.size}</b></span>
            <span className="sh-pack-text">
              <b>{p.name}</b>
              <small>{p.text}</small>
              <small className="sh-odds">Weltklasse (87+) oder besser: {pct(oddsAtLeast(p.first?.odds ?? p.odds, 'elite'))} %{(p.first?.odds ?? p.odds).icon ? ` · Ikone: ${pct(oddsAtLeast(p.first?.odds ?? p.odds, 'icon'))} %` : ''}</small>
            </span>
            <button className="btn primary" disabled={club.coins < p.price} onClick={() => buy(p.id, p.name)}><Icon name="coin" size={15} />{fmt(p.price)}</button>
          </li>
        ))}
      </ul>

      <h2 className="ch-h">So kommst du an Coins</h2>
      <ul className="sh-earn">
        <li><Icon name="ball" size={20} /><span><b>Karriere</b><small>Jede gespielte Saison zahlt Coins aus – je besser, desto mehr.</small></span></li>
        <li><button onClick={onDuels}><Icon name="duel" size={20} /><span><b>Duelle</b><small>Jeder Sieg in Division Rivals bringt Coins, höhere Divisionen mehr.</small></span><Icon name="arrow" size={18} /></button></li>
        <li><button onClick={onCasino}><Icon name="dice" size={20} /><span><b>Casino</b><small>Chips zurück in Coins tauschen (2 : 1) – in der Chip-Kasse.</small></span><Icon name="arrow" size={18} /></button></li>
        <li><button onClick={onCollection}><Icon name="cards" size={20} /><span><b>Sammlung</b><small>{ms.ready.length ? 'Meilenstein-Belohnung wartet!' : ms.next ? `Bei ${ms.next.at} Karten: ${fmt(ms.next.coins)} Coins + ${fmt(ms.next.chips)} Chips` : 'Alle Meilensteine erreicht'} · Doppelte verkaufen.</small></span><Icon name="arrow" size={18} /></button></li>
      </ul>

      {open && <PackOpen name={open.name} result={open.result} onClose={() => setOpen(null)} onCollection={() => { setOpen(null); onCollection(); }} />}
    </main>
  );
}
