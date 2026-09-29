import { useMemo } from 'react';

const COLORS = ['#0071e3', '#eb6834', '#1baf7a', '#f5c542', '#e87ba4', '#9085e9'];

/** Leichtes Konfetti aus CSS-Animationen – bei „weniger Bewegung“ ausgeblendet. */
export default function Confetti({ pieces = 70 }: { pieces?: number }) {
  const items = useMemo(
    () =>
      Array.from({ length: pieces }, (_, i) => ({
        left: Math.random() * 100,
        delay: Math.random() * 0.6,
        duration: 1.8 + Math.random() * 1.4,
        rotate: Math.random() * 360,
        color: COLORS[i % COLORS.length],
        w: 6 + Math.random() * 6,
      })),
    [pieces],
  );
  return (
    <div className="confetti" aria-hidden="true">
      {items.map((c, i) => (
        <span
          key={i}
          style={{
            left: `${c.left}%`, background: c.color, width: c.w, height: c.w * 0.45,
            animationDelay: `${c.delay}s`, animationDuration: `${c.duration}s`, transform: `rotate(${c.rotate}deg)`,
          }}
        />
      ))}
    </div>
  );
}
