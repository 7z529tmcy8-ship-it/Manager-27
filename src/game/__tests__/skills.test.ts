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
  for (const a of ARCHETYPES) {
    for (const t of [1, 2, 3, 4, 5]) expect(a.skills.filter((s) => s.tier === t)).toHaveLength(2);
    expect(a.skills.filter((s) => s.tier === 6)).toHaveLength(1);
    expect(a.skills.filter((s) => s.branch === 'a')).toHaveLength(5);
    expect(a.skills.filter((s) => s.branch === 'b')).toHaveLength(5);
  }
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

it('Äste, Meisterstück, mehrstufige Fähigkeiten und Neuverteilen', async () => {
  const { lockReason, rankOf, respecSkills, bonusSummary } = await import('../skills');
  let c = chooseArchetype(base(), 'striker');
  c = { ...c, player: { ...c.player, skills: { ...c.player.skills!, xp: 60000 } } };
  // Stufe 2 im rechten Ast braucht die Stufe-1-Fähigkeit des rechten Asts.
  c = unlockSkill(c, 'st_finish');
  expect(lockReason(c.player, 'st_clinical')).toContain('Kopfballungeheuer');
  // Meisterstück erst, wenn ein Ast komplett und der andere bis Stufe 2 gelernt ist.
  expect(canUnlock(c.player, 'st_master')).toBe(false);
  for (const id of ['st_poacher', 'st_complete', 'st_volley', 'st_header', 'st_clinical']) c = unlockSkill(c, id);
  expect(lockReason(c.player, 'st_master')).toContain('Stufe 5');
  c = unlockSkill(c, 'st_world');
  expect(canUnlock(c.player, 'st_master')).toBe(true);
  const ovr = c.player.ovr;
  c = unlockSkill(c, 'st_master');
  expect(c.player.ovr).toBe(ovr + 2);
  // Physio: drei Stufen, Wirkung pro Stufe.
  for (let i = 0; i < 4; i++) c = unlockSkill(c, 'gen_physio');
  expect(rankOf(c.player, 'gen_physio')).toBe(3);
  expect(skillMods(c.player).injury).toBeCloseTo(0.9 ** 3);
  expect(bonusSummary(skillMods(c.player)).some((b) => b.includes('Verletzungsrisiko'))).toBe(true);
  // Neu verteilen: Punkte zurück, Wertungsboni wieder ab, nur einmal.
  const before = freePoints(c.player);
  const r = respecSkills(c);
  expect(r.player.skills!.unlocked).toHaveLength(0);
  expect(freePoints(r.player)).toBeGreaterThan(before);
  expect(r.player.ovr).toBe(c.player.ovr - 5); // Kompletter Stürmer +1, Weltklasse +2, Meisterstück +2
  const again = unlockSkill(r, 'st_finish');
  expect(respecSkills(again)).toBe(again); // zweites Neuverteilen geht nicht
});
