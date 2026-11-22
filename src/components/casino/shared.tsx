import { useEffect, useRef, useState } from 'react';
import { getClubState, setClubState, trackDailyGoal, useClub } from '../../clubStore';
import { grantDuelXp, xpTarget } from '../../game/careerDuels';
import { addCard, bigWinOf, casinoOf, maxBet, payout, placeBet, randomCard, takeJackpot, type BigWin, type PlayEvent } from '../../game/casino';
import type { CollectCard } from '../../game/club';
import { listCareers, saveCareer } from '../../game/storage';
import { play } from '../../sound';
import Icon from '../Icon';

export const sfx = (id: Parameters<typeof play>[0]) => { try { play(id); } catch { /* kein Ton */ } };
export const buzz = (ms: number | number[]) => { try { navigator.vibrate?.(ms); } catch { /* egal */ } };
// Ein gemeinsamer Zahlen-Formatierer: toLocaleString baut sonst bei jedem Aufruf einen neuen – das bremst bei vielen Zahlen pro Bild.
const NF = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 0 });
const NF1 = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 1 });
export const fmt = (n: number) => (Number.isFinite(n) ? NF.format(Math.round(n)) : '0');
/** Kurz für enge Stellen (Kopfleiste): ab 10 Mio. als „12,4 Mio.“, ab 1 Mrd. als „1,2 Mrd.“. */
export const fmtShort = (n: number) => (n >= 1e9 ? `${NF1.format(n / 1e9)} Mrd.` : n >= 1e7 ? `${NF1.format(n / 1e6)} Mio.` : fmt(n));
export const fx = (n: number) => n.toFixed(2).replace('.', ',');

/** Große-Gewinn-Anzeige: wird vom Casino-Bildschirm angezeigt. */
export interface WinShow { kind: BigWin | 'jackpot'; amount: number; bet?: number; card?: CollectCard; xp?: number }
const listeners = new Set<(w: WinShow) => void>();
export const onWinShow = (f: (w: WinShow) => void) => { listeners.add(f); return () => { listeners.delete(f); }; };
export const showWin = (w: WinShow) => listeners.forEach((f) => f(w));

/** Effekte für den Spielrahmen: Münzen fliegen zum Kontostand, der Bildschirm wackelt. */
type Fx = { kind: 'coins'; n: number } | { kind: 'shake'; hard?: boolean } | { kind: 'party'; power: number };
const fxListeners = new Set<(e: Fx) => void>();
const emitFx = (e: Fx) => fxListeners.forEach((f) => f(e));
export const flyCoins = (n: number) => emitFx({ kind: 'coins', n });
export const shake = (hard = false) => emitFx({ kind: 'shake', hard });
/** Konfetti + Farbblitz – je höher der Multiplikator, desto mehr. */
export const celebrate = (mult: number) => emitFx({ kind: 'party', power: Math.min(3, mult >= 20 ? 3 : mult >= 5 ? 2 : 1) });
const PARTY = ['#ff3fb4', '#3ff0ff', '#ffd24a', '#39ff88', '#a35cff', '#ff7a59', '#ffffff'];

/** Chip-Kasse öffnen (vom Casino-Bildschirm angezeigt). */
const bankListeners = new Set<() => void>();
export const onOpenBank = (f: () => void) => { bankListeners.add(f); return () => { bankListeners.delete(f); }; };
export const openBank = () => bankListeners.forEach((f) => f());

/** XP an den aktiven Karriere-Spieler. */
export function giveXp(xp: number): string | null {
  const t = xpTarget(listCareers());
  if (!t || !xp) return null;
  saveCareer(grantDuelXp(t, xp));
  return t.player.name;
}

