import { expect, it } from 'vitest';
import { freshClub } from '../club';
import {
  DUEL_RANGE, HILO_MAX_LEVEL, HILO_STEP, HILO_TALENTS, answerHilo, drawDuel, drawDuelNext, duelPool, hiloCard, hiloOf, judge, syncHiloCards, upgradeCost, upgradeHilo,
} from '../hilo';

it('Höher/Tiefer: Werte fest je Spieler, nächste Karte nah dran, Gleichstand ist eigenes Ergebnis', () => {
  expect(duelPool()[0].attrs).toEqual(duelPool()[0].attrs);
  for (let i = 0; i < 200; i++) {
    const cur = drawDuel();
    const next = drawDuelNext(cur);
    expect(Math.abs(next.p.ovr - cur.p.ovr)).toBeLessThanOrEqual(DUEL_RANGE);
    const up = judge(cur, next, 'higher');
    const down = judge(cur, next, 'lower');
    if (next.p.ovr === cur.p.ovr) expect([up, down]).toEqual(['tie', 'tie']);
    else expect([up, down].sort()).toEqual(['right', 'wrong']); // immer genau eine Seite richtig
  }
});

it('Serie: alle 10 Richtigen ein Punkt, Fehler setzt zurück, Gleichstand ändert nichts', () => {
  let c = freshClub();
  let points = 0;
  for (let i = 0; i < 25; i++) { const r = answerHilo(c, 'right'); c = r.club; if (r.point) points++; }
  expect(points).toBe(2);
  expect(hiloOf(c)).toMatchObject({ streak: 25, best: 25, points: 2 });
  c = answerHilo(c, 'tie').club;
  expect(hiloOf(c).streak).toBe(25);
  c = answerHilo(c, 'wrong').club;
  expect(hiloOf(c)).toMatchObject({ streak: 0, best: 25, points: 2 });
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
