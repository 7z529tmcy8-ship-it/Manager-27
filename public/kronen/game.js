/* =========================================================
   Kronenkampf – Echtzeit-Kartenduell (eigene Figuren, eigenes Design)
   ---------------------------------------------------------
   Aufbau:
     1. CONFIG      – Arena, Türme, Karten, Zeiten
     2. Zustand     – ein Match
     3. Hilfen
     4. Einheiten   – Ziele, Laufen, Kämpfen
     5. Zauber & Türme
     6. Gegner-KI
     7. Zeichnen
     8. Steuerung, Hand & Ablauf
   ========================================================= */

/* ========== 1. CONFIG ========== */
const W = 360;
const H = 600;
const RIVER = 300;
const BRIDGES = [80, 280];
const SAVE = 'kronenkampf-v1';
const MATCH = 180; // Sekunden
const OVERTIME = 60;
const ELIXIR_SEC = 2.8; // ein Elixier alle 2,8 s
const DIFF = { easy: { rate: 0.8, think: 1.6 }, normal: { rate: 1, think: 1.0 }, hard: { rate: 1.15, think: 0.6 } };

const TOWER = {
  princess: { hp: 2600, dmg: 55, range: 125, hitSpeed: 0.8, size: 22 },
  king: { hp: 4000, dmg: 75, range: 120, hitSpeed: 1.0, size: 28 },
};

// Karten: type troop | building | spell. targets: ground (nur Boden), any (Boden + Luft), buildings (nur Gebäude/Türme)
const CARDS = {
  knight: { name: 'Ritter', icon: '🛡️', cost: 3, type: 'troop', hp: 1400, dmg: 160, hitSpeed: 1.2, range: 18, speed: 46, targets: 'ground', size: 11 },
  archers: { name: 'Schützinnen', icon: '🏹', cost: 3, type: 'troop', count: 2, hp: 300, dmg: 90, hitSpeed: 1.0, range: 115, speed: 46, targets: 'any', size: 8 },
  giant: { name: 'Riese', icon: '🗿', cost: 5, type: 'troop', hp: 3400, dmg: 210, hitSpeed: 1.5, range: 18, speed: 30, targets: 'buildings', size: 15 },
  goblins: { name: 'Kobolde', icon: '👺', cost: 2, type: 'troop', count: 3, hp: 180, dmg: 100, hitSpeed: 1.1, range: 15, speed: 72, targets: 'ground', size: 7 },
  bones: { name: 'Knochenhorde', icon: '💀', cost: 3, type: 'troop', count: 6, hp: 70, dmg: 70, hitSpeed: 1.0, range: 14, speed: 70, targets: 'ground', size: 6 },
  dragon: { name: 'Babydrache', icon: '🐉', cost: 4, type: 'troop', flying: true, hp: 900, dmg: 120, splash: 40, hitSpeed: 1.6, range: 70, speed: 55, targets: 'any', size: 12 },
  wizard: { name: 'Magier', icon: '🧙', cost: 5, type: 'troop', hp: 600, dmg: 210, splash: 40, hitSpeed: 1.4, range: 110, speed: 46, targets: 'any', size: 10 },
  balloon: { name: 'Ballon', icon: '🎈', cost: 5, type: 'troop', flying: true, hp: 1300, dmg: 650, hitSpeed: 3, range: 16, speed: 40, targets: 'buildings', size: 13 },
  cannon: { name: 'Kanone', icon: '💣', cost: 3, type: 'building', hp: 800, dmg: 120, hitSpeed: 0.9, range: 110, targets: 'ground', size: 14, lifetime: 30 },
  fireball: { name: 'Feuerball', icon: '☄️', cost: 4, type: 'spell', dmg: 570, radius: 55, towerFactor: 0.35 },
  arrows: { name: 'Pfeilhagel', icon: '🎯', cost: 3, type: 'spell', dmg: 230, radius: 80, towerFactor: 0.35 },
};
const PLAYER_DECK = ['knight', 'archers', 'giant', 'goblins', 'dragon', 'wizard', 'fireball', 'arrows'];
// Gegner-Decks: jedes hat einen Turmbrecher, Abwehr gegen Luft und mindestens einen Zauber.
const BOT_DECKS = [
  ['giant', 'wizard', 'archers', 'goblins', 'bones', 'knight', 'arrows', 'fireball'],
  ['balloon', 'dragon', 'knight', 'archers', 'cannon', 'goblins', 'arrows', 'fireball'],
  ['giant', 'dragon', 'bones', 'archers', 'cannon', 'knight', 'arrows', 'fireball'],
  ['balloon', 'wizard', 'knight', 'bones', 'goblins', 'archers', 'arrows', 'fireball'],
];

