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
  startCash: 100,
  rent: { every: 7, amount: 80 }, // WG-Zimmer, alle 7 Tage
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
    { name: 'Läufer', short: 'Läufer', pocket: 10, needs: null, unlock: 'Aufträge für Flávio: Ware abholen und ausliefern.' },
    { name: 'Straßendealer', short: 'Dealer', pocket: 15, needs: { rep: 8 }, unlock: 'Eigene Kunden, Einkauf bei Flávio.' },
    { name: 'Kiez-Dealer', short: 'Kiez', pocket: 25, needs: { rep: 30, regulars: 2, cash: 800 }, unlock: 'Bunker (Versteck), Pulver, mehr Platz am Mann.' },
    { name: 'Zwischenhändler', short: 'Händler', pocket: 30, needs: { locked: true }, unlock: 'Andere Dealer beliefern, Fassade – kommt bald.' },
    { name: 'Großhändler', short: 'Groß', pocket: 50, needs: { locked: true }, unlock: 'Ganz Berlin, Lieferanten – kommt bald.' },
    { name: 'Der Boss', short: 'Boss', pocket: 80, needs: { locked: true }, unlock: 'Die Stadt gehört dir – kommt bald.' },
  ],
  bunker: { price: 700, capacity: 60 },
  graceDays: 3, // in den ersten Tagen gibt es keine Kontrollen
  // Taschen: dauerhaft mehr Platz am Mann (zusätzlich zum Rang)
  bags: [
    { id: 'none', name: 'Jackentaschen', bonus: 0, price: 0 },
    { id: 'belt', name: 'Bauchtasche', bonus: 5, price: 60 },
    { id: 'backpack', name: 'Rucksack', bonus: 12, price: 180 },
    { id: 'sport', name: 'Sporttasche', bonus: 25, price: 450 },
    { id: 'trolley', name: 'Rollkoffer mit Geheimfach', bonus: 40, price: 1100 },
  ],
  // Waffen: schützen vor Überfällen, brauchen Platz – bei einer Polizeikontrolle gibt es dafür richtig Ärger
  weapons: [
    { id: 'spray', name: 'Pfefferspray', slots: 1, defense: 0.4, fine: 60, price: 40 },
    { id: 'bat', name: 'Baseballschläger', slots: 4, defense: 0.6, fine: 150, price: 90 },
    { id: 'blank', name: 'Schreckschusspistole', slots: 2, defense: 0.8, fine: 400, price: 350 },
  ],
  arrestAt: 15, // ab so vielen Einheiten am Mann wird man festgenommen
  heatDecay: 15, // pro Tag in jedem Kiez
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
    tips: true, // Tutor-Hinweise auf der Startseite
    bag: 0, // Index in CONFIG.bags
    gear: [], // gekaufte Waffen (IDs)
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
const goodsCarried = () => Object.values(S.pocket).reduce((a, b) => a + b, 0) + (S.job ? S.job.units : 0);
const weapon = (id) => CONFIG.weapons.find((w) => w.id === id);
const gearSlots = () => (S.gear ?? []).reduce((a, id) => a + weapon(id).slots, 0);
const carried = () => goodsCarried() + gearSlots();
const bag = () => CONFIG.bags[S.bag ?? 0];
const capacity = () => rank().pocket + bag().bonus;
const pocketFree = () => capacity() - carried();
const defense = () => Math.max(0, ...(S.gear ?? []).map((id) => weapon(id).defense));
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
    return { to: to.id, units, pay: Math.round(25 + units * rnd(6, 10) + to.police * 10) };
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
  S.heat[S.at] = clamp(S.heat[S.at] + c.units * g.heat * 0.7 * kiez(S.at).police * (c.regular ? 0.5 : 1), 0, 100);
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

function buyBag(i) {
  const b = CONFIG.bags[i];
  if (!b || i <= (S.bag ?? 0) || S.cash < b.price) return;
  S.cash -= b.price;
  S.bag = i;
  text('Kiez-Laden', `${b.name} gekauft – jetzt passen ${capacity()} Einheiten an den Mann.`);
  save(); render();
}

