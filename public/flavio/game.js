/* =========================================================
   Onkel Flávio – Musikkarriere auf dem Handy
   ---------------------------------------------------------
   Du bist Musiker:in in Berlin, dein Onkel Flávio ist dein Manager.
   Jede Woche hast du 100 Energie: Songs aufnehmen, verbessern,
   veröffentlichen, posten, auftreten, üben. Dann: nächste Woche.
   Aufbau:
     1. CONFIG
     2. Zustand & Hilfen
     3. Aktionen (Studio, Release, Feed, Gigs, Kurse, Shop)
     4. Wochenwechsel (Streams, Charts, Fans, Geld)
     5. Bilder hochladen
     6. Seiten (Apps)
     7. Start
   ========================================================= */

/* ========== 1. CONFIG ========== */
const CONFIG = {
  saveKey: 'onkel-flavio-musik-v1',
  energy: 100, // pro Woche
  cost: { record: 10, polish: 5, release: 5, post: 5, gig: 20, course: 15 },
  startCash: 200,
  living: 20, // Lebenshaltung pro Woche
  payPerStream: 0.003, // € pro Stream
  market: 25000000, // so viele Menschen kann man insgesamt als Fans gewinnen – bremst das Wachstum oben
  fanRate: 0.013, // Anteil der Streams, aus denen Fans werden
  genres: ['Rap', 'Pop', 'R&B', 'Afrobeats', 'Techno', 'Indie'],
  parts: { text: 'Text', beat: 'Beat', vocals: 'Gesang', mix: 'Mix & Master' },
  skills: { text: 'Songwriting', beat: 'Produktion', vocals: 'Stimme' },
  gear: [
    { name: 'Handy-Mikro', price: 0, cap: 55, mix: 0 },
    { name: 'USB-Mikrofon', price: 150, cap: 64, mix: 6 },
    { name: 'Laptop mit Musikprogramm', price: 600, cap: 74, mix: 12 },
    { name: 'Homestudio', price: 2500, cap: 86, mix: 20 },
    { name: 'Profi-Studio', price: 12000, cap: 99, mix: 30 },
  ],
  courses: [
    { id: 'text', name: 'Schreibwerkstatt', skill: 'text', price: 40 },
    { id: 'beat', name: 'Produktionskurs', skill: 'beat', price: 60 },
    { id: 'vocals', name: 'Gesangsstunde', skill: 'vocals', price: 50 },
  ],
  venues: [
    { name: 'Kneipe um die Ecke', fans: 0, pay: 60, gain: 40 },
    { name: 'Jugendclub', fans: 150, pay: 160, gain: 110 },
    { name: 'Club in Friedrichshain', fans: 1000, pay: 500, gain: 350 },
    { name: 'Stadtfest-Bühne', fans: 8000, pay: 2500, gain: 1500 },
    { name: 'Konzerthalle', fans: 60000, pay: 18000, gain: 9000 },
    { name: 'Stadion', fans: 400000, pay: 120000, gain: 60000 },
  ],
  ranks: [
    { name: 'Schlafzimmer-Talent', fans: 0 },
    { name: 'Kiez-Bekanntheit', fans: 1000 },
    { name: 'Aufsteiger:in', fans: 10000 },
    { name: 'Chartstürmer:in', fans: 100000 },
    { name: 'Star', fans: 1000000 },
    { name: 'Legende', fans: 10000000 },
  ],
  // Erfundene Konkurrenz für die Charts
  rivals: ['Mira Nox', 'KALIBER', 'Jonah Blue', 'Sami Sun', 'LUNA 7', 'Deniz K.', 'Velvet Ray', 'Brixton Mo', 'Ayla', 'Neon Kids', 'Kaspar', 'Juno Lee',
    'Rico Gold', 'Hanna Vale', 'Fynn Vega', 'SOLEA', 'Tarek', 'Mona Lux', 'BLKWLD', 'Cleo', 'Emre Nova', 'Paula Rae', 'Zeki', 'Ivy Moon', 'Lenny Moe'],
  rivalTitles: ['Mitternacht', 'Kein Zurück', 'Sommerregen', 'Blaulicht', 'Herzschlag', 'Paradies', 'Neonlicht', 'Allein', 'Tanzen', 'Gold', 'Vollgas',
    'Stille', 'Fieber', 'Gegenwind', 'Lila', 'Augen zu', 'Wolken', 'Echo', 'Kometen', 'Ozean', 'Nachtzug', 'Feuerwerk', 'Wellen', 'Kopfkino', 'Ballon'],
  titleIdeas: ['Kreuzberg Nächte', 'Spree im Dunkeln', 'Letzte Bahn', 'Kopf hoch', 'Nie wieder', 'Herz aus Glas', 'Späti-Romantik', 'Dachterrasse',
    'Mama sagt', 'Erster Platz', 'Nebel', 'Ohne dich', 'Goldene Zeiten', 'Bis zum Morgen', 'Plattenbau', 'U8', 'Schall & Rauch', 'Kaltes Licht'],
};

/* ========== 2. Zustand & Hilfen ========== */
function newState(name, genre) {
  return {
    name, genre, week: 1, energy: CONFIG.energy, cash: CONFIG.startCash,
    fans: 0, followers: 20, gear: 0,
    skills: { text: 20, beat: 15, vocals: 20 },
    songs: [], posts: [], phone: [], gigsThisWeek: [], postsThisWeek: 0,
    trend: pick(CONFIG.genres), trendLeft: 6,
    label: null, peak: null, totalStreams: 0, earned: 0,
    page: 'home', tips: true, nextId: 1,
  };
}
let S = null;

