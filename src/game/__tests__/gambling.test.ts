import { expect, it } from 'vitest';
import { slugify } from '../../data/leagues';
import { createCareer } from '../career';
import { afterGamble, doBroke, HORSES, isBroke, PEN_CHANCE, PEN_MULT, playHorses, playRoulette, raceLegs, rouletteInfo, rouletteWins, shootPenalty, WHEEL } from '../gambling';
import { simulateToBreak } from '../simple';

it('Roulette und Pferde: Auszahlung stimmt, die Bank gewinnt auf Dauer', () => {
  expect(playRoulette('green', 1000, () => 0).payout).toBe(36_000); // Zahl 0
  expect(playRoulette('red', 1000, () => 0).win).toBe(false);
  let net = 0;
  for (let i = 0; i < 20000; i++) net += playRoulette('red', 100).payout - 100;
  expect(net).toBeLessThan(0);
  net = 0;
  for (let i = 0; i < 20000; i++) net += playHorses(i % HORSES.length, 100).payout - 100;
  expect(net).toBeLessThan(0);
});

it('Verborgene Spielsucht: Geld verschwindet in jeder Pause; Pleite → Trash-TV', () => {
  const c = createCareer({ name: 'G', nation: 'Deutschland', position: 'ST', age: 24, ovr: 78, potential: 82, clubId: slugify('Hannover 96') });
  const lose = playRoulette('green', 50_000, () => 0.5);
  const hooked = afterGamble(c, 50_000, lose, 60_000, () => 0); // Risiko greift
  expect(hooked.player.gambler).toBe(true);
  expect(hooked.squandered).toBe(50_000);
  expect(simulateToBreak(hooked).drainPending).toBe(1);
  const retired = { ...hooked, phase: 'retired' as const };
  expect(isBroke(retired, 100)).toBe(true);
  expect(isBroke(retired, 50_000)).toBe(false);
  const tv = doBroke(retired, 'boxing', 100, () => 0.1);
  expect(tv.coins).toBe(80_000);
  expect(doBroke(tv.career, 'boxing', 100).coins).toBe(0); // nur einmal
});

it('Roulette: Kessel hat jede Zahl genau einmal, Wetten zahlen richtig und die Bank gewinnt', () => {
  expect([...WHEEL].sort((a, b) => a - b)).toEqual(Array.from({ length: 37 }, (_, i) => i));
  expect(rouletteWins('d2', 13)).toBe(true);
  expect(rouletteWins('d2', 25)).toBe(false);
  expect(rouletteWins('low', 0)).toBe(false);
  expect(rouletteWins('n17', 17)).toBe(true);
  expect(rouletteInfo('n17').payout).toBe(36);
  // Erwartungswert jeder Wette unter 1 (Null gehört der Bank)
  for (const b of ['red', 'odd', 'high', 'd3', 'n5'] as const) {
    const i = rouletteInfo(b);
    expect(i.payout * i.chance).toBeLessThan(1);
    let hits = 0;
    for (let n = 0; n <= 36; n++) if (rouletteWins(b, n)) hits++;
    expect(hits / 37).toBeCloseTo(i.chance, 5);
  }
});

it('Pferderennen: Animation endet in der gezogenen Reihenfolge', () => {
  const res = playHorses(2, 1000, () => 0.3);
  const legs = raceLegs(res.order!);
  const finish = legs.map((l) => l[3]);
  const byFinish = finish.map((_, i) => i).sort((a, b) => finish[b] - finish[a]);
  expect(byFinish).toEqual(res.order);
});

it('Elfmeter-Serie: Trefferchance 64 %, jede Stufe ist auf Dauer ein Verlust', () => {
  let goals = 0;
  for (let i = 0; i < 20000; i++) if (shootPenalty((i % 3) as 0 | 1 | 2).goal) goals++;
  expect(goals / 20000).toBeGreaterThan(0.6);
  expect(goals / 20000).toBeLessThan(0.68);
  PEN_MULT.forEach((m, k) => expect(PEN_CHANCE ** (k + 1) * m).toBeLessThan(1));
  // Torwart in derselben Ecke hält immer
  expect(shootPenalty(0, () => 0).goal).toBe(false);
});

it('Sololauf: Grätsche-Verteilung ehrlich (P(≥×2) ≈ 48 %), Bank gewinnt bei jeder Ausstiegsstufe', async () => {
  const { soloCrash, soloChance, soloMult, soloTimeFor } = await import('../gambling');
  let reach2 = 0;
  const N = 40000;
  for (let i = 0; i < N; i++) if (soloCrash() >= 2) reach2++;
  expect(reach2 / N).toBeGreaterThan(0.46);
  expect(reach2 / N).toBeLessThan(0.5);
  for (const m of [1.2, 2, 5, 20]) expect(soloChance(m) * m).toBeLessThanOrEqual(0.96 + 1e-9);
  expect(soloMult(0)).toBe(1);
  expect(soloMult(soloTimeFor(2) + 1)).toBeGreaterThanOrEqual(2);
});

it('Kartenduell: Werte fest je Spieler, Chance aus den Hinweisen, Bank gewinnt auch bei klügstem Tipp', async () => {
  const { drawDuel, drawDuelNext, duelChance, duelHints, duelMult, duelPool, DUEL_RANGE } = await import('../gambling');
  const pool = duelPool();
  expect(pool[0].attrs).toEqual(duelPool()[0].attrs);
  // Simulation: immer die bessere Seite tippen – auf Dauer trotzdem Verlust
  let ev = 0;
  const N = 6000;
  for (let i = 0; i < N; i++) {
    const cur = drawDuel();
    const next = drawDuelNext(cur);
    expect(Math.abs(next.p.ovr - cur.p.ovr)).toBeLessThanOrEqual(DUEL_RANGE);
    const hints = duelHints();
    const up = duelChance(cur, next, hints, 'higher');
    const down = duelChance(cur, next, hints, 'lower');
    const dir = up >= down ? 'higher' : 'lower';
    const win = dir === 'higher' ? next.p.ovr > cur.p.ovr : next.p.ovr < cur.p.ovr;
    if (win) ev += duelMult(dir === 'higher' ? up : down);
  }
  expect(ev / N).toBeLessThan(1);
  expect(ev / N).toBeGreaterThan(0.7);
  // Spannend statt eindeutig: im Schnitt liegt die bessere Seite deutlich unter 90 %
  let sum = 0;
  for (let i = 0; i < 2000; i++) {
    const cur = drawDuel();
    const next = drawDuelNext(cur);
    const h = duelHints();
    sum += Math.max(duelChance(cur, next, h, 'higher'), duelChance(cur, next, h, 'lower'));
  }
  expect(sum / 2000).toBeLessThan(0.9);
});
