import { useState } from 'react';
import { getClub, getLeague } from '../data/leagues';
import { playFirstHalf, playSeason, totalTransferFees } from '../game/career';
import { clubLeagueId, currentClubId, formatMoney, seasonLabel } from '../game/player';
import { sortTable } from '../game/season';
import type { Career } from '../game/types';
import DecisionPanel from './DecisionPanel';
import HalfReport from './HalfReport';
import LiveFinal from './LiveFinal';
import NewsFeed from './NewsFeed';
import { RivalCard, RivalComparison } from './RivalPanel';
import History from './History';
import LeagueTable from './LeagueTable';
import PlayerCard from './PlayerCard';
import SeasonReport from './SeasonReport';
import TransferWindow from './TransferWindow';

interface Props {
  career: Career;
  onChange: (career: Career) => void;
  onExit: () => void;
}

type Tab = 'overview' | 'career' | 'table';

export default function Game({ career, onChange, onExit }: Props) {
  const [tab, setTab] = useState<Tab>('overview');
  const p = career.player;
  const last = career.history[career.history.length - 1];
  const clubId = currentClubId(p);
  const league = getLeague(clubLeagueId(career, clubId));

  return (
    <main className="game">
      <div className="topbar">
        <button className="btn ghost" onClick={onExit}>← Menü</button>
        <div className="topbar-title">
          <h1>{p.name}</h1>
          <small>
            {career.phase === 'retired'
              ? 'Karriere beendet'
              : `${getClub(clubId).name} · ${league.name} · Saison ${seasonLabel(career.year)}`}
          </small>
        </div>
      </div>

      <div className="layout">
        <aside>
          <PlayerCard career={career} />
        </aside>

        <section className="content">
          <div className="tabs">
            <button className={tab === 'overview' ? 'active' : ''} onClick={() => setTab('overview')}>Übersicht</button>
            <button className={tab === 'career' ? 'active' : ''} onClick={() => setTab('career')}>Karriere</button>
            <button className={tab === 'table' ? 'active' : ''} onClick={() => setTab('table')} disabled={!last && !career.progress}>Tabelle</button>
          </div>

          {tab === 'overview' && (
            <>
              {career.phase === 'final' && career.liveFinal && <LiveFinal career={career} onChange={onChange} />}
              <DecisionPanel career={career} onChange={onChange} />
              {career.phase === 'season' && !career.decision && (
                <div className="panel action">
                  <div>
                    <h2>Saison {seasonLabel(career.year)}</h2>
                    <p>
                      {p.loan ? `Leihe bei ${getClub(p.loan.clubId).name}` : getClub(clubId).name} · Rolle:{' '}
                      <strong>{p.loan ? p.loan.role : p.contract.role}</strong>
                      {p.captainOf === clubId && <span className="pill small">Kapitän</span>}
                    </p>
                  </div>
                  <div className="action-buttons">
                    <button className="btn primary big" onClick={() => onChange(playFirstHalf(career))}>
                      Hinrunde simulieren ▶
                    </button>
                    <button className="btn" onClick={() => onChange(playSeason(career))} title="Ohne Stopp im Winter, Finals werden automatisch gespielt">
                      Ganze Saison ▶▶
                    </button>
                  </div>
                </div>
              )}
              {career.phase === 'winter' && career.progress && <HalfReport career={career} />}
              {career.phase === 'retired' && (
                <div className="panel action">
                  <div>
                    <h2>Karriereende</h2>
                    <p>{career.retiredReason}</p>
                    <p>
                      Ablösesummen gesamt: <strong>{formatMoney(totalTransferFees(career))}</strong>
                      {career.transfers ? ` · ${career.transfers.filter((t) => t.fee > 0).length} Wechsel mit Ablöse` : ''}
                    </p>
                  </div>
                  <button className="btn" onClick={() => setTab('career')}>Karriere ansehen</button>
                </div>
              )}
              {career.phase === 'winter' || career.phase === 'final' ? null : last ? (
                <SeasonReport season={last} />
              ) : (
                <div className="panel empty">
                  <p>Noch keine Saison gespielt. Starte die erste Saison – Einsätze, Tore, Noten und die Entwicklung deines Spielers werden komplett simuliert.</p>
                </div>
              )}
              {/* Erst der Rückblick, darunter die Angebote. Offene Entscheidungen gehen vor. */}
              {(career.phase === 'window' || career.phase === 'winter') && !career.decision && (
                <TransferWindow career={career} onChange={onChange} />
              )}
              {career.phase !== 'final' && <RivalCard career={career} />}
              {career.phase !== 'final' && <NewsFeed news={career.news ?? []} />}
            </>
          )}
          {tab === 'career' && (
            <>
              <History career={career} />
              <RivalComparison career={career} />
            </>
          )}
          {tab === 'table' && career.progress && (
            <LeagueTable
              title={`Tabelle zur Winterpause · ${league.name}`}
              table={sortTable(career.progress.rows[league.id])}
              leagueId={league.id}
              clubId={clubId}
            />
          )}
          {tab === 'table' && !career.progress && last && (
            <LeagueTable
              title={`Abschlusstabelle ${getLeague(last.leagueId).name} ${last.season}`}
              table={last.table}
              leagueId={last.leagueId}
              clubId={last.clubId}
            />
          )}
        </section>
      </div>
    </main>
  );
}
