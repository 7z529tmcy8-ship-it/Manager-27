import { useEffect, useMemo, useState } from 'react';
import Icon from './Icon';
import ClubCrest from './ClubCrest';
import { getClub, getLeague } from '../data/leagues';
import { sortTable } from '../game/season';
import { play } from '../sound';
import {
  type BossState, type SeasonEnd, type TicketLevel, type IncomeKey, type CostKey, type Ledger,
  COST_NAME, EURO_MONEY, EURO_NAME, INCOME_NAME, NLZ_NAME, SEAT_STEP, TICKETS, SLOT_NAME,
  adsYear, attendance, bossClubs, bossLeagues, canPlay, clubName, closeSeason, coachBoost, debt, decide, fireCoach, isGerman,
  leagueOf, loadBoss, loanOptions, matchIncome, money, monthName, newBoss, nlzUpgradeCost, nlzYear, payroll,
  playMonth, position, saveBoss, seatCost, setTicket, severance, squadCostRatio, startBuild, sumIn, sumOut, takeLoan, ticketPrice,
  tvMoney, upgradeNlz, vipCost, wageOf, youthMinutesShare, downgradeNlz, LOAN_RATE,
} from '../game/boss';

const sfx = (id: Parameters<typeof play>[0]) => { try { play(id); } catch { /* kein Ton */ } };
type Tab = 'office' | 'money' | 'club' | 'squad' | 'table';
const TABS: [Tab, string, string][] = [['office', 'Büro', 'calendar'], ['money', 'Finanzen', 'money'], ['club', 'Verein', 'stadium'], ['squad', 'Kader', 'shirt'], ['table', 'Tabelle', 'chart']];

/** Vereinsboss: den Verein als Geschäftsführer leiten. */
export default function BossPage({ onExit }: { onExit: () => void }) {
  const [b, setB] = useState<BossState | null>(() => loadBoss());
  const update = (n: BossState | null) => { setB(n); saveBoss(n); };
  if (!b) return <BossStart onExit={onExit} onStart={(id) => { sfx('tap'); update(newBoss(id)); }} />;
  return <BossGame b={b} onChange={update} onExit={onExit} />;
}

// ---------- Start: Verein wählen ----------
function BossStart({ onExit, onStart }: { onExit: () => void; onStart: (clubId: string) => void }) {
  const leagues = useMemo(() => bossLeagues(), []);
  const [lg, setLg] = useState('bl1');
  const clubs = bossClubs(lg);
  return (
    <main className="hub bo">
      <button className="cs-link" onClick={onExit}>‹ Menü</button>
      <section className="bo-hero">
        <span className="bo-hero-ic"><Icon name="money" size={30} /></span>
        <h1>Vereinsboss</h1>
        <p>Du leitest das Geschäft: Geld, Tickets, Sponsoren, Trainer, NLZ und Stadion. Die Spiele macht die Mannschaft.</p>
      </section>
      <label className="bo-field">
        <span>Liga</span>
        <select value={lg} onChange={(e) => setLg(e.target.value)}>
          {leagues.map((l) => <option key={l.id} value={l.id}>{l.name} ({l.country})</option>)}
        </select>
      </label>
      <ul className="bo-clubs">
        {clubs.map((c) => (
          <li key={c.id}>
            <button onClick={() => onStart(c.id)}>
              <ClubCrest id={c.id} size={30} />
              <span><b>{c.name}</b><small>Stärke {c.strength}</small></span>
              <Icon name="arrow" size={18} />
            </button>
          </li>
        ))}
      </ul>
      <p className="bo-note">Die Geldbeträge sind an echten Ligen angelehnt, aber vereinfacht – keine echten Vereinszahlen.</p>
    </main>
  );
}

