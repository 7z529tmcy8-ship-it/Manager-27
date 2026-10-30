import { enterFullscreen, getSettings, lockLandscape } from './settings';
import { PASS_XP, addPassXp } from './game/pass';
import { autoStartMotion } from './tilt';
import { cleanStorage, migrateSaves, onSaveStatus, storageBreakdown } from './game/storage';
import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import Hub from './components/Hub';
import Store from './components/Store';
import HalloweenDecor from './components/HalloweenDecor';
import NavBar, { type NavTarget } from './components/NavBar';
import { listCareers } from './game/storage';

// Größere Bereiche erst laden, wenn man sie öffnet – das Hauptmenü startet dadurch schneller.
const CreateCareer = lazy(() => import('./components/CreateCareer'));
const CareerScreen = lazy(() => import('./components/CareerScreen'));
const Achievements = lazy(() => import('./components/Achievements'));
const Collection = lazy(() => import('./components/Collection'));
const HallOfFame = lazy(() => import('./components/HallOfFame'));
const Team = lazy(() => import('./components/Team'));
const DuelsScreen = lazy(() => import('./components/Team').then((m) => ({ default: m.DuelsScreen })));
const SbcScreen = lazy(() => import('./components/Team').then((m) => ({ default: m.SbcScreen })));
const Trade = lazy(() => import('./components/Trade'));
const GigEvent = lazy(() => import('./components/GigEvent'));
const SeasonPass = lazy(() => import('./components/SeasonPass'));
import UpdateBanner, { unseenUpdates } from './components/UpdateBanner';
import { UPDATES, type UpdateNote } from './data/updates';
import { creditCareer, removeOwnCareerCards, rewardPending } from './game/club';
import CareerReward from './components/CareerReward';
import { saveCareer } from './game/storage';
import type { Career } from './game/types';
import { getClubState, setClubState, useClub } from './clubStore';
import { installClickSound, play } from './sound';
import Icon, { noEmoji } from './components/Icon';

type Screen =
  | { name: 'home' }
  | { name: 'store' }
  | { name: 'collection' }
  | { name: 'team' }
  | { name: 'trade' }
  | { name: 'duels' }
  | { name: 'sbc' }
  | { name: 'create' }
  | { name: 'fame' }
  | { name: 'achievements' }
  | { name: 'pass' }
  | { name: 'gig' }
  | { name: 'game'; career: Career };

