import { Children, useRef, useState, type ReactNode } from 'react';
import { getClub } from '../data/leagues';
import { ballonTipCorrect, collectionProgress, ballonTipOpen, careerCard, claimBallonTip, creditCareer, eventActive, halloweenActive, rewardPending, type PackResult } from '../game/club';
import { BALLON_WINNER_2026 } from '../data/cards';
import BallonTip from './BallonTip';
import { PackOpening } from './Store';
import { currentClubId, seasonLabel } from '../game/player';
import { deleteCareer, listCareers, saveCareer } from '../game/storage';
import type { Career } from '../game/types';
import { getClubState, setClubState, useClub } from '../clubStore';
import Backup from './Backup';
import Settings from './Settings';
import UtCard from './UtCard';
import Icon from './Icon';
import { divName, divisionOf } from '../game/divisions';
import AdventCalendar from './AdventCalendar';
import ProfileScreen, { Emblem } from './ProfileScreen';
import GloryRoad from './GloryRoad';
import { ROAD, roadReady } from '../game/glory';
import { profileOf } from '../game/profile';
import { canFullscreen, enterFullscreen, exitFullscreen, isFullscreen } from '../settings';
import { adventToday, claimNewYearGift, newYearGiftOpen } from '../game/winter';
import { PASS_LEVELS, XP_PER_LEVEL, passLevel, passOf, unclaimedLevels, unclaimedProLevels } from '../game/pass';

interface Props {
  onNews: () => void;
  onNew: () => void;
  onLoad: (career: Career) => void;
  onStore: () => void;
  onCollection: () => void;
  onTeam: () => void;
  onTrade: () => void;
  onDuels: () => void;
  onSbc: () => void;
  onFame: () => void;
  onAchievements: () => void;
  onPass: () => void;
  onGig: () => void;
  /** Beendete Karriere, deren Belohnungskarte noch gewählt werden muss. */
  onReward: (career: Career) => void;
}

const fmtCoins = (n: number) => n.toLocaleString('de-DE');

