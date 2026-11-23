import { useEffect, useRef, useState } from 'react';
import {
  FREE_SPINS, EXPAND_SYMS, EXPAND_MIN, GAMBLE_MAX, SCATTER_PAY, gambleRound, gambleSettle, giftSpins, takeGiftSpin, LINES, MINE_FIELDS, PAYTABLE, SLOT_SCALE, crashAt, crashPoint, minesMult, placeMines, playSlots, spinGrid,
  type SlotResult, type Sym,
} from '../../game/casino';
import { motionReduced } from '../../settings';
import { getClubState, setClubState, useClub } from '../../clubStore';
import Icon from '../Icon';
import { BetPicker, GameFrame, bet, buzz, celebrate, fmt, fx, settle, sfx, shake, useBet } from './shared';
import { playStep } from '../../sound';

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
  const [lines, setLines] = useState<{ line: number; count: number }[]>([]);
  const [shown, setShown] = useState<{ win: number; text: string } | null>(null);
  const [free, setFree] = useState<{ left: number; total: number } | null>(null);
  const [auto, setAuto] = useState(0);
  const [turbo, setTurbo] = useState(false);
  const [durs, setDurs] = useState<number[]>([0, 0, 0, 0, 0]);
  const [tease, setTease] = useState<number[]>([]);
  const [special, setSpecial] = useState<{ sym: Sym; spinning: boolean } | null>(null);
  const [expand, setExpand] = useState<number[]>([]);
  const [gamble, setGamble] = useState<{ amount: number; step: number; card: 'red' | 'black' | null; lost?: boolean } | null>(null);
  const alive = useRef(true);
  useEffect(() => () => { alive.current = false; }, []);
  const fast = motionReduced();

  /** Walzen drehen lassen bis zum Ergebnis (jede Walze stoppt etwas später). */
  const roll = async (target: Sym[][], quick = false) => {
    setLines([]);
    // Vorfreude: Liegen schon 2 Pokale (Freispiele) oder 3 Münzen (Jackpot-Nähe) in den ersten Walzen, drehen die letzten länger.
    const teaseFrom = [2, 3].find((r) => target.slice(0, r + 1).flat().filter((x) => x === 'trophy').length >= 2 || target.slice(0, r + 1).flat().filter((x) => x === 'coin').length >= 3);
    const fastMode = fast || turbo;
    const base = fastMode ? 260 : quick ? 650 : 1000;
    const step = fastMode ? 70 : quick ? 120 : 220;
    const d = target.map((_, i) => base + i * step + (teaseFrom !== undefined && i > teaseFrom && !fastMode ? (i - teaseFrom) * 900 : 0));
    const t = teaseFrom !== undefined && !fastMode ? target.map((_, i) => i).filter((i) => i > teaseFrom) : [];
    setDurs(d);
    setTease(t);
    setStrips(target.map((col, i) => [...Array.from({ length: 14 + Math.round(d[i] / 120) }, () => spinGrid()[0][0]), ...col]));
    setRolling(false);
    await wait(30);
    setRolling(true);
    sfx('packShake');
    const ticker = setInterval(() => sfx('tick'), 75);
    let prev = 0;
    for (let i = 0; i < 5; i++) {
      await wait(d[i] - prev);
      prev = d[i];
      sfx('tap');
      if (t.includes(i + 1)) playStep(6 + i * 3);
    }
    clearInterval(ticker);
    await wait(180);
    setTease([]);
    if (!alive.current) return;
    setGrid(target);
    setStrips(null);
    setRolling(false);
  };

  const gift = giftSpins(useClub());
  const spin = async (giftSpin = false): Promise<boolean> => {
    if (busy) return false;
    const used = giftSpin ? takeGiftSpin(getClubState()) : null;
    if (giftSpin) { if (!used) return false; setClubState(used); } else if (!bet(stake)) return false;
    const st = giftSpin ? gift.bet : stake;
    setBusy(true);
    setShown(null);
    setGamble(null);
    const r: SlotResult = playSlots(st);
    await roll(r.grid);
    if (!alive.current) return false;
    setLines(r.lines.map((l) => ({ line: l.line, count: l.count })));
    let total = r.win - r.free.reduce((a, f) => a + f.win, 0);
    if (total > 0) setShown({ win: total, text: r.lines.length ? `${r.lines.length} Linie${r.lines.length > 1 ? 'n' : ''}` : 'Münzen' });
    if (r.free.length) {
      // Pokal öffnet sich: Spezialsymbol wird ausgelost (Symbole rasen durch, dann steht es fest)
      sfx('fanfare'); buzz([30, 50, 30]);
      setShown({ win: total, text: `${r.scatters} Pokale · 10 Freispiele!` });
      setSpecial({ sym: EXPAND_SYMS[0], spinning: true });
      if (!fast) {
        for (let k = 0; k < 18; k++) {
          setSpecial({ sym: EXPAND_SYMS[k % EXPAND_SYMS.length], spinning: true });
          sfx('tick');
          await wait(60 + k * 9);
        }
      }
      setSpecial({ sym: r.special!, spinning: false });
      sfx('jackpot'); buzz([60, 40, 120]);
      await wait(fast ? 300 : 1500);
      setFree({ left: r.free.length, total });
      for (let i = 0; i < r.free.length; i++) {
        if (!alive.current) return false;
        const f = r.free[i];
        await roll(f.grid, true);
        total += f.win;
        setFree({ left: r.free.length - i - 1, total });
        if (f.expand.reels.length) {
          // Spezialsymbol breitet sich über die ganzen Walzen aus
          await wait(200);
          setExpand(f.expand.reels);
          sfx('boom'); playStep(10 + f.expand.reels.length * 2); buzz([50, 30, 80]); shake(f.expand.reels.length >= 4);
          setShown({ win: total, text: `${f.expand.reels.length} Walzen ausgebreitet · +${fmt(f.expand.win)}` });
          await wait(fast ? 400 : 1300);
          setExpand([]);
        } else if (f.win) { sfx('coin'); setShown({ win: total, text: 'Freispiele' }); }
        if (f.retrigger) { sfx('fanfare'); setShown({ win: total, text: `+${f.retrigger} Freispiele!` }); await wait(700); }
        await wait(260);
      }
      await wait(500);
      setFree(null);
      setSpecial(null);
    }
    settle({ game: 'slots', bet: giftSpin ? 0 : stake, win: r.win, jackpot: r.jackpot });
    if (giftSpin && r.win > 0) setShown({ win: r.win, text: 'Gratis-Dreh' });
    // Risiko-Leiter anbieten (nicht im Auto-Modus)
    if (r.win > 0 && !auto) setGamble({ amount: r.win, step: 0, card: null });
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

  const risk = async (pick: 'red' | 'black') => {
    if (!gamble || gamble.lost) return;
    const res = gambleRound();
    const won = res === pick;
    const next = gambleSettle(getClubState(), gamble.amount, won);
    if (!next) { sfx('error'); setGamble(null); return; }
    setGamble({ ...gamble, card: res });
    sfx('packRip');
    await wait(fast ? 100 : 450);
    setClubState(next);
    if (won) {
      const amount = gamble.amount * 2; const step = gamble.step + 1;
      sfx(step >= 3 ? 'jackpot' : 'cash'); buzz([30, 30, 60]);
      setShown({ win: amount, text: `Risiko ×${2 ** step}` });
      setGamble(step >= GAMBLE_MAX ? null : { amount, step, card: res });
      if (step >= 3) celebrate(2 ** step);
    } else {
      sfx('fall'); buzz(120);
      setShown(null);
      setGamble({ ...gamble, card: res, lost: true });
      setTimeout(() => setGamble(null), 900);
    }
  };
  const lineCells = new Set(lines.flatMap((l) => LINES[l.line].slice(0, l.count).map((r, reel) => `${reel}-${r}`)));
  const pays = (Object.entries(PAYTABLE) as [Sym, [number, number, number]][]).map(([s, p]) => `${s === 'crown' ? 'Krone (Joker)' : s}: ${p.map((x) => fx((x * SLOT_SCALE) / 10)).join(' / ')}× Einsatz`).join(' · ');
  return (
    <GameFrame title="Pokal der Legenden" onClose={onClose} className="cz-slots"
      odds={`Auszahlungsquote ca. 94 %. 10 Linien von links, 3/4/5 gleiche: ${pays}. Pokal ist Joker und Scatter: irgendwo 3/4/5 = ${SCATTER_PAY[3]}/${SCATTER_PAY[4]}/${SCATTER_PAY[5]}× Einsatz und ${FREE_SPINS[3]} Freispiele (erneut auslösbar, max. 50). In den Freispielen breitet sich ein zufälliges Spezialsymbol über ganze Walzen aus, sobald es auf ${EXPAND_MIN.ball} Walzen liegt (Stern und Krone schon ab 2) – es zahlt dann auf allen 10 Linien. Risiko-Leiter: Rot oder Schwarz, echte 50 : 50, Gewinn verdoppeln oder verlieren (höchstens ${GAMBLE_MAX}×). Münzen irgendwo: 3 = 3×, 4 = 20×, 5 = Jackpot.`}>
      {special && (
        <div className={`cz-special ${special.spinning ? 'spin' : 'set'}`} aria-live="polite">
          <small>{special.spinning ? 'Spezialsymbol wird gezogen …' : 'Spezialsymbol'}</small>
          <span className={`cz-special-ic s-${special.sym}`}><Icon name={SYM_ICON[special.sym]} size={46} /></span>
        </div>
      )}
      <div className={`cz-reels ${free ? 'free' : ''}`}>
        {grid.map((col, reel) => (
          <div key={reel} className={`cz-reel ${tease.includes(reel) ? 'tease' : ''}`} style={{ height: CELL * 3 }}>
            <div className="cz-strip" style={strips ? {
              transform: rolling ? `translateY(${-(strips[reel].length - 3) * CELL}px)` : 'translateY(0)',
              transition: rolling ? `transform ${durs[reel]}ms cubic-bezier(.2, .9, .25, 1.06)` : 'none',
            } : undefined}>
              {(strips ? strips[reel] : col).map((s, i) => (
                <span key={i} className={`cz-sym s-${s} ${!strips && lineCells.has(`${reel}-${i}`) ? 'hit' : ''}`} style={{ height: CELL }}>
                  <Icon name={SYM_ICON[s]} size={30} />
                </span>
              ))}
            </div>
          </div>
        ))}
        {lines.length > 0 && !strips && (
          <svg className="cz-lines" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
            {lines.map((l, k) => <polyline key={l.line} style={{ animationDelay: `${k * 120}ms` }} points={LINES[l.line].slice(0, l.count).map((r, reel) => `${(reel + 0.5) * 20},${(r + 0.5) * 33.3}`).join(' ')} />)}
          </svg>
        )}
        {expand.map((reel) => special && (
          <span key={reel} className={`cz-expand s-${special.sym}`} style={{ left: `calc(${reel * 20}% + 4px)`, animationDelay: `${expand.indexOf(reel) * 90}ms` }} aria-hidden="true"><Icon name={SYM_ICON[special.sym]} size={54} /></span>
        ))}
        {free && <div className="cz-free-banner">Freispiele · noch {free.left}</div>}
      </div>
      <div className={`cz-result ${shown ? 'on' : ''}`}>{shown ? <><b>+{fmt(shown.win)}</b><small>{shown.text}</small></> : <small>Pokal ist Joker & Scatter · 3 Pokale = 10 Freispiele</small>}</div>
      {gamble ? (
        <div className={`cz-gamble ${gamble.lost ? 'lost' : ''}`}>
          <div className="cz-gamble-top">
            <span className={`cz-gcard ${gamble.card ?? ''}`} key={`${gamble.step}-${gamble.card}`}>{gamble.card ? <i /> : '?'}</span>
            <span className="cz-gamble-info">
              <small>Risiko · Stufe {gamble.step}/{GAMBLE_MAX}</small>
              <b>{gamble.lost ? 'Verloren' : fmt(gamble.amount)}</b>
              {!gamble.lost && <em>Richtig geraten: {fmt(gamble.amount * 2)}</em>}
            </span>
          </div>
          <div className="cz-gamble-btns">
            <button className="red" disabled={gamble.lost} onClick={() => void risk('red')}>Rot</button>
            <button className="take" disabled={gamble.lost} onClick={() => { sfx('coin'); setGamble(null); }}>Kassieren</button>
            <button className="black" disabled={gamble.lost} onClick={() => void risk('black')}>Schwarz</button>
          </div>
        </div>
      ) : <BetPicker value={stake} onChange={setStake} disabled={busy || auto > 0} />}
      <div className="cz-actions">
        {gift.left > 0 ? (
          <button className="cz-cta gift" disabled={busy || auto > 0} onClick={() => spin(true)}>Gratis-Dreh<small>noch {gift.left} · Einsatz {fmt(gift.bet)}</small></button>
        ) : <button className="cz-cta" disabled={busy || auto > 0} onClick={() => spin()}>Drehen</button>}
        <button className={`cz-sub ${auto ? 'on' : ''}`} onClick={() => setAuto(auto ? 0 : 10)}>{auto ? `Stopp (${auto})` : 'Auto ×10'}</button>
        <button className={`cz-sub sq ${turbo ? 'on' : ''}`} onClick={() => setTurbo(!turbo)} aria-pressed={turbo} aria-label="Turbo"><Icon name="bolt" size={20} /></button>
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
  const run = useRef<{ crash: number; start: number; cashed: number | null; stake: number; lastStep: number } | null>(null);
  const raf = useRef(0);
  const [rounds, setRounds] = useState(0);
  useEffect(() => () => cancelAnimationFrame(raf.current), []);
  // Auto-Runden: nach dem Ende automatisch neu schießen
  useEffect(() => {
    if (phase !== 'done' || rounds <= 0) return;
    const t = setTimeout(() => { setRounds((r) => r - 1); start(); }, 1300);
    return () => clearTimeout(t);
  }, [phase, rounds]); // eslint-disable-line react-hooks/exhaustive-deps

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
    run.current = { crash, start: performance.now(), cashed: null, stake, lastStep: 0 };
    setCashed(null); setPhase('fly'); setPts([]); sfx('whistle');
    const tick = (t: number) => {
      const r = run.current!;
      const sec = (t - r.start) / 1000;
      const m = crashAt(sec);
      if (m >= r.crash) {
        setMult(r.crash);
        setPhase('done');
        setHistory((h) => [r.crash, ...h].slice(0, 12));
        if (!r.cashed) { settle({ game: 'crash', bet: r.stake, win: 0, mult: r.crash }); sfx('whistle'); }
        return;
      }
      // Spannung: bei jedem halben Multiplikator ein höherer Ton
      const stepNow = Math.floor((m - 1) * 2);
      if (stepNow > r.lastStep) { r.lastStep = stepNow; if (!r.cashed) playStep(stepNow); }
      setMult(m);
      // Kurve: höchstens ~200 Punkte (bei langen Flügen jeden zweiten verwerfen) – sonst wird jedes Bild bei hohen Multiplikatoren langsamer.
      setPts((p) => {
        if (p.length && sec - p[p.length - 1][0] < 0.08) return p;
        const next: [number, number][] = [...p, [sec, m]];
        return next.length > 200 ? next.filter((_, i) => i % 2 === 0 || i === next.length - 1) : next;
      });
      if (!r.cashed && auto > 0 && m >= auto) cash(auto);
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
  };

  // Kurve: Zeit → x, Multiplikator → y (mitwachsende Achsen)
  const maxT = Math.max(6, pts.length ? pts[pts.length - 1][0] : 0);
  const maxM = Math.max(2, mult * 1.15);
  const path = pts.map(([t, m], i) => `${i ? 'L' : 'M'} ${(t / maxT) * 300} ${190 - ((m - 1) / (maxM - 1)) * 180}`).join(' ');
  const last = pts[pts.length - 1];
  const crashed = phase === 'done';
  const tier = mult >= 10 ? 'c4' : mult >= 5 ? 'c3' : mult >= 2 ? 'c2' : 'c1';
  return (
    <GameFrame title="Elfmeter-Crash" onClose={onClose} className="cz-crash"
      odds="Der Ball fliegt, der Multiplikator steigt. Die Chance, dass er mindestens bis m kommt, ist 97 % ÷ m (z. B. 2× in 48,5 %, 10× in 9,7 %). Höchstens 10.000×. Auszahlungsquote 97 %.">
      <div className={`cz-sky ${tier} ${phase === 'fly' ? 'flying' : ''} ${crashed ? (cashed ? 'won' : 'lost') : ''}`} style={{ '--spd': `${Math.max(0.25, 3 / mult)}s` } as React.CSSProperties}>
        <span className="cz-stars" aria-hidden="true" />
        <svg viewBox="0 0 300 200" preserveAspectRatio="none" aria-hidden="true">
          <path d={path} className="cz-curve" />
          {last && <circle cx={(last[0] / maxT) * 300} cy={190 - ((last[1] - 1) / (maxM - 1)) * 180} r="5" className="cz-ballpt" />}
        </svg>
        <div className="cz-mult">
          <b>{fx(mult)}×</b>
          <small>{phase === 'idle' ? 'Bereit zum Schuss' : crashed ? (cashed ? `Kassiert bei ${fx(cashed)}× · Torwart hielt bei ${fx(mult)}×` : 'Gehalten – nächster Schuss!') : cashed ? `Kassiert bei ${fx(cashed)}×` : 'Fliegt …'}</small>
        </div>
      </div>
      <div className="cz-history">{history.map((h, i) => <span key={i} className={h >= 2 ? 'hi' : 'lo'}>{fx(h)}×</span>)}</div>
      <div className="cz-chipsel" role="radiogroup" aria-label="Automatisch kassieren">
        <small>Auto-Kasse</small>
        {AUTO.map((a) => <button key={a} className={auto === a ? 'on' : ''} disabled={phase === 'fly'} onClick={() => setAutoC(a)}>{a ? `${fx(a)}×` : 'aus'}</button>)}
      </div>
      <BetPicker value={stake} onChange={setStake} disabled={phase === 'fly'} />
      <div className="cz-actions">
        <button className={`cz-sub ${rounds ? 'on' : ''}`} onClick={() => setRounds(rounds ? 0 : 10)}>{rounds ? `Stopp (${rounds})` : 'Auto ×10'}</button>
        {phase === 'fly' && !cashed
          ? <button className="cz-cta cash" onClick={() => cash(mult)}>Kassieren · {fmt(stake * mult)}</button>
          : <button className="cz-cta" disabled={phase === 'fly'} onClick={start}>{phase === 'fly' ? 'Fliegt …' : 'Schießen'}</button>}
      </div>
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
      sfx('whistle');
      return;
    }
    const open = [...round.open, i];
    playStep(safe * 2); buzz(15);
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
            <button key={i} className={`cz-cell ${reveal ? (mine ? 'save' : 'goal') : ''} ${opened ? 'picked' : ''}`} style={{ animationDelay: round?.over && mine && !opened ? `${(i % 7) * 70}ms` : undefined }} disabled={!playing || opened} onClick={() => pick(i)} aria-label={reveal ? (mine ? 'Parade' : 'Tor') : `Feld ${i + 1}`}>
              {reveal && <Icon name={mine ? 'shield' : 'ball'} size={22} />}
            </button>
          );
        })}
      </div>
      <div className={`cz-result ${round ? 'on' : ''}`}>
        {round?.over === 'lost' ? <><b className="pink">Parade!</b><small>Nächster Anstoß wartet</small></>
          : round?.over === 'cashed' ? <><b>+{fmt(round.stake * mult)}</b><small>{fx(mult)}× kassiert</small></>
          : round ? <><b>{fx(mult)}×</b><small>Nächstes Tor: {fx(nextMult)}×</small></> : <small>Wähle, wie viele Felder der Torwart hält</small>}
      </div>
      {playing && (
        <div className="cz-ladder" aria-label="Nächste Multiplikatoren">
          {Array.from({ length: Math.min(6, MINE_FIELDS - count - safe) }, (_, k) => <span key={k} className={k === 0 ? 'next' : ''}>{fx(minesMult(count, safe + 1 + k))}×</span>)}
        </div>
      )}
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
