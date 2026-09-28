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
  phase: 'season' | 'winter' | 'window' | 'retired';
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