/** Hauptmenü im Stil eines Sammelkarten-Hubs: große Kacheln, Coins oben, die eigene Karte im Mittelpunkt. */
export default function Hub({ onNews, onNew, onLoad, onStore, onCollection, onTeam, onTrade, onDuels, onSbc, onFame, onAchievements, onPass, onGig, onReward }: Props) {
  const club = useClub();
  const [saves, setSaves] = useState(listCareers);
  const [showSaves, setShowSaves] = useState(false);
  const [settings, setSettings] = useState(false);
  const [backup, setBackup] = useState(false);
  const [tipOpen, setTipOpen] = useState(false);
  const [tipPack, setTipPack] = useState<PackResult | null>(null);
  const [nyPack, setNyPack] = useState<PackResult | null>(null);
  const [advent, setAdvent] = useState(false);
  const [profile, setProfile] = useState(false);
  const [full, setFull] = useState(isFullscreen());
  const [glory, setGlory] = useState(false);
  const tipWon = ballonTipCorrect(club) === true && !club.ballonTipClaimed;
  const gigLastDay = new Date().getDate() === 18;
  const me = profileOf(club);
  const toggleFull = async () => { if (isFullscreen()) exitFullscreen(); else await enterFullscreen(); setTimeout(() => setFull(isFullscreen()), 200); };
  const latest = [...saves].sort((a, b) => b.updatedAt - a.updatedAt)[0];
  const progress = collectionProgress(club);
  const hasHistory = saves.some((c) => c.history.length > 0);
  const pendingReward = saves.find((c) => rewardPending(club, c));
  const freePacks = (club.welcomeClaimed ? 0 : 1) + (club.megaXxlClaimed ? 0 : 1) + (club.megaSuperClaimed ? 0 : 1);

  const remove = (c: Career) => {
    if (!confirm(`Karriere von ${c.player.name} wirklich löschen?`)) return;
    deleteCareer(c.id);
    setSaves(listCareers());
  };

  return (
    <main className="hub">
      <header className="hub-top">
        <button className="hub-profile" onClick={() => setProfile(true)} aria-label={`Profil von ${me.name}`}>
          <Emblem emblem={me.emblem} color={me.color} size={44} />
          <span className="hub-profile-text"><strong>{me.name}</strong><small><Icon name="trophy" size={13} />{(club.trophies ?? 0).toLocaleString('de-DE')}</small></span>
        </button>
        <span className="hub-coins" title="Coins – verdienst du im Karrieremodus"><Icon name="coin" size={18} />{fmtCoins(club.coins)}</span>
        <button className="hub-icon hub-news" onClick={onNews} aria-label="Neuigkeiten" title="Neuigkeiten"><Icon name="news" size={20} /></button>
        {canFullscreen() && <button className="hub-icon" onClick={toggleFull} aria-label={full ? 'Vollbild beenden' : 'Vollbild'} title="Vollbild"><Icon name={full ? 'shrink' : 'expand'} size={20} /></button>}
        <button className="hub-icon" onClick={() => setSettings(true)} aria-label="Einstellungen"><Icon name="gear" size={20} /></button>
      </header>

      <EventStrip>
        {pendingReward && (
          <button className="reward-call" onClick={() => onReward(pendingReward)}>
            <Icon name="flag" size={20} />
            Karriere von {pendingReward.player.name} beendet – jetzt deine Belohnung abholen ›
          </button>
        )}
        {tipWon && (
          <button className="reward-call gala-call" onClick={() => {
            const res = claimBallonTip(getClubState());
            if (!res) return;
            setClubState(res.club);
            setTipPack(res.result);
          }}>
            <Icon name="trophy" size={20} />
            Richtig getippt: {BALLON_WINNER_2026} gewinnt den Ballon d’Or! Dein Gala-Pack abholen ›
          </button>
        )}
        {newYearGiftOpen(club) && (
          <button className="ny-call" onClick={() => {
            const res = claimNewYearGift(getClubState());
            if (!res) return;
            setClubState(res.club);
            setNyPack(res.result);
          }}>
            <span className="ny-call-year">2027</span>
            <span className="ny-call-text"><b>Frohes neues Jahr!</b><small>Dein Feuerwerks-Pack gratis abholen – garantiert eine Silvester-Karte</small></span>
            <Icon name="arrow" size={22} />
          </button>
        )}
        {eventActive('silvester') && (
          <button className="ny-call alt" onClick={onStore}>
            <span className="ny-call-year">31.12.</span>
            <span className="ny-call-text"><b>Silvester-Event</b><small>Feuerwerks-Pack im Shop · Dembélé, Mbappé, Yamal bis 96 · nur 2 Tage</small></span>
            <Icon name="arrow" size={22} />
          </button>
        )}
        {halloweenActive() && (
          <button className="ev-call ev-halloween" onClick={onStore}>
            <span className="ev-call-icon"><Icon name="pumpkin" size={24} /></span>
            <span className="ev-call-text"><b>{eventActive('geisternacht') ? 'Geisternacht' : 'Halloween'}</b><small>{eventActive('geisternacht') ? 'Nur bis 31.10. · Geisternacht-Pack im Shop' : 'Bis 2.11. · Kürbis- und Geisterstunde-Pack im Shop'}</small></span>
            <Icon name="arrow" size={22} />
          </button>
        )}
        {eventActive('gala') && (
          <button className="ev-call ev-gala" onClick={onSbc}>
            <span className="ev-call-icon"><Icon name="medal" size={24} /></span>
            <span className="ev-call-text"><b>Gala-Woche</b><small>Bis 9.11. · Gala-Pack im Shop · SBC „Ballon d’Or 2026“</small></span>
            <Icon name="arrow" size={22} />
          </button>
        )}
        {adventToday() > 0 && (
          <button className="winter-call" onClick={() => setAdvent(true)}>
            <span className="winter-call-num">{adventToday()}</span>
            <span className="winter-call-text"><b>Adventskalender</b><small>{(club.advent ?? []).includes(adventToday()) ? 'Heute schon geöffnet – morgen geht’s weiter' : `Türchen ${adventToday()} wartet auf dich`} · Winter-Wunder-Pack im Shop</small></span>
            <Icon name="arrow" size={22} />
          </button>
        )}
        {eventActive('gig') && (
          <button className="gig-call" onClick={onGig}>
            <span className="gig-call-title" data-text="GIG">GIG</span>
            <span className="gig-call-text"><b>Glücksrad-Event</b><small>{gigLastDay ? 'Nur noch heute' : 'Nur heute und morgen'} · Packs bis GOAT · 0,5 % auf Yamal 95</small></span>
            <Icon name="arrow" size={22} />
          </button>
        )}
        {ballonTipOpen() && (
          <button className="reward-call gala-call" onClick={() => setTipOpen(true)}>
            <Icon name="medal" size={20} />
            {club.ballonTip
              ? `Dein Ballon-d’Or-Tipp: ${club.ballonTip === 'other' ? 'jemand anderes' : club.ballonTip} – ändern bis 26.10. ›`
              : 'Ballon d’Or 2026: Wer gewinnt? Tippe bis 26.10. – richtig getippt = Gala-Pack gratis ›'}
          </button>
        )}
      </EventStrip>
      <div className="hub-grid">
        <section className="hub-tile hero" onClick={() => (latest ? onLoad(latest) : onNew())} role="button" tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && (latest ? onLoad(latest) : onNew())}>
          <span className="hero-stadium" aria-hidden="true" />
          {latest ? (
            <>
              <UtCard card={careerCard(latest, club)} size="lg" shine={latest.player.ovr >= 85 || latest.phase === 'retired'} />
              <div className="hero-text">
                <span className="hub-kicker">Karriere fortsetzen</span>
                <strong>{latest.player.name}</strong>
                <small>
                  {latest.phase === 'retired'
                    ? `Karriere beendet · ${latest.history.length} Saisons`
                    : `${getClub(currentClubId(latest.player)).name} · ${seasonLabel(latest.year)}`}
                </small>
                <span className="hub-cta">Weiterspielen ›</span>
              </div>
            </>
          ) : (
            <div className="hero-text">
              <span className="hub-kicker">Willkommen</span>
              <strong>Starte deine erste Karriere</strong>
              <small>Vom Talent zur Legende – Saison für Saison.</small>
              <span className="hub-cta">Los geht’s ›</span>
            </div>
          )}
        </section>

        <button className="hub-big hb-new" onClick={onNew}>
          <Icon name="ball" size={30} />
          <span><strong>Neue Karriere</strong><small>Talent bis Legende</small></span>
        </button>
        <button className="hub-big hb-shop" onClick={onStore}>
          <Icon name="pack" size={30} />
          <span><strong>Shop</strong><small>{!club.megaSuperClaimed || !club.megaXxlClaimed || !club.welcomeClaimed ? 'Gratis-Pack!' : 'Packs & Drops'}</small></span>
          {(freePacks + (club.storedPacks?.length ?? 0) + (club.drops ?? 0) + (club.megaDrops ?? 0)) > 0 && <b className="hub-badge">{freePacks + (club.storedPacks?.length ?? 0) + (club.drops ?? 0) + (club.megaDrops ?? 0)}</b>}
        </button>
        <PassTile onClick={onPass} />
        <GloryTile onClick={() => setGlory(true)} />
        <Tile small icon="cards" title="Sammlung" sub={`${progress.label} gesammelt · ${progress.have} von ${progress.total} Karten`} onClick={onCollection} />
        <Tile small icon="tactics" title="Mein Team" sub="Aufstellung und Freunde-Duelle" onClick={onTeam} />
        <Tile small icon="duel" title="Duelle" sub={`${divName(divisionOf(club).div)} · ${club.duels.w} Siege`} onClick={onDuels} />
        <Tile small icon="puzzle" title="SBC" sub="Legendäre Momente 91–93 und Pack-Tausche" onClick={onSbc} />
      </div>

      <h2 className="hub-section">Mehr</h2>
      <div className="hub-list">
        <Row icon="news" title="Neuigkeiten" sub="Alle Updates im Überblick" onClick={onNews} />
        <Row icon="swap" title="Tauschbörse" sub="Karten mit echten Spielern tauschen – 100 % fair*" onClick={onTrade} />
        <Row icon="folder" title="Spielstände" sub={`${saves.length} gespeichert`} onClick={() => setShowSaves(true)} disabled={!saves.length} />
        <Row icon="trophy" title="Erfolge" sub="Karriereziele" onClick={onAchievements} disabled={!saves.length} />
        <Row icon="pillars" title="Hall of Fame" sub="Deine besten Karrieren" onClick={onFame} disabled={!hasHistory} />
        <Row icon="cloud" title="Sichern & Laden" sub="Spielstände exportieren und wieder einspielen" onClick={() => setBackup(true)} />
      </div>

      <p className="disclaimer hub-disc">
        Private Fan-Seite ohne Verbindung zu EA SPORTS. Eigene Karten-Designs, Werte sind eigene Schätzungen (Stand 2025/26).
        Coins gibt es nur im Spiel – kein echtes Geld.
      </p>

      {showSaves && (
        <div className="overlay" role="dialog" aria-modal="true" aria-label="Spielstände">
          <div className="overlay-inner">
            <header className="overlay-head"><button className="nav-back" onClick={() => setShowSaves(false)}>‹ Zurück</button></header>
            <h1 className="overlay-title">Spielstände</h1>
            <ul className="save-list">
              {saves.map((c) => (
                <li key={c.id}>
                  <button className="save-main" onClick={() => onLoad(c)}>
                    <span className="save-ovr">{c.player.ovr}</span>
                    <span>
                      <strong>{c.player.name}</strong>
                      <small>{c.phase === 'retired' ? `Karriere beendet · ${c.history.length} Saisons` : `${getClub(currentClubId(c.player)).name} · ${seasonLabel(c.year)} · ${c.player.age} Jahre`}</small>
                    </span>
                  </button>
                  <button className="btn ghost small" onClick={() => remove(c)}>Löschen</button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
      {settings && (
        <Settings
          career={latest}
          onChange={(c) => {
            // Entwickler-Änderungen an der letzten Karriere: Coins gutschreiben und speichern.
            const res = creditCareer(getClubState(), c);
            if (res.gained > 0 || res.icon) setClubState(res.club);
            saveCareer(c);
            setSaves(listCareers());
          }}
          onClose={() => setSettings(false)}
        />
      )}
      {backup && <Backup onClose={() => setBackup(false)} />}
      {tipOpen && <BallonTip onClose={() => setTipOpen(false)} />}
      {glory && <GloryRoad onClose={() => setGlory(false)} onStore={() => { setGlory(false); onStore(); }} />}
      {profile && <ProfileScreen careers={saves} onClose={() => setProfile(false)} />}
      {advent && <AdventCalendar onClose={() => setAdvent(false)} onCollection={() => { setAdvent(false); onCollection(); }} />}
      {nyPack && <PackOpening name="Feuerwerks-Pack" theme="silvester" result={nyPack} onClose={() => setNyPack(null)} onCollection={() => { setNyPack(null); onCollection(); }} />}
      {tipPack && <PackOpening name="Gala-Pack" theme="gala" result={tipPack} onClose={() => setTipPack(null)} onCollection={() => { setTipPack(null); onCollection(); }} />}
    </main>
  );
}

function Tile({ icon, title, sub, onClick, disabled, badge, accent, small }: { icon: string; title: string; sub: string; onClick: () => void; disabled?: boolean; badge?: string; accent?: boolean; small?: boolean }) {
  return (
    <button className={`hub-tile ${accent ? 'accent' : ''} ${small ? 'hub-tile-sm' : ''}`} onClick={onClick} disabled={disabled}>
      <span className="hub-tile-icon" aria-hidden="true"><Icon name={icon} /></span>
      <strong>{title}</strong>
      <small>{sub}</small>
      {badge && <span className="hub-badge">{badge}</span>}
    </button>
  );
}

function Row({ icon, title, sub, onClick, disabled }: { icon: string; title: string; sub: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button className="hub-link" onClick={onClick} disabled={disabled}>
      <span className="hub-link-icon" aria-hidden="true"><Icon name={icon} size={20} /></span>
      <span className="hub-link-text"><strong>{title}</strong><small>{sub}</small></span>
      <Icon name="arrow" size={18} className="hub-link-go" />
    </button>
  );
}

/** Breite Kachel für den Wochenpass: Stufe, Fortschritt und offene Belohnungen. */
function PassTile({ onClick }: { onClick: () => void }) {
  const club = useClub();
  const p = passOf(club);
  const level = passLevel(p.xp);
  const open = unclaimedLevels(club).length + unclaimedProLevels(club).length;
  const inLevel = level >= PASS_LEVELS ? XP_PER_LEVEL : p.xp % XP_PER_LEVEL;
  return (
    <button className="hub-tile hub-pass" onClick={onClick}>
      <span className="hub-tile-icon" aria-hidden="true"><Icon name="star" /></span>
      <span className="hub-pass-text">
        <strong>Wochenpass</strong>
        <small>{open ? `${open} ${open === 1 ? 'Belohnung' : 'Belohnungen'} abholen` : level >= PASS_LEVELS ? 'Komplett – stark!' : `Noch ${XP_PER_LEVEL - inLevel} XP bis Stufe ${level + 1}`}</small>
        <span className="evo-bar"><i style={{ width: `${(inLevel / XP_PER_LEVEL) * 100}%` }} /></span>
      </span>
      <span className="hub-pass-level"><b>{level}</b><small>/{PASS_LEVELS}</small></span>
      {open > 0 && <span className="hub-badge">{open}</span>}
    </button>
  );
}

/** Ruhmesweg-Kachel: Trophäen, Fortschritt zur nächsten Stufe, offene Drops und Belohnungen. */
function GloryTile({ onClick }: { onClick: () => void }) {
  const club = useClub();
  const best = club.trophyBest ?? 0;
  const next = ROAD.find((s) => s.at > best);
  const prevAt = [...ROAD].reverse().find((s) => s.at <= best)?.at ?? 0;
  const drops = (club.drops ?? 0) + (club.megaDrops ?? 0);
  const open = roadReady(club) + drops;
  return (
    <button className="hub-tile hub-pass hub-glory" onClick={onClick}>
      <span className="hub-tile-icon" aria-hidden="true"><Icon name="trophy" /></span>
      <span className="hub-pass-text">
        <strong>Ruhmesweg</strong>
        <small>{drops ? `${drops} Drop${drops > 1 ? 's' : ''} öffnen` : roadReady(club) ? `${roadReady(club)} Stufe${roadReady(club) > 1 ? 'n' : ''} abholen` : next ? `Noch ${next.at - best} Trophäen bis zur nächsten Stufe` : 'Komplett – Legende!'}</small>
        <span className="evo-bar"><i style={{ width: `${next ? ((best - prevAt) / (next.at - prevAt)) * 100 : 100}%` }} /></span>
      </span>
      <span className="hub-pass-level"><b>{(club.trophies ?? 0).toLocaleString('de-DE')}</b><small>Trophäen</small></span>
      {open > 0 && <span className="hub-badge">{open}</span>}
    </button>
  );
}

/** Event- und Hinweis-Leiste: mehrere Banner nebeneinander zum Wischen statt übereinander gestapelt. */
function EventStrip({ children }: { children: ReactNode }) {
  const items = Children.toArray(children).filter(Boolean);
  const ref = useRef<HTMLDivElement>(null);
  const [idx, setIdx] = useState(0);
  if (!items.length) return null;
  const onScroll = () => {
    const el = ref.current;
    if (!el) return;
    const w = (el.firstElementChild as HTMLElement | null)?.offsetWidth ?? el.clientWidth;
    setIdx(Math.round(el.scrollLeft / (w + 10)));
  };
  return (
    <div className="hub-events-wrap">
      <div className="hub-events-head"><i aria-hidden="true" />Jetzt live</div>
      <div className={`hub-events ${items.length > 1 ? 'multi' : ''}`} ref={ref} onScroll={onScroll}>{items}</div>
      {items.length > 1 && (
        <div className="hub-events-dots" aria-hidden="true">{items.map((_, i) => <i key={i} className={i === Math.min(idx, items.length - 1) ? 'on' : ''} />)}</div>
      )}
    </div>
  );
}
