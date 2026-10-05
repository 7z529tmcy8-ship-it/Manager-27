import { expect, it } from 'vitest';
import { slugify } from '../../data/leagues';
import { createCareer, retire } from '../career';
import { creditCareer, freshClub } from '../club';
import { RULES, childAge, maybeFlirt, ovrAt18, resolveFlirt, ruleOption, setRule, yearlyCost } from '../family';
import { closeYear, restYear } from '../household';
import { buyProperty, buyShares, sellShares, sharePrice } from '../invest';
import { simulateToBreak } from '../simple';
import type { Career } from '../types';

const base = (age = 25) => createCareer({ name: 'Papa', nation: 'Deutschland', position: 'ST', age, ovr: 80, potential: 84, clubId: slugify('Hannover 96') });
const always = () => 0;

/** Vater mit einem Kind (Einladung angenommen, Kind kommt sicher). */
function withChild(c: Career = base()): Career {
  const h = { year: 0, children: [], pending: [], properties: [], shares: [], totalIncome: 0, flirt: { text: 'Party' } };
  return resolveFlirt({ ...c, household: h }, true, () => 0.3); // 0.3: kein Paparazzi (≥ 0.15), aber Baby (< 0.45)
}

it('Einladung erst ab 22, Kind entsteht mit Pop-up', () => {
  const young = base(20);
  maybeFlirt(young, always);
  expect(young.household?.flirt).toBeFalsy();
  const c = base();
  maybeFlirt(c, always);
  expect(c.household?.flirt?.text).toBeTruthy();
  const kid = withChild();
  expect(kid.household!.children).toHaveLength(1);
  expect(kid.household!.birth?.childId).toBe(kid.household!.children[0].id);
  const no = resolveFlirt({ ...base(), household: { ...kid.household!, children: [], pending: [], flirt: { text: 'x' } } }, false);
  expect(no.household!.children).toHaveLength(0);
  // Nur einmal pro Karriere: nach Annahme oder Ablehnung keine weitere Einladung.
  maybeFlirt(no, always);
  expect(no.household!.flirt).toBeFalsy();
  const again = structuredClone(kid);
  again.household!.birth = null;
  maybeFlirt(again, always);
  expect(again.household!.flirt).toBeFalsy();
});

it('Erziehungsregeln: einmal einstellen, wirken jedes Jahr, kosten jährlich, Altersgrenzen', () => {
  let c = withChild();
  const kid = () => c.household!.children[0];
  const club = RULES.find((r) => r.id === 'club')!;
  expect(ruleOption(kid(), club).id).toBe('none'); // Standard
  c = setRule(c, kid().id, 'club', 'academy');
  expect(ruleOption(kid(), club).id).toBe('academy');
  expect(setRule(c, kid().id, 'club', 'boarding')).toBe(c); // Internat erst ab 12
  // Alter 6: Verein wirkt jedes Jahr, ohne dass man etwas tun muss.
  kid().bornYear = c.household!.year - 6;
  expect(yearlyCost(c.household!, kid())).toBeGreaterThanOrEqual(500);
  const tech = kid().stats.technique;
  closeYear(c);
  closeYear(c);
  expect(kid().stats.technique).toBeGreaterThan(tech + 6);
  expect(c.household!.report!.kidCosts).toBeGreaterThanOrEqual(500);
  expect(c.household!.pending).toHaveLength(0); // keine Pflicht-Entscheidungen mehr
  // Kosten werden mit dem Club verrechnet.
  const paid = creditCareer({ ...freshClub(), coins: 10_000 }, c);
  expect(paid.club.coins).toBeLessThan(10_000);
});

it('Jahreswechsel: Kind altert; Profi verdient Coins, die im Club landen', () => {
  let c = withChild();
  c = simulateToBreak(simulateToBreak(c)); // eine Saison
  const h = c.household!;
  expect(h.year).toBe(1);
  expect(childAge(h, h.children[0])).toBe(1);
  // Kind künstlich auf 17 setzen und stark machen → wird Profi und verdient.
  const kid = h.children[0];
  kid.bornYear = h.year - 17;
  kid.talent = 85;
  kid.stats = { fitness: 90, technique: 90, discipline: 90, school: 50, social: 50, happiness: 70 };
  closeYear(c);
  expect(kid.status).toBe('pro');
  closeYear(c);
  expect(c.household!.totalIncome).toBeGreaterThan(0);
  const club = creditCareer(freshClub(), c);
  expect(club.club.coins).toBeGreaterThan(freshClub().coins);
});

it('Erziehung macht den Unterschied: gut erzogen ≈ Profi, vernachlässigt ≈ Amateur', () => {
  const kid = (stats: number, happiness = 60) => ({ talent: 65, stats: { fitness: stats, technique: stats, discipline: stats, school: 50, social: 50, happiness } } as never);
  expect(ovrAt18(kid(85))).toBeGreaterThanOrEqual(65);
  expect(ovrAt18(kid(20, 20))).toBeLessThan(56);
});

it('Ruhestand: ein Jahr vergehen lassen; Investitionen kaufen, Dividenden, verkaufen', () => {
  let c = retire(withChild());
  c = restYear(c);
  expect(c.household!.year).toBe(1);
  const flat = buyProperty(c, 'flat', 20_000);
  expect(flat.delta).toBe(-12_000);
  expect(buyProperty(flat.career, 'flat', 99_999).delta).toBe(0); // nur einmal
  const club = slugify('Hannover 96');
  const sh = buyShares(flat.career, club, 5, 1_000_000);
  expect(sh.delta).toBe(-5 * sharePrice(c, club));
  expect(buyShares(sh.career, club, 60, 10_000_000).career.household!.shares[0].percent).toBe(49); // max 49 %
  const after = restYear(sh.career);
  expect(after.household!.report!.rent).toBeGreaterThan(0);
  expect(after.household!.report!.dividends).toBeGreaterThan(0);
  const sold = sellShares(after, club, 5);
  expect(sold.delta).toBeGreaterThan(0);
  expect(sold.career.household!.shares).toHaveLength(0);
});

it('Jede Regel hat einen gültigen Standard, Options-IDs sind eindeutig', () => {
  for (const r of RULES) {
    expect(r.options.some((o) => o.id === r.default)).toBe(true);
    expect(new Set(r.options.map((o) => o.id)).size).toBe(r.options.length);
  }
});
