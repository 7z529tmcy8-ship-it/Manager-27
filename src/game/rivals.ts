import { CARD_POOL, cardForGifts, storePacks, type ClubState, type CollectCard, type PackResult } from './club';
import { cardById, claimSeason, seasonName, unclaimedSeasons } from './squad';

// ---------- Rivals-Pack (Belohnung der Wochen-Saison) ----------
// Eine zufällige Karte aus deiner Elf kommt als „Rivals“-Karte zurück: gleicher Spieler, höhere Wertung
// (je nach Rang +2 bis +5), eigenes Design. Dazu zwei Extrakarten ab 80.

export const RIVALS_EXTRA = 2;

/** Verbesserte Teamkarte für die Woche `weekId`. */
export function rivalsCard(club: ClubState, weekId: string, boost: number, k: number, rand = Math.random): CollectCard | null {
  const squad = club.squad.map((id) => cardById(club, id)).filter((c): c is CollectCard => !!c && c.variant !== 'rivals');
  const pool = squad.length ? squad : CARD_POOL.filter((c) => (club.cards[c.id] ?? 0) > 0);
  if (!pool.length) return null;
  const base = pool[Math.floor(rand() * pool.length)];
  const { boost: _b, ...plain } = base;
  return { ...plain, id: `rivals-${weekId}-${base.id}-${k}`, ovr: Math.min(99, base.ovr - (base.boost ?? 0) + boost), variant: 'rivals', label: `Rivals · ${seasonName(weekId)}` };
}

/** Wochen-Belohnung abholen: Coins, Packs in die Ablage, Rivals-Packs gleich öffnen (Ergebnis für die Animation). */
export function claimDuelSeason(club: ClubState, id: string, now = new Date(), rand = Math.random): { club: ClubState; rivals: PackResult | null } {
  const s = unclaimedSeasons(club, now).find((x) => x.id === id);
  if (!s) return { club, rivals: null };
  let c = claimSeason(club, id, now);
  if (s.rank.packs?.length) c = storePacks(c, s.rank.packs, `Duell-Saison ${seasonName(id)}`, now.getTime());
  if (!s.rank.rivals) return { club: c, rivals: null };
  const result: PackResult = { cards: [], items: [] };
  const specials = [...c.specials];
  const cards = { ...c.cards };
  for (let k = 0; k < s.rank.rivals; k++) {
    const card = rivalsCard(c, id, s.rank.boost ?? 2, k, rand);
    if (card && !specials.some((x) => x.id === card.id)) { specials.push(card); result.cards.push({ card, duplicate: false }); }
    const extra = CARD_POOL.filter((x) => x.ovr >= 80 && !x.avatar && cardForGifts(x, now));
    for (let i = 0; i < RIVALS_EXTRA && extra.length; i++) {
      const e = extra.splice(Math.floor(rand() * extra.length), 1)[0];
      result.cards.push({ card: e, duplicate: (cards[e.id] ?? 0) > 0 });
      cards[e.id] = (cards[e.id] ?? 0) + 1;
    }
  }
  return { club: { ...c, specials, cards }, rivals: result };
}
