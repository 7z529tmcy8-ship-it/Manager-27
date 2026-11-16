import { expect, it } from 'vitest';
import { slugify } from '../../data/leagues';
import { createCareer } from '../career';
import { simulateToBreak } from '../simple';
import {
  ARCHETYPES, CORE, DIRS, EDGES, GATE_LEVEL, NODES, STYLE_SLOTS, SKILL_VERSION, applyPlan, archetypesFor, canRespec, canUnlock, chooseArchetype,
  costOf, freePoints, levelInfo, lockReason, masteryOf, migrateSkills, neighborsOf, nodeById, respecSkills, savePlan, skillMods, softBoost,
  toggleStyle, trainSkills, unlockSkill, usesOf, xpForLevel,
} from '../skills';
import type { Career } from '../types';

const base = () => createCareer({ name: 'Skill', nation: 'Deutschland', position: 'ST', age: 22, ovr: 78, potential: 88, clubId: slugify('SC Freiburg') });
/** XP für genau so viele Level. */
const xpFor = (levels: number) => Array.from({ length: levels }, (_, i) => xpForLevel(i)).reduce((a, b) => a + b, 0);
const withLevel = (c: Career, level: number): Career => ({ ...c, player: { ...c.player, skills: { ...c.player.skills!, xp: xpFor(level) } } });

it('Universum: 60 Knoten, 4 Richtungen, alles von der Mitte erreichbar, Brücken zwischen Richtungen', () => {
  for (const pos of ['TW', 'IV', 'AV', 'ZDM', 'ZM', 'ZOM', 'FL', 'ST'] as const) expect(archetypesFor(pos).length).toBeGreaterThan(0);
  expect(NODES).toHaveLength(60);
  expect(new Set(NODES.map((n) => n.id)).size).toBe(60);
  for (const d of DIRS) {
    const own = NODES.filter((n) => n.dir === d);
    expect(own).toHaveLength(15);
    expect(own.filter((n) => n.kind === 'style')).toHaveLength(2);
    expect(own.filter((n) => n.kind === 'ult')).toHaveLength(2);
    expect(own.filter((n) => n.kind === 'star')).toHaveLength(1);
  }
  // Alles hängt zusammen
  const seen = new Set([CORE]);
  const queue = [CORE];
  while (queue.length) for (const n of neighborsOf(queue.shift()!)) if (!seen.has(n)) { seen.add(n); queue.push(n); }
  expect(seen.size).toBe(61);
  // Jede Richtung hat Brücken zu beiden Nachbarn
  const cross = EDGES.filter(([a, b]) => a !== CORE && nodeById(a)!.dir !== nodeById(b)!.dir);
  expect(cross).toHaveLength(8);
  expect(EDGES.filter(([a, b]) => a !== CORE && nodeById(a)!.ring === 3 && nodeById(b)!.ring === 3 && nodeById(a)!.dir === nodeById(b)!.dir)).toHaveLength(16);
  for (const a of ARCHETYPES) expect(DIRS).toContain(a.home);
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
  expect(c.player.skills?.v).toBe(SKILL_VERSION);
  c = simulateToBreak(c);
  const winterXp = c.player.skills!.xp;
  expect(winterXp).toBeGreaterThan(0);
  c = simulateToBreak(c);
  expect(c.player.skills!.seasonXp).toBe(0);
  expect(c.player.skills!.xp).toBeGreaterThan(winterXp);
  expect(chooseArchetype(c, 'winger')).toBe(c);
});

it('Freischalten: nur neben Gelerntem, Aufschlag weit weg von der Heimat, Wirkung', () => {
  let c = withLevel(chooseArchetype(base(), 'striker'), 12);
  const p = c.player;
  expect(costOf(p, nodeById('g1a')!)).toBe(1); // Heimat
  expect(costOf(p, nodeById('c1a')!)).toBe(2); // Nachbar
  expect(costOf(p, nodeById('a1a')!)).toBe(3); // gegenüber
  expect(costOf(p, nodeById('a4a')!)).toBe(10); // Ultimativ gegenüber: 6 + 2×2
  expect(lockReason(c, 'g2a')).toBe('Erst einen Nachbarknoten lernen');
  c = unlockSkill(c, 'g1a');
  expect(freePoints(c.player)).toBe(11);
  expect(skillMods(c.player).goal).toBeCloseTo(1.06);
  const next = neighborsOf('g1a').find((id) => id !== CORE)!;
  expect(canUnlock(c, next)).toBe(true);
  expect(unlockSkill(c, 'g1a')).toBe(c); // doppelt geht nicht
});

it('Meilensteine sperren den äußeren Bereich – bis zum Erfolg oder Level 25', () => {
  let c = withLevel(chooseArchetype(base(), 'striker'), 20);
  for (const id of ['g1b', 'g2c']) c = unlockSkill(c, id);
  const outer = neighborsOf('g2c').find((id) => nodeById(id)?.ring === 3)!;
  expect(lockReason(c, outer)).toContain('Meilenstein');
  // Mit 40 Karrieretoren offen
  const scored: Career = { ...c, history: [{ ...structuredClone(c.history[0] ?? {}), goals: 45, assists: 0, apps: 30, trophies: [] } as never] };
  expect(lockReason(scored, outer)).toBeNull();
  // Oder ab Level 25
  expect(lockReason(withLevel(c, GATE_LEVEL), outer)).toBeNull();
});

