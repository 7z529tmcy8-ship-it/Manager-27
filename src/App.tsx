import { enterFullscreen, getSettings, lockLandscape, updateSettings } from './settings';
import { autoStartMotion } from './tilt';
import { cleanStorage, migrateSaves, onSaveStatus, storageBreakdown } from './game/storage';
import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import NavBar, { type NavTarget } from './components/NavBar';
import CareerHome from './components/CareerHome';
import { listCareers } from './game/storage';

// Größere Bereiche erst laden, wenn man sie öffnet – das Hauptmenü startet dadurch schneller.
const CreateCareer = lazy(() => import('./components/CreateCareer'));
const CareerScreen = lazy(() => import('./components/CareerScreen'));
const TeamScreen = lazy(() => import('./components/TeamScreen'));
const DuelsPage = lazy(() => import('./components/DuelsPage'));
const ProfilePage = lazy(() => import('./components/ProfilePage'));
const CasinoPage = lazy(() => import('./components/casino/CasinoPage'));
const ShopPage = lazy(() => import('./components/ShopPage'));
import UpdateBanner, { unseenUpdates } from './components/UpdateBanner';
import { UPDATES, type UpdateNote } from './data/updates';
import { creditCareer, removeOwnCareerCards, removeSeasonPlayerCards, rewardPending } from './game/club';
import CareerReward from './components/CareerReward';
import { saveCareer } from './game/storage';
import type { Career } from './game/types';
import { getClubState, setClubState, trackDailyGoal, useClub } from './clubStore';
import { installClickSound, play } from './sound';
import Icon, { noEmoji } from './components/Icon';
import { cashback, dailyBonus, tourReward } from './game/casino';
import { CARDS_FROM_CAREER_ONLY, CASINO_ONLY } from './game/mode';
import { bootSeen } from './components/PasswordGate';
const Settings = lazy(() => import('./components/Settings'));
const Backup = lazy(() => import('./components/Backup'));

// Nur noch vier Bereiche: Karriere (Start), Team, Duelle, Profil.
type Screen =
  | { name: 'home' }
  | { name: 'team'; tab?: 'squad' | 'collection' }
  | { name: 'shop' }
  | { name: 'duels' }
  | { name: 'profile' }
  | { name: 'casino' }
  | { name: 'create' }
  | { name: 'game'; career: Career };

