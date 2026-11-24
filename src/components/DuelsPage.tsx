import { useEffect, useState } from 'react';
import { CARDS_FROM_CAREER_ONLY } from '../game/mode';
import { createPortal } from 'react-dom';
import { getClubState, setClubState, trackDailyGoal, useClub } from '../clubStore';
import { DUEL_XP_PER_DAY, RANK_XP, duelXp, grantDuelXp, takeDuelXp, xpLeftToday, xpTarget } from '../game/careerDuels';
import {
  CHAMPIONS, ELITE, LOWEST, PROMOTE_AT, SAFE_DIVISIONS, STYLE_LABEL, TACTIC_TEXT, TOP, divLevel, divName, divStrength, divisionOf, placeDivision, placementFor, playDivisionDuel,
  resolveTactic, squadFit, withOpponent, divReward, type Tactic, type TacticChoice,
} from '../game/divisions';
import { RIVALS_COINS, claimDuelSeason } from '../game/rivals';
import { levelInfo } from '../game/skills';
import {
  SEASON_RANKS, TEAM_NAMES, activeTeam, autoSquad, teamCards, cardById, nextRank, seasonHoursLeft, seasonId, seasonName, seasonPoints, seasonRank, slotsOf, switchTeam,
  teamStrength, unclaimedSeasons, type DuelResult, type SeasonRank, type TeamKind,
} from '../game/squad';
import { listCareers, saveCareer } from '../game/storage';
import type { CollectCard } from '../game/club';
import { play } from '../sound';
import Icon, { Glyph } from './Icon';
import { DuelLive } from './TeamScreen';
import UtCard from './UtCard';

const sfx = (id: Parameters<typeof play>[0]) => { try { play(id); } catch { /* kein Ton */ } };
type Tab = 'play' | 'leagues' | 'season';
const TABS: [Tab, string, 'duel' | 'medal' | 'calendar'][] = [['play', 'Spielen', 'duel'], ['leagues', 'Divisionen', 'medal'], ['season', 'Saison', 'calendar']];
const CHOICES: TacticChoice[] = ['auto', 'pressing', 'konter', 'ballbesitz', 'ausgewogen'];
const TAC_SHORT: Record<TacticChoice, string> = { auto: 'Auto', pressing: 'Pressing', konter: 'Konter', ballbesitz: 'Besitz', ausgewogen: 'Neutral' };
const TACTIC_ICON: Record<Tactic, 'fire' | 'bolt' | 'link' | 'shield'> = { pressing: 'fire', konter: 'bolt', ballbesitz: 'link', ausgewogen: 'shield' };

/** XP auf die aktive Karriere buchen; Rückgabe: Name + Level-Aufstieg. */
function giveXp(xp: number): { who?: string; levelUp: boolean } {
  const target = xpTarget(listCareers());
  if (!xp || !target) return { levelUp: false };
  const before = levelInfo(target.player.skills?.xp ?? 0).level;
  const next = grantDuelXp(target, xp);
  saveCareer(next);
  return { who: target.player.name, levelUp: levelInfo(next.player.skills?.xp ?? 0).level > before };
}

/** Duelle im Division-Rivals-Stil: Divisionen mit Auf-/Abstieg, Taktik, Tages-Saison mit Rivals – Belohnung: XP für die Karriere. */
export default function DuelsPage({ onTeam, onShop }: { onTeam: () => void; onShop: () => void }) {
  const [tab, setTab] = useState<Tab>(() => { try { return (sessionStorage.getItem('fc-duel-tab') as Tab) || 'play'; } catch { return 'play'; } });
  const pick = (t: Tab) => { setTab(t); try { sessionStorage.setItem('fc-duel-tab', t); } catch { /* egal */ } };
  const open = unclaimedSeasons(useClub()).length;
  return (
    <main className="hub dv2">
      <h1 className="ch-title">Duelle</h1>
      <nav className="dv2-tabs" aria-label="Duelle-Bereiche">
        {TABS.map(([id, label, icon]) => (
          <button key={id} className={tab === id ? 'on' : ''} aria-pressed={tab === id} onClick={() => pick(id)}>
            <Icon name={icon} size={18} /><span>{label}</span>
            {id === 'season' && open > 0 && <b className="dv2-badge">{open}</b>}
          </button>
        ))}
      </nav>
      {tab === 'play' && <Play onTeam={onTeam} onShop={onShop} onLeagues={() => pick('leagues')} />}
      {tab === 'leagues' && <Leagues />}
      {tab === 'season' && <Season />}
    </main>
  );
}

