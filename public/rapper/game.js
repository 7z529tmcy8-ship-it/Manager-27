/* =========================================================
   Homestudio Hustle – Rapper-Karriere-Simulator
   ---------------------------------------------------------
   Aufbau dieser Datei:
     1. CONFIG        – alle Spielwerte zum Anpassen
     2. Spielstand    – was gespeichert wird
     3. Hilfsfunktionen
     4. Aktionen      – Song, Nebenjob, Studio, Auftritt
     5. Woche beenden – Streams, Ereignis, Charts
     6. Ereignisse    – die Zufallsereignisse
     7. Charts        – erfundene Konkurrenz-Songs
     8. Speichern / Laden
     9. Anzeige       – alles auf den Bildschirm bringen
    10. Start         – Buttons verbinden und loslegen
   ========================================================= */

/* =========================================================
   1. CONFIG – hier kannst du das Spiel verändern
   ========================================================= */
const CONFIG = {
  gameName: 'Homestudio Hustle',
  saveKey: 'homestudio-hustle-v1', // Name des Speicherplatzes im Browser

  // Werte zu Spielbeginn
  start: { money: 100, fans: 10, reputation: 0, studioLevel: 1 },
  maxEnergy: 100,
  maxReputation: 100,

  // Song aufnehmen
  record: {
    energy: 35,          // kostet so viel Energie
    minQuality: 5,       // Zufallsteil der Qualität: von …
    maxQuality: 45,      // … bis
    qualityPerStudio: 6, // jedes Studio-Level macht Songs um so viel besser
    qualityCap: 100,
  },

  // Nebenjob
  job: { energy: 30, money: 70 },

  // Studio upgraden: Preis = basePrice × priceFactor^(Level − 1)
  studio: { basePrice: 200, priceFactor: 2, maxLevel: 10 },

  // Auftritt
  gig: {
    energy: 45,
    minFans: 100,        // so viele Fans braucht man mindestens
    moneyPerFan: 0.6,    // Gage pro Fan (mit etwas Zufall)
    fanGainPercent: 6,   // neue Fans in Prozent der aktuellen Fans
    reputation: 1,
  },

  // Streams pro Woche
  streams: {
    perQuality: 25,      // Startstreams = Qualität × perQuality × Fan-Faktor
    fanFactor: 300,      // je 300 Fans verdoppelt sich die Reichweite ungefähr
    decay: 0.78,         // jede Woche bleiben nur 78 % der Streams übrig
    minimum: 3,          // darunter ist ein Song „tot“
    moneyPerStream: 0.01, // 100 Streams = 1 €
    streamsPerFan: 120,  // so viele Streams bringen einen neuen Fan
  },

  // Ruf steigt mit guten Songs
  goodSongQuality: 70,
  goodSongReputation: 3,

  // Charts
  charts: { size: 10, fakeSongs: 16 },
};

/* =========================================================
   2. Spielstand – alles, was gespeichert wird
   ========================================================= */
let state = null; // wird beim Start geladen oder neu erzeugt

function newState(rapperName) {
  return {
    rapper: rapperName,
    week: 1,
    money: CONFIG.start.money,
    fans: CONFIG.start.fans,
    reputation: CONFIG.start.reputation,
    energy: CONFIG.maxEnergy,
    studioLevel: CONFIG.start.studioLevel,
    songs: [],            // meine Songs
    fakeSongs: createFakeSongs(CONFIG.charts.fakeSongs),
    lastChart: {},        // Platzierungen dieser Woche
    prevChart: {},        // Platzierungen der Vorwoche (für ▲/▼)
    log: [],              // letzte Meldungen
    nextSongBonus: 0,     // Bonus-Qualität für den nächsten Song (aus Ereignissen)
    energyPenalty: 0,     // weniger Energie nächste Woche (aus Ereignissen)
    nextId: 1,
  };
}

/* =========================================================
   3. Hilfsfunktionen
   ========================================================= */

/** Zufallszahl zwischen min und max (Ganzzahl, beide inklusive). */
function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** Zufallszahl mit Komma zwischen min und max. */
function rand(min, max) {
  return Math.random() * (max - min) + min;
}

/** Ein zufälliges Element aus einer Liste. */
function pick(list) {
  return list[Math.floor(Math.random() * list.length)];
}

/** Wert zwischen min und max halten. */
function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

