import type { FlexAction, LookIcon } from '../game/larp';

type GlyphId = LookIcon | FlexAction['icon'] | 'empty';

/** Linien-Icons im Old-Money-Stil (24er Raster, eine Strichstärke, keine Gesichter). */
const PATHS: Record<GlyphId, string> = {
  sneaker: 'M3 15.5c0-1.5.7-2.5 2-3l3-1.2 2.2-3.3h2.3l.8 2.2c1.6.9 3.6 1.3 6.2 1.4 1.4.1 2.5 1.2 2.5 2.6V16a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1.5ZM3.5 17v1.5h17V17M9 11.5l1.5 1M11 10.5l1.5 1',
  loafer: 'M3 16c0-1.7 1.2-2.8 3-3.2l4-.8c1.5-1.6 3.4-2.5 5.6-2.5 2.7 0 5.4 1.7 5.4 4.6V16a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1Zm0 1v1.5h18V17M10.5 12.5h4',
  boat: 'M3 15c0-1.5 1-2.4 2.5-2.7L9 11.5l2-2.5h3l1 2c2 .5 4 .8 5.5 1 1 .2 1.5.9 1.5 1.8V16a1 1 0 0 1-1 1H4a1 1 0 0 1-1-2Zm0 2v1.5h18V17M9 13.5c2 .6 4.5.6 7 0M12 11l.8 2.2',
  sweater: 'M8 4.5 4 7l1.5 5 2-.8V20h9v-8.8l2 .8L20 7l-4-2.5c-.5 1.5-2.1 2.5-4 2.5s-3.5-1-4-2.5ZM7.5 20h9',
  zip: 'M8 4.5 4 7.5l1.5 4.5 2-.8V20h9v-8.8l2 .8L20 7.5l-4-3H8Zm4 0v6M10.5 6l1.5 1.2L13.5 6M12 10.5v1',
  shirt: 'M8.5 4.5 4.5 7l1.5 4.5 2-.8V20h8v-9.3l2 .8L19.5 7l-4-2.5-2 2.3h-3l-2-2.3ZM10.5 6.8 12 9.5l1.5-2.7M12 12v.01M12 15v.01',
  polo: 'M8.5 4.5 4.5 7l1.5 4.5 2-.8V20h8v-9.3l2 .8L19.5 7l-4-2.5M8.5 4.5l1.5 3h4l1.5-3M10 4.5l2 3 2-3M12 7.5V11',
  watch: 'M9 3h6l.7 3.2M9 3l-.7 3.2M9 21h6l.7-3.2M9 21l-.7-3.2M12 6.2a5.8 5.8 0 1 1 0 11.6 5.8 5.8 0 0 1 0-11.6ZM12 9v3l2 1.5M17.8 11.5h1',
  pearls: 'M5 6c0 6 3 10 7 10s7-4 7-10M5.5 9.5h.01M7 12.6h.01M9.2 14.9h.01M12 16h.01M14.8 14.9h.01M17 12.6h.01M18.5 9.5h.01M12 16v2.5',
  shades: 'M2.5 10h19M4 10l.8 4.2a2 2 0 0 0 2 1.6h2a2 2 0 0 0 2-1.8l.2-1.8M20 10l-.8 4.2a2 2 0 0 1-2 1.6h-2a2 2 0 0 1-2-1.8l-.2-1.8M11 12h2',
  ring: 'M12 9.5a5.5 5.5 0 1 1 0 11 5.5 5.5 0 0 1 0-11ZM9.5 4.5h5l1 3-3.5 2-3.5-2 1-3ZM12 5.8v1.6',
  jacket: 'M8 3.5h8l1 2 3 2V20h-5.5V12M8 3.5l-1 2-3 2V20h5.5V12M8 3.5l4 5 4-5M12 8.5V20M6 13h2M16 13h2',
  racket: 'M14.5 3.5a5 5 0 1 1 0 10 5 5 0 0 1 0-10ZM10.8 12l-6.3 6.3 1.2 1.2 6.3-6.3M12 6.5l5 5M11.5 9.2l3.3 3.3M14.2 5.5l3.8 3.8',
  tote: 'M5 9h14l-1.2 11H6.2L5 9Zm4 0V7a3 3 0 0 1 6 0v2M9 13.5c1.8 1.2 4.2 1.2 6 0',
  dog: 'M6 9.5 4 7l1-3 3 2.5h6l3-2.5 1 3-2 2.5v3c0 2.5-1.5 4.5-3.5 5.2V20h-3v-2.3C7.5 17 6 15 6 12.5v-3ZM10 15.5h4M12 14.5v1',
  brunch: 'M3.5 13h17M5 13a7 7 0 0 0 14 0M12 6V4M9 7l-.7-1.5M15 7l.7-1.5M8 20h8',
  car: 'M3 15.5V13l2-4.5h10.5L20 12l1 1v2.5a1 1 0 0 1-1 1h-1.2M3 15.5a1 1 0 0 0 1 1h1.2M8.8 16.5h6.4M7 15a1.8 1.8 0 1 1 0 3.6A1.8 1.8 0 0 1 7 15Zm10 0a1.8 1.8 0 1 1 0 3.6 1.8 1.8 0 0 1 0-3.6ZM6 12.5h12',
  island: 'M3 19c3-2 6-2 9 0s6 2 9 0M12 16V8M12 8C10 5.5 6.5 5.5 5 7.5M12 8c2-2.5 5.5-2.5 7-.5M12 8c-1-2.5-.5-4.5 1.5-5.5M8 16.5c1.2-1 2.6-1.5 4-1.5s2.8.5 4 1.5',
  yacht: 'M3 16h18l-2.5 3.5H5.5L3 16Zm3-1.5V12h11l2 2.5M8.5 12V9.5h6.5L16.5 12M11 9.5V5M11 5l4.5 4.5',
  mallet: 'M5 20 14 7M14 7l1.5-2.5M12.5 9.5l3.5 2.5M17.5 18a1.8 1.8 0 1 1 0-3.6 1.8 1.8 0 0 1 0 3.6ZM3 20h18',
  jet: 'M2.5 13.5 21 8.5c.5-.1 1 .3.9.8-.2.9-1 1.6-1.9 1.9L5.5 15.5l-3-2ZM9 11.6 7 6h2.5l4.5 4.3M10.5 13.8 9.5 18H12l3.5-5.5',
  empty: 'M7 12h10',
};

export default function LarpGlyph({ id, size = 24, className = '' }: { id: GlyphId; size?: number; className?: string }) {
  return (
    <svg className={`larp-glyph ${className}`} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={PATHS[id]} />
    </svg>
  );
}
