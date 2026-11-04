import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { getClubState, setClubState } from '../clubStore';
import { getClub, getLeague } from '../data/leagues';
import { storePacks, type CollectCard } from '../game/club';
import {
  BENCH_SIZE, FORMATIONS, SQUAD_MAX, SQUAD_MIN, TACTICS, avgRating, bestBench, bestXI, fixBench, isGoal, remapXI, buyPlayer, clubsForLeague, dropFromMarket, finishSeason, fixXI, halfRound, loadManager,
  managerLeagues, moneyShort, myLeague, newManager, playRound, saveManager, sellOffer, sellPlayer, slotRating, startBudget, tablePos,
  teamRating, willingness, windowName, windowOpen, zoneOf,
  type Formation, type MPlayer, type ManagerState, type MarketPlayer, type MyMatch, type SeasonSummary, type Tactic,
} from '../game/manager';
import { sortTable } from '../game/season';
import { REAL_PLAYERS } from '../data/players';
import { motionReduced } from '../settings';
import { play } from '../sound';
import Confetti from './Confetti';
import Icon from './Icon';
import UtCard from './UtCard';

type Tab = 'spiel' | 'kader' | 'markt' | 'tabelle' | 'verein';
const TABS: [Tab, string, string][] = [['spiel', 'Spieltag', 'ball'], ['kader', 'Kader', 'tactics'], ['markt', 'Transfers', 'swap'], ['tabelle', 'Tabelle', 'trophy'], ['verein', 'Verein', 'shield']];
const sfx = (id: Parameters<typeof play>[0]) => { try { play(id); } catch { /* kein Ton */ } };
const buzz = (p: number | number[]) => { try { navigator.vibrate?.(p); } catch { /* egal */ } };
const short = (id: string) => getClub(id).name;
const toCard = (p: MPlayer, clubId: string): CollectCard => ({
  id: `mg-${p.id}`, name: p.name, position: p.pos, nation: p.nation, club: getClub(clubId).name, ovr: p.ovr,
  variant: p.ovr >= 75 ? 'gold-rare' : p.ovr >= 65 ? 'gold' : 'silver',
});

