import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Icon from './Icon';
import { MAX_LEVEL, SIZE_INFO, loadProgress, makeLevel, saveResult, send, shares, starsFor, step, type Conquest, type Owner } from '../game/conquest';
import { play } from '../sound';

const sfx = (id: Parameters<typeof play>[0]) => { try { play(id); } catch { /* kein Ton */ } };
const COLORS: Record<string, string> = { '-1': '#7d86a8', 0: '#19f0ff', 1: '#ff2fd1', 2: '#ffd76a', 3: '#39ff88' };
const NAMES: Record<string, string> = { '-1': 'Neutral', 0: 'Du', 1: 'Rot', 2: 'Gold', 3: 'Grün' };
const col = (o: Owner) => COLORS[String(o)];

/** Revierkampf: Stadien erobern. Levelauswahl → Spiel → Ergebnis. */
export default function Revier({ onExit }: { onExit: () => void }) {
  const [level, setLevel] = useState<number | null>(null);
  const [progress, setProgress] = useState(loadProgress);
  if (level === null) {
    return (
      <main className="hub rk">
        <div className="rk-top"><button className="cs-link" onClick={onExit}>‹ Menü</button></div>
        <section className="rk-hero">
          <span className="rk-hero-ic"><Icon name="stadium" size={30} /></span>
          <h1>Revierkampf</h1>
          <p>Erobere alle Stadien. In deinen Stadien wachsen Fans nach – zieh von deinem Stadion zum Ziel und schick sie los. Wer mehr Fans hinbringt, übernimmt.</p>
        </section>
        <div className="rk-levels">
          {Array.from({ length: MAX_LEVEL }, (_, i) => i + 1).map((lv) => {
            const locked = lv > progress.unlocked;
            const st = progress.stars[lv] ?? 0;
            return (
              <button key={lv} className={`rk-lv ${locked ? 'locked' : ''} ${st ? 'done' : ''}`} disabled={locked} onClick={() => { sfx('tap'); setLevel(lv); }}>
                {locked ? <Icon name="lock" size={16} /> : <b>{lv}</b>}
                <small>{locked ? '' : st ? '★'.repeat(st) + '☆'.repeat(3 - st) : 'neu'}</small>
              </button>
            );
          })}
        </div>
        <p className="rk-help">So geht’s: Von einem eigenen Stadion zum Ziel ziehen. Über weitere eigene Stadien wischen = alle schicken mit. Oder: erst eigenes Stadion antippen, dann das Ziel. Es gehen jeweils 60 % der Fans los.</p>
        <ul className="rk-sizes">
          {([1, 2, 3] as const).map((s) => <li key={s}><i className={`s${s}`} /><b>{SIZE_INFO[s].name}</b><small>+{SIZE_INFO[s].grow.toLocaleString('de-DE')} Fans/s · max. {SIZE_INFO[s].cap}</small></li>)}
        </ul>
      </main>
    );
  }
  return <Game key={level} level={level} onBack={() => { setProgress(loadProgress()); setLevel(null); }} onNext={(lv) => { setProgress(loadProgress()); setLevel(lv); }} onSaved={setProgress} />;
}

