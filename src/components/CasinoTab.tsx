import Icon, { Glyph } from './Icon';
import { useEffect, useRef, useState } from 'react';
import { getClubState, setClubState, useClub } from '../clubStore';
import {
  BETS, BROKE_OPTIONS, CORNERS, HORSES, PEN_CHANCE, PEN_MULT, ROULETTE, WHEEL, afterGamble, brokeOptionUsed, colorOf, doBroke, horseChance, isBroke,
  SOLO_CAP, drawDuel, drawDuelNext, DUEL_RANGE, duelChance, duelHints, duelMult, playHorses, playRoulette, raceLegs, rouletteInfo, shootPenalty, soloChance, soloCrash, soloMult,
  type Corner, type DuelCard, type GambleResult, type HiLo, type PenaltyShot, type RouletteBet,
} from '../game/gambling';
import { getClub } from '../data/leagues';
import { attributeLabels } from '../game/player';
import UtCard from './UtCard';
import type { Career } from '../game/types';
import { motionReduced } from '../settings';
import { play } from '../sound';

const fmt = (n: number) => n.toLocaleString('de-DE');
const pct = (p: number) => `${(p * 100).toLocaleString('de-DE', { maximumFractionDigits: p < 0.1 ? 1 : 0 })} %`;
const short = (n: number) => (n >= 1e6 ? `${n / 1e6}M` : n >= 1000 ? `${n / 1000}K` : String(n));
const vibrate = (p: number | number[]) => { try { navigator.vibrate?.(p); } catch { /* nicht unterstützt */ } };

type Game = 'roulette' | 'horses' | 'penalty' | 'solo' | 'hilo';
const SPIN_MS = 2600;
const RACE_MS = 3200;
const SEG = 360 / WHEEL.length;

