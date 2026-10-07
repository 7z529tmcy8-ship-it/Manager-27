import { useEffect, useMemo, useState } from 'react';
import { rarity, withUpgrade, type CollectCard } from '../game/club';
import { TRADER_LINES, TRADE_SIZE, doTrade, randomTrader, tradeable, type Trader } from '../game/trade';
import { getClubState, setClubState, useClub } from '../clubStore';
import { motionReduced } from '../settings';
import { play } from '../sound';
import Confetti from './Confetti';
import UtCard from './UtCard';

type Phase = 'pick' | 'search' | 'found' | 'adding' | 'confirm' | 'done' | 'lost';

/** So oft bricht die „Verbindung“ ab – irgendwo zwischen Suche und letzter Karte. */
const DROP_CHANCE = 0.4;
/** Spätestens beim dritten Trade in Folge ohne Abbruch bricht es garantiert ab. */
const DROP_KEY = 'fc-trade-nodrop';
function rollDrop(): number | null {
  let calm = 0;
  try {
    calm = Number(localStorage.getItem(DROP_KEY)) || 0;
  } catch {
    // ohne Speicher: nur Zufall
  }
  const drops = calm >= 2 || Math.random() < DROP_CHANCE;
  try {
    localStorage.setItem(DROP_KEY, String(drops ? 0 : calm + 1));
  } catch {
    // egal
  }
  return drops ? Math.floor(Math.random() * TRADE_SIZE) : null;
}
const RECONNECTS = 3;

const pickLine = (a: string[]) => a[Math.floor(Math.random() * a.length)];
const AUTO_ACCEPT = 10;

