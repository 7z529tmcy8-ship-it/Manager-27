import { useState } from 'react';
import { getClub } from '../data/leagues';
import { CARD_POOL, careerCard } from '../game/club';
import { currentClubId, seasonLabel } from '../game/player';
import { deleteCareer, listCareers } from '../game/storage';
import type { Career } from '../game/types';
import { useClub } from '../clubStore';
import Backup from './Backup';
import Settings from './Settings';
import UtCard from './UtCard';

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
}

const fmtCoins = (n: number) => n.toLocaleString('de-DE');

/** Hauptmenü im Stil eines Sammelkarten-Hubs: große Kacheln, Coins oben, die eigene Karte im Mittelpunkt. */
export default function Hub({ onNews, onNew, onLoad, onStore, onCollection, onTeam, onTrade, onDuels, onSbc, onFame, onAchievements }: Props) {
  const club = useClub();
  const [saves, setSaves] = useState(listCareers);
  const [showSaves, setShowSaves] = useState(false);
  const [settings, setSettings] = useState(false);
  const [backup, setBackup] = useState(false);
  const latest = [...saves].sort((a, b) => b.updatedAt - a.updatedAt)[0];
  const owned = Object.keys(club.cards).length + club.specials.length;
  const hasHistory = saves.some((c) => c.history.length > 0);

  const remove = (c: Career) => {
    if (!confirm(`Karriere von ${c.player.name} wirklich löschen?`)) return;
    deleteCareer(c.id);
    setSaves(listCareers());
  };

  return (
    <main className="hub">
      <header className="hub-top">
        <img className="hub-logo" src="/logo.webp" alt="Manager Sim" width="640" height="624" />
        <span className="hub-coins" title="Coins – verdienst du im Karrieremodus">🪙 {fmtCoins(club.coins)}</span>
        <button className="hub-icon" onClick={onNews} aria-label="Neuigkeiten" title="Neuigkeiten">📣</button>
        <button className="hub-icon" onClick={() => setSettings(true)} aria-label="Einstellungen">⚙️</button>
      </header>

      <div className="hub-grid">
        <section className="hub-tile hero" onClick={() => (latest ? onLoad(latest) : onNew())} role="button" tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && (latest ? onLoad(latest) : onNew())}>
          {latest ? (
            <>
              <UtCard card={careerCard(latest)} size="lg" shine={latest.player.ovr >= 85 || latest.phase === 'retired'} />
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

        <Tile icon="⚽" title="Neue Karriere" sub="Eigener Spieler, Profi, Legende oder zweite Chance" onClick={onNew} />
        <Tile icon="🎁" title="Store" sub={club.welcomeClaimed ? 'Packs mit Coins öffnen' : 'Gratis-Pack wartet!'} badge={!club.welcomeClaimed ? '1' : undefined} onClick={onStore} accent />
        <Tile icon="🗂️" title="Sammlung" sub={`${owned} von ${CARD_POOL.length}+ Karten`} onClick={onCollection} />
        <Tile icon="🛡️" title="Mein Team" sub="Aufstellung und Freunde-Duelle" onClick={onTeam} />
        <Tile icon="⚔️" title="Duelle" sub={`Stufe ${club.duelLevel} · ${club.duels.w} Siege`} onClick={onDuels} />
        <Tile icon="🧩" title="SBC" sub="Legendäre Momente 91–93 und Pack-Tausche" onClick={onSbc} />
        <Tile icon="🔄" title="Tauschbörse" sub="Karten mit echten Spielern tauschen – 100 % fair*" onClick={onTrade} />
        <Tile icon="🏠" title="Spielstände" sub={`${saves.length} gespeichert`} onClick={() => setShowSaves(true)} disabled={!saves.length} />
        <Tile icon="🏆" title="Erfolge" sub="Karriereziele" onClick={onAchievements} disabled={!saves.length} />
        <Tile icon="🏛️" title="Hall of Fame" sub="Deine besten Karrieren" onClick={onFame} disabled={!hasHistory} />
        <Tile icon="💾" title="Sichern & Laden" sub="Spielstände exportieren und wieder einspielen" onClick={() => setBackup(true)} />
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
      {settings && <Settings onClose={() => setSettings(false)} />}
      {backup && <Backup onClose={() => setBackup(false)} />}
    </main>
  );
}

function Tile({ icon, title, sub, onClick, disabled, badge, accent }: { icon: string; title: string; sub: string; onClick: () => void; disabled?: boolean; badge?: string; accent?: boolean }) {
  return (
    <button className={`hub-tile ${accent ? 'accent' : ''}`} onClick={onClick} disabled={disabled}>
      <span className="hub-tile-icon" aria-hidden="true">{icon}</span>
      <strong>{title}</strong>
      <small>{sub}</small>
      {badge && <span className="hub-badge">{badge}</span>}
    </button>
  );
}
