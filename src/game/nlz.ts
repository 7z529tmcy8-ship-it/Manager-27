import { NLZ_TEAMS, SIM_CLUBS, firstTeamOf, getClub, getLeague, reserveClubOf, youthClubOf, youthTeamOfClub } from '../data/leagues';
import { ATTR_WEIGHTS } from './attributes';
import { postInbox } from './inbox';
import { addNews } from './news';
import { ownsClub } from './owner';
import { attributes, clubLeagueId, clubStrength, currentClubId, roleFor, wageFor } from './player';
import { chance, clamp, pick, randInt } from './random';
import { playMatch, sortTable } from './season';
import type { Career, NlzProgram, NlzTeam, PlayerState, Position, SeasonRecord } from './types';

// ---------- Nachwuchsleistungszentrum (NLZ) ----------
// Junge Spieler starten bei Vereinen mit NLZ in der U15, U17 oder U19 und arbeiten sich hoch: U15 → U17 → U19 →
// (U23 oder zweite Mannschaft) → Profis. Jede Stufe dauert in der Regel mindestens eine Saison – nur eine
// außergewöhnliche Entwicklung überspringt sie. Wer bei den Profis kaum spielt oder schwach ist, kann zurückgestuft werden.

/** Höchstalter (zu Saisonbeginn) je Mannschaft. */
export const NLZ_MAX_AGE: Record<NlzTeam, number> = { U15: 14, U17: 16, U19: 18, U23: 21 };

/** So weit unter der Profi-Stärke startet man im NLZ statt bei den Profis. */
const START_GAP = 7;
/** Ab hier ist man reif für die Profis – mit starker Saison schon etwas früher. */
const READY_GAP = 8;
const READY_GAP_STRONG = 11;
/** Außergewöhnlich: so nah an der Profi-Stärke darf man jede Stufe überspringen. */
const EXCEPTIONAL_GAP = 4;

/** Startet ein neuer Spieler im NLZ? Dann in welcher Mannschaft (fehlende Stufen fallen auf die nächsthöhere). */
export function nlzStartTeam(age: number, ovr: number, clubId: string, parentStrength: number): NlzTeam | null {
  if (age > NLZ_MAX_AGE.U23) return null;
  // Ganz junge Spieler starten (fast) immer im Nachwuchs, ältere nur, wenn sie noch deutlich unter den Profis sind.
  const gap = age <= NLZ_MAX_AGE.U17 ? EXCEPTIONAL_GAP : age <= NLZ_MAX_AGE.U19 ? START_GAP : 10;
  if (ovr >= parentStrength - gap) return null;
  const wanted: NlzTeam = age <= NLZ_MAX_AGE.U15 ? 'U15' : age <= NLZ_MAX_AGE.U17 ? 'U17' : age <= NLZ_MAX_AGE.U19 ? 'U19' : 'U23';
  const club = youthClubOf(clubId, wanted);
  return club ? youthTeamOfClub(club.id) : null;
}

/** Rolle in der Nachwuchsmannschaft. */
export function nlzRole(career: Career, team: NlzTeam) {
  const p = career.player;
  const club = youthClubOf(p.contract.clubId, team)!;
  return roleFor(p.ovr, clubStrength(career, club.id), p.age);
}

// ---------- Förderprogramme ----------
export const NLZ_PROGRAMS: Record<NlzProgram, { label: string; hint: string; growth: number; injury: number }> = {
  technik: { label: 'Technik', hint: 'Passen und Dribbeln wachsen schneller.', growth: 1.05, injury: 0 },
  athletik: { label: 'Athletik', hint: 'Tempo und Physis – am schnellsten, aber mehr Verletzungen.', growth: 1.12, injury: 0.1 },
  taktik: { label: 'Taktik', hint: 'Defensive und Spielverständnis – der Trainer zieht dich früher hoch.', growth: 1, injury: 0 },
  mental: { label: 'Mentalität', hint: 'Etwas langsamer, dafür steigt oft das Potenzial.', growth: 0.95, injury: 0 },
};

export const proTrainingAllowed = (career: Career) => {
  const p = career.player;
  return !!p.nlz && !p.loan && (p.nlz.team === 'U19' || p.nlz.team === 'U23') && p.ovr >= clubStrength(career, p.contract.clubId) - 14;
};

export function setNlzProgram(prev: Career, program: NlzProgram): Career {
  if (!prev.player.nlz) return prev;
  const career: Career = structuredClone(prev);
  career.player.nlz!.program = program;
  return career;
}