// ---------- Spiel ----------
function BossGame({ b, onChange, onExit }: { b: BossState; onChange: (b: BossState | null) => void; onExit: () => void }) {
  const [tab, setTab] = useState<Tab>('office');
  const [toast, setToast] = useState<string | null>(null);
  const [end, setEnd] = useState<SeasonEnd | null>(null);
  const [showReport, setShowReport] = useState(false);
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(null), 2600); return () => clearTimeout(t); }, [toast]);
  const lg = getLeague(leagueOf(b));
  const played = b.m.rows.find((r) => r.clubId === b.m.clubId)?.played ?? 0;
  const pos = played ? position(b) : 0;

  const choose = (cardId: string, act: string) => {
    const r = decide(b, cardId, act);
    sfx(act === 'skip' || act.endsWith('-no') ? 'tap' : 'coin');
    onChange(r.b);
    if (r.msg) setToast(r.msg);
  };
  const play1 = () => { sfx('whistle'); onChange(playMonth(b)); setShowReport(true); };
  const finish = () => { const r = closeSeason(b); sfx(r.end.fired ? 'tap' : 'levelUp'); setEnd(r.end); onChange(r.b); };

  if (b.fired && !end) {
    return (
      <main className="hub bo">
        <section className="bo-hero bad">
          <span className="bo-hero-ic"><Icon name="broken" size={30} /></span>
          <h1>Entlassen</h1>
          <p>Der Aufsichtsrat hat dir das Vertrauen entzogen. Deine Zeit bei {clubName(b)} ist vorbei.</p>
          <Seasons b={b} />
          <button className="btn primary big" onClick={() => onChange(null)}>Neuen Verein übernehmen</button>
          <button className="cs-link" onClick={onExit}>‹ Menü</button>
        </section>
      </main>
    );
  }

  return (
    <main className="hub bo">
      <div className="bo-top">
        <button className="cs-link" onClick={onExit}>‹ Menü</button>
        <span className="bo-date"><Icon name="calendar" size={14} /> {monthName(b)}</span>
      </div>
      <header className="bo-head">
        <ClubCrest id={b.m.clubId} size={44} />
        <div className="bo-head-main">
          <b>{clubName(b)}</b>
          <small>{lg.name}{pos ? ` · Platz ${pos}` : ''} · Ziel: Platz {b.m.target}</small>
        </div>
        <div className={`bo-cash ${b.cash < 0 ? 'neg' : ''}`}><small>Kasse</small><b>{money(b.cash)}</b></div>
      </header>
      <div className="bo-meters">
        <Meter label="Fans" v={b.fans} icon="heart" />
        <Meter label="Aufsichtsrat" v={b.trust} icon="handshake" />
      </div>

      <nav className="bo-tabs" aria-label="Bereiche">
        {TABS.map(([id, name, icon]) => (
          <button key={id} className={tab === id ? 'on' : ''} onClick={() => { setTab(id); sfx('tap'); }}>
            <Icon name={icon} size={18} /><span>{name}</span>
            {id === 'office' && b.cards.length > 0 && <i>{b.cards.length}</i>}
          </button>
        ))}
      </nav>

      {tab === 'office' && <Office b={b} onChoose={choose} onPlay={play1} onFinish={finish} onReport={() => setShowReport(true)} />}
      {tab === 'money' && <Money b={b} onChange={onChange} onToast={setToast} />}
      {tab === 'club' && <Club b={b} onChange={onChange} onToast={setToast} onReset={() => onChange(null)} />}
      {tab === 'squad' && <Squad b={b} />}
      {tab === 'table' && <Table b={b} />}

      {showReport && b.report && <Report b={b} onClose={() => setShowReport(false)} />}
      {end && <SeasonSheet end={end} b={b} onClose={() => setEnd(null)} />}
      {toast && <div className="coin-toast" role="status">{toast}</div>}
    </main>
  );
}

