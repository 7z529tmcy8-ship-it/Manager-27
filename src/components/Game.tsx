import { useEffect, useRef, useState } from 'react';
import { getClub, getLeague } from '../data/leagues';
import {
  canComeback,
  canStay,
  comeback,
  endSideProject,
  markStorySeen,
  playNextStage,
  playSeason,
  stayAtClub,
  stayInWinter,
  totalTransferFees,
} from '../game/career';
import { SIDE_PROJECTS } from '../game/decisions';
import { clubLeagueId, currentClubId, formatMoney, seasonLabel } from '../game/player';
import { STAGES, sortTable } from '../game/season';
import type { Career } from '../game/types';
import DecisionPanel from './DecisionPanel';
import { SeasonGoals, TrainingPicker } from './GoalsAndTraining';
import HalfReport from './HalfReport';
import History from './History';
import LeagueTable from './LeagueTable';
import LiveFinal from './LiveFinal';
import NewsFeed from './NewsFeed';
import PlayerCard from './PlayerCard';
import { RivalCard, RivalComparison } from './RivalPanel';
import SeasonReport from './SeasonReport';
import SeasonStory from './SeasonStory';
import StagePanel from './StagePanel';
import TransferWindow from './TransferWindow';

interface Props {
  career: Career;
  onChange: (career: Career) => void;
  onExit: () => void;
}

type Tab = 'season' | 'transfers' | 'news' | 'career' | 'table';