export default function App() {
  const [screen, setScreen] = useState<Screen>(CASINO_ONLY ? { name: 'casino' } : { name: 'home' });
  // Casino-Modus: Läuft beim Start noch der Ladebildschirm, braucht es die Casino-Explosion nicht zusätzlich.
  const [introOnStart] = useState(() => !CASINO_ONLY || bootSeen());
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [backupOpen, setBackupOpen] = useState(false);
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
    // Nur die Spezialkarte am Karriereende zählt: zwischenzeitliche Saison-Karten wieder entfernen
    const cleaned = removeSeasonPlayerCards(getClubState());
    if (cleaned !== getClubState()) setClubState(cleaned);
  }, []);
  // Karriere-Einstellungen gelten jetzt für alle Karrieren: einmalig die der zuletzt gespielten Karriere übernehmen.
  useEffect(() => {
    if (getSettings().careerSettings) return;
    const latest = [...listCareers()].sort((a, b) => b.updatedAt - a.updatedAt)[0];
    updateSettings({ careerSettings: { ...(latest?.settings ?? {}) } });
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
  // Die anderen Bereiche im Leerlauf vorladen – dann reagiert jeder Wechsel sofort.
  useEffect(() => {
    if (CASINO_ONLY) return;
    const t = setTimeout(() => {
      void import('./components/CreateCareer'); void import('./components/CareerScreen');
      void import('./components/TeamScreen'); void import('./components/DuelsPage'); void import('./components/ProfilePage');
    }, 800);
    return () => clearTimeout(t);
  }, []);
  // Kontostand-Ton und Casino-Punkt leben in eigenen kleinen Komponenten – so zeichnet ein Casino-Gewinn nicht die ganze App neu.

  // Update-Banner: erscheint einmal nach jedem neuen Update (und auf Wunsch über „Neuigkeiten“).
  const [news, setNews] = useState<UpdateNote[]>(unseenUpdates);

  const update = (next: Career) => {
    let career = next;
    // Neue Saisons bringen Coins für den Club.
    const before = getClubState();
    const res = creditCareer(before, career);
    // Still gutschreiben – keine Einblendung nach jeder Saison (der Kontostand zeigt es ohnehin).
    if (res.club !== before) setClubState(res.club);
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
    trackDailyGoal('career');
    setScreen({ name: 'game', career });
  };
  const [reward, setReward] = useState<Career | null>(null);
  const home = () => setScreen({ name: 'home' });
  const load = (career: Career) => setScreen({ name: 'game', career });
  // Kein Karten-Shop mehr: Verweise auf den Shop führen zur Sammlung
  const toShop = () => setScreen(CARDS_FROM_CAREER_ONLY ? { name: 'team', tab: 'collection' } : { name: 'shop' });
  const go = (t: NavTarget) => setScreen(t === 'career' ? { name: 'home' } : ({ name: t } as Screen));
  const navActive: NavTarget | null = screen.name === 'home' || screen.name === 'create' ? 'career' : screen.name === 'team' || screen.name === 'shop' || screen.name === 'duels' || screen.name === 'casino' || screen.name === 'profile' ? screen.name : null;
  // In der laufenden Karriere hat das Spiel eigene Leisten – dort keine Hauptnavigation.
  const showNav = screen.name !== 'game' && !CASINO_ONLY;

  return (
    <div className={`app ${showNav ? 'has-nav' : ''}`}>
      <CoinSound />
      {showNav && <ClubNav active={navActive} onGo={go} />}
      {/* Hinweis aufs Querformat nur in der Karriere – das Startmenü ist fürs Hochformat gebaut */}
      {!hintClosed && screen.name === 'game' && (
        <div className="rotate-hint" role="status">
          <Icon name="rise" size={22} /><span>Dreh dein Handy ins Querformat – das Spiel ist darauf ausgelegt.</span>
          <button className="rotate-hint-x" onClick={() => setHintClosed(true)} aria-label="Hinweis schließen"><Icon name="close" size={18} /></button>
        </div>
      )}
      {news.length > 0 && <UpdateBanner notes={news} onClose={() => setNews([])} onStore={() => setNews([])} />}
      {saveFailed && <SaveWarning onRetry={() => { if (screen.name === 'game') saveCareer(screen.career); }} />}
      {toast && <div className="coin-toast" role="status"><Icon name="coin" size={16} className="coin-ic" />{noEmoji(toast)}</div>}
      {reward && <CareerReward career={reward} onDone={(msg) => { setToast(typeof msg === 'string' ? msg : 'Neue Karte in deinem Team!'); setReward(null); }} />}
      <Suspense fallback={<ScreenSkeleton />}>
        <div className="screen-in" key={screen.name === 'game' ? 'game' : screen.name}>
      {screen.name === 'home' && (
        <CareerHome
          onNews={() => { setNews(UPDATES); import('./data/updatesArchive').then((m) => setNews((cur) => (cur.length ? [...UPDATES, ...m.UPDATES_ARCHIVE] : cur))).catch(() => { /* ohne Archiv */ }); }}
          onNew={() => setScreen({ name: 'create' })}
          onLoad={load}
          onReward={setReward}
          onProfile={() => setScreen({ name: 'profile' })}
          onCasino={() => setScreen({ name: 'casino' })}
          onShop={toShop}
          onDuels={() => setScreen({ name: 'duels' })}
          onCollection={() => setScreen({ name: 'team', tab: 'collection' })}
        />
      )}
      {screen.name === 'team' && <TeamScreen key={screen.tab ?? 'x'} tab={screen.tab} onDuels={() => setScreen({ name: 'duels' })} onShop={toShop} onCasino={() => setScreen({ name: 'casino' })} />}
      {screen.name === 'shop' && !CARDS_FROM_CAREER_ONLY && <ShopPage onCollection={() => setScreen({ name: 'team', tab: 'collection' })} onCasino={() => setScreen({ name: 'casino' })} onDuels={() => setScreen({ name: 'duels' })} />}
      {screen.name === 'duels' && <DuelsPage onTeam={() => setScreen({ name: 'team', tab: 'squad' })} onShop={CARDS_FROM_CAREER_ONLY ? home : toShop} />}
      {screen.name === 'profile' && <ProfilePage />}
      {screen.name === 'casino' && (CASINO_ONLY
        ? <CasinoPage intro={introOnStart} onSettings={() => setSettingsOpen(true)} />
        : <CasinoPage onExit={home} />)}
      {screen.name === 'create' && <CreateCareer onCancel={home} onCreate={update} />}
      {screen.name === 'game' && (
        <CareerScreen career={screen.career} onChange={update} onExit={home} />
      )}
        </div>
        {settingsOpen && <Settings onClose={() => setSettingsOpen(false)} onNews={() => { setSettingsOpen(false); setNews(UPDATES); }} onBackup={() => { setSettingsOpen(false); setBackupOpen(true); }} />}
        {backupOpen && <Backup onClose={() => setBackupOpen(false)} />}
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
  const total = b.careers + b.club + b.other;
  return (
    <div className="banner warn save-warn" role="alert">
      <strong>Speichern hat nicht geklappt – der Browser-Speicher ist wahrscheinlich voll.</strong>
      <small>Belegt: ca. {total.toLocaleString('de-DE')} KB (Karrieren {b.careers.toLocaleString('de-DE')} KB · Club {b.club.toLocaleString('de-DE')} KB). Browser erlauben meist nur ca. 5.000 KB pro Seite.</small>
      <span className="save-warn-actions">
        <button className="btn primary small" onClick={() => { const kb = cleanStorage(); setInfo(`Aufgeräumt – jetzt ca. ${kb.toLocaleString('de-DE')} KB.`); onRetry(); }}>Jetzt aufräumen</button>
      </span>
      {info && <small>{info} Wenn es weiter nicht klappt: alte Karrieren unter „Spielstände“ löschen.</small>}
    </div>
  );
}

/** Ton beim Verdienen und Ausgeben von Coins. */
function CoinSound() {
  const coins = useClub().coins;
  const last = useRef(coins);
  useEffect(() => {
    if (coins === last.current) return;
    play(coins > last.current ? 'coin' : 'spend');
    last.current = coins;
  }, [coins]);
  return null;
}

/** Navigation mit Hinweis-Punkt am Casino (Bonus wartet). */
function ClubNav({ active, onGo }: { active: NavTarget | null; onGo: (t: NavTarget) => void }) {
  const club = useClub();
  const dot = dailyBonus(club).ready || cashback(club).ready || !!tourReward(club);
  return <NavBar active={active} onGo={onGo} dots={{ casino: dot }} />;
}
