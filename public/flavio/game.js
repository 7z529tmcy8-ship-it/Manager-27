/* =========================================================
   Onkel Flávio – vom Läufer in Kreuzberg nach oben
   ---------------------------------------------------------
   Erfundene Geschichte, erfundene Ware, keine Anleitung zu irgendwas.
   Aufbau:
     1. CONFIG       – Kieze, Ware, Ränge, Werte
     2. Spielstand
     3. Hilfsfunktionen
     4. Markt & Kunden
     5. Aktionen     – Aufträge, Einkauf, Verkauf, U-Bahn, Bunker
     6. Zeit         – Tageszeiten, neuer Tag, Kontrollen
     7. Anzeige      – Startseite (Liste) und Unterseiten
     8. Start
   ========================================================= */

/* ========== 1. CONFIG ========== */
const CONFIG = {
  saveKey: 'onkel-flavio-v1',
  startCash: 50,
  rent: { every: 7, amount: 120 }, // WG-Zimmer, alle 7 Tage
  times: ['Morgen', 'Nachmittag', 'Nacht'],
  flavioAt: 'oranien', // Flávios Späti
  // Kieze: Kürzel, Name, Kundschaft (Menge pro Tageszeit), Polizeidruck, Nachfrage je Ware, Position auf der Karte
  kieze: [
    { id: 'goerli', code: 'GP', name: 'Görlitzer Park', people: 'Touristen und Nachtschwärmer', crowd: 2.6, police: 1.5, demand: { kraut: 1.4, pillen: 0.9, pulver: 0.7 }, x: 240, y: 150, ly: 30 },
    { id: 'kotti', code: 'KT', name: 'Kottbusser Tor', people: 'Laufkundschaft rund um die Uhr', crowd: 2.4, police: 1.4, demand: { kraut: 1, pillen: 1.1, pulver: 1 }, x: 150, y: 110, ly: -18 },
    { id: 'wrangel', code: 'WK', name: 'Wrangelkiez', people: 'Studis und WG-Partys', crowd: 1.6, police: 0.8, demand: { kraut: 1.2, pillen: 1.3, pulver: 0.6 }, x: 330, y: 70, ly: -18 },
    { id: 'oranien', code: 'OS', name: 'Oranienstraße', people: 'Bars, Clubs – und Flávios Späti', crowd: 1.8, police: 1, demand: { kraut: 0.9, pillen: 1.2, pulver: 1.2 }, x: 70, y: 70, ly: -18 },
    { id: 'bergmann', code: 'BK', name: 'Bergmannkiez', people: 'Gut verdienende Kundschaft', crowd: 1.1, police: 0.7, demand: { kraut: 0.8, pillen: 0.9, pulver: 1.6 }, x: 90, y: 225, ly: 30 },
    { id: 'schles', code: 'ST', name: 'Schlesisches Tor', people: 'Club-Publikum am Wochenende', crowd: 1.5, police: 1.1, demand: { kraut: 1, pillen: 1.4, pulver: 1.1 }, x: 330, y: 200, ly: 30 },
  ],
  // U-Bahn-Verbindungen für die Karte (Fahrt dauert immer eine Tageszeit)
  lines: [['oranien', 'kotti'], ['kotti', 'goerli'], ['goerli', 'schles'], ['schles', 'wrangel'], ['kotti', 'bergmann']],
  // Ware (erfunden): Grundpreis pro Einheit beim Kunden, Einkauf bei Flávio, Heat pro Einheit, ab welchem Rang
  goods: [
    { id: 'kraut', code: 'K', name: 'Kraut', price: 12, buy: 6, heat: 0.6, rank: 2 },
    { id: 'pillen', code: 'P', name: 'Pillen', price: 28, buy: 14, heat: 1, rank: 2 },
    { id: 'pulver', code: 'W', name: 'Pulver', price: 75, buy: 38, heat: 1.8, rank: 3 },
  ],
  // Ränge: was man braucht, was es bringt
  ranks: [
    { name: 'Läufer', short: 'Läufer', pocket: 8, needs: null, unlock: 'Aufträge für Flávio: Ware abholen und ausliefern.' },
    { name: 'Straßendealer', short: 'Dealer', pocket: 12, needs: { rep: 12 }, unlock: 'Eigene Kunden, Einkauf bei Flávio.' },
    { name: 'Kiez-Dealer', short: 'Kiez', pocket: 20, needs: { rep: 45, regulars: 3, cash: 2000 }, unlock: 'Bunker (Versteck), Pulver, mehr Platz am Mann.' },
    { name: 'Zwischenhändler', short: 'Händler', pocket: 30, needs: { locked: true }, unlock: 'Andere Dealer beliefern, Fassade – kommt bald.' },
    { name: 'Großhändler', short: 'Groß', pocket: 50, needs: { locked: true }, unlock: 'Ganz Berlin, Lieferanten – kommt bald.' },
    { name: 'Der Boss', short: 'Boss', pocket: 80, needs: { locked: true }, unlock: 'Die Stadt gehört dir – kommt bald.' },
  ],
  bunker: { price: 1500, capacity: 60 },
  heatDecay: 12, // pro Tag in jedem Kiez
};