function Meter({ label, v, icon }: { label: string; v: number; icon: string }) {
  return (
    <div className={`bo-meter ${v < 30 ? 'low' : v >= 70 ? 'high' : ''}`}>
      <span><Icon name={icon} size={14} /> {label}</span>
      <i><b style={{ transform: `scaleX(${v / 100})` }} /></i>
      <em>{v}</em>
    </div>
  );
}

// ---------- Büro: Vorstandssitzung + Monat ----------
function Office({ b, onChoose, onPlay, onFinish, onReport }: { b: BossState; onChoose: (id: string, act: string) => void; onPlay: () => void; onFinish: () => void; onReport: () => void }) {
  return (
    <section className="bo-sec">
      {b.seasonOver ? (
        <div className="bo-panel bo-end">
          <h2>Saison vorbei</h2>
          <p>Zeit für die Bilanz{isGerman(leagueOf(b)) ? ', die Mitgliederversammlung' : ''} und das Urteil des Aufsichtsrats.</p>
          <button className="btn primary big" onClick={onFinish}><Icon name="chart" size={18} /> Saisonbilanz ansehen</button>
        </div>
      ) : b.cards.length ? (
        <>
          <h2 className="bo-h">Vorstandssitzung · {b.cards.length} {b.cards.length === 1 ? 'Entscheidung' : 'Entscheidungen'}</h2>
          {b.cards.slice(0, 1).map((c) => (
            <article key={c.id} className={`bo-card k-${c.kind}`}>
              <small>{c.kind === 'buy' ? 'Transfer' : c.kind === 'bid' ? 'Verkaufsangebot' : c.kind === 'sponsor' ? 'Sponsoring' : c.kind === 'coach' ? 'Personal' : c.kind === 'investor' ? 'Investor' : c.kind === 'license' ? 'Lizenz' : 'Ereignis'}</small>
              <h3>{c.title}</h3>
              <p>{c.text}</p>
              <div className="bo-opts">
                {c.options.map((o) => (
                  <button key={o.act} className={`bo-opt ${o.act === 'skip' || o.act.endsWith('-no') ? 'no' : ''}`} onClick={() => onChoose(c.id, o.act)}>
                    <b>{o.label}</b>{o.sub && <small>{o.sub}</small>}
                  </button>
                ))}
              </div>
            </article>
          ))}
          {b.cards.length > 1 && <p className="bo-more">Danach noch {b.cards.length - 1} weitere</p>}
        </>
      ) : (
        <div className="bo-panel bo-next">
          <h2>{monthName(b)}</h2>
          <p>Alles entschieden. Der Trainer stellt auf, du schaust auf die Zahlen.</p>
          <button className="btn primary big bo-play" onClick={onPlay} disabled={!canPlay(b)}><Icon name="ball" size={18} /> Monat spielen</button>
        </div>
      )}
      {b.report && !b.seasonOver && (
        <button className="bo-last" onClick={onReport}>
          <span><small>Letzter Monat · {b.report.label}</small><b>{b.report.results.map((r) => `${r.gf}:${r.ga}`).join('  ') || 'keine Spiele'}</b></span>
          <em className={b.report.cashAfter >= b.report.cashBefore ? 'pos' : 'neg'}>{b.report.cashAfter >= b.report.cashBefore ? '+' : ''}{money(b.report.cashAfter - b.report.cashBefore)}</em>
        </button>
      )}
      {b.log.length > 0 && (
        <div className="bo-panel">
          <h3>Chronik</h3>
          <ul className="bo-log">{b.log.slice(0, 6).map((l, i) => <li key={i}>{l}</li>)}</ul>
        </div>
      )}
    </section>
  );
}

