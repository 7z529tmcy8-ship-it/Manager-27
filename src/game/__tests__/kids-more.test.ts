import { expect, it } from 'vitest';
import { slugify, getClub } from '../../data/leagues';
import { createCareer } from '../career';
import { familyYear, householdOf, negotiateKid, newChild, resolveKidEvent, setRule, setYouthClub, youthClubCost, youthClubs, yearlyCost } from '../family';
import type { Career } from '../types';

const base = (): Career => {
  const c = createCareer({ name: 'Papa', nation: 'Deutschland', position: 'ST', age: 30, ovr: 85, potential: 85, clubId: slugify('Hannover 96') });
  const h = householdOf(c);
  const kid = newChild(c, 'Lena');
  h.children.push(kid);
  return c;
};

it('Jugendverein: Auswahl, Beitrag nach Stärke, Kosten im Jahr', () => {
  let c = base();
  const id = c.household!.children[0].id;
  c.household!.year = 8;
  c.household!.children[0].bornYear = 0;
  c = setRule(c, id, 'club', 'academy');
  const kid = c.household!.children[0];
  expect(kid.youthClubId).toBeTruthy();
  expect(youthClubs('academy')).toContain(kid.youthClubId);
  const top = youthClubs('academy')[0];
  c = setYouthClub(c, id, top);
  const k2 = c.household!.children[0];
  expect(getClub(top).strength).toBeGreaterThan(80);
  expect(youthClubCost(k2)).toBeGreaterThan(0);
  expect(yearlyCost(c.household!, k2)).toBeGreaterThanOrEqual(youthClubCost(k2) + 500);
});

it('Mit 18: Angebot, Verhandlung – gut gepokert, gescheitert, sauer', () => {
  const at18 = () => {
    const c = base();
    const kid = c.household!.children[0];
    c.household!.year = 17;
    kid.bornYear = 0;
    kid.talent = 95;
    Object.assign(kid.stats, { technique: 90, fitness: 90, discipline: 80, happiness: 70 });
    familyYear(c);
    return c;
  };
  const c = at18();
  const kid = c.household!.children[0];
  expect(kid.status).toBe('offer');
  // Gute Verhandlung: doppeltes Gehalt
  const good = negotiateKid(c, kid.id, 2, () => 0.01);
  expect(good.household!.children[0].status).toBe('pro');
  expect(good.household!.children[0].wageFactor).toBeCloseTo(2, 1);
  const income = familyYear(good).income;
  expect(income).toBeGreaterThan(0);
  // Zweimal zu hoch gepokert: sauer, kein Geld
  let bad = negotiateKid(c, kid.id, 2, () => 0.99);
  expect(bad.household!.children[0].offer!.round).toBe(2);
  bad = negotiateKid(bad, kid.id, 2, () => 0.99);
  const angry = bad.household!.children[0];
  expect(angry.angry).toBe(true);
  expect(angry.status).toBe('pro');
  expect(familyYear(bad).income).toBe(0);
});

it('Ereignisse: entstehen im Jahr und lassen sich beantworten', () => {
  const c = base();
  c.household!.year = 12;
  c.household!.children[0].bornYear = 0;
  let found = false;
  for (let i = 0; i < 40 && !found; i++) {
    c.household!.children[0].bornYear = c.household!.year - 11; // bleibt im Ereignis-Alter
    familyYear(c);
    found = !!c.household!.kidEvent;
  }
  expect(found).toBe(true);
  const res = resolveKidEvent(c, 0);
  expect(res.career.household!.kidEvent).toBeNull();
  expect(res.career.household!.children[0].log[0]).toMatch(/:/);
});
