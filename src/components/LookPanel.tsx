import { getClubState, setClubState, useClub } from '../clubStore';
import { ITEMS, SLOTS, auraOf, buyItem, honestPost, itemById, larpOf, larpRisk, sellItem, sellValue, statusCap, takeOff, wearItem, type LookItem } from '../game/larp';
import type { Career } from '../game/types';
import { play } from '../sound';
import Icon from './Icon';

const fmt = (n: number) => n.toLocaleString('de-DE');
const sfx = (id: Parameters<typeof play>[0]) => { try { play(id); } catch { /* kein Ton */ } };

/** LARP-Modus: Kleiderschrank mit Aura, getragener Look und der Larp-Zähler. */
export default function LookPanel({ career, onChange, onClose }: { career: Career; onChange: (c: Career) => void; onClose: () => void }) {
  const club = useClub();
  const l = larpOf(career);
  const aura = auraOf(career);
  const cap = statusCap(career);
  const risk = larpRisk(career);
  const tone = risk >= 40 ? 'bad' : risk >= 15 ? 'warn' : 'good';

  const buy = (it: LookItem) => {
    const res = buyItem(career, it.id, getClubState().coins);
    if (!res) return;
    const c = getClubState();
    setClubState({ ...c, coins: c.coins - res.cost });
    onChange(res.career);
    sfx('coin');
  };
  const sell = (it: LookItem) => {
    const v = sellValue(it);
    if (!window.confirm(it.fake ? `${it.name} wegwerfen? Replikas kauft dir keiner ab.` : `${it.name} für ${fmt(v)} Coins verkaufen?`)) return;
    const res = sellItem(career, it.id);
    if (!res) return;
    if (res.coins) { const c = getClubState(); setClubState({ ...c, coins: c.coins + res.coins }); }
    onChange(res.career);
  };

  return (
    <div className="overlay fam-overlay look-panel" role="dialog" aria-modal="true" aria-label="Look">
      <div className="overlay-inner">
        <header className="overlay-head">
          <button className="nav-back" onClick={onClose}>‹ Zurück</button>
          <span className="hub-coins"><Icon name="coin" size={16} className="coin-ic" />{fmt(club.coins)}</span>
        </header>
        <h2 className="fam-title">Look · Old Money</h2>
        <p className="cs-sub">
          Kleidung gibt Aura – und Aura bringt mehr Kickgram-Follower und Likes. Aber Vorsicht: Wer mehr Flex zeigt, als zu
          seinem Stand passt, oder Replikas trägt, kann am Saisonende auffliegen.
        </p>

        <div className="look-meters">
          <div className="look-meter">
            <span>Aura</span>
            <b>{aura}</b>
            <small>+{aura}% Follower-Wachstum</small>
          </div>
          <div className="look-meter">
            <span>Dein Stand</span>
            <b>{cap}</b>
            <small>so viel Aura nimmt man dir ab</small>
          </div>
          <div className={`look-meter larp ${tone}`}>
            <span>Larp-Zähler</span>
            <b>{risk}%</b>
            <small>Risiko, am Saisonende aufzufliegen</small>
          </div>
        </div>
        <div className={`look-bar ${tone}`} aria-hidden="true"><i style={{ width: `${risk}%` }} /></div>

        {l.note && <p className={`cs-note ${l.note.startsWith('Larp entlarvt') ? 'bad' : 'good'}`}>{l.note}</p>}
        {l.exposed > 0 && <p className="cs-sub">Schon {l.exposed}× aufgeflogen.</p>}
        {risk > 0 && (
          l.honest
            ? <p className="cs-note neutral">Ehrlicher Post ist raus – dein Risiko ist bis Saisonende halbiert.</p>
            : <button className="btn secondary look-honest" onClick={() => onChange(honestPost(career))}>Ehrlicher Post: „Ist alles nur geliehen“ <small>−5 % Follower, Risiko halbiert</small></button>
        )}

        <h3 className="look-h">Getragen</h3>
        <div className="look-worn">
          {SLOTS.map((s) => {
            const it = itemById(l.worn[s.id]);
            return (
              <div key={s.id} className={`look-slot ${it ? 'on' : ''} ${it?.fake ? 'fake' : ''}`}>
                <small>{s.name}</small>
                <b>{it ? it.name : '–'}</b>
                {it && <em>Aura +{it.aura}</em>}
                {it && <button className="cs-link" onClick={() => onChange(takeOff(career, s.id))}>Ausziehen</button>}
              </div>
            );
          })}
        </div>

        {SLOTS.map((s) => (
          <section key={s.id} className="look-group">
            <h3 className="look-h">{s.name}</h3>
            {ITEMS.filter((i) => i.slot === s.id).map((it) => {
              const owned = l.owned.includes(it.id);
              const worn = l.worn[s.id] === it.id;
              return (
                <div key={it.id} className={`look-item ${it.fake ? 'fake' : ''} ${worn ? 'worn' : ''}`}>
                  <div className="look-item-text">
                    <b>{it.name}</b>
                    <small>{it.text}</small>
                    <span className="look-tags">
                      <em>Aura +{it.aura}</em>
                      {it.fake && <em className="look-fake">Replika: riskant</em>}
                    </span>
                  </div>
                  <div className="look-item-act">
                    {!owned && (
                      <button className="btn primary small" disabled={club.coins < it.price} onClick={() => buy(it)}>
                        <Icon name="coin" size={14} className="coin-ic" />{fmt(it.price)}
                      </button>
                    )}
                    {owned && !worn && <button className="btn secondary small" onClick={() => onChange(wearItem(career, it.id))}>Anziehen</button>}
                    {owned && worn && <span className="look-on">Getragen</span>}
                    {owned && <button className="cs-link" onClick={() => sell(it)}>{it.fake ? 'Wegwerfen' : `Verkaufen (${fmt(sellValue(it))})`}</button>}
                  </div>
                </div>
              );
            })}
          </section>
        ))}
        <p className="hint">Marken nur als Text – keine echten Logos. Originale bringen beim Verkauf die Hälfte zurück.</p>
      </div>
    </div>
  );
}
