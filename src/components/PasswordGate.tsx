import { useState, type FormEvent, type ReactNode } from 'react';

// Hinweis: Das ist nur eine Sperre im Browser. Wer den Quellcode liest, sieht das Passwort –
// für eine private Spiel-Seite reicht das, echte Geheimnisse gehören hier nicht rein.
const PASSWORD = '123';
const KEY = 'fc-manager-unlocked';

function isUnlocked(): boolean {
  try {
    return localStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
}

export default function PasswordGate({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(isUnlocked);
  const [value, setValue] = useState('');
  const [wrong, setWrong] = useState(false);

  if (open) return <>{children}</>;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (value !== PASSWORD) {
      setWrong(true);
      setValue('');
      return;
    }
    try {
      localStorage.setItem(KEY, '1');
    } catch {
      // Ohne Speicher muss man das Passwort eben jedes Mal eingeben.
    }
    setOpen(true);
  };

  return (
    <main className="gate">
      <form className="gate-box" onSubmit={submit}>
        <p className="eyebrow">Privat</p>
        <h1>Karriere-Manager</h1>
        <label htmlFor="gate-pw" className="muted">Passwort</label>
        <input
          id="gate-pw"
          type="password"
          inputMode="numeric"
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
