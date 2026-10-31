import { expect, it } from 'vitest';
import { freshClub } from '../club';
import { redeemCode } from '../codes';

it('Code METEOR: 10 verschiedene Ikonen, nur einmal, Schreibweise egal', () => {
  const r = redeemCode(freshClub(), '  meteor ');
  expect(r.ok).toBe(true);
  if (!r.ok) return;
  expect(r.result.cards).toHaveLength(10);
  expect(new Set(r.result.cards.map((c) => c.card.id)).size).toBe(10);
  r.result.cards.forEach((c) => expect(c.card.variant).toBe('icon'));
  expect(Object.values(r.club.cards).reduce((a, b) => a + b, 0)).toBe(10);
  expect(redeemCode(r.club, 'METEOR')).toEqual({ ok: false, reason: 'used' });
  expect(redeemCode(freshClub(), 'GIBTSNICHT')).toEqual({ ok: false, reason: 'unknown' });
});

it('Meteor Rush: Verein in der 2. Kreisklasse, 1000 Tore → einmal ein Meteor-Drop mit 10 Ikonen', async () => {
  const { getClub } = await import('../../data/leagues');
  const { createCareer } = await import('../career');
  const { creditCareer } = await import('../club');
  const { openMeteorDrop } = await import('../codes');
  const { ACHIEVEMENTS, METEOR_CLUB, isDone } = await import('../achievements');
  expect(getClub(METEOR_CLUB).name).toBe('Meteor Rush');
  expect(getClub(METEOR_CLUB).leagueId).toBe('kk2h');
  const c = createCareer({ name: 'Meteor', nation: 'Deutschland', position: 'ST', age: 18, ovr: 60, potential: 80, clubId: METEOR_CLUB });
  const ach = ACHIEVEMENTS.find((a) => a.id === 'meteor_1000')!;
  const season = (goals: number, clubId = METEOR_CLUB) => ({ season: '2026/27', clubId, leagueId: 'kk2h', goals, assists: 0, apps: 30, trophies: [], awards: [], byCompetition: [], ovrStart: 60, ovrEnd: 62 }) as unknown as (typeof c.history)[number];
  c.history = [season(999), season(500, 'tsv-bordenau')];
  expect(isDone(ach, c)).toBe(false);
  expect(creditCareer(freshClub(), c).club.meteorDrops ?? 0).toBe(0);
  c.history = [season(600), season(400)];
  expect(isDone(ach, c)).toBe(true);
  const first = creditCareer(freshClub(), c);
  expect(first.meteor).toBe(true);
  expect(first.club.meteorDrops).toBe(1);
  // Nur einmal pro Karriere
  expect(creditCareer(first.club, c).club.meteorDrops).toBe(1);
  const open = openMeteorDrop(first.club)!;
  expect(open.result.cards).toHaveLength(10);
  open.result.cards.forEach((x) => expect(x.card.variant).toBe('icon'));
  expect(open.club.meteorDrops).toBe(0);
  expect(openMeteorDrop(open.club)).toBeNull();
});

it('Weitere Meteor-Codes und der Eissturm-Drop', async () => {
  const { frostCards } = await import('../codes');
  let club = freshClub();
  for (const code of ['meteorrush', 'Krater', 'STERNSCHNUPPE']) {
    const r = redeemCode(club, code);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.theme).toBe('meteor');
    expect(r.result.cards).toHaveLength(10);
    club = r.club;
  }
  const f = redeemCode(club, ' eissturm ');
  expect(f.ok).toBe(true);
  if (!f.ok) return;
  expect(f.theme).toBe('frost');
  expect(f.result.cards).toHaveLength(5);
  expect(f.result.cards.filter((c) => c.card.variant === 'winter')).toHaveLength(2);
  f.result.cards.forEach((c) => expect(c.card.ovr).toBeGreaterThanOrEqual(86));
  f.result.cards.forEach((c) => expect(c.card.variant).not.toBe('icon'));
  expect(redeemCode(f.club, 'EISSTURM')).toEqual({ ok: false, reason: 'used' });
  for (let i = 0; i < 50; i++) {
    const list = frostCards();
    expect(new Set(list.map((c) => c.name)).size).toBe(5);
  }
});
