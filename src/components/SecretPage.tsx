/**
 * Die geheime Seite – erreichbar nur über den Geheimcode am Eingang.
 * Komplett unabhängig vom Spiel: Hier kommt später beliebiger eigener Inhalt hin.
 */
export default function SecretPage({ onLeave }: { onLeave: () => void }) {
  return (
    <main className="secret">
      <div className="secret-inner">
        <p className="eyebrow">Zugang gewährt</p>
        <h1>Die geheime Seite</h1>
        <p className="secret-sub">Du hast den richtigen Code gefunden. Hier entsteht bald etwas ganz anderes.</p>
        <div className="secret-card">
          <span className="secret-lock" aria-hidden="true">🔓</span>
          <p>Platz für eigenen Inhalt – Texte, Bilder, ein Spiel, eine Liste, was immer du willst.</p>
        </div>
        <button className="btn secondary big" onClick={onLeave}>Verlassen</button>
      </div>
    </main>
  );
}
