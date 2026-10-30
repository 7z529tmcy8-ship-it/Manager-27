import Icon, { Glyph } from './Icon';
import { useEffect, useRef, useState } from 'react';
import { getClubState, setClubState, useClub } from '../clubStore';
import {
  BETS, BROKE_OPTIONS, CORNERS, HORSES, PEN_CHANCE, PEN_MULT, ROULETTE, WHEEL, afterGamble, brokeOptionUsed, colorOf, doBroke, horseChance, isBroke,
  playHorses, playRoulette, raceLegs, rouletteInfo, shootPenalty,
  type Corner, type GambleResult, type PenaltyShot, type RouletteBet,
} from '../game/gambling';
import type { Career } from '../game/types';
import { motionReduced } from '../settings';
import { play } from '../sound';

const fmt = (n: number) => n.toLocaleString('de-DE');
const pct = (p: number) => `${(p * 100).toLocaleString('de-DE', { maximumFractionDigits: p < 0.1 ? 1 : 0 })} %`;
const short = (n: number) => (n >= 1000 ? `${n / 1000}K` : String(n));
const vibrate = (p: number | number[]) => { try { navigator.vibrate?.(p); } catch { /* nicht unterstützt */ } };

type Game = 'roulette' | 'horses' | 'penalty';
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

