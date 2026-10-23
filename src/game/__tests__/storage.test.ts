import { beforeEach, describe, expect, it } from 'vitest';
import { slugify } from '../../data/leagues';
import { createCareer, playSeason } from '../career';
import { listCareers, migrateSaves, saveCareer } from '../storage';

// Kleiner Ersatz für den Browser-Speicher mit Größenlimit (Zeichen)
function fakeStorage(limit: number) {
  const m = new Map<string, string>();
  return {
    get length() { return m.size; },
    key: (i: number) => [...m.keys()][i] ?? null,
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => {
      const used = [...m.entries()].filter(([x]) => x !== k).reduce((a, [x, y]) => a + x.length + y.length, 0);
      if (used + k.length + v.length > limit) throw new Error('QuotaExceededError');
      m.set(k, v);
    },
    removeItem: (k: string) => { m.delete(k); },
    clear: () => m.clear(),
  };
}

describe('Spielstände speichern', () => {
  beforeEach(() => { (globalThis as { localStorage?: unknown }).localStorage = fakeStorage(400_000); });

  it('komprimiert speichern und wieder laden', () => {
    let c = createCareer({ name: 'Speichertest', nation: 'Deutschland', position: 'ST', age: 20, ovr: 70, potential: 85, clubId: slugify('VfB Stuttgart') });
    for (let i = 0; i < 4; i++) c = playSeason(c);
    expect(saveCareer(c)).toBe(true);
    const raw = localStorage.getItem('fc-karriere-saves-v1')!;
    expect(raw.length).toBeLessThan(JSON.stringify(c).length / 3);
    const back = listCareers();
    expect(back[0].player.name).toBe('Speichertest');
    expect(back[0].history.length).toBe(c.history.length);
  });

  it('alte unkomprimierte Spielstände werden gelesen und beim Start komprimiert', () => {
    const c = playSeason(createCareer({ name: 'Alt', nation: 'Deutschland', position: 'ST', age: 20, ovr: 70, potential: 85, clubId: slugify('VfB Stuttgart') }));
    localStorage.setItem('fc-karriere-saves-v1', JSON.stringify([c]));
    expect(listCareers()[0].player.name).toBe('Alt');
    migrateSaves();
    expect(localStorage.getItem('fc-karriere-saves-v1')!.startsWith('[')).toBe(false);
    expect(listCareers()[0].player.name).toBe('Alt');
  });
});
