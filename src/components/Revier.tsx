import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Icon from './Icon';
import { MAX_LEVEL, SIZE_INFO, loadProgress, makeLevel, saveResult, send, shares, starsFor, step, type Conquest, type Owner } from '../game/conquest';
import { absorb, col, comboText, draw, finale, makeFx, type Fx } from './revierDraw';
import { play, playStep } from '../sound';

const sfx = (id: Parameters<typeof play>[0]) => { try { play(id); } catch { /* kein Ton */ } };
const step2 = (n: number) => { try { playStep(n); } catch { /* kein Ton */ } };
const buzz = (ms: number | number[]) => { try { navigator.vibrate?.(ms); } catch { /* ohne Vibration */ } };
const NAMES: Record<string, string> = { '-1': 'Neutral', 0: 'Du', 1: 'Pink', 2: 'Gold', 3: 'Grün' };
const isLite = () => { try { return document.documentElement.classList.contains('lite') || document.querySelector('.lite') !== null || matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { return false; } };

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
  const fx = useRef<Fx | null>(null);
  const hover = useRef<number | null>(null);
  const combo = useRef({ n: 0, at: 0 });
  const [showEnd, setShowEnd] = useState(false);
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
      if (!game.current) { game.current = makeLevel(level, h / w); fx.current = makeFx(game.current.nodes.length, isLite()); }
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
      const f = fx.current;
      if (s && cv && f) {
        const live = !pausedRef.current && !document.hidden;
        if (live) step(s, dt);
        const { w, h } = size.current;
        if (s.events.length) {
          const r = absorb(f, s, s.events, w, h, now);
          // Töne nur für das, was dich betrifft – Eroberungen steigen in der Tonhöhe, je mehr in Serie
          if (r.playerCap) {
            const c = combo.current;
            c.n = now - c.at < 2600 ? c.n + r.playerCap : r.playerCap; c.at = now;
            step2(4 + Math.min(12, c.n * 2)); buzz(c.n >= 2 ? [18, 30, 24] : 18);
            const last = [...s.events].reverse().find((e) => e.k === 'cap' && e.to === 0);
            if (c.n >= 2 && last) comboText(f, s, last.id, c.n, w, h);
          }
          if (r.playerLost) { sfx('fall'); buzz(40); }
          else if (r.playerHit && !r.playerCap) sfx('tick');
          s.events.length = 0;
        }
        draw(cv, s, f, size.current, sel.current, drag.current, hover.current, now, live ? Math.min(0.1, dt) : 0);
        if (now - hudAt > 200 || (s.result && !ended)) {
          hudAt = now;
          setHud({ time: s.time, shares: shares(s), result: s.result, stars: starsFor(s) });
        }
        if (s.result && !ended) {
          ended = true;
          finale(f, s, s.result, w, h, now);
          // Kurz das Schlussbild wirken lassen, dann das Ergebnis
          if (s.result === 'win') { sfx('fanfare'); buzz([30, 40, 60]); onSaved(saveResult(level, starsFor(s))); } else sfx('fall');
          window.setTimeout(() => setShowEnd(true), s.result === 'win' ? 1100 : 700);
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
      if (id !== null && s.nodes[id].owner === 0 && !sel.current.includes(id)) { sel.current = [...sel.current, id]; sfx('tap'); buzz(8); }
      if (id !== hover.current && id !== null && !(sel.current.length === 1 && sel.current[0] === id)) buzz(6);
      hover.current = id;
    }
  };
  const onUp = (e: React.PointerEvent) => {
    const d = drag.current, s = game.current; drag.current = null; hover.current = null;
    if (!d || !s || s.result) return;
    const p = pos(e);
    const id = nodeAt(p.x, p.y);
    if (d.moved) {
      // Ziehen: losgelassen auf einem Stadion → alle markierten (außer dem Ziel) schicken
      if (id !== null && sel.current.length) {
        const from = sel.current.filter((x) => x !== id);
        if (from.length && send(s, from, id) > 0) { sfx('whistle'); buzz(12); }
      }
      sel.current = [];
      return;
    }
    // Tippen: erst eigenes Stadion, dann Ziel (auch ein eigenes = verstärken)
    if (id === null) { sel.current = []; return; }
    if (sel.current.length && !sel.current.includes(id)) {
      if (send(s, sel.current, id) > 0) { sfx('whistle'); buzz(12); }
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
          <b>Level {level}<em>{Math.round(((hud.shares.find((x) => x.owner === 0)?.units ?? 0) / total) * 100)} %</em></b>
          <span className="rk-share" aria-label="Anteil der Fans">{hud.shares.map((x) => <i key={x.owner} className={x.owner === 0 ? 'me' : ''} style={{ width: `${(x.units / total) * 100}%`, background: col(x.owner) }} />)}</span>
        </div>
        <span className="rk-time">{Math.floor(hud.time / 60)}:{String(Math.floor(hud.time % 60)).padStart(2, '0')}</span>
        <button className="rk-ic" onClick={() => setPaused(!paused)} aria-label={paused ? 'Weiter' : 'Pause'}><Icon name={paused ? 'ball' : 'clock'} size={18} /></button>
      </header>
      <div className="rk-field" ref={wrap}>
        <canvas ref={canvas} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={() => { drag.current = null; hover.current = null; }} aria-label="Spielfeld" />
        {paused && !hud.result && (
          <div className="rk-over"><section><h2>Pause</h2><button className="btn primary big" onClick={() => setPaused(false)}>Weiter</button><button className="btn secondary" onClick={restart}>Neu starten</button><button className="cs-link" onClick={onBack}>Levelauswahl</button></section></div>
        )}
        {hud.result && showEnd && (
          <div className={`rk-over end ${hud.result}`}>
            <section>
              <h2>{hud.result === 'win' ? 'Revier erobert!' : 'Verloren'}</h2>
              {hud.result === 'win' && <Stars n={hud.stars} />}
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

/** Sterne erscheinen nacheinander mit steigendem Ton. */
function Stars({ n }: { n: number }) {
  useEffect(() => {
    const ts = Array.from({ length: n }, (_, i) => window.setTimeout(() => { step2(7 + i * 4); buzz(14); }, 260 + i * 260));
    return () => ts.forEach(clearTimeout);
  }, [n]);
  return <p className="rk-stars" aria-label={`${n} von 3 Sternen`}>{[0, 1, 2].map((i) => <span key={i} className={i < n ? 'on' : ''} style={{ animationDelay: `${0.26 + i * 0.26}s` }}>★</span>)}</p>;
}
