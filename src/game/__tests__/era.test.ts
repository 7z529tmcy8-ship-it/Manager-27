import { expect, it } from 'vitest';
import { ERA_PLAYERS, eraCardId, eraToday } from '../../data/eraCards';
import { CARD_POOL, freshClub, getCard, withUpgrade } from '../club';
import { ERA_STEPS, STEP_COST, claimEra, eraReady, eraReward } from '../era';
import { ERA_END, ERA_START, SHARDS, addShards, eraLive } from '../eraTime';
import { vaultCards } from '../codes';

const during = new Date(2026, 10, 4, 12);
const after = new Date(2026, 10, 12, 12); // nach Zeitreise und Jungle Crash

it('Zeitreise: genau 10 Ära-Karten, je eine auf jeder 4. Stufe', () => {
  expect(ERA_PLAYERS).toHaveLength(10);
  const cards = Array.from({ length: ERA_STEPS }, (_, i) => eraReward(i + 1)).filter((r) => r.kind === 'card');
  expect(cards).toHaveLength(10);
  expect(new Set(cards.map((c) => (c.kind === 'card' ? c.id : ''))).size).toBe(10);
  ERA_PLAYERS.forEach((p) => expect(getCard(eraCardId(p.name))?.variant).toBe('aera'));
  expect(eraLive(ERA_START)).toBe(true);
  expect(eraLive(ERA_END)).toBe(true);
  expect(eraLive(after)).toBe(false);
});

it('Splitter nur während des Events, Abholen gibt alle erreichten Stufen', () => {
  let c = freshClub();
  expect(addShards(c, 10, after)).toBe(c);
  c = addShards(c, STEP_COST * 8 + 1, during);
  expect(eraReady(c)).toBe(8);
  const res = claimEra(c, during.getTime());
  expect(res.rewards).toHaveLength(8);
  expect(res.cards.map((x) => x.id)).toEqual([eraCardId(ERA_PLAYERS[0].name), eraCardId(ERA_PLAYERS[1].name)]);
  expect(res.club.cards[eraCardId(ERA_PLAYERS[0].name)]).toBe(1);
  expect(res.club.coins).toBeGreaterThan(c.coins);
  expect(eraReady(res.club)).toBe(0);
  expect(claimEra(res.club).rewards).toHaveLength(0);
  // Alles erreichen
  const full = claimEra(addShards(res.club, STEP_COST * ERA_STEPS, during), during.getTime());
  expect(full.club.aera?.claimed).toBe(ERA_STEPS);
  ERA_PLAYERS.forEach((p) => expect(full.club.cards[eraCardId(p.name)]).toBe(1));
  expect(SHARDS.duelWin).toBeGreaterThan(0);
});

it('Ära-Karte wechselt täglich die Zeit (Verein, Wertung), Tresor gibt keine Ära-Karten während des Events', () => {
  const base = getCard(eraCardId('Lionel Messi'))!;
  const days = [0, 1, 2].map((d) => eraToday(new Date(2026, 10, 1 + d)));
  expect(new Set(days).size).toBe(3);
  const shown = withUpgrade({}, base);
  expect(shown.era).toBe(eraToday());
  const missing = freshClub();
  for (let i = 0; i < 20; i++) vaultCards(missing).forEach((c) => expect(c.variant === 'aera' && eraLive()).toBe(false));
  expect(CARD_POOL.filter((c) => c.variant === 'aera')).toHaveLength(10);
});

it('Duell-Taktik: Auto-Konter wählt die Taktik, die den Scouting-Stil schlägt', async () => {
  const { counterTo, resolveTactic, tacticEdge } = await import('../divisions');
  for (const s of ['pressing', 'konter', 'ballbesitz'] as const) expect(tacticEdge(counterTo(s), s)).toBeGreaterThan(0);
  expect(resolveTactic('auto', 'pressing')).toBe('konter');
  expect(resolveTactic('auto')).toBe('ausgewogen');
  expect(resolveTactic('ballbesitz', 'pressing')).toBe('ballbesitz');
});
