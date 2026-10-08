/* =========================================================
   LAB BOSS – Kellerlabor-Tycoon (Retro)
   ---------------------------------------------------------
   Reine Fantasie: erfundene Ware, erfundene Stadt, keine echten Rezepte.
   Aufbau:
     1. CONFIG        – alle Spielwerte zum Anpassen
     2. Spielstand    – was gespeichert wird
     3. Hilfsfunktionen
     4. Markt         – Preise ändern sich jede Woche
     5. Aktionen      – kaufen, verkaufen, produzieren, ausbauen, Vito
     6. Woche beenden – Kosten, Zinsen, Heat, Razzia, Ereignisse
     7. Anzeige
     8. Start
   ========================================================= */

/* ========== 1. CONFIG ========== */
const CONFIG = {
  saveKey: 'lab-boss-v1',
  start: { cash: 1500, debt: 5000 },
  goal: 1000000,
  interest: 0.04, // Zinsen pro Woche bei Onkel Vito
  // Ware: Grundpreis, Schwankung, ab welcher Laborstufe herstellbar, Herstellkosten pro Einheit, Heat pro verkaufter Einheit
  products: [
    { id: 'kraut', icon: '🌿', name: 'Grünes Kraut', base: 40, vol: 0.22, lab: 1, cost: 12, heat: 0.03 },
    { id: 'sirup', icon: '🧃', name: 'Lila Sirup', base: 130, vol: 0.28, lab: 2, cost: 38, heat: 0.05 },
    { id: 'pillen', icon: '💊', name: 'Bunte Pillen', base: 320, vol: 0.32, lab: 3, cost: 95, heat: 0.08 },
    { id: 'schnee', icon: '❄️', name: 'Bergschnee', base: 950, vol: 0.38, lab: 4, cost: 280, heat: 0.12 },
    { id: 'blau', icon: '💎', name: 'Blaue Kristalle', base: 2600, vol: 0.42, lab: 5, cost: 760, heat: 0.18 },
  ],
  buyMarkup: 1.12, // Einkauf beim Großhändler ist teurer als der Verkaufspreis
  // Ausbau: Stufe 1 ist der Start. Preis = base × factor^(Stufe − 1)
  upgrades: {
    lab: { name: 'Labor', icon: '⚗️', base: 2500, factor: 3.2, max: 5, text: (l) => `Stufe ${l}: schaltet neue Ware frei, ${labCapacity(l)} Einheiten pro Woche.` },
    storage: { name: 'Lager', icon: '📦', base: 1200, factor: 2.4, max: 6, text: (l) => `Stufe ${l}: Platz für ${storageCapacity(l)} Einheiten.` },
    cover: { name: 'Tarnung', icon: '🕶️', base: 3000, factor: 2.6, max: 5, text: (l) => `Stufe ${l}: −${Math.round(coverFactor(l) * 100)} % Heat beim Verkauf.` },
  },
  rentPerLab: 100, // Fixkosten pro Woche je Laborstufe
  heatDecay: 7, // so viel Heat baut sich pro Woche ab
};

const labCapacity = (l) => 25 * l * l; // 25, 100, 225, 400, 625
const storageCapacity = (l) => 40 * 2 ** (l - 1); // 40 … 1280
const coverFactor = (l) => (l - 1) * 0.15; // bis −60 %
const upgradePrice = (u, l) => Math.round(CONFIG.upgrades[u].base * CONFIG.upgrades[u].factor ** (l - 1));

/* ========== 2. Spielstand ========== */
function newState(name) {
  const prices = {};
  const history = {};
  for (const p of CONFIG.products) {
    prices[p.id] = 1;
    history[p.id] = [p.base];
  }
  return {
    name, week: 1, cash: CONFIG.start.cash, debt: CONFIG.start.debt, heat: 5,
    levels: { lab: 1, storage: 1, cover: 1 },
    inv: Object.fromEntries(CONFIG.products.map((p) => [p.id, 0])),
    factor: prices, // Preisfaktor je Ware (Zufallsweg um 1)
    history, // letzte Preise für die Mini-Grafik
    event: null, // Marktereignis dieser Woche { id, mult, text }
    produced: 0, // diese Woche schon hergestellt
    news: ['Willkommen im Keller. Onkel Vito wartet auf sein Geld.'],
    won: false, over: false,
    stats: { sold: 0, earned: 0, raids: 0 },
  };
}
let S = null;

