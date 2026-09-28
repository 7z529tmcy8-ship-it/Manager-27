import { chance, clamp, pick, poisson, randInt, sigmoid } from './random';
import type { FinalDecisionKind, FinalState, PendingFinal, Position } from './types';

const ATTACKERS: Position[] = ['ST', 'FL', 'ZOM'];
const AUTO_CONVERSION = 0.4;

export interface FinalSetup {
  final: PendingFinal;
  ownName: string;
  ownStrength: number;
  goalsPerGame: number;
  playerName: string;
  position: Position;
  ovr: number;
  /** Auswahlwert wie in der Saisonsimulation (Stärke, Form, Vertrauen). */
  selection: number;
}

/** Plant ein Finale: Chancen beider Teams über 90 Minuten, einige davon mit Entscheidung des Spielers. */
export function startFinal(setup: FinalSetup): FinalState {
  const { final, ownStrength, goalsPerGame, position } = setup;
  const diff = ownStrength - final.opponentStrength;
  const lambdaOwn = Math.max(0.3, (goalsPerGame / 2) * Math.exp(0.065 * diff));
  const lambdaOpp = Math.max(0.3, (goalsPerGame / 2) * Math.exp(-0.065 * diff));
  const ownChances = Math.max(2, poisson(lambdaOwn / AUTO_CONVERSION));
  const oppChances = Math.max(1, poisson(lambdaOpp / AUTO_CONVERSION));

  const playerRole: FinalState['playerRole'] = chance(sigmoid((setup.selection + 2) / 2))
    ? 'start'
    : position !== 'TW' && chance(0.7)
      ? 'sub'
      : 'bench';
  const subMinute = playerRole === 'sub' ? randInt(55, 75) : 0;

  const minutes = (n: number) => Array.from({ length: n }, () => randInt(3, 89));
  const scenes = [
    ...minutes(ownChances).map((minute) => ({ minute, side: 'own' as const, decision: false })),
    ...minutes(oppChances).map((minute) => ({ minute, side: 'opp' as const, decision: false })),
  ].sort((a, b) => a.minute - b.minute);

  // Szenen mit Beteiligung des Spielers markieren (nur, solange er auf dem Platz steht).
  if (playerRole !== 'bench') {
    const onPitch = scenes.filter((sc) => sc.minute >= subMinute);
    const own = onPitch.filter((sc) => sc.side === 'own');
    const opp = onPitch.filter((sc) => sc.side === 'opp');
    const mark = (list: typeof scenes, n: number) => {
      for (const sc of [...list].sort(() => Math.random() - 0.5).slice(0, n)) sc.decision = true;
    };
    const limit = playerRole === 'sub' ? 1 : 2;
    if (ATTACKERS.includes(position)) mark(own, limit);
    else if (position === 'ZM') {
      mark(own, 1);
      if (playerRole === 'start') mark(opp, 1);
    } else mark(opp, limit);
  }

  const intro =
    playerRole === 'start'
      ? `${setup.playerName} steht in der Startelf.`
      : playerRole === 'sub'
        ? `${setup.playerName} sitzt zunächst auf der Bank.`
        : `${setup.playerName} ist nur Ersatz und schaut von der Bank zu.`;

  return {
    final,
    isKeeper: position === 'TW',
    ownName: setup.ownName,
    ownStrength,
    goalsPerGame,
    playerRole,
    subMinute,
    minute: 0,
    score: [0, 0],
    scenes,
    next: 0,
    log: [{ minute: 0, text: `Anpfiff: ${setup.ownName} gegen ${final.opponentName}. ${intro}`, tone: 'info' }],
    pending: null,
    playerGoals: 0,
    playerAssists: 0,
    ratingAdj: 0,
    shootout: null,
    done: false,
    won: false,
  };
}

