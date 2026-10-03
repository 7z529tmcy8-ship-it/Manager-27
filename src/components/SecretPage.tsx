/**
 * Die geheime Seite – erreichbar nur über den Geheimcode am Eingang.
 * Komplett unabhängig vom Spiel: zeigt den Rapper-Karriere-Simulator „Homestudio Hustle“,
 * der als eigenständige Seite (HTML/CSS/JS) in public/rapper/ liegt.
 */
export default function SecretPage({ onLeave }: { onLeave: () => void }) {
  return (
    <div className="secret-frame">
      <button className="secret-leave" onClick={onLeave}>‹ Verlassen</button>
      <iframe src={`${import.meta.env.BASE_URL}rapper/index.html`} title="Homestudio Hustle" />
    </div>
  );
}
