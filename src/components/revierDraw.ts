// ---------- Revierkampf: Zeichnen und Effekte (Canvas) ----------
// Alles Teure wird einmal vorgezeichnet (Rasen, Leuchten je Farbe) und dann nur noch per drawImage kopiert.
// Effekte: Abschuss-Puff, Kometen-Schweif der Fans, Treffer-Funken, Eroberung mit Farbwelle und Druckring,
// Zahl-„Pop“ beim Wachsen, Vorschau beim Ziehen (reicht es oder nicht), Siegeswelle. Begrenzte Teilchenzahl.

import { SEND_SHARE, SIZE_INFO, type Conquest, type ConquestEvent, type Node, type Owner } from '../game/conquest';

export const COLORS: Record<string, string> = { '-1': '#8a93b8', 0: '#19f0ff', 1: '#ff2fd1', 2: '#ffd76a', 3: '#39ff88' };
export const col = (o: Owner) => COLORS[String(o)];

interface Part { x: number; y: number; vx: number; vy: number; life: number; max: number; c: string; r: number }
interface Ring { x: number; y: number; r0: number; r1: number; t: number; dur: number; c: string; w: number; delay: number }
interface Float { x: number; y: number; text: string; c: string; t: number; dur: number; size: number }
export interface Fx {
  parts: Part[]; rings: Ring[]; floats: Float[];
  /** Zeitpunkt (ms) des letzten Zahl-Pops je Stadion */
  pop: number[];
  /** Eroberung: Farbwelle je Stadion */
  flood: ({ c: string; prev: string; at: number } | null)[];
  hitAt: number[];
  shown: number[];
  shake: number;
  lite: boolean;
  bg: HTMLCanvasElement | null; bgKey: string;
  glow: Map<string, HTMLCanvasElement>;
  endAt: number; endKind: 'win' | 'lose' | null;
}

export function makeFx(n: number, lite: boolean): Fx {
  return { parts: [], rings: [], floats: [], pop: Array(n).fill(0), flood: Array(n).fill(null), hitAt: Array(n).fill(0), shown: Array(n).fill(-1), shake: 0, lite, bg: null, bgKey: '', glow: new Map(), endAt: 0, endKind: null };
}

const R = (n: { size: 1 | 2 | 3 }, w: number) => Math.max(17, SIZE_INFO[n.size].r * w * 1.15);
const MAX_PARTS = 260;

function burst(fx: Fx, x: number, y: number, c: string, count: number, speed: number, size = 2.4) {
  const k = fx.lite ? Math.ceil(count / 3) : count;
  for (let i = 0; i < k && fx.parts.length < MAX_PARTS; i++) {
    const a = Math.random() * Math.PI * 2, v = speed * (0.35 + Math.random() * 0.8);
    const life = 0.35 + Math.random() * 0.45;
    fx.parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life, max: life, c, r: size * (0.6 + Math.random() * 0.8) });
  }
}
const ring = (fx: Fx, x: number, y: number, r0: number, r1: number, c: string, dur = 0.5, w = 4, delay = 0) => fx.rings.push({ x, y, r0, r1, t: 0, dur, c, w, delay });
const float = (fx: Fx, x: number, y: number, text: string, c: string, size = 13, dur = 0.9) => { if (fx.floats.length < 24) fx.floats.push({ x, y, text, c, t: 0, dur, size }); };

