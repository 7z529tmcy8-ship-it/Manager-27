import { describe, expect, it } from 'vitest';
import { MAX_LEVEL, SIZE_INFO, makeLevel, outcome, send, step } from '../conquest';

describe('Revierkampf', () => {
  it('Level: feste Karte, du und Gegner in Ecken, alle Stadien im Feld', () => {
    for (const lv of [1, 5, 12, MAX_LEVEL]) {
      const a = makeLevel(lv), b = makeLevel(lv);
      expect(a.nodes).toEqual(b.nodes);
      expect(a.nodes.filter((n) => n.owner === 0).length).toBe(1);
      expect(a.nodes.filter((n) => n.owner > 0).length).toBe(a.aiCount);
      expect(a.nodes.every((n) => n.x > 0 && n.x < 1 && n.y > 0 && n.y < 1)).toBe(true);
      expect(a.nodes.length).toBeGreaterThanOrEqual(8);
    }
    expect(makeLevel(10).aiCount).toBeGreaterThan(makeLevel(1).aiCount);
  });

  it('Schicken: 60 % gehen los, Ankunft erobert ein schwächeres neutrales Stadion', () => {
    const s = makeLevel(1);
    s.aiNext = [1e9]; s.nodes[1].units = 0;
    const me = s.nodes[0];
    me.units = 50;
    const target = s.nodes.find((n) => n.owner === -1)!;
    target.units = 10;
    expect(send(s, [0], target.id)).toBe(30);
    expect(me.units).toBe(20);
    for (let i = 0; i < 200 && s.squads.length; i++) step(s, 0.05);
    expect(target.owner).toBe(0);
    expect(Math.round(target.units)).toBe(20);
  });

  it('Wachstum nur in besetzten Stadien, bis zur Obergrenze', () => {
    const s = makeLevel(1);
    s.aiNext = [1e9]; s.nodes[1].units = 0;
    const me = s.nodes[0];
    const neutral = s.nodes.find((n) => n.owner === -1)!;
    const n0 = neutral.units;
    for (let i = 0; i < 2000; i++) step(s, 0.1);
    expect(neutral.units).toBe(n0);
    expect(me.units).toBeLessThanOrEqual(SIZE_INFO[me.size].cap);
    expect(me.units).toBeGreaterThan(SIZE_INFO[me.size].cap - 1);
  });

  it('Gegner spielen selbst und erobern; Spiel endet irgendwann mit Ergebnis', () => {
    const s = makeLevel(4);
    for (let i = 0; i < 3000 && !s.result; i++) step(s, 0.1); // bis 300 s ohne eigene Züge
    expect(s.nodes.filter((n) => n.owner > 0).length).toBeGreaterThan(s.aiCount);
    // Ohne eigenes Zutun verliert man irgendwann (oder es läuft noch) – nie ein Sieg
    expect(s.result === 'win').toBe(false);
  });

  it('Sieg und Niederlage werden erkannt', () => {
    const s = makeLevel(1);
    for (const n of s.nodes) n.owner = 0;
    expect(outcome(s)).toBe('win');
    for (const n of s.nodes) n.owner = 1;
    expect(outcome(s)).toBe('lose');
  });

  it('Einfacher Spieler mit Mehrfach-Angriffen gewinnt die ersten Level', () => {
    for (const lv of [1, 3, 4]) {
      const s = makeLevel(lv);
      for (let i = 0; i < 6000 && !s.result; i++) {
        if (i % 12 === 0) {
          const mine = s.nodes.filter((n) => n.owner === 0);
          const t = s.nodes.filter((n) => n.owner !== 0).map((n) => {
            const near = mine.filter((m) => m.units > 6).sort((a, b) => Math.hypot(a.x - n.x, a.y - n.y) - Math.hypot(b.x - n.x, b.y - n.y)).slice(0, 3);
            const power = near.reduce((a, m) => a + Math.floor(m.units * 0.6), 0);
            const d = near.length ? Math.hypot(near[0].x - n.x, near[0].y - n.y) : 9;
            const need = n.units + (n.owner > 0 ? 6 : 0);
            return { n, near, power, need, score: (n.size + (n.owner > 0 ? 1 : 0)) / (need + 5) / (d + 0.2) };
          }).filter((x) => x.power > x.need * 1.15).sort((a, b) => b.score - a.score)[0];
          if (t) send(s, t.near.map((m) => m.id), t.n.id);
        }
        step(s, 0.1);
      }
      expect(s.result).toBe('win');
    }
  });
});

describe('Revierkampf-Ereignisse', () => {
  it('meldet Losschicken, Treffer und Eroberung für die Effekte', () => {
    const s = makeLevel(1);
    s.aiNext = [1e9];
    const target = s.nodes.find((n) => n.owner === -1)!;
    target.units = 1;
    s.nodes[0].units = 40;
    send(s, [0], target.id);
    expect(s.events.some((e) => e.k === 'send' && e.owner === 0)).toBe(true);
    for (let i = 0; i < 200 && !s.events.some((e) => e.k === 'cap'); i++) step(s, 0.1);
    const cap = s.events.find((e) => e.k === 'cap');
    expect(cap).toMatchObject({ k: 'cap', id: target.id, from: -1, to: 0 });
  });
});
