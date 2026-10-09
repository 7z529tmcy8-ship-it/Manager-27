/** Halloween-Deko: fliegende Fledermäuse und Nebel am Rand. Nur sichtbar, wenn <html> die Klasse „halloween“ hat. */
const BAT = 'M12 7c1.2-2 3.6-3 6-2.4-1.4.6-2.1 1.7-2 3.1 1.5-.9 3.4-.7 4.7.5-1.7 0-3 .7-3.6 2.1-1.7-.6-3.5-.1-4.7 1.2L12 13l-.4-1.5c-1.2-1.3-3-1.8-4.7-1.2-.6-1.4-1.9-2.1-3.6-2.1 1.3-1.2 3.2-1.4 4.7-.5.1-1.4-.6-2.5-2-3.1 2.4-.6 4.8.4 6 2.4z';
export default function HalloweenDecor() {
  return (
    <div className="hw-decor" aria-hidden="true">
      {[0, 1, 2, 3, 4].map((i) => (
        <svg key={i} className={`hw-bat b${i}`} viewBox="0 0 24 16"><path d={BAT} /></svg>
      ))}
      <div className="hw-fog" />
    </div>
  );
}