/* ========== 3. Hilfsfunktionen ========== */
const $ = (id) => document.getElementById(id);
const fmt = (n) => `${Math.round(n).toLocaleString('de-DE')} $`;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rnd = (a, b) => a + Math.random() * (b - a);
const gauss = () => { let u = 0; while (!u) u = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * Math.random()); };
const product = (id) => CONFIG.products.find((p) => p.id === id);
const stored = () => Object.values(S.inv).reduce((a, b) => a + b, 0);
const freeSpace = () => storageCapacity(S.levels.storage) - stored();
const news = (t) => { S.news.unshift(t); S.news = S.news.slice(0, 3); };

/* ========== 4. Markt ========== */
function sellPrice(id) {
  const p = product(id);
  const mult = S.event && S.event.id === id ? S.event.mult : 1;
  return Math.max(1, Math.round(p.base * S.factor[id] * mult));
}
const buyPrice = (id) => Math.round(sellPrice(id) * CONFIG.buyMarkup);

/** Neue Woche: jeder Preis macht einen Zufallsschritt und wird etwas zur Mitte gezogen. Manchmal gibt es ein Ereignis. */
function shiftMarket() {
  for (const p of CONFIG.products) {
    const f = S.factor[p.id] * Math.exp(gauss() * p.vol * 0.55);
    S.factor[p.id] = clamp(f + (1 - f) * 0.18, 0.35, 3);
  }
  S.event = null;
  if (Math.random() < 0.35) {
    const p = CONFIG.products[Math.floor(Math.random() * CONFIG.products.length)];
    S.event = Math.random() < 0.5
      ? { id: p.id, mult: rnd(2, 3.2), text: `ENGPASS: ${p.name} ist knapp – Preise explodieren!` }
      : { id: p.id, mult: rnd(0.3, 0.5), text: `SCHWEMME: Die Stadt ist voll mit „${p.name}“. Preise im Keller.` };
    news(S.event.text);
  }
  for (const p of CONFIG.products) S.history[p.id] = [...S.history[p.id], sellPrice(p.id)].slice(-8);
}

const SPARK = '▁▂▃▄▅▆▇█';
function sparkline(list) {
  const lo = Math.min(...list);
  const hi = Math.max(...list);
  return list.map((v) => SPARK[hi === lo ? 3 : Math.round(((v - lo) / (hi - lo)) * 7)]).join('');
}

/* ========== 5. Aktionen ========== */
function buy(id, n) {
  n = Math.min(n, freeSpace(), Math.floor(S.cash / buyPrice(id)));
  if (n <= 0) return;
  S.cash -= n * buyPrice(id);
  S.inv[id] += n;
  save(); render();
}

function sell(id, n) {
  n = Math.min(n, S.inv[id]);
  if (n <= 0) return;
  const p = product(id);
  const money = n * sellPrice(id);
  S.cash += money;
  S.inv[id] -= n;
  S.heat = clamp(S.heat + n * p.heat * (1 - coverFactor(S.levels.cover)), 0, 100);
  S.stats.sold += n;
  S.stats.earned += money;
  save(); render();
  checkEnd();
}

function produce(id, n) {
  const p = product(id);
  if (p.lab > S.levels.lab) return;
  n = Math.min(n, labCapacity(S.levels.lab) - S.produced, freeSpace(), Math.floor(S.cash / p.cost));
  if (n <= 0) return;
  S.cash -= n * p.cost;
  S.inv[id] += n;
  S.produced += n;
  S.heat = clamp(S.heat + n * 0.01, 0, 100); // Herstellen fällt weniger auf als Verkaufen
  save(); render();
}

function upgrade(u) {
  const l = S.levels[u];
  if (l >= CONFIG.upgrades[u].max) return;
  const price = upgradePrice(u, l + 1);
  if (S.cash < price) return;
  S.cash -= price;
  S.levels[u] = l + 1;
  news(`${CONFIG.upgrades[u].name} ausgebaut auf Stufe ${l + 1}.`);
  save(); render();
}