/** Manager-Modus: eigener Verein, Spieltage, Transfermarkt, Auf- und Abstieg. */
export default function ManagerMode({ onClose }: { onClose: () => void }) {
  const [m, setM] = useState<ManagerState | null>(loadManager);
  const [tab, setTab] = useState<Tab>('spiel');
  const [match, setMatch] = useState<MyMatch | null>(null);
  const [summary, setSummary] = useState<SeasonSummary | null>(null);
  const [signed, setSigned] = useState<MPlayer | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  useEffect(() => saveManager(m), [m]);
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(null), 2600); return () => clearTimeout(t); }, [toast]);

  if (!m) return <Setup onClose={onClose} onPick={(id) => { sfx('fanfare'); setM(newManager(id)); }} />;

  const lg = myLeague(m);
  const pos = tablePos(m);
  const next = m.done ? null : m.rounds[m.round]?.find(([h, a]) => h === m.clubId || a === m.clubId) ?? null;
  const open = windowOpen(m);

  const kickoff = () => {
    const n = playRound(m);
    setM(n);
    sfx('whistle');
    if (n.last?.mine) setMatch(n.last.mine);
  };
  const simTo = (target: number) => {
    let n = m;
    while (!n.done && n.round < target) n = playRound(n);
    setM(n);
    sfx('whistle');
    setToast(n.done ? 'Saison durchsimuliert' : `Bis Spieltag ${n.round} simuliert`);
  };
  const endSeason = () => {
    const res = finishSeason(m);
    // Belohnung für den Rest des Spiels: Coins, als Meister ein Premium-Pack
    let club = { ...getClubState(), coins: getClubState().coins + res.summary.coins };
    if (res.summary.title) club = storePacks(club, ['premium'], 'Manager-Modus');
    setClubState(club);
    setSummary(res.summary);
    setM(res.m);
    sfx(res.summary.title || res.summary.move === 'up' ? 'fanfare' : 'levelUp');
  };

  return (
    <div className="mg" role="dialog" aria-modal="true" aria-label="Manager-Modus">
      <div className="mg-inner">
        <header className="mg-top">
          <button className="nav-back" onClick={onClose}>‹ Zurück</button>
          <span className="mg-budget"><Icon name="coin" size={16} />{moneyShort(m.budget)} €</span>
        </header>

        <section className="mg-hero">
          <span className="mg-crest" aria-hidden="true">{getClub(m.clubId).name.replace(/^(FC|SV|1\.|VfL|VfB|TSG|SC|RB|AC|AS|SSC|US|CF|RC|OGC|AJ|SCO|CD|GD|FK)\s+/i, '').slice(0, 2).toUpperCase()}</span>
          <div className="mg-hero-text">
            <small>Saison {m.season}/{String(m.season + 1).slice(2)} · {lg.name}</small>
            <h1>{getClub(m.clubId).name}</h1>
            <span className="mg-chips">
              <b className={`mg-pos z-${zoneOf(m, pos)}`}>{m.round ? `${pos}. Platz` : 'Vorbereitung'}</b>
              <b>Ziel: Platz {m.target}</b>
              <b>Stärke {teamRating(m).toFixed(1)}</b>
            </span>
          </div>
        </section>
        <div className="mg-board" title="Vorstand">
          <span>Vorstand</span><i><em style={{ transform: `scaleX(${m.board / 100})` }} className={m.board < 35 ? 'low' : m.board > 70 ? 'high' : ''} /></i>
          <small>{m.board > 70 ? 'begeistert' : m.board >= 35 ? 'zufrieden' : 'unruhig'}</small>
        </div>

        <nav className="mg-tabs" role="tablist">
          {TABS.map(([id, label, ic]) => (
            <button key={id} role="tab" aria-selected={tab === id} className={tab === id ? 'on' : ''} onClick={() => { setTab(id); sfx('tap'); }}>
              <Icon name={ic} size={18} /><span>{label}</span>{id === 'markt' && open && <i className="mg-dot" />}
            </button>
          ))}
        </nav>

        {tab === 'spiel' && (
          <section className="mg-panel">
            {open && (
              <button className="mg-window" onClick={() => setTab('markt')}>
                <Icon name="swap" size={20} /><span><b>{windowName(m)} offen</b><small>Bis zum Anpfiff kaufen und verkaufen</small></span><Icon name="arrow" size={18} />
              </button>
            )}
            {next ? (
              <>
                <div className="mg-fixture">
                  <small>Spieltag {m.round + 1} von {m.rounds.length}</small>
                  <div className="mg-vs">
                    <Side id={next[0]} me={m.clubId} str={next[0] === m.clubId ? teamRating(m) : m.strength[next[0]]} />
                    <b>VS</b>
                    <Side id={next[1]} me={m.clubId} str={next[1] === m.clubId ? teamRating(m) : m.strength[next[1]]} />
                  </div>
                  <div className="mg-tactic" role="radiogroup" aria-label="Taktik">
                    {(Object.keys(TACTICS) as Tactic[]).map((t) => (
                      <button key={t} className={m.tactic === t ? 'on' : ''} aria-pressed={m.tactic === t} onClick={() => setM({ ...m, tactic: t })}>
                        <b>{t[0].toUpperCase() + t.slice(1)}</b><small>{TACTICS[t].text}</small>
                      </button>
                    ))}
                  </div>
                  <button className="btn primary big mg-kick" onClick={kickoff}><Icon name="whistle" size={20} />Anpfiff</button>
                  <div className="mg-sim">
                    {m.round < halfRound(m) && <button className="btn ghost small" onClick={() => simTo(halfRound(m))}>Bis zur Winterpause</button>}
                    <button className="btn ghost small" onClick={() => simTo(m.rounds.length)}>Bis Saisonende</button>
                  </div>
                </div>
              </>
            ) : (
              <div className="mg-fixture mg-end">
                <small>Saison beendet</small>
                <strong className={`mg-big z-${zoneOf(m, pos)}`}>{pos}.</strong>
                <p>{pos === 1 ? 'Meister! Zeit für die Feier.' : pos <= m.target ? 'Saisonziel erreicht.' : `Ziel war Platz ${m.target}.`}</p>
                <button className="btn primary big mg-kick" onClick={endSeason}><Icon name="trophy" size={20} />Saisonbilanz</button>
              </div>
            )}
            {m.last && (
              <div className="mg-results">
                <h3>Letzter Spieltag</h3>
                <ul>
                  {[...(m.last.mine ? [m.last.mine] : []), ...m.last.others].map((r) => (
                    <li key={r.home} className={r.home === m.clubId || r.away === m.clubId ? 'me' : ''}>
                      <span>{short(r.home)}</span><b>{r.hg}:{r.ag}</b><span>{short(r.away)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        )}

        {tab === 'kader' && <Squad m={m} setM={setM} onToast={setToast} />}
        {tab === 'markt' && <Market m={m} setM={setM} onToast={setToast} onSigned={(p) => { setSigned(p); sfx('transfer'); buzz([30, 40, 80]); }} />}
        {tab === 'tabelle' && <Table m={m} />}
        {tab === 'verein' && <ClubTab m={m} onReset={() => { if (confirm('Manager-Spielstand wirklich löschen und neu anfangen?')) { setM(null); saveManager(null); } }} />}
      </div>

      {createPortal(<>
        {match && <MatchReveal match={match} me={m.clubId} onClose={() => setMatch(null)} />}
        {signed && <Signing p={signed} clubId={m.clubId} onClose={() => setSigned(null)} />}
        {summary && <SeasonEnd s={summary} m={m} onClose={() => setSummary(null)} />}
        {toast && <div className="mg-toast" role="status">{toast}</div>}
      </>, document.body)}
    </div>
  );
}

function Side({ id, me, str }: { id: string; me: string; str?: number }) {
  return (
    <span className={`mg-side ${id === me ? 'me' : ''}`}>
      <span className="mg-badge">{getClub(id).name.slice(0, 1)}</span>
      <b>{getClub(id).name}</b>
      <small>Stärke {(str ?? getClub(id).strength).toFixed(1)}</small>
    </span>
  );
}

// ---------- Vereinswahl ----------
function Setup({ onClose, onPick }: { onClose: () => void; onPick: (clubId: string) => void }) {
  const leagues = managerLeagues();
  const [lg, setLg] = useState(leagues[0].id);
  const [sel, setSel] = useState<string | null>(null);
  const clubs = clubsForLeague(lg);
  const reals = useMemo(() => { const c = new Map<string, number>(); for (const p of REAL_PLAYERS) c.set(p.clubId, (c.get(p.clubId) ?? 0) + 1); return c; }, []);
  return (
    <div className="mg" role="dialog" aria-modal="true" aria-label="Manager-Modus">
      <div className="mg-inner">
        <header className="mg-top"><button className="nav-back" onClick={onClose}>‹ Zurück</button></header>
        <section className="mg-intro">
          <span className="mg-intro-kicker">Neu · Manager-Modus</span>
          <h1>Dein Verein.<br />Deine Entscheidungen.</h1>
          <p>Übernimm einen Verein, stell die Elf auf, kauf auf dem Transfermarkt ein und führe dein Team Spieltag für Spieltag zum Titel.</p>
        </section>
        <div className="mg-leagues" role="tablist">
          {leagues.map((l) => <button key={l.id} className={lg === l.id ? 'on' : ''} onClick={() => { setLg(l.id); setSel(null); }}>{l.name}</button>)}
        </div>
        <ul className="mg-clubs">
          {clubs.map((c) => (
            <li key={c.id}>
              <button className={sel === c.id ? 'on' : ''} onClick={() => { setSel(c.id); sfx('tap'); }}>
                <span className="mg-badge">{c.name.slice(0, 1)}</span>
                <span className="mg-club-text"><b>{c.name}</b><small>Budget {moneyShort(startBudget(c.strength))} € · {reals.get(c.id) ?? 0} echte Spieler</small></span>
                <span className="mg-stars" aria-label={`Stärke ${c.strength}`}>{'★'.repeat(Math.max(1, Math.min(5, Math.round((c.strength - 60) / 5))))}<small>{c.strength}</small></span>
              </button>
            </li>
          ))}
        </ul>
        {sel && (
          <div className="mg-pick">
            <button className="btn primary big" onClick={() => onPick(sel)}>{getClub(sel).name} übernehmen</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------- Kader & Aufstellung ----------
function Squad({ m, setM, onToast }: { m: ManagerState; setM: (m: ManagerState) => void; onToast: (t: string) => void }) {
  const [view, setView] = useState<'elf' | 'zentrale'>('elf');
  return (
    <section className="mg-panel">
      <div className="mg-seg" role="tablist">
        <button className={view === 'elf' ? 'on' : ''} onClick={() => setView('elf')}><Icon name="tactics" size={16} />Aufstellung & Bank</button>
        <button className={view === 'zentrale' ? 'on' : ''} onClick={() => setView('zentrale')}><Icon name="chart" size={16} />Team-Zentrale</button>
      </div>
      {view === 'elf' ? <Lineup m={m} setM={setM} onToast={onToast} /> : <Central m={m} />}
    </section>
  );
}

type Pick = { kind: 'xi' | 'bench'; i: number } | null;
function Lineup({ m, setM, onToast }: { m: ManagerState; setM: (m: ManagerState) => void; onToast: (t: string) => void }) {
  const [sel, setSel] = useState<Pick>(null);
  const f = FORMATIONS[m.formation];
  const byId = new Map(m.squad.map((p) => [p.id, p]));
  const xi = fixXI(m);
  const bench = fixBench({ ...m, xi });
  const open = windowOpen(m);
  const slotPos = sel?.kind === 'xi' ? f.slots[sel.i] : null;
  const status = (id: string) => (xi.includes(id) ? 'xi' : bench.includes(id) ? 'bank' : 'res');

  const choose = (id: string) => {
    if (!sel) return;
    const nx = [...xi];
    const nb = [...bench];
    if (sel.kind === 'xi') {
      const old = nx[sel.i];
      const atX = nx.indexOf(id), atB = nb.indexOf(id);
      if (atX >= 0) nx[atX] = old; // Tausch innerhalb der Elf
      else if (atB >= 0) nb[atB] = old; // Bankspieler rein, Startspieler auf seinen Bankplatz
      nx[sel.i] = id;
    } else {
      if (nx.includes(id)) { onToast('Startspieler zuerst über das Spielfeld tauschen.'); return; }
      const atB = nb.indexOf(id);
      if (atB >= 0) nb[atB] = nb[sel.i] ?? '';
      if (sel.i < nb.length) nb[sel.i] = id; else nb.push(id);
    }
    setM({ ...m, xi: nx, bench: nb.filter(Boolean) });
    setSel(null);
    sfx('tap');
  };
  const toggleBench = (id: string) => {
    if (bench.includes(id)) setM({ ...m, xi, bench: bench.filter((b) => b !== id) });
    else if (bench.length >= BENCH_SIZE) { onToast(`Die Bank ist voll (${BENCH_SIZE}). Tippe einen Bankplatz an, um zu tauschen.`); return; }
    else setM({ ...m, xi, bench: [...bench, id] });
    sfx('tap');
  };
  const list = sel
    ? [...m.squad].filter((p) => sel.kind === 'xi' || !xi.includes(p.id)).sort((a, b) => (slotPos ? slotRating(b, slotPos) - slotRating(a, slotPos) : b.ovr - a.ovr))
    : [...m.squad].filter((p) => !xi.includes(p.id)).sort((a, b) => Number(bench.includes(b.id)) - Number(bench.includes(a.id)) || b.ovr - a.ovr);

  return (
    <>
      <div className="mg-forms">
        {(Object.keys(FORMATIONS) as Formation[]).map((k) => (
          <button key={k} className={m.formation === k ? 'on' : ''} onClick={() => setM({ ...m, formation: k, xi: fixXI({ squad: m.squad, formation: k, xi: remapXI(m.squad, xi, k) }), bench })}>{k}</button>
        ))}
        <button className="mg-auto" onClick={() => { const nx = bestXI(m.squad, m.formation); setM({ ...m, xi: nx, bench: bestBench(m.squad, nx) }); onToast('Beste Elf und Bank aufgestellt'); }}><Icon name="spark" size={14} />Beste Elf</button>
      </div>
      <div className="mg-pitch" aria-label="Aufstellung">
        <i className="mg-line mid" /><i className="mg-line box-t" /><i className="mg-line box-b" /><i className="mg-line circle" />
        {f.slots.map((s, i) => {
          const p = byId.get(xi[i]);
          const r = p ? slotRating(p, s) : 0;
          const on = sel?.kind === 'xi' && sel.i === i;
          return (
            <button key={i} className={`mg-dotp ${on ? 'sel' : ''} ${p && r < p.ovr ? 'off' : ''}`} style={{ left: `${f.xy[i][0]}%`, top: `${f.xy[i][1]}%` }} onClick={() => setSel(on ? null : { kind: 'xi', i })}>
              <b>{p ? r : '–'}</b><small>{p ? p.name.split(' ').slice(-1)[0] : s}</small><em>{s}</em>
            </button>
          );
        })}
      </div>
      <div className="mg-bench" aria-label="Ersatzbank">
        <h3><Icon name="swap" size={14} />Bank · {bench.length}/{BENCH_SIZE}<small>Ab der 55. Minute kommen 3–5 von ihnen ins Spiel</small></h3>
        <div className="mg-bench-row">
          {Array.from({ length: BENCH_SIZE }, (_, i) => {
            const p = byId.get(bench[i]);
            const on = sel?.kind === 'bench' && sel.i === i;
            return (
              <button key={i} className={`mg-bslot ${p ? '' : 'empty'} ${on ? 'sel' : ''}`} onClick={() => setSel(on ? null : { kind: 'bench', i: Math.min(i, bench.length) })}>
                {p ? <><b className={`mg-ovr t-${p.ovr >= 75 ? 'g' : p.ovr >= 65 ? 's' : 'b'}`}>{p.ovr}</b><small>{p.name.split(' ').slice(-1)[0]}</small><em>{p.pos}</em></> : <><b className="mg-plus">+</b><small>frei</small></>}
              </button>
            );
          })}
        </div>
      </div>
      <p className="mg-hint">{sel ? (sel.kind === 'xi' ? `Spieler für ${f.slots[sel.i]} wählen` : 'Spieler für die Bank wählen') : 'Tippe auf einen Platz oder Bankplatz, um ihn neu zu besetzen.'}</p>
      <ul className="mg-list">
        {list.map((p) => {
          const st = status(p.id);
          const offer = open && !sel ? sellOffer(m, p) : null;
          return (
            <li key={p.id} className={st === 'xi' ? 'xi' : st === 'bank' ? 'bank' : ''}>
              <button className="mg-row" onClick={() => (sel ? choose(p.id) : toggleBench(p.id))}>
                <span className={`mg-ovr t-${p.ovr >= 75 ? 'g' : p.ovr >= 65 ? 's' : 'b'}`}>{slotPos ? slotRating(p, slotPos) : p.ovr}</span>
                <span className="mg-row-text">
                  <b>{p.name}<i className={`mg-st st-${st}`}>{st === 'xi' ? 'Startelf' : st === 'bank' ? 'Bank' : 'Reserve'}</i>{p.joined !== undefined && <i className="mg-new">Neu</i>}</b>
                  <small>{p.pos} · {p.age} J. · {p.apps} Spiele · {p.mins ?? 0} Min. · {p.goals} Tore</small>
                </span>
              </button>
              {offer && (
                <button className="btn ghost small mg-sell" disabled={m.squad.length <= SQUAD_MIN}
                  onClick={() => { const n = sellPlayer(m, p.id); if (n) { setM(n); sfx('coin'); onToast(`${p.name} verkauft: +${moneyShort(offer.amount)} €`); } }}>
                  {moneyShort(offer.amount)}
                </button>
              )}
            </li>
          );
        })}
      </ul>
      {!sel && <p className="mg-hint">Spieler antippen: auf die Bank oder runter · Kader {m.squad.length}/{SQUAD_MAX}{open ? ' · Verkaufen: Betrag antippen' : ''}</p>}
    </>
  );
}

// ---------- Team-Zentrale: Einsätze, Minuten, Tore, Vorlagen, Noten ----------
type SortKey = 'ovr' | 'apps' | 'mins' | 'goals' | 'assists' | 'note';
const COLS: [SortKey, string, string][] = [['ovr', 'GES', 'Gesamtwertung'], ['apps', 'Sp', 'Spiele'], ['mins', 'Min', 'Minuten'], ['goals', 'T', 'Tore'], ['assists', 'V', 'Vorlagen'], ['note', 'Ø', 'Durchschnittsnote']];
function Central({ m }: { m: ManagerState }) {
  const [sort, setSort] = useState<SortKey>('mins');
  const val = (p: MPlayer, k: SortKey) => (k === 'ovr' ? p.ovr : k === 'apps' ? p.apps : k === 'mins' ? p.mins ?? 0 : k === 'goals' ? p.goals : k === 'assists' ? p.assists ?? 0 : avgRating(p));
  const rows = [...m.squad].sort((a, b) => val(b, sort) - val(a, sort) || b.ovr - a.ovr);
  const played = m.squad.filter((p) => p.apps > 0);
  const top = (k: SortKey, min = 0) => [...played].filter((p) => p.apps >= min).sort((a, b) => val(b, k) - val(a, k))[0];
  const tiles: [string, string, MPlayer | undefined, string][] = [
    ['ball', 'Torjäger', top('goals'), 'Tore'], ['spark', 'Vorlagen', top('assists'), 'Vorlagen'],
    ['star', 'Beste Note', top('note', 3), 'Ø'], ['clock', 'Dauerbrenner', top('mins'), 'Min.'],
  ];
  const matches = m.won + m.drawn + m.lost;
  return (
    <>
      <div className="mg-tz-tiles">
        {tiles.map(([ic, label, p, unit]) => (
          <span key={label} className="mg-tz-tile">
            <Icon name={ic} size={18} /><small>{label}</small>
            <b>{p && val(p, label === 'Torjäger' ? 'goals' : label === 'Vorlagen' ? 'assists' : label === 'Beste Note' ? 'note' : 'mins') ? p.name.split(' ').slice(-1)[0] : '–'}</b>
            <em>{p ? `${unit === 'Ø' ? avgRating(p).toFixed(1) : val(p, label === 'Torjäger' ? 'goals' : label === 'Vorlagen' ? 'assists' : 'mins').toLocaleString('de-DE')} ${unit === 'Ø' ? 'Ø' : unit}` : 'noch kein Spiel'}</em>
          </span>
        ))}
      </div>
      <div className="mg-tz-wrap">
        <table className="mg-table mg-tz">
          <thead>
            <tr>
              <th>Spieler</th>
              {COLS.map(([k, l, full]) => <th key={k}><button className={sort === k ? 'on' : ''} title={full} aria-label={full} onClick={() => setSort(k)}>{l}</button></th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => {
              const share = matches ? Math.round(((p.mins ?? 0) / (matches * 90)) * 100) : 0;
              const n = avgRating(p);
              return (
                <tr key={p.id} className={p.apps === 0 ? 'idle' : ''}>
                  <td><span className="mg-tz-name"><b>{p.name}</b><small>{p.pos} · {p.starts ?? 0}× Start · {p.subs ?? 0}× rein{p.motm ? ` · ${p.motm}★` : ''}</small><i className="mg-tz-bar"><em style={{ transform: `scaleX(${share / 100})` }} /></i></span></td>
                  <td>{p.ovr}</td><td>{p.apps}</td><td>{(p.mins ?? 0).toLocaleString('de-DE')}</td><td>{p.goals}</td><td>{p.assists ?? 0}</td>
                  <td><b className={`mg-note ${n >= 7.5 ? 'hi' : n >= 6.5 ? 'ok' : n > 0 ? 'lo' : ''}`}>{n ? n.toFixed(1) : '–'}</b></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mg-hint">GES Wertung · Sp Spiele · Min Minuten · T Tore · V Vorlagen · Ø Note · ★ Spieler des Spiels<br />Balken = Anteil an allen Spielminuten · Spalte antippen zum Sortieren</p>
    </>
  );
}

// ---------- Transfermarkt ----------
const POS_FILTER = ['Alle', 'TW', 'IV', 'AV', 'ZDM', 'ZM', 'ZOM', 'FL', 'ST'];
function Market({ m, setM, onToast, onSigned }: { m: ManagerState; setM: (m: ManagerState) => void; onToast: (t: string) => void; onSigned: (p: MPlayer) => void }) {
  const [pos, setPos] = useState('Alle');
  const [real, setReal] = useState(false);
  const open = windowOpen(m);
  const list = m.market.filter((p) => (pos === 'Alle' || p.pos === pos) && (!real || p.real));
  const buy = (p: MarketPlayer) => {
    const r = buyPlayer(m, p.id);
    if (r.ok) { setM(r.m); onSigned(r.player); }
    else { sfx('error'); onToast(r.reason); if (r.reason.includes('sagt ab')) setM(dropFromMarket(m, p.id)); }
  };
  return (
    <section className="mg-panel">
      {open && m.squad.length >= SQUAD_MAX && <p className="mg-closed"><Icon name="lock" size={16} />Kader voll ({SQUAD_MAX}). Verkaufe im Kader-Tab zuerst einen Spieler.</p>}
      {!open && <p className="mg-closed"><Icon name="lock" size={16} />Transferfenster geschlossen. Es öffnet {m.round < halfRound(m) ? `zur Winterpause (Spieltag ${halfRound(m)})` : 'im Sommer'}.</p>}
      <div className="mg-forms mg-filter">
        {POS_FILTER.map((p) => <button key={p} className={pos === p ? 'on' : ''} onClick={() => setPos(p)}>{p}</button>)}
        <button className={real ? 'on' : ''} onClick={() => setReal(!real)}>Nur echte</button>
      </div>
      <ul className="mg-list mg-market">
        {list.map((p) => {
          const w = willingness(m, p);
          const can = open && p.price <= m.budget && m.squad.length < SQUAD_MAX;
          return (
            <li key={p.id}>
              <span className="mg-row">
                <span className={`mg-ovr t-${p.ovr >= 75 ? 'g' : p.ovr >= 65 ? 's' : 'b'}`}>{p.ovr}</span>
                <span className="mg-row-text">
                  <b>{p.name}{p.real && <i className="mg-real">Echt</i>}{p.pot - p.ovr >= 8 && <i className="mg-gem">Juwel</i>}</b>
                  <small>{p.pos} · {p.age} J. · Pot. {p.pot} · {getClub(p.clubId).name}</small>
                  <span className="mg-will" title="Wechselbereitschaft"><i style={{ transform: `scaleX(${w / 100})` }} className={w < 40 ? 'low' : w > 70 ? 'high' : ''} /><small>{w} % Lust</small></span>
                </span>
              </span>
              <button className="btn primary small mg-buy" disabled={!can} onClick={() => buy(p)}>{moneyShort(p.price)}</button>
            </li>
          );
        })}
      </ul>
      {!list.length && <p className="mg-hint">Keine Spieler für diesen Filter.</p>}
    </section>
  );
}

// ---------- Tabelle ----------
function Table({ m }: { m: ManagerState }) {
  const rows = sortTable(m.rows);
  return (
    <section className="mg-panel">
      <table className="mg-table">
        <thead><tr><th>#</th><th>Verein</th><th>Sp</th><th>TD</th><th>Pkt</th></tr></thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.clubId} className={`${r.clubId === m.clubId ? 'me' : ''} z-${zoneOf(m, i + 1)}`}>
              <td>{i + 1}</td><td>{short(r.clubId)}</td><td>{r.played}</td><td>{r.goalsFor - r.goalsAgainst > 0 ? '+' : ''}{r.goalsFor - r.goalsAgainst}</td><td><b>{r.points}</b></td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mg-hint mg-legend"><i className="z-cl" />Champions League <i className="z-up" />Aufstieg <i className="z-down" />Abstieg</p>
      <ScorerList m={m} />
    </section>
  );
}
function ScorerList({ m }: { m: ManagerState }) {
  const top = [...m.squad].filter((p) => p.goals > 0).sort((a, b) => b.goals - a.goals).slice(0, 5);
  if (!top.length) return null;
  return (
    <div className="mg-results"><h3>Torjäger im Team</h3>
      <ul>{top.map((p, i) => <li key={p.id}><span>{i + 1}. {p.name}</span><b>{p.goals}</b><span>{p.apps} Spiele</span></li>)}</ul>
    </div>
  );
}

// ---------- Verein ----------
function ClubTab({ m, onReset }: { m: ManagerState; onReset: () => void }) {
  return (
    <section className="mg-panel">
      <div className="mg-stats">
        <span><b>{m.won}</b><small>Siege</small></span><span><b>{m.drawn}</b><small>Remis</small></span><span><b>{m.lost}</b><small>Niederlagen</small></span><span><b>{m.trophies.length}</b><small>Titel</small></span>
      </div>
      {m.trophies.length > 0 && <div className="mg-results"><h3>Trophäenschrank</h3><ul className="mg-trophies">{m.trophies.map((t, i) => <li key={i}><Icon name="trophy" size={18} />{t}</li>)}</ul></div>}
      {m.history.length > 0 && (
        <div className="mg-results"><h3>Saisons</h3>
          <ul>{m.history.map((h) => <li key={h.season}><span>{h.season}/{String(h.season + 1).slice(2)} · {getLeague(h.leagueId).name}</span><b>{h.pos}.</b><span>{h.points} Pkt{h.topScorer ? ` · ${h.topScorer}` : ''}</span></li>)}</ul>
        </div>
      )}
      <div className="mg-results"><h3>Neuigkeiten</h3><ul className="mg-news">{m.news.slice(0, 10).map((n, i) => <li key={i}>{n}</li>)}</ul></div>
      <button className="btn ghost small mg-reset" onClick={onReset}>Neuen Verein übernehmen</button>
    </section>
  );
}

// ---------- Spiel-Enthüllung: Minuten rasen, Tore knallen ----------
function MatchReveal({ match, me, onClose }: { match: MyMatch; me: string; onClose: () => void }) {
  const [min, setMin] = useState(() => (motionReduced() ? 90 : 0));
  const timer = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const shown = match.events.filter((e) => e.min <= min);
  const shownGoals = shown.filter(isGoal);
  const hg = shownGoals.filter((e) => e.home).length, ag = shownGoals.length - hg;
  const done = min >= 90;
  const meHome = match.home === me;
  const gf = meHome ? match.hg : match.ag, ga = meHome ? match.ag : match.hg;
  const res = gf > ga ? 'win' : gf === ga ? 'draw' : 'loss';
  const lastGoal = shownGoals[shownGoals.length - 1];
  const [flash, setFlash] = useState<{ k: number; mine: boolean } | null>(null);
  useEffect(() => {
    if (done) return;
    timer.current = setInterval(() => setMin((x) => Math.min(90, x + 1)), 34);
    return () => clearInterval(timer.current);
  }, [done]);
  useEffect(() => {
    if (!lastGoal || lastGoal.min !== min) return;
    const mine = lastGoal.home === meHome;
    sfx(mine ? 'revealRare' : 'fall');
    buzz(mine ? [40, 30, 90] : 60);
    setFlash({ k: shownGoals.length, mine });
    const t = setTimeout(() => setFlash(null), 750);
    return () => clearTimeout(t);
  }, [shownGoals.length]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (done) { sfx(res === 'win' ? 'fanfare' : res === 'draw' ? 'whistle' : 'fall'); } }, [done]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className={`mg-match ${done ? `end ${res}` : ''}`} role="dialog" aria-modal="true" aria-label="Spiel" onClick={() => (done ? onClose() : setMin(90))}>
      {done && res === 'win' && <Confetti pieces={60} />}
      {flash && !done && <b key={flash.k} className={`mg-goal ${flash.mine ? 'mine' : 'opp'}`} aria-hidden="true">TOR!</b>}
      <small className="mg-m-round">Spieltag {match.round}</small>
      <div className="mg-board-big">
        <span className={match.home === me ? 'me' : ''}>{getClub(match.home).name}</span>
        <b key={`${hg}-${ag}`} className={shownGoals.length ? 'pop' : ''}>{hg}<i>:</i>{ag}</b>
        <span className={match.away === me ? 'me' : ''}>{getClub(match.away).name}</span>
      </div>
      <div className="mg-clock"><i style={{ transform: `scaleX(${min / 90})` }} /><b>{min}'</b></div>
      <ul className="mg-events">
        {shown.map((e, i) => e.kind === 'sub'
          ? <li key={i} className={`${e.home ? 'h' : 'a'} sub`}><b>{e.min}'</b><Icon name="swap" size={14} /><span><em className="in">{e.scorer}</em> für <em className="out">{e.out}</em></span></li>
          : <li key={i} className={`${e.home ? 'h' : 'a'} ${e.home === meHome ? 'mine' : ''}`}><b>{e.min}'</b><Icon name="ball" size={14} /><span>{e.scorer}{e.assist && <small> · Vorlage {e.assist}</small>}</span></li>)}
      </ul>
      {done ? (
        <div className="mg-m-res" onClick={(ev) => ev.stopPropagation()}>
          <strong>{res === 'win' ? 'Sieg!' : res === 'draw' ? 'Unentschieden' : 'Niederlage'}</strong>
          {match.motm && <span className="mg-motm"><Icon name="star" size={16} />Spieler des Spiels: <b>{match.motm}</b>{match.ratings?.[0] && <em>{match.ratings[0].r.toFixed(1)}</em>}</span>}
          {match.ratings && (
            <ul className="mg-rates">
              {match.ratings.map((r) => <li key={r.name}><span>{r.name}</span><small>{r.mins}'</small><b className={`mg-note ${r.r >= 7.5 ? 'hi' : r.r >= 6.5 ? 'ok' : 'lo'}`}>{r.r.toFixed(1)}</b></li>)}
            </ul>
          )}
          <button className="btn primary big" onClick={onClose}>Weiter</button>
        </div>
      ) : <button className="pack-skip mt-skip" onClick={(ev) => { ev.stopPropagation(); setMin(90); }}>Überspringen</button>}
    </div>
  );
}

// ---------- Neuzugang ----------
function Signing({ p, clubId, onClose }: { p: MPlayer; clubId: string; onClose: () => void }) {
  return (
    <div className="mg-sign" role="dialog" aria-modal="true" aria-label="Neuzugang" onClick={onClose}>
      <small>Neuzugang</small>
      <span className="mg-sign-card"><UtCard card={toCard(p, clubId)} size="lg" shine /></span>
      <b className="mg-stamp">Unterschrieben</b>
      <p>{p.name} spielt ab sofort für {getClub(clubId).name}.</p>
      <button className="btn primary big" onClick={onClose}>Willkommen!</button>
    </div>
  );
}

// ---------- Saisonbilanz ----------
function SeasonEnd({ s, m, onClose }: { s: SeasonSummary; m: ManagerState; onClose: () => void }) {
  const big = s.title || s.move === 'up';
  return (
    <div className={`mg-season ${big ? 'big' : ''} ${s.move === 'down' ? 'down' : ''}`} role="dialog" aria-modal="true" aria-label="Saisonbilanz">
      {big && <Confetti pieces={110} />}
      <div className="mg-season-inner">
        <small>Saisonbilanz {m.season - 1}/{String(m.season).slice(2)}</small>
        {s.title ? <h2 className="mg-title-win"><Icon name="trophy" size={40} />Meister!</h2> : <h2>Platz {s.pos}</h2>}
        {s.move === 'up' && <p className="mg-move up">Aufstieg in die {getLeague(s.newLeague!).name}!</p>}
        {s.move === 'down' && <p className="mg-move down">Abstieg in die {getLeague(s.newLeague!).name}.</p>}
        <p className={`mg-target ${s.reached ? 'ok' : 'no'}`}>{s.reached ? `Vorstandsziel erreicht (Platz ${s.target})` : `Vorstandsziel verfehlt (Platz ${s.target})`}</p>
        <ul className="mg-sum">
          <li><span>Punkte</span><b>{s.points}</b></li>
          <li><span>Preisgeld</span><b>+{moneyShort(s.prize)} €</b></li>
          <li><span>Coins für dein Konto</span><b>+{s.coins.toLocaleString('de-DE')}</b></li>
          {s.title && <li><span>Meister-Belohnung</span><b>Premium-Pack (Ablage)</b></li>}
          {s.topScorer && <li><span>Torjäger</span><b>{s.topScorer.name} · {s.topScorer.goals}</b></li>}
        </ul>
        {s.grew.length > 0 && <div className="mg-grew"><h3>Entwicklung</h3><ul>{s.grew.map((g) => <li key={g.name}><span>{g.name}</span><b>{g.from} → {g.to}</b></li>)}</ul></div>}
        {s.retired.length > 0 && <p className="mg-hint">Karriereende: {s.retired.join(', ')}</p>}
        <button className="btn primary big" onClick={onClose}>Neue Saison starten</button>
      </div>
    </div>
  );
}