/** Einsatz abbuchen; false = geht nicht (zu wenig Chips oder über dem Limit). */
export function bet(amount: number): boolean {
  const club = getClubState();
  const next = placeBet(club, amount);
  if (!next) { sfx('error'); if (casinoOf(club).chips < amount) openBank(); return false; }
  setClubState(next);
  // All-in: alles auf eine Karte – mit Wumms.
  if (amount === casinoOf(club).chips && amount >= 100) { sfx('boom'); buzz([50, 40, 50]); shake(); } else sfx('spend');
  return true;
}

/** Runde abrechnen: Gewinn gutschreiben, Ton, Vibration, bei Big Win die große Show. */
/** Drops & Glücks-Serie: Einblendung im Casino (CasinoPage hört zu). */
export type CasinoExtra = { kind: 'drop'; amount: number; mult: number } | { kind: 'streak'; n: number; bonus: number };
export const onCasinoExtra = (f: (e: CasinoExtra) => void) => { const h = (e: Event) => f((e as CustomEvent<CasinoExtra>).detail); window.addEventListener('cz-extra', h); return () => window.removeEventListener('cz-extra', h); };
const emitExtra = (e: CasinoExtra) => window.dispatchEvent(new CustomEvent('cz-extra', { detail: e }));

export function settle(ev: PlayEvent, opts: { quiet?: boolean } = {}): void {
  const before = casinoOf(getClubState());
  let club = payout(getClubState(), ev);
  const after = casinoOf(club);
  if (after.lastDrop && after.lastDrop.at !== before.lastDrop?.at) { emitExtra({ kind: 'drop', amount: after.lastDrop.amount, mult: after.lastDrop.mult }); sfx('jackpot'); buzz([60, 40, 60, 40, 120]); shake(true); }
  else if (after.lastStreak && after.lastStreak.at !== before.lastStreak?.at) { emitExtra({ kind: 'streak', n: after.lastStreak.n, bonus: after.lastStreak.bonus }); sfx('fanfare'); }
  let win = ev.win;
  let card: CollectCard | undefined;
  if (ev.jackpot) {
    const j = takeJackpot(club);
    card = randomCard('icon');
    club = addCard(payout(j.club, { game: ev.game, bet: 0, win: j.amount }), card);
    win += j.amount;
  }
  setClubState(club);
  if (ev.bet > 0) trackDailyGoal('casino');
  // Leise (z. B. Plinko-Dauerfeuer): große Show erst ab 50×, darunter nur Ton und Beben.
  const big = opts.quiet ? (bigWinOf(ev.bet, win) === 'epic' ? 'epic' : null) : bigWinOf(ev.bet, win);
  if (opts.quiet && !big && !ev.jackpot) {
    const x = win / Math.max(1, ev.bet);
    if (x >= 10) { sfx('revealRare'); shake(); buzz([30, 40, 30]); } else if (x >= 3) sfx('cash'); else if (x > 1) sfx('coin');
    return;
  }
  if (ev.jackpot) { sfx('jackpot'); shake(true); showWin({ kind: 'jackpot', amount: win, card }); return; }
  if (big) { shake(true); flyCoins(24); showWin({ kind: big, amount: win, bet: ev.bet }); return; }
  if (win > ev.bet) {
    const x = win / Math.max(1, ev.bet);
    if (x >= 1.5) celebrate(x);
    flyCoins(Math.min(18, Math.round(4 + x * 2)));
    sfx(x >= 3 ? 'cash' : 'coin');
    buzz(x >= 3 ? [20, 30, 20] : 25);
  } else if (win > 0) sfx('tap');
}

