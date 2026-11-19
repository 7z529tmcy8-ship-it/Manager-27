import { useEffect, useRef, useState } from 'react';
import { getClubState, setClubState, useClub } from '../../clubStore';
import {
  RANK_NAME, RED, ROULETTE_LABEL, WHEEL, WHEEL_COST, WHEEL_ORDER, addCard, bjReturn, casinoOf, dealerPlay, handValue,
  isBlackjack, markWheel, maxBet, payout, randomCard, rouletteReturn, shoe, spend, spinRoulette, spinWheel, takeJackpot, wheelFree,
  type BjCard, type RouletteBet,
} from '../../game/casino';
import { motionReduced } from '../../settings';
import Icon from '../Icon';
import { BetPicker, GameFrame, bet, buzz, fmt, giveXp, settle, sfx, showWin, useBet } from './shared';

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
/** Ticken wie beim echten Rad: erst schnell, dann immer langsamer bis zum Stillstand. */
function tickDown(totalMs: number): () => void {
  const ids: number[] = [];
  let t = 0; let gap = 45;
  while (t < totalMs - 120) { ids.push(window.setTimeout(() => sfx('tick'), t)); t += gap; gap *= 1.075; }
  return () => ids.forEach((id) => clearTimeout(id));
}

// ---------------------------------------------------------------- Roulette
const OUTSIDE: RouletteBet[][] = [['d1', 'd2', 'd3'], ['low', 'even', 'red', 'black', 'odd', 'high']];
const SEG = 360 / 37;

export function Roulette({ onClose }: { onClose: () => void }) {
  const club = useClub();
  const [chip, setChip] = useBet('roulette', 20);
  const [bets, setBets] = useState<Record<string, number>>({});
  const [rot, setRot] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [last, setLast] = useState<number[]>([]);
  const [res, setRes] = useState<{ n: number; win: number } | null>(null);
  const total = Object.values(bets).reduce((a, b) => a + b, 0);
  const cap = Math.min(maxBet(club), casinoOf(club).chips);
  const add = (b: RouletteBet) => {
    if (spinning) return;
    if (total + chip > cap) { sfx('error'); return; }
    setRes(null);
    setBets((x) => ({ ...x, [b]: (x[b] ?? 0) + chip }));
    sfx('tap');
  };
  const spin = async () => {
    if (spinning || !total || !bet(total)) return;
    setSpinning(true); setRes(null);
    const n = spinRoulette();
    const idx = WHEEL_ORDER.indexOf(n);
    const target = 360 * 6 - idx * SEG - SEG / 2 + (Math.random() - 0.5) * SEG * 0.6;
    setRot((r) => r - (r % 360) + target);
    const stop = motionReduced() ? () => {} : tickDown(4200);
    await wait(motionReduced() ? 300 : 4200);
    stop();
    const win = Object.entries(bets).reduce((a, [b, amt]) => a + rouletteReturn(b as RouletteBet, amt, n), 0);
    settle({ game: 'roulette', bet: total, win });
    setRes({ n, win });
    setLast((l) => [n, ...l].slice(0, 12));
    setSpinning(false);
  };
  const colorOf = (n: number) => (n === 0 ? 'z' : RED.includes(n) ? 'r' : 'b');
  return (
    <GameFrame title="Roulette" onClose={onClose} className="cz-roulette"
      odds="Europäisches Roulette mit einer Null. Zahl 36× (inkl. Einsatz), Dutzend 3×, Rot/Schwarz/Gerade/Ungerade/1–18/19–36 2×. Bei 0 verlieren alle einfachen Chancen. Auszahlungsquote 97,3 %.">
      <div className="cz-wheelbox">
        <svg className="cz-rwheel" viewBox="-100 -100 200 200" style={{ transform: `rotate(${rot}deg)`, transition: spinning ? `transform ${motionReduced() ? 300 : 4200}ms cubic-bezier(.12, .7, .15, 1)` : 'none' }} aria-hidden="true">
          {WHEEL_ORDER.map((n, i) => {
            const a0 = (i * SEG - 90 - SEG / 2) * (Math.PI / 180);
            const a1 = a0 + SEG * (Math.PI / 180);
            const am = (a0 + a1) / 2;
            return (
              <g key={n}>
                <path className={`seg ${colorOf(n)}`} d={`M0 0 L${Math.cos(a0) * 96} ${Math.sin(a0) * 96} A96 96 0 0 1 ${Math.cos(a1) * 96} ${Math.sin(a1) * 96}Z`} />
                <text x={Math.cos(am) * 84} y={Math.sin(am) * 84} transform={`rotate(${(am * 180) / Math.PI + 90} ${Math.cos(am) * 84} ${Math.sin(am) * 84})`}>{n}</text>
              </g>
            );
          })}
          <circle r="62" className="hub" />
        </svg>
        <span className="cz-pointer" aria-hidden="true" />
        <div className="cz-wheel-center">{res ? <b className={colorOf(res.n)}>{res.n}</b> : <Icon name="ball" size={26} />}</div>
      </div>
      <div className="cz-history">{last.map((n, i) => <span key={i} className={`rn ${colorOf(n)}`}>{n}</span>)}</div>
      <div className={`cz-result ${res ? 'on' : ''}`}>{res ? (res.win ? <><b>+{fmt(res.win)}</b><small>Nummer {res.n}</small></> : <><b className="pink">{res.n}</b><small>Nächste Runde – setz neu!</small></>) : <small>Setz deine Chips – Einsatz gesamt {fmt(total)}</small>}</div>
      <div className="cz-table">
        <button className={`num z ${bets.n0 ? 'has' : ''}`} onClick={() => add('n0')}>0{bets.n0 ? <em>{fmt(bets.n0)}</em> : null}</button>
        <div className="nums">
          {[3, 2, 1].map((row) => Array.from({ length: 12 }, (_, c) => {
            const n = c * 3 + row;
            const k = `n${n}`;
            return <button key={n} className={`num ${colorOf(n)} ${bets[k] ? 'has' : ''}`} onClick={() => add(k as RouletteBet)}>{n}{bets[k] ? <em>{fmt(bets[k])}</em> : null}</button>;
          }))}
        </div>
        {OUTSIDE.map((row, i) => (
          <div key={i} className={`outs o${row.length}`}>
            {row.map((b) => <button key={b} className={`out ${b} ${bets[b] ? 'has' : ''}`} onClick={() => add(b)}>{ROULETTE_LABEL[b]}{bets[b] ? <em>{fmt(bets[b])}</em> : null}</button>)}
          </div>
        ))}
      </div>
      <BetPicker value={chip} onChange={setChip} disabled={spinning} label="Chip-Wert" />
      <div className="cz-actions">
        <button className="cz-cta" disabled={spinning || !total} onClick={spin}>{spinning ? 'Kugel rollt …' : `Drehen · ${fmt(total)}`}</button>
        <button className="cz-sub" disabled={spinning || !total} onClick={() => setBets({})}>Leeren</button>
      </div>
    </GameFrame>
  );
}

