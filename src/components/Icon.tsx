/**
 * Einheitliche Linien-Icons (24×24, Strich in currentColor) statt Emojis.
 * Farbe kommt immer aus CSS. Keine Personen-Icons.
 */
const P: Record<string, string> = {
  ball: 'M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18Z M12 7.5l3.6 2.6-1.4 4.2H9.8L8.4 10.1Z M12 3v4.5 M15.6 10.1l4.9-1.4 M14.2 14.3l2.6 4.4 M9.8 14.3l-2.6 4.4 M8.4 10.1 3.5 8.7',
  pack: 'M5 4h14l1 4v11a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V8Z M4 8h16 M13 10.5l-3 4.5h3l-1 3.5 3.5-5h-3l1-3',
  cards: 'M8 3h10a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z M4 7v12a2 2 0 0 0 2 2h9',
  tactics: 'M3 5h18v14H3Z M12 5v14 M12 9.5a2.5 2.5 0 1 0 0 5a2.5 2.5 0 1 0 0-5Z M3 9.5h2.5v5H3 M21 9.5h-2.5v5H21',
  duel: 'M4 4l9 9 M4 4h4 M4 4v4 M20 4l-9 9 M20 4h-4 M20 4v4 M9.5 15.5l-4 4 M14.5 15.5l4 4 M7.5 13.5l3 3 M16.5 13.5l-3 3',
  puzzle: 'M5 8h3.2a2 2 0 1 1 3.6 0H15v3.2a2 2 0 1 1 0 3.6V18H11.8a2 2 0 1 0-3.6 0H5v-3.2a2 2 0 1 0 0-3.6Z',
  swap: 'M4 9h13l-3.5-3.5 M20 15H7l3.5 3.5',
  folder: 'M3 6a1 1 0 0 1 1-1h5l2 2h9a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1Z M3 10h18',
  trophy: 'M8 4h8v5a4 4 0 0 1-8 0Z M8 6H5a3 3 0 0 0 3 4 M16 6h3a3 3 0 0 1-3 4 M12 13v4 M8.5 20h7 M9.5 17h5v3h-5Z',
  pillars: 'M3 9l9-5 9 5Z M5 9v9 M9.5 9v9 M14.5 9v9 M19 9v9 M3 21h18 M4 18h16',
  cloud: 'M7 18a4 4 0 0 1-.5-8 6 6 0 0 1 11.5 1.5A3.3 3.3 0 0 1 17.5 18Z M12 11v5 M9.8 13.8 12 16l2.2-2.2',
  coin: 'M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18Z M12 6.5a5.5 5.5 0 1 0 0 11a5.5 5.5 0 1 0 0-11Z M12 9.5v5',
  news: 'M4 10v4h3l6 4V6L7 10Z M16.5 9a4 4 0 0 1 0 6 M19 6.5a7.5 7.5 0 0 1 0 11',
  gear: 'M12 9a3 3 0 1 0 0 6a3 3 0 1 0 0-6Z M12 2.5v3 M12 18.5v3 M2.5 12h3 M18.5 12h3 M5.3 5.3l2.1 2.1 M16.6 16.6l2.1 2.1 M5.3 18.7l2.1-2.1 M16.6 7.4l2.1-2.1',
  crown: 'M3 8l4.5 4L12 5l4.5 7L21 8l-2 10H5Z M5 21h14',
  bolt: 'M13 2 4.5 13.5H11L10 22l8.5-11.5H12Z',
  star: 'M12 3l2.7 5.6 6.1.8-4.4 4.3 1 6.1L12 17l-5.4 2.8 1-6.1-4.4-4.3 6.1-.8Z',
  spark: 'M12 3c.8 4.4 2.2 6.2 6.5 7-4.3.8-5.7 2.6-6.5 7-.8-4.4-2.2-6.2-6.5-7 4.3-.8 5.7-2.6 6.5-7Z M18.5 16.5c.3 1.6.8 2.2 2.5 2.5-1.7.3-2.2.9-2.5 2.5-.3-1.6-.8-2.2-2.5-2.5 1.7-.3 2.2-.9 2.5-2.5Z',
  ticket: 'M3 7h18v3a2 2 0 0 0 0 4v3H3v-3a2 2 0 0 0 0-4Z M14 7v10',
  film: 'M4 4h16v16H4Z M8 4v16 M16 4v16 M4 8h4 M4 12h4 M4 16h4 M16 8h4 M16 12h4 M16 16h4',
  gift: 'M4 9h16v4H4Z M5 13h14v8H5Z M12 9v12 M12 9C10 5 6.5 5.5 7.5 8 8 9 12 9 12 9Z M12 9c2-4 5.5-3.5 4.5-1-.5 1-4.5 1-4.5 1Z',
  pumpkin: 'M12 7c-5 0-8 2.5-8 6.5S7 20 12 20s8-2.5 8-6.5S17 7 12 7Z M12 7c-2.5 0-3.5 3-3.5 6.5S9.5 20 12 20 M12 7c2.5 0 3.5 3 3.5 6.5S14.5 20 12 20 M12 7c0-2 1-3.5 2.5-4',
  ghost: 'M5 20V11a7 7 0 0 1 14 0v9l-2.3-1.6L14.3 20 12 18.4 9.7 20l-2.4-1.6Z M9.5 11v1.5 M14.5 11v1.5',
  medal: 'M8 3l2.5 6 M16 3l-2.5 6 M12 9a5.5 5.5 0 1 0 0 11a5.5 5.5 0 1 0 0-11Z M12 12l1 2.1 2.2.3-1.6 1.5.4 2.2-2-1.1-2 1.1.4-2.2-1.6-1.5 2.2-.3Z',
  calendar: 'M4 6h16v14H4Z M4 10h16 M8 3v5 M16 3v5 M8 14h3v3H8Z',
  chart: 'M4 20h16 M5 16l4.5-5 3.5 3 6-7 M15 7h4v4',
  globe: 'M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18Z M3 12h18 M12 3c3 3 3 15 0 18 M12 3c-3 3-3 15 0 18',
  target: 'M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18Z M12 7.5a4.5 4.5 0 1 0 0 9a4.5 4.5 0 1 0 0-9Z M12 11a1 1 0 1 0 0 2a1 1 0 1 0 0-2Z',
  mic: 'M9 4a3 3 0 0 1 6 0v6a3 3 0 0 1-6 0Z M5.5 10a6.5 6.5 0 0 0 13 0 M12 16.5V21 M8.5 21h7',
  boot: 'M5 4h5v6c2 0 4 1 6 2.5 2.5.5 4.5 1.5 4.5 4V18H3.5V15c1.5-1 1.5-3 1.5-5Z M3.5 21h17 M10 13l1.5-1.5 M12.5 14l1.5-1.5',
  stadium: 'M3 9c0-2 4-3.5 9-3.5S21 7 21 9v8c0 2-4 3.5-9 3.5S3 19 3 17Z M3 9c0 2 4 3.5 9 3.5S21 11 21 9 M7 12v7.5 M17 12v7.5 M12 12.5v8',
  link: 'M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1 M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1',
  home: 'M3 11l9-7 9 7 M5.5 9.5V20h13V9.5 M10 20v-6h4v6',
  flag: 'M5 21V4 M5 4h12l-2 4 2 4H5',
  check: 'M4 12.5l5 5L20 6.5',
  close: 'M6 6l12 12 M18 6 6 18',
  lock: 'M6 11h12v10H6Z M8.5 11V8a3.5 3.5 0 0 1 7 0v3 M12 15v2',
  heart: 'M12 20s-8-4.6-8-10.5A4.5 4.5 0 0 1 12 7a4.5 4.5 0 0 1 8 2.5C20 15.4 12 20 12 20Z',
  broken: 'M12 20s-8-4.6-8-10.5A4.5 4.5 0 0 1 12 7a4.5 4.5 0 0 1 8 2.5C20 15.4 12 20 12 20Z M12 7l-1.5 4 3 2-2 4',
  clock: 'M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18Z M12 7v5l3.5 2',
  shirt: 'M8.5 3.5 4 5.5 2.5 10l3.5 1.5V20.5h12V11.5l3.5-1.5L20 5.5l-4.5-2C15 5.5 13.6 6.5 12 6.5S9 5.5 8.5 3.5Z',
  pencil: 'M4 20l1-4.5L16 4.5l3.5 3.5L8.5 19Z M14 6.5l3.5 3.5',
  shield: 'M12 3l7.5 3v6c0 4.5-3.2 7.8-7.5 9-4.3-1.2-7.5-4.5-7.5-9V6Z',
  infinity: 'M12 12c-2-2.6-3.6-4-5.5-4a4 4 0 0 0 0 8c1.9 0 3.5-1.4 5.5-4Zm0 0c2 2.6 3.6 4 5.5 4a4 4 0 0 0 0-8c-1.9 0-3.5 1.4-5.5 4Z',
  expand: 'M4 9V4h5 M15 4h5v5 M20 15v5h-5 M9 20H4v-5',
  shrink: 'M9 4v5H4 M20 9h-5V4 M15 20v-5h5 M4 15h5v5',
  fire: 'M12 21c-4 0-6.5-2.7-6.5-6.3 0-3.7 3-5.6 3.5-9.7 2.5 1.5 4 3.5 4.3 6 1-1 1.5-2.2 1.5-3.6 2.5 1.8 3.7 4.5 3.7 7.3 0 3.6-2.5 6.3-6.5 6.3Z',
  plus: 'M12 5v14 M5 12h14',
  arrow: 'M5 12h14 M13 6l6 6-6 6',
  snow: 'M12 2v20 M3.3 7l17.4 10 M3.3 17l17.4-10 M9 3.5l3 2.5 3-2.5 M9 20.5l3-2.5 3 2.5 M3.6 10.5l3.6-.6-1.2-3.5 M20.4 13.5l-3.6.6 1.2 3.5 M3.6 13.5l3.6.6-1.2 3.5 M20.4 10.5l-3.6-.6 1.2-3.5',
  rise: 'M12 20V5 M6 11l6-6 6 6 M5 20h14',
  evo: 'M4 17l5-5 4 4 7-8 M15 8h5v5 M4 21h16',
  rewind: 'M12 3a9 9 0 1 1-8.5 6 M3.5 4v5h5 M12 7.5V12l3 2',
  bag: 'M5 8h14l-1 12H6Z M9 8V6.5a3 3 0 0 1 6 0V8 M9.5 14h5',
  money: 'M3 6h18v12H3Z M12 9a3 3 0 1 0 0 6a3 3 0 1 0 0-6Z M6 9v.01 M18 15v.01',
  dice: 'M5 4h14a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Z M8.5 8.5h.01 M15.5 8.5h.01 M12 12h.01 M8.5 15.5h.01 M15.5 15.5h.01',
  cross: 'M9 3h6v6h6v6h-6v6H9v-6H3V9h6Z',
  chat: 'M4 5h16v11H9l-5 4Z M8 9.5h8 M8 12.5h5',
  dot: 'M12 8a4 4 0 1 0 0 8a4 4 0 1 0 0-8Z',
  eye: 'M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z M12 9a3 3 0 1 0 0 6a3 3 0 1 0 0-6Z',
  rocket: 'M12 3c3.5 2 5 5.5 5 9.5L15 15H9l-2-2.5C7 8.5 8.5 5 12 3Z M12 8.5a1.5 1.5 0 1 0 0 3a1.5 1.5 0 1 0 0-3Z M9 15l-2.5 3.5L9 18 M15 15l2.5 3.5L15 18 M12 16v5',
  music: 'M9 18V5l11-2v13 M9 18a2.5 2.5 0 1 1-5 0a2.5 2.5 0 1 1 5 0Z M20 16a2.5 2.5 0 1 1-5 0a2.5 2.5 0 1 1 5 0Z',
  book: 'M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2Z M4 21a2 2 0 0 1 2-2h13v2 M8 7h7',
  warn: 'M12 3 2.5 20h19Z M12 9.5v5 M12 17.5v.01',
  info: 'M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18Z M12 11v6 M12 7.5v.01',
  whistle: 'M3 10h11a5 5 0 1 1-4.6 7H7l-4-3Z M14 10V6h4 M14.5 15h.01',
  car: 'M4 16v-4l2.5-5h11l2.5 5v4Z M3 16h18v3H3Z M7 19v1.5 M17 19v1.5 M4 12h16 M7 14h.01 M17 14h.01',
  plane: 'M3 13l7-1.5L13.5 4h2l-1.5 7.5L21 10v2.5l-7 2L12.5 20h-2l.5-4.5-6 1Z',
  pin: 'M12 21s-6.5-6-6.5-11a6.5 6.5 0 0 1 13 0c0 5-6.5 11-6.5 11Z M12 7.5a2.5 2.5 0 1 0 0 5a2.5 2.5 0 1 0 0-5Z',
  key: 'M8 10a4 4 0 1 0 0 8a4 4 0 1 0 0-8Z M11 12 20 3 M17 6l2.5 2.5 M14.5 8.5l2 2',
  handshake: 'M3 10l4-4 5 2 5-2 4 4-5 6-4-3-4 3Z M9 13l3 3 M12 13l2.5 2.5',
  brain: 'M9 4a3 3 0 0 0-3 3 3 3 0 0 0-2 5.5A3.5 3.5 0 0 0 7.5 18 3 3 0 0 0 12 20V5a3 3 0 0 0-3-1Z M15 4a3 3 0 0 1 3 3 3 3 0 0 1 2 5.5 3.5 3.5 0 0 1-3.5 5.5A3 3 0 0 1 12 20',
  sun: 'M12 8a4 4 0 1 0 0 8a4 4 0 1 0 0-8Z M12 2.5v2 M12 19.5v2 M2.5 12h2 M19.5 12h2 M5.3 5.3l1.4 1.4 M17.3 17.3l1.4 1.4 M5.3 18.7l1.4-1.4 M17.3 6.7l1.4-1.4',
  moon: 'M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5Z',
  wave: 'M3 15c3 0 3-3 6-3s3 3 6 3 3-3 6-3 M3 19c3 0 3-3 6-3s3 3 6 3 3-3 6-3',
};

