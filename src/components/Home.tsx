import { useState } from 'react';
import { getClub } from '../data/leagues';
import { currentClubId, seasonLabel } from '../game/player';
import { deleteCareer, listCareers } from '../game/storage';
import type { Career } from '../game/types';

interface Props {
  onNew: () => void;
  onFame: () => void;
  onLoad: (career: Career) => void;
}

export default function Home({ onNew, onFame, onLoad }: Props) {
  const [saves, setSaves] = useState(listCareers);

  const remove = (c: Career) => {
    if (!confirm(`Karriere von ${c.player.name} wirklich löschen?`)) return;
    deleteCareer(c.id);
    setSaves(listCareers());
  };

  return (
    <main className="home">
      <header className="hero">
        <div className="hero-badge">⚽</div>
        <h1>FC Karriere-Simulator</h1>
        <p>Simuliere die komplette Laufbahn eines Spielers – Saison für Saison, mit Entwicklung, Transfers und Leihen.</p>
        <div className="hero-actions">
          <button className="btn primary big" onClick={onNew}>Neue Karriere starten</button>
          {saves.some((c) => c.history.length > 0) && (
            <button className="btn big" onClick={onFame}>🏛️ Hall of Fame</button>
          )}
        </div>
      </header>

      {saves.length > 0 && (
        <section className="panel">
          <h2>Gespeicherte Karrieren</h2>
          <ul className="save-list">
            {saves.map((c) => (
              <li key={c.id}>
                <button className="save-main" onClick={() => onLoad(c)}>
                  <span className="save-ovr">{c.player.ovr}</span>
                  <span>
                    <strong>{c.player.name}</strong>
                    <small>
                      {c.phase === 'winter' ? '❄️ Winterpause · ' : ''}
                      {c.phase === 'retired'
                        ? `Karriere beendet · ${c.history.length} Saisons`
                        : `${getClub(currentClubId(c.player)).name} · Saison ${seasonLabel(c.year)} · ${c.player.age} Jahre`}
                    </small>
                  </span>
                </button>
                <button className="btn ghost small" onClick={() => remove(c)} aria-label="Löschen">Löschen</button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="disclaimer">
        Private Fan-Seite ohne Verbindung zu EA SPORTS. Vereinsstärken und Spielerwerte sind eigene Schätzungen
        (Stand 2025/26), keine offiziellen Ratings. Spielstände werden nur in diesem Browser gespeichert.
      </p>
    </main>
  );
}
