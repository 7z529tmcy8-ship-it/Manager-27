import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { getClubState, setClubState, useClub } from '../clubStore';
import {
  FLEX, ITEMS, SLOTS, auraOf, buyItem, canFlexNow, doFlex, flexUsed, honestPost, itemById, larpOf, larpRisk, sellItem, sellValue,
  statusCap, takeOff, wearItem, type LookItem, type LookSlot,
} from '../game/larp';
import { fmtFollowers, gramOf } from '../game/kickgram';
import type { Career } from '../game/types';
import { play } from '../sound';
import Icon from './Icon';
import LarpGlyph from './LarpGlyph';

const fmt = (n: number) => n.toLocaleString('de-DE');
const sfx = (id: Parameters<typeof play>[0]) => { try { play(id); } catch { /* kein Ton */ } };
const buzz = (p: number | number[]) => { try { navigator.vibrate?.(p); } catch { /* egal */ } };

/** Zone des Larp-Zählers. */
export const zoneOf = (risk: number) => (risk >= 40 ? { id: 'alarm', name: 'Larp-Alarm' } : risk >= 15 ? { id: 'sus', name: 'Verdächtig' } : { id: 'old', name: 'Old Money' });

/** Zahl zählt weich hoch/runter (0,5 s). */
export function useCount(target: number, ms = 500): number {
  const [v, setV] = useState(target);
  const from = useRef(target);
  useEffect(() => {
    const start = performance.now();
    const a = from.current;
    let raf = 0;
    const tick = (t: number) => {
      const k = Math.min(1, (t - start) / ms);
      const e = 1 - (1 - k) ** 3;
      setV(Math.round(a + (target - a) * e));
      if (k < 1) raf = requestAnimationFrame(tick); else from.current = target;
    };
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); from.current = target; };
  }, [target, ms]);
  return v;
}

/** Halbkreis-Tacho mit drei Zonen; die Nadel dreht per transform. */
export function Gauge({ risk }: { risk: number }) {
  const deg = -90 + (Math.min(85, risk) / 85) * 180;
  return (
    <svg className="lp-gauge" viewBox="0 0 120 70" aria-hidden="true">
      <path d="M12 62a48 48 0 0 1 26-42.6" className="z-old" />
      <path d="M41.5 17.6a48 48 0 0 1 37 0" className="z-sus" />
      <path d="M82 19.4A48 48 0 0 1 108 62" className="z-alarm" />
      <g className="lp-needle" style={{ transform: `rotate(${deg}deg)` }}><path d="M60 62 60 22" /><circle cx="60" cy="62" r="4.5" /></g>
    </svg>
  );
}

type Float = { id: number; text: string; tone: 'gold' | 'red' | 'green' };

