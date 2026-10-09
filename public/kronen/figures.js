/* =========================================================
   Kronenkampf – gezeichnete Figuren (eigenes Design, keine Bilddateien)
   Jede Figur wird mit ein paar Formen auf das Canvas gemalt.
   Koordinaten: Figur steht ungefähr in einem Kasten von -10 … 10,
   die Füße bei y ≈ 9. Der Aufrufer verschiebt und skaliert.
   o = { team, dark, face (1 | -1), walk (Laufphase), moving, atk (0…1 Schlag), t (Zeit), aim (Winkel) }
   ========================================================= */
const INK = '#1a1226';
const SKIN = '#f2c9a0';

function fig(c, path, fill, stroke = true) {
  c.beginPath();
  path();
  c.fillStyle = fill;
  c.fill();
  if (stroke) { c.lineWidth = 1.3; c.strokeStyle = INK; c.stroke(); }
}
const circle = (c, x, y, r) => () => c.arc(x, y, r, 0, Math.PI * 2);
const ellipse = (c, x, y, rx, ry) => () => c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
const rect = (c, x, y, w, h, r = 2) => () => c.roundRect(x, y, w, h, r);
const poly = (c, pts) => () => { c.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) c.lineTo(pts[i], pts[i + 1]); c.closePath(); };

function legs(c, o, color, spread = 3, len = 5, y = 4) {
  const sw = o.moving ? Math.sin(o.walk) * 2.6 : 0;
  fig(c, rect(c, -spread - 1.6 + sw, y, 3.2, len, 1.2), color);
  fig(c, rect(c, spread - 1.6 - sw, y, 3.2, len, 1.2), color);
}

