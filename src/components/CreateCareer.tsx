import { useMemo, useState } from 'react';
import { CLUBS, LEAGUES, getClub } from '../data/leagues';
import { NATIONS, POSITIONS, REAL_PLAYERS, type RealPlayerTemplate } from '../data/players';
import { CULT_LEGENDS, FAILED_TALENTS, HANNOVER_2018, LEGENDS, type LegendTemplate } from '../data/legends';
import { createCareer } from '../game/career';
import { MAX_TRAITS, TRAITS, getTrait, type TraitId } from '../game/traits';
import { pick } from '../game/random';
import {
  ATTR_WEIGHTS, BEARDS, DEFAULT_AVATAR, HAIR_COLORS, HAIR_STYLES, HEIGHT_RANGE, IDEAL_HEIGHT, MAX_PER_ATTR, ORIGINS, POINT_POOL, SKIN_TONES,
  WEIGHT_RANGE, applyOrigin, evaluateBuild, getOrigin, randomAvatar, randomBody, randomPoints, rollBuild, scoutLabel,
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
  const [height, setHeight] = useState(182);
  const [weight, setWeight] = useState(76);
  const [points, setPoints] = useState<number[]>([0, 0, 0, 0, 0, 0]);
  const [leagueId, setLeagueId] = useState('bl1');
  const [clubId, setClubId] = useState('');
  const [traits, setTraits] = useState<TraitId[]>([]);
  const [origin, setOrigin] = useState<OriginId>('academy');
  const [avatar, setAvatar] = useState<Avatar>(DEFAULT_AVATAR);

  // Live-Vorschau: so sieht die Karte zum Start ungefähr aus.
  const preview = applyOrigin(evaluateBuild({ position, age, height, weight, points }), origin, position === 'TW');
  const tier = cardTier(preview.ovr);
  const previewCard = {
    id: 'preview', name: name.trim() || 'Dein Spieler', position, nation, ovr: preview.ovr, avatar,
    club: clubId ? getClub(clubId).name : 'Startverein offen', variant: tier === 'bronze' ? ('silver' as const) : tier,
  };

  const randomize = () => {
    const pos = pick(POSITIONS).id;
    const body = randomBody(pos);
    setName(`${pick(FIRST)} ${pick(LAST)}`);
    setNation(pick(NATIONS).name);
    setPosition(pos);
    setAge(pick([16, 17, 17, 18, 18, 19, 20]));
    setHeight(body.height);
    setWeight(body.weight);
    setPoints(randomPoints(pos));
    setTraits(TRAITS.filter(() => Math.random() < 0.15).slice(0, 2).map((t) => t.id));
    setOrigin(pick(ORIGINS).id);
    setAvatar(randomAvatar());
    setClubId('');
  };

  const clubs = useMemo(
    () => CLUBS.filter((c) => c.leagueId === leagueId).sort((a, b) => a.name.localeCompare(b.name, 'de')),
    [leagueId],
  );

  const start = () => {
    const rolled = rollBuild({ position, age, height, weight, points });
    const o = getOrigin(origin);
    const ovr = rolled.ovr + o.ovr;
    const potential = Math.max(ovr + 4, Math.min(94, rolled.potential + o.potential));
    const profile = applyOrigin({ ovr, potential, offsets: rolled.profile }, origin, position === 'TW').offsets;
    // Zufälliger Verein: einer, bei dem der Spieler realistische Chancen auf Einsätze hat.
    const club = clubId
      ? getClub(clubId)
      : pick(CLUBS.filter((c) => c.strength >= ovr + 2 && c.strength <= ovr + 9));
    onCreate(
      createCareer({ name: name.trim() || 'Namenloser Held', nation, position, age, ovr, potential, clubId: club.id, traits, profile, height, weight, origin, avatar }),
    );
  };

  return (
    <section className="panel form">
      <div className="create-preview">
        <UtCard card={previewCard} size="md" />
        <div className="create-preview-info">
          <strong>{previewCard.name}</strong>
          <small>Start ca. {preview.ovr} · Potenzial ~{preview.potential} ({scoutLabel(preview.potential)})</small>
          <small>{getOrigin(origin).icon} {getOrigin(origin).name}</small>
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
        <div className="origin-grid">
          {ORIGINS.map((o) => (
            <button key={o.id} type="button" className={`origin ${origin === o.id ? 'active' : ''}`} aria-pressed={origin === o.id} onClick={() => setOrigin(o.id)}>
              <strong>{o.icon} {o.name}</strong>
              <small>{o.text}</small>
            </button>
          ))}
        </div>
      </fieldset>

      <AvatarEditor avatar={avatar} onChange={setAvatar} />

      <fieldset>
        <legend>Charakter (optional, bis zu {MAX_TRAITS})</legend>
        <TraitChips selected={traits} onToggle={(id) =>
          setTraits((t) => (t.includes(id) ? t.filter((x) => x !== id) : t.length < MAX_TRAITS ? [...t, id] : t))} />
      </fieldset>

      <Builder position={position} age={age} height={height} weight={weight} points={points} origin={origin}
        onHeight={setHeight} onWeight={setWeight} onPoints={setPoints} />

      <div className="row">
        <label>
          Liga
          <select value={leagueId} onChange={(e) => { setLeagueId(e.target.value); setClubId(''); }}>
            {LEAGUES.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        </label>
        <label>
          Startverein
          <select value={clubId} onChange={(e) => setClubId(e.target.value)}>
            <option value="">Zufällig (passender Verein)</option>
            {clubs.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.strength})</option>)}
          </select>
        </label>
      </div>

      <button className="btn primary big" onClick={start}>Karriere starten</button>
    </section>
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
  position: Position; age: number; height: number; weight: number; points: number[]; origin: OriginId;
  onHeight: (v: number) => void; onWeight: (v: number) => void; onPoints: (v: number[]) => void;
}) {
  const { position, age, height, weight, points } = props;
  const base = evaluateBuild({ position, age, height, weight, points });
  const r = { ...base, ...applyOrigin(base, props.origin, position === 'TW') };
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
      <p className="hint">Kein Potenzial zum Auswählen: Größe, Gewicht und die verteilten Punkte entscheiden, wie viel Talent in deinem Spieler steckt. Passt alles zur Position, steigt das Potenzial.</p>

      <label className="bld-slider">
        <span>Größe <b>{height} cm</b> <small>ideal für {position}: {lo}–{hi} cm</small></span>
        <input type="range" min={HEIGHT_RANGE[0]} max={HEIGHT_RANGE[1]} value={height} onChange={(e) => props.onHeight(Number(e.target.value))} />
      </label>
      <label className="bld-slider">
        <span>Gewicht <b>{weight} kg</b> <small>BMI {r.bmi.toFixed(1).replace('.', ',')} · {bmiText}</small></span>
        <input type="range" min={WEIGHT_RANGE[0]} max={WEIGHT_RANGE[1]} value={weight} onChange={(e) => props.onWeight(Number(e.target.value))} />
      </label>

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
