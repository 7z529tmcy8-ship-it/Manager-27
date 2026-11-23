import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  GOLD_CHANCE, GOLD_MULT, PLINKO_ROWS_OPTIONS, RISKS, dropBall, plinkoP, plinkoTable, plinkoWin, type Risk,
} from '../../game/casino';
import { motionReduced } from '../../settings';
import { playStep, plinkoSound } from '../../sound';
import { plinkoWinArmed, takePlinkoWin } from '../../game/dev';
import Icon from '../Icon';
import { BetPicker, GameFrame, bet, buzz, celebrate, fmt, fmtShort, settle, sfx, shake, useBet } from './shared';

const RISK_NAME: Record<Risk, string> = { low: 'Niedrig', mid: 'Mittel', high: 'Hoch', extreme: 'Extrem' };
const AUTO_COUNTS = [10, 25, 50, 100];
const MAX_BALLS = 40;
const PEG_COLORS = ['#ff3fb4', '#3ff0ff', '#ffd24a', '#39ff88', '#a35cff', '#ff7a59'];

type Ball = { id: number; path: number[]; slot: number; gold: boolean; stake: number; mult: number; start: number; durs: number[]; ends: number[]; peak: boolean; hitRow: number; trail: { x: number; y: number }[] };
type Ring = { x: number; y: number; at: number; color: string; size: number; beam: boolean };
type Spark = { x: number; y: number; vx: number; vy: number; born: number; life: number; color: string; size: number };
const FEVER_AT = 5;
type Pop = { slot: number; at: number; text: string; color: string };
type Session = { best: number; streak: number };

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

