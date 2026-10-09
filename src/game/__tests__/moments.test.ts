import { expect, it } from 'vitest';
import { slugify } from '../../data/leagues';
import { createCareer } from '../career';
import { buyShares, injectMoney, MAX_BACKING, MAX_GAIN_PER_YEAR, sharePrice } from '../invest';
import { detectMoments } from '../moments';
import { backgroundSeason, closeYear } from '../household';
import { clubLeagueId, clubStrength } from '../player';
import { applyChoice, seasonChoices, simulateToBreak } from '../simple';
import type { Career, SeasonRecord } from '../types';

const base = () => createCareer({ name: 'Moment', nation: 'Deutschland', position: 'ST', age: 24, ovr: 80, potential: 88, clubId: slugify('Hannover 96') });

it('Torschützenkönig, Titel und Ballon d’Or werden erkannt', () => {
  const prev = base();
  const r = { season: '2025/26', clubId: prev.player.contract.clubId, goals: 30, awards: ['Torschützenkönig 2. Bundesliga', 'Ballon d’Or'], trophies: ['DFB-Pokal', 'Meister (2. Bundesliga, Aufstieg)'], byCompetition: [{ competition: 'Liga', goals: 27 }] } as unknown as SeasonRecord;
  const next: Career = { ...prev, phase: 'window', history: [r] };
  const kinds = detectMoments(prev, next).map((m) => m.kind);
  expect(kinds).toContain('scorer');
  expect(kinds).toContain('ballon');
  expect(kinds).toContain('title');
  expect(detectMoments(prev, next).find((m) => m.kind === 'title')!.title).toBe('Meister!');
});

it('WM-Titel wird mit dem Land gefeiert, nicht mit dem Verein', () => {
  const prev = base();
  const r = { season: '2029/30', clubId: prev.player.contract.clubId, goals: 5, awards: [], trophies: ['DFB-Pokal', 'Weltmeisterschaft 2030'] } as unknown as SeasonRecord;
  const m = detectMoments(prev, { ...prev, phase: 'window', history: [r] }).find((x) => x.kind === 'title')!;
  expect(m.title).toBe('Weltmeister!');
  expect(m.sub).toContain('Deutschland');
  expect(m.sub).not.toContain('Hannover');
});

it('Wertungssprünge über eine Pause, aber nicht durch Fähigkeiten', () => {
  const prev = base();
  const up = { ...prev, phase: 'winter' as const, player: { ...prev.player, ovr: 84 } };
  expect(detectMoments(prev, up).map((m) => m.kind)).toContain('rise');
  const down = { ...prev, phase: 'winter' as const, player: { ...prev.player, ovr: 76 } };
  expect(detectMoments(prev, down).map((m) => m.kind)).toContain('fall');
  const skill = { ...prev, player: { ...prev.player, ovr: 84 } }; // gleiche Phase → kein Moment
  expect(detectMoments(prev, skill)).toHaveLength(0);
});

it('Vereinswechsel wird erkannt', () => {
  let c = simulateToBreak(simulateToBreak(base()));
  const t = seasonChoices(c).find((x) => x.kind === 'transfer');
  if (!t) return; // ohne Angebot nichts zu prüfen
  const next = applyChoice(c, t);
  const m = detectMoments(c, next).find((x) => x.kind === 'transfer');
  expect(m?.toClub).toBeTruthy();
  c = next;
});

it('Leipzig-Projekt: Geld macht einen Landesligisten über Jahre stärker, nicht sofort', () => {
  const c = base();
  const club = slugify('OSV Hannover');
  expect(injectMoney(c, club, 5000, 1e9).delta).toBe(0); // keine Anteile
  const owner = buyShares(c, club, 49, 1e9).career;
  const start = clubStrength(owner, club);
  const x = injectMoney(owner, club, 500_000, 1e9).career;
  // Direkt nach dem Investieren ändert sich nichts.
  expect(clubStrength(x, club)).toBe(start);
  expect(x.household!.shares[0].fund).toBe(500_000);
  // Pro Jahr höchstens +6 (plus Zufall) – der Ausbau dauert mehrere Saisons.
  let prev = start;
  const leagues: string[] = [];
  for (let year = 0; year < 12; year++) {
    backgroundSeason(x);
    closeYear(x);
    const now = clubStrength(x, club);
    expect((x.clubBacking?.[club] ?? 0)).toBeLessThanOrEqual(MAX_BACKING * 1.2);
    expect(now - prev).toBeLessThan(MAX_GAIN_PER_YEAR * 1.2 + 4); // + Vereinsform (Drift)
    prev = now;
    leagues.push(clubLeagueId(x, club));
  }
  const backing = x.clubBacking![club];
  expect(backing).toBeGreaterThan(20);
  expect(leagues[0]).not.toBe('bl1');
  expect(leagues.some((l) => l !== 'llh')).toBe(true); // mindestens ein Aufstieg
  // Wertzuwachs der eigenen Anteile bleibt unter dem eingesetzten Geld.
  expect(49 * (sharePrice(x, club) - sharePrice(owner, club))).toBeLessThan(500_000);
});