function borrow(n) {
  if (S.debt + n > 50000) return;
  S.debt += n;
  S.cash += n;
  save(); render();
}

function repay(n) {
  n = Math.min(n, S.debt, S.cash);
  if (n <= 0) return;
  S.debt -= n;
  S.cash -= n;
  if (S.debt === 0) news('Onkel Vito ist zufrieden. Vorerst.');
  save(); render();
}

/* ========== 6. Woche beenden ========== */
function nextWeek() {
  if (S.over) return;
  // Fixkosten und Zinsen
  const rent = CONFIG.rentPerLab * S.levels.lab;
  S.cash -= rent;
  if (S.debt > 0) S.debt = Math.round(S.debt * (1 + CONFIG.interest));
  // Onkel Vito wird ungeduldig
  if (S.debt > 25000 && Math.random() < 0.3) {
    const take = Math.min(S.cash, Math.round(S.debt * 0.2));
    S.cash -= take;
    S.debt -= take;
    modal('VITO SCHICKT JEMANDEN', `Zwei Männer in Lederjacken holen ${fmt(take)} ab. „Nur eine kleine Erinnerung.“`, true);
  }
  // Heat und Razzia
  const raidChance = clamp((S.heat - 35) / 110, 0, 0.6);
  if (Math.random() < raidChance) {
    const lost = Math.ceil(stored() * 0.6);
    for (const id of Object.keys(S.inv)) S.inv[id] = Math.floor(S.inv[id] * 0.4);
    const fine = Math.round(Math.max(0, S.cash) * 0.25);
    S.cash -= fine;
    S.heat = clamp(S.heat - 35, 0, 100);
    S.stats.raids++;
    modal('🚨 RAZZIA!', `Die Polizei stürmt dein Lager: ${lost} Einheiten beschlagnahmt, ${fmt(fine)} „Strafe“.`, true);
  } else {
    S.heat = clamp(S.heat - CONFIG.heatDecay, 0, 100);
  }
  if (S.cash < 0) {
    S.debt += -S.cash;
    news(`Miete nicht gedeckt – Vito schießt ${fmt(-S.cash)} vor.`);
    S.cash = 0;
  }
  S.week++;
  S.produced = 0;
  shiftMarket();
  news(`Woche ${S.week}: Miete ${fmt(rent)} bezahlt.`);
  save(); render();
  checkEnd();
}

function checkEnd() {
  if (S.heat >= 100 && !S.over) {
    S.over = true;
    save(); render();
    modal('GAME OVER', `Die Ermittler haben genug Beweise. ${S.name} wird in Woche ${S.week} verhaftet. Verdient: ${fmt(S.stats.earned)}.`, true);
    return;
  }
  if (!S.won && S.cash - S.debt >= CONFIG.goal) {
    S.won = true;
    save();
    modal('👑 BOSS DER STADT', `${S.name} hat in ${S.week} Wochen eine Million gemacht. Du kannst weiterspielen – aber pass auf die Heat auf.`);
  }
}

/* ========== 7. Anzeige ========== */
function modal(title, text, bad = false) {
  $('modal-title').textContent = title;
  $('modal-text').textContent = text;
  document.querySelector('.modal-box').classList.toggle('bad', bad);
  $('modal').classList.remove('hidden');
}

function trend(id) {
  const h = S.history[id];
  if (h.length < 2) return '<span class="flat">=</span>';
  const d = h[h.length - 1] - h[h.length - 2];
  const pct = Math.round((d / h[h.length - 2]) * 100);
  return pct > 2 ? `<span class="up">▲ ${pct} %</span>` : pct < -2 ? `<span class="down">▼ ${-pct} %</span>` : '<span class="flat">= 0 %</span>';
}

function btn(label, action, disabled, cls = '') {
  return `<button class="btn small ${cls}" data-act="${action}" ${disabled ? 'disabled' : ''}>${label}</button>`;
}

