import { useState } from 'react';
import { CARD_POOL, collectionProgress, getCard, rarity, sellDuplicates, sellValue, withUpgrade, type CollectCard } from '../game/club';
import { getClubState, setClubState, useClub } from '../clubStore';
import UtCard from './UtCard';
import { cardById } from '../game/squad';
import Icon from './Icon';
import { EVO_CAP, EVO_FEE, EVO_PATHS, EVO_VARIANTS, cancelEvo, evoBlocker, evoGained, getPath, startEvo, stepText } from '../game/evolutions';

type Filter = 'all' | 'elite' | 'icon' | 'cult' | 'wonder' | 'talent' | 'debut' | 'comeback' | 'flashback' | 'special' | 'dupes';

/** Filter der Sammlung; bei Kartenarten mit fester Anzahl zeigt der Chip „gesammelt/insgesamt“. */
const FILTERS: { id: Filter; label: string; test: (c: CollectCard) => boolean; total?: boolean }[] = [
  { id: 'all', label: 'Alle', test: () => true },
  { id: 'elite', label: 'Elite 85+', test: (c) => c.ovr >= 85 },
  { id: 'icon', label: 'Ikonen', test: (c) => c.variant === 'icon', total: true },
  { id: 'cult', label: 'Kult-Helden', test: (c) => c.variant === 'cult', total: true },
  { id: 'wonder', label: 'Wunderkinder', test: (c) => c.age !== undefined && c.age <= 21, total: true },
  { id: 'talent', label: 'Was wäre wenn', test: (c) => c.variant === 'talent', total: true },
  { id: 'debut', label: 'Debüts', test: (c) => c.variant === 'debut', total: true },
  { id: 'comeback', label: 'Comebacks', test: (c) => c.variant === 'comeback', total: true },
  { id: 'flashback', label: 'Rückblenden', test: (c) => c.variant === 'flashback', total: true },
  { id: 'special', label: 'Sonderkarten', test: (c) => ['tots', 'potm', 'record', 'champion', 'moment', 'present', 'halloween', 'gala', 'totw', 'ballondor', 'poty', 'topscorer', 'goldenboy', 'ucl', 'worldcup', 'pass', 'gig', 'winter', 'silvester'].includes(c.variant) },
  { id: 'dupes', label: 'Doppelte', test: () => true },
];

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

  const progress = collectionProgress(club);
  const active = FILTERS.find((f) => f.id === filter)!;
  const shown = owned.filter(({ card, count }) => (filter === 'dupes' ? count > 1 : active.test(card)));
  const chipLabel = (f: (typeof FILTERS)[number]) => {
    if (!f.total) return f.label;
    const have = owned.filter(({ card }) => f.test(card)).length;
    return `${f.label} ${have}/${CARD_POOL.filter(f.test).length}`;
  };
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
        <span className="hub-coins"><Icon name="coin" size={16} className="coin-ic" />{club.coins.toLocaleString('de-DE')}</span>
      </header>
      <h1 className="hub-title">Sammlung</h1>
      <div className="collect-progress" aria-label={`${progress.label} der Sammlung`}>
        <div className="collect-progress-top"><strong>{progress.label}</strong><span>{progress.have} von {progress.total} Karten gesammelt</span></div>
        <div className="collect-bar"><i style={{ width: `${Math.max(progress.percent, progress.have ? 1 : 0)}%` }} /></div>
      </div>
      <p className="hub-sub">{club.specials.length} eigene Karten · {club.packsOpened} Packs geöffnet</p>

      <div className="hub-row">
        <div className="chips">
          {FILTERS.map((f) => (
            <button key={f.id} className={`chip ${filter === f.id ? 'active' : ''}`} onClick={() => setFilter(f.id)}>{chipLabel(f)}</button>
          ))}
        </div>
        {dupeValue > 0 && <button className="btn secondary small" onClick={sell}>Doppelte verkaufen (+{dupeValue.toLocaleString('de-DE')} Coins)</button>}
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
          <p>{owned.length ? 'Keine Karten für diesen Filter.' : 'Noch keine Karten. Öffne dein erstes Pack im Shop!'}</p>
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
  // Verkaufswert immer vom Grundwert – Evolutions bringen beim Verkauf nichts zurück.
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
      delete upgrades[id]; // Evolution geht mit der letzten Karte verloren
    }
    const evo = c.evo?.active?.card === id && n <= 0 ? { ...c.evo, active: undefined } : c.evo;
    setClubState({ ...c, cards, upgrades, evo, coins: c.coins + value });
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
              {!own && <li><span>Verkaufswert</span><span><Icon name="coin" size={16} className="coin-ic" />{value.toLocaleString('de-DE')}</span></li>}
            </ul>
            <EvoBox id={id} />
            {canSell && <button className="btn secondary" onClick={sellOne}>1× verkaufen (+{value.toLocaleString('de-DE')} Coins)</button>}
            {canSell && count === 1 && (card.boost ?? 0) > 0 && <p className="muted">Beim Verkauf der letzten Karte geht die Evolution verloren.</p>}
            {!canSell && !own && <p className="muted">Aufgestellt – zum Verkaufen erst aus dem Team nehmen.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Evolution: Stand der Karte und passende Pfade zum Starten. */
function EvoBox({ id }: { id: string }) {
  const club = useClub();
  const base = getCard(id);
  if (!base || !EVO_VARIANTS.includes(base.variant)) return null;
  const gained = evoGained(club, id);
  const act = club.evo?.active;
  const path = act && getPath(act.path);
  const fits = EVO_PATHS.filter((p) => (p.silverOnly ? base.variant === 'silver' : p.positions.includes(base.position)));
  return (
    <div className="upgrade-box evo-box">
      <div className="upgrade-head">
        <strong><Icon name="evo" size={18} /> Evolution</strong>
        <EvoDots gained={gained} />
      </div>
      {act?.card === id && path ? (
        <>
          <small>Läuft: <b>{path.name}</b> · Stufe {act.step + 1}/{path.steps.length} · +{path.steps[act.step].gain}</small>
          <small>{stepText(path.steps[act.step])} – {act.wins}/{path.steps[act.step].need}</small>
          <button className="btn ghost small" onClick={() => window.confirm('Evolution abbrechen? Die Startgebühr ist dann weg, erreichte Stufen bleiben.') && setClubState(cancelEvo(getClubState()))}>Abbrechen</button>
        </>
      ) : gained >= EVO_CAP ? (
        <small>Maximal entwickelt: +{EVO_CAP}.</small>
      ) : (
        <div className="evo-paths">
          {fits.map((p) => {
            const why = evoBlocker(club, p, id);
            return (
              <button key={p.id} className="evo-path" disabled={!!why} onClick={() => { const next = startEvo(getClubState(), p.id, id); if (next) setClubState(next); }}>
                <span><b>{p.name}</b><small>{why ?? `Starten · ${EVO_FEE.toLocaleString('de-DE')} Coins · bis zu +${Math.min(EVO_CAP - gained, p.steps.reduce((a, s) => a + s.gain, 0))}`}</small></span>
                {!why && <Icon name="arrow" size={18} />}
              </button>
            );
          })}
          {!fits.length && <small>Für diese Position gibt es gerade keinen Pfad.</small>}
        </div>
      )}
    </div>
  );
}

export function EvoDots({ gained }: { gained: number }) {
  return (
    <span className="evo-dots" aria-label={`+${gained} von ${EVO_CAP}`}>
      {Array.from({ length: EVO_CAP }, (_, i) => <i key={i} className={i < gained ? 'on' : ''} />)}
    </span>
  );
}
