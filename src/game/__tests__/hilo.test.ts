import { expect, it } from 'vitest';
import { freshClub } from '../club';
import {
  DUEL_RANGE, HILO_MAX_LEVEL, HILO_STEP, HILO_TALENTS, answerHilo, drawDuel, drawDuelNext, duelPool, hiloCard, hiloOf, judge, syncHiloCards, upgradeCost, upgradeHilo,
} from '../hilo';

it('Höher/Tiefer: Karten aus dem ganzen Spiel, Werte fest je Karte, nächste Karte nah dran, Gleichstand ist eigenes Ergebnis', () => {
  expect(duelPool()[0].attrs).toEqual(duelPool()[0].attrs);
  const variants = new Set(duelPool().map((d) => d.card.variant));
  ['icon', 'silver', 'gold', 'moment'].forEach((v) => expect(variants.has(v as never)).toBe(true));
  expect(variants.size).toBeGreaterThan(8);
  for (let i = 0; i < 200; i++) {
    const cur = drawDuel();
    const next = drawDuelNext(cur);
    expect(Math.abs(next.card.ovr - cur.card.ovr)).toBeLessThanOrEqual(DUEL_RANGE);
    const up = judge(cur, next, 'higher');
    const down = judge(cur, next, 'lower');
    if (next.card.ovr === cur.card.ovr) expect([up, down]).toEqual(['tie', 'tie']);
    else expect([up, down].sort()).toEqual(['right', 'wrong']); // immer genau eine Seite richtig
  }
});

it('Serie: alle 5 Richtigen ein Punkt, Fehler setzt zurück, Gleichstand ändert nichts', () => {
  let c = freshClub();
  let points = 0;
  for (let i = 0; i < 25; i++) { const r = answerHilo(c, 'right'); c = r.club; if (r.point) points++; }
  expect(points).toBe(5);
  expect(hiloOf(c)).toMatchObject({ streak: 25, best: 25, points: 5 });
  c = answerHilo(c, 'tie').club;
  expect(hiloOf(c).streak).toBe(25);
  c = answerHilo(c, 'wrong').club;
  expect(hiloOf(c)).toMatchObject({ streak: 0, best: 25, points: 5 });
});

it('Talente: drei junge Spieler um 70, Upgrades kosten 1, 2, 3 … Punkte und geben +3', () => {
  HILO_TALENTS.forEach((n) => { const card = hiloCard(n, 0); expect(card.ovr).toBeGreaterThanOrEqual(68); expect(card.ovr).toBeLessThanOrEqual(72); expect(card.variant).toBe('serie'); });
  expect([1, 2, 3].map((l) => upgradeCost(l - 1))).toEqual([1, 2, 3]);
  const name = HILO_TALENTS[0];
  let c = syncHiloCards({ ...freshClub(), hilo: { points: 3, streak: 0, best: 0, levels: {} } });
  expect(c.specials.filter((s) => s.variant === 'serie')).toHaveLength(3);
  c = upgradeHilo(c, name)!;
  expect(hiloOf(c).points).toBe(2);
  c = upgradeHilo(c, name)!;
  expect(hiloOf(c).points).toBe(0);
  expect(upgradeHilo(c, name)).toBeNull(); // 3. Upgrade kostet 3
  const card = c.specials.find((s) => s.name === name && s.variant === 'serie')!;
  expect(card.ovr).toBe(hiloCard(name, 0).ovr + 2 * HILO_STEP);
  // Maximalstufe
  const maxed = { ...c, hilo: { ...hiloOf(c), points: 999, levels: { [name]: HILO_MAX_LEVEL } } };
  expect(upgradeHilo(maxed, name)).toBeNull();
});

it('Höher/Tiefer: viele Kartenarten kommen dran, nicht nur Silber und Gold', () => {
  let cur = drawDuel();
  const seen = new Set<string>();
  for (let i = 0; i < 60; i++) { cur = drawDuelNext(cur); seen.add(cur.card.variant); }
  expect(seen.size).toBeGreaterThanOrEqual(6);
});

it('MADFUT-Stil: jede Runde ein Wert, Torhüter nur mit Gesamtwertung, Wertung nach genau diesem Wert', async () => {
  const { pickStat, statValue, STAT_NAMES } = await import('../hilo');
  const stats = new Set<string>();
  for (let i = 0; i < 400; i++) {
    const cur = drawDuel();
    const next = drawDuelNext(cur);
    const s = pickStat(cur, next);
    stats.add(String(s));
    if (cur.card.position === 'TW' || next.card.position === 'TW') expect(s).toBe('ovr');
    const a = statValue(cur, s);
    const b = statValue(next, s);
    expect(judge(cur, next, 'higher', s)).toBe(a === b ? 'tie' : b > a ? 'right' : 'wrong');
  }
  expect(stats.size).toBe(STAT_NAMES.length + 1);
});