// ---------- Finanzen ----------
function LedgerBars({ l }: { l: Ledger }) {
  const ins = (Object.entries(l.in) as [IncomeKey, number][]).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
  const outs = (Object.entries(l.out) as [CostKey, number][]).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
  const max = Math.max(1, ...ins.map(([, v]) => v), ...outs.map(([, v]) => v));
  const tin = sumIn(l), tout = sumOut(l);
  return (
    <div className="bo-ledger">
      <h4 className="pos">Einnahmen <b>{money(tin)}</b></h4>
      {ins.map(([k, v]) => <Bar key={k} name={INCOME_NAME[k]} v={v} max={max} kind="in" />)}
      <h4 className="neg">Ausgaben <b>{money(tout)}</b></h4>
      {outs.map(([k, v]) => <Bar key={k} name={COST_NAME[k]} v={v} max={max} kind="out" />)}
      <p className={`bo-net ${tin - tout >= 0 ? 'pos' : 'neg'}`}>{tin - tout >= 0 ? 'Gewinn' : 'Verlust'} <b>{money(tin - tout)}</b></p>
    </div>
  );
}
function Bar({ name, v, max, kind }: { name: string; v: number; max: number; kind: 'in' | 'out' }) {
  return (
    <div className={`bo-bar ${kind}`}>
      <span>{name}</span><b>{money(v)}</b>
      <i><em style={{ transform: `scaleX(${Math.max(0.01, v / max)})` }} /></i>
    </div>
  );
}

function Money({ b, onChange, onToast }: { b: BossState; onChange: (b: BossState) => void; onToast: (s: string) => void }) {
  const tv = tvMoney(b);
  const ratio = squadCostRatio(b);
  const [loanOpen, setLoanOpen] = useState(false);
  return (
    <section className="bo-sec">
      <div className="bo-panel">
        <h3>Diese Saison</h3>
        {sumIn(b.ledger) + sumOut(b.ledger) > 0 ? <LedgerBars l={b.ledger} /> : <p className="muted">Noch keine Buchungen – spiel den ersten Monat.</p>}
      </div>

      <div className="bo-panel">
        <h3>Ticketpreise</h3>
        <p className="muted">Ø {ticketPrice(b)} € · {attendance(b).toLocaleString('de-DE')} von {b.cap.toLocaleString('de-DE')} Plätzen · {money(matchIncome(b))} pro Heimspiel</p>
        <div className="bo-seg">
          {(Object.keys(TICKETS) as TicketLevel[]).map((t) => (
            <button key={t} className={b.ticket === t ? 'on' : ''} onClick={() => { onChange(setTicket(b, t)); sfx('tap'); }}>
              <b>{TICKETS[t].name}</b><small>{Math.round(TICKETS[t].price * 100)} %</small>
            </button>
          ))}
        </div>
        <small className="bo-hint">Teure Tickets bringen mehr pro Platz, aber weniger Zuschauer – und die Fans werden jeden Monat unzufriedener.</small>
      </div>

      <div className="bo-panel">
        <h3>TV-Geld pro Saison · {money(tv.total)}</h3>
        <ul className="bo-kv">
          <li><span>Gleich für alle (50 %)</span><b>{money(tv.equal)}</b></li>
          <li><span>Leistung, Platz {b.lastPos} der Vorsaison (43 %)</span><b>{money(tv.perf)}</b></li>
          <li><span>Nachwuchs: {Math.round(youthMinutesShare(b) * 100)} % Minuten U23 (4 %)</span><b>{money(tv.youth)}</b></li>
          <li><span>Interesse: Fans und {b.members.toLocaleString('de-DE')} Mitglieder (3 %)</span><b>{money(tv.interest)}</b></li>
          {b.europe && <li><span>{EURO_NAME[b.europe]}</span><b>{money(EURO_MONEY[b.europe])}</b></li>}
        </ul>
        <small className="bo-hint">Aufteilung angelehnt an die DFL-Verteilung (gleich, Leistung, Nachwuchs, Interesse).</small>
      </div>

      <div className="bo-panel">
        <h3>Sponsoren · {money(b.sponsors.reduce((a, s) => a + s.perYear, 0) + adsYear(b))}/Jahr</h3>
        <ul className="bo-kv">
          {b.sponsors.map((s) => <li key={s.slot}><span>{SLOT_NAME[s.slot]}: {s.name} · noch {s.years} J.</span><b>{money(s.perYear)}</b></li>)}
          <li><span>Banden, Partner, Logenkunden</span><b>{money(adsYear(b))}</b></li>
        </ul>
      </div>

      <div className="bo-panel">
        <h3>Kosten im Blick</h3>
        <ul className="bo-kv">
          <li><span>Spielergehälter</span><b>{money(payroll(b))}/Jahr</b></li>
          <li><span>Trainer</span><b>{money(b.coach?.wage ?? 0)}/Jahr</b></li>
          <li><span>NLZ ({NLZ_NAME[b.nlz]})</span><b>{money(nlzYear(b))}/Jahr</b></li>
          <li className={ratio > 0.7 ? 'warn' : ''}><span>Kaderkosten-Quote {b.europe ? '(UEFA-Grenze 70 %)' : ''}</span><b>{Math.round(ratio * 100)} %</b></li>
        </ul>
        {b.europe && ratio > 0.7 && <small className="bo-hint warn">Über 70 %: Am Saisonende droht eine UEFA-Strafe.</small>}
      </div>

      <div className="bo-panel">
        <h3>Kredite · Schulden {money(debt(b))}</h3>
        {b.loans.length > 0 && <ul className="bo-kv">{b.loans.map((l, i) => <li key={i}><span>Rate {money(l.monthly)}/Monat</span><b>noch {money(l.left)}</b></li>)}</ul>}
        {!loanOpen ? <button className="btn secondary" onClick={() => setLoanOpen(true)}>Kredit aufnehmen</button> : (
          <div className="bo-seg">
            {loanOptions(b).map((a) => (
              <button key={a} onClick={() => { onChange(takeLoan(b, a)); setLoanOpen(false); onToast(`Kredit über ${money(a)} aufgenommen.`); sfx('coin'); }}>
                <b>{money(a)}</b><small>{Math.round(LOAN_RATE * 100)} % Zinsen</small>
              </button>
            ))}
          </div>
        )}
        <small className="bo-hint">Rückzahlung über 30 Monate. Ist das Konto im Minus, werden 12 % Überziehungszinsen fällig.</small>
      </div>
    </section>
  );
}

