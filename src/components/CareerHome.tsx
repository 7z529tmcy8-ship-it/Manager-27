import { Suspense, lazy, useState } from 'react';
import { CARDS_FROM_CAREER_ONLY } from '../game/mode';
import { HallOfFame } from './Legacy';
import { getClub } from '../data/leagues';
import { collectionProgress, rewardPending } from '../game/club';
import { divName, divReward, divisionOf } from '../game/divisions';
import { DAILY_BONUS_COINS, claimDaily, claimDailyBonus, dailyView, type DailyId } from '../game/daily';
import { play } from '../sound';
import { currentClubId, seasonLabel } from '../game/player';
import { profileOf } from '../game/profile';
import { deleteAllCareers, deleteCareer, listCareers, saveCareer } from '../game/storage';
import type { Career } from '../game/types';
import { getClubState, setClubState, useClub } from '../clubStore';
import Icon from './Icon';
import { Emblem } from './ProfilePage';
import { casinoOf, dailyBonus } from '../game/casino';
import { claimWelcome, freePackReady, welcomeReady } from '../game/collection';
import type { PackResult } from '../game/club';
const PackOpen = lazy(() => import('./PackOpen'));

const Settings = lazy(() => import('./Settings'));
const Backup = lazy(() => import('./Backup'));

const fmt = (n: number) => Math.round(n).toLocaleString('de-DE');
const sfx = (id: Parameters<typeof play>[0]) => { try { play(id); } catch { /* kein Ton */ } };
const GOAL_ICON: Record<DailyId, 'ball' | 'duel' | 'pack' | 'dice'> = { career: 'ball', duel: 'duel', pack: 'pack', casino: 'dice' };

const statusOf = (c: Career) =>
  c.phase === 'retired' ? `Karriere beendet · ${c.history.length} ${c.history.length === 1 ? 'Saison' : 'Saisons'}` : `${getClub(currentClubId(c.player)).name} · ${seasonLabel(c.year)} · ${c.player.age} Jahre`;

/** Startseite = Karriere: weiterspielen, neue Karriere, alle Spielstände. */
/** Kompakte Anzeige in der Kopfzeile: ab 100.000 als „1,2 Mio.“ usw. – damit nichts abgeschnitten wird. */
const short = (n: number) => (n >= 1e9 ? `${(n / 1e9).toFixed(1).replace('.', ',')} Mrd.` : n >= 1e6 ? `${(n / 1e6).toFixed(1).replace('.', ',')} Mio.` : n >= 1e5 ? `${Math.round(n / 1e3)} Tsd.` : Math.round(n).toLocaleString('de-DE'));

/** Kurzinfo zum Vereinsboss-Spielstand (ohne die ganze Logik zu laden). */
function bossTeaser(): string {
  try {
    const raw = localStorage.getItem('fc-boss-v1');
    if (!raw) return 'Leite einen Verein: Geld, NLZ, Stadion';
    const b = JSON.parse(raw) as { cash?: number; fired?: boolean; m?: { season?: number } };
    if (b.fired) return 'Entlassen – neuer Verein?';
    const c = b.cash ?? 0;
    const a = Math.abs(c);
    return `Kasse ${c < 0 ? '−' : ''}${a >= 1e6 ? `${(a / 1e6).toLocaleString('de-DE', { maximumFractionDigits: 1 })} Mio.` : `${Math.round(a / 1e3)} Tsd.`} €`;
  } catch { return 'Leite einen Verein: Geld, NLZ, Stadion'; }
}

