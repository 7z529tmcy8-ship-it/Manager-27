import { describe, expect, it } from 'vitest';
import { type ManagerState, remapXI, BENCH_SIZE, FORMATIONS, avgRating, bestBench, fixBench, SQUAD_MIN, bestXI, buildSquad, buyPlayer, finishSeason, halfRound, leagueOfClub, newManager, playRound, sellPlayer, tablePos, teamRating, windowOpen } from '../manager';

describe('Manager-Modus', () => {
  it('Kader: echte Spieler plus Auffüllung, jede Position besetzt', () => {
    const s = buildSquad('fc-bayern-munchen');
    expect(s.some((p) => p.real && p.name.length > 0)).toBe(true);
    for (const pos of ['TW', 'IV', 'AV', 'ZDM', 'ZM', 'ZOM', 'FL', 'ST']) expect(s.some((p) => p.pos === pos)).toBe(true);
    const xi = bestXI(s, '4-3-3');
    expect(new Set(xi).size).toBe(11);
    expect(s.find((p) => p.id === xi[0])?.pos).toBe('TW');
  });

  it('Ganze Saison: 34 Spieltage, Tabelle stimmt, Fenster im Sommer und Winter', () => {
    // Ohne Kalender (alter Ablauf): Fenster vor dem 1. Spieltag und zur Halbzeit
    let m: ManagerState = { ...newManager('hannover-96'), cal: undefined };
    expect(m.rounds.length).toBe(34);
    expect(windowOpen(m)).toBe(true);
    m = playRound(m);
    expect(windowOpen(m)).toBe(false);
    while (m.round < halfRound(m)) m = playRound(m);
    expect(windowOpen(m)).toBe(true);
    while (!m.done) m = playRound(m);
    expect(m.rows.every((r) => r.played === 34)).toBe(true);
    expect(m.won + m.drawn + m.lost).toBe(34);
    const goals = m.squad.reduce((a, p) => a + p.goals, 0);
    const row = m.rows.find((r) => r.clubId === m.clubId)!;
    expect(goals).toBe(row.goalsFor);
    // Jedes Spiel: 11 Plätze × 90 Minuten, Bankspieler bekommen Einsätze
    expect(m.squad.reduce((a, p) => a + (p.mins ?? 0), 0)).toBe(34 * 990);
    expect(m.squad.some((p) => (p.subs ?? 0) > 0)).toBe(true);
    expect(m.squad.every((p) => p.apps === (p.starts ?? 0) + (p.subs ?? 0))).toBe(true);
    const assists = m.squad.reduce((a, p) => a + (p.assists ?? 0), 0);
    expect(assists).toBeLessThanOrEqual(goals);
    const ev = m.last!.mine!.events;
    const subs = ev.filter((e) => e.kind === 'sub');
    expect(subs.length).toBeGreaterThanOrEqual(3);
    // Wer eingewechselt wurde, wird nicht wieder ausgewechselt
    expect(subs.every((x) => !subs.some((y) => y.out === x.scorer))).toBe(true);
    const pos = tablePos(m);
    expect(m.squad.filter((p) => avgRating(p) > 0).every((p) => avgRating(p) >= 3.5 && avgRating(p) <= 10)).toBe(true);
    const { m: next, summary } = finishSeason(m);
    expect(summary.pos).toBe(pos);
    expect(next.season).toBe(2026);
    expect(next.round).toBe(0);
    expect(next.squad.length).toBeGreaterThanOrEqual(SQUAD_MIN);
    if (summary.move === 'up') expect(leagueOfClub(next, 'hannover-96')).toBe('bl1');
    expect(next.rows.length).toBe(18);
  });

  it('Kaufen kostet Budget, Verkaufen bringt Geld; Absage möglich', () => {
    let m = newManager('borussia-dortmund');
    m = { ...m, budget: 1e9 };
    const target = m.market[m.market.length - 1];
    const res = buyPlayer(m, target.id, 0);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.m.budget).toBe(1e9 - target.price);
    expect(res.m.squad.some((p) => p.name === target.name)).toBe(true);
    const no = buyPlayer(m, m.market[0].id, 0.999);
    expect(no.ok).toBe(false);
    const sold = sellPlayer(res.m, res.m.squad[0].id)!;
    expect(sold.budget).toBeGreaterThan(res.m.budget);
    expect(sold.xi.every((id) => sold.squad.some((p) => p.id === id))).toBe(true);
  });

  it('Bank: 7 Spieler, nicht in der Startelf, mit Torwart; nur Bankspieler werden eingewechselt', () => {
    let m = newManager('fc-bayern-munchen');
    expect(m.bench).toHaveLength(BENCH_SIZE);
    expect(m.bench!.some((id) => m.squad.find((p) => p.id === id)?.pos === 'TW')).toBe(true);
    expect(m.bench!.every((id) => !m.xi.includes(id))).toBe(true);
    const two = m.bench!.slice(0, 3);
    m = { ...m, bench: two };
    expect(fixBench(m)).toEqual(two);
    const allowed = new Set([...m.xi, ...two]);
    for (let i = 0; i < 5; i++) m = playRound(m);
    expect(m.squad.filter((p) => p.apps > 0).every((p) => allowed.has(p.id))).toBe(true);
    expect(bestBench(m.squad, m.xi)).toHaveLength(BENCH_SIZE);
  });

  it('Eigene Aufstellung und Bank bleiben über das Saisonende erhalten', () => {
    let m = newManager('borussia-dortmund');
    // Eigene Wahl: Elf mit vertauschten Plätzen, Bank mit nur 3 Spielern
    const xi = [...m.xi];
    [xi[6], xi[7]] = [xi[7], xi[6]];
    const bench = m.bench!.slice(0, 3);
    m = { ...m, xi, bench };
    while (!m.done) m = playRound(m);
    const { m: next } = finishSeason(m);
    const kept = new Set(next.squad.map((p) => p.id));
    xi.forEach((id, i) => { if (kept.has(id)) expect(next.xi[i]).toBe(id); });
    expect(next.bench).toEqual(bench.filter((id) => kept.has(id)));
    expect(new Set(next.xi).size).toBe(11);
  });

  it('Formationswechsel behält dieselben elf Spieler', () => {
    const m = newManager('fc-barcelona');
    const xi = remapXI(m.squad, m.xi, '3-5-2');
    expect(new Set(xi)).toEqual(new Set(m.xi));
  });

  it('Formationen haben 11 Plätze, Teamstärke passt grob zur Vereinsstärke', () => {
    for (const f of Object.values(FORMATIONS)) { expect(f.slots).toHaveLength(11); expect(f.xy).toHaveLength(11); }
    const m = newManager('real-madrid');
    expect(teamRating(m)).toBeGreaterThan(80);
  });
});