/* ========== 2. Zustand ========== */
let G = null; // laufendes Match
let selected = null; // ausgewählte Handkarte (Index)
let difficulty = 'normal';
let save = loadSave();
let last = 0;

function newMatch() {
  const botDeck = BOT_DECKS[Math.floor(Math.random() * BOT_DECKS.length)];
  return {
    t: 0, overtime: false, over: false,
    elixir: { you: 5, enemy: 5 },
    deck: { you: makeDeck(PLAYER_DECK), enemy: makeDeck(botDeck) },
    units: [],
    towers: [
      tower('you', 'princess', 80, 490), tower('you', 'princess', 280, 490), tower('you', 'king', 180, 555),
      tower('enemy', 'princess', 80, 110), tower('enemy', 'princess', 280, 110), tower('enemy', 'king', 180, 45),
    ],
    fx: [], // Effekte: Treffer, Zauber, Explosionen, Schadenszahlen
    botTimer: 2,
  };
}
function makeDeck(keys) {
  const order = shuffle([...keys]);
  return { hand: order.slice(0, 4), queue: order.slice(4) };
}
function tower(side, kind, x, y) {
  const d = TOWER[kind];
  return { side, kind, x, y, hp: d.hp, maxHp: d.hp, cd: 0, active: kind === 'princess', size: d.size, isTower: true, building: true };
}

/* ========== 3. Hilfen ========== */
const $ = (id) => document.getElementById(id);
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
const enemyOf = (side) => (side === 'you' ? 'enemy' : 'you');
const alive = (e) => e.hp > 0;
function loadSave() {
  try { return { trophies: 0, wins: 0, losses: 0, ...JSON.parse(localStorage.getItem(SAVE) ?? '{}') }; } catch { return { trophies: 0, wins: 0, losses: 0 }; }
}
function storeSave() { try { localStorage.setItem(SAVE, JSON.stringify(save)); } catch { /* privat */ } }
const crowns = (side) => {
  const lost = G.towers.filter((t) => t.side === enemyOf(side) && !alive(t));
  return lost.some((t) => t.kind === 'king') ? 3 : lost.length;
};

/* ========== 4. Einheiten ========== */
function spawn(side, key, x, y) {
  const c = CARDS[key];
  const n = c.count ?? 1;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const r = n > 1 ? 10 + n : 0;
    G.units.push({
      side, key, x: clamp(x + Math.cos(a) * r, 10, W - 10), y: clamp(y + Math.sin(a) * r, 10, H - 10),
      hp: c.hp, maxHp: c.hp, cd: 0.5, size: c.size, flying: !!c.flying, building: c.type === 'building',
      life: c.lifetime ?? null, born: G.t,
    });
  }
}

/** Kann a das Ziel b überhaupt treffen? */
function canHit(c, b) {
  if (c.targets === 'buildings') return !!b.building;
  if (b.flying) return c.targets === 'any';
  return true;
}