function buyWeapon(id) {
  const w = weapon(id);
  if (!w || (S.gear ?? []).includes(id) || S.cash < w.price || pocketFree() < w.slots) return;
  S.cash -= w.price;
  S.gear = [...(S.gear ?? []), id];
  save(); render();
}

function dropWeapon(id) {
  if (!(S.gear ?? []).includes(id)) return;
  S.gear = S.gear.filter((x) => x !== id);
  S.cash += Math.round(weapon(id).price * 0.4);
  save(); render();
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
    showModal(`Aufstieg: ${next.name}`, `<p>${next.unlock}</p><p>Platz am Mann jetzt: ${capacity()} Plätze.</p>`);
    if (S.rank >= 1 && !S.customers.length) rollCustomers();
  }
}

/* ========== 6. Zeit ========== */
function advanceTime(traveled = false) {
  const report = [];
  // Kontrolle: je heißer der Kiez, desto eher. Nachts mehr Streifen.
  const chance = S.day <= CONFIG.graceDays ? 0 : clamp((S.heat[S.at] / 300) * kiez(S.at).police + (S.time === 2 ? 0.02 : 0) + (traveled ? 0.01 : 0), 0, 0.4);
  const controlled = Math.random() < chance;
  if (controlled) {
    const units = goodsCarried();
    const armed = (S.gear ?? []).length > 0;
    if (armed) {
      const wfine = Math.min(Math.max(0, S.cash), (S.gear).reduce((a, id) => a + weapon(id).fine, 0));
      S.cash -= wfine;
      report.push(`Bei der Kontrolle finden sie ${S.gear.map((id) => weapon(id).name).join(' und ')}. Eingezogen, ${eur(wfine)} Strafe.`);
      S.gear = [];
      S.heat[S.at] = clamp(S.heat[S.at] + 10, 0, 100);
    }
    if (units === 0) {
      if (!armed) report.push(`Polizeikontrolle in ${kiez(S.at).name}. Du warst sauber – sie lassen dich gehen.`);
    } else {
      const fine = Math.min(Math.max(0, S.cash), 15 * units);
      S.cash -= fine;
      for (const g of Object.keys(S.pocket)) S.pocket[g] = 0;
      if (S.job) {
        report.push('Flávios Ware ist weg. Er ist nicht begeistert (Ruf −5).');
        S.rep = Math.max(0, S.rep - 5);
        S.job = null;
      }
      S.heat[S.at] = clamp(S.heat[S.at] + 15, 0, 100);
      S.stats.busts++;
      if (units >= CONFIG.arrestAt || armed) {
        S.day += 1;
        S.time = 0;
        report.push(`Festnahme! ${units} Einheiten beschlagnahmt${armed ? ' – mit Waffe dabei' : ''}, ${eur(fine)} Kaution, ein Tag in Gewahrsam.`);
      } else {
        report.push(`Polizeikontrolle! ${units} Einheiten beschlagnahmt, ${eur(fine)} weg.`);
      }
    }
  }
  // Überfall: Wer viel Ware oder Geld dabei hat, wird nachts eher abgezogen.
  const loot = goodsCarried() > 0 || S.cash > 200;
  const robChance = controlled || S.day <= CONFIG.graceDays || !loot ? 0 : (S.time === 2 ? 0.09 : 0.04) + Math.min(0.06, goodsCarried() / 300);
  if (Math.random() < robChance) {
    if (Math.random() < defense()) {
      S.rep += 2;
      report.push('Zwei Typen wollen dich abziehen – du wehrst dich und sie hauen ab (Ruf +2).');
    } else {
      const lostCash = Math.round(Math.max(0, S.cash) * 0.3);
      let lostUnits = 0;
      for (const g of Object.keys(S.pocket)) { const n = Math.ceil(S.pocket[g] / 2); lostUnits += n; S.pocket[g] -= n; }
      S.cash -= lostCash;
      report.push(`Überfall! Sie nehmen dir ${lostUnits} Einheiten und ${eur(lostCash)} ab.${(S.gear ?? []).length ? ' Deine Waffe hat nicht gereicht.' : ' Mit einer Waffe aus dem Laden wärst du besser geschützt.'}`);
    }
  }
  if (S.job && S.at === S.job.to) finishJob();

  S.time++;
  if (S.time > 2) {
    S.time = 0;
    newDay(report);
  }
  rollCustomers();
  const trouble = report.some((r) => /beschlagnahmt|Festnahme|Überfall|Eingezogen/.test(r));
  if (report.length) showModal(trouble ? 'Ärger' : 'Unterwegs', report.map((r) => `<p>${r}</p>`).join(''), trouble);
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

let HL = null; // vom Tutor hervorgehobene Abteilung
const item = (page, code, title, sub, meta = '', disabled = false) =>
  `<button class="item ${HL === page ? 'hl' : ''}" data-page="${page}" ${disabled ? 'disabled' : ''}>
    <span class="code">${code}</span><span class="txt"><strong>${title}</strong><small>${sub}</small></span>
    <span class="meta">${meta}</span><span class="chev">›</span></button>`;
const head = () => ''; // Titel steht in der Navigationsleiste der App

/** Tutor: Was ist jetzt der sinnvollste nächste Schritt? Gibt Text und die Abteilung zurück, die hervorgehoben wird. */
function nextStep() {
  const here = S.at === CONFIG.flavioAt;
  const goods = Object.values(S.pocket).reduce((a, b) => a + b, 0);
  if (S.job) return S.at === S.job.to ? ['Lieferung läuft – tipp auf „Abwarten“.', null] : [`Fahr mit der U-Bahn nach ${kiez(S.job.to).name}, um Flávios Ware abzuliefern.`, 'map'];
  if (S.heat[S.at] >= 50 && goods) return [`In ${kiez(S.at).name} ist es heiß (${Math.round(S.heat[S.at])} %). Fahr in einen ruhigeren Kiez, bevor du verkaufst.`, 'map'];
  if (S.rank === 0) {
    if (!here) return ['Fahr mit der U-Bahn zur Oranienstraße – dort hat Flávio Arbeit für dich.', 'map'];
    if (S.jobs.length) return [`Öffne die App „Aufträge“ und nimm einen an. Noch ${CONFIG.ranks[1].needs.rep - S.rep} Ruf bis zum Straßendealer.`, 'jobs'];
    return ['Heute keine Aufträge mehr. Tipp auf „Abwarten“ unten im Dock – morgen gibt es neue.', null];
  }
  if (goods === 0) return here ? ['Öffne die App „Flávio“ und kauf Ware ein – am besten Kraut, das wollen viele.', 'buy'] : ['Du hast nichts zum Verkaufen. Fahr zur Oranienstraße und kauf bei Flávio ein.', 'map'];
  if (S.customers.some((c) => !c.done && S.pocket[c.good] >= c.units)) return ['Kunden warten! Öffne die App „Kunden“ und verkauf.', 'customers'];
  const nextBag = CONFIG.bags[(S.bag ?? 0) + 1];
  if (S.rank >= 1 && nextBag && S.cash >= nextBag.price + 60 && pocketFree() <= 2) return [`Deine Taschen sind voll. Im Laden gibt es eine ${nextBag.name} (+${nextBag.bonus} Platz).`, 'shop'];
  if (S.rank >= 2 && !S.bunker && S.cash >= CONFIG.bunker.price) return ['Kauf dir einen Bunker, damit nicht alles am Mann ist.', 'bunker'];
  const want = S.customers.find((c) => !c.done);
  if (want) return [`Die Kunden hier wollen ${good(want.good).name} (${want.units}×) – das hast du nicht genug dabei. Abwarten oder beim nächsten Einkauf mitnehmen.`, null];
  return ['Gerade passt kein Kunde. Abwarten (nachts kommen mehr) oder in einen anderen Kiez fahren – im Görli und am Kotti ist am meisten los.', null];
}

/** Linien-Symbole für die Apps (eigene Zeichnungen). */
const ICONS = {
  customers: '<circle cx="9" cy="8" r="3"/><path d="M3 20c0-4 3-6 6-6s6 2 6 6"/><circle cx="16.5" cy="9" r="2.5"/><path d="M16 14c3 0 5 2 5 5"/>',
  jobs: '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4h6v3H9zM8 11h8M8 15h6"/>',
  buy: '<path d="M5 8h14l-1.2 12H6.2z"/><path d="M9 8a3 3 0 0 1 6 0"/>',
  shop: '<path d="M4 9h16l-1 11H5z"/><path d="M3 9l2-5h14l2 5M9 13h6"/>',
  pocket: '<rect x="6" y="7" width="12" height="14" rx="3"/><path d="M9 7V5a3 3 0 0 1 6 0v2M9 13h6"/>',
  bunker: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3M12 15v2"/>',
  map: '<rect x="6" y="3" width="12" height="14" rx="3"/><path d="M6 11h12M8 21l2-3M16 21l-2-3"/><circle cx="9" cy="14" r=".6"/><circle cx="15" cy="14" r=".6"/>',
  phone: '<path d="M4 5h16v11H9l-5 4z"/><path d="M8 9h8M8 12h5"/>',
  status: '<path d="M4 20V11M10 20V5M16 20v-7M3 20h18"/>',
  wait: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1 .8-1 1.7"/><circle cx="12" cy="17" r=".6"/>',
};
/** Apps auf dem Startbildschirm: Seite, Name, Farbe, Zähler, gesperrt? */
function apps() {
  return [
    { page: 'jobs', name: 'Aufträge', color: '#ffa53b,#d9661a', badge: S.job ? '1' : S.rank === 0 && S.at === CONFIG.flavioAt ? S.jobs.length : 0 },
    { page: 'buy', name: 'Flávio', color: '#ff5f5f,#c0262f', off: S.rank < 1 },
    { page: 'pocket', name: 'Am Mann', color: '#9a7bff,#5a37c9', badge: carried() },
    { page: 'shop', name: 'Laden', color: '#ff7ab6,#c22b74' },
    { page: 'bunker', name: 'Bunker', color: '#8f99a8,#4b5563', off: S.rank < 2 },
    { page: 'status', name: 'Aufstieg', color: '#f3c84a,#c08a10' },
    { page: 'help', name: 'Hilfe', color: '#36c6d3,#118a96' },
  ];
}
const DOCK = () => [
  { page: 'phone', name: 'Nachrichten', color: '#5ee07a,#1f9e40', badge: unread() },
  { page: 'map', name: 'U-Bahn', color: '#5b84f0,#1f3fa8' },
  { page: 'wait', name: 'Abwarten', color: '#4a4f59,#15171b' },
  { page: 'customers', name: 'Kunden', color: '#3fbf5f,#1b7f39', badge: S.customers.filter((c) => !c.done).length, off: S.rank < 1 },
];
const TITLES = { shop: 'Kiez-Laden', customers: 'Kunden', jobs: 'Aufträge', buy: 'Einkauf bei Flávio', pocket: 'Am Mann', bunker: 'Bunker', map: 'U-Bahn', phone: 'Nachrichten', status: 'Aufstieg' };

function appIcon(a) {
  const [c1, c2] = a.color.split(',');
  const act = a.page === 'wait' ? 'data-act="wait"' : a.page === 'help' ? 'data-act="intro"' : `data-page="${a.page}"`;
  return `<button class="app ${HL === a.page ? 'hl' : ''}" ${act} ${a.off ? 'disabled' : ''}>
    <span class="icon" style="background:linear-gradient(${c1},${c2})"><svg viewBox="0 0 24 24">${ICONS[a.page]}</svg></span>
    ${a.badge ? `<span class="badge-red">${a.badge}</span>` : ''}<span>${a.name}</span></button>`;
}

function pageHome() {
  const k = kiez(S.at);
  const [tip, target] = S.tips ? nextStep() : [null, null];
  HL = target;
  const push = tip ? `<button class="push" ${target ? `data-page="${target}"` : 'data-act="wait"'}><span class="pi">F</span>
    <span><small>Tipp · Nächster Schritt</small>${tip}</span></button>` : '';
  return `<div class="springboard">
    <div class="widget">
      <small>Standort</small><strong>${k.name}</strong>
      <div class="wstats">
        <div><span>Geld</span><b>${eur(S.cash)}</b></div><div><span>Ruf</span><b>${S.rep}</b></div>
        <div><span>Rang</span><b>${rank().short}</b></div><div><span>Heat</span><b>${Math.round(S.heat[S.at])} %</b></div>
      </div>
      <div class="wheat"><i style="width:${S.heat[S.at]}%"></i></div>
    </div>
    ${push}
    <div class="apps">${apps().map(appIcon).join('')}</div>
    <div class="dock">${DOCK().map(appIcon).join('')}</div>
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

function pageShop() {
  const bags = CONFIG.bags.slice(1).map((b, j) => {
    const i = j + 1;
    const owned = (S.bag ?? 0) >= i;
    return `<div class="row"><div class="grow"><strong>${b.name}</strong>${(S.bag ?? 0) === i ? '<span class="badge">dabei</span>' : ''}<small>+${b.bonus} Plätze am Mann (dauerhaft)</small></div>
      <span class="num">${owned ? '' : eur(b.price)}</span>
      ${owned ? `<span class="good">${(S.bag ?? 0) === i ? 'Dabei' : 'Ersetzt'}</span>` : `<button class="btn sm primary" data-act="bag:${i}" ${S.cash >= b.price && i === (S.bag ?? 0) + 1 ? '' : 'disabled'}>Kaufen</button>`}</div>`;
  }).join('');
  const weapons = CONFIG.weapons.map((w) => {
    const owned = (S.gear ?? []).includes(w.id);
    return `<div class="row"><div class="grow"><strong>${w.name}</strong>${owned ? '<span class="badge">dabei</span>' : ''}<small>Schutz ${Math.round(w.defense * 100)} % · braucht ${w.slots} Platz · bei Kontrolle ${eur(w.fine)} Strafe</small></div>
      <span class="num">${owned ? '' : eur(w.price)}</span>
      ${owned ? `<button class="btn sm" data-act="drop:${w.id}">Loswerden (+${eur(Math.round(w.price * 0.4))})</button>` : `<button class="btn sm primary" data-act="weapon:${w.id}" ${S.cash >= w.price && pocketFree() >= w.slots ? '' : 'disabled'}>Kaufen</button>`}</div>`;
  }).join('');
  return `<p class="hint">Platz am Mann: ${carried()} von ${capacity()} (${rank().pocket} durch deinen Rang, +${bag().bonus} durch ${bag().name}).</p>
    <h3 class="sub">Taschen</h3><div class="list">${bags}</div>
    <h3 class="sub">Schutz</h3><p class="hint">Waffen helfen gegen Überfälle – es zählt die beste. Aber: Findet die Polizei eine Waffe, wird sie eingezogen und du wirst festgenommen, wenn du auch Ware dabei hast.</p>
    <div class="list">${weapons}</div>`;
}

function pagePocket() {
  const rows = CONFIG.goods.filter((g) => S.pocket[g.id] > 0).map((g) => `<div class="row"><div class="grow"><strong>${g.name}</strong><small>Straßenwert hier ca. ${eur(streetPrice(g.id))} pro Einheit</small></div><span class="num">${S.pocket[g.id]}</span></div>`).join('');
  const job = S.job ? `<div class="row"><div class="grow"><strong>Flávios Ware</strong><small>Auftrag nach ${kiez(S.job.to).name}</small></div><span class="num">${S.job.units}</span></div>` : '';
  const gear = (S.gear ?? []).map((id) => `<div class="row"><div class="grow"><strong>${weapon(id).name}</strong><small>Schutz ${Math.round(weapon(id).defense * 100)} %</small></div><span class="num">${weapon(id).slots} Platz</span></div>`).join('');
  return `${head('Am Mann')}<p class="hint">${carried()} von ${capacity()} Plätzen · Tasche: ${bag().name}. Bei einer Kontrolle ist alles weg – ab ${CONFIG.arrestAt} Einheiten gibt es eine Festnahme.</p>
    <div class="list">${job}${rows}${gear}${job || rows || gear ? '' : '<div class="empty">Nichts dabei. Sauber.</div>'}</div>`;
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
    <div class="list"><div class="row"><div class="grow"><strong>Tipps</strong><small>„Nächster Schritt“ auf der Startseite</small></div>
      <button class="btn sm ${S.tips ? 'primary' : ''}" data-act="tips">${S.tips ? 'An' : 'Aus'}</button>
      <button class="btn sm" data-act="intro">Einführung</button></div></div>
    <button class="btn sm" data-act="reset">Neues Spiel</button>`;
}

const PAGES = { shop: pageShop, home: pageHome, customers: pageCustomers, jobs: pageJobs, buy: pageBuy, pocket: pagePocket, bunker: pageBunker, map: pageMap, phone: pagePhone, status: pageStatus };

function render() {
  $('clock').textContent = `Tag ${S.day} · ${CONFIG.times[S.time]}`;
  if (S.page === 'home' || !PAGES[S.page]) {
    $('view').innerHTML = pageHome();
    return;
  }
  $('view').innerHTML = `<div class="navbar"><button class="nav-back" data-page="home">‹ Home</button><h2>${TITLES[S.page] ?? ''}</h2></div>
    <div class="app-body">${PAGES[S.page]()}</div>`;
}

/* ========== 8. Start ========== */
function save() { try { localStorage.setItem(CONFIG.saveKey, JSON.stringify(S)); } catch { /* privater Modus */ } }
function load() { try { const r = localStorage.getItem(CONFIG.saveKey); return r ? JSON.parse(r) : null; } catch { return null; } }

document.addEventListener('click', (e) => {
  const go = e.target.closest('[data-go]');
  if (go) { travel(go.dataset.go); return; }
  const page = e.target.closest('[data-page]');
  if (page && !page.disabled) { S.page = page.dataset.page; render(); $('view').scrollTop = 0; return; }
  const act = e.target.closest('[data-act]');
  if (!act || act.disabled) return;
  const [a, b, c] = act.dataset.act.split(':');
  if (a === 'sell') sellTo(Number(b));
  if (a === 'job') acceptJob(Number(b));
  if (a === 'buy') buy(b, Number(c));
  if (a === 'bunker') buyBunker();
  if (a === 'in') stash(b, true);
  if (a === 'out') stash(b, false);
  if (a === 'wait') { advanceTime(false); return; }
  if (a === 'bag') buyBag(Number(b));
  if (a === 'weapon') buyWeapon(b);
  if (a === 'drop') dropWeapon(b);
  if (a === 'tips') { S.tips = !S.tips; save(); render(); }
  if (a === 'intro') intro();
  if (a === 'reset' && confirm('Wirklich neu anfangen? Der Spielstand geht verloren.')) {
    try { localStorage.removeItem(CONFIG.saveKey); } catch { /* egal */ }
    location.reload();
  }
});

$('m-ok').addEventListener('click', () => $('modal').classList.add('hidden'));
$('start-btn').addEventListener('click', () => {
  S = newState($('name').value.trim() || 'Kalle');
  rollJobs();
  text('Onkel Flávio', 'Du bist also der Neue. Komm in den Späti in der Oranienstraße. Ich hab Arbeit für dich.');
  save();
  start();
  intro();
});

/** Kurze Einführung beim ersten Start (und jederzeit unter „Aufstieg“). */
function intro() {
  showModal('So läuft es', `
    <p><b>1. Arbeite für Flávio.</b> In der Oranienstraße gibt es Aufträge: Ware abholen, mit der U-Bahn in einen anderen Kiez bringen, Geld und Ruf kassieren.</p>
    <p><b>2. Werde Dealer.</b> Ab ${CONFIG.ranks[1].needs.rep} Ruf kaufst du bei Flávio selbst ein und verkaufst an Kunden – nachts kommen die meisten.</p>
    <p><b>3. Bleib unter dem Radar.</b> Jeder Verkauf macht den Kiez heißer. Ist es heiß, fahr woanders hin. Bei einer Kontrolle ist die Ware am Mann weg.</p>
    <p><b>4. Werde größer.</b> Stammkunden, Bunker, mehr Ware – die Stufen siehst du unter „Aufstieg“.</p>
    <p>Die ersten ${CONFIG.graceDays} Tage gibt es keine Kontrollen. Die Mitteilung oben auf dem Startbildschirm sagt dir immer, was du als Nächstes tun kannst – die passende App leuchtet. Mit dem runden Knopf kommst du immer zurück.</p>`);
}

function start() {
  $('start').classList.add('hidden');
  $('view').classList.remove('hidden');
  render();
}

S = load();
if (S && S.tips === undefined) S.tips = true;
if (S && S.bag === undefined) { S.bag = 0; S.gear = []; }
if (S) start();
else $('start').classList.remove('hidden');
