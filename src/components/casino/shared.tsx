import { useEffect, useRef, useState } from 'react';
import { getClubState, setClubState, useClub } from '../../clubStore';
import { grantDuelXp, xpTarget } from '../../game/careerDuels';
import { addCard, bigWinOf, casinoOf, maxBet, payout, placeBet, randomCard, takeJackpot, type BigWin, type PlayEvent } from '../../game/casino';
import type { CollectCard } from '../../game/club';
import { listCareers, saveCareer } from '../../game/storage';
import { play } from '../../sound';
import Icon from '../Icon';

export const sfx = (id: Parameters<typeof play>[0]) => { try { play(id); } catch { /* kein Ton */ } };
export const buzz = (ms: number | number[]) => { try { navigator.vibrate?.(ms); } catch { /* egal */ } };
export const fmt = (n: number) => Math.round(n).toLocaleString('de-DE');
export const fx = (n: number) => n.toFixed(2).replace('.', ',');

/** Große-Gewinn-Anzeige: wird vom Casino-Bildschirm angezeigt. */
export interface WinShow { kind: BigWin | 'jackpot'; amount: number; bet?: number; card?: CollectCard; xp?: number }
const listeners = new Set<(w: WinShow) => void>();
export const onWinShow = (f: (w: WinShow) => void) => { listeners.add(f); return () => { listeners.delete(f); }; };
export const showWin = (w: WinShow) => listeners.forEach((f) => f(w));

/** Effekte für den Spielrahmen: Münzen fliegen zum Kontostand, der Bildschirm wackelt. */
type Fx = { kind: 'coins'; n: number } | { kind: 'shake'; hard?: boolean };
const fxListeners = new Set<(e: Fx) => void>();
const emitFx = (e: Fx) => fxListeners.forEach((f) => f(e));
export const flyCoins = (n: number) => emitFx({ kind: 'coins', n });
export const shake = (hard = false) => emitFx({ kind: 'shake', hard });

/** XP an den aktiven Karriere-Spieler. */
export function giveXp(xp: number): string | null {
  const t = xpTarget(listCareers());
  if (!t || !xp) return null;
  saveCareer(grantDuelXp(t, xp));
  return t.player.name;
}

/** Einsatz abbuchen; false = geht nicht (zu wenig Chips oder über dem Limit). */
export function bet(amount: number): boolean {
  const next = placeBet(getClubState(), amount);
  if (!next) { sfx('error'); return false; }
  setClubState(next);
  sfx('spend');
  return true;
}

/** Runde abrechnen: Gewinn gutschreiben, Ton, Vibration, bei Big Win die große Show. */
export function settle(ev: PlayEvent): void {
  let club = payout(getClubState(), ev);
  let win = ev.win;
  let card: CollectCard | undefined;
  if (ev.jackpot) {
    const j = takeJackpot(club);
    card = randomCard('icon');
    club = addCard(payout(j.club, { game: ev.game, bet: 0, win: j.amount }), card);
    win += j.amount;
  }
  setClubState(club);
  const big = bigWinOf(ev.bet, win);
  if (ev.jackpot) { sfx('jackpot'); shake(true); showWin({ kind: 'jackpot', amount: win, card }); return; }
  if (big) { shake(true); flyCoins(24); showWin({ kind: big, amount: win, bet: ev.bet }); return; }
  if (win > ev.bet) {
    const x = win / Math.max(1, ev.bet);
    flyCoins(Math.min(18, Math.round(4 + x * 2)));
    sfx(x >= 3 ? 'cash' : 'coin');
    buzz(x >= 3 ? [20, 30, 20] : 25);
  } else if (win > 0) sfx('tap');
}

/** Zahl, die weich zum neuen Wert hochzählt. */
export function useCountUp(value: number, ms = 600): number {
  const [shown, setShown] = useState(value);
  const from = useRef(value);
  useEffect(() => {
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
  }, [value, ms]);
  return Math.round(shown);
}

const STEPS = [10, 20, 50, 100, 200, 500, 1_000, 2_000, 5_000, 10_000, 20_000, 50_000, 100_000];

/** Einsatz wählen: −/+ in festen Stufen, ½, 2×, Max. */
export function BetPicker({ value, onChange, disabled, label = 'Einsatz' }: { value: number; onChange: (n: number) => void; disabled?: boolean; label?: string }) {
  const club = useClub();
  const cap = Math.min(maxBet(club), casinoOf(club).chips);
  const set = (n: number) => onChange(Math.max(10, Math.min(Math.max(10, cap), Math.round(n))));
  const step = (dir: 1 | -1) => {
    const i = STEPS.findIndex((s) => s >= value);
    const next = dir > 0 ? STEPS[Math.min(STEPS.length - 1, (STEPS[i] === value ? i : i - 1) + 1)] : STEPS[Math.max(0, (i < 0 ? STEPS.length : i) - 1)];
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
  const [shaking, setShaking] = useState<'' | 'shake' | 'shake hard'>('');
  const [bump, setBump] = useState(0);
  const prev = useRef(real);
  useEffect(() => { if (real > prev.current) setBump((b) => b + 1); prev.current = real; }, [real]);
  useEffect(() => {
    const f = (e: Fx) => {
      if (e.kind === 'coins') setCoins({ id: Date.now(), n: e.n });
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
        <span key={bump} className={`cz-chips ${bump ? 'bump' : ''}`}><Icon name="coin" size={16} />{fmt(chips)}</span>
      </header>
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
