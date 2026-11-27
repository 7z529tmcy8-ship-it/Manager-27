import { useEffect, useMemo, useRef, useState } from 'react';
import Icon from './Icon';
import ClubCrest from './ClubCrest';
import { getClub, getLeague } from '../data/leagues';
import { sortTable } from '../game/season';
import { play } from '../sound';
import {
  type BossState, type SeasonEnd, type IncomeKey, type CostKey, type Ledger, type SponsorSlot, type SellPolicy, type Task,
  COST_NAME, EURO_MONEY, EURO_NAME, INCOME_NAME, NLZ_NAME, SELL_NAME, SLOT_NAME, TRAIN_NAME, SEAT_MIN, SEAT_MAX,
  adsYear, attendance, basePrice, bossClubs, bossLeagues, brandOf, buildGain, canPlay, clubName, closeSeason, coachBoost, coachCandidates,
  debt, demand, fireCoach, forecast, hireCoach, homeGames, isGerman, leagueOf, loadBoss, loanMax, loanTerms, marketingYear, matchIncome, maxShare,
  money, monthName, newBoss, nlzYear, payoffAmount, payroll, plannedRevenue, playMonth, playUntil, position, priceFans, priceRange, repayLoans,
  saveBoss, seatCost, seatMonths, sellShares, setMarketing, setPrice, setSellPolicy, setTransferBudget, setWageBudget, severance, sharePrice,
  signSponsor, sponsorOffer, squadCostRatio, startBuild, sumIn, sumOut, takeLoan, tasks, trainYear, transferLeft, tvMoney, upgrade, upgradeCost,
  downgrade, vipCost, wageCap, wageOf, windowMonth, youthMinutesShare,
} from '../game/boss';

const sfx = (id: Parameters<typeof play>[0]) => { try { play(id); } catch { /* kein Ton */ } };
type Tab = 'home' | 'budget' | 'projects' | 'finance' | 'team';
const TABS: [Tab, string, string][] = [['home', 'Übersicht', 'home'], ['budget', 'Budget', 'chart'], ['projects', 'Projekte', 'stadium'], ['finance', 'Finanzen', 'money'], ['team', 'Team', 'shirt']];
const pct = (v: number) => `${Math.round(v * 100)} %`;
const num = (v: number) => Math.round(v).toLocaleString('de-DE');
const signed = (v: number) => `${v >= 0 ? '+' : ''}${money(v)}`;

/** Vereinsboss: den Verein als Geschäftsführer leiten – mit Reglern und langfristigen Entscheidungen. */
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
        <p>Du leitest das Geschäft: Budgets, Tickets, Sponsoren, Projekte und Finanzierung. Die Spiele macht die Mannschaft.</p>
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
              <span className="bo-crest-lg"><ClubCrest id={c.id} size={30} /></span>
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

// ---------- Regler ----------
/** Schieberegler: zeigt den Wert sofort, übernimmt ihn kurz nach dem Loslassen/Stoppen. */
function Slider({ label, value, min, max, step, show, onCommit, disabled }: {
  label: string; value: number; min: number; max: number; step: number; show: (v: number) => string; onCommit: (v: number) => void; disabled?: boolean;
}) {
  const [v, setV] = useState(value);
  const t = useRef<number | null>(null);
  useEffect(() => { setV(value); }, [value]);
  useEffect(() => () => { if (t.current) clearTimeout(t.current); }, []);
  const change = (n: number) => {
    setV(n);
    if (t.current) clearTimeout(t.current);
    t.current = window.setTimeout(() => { t.current = null; onCommit(n); }, 180);
  };
  const p = max > min ? ((v - min) / (max - min)) * 100 : 0;
  return (
    <label className={`bo-slider ${disabled ? 'off' : ''}`}>
      <span className="bo-slider-top"><span>{label}</span><b>{show(v)}</b></span>
      <input type="range" min={min} max={max} step={step} value={v} disabled={disabled}
        style={{ ['--p' as string]: `${p}%` }} onChange={(e) => change(Number(e.target.value))} aria-label={label} />
    </label>
  );
}
function Effects({ items }: { items: [string, string, ('pos' | 'neg' | '')?][] }) {
  return <ul className="bo-eff">{items.map(([k, v, c]) => <li key={k}><span>{k}</span><b className={c ?? ''}>{v}</b></li>)}</ul>;
}
function Seg<T extends string>({ value, options, onChange }: { value: T; options: [T, string, string?][]; onChange: (v: T) => void }) {
  return (
    <div className="bo-seg">
      {options.map(([id, name, sub]) => (
        <button key={id} className={value === id ? 'on' : ''} onClick={() => { onChange(id); sfx('tap'); }}><b>{name}</b>{sub && <small>{sub}</small>}</button>
      ))}
    </div>
  );
}