/** Casino: Roulette, Pferderennen und Elfmeter-Serie mit Coins. Spielsucht läuft verborgen im Hintergrund. */
export default function CasinoTab({ career, onChange }: { career: Career; onChange: (c: Career) => void }) {
  const club = useClub();
  const [game, setGame] = useState<Game>('roulette');
  const [stake, setStake] = useState(BETS[0]);
  const [msg, setMsg] = useState('');
  const [session, setSession] = useState(0);
  const [busy, setBusy] = useState(false);
  const g = career.gambling;
  const broke = isBroke(career, club.coins);

  /** Einsatz abbuchen, Ergebnis in die (verborgene) Statistik. Auszahlung erst nach der Animation (`payout`). */
  const commit = (amount: number, res: GambleResult, prepaid = false): boolean => {
    const coins = getClubState().coins;
    if (!prepaid) {
      if (amount <= 0 || amount > coins) return false;
      setClubState({ ...getClubState(), coins: coins - amount });
    }
    onChange(afterGamble(career, amount, res, prepaid ? coins + amount : coins));
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
  const allInOk = (amount: number) => amount !== getClubState().coins || window.confirm(`Alles setzen – ${fmt(amount)} Coins?`);
  const chips = (
    <div className="cz-stakes" role="radiogroup" aria-label="Einsatz">
      {BETS.map((b) => (
        <button key={b} role="radio" aria-checked={stake === b} className={`cz-chip v${BETS.indexOf(b)} ${stake === b ? 'on' : ''}`} disabled={b > club.coins || busy} onClick={() => { setStake(b); play('tap'); }}>
          {short(b)}
        </button>
      ))}
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
              const used = brokeOptionUsed(career, o.id);
              return (
                <button key={o.id} className="vice-card" disabled={used} onClick={() => {
                  const r = doBroke(career, o.id, getClubState().coins);
                  if (!r.text) return;
                  const c = getClubState();
                  setClubState({ ...c, coins: c.coins + r.coins });
                  onChange(r.career);
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

      <header className="cz-bank">
        <span className="cz-bank-coins"><Icon name="coin" size={20} />{fmt(club.coins)}</span>
        {session !== 0 && <span className={`cz-session ${session > 0 ? 'up' : 'down'}`}>Heute {session > 0 ? '+' : '−'}{fmt(Math.abs(session))}</span>}
      </header>

      <div className="cz-games" role="tablist" aria-label="Spiel">
        {([['roulette', 'Roulette', 'dice'], ['horses', 'Rennen', 'flag'], ['penalty', 'Elfmeter', 'ball']] as const).map(([id, label, icon]) => (
          <button key={id} role="tab" aria-selected={game === id} className={`cz-game ${game === id ? 'on' : ''}`} disabled={busy} onClick={() => { setGame(id); play('tap'); }}>
            <Icon name={icon} size={18} />{label}
          </button>
        ))}
      </div>

      {game === 'roulette' && <Roulette {...shared} />}
      {game === 'horses' && <Horses {...shared} />}
      {game === 'penalty' && <Penalty {...shared} />}

      {g && g.bets > 0 && (
        <p className="hint">Deine Bilanz: {g.bets} Spiele · gewonnen {fmt(g.won)} · verloren {fmt(g.lost)} Coins. Die Bank gewinnt auf Dauer immer.</p>
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
  const shown = useCountUp(round?.done && round.res.win ? round.res.payout : 0, round?.id);
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
          {round?.done ? <b>{round.res.outcome}</b> : <small>{spinning ? 'Antippen = sofort' : 'Setzen'}</small>}
        </span>
      </button>

      <p className={`cz-result ${round?.done ? (round.res.win ? 'good' : 'bad') : ''}`} aria-live="polite">
        {round?.done ? (round.res.win ? <>Gewonnen <b>+{fmt(shown)}</b></> : `Die ${round.res.outcome} – leider verloren (−${fmt(round.stake)})`) : spinning ? 'Die Kugel läuft …' : `${info.label} · ×${info.payout} · Chance ${pct(info.chance)}`}
      </p>

      <div className="cz-board">
        {(Object.keys(ROULETTE) as (keyof typeof ROULETTE)[]).map((k) => (
          <button key={k} className={`cz-bet b-${k} ${bet === k ? 'on' : ''}`} disabled={busy} onClick={() => { setBet(k); play('tap'); }}>
            <span>{ROULETTE[k].label}</span><small>×{ROULETTE[k].payout}</small>
          </button>
        ))}
      </div>
      <button className={`cz-more ${numbers ? 'open' : ''}`} onClick={() => setNumbers((x) => !x)} aria-expanded={numbers}>
        Auf eine Zahl setzen · ×36{bet.startsWith('n') ? ` · gewählt: ${bet.slice(1)}` : ''}
      </button>
      {numbers && (
        <div className="cz-numbers">
          {Array.from({ length: 37 }, (_, n) => (
            <button key={n} className={`cz-num c-${colorOf(n)} ${bet === `n${n}` ? 'on' : ''}`} disabled={busy} onClick={() => { setBet(`n${n}`); play('tap'); }}>{n}</button>
          ))}
        </div>
      )}

      {chips}
      <div className="cz-actions">
        <button className="btn primary big" disabled={busy || stake > coins} onClick={() => spin(stake)}>
          Drehen · <Icon name="coin" size={16} className="coin-ic" />{fmt(stake)}
        </button>
        <button className="btn secondary" disabled={busy || coins <= 0} onClick={() => spin(coins)}>Alles</button>
      </div>
    </section>
  );
}

// ---------- Pferderennen ----------
function Horses({ stake, coins, busy, setBusy, commit, payout, allInOk, chips }: Shared) {
  const [horse, setHorse] = useState(0);
  const [round, setRound] = useState<{ res: GambleResult; stake: number; legs: number[][]; id: number; done: boolean; pick: number } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const shown = useCountUp(round?.done && round.res.win ? round.res.payout : 0, round?.id);
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

      <p className={`cz-result ${round?.done ? (round.res.win ? 'good' : 'bad') : ''}`} aria-live="polite">
        {round?.done
          ? round.res.win ? <>{HORSES[round.pick].name} gewinnt! <b>+{fmt(shown)}</b></> : `${HORSES[round.res.outcome].name} gewinnt – dein Pferd wird ${round.res.order!.indexOf(round.pick) + 1}. (−${fmt(round.stake)})`
          : running ? 'Sie laufen … (antippen = Zieleinlauf)' : `Tipp: ${HORSES[horse].name} · Chance ${pct(horseChance(HORSES[horse]))}`}
      </p>

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

      {chips}
      <div className="cz-actions">
        <button className="btn primary big" disabled={busy || stake > coins} onClick={() => start(stake)}>
          Starten · <Icon name="coin" size={16} className="coin-ic" />{fmt(stake)}
        </button>
        <button className="btn secondary" disabled={busy || coins <= 0} onClick={() => start(coins)}>Alles</button>
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
  const shown = useCountUp(cashed, series?.id);
  useEffect(() => () => clearTimeout(timer.current), []);

  const active = !!series && !series.over;
  const win = series ? Math.round(series.stake * (series.goals ? PEN_MULT[series.goals - 1] : 0)) : 0;
  const nextWin = series ? Math.round(series.stake * PEN_MULT[Math.min(series.goals, PEN_MULT.length - 1)]) : 0;

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
      <div className={`pz-goal ${shot && !flying ? (shot.goal ? 'goal' : 'saved') : ''} ${flying ? 'flying' : ''}`} key={shot?.n ?? 0}>
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
        {shot && !flying && <strong className="pz-call">{shot.goal ? 'Tor' : shot.over ? 'Drüber' : 'Gehalten'}</strong>}
      </div>

      <ol className="pz-ladder" aria-label="Gewinnstufen">
        {PEN_MULT.map((m, i) => (
          <li key={m} className={`${series && series.goals > i ? 'hit' : ''} ${active && series.goals === i ? 'next' : ''}`}>
            <span>{i + 1}</span><b>×{String(m).replace('.', ',')}</b>
          </li>
        ))}
      </ol>

      <p className={`cz-result ${series?.over ? (cashed ? 'good' : 'bad') : ''}`} aria-live="polite">
        {series?.over
          ? cashed ? <>Kassiert <b>+{fmt(shown)}</b></> : `Serie vorbei – ${fmt(series.stake)} Coins weg.`
          : active ? (series.goals ? `${series.goals} Tore · jetzt ${fmt(win)} – nächster Treffer: ${fmt(nextWin)}` : 'Wähle eine Ecke. Der Torwart rät.')
            : `Bis zu 5 Elfmeter · jeder trifft mit ${pct(PEN_CHANCE)} · nach jedem Tor kassieren`}
      </p>

      {chips}
      <div className="cz-actions">
        {active ? (
          <button className="btn primary big" disabled={!series.goals || flying} onClick={() => settle(series, win)}>
            {series.goals ? <>Kassieren · <Icon name="coin" size={16} className="coin-ic" />{fmt(win)}</> : 'Erst ein Tor schießen'}
          </button>
        ) : (
          <>
            <button className="btn primary big" disabled={stake > coins} onClick={() => begin(stake)}>
              Serie starten · <Icon name="coin" size={16} className="coin-ic" />{fmt(stake)}
            </button>
            <button className="btn secondary" disabled={coins <= 0} onClick={() => begin(coins)}>Alles</button>
          </>
        )}
      </div>
    </section>
  );
}