/** Zahl, die weich zum neuen Wert hochzählt. */
export function useCountUp(value: number, ms = 600, enabled = true): number {
  const [shown, setShown] = useState(value);
  const from = useRef(value);
  useEffect(() => {
    // Ausgeblendet (z. B. Casino-Übersicht hinter einem offenen Spiel): nicht animieren, sonst zeichnet jedes Bild alles neu.
    if (!enabled) { from.current = value; setShown(value); return; }
    const start = performance.now();
    const a = from.current;
    let raf = 0;
    const tick = (t: number) => {
      const k = Math.min(1, (t - start) / ms);
      const v = a + (value - a) * (1 - (1 - k) ** 3);
      setShown(v);
      from.current = v;
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, ms, enabled]);
  return Math.round(shown);
}

const STEPS = [10, 20, 50, 100, 200, 500, 1_000, 2_000, 5_000, 10_000, 20_000, 50_000, 100_000];

/** Einsatz wählen: −/+ in festen Stufen, ½, 2×, Max. */
export function BetPicker({ value, onChange, disabled, label = 'Einsatz' }: { value: number; onChange: (n: number) => void; disabled?: boolean; label?: string }) {
  const club = useClub();
  const cap = Math.min(maxBet(club), casinoOf(club).chips);
  const chips = casinoOf(club).chips;
  const [allIn, setAllIn] = useState(false);
  const set = (n: number) => { if (!Number.isFinite(n)) return; setAllIn(false); onChange(Math.max(10, Math.min(Math.max(10, cap), Math.round(n)))); };
  // All-in bleibt aktiv: der Einsatz folgt immer dem ganzen Guthaben (nach Gewinn oder Verlust).
  useEffect(() => { if (allIn && !disabled && chips > 0 && value !== chips) onChange(chips); }, [allIn, chips, disabled]); // eslint-disable-line react-hooks/exhaustive-deps
  const goAllIn = () => {
    if (allIn) { setAllIn(false); onChange(Math.max(10, Math.min(cap, value))); return; }
    if (chips <= 0) { openBank(); return; }
    setAllIn(true); onChange(chips); sfx('boom'); buzz([40, 30, 80]);
  };
  const step = (dir: 1 | -1) => {
    // Feste Stufen, darüber in 1-2-5-Schritten weiter (funktioniert auch bei Millionen-Einsätzen).
    const ladder = [...STEPS];
    while (ladder[ladder.length - 1] < Math.max(value, cap)) { const l = ladder[ladder.length - 1]; ladder.push(String(l).startsWith('2') ? l * 2.5 : l * 2); }
    const next = dir > 0 ? ladder.find((x) => x > value) ?? ladder[ladder.length - 1] : [...ladder].reverse().find((x) => x < value) ?? ladder[0];
    set(next);
  };
  return (
    <div className="cz-bet" aria-label={label}>
      <small>{label}</small>
      <div className="cz-bet-row">
        <button disabled={disabled} onClick={() => set(value / 2)} aria-label="Halbieren">½</button>
        <button disabled={disabled} onClick={() => step(-1)} aria-label="Weniger">−</button>
        <b><Icon name="coin" size={16} />{fmt(value)}</b>
        <button disabled={disabled} onClick={() => step(1)} aria-label="Mehr">+</button>
        <button disabled={disabled} onClick={() => set(value * 2)} aria-label="Verdoppeln">2×</button>
        <button disabled={disabled} onClick={() => set(cap)} aria-label="Maximum">Max</button>
      </div>
      <button className={`cz-allin ${allIn ? 'on' : ''}`} disabled={disabled} onClick={goAllIn} aria-pressed={allIn}>
        <Icon name="fire" size={18} />{allIn ? <>All-in aktiv · {fmt(chips)} <small>tippen zum Beenden</small></> : <>All-in · {fmt(chips)}</>}
      </button>
    </div>
  );
}

/** Einsatz-Zustand pro Spiel (bleibt in der Sitzung gespeichert). */
export function useBet(game: string, start = 50): [number, (n: number) => void] {
  const key = `fc-casino-bet-${game}`;
  const [v, setV] = useState(() => { try { return Number(sessionStorage.getItem(key)) || start; } catch { return start; } });
  const set = (n: number) => { setV(n); try { sessionStorage.setItem(key, String(n)); } catch { /* egal */ } };
  return [v, set];
}

/** Rahmen für ein Spiel: Kopf mit Zurück, Name, Chips. */
export function GameFrame({ title, odds, onClose, children, className = '' }: { title: string; odds: string; onClose: () => void; children: React.ReactNode; className?: string }) {
  const club = useClub();
  const real = casinoOf(club).chips;
  const chips = useCountUp(real);
  const [info, setInfo] = useState(false);
  const [coins, setCoins] = useState<{ id: number; n: number } | null>(null);
  const [party, setParty] = useState<{ id: number; power: number } | null>(null);
  const lastParty = useRef({ at: 0, power: 0 });
  const [shaking, setShaking] = useState<'' | 'shake' | 'shake hard'>('');
  const [bump, setBump] = useState(0);
  const prev = useRef(real);
  useEffect(() => { if (real > prev.current) setBump((b) => b + 1); prev.current = real; }, [real]);
  useEffect(() => {
    const f = (e: Fx) => {
      if (e.kind === 'coins') setCoins({ id: Date.now(), n: e.n });
      else if (e.kind === 'party') {
        // Höchstens ein Konfetti pro Sekunde (außer ein größerer Gewinn) – Dauerfeuer im Auto-Modus bremst sonst schwache Geräte.
        const id = Date.now();
        if (id - lastParty.current.at < 1000 && e.power <= lastParty.current.power) return;
        lastParty.current = { at: id, power: e.power };
        setParty({ id, power: e.power }); setTimeout(() => setParty((p) => (p?.id === id ? null : p)), 1300);
      }
      else { setShaking(e.hard ? 'shake hard' : 'shake'); setTimeout(() => setShaking(''), e.hard ? 650 : 380); }
    };
    fxListeners.add(f);
    return () => { fxListeners.delete(f); };
  }, []);
  return (
    <div className={`cz-game ${className} ${shaking}`} role="dialog" aria-modal="true" aria-label={title}>
      <header className="cz-game-top">
        <button className="cz-round" onClick={onClose} aria-label="Zurück zum Casino"><Icon name="arrow" size={20} /></button>
        <b>{title}</b>
        <button className="cz-round" onClick={() => setInfo((x) => !x)} aria-label="Gewinnchancen"><Icon name="info" size={20} /></button>
        <button key={bump} className={`cz-chips ${bump ? 'bump' : ''}`} onClick={openBank} aria-label="Chip-Kasse öffnen"><Icon name="coin" size={16} />{fmtShort(chips)}<Icon name="plus" size={14} /></button>
      </header>
      {party && (
        <div key={party.id} className={`cz-party p${party.power}`} aria-hidden="true">
          <i className="cz-flash" />
          {Array.from({ length: 14 * party.power }, (_, i) => {
            const a = (i / (14 * party.power)) * Math.PI * 2;
            const d = 110 + (i % 5) * 38 * party.power;
            return <b key={i} style={{ background: PARTY[i % PARTY.length], '--x': `${Math.cos(a) * d}px`, '--y': `${Math.sin(a) * d - 60}px`, '--r': `${(i * 67) % 360}deg`, animationDelay: `${(i % 4) * 25}ms` } as React.CSSProperties} />;
          })}
        </div>
      )}
      {coins && (
        <div key={coins.id} className="cz-fly" aria-hidden="true" onAnimationEnd={(e) => { if ((e.target as HTMLElement).dataset.last) setCoins(null); }}>
          {Array.from({ length: coins.n }, (_, i) => (
            <i key={i} data-last={i === coins.n - 1 ? '1' : undefined}
              style={{ '--dx': `${(i * 53) % 120 - 60}px`, '--dy': `${(i * 37) % 90 - 30}px`, animationDelay: `${i * 35}ms` } as React.CSSProperties}>
              <Icon name="coin" size={20} />
            </i>
          ))}
        </div>
      )}
      {info && <p className="cz-odds" onClick={() => setInfo(false)}>{odds}</p>}
      <div className="cz-game-body">{children}</div>
    </div>
  );
}
