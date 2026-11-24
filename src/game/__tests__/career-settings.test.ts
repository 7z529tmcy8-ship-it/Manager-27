import { beforeEach, expect, it } from 'vitest';
import { slugify } from '../../data/leagues';
import { createCareer } from '../career';
import { rawCareerSettings, setCareerSettings, setGlobalCareerSettings, settingsOf } from '../difficulty';
import { updateSettings } from '../../settings';

const mk = (name: string) => createCareer({ name, nation: 'Deutschland', position: 'ST', age: 20, ovr: 70, potential: 85, clubId: slugify('Hamburger SV') });
beforeEach(() => updateSettings({ careerSettings: {} }));

it('Einstellung in einer Karriere gilt für alle anderen und für neue', () => {
  const a = mk('A');
  const b = mk('B');
  setCareerSettings(a, { difficulty: 'hard', stageMode: false });
  expect(settingsOf(b).difficulty).toBe('hard');
  expect(settingsOf(b).stageMode).toBe(false);
  expect(settingsOf(mk('Neu')).difficulty).toBe('hard');
});

it('Globale Einstellung hat Vorrang vor alten Werten im Spielstand', () => {
  const old = { ...mk('Alt'), settings: { difficulty: 'easy' as const, liveMatches: false } };
  expect(settingsOf(old).difficulty).toBe('easy'); // noch nichts global gesetzt
  setGlobalCareerSettings({ difficulty: 'normal' });
  expect(settingsOf(old).difficulty).toBe('normal');
  expect(rawCareerSettings(old).liveMatches).toBe(false); // nicht überschrieben, bleibt
  expect(settingsOf(null).difficulty).toBe('normal');
});
