import { useState } from 'react';
import { CARD_POOL, MAX_CARD_OVR, costTo99, getCard, rarity, sellDuplicates, sellValue, upgradeCard, upgradeCost, withUpgrade, type CollectCard } from '../game/club';
import { getClubState, setClubState, useClub } from '../clubStore';
import UtCard from './UtCard';
import { cardById } from '../game/squad';

type Filter = 'all' | 'elite' | 'icon' | 'special' | 'dupes';
const FILTERS: [Filter, string][] = [['all', 'Alle'], ['elite', 'Elite 85+'], ['icon', 'Ikonen'], ['special', 'Sonderkarten'], ['dupes', 'Doppelte']];

/** Sammlung: alle gezogenen Karten und die eigenen Sonderkarten. */
export default function Collection({ onBack, onStore }: { onBack: () => void; onStore: () => void }) {
  const club = useClub();
  const [filter, setFilter] = useState<Filter>('all');
  const [msg, setMsg] = useState('');
  const [detail, setDetail] = useState<string | null>(null);

  const owned: { card: CollectCard; count: number }[] = [
    ...club.specials.map((card) => ({ card: withUpgrade(club, card), count: 1 })),
    ...Object.entries(club.cards).filter(([id]) => getCard(id)).map(([id, count]) => ({ card: withUpgrade(club, getCard(id)!), count })),
  ].sort((a, b) => rarity(b.card) - rarity(a.card));

  const shown = owned.filter(({ card, count }) =>
    filter === 'all' ? true
      : filter === 'elite' ? card.ovr >= 85
        : filter === 'icon' ? card.variant === 'icon'
          : filter === 'special' ? ['tots', 'potm', 'record', 'champion'].includes(card.variant)
            : count > 1,
  );
  const dupeValue = Object.entries(club.cards).reduce((a, [id, n]) => a + (n > 1 ? (n - 1) * sellValue(getCard(id)!) : 0), 0);

  const sell = () => {
    const res = sellDuplicates(getClubState());
    setClubState(res.club);
    setMsg(`${res.count} doppelte Karten verkauft: +${res.coins.toLocaleString('de-DE')} Coins.`);
  };

  return (
    <main className="hub">
      <header className="hub-top">
        <button className="hub-back" onClick={onBack}>‹ Hauptmenü</button>
        <span className="hub-coins">🪙 {club.coins.toLocaleString('de-DE')}</span>
      </header>
      <h1 className="hub-title">Sammlung</h1>
      <p className="hub-sub">
        {Object.keys(club.cards).length} von {CARD_POOL.length} Karten gesammelt · {club.specials.length} eigene Karten · {club.packsOpened} Packs geöffnet
      </p>

      <div className="hub-row">
        <div className="chips">
          {FILTERS.map(([id, label]) => (
            <button key={id} className={`chip ${filter === id ? 'active' : ''}`} onClick={() => setFilter(id)}>{label}</button>
          ))}
        </div>
        {dupeValue > 0 && <button className="btn secondary small" onClick={sell}>Doppelte verkaufen (+{dupeValue.toLocaleString('de-DE')} 🪙)</button>}
      </div>
      {msg && <p className="hub-msg">{msg}</p>}


      {shown.length ? (
        <div className="collection-grid">
          {shown.map(({ card, count }) => (
            <UtCard key={card.id} card={card} size="sm" count={count} shine={rarity(card) >= 200} onClick={() => setDetail(card.id)} />
          ))}
        </div>
      ) : (
        <div className="hub-empty">
          <p>{owned.length ? 'Keine Karten für diesen Filter.' : 'Noch keine Karten. Öffne dein erstes Pack im Store!'}</p>
          {!owned.length && <button className="btn primary" onClick={onStore}>Zum Store</button>}
        </div>
      )}
      {detail && <CardDetail id={detail} onClose={() => setDetail(null)} />}
    </main>
  );
}

