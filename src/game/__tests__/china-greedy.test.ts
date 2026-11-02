import { expect, it } from 'vitest';
import { CLUBS, getLeague, slugify } from '../../data/leagues';
import { CARD_POOL } from '../club';
import { createCareer } from '../career';
import { greediestOffer, seasonChoices } from '../simple';
import type { Offer } from '../types';

it('Chinese Super League: 16 Vereine, exotische Liga', () => {
  expect(getLeague('csl').name).toBe('Chinese Super League');
  expect(getLeague('csl').exotic).toBe(true);
  expect(CLUBS.filter((c) => c.leagueId === 'csl')).toHaveLength(16);
  expect(CLUBS.find((c) => c.id === slugify('Shanghai Port'))?.leagueId).toBe('csl');
});

it('Hulk und Paulinho als Kult-Helden mit ihren China-Vereinen', () => {
  const hulk = CARD_POOL.find((c) => c.name === 'Hulk' && c.variant === 'cult');
  const pau = CARD_POOL.find((c) => c.name === 'Paulinho' && c.variant === 'cult');
  expect(hulk?.club).toBe('Shanghai SIPG');
  expect(pau?.club).toBe('Guangzhou Evergrande');
});

it('Geldgier: am Saisonende nur das Angebot mit dem höchsten Gehalt', () => {
  const c = createCareer({ name: 'Gier', nation: 'Deutschland', position: 'ST', age: 24, ovr: 78, potential: 84, clubId: slugify('Borussia Dortmund'), traits: ['greedy'] });
  const mk = (id: string, clubId: string, wage: number, type: Offer['type'] = 'Transfer'): Offer => ({ id, type, clubId, role: 'Stammspieler', wage, years: 3, fee: 0, message: '' });
  const rich = mk('b', slugify('Al-Hilal'), 900_000);
  const offers = [mk('a', slugify('FC Bayern München'), 200_000), rich, mk('c', slugify('Borussia Dortmund'), 150_000, 'Verlängerung')];
  expect(greediestOffer(offers)).toBe(rich);
  const choices = seasonChoices({ ...c, phase: 'window', offers });
  expect(choices).toHaveLength(1);
  expect(choices[0].offer).toBe(rich);
  expect(choices[0].greedy).toBe(true);
  // Ohne Geldgier: normale Auswahl
  const normal = seasonChoices({ ...c, player: { ...c.player, traits: [] }, phase: 'window', offers });
  expect(normal.length).toBeGreaterThan(1);
});

it('Hulk und Paulinho sind im Karriere-Reiter „Kult“ spielbar', async () => {
  const { CULT_LEGENDS } = await import('../../data/legends');
  const { getClub } = await import('../../data/leagues');
  for (const name of ['Hulk', 'Paulinho']) {
    const l = CULT_LEGENDS.find((x) => x.name === name);
    expect(l, name).toBeTruthy();
    expect(getClub(l!.clubId).name).toBeTruthy();
    expect(l!.traits).toContain('greedy');
    const c = createCareer({ name: l!.name, nation: l!.nation, position: l!.position, age: l!.age, ovr: l!.ovr, potential: l!.potential, clubId: l!.clubId, traits: l!.traits });
    expect(c.player.name).toBe(name);
  }
});

it('Akademie-Talente: mindestens 10 Spieler mit 15/16 und Wertung unter 60 – als Karte und in der Karriere', async () => {
  const { REAL_PLAYERS } = await import('../../data/players');
  const { getClub } = await import('../../data/leagues');
  const kids = REAL_PLAYERS.filter((p) => p.age <= 16 && p.ovr < 60);
  expect(kids.length).toBeGreaterThanOrEqual(10);
  for (const k of kids) {
    expect(getClub(k.clubId).name, k.name).toBeTruthy();
    expect(CARD_POOL.some((c) => c.name === k.name && c.ovr === k.ovr), k.name).toBe(true);
    const c = createCareer({ name: k.name, nation: k.nation, position: k.position, age: k.age, ovr: k.ovr, potential: k.potential, clubId: k.clubId });
    expect(c.player.age).toBe(k.age);
  }
});

it('Neue Kult-Helden (Memphis & Co.): Karte und Karriere', async () => {
  const { CULT_LEGENDS } = await import('../../data/legends');
  const { getClub } = await import('../../data/leagues');
  const names = ['Memphis Depay', 'Paul Pogba', 'Jesse Lingard', 'Hakim Ziyech', 'Samir Nasri', 'Philippe Coutinho', 'Willian', 'Douglas Costa', 'Emmanuel Adebayor', 'Anthony Martial', 'Jadon Sancho', 'James Rodríguez', 'Lorenzo Insigne'];
  for (const n of names) {
    expect(CARD_POOL.some((c) => c.name === n && c.variant === 'cult'), n).toBe(true);
    const l = CULT_LEGENDS.find((x) => x.name === n)!;
    expect(l, n).toBeTruthy();
    expect(getClub(l.clubId).name, n).toBeTruthy();
  }
});