export function setProTraining(prev: Career, on: boolean): Career {
  if (!prev.player.nlz || (on && !proTrainingAllowed(prev))) return prev;
  const career: Career = structuredClone(prev);
  career.player.nlz!.proTraining = on;
  return career;
}

/** Entwicklungs-Optionen im NLZ: Training am Profi-Standort, aber Junioren-Spiele bringen weniger als Profi-Einsätze. */
export function nlzDevOptions(career: Career): { training?: number; growthScale?: number } {
  const p = career.player;
  if (!p.nlz || p.loan) return {};
  const pro = clubStrength(career, p.contract.clubId);
  const program = NLZ_PROGRAMS[p.nlz.program ?? 'technik'];
  const withPros = !!p.nlz.proTraining && proTrainingAllowed(career);
  return { training: withPros ? pro : pro - 3, growthScale: 0.55 * program.growth * (withPros ? 1.2 : 1) };
}

/** Trainingsniveau im NLZ (für ältere Aufrufer). */
export function trainingLevel(career: Career): number | undefined {
  return nlzDevOptions(career).training;
}

/**
 * Nach jeder Halbserie im NLZ: Doppelbelastung und Athletik-Programm können zu kleinen Verletzungen führen,
 * wer bei den Profis mittrainiert, bekommt Einsätze bei den Profis (das erste ist das Profi-Debüt).
 */
export function nlzHalfEnd(career: Career, half: 1 | 2): void {
  const p = career.player;
  const prog = career.progress;
  if (!p.nlz || p.loan || !prog) return;
  const program = NLZ_PROGRAMS[p.nlz.program ?? 'technik'];
  const withPros = !!p.nlz.proTraining && proTrainingAllowed(career);
  const parent = getClub(p.contract.clubId);
  const season = prog.notes;
  if (chance(program.injury + (withPros ? 0.08 : 0))) {
    const weeks = randInt(2, 4);
    p.carryInjuryWeeks = (p.carryInjuryWeeks ?? 0) + weeks;
    season.push(`Überlastung (${withPros ? 'Doppelbelastung NLZ und Profis' : 'Athletik-Programm'}): ${weeks} Wochen Pause.`);
  }
  if (!withPros) return;
  const pro = clubStrength(career, parent.id);
  if (!chance(clamp(0.25 + (p.ovr - (pro - 12)) * 0.07, 0.1, 0.75))) return;
  const apps = 1 + (chance(0.4) ? 1 : 0) + (chance(0.2) ? 1 : 0);
  const first = !(p.proApps ?? 0);
  p.proApps = (p.proApps ?? 0) + apps;
  prog.proApps = (prog.proApps ?? 0) + apps;
  season.push(`${apps}× bei den Profis von ${parent.name} eingesetzt (${half === 1 ? 'Hinrunde' : 'Rückrunde'}).`);
  if (first) {
    postInbox(career, { kind: 'achievement', title: 'Profi-Debüt!', text: `Der Cheftrainer von ${parent.name} bringt dich zum ersten Mal bei den Profis – mit ${p.age} Jahren. Dein NLZ-Platz bleibt, aber jetzt kennt dich jeder.`, action: 'career' });
    addNews(career, half, 'Du', `Profi-Debüt mit ${p.age}: ${parent.name} bringt NLZ-Talent ${p.name}.`);
  }
}

/** Für die Anzeige: Wo steht der Spieler im NLZ und ab wann ist er reif für die Profis? */
export function nlzStatus(career: Career): {
  team: NlzTeam; parent: string; readyAt: number; strongAt: number; exceptionalAt: number; proTrainAt: number; maxAge: number;
  seasons: number; program: NlzProgram; proTraining: boolean; canProTrain: boolean; proApps: number;
} | null {
  const p = career.player;
  if (!p.nlz || p.loan) return null;
  const pro = clubStrength(career, p.contract.clubId);
  const trust = p.nlz.program === 'taktik' ? 1 : 0;
  return {
    team: p.nlz.team, parent: getClub(p.contract.clubId).name,
    readyAt: Math.round(pro - READY_GAP - trust), strongAt: Math.round(pro - READY_GAP_STRONG - trust),
    exceptionalAt: Math.round(pro - EXCEPTIONAL_GAP), proTrainAt: Math.round(pro - 14), maxAge: NLZ_MAX_AGE[p.nlz.team],
    seasons: p.nlz.seasons ?? 0, program: p.nlz.program ?? 'technik', proTraining: !!p.nlz.proTraining && proTrainingAllowed(career),
    canProTrain: proTrainingAllowed(career), proApps: p.proApps ?? 0,
  };
}

