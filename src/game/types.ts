import type { TraitId } from './traits';

export type Position = 'TW' | 'IV' | 'AV' | 'ZDM' | 'ZM' | 'ZOM' | 'FL' | 'ST';

export type Role = 'Schlüsselspieler' | 'Stammspieler' | 'Rotation' | 'Ergänzung' | 'Perspektivspieler';

export type Competition = 'Liga' | 'Pokal' | 'Champions League' | 'Europa League' | 'Conference League';

export interface Club {
  id: string;
  name: string;
  leagueId: string;
  /** Teamstärke (vergleichbar mit einer Gesamtwertung, ca. 60–86). */
  strength: number;
}

export interface League {
  id: string;
  name: string;
  country: string;
  cup: string;
  tier: 1 | 2 | 3 | 4;
  /** Durchschnittliche Tore pro Spiel in dieser Liga. */
  goalsPerGame: number;
  /** Anzahl Startplätze für CL / EL / Conference League. */
  europe: { cl: number; el: number; conf: number };
  /** Direkte Auf-/Abstiegsplätze in die verbundene Liga. */
  up?: { leagueId: string; spots: number };
  down?: { leagueId: string; spots: number };
  /** Grobe Torjägerkanonen-Marke (Tore des Torschützenkönigs im Schnitt). */
  topScorerGoals: number;
}

export interface Contract {
  clubId: string;
  yearsLeft: number;
  /** Gehalt in € pro Woche. */
  wage: number;
  role: Role;
}

export interface Loan {
  clubId: string;
  /** Verein, an den der Spieler nach der Leihe zurückkehrt. */
  parentClubId: string;
  role: Role;
}

export interface PlayerState {
  name: string;
  nation: string;
  position: Position;
  age: number;
  ovr: number;
  /** Echtes Potenzial, wird im Spiel nur als Spanne angezeigt. */
  potential: number;
  /** Individuelles Attributprofil (Abweichung je Attribut vom Gesamtwert). */
  profile: number[];
  contract: Contract;
  loan: Loan | null;
  caps: number;
  internationalGoals: number;
  /** Vertrauen des Trainers (−3 … +3): beeinflusst die Einsatzchancen, klingt pro Halbserie ab. */
  morale?: number;
  /** Verein, bei dem der Spieler Kapitän ist. */
  captainOf?: string | null;
  /** Vereine, bei denen der Spieler Legendenstatus hat. */
  legendOf?: string[];
  /** Führungsqualität (z. B. durch Mentoring) – macht die Kapitänsbinde wahrscheinlicher. */
  leadership?: number;
  /** Verein, bei dem der Spieler Elfmeterschütze ist. */
  penaltyTakerOf?: string | null;
  /** Verletzungswochen, die zum Start der nächsten Halbserie anfallen (z. B. nach einer Entscheidung). */
  carryInjuryWeeks?: number;
  /** Charaktereigenschaften (z. B. Heißsporn, Showman). */
  traits?: TraitId[];
  /** Trainingsschwerpunkt: Index des Attributs, 'balanced' oder 'rest'. */
  trainingFocus?: TrainingFocus;
  /** Durch Training gewonnene Attributpunkte (für die Obergrenze). */
  trainingGains?: number[];
}

export type TrainingFocus = number | 'balanced' | 'rest';

export type GoalMetric = 'goals' | 'assists' | 'ga' | 'apps' | 'rating' | 'cleanSheets';

export interface SeasonGoal {
  metric: GoalMetric;
  target: number;
  label: string;
}

export interface GoalResult extends SeasonGoal {
  value: number;
  met: boolean;
}

export interface GameEvent {
  title: string;
  text: string;
  tone: 'good' | 'bad';
  half: 1 | 2;
  /** Kurze Wirkung, z. B. "+2 Gesamtwertung". */
  effect: string;
}

export interface MatchLine {
  competition: Competition;
  opponent: string;
  home: boolean;
  goalsFor: number;
  goalsAgainst: number;
  /** 'start' | 'sub' | 'bench' | 'injured' */
  status: 'start' | 'sub' | 'bench' | 'injured';
  minutes: number;
  goals: number;
  assists: number;
  rating: number | null;
  /** Verein, für den der Spieler in diesem Spiel im Kader stand. */
  clubId: string;
  half: 1 | 2;
}

