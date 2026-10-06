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
  tier: 1 | 2 | 3 | 4 | 5 | 6;
  /** Durchschnittliche Tore pro Spiel in dieser Liga. */
  goalsPerGame: number;
  /** Anzahl Startplätze für CL / EL / Conference League. */
  europe: { cl: number; el: number; conf: number };
  /** Direkte Auf-/Abstiegsplätze in die verbundene Liga. */
  up?: { leagueId: string; spots: number };
  down?: { leagueId: string; spots: number };
  /** Grobe Torjägerkanonen-Marke (Tore des Torschützenkönigs im Schnitt). */
  topScorerGoals: number;
  /** Exotische Liga (MLS, Saudi-Arabien …): Angebote von dort erst gegen Karriereende. */
  exotic?: boolean;
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
  /** Potenzial beim ersten Saisonabschluss – natürliches Wachstum endet 2 Punkte darüber. */
  potentialStart?: number;
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
  /** Wie oft der Körper durch die „volle Kur“ gelitten hat – beschleunigt den Abbau. */
  burnout?: number;
  /** Verborgen: abhängig von Drogen (wird nirgends angezeigt). */
  hooked?: boolean;
  /** Hat heimlich Geld von Wettbetrügern angenommen – kann auffliegen. */
  bettingSecret?: boolean;
  /** Spiele Sperre, die zum Start der nächsten Halbserie anfallen. */
  carryBanMatches?: number;
  /** Nebenprojekt abseits des Platzes (Rapalbum, Modemarke, Streaming). */
  sideProject?: SideProject | null;
  /** Spieler ist nicht verfügbar (z. B. entführt) und steht in keinem Spiel im Kader. */
  absent?: boolean;
  /** Charaktereigenschaften (z. B. Heißsporn, Showman). */
  traits?: TraitId[];
  /** Trainingsschwerpunkt: Index des Attributs, 'balanced' oder 'rest'. */
  trainingFocus?: TrainingFocus;
  /** Durch Training gewonnene Attributpunkte (für die Obergrenze). */
  trainingGains?: number[];
  /** Spielertyp, Erfahrungspunkte und freigeschaltete Fähigkeiten. */
  skills?: PlayerSkills;
  /** Körperbau (nur bei selbst erstellten Spielern). */
  height?: number;
  weight?: number;
}

export interface PlayerSkills {
  archetype: import('./skills').ArchetypeId;
  xp: number;
  unlocked: string[];
  /** In der laufenden Saison bereits gutgeschriebene EP. */
  seasonXp: number;
  /** Punkte wurden schon einmal neu verteilt (geht nur einmal pro Karriere). */
  respecUsed?: boolean;
  /** Meldung nach der letzten Pause, z. B. „+320 EP · Level 4“. */
  note?: string;
}

export type TrainingFocus = number | 'balanced' | 'rest';

