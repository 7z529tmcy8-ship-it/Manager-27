import { expect, it } from 'vitest';
import { slugify } from '../../data/leagues';
import { contractClausesSeasonEnd } from '../clauses';
import { acceptOffer, createCareer, playSeason } from '../career';
import { MAX_ROUNDS, demandFrom, negotiable, negotiate } from '../negotiation';
import { generateOffers } from '../offers';
import { cashOf } from '../player';
import type { Career, SeasonRecord } from '../types';

const windowCareer = (): Career => {
  for (let i = 0; i < 40; i++) {
    const c = playSeason(createCareer({ name: 'Verhandler', nation: 'Deutschland', position: 'ST', age: 24, ovr: 76, potential: 82, clubId: slugify('1. FC Köln') }));
    if (c.phase === 'window' && c.offers.some((o) => o.type === 'Transfer')) return c;
  }
  throw new Error('kein Transferangebot');
};

it('Bescheidene Forderung: Einigung, Werte werden übernommen', () => {
  const c = windowCareer();
  const o = c.offers.find((x) => x.type === 'Transfer')!;
  expect(negotiable(o)).toBe(true);
  const r = negotiate(c, o.id, { ...demandFrom(o), wage: o.wage, years: 3 });
  expect(r.kind).toBe('agreed');
  const now = r.career.offers.find((x) => x.id === o.id)!;
  expect(now.talkState).toBe('agreed');
  expect(now.years).toBe(3);
  expect(negotiable(now)).toBe(false);
});

it('Überzogene Forderung: Gegenangebot oder Abbruch – immer gleich bei gleicher Eingabe', () => {
  const c = windowCareer();
  const o = c.offers.find((x) => x.type === 'Transfer')!;
  const greedy = { ...demandFrom(o), wage: o.wage * 1.8, role: 'Schlüsselspieler' as const, starterGuarantee: true, goalBonus: 10_000 };
  const a = negotiate(c, o.id, greedy);
  const b = negotiate(c, o.id, greedy);
  expect(a.kind).toBe(b.kind);
  expect(['counter', 'walked', 'final']).toContain(a.kind);
  if (a.kind === 'walked') expect(a.career.offers.some((x) => x.id === o.id)).toBe(false);
  if (a.kind === 'counter') {
    const counter = a.career.offers.find((x) => x.id === o.id)!;
    expect(counter.wage).toBeGreaterThanOrEqual(o.wage);
    expect(counter.wage).toBeLessThan(greedy.wage);
  }
});

it('Nach drei Runden ist Schluss: letztes Angebot', () => {
  for (let k = 0; k < 20; k++) {
    let c = windowCareer();
    const o = c.offers.find((x) => x.type === 'Transfer')!;
    let last = '';
    for (let round = 0; round < MAX_ROUNDS; round++) {
      const cur = c.offers.find((x) => x.id === o.id);
      if (!cur || !negotiable(cur)) break;
      const r = negotiate(c, o.id, { ...demandFrom(cur), wage: Math.round(cur.wage * 1.35) });
      c = r.career;
      last = r.kind;
    }
    if (last === 'final') {
      const fin = c.offers.find((x) => x.id === o.id)!;
      expect(fin.talks).toBe(MAX_ROUNDS);
      expect(negotiable(fin)).toBe(false);
      expect(negotiate(c, o.id, demandFrom(fin)).career).toBe(c);
      return;
    }
  }
});

it('Klauseln: werden unterschrieben, Torprämie zahlt aus, gebrochene Einsatzgarantie macht ablösefrei', () => {
  const c = windowCareer();
  const o = c.offers.find((x) => x.type === 'Transfer')!;
  const signed = acceptOffer(c, { ...o, clauses: { goalBonus: 5_000, starterGuarantee: true, releaseClause: 50_000_000 } });
  expect(signed.player.contract.clauses?.goalBonus).toBe(5_000);
  const rec = { goals: 10, minutes: 500, possibleMinutes: 3000, onLoan: false, notes: [], season: '2026/27' } as unknown as SeasonRecord;
  const before = cashOf(signed);
  contractClausesSeasonEnd(signed, rec);
  expect(cashOf(signed)).toBe(before + 50_000);
  expect(signed.player.contract.yearsLeft).toBe(0);
  expect(rec.notes.some((n) => n.includes('Einsatzgarantie'))).toBe(true);
});

it('Ausstiegsklausel: stärkere Vereine ziehen sie', () => {
  const c = windowCareer();
  c.player.contract = { ...c.player.contract, yearsLeft: 3, clauses: { releaseClause: 1_000_000 } };
  let triggered = 0;
  for (let i = 0; i < 40; i++) if (generateOffers(c, undefined).some((o) => o.fee === 1_000_000 && o.message.includes('Ausstiegsklausel'))) triggered++;
  expect(triggered).toBeGreaterThan(10);
});
