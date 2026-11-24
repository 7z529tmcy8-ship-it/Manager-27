import { expect, it } from 'vitest';
import { CARDS_FROM_CAREER_ONLY } from '../mode';
import { CARD_POOL, collectionProgress, freshClub, type ClubState } from '../club';
import { ART_VIP, MILESTONES, artSlots, canSetArt, claimFreePack, claimMilestones, collectable, freePackReady, milestoneState } from '../collection';
import { VIP, casinoOf, cashOutChips } from '../casino';

const day = (s: string) => new Date(`${s}T12:00:00`);

it('Sammlung: genug Karten für alle Meilensteine, Abholen gibt Coins und Chips genau einmal', () => {
  expect(collectable().length).toBeGreaterThan(MILESTONES[MILESTONES.length - 1].at);
  const cards = Object.fromEntries(collectable().slice(0, 60).map((c) => [c.id, 1]));
  let c: ClubState = { ...freshClub(), cards };
  expect(collectionProgress(c).have).toBeGreaterThanOrEqual(60);
  const st = milestoneState(c);
  expect(st.ready.map((m) => m.at)).toEqual([25, 50]);
  const before = c.coins;
  const r = claimMilestones(c);
  expect(r.coins).toBe(30_000);
  expect(r.club.coins).toBe(before + 30_000);
  expect(casinoOf(r.club).chips).toBe(casinoOf(c).chips + 3_000);
  c = r.club;
  expect(claimMilestones(c).coins).toBe(0);
  expect(milestoneState(c).next?.at).toBe(100);
});

it('Gratis-Pack: einmal pro Tag, kostet nichts, füllt die Sammlung', () => {
  const c = freshClub();
  const r = claimFreePack(c, day('2026-11-20'))!;
  expect(r.club.coins).toBe(c.coins);
  expect(r.result.cards.length).toBe(3);
  expect(freePackReady(r.club, day('2026-11-20'))).toBe(false);
  expect(claimFreePack(r.club, day('2026-11-20'))).toBeNull();
  expect(freePackReady(r.club, day('2026-11-21'))).toBe(true);
});

it('Eigene Kartenbilder: erst ab VIP Platin, nur für eigene Karten, begrenzte Plätze', () => {
  const id = CARD_POOL[0].id;
  let c: ClubState = { ...freshClub(), cards: { [id]: 1 } };
  expect(artSlots(c)).toBe(0);
  expect(canSetArt(c, id, []).ok).toBe(false);
  c = { ...c, casino: { ...casinoOf(c), vipPts: VIP[ART_VIP].min } };
  expect(artSlots(c)).toBe(3);
  expect(canSetArt(c, id, []).ok).toBe(true);
  expect(canSetArt(c, CARD_POOL[1].id, []).ok).toBe(false); // nicht im Besitz
  expect(canSetArt(c, id, ['a', 'b', 'c']).ok).toBe(false); // Plätze voll
  expect(canSetArt(c, id, [id, 'b', 'c']).ok).toBe(true); // eigenes Bild ändern geht
});

it('Casino → Shop: Chips 2:1 in Coins tauschen, erst ab 1.000 Chips', () => {
  const c: ClubState = { ...freshClub(), casino: { ...casinoOf(freshClub()), chips: 5_000 } };
  expect(cashOutChips(c, 500)).toBeNull();
  const r = cashOutChips(c, 4_001)!;
  expect(casinoOf(r).chips).toBe(1_000);
  expect(r.coins).toBe(c.coins + 2_000);
  expect(cashOutChips(c, 6_000)).toBeNull();
});

it('Willkommens-Pack: komplette Start-Elf, sofort aufgestellt, nur einmal', async () => {
  const { claimWelcome, welcomeReady } = await import('../collection');
  const c = freshClub();
  if (CARDS_FROM_CAREER_ONLY) { expect(welcomeReady(c)).toBe(false); expect(claimWelcome(c)).toBeNull(); return; }
  expect(welcomeReady(c)).toBe(true);
  const r = claimWelcome(c)!;
  expect(r.result.cards).toHaveLength(11);
  expect(r.club.squad.filter(Boolean)).toHaveLength(11);
  expect(new Set(r.result.cards.map((x) => x.card.position))).toEqual(new Set(['TW', 'AV', 'IV', 'ZM', 'ZDM', 'FL', 'ST']));
  expect(claimWelcome(r.club)).toBeNull();
});
