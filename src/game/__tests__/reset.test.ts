import { beforeEach, expect, it } from 'vitest';
import { resetAccount } from '../../backup';

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

it('Account zurücksetzen löscht Spielstände und Club, behält Geräte-Einstellungen', () => {
  for (const k of ['fc-club', 'fc-karriere-saves-v1', 'fc-k2-index', 'fc-k2-abc', 'fc-seen-update', 'homestudio-hustle-v1', 'fc-manager-settings', 'fremd']) store.set(k, '1');
  expect(resetAccount()).toBe(true);
  expect([...store.keys()].sort()).toEqual(['fc-manager-settings', 'fremd']);
});
