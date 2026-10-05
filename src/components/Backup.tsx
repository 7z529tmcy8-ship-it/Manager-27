import { useRef, useState } from 'react';
import { backupText, describeBackup, parseBackup, restoreBackup, createBackup } from '../backup';

const fmt = (n: number) => n.toLocaleString('de-DE');

/** Spielstände sichern (Datei oder Text) und wieder einspielen. */
export default function Backup({ onClose }: { onClose: () => void }) {
  const [text, setText] = useState('');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const file = useRef<HTMLInputElement>(null);
  const now = describeBackup(createBackup());

  const download = () => {
    const blob = new Blob([backupText()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fc-karriere-sicherung-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setMsg({ ok: true, text: 'Sicherung heruntergeladen. Bewahr die Datei gut auf (z. B. in iCloud, Google Drive oder per Mail an dich selbst).' });
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(backupText());
      setMsg({ ok: true, text: 'Sicherung als Text kopiert – füg sie z. B. in deine Notizen ein.' });
    } catch {
      setText(backupText());
      setMsg({ ok: true, text: 'Kopieren ging nicht automatisch – der Text steht unten im Feld, markiere und kopiere ihn selbst.' });
    }
  };

  const restore = (raw: string) => {
    const b = parseBackup(raw);
    if (typeof b === 'string') {
      setMsg({ ok: false, text: b });
      return;
    }
    const d = describeBackup(b);
    if (!window.confirm(`Sicherung vom ${d.date} einspielen?\n${d.careers} Karriere(n), ${fmt(d.coins)} Coins.\n\nDeine aktuellen Daten in diesem Browser werden dabei ersetzt.`)) return;
    if (!restoreBackup(b)) {
      setMsg({ ok: false, text: 'Speichern im Browser ist fehlgeschlagen (privater Modus oder Speicher voll?).' });
      return;
    }
    window.location.reload();
  };

  const pickFile = (f: File | undefined) => {
    if (!f) return;
    f.text().then(restore, () => setMsg({ ok: false, text: 'Die Datei konnte nicht gelesen werden.' }));
  };

  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-label="Sichern und Laden">
      <div className="overlay-inner backup">
        <header className="overlay-head"><button className="nav-back" onClick={onClose}>‹ Zurück</button></header>
        <h1 className="overlay-title">💾 Sichern & Laden</h1>
        <p className="cs-sub">
          Deine Spielstände liegen nur in diesem Browser. Wird der Verlauf gelöscht, sind sie weg – sichere sie deshalb ab und zu.
          Mit der Sicherung kannst du auch auf einem anderen Gerät weiterspielen.
        </p>

        <section className="backup-box">
          <h3>Sichern</h3>
          <small className="muted">Aktuell: {now.careers} Karriere(n) · 🪙 {fmt(now.coins)} · Sammlung & Einstellungen</small>
          <div className="backup-btns">
            <button className="btn primary" onClick={download}>⬇️ Als Datei herunterladen</button>
            <button className="btn secondary" onClick={copy}>📋 Als Text kopieren</button>
          </div>
        </section>

        <section className="backup-box">
          <h3>Laden</h3>
          <small className="muted">Ersetzt alle Spieldaten in diesem Browser durch die Sicherung.</small>
          <div className="backup-btns">
            <button className="btn primary" onClick={() => file.current?.click()}>📂 Datei auswählen</button>
            <input ref={file} type="file" accept=".json,application/json,text/plain" hidden onChange={(e) => pickFile(e.target.files?.[0])} />
          </div>
          <textarea
            className="backup-text"
            placeholder="… oder den kopierten Sicherungs-Text hier einfügen"
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={4}
            spellCheck={false}
          />
          <button className="btn secondary" disabled={!text.trim()} onClick={() => restore(text)}>Text einspielen</button>
        </section>

        {msg && <p className={`cs-note ${msg.ok ? 'good' : 'bad'}`} role="status">{msg.text}</p>}
      </div>
    </div>
  );
}