export interface TableRow {
  clubId: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  points: number;
}

export interface CompetitionStats {
  competition: Competition;
  apps: number;
  minutes: number;
  goals: number;
  assists: number;
  avgRating: number | null;
}

export interface SeasonRecord {
  season: string;
  age: number;
  clubId: string;
  onLoan: boolean;
  leagueId: string;
  ovrStart: number;
  ovrEnd: number;
  apps: number;
  starts: number;
  minutes: number;
  possibleMinutes: number;
  goals: number;
  assists: number;
  cleanSheets: number;
  avgRating: number | null;
  injuryWeeks: number;
  leaguePosition: number;
  marketValue: number;
  trophies: string[];
  awards: string[];
  caps: number;
  internationalGoals: number;
  byCompetition: CompetitionStats[];
  table: TableRow[];
  europe: { competition: Competition; reached: string } | null;
  cupReached: string;
  notes: string[];
  /** Wechsel im Wintertransferfenster (Verein der Hinrunde → Verein der Rückrunde). */
  winterMove?: WinterMove | null;
  /** Gesamtwertung zur Winterpause. */
  ovrWinter?: number;
  events?: GameEvent[];
  /** Erklärung der Entwicklung (Leistung, Spielzeit, Alter …). */
  devReasons?: string[];
  /** Saisonziele des Trainers und ob sie erreicht wurden. */
  goalResults?: GoalResult[];
  /** In dieser Saison freigeschaltete Erfolge (Namen). */
  achievements?: string[];
}

export interface WinterMove {
  fromClubId: string;
  toClubId: string;
  type: OfferType;
}

export interface CupState {
  alive: boolean;
  /** Ab dem Winterwechsel ist der Spieler im Pokal nicht mehr dabei. */
  eligible: boolean;
  reached: string;
  won: boolean;
  used: string[];
}

export interface EuroState {
  competition: Competition;
  eligible: boolean;
  points: number;
  stage: 'phase' | 'out' | number;
  reached: string;
  won: boolean;
  used: string[];
  opponentId: string | null;
  agg: [number, number];
}

/** Zwischenstand einer laufenden Saison (wird zur Winterpause gespeichert). */
export interface SeasonProgress {
  strength: Record<string, number>;
  rows: Record<string, TableRow[]>;
  matches: MatchLine[];
  form: number;
  injuredFor: number;
  injuryWeeks: number;
  notes: string[];
  startClubId: string;
  ovrStart: number;
  ovrWinter?: number;
  /** Verletzungswochen bis zur Winterpause (für Ereignisse der Rückrunde). */
  injuryWeeksWinter?: number;
  /** Veränderung der Gesamtwertung durch Ereignisse zur Winterpause. */
  winterEventDelta?: number;
  /** Finals, die live gespielt werden (Pokal, Europapokal, Turnier). */
  pendingFinals?: PendingFinal[];
  national?: NationalSeason;
  devReasons?: string[];
  events?: GameEvent[];
  cup: CupState;
  euro: EuroState | null;
  winterMove: WinterMove | null;
}

export type OfferType = 'Transfer' | 'Leihe' | 'Verlängerung' | 'Ablösefrei';

export interface Offer {
  id: string;
  type: OfferType;
  clubId: string;
  role: Role;
  wage: number;
  years: number;
  /** Ablöse in € (nur zur Info). */
  fee: number;
  message: string;
}