/** Ziel wählen: zuerst Gegner in Sichtweite, sonst der nächste Turm auf der eigenen Bahn. */
function pickTarget(u) {
  const c = CARDS[u.key];
  const foes = enemyOf(u.side);
  const sight = Math.max(150, (c.range ?? 0) + 40);
  let best = null;
  let bestD = Infinity;
  if (c.targets !== 'buildings') {
    for (const e of G.units) {
      if (e.side !== foes || !alive(e) || !canHit(c, e)) continue;
      const d = dist(u, e);
      if (d < sight && d < bestD) { best = e; bestD = d; }
    }
  } else {
    for (const e of G.units) {
      if (e.side !== foes || !alive(e) || !e.building) continue;
      const d = dist(u, e);
      if (d < sight && d < bestD) { best = e; bestD = d; }
    }
  }
  if (best) return best;
  // Türme: Prinzessin auf dieser Seite, sonst König
  const lane = u.x < W / 2 ? 0 : 1;
  const towers = G.towers.filter((t) => t.side === foes && alive(t));
  const princess = towers.find((t) => t.kind === 'princess' && (t.x < W / 2 ? 0 : 1) === lane);
  return princess ?? towers.find((t) => t.kind === 'king') ?? towers[0] ?? null;
}

function updateUnit(u, dt) {
  const c = CARDS[u.key];
  if (u.life !== null) {
    u.life -= dt;
    if (u.life <= 0) { u.hp = 0; return; }
  }
  u.cd -= dt;
  const target = pickTarget(u);
  if (!target) return;
  const reach = (c.range ?? 15) + target.size + u.size * 0.3;
  const d = dist(u, target);
  if (d <= reach) {
    if (u.cd <= 0) { attack(u, c, target); u.cd = c.hitSpeed; }
    return;
  }
  if (u.building) return; // Gebäude laufen nicht
  // Laufen – Bodentruppen über die Brücken
  let tx = target.x;
  let ty = target.y;
  const mySideBottom = u.side === 'you';
  const across = mySideBottom ? target.y < RIVER - 10 : target.y > RIVER + 10;
  const onMySide = mySideBottom ? u.y > RIVER - 14 : u.y < RIVER + 14;
  if (!u.flying && across && onMySide) {
    // Bodentruppen: erst schräg zur nächsten Brücke, dann geradeaus hinüber.
    const bx = Math.abs(u.x - BRIDGES[0]) < Math.abs(u.x - BRIDGES[1]) ? BRIDGES[0] : BRIDGES[1];
    tx = bx;
    if (Math.abs(u.x - bx) > 6) ty = mySideBottom ? RIVER + 22 : RIVER - 22;
    else ty = mySideBottom ? RIVER - 22 : RIVER + 22;
  }
  const dx = tx - u.x;
  const dy = ty - u.y;
  const len = Math.hypot(dx, dy) || 1;
  const step = c.speed * dt;
  u.x += (dx / len) * Math.min(step, len);
  u.y += (dy / len) * Math.min(step, len);
}

function attack(src, c, target) {
  const dmg = c.dmg;
  if (c.splash) {
    for (const e of [...G.units, ...G.towers]) {
      if (e.side === src.side || !alive(e)) continue;
      if (e.flying && c.targets !== 'any') continue;
      if (dist(e, target) <= c.splash) hurt(e, e.isTower ? dmg * 0.8 : dmg);
    }
  } else hurt(target, dmg);
  const ranged = (c.range ?? 0) > 40;
  G.fx.push({ kind: ranged ? 'shot' : 'hit', x1: src.x, y1: src.y, x2: target.x, y2: target.y, side: src.side, t: 0, life: ranged ? 0.18 : 0.15, splash: c.splash });
}

function hurt(e, dmg) {
  e.hp -= dmg;
  if (e.isTower && e.kind === 'king') e.active = true;
  G.fx.push({ kind: 'num', x: e.x + (Math.random() * 10 - 5), y: e.y - e.size, text: String(Math.round(dmg)), t: 0, life: 0.7 });
  if (e.hp <= 0 && e.isTower) {
    G.fx.push({ kind: 'boom', x: e.x, y: e.y, t: 0, life: 0.9 });
    // Fällt eine Prinzessin, wacht der König auf.
    for (const k of G.towers) if (k.side === e.side && k.kind === 'king') k.active = true;
  }
}