function Game({ level, onBack, onNext, onSaved }: { level: number; onBack: () => void; onNext: (lv: number) => void; onSaved: (p: ReturnType<typeof loadProgress>) => void }) {
  const wrap = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const game = useRef<Conquest | null>(null);
  const sel = useRef<number[]>([]);
  const drag = useRef<{ x: number; y: number; moved: boolean; sx: number; sy: number; start: number | null } | null>(null);
  const size = useRef({ w: 360, h: 560, dpr: 1 });
  const [hud, setHud] = useState<{ time: number; shares: { owner: Owner; units: number }[]; result: Conquest['result']; stars: number }>({ time: 0, shares: [], result: null, stars: 0 });
  const [paused, setPaused] = useState(false);
  const pausedRef = useRef(false);
  pausedRef.current = paused;

  // Größe und Level anlegen
  useEffect(() => {
    const el = wrap.current, cv = canvas.current;
    if (!el || !cv) return;
    const fit = () => {
      const w = el.clientWidth || 360, h = el.clientHeight || 560;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
      cv.style.width = `${w}px`; cv.style.height = `${h}px`;
      size.current = { w, h, dpr };
      if (!game.current) game.current = makeLevel(level, h / w);
      // Nur für automatische Tests (Adresse mit ?rvtest): Zustand von außen lesbar
      try { if (location.search.includes('rvtest')) (window as unknown as { __revier?: unknown }).__revier = { game: game.current, size: size.current }; } catch { /* egal */ }
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, [level]);

  // Spielschleife
  useEffect(() => {
    let raf = 0, last = performance.now(), hudAt = 0, ended = false;
    const loop = (now: number) => {
      const s = game.current, cv = canvas.current;
      const dt = (now - last) / 1000; last = now;
      if (s && cv) {
        if (!pausedRef.current && !document.hidden) step(s, dt);
        draw(cv, s, size.current, sel.current, drag.current, now);
        if (now - hudAt > 200 || (s.result && !ended)) {
          hudAt = now;
          setHud({ time: s.time, shares: shares(s), result: s.result, stars: starsFor(s) });
        }
        if (s.result && !ended) {
          ended = true;
          if (s.result === 'win') { sfx('levelUp'); onSaved(saveResult(level, starsFor(s))); } else sfx('fall');
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [level, onSaved]);

  // Eingabe
  const nodeAt = (px: number, py: number): number | null => {
    const s = game.current; if (!s) return null;
    const { w, h } = size.current;
    let best: number | null = null, bd = Infinity;
    for (const n of s.nodes) {
      const r = Math.max(26, SIZE_INFO[n.size].r * w * 1.15 + 10);
      const d = Math.hypot(n.x * w - px, n.y * h - py);
      if (d < r && d < bd) { bd = d; best = n.id; }
    }
    return best;
  };
  const pos = (e: React.PointerEvent) => { const r = canvas.current!.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
  const onDown = (e: React.PointerEvent) => {
    const s = game.current; if (!s || s.result) return;
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
    const p = pos(e);
    const id = nodeAt(p.x, p.y);
    drag.current = { x: p.x, y: p.y, sx: p.x, sy: p.y, moved: false, start: id };
    if (id !== null && s.nodes[id].owner === 0) sfx('tap');
  };
  const onMove = (e: React.PointerEvent) => {
    const d = drag.current, s = game.current; if (!d || !s) return;
    const p = pos(e);
    d.x = p.x; d.y = p.y;
    if (!d.moved && Math.hypot(p.x - d.sx, p.y - d.sy) > 10) {
      d.moved = true;
      // Ziehen beginnt auf einem eigenen Stadion: das ist die neue Auswahl
      sel.current = d.start !== null && s.nodes[d.start].owner === 0 ? [d.start] : [];
    }
    if (d.moved && sel.current.length) {
      const id = nodeAt(p.x, p.y);
      if (id !== null && s.nodes[id].owner === 0 && !sel.current.includes(id)) sel.current = [...sel.current, id];
    }
  };
  const onUp = (e: React.PointerEvent) => {
    const d = drag.current, s = game.current; drag.current = null;
    if (!d || !s || s.result) return;
    const p = pos(e);
    const id = nodeAt(p.x, p.y);
    if (d.moved) {
      // Ziehen: losgelassen auf einem Stadion → alle markierten (außer dem Ziel) schicken
      if (id !== null && sel.current.length) {
        const from = sel.current.filter((x) => x !== id);
        if (from.length && send(s, from, id) > 0) sfx('whistle');
      }
      sel.current = [];
      return;
    }
    // Tippen: erst eigenes Stadion, dann Ziel (auch ein eigenes = verstärken)
    if (id === null) { sel.current = []; return; }
    if (sel.current.length && !sel.current.includes(id)) {
      if (send(s, sel.current, id) > 0) sfx('whistle');
      sel.current = [];
    } else if (s.nodes[id].owner === 0) sel.current = sel.current.includes(id) ? [] : [id];
  };

  const total = hud.shares.reduce((a, x) => a + x.units, 0) || 1;
  const restart = () => onNext(level);
  return createPortal(
    <main className="rk-game">
      <header className="rk-bar">
        <button className="rk-ic" onClick={onBack} aria-label="Zur Levelauswahl"><Icon name="arrow" size={18} /></button>
        <div className="rk-bar-mid">
          <b>Level {level}</b>
          <span className="rk-share" aria-label="Anteil der Fans">{hud.shares.map((x) => <i key={x.owner} style={{ width: `${(x.units / total) * 100}%`, background: col(x.owner) }} />)}</span>
        </div>
        <span className="rk-time">{Math.floor(hud.time / 60)}:{String(Math.floor(hud.time % 60)).padStart(2, '0')}</span>
        <button className="rk-ic" onClick={() => setPaused(!paused)} aria-label={paused ? 'Weiter' : 'Pause'}><Icon name={paused ? 'ball' : 'clock'} size={18} /></button>
      </header>
      <div className="rk-field" ref={wrap}>
        <canvas ref={canvas} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={() => { drag.current = null; }} aria-label="Spielfeld" />
        {paused && !hud.result && (
          <div className="rk-over"><section><h2>Pause</h2><button className="btn primary big" onClick={() => setPaused(false)}>Weiter</button><button className="btn secondary" onClick={restart}>Neu starten</button><button className="cs-link" onClick={onBack}>Levelauswahl</button></section></div>
        )}
        {hud.result && (
          <div className="rk-over">
            <section>
              <h2>{hud.result === 'win' ? 'Revier erobert!' : 'Verloren'}</h2>
              {hud.result === 'win' && <p className="rk-stars">{'★'.repeat(hud.stars)}<span>{'★'.repeat(3 - hud.stars)}</span></p>}
              <p className="muted">{hud.result === 'win' ? `In ${Math.round(hud.time)} Sekunden.${hud.stars < 3 ? ' Schneller = mehr Sterne.' : ''}` : 'Deine Fans sind vertrieben. Tipp: Erst neutrale Stadien nah bei dir nehmen, dann mit mehreren Stadien gleichzeitig angreifen.'}</p>
              {hud.result === 'win' && level < MAX_LEVEL && <button className="btn primary big" onClick={() => onNext(level + 1)}>Nächstes Level</button>}
              <button className={`btn ${hud.result === 'win' ? 'secondary' : 'primary big'}`} onClick={restart}>Nochmal</button>
              <button className="cs-link" onClick={onBack}>Levelauswahl</button>
            </section>
          </div>
        )}
      </div>
      <p className="rk-legend">{([0, 1, 2, 3] as Owner[]).filter((o) => hud.shares.some((x) => x.owner === o) || o === 0).map((o) => <span key={o}><i style={{ background: col(o) }} />{NAMES[String(o)]}</span>)}</p>
    </main>,
    document.body,
  );
}

// ---------- Zeichnen ----------
function draw(cv: HTMLCanvasElement, s: Conquest, sz: { w: number; h: number; dpr: number }, sel: number[], drag: { x: number; y: number; moved: boolean } | null, now: number) {
  const ctx = cv.getContext('2d');
  if (!ctx) return;
  const { w, h, dpr } = sz;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);
  // Rasen-Raster
  ctx.strokeStyle = 'rgba(255,255,255,0.035)'; ctx.lineWidth = 1;
  for (let x = 0; x < w; x += 32) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
  for (let y = 0; y < h; y += 32) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
  const R = (n: { size: 1 | 2 | 3 }) => Math.max(16, SIZE_INFO[n.size].r * w * 1.15);
  // Ziehlinien
  if (drag && sel.length) {
    ctx.setLineDash([6, 6]); ctx.lineWidth = 2.5; ctx.strokeStyle = 'rgba(25,240,255,0.75)';
    for (const id of sel) { const n = s.nodes[id]; ctx.beginPath(); ctx.moveTo(n.x * w, n.y * h); ctx.lineTo(drag.x, drag.y); ctx.stroke(); }
    ctx.setLineDash([]);
  }
  // Märsche
  for (const q of s.squads) {
    const a = s.nodes[q.from], b = s.nodes[q.to];
    const x = (a.x + (b.x - a.x) * q.t) * w, y = (a.y + (b.y - a.y) * q.t) * h;
    const dots = Math.min(12, Math.max(1, Math.round(Math.sqrt(q.count) * 1.6)));
    ctx.fillStyle = col(q.owner);
    for (let i = 0; i < dots; i++) {
      const ang = i * 2.4 + q.id, rr = 2 + (i % 4) * 2.4;
      ctx.beginPath(); ctx.arc(x + Math.cos(ang) * rr, y + Math.sin(ang) * rr, 2.6, 0, Math.PI * 2); ctx.fill();
    }
    // Zahl nicht über die Stadion-Zahl legen (kurz nach dem Start und vor der Ankunft ausblenden)
    const near = (n: typeof a) => Math.hypot(n.x * w - x, n.y * h - y) < R(n) + 14;
    if (q.count >= 4 && !near(a) && !near(b)) {
      ctx.font = '800 11px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = '#fff'; ctx.fillText(String(q.count), x, y - 13);
    }
  }
  // Stadien
  for (const n of s.nodes) {
    const x = n.x * w, y = n.y * h, r = R(n), c = col(n.owner);
    if (sel.includes(n.id)) {
      ctx.beginPath(); ctx.arc(x, y, r + 7 + Math.sin(now / 160) * 1.5, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 2; ctx.stroke();
    }
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = hexA(c, n.owner === -1 ? 0.18 : 0.28); ctx.fill();
    ctx.lineWidth = n.size === 3 ? 4 : 3; ctx.strokeStyle = c; ctx.stroke();
    if (n.size >= 2) { ctx.beginPath(); ctx.arc(x, y, r - 6, 0, Math.PI * 2); ctx.lineWidth = 1; ctx.strokeStyle = hexA(c, 0.5); ctx.stroke(); }
    // Füllstand bis zur Obergrenze
    const cap = SIZE_INFO[n.size].cap;
    ctx.beginPath(); ctx.arc(x, y, r + 3, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(1, n.units / cap));
    ctx.strokeStyle = hexA(c, 0.55); ctx.lineWidth = 2; ctx.stroke();
    ctx.font = `900 ${n.size === 3 ? 17 : n.size === 2 ? 15 : 13}px system-ui, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#fff'; ctx.fillText(String(Math.floor(n.units)), x, y + 1);
  }
}
function hexA(hex: string, a: number): string {
  const v = parseInt(hex.slice(1), 16);
  return `rgba(${(v >> 16) & 255},${(v >> 8) & 255},${v & 255},${a})`;
}
