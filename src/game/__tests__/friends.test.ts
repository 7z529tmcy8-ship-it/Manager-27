import { expect, it } from 'vitest';
import { freshClub } from '../club';
import { devAllCards } from '../dev';
import { FRIEND_REWARD, exportTeam, importTeam, playFriendDuel } from '../friends';
import { autoSquad } from '../squad';

it('Freunde-Duell: Code hin und zurück, Prüfsumme, Belohnung nur einmal', () => {
  const base = devAllCards(freshClub());
  const club = { ...base, squad: autoSquad(base) };
  expect(exportTeam({ ...club, squad: Array(11).fill(null) }, 'X')).toBeNull();
  const code = exportTeam(club, 'Ayris Allstars ⚽')!;
  const team = importTeam(code);
  if (typeof team === 'string') throw new Error(team);
  expect(team.name).toBe('Ayris Allstars ⚽');
  expect(team.players).toHaveLength(11);
  expect(typeof importTeam(code.slice(0, -2) + 'zz')).toBe('string'); // verändert
  expect(typeof importTeam('hallo')).toBe('string');
  // Gegen ein viel schwächeres Team gewinnt man fast immer – Coins nur beim ersten Sieg.
  const weak = { ...team, strength: 40 };
  let c = club;
  let paid = 0;
  for (let i = 0; i < 20; i++) {
    const res = playFriendDuel(c, weak)!;
    paid += res.result.coins;
    c = res.club;
  }
  expect(paid).toBe(FRIEND_REWARD);
});