const FIRST = ['Kalle', 'Deniz', 'Mia', 'Jonas', 'Leyla', 'Tom', 'Sami', 'Nina', 'Ben', 'Aylin', 'Paul', 'Lina', 'Emre', 'Sophie', 'Malik', 'Jana', 'Luca', 'Hanna', 'Kemal', 'Finn', 'Marta', 'Ole', 'Selin', 'Max'];
const TYPES = ['Tourist', 'Studi', 'Kellner', 'DJ', 'Anwalt', 'Künstlerin', 'Barkeeper', 'Start-up-Typ', 'Kurierfahrer', 'Krankenpfleger'];

/* ========== 2. Spielstand ========== */
function newState(name) {
  const s = {
    name, day: 1, time: 0, cash: CONFIG.startCash, rep: 0, rank: 0,
    at: 'oranien',
    pocket: { kraut: 0, pillen: 0, pulver: 0 },
    bunker: null, // { kiez, goods }
    heat: Object.fromEntries(CONFIG.kieze.map((k) => [k.id, 0])),
    price: Object.fromEntries(CONFIG.goods.map((g) => [g.id, 1])), // Tagesfaktor je Ware
    event: null,
    jobs: [], job: null, // offene Aufträge, angenommener Auftrag
    customers: [], // Kunden der aktuellen Tageszeit
    regulars: {}, // Name → { kiez, buys, regular }
    phone: [], // Nachrichten
    stats: { sold: 0, earned: 0, jobs: 0, busts: 0 },
    page: 'home',
  };
  return s;
}
let S = null;

/* ========== 3. Hilfsfunktionen ========== */
const $ = (id) => document.getElementById(id);
const eur = (n) => `${Math.round(n).toLocaleString('de-DE')} €`;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const rnd = (a, b) => a + Math.random() * (b - a);
const kiez = (id) => CONFIG.kieze.find((k) => k.id === id);
const good = (id) => CONFIG.goods.find((g) => g.id === id);
const rank = () => CONFIG.ranks[S.rank];
const carried = () => Object.values(S.pocket).reduce((a, b) => a + b, 0) + (S.job ? S.job.units : 0);
const pocketFree = () => rank().pocket - carried();
const goodsForRank = () => CONFIG.goods.filter((g) => g.rank <= S.rank + 1);
const regularCount = () => Object.values(S.regulars).filter((r) => r.regular).length;
function text(from, body) {
  S.phone.unshift({ from, body, day: S.day, time: S.time, read: false });
  S.phone = S.phone.slice(0, 30);
}
const unread = () => S.phone.filter((m) => !m.read).length;

/* ========== 4. Markt & Kunden ========== */
/** Preis, den Kunden in einem Kiez ungefähr zahlen. */
function streetPrice(gid, kid = S.at) {
  const g = good(gid);
  const k = kiez(kid);
  const ev = S.event && S.event.kind === 'demand' && S.event.kiez === kid ? 1.4 : 1;
  return Math.max(1, Math.round(g.price * S.price[gid] * (0.8 + k.demand[gid] * 0.25) * ev));
}
/** Einkaufspreis bei Flávio. */
function buyPrice(gid) {
  const short = S.event && S.event.kind === 'short' ? 1.5 : 1;
  return Math.max(1, Math.round(good(gid).buy * S.price[gid] * short));
}

