import { useEffect, useState } from 'react';
import { getClub, getLeague } from '../data/leagues';
import { TIER_NAMES, cardTier } from '../game/player';
import type { Career, SeasonRecord } from '../game/types';
import { useCountUp } from '../hooks/useCountUp';
import Confetti from './Confetti';

interface Props {
  career: Career;
  season: SeasonRecord;
  onClose: () => void;
}

/** Saison-Rückblick als kurze Story zum Durchtippen – danach kommen die Details. */
export default function SeasonStory({ career, season, onClose }: Props) {
  const slides = buildSlides(career, season);
  const [i, setI] = useState(0);
  const slide = slides[i];
  const next = () => (i < slides.length - 1 ? setI(i + 1) : onClose());
  const back = () => setI(Math.max(0, i - 1));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') next();
      if (e.key === 'ArrowLeft') back();
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  return (
    <div className="story" role="dialog" aria-modal="true" aria-label={`Saison ${season.season}`}>
      <div className="story-bars">
        {slides.map((_, k) => <span key={k} className={k < i ? 'done' : k === i ? 'current' : ''} />)}
      </div>
      <button className="story-skip" onClick={onClose}>Überspringen</button>
      <div className="story-tap left" onClick={back} aria-hidden="true" />
      <div className="story-tap right" onClick={next} aria-hidden="true" />
      <div className="story-slide" key={i}>
        {slide.confetti && <Confetti />}
        {slide.render()}
      </div>
      <button className="btn primary big story-next" onClick={next}>{i < slides.length - 1 ? 'Weiter' : 'Zur Saisonbilanz'}</button>
    </div>
  );
}

interface Slide {
  confetti?: boolean;
  render: () => React.ReactNode;
}

function buildSlides(career: Career, s: SeasonRecord): Slide[] {
  const league = getLeague(s.leagueId);
  const club = getClub(s.clubId).name;
  const slides: Slide[] = [
    {
      render: () => (
        <>
          <p className="eyebrow">Saison {s.season}</p>
          <h1>{club}</h1>
          <p className="story-sub">Platz {s.leaguePosition} in der {league.name}</p>
        </>
      ),
    },
    { render: () => <Numbers s={s} /> },
    { render: () => <Rating s={s} /> },
  ];
  const titles = [...s.trophies, ...s.awards];
  if (titles.length) {
    slides.push({
      confetti: true,
      render: () => (
        <>
          <p className="eyebrow">{titles.length === 1 ? 'Ein Titel' : `${titles.length} Titel & Auszeichnungen`}</p>
          <h1>{s.trophies[0] ?? s.awards[0]}</h1>
          <ul className="story-list">
            {titles.slice(1).map((t) => <li key={t}>{t}</li>)}
          </ul>
        </>
      ),
    });
  }
  const rival = career.rival?.history.find((h) => h.season === s.season);
  const event = (s.events ?? [])[0];
  if (rival || event) {
    slides.push({
      render: () => (
        <>
          <p className="eyebrow">Die Geschichte der Saison</p>
          {event && (
            <>
              <h1 className="story-mid">{event.title}</h1>
              <p className="story-sub">{event.text}</p>
            </>
          )}
          {rival && career.rival && (
            <p className={`story-duel ${rival.duel === 'player' ? 'up' : rival.duel === 'rival' ? 'down' : ''}`}>
              {rival.duel === 'player'
                ? `Duell gewonnen gegen ${career.rival.name}.`
                : rival.duel === 'rival'
                  ? `${career.rival.name} war diesmal besser.`
                  : `Unentschieden gegen ${career.rival.name}.`}
            </p>
          )}
        </>
      ),
    });
  }
  return slides;
}

function Numbers({ s }: { s: SeasonRecord }) {
  const goals = useCountUp(s.goals, { from: 0 });
  const assists = useCountUp(s.assists, { from: 0 });
  const rating = useCountUp(s.avgRating ?? 0, { from: 0, decimals: 2 });
  return (
    <>
      <p className="eyebrow">Deine Zahlen</p>
      <div className="story-numbers">
        <div><strong>{goals}</strong><span>Tore</span></div>
        <div><strong>{assists}</strong><span>Vorlagen</span></div>
        <div><strong>{s.avgRating ? rating.toFixed(2) : '–'}</strong><span>Ø Note</span></div>
      </div>
      <p className="story-sub">{s.apps} Spiele · {s.minutes.toLocaleString('de-DE')} Minuten</p>
    </>
  );
}

function Rating({ s }: { s: SeasonRecord }) {
  const value = useCountUp(s.ovrEnd, { from: s.ovrStart, duration: 1400 });
  const before = cardTier(s.ovrStart);
  const after = cardTier(s.ovrEnd);
  const upgraded = after !== before && s.ovrEnd > s.ovrStart;
  const delta = s.ovrEnd - s.ovrStart;
  return (
    <>
      <p className="eyebrow">Gesamtwertung</p>
      <div className={`story-card fc-card ${after} ${upgraded ? 'upgraded' : ''}`}>
        <span className="fc-ovr">{value}</span>
      </div>
      <p className={`story-sub ${delta > 0 ? 'up' : delta < 0 ? 'down' : ''}`}>
        {delta > 0 ? `+${delta}` : delta < 0 ? `${delta}` : '±0'} · {s.ovrStart} → {s.ovrEnd}
      </p>
      {upgraded && <p className="story-upgrade">Neue Karte: {TIER_NAMES[after]}</p>}
    </>
  );
}
