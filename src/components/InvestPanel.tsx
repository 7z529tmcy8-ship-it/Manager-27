import { useMemo, useState } from 'react';
import { CLUBS, LEAGUES, getClub, getLeague } from '../data/leagues';
import { getClubState, setClubState, useClub } from '../clubStore';
import {
  MAX_STAKE,
  PROPERTIES,
  SELL_FEE,
  buyProperty,
  buyShares,
  expectedIncome,
  fundPreview,
  INJECT_AMOUNTS,
  MAX_GAIN_PER_YEAR,
  injectMoney,
  portfolioValue,
  sellProperty,
  sellShares,
  sharePrice,
  stakeLabel,
} from '../game/invest';
import { clubLeagueId, clubStrength } from '../game/player';
import type { Career } from '../game/types';
import CasinoTab from './CasinoTab';
import { GiftShelf } from './Gifts';

const fmt = (n: number) => Math.round(n).toLocaleString('de-DE');

/** Vermögen: Immobilien und Anteile an Fußballklubs, bezahlt mit Coins. */
export default function InvestPanel({ career, onChange, onClose }: { career: Career; onChange: (c: Career) => void; onClose: () => void }) {
  const club = useClub();
  const h = career.household;
  const [tab, setTab] = useState<'home' | 'clubs' | 'casino'>('home');
  const [leagueId, setLeagueId] = useState('bl1');
  const [clubId, setClubId] = useState('');
  const report = h?.report;
  const investNotes = report?.investNotes ?? report?.notes.filter((n) => /^[📉📈🏆]/u.test(n)) ?? [];

  const apply = (res: { career: Career; delta: number }) => {
    if (!res.delta) return;
    const c = getClubState();
    setClubState({ ...c, coins: c.coins + res.delta });
    onChange(res.career);
  };

  const clubs = useMemo(
    () => CLUBS.filter((c) => clubLeagueId(career, c.id) === leagueId && !c.name.endsWith(' II')).sort((a, b) => a.name.localeCompare(b.name, 'de')),
    [career, leagueId],
  );
  const target = clubId || clubs[0]?.id;
  const targetPrice = target ? sharePrice(career, target) : 0;
  const owned = target ? h?.shares.find((s) => s.clubId === target)?.percent ?? 0 : 0;

  return (
    <div className="overlay inv-overlay" role="dialog" aria-modal="true" aria-label="Vermögen">
      <div className="overlay-inner">
        <header className="overlay-head">
          <button className="nav-back" onClick={onClose}>‹ Zurück</button>
          <span className="hub-coins">🪙 {fmt(club.coins)}</span>
        </header>
        <h2 className="fam-title">💼 Vermögen</h2>
        <GiftShelf career={career} onChange={onChange} />

        <div className="inv-summary">
          <div><small>Wert</small><strong>🪙 {fmt(portfolioValue(career))}</strong></div>
          <div><small>Einnahmen/Jahr</small><strong>~ 🪙 {fmt(expectedIncome(career))}</strong></div>
        </div>
        {report && (report.rent > 0 || report.dividends > 0 || investNotes.length > 0) && (
          <div className="fam-report">
            <strong>Letztes Jahr</strong>
            <span>Miete +{fmt(report.rent)} 🪙 · Dividenden +{fmt(report.dividends)} 🪙</span>
            {investNotes.map((n) => <span key={n}>{n}</span>)}
          </div>
        )}
        <p className="muted">Einnahmen werden am Ende jeder Saison (bzw. jedes Ruhestandsjahres) in deinen Club gezahlt. Beim Verkauf fallen {SELL_FEE * 100} % Gebühren an.</p>

        <div className="chips inv-tabs">
          <button className={`chip ${tab === 'home' ? 'active' : ''}`} onClick={() => setTab('home')}>🏠 Immobilien</button>
          <button className={`chip ${tab === 'clubs' ? 'active' : ''}`} onClick={() => setTab('clubs')}>📈 Klub-Anteile</button>
          <button className={`chip ${tab === 'casino' ? 'active' : ''}`} onClick={() => setTab('casino')}>🎰 Casino</button>
        </div>

        {tab === 'casino' && <CasinoTab career={career} onChange={onChange} />}
        {tab === 'home' && (
          <ul className="inv-list">
            {PROPERTIES.map((p) => {
              const holding = h?.properties.find((x) => x.id === p.id);
              const diff = holding ? holding.value - holding.bought : 0;
              return (
                <li key={p.id} className={holding ? 'owned' : ''}>
                  <span className="inv-icon" aria-hidden="true">{p.icon}</span>
                  <span className="grow">
                    <strong>{p.name}</strong>
                    <small>
                      Miete {Math.round(p.rent * 1000) / 10} %/Jahr · Schwankung {p.volatility >= 0.1 ? 'hoch' : p.volatility >= 0.06 ? 'mittel' : 'niedrig'}
                      {holding && <> · Wert 🪙 {fmt(holding.value)} <b className={diff >= 0 ? 'up' : 'down'}>({diff >= 0 ? '+' : '−'}{fmt(Math.abs(diff))})</b></>}
                    </small>
                  </span>
                  {holding ? (
                    <button className="btn secondary small" onClick={() => window.confirm(`${p.name} für ca. ${fmt(holding.value * (1 - SELL_FEE))} Coins verkaufen?`) && apply(sellProperty(career, p.id))}>Verkaufen</button>
                  ) : (
                    <button className="btn primary small" disabled={club.coins < p.price} onClick={() => apply(buyProperty(career, p.id, getClubState().coins))}>🪙 {fmt(p.price)}</button>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        {tab === 'clubs' && (
          <>
            <div className="inv-buy">
              <label>
                Liga
                <select value={leagueId} onChange={(e) => { setLeagueId(e.target.value); setClubId(''); }}>
                  {LEAGUES.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              </label>
              <label>
                Klub
                <select value={target} onChange={(e) => setClubId(e.target.value)}>
                  {clubs.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </label>
              {target && (
                <div className="inv-quote">
                  <span>1 % von {getClub(target).name}: <b>🪙 {fmt(targetPrice)}</b>{career.europeSlots[target] ? ' · spielt europäisch (+Dividende)' : ''}</span>
                  <div className="inv-btns">
                    {[1, 5, 10].map((n) => (
                      <button key={n} className="btn primary small" disabled={owned + n > MAX_STAKE || club.coins < n * targetPrice} onClick={() => apply(buyShares(career, target, n, getClubState().coins))}>
                        +{n} %
                      </button>
                    ))}
                  </div>
                  <small className="muted">Du besitzt {owned} % (max. {MAX_STAKE} %). Der Preis steigt, wenn der Klub stärker wird.</small>
                </div>
              )}
            </div>

            <h3 className="inv-h">Deine Anteile</h3>
            {!h?.shares.length && <p className="muted">Noch keine Anteile. Tipp: Starke Klubs sind teuer – Aufsteiger günstig.</p>}
            <ul className="inv-list">
              {(h?.shares ?? []).map((s) => {
                const value = s.percent * sharePrice(career, s.clubId);
                const diff = value - s.invested;
                return (
                  <li key={s.clubId} className="owned">
                    <span className="inv-icon" aria-hidden="true">📈</span>
                    <span className="grow">
                      <strong>{getClub(s.clubId).name} · {s.percent} %</strong>
                      <small>
                        {stakeLabel(s.percent)} · {getLeague(clubLeagueId(career, s.clubId)).name} · Wert 🪙 {fmt(value)}{' '}
                        <b className={diff >= 0 ? 'up' : 'down'}>({diff >= 0 ? '+' : '−'}{fmt(Math.abs(diff))})</b>
                      </small>
                    </span>
                    <span className="inv-project">
                      <small>
                        🏗️ Stärke <b>{Math.round(clubStrength(career, s.clubId))}</b>
                        {(career.clubBacking?.[s.clubId] ?? 0) >= 0.5 && <> (davon +{Math.round(career.clubBacking![s.clubId])} durch dein Geld)</>}
                        {(s.injected ?? 0) > 0 && <> · insgesamt investiert 🪙 {fmt(s.injected!)}</>}
                      </small>
                      {(s.fund ?? 0) > 0 && (
                        <small>
                          Ausbau-Budget 🪙 {fmt(s.fund!)} – reicht für ca. +{Math.max(1, Math.round(fundPreview(career, s.clubId, s.fund!)))} Stärke, verbaut über die nächsten Saisons (max. +{MAX_GAIN_PER_YEAR} pro Jahr).
                        </small>
                      )}
                    </span>
                    <span className="inv-inject">
                      <small>In den Klub investieren:</small>
                      {INJECT_AMOUNTS.map((a) => (
                        <button
                          key={a}
                          className="btn secondary small"
                          disabled={club.coins < a}
                          onClick={() => window.confirm(`${fmt(a)} Coins in ${getClub(s.clubId).name} stecken? Das Geld ist weg – der Klub baut damit Saison für Saison Kader und Umfeld aus (ca. +${Math.max(0.1, fundPreview(career, s.clubId, (s.fund ?? 0) + a) - fundPreview(career, s.clubId, s.fund ?? 0)).toFixed(1).replace('.', ',')} Stärke). Ohne weiteres Geld bröckelt es langsam wieder ab.`) && apply(injectMoney(career, s.clubId, a, getClubState().coins))}
                        >
                          🪙 {fmt(a)}
                        </button>
                      ))}
                    </span>
                    <span className="inv-btns">
                      <button className="btn secondary small" onClick={() => apply(sellShares(career, s.clubId, 1))}>−1 %</button>
                      <button className="btn secondary small" onClick={() => window.confirm(`Alle ${s.percent} % verkaufen?`) && apply(sellShares(career, s.clubId, s.percent))}>Alle</button>
                    </span>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}