function rollCustomers() {
  S.customers = [];
  if (S.rank < 1) return;
  const k = kiez(S.at);
  const night = S.time === 2 ? 1.5 : S.time === 0 ? 0.6 : 1;
  const ev = S.event && S.event.kind === 'demand' && S.event.kiez === S.at ? 1.8 : 1;
  // Wer hier viel Heat hat, findet weniger Kunden – die Leute merken, dass es brennt.
  const scare = 1 - S.heat[S.at] / 160;
  const n = Math.max(0, Math.round(k.crowd * night * ev * scare + rnd(-1, 1.2)));
  const goods = goodsForRank();
  // Stammkunden aus diesem Kiez melden sich öfter.
  for (const [name, r] of Object.entries(S.regulars)) {
    if (r.regular && r.kiez === S.at && Math.random() < 0.5) S.customers.push(makeCustomer(name, r.type, goods, true));
  }
  for (let i = 0; i < n; i++) {
    const name = pick(FIRST);
    if (name === S.name || S.customers.some((c) => c.name === name)) continue;
    const r = S.regulars[name];
    S.customers.push(makeCustomer(name, r ? r.type : pick(TYPES), goods, !!(r && r.regular && r.kiez === S.at)));
  }
}

function makeCustomer(name, type, goods, regular) {
  const k = kiez(S.at);
  const weights = goods.map((g) => k.demand[g.id]);
  let r = Math.random() * weights.reduce((a, b) => a + b, 0);
  const g = goods.find((_, i) => (r -= weights[i]) <= 0) ?? goods[0];
  const units = Math.max(1, Math.round(rnd(1, regular ? 7 : 4)));
  const offer = Math.round(streetPrice(g.id) * rnd(0.85, 1.2) * (regular ? 1.1 : 1));
  return { name, type, good: g.id, units, offer, regular, done: false };
}

/* ========== 5. Aktionen ========== */
function rollJobs() {
  const targets = CONFIG.kieze.filter((k) => k.id !== CONFIG.flavioAt);
  S.jobs = Array.from({ length: 3 }, () => {
    const to = pick(targets);
    const units = Math.round(rnd(2, 6));
    return { to: to.id, units, pay: Math.round(18 + units * rnd(5, 9) + to.police * 8) };
  });
}

function acceptJob(i) {
  const j = S.jobs[i];
  if (!j || S.job || S.at !== CONFIG.flavioAt || pocketFree() < j.units) return;
  S.job = j;
  S.jobs.splice(i, 1);
  text('Onkel Flávio', `Bring das nach ${kiez(j.to).name}. Nicht trödeln, nicht reden.`);
  save(); render();
}

function finishJob() {
  const j = S.job;
  S.cash += j.pay;
  S.rep += 2;
  S.stats.jobs++;
  S.job = null;
  text('Onkel Flávio', `Gut gemacht. ${eur(j.pay)} für dich.`);
  checkRank();
}

function buy(gid, n) {
  if (S.at !== CONFIG.flavioAt || S.rank < 1) return;
  const p = buyPrice(gid);
  n = Math.min(n, pocketFree(), Math.floor(S.cash / p));
  if (n <= 0) return;
  S.cash -= n * p;
  S.pocket[gid] += n;
  save(); render();
}

function sellTo(i) {
  const c = S.customers[i];
  if (!c || c.done || S.pocket[c.good] < c.units) return;
  const g = good(c.good);
  const money = c.units * c.offer;
  S.pocket[c.good] -= c.units;
  S.cash += money;
  S.heat[S.at] = clamp(S.heat[S.at] + c.units * g.heat * kiez(S.at).police * (c.regular ? 0.5 : 1), 0, 100);
  S.rep += c.regular ? 2 : 1;
  S.stats.sold += c.units;
  S.stats.earned += money;
  c.done = true;
  const r = S.regulars[c.name] ?? { kiez: S.at, buys: 0, type: c.type, regular: false };
  r.buys++;
  if (!r.regular && r.buys >= 3) {
    r.regular = true;
    r.kiez = S.at;
    text(c.name, `Bist echt zuverlässig. Ich meld mich wieder – und bring Freunde mit.`);
  }
  S.regulars[c.name] = r;
  checkRank();
  save(); render();
}