// ---------- Verein: Stadion, NLZ, Trainer, Fans ----------
function Club({ b, onChange, onToast, onReset }: { b: BossState; onChange: (b: BossState) => void; onToast: (s: string) => void; onReset: () => void }) {
  const upCost = nlzUpgradeCost(b);
  const german = isGerman(leagueOf(b));
  const tier = getLeague(leagueOf(b)).tier;
  return (
    <section className="bo-sec">
      <div className="bo-panel">
        <h3><Icon name="stadium" size={16} /> Stadion</h3>
        <ul className="bo-kv">
          <li><span>Plätze</span><b>{b.cap.toLocaleString('de-DE')}</b></li>
          <li><span>VIP-Logen</span><b>Stufe {b.vip} / 3</b></li>
          <li><span>Zuschauerschnitt</span><b>{attendance(b).toLocaleString('de-DE')}</b></li>
        </ul>
        {b.build ? <p className="bo-build"><Icon name="clock" size={14} /> Baustelle: {b.build.kind === 'seats' ? `+${SEAT_STEP.toLocaleString('de-DE')} Plätze` : 'VIP-Logen'} · noch {b.build.monthsLeft} {b.build.monthsLeft === 1 ? 'Monat' : 'Monate'}</p> : (
          <div className="bo-btns">
            <button className="btn secondary" disabled={seatCost(b) > b.cash} onClick={() => { onChange(startBuild(b, 'seats')); onToast('Bauarbeiten gestartet.'); sfx('coin'); }}>
              +{SEAT_STEP.toLocaleString('de-DE')} Plätze · {money(seatCost(b))}<small>6 Monate Bauzeit</small>
            </button>
            <button className="btn secondary" disabled={b.vip >= 3 || vipCost(b) > b.cash} onClick={() => { onChange(startBuild(b, 'vip')); onToast('Logen werden gebaut.'); sfx('coin'); }}>
              VIP-Logen · {money(vipCost(b))}<small>+15 % Spieltag-Einnahmen, 3 Monate</small>
            </button>
          </div>
        )}
      </div>

      <div className="bo-panel">
        <h3><Icon name="rise" size={16} /> Nachwuchs (NLZ)</h3>
        <p className="muted">Stufe {b.nlz}: {NLZ_NAME[b.nlz]} · {money(nlzYear(b))} pro Jahr</p>
        <div className="bo-steps">{[1, 2, 3, 4, 5].map((i) => <i key={i} className={i <= b.nlz ? 'on' : ''} />)}</div>
        <p className="bo-hint">Jede Saison {b.nlz === 0 ? 'kommen keine Talente' : b.nlz >= 5 ? 'kommen 3 Talente' : b.nlz >= 3 ? 'kommen 2 Talente' : 'kommt 1 Talent'}. Eigene Talente einsetzen bringt TV-Geld (Säule Nachwuchs), verkaufen ist fast reiner Gewinn. Nur wenige schaffen es wirklich zu den Profis.</p>
        {german && tier <= 2 && <p className="bo-hint">In der 1. und 2. Liga ist ein NLZ Pflicht für die Lizenz.</p>}
        <div className="bo-btns">
          {b.nlz < 5 && <button className="btn secondary" disabled={upCost > b.cash} onClick={() => { onChange(upgradeNlz(b)); onToast('NLZ ausgebaut.'); sfx('coin'); }}>Ausbauen · {money(upCost)}<small>danach {money(nlzYear({ ...b, nlz: b.nlz + 1 }))}/Jahr</small></button>}
          {b.nlz > 0 && <button className="btn secondary" onClick={() => { if (window.confirm('NLZ verkleinern? Spart Kosten, bringt weniger Talente.')) onChange(downgradeNlz(b)); }}>Verkleinern</button>}
        </div>
      </div>

      <div className="bo-panel">
        <h3><Icon name="whistle" size={16} /> Trainer</h3>
        {b.coach ? (
          <>
            <ul className="bo-kv">
              <li><span>{b.coach.name}</span><b className="bo-stars">{'★'.repeat(b.coach.stars)}<span>{'★'.repeat(5 - b.coach.stars)}</span></b></li>
              <li><span>Stil</span><b>{b.coach.tactic} · {b.coach.formation}</b></li>
              <li><span>Wirkung auf das Team</span><b>{coachBoost(b.coach) >= 0 ? '+' : ''}{coachBoost(b.coach).toLocaleString('de-DE')}</b></li>
              <li><span>Gehalt</span><b>{money(b.coach.wage)}/Jahr</b></li>
            </ul>
            <button className="btn secondary" disabled={!!b.seasonOver} onClick={() => { if (window.confirm(`${b.coach!.name} entlassen? Abfindung: ${money(severance(b.coach!))}.`)) { onChange(fireCoach(b)); onToast('Trainer entlassen – such einen Nachfolger im Büro.'); } }}>Entlassen · Abfindung {money(severance(b.coach))}</button>
          </>
        ) : <p className="muted">Kein Trainer – wähle einen im Büro.</p>}
      </div>

      <div className="bo-panel">
        <h3><Icon name="heart" size={16} /> Fans & Eigentümer</h3>
        <ul className="bo-kv">
          <li><span>Fan-Stimmung</span><b>{b.fans} / 100</b></li>
          <li><span>Mitglieder</span><b>{b.members.toLocaleString('de-DE')}</b></li>
          <li><span>Aufsichtsrat</span><b>{b.trust} / 100</b></li>
          <li><span>Eigentümer</span><b>{b.investor ? `${100 - b.investor.share} % Verein · ${b.investor.share} % Investor` : '100 % Verein'}</b></li>
        </ul>
        {german && <small className="bo-hint">50+1-Regel: In Deutschland behält der Verein immer die Mehrheit. Am Saisonende stimmt die Mitgliederversammlung über deine Arbeit ab.</small>}
        <small className="bo-hint">Fällt das Vertrauen des Aufsichtsrats am Saisonende auf 10 oder weniger, wirst du entlassen.</small>
      </div>

      <Seasons b={b} />
      <button className="bo-reset" onClick={() => { if (window.confirm('Diesen Spielstand beenden und einen neuen Verein wählen?')) onReset(); }}>Anderen Verein übernehmen</button>
    </section>
  );
}