function renderMarket() {
  const rows = CONFIG.products.map((p) => {
    const sp = sellPrice(p.id);
    const bp = buyPrice(p.id);
    const canBuy = Math.min(freeSpace(), Math.floor(S.cash / bp));
    const hot = S.event && S.event.id === p.id ? `<span class="tag-hot">${S.event.mult > 1 ? 'ENGPASS' : 'SCHWEMME'}</span>` : '';
    return `<div class="row">
      <div class="name">${p.icon} ${p.name} ${hot}<br><span class="spark">${sparkline(S.history[p.id])}</span> ${trend(p.id)}</div>
      <div class="price">Verkauf <b>${fmt(sp)}</b><br><em class="flat">Einkauf ${fmt(bp)}</em></div>
      <div class="actions">
        ${btn('Kauf 1', `buy:${p.id}:1`, canBuy < 1)} ${btn('Kauf 10', `buy:${p.id}:10`, canBuy < 1)} ${btn('Kauf max', `buy:${p.id}:999999`, canBuy < 1)}
        ${btn(`Verk. 1`, `sell:${p.id}:1`, S.inv[p.id] < 1, 'amber')} ${btn('Verk. alle', `sell:${p.id}:999999`, S.inv[p.id] < 1, 'amber')}
        <span class="flat">· im Lager: ${S.inv[p.id]}</span>
      </div>
    </div>`;
  }).join('');
  $('tab-market').innerHTML = `<h2>SCHWARZMARKT · WOCHE ${S.week}</h2>
    <p class="hint">Preise ändern sich jede Woche. Billig einkaufen, teuer verkaufen – jeder Verkauf erhöht die Heat.</p>${rows}`;
}

function renderLab() {
  const cap = labCapacity(S.levels.lab);
  const left = cap - S.produced;
  const rows = CONFIG.products.map((p) => {
    const locked = p.lab > S.levels.lab;
    const max = Math.min(left, freeSpace(), Math.floor(S.cash / p.cost));
    return `<div class="row ${locked ? 'locked' : ''}">
      <div class="name">${p.icon} ${p.name}<br><em>${locked ? `🔒 ab Laborstufe ${p.lab}` : `Kosten ${fmt(p.cost)} pro Einheit · Markt ${fmt(sellPrice(p.id))}`}</em></div>
      <div class="price">${locked ? '' : `<b>${Math.round((1 - p.cost / sellPrice(p.id)) * 100)} %</b><br><em class="flat">Marge</em>`}</div>
      ${locked ? '' : `<div class="actions">${btn('+1', `make:${p.id}:1`, max < 1)} ${btn('+10', `make:${p.id}:10`, max < 1)} ${btn('Max', `make:${p.id}:999999`, max < 1)}</div>`}
    </div>`;
  }).join('');
  $('tab-lab').innerHTML = `<h2>⚗️ LABOR · STUFE ${S.levels.lab}</h2>
    <p class="hint">Diese Woche noch <b>${left}</b> von ${cap} Einheiten herstellbar. Selbst herstellen ist viel billiger als einkaufen.</p>${rows}`;
}

function renderStash() {
  const cap = storageCapacity(S.levels.storage);
  const used = stored();
  const value = CONFIG.products.reduce((a, p) => a + S.inv[p.id] * sellPrice(p.id), 0);
  const rows = CONFIG.products.filter((p) => S.inv[p.id] > 0).map((p) => `<div class="row">
      <div class="name">${p.icon} ${p.name}</div><div class="price"><b>${S.inv[p.id]}</b> × ${fmt(sellPrice(p.id))}</div></div>`).join('');
  $('tab-stash').innerHTML = `<h2>📦 INVENTAR</h2>
    <p class="hint">${used} / ${cap} Einheiten belegt · Marktwert ${fmt(value)}</p>
    <div class="inv-bar"><i style="width:${Math.min(100, (used / cap) * 100)}%"></i></div>
    ${rows || '<p class="flat">Leer. Ab ins Labor oder auf den Markt.</p>'}
    <h2 style="margin-top:14px">STATISTIK</h2>
    <p class="flat">Verkauft: ${S.stats.sold} Einheiten · Umsatz ${fmt(S.stats.earned)} · Razzien: ${S.stats.raids}</p>`;
}

