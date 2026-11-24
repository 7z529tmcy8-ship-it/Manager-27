import { expect, it } from 'vitest';
import { getLeague, slugify } from '../../data/leagues';
import { createCareer, retire } from '../career';
import { CAREER_REWARD_TIERS, careerRewardKind, careerRewardOptions, careerRewardTier, chooseCareerReward, claimCareerReward, drawCareerReward, creditCareer, freshClub, rewardPending } from '../club';
import { generateOffers } from '../offers';
import { clubLeagueId } from '../player';
import { applyChoice, seasonChoices, simulateToBreak } from '../simple';
import type { Career } from '../types';


const veteran = (age: number, club = 'Hannover 96') => {
  const c = createCareer({ name: 'Oldie', nation: 'Deutschland', position: 'ST', age, ovr: 80, potential: 80, clubId: slugify('SV Werder Bremen') });
  // Karriere begann in Bremen, jetzt spielt er woanders.
  return { ...c, player: { ...c.player, contract: { ...c.player.contract, clubId: slugify(club), yearsLeft: 1 } } } as Career;
};

it('Exoten-Angebote erst ab 31, Heimkehr erst ab 33', () => {
  let exotic = 0;
  let home = 0;
  for (let i = 0; i < 40; i++) {
    const offers = generateOffers(veteran(34), undefined);
    if (offers.some((o) => o.tag === 'exotic' && getLeague(clubLeagueId(veteran(34), o.clubId)).exotic)) exotic++;
    if (offers.some((o) => o.tag === 'home' && o.clubId === slugify('SV Werder Bremen'))) home++;
  }
  expect(exotic).toBeGreaterThan(20);
  expect(home).toBeGreaterThan(15);
  for (let i = 0; i < 40; i++) {
    const offers = generateOffers(veteran(25), undefined);
    expect(offers.some((o) => o.tag || getLeague(clubLeagueId(veteran(25), o.clubId)).exotic)).toBe(false);
  }
});

it('Heimkehr und Abenteuer erscheinen als eigene Möglichkeiten', () => {
  const c: Career = { ...veteran(34), phase: 'window' };
  c.offers = generateOffers(c, undefined).filter((o) => o.tag);
  const choices = seasonChoices(c);
  if (c.offers.some((o) => o.tag === 'home')) expect(choices.some((x) => x.kind === 'home')).toBe(true);
  if (c.offers.some((o) => o.tag === 'exotic')) expect(choices.some((x) => x.kind === 'exotic')).toBe(true);
  const home = choices.find((x) => x.kind === 'home');
  if (home) expect(applyChoice(c, home).homecoming).toBe(true);
});

it('Karriereende: selbst erstellter Spieler bekommt Packs je nach Bilanz, nur einmal', () => {
  const active = simulateToBreak(simulateToBreak(createCareer({ name: 'Aktiv', nation: 'Deutschland', position: 'ST', age: 24, ovr: 86, potential: 90, clubId: slugify('FC Bayern München') })));
  const a = creditCareer(freshClub(), active);
  expect(a.club.specials).toHaveLength(0);
  expect(rewardPending(a.club, active)).toBe(false);
  const done = { ...retire(active), player: { ...retire(active).player, origin: 'academy' as const } };
  expect(careerRewardKind(done)).toBe('packs');
  const b = creditCareer(a.club, done);
  expect(rewardPending(b.club, done)).toBe(true);
  const { tier, score } = careerRewardTier(done);
  expect(score).toBeGreaterThan(0);
  // Keine Karte wählbar
  expect(chooseCareerReward(b.club, done, 'egal')).toBe(b.club);
  const res = claimCareerReward(b.club, done)!;
  expect(res.tier.id).toBe(tier.id);
  expect(res.result.cards.length).toBeGreaterThan(0);
  expect(res.club.specials.some((c) => c.id.startsWith('own-'))).toBe(false);
  expect(rewardPending(res.club, done)).toBe(false);
  expect(claimCareerReward(res.club, done)).toBeNull();
  // Bessere Karriere → stärkere Stufe
  const great = structuredClone(done);
  for (let i = 0; i < 8; i++) great.history.push({ ...structuredClone(done.history[0]), awards: ['Ballon d’Or', 'Spieler der Saison'], trophies: ['Meister', 'Champions League'], ovrEnd: 94, goals: 40 });
  expect(CAREER_REWARD_TIERS.findIndex((t) => t.id === careerRewardTier(great).tier.id)).toBeGreaterThan(CAREER_REWARD_TIERS.findIndex((t) => t.id === tier.id));
});

it('Karriereende: echter Spieler mit Auszeichnung wählt eine Auszeichnungs-Karte, ohne Auszeichnung gibt es Packs', () => {
  const real = retire(simulateToBreak(simulateToBreak(createCareer({ name: 'Erling Haaland', nation: 'Norwegen', position: 'ST', age: 25, ovr: 91, potential: 92, clubId: slugify('Manchester City') }))));
  const plain = structuredClone(real);
  for (const r of plain.history) { r.awards = []; r.trophies = r.trophies.filter((t) => t !== 'Champions League' && !t.startsWith('Weltmeisterschaft')); }
  expect(careerRewardKind(plain)).toBe('packs');
  const awarded = structuredClone(plain);
  awarded.history[0].awards.push('Ballon d’Or');
  expect(careerRewardKind(awarded)).toBe('card');
  const club = creditCareer(freshClub(), awarded).club;
  expect(claimCareerReward(club, awarded)).toBeNull();
  const opts = careerRewardOptions(awarded);
  expect(opts.map((o) => o.variant)).toEqual(['ballondor']);
  const c = chooseCareerReward(club, awarded, opts[0].id);
  expect(c.specials.map((x) => x.variant)).toEqual(['ballondor']);
  expect(rewardPending(c, awarded)).toBe(false);
  // Zufall statt Wahl: zwei verdiente Karten, gezogen wird je nach Zufallszahl – und nur einmal.
  awarded.history[0].trophies.push('Champions League');
  const two = careerRewardOptions(awarded);
  expect(two.length).toBe(2);
  expect(drawCareerReward(club, awarded, () => 0).card!.id).toBe(two[0].id);
  const d = drawCareerReward(club, awarded, () => 0.99);
  expect(d.card!.id).toBe(two[1].id);
  expect(drawCareerReward(d.club, awarded).card).toBeNull();
});