const FIGURES = {
  knight(c, o) {
    legs(c, o, '#4a4a5c');
    fig(c, rect(c, -6, -4, 12, 10, 3), o.team);
    fig(c, rect(c, -6, 1, 12, 2, 0), o.dark, false);
    // Schild vorne
    fig(c, circle(c, -6.5, 1.5, 4.6), '#cfd4de');
    fig(c, circle(c, -6.5, 1.5, 2), o.team, false);
    // Kopf mit Helm
    fig(c, circle(c, 0, -8.5, 5), '#b9bfcc');
    fig(c, rect(c, -3.6, -9.5, 7.2, 2, 1), INK, false);
    fig(c, poly(c, [-1, -14, 1, -14, 0.5, -17, -0.5, -17]), o.team);
    // Schwert schwingt beim Schlag
    c.save(); c.translate(6, 0); c.rotate(-1.1 + o.atk * 1.9);
    fig(c, rect(c, -1, -13, 2.2, 12, 1), '#e8ecf4');
    fig(c, rect(c, -2.6, -1.5, 5.4, 2, 1), '#8a6a3a');
    c.restore();
  },
  archer(c, o) {
    legs(c, o, '#5a4632', 2.4, 4.5);
    fig(c, poly(c, [-5.5, 6, 5.5, 6, 3.5, -4, -3.5, -4]), o.team);
    fig(c, circle(c, 0, -7.5, 4.6), o.dark); // Kapuze
    fig(c, circle(c, 0.8, -6.8, 3), SKIN, false);
    fig(c, circle(c, 2, -7.2, 0.7), INK, false);
    // Bogen, Sehne wird beim Schuss gespannt
    const pull = o.atk * 3;
    c.lineWidth = 1.8; c.strokeStyle = '#8a5a2a';
    c.beginPath(); c.arc(5, -1, 6, -1.2, 1.2); c.stroke();
    c.lineWidth = 0.8; c.strokeStyle = '#f4ead0';
    c.beginPath(); c.moveTo(5 + Math.cos(-1.2) * 6, -1 + Math.sin(-1.2) * 6); c.lineTo(5 - pull, -1); c.lineTo(5 + Math.cos(1.2) * 6, -1 + Math.sin(1.2) * 6); c.stroke();
  },
  giant(c, o) {
    legs(c, o, '#6b4a2a', 4.5, 5, 6);
    fig(c, rect(c, -9, -7, 18, 14, 6), '#c58b52');
    fig(c, rect(c, -9, 2, 18, 3, 0), o.team, false);
    fig(c, circle(c, 0, -11, 5.5), '#d9a066');
    fig(c, circle(c, 2, -11.5, 0.9), INK, false);
    fig(c, rect(c, -2.5, -8.6, 5, 1.2, 0.6), '#7a4a22', false);
    // Fäuste: die vordere schlägt zu
    const punch = o.atk * 6;
    fig(c, circle(c, -10, 0, 3.6), '#d9a066');
    fig(c, circle(c, 10 + punch, -1 - punch * 0.3, 3.8), '#d9a066');
  },
  goblin(c, o) {
    legs(c, o, '#3d6b2a', 2.4, 4, 4);
    fig(c, rect(c, -4.5, -2, 9, 7, 2.5), o.team);
    fig(c, poly(c, [-4, -6, -10, -9, -4, -3]), '#6cc24a'); // Ohren
    fig(c, poly(c, [4, -6, 10, -9, 4, -3]), '#6cc24a');
    fig(c, circle(c, 0, -5.5, 5), '#6cc24a');
    fig(c, circle(c, 2, -6, 1), '#ffe14a', false);
    fig(c, rect(c, -1, -2.8, 4, 1, 0.5), INK, false);
    c.save(); c.translate(5, 1); c.rotate(-0.6 + o.atk * 1.6);
    fig(c, poly(c, [-0.8, 0, 0.8, 0, 0, -7]), '#e8ecf4');
    c.restore();
  },
  bones(c, o) {
    legs(c, o, '#efe8d8', 2.2, 4.5, 3.5);
    c.lineWidth = 1.4; c.strokeStyle = '#efe8d8';
    for (let i = 0; i < 3; i++) { c.beginPath(); c.moveTo(-3.5, -1 + i * 1.8); c.lineTo(3.5, -1 + i * 1.8); c.stroke(); }
    fig(c, rect(c, -0.7, -2, 1.4, 6, 0.5), '#efe8d8', false);
    fig(c, rect(c, -4.5, -2.5, 9, 2, 1), o.team, false); // Halstuch in Teamfarbe
    fig(c, circle(c, 0, -6.5, 4.4), '#f6f1e4');
    fig(c, circle(c, -1.5, -7, 1.1), INK, false);
    fig(c, circle(c, 1.7, -7, 1.1), INK, false);
    c.save(); c.translate(4.5, 0); c.rotate(-0.8 + o.atk * 1.7);
    fig(c, rect(c, -0.7, -7, 1.4, 7, 0.5), '#cfd4de');
    c.restore();
  },
  dragon(c, o) {
    const flap = Math.sin(o.t * 12) * 0.5;
    // Flügel
    c.save(); c.translate(-2, -3); c.rotate(-0.4 - flap);
    fig(c, poly(c, [0, 0, -12, -8, -9, 1]), '#9b7be8');
    c.restore();
    c.save(); c.translate(2, -3); c.rotate(0.4 + flap);
    fig(c, poly(c, [0, 0, 12, -8, 9, 1]), '#9b7be8');
    c.restore();
    fig(c, ellipse(c, 0, 1, 7, 6), '#6fbf4a');
    fig(c, ellipse(c, 0, 3, 4, 3), o.team, false);
    fig(c, poly(c, [-6, 3, -11, 6, -6, 6]), '#6fbf4a'); // Schwanz
    fig(c, circle(c, 5, -5, 4.4), '#6fbf4a');
    fig(c, ellipse(c, 8.5, -4, 2.6, 2), '#86d860');
    fig(c, circle(c, 5.6, -6.2, 0.9), INK, false);
    fig(c, poly(c, [3, -9, 4.5, -12, 6, -9]), '#f4ead0');
    if (o.atk > 0.2) {
      c.globalAlpha = o.atk;
      fig(c, circle(c, 13, -4, 3 + o.atk * 2), '#ff9a2a', false);
      fig(c, circle(c, 12, -4, 1.8), '#ffe14a', false);
      c.globalAlpha = 1;
    }
  },
  wizard(c, o) {
    legs(c, o, '#3a2a5c', 2.4, 3.5, 5);
    fig(c, poly(c, [-6.5, 8, 6.5, 8, 3.5, -4, -3.5, -4]), o.team);
    fig(c, circle(c, 0, -6.5, 4.3), SKIN);
    fig(c, poly(c, [-3, -4.5, 3, -4.5, 0, 1]), '#f4f4f4'); // Bart
    fig(c, poly(c, [-6.5, -9, 6.5, -9, 1, -19]), o.dark); // Hut
    fig(c, circle(c, 1.8, -7, 0.8), INK, false);
    // Stab mit leuchtender Kugel
    c.lineWidth = 1.8; c.strokeStyle = '#8a5a2a';
    c.beginPath(); c.moveTo(7, 8); c.lineTo(7, -9); c.stroke();
    const glow = 2.4 + o.atk * 2.4;
    c.globalAlpha = 0.35 + o.atk * 0.5;
    fig(c, circle(c, 7, -10.5, glow + 2), '#ffb43c', false);
    c.globalAlpha = 1;
    fig(c, circle(c, 7, -10.5, 2.3), '#ffe14a');
  },
  balloon(c, o) {
    c.lineWidth = 0.9; c.strokeStyle = '#6b4a2a';
    c.beginPath(); c.moveTo(-5, -1); c.lineTo(-3, 6); c.moveTo(5, -1); c.lineTo(3, 6); c.stroke();
    fig(c, ellipse(c, 0, -8, 9.5, 9), o.team);
    c.fillStyle = o.dark;
    c.beginPath(); c.ellipse(0, -8, 3.2, 9, 0, 0, Math.PI * 2); c.fill();
    fig(c, rect(c, -4, 5, 8, 5, 1.5), '#a0703a');
    // Bombe darunter, fällt beim Abwurf ein Stück
    fig(c, circle(c, 0, 12.5 + o.atk * 4, 2.6), '#2a2a36');
  },
  cannon(c, o) {
    fig(c, rect(c, -9, 1, 18, 7, 3), '#8a6a3a');
    fig(c, circle(c, -6, 8, 2.6), '#4a3a2a');
    fig(c, circle(c, 6, 8, 2.6), '#4a3a2a');
    fig(c, rect(c, -9, 1, 18, 2, 0), o.team, false);
    c.save(); c.translate(0, -1); c.rotate(o.aim ?? 0);
    const kick = o.atk * 2.5;
    fig(c, rect(c, -3 - kick, -3, 14, 6, 2.5), '#3d3d4c');
    fig(c, circle(c, -3 - kick, 0, 4), '#4d4d5e');
    c.restore();
  },
  king(c, o) {
    fig(c, poly(c, [-7, 8, 7, 8, 5, -3, -5, -3]), o.team);
    fig(c, rect(c, -7, 5, 14, 3, 0), '#f4ead0', false);
    fig(c, circle(c, 0, -7, 5), SKIN);
    fig(c, poly(c, [-4, -5, 4, -5, 0, 2]), '#e8e2d2'); // Bart
    fig(c, poly(c, [-5, -10, -5, -15, -2.5, -12.5, 0, -16, 2.5, -12.5, 5, -15, 5, -10]), '#ffc93c');
    fig(c, circle(c, -1.8, -7.5, 0.8), INK, false);
    fig(c, circle(c, 1.8, -7.5, 0.8), INK, false);
  },
};
FIGURES.archers = FIGURES.archer;
FIGURES.goblins = FIGURES.goblin;

