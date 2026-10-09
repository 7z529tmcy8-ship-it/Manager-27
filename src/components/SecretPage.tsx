/**
 * Die geheime Seite – erreichbar nur über den Geheimcode am Eingang.
 * Komplett unabhängig vom Spiel: zeigt „Onkel Flávio“, die Musikkarriere auf dem Handy,
 * die als eigenständige Seite (HTML/CSS/JS) in public/flavio/ liegt.
 */
export default function SecretPage({ onLeave }: { onLeave: () => void }) {
  return (
    <div className="secret-frame">
      <button className="secret-leave" onClick={onLeave}>‹ Verlassen</button>
      <iframe src={`${import.meta.env.BASE_URL}flavio/index.html`} title="Onkel Flávio" />
    </div>
  );
}
