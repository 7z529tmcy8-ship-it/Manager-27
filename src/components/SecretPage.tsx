/**
 * Die geheime Seite – erreichbar nur über den Geheimcode am Eingang.
 * Komplett unabhängig vom Spiel: zeigt den Retro-Tycoon „LAB BOSS“,
 * der als eigenständige Seite (HTML/CSS/JS) in public/lab/ liegt.
 */
export default function SecretPage({ onLeave }: { onLeave: () => void }) {
  return (
    <div className="secret-frame">
      <button className="secret-leave" onClick={onLeave}>‹ Verlassen</button>
      <iframe src={`${import.meta.env.BASE_URL}lab/index.html`} title="LAB BOSS" />
    </div>
  );
}
