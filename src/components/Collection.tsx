import { useMemo, useRef, useState } from 'react';
import { ownedCards } from '../game/squad';
import { CARDS_FROM_CAREER_ONLY } from '../game/mode';
import { createPortal } from 'react-dom';
import { cardArtIds, removeCardArt, setCardArt, shrinkImage, useCardArt } from '../cardArt';
import { getClubState, setClubState, useClub } from '../clubStore';
import { collectionProgress, getCard, sellDuplicates, sellValue, type CollectCard } from '../game/club';
import { ART_SLOTS, ART_VIP, TIER_NAME, TIER_ORDER, artMissing, artSlots, canSetArt, claimMilestones, collectable, milestoneState, tierOf } from '../game/collection';
import { VIP } from '../game/casino';
import type { PackTier } from '../game/club';
import { play } from '../sound';
import Icon from './Icon';
import UtCard from './UtCard';

const fmt = (n: number) => Math.round(n).toLocaleString('de-DE');
const sfx = (id: Parameters<typeof play>[0]) => { try { play(id); } catch { /* kein Ton */ } };
type Show = 'mine' | 'missing' | 'all';
const PAGE = 48;

/** Sammlung: alle Karten des Spiels – Fortschritt, Meilensteine, Doppelte verkaufen, eigene Bilder (Casino-VIP). */
export default function Collection({ onShop, onCasino }: { onShop: () => void; onCasino: () => void }) {
  const club = useClub();
  const prog = collectionProgress(club);
  const ms = milestoneState(club);
  const [show, setShow] = useState<Show>('mine');
  const [tier, setTier] = useState<PackTier | null>(null);
  const [q, setQ] = useState('');
  const [limit, setLimit] = useState(PAGE);
  const [sel, setSel] = useState<CollectCard | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const all = useMemo(() => collectable(), []);
  const dupes = Object.entries(club.cards).reduce((a, [id, n]) => { const c = getCard(id); return a + (c && n > 1 ? (n - 1) * sellValue(c) : 0); }, 0);

  const list = useMemo(() => {
    const term = q.trim().toLowerCase();
    // „Meine“: alle Karten, die du besitzt – auch Karriere-Karten (dein Spieler, Ikonen, Auszeichnungen)
    const mine = ownedCards(club);
    const ownIds = new Set(mine.map((c) => c.id));
    const seen = new Set<string>();
    const pool = (show === 'mine' ? mine : show === 'all' ? [...club.specials, ...all] : all).filter((c) => (seen.has(c.id) ? false : (seen.add(c.id), true)));
    return pool
      .filter((c) => (show === 'missing' ? !ownIds.has(c.id) : true))
      .filter((c) => !tier || tierOf(c) === tier)
      .filter((c) => !term || c.name.toLowerCase().includes(term) || c.club.toLowerCase().includes(term))
      .sort((a, b) => b.ovr - a.ovr);
  }, [all, club, show, tier, q]);

  const ownIdsAll = useMemo(() => new Set(ownedCards(club).map((c) => c.id)), [club]);
  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(null), 2200); };
  const claim = () => {
    const r = claimMilestones(getClubState());
    if (!r.coins) return;
    setClubState(r.club);
    sfx('fanfare');
    flash(`Meilenstein! +${fmt(r.coins)} Coins und +${fmt(r.chips)} Chips`);
  };
  const sellAll = () => {
    if (!window.confirm(`Alle doppelten Karten für ${fmt(dupes)} Coins verkaufen? Von jeder Karte bleibt eine.`)) return;
    const r = sellDuplicates(getClubState());
    setClubState(r.club);
    sfx('coin');
    flash(`${r.count} Karten verkauft: +${fmt(r.coins)} Coins`);
  };

  return (
    <div className="col">
      <section className="col-prog">
        <div className="col-prog-top"><b>{prog.have} / {prog.total}</b><small>Karten gesammelt</small><span>{prog.label}</span></div>
        <span className="col-bar"><i style={{ width: `${Math.max(1, prog.percent)}%` }} /></span>
        {ms.ready.length > 0 ? (
          <button className="btn primary col-claim" onClick={claim}><Icon name="gift" size={18} /> Meilenstein abholen: +{fmt(ms.ready.reduce((a, m) => a + m.coins, 0))} Coins · +{fmt(ms.ready.reduce((a, m) => a + m.chips, 0))} Chips</button>
        ) : ms.next && <small className="col-next">Nächster Meilenstein bei {ms.next.at} Karten: {fmt(ms.next.coins)} Coins + {fmt(ms.next.chips)} Casino-Chips</small>}
      </section>

      <div className="col-actions">
        <button className="btn secondary small" disabled={!dupes} onClick={sellAll}><Icon name="coin" size={15} /> Doppelte verkaufen{dupes ? ` · ${fmt(dupes)}` : ''}</button>
        {!CARDS_FROM_CAREER_ONLY && <button className="btn secondary small" onClick={onShop}><Icon name="pack" size={15} /> Packs kaufen</button>}
      </div>

      <ArtInfo onCasino={onCasino} />

      <div className="segmented col-show" role="radiogroup" aria-label="Anzeigen">
        {([['mine', 'Meine'], ['missing', 'Fehlend'], ['all', 'Alle']] as [Show, string][]).map(([id, l]) => (
          <button key={id} role="radio" aria-checked={show === id} className={show === id ? 'active' : ''} onClick={() => { setShow(id); setLimit(PAGE); }}>{l}</button>
        ))}
      </div>
      <div className="chips col-tiers">
        {TIER_ORDER.map((t) => <button key={t} className={`chip ${tier === t ? 'active' : ''}`} onClick={() => { setTier(tier === t ? null : t); setLimit(PAGE); }}>{TIER_NAME[t]}</button>)}
      </div>
      <input className="col-search" type="search" placeholder="Spieler oder Verein suchen" value={q} onChange={(e) => { setQ(e.target.value); setLimit(PAGE); }} />

      {list.length === 0 ? <p className="hub-empty">{show === 'mine' ? (CARDS_FROM_CAREER_ONLY ? 'Noch keine Karten – beende eine Karriere: Dann kommt dein Spieler als Spezialkarte hierher.' : 'Noch keine Karten – öffne Packs im Shop!') : 'Keine Karten gefunden.'}</p> : (
        <div className="col-grid">
          {list.slice(0, limit).map((c) => {
            const n = club.cards[c.id] ?? (ownIdsAll.has(c.id) ? 1 : 0);
            return (
              <div key={c.id} className={`col-item ${n ? '' : 'missing'}`}>
                <UtCard card={c} size="sm" count={n} onClick={() => setSel(c)} />
              </div>
            );
          })}
        </div>
      )}
      {list.length > limit && <button className="btn secondary col-more" onClick={() => setLimit(limit + PAGE)}>Mehr anzeigen ({list.length - limit})</button>}

      {sel && <CardSheet card={sel} onClose={() => setSel(null)} onFlash={flash} />}
      {toast && createPortal(<div className="coin-toast" role="status">{toast}</div>, document.body)}
    </div>
  );
}