const $ = (id) => document.getElementById(id);
const eur = (n) => `${Math.round(n).toLocaleString('de-DE')} €`;
const num = (n) => (n >= 1e6 ? `${(n / 1e6).toFixed(1).replace('.', ',')} Mio.` : n >= 1e4 ? `${Math.round(n / 1e3)}k` : Math.round(n).toLocaleString('de-DE'));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const rnd = (a, b) => a + Math.random() * (b - a);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const song = (id) => S.songs.find((x) => x.id === id);
const gear = () => CONFIG.gear[S.gear];
const rankIdx = () => CONFIG.ranks.reduce((r, k, i) => (S.fans >= k.fans ? i : r), 0);
const unread = () => S.phone.filter((m) => !m.read).length;
const quality = (sg) => Math.round(Object.values(sg.parts).reduce((a, b) => a + b, 0) / 4);
const qualityLabel = (q) => (q >= 90 ? 'Meisterwerk' : q >= 78 ? 'Hit-Potenzial' : q >= 65 ? 'Stark' : q >= 50 ? 'Solide' : q >= 35 ? 'Roh' : 'Schwach');

function text(from, body) {
  S.phone.unshift({ from, body, week: S.week, read: false });
  S.phone = S.phone.slice(0, 40);
}
function useEnergy(n) {
  if (S.energy < n) {
    showModal('Keine Energie mehr', `<p>Dafür brauchst du ${n} Energie, du hast noch ${S.energy}.</p><p>Tipp unten auf <b>Nächste Woche</b> – dann bist du wieder bei ${CONFIG.energy}.</p>`, true);
    return false;
  }
  S.energy -= n;
  return true;
}
function skillUp(k, amount) {
  // Je besser du schon bist, desto langsamer geht es voran.
  S.skills[k] = clamp(S.skills[k] + amount * (1 - S.skills[k] / 120), 0, 100);
}

/* ========== 3. Aktionen ========== */
function recordSong(title) {
  if (!useEnergy(CONFIG.cost.record)) return;
  const g = gear();
  const part = (skill) => clamp(skill * 0.65 + rnd(5, 28), 5, g.cap);
  const sg = {
    id: S.nextId++, title: title || pick(CONFIG.titleIdeas), genre: S.genre,
    parts: {
      text: part(S.skills.text),
      beat: part(S.skills.beat + g.mix * 0.5),
      vocals: part(S.skills.vocals),
      mix: clamp(18 + g.mix * 1.6 + S.skills.beat * 0.2 + rnd(0, 12), 5, g.cap),
    },
    polish: { text: 0, beat: 0, vocals: 0, mix: 0 },
    cover: null, hue: Math.floor(rnd(0, 360)),
    released: false, week: S.week, streams: 0, last: 0, history: [], hype: 0, peak: null,
  };
  S.songs.unshift(sg);
  for (const k of Object.keys(S.skills)) skillUp(k, 0.8);
  save();
  S.page = `song:${sg.id}`;
  render();
  showModal('Aufgenommen', `<p><b>„${esc(sg.title)}“</b> ist im Kasten.</p><p>Qualität: <b>${quality(sg)}</b> – ${qualityLabel(quality(sg))}.</p>
    <p>Du kannst jeden Teil noch bis zu 3× verbessern, bevor du den Song auf Tonspur veröffentlichst.</p>`);
}

function polishSong(id, part) {
  const sg = song(id);
  if (!sg || sg.released || sg.polish[part] >= 3) return;
  if (!useEnergy(CONFIG.cost.polish)) return;
  const cap = gear().cap;
  const skill = part === 'mix' ? S.skills.beat * 0.6 + gear().mix * 2 : S.skills[part];
  const before = sg.parts[part];
  // Bringt viel, solange der Teil schwach ist – später nur noch Feinschliff.
  const gain = Math.max(1, (cap - before) * rnd(0.18, 0.3) + skill * 0.04);
  sg.parts[part] = clamp(before + gain, 0, cap);
  sg.polish[part]++;
  save();
  render();
  flash(`${CONFIG.parts[part]} +${Math.round(sg.parts[part] - before)}`);
}

function releaseSong(id) {
  const sg = song(id);
  if (!sg || sg.released) return;
  if (!useEnergy(CONFIG.cost.release)) return;
  sg.released = true;
  sg.releaseWeek = S.week;
  sg.hype = 1;
  text('Onkel Flávio', `„${sg.title}“ ist draußen! Poste im Feed darüber, dann hören es mehr Leute. Die Zahlen gibt's am Ende der Woche.`);
  save();
  render();
  showModal('Veröffentlicht', `<p><b>„${esc(sg.title)}“</b> ist jetzt auf Tonspur.</p><p>Streams, Fans und Geld werden am Ende der Woche abgerechnet – tipp auf <b>Nächste Woche</b>.</p>`);
}

function deleteSong(id) {
  const sg = song(id);
  if (!sg || sg.released) return;
  S.songs = S.songs.filter((x) => x.id !== id);
  S.page = 'studio';
  save();
  render();
}

function post(textBody, songId, img) {
  if (!useEnergy(CONFIG.cost.post)) return;
  const sg = songId ? song(songId) : null;
  // Mit Bild kommt ein Post besser an; Werbung für einen frischen Song macht Hype.
  // Mehrere Posts in einer Woche bringen immer weniger.
  const fatigue = 1 / (1 + (S.postsThisWeek ?? 0) * 0.7);
  S.postsThisWeek = (S.postsThisWeek ?? 0) + 1;
  const base = (12 + S.fans * 0.015) * (1 - S.followers / CONFIG.market);
  const gained = Math.max(1, Math.round(base * (img ? 1.5 : 1) * fatigue * rnd(0.6, 1.4)));
  S.followers += gained;
  const likes = Math.round((S.followers * rnd(0.05, 0.14) + gained) * (img ? 1.4 : 1));
  if (sg) sg.hype += 0.6;
  S.posts.unshift({ id: S.nextId++, text: textBody, song: sg ? sg.id : null, img, likes, gained, week: S.week });
  S.posts = S.posts.slice(0, 30);
  pendingImg = null;
  save();
  render();
  flash(`+${num(gained)} Follower`);
}

