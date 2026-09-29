import Terminal from '../terminal/Terminal';

/**
 * Die geheime Seite – erreichbar nur über den Geheimcode am Eingang.
 * Komplett unabhängig vom Spiel: aktuell das ETF-„Larp-Terminal“.
 */
export default function SecretPage({ onLeave }: { onLeave: () => void }) {
  return <Terminal onExit={onLeave} />;
}
