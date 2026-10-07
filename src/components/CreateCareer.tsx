import { useEffect, useRef, useState } from 'react';
import { play } from '../sound';
import { motionReduced } from '../settings';
import { CLUBS, LEAGUES, getClub, getLeague } from '../data/leagues';
import { NATIONS, POSITIONS, REAL_PLAYERS, type RealPlayerTemplate } from '../data/players';
import { CULT_LEGENDS, FAILED_TALENTS, HANNOVER_2018, LEGENDS, type LegendTemplate } from '../data/legends';
import { createCareer } from '../game/career';
import { MAX_TRAITS, TRAITS, getTrait, type TraitId } from '../game/traits';
import { pick } from '../game/random';
import {
  ATTR_WEIGHTS, BEARDS, DEFAULT_AVATAR, HAIR_COLORS, HAIR_STYLES, IDEAL_HEIGHT, MAX_PER_ATTR, ORIGINS, POINT_POOL, SKIN_TONES,
  ORIGIN_ODDS, applyOrigin, evaluateBuild, getOrigin, randomAvatar, randomPoints, rollBuild, scoutLabel,
  spinOrigin, storeSpin, storedSpin, spinFate, storeFate, storedFate, FATE_TIER_WEIGHT, type Fate,
  type Avatar, type OriginId,
} from '../game/creator';
import { FIRST, LAST } from '../game/rival';
import { cardTier } from '../game/player';
import UtCard from './UtCard';
import { attributeLabels } from '../game/player';
import type { Career, Position } from '../game/types';

interface Props {
  onCancel: () => void;
  onCreate: (career: Career) => void;
}


type Tab = 'own' | 'real' | 'legends' | 'cult' | 'failed' | 'h96';
/** Reiter: [ID, langer Name, kurzer Name fürs Handy]. */
const TABS: [Tab, string, string][] = [
  ['own', 'Eigener Spieler', '✏️ Eigener'],
  ['real', 'Echter Spieler', '👤 Echter'],
  ['legends', '⭐ Legenden', '⭐ Legenden'],
  ['cult', '🧡 Kult-Helden', '🧡 Kult'],
  ['failed', '💔 Zweite Chance', '💔 2. Chance'],
  ['h96', '🕰️ 96 von 2018', '🕰️ 96 (2018)'],
];

export default function CreateCareer({ onCancel, onCreate }: Props) {
  const [tab, setTab] = useState<Tab>('own');

  return (
    <main className="create">
      <div className="topbar">
        <button className="nav-back" onClick={onCancel}>‹ Zurück</button>
        <h1>Neue Karriere</h1>
      </div>
      <div className="tabs">
        {TABS.map(([id, long, short]) => (
          <button key={id} className={tab === id ? 'active' : ''} onClick={() => setTab(id)}>
            <span className="t-long">{long}</span><span className="t-short">{short}</span>
          </button>
        ))}
      </div>
      {tab === 'own' && <OwnPlayer onCreate={onCreate} />}
      {tab === 'real' && <RealPlayer onCreate={onCreate} />}
      {tab === 'legends' && <LegendPicker onCreate={onCreate} list={LEGENDS} intro={LEGEND_INTRO} />}
      {tab === 'cult' && <LegendPicker onCreate={onCreate} list={CULT_LEGENDS} intro={CULT_INTRO} />}
      {tab === 'failed' && <LegendPicker onCreate={onCreate} list={FAILED_TALENTS} intro={FAILED_INTRO} secondChance />}
      {tab === 'h96' && <LegendPicker onCreate={onCreate} list={HANNOVER_2018} intro={H96_INTRO} />}
    </main>
  );
}

