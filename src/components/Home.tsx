import { useEffect, useState } from 'react';
import { getClub } from '../data/leagues';
import { currentClubId, seasonLabel } from '../game/player';
import { deleteCareer, listCareers } from '../game/storage';
import type { Career } from '../game/types';

interface Props {
  onNew: () => void;
  onFame: () => void;
  onAchievements: () => void;
  onLoad: (career: Career) => void;
}

type PlaceId = 'stadium' | 'academy' | 'museum' | 'trophies' | 'lockers' | 'kiosk' | 'warehouse';

interface Place {
  id: PlaceId;
  name: string;
  /** Kurzname für die Favoritenleiste. */
  short: string;
  kind: string;
  icon: string;
  /** Pin-Position in Karten-Koordinaten (viewBox 800 × 700). */
  x: number;
  y: number;
  color: string;
}

const PLACES: Place[] = [
  { id: 'stadium', name: 'Arena', short: 'Arena', kind: 'Stadion · Weiterspielen', icon: '🏟️', x: 400, y: 300, color: 'var(--pin-red)' },
  { id: 'academy', name: 'Nachwuchsakademie', short: 'Akademie', kind: 'Trainingsgelände · Neue Karriere', icon: '⚽', x: 235, y: 215, color: 'var(--pin-green)' },
  { id: 'museum', name: 'Fußballmuseum', short: 'Museum', kind: 'Museum · Hall of Fame', icon: '🏛️', x: 575, y: 205, color: 'var(--pin-brown)' },
  { id: 'trophies', name: 'Trophäenhaus', short: 'Erfolge', kind: 'Sehenswürdigkeit · Erfolge', icon: '🏆', x: 590, y: 420, color: 'var(--pin-orange)' },
  { id: 'lockers', name: 'Spielerwohnheim', short: 'Zuhause', kind: 'Wohnen · Gespeicherte Karrieren', icon: '🏠', x: 230, y: 430, color: 'var(--pin-blue)' },
  { id: 'kiosk', name: 'Kiosk am Fluss', short: 'Kiosk', kind: 'Kiosk · Lotto & Stadionwurst', icon: '🥨', x: 455, y: 505, color: 'var(--pin-purple)' },
  { id: 'warehouse', name: 'Lagerhalle 13', short: 'Halle 13', kind: 'Industrie · Besser nicht fragen', icon: '🕶️', x: 345, y: 420, color: 'var(--pin-gray)' },
];

const FOCUS_SCALE = 1.2;