function travel(to) {
  if (to === S.at) return;
  S.at = to;
  S.page = 'home'; // nach der Fahrt: Überblick über den neuen Kiez
  advanceTime(true);
}

function buyBunker() {
  if (S.rank < 2 || S.bunker || S.cash < CONFIG.bunker.price) return;
  S.cash -= CONFIG.bunker.price;
  S.bunker = { kiez: S.at, goods: { kraut: 0, pillen: 0, pulver: 0 } };
  text('Onkel Flávio', `Ein Keller in ${kiez(S.at).name}. Klug. Ware am Mann ist Ware im Knast.`);
  save(); render();
}

function stash(gid, toBunker) {
  const b = S.bunker;
  if (!b || b.kiez !== S.at) return;
  if (toBunker) {
    const space = CONFIG.bunker.capacity - Object.values(b.goods).reduce((a, x) => a + x, 0);
    const n = Math.min(S.pocket[gid], space);
    S.pocket[gid] -= n;
    b.goods[gid] += n;
  } else {
    const n = Math.min(b.goods[gid], pocketFree());
    b.goods[gid] -= n;
    S.pocket[gid] += n;
  }
  save(); render();
}

function checkRank() {
  const next = CONFIG.ranks[S.rank + 1];
  if (!next || next.needs.locked) return;
  const n = next.needs;
  if (S.rep >= (n.rep ?? 0) && regularCount() >= (n.regulars ?? 0) && S.cash >= (n.cash ?? 0)) {
    S.rank++;
    text('Onkel Flávio', `Ab heute bist du ${next.name}. ${next.unlock}`);
    showModal(`Aufstieg: ${next.name}`, `<p>${next.unlock}</p><p>Platz am Mann: ${next.pocket} Einheiten.</p>`);
    if (S.rank >= 1 && !S.customers.length) rollCustomers();
  }
}

/* ========== 6. Zeit ========== */
function advanceTime(traveled = false) {
  const report = [];
  // Kontrolle: je heißer der Kiez, desto eher. Nachts mehr Streifen.
  const chance = clamp((S.heat[S.at] / 220) * kiez(S.at).police + (S.time === 2 ? 0.03 : 0) + (traveled ? 0.02 : 0), 0, 0.55);
  if (Math.random() < chance) {
    const units = carried();
    if (units === 0) {
      report.push(`Polizeikontrolle in ${kiez(S.at).name}. Du warst sauber – sie lassen dich gehen.`);
    } else {
      const fine = Math.min(Math.max(0, S.cash), 40 * units);
      S.cash -= fine;
      for (const g of Object.keys(S.pocket)) S.pocket[g] = 0;
      if (S.job) {
        report.push('Flávios Ware ist weg. Er ist nicht begeistert (Ruf −5).');
        S.rep = Math.max(0, S.rep - 5);
        S.job = null;
      }
      S.heat[S.at] = clamp(S.heat[S.at] + 15, 0, 100);
      S.stats.busts++;
      if (units >= 10) {
        S.day += 2;
        S.time = 0;
        report.push(`Festnahme! ${units} Einheiten beschlagnahmt, ${eur(fine)} Kaution, zwei Tage in Gewahrsam.`);
      } else {
        report.push(`Polizeikontrolle! ${units} Einheiten beschlagnahmt, ${eur(fine)} weg.`);
      }
    }
  }
  if (S.job && S.at === S.job.to) finishJob();

  S.time++;
  if (S.time > 2) {
    S.time = 0;
    newDay(report);
  }
  rollCustomers();
  if (report.length) showModal(report.some((r) => r.includes('beschlagnahmt') || r.includes('Festnahme')) ? 'Ärger' : 'Unterwegs', report.map((r) => `<p>${r}</p>`).join(''), report.some((r) => r.includes('beschlagnahmt')));
  save(); render();
}