/** Zahl hübsch formatieren: 12345 → „12.345“. */
function fmt(n) {
  return Math.round(n).toLocaleString('de-DE');
}

/** Geld formatieren: 1234 → „1.234 €“. */
function money(n) {
  return fmt(n) + ' €';
}

/** Preis für das nächste Studio-Upgrade. */
function studioPrice() {
  return CONFIG.studio.basePrice * Math.pow(CONFIG.studio.priceFactor, state.studioLevel - 1);
}

/** Wie viele Streams ein neuer Song mit dieser Qualität am Anfang bekommt. */
function startStreams(quality) {
  const fanBoost = 1 + state.fans / CONFIG.streams.fanFactor;
  return Math.round(quality * CONFIG.streams.perQuality * fanBoost * rand(0.8, 1.2));
}

/** Meldung oben in die Liste „Was zuletzt passiert ist“ schreiben. */
function addLog(text, tone) {
  state.log.unshift({ text: text, tone: tone || '', week: state.week });
  state.log = state.log.slice(0, 12); // nur die letzten 12 behalten
}

/** Prüft, ob genug Energie da ist. Wenn nicht: Meldung zeigen. */
function hasEnergy(cost) {
  if (state.energy >= cost) return true;
  showToast('😴 Zu müde! Beende die Woche, um Energie zu tanken.');
  return false;
}

/* =========================================================
   4. Aktionen
   ========================================================= */

/** Song aufnehmen: Qualität = Zufall + Studio-Level (+ evtl. Bonus aus Ereignissen). */
function recordSong(title) {
  if (!hasEnergy(CONFIG.record.energy)) return;
  const c = CONFIG.record;
  const quality = clamp(
    randInt(c.minQuality, c.maxQuality) + state.studioLevel * c.qualityPerStudio + state.nextSongBonus,
    1,
    c.qualityCap,
  );
  state.nextSongBonus = 0;
  state.energy -= c.energy;

  const song = {
    id: state.nextId++,
    title: title,
    quality: quality,
    week: state.week,
    streams: startStreams(quality), // Streams, die der Song in der kommenden Woche bringt
    lastStreams: 0,                 // Streams der letzten Woche (für die Charts)
    totalStreams: 0,
  };
  state.songs.unshift(song);

  if (quality >= CONFIG.goodSongQuality) {
    state.reputation = clamp(state.reputation + CONFIG.goodSongReputation, 0, CONFIG.maxReputation);
  }
  addLog('🎙️ „' + title + '“ aufgenommen – Qualität ' + quality + '.', quality >= CONFIG.goodSongQuality ? 'good' : '');
  showToast('🔥 Neuer Song! Qualität ' + quality);
  justAddedSongId = song.id;
  saveAndRender();
}

/** Nebenjob: sicheres Geld, kostet Energie. */
function doJob() {
  if (!hasEnergy(CONFIG.job.energy)) return;
  state.energy -= CONFIG.job.energy;
  state.money += CONFIG.job.money;
  addLog('🍔 Schicht im Imbiss: +' + money(CONFIG.job.money) + '.', '');
  showToast('+' + money(CONFIG.job.money));
  bump('stat-money');
  saveAndRender();
}

/** Studio upgraden: kostet Geld, macht künftige Songs besser. */
function upgradeStudio() {
  if (state.studioLevel >= CONFIG.studio.maxLevel) {
    showToast('🏆 Dein Studio ist schon auf dem höchsten Level.');
    return;
  }
  const price = studioPrice();
  if (state.money < price) {
    showToast('💸 Dir fehlen noch ' + money(price - state.money) + '.');
    return;
  }
  state.money -= price;
  state.studioLevel += 1;
  addLog('🎛️ Studio auf Level ' + state.studioLevel + ' aufgerüstet.', 'good');
  showToast('🎛️ Studio-Level ' + state.studioLevel + '!');
  saveAndRender();
}

/** Auftritt: bringt Fans und Geld, braucht aber schon ein paar Fans. */
function doGig() {
  const g = CONFIG.gig;
  if (state.fans < g.minFans) {
    showToast('🎤 Du brauchst mindestens ' + fmt(g.minFans) + ' Fans für einen Auftritt.');
    return;
  }
  if (!hasEnergy(g.energy)) return;
  const gage = Math.round(state.fans * g.moneyPerFan * rand(0.7, 1.3));
  const newFans = Math.round(state.fans * (g.fanGainPercent / 100) * rand(0.6, 1.4)) + 5;
  state.energy -= g.energy;
  state.money += gage;
  state.fans += newFans;
  state.reputation = clamp(state.reputation + g.reputation, 0, CONFIG.maxReputation);
  addLog('🎤 Auftritt! +' + money(gage) + ', +' + fmt(newFans) + ' Fans.', 'good');
  showToast('🎤 Die Crowd eskaliert!');
  bump('stat-fans');
  saveAndRender();
}