export type IconName = keyof typeof P;

export default function Icon({ name, size = 24, className }: { name: IconName | string; size?: number; className?: string }) {
  const d = P[name] ?? P.dot;
  return (
    <svg className={`ic ${className ?? ''}`} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <path d={d} />
    </svg>
  );
}

/** Emoji → Linien-Icon, für Daten, die noch ein Emoji als „icon“-Feld mitbringen. */
const FROM_EMOJI: Record<string, IconName> = {
  '🎩': 'star', '🧊': 'snow', '🌋': 'fire', '🎆': 'spark', '🦁': 'shield', '🍾': 'music',
  '⚽': 'ball', '🎁': 'gift', '🗂': 'cards', '🛡': 'shield', '⚔': 'duel', '🧩': 'puzzle', '🔄': 'swap', '🏠': 'home', '🏡': 'home',
  '🏆': 'trophy', '🏛': 'pillars', '💾': 'cloud', '🪙': 'coin', '📣': 'news', '⚙': 'gear', '👑': 'crown', '⚡': 'bolt', '⭐': 'star',
  '🌟': 'star', '✦': 'spark', '✨': 'spark', '🎟': 'ticket', '🎬': 'film', '🎃': 'pumpkin', '👻': 'ghost', '🏅': 'medal', '🥇': 'medal',
  '🥈': 'medal', '🥉': 'medal', '📅': 'calendar', '📈': 'chart', '📊': 'chart', '🌍': 'globe', '🌎': 'globe', '🌏': 'globe', '✪': 'star',
  '🎙': 'mic', '🎤': 'mic', '👟': 'boot', '🏟': 'stadium', '🔗': 'link', '🏁': 'flag', '✅': 'check', '✔': 'check', '❌': 'close',
  '🔒': 'lock', '❤': 'heart', '🧡': 'heart', '💛': 'heart', '💚': 'heart', '💙': 'heart', '💜': 'heart', '💔': 'broken', '🕰': 'clock',
  '⏰': 'clock', '⏳': 'clock', '⌛': 'clock', '🎽': 'shirt', '👕': 'shirt', '✏': 'pencil', '📝': 'pencil', '🔥': 'fire', '☄': 'rocket', '💰': 'money',
  '💶': 'money', '💵': 'money', '💸': 'money', '🎲': 'dice', '🎰': 'dice', '🃏': 'cards', '🏥': 'cross', '🩹': 'cross', '💊': 'cross',
  '💬': 'chat', '📰': 'news', '📢': 'news', '🚀': 'rocket', '🎵': 'music', '🎶': 'music', '📚': 'book', '📖': 'book', '⚠': 'warn',
  'ℹ': 'info', '📈️': 'chart', '🚗': 'car', '🏎': 'car', '✈': 'plane', '📍': 'pin', '🔑': 'key', '🤝': 'handshake', '🧠': 'brain',
  '☀': 'sun', '🌙': 'moon', '🌊': 'wave', '🎯': 'target', '🛍': 'bag', '👀': 'eye', '🎉': 'spark', '🎊': 'spark', '💎': 'spark',
  '🏃': 'boot', '🥅': 'target', '🧤': 'shield', '📱': 'chat', '🏋': 'bolt', '💪': 'bolt', '🍀': 'spark', '🎓': 'book', '🏦': 'pillars',
  '📦': 'pack', '🔁': 'swap', '↩': 'rewind', '⏪': 'rewind', '🔮': 'eye', '🎭': 'film', '🧾': 'book', '🗞': 'news', '📺': 'film',
};

const EMOJI_RE = /\p{Extended_Pictographic}/u;

export function iconForEmoji(e: string): IconName {
  const base = [...e.replace(/️/g, '')][0] ?? '';
  return FROM_EMOJI[base] ?? 'dot';
}

/** Zeigt ein Daten-Icon: Emoji wird zum Linien-Icon, Flaggen/Text bleiben. */
export function Glyph({ e, size = 20, className }: { e: string; size?: number; className?: string }) {
  if (!EMOJI_RE.test(e)) return <span className={className}>{e}</span>;
  return <Icon name={iconForEmoji(e)} size={size} className={className} />;
}

/** Entfernt Emojis (inkl. Varianten-Selektoren) aus Oberflächen-Text. */
export function noEmoji(s: string): string {
  return s.replace(/[\p{Extended_Pictographic}️‍]/gu, '').replace(/\s{2,}/g, ' ').trim();
}
