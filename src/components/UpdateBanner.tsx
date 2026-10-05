import { useState } from 'react';
import { GREETING, UPDATES, type UpdateNote } from '../data/updates';
import Confetti from './Confetti';

const KEY = 'fc-seen-update';

/** Welche Updates hat dieser Browser noch nicht gesehen? Beim allerersten Besuch nur das neueste. */
export function unseenUpdates(): UpdateNote[] {
  let seen: string | null = null;
  try {
    seen = localStorage.getItem(KEY);
  } catch {
    return [];
  }
  if (!seen) return UPDATES.slice(0, 1);
  const idx = UPDATES.findIndex((u) => u.id === seen);
  return idx === -1 ? UPDATES.slice(0, 1) : UPDATES.slice(0, idx);
}

function markSeen() {
  try {
    localStorage.setItem(KEY, UPDATES[0].id);
  } catch {
    // ohne Speicher erscheint das Banner beim nächsten Mal erneut
  }
}

/** Großes Update-Banner: „An Alle Ayris die das spielen!“ plus die Neuigkeiten. */
export default function UpdateBanner({ notes, onClose }: { notes: UpdateNote[]; onClose: () => void }) {
  const [i, setI] = useState(0);
  const note = notes[i];
  if (!note) return null;
  const close = () => {
    markSeen();
    onClose();
  };
  return (
    <div className="upd" role="dialog" aria-modal="true" aria-labelledby="upd-greeting">
      <Confetti pieces={60} />
      <div className="upd-card">
        <span className="upd-badge">📣 Update · {note.date}</span>
        <h2 id="upd-greeting">{GREETING}</h2>
        <h3>{note.title}</h3>
        <ul>
          {note.items.map((t) => <li key={t}>{t}</li>)}
        </ul>
        <div className="upd-actions">
          {i + 1 < notes.length && <button className="btn secondary big" onClick={() => setI(i + 1)}>Ältere Neuigkeiten</button>}
          <button className="btn primary big" onClick={close}>Los geht’s!</button>
        </div>
        {notes.length > 1 && <small className="upd-count">{i + 1} / {notes.length}</small>}
      </div>
    </div>
  );
}
