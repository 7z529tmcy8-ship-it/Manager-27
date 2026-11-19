import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  GOLD_CHANCE, GOLD_MULT, PLINKO_ROWS_OPTIONS, RISKS, dropBall, plinkoP, plinkoTable, plinkoWin, type Risk,
} from '../../game/casino';
import { motionReduced } from '../../settings';
import { playStep } from '../../sound';
import Icon from '../Icon';
import { BetPicker, GameFrame, bet, buzz, celebrate, fmt, settle, sfx, shake, useBet } from './shared';

const RISK_NAME: Record<Risk, string> = { low: 'Niedrig', mid: 'Mittel', high: 'Hoch', extreme: 'Extrem' };
const AUTO_COUNTS = [10, 25, 50, 100];
const MAX_BALLS = 40;
const PEG_COLORS = ['#ff3fb4', '#3ff0ff', '#ffd24a', '#39ff88', '#a35cff', '#ff7a59'];

type Ball = { id: number; path: number[]; slot: number; gold: boolean; stake: number; mult: number; start: number; durs: number[]; ends: number[]; peak: boolean; hitRow: number };
type Pop = { slot: number; at: number; text: string; color: string };
type Session = { best: number; bigWin: number; streak: number; bestStreak: number };

/** Farbe eines Fachs nach Multiplikator: kalt in der Mitte, heiß am Rand. */
function binColor(m: number): string {
  if (m >= 100) return '#ffd24a';
  if (m >= 20) return '#ff7a59';
  if (m >= 5) return '#ff3fb4';
  if (m >= 2) return '#c13cff';
  if (m >= 1) return '#7a3cff';
  if (m >= 0.5) return '#3b5bdb';
  return '#26315e';
}
const multText = (m: number) => (m >= 1000 ? `${(m / 1000).toFixed(m >= 10_000 ? 0 : 1).replace('.', ',')}k` : m >= 10 ? m.toFixed(0) : String(m).replace('.', ','));
const ease = (u: number) => 1 - (1 - u) ** 2;

