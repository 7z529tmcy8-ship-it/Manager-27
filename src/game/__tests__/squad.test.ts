import { expect, it } from 'vitest';
import { CARD_POOL, freshClub, type ClubState } from '../club';
import { FORMATION, TASKS, autoSquad, cardAttrs, cardById, chemistry, completeTask, opponent, playDuel, taskPick, teamRating } from '../squad';

/** Club mit allen Karten einmal, ausgewählten doppelt. */
function richClub(): ClubState {
  const cards: Record<string, number> = {};
  for (const c of CARD_POOL) cards[c.id] = 1;
  for (const c of CARD_POOL.filter((x) => x.variant === 'gold').slice(0, 6)) cards[c.id] = 3;
  return { ...freshClub(), cards };
}

it('Auto-Aufstellung füllt alle 11 Plätze mit passenden Positionen', () => {
  const club = richClub();
  const squad = autoSquad(club);
  expect(squad.filter(Boolean)).toHaveLength(11);
  expect(new Set(squad).size).toBe(11);
  squad.forEach((id, i) => expect(cardById(club, id)!.position).toBe(FORMATION[i].pos));
  const cards = squad.map((id) => cardById(club, id));
  expect(teamRating(cards)).toBeGreaterThan(80);
  const chem = chemistry(cards);
  expect(chem.total).toBeGreaterThanOrEqual(0);
  expect(chem.total).toBeLessThanOrEqual(33);
});

it('Chemie: gleiche Nation/Liga gibt Punkte, falsche Position nichts', () => {
  const ger = CARD_POOL.filter((c) => c.nation === 'Deutschland' && c.variant !== 'icon' && c.variant !== 'talent');
  const st = ger.find((c) => c.position === 'ST')!;
  const cards = FORMATION.map(() => null as (typeof st) | null);
  cards[9] = st;
  ger.filter((c) => c !== st).slice(0, 4).forEach((c, k) => (cards[k + 1] = c));
  expect(chemistry(cards).per[9]).toBeGreaterThanOrEqual(2);
  const wrong = [...cards];
  wrong[0] = st; // Stürmer im Tor
  expect(chemistry(wrong).per[0]).toBe(0);
});

it('Duelle: nur mit vollem Team, Siege schalten Stufen frei, Coins werden gutgeschrieben', () => {
  let club = richClub();
  expect(playDuel(club, 1)).toBeNull();
  club = { ...club, squad: autoSquad(club) };
  let wins = 0;
  // Gegner starten bei 90 – genug Duelle spielen, damit der Zufall den Test nicht kippt.
  for (let i = 0; i < 120; i++) {
    const res = playDuel(club, club.duelLevel)!;
    if (res.result.outcome === 'win') {
      wins++;
      expect(res.club.coins).toBe(club.coins + opponent(club.duelLevel).reward);
    }
    club = res.club;
  }
  expect(wins).toBeGreaterThan(5);
  expect(club.duelLevel).toBeGreaterThan(1);
  expect(playDuel(club, club.duelLevel + 1)).toBeNull();
});

it('Tauschaufgaben verbrauchen die richtigen Karten und schonen die Aufstellung', () => {
  let club = richClub();
  club = { ...club, squad: autoSquad(club) };
  for (const t of TASKS) {
    const pick = taskPick(club, t);
    expect(pick, t.id).not.toBeNull();
    const res = completeTask(club, t)!;
    // Aufgestellte Karten bleiben im Besitz
    for (const id of res.club.squad) if (id) expect(res.club.cards[id] ?? 0).toBeGreaterThan(0);
    expect(res.club.tasksDone[t.id]).toBe(1);
    club = res.club;
  }
  expect(completeTask({ ...freshClub() }, TASKS[0])).toBeNull();
});

it('Kartenwerte sind stabil und plausibel', () => {
  const c = CARD_POOL[0];
  expect(cardAttrs(c)).toEqual(cardAttrs(c));
  expect(cardAttrs(c)).toHaveLength(6);
  for (const v of cardAttrs(c)) expect(v).toBeGreaterThanOrEqual(25);
});

it('Duell-Saison: Punkte pro Monat, Rang, Belohnung erst im nächsten Monat und nur einmal', async () => {
  const { claimSeason, duelPoints, seasonId, seasonRank, unclaimedSeasons } = await import('../squad');
  expect(duelPoints(5, 'win')).toBe(50);
  expect(duelPoints(5, 'draw')).toBe(15);
  expect(duelPoints(5, 'loss')).toBe(0);
  expect(seasonId(new Date(2026, 9, 11))).toBe('2026-10');
  expect(seasonRank(320).name).toBe('Gold');
  const club = { ...freshClub(), duelSeasons: { '2026-10': 320 } };
  expect(unclaimedSeasons(club, new Date(2026, 9, 20))).toHaveLength(0);
  const nov = new Date(2026, 10, 2);
  expect(unclaimedSeasons(club, nov)).toHaveLength(1);
  const paid = claimSeason(club, '2026-10', nov);
  expect(paid.coins).toBe(club.coins + 6000);
  expect(claimSeason(paid, '2026-10', nov).coins).toBe(paid.coins);
});