it('Spielstile: automatisch ausgerüstet, höchstens 3, wirken nur ausgerüstet', () => {
  let c = withLevel(chooseArchetype(base(), 'striker'), 60);
  c = { ...c, history: [{ goals: 100, assists: 100, apps: 300, trophies: ['a', 'b', 'c'] } as never] };
  const path = ['g1b', 'g2c', 'g3c', 'c1b', 'c2c'];
  for (let i = 0; i < 3; i++) for (const id of path) c = unlockSkill(c, id);
  const styles = c.player.skills!.styles!;
  expect(c.player.skills!.unlocked).toEqual(expect.arrayContaining(['g2c', 'g3c', 'c2c']));
  expect(styles).toHaveLength(STYLE_SLOTS);
  // Ablegen → Wirkung weg
  const before = skillMods(c.player).subGoal;
  expect(before).toBeGreaterThan(1);
  const off = toggleStyle(c, 'g3c');
  expect(skillMods(off.player).subGoal).toBe(1);
  expect(toggleStyle(off, 'g3c').player.skills!.styles).toContain('g3c');
});

it('Umbau einmal pro Saison, Baupläne speichern und laden, Wertungsboni zurück', () => {
  let c = withLevel(chooseArchetype(base(), 'striker'), 40);
  c = { ...c, history: [{ goals: 100, assists: 0, apps: 30, trophies: [] } as never] };
  for (let i = 0; i < 3; i++) for (const id of ['g1b', 'g2c', 'g1a', 'g2a', 'g2b', 'g3b', 'g3a']) c = unlockSkill(c, id);
  const star = c.player.skills!.unlocked.includes('g3b');
  expect(star).toBe(true);
  c = savePlan(c, 0, 'Knipser');
  const ovr = c.player.ovr;
  const r = respecSkills(c);
  expect(r.player.skills!.unlocked).toHaveLength(0);
  expect(r.player.ovr).toBe(ovr - 1);
  expect(canRespec(r)).toBe(false);
  expect(respecSkills(unlockSkill(r, 'g1a'))).not.toBe(r); // anderer Stand …
  expect(respecSkills(unlockSkill(r, 'g1a')).player.skills!.unlocked).toEqual(['g1a']); // … aber kein zweiter Umbau
  // Nächste Saison: Bauplan laden baut alles wieder auf
  const next = applyPlan({ ...r, year: r.year + 1 }, 0);
  expect(new Set(next.player.skills!.unlocked)).toEqual(new Set(c.player.skills!.unlocked));
  expect(next.player.ovr).toBe(ovr);
});

it('Alte Spielstände: alle Punkte und Wertungsboni zurück', () => {
  const c = chooseArchetype(base(), 'striker');
  const old: Career = structuredClone(c);
  delete old.player.skills!.v;
  old.player.skills!.unlocked = ['st_finish', 'st_complete'];
  old.player.skills!.gains = { st_complete: 1 };
  old.player.ovr += 1;
  expect(migrateSkills(old)).toBe(true);
  expect(old.player.skills!.unlocked).toEqual([]);
  expect(old.player.ovr).toBe(c.player.ovr);
  expect(old.player.skills!.note).toContain('Skill-Universum');
  expect(migrateSkills(old)).toBe(false);
});

it('Meisterung: Knoten steigen durch Benutzen von Bronze bis Prisma und wirken stärker', () => {
  let c = withLevel(chooseArchetype(base(), 'striker'), 5);
  c = unlockSkill(c, 'g1a');
  const s = nodeById('g1a')!;
  const season = { goals: 20, assists: 5, apps: 34, cleanSheets: 0, trophies: [] as string[] };
  expect(trainSkills(c, season)).toEqual(['„Abschluss“ erreicht Silber']);
  expect(usesOf(c.player, 'g1a')).toBe(20);
  expect(skillMods(c.player).goal).toBeCloseTo(1 + 0.06 * 1.2);
  for (let i = 0; i < 3; i++) trainSkills(c, season);
  expect(masteryOf(s, usesOf(c.player, 'g1a'))).toBe(3);
  expect(softBoost(1.5)).toBeCloseTo(1.26);
});

it('Voll ausgebauter Torjäger bleibt im Rahmen (keine 80-Tore-Saisons)', () => {
  let c = withLevel(chooseArchetype(base(), 'striker'), 80);
  c = { ...c, history: [{ goals: 100, assists: 100, apps: 300, trophies: ['a', 'b'] } as never] };
  const goalNodes = NODES.filter((n) => n.dir === 'g').sort((a, b) => a.ring - b.ring).map((n) => n.id);
  for (let i = 0; i < 4; i++) for (const id of goalNodes) c = unlockSkill(c, id);
  expect(c.player.skills!.unlocked.length).toBeGreaterThanOrEqual(15);
  const m = skillMods(c.player);
  expect(m.goal).toBeLessThan(1.45);
  c = { ...c, history: [] };
  let goals = 0;
  for (let i = 0; i < 2; i++) c = simulateToBreak(c);
  goals = c.history[c.history.length - 1].goals;
  expect(goals).toBeLessThan(70);
});