/** Torwand-Plinko 2.0: 8–16 Reihen, vier Risikostufen bis 10.000×, Goldbälle, Zeitlupe vor großen Treffern, Auto bis 100 Bälle. */
export default function Plinko({ onClose }: { onClose: () => void }) {
  const [stake, setStake] = useBet('plinko', 20);
  const [rows, setRows] = useState<number>(() => { try { return Number(sessionStorage.getItem('fc-plinko-rows')) || 12; } catch { return 12; } });
  const [risk, setRisk] = useState<Risk>(() => { try { return (sessionStorage.getItem('fc-plinko-risk') as Risk) || 'mid'; } catch { return 'mid'; } });
  const [turbo, setTurbo] = useState(false);
  const [inFlight, setInFlight] = useState(0);
  const [auto, setAuto] = useState<{ left: number; total: number } | null>(null);
  const [autoN, setAutoN] = useState(25);
  const [hist, setHist] = useState<{ id: number; m: number; gold: boolean }[]>([]);
  const [sess, setSess] = useState<Session>({ best: 0, bigWin: 0, streak: 0, bestStreak: 0 });

  const table = plinkoTable(rows, risk);
  const wrap = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const balls = useRef<Ball[]>([]);
  const flashes = useRef(new Map<string, number>());
  const binHits = useRef(new Map<number, number>());
  const pops = useRef<Pop[]>([]);
  const seq = useRef(0);
  const lastTick = useRef(0);
  const geo = useRef({ w: 360, h: 340, dpr: 1 });
  const cfg = useRef({ rows, risk, table, turbo, stake });
  cfg.current = { rows, risk, table, turbo, stake };
  const fast = motionReduced();

  // Größe des Bretts
  useLayoutEffect(() => {
    const el = wrap.current; const cv = canvas.current;
    if (!el || !cv) return;
    const ro = new ResizeObserver(() => {
      const w = el.clientWidth; const wide = window.innerWidth >= 900 && window.innerWidth > window.innerHeight;
      const h = Math.round(Math.max(240, Math.min(w * 0.98, wide ? window.innerHeight - 150 : window.innerHeight * 0.52)));
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      cv.width = w * dpr; cv.height = h * dpr; cv.style.height = `${h}px`;
      geo.current = { w, h, dpr };
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Ball abwerfen
  const drop = (): boolean => {
    if (balls.current.length >= MAX_BALLS) return true;
    const { rows: n, table: t, turbo: tb, stake: st } = cfg.current;
    if (!bet(st)) return false;
    const d = dropBall(Math.random, n);
    const mult = t[d.slot];
    const peak = mult * (d.gold ? GOLD_MULT : 1) >= 10;
    const base = fast ? 40 : tb ? 62 : 105;
    // Zeitlupe: Steht ein großer Treffer fest, werden die letzten 4 Reihen langsam (es ist ehrlich – das Ergebnis steht schon).
    const durs = Array.from({ length: n + 1 }, (_, i) => (i === 0 ? base * 1.4 : base) * (peak && !fast && i > n - 4 ? 2.6 : 1));
    const ends = durs.reduce<number[]>((a, x) => [...a, (a[a.length - 1] ?? 0) + x], []);
    balls.current.push({ id: seq.current++, path: d.path, slot: d.slot, gold: d.gold, stake: st, mult, start: performance.now(), durs, ends, peak, hitRow: -1 });
    setInFlight(balls.current.length);
    if (d.gold) sfx('unlock');
    return true;
  };

  // Auto-Modus
  useEffect(() => {
    if (!auto) return;
    if (auto.left <= 0) { setAuto(null); return; }
    const t = setTimeout(() => {
      if (!drop()) { setAuto(null); return; }
      setAuto((a) => (a ? { ...a, left: a.left - 1 } : a));
    }, turbo ? 130 : 240);
    return () => clearTimeout(t);
  }, [auto, turbo]); // eslint-disable-line react-hooks/exhaustive-deps

  // Zeichnen und Landen
  useEffect(() => {
    let raf = 0;
    const draw = (now: number) => {
      const cv = canvas.current;
      const ctx = cv?.getContext('2d');
      if (!cv || !ctx) { raf = requestAnimationFrame(draw); return; }
      const { w, h, dpr } = geo.current;
      const { rows: n, table: t } = cfg.current;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      const sx = w / (n + 2);
      const top = 22;
      const binH = Math.max(20, Math.min(30, sx * 0.9));
      const sy = (h - top - binH - 14) / n;
      const pegR = Math.max(2, Math.min(3.6, sx * 0.12));
      const ballR = Math.max(3.5, Math.min(7, sx * 0.3));
      const pegX = (r: number, j: number) => w / 2 + (j - (r + 2) / 2) * sx;
      const pegY = (r: number) => top + r * sy;
      const posX = (r: number, k: number) => w / 2 + (k - r / 2) * sx;
      const binY = top + (n - 1) * sy + sy * 0.7;

      // Pfosten
      for (let r = 0; r < n; r++) for (let j = 0; j < r + 3; j++) {
        const f = flashes.current.get(`${r}-${j}`);
        const glow = f !== undefined ? Math.max(0, 1 - (now - f) / 260) : 0;
        ctx.beginPath();
        ctx.arc(pegX(r, j), pegY(r), pegR + glow * 2.2, 0, Math.PI * 2);
        const hue = PEG_COLORS[(r + j) % PEG_COLORS.length];
        ctx.fillStyle = glow > 0 ? hue : 'rgba(210, 222, 255, .7)';
        if (glow > 0) { ctx.shadowColor = hue; ctx.shadowBlur = 16 * glow; }
        ctx.fill();
        ctx.shadowBlur = 0;
      }
      // Fächer
      for (let k = 0; k <= n; k++) {
        const hit = binHits.current.get(k);
        const ht = hit !== undefined ? Math.max(0, 1 - (now - hit) / 320) : 0;
        const bw = sx - 3;
        const x = posX(n, k) - bw / 2;
        const y = binY + ht * 6;
        const m = t[k];
        ctx.fillStyle = binColor(m);
        ctx.globalAlpha = 0.88 + ht * 0.12;
        roundRect(ctx, x, y, bw, binH, 5);
        ctx.fill();
        if (ht > 0) { ctx.fillStyle = `rgba(255,255,255,${ht * 0.55})`; roundRect(ctx, x, y, bw, binH, 5); ctx.fill(); }
        ctx.globalAlpha = 1;
        ctx.fillStyle = m >= 100 ? '#2a1600' : '#fff';
        ctx.font = `800 ${Math.max(7, Math.min(12, bw * 0.34))}px system-ui, sans-serif`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(multText(m), x + bw / 2, y + binH / 2 + 0.5);
      }
      // Bälle
      const landed: Ball[] = [];
      for (const b of balls.current) {
        const el = now - b.start;
        const seg = b.ends.findIndex((e) => el < e);
        if (seg === -1) { landed.push(b); continue; }
        const u = (el - (seg ? b.ends[seg - 1] : 0)) / b.durs[seg];
        const kBefore = b.path.slice(0, Math.max(0, seg - 1)).reduce((a, x) => a + x, 0);
        let x: number; let y: number;
        if (seg === 0) { x = w / 2; y = pegY(0) - sy * 1.1 + sy * 1.1 * u * u - pegR - ballR; }
        else {
          const r0 = seg - 1;
          const k1 = kBefore + b.path[r0];
          const x0 = posX(r0, kBefore); const x1 = posX(seg, k1);
          const y0 = pegY(r0) - pegR - ballR;
          const y1 = seg === n ? binY - ballR + 2 : pegY(seg) - pegR - ballR;
          x = x0 + (x1 - x0) * ease(u);
          y = y0 + (y1 - y0) * u ** 1.7 - Math.sin(u * Math.PI) * sy * 0.32;
          // Pfosten-Treffer melden (einmal pro Reihe)
          if (b.hitRow < r0) {
            b.hitRow = r0;
            flashes.current.set(`${r0}-${kBefore + 1}`, now);
            if (now - lastTick.current > 28) { lastTick.current = now; sfx('tick'); }
            if (b.peak && r0 >= n - 4) playStep((r0 - (n - 4)) * 3 + 6);
          }
        }
        if (b.peak && seg >= n - 3) {
          ctx.beginPath(); ctx.arc(x, y, ballR * 2.6, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(255, 63, 180, .18)'; ctx.fill();
        }
        drawBall(ctx, x, y, ballR, b.gold);
      }
      // Schwebende Gewinne
      pops.current = pops.current.filter((p) => now - p.at < 1000);
      for (const p of pops.current) {
        const a = (now - p.at) / 1000;
        ctx.globalAlpha = 1 - a;
        ctx.fillStyle = p.color;
        ctx.font = `900 ${14 + (p.text.length > 6 ? 0 : 2)}px system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText(p.text, posX(n, p.slot), binY - 12 - a * 34);
        ctx.globalAlpha = 1;
      }
      if (landed.length) {
        balls.current = balls.current.filter((b) => !landed.includes(b));
        setInFlight(balls.current.length);
        for (const b of landed) land(b, now);
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const land = (b: Ball, now: number) => {
    const mult = b.mult * (b.gold ? GOLD_MULT : 1);
    const win = plinkoWin(b.stake, b.mult, b.gold);
    binHits.current.set(b.slot, now);
    if (mult >= 1 || b.gold) pops.current.push({ slot: b.slot, at: now, text: `${b.gold ? 'GOLD ' : ''}${multText(mult)}×`, color: b.gold ? '#ffd24a' : mult >= 1 ? '#7dffb2' : '#ff8fa3' });
    if (mult >= 50) shake(true);
    else if (mult >= 10) buzz([30, 40, 30]);
    settle({ game: 'plinko', bet: b.stake, win, mult }, { quiet: true });
    // Verlauf zeigt nur Treffer ab 1× – kein Frust-Ticker.
    if (mult >= 1) setHist((hs) => [{ id: b.id, m: mult, gold: b.gold }, ...hs].slice(0, 6));
    if (mult >= 2) celebrate(mult);
    setSess((s) => {
      const streak = mult >= 1 ? s.streak + 1 : 0;
      return { best: Math.max(s.best, mult), bigWin: Math.max(s.bigWin, win), streak, bestStreak: Math.max(s.bestStreak, streak) };
    });
  };

  const pickRows = (n: number) => { setRows(n); try { sessionStorage.setItem('fc-plinko-rows', String(n)); } catch { /* egal */ } };
  const pickRisk = (r: Risk) => { setRisk(r); try { sessionStorage.setItem('fc-plinko-risk', r); } catch { /* egal */ } };
  const busy = inFlight > 0 || !!auto;
  const p = plinkoP(rows);
  const top = table[0];

  return (
    <GameFrame title="Torwand-Plinko" onClose={onClose} className="cz-plinko2"
      odds={`${rows} Reihen, Risiko ${RISK_NAME[risk]}: ${table.map(multText).join(' · ')}×. Chance aufs Randfach: 1 zu ${fmt(1 / p[0] / 2)}. ${Math.round(GOLD_CHANCE * 100)} % aller Bälle sind Goldbälle und zahlen doppelt. Auszahlungsquote inkl. Goldball ca. 96 %. Höchstgewinn pro Ball 1 Mio. Chips.`}>
      <div className="pk-left">
      <div className="pk-hud">
        <span><small>Bester</small><b className="gold">{sess.best ? `${multText(sess.best)}×` : '–'}</b></span>
        <span><small>Top-Gewinn</small><b className="up">{sess.bigWin ? `+${fmt(sess.bigWin)}` : '–'}</b></span>
        <span className={sess.streak >= 3 ? 'hot' : ''}><small>Serie</small><b className="pink">{sess.streak}{sess.streak >= 3 && <Icon name="fire" size={16} />}</b></span>
      </div>
      <div className="pk-board" ref={wrap}>
        <canvas ref={canvas} className="pk-canvas" aria-label={`Plinko-Brett mit ${rows} Reihen`} />
        <span className="pk-top">bis <b>{fmt(top)}×</b></span>
        <ul className="pk-hist" aria-label="Letzte Treffer">
          {hist.map((x) => <li key={x.id} style={{ background: x.gold ? '#ffd24a' : binColor(x.m) }} className={x.gold ? 'gold' : ''}>{multText(x.m)}×</li>)}
        </ul>
      </div>
      </div>
      <div className="pk-right">
      <div className="pk-row">
        <div className="cz-chipsel" role="radiogroup" aria-label="Reihen">
          <small>Reihen</small>
          {PLINKO_ROWS_OPTIONS.map((n) => <button key={n} className={rows === n ? 'on' : ''} disabled={busy} onClick={() => pickRows(n)}>{n}</button>)}
        </div>
        <div className="cz-chipsel pk-risk" role="radiogroup" aria-label="Risiko">
          <small>Risiko</small>
          {RISKS.map((r) => <button key={r} className={`r-${r} ${risk === r ? 'on' : ''}`} disabled={busy} onClick={() => pickRisk(r)}>{RISK_NAME[r]}</button>)}
        </div>
      </div>
      <BetPicker value={stake} onChange={setStake} disabled={!!auto} label="Einsatz pro Ball" />
      {auto ? (
        <div className="cz-actions">
          <button className="cz-cta cash" onClick={() => setAuto(null)}>Stopp · noch {auto.left}</button>
          <button className={`cz-sub sq ${turbo ? 'on' : ''}`} onClick={() => setTurbo(!turbo)} aria-pressed={turbo} aria-label="Turbo"><Icon name="bolt" size={20} /></button>
        </div>
      ) : (
        <>
          <div className="cz-actions">
            <button className="cz-cta" onClick={() => drop()}>Ball · {fmt(stake)}</button>
            <button className={`cz-sub sq ${turbo ? 'on' : ''}`} onClick={() => setTurbo(!turbo)} aria-pressed={turbo} aria-label="Turbo"><Icon name="bolt" size={20} /></button>
          </div>
          <div className="pk-auto">
            <small>Auto</small>
            {AUTO_COUNTS.map((n) => <button key={n} className={autoN === n ? 'on' : ''} onClick={() => setAutoN(n)}>{n}</button>)}
            <button className="go" onClick={() => setAuto({ left: autoN, total: autoN })}><b>Start</b><small>{fmt(autoN * stake)}</small></button>
          </div>
        </>
      )}
      </div>
    </GameFrame>
  );
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}

/** Ball als kleiner Fußball – Goldbälle leuchten. */
function drawBall(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, gold: boolean) {
  ctx.save();
  ctx.shadowColor = gold ? '#ffd24a' : 'rgba(255,255,255,.8)';
  ctx.shadowBlur = gold ? 14 : 6;
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = gold ? '#ffd24a' : '#ffffff';
  ctx.fill();
  ctx.shadowBlur = 0;
  // Fünfeck in der Mitte
  ctx.beginPath();
  for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + (i * 2 * Math.PI) / 5; const px = x + Math.cos(a) * r * 0.42; const py = y + Math.sin(a) * r * 0.42; if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py); }
  ctx.closePath();
  ctx.fillStyle = gold ? '#8a5a00' : '#15102a';
  ctx.fill();
  ctx.restore();
}
