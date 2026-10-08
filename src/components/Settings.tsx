import { useEffect, useState } from 'react';
import { getClubState, setClubState, useClub } from '../clubStore';
import { INFINITE_COINS, devAdvance, devAllCards, devCoins, devFlags, devLevels, devMaxCards, devOvr, devTransfer, isDevCode } from '../game/dev';
import { CLUBS, LEAGUES, getClub } from '../data/leagues';
import { currentClubId } from '../game/player';
import { readDevTrade, writeDevTrade, type DevTrade } from '../game/trade';
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

      {career && onChange && <DevCareerTools career={career} onDone={career$} />}

      <DevTradeTools onMsg={setMsg} />

      {msg && <p className="cs-note good" role="status">✓ {msg}</p>}
      <button className="btn ghost small" onClick={onLock}>Entwickler-Bereich ausblenden</button>
    </section>
  );
}

/** Entwickler: Karriere vorspulen, Wechsel erzwingen, versteckte Werte. */
function DevCareerTools({ career, onDone }: { career: Career; onDone: (c: Career, text: string) => void }) {
  const p = career.player;
  const [leagueId, setLeagueId] = useState(LEAGUES[0].id);
  const [clubId, setClubId] = useState('');
  const clubs = CLUBS.filter((c) => c.leagueId === leagueId).sort((a, b) => a.name.localeCompare(b.name, 'de'));
  const prog = career.progress;
  const hidden: [string, string][] = [
    ['Potenzial', `${p.potential}${p.potentialStart ? ` (Start ${p.potentialStart})` : ''}`],
    ['Form', prog ? prog.form.toFixed(1) : '–'],
    ['Moral', String(p.morale ?? 0)],
    ['Skandal', String(career.scandal ?? 0)],
    ['Burnout', String(p.burnout ?? 0)],
    ['Sucht (versteckt)', p.hooked ? 'ja' : 'nein'],
    ['Spielsucht (versteckt)', p.gambler ? 'ja' : 'nein'],
    ['Verletzt noch', prog ? `${prog.injuredFor} Spiele` : '–'],
    ['Glamour', String(career.glam ?? 0)],
    ['Eigenschaften', (p.traits ?? []).join(', ') || '–'],
  ];
  const coach = !!career.coach;
  return (
    <>
      <div className="dev-group">
        <span className="setting-label">Vorspulen · {career.phase === 'retired' ? 'Karriere beendet' : `Saison ${career.history.length + 1}, ${p.age} Jahre`}</span>
        <div className="dev-btns">
          <button className="btn secondary small" disabled={coach || career.phase === 'retired'} onClick={() => onDone(devAdvance(career, 1), '+1 Saison simuliert')}>+1 Saison</button>
          <button className="btn secondary small" disabled={coach || career.phase === 'retired'} onClick={() => onDone(devAdvance(career, 5), '+5 Saisons simuliert')}>+5 Saisons</button>
          <button className="btn primary small" disabled={coach || career.phase === 'retired'} onClick={() => onDone(devAdvance(career, 'end'), 'Bis zum Karriereende simuliert')}>Bis Karriereende</button>
        </div>
        {coach && <p className="hint">Im Trainer-Modus nicht verfügbar.</p>}
      </div>

      <div className="dev-group">
        <span className="setting-label">Wechsel erzwingen · jetzt bei {getClub(currentClubId(p)).name}</span>
        <div className="dev-row">
          <select value={leagueId} onChange={(e) => { setLeagueId(e.target.value); setClubId(''); }}>
            {LEAGUES.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
          <select value={clubId} onChange={(e) => setClubId(e.target.value)}>
            <option value="">Verein wählen …</option>
            {clubs.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.strength})</option>)}
          </select>
          <button className="btn primary small" disabled={!clubId || coach || career.phase === 'retired'}
            onClick={() => onDone(devTransfer(career, clubId), `Wechsel zu ${getClub(clubId).name}`)}>Wechseln</button>
        </div>
        <p className="hint">Im Sommer als normaler Transfer, während der Saison sofort (Pokal und Europapokal dann ohne dich).</p>
      </div>

      <div className="dev-group">
        <span className="setting-label">Versteckte Werte</span>
        <dl className="dev-values">
          {hidden.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}
        </dl>
        <div className="dev-btns">
          <button className="btn secondary small" onClick={() => onDone(devFlags(career, { hooked: !p.hooked }), p.hooked ? 'Sucht entfernt' : 'Sucht aktiviert')}>{p.hooked ? 'Sucht aus' : 'Sucht an'}</button>
          <button className="btn secondary small" onClick={() => onDone(devFlags(career, { gambler: !p.gambler }), p.gambler ? 'Spielsucht entfernt' : 'Spielsucht aktiviert')}>{p.gambler ? 'Spielsucht aus' : 'Spielsucht an'}</button>
          <button className="btn ghost small" onClick={() => onDone(devFlags(career, { scandal: 0 }), 'Skandal auf 0')}>Skandal auf 0</button>
        </div>
      </div>
    </>
  );
}

/** Entwickler: Tauschbörse steuern (gilt für den nächsten Trade). */
function DevTradeTools({ onMsg }: { onMsg: (t: string) => void }) {
  const [d, setD] = useState<DevTrade>(readDevTrade);
  const set = (patch: Partial<DevTrade>, text: string) => {
    const next = { ...d, ...patch };
    setD(next);
    writeDevTrade(next);
    onMsg(text);
  };
  return (
    <div className="dev-group">
      <span className="setting-label">Tauschbörse</span>
      <div className="dev-btns">
        {([[null, 'Abbruch: Zufall'], ['force', 'Abbruch: immer'], ['never', 'Abbruch: nie']] as [DevTrade['drop'], string][]).map(([v, label]) => (
          <button key={label} className={`btn small ${(d.drop ?? null) === v ? 'primary' : 'secondary'}`} onClick={() => set({ drop: v }, label)}>{label}</button>
        ))}
        <button className={`btn small ${d.chef ? 'primary' : 'secondary'}`} onClick={() => set({ chef: !d.chef }, d.chef ? 'ChefJakob aus' : 'ChefJakob bei jedem Trade')}>ChefJakob {d.chef ? 'an' : 'aus'}</button>
      </div>
      <div className="dev-row">
        <input placeholder="Bot-Name erzwingen (leer = Zufall)" value={d.name ?? ''} maxLength={24} onChange={(e) => set({ name: e.target.value || undefined }, e.target.value ? `Bot heißt jetzt „${e.target.value}“` : 'Bot-Name wieder zufällig')} />
      </div>
    </div>
  );
}
