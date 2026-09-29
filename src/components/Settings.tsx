import { useEffect } from 'react';
import { DIFFICULTIES, PRESS_FREQUENCIES, setCareerSettings, settingsOf } from '../game/difficulty';
import type { Career, Difficulty, PressFrequency } from '../game/types';
import { UNLOCK_KEY } from './PasswordGate';
import { updateSettings, useSettings, type AppSettings } from '../settings';

interface Props {
  /** Ohne Karriere (z. B. im Startmenü) gibt es nur die Geräte-Einstellungen. */
  career?: Career;
  onChange?: (c: Career) => void;
  onClose: () => void;
}

function Choice<T extends string>({ label, value, options, onPick, hint }: { label: string; value: T; options: [T, string][]; onPick: (v: T) => void; hint?: string }) {
  return (
    <div className="setting">
      <span className="setting-label">{label}</span>
      <div className="segmented setting-seg" role="radiogroup" aria-label={label}>
        {options.map(([id, text]) => (
          <button key={id} role="radio" aria-checked={value === id} className={value === id ? 'active' : ''} onClick={() => onPick(id)}>
            {text}
          </button>
        ))}
      </div>
      {hint && <p className="hint">{hint}</p>}
    </div>
  );
}

function Toggle({ label, checked, onToggle, hint }: { label: string; checked: boolean; onToggle: () => void; hint?: string }) {
  return (
    <div className="setting setting-row">
      <span className="grow">
        <span className="setting-label">{label}</span>
        {hint && <p className="hint">{hint}</p>}
      </span>
      <button role="switch" aria-checked={checked} aria-label={label} className={`switch ${checked ? 'on' : ''}`} onClick={onToggle}>
        <span />
      </button>
    </div>
  );
}

export default function Settings({ career, onChange, onClose }: Props) {
  const app = useSettings();
  const cs = career ? settingsOf(career) : null;
  const set = (patch: Partial<AppSettings>) => updateSettings(patch);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const lock = () => {
    if (!confirm('Seite auf diesem Gerät wieder mit Passwort sperren?')) return;
    try {
      sessionStorage.removeItem(UNLOCK_KEY);
    } catch {
      // egal – dann bleibt sie eben offen
    }
    location.reload();
  };

  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-label="Einstellungen">
      <div className="overlay-inner">
        <header className="overlay-head">
          <button className="nav-back" onClick={onClose}>‹ Zurück</button>
        </header>
        <h1 className="overlay-title">Einstellungen</h1>

        {career && cs && onChange && (
          <section className="panel">
            <h2>Diese Karriere</h2>
            <Choice<Difficulty>
              label="Schwierigkeit"
              value={cs.difficulty}
              options={(Object.keys(DIFFICULTIES) as Difficulty[]).map((d) => [d, DIFFICULTIES[d].label])}
              onPick={(difficulty) => onChange(setCareerSettings(career, { difficulty }))}
              hint={DIFFICULTIES[cs.difficulty].hint}
            />
            <Choice<PressFrequency>
              label="Pressekonferenzen"
              value={cs.press}
              options={(Object.keys(PRESS_FREQUENCIES) as PressFrequency[]).map((f) => [f, PRESS_FREQUENCIES[f].label])}
              onPick={(press) => onChange(setCareerSettings(career, { press }))}
              hint="Wie oft dich die Presse zwischen den Etappen einlädt."
            />
          </section>
        )}

        <section className="panel">
          <h2>Dieses Gerät</h2>
          <Choice<AppSettings['theme']>
            label="Design"
            value={app.theme}
            options={[['auto', 'Automatisch'], ['light', 'Hell'], ['dark', 'Dunkel']]}
            onPick={(theme) => set({ theme })}
          />
          <Toggle label="Animationen" checked={app.animations} onToggle={() => set({ animations: !app.animations })} hint="Walzen, Konfetti, Hochzählen und Karten-Zoom." />
          <Toggle label="Casino anzeigen" checked={app.casino} onToggle={() => set({ casino: !app.casino })} hint="Blendet den Glückspalast im Spiel und auf der Karte aus." />
          <div className="setting setting-row">
            <span className="grow"><span className="setting-label">Passwort-Sperre</span></span>
            <button className="btn secondary small" onClick={lock}>Wieder sperren</button>
          </div>
        </section>
      </div>
    </div>
  );
}
