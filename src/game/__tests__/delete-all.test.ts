import { beforeEach, expect, it } from 'vitest';
import { slugify } from '../../data/leagues';
import { createCareer } from '../career';
import { deleteAllCareers, listCareers, saveCareer } from '../storage';

const store = new Map<string, string>();
beforeEach(() => {
  store.clear();
  globalThis.localStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
    key: (i: number) => [...store.keys()][i] ?? null,
    get length() { return store.size; },
    clear: () => store.clear(),
  } as Storage;
});

it('Alle Karrieren löschen lässt den Club (Karten) unberührt', () => {
  localStorage.setItem('fc-club', JSON.stringify({ coins: 5, specials: [{ id: 'own-award-x-ucl' }] }));
  for (const n of ['A', 'B', 'C']) saveCareer(createCareer({ name: n, nation: 'Deutschland', position: 'ST', age: 20, ovr: 70, potential: 85, clubId: slugify('Hamburger SV') }));
  expect(listCareers().length).toBe(3);
  expect(deleteAllCareers()).toBe(3);
  expect(listCareers().length).toBe(0);
  expect(JSON.parse(localStorage.getItem('fc-club')!).specials).toHaveLength(1);
});

it('Während der Karriere keine Karten – am Karriereende genau eine Spezialkarte in die Sammlung', async () => {
  const { creditCareer, freshClub, claimCareerIcon, drawCareerReward, careerRewardKind, removeSeasonPlayerCards } = await import('../club');
  const { ownedCards, fitsTeam } = await import('../squad');
  const { simulateToBreak } = await import('../simple');
  const { retire } = await import('../career');
  let c = createCareer({ name: 'Karten Test', nation: 'Deutschland', position: 'ST', age: 20, ovr: 72, potential: 88, clubId: slugify('Hamburger SV') });
  let club = freshClub();
  c = simulateToBreak(simulateToBreak(c));
  club = creditCareer(club, c).club;
  expect(ownedCards(club)).toHaveLength(0); // keine Packs, keine Karte mitten in der Karriere
  const done = retire(c);
  club = creditCareer(club, done).club;
  expect(ownedCards(club)).toHaveLength(0);
  const got = careerRewardKind(done) === 'card' ? drawCareerReward(club, done) : claimCareerIcon(club, done)!;
  club = got.club;
  const mine = ownedCards(club);
  expect(mine).toHaveLength(1);
  expect(mine[0].name).toBe('Karten Test');
  expect(fitsTeam(mine[0].id, 'main')).toBe(true);
  // Aufräumen entfernt nur alte Saison-Karten, nicht die Spezialkarte
  const old = { ...club, specials: [...club.specials, { ...mine[0], id: `own-${done.id}-karte` }], squad: [`own-${done.id}-karte`, ...club.squad.slice(1)] };
  const cleaned = removeSeasonPlayerCards(old);
  expect(cleaned.specials.map((x) => x.id)).toEqual([mine[0].id]);
  expect(cleaned.squad[0]).toBeNull();
});