/* =========================================================
   5. Woche beenden
   ========================================================= */
function endWeek() {
  // a) Alle Songs bringen Streams → Geld und Fans
  let weekStreams = 0;
  state.songs.forEach(function (song) {
    song.lastStreams = song.streams;
    song.totalStreams += song.streams;
    weekStreams += song.streams;
    // danach sinken die Streams langsam (mit etwas Zufall)
    song.streams = Math.round(song.streams * CONFIG.streams.decay * rand(0.9, 1.1));
    if (song.streams < CONFIG.streams.minimum) song.streams = 0;
  });
  const earned = Math.round(weekStreams * CONFIG.streams.moneyPerStream);
  const newFans = Math.round(weekStreams / CONFIG.streams.streamsPerFan);
  state.money += earned;
  state.fans += newFans;

  // b) Konkurrenz in den Charts entwickelt sich weiter
  updateFakeSongs();

  // c) Ein Zufallsereignis
  const event = randomEvent();

  // d) Neue Woche: Energie wieder voll (minus Strafe aus Ereignissen)
  state.week += 1;
  state.energy = CONFIG.maxEnergy - state.energyPenalty;
  state.energyPenalty = 0;

  // e) Charts berechnen und Platzierungen merken
  const chart = buildChart();
  const myBest = chart.findIndex(function (row) { return row.mine; });
  state.prevChart = state.lastChart; // Vorwoche merken, damit die Pfeile ▲/▼ stimmen
  state.lastChart = {};
  chart.forEach(function (row, i) { state.lastChart[row.key] = i + 1; });

  addLog('📅 Woche ' + (state.week - 1) + ': ' + fmt(weekStreams) + ' Streams, +' + money(earned) + ', +' + fmt(newFans) + ' Fans.', '');
  addLog(event.title + ' ' + event.text, event.tone);

  saveAndRender();
  showWeekOverlay(weekStreams, earned, newFans, event, myBest >= 0 ? myBest + 1 : null);
}

/* =========================================================
   6. Ereignisse – jede Woche passiert genau eins
   ---------------------------------------------------------
   Jedes Ereignis hat:
     title  – Überschrift mit Emoji
     tone   – 'good', 'bad' oder '' (neutral)
     when   – (optional) nur möglich, wenn diese Bedingung stimmt
     apply  – verändert den Spielstand und gibt den Text zurück
   ========================================================= */

/** Ein zufälliger eigener Song, der noch läuft (oder null). */
function liveSong() {
  const alive = state.songs.filter(function (s) { return s.streams > 0; });
  return alive.length ? pick(alive) : null;
}

