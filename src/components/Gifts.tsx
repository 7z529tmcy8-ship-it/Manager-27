import { useEffect, useState } from 'react';
import { getClubState, setClubState } from '../clubStore';
import { PACKS, openPack, type PackResult } from '../game/club';
import { giftTitle, rollGift, takeGift, type Gift, type GiftContent } from '../game/gifts';
import type { Career } from '../game/types';
import { motionReduced } from '../settings';
import { play } from '../sound';
import Confetti from './Confetti';
import { PackOpening } from './Store';

const fmt = (n: number) => n.toLocaleString('de-DE');
const BOX: Record<Gift['rarity'], string> = { bronze: 'Bronze-Box', silver: 'Silber-Box', gold: 'Gold-Box' };

/** Regal mit ungeöffneten Geschenken vom Aufsichtsrat. */
export function GiftShelf({ career, onChange }: { career: Career; onChange: (c: Career) => void }) {
  const gifts = career.gifts ?? [];
  const [open, setOpen] = useState<Gift | null>(null);
  if (!gifts.length && !open) return null;
  return (
    <section className="gift-shelf">
      <strong>🎁 {gifts.length === 1 ? 'Ein Geschenk' : `${gifts.length} Geschenke`} vom Aufsichtsrat</strong>
      <div className="gift-row">
        {gifts.map((g) => (
          <button key={g.id} className={`gift-box r-${g.rarity}`} onClick={() => setOpen(g)} aria-label={`${BOX[g.rarity]} öffnen: ${giftTitle(g)}`}>
            <span className="gift-icon" aria-hidden="true">🎁</span>
            <b>{BOX[g.rarity]}</b>
            <small>{giftTitle(g)}</small>
          </button>
        ))}
      </div>
      {open && <GiftOpening gift={open} onPaid={() => onChange(takeGift(career, open.id))} onDone={() => setOpen(null)} />}
    </section>
  );
}

/** Öffnen: Box wackelt, springt auf, Inhalt wird enthüllt – Coins und vielleicht ein Pack. */
function GiftOpening({ gift, onPaid, onDone }: { gift: Gift; onPaid: () => void; onDone: () => void }) {
  const [phase, setPhase] = useState<'shake' | 'open'>('shake');
  const [content] = useState<GiftContent>(() => rollGift(gift));
  const [pack, setPack] = useState<{ name: string; result: PackResult } | null>(null);
  const [paid, setPaid] = useState(false);

  useEffect(() => {
    play('packShake');
    const t = setTimeout(() => setPhase('open'), motionReduced() ? 100 : 1500);
    return () => clearTimeout(t);
  }, []);
  useEffect(() => {
    if (phase !== 'open' || paid) return;
    // Coins sofort gutschreiben (einmal).
    const c = getClubState();
    setClubState({ ...c, coins: c.coins + content.coins });
    setPaid(true);
    onPaid(); // Box sofort aus dem Spielstand nehmen – kein doppeltes Öffnen
    play(content.pack ? 'revealRare' : 'reveal');
  }, [phase, paid, content, onPaid]);

  const openGiftPack = () => {
    if (!content.pack) return;
    const res = openPack(getClubState(), content.pack, Math.random, true);
    if (!res) return;
    setClubState(res.club);
    setPack({ name: PACKS.find((p) => p.id === content.pack)!.name, result: res.result });
  };

  if (pack) return <PackOpening name={pack.name} result={pack.result} onClose={onDone} onCollection={onDone} />;

  return (
    <div className="life-pop" role="dialog" aria-modal="true" aria-label="Geschenk öffnen">
      <div className={`life-card gift-open r-${gift.rarity}`}>
        {phase === 'open' && <Confetti pieces={gift.rarity === 'gold' ? 120 : 60} />}
        <div className={`gift-big ${phase}`} aria-hidden="true">{phase === 'shake' ? '🎁' : '✨'}</div>
        <small className="muted">{giftTitle(gift)}</small>
        {phase === 'shake' ? (
          <h2>{BOX[gift.rarity]} wird geöffnet …</h2>
        ) : (
          <>
            <h2>+{fmt(content.coins)} 🪙</h2>
            {content.pack ? (
              <p>Und obendrauf: ein <b>{PACKS.find((p) => p.id === content.pack)!.name}</b>!</p>
            ) : (
              <p>Der Aufsichtsrat dankt für dein Vertrauen.</p>
            )}
            <div className="life-btns">
              {content.pack ? (
                <button className="btn primary big" onClick={openGiftPack}>🃏 Pack öffnen</button>
              ) : (
                <button className="btn primary big" onClick={onDone}>Danke!</button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
