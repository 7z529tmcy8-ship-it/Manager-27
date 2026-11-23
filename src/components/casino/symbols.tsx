import type { Sym } from '../../game/casino';

/** Klassische Automaten-Symbole als eigene SVG-Grafiken (keine Emojis, keine fremden Bilder). */
export function SlotSym({ s, size = 40 }: { s: Sym; size?: number }) {
  const p = { width: size, height: size, viewBox: '0 0 48 48', 'aria-hidden': true as const, className: `slot-sym y-${s}` };
  switch (s) {
    case 'cherry': return (
      <svg {...p}><path d="M24 6c2 8 6 12 14 14M24 6c-2 8-8 14-12 18" stroke="#3ccf5a" strokeWidth="3" fill="none" strokeLinecap="round" />
        <circle cx="13" cy="32" r="9" fill="#ff2d4a" /><circle cx="33" cy="34" r="9" fill="#e0102f" /><circle cx="10" cy="29" r="2.5" fill="#fff" opacity=".7" /><circle cx="30" cy="31" r="2.5" fill="#fff" opacity=".7" /></svg>);
    case 'lemon': return (
      <svg {...p}><ellipse cx="24" cy="25" rx="17" ry="13" fill="#ffe23d" stroke="#e8b900" strokeWidth="2" /><ellipse cx="18" cy="20" rx="5" ry="3" fill="#fff" opacity=".6" /><circle cx="41" cy="25" r="2.5" fill="#e8b900" /><circle cx="7" cy="25" r="2.5" fill="#e8b900" /></svg>);
    case 'plum': return (
      <svg {...p}><circle cx="24" cy="27" r="15" fill="#8b3cf0" stroke="#5a1ab0" strokeWidth="2" /><path d="M24 12c1-4 4-6 8-6" stroke="#3ccf5a" strokeWidth="3" fill="none" strokeLinecap="round" /><ellipse cx="18" cy="21" rx="4" ry="3" fill="#fff" opacity=".5" /></svg>);
    case 'bell': return (
      <svg {...p}><path d="M24 6c-8 0-12 7-12 15v8l-4 6h32l-4-6v-8c0-8-4-15-12-15z" fill="#ffc21a" stroke="#c98a00" strokeWidth="2" /><circle cx="24" cy="39" r="4" fill="#c98a00" /><path d="M18 14c2-3 4-4 6-4" stroke="#fff" strokeWidth="2.5" fill="none" opacity=".7" strokeLinecap="round" /></svg>);
    case 'bar': return (
      <svg {...p}><rect x="4" y="14" width="40" height="20" rx="4" fill="#111" stroke="#ffd24a" strokeWidth="2.5" /><text x="24" y="29" textAnchor="middle" fontSize="13" fontWeight="900" fill="#ffd24a" fontFamily="system-ui, sans-serif">BAR</text></svg>);
    case 'seven': return (
      <svg {...p}><text x="24" y="40" textAnchor="middle" fontSize="40" fontWeight="900" fill="#ff1f3d" stroke="#fff" strokeWidth="1.5" fontFamily="Georgia, serif">7</text></svg>);
    case 'diamond': return (
      <svg {...p}><path d="M24 42 6 18l7-10h22l7 10z" fill="#4fe6ff" stroke="#fff" strokeWidth="2" /><path d="M6 18h36M13 8l5 10 6-10 6 10 5-10M18 18l6 24 6-24" stroke="#fff" strokeWidth="1.5" fill="none" opacity=".75" /></svg>);
    case 'star': return (
      <svg {...p}><path d="m24 4 6 13 14 1.5-10.5 9.5 3 14L24 35l-12.5 7 3-14L4 18.5 18 17z" fill="#ffd24a" stroke="#fff" strokeWidth="2" /></svg>);
  }
}
export const SYM_NAME: Record<Sym, string> = { cherry: 'Kirsche', lemon: 'Zitrone', plum: 'Pflaume', bell: 'Glocke', bar: 'BAR', seven: 'Sieben', diamond: 'Diamant (Joker)', star: 'Stern (Freispiele)' };