export default function Home({ onNew, onFame, onAchievements, onLoad }: Props) {
  const [saves, setSaves] = useState(listCareers);
  const [selected, setSelected] = useState<PlaceId | null>(null);
  const place = PLACES.find((p) => p.id === selected) ?? null;
  const latest = [...saves].sort((a, b) => b.updatedAt - a.updatedAt)[0];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setSelected(null);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const remove = (c: Career) => {
    if (!confirm(`Karriere von ${c.player.name} wirklich löschen?`)) return;
    deleteCareer(c.id);
    setSaves(listCareers());
  };

  // „Hinfliegen“: gewählten Ort in die Mitte holen und leicht heranzoomen.
  const focus = place
    ? `translate(${400 - place.x * FOCUS_SCALE}px, ${330 - place.y * FOCUS_SCALE}px) scale(${FOCUS_SCALE})`
    : 'translate(0px, 0px) scale(1)';

  return (
    <main className="maphome">
      <div className="map" onClick={() => setSelected(null)}>
        <svg viewBox="0 0 800 700" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Karte der Fußballstadt">
          <g className="map-world" style={{ transform: focus }}>
            <MapBase />
            {PLACES.map((p) => (
              <Pin key={p.id} place={p} active={selected === p.id} dimmed={!!selected && selected !== p.id} onSelect={() => setSelected(p.id)} />
            ))}
          </g>
        </svg>
        <div className="map-chip">
          <span className="map-chip-dot" aria-hidden="true" />
          FC Karriere-Simulator
        </div>
      </div>

      <section className="sheet" aria-live="polite">
        <div className="sheet-grabber" aria-hidden="true" />
        {!place && (
          <>
            <h1 className="sheet-title">Wohin?</h1>
            <p className="sheet-sub">Tippe auf einen Ort in der Stadt.</p>
            <div className="fav-row">
              {PLACES.slice(0, 5).map((p) => (
                <button key={p.id} className="fav" onClick={() => setSelected(p.id)}>
                  <span className="fav-icon" style={{ background: p.color }}>{p.icon}</span>
                  <span className="fav-label">{p.short}</span>
                </button>
              ))}
            </div>
            {latest && (
              <>
                <h2 className="sheet-h">Zuletzt</h2>
                <SaveRow career={latest} onLoad={onLoad} />
              </>
            )}
          </>
        )}

        {place && (
          <div className="place">
            <div className="place-head">
              <span className="fav-icon big" style={{ background: place.color }}>{place.icon}</span>
              <div className="grow">
                <h1 className="sheet-title">{place.name}</h1>
                <p className="sheet-sub">{place.kind}</p>
              </div>
              <button className="sheet-close" onClick={() => setSelected(null)} aria-label="Schließen">✕</button>
            </div>
            <PlaceBody
              id={place.id}
              saves={saves}
              latest={latest}
              onNew={onNew}
              onFame={onFame}
              onAchievements={onAchievements}
              onLoad={onLoad}
              onRemove={remove}
            />
          </div>
        )}

        <p className="disclaimer">
          Private Fan-Seite ohne Verbindung zu EA SPORTS. Vereinsstärken und Spielerwerte sind eigene Schätzungen
          (Stand 2025/26), keine offiziellen Ratings. Spielstände werden nur in diesem Browser gespeichert.
        </p>
      </section>
    </main>
  );
}

