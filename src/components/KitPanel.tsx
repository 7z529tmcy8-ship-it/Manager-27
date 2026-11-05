import { useState } from 'react';
import { createPortal } from 'react-dom';
import { BRANDS, BRAND_ORDER, acceptKit, declineKit, interested, type Brand, type KitOffer } from '../game/kit';
import { fmtFollowers, gramOf } from '../game/kickgram';
import type { Career } from '../game/types';
import { play } from '../sound';
import Confetti from './Confetti';
import Icon from './Icon';

const fmt = (n: number) => n.toLocaleString('de-DE');
const sfx = (id: Parameters<typeof play>[0]) => { try { play(id); } catch { /* kein Ton */ } };

/** Wortmarke der Marke (nur Text, kein Logo). */
export function BrandMark({ b, size = 1 }: { b: Brand; size?: number }) {
  return <span className={`kit-mark km-${b.id}`} style={{ fontSize: `${size}rem` }}>{b.name}</span>;
}

const NEED: Record<string, string> = {
  winnerz: 'Bis 21 Jahre mit Potenzial – oder ab 66 GES',
  freedom: 'Bis 24 Jahre mit 1.500 Followern oder 68 GES – oder 20.000 Follower',
  ami: 'Ab 74 GES',
  helmut: 'Ab 83 GES – oder 250.000 Follower',
};

/** Ausrüster: laufender Vertrag, Angebote, alle Marken. */
export default function KitPanel({ career, onChange, onClose }: { career: Career; onChange: (c: Career) => void; onClose: () => void }) {
  const k = career.kit;
  const offers = career.kitOffers ?? [];
  const want = interested(career);
  const [signed, setSigned] = useState<KitOffer | null>(null);
  const followers = gramOf(career).followers;

  const sign = (o: KitOffer) => {
    if (k && !window.confirm(`Dein Vertrag mit ${BRANDS[k.brand].name} läuft noch ${k.left} ${k.left === 1 ? 'Saison' : 'Saisons'}. Trotzdem zu ${BRANDS[o.brand].name} wechseln?`)) return;
    onChange(acceptKit(career, o.id));
    setSigned(o);
    sfx('fanfare');
    try { navigator.vibrate?.([30, 40, 90]); } catch { /* egal */ }
  };

  return (
    <div className="overlay fam-overlay kit-overlay" role="dialog" aria-modal="true" aria-label="Ausrüster">
      <div className="overlay-inner">
        <header className="overlay-head"><button className="nav-back" onClick={onClose}>‹ Zurück</button></header>
        <h2 className="fam-title">Ausrüster</h2>
        <p className="cs-sub">Marken zahlen dir jedes Jahr Coins – plus Bonus für Tore und Titel. Je besser du spielst und je mehr Kickgram-Follower du hast ({fmtFollowers(followers)}), desto größer die Marke.</p>

        {k ? (
          <section className={`kit-card kc-${k.brand} current`}>
            <small>Dein Ausrüster</small>
            <BrandMark b={BRANDS[k.brand]} size={2} />
            <p>{BRANDS[k.brand].perk}</p>
            <ul className="kit-terms">
              <li><b>{fmt(k.fee)}</b><span>Coins / Saison</span></li>
              <li><b>{fmt(k.goalBonus)}</b><span>pro Tor</span></li>
              <li><b>{fmt(k.titleBonus)}</b><span>pro Titel</span></li>
              <li><b>{k.left}</b><span>{k.left === 1 ? 'Saison' : 'Saisons'} übrig</span></li>
            </ul>
            <small className="kit-earned">Bisher verdient: {fmt(k.earned)} Coins</small>
          </section>
        ) : (
          <p className="cs-note neutral">Noch kein Ausrüster. Angebote kommen in der Winterpause und im Sommer.</p>
        )}

        {offers.length > 0 && (
          <>
            <h3 className="kit-h">{offers.length === 1 ? 'Neues Angebot' : `${offers.length} neue Angebote`}</h3>
            <div className="kit-offers">
              {offers.map((o) => {
                const b = BRANDS[o.brand];
                return (
                  <section key={o.id} className={`kit-card kc-${o.brand} offer`}>
                    {o.youth && <span className="kit-youth">Nachwuchsvertrag</span>}
                    <BrandMark b={b} size={1.7} />
                    <p className="kit-tag">{b.tag}</p>
                    <ul className="kit-terms">
                      <li><b>{fmt(o.fee)}</b><span>Coins / Saison</span></li>
                      <li><b>{fmt(o.goalBonus)}</b><span>pro Tor</span></li>
                      <li><b>{fmt(o.titleBonus)}</b><span>pro Titel</span></li>
                      <li><b>{o.years}</b><span>{o.years === 1 ? 'Saison' : 'Saisons'}</span></li>
                    </ul>
                    <p className="kit-perk"><Icon name="spark" size={14} />{b.perk}</p>
                    <div className="kit-actions">
                      <button className="btn ghost small" onClick={() => { onChange(declineKit(career, o.id)); sfx('tap'); }}>Ablehnen</button>
                      <button className="btn primary" onClick={() => sign(o)}>Unterschreiben</button>
                    </div>
                  </section>
                );
              })}
            </div>
          </>
        )}

        <h3 className="kit-h">Alle Marken</h3>
        <ul className="kit-brands">
          {BRAND_ORDER.map((id) => {
            const b = BRANDS[id];
            const on = want.includes(id);
            return (
              <li key={id} className={`kc-${id} ${k?.brand === id ? 'mine' : ''}`}>
                <BrandMark b={b} size={1.05} />
                <span><small>{b.tag}</small><em>{NEED[id]}</em></span>
                <b className={on ? 'yes' : 'no'}>{k?.brand === id ? 'Dein Vertrag' : on ? 'Interessiert' : 'Noch nicht'}</b>
              </li>
            );
          })}
        </ul>

        {(career.kitHistory?.length ?? 0) > 0 && (
          <>
            <h3 className="kit-h">Frühere Verträge</h3>
            <ul className="kit-hist">{career.kitHistory!.map((h, i) => <li key={i}><BrandMark b={BRANDS[h.brand]} size={.9} /><span>ab {h.from}/{String((h.from + 1) % 100).padStart(2, '0')}</span><b>{fmt(h.earned)} Coins</b></li>)}</ul>
          </>
        )}
      </div>

      {signed && createPortal(
        <div className={`kit-sign kc-${signed.brand}`} role="dialog" aria-modal="true" onClick={() => setSigned(null)}>
          <Confetti pieces={80} />
          <small>Neuer Ausrüster</small>
          <span className="kit-sign-mark"><BrandMark b={BRANDS[signed.brand]} size={2.8} /></span>
          <b className="mg-stamp">Unterschrieben</b>
          <p>{signed.years} {signed.years === 1 ? 'Saison' : 'Saisons'} · {fmt(signed.fee)} Coins pro Saison</p>
          <button className="btn primary big" onClick={() => setSigned(null)}>Stark!</button>
        </div>, document.body,
      )}
    </div>
  );
}