/** Zählt eine Zahl in ~0,6 s hoch (Belohnung, die ankommt). */
function useCountUp(target: number, key: unknown): number {
  const [v, setV] = useState(target);
  useEffect(() => {
    if (motionReduced() || target === 0) { setV(target); return; }
    const t0 = performance.now();
    let raf = 0;
    const step = (t: number) => {
      const k = Math.min(1, (t - t0) / 600);
      setV(Math.round(target * (1 - (1 - k) ** 3)));
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, key]);
  return v;
}

/** Ergebnis direkt in der Szene: Gewinn gold mit Reingewinn, Verlust rot. */
function Outcome({ won, stake, label }: { won: number; stake: number; label?: string }) {
  const shown = useCountUp(won, `${won}-${stake}-${label}`);
  return (
    <div className={`cz-outcome ${won ? 'win' : 'lose'}`} role="status">
      {label && <small>{label}</small>}
      {won ? <><b>+{fmt(shown)}</b><em>+{fmt(won - stake)} Gewinn</em></> : <b>−{fmt(stake)}</b>}
    </div>
  );
}

/**
 * Casino: Roulette, Rennen, Elfmeter-Serie, Sololauf und Kartenduell mit Coins.
 * In der Karriere läuft die Spielsucht verborgen mit; im Shop (ohne Karriere) wird nur gespielt.
 */
export default function CasinoTab({ career, onChange }: { career?: Career; onChange?: (c: Career) => void }) {
  const club = useClub();
  const [game, setGame] = useState<Game>('roulette');
  const [stakeSet, setStake] = useState(BETS[0]);
  const [allIn, setAllIn] = useState(false);
  const [msg, setMsg] = useState('');
  const [session, setSession] = useState(0);
  const [busy, setBusy] = useState(false);
  const [free, setFree] = useState(false);
  const g = career?.gambling;
  const broke = !!career && isBroke(career, club.coins);
  // All-in folgt immer dem aktuellen Kontostand
  const stake = allIn ? club.coins : stakeSet;

  /** Einsatz abbuchen, Ergebnis in die (verborgene) Statistik. Auszahlung erst nach der Animation (`payout`). */
  const commit = (amount: number, res: GambleResult, prepaid = false): boolean => {
    const coins = getClubState().coins;
    if (!prepaid) {
      if (amount <= 0 || amount > coins) return false;
      setClubState({ ...getClubState(), coins: coins - amount });
    }
    if (career && onChange) onChange(afterGamble(career, amount, res, prepaid ? coins + amount : coins));
    return true;
  };
  const payout = (amount: number, res: GambleResult) => {
    if (res.win) {
      const c = getClubState();
      setClubState({ ...c, coins: c.coins + res.payout });
      play(res.payout >= amount * 5 ? 'fanfare' : 'coin');
      vibrate(res.payout >= amount * 5 ? [40, 30, 80] : 30);
    } else {
      play('fall');
      vibrate(15);
    }
    setSession((s) => s + (res.win ? res.payout : 0) - amount);
  };
  const allInOk = (amount: number) => amount !== getClubState().coins || window.confirm(`ALL-IN: dein gesamtes Geld setzen – ${fmt(amount)} Coins?`);
  const sliderMax = Math.max(1000, club.coins);
  const chips = (
    <div className="cz-stake-box">
      {free && !busy && (
        <input className="cz-range" type="range" min={1000} max={sliderMax} step={1000} value={Math.min(stake, sliderMax)} disabled={club.coins < 1000}
          onChange={(e) => { const v = Number(e.target.value); setAllIn(v >= club.coins); setStake(v); }} aria-label="Einsatz frei wählen" />
      )}
      <div className="cz-stakes" role="radiogroup" aria-label="Einsatz">
        {BETS.map((b) => (
          <button key={b} role="radio" aria-checked={!allIn && stakeSet === b} className={`cz-chip v${BETS.indexOf(b)} ${!allIn && stakeSet === b ? 'on' : ''}`} disabled={b > club.coins || busy} onClick={() => { setAllIn(false); setStake(b); play('tap'); }}>
            {short(b)}
          </button>
        ))}
        <button role="radio" aria-checked={allIn} className={`cz-chip allin ${allIn ? 'on' : ''}`} disabled={club.coins <= 0 || busy} onClick={() => { setAllIn(true); play('tap'); vibrate(20); }}>
          ALL<br />IN
        </button>
        <button className={`cz-free ${free ? 'on' : ''}`} disabled={busy} onClick={() => setFree((x) => !x)} aria-expanded={free} aria-label="Einsatz frei wählen">
          <Icon name="pencil" size={16} />
        </button>
      </div>
    </div>
  );
  const shared = { stake, busy, setBusy, commit, payout, allInOk, coins: club.coins, chips };

  return (
    <div className="casino">
      {broke && (
        <section className="broke">
          <h3>Pleite</h3>
          <p className="cs-sub">Die Karriere ist vorbei, das Geld ist weg. Aber das Fernsehen ruft …</p>
          <div className="vice-grid">
            {BROKE_OPTIONS.map((o) => {
              const used = brokeOptionUsed(career!, o.id);
              return (
                <button key={o.id} className="vice-card" disabled={used} onClick={() => {
                  const r = doBroke(career!, o.id, getClubState().coins);
                  if (!r.text) return;
                  const c = getClubState();
                  setClubState({ ...c, coins: c.coins + r.coins });
                  onChange?.(r.career);
                  setMsg(r.text);
                  play(r.coins >= 50_000 ? 'fanfare' : 'coin');
                }}>
                  <strong><Glyph e={o.icon} /> {o.name}</strong>
                  <small>{o.text}</small>
                  {used && <em>Schon gemacht</em>}
                </button>
              );
            })}
          </div>
        </section>
      )}
      {msg && <p className="cs-note neutral">{msg}</p>}

      <header className="cz-top">
        <span className="cz-top-title">Casino</span>
        {session !== 0 && <span className={`cz-session ${session > 0 ? 'up' : 'down'}`}>{session > 0 ? '+' : '−'}{fmt(Math.abs(session))}</span>}
        <span className="cz-bank-coins"><Icon name="coin" size={18} />{fmt(club.coins)}</span>
      </header>

      <div className="cz-games" role="tablist" aria-label="Spiel">
        {([['roulette', 'Roulette', 'dice'], ['horses', 'Rennen', 'flag'], ['penalty', 'Elfmeter', 'ball'], ['solo', 'Sololauf', 'bolt'], ['hilo', 'Duell', 'cards']] as const).map(([id, label, icon]) => (
          <button key={id} role="tab" aria-selected={game === id} className={`cz-game ${game === id ? 'on' : ''}`} disabled={busy} onClick={() => { setGame(id); play('tap'); }}>
            <Icon name={icon} size={20} /><span>{label}</span>
          </button>
        ))}
      </div>

      {game === 'roulette' && <Roulette {...shared} />}
      {game === 'horses' && <Horses {...shared} />}
      {game === 'penalty' && <Penalty {...shared} />}
      {game === 'solo' && <Solo {...shared} />}
      {game === 'hilo' && <HiLoGame {...shared} />}

      {g && g.bets > 0 && (
        <p className="cz-stats">{g.bets} Spiele · +{fmt(g.won)} · −{fmt(g.lost)}</p>
      )}
    </div>
  );
}

interface Shared {
  stake: number;
  coins: number;
  busy: boolean;
  setBusy: (b: boolean) => void;
  /** Einsatz abbuchen und Spiel zählen; `prepaid`: Einsatz wurde schon vorher abgebucht (Elfmeter-Serie). */
  commit: (amount: number, res: GambleResult, prepaid?: boolean) => boolean;
  payout: (amount: number, res: GambleResult) => void;
  allInOk: (amount: number) => boolean;
  /** Einsatz-Jetons, direkt über dem Spielknopf. */
  chips: React.ReactNode;
}

// ---------- Roulette ----------
function Roulette({ stake, coins, busy, setBusy, commit, payout, allInOk, chips }: Shared) {
  const [bet, setBet] = useState<RouletteBet>('red');
  const [rot, setRot] = useState(0);
  const [round, setRound] = useState<{ res: GambleResult; stake: number; id: number; done: boolean } | null>(null);
  const [numbers, setNumbers] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  const finish = (r: NonNullable<typeof round>) => {
    clearTimeout(timer.current);
    setRound({ ...r, done: true });
    setBusy(false);
    payout(r.stake, r.res);
  };
  const spin = (amount: number) => {
    if (busy || amount > coins || !allInOk(amount)) return;
    const res = playRoulette(bet, amount);
    if (!commit(amount, res)) return;
    // Zielwinkel: Feld der gezogenen Zahl unter den Zeiger oben, plus fünf volle Umdrehungen
    const idx = WHEEL.indexOf(res.outcome);
    const target = 360 - (idx + 0.5) * SEG;
    const next = rot - (rot % 360) + 360 * 5 + target;
    const r = { res, stake: amount, id: Date.now(), done: false };
    setRot(next);
    setRound(r);
    setBusy(true);
    play('packShake');
    vibrate(10);
    timer.current = setTimeout(() => finish(r), motionReduced() ? 60 : SPIN_MS);
  };
  const info = rouletteInfo(bet);
  const spinning = !!round && !round.done;
  const resultColor = round?.done ? colorOf(round.res.outcome) : '';

  return (
    <section className="cz-roulette">
      <div className="cz-stage st-roulette">
      <span className="cz-tag">{info.label} · ×{info.payout} · {pct(info.chance)}</span>
      <button type="button" className={`cz-wheel-wrap ${spinning ? 'spinning' : ''} ${round?.done ? (round.res.win ? 'won' : 'lost') : ''}`}
        aria-label={spinning ? 'Antippen zum Überspringen' : 'Roulette-Kessel'} onClick={() => spinning && round && finish(round)}>
        <span className="cz-pointer" aria-hidden="true" />
        <svg className="cz-wheel" viewBox="-100 -100 200 200" aria-hidden="true"
          style={{ transform: `rotate(${rot}deg)`, transitionDuration: motionReduced() ? '0s' : `${SPIN_MS}ms` }}>
          {WHEEL.map((n, i) => {
            const a0 = ((i * SEG - 90) * Math.PI) / 180;
            const a1 = (((i + 1) * SEG - 90) * Math.PI) / 180;
            const mid = (i + 0.5) * SEG;
            return (
              <g key={n}>
                <path className={`seg s-${colorOf(n)} ${round?.done && round.res.outcome === n ? 'hit' : ''}`}
                  d={`M0 0 L${96 * Math.cos(a0)} ${96 * Math.sin(a0)} A96 96 0 0 1 ${96 * Math.cos(a1)} ${96 * Math.sin(a1)}Z`} />
                <text transform={`rotate(${mid}) translate(0 -82)`} className="num">{n}</text>
              </g>
            );
          })}
          <circle r="62" className="cz-wheel-inner" />
        </svg>
        <span className={`cz-hub ${resultColor ? `c-${resultColor}` : ''}`} key={round?.id}>
          {round?.done ? <b>{round.res.outcome}</b> : <small>{info.label}</small>}
        </span>
      </button>
      {round?.done && <Outcome won={round.res.payout} stake={round.stake} key={round.id} />}
      </div>

      <div className="cz-board">
        {(Object.keys(ROULETTE) as (keyof typeof ROULETTE)[]).map((k) => (
          <button key={k} className={`cz-bet b-${k} ${bet === k ? 'on' : ''}`} disabled={busy} onClick={() => { setBet(k); play('tap'); }}>
            <span>{ROULETTE[k].label}</span><small>×{ROULETTE[k].payout}</small>
          </button>
        ))}
      </div>
      <button className={`cz-more ${numbers ? 'open' : ''}`} onClick={() => setNumbers((x) => !x)} aria-expanded={numbers}>
        Zahl · ×36{bet.startsWith('n') ? ` · ${bet.slice(1)}` : ''}
      </button>
      {numbers && (
        <div className="cz-numbers">
          {Array.from({ length: 37 }, (_, n) => (
            <button key={n} className={`cz-num c-${colorOf(n)} ${bet === `n${n}` ? 'on' : ''}`} disabled={busy} onClick={() => { setBet(`n${n}`); play('tap'); }}>{n}</button>
          ))}
        </div>
      )}

      <div className="cz-dock">
      {chips}
      <div className="cz-actions">
        <button className="btn primary big" disabled={busy || stake > coins} onClick={() => spin(stake)}>
          Drehen · <Icon name="coin" size={16} className="coin-ic" />{fmt(stake)}
        </button>
      </div>
      </div>
    </section>
  );
}

// ---------- Pferderennen ----------
function Horses({ stake, coins, busy, setBusy, commit, payout, allInOk, chips }: Shared) {
  const [horse, setHorse] = useState(0);
  const [round, setRound] = useState<{ res: GambleResult; stake: number; legs: number[][]; id: number; done: boolean; pick: number } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  const finish = (r: NonNullable<typeof round>) => {
    clearTimeout(timer.current);
    setRound({ ...r, done: true });
    setBusy(false);
    payout(r.stake, r.res);
  };
  const start = (amount: number) => {
    if (busy || amount > coins || !allInOk(amount)) return;
    const res = playHorses(horse, amount);
    if (!commit(amount, res)) return;
    const r = { res, stake: amount, legs: raceLegs(res.order!), id: Date.now(), done: false, pick: horse };
    setRound(r);
    setBusy(true);
    play('whistle');
    timer.current = setTimeout(() => finish(r), motionReduced() ? 60 : RACE_MS);
  };
  const running = !!round && !round.done;

  return (
    <section className="cz-horses">
      <div className="cz-stage st-race">
      <button type="button" className={`cz-track ${running ? 'running' : ''} ${round?.done ? 'done' : ''}`} key={round?.id ?? 'idle'}
        aria-label={running ? 'Antippen zum Überspringen' : 'Rennbahn'} onClick={() => running && round && finish(round)}>
        {HORSES.map((h, i) => {
          const leg = round?.legs[i] ?? [0, 0, 0, 0];
          const place = round?.done ? round.res.order!.indexOf(i) : -1;
          return (
            <span key={h.name} className={`cz-lane ${(round?.pick ?? horse) === i ? 'mine' : ''} ${place === 0 ? 'first' : ''}`}>
              <i className={`cz-runner h${i}`}
                style={{ '--a': leg[0], '--b': leg[1], '--c': leg[2], '--d': leg[3], animationDuration: motionReduced() || round?.done ? '0s' : `${RACE_MS}ms` } as React.CSSProperties}>
                {i + 1}
              </i>
              {place >= 0 && <small className="cz-place">{place + 1}.</small>}
            </span>
          );
        })}
        <span className="cz-finish" aria-hidden="true" />
      </button>
      {round?.done && <Outcome won={round.res.payout} stake={round.stake} label={`${HORSES[round.pick].name}: Platz ${round.res.order!.indexOf(round.pick) + 1}`} key={round.id} />}
      </div>

      <ul className="cz-horse-list">
        {HORSES.map((h, i) => (
          <li key={h.name}>
            <button className={`cz-horse ${horse === i ? 'on' : ''}`} disabled={busy} onClick={() => { setHorse(i); play('tap'); }}>
              <i className={`cz-dot h${i}`}>{i + 1}</i>
              <span>{h.name}</span>
              <small>×{String(h.odds).replace('.', ',')} · {pct(horseChance(h))}</small>
            </button>
          </li>
        ))}
      </ul>

      <div className="cz-dock">
      {chips}
      <div className="cz-actions">
        <button className="btn primary big" disabled={busy || stake > coins} onClick={() => start(stake)}>
          Starten · <Icon name="coin" size={16} className="coin-ic" />{fmt(stake)}
        </button>
      </div>
      </div>
    </section>
  );
}

// ---------- Elfmeter-Serie ----------
function Penalty({ stake, coins, busy, setBusy, commit, payout, allInOk, chips }: Shared) {
  const [series, setSeries] = useState<{ stake: number; goals: number; over: boolean; id: number } | null>(null);
  const [shot, setShot] = useState<(PenaltyShot & { corner: Corner; n: number }) | null>(null);
  const [flying, setFlying] = useState(false);
  const [cashed, setCashed] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  const active = !!series && !series.over;
  const win = series ? Math.round(series.stake * (series.goals ? PEN_MULT[series.goals - 1] : 0)) : 0;

  const settle = (s: NonNullable<typeof series>, amount: number) => {
    // Erst am Ende der Serie zählt sie als ein Spiel (Statistik, verborgene Spielsucht)
    const res: GambleResult = { win: amount > 0, payout: amount, outcome: s.goals };
    commit(s.stake, res, true);
    payout(s.stake, res);
    setCashed(amount);
    setSeries({ ...s, over: true });
    setBusy(false);
  };
  const begin = (amount: number) => {
    if (busy || amount > coins || !allInOk(amount)) return;
    const c = getClubState();
    if (amount > c.coins) return;
    setClubState({ ...c, coins: c.coins - amount });
    setSeries({ stake: amount, goals: 0, over: false, id: Date.now() });
    setShot(null);
    setCashed(0);
    setBusy(true);
    play('whistle');
  };
  const shoot = (corner: Corner) => {
    if (!series || series.over || flying) return;
    const r = shootPenalty(corner);
    setShot({ ...r, corner, n: (shot?.n ?? 0) + 1 });
    setFlying(true);
    play('tap');
    vibrate(12);
    timer.current = setTimeout(() => {
      setFlying(false);
      if (!r.goal) { settle(series, 0); return; }
      const goals = series.goals + 1;
      const s = { ...series, goals };
      play('reveal');
      vibrate([20, 20, 40]);
      if (goals >= PEN_MULT.length) settle(s, Math.round(s.stake * PEN_MULT[goals - 1]));
      else setSeries(s);
    }, motionReduced() ? 60 : 650);
  };

  return (
    <section className="cz-penalty">
      <div className={`cz-stage pz-goal ${shot && !flying ? (shot.goal ? 'goal' : 'saved') : ''} ${flying ? 'flying' : ''}`} key={shot?.n ?? 0}>
        <span className="cz-tag">Treffer {pct(PEN_CHANCE)}</span>
        <span className="pz-net" aria-hidden="true" />
        <span className={`pz-keeper k${shot ? shot.keeper : 1} ${shot ? 'dive' : ''}`} aria-hidden="true"><i /><i /></span>
        <span className={`pz-ball ${shot ? `to${shot.corner} ${shot.over ? 'over' : ''}` : ''}`} aria-hidden="true" />
        {active && !flying && (
          <div className="pz-corners">
            {CORNERS.map((label, i) => (
              <button key={label} className="pz-corner" onClick={() => shoot(i as Corner)} aria-label={`Schuss nach ${label}`}><span>{label}</span></button>
            ))}
          </div>
        )}
        {shot && !flying && !series?.over && <strong className="pz-call">{shot.goal ? 'Tor' : shot.over ? 'Drüber' : 'Gehalten'}</strong>}
        {series?.over && <Outcome won={cashed} stake={series.stake} label={cashed ? `${series.goals} Tore` : shot?.over ? 'Drüber' : 'Gehalten'} key={series.id} />}
      </div>

      <ol className="pz-ladder" aria-label="Gewinnstufen">
        {PEN_MULT.map((m, i) => (
          <li key={m} className={`${series && series.goals > i ? 'hit' : ''} ${active && series.goals === i ? 'next' : ''}`}>
            <span>{i + 1}</span><b>×{String(m).replace('.', ',')}</b>
          </li>
        ))}
      </ol>

      <div className="cz-dock">
      {chips}
      <div className="cz-actions">
        {active ? (
          <button className="btn primary big" disabled={!series.goals || flying} onClick={() => settle(series, win)}>
            {series.goals ? <>Kassieren · <Icon name="coin" size={16} className="coin-ic" />{fmt(win)}</> : 'Ecke wählen'}
          </button>
        ) : (
          <button className="btn primary big" disabled={stake > coins || stake <= 0} onClick={() => begin(stake)}>
            Serie starten · <Icon name="coin" size={16} className="coin-ic" />{fmt(stake)}
          </button>
        )}
      </div>
      </div>
    </section>
  );
}

// ---------- Sololauf ----------
const AUTO = [0, 1.5, 2, 3, 5, 10];
const fmtX = (m: number) => `×${m.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
/** Laufweg auf dem Feld: bis ×10 Richtung Tor, danach steht man im Strafraum. */
const soloX = (m: number) => Math.min(1, Math.log(m) / Math.log(10));

function Solo({ stake, coins, busy, setBusy, commit, payout, allInOk, chips }: Shared) {
  const [phase, setPhase] = useState<'idle' | 'run' | 'tackled' | 'scored'>('idle');
  const [auto, setAuto] = useState(0);
  const [end, setEnd] = useState<{ mult: number; won: number; id: number; stake: number } | null>(null);
  const run = useRef<{ crash: number; t0: number; stake: number; raf: number; done: boolean } | null>(null);
  const multEl = useRef<HTMLElement>(null);
  const runnerEl = useRef<HTMLElement>(null);
  useEffect(() => () => { if (run.current) cancelAnimationFrame(run.current.raf); }, []);

  const finish = (mult: number, scored: boolean) => {
    const r = run.current;
    if (!r || r.done) return;
    r.done = true;
    cancelAnimationFrame(r.raf);
    const won = scored ? Math.round(r.stake * mult) : 0;
    const res: GambleResult = { win: scored, payout: won, outcome: Math.round(mult * 100) };
    commit(r.stake, res, true);
    payout(r.stake, res);
    setEnd({ mult, won, id: Date.now(), stake: r.stake });
    setPhase(scored ? 'scored' : 'tackled');
    setBusy(false);
    if (!scored) vibrate([60, 30, 60]);
  };
  const begin = (amount: number) => {
    if (busy || amount <= 0 || amount > coins || !allInOk(amount)) return;
    const c = getClubState();
    if (amount > c.coins) return;
    setClubState({ ...c, coins: c.coins - amount });
    const crash = soloCrash();
    run.current = { crash, t0: performance.now(), stake: amount, raf: 0, done: false };
    setEnd(null);
    setPhase('run');
    setBusy(true);
    play('whistle');
    // Ohne Animation: sofort zum Ende (Grätsche oder Auto-Abschluss)
    if (motionReduced()) {
      if (auto && crash >= auto) finish(auto, true);
      else finish(crash, false);
      return;
    }
    const tick = (t: number) => {
      const r = run.current;
      if (!r || r.done) return;
      const m = soloMult(t - r.t0);
      if (multEl.current) multEl.current.textContent = fmtX(m);
      if (runnerEl.current) runnerEl.current.style.setProperty('--x', String(soloX(m)));
      if (auto && m >= auto && r.crash >= auto) { finish(auto, true); return; }
      if (m >= r.crash) { finish(r.crash, false); return; }
      if (m >= SOLO_CAP) { finish(SOLO_CAP, true); return; }
      r.raf = requestAnimationFrame(tick);
    };
    run.current.raf = requestAnimationFrame(tick);
  };
  const cashOut = () => {
    const r = run.current;
    if (!r || r.done) return;
    const m = soloMult(performance.now() - r.t0);
    // Wer im selben Bild wie die Grätsche drückt, ist zu spät
    if (m >= r.crash) finish(r.crash, false);
    else { play('reveal'); finish(m, true); }
  };
  const running = phase === 'run';

  return (
    <section className="cz-solo">
      <div className={`cz-stage solo-pitch ${phase}`} key={end?.id ?? 'pitch'}>
        {phase === 'idle' && <span className="cz-tag">×2 {pct(soloChance(2))} · ×5 {pct(soloChance(5))} · ×10 {pct(soloChance(10))}</span>}
        <span className="solo-goal" aria-hidden="true" />
        <span className="solo-def d1" aria-hidden="true" /><span className="solo-def d2" aria-hidden="true" /><span className="solo-def d3" aria-hidden="true" />
        <i ref={runnerEl} className="solo-runner" style={{ '--x': phase === 'idle' ? 0 : soloX(end?.mult ?? 1) } as React.CSSProperties} aria-hidden="true" />
        <b ref={multEl} className="solo-mult" aria-live="off">{end ? fmtX(end.mult) : '×1,00'}</b>
        {end && <Outcome won={end.won} stake={end.stake} label={end.won ? 'Abgeschlossen' : 'Grätsche'} key={end.id} />}
      </div>

      <div className="solo-auto" role="radiogroup" aria-label="Automatisch abschließen">
        <span><Icon name="target" size={16} />Auto</span>
        {AUTO.map((a) => (
          <button key={a} role="radio" aria-checked={auto === a} className={`chip ${auto === a ? 'active' : ''}`} disabled={running} onClick={() => setAuto(a)}>
            {a ? `×${String(a).replace('.', ',')}` : 'Aus'}
          </button>
        ))}
      </div>

      <div className="cz-dock">
      {chips}
      <div className="cz-actions">
        {running ? (
          <button className="btn primary big solo-cash" onClick={cashOut}>Abschließen!</button>
        ) : (
          <button className="btn primary big" disabled={stake > coins || stake <= 0} onClick={() => begin(stake)}>
            Loslaufen · <Icon name="coin" size={16} className="coin-ic" />{fmt(stake)}
          </button>
        )}
      </div>
      </div>
    </section>
  );
}

// ---------- Kartenduell ----------
/** Karte mit Vereinsnamen für die Anzeige (Werte bleiben an der festen ID). */
const shownCard = (d: DuelCard) => ({ ...d.card, club: getClub(d.p.clubId).name });

function HiLoGame({ stake, coins, busy, setBusy, commit, payout, allInOk, chips }: Shared) {
  const [cur, setCur] = useState<DuelCard>(() => drawDuel());
  const [nxt, setNxt] = useState<{ d: DuelCard; hints: [number, number] }>(() => ({ d: drawDuelNext(cur), hints: duelHints() }));
  const [reveal, setReveal] = useState<{ ok: boolean } | null>(null);
  const [series, setSeries] = useState<{ stake: number; mult: number; streak: number; over: boolean; id: number; swaps: number } | null>(null);
  const [cashed, setCashed] = useState(0);
  const [k, setK] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  const active = !!series && !series.over;
  const flipping = !!reveal && active;
  const win = series ? Math.round(series.stake * series.mult) : 0;
  const labels = attributeLabels(nxt.d.p.position);
  const deal = (from: DuelCard) => setNxt({ d: drawDuelNext(from), hints: duelHints() });

  const settle = (s: NonNullable<typeof series>, amount: number) => {
    const res: GambleResult = { win: amount > 0, payout: amount, outcome: s.streak };
    commit(s.stake, res, true);
    payout(s.stake, res);
    setCashed(amount);
    setSeries({ ...s, over: true });
    setBusy(false);
  };
  const begin = (amount: number) => {
    if (busy || amount <= 0 || amount > coins || !allInOk(amount)) return;
    const c = getClubState();
    if (amount > c.coins) return;
    setClubState({ ...c, coins: c.coins - amount });
    setSeries({ stake: amount, mult: 1, streak: 0, over: false, id: Date.now(), swaps: 3 });
    setReveal(null);
    setCashed(0);
    const first = drawDuel();
    setCur(first);
    deal(first);
    setK((x) => x + 1);
    setBusy(true);
    play('packShake');
  };
  const guess = (dir: HiLo) => {
    if (!series || series.over || reveal) return;
    const ok = dir === 'higher' ? nxt.d.p.ovr > cur.p.ovr : nxt.d.p.ovr < cur.p.ovr;
    const m = duelMult(duelChance(cur, nxt.d, nxt.hints, dir));
    setReveal({ ok });
    play('tap');
    timer.current = setTimeout(() => {
      if (!ok) { settle(series, 0); return; }
      play('reveal');
      vibrate([20, 20, 40]);
      setSeries({ ...series, mult: Math.round(series.mult * m * 100) / 100, streak: series.streak + 1 });
      setCur(nxt.d);
      deal(nxt.d);
      setReveal(null);
      setK((x) => x + 1);
    }, motionReduced() ? 60 : 1100);
  };

  /** Zu eindeutig? Die verdeckte Karte tauschen – ändert die Chancen nicht, nur das Angebot. */
  const swap = () => {
    if (!series || series.over || reveal || series.swaps <= 0) return;
    setSeries({ ...series, swaps: series.swaps - 1 });
    deal(cur);
    play('packShake');
  };
  const opt = (dir: HiLo) => {
    const ch = duelChance(cur, nxt.d, nxt.hints, dir);
    const m = duelMult(ch);
    return (
      <button className={`hilo-btn ${dir}`} disabled={!active || flipping || !m} onClick={() => guess(dir)}>
        <Icon name="arrow" size={18} />
        <span>{dir === 'higher' ? 'Höher' : 'Tiefer'}</span>
        <small>{m ? `×${m.toLocaleString('de-DE')} · ${ch >= 1 ? 'sicher' : pct(ch)}` : 'unmöglich'}</small>
      </button>
    );
  };

  return (
    <section className="cz-hilo">
      <div className="cz-stage hilo-table">
        {active && series.streak > 0 && <span className="cz-tag gold">{series.streak} richtig · ×{series.mult.toLocaleString('de-DE')}</span>}
        <div className="hilo-slot" key={`c-${k}`}><UtCard card={shownCard(cur)} size="md" /></div>
        <div className={`hilo-slot back ${reveal ? `show ${reveal.ok ? 'ok' : 'bad'}` : ''}`} key={`n-${k}`}>
          {reveal || series?.over ? <UtCard card={shownCard(nxt.d)} size="md" /> : (
            <div className="hilo-hidden" aria-label={`Verdeckte Karte: ${nxt.d.p.position}, ${labels[nxt.hints[0]]} ${nxt.d.attrs[nxt.hints[0]]}, ${labels[nxt.hints[1]]} ${nxt.d.attrs[nxt.hints[1]]}`}>
              <span className="hh-ovr">?</span>
              <span className="hh-range">±{DUEL_RANGE}</span>
              <span className="hh-pos">{nxt.d.p.position}</span>
              <span className="hh-hints">
                {nxt.hints.map((i) => <span key={i}><b>{nxt.d.attrs[i]}</b>{labels[i]}</span>)}
              </span>
              <span className="hh-rest" aria-hidden="true">{labels.map((l, i) => <i key={l} className={nxt.hints.includes(i) ? 'on' : ''} />)}</span>
            </div>
          )}
        </div>
        {series?.over && <Outcome won={cashed} stake={series.stake} label={cashed ? `${series.streak} richtig` : `${nxt.d.p.name}: ${nxt.d.p.ovr}`} key={series.id} />}
      </div>

      <div className="hilo-choices">{opt('higher')}{opt('lower')}</div>
      {active && (
        <button className="hilo-swap" disabled={flipping || series.swaps <= 0} onClick={swap}>
          <Icon name="swap" size={16} />Tauschen · {series.swaps}
        </button>
      )}

      <div className="cz-dock">
      {chips}
      <div className="cz-actions">
        {active ? (
          <button className="btn primary big" disabled={!series.streak || flipping} onClick={() => settle(series, win)}>
            {series.streak ? <>Kassieren · <Icon name="coin" size={16} className="coin-ic" />{fmt(win)}</> : 'Höher oder tiefer?'}
          </button>
        ) : (
          <button className="btn primary big" disabled={stake > coins || stake <= 0} onClick={() => begin(stake)}>
            Duell starten · <Icon name="coin" size={16} className="coin-ic" />{fmt(stake)}
          </button>
        )}
      </div>
      </div>
    </section>
  );
}
