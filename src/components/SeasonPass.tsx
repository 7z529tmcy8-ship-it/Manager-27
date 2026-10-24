import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { getClubState, setClubState, useClub } from '../clubStore';
import type { CollectCard, PackResult } from '../game/club';
import {
  DUEL_XP_PER_DAY, PASS_LEVELS, PASS_REWARDS, PASS_XP, PRO_PASS_PRICE, PRO_REWARDS, XP_PER_LEVEL, buyProPass, claimPassReward, claimProReward, passCard, passDaysLeft, passLevel, passOf, passSeasonName, proPackCount, proPassCard, proRewardText, rewardText,
  unclaimedLevels, unclaimedProLevels, type PassReward,
} from '../game/pass';
import { PACKS } from '../game/club';
import Icon from './Icon';
import { PackOpening } from './Store';
import UtCard from './UtCard';

const fmt = (n: number) => n.toLocaleString('de-DE');
type Opening = { id: number; name: string; result: PackResult };

/** Saison-Pass: Fortschrittsring, horizontale Belohnungs-Strecke, „Alles abholen“ öffnet Packs nacheinander. */
export default function SeasonPass({ onBack, onCollection }: { onBack: () => void; onCollection: () => void }) {
  const club = useClub();
  const p = passOf(club);
  const level = passLevel(p.xp);
  const done = level >= PASS_LEVELS;
  const inLevel = done ? XP_PER_LEVEL : p.xp % XP_PER_LEVEL;
  const top = passCard(p.season);
  const openFree = unclaimedLevels(club);
  const openPro = unclaimedProLevels(club);
  const open = [...openFree, ...openPro];
  const proCard = proPassCard(p.season);
  const pro = !!p.pro;
  const next = PASS_REWARDS[Math.min(level, PASS_LEVELS - 1)];
  const days = passDaysLeft();
  const [queue, setQueue] = useState<Opening[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const seq = useRef(0);
  const track = useRef<HTMLOListElement>(null);

  // Beim Öffnen zur aktuellen Stufe scrollen
  useEffect(() => {
    const t = track.current;
    const el = t?.querySelector<HTMLElement>(`[data-level="${Math.max(1, Math.min(PASS_LEVELS, (openFree[0] ?? openPro[0]) ?? level + 1))}"]`);
    if (t && el) t.scrollLeft = el.offsetLeft - t.clientWidth / 2 + el.clientWidth / 2;
    // nur beim ersten Anzeigen
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const flash = (t: string) => { setToast(t); setTimeout(() => setToast(null), 2000); };

  /** Stufen abholen: Coins sofort, Packs und Karte kommen nacheinander als Pack-Öffnung. */
  const claim = (levels: number[], proLevels: number[] = []) => {
    let coins = 0;
    const packs: Opening[] = [];
    for (const [l, isPro] of [...levels.map((l) => [l, false] as const), ...proLevels.map((l) => [l, true] as const)]) {
      const res = isPro ? claimProReward(getClubState(), l) : claimPassReward(getClubState(), l);
      if (!res) continue;
      setClubState(res.club);
      coins += res.coins ?? 0;
      if (res.pack) packs.push({ id: ++seq.current, ...res.pack });
      if (res.card) packs.push({ id: ++seq.current, name: isPro ? 'Pro-Pass' : 'Saison-Pass', result: { cards: [{ card: res.card as CollectCard, duplicate: false }], items: [] } });
    }
    if (coins) flash(`+${fmt(coins)} Coins`);
    if (packs.length) setQueue((q) => [...q, ...packs]);
  };

  const ring = 2 * Math.PI * 34;
  return (
    <main className="hub pass">
      <header className="hub-top">
        <button className="hub-back" onClick={onBack}>‹ Hauptmenü</button>
        <span className="hub-coins"><Icon name="coin" size={16} className="coin-ic" />{fmt(club.coins)}</span>
      </header>
      <div className="pass-title">
        <h1 className="hub-title">Saison-Pass{pro && <span className="pass-pro-badge">PRO</span>}</h1>
        <span className="pass-days"><Icon name="clock" size={14} />{passSeasonName(p.season)} · noch {days} {days === 1 ? 'Tag' : 'Tage'}</span>
      </div>

      <section className="pass-hero">
        <div className="pass-hero-main">
          <div className="pass-ring" aria-label={`Stufe ${level} von ${PASS_LEVELS}`}>
            <svg viewBox="0 0 80 80" aria-hidden="true">
              <defs>
                <linearGradient id="pass-grad" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#ff2fd1" /><stop offset="1" stopColor="#19f0ff" /></linearGradient>
              </defs>
              <circle cx="40" cy="40" r="34" className="pass-ring-bg" />
              <circle cx="40" cy="40" r="34" className="pass-ring-fg" strokeDasharray={ring} strokeDashoffset={ring * (1 - inLevel / XP_PER_LEVEL)} />
            </svg>
            <span><b>{level}</b><small>Stufe</small></span>
          </div>
          <div className="pass-hero-info">
            <strong>{done ? 'Pass komplett!' : `${XP_PER_LEVEL - inLevel} XP bis Stufe ${level + 1}`}</strong>
            {!done && <small>Nächste Belohnung: <b>{rewardText(next, p.season)}</b></small>}
            <small>{p.xp.toLocaleString('de-DE')} / {(PASS_LEVELS * XP_PER_LEVEL).toLocaleString('de-DE')} XP gesamt</small>
          </div>
        </div>
        <div className="pass-hero-card">
          <span className="pass-hero-tag">Stufe {PASS_LEVELS} · Exklusiv</span>
          <UtCard card={top} size="md" shine />
        </div>
      </section>

      {!pro && (
        <section className="pass-pro-offer">
          <div className="pass-pro-card"><UtCard card={proCard} size="sm" shine /></div>
          <div className="pass-pro-info">
            <span className="pass-pro-kicker">Pro-Pass · {passSeasonName(p.season)}</span>
            <strong>Doppelt so krass</strong>
            <small>Zweite Belohnungsreihe auf allen {PASS_LEVELS} Stufen: {proPackCount('goat')}× GOAT, {proPackCount('ultimate')}× Ultimate, {proPackCount('icon')}× Ikonen, dazu Weltstar, Rückblende, Comeback und große Coin-Pakete – oben {proCard.name} {proCard.ovr}. Schon erreichte Stufen gibt es sofort.</small>
            <button className="btn big pass-pro-buy" disabled={club.coins < PRO_PASS_PRICE}
              onClick={() => { if (!window.confirm(`Pro-Pass für ${fmt(PRO_PASS_PRICE)} Coins kaufen?`)) return; const next = buyProPass(getClubState()); if (next) setClubState(next); }}>
              {club.coins >= PRO_PASS_PRICE ? <>Pro-Pass kaufen · <Icon name="coin" size={16} className="coin-ic" />{fmt(PRO_PASS_PRICE)}</> : `Dir fehlen ${fmt(PRO_PASS_PRICE - club.coins)} Coins`}
            </button>
          </div>
        </section>
      )}

      {open.length > 0 && (
        <button className="btn primary big pass-claim-all" onClick={() => claim(openFree, openPro)}>
          <Icon name="gift" size={20} />Alles abholen <span className="pass-claim-count">{open.length}</span>
        </button>
      )}

      <div className="pass-track-wrap">
        <ol className="pass-track" ref={track} style={{ '--fill': `${(Math.min(level, PASS_LEVELS) / PASS_LEVELS) * 100}%` } as CSSProperties}>
          {PASS_REWARDS.map((r) => {
            const reached = r.level <= level;
            const claimed = p.claimed.includes(r.level);
            const ready = reached && !claimed;
            return (
              <li key={r.level} data-level={r.level} className={`pass-node ${reached ? 'reached' : ''} ${claimed ? 'claimed' : ''} ${ready ? 'ready' : ''} ${r.level % 5 === 0 ? 'milestone' : ''} k-${r.kind}`}>
                <span className="pass-node-dot">{r.level}</span>
                <button className="pass-tile" disabled={!ready} onClick={() => claim([r.level])}
                  aria-label={`Stufe ${r.level}: ${rewardText(r, p.season)}${claimed ? ', abgeholt' : ready ? ', abholen' : ', gesperrt'}`}>
                  <RewardArt r={r} card={top} />
                  <span className="pass-tile-label">{tileLabel(r)}</span>
                  <span className="pass-tile-state">
                    {claimed ? <Icon name="check" size={16} /> : ready ? 'Abholen' : <Icon name="lock" size={14} />}
                  </span>
                </button>
                <ProTile r={PRO_REWARDS[r.level - 1]} card={proCard} season={p.season} pro={pro} reached={reached}
                  claimed={(p.proClaimed ?? []).includes(r.level)} onClaim={() => claim([], [r.level])} />
              </li>
            );
          })}
        </ol>
      </div>

      <h2 className="hub-section">So sammelst du XP</h2>
      <ul className="pass-xp">
        <li><Icon name="duel" size={18} /><span>Duell-Sieg (max. {DUEL_XP_PER_DAY} XP pro Tag)</span><b>+{PASS_XP.duel(1, 'win')}–{PASS_XP.duel(11, 'win')}</b></li>
        <li><Icon name="evo" size={18} /><span>Evo-Stufe</span><b>+{PASS_XP.evoStep}</b></li>
        <li><Icon name="ball" size={18} /><span>Karriere-Saison</span><b>+{PASS_XP.careerSeason}</b></li>
        <li><Icon name="puzzle" size={18} /><span>Aufgabe / SBC</span><b>+{PASS_XP.task}</b></li>
        <li><Icon name="pack" size={18} /><span>Pack gekauft</span><b>+{PASS_XP.pack}</b></li>
        <li><Icon name="tactics" size={18} /><span>Remis / Niederlage</span><b>+{PASS_XP.duel(1, 'draw')} / +{PASS_XP.duel(1, 'loss')}</b></li>
      </ul>
      <p className="hint pass-foot">Nicht abgeholte Belohnungen verfallen am Monatsende – dann startet ein neuer Pass mit neuem Saison-Helden.</p>

      {toast && <div className="coin-toast" role="status"><Icon name="coin" size={16} className="coin-ic" />{toast}</div>}
      {queue[0] && (
        <PackOpening key={queue[0].id} name={queue[0].name} result={queue[0].result}
          onClose={() => setQueue((q) => q.slice(1))} onCollection={() => { setQueue([]); onCollection(); }} />
      )}
    </main>
  );
}

const tileLabel = (r: PassReward) =>
  r.kind === 'coins' ? fmt(r.amount) : r.kind === 'pack' ? PACKS.find((x) => x.id === r.pack)!.name.replace('-Pack', '') : 'Saison-Held';

/** Bild der Belohnung: Münzen, Mini-Pack im Store-Look oder die exklusive Karte. */
function RewardArt({ r, card }: { r: PassReward; card: CollectCard }) {
  if (r.kind === 'coins') return <span className="pass-art coins" aria-hidden="true"><Icon name="coin" size={30} /></span>;
  if (r.kind === 'pack') {
    const name = PACKS.find((x) => x.id === r.pack)!.name.replace('-Pack', '');
    return <span className={`pass-art pack p-${r.pack}`} aria-hidden="true"><span className="pack-art"><span>{name}</span></span></span>;
  }
  return <span className="pass-art card" aria-hidden="true"><UtCard card={card} size="xs" /></span>;
}

/** Pro-Reihe unter jeder Stufe: schwarz-gold, gesperrt ohne Pro-Pass. */
function ProTile({ r, card, season, pro, reached, claimed, onClaim }: { r: PassReward; card: CollectCard; season: string; pro: boolean; reached: boolean; claimed: boolean; onClaim: () => void }) {
  const ready = pro && reached && !claimed;
  return (
    <button className={`pass-tile pro ${pro ? 'owned' : ''} ${ready ? 'ready' : ''} ${claimed ? 'claimed' : ''}`} disabled={!ready} onClick={onClaim}
      aria-label={`Pro-Stufe ${r.level}: ${proRewardText(r, season)}${claimed ? ', abgeholt' : ready ? ', abholen' : ', gesperrt'}`}>
      <span className="pass-pro-tag">PRO</span>
      <RewardArt r={r} card={card} />
      <span className="pass-tile-label">{r.kind === 'card' ? 'Pro-Held' : tileLabel(r)}</span>
      <span className="pass-tile-state">{claimed ? <Icon name="check" size={16} /> : ready ? 'Abholen' : <Icon name="lock" size={14} />}</span>
    </button>
  );
}