/** LARP-Modus: Fit-Check, Larp-Zähler, Flex-Aktionen und Kleiderschrank. */
export default function LookPanel({ career, onChange, onClose }: { career: Career; onChange: (c: Career) => void; onClose: () => void }) {
  const club = useClub();
  const l = larpOf(career);
  const aura = auraOf(career);
  const cap = statusCap(career);
  const risk = larpRisk(career);
  const zone = zoneOf(risk);
  const shownAura = useCount(aura);
  const shownRisk = useCount(risk);
  const [tab, setTab] = useState<LookSlot>('schuhe');
  const [floats, setFloats] = useState<Float[]>([]);
  const [pop, setPop] = useState<LookSlot | null>(null);
  const [shake, setShake] = useState(0);
  const inBreak = career.phase === 'winter' || career.phase === 'window';

  const float = (text: string, tone: Float['tone']) => {
    const id = Date.now() + Math.random();
    setFloats((f) => [...f, { id, text, tone }]);
    setTimeout(() => setFloats((f) => f.filter((x) => x.id !== id)), 1100);
  };
  /** Gemeinsame Rückmeldung nach jeder Änderung: Aura-Sprung, Zonenwechsel. */
  const commit = (next: Career, slot?: LookSlot) => {
    const da = auraOf(next) - aura;
    const before = zoneOf(risk).id;
    const after = zoneOf(larpRisk(next)).id;
    onChange(next);
    if (slot) { setPop(slot); setTimeout(() => setPop(null), 420); }
    if (da > 0) float(`+${da} Aura`, 'gold');
    if (after !== before && after === 'alarm') { setShake((s) => s + 1); sfx('fall'); buzz([60, 40, 120]); float('Larp-Alarm!', 'red'); }
    else if (da > 0) { sfx('rise'); buzz(18); }
  };

  const buy = (it: LookItem) => {
    const res = buyItem(career, it.id, getClubState().coins);
    if (!res) { sfx('error'); return; }
    const c = getClubState();
    setClubState({ ...c, coins: c.coins - res.cost });
    sfx('spend');
    commit(res.career, it.slot);
  };
  const sell = (it: LookItem) => {
    if (!window.confirm(it.fake ? `${it.name} wegwerfen? Replikas kauft dir keiner ab.` : `${it.name} für ${fmt(sellValue(it))} Coins verkaufen?`)) return;
    const res = sellItem(career, it.id);
    if (!res) return;
    if (res.coins) { const c = getClubState(); setClubState({ ...c, coins: c.coins + res.coins }); sfx('coin'); }
    commit(res.career);
  };
  const flex = (id: string) => {
    const res = doFlex(career, id, getClubState().coins);
    if (!res) { sfx('error'); return; }
    if (res.cost) { const c = getClubState(); setClubState({ ...c, coins: c.coins - res.cost }); }
    float(`+${fmtFollowers(res.gained)} Follower`, 'green');
    sfx('fanfare'); buzz([20, 30, 60]);
    commit(res.career);
  };

  const items = ITEMS.filter((i) => i.slot === tab);
  return createPortal(
    <div className="overlay lp" role="dialog" aria-modal="true" aria-label="Look">
      <div className="overlay-inner lp-inner">
        <header className="lp-head">
          <button className="lp-back" onClick={onClose}>‹ Zurück</button>
          <span className="lp-coins"><Icon name="coin" size={15} className="coin-ic" />{fmt(club.coins)}</span>
        </header>
        <p className="lp-kicker">Eppendorf · Saison {career.year}/{String((career.year + 1) % 100).padStart(2, '0')}</p>
        <h2 className="lp-title">Old Money</h2>

        {/* Held: Fit-Check-Karte */}
        <section className={`lp-fit z-${zone.id}`} key={`shake-${shake}`}>
          <div className="lp-outfit">
            {SLOTS.map((s) => {
              const it = itemById(l.worn[s.id]);
              return (
                <button key={s.id} className={`lp-slot ${it ? 'on' : ''} ${it?.fake ? 'fake' : ''} ${pop === s.id ? 'pop' : ''}`} onClick={() => setTab(s.id)} aria-label={`${s.name}: ${it?.name ?? 'leer'}`}>
                  <LarpGlyph id={it?.icon ?? 'empty'} size={30} />
                  <small>{it ? `+${it.aura}` : s.name}</small>
                </button>
              );
            })}
          </div>
          <div className="lp-stats">
            <div className="lp-aura">
              <small>Aura</small>
              <b>{shownAura}</b>
              <span className="lp-floats" aria-live="polite">{floats.map((f) => <i key={f.id} className={`lp-float ${f.tone}`}>{f.text}</i>)}</span>
            </div>
            <div className="lp-meter">
              <Gauge risk={risk} />
              <b className="lp-risk">{shownRisk}%</b>
              <small className="lp-zone">{zone.name}</small>
            </div>
          </div>
          <p className="lp-fit-foot">
            Dein Stand: <b>{cap}</b> Aura nimmt man dir ab · Follower +{aura}% · {fmtFollowers(gramOf(career).followers)} Follower
          </p>
        </section>

        {l.note && <p className={`lp-note ${l.note.startsWith('Larp entlarvt') ? 'bad' : 'good'}`}>{l.note}{l.exposed > 0 ? ` · Schon ${l.exposed}× aufgeflogen.` : ''}</p>}
        {risk > 0 && !l.honest && (
          <button className="lp-honest" onClick={() => { commit(honestPost(career)); sfx('notify'); float('Risiko halbiert', 'green'); }}>
            Ehrlicher Post: „Ist alles nur geliehen“ <small>−5 % Follower · Risiko halbiert</small>
          </button>
        )}
        {l.honest && risk > 0 && <p className="lp-note good">Ehrlicher Post ist raus – Risiko bis Saisonende halbiert.</p>}

        {/* Flex-Aktionen */}
        <h3 className="lp-h">Auftritt der Pause <small>{flexUsed(career) ? 'erledigt – nächste Pause wieder' : inBreak ? 'eine Aktion pro Pause' : 'nur in Winterpause und Sommer'}</small></h3>
        <div className="lp-flex">
          {FLEX.map((f) => {
            const done = flexUsed(career) && l.flexId === f.id;
            const why = !inBreak ? 'Nur in der Pause' : done ? 'Gepostet ✓' : flexUsed(career) ? 'Diese Pause schon geflext' : club.coins < f.price ? `Fehlen ${fmt(f.price - club.coins)}` : '';
            return (
              <button key={f.id} className={`lp-flex-card ${f.heat ? 'risky' : 'safe'} ${done ? 'done' : ''}`} disabled={!!why || !canFlexNow(career)} onClick={() => flex(f.id)}>
                <span className="lp-flex-ic"><LarpGlyph id={f.icon} size={26} /></span>
                <b>{f.name}</b>
                <small>{f.text}</small>
                <span className="lp-flex-tags">
                  <em className="g">+{f.gain}% Follower</em>
                  <em className={f.heat ? 'r' : 's'}>{f.heat ? `+${f.heat} Verdacht` : 'sicher'}</em>
                </span>
                <span className="lp-flex-price">{why || (f.price ? `${fmt(f.price)} Coins` : 'gratis')}</span>
              </button>
            );
          })}
        </div>

        {/* Kleiderschrank */}
        <h3 className="lp-h">Kleiderschrank</h3>
        <div className="lp-tabs" role="tablist">
          {SLOTS.map((s) => (
            <button key={s.id} role="tab" aria-selected={tab === s.id} className={tab === s.id ? 'on' : ''} onClick={() => setTab(s.id)}>{s.name}</button>
          ))}
        </div>
        <div className="lp-grid">
          {items.map((it) => {
            const owned = l.owned.includes(it.id);
            const worn = l.worn[it.slot] === it.id;
            const short = club.coins < it.price;
            return (
              <div key={it.id} className={`lp-item ${it.fake ? 'fake' : ''} ${worn ? 'worn' : ''}`}>
                {it.fake && <span className="lp-ribbon">Replika</span>}
                <span className="lp-item-ic"><LarpGlyph id={it.icon} size={34} /></span>
                <b>{it.name.replace(' (Replika)', '')}</b>
                <small>{it.text}</small>
                <span className="lp-item-aura">Aura +{it.aura}{it.fake ? ' · +12 % Risiko' : ''}</span>
                {!owned && <button className="lp-buy" disabled={short} onClick={() => buy(it)}>{short ? `Fehlen ${fmt(it.price - club.coins)}` : <><Icon name="coin" size={13} className="coin-ic" />{fmt(it.price)}</>}</button>}
                {owned && !worn && <button className="lp-wear" onClick={() => commit(wearItem(career, it.id), it.slot)}>Anziehen</button>}
                {owned && worn && <button className="lp-wear on" onClick={() => commit(takeOff(career, it.slot))}>Getragen · ausziehen</button>}
                {owned && <button className="lp-sell" onClick={() => sell(it)}>{it.fake ? 'Wegwerfen' : `Verkaufen · ${fmt(sellValue(it))}`}</button>}
              </div>
            );
          })}
        </div>
        <p className="lp-fine">Marken nur als Text, keine Logos. Originale bringen beim Verkauf die Hälfte zurück. Am Saisonende kommt der Fit-Check.</p>
      </div>
    </div>,
    document.body,
  );
}
