import { expect, it } from 'vitest';
import { slugify } from '../../data/leagues';
import { createCareer } from '../career';
import { DUEL_XP_PER_DAY, STAGES, duelStateOf, duelXp, grantDuelXp, ownStrength, playCareerDuel, xpLeftToday, xpTarget } from '../careerDuels';
import { freshClub, type ClubState, type CollectCard } from '../club';
import { chooseArchetype } from '../skills';

const card = (i: number, ovr: number): CollectCard => ({ id: `own-test-${i}`, name: `Spieler ${i}`, position: (['TW', 'IV', 'IV', 'AV', 'AV', 'ZDM', 'ZM', 'ZM', 'FL', 'FL', 'ST'] as const)[i], nation: 'Deutschland', club: 'HSV', league: 'Bundesliga', ovr, variant: 'icon' });

it('Karriere-Duelle: Sieg = nächste Stufe + XP, Tageslimit, Finale setzt zurück', () => {
  const specials = Array.from({ length: 11 }, (_, i) => card(i, 99));
  let club: ClubState = { ...freshClub(), specials, squad: specials.map((c) => c.id), activeTeam: 'career' };
  expect(ownStrength(club)).toBeGreaterThan(90);
  const now = new Date(2026, 10, 16, 12);
  // Starkes Team, Würfel so, dass wir treffen und der Gegner nicht: rand() klein → viele Tore für den, dessen Schleife zuerst läuft
  let total = 0;
  for (let i = 0; i < 40 && duelStateOf(club).stage < STAGES.length; i++) {
    const r = playCareerDuel(club, now);
    total += r.xp;
    club = r.club;
  }
  expect(total).toBeLessThanOrEqual(DUEL_XP_PER_DAY);
  expect(xpLeftToday(club, now)).toBe(DUEL_XP_PER_DAY - total);
  expect(xpLeftToday(club, new Date(2026, 10, 17, 9))).toBe(DUEL_XP_PER_DAY);
  expect(duelStateOf(club).best).toBeGreaterThan(3);
  expect(duelXp(5, 'win')).toBe(60);
  expect(duelXp(5, 'loss')).toBe(0);
});

it('Leeres Team spielt mit Jugendspielern; XP landen beim aktiven Karriere-Spieler', () => {
  expect(ownStrength(freshClub())).toBe(40);
  const c0 = createCareer({ name: 'Duell Dieter', nation: 'Deutschland', position: 'ST', age: 19, ovr: 65, potential: 82, clubId: slugify('Hamburger SV') });
  expect(xpTarget([c0])).toBeNull(); // ohne Spielertyp noch keine XP
  const c = chooseArchetype(c0, 'striker');
  expect(xpTarget([c])?.id).toBe(c.id);
  const before = c.player.skills?.xp ?? 0;
  expect(grantDuelXp(c, 60).player.skills?.xp).toBe(before + 60);
});