function playGig(i) {
  const v = CONFIG.venues[i];
  if (S.fans < v.fans || S.gigsThisWeek.includes(i)) return;
  if (!useEnergy(CONFIG.cost.gig)) return;
  S.gigsThisWeek.push(i);
  // Wie gut der Auftritt läuft, hängt an deiner Stimme und an deinen Songs.
  const best = Math.max(0, ...S.songs.filter((x) => x.released).map(quality));
  const show = clamp((S.skills.vocals * 0.6 + best * 0.4) / 70 * rnd(0.7, 1.3), 0.3, 1.6);
  const fans = Math.round(v.gain * show * Math.max(0, 1 - S.fans / CONFIG.market));
  const pay = Math.round(v.pay * (0.8 + show * 0.3));
  S.fans += fans;
  S.cash += pay;
  S.earned += pay;
  skillUp('vocals', 1.5);
  const verdict = show > 1.2 ? 'Die Leute rasten aus!' : show > 0.9 ? 'Starker Auftritt.' : show > 0.6 ? 'Ganz okay, ein paar haben mitgesungen.' : 'Zäh – das Publikum war eher am Handy.';
  save();
  render();
  showModal(v.name, `<p>${verdict}</p><p>Gage: <b>${eur(pay)}</b> · neue Fans: <b>+${num(fans)}</b></p>`);
}

function takeCourse(id) {
  const c = CONFIG.courses.find((x) => x.id === id);
  const price = coursePrice(c);
  if (S.cash < price) { showModal('Zu wenig Geld', `<p>Der Kurs kostet ${eur(price)}.</p>`, true); return; }
  if (!useEnergy(CONFIG.cost.course)) return;
  S.cash -= price;
  const before = S.skills[c.skill];
  skillUp(c.skill, rnd(6, 10));
  save();
  render();
  flash(`${CONFIG.skills[c.skill]} +${Math.round(S.skills[c.skill] - before)}`);
}
const coursePrice = (c) => Math.round(c.price * (1 + S.skills[c.skill] / 25));

function buyGear(i) {
  const g = CONFIG.gear[i];
  if (i !== S.gear + 1 || S.cash < g.price) return;
  S.cash -= g.price;
  S.gear = i;
  text('Onkel Flávio', `${g.name}? Respekt. Jetzt klingen deine Songs nach mehr – neue Aufnahmen können bis Qualität ${g.cap} gehen.`);
  save();
  render();
  showModal('Neues Equipment', `<p><b>${g.name}</b> steht bereit. Songs können jetzt bis <b>${g.cap}</b> Qualität erreichen.</p>`);
}

/* ========== 4. Wochenwechsel ========== */
function weekStreams(sg, trendBoost) {
  const age = S.week - sg.releaseWeek;
  const q = Math.pow(quality(sg) / 60, 2.4);
  const audience = 250 + S.fans * 0.45 + S.followers * 0.2;
  const fresh = age === 0 ? 1.7 : Math.pow(0.82, age);
  const hype = 1 + sg.hype * 0.8;
  const trend = sg.genre === S.trend ? trendBoost : 1;
  return Math.round(audience * q * fresh * hype * trend * rnd(0.8, 1.2));
}

