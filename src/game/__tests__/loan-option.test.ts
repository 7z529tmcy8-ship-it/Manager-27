import { expect, it } from 'vitest';
import { slugify } from '../../data/leagues';
import { createCareer, loanOptionDrawn } from '../career';
import { applyChoice, seasonChoices, simulateToBreak } from '../simple';

it('Kaufoption: nur bei viel Spielzeit und guten Noten', () => {
  expect(loanOptionDrawn({ minutes: 500, possibleMinutes: 3000, avgRating: 7.5 }, 0)).toBe(false);
  expect(loanOptionDrawn({ minutes: 2700, possibleMinutes: 3000, avgRating: 6.4 }, 0)).toBe(false);
  expect(loanOptionDrawn({ minutes: 2700, possibleMinutes: 3000, avgRating: 7.4 }, 0.9)).toBe(true);
  expect(loanOptionDrawn({ minutes: 1500, possibleMinutes: 3000, avgRating: 6.7 }, 0.5)).toBe(false);
});

it('Leihe mit Kaufoption: entweder fester Wechsel zum Leihverein oder Rückkehr', () => {
  let found = false;
  for (let run = 0; run < 25 && !found; run++) {
    let c = createCareer({ name: 'Leihe', nation: 'Deutschland', position: 'ST', age: 19, ovr: 68, potential: 85, clubId: slugify('FC Bayern München') });
    c = simulateToBreak(simulateToBreak(c));
    const loan = c.offers.find((o) => o.type === 'Leihe' && o.buyOption);
    const choice = loan && seasonChoices(c).find((x) => x.offer?.id === loan.id);
    if (!loan || !choice) continue;
    found = true;
    const parent = c.player.contract.clubId;
    c = applyChoice(c, choice);
    expect(c.player.loan?.buyOption).toBe(loan.buyOption);
    c = simulateToBreak(simulateToBreak(c));
    expect(c.player.loan).toBeNull();
    const notes = c.history[c.history.length - 1].notes.join(' ');
    if (notes.includes('Kaufoption gezogen')) {
      expect(c.player.contract.clubId).toBe(loan.clubId);
      expect(c.transfers!.some((t) => t.fee === loan.buyOption && t.toClubId === loan.clubId)).toBe(true);
    } else {
      expect(c.player.contract.clubId).toBe(parent);
      expect(notes).toContain('Kaufoption wurde nicht gezogen');
    }
  }
  expect(found).toBe(true);
});
