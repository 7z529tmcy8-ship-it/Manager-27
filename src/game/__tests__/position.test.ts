import { expect, it } from 'vitest';
import { slugify } from '../../data/leagues';
import { createCareer, playSeason, stayAtClub } from '../career';
import { attributes } from '../player';
import { cancelRetrain, canRetrain, NEIGHBOURS, ovrAt, progressRetrain, retrainOptions, startRetrain } from '../position';
import type { Career } from '../types';

const pro = (position: 'ST' | 'TW' = 'ST', age = 24) =>
  createCareer({ name: 'Pos Test', nation: 'Deutschland', position, age, ovr: 78, potential: 84, clubId: slugify('FC Bayern München') });

it('Stürmer kann ZOM oder Flügel lernen, Torhüter nichts', () => {
  const c = pro();
  expect(retrainOptions(c.player).map((o) => o.to).sort()).toEqual(['FL', 'ZOM']);
  expect(canRetrain(pro('TW'))).toBe(false);
  for (const [from, list] of Object.entries(NEIGHBOURS)) for (const to of list) expect(NEIGHBOURS[to]).toContain(from);
});

it('Positionstraining: Fortschritt pro Halbserie, am Ende neue Position mit ehrlicher Wertung', () => {
  let c = startRetrain(pro(), 'ZOM');
  const r = c.player.retrain!;
  expect(r.to).toBe('ZOM');
  expect(r.left).toBe(r.total);
  const p = structuredClone(c.player);
  const before = attributes(p);
  let note = '';
  for (let i = 0; i < r.total; i++) note = progressRetrain(p) ?? '';
  expect(p.position).toBe('ZOM');
  expect(p.retrain).toBeUndefined();
  expect(note).toContain('Umschulung geschafft');
  // Attribute bleiben erhalten (plus Trainingsfortschritt), die Wertung passt zur neuen Position
  const after = attributes(p);
  after.forEach((a, i) => expect(a).toBeGreaterThanOrEqual(before[i]));
  expect(p.ovr).toBe(ovrAt(p, 'ZOM'));
  // Abbrechen setzt nichts um
  c = cancelRetrain(startRetrain(pro(), 'FL'));
  expect(c.player.retrain).toBeUndefined();
  expect(c.player.position).toBe('ST');
});

it('Positionstraining läuft in der echten Saison mit und endet nach einer Saison', () => {
  let c: Career = startRetrain(pro('ST', 25), 'ZOM');
  for (let i = 0; i < 2 && c.player.position !== 'ZOM'; i++) {
    if (c.phase === 'window') c = stayAtClub(c);
    c.decision = null;
    c = playSeason(c);
  }
  expect(c.player.position).toBe('ZOM');
  expect(c.player.retrain).toBeUndefined();
}, 20000);