const EVENTS = [
  {
    title: '🚀 Viral!', tone: 'good',
    when: function () { return liveSong() !== null; },
    apply: function () {
      const s = liveSong();
      s.streams *= 4;
      return '„' + s.title + '“ geht auf Social Media durch die Decke – Streams ×4!';
    },
  },
  {
    title: '🥊 Beef', tone: '',
    apply: function () {
      const fans = Math.round(state.fans * 0.08) + 10;
      state.fans += fans;
      state.reputation = clamp(state.reputation - 2, 0, CONFIG.maxReputation);
      return 'Ein anderer Rapper disst dich in einer Story. Drama bringt ' + fmt(fans) + ' neue Fans, kostet aber etwas Ruf.';
    },
  },
  {
    title: '💻 Laptop kaputt', tone: 'bad',
    apply: function () {
      const cost = Math.min(state.money, 150);
      state.money -= cost;
      return 'Kaffee über die Tastatur. Reparatur: ' + money(cost) + '.';
    },
  },
  {
    title: '📻 Radio-Play', tone: 'good',
    apply: function () {
      const fans = randInt(30, 80) + Math.round(state.reputation * 2);
      state.fans += fans;
      return 'Ein Lokalradio spielt deinen Song. +' + fmt(fans) + ' Fans.';
    },
  },
  {
    title: '🎹 Beat geschenkt', tone: 'good',
    apply: function () {
      state.nextSongBonus += 15;
      return 'Ein Producer schickt dir einen Hammer-Beat. Dein nächster Song wird +15 besser.';
    },
  },
  {
    title: '🤒 Krank', tone: 'bad',
    apply: function () {
      state.energyPenalty = 40;
      return 'Erkältung erwischt. Nächste Woche hast du 40 Energie weniger.';
    },
  },
  {
    title: '🌪️ Shitstorm', tone: 'bad',
    when: function () { return state.fans > 50; },
    apply: function () {
      const lost = Math.round(state.fans * 0.06);
      state.fans -= lost;
      state.reputation = clamp(state.reputation - 4, 0, CONFIG.maxReputation);
      return 'Ein alter Tweet taucht wieder auf. −' + fmt(lost) + ' Fans, −4 Ruf.';
    },
  },
  {
    title: '🤝 Feature-Anfrage', tone: 'good',
    when: function () { return state.reputation >= 5; },
    apply: function () {
      const pay = 150 + state.reputation * 10;
      state.money += pay;
      state.fans += 40;
      return 'Ein Rapper will dich auf seinem Track. +' + money(pay) + ', +40 Fans.';
    },
  },
  {
    title: '📋 Playlist-Platz', tone: 'good',
    when: function () { return liveSong() !== null; },
    apply: function () {
      const s = liveSong();
      s.streams *= 2;
      return '„' + s.title + '“ landet in einer großen Playlist. Streams ×2!';
    },
  },
  {
    title: '🏠 Nachbarn genervt', tone: 'bad',
    apply: function () {
      const fine = Math.min(state.money, 60);
      state.money -= fine;
      return 'Zu laute Bässe um 3 Uhr nachts. Strafe: ' + money(fine) + '.';
    },
  },
  {
    title: '👕 Merch verkauft', tone: 'good',
    when: function () { return state.fans >= 50; },
    apply: function () {
      const earned = Math.round(state.fans * 0.3);
      state.money += earned;
      return 'Deine Shirts sind ausverkauft. +' + money(earned) + '.';
    },
  },
  {
    title: '🎧 Podcast-Interview', tone: 'good',
    apply: function () {
      state.reputation = clamp(state.reputation + 4, 0, CONFIG.maxReputation);
      state.fans += 25;
      return 'Du warst Gast in einem Podcast. +4 Ruf, +25 Fans.';
    },
  },
  {
    title: '✍️ Ghostwriting', tone: '',
    apply: function () {
      state.money += 120;
      state.reputation = clamp(state.reputation - 1, 0, CONFIG.maxReputation);
      return 'Du schreibst heimlich Texte für einen anderen Act. +' + money(120) + ', aber −1 Ruf.';
    },
  },
  {
    title: '🕵️ Label-Scout', tone: 'good',
    when: function () { return state.songs.length >= 2; },
    apply: function () {
      state.reputation = clamp(state.reputation + 6, 0, CONFIG.maxReputation);
      return 'Ein Scout war bei deinem Gig. Die Szene redet über dich: +6 Ruf.';
    },
  },
  {
    title: '🔓 Song geleakt', tone: '',
    when: function () { return liveSong() !== null; },
    apply: function () {
      const s = liveSong();
      s.streams = Math.round(s.streams * 1.5);
      const lost = Math.min(state.money, 40);
      state.money -= lost;
      return 'Eine Rohversion von „' + s.title + '“ ist im Netz. Mehr Hype (+50 % Streams), aber Anwalt: ' + money(lost) + '.';
    },
  },
  {
    title: '⚡ Stromausfall', tone: 'bad',
    apply: function () {
      state.energyPenalty = 20;
      return 'Das Studio hatte zwei Tage keinen Strom. Nächste Woche 20 Energie weniger.';
    },
  },
  {
    title: '🎂 Fan-Geburtstag', tone: 'good',
    apply: function () {
      state.fans += 15;
      return 'Du gratulierst einem Fan per Video. Das Video geht rum: +15 Fans.';
    },
  },
  {
    title: '😌 Ruhige Woche', tone: '',
    apply: function () {
      return 'Nichts Besonderes passiert. Manchmal ist das auch gut.';
    },
  },
];

/** Wählt ein passendes Ereignis aus und führt es aus. */
function randomEvent() {
  const possible = EVENTS.filter(function (e) { return !e.when || e.when(); });
  const event = pick(possible);
  const text = event.apply();
  return { title: event.title, text: text, tone: event.tone };
}

