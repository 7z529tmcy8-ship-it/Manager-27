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

it('Freundesliste: speichern, Team aktualisieren, eigenen Code erkennen, Verlauf', async () => {
  const { saveFriend, record, withOwnerId } = await import('../friends');
  const mk = () => { const b = devAllCards(freshClub()); return withOwnerId({ ...b, squad: autoSquad(b) }); };
  const me = mk();
  const friend = mk();
  const t1 = importTeam(exportTeam(friend, 'Kumpel FC')!);
  if (typeof t1 === 'string') throw new Error(t1);
  expect(t1.owner).toBe(friend.ownerId);
  expect(saveFriend(me, importTeam(exportTeam(me, 'Ich')!) as never).status).toBe('self');
  let r = saveFriend(me, t1);
  expect(r.status).toBe('new');
  // Freund schickt später ein neues Team (anderer Name) – gleicher Eintrag wird aktualisiert.
  const t2 = importTeam(exportTeam(friend, 'Kumpel FC 2.0')!) as typeof t1;
  r = saveFriend(r.club, t2);
  expect(r.status).toBe('updated');
  expect(r.club.friends).toHaveLength(1);
  expect(r.club.friends![0].team.name).toBe('Kumpel FC 2.0');
  // Ergebnisse landen im Verlauf
  let c = r.club;
  for (let i = 0; i < 3; i++) c = playFriendDuel(c, t2)!.club;
  expect(record(c.friends![0]).played).toBe(3);
});
