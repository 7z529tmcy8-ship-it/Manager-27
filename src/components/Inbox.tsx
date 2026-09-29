import { useEffect } from 'react';
import { INBOX_ICONS, markAllRead, markRead } from '../game/inbox';
import type { Career, InboxItem } from '../game/types';

type Target = NonNullable<InboxItem['action']>;

interface Props {
  career: Career;
  onChange: (c: Career) => void;
  onClose: () => void;
  onOpen: (target: Target) => void;
}

const ACTION_LABEL: Record<Target, string> = {
  season: 'Zur Saison',
  transfers: 'Zu den Transfers',
  career: 'Zur Karriere',
  news: 'Zu den News',
};

/** Postfach: alle persönlichen Nachrichten an einem Ort, wie im Football Manager. */
export default function Inbox({ career, onChange, onClose, onOpen }: Props) {
  const items = career.inbox ?? [];
  const unread = items.filter((m) => !m.read).length;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const open = (m: InboxItem) => {
    onChange(markRead(career, m.id));
    if (m.action) {
      onOpen(m.action);
      onClose();
    }
  };

  // Nach Saison gruppieren, neueste zuerst (das Postfach ist bereits so sortiert).
  const groups: { season: string; items: InboxItem[] }[] = [];
  for (const m of items) {
    const g = groups[groups.length - 1];
    if (g && g.season === m.season) g.items.push(m);
    else groups.push({ season: m.season, items: [m] });
  }

  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-label="Postfach">
      <div className="overlay-inner">
        <header className="overlay-head">
          <button className="nav-back" onClick={onClose}>‹ Zurück</button>
          {unread > 0 && (
            <button className="btn link small" onClick={() => onChange(markAllRead(career))}>Alle gelesen</button>
          )}
        </header>
        <h1 className="overlay-title">Postfach</h1>
        <p className="muted">{unread ? `${unread} ungelesen` : 'Alles gelesen.'}</p>

        {career.decision && (
          <button className="inbox-item pinned" onClick={() => { onOpen('season'); onClose(); }}>
            <span className="inbox-icon">{career.decision.id === 'press' ? '🎙️' : '🤔'}</span>
            <span className="grow">
              <strong>Offen: {career.decision.title}</strong>
              <small>Muss beantwortet werden, bevor es weitergeht.</small>
            </span>
            <span className="inbox-dot" aria-label="offen" />
          </button>
        )}

        {items.length === 0 && <div className="panel empty">Noch keine Nachrichten.</div>}

        {groups.map((g) => (
          <section key={g.season} className="inbox-group">
            <h2 className="inbox-season">Saison {g.season}</h2>
            <ul className="inbox-list">
              {g.items.map((m) => (
                <li key={m.id}>
                  <button className={`inbox-item ${m.read ? 'read' : ''}`} onClick={() => open(m)}>
                    <span className="inbox-icon">{INBOX_ICONS[m.kind]}</span>
                    <span className="grow">
                      <strong>{m.title}</strong>
                      <small>{m.text}</small>
                      {m.action && <span className="inbox-action">{ACTION_LABEL[m.action]} ›</span>}
                    </span>
                    {!m.read && <span className="inbox-dot" aria-label="ungelesen" />}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