export type NlzMove = 'up' | 'pros' | 'reserve' | 'u23' | 'down-u19' | 'down-u23' | 'down-reserve' | 'reserve-up';

/**
 * Saisonende (nach dem Geburtstag): Aufrücken, Hochziehen oder Zurückstufen.
 * Gibt den Wechsel zurück (oder null) und schreibt Postfach, Schlagzeile und Saisonnotiz.
 */
export function nlzSeasonEnd(career: Career, record: SeasonRecord): NlzMove | null {
  const p = career.player;
  if (p.loan || p.contract.yearsLeft <= 0 || ownsClub(career, p.contract.clubId)) return null;
  const share = record.possibleMinutes ? record.minutes / record.possibleMinutes : 0;
  const rating = record.avgRating ?? 6.5;
  const strong = (rating >= 7 && share >= 0.5) || (record.proApps ?? 0) >= 3;
  const weak = share < 0.12 || (record.apps >= 6 && rating < 6.4 && share < 0.5);
  const parentId = p.contract.clubId;
  const parent = getClub(parentId);
  const pro = clubStrength(career, parentId);
  const note = (move: NlzMove, title: string, text: string, headline: string) => {
    record.notes.push(text);
    postInbox(career, { kind: 'event', season: record.season, title, text, action: 'career' });
    addNews(career, 2, 'Verein', headline);
    return move;
  };

  if (p.nlz) {
    const team = p.nlz.team;
    const seasons = (p.nlz.seasons ?? 0) + 1;
    const keep = { program: p.nlz.program, proTraining: p.nlz.proTraining };
    const trust = p.nlz.program === 'taktik' ? 1 : 0;
    const outgrown = p.age > NLZ_MAX_AGE[team];
    const exceptional = p.ovr >= pro - EXCEPTIONAL_GAP;
    const ready = p.ovr >= pro - READY_GAP - trust || (strong && p.ovr >= pro - READY_GAP_STRONG - trust);
    const senior = team === 'U19' || team === 'U23';
    const moveTo = (next: NlzTeam, title: string, text: string) => {
      p.nlz = { team: next, role: nlzRole(career, next), seasons: 0, ...keep };
      return note(next === 'U23' ? 'u23' : 'up', title, text, `${p.name} rückt bei ${parent.name} in die ${youthClubOf(parentId, next)!.name.replace(`${parent.name} `, '')} auf.`);
    };
    const toPros = () => {
      p.nlz = undefined;
      p.contract.role = roleFor(p.ovr, pro, p.age);
      // Profivertrag: Das Gehalt steigt auf Profi-Niveau.
      p.contract.wage = Math.max(p.contract.wage, wageFor(p.ovr, pro));
      return note('pros', 'Hochgezogen zu den Profis!', `Der Cheftrainer von ${parent.name} holt dich zu den Profis – Rolle: ${p.contract.role}.`,
        `${parent.name} zieht Talent ${p.name} aus dem NLZ zu den Profis hoch.`);
    };
    // Außergewöhnliche Talente überspringen Stufen; sonst erst nach einer Saison in U19/U23.
    if (exceptional || (senior && seasons >= 1 && ready)) return toPros();
    // Nächste Nachwuchsstufe (U15 → U17 → U19); fehlende Stufen werden übersprungen.
    const idx = NLZ_TEAMS.indexOf(team);
    if (idx < 2) {
      const nextClub = youthClubOf(parentId, NLZ_TEAMS[idx + 1]);
      const next = nextClub ? youthTeamOfClub(nextClub.id) : null;
      if (next && next !== team && (outgrown || (strong && seasons >= 1 && p.ovr >= clubStrength(career, nextClub!.id) - 2))) {
        return moveTo(next, `Aufgerückt in die ${next}`, outgrown
          ? `Du bist zu alt für die ${team} und rückst in die ${next} von ${parent.name} auf.`
          : `Starke Saison: ${parent.name} zieht dich ein Jahr früher in die ${next} hoch.`);
      }
    }
    if (outgrown) {
      if (team === 'U19') {
        const reserve = reserveClubOf(parentId);
        if (reserve) {
          p.nlz = undefined;
          p.contract = { ...p.contract, clubId: reserve.id, role: roleFor(p.ovr, clubStrength(career, reserve.id), p.age) };
          return note('reserve', 'Weiter in der zweiten Mannschaft', `Zu alt für die U19, noch nicht reif für die Profis: Du spielst jetzt für ${reserve.name}.`,
            `${p.name} wechselt aus der U19 in die ${reserve.name}.`);
        }
        if (youthClubOf(parentId, 'U23')) {
          return moveTo('U23', 'Weiter in der U23', `Zu alt für die U19, noch nicht reif für die Profis: Du spielst jetzt in der ${youthClubOf(parentId, 'U23')!.name} – der letzten Stufe vor den Profis.`);
        }
      }
      return toPros();
    }
    p.nlz = { team, role: nlzRole(career, team), seasons, ...keep };
    return null;
  }

  // Zweite Mannschaft: Wer überzeugt, darf zurück zu den Profis.
  const first = firstTeamOf(parentId);
  if (first) {
    const firstStrength = clubStrength(career, first.id);
    if (p.ovr >= firstStrength - READY_GAP || (strong && p.ovr >= firstStrength - READY_GAP_STRONG)) {
      p.contract = { ...p.contract, clubId: first.id, role: roleFor(p.ovr, firstStrength, p.age) };
      return note('reserve-up', 'Zurück bei den Profis!', `Starke Saison in der ${parent.name}: ${first.name} holt dich zu den Profis hoch.`,
        `${first.name} holt ${p.name} aus der zweiten Mannschaft zu den Profis.`);
    }
    return null;
  }

  if (!weak) return null;
  // Profis: Junge Spieler mit kaum Einsätzen oder schwachen Noten werden zurückgestuft.
  const u19 = youthClubOf(parentId, 'U19');
  if (p.age <= NLZ_MAX_AGE.U19 && u19 && youthTeamOfClub(u19.id) === 'U19' && p.ovr < pro - 6) {
    p.nlz = { team: 'U19', role: nlzRole(career, 'U19'), seasons: 0 };
    return note('down-u19', 'Zurück in die U19', `Zu wenig Spielzeit und zu schwache Leistungen: ${parent.name} schickt dich zurück in die U19. Spiel dich dort wieder hoch!`,
      `Rückschlag für ${p.name}: ${parent.name} stuft das Talent in die U19 zurück.`);
  }
  if (p.age <= NLZ_MAX_AGE.U23 && youthClubOf(parentId, 'U23') && p.ovr < pro - 6) {
    p.nlz = { team: 'U23', role: nlzRole(career, 'U23'), seasons: 0 };
    return note('down-u23', 'Versetzt in die U23', `Bei den Profis reicht es noch nicht: ${parent.name} schickt dich in die ${youthClubOf(parentId, 'U23')!.name}, um Spielpraxis zu sammeln.`,
      `${parent.name} versetzt ${p.name} in die U23.`);
  }
  const reserve = reserveClubOf(parentId);
  if (reserve && p.age <= 22 && share < 0.1 && p.ovr < pro - 10) {
    p.contract = { ...p.contract, clubId: reserve.id, role: roleFor(p.ovr, clubStrength(career, reserve.id), p.age) };
    return note('down-reserve', 'Versetzt in die zweite Mannschaft', `Bei den Profis kommst du nicht zum Zug – ${parent.name} schickt dich zur ${reserve.name}, um Spielpraxis zu sammeln.`,
      `${parent.name} versetzt ${p.name} in die zweite Mannschaft.`);
  }
  return null;
}