/** Tauschbörse: Sieht aus wie ein Tausch mit einem echten Spieler – ist es aber nicht. */
export default function Trade({ onBack, onCollection }: { onBack: () => void; onCollection: () => void }) {
  const club = useClub();
  const [phase, setPhase] = useState<Phase>('pick');
  const [offer, setOffer] = useState<CollectCard[]>([]);
  const [got, setGot] = useState<CollectCard[]>([]);
  const [trader, setTrader] = useState<Trader>(randomTrader);
  const [shown, setShown] = useState(0);
  const [typing, setTyping] = useState(false);
  const [chat, setChat] = useState<string[]>([]);
  const [query, setQuery] = useState('');
  const [declined, setDeclined] = useState(false);
  const [myStars, setMyStars] = useState(0);
  /** Wann die Verbindung abbricht: 0 = bei der Suche, 1–2 = nach so vielen Karten, null = gar nicht. */
  const [drop, setDrop] = useState<number | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [errCode, setErrCode] = useState('');
  const [online, setOnline] = useState(5);
  const [hover, setHover] = useState(0);
  const [left, setLeft] = useState(AUTO_ACCEPT);
  const quick = motionReduced();
  const speed = quick ? 0.3 : 1;

  const mine = useMemo(
    () => tradeable(club).map((c) => withUpgrade(club, c)).sort((a, b) => rarity(b) - rarity(a)),
    [club],
  );
  const list = mine.filter((c) => !query || c.name.toLowerCase().includes(query.toLowerCase()));
  const toggle = (c: CollectCard) =>
    setOffer((o) => (o.some((x) => x.id === c.id) ? o.filter((x) => x.id !== c.id) : o.length < TRADE_SIZE ? [...o, c] : o));

  const send = () => {
    // Der Tausch passiert sofort – es gibt kein Zurück.
    const res = doTrade(getClubState(), offer.map((c) => c.id));
    if (!res) return;
    setClubState(res.club);
    setGot(res.got);
    setTrader(randomTrader());
    setShown(0);
    setChat([]);
    setDeclined(false);
    setMyStars(0);
    setLeft(AUTO_ACCEPT);
    setDrop(rollDrop());
    setOnline(3 + Math.floor(Math.random() * 5));
    setAttempt(0);
    setErrCode(`TRD-${Math.floor(400 + Math.random() * 200)}-${Math.random().toString(16).slice(2, 6).toUpperCase()}`);
    setPhase('search');
  };

  // Ablauf: suchen → gefunden → Karten kommen einzeln rein → „bestätigen“.
  useEffect(() => {
    if (phase === 'search') {
      if (drop === 0) {
        const t = setTimeout(() => setPhase('lost'), 1800 * speed);
        return () => clearTimeout(t);
      }
      const t = setTimeout(() => setPhase('found'), 2400 * speed);
      return () => clearTimeout(t);
    }
    if (phase === 'found') {
      play('notify');
      setChat([pickLine(TRADER_LINES.hello)]);
      const t = setTimeout(() => setPhase('adding'), 1500 * speed);
      return () => clearTimeout(t);
    }
    if (phase === 'confirm') {
      setChat((c) => [...c, pickLine(TRADER_LINES.done)]);
    }
  }, [phase, speed, drop]);

  useEffect(() => {
    if (phase !== 'adding') return;
    if (drop !== null && drop > 0 && shown === drop) {
      const t = setTimeout(() => setPhase('lost'), 900 * speed);
      return () => clearTimeout(t);
    }
    if (shown >= TRADE_SIZE) {
      const t = setTimeout(() => setPhase('confirm'), 700 * speed);
      return () => clearTimeout(t);
    }
    setTyping(true);
    setChat((c) => [...c, pickLine(TRADER_LINES.adding)]);
    const t = setTimeout(() => {
      setTyping(false);
      setShown((s) => s + 1);
      play('tap');
    }, 1400 * speed);
    return () => clearTimeout(t);
  }, [phase, shown, speed, drop]);

  // Verbindungsabbruch: ein paar Wiederverbindungsversuche, dann fliegt man raus.
  useEffect(() => {
    if (phase !== 'lost' || attempt > RECONNECTS) return;
    if (attempt === 0) play('error');
    const t = setTimeout(() => {
      setAttempt((a) => a + 1);
      if (attempt === RECONNECTS) play('fall');
    }, (attempt === 0 ? 300 : 1400) * speed);
    return () => clearTimeout(t);
  }, [phase, attempt, speed]);

  // Wer nicht annimmt, nimmt trotzdem an.
  useEffect(() => {
    if (phase !== 'confirm') return;
    if (left <= 0) {
      accept();
      return;
    }
    const t = setTimeout(() => setLeft((l) => l - 1), 1000);
    return () => clearTimeout(t);
  });

  const accept = () => {
    play('fanfare');
    setPhase('done');
  };

  const inTrade = phase !== 'pick';

  return (
    <main className="hub trade">
      <header className="hub-top">
        {!inTrade || phase === 'done' ? (
          <button className="hub-back" onClick={onBack}>‹ Hauptmenü</button>
        ) : (
          <span className="hub-back muted">🔒 Trade läuft …</span>
        )}
        <span className="hub-coins">🪙 {club.coins.toLocaleString('de-DE')}</span>
      </header>
      <h1 className="hub-title">Tauschbörse</h1>
      {!inTrade && (
        <p className="hub-sub">
          Tausche Karten mit echten Spielern aus der Community*. Leg {TRADE_SIZE} Karten rein – dein Tauschpartner legt auch {TRADE_SIZE} rein.
          {club.tradesDone ? ` Du hast schon ${club.tradesDone} faire Trades gemacht.` : ''}
        </p>
      )}

      {inTrade && (
        <div className="trade-partner">
          {phase === 'search' ? (
            <div className="trade-search"><span className="trade-spin" aria-hidden="true" /> Suche Tauschpartner … <small>{online} Spieler online</small></div>
          ) : (
            <div className="trade-who">
              <span className="trade-ava" aria-hidden="true">{trader.avatar}</span>
              <span>
                <strong>{trader.name}</strong>
                <small>⭐ {trader.rating} · {trader.trades.toLocaleString('de-DE')} Trades · <b className="trade-verified">✔ Verifiziert</b></small>
              </span>
              {phase === 'done' && <em className="trade-left">hat den Chat verlassen</em>}
            </div>
          )}
          {chat.length > 0 && (
            <div className="trade-chat" aria-live="polite">
              {chat.slice(-3).map((m, i) => <p key={`${chat.length}-${i}`} className="trade-bubble">{m}</p>)}
              {typing && <p className="trade-bubble typing"><i /><i /><i /></p>}
            </div>
          )}
        </div>
      )}

      <section className="trade-table">
        <div className="trade-side">
          <h2>Dein Angebot</h2>
          <div className="trade-slots">
            {Array.from({ length: TRADE_SIZE }, (_, i) => (
              <div key={i} className="trade-slot">
                {offer[i] ? <UtCard card={offer[i]} size="sm" shine={rarity(offer[i]) >= 200} onClick={!inTrade ? () => toggle(offer[i]) : undefined} /> : <span className="trade-empty">+</span>}
              </div>
            ))}
          </div>
        </div>
        <div className={`trade-swap ${phase === 'done' ? 'spun' : ''}`} aria-hidden="true">⇅</div>
        <div className="trade-side">
          <h2>{inTrade && phase !== 'search' ? `Angebot von ${trader.name}` : 'Angebot deines Tauschpartners'}</h2>
          <div className="trade-slots">
            {Array.from({ length: TRADE_SIZE }, (_, i) => (
              <div key={i} className="trade-slot">
                {i < shown ? <div className="trade-in"><UtCard card={got[i]} size="sm" /></div> : <span className="trade-empty">?</span>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {phase === 'pick' && (
        <>
          <div className="trade-actions">
            <button className="btn primary big" disabled={offer.length !== TRADE_SIZE} onClick={send}>
              {offer.length === TRADE_SIZE ? 'Angebot abschicken' : `Noch ${TRADE_SIZE - offer.length} Karte${TRADE_SIZE - offer.length === 1 ? '' : 'n'} auswählen`}
            </button>
          </div>
          {mine.length < TRADE_SIZE ? (
            <p className="hub-sub">Du brauchst mindestens {TRADE_SIZE} Karten. Öffne erst ein paar Packs im Store.</p>
          ) : (
            <>
              <input className="search" placeholder="Karte suchen …" value={query} onChange={(e) => setQuery(e.target.value)} />
              <div className="trade-pick">
                {list.map((c) => (
                  <div key={c.id} className={`trade-pickcard ${offer.some((x) => x.id === c.id) ? 'on' : ''}`}>
                    <UtCard card={c} size="sm" count={club.cards[c.id] > 1 ? club.cards[c.id] : undefined} shine={rarity(c) >= 200} onClick={() => toggle(c)} />
                  </div>
                ))}
              </div>
            </>
          )}
          <p className="disclaimer">* Laut Tauschpartner immer fair. Abgeschickte Angebote können nicht zurückgezogen werden.</p>
        </>
      )}

      {phase === 'lost' && (
        <div className="net-lost" role="alertdialog" aria-modal="true" aria-label="Verbindung unterbrochen">
          <div className="net-box">
            <div className="net-icon" aria-hidden="true">📡</div>
            {attempt <= RECONNECTS ? (
              <>
                <h2>Verbindung unterbrochen</h2>
                <p>Die Verbindung zum Trade-Server wurde getrennt. Bitte prüfe deine Internetverbindung.</p>
                <p className="net-retry"><span className="trade-spin" aria-hidden="true" /> Verbinde erneut … ({Math.max(1, attempt)}/{RECONNECTS})</p>
              </>
            ) : (
              <>
                <h2>Du wurdest aus dem Trade entfernt</h2>
                <p>Die Sitzung ist abgelaufen. Der Tausch wurde möglicherweise trotzdem abgeschlossen – prüfe deine Sammlung.</p>
                <button className="btn primary" onClick={() => { setOffer([]); setGot([]); setShown(0); setChat([]); setPhase('pick'); }}>OK</button>
              </>
            )}
            <small className="net-code">Fehlercode: {errCode}</small>
          </div>
        </div>
      )}

      {phase === 'confirm' && (
        <div className="trade-confirm">
          <p><strong>{trader.name}</strong> hat den Tausch angenommen. Jetzt bist du dran!</p>
          <div className="trade-actions">
            <button className="btn primary big" onClick={accept}>Annehmen ✅</button>
            <button className="btn secondary big" onClick={() => { setDeclined(true); accept(); }}>Ablehnen</button>
          </div>
          <small className="trade-auto">Wird automatisch angenommen in {left} …</small>
        </div>
      )}

      {phase === 'done' && (
        <div className="trade-done">
          {!quick && <Confetti pieces={60} />}
          <h2>Trade erfolgreich! 🤝</h2>
          {declined && <p className="trade-auto">Du hast „Ablehnen“ gedrückt – wir haben das als „Annehmen“ gewertet. Gern geschehen.</p>}
          <p>Glückwunsch zu deinen neuen Karten. {trader.name} bedankt sich für {offer.map((c) => c.name).join(', ')}.</p>
          <div className="trade-rate">
            <strong>Wie war dein Trade mit {trader.name}?</strong>
            <div className="trade-stars" onPointerLeave={() => setHover(0)}>
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} className={n <= (hover || myStars) ? 'on' : ''} disabled={myStars > 0} aria-label={`${n} Sterne`}
                  onPointerEnter={() => setHover(n)} onClick={() => { setMyStars(n); play('notify'); }}>★</button>
              ))}
            </div>
            {myStars > 0 && (
              <small>Danke für deine Bewertung! Sie wird geprüft und in 4–6 Wochen berücksichtigt. Bewertung von {trader.name} aktuell: ⭐ {trader.rating}</small>
            )}
          </div>
          <div className="trade-actions">
            <button className="btn secondary big" onClick={onCollection}>Zur Sammlung</button>
            <button className="btn primary big" onClick={() => { setOffer([]); setGot([]); setShown(0); setChat([]); setPhase('pick'); }}>Noch ein fairer Trade</button>
          </div>
        </div>
      )}
    </main>
  );
}
