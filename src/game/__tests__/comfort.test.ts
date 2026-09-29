import { expect, it } from 'vitest';
import { slugify } from '../../data/leagues';
import { canStay, createCareer, holiday, playNextStage, playSeason, stayAtClub } from '../career';
import { resolveDecision } from '../decisions';
import { adjustGrowth, setCareerSettings } from '../difficulty';
import { markAllRead, markRead, unreadCount } from '../inbox';

const base = () => createCareer({ name: 'Urlauber', nation: 'Deutschland', position: 'ZM', age: 23, ovr: 72, potential: 80, clubId: slugify('SC Freiburg') });

it('Postfach: Willkommen, Saisonziele, Saisonbilanz; gelesen markieren', () => {
  let c = base();
  expect(c.inbox?.map((m) => m.kind)).toEqual(['goals', 'welcome']);
  c = playSeason(c);
  const kinds = new Set(c.inbox!.map((m) => m.kind));
  expect(kinds.has('season')).toBe(true);
  expect(unreadCount(c)).toBeGreaterThan(0);
  const first = c.inbox![0];
  c = markRead(c, first.id);
  expect(c.inbox!.find((m) => m.id === first.id)!.read).toBe(true);
  c = markAllRead(c);
  expect(c.inbox!.every((m) => m.read)).toBe(true);
});

it('Entscheidungen landen mit Ergebnis im Postfach', () => {
  let c = base();
  for (let i = 0; i < 12 && !c.decision; i++) {
    c = c.phase === 'season' ? playNextStage(c) : stayAtClub(c);
  }
  if (!c.decision) return; // sehr unwahrscheinlich
  const before = c.inbox!.length;
  c = resolveDecision(c, c.decision.options[0].id);
  expect(c.inbox!.length).toBe(before + 1);
});

it('Urlaubsmodus: spielt mehrere Saisons und hält mit Grund an', () => {
  const c = holiday(base(), 3);
  expect(c.history.length).toBeGreaterThanOrEqual(1);
  expect(c.history.length).toBeLessThanOrEqual(3);
  expect(c.decisionResult?.title).toContain('Urlaub');
  expect(c.inbox!.some((m) => m.kind === 'holiday')).toBe(true);
  if (c.history.length < 3 && c.phase === 'window') {
    // Früher angehalten: Vertrag aus oder Top-Angebot
    expect(c.decisionResult!.text).toMatch(/Vertrag|Top-Angebot/);
  }
  const toEnd = holiday(base(), 'contract');
  expect(toEnd.phase === 'retired' || !canStay(toEnd) || /Top-Angebot/.test(toEnd.decisionResult!.text)).toBe(true);
});

it('Schwierigkeit: leicht gibt manchmal einen Punkt extra, schwer nimmt einen – nie über das Potenzial', () => {
  const easy = setCareerSettings(base(), { difficulty: 'easy' });
  const hard = setCareerSettings(base(), { difficulty: 'hard' });
  let extra = 0;
  let less = 0;
  for (let i = 0; i < 400; i++) {
    const e = adjustGrowth(easy, 70, 72, 80);
    const h = adjustGrowth(hard, 70, 72, 80);
    if (e === 73) extra++;
    if (h === 71) less++;
    expect(adjustGrowth(easy, 70, 72, 72)).toBe(72);
    expect(adjustGrowth(easy, 70, 69, 80)).toBe(69);
  }
  expect(extra).toBeGreaterThan(80);
  expect(less).toBeGreaterThan(80);
});