function renderUpgrades() {
  const rows = Object.entries(CONFIG.upgrades).map(([u, def]) => {
    const l = S.levels[u];
    const maxed = l >= def.max;
    const price = maxed ? 0 : upgradePrice(u, l + 1);
    return `<div class="row">
      <div class="name">${def.icon} ${def.name} · Stufe ${l}/${def.max}<br><em>${def.text(l)}</em></div>
      <div class="price">${maxed ? '<b>MAX</b>' : fmt(price)}</div>
      <div class="actions">${maxed ? '' : btn(`Ausbauen → ${def.text(l + 1)}`, `up:${u}`, S.cash < price)}</div>
    </div>`;
  }).join('');
  $('tab-upgrades').innerHTML = `<h2>🔧 AUSBAU</h2><p class="hint">Größeres Labor = teurere Ware und mehr Fixkosten (${fmt(CONFIG.rentPerLab * S.levels.lab)} pro Woche).</p>${rows}`;
}

function renderBank() {
  $('tab-bank').innerHTML = `<h2>🤵 ONKEL VITO</h2>
    <p class="hint">„Ich leihe dir gern was. ${Math.round(CONFIG.interest * 100)} % pro Woche. Und wenn es zu viel wird, komme ich vorbei.“</p>
    <div class="row"><div class="name">Schulden</div><div class="price"><b class="down">${fmt(S.debt)}</b></div>
      <div class="actions">${btn('Leihen 1.000', 'borrow:1000', S.debt + 1000 > 50000)} ${btn('Leihen 10.000', 'borrow:10000', S.debt + 10000 > 50000)}
      ${btn('Zahlen 1.000', 'repay:1000', S.debt < 1 || S.cash < 1, 'amber')} ${btn('Alles zahlen', 'repay:99999999', S.debt < 1 || S.cash < 1, 'amber')}</div></div>
    <p class="flat">Höchstens 50.000 $ Schulden. Über 25.000 $ wird Vito ungemütlich.</p>`;
}

function render() {
  $('boss-label').textContent = S.name;
  $('st-cash').textContent = fmt(S.cash);
  $('st-debt').textContent = fmt(S.debt);
  $('st-week').textContent = S.week;
  $('st-store').textContent = `${stored()}/${storageCapacity(S.levels.storage)}`;
  $('st-heat').textContent = `${Math.round(S.heat)} %`;
  $('heat-fill').style.width = `${S.heat}%`;
  $('news').innerHTML = S.news.map((n) => `<p>${n}</p>`).join('');
  renderMarket(); renderLab(); renderStash(); renderUpgrades(); renderBank();
  $('next-week').disabled = S.over;
}

/* ========== 8. Speichern & Start ========== */
function save() {
  try { localStorage.setItem(CONFIG.saveKey, JSON.stringify(S)); } catch { /* privater Modus */ }
}
function load() {
  try {
    const raw = localStorage.getItem(CONFIG.saveKey);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function showGame() {
  $('start-screen').classList.add('hidden');
  $('game').classList.remove('hidden');
  render();
}

document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-act]');
  if (el && !el.disabled) {
    const [act, a, b] = el.dataset.act.split(':');
    if (act === 'buy') buy(a, Number(b));
    if (act === 'sell') sell(a, Number(b));
    if (act === 'make') produce(a, Number(b));
    if (act === 'up') upgrade(a);
    if (act === 'borrow') borrow(Number(a));
    if (act === 'repay') repay(Number(a));
  }
  const tab = e.target.closest('[data-tab]');
  if (tab) {
    document.querySelectorAll('.tabs button').forEach((t) => t.classList.toggle('on', t === tab));
    document.querySelectorAll('.tab').forEach((t) => t.classList.toggle('hidden', t.id !== `tab-${tab.dataset.tab}`));
  }
});

$('start-btn').addEventListener('click', () => {
  S = newState($('boss-name').value.trim() || 'Der Chemiker');
  shiftMarket();
  save();
  showGame();
});
$('next-week').addEventListener('click', nextWeek);
$('modal-ok').addEventListener('click', () => $('modal').classList.add('hidden'));
$('reset').addEventListener('click', () => {
  if (!confirm('Wirklich ein neues Spiel starten? Der aktuelle Spielstand geht verloren.')) return;
  try { localStorage.removeItem(CONFIG.saveKey); } catch { /* egal */ }
  S = null;
  $('game').classList.add('hidden');
  $('start-screen').classList.remove('hidden');
});

S = load();
if (S) showGame();
else $('start-screen').classList.remove('hidden');