/** Mentalitäts-Programm: Am Saisonende steigt oft das Potenzial (höchstens 2 über dem Start-Potenzial). */
export function nlzMentalBonus(p: PlayerState): string | null {
  if (p.nlz?.program !== 'mental' || !chance(0.35)) return null;
  const ceiling = Math.min(97, (p.potentialStart ?? p.potential) + 2);
  if (p.potential >= ceiling) return null;
  p.potential += 1;
  return 'Mentalitäts-Programm: Dein Potenzial ist gestiegen.';
}

// ---------- Positions-Umschulung ----------
const weighted = (v: number[], w: number[]) => v.reduce((a, x, i) => a + x * w[i], 0);

/** Position, auf der die eigenen Attribute klar besser passen (mind. +2) – oder null. Torhüter bleiben Torhüter. */
export function retrainSuggestion(p: PlayerState): { to: Position; ovr: number } | null {
  if (p.position === 'TW') return null;
  const attrs = attributes(p);
  const now = weighted(attrs, ATTR_WEIGHTS[p.position]);
  let best: { to: Position; ovr: number } | null = null;
  for (const pos of Object.keys(ATTR_WEIGHTS) as Position[]) {
    if (pos === 'TW' || pos === p.position) continue;
    const v = weighted(attrs, ATTR_WEIGHTS[pos]);
    if (v >= now + 2 && (!best || v > best.ovr)) best = { to: pos, ovr: Math.round(v) };
  }
  return best;
}

