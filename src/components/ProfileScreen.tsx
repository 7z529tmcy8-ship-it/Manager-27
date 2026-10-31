import { useState } from 'react';
import { getClubState, setClubState, useClub } from '../clubStore';
import { divisionOf, divName } from '../game/divisions';
import {
  BANNERS, EMBLEMS, NAME_FX, NAME_MAX, PROFILE_COLORS, TITLES, bannerOf, bannerOpen, bestCards, buyNameFx, managerLevel, managerXp, nameFxOf, nameFxOwned, profileOf, profileRecords, profileStats, setProfile, setShowcaseSlot, showcase3, titleOf,
} from '../game/profile';
import type { Career } from '../game/types';
import { play } from '../sound';
import Icon from './Icon';
import UtCard from './UtCard';

/** Wappen-Abzeichen: Sechseck in der Profilfarbe mit Linien-Icon (keine Gesichter). */
export function Emblem({ emblem, color, size = 44 }: { emblem: string; color: string; size?: number }) {
  return (
    <span className="emblem" style={{ '--pc': color, width: size, height: size } as React.CSSProperties} aria-hidden="true">
      <Icon name={emblem} size={Math.round(size * 0.5)} />
    </span>
  );
}

type Tab = 'emblem' | 'color' | 'name' | 'banner' | 'title';
const TABS: [Tab, string][] = [['emblem', 'Wappen'], ['color', 'Farbe'], ['name', 'Name'], ['banner', 'Banner'], ['title', 'Titel']];
const fmtMio = (n: number) => `${(n / 1e6).toLocaleString('de-DE')} Mio.`;