/* ========== 5. Zauber & Türme ========== */
function castSpell(side, key, x, y) {
  const c = CARDS[key];
  for (const e of [...G.units, ...G.towers]) {
    if (e.side === side || !alive(e)) continue;
    if (dist(e, { x, y }) <= c.radius + e.size * 0.5) hurt(e, e.isTower ? c.dmg * c.towerFactor : c.dmg);
  }
  G.fx.push({ kind: 'spell', key, x, y, r: c.radius, t: 0, life: 0.55 });
}

function updateTower(t, dt) {
  if (!alive(t) || !t.active) return;
  t.cd -= dt;
  if (t.cd > 0) return;
  const d = TOWER[t.kind];
  let best = null;
  let bestD = Infinity;
  for (const e of G.units) {
    if (e.side === t.side || !alive(e)) continue;
    const dd = dist(t, e);
    if (dd <= d.range && dd < bestD) { best = e; bestD = dd; }
  }
  if (!best) return;
  hurt(best, d.dmg);
  G.fx.push({ kind: 'shot', x1: t.x, y1: t.y - 10, x2: best.x, y2: best.y, side: t.side, t: 0, life: 0.15 });
  t.cd = d.hitSpeed;
}

/* ========== 6. Gegner-KI ========== */
function botThink(me = 'enemy') {
  const foe = enemyOf(me);
  // Die KI denkt immer "von oben"; für die untere Seite wird gespiegelt (nützlich für Tests).
  const fy = (y) => (me === 'enemy' ? y : H - y);
  const hand = G.deck[me].hand;
  const elixir = G.elixir[me];
  const affordable = hand.filter((k) => CARDS[k].cost <= elixir);
  if (!affordable.length) return;
  // Bedrohung: gegnerische Einheiten auf der eigenen Hälfte (oder kurz davor)
  const threats = G.units.filter((u) => u.side === foe && alive(u) && fy(u.y) < RIVER + 60);
  if (threats.length) {
    const t = threats.reduce((a, b) => (fy(a.y) < fy(b.y) ? a : b));
    const air = threats.some((u) => u.flying);
    // Viele kleine Gegner auf einem Fleck: Zauber
    const near = threats.filter((u) => dist(u, t) < 70);
    const spell = affordable.find((k) => CARDS[k].type === 'spell' && near.length >= 3);
    if (spell) return play(me, spell, t.x, t.y);
    const counter = affordable
      .filter((k) => CARDS[k].type !== 'spell' && CARDS[k].targets !== 'buildings')
      .filter((k) => !air || CARDS[k].targets === 'any')
      .sort((a, b) => CARDS[b].cost - CARDS[a].cost)[0];
    if (counter) return play(me, counter, clamp(t.x + (Math.random() * 30 - 15), 20, W - 20), fy(clamp(fy(t.y) - 70, 60, RIVER - 30)));
  }
  // Angreifen: mit genug Elixier, gern mit einem Tank vorneweg
  if (elixir >= (difficulty === 'hard' ? 6 : 7.5)) {
    const tank = affordable.find((k) => CARDS[k].targets === 'buildings');
    const troop = tank ?? affordable.filter((k) => CARDS[k].type === 'troop').sort((a, b) => CARDS[b].hp - CARDS[a].hp)[0];
    if (troop) {
      const lane = weakerLane(foe);
      return play(me, troop, BRIDGES[lane], fy(tank ? 170 : 220));
    }
  }
  // Nachlegen hinter einem eigenen Angriff
  const push = G.units.find((u) => u.side === me && alive(u) && CARDS[u.key].targets === 'buildings' && fy(u.y) > RIVER - 40);
  if (push && elixir >= 4) {
    const support = affordable.find((k) => CARDS[k].type === 'troop' && CARDS[k].targets !== 'buildings');
    if (support) play(me, support, clamp(push.x, 20, W - 20), fy(RIVER - 40));
  }
}
function weakerLane(side) {
  const p = G.towers.filter((t) => t.side === side && t.kind === 'princess');
  const hp = (i) => (alive(p[i]) ? p[i].hp : -1);
  return hp(0) <= hp(1) ? 0 : 1;
}