function newDay(report) {
  S.day++;
  for (const k of CONFIG.kieze) S.heat[k.id] = clamp(S.heat[k.id] - CONFIG.heatDecay, 0, 100);
  for (const g of CONFIG.goods) S.price[g.id] = clamp(S.price[g.id] * Math.exp(rnd(-0.18, 0.18)) + (1 - S.price[g.id]) * 0.15, 0.6, 1.8);
  rollJobs();
  S.event = null;
  const r = Math.random();
  if (r < 0.15) {
    const k = pick(CONFIG.kieze);
    S.event = { kind: 'demand', kiez: k.id, text: `Party-Wochenende in ${k.name}: viele Kunden, gute Preise.` };
  } else if (r < 0.25) {
    const k = pick(CONFIG.kieze);
    S.heat[k.id] = clamp(S.heat[k.id] + 35, 0, 100);
    S.event = { kind: 'raid', kiez: k.id, text: `Großeinsatz der Polizei in ${k.name}. Heute lieber woanders.` };
  } else if (r < 0.32) {
    S.event = { kind: 'short', text: 'Flávio hat Lieferprobleme – Einkauf heute 50 % teurer.' };
  }
  if (S.event) text('Kiez-Funk', S.event.text);
  if (S.day % CONFIG.rent.every === 0) {
    S.cash -= CONFIG.rent.amount;
    report.push(`Miete fürs WG-Zimmer: ${eur(CONFIG.rent.amount)}.${S.cash < 0 ? ' Du bist im Minus.' : ''}`);
  }
}

/* ========== 7. Anzeige ========== */
function showModal(title, html, bad = false) {
  $('m-title').textContent = title;
  $('m-body').innerHTML = html;
  document.querySelector('.modal-card').classList.toggle('bad', bad);
  $('modal').classList.remove('hidden');
}

const item = (page, code, title, sub, meta = '', disabled = false) =>
  `<button class="item" data-page="${page}" ${disabled ? 'disabled' : ''}>
    <span class="code">${code}</span><span class="txt"><strong>${title}</strong><small>${sub}</small></span>
    <span class="meta">${meta}</span><span class="chev">›</span></button>`;
const head = (title) => `<div class="page-head"><button class="back" data-page="home">‹ Zurück</button><h2>${title}</h2></div>`;

function pageHome() {
  const k = kiez(S.at);
  const open = S.customers.filter((c) => !c.done).length;
  const jobInfo = S.job ? `Unterwegs nach ${kiez(S.job.to).name}` : S.at === CONFIG.flavioAt ? `${S.jobs.length} Aufträge bei Flávio` : 'Bei Flávio in der Oranienstraße';
  return `<div class="where"><small>Standort</small><strong>${k.name}</strong><span>${k.people} · Heat hier ${Math.round(S.heat[S.at])} %</span></div>
  <div class="list">
    ${item('customers', 'KU', 'Kunden', S.rank < 1 ? 'Als Läufer verkaufst du noch nicht selbst' : open ? 'Warten auf dich' : 'Gerade niemand', open ? `${open} da` : '', S.rank < 1)}
    ${item('jobs', 'AU', 'Aufträge', jobInfo, S.job ? 'aktiv' : '')}
    ${item('buy', 'EK', 'Einkauf bei Flávio', S.rank < 1 ? 'Ab Straßendealer' : S.at === CONFIG.flavioAt ? 'Späti, Hinterzimmer' : 'Nur in der Oranienstraße', '', S.rank < 1)}
    ${item('pocket', 'AM', 'Am Mann', `${carried()} von ${rank().pocket} Einheiten`, '')}
    ${item('bunker', 'BU', 'Bunker', S.bunker ? `Versteck in ${kiez(S.bunker.kiez).name}` : S.rank < 2 ? 'Ab Kiez-Dealer' : `Für ${eur(CONFIG.bunker.price)} zu haben`, '', S.rank < 2)}
    ${item('map', 'U', 'U-Bahn', 'Kiez wechseln – kostet eine Tageszeit', '')}
    ${item('phone', 'HY', 'Handy', S.phone[0] ? `${S.phone[0].from}: ${S.phone[0].body.slice(0, 40)}…` : 'Keine Nachrichten', unread() ? `${unread()} neu` : '')}
    ${item('status', 'RG', 'Aufstieg', `${rank().name} · Ruf ${S.rep}`, '')}
  </div>`;
}

