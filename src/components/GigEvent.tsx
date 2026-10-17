import { useEffect, useRef, useState } from 'react';
import { getClubState, setClubState, useClub } from '../clubStore';
import { EVENTS, eventActive, type PackResult } from '../game/club';
import { GIG_DUPLICATE_COINS, GIG_SPIN_PRICE, GIG_WHEEL, gigCard, gigFreeSpin, gigPercent, spinGig, type GigPrize } from '../game/gig';
import { motionReduced } from '../settings';
import { play } from '../sound';
import Icon from './Icon';
import { PackOpening } from './Store';
import UtCard from './UtCard';

const fmt = (n: number) => n.toLocaleString('de-DE');
const SHORT: Record<string, string> = {
  premium: 'Premium', worldstar: 'Weltstar', flashback: 'Rückblende', gig: '95', megagold: 'Mega-Gold', icon: 'Ikone', comeback: 'Comeback', ultimate: 'Ultimate', debut: 'Debüt', goat: 'GOAT',
};

// Winkel je Feld (im Uhrzeigersinn ab oben), proportional zur Chance
const SEGS = (() => {
  let a = 0;
  return GIG_WHEEL.map((p) => {
    const w = (p.weight / 1000) * 360;
    const seg = { p, a0: a, a1: a + w, c: a + w / 2 };
    a += w;
    return seg;
  });
})();

const R = 150;
const pt = (deg: number, r: number) => [Math.sin((deg * Math.PI) / 180) * r, -Math.cos((deg * Math.PI) / 180) * r];
const arc = (a0: number, a1: number) => {
  const [x0, y0] = pt(a0, R);
  const [x1, y1] = pt(a1, R);
  return `M0 0 L${x0.toFixed(2)} ${y0.toFixed(2)} A${R} ${R} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}Z`;
};

