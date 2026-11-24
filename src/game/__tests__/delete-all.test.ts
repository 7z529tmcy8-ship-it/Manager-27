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

it('Karriere-Spieler kommt nach der ersten Saison als Karte in die Sammlung und wächst mit', async () => {
  const { creditCareer, freshClub, playerCardId } = await import('../club');
  const { ownedCards, fitsTeam } = await import('../squad');
  const { simulateToBreak } = await import('../simple');
  let c = createCareer({ name: 'Karten Test', nation: 'Deutschland', position: 'ST', age: 20, ovr: 72, potential: 88, clubId: slugify('Hamburger SV') });
  let club = freshClub();
  expect(creditCareer(club, c).playerCard ?? null).toBeNull(); // noch keine Saison
  c = simulateToBreak(simulateToBreak(c));
  const r = creditCareer(club, c);
  expect(r.playerCard?.name).toBe('Karten Test');
  // Saison-Pack mit echten Spielern landet in der Sammlung
  expect(r.seasonPacks?.result.cards.length ?? 0).toBeGreaterThanOrEqual(3);
  expect(Object.values(r.club.cards).reduce((x, n) => x + n, 0)).toBeGreaterThanOrEqual(3);
  club = r.club;
  const card = ownedCards(club).find((x) => x.id === playerCardId(c))!;
  expect(card).toBeTruthy();
  expect(fitsTeam(card.id, 'main')).toBe(true); // darf ins Haupt-Team
  // Nächste Saison: gleiche Karte, aktualisiert – keine zweite
  c = { ...c, player: { ...c.player, ovr: 90 } };
  const r2 = creditCareer(club, c);
  expect(r2.playerCard ?? null).toBeNull();
  expect(r2.club.specials.filter((x) => x.id === playerCardId(c))).toHaveLength(1);
  expect(r2.club.specials.find((x) => x.id === playerCardId(c))!.ovr).toBe(90);
});