export interface SideProject {
  kind: 'rap' | 'fashion' | 'stream';
  since: string;
  hits: number;
  flops: number;
}

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
  /** Etappe der Saison (0–5). */
  stage?: number;
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
  /** Nächste zu spielende Etappe (0–6). */
  stage?: number;
  /** Gewählte Belastung für die nächste Etappe. */
  load?: StageLoad;
  stageLog?: StageSummary[];
  /** Trainingslager in dieser Winterpause schon absolviert. */
  campDone?: boolean;
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
  /** Besondere Angebote gegen Karriereende: Rückkehr zum Heimatverein oder Abenteuer im Ausland. */
  tag?: 'home' | 'exotic';
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
  /** Saison, deren Story schon angesehen wurde. */
  storySeen?: string;
  /** Rücktritt vom Rücktritt wurde bereits genutzt. */
  comebackUsed?: boolean;
  /** Freigeschaltete Erfolge: ID → Saison. */
  unlocked?: Record<string, string>;
  /** Laufende Saison zwischen Hin- und Rückrunde. */
  progress?: SeasonProgress | null;
  /** Wie viele Angebotsrunden in diesem Fenster noch angefragt werden können. */
  requestsLeft: number;
  /** Vereinsstärken können sich über die Jahre leicht verändern. */
  clubDrift: Record<string, number>;
  /** Dauerhafte Stärkung durch Investoren-Geld (Vereins-ID → Stärkepunkte). Klingt ohne neues Geld langsam ab. */
  clubBacking?: Record<string, number>;
  /** Europapokal-Startplätze aus der Vorsaison (Vereins-ID → Wettbewerb). */
  europeSlots: Record<string, Competition>;
  /** Aktuelle Ligazugehörigkeit (ändert sich durch Auf- und Abstieg). */
  clubLeague: Record<string, string>;
  retiredReason?: string;
  /** Eigene Bewerbungen im aktuellen Transferfenster (ab 30 Jahren). */
  applications?: Application[];
  /** Alle Vereinswechsel inkl. Leihen (für Transferhistorie und Gesamt-Ablöse). */
  transfers?: TransferEntry[];
  /** Dem Spieler gehört ein Verein (nach dem Lottogewinn). */
  owner?: Ownership | null;
  /** Jahr, in dem zuletzt ein Lottoschein gekauft wurde (einer pro Sommer). */
  lottoYear?: number;
  /** Lotto-Jackpot wurde schon geknackt (nur einmal pro Karriere). */
  lottoWon?: boolean;
  /** Einstellungen dieser Karriere. */
  settings?: CareerSettings;
  /** Postfach mit persönlichen Nachrichten. */
  inbox?: InboxItem[];
  /** Kontostand in € (Spielgeld aus dem Gehalt). */
  cash?: number;
  /** Statistik im Glückspalast. */
  casino?: CasinoStats;
  /** Verdiente Sonderkarten (Team der Saison usw.). */
  specialCards?: SpecialCard[];
  /** Saison, in der der Trainingsboost aus einem Pack schon benutzt wurde. */
  boostSeason?: string;
  /** Gescheitertes Talent, das eine zweite Chance bekommt. */
  secondChance?: boolean;
  /** Anzahl gegebener Pressekonferenzen. */
  pressCount?: number;
  /** Verein, bei dem die Karriere begann (für die Heimkehr gegen Karriereende). */
  homeClubId?: string;
  /** Spieler ist für den letzten Akt zum Heimatverein zurückgekehrt. */
  homecoming?: boolean;
  /** Skandal-Zähler (0–100) aus Aktionen abseits des Platzes. */
  scandal?: number;
  /** Wie oft der Verein schon den Vertrag wegen Skandalen aufgelöst hat. */
  scandalStrikes?: number;
  /** Bereits erwischt: beim zweiten Mal gibt es keine Gnade mehr. */
  caughtBetting?: boolean;
  caughtDoping?: boolean;
  /** Wie oft beim Dealer eingekauft wurde. */
  drugUses?: number;
  /** Verborgen: Pausen, in denen das Geld noch „verschwinden“ muss (wird beim Speichern verrechnet). */
  drainPending?: number;
  /** Pause, in der schon eine Aktion abseits des Platzes gemacht wurde (eine pro Pause). */
  viceBreak?: string;
  /** Pause, in der zuletzt eine Behandlung in der Klinik war (eine pro Pause). */
  clinicBreak?: string;
  /** Ergebnis der letzten Behandlung. */
  clinicNote?: DecisionResult | null;
  /** Glamour durch Schönheits-OPs – bringt Werbedeals. */
  glam?: number;
  /** Ergebnis der letzten Aktion abseits des Platzes. */
  viceNote?: DecisionResult | null;
  /** Karriere durch Skandale beendet. */
  destroyed?: boolean;
  /** Trainerkarriere nach dem Karriereende. */
  coach?: CoachState | null;
  /** Familie (Kinder) und Vermögen (Immobilien, Klub-Anteile). */
  household?: Household;
}

// ---------- Familie & Vermögen ----------

export interface ChildStats {
  fitness: number;
  technique: number;
  discipline: number;
  school: number;
  social: number;
  happiness: number;
}

export interface Child {
  id: string;
  name: string;
  /** Familienjahr der Geburt (Alter = household.year − bornYear). */
  bornYear: number;
  /** Verstecktes Fußballtalent (20–95), teils vom Vater geerbt. */
  talent: number;
  stats: ChildStats;
  /** Gewohnheiten, z. B. wie oft gezockt oder Fastfood gegessen wurde. */
  habits: Record<string, number>;
  status: 'kid' | 'pro' | 'amateur' | 'retired';
  /** Erziehungsregeln (Regel → gewählte Option), wirken jedes Jahr. */
  rules?: Partial<Record<import('./family').RuleId, string>>;
  ovr?: number;
  potential?: number;
  clubId?: string;
  /** Insgesamt verdiente Coins (als Profi). */
  earned: number;
  /** Letzte Meldungen zum Kind. */
  log: string[];
}

export interface PendingChoice {
  childId: string;
  templateId: string;
  /** Gewählte Option (Index) – leer, solange offen. */
  chosen?: number;
}

export interface PropertyHolding {
  id: string;
  /** Aktueller Wert in Coins. */
  value: number;
  /** Kaufpreis. */
  bought: number;
}

export interface ShareHolding {
  clubId: string;
  /** Anteil in Prozent (1–49). */
  percent: number;
  /** Insgesamt investierte Coins. */
  invested: number;
  /** Insgesamt zusätzlich in den Klub gestecktes Geld (Kader, Infrastruktur). */
  injected?: number;
  /** Alt (frühere Version): verborgene Stärkung durch eingestecktes Geld. */
  injectedBoost?: number;
  /** Alt (frühere Version): Stärkung, die beim nächsten Saisonabschluss wirkt. */
  pendingBoost?: number;
  /** Ausbau-Budget: eingestecktes Geld, das der Klub über die nächsten Jahre verbaut. */
  fund?: number;
  /** Liga beim letzten Jahresabschluss (für Aufstiegs-Meldungen). */
  lastLeague?: string;
}

export interface YearReport {
  year: number;
  kidIncome: number;
  /** Kosten der Erziehung (Verein, Nachhilfe …). */
  kidCosts?: number;
  rent: number;
  dividends: number;
  notes: string[];
  /** Meldungen zu Immobilien und Klub-Anteilen (ältere Spielstände: in notes). */
  investNotes?: string[];
}

