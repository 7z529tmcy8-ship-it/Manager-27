import { expect, it } from 'vitest';
import { JUNGLE_PLAYERS, jungleCardId } from '../../data/jungleCards';
import { CARD_POOL, freshClub, getCard } from '../club';
import { redeemCode } from '../codes';
import { JUNGLE_END, JUNGLE_START, addShards, jungleLive } from '../eraTime';
import { JUNGLE_COST, JUNGLE_STEPS, claimJungle, jungleCrate, jungleReady, jungleReward } from '../jungle';

const during = new Date(2026, 10, 6, 12);

it('Jungle Crash: 6 Dschungel-Karten (+4), je eine auf jeder 5. Stufe', () => {
  for (const [name] of JUNGLE_PLAYERS) {
    const j = getCard(jungleCardId(name))!;
    const base = CARD_POOL.find((c) => c.name === name && ['silver', 'gold', 'gold-rare'].includes(c.variant))!;
    expect(j.variant).toBe('jungle');
    expect(j.ovr).toBe(Math.min(99, base.ovr + 4));
  }
  const cards = Array.from({ length: JUNGLE_STEPS }, (_, i) => jungleReward(i + 1)).filter((r) => r.kind === 'card');
  expect(cards).toHaveLength(6);
  expect(jungleLive(JUNGLE_START)).toBe(true);
  expect(jungleLive(JUNGLE_END)).toBe(true);
  expect(jungleLive(new Date(2026, 10, 12, 8))).toBe(false);
});

it('Bananen nur im Event, Pfad abholen gibt alle Stufen und Karten', () => {
  let c = freshClub();
  expect(addShards(c, 9, new Date(2026, 10, 13))).toBe(c);
  c = addShards(c, JUNGLE_COST * JUNGLE_STEPS, during);
  expect(jungleReady(c)).toBe(JUNGLE_STEPS);
  const r = claimJungle(c, during.getTime());
  expect(r.cards).toHaveLength(6);
  JUNGLE_PLAYERS.forEach(([n]) => expect(r.club.cards[jungleCardId(n)]).toBe(1));
  expect(jungleReady(r.club)).toBe(0);
});

it('Code JUNGLECRASH: Absturz-Kiste mit 1 neuen Dschungel-Karte und 2 Topkarten', () => {
  const r = redeemCode(freshClub(), 'junglecrash');
  expect(r.ok).toBe(true);
  if (!r.ok) return;
  expect(r.theme).toBe('jungle');
  expect(r.result.cards).toHaveLength(3);
  expect(r.result.cards.filter((x) => x.card.variant === 'jungle')).toHaveLength(1);
  // Bevorzugt neue Dschungel-Karten
  const owned = { ...freshClub(), cards: Object.fromEntries(JUNGLE_PLAYERS.slice(0, 5).map(([n]) => [jungleCardId(n), 1])) };
  for (let i = 0; i < 10; i++) expect(jungleCrate(owned, Math.random, during).find((x) => x.variant === 'jungle')!.id).toBe(jungleCardId(JUNGLE_PLAYERS[5][0]));
});