/** Spielereignisse in Effekte übersetzen. Gibt zurück, was für Töne/Vibration wichtig ist. */
export function absorb(fx: Fx, s: Conquest, evs: ConquestEvent[], w: number, h: number, now: number): { playerCap: number; playerLost: number; playerHit: number } {
  let playerCap = 0, playerLost = 0, playerHit = 0;
  for (const e of evs) {
    const n = s.nodes[e.id]; if (!n) continue;
    const x = n.x * w, y = n.y * h, r = R(n, w);
    if (e.k === 'send') {
      burst(fx, x, y, col(e.owner), Math.min(10, 3 + e.n / 4), 70, 2);
      fx.pop[e.id] = now;
      if (e.owner === 0) float(fx, x, y - r - 6, `−${e.n}`, 'rgba(255,255,255,.85)', 12, 0.7);
    } else if (e.k === 'join') {
      fx.pop[e.id] = now;
      ring(fx, x, y, r, r + 8, col(e.owner), 0.3, 2);
    } else if (e.k === 'hit') {
      fx.hitAt[e.id] = now;
      burst(fx, x, y, col(e.by), Math.min(14, 4 + e.n / 3), 110, 2.2);
      fx.pop[e.id] = now;
      if (n.owner === 0) playerHit++;
    } else if (e.k === 'cap') {
      const c = col(e.to);
      fx.flood[e.id] = { c, prev: col(e.from), at: now };
      fx.pop[e.id] = now;
      burst(fx, x, y, c, 18 + n.size * 8, 190, 3);
      burst(fx, x, y, '#ffffff', 6, 120, 1.6);
      ring(fx, x, y, r * 0.6, r * 2.6, c, 0.55, 5);
      ring(fx, x, y, r, r * 1.7, '#ffffff', 0.35, 2, 0.06);
      if (e.to === 0) {
        playerCap++;
        float(fx, x, y - r - 10, `${SIZE_INFO[n.size].name} erobert`, c, 13, 1.1);
        fx.shake = Math.max(fx.shake, n.size === 3 ? 7 : 4);
      } else if (e.from === 0) {
        playerLost++;
        float(fx, x, y - r - 10, 'verloren', '#ff6b8a', 12, 1);
        fx.shake = Math.max(fx.shake, 5);
      }
    }
  }
  return { playerCap, playerLost, playerHit };
}

/** Kombo-Text über einem Stadion (z. B. „Doppelschlag“). */
export function comboText(fx: Fx, s: Conquest, id: number, combo: number, w: number, h: number) {
  const n = s.nodes[id]; if (!n) return;
  const label = combo === 2 ? 'Doppelschlag!' : combo === 3 ? 'Dreierpack!' : `Serie ×${combo}`;
  float(fx, n.x * w, n.y * h - R(n, w) - 30, label, '#ffd76a', 16 + Math.min(6, combo), 1.3);
}

/** Schlussbild: Sieg = Welle über alle eigenen Stadien + Konfetti; Niederlage = roter Puls. */
export function finale(fx: Fx, s: Conquest, kind: 'win' | 'lose', w: number, h: number, now: number) {
  fx.endAt = now; fx.endKind = kind;
  if (kind === 'win') {
    const o = s.nodes.find((n) => n.owner === 0) ?? s.nodes[0];
    for (const n of s.nodes) {
      const d = Math.hypot(n.x - o.x, n.y - o.y);
      ring(fx, n.x * w, n.y * h, R(n, w), R(n, w) * 2.2, col(0), 0.6, 4, d * 0.7);
    }
    const colors = ['#19f0ff', '#ffd76a', '#ffffff', '#ff2fd1', '#39ff88'];
    for (let i = 0; i < (fx.lite ? 40 : 120) && fx.parts.length < MAX_PARTS + 120; i++) {
      const life = 1.2 + Math.random() * 1.2;
      fx.parts.push({ x: Math.random() * w, y: -10 - Math.random() * h * 0.3, vx: (Math.random() - 0.5) * 60, vy: 90 + Math.random() * 140, life, max: life, c: colors[i % colors.length], r: 2 + Math.random() * 2.5 });
    }
  } else fx.shake = 8;
}

