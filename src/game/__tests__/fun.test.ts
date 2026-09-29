import { afterEach, expect, it, vi } from 'vitest';
import { slugify } from '../../data/leagues';
import { createCareer, playNextStage, playSeason, stayAtClub } from '../career';
import { resolveDecision } from '../decisions';
import { buyLottoTicket, canBuyTicket, clubPrice, invest } from '../owner';
import { clubStrength } from '../player';
import { pressConference } from '../press';
import type { Career } from '../types';

const base = () =>
  createCareer({ name: 'Präsi', nation: 'Deutschland', position: 'ST', age: 24, ovr: 74, potential: 80, clubId: slugify('SC Freiburg') });

afterEach(() => vi.restoreAllMocks());

const toWindow = (c: Career) => {
  let w = playSeason(c);
  if (w.decision) w = resolveDecision(w, w.decision.options[0].id);
  return w;
};

it('Lotto-Jackpot: Verein kaufen, investieren, Präsident verlängert sich selbst', () => {
  let c = toWindow(base());
  expect(canBuyTicket(c)).toBe(true);
  vi.spyOn(Math, 'random').mockReturnValue(0.001);
  c = buyLottoTicket(c);
  vi.restoreAllMocks();
  expect(c.decision?.id).toBe('lotto');
  const clubId = c.player.contract.clubId;
  const price = clubPrice(c, clubId);
  c = resolveDecision(c, 'buy');
  expect(c.owner?.clubId).toBe(clubId);
  expect(c.owner!.budget).toBeGreaterThan(0);
  expect(canBuyTicket(c)).toBe(false);
  expect(price).toBeGreaterThan(1e6);

  const before = clubStrength(c, clubId);
  c = invest(c, 'stars');
  expect(clubStrength(c, clubId)).toBe(before + 2);

  // Mehrere Saisons: Vertrag läuft als Präsident nie aus, Rolle bleibt Schlüsselspieler.
  for (let i = 0; i < 4; i++) {
    c = stayAtClub(c);
    expect(c.player.contract.role).toBe('Schlüsselspieler');
    c = toWindow(c);
    if (c.phase === 'retired') break;
    expect(c.player.contract.yearsLeft).toBeGreaterThan(0);
  }
});

it('Niete: nur ein Schein pro Sommer', () => {
  let c = toWindow(base());
  vi.spyOn(Math, 'random').mockReturnValue(0.99);
  c = buyLottoTicket(c);
  vi.restoreAllMocks();
  expect(c.owner ?? null).toBeNull();
  expect(c.decisionResult?.title).toContain('Niete');
  expect(canBuyTicket(c)).toBe(false);
});

it('Pressekonferenz: jede Antwort funktioniert und zählt mit', () => {
  let c = playNextStage(base());
  if (c.decision) c = resolveDecision(c, c.decision.options[0].id);
  for (let i = 0; i < 40; i++) {
    const q = pressConference(c);
    expect(q).not.toBeNull();
    for (const o of q!.options) {
      const r = resolveDecision({ ...c, decision: q }, o.id);
      expect(r.decision).toBeNull();
      expect(r.decisionResult?.title).toBeTruthy();
      expect(r.pressCount).toBe((c.pressCount ?? 0) + 1);
    }
  }
});

it('Gescheiterte Talente: zweite Chance, verletzungsanfällige Spieler fallen öfter aus', async () => {
  const { FAILED_TALENTS } = await import('../../data/legends');
  const { injuryFactor } = await import('../training');
  const pato = FAILED_TALENTS.find((l) => l.name === 'Alexandre Pato')!;
  const c = createCareer({ ...pato, secondChance: true });
  expect(c.secondChance).toBe(true);
  expect(c.player.traits).toContain('fragile');
  expect(injuryFactor(c.player)).toBeGreaterThan(1.5);
  const done = playSeason(c);
  expect(done.history).toHaveLength(1);
});
