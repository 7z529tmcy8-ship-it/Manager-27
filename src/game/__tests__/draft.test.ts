import { expect, it } from 'vitest';
import { freshClub } from '../club';
import { DRAFT_FEE, captainOptions, claimDraft, draftMatch, draftOptions, draftReward, slotFor, startDraft } from '../draft';
import { FORMATION, fit } from '../squad';

it('Draft: 5 passende Karten je Position, keine Namen doppelt, Kapitän 84–89', () => {
  const caps = captainOptions();
  expect(caps).toHaveLength(5);
  caps.forEach((c) => { expect(c.ovr).toBeGreaterThanOrEqual(84); expect(c.ovr).toBeLessThanOrEqual(89); });
  const slots: (ReturnType<typeof captainOptions>[number] | null)[] = Array(11).fill(null);
  slots[slotFor(caps[0], slots)] = caps[0];
  FORMATION.forEach((s, i) => {
    if (slots[i]) return;
    const opts = draftOptions(s.pos, slots.filter(Boolean).map((c) => c!.name));
    expect(opts).toHaveLength(5);
    opts.forEach((c) => expect(fit(c, s.pos)).toBe('ok'));
    expect(new Set(opts.map((c) => c.name)).size).toBe(5);
    slots[i] = opts[0];
  });
  expect(new Set(slots.map((c) => c!.name)).size).toBe(11);
});

it('Draft: starkes Team gewinnt meist, schwaches verliert meist; kein Unentschieden', () => {
  const strong = FORMATION.map((s) => draftOptions(s.pos, [])[0]);
  let wins = 0;
  for (let i = 0; i < 300; i++) {
    const r = draftMatch(strong, 0);
    expect(r.outcome).not.toBe('draw');
    if (r.outcome === 'win') wins++;
  }
  expect(wins).toBeGreaterThan(150);
});

it('Draft: Startgeld, Belohnung je Siege, Trophäen +10 pro Sieg', () => {
  expect(startDraft({ ...freshClub(), coins: DRAFT_FEE - 1 })).toBeNull();
  const c = startDraft({ ...freshClub(), coins: DRAFT_FEE })!;
  expect(c.coins).toBe(0);
  expect(draftReward(0).coins).toBe(3_000);
  const champ = claimDraft(c, 4);
  expect(champ.megaDrops).toBe(1);
  expect(champ.storedPacks?.length).toBe(1);
  expect(champ.trophies).toBe(40);
});

it('Draft: oft auch schwache Karten im Angebot, Topkarten selten', () => {
  const all = Array.from({ length: 300 }, () => draftOptions('ZM', [])).flat();
  const avg = all.reduce((a, c) => a + c.ovr, 0) / all.length;
  expect(avg).toBeLessThan(79);
  expect(all.filter((c) => c.ovr <= 71).length / all.length).toBeGreaterThan(0.2);
  expect(all.filter((c) => c.ovr >= 89).length / all.length).toBeLessThan(0.06);
});