function pageCustomers() {
  const rows = S.customers.map((c, i) => {
    const g = good(c.good);
    const has = S.pocket[c.good] >= c.units;
    return `<div class="row">
      <div class="grow"><strong>${c.name}</strong>${c.regular ? '<span class="badge">Stammkunde</span>' : ''}<small>${c.type} · will ${c.units}× ${g.name} · zahlt ${eur(c.offer)} pro Einheit</small></div>
      <span class="num">${eur(c.units * c.offer)}</span>
      ${c.done ? '<span class="good">Erledigt</span>' : `<button class="btn sm primary" data-act="sell:${i}" ${has ? '' : 'disabled'}>${has ? 'Verkaufen' : 'Nicht genug'}</button>`}
    </div>`;
  }).join('');
  return `${head('Kunden')}<p class="hint">${kiez(S.at).name}, ${CONFIG.times[S.time]}. Jeder Verkauf macht den Kiez heißer – Stammkunden fallen weniger auf.</p>
    <div class="list">${rows || '<div class="empty">Gerade niemand da. Abwarten oder den Kiez wechseln.</div>'}</div>`;
}

function pageJobs() {
  const here = S.at === CONFIG.flavioAt;
  const active = S.job ? `<div class="row"><div class="grow"><strong>Aktiver Auftrag</strong><small>${S.job.units} Einheiten nach ${kiez(S.job.to).name} · ${eur(S.job.pay)}</small></div><span class="badge">fahr hin</span></div>` : '';
  const rows = S.jobs.map((j, i) => `<div class="row">
      <div class="grow"><strong>Nach ${kiez(j.to).name}</strong><small>${j.units} Einheiten · Risiko ${kiez(j.to).police > 1.2 ? 'hoch' : kiez(j.to).police > 0.9 ? 'mittel' : 'niedrig'}</small></div>
      <span class="num">${eur(j.pay)}</span>
      <button class="btn sm primary" data-act="job:${i}" ${here && !S.job && pocketFree() >= j.units ? '' : 'disabled'}>Annehmen</button></div>`).join('');
  return `${head('Aufträge')}<p class="hint">${here ? 'Flávio hat Arbeit. Ware abholen, mit der U-Bahn hinbringen, Geld kassieren.' : 'Aufträge gibt es nur bei Flávio in der Oranienstraße.'}</p>
    <div class="list">${active}${rows || '<div class="empty">Heute nichts mehr. Morgen gibt es neue Aufträge.</div>'}</div>`;
}

function pageBuy() {
  const here = S.at === CONFIG.flavioAt;
  const rows = CONFIG.goods.map((g) => {
    const locked = g.rank > S.rank + 1;
    const p = buyPrice(g.id);
    const max = Math.min(pocketFree(), Math.floor(S.cash / p));
    return `<div class="row">
      <div class="grow"><strong>${g.name}</strong>${locked ? `<span class="badge">ab ${CONFIG.ranks[g.rank - 1].name}</span>` : ''}<small>Einkauf ${eur(p)} · auf der Straße ca. ${eur(streetPrice(g.id))}</small></div>
      ${locked ? '' : `<button class="btn sm" data-act="buy:${g.id}:1" ${here && max >= 1 ? '' : 'disabled'}>+1</button>
      <button class="btn sm" data-act="buy:${g.id}:5" ${here && max >= 1 ? '' : 'disabled'}>+5</button>
      <button class="btn sm primary" data-act="buy:${g.id}:999" ${here && max >= 1 ? '' : 'disabled'}>Max</button>`}</div>`;
  }).join('');
  return `${head('Einkauf')}<p class="hint">${here ? `Flávios Hinterzimmer. Noch ${pocketFree()} Einheiten Platz am Mann.` : 'Einkaufen kannst du nur bei Flávio in der Oranienstraße.'}${S.event && S.event.kind === 'short' ? ' <span class="badge warn">Lieferprobleme</span>' : ''}</p>
    <div class="list">${rows}</div>`;
}

