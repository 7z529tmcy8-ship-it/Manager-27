import { useEffect, useMemo, useRef } from 'react';
import { useClub } from '../clubStore';
import { leaderboard } from '../game/leaderboard';
import { nameFxOf, profileOf } from '../game/profile';
import Icon from './Icon';
import { Emblem } from './ProfileScreen';

const fmt = (n: number) => n.toLocaleString('de-DE');

/** Bestenliste: Top 100 nach Trophäen, dein Platz hervorgehoben. */
export default function Leaderboard({ onClose }: { onClose: () => void }) {
  const club = useClub();
  const p = profileOf(club);
  const { top, rank, total } = useMemo(
    () => leaderboard({ name: p.name, trophies: club.trophies ?? 0, emblem: p.emblem, color: p.color, fx: nameFxOf(club) }),
    [p.name, p.emblem, p.color, club],
  );
  const mine = useRef<HTMLLIElement>(null);
  // Erst nach dem Zeichnen springen (die Liste rendert lange Zeilen verzögert)
  useEffect(() => { const t = requestAnimationFrame(() => mine.current?.scrollIntoView({ block: 'center' })); return () => cancelAnimationFrame(t); }, []);
  const inTop = rank <= 100;

  return (
    <div className="overlay lb" role="dialog" aria-modal="true" aria-label="Bestenliste">
      <div className="overlay-inner">
        <header className="overlay-head"><button className="nav-back" onClick={onClose}>‹ Zurück</button></header>
        <h1 className="hub-title">Bestenliste</h1>
        <p className="lb-sub"><Icon name="trophy" size={16} /> Top 100 nach Trophäen · {fmt(total)} Spieler</p>

        <ol className="lb-list">
          {top.map((r, i) => (
            <li key={r.me ? 'me' : r.name} ref={r.me ? mine : undefined} className={`lb-row ${r.me ? 'me' : ''} ${i < 3 ? `podium p${i + 1}` : ''}`}>
              <span className="lb-rank">{i < 3 ? <Icon name={i === 0 ? 'crown' : 'medal'} size={18} /> : i + 1}</span>
              <Emblem emblem={r.emblem} color={r.color} size={32} />
              <span className={`lb-name nfx nfx-${r.fx}`} data-text={r.name}>{r.name}{r.me && <small> (Du)</small>}</span>
              <span className="lb-tro"><Icon name="trophy" size={14} />{fmt(r.trophies)}</span>
            </li>
          ))}
        </ol>

        {!inTop && (
          <div className="lb-me">
            <span className="lb-rank">{fmt(rank)}</span>
            <Emblem emblem={p.emblem} color={p.color} size={32} />
            <span className={`lb-name nfx nfx-${nameFxOf(club)}`} data-text={p.name}>{p.name} <small>(Du)</small></span>
            <span className="lb-tro"><Icon name="trophy" size={14} />{fmt(club.trophies ?? 0)}</span>
            <small className="lb-gap">Noch {fmt(Math.max(1, top[99].trophies - (club.trophies ?? 0) + 1))} Trophäen bis Platz 100</small>
          </div>
        )}
      </div>
    </div>
  );
}
