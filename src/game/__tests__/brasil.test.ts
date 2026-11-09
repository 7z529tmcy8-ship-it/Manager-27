import { expect, it } from 'vitest';
import { CLUBS, getLeague } from '../../data/leagues';
import { REAL_PLAYERS } from '../../data/players';

it('Brasileirão mit 20 Vereinen, Floyd Samba bei Manchester City', () => {
  expect(getLeague('bra').name).toBe('Brasileirão Série A');
  expect(CLUBS.filter((c) => c.leagueId === 'bra')).toHaveLength(20);
  const samba = REAL_PLAYERS.find((p) => p.name === 'Floyd Samba')!;
  expect(samba.clubId).toBe('manchester-city');
  for (const n of ['Pedro', 'Vitor Roque', 'Lucas Paquetá']) {
    const p = REAL_PLAYERS.find((x) => x.name === n)!;
    expect(CLUBS.find((c) => c.id === p.clubId)?.leagueId).toBe('bra');
  }
});
