import { useState } from 'react';
import { getClubState, setClubState, useClub } from '../clubStore';
import { PACKS, type CollectCard } from '../game/club';
import {
  DRAFT_FEE, DRAFT_ROUNDS, captainOptions, claimDraft, draftMatch, draftOpponent, draftOptions, draftReward, slotFor, startDraft,
} from '../game/draft';
import { FORMATION, chemLinks, chemistry, teamRating, type DuelResult } from '../game/squad';
import { play } from '../sound';
import Icon from './Icon';
import { DuelLive } from './Team';
import UtCard from './UtCard';

const fmt = (n: number) => n.toLocaleString('de-DE');
type Phase = 'intro' | 'captain' | 'build' | 'cup' | 'done';

/** Draft: Kapitän wählen, Elf aus je 5 Karten pro Position bauen, dann ein K.-o.-Turnier über vier Runden. */
export default function Draft({ onClose }: { onClose: () => void }) {
  const club = useClub();
  const [phase, setPhase] = useState<Phase>('intro');
  const [captains, setCaptains] = useState<CollectCard[]>([]);
  const [slots, setSlots] = useState<(CollectCard | null)[]>(Array(11).fill(null));
  const [offers, setOffers] = useState<Record<number, CollectCard[]>>({});
  const [open, setOpen] = useState<number | null>(null);
  const [wins, setWins] = useState(0);
  const [live, setLive] = useState<{ round: number; result: DuelResult & { penalties?: boolean } } | null>(null);
  const [claimed, setClaimed] = useState(false);
  const chem = chemistry(slots, FORMATION);
  const full = slots.every(Boolean);
  const running = phase !== 'intro' && !claimed;

  const begin = () => {
    const c = startDraft(getClubState());
    if (!c) return;
    setClubState(c);
    setSlots(Array(11).fill(null));
    setOffers({});
    setWins(0);
    setClaimed(false);
    setCaptains(captainOptions());
    setPhase('captain');
    play('packShake');
  };
  const pickCaptain = (c: CollectCard) => {
    const next: (CollectCard | null)[] = Array(11).fill(null);
    next[slotFor(c, next)] = c;
    setSlots(next);
    setPhase('build');
    play('revealRare');
  };
  const openSlot = (i: number) => {
    if (slots[i]) return;
    // Angebot pro Platz einmal ziehen – erneutes Öffnen zeigt dieselben fünf Karten
    if (!offers[i]) setOffers((o) => ({ ...o, [i]: draftOptions(FORMATION[i].pos, slots.filter(Boolean).map((c) => c!.name)) }));
    setOpen(i);
    play('tap');
  };
  const pick = (i: number, c: CollectCard) => {
    setSlots((s) => s.map((x, k) => (k === i ? c : x)));
    setOpen(null);
    play('reveal');
  };
  const playRound = () => {
    const result = draftMatch(slots, wins);
    setLive({ round: wins, result });
    play('whistle');
  };
  const afterMatch = () => {
    if (!live) return;
    const won = live.result.outcome === 'win';
    setLive(null);
    if (won) {
      const w = wins + 1;
      setWins(w);
      if (w >= DRAFT_ROUNDS.length) setPhase('done');
    } else setPhase('done');
  };
  const claim = () => {
    setClubState(claimDraft(getClubState(), wins));
    setClaimed(true);
    play(wins >= 3 ? 'fanfare' : 'coin');
  };
  const close = () => {
    if (phase === 'done' && !claimed) claim();
    else if (running && phase !== 'done' && !window.confirm('Draft abbrechen? Das Startgeld ist dann weg.')) return;
    onClose();
  };

  const reward = draftReward(wins);
  const rewardText = (w: number) => {
    const r = draftReward(w);
    return [r.coins ? `${fmt(r.coins)} Coins` : '', ...r.packs.map((p) => PACKS.find((x) => x.id === p)?.name ?? p), r.drops ? 'Drop' : '', r.mega ? 'Mega-Drop' : ''].filter(Boolean).join(' + ');
  };

  return (
    <div className="overlay draft" role="dialog" aria-modal="true" aria-label="Draft">
      <div className="overlay-inner">
        <header className="overlay-head">
          <button className="nav-back" onClick={close}>‹ Zurück</button>
          <span className="hub-coins"><Icon name="coin" size={16} className="coin-ic" />{fmt(club.coins)}</span>
        </header>
        <h1 className="dr-title">Draft</h1>

        {phase === 'intro' && (
          <section className="dr-intro">
            <ol className="dr-ladder">
              {DRAFT_ROUNDS.map((r, i) => <li key={r}><span>{i + 1} {i === 0 ? 'Sieg' : 'Siege'}</span><b>{rewardText(i + 1)}</b></li>)}
              <li className="zero"><span>0 Siege</span><b>{rewardText(0)}</b></li>
            </ol>
            <button className="btn primary big" disabled={club.coins < DRAFT_FEE} onClick={begin}>
              Draft starten · <Icon name="coin" size={16} className="coin-ic" />{fmt(DRAFT_FEE)}
            </button>
          </section>
        )}

        {phase === 'captain' && (
          <section>
            <h2 className="dr-step">Kapitän wählen</h2>
            <div className="dr-picks">
              {captains.map((c) => <UtCard key={c.id} card={c} size="sm" shine onClick={() => pickCaptain(c)} />)}
            </div>
          </section>
        )}

        {(phase === 'build' || phase === 'cup' || phase === 'done') && (
          <>
            <div className="team-stats dr-stats">
              <div><small>Wertung</small><strong>{teamRating(slots) || '–'}</strong></div>
              <div><small>Chemie</small><strong>{chem.total}<em>/33</em></strong></div>
              <div><small>Runde</small><strong>{Math.min(wins + 1, 4)}<em>/4</em></strong></div>
            </div>
            <div className="pitch dr-pitch">
              <div className="pitch-lines" aria-hidden="true"><i className="box top" /><i className="circle" /><i className="box bottom" /></div>
              <svg className="chem-lines" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
                {chemLinks(slots, FORMATION).map((l) => (
                  <line key={`${l.a}-${l.b}`} className={`chem-line ${l.kind}`} x1={FORMATION[l.a].x} y1={FORMATION[l.a].y} x2={FORMATION[l.b].x} y2={FORMATION[l.b].y} vectorEffect="non-scaling-stroke" />
                ))}
              </svg>
              {FORMATION.map((s, i) => (
                <div key={i} className={`pitch-slot ${slots[i] ? 'just-placed' : ''}`} style={{ left: `${s.x}%`, top: `${s.y}%` }}>
                  {slots[i] ? <UtCard card={slots[i]!} size="xs" chem={chem.per[i]} />
                    : <button className="slot-empty dr-empty" onClick={() => openSlot(i)} aria-label={`${s.label} wählen`}>+</button>}
                  <span className="slot-label">{s.label}</span>
                </div>
              ))}
            </div>
          </>
        )}

        {phase === 'build' && (
          <div className="dr-dock">
            <button className="btn primary big" disabled={!full} onClick={() => { setPhase('cup'); play('unlock'); }}>
              {full ? 'Turnier starten' : `Noch ${slots.filter((c) => !c).length} Plätze`}
            </button>
          </div>
        )}

        {(phase === 'cup' || phase === 'done') && (
          <section className="dr-cup">
            <ol className="dr-bracket">
              {DRAFT_ROUNDS.map((r, i) => (
                <li key={r} className={i < wins ? 'won' : i === wins && phase === 'done' && wins < 4 ? 'lost' : i === wins ? 'next' : ''}>
                  <span>{r}</span><small>{draftOpponent(i)}</small>
                  <Icon name={i < wins ? 'check' : i === wins && phase === 'done' && wins < 4 ? 'close' : 'lock'} size={16} />
                </li>
              ))}
            </ol>
            <div className="dr-dock">
              {phase === 'cup' && <button className="btn primary big" onClick={playRound}>{DRAFT_ROUNDS[wins]} spielen</button>}
              {phase === 'done' && (
                <div className={`dr-result ${wins >= 4 ? 'champ' : ''}`}>
                  <strong>{wins >= 4 ? 'Turniersieg!' : `${wins} ${wins === 1 ? 'Sieg' : 'Siege'}`}</strong>
                  <span>{rewardText(wins)}{reward.trophies ? ` · +${reward.trophies} Trophäen` : ''}</span>
                  {claimed ? (
                    <button className="btn primary big" onClick={() => setPhase('intro')}>Neuer Draft</button>
                  ) : (
                    <button className="btn primary big" onClick={claim}>Abholen</button>
                  )}
                </div>
              )}
            </div>
          </section>
        )}
      </div>

      {open !== null && offers[open] && (
        <div className="overlay dr-sheet" role="dialog" aria-modal="true" aria-label={`Spieler für ${FORMATION[open].label}`}>
          <div className="overlay-inner">
            <header className="overlay-head"><button className="nav-back" onClick={() => setOpen(null)}>‹ Zurück</button></header>
            <h2 className="dr-step">{FORMATION[open].label} wählen</h2>
            <div className="dr-picks">
              {offers[open].map((c) => <UtCard key={c.id} card={c} size="sm" shine={c.ovr >= 88 || c.variant === 'icon'} onClick={() => pick(open, c)} />)}
            </div>
          </div>
        </div>
      )}

      {live && (
        <DuelLive name={draftOpponent(live.round)}
          result={{ ...live.result, tactic: live.result.penalties ? (live.result.outcome === 'win' ? 'Im Elfmeterschießen gewonnen!' : 'Im Elfmeterschießen verloren.') : undefined }}
          onClose={afterMatch} />
      )}
    </div>
  );
}