function OwnPlayer({ onCreate }: { onCreate: (c: Career) => void }) {
  const [name, setName] = useState('');
  const [nation, setNation] = useState('Deutschland');
  const [position, setPosition] = useState<Position>('ST');
  const [age, setAge] = useState(17);
  // Platzhalter bis zum Auslosen (Größe/Gewicht kommen aus dem Schicksals-Automaten).
  const height = 182;
  const weight = 76;
  const [points, setPoints] = useState<number[]>([0, 0, 0, 0, 0, 0]);
  const [traits, setTraits] = useState<TraitId[]>([]);
  // Herkunft wird per Glücksrad ausgelost – einmal, nicht wählbar.
  const [origin, setOrigin] = useState<OriginId | null>(storedSpin);
  // Größe, Gewicht und Startverein: ebenfalls ausgelost (Schicksals-Automat).
  const [fate, setFate] = useState<Fate | null>(storedFate);
  const fh = fate?.height ?? height;
  const fw = fate?.weight ?? weight;
  const [avatar, setAvatar] = useState<Avatar>(DEFAULT_AVATAR);

  // Live-Vorschau: so sieht die Karte zum Start ungefähr aus.
  const built = evaluateBuild({ position, age, height: fh, weight: fw, points });
  const preview = origin ? applyOrigin(built, origin, position === 'TW') : built;
  const tier = cardTier(preview.ovr);
  const previewCard = {
    id: 'preview', name: name.trim() || 'Dein Spieler', position, nation, ovr: preview.ovr, avatar,
    club: fate ? getClub(fate.clubId).name : 'Startverein offen', variant: tier === 'bronze' ? ('silver' as const) : tier,
  };

  const randomize = () => {
    const pos = pick(POSITIONS).id;
    setName(`${pick(FIRST)} ${pick(LAST)}`);
    setNation(pick(NATIONS).name);
    setPosition(pos);
    setAge(pick([16, 17, 17, 18, 18, 19, 20]));
    setPoints(randomPoints(pos));
    setTraits(TRAITS.filter(() => Math.random() < 0.15).slice(0, 2).map((t) => t.id));
    setAvatar(randomAvatar());
  };


  const start = () => {
    if (!origin || !fate) return;
    storeSpin(null);
    storeFate(null);
    const rolled = rollBuild({ position, age, height: fh, weight: fw, points });
    const o = getOrigin(origin);
    const ovr = rolled.ovr + o.ovr;
    const potential = Math.max(ovr + 4, Math.min(94, rolled.potential + o.potential));
    const profile = applyOrigin({ ovr, potential, offsets: rolled.profile }, origin, position === 'TW').offsets;
    onCreate(
      createCareer({ name: name.trim() || 'Namenloser Held', nation, position, age, ovr, potential, clubId: fate.clubId, traits, profile, height: fh, weight: fw, origin, avatar }),
    );
  };

  return (
    <section className="panel form">
      <div className="create-preview">
        <UtCard card={previewCard} size="md" />
        <div className="create-preview-info">
          <strong>{previewCard.name}</strong>
          <small>Start ca. {preview.ovr} · Potenzial ~{preview.potential} ({scoutLabel(preview.potential)})</small>
          <small>{origin ? `${getOrigin(origin).icon} ${getOrigin(origin).name}` : '🎡 Herkunft noch nicht ausgelost'}</small>
          <button type="button" className="btn secondary small" onClick={randomize}>🎲 Zufallsspieler</button>
        </div>
      </div>
      <label>
        Name
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="z. B. Max Mustermann" maxLength={40} />
      </label>
      <div className="row">
        <label>
          Nation
          <select value={nation} onChange={(e) => setNation(e.target.value)}>
            {NATIONS.map((n) => <option key={n.name}>{n.name}</option>)}
          </select>
        </label>
        <label>
          Position
          <select value={position} onChange={(e) => setPosition(e.target.value as Position)}>
            {POSITIONS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
          </select>
        </label>
        <label>
          Alter
          <select value={age} onChange={(e) => setAge(Number(e.target.value))}>
            {[16, 17, 18, 19, 20].map((a) => <option key={a} value={a}>{a} Jahre</option>)}
          </select>
        </label>
      </div>

      <fieldset>
        <legend>Herkunft</legend>
        <OriginWheel result={origin} onResult={(id) => { setOrigin(id); storeSpin(id); }} />
      </fieldset>

      <AvatarEditor avatar={avatar} onChange={setAvatar} />

      <fieldset>
        <legend>Charakter (optional, bis zu {MAX_TRAITS})</legend>
        <TraitChips selected={traits} onToggle={(id) =>
          setTraits((t) => (t.includes(id) ? t.filter((x) => x !== id) : t.length < MAX_TRAITS ? [...t, id] : t))} />
      </fieldset>

      <fieldset>
        <legend>Schicksal: Größe, Gewicht, Startverein</legend>
        <FateMachine fate={fate} onResult={(f) => { setFate(f); storeFate(f); }} />
      </fieldset>

      <Builder position={position} age={age} height={fh} weight={fw} points={points} origin={origin} fated={!!fate} onPoints={setPoints} />

      <button className="btn primary big" onClick={start} disabled={!origin || !fate}>
        {!origin ? 'Erst das Glücksrad drehen' : !fate ? 'Erst den Schicksals-Automaten drehen' : 'Karriere starten'}
      </button>
    </section>
  );
}

const FATE_CLUBS = CLUBS.filter((c) => !c.name.endsWith(' II')).map((c) => ({ id: c.id, tier: getLeague(c.leagueId).tier }));

/** Schicksals-Automat: drei Walzen (Größe, Gewicht, Verein) – einmal drehen, das Ergebnis bleibt. */
function FateMachine({ fate, onResult }: { fate: Fate | null; onResult: (f: Fate) => void }) {
  const [spinning, setSpinning] = useState<Fate | null>(null);
  const [stopped, setStopped] = useState(0);
  const [tick, setTick] = useState(0);
  const done = useRef(onResult);
  done.current = onResult;

  useEffect(() => {
    if (!spinning) return;
    const quick = motionReduced();
    const iv = setInterval(() => setTick((t) => t + 1), 70);
    const stops = (quick ? [30, 60, 90] : [1100, 1800, 2600]).map((ms, i) =>
      setTimeout(() => { setStopped(i + 1); play('walkStep'); }, ms));
    const end = setTimeout(() => {
      clearInterval(iv);
      done.current(spinning);
      setSpinning(null);
      setStopped(0);
      play('reveal');
    }, quick ? 120 : 2900);
    return () => { clearInterval(iv); stops.forEach(clearTimeout); clearTimeout(end); };
  }, [spinning]);

  const spin = () => {
    if (fate || spinning) return;
    setSpinning(spinFate(FATE_CLUBS));
    play('packShake');
  };

  const randomClub = () => getClub(FATE_CLUBS[(tick * 7) % FATE_CLUBS.length].id).name;
  const reel = (i: number, final: string, random: string) => (
    <div className={`fate-reel ${spinning && stopped <= i ? 'spin' : ''}`}>
      <span>{spinning ? (stopped > i ? final : random) : fate ? final : '?'}</span>
    </div>
  );
  const show = spinning ?? fate;
  return (
    <div className="fate">
      <div className="fate-reels">
        {reel(0, show ? `${show.height} cm` : '?', `${160 + ((tick * 13) % 45)} cm`)}
        {reel(1, show ? `${show.weight} kg` : '?', `${58 + ((tick * 11) % 40)} kg`)}
        {reel(2, show ? getClub(show.clubId).name : '?', randomClub())}
      </div>
      {fate ? (
        <small className="muted">
          {getClub(fate.clubId).name} · {getLeague(getClub(fate.clubId).leagueId).name}. Das Schicksal hat entschieden – das bleibt so.
        </small>
      ) : (
        <>
          <button type="button" className="btn primary" onClick={spin} disabled={!!spinning}>{spinning ? 'Dreht …' : '🎰 Schicksal drehen'}</button>
          <small className="muted">
            Startverein aus allen Ligen – je tiefer die Liga, desto wahrscheinlicher ({Object.entries(FATE_TIER_WEIGHT).map(([t, w]) => `${t}. Liga ${w} %`).join(' · ')}).
          </small>
        </>
      )}
    </div>
  );
}

const WHEEL_COLORS: Record<OriginId, string> = { academy: '#2f7cf6', street: '#e5484d', late: '#30a46c', family: '#f5b301' };

/** Glücksrad für die Herkunft: Segmentgröße = Wahrscheinlichkeit. Ergebnis steht vor dem Drehen fest. */
function OriginWheel({ result, onResult }: { result: OriginId | null; onResult: (id: OriginId) => void }) {
  const [spinning, setSpinning] = useState<OriginId | null>(null);
  const done = useRef(onResult);
  done.current = onResult;
  // Segmente: Startwinkel je Herkunft (im Uhrzeigersinn ab oben).
  let acc = 0;
  const segments = ORIGINS.map((o) => {
    const from = acc;
    acc += (ORIGIN_ODDS[o.id] / 100) * 360;
    return { o, from, to: acc };
  });
  const middle = (id: OriginId) => {
    const s = segments.find((x) => x.o.id === id)!;
    return (s.from + s.to) / 2;
  };
  const [angle, setAngle] = useState(() => (result ? 360 * 6 - middle(result) : 0));
  const arc = (from: number, to: number) => {
    const r = 48;
    const p = (deg: number) => [50 + r * Math.sin((deg * Math.PI) / 180), 50 - r * Math.cos((deg * Math.PI) / 180)];
    const [x1, y1] = p(from);
    const [x2, y2] = p(to);
    return `M50 50 L${x1} ${y1} A${r} ${r} 0 ${to - from > 180 ? 1 : 0} 1 ${x2} ${y2}Z`;
  };

  useEffect(() => {
    if (!spinning) return;
    const t = setTimeout(() => {
      done.current(spinning);
      setSpinning(null);
      play('reveal');
    }, motionReduced() ? 50 : 3200);
    return () => clearTimeout(t);
  }, [spinning]);

  const spin = () => {
    if (result || spinning) return;
    const id = spinOrigin();
    const seg = segments.find((s) => s.o.id === id)!;
    // Zeiger steht oben: das Rad so drehen, dass ein zufälliger Punkt im Segment oben landet.
    const target = seg.from + (seg.to - seg.from) * (0.15 + Math.random() * 0.7);
    setAngle(360 * 6 - target);
    setSpinning(id);
    play('packShake');
  };

  const shown = result ? getOrigin(result) : null;
  return (
    <div className="wheel-wrap">
      <div className="wheel-box">
        <span className="wheel-pointer" aria-hidden="true">▼</span>
        <svg viewBox="0 0 100 100" className="wheel" style={{ transform: `rotate(${angle}deg)` }} aria-hidden="true">
          {segments.map(({ o, from, to }) => (
            <g key={o.id}>
              <path d={arc(from, to)} fill={WHEEL_COLORS[o.id]} stroke="#0b1020" strokeWidth=".8" />
              <text
                x={50 + 30 * Math.sin((((from + to) / 2) * Math.PI) / 180)}
                y={50 - 30 * Math.cos((((from + to) / 2) * Math.PI) / 180) + 3}
                textAnchor="middle" fontSize="9"
              >
                {o.icon}
              </text>
            </g>
          ))}
          <circle cx="50" cy="50" r="7" fill="#0b1020" />
        </svg>
      </div>
      <div className="wheel-info">
        {shown ? (
          <div className="origin active">
            <strong>{shown.icon} {shown.name}</strong>
            <small>{shown.text}</small>
            <small className="muted">Ausgelost – das bleibt so.</small>
          </div>
        ) : (
          <>
            <button type="button" className="btn primary" onClick={spin} disabled={!!spinning}>{spinning ? 'Dreht …' : '🎡 Glücksrad drehen'}</button>
            <ul className="wheel-legend">
              {ORIGINS.map((o) => (
                <li key={o.id}><i style={{ background: WHEEL_COLORS[o.id] }} /> {o.icon} {o.name} <small>{ORIGIN_ODDS[o.id]} %</small></li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}

function RealPlayer({ onCreate }: { onCreate: (c: Career) => void }) {
  const [query, setQuery] = useState('');
  const [leagueId, setLeagueId] = useState('');
  const q = query.trim().toLowerCase();
  const list = REAL_PLAYERS.filter(
    (p) =>
      (!q || p.name.toLowerCase().includes(q) || p.nation.toLowerCase().includes(q) || getClub(p.clubId).name.toLowerCase().includes(q)) &&
      (!leagueId || getClub(p.clubId).leagueId === leagueId),
  ).sort((a, b) => b.ovr - a.ovr || a.age - b.age);

  const start = (p: RealPlayerTemplate) => onCreate(createCareer({ ...p }));

  return (
    <section className="panel">
      <div className="row">
        <input className="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Name, Verein oder Nation…" />
        <select value={leagueId} onChange={(e) => setLeagueId(e.target.value)} aria-label="Liga">
          <option value="">Alle Ligen</option>
          {LEAGUES.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
        </select>
      </div>
      <p className="hint">
        {list.length} Spieler · Werte sind eigene Schätzungen zum Saisonstart 2025/26 – keine offiziellen EA-Ratings.
      </p>
      <ul className="real-list">
        {list.map((p) => (
          <li key={p.name}>
            <button onClick={() => start(p)}>
              <span className="save-ovr">{p.ovr}</span>
              <span className="grow">
                <strong>{p.name}</strong>
                <small>{p.position} · {p.age} Jahre · {getClub(p.clubId).name} · {p.nation}</small>
              </span>
              <span className="pill">Starten →</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

function TraitChips({ selected, onToggle }: { selected: TraitId[]; onToggle: (id: TraitId) => void }) {
  return (
    <>
      <div className="chips">
        {TRAITS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`chip ${selected.includes(t.id) ? 'active' : ''}`}
            aria-pressed={selected.includes(t.id)}
            onClick={() => onToggle(t.id)}
            title={t.description}
          >
            {t.icon} {t.name}
          </button>
        ))}
      </div>
      <p className="hint">
        {selected.length
          ? selected.map((id) => `${getTrait(id).name}: ${getTrait(id).description}`).join(' · ')
          : 'Ohne Charakter spielt dein Spieler ganz normal. Mit Charakter wird die Karriere wilder.'}
      </p>
    </>
  );
}

const LEGEND_INTRO =
  '„Was wäre wenn?“ – Kultfiguren starten als junge Spieler im heutigen Fußball, mit ihrem ganz eigenen Charakter. Werte und Startvereine sind frei erfunden, die Ereignisse augenzwinkernd.';
const CULT_INTRO =
  'Kult-Helden: Publikumslieblinge und „Forgotten Names“ wie Ailton, Okocha, Quaresma oder Podolski starten jung bei einem Verein ihrer Anfänge bzw. großen Zeit – im heutigen Fußball. Startvereine teils vereinfacht, Wertungen eigene Schätzungen.';
const H96_INTRO =
  'Zeitreise: der Bundesliga-Kader von Hannover 96 aus der Saison 2018/19. Jeder Spieler startet mit seinem damaligen Alter bei Hannover 96 – im heutigen Fußball. Wertungen sind eigene Schätzungen.';
const FAILED_INTRO =
  'Als Wunderkinder gefeiert, am Ende nie ganz oben angekommen. Hier startest du noch einmal mit ihrem Talent – schaffst du, was ihnen verwehrt blieb? Ziel: Gesamtwertung 85. Werte sind eigene Schätzungen.';

/** Kultfiguren bzw. gescheiterte Talente als „Was wäre wenn“-Karriere im heutigen Fußball. */
function LegendPicker({ onCreate, list, intro, secondChance }: { onCreate: (c: Career) => void; list: LegendTemplate[]; intro: string; secondChance?: boolean }) {
  const start = (l: LegendTemplate) => onCreate(createCareer({ ...l, secondChance }));
  return (
    <section className="panel">
      <p className="hint">{intro}</p>
      <ul className="legend-list">
        {list.map((l) => (
          <li key={l.name}>
            <button onClick={() => start(l)}>
              <span className="save-ovr legend-ovr">{l.ovr}</span>
              <span className="grow">
                <strong>{l.name}</strong>
                <small>{l.position} · {l.age} Jahre · {getClub(l.clubId).name} · Potenzial ~{l.potential}</small>
                <span className="legend-bio">{l.bio}</span>
                <span className="trait-row">
                  {l.traits.map((t) => (
                    <span key={t} className="pill trait" title={getTrait(t).description}>{getTrait(t).icon} {getTrait(t).name}</span>
                  ))}
                </span>
              </span>
              <span className="pill">Starten →</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

const ATTR_NAMES: Record<string, string> = {
  TEM: 'Tempo', SCH: 'Schuss', PAS: 'Passen', DRI: 'Dribbling', DEF: 'Defensive', PHY: 'Physis',
  HEC: 'Hechten', HAN: 'Fangen', ABS: 'Abschlag', REF: 'Reflexe', STE: 'Stellungsspiel',
};

/** Spieler-Baukasten: Körperbau und Attributpunkte bestimmen Startwertung und Potenzial. */
function Builder(props: {
  position: Position; age: number; height: number; weight: number; points: number[]; origin: OriginId | null;
  /** Größe und Gewicht schon ausgelost? */
  fated: boolean;
  onPoints: (v: number[]) => void;
}) {
  const { position, age, height, weight, points } = props;
  const base = evaluateBuild({ position, age, height, weight, points });
  const r = { ...base, ...(props.origin ? applyOrigin(base, props.origin, position === 'TW') : {}) };
  const left = POINT_POOL - points.reduce((a, b) => a + b, 0);
  const labels = attributeLabels(position);
  const weights = ATTR_WEIGHTS[position];
  const [lo, hi] = IDEAL_HEIGHT[position];
  const bmiText = r.bmi < 21 ? 'schmächtig' : r.bmi > 24.5 ? 'kräftig' : 'athletisch';
  const change = (i: number, d: number) => {
    const next = [...points];
    next[i] = Math.max(0, Math.min(MAX_PER_ATTR, next[i] + d));
    if (next.reduce((a, b) => a + b, 0) <= POINT_POOL) props.onPoints(next);
  };

  return (
    <fieldset className="builder">
      <legend>Körper & Attribute</legend>
      <p className="hint">Kein Potenzial zum Auswählen: Dein Körper (ausgelost) und die verteilten Punkte entscheiden, wie viel Talent in deinem Spieler steckt. Passen Punkte und Körper zur Position, steigt das Potenzial.</p>

      <div className="bld-body">
        <span>Größe <b>{props.fated ? `${height} cm` : '?'}</b> <small>ideal für {position}: {lo}–{hi} cm</small></span>
        <span>Gewicht <b>{props.fated ? `${weight} kg` : '?'}</b> {props.fated && <small>BMI {r.bmi.toFixed(1).replace('.', ',')} · {bmiText}</small>}</span>
      </div>
      <div className="bld-points-head">
        <strong>Attributpunkte</strong>
        <span className={left > 0 ? 'left' : ''}>{left} von {POINT_POOL} übrig</span>
      </div>
      <ul className="bld-attrs">
        {labels.map((l, i) => {
          const value = Math.round(Math.max(20, Math.min(99, r.ovr + r.offsets[i])));
          return (
            <li key={l}>
              <span className="bld-name">{ATTR_NAMES[l] ?? l}{weights[i] >= 2 ? <i title="Wichtig für die Position"> ★</i> : null}</span>
              <span className="bld-bar"><i style={{ width: `${value}%` }} /></span>
              <b>{value}</b>
              <button type="button" className="bld-btn" aria-label={`${ATTR_NAMES[l] ?? l} senken`} disabled={points[i] === 0} onClick={() => change(i, -1)}>−</button>
              <span className="bld-pts">{points[i]}</span>
              <button type="button" className="bld-btn" aria-label={`${ATTR_NAMES[l] ?? l} erhöhen`} disabled={left === 0 || points[i] >= MAX_PER_ATTR} onClick={() => change(i, 1)}>+</button>
            </li>
          );
        })}
      </ul>
      <p className="hint">★ = wichtig für die Position. Größere Spieler sind stärker in Physis und Zweikampf, kleinere schneller und wendiger.</p>

      <div className="bld-scout">
        <div><small>Startwertung</small><strong>~{r.ovr}</strong></div>
        <div><small>Scout-Einschätzung</small><strong>{scoutLabel(r.potential + 1)}</strong><small>Potenzial ca. {r.potential - 3}–{r.potential + 4} · der Rest ist Glück</small></div>
        <div className="bld-fit">
          <span>Körper passt <b>{Math.round(r.bodyFit * 100)} %</b></span>
          <span>Attribute passen <b>{Math.round(r.attrFit * 100)} %</b></span>
        </div>
      </div>
    </fieldset>
  );
}

/** Avatar-Baukasten: Hautton, Frisur, Haarfarbe, Bart, Stirnband. */
function AvatarEditor({ avatar, onChange }: { avatar: Avatar; onChange: (a: Avatar) => void }) {
  const set = (patch: Partial<Avatar>) => onChange({ ...avatar, ...patch });
  return (
    <fieldset className="avatar-editor">
      <legend>Aussehen</legend>
      <div className="swatches" role="radiogroup" aria-label="Hautton">
        {SKIN_TONES.map((c, i) => (
          <button key={c} type="button" role="radio" aria-checked={avatar.skin === i} aria-label={`Hautton ${i + 1}`} className={`swatch ${avatar.skin === i ? 'on' : ''}`} style={{ background: c }} onClick={() => set({ skin: i })} />
        ))}
      </div>
      <div className="chips">
        {HAIR_STYLES.map(([id, label]) => (
          <button key={id} type="button" className={`chip ${avatar.hair === id ? 'active' : ''}`} onClick={() => set({ hair: id })}>{label}</button>
        ))}
      </div>
      <div className="swatches" role="radiogroup" aria-label="Haarfarbe">
        {HAIR_COLORS.map((c, i) => (
          <button key={c} type="button" role="radio" aria-checked={avatar.hairColor === i} aria-label={`Haarfarbe ${i + 1}`} className={`swatch ${avatar.hairColor === i ? 'on' : ''}`} style={{ background: c }} onClick={() => set({ hairColor: i })} />
        ))}
      </div>
      <div className="chips">
        {BEARDS.map(([id, label]) => (
          <button key={id} type="button" className={`chip ${avatar.beard === id ? 'active' : ''}`} onClick={() => set({ beard: id })}>{label}</button>
        ))}
        <button type="button" className={`chip ${avatar.headband ? 'active' : ''}`} aria-pressed={avatar.headband} onClick={() => set({ headband: !avatar.headband })}>Stirnband</button>
      </div>
    </fieldset>
  );
}