const OPTIONS: Record<FinalDecisionKind, { id: string; label: string; hint: string }[]> = {
  attack: [
    { id: 'shoot', label: 'Direkt abziehen', hint: 'Solide Chance, selbst zu treffen' },
    { id: 'pass', label: 'Querlegen', hint: 'Sicherer für die Mannschaft – du bekommst die Vorlage' },
    { id: 'dribble', label: 'Dribbling', hint: 'Riskant, aber ein Traumtor bringt Extra-Punkte' },
  ],
  defend: [
    { id: 'tackle', label: 'Grätsche', hint: 'Meist sauber – aber Elfmetergefahr' },
    { id: 'jockey', label: 'Stellen', hint: 'Kein Foulrisiko, der Gegner kommt öfter zum Abschluss' },
  ],
  keeper: [
    { id: 'rush', label: 'Rauslaufen', hint: 'Winkel verkürzen – alles oder nichts' },
    { id: 'line', label: 'Auf der Linie bleiben', hint: 'Auf den Reflex vertrauen' },
  ],
  penalty: [
    { id: 'left', label: 'Links', hint: '' },
    { id: 'center', label: 'Mitte', hint: '' },
    { id: 'right', label: 'Rechts', hint: '' },
  ],
  penaltySave: [
    { id: 'left', label: 'Links', hint: '' },
    { id: 'center', label: 'Stehen bleiben', hint: '' },
    { id: 'right', label: 'Rechts', hint: '' },
  ],
};

function ask(state: FinalState, kind: FinalDecisionKind, minute: number, text: string) {
  state.pending = { kind, minute, text, options: OPTIONS[kind] };
}

function goal(state: FinalState, side: 'own' | 'opp', minute: number, text: string) {
  if (side === 'own') state.score[0]++;
  else state.score[1]++;
  state.log.push({ minute, text: `${text} ${state.score[0]}:${state.score[1]}`, tone: side === 'own' ? 'goal' : 'against' });
}

/** Spielt das Finale bis zur nächsten Entscheidung weiter bzw. wendet die getroffene Entscheidung an. */
export function advanceFinal(prev: FinalState, choice?: string, playerName = 'Du', ovr = 80): FinalState {
  const state: FinalState = structuredClone(prev);
  if (state.done) return state;
  const q = ovr - 80;

  if (state.pending) {
    if (!choice) return state;
    resolveDecision(state, choice, q, playerName);
    state.pending = null;
    return state.done ? state : advanceFinal(state, undefined, playerName, ovr);
  }

  if (state.playerRole === 'sub' && state.minute < state.subMinute && nextMinute(state) >= state.subMinute) {
    state.minute = state.subMinute;
    state.log.push({ minute: state.subMinute, text: `Einwechslung: ${playerName} kommt ins Spiel.`, tone: 'info' });
    return state;
  }

  if (state.next < state.scenes.length) {
    const sc = state.scenes[state.next++];
    state.minute = sc.minute;
    if (sc.decision) {
      if (sc.side === 'own') {
        ask(state, 'attack', sc.minute, `${sc.minute}'. Der Ball kommt zu dir – du hast Platz vor dem Tor!`);
      } else if (state.playerRole !== 'bench' && state.isKeeper) {
        ask(state, 'keeper', sc.minute, `${sc.minute}'. Ein Gegenspieler läuft allein auf dein Tor zu!`);
      } else {
        ask(state, 'defend', sc.minute, `${sc.minute}'. Konter! Der gegnerische Stürmer zieht auf dich zu.`);
      }
      return state;
    }
    if (chance(AUTO_CONVERSION)) {
      goal(state, sc.side, sc.minute, sc.side === 'own' ? `${sc.minute}'. Tor für ${state.ownName}!` : `${sc.minute}'. Gegentor – ${state.final.opponentName} trifft.`);
    } else {
      state.log.push({
        minute: sc.minute,
        text: sc.side === 'own'
          ? `${sc.minute}'. ${pick(['Knapp vorbei!', 'Glanzparade des Torwarts!', 'An die Latte!'])}`
          : `${sc.minute}'. ${pick(['Durchatmen – der Schuss geht drüber.', 'Gehalten!', 'Pfosten! Glück gehabt.'])}`,
        tone: 'info',
      });
    }
    return state;
  }

  // 90 Minuten gespielt
  if (!state.shootout) {
    state.minute = 90;
    if (state.score[0] !== state.score[1]) return finish(state);
    state.log.push({ minute: 90, text: 'Abpfiff nach 90 Minuten – es geht ins Elfmeterschießen!', tone: 'info' });
    state.shootout = { own: 0, opp: 0, round: 0, playerKicked: false };
    if (state.playerRole !== 'bench' && state.minute >= state.subMinute) {
      if (state.isKeeper) ask(state, 'penaltySave', 90, 'Der erste Schütze des Gegners läuft an. Wohin springst du?');
      else ask(state, 'penalty', 90, 'Du trittst als erster Schütze an. Wohin schießt du?');
      return state;
    }
  }
  return runShootout(state);
}