/** Plinko: 8–16 Reihen, vier Risikostufen bis 10.000×, Goldbälle, Zeitlupe vor großen Treffern, Auto bis 100 Bälle. */
export default function Plinko({ onClose }: { onClose: () => void }) {
  const [stake, setStake] = useBet('plinko', 20);
  // Code „win“ aktiv: Brett auf 16 Reihen / Extrem stellen – so wird der Treffer so groß wie möglich.
  const armed = plinkoWinArmed();
  const [rows, setRows] = useState<number>(() => { if (armed) return 16; try { return Number(sessionStorage.getItem('fc-plinko-rows')) || 12; } catch { return 12; } });
  const [risk, setRisk] = useState<Risk>(() => { if (armed) return 'extreme'; try { return (sessionStorage.getItem('fc-plinko-risk') as Risk) || 'mid'; } catch { return 'mid'; } });
  const [turbo, setTurbo] = useState(false);
  const [inFlight, setInFlight] = useState(0);
  const [auto, setAuto] = useState<{ left: number; total: number } | null>(null);
  const [autoN, setAutoN] = useState(25);
  const [hist, setHist] = useState<{ id: number; m: number; gold: boolean }[]>([]);
  const [sess, setSess] = useState<Session>({ best: 0, streak: 0 });
  const [combo, setCombo] = useState<{ id: number; n: number } | null>(null);
  const [boom, setBoom] = useState(0);
  const sparks = useRef<Spark[]>([]);
  const rings = useRef<Ring[]>([]);
  const launches = useRef<number[]>([]);
  const [hitFx, setHitFx] = useState<{ id: number; tier: number; text: string; amount: string } | null>(null);
  const fever = useRef(false);
  fever.current = sess.streak >= FEVER_AT;

  const table = plinkoTable(rows, risk);
  const wrap = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const balls = useRef<Ball[]>([]);
  const flashes = useRef(new Map<string, number>());
  const board = useRef<{ key: string; img: HTMLCanvasElement } | null>(null);
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
    // Code „win“: dieser eine Ball fällt als Goldball ganz an den Rand – höchster Multiplikator des Bretts.
    const rigged = takePlinkoWin();
    const d = rigged ? { path: Array.from({ length: n }, () => 0), slot: 0, gold: true } : dropBall(Math.random, n);
    const mult = t[d.slot];
    const peak = mult * (d.gold ? GOLD_MULT : 1) >= 10;
    const base = fast ? 40 : tb ? 62 : 105;
    // Zeitlupe: Steht ein großer Treffer fest, werden die letzten 4 Reihen langsam (es ist ehrlich – das Ergebnis steht schon).
    const durs = Array.from({ length: n + 1 }, (_, i) => (i === 0 ? base * 1.4 : base) * (peak && !fast && i > n - 4 ? 2.6 : 1));
    const ends = durs.reduce<number[]>((a, x) => [...a, (a[a.length - 1] ?? 0) + x], []);
    balls.current.push({ id: seq.current++, path: d.path, slot: d.slot, gold: d.gold, stake: st, mult, start: performance.now(), durs, ends, peak, hitRow: -1, trail: [] });
    setInFlight(balls.current.length);
    launches.current.push(performance.now());
    plinkoSound('drop');
    if (d.gold) sfx('unlock');
    return true;
  };

  // Ball-Regen: mehrere Bälle direkt hintereinander (jeder kostet den normalen Einsatz)
  const rainT = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => () => { if (rainT.current) clearInterval(rainT.current); }, []);
  const rain = (n: number) => {
    if (rainT.current) return;
    let left = n;
    if (!drop()) return;
    left--;
    buzz(30);
    rainT.current = setInterval(() => {
      if (left <= 0 || !drop()) { clearInterval(rainT.current!); rainT.current = null; return; }
      left--;
    }, 70);
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

      // Brett (Pfosten + Fächer) nur neu vorzeichnen, wenn sich Größe, Reihen oder Risiko ändern.
      const key = `${w}x${h}x${dpr}x${n}x${t.join(',')}`;
      if (board.current?.key !== key) {
        const off = document.createElement('canvas');
        off.width = Math.round(w * dpr); off.height = Math.round(h * dpr);
        const o = off.getContext('2d')!;
        o.setTransform(dpr, 0, 0, dpr, 0, 0);
        o.fillStyle = 'rgba(210, 222, 255, .7)';
        for (let r = 0; r < n; r++) for (let j = 0; j < r + 3; j++) { o.beginPath(); o.arc(pegX(r, j), pegY(r), pegR, 0, Math.PI * 2); o.fill(); }
        for (let k = 0; k <= n; k++) {
          const bw = sx - 3; const x = posX(n, k) - bw / 2; const m = t[k];
          o.fillStyle = binColor(m); o.globalAlpha = 0.88; roundRect(o, x, binY, bw, binH, 5); o.fill(); o.globalAlpha = 1;
          o.fillStyle = m >= 100 ? '#2a1600' : '#fff';
          o.font = `800 ${Math.max(7, Math.min(12, bw * 0.34))}px system-ui, sans-serif`;
          o.textAlign = 'center'; o.textBaseline = 'middle';
          o.fillText(multText(m), x + bw / 2, binY + binH / 2 + 0.5);
        }
        board.current = { key, img: off };
      }
      ctx.drawImage(board.current.img, 0, 0, w, h);
      // Aufleuchtende Pfosten (nur die gerade getroffenen)
      for (const [id, f] of flashes.current) {
        if (now < f) continue; // Welle: Pfosten leuchten nacheinander auf
        const glow = Math.max(0, 1 - (now - f) / 260);
        if (glow <= 0) { flashes.current.delete(id); continue; }
        const [r, j] = id.split('-').map(Number);
        if (r >= n) continue;
        const hue = PEG_COLORS[(r + j) % PEG_COLORS.length];
        ctx.fillStyle = hue;
        ctx.globalAlpha = 0.3 * glow;
        ctx.beginPath(); ctx.arc(pegX(r, j), pegY(r), pegR + glow * (fever.current ? 7 : 5), 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;
        ctx.beginPath(); ctx.arc(pegX(r, j), pegY(r), pegR + glow * (fever.current ? 3.4 : 2.2), 0, Math.PI * 2); ctx.fill();
      }
      // Getroffene Fächer (nur die gerade getroffenen neu zeichnen)
      for (let k = 0; k <= n; k++) {
        const hit = binHits.current.get(k);
        const ht = hit !== undefined ? Math.max(0, 1 - (now - hit) / 320) : 0;
        if (ht <= 0) continue;
        const bw = sx - 3;
        const x = posX(n, k) - bw / 2;
        ctx.clearRect(x - 1, binY - 1, bw + 2, binH + 9); // vorgezeichnetes Fach entfernen, es springt gerade
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
        if (seg === -1) {
          landed.push(b);
          const m = b.mult * (b.gold ? GOLD_MULT : 1);
          const cnt = m >= 1 ? Math.min(60, 10 + Math.round(m * 3)) : 4;
          for (let i = 0; i < cnt; i++) {
            const a = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.4;
            const v = 2 + Math.random() * (m >= 5 ? 7 : 4);
            sparks.current.push({ x: posX(n, b.slot), y: binY, vx: Math.cos(a) * v, vy: Math.sin(a) * v, born: now, life: 500 + Math.random() * 500, color: b.gold ? '#ffd24a' : PEG_COLORS[i % PEG_COLORS.length], size: 1.5 + Math.random() * (m >= 5 ? 3 : 2) });
          }
          continue;
        }
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
            for (let i = 0; i < (fever.current ? 4 : 2); i++) sparks.current.push({ x: pegX(r0, kBefore + 1), y: pegY(r0), vx: (Math.random() - 0.5) * 3, vy: -Math.random() * 2.5, born: now, life: 300 + Math.random() * 200, color: PEG_COLORS[(r0 + i) % PEG_COLORS.length], size: 1.2 + Math.random() * 1.3 });
            if (now - lastTick.current > 28) { lastTick.current = now; plinkoSound('peg', r0); }
            if (b.peak && r0 >= n - 4) playStep((r0 - (n - 4)) * 3 + 6);
          }
        }
        if (b.peak && seg >= n - 3) {
          ctx.beginPath(); ctx.arc(x, y, ballR * 2.6, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(255, 63, 180, .18)'; ctx.fill();
        }
        b.trail.push({ x, y });
        if (b.trail.length > 9) b.trail.shift();
        b.trail.forEach((t, i) => {
          const k = (i + 1) / b.trail.length;
          ctx.beginPath(); ctx.arc(t.x, t.y, ballR * k * 0.9, 0, Math.PI * 2);
          ctx.fillStyle = fever.current ? `hsla(${(now / 4 + i * 30) % 360}, 100%, 60%, ${k * 0.55})` : b.gold ? `rgba(255, 210, 74, ${k * 0.5})` : `hsla(${(b.id * 47) % 360}, 100%, 65%, ${k * 0.4})`;
          ctx.fill();
        });
        drawBall(ctx, x, y, ballR, b.gold, fever.current ? `hsl(${(now / 3) % 360}, 100%, 62%)` : undefined);
      }
      // Funken
      // Abwurf-Blitz oben
      launches.current = launches.current.filter((t0) => now - t0 < 320);
      for (const t0 of launches.current) {
        const k = (now - t0) / 320;
        ctx.globalAlpha = 0.55 * (1 - k);
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(w / 2, pegY(0) - sy * 1.1, 4 + k * 22, 0, Math.PI * 2); ctx.stroke();
      }
      ctx.globalAlpha = 1;
      // Druckwellen und Lichtsäulen über dem Fach
      rings.current = rings.current.filter((r) => now - r.at < 700);
      for (const r of rings.current) {
        const k = (now - r.at) / 700;
        if (r.beam) {
          ctx.globalAlpha = 0.45 * (1 - k);
          const g = ctx.createLinearGradient(0, r.y, 0, 0);
          g.addColorStop(0, r.color); g.addColorStop(1, 'rgba(255,255,255,0)');
          ctx.fillStyle = g;
          const bw2 = sx * (0.7 + k * 0.6);
          ctx.fillRect(r.x - bw2 / 2, 0, bw2, r.y);
        }
        ctx.globalAlpha = 0.8 * (1 - k);
        ctx.strokeStyle = r.color; ctx.lineWidth = 3 * (1 - k) + 1;
        ctx.beginPath(); ctx.ellipse(r.x, r.y, r.size * (0.3 + k), r.size * 0.45 * (0.3 + k), 0, 0, Math.PI * 2); ctx.stroke();
      }
      ctx.globalAlpha = 1;
      sparks.current = sparks.current.filter((sp) => now - sp.born < sp.life);
      if (sparks.current.length > 260) sparks.current = sparks.current.slice(-260);
      for (const sp of sparks.current) {
        sp.x += sp.vx; sp.y += sp.vy; sp.vy += 0.22; sp.vx *= 0.98;
        ctx.globalAlpha = 1 - (now - sp.born) / sp.life;
        ctx.fillStyle = sp.color;
        ctx.beginPath(); ctx.arc(sp.x, sp.y, sp.size, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
      // Schwebende Gewinne
      pops.current = pops.current.filter((p) => now - p.at < 1000);
      for (const p of pops.current) {
        const a = (now - p.at) / 1000;
        ctx.globalAlpha = 1 - a;
        ctx.fillStyle = p.color;
        const big = p.text.length <= 6 ? 20 : 15;
        ctx.font = `900 ${big + Math.sin(a * Math.PI) * 6}px system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(10, 4, 30, .8)';
        ctx.strokeText(p.text, posX(n, p.slot), binY - 14 - a * 50);
        ctx.fillText(p.text, posX(n, p.slot), binY - 14 - a * 50);
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
    plinkoSound('land', mult);
    {
      const { w, h } = geo.current; const n = cfg.current.rows;
      const sx = w / (n + 2); const binH = Math.max(20, Math.min(30, sx * 0.9));
      const top = 22; const sy = (h - top - binH - 14) / n;
      const x = w / 2 + (b.slot - n / 2) * sx; const y = top + (n - 1) * sy + sy * 0.7 + binH / 2;
      const color = b.gold ? '#ffd24a' : mult >= 10 ? '#ff3fb4' : mult >= 2 ? '#ffd24a' : mult >= 1 ? '#7dffb2' : 'rgba(160,170,220,.6)';
      if (mult >= 1 || b.gold) rings.current.push({ x, y, at: now, color, size: sx * (mult >= 10 ? 4 : mult >= 2 ? 2.6 : 1.6), beam: mult >= 5 || b.gold });
      // Großer Treffer: Welle durch alle Pfosten, vom Fach aus nach oben
      if (mult >= 10 && !fast) {
        for (let r = 0; r < n; r++) for (let j = 0; j < r + 3; j++) {
          const px = w / 2 + (j - (r + 2) / 2) * sx; const py = top + r * sy;
          flashes.current.set(`${r}-${j}`, now + Math.hypot(px - x, py - y) * 1.4);
        }
      }
    }
    if (mult >= 3 || b.gold) {
      const tier = mult >= 100 ? 3 : mult >= 25 ? 2 : mult >= 10 ? 1 : 0;
      setHitFx({ id: now, tier, text: `${b.gold ? 'GOLD ' : ''}${multText(mult)}×`, amount: `+${fmtShort(win)}` });
    }
    if (mult >= 1 || b.gold) pops.current.push({ slot: b.slot, at: now, text: `${b.gold ? 'GOLD ' : ''}${multText(mult)}×`, color: b.gold ? '#ffd24a' : binColor(mult) === '#26315e' ? '#7dffb2' : mult >= 5 ? '#ffd24a' : '#7dffb2' });
    if (mult >= 5) { setBoom(now); setTimeout(() => setBoom((v) => (v === now ? 0 : v)), 480); }
    if (mult >= 50) shake(true);
    else if (mult >= 10) buzz([30, 40, 30]);
    settle({ game: 'plinko', bet: b.stake, win, mult }, { quiet: true });
    // Verlauf zeigt nur Treffer ab 1× – kein Frust-Ticker.
    if (mult >= 1) setHist((hs) => [{ id: b.id, m: mult, gold: b.gold }, ...hs].slice(0, 6));
    if (mult >= 2) celebrate(mult);
    setSess((s) => {
      const streak = mult >= 1 ? s.streak + 1 : s.streak >= FEVER_AT ? s.streak - 2 : 0;
      if (mult >= 1 && streak >= 2) {
        setCombo({ id: now, n: streak });
        if (streak === FEVER_AT) { sfx('levelUp'); buzz([30, 30, 30, 30, 60]); }
        else playStep(Math.min(14, streak * 2));
      }
      return { best: Math.max(s.best, mult), streak };
    });
  };

  const pickRows = (n: number) => { setRows(n); try { sessionStorage.setItem('fc-plinko-rows', String(n)); } catch { /* egal */ } };
  const pickRisk = (r: Risk) => { setRisk(r); try { sessionStorage.setItem('fc-plinko-risk', r); } catch { /* egal */ } };
  const busy = inFlight > 0 || !!auto;
  const p = plinkoP(rows);
  const top = table[0];

  return (
    <GameFrame title="Plinko" onClose={onClose} className="cz-plinko2"
      odds={`${rows} Reihen, Risiko ${RISK_NAME[risk]}: ${table.map(multText).join(' · ')}×. Chance aufs Randfach: 1 zu ${fmt(1 / p[0] / 2)}. ${Math.round(GOLD_CHANCE * 100)} % aller Bälle sind Goldbälle und zahlen doppelt. Auszahlungsquote inkl. Goldball ca. 96 %. Höchstgewinn pro Ball 1 Mio. Chips.`}>
      <div className="pk-left">
      <div className={`pk-hud ${sess.streak >= FEVER_AT ? 'fever' : ''}`}>
        <span className="pk-fever-label"><Icon name="fire" size={18} />{sess.streak >= FEVER_AT ? 'FEVER!' : 'Fever'}</span>
        <span className="pk-fever" aria-label={`Treffer-Serie ${sess.streak}`}><i style={{ width: `${Math.min(100, (sess.streak / FEVER_AT) * 100)}%` }} /></span>
        <span className="pk-best"><small>Bester</small><b>{sess.best ? `${multText(sess.best)}×` : '–'}</b></span>
      </div>
      <div className={`pk-board ${sess.streak >= FEVER_AT ? 'fever' : ''} ${boom ? 'boom' : ''}`} ref={wrap}>
        <canvas ref={canvas} className="pk-canvas" aria-label={`Plinko-Brett mit ${rows} Reihen`} />
        <span className="pk-top">bis <b>{fmt(top)}×</b></span>
        {hitFx && <span key={hitFx.id} className={`pk-hitfx t${hitFx.tier}`} aria-hidden="true"><b>{hitFx.text}</b><em>{hitFx.amount}</em></span>}
        {hitFx && hitFx.tier >= 1 && <i key={`e${hitFx.id}`} className={`pk-edge t${hitFx.tier}`} aria-hidden="true" />}
        {combo && <span key={combo.id} className={`pk-combo ${combo.n >= FEVER_AT ? 'fever' : ''}`}>{combo.n >= FEVER_AT ? `FEVER ×${combo.n}` : `COMBO ×${combo.n}`}</span>}
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
            <button className="cz-sub pk-rain" onClick={() => rain(5)} aria-label="Ball-Regen 5 Bälle">×5</button>
            <button className="cz-sub pk-rain" onClick={() => rain(10)} aria-label="Ball-Regen 10 Bälle">×10</button>
            <button className={`cz-sub sq ${turbo ? 'on' : ''}`} onClick={() => setTurbo(!turbo)} aria-pressed={turbo} aria-label="Turbo"><Icon name="bolt" size={20} /></button>
          </div>
          <div className="pk-auto">
            <small>Auto</small>
            {AUTO_COUNTS.map((n) => <button key={n} className={autoN === n ? 'on' : ''} onClick={() => setAutoN(n)}>{n}</button>)}
            <button className="go" onClick={() => setAuto({ left: autoN, total: autoN })}><b>Start</b><small>Auto</small></button>
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
function drawBall(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, gold: boolean, tint?: string) {
  ctx.save();
  // Leuchten ohne teuren Weichzeichner: ein halbtransparenter Hof
  ctx.globalAlpha = gold ? 0.35 : 0.22;
  ctx.beginPath(); ctx.arc(x, y, r * (gold ? 2 : 1.6), 0, Math.PI * 2);
  ctx.fillStyle = tint ?? (gold ? '#ffd24a' : '#ffffff');
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  // Glanzpunkt statt Fußball-Muster: ein schlichter, leuchtender Neon-Ball
  ctx.beginPath(); ctx.arc(x - r * 0.32, y - r * 0.32, r * 0.38, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255, 255, 255, .85)';
  ctx.fill();
  ctx.restore();
}