/** Haupt- oder Karriere-Team wählen, mit Stärke bzw. fehlenden Spielern. */
function TeamPick() {
  const club = useClub();
  const on = activeTeam(club);
  const info = (k: TeamKind) => {
    const team = k === on ? { squad: club.squad, formation: club.formation } : club.altTeam ?? { squad: [], formation: club.formation };
    const cards = Array.from({ length: 11 }, (_, i) => cardById(club, team.squad[i] ?? null));
    const n = cards.filter(Boolean).length;
    return { n, strength: n ? teamStrength(cards, slotsOf(team)) : 0 };
  };
  return (
    <div className="dv2-teams" role="radiogroup" aria-label="Mit welchem Team spielst du?">
      {(['main', 'career'] as TeamKind[]).map((k) => {
        const t = info(k);
        return (
          <button key={k} role="radio" aria-checked={on === k} className={on === k ? 'on' : ''} onClick={() => setClubState(switchTeam(getClubState(), k))}>
            <small>{TEAM_NAMES[k]}</small>
            <b>{t.n === 11 ? t.strength.toFixed(1) : `${t.n}/11`}</b>
          </button>
        );
      })}
    </div>
  );
}

function Play({ onTeam, onShop, onLeagues }: { onTeam: () => void; onShop: () => void; onLeagues: () => void }) {
  const club = useClub();
  const choice: TacticChoice = club.duelTactic ?? 'ausgewogen';
  const cards = club.squad.map((id) => cardById(club, id));
  const full = cards.filter(Boolean).length === 11;
  const strength = teamStrength(cards, slotsOf(club));
  const d = divisionOf(club);
  const opp = d.next;
  const tactic = resolveTactic(choice, opp?.hint);
  const target = xpTarget(listCareers());
  const left = xpLeftToday(club);
  const [live, setLive] = useState<{ name: string; team: string; result: DuelResult } | null>(null);
  const place = full ? placementFor(strength) : d.div;

  useEffect(() => { if (full && !divisionOf(getClubState()).next) setClubState(withOpponent(getClubState())); }, [full, opp]);

  const kick = () => {
    const res = playDivisionDuel(getClubState(), tactic);
    if (!res) return;
    const won = takeDuelXp(res.club, target ? duelXp(Math.min(10, res.level), res.result.outcome) : 0);
    setClubState(won.club);
    if (res.result.outcome === 'win') trackDailyGoal('duel');
    const g = giveXp(won.xp);
    sfx('whistle');
    const tacticNote = res.edge > 0 ? `${STYLE_LABEL[tactic]} hat gegen ${STYLE_LABEL[res.opponent.style]} gewirkt (+${res.edge})`
      : res.edge < 0 ? `Ausgekontert: ${res.opponent.name} spielte ${STYLE_LABEL[res.opponent.style]} (${res.edge})`
      : `Taktik neutral – ${res.opponent.name} spielte ${STYLE_LABEL[res.opponent.style]}`;
    const move = res.move === 'up' ? `Aufstieg in ${divName(divisionOf(won.club).div)}!` : res.move === 'down' ? `Abstieg in ${divName(divisionOf(won.club).div)}` : undefined;
    const xpNote = won.xp ? `+${won.xp} XP für ${g.who}${g.levelUp ? ' – Level aufgestiegen, neuer Fähigkeitspunkt!' : ''}` : undefined;
    setLive({ name: res.opponent.name, team: TEAM_NAMES[activeTeam(won.club)], result: { ...res.result, trophies: undefined, drop: false, tactic: [xpNote, tacticNote].filter(Boolean).join(' · '), division: move } });
  };

  const odds = opp ? strength - opp.strength : 0;
  const safe = SAFE_DIVISIONS.includes(d.div);
  return (
    <>
      {/* 1. Division mit Fortschritt */}
      <button className="dv2-div" onClick={onLeagues} aria-label="Alle Divisionen ansehen">
        <span className={`div-badge small ${d.div === ELITE ? 'elite' : d.div === CHAMPIONS ? 'champ' : ''}`}>{d.div === CHAMPIONS ? <Icon name="trophy" size={18} /> : d.div === ELITE ? <Icon name="crown" size={18} /> : d.div}</span>
        <span className="dv2-div-mid">
          <b>{divName(d.div)}</b>
          <span className="div-pips" aria-label={`Fortschritt ${d.pts} von ${PROMOTE_AT}`}>{Array.from({ length: PROMOTE_AT }, (_, i) => <i key={i} className={i < d.pts ? 'on' : ''} />)}</span>
          <small>{d.div === TOP ? 'Höchste Division' : `Noch ${PROMOTE_AT - d.pts} Punkte bis ${divName(d.div - 1)}`}{safe ? ' · kein Abstieg' : ''}</small>
        </span>
        <Icon name="arrow" size={18} />
      </button>

      {place < d.div && (
        <button className="dv2-place" onClick={() => { setClubState(placeDivision(getClubState(), place)); sfx('tap'); }}>
          <Icon name="bolt" size={18} />
          <span><b>Zu stark für {divName(d.div)}</b><small>Direkt in {divName(place)} einsteigen – Gegner um {divStrength(place)}</small></span>
          <Icon name="arrow" size={18} />
        </button>
      )}

      {/* 2. Team wählen */}
      <TeamPick />

      {!full ? (
        <section className="dv2-card dv2-empty">
          <p>Für Duelle brauchst du eine vollständige Elf (11 Spieler) im {TEAM_NAMES[activeTeam(club)]}.</p>
          {teamCards(club).length >= 11 ? (
            <button className="btn primary big" onClick={() => setClubState({ ...getClubState(), squad: autoSquad(getClubState()) })}>Automatisch aufstellen</button>
          ) : (
            <button className="btn primary big" onClick={onShop}>{CARDS_FROM_CAREER_ONLY ? `${teamCards(club).length}/11 – Karten in der Karriere holen` : `${teamCards(club).length} von 11 Spielern – Packs im Shop`}</button>
          )}
          <button className="btn secondary" onClick={onTeam}>Zur Aufstellung</button>
        </section>
      ) : opp && (
        <section className="dv2-card" aria-label="Nächster Gegner">
          {/* 3. Vergleich + Scouting */}
          <div className="dv2-vs">
            <div className="dv2-side"><small>{TEAM_NAMES[activeTeam(club)]}</small><strong>{strength.toFixed(1)}</strong></div>
            <span className="dv2-vs-mark">VS</span>
            <div className="dv2-side opp"><small>{opp.name}</small><strong>{opp.strength}</strong></div>
          </div>
          <p className="dv2-info">
            <span className={odds >= 3 ? 'up' : odds <= -3 ? 'down' : ''}>{odds >= 3 ? 'Favorit' : odds <= -3 ? 'Außenseiter' : 'Ausgeglichen'}</span>
            <span><Icon name="eye" size={14} /> Scouting: meist <b>{STYLE_LABEL[opp.hint]}</b></span>
          </p>
          {/* 4. Taktik in einer Reihe */}
          <div className="dv2-tactics" role="radiogroup" aria-label="Taktik">
            {CHOICES.map((t) => {
              const f = t === 'auto' || t === 'ausgewogen' ? 0 : squadFit(t, cards);
              return (
                <button key={t} role="radio" aria-checked={choice === t} className={choice === t ? 'on' : ''} onClick={() => setClubState({ ...getClubState(), duelTactic: t })}>
                  <Icon name={t === 'auto' ? 'target' : TACTIC_ICON[t]} size={18} />
                  <span>{TAC_SHORT[t]}</span>
                  {f !== 0 && <em className={f > 0 ? 'up' : 'down'}>{f > 0 ? '+' : ''}{f.toFixed(1)}</em>}
                </button>
              );
            })}
          </div>
          <p className="dv2-tac-text">{choice === 'auto' ? <>Auto spielt gegen den Scouting-Bericht – jetzt <b>{STYLE_LABEL[tactic]}</b>.</> : TACTIC_TEXT[tactic]}</p>
        </section>
      )}

      {/* XP-Hinweis */}
      <p className="dv2-xp">
        <Icon name="star" size={16} />
        <span>{target ? <>Siege geben <b>{target.player.name}</b> XP · heute noch {left}/{DUEL_XP_PER_DAY}</> : 'Starte eine Karriere – dann gibt jeder Sieg deinem Spieler XP.'}</span>
      </p>

      {/* 5. Anpfiff immer an derselben Stelle */}
      {full && opp && (
        <div className="dv2-kick-bar">
          <button className="btn primary big dv2-kick" onClick={kick}><Icon name="duel" size={20} /> Anpfiff · {STYLE_LABEL[tactic]}</button>
        </div>
      )}
      {live && <DuelLive name={live.name} team={live.team} result={live.result} onClose={() => setLive(null)} />}
    </>
  );
}

