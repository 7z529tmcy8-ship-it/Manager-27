import { attributeLabels } from './player';
import { chance } from './random';
import type { PlayerState, Position, TrainingFocus } from './types';

/** Die zwei wichtigsten Attribute je Position (Index in der Attributliste). */
const KEY_ATTRIBUTES: Record<Position, number[]> = {
  ST: [1, 0], FL: [0, 3], ZOM: [3, 2], ZM: [2, 3], ZDM: [4, 5], AV: [0, 4], IV: [4, 5], TW: [3, 0],
};

const ATTRIBUTE_NAMES: Record<string, string> = {
  TEM: 'Tempo', SCH: 'Abschluss', PAS: 'Passspiel', DRI: 'Dribbling', DEF: 'Defensive', PHY: 'Physis',
  HEC: 'Hechten', HAN: 'Ballsicherheit', ABS: 'Abstoß', REF: 'Reflexe', STE: 'Stellungsspiel',
};

/** Maximal durch Training gewinnbare Punkte je Attribut. */
const MAX_GAIN = 10;

export interface FocusOption {
  id: TrainingFocus;
  label: string;
  hint: string;
  key: boolean;
}

export function focusOptions(position: Position): FocusOption[] {
  const labels = attributeLabels(position);
  return [
    { id: 'balanced', label: 'Ausgewogen', hint: 'Kein Schwerpunkt', key: false },
    ...labels.map((l, i) => ({
      id: i,
      label: ATTRIBUTE_NAMES[l] ?? l,
      hint: KEY_ATTRIBUTES[position].includes(i) ? 'Schlüsselattribut deiner Position – hilft auch der Gesamtwertung' : `+${l}`,
      key: KEY_ATTRIBUTES[position].includes(i),
    })),
    { id: 'rest', label: 'Regeneration', hint: 'Weniger Verletzungen, dafür keine Trainingsfortschritte', key: false },
  ];
}

export function focusLabel(p: PlayerState): string {
  const f = p.trainingFocus ?? 'balanced';
  return focusOptions(p.position).find((o) => o.id === f)?.label ?? 'Ausgewogen';
}

export function injuryFactor(p: PlayerState): number {
  return (p.trainingFocus === 'rest' ? 0.6 : 1) * ((p.traits ?? []).includes('fragile') ? 1.8 : 1);
}

/**
 * Wirkung einer Halbserie Training (nach der Entwicklung angewendet):
 * - gewähltes Attribut +1 (bis +10 insgesamt)
 * - Schlüsselattribut: manchmal +1 Gesamtwertung (nur unter dem Potenzial) bzw. im Alter ein Punkt weniger Abbau
 */
export function applyTraining(p: PlayerState, ovrBeforeDev: number): string | null {
  const f = p.trainingFocus ?? 'balanced';
  if (typeof f !== 'number') return null;
  const gains = p.trainingGains ?? p.profile.map(() => 0);
  let note: string | null = null;
  if (gains[f] < MAX_GAIN) {
    gains[f] += 1;
    p.profile = p.profile.map((v, i) => (i === f ? v + 1 : v));
  }
  p.trainingGains = gains;
  if (KEY_ATTRIBUTES[p.position].includes(f)) {
    if (p.ovr < ovrBeforeDev && chance(0.35)) {
      p.ovr += 1;
      note = 'Gezieltes Training hat den Abbau gebremst.';
    } else if (p.ovr >= ovrBeforeDev && p.ovr < p.potential && chance(0.25)) {
      p.ovr += 1;
      note = 'Das Spezialtraining zahlt sich aus: +1 Gesamtwertung.';
    }
  }
  return note;
}
