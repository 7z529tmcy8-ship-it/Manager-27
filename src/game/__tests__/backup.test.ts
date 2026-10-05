import { beforeEach, expect, it } from 'vitest';
import { backupText, describeBackup, parseBackup, restoreBackup } from '../../backup';

const store = new Map<string, string>();
beforeEach(() => {
  store.clear();
  globalThis.localStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
  } as Storage;
});

it('Sicherung exportieren, prüfen und wieder einspielen', () => {
  store.set('fc-karriere-saves-v1', JSON.stringify([{ id: 'a' }, { id: 'b' }]));
  store.set('fc-club', JSON.stringify({ coins: 12345 }));
  store.set('fremd', 'bleibt draußen');
  const text = backupText();
  const b = parseBackup(text);
  expect(typeof b).toBe('object');
  if (typeof b === 'string') return;
  expect(b.data.fremd).toBeUndefined();
  expect(describeBackup(b)).toMatchObject({ careers: 2, coins: 12345 });
  // Browser „gelöscht“, dann wieder einspielen.
  store.clear();
  store.set('fc-manager-settings', '{"theme":"dark"}');
  expect(restoreBackup(b)).toBe(true);
  expect(JSON.parse(store.get('fc-club')!).coins).toBe(12345);
  expect(store.has('fc-manager-settings')).toBe(false); // gehört nicht zur Sicherung → ersetzt
});

it('Kaputte oder fremde Texte werden abgelehnt', () => {
  expect(typeof parseBackup('hallo')).toBe('string');
  expect(typeof parseBackup('{"app":"anders","data":{}}')).toBe('string');
  expect(typeof parseBackup('{"app":"fc-karriere-backup","version":1,"data":{"boese":"{}"}}')).toBe('string');
  expect(typeof parseBackup('{"app":"fc-karriere-backup","version":1,"data":{"fc-club":"{kaputt"}}')).toBe('string');
});
