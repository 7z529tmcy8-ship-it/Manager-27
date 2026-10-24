import { useState, type FormEvent, type ReactNode } from 'react';
import SecretPage from './SecretPage';

// Hinweis: Das ist nur eine Sperre im Browser. Wer den Quellcode liest, sieht Passwort und Geheimcode –
// für eine private Spiel-Seite reicht das, echte Geheimnisse gehören hier nicht rein.
/** Entwickler-Code: Während des Entwicklungs-Updates kommt man nur damit ins Spiel. */
const PASSWORD = '12345';
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
  const [devOpen, setDevOpen] = useState(false);

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
      // Ohne Speicher muss man den Code eben bei jedem Neuladen eingeben.
    }
    setView('game');
  };

  return (
    <main className="gate maint">
      <div className="maint-box">
        <img className="gate-logo maint-logo" src="/logo.webp" alt="Manager Sim" width="640" height="624" />
        <span className="maint-kicker">Entwicklungs-Update</span>
        <h1>Wir bauen gerade um</h1>
        <p className="maint-text">Manager Sim bekommt gerade ein großes Update. Das Spiel ist deshalb kurz nicht erreichbar – schau bald wieder vorbei.</p>
        <div className="maint-bar" aria-hidden="true"><i /></div>
        <p className="maint-status"><span className="maint-dot" aria-hidden="true" />Update wird eingespielt …</p>

        {!devOpen ? (
          <button type="button" className="maint-dev-link" onClick={() => setDevOpen(true)}>Entwickler-Zugang</button>
        ) : (
          <form className="maint-dev" onSubmit={submit}>
            <label htmlFor="gate-pw">Entwickler-Code</label>
            <div className="maint-dev-row">
              <input
                id="gate-pw"
                type="password"
                inputMode="numeric"
                autoComplete="off"
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
                autoFocus
                value={value}
                className={wrong ? 'wrong' : ''}
                onChange={(e) => { setValue(e.target.value); setWrong(false); }}
              />
              <button type="submit" className="btn primary">Rein</button>
            </div>
            {wrong && <p className="gate-error">Falscher Code.</p>}
          </form>
        )}
      </div>
    </main>
  );
}