// ---------- Spiel ----------
function BossGame({ b, onChange, onExit }: { b: BossState; onChange: (b: BossState | null) => void; onExit: () => void }) {
  const [tab, setTab] = useState<Tab>('home');
  const [toast, setToast] = useState<string | null>(null);
  const [end, setEnd] = useState<SeasonEnd | null>(null);
  const [showReport, setShowReport] = useState(false);
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(null), 2600); return () => clearTimeout(t); }, [toast]);
  const lg = getLeague(leagueOf(b));
  const played = b.m.rows.find((r) => r.clubId === b.m.clubId)?.played ?? 0;
  const pos = played ? position(b) : 0;
  const go = (t: Tab) => { setTab(t); sfx('tap'); window.scrollTo?.({ top: 0 }); };
  const act = (n: BossState, msg?: string, sound: Parameters<typeof play>[0] = 'coin') => { if (n === b) return; onChange(n); sfx(sound); if (msg) setToast(msg); };

  const run = (mode: 'month' | 'winter' | 'end') => {
    sfx('whistle');
    onChange(mode === 'month' ? playMonth(b) : playUntil(b, mode));
    setShowReport(true);
  };
  const finish = () => { const r = closeSeason(b); sfx(r.end.fired ? 'tap' : 'levelUp'); setEnd(r.end); onChange(r.b); };

  if (b.fired && !end) {
    return (
      <main className="hub bo">
        <section className="bo-hero bad">
          <span className="bo-hero-ic"><Icon name="broken" size={30} /></span>
          <h1>Entlassen</h1>
          <p>Der Aufsichtsrat hat dir das Vertrauen entzogen. Deine Zeit bei {clubName(b)} ist vorbei.</p>
        </section>
        <Seasons b={b} />
        <button className="btn primary big bo-wide" onClick={() => onChange(null)}>Neuen Verein übernehmen</button>
        <button className="cs-link" onClick={onExit}>‹ Menü</button>
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
        <span className="bo-crest-lg"><ClubCrest id={b.m.clubId} size={44} /></span>
        <div className="bo-head-main">
          <b>{clubName(b)}</b>
          <small>{lg.name}{pos ? ` · Platz ${pos}` : ''} · Ziel: Platz {b.m.target}</small>
        </div>
        <div className={`bo-cash ${b.cash < 0 ? 'neg' : ''}`}><small>Kasse</small><b>{money(b.cash)}</b></div>
      </header>

      <nav className="bo-tabs" aria-label="Bereiche">
        {TABS.map(([id, name, icon]) => (
          <button key={id} className={tab === id ? 'on' : ''} onClick={() => go(id)}>
            <Icon name={icon} size={18} /><span>{name}</span>
          </button>
        ))}
      </nav>

      {tab === 'home' && <Home b={b} onRun={run} onFinish={finish} onReport={() => setShowReport(true)} onTab={go} />}
      {tab === 'budget' && <Budget b={b} onChange={(n) => onChange(n)} />}
      {tab === 'projects' && <Projects b={b} act={act} />}
      {tab === 'finance' && <Finance b={b} act={act} />}
      {tab === 'team' && <Team b={b} onReset={() => onChange(null)} />}

      {showReport && b.report && <Report b={b} onClose={() => setShowReport(false)} />}
      {end && <SeasonSheet end={end} b={b} onClose={() => setEnd(null)} />}
      {toast && <div className="coin-toast" role="status">{toast}</div>}
    </main>
  );
}

