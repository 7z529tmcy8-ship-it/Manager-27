import { describe, expect, it } from 'vitest';
import { slugify } from '../../data/leagues';
import {
  type BossState, attendance, canPlay, closeSeason, coachCandidates, demand, fireCoach, forecast, hireCoach, loanMax, loanTerms, migrateBoss,
  newBoss, payoffAmount, payroll, plannedRevenue, playMonth, playUntil, priceRange, repayLoans, sellShares, setMarketing, setPrice,
  setTransferBudget, setWageBudget, signSponsor, squadCostRatio, startBuild, sumIn, sumOut, takeLoan, tasks, tvMoney, upgrade, wageCap, buildGain,
} from '../boss';

/** Standard-Start: mittlerer Trainer, beide Sponsoren für 2 Jahre. */
function ready(club: string): BossState {
  let b = newBoss(slugify(club));
  b = hireCoach(b, coachCandidates(b)[1], 2);
  b = signSponsor(b, 'trikot', 2, false);
  b = signSponsor(b, 'aermel', 2, false);
  return b;
}

describe('Vereinsboss (Regler)', () => {
  it('Start: keine Ereigniskarten, nur der Trainer ist Pflicht', () => {
    const b = newBoss(slugify('FC Bayern München'));
    expect(b.cards.length).toBe(0);
    expect(canPlay(b)).toBe(false);
    expect(tasks(b).filter((t) => t.must).map((t) => t.id)).toEqual(['coach']);
    expect(payroll(b) / plannedRevenue(b)).toBeGreaterThan(0.45);
    expect(payroll(b) / plannedRevenue(b)).toBeLessThan(0.65);
    const tv = tvMoney(b);
    expect(tv.equal).toBeGreaterThan(tv.youth + tv.interest);
    const r = ready('FC Bayern München');
    expect(canPlay(r)).toBe(true);
    expect(tasks(r).some((t) => t.id.startsWith('sp-'))).toBe(false);
  });

  for (const club of ['FC Bayern München', 'FC St. Pauli', 'Hannover 96', 'Arsenal FC', 'SV Meppen']) {
    it(`Ganze Saison mit Standard-Reglern bleibt im Rahmen: ${club}`, () => {
      let b = playUntil(ready(club), 'end');
      expect(b.seasonOver).toBe(true);
      expect(b.m.done).toBe(true);
      const rev = sumIn(b.ledger), cost = sumOut(b.ledger);
      // Ergebnis aus dem laufenden Geschäft (ohne Spielerverkäufe und Ablösen) im Rahmen
      const op = (rev - (b.ledger.in.transfer ?? 0)) - (cost - (b.ledger.out.buy ?? 0));
      expect(op / rev).toBeGreaterThan(-0.25);
      expect(op / rev).toBeLessThan(0.3);
      expect(squadCostRatio(b)).toBeLessThan(0.85);
      const { b: n, end } = closeSeason(b);
      expect(n.month).toBe(0);
      expect(n.history.length).toBe(1);
      expect(end.revenue).toBeCloseTo(rev, -3);
      expect(n.m.season).toBe(b.m.season + 1);
      expect(canPlay(n) || n.fired).toBe(true);
      // Zweite Saison läuft ebenfalls durch
      b = playUntil(n, 'end');
      expect(b.seasonOver || b.fired).toBe(true);
    });
  }

  it('Ticketpreis: bis zum Ligaschnitt wenig Wirkung, darüber deutlich weniger Zuschauer; Regler bleibt im Bereich', () => {
    const b = ready('Hannover 96');
    const [lo, hi] = priceRange(b);
    expect(setPrice(b, 9999).price).toBe(hi);
    expect(setPrice(b, 0).price).toBe(lo);
    const base = b.price;
    expect(demand(b, base * 2)).toBeLessThan(demand(b, base) * 0.5);
    expect(demand(b, base * 0.6)).toBeGreaterThan(demand(b, base));
    expect(attendance(b)).toBeLessThanOrEqual(b.cap);
  });

  it('Kasse und Buchungen passen zusammen, Prognose stimmt grob', () => {
    const b0 = ready('Hannover 96');
    const f = forecast(b0);
    let b = { ...b0 };
    const c0 = b.cash;
    b = playUntil(b, 'end');
    expect(Math.round(b.cash - c0)).toBe(Math.round(sumIn(b.ledger) - sumOut(b.ledger)));
    // Ohne Transfers liegt das Ergebnis in der Nähe der Prognose (Ergebnisse schwanken)
    const real = sumIn(b.ledger) - sumOut(b.ledger) - (b.ledger.in.transfer ?? 0) + (b.ledger.out.buy ?? 0);
    expect(Math.abs(real - f.profit)).toBeLessThan(sumIn(b.ledger) * 0.15);
  });

  it('Gehaltsbudget zu niedrig: Sportdirektor verkauft im Fenster, Transferbudget wird genutzt', () => {
    let b = ready('Hannover 96');
    b = setWageBudget(b, 0.35);
    const n0 = b.m.squad.length;
    b = playMonth(b);
    expect(b.m.squad.length).toBeLessThan(n0);
    expect(b.report?.transfers?.some((t) => t.startsWith('Verkauft'))).toBe(true);
    let c = ready('Hannover 96');
    c = setWageBudget(c, 0.85);
    c = { ...c, cash: 200e6 };
    c = setTransferBudget(c, 50e6);
    c = playMonth(c);
    expect(c.transferSpent).toBeGreaterThan(0);
    expect(c.transferSpent).toBeLessThanOrEqual(50e6);
    // Grenze gilt beim Kauf; danach verschieben Fans und Marke die geplanten Erlöse leicht
    expect(payroll(c)).toBeLessThanOrEqual(wageCap(c) * 1.06);
  });

  it('Marketing stärkt die Marke langfristig', () => {
    const a = playUntil(setMarketing(ready('Hannover 96'), 0.05), 'end');
    const z = playUntil(setMarketing(ready('Hannover 96'), 0), 'end');
    expect(a.brandX).toBeGreaterThan(1.05);
    expect(z.brandX).toBeLessThan(1);
  });

  it('Projekte: NLZ, Trainingszentrum, Stadion mit Bauzeit, VIP', () => {
    let b = { ...ready('Hannover 96'), cash: 300e6 };
    const nlz = b.nlz, tr = b.train;
    b = upgrade(b, 'nlz'); b = upgrade(b, 'train');
    expect(b.nlz).toBe(nlz + 1); expect(b.train).toBe(tr + 1);
    expect(buildGain(b, 'vip')).toBeGreaterThan(0);
    b = startBuild(b, 'seats', 8000);
    expect(b.build?.seats).toBe(8000);
    const cap = b.cap, months = b.build!.monthsLeft;
    expect(startBuild(b, 'vip')).toBe(b);
    for (let i = 0; i < months; i++) b = playMonth(b);
    expect(b.cap).toBe(cap + 8000);
    expect(b.build).toBeNull();
  });

  it('Kredit: Zinsen steigen mit Laufzeit, Rückzahlung ohne künftige Zinsen', () => {
    let b = ready('Hannover 96');
    const max = loanMax(b);
    expect(loanTerms(b, max / 2, 6).rate).toBeGreaterThan(loanTerms(b, max / 2, 2).rate);
    const cash = b.cash;
    b = takeLoan(b, max * 2, 3);
    expect(b.cash).toBe(cash + max);
    b = playMonth(b);
    const pay = payoffAmount(b);
    expect(pay).toBeLessThan(b.loans[0].left);
    b = { ...b, cash: pay + 1e6 };
    b = repayLoans(b);
    expect(b.loans.length).toBe(0);
  });

  it('Investor: Deutschland höchstens 49 %, einmal pro Saison, bekommt Gewinnanteil', () => {
    let b = ready('Hannover 96');
    b = sellShares(b, 80);
    expect(b.investor?.share).toBe(49);
    expect(sellShares(b, 10)).toBe(b);
    b = playUntil(b, 'end');
    const { end } = closeSeason(b);
    const pre = end.revenue - end.costs + end.dividend;
    if (pre > 0) expect(end.dividend).toBeGreaterThan(0);
  });

  it('Trainer entlassen blockiert, bis ein neuer kommt', () => {
    let b = ready('Hannover 96');
    b = fireCoach(b);
    expect(canPlay(b)).toBe(false);
    b = hireCoach(b, coachCandidates(b)[2], 3);
    expect(b.coach?.years).toBe(3);
    expect(canPlay(b)).toBe(true);
  });

  it('NLZ bringt Eigengewächse; Pleite gibt in Deutschland Punktabzug', () => {
    let b = playUntil(ready('Hannover 96'), 'end');
    b = { ...b, nlz: 5, cash: -1e9, trust: 100 };
    const { b: n, end } = closeSeason(b);
    expect(end.talents.length).toBe(3);
    expect(end.license).toBeTruthy();
    expect(n.penalty).toBe(9);
    const s = playMonth(n);
    const row = s.m.rows.find((r) => r.clubId === s.m.clubId)!;
    expect(row.points).toBeLessThanOrEqual(row.won * 3 + row.drawn - 9);
  });

  it('Alter Spielstand mit Ereigniskarten wird übernommen', () => {
    const old = { ...newBoss(slugify('Hannover 96')), rv: undefined, ticket: 'high', cards: [{ id: 'x' }], sponsors: [{ slot: 'trikot', name: 'X', perYear: 1e6, years: 2, bonus: 0.1, kind: 'wette' }] } as unknown as BossState;
    const n = migrateBoss(old);
    expect(n.rv).toBe(2);
    expect(n.cards.length).toBe(0);
    expect(n.price).toBeGreaterThan(0);
    expect(n.sponsors[0].bet).toBe(true);
  });
});

describe('Vereinsboss Details', () => {
  it('Trainer haben echte Namen und sind beim Neuladen gleich', () => {
    for (const club of ['FC Schalke 04', 'FC Bayern München', 'SV Meppen', 'Arsenal FC']) {
      const b = newBoss(slugify(club));
      const c = coachCandidates(b);
      for (const x of c) expect(x.name).not.toMatch(/undefined/);
      expect(coachCandidates(b).map((x) => x.name)).toEqual(c.map((x) => x.name));
    }
  });
  it('Start: Gehälter liegen im Budget, auch mit Sponsorverträgen', () => {
    for (const club of ['FC Schalke 04', 'FC Bayern München', 'SV Meppen', 'Arsenal FC', 'Hannover 96']) {
      const b = ready(club);
      expect(payroll(b)).toBeLessThan(wageCap(b));
    }
  });
});