function pagePocket() {
  const rows = CONFIG.goods.filter((g) => S.pocket[g.id] > 0).map((g) => `<div class="row"><div class="grow"><strong>${g.name}</strong><small>Straßenwert hier ca. ${eur(streetPrice(g.id))} pro Einheit</small></div><span class="num">${S.pocket[g.id]}</span></div>`).join('');
  const job = S.job ? `<div class="row"><div class="grow"><strong>Flávios Ware</strong><small>Auftrag nach ${kiez(S.job.to).name}</small></div><span class="num">${S.job.units}</span></div>` : '';
  return `${head('Am Mann')}<p class="hint">${carried()} von ${rank().pocket} Einheiten. Bei einer Kontrolle ist alles weg – ab 10 Einheiten gibt es eine Festnahme.</p>
    <div class="list">${job}${rows || (job ? '' : '<div class="empty">Nichts dabei. Sauber.</div>')}</div>`;
}

function pageBunker() {
  if (!S.bunker) {
    return `${head('Bunker')}<p class="hint">Ein Versteck, in dem Ware sicher liegt. Du kaufst es im Kiez, in dem du gerade bist.</p>
      <div class="list"><div class="row"><div class="grow"><strong>Keller in ${kiez(S.at).name}</strong><small>Platz für ${CONFIG.bunker.capacity} Einheiten</small></div><span class="num">${eur(CONFIG.bunker.price)}</span>
      <button class="btn sm primary" data-act="bunker" ${S.cash >= CONFIG.bunker.price ? '' : 'disabled'}>Kaufen</button></div></div>`;
  }
  const here = S.bunker.kiez === S.at;
  const rows = goodsForRank().map((g) => `<div class="row"><div class="grow"><strong>${g.name}</strong><small>Am Mann ${S.pocket[g.id]} · im Bunker ${S.bunker.goods[g.id]}</small></div>
      <button class="btn sm" data-act="in:${g.id}" ${here && S.pocket[g.id] ? '' : 'disabled'}>Einlagern</button>
      <button class="btn sm primary" data-act="out:${g.id}" ${here && S.bunker.goods[g.id] ? '' : 'disabled'}>Mitnehmen</button></div>`).join('');
  return `${head('Bunker')}<p class="hint">Versteck in ${kiez(S.bunker.kiez).name}. ${here ? 'Du bist vor Ort.' : 'Fahr hin, um Ware zu holen oder einzulagern.'}</p><div class="list">${rows}</div>`;
}

function pageMap() {
  const line = CONFIG.lines.map(([a, b]) => `<line x1="${kiez(a).x}" y1="${kiez(a).y}" x2="${kiez(b).x}" y2="${kiez(b).y}" stroke="#fff" stroke-width="5" stroke-linecap="round" />`).join('');
  const stops = CONFIG.kieze.map((k) => {
    const here = k.id === S.at;
    return `<g class="stop" data-go="${k.id}">
      <circle cx="${k.x}" cy="${k.y}" r="${here ? 12 : 9}" fill="${here ? '#fff' : '#1f4fd1'}" stroke="#fff" stroke-width="4" />
      <text x="${k.x}" y="${k.y + (k.ly ?? -18)}" text-anchor="middle">${k.name}</text></g>`;
  }).join('');
  const rows = CONFIG.kieze.filter((k) => k.id !== S.at).map((k) => `<button class="item" data-go="${k.id}">
    <span class="code">${k.code}</span><span class="txt"><strong>${k.name}</strong><small>${k.people} · Heat ${Math.round(S.heat[k.id])} %${S.job && S.job.to === k.id ? ' · Auftragsziel' : ''}${S.bunker && S.bunker.kiez === k.id ? ' · dein Bunker' : ''}</small></span><span class="chev">›</span></button>`).join('');
  return `${head('U-Bahn')}<p class="hint">Jede Fahrt kostet eine Tageszeit. Mit Ware am Mann kann es unterwegs Kontrollen geben.</p>
    <div class="map"><svg viewBox="0 0 400 270" role="img" aria-label="Karte von Kreuzberg">${line}${stops}</svg></div>
    <div class="list">${rows}</div>`;
}