export default function App() {
  const [screen, setScreen] = useState<Screen>({ name: 'home' });
  const [saveFailed, setSaveFailed] = useState(false);
  const [hintClosed, setHintClosed] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  // Selbst erstellte Spieler bekommen keine Karriere-Karten mehr: deren alte Karten einmalig entfernen.
  useEffect(() => {
    const c = getClubState();
    if (!c.ownCardsRemoved) setClubState(removeOwnCareerCards(c, listCareers()));
  }, []);

  // Coin-Verbesserungen gibt es nicht mehr: einmalige Erstattung anzeigen und dauerhaft speichern.
  useEffect(() => {
    const c = getClubState();
    if (!c.refundNotice) return;
    setClubState({ ...c, refundNotice: undefined });
    setToast(`Karten-Verbesserung per Coins gibt es nicht mehr – du bekommst ${c.refundNotice.toLocaleString('de-DE')} Coins zurück. Neu: Evolutions!`);
  }, []);

  // Sounds: Klick bei jedem Knopf, Münzen beim Verdienen, Kasse beim Ausgeben.
  useEffect(() => installClickSound(), []);
  useEffect(() => autoStartMotion(), []);
  // Schwache Geräte bekommen weniger Effekte; im Hintergrund laufen keine Animationen weiter.
  useEffect(() => {
    const nav = navigator as Navigator & { deviceMemory?: number };
    const root = document.documentElement;
    root.classList.toggle('lite', (nav.hardwareConcurrency ?? 8) <= 4 && (nav.deviceMemory ?? 8) <= 3);
    const vis = () => root.classList.toggle('paused', document.hidden);
    document.addEventListener('visibilitychange', vis);
    return () => document.removeEventListener('visibilitychange', vis);
  }, []);
  // Beim ersten Tippen: Vollbild (Handy/Tablet) bzw. Querformat sperren, falls gewünscht (geht nur nach einer Berührung)
  useEffect(() => {
    const st = getSettings();
    const touch = window.matchMedia?.('(pointer: coarse)').matches;
    if (!st.landscape && !(st.fullscreen !== false && touch)) return;
    const once = () => {
      if (getSettings().landscape) void lockLandscape();
      else void enterFullscreen();
      window.removeEventListener('pointerdown', once);
    };
    window.addEventListener('pointerdown', once);
    return () => window.removeEventListener('pointerdown', once);
  }, []);
  useEffect(() => { migrateSaves(); return onSaveStatus((ok) => setSaveFailed(!ok)); }, []);
  const coins = useClub().coins;
  const lastCoins = useRef(coins);
  useEffect(() => {
    if (coins === lastCoins.current) return;
    play(coins > lastCoins.current ? 'coin' : 'spend');
    lastCoins.current = coins;
  }, [coins]);

  // Update-Banner: erscheint einmal nach jedem neuen Update (und auf Wunsch über „Neuigkeiten“).
  const [news, setNews] = useState<UpdateNote[]>(unseenUpdates);

  const update = (next: Career) => {
    let career = next;
    // Neue Saisons bringen Coins für den Club.
    const res = creditCareer(getClubState(), career);
    if (res.gained > 0 || res.drops > 0) {
      setClubState(addPassXp(res.club, res.seasons * PASS_XP.careerSeason));
      const extra = [res.drops ? `${res.drops} Drop${res.drops > 1 ? 's' : ''}` : '', res.mega ? `${res.mega} Mega-Drop${res.mega > 1 ? 's' : ''}` : ''].filter(Boolean).join(' + ');
      setToast(`+${res.gained.toLocaleString('de-DE')} Coins${extra ? ` + ${extra}` : ''} ${res.seasons === 0 ? 'aus Familie & Vermögen' : res.seasons === 1 ? 'für die Saison' : `für ${res.seasons} Saisons`}`);
    }
    // Karriere vorbei: Belohnungskarte wählen (Ikone oder Auszeichnung).
    if (rewardPending(getClubState(), career)) setReward(career);
    // Verborgene Abhängigkeit: Das ganze Geld ist weg – ohne Erklärung.
    if (career.drainPending) {
      const lost = getClubState().coins;
      if (lost > 0) {
        setClubState({ ...getClubState(), coins: 0 });
        setToast(`Dein Konto ist leer (−${lost.toLocaleString('de-DE')} Coins). Wo ist das ganze Geld nur hin …?`);
      }
      career = { ...career, drainPending: 0, squandered: (career.squandered ?? 0) + lost };
    }
    setSaveFailed(!saveCareer(career));
    setScreen({ name: 'game', career });
  };
  const [reward, setReward] = useState<Career | null>(null);
  const home = () => setScreen({ name: 'home' });
  const load = (career: Career) => setScreen({ name: 'game', career });
  const go = (t: NavTarget) => {
    if (t === 'career') {
      const latest = listCareers()[0];
      setScreen(latest ? { name: 'game', career: latest } : { name: 'create' });
    } else setScreen({ name: t } as Screen);
  };
  const navActive: NavTarget | null = screen.name === 'home' || screen.name === 'team' || screen.name === 'duels' || screen.name === 'store' || screen.name === 'collection' || screen.name === 'pass'
    ? screen.name : screen.name === 'create' ? 'career' : null;
  // In der laufenden Karriere hat das Spiel eigene Leisten – dort keine Hauptnavigation.
  const showNav = screen.name !== 'game';

  return (
    <div className={`app ${showNav ? 'has-nav' : ''}`}>
      {showNav && <NavBar active={navActive} onGo={go} />}
      <HalloweenDecor />
      {/* Hinweis aufs Querformat nur in der Karriere – das Startmenü ist fürs Hochformat gebaut */}
      {!hintClosed && screen.name === 'game' && (
        <div className="rotate-hint" role="status">
          <Icon name="rise" size={22} /><span>Dreh dein Handy ins Querformat – das Spiel ist darauf ausgelegt.</span>
          <button className="rotate-hint-x" onClick={() => setHintClosed(true)} aria-label="Hinweis schließen"><Icon name="close" size={18} /></button>
        </div>
      )}
      {news.length > 0 && <UpdateBanner notes={news} onClose={() => setNews([])} />}
      {saveFailed && <SaveWarning onRetry={() => { if (screen.name === 'game') saveCareer(screen.career); }} />}
      {toast && <div className="coin-toast" role="status"><Icon name="coin" size={16} className="coin-ic" />{noEmoji(toast)}</div>}
      {reward && <CareerReward career={reward} onDone={(msg) => { setToast(msg ?? 'Deine Karriere-Belohnung liegt in der Sammlung!'); setReward(null); }} />}
      <Suspense fallback={<ScreenSkeleton />}>
        <div className="screen-in" key={screen.name === 'game' ? 'game' : screen.name}>
      {screen.name === 'home' && (
        <Hub
          onNews={() => setNews(UPDATES)}
          onNew={() => setScreen({ name: 'create' })}
          onLoad={load}
          onStore={() => setScreen({ name: 'store' })}
          onCollection={() => setScreen({ name: 'collection' })}
          onTeam={() => setScreen({ name: 'team' })}
          onTrade={() => setScreen({ name: 'trade' })}
          onDuels={() => setScreen({ name: 'duels' })}
          onSbc={() => setScreen({ name: 'sbc' })}
          onFame={() => setScreen({ name: 'fame' })}
          onAchievements={() => setScreen({ name: 'achievements' })}
          onPass={() => setScreen({ name: 'pass' })}
          onGig={() => setScreen({ name: 'gig' })}
          onReward={setReward}
        />
      )}
      {screen.name === 'store' && <Store onBack={home} onCollection={() => setScreen({ name: 'collection' })} />}
      {screen.name === 'collection' && <Collection onBack={home} onStore={() => setScreen({ name: 'store' })} />}
      {screen.name === 'team' && <Team onBack={home} onStore={() => setScreen({ name: 'store' })} />}
      {screen.name === 'duels' && <DuelsScreen onBack={home} onTeam={() => setScreen({ name: 'team' })} />}
      {screen.name === 'sbc' && <SbcScreen onBack={home} />}
      {screen.name === 'trade' && <Trade onBack={home} onCollection={() => setScreen({ name: 'collection' })} />}
      {screen.name === 'achievements' && <Achievements onBack={home} />}
      {screen.name === 'gig' && <GigEvent onBack={home} onCollection={() => setScreen({ name: 'collection' })} />}
      {screen.name === 'pass' && <SeasonPass onBack={home} onCollection={() => setScreen({ name: 'collection' })} />}
      {screen.name === 'fame' && <HallOfFame onBack={home} onOpen={load} />}
      {screen.name === 'create' && <CreateCareer onCancel={home} onCreate={update} />}
      {screen.name === 'game' && (
        <CareerScreen career={screen.career} onChange={update} onExit={home} />
      )}
        </div>
      </Suspense>
    </div>
  );
}

