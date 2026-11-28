import { describe, expect, it } from 'vitest';
import { slugify } from '../../data/leagues';
import { createCareer } from '../career';
import { simulateSeasons } from '../autosim';
import { careerBook, devRows, gameSeasons, gameStats, gamesOf, packGames, peerCompare, schoolGrade, unpack } from '../stats';
import { deepCompact } from '../storage';

const base = () => createCareer({ name: 'Stat Test', nation: 'Deutschland', position: 'ST', age: 21, ovr: 76, potential: 86, clubId: slugify('Hamburger SV') });

describe('Statistik pro Spiel', () => {
  it('Jedes Spiel wird gespeichert, Summen passen zur Saison', () => {
    const c = simulateSeasons(base(), 1, 1, false).career;
    const r = c.history[0];
    expect(r.games?.length).toBeGreaterThan(30);
    const st = gameStats(gamesOf(c, r.season));
    expect(st.played).toBe(r.apps);
    expect(st.goals).toBe(r.goals);
    expect(st.assists).toBe(r.assists);
    expect(st.home.apps + st.away.apps).toBe(st.played);
    expect(st.buckets.reduce((a, b) => a + b.n, 0)).toBeLessThanOrEqual(st.played);
    expect(st.wins + st.draws + st.losses).toBe(st.games);
    expect(gameSeasons(c).some((s) => s.id === r.season)).toBe(true);
  });

  it('Packen und Entpacken verlieren nichts', () => {
    const line = { competition: 'Pokal' as const, opponent: 'X', home: false, goalsFor: 3, goalsAgainst: 1, status: 'sub' as const, minutes: 25, goals: 1, assists: 1, rating: 7.4, clubId: 'y', half: 1 as const };
    const g = unpack(packGames([line])[0]);
    expect(g).toMatchObject({ comp: 'Pokal', opp: 'X', home: false, gf: 3, ga: 1, status: 'sub', min: 25, goals: 1, assists: 1, rating: 7.4 });
  });

  it('Schulnote: gute Spiele = kleine Note, immer 1–6', () => {
    expect(schoolGrade(9.5)).toBe(1);
    expect(schoolGrade(3)).toBe(6);
    expect(schoolGrade(7.5)).toBeLessThan(schoolGrade(6.5));
  });
});

describe('Entwicklung und Rekordbuch', () => {
  it('Attribute und Potenzial je Saison, Rekorde aus Saisons und Spielen', () => {
    const c = simulateSeasons(base(), 3, 1, false).career;
    const rows = devRows(c);
    expect(rows.length).toBe(c.history.length);
    expect(rows.every((r) => r.attrs?.length === 6 && r.pot !== null)).toBe(true);
    const book = careerBook(c);
    expect(book.some((b) => b.label === 'Höchste Wertung')).toBe(true);
    expect(book.some((b) => b.label === 'Beste Spielnote')).toBe(true);
    const peers = peerCompare(c);
    if (peers) expect(peers.rank).toBeGreaterThanOrEqual(1);
  });

  it('Notfall-Verkleinerung behält die Spiele der letzten drei Saisons', () => {
    const c = simulateSeasons(base(), 5, 1, false).career;
    const small = deepCompact(c, true);
    const withGames = small.history.filter((r) => r.games?.length).length;
    expect(withGames).toBeLessThanOrEqual(3);
    expect(small.history[small.history.length - 1].games?.length).toBeGreaterThan(0);
  });
});