function PlaceBody({
  id, saves, latest, onNew, onFame, onAchievements, onLoad, onRemove,
}: {
  id: PlaceId;
  saves: Career[];
  latest: Career | undefined;
  onNew: () => void;
  onFame: () => void;
  onAchievements: () => void;
  onLoad: (c: Career) => void;
  onRemove: (c: Career) => void;
}) {
  const hasHistory = saves.some((c) => c.history.length > 0);
  switch (id) {
    case 'stadium':
      return latest ? (
        <>
          <p className="place-text">Flutlicht an, die Kurve singt. Deine letzte Karriere wartet auf dich.</p>
          <SaveRow career={latest} onLoad={onLoad} />
          <div className="place-actions">
            <button className="btn primary big" onClick={() => onLoad(latest)}>Weiterspielen</button>
            <button className="btn secondary big" onClick={onNew}>Neue Karriere</button>
          </div>
        </>
      ) : (
        <>
          <p className="place-text">Das Stadion ist leer. Noch. Starte in der Akademie deine erste Karriere.</p>
          <div className="place-actions">
            <button className="btn primary big" onClick={onNew}>Neue Karriere starten</button>
          </div>
        </>
      );
    case 'academy':
      return (
        <>
          <p className="place-text">
            Eigener Spieler, echter Profi, Kultlegende oder ein gescheitertes Talent mit zweiter Chance – hier fängt alles an.
          </p>
          <div className="place-actions">
            <button className="btn primary big" onClick={onNew}>Neue Karriere starten</button>
          </div>
        </>
      );
    case 'museum':
      return (
        <>
          <p className="place-text">
            {hasHistory ? 'Alle deine Karrieren im Vergleich – Rekorde, Titel und Legendenpunkte.' : 'Die Vitrinen sind noch leer. Spiel erst eine Saison.'}
          </p>
          <div className="place-actions">
            <button className="btn primary big" onClick={onFame} disabled={!hasHistory}>Hall of Fame öffnen</button>
          </div>
        </>
      );
    case 'trophies':
      return (
        <>
          <p className="place-text">{saves.length ? 'Welche Erfolge hast du schon freigeschaltet?' : 'Noch keine Karriere, noch keine Erfolge.'}</p>
          <div className="place-actions">
            <button className="btn primary big" onClick={onAchievements} disabled={!saves.length}>Erfolge ansehen</button>
          </div>
        </>
      );
    case 'lockers':
      return saves.length ? (
        <ul className="save-list">
          {saves.map((c) => (
            <li key={c.id}>
              <SaveRow career={c} onLoad={onLoad} />
              <button className="btn ghost small" onClick={() => onRemove(c)} aria-label={`${c.player.name} löschen`}>Löschen</button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="place-text">Alle Zimmer frei. Noch wohnt hier niemand.</p>
      );
    case 'kiosk':
      return (
        <p className="place-text">
          „Lottoscheine gibt’s nur in der Sommerpause, Chef. Stadionwurst immer.“ – Der Kioskbesitzer hat übrigens schon ein Foto
          an der Wand frei, falls du mal gewinnst.
        </p>
      );
    case 'warehouse':
      return (
        <p className="place-text">
          Rolltor zu, Fenster verdunkelt. Hier soll mal jemand drei Jahre festgehalten worden sein. Ein Name fällt immer wieder,
          aber niemand spricht ihn laut aus.
        </p>
      );
  }
}

function SaveRow({ career: c, onLoad }: { career: Career; onLoad: (c: Career) => void }) {
  return (
    <button className="save-main" onClick={() => onLoad(c)}>
      <span className="save-ovr">{c.player.ovr}</span>
      <span>
        <strong>{c.player.name}</strong>
        <small>
          {c.phase === 'winter' ? 'Winterpause · ' : ''}
          {c.phase === 'retired'
            ? `Karriere beendet · ${c.history.length} Saisons`
            : `${getClub(currentClubId(c.player)).name} · Saison ${seasonLabel(c.year)} · ${c.player.age} Jahre`}
        </small>
      </span>
    </button>
  );
}

function Pin({ place, active, dimmed, onSelect }: { place: Place; active: boolean; dimmed: boolean; onSelect: () => void }) {
  const select = (e: React.MouseEvent | React.KeyboardEvent) => {
    e.stopPropagation();
    onSelect();
  };
  return (
    <g
      className={`pin ${active ? 'active' : ''} ${dimmed ? 'dimmed' : ''}`}
      transform={`translate(${place.x} ${place.y})`}
      role="button"
      tabIndex={0}
      aria-label={`${place.name} – ${place.kind}`}
      onClick={select}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && select(e)}
    >
      <g className="pin-body">
        <circle r="21" className="pin-halo" />
        <circle r="17" fill={place.color} className="pin-dot" />
        <path d="M-6 15 L0 25 L6 15 Z" fill={place.color} />
        <text className="pin-glyph" y="6" textAnchor="middle">{place.icon}</text>
      </g>
      <text className="pin-label" y="45" textAnchor="middle">{place.name}</text>
    </g>
  );
}

/** Die Stadt selbst: Land, Fluss, Parks, Straßen, Häuserblöcke, Stadion, Trainingsplätze. */
function MapBase() {
  return (
    <g aria-hidden="true">
      <rect x="-400" y="-400" width="1600" height="1500" className="m-land" />

      {/* Parks */}
      <path className="m-park" d="M120 140 Q170 110 300 130 L320 290 Q250 310 150 290 Q100 220 120 140 Z" />
      <path className="m-park" d="M520 560 Q600 540 660 600 L640 700 L500 700 Z" />
      <circle className="m-park" cx="640" cy="120" r="50" />

      {/* Fluss */}
      <path className="m-water" d="M-100 610 C 120 540, 260 600, 420 560 S 700 470, 900 520 L 900 610 C 700 570, 560 640, 420 640 S 150 640, -100 700 Z" />
      <text className="m-water-label" x="160" y="620" transform="rotate(-6 160 620)">Nachspielzeit</text>

      {/* Häuserblöcke */}
      {BLOCKS.map(([x, y, w, h], i) => (
        <rect key={i} className="m-block" x={x} y={y} width={w} height={h} rx="6" />
      ))}

      {/* Straßen: erst Rand, dann Fläche */}
      {ROADS.map((d, i) => <path key={`e${i}`} className="m-road-edge" d={d} />)}
      {ROADS.map((d, i) => <path key={`r${i}`} className="m-road" d={d} />)}
      <path className="m-main-edge" d={MAIN_ROAD} />
      <path className="m-main" d={MAIN_ROAD} />
      {/* Brücke */}
      <path className="m-bridge" d="M470 470 L470 700" />

      <text className="m-street" x="560" y="336">Anstoßallee</text>
      <text className="m-street" x="92" y="376" transform="rotate(-90 92 376)">Flankenweg</text>
      <text className="m-street" x="276" y="94">Abseitsstraße</text>
      <text className="m-park-label" x="210" y="160">Elfmeterpark</text>

      {/* Trainingsplätze */}
      <Pitch x={170} y={225} w={70} h={46} />
      <Pitch x={250} y={225} w={70} h={46} />

      {/* Stadion */}
      <ellipse cx="400" cy="300" rx="112" ry="84" className="m-stadium-outer" />
      <ellipse cx="400" cy="300" rx="96" ry="70" className="m-stadium-stand" />
      <Pitch x={345} y={265} w={110} h={70} />

      {/* Museum mit Säulen */}
      <rect x="540" y="168" width="70" height="44" rx="4" className="m-landmark" />
      {[552, 566, 580, 594].map((x) => <rect key={x} x={x} y="178" width="5" height="28" className="m-column" />)}

      {/* Trophäenhaus */}
      <rect x="560" y="395" width="60" height="50" rx="10" className="m-landmark" />
      {/* Wohnheim */}
      {[[195, 400], [230, 400], [265, 400], [195, 440], [265, 440]].map(([x, y]) => (
        <rect key={`${x}-${y}`} x={x - 14} y={y - 12} width="28" height="24" rx="4" className="m-house" />
      ))}
      {/* Lagerhalle */}
      <rect x="305" y="405" width="84" height="46" rx="3" className="m-warehouse" />
    </g>
  );
}

function Pitch({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx="3" className="m-pitch" />
      <rect x={x + 4} y={y + 4} width={w - 8} height={h - 8} className="m-line" />
      <line x1={x + w / 2} y1={y + 4} x2={x + w / 2} y2={y + h - 4} className="m-line" />
      <circle cx={x + w / 2} cy={y + h / 2} r={Math.min(w, h) / 7} className="m-line" />
      <rect x={x + 4} y={y + h / 2 - h / 5} width={w / 8} height={(h * 2) / 5} className="m-line" />
      <rect x={x + w - 4 - w / 8} y={y + h / 2 - h / 5} width={w / 8} height={(h * 2) / 5} className="m-line" />
    </g>
  );
}

const MAIN_ROAD = 'M-100 360 L 900 360';
const ROADS = [
  'M100 -100 L100 800',
  'M-100 100 L900 100',
  'M340 100 L340 200',
  'M520 -100 L520 520',
  'M700 -100 L700 800',
  'M100 520 L700 480',
  'M100 250 L150 250',
  'M470 360 L470 520',
  'M-100 470 L100 470',
];

const BLOCKS: [number, number, number, number][] = [
  [-60, -60, 140, 140], [120, -60, 200, 140], [360, -60, 140, 140], [540, -60, 140, 55], [720, -60, 160, 140],
  [360, 120, 140, 50], [720, 120, 160, 220], [540, 250, 140, 90],
  [-60, 120, 140, 220], [-60, 380, 140, 70], [540, 380, 140, 90],
  [720, 380, 160, 80], [130, 470, 140, 30], [-60, 490, 140, 60],
];
