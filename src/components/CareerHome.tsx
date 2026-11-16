import { Suspense, lazy, useState } from 'react';
import { getClub } from '../data/leagues';
import { creditCareer, rewardPending } from '../game/club';
import { currentClubId, seasonLabel } from '../game/player';
import { profileOf } from '../game/profile';
import { deleteCareer, listCareers, saveCareer } from '../game/storage';
import type { Career } from '../game/types';
import { getClubState, setClubState, useClub } from '../clubStore';
import Icon from './Icon';
import { Emblem } from './ProfilePage';

const Settings = lazy(() => import('./Settings'));
const Backup = lazy(() => import('./Backup'));

const statusOf = (c: Career) =>
  c.phase === 'retired' ? `Karriere beendet · ${c.history.length} ${c.history.length === 1 ? 'Saison' : 'Saisons'}` : `${getClub(currentClubId(c.player)).name} · ${seasonLabel(c.year)} · ${c.player.age} Jahre`;

/** Startseite = Karriere: weiterspielen, neue Karriere, alle Spielstände. */
export default function CareerHome({ onNew, onLoad, onNews, onReward, onProfile }: {
  onNew: () => void; onLoad: (c: Career) => void; onNews: () => void; onReward: (c: Career) => void; onProfile: () => void;
}) {
  const club = useClub();
  const me = profileOf(club);
  const [saves, setSaves] = useState(listCareers);
  const [settings, setSettings] = useState(false);
  const [backup, setBackup] = useState(false);
  const [list, setList] = useState(false);
  const sorted = [...saves].sort((a, b) => b.updatedAt - a.updatedAt);
  const latest = sorted.find((c) => c.phase !== 'retired') ?? sorted[0];
  const pending = saves.find((c) => rewardPending(club, c));
  const remove = (c: Career) => {
    if (!window.confirm(`Karriere von ${c.player.name} wirklich löschen?`)) return;
    deleteCareer(c.id);
    setSaves(listCareers());
  };

  return (
    <main className="hub ch">
      <header className="ch-top">
        <button className="ch-profile" onClick={onProfile} aria-label={`Profil von ${me.name}`}>
          <Emblem emblem={me.emblem} color={me.color} size={40} />
          <strong>{me.name}</strong>
        </button>
        <button className="hub-icon" onClick={onNews} aria-label="Neuigkeiten" title="Neuigkeiten"><Icon name="news" size={20} /></button>
        <button className="hub-icon" onClick={() => setSettings(true)} aria-label="Einstellungen"><Icon name="gear" size={20} /></button>
      </header>
      <h1 className="ch-title">Karriere</h1>

      {pending && (
        <button className="reward-call" onClick={() => onReward(pending)}>
          <Icon name="flag" size={20} /> Karriere von {pending.player.name} beendet – Belohnung abholen ›
        </button>
      )}

      {latest ? (
        <button className="ch-hero" onClick={() => onLoad(latest)}>
          <span className="ch-hero-ovr"><small>OVR</small>{latest.player.ovr}</span>
          <span className="ch-hero-text">
            <small>{latest.phase === 'retired' ? 'Letzte Karriere' : 'Weiterspielen'}</small>
            <b>{latest.player.name}</b>
            <span>{statusOf(latest)}</span>
          </span>
          <Icon name="arrow" size={24} />
        </button>
      ) : (
        <div className="ch-empty">
          <b>Vom Talent zur Legende</b>
          <span>Starte deine erste Karriere – jeder Spieler kommt später als Karte in dein Team.</span>
        </div>
      )}
      <button className="btn primary big ch-new" onClick={onNew}><Icon name="plus" size={20} /> Neue Karriere</button>

      {sorted.length > 1 && (
        <button className="ch-row" onClick={() => setList(true)}><Icon name="folder" size={20} /><span><b>Spielstände</b><small>{sorted.length} Karrieren gespeichert</small></span><Icon name="arrow" size={18} /></button>
      )}
      <button className="ch-row" onClick={() => setBackup(true)}><Icon name="cloud" size={20} /><span><b>Sichern & Laden</b><small>Spielstände exportieren und einspielen</small></span><Icon name="arrow" size={18} /></button>
      <p className="hub-foot">Private Fan-Seite ohne Verbindung zu EA SPORTS. Werte sind eigene Schätzungen.</p>

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
          </div>
        </div>
      )}
      <Suspense fallback={null}>
        {settings && (
          <Settings
            career={latest}
            onChange={(c) => { const res = creditCareer(getClubState(), c); if (res.gained > 0 || res.icon) setClubState(res.club); saveCareer(c); setSaves(listCareers()); }}
            onClose={() => setSettings(false)}
          />
        )}
        {backup && <Backup onClose={() => { setBackup(false); setSaves(listCareers()); }} />}
      </Suspense>
    </main>
  );
}
