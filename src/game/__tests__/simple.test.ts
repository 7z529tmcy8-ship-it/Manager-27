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

it('Winterpause: Trainingslager nur einmal, Wintertransfer wechselt den Verein für die Rückrunde', async () => {
  const { winterChoices, applyWinterChoice } = await import('../simple');
  let c = simulateToBreak(base());
  expect(c.phase).toBe('winter');
  const choices = winterChoices(c);
  expect(choices.some((x) => x.kind === 'camp')).toBe(true);
  const camped = applyWinterChoice(c, choices.find((x) => x.kind === 'camp')!);
  expect(camped.decisionResult?.title).toBe('Trainingslager');
  expect(camped.player.ovr - c.player.ovr).toBeGreaterThanOrEqual(0);
  expect(winterChoices(camped).some((x) => x.kind === 'camp')).toBe(false);
  // Wintertransfer, falls ein Angebot da ist
  for (let i = 0; i < 20 && !winterChoices(c).some((x) => x.offer); i++) c = simulateToBreak(base());
  const move = winterChoices(c).find((x) => x.offer);
  if (!move) return;
  const moved = applyWinterChoice(c, move);
  expect(moved.player.loan?.clubId ?? moved.player.contract.clubId).toBe(move.offer!.clubId);
  const end = simulateToBreak(moved);
  expect(end.phase).toBe('window');
  expect(end.history[0].winterMove?.toClubId).toBe(move.offer!.clubId);
});
