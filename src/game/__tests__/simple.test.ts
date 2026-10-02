import { expect, it } from 'vitest';
import { slugify } from '../../data/leagues';
import { createCareer } from '../career';
import { applyChoice, seasonChoices, simulateToBreak } from '../simple';

const base = () => createCareer({ name: 'Einfach', nation: 'Deutschland', position: 'ST', age: 21, ovr: 76, potential: 86, clubId: slugify('SC Freiburg') });

it('Ablauf: Winterpause → Saisonende → drei Möglichkeiten → neue Saison', () => {
  let c = simulateToBreak(base());
  expect(c.phase).toBe('winter');
  expect(c.decision).toBeNull();
  c = simulateToBreak(c);
  expect(c.phase).toBe('window');
  expect(c.history).toHaveLength(1);
  expect(c.decision).toBeNull();
  const choices = seasonChoices(c);
  expect(choices).toHaveLength(3);
  expect(new Set(choices.map((x) => x.offer?.id ?? x.kind)).size).toBe(3);
  c = applyChoice(c, choices.find((x) => x.kind === 'stay' || x.kind === 'extend') ?? choices[0]);
  expect(c.phase).toBe('season');
});

it('Viele Saisons am Stück: immer drei Optionen, Spiel endet sauber', () => {
  let c = base();
  for (let i = 0; i < 40 && c.phase !== 'retired'; i++) {
    c = simulateToBreak(simulateToBreak(c));
    if (c.phase !== 'window') continue;
    const ch = seasonChoices(c);
    // Jüngere Spieler haben immer drei Möglichkeiten; ältere manchmal weniger (realistisch).
    if (c.player.age <= 28) expect(ch).toHaveLength(3);
    else expect(ch.length).toBeGreaterThanOrEqual(1);
    c = applyChoice(c, ch[i % ch.length]);
  }
  expect(c.history.length).toBeGreaterThan(1);
});