/** Figur an (x, y) malen; size ≈ halbe Höhe in Spielfeld-Einheiten. */
function drawFigure(c, key, x, y, size, o) {
  const f = FIGURES[key];
  if (!f) return;
  c.save();
  c.translate(x, y);
  const s = size / 10;
  c.scale(s * (o.face || 1), s);
  f(c, o);
  c.restore();
}

/** Zauber-Symbole für die Karten */
function drawSpellIcon(c, key, x, y, size) {
  c.save(); c.translate(x, y); c.scale(size / 10, size / 10);
  if (key === 'fireball') {
    fig(c, poly(c, [-2, -9, 8, -2, 3, 2]), '#ff9a2a', false);
    fig(c, circle(c, -1, 2, 7), '#ff7a1a');
    fig(c, circle(c, -2, 3, 4), '#ffe14a', false);
  } else {
    for (let i = -1; i <= 1; i++) {
      c.save(); c.translate(i * 5, i === 0 ? -2 : 1); c.rotate(0.15 * i);
      c.lineWidth = 1.6; c.strokeStyle = '#8a5a2a';
      c.beginPath(); c.moveTo(0, -8); c.lineTo(0, 7); c.stroke();
      fig(c, poly(c, [-2.2, 4, 2.2, 4, 0, 9]), '#cfd4de');
      fig(c, poly(c, [-2, -8, 2, -8, 0, -4]), '#ff5a5a', false);
      c.restore();
    }
  }
  c.restore();
}

/** Kartenbild als Datei-URL (einmal gezeichnet, danach aus dem Zwischenspeicher). */
const ART = {};
function cardArt(key) {
  if (ART[key]) return ART[key];
  const cv = document.createElement('canvas');
  cv.width = cv.height = 96;
  const c = cv.getContext('2d');
  const card = CARDS[key];
  if (card.type === 'spell') drawSpellIcon(c, key, 48, 50, 34);
  else drawFigure(c, key, 48, key === 'balloon' ? 62 : 52, key === 'giant' ? 30 : key === 'bones' || key === 'goblins' ? 36 : 33,
    { team: '#2f6bff', dark: '#1f3f9a', face: 1, walk: 0, moving: false, atk: 0, t: 0.3, aim: -0.3 });
  ART[key] = cv.toDataURL();
  return ART[key];
}
