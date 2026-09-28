export const rand = (min = 0, max = 1) => min + Math.random() * (max - min);

export const randInt = (min: number, max: number) => Math.floor(rand(min, max + 1));

export const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

export const sigmoid = (x: number) => 1 / (1 + Math.exp(-x));

export const chance = (p: number) => Math.random() < p;

/** Normalverteilte Zufallszahl (Box-Muller). */
export function normal(mean = 0, sd = 1): number {
  const u = 1 - Math.random();
  const v = Math.random();
  return mean + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/** Poisson-verteilte Zufallszahl (Knuth), z. B. für Tore pro Spiel. */
export function poisson(lambda: number): number {
  const limit = Math.exp(-lambda);
  let k = 0;
  let p = 1;
  do {
    k++;
    p *= Math.random();
  } while (p > limit);
  return k - 1;
}

export function pick<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

export function weightedPick<T>(items: readonly T[], weight: (item: T) => number): T {
  const weights = items.map(weight);
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < items.length; i++) {
    r -= weights[i];
    if (r <= 0) return items[i];
  }
  return items[items.length - 1];
}

export function shuffle<T>(items: T[]): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export const uid = () => Math.random().toString(36).slice(2, 10);
