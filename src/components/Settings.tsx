import { useEffect, useState } from 'react';
import { getClubState, setClubState, useClub } from '../clubStore';
import { INFINITE_COINS, devAllCards, devCoins, devLevels, devMaxCards, devOvr, isDevCode } from '../game/dev';
import { DIFFICULTIES, setCareerSettings, settingsOf } from '../game/difficulty';
import type { Career, Difficulty } from '../game/types';
import { UNLOCK_KEY } from './PasswordGate';
import { updateSettings, useSettings, type AppSettings } from '../settings';
import { play } from '../sound';

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
          </section>
        )}

        <section className="panel">
          <h2>Dieses Gerät</h2>
          <Choice<AppSettings['theme']>
            label="Design"
            value={app.theme}
            options={[['arena', 'Arena'], ['auto', 'Auto'], ['light', 'Hell'], ['dark', 'Dunkel']]}
            onPick={(theme) => set({ theme })}
          />
          <Toggle label="Animationen" checked={app.animations} onToggle={() => set({ animations: !app.animations })} hint="Pack-Öffnung, Konfetti und Hochzählen." />
          <Toggle label="Sounds" checked={app.sound} onToggle={() => { set({ sound: !app.sound }); if (!app.sound) setTimeout(() => play('coin'), 30); }} hint="Klicks, Coins, Pack-Öffnung, Pfiff, Fanfare bei Titeln." />
          {app.sound && (
            <Choice<string>
              label="Lautstärke"
              value={String(app.volume)}
              options={[['0.3', 'Leise'], ['0.6', 'Mittel'], ['1', 'Laut']]}
              onPick={(v) => { set({ volume: Number(v) }); setTimeout(() => play('coin'), 30); }}
            />
          )}
          {!app.dev && <CodeInput onUnlock={() => set({ dev: true })} />}
          <div className="setting setting-row">
            <span className="grow"><span className="setting-label">Passwort-Sperre</span></span>
            <button className="btn secondary small" onClick={lock}>Wieder sperren</button>
          </div>
        </section>

        {app.dev && <DevPanel career={career} onChange={onChange} onLock={() => set({ dev: false })} />}
      </div>
    </div>
  );
}

/** Code-Feld: Der richtige Code schaltet den Entwickler-Bereich frei. */
function CodeInput({ onUnlock }: { onUnlock: () => void }) {
  const [code, setCode] = useState('');
  const [wrong, setWrong] = useState(false);
  const submit = () => {
    if (isDevCode(code)) {
      onUnlock();
      play('levelUp');
    } else {
      setWrong(true);
      play('error');
    }
    setCode('');
  };
  return (
    <div className="setting">
      <span className="setting-label">Code eingeben</span>
      <form className="dev-code" onSubmit={(e) => { e.preventDefault(); submit(); }}>
        <input value={code} onChange={(e) => { setCode(e.target.value); setWrong(false); }} placeholder="Geheimcode" autoCapitalize="none" autoComplete="off" aria-label="Code" />
        <button className="btn secondary small" disabled={!code.trim()}>OK</button>
      </form>
      {wrong && <p className="hint">Falscher Code.</p>}
    </div>
  );
}

/** Entwickler-Bereich: Coins, alle Karten, Karriere-Abkürzungen. */
function DevPanel({ career, onChange, onLock }: { career?: Career; onChange?: (c: Career) => void; onLock: () => void }) {
  const club = useClub();
  const [msg, setMsg] = useState('');
  const club$ = (fn: (c: ReturnType<typeof getClubState>) => ReturnType<typeof getClubState>, text: string) => {
    setClubState(fn(getClubState()));
    setMsg(text);
  };
  const career$ = (next: Career, text: string) => {
    onChange?.(next);
    setMsg(text);
  };
  return (
    <section className="panel dev-panel">
      <h2>🛠️ Entwickler</h2>
      <p className="hint">Wirkt sofort auf deinen Spielstand in diesem Browser. Tipp: vorher unter „Sichern & Laden“ eine Sicherung machen.</p>

      <div className="dev-group">
        <span className="setting-label">Coins · aktuell 🪙 {club.coins.toLocaleString('de-DE')}</span>
        <div className="dev-btns">
          <button className="btn secondary small" onClick={() => club$((c) => devCoins(c, c.coins + 100_000), '+100.000 Coins')}>+100.000</button>
          <button className="btn secondary small" onClick={() => club$((c) => devCoins(c, c.coins + 1_000_000), '+1 Mio. Coins')}>+1 Mio.</button>
          <button className="btn primary small" onClick={() => club$((c) => devCoins(c, INFINITE_COINS), 'Unendlich Coins ♾️')}>♾️ Unendlich</button>
          <button className="btn ghost small" onClick={() => club$((c) => devCoins(c, 0), 'Coins auf 0')}>Auf 0</button>
        </div>
      </div>

      <div className="dev-group">
        <span className="setting-label">Sammlung</span>
        <div className="dev-btns">
          <button className="btn primary small" onClick={() => club$(devAllCards, 'Alle Karten freigeschaltet')}>Alle Spieler/Karten</button>
          <button className="btn secondary small" onClick={() => club$(devMaxCards, 'Alle Karten auf 99')}>Alle Karten auf 99</button>
        </div>
      </div>

      {career && onChange && (
        <div className="dev-group">
          <span className="setting-label">Diese Karriere · {career.player.name} ({career.player.ovr})</span>
          <div className="dev-btns">
            <button className="btn secondary small" onClick={() => career$(devOvr(career, career.player.ovr + 5), 'Wertung +5')}>Wertung +5</button>
            <button className="btn secondary small" onClick={() => career$(devOvr(career, 99), 'Wertung 99')}>Wertung 99</button>
            <button className="btn secondary small" disabled={!career.player.skills} onClick={() => career$(devLevels(career, 10), '+10 Level')}>+10 Level</button>
          </div>
          {!career.player.skills && <p className="hint">Level gibt es, sobald du einen Spielertyp gewählt hast.</p>}
        </div>
      )}

      {msg && <p className="cs-note good" role="status">✓ {msg}</p>}
      <button className="btn ghost small" onClick={onLock}>Entwickler-Bereich ausblenden</button>
    </section>
  );
}