/* ========== 7. Zeichnen ========== */
const canvas = $('arena');
const ctx = canvas.getContext('2d');
let scale = 1;

function resize() {
  const wrap = canvas.parentElement;
  const s = Math.min(wrap.clientWidth / W, wrap.clientHeight / H);
  scale = s;
  const dpr = window.devicePixelRatio || 1;
  canvas.style.width = `${W * s}px`;
  canvas.style.height = `${H * s}px`;
  canvas.width = Math.round(W * s * dpr);
  canvas.height = Math.round(H * s * dpr);
  ctx.setTransform(s * dpr, 0, 0, s * dpr, 0, 0);
}

function drawArena() {
  // Rasen mit Schachbrett-Muster
  for (let y = 0; y < H; y += 30) for (let x = 0; x < W; x += 30) {
    ctx.fillStyle = ((x + y) / 30) % 2 === 0 ? '#5fae4b' : '#58a445';
    ctx.fillRect(x, y, 30, 30);
  }
  // eigene Hälfte leicht blau, gegnerische leicht rot
  ctx.fillStyle = 'rgba(255, 74, 74, .07)'; ctx.fillRect(0, 0, W, RIVER);
  ctx.fillStyle = 'rgba(47, 107, 255, .07)'; ctx.fillRect(0, RIVER, W, H - RIVER);
  // Fluss
  const grd = ctx.createLinearGradient(0, RIVER - 14, 0, RIVER + 14);
  grd.addColorStop(0, '#3fa7ff'); grd.addColorStop(1, '#1b6fd6');
  ctx.fillStyle = grd; ctx.fillRect(0, RIVER - 14, W, 28);
  // Brücken
  for (const bx of BRIDGES) {
    ctx.fillStyle = '#9b6a3a'; ctx.fillRect(bx - 22, RIVER - 18, 44, 36);
    ctx.fillStyle = '#7a4f28';
    for (let i = -16; i < 18; i += 8) ctx.fillRect(bx - 22, RIVER + i, 44, 2);
  }
  // Wege zu den Türmen
  ctx.strokeStyle = 'rgba(214, 190, 130, .45)'; ctx.lineWidth = 16; ctx.lineCap = 'round';
  for (const bx of BRIDGES) {
    ctx.beginPath(); ctx.moveTo(bx, 120); ctx.lineTo(bx, 480); ctx.stroke();
  }
  // Ausspiel-Zone, wenn eine Karte gewählt ist
  if (selected !== null && G) {
    const key = G.deck.you.hand[selected];
    if (CARDS[key].type !== 'spell') {
      ctx.fillStyle = 'rgba(255, 255, 255, .12)';
      ctx.fillRect(0, RIVER + 16, W, H - RIVER - 16);
      for (const lane of [0, 1]) if (pocketOpen(lane)) ctx.fillRect(lane === 0 ? 0 : W / 2, 160, W / 2, RIVER - 160 - 14);
    }
  }
}