function nextMinute(state: FinalState): number {
  return state.next < state.scenes.length ? state.scenes[state.next].minute : 90;
}

function resolveDecision(state: FinalState, choice: string, q: number, name: string) {
  const p = state.pending!;
  const m = p.minute;
  switch (p.kind) {
    case 'attack':
      if (choice === 'shoot') {
        if (chance(clamp(0.36 + q * 0.012, 0.15, 0.6))) {
          state.playerGoals++;
          state.ratingAdj += 0.4;
          goal(state, 'own', m, `${m}'. TOR! ${name} zieht ab und trifft!`);
        } else {
          state.ratingAdj -= 0.1;
          state.log.push({ minute: m, text: `${m}'. ${name} schießt – knapp vorbei.`, tone: 'bad' });
        }
      } else if (choice === 'pass') {
        if (chance(0.42)) {
          state.playerAssists++;
          state.ratingAdj += 0.2;
          goal(state, 'own', m, `${m}'. Traumpass von ${name} – der Mitspieler schiebt ein!`);
        } else state.log.push({ minute: m, text: `${m}'. ${name} legt quer, doch der Mitspieler vergibt.`, tone: 'info' });
      } else if (chance(clamp(0.3 + q * 0.015, 0.12, 0.55))) {
        state.playerGoals++;
        state.ratingAdj += 0.9;
        goal(state, 'own', m, `${m}'. WAS FÜR EIN TOR! ${name} tanzt zwei Gegenspieler aus und vollendet!`);
      } else {
        state.ratingAdj -= 0.3;
        state.log.push({ minute: m, text: `${m}'. ${name} bleibt im Dribbling hängen.`, tone: 'bad' });
      }
      break;
    case 'defend': {
      const r = Math.random();
      if (choice === 'tackle') {
        if (r < 0.6 + q * 0.01) {
          state.ratingAdj += 0.35;
          state.log.push({ minute: m, text: `${m}'. Perfekte Grätsche von ${name}!`, tone: 'good' });
        } else if (r < 0.85) {
          state.ratingAdj -= 0.6;
          if (chance(0.75)) goal(state, 'opp', m, `${m}'. Foul von ${name} – Elfmeter, verwandelt.`);
          else state.log.push({ minute: m, text: `${m}'. Foul von ${name} – aber der Elfmeter wird gehalten!`, tone: 'good' });
        } else if (chance(0.5)) goal(state, 'opp', m, `${m}'. ${name} kommt zu spät – Gegentor.`);
        else state.log.push({ minute: m, text: `${m}'. ${name} wird überlaufen, der Schuss geht vorbei.`, tone: 'info' });
      } else if (r < 0.55 + q * 0.01) {
        state.ratingAdj += 0.2;
        state.log.push({ minute: m, text: `${m}'. ${name} stellt den Gegner clever – Ballgewinn.`, tone: 'good' });
      } else if (chance(0.33)) goal(state, 'opp', m, `${m}'. Der Gegner kommt zum Abschluss – Gegentor.`);
      else state.log.push({ minute: m, text: `${m}'. Der Abschluss geht knapp vorbei.`, tone: 'info' });
      break;
    }
    case 'keeper':
      if (choice === 'rush' ? chance(0.6 + q * 0.01) : chance(0.68 + q * 0.01) && !chance(0.1)) {
        state.ratingAdj += choice === 'rush' ? 0.6 : 0.3;
        state.log.push({ minute: m, text: `${m}'. Riesentat von ${name}!`, tone: 'good' });
      } else {
        state.ratingAdj -= 0.2;
        goal(state, 'opp', m, `${m}'. Keine Chance für ${name} – Gegentor.`);
      }
      break;
    case 'penalty': {
      const keeper = pick(['left', 'center', 'right']);
      const scored = keeper === choice ? chance(0.35) : chance(0.92);
      state.shootout!.playerKicked = true;
      shootoutKick(state, 'own', scored, scored ? `${name} verwandelt sicher.` : `${name} scheitert – der Keeper ahnt die Ecke!`);
      state.ratingAdj += scored ? 0.2 : -0.4;
      shootoutKick(state, 'opp', chance(0.76));
      state.shootout!.round++;
      break;
    }
    case 'penaltySave': {
      const shooter = pick(['left', 'center', 'right']);
      const saved = shooter === choice && chance(0.65);
      shootoutKick(state, 'own', chance(0.76));
      shootoutKick(state, 'opp', !saved, saved ? `${name} hält! Richtige Ecke!` : undefined);
      if (saved) state.ratingAdj += 0.8;
      state.shootout!.round++;
      break;
    }
  }
}