// ---------------------------------------------------------------- Blackjack
const SUIT_ICON = ['ball', 'heart', 'shield', 'star'];
function Card({ c, hidden, i }: { c: BjCard; hidden?: boolean; i: number }) {
  return (
    <span className={`cz-card ${hidden ? 'back' : c.suit % 2 ? 'red' : 'dark'}`} style={{ animationDelay: `${i * 60}ms` }}>
      {hidden ? <Icon name="shield" size={26} /> : <><b>{RANK_NAME(c.rank)}</b><Icon name={SUIT_ICON[c.suit]} size={22} /><b className="rev">{RANK_NAME(c.rank)}</b></>}
    </span>
  );
}

export function Blackjack({ onClose }: { onClose: () => void }) {
  const [stake, setStake] = useBet('blackjack', 50);
  const deck = useRef<BjCard[]>(shoe());
  const [player, setPlayer] = useState<BjCard[]>([]);
  const [dealer, setDealer] = useState<BjCard[]>([]);
  const [hide, setHide] = useState(true);
  const [phase, setPhase] = useState<'idle' | 'play' | 'dealer' | 'done'>('idle');
  const [cur, setCur] = useState(0);
  const [msg, setMsg] = useState<{ text: string; win: number } | null>(null);
  const draw = () => { if (deck.current.length < 20) deck.current = shoe(); return deck.current.pop()!; };

  const finish = async (p: BjCard[], d0: BjCard[], b: number) => {
    setPhase('dealer'); setHide(false);
    let d = d0;
    if (handValue(p).total <= 21 && !isBlackjack(p)) {
      const full = dealerPlay(d0, deck.current);
      for (let i = d0.length; i < full.length; i++) { await wait(480); d = full.slice(0, i + 1); setDealer(d); sfx('tap'); }
    }
    const r = bjReturn(p, d, b);
    settle({ game: 'blackjack', bet: b, win: r.ret });
    setMsg({ text: { bj: 'Blackjack!', win: 'Gewonnen!', push: 'Unentschieden', lose: handValue(p).total > 21 ? 'Über 21 – nächste Hand!' : 'Nächste Hand!' }[r.outcome], win: r.ret });
    setPhase('done');
  };
  const deal = async () => {
    if (phase === 'play' || phase === 'dealer' || !bet(stake)) return;
    const p = [draw(), draw()];
    const d = [draw(), draw()];
    setCur(stake); setMsg(null); setHide(true); setPlayer([]); setDealer([]);
    setPhase('play');
    for (let i = 0; i < 2; i++) { await wait(180); setPlayer(p.slice(0, i + 1)); sfx('tap'); await wait(180); setDealer(d.slice(0, i + 1)); }
    if (isBlackjack(p) || isBlackjack(d)) await finish(p, d, stake);
  };
  const hit = async () => {
    const p = [...player, draw()];
    setPlayer(p); sfx('tap');
    if (handValue(p).total > 21) { await finish(p, dealer, cur); }
  };
  const double = async () => {
    if (player.length !== 2 || !bet(cur)) return;
    const b = cur * 2;
    setCur(b);
    const p = [...player, draw()];
    setPlayer(p); sfx('tap');
    await finish(p, dealer, b);
  };
  const pv = handValue(player);
  const dv = handValue(hide ? dealer.slice(0, 1) : dealer);
  return (
    <GameFrame title="Blackjack" onClose={onClose} className="cz-bj"
      odds="4 Kartendecks. Dealer zieht bis 16 und steht ab 17. Blackjack zahlt 3:2, Sieg 1:1, Gleichstand gibt den Einsatz zurück. Verdoppeln mit den ersten zwei Karten. Bei guter Spielweise ca. 99 % Auszahlungsquote.">
      <div className="cz-felt">
        <div className="cz-hand"><small>Bank {dealer.length ? `· ${dv.total}${hide ? '+?' : ''}` : ''}</small><div>{dealer.map((c, i) => <Card key={i} c={c} i={i} hidden={hide && i === 1} />)}</div></div>
        <div className={`cz-bj-msg ${msg ? 'on' : ''} ${msg && msg.win > cur ? 'win' : ''}`}>{msg ? <>{msg.text}{msg.win ? <b>+{fmt(msg.win)}</b> : null}</> : <small>Blackjack zahlt 3:2</small>}</div>
        <div className="cz-hand"><div>{player.map((c, i) => <Card key={i} c={c} i={i} />)}</div><small>Du {player.length ? `· ${pv.total}${pv.soft && pv.total < 21 ? ' (weich)' : ''}` : ''}</small></div>
      </div>
      <BetPicker value={stake} onChange={setStake} disabled={phase === 'play' || phase === 'dealer'} />
      <div className="cz-actions">
        {phase === 'play' ? (
          <>
            <button className="cz-cta" onClick={hit}>Karte</button>
            <button className="cz-cta alt" onClick={() => finish(player, dealer, cur)}>Stehen</button>
            <button className="cz-sub" disabled={player.length !== 2} onClick={double}>Verdoppeln</button>
          </>
        ) : <button className="cz-cta" disabled={phase === 'dealer'} onClick={deal}>{phase === 'dealer' ? 'Bank zieht …' : 'Geben'}</button>}
      </div>
    </GameFrame>
  );
}

