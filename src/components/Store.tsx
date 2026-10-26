import { PASS_XP, addPassXp } from '../game/pass';
import { useEffect, useState, type CSSProperties } from 'react';
import { play } from '../sound';
import { ITEMS, PACKS, TOTW_PACK, activePacks, openStoredPack, isoWeek, oddsAtLeast, openMegaSuper, openPack, openTotwPack, packTier, rarity, teamOfTheWeek, type PackDef, type PackResult } from '../game/club';
import { getClubState, setClubState, useClub } from '../clubStore';
import { motionReduced } from '../settings';
import Confetti from './Confetti';
import UtCard from './UtCard';
import Icon, { Glyph } from './Icon';

const fmtCoins = (n: number) => n.toLocaleString('de-DE');

/** Store: Packs mit Coins kaufen. Das erste Gold-Pack ist gratis. */
export default function Store({ onBack, onCollection }: { onBack: () => void; onCollection: () => void }) {
  const club = useClub();
  const [opening, setOpening] = useState<{ result: PackResult; name: string; theme?: string; art?: string; packId: string; free: boolean; n: number } | null>(null);
  const [mega, setMega] = useState(false);
  const [superPack, setSuperPack] = useState<PackResult | null>(null);
  const [superCharging, setSuperCharging] = useState(false);

  const buy = (packId: string, free = false) => {
    if (packId === TOTW_PACK.id) {
      const res = openTotwPack(getClubState());
      if (!res) return;
      setClubState(addPassXp(res.club, PASS_XP.pack));
      setOpening((o) => ({ result: res.result, name: TOTW_PACK.name, packId, free: false, n: (o?.n ?? 0) + 1 }));
      return;
    }
    const res = openPack(getClubState(), packId, Math.random, free);
    if (!res) return;
    setClubState(free ? { ...res.club, welcomeClaimed: true } : addPassXp(res.club, PASS_XP.pack));
    const def = PACKS.find((p) => p.id === packId)!;
    setOpening((o) => ({ result: res.result, name: def.name, theme: def.event === 'geisternacht' ? 'halloween' : def.event, art: PACK_ART[def.id], packId, free, n: (o?.n ?? 0) + 1 }));
  };

  return (
    <main className="hub">
      <header className="hub-top">
        <button className="hub-back" onClick={onBack}>‹ Hauptmenü</button>
        <span className="hub-coins"><Icon name="coin" size={16} className="coin-ic" />{fmtCoins(club.coins)}</span>
      </header>
      <h1 className="hub-title">Store</h1>
      <p className="hub-sub">Coins verdienst du in deinen Karrieren: pro Saison für Spiele, Tore, Vorlagen, Titel, Erfolge und Sonderkarten.</p>

      {!club.megaSuperClaimed && (
        <button className="mega-xxl super" onClick={() => {
          const res = openMegaSuper(getClubState());
          if (!res) return;
          setClubState(res.club);
          setSuperPack(res.result);
          setSuperCharging(true);
        }}>
          <span className="mx-bolt l" aria-hidden="true"><Icon name="bolt" /></span>
          <span className="mx-text">
            <small>Einmalig · Gratis</small>
            <strong>MEGA SUPER XXL PACK</strong>
            <em>8 Karten ab 85 + Sonderkarte Gervinho (89)</em>
          </span>
          <span className="mx-bolt r" aria-hidden="true"><Icon name="bolt" /></span>
        </button>
      )}

      {!club.megaXxlClaimed && (
        <button className="mega-xxl" onClick={() => {
          // Einmalig: sofort als geöffnet merken – auch wenn danach „der Server abstürzt“.
          setClubState({ ...getClubState(), megaXxlClaimed: true });
          setMega(true);
        }}>
          <span className="mx-bolt l" aria-hidden="true"><Icon name="bolt" /></span>
          <span className="mx-text">
            <small>Einmalig · Gratis</small>
            <strong>MEGA XXL PACK</strong>
            <em>50 Karten · garantiert 10 Ikonen</em>
          </span>
          <span className="mx-bolt r" aria-hidden="true"><Icon name="bolt" /></span>
        </button>
      )}

      {!club.welcomeClaimed && (
        <button className="hub-tile accent welcome" onClick={() => buy('gold', true)}>
          <span className="hub-tile-icon" aria-hidden="true"><Icon name="gift" /></span>
          <strong>Willkommens-Pack</strong>
          <small>Ein Gold-Pack geschenkt – jetzt öffnen!</small>
        </button>
      )}

      <StoredPacks onOpen={(r) => setOpening((o) => ({ result: r.result, name: r.name, packId: '', free: true, n: (o?.n ?? 0) + 1 }))} />

      <TotwSection coins={club.coins} onBuy={() => buy(TOTW_PACK.id)} />

      {STORE_GROUPS.map((g) => {
        const packs = activePacks().filter((p) => storeGroup(p) === g.id);
        if (!packs.length) return null;
        return (
          <section key={g.id} className={`store-group sg-${g.id}`} aria-label={g.title}>
            <h2 className="store-group-head"><Icon name={g.icon} size={18} />{g.title}<small>{g.sub}</small></h2>
            <div className="store-grid">
              {packs.map((p) => {
          const afford = club.coins >= p.price;
          return (
            <div key={p.id} className={`pack-card p-${p.id} ${p.event ? `ev-${p.event}` : ''}`}>
              {PACK_ART[p.id]
                ? <div className="pack-art has-art" aria-hidden="true" style={{ backgroundImage: `url(${PACK_ART[p.id]})` }} />
                : <div className="pack-art" aria-hidden="true"><span>{p.name.replace('-Pack', '')}</span></div>}
              <strong>{p.name}</strong>
              <small>{p.text}</small>
              <PackOddsLine pack={p} />
              <button className="btn primary" disabled={!afford} onClick={() => buy(p.id)} aria-label={afford ? `${p.name} öffnen für ${fmtCoins(p.price)} Coins` : `Dir fehlen ${fmtCoins(p.price - club.coins)} Coins`}>
                <Icon name="coin" size={16} className="coin-ic" />{afford ? fmtCoins(p.price) : `−${fmtCoins(p.price - club.coins)}`}
              </button>
            </div>
          );
        })}
            </div>
          </section>
        );
      })}

      {mega && <MegaCrash onDone={onBack} />}
      {superPack && superCharging && <MegaCharge title={'MEGA<br />SUPER<br />XXL'} onDone={() => setSuperCharging(false)} />}
      {superPack && !superCharging && (
        <PackOpening name="MEGA SUPER XXL PACK" result={superPack} onClose={() => setSuperPack(null)} onCollection={() => { setSuperPack(null); onCollection(); }} />
      )}

      {opening && (
        <PackOpening
          key={opening.n}
          name={opening.name}
          theme={opening.theme}
          art={opening.art}
          result={opening.result}
          onClose={() => setOpening(null)}
          onCollection={() => { setOpening(null); onCollection(); }}
          again={opening.free ? undefined : (() => {
            const price = opening.packId === TOTW_PACK.id ? TOTW_PACK.price : PACKS.find((p) => p.id === opening.packId)!.price;
            return { price, can: club.coins >= price, onClick: () => buy(opening.packId) };
          })()}
        />
      )}
    </main>
  );
}