/** Umschulung annehmen: Die Attribute bleiben, die Gesamtwertung ergibt sich neu aus den Gewichten der neuen Position. */
export function applyRetrain(p: PlayerState, to: Position): void {
  const attrs = attributes(p);
  const ovr = Math.round(weighted(attrs, ATTR_WEIGHTS[to]));
  p.position = to;
  p.profile = attrs.map((a) => a - ovr);
  p.ovr = clamp(ovr, 40, 99);
  p.potential = Math.max(p.potential + 1, p.ovr);
  p.attrDelta = undefined;
}

// ---------- Jugend-Wettbewerbe ----------
const KO = ['Playoffs', 'Achtelfinale', 'Viertelfinale', 'Halbfinale'];

/**
 * Am Saisonende im NLZ: UEFA Youth League (U19 eines Champions-League-Klubs) und die Endrunde um die
 * Deutsche A-/B-Junioren-Meisterschaft (Top 8 der Nachwuchsliga A). Die Runden bis zum Halbfinale werden simuliert,
 * das Finale spielt man live.
 */
export function nlzCompetitions(career: Career): void {
  const p = career.player;
  const prog = career.progress;
  if (!p.nlz || p.loan || !prog) return;
  const clubId = currentClubId(p);
  const leagueId = clubLeagueId(career, clubId);
  const league = getLeague(leagueId);
  const own = (prog.strength[clubId] ?? clubStrength(career, clubId)) + (p.ovr - clubStrength(career, clubId)) * 0.15;
  const strengthOf = (id: string) => prog.strength[id] ?? clubStrength(career, id);
  const comps: { name: string; reached: string; won: boolean }[] = [];
  const finals = [...(prog.pendingFinals ?? [])];

  const run = (name: string, title: string, rounds: string[], pool: string[]) => {
    const entry = { name, reached: rounds[0], won: false };
    comps.push(entry);
    const used: string[] = [];
    for (const round of rounds) {
      const options = pool.filter((id) => !used.includes(id));
      if (!options.length) return;
      const opp = pick(options);
      used.push(opp);
      entry.reached = round;
      const [a, b] = playMatch(own, strengthOf(opp), league.goalsPerGame);
      const won = a > b || (a === b && chance(0.5));
      prog.notes.push(`${name}, ${round}: ${a}:${b}${a === b ? (won ? ' n. E.' : ' n. E. verloren') : ''} gegen ${getClub(opp).name}.`);
      if (!won) return;
    }
    const rest = pool.filter((id) => !used.includes(id));
    if (!rest.length) return;
    const opp = pick(rest);
    entry.reached = 'Finale';
    finals.push({ kind: 'youth', comp: name, title, opponentId: opp, opponentName: getClub(opp).name, opponentStrength: strengthOf(opp) });
  };

  // UEFA Youth League: U19 von Klubs mit Champions-League-Platz
  if (p.nlz.team === 'U19' && career.europeSlots[p.contract.clubId] === 'Champions League') {
    // Gegner: die stärksten U19-Teams aus dem Ausland (wie die Champions-League-Klubs)
    const pool = SIM_CLUBS.filter((c) => getLeague(c.leagueId).youth === 'U19' && getLeague(c.leagueId).country !== league.country && c.id !== clubId)
      .sort((a, b) => strengthOf(b.id) - strengthOf(a.id)).slice(0, 24).map((c) => c.id);
    const groupChance = clamp(0.55 + (own - 60) * 0.05, 0.2, 0.92);
    if (chance(groupChance)) run('UEFA Youth League', 'UEFA-Youth-League-Finale', KO, pool);
    else {
      comps.push({ name: 'UEFA Youth League', reached: 'Vorrunde', won: false });
      prog.notes.push('UEFA Youth League: Aus in der Vorrunde.');
    }
  }
  // Endrunde um die Deutsche Junioren-Meisterschaft (U19/U17, Top 8 der Liga A)
  if ((leagueId === 'u19a' || leagueId === 'u17a') && prog.rows[leagueId]) {
    const table = sortTable(prog.rows[leagueId]);
    const pos = table.findIndex((r) => r.clubId === clubId) + 1;
    if (pos >= 1 && pos <= 8) {
      const name = leagueId === 'u19a' ? 'Deutscher A-Junioren-Meister' : 'Deutscher B-Junioren-Meister';
      run(name, `Finale um die Deutsche ${leagueId === 'u19a' ? 'A' : 'B'}-Junioren-Meisterschaft`, ['Viertelfinale', 'Halbfinale'],
        table.slice(0, 8).map((r) => r.clubId).filter((id) => id !== clubId));
    }
  }
  if (!comps.length) return;
  prog.youthComps = comps;
  prog.pendingFinals = finals;
}
