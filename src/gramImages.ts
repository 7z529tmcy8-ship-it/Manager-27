import { useEffect, useState } from 'react';

// Kickgram-Bilder liegen nur im Browser (IndexedDB) – nichts wird hochgeladen.
// Fotos werden vor dem Speichern verkleinert (max. 1080 px, JPEG), damit der Speicher nicht vollläuft.

const DB = 'fc-kickgram';
const STORE = 'img';
let dbp: Promise<IDBDatabase> | null = null;

function db(): Promise<IDBDatabase> {
  if (!dbp) {
    dbp = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => { dbp = null; reject(req.error); };
    });
  }
  return dbp;
}

async function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const d = await db();
  return new Promise((resolve, reject) => {
    const r = fn(d.transaction(STORE, mode).objectStore(STORE));
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}

/** Bild aus der Galerie verkleinern; quadratisch zuschneiden für Posts, sonst Seitenverhältnis behalten. */
export async function shrink(file: File, max = 1080, square = false): Promise<Blob> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error('Bild konnte nicht gelesen werden'));
      i.src = url;
    });
    let sx = 0, sy = 0, sw = img.naturalWidth, sh = img.naturalHeight;
    if (square) { const s = Math.min(sw, sh); sx = (sw - s) / 2; sy = (sh - s) / 2; sw = sh = s; }
    const scale = Math.min(1, max / Math.max(sw, sh));
    const c = document.createElement('canvas');
    c.width = Math.round(sw * scale);
    c.height = Math.round(sh * scale);
    c.getContext('2d')!.drawImage(img, sx, sy, sw, sh, 0, 0, c.width, c.height);
    return await new Promise<Blob>((resolve, reject) => c.toBlob((b) => (b ? resolve(b) : reject(new Error('Speichern fehlgeschlagen'))), 'image/jpeg', 0.82));
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function saveImage(file: File, square = true, max = 1080): Promise<string> {
  const blob = await shrink(file, max, square);
  const key = `g-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  await tx('readwrite', (s) => s.put(blob, key));
  return key;
}

export async function deleteImage(key: string): Promise<void> {
  try { await tx('readwrite', (s) => s.delete(key)); } catch { /* egal */ }
}

const cache = new Map<string, string>();
/** Objekt-URL eines gespeicherten Bildes (oder null, solange es lädt bzw. fehlt). */
export function useGramImage(key?: string): string | null | 'missing' {
  const [url, setUrl] = useState<string | null | 'missing'>(() => (key ? cache.get(key) ?? null : 'missing'));
  useEffect(() => {
    if (!key) { setUrl('missing'); return; }
    const hit = cache.get(key);
    if (hit) { setUrl(hit); return; }
    let live = true;
    tx<Blob | undefined>('readonly', (s) => s.get(key) as IDBRequest<Blob | undefined>)
      .then((b) => { if (!live) return; if (!b) { setUrl('missing'); return; } const u = URL.createObjectURL(b); cache.set(key, u); setUrl(u); })
      .catch(() => live && setUrl('missing'));
    return () => { live = false; };
  }, [key]);
  return url;
}
