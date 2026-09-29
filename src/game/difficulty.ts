import { chance } from './random';
import type { Career, CareerSettings, Difficulty, PressFrequency } from './types';

export const DIFFICULTIES: Record<Difficulty, { label: string; hint: string; selection: number; injury: number; growth: number }> = {
  easy: { label: 'Leicht', hint: 'Mehr Einsätze, seltener verletzt, schnellere Entwicklung', selection: 1.5, injury: 0.7, growth: 0.35 },
  normal: { label: 'Normal', hint: 'So realistisch wie möglich', selection: 0, injury: 1, growth: 0 },
  hard: { label: 'Schwer', hint: 'Härterer Konkurrenzkampf, öfter verletzt, langsamere Entwicklung', selection: -1.5, injury: 1.3, growth: -0.35 },
};

export const PRESS_FREQUENCIES: Record<PressFrequency, { label: string; chance: number }> = {
  off: { label: 'Aus', chance: 0 },
  rare: { label: 'Selten', chance: 0.2 },
  normal: { label: 'Normal', chance: 0.45 },
  often: { label: 'Oft', chance: 0.75 },
};

export const settingsOf = (c: Career): Required<CareerSettings> => ({
  difficulty: c.settings?.difficulty ?? 'normal',
  press: c.settings?.press ?? 'normal',
});

export const difficultyOf = (c: Career) => DIFFICULTIES[settingsOf(c).difficulty];

/**
 * Schwierigkeit auf eine Entwicklung anwenden: Bei „Leicht“ gibt es bei einem Plus manchmal einen Punkt extra
 * (nie über das Potenzial), bei „Schwer“ fällt manchmal einer weg.
 */
export function adjustGrowth(career: Career, before: number, after: number, potential: number): number {
  const g = difficultyOf(career).growth;
  if (g === 0 || after <= before || !chance(Math.abs(g))) return after;
  return g > 0 ? Math.max(after, Math.min(potential, after + 1)) : after - 1;
}

export function setCareerSettings(prev: Career, patch: CareerSettings): Career {
  return { ...prev, settings: { ...prev.settings, ...patch }, updatedAt: Date.now() };
}
