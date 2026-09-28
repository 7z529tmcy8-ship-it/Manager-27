import { describe, expect, it } from 'vitest';
import { slugify } from '../../data/leagues';
import { acceptOffer, createCareer, playSeason, stayAtClub } from '../career';
import type { Career } from '../types';

function runCareer(career: Career, seasons: number, choose: (c: Career) => Career = stayOrFirst): Career {
  let c = career;
  for (let i = 0; i < seasons && c.phase !== 'retired'; i++) {
    c = playSeason(c);
    if (c.phase === 'window') c = choose(c);
  }
  return c;
}

function stayOrFirst(c: Career): Career {
  if (c.player.contract.yearsLeft > 0) return stayAtClub(c);
  const ext = c.offers.find((o) => o.type === 'Verlängerung') ?? c.offers[0];
  return acceptOffer(c, ext);
}

const talent = () =>
  createCareer({ name: 'Test', nation: 'Deutschland', position: 'ST', age: 17, ovr: 66, potential: 86, clubId: slugify('SC Freiburg') });

describe('Saison-Simulation', () => {
  it('liefert plausible Saisonwerte', () => {
    const c = playSeason(talent());
    const s = c.history[0];
    expect(s.table).toHaveLength(18);
    expect(s.table.reduce((a, r) => a + r.played, 0)).toBe(18 * 34);
    expect(s.apps).toBeGreaterThanOrEqual(0);
    expect(s.minutes).toBeLessThanOrEqual(s.possibleMinutes);
    expect(c.player.age).toBe(18);
    expect(c.phase).toBe('window');
  });

  it('Auf- und Abstieg hält die Ligagrößen konstant', () => {
    const c = playSeason(talent());
    const counts: Record<string, number> = {};
    Object.values(c.clubLeague).forEach((l) => (counts[l] = (counts[l] ?? 0) + 1));
    expect(counts.bl1).toBe(18);
    expect(counts.pl).toBe(20);
    expect(counts.ch).toBe(24);
  });

  it('Toptalente mit Spielzeit entwickeln sich deutlich, alte Spieler bauen ab', () => {
    const young: number[] = [];
    const old: number[] = [];
    for (let i = 0; i < 20; i++) {
      young.push(runCareer(talent(), 5).player.ovr);
      const vet = createCareer({ name: 'Alt', nation: 'England', position: 'ST', age: 31, ovr: 86, potential: 86, clubId: slugify('Aston Villa') });
      old.push(runCareer(vet, 4).player.ovr);
    }
    const avg = (a: number[]) => a.reduce((x, y) => x + y, 0) / a.length;
    expect(avg(young)).toBeGreaterThan(76);
    expect(avg(young)).toBeLessThanOrEqual(90);
    expect(avg(old)).toBeLessThan(83);
  });

  it('Leihe wechselt den Verein für eine Saison und kehrt dann zurück', () => {
    let c = createCareer({ name: 'Leih', nation: 'Deutschland', position: 'FL', age: 18, ovr: 68, potential: 86, clubId: slugify('FC Bayern München') });
    for (let i = 0; i < 5; i++) {
      c = playSeason(c);
      const loan = c.offers.find((o) => o.type === 'Leihe');
      if (loan) {
        c = acceptOffer(c, loan);
        expect(c.player.loan?.clubId).toBe(loan.clubId);
        c = playSeason(c);
        expect(c.player.loan).toBeNull();
        expect(c.history.at(-1)!.onLoan).toBe(true);
        return;
      }
      c = stayOrFirst(c);
    }
  });
});
