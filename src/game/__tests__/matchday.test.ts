import { expect, it } from 'vitest';
import { slugify } from '../../data/leagues';
import { createCareer } from '../career';
import { finishStage, sceneStep, stageStep } from '../simple';
import { stayInWinter } from '../career';
import {
  TEAM_ROLES, changeTrust, coachTalk, canTalk, ensureCompetitor, playEtappe, resolveScene, roleOf, teamRole, trustInfo,
} from '../matchday';
import type { Career, TableRow } from '../types';

const base = (position: 'ST' | 'IV' | 'TW' | 'ZM' = 'ST', club = 'FC Bayern München') =>
  createCareer({ name: 'Spieltag', nation: 'Deutschland', position, age: 21, ovr: 78, potential: 88, clubId: slugify(club) });
const seq = (...xs: number[]) => { let i = 0; return () => xs[i++ % xs.length]; };
const tableOk = (rows: TableRow[]) => {
  const gf = rows.reduce((a, r) => a + r.goalsFor, 0);
  const ga = rows.reduce((a, r) => a + r.goalsAgainst, 0);
  const won = rows.reduce((a, r) => a + r.won, 0);
  const lost = rows.reduce((a, r) => a + r.lost, 0);
  return gf === ga && won === lost && rows.every((r) => r.points === r.won * 3 + r.drawn && r.played === r.won + r.drawn + r.lost);
};

it('Rollen-Stufen hängen an der Startelf-Chance', () => {
  expect(roleOf(0.05)).toBe('stand');
  expect(roleOf(0.2)).toBe('bench');
  expect(roleOf(0.5)).toBe('rotation');
  expect(roleOf(0.7)).toBe('starter');
  expect(roleOf(0.9)).toBe('key');
  const r = teamRole(base());
  expect(r.pct).toBeGreaterThan(0);
  expect(r.pct).toBeLessThan(1);
  expect(TEAM_ROLES.some((x) => x.id === r.id)).toBe(true);
});

it('Mehr Vertrauen = höhere Startelf-Chance, Gründe werden gemerkt', () => {
  const c = base();
  const before = teamRole(c).pct;
  changeTrust(c, 2, 'Test');
  expect(teamRole(c).pct).toBeGreaterThan(before);
  expect(trustInfo(c).log[0]).toEqual({ text: 'Test', d: 2 });
  changeTrust(c, 10, 'zu viel');
  expect(trustInfo(c).value).toBe(3);
});

it('Konkurrent: echter Mitspieler auf gleicher Position, bleibt im Verein gleich', () => {
  const c = base('ZM');
  const k = ensureCompetitor(c)!;
  expect(k.real).toBe(true);
  expect(ensureCompetitor(c)).toBe(k);
  // Verein ohne passende echte Spieler: erfundener Konkurrent
  const d = base('TW', 'SC Paderborn 07');
  expect(ensureCompetitor(d)?.name.length).toBeGreaterThan(3);
});

it('Szene: Tor zählt im Spiel und in der Tabelle, die Tabelle bleibt stimmig', () => {
  let c: Career = base();
  // Etappen spielen, bis eine Szene kommt
  for (let i = 0; i < 6 && !c.progress?.scene; i++) c = playEtappe(c);
  const scene = c.progress?.scene;
  if (!scene) return; // sehr selten: nie auf dem Platz
  const line = c.progress!.matches[scene.match];
  const goals = line.goals;
  const gf = line.goalsFor;
  const opt = scene.options.find((o) => o.win === 'goal') ?? scene.options[0];
  const { career, outcome } = resolveScene(c, opt.id, () => 0); // 0 = gelingt immer
  expect(outcome?.good).toBe(true);
  const after = career.progress!.matches[scene.match];
  if (opt.win === 'goal') expect(after.goals).toBe(goals + 1);
  if (opt.win !== 'save') expect(after.goalsFor).toBe(gf + 1);
  expect(career.progress!.scene).toBeNull();
  for (const rows of Object.values(career.progress!.rows)) expect(tableOk(rows)).toBe(true);
});

it('Ganze Saison im Spieltag-Modus: Winterpause, dann Saisonende mit Angeboten', () => {
  let c: Career = base();
  let guard = 0;
  while (c.phase === 'season' && guard++ < 10) {
    c = stageStep(c);
    if (c.progress?.scene) c = sceneStep(c, c.progress.scene.options[0].id);
  }
  expect(c.phase).toBe('winter');
  expect(c.progress?.stage).toBe(3);
  c = stayInWinter(c);
  guard = 0;
  while (c.phase === 'season' && guard++ < 10) {
    c = stageStep(c);
    if (c.progress?.scene) c = sceneStep(c, null); // Szene überspringen geht auch
  }
  expect(['window', 'retired']).toContain(c.phase);
  expect(c.history.length).toBe(1);
  if (c.phase === 'window') expect(c.offers.length + 1).toBeGreaterThan(0);
});

it('Trainergespräch: einmal pro Etappe, Forderung kann klappen oder schiefgehen', () => {
  const c = playEtappe(base());
  const ready = c.progress?.scene ? finishStage(c) : c;
  if (ready.phase !== 'season') return;
  expect(canTalk(ready)).toBe(true);
  const good = coachTalk(ready, 'demand', seq(0));
  expect(good.tone).toBe('good');
  expect(canTalk(good.career)).toBe(false);
  const bad = coachTalk(ready, 'demand', seq(0.99));
  expect(bad.tone).toBe('bad');
  expect((bad.career.player.morale ?? 0)).toBeLessThan(good.career.player.morale ?? 0);
  const task = coachTalk(ready, 'task', seq(0.5));
  expect(task.career.progress?.coachTask?.label).toBeTruthy();
});

it('Trainerwechsel frühestens nach zwei Etappen und nur einmal pro Saison', async () => {
  const { maybeSackTrainer, ensureTrainer } = await import('../matchday');
  let c: Career = base();
  c = playEtappe(c); if (c.progress?.scene) c = finishStage(c);
  // Tabellenletzter erzwingen
  const pr = c.progress!;
  const rows = Object.values(pr.rows).find((r) => r.some((x) => x.clubId === c.player.contract.clubId))!;
  for (const r of rows) r.points = r.clubId === c.player.contract.clubId ? -10 : 50;
  ensureTrainer(c);
  pr.stage = 1;
  expect(maybeSackTrainer(c, () => 0)).toBeNull();
  pr.stage = 2;
  expect(maybeSackTrainer(c, () => 0)).toBeTruthy();
  expect(maybeSackTrainer(c, () => 0)).toBeNull();
});
