import { useState } from 'react';
import { getClubState, setClubState, useClub } from '../clubStore';
import {
  DUEL_XP_PER_DAY, STAGES, duelStateOf, duelXp, grantDuelXp, ownStrength, placedCount, playCareerDuel, xpLeftToday, xpTarget, type CareerDuelOutcome,
} from '../game/careerDuels';
import { levelInfo } from '../game/skills';
import { listCareers, saveCareer } from '../game/storage';
import { activeTeam, switchTeam } from '../game/squad';
import { play } from '../sound';
import Icon from './Icon';
import { DuelLive } from './TeamScreen';

const sfx = (id: Parameters<typeof play>[0]) => { try { play(id); } catch { /* kein Ton */ } };

/**
 * Duelle: Dein Karriere-Team spielt die Liga-Leiter hoch (Kreisliga → Finale). Siege und Remis geben deinem aktiven
 * Karriere-Spieler XP – Level bringen Fähigkeitspunkte in der Karriere.
 */
export default function DuelsPage({ onTeam }: { onTeam: () => void }) {
  const club = useClub();
  const s = duelStateOf(club);
  const stage = STAGES[s.stage - 1];
  const own = ownStrength(club);
  const placed = placedCount(club);
  const careers = listCareers();
  const target = xpTarget(careers);
  const left = xpLeftToday(club);
  const [live, setLive] = useState<(CareerDuelOutcome & { who?: string; levelUp?: boolean }) | null>(null);
  const odds = own - stage.strength;

  const kick = () => {
    let c = getClubState();
    if (activeTeam(c) !== 'career') c = switchTeam(c, 'career');
    const res = playCareerDuel(c);
    setClubState(res.club);
    let who: string | undefined;
    let levelUp = false;
    if (res.xp && target) {
      const before = levelInfo(target.player.skills?.xp ?? 0).level;
      const next = grantDuelXp(target, res.xp);
      saveCareer(next);
      who = target.player.name;
      levelUp = levelInfo(next.player.skills?.xp ?? 0).level > before;
    }
    sfx('whistle');
    setLive({ ...res, xp: target ? res.xp : 0, who, levelUp });
  };

  return (
    <main className="hub dp">
      <h1 className="ch-title">Duelle</h1>

      {/* Liga-Leiter */}
      <ol className="dp-ladder" aria-label="Liga-Leiter">
        {STAGES.map((st, i) => {
          const n = i + 1;
          const state = n < s.stage ? 'done' : n === s.stage ? 'now' : n <= s.best ? 'seen' : 'locked';
          return (
            <li key={st.name} className={`dp-step ${state}`}>
              <span className="dp-dot">{n < s.stage ? <Icon name="check" size={14} /> : n}</span>
              <span className="dp-step-name">{st.name}</span>
            </li>
          );
        })}
      </ol>

      {/* Nächstes Spiel */}
      <section className="dp-match">
        <small className="dp-kicker">Stufe {s.stage} von {STAGES.length} · {stage.name}</small>
        <div className="dp-vs">
          <div className="dp-side"><small>Karriere-Team</small><strong>{own.toFixed(1)}</strong><em>{placed}/11 Spieler</em></div>
          <span className="dp-vs-mark">VS</span>
          <div className="dp-side opp"><small>{stage.opponent}</small><strong>{stage.strength}</strong><em>{stage.name}</em></div>
        </div>
        <p className={`dp-odds ${odds >= 3 ? 'up' : odds <= -3 ? 'down' : ''}`}>{odds >= 3 ? 'Du bist Favorit' : odds <= -3 ? 'Du bist Außenseiter' : 'Ausgeglichen'}{placed < 11 ? ` · ${11 - placed} Plätze spielen Jugendspieler (40)` : ''}</p>
        <button className="btn primary big dp-kick" onClick={kick}><Icon name="duel" size={20} /> Anpfiff</button>
        {placed < 11 && <button className="btn secondary dp-team" onClick={onTeam}>Team aufstellen</button>}
      </section>

      {/* Verbindung zur Karriere */}
      <section className="dp-xp">
        <Icon name="star" size={20} />
        {target ? (
          <span>
            <b>{target.player.name}</b> bekommt die XP: Sieg +{duelXp(s.stage, 'win')}, Remis +{duelXp(s.stage, 'draw')}.
            <small>Heute noch {left} von {DUEL_XP_PER_DAY} XP · Level bringen Fähigkeitspunkte in der Karriere.</small>
          </span>
        ) : (
          <span>Starte eine Karriere – dann bekommt dein Spieler für jeden Sieg XP.<small>Duelle zählen trotzdem für die Liga-Leiter.</small></span>
        )}
      </section>

      <ul className="dp-record">
        <li><small>Siege</small><b>{s.w}</b></li>
        <li><small>Remis</small><b>{s.d}</b></li>
        <li><small>Niederlagen</small><b>{s.l}</b></li>
        <li><small>Finale gewonnen</small><b>{s.titles ?? 0}</b></li>
      </ul>

      {live && (
        <DuelLive
          name={live.stage.opponent}
          result={{
            ...live.result,
            tactic: live.xp ? `+${live.xp} XP für ${live.who}${live.levelUp ? ' – Level aufgestiegen, neuer Fähigkeitspunkt!' : ''}` : live.result.outcome !== 'loss' && target && left === 0 ? 'Tageslimit für XP erreicht – morgen geht’s weiter.' : undefined,
            division: live.title ? 'Finale gewonnen! Die Leiter beginnt von vorn.' : live.up ? `Aufstieg: ${STAGES[duelStateOf(getClubState()).stage - 1].name}!` : undefined,
          }}
          onClose={() => setLive(null)}
        />
      )}
    </main>
  );
}
