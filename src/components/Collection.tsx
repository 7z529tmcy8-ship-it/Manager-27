import { useState } from 'react';
import { CARD_POOL, getCard, rarity, sellDuplicates, sellValue, type CollectCard } from '../game/club';
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
    ...club.specials.map((card) => ({ card, count: 1 })),
    ...Object.entries(club.cards).map(([id, count]) => ({ card: getCard(id)!, count })).filter((x) => x.card),
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
  const own = club.specials.some((s) => s.id === id);
  const inSquad = club.squad.includes(id);
  const canSell = !own && (count > 1 || !inSquad);
  const sellOne = () => {
    const c = getClubState();
    const n = (c.cards[id] ?? 0) - 1;
    const cards = { ...c.cards };
    if (n > 0) cards[id] = n;
    else delete cards[id];
    setClubState({ ...c, cards, coins: c.coins + sellValue(card) });
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
              {!own && <li><span>Verkaufswert</span><span>🪙 {sellValue(card).toLocaleString('de-DE')}</span></li>}
            </ul>
            {canSell && <button className="btn secondary" onClick={sellOne}>1× verkaufen (+{sellValue(card).toLocaleString('de-DE')} 🪙)</button>}
            {!canSell && !own && <p className="muted">Aufgestellt – zum Verkaufen erst aus dem Team nehmen.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