/** Platzhalter, solange ein Bereich nachgeladen wird. */
function ScreenSkeleton() {
  return (
    <main className="hub skeleton" aria-busy="true" aria-label="Lädt">
      <i className="sk-line w40" /><i className="sk-line w70" />
      <div className="sk-grid"><i /><i /><i /><i /></div>
    </main>
  );
}

/** Hinweis, wenn der Browser das Speichern ablehnt – meist ist der Speicher voll. Mit Aufräum-Knopf. */
function SaveWarning({ onRetry }: { onRetry: () => void }) {
  const [info, setInfo] = useState<string | null>(null);
  const b = storageBreakdown();
  const total = b.careers + b.club + b.flavio + b.other;
  return (
    <div className="banner warn save-warn" role="alert">
      <strong>Speichern hat nicht geklappt – der Browser-Speicher ist wahrscheinlich voll.</strong>
      <small>Belegt: ca. {total.toLocaleString('de-DE')} KB (Karrieren {b.careers.toLocaleString('de-DE')} KB · Club {b.club.toLocaleString('de-DE')} KB · Onkel Flavio {b.flavio.toLocaleString('de-DE')} KB). Browser erlauben meist nur ca. 5.000 KB pro Seite.</small>
      <span className="save-warn-actions">
        <button className="btn primary small" onClick={() => { const kb = cleanStorage(); setInfo(`Aufgeräumt – jetzt ca. ${kb.toLocaleString('de-DE')} KB.`); onRetry(); }}>Jetzt aufräumen</button>
      </span>
      {info && <small>{info} {b.flavio > 1000 ? 'Tipp: Bei Onkel Flavio alte Posts mit Bildern löschen spart viel Platz.' : 'Wenn es weiter nicht klappt: alte Karrieren unter „Spielstände“ löschen.'}</small>}
    </div>
  );
}
