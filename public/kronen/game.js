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
    spells: [], // Zauber im Flug – sie schlagen erst kurz nach dem Ausspielen ein
    shake: 0,
    botTimer: 2,
  };
}
function makeDeck(keys) {
  const order = shuffle([...keys]);
  return { hand: order.slice(0, 4), queue: order.slice(4) };
}
function tower(side, kind, x, y) {
  const d = TOWER[kind];
  return { side, kind, x, y, hp: d.hp, maxHp: d.hp, shownHp: d.hp, hitT: 0, cd: 0, active: kind === 'princess', size: d.size, isTower: true, building: true };
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
    const ux = clamp(x + Math.cos(a) * r, 10, W - 10);
    const uy = clamp(y + Math.sin(a) * r, 10, H - 10);
    G.units.push({
      side, key, x: ux, y: uy, px: ux, py: uy, // px/py: Position im letzten Schritt (für weiches Zeichnen)
      hp: c.hp, maxHp: c.hp, shownHp: c.hp, hitT: 0, cd: 0.5, size: c.size, flying: !!c.flying, building: c.type === 'building',
      life: c.lifetime ?? null, born: G.t, walk: Math.random() * 10, lunge: 0, lx: 0, ly: 0, busy: false,
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
  u.busy = d <= reach;
  if (u.busy) {
    if (u.cd <= 0) {
      attack(u, c, target);
      u.cd = c.hitSpeed;
      // kleiner Ausfallschritt Richtung Ziel
      if ((c.range ?? 0) < 40) u.lunge = 1;
      u.lx = (target.x - u.x) / (d || 1); u.ly = (target.y - u.y) / (d || 1);
    }
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
  const move = Math.min(c.speed * dt, len);
  u.x += (dx / len) * move;
  u.y += (dy / len) * move;
  u.walk += move;
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
  e.hitT = 0.12; // kurzes Aufblitzen
  if (e.isTower && e.kind === 'king') e.active = true;
  G.fx.push({ kind: 'num', x: e.x + (Math.random() * 10 - 5), y: e.y - e.size, text: String(Math.round(dmg)), t: 0, life: 0.7 });
  if (e.hp <= 0 && e.isTower) {
    G.fx.push({ kind: 'boom', x: e.x, y: e.y, t: 0, life: 0.9 });
    G.shake = 0.35;
    // Fällt eine Prinzessin, wacht der König auf.
    for (const k of G.towers) if (k.side === e.side && k.kind === 'king') k.active = true;
  }
}

/* ========== 5. Zauber & Türme ========== */
/** Zauber fliegt vom eigenen König zum Ziel und schlägt dann ein. */
function castSpell(side, key, x, y) {
  const king = G.towers.find((t) => t.side === side && t.kind === 'king');
  const flight = key === 'fireball' ? 0.5 : 0.35;
  G.spells.push({ side, key, x, y, fx: king.x, fy: king.y, t: 0, life: flight });
}
function landSpell(side, key, x, y) {
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
let dpr = 1;
const bg = document.createElement('canvas'); // fertig gezeichnete Arena, wird nur bei Größenänderung neu gemalt
const sprites = new Map(); // Emoji einmal vorrendern statt in jedem Bild neu

function resize() {
  const wrap = canvas.parentElement;
  const s = Math.min(wrap.clientWidth / W, wrap.clientHeight / H);
  if (!s) return;
  scale = s;
  dpr = Math.min(2, window.devicePixelRatio || 1); // mehr als 2× sieht man nicht, kostet aber viel
  canvas.style.width = `${W * s}px`;
  canvas.style.height = `${H * s}px`;
  canvas.width = Math.round(W * s * dpr);
  canvas.height = Math.round(H * s * dpr);
  bg.width = canvas.width;
  bg.height = canvas.height;
  const b = bg.getContext('2d');
  b.setTransform(s * dpr, 0, 0, s * dpr, 0, 0);
  paintArena(b);
}

function sprite(icon) {
  let c = sprites.get(icon);
  if (!c) {
    c = document.createElement('canvas');
    c.width = c.height = 96;
    const x = c.getContext('2d');
    x.font = '72px serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillText(icon, 48, 52);
    sprites.set(icon, c);
  }
  return c;
}
function drawIcon(icon, x, y, size, alpha = 1) {
  ctx.globalAlpha = alpha;
  ctx.drawImage(sprite(icon), x - size / 2, y - size / 2, size, size);
  ctx.globalAlpha = 1;
}

function paintArena(c) {
  // Rasen mit Schachbrett-Muster
  for (let y = 0; y < H; y += 30) for (let x = 0; x < W; x += 30) {
    c.fillStyle = ((x + y) / 30) % 2 === 0 ? '#5fae4b' : '#58a445';
    c.fillRect(x, y, 30, 30);
  }
  // eigene Hälfte leicht blau, gegnerische leicht rot
  c.fillStyle = 'rgba(255, 74, 74, .07)'; c.fillRect(0, 0, W, RIVER);
  c.fillStyle = 'rgba(47, 107, 255, .07)'; c.fillRect(0, RIVER, W, H - RIVER);
  // Wege zu den Türmen
  c.strokeStyle = 'rgba(214, 190, 130, .45)'; c.lineWidth = 16; c.lineCap = 'round';
  for (const bx of BRIDGES) {
    c.beginPath(); c.moveTo(bx, 120); c.lineTo(bx, 480); c.stroke();
  }
  // Fluss mit Ufer
  c.fillStyle = '#3f8a37'; c.fillRect(0, RIVER - 17, W, 34);
  const grd = c.createLinearGradient(0, RIVER - 14, 0, RIVER + 14);
  grd.addColorStop(0, '#3fa7ff'); grd.addColorStop(1, '#1b6fd6');
  c.fillStyle = grd; c.fillRect(0, RIVER - 14, W, 28);
  // Brücken
  for (const bx of BRIDGES) {
    c.fillStyle = '#9b6a3a'; c.fillRect(bx - 22, RIVER - 18, 44, 36);
    c.fillStyle = '#7a4f28';
    for (let i = -16; i < 18; i += 8) c.fillRect(bx - 22, RIVER + i, 44, 2);
  }
}

function drawWater() {
  // leichte Wellen, die über den Fluss wandern
  ctx.strokeStyle = 'rgba(255, 255, 255, .28)'; ctx.lineWidth = 1.5;
  const off = (G.t * 18) % 40;
  for (let x = -40 + off; x < W; x += 40) {
    if (BRIDGES.some((b) => Math.abs(x + 8 - b) < 30)) continue;
    ctx.beginPath(); ctx.moveTo(x, RIVER - 3); ctx.quadraticCurveTo(x + 8, RIVER - 7, x + 16, RIVER - 3); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + 20, RIVER + 6); ctx.quadraticCurveTo(x + 28, RIVER + 2, x + 36, RIVER + 6); ctx.stroke();
  }
}

function drawZone() {
  // Ausspiel-Zone, wenn eine Karte gewählt ist
  if (selected === null) return;
  const key = G.deck.you.hand[selected];
  if (CARDS[key].type === 'spell') return;
  ctx.fillStyle = 'rgba(255, 255, 255, .12)';
  ctx.fillRect(0, RIVER + 16, W, H - RIVER - 16);
  for (const lane of [0, 1]) if (pocketOpen(lane)) ctx.fillRect(lane === 0 ? 0 : W / 2, 160, W / 2, RIVER - 160 - 14);
}

function drawTower(t) {
  const blue = t.side === 'you';
  if (!alive(t)) {
    ctx.fillStyle = 'rgba(60, 40, 30, .6)';
    ctx.beginPath(); ctx.arc(t.x, t.y, t.size, 0, Math.PI * 2); ctx.fill();
    return;
  }
  const s = t.size;
  ctx.fillStyle = t.hitT > 0 ? '#b8b8c8' : '#8c8c9e'; ctx.fillRect(t.x - s, t.y - s * 0.6, s * 2, s * 1.6);
  ctx.fillStyle = blue ? '#2f6bff' : '#e23b3b'; ctx.fillRect(t.x - s - 3, t.y - s * 0.95, s * 2 + 6, s * 0.55);
  // Zinnen
  ctx.fillStyle = '#6d6d80';
  for (let i = -s; i < s; i += 8) ctx.fillRect(t.x + i, t.y - s * 0.6, 5, 5);
  drawIcon(t.kind === 'king' ? '👑' : '🏰', t.x, t.y + 3, t.kind === 'king' ? 28 : 21, t.kind === 'king' && !t.active ? 0.7 : 1);
  hpBar(t.x, t.y - s - 8, s * 2, t.hp / t.maxHp, t.shownHp / t.maxHp, blue);
}

/** Lebensbalken: weißer Rest zeigt kurz den gerade verlorenen Schaden. */
function hpBar(x, y, w, f, shown, blue) {
  ctx.fillStyle = 'rgba(0, 0, 0, .55)'; ctx.fillRect(x - w / 2, y, w, 5);
  ctx.fillStyle = 'rgba(255, 255, 255, .85)'; ctx.fillRect(x - w / 2, y, w * clamp(shown, 0, 1), 5);
  ctx.fillStyle = blue ? '#5aa0ff' : '#ff6060'; ctx.fillRect(x - w / 2, y, w * clamp(f, 0, 1), 5);
}

function drawUnit(u, a) {
  const c = CARDS[u.key];
  const blue = u.side === 'you';
  const pop = Math.min(1, (G.t - u.born) * 5);
  const r = u.size * (0.6 + 0.4 * pop);
  // weiche Position zwischen den Rechenschritten
  let x = u.px + (u.x - u.px) * a;
  let y = u.py + (u.y - u.py) * a;
  // Ausfallschritt beim Zuschlagen, Wippen beim Laufen
  const l = u.lunge * u.lunge * 4;
  x += u.lx * l; y += u.ly * l;
  const bob = u.building || u.busy ? 0 : Math.abs(Math.sin(u.walk * 0.22)) * (u.flying ? 1.5 : 2.5);
  const lift = u.flying ? 8 + Math.sin(G.t * 3 + u.walk) * 1.5 : 0;
  // Schatten
  ctx.fillStyle = 'rgba(0, 0, 0, .22)';
  ctx.beginPath(); ctx.ellipse(x, y + r * 0.8, r * 0.95, r * 0.38, 0, 0, Math.PI * 2); ctx.fill();
  const dy = y - lift - bob;
  ctx.fillStyle = blue ? '#2f6bff' : '#e23b3b';
  ctx.beginPath(); ctx.arc(x, dy, r + 2, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = u.hitT > 0 ? '#ffffff' : '#fff6e0';
  ctx.beginPath(); ctx.arc(x, dy, r, 0, Math.PI * 2); ctx.fill();
  drawIcon(c.icon, x, dy, r * 2.1);
  if (u.hp < u.maxHp) hpBar(x, dy - r - 7, Math.max(16, r * 2), u.hp / u.maxHp, u.shownHp / u.maxHp, blue);
  if (u.life !== null) {
    ctx.strokeStyle = 'rgba(255, 255, 255, .7)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(x, dy, r + 5, -Math.PI / 2, -Math.PI / 2 + (u.life / c.lifetime) * Math.PI * 2); ctx.stroke();
  }
}

function drawFx(f) {
  const k = f.t / f.life;
  if (f.kind === 'shot') {
    const x = f.x1 + (f.x2 - f.x1) * k;
    const y = f.y1 + (f.y2 - f.y1) * k - Math.sin(k * Math.PI) * 10; // kleiner Bogen
    ctx.fillStyle = f.side === 'you' ? '#dbe7ff' : '#ffd6d6';
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
  } else if (f.kind === 'poof') {
    // Einheit verschwindet: schrumpft, verblasst, kleine Staubwolke
    ctx.fillStyle = `rgba(255, 255, 255, ${0.5 * (1 - k)})`;
    ctx.beginPath(); ctx.arc(f.x, f.y, f.size * (1 + k), 0, Math.PI * 2); ctx.fill();
    drawIcon(f.icon, f.x, f.y - k * 10, f.size * 2 * (1 - k * 0.6), 1 - k);
  } else if (f.kind === 'num') {
    ctx.fillStyle = `rgba(255, 255, 255, ${1 - k})`; ctx.font = 'bold 11px Nunito, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(f.text, f.x, f.y - k * 18);
  }
}

function drawSpellFlight(sp) {
  const k = sp.t / sp.life;
  const x = sp.fx + (sp.x - sp.fx) * k;
  const y = sp.fy + (sp.y - sp.fy) * k - Math.sin(k * Math.PI) * 40;
  if (sp.key === 'fireball') {
    ctx.fillStyle = 'rgba(255, 140, 40, .35)';
    ctx.beginPath(); ctx.arc(x, y, 14, 0, Math.PI * 2); ctx.fill();
    drawIcon('☄️', x, y, 24);
  } else {
    ctx.strokeStyle = '#fff3c4'; ctx.lineWidth = 1.5;
    for (let i = 0; i < 6; i++) {
      const ox = Math.cos(i * 1.7) * 18;
      const oy = Math.sin(i * 2.3) * 10;
      ctx.beginPath(); ctx.moveTo(x + ox, y + oy - 6); ctx.lineTo(x + ox, y + oy + 6); ctx.stroke();
    }
  }
  // Zielkreis am Boden
  if (sp.side === 'you') {
    ctx.strokeStyle = 'rgba(255, 255, 255, .5)'; ctx.setLineDash([4, 4]); ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(sp.x, sp.y, CARDS[sp.key].radius, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]);
  }
}

function drawGhost() {
  if (!ghost || selected === null) return;
  const key = G.deck.you.hand[selected];
  const c = CARDS[key];
  const ok = canPlace(key, ghost.x, ghost.y);
  if (c.type === 'spell') {
    ctx.fillStyle = 'rgba(255, 255, 255, .15)'; ctx.strokeStyle = 'rgba(255, 255, 255, .8)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(ghost.x, ghost.y, c.radius, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  } else {
    ctx.fillStyle = ok ? 'rgba(47, 107, 255, .45)' : 'rgba(255, 60, 60, .45)';
    ctx.beginPath(); ctx.arc(ghost.x, ghost.y, c.size + 4, 0, Math.PI * 2); ctx.fill();
  }
  drawIcon(c.icon, ghost.x, ghost.y, 26, ok ? 0.85 : 0.4);
}

function draw(a = 1) {
  ctx.setTransform(scale * dpr, 0, 0, scale * dpr, 0, 0);
  if (G.shake > 0) ctx.translate((Math.random() - 0.5) * G.shake * 14, (Math.random() - 0.5) * G.shake * 14);
  ctx.drawImage(bg, 0, 0, W, H);
  drawWater();
  drawZone();
  for (const t of G.towers) drawTower(t);
  const sorted = G.units.filter(alive).sort((p, q) => (p.flying - q.flying) || p.y - q.y);
  for (const u of sorted) drawUnit(u, a);
  for (const f of G.fx) drawFx(f);
  for (const sp of G.spells) drawSpellFlight(sp);
  drawGhost();
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

/* Steuerung: Karte antippen und ins Feld tippen – oder Karte direkt ins Feld ziehen. */
let ghost = null; // Vorschau, wo die Karte landen würde
let drag = null;
let fresh = -1; // Platz der gerade nachgezogenen Karte (für die Einblend-Animation)

function arenaPoint(e) {
  const rect = canvas.getBoundingClientRect();
  const x = ((e.clientX - rect.left) / rect.width) * W;
  const y = ((e.clientY - rect.top) / rect.height) * H;
  return { x, y, inside: x >= 0 && x <= W && y >= 0 && y <= H };
}
function tryPlay(x, y) {
  const key = G.deck.you.hand[selected];
  if (!canPlace(key, x, y)) { flash('Hier nicht – nur in deiner Hälfte!'); return false; }
  if (G.elixir.you < CARDS[key].cost) { flash('Zu wenig Elixier'); return false; }
  fresh = selected;
  play('you', key, x, y);
  selected = null;
  ghost = null;
  renderHand();
  return true;
}

canvas.addEventListener('pointerdown', (e) => {
  if (!G || G.over || selected === null || drag) return;
  const p = arenaPoint(e);
  tryPlay(p.x, p.y);
});
canvas.addEventListener('pointermove', (e) => {
  if (!G || drag || selected === null || e.pointerType !== 'mouse') return;
  ghost = arenaPoint(e); // Maus: Vorschau beim Darüberfahren
});
canvas.addEventListener('pointerleave', () => { if (!drag) ghost = null; });

$('cards').addEventListener('pointerdown', (e) => {
  const b = e.target.closest('.card');
  if (!b || !G || G.over) return;
  e.preventDefault();
  drag = { i: Number(b.dataset.i), x: e.clientX, y: e.clientY, moved: false, wasSel: selected === Number(b.dataset.i) };
  selected = drag.i;
  renderHand();
});
window.addEventListener('pointermove', (e) => {
  if (!drag || !G) return;
  if (!drag.moved && Math.hypot(e.clientX - drag.x, e.clientY - drag.y) > 10) drag.moved = true;
  if (!drag.moved) return;
  const p = arenaPoint(e);
  ghost = p.inside ? p : null;
});
window.addEventListener('pointerup', (e) => {
  if (!drag || !G) return;
  const d = drag;
  drag = null;
  if (G.over) return;
  if (!d.moved) {
    // nur angetippt: Auswahl umschalten
    if (d.wasSel) selected = null;
    renderHand();
    return;
  }
  const p = arenaPoint(e);
  if (p.inside && tryPlay(p.x, p.y)) return;
  ghost = null; // daneben losgelassen: Karte bleibt ausgewählt
});
window.addEventListener('pointercancel', () => { drag = null; ghost = null; });

let flashTimer = 0;
function flash(text) {
  G.fx.push({ kind: 'num', x: W / 2, y: H / 2 + 60, text, t: 0, life: 1.2 });
  flashTimer = 1;
}

function cardHtml(key, i, cls = '') {
  const c = CARDS[key];
  return `<button class="card ${cls}" data-i="${i}"><i class="charge"></i><b>${c.cost}</b><span class="ic">${c.icon}</span><span class="nm">${c.name}</span></button>`;
}

/** Hand neu aufbauen – nur wenn sich Karten oder Auswahl ändern, nicht in jedem Bild. */
function renderHand() {
  const d = G.deck.you;
  $('cards').innerHTML = d.hand.map((k, i) => cardHtml(k, i, `${selected === i ? 'sel' : ''} ${fresh === i ? 'fresh' : ''}`)).join('');
  $('next-card').innerHTML = cardHtml(d.queue[0], -1);
  fresh = -1;
  updateHand();
}
/** Günstige Aktualisierung in jedem Bild: welche Karten bezahlbar sind und wie weit sie aufgeladen sind. */
function updateHand() {
  const btns = $('cards').children;
  const hand = G.deck.you.hand;
  for (let i = 0; i < btns.length; i++) {
    const cost = CARDS[hand[i]].cost;
    const f = Math.min(1, G.elixir.you / cost);
    btns[i].classList.toggle('poor', f < 1);
    btns[i].firstChild.style.transform = `scaleY(${1 - f})`;
  }
}

let hudCache = '';
function updateHud() {
  const total = G.overtime ? MATCH + OVERTIME : MATCH;
  const left = Math.max(0, total - G.t);
  const m = Math.floor(left / 60);
  const s = Math.floor(left % 60);
  const double = left <= 60 || G.overtime;
  const key = `${m}:${s}|${G.overtime}|${crowns('you')}|${crowns('enemy')}|${Math.floor(G.elixir.you)}`;
  $('elixir-fill').style.transform = `scaleX(${G.elixir.you / 10})`;
  if (key === hudCache) return; // Text nur anfassen, wenn sich etwas geändert hat
  hudCache = key;
  $('clock').textContent = `${m}:${String(s).padStart(2, '0')}`;
  $('clock-label').textContent = G.overtime ? 'Verlängerung' : double ? '2× Elixier' : 'Zeit';
  $('clock').parentElement.classList.toggle('double', double);
  $('crowns-you').textContent = crowns('you');
  $('crowns-enemy').textContent = crowns('enemy');
  $('elixir-num').textContent = Math.floor(G.elixir.you);
}

function step(dt) {
  G.t += dt;
  // Positionen merken – gezeichnet wird zwischen altem und neuem Stand
  for (const u of G.units) { u.px = u.x; u.py = u.y; }
  const total = G.overtime ? MATCH + OVERTIME : MATCH;
  const double = total - G.t <= 60 || G.overtime ? 2 : 1;
  const rate = (dt / ELIXIR_SEC) * double;
  G.elixir.you = Math.min(10, G.elixir.you + rate);
  G.elixir.enemy = Math.min(10, G.elixir.enemy + rate * DIFF[difficulty].rate);

  for (const u of G.units) if (alive(u)) updateUnit(u, dt);
  for (const t of G.towers) updateTower(t, dt);
  // Zauber im Flug
  for (const sp of G.spells) {
    sp.t += dt;
    if (sp.t >= sp.life) landSpell(sp.side, sp.key, sp.x, sp.y);
  }
  G.spells = G.spells.filter((sp) => sp.t < sp.life);
  // Weich auseinanderschieben, damit nicht alle auf einem Punkt stehen (ohne Zittern).
  // Wer gerade kämpft, steht fester und wird kaum weggedrückt.
  const soft = Math.min(1, dt * 14);
  const live = G.units.filter((u) => alive(u) && !u.building);
  for (let i = 0; i < live.length; i++) for (let j = i + 1; j < live.length; j++) {
    const a = live[i];
    const b = live[j];
    if (a.flying !== b.flying) continue;
    const d = dist(a, b);
    const min = (a.size + b.size) * 0.8;
    if (d > 0 && d < min) {
      const wa = a.busy ? 0.15 : 1;
      const wb = b.busy ? 0.15 : 1;
      const push = ((min - d) * soft) / (wa + wb);
      const nx = (a.x - b.x) / d;
      const ny = (a.y - b.y) / d;
      a.x += nx * push * wa; a.y += ny * push * wa; b.x -= nx * push * wb; b.y -= ny * push * wb;
    }
  }
  // Abklingende Anzeigen: Lebensbalken, Aufblitzen, Ausfallschritt, Wackeln
  const ease = Math.min(1, dt * 4);
  for (const e of [...G.units, ...G.towers]) {
    e.shownHp += (Math.max(0, e.hp) - e.shownHp) * ease;
    e.hitT = Math.max(0, e.hitT - dt);
    if (e.lunge) e.lunge = Math.max(0, e.lunge - dt * 6);
  }
  G.shake = Math.max(0, G.shake - dt);
  for (const u of G.units) if (!alive(u)) G.fx.push({ kind: 'poof', x: u.x, y: u.flying ? u.y - 8 : u.y, icon: CARDS[u.key].icon, size: u.size, t: 0, life: 0.35 });
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

// Feste Rechenschritte (60 pro Sekunde) – das Spiel läuft auf jedem Gerät gleich schnell,
// gezeichnet wird so oft der Bildschirm kann, mit Zwischenpositionen.
const TICK = 1 / 60;
let acc = 0;
function loop(now) {
  const dt = Math.min(0.25, (now - last) / 1000 || 0);
  last = now;
  let a = 1;
  if (G && !G.over) {
    acc += dt;
    while (acc >= TICK && !G.over) { step(TICK); acc -= TICK; }
    a = G.over ? 1 : acc / TICK;
    updateHud();
    updateHand();
  } else if (G) {
    // nach Spielende Effekte ausklingen lassen
    for (const f of G.fx) f.t += dt;
    G.fx = G.fx.filter((f) => f.t < f.life);
    G.shake = Math.max(0, G.shake - dt);
  }
  if (G) draw(a);
  requestAnimationFrame(loop);
}

function start() {
  G = newMatch();
  selected = null;
  ghost = null;
  drag = null;
  acc = 0;
  hudCache = '';
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