/** Neon-Aufladen vor dem echten Mega Super XXL Pack (gleiche Effekte wie beim Mega-XXL-Pack). */
function MegaCharge({ title, onDone }: { title: string; onDone: () => void }) {
  useEffect(() => {
    play('packShake');
    const t = setTimeout(onDone, motionReduced() ? 600 : 2600);
    return () => clearTimeout(t);
  }, [onDone]);
  return (
    <div className="mega-open st-charge super" role="dialog" aria-modal="true" aria-label="Mega Super XXL Pack">
      <div className="mega-stage" aria-hidden="true">
        <div className="mega-pack"><span dangerouslySetInnerHTML={{ __html: title }} /></div>
        <i className="mega-flash" />
      </div>
    </div>
  );
}

/** Das „Mega-XXL-Pack“: lädt sich auf – und dann stürzt der Server ab. Danach geht es ins Hauptmenü. */
function MegaCrash({ onDone }: { onDone: () => void }) {
  const [stage, setStage] = useState<'charge' | 'crash' | 'reboot'>('charge');
  const [code] = useState(() => `0x${Math.floor(Math.random() * 0xffffff).toString(16).toUpperCase().padStart(6, '0')}`);
  useEffect(() => {
    if (stage === 'charge') {
      play('packShake');
      const t = setTimeout(() => setStage('crash'), motionReduced() ? 600 : 2600);
      return () => clearTimeout(t);
    }
    if (stage === 'crash') {
      play('error');
      const t = setTimeout(() => setStage('reboot'), 3200);
      return () => clearTimeout(t);
    }
    const t = setTimeout(onDone, 2600);
    return () => clearTimeout(t);
  }, [stage, onDone]);

  return (
    <div className={`mega-open st-${stage}`} role="alertdialog" aria-modal="true" aria-label="Mega-XXL-Pack">
      {stage === 'charge' && (
        <div className="mega-stage" aria-hidden="true">
          <div className="mega-pack"><span>MEGA<br />XXL</span></div>
          <i className="mega-flash" />
        </div>
      )}
      {stage !== 'charge' && (
        <div className="crash-box">
          <p className="crash-icon" aria-hidden="true"><Icon name="warn" size={40} /></p>
          <h2>{stage === 'crash' ? 'Interner Serverfehler (500)' : 'Verbindung wird wiederhergestellt …'}</h2>
          <p>{stage === 'crash'
            ? 'Beim Öffnen des Packs ist der Pack-Server abgestürzt. Zu viele Anfragen gleichzeitig.'
            : 'Die Sitzung wurde zurückgesetzt. Du wirst zum Hauptmenü weitergeleitet.'}</p>
          <code>PACK_SERVER_CRASH · {code}</code>
          {stage === 'reboot' && <span className="crash-bar"><i /></span>}
        </div>
      )}
    </div>
  );
}