// ---------- Vorgezeichnetes ----------
function background(fx: Fx, w: number, h: number, dpr: number): HTMLCanvasElement {
  const key = `${w}x${h}@${dpr}`;
  if (fx.bg && fx.bgKey === key) return fx.bg;
  const c = document.createElement('canvas');
  c.width = Math.round(w * dpr); c.height = Math.round(h * dpr);
  const g = c.getContext('2d')!;
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  // Rasen in Streifen
  const stripes = 10, sh = h / stripes;
  for (let i = 0; i < stripes; i++) { g.fillStyle = i % 2 ? '#0b2420' : '#0d2a25'; g.fillRect(0, i * sh, w, sh + 1); }
  // Linien wie auf einem Platz
  g.strokeStyle = 'rgba(255,255,255,0.06)'; g.lineWidth = 2;
  const m = 14;
  g.strokeRect(m, m, w - m * 2, h - m * 2);
  g.beginPath(); g.moveTo(m, h / 2); g.lineTo(w - m, h / 2); g.stroke();
  g.beginPath(); g.arc(w / 2, h / 2, Math.min(w, h) * 0.14, 0, Math.PI * 2); g.stroke();
  g.strokeRect(w * 0.28, m, w * 0.44, h * 0.1); g.strokeRect(w * 0.28, h - m - h * 0.1, w * 0.44, h * 0.1);
  // Flutlicht-Kegel aus den Ecken + Abdunklung am Rand
  for (const [x, y] of [[0, 0], [w, 0], [0, h], [w, h]]) {
    const rg = g.createRadialGradient(x, y, 0, x, y, Math.max(w, h) * 0.55);
    rg.addColorStop(0, 'rgba(180,255,240,0.07)'); rg.addColorStop(1, 'rgba(180,255,240,0)');
    g.fillStyle = rg; g.fillRect(0, 0, w, h);
  }
  const v = g.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.3, w / 2, h / 2, Math.max(w, h) * 0.75);
  v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,0.55)');
  g.fillStyle = v; g.fillRect(0, 0, w, h);
  fx.bg = c; fx.bgKey = key;
  return c;
}
function glowSprite(fx: Fx, c: string): HTMLCanvasElement {
  let s = fx.glow.get(c);
  if (s) return s;
  s = document.createElement('canvas'); s.width = s.height = 128;
  const g = s.getContext('2d')!;
  const rg = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  rg.addColorStop(0, hexA(c, 0.55)); rg.addColorStop(0.45, hexA(c, 0.18)); rg.addColorStop(1, hexA(c, 0));
  g.fillStyle = rg; g.fillRect(0, 0, 128, 128);
  fx.glow.set(c, s);
  return s;
}

