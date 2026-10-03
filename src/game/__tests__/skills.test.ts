import { expect, it } from 'vitest';
import { slugify } from '../../data/leagues';
import { createCareer } from '../career';
import { simulateToBreak } from '../simple';
import { ARCHETYPES, archetypesFor, canUnlock, chooseArchetype, freePoints, levelInfo, skillMods, unlockSkill } from '../skills';

const base = () => createCareer({ name: 'Skill', nation: 'Deutschland', position: 'ST', age: 22, ovr: 78, potential: 88, clubId: slugify('SC Freiburg') });

it('Jede Position hat mindestens einen Spielertyp, Fähigkeiten-IDs sind eindeutig', () => {
  for (const pos of ['TW', 'IV', 'AV', 'ZDM', 'ZM', 'ZOM', 'FL', 'ST'] as const) expect(archetypesFor(pos).length).toBeGreaterThan(0);
  const ids = ARCHETYPES.flatMap((a) => a.skills.map((s) => s.id));
  expect(new Set(ids).size).toBe(ids.length);
  for (const a of ARCHETYPES) for (const t of [1, 2, 3]) expect(a.skills.filter((s) => s.tier === t)).toHaveLength(2);
});

it('Level-Kurve: Punkte pro Level, steigende Schwelle', () => {
  expect(levelInfo(0).level).toBe(0);
  expect(levelInfo(300).level).toBe(1);
  expect(levelInfo(300 + 379).level).toBe(1);
  expect(levelInfo(300 + 380).level).toBe(2);
});

it('EP nach Winterpause und Saisonende, nichts doppelt', () => {
  let c = chooseArchetype(base(), 'striker');
  expect(c.player.skills?.xp).toBe(0);
  c = simulateToBreak(c);
  const winterXp = c.player.skills!.xp;
  expect(winterXp).toBeGreaterThan(0);
  expect(c.player.skills!.seasonXp).toBe(winterXp);
  c = simulateToBreak(c);
  expect(c.player.skills!.seasonXp).toBe(0);
  expect(c.player.skills!.xp).toBeGreaterThan(winterXp);
  expect(chooseArchetype(c, 'winger')).toBe(c);
});

it('Fähigkeiten freischalten: Kosten, Stufen-Voraussetzung, Wirkung', () => {
  let c = chooseArchetype(base(), 'striker');
  c = { ...c, player: { ...c.player, skills: { ...c.player.skills!, xp: 8000 } } };
  const pts = freePoints(c.player);
  expect(pts).toBeGreaterThan(5);
  expect(canUnlock(c.player, 'st_poacher')).toBe(false); // Stufe 2 ohne Stufe 1
  c = unlockSkill(c, 'st_finish');
  expect(freePoints(c.player)).toBe(pts - 1);
  expect(canUnlock(c.player, 'st_poacher')).toBe(true);
  expect(skillMods(c.player).goal).toBeCloseTo(1.12);
  c = unlockSkill(c, 'st_poacher');
  expect(skillMods(c.player).goal).toBeCloseTo(1.12 * 1.1);
  const ovr = c.player.ovr;
  c = unlockSkill(c, 'st_complete');
  expect(c.player.ovr).toBe(ovr + 1);
  expect(unlockSkill(c, 'st_complete')).toBe(c);
  expect(unlockSkill(c, 'pm_vision')).toBe(c); // anderer Spielertyp
});
