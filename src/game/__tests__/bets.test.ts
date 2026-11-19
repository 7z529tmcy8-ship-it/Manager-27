import { expect, it } from 'vitest';
import { slugify } from '../../data/leagues';
import {
  MARKETS, cashOutValue, careerOffers, comboBoost, finishRound, fixturesFor, hits, legState, marketProb, oddsFor, placeCareerBet, resolveCareerBets,
  simulateRound, slipOdds, betsOf, type Leg,
} from '../bets';
import { casinoOf } from '../casino';
import { createCareer } from '../career';
import { freshClub, type ClubState } from '../club';

it('Spieltag: 10 feste Spiele, faire Quoten mit Marge, 1X2 ergänzt sich', () => {
  const a = fixturesFor(5);
  expect(a).toHaveLength(10);
  expect(fixturesFor(5).map((f) => f.home)).toEqual(a.map((f) => f.home));
  expect(fixturesFor(6).map((f) => f.home)).not.toEqual(a.map((f) => f.home));
  for (const f of a) {
    expect(f.home).not.toBe(f.away);
    const p = marketProb('1', f.lh, f.la) + marketProb('X', f.lh, f.la) + marketProb('2', f.lh, f.la);
    expect(p).toBeCloseTo(1, 2);
    const back = 1 / f.odds['1'] + 1 / f.odds.X + 1 / f.odds['2'];
    expect(back).toBeGreaterThan(1.02); // Buchmacher-Marge
    for (const m of MARKETS) expect(f.odds[m]).toBeGreaterThanOrEqual(1.02);
  }
  expect(oddsFor(0.5)).toBeCloseTo(1.86, 2);
});

it('Kombi-Boost, Live-Stand und Cash-out', () => {
  expect(comboBoost(2)).toBe(0);
  expect(comboBoost(3)).toBeCloseTo(0.08);
  expect(comboBoost(20)).toBe(0.5);
  const legs: Leg[] = [{ fixture: 'a', market: '1', odds: 2 }, { fixture: 'b', market: 'o25', odds: 2 }, { fixture: 'c', market: 'X', odds: 3 }];
  expect(slipOdds(legs)).toBeCloseTo(12 * 1.08, 2);
  expect(hits('bttsY', 1, 1)).toBe(true);
  const live = { fixture: 'b', goals: [{ minute: 10, home: true }, { minute: 20, home: false }, { minute: 30, home: true }] };
  expect(legState({ fixture: 'b', market: 'o25', odds: 2 }, live, 35)).toBe('won');
  expect(legState({ fixture: 'b', market: 'u25', odds: 2 }, live, 35)).toBe('lost');
  const fx = fixturesFor(1).slice(0, 2);
  const sim = simulateRound(fx, () => 0.99);
  const ls: Leg[] = [{ fixture: fx[0].id, market: '1', odds: fx[0].odds['1'] }];
  const v0 = cashOutValue(ls, 100, fx, sim, 0);
  expect(v0).toBeGreaterThan(0);
  expect(v0).toBeLessThan(100 * fx[0].odds['1']);
});

it('Karriere-Wetten: nur zum Saisonstart, Auswertung nach der Saison', () => {
  const c = createCareer({ name: 'Wett Willi', nation: 'Deutschland', position: 'ST', age: 22, ovr: 80, potential: 86, clubId: slugify('SC Freiburg') });
  const offers = careerOffers(c);
  expect(offers.length).toBeGreaterThanOrEqual(4);
  expect(offers.some((o) => o.market === 'goals')).toBe(true);
  let club: ClubState = { ...freshClub(), casino: { ...casinoOf(freshClub()), chips: 5000 } };
  const o = offers.find((x) => x.market === 'goals')!;
  club = placeCareerBet(club, c, o, 100)!;
  expect(placeCareerBet(club, c, o, 100)).toBeNull(); // doppelt
  expect(resolveCareerBets(club, [c]).results).toHaveLength(0); // Saison läuft noch
  const done = { ...c, history: [{ goals: 99, assists: 0, apps: 30, trophies: [], cleanSheets: 0, avgRating: 7.5 } as never] };
  const r = resolveCareerBets(club, [done]);
  expect(r.results[0].win).toBe(Math.floor(100 * o.odds));
  expect(casinoOf(r.club).chips).toBe(casinoOf(club).chips + r.results[0].win);
  expect(betsOf(r.club).career).toHaveLength(0);
  expect(betsOf(finishRound(club, null)).round).toBe(2);
});