// ---------- Ein Bild ----------
export interface DragView { x: number; y: number; moved: boolean }
export function draw(cv: HTMLCanvasElement, s: Conquest, fx: Fx, sz: { w: number; h: number; dpr: number }, sel: number[], drag: DragView | null, hover: number | null, now: number, dt: number) {
  const ctx = cv.getContext('2d');
  if (!ctx) return;
  const { w, h, dpr } = sz;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);
  // Wackeln (nicht bei reduzierter Bewegung)
  let sx = 0, sy = 0;
  if (fx.shake > 0.2 && !fx.lite) { sx = (Math.random() - 0.5) * fx.shake; sy = (Math.random() - 0.5) * fx.shake; }
  fx.shake *= Math.pow(0.0008, dt);
  ctx.translate(sx, sy);
  ctx.drawImage(background(fx, w, h, dpr), 0, 0, w, h);

  // Laufwege der Märsche (schwach), damit man sieht, wohin es geht
  ctx.lineWidth = 2; ctx.lineCap = 'round';
  for (const q of s.squads) {
    const a = s.nodes[q.from], b = s.nodes[q.to];
    ctx.strokeStyle = hexA(col(q.owner), 0.12);
    ctx.beginPath(); ctx.moveTo(a.x * w + (b.x - a.x) * w * q.t, a.y * h + (b.y - a.y) * h * q.t); ctx.lineTo(b.x * w, b.y * h); ctx.stroke();
  }

  // Ziehen: Pfeile mit laufenden Strichen + Vorschau am Ziel
  if (drag?.moved && sel.length) {
    const from = sel.filter((id) => id !== hover);
    const t = hover !== null && from.length ? s.nodes[hover] : null;
    const sending = from.reduce((a, id) => a + Math.floor(s.nodes[id].units * SEND_SHARE), 0);
    const enough = t ? (t.owner === 0 || sending > t.units) : true;
    const c = !t ? '#19f0ff' : t.owner === 0 ? '#19f0ff' : enough ? '#39ff88' : '#ff6b8a';
    const tx = t ? t.x * w : drag.x, ty = t ? t.y * h : drag.y;
    ctx.setLineDash([10, 8]); ctx.lineDashOffset = -now / 25; ctx.lineWidth = 3; ctx.strokeStyle = hexA(c, 0.85);
    for (const id of from) { const n = s.nodes[id]; ctx.beginPath(); ctx.moveTo(n.x * w, n.y * h); ctx.lineTo(tx, ty); ctx.stroke(); }
    ctx.setLineDash([]);
    if (t) {
      const r = R(t, w);
      ctx.beginPath(); ctx.arc(tx, ty, r + 10 + Math.sin(now / 90) * 2, 0, Math.PI * 2); ctx.strokeStyle = c; ctx.lineWidth = 3; ctx.stroke();
      const label = t.owner === 0 ? `+${sending}` : `${sending} gegen ${Math.floor(t.units)}`;
      pill(ctx, tx, ty - r - 22, label, c);
    } else {
      ctx.beginPath(); ctx.arc(drag.x, drag.y, 7, 0, Math.PI * 2); ctx.fillStyle = hexA(c, 0.9); ctx.fill();
    }
  }

  // Märsche: Kometen-Schweif + Fan-Pulk
  for (const q of s.squads) {
    const a = s.nodes[q.from], b = s.nodes[q.to], c = col(q.owner);
    const dx = (b.x - a.x) * w, dy = (b.y - a.y) * h, len = Math.hypot(dx, dy) || 1, ux = dx / len, uy = dy / len;
    const x = a.x * w + dx * q.t, y = a.y * h + dy * q.t;
    const tail = Math.min(len * q.t, 30 + Math.sqrt(q.count) * 4);
    const lg = ctx.createLinearGradient(x - ux * tail, y - uy * tail, x, y);
    lg.addColorStop(0, hexA(c, 0)); lg.addColorStop(1, hexA(c, 0.55));
    ctx.strokeStyle = lg; ctx.lineWidth = 3 + Math.min(6, Math.sqrt(q.count)); ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x - ux * tail, y - uy * tail); ctx.lineTo(x, y); ctx.stroke();
    const g = 10 + Math.sqrt(q.count) * 3;
    ctx.globalAlpha = 0.8; ctx.drawImage(glowSprite(fx, c), x - g, y - g, g * 2, g * 2); ctx.globalAlpha = 1;
    const dots = Math.min(14, Math.max(1, Math.round(Math.sqrt(q.count) * 1.7)));
    ctx.fillStyle = c;
    for (let i = 0; i < dots; i++) {
      const ang = i * 2.4 + q.id + now / 350, rr = 1.5 + (i % 4) * 2.3;
      ctx.beginPath(); ctx.arc(x + Math.cos(ang) * rr, y + Math.sin(ang) * rr, 2.4, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(x, y, 1.8, 0, Math.PI * 2); ctx.fill();
    const near = (n: Node) => Math.hypot(n.x * w - x, n.y * h - y) < R(n, w) + 16;
    if (q.count >= 4 && !near(a) && !near(b)) {
      ctx.font = '800 11px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillText(String(q.count), x + 1, y - 13);
      ctx.fillStyle = '#fff'; ctx.fillText(String(q.count), x, y - 14);
    }
  }

  // Stadien
  for (const n of s.nodes) {
    const shownNow = Math.floor(n.units);
    if (fx.shown[n.id] >= 0 && shownNow > fx.shown[n.id] && n.owner !== -1 && now - fx.pop[n.id] > 260) fx.pop[n.id] = now - 120; // kleiner Pop beim Wachsen
    fx.shown[n.id] = shownNow;
    let x = n.x * w, y = n.y * h;
    const r = R(n, w), c = col(n.owner), info = SIZE_INFO[n.size];
    const hit = (now - fx.hitAt[n.id]) / 1000;
    if (hit < 0.22 && !fx.lite) { x += Math.sin(hit * 90) * 3 * (1 - hit / 0.22); }
    const pop = Math.max(0, 1 - (now - fx.pop[n.id]) / 260);
    const scale = 1 + pop * pop * 0.14;
    // Leuchten (eigene und gegnerische Stadien atmen leicht)
    if (n.owner !== -1) {
      const gr = r * (2.3 + Math.sin(now / 700 + n.id) * 0.12);
      ctx.globalAlpha = n.owner === 0 ? 0.85 : 0.6; ctx.drawImage(glowSprite(fx, c), x - gr, y - gr, gr * 2, gr * 2); ctx.globalAlpha = 1;
    }
    ctx.save(); ctx.translate(x, y); ctx.scale(scale, scale);
    // Grund
    const fill = ctx.createRadialGradient(0, -r * 0.4, r * 0.1, 0, 0, r);
    fill.addColorStop(0, hexA(c, n.owner === -1 ? 0.22 : 0.42)); fill.addColorStop(1, n.owner === -1 ? 'rgba(14,20,34,0.92)' : 'rgba(6,14,20,0.92)');
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fillStyle = fill; ctx.fill();
    // Eroberung: neue Farbe flutet von innen nach außen
    const f = fx.flood[n.id];
    if (f) {
      const p = (now - f.at) / 380;
      if (p >= 1) fx.flood[n.id] = null;
      else {
        ctx.beginPath(); ctx.arc(0, 0, r * Math.min(1, p * 1.1), 0, Math.PI * 2); ctx.fillStyle = hexA(f.c, 0.75 * (1 - p * 0.6)); ctx.fill();
        ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fillStyle = `rgba(255,255,255,${0.5 * (1 - p)})`; ctx.fill();
      }
    }
    // Spielfeld innen (ab Stadion)
    if (n.size >= 2) {
      const pw = r * 0.62, ph = r * 0.92;
      ctx.strokeStyle = hexA(c, 0.28); ctx.lineWidth = 1;
      ctx.strokeRect(-pw / 2, -ph / 2, pw, ph);
      ctx.beginPath(); ctx.moveTo(-pw / 2, 0); ctx.lineTo(pw / 2, 0); ctx.stroke();
    }
    // Tribünen-Segmente: leuchten auf, je voller das Stadion ist
    const segs = n.size === 1 ? 10 : n.size === 2 ? 14 : 18;
    const lit = Math.min(segs, (n.units / info.cap) * segs);
    const gap = 0.16, step = (Math.PI * 2) / segs;
    ctx.lineWidth = n.size === 3 ? 5 : 4; ctx.lineCap = 'butt';
    for (let i = 0; i < segs; i++) {
      const a0 = -Math.PI / 2 + i * step + gap / 2, a1 = a0 + step - gap;
      const on = i < Math.floor(lit) ? 1 : i < lit ? lit - Math.floor(lit) : 0;
      ctx.strokeStyle = on > 0 ? hexA(c, 0.35 + 0.65 * on) : hexA(c, n.owner === -1 ? 0.18 : 0.14);
      ctx.beginPath(); ctx.arc(0, 0, r - 1, a0, a1); ctx.stroke();
    }
    // Voll: Außenring pulsiert
    if (n.owner !== -1 && n.units >= info.cap - 0.5) {
      ctx.beginPath(); ctx.arc(0, 0, r + 4 + Math.sin(now / 200) * 1.5, 0, Math.PI * 2);
      ctx.strokeStyle = hexA(c, 0.5); ctx.lineWidth = 1.5; ctx.stroke();
    }
    // Auswahl: drehender Strich-Ring
    if (sel.includes(n.id)) {
      ctx.setLineDash([7, 5]); ctx.lineDashOffset = -now / 30;
      ctx.beginPath(); ctx.arc(0, 0, r + 8, 0, Math.PI * 2); ctx.strokeStyle = 'rgba(255,255,255,0.95)'; ctx.lineWidth = 2.5; ctx.stroke();
      ctx.setLineDash([]);
    }
    // Zahl
    ctx.font = `900 ${n.size === 3 ? 18 : n.size === 2 ? 16 : 14}px system-ui, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillText(String(shownNow), 0, 2.5);
    ctx.fillStyle = pop > 0.5 ? '#ffffff' : n.owner === -1 ? '#dfe3f5' : '#ffffff'; ctx.fillText(String(shownNow), 0, 1);
    ctx.restore();
  }

  // Ringe
  ctx.lineCap = 'round';
  fx.rings = fx.rings.filter((g) => {
    if (g.delay > 0) { g.delay -= dt; return true; }
    g.t += dt / g.dur;
    if (g.t >= 1) return false;
    const e = 1 - (1 - g.t) ** 3;
    ctx.beginPath(); ctx.arc(g.x, g.y, g.r0 + (g.r1 - g.r0) * e, 0, Math.PI * 2);
    ctx.strokeStyle = hexA(g.c, 0.9 * (1 - g.t)); ctx.lineWidth = g.w * (1 - g.t * 0.6); ctx.stroke();
    return true;
  });
  // Teilchen
  const damp = Math.pow(0.04, dt);
  fx.parts = fx.parts.filter((p) => {
    p.life -= dt;
    if (p.life <= 0) return false;
    p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= damp; p.vy = p.vy * damp + (fx.endKind === 'win' ? 30 * dt : 0);
    const a = Math.min(1, (p.life / p.max) * 1.6);
    ctx.globalAlpha = a; ctx.fillStyle = p.c;
    ctx.fillRect(p.x - p.r / 2, p.y - p.r / 2, p.r, p.r);
    return true;
  });
  ctx.globalAlpha = 1;
  // Schwebende Texte
  fx.floats = fx.floats.filter((f) => {
    f.t += dt / f.dur;
    if (f.t >= 1) return false;
    const inP = Math.min(1, f.t * 6), y = f.y - 22 * f.t;
    const sc = 0.6 + 0.45 * (1 - (1 - inP) ** 3) - (inP >= 1 ? 0.05 * Math.min(1, (f.t - 1 / 6) * 8) : 0);
    ctx.save(); ctx.translate(f.x, y); ctx.scale(sc, sc);
    ctx.globalAlpha = f.t > 0.7 ? (1 - f.t) / 0.3 : 1;
    ctx.font = `900 ${f.size}px system-ui, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(0,0,0,.6)'; ctx.strokeText(f.text, 0, 0);
    ctx.fillStyle = f.c; ctx.fillText(f.text, 0, 0);
    ctx.restore();
    return true;
  });
  ctx.globalAlpha = 1;
  // Niederlage: roter Rand-Puls
  if (fx.endKind === 'lose') {
    const p = Math.min(1, (now - fx.endAt) / 600);
    const v = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.25, w / 2, h / 2, Math.max(w, h) * 0.7);
    v.addColorStop(0, 'rgba(255,40,80,0)'); v.addColorStop(1, `rgba(255,40,80,${0.35 * p})`);
    ctx.fillStyle = v; ctx.fillRect(-10, -10, w + 20, h + 20);
  }
}

function pill(ctx: CanvasRenderingContext2D, x: number, y: number, text: string, c: string) {
  ctx.font = '800 12px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const tw = ctx.measureText(text).width + 16, th = 22;
  const px = Math.max(tw / 2 + 4, Math.min(ctx.canvas.width / (ctx.getTransform().a || 1) - tw / 2 - 4, x));
  const py = Math.max(th / 2 + 4, y);
  ctx.beginPath(); ctx.roundRect(px - tw / 2, py - th / 2, tw, th, 11);
  ctx.fillStyle = 'rgba(4,10,14,.88)'; ctx.fill(); ctx.strokeStyle = c; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.fillStyle = c; ctx.fillText(text, px, py + 0.5);
}

export function hexA(hex: string, a: number): string {
  const v = parseInt(hex.slice(1), 16);
  return `rgba(${(v >> 16) & 255},${(v >> 8) & 255},${v & 255},${a})`;
}
