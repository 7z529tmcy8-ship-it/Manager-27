import { expect, it } from 'vitest';
import { slugify } from '../../data/leagues';
import { createCareer } from '../career';
import { applyChoice, seasonChoices, simulateToBreak } from '../simple';
import { ATTR_WEIGHTS, attrMods, developAttributes } from '../attributes';
import { attributes } from '../player';
import { knockoutRounds, nationalForm } from '../season';

it('Attribute verschieben sich einzeln, die Gesamtwertung bleibt dabei gleich', () => {
  const c = createCareer({ name: 'Jung', nation: 'Deutschland', position: 'ST', age: 18, ovr: 70, potential: 88, clubId: slugify('Borussia Dortmund') });
  const p = structuredClone(c.player);
  const w = ATTR_WEIGHTS.ST;
  const mean = (v: number[]) => v.reduce((a, x, i) => a + x * w[i], 0);
  const start = mean(p.profile);
  let seed = 7;
  const rand = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  for (let i = 0; i < 8; i++) developAttributes(p, attributes(p), rand);
  // Gewichteter Mittelwert der Abweichungen bleibt (fast) gleich → keine versteckte Wertungsänderung
  expect(Math.abs(mean(p.profile) - start)).toBeLessThan(2);
  // Junger Stürmer: Physis wächst gegenüber dem Start
  expect(p.profile[5]).toBeGreaterThan(c.player.profile[5]);
  expect(p.attrDelta).toHaveLength(6);
  for (const pos of Object.keys(ATTR_WEIGHTS) as (keyof typeof ATTR_WEIGHTS)[]) expect(ATTR_WEIGHTS[pos].reduce((a, b) => a + b, 0)).toBeCloseTo(1, 5);
});

it('Attribute wirken im Spiel, aber nur begrenzt', () => {
  const base = { position: 'ST' as const, profile: [3, 4, -6, 1, -40, 1] };
  const strong = attrMods({ ...base, profile: [3, 14, -6, 1, -40, 11] });
  const weak = attrMods({ ...base, profile: [3, -10, -6, 1, -40, -10] });
  expect(strong.goal).toBeGreaterThan(1);
  expect(weak.goal).toBeLessThan(1);
  for (const m of [strong, weak]) {
    expect(m.goal).toBeGreaterThanOrEqual(0.85);
    expect(m.goal).toBeLessThanOrEqual(1.15);
    expect(m.injury).toBeGreaterThanOrEqual(0.8);
    expect(m.injury).toBeLessThanOrEqual(1.2);
  }
  expect(strong.injury).toBeLessThan(weak.injury);
});

it('Nationalmannschaft: Form zählt für die Nominierung, K.-o.-Runden je Turnier', () => {
  expect(knockoutRounds('Weltmeisterschaft 2026')).toEqual(['Achtelfinale', 'Viertelfinale', 'Halbfinale', 'Finale']);
  expect(knockoutRounds('Copa América 2028')).toEqual(['Viertelfinale', 'Halbfinale', 'Finale']);
  const good = nationalForm({ apps: 30, starts: 30, minutes: 2600, possibleMinutes: 3000, goals: 15, assists: 8, avgRating: 7.6 });
  const bench = nationalForm({ apps: 8, starts: 1, minutes: 300, possibleMinutes: 3000, goals: 0, assists: 0, avgRating: 6.4 });
  expect(good).toBeGreaterThan(1.5);
  expect(bench).toBeLessThan(-1.5);
});

it('WM 2026 live: K.-o.-Spiele nacheinander, wer verliert ist raus, Titel nur mit gewonnenem Finale', () => {
  let titles = 0;
  let koSeen = 0;
  for (let run = 0; run < 12; run++) {
    let c = createCareer({ name: 'Star', nation: 'Spanien', position: 'ST', age: 26, ovr: 90, potential: 91, clubId: slugify('Real Madrid') });
    c = simulateToBreak(simulateToBreak(c));
    const r = c.history[0];
    const notes = r.notes.join(' | ');
    const won = r.trophies.includes('Weltmeisterschaft 2026');
    if (/K\.-o\.-Runde/.test(notes)) koSeen++;
    if (won) {
      titles++;
      // Weltmeister heißt: alle Runden davor gewonnen
      for (const round of ['Achtelfinale', 'Viertelfinale', 'Halbfinale']) expect(notes).toContain(`${round} gegen`);
    }
    // Nie mehr als ein „Aus im …“
    expect((notes.match(/Aus im /g) ?? []).length).toBeLessThanOrEqual(1);
    expect(seasonChoices(c).length).toBeGreaterThan(0);
    applyChoice(c, seasonChoices(c)[0]);
  }
  expect(koSeen).toBeGreaterThan(4);
  expect(titles).toBeLessThan(12);
});

it('Team der Saison: starke Saison bringt die Auszeichnung, sie zählt als Belohnungs-Karte', async () => {
  const { careerRewardOptions } = await import('../club');
  const c = createCareer({ name: 'Erling Haaland', nation: 'Norwegen', position: 'ST', age: 25, ovr: 91, potential: 92, clubId: slugify('Manchester City') });
  const done = structuredClone(c);
  done.history = [{ ...(simulateToBreak(simulateToBreak(c)).history[0]), awards: ['Team der Saison Premier League'] }];
  done.phase = 'retired';
  expect(careerRewardOptions(done).map((o) => o.variant)).toContain('tots');
});
