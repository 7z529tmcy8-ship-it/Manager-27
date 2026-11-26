import { describe, expect, it } from 'vitest';
import { slugify } from '../../data/leagues';
import {
  type BossState, attendance, canPlay, closeSeason, decide, fireCoach, newBoss, payroll, plannedRevenue, playMonth, squadCostRatio,
  startBuild, sumIn, sumOut, takeLoan, tvMoney, upgradeNlz,
} from '../boss';

/** Standard-Spielweise: mittlerer Trainer, erstes Sponsorangebot, keine Transfers, Ereignisse ablehnen. */
function autoCards(b: BossState): BossState {
  let guard = 0;
  while (b.cards.length && guard++ < 20) {
    const c = b.cards[0];
    const act = c.kind === 'coach' ? 'coach:1' : c.kind === 'sponsor' ? (c.options.find((o) => o.act === 'skip') ? 'skip' : 'sponsor:0') : c.kind === 'license' ? 'nlz1' : c.options[c.options.length - 1].act;
    b = decide(b, c.id, act, 0.3).b;
  }
  return b;
}
function season(b: BossState): BossState {
  b = autoCards(b);
  let g = 0;
  while (!b.seasonOver && g++ < 12) { b = playMonth(b); b = autoCards(b); }
  return b;
}

describe('Vereinsboss', () => {
  it('Start: Gehälter ca. die Hälfte der Erlöse, Trainer- und Sponsorkarten liegen bereit', () => {
    const b = newBoss(slugify('FC Bayern München'));
    expect(payroll(b) / plannedRevenue(b)).toBeGreaterThan(0.45);
    expect(payroll(b) / plannedRevenue(b)).toBeLessThan(0.6);
    expect(b.cards.some((c) => c.kind === 'coach')).toBe(true);
    expect(b.cards.some((c) => c.id === 'sp-trikot')).toBe(true);
    expect(canPlay(b)).toBe(false);
    const tv = tvMoney(b);
    // Vier Säulen: gleich ist der größte Teil
    expect(tv.equal).toBeGreaterThan(tv.youth + tv.interest);
  });

  for (const club of ['FC Bayern München', 'FC St. Pauli', 'Hannover 96', 'Arsenal FC']) {
    it(`Ganze Saison mit Standard-Entscheidungen bleibt im Rahmen: ${club}`, () => {
      let b = newBoss(slugify(club));
      b = season(b);
      expect(b.seasonOver).toBe(true);
      expect(b.m.done).toBe(true);
      const rev = sumIn(b.ledger), cost = sumOut(b.ledger);
      // Kein absurder Gewinn oder Verlust bei normalem Spiel
      expect((rev - cost) / rev).toBeGreaterThan(-0.25);
      expect((rev - cost) / rev).toBeLessThan(0.3);
      expect(squadCostRatio(b)).toBeLessThan(0.8);
      const { b: n, end } = closeSeason(b);
      expect(n.month).toBe(0);
      expect(n.history.length).toBe(1);
      expect(end.revenue).toBeCloseTo(rev + end.sponsorBonus, -3);
      expect(n.m.season).toBe(b.m.season + 1);
    });
  }

  it('Teure Tickets: weniger Zuschauer, Kasse und Ledger passen zusammen', () => {
    let b = autoCards(newBoss(slugify('Hannover 96')));
    const low = attendance({ ...b, ticket: 'low' });
    const top = attendance({ ...b, ticket: 'top' });
    expect(top).toBeLessThan(low);
    const c0 = b.cash;
    b = { ...b, ledger: { in: {}, out: {} } };
    b = playMonth(b);
    expect(Math.round(b.cash - c0)).toBe(Math.round(sumIn(b.ledger) - sumOut(b.ledger)));
  });

  it('Kredit, NLZ-Ausbau, Stadionausbau, Trainer entlassen', () => {
    let b = autoCards(newBoss(slugify('Hannover 96')));
    b = { ...b, cash: 100e6 };
    const cash = b.cash;
    b = takeLoan(b, 5e6);
    expect(b.cash).toBe(cash + 5e6);
    const nlz = b.nlz;
    b = upgradeNlz(b);
    expect(b.nlz).toBe(nlz + 1);
    b = startBuild(b, 'seats');
    expect(b.build?.kind).toBe('seats');
    const cap = b.cap;
    for (let i = 0; i < 6; i++) b = autoCards(playMonth(b));
    expect(b.cap).toBe(cap + 5000);
    b = fireCoach(b);
    expect(b.coach).toBeNull();
    expect(canPlay(b)).toBe(false);
    b = autoCards(b);
    expect(b.coach).not.toBeNull();
  });

  it('NLZ bringt Eigengewächse, Investor in Deutschland höchstens 49 %', () => {
    let b = season(newBoss(slugify('Hannover 96')));
    b = { ...b, nlz: 5 };
    const { b: n, end } = closeSeason(b);
    expect(end.talents.length).toBe(3);
    expect(n.m.squad.filter((p) => p.own).length).toBe(3);
    expect(end.vote).not.toBeNull();
  });

  it('Pleite-Verein bekommt in Deutschland Punktabzug', () => {
    let b = season(newBoss(slugify('Hannover 96')));
    b = { ...b, cash: -1e9 };
    const { b: n, end } = closeSeason(b);
    expect(end.license).toBeTruthy();
    expect(n.penalty).toBe(9);
    let s = autoCards(n);
    s = playMonth(s);
    const row = s.m.rows.find((r) => r.clubId === s.m.clubId)!;
    expect(row.points).toBeLessThanOrEqual(row.won * 3 + row.drawn - 9);
  });
});