function shootoutKick(state: FinalState, side: 'own' | 'opp', scored: boolean, text?: string) {
  const so = state.shootout!;
  if (scored) so[side]++;
  state.log.push({
    minute: 120,
    text: `Elfmeter ${side === 'own' ? state.ownName : state.final.opponentName}: ${text ?? (scored ? 'drin.' : 'verschossen!')} (${so.own}:${so.opp})`,
    tone: scored === (side === 'own') ? 'good' : 'bad',
  });
}

function runShootout(state: FinalState): FinalState {
  const so = state.shootout!;
  while (true) {
    const remaining = 5 - so.round;
    if (so.round >= 5 && so.own !== so.opp) break;
    if (so.round < 5 && (so.own > so.opp + remaining || so.opp > so.own + remaining)) break;
    shootoutKick(state, 'own', chance(0.76));
    shootoutKick(state, 'opp', chance(0.76));
    so.round++;
    if (so.round > 12) {
      so.own++;
      break;
    }
  }
  state.won = so.own > so.opp;
  state.done = true;
  state.log.push({
    minute: 120,
    text: state.won ? `${state.ownName} gewinnt das Elfmeterschießen ${so.own}:${so.opp}!` : `Bitter: ${state.final.opponentName} gewinnt im Elfmeterschießen ${so.opp}:${so.own}.`,
    tone: state.won ? 'goal' : 'against',
  });
  return state;
}

function finish(state: FinalState): FinalState {
  state.done = true;
  state.won = state.score[0] > state.score[1];
  state.log.push({
    minute: 90,
    text: state.won ? `Abpfiff! ${state.ownName} gewinnt ${state.score[0]}:${state.score[1]}!` : `Abpfiff. ${state.final.opponentName} gewinnt ${state.score[1]}:${state.score[0]}.`,
    tone: state.won ? 'goal' : 'against',
  });
  return state;
}

/** Spielt ein Finale ohne Eingriff zu Ende (für „Ganze Saison“ oder „Automatisch“). */
export function autoFinal(state: FinalState, playerName: string, ovr: number): FinalState {
  let s = state;
  for (let i = 0; i < 100 && !s.done; i++) {
    s = advanceFinal(s, s.pending ? pick(s.pending.options).id : undefined, playerName, ovr);
  }
  return s;
}

/** Note des Spielers im Finale. */
export function finalRating(state: FinalState): number | null {
  if (state.playerRole === 'bench') return null;
  const r = 6.6 + (state.won ? 0.3 : -0.3) + state.playerGoals * 0.9 + state.playerAssists * 0.6 + state.ratingAdj;
  return Math.round(clamp(r, 3, 10) * 10) / 10;
}
