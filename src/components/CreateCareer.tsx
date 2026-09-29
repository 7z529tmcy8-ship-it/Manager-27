import { useMemo, useState } from 'react';
import { CLUBS, LEAGUES, getClub } from '../data/leagues';
import { NATIONS, POSITIONS, REAL_PLAYERS, type RealPlayerTemplate } from '../data/players';
import { FAILED_TALENTS, LEGENDS, type LegendTemplate } from '../data/legends';
import { createCareer } from '../game/career';
import { MAX_TRAITS, TRAITS, getTrait, type TraitId } from '../game/traits';
import { pick, randInt } from '../game/random';
import type { Career, Position } from '../game/types';

interface Props {
  onCancel: () => void;
  onCreate: (career: Career) => void;
}

const TALENTS = [
  { id: 'solid', label: 'Solide', hint: 'Potenzial ca. 72–78', ovr: [60, 64], pot: [72, 78] },
  { id: 'talent', label: 'Talent', hint: 'Potenzial ca. 78–84', ovr: [62, 66], pot: [78, 84] },
  { id: 'top', label: 'Top-Talent', hint: 'Potenzial ca. 84–89', ovr: [64, 68], pot: [84, 89] },
  { id: 'wonder', label: 'Wunderkind', hint: 'Potenzial ca. 89–94', ovr: [66, 70], pot: [89, 94] },
] as const;

export default function CreateCareer({ onCancel, onCreate }: Props) {
  const [tab, setTab] = useState<'own' | 'real' | 'legends' | 'failed'>('own');

  return (
    <main className="create">
      <div className="topbar">
        <button className="nav-back" onClick={onCancel}>‹ Zurück</button>
        <h1>Neue Karriere</h1>
      </div>
      <div className="tabs">
        <button className={tab === 'own' ? 'active' : ''} onClick={() => setTab('own')}>Eigener Spieler</button>
        <button className={tab === 'real' ? 'active' : ''} onClick={() => setTab('real')}>Echter Spieler</button>
        <button className={tab === 'legends' ? 'active' : ''} onClick={() => setTab('legends')}>⭐ Legenden</button>
        <button className={tab === 'failed' ? 'active' : ''} onClick={() => setTab('failed')}>💔 Zweite Chance</button>
      </div>
      {tab === 'own' && <OwnPlayer onCreate={onCreate} />}
      {tab === 'real' && <RealPlayer onCreate={onCreate} />}
      {tab === 'legends' && <LegendPicker onCreate={onCreate} list={LEGENDS} intro={LEGEND_INTRO} />}
      {tab === 'failed' && <LegendPicker onCreate={onCreate} list={FAILED_TALENTS} intro={FAILED_INTRO} secondChance />}
    </main>
  );
}

function OwnPlayer({ onCreate }: { onCreate: (c: Career) => void }) {
  const [name, setName] = useState('');
  const [nation, setNation] = useState('Deutschland');
  const [position, setPosition] = useState<Position>('ST');
  const [age, setAge] = useState(17);
  const [talent, setTalent] = useState<(typeof TALENTS)[number]['id']>('talent');
  const [leagueId, setLeagueId] = useState('bl1');
  const [clubId, setClubId] = useState('');
  const [traits, setTraits] = useState<TraitId[]>([]);

  const clubs = useMemo(
    () => CLUBS.filter((c) => c.leagueId === leagueId).sort((a, b) => a.name.localeCompare(b.name, 'de')),
    [leagueId],
  );

  const start = () => {
    const t = TALENTS.find((x) => x.id === talent)!;
    const ovr = randInt(t.ovr[0], t.ovr[1]) + (age - 17);
    const potential = randInt(t.pot[0], t.pot[1]);
    // Zufälliger Verein: einer, bei dem der Spieler realistische Chancen auf Einsätze hat.
    const club = clubId
      ? getClub(clubId)
      : pick(CLUBS.filter((c) => c.strength >= ovr + 2 && c.strength <= ovr + 9));
    onCreate(
      createCareer({ name: name.trim() || 'Namenloser Held', nation, position, age, ovr, potential, clubId: club.id, traits }),
    );
  };

  return (
    <section className="panel form">
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
        <legend>Charakter (optional, bis zu {MAX_TRAITS})</legend>
        <TraitChips selected={traits} onToggle={(id) =>
          setTraits((t) => (t.includes(id) ? t.filter((x) => x !== id) : t.length < MAX_TRAITS ? [...t, id] : t))} />
      </fieldset>

      <fieldset>
        <legend>Talent</legend>
        <div className="choice-grid">
          {TALENTS.map((t) => (
            <button key={t.id} className={`choice ${talent === t.id ? 'active' : ''}`} onClick={() => setTalent(t.id)}>
              <strong>{t.label}</strong>
              <small>{t.hint}</small>
            </button>
          ))}
        </div>
        <p className="hint">Das genaue Potenzial bleibt verborgen – und kann durch gute oder schlechte Saisons steigen oder sinken.</p>
      </fieldset>

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
