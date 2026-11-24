// Spielmodus: Seit dem „UgursCasino“-Umbau startet das Spiel direkt im Casino.
// Karriere, Team, Shop, Duelle und Profil sind NICHT gelöscht – nur ausgeblendet.
// Zum Zurückholen einfach auf false stellen.
export const CASINO_ONLY = false;

export const APP_NAME = CASINO_ONLY ? 'UgursCasino' : 'Manager Sim';

// Karten gibt es nur noch über die Karriere (Saison-Drops, Sonderkarten, Karriereende-Belohnung).
// Shop, Willkommens-Pack, Tages-Gold-Pack, Rivals-Karten und Casino-Karten sind ausgeschaltet (nicht gelöscht) –
// stattdessen gibt es Coins bzw. Chips. Zum Zurückholen auf false stellen.
export const CARDS_FROM_CAREER_ONLY = true;
