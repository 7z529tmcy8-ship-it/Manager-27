// Flaggen-Emojis für die Nationen im Spiel (Länder ohne eigenes Emoji bekommen eine neutrale Flagge).
const FLAGS: Record<string, string> = {
  Argentinien: '🇦🇷', Belgien: '🇧🇪', Brasilien: '🇧🇷', Deutschland: '🇩🇪', Dänemark: '🇩🇰', Elfenbeinküste: '🇨🇮',
  England: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', Frankreich: '🇫🇷', Guinea: '🇬🇳', Irland: '🇮🇪', Italien: '🇮🇹', Japan: '🇯🇵', Kolumbien: '🇨🇴',
  Kroatien: '🇭🇷', Niederlande: '🇳🇱', Norwegen: '🇳🇴', Polen: '🇵🇱', Portugal: '🇵🇹', Schweden: '🇸🇪', Schweiz: '🇨🇭',
  Spanien: '🇪🇸', Südkorea: '🇰🇷', Türkei: '🇹🇷', USA: '🇺🇸', Ägypten: '🇪🇬', Österreich: '🇦🇹', Marokko: '🇲🇦',
  Mexiko: '🇲🇽', Ghana: '🇬🇭', Schottland: '🏴󠁧󠁢󠁳󠁣󠁴󠁿', Wales: '🏴󠁧󠁢󠁷󠁬󠁳󠁿', Uruguay: '🇺🇾', Senegal: '🇸🇳', Nigeria: '🇳🇬',
  Kamerun: '🇨🇲', Ukraine: '🇺🇦', Serbien: '🇷🇸', Georgien: '🇬🇪', Ungarn: '🇭🇺', Tschechien: '🇨🇿', Griechenland: '🇬🇷',
  Kanada: '🇨🇦', Australien: '🇦🇺', Algerien: '🇩🇿', Tunesien: '🇹🇳', Slowenien: '🇸🇮', Slowakei: '🇸🇰', Finnland: '🇫🇮',
};

export const flagOf = (nation: string) => FLAGS[nation] ?? '🏳️';
export const nationCode = (nation: string) =>
  ({ Deutschland: 'GER', England: 'ENG', Spanien: 'ESP', Frankreich: 'FRA', Italien: 'ITA', Niederlande: 'NED', Portugal: 'POR', Brasilien: 'BRA', Argentinien: 'ARG', Österreich: 'AUT', Schweiz: 'SUI', Türkei: 'TUR', Kroatien: 'CRO', Dänemark: 'DEN', Japan: 'JPN', Südkorea: 'KOR' } as Record<string, string>)[nation] ??
  nation.slice(0, 3).toUpperCase();