export default function CareerHome({ onNew, onLoad, onNews, onReward, onProfile, onCasino, onShop, onDuels, onCollection, onBoss }: {
  onNew: () => void; onLoad: (c: Career) => void; onNews: () => void; onReward: (c: Career) => void; onProfile: () => void; onCasino: () => void; onShop: () => void; onDuels: () => void; onCollection: () => void; onBoss?: () => void;
}) {
  const club = useClub();
  const me = profileOf(club);
  const [saves, setSaves] = useState(listCareers);
  const [settings, setSettings] = useState(false);
  const [backup, setBackup] = useState(false);
  const [hof, setHof] = useState(false);
  const [list, setList] = useState(false);
  const [welcome, setWelcome] = useState<{ name: string; result: PackResult } | null>(null);
  const sorted = [...saves].sort((a, b) => b.updatedAt - a.updatedAt);
  const latest = sorted.find((c) => c.phase !== 'retired') ?? sorted[0];
  const pending = saves.find((c) => rewardPending(club, c));
  const removeAll = () => {
    const open = saves.filter((c) => rewardPending(club, c)).length;
    const warn = open ? `\n\nAchtung: Bei ${open} ${open === 1 ? 'Karriere' : 'Karrieren'} ist die Karriereende-Belohnung noch nicht abgeholt – sie geht verloren.` : '';
    if (!window.confirm(`${saves.length === 1 ? 'Deine Karriere' : `Alle ${saves.length} Karrieren`} löschen?\n\nDeine gesammelten Karten, Coins und Casino-Chips bleiben erhalten.${warn}`)) return;
    if (!window.confirm('Wirklich alle Karrieren löschen? Das lässt sich nicht rückgängig machen.')) return;
    deleteAllCareers();
    setSaves(listCareers());
    setList(false);
  };
  const remove = (c: Career) => {
    if (!window.confirm(`Karriere von ${c.player.name} wirklich löschen?`)) return;
    deleteCareer(c.id);
    setSaves(listCareers());
  };

  const prog = collectionProgress(club);
  const div = divisionOf(club);
  const daily = dailyView(club);
  const bonus = dailyBonus(club).ready;
  const free = !welcomeReady(club) && freePackReady(club);
  const claimGoals = () => {
    const r = claimDaily(getClubState());
    if (!r.coins && !r.chips) return;
    setClubState(r.club);
    sfx('fanfare');
  };
  const claimGoalPack = () => {
    const r = claimDailyBonus(getClubState());
    if (!r) return;
    setClubState(r.club);
    if (r.result.cards.length) setWelcome({ name: 'Tages-Pack', result: r.result });
    else sfx('fanfare');
  };
  const goTo: Record<DailyId, () => void> = { career: () => (latest && latest.phase !== 'retired' ? onLoad(latest) : onNew()), duel: onDuels, pack: onShop, casino: onCasino };

  return (
    <main className="hub ch ch3">
      <header className="ch-top">
        <button className="ch-profile" onClick={onProfile} aria-label={`Profil von ${me.name}`}>
          <Emblem emblem={me.emblem} color={me.color} size={36} />
          <span><strong>{me.name}</strong><small>{divName(div.div)}</small></span>
        </button>
        <span className="ch-wallet">
          <button className="ch-coins" onClick={onShop} aria-label={`${fmt(club.coins)} Coins – ${CARDS_FROM_CAREER_ONLY ? 'zur Sammlung' : 'zum Shop'}`}><Icon name="coin" size={16} />{short(club.coins)}</button>
          <button className="ch-chips" onClick={onCasino} aria-label={`${fmt(casinoOf(club).chips)} Chips – zum Casino`}><Icon name="dice" size={15} />{short(casinoOf(club).chips)}</button>
        </span>
        <button className="hub-icon ch-news" onClick={onNews} aria-label="Neuigkeiten" title="Neuigkeiten"><Icon name="news" size={20} /></button>
        <button className="hub-icon" onClick={() => setSettings(true)} aria-label="Einstellungen"><Icon name="gear" size={20} /></button>
      </header>

      {pending && (
        <button className="reward-call" onClick={() => onReward(pending)}>
          <Icon name="flag" size={20} /> Karriere von {pending.player.name} beendet – Belohnung abholen ›
        </button>
      )}

      {welcomeReady(club) && (
        <button className="ch-welcome" onClick={() => { const r = claimWelcome(getClubState()); if (r) { setClubState(r.club); setWelcome({ name: 'Willkommens-Pack', result: r.result }); } }}>
          <span className="ch-welcome-ic"><Icon name="pack" size={30} /></span>
          <span><b>Willkommens-Pack</b><small>Deine erste Elf – 11 Spieler, sofort aufgestellt</small></span>
          <em>Öffnen</em>
        </button>
      )}

      {/* Held: die Karriere – das Herz des Spiels */}
      <section className="ch3-hero">
        <span className="ch3-hero-bg" aria-hidden="true" />
        {latest ? (
          <>
            <span className="ch3-hero-ovr"><b>{latest.player.ovr}</b><small>{latest.player.position}</small></span>
            <span className="ch3-hero-text">
              <small>{latest.phase === 'retired' ? 'Letzte Karriere' : 'Deine Karriere'}</small>
              <b>{latest.player.name}</b>
              <span>{statusOf(latest)}</span>
            </span>
            <div className="ch3-hero-btns">
              <button className="btn primary big ch3-play" onClick={() => onLoad(latest)}><Icon name="ball" size={20} /> {latest.phase === 'retired' ? 'Ansehen' : 'Weiterspielen'}</button>
              <button className="btn secondary ch3-new ch-new" onClick={onNew} aria-label="Neue Karriere"><Icon name="plus" size={20} /></button>
            </div>
          </>
        ) : (
          <>
            <span className="ch3-hero-text"><small>Spielerkarriere</small><b>Vom Talent zur Legende</b><span>{CARDS_FROM_CAREER_ONLY ? 'Karten gibt es nur hier: Jede starke Saison bringt neue Karten für dein Team.' : 'Jede Saison bringt Coins für Packs, Duelle und Casino.'}</span></span>
            <div className="ch3-hero-btns"><button className="btn primary big ch3-play ch-new" onClick={onNew}><Icon name="plus" size={20} /> Karriere starten</button></div>
          </>
        )}
      </section>

      {/* Modi */}
      <div className="ch3-modes">
        <button className="ch3-mode m-duel" onClick={onDuels}>
          <span className="ch3-mode-ic"><Icon name="duel" size={26} /></span>
          <b>Duelle</b>
          <small>{divName(div.div)} · +{fmt(divReward(div.div))} pro Sieg</small>
        </button>
        {!CARDS_FROM_CAREER_ONLY && <button className="ch3-mode m-shop" onClick={onShop}>
          <span className="ch3-mode-ic"><Icon name="pack" size={26} /></span>
          <b>Shop</b>
          <small>{free ? 'Gratis-Pack wartet' : 'Packs & Pack der Woche'}</small>
          {free && <em className="ch3-badge">Gratis</em>}
        </button>}
        <button className="ch3-mode m-col" onClick={onCollection}>
          <span className="ch3-mode-ic"><Icon name="cards" size={26} /></span>
          <b>Sammlung</b>
          <small>{prog.have} / {prog.total} Karten</small>
          <span className="ch3-bar"><i style={{ width: `${Math.max(2, prog.percent)}%` }} /></span>
        </button>
        {onBoss && <button className="ch3-mode m-boss" onClick={onBoss}>
          <span className="ch3-mode-ic"><Icon name="money" size={26} /></span>
          <b>Vereinsboss</b>
          <small>{bossTeaser()}</small>
        </button>}
        <button className="ch3-mode m-casino" onClick={onCasino}>
          <span className="ch3-mode-ic"><Icon name="dice" size={26} /></span>
          <b>Casino</b>
          <small>Jackpot {fmt(casinoOf(club).jackpot)}</small>
          {bonus && <em className="ch3-badge">Bonus</em>}
        </button>
      </div>

      {/* Tagesziele */}
      <section className="ch3-goals" aria-label="Tagesziele">
        <header>
          <b><Icon name="target" size={18} /> Tagesziele</b>
          <small>{daily.tasks.filter((t) => t.done).length} / {daily.tasks.length} · alle schaffen = {CARDS_FROM_CAREER_ONLY ? `+${fmt(DAILY_BONUS_COINS)} Coins` : "Gold-Pack"}</small>
        </header>
        <ul>
          {daily.tasks.map((t) => (
            <li key={t.id} className={t.claimed ? 'claimed' : t.done ? 'done' : ''}>
              <button onClick={goTo[t.id]} disabled={t.claimed}>
                <span className="ch3-goal-ic"><Icon name={t.claimed || t.done ? 'check' : GOAL_ICON[t.id]} size={18} /></span>
                <span className="ch3-goal-text"><b>{t.text}</b><span className="ch3-bar"><i style={{ width: `${(t.have / t.need) * 100}%` }} /></span></span>
                <span className="ch3-goal-rw">{t.coins ? <><Icon name="coin" size={14} />{fmt(t.coins)}</> : <><Icon name="dice" size={14} />{fmt(t.chips)}</>}</span>
              </button>
            </li>
          ))}
        </ul>
        {daily.ready > 0 && <button className="btn primary ch3-claim" onClick={claimGoals}><Icon name="gift" size={18} /> {daily.ready === 1 ? 'Belohnung' : `${daily.ready} Belohnungen`} abholen</button>}
        {daily.bonusReady && <button className="btn primary ch3-claim gold" onClick={claimGoalPack}><Icon name={CARDS_FROM_CAREER_ONLY ? 'coin' : 'pack'} size={18} /> {CARDS_FROM_CAREER_ONLY ? `Bonus abholen (+${fmt(DAILY_BONUS_COINS)} Coins)` : 'Gold-Pack öffnen'}</button>}
        {daily.bonusTaken && <p className="ch3-goals-done">Alles geschafft – morgen gibt es neue Ziele.</p>}
      </section>

      <div className="ch3-more">
        {sorted.length > 0 && (
          <button className="ch-row" onClick={() => setList(true)}><Icon name="folder" size={20} /><span><b>Spielstände</b><small>{sorted.length} {sorted.length === 1 ? "Karriere" : "Karrieren"} gespeichert</small></span><Icon name="arrow" size={18} /></button>
        )}
        <button className="ch-row" onClick={() => setHof(true)}><Icon name="crown" size={20} /><span><b>Ruhmeshalle</b><small>Deine Karrieren im Vergleich, Bestwerte</small></span><Icon name="arrow" size={18} /></button>
        <button className="ch-row ch-news-row" onClick={onNews}><Icon name="news" size={20} /><span><b>Neuigkeiten</b><small>Was sich im Spiel geändert hat</small></span><Icon name="arrow" size={18} /></button>
        <button className="ch-row" onClick={() => setBackup(true)}><Icon name="cloud" size={20} /><span><b>Sichern & Laden</b><small>Spielstände exportieren und einspielen</small></span><Icon name="arrow" size={18} /></button>
      </div>
      <p className="hub-foot">Private Fan-Seite ohne Verbindung zu EA SPORTS. Werte sind eigene Schätzungen.</p>

      {hof && <HallOfFame onClose={() => setHof(false)} />}
      {list && (
        <div className="overlay" role="dialog" aria-modal="true" aria-label="Spielstände">
          <div className="overlay-inner">
            <header className="overlay-head"><button className="nav-back" onClick={() => setList(false)}>‹ Zurück</button></header>
            <h1 className="overlay-title">Spielstände</h1>
            <ul className="save-list">
              {sorted.map((c) => (
                <li key={c.id}>
                  <button className="save-main" onClick={() => onLoad(c)}>
                    <span className="save-ovr">{c.player.ovr}</span>
                    <span><strong>{c.player.name}</strong><small>{statusOf(c)}</small></span>
                  </button>
                  <button className="btn ghost small" onClick={() => remove(c)}>Löschen</button>
                </li>
              ))}
            </ul>
            {sorted.length > 0 && (
              <div className="save-all">
                <button className="btn danger" onClick={removeAll}><Icon name="close" size={16} /> Alle Karrieren löschen</button>
                <small>Deine Karten, Coins und Chips bleiben erhalten.</small>
              </div>
            )}
          </div>
        </div>
      )}
      <Suspense fallback={null}>
        {settings && (
          <Settings
            career={latest}
            onChange={(c) => { saveCareer(c); setSaves(listCareers()); }}
            onClose={() => setSettings(false)}
            onBackup={() => { setSettings(false); setBackup(true); }}
          />
        )}
        {backup && <Backup onClose={() => { setBackup(false); setSaves(listCareers()); }} />}
        {welcome && <PackOpen name={welcome.name} result={welcome.result} onClose={() => setWelcome(null)} onCollection={() => { setWelcome(null); onCollection(); }} />}
      </Suspense>
    </main>
  );
}