function Leagues() {
  const club = useClub();
  const d = divisionOf(club);
  const list = Array.from({ length: LOWEST + 1 - TOP }, (_, i) => i + TOP);
  return (
    <section className="lg-list" aria-label="Alle Divisionen">
      <p className="lg-legend"><span><Icon name="shield" size={14} /> = kein Abstieg</span><span>Sieg +2 · Remis +1 · Niederlage −1 · Aufstieg bei {PROMOTE_AT}</span></p>
      <ol>
        {list.map((x) => (
          <li key={x} className={`lg-row ${x === d.div ? 'here' : ''} ${x >= d.best ? 'reached' : 'locked'}`}>
            <span className={`div-badge small ${x === ELITE ? 'elite' : x === CHAMPIONS ? 'champ' : ''}`}>{x === CHAMPIONS ? <Icon name="trophy" size={18} /> : x === ELITE ? <Icon name="crown" size={18} /> : x}</span>
            <span className="lg-name">
              <b>{divName(x)}{SAFE_DIVISIONS.includes(x) && <Icon name="shield" size={14} />}</b>
              <small>Gegner ~{divStrength(x)} · Saison-Punkte ×{divLevel(x)}</small>
            </span>
            <span className="lg-pay"><b>+{divReward(x).toLocaleString('de-DE')} Coins</b><small>+{duelXp(Math.min(10, divLevel(x)), 'win')} XP {x === d.div ? '· Du bist hier' : 'pro Sieg'}</small></span>
          </li>
        ))}
      </ol>
    </section>
  );
}

