import type { PlayerState } from './types';

export type TraitId = 'wildcard' | 'hothead' | 'showman' | 'party' | 'diva' | 'leader' | 'professional' | 'clutch';

export interface Trait {
  id: TraitId;
  icon: string;
  name: string;
  description: string;
}

export const TRAITS: Trait[] = [
  { id: 'wildcard', icon: '🎆', name: 'Unberechenbar', description: 'Genie und Wahnsinn: Noten schwanken stärker, verrückte Ereignisse passieren öfter.' },
  { id: 'hothead', icon: '🌋', name: 'Heißsporn', description: 'Rote Karten, Sperren und Zoff mit dem Trainer – aber volle Leidenschaft.' },
  { id: 'showman', icon: '🎩', name: 'Showman', description: 'Liebt die große Bühne: etwas mehr Tore, spektakuläre Momente in Finals.' },
  { id: 'party', icon: '🍾', name: 'Partylöwe', description: 'Das Nachtleben ruft: langsamere Entwicklung, früherer Abbau, Schlagzeilen.' },
  { id: 'diva', icon: '💅', name: 'Diva', description: 'Auf der Bank wird geschmollt – und öffentlich über Wechsel geredet.' },
  { id: 'leader', icon: '🦁', name: 'Anführer', description: 'Wird schneller Kapitän, das Trainervertrauen fällt nie ganz ab.' },
  { id: 'professional', icon: '🧘', name: 'Vollprofi', description: 'Lebt für den Fußball: weniger Ausrutscher, langsamerer Abbau im Alter.' },
  { id: 'clutch', icon: '🧊', name: 'Eiskalt', description: 'Wenn es zählt, ist er da: bessere Chancen in Finals und im Elfmeterschießen.' },
];

export const MAX_TRAITS = 3;

export const hasTrait = (p: Pick<PlayerState, 'traits'>, id: TraitId) => (p.traits ?? []).includes(id);

export const getTrait = (id: TraitId) => TRAITS.find((t) => t.id === id)!;
