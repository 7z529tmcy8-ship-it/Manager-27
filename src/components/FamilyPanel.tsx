import { getClub } from '../data/leagues';
import { useClub } from '../clubStore';
import {
  RULES,
  STAT_LABELS,
  characterTags,
  childAge,
  kidWage,
  ruleOption,
  setRule,
  yearlyCost,
  type RuleOption,
} from '../game/family';
import { restYear } from '../game/household';
import type { Career, Child, ChildStats } from '../game/types';

const fmt = (n: number) => n.toLocaleString('de-DE');

const STATUS: Record<Child['status'], string> = {
  kid: 'Kind', pro: '⚽ Fußballprofi', amateur: 'Kein Profi', retired: 'Karriere beendet',
};

/** Kurzer Text zur Wirkung pro Jahr, z. B. „+4 Technik · −2 Disziplin“. */
function effectText(o: RuleOption): string {
  return (Object.entries(o.effects) as [keyof ChildStats, number][])
    .map(([k, v]) => `${v > 0 ? '+' : '−'}${Math.abs(v)} ${STAT_LABELS[k]}`)
    .join(' · ');
}

/**
 * Familie als Vollbild-Ebene: Kinder, ihre Werte und die Erziehungsregeln.
 * Regeln stellt man einmal ein – sie wirken jedes Jahr automatisch, bis man sie ändert.
 */
export default function FamilyPanel({ career, onChange, onClose }: { career: Career; onChange: (c: Career) => void; onClose: () => void }) {
  const club = useClub();
  const h = career.household;
  const children = h?.children ?? [];
  const idle = career.phase === 'retired' && (!career.coach || career.coach.phase === 'done');
  const report = h?.report;

  return (
    <div className="overlay fam-overlay" role="dialog" aria-modal="true" aria-label="Familie">
      <div className="overlay-inner">
        <header className="overlay-head">
          <button className="nav-back" onClick={onClose}>‹ Zurück</button>
          <span className="hub-coins">🪙 {fmt(club.coins)}</span>
        </header>
        <h2 className="fam-title">👨‍👧 Familie</h2>

        {idle && children.length > 0 && (
          <button className="btn primary big cs-go fam-year" onClick={() => onChange(restYear(career))}>
            ▶ Ein Jahr vergehen lassen
          </button>
        )}

        {report && (report.kidIncome > 0 || (report.kidCosts ?? 0) > 0 || report.notes.some((n) => !/^[📉📈🏆]/u.test(n))) && (
          <div className="fam-report">
            <strong>Letztes Jahr</strong>
            {report.kidIncome > 0 && <span>Gehalt deiner Kinder: +{fmt(report.kidIncome)} 🪙</span>}
            {(report.kidCosts ?? 0) > 0 && <span>Kosten für Verein, Training & Co.: −{fmt(report.kidCosts!)} 🪙</span>}
            {report.notes.filter((n) => !/^[📉📈🏆]/u.test(n)).map((n) => <span key={n}>{n}</span>)}
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
          const cost = yearlyCost(h!, child);
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
                <>
                  <ul className="fam-stats">
                    {(Object.keys(STAT_LABELS) as (keyof ChildStats)[]).map((k) => (
                      <li key={k}>
                        <span>{STAT_LABELS[k]}</span>
                        <span className="fam-bar"><i style={{ width: `${child.stats[k]}%` }} className={k === 'happiness' && child.stats[k] < 40 ? 'low' : ''} /></span>
                        <b>{Math.round(child.stats[k])}</b>
                      </li>
                    ))}
                  </ul>

                  <div className="fam-rules">
                    <div className="fam-rules-head">
                      <h4>Erziehung</h4>
                      <small>{cost > 0 ? `Kosten: ${fmt(cost)} 🪙 pro Jahr` : 'kostenlos'}</small>
                    </div>
                    <p className="muted">Einmal einstellen – wirkt jedes Jahr automatisch, bis du es änderst.</p>
                    {RULES.map((rule) => {
                      const active = age >= rule.minAge && age <= (rule.maxAge ?? 17);
                      const current = ruleOption(child, rule);
                      return (
                        <div key={rule.id} className={`fam-rule ${active ? '' : 'later'}`}>
                          <div className="fam-rule-name">
                            <span>{rule.icon} {rule.name}</span>
                            {!active && <small>{age < rule.minAge ? `ab ${rule.minAge} Jahren` : 'vorbei'}</small>}
                          </div>
                          <div className="fam-seg" role="radiogroup" aria-label={rule.name}>
                            {rule.options.map((o) => {
                              const locked = o.minAge !== undefined && age < o.minAge;
                              return (
                                <button
                                  key={o.id}
                                  role="radio"
                                  aria-checked={current.id === o.id}
                                  className={current.id === o.id ? 'on' : ''}
                                  disabled={locked}
                                  onClick={() => onChange(setRule(career, child.id, rule.id, o.id))}
                                  title={locked ? `ab ${o.minAge} Jahren` : effectText(o)}
                                >
                                  {o.label}{o.cost ? ` · ${fmt(o.cost)} 🪙` : ''}{locked ? ` (ab ${o.minAge})` : ''}
                                </button>
                              );
                            })}
                          </div>
                          <small className="fam-effect">Pro Jahr: {effectText(current) || 'keine Wirkung'}</small>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
              {child.earned > 0 && <p className="cs-sub">Bisher verdient: {fmt(child.earned)} 🪙</p>}

              {child.log.length > 0 && (
                <ul className="fam-log">{child.log.slice(0, 4).map((l, k) => <li key={k}>{l}</li>)}</ul>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