function pagePhone() {
  S.phone.forEach((m) => (m.read = true));
  const rows = S.phone.map((m) => `<div class="msg"><small>Tag ${m.day} · ${CONFIG.times[m.time]}</small><b>${m.from}:</b> ${m.body}</div>`).join('');
  save();
  return `${head('Handy')}<div class="list">${rows || '<div class="empty">Keine Nachrichten.</div>'}</div>`;
}

function pageStatus() {
  const steps = CONFIG.ranks.map((r, i) => {
    let need = '';
    if (r.needs && !r.needs.locked) need = [r.needs.rep ? `Ruf ${r.needs.rep}` : '', r.needs.regulars ? `${r.needs.regulars} Stammkunden` : '', r.needs.cash ? eur(r.needs.cash) : ''].filter(Boolean).join(' · ');
    if (r.needs && r.needs.locked) need = 'kommt bald';
    return `<li class="${i === S.rank ? 'now' : r.needs && r.needs.locked ? 'locked' : ''}"><span>${i + 1}. ${r.name}</span><span>${i <= S.rank ? 'erreicht' : need}</span></li>`;
  }).join('');
  return `${head('Aufstieg')}
    <p class="hint">Ruf ${S.rep} · Stammkunden ${regularCount()} · Geld ${eur(S.cash)}</p>
    <ul class="steps">${steps}</ul>
    <p class="hint">Bilanz: ${S.stats.sold} Einheiten verkauft · ${eur(S.stats.earned)} Umsatz · ${S.stats.jobs} Aufträge · ${S.stats.busts}× erwischt</p>
    <button class="btn sm" data-act="reset">Neues Spiel</button>`;
}

const PAGES = { home: pageHome, customers: pageCustomers, jobs: pageJobs, buy: pageBuy, pocket: pagePocket, bunker: pageBunker, map: pageMap, phone: pagePhone, status: pageStatus };

function render() {
  $('clock').textContent = `Tag ${S.day} · ${CONFIG.times[S.time]}`;
  $('s-cash').textContent = eur(S.cash);
  $('s-rep').textContent = S.rep;
  $('s-rank').textContent = rank().short;
  $('s-heat').textContent = `${Math.round(S.heat[S.at])} %`;
  $('heat-fill').style.width = `${S.heat[S.at]}%`;
  $('view').innerHTML = (PAGES[S.page] ?? pageHome)();
}

/* ========== 8. Start ========== */
function save() { try { localStorage.setItem(CONFIG.saveKey, JSON.stringify(S)); } catch { /* privater Modus */ } }
function load() { try { const r = localStorage.getItem(CONFIG.saveKey); return r ? JSON.parse(r) : null; } catch { return null; } }

document.addEventListener('click', (e) => {
  const go = e.target.closest('[data-go]');
  if (go) { travel(go.dataset.go); return; }
  const page = e.target.closest('[data-page]');
  if (page && !page.disabled) { S.page = page.dataset.page; render(); window.scrollTo(0, 0); return; }
  const act = e.target.closest('[data-act]');
  if (!act || act.disabled) return;
  const [a, b, c] = act.dataset.act.split(':');
  if (a === 'sell') sellTo(Number(b));
  if (a === 'job') acceptJob(Number(b));
  if (a === 'buy') buy(b, Number(c));
  if (a === 'bunker') buyBunker();
  if (a === 'in') stash(b, true);
  if (a === 'out') stash(b, false);
  if (a === 'reset' && confirm('Wirklich neu anfangen? Der Spielstand geht verloren.')) {
    try { localStorage.removeItem(CONFIG.saveKey); } catch { /* egal */ }
    location.reload();
  }
});
$('wait').addEventListener('click', () => advanceTime(false));
$('m-ok').addEventListener('click', () => $('modal').classList.add('hidden'));
$('start-btn').addEventListener('click', () => {
  S = newState($('name').value.trim() || 'Kalle');
  rollJobs();
  text('Onkel Flávio', 'Du bist also der Neue. Komm in den Späti in der Oranienstraße. Ich hab Arbeit für dich.');
  save();
  start();
});

function start() {
  $('start').classList.add('hidden');
  $('game').classList.remove('hidden');
  render();
}

S = load();
if (S) start();
else $('start').classList.remove('hidden');