/** Auswahl nach einem gewonnenen Pack: sofort öffnen oder in die Ablage (später im Store öffnen). */
export function PackPrompt({ packs, onOpen, onStore }: { packs: string[]; onOpen: () => void; onStore: () => void }) {
  // Gleiche Packs zusammenfassen: „2× Ultimate-Pack“
  const counts = new Map<string, number>();
  for (const id of packs) counts.set(id, (counts.get(id) ?? 0) + 1);
  const names = [...counts].map(([id, n]) => `${n > 1 ? `${n}× ` : ''}${PACKS.find((p) => p.id === id)?.name ?? id}`);
  return (
    <div className="reward pack-prompt" role="dialog" aria-modal="true" aria-label="Packs öffnen oder ablegen">
      <div className="reward-card">
        <h2>{packs.length === 1 ? 'Pack bekommen' : `${packs.length} Packs bekommen`}</h2>
        <ul className="cr-packs">{names.map((n, i) => <li key={`${n}-${i}`} className="cr-pack"><Icon name="pack" size={20} /><span>{n}</span></li>)}</ul>
        <p className="muted">Du kannst sie jetzt öffnen – oder in die Ablage legen und später im Store öffnen.</p>
        <div className="pack-prompt-actions">
          <button className="btn secondary big" onClick={onStore}><Icon name="folder" size={18} /> In die Ablage</button>
          <button className="btn primary big" onClick={onOpen}><Icon name="pack" size={18} /> Jetzt öffnen</button>
        </div>
      </div>
    </div>
  );
}