function chartsFor(streamsByPlayer) {
  // 50 erfundene Songs, oben ein paar Millionen Streams
  const list = CONFIG.rivals.flatMap((a, i) => [0, 1].map((j) => ({
    artist: a, title: CONFIG.rivalTitles[(i * 2 + j + S.week) % CONFIG.rivalTitles.length], streams: 0,
  })));
  shuffleSeeded(list, S.week);
  list.forEach((e, i) => { e.streams = Math.round(2400000 * Math.pow(0.9, i) * rnd(0.9, 1.1)); });
  for (const p of streamsByPlayer) list.push({ artist: S.name, title: p.title, streams: p.streams, mine: p.id });
  list.sort((a, b) => b.streams - a.streams);
  return list.slice(0, 50);
}
function shuffleSeeded(a, seed) {
  let x = seed * 9301 + 49297;
  for (let i = a.length - 1; i > 0; i--) {
    x = (x * 9301 + 49297) % 233280;
    const j = Math.floor((x / 233280) * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
}

function nextWeek() {
  const released = S.songs.filter((x) => x.released);
  const viral = released.find((x) => quality(x) >= 72 && S.week - x.releaseWeek <= 4 && Math.random() < 0.05);
  let streams = 0;
  const mine = [];
  for (const sg of released) {
    let w = weekStreams(sg, 1.35);
    if (sg === viral) w *= 6;
    sg.last = w;
    sg.streams += w;
    sg.history.push(w);
    sg.history = sg.history.slice(-12);
    sg.hype *= 0.55;
    streams += w;
    mine.push({ id: sg.id, title: sg.title, streams: w });
  }
  const share = S.label ? 1 - S.label.cut : 1;
  const money = streams * CONFIG.payPerStream * share;
  const room = Math.max(0, 1 - S.fans / CONFIG.market);
  const newFans = Math.round(released.reduce((a, sg) => a + sg.last * CONFIG.fanRate * (quality(sg) / 100), 0) * room);
  const newFollowers = Math.round(newFans * 0.3);
  S.fans += newFans;
  S.followers += newFollowers;
  S.cash += money - CONFIG.living;
  S.earned += money;
  S.totalStreams += streams;

  // Charts
  S.charts = chartsFor(mine);
  const chartLines = [];
  S.charts.forEach((e, i) => {
    if (!e.mine) return;
    const sg = song(e.mine);
    if (!sg.peak || i + 1 < sg.peak) sg.peak = i + 1;
    if (!S.peak || i + 1 < S.peak) S.peak = i + 1;
    chartLines.push(`<p>„${esc(sg.title)}“ steht auf <b>Platz ${i + 1}</b> der Charts!</p>`);
  });

  // Trend wechselt alle paar Wochen
  if (--S.trendLeft <= 0) {
    S.trend = pick(CONFIG.genres);
    S.trendLeft = 6;
    text('Onkel Flávio', `Gerade hören alle ${S.trend}. Songs in dem Genre laufen jetzt besser.`);
  }
  const rankBefore = rankIdx();
  events();

  S.week++;
  S.energy = CONFIG.energy;
  S.gigsThisWeek = [];
  S.postsThisWeek = 0;
  const rankAfter = rankIdx();
  save();
  render();

  const best = [...released].sort((a, b) => b.last - a.last)[0];
  showModal(`Woche ${S.week - 1} vorbei`, `
    ${viral ? `<p class="good"><b>„${esc(viral.title)}“ geht viral!</b> Sechsmal so viele Streams wie sonst.</p>` : ''}
    <p>Streams: <b>${num(streams)}</b>${best ? ` · Top-Song: „${esc(best.title)}“ (${num(best.last)})` : ''}</p>
    <p>Einnahmen: <b>${eur(money)}</b>${S.label ? ` (nach ${Math.round(S.label.cut * 100)} % für das Label)` : ''} · Lebenshaltung: −${eur(CONFIG.living)}</p>
    <p>Neue Fans: <b>+${num(newFans)}</b> · neue Follower: <b>+${num(newFollowers)}</b></p>
    ${chartLines.join('')}
    ${rankAfter > rankBefore ? `<p class="good"><b>Aufstieg: ${CONFIG.ranks[rankAfter].name}!</b></p>` : ''}
    ${!released.length ? '<p>Noch nichts veröffentlicht – ohne Songs auf Tonspur keine Streams.</p>' : ''}
    ${S.cash < 0 ? '<p class="bad">Dein Konto ist im Minus. Spiel Auftritte, um Geld zu verdienen.</p>' : ''}
    <p>Energie wieder bei <b>${CONFIG.energy}</b>.</p>`);
}

function events() {
  // Label-Angebot, sobald du etwas bekannter bist
  if (!S.label && !S.labelAsked && S.fans >= 15000) {
    S.labelAsked = true;
    const advance = Math.round(S.fans * 0.8);
    S.offer = { advance, cut: 0.5 };
    text('Wellenbrecher Records', `Wir wollen dich signen: ${eur(advance)} Vorschuss sofort, dafür gehen 50 % deiner Streaming-Einnahmen an uns. Antwort im Profil.`);
  }
  // Feature-Anfragen von anderen Artists
  if (S.fans >= 500 && Math.random() < 0.18) {
    const who = pick(CONFIG.rivals);
    const gain = Math.round((S.fans * rnd(0.04, 0.1) + 50) * Math.max(0, 1 - S.fans / CONFIG.market));
    S.fans += gain;
    text(who, `Hab dich auf meinem Track gefeatured – lief gut! (+${num(gain)} Fans für dich)`);
  }
  if (S.week === 2) text('Onkel Flávio', 'Erste Woche geschafft. Denk dran: Ohne Posts im Feed kriegt keiner mit, dass du Musik machst.');
}

function signLabel(yes) {
  if (!S.offer) return;
  if (yes) {
    S.label = { cut: S.offer.cut };
    S.cash += S.offer.advance;
    S.earned += S.offer.advance;
    text('Wellenbrecher Records', 'Willkommen im Team! Der Vorschuss ist überwiesen.');
  } else text('Onkel Flávio', 'Unabhängig bleiben – mutig. Dafür gehört jeder Cent dir.');
  S.offer = null;
  save();
  render();
}

/* ========== 5. Bilder hochladen ========== */
let uploadTarget = null; // 'cover:<id>' oder 'post'
let pendingImg = null; // Bild für den nächsten Post

function startUpload(target) {
  uploadTarget = target;
  $('file').value = '';
  $('file').click();
}
$('file').addEventListener('change', () => {
  const f = $('file').files[0];
  if (!f || !uploadTarget) return;
  const reader = new FileReader();
  reader.onload = () => {
    const img = new Image();
    img.onload = () => {
      // Quadratisch zuschneiden und verkleinern, damit es in den Speicher passt
      const size = 320;
      const cv = document.createElement('canvas');
      cv.width = cv.height = size;
      const s = Math.min(img.width, img.height);
      cv.getContext('2d').drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, size, size);
      const data = cv.toDataURL('image/jpeg', 0.78);
      if (uploadTarget.startsWith('cover:')) {
        const sg = song(Number(uploadTarget.split(':')[1]));
        if (sg) sg.cover = data;
      } else pendingImg = data;
      if (!save()) {
        if (uploadTarget.startsWith('cover:')) song(Number(uploadTarget.split(':')[1])).cover = null;
        else pendingImg = null;
        showModal('Speicher voll', '<p>Das Bild passt nicht mehr in den Speicher des Browsers. Lösch ein paar alte Posts oder nimm ein anderes Bild.</p>', true);
      }
      render();
    };
    img.src = reader.result;
  };
  reader.readAsDataURL(f);
});

/* ========== 6. Seiten ========== */
function showModal(title, html, bad = false) {
  $('m-title').textContent = title;
  $('m-body').innerHTML = html;
  document.querySelector('.modal-card').classList.toggle('bad', bad);
  $('modal').classList.remove('hidden');
}
let flashTimer = null;
function flash(t) {
  const el = $('flash');
  el.textContent = t;
  el.classList.remove('hidden');
  clearTimeout(flashTimer);
  flashTimer = setTimeout(() => el.classList.add('hidden'), 1400);
}

function cover(sg, size = 52) {
  const style = `width:${size}px;height:${size}px`;
  if (sg.cover) return `<img class="cover" src="${sg.cover}" style="${style}" alt="">`;
  const h = sg.hue;
  return `<span class="cover gen" style="${style};background:linear-gradient(135deg,hsl(${h} 80% 55%),hsl(${(h + 60) % 360} 70% 30%))">${esc(sg.title.slice(0, 1).toUpperCase())}</span>`;
}
const bar = (v, max = 100) => `<span class="qbar"><i style="width:${clamp((v / max) * 100, 0, 100)}%"></i></span>`;
const energyBar = () => `<div class="ebar"><i style="width:${S.energy}%"></i><span>${S.energy} / ${CONFIG.energy} Energie</span></div>`;

let HL = null;
/** Tipp vom Onkel: Was ist jetzt sinnvoll? Gibt Text und die App zurück, die leuchten soll. */
function nextStep() {
  const demos = S.songs.filter((x) => !x.released);
  const released = S.songs.filter((x) => x.released);
  if (!S.songs.length) return ['Öffne das Studio und nimm deinen ersten Song auf (10 Energie).', 'studio'];
  const weak = demos.find((x) => Object.values(x.polish).some((p) => p < 3) && quality(x) < gear().cap - 8);
  if (weak && S.energy >= CONFIG.cost.polish && !released.length) return [`„${weak.title}“ ist noch roh. Im Studio kannst du Text, Beat, Gesang und Mix verbessern.`, 'studio'];
  if (demos.length && S.energy >= CONFIG.cost.release) return [`Veröffentliche „${demos[0].title}“ auf Tonspur – gern mit eigenem Cover-Bild.`, 'tonspur'];
  const fresh = released.find((x) => x.releaseWeek === S.week);
  if (fresh && !S.posts.some((p) => p.song === fresh.id) && S.energy >= CONFIG.cost.post) return [`Poste im Feed über „${fresh.title}“ – das bringt Hype und mehr Streams.`, 'feed'];
  if (S.energy >= CONFIG.cost.gig && CONFIG.venues.some((v, i) => S.fans >= v.fans && !S.gigsThisWeek.includes(i))) return ['Spiel einen Auftritt – bringt Geld und Fans.', 'gigs'];
  const next = CONFIG.gear[S.gear + 1];
  if (next && S.cash >= next.price + 100) return [`Du kannst dir ${next.name} leisten – bessere Songs möglich.`, 'shop'];
  if (S.energy >= CONFIG.cost.record) return [`Noch ${S.energy} Energie. Nimm noch einen Song auf oder belege einen Kurs.`, 'studio'];
  return ['Energie fast leer. Tipp auf „Nächste Woche“ unten im Dock.', 'week'];
}

const ICONS = {
  studio: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3M8 21h8"/>',
  tonspur: '<circle cx="12" cy="12" r="9"/><path d="M7.5 9.5c3-1 6.5-.6 9 .8M8 12.8c2.4-.7 5.2-.4 7.3.7M8.6 15.8c1.9-.5 4-.3 5.6.5"/>',
  charts: '<path d="M4 20V12M10 20V6M16 20v-9M3 20h18"/><path d="M14 4l2-1 2 1"/>',
  feed: '<rect x="4" y="4" width="16" height="16" rx="4"/><circle cx="12" cy="12" r="3.5"/><circle cx="16.5" cy="7.5" r=".7"/>',
  gigs: '<path d="M4 20l4-10 4 10M6 15h4"/><path d="M14 20V8l6-2v10"/><circle cx="18" cy="16" r="2"/>',
  courses: '<path d="M3 9l9-4 9 4-9 4z"/><path d="M7 11v5c3 2 7 2 10 0v-5"/>',
  shop: '<path d="M5 8h14l-1.2 12H6.2z"/><path d="M9 8a3 3 0 0 1 6 0"/>',
  profile: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-7 8-7s8 3 8 7"/>',
  phone: '<path d="M4 5h16v11H9l-5 4z"/><path d="M8 9h8M8 12h5"/>',
  week: '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4M10 15h5l-2-2M15 15l-2 2"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1 .8-1 1.7"/><circle cx="12" cy="17" r=".6"/>',
};
function apps() {
  return [
    { page: 'studio', name: 'Studio', color: '#ff7a59,#c23a1a', badge: S.songs.filter((x) => !x.released).length },
    { page: 'tonspur', name: 'Tonspur', color: '#2ee08a,#0f8a4f' },
    { page: 'charts', name: 'Charts', color: '#ffd24a,#c98a10' },
    { page: 'feed', name: 'Feed', color: '#ff6fb1,#9b2fd6' },
    { page: 'gigs', name: 'Auftritte', color: '#6a8cff,#2a3fb8' },
    { page: 'courses', name: 'Kurse', color: '#36c6d3,#118a96' },
    { page: 'shop', name: 'Equipment', color: '#8f99a8,#4b5563' },
    { page: 'profile', name: 'Profil', color: '#b58cff,#5a37c9', badge: S.offer ? 1 : 0 },
  ];
}
const DOCK = () => [
  { page: 'phone', name: 'Nachrichten', color: '#5ee07a,#1f9e40', badge: unread() },
  { page: 'help', name: 'Hilfe', color: '#4a4f59,#15171b' },
  { page: 'tonspur', name: 'Tonspur', color: '#2ee08a,#0f8a4f' },
  { page: 'week', name: 'Nächste Woche', color: '#ff5f5f,#b3202b' },
];
const TITLES = { studio: 'Studio', tonspur: 'Tonspur', charts: 'Charts', feed: 'Feed', gigs: 'Auftritte', courses: 'Kurse', shop: 'Equipment', profile: 'Profil', phone: 'Nachrichten' };

function appIcon(a) {
  const [c1, c2] = a.color.split(',');
  const act = a.page === 'week' ? 'data-act="week"' : a.page === 'help' ? 'data-act="intro"' : `data-page="${a.page}"`;
  return `<button class="app ${HL === a.page ? 'hl' : ''}" ${act}>
    <span class="icon" style="background:linear-gradient(${c1},${c2})"><svg viewBox="0 0 24 24">${ICONS[a.page]}</svg></span>
    ${a.badge ? `<span class="badge-red">${a.badge}</span>` : ''}<span>${a.name}</span></button>`;
}

function pageHome() {
  const [tip, target] = S.tips ? nextStep() : [null, null];
  HL = target;
  const push = tip ? `<button class="push" ${target === 'week' ? 'data-act="week"' : target ? `data-page="${target}"` : ''}><span class="pi">F</span>
    <span><small>Onkel Flávio · Tipp</small>${esc(tip)}</span></button>` : '';
  return `<div class="springboard">
    <div class="widget">
      <small>${esc(S.name)} · ${CONFIG.ranks[rankIdx()].name}</small><strong>Woche ${S.week}</strong>
      <div class="wstats">
        <div><span>Geld</span><b>${eur(S.cash)}</b></div><div><span>Fans</span><b>${num(S.fans)}</b></div>
        <div><span>Follower</span><b>${num(S.followers)}</b></div><div><span>Trend</span><b>${S.trend}</b></div>
      </div>
      <div class="wheat"><i style="width:${S.energy}%"></i></div>
      <small class="wfoot">${S.energy} Energie übrig</small>
    </div>
    ${push}
    <div class="apps">${apps().map(appIcon).join('')}</div>
    <div class="dock">${DOCK().map(appIcon).join('')}</div>
  </div>`;
}

function pageStudio() {
  const demos = S.songs.filter((x) => !x.released);
  return `${energyBar()}
    <div class="card">
      <h3>Neuer Song</h3>
      <input id="title" maxlength="40" placeholder="Titel, z. B. ${esc(pick(CONFIG.titleIdeas))}" />
      <button class="btn primary wide" data-act="record">Aufnehmen · ${CONFIG.cost.record} Energie</button>
      <p class="fine">Genre: ${S.genre} · Equipment: ${gear().name} (max. Qualität ${gear().cap})</p>
    </div>
    <h3 class="sub">Deine Skills</h3>
    <div class="list">${Object.entries(CONFIG.skills).map(([k, n]) => `<div class="row"><span class="grow">${n}</span>${bar(S.skills[k])}<span class="num">${Math.round(S.skills[k])}</span></div>`).join('')}</div>
    <h3 class="sub">Unveröffentlicht (${demos.length})</h3>
    <div class="list">${demos.length ? demos.map(songRow).join('') : '<div class="empty">Noch keine Aufnahmen.</div>'}</div>`;
}
const songRow = (sg) => `<button class="item" data-page="song:${sg.id}">${cover(sg, 44)}
  <span class="txt"><strong>${esc(sg.title)}</strong><small>${sg.released ? `${num(sg.streams)} Streams${sg.peak ? ` · Peak #${sg.peak}` : ''}` : `Qualität ${quality(sg)} · ${qualityLabel(quality(sg))}`}</small></span><span class="chev">›</span></button>`;

function pageSong(id) {
  const sg = song(id);
  if (!sg) return '<div class="empty">Song nicht gefunden.</div>';
  const q = quality(sg);
  const parts = Object.entries(CONFIG.parts).map(([k, n]) => `<div class="row part">
    <span class="grow">${n}<small>${'●'.repeat(sg.polish[k])}${'○'.repeat(3 - sg.polish[k])} verbessert</small></span>${bar(sg.parts[k])}<span class="num">${Math.round(sg.parts[k])}</span>
    ${sg.released ? '' : `<button class="btn sm" data-act="polish:${sg.id}:${k}" ${sg.polish[k] >= 3 || sg.parts[k] >= gear().cap - 0.5 ? 'disabled' : ''}>+ ${CONFIG.cost.polish}⚡</button>`}</div>`).join('');
  const hist = sg.history.length ? `<h3 class="sub">Streams pro Woche</h3><div class="spark">${sg.history.map((v) => `<i style="height:${Math.max(4, (v / Math.max(...sg.history)) * 100)}%" title="${num(v)}"></i>`).join('')}</div>` : '';
  return `${sg.released ? '' : energyBar()}
    <div class="song-head">${cover(sg, 110)}
      <div><h2>${esc(sg.title)}</h2><p>${esc(S.name)} · ${sg.genre}</p><p class="big">${q} <small>${qualityLabel(q)}</small></p></div></div>
    <button class="btn wide" data-act="upload:cover:${sg.id}">${sg.cover ? 'Cover ändern' : 'Eigenes Cover hochladen'}</button>
    <h3 class="sub">Teile</h3><div class="list">${parts}</div>
    ${sg.released
      ? `<div class="list"><div class="row"><span class="grow">Streams gesamt</span><span class="num">${num(sg.streams)}</span></div>
         <div class="row"><span class="grow">Letzte Woche</span><span class="num">${num(sg.last)}</span></div>
         <div class="row"><span class="grow">Bester Chartplatz</span><span class="num">${sg.peak ? `#${sg.peak}` : '–'}</span></div></div>${hist}`
      : `<button class="btn primary wide" data-act="release:${sg.id}">Auf Tonspur veröffentlichen · ${CONFIG.cost.release} Energie</button>
         <button class="btn wide ghost" data-act="del:${sg.id}">Aufnahme löschen</button>`}`;
}

function pageTonspur() {
  const released = S.songs.filter((x) => x.released);
  const demos = S.songs.filter((x) => !x.released);
  const monthly = released.reduce((a, x) => a + x.last, 0);
  return `<div class="ts-head">
      <span class="ts-avatar">${esc(S.name.slice(0, 1).toUpperCase())}</span>
      <div><h2>${esc(S.name)}</h2><p>${num(monthly * 4)} monatliche Hörer:innen</p></div></div>
    ${demos.length ? `<h3 class="sub">Bereit zum Veröffentlichen</h3><div class="list">${demos.map(songRow).join('')}</div>` : ''}
    <h3 class="sub">Beliebt</h3>
    <div class="list">${released.length ? [...released].sort((a, b) => b.streams - a.streams).map((sg, i) => `<button class="item" data-page="song:${sg.id}">
      <span class="rank">${i + 1}</span>${cover(sg, 44)}<span class="txt"><strong>${esc(sg.title)}</strong><small>${num(sg.streams)} Streams</small></span><span class="meta">${num(sg.last)}/Wo.</span></button>`).join('') : '<div class="empty">Noch nichts veröffentlicht.</div>'}</div>
    <p class="fine">Pro Stream gibt es ${String(CONFIG.payPerStream).replace('.', ',')} €. Insgesamt: ${num(S.totalStreams)} Streams.</p>`;
}

function pageCharts() {
  if (!S.charts) return '<div class="empty">Die ersten Charts kommen am Ende dieser Woche.</div>';
  return `<p class="hint">Top 50 · Woche ${S.week - 1}${S.peak ? ` · dein bester Platz: #${S.peak}` : ''}</p>
    <div class="list">${S.charts.map((e, i) => `<div class="row chart ${e.mine ? 'mine' : ''}"><span class="rank">${i + 1}</span>
      <span class="grow"><b>${esc(e.title)}</b><small>${esc(e.artist)}</small></span><span class="num">${num(e.streams)}</span></div>`).join('')}</div>
    ${S.charts.some((e) => e.mine) ? '' : '<p class="fine">Für Platz 50 brauchst du gerade etwa ' + num(S.charts[49].streams) + ' Streams in einer Woche.</p>'}`;
}

function pageFeed() {
  const released = S.songs.filter((x) => x.released);
  return `${energyBar()}
    <div class="card">
      <h3>Neuer Post</h3>
      ${pendingImg ? `<img class="post-img" src="${pendingImg}" alt=""><button class="btn sm" data-act="noimg">Bild entfernen</button>` : '<button class="btn wide" data-act="upload:post">Bild hochladen</button>'}
      <input id="post-text" maxlength="120" placeholder="Was gibt's Neues?" />
      <label for="post-song">Werbung für einen Song (optional)</label>
      <select id="post-song"><option value="">– keiner –</option>${released.map((sg) => `<option value="${sg.id}">${esc(sg.title)}</option>`).join('')}</select>
      <button class="btn primary wide" data-act="post">Posten · ${CONFIG.cost.post} Energie</button>
    </div>
    <h3 class="sub">${num(S.followers)} Follower</h3>
    ${S.posts.length ? S.posts.map((p) => `<div class="post">
      <div class="post-top"><span class="ts-avatar sm">${esc(S.name.slice(0, 1).toUpperCase())}</span><b>${esc(S.name)}</b><small>Woche ${p.week}</small>
        <button class="x" data-act="delpost:${p.id}" aria-label="Post löschen">×</button></div>
      ${p.img ? `<img class="post-img" src="${p.img}" alt="">` : ''}
      ${p.text ? `<p>${esc(p.text)}</p>` : ''}
      ${p.song && song(p.song) ? `<p class="fine">🎵 ${esc(song(p.song).title)}</p>` : ''}
      <small class="likes">♥ ${num(p.likes)} · +${num(p.gained)} Follower</small></div>`).join('') : '<div class="empty">Noch keine Posts.</div>'}`;
}

function pageGigs() {
  return `${energyBar()}<p class="hint">Ein Auftritt kostet ${CONFIG.cost.gig} Energie. Jede Location einmal pro Woche.</p>
    <div class="list">${CONFIG.venues.map((v, i) => {
      const locked = S.fans < v.fans;
      const done = S.gigsThisWeek.includes(i);
      return `<button class="item" data-act="gig:${i}" ${locked || done ? 'disabled' : ''}><span class="code">${i + 1}</span>
        <span class="txt"><strong>${v.name}</strong><small>${locked ? `ab ${num(v.fans)} Fans` : done ? 'diese Woche schon gespielt' : `ca. ${eur(v.pay)} · +${num(v.gain)} Fans`}</small></span><span class="chev">›</span></button>`;
    }).join('')}</div>`;
}

function pageCourses() {
  return `${energyBar()}<p class="hint">Bessere Skills = bessere Songs. Ein Kurs kostet ${CONFIG.cost.course} Energie.</p>
    <div class="list">${CONFIG.courses.map((c) => `<button class="item" data-act="course:${c.id}" ${S.cash < coursePrice(c) ? 'disabled' : ''}>
      <span class="txt"><strong>${c.name}</strong><small>${CONFIG.skills[c.skill]} ${Math.round(S.skills[c.skill])}</small></span><span class="meta">${eur(coursePrice(c))}</span><span class="chev">›</span></button>`).join('')}</div>`;
}

function pageShop() {
  return `<p class="hint">Dein Equipment legt fest, wie gut ein Song höchstens werden kann. Guthaben: ${eur(S.cash)}</p>
    <div class="list">${CONFIG.gear.map((g, i) => `<button class="item" data-act="gear:${i}" ${i !== S.gear + 1 || S.cash < g.price ? 'disabled' : ''}>
      <span class="code">${i + 1}</span><span class="txt"><strong>${g.name}</strong><small>max. Qualität ${g.cap}${i <= S.gear ? ' · ✓ hast du' : ''}</small></span>
      <span class="meta">${i <= S.gear ? '' : eur(g.price)}</span></button>`).join('')}</div>`;
}

function pageProfile() {
  const r = rankIdx();
  return `${S.offer ? `<div class="card offer"><h3>Angebot von Wellenbrecher Records</h3><p>${eur(S.offer.advance)} Vorschuss, dafür ${Math.round(S.offer.cut * 100)} % deiner Streaming-Einnahmen.</p>
      <button class="btn primary" data-act="label:1">Unterschreiben</button> <button class="btn" data-act="label:0">Ablehnen</button></div>` : ''}
    <div class="list">
      <div class="row"><span class="grow">Name</span><b>${esc(S.name)}</b></div>
      <div class="row"><span class="grow">Genre</span><b>${S.genre}</b></div>
      <div class="row"><span class="grow">Label</span><b>${S.label ? 'Wellenbrecher Records' : 'unabhängig'}</b></div>
      <div class="row"><span class="grow">Streams gesamt</span><b>${num(S.totalStreams)}</b></div>
      <div class="row"><span class="grow">Verdient gesamt</span><b>${eur(S.earned)}</b></div>
      <div class="row"><span class="grow">Bester Chartplatz</span><b>${S.peak ? `#${S.peak}` : '–'}</b></div>
    </div>
    <h3 class="sub">Karriere</h3>
    <ul class="steps">${CONFIG.ranks.map((k, i) => `<li class="${i === r ? 'now' : i > r ? 'locked' : ''}"><span>${k.name}</span><span>${num(k.fans)} Fans</span></li>`).join('')}</ul>
    <label><input type="checkbox" data-act="tips" ${S.tips ? 'checked' : ''} style="width:auto"> Tipps vom Onkel anzeigen</label>
    <button class="btn wide ghost" data-act="reset">Neu anfangen</button>`;
}

function pagePhone() {
  S.phone.forEach((m) => { m.read = true; });
  save();
  return S.phone.length ? `<div class="list">${S.phone.map((m) => `<div class="msg"><small>${esc(m.from)} · Woche ${m.week}</small>${esc(m.body)}</div>`).join('')}</div>` : '<div class="empty">Keine Nachrichten.</div>';
}

const PAGES = { studio: pageStudio, tonspur: pageTonspur, charts: pageCharts, feed: pageFeed, gigs: pageGigs, courses: pageCourses, shop: pageShop, profile: pageProfile, phone: pagePhone };

function render() {
  $('clock').textContent = `Woche ${S.week} · ⚡${S.energy}`;
  if (S.page.startsWith('song:')) {
    const id = Number(S.page.split(':')[1]);
    const back = song(id)?.released ? 'tonspur' : 'studio';
    $('view').innerHTML = `<div class="navbar"><button class="nav-back" data-page="${back}">‹ ${TITLES[back]}</button><h2>Song</h2></div><div class="app-body">${pageSong(id)}</div>`;
    return;
  }
  if (S.page === 'home' || !PAGES[S.page]) {
    $('view').innerHTML = pageHome();
    return;
  }
  $('view').innerHTML = `<div class="navbar"><button class="nav-back" data-page="home">‹ Home</button><h2>${TITLES[S.page] ?? ''}</h2></div>
    <div class="app-body">${PAGES[S.page]()}</div>`;
}

/* ========== 7. Start ========== */
function save() {
  try { localStorage.setItem(CONFIG.saveKey, JSON.stringify(S)); return true; } catch { return false; }
}
function load() { try { const r = localStorage.getItem(CONFIG.saveKey); return r ? JSON.parse(r) : null; } catch { return null; } }

document.addEventListener('click', (e) => {
  const page = e.target.closest('[data-page]');
  if (page && !page.disabled) { S.page = page.dataset.page; render(); $('view').scrollTop = 0; return; }
  const act = e.target.closest('[data-act]');
  if (!act || act.disabled) return;
  const [a, b, c] = act.dataset.act.split(':');
  if (a === 'record') recordSong($('title').value.trim().slice(0, 40));
  if (a === 'polish') polishSong(Number(b), c);
  if (a === 'release') releaseSong(Number(b));
  if (a === 'del' && confirm('Aufnahme wirklich löschen?')) deleteSong(Number(b));
  if (a === 'upload') startUpload(c ? `${b}:${c}` : b);
  if (a === 'noimg') { pendingImg = null; render(); }
  if (a === 'post') {
    const t = $('post-text').value.trim().slice(0, 120);
    const sid = Number($('post-song').value) || null;
    if (!t && !pendingImg && !sid) { flash('Schreib etwas oder lade ein Bild hoch'); return; }
    post(t, sid, pendingImg);
  }
  if (a === 'delpost') { S.posts = S.posts.filter((p) => p.id !== Number(b)); save(); render(); }
  if (a === 'gig') playGig(Number(b));
  if (a === 'course') takeCourse(b);
  if (a === 'gear') buyGear(Number(b));
  if (a === 'label') signLabel(b === '1');
  if (a === 'week') {
    if (S.energy >= 30 && !confirm(`Du hast noch ${S.energy} Energie übrig – die verfällt. Trotzdem nächste Woche?`)) return;
    nextWeek();
  }
  if (a === 'tips') { S.tips = !S.tips; save(); render(); }
  if (a === 'intro') intro();
  if (a === 'reset' && confirm('Wirklich neu anfangen? Der Spielstand geht verloren.')) {
    try { localStorage.removeItem(CONFIG.saveKey); } catch { /* egal */ }
    location.reload();
  }
});

$('m-ok').addEventListener('click', () => $('modal').classList.add('hidden'));
$('genre').innerHTML = CONFIG.genres.map((g) => `<option>${g}</option>`).join('');
$('start-btn').addEventListener('click', () => {
  S = newState($('name').value.trim().slice(0, 24) || 'Flávinho', $('genre').value);
  text('Onkel Flávio', `Na, ${S.name}! Ab heute bin ich dein Manager. Nimm im Studio deinen ersten Song auf, dann bringen wir ihn raus.`);
  save();
  start();
  intro();
});

function intro() {
  showModal('So läuft es', `
    <p><b>1. Jede Woche ${CONFIG.energy} Energie.</b> Alles kostet Energie: Song aufnehmen ${CONFIG.cost.record}, Teil verbessern ${CONFIG.cost.polish}, veröffentlichen ${CONFIG.cost.release}, posten ${CONFIG.cost.post}, Auftritt ${CONFIG.cost.gig}, Kurs ${CONFIG.cost.course}.</p>
    <p><b>2. Studio.</b> Nimm Songs auf und verbessere Text, Beat, Gesang und Mix – je Teil bis zu 3×.</p>
    <p><b>3. Tonspur.</b> Veröffentliche Songs mit eigenem Cover-Bild. Gute Songs bringen Streams, Fans und Geld.</p>
    <p><b>4. Feed.</b> Poste Bilder und mach Werbung für deine Songs – das bringt Follower und Hype.</p>
    <p><b>5. Nächste Woche.</b> Dann werden Streams abgerechnet, die Charts kommen, und deine Energie ist wieder voll.</p>
    <p>Onkel Flávio schreibt dir oben auf dem Startbildschirm immer, was gerade sinnvoll ist.</p>`);
}

function start() {
  $('start').classList.add('hidden');
  $('view').classList.remove('hidden');
  render();
}

S = load();
if (S) start();
else $('start').classList.remove('hidden');