function drawTower(t) {
  const blue = t.side === 'you';
  if (!alive(t)) {
    ctx.fillStyle = 'rgba(60, 40, 30, .6)';
    ctx.beginPath(); ctx.arc(t.x, t.y, t.size, 0, Math.PI * 2); ctx.fill();
    return;
  }
  const s = t.size;
  ctx.fillStyle = '#8c8c9e'; ctx.fillRect(t.x - s, t.y - s * 0.6, s * 2, s * 1.6);
  ctx.fillStyle = blue ? '#2f6bff' : '#e23b3b'; ctx.fillRect(t.x - s - 3, t.y - s * 0.95, s * 2 + 6, s * 0.55);
  // Zinnen
  ctx.fillStyle = '#6d6d80';
  for (let i = -s; i < s; i += 8) ctx.fillRect(t.x + i, t.y - s * 0.6, 5, 5);
  ctx.font = `${t.kind === 'king' ? 22 : 16}px serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(t.kind === 'king' ? '👑' : '🏰', t.x, t.y + 2);
  hpBar(t.x, t.y - s - 8, s * 2, t.hp / t.maxHp, blue);
}

function hpBar(x, y, w, f, blue) {
  ctx.fillStyle = 'rgba(0, 0, 0, .55)'; ctx.fillRect(x - w / 2, y, w, 5);
  ctx.fillStyle = blue ? '#5aa0ff' : '#ff6060'; ctx.fillRect(x - w / 2, y, w * clamp(f, 0, 1), 5);
}

function drawUnit(u) {
  const c = CARDS[u.key];
  const blue = u.side === 'you';
  const pop = Math.min(1, (G.t - u.born) * 6);
  const r = u.size * (0.5 + 0.5 * pop);
  if (u.flying) {
    ctx.fillStyle = 'rgba(0, 0, 0, .25)';
    ctx.beginPath(); ctx.ellipse(u.x, u.y + 14, r, r * 0.4, 0, 0, Math.PI * 2); ctx.fill();
  }
  const y = u.flying ? u.y - 6 : u.y;
  ctx.fillStyle = blue ? '#2f6bff' : '#e23b3b';
  ctx.beginPath(); ctx.arc(u.x, y, r + 2, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#fff6e0';
  ctx.beginPath(); ctx.arc(u.x, y, r, 0, Math.PI * 2); ctx.fill();
  ctx.font = `${Math.round(r * 1.5)}px serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(c.icon, u.x, y + 1);
  if (u.hp < u.maxHp) hpBar(u.x, y - r - 7, Math.max(16, r * 2), u.hp / u.maxHp, blue);
  if (u.life !== null) {
    ctx.strokeStyle = 'rgba(255, 255, 255, .7)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(u.x, y, r + 5, -Math.PI / 2, -Math.PI / 2 + (u.life / c.lifetime) * Math.PI * 2); ctx.stroke();
  }
}

function drawFx(f) {
  const k = f.t / f.life;
  if (f.kind === 'shot') {
    const x = f.x1 + (f.x2 - f.x1) * k;
    const y = f.y1 + (f.y2 - f.y1) * k;
    ctx.fillStyle = f.side === 'you' ? '#bcd4ff' : '#ffc0c0';
    ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI * 2); ctx.fill();
  } else if (f.kind === 'hit') {
    ctx.strokeStyle = `rgba(255, 255, 255, ${1 - k})`; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(f.x2, f.y2, 6 + k * 8, 0, Math.PI * 2); ctx.stroke();
  } else if (f.kind === 'spell') {
    ctx.fillStyle = f.key === 'fireball' ? `rgba(255, 120, 30, ${0.6 * (1 - k)})` : `rgba(255, 255, 200, ${0.5 * (1 - k)})`;
    ctx.beginPath(); ctx.arc(f.x, f.y, f.r * (0.6 + 0.4 * k), 0, Math.PI * 2); ctx.fill();
  } else if (f.kind === 'boom') {
    ctx.fillStyle = `rgba(255, 180, 40, ${1 - k})`;
    ctx.beginPath(); ctx.arc(f.x, f.y, 20 + k * 40, 0, Math.PI * 2); ctx.fill();
  } else if (f.kind === 'num') {
    ctx.fillStyle = `rgba(255, 255, 255, ${1 - k})`; ctx.font = 'bold 11px Nunito, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(f.text, f.x, f.y - k * 18);
  }
}

function draw() {
  ctx.clearRect(0, 0, W, H);
  drawArena();
  for (const t of G.towers) drawTower(t);
  const sorted = [...G.units].filter(alive).sort((a, b) => (a.flying - b.flying) || a.y - b.y);
  for (const u of sorted) drawUnit(u);
  for (const f of G.fx) drawFx(f);
}

