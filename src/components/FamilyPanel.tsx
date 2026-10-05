import { getClub } from '../data/leagues';
import { getClubState, setClubState, useClub } from '../clubStore';
import {
  STAT_LABELS,
  canDecide,
  characterTags,
  childAge,
  decide,
  getTemplate,
  kidWage,
  type ChoiceOption,
} from '../game/family';
import { restYear } from '../game/household';
import type { Career, Child, ChildStats } from '../game/types';

const fmt = (n: number) => n.toLocaleString('de-DE');

const STATUS: Record<Child['status'], string> = {
  kid: 'Kind', pro: '⚽ Fußballprofi', amateur: 'Kein Profi', retired: 'Karriere beendet',
};

/** Kurzer Text zur Wirkung einer Option, z. B. „+4 Technik · −2 Disziplin“. */
function effectText(o: ChoiceOption): string {
  return (Object.entries(o.effects) as [keyof ChildStats, number][])
    .map(([k, v]) => `${v > 0 ? '+' : '−'}${Math.abs(v)} ${STAT_LABELS[k]}`)
    .join(' · ');
}

/** Familie als Vollbild-Ebene: Kinder, ihre Werte und die Erziehungsentscheidungen des Jahres. */
export default function FamilyPanel({ career, onChange, onClose }: { career: Career; onChange: (c: Career) => void; onClose: () => void }) {
  const club = useClub();
  const h = career.household;
  const children = h?.children ?? [];
  const allowed = canDecide(career);
  const idle = career.phase === 'retired' && (!career.coach || career.coach.phase === 'done');
  const report = h?.report;

  const choose = (index: number, option: number) => {
    const res = decide(career, index, option, getClubState().coins);
    if (res.cost) {
      const c = getClubState();
      setClubState({ ...c, coins: c.coins - res.cost });
    }
    onChange(res.career);
  };

  return (
    <div className="overlay fam-overlay" role="dialog" aria-modal="true" aria-label="Familie">
      <div className="overlay-inner">
        <header className="overlay-head">
          <button className="nav-back" onClick={onClose}>‹ Zurück</button>
          <span className="hub-coins">🪙 {fmt(club.coins)}</span>
        </header>
        <h2 className="fam-title">👨‍👧 Familie</h2>

        {report && (report.kidIncome > 0 || report.notes.length > 0) && (
          <div className="fam-report">
            <strong>Jahresbilanz</strong>
            {report.kidIncome > 0 && <span>Einnahmen deiner Kinder: +{fmt(report.kidIncome)} 🪙</span>}
            {report.notes.filter((n) => !n.startsWith('📉') && !n.startsWith('📈') && !n.startsWith('🏆')).map((n) => <span key={n}>{n}</span>)}
          </div>
        )}

        {children.length === 0 && (
          <p className="cs-sub">
            {h?.flirtUsed
              ? 'Keine Kinder – die einmalige Einladung hast du ausgeschlagen.'
              : 'Noch keine Kinder. Ab 22 kann dich in einer Pause einmal eine Gruppe Brasilianerinnen zur After-Party einladen – mit Folgen. Mit 18 kann dein Kind Profi werden und verdient dann Coins für dich.'}
          </p>
        )}

        {children.map((child) => {
          const age = childAge(h!, child);
          const tags = characterTags(child);
          const pending = (h!.pending ?? []).map((p, i) => ({ p, i })).filter(({ p }) => p.childId === child.id);
          return (
            <section key={child.id} className="fam-child">
              <div className="fam-child-head">
                <div>
                  <h3>{child.name}</h3>
                  <small>{age} {age === 1 ? 'Jahr' : 'Jahre'} · {STATUS[child.status]}</small>
                </div>
                {child.status === 'pro' && child.ovr && (
                  <div className="fam-pro">
                    <b className="cs-pill gold">{child.ovr}</b>
                    <small>{child.clubId ? getClub(child.clubId).name : ''}<br />+{fmt(kidWage(child.ovr))} 🪙/Jahr</small>
                  </div>
                )}
              </div>
              {tags.length > 0 && <div className="fam-tags">{tags.map((t) => <span key={t}>{t}</span>)}</div>}

              {child.status === 'kid' && (
                <ul className="fam-stats">
                  {(Object.keys(STAT_LABELS) as (keyof ChildStats)[]).map((k) => (
                    <li key={k}>
                      <span>{STAT_LABELS[k]}</span>
                      <span className="fam-bar"><i style={{ width: `${child.stats[k]}%` }} className={k === 'happiness' && child.stats[k] < 40 ? 'low' : ''} /></span>
                      <b>{Math.round(child.stats[k])}</b>
                    </li>
                  ))}
                </ul>
              )}
              {child.earned > 0 && <p className="cs-sub">Bisher verdient: {fmt(child.earned)} 🪙</p>}

              {pending.length > 0 && (
                <div className="fam-choices">
                  <h4>Entscheidungen dieses Jahr ({pending.filter(({ p }) => p.chosen !== undefined).length}/{pending.length})</h4>
                  {!allowed && <p className="muted">Entscheidungen triffst du in der Winterpause{career.phase === 'retired' ? ' deiner Trainersaison' : ''}.</p>}
                  {pending.map(({ p, i }) => {
                    const t = getTemplate(p.templateId);
                    return (
                      <div key={`${p.templateId}-${i}`} className={`fam-q ${p.chosen !== undefined ? 'done' : ''}`}>
                        <strong>{t.icon} {t.question}</strong>
                        <div className="fam-opts">
                          {t.options.map((o, j) => {
                            const picked = p.chosen === j;
                            const afford = (o.cost ?? 0) <= club.coins;
                            return (
                              <button
                                key={o.label}
                                className={`fam-opt ${picked ? 'on' : ''}`}
                                disabled={!allowed || p.chosen !== undefined || !afford}
                                onClick={() => choose(i, j)}
                              >
                                <span>{picked ? '✓ ' : ''}{o.label}</span>
                                <small>{effectText(o) || 'keine Wirkung'}{o.cost ? ` · 🪙 ${fmt(o.cost)}` : ''}</small>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                  <p className="muted">Offen gelassene Entscheidungen kosten am Jahresende Zufriedenheit.</p>
                </div>
              )}

              {child.log.length > 0 && (
                <ul className="fam-log">{child.log.slice(0, 3).map((l, k) => <li key={k}>{l}</li>)}</ul>
              )}
            </section>
          );
        })}

        {idle && (
          <button className="btn primary big cs-go" onClick={() => onChange(restYear(career))}>
            Ein Jahr vergehen lassen ⏭️
          </button>
        )}
      </div>
    </div>
  );
}
