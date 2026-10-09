import { useState } from 'react';

/**
 * Die geheime Seite – erreichbar nur über den Geheimcode am Eingang.
 * Komplett unabhängig vom Spiel: ein kleines Menü mit eigenständigen Spielen (je HTML/CSS/JS in public/).
 */
const GAMES = [
  { id: 'flavio', title: 'Onkel Flávio', text: 'Vom Läufer in Kreuzberg nach oben – Kiez-Spiel auf dem alten Handy.', path: 'flavio/index.html', cls: 'g-flavio' },
  { id: 'kronen', title: 'Kronenkampf', text: 'Echtzeit-Kartenduell: Elixier sammeln, Truppen schicken, Türme stürzen.', path: 'kronen/index.html', cls: 'g-kronen' },
] as const;

export default function SecretPage({ onLeave }: { onLeave: () => void }) {
  const [game, setGame] = useState<(typeof GAMES)[number] | null>(null);
  return (
    <div className="secret-frame">
      <button className="secret-leave" onClick={() => (game ? setGame(null) : onLeave())}>‹ {game ? 'Spiele' : 'Verlassen'}</button>
      {game ? (
        <iframe src={`${import.meta.env.BASE_URL}${game.path}`} title={game.title} />
      ) : (
        <div className="secret-menu">
          <h1>Spielhalle</h1>
          {GAMES.map((g) => (
            <button key={g.id} className={`secret-game ${g.cls}`} onClick={() => setGame(g)}>
              <strong>{g.title}</strong>
              <span>{g.text}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