/* ========== 8. Steuerung, Hand & Ablauf ========== */
/** Darf auf dieser Seite weiter vorn gespielt werden (gegnerischer Turm gefallen)? */
function pocketOpen(lane) {
  const t = G.towers.find((x) => x.side === 'enemy' && x.kind === 'princess' && (x.x < W / 2 ? 0 : 1) === lane);
  return t && !alive(t);
}
function canPlace(key, x, y) {
  if (CARDS[key].type === 'spell') return true;
  if (y > RIVER + 16 && y < H - 6) return true;
  const lane = x < W / 2 ? 0 : 1;
  return pocketOpen(lane) && y > 160 && y < RIVER - 14;
}

/** Karte ausspielen (beide Seiten). */
function play(side, key, x, y) {
  const c = CARDS[key];
  if (G.elixir[side] < c.cost) return false;
  G.elixir[side] -= c.cost;
  if (c.type === 'spell') castSpell(side, key, x, y);
  else spawn(side, key, x, y);
  // Karte wandert ans Ende der Warteschlange, die nächste kommt auf die Hand.
  const d = G.deck[side];
  const i = d.hand.indexOf(key);
  d.hand[i] = d.queue.shift();
  d.queue.push(key);
  return true;
}

canvas.addEventListener('pointerdown', (e) => {
  if (!G || G.over || selected === null) return;
  const rect = canvas.getBoundingClientRect();
  const x = ((e.clientX - rect.left) / rect.width) * W;
  const y = ((e.clientY - rect.top) / rect.height) * H;
  const key = G.deck.you.hand[selected];
  if (!canPlace(key, x, y)) return flash('Hier nicht – nur in deiner Hälfte!');
  if (!play('you', key, x, y)) return flash('Zu wenig Elixier');
  selected = null;
  renderHand();
});

let flashTimer = 0;
function flash(text) {
  G.fx.push({ kind: 'num', x: W / 2, y: H / 2 + 60, text, t: 0, life: 1.2 });
  flashTimer = 1;
}

function cardHtml(key, i, cls = '') {
  const c = CARDS[key];
  return `<button class="card ${cls}" data-i="${i}"><b>${c.cost}</b><span class="ic">${c.icon}</span><span class="nm">${c.name}</span></button>`;
}

function renderHand() {
  const d = G.deck.you;
  $('cards').innerHTML = d.hand.map((k, i) => cardHtml(k, i, `${selected === i ? 'sel' : ''} ${CARDS[k].cost > G.elixir.you ? 'poor' : ''}`)).join('');
  $('next-card').innerHTML = cardHtml(d.queue[0], -1);
}
$('cards').addEventListener('click', (e) => {
  const b = e.target.closest('.card');
  if (!b || !G || G.over) return;
  const i = Number(b.dataset.i);
  selected = selected === i ? null : i;
  renderHand();
});

function updateHud() {
  const total = G.overtime ? MATCH + OVERTIME : MATCH;
  const left = Math.max(0, total - G.t);
  const m = Math.floor(left / 60);
  const s = Math.floor(left % 60);
  $('clock').textContent = `${m}:${String(s).padStart(2, '0')}`;
  const double = left <= 60 || G.overtime;
  $('clock-label').textContent = G.overtime ? 'Verlängerung' : double ? '2× Elixier' : 'Zeit';
  $('clock').parentElement.classList.toggle('double', double);
  $('crowns-you').textContent = crowns('you');
  $('crowns-enemy').textContent = crowns('enemy');
  $('elixir-fill').style.width = `${G.elixir.you * 10}%`;
  $('elixir-num').textContent = Math.floor(G.elixir.you);
}

