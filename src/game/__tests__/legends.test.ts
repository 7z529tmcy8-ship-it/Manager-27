import { expect, it } from 'vitest';
import { LEGENDS } from '../../data/legends';
import { slugify } from '../../data/leagues';
import { createCareer, playSeason, stayAtClub } from '../career';
import { resolveDecision } from '../decisions';

it('Balotelli: Charakter-Ereignisse und Rote Karten tauchen auf', () => {
  const balo = LEGENDS.find((l) => l.name === 'Mario Balotelli')!;
  const titles = new Set<string>();
  let redCards = 0;
  for (let run = 0; run < 8; run++) {
    // Bei einem Verein, wo er spielt – Rote Karten gibt es nur auf dem Platz.
    let c = createCareer({ ...balo, clubId: slugify('Hellas Verona') });
    for (let i = 0; i < 5; i++) {
      c = playSeason(c);
      const s = c.history[c.history.length - 1];
      (s.events ?? []).forEach((e) => titles.add(e.title));
      redCards += s.notes.filter((n) => n.startsWith('Rote Karte')).length;
      if (c.decision) c = resolveDecision(c, c.decision.options[0].id);
      if (c.phase !== 'window') break;
      c = c.player.contract.yearsLeft > 0 ? stayAtClub(c) : c;
      if (c.phase !== 'season') break;
    }
  }
  expect(redCards).toBeGreaterThan(0);
  expect([...titles].some((t) => ['Feuerwerk im Badezimmer', '„Warum immer ich?“', 'Leibchen-Chaos', 'Ausraster im Training', 'Tor des Monats', 'Spendabel'].includes(t))).toBe(true);
});