export interface Household {
  /** Familienjahr – zählt mit jeder Saison (Spieler oder Trainer) bzw. jedem Ruhestandsjahr hoch. */
  year: number;
  children: Child[];
  /** Entscheidungen für das laufende Jahr (5 pro Kind). */
  pending: PendingChoice[];
  properties: PropertyHolding[];
  shares: ShareHolding[];
  /** Alle bisher verdienten Coins aus Kindern, Mieten und Dividenden (werden dem Club gutgeschrieben). */
  totalIncome: number;
  report?: YearReport | null;
  /** Die Einladung kam schon (nur einmal pro Karriere). */
  flirtUsed?: boolean;
  /** Offene Einladung zur After-Party (großes Pop-up). */
  flirt?: { text: string } | null;
  /** Gerade geborenes Kind (großes Pop-up). */
  birth?: { childId: string } | null;
  /** Familienjahr, in dem der Ruhestand ohne Trainerjob begann (für das Alter des Vaters). */
  retiredYear?: number;
}

export interface CoachSeason {
  season: string;
  /** Alter des Trainers in dieser Saison. */
  age: number;
  clubId: string;
  leagueId: string;
  position: number;
  /** Erwarteter Platz laut Kaderstärke (Vorgabe des Vereins). */
  expected: number;
  points: number;
  trophies: string[];
  /** Trainerwert am Saisonende. */
  rating: number;
  sacked: boolean;
  tactic?: CoachTactic;
  signings?: string[];
}

export interface CoachState {
  clubId: string | null;
  /** Trainerwert (ähnlich der Gesamtwertung beim Spieler), beeinflusst die Teamstärke. */
  rating: number;
  age: number;
  year: number;
  history: CoachSeason[];
  /** Angebote (Vereins-IDs) im Sommer bzw. direkt nach dem Karriereende oder einer Entlassung. */
  offers: string[];
  /** choose = Verein wählen, prep = Saisonvorbereitung, first = Hinrunde läuft, winter = Winterpause, season = alter Spielstand. */
  phase: 'choose' | 'prep' | 'winter' | 'season' | 'done';
  /** Meldung zur letzten Saison bzw. Entscheidung. */
  note?: string;
  /** Laufende Trainersaison. */
  live?: CoachLive | null;
}

export type CoachTactic = 'attack' | 'balanced' | 'defend';

export interface TransferTarget {
  id: string;
  name: string;
  position: Position;
  nation: string;
  age: number;
  ovr: number;
  fee: number;
  /** Aktueller Verein (nur bei echten Spielern). */
  fromClubId?: string;
}

export interface CoachLive {
  tactic: CoachTactic;
  /** Zusätzliche Teamstärke aus Transfers, Trainingslager und Kabinenansprache. */
  boost: number;
  budget: number;
  targets: TransferTarget[];
  signings: TransferTarget[];
  /** Tabellen aller Ligen während der Saison. */
  rows: Record<string, TableRow[]>;
  strength: Record<string, number>;
  expected: number;
  /** Ergebnisse des eigenen Teams: S/U/N. */
  form: ('S' | 'U' | 'N')[];
  /** Entscheidung in der Winterpause wurde getroffen. */
  winterDone?: boolean;
}

export type Difficulty = 'easy' | 'normal' | 'hard';
export type PressFrequency = 'off' | 'rare' | 'normal' | 'often';

export interface CareerSettings {
  difficulty?: Difficulty;
  press?: PressFrequency;
}

export type InboxKind = 'welcome' | 'goals' | 'season' | 'offer' | 'contract' | 'transfer' | 'event' | 'decision' | 'press' | 'achievement' | 'lotto' | 'casino' | 'holiday' | 'retire';

export interface InboxItem {
  id: string;
  season: string;
  kind: InboxKind;
  title: string;
  text: string;
  read: boolean;
  /** Wohin „Öffnen“ führt. */
  action?: 'season' | 'transfers' | 'career' | 'news';
}

export interface CasinoSpin {
  reels: string[];
  bet: number;
  win: number;
  factor: number;
  /** Nach dieser Drehung gab es ein Paparazzi-Foto. */
  paparazzi?: boolean;
}

export interface CasinoStats {
  spins: number;
  wagered: number;
  won: number;
  biggestWin: number;
  jackpots: number;
  last?: CasinoSpin;
}

export type SpecialType = 'tots' | 'potm' | 'record' | 'champion';

export interface SpecialCard {
  type: SpecialType;
  season: string;
  name: string;
  position: Position;
  nation: string;
  clubId: string;
  ovr: number;
}

export interface Ownership {
  clubId: string;
  since: string;
  /** Übriges Geld aus dem Lottogewinn in €. */
  budget: number;
  /** Zusätzliche Vereinsstärke durch Investitionen. */
  boost: number;
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

export type StageLoad = 'full' | 'normal' | 'rest' | 'extra';

export interface StageSummary {
  stage: number;
  leagueId: string;
  apps: number;
  goals: number;
  assists: number;
  avgRating: number | null;
  position: number;
  points: number;
}