/** Große Ansicht einer Karte mit Werten, Anzahl, Status im Team und Einzelverkauf. */
function CardDetail({ id, onClose }: { id: string; onClose: () => void }) {
  const club = useClub();
  const card = cardById(club, id);
  if (!card) return null;
  const count = club.cards[id] ?? 1;
  // Verkaufswert immer vom Grundwert – Verbesserungen bringen beim Verkauf nichts zurück.
  const value = sellValue({ ...card, ovr: card.ovr - (card.boost ?? 0) });
  const own = club.specials.some((s) => s.id === id);
  const inSquad = club.squad.includes(id);
  const canSell = !own && (count > 1 || !inSquad);
  const sellOne = () => {
    const c = getClubState();
    const n = (c.cards[id] ?? 0) - 1;
    const cards = { ...c.cards };
    const upgrades = { ...(c.upgrades ?? {}) };
    if (n > 0) cards[id] = n;
    else {
      delete cards[id];
      delete upgrades[id]; // Verbesserungen gehen mit der letzten Karte verloren
    }
    setClubState({ ...c, cards, upgrades, coins: c.coins + value });
    if (n <= 0) onClose();
  };
  return (
    <div className="overlay card-detail" role="dialog" aria-modal="true" aria-label={card.name}>
      <div className="overlay-inner">
        <header className="overlay-head"><button className="nav-back" onClick={onClose}>‹ Zurück</button></header>
        <div className="detail-body">
          <UtCard card={card} size="lg" shine={rarity(card) >= 200} />
          <div className="detail-info">
            <h2>{card.name}</h2>
            <ul className="mk-kv">
              <li><span>Position</span><span>{card.position}</span></li>
              <li><span>Nation</span><span>{card.nation}</span></li>
              <li><span>{card.league ? 'Verein' : 'Kartentyp'}</span><span>{card.league ? `${card.club} · ${card.league}` : card.label ?? card.club}</span></li>
              <li><span>Im Besitz</span><span>{own ? 'eigene Sonderkarte' : `${count}×`}</span></li>
              <li><span>Im Team</span><span>{inSquad ? 'aufgestellt' : 'nein'}</span></li>
              {!own && <li><span>Verkaufswert</span><span>🪙 {value.toLocaleString('de-DE')}</span></li>}
            </ul>
            <UpgradeBox card={card} coins={club.coins} onUpgrade={() => {
              const next = upgradeCard(getClubState(), id);
              if (next) setClubState(next);
            }} />
            {canSell && <button className="btn secondary" onClick={sellOne}>1× verkaufen (+{value.toLocaleString('de-DE')} 🪙)</button>}
            {canSell && count === 1 && (card.boost ?? 0) > 0 && <p className="muted">Beim Verkauf der letzten Karte gehen die Verbesserungen verloren.</p>}
            {!canSell && !own && <p className="muted">Aufgestellt – zum Verkaufen erst aus dem Team nehmen.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Karte mit Coins verbessern: jede Stufe teurer, 99 ist das Maximum. */
function UpgradeBox({ card, coins, onUpgrade }: { card: CollectCard; coins: number; onUpgrade: () => void }) {
  const fmt = (n: number) => n.toLocaleString('de-DE');
  if (card.ovr >= MAX_CARD_OVR) {
    return <div className="upgrade-box max"><strong>👑 Maximal verbessert</strong><small>Diese Karte hat 99 erreicht.</small></div>;
  }
  const cost = upgradeCost(card.ovr);
  const afford = coins >= cost;
  return (
    <div className="upgrade-box">
      <div className="upgrade-head">
        <strong>⬆️ Karte verbessern</strong>
        {(card.boost ?? 0) > 0 && <span className="upgrade-boost">bereits +{card.boost}</span>}
      </div>
      <button className="btn primary" disabled={!afford} onClick={onUpgrade}>
        {card.ovr} → {card.ovr + 1} · 🪙 {fmt(cost)}
      </button>
      <small>{afford ? `Bis 99 insgesamt noch 🪙 ${fmt(costTo99(card.ovr))}` : `Dir fehlen 🪙 ${fmt(cost - coins)}`}</small>
    </div>
  );
}
