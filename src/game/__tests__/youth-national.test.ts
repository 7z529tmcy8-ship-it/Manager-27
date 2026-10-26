import { expect, it } from 'vitest';
import { slugify } from '../../data/leagues';
import { createCareer } from '../career';
import { applyChoice, seasonChoices, simulateToBreak } from '../simple';
import { isNationalTitle, youthTeamFor } from '../season';

it('U-Mannschaft nach Alter und Stärke: Talente spielen schon in einer älteren U-Mannschaft', () => {
  // Deutschland: A-Elf ab 81
  expect(youthTeamFor(16, 66, 81)).toBe('U17');
  expect(youthTeamFor(16, 69, 81)).toBe('U19');
  expect(youthTeamFor(17, 73, 81)).toBe('U21');
  expect(youthTeamFor(19, 70, 81)).toBe('U19');
  expect(youthTeamFor(22, 80, 81)).toBeNull(); // zu alt
  expect(youthTeamFor(18, 60, 81)).toBeNull(); // zu schwach
  expect(isNationalTitle('U21-EM 2027')).toBe(true);
});

it('Junger Spieler: U-Einsätze werden gezählt, beim ersten Mal kommt eine Nachricht', () => {
  let found = false;
  for (let run = 0; run < 6 && !found; run++) {
    let c = createCareer({ name: 'Talent', nation: 'Deutschland', position: 'ST', age: 17, ovr: 72, potential: 90, clubId: slugify('Borussia Dortmund') });
    for (let s = 0; s < 3; s++) {
      c = simulateToBreak(simulateToBreak(c));
      if (c.phase === 'retired') break;
      c = applyChoice(c, seasonChoices(c)[0]);
    }
    const youth = c.history.filter((r) => r.youth);
    if (!youth.length) continue;
    found = true;
    const total = Object.values(c.player.youthCaps ?? {}).reduce((a, b) => a + (b ?? 0), 0);
    expect(total).toBe(youth.reduce((a, r) => a + r.youth!.caps, 0));
    // Altersgrenze eingehalten
    for (const r of youth) expect(r.age).toBeLessThanOrEqual(Number(r.youth!.team.slice(1)));
    const msgs = (c.inbox ?? []).filter((m) => m.kind === 'national');
    expect(msgs.length).toBeGreaterThan(0);
    // Nur eine Nachricht pro Mannschaft
    expect(new Set(msgs.map((m) => m.title)).size).toBe(msgs.length);
    expect(c.player.nominated).toEqual(expect.arrayContaining([youth[0].youth!.team]));
  }
  expect(found).toBe(true);
});
