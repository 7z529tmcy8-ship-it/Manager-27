import { useEffect, useRef, useState } from 'react';
import {
  FREE_SPINS, LINES, MINE_FIELDS, PAYTABLE, PLINKO, PLINKO_ROWS, SLOT_SCALE, crashAt, crashPoint, dropBall, minesMult, placeMines, playSlots, spinGrid,
  type Risk, type SlotResult, type Sym,
} from '../../game/casino';
import { motionReduced } from '../../settings';
import Icon from '../Icon';
import { BetPicker, GameFrame, bet, buzz, fmt, fx, settle, sfx, useBet } from './shared';

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ---------------------------------------------------------------- Slots
const SYM_ICON: Record<Sym, string> = { ball: 'ball', boot: 'boot', shirt: 'shirt', whistle: 'whistle', star: 'star', crown: 'crown', trophy: 'trophy', coin: 'coin' };
const CELL = 62;

export function Slots({ onClose }: { onClose: () => void }) {
  const [stake, setStake] = useBet('slots', 50);
  const [grid, setGrid] = useState<Sym[][]>(() => spinGrid());
  const [strips, setStrips] = useState<Sym[][] | null>(null);
  const [rolling, setRolling] = useState(false);
  const [busy, setBusy] = useState(false);
  const [lines, setLines] = useState<number[]>([]);
  const [shown, setShown] = useState<{ win: number; text: string } | null>(null);
  const [free, setFree] = useState<{ left: number; total: number } | null>(null);
  const [auto, setAuto] = useState(0);
  const alive = useRef(true);
  useEffect(() => () => { alive.current = false; }, []);
  const fast = motionReduced();

  /** Walzen drehen lassen bis zum Ergebnis (jede Walze stoppt etwas später). */
  const roll = async (target: Sym[][], quick = false) => {
    setLines([]);
    setStrips(target.map((col) => [...Array.from({ length: 14 }, () => spinGrid()[0][0]), ...col]));
    setRolling(false);
    await wait(30);
    setRolling(true);
    sfx('packShake');
    const dur = fast ? 200 : quick ? 650 : 1000;
    for (let i = 0; i < 5; i++) { await wait(i === 0 ? dur : (quick ? 120 : 220)); sfx('tap'); }
    await wait(250);
    if (!alive.current) return;
    setGrid(target);
    setStrips(null);
    setRolling(false);
  };

  const spin = async (): Promise<boolean> => {
    if (busy || !bet(stake)) return false;
    setBusy(true);
    setShown(null);
    const r: SlotResult = playSlots(stake);
    await roll(r.grid);
    if (!alive.current) return false;
    setLines(r.lines.map((l) => l.line));
    let total = r.win - r.free.reduce((a, f) => a + f.win, 0);
    if (total > 0) setShown({ win: total, text: r.lines.length ? `${r.lines.length} Linie${r.lines.length > 1 ? 'n' : ''}` : 'Münzen' });
    if (r.free.length) {
      sfx('fanfare'); buzz([30, 50, 30]);
      setFree({ left: r.free.length, total });
      await wait(1100);
      for (let i = 0; i < r.free.length; i++) {
        if (!alive.current) return false;
        await roll(r.free[i].grid, true);
        total += r.free[i].win;
        setFree({ left: r.free.length - i - 1, total });
        if (r.free[i].win) { sfx('coin'); setShown({ win: total, text: 'Freispiele' }); }
        await wait(260);
      }
      await wait(500);
      setFree(null);
    }
    settle({ game: 'slots', bet: stake, win: r.win, jackpot: r.jackpot });
    setBusy(false);
    return true;
  };

  // Auto-Drehs: weiter, solange Chips reichen.
  useEffect(() => {
    if (!auto || busy) return;
    const t = setTimeout(async () => {
      const ok = await spin();
      if (alive.current) setAuto((a) => (ok ? a - 1 : 0));
    }, 350);
    return () => clearTimeout(t);
  }, [auto, busy]); // eslint-disable-line react-hooks/exhaustive-deps

  const lineCells = new Set(lines.flatMap((li) => LINES[li].map((r, reel) => `${reel}-${r}`)));
  const pays = (Object.entries(PAYTABLE) as [Sym, [number, number, number]][]).map(([s, p]) => `${s === 'crown' ? 'Krone (Joker)' : s}: ${p.map((x) => fx((x * SLOT_SCALE) / 10)).join(' / ')}× Einsatz`).join(' · ');
  return (
    <GameFrame title="Stadion-Slots" onClose={onClose} className="cz-slots"
      odds={`Auszahlungsquote ca. 95 %. 10 Linien von links, 3/4/5 gleiche: ${pays}. 3+ Pokale = ${FREE_SPINS[3]}/${FREE_SPINS[4]}/${FREE_SPINS[5]} Freispiele. Münzen irgendwo: 3 = 3×, 4 = 20×, 5 = Jackpot.`}>
      <div className={`cz-reels ${free ? 'free' : ''}`}>
        {grid.map((col, reel) => (
          <div key={reel} className="cz-reel" style={{ height: CELL * 3 }}>
            <div className="cz-strip" style={strips ? {
              transform: rolling ? `translateY(${-(strips[reel].length - 3) * CELL}px)` : 'translateY(0)',
              transition: rolling ? `transform ${(fast ? 200 : free ? 650 : 1000) + reel * (free ? 120 : 220)}ms cubic-bezier(.2, .9, .25, 1.06)` : 'none',
            } : undefined}>
              {(strips ? strips[reel] : col).map((s, i) => (
                <span key={i} className={`cz-sym s-${s} ${!strips && lineCells.has(`${reel}-${i}`) ? 'hit' : ''}`} style={{ height: CELL }}>
                  <Icon name={SYM_ICON[s]} size={30} />
                </span>
              ))}
            </div>
          </div>
        ))}
        {free && <div className="cz-free-banner">Freispiele · noch {free.left}</div>}
      </div>
      <div className={`cz-result ${shown ? 'on' : ''}`}>{shown ? <><b>+{fmt(shown.win)}</b><small>{shown.text}</small></> : <small>Krone ist Joker · 3 Pokale = Freispiele</small>}</div>
      <BetPicker value={stake} onChange={setStake} disabled={busy || auto > 0} />
      <div className="cz-actions">
        <button className="cz-cta" disabled={busy || auto > 0} onClick={() => spin()}>Drehen</button>
        <button className={`cz-sub ${auto ? 'on' : ''}`} onClick={() => setAuto(auto ? 0 : 10)}>{auto ? `Stopp (${auto})` : 'Auto ×10'}</button>
      </div>
    </GameFrame>
  );
}

