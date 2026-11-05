import { describe, expect, it } from 'vitest';
import { buildCal, ensureCal, newManager, playRound, windowOpen, type ManagerState } from '../manager';
import { advance, dayKind, kickoff, matchToday, resolveEvent, rollEvent, stepDay } from '../managerDays';

describe('Manager-Kalender', () => {
  it('Spieltage liegen in Hin- und Rückrunde, nie in der Winterpause, alle verschieden', () => {
    for (const n of [34, 38, 30]) {
      const c = buildCal(2025, n);
      expect(c.roundDays).toHaveLength(n);
      expect(new Set(c.roundDays).size).toBe(n);
      expect([...c.roundDays].sort((a, b) => a - b)).toEqual(c.roundDays);
      expect(c.roundDays.every((d) => d < c.brk[0] || d > c.brk[1])).toBe(true);
      expect(c.roundDays[Math.floor(n / 2) - 1]).toBeLessThan(c.brk[0]);
      expect(c.roundDays[Math.floor(n / 2)]).toBeGreaterThan(c.brk[1]);
      expect(c.roundDays[n - 1]).toBeLessThan(c.len);
    }
  });

  it('Transferfenster nach Datum: August und Januar', () => {
    let m = newManager('sv-werder-bremen');
    expect(windowOpen(m)).toBe(true);
    m = { ...m, cal: { ...m.cal!, day: 31 } };
    expect(windowOpen(m)).toBe(false);
    m = { ...m, cal: { ...m.cal!, day: m.cal!.win[1][0] + 3 } };
    expect(windowOpen(m)).toBe(true);
    expect(dayKind({ ...m, cal: { ...m.cal!, day: 30 } })).toBe('deadline');
  });

  it('„Bis zum nächsten Spiel“ hält am Spieltag, Anpfiff spielt die Runde', () => {
    let m = newManager('sv-werder-bremen');
    for (let i = 0; i < 20 && !matchToday(m); i++) { m = advance(m, 'match'); if (m.event) m = resolveEvent(m, 'B').m; }
    expect(matchToday(m)).toBe(true);
    expect(dayKind(m)).toBe('match');
    expect(stepDay(m)).toBe(m); // blockiert bis zum Anpfiff
    const n = kickoff(m);
    expect(n.round).toBe(1);
    expect(n.feed?.[0].cat).toBe('spiel');
  });

  it('Ganze Saison per Kalender: alle Spiele, Ereignisse beantwortbar, Saisonende', () => {
    let m = newManager('hannover-96');
    let events = 0;
    for (let i = 0; i < 600 && !m.done; i++) {
      if (m.event) { events++; m = resolveEvent(m, (['A', 'B', 'C'] as const)[i % 3]).m; continue; }
      m = matchToday(m) ? kickoff(m) : advance(m, 'match');
    }
    expect(m.done).toBe(true);
    expect(m.rows.every((r) => r.played === m.rounds.length - 0 * 0 && r.played === 34)).toBe(true);
    expect(events).toBeGreaterThan(2);
    expect(m.squad.length).toBeGreaterThanOrEqual(15);
    expect(m.mood).toBeGreaterThanOrEqual(-3);
  });

  it('Schnellknopf bis Saisonende und Winterpause', () => {
    let m = newManager('fc-bayern-munchen');
    m = advance(m, 'winter');
    expect(m.round).toBe(17);
    expect(m.cal!.day).toBe(m.cal!.brk[0]);
    m = advance(m, 'end');
    expect(m.done).toBe(true);
  });

  it('Jedes Ereignis lässt sich mit A, B und C beantworten', () => {
    const base = newManager('borussia-dortmund');
    let found = 0;
    for (let i = 0; i < 300; i++) {
      const m: ManagerState = { ...base, round: 8, board: 30, budget: 1e9, cal: { ...base.cal!, day: (i % 2 ? 10 : 160) }, lastEventDay: undefined, feed: [{ d: 0, season: 2025, cat: 'spiel', title: 'Niederlage x' }, { d: 0, season: 2025, cat: 'spiel', title: 'Niederlage y' }] };
      const e = rollEvent(m, () => 0.01 + (i % 7) / 100);
      if (!e) continue;
      found++;
      for (const k of ['A', 'B', 'C'] as const) {
        const r = resolveEvent({ ...m, event: e }, k);
        expect(r.m.event).toBeNull();
        expect(typeof r.note).toBe('string');
      }
    }
    expect(found).toBeGreaterThan(10);
  });

  it('Alter Spielstand ohne Kalender bekommt einen passenden', () => {
    let m = newManager('sv-werder-bremen');
    for (let i = 0; i < 5; i++) m = playRound(m);
    const old = { ...m, cal: undefined };
    const n = ensureCal(old);
    expect(n.cal!.day).toBe(n.cal!.roundDays[4] + 1);
    expect(matchToday(n)).toBe(false);
  });
});