function Season() {
  const club = useClub();
  const sid = seasonId();
  const pts = seasonPoints(club, sid);
  const rank = seasonRank(pts);
  const next = nextRank(pts);
  const open = unclaimedSeasons(club);
  const progress = next ? ((pts - rank.min) / (next.min - rank.min)) * 100 : 100;
  const hours = seasonHoursLeft();
  const [got, setGot] = useState<{ cards: CollectCard[]; xp: number; who?: string } | null>(null);
  const reward = (r: SeasonRank) => [RANK_XP[r.name] ? `+${RANK_XP[r.name]} XP` : '', r.rivals ? (CARDS_FROM_CAREER_ONLY ? `+${(r.rivals * RIVALS_COINS).toLocaleString('de-DE')} Coins` : `${r.rivals}× Rivals-Karte (+${r.boost})`) : ''].filter(Boolean).join(' · ');
  const claim = (id: string) => {
    const s = open.find((x) => x.id === id);
    const res = claimDuelSeason(getClubState(), id);
    setClubState(res.club);
    const xp = RANK_XP[s?.rank.name ?? ''] ?? 0;
    const g = giveXp(xp);
    sfx('fanfare');
    setGot({ cards: (res.rivals?.cards ?? []).filter((c) => c.card.variant === 'rivals').map((c) => c.card), xp: g.who ? xp : 0, who: g.who });
  };
  return (
    <section className="season">
      {open.map((s) => (
        <button key={s.id} className="season-claim" onClick={() => claim(s.id)}>
          <Glyph e={s.rank.icon} size={18} /> {seasonName(s.id)}: {s.rank.name} mit {s.points} Punkten – {reward(s.rank) || 'keine Belohnung'} abholen ›
        </button>
      ))}
      <div className="season-head">
        <span className="season-icon" aria-hidden="true"><Glyph e={rank.icon} /></span>
        <div>
          <small>Tages-Saison · {seasonName(sid)} · noch {hours} {hours === 1 ? 'Stunde' : 'Stunden'}</small>
          <strong>{rank.name} · {pts} Punkte</strong>
        </div>
      </div>
      <div className="season-bar"><i style={{ width: `${progress}%` }} /></div>
      <p className="hint">{next ? `Noch ${next.min - pts} Punkte bis ${next.name}: ${reward(next)}.` : 'Höchster Rang erreicht!'} Sieg = 10 Punkte × Divisionsstufe, Remis = 3 ×. Belohnung ab Mitternacht.</p>
      <ul className="season-ranks">
        {SEASON_RANKS.map((r) => (
          <li key={r.name} className={r.name === rank.name ? 'on' : ''}><span><Glyph e={r.icon} size={18} /> {r.name}</span><span>ab {r.min}</span><span>{reward(r) || '–'}</span></li>
        ))}
      </ul>
      <p className="season-rivals"><Icon name="duel" size={16} /> <b>{CARDS_FROM_CAREER_ONLY ? 'Saison-Belohnung:' : 'Rivals-Karte:'}</b> {CARDS_FROM_CAREER_ONLY ? `Statt Rivals-Karten gibt es ${RIVALS_COINS.toLocaleString('de-DE')} Coins je Karte – Karten kommen nur aus der Karriere.` : 'Ein Spieler aus deiner Elf kommt verbessert zurück (+2 bis +5).'}</p>
      {got && createPortal(
        <div className="reward" role="dialog" aria-modal="true" aria-label="Saison-Belohnung">
          <div className="reward-card">
            <span className="upd-badge">Duell-Saison</span>
            <h2>Belohnung abgeholt</h2>
            {got.xp > 0 && <p className="muted">+{got.xp} XP für {got.who}</p>}
            {got.cards.length > 0 && <div className="reward-options">{got.cards.map((c) => <span key={c.id} className="reward-drawn"><UtCard card={c} size="md" shine /></span>)}</div>}
            <button className="btn primary big" onClick={() => setGot(null)}>Weiter</button>
          </div>
        </div>,
        document.body,
      )}
    </section>
  );
}
