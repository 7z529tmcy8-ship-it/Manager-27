import { useState } from 'react';
import { CARD_POOL, getCard, rarity, sellDuplicates, sellValue, type CollectCard } from '../game/club';
import { getClubState, setClubState, useClub } from '../clubStore';
import UtCard from './UtCard';

type Filter = 'all' | 'elite' | 'icon' | 'special' | 'dupes';
const FILTERS: [Filter, string][] = [['all', 'Alle'], ['elite', 'Elite 85+'], ['icon', 'Ikonen'], ['special', 'Sonderkarten'], ['dupes', 'Doppelte']];

/** Sammlung: alle gezogenen Karten und die eigenen Sonderkarten. */
export default function Collection({ onBack, onStore }: { onBack: () => void; onStore: () => void }) {
  const club = useClub();
  const [filter, setFilter] = useState<Filter>('all');
  const [msg, setMsg] = useState('');

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
        {Object.keys(club.cards).length} von {CARD_POOL.length} Karten gesammelt · {club.specials.length} eigene Sonderkarten · {club.packsOpened} Packs geöffnet
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
            <UtCard key={card.id} card={card} size="sm" count={count} shine={rarity(card) >= 200} />
          ))}
        </div>
      ) : (
        <div className="hub-empty">
          <p>{owned.length ? 'Keine Karten für diesen Filter.' : 'Noch keine Karten. Öffne dein erstes Pack im Store!'}</p>
          {!owned.length && <button className="btn primary" onClick={onStore}>Zum Store</button>}
        </div>
      )}
    </main>
  );
}
