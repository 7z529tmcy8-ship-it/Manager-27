import { expect, it } from 'vitest';
import { CARD_POOL, freshClub, type ClubState } from '../club';
import { autoSquad } from '../squad';
import {
  ELITE, LOWEST, PROMOTE_AT, applyDivisionResult, divisionOf, makeOpponent, playDivisionDuel, promoBonus, squadFit, tacticEdge, withOpponent,
} from '../divisions';

function club(): ClubState {
  const cards: Record<string, number> = {};
  for (const c of CARD_POOL) cards[c.id] = 1;
  const base = { ...freshClub(), cards };
  return { ...base, squad: autoSquad(base) };
}

it('Alte Duell-Stufe wird zur Division (Stufe 1 → Division 10, Stufe 10 → Division 1)', () => {
  expect(divisionOf({ duelLevel: 1 }).div).toBe(10);
  expect(divisionOf({ duelLevel: 10 }).div).toBe(1);
  expect(divisionOf({ duelLevel: 4 }).div).toBe(7);
});

it('Aufstieg bei 6 Punkten, Abstieg unter 0 – aber nicht aus Sicherheitsstufen', () => {
  let s = { div: 9, pts: 4, best: 9 };
  const up = applyDivisionResult(s, 'win');
  expect(up.move).toBe('up');
  expect(up.state.div).toBe(8);
  s = { div: 8, pts: 0, best: 8 };
  const down = applyDivisionResult(s, 'loss');
  expect(down.move).toBe('down');
  expect(down.state.div).toBe(9);
  expect(down.state.best).toBe(8);
  for (const safe of [10, 7, 4]) {
    const r = applyDivisionResult({ div: safe, pts: 0, best: safe }, 'loss');
    expect(r.move).toBeNull();
    expect(r.state.div).toBe(safe);
    expect(r.state.pts).toBe(0);
  }
  const elite = applyDivisionResult({ div: ELITE, pts: PROMOTE_AT - 1, best: ELITE }, 'win');
  expect(elite.state.div).toBe(ELITE);
  expect(elite.state.pts).toBe(PROMOTE_AT);
});

it('Taktik: Pressing > Ballbesitz > Konter > Pressing, Ausgewogen neutral', () => {
  expect(tacticEdge('pressing', 'ballbesitz')).toBeGreaterThan(0);
  expect(tacticEdge('ballbesitz', 'konter')).toBeGreaterThan(0);
  expect(tacticEdge('konter', 'pressing')).toBeGreaterThan(0);
  expect(tacticEdge('pressing', 'konter')).toBeLessThan(0);
  expect(tacticEdge('konter', 'konter')).toBe(0);
  expect(tacticEdge('ausgewogen', 'pressing')).toBe(0);
  const c = club();
  const cards = c.squad.map((id) => CARD_POOL.find((x) => x.id === id) ?? null);
  for (const t of ['pressing', 'konter', 'ballbesitz'] as const) expect(Math.abs(squadFit(t, cards))).toBeLessThanOrEqual(1.5);
});

it('Gegner bleibt gespeichert, bis gespielt wurde – Neuladen würfelt keinen neuen aus', () => {
  const c = withOpponent(club());
  const again = withOpponent(c);
  expect(again.division!.next).toEqual(c.division!.next);
  const played = playDivisionDuel(again, 'ausgewogen')!;
  expect(played.opponent).toEqual(c.division!.next);
  expect(played.club.division!.next).toBeDefined();
});

it('Scouting stimmt meistens, aber nicht immer', () => {
  let right = 0;
  let seed = 1;
  const rand = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  for (let i = 0; i < 2000; i++) { const o = makeOpponent(5, rand); if (o.hint === o.style) right++; }
  expect(right / 2000).toBeGreaterThan(0.68);
  expect(right / 2000).toBeLessThan(0.82);
});

it('Aufstiegsbonus gibt es nur beim ersten Erreichen einer Division', () => {
  // Starke Elf in Division 10, kurz vor dem Aufstieg: Sieg erzwingen über schwachen Gegner
  const base = club();
  const weak = { name: 'Testgegner', strength: 20, style: 'konter' as const, hint: 'konter' as const };
  let c: ClubState = { ...base, division: { div: LOWEST, pts: PROMOTE_AT - 2, best: LOWEST, next: weak } };
  let res = playDivisionDuel(c, 'ballbesitz')!;
  for (let i = 0; i < 20 && res.result.outcome !== 'win'; i++) res = playDivisionDuel(c, 'ballbesitz')!;
  expect(res.result.outcome).toBe('win');
  expect(res.move).toBe('up');
  expect(res.bonus).toBe(promoBonus(9));
  // Wieder absteigen und erneut aufsteigen: kein zweiter Bonus
  c = { ...res.club, division: { ...res.club.division!, div: LOWEST, pts: PROMOTE_AT - 2, next: weak } };
  let again = playDivisionDuel(c, 'ballbesitz')!;
  for (let i = 0; i < 20 && again.result.outcome !== 'win'; i++) again = playDivisionDuel(c, 'ballbesitz')!;
  expect(again.move).toBe('up');
  expect(again.bonus).toBe(0);
});

it('Ohne volle Elf kein Duell', () => {
  expect(playDivisionDuel({ ...club(), squad: Array(11).fill(null) }, 'pressing')).toBeNull();
});