/** Ablage: gewonnene, noch ungeöffnete Packs. */
function StoredPacks({ onOpen }: { onOpen: (res: { name: string; result: PackResult }) => void }) {
  const club = useClub();
  const list = club.storedPacks ?? [];
  if (!list.length) return null;
  const open = (id: string) => {
    const res = openStoredPack(getClubState(), id);
    if (!res) return;
    setClubState(res.club);
    onOpen({ name: res.name, result: res.result });
  };
  const openAll = () => {
    let club = getClubState();
    const cards: PackResult['cards'] = [];
    const items: PackResult['items'] = [];
    for (const sp of club.storedPacks ?? []) {
      const res = openStoredPack(club, sp.id);
      if (!res) continue;
      club = res.club;
      cards.push(...res.result.cards);
      items.push(...res.result.items);
    }
    cards.sort((a, b) => rarity(b.card) - rarity(a.card));
    setClubState(club);
    if (cards.length) onOpen({ name: `${list.length} Packs aus der Ablage`, result: { cards, items } });
  };
  return (
    <section className="store-group sg-stored" aria-label="Deine Packs">
      <h2 className="store-group-head"><Icon name="folder" size={18} />Deine Packs<small>{list.length} in der Ablage</small></h2>
      {list.length > 1 && <button className="btn primary stored-all" onClick={openAll}><Icon name="pack" size={18} /> Alle {list.length} öffnen</button>}
      <ul className="stored-list">
        {list.map((sp) => {
          const def = PACKS.find((p) => p.id === sp.pack);
          return (
            <li key={sp.id} className={`stored-pack p-${sp.pack}`}>
              <span className="pack-art mini" aria-hidden="true"><span>{(def?.name ?? sp.pack).replace('-Pack', '')}</span></span>
              <span className="stored-text"><strong>{def?.name ?? sp.pack}</strong><small>{sp.from}</small></span>
              <button className="btn primary small" onClick={() => open(sp.id)}>Öffnen</button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** Store-Bereiche: zeitlich begrenzte Event-Packs, Spezial-Packs mit garantierten Sonderkarten, normale Packs. */
const SPECIAL_PACKS = new Set(['wonder', 'cult', 'debut', 'comeback', 'flashback', 'worldstar', 'icon', 'ultimate', 'goat']);
type StoreGroupId = 'event' | 'special' | 'standard';
const storeGroup = (p: { id: string; event?: string }): StoreGroupId => (p.event ? 'event' : SPECIAL_PACKS.has(p.id) ? 'special' : 'standard');
const STORE_GROUPS: { id: StoreGroupId; title: string; sub: string; icon: 'spark' | 'crown' | 'pack' }[] = [
  { id: 'event', title: 'Event-Packs', sub: 'Nur für kurze Zeit', icon: 'spark' },
  { id: 'special', title: 'Spezial-Packs', sub: 'Garantierte Sonderkarten', icon: 'crown' },
  { id: 'standard', title: 'Standard-Packs', sub: 'Für jeden Tag', icon: 'pack' },
];

/** Eigene Pack-Grafiken (Halloween). */
const PACK_ART: Record<string, string> = {
  pumpkin: `${import.meta.env.BASE_URL}pack-pumpkin.webp`,
  ghosthour: `${import.meta.env.BASE_URL}pack-ghost.webp`,
};

type Phase = 'pack' | 'burst' | 'walkout' | 'reveal' | 'all';

const FLIP_GAP = 140; // ms zwischen zwei Karten beim Aufdecken

/**
 * Pack-Öffnung: Das Pack lädt sich auf und leuchtet in der Farbe der besten Karte, reißt mit einem Blitz auf,
 * bei seltenen Karten folgt ein „Walkout“ (Nation → Position → Verein), dann die Karte – am Ende drehen sich alle Karten einzeln um.
 */
export function PackOpening({ name, result, onClose, onCollection, theme, art, again }: {
  name: string; result: PackResult; onClose: () => void; onCollection: () => void; theme?: string; art?: string;
  /** „Nochmal kaufen“: dasselbe Pack direkt erneut öffnen. */
  again?: { price: number; can: boolean; onClick: () => void };
}) {
  const artStyle = art ? { backgroundImage: `url(${art})` } : undefined;
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
    <div className={`pack-open ph-${phase} tier-${tier} ${special ? 'special' : ''} ${theme ? `theme-${theme}` : ''}`} role="dialog" aria-modal="true" aria-label={`${name} öffnen`}>
      {phase !== 'all' && <button className="pack-skip" onClick={() => setPhase('all')}>Überspringen <Icon name="arrow" size={16} /></button>}

      {phase === 'pack' && (
        <div className="pack-stage" aria-hidden="true">
          <div className="pack-halo" />
          <div className={`pack-big ${art ? 'has-art' : ''}`} style={artStyle}><PackFace name={name} /></div>
          <div className="pack-sparks">{Array.from({ length: 10 }, (_, i) => <i key={i} style={{ '--i': i } as CSSProperties} />)}</div>
        </div>
      )}

      {phase === 'burst' && (
        <div className="pack-stage" aria-hidden="true">
          <div className="pack-flash" />
          <div className={`pack-big half l ${art ? 'has-art' : ''}`} style={artStyle}><PackFace name={name} /></div>
          <div className={`pack-big half r ${art ? 'has-art' : ''}`} style={artStyle}><PackFace name={name} /></div>
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
          <div className="reveal-floor" aria-hidden="true" />
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
            <p key={i} className="pack-item"><Glyph e={ITEMS[k].icon} /> {ITEMS[k].name}: {ITEMS[k].text}</p>
          ))}
          <div className="pack-actions">
            {flipping && result.cards.length > 1 && <button className="btn secondary big pack-revealall" onClick={() => setInstant(true)}>Alle aufdecken</button>}
            {again ? (
              <>
                <button className="btn secondary big pack-half" onClick={onClose}>Fertig</button>
                <button className="btn primary big pack-half" disabled={!again.can} onClick={again.onClick}>
                  Noch ein Pack<small>{again.can ? `${again.price.toLocaleString('de-DE')} Coins` : 'zu wenig Coins'}</small>
                </button>
              </>
            ) : (
              <>
                <button className="btn secondary big" onClick={onCollection}>Zur Sammlung</button>
                <button className="btn primary big" onClick={onClose}>Fertig</button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/** Vorderseite des Packs: Folie mit Falzkanten, Logo-Blitz und Name. */
function PackFace({ name }: { name: string }) {
  return (
    <>
      <i className="pack-crimp t" aria-hidden="true" />
      <i className="pack-crimp b" aria-hidden="true" />
      <span className="pack-kicker">Manager Sim</span>
      <span className="pack-logo" aria-hidden="true"><Icon name="bolt" size={40} /></span>
      <span>{name}</span>
    </>
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

/** Team der Woche: die Elf dieser Kalenderwoche und das passende Pack. */
function TotwSection({ coins, onBuy }: { coins: number; onBuy: () => void }) {
  const week = isoWeek();
  const eleven = teamOfTheWeek();
  const next = new Date(week.monday);
  next.setDate(next.getDate() + 7);
  const days = Math.max(1, Math.ceil((next.getTime() - Date.now()) / 86_400_000));
  const afford = coins >= TOTW_PACK.price;
  return (
    <section className="totw">
      <div className="totw-head">
        <div>
          <span className="hub-kicker">Team der Woche · KW {week.kw}</span>
          <strong>11 Karten mit +3 – nur diese Woche</strong>
          <small>Neue Elf in {days} {days === 1 ? 'Tag' : 'Tagen'} (Montag)</small>
        </div>
        <button className="btn primary" disabled={!afford} onClick={onBuy}>
          {afford ? `Pack · ${TOTW_PACK.price.toLocaleString('de-DE')} Coins` : `Fehlen ${(TOTW_PACK.price - coins).toLocaleString('de-DE')} Coins`}
        </button>
      </div>
      <div className="totw-row">
        {eleven.map((c) => <UtCard key={c.id} card={c} size="sm" />)}
      </div>
      <p className="hint">Pack: 1 Karte aus dem Team der Woche (stärkere sind seltener) + 2 Gold-Karten. Schon vorhanden? Dann gibt es 2.000 Coins.</p>
    </section>
  );
}