/* =========================================================
   7. Charts – erfundene Künstler und Songs
   ========================================================= */
const FAKE_ARTISTS = [
  'Lil Kompass', 'Nova Blanko', 'Yung Tarif', 'Saphira', 'Kalle Kaltfront', 'DJ Neonpanda', 'Mira Mondlicht',
  'Big Brezel', 'Ozelot', 'Taro Traum', 'Lina Laser', 'Kid Komet', 'Rocco Rauch', 'Juna Jade', 'Sir Skyline',
  'Vito Vinyl', 'Babsi Bounce', 'Emre Echo',
];
const FAKE_WORDS_A = ['Nachts', 'Gold', 'Neon', 'Block', 'Regen', 'Herz', 'Blitz', 'Sommer', 'Mond', 'Asphalt', 'Kristall', 'Sirenen'];
const FAKE_WORDS_B = ['Wellen', 'Träume', 'Ketten', 'Lichter', 'Gefühle', 'Melodie', 'Paradies', 'Geschichten', 'Fieber', 'Kolosseum'];

/** Erfindet einen Song mit Titel, Künstler und Streams. */
function createFakeSong(minStreams, maxStreams) {
  return {
    title: pick(FAKE_WORDS_A) + pick(FAKE_WORDS_B).toLowerCase(),
    artist: pick(FAKE_ARTISTS),
    streams: randInt(minStreams, maxStreams),
  };
}

function createFakeSongs(count) {
  const list = [];
  for (let i = 0; i < count; i++) list.push(createFakeSong(800, 60000));
  return list;
}

/** Jede Woche: Fake-Songs steigen oder fallen, alte fliegen raus, neue kommen dazu. */
function updateFakeSongs() {
  state.fakeSongs.forEach(function (song) {
    song.streams = Math.round(song.streams * rand(0.8, 1.12));
  });
  state.fakeSongs = state.fakeSongs.map(function (song) {
    return song.streams < 1500 ? createFakeSong(15000, 70000) : song;
  });
}

/** Top 10: meine Songs (Streams der letzten Woche) gemischt mit den Fake-Songs. */
function buildChart() {
  const mine = state.songs
    .filter(function (s) { return s.lastStreams > 0; })
    .map(function (s) {
      return { key: 'me-' + s.id, title: s.title, artist: state.rapper, streams: s.lastStreams, mine: true };
    });
  const fake = state.fakeSongs.map(function (s) {
    return { key: 'fake-' + s.artist + '-' + s.title, title: s.title, artist: s.artist, streams: s.streams, mine: false };
  });
  return mine.concat(fake)
    .sort(function (a, b) { return b.streams - a.streams; })
    .slice(0, CONFIG.charts.size);
}

/* =========================================================
   8. Speichern und Laden (localStorage)
   ========================================================= */
function saveGame() {
  try {
    localStorage.setItem(CONFIG.saveKey, JSON.stringify(state));
  } catch (e) {
    // z. B. im privaten Modus – das Spiel läuft trotzdem weiter
  }
}