// ---------- Übersicht ----------
function Home({ b, onRun, onFinish, onReport, onTab }: { b: BossState; onRun: (m: 'month' | 'winter' | 'end') => void; onFinish: () => void; onReport: () => void; onTab: (t: Tab) => void }) {
  const todo = tasks(b);
  const f = forecast(b);
  const blocked = !canPlay(b);
  return (
    <section className="bo-sec">
      {todo.length > 0 && (
        <div className="bo-panel bo-todo">
          <h3>Offene Punkte</h3>
          <ul>
            {todo.map((t: Task) => (
              <li key={t.id}>
                <button className={t.must ? 'must' : ''} onClick={() => onTab(t.tab)}>
                  <Icon name={t.must ? 'warn' : 'info'} size={16} /><span>{t.text}</span><Icon name="arrow" size={14} />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {b.seasonOver ? (
        <div className="bo-panel bo-cta">
          <h2>Saison vorbei</h2>
          <p>Zeit für die Bilanz{isGerman(leagueOf(b)) ? ', die Mitgliederversammlung' : ''} und das Urteil des Aufsichtsrats.</p>
          <button className="btn primary big" onClick={onFinish}><Icon name="chart" size={18} /> Saisonbilanz ansehen</button>
        </div>
      ) : (
        <div className="bo-panel bo-cta">
          <h2>{monthName(b)}</h2>
          {windowMonth(b.month) && <p className="bo-hint">Transferfenster: Der Sportdirektor kauft und verkauft beim Spielen nach deinen Budgets.</p>}
          <button className="btn primary big" onClick={() => onRun('month')} disabled={blocked}><Icon name="ball" size={18} /> Monat spielen</button>
          <div className="bo-row2">
            {b.month < 5 && <button className="btn secondary" onClick={() => onRun('winter')} disabled={blocked}>Bis Winterpause</button>}
            <button className="btn secondary" onClick={() => onRun('end')} disabled={blocked}>Bis Saisonende</button>
          </div>
          {blocked && <small className="bo-hint warn">Erst einen Trainer verpflichten (Projekte).</small>}
        </div>
      )}

      <div className="bo-panel">
        <h3>Prognose für die ganze Saison</h3>
        <Effects items={[
          ['Einnahmen', money(sumIn(f.ledger)), 'pos'],
          ['Ausgaben', money(sumOut(f.ledger)), 'neg'],
          ['Ergebnis (ohne Transfers)', signed(f.profit), f.profit >= 0 ? 'pos' : 'neg'],
          ['Kasse am Saisonende ca.', money(f.cashEnd), f.cashEnd >= 0 ? '' : 'neg'],
        ]} />
        <small className="bo-hint">Mit deinen aktuellen Reglern. Ergebnisse, Fans und Transfers verändern die echten Zahlen.</small>
      </div>

      {b.report && !b.seasonOver && (
        <button className="bo-last" onClick={onReport}>
          <span><small>Zuletzt · {b.report.label}</small><b>{b.report.results.slice(-6).map((r) => `${r.gf}:${r.ga}`).join('  ') || 'keine Spiele'}</b></span>
          <em className={b.report.cashAfter >= b.report.cashBefore ? 'pos' : 'neg'}>{signed(b.report.cashAfter - b.report.cashBefore)}</em>
        </button>
      )}

      <div className="bo-kpis">
        <Kpi label="Fans" v={`${b.fans}`} bar={b.fans / 100} />
        <Kpi label="Aufsichtsrat" v={`${b.trust}`} bar={b.trust / 100} />
        <Kpi label="Kaderkosten" v={pct(squadCostRatio(b))} bar={Math.min(1, squadCostRatio(b))} warn={squadCostRatio(b) > 0.7} />
        <Kpi label="Marke" v={`${Math.round(b.brandX * 100)}`} bar={Math.min(1, (b.brandX - 0.7) / 1.3)} />
      </div>

      <MiniTable b={b} />
      {b.log.length > 0 && (
        <div className="bo-panel">
          <h3>Chronik</h3>
          <ul className="bo-log">{b.log.slice(0, 6).map((l, i) => <li key={i}>{l}</li>)}</ul>
        </div>
      )}
    </section>
  );
}
function Kpi({ label, v, bar, warn }: { label: string; v: string; bar: number; warn?: boolean }) {
  return (
    <div className={`bo-kpi ${warn ? 'warn' : bar < 0.3 ? 'low' : bar >= 0.7 ? 'high' : ''}`}>
      <small>{label}</small><b>{v}</b>
      <i><em style={{ transform: `scaleX(${Math.max(0.02, Math.min(1, bar))})` }} /></i>
    </div>
  );
}
function MiniTable({ b }: { b: BossState }) {
  const rows = sortTable(b.m.rows);
  const me = rows.findIndex((r) => r.clubId === b.m.clubId);
  if (me < 0 || !rows.some((r) => r.played)) return null;
  const from = Math.max(0, Math.min(rows.length - 5, me - 2));
  return (
    <div className="bo-panel">
      <h3>{getLeague(leagueOf(b)).name}</h3>
      <ol className="bo-table">
        {rows.slice(from, from + 5).map((r, i) => (
          <li key={r.clubId} className={r.clubId === b.m.clubId ? 'me' : ''}>
            <em>{from + i + 1}</em><i className="bo-crest"><ClubCrest id={r.clubId} size={18} /></i><span>{getClub(r.clubId).name}</span><small>{r.played}</small><b>{r.points}</b>
          </li>
        ))}
      </ol>
    </div>
  );
}

// ---------- Budget (Regler) ----------
function Budget({ b, onChange }: { b: BossState; onChange: (b: BossState) => void }) {
  const [lo, hi] = priceRange(b);
  const rev = plannedRevenue(b);
  const pay = payroll(b);
  const cap = wageCap(b);
  const f = forecast(b);
  const dem = demand(b);
  const att = attendance(b);
  const tMax = Math.max(b.transferSpent, Math.max(0, b.cash));
  const step = (v: number) => (v >= 1e8 ? 1e6 : v >= 1e7 ? 1e5 : v >= 1e6 ? 25e3 : 1e3);
  const pf = priceFans(b);
  return (
    <section className="bo-sec">
      <div className={`bo-sticky ${f.profit >= 0 ? 'pos' : 'neg'}`}>
        <span>Saisonprognose</span><b>{signed(f.profit)}</b>
      </div>

      <div className="bo-panel">
        <h3><Icon name="ticket" size={16} /> Ticketpreis</h3>
        <Slider label="Ø-Preis pro Ticket" value={b.price} min={lo} max={hi} step={1} show={(v) => `${v} €`} onCommit={(v) => onChange(setPrice(b, v))} />
        <Effects items={[
          ['Zuschauer', `${num(att)} von ${num(b.cap)}`],
          ['Nachfrage', `${num(dem)}${dem > b.cap ? ' – ausverkauft' : ''}`, dem > b.cap ? 'pos' : ''],
          ['Pro Heimspiel', money(matchIncome(b))],
          [`Pro Saison (${homeGames(b)} Heimspiele)`, money(matchIncome(b) * homeGames(b))],
          ['Fan-Stimmung pro Monat', `${pf >= 0 ? '+' : ''}${pf.toLocaleString('de-DE', { maximumFractionDigits: 1 })}`, pf > 0.2 ? 'pos' : pf < -0.2 ? 'neg' : ''],
        ]} />
        <small className="bo-hint">Ligaschnitt {basePrice(b)} €. Bis dahin bleiben die Leute fast alle, darüber sinkt die Nachfrage deutlich. Ist das Stadion ausverkauft, kannst du den Preis anheben, ohne Plätze zu verlieren.</small>
      </div>

      <div className="bo-panel">
        <h3><Icon name="shirt" size={16} /> Gehaltsbudget</h3>
        <Slider label="Anteil an den Erlösen" value={b.wageBudget} min={0.35} max={0.85} step={0.01} show={(v) => `${pct(v)} · ${money(rev * v)}`} onCommit={(v) => onChange(setWageBudget(b, v))} />
        <Effects items={[
          ['Gehälter jetzt', money(pay), pay > cap ? 'neg' : ''],
          [pay > cap ? 'Über Budget' : 'Spielraum', money(Math.abs(cap - pay)), pay > cap ? 'neg' : 'pos'],
        ]} />
        <small className="bo-hint">{pay > cap ? 'Im nächsten Transferfenster verkauft der Sportdirektor teure Spieler, bis es passt.' : 'Neue Spieler werden nur geholt, wenn ihr Gehalt noch ins Budget passt.'} Viele echte Vereine liegen bei rund 50–60 %.</small>
      </div>

      <div className="bo-panel">
        <h3><Icon name="swap" size={16} /> Transfers</h3>
        <Slider label="Transferbudget diese Saison" value={Math.min(b.transferBudget, tMax)} min={0} max={tMax} step={step(tMax)} show={(v) => money(v)} onCommit={(v) => onChange(setTransferBudget(b, v))} disabled={tMax <= 0} />
        <Effects items={[['Schon ausgegeben', money(b.transferSpent)], ['Noch frei', money(transferLeft(b))]]} />
        <p className="bo-label">Verkaufspolitik</p>
        <Seg<SellPolicy> value={b.sellPolicy} options={(['keep', 'normal', 'sell'] as SellPolicy[]).map((k) => [k, SELL_NAME[k].name])} onChange={(v) => onChange(setSellPolicy(b, v))} />
        <small className="bo-hint">{SELL_NAME[b.sellPolicy].text} Der Sportdirektor handelt im August und Januar. Ablösen werden für die Kaderkosten über 4 Jahre verteilt.</small>
      </div>

      <div className="bo-panel">
        <h3><Icon name="heart" size={16} /> Marketing & Fanarbeit</h3>
        <Slider label="Anteil an den Erlösen" value={b.marketing} min={0} max={0.05} step={0.005} show={(v) => `${(v * 100).toLocaleString('de-DE', { maximumFractionDigits: 1 })} % · ${money(rev * v)}`} onCommit={(v) => onChange(setMarketing(b, v))} />
        <Effects items={[
          ['Kosten pro Saison', money(marketingYear(b)), 'neg'],
          ['Fan-Stimmung pro Monat', `+${(b.marketing * 40).toLocaleString('de-DE', { maximumFractionDigits: 1 })}`, b.marketing > 0 ? 'pos' : ''],
          ['Marke pro Saison', `${b.marketing * 3 - 0.02 >= 0 ? '+' : ''}${((b.marketing * 3 - 0.02) * 100).toLocaleString('de-DE', { maximumFractionDigits: 1 })} %`, b.marketing * 3 - 0.02 >= 0 ? 'pos' : 'neg'],
        ]} />
        <small className="bo-hint">Langfristig: Eine stärkere Marke bringt mehr Sponsorengeld, Fanartikel und Zuschauer – auch in den nächsten Saisons. Ohne Marketing schrumpft sie langsam.</small>
      </div>
    </section>
  );
}

// ---------- Projekte ----------
function Projects({ b, act }: { b: BossState; act: (n: BossState, msg?: string, s?: Parameters<typeof play>[0]) => void }) {
  const [seats, setSeats] = useState(5000);
  const [years, setYears] = useState(2);
  const cands = coachCandidates(b);
  const gainSeats = buildGain(b, 'seats', seats);
  const gainVip = buildGain(b, 'vip');
  const payback = (cost: number, gain: number) => (gain > 0 ? `${(cost / gain).toLocaleString('de-DE', { maximumFractionDigits: 1 })} Saisons` : 'lohnt sich gerade nicht');
  const level = (kind: 'nlz' | 'train') => {
    const lvl = kind === 'nlz' ? b.nlz : b.train;
    const names = kind === 'nlz' ? NLZ_NAME : TRAIN_NAME;
    const yearCost = kind === 'nlz' ? nlzYear(b) : trainYear(b);
    const next = kind === 'nlz' ? nlzYear({ m: b.m, nlz: Math.min(5, lvl + 1) }) : trainYear({ m: b.m, train: Math.min(5, lvl + 1) });
    const cost = upgradeCost(b, kind);
    return (
      <>
        <p className="muted">Stufe {lvl}: {names[lvl]} · {money(yearCost)} pro Jahr</p>
        <div className="bo-steps">{[1, 2, 3, 4, 5].map((i) => <i key={i} className={i <= lvl ? 'on' : ''} />)}</div>
        <div className="bo-row2">
          <button className="btn secondary" disabled={lvl <= 0} onClick={() => { if (window.confirm('Eine Stufe zurückbauen? Spart laufende Kosten, das Geld für den Ausbau ist weg.')) act(downgrade(b, kind), 'Zurückgebaut.', 'tap'); }}>Zurückbauen</button>
          <button className="btn primary" disabled={lvl >= 5 || cost > b.cash} onClick={() => act(upgrade(b, kind), 'Ausgebaut.')}>{lvl >= 5 ? 'Maximum' : `Ausbauen · ${money(cost)}`}</button>
        </div>
        {lvl < 5 && <small className="bo-hint">Danach {money(next)} pro Jahr ({signed(next - yearCost).replace('+', '+ ')} laufend).</small>}
      </>
    );
  };
  return (
    <section className="bo-sec">
      <div className="bo-panel">
        <h3><Icon name="whistle" size={16} /> Trainer</h3>
        {b.coach ? (
          <>
            <Effects items={[
              [b.coach.name, `${'★'.repeat(b.coach.stars)}${'☆'.repeat(5 - b.coach.stars)}`],
              ['Stil', `${b.coach.tactic} · ${b.coach.formation}`],
              ['Wirkung aufs Team', `${coachBoost(b.coach) >= 0 ? '+' : ''}${coachBoost(b.coach).toLocaleString('de-DE')}`],
              ['Gehalt', `${money(b.coach.wage)}/Jahr`],
              ['Vertrag', `noch ${b.coach.years} ${b.coach.years === 1 ? 'Jahr' : 'Jahre'}`],
            ]} />
            <button className="btn secondary bo-wide" disabled={!!b.seasonOver} onClick={() => { if (window.confirm(`${b.coach!.name} entlassen? Abfindung: ${money(severance(b.coach!))}.`)) act(fireCoach(b), 'Trainer entlassen.', 'tap'); }}>Entlassen · Abfindung {money(severance(b.coach))}</button>
          </>
        ) : (
          <>
            <Slider label="Vertragslaufzeit" value={years} min={1} max={4} step={1} show={(v) => `${v} ${v === 1 ? 'Jahr' : 'Jahre'}`} onCommit={setYears} />
            <ul className="bo-coaches">
              {cands.map((c) => (
                <li key={c.name}>
                  <button onClick={() => act(hireCoach(b, c, years), `${c.name} unterschreibt.`)}>
                    <span><b>{c.name}</b><small>{c.tactic === 'offensiv' ? 'Offensiv' : c.tactic === 'defensiv' ? 'Defensiv' : 'Ausgewogen'} · {c.formation} · Wirkung {coachBoost(c) >= 0 ? '+' : ''}{coachBoost(c).toLocaleString('de-DE')}</small></span>
                    <span className="bo-coach-r"><em>{'★'.repeat(c.stars)}</em><small>{money(c.wage)}/Jahr</small></span>
                  </button>
                </li>
              ))}
            </ul>
            <small className="bo-hint">Entlässt du einen Trainer, kostet das eine Abfindung. Läuft der Vertrag aus, verlängert er automatisch um ein Jahr.</small>
          </>
        )}
      </div>

      <div className="bo-panel">
        <h3><Icon name="rise" size={16} /> Nachwuchs (NLZ)</h3>
        {level('nlz')}
        <small className="bo-hint">Jede Saison {b.nlz === 0 ? 'kommen keine Talente' : b.nlz >= 5 ? 'kommen 3 Talente' : b.nlz >= 3 ? 'kommen 2 Talente' : 'kommt 1 Talent'}. Junge Spieler mit vielen Minuten bringen TV-Geld (Säule Nachwuchs, jetzt {pct(youthMinutesShare(b))} der Minuten). Nur wenige Talente werden wirklich Profis.{isGerman(leagueOf(b)) && getLeague(leagueOf(b)).tier <= 2 ? ' In der 1. und 2. Liga ist ein NLZ Pflicht für die Lizenz.' : ''}</small>
      </div>

      <div className="bo-panel">
        <h3><Icon name="bolt" size={16} /> Trainingszentrum</h3>
        {level('train')}
        <small className="bo-hint">Macht das Team in jedem Spiel etwas stärker (+0,25 pro Stufe) und hilft jungen Spielern bei der Entwicklung – älteren Spielern beim Halten ihrer Form.</small>
      </div>

      <div className="bo-panel">
        <h3><Icon name="stadium" size={16} /> Stadion</h3>
        <Effects items={[['Plätze', num(b.cap)], ['Nachfrage', `${num(demand(b))}${demand(b) > b.cap ? ' – ausverkauft' : ''}`, demand(b) > b.cap ? 'pos' : ''], ['VIP-Logen', `Stufe ${b.vip} / 3`]]} />
        {b.build ? <p className="bo-build"><Icon name="clock" size={14} /> Baustelle: {b.build.kind === 'seats' ? `+${num(b.build.seats ?? 5000)} Plätze` : 'VIP-Logen'} · noch {b.build.monthsLeft} {b.build.monthsLeft === 1 ? 'Monat' : 'Monate'}</p> : (
          <>
            <Slider label="Ausbau" value={seats} min={SEAT_MIN} max={SEAT_MAX} step={1000} show={(v) => `+${num(v)} Plätze`} onCommit={setSeats} />
            <Effects items={[
              ['Kosten', money(seatCost(b, seats)), 'neg'],
              ['Bauzeit', `${seatMonths(seats)} Monate`],
              ['Mehr Gewinn pro Saison', signed(gainSeats), gainSeats > 0 ? 'pos' : 'neg'],
              ['Rechnet sich nach', payback(seatCost(b, seats), gainSeats)],
            ]} />
            <button className="btn primary bo-wide" disabled={seatCost(b, seats) > b.cash} onClick={() => act(startBuild(b, 'seats', seats), 'Bauarbeiten gestartet.')}>Ausbau starten</button>
            <div className="bo-divider" />
            <Effects items={[
              ['VIP-Logen ausbauen', b.vip >= 3 ? 'Maximum' : money(vipCost(b)), 'neg'],
              ['Mehr Gewinn pro Saison', b.vip >= 3 ? '–' : signed(gainVip), gainVip > 0 ? 'pos' : ''],
              ['Rechnet sich nach', b.vip >= 3 ? '–' : payback(vipCost(b), gainVip)],
            ]} />
            <button className="btn secondary bo-wide" disabled={b.vip >= 3 || vipCost(b) > b.cash} onClick={() => act(startBuild(b, 'vip'), 'Logen werden gebaut.')}>VIP-Logen bauen · 3 Monate</button>
          </>
        )}
        <small className="bo-hint">Mehr Plätze lohnen sich nur, wenn mehr Leute kommen wollen als reinpassen. Es kann nur ein Projekt gleichzeitig laufen.</small>
      </div>
    </section>
  );
}

// ---------- Finanzen ----------
function Finance({ b, act }: { b: BossState; act: (n: BossState, msg?: string, s?: Parameters<typeof play>[0]) => void }) {
  const tv = tvMoney(b);
  const [loanAmt, setLoanAmt] = useState(0);
  const [loanYears, setLoanYears] = useState(3);
  const [share, setShare] = useState(10);
  const lMax = loanMax(b);
  const amt = Math.min(loanAmt, lMax);
  const terms = loanTerms(b, amt, loanYears);
  const have = b.investor?.share ?? 0;
  const sMax = maxShare(b) - have;
  const sh = Math.min(share, sMax);
  const lstep = lMax >= 1e8 ? 1e6 : lMax >= 1e7 ? 1e5 : lMax >= 1e6 ? 25e3 : 1e3;
  return (
    <section className="bo-sec">
      <div className="bo-panel">
        <h3>Diese Saison bisher</h3>
        {sumIn(b.ledger) + sumOut(b.ledger) > 0 ? <LedgerBars l={b.ledger} /> : <p className="muted">Noch keine Buchungen – spiel den ersten Monat.</p>}
      </div>

      <div className="bo-panel">
        <h3><Icon name="handshake" size={16} /> Sponsoren · {money(b.sponsors.reduce((a, s) => a + s.perYear, 0) + adsYear(b))}/Jahr</h3>
        <Effects items={[
          ...b.sponsors.map((s): [string, string] => [`${SLOT_NAME[s.slot]}: ${s.name} · noch ${s.years} J.`, money(s.perYear)]),
          ['Banden, Partner, Logenkunden', money(adsYear(b))],
        ]} />
        {(['trikot', 'aermel', 'stadion'] as SponsorSlot[]).filter((s) => !b.sponsors.some((x) => x.slot === s)).map((slot) => <SponsorDeal key={slot} b={b} slot={slot} act={act} />)}
        <small className="bo-hint">Lange Verträge geben Sicherheit, zahlen aber etwas weniger pro Jahr. Kurze Verträge kannst du neu verhandeln, wenn deine Marke gewachsen ist. Markenwert jetzt: {money(brandOf(b))}.</small>
      </div>

      <div className="bo-panel">
        <h3><Icon name="money" size={16} /> Kredite · Schulden {money(debt(b))}</h3>
        {b.loans.length > 0 && (
          <>
            <Effects items={b.loans.map((l, i): [string, string] => [`Kredit ${i + 1}: ${(l.rate * 100).toLocaleString('de-DE')} %, ${money(l.monthly)}/Monat`, `noch ${money(l.left)}`])} />
            <button className="btn secondary bo-wide" disabled={payoffAmount(b) > b.cash} onClick={() => { if (window.confirm(`Alle Kredite für ${money(payoffAmount(b))} zurückzahlen? Künftige Zinsen fallen weg.`)) act(repayLoans(b), 'Kredite zurückgezahlt.'); }}>Vorzeitig zurückzahlen · {money(payoffAmount(b))}</button>
            <div className="bo-divider" />
          </>
        )}
        {lMax > 0 ? (
          <>
            <Slider label="Neuer Kredit" value={amt} min={0} max={lMax} step={lstep} show={(v) => money(v)} onCommit={setLoanAmt} />
            <Slider label="Laufzeit" value={loanYears} min={2} max={6} step={1} show={(v) => `${v} Jahre`} onCommit={setLoanYears} />
            <Effects items={[
              ['Zins pro Jahr', `${(terms.rate * 100).toLocaleString('de-DE', { maximumFractionDigits: 1 })} %`],
              ['Rate pro Monat', money(terms.monthly), 'neg'],
              ['Zinsen insgesamt', money(terms.total - amt), 'neg'],
            ]} />
            <button className="btn primary bo-wide" disabled={amt <= 0} onClick={() => { act(takeLoan(b, amt, loanYears), `Kredit über ${money(amt)} aufgenommen.`); setLoanAmt(0); }}>Kredit aufnehmen</button>
          </>
        ) : <p className="muted">Die Bank gibt dir gerade keinen weiteren Kredit.</p>}
        <small className="bo-hint">Längere Laufzeit = kleinere Rate, aber mehr Zinsen. Hohe Schulden machen jeden neuen Kredit teurer. Ist die Kasse im Minus, kosten Überziehungszinsen 12 %.</small>
      </div>

      <div className="bo-panel">
        <h3><Icon name="pillars" size={16} /> Eigentümer</h3>
        <Effects items={[['Verein', `${100 - have} %`], ['Investor', `${have} %`]]} />
        {sMax > 0 && !b.soldShares ? (
          <>
            <Slider label="Anteile verkaufen" value={sh} min={5} max={sMax} step={5} show={(v) => `${v} %`} onCommit={setShare} />
            <Effects items={[
              ['Einmalig', `+${money(sharePrice(b, sh))}`, 'pos'],
              ['Danach jedes Jahr', `${have + sh} % vom Gewinn an den Investor`, 'neg'],
              ['Fans', `−${Math.round(sh * (isGerman(leagueOf(b)) ? 0.3 : 0.15))}`, 'neg'],
            ]} />
            <button className="btn secondary bo-wide" onClick={() => { if (window.confirm(`${sh} % für ${money(sharePrice(b, sh))} verkaufen? Das lässt sich nicht rückgängig machen.`)) act(sellShares(b, sh), 'Anteile verkauft.'); }}>Anteile verkaufen</button>
          </>
        ) : <p className="muted">{sMax <= 0 ? 'Mehr Anteile darfst du nicht verkaufen.' : 'Diese Saison wurden schon Anteile verkauft.'}</p>}
        {isGerman(leagueOf(b)) && <small className="bo-hint">50+1-Regel: In Deutschland behält der Verein immer die Mehrheit, höchstens 49 % gehen an Investoren.</small>}
      </div>

      <div className="bo-panel">
        <h3>TV-Geld pro Saison · {money(tv.total)}</h3>
        <Effects items={[
          ['Gleich für alle (50 %)', money(tv.equal)],
          [`Leistung, Platz ${b.lastPos} der Vorsaison (43 %)`, money(tv.perf)],
          [`Nachwuchs, ${pct(youthMinutesShare(b))} U23-Minuten (4 %)`, money(tv.youth)],
          [`Interesse, ${num(b.members)} Mitglieder (3 %)`, money(tv.interest)],
          ...(b.europe ? [[EURO_NAME[b.europe], money(EURO_MONEY[b.europe])] as [string, string]] : []),
        ]} />
        <small className="bo-hint">Aufteilung angelehnt an die DFL-Verteilung.</small>
      </div>
      <Seasons b={b} />
    </section>
  );
}
function SponsorDeal({ b, slot, act }: { b: BossState; slot: SponsorSlot; act: (n: BossState, msg?: string) => void }) {
  const [years, setYears] = useState(slot === 'stadion' ? 5 : 3);
  const [bet, setBet] = useState(false);
  const o = sponsorOffer(b, slot, years, bet);
  return (
    <div className="bo-deal">
      <p className="bo-label">{SLOT_NAME[slot]}-Sponsor gesucht</p>
      <Slider label="Laufzeit" value={years} min={1} max={5} step={1} show={(v) => `${v} ${v === 1 ? 'Jahr' : 'Jahre'}`} onCommit={setYears} />
      {slot !== 'stadion' && (
        <label className="bo-check"><input type="checkbox" checked={bet} onChange={(e) => setBet(e.target.checked)} /> Wettanbieter zulassen (+30 %, Fans −4)</label>
      )}
      <Effects items={[['Angebot', `${o.name}`], ['Pro Jahr', money(o.perYear), 'pos'], ['Gesamt', money(o.perYear * years), 'pos'], ...(slot === 'stadion' ? [['Fans', '−6 (neuer Stadionname)', 'neg'] as [string, string, 'neg']] : [])]} />
      <button className="btn primary bo-wide" onClick={() => act(signSponsor(b, slot, years, bet), `${o.name} unterschreibt.`)}>Unterschreiben</button>
    </div>
  );
}

// ---------- Team ----------
function Team({ b, onReset }: { b: BossState; onReset: () => void }) {
  const [view, setView] = useState<'squad' | 'table'>('squad');
  const xi = new Set(b.m.xi);
  const list = [...b.m.squad].sort((x, y) => Number(xi.has(y.id)) - Number(xi.has(x.id)) || y.ovr - x.ovr);
  const rows = sortTable(b.m.rows);
  return (
    <section className="bo-sec">
      <Seg<'squad' | 'table'> value={view} options={[['squad', 'Kader'], ['table', 'Tabelle']]} onChange={setView} />
      {view === 'squad' ? (
        <div className="bo-panel">
          <h3>{b.m.squad.length} Spieler · {money(payroll(b))}/Jahr</h3>
          <p className="muted">Aufstellen macht der Trainer, Transfers der Sportdirektor nach deinem Budget.</p>
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
      ) : (
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
      )}
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
            <em className={h.profit >= 0 ? 'pos' : 'neg'}>{signed(h.profit)}</em>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ---------- Balken ----------
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

// ---------- Bericht ----------
function Report({ b, onClose }: { b: BossState; onClose: () => void }) {
  const r = b.report!;
  const d = r.cashAfter - r.cashBefore;
  const w = r.results.filter((x) => x.gf > x.ga).length, dr = r.results.filter((x) => x.gf === x.ga).length, l = r.results.length - w - dr;
  return (
    <div className="overlay bo-sheet-wrap" role="dialog" aria-modal="true" aria-label="Bericht" onClick={onClose}>
      <section className="bo-sheet" onClick={(e) => e.stopPropagation()}>
        <small>Bericht</small>
        <h2>{r.label}</h2>
        {r.results.length > 0 && <p className="muted">{w} Siege · {dr} Unentschieden · {l} Niederlagen</p>}
        <ul className="bo-results">
          {r.results.slice(-8).map((x, i) => (
            <li key={i} className={x.gf > x.ga ? 'w' : x.gf === x.ga ? 'd' : 'l'}>
              <span>{x.home ? 'Heim' : 'Ausw.'}</span><b>{getClub(x.opp).name}</b><em>{x.gf}:{x.ga}</em>
            </li>
          ))}
          {!r.results.length && <li className="d"><b>Keine Spiele</b></li>}
        </ul>
        {r.results.length > 8 && <p className="bo-hint">Nur die letzten 8 Spiele.</p>}
        {(r.transfers?.length ?? 0) > 0 && (
          <div className="bo-tal"><h4>Transfers des Sportdirektors</h4><ul>{r.transfers!.map((t) => <li key={t}>{t}</li>)}</ul></div>
        )}
        {r.attendance !== undefined && <p className="muted">Zuschauer zuletzt: {num(r.attendance)}</p>}
        <LedgerBars l={r.ledger} />
        {r.notes.map((n, i) => <p key={i} className="bo-hint">{n}</p>)}
        <p className={`bo-delta ${d >= 0 ? 'pos' : 'neg'}`}>Kasse {signed(d)} → <b>{money(r.cashAfter)}</b></p>
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
        {end.dividend > 0 && <p className="bo-hint">Gewinnanteil an den Investor: {money(end.dividend)}</p>}
        {end.uefaFine > 0 && <p className="bo-hint warn">UEFA-Strafe wegen Kaderkosten-Quote {pct(end.ratio)}: {money(end.uefaFine)}</p>}
        {end.vote !== null && (
          <div className="bo-vote">
            <h4>Mitgliederversammlung</h4>
            <div className="bo-vote-bar"><i style={{ transform: `scaleX(${end.vote / 100})` }} /></div>
            <p>{end.vote} % stimmen für deine Entlastung{end.vote < 50 ? ' – durchgefallen!' : '.'}</p>
          </div>
        )}
        <p className={end.trustDelta >= 0 ? 'bo-ok' : 'bo-bad'}>Aufsichtsrat: {end.trustDelta >= 0 ? '+' : ''}{end.trustDelta} → {end.trust} / 100</p>
        {end.license && <p className="bo-hint warn">{end.license}</p>}
        {end.sponsorsEnded.length > 0 && <p className="bo-hint">Verträge ausgelaufen: {end.sponsorsEnded.join(', ')} – neu verhandeln unter Finanzen.</p>}
        {end.grew > 0 && <p className="bo-hint">Trainingszentrum: {end.grew} {end.grew === 1 ? 'Spieler hat' : 'Spieler haben'} sich zusätzlich verbessert.</p>}
        {end.talents.length > 0 && (
          <div className="bo-tal"><h4>Neu aus dem NLZ</h4><ul>{end.talents.map((t) => <li key={t}>{t}</li>)}</ul></div>
        )}
        {end.fired ? <p className="bo-bad big">Der Aufsichtsrat entlässt dich.</p> : <p className="muted">Neue Saison {b.m.season}/{String(b.m.season + 1).slice(2)} in der {getLeague(leagueOf(b)).name}. Prüfe deine Budgets.</p>}
        <button className="btn primary big" onClick={onClose}>{end.fired ? 'Weiter' : 'Neue Saison'}</button>
      </section>
    </div>
  );
}
