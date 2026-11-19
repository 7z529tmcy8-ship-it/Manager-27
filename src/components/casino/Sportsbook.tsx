import { useEffect, useMemo, useRef, useState } from 'react';
import { getClubState, setClubState, useClub } from '../../clubStore';
import { getClub, getLeague } from '../../data/leagues';
import {
  MARKET_LABEL, MAX_LEGS, betsOf, cashOutValue, careerOffers, comboBoost, finishRound, fixturesFor, legState, placeCareerBet, scoreAt, simulateRound,
  slipOdds, slipPayout, type CareerOffer, type Fixture, type Leg, type LiveMatch, type Market,
} from '../../game/bets';
import { listCareers } from '../../game/storage';
import { currentClubId, seasonLabel } from '../../game/player';
import { playStep } from '../../sound';
import Icon from '../Icon';
import { BetPicker, GameFrame, bet, buzz, fmt, fx, settle, sfx, shake, useBet } from './shared';

type Tab = 'round' | 'career' | 'slips';
const name = (id: string) => getClub(id).name;
const MIN_MS = 320;

/** Sportwetten: Spieltag mit Quoten, Wettschein (Einzel/Kombi mit Boost), Live-Konferenz mit Cash-out, Karriere-Wetten. */
export default function Sportsbook({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<Tab>('round');
  return (
    <GameFrame title="Sportwetten" onClose={onClose} className="cz-sb"
      odds={`Quoten aus der Teamstärke mit ca. 6,5 % Buchmacher-Marge. Kombi-Boost: ab 3 Tipps +8 % je Tipp, höchstens +50 %. Cash-out zahlt den fairen Restwert minus 10 %. Höchstgewinn 2 Mio. Chips.`}>
      <nav className="cz-tabs" role="tablist">
        {([['round', 'Spieltag', 'ball'], ['career', 'Karriere', 'star'], ['slips', 'Scheine', 'ticket']] as const).map(([id, label, icon]) => (
          <button key={id} role="tab" aria-selected={tab === id} className={tab === id ? 'on' : ''} onClick={() => setTab(id)}><Icon name={icon} size={16} />{label}</button>
        ))}
      </nav>
      {tab === 'round' && <Round />}
      {tab === 'career' && <CareerBets />}
      {tab === 'slips' && <Slips />}
    </GameFrame>
  );
}

function Round() {
  const club = useClub();
  const round = betsOf(club).round;
  const fixtures = useMemo(() => fixturesFor(round), [round]);
  const [legs, setLegs] = useState<Leg[]>([]);
  const [open, setOpen] = useState<string | null>(null);
  const [stake, setStake] = useBet('bets', 50);
  const [live, setLive] = useState<{ legs: Leg[]; stake: number; sim: LiveMatch[]; fixtures: Fixture[]; round: number } | null>(null);
  useEffect(() => { setLegs([]); }, [round]);

  const pick = (f: Fixture, m: Market) => {
    sfx('tap');
    setLegs((ls) => {
      const same = ls.find((l) => l.fixture === f.id);
      if (same?.market === m) return ls.filter((l) => l.fixture !== f.id);
      const rest = ls.filter((l) => l.fixture !== f.id);
      if (rest.length >= MAX_LEGS) return ls;
      return [...rest, { fixture: f.id, market: m, odds: f.odds[m] }];
    });
  };
  const place = () => {
    if (!legs.length || !bet(stake)) return;
    sfx('whistle'); buzz(30);
    setLive({ legs, stake, sim: simulateRound(fixtures), fixtures, round });
  };

  if (live) return <Conference fixtures={live.fixtures} legs={live.legs} stake={live.stake} sim={live.sim} round={live.round} onDone={() => setLive(null)} />;

  const odds = slipOdds(legs);
  const boost = comboBoost(legs.length);
  const leagues = [...new Set(fixtures.map((f) => f.league))];
  const sel = (f: Fixture, m: Market) => legs.some((l) => l.fixture === f.id && l.market === m);
  return (
    <>
      <div className="cz-sb-head">
        <span className="cz-live-dot" /> <b>Spieltag {round}</b>
        <span className="cz-boost-tag"><Icon name="bolt" size={14} /> Kombi-Boost bis +50 %</span>
      </div>
      <div className="cz-fixtures">
        {leagues.map((lid) => (
          <section key={lid}>
            <h3>{getLeague(lid).name}</h3>
            {fixtures.filter((f) => f.league === lid).map((f) => (
              <div key={f.id} className={`cz-fx ${legs.some((l) => l.fixture === f.id) ? 'picked' : ''}`}>
                <div className="cz-fx-teams"><b>{name(f.home)}</b><b>{name(f.away)}</b></div>
                <div className="cz-odds3">
                  {(['1', 'X', '2'] as Market[]).map((m) => (
                    <button key={m} className={sel(f, m) ? 'on' : ''} onClick={() => pick(f, m)}><small>{m}</small>{fx(f.odds[m])}</button>
                  ))}
                  <button className="cz-more" aria-label="Weitere Wetten" onClick={() => setOpen(open === f.id ? null : f.id)}>{open === f.id ? '−' : '+'}</button>
                </div>
                {open === f.id && (
                  <div className="cz-odds4">
                    {(['o25', 'u25', 'bttsY', 'bttsN'] as Market[]).map((m) => (
                      <button key={m} className={sel(f, m) ? 'on' : ''} onClick={() => pick(f, m)}><small>{MARKET_LABEL[m]}</small>{fx(f.odds[m])}</button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </section>
        ))}
      </div>
      <div className={`cz-slip ${legs.length ? 'on' : ''}`}>
        {legs.length ? (
          <>
            <div className="cz-slip-head">
              <b>{legs.length === 1 ? 'Einzelwette' : `Kombi · ${legs.length} Tipps`}</b>
              <span className="cz-slip-odds">Quote <b>{fx(odds)}</b>{boost > 0 && <em>+{Math.round(boost * 100)} % Boost</em>}</span>
              <button className="cz-slip-x" onClick={() => setLegs([])} aria-label="Wettschein leeren"><Icon name="close" size={16} /></button>
            </div>
            <div className="cz-slip-legs">
              {legs.map((l) => { const f = fixtures.find((x) => x.id === l.fixture)!; return <span key={l.fixture}>{name(f.home).split(' ')[0]}–{name(f.away).split(' ')[0]} · <b>{l.market.length === 1 ? (l.market === 'X' ? 'Remis' : name(l.market === '1' ? f.home : f.away)) : MARKET_LABEL[l.market]}</b> {fx(l.odds)}</span>; })}
            </div>
            {legs.length >= 2 && legs.length < 3 && <small className="cz-slip-hint">Noch 1 Tipp für den Kombi-Boost!</small>}
            <BetPicker value={stake} onChange={setStake} />
            <button className="cz-cta" onClick={place}>Wette platzieren · Gewinn {fmt(slipPayout(legs, stake))}</button>
          </>
        ) : <small>Tippe auf eine Quote, um sie auf den Wettschein zu legen.</small>}
      </div>
    </>
  );
}

/** Live-Konferenz: alle Spiele laufen gleichzeitig, deine Tipps leuchten, Cash-out jederzeit. */
function Conference({ fixtures, legs, stake, sim, round, onDone }: { fixtures: Fixture[]; legs: Leg[]; stake: number; sim: LiveMatch[]; round: number; onDone: () => void }) {
  const [minute, setMinute] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [cashed, setCashed] = useState<number | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const settled = useRef(false);
  const done = minute >= 93;
  const mine = new Set(legs.map((l) => l.fixture));
  const states = legs.map((l) => legState(l, sim.find((m) => m.fixture === l.fixture)!, minute));
  const lostAny = states.includes('lost');
  const won = done && states.every((s) => s === 'won');
  const value = !done && !cashed && !lostAny ? cashOutValue(legs, stake, fixtures, sim, minute) : 0;
  const payout = slipPayout(legs, stake);

  // Uhr läuft; Tore bei deinen Spielen gibt es mit Jubel
  useEffect(() => {
    if (done) return;
    const t = setTimeout(() => {
      const next = minute + 1;
      for (const m of sim) for (const g of m.goals) if (g.minute === next) {
        if (mine.has(m.fixture)) { sfx('goal'); buzz(40); setFlash(m.fixture); setTimeout(() => setFlash(null), 1200); } else sfx('tick');
      }
      if (next === 45 || next === 93) sfx('whistle');
      setMinute(next);
    }, MIN_MS / speed);
    return () => clearTimeout(t);
  }, [minute, speed, done]); // eslint-disable-line react-hooks/exhaustive-deps

  const finish = (cash: number | null) => {
    if (settled.current) return;
    settled.current = true;
    const end = legs.map((l) => legState(l, sim.find((m) => m.fixture === l.fixture)!, 93));
    const win = cash ?? (end.every((s) => s === 'won') ? payout : 0);
    settle({ game: 'bets', bet: stake, win, legs: legs.length, mult: win / stake });
    setClubState(finishRound(getClubState(), { round, legs, stake, odds: slipOdds(legs), win, cashed: cash ?? undefined }));
  };
  // Abpfiff abrechnen
  useEffect(() => { if (done && !cashed) { if (won) shake(true); finish(null); } }, [done]); // eslint-disable-line react-hooks/exhaustive-deps
  // Wer vorher rausgeht, bekommt das Endergebnis (kein Trick möglich)
  useEffect(() => () => { if (!settled.current) finish(null); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const cashOut = () => {
    if (!value) return;
    setCashed(value);
    finish(value);
  };
  const tension = legs.length > 0 && !lostAny && !done && states.filter((s) => s !== 'won').length === 1 && minute > 75;
  useEffect(() => { if (tension && minute % 3 === 0) playStep(minute - 70); }, [tension, minute]);

  return (
    <div className={`cz-conf ${tension ? 'tense' : ''}`}>
      <div className="cz-clock">
        <span className="cz-live-dot" />
        <b>{done ? 'Abpfiff' : `${Math.min(90, minute)}'${minute > 90 ? `+${minute - 90}` : ''}`}</b>
        <span className="cz-clock-bar"><i style={{ width: `${(minute / 93) * 100}%` }} /></span>
        {!done && <button className="cz-sub small" onClick={() => setSpeed(speed === 1 ? 3 : 1)}>{speed === 1 ? '×3' : '×1'}</button>}
      </div>
      <ul className="cz-live">
        {fixtures.filter((f) => mine.has(f.id)).concat(fixtures.filter((f) => !mine.has(f.id))).map((f) => {
          const m = sim.find((x) => x.fixture === f.id)!;
          const [h, a] = scoreAt(m, minute);
          const leg = legs.find((l) => l.fixture === f.id);
          const st = leg ? legState(leg, m, minute) : null;
          return (
            <li key={f.id} className={`${leg ? 'mine' : ''} ${st ?? ''} ${flash === f.id ? 'goal' : ''}`}>
              <span className="t">{name(f.home)}</span>
              <b className="s">{h}:{a}</b>
              <span className="t r">{name(f.away)}</span>
              {leg && <em className="p">{leg.market.length === 1 ? (leg.market === 'X' ? 'Remis' : leg.market === '1' ? 'Heim' : 'Gast') : MARKET_LABEL[leg.market]} {st === 'won' ? <Icon name="check" size={12} /> : st === 'lost' ? <Icon name="close" size={12} /> : null}</em>}
              {flash === f.id && <i className="cz-tor">TOR!</i>}
            </li>
          );
        })}
      </ul>
      <div className="cz-conf-foot">
        {done || cashed ? (
          <>
            <div className={`cz-result on`}>
              {cashed ? <><b>+{fmt(cashed)}</b><small>Cash-out genommen</small></> : won ? <><b>+{fmt(payout)}</b><small>Schein gewonnen!</small></> : <><b className="pink">So knapp!</b><small>{states.filter((s) => s === 'won').length} von {legs.length} Tipps richtig – der nächste Spieltag wartet</small></>}
            </div>
            {done ? <button className="cz-cta" onClick={onDone}>Nächster Spieltag</button> : <button className="cz-sub" onClick={() => setSpeed(6)}>Spiele zu Ende schauen</button>}
          </>
        ) : (
          <>
            <small>Möglicher Gewinn {fmt(payout)} · Quote {fx(slipOdds(legs))}</small>
            <button className="cz-cta cash" disabled={!value} onClick={cashOut}>{lostAny ? 'Weiter mitfiebern …' : `Cash-out · ${fmt(value)}`}</button>
          </>
        )}
      </div>
    </div>
  );
}

/** Wetten auf die eigene Karriere (zum Saisonstart, Auswertung nach der Saison). */
function CareerBets() {
  const club = useClub();
  const careers = listCareers().filter((c) => c.phase !== 'retired');
  const c = careers[0];
  const [stake, setStake] = useBet('career-bets', 100);
  const open = betsOf(club).career;
  if (!c) return <p className="cz-empty">Starte eine Karriere – dann kannst du auf deinen Spieler wetten.</p>;
  const offers = careerOffers(c);
  const taken = (o: CareerOffer) => open.some((b) => b.careerId === c.id && b.year === c.year && b.market === o.market && b.line === o.line);
  const take = (o: CareerOffer) => {
    if (taken(o) || !bet(stake)) return;
    const next = placeCareerBet(getClubState(), c, o, stake);
    if (next) { setClubState(next); sfx('cash'); }
  };
  return (
    <div className="cz-career">
      <div className="cz-career-head"><Icon name="star" size={20} /><span><b>{c.player.name}</b><small>{getClub(currentClubId(c.player)).name} · Saison {seasonLabel(c.year)}</small></span></div>
      {offers.length ? (
        <>
          <p className="cz-hint">Wetten auf die Saison, die gleich startet. Erst Einsatz wählen, dann auf die Quote tippen – ausgezahlt wird, sobald die Saison vorbei ist.</p>
          <BetPicker value={stake} onChange={setStake} />
          <ul className="cz-offers">
            {offers.map((o) => (
              <li key={`${o.market}-${o.line}`}>
                <span>{o.label}</span>
                <button disabled={taken(o)} onClick={() => take(o)}>{taken(o) ? 'Gesetzt' : fx(o.odds)}</button>
              </li>
            ))}
          </ul>
        </>
      ) : <p className="cz-hint">Karriere-Wetten öffnen zum Start der nächsten Saison (vor dem ersten Spiel).</p>}
      {open.length > 0 && (
        <>
          <h3 className="cz-h">Laufende Karriere-Wetten</h3>
          <ul className="cz-offers">
            {open.map((b) => <li key={b.id}><span>{b.name}: {b.label}<small> · {seasonLabel(b.year)}</small></span><em>{fmt(b.stake)} → {fmt(b.stake * b.odds)}</em></li>)}
          </ul>
        </>
      )}
    </div>
  );
}

function Slips() {
  const h = betsOf(useClub()).history;
  if (!h.length) return <p className="cz-empty">Noch keine Wettscheine – leg los im Spieltag.</p>;
  return (
    <ul className="cz-slips">
      {h.map((s, i) => (
        <li key={i} className={s.win > 0 ? 'won' : 'lost'}>
          <span><b>Spieltag {s.round}</b><small>{s.legs.length === 1 ? 'Einzelwette' : `Kombi · ${s.legs.length} Tipps`} · Quote {fx(s.odds)}</small></span>
          <em>{s.win > 0 ? `+${fmt(s.win)}${s.cashed ? ' (Cash-out)' : ''}` : 'Nächstes Mal'}</em>
        </li>
      ))}
    </ul>
  );
}