function step(dt) {
  G.t += dt;
  const total = G.overtime ? MATCH + OVERTIME : MATCH;
  const double = total - G.t <= 60 || G.overtime ? 2 : 1;
  const rate = (dt / ELIXIR_SEC) * double;
  G.elixir.you = Math.min(10, G.elixir.you + rate);
  G.elixir.enemy = Math.min(10, G.elixir.enemy + rate * DIFF[difficulty].rate);

  for (const u of G.units) if (alive(u)) updateUnit(u, dt);
  for (const t of G.towers) updateTower(t, dt);
  // Auseinanderschieben, damit nicht alle auf einem Punkt stehen
  const live = G.units.filter((u) => alive(u) && !u.building);
  for (let i = 0; i < live.length; i++) for (let j = i + 1; j < live.length; j++) {
    const a = live[i];
    const b = live[j];
    if (a.flying !== b.flying) continue;
    const d = dist(a, b);
    const min = (a.size + b.size) * 0.8;
    if (d > 0 && d < min) {
      const push = (min - d) / 2;
      const nx = (a.x - b.x) / d;
      const ny = (a.y - b.y) / d;
      a.x += nx * push; a.y += ny * push; b.x -= nx * push; b.y -= ny * push;
    }
  }
  G.units = G.units.filter(alive);
  for (const f of G.fx) f.t += dt;
  G.fx = G.fx.filter((f) => f.t < f.life);

  G.botTimer -= dt;
  if (G.botTimer <= 0) {
    botThink();
    G.botTimer = DIFF[difficulty].think * (0.7 + Math.random() * 0.6);
  }
  checkEnd();
}

function checkEnd() {
  const you = crowns('you');
  const enemy = crowns('enemy');
  if (you === 3 || enemy === 3) return finish(you, enemy);
  if (G.overtime && you !== enemy) return finish(you, enemy);
  if (!G.overtime && G.t >= MATCH) {
    if (you !== enemy) return finish(you, enemy);
    G.overtime = true;
    flash('Verlängerung! Die nächste Krone gewinnt.');
  }
  if (G.overtime && G.t >= MATCH + OVERTIME) finish(you, enemy);
}

function finish(you, enemy) {
  if (G.over) return;
  G.over = true;
  const win = you > enemy;
  const draw = you === enemy;
  const delta = draw ? 0 : win ? 30 : -20;
  save.trophies = Math.max(0, save.trophies + delta);
  if (win) save.wins++; else if (!draw) save.losses++;
  storeSave();
  updateHud();
  $('result-title').textContent = draw ? 'Unentschieden' : win ? 'Sieg!' : 'Niederlage';
  $('r-you').textContent = you;
  $('r-enemy').textContent = enemy;
  $('result-text').textContent = `${delta > 0 ? '+' : ''}${delta} Trophäen · jetzt ${save.trophies}`;
  setTimeout(() => $('result').classList.remove('hidden'), 700);
}

function loop(now) {
  const dt = Math.min(0.05, (now - last) / 1000 || 0);
  last = now;
  if (G && !G.over) {
    step(dt);
    updateHud();
    if (Math.floor(G.t * 4) !== Math.floor((G.t - dt) * 4)) renderHand(); // Elixier-Anzeige der Karten
  }
  if (G) draw();
  requestAnimationFrame(loop);
}

function start() {
  G = newMatch();
  selected = null;
  $('menu').classList.add('hidden');
  $('result').classList.add('hidden');
  $('game').classList.remove('hidden');
  renderHand();
  updateHud();
  resize(); // erst nach der Hand messen, sonst ist das Feld zu hoch
}

function showMenu() {
  G = null;
  $('game').classList.add('hidden');
  $('result').classList.add('hidden');
  $('menu').classList.remove('hidden');
  $('trophies').textContent = save.trophies;
  $('deck-preview').innerHTML = PLAYER_DECK.map((k, i) => cardHtml(k, i)).join('');
}

$('diff').addEventListener('click', (e) => {
  const b = e.target.closest('[data-d]');
  if (!b) return;
  difficulty = b.dataset.d;
  document.querySelectorAll('#diff button').forEach((x) => x.classList.toggle('on', x === b));
});
$('play').addEventListener('click', start);
$('again').addEventListener('click', start);
$('to-menu').addEventListener('click', showMenu);
new ResizeObserver(() => G && resize()).observe(canvas.parentElement);

showMenu();
requestAnimationFrame(loop);
