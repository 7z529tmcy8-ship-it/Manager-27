import { useState } from 'react';
import { getClubState, setClubState, useClub } from '../clubStore';
import type { CollectCard, PackResult } from '../game/club';
import { seasonName } from '../game/squad';
import {
  PASS_LEVELS, PASS_REWARDS, PASS_XP, XP_PER_LEVEL, claimPassReward, passCard, passDaysLeft, passLevel, passOf, rewardText, unclaimedLevels, type PassReward,
} from '../game/pass';
import Icon from './Icon';
import { PackOpening } from './Store';
import UtCard from './UtCard';

const fmt = (n: number) => n.toLocaleString('de-DE');

/** Saison-Pass: 30 Stufen pro Monat, oben die exklusive Karte. */
export default function SeasonPass({ onBack, onCollection }: { onBack: () => void; onCollection: () => void }) {
  const club = useClub();
  const p = passOf(club);
  const level = passLevel(p.xp);
  const inLevel = level >= PASS_LEVELS ? XP_PER_LEVEL : p.xp % XP_PER_LEVEL;
  const top = passCard(p.season);
  const open = unclaimedLevels(club);
  const [opening, setOpening] = useState<{ name: string; result: PackResult } | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const claim = (lvl: number) => {
    const res = claimPassReward(getClubState(), lvl);
    if (!res) return;
    setClubState(res.club);
    if (res.pack) setOpening(res.pack);
    else if (res.card) setOpening({ name: 'Saison-Pass', result: { cards: [{ card: res.card as CollectCard, duplicate: false }], items: [] } });
    else if (res.coins) { setToast(`+${fmt(res.coins)} Coins`); setTimeout(() => setToast(null), 1800); }
  };

  return (
    <main className="hub pass">
      <header className="hub-top">
        <button className="hub-back" onClick={onBack}>‹ Hauptmenü</button>
        <span className="hub-coins"><Icon name="coin" size={16} className="coin-ic" />{fmt(club.coins)}</span>
      </header>
      <h1 className="hub-title">Saison-Pass</h1>
      <p className="hub-sub">{seasonName(p.season)} · noch {passDaysLeft()} {passDaysLeft() === 1 ? 'Tag' : 'Tage'} – nicht abgeholte Belohnungen verfallen am Monatsende.</p>

      <section className="pass-hero">
        <div className="pass-hero-card"><UtCard card={top} size="lg" shine /></div>
        <div className="pass-hero-info">
          <span className="hub-kicker">Stufe {PASS_LEVELS} · Exklusiv</span>
          <strong>{top.name} {top.ovr}</strong>
          <small>Nur in diesem Monat erspielbar – danach kommt ein neuer Saison-Held.</small>
          <div className="pass-level">
            <span className="pass-level-num">{level}</span>
            <div className="pass-level-bar">
              <small>{level >= PASS_LEVELS ? 'Pass komplett!' : `Stufe ${level + 1}: ${inLevel}/${XP_PER_LEVEL} XP`}</small>
              <div className="evo-bar"><i style={{ width: `${(inLevel / XP_PER_LEVEL) * 100}%` }} /></div>
            </div>
          </div>
        </div>
      </section>

      <details className="pass-howto">
        <summary>So sammelst du XP</summary>
        <ul>
          <li><span>Duell gewonnen</span><b>{PASS_XP.duel(1, 'win')}–{PASS_XP.duel(10, 'win')} XP</b></li>
          <li><span>Unentschieden / Niederlage</span><b>{PASS_XP.duel(1, 'draw')} / {PASS_XP.duel(1, 'loss')} XP</b></li>
          <li><span>Evolution-Stufe geschafft</span><b>+{PASS_XP.evoStep} XP</b></li>
          <li><span>Pack gekauft</span><b>{PASS_XP.pack} XP</b></li>
          <li><span>Tauschaufgabe oder SBC</span><b>{PASS_XP.task} XP</b></li>
          <li><span>Karriere-Saison gespielt</span><b>{PASS_XP.careerSeason} XP</b></li>
        </ul>
      </details>

      {open.filter((l) => PASS_REWARDS[l - 1].kind === 'coins').length > 1 && (
        <button className="btn secondary big pass-claim-all" onClick={() => {
          // Coins sofort, Packs und Karte einzeln über die Liste (mit Pack-Öffnung)
          let sum = 0;
          for (const l of open) {
            if (PASS_REWARDS[l - 1].kind !== 'coins') continue;
            const res = claimPassReward(getClubState(), l);
            if (res) { setClubState(res.club); sum += res.coins ?? 0; }
          }
          if (sum) { setToast(`+${fmt(sum)} Coins`); setTimeout(() => setToast(null), 1800); }
        }}>Alle Coins abholen ({open.filter((l) => PASS_REWARDS[l - 1].kind === 'coins').length})</button>
      )}

      <ol className="pass-track">
        {PASS_REWARDS.map((r) => {
          const reached = r.level <= level;
          const claimed = p.claimed.includes(r.level);
          return (
            <li key={r.level} className={`pass-step ${reached ? 'reached' : ''} ${claimed ? 'claimed' : ''} k-${r.kind}`}>
              <span className="pass-num">{r.level}</span>
              <span className="pass-ic" aria-hidden="true"><Icon name={rewardIcon(r)} size={20} /></span>
              <span className="pass-text">{rewardText(r, p.season)}</span>
              {claimed ? <Icon name="check" size={20} className="pass-done" />
                : reached ? <button className="btn primary small" onClick={() => claim(r.level)}>Abholen</button>
                : <Icon name="lock" size={18} className="pass-lock" />}
            </li>
          );
        })}
      </ol>

      {toast && <div className="coin-toast" role="status"><Icon name="coin" size={16} className="coin-ic" />{toast}</div>}
      {opening && <PackOpening name={opening.name} result={opening.result} onClose={() => setOpening(null)} onCollection={() => { setOpening(null); onCollection(); }} />}
    </main>
  );
}

const rewardIcon = (r: PassReward) => (r.kind === 'coins' ? 'coin' : r.kind === 'pack' ? 'pack' : 'star');