function Seasons({ b }: { b: BossState }) {
  if (!b.history.length) return null;
  return (
    <div className="bo-panel">
      <h3>Bisherige Saisons</h3>
      <ul className="bo-hist">
        {b.history.map((h) => (
          <li key={h.season}>
            <b>{h.season}/{String(h.season + 1).slice(2)}</b>
            <span>{getLeague(h.leagueId).name} · Platz {h.pos}{h.title ? ' · Meister' : ''}{h.move === 'up' ? ' · Aufstieg' : h.move === 'down' ? ' · Abstieg' : ''}</span>
            <em className={h.profit >= 0 ? 'pos' : 'neg'}>{h.profit >= 0 ? '+' : ''}{money(h.profit)}</em>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ---------- Kader ----------
function Squad({ b }: { b: BossState }) {
  const xi = new Set(b.m.xi);
  const list = [...b.m.squad].sort((x, y) => Number(xi.has(y.id)) - Number(xi.has(x.id)) || y.ovr - x.ovr);
  return (
    <section className="bo-sec">
      <div className="bo-panel">
        <h3>Kader · {b.m.squad.length} Spieler · {money(payroll(b))}/Jahr</h3>
        <p className="muted">Aufstellen macht der Trainer. Du entscheidest über Transfers im Sommer (August) und Winter (Januar).</p>
        <ul className="bo-squad">
          {list.map((p) => (
            <li key={p.id} className={xi.has(p.id) ? 'xi' : ''}>
              <em>{p.ovr}</em>
              <span><b>{p.name}{p.own && <i className="bo-own">NLZ</i>}</b><small>{p.pos} · {p.age} J.{p.apps ? ` · ${p.apps} Sp. · ${p.goals} T.` : ''}</small></span>
              <small className="bo-wage">{money(wageOf(b, p))}</small>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

// ---------- Tabelle ----------
function Table({ b }: { b: BossState }) {
  const rows = sortTable(b.m.rows);
  return (
    <section className="bo-sec">
      <div className="bo-panel">
        <h3>{getLeague(leagueOf(b)).name}</h3>
        <ol className="bo-table">
          {rows.map((r, i) => (
            <li key={r.clubId} className={r.clubId === b.m.clubId ? 'me' : ''}>
              <em>{i + 1}</em><i className="bo-crest"><ClubCrest id={r.clubId} size={18} /></i><span>{getClub(r.clubId).name}</span><small>{r.played}</small><b>{r.points}</b>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

// ---------- Monatsbericht ----------
function Report({ b, onClose }: { b: BossState; onClose: () => void }) {
  const r = b.report!;
  const d = r.cashAfter - r.cashBefore;
  return (
    <div className="overlay bo-sheet-wrap" role="dialog" aria-modal="true" aria-label="Monatsbericht" onClick={onClose}>
      <section className="bo-sheet" onClick={(e) => e.stopPropagation()}>
        <small>Monatsbericht</small>
        <h2>{r.label}</h2>
        <ul className="bo-results">
          {r.results.map((x, i) => (
            <li key={i} className={x.gf > x.ga ? 'w' : x.gf === x.ga ? 'd' : 'l'}>
              <span>{x.home ? 'Heim' : 'Ausw.'}</span><ClubCrest id={x.opp} size={18} /><b>{getClub(x.opp).name}</b><em>{x.gf}:{x.ga}</em>
            </li>
          ))}
          {!r.results.length && <li className="d"><b>Keine Spiele in diesem Monat</b></li>}
        </ul>
        {r.attendance !== undefined && <p className="muted">Zuschauerschnitt: {r.attendance.toLocaleString('de-DE')}</p>}
        <LedgerBars l={r.ledger} />
        {r.notes.map((n, i) => <p key={i} className="bo-hint">{n}</p>)}
        <p className={`bo-delta ${d >= 0 ? 'pos' : 'neg'}`}>Kasse {d >= 0 ? '+' : ''}{money(d)} → <b>{money(r.cashAfter)}</b></p>
        <button className="btn primary big" onClick={onClose}>Weiter</button>
      </section>
    </div>
  );
}

// ---------- Saisonbilanz ----------
function SeasonSheet({ end, b, onClose }: { end: SeasonEnd; b: BossState; onClose: () => void }) {
  return (
    <div className="overlay bo-sheet-wrap" role="dialog" aria-modal="true" aria-label="Saisonbilanz">
      <section className="bo-sheet">
        <small>Saisonbilanz</small>
        <h2>{end.title ?? `Platz ${end.pos}`}</h2>
        <p className={end.reached ? 'bo-ok' : 'bo-bad'}>{end.reached ? `Saisonziel erreicht (Platz ${end.target})` : `Saisonziel verfehlt (Ziel: Platz ${end.target})`}</p>
        {end.move && <p className={end.move === 'up' ? 'bo-ok' : 'bo-bad'}>{end.move === 'up' ? 'Aufstieg' : 'Abstieg'} in die {getLeague(end.newLeague!).name}</p>}
        {end.europe && <p className="bo-ok">Nächste Saison: {EURO_NAME[end.europe]}</p>}
        <LedgerBars l={end.ledger} />
        {end.sponsorBonus > 0 && <p className="bo-hint">Sponsoren-Bonus fürs Saisonziel: {money(end.sponsorBonus)}</p>}
        {end.uefaFine > 0 && <p className="bo-hint warn">UEFA-Strafe wegen Kaderkosten-Quote {Math.round(end.ratio * 100)} %: {money(end.uefaFine)}</p>}
        {end.vote !== null && (
          <div className="bo-vote">
            <h4>Mitgliederversammlung</h4>
            <div className="bo-vote-bar"><i style={{ transform: `scaleX(${end.vote / 100})` }} /></div>
            <p>{end.vote} % stimmen für deine Entlastung{end.vote < 50 ? ' – durchgefallen!' : '.'}</p>
          </div>
        )}
        <p className={end.trustDelta >= 0 ? 'bo-ok' : 'bo-bad'}>Aufsichtsrat: {end.trustDelta >= 0 ? '+' : ''}{end.trustDelta} → {end.trust} / 100</p>
        {end.license && <p className="bo-hint warn">{end.license}</p>}
        {end.talents.length > 0 && (
          <div className="bo-tal"><h4>Neu aus dem NLZ</h4><ul>{end.talents.map((t) => <li key={t}>{t}</li>)}</ul></div>
        )}
        {end.fired ? <p className="bo-bad big">Der Aufsichtsrat entlässt dich.</p> : <p className="muted">Neue Saison {b.m.season}/{String(b.m.season + 1).slice(2)} in der {getLeague(leagueOf(b)).name}.</p>}
        <button className="btn primary big" onClick={onClose}>{end.fired ? 'Weiter' : 'Neue Saison'}</button>
      </section>
    </div>
  );
}

