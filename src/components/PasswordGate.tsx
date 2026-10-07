import { useState, type FormEvent, type ReactNode } from 'react';
import SecretPage from './SecretPage';

// Hinweis: Das ist nur eine Sperre im Browser. Wer den Quellcode liest, sieht Passwort und Geheimcode –
// für eine private Spiel-Seite reicht das, echte Geheimnisse gehören hier nicht rein.
const PASSWORD = '123';
/** Öffnet statt des Spiels die geheime Seite (Groß-/Kleinschreibung egal). */
const SECRET_CODE = 'larp';
export const UNLOCK_KEY = 'fc-manager-unlocked';

// Entsperrt bleibt die Seite nur, solange der Tab offen ist – so kommt man beim nächsten Öffnen
// wieder am Eingabefeld vorbei (und kann dort auch den Geheimcode eingeben).
function isUnlocked(): boolean {
  try {
    return sessionStorage.getItem(UNLOCK_KEY) === '1';
  } catch {
    return false;
  }
}

type View = 'gate' | 'game' | 'secret';

export default function PasswordGate({ children }: { children: ReactNode }) {
  const [view, setView] = useState<View>(() => (isUnlocked() ? 'game' : 'gate'));
  const [value, setValue] = useState('');
  const [wrong, setWrong] = useState(false);

  if (view === 'game') return <>{children}</>;
  if (view === 'secret') return <SecretPage onLeave={() => setView('gate')} />;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const input = value.trim();
    setValue('');
    if (input.toLowerCase() === SECRET_CODE) {
      setView('secret');
      return;
    }
    if (input !== PASSWORD) {
      setWrong(true);
      return;
    }
    try {
      sessionStorage.setItem(UNLOCK_KEY, '1');
    } catch {
      // Ohne Speicher muss man das Passwort eben bei jedem Neuladen eingeben.
    }
    setView('game');
  };

  return (
    <main className="gate">
      <form className="gate-box" onSubmit={submit}>
        <p className="eyebrow">Privat</p>
        <img className="gate-logo" src="/logo.webp" alt="" width="640" height="624" />
        <h1>Manager Sim</h1>
        <label htmlFor="gate-pw" className="muted">Passwort</label>
        <input
          id="gate-pw"
          type="password"
          autoComplete="off"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          autoFocus
          value={value}
          className={wrong ? 'wrong' : ''}
          onChange={(e) => { setValue(e.target.value); setWrong(false); }}
        />
        {wrong && <p className="gate-error">Falsches Passwort.</p>}
        <button type="submit" className="btn primary big">Öffnen</button>
      </form>
    </main>
  );
}