// ---------------------------------------------------------------- Glücksrad
const W_TOTAL = WHEEL.reduce((a, w) => a + w.weight, 0);
const W_COLORS = ['#3b2a8f', '#ff3fb4', '#2a6fdb', '#7a3cff', '#ffd24a', '#19c39a', '#ff7a59', '#3ff0ff', '#ff5e3a', '#e8c36a', '#ffffff'];

export function Wheel({ onClose }: { onClose: () => void }) {
  const club = useClub();
  const free = wheelFree(club);
  const [rot, setRot] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [prize, setPrize] = useState<string | null>(null);
  const segs = (() => { let a = 0; return WHEEL.map((w) => { const s = { from: a, to: a + (w.weight / W_TOTAL) * 360 }; a = s.to; return s; }); })();
  useEffect(() => () => { /* nichts */ }, []);

  const spin = async () => {
    if (spinning) return;
    let c = getClubState();
    if (free) c = markWheel(c);
    else { const paid = spend(c, WHEEL_COST); if (!paid) { sfx('error'); return; } c = paid; }
    setClubState(c);
    setSpinning(true); setPrize(null);
    const i = spinWheel();
    const s = segs[i];
    const at = s.from + (s.to - s.from) * (0.2 + Math.random() * 0.6);
    setRot((r) => r - (r % 360) + 360 * 7 - at);
    const stop = motionReduced() ? () => {} : tickDown(5200);
    await wait(motionReduced() ? 300 : 5200);
    stop();
    const p = WHEEL[i].prize;
    const cost = free ? 0 : WHEEL_COST;
    if (p.kind === 'chips') { settle({ game: 'wheel', bet: cost, win: p.amount }); setPrize(`+${fmt(p.amount)} Chips`); }
    else if (p.kind === 'xp') { setClubState(payout(getClubState(), { game: 'wheel', bet: cost, win: 0 })); const who = giveXp(p.amount); setPrize(who ? `+${p.amount} XP für ${who}` : `${p.amount} XP – starte eine Karriere mit Spielertyp`); sfx('levelUp'); }
    else if (p.kind === 'card') { const card = randomCard(p.tier); setClubState(addCard(payout(getClubState(), { game: 'wheel', bet: cost, win: 0 }), card)); setPrize(`${card.name} (${card.ovr}) für dein Team!`); sfx('revealRare'); }
    else { const j = takeJackpot(getClubState()); const card = randomCard('icon'); setClubState(addCard(payout(j.club, { game: 'wheel', bet: cost, win: j.amount, jackpot: false }), card)); showWin({ kind: 'jackpot', amount: j.amount, card }); setPrize('JACKPOT!'); }
    buzz([20, 40, 20]);
    setSpinning(false);
  };
  return (
    <GameFrame title="Glücksrad" onClose={onClose} className="cz-wheelgame"
      odds={`Die Felder sind so groß wie ihre echte Chance: ${WHEEL.map((w) => `${w.label} ${((w.weight / W_TOTAL) * 100).toFixed(1).replace('.', ',')} %`).join(' · ')}. Einmal am Tag gratis, danach ${fmt(WHEEL_COST)} Chips pro Dreh.`}>
      <div className="cz-wheelbox big">
        <svg className="cz-fwheel" viewBox="-100 -100 200 200" style={{ transform: `rotate(${rot}deg)`, transition: spinning ? `transform ${motionReduced() ? 300 : 5200}ms cubic-bezier(.1, .75, .12, 1)` : 'none' }} aria-hidden="true">
          {segs.map((s, i) => {
            const a0 = (s.from - 90) * (Math.PI / 180);
            const a1 = (s.to - 90) * (Math.PI / 180);
            const am = (a0 + a1) / 2;
            const large = s.to - s.from > 180 ? 1 : 0;
            return (
              <g key={i}>
                <path d={`M0 0 L${Math.cos(a0) * 96} ${Math.sin(a0) * 96} A96 96 0 ${large} 1 ${Math.cos(a1) * 96} ${Math.sin(a1) * 96}Z`} fill={W_COLORS[i]} className="wseg" />
                {s.to - s.from > 12 && <text x={Math.cos(am) * 62} y={Math.sin(am) * 62} transform={`rotate(${(am * 180) / Math.PI} ${Math.cos(am) * 62} ${Math.sin(am) * 62})`}>{WHEEL[i].label}</text>}
              </g>
            );
          })}
          <circle r="18" className="hub" />
        </svg>
        <span className={`cz-pointer ${spinning ? 'wobble' : ''}`} aria-hidden="true" />
      </div>
      <div className={`cz-result ${prize ? 'on' : ''}`}>{prize ? <b>{prize}</b> : <small>{free ? 'Dein Gratis-Dreh für heute wartet' : `Extra-Dreh: ${fmt(WHEEL_COST)} Chips`}</small>}</div>
      <div className="cz-actions"><button className="cz-cta" disabled={spinning} onClick={spin}>{spinning ? 'Dreht …' : free ? 'Gratis drehen' : `Drehen · ${fmt(WHEEL_COST)}`}</button></div>
    </GameFrame>
  );
}