function useCountdown(end: Date) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  const ms = Math.max(0, end.getTime() - now);
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  const s = Math.floor((ms % 60_000) / 1000);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/** GIG-Event: Glücksrad mit starken Packs und einer winzigen Chance auf die 95er-Karte. */
export default function GigEvent({ onBack, onCollection }: { onBack: () => void; onCollection: () => void }) {
  const club = useClub();
  const active = eventActive('gig');
  const free = gigFreeSpin(club);
  const left = useCountdown(EVENTS.gig.end);
  const card = gigCard();
  const [rot, setRot] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [jackpot, setJackpot] = useState(false);
  const [opening, setOpening] = useState<{ name: string; result: PackResult; dup?: number } | null>(null);
  const [lastWin, setLastWin] = useState<GigPrize | null>(null);
  const pending = useRef<{ name: string; result: PackResult; dup?: number; prize: GigPrize } | null>(null);
  const can = active && !spinning && (free || club.coins >= GIG_SPIN_PRICE);

  const spin = () => {
    if (!can) return;
    const res = spinGig(getClubState());
    if (!res) return;
    setClubState(res.club);
    const seg = SEGS[res.index];
    // Zufällige Stelle im Feld, damit es nicht immer genau mittig landet
    const jitter = (Math.random() - 0.5) * (seg.a1 - seg.a0) * 0.7;
    const target = -(seg.c + jitter);
    const base = rot - (rot % 360);
    const next = base + 360 * (motionReduced() ? 1 : 7) + (((target % 360) + 360) % 360);
    pending.current = { name: res.name, result: res.result, dup: res.duplicateCoins, prize: res.prize };
    setSpinning(true);
    setLastWin(null);
    play('packShake');
    setRot(next);
    if (motionReduced()) setTimeout(finish, 300);
  };

  const finish = () => {
    const p = pending.current;
    if (!p) return;
    pending.current = null;
    setSpinning(false);
    setLastWin(p.prize);
    if (p.prize.kind === 'card') { setJackpot(true); play('walkout'); setTimeout(() => setJackpot(false), 2600); }
    else play('unlock');
    setTimeout(() => setOpening({ name: p.name, result: p.result, dup: p.dup }), p.prize.kind === 'card' ? 1400 : 500);
  };

  return (
    <main className={`hub gig ${jackpot ? 'gig-jackpot' : ''}`}>
      <div className="gig-bg" aria-hidden="true" />
      <header className="hub-top">
        <button className="hub-back" onClick={onBack}>‹ Hauptmenü</button>
        <span className="hub-coins"><Icon name="coin" size={16} className="coin-ic" />{fmt(club.coins)}</span>
      </header>

      <div className="gig-head">
        <span className="gig-kicker">Glücksrad-Event · nur 17. + 18. Oktober</span>
        <h1 className="gig-title" data-text="GIG">GIG</h1>
        <span className="gig-timer"><Icon name="clock" size={16} />{active ? `endet in ${left}` : 'Event vorbei'}</span>
      </div>

      <section className="gig-stage">
        <div className="gig-wheel-wrap">
          <div className="gig-bulbs" aria-hidden="true">{Array.from({ length: 24 }, (_, i) => <i key={i} style={{ transform: `rotate(${i * 15}deg) translateY(-50%)` }} />)}</div>
          <svg className="gig-pointer" viewBox="0 0 40 46" aria-hidden="true"><path d="M20 46 L4 8 Q20 -4 36 8 Z" /></svg>
          <svg className="gig-wheel" viewBox="-160 -160 320 320" role="img" aria-label="Glücksrad"
            style={{ transform: `rotate(${rot}deg)` }} onTransitionEnd={finish}>
            <defs>
              <radialGradient id="gig-gold" cx="0" cy="0" r="1"><stop offset="0" stopColor="#fff6c8" /><stop offset="1" stopColor="#ffb800" /></radialGradient>
            </defs>
            <circle r="156" className="gig-rim" />
            {SEGS.map((s, i) => (
              <g key={s.p.id} className={`gig-seg s-${s.p.id} ${i % 2 ? 'odd' : 'even'}`}>
                <path d={arc(s.a0, s.a1)} />
                {s.p.kind === 'card'
                  ? <text transform={`rotate(${s.c}) translate(0 ${-R + 18})`} className="gig-seg-jack">95</text>
                  : <text transform={`rotate(${s.c}) translate(0 ${-R * 0.6}) rotate(${s.c < 180 ? -90 : 90})`} className="gig-seg-label">{SHORT[s.p.id]}</text>}
              </g>
            ))}
            <circle r="46" className="gig-hub-ring" />
          </svg>
          <button className="gig-hub" onClick={spin} disabled={!can} aria-label={free ? 'Gratis drehen' : `Drehen für ${fmt(GIG_SPIN_PRICE)} Coins`}>
            <span>{spinning ? '…' : 'DREH'}</span>
          </button>
        </div>

        <div className="gig-side">
          <div className="gig-card">
            <span className="gig-card-odds">Jackpot · {gigPercent(GIG_WHEEL.find((p) => p.kind === 'card')!).toString().replace('.', ',')} %</span>
            <UtCard card={card} size="lg" shine />
          </div>
          <button className="btn primary big gig-spin" onClick={spin} disabled={!can}>
            {spinning ? 'Das Rad dreht …' : free ? 'Gratis drehen' : <><span>Drehen</span><small><Icon name="coin" size={14} className="coin-ic" />{fmt(GIG_SPIN_PRICE)}</small></>}
          </button>
          <p className="gig-note">{free ? 'Heute ist ein Dreh gratis.' : 'Morgen gibt es wieder einen Gratis-Dreh.'} {lastWin ? `Zuletzt: ${lastWin.kind === 'card' ? 'JACKPOT!' : SHORT[lastWin.id]}` : ''}</p>
        </div>
      </section>

      <h2 className="hub-section">Chancen pro Dreh</h2>
      <ul className="gig-odds">
        {[...GIG_WHEEL].sort((a, b) => a.weight - b.weight).map((p) => (
          <li key={p.id} className={`s-${p.id}`}><i aria-hidden="true" /><span>{p.kind === 'card' ? `${card.name} 95 (GIG)` : SHORT[p.id] + '-Pack'}</span><b>{gigPercent(p).toString().replace('.', ',')} %</b></li>
        ))}
      </ul>
      <p className="hint">Hast du die GIG-Karte schon, gibt es beim Jackpot {fmt(GIG_DUPLICATE_COINS)} Coins. Die Karte gibt es nur über dieses Rad.</p>

      {jackpot && <div className="gig-flash" aria-hidden="true" />}
      {opening && <PackOpening name={opening.name} result={opening.result} onClose={() => setOpening(null)} onCollection={() => { setOpening(null); onCollection(); }} />}
    </main>
  );
}