// ---------------------------------------------------------------- Crash
const AUTO = [0, 1.5, 2, 3, 5, 10];

export function Crash({ onClose }: { onClose: () => void }) {
  const [stake, setStake] = useBet('crash', 50);
  const [auto, setAutoC] = useState(2);
  const [phase, setPhase] = useState<'idle' | 'fly' | 'done'>('idle');
  const [mult, setMult] = useState(1);
  const [cashed, setCashed] = useState<number | null>(null);
  const [history, setHistory] = useState<number[]>([]);
  const [pts, setPts] = useState<[number, number][]>([]);
  const run = useRef<{ crash: number; start: number; cashed: number | null; stake: number } | null>(null);
  const raf = useRef(0);
  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  const cash = (m: number) => {
    const r = run.current;
    if (!r || r.cashed) return;
    r.cashed = m;
    setCashed(m);
    settle({ game: 'crash', bet: r.stake, win: Math.floor(r.stake * m), mult: m });
  };
  const start = () => {
    if (phase === 'fly' || !bet(stake)) return;
    const crash = crashPoint();
    run.current = { crash, start: performance.now(), cashed: null, stake };
    setCashed(null); setPhase('fly'); setPts([]); sfx('whistle');
    const tick = (t: number) => {
      const r = run.current!;
      const sec = (t - r.start) / 1000;
      const m = crashAt(sec);
      if (m >= r.crash) {
        setMult(r.crash);
        setPhase('done');
        setHistory((h) => [r.crash, ...h].slice(0, 12));
        if (!r.cashed) { settle({ game: 'crash', bet: r.stake, win: 0, mult: r.crash }); sfx('fall'); buzz(120); }
        return;
      }
      setMult(m);
      setPts((p) => (p.length && sec - p[p.length - 1][0] < 0.08 ? p : [...p, [sec, m]]));
      if (!r.cashed && auto > 0 && m >= auto) cash(auto);
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
  };

  // Kurve: Zeit → x, Multiplikator → y (mitwachsende Achsen)
  const maxT = Math.max(6, ...pts.map((p) => p[0]));
  const maxM = Math.max(2, mult * 1.15);
  const path = pts.map(([t, m], i) => `${i ? 'L' : 'M'} ${(t / maxT) * 300} ${190 - ((m - 1) / (maxM - 1)) * 180}`).join(' ');
  const last = pts[pts.length - 1];
  const crashed = phase === 'done';
  return (
    <GameFrame title="Elfmeter-Crash" onClose={onClose} className="cz-crash"
      odds="Der Ball fliegt, der Multiplikator steigt. Die Chance, dass er mindestens bis m kommt, ist 97 % ÷ m (z. B. 2× in 48,5 %, 10× in 9,7 %). Auszahlungsquote 97 %.">
      <div className={`cz-sky ${crashed ? (cashed ? 'won' : 'lost') : ''}`}>
        <svg viewBox="0 0 300 200" preserveAspectRatio="none" aria-hidden="true">
          <path d={path} className="cz-curve" />
          {last && <circle cx={(last[0] / maxT) * 300} cy={190 - ((last[1] - 1) / (maxM - 1)) * 180} r="5" className="cz-ballpt" />}
        </svg>
        <div className="cz-mult">
          <b>{fx(mult)}×</b>
          <small>{phase === 'idle' ? 'Bereit zum Schuss' : crashed ? (cashed ? `Kassiert bei ${fx(cashed)}× · Torwart hielt bei ${fx(mult)}×` : 'Gehalten!') : cashed ? `Kassiert bei ${fx(cashed)}×` : 'Fliegt …'}</small>
        </div>
      </div>
      <div className="cz-history">{history.map((h, i) => <span key={i} className={h >= 2 ? 'hi' : 'lo'}>{fx(h)}×</span>)}</div>
      <div className="cz-chipsel" role="radiogroup" aria-label="Automatisch kassieren">
        <small>Auto-Kasse</small>
        {AUTO.map((a) => <button key={a} className={auto === a ? 'on' : ''} disabled={phase === 'fly'} onClick={() => setAutoC(a)}>{a ? `${fx(a)}×` : 'aus'}</button>)}
      </div>
      <BetPicker value={stake} onChange={setStake} disabled={phase === 'fly'} />
      <div className="cz-actions">
        {phase === 'fly' && !cashed
          ? <button className="cz-cta cash" onClick={() => cash(mult)}>Kassieren · {fmt(stake * mult)}</button>
          : <button className="cz-cta" disabled={phase === 'fly'} onClick={start}>{phase === 'fly' ? 'Fliegt …' : 'Schießen'}</button>}
      </div>
    </GameFrame>
  );
}

// ---------------------------------------------------------------- Plinko
const RISK_NAME: Record<Risk, string> = { low: 'Niedrig', mid: 'Mittel', high: 'Hoch' };
type Ball = { id: number; path: number[]; start: number; slot: number; stake: number; risk: Risk };
const STEP_MS = 95;

export function Plinko({ onClose }: { onClose: () => void }) {
  const [stake, setStake] = useBet('plinko', 20);
  const [risk, setRisk] = useState<Risk>('mid');
  const [balls, setBalls] = useState<Ball[]>([]);
  const [now, setNow] = useState(0);
  const [hit, setHit] = useState<{ slot: number; at: number } | null>(null);
  const seq = useRef(0);
  const raf = useRef(0);
  useEffect(() => {
    if (!balls.length) return;
    const tick = (t: number) => {
      setNow(t);
      const doneNow = balls.filter((b) => t - b.start >= (PLINKO_ROWS + 1) * STEP_MS);
      if (doneNow.length) {
        for (const b of doneNow) {
          const m = PLINKO[b.risk][b.slot];
          settle({ game: 'plinko', bet: b.stake, win: Math.floor(b.stake * m), mult: m });
          setHit({ slot: b.slot, at: t });
        }
        setBalls((bs) => bs.filter((b) => !doneNow.includes(b)));
        return;
      }
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [balls]);

  const drop = () => {
    if (balls.length >= 8 || !bet(stake)) return;
    const d = dropBall();
    setBalls((bs) => [...bs, { id: seq.current++, path: d.path, slot: d.slot, start: performance.now(), stake, risk }]);
  };
  const W = 300; const top = 18; const gap = 15.5;
  const xAt = (row: number, rights: number) => W / 2 + (rights - row / 2) * (W / (PLINKO_ROWS + 2));
  const posOf = (b: Ball) => {
    const t = Math.max(0, (now - b.start) / STEP_MS);
    const row = Math.min(PLINKO_ROWS, Math.floor(t));
    const k = Math.min(1, t - row);
    const r0 = b.path.slice(0, row).reduce((a, x) => a + x, 0);
    const r1 = r0 + (row < PLINKO_ROWS ? b.path[row] : 0);
    const x = xAt(row, r0) + (xAt(row + 1, r1) - xAt(row, r0)) * k;
    const y = top + (row + k) * gap - Math.sin(k * Math.PI) * 5;
    return { x, y };
  };
  const mults = PLINKO[risk];
  return (
    <GameFrame title="Torwand-Plinko" onClose={onClose} className="cz-plinko"
      odds={`Der Ball fällt durch 12 Reihen, jedes Mal 50:50 links oder rechts. Fächer (${RISK_NAME[risk]}): ${mults.map(fx).join(' · ')}×. Auszahlungsquote ca. 96 %.`}>
      <svg className="cz-board" viewBox={`0 0 ${W} ${top + (PLINKO_ROWS + 1) * gap + 26}`} aria-hidden="true">
        {Array.from({ length: PLINKO_ROWS }, (_, row) => Array.from({ length: row + 3 }, (_, i) => (
          <circle key={`${row}-${i}`} className="cz-peg" cx={xAt(row + 1, i) - (W / (PLINKO_ROWS + 2)) / 2} cy={top + (row + 1) * gap - gap / 2} r="2.2" />
        )))}
        {mults.map((m, i) => {
          const x = xAt(PLINKO_ROWS, i);
          const w = W / (PLINKO_ROWS + 2) - 2;
          const on = hit && hit.slot === i && now - hit.at < 400;
          return (
            <g key={i} className={`cz-bin ${m >= 5 ? 'hot' : m >= 1 ? 'mid' : 'cold'} ${on ? 'on' : ''}`}>
              <rect x={x - w / 2} y={top + PLINKO_ROWS * gap + 6} width={w} height={20} rx={4} />
              <text x={x} y={top + PLINKO_ROWS * gap + 19.5}>{m >= 100 ? Math.round(m) : m >= 10 ? m.toFixed(0) : String(m).replace('.', ',')}</text>
            </g>
          );
        })}
        {balls.map((b) => { const p = posOf(b); return <circle key={b.id} className="cz-pball" cx={p.x} cy={p.y} r="4.6" />; })}
      </svg>
      <div className="cz-chipsel" role="radiogroup" aria-label="Risiko">
        <small>Risiko</small>
        {(Object.keys(RISK_NAME) as Risk[]).map((r) => <button key={r} className={risk === r ? 'on' : ''} disabled={balls.length > 0} onClick={() => setRisk(r)}>{RISK_NAME[r]}</button>)}
      </div>
      <BetPicker value={stake} onChange={setStake} />
      <div className="cz-actions"><button className="cz-cta" onClick={drop}>Ball fallen lassen</button></div>
    </GameFrame>
  );
}

// ---------------------------------------------------------------- Minen
const MINE_CHOICES = [1, 3, 5, 8, 12, 20];

export function Mines({ onClose }: { onClose: () => void }) {
  const [stake, setStake] = useBet('mines', 50);
  const [count, setCount] = useState(3);
  const [round, setRound] = useState<{ mines: number[]; open: number[]; stake: number; over: 'lost' | 'cashed' | null } | null>(null);
  const safe = round ? round.open.filter((i) => !round.mines.includes(i)).length : 0;
  const mult = minesMult(count, safe);
  const nextMult = minesMult(count, safe + 1);
  const playing = !!round && !round.over;

  const start = () => {
    if (playing || !bet(stake)) return;
    setRound({ mines: placeMines(count), open: [], stake, over: null });
    sfx('whistle');
  };
  const pick = (i: number) => {
    if (!round || round.over || round.open.includes(i)) return;
    if (round.mines.includes(i)) {
      setRound({ ...round, open: [...round.open, i], over: 'lost' });
      settle({ game: 'mines', bet: round.stake, win: 0, safe });
      sfx('fall'); buzz(150);
      return;
    }
    const open = [...round.open, i];
    sfx('coin'); buzz(15);
    const s = safe + 1;
    if (s === MINE_FIELDS - count) {
      setRound({ ...round, open, over: 'cashed' });
      settle({ game: 'mines', bet: round.stake, win: Math.floor(round.stake * minesMult(count, s)), safe: s, mult: minesMult(count, s) });
      return;
    }
    setRound({ ...round, open });
  };
  const cash = () => {
    if (!round || round.over || !safe) return;
    setRound({ ...round, over: 'cashed' });
    settle({ game: 'mines', bet: round.stake, win: Math.floor(round.stake * mult), safe, mult });
  };
  return (
    <GameFrame title="Elfmeter-Minen" onClose={onClose} className="cz-mines"
      odds={`25 Felder, ${count} davon hält der Torwart. Jedes Tor erhöht den Multiplikator fair nach der Wahrscheinlichkeit (Auszahlungsquote 97 %). Jetzt: ${fx(mult)}×, nächstes Tor ${fx(nextMult)}×.`}>
      <div className={`cz-goal ${round?.over ?? ''}`}>
        {Array.from({ length: MINE_FIELDS }, (_, i) => {
          const opened = round?.open.includes(i);
          const mine = round?.mines.includes(i);
          const reveal = opened || (round?.over && mine);
          return (
            <button key={i} className={`cz-cell ${reveal ? (mine ? 'save' : 'goal') : ''} ${opened ? 'picked' : ''}`} disabled={!playing || opened} onClick={() => pick(i)} aria-label={reveal ? (mine ? 'Parade' : 'Tor') : `Feld ${i + 1}`}>
              {reveal && <Icon name={mine ? 'shield' : 'ball'} size={22} />}
            </button>
          );
        })}
      </div>
      <div className={`cz-result ${round ? 'on' : ''}`}>
        {round?.over === 'lost' ? <><b className="down">Parade!</b><small>Nach {safe} Tor{safe === 1 ? '' : 'en'}</small></>
          : round?.over === 'cashed' ? <><b>+{fmt(round.stake * mult)}</b><small>{fx(mult)}× kassiert</small></>
          : round ? <><b>{fx(mult)}×</b><small>Nächstes Tor: {fx(nextMult)}×</small></> : <small>Wähle, wie viele Felder der Torwart hält</small>}
      </div>
      <div className="cz-chipsel" role="radiogroup" aria-label="Paraden">
        <small>Paraden</small>
        {MINE_CHOICES.map((n) => <button key={n} className={count === n ? 'on' : ''} disabled={playing} onClick={() => setCount(n)}>{n}</button>)}
      </div>
      <BetPicker value={stake} onChange={setStake} disabled={playing} />
      <div className="cz-actions">
        {playing
          ? <button className="cz-cta cash" disabled={!safe} onClick={cash}>{safe ? `Kassieren · ${fmt(round!.stake * mult)}` : 'Erst ein Tor schießen'}</button>
          : <button className="cz-cta" onClick={start}>Anstoß</button>}
      </div>
    </GameFrame>
  );
}