/** Profil wie in Brawl Stars: Spielerkarte mit Banner, Wappen, Level, Titel und Trophäen – darunter Rekorde, Vitrine, Statistiken. */
export default function ProfileScreen({ careers, onClose }: { careers: Career[]; onClose: () => void }) {
  const club = useClub();
  const p = profileOf(club);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(p.name);
  const [pickSlot, setPickSlot] = useState<number | null>(null);
  const [custom, setCustom] = useState(false);
  const [tab, setTab] = useState<Tab>('emblem');
  const lvl = managerLevel(managerXp(club, careers));
  const shelf = showcase3(club);
  const fx = nameFxOf(club);
  const banner = bannerOf(club, lvl.level);
  const title = titleOf(club, careers);
  const div = divisionOf(club);
  const save = (patch: Parameters<typeof setProfile>[1]) => { setClubState(setProfile(getClubState(), patch)); try { play('tap'); } catch { /* kein Ton */ } };
  const titlesOpen = TITLES.filter((t) => t.ok(club, careers)).length;

  return (
    <div className="overlay profile" role="dialog" aria-modal="true" aria-label="Profil">
      <div className="overlay-inner">
        <header className="overlay-head"><button className="nav-back" onClick={onClose}>‹ Zurück</button></header>

        <section className={`pf-card-hero bn-${banner.id}`} style={{ '--pc': p.color } as React.CSSProperties}>
          <span className="pf-banner" aria-hidden="true" />
          <span className="pf-shine" aria-hidden="true" />
          <button className="pf-edit" onClick={() => setCustom(true)}><Icon name="pencil" size={16} />Anpassen</button>

          <div className="pf-top">
            <div className="pf-badge">
              <Emblem emblem={p.emblem} color={p.color} size={96} />
              <span className="pf-lvl" aria-label={`Level ${lvl.level}`}>{lvl.level}</span>
            </div>
            <div className="pf-id">
              {editing ? (
                <form className="pf-name-edit" onSubmit={(e) => { e.preventDefault(); save({ name }); setEditing(false); }}>
                  <input value={name} maxLength={NAME_MAX} autoFocus onChange={(e) => setName(e.target.value)} aria-label="Name" />
                  <button className="btn primary small" type="submit">OK</button>
                </form>
              ) : (
                <button className={`pf-name nfx nfx-${fx}`} data-text={p.name} onClick={() => { setName(p.name); setEditing(true); }} aria-label="Name ändern">{p.name}</button>
              )}
              <span className="pf-title">{title.name}</span>
              <span className="pf-xp"><span className="pf-xp-bar"><i style={{ transform: `scaleX(${lvl.into / lvl.need})` }} /></span><small>{lvl.into}/{lvl.need} XP</small></span>
            </div>
          </div>

          <div className="pf-pills">
            <span className="pf-pill gold"><Icon name="trophy" size={20} /><b>{(club.trophies ?? 0).toLocaleString('de-DE')}</b><small>Rekord {(club.trophyBest ?? 0).toLocaleString('de-DE')}</small></span>
            <span className="pf-pill"><Icon name="medal" size={20} /><b>{divName(div.div)}</b><small>Beste: {divName(div.best)}</small></span>
          </div>
        </section>

        <div className="pf-records">
          {profileRecords(club, careers).map((r) => (
            <div key={r.label} className={`pf-rec t-${r.tone}`}><Icon name={r.icon} size={22} /><strong>{r.value}</strong><small>{r.label}</small></div>
          ))}
        </div>

        <section className="pf-show">
          <div className="pf-show-head"><h2 className="hub-section">Vitrine</h2>{pickSlot !== null && <button className="btn secondary small" onClick={() => setPickSlot(null)}>Fertig</button>}</div>
          {shelf.some(Boolean) ? (
            <>
              <div className="pf-shelf" style={{ '--pc': p.color } as React.CSSProperties}>
                {[1, 0, 2].map((slot) => {
                  const c = shelf[slot];
                  return (
                    <button key={slot} className={`pf-slot s${slot} ${pickSlot === slot ? 'on' : ''}`} onClick={() => setPickSlot(pickSlot === slot ? null : slot)} aria-label={`Vitrinen-Platz ${slot + 1} ändern`}>
                      {c ? <UtCard card={c} size={slot === 0 ? 'md' : 'sm'} shine={slot === 0} /> : <span className="pf-slot-empty"><Icon name="plus" size={22} /></span>}
                      <span className="pf-plinth" aria-hidden="true" />
                    </button>
                  );
                })}
              </div>
              {pickSlot !== null ? (
                <div className="pf-cards">
                  {bestCards(club, 24).map((c) => (
                    <button key={c.id} className={`pf-cardpick ${shelf[pickSlot]?.id === c.id ? 'on' : ''}`} onClick={() => { setClubState(setShowcaseSlot(getClubState(), pickSlot, c.id)); setPickSlot(null); }} aria-label={`${c.name} in die Vitrine`}>
                      <UtCard card={c} size="sm" />
                    </button>
                  ))}
                </div>
              ) : <p className="pf-shelf-hint">Tippe auf einen Platz, um die Karte zu tauschen.</p>}
            </>
          ) : <p className="hint">Noch keine Karten – öffne dein erstes Pack im Shop.</p>}
        </section>

        <h2 className="hub-section">Statistiken</h2>
        <ul className="pf-stats">
          {profileStats(club, careers).map((s) => (
            <li key={s.label}><span className="pf-st-ic"><Icon name={s.icon} size={18} /></span><small>{s.label}</small><strong>{s.value}</strong></li>
          ))}
        </ul>
      </div>

      {custom && (
        <div className="pf-sheet-wrap" role="dialog" aria-modal="true" aria-label="Profil anpassen" onClick={() => setCustom(false)}>
          <div className="pf-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="pf-sheet-head"><strong>Anpassen</strong><button className="pf-x" onClick={() => setCustom(false)} aria-label="Schließen"><Icon name="close" size={20} /></button></div>
            <div className="pf-tabs" role="tablist">
              {TABS.map(([id, label]) => (
                <button key={id} role="tab" aria-selected={tab === id} className={`pf-tab ${tab === id ? 'on' : ''}`} onClick={() => setTab(id)}>
                  {label}{id === 'title' && <small>{titlesOpen}/{TITLES.length}</small>}
                </button>
              ))}
            </div>
            <div className="pf-sheet-body" key={tab}>
              {tab === 'emblem' && (
                <div className="pf-grid">
                  {EMBLEMS.map((e) => (
                    <button key={e} className={`pf-pick ${p.emblem === e ? 'on' : ''}`} onClick={() => save({ emblem: e })} aria-label={`Wappen ${e}`} aria-pressed={p.emblem === e}>
                      <Emblem emblem={e} color={p.color} size={52} />
                    </button>
                  ))}
                </div>
              )}
              {tab === 'color' && (
                <div className="pf-grid colors">
                  {PROFILE_COLORS.map((c) => (
                    <button key={c} className={`pf-color ${p.color === c ? 'on' : ''}`} style={{ '--pc': c } as React.CSSProperties} onClick={() => save({ color: c })} aria-label={`Farbe ${c}`} aria-pressed={p.color === c} />
                  ))}
                </div>
              )}
              {tab === 'name' && (
                <ul className="pf-fx">
                  {NAME_FX.map((f) => {
                    const own = nameFxOwned(club, f.id);
                    const on = fx === f.id;
                    const afford = club.coins >= f.price;
                    return (
                      <li key={f.id} className={`pf-fx-row ${on ? 'on' : ''}`}>
                        <span className="pf-fx-text">
                          <b className={`nfx nfx-${f.id}`} data-text={p.name}>{p.name}</b>
                          <small>{f.name} · {f.text}</small>
                        </span>
                        {on ? <span className="pf-fx-tag">Aktiv</span>
                          : own ? <button className="btn secondary small" onClick={() => save({ nameFx: f.id })}>Anlegen</button>
                          : (
                            <button className="btn primary small pf-fx-buy" disabled={!afford} onClick={() => {
                              const c = buyNameFx(getClubState(), f.id);
                              if (!c) return;
                              setClubState(c);
                              try { play('fanfare'); } catch { /* kein Ton */ }
                            }} aria-label={afford ? `${f.name} kaufen für ${fmtMio(f.price)} Coins` : `Dir fehlen ${fmtMio(f.price - club.coins)} Coins`}>
                              {afford ? <><Icon name="coin" size={14} />{fmtMio(f.price)}</> : <><Icon name="lock" size={14} />{fmtMio(f.price)}</>}
                            </button>
                          )}
                      </li>
                    );
                  })}
                </ul>
              )}
              {tab === 'banner' && (
                <div className="pf-banners">
                  {BANNERS.map((b) => {
                    const open = bannerOpen(b, club, lvl.level);
                    return (
                      <button key={b.id} className={`pf-bn bn-${b.id} ${banner.id === b.id ? 'on' : ''}`} disabled={!open} onClick={() => save({ banner: b.id })} aria-pressed={banner.id === b.id}>
                        <span className="pf-banner" aria-hidden="true" />
                        <b>{b.name}</b>
                        {!open && <small><Icon name="lock" size={14} />{b.need}</small>}
                      </button>
                    );
                  })}
                </div>
              )}
              {tab === 'title' && (
                <ul className="pf-titles">
                  {TITLES.map((t) => {
                    const open = t.ok(club, careers);
                    return (
                      <li key={t.id}>
                        <button className={`pf-ttl ${title.id === t.id ? 'on' : ''}`} disabled={!open} onClick={() => save({ title: t.id })} aria-pressed={title.id === t.id}>
                          <b>{t.name}</b>
                          <small>{open ? (title.id === t.id ? 'Ausgewählt' : 'Freigeschaltet') : <><Icon name="lock" size={14} />{t.need}</>}</small>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
