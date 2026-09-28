import type { GameEvent } from '../game/types';

export default function EventList({ events, title = 'Ereignisse' }: { events: GameEvent[]; title?: string }) {
  if (!events.length) return null;
  return (
    <section className="events">
      <h3>{title}</h3>
      <div className="event-grid">
        {events.map((e, i) => (
          <article key={i} className={`event ${e.tone}`}>
            <header>
              <span aria-hidden="true">{e.tone === 'good' ? '▲' : '▼'}</span>
              <strong>{e.title}</strong>
              <small>{e.half === 1 ? 'Hinrunde' : 'Rückrunde'}</small>
            </header>
            <p>{e.text}</p>
            <span className="event-effect">{e.effect}</span>
          </article>
        ))}
      </div>
    </section>
  );
}
