import { expect, it } from 'vitest';
import { CLUBS, getClub } from '../../data/leagues';
import { REAL_PLAYERS } from '../../data/players';
import { playSeason, stayAtClub } from '../career';
import { creditCareer, freshClub } from '../club';
import { SCENARIOS, SCENARIO_REWARD, createScenarioCareer } from '../scenario';
import { currentClubId } from '../player';

const pick = (id: string) => REAL_PLAYERS.find((p) => SCENARIOS.find((s) => s.id === id)!.eligible(p))!;

it('Szenarien: Start verändert die Lage passend', () => {
  const comeback = createScenarioCareer(pick('comeback'), 'comeback');
  expect(comeback.player.carryInjuryWeeks).toBe(20); // greift mit dem ersten Spieltag

  const loanP = pick('loan');
  const loan = createScenarioCareer(loanP, 'loan');
  expect(loan.player.loan).not.toBeNull();
  expect(getClub(loan.player.loan!.clubId).strength).toBeLessThan(getClub(loanP.clubId).strength);

  const rel = createScenarioCareer(pick('relegation'), 'relegation');
  const lid = getClub(rel.player.contract.clubId).leagueId;
  const weakest = Math.min(...CLUBS.filter((c) => c.leagueId === lid).map((c) => c.strength));
  expect(getClub(currentClubId(rel.player)).strength).toBe(weakest);

  const last = createScenarioCareer(pick('lastchance'), 'lastchance');
  expect(last.player.contract.yearsLeft).toBe(1);
  expect(last.player.contract.role).toBe('Ergänzung');
  expect(last.scenario?.id).toBe('lastchance');
});

it('Szenario: nach der ersten Saison bewertet, Belohnung nur einmal', () => {
  let c = createScenarioCareer(pick('hype'), 'hype');
  c.decision = null;
  c = playSeason(c);
  expect(['won', 'lost']).toContain(c.scenario?.result);
  // Erzwingen: geschafft → Belohnung
  c = { ...c, scenario: { id: 'hype', result: 'won' } };
  const res = creditCareer(freshClub(), c);
  expect(res.mega).toBeGreaterThanOrEqual(SCENARIO_REWARD.mega);
  expect(res.gained).toBeGreaterThanOrEqual(SCENARIO_REWARD.coins);
  const again = creditCareer(res.club, c);
  expect(again.gained).toBe(0);
  // Zweite Saison ändert das Ergebnis nicht mehr
  if (c.phase === 'window') c = stayAtClub(c);
  c.decision = null;
  const next = playSeason(c);
  expect(next.scenario?.result).toBe('won');
}, 30000);
