import { useEffect, useState, type CSSProperties } from 'react';
import { play } from '../sound';
import { ITEMS, PACKS, oddsAtLeast, openPack, packTier, rarity, type PackDef, type PackResult } from '../game/club';
import { getClubState, setClubState, useClub } from '../clubStore';
import { motionReduced } from '../settings';
import Confetti from './Confetti';
import UtCard from './UtCard';

const fmtCoins = (n: number) => n.toLocaleString('de-DE');

/** Store: Packs mit Coins kaufen. Das erste Gold-Pack ist gratis. */
export default function Store({ onBack, onCollection }: { onBack: () => void; onCollection: () => void }) {
  const club = useClub();
  const [opening, setOpening] = useState<{ result: PackResult; name: string } | null>(null);

  const buy = (packId: string, free = false) => {
    const res = openPack(getClubState(), packId, Math.random, free);
    if (!res) return;
    setClubState(free ? { ...res.club, welcomeClaimed: true } : res.club);
    setOpening({ result: res.result, name: PACKS.find((p) => p.id === packId)!.name });
  };

  return (
    <main className="hub">
      <header className="hub-top">
        <button className="hub-back" onClick={onBack}>‹ Hauptmenü</button>
        <span className="hub-coins">🪙 {fmtCoins(club.coins)}</span>
      </header>
      <h1 className="hub-title">Store</h1>
      <p className="hub-sub">Coins verdienst du in deinen Karrieren: pro Saison für Spiele, Tore, Vorlagen, Titel, Erfolge und Sonderkarten.</p>

      {!club.welcomeClaimed && (
        <button className="hub-tile accent welcome" onClick={() => buy('gold', true)}>
          <span className="hub-tile-icon" aria-hidden="true">🎁</span>
          <strong>Willkommens-Pack</strong>
          <small>Ein Gold-Pack geschenkt – jetzt öffnen!</small>
        </button>
      )}

      <div className="store-grid">
        {PACKS.map((p) => {
          const afford = club.coins >= p.price;
          return (
            <div key={p.id} className={`pack-card p-${p.id}`}>
              <div className="pack-art" aria-hidden="true"><span>{p.name.replace('-Pack', '')}</span></div>
              <strong>{p.name}</strong>
              <small>{p.text}</small>
              <PackOddsLine pack={p} />
              <button className="btn primary" disabled={!afford} onClick={() => buy(p.id)}>
                {afford ? `Öffnen · 🪙 ${fmtCoins(p.price)}` : `Fehlen 🪙 ${fmtCoins(p.price - club.coins)}`}
              </button>
            </div>
          );
        })}
      </div>

      {opening && (
        <PackOpening
          name={opening.name}
          result={opening.result}
          onClose={() => setOpening(null)}
          onCollection={() => { setOpening(null); onCollection(); }}
        />
      )}
    </main>
  );
}

type Phase = 'pack' | 'burst' | 'walkout' | 'reveal' | 'all';

const FLIP_GAP = 140; // ms zwischen zwei Karten beim Aufdecken

/**
 * Pack-Öffnung: Das Pack lädt sich auf und leuchtet in der Farbe der besten Karte, reißt mit einem Blitz auf,
 * bei seltenen Karten folgt ein „Walkout“ (Nation → Position → Verein), dann die Karte – am Ende drehen sich alle Karten einzeln um.
 */