function loadGame() {
  try {
    const raw = localStorage.getItem(CONFIG.saveKey);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

function newGame() {
  if (!window.confirm('Wirklich ein neues Spiel starten? Dein aktueller Spielstand geht verloren.')) return;
  try { localStorage.removeItem(CONFIG.saveKey); } catch (e) { /* egal */ }
  state = null;
  showStartScreen();
}

/** Nach jeder Aktion: speichern und Bildschirm neu zeichnen. */
function saveAndRender() {
  saveGame();
  render();
}

/* =========================================================
   9. Anzeige
   ========================================================= */
const $ = function (id) { return document.getElementById(id); };
let justAddedSongId = null; // für die „Neuer Song“-Animation
let toastTimer = null;

/** Zeichnet alle Werte, Buttons, Songs und Charts neu. */
function render() {
  $('stat-money').textContent = money(state.money);
  $('stat-fans').textContent = fmt(state.fans);
  $('stat-rep').textContent = state.reputation;
  $('stat-week').textContent = state.week;
  $('stat-energy').textContent = state.energy;
  $('energy-bar').style.width = (state.energy / CONFIG.maxEnergy) * 100 + '%';
  $('energy-bar').className = state.energy < 30 ? 'low' : '';
  $('rapper-label').textContent = state.rapper;
  $('studio-level').textContent = state.studioLevel;
  $('song-count').textContent = state.songs.length;

  renderActions();
  renderLog();
  renderSongs();
  renderChart();
}

/** Beschriftung und Sperre der Aktions-Buttons. */
function renderActions() {
  const atMax = state.studioLevel >= CONFIG.studio.maxLevel;
  $('info-record').textContent = '−' + CONFIG.record.energy + ' ⚡' + (state.nextSongBonus ? ' · Bonus +' + state.nextSongBonus : '');
  $('info-job').textContent = '−' + CONFIG.job.energy + ' ⚡ · +' + money(CONFIG.job.money);
  $('info-studio').textContent = atMax ? 'Maximales Level' : money(studioPrice()) + ' · Songs besser';
  $('info-gig').textContent = state.fans < CONFIG.gig.minFans
    ? 'ab ' + fmt(CONFIG.gig.minFans) + ' Fans'
    : '−' + CONFIG.gig.energy + ' ⚡ · Fans & Geld';

  $('btn-record').disabled = state.energy < CONFIG.record.energy;
  $('btn-job').disabled = state.energy < CONFIG.job.energy;
  $('btn-studio').disabled = atMax || state.money < studioPrice();
  $('btn-gig').disabled = state.fans < CONFIG.gig.minFans || state.energy < CONFIG.gig.energy;
}

function renderLog() {
  const list = $('log');
  list.innerHTML = '';
  state.log.forEach(function (entry) {
    const li = document.createElement('li');
    li.className = entry.tone;
    li.textContent = entry.text; // textContent schützt vor eingeschleustem HTML
    list.appendChild(li);
  });
}

function renderSongs() {
  const list = $('song-list');
  list.innerHTML = '';
  $('songs-empty').classList.toggle('hidden', state.songs.length > 0);
  state.songs.forEach(function (song) {
    const li = document.createElement('li');
    li.className = 'song' + (song.id === justAddedSongId ? ' new' : '');

    const q = document.createElement('div');
    q.className = 'quality ' + (song.quality >= 75 ? 'q-high' : song.quality >= 50 ? 'q-mid' : '');
    q.textContent = song.quality;

    const info = document.createElement('div');
    const title = document.createElement('div');
    title.className = 'song-title';
    title.textContent = song.title;
    const meta = document.createElement('div');
    meta.className = 'song-meta';
    meta.textContent = song.streams > 0
      ? 'nächste Woche ~' + fmt(song.streams) + ' Streams · gesamt ' + fmt(song.totalStreams)
      : 'läuft nicht mehr · gesamt ' + fmt(song.totalStreams);
    info.appendChild(title);
    info.appendChild(meta);

    li.appendChild(q);
    li.appendChild(info);
    list.appendChild(li);
  });
  justAddedSongId = null;
}

function renderChart() {
  const list = $('chart-list');
  list.innerHTML = '';
  buildChart().forEach(function (row, i) {
    const li = document.createElement('li');
    li.className = 'chart-row' + (row.mine ? ' mine' : '');

    const rank = document.createElement('span');
    rank.className = 'chart-rank';
    rank.textContent = i + 1;

    const name = document.createElement('span');
    name.className = 'chart-name';
    const t = document.createElement('strong');
    t.textContent = (row.mine ? '⭐ ' : '') + row.title;
    const a = document.createElement('small');
    a.textContent = row.artist;
    name.appendChild(t);
    name.appendChild(a);

    const streams = document.createElement('span');
    streams.className = 'chart-streams';
    streams.textContent = fmt(row.streams);
    const move = document.createElement('span');
    const before = (state.prevChart || {})[row.key];
    if (!before) { move.className = 'move new'; move.textContent = 'NEU'; }
    else if (before > i + 1) { move.className = 'move up'; move.textContent = '▲ ' + (before - i - 1); }
    else if (before < i + 1) { move.className = 'move down'; move.textContent = '▼ ' + (i + 1 - before); }
    else { move.className = 'move'; move.textContent = '–'; }
    streams.appendChild(move);

    li.appendChild(rank);
    li.appendChild(name);
    li.appendChild(streams);
    list.appendChild(li);
  });
}

/** Kurze Meldung unten einblenden. */
function showToast(text) {
  const toast = $('toast');
  toast.textContent = text;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(function () { toast.classList.remove('show'); }, 2200);
}

/** Lässt einen Wert oben kurz aufleuchten. */
function bump(id) {
  const box = $(id).parentElement;
  box.classList.remove('bump');
  void box.offsetWidth; // Trick, damit die Animation neu startet
  box.classList.add('bump');
}

/** Wochenwechsel: großes Fenster mit Zusammenfassung und Ereignis. */
function showWeekOverlay(streams, earned, fans, event, chartRank) {
  $('week-heading').textContent = 'Woche ' + state.week;
  const summary = $('week-summary');
  summary.innerHTML = '';
  [['Streams', fmt(streams)], ['Geld', '+' + money(earned)], ['Fans', '+' + fmt(fans)]].forEach(function (pair) {
    const box = document.createElement('div');
    const small = document.createElement('small');
    small.textContent = pair[0];
    const b = document.createElement('b');
    b.textContent = pair[1];
    box.appendChild(small);
    box.appendChild(b);
    summary.appendChild(box);
  });

  const ev = $('week-event');
  ev.className = 'event ' + event.tone;
  ev.innerHTML = '';
  const strong = document.createElement('strong');
  strong.textContent = event.title;
  const p = document.createElement('span');
  p.textContent = event.text + (chartRank ? ' 📈 Dein bester Song steht auf Platz ' + chartRank + '!' : '');
  ev.appendChild(strong);
  ev.appendChild(p);

  $('week-overlay').classList.remove('hidden');
  $('week-close').focus();
}

/** Zwischen Studio, Songs und Charts wechseln. */
function showPage(name) {
  ['studio', 'songs', 'charts'].forEach(function (page) {
    $('page-' + page).classList.toggle('hidden', page !== name);
  });
  document.querySelectorAll('.tab').forEach(function (tab) {
    tab.classList.toggle('active', tab.dataset.page === name);
  });
  window.scrollTo(0, 0);
}

function showStartScreen() {
  $('game').classList.add('hidden');
  $('start-screen').classList.remove('hidden');
  $('rapper-name').value = '';
  $('rapper-name').focus();
}

function showGame() {
  $('start-screen').classList.add('hidden');
  $('game').classList.remove('hidden');
  showPage('studio');
  render();
}

/* =========================================================
   10. Start – Buttons verbinden und Spiel laden
   ========================================================= */
function openRecordDialog() {
  if (!hasEnergy(CONFIG.record.energy)) return;
  $('song-title').value = '';
  $('record-dialog').classList.remove('hidden');
  $('song-title').focus();
}

function confirmRecord() {
  const title = $('song-title').value.trim();
  if (!title) {
    showToast('✏️ Gib deinem Song einen Titel.');
    return;
  }
  $('record-dialog').classList.add('hidden');
  recordSong(title);
}

function startCareer() {
  const name = $('rapper-name').value.trim() || 'MC Namenlos';
  state = newState(name);
  addLog('🏠 Woche 1: Ein Mikro, ein Laptop, ein Traum. Los geht’s, ' + name + '!', 'good');
  saveGame();
  showGame();
}

function init() {
  document.title = CONFIG.gameName;
  $('game-title').textContent = CONFIG.gameName;
  $('start-title').textContent = CONFIG.gameName;

  // Buttons mit Funktionen verbinden
  $('start-btn').addEventListener('click', startCareer);
  $('rapper-name').addEventListener('keydown', function (e) { if (e.key === 'Enter') startCareer(); });
  $('btn-record').addEventListener('click', openRecordDialog);
  $('btn-job').addEventListener('click', doJob);
  $('btn-studio').addEventListener('click', upgradeStudio);
  $('btn-gig').addEventListener('click', doGig);
  $('btn-week').addEventListener('click', endWeek);
  $('btn-new-game').addEventListener('click', newGame);
  $('record-confirm').addEventListener('click', confirmRecord);
  $('record-cancel').addEventListener('click', function () { $('record-dialog').classList.add('hidden'); });
  $('song-title').addEventListener('keydown', function (e) { if (e.key === 'Enter') confirmRecord(); });
  $('week-close').addEventListener('click', function () { $('week-overlay').classList.add('hidden'); });
  document.querySelectorAll('.tab').forEach(function (tab) {
    tab.addEventListener('click', function () { showPage(tab.dataset.page); });
  });

  // Gespeicherten Spielstand laden – oder Startbildschirm zeigen
  state = loadGame();
  if (state) showGame();
  else showStartScreen();
}

init();
