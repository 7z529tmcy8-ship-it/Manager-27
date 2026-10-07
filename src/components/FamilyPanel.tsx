import { getClub } from '../data/leagues';
import { useClub } from '../clubStore';
import { useEffect, useState } from 'react';
import { getClubState, setClubState } from '../clubStore';
import { play } from '../sound';
import { motionReduced } from '../settings';
import {
  DEMANDS,
  demandChance,
  getKidEvent,
  negotiateKid,
  resolveKidEvent,
  setYouthClub,
  youthClubCost,
  youthClubs,
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
  kid: 'Kind', offer: '📝 Vertragsverhandlung', pro: '⚽ Fußballprofi', amateur: 'Kein Profi', retired: 'Karriere beendet',
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
  // Verhandlung: kurz Spannung („Der Verein überlegt …“), dann das Ergebnis groß anzeigen.
  const [deal, setDeal] = useState<{ phase: 'wait' | 'done'; name: string; demand: string; tone: 'good' | 'bad' | 'angry'; title: string; text: string } | null>(null);
  const negotiate = (childId: string, factor: number, label: string) => {
    const before = career.household!.children.find((x) => x.id === childId)!;
    const next = negotiateKid(career, childId, factor);
    const after = next.household!.children.find((x) => x.id === childId)!;
    const ok = after.status === 'pro' && !after.angry;
    const tone = ok ? 'good' : after.angry ? 'angry' : 'bad';
    const title = ok ? '✅ Deal!' : after.angry ? '💔 Deal geplatzt' : '❌ Abgelehnt';
    const text = ok
      ? `${getClub(after.clubId!).name} akzeptiert „${label}“. ${before.name} wird Profi und verdient ${fmt(Math.round(kidWage(after.ovr!) * (after.wageFactor ?? 1)))} 🪙 pro Jahr.`
      : (after.log[0] ?? '').replace(/^[^\s]+\s/, '');
    setDeal({ phase: 'wait', name: before.name, demand: label, tone, title, text });
    play('packShake');
    onChange(next);
  };
  useEffect(() => {
    if (deal?.phase !== 'wait') return;
    const t = setTimeout(() => {
      setDeal((d) => (d ? { ...d, phase: 'done' } : d));
      play(deal.tone === 'good' ? 'fanfare' : 'fall');
    }, motionReduced() ? 100 : 1600);
    return () => clearTimeout(t);
  }, [deal]);

  return (
    <div className="overlay fam-overlay" role="dialog" aria-modal="true" aria-label="Familie">
      <div className="overlay-inner">
        <header className="overlay-head">
          <button className="nav-back" onClick={onClose}>‹ Zurück</button>
          <span className="hub-coins">🪙 {fmt(club.coins)}</span>
        </header>
        <h2 className="fam-title">👨‍👧 Familie</h2>

        {deal && (
          <div className="life-pop" role="dialog" aria-modal="true" aria-label="Ergebnis der Verhandlung">
            <div className={`life-card deal ${deal.phase === 'done' ? deal.tone : ''}`}>
              {deal.phase === 'wait' ? (
                <>
                  <div className="life-emoji deal-phone" aria-hidden="true">📞</div>
                  <h2>Der Verein überlegt …</h2>
                  <p>Deine Forderung für {deal.name}: <b>{deal.demand}</b></p>
                </>
              ) : (
                <>
                  <div className="life-emoji" aria-hidden="true">{deal.tone === 'good' ? '🤝' : deal.tone === 'angry' ? '💔' : '🚪'}</div>
                  <h2>{deal.title}</h2>
                  <p>{deal.text}</p>
                  <button className="btn primary big" onClick={() => setDeal(null)}>Weiter</button>
                </>
              )}
            </div>
          </div>
        )}

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

        {h?.kidEvent && <KidEventBox career={career} onChange={onChange} />}

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
                    <small>
                      {child.clubId ? getClub(child.clubId).name : ''}<br />
                      {child.angry ? '💔 sauer – zahlt nichts' : `+${fmt(Math.round(kidWage(child.ovr) * (child.wageFactor ?? 1)))} 🪙/Jahr`}
                    </small>
                  </div>
                )}
              </div>
              {tags.length > 0 && <div className="fam-tags">{tags.map((t) => <span key={t}>{t}</span>)}</div>}

              {child.status === 'offer' && child.offer && (
                <div className="kid-offer">
                  <strong>📝 {child.offer.round === 2 ? 'Letzte Chance: ' : ''}Angebot von {getClub(child.offer.clubId).name}</strong>
                  <small>Wertung {child.ovr} · Grundgehalt {fmt(child.offer.base)} 🪙 pro Jahr. Du verhandelst für {child.name} – pokerst du zu hoch, platzt der Deal.</small>
                  <div className="kid-demands">
                    {DEMANDS.map((d) => (
                      <button key={d.factor} className={`btn ${d.factor === 1 ? 'primary' : 'secondary'} small`} onClick={() => negotiate(child.id, d.factor, d.label)}>
                        {d.label}
                        <small>{fmt(Math.round(child.offer!.base * d.factor))} 🪙 · {Math.round(demandChance(child, d.factor) * 100)} %</small>
                      </button>
                    ))}
                  </div>
                </div>
              )}

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
                          {rule.id === 'club' && current.id !== 'none' && active && (
                            <label className="youth-club">
                              Verein
                              <select value={child.youthClubId ?? ''} onChange={(e) => onChange(setYouthClub(career, child.id, e.target.value))}>
                                {!child.youthClubId && <option value="">– wählen –</option>}
                                {youthClubs(current.id).map((id) => <option key={id} value={id}>{getClub(id).name}</option>)}
                              </select>
                              <small className="muted">{youthClubCost(child) ? `Vereinsbeitrag ${fmt(youthClubCost(child))} 🪙/Jahr · stärkere Förderung` : 'Kein Extra-Beitrag'}{current.id !== 'village' ? ' · bietet mit 18 bevorzugt den ersten Vertrag an' : ''}</small>
                            </label>
                          )}
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

/** Ereignis rund um ein Kind mit Entscheidung. */
export function KidEventBox({ career, onChange }: { career: Career; onChange: (c: Career) => void }) {
  const ev = career.household?.kidEvent;
  const def = ev && getKidEvent(ev.id);
  const child = ev && career.household?.children.find((c) => c.id === ev.childId);
  if (!ev || !def || !child) return null;
  const choose = (i: number) => {
    const opt = def.options[i];
    if (opt.cost && getClubState().coins < opt.cost) return;
    const res = resolveKidEvent(career, i);
    if (res.cost) setClubState({ ...getClubState(), coins: getClubState().coins - res.cost });
    onChange(res.career);
  };
  return (
    <div className="incident kid-event">
      <strong>{def.icon} {def.title} · {child.name}</strong>
      <p>{def.text(child.name)}</p>
      <div className="incident-opts">
        {def.options.map((o, i) => (
          <button key={o.label} className="btn secondary" disabled={!!o.cost && getClubState().coins < o.cost} onClick={() => choose(i)}>
            <b>{o.label}</b>
          </button>
        ))}
      </div>
    </div>
  );
}
