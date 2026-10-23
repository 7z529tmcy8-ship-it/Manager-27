import { expect, it } from 'vitest';
import { getClub } from '../../data/leagues';
import { CULT_LEGENDS, FAILED_TALENTS, ICON_LEGENDS, LEGENDS } from '../../data/legends';
import { EXTRA_ICONS } from '../../data/cards';
import { createCareer, playSeason } from '../career';

it('alle Ikonen sind im Karrieremodus spielbar und ihre Startvereine gibt es', () => {
  const iconNames = new Set(ICON_LEGENDS.map((l) => l.name));
  expect(EXTRA_ICONS.filter(([n]) => !iconNames.has(n)).map(([n]) => n)).toEqual([]);
  for (const l of [...ICON_LEGENDS, ...CULT_LEGENDS, ...LEGENDS, ...FAILED_TALENTS]) {
    expect(getClub(l.clubId)?.id, `${l.name}: ${l.clubId}`).toBe(l.clubId);
  }
  const names = [...ICON_LEGENDS, ...CULT_LEGENDS, ...LEGENDS].map((l) => l.name);
  expect(names.filter((n, i) => names.indexOf(n) !== i)).toEqual([]);
  // Eine Ikone spielt ohne Fehler eine Saison
  const c = playSeason(createCareer(ICON_LEGENDS[0]));
  expect(c.history.length).toBe(1);
});