export default function Game({ career, onChange, onExit }: Props) {
  const [tab, setTab] = useState<Tab>('season');
  const topRef = useRef<HTMLDivElement>(null);
  const p = career.player;
  const last = career.history[career.history.length - 1];
  const clubId = currentClubId(p);
  const league = getLeague(clubLeagueId(career, clubId));
  const windowOpen = career.phase === 'window' || career.phase === 'winter';
  const offerCount = windowOpen ? career.offers.length : 0;
  const stage = career.progress?.stage ?? 0;
  // Nach jeder neuen Saison einmal die Story zeigen (nicht nach Entführung/Ruhestand).
  const showStory =
    !!last &&
    (career.phase === 'window' || career.phase === 'retired') &&
    career.storySeen !== last.season &&
    last.apps > 0;

  // Nach jedem Phasenwechsel zurück zur Saisonansicht – dort steht, was passiert ist.
  const phaseKey = `${career.phase}-${career.year}-${career.progress?.stage ?? 0}`;
  useEffect(() => {
    setTab('season');
  }, [phaseKey]);

  const go = (t: Tab) => {
    setTab(t);
    topRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' });
  };

  const tabs: { id: Tab; label: string; disabled?: boolean; badge?: number }[] = [
    { id: 'season', label: 'Saison' },
    { id: 'transfers', label: 'Transfers', disabled: !windowOpen, badge: offerCount || undefined },
    { id: 'news', label: 'News' },
    { id: 'career', label: 'Karriere', disabled: !last },
    { id: 'table', label: 'Tabelle', disabled: !last && stage === 0 },
  ];

  return (
    <main className="game">
      <nav className="topnav">
        <button className="nav-back" onClick={onExit} aria-label="Zurück zum Menü">‹ Menü</button>
        <span className="nav-title">{p.name}</span>
        <span className="nav-meta">
          {career.phase === 'retired' ? 'Karriere beendet' : `${seasonLabel(career.year)}`}
        </span>
      </nav>

      <header className="game-head">
        <p className="eyebrow">
          {career.phase === 'retired' ? 'Karriere beendet' : `${getClub(clubId).name} · ${league.name}`}
        </p>
        <h1>{p.name}</h1>
      </header>

      <div className="layout">
        <aside>
          <PlayerCard career={career} />
        </aside>

        <section className="content">
          <div className="segmented" role="tablist" ref={topRef}>
            {tabs.map((t) => (
              <button
                key={t.id}
                role="tab"
                aria-selected={tab === t.id}
                className={tab === t.id ? 'active' : ''}
                disabled={t.disabled}
                onClick={() => setTab(t.id)}
              >
                {t.label}
                {t.badge ? <span className="badge">{t.badge}</span> : null}
              </button>
            ))}
          </div>

          {tab === 'season' && (
            <>
              {career.phase === 'final' && career.liveFinal && <LiveFinal career={career} onChange={onChange} />}
              <DecisionPanel career={career} onChange={onChange} />
              {career.phase === 'season' && !career.decision && (
                <>
                  {stage === 0 && (
                    <div className="panel action">
                      <div>
                        <p className="eyebrow">Neue Saison</p>
                        <h2>Saison {seasonLabel(career.year)}</h2>
                        <p className="muted">
                          {p.loan ? `Leihe bei ${getClub(p.loan.clubId).name}` : getClub(clubId).name} · Rolle:{' '}
                          <strong>{p.loan ? p.loan.role : p.contract.role}</strong>
                          {p.captainOf === clubId && <span className="pill small">Kapitän</span>}
                        </p>
                        {p.sideProject && (
                          <p className="side-project">
                            Nebenprojekt: {SIDE_PROJECTS[p.sideProject.kind].name} ({p.sideProject.hits} Hits, {p.sideProject.flops} Flops)
                            <button className="btn link small" onClick={() => onChange(endSideProject(career))}>Beenden</button>
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                  <StagePanel career={career} onChange={onChange} />
                  <div className="panel">
                    <SeasonGoals goals={career.seasonGoals ?? []} matches={stage > 0 ? career.progress?.matches : undefined} />
                    <TrainingPicker career={career} onChange={onChange} />
                  </div>
                </>
              )}
              {career.phase === 'winter' && career.progress && (
                <>
                  <HalfReport career={career} />
                  {!career.decision && (
                    <div className="panel">
                      <SeasonGoals goals={career.seasonGoals ?? []} matches={career.progress.matches} />
                      <TrainingPicker career={career} onChange={onChange} />
                    </div>
                  )}
                </>
              )}
              {career.phase === 'retired' && (
                <div className="panel action">
                  <div>
                    <p className="eyebrow">Karriereende</p>
                    <h2>Danke für alles.</h2>
                    <p className="muted">{career.retiredReason}</p>
                    <p className="muted">
                      Ablösesummen gesamt: <strong>{formatMoney(totalTransferFees(career))}</strong>
                      {career.transfers ? ` · ${career.transfers.filter((t) => t.fee > 0).length} Wechsel mit Ablöse` : ''}
                    </p>
                  </div>
                </div>
              )}
              {career.phase === 'winter' || career.phase === 'final' || (career.phase === 'season' && stage > 0) ? null : last ? (
                <SeasonReport season={last} />
              ) : (
                <div className="panel empty">
                  <p>Noch keine Saison gespielt. Einsätze, Tore, Noten und die Entwicklung deines Spielers werden komplett simuliert.</p>
                </div>
              )}
            </>
          )}

          {tab === 'transfers' && windowOpen && !career.decision && <TransferWindow career={career} onChange={onChange} />}
          {tab === 'transfers' && windowOpen && career.decision && (
            <div className="panel empty">Beantworte zuerst die offene Entscheidung unter „Saison“.</div>
          )}

          {tab === 'news' && (
            <>
              <RivalCard career={career} />
              <NewsFeed news={career.news ?? []} limit={30} />
            </>
          )}

          {tab === 'career' && (
            <>
              <History career={career} />
              <RivalComparison career={career} />
            </>
          )}

          {tab === 'table' && career.progress && stage > 0 && (
            <LeagueTable
              title={`${career.phase === 'winter' ? 'Tabelle zur Winterpause' : 'Aktuelle Tabelle'} · ${league.name}`}
              table={sortTable(career.progress.rows[league.id])}
              leagueId={league.id}
              clubId={clubId}
            />
          )}
          {tab === 'table' && (!career.progress || stage === 0) && last && (
            <LeagueTable
              title={`Abschlusstabelle ${getLeague(last.leagueId).name} ${last.season}`}
              table={last.table}
              leagueId={last.leagueId}
              clubId={last.clubId}
            />
          )}
        </section>
      </div>

      {showStory && last && (
        <SeasonStory career={career} season={last} onClose={() => onChange(markStorySeen(career, last.season))} />
      )}
      <ActionBar career={career} onChange={onChange} go={go} tab={tab} />
    </main>
  );
}

const offersText = (n: number) => (n === 0 ? 'keine Angebote' : n === 1 ? '1 Angebot' : `${n} Angebote`);

/** Feste Leiste unten: zeigt immer den nächsten sinnvollen Schritt. */
function ActionBar({ career, onChange, go, tab }: { career: Career; onChange: (c: Career) => void; go: (t: Tab) => void; tab: Tab }) {
  const p = career.player;
  let label = '';
  let primary: { text: string; run: () => void } | null = null;
  let secondary: { text: string; run: () => void } | null = null;

  if (career.decision) {
    label = 'Eine Entscheidung wartet auf dich.';
    primary = { text: 'Zur Entscheidung', run: () => go('season') };
  } else if (career.phase === 'final') {
    label = career.liveFinal?.done ? 'Abpfiff.' : 'Das Finale läuft.';
    if (tab !== 'season') primary = { text: 'Zum Finale', run: () => go('season') };
  } else if (career.phase === 'season') {
    const stage = career.progress?.stage ?? 0;
    label = `Saison ${seasonLabel(career.year)} · Etappe ${stage + 1} von ${STAGES}`;
    primary = { text: `Etappe ${stage + 1} spielen`, run: () => onChange(playNextStage(career)) };
    secondary = { text: 'Ganze Saison', run: () => onChange(playSeason(career)) };
  } else if (career.phase === 'winter') {
    label = p.loan ? 'Winterpause – du bleibst beim Leihverein.' : `Winterpause · ${offersText(career.offers.length)}`;
    primary = { text: 'Rückrunde starten', run: () => onChange(stayInWinter(career)) };
    if (!p.loan && tab !== 'transfers') secondary = { text: 'Angebote', run: () => go('transfers') };
  } else if (career.phase === 'window') {
    label = `Transferfenster · ${offersText(career.offers.length)}`;
    if (canStay(career)) {
      primary = { text: 'Bleiben', run: () => onChange(stayAtClub(career)) };
      if (tab !== 'transfers') secondary = { text: 'Angebote', run: () => go('transfers') };
    } else if (tab !== 'transfers') {
      primary = { text: 'Neuen Verein finden', run: () => go('transfers') };
    } else {
      label = 'Vertrag ausgelaufen – wähle ein Angebot.';
    }
  } else if (career.phase === 'retired') {
    label = 'Karriere beendet.';
    if (canComeback(career)) primary = { text: 'Comeback wagen', run: () => onChange(comeback(career)) };
    if (tab !== 'career') secondary = { text: 'Karriere ansehen', run: () => go('career') };
  }

  if (!primary && !secondary) return <div className="actionbar-spacer" />;
  return (
    <>
      <div className="actionbar-spacer" />
      <div className="actionbar" role="region" aria-label="Nächster Schritt">
        <div className="actionbar-inner">
          <span className="actionbar-label">{label}</span>
          <div className="actionbar-buttons">
            {secondary && <button className="btn secondary" onClick={secondary.run}>{secondary.text}</button>}
            {primary && <button className="btn primary" onClick={primary.run}>{primary.text}</button>}
          </div>
        </div>
      </div>
    </>
  );
}