/** Hinweis auf eigene Kartenbilder – Freischaltung im Casino. */
function ArtInfo({ onCasino }: { onCasino: () => void }) {
  const club = useClub();
  const slots = artSlots(club);
  useCardArt('');
  const used = cardArtIds().length;
  if (slots) return <p className="col-art on"><Icon name="camera" size={18} /> Eigene Kartenbilder: {used}/{slots} genutzt – tippe eine deiner Karten an.</p>;
  return (
    <button className="col-art" onClick={onCasino}>
      <Icon name="lock" size={18} />
      <span><b>Eigene Bilder für deine Karten</b><small>Ab VIP {VIP[ART_VIP].name} im Casino ({ART_SLOTS[ART_VIP]} Bilder, Diamant {ART_SLOTS[4]}) – noch {fmt(artMissing(club))} Chips Einsatz</small></span>
      <Icon name="arrow" size={18} />
    </button>
  );
}

function CardSheet({ card, onClose, onFlash }: { card: CollectCard; onClose: () => void; onFlash: (m: string) => void }) {
  const club = useClub();
  const n = club.cards[card.id] ?? 0;
  const art = useCardArt(card.id);
  const file = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const can = canSetArt(club, card.id, cardArtIds());
  const sellOne = () => {
    const c = getClubState();
    if ((c.cards[card.id] ?? 0) < 2) return;
    setClubState({ ...c, cards: { ...c.cards, [card.id]: c.cards[card.id] - 1 }, coins: c.coins + sellValue(card) });
    sfx('coin');
    onFlash(`+${fmt(sellValue(card))} Coins`);
  };
  const upload = async (f: File | undefined) => {
    if (!f) return;
    setBusy(true);
    try {
      await setCardArt(card.id, await shrinkImage(f));
      sfx('revealRare');
      onFlash('Neues Kartenbild gespeichert!');
    } catch {
      onFlash('Das Bild konnte nicht gespeichert werden.');
    }
    setBusy(false);
  };
  return createPortal(
    <div className="col-sheet" role="dialog" aria-modal="true" aria-label={card.name} onClick={onClose}>
      <div className="col-sheet-inner" onClick={(e) => e.stopPropagation()}>
        <button className="col-x" onClick={onClose} aria-label="Schließen"><Icon name="close" size={18} /></button>
        <div className={`col-big ${n ? '' : 'missing'}`}><UtCard card={card} size="lg" shine={n > 0} /></div>
        <p className="col-meta">{TIER_NAME[tierOf(card)]} · {n ? `${n}× in deiner Sammlung` : 'Noch nicht gesammelt – in Packs zu finden'}</p>
        {n > 1 && <button className="btn secondary" onClick={sellOne}><Icon name="coin" size={16} /> 1 Doppelte verkaufen · {fmt(sellValue(card))}</button>}
        {n > 0 && (
          <div className="col-artbox">
            <b><Icon name="camera" size={18} /> Eigenes Bild</b>
            {can.ok || art ? (
              <>
                <input ref={file} type="file" accept="image/*" hidden onChange={(e) => void upload(e.target.files?.[0])} />
                <div className="col-art-btns">
                  {can.ok && <button className="btn primary" disabled={busy} onClick={() => file.current?.click()}>{busy ? 'Speichert …' : art ? 'Bild ändern' : 'Bild hochladen'}</button>}
                  {art && <button className="btn ghost" onClick={() => void removeCardArt(card.id).then(() => onFlash('Bild entfernt'))}>Entfernen</button>}
                </div>
                <small>Das Bild wird quadratisch zugeschnitten und nur auf diesem Gerät gespeichert.</small>
              </>
            ) : <small>{can.reason}</small>}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
