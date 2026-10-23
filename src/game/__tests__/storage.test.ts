import { beforeEach, describe, expect, it } from 'vitest';
import { slugify } from '../../data/leagues';
import { createCareer, playSeason } from '../career';
import { LEGACY_KEY, deleteCareer, exportCareersJson, flushSaves, listCareers, resetStorageCache, saveCareer } from '../storage';

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
const career = (name: string, seasons = 2) => {
  let c = createCareer({ name, nation: 'Deutschland', position: 'ST', age: 20, ovr: 70, potential: 85, clubId: slugify('VfB Stuttgart') });
  for (let i = 0; i < seasons; i++) c = playSeason(c);
  return c;
};

describe('Spielstände speichern', () => {
  beforeEach(() => {
    (globalThis as { localStorage?: unknown }).localStorage = fakeStorage(400_000);
    resetStorageCache();
  });

  it('jede Karriere komprimiert unter eigenem Schlüssel, Laden nach Neustart', () => {
    const a = career('Anna');
    const b = career('Ben');
    saveCareer(a);
    saveCareer(b);
    expect(flushSaves()).toBe(true);
    const raw = localStorage.getItem('fc-k2-' + a.id)!;
    expect(raw.length).toBeLessThan(JSON.stringify(a).length / 3);
    resetStorageCache(); // wie ein Neuladen der Seite
    expect(listCareers().map((c) => c.player.name).sort()).toEqual(['Anna', 'Ben']);
    deleteCareer(a.id);
    resetStorageCache();
    expect(listCareers().map((c) => c.player.name)).toEqual(['Ben']);
  });

  it('alte Spielstände (eine Liste) werden beim ersten Laden übernommen und umgezogen', () => {
    const c = career('Alt', 1);
    localStorage.setItem(LEGACY_KEY, JSON.stringify([c]));
    expect(listCareers()[0].player.name).toBe('Alt');
    expect(localStorage.getItem(LEGACY_KEY)).toBeNull();
    resetStorageCache();
    expect(listCareers()[0].player.name).toBe('Alt');
  });

  it('Sicherung bekommt normales JSON', () => {
    saveCareer(career('Export', 1));
    const json = JSON.parse(exportCareersJson());
    expect(json[0].player.name).toBe('Export');
  });

  it('Speichern blockiert nicht: mehrere Saves hintereinander schreiben erst gesammelt', () => {
    const c = career('Schnell', 1);
    for (let i = 0; i < 20; i++) saveCareer({ ...c, updatedAt: i });
    expect(localStorage.getItem('fc-k2-' + c.id)).toBeNull(); // noch nicht geschrieben
    flushSaves();
    expect(localStorage.getItem('fc-k2-' + c.id)).not.toBeNull();
  });
});
