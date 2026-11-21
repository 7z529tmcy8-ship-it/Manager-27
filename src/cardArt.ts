import { useEffect, useState } from 'react';

// Eigene Kartenbilder (Casino-VIP-Belohnung): liegen in IndexedDB (zu groß für localStorage),
// werden beim Hochladen auf 320 px verkleinert und im Speicher zwischengehalten.

const DB = 'fc-card-art';
const STORE = 'art';
const cache = new Map<string, string>();
const listeners = new Set<() => void>();
let loaded: Promise<void> | null = null;

function open(): Promise<IDBDatabase> {
  return new Promise((res, rej) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(STORE);
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}
async function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open();
  return new Promise((res, rej) => {
    const t = db.transaction(STORE, mode);
    const req = fn(t.objectStore(STORE));
    req.onsuccess = () => res(req.result);
    req.onerror = () => rej(req.error);
  });
}

/** Alle Bilder einmal laden (beim ersten Gebrauch). */
export function loadCardArt(): Promise<void> {
  if (loaded) return loaded;
  loaded = (async () => {
    try {
      const keys = (await tx('readonly', (s) => s.getAllKeys())) as string[];
      const vals = (await tx('readonly', (s) => s.getAll())) as string[];
      keys.forEach((k, i) => cache.set(k, vals[i]));
      listeners.forEach((f) => f());
    } catch { /* kein IndexedDB (z. B. privater Modus) – dann eben ohne */ }
  })();
  return loaded;
}

export const cardArtIds = () => [...cache.keys()];
export const cardArtOf = (id: string) => cache.get(id);

export async function setCardArt(id: string, dataUrl: string): Promise<void> {
  await tx('readwrite', (s) => s.put(dataUrl, id));
  cache.set(id, dataUrl);
  listeners.forEach((f) => f());
}
export async function removeCardArt(id: string): Promise<void> {
  await tx('readwrite', (s) => s.delete(id));
  cache.delete(id);
  listeners.forEach((f) => f());
}

/** Bild verkleinern (quadratisch zugeschnitten, 320 px, JPEG) – bleibt so klein (~25 KB). */
export function shrinkImage(file: File, size = 320): Promise<string> {
  return new Promise((res, rej) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = size; c.height = size;
      const s = Math.min(img.width, img.height);
      const ctx = c.getContext('2d')!;
      // Hochformat (typisch für Fotos von Personen): eher oben ausschneiden, damit der Kopf nicht abgeschnitten wird.
      const y = img.height > img.width ? (img.height - s) * 0.18 : (img.height - s) / 2;
      ctx.drawImage(img, (img.width - s) / 2, y, s, s, 0, 0, size, size);
      URL.revokeObjectURL(url);
      res(c.toDataURL('image/jpeg', 0.82));
    };
    img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('Bild konnte nicht gelesen werden')); };
    img.src = url;
  });
}

/** React: Bild einer Karte (aktualisiert sich bei Änderungen). */
export function useCardArt(id: string): string | undefined {
  const [, force] = useState(0);
  useEffect(() => {
    const f = () => force((x) => x + 1);
    listeners.add(f);
    void loadCardArt();
    return () => { listeners.delete(f); };
  }, []);
  return cache.get(id);
}