export interface Career {
  id: string;
  createdAt: number;
  updatedAt: number;
  startYear: number;
  /** Jahr, in dem die aktuelle Saison beginnt (2025 → Saison 2025/26). */
  year: number;
  player: PlayerState;
  history: SeasonRecord[];
  /** Offene Angebote im Transferfenster nach der Saison. */
  offers: Offer[];
  phase: 'season' | 'winter' | 'final' | 'window' | 'retired';
  /** Laufendes Live-Finale. */
  liveFinal?: FinalState | null;
  /** Offene Entscheidung, die vor dem Weiterspielen beantwortet werden muss. */
  decision?: PendingDecision | null;
  /** Ergebnis der zuletzt getroffenen Entscheidung. */
  decisionResult?: DecisionResult | null;
  rival?: RivalState | null;
  news?: NewsItem[];
  /** Saisonziele des Trainers für die laufende Saison. */
  seasonGoals?: SeasonGoal[];
  /** Freigeschaltete Erfolge: ID → Saison. */
  unlocked?: Record<string, string>;
  /** Laufende Saison zwischen Hin- und Rückrunde. */
  progress?: SeasonProgress | null;
  /** Wie viele Angebotsrunden in diesem Fenster noch angefragt werden können. */
  requestsLeft: number;
  /** Vereinsstärken können sich über die Jahre leicht verändern. */
  clubDrift: Record<string, number>;
  /** Europapokal-Startplätze aus der Vorsaison (Vereins-ID → Wettbewerb). */
  europeSlots: Record<string, Competition>;
  /** Aktuelle Ligazugehörigkeit (ändert sich durch Auf- und Abstieg). */
  clubLeague: Record<string, string>;
  retiredReason?: string;
  /** Eigene Bewerbungen im aktuellen Transferfenster (ab 30 Jahren). */
  applications?: Application[];
  /** Alle Vereinswechsel inkl. Leihen (für Transferhistorie und Gesamt-Ablöse). */
  transfers?: TransferEntry[];
}

export interface TransferEntry {
  season: string;
  window: 'Sommer' | 'Winter';
  type: OfferType;
  fromClubId: string;
  toClubId: string;
  fee: number;
}

export interface Application {
  clubId: string;
  accepted: boolean;
  message: string;
}

export interface PendingFinal {
  kind: 'cup' | 'euro' | 'national';
  title: string;
  opponentId?: string;
  opponentName: string;
  opponentStrength: number;
}

export interface NationalSeason {
  caps: number;
  goals: number;
  tournament: { name: string; reachedFinal: boolean; won: boolean } | null;
  notes: string[];
}

export type FinalDecisionKind = 'attack' | 'defend' | 'keeper' | 'penalty' | 'penaltySave';

export interface FinalScene {
  minute: number;
  side: 'own' | 'opp';
  decision: boolean;
}

export interface FinalLogLine {
  minute: number;
  text: string;
  tone: 'goal' | 'against' | 'info' | 'good' | 'bad';
}

export interface FinalState {
  final: PendingFinal;
  isKeeper: boolean;
  /** Bonus auf eigene Aktionen in Finals (Eiskalt/Showman). */
  clutch?: number;
  /** Heißsporn: höheres Foulrisiko. */
  hothead?: boolean;
  ownName: string;
  ownStrength: number;
  goalsPerGame: number;
  playerRole: 'start' | 'sub' | 'bench';
  subMinute: number;
  minute: number;
  score: [number, number];
  scenes: FinalScene[];
  next: number;
  log: FinalLogLine[];
  pending: { kind: FinalDecisionKind; minute: number; text: string; options: { id: string; label: string; hint: string }[] } | null;
  playerGoals: number;
  playerAssists: number;
  ratingAdj: number;
  shootout: { own: number; opp: number; round: number; playerKicked: boolean } | null;
  done: boolean;
  won: boolean;
}

export interface DecisionOption {
  id: string;
  label: string;
  hint: string;
}

export interface PendingDecision {
  id: string;
  title: string;
  text: string;
  options: DecisionOption[];
  /** Zusatzdaten, z. B. die vorgeschlagene neue Position. */
  data?: Record<string, string>;
}

export interface DecisionResult {
  title: string;
  text: string;
  tone: 'good' | 'bad' | 'neutral';
}

export interface RivalSeason {
  season: string;
  age: number;
  clubId: string;
  ovrStart: number;
  ovrEnd: number;
  apps: number;
  goals: number;
  assists: number;
  avgRating: number;
  /** Wer hat das Saison-Duell gewonnen? */
  duel: 'player' | 'rival' | 'draw';
}

export interface RivalState {
  name: string;
  nation: string;
  position: Position;
  age: number;
  ovr: number;
  potential: number;
  clubId: string;
  retired: boolean;
  history: RivalSeason[];
}

export interface NewsItem {
  season: string;
  half: 1 | 2;
  tag: 'Du' | 'Transfer' | 'Liga' | 'Rivale' | 'Titel' | 'Verein';
  text: string;
}
