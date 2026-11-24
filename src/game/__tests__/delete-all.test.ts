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
