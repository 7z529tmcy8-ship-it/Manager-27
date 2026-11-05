import { useState } from 'react';
import { getClub } from '../data/leagues';
import { TACTICS, moneyShort, teamRating, windowLeft, windowName, windowOpen, type FeedItem, type ManagerState, type Tactic } from '../game/manager';
import { DAY_LABEL, advance, dateText, dayKind, daysToMatch, matchToday, monthOf, myFixture, shortDate, type AdvanceTo, type DayEvent, type DayKind } from '../game/managerDays';
import Icon from './Icon';

const KIND_ICON: Record<DayKind, string> = { match: 'ball', training: 'bolt', rest: 'heart', deadline: 'swap', break: 'snow', free: 'calendar' };
export const abbr = (id: string) => {
  const n = getClub(id).name.replace(/^(1\.|FC|SV|SC|VfL|VfB|TSG|RB|AC|AS|SSC|US|CF|RC|OGC|AJ|SCO|CD|GD|FK|AFC)\s+/i, '');
  const w = n.split(/[\s-]+/).filter(Boolean);
  return (w.length > 1 ? w.map((x) => x[0]).join('') : n).slice(0, 3).toUpperCase();
};

/** Startseite des Manager-Modus: Datum, nächstes Spiel, Schnellknöpfe, Kalender, Form und Neuigkeiten. */
export function Today({ m, setM, onKickoff, onToast, onMarket, onNews }: {
  m: ManagerState; setM: (m: ManagerState) => void; onKickoff: () => void; onToast: (t: string) => void; onMarket: () => void; onNews: () => void;
}) {
  const [cal, setCal] = useState(false);
  const c = m.cal!;
  const kind = dayKind(m);
  const live = matchToday(m);
  const fx = myFixture(m);
  const inDays = daysToMatch(m);
  const left = windowLeft(m);
  const form = (m.feed ?? []).filter((f) => f.cat === 'spiel' && f.season === m.season).slice(0, 5).reverse();

  const go = (to: AdvanceTo, label?: string) => {
    const before = m.round;
    const n = advance(m, to);
    setM(n);
    const played = n.round - before;
    if (label || played > 1) onToast(label ?? `${played} Spieltage simuliert`);
  };

  return (
    <section className="mg-panel">
      <div className={`mg-day k-${kind}`}>
        <span className="mg-day-ic"><Icon name={KIND_ICON[kind]} size={22} /></span>
        <span className="mg-day-text"><small>{DAY_LABEL[kind]}</small><b>{dateText(m)}</b></span>
        <span className="mg-day-n">Tag {c.day + 1}<small>/ {c.len}</small></span>
      </div>

      {windowOpen(m) && (
        <button className={`mg-window ${left === 0 ? 'deadline' : ''}`} onClick={onMarket}>
          <Icon name="swap" size={20} />
          <span><b>{left === 0 ? 'Deadline Day – letzte Chance!' : `${windowName(m)} offen`}</b><small>{left === 0 ? 'Heute um Mitternacht schließt das Fenster' : `Noch ${left} ${left === 1 ? 'Tag' : 'Tage'} bis zur Deadline`}</small></span>
          <Icon name="arrow" size={18} />
        </button>
      )}

      {live && fx ? (
        <div className="mg-fixture live">
          <small>Heute · Spieltag {m.round + 1} von {m.rounds.length}</small>
          <div className="mg-vs">
            <Side id={fx[0]} me={m.clubId} str={fx[0] === m.clubId ? teamRating(m) : m.strength[fx[0]]} />
            <b>VS</b>
            <Side id={fx[1]} me={m.clubId} str={fx[1] === m.clubId ? teamRating(m) : m.strength[fx[1]]} />
          </div>
          {(m.hype ?? 0) > 0 && <p className="mg-hype"><Icon name="fire" size={16} />Kampfansage – die Mannschaft brennt!</p>}
          <div className="mg-tactic" role="radiogroup" aria-label="Taktik">
            {(Object.keys(TACTICS) as Tactic[]).map((t) => (
              <button key={t} className={m.tactic === t ? 'on' : ''} aria-pressed={m.tactic === t} onClick={() => setM({ ...m, tactic: t })}>
                <b>{t[0].toUpperCase() + t.slice(1)}</b><small>{TACTICS[t].text}</small>
              </button>
            ))}
          </div>
          <button className="btn primary big mg-kick" onClick={onKickoff}><Icon name="whistle" size={20} />Anpfiff</button>
        </div>
      ) : fx && inDays !== null ? (
        <div className="mg-fixture">
          <small>Nächstes Spiel · Spieltag {m.round + 1} · {shortDate(m, c.roundDays[m.round])}</small>
          <div className="mg-vs">
            <Side id={fx[0]} me={m.clubId} str={fx[0] === m.clubId ? teamRating(m) : m.strength[fx[0]]} />
            <b>VS</b>
            <Side id={fx[1]} me={m.clubId} str={fx[1] === m.clubId ? teamRating(m) : m.strength[fx[1]]} />
          </div>
          <span className="mg-in">{inDays === 1 ? 'morgen' : `in ${inDays} Tagen`} · {fx[0] === m.clubId ? 'Heimspiel' : 'Auswärts'}</span>
        </div>
      ) : null}

      {!m.done && (
        <div className="mg-adv">
          {!live && <button className="btn primary big mg-next" onClick={() => go('day')}><Icon name="arrow" size={18} />Nächster Tag</button>}
          {!live && <button className="btn mg-tomatch" onClick={() => go('match')}><Icon name="bolt" size={16} />Bis zum nächsten Spiel</button>}
          <div className="mg-sim">
            {c.day < c.brk[0] && <button className="btn ghost small" onClick={() => go('winter', 'Bis zur Winterpause simuliert')}>Bis zur Winterpause</button>}
            <button className="btn ghost small" onClick={() => go('end', 'Saison durchsimuliert')}>Bis Saisonende</button>
            <button className={`btn ghost small ${cal ? 'on' : ''}`} onClick={() => setCal(!cal)}><Icon name="calendar" size={14} />Kalender</button>
          </div>
        </div>
      )}

      {(cal || m.done) && !m.done && <MonthGrid m={m} onPick={(d) => { if (window.confirm(`Bis ${shortDate(m, d)} simulieren? Spiele laufen automatisch, Ereignisse werden neutral beantwortet.`)) go({ day: d }, `Bis ${shortDate(m, d)} simuliert`); }} />}

      <div className="mg-status">
        <div className="mg-form" aria-label="Form">
          <small>Form</small>
          <span>{form.length ? form.map((f, i) => <i key={i} className={f.title.startsWith('Sieg') ? 'w' : f.title.startsWith('Remis') ? 'd' : 'l'}>{f.title.startsWith('Sieg') ? 'S' : f.title.startsWith('Remis') ? 'U' : 'N'}</i>) : <em>noch kein Spiel</em>}</span>
        </div>
        <div className="mg-mood">
          <small>Stimmung</small>
          <span className="mg-mood-bar">{[-3, -2, -1, 0, 1, 2, 3].map((v) => <i key={v} className={`${v === 0 ? 'mid' : ''} ${(m.mood ?? 0) >= v && v > 0 ? 'up' : ''} ${(m.mood ?? 0) <= v && v < 0 ? 'down' : ''}`} />)}</span>
        </div>
      </div>

      {m.last && (
        <div className="mg-results">
          <h3>Letzter Spieltag</h3>
          <ul>
            {[...(m.last.mine ? [m.last.mine] : []), ...m.last.others].map((r) => (
              <li key={r.home} className={r.home === m.clubId || r.away === m.clubId ? 'me' : ''}>
                <span>{getClub(r.home).name}</span><b>{r.hg}:{r.ag}</b><span>{getClub(r.away).name}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {(m.feed?.length ?? 0) > 0 && (
        <div className="mg-results">
          <h3>Neueste Nachrichten <button className="mg-more" onClick={onNews}>Alle</button></h3>
          <ul className="mg-feed">{m.feed!.slice(0, 3).map((f, i) => <FeedRow key={i} f={f} m={m} />)}</ul>
        </div>
      )}
    </section>
  );
}

function Side({ id, me, str }: { id: string; me: string; str?: number }) {
  return (
    <span className={`mg-side ${id === me ? 'me' : ''}`}>
      <span className="mg-badge">{abbr(id)}</span>
      <b>{getClub(id).name}</b>
      <small>Stärke {(str ?? getClub(id).strength).toFixed(1)}</small>
    </span>
  );
}

const WD = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
/** Monatskalender mit Spieltagen (Gegner, H/A), Training, Deadline und Winterpause. */
function MonthGrid({ m, onPick }: { m: ManagerState; onPick: (d: number) => void }) {
  const c = m.cal!;
  const cur = monthOf(m, c.day);
  const [off, setOff] = useState(0);
  // Ersten Tag des angezeigten Monats suchen
  let first = c.day - (cur.dom - 1);
  for (let k = 0; k < Math.abs(off); k++) {
    if (off > 0) { const mo = monthOf(m, first); first += [31, 28 + (mo.y % 4 === 0 ? 1 : 0), 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][mo.mo]; }
    else { const prev = monthOf(m, first - 1); first -= prev.dom; }
  }
  const head = monthOf(m, first);
  const days: (number | null)[] = [...Array(head.wd).fill(null)];
  for (let d = first; monthOf(m, d).mo === head.mo; d++) days.push(d);
  return (
    <div className="mg-cal">
      <div className="mg-cal-head">
        <button onClick={() => setOff(off - 1)} disabled={first <= 0} aria-label="Voriger Monat">‹</button>
        <b>{head.name} {head.y}</b>
        <button onClick={() => setOff(off + 1)} disabled={first + 31 >= c.len} aria-label="Nächster Monat">›</button>
      </div>
      <div className="mg-cal-grid">
        {WD.map((w) => <small key={w}>{w}</small>)}
        {days.map((d, i) => {
          if (d === null) return <span key={i} />;
          const inSeason = d >= 0 && d < c.len;
          const k = inSeason ? dayKind(m, d) : 'free';
          const r = c.roundDays.indexOf(d);
          const fx = r >= 0 ? myFixture(m, r) : null;
          const past = d < c.day;
          return (
            <button key={i} className={`mg-cd k-${k} ${d === c.day ? 'today' : ''} ${past ? 'past' : ''}`} disabled={!inSeason || d <= c.day} onClick={() => onPick(d)}>
              <span>{monthOf(m, d).dom}</span>
              {fx && <em>{abbr(fx[0] === m.clubId ? fx[1] : fx[0])}<i>{fx[0] === m.clubId ? 'H' : 'A'}</i></em>}
              {!fx && k === 'training' && <i className="dot" />}
              {k === 'deadline' && <i className="dl" />}
            </button>
          );
        })}
      </div>
      <p className="mg-cal-legend"><i className="k-match" />Spiel <i className="k-training" />Training <i className="k-deadline" />Deadline <i className="k-break" />Winterpause · Tag antippen = bis dahin simulieren</p>
    </div>
  );
}

const CAT_LABEL: Record<FeedItem['cat'], string> = { verein: 'Verein', spiel: 'Spiel', liga: 'Liga', transfer: 'Transfer' };
const CAT_ICON: Record<FeedItem['cat'], string> = { verein: 'shield', spiel: 'ball', liga: 'trophy', transfer: 'swap' };
function FeedRow({ f, m }: { f: FeedItem; m: ManagerState }) {
  return (
    <li className={`mg-fr c-${f.cat}`}>
      <span className="mg-fr-ic"><Icon name={CAT_ICON[f.cat]} size={16} /></span>
      <span className="mg-fr-text"><b>{f.title}</b>{f.text && <small>{f.text}</small>}</span>
      <em>{f.season === m.season && m.cal ? shortDate(m, f.d) : `${f.season}/${String(f.season + 1).slice(2)}`}</em>
    </li>
  );
}

/** News-Zentrale mit Filtern. */
export function NewsCenter({ m }: { m: ManagerState }) {
  const [cat, setCat] = useState<FeedItem['cat'] | 'all'>('all');
  const list = (m.feed ?? []).filter((f) => cat === 'all' || f.cat === cat);
  return (
    <section className="mg-panel">
      <div className="mg-forms">
        {(['all', 'verein', 'spiel', 'liga', 'transfer'] as const).map((k) => (
          <button key={k} className={cat === k ? 'on' : ''} onClick={() => setCat(k)}>{k === 'all' ? 'Alle' : CAT_LABEL[k]}</button>
        ))}
      </div>
      {list.length ? <ul className="mg-feed big">{list.map((f, i) => <FeedRow key={i} f={f} m={m} />)}</ul> : <p className="mg-hint">Noch keine Meldungen. Spiel ein paar Tage, dann füllt sich die News-Zentrale.</p>}
      {m.news.length > 0 && (
        <div className="mg-results"><h3>Vereins-Chronik</h3><ul className="mg-news">{m.news.slice(0, 8).map((n, i) => <li key={i}>{n}</li>)}</ul></div>
      )}
    </section>
  );
}

/** Ereignis-Fenster mit drei Antworten. */
export function EventCard({ e, onAnswer }: { e: DayEvent; onAnswer: (k: 'A' | 'B' | 'C') => void }) {
  return (
    <div className="mg-ev-wrap" role="dialog" aria-modal="true" aria-label={e.title}>
      <div className={`mg-ev ev-${e.kind}`}>
        <header>
          <span className="mg-ev-tag">Ereignis · {e.tag}</span>
          <span className="mg-ev-ic"><Icon name={e.icon} size={26} /></span>
        </header>
        <h2>{e.title}</h2>
        <p>{e.text}</p>
        <div className="mg-ev-opts">
          {e.options.map((o) => (
            <button key={o.key} disabled={o.disabled} onClick={() => onAnswer(o.key)}>
              <span><b>{o.label}</b>{o.hint && <small>{o.hint}</small>}</span>
              <i>{o.key}</i>
            </button>
          ))}
        </div>
        {e.amount !== undefined && e.kind !== 'youth' && <small className="mg-ev-amt">Betrag: {moneyShort(e.amount)} €</small>}
      </div>
    </div>
  );
}