export function PackOpening({ name, result, onClose, onCollection }: { name: string; result: PackResult; onClose: () => void; onCollection: () => void }) {
  const best = result.cards[0].card;
  const special = rarity(best) >= 200; // Elite, Ikone, Talent
  const tier = packTier(best);
  const [phase, setPhase] = useState<Phase>('pack');
  const [step, setStep] = useState(0);
  const [instant, setInstant] = useState(false);
  const quick = motionReduced();
  const many = result.cards.length > 4;

  // Sounds zur Pack-Öffnung.
  useEffect(() => {
    if (phase === 'pack') play('packShake');
    if (phase === 'burst') play('packRip');
    if (phase === 'walkout') play('walkout');
    if (phase === 'reveal') play(special ? 'revealRare' : 'reveal');
  }, [phase, special]);
  useEffect(() => {
    if (phase === 'walkout' && step > 0 && step <= 3) play('walkStep');
  }, [phase, step]);

  // Beim Aufdecken: ein Ton pro Karte, passend zur Stufe.
  useEffect(() => {
    if (phase !== 'all' || quick || instant) return;
    const timers = result.cards.map(({ card }, i) =>
      setTimeout(() => {
        const t = packTier(card);
        play(t === 'special' || t === 'icon' ? 'revealRare' : t === 'elite' || t === 'rare' ? 'unlock' : 'tap');
      }, 250 + i * FLIP_GAP),
    );
    // Wenn alles aufgedeckt ist, verschwindet „Alle aufdecken“.
    timers.push(setTimeout(() => setInstant(true), 1000 + result.cards.length * FLIP_GAP));
    return () => timers.forEach(clearTimeout);
  }, [phase, quick, instant, result.cards]);

  useEffect(() => {
    if (phase === 'pack') {
      const t = setTimeout(() => setPhase(quick ? 'reveal' : 'burst'), quick ? 200 : 1500);
      return () => clearTimeout(t);
    }
    if (phase === 'burst') {
      const t = setTimeout(() => setPhase(special ? 'walkout' : 'reveal'), 650);
      return () => clearTimeout(t);
    }
    if (phase === 'walkout') {
      if (step >= 3) {
        const t = setTimeout(() => setPhase('reveal'), 500);
        return () => clearTimeout(t);
      }
      const t = setTimeout(() => setStep((s) => s + 1), 1000);
      return () => clearTimeout(t);
    }
  }, [phase, step, special, quick]);

  const walk = [
    { label: 'Nation', value: best.nation },
    { label: 'Position', value: best.position },
    { label: best.variant === 'icon' || best.variant === 'talent' ? 'Kartentyp' : 'Verein', value: best.label ?? best.club },
  ];
  const flipping = phase === 'all' && !quick && !instant;

  return (
    <div className={`pack-open ph-${phase} tier-${tier} ${special ? 'special' : ''}`} role="dialog" aria-modal="true" aria-label={`${name} öffnen`}>
      {phase !== 'all' && <button className="pack-skip" onClick={() => setPhase('all')}>Überspringen</button>}

      {phase === 'pack' && (
        <div className="pack-stage" aria-hidden="true">
          <div className="pack-halo" />
          <div className="pack-big"><span>{name}</span></div>
          <div className="pack-sparks">{Array.from({ length: 10 }, (_, i) => <i key={i} style={{ '--i': i } as CSSProperties} />)}</div>
        </div>
      )}

      {phase === 'burst' && (
        <div className="pack-stage" aria-hidden="true">
          <div className="pack-flash" />
          <div className="pack-big half l"><span>{name}</span></div>
          <div className="pack-big half r"><span>{name}</span></div>
          <div className="pack-ring" />
        </div>
      )}

      {phase === 'walkout' && (
        <div className="walkout">
          <div className="beams" aria-hidden="true" />
          {walk.slice(0, step + 1).map((w, i) => (
            <div key={w.label} className={`walk-step ${i === step ? 'now' : ''}`}>
              <small>{w.label}</small>
              <strong>{w.value}</strong>
            </div>
          ))}
        </div>
      )}

      {phase === 'reveal' && (
        <div className="reveal" onClick={() => setPhase('all')}>
          {special && <div className="beams" aria-hidden="true" />}
          {special && <Confetti pieces={90} />}
          <div className="pack-ring" aria-hidden="true" />
          <div className="reveal-card"><UtCard card={best} size="lg" shine={special} /></div>
          <p className="reveal-name">{best.name}</p>
          <button className="btn primary big" onClick={() => setPhase('all')}>
            {result.cards.length > 1 || result.items.length ? 'Alle Karten ansehen' : 'Weiter'}
          </button>
        </div>
      )}

      {phase === 'all' && (
        <div className={`pack-all ${flipping ? 'flipping' : ''}`}>
          <h2>{name}</h2>
          <div className={`pack-cards ${many ? 'many' : ''}`}>
            {result.cards.map(({ card, duplicate }, i) => (
              <div key={card.id} className={`pack-slot tier-${packTier(card)}`} style={{ '--d': `${i * FLIP_GAP}ms` } as CSSProperties}>
                <div className="flip">
                  <UtCard card={card} size="sm" shine={rarity(card) >= 200} />
                  <div className="card-back" aria-hidden="true" />
                </div>
                {duplicate ? <span className="pack-tag dup">Doppelt</span> : <span className="pack-tag new">Neu</span>}
              </div>
            ))}
          </div>
          {result.items.map((k, i) => (
            <p key={i} className="pack-item">{ITEMS[k].icon} {ITEMS[k].name}: {ITEMS[k].text}</p>
          ))}
          <div className="pack-actions">
            {flipping && result.cards.length > 1 && <button className="btn secondary big" onClick={() => setInstant(true)}>Alle aufdecken</button>}
            <button className="btn secondary big" onClick={onCollection}>Zur Sammlung</button>
            <button className="btn primary big" onClick={onClose}>Fertig</button>
          </div>
        </div>
      )}
    </div>
  );
}

const pct = (v: number) => (v >= 10 ? Math.round(v) : v >= 1 ? v.toFixed(1) : v.toFixed(2)).toString().replace('.', ',') + ' %';

/** Offene Chancen wie im echten Spiel: Wie wahrscheinlich ist eine starke Karte? */
function PackOddsLine({ pack }: { pack: PackDef }) {
  const odds = pack.first?.odds ?? pack.odds;
  const parts: string[] = [];
  const rare = oddsAtLeast(odds, 'rare');
  const elite = oddsAtLeast(odds, 'elite');
  const icon = oddsAtLeast(odds, 'icon');
  if (rare > 0 && rare < 100) parts.push(`83+: ${pct(rare)}`);
  if (elite > 0 && elite < 100) parts.push(`87+/Spezial: ${pct(elite)}`);
  if (icon > 0 && icon < 100) parts.push(`Ikone: ${pct(icon)}`);
  if (!parts.length) return null;
  return <span className="pack-odds">{pack.first ? 'Beste Karte' : 'Pro Karte'} · {parts.join(' · ')}</span>;
}
