import { noEmoji } from './Icon';
import { useRef, useState } from 'react';
import Icon from './Icon';
import { GREETING, RETIRED_IDS, UPDATES, type UpdateNote } from '../data/updates';
import Confetti from './Confetti';

const KEY = 'fc-seen-update';

const PINNED_KEY = 'fc-pinned-shown';
/** Angepinnte Neuigkeiten, die in diesem Spielstart noch nicht gezeigt wurden. */
function pinnedNow(): UpdateNote[] {
  try {
    if (sessionStorage.getItem(PINNED_KEY)) return [];
  } catch {
    // ohne Speicher: trotzdem zeigen
  }
  return UPDATES.filter((u) => u.pinned);
}

/** Welche Updates hat dieser Browser noch nicht gesehen? Beim allerersten Besuch nur das neueste. Angepinnte kommen bei jedem Start dazu. */
export function unseenUpdates(): UpdateNote[] {
  let seen: string | null = null;
  try {
    seen = localStorage.getItem(KEY);
  } catch {
    return [];
  }
  let list: UpdateNote[];
  if (!seen) list = UPDATES.slice(0, 1);
  else if (RETIRED_IDS.includes(seen)) list = [];
  else {
    const idx = UPDATES.findIndex((u) => u.id === seen);
    list = idx === -1 ? UPDATES.slice(0, 1) : UPDATES.slice(0, idx);
  }
  const pinned = pinnedNow().filter((p) => !list.includes(p));
  return [...pinned, ...list];
}

function markSeen() {
  try {
    sessionStorage.setItem(PINNED_KEY, '1');
  } catch {
    // egal
  }
  try {
    localStorage.setItem(KEY, UPDATES[0].id);
  } catch {
    // ohne Speicher erscheint das Banner beim nächsten Mal erneut
  }
}

/** Großes Update-Banner: „An Alle Ayris die das spielen!“ plus die Neuigkeiten. */
export default function UpdateBanner({ notes, onClose, onStore }: { notes: UpdateNote[]; onClose: () => void; onStore?: (code?: string) => void }) {
  const [i, setI] = useState(0);
  const [sound, setSound] = useState(false);
  const vid = useRef<HTMLVideoElement>(null);
  const note = notes[i];
  if (!note) return null;
  const close = () => {
    markSeen();
    onClose();
  };
  return (
    <div className="upd" role="dialog" aria-modal="true" aria-labelledby="upd-greeting">
      {!note.video && <Confetti pieces={60} />}
      <div className={`upd-card ${note.video ? 'has-video' : ''}`}>
        {note.video && (
          <div className="upd-video-wrap">
            <video key={note.video} ref={vid} className="upd-video" src={note.video} poster={note.poster} autoPlay muted={!sound} loop playsInline preload="auto" aria-label={note.imageAlt} />
            <button className="upd-sound" onClick={() => { const v = vid.current; setSound(!sound); if (v) { v.muted = sound; if (!sound) { v.currentTime = 0; void v.play().catch(() => {}); } } }} aria-label={sound ? 'Ton aus' : 'Ton an'}>
              <Icon name="music" size={16} />{sound ? 'Ton aus' : 'Ton an'}
            </button>
          </div>
        )}
        {note.image && !note.video && <img className="upd-image" src={note.image} alt={note.imageAlt ?? ''} width={960} height={540} decoding="async" />}
        <span className="upd-badge">Update · {note.date}</span>
        <h2 id="upd-greeting">{GREETING}</h2>
        <h3>{noEmoji(note.title)}</h3>
        <ul>
          {note.items.map((t) => <li key={t}>{noEmoji(t)}</li>)}
        </ul>
        {note.promo && (
          <div className="upd-promo">
            <span className="upd-promo-code"><small>Code</small><b>{note.promo.code}</b></span>
            <span className="upd-promo-text">{note.promo.text}</span>
            {onStore && <button className="btn primary upd-promo-btn" onClick={() => { markSeen(); onStore(note.promo!.code); }}>Zum Shop</button>}
          </div>
        )}
        <div className="upd-actions">
          {i + 1 < notes.length && <button className="btn secondary big" onClick={() => setI(i + 1)}>Ältere Neuigkeiten</button>}
          <button className="btn primary big" onClick={close}>Los geht’s!</button>
        </div>
        {notes.length > 1 && <small className="upd-count">{i + 1} / {notes.length}</small>}
      </div>
    </div>
  );
}
