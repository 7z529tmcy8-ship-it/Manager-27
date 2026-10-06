import { useEffect, useRef, useState } from 'react';
import { getClubState, setClubState, useClub } from '../clubStore';
import {
  BETS, BROKE_OPTIONS, HORSES, ROULETTE, afterGamble, brokeOptionUsed, colorOf, doBroke, isBroke, playHorses, playRoulette,
  type GambleResult, type RouletteBet,
} from '../game/gambling';
import type { Career } from '../game/types';
import { motionReduced } from '../settings';
import { play } from '../sound';

const fmt = (n: number) => n.toLocaleString('de-DE');

/** Casino: Roulette und Pferdewetten mit Coins. Spielsucht läuft verborgen im Hintergrund. */
export default function CasinoTab({ career, onChange }: { career: Career; onChange: (c: Career) => void }) {
  const club = useClub();
  const [game, setGame] = useState<'roulette' | 'horses'>('roulette');
  const [stake, setStake] = useState(BETS[0]);
  const [bet, setBet] = useState<RouletteBet>('red');
  const [horse, setHorse] = useState(0);
  const [anim, setAnim] = useState<{ res: GambleResult; stake: number; game: 'roulette' | 'horses'; id: number } | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [msg, setMsg] = useState('');
  const resultRef = useRef<HTMLDivElement>(null);
  // Beim Spielen das Ergebnis ins Bild holen (am Handy liegt es sonst unter dem Knopf).
  useEffect(() => {
    if (anim && !revealed) resultRef.current?.scrollIntoView({ behavior: motionReduced() ? 'auto' : 'smooth', block: 'center' });
  }, [anim, revealed]);
  const g = career.gambling;
  const allIn = club.coins;

  // Ergebnis erst nach der Animation zeigen und auszahlen.
  useEffect(() => {
    if (!anim || revealed) return;
    const t = setTimeout(() => {
      setRevealed(true);
      if (anim.res.win) {
        const c = getClubState();
        setClubState({ ...c, coins: c.coins + anim.res.payout });
        play(anim.res.payout >= anim.stake * 5 ? 'fanfare' : 'coin');
      } else play('fall');
    }, motionReduced() ? 50 : anim.game === 'roulette' ? 1800 : 2600);
    return () => clearTimeout(t);
  }, [anim, revealed]);

  const go = (amount: number) => {
    const coins = getClubState().coins;
    if (amount <= 0 || amount > coins || (anim && !revealed)) return;
    if (amount === coins && !window.confirm(`Alles setzen – ${fmt(amount)} Coins?`)) return;
    const res = game === 'roulette' ? playRoulette(bet, amount) : playHorses(horse, amount);
    setClubState({ ...getClubState(), coins: coins - amount });
    onChange(afterGamble(career, amount, res, coins));
    setAnim({ res, stake: amount, game, id: Date.now() });
    setRevealed(false);
    play('packShake');
  };

  const broke = isBroke(career, club.coins);

  return (
    <div className="casino">
      {broke && (
        <section className="broke">
          <h3>💸 Pleite</h3>
          <p className="cs-sub">Die Karriere ist vorbei, das Geld ist weg. Aber das Fernsehen ruft …</p>
          <div className="vice-grid">
            {BROKE_OPTIONS.map((o) => {
              const used = brokeOptionUsed(career, o.id);
              return (
                <button key={o.id} className="vice-card" disabled={used} onClick={() => {
                  const r = doBroke(career, o.id, getClubState().coins);
                  if (!r.text) return;
                  const c = getClubState();
                  setClubState({ ...c, coins: c.coins + r.coins });
                  onChange(r.career);
                  setMsg(r.text);
                  play(r.coins >= 50_000 ? 'fanfare' : 'coin');
                }}>
                  <strong>{o.icon} {o.name}</strong>
                  <small>{o.text}</small>
                  {used && <em>Schon gemacht</em>}
                </button>
              );
            })}
          </div>
        </section>
      )}
      {msg && <p className="cs-note neutral">{msg}</p>}

      <div className="chips">
        <button className={`chip ${game === 'roulette' ? 'active' : ''}`} onClick={() => setGame('roulette')}>🎡 Roulette</button>
        <button className={`chip ${game === 'horses' ? 'active' : ''}`} onClick={() => setGame('horses')}>🏇 Pferdewetten</button>
      </div>

      {game === 'roulette' ? (
        <div className="casino-choices">
          {(Object.keys(ROULETTE) as RouletteBet[]).map((k) => (
            <button key={k} className={`casino-pick r-${k} ${bet === k ? 'on' : ''}`} onClick={() => setBet(k)}>
              {ROULETTE[k].label}<small>×{ROULETTE[k].payout}</small>
            </button>
          ))}
        </div>
      ) : (
        <ul className="horse-list">
          {HORSES.map((h, i) => (
            <li key={h.name}>
              <button className={`casino-pick ${horse === i ? 'on' : ''}`} onClick={() => setHorse(i)}>
                <span>🐎 {h.name}</span><small>Quote {String(h.odds).replace('.', ',')}</small>
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="casino-stakes">
        <span className="muted">Einsatz</span>
        {BETS.map((b) => (
          <button key={b} className={`chip ${stake === b ? 'active' : ''}`} disabled={b > club.coins} onClick={() => setStake(b)}>{fmt(b)}</button>
        ))}
      </div>
      <div className="dev-btns">
        <button className="btn primary big" disabled={stake > club.coins || (!!anim && !revealed)} onClick={() => go(stake)}>
          {game === 'roulette' ? '🎡 Drehen' : '🏁 Rennen starten'} · 🪙 {fmt(stake)}
        </button>
        <button className="btn secondary" disabled={allIn <= 0 || (!!anim && !revealed)} onClick={() => go(allIn)}>🔥 Alles setzen</button>
      </div>

      {anim && (
        <div className="casino-result" ref={resultRef}>
          {anim.game === 'roulette' ? (
            <div className={`roulette-ball ${revealed ? `c-${colorOf(anim.res.outcome)}` : 'spin'}`}>{revealed ? anim.res.outcome : '?'}</div>
          ) : (
            <ol className="race" key={anim.id}>
              {HORSES.map((h, i) => {
                const place = anim.res.order!.indexOf(i);
                return (
                  <li key={h.name} className={i === horse ? 'mine' : ''}>
                    <span>{h.name}</span>
                    <i style={{ ['--to' as string]: `${100 - place * 12}%`, animationDuration: motionReduced() ? '0s' : `${2.2 + place * 0.08}s` }} className="race-bar" />
                  </li>
                );
              })}
            </ol>
          )}
          {revealed && (
            <p className={`cs-note ${anim.res.win ? 'good' : 'bad'}`}>
              {anim.res.win
                ? `Gewonnen! +${fmt(anim.res.payout)} Coins 🎉`
                : anim.game === 'roulette'
                  ? `Die ${anim.res.outcome} – leider verloren (−${fmt(anim.stake)}).`
                  : `${HORSES[anim.res.outcome].name} gewinnt – dein Pferd nicht (−${fmt(anim.stake)}).`}
            </p>
          )}
        </div>
      )}

      {g && g.bets > 0 && (
        <p className="hint">Deine Bilanz: {g.bets} Spiele · gewonnen {fmt(g.won)} · verloren {fmt(g.lost)} Coins. Die Bank gewinnt auf Dauer immer.</p>
      )}
    </div>
  );
}
