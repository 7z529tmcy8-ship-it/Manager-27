import { useState } from 'react';
import { getClub, getLeague } from '../data/leagues';
import { playSeason } from '../game/career';
import { clubLeagueId, currentClubId, seasonLabel } from '../game/player';
import type { Career } from '../game/types';
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
            <button className={tab === 'table' ? 'active' : ''} onClick={() => setTab('table')} disabled={!last}>Tabelle</button>
          </div>

          {tab === 'overview' && (
            <>
              {career.phase === 'season' && (
                <div className="panel action">
                  <div>
                    <h2>Saison {seasonLabel(career.year)}</h2>
                    <p>
                      {p.loan ? `Leihe bei ${getClub(p.loan.clubId).name}` : getClub(clubId).name} · Rolle:{' '}
                      <strong>{p.loan ? p.loan.role : p.contract.role}</strong>
                    </p>
                  </div>
                  <button className="btn primary big" onClick={() => onChange(playSeason(career))}>
                    Saison simulieren ▶
                  </button>
                </div>
              )}
              {career.phase === 'window' && <TransferWindow career={career} onChange={onChange} />}
              {career.phase === 'retired' && (
                <div className="panel action">
                  <div>
                    <h2>Karriereende</h2>
                    <p>{career.retiredReason}</p>
                  </div>
                  <button className="btn" onClick={() => setTab('career')}>Karriere ansehen</button>
                </div>
              )}
              {last ? (
                <SeasonReport season={last} />
              ) : (
                <div className="panel empty">
                  <p>Noch keine Saison gespielt. Starte die erste Saison – Einsätze, Tore, Noten und die Entwicklung deines Spielers werden komplett simuliert.</p>
                </div>
              )}
            </>
          )}
          {tab === 'career' && <History career={career} />}
          {tab === 'table' && last && <LeagueTable season={last} />}
        </section>
      </div>
    </main>
  );
}
