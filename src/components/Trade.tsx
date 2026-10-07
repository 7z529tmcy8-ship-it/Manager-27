import { useEffect, useMemo, useState } from 'react';
import { rarity, withUpgrade, type CollectCard } from '../game/club';
import { TRADER_LINES, TRADE_SIZE, doTrade, randomTrader, tradeable, type Trader } from '../game/trade';
import { getClubState, setClubState, useClub } from '../clubStore';
import { motionReduced } from '../settings';
import { play } from '../sound';
import Confetti from './Confetti';
import UtCard from './UtCard';

type Phase = 'pick' | 'search' | 'found' | 'adding' | 'confirm' | 'done';

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
    setPhase('search');
  };

  // Ablauf: suchen → gefunden → Karten kommen einzeln rein → „bestätigen“.
  useEffect(() => {
    if (phase === 'search') {
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
  }, [phase, speed]);

  useEffect(() => {
    if (phase !== 'adding') return;
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
  }, [phase, shown, speed]);

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
            <div className="trade-search"><span className="trade-spin" aria-hidden="true" /> Suche Tauschpartner … <small>{(1200 + Math.floor(Math.random() * 300)).toLocaleString('de-DE')} Spieler online</small></div>
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
