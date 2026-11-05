import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { getClubState, setClubState } from '../clubStore';
import { getClub } from '../data/leagues';
import { ADS_PER_BREAK, VERIFIED_AT, deletePost, fmtFollowers, gramOf, highlightCards, makePost, setProfile, type GramPost } from '../game/kickgram';
import { BRANDS } from '../game/kit';
import { currentClubId } from '../game/player';
import type { Career } from '../game/types';
import { deleteImage, saveImage, useGramImage } from '../gramImages';
import { motionReduced } from '../settings';
import { play } from '../sound';
import Icon from './Icon';

const sfx = (id: Parameters<typeof play>[0]) => { try { play(id); } catch { /* kein Ton */ } };
const fmt = (n: number) => n.toLocaleString('de-DE');

/** Kickgram: eigenes Profil, Fotos aus der Galerie, Likes, Kommentare, Follower. */
export default function KickgramPanel({ career, onChange, onClose }: { career: Career; onChange: (c: Career) => void; onClose: () => void }) {
  const g = gramOf(career);
  const [open, setOpen] = useState<GramPost | null>(null);
  const [fresh, setFresh] = useState<{ post: GramPost; coins: number } | null>(null);
  const [compose, setCompose] = useState(false);
  const [edit, setEdit] = useState(false);
  const p = career.player;
  const club = career.phase === 'retired' ? 'Karriere beendet' : getClub(currentClubId(p)).name;
  const verified = g.followers >= VERIFIED_AT;

  return (
    <div className="overlay kg" role="dialog" aria-modal="true" aria-label="Kickgram">
      <div className="kg-inner">
        <header className="kg-top">
          <button className="kg-back" onClick={onClose} aria-label="Zurück"><Icon name="arrow" size={20} /></button>
          <b className="kg-logo">Kickgram</b>
          <button className="kg-plus" onClick={() => setCompose(true)} aria-label="Neuer Beitrag"><Icon name="plus" size={22} /></button>
        </header>

        <section className="kg-profile">
          <Avatar k={g.avatar} name={p.name} ring={g.posts.length > 0} />
          <ul className="kg-counts">
            <li><b>{fmt(g.posts.length)}</b><span>Beiträge</span></li>
            <li><b key={g.followers} className="kg-bump">{fmtFollowers(g.followers)}</b><span>Follower</span></li>
            <li><b>{fmt(g.following)}</b><span>Gefolgt</span></li>
          </ul>
        </section>
        <div className="kg-bio">
          <b>@{g.handle}{verified && <i className="kg-verified" title="Verifiziert"><Icon name="check" size={11} /></i>}</b>
          <span className="kg-name">{p.name} · {p.position} · {club}</span>
          {career.kit && <span className="kg-sponsor">Athlet von <em className={`kit-mark km-${career.kit.brand}`}>{BRANDS[career.kit.brand].name}</em></span>}
          {g.bio && <p>{g.bio}</p>}
          {!verified && <small className="kg-goal">Noch {fmtFollowers(VERIFIED_AT - g.followers)} Follower bis zum blauen Haken</small>}
        </div>
        <div className="kg-btns">
          <button className="kg-btn" onClick={() => setEdit(true)}>Profil bearbeiten</button>
          <button className="kg-btn primary" onClick={() => setCompose(true)}><Icon name="plus" size={16} />Neuer Beitrag</button>
        </div>

        {g.posts.length ? (
          <div className="kg-grid">
            {g.posts.map((post) => (
              <button key={post.id} className="kg-tile" onClick={() => setOpen(post)} aria-label={post.caption || 'Beitrag'}>
                <PostMedia post={post} />
                <span className="kg-tile-hover"><Icon name="heart" size={16} />{fmtFollowers(post.likes)}</span>
                {post.ad && <i className="kg-ad">Werbung</i>}
              </button>
            ))}
          </div>
        ) : (
          <div className="kg-empty">
            <span className="kg-empty-ring"><Icon name="camera" size={34} /></span>
            <b>Teile dein erstes Foto</b>
            <p>Lade ein Bild aus deiner Galerie hoch oder poste ein Saison-Highlight. Gute Posts bringen neue Follower – und Follower locken größere Marken.</p>
            <button className="kg-btn primary" onClick={() => setCompose(true)}>Ersten Beitrag erstellen</button>
          </div>
        )}
        <p className="kg-note">Deine Bilder bleiben auf diesem Gerät gespeichert und werden nirgendwo hochgeladen.</p>
      </div>

      {createPortal(<>
        {compose && <Composer career={career} onClose={() => setCompose(false)} onPost={(c, post, coins) => {
          onChange(c);
          setCompose(false);
          if (coins) { const cs = getClubState(); setClubState({ ...cs, coins: cs.coins + coins }); }
          setFresh({ post, coins });
          sfx('revealRare');
        }} />}
        {(open || fresh) && <PostView post={(fresh?.post ?? open)!} career={career} fresh={fresh} onClose={() => { setOpen(null); setFresh(null); }}
          onDelete={(post) => { if (!window.confirm('Beitrag löschen?')) return; if (post.img) deleteImage(post.img); onChange(deletePost(career, post.id)); setOpen(null); setFresh(null); }} />}
        {edit && <EditProfile career={career} onClose={() => setEdit(false)} onSave={(c) => { onChange(c); setEdit(false); sfx('tap'); }} />}
      </>, document.body)}
    </div>
  );
}

function Avatar({ k, name, ring, size = 86 }: { k?: string; name: string; ring?: boolean; size?: number }) {
  const url = useGramImage(k);
  const initials = name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
  return (
    <span className={`kg-avatar ${ring ? 'ring' : ''}`} style={{ width: size, height: size }}>
      {url && url !== 'missing' ? <img src={url} alt="" /> : <b style={{ fontSize: size * 0.32 }}>{initials}</b>}
    </span>
  );
}

function PostMedia({ post }: { post: GramPost }) {
  const url = useGramImage(post.img);
  if (post.card) return <span className={`kg-card t-${post.card.tone}`}><b>{post.card.title}</b><small>{post.card.sub}</small><i>Kickgram</i></span>;
  if (url === 'missing') return <span className="kg-card t-blue"><small>Bild nicht auf diesem Gerät</small></span>;
  return url ? <img className="kg-img" src={url} alt="" /> : <span className="kg-card t-blue kg-loading" />;
}

// ---------- Neuer Beitrag ----------
function Composer({ career, onClose, onPost }: { career: Career; onClose: () => void; onPost: (c: Career, p: GramPost, coins: number) => void }) {
  const [img, setImg] = useState<{ key: string } | null>(null);
  const [card, setCard] = useState<GramPost['card'] | null>(null);
  const [caption, setCaption] = useState('');
  const [ad, setAd] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const file = useRef<HTMLInputElement>(null);
  const g = gramOf(career);
  const sameBreak = g.breakKey === `${career.year}-${career.phase}`;
  const adsLeft = career.kit ? ADS_PER_BREAK - (sameBreak ? g.breakAds ?? 0 : 0) : 0;
  const cards = highlightCards(career);

  const pickFile = async (f?: File) => {
    if (!f) return;
    setErr(''); setBusy(true);
    try { const key = await saveImage(f, true); setImg({ key }); setCard(null); }
    catch { setErr('Das Bild konnte nicht geladen werden. Versuch ein anderes (JPG oder PNG).'); }
    finally { setBusy(false); }
  };
  const share = () => {
    if (!img && !card) return;
    const res = makePost(career, { img: img?.key, card: card ?? undefined, caption, ad: ad && adsLeft > 0 });
    onPost(res.career, res.post, res.coins);
  };
  const cancel = () => { if (img) deleteImage(img.key); onClose(); };

  return (
    <div className="kg-sheet" role="dialog" aria-modal="true" aria-label="Neuer Beitrag">
      <div className="kg-sheet-inner">
        <header className="kg-sheet-head">
          <button className="kg-link" onClick={cancel}>Abbrechen</button>
          <b>Neuer Beitrag</b>
          <button className="kg-link strong" onClick={share} disabled={(!img && !card) || busy}>Teilen</button>
        </header>
        <div className="kg-preview">
          {img ? <PostMedia post={{ img: img.key } as GramPost} /> : card ? <PostMedia post={{ card } as GramPost} /> : (
            <button className="kg-pick" onClick={() => file.current?.click()} disabled={busy}>
              <Icon name="camera" size={40} /><b>{busy ? 'Wird geladen …' : 'Foto aus der Galerie'}</b><small>Wird quadratisch zugeschnitten</small>
            </button>
          )}
        </div>
        <input ref={file} type="file" accept="image/*" hidden onChange={(e) => { pickFile(e.target.files?.[0]); e.target.value = ''; }} />
        {err && <p className="kg-err">{err}</p>}
        <div className="kg-choose">
          <button className={`kg-chip ${img ? 'on' : ''}`} onClick={() => file.current?.click()}><Icon name="camera" size={14} />{img ? 'Anderes Foto' : 'Galerie'}</button>
          {cards.map((c, i) => (
            <button key={i} className={`kg-chip t-${c.tone} ${card === c ? 'on' : ''}`} onClick={() => { if (img) deleteImage(img.key); setImg(null); setCard(c); }}>{c.title}</button>
          ))}
        </div>
        <textarea className="kg-caption" placeholder="Bildunterschrift schreiben …" maxLength={300} value={caption} onChange={(e) => setCaption(e.target.value)} rows={3} />
        {career.kit && (
          <label className={`kg-adtoggle ${adsLeft <= 0 ? 'off' : ''}`}>
            <input type="checkbox" checked={ad && adsLeft > 0} disabled={adsLeft <= 0} onChange={(e) => setAd(e.target.checked)} />
            <span><b>Werbepost für {BRANDS[career.kit.brand].name}</b><small>{adsLeft > 0 ? `Bringt Coins · noch ${adsLeft} in dieser Pause` : 'In dieser Pause schon genug Werbung gemacht'}</small></span>
          </label>
        )}
        <p className="kg-hint">Tipp: Fotos und eine echte Bildunterschrift bringen mehr Likes. Viele Posts direkt hintereinander bringen immer weniger.</p>
      </div>
    </div>
  );
}

// ---------- Beitrag ansehen (frisch geteilt: Likes zählen hoch, Herzen fliegen) ----------
function PostView({ post, career, fresh, onClose, onDelete }: { post: GramPost; career: Career; fresh: { post: GramPost; coins: number } | null; onClose: () => void; onDelete: (p: GramPost) => void }) {
  const g = gramOf(career);
  const [likes, setLikes] = useState(() => (fresh && !motionReduced() ? 0 : post.likes));
  const [liked, setLiked] = useState(false);
  const [burst, setBurst] = useState(0);
  const lastTap = useRef(0);
  useEffect(() => {
    if (!fresh || motionReduced()) return;
    const t0 = performance.now();
    let raf = 0;
    const step = (t: number) => {
      const k = Math.min(1, (t - t0) / 1800);
      setLikes(Math.round(post.likes * (1 - Math.pow(1 - k, 3))));
      if (k < 1) raf = requestAnimationFrame(step); else sfx('coin');
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [fresh, post.likes]);
  const like = () => { setLiked(true); setBurst((b) => b + 1); sfx('tap'); try { navigator.vibrate?.(15); } catch { /* egal */ } };
  const tap = () => { const now = Date.now(); if (now - lastTap.current < 320) like(); lastTap.current = now; };
  return (
    <div className="kg-sheet kg-view" role="dialog" aria-modal="true" aria-label="Beitrag">
      <div className="kg-sheet-inner">
        <header className="kg-sheet-head">
          <button className="kg-link" onClick={onClose}>‹ Zurück</button>
          <b>Beitrag</b>
          <button className="kg-link danger" onClick={() => onDelete(post)}>Löschen</button>
        </header>
        <div className="kg-post-head"><Avatar k={g.avatar} name={career.player.name} size={34} /><b>@{g.handle}</b>{post.ad && <i className="kg-ad inline">Werbung · {BRANDS[post.ad].name}</i>}</div>
        <div className="kg-media" onClick={tap}>
          <PostMedia post={post} />
          {burst > 0 && <Icon key={burst} name="heart" size={110} className="kg-bigheart" />}
          {fresh && !motionReduced() && Array.from({ length: 10 }, (_, i) => <i key={i} className="kg-float" style={{ left: `${10 + ((i * 37) % 80)}%`, animationDelay: `${(i % 5) * 0.16}s` }}><Icon name="heart" size={18 + (i % 3) * 6} /></i>)}
        </div>
        <div className="kg-actions">
          <button className={`kg-heart ${liked ? 'on' : ''}`} onClick={like} aria-label="Gefällt mir"><Icon name="heart" size={26} /></button>
          <b>{fmt(likes + (liked ? 1 : 0))} „Gefällt mir“-Angaben</b>
        </div>
        {fresh && (
          <div className="kg-gain">
            <span><b>+{fmt(post.gained)}</b> neue Follower</span>
            {fresh.coins > 0 && <span className="coins"><b>+{fmt(fresh.coins)}</b> Coins von {BRANDS[post.ad!].name}</span>}
          </div>
        )}
        {post.caption && <p className="kg-cap"><b>@{g.handle}</b> {post.caption}</p>}
        <ul className="kg-comments">
          {post.comments.map((c, i) => <li key={i} style={{ animationDelay: fresh ? `${1.2 + i * 0.25}s` : '0s' }} className={fresh ? 'late' : ''}><b>{c.user}</b> {c.text}</li>)}
        </ul>
        <small className="kg-when">Saison {post.season}</small>
      </div>
    </div>
  );
}

// ---------- Profil bearbeiten ----------
function EditProfile({ career, onClose, onSave }: { career: Career; onClose: () => void; onSave: (c: Career) => void }) {
  const g = gramOf(career);
  const [handle, setHandle] = useState(g.handle);
  const [bio, setBio] = useState(g.bio);
  const [avatar, setAvatar] = useState(g.avatar);
  const [busy, setBusy] = useState(false);
  const file = useRef<HTMLInputElement>(null);
  const pick = async (f?: File) => {
    if (!f) return;
    setBusy(true);
    try { const key = await saveImage(f, true, 400); setAvatar(key); } catch { /* ungültiges Bild */ }
    setBusy(false);
  };
  return (
    <div className="kg-sheet" role="dialog" aria-modal="true" aria-label="Profil bearbeiten">
      <div className="kg-sheet-inner">
        <header className="kg-sheet-head">
          <button className="kg-link" onClick={() => { if (avatar !== g.avatar && avatar) deleteImage(avatar); onClose(); }}>Abbrechen</button>
          <b>Profil bearbeiten</b>
          <button className="kg-link strong" onClick={() => { if (g.avatar && avatar !== g.avatar) deleteImage(g.avatar); onSave(setProfile(career, { handle, bio, avatar })); }}>Fertig</button>
        </header>
        <div className="kg-edit-av">
          <Avatar k={avatar} name={career.player.name} size={96} />
          <button className="kg-link strong" onClick={() => file.current?.click()} disabled={busy}>{busy ? 'Wird geladen …' : 'Profilbild ändern'}</button>
          <input ref={file} type="file" accept="image/*" hidden onChange={(e) => { pick(e.target.files?.[0]); e.target.value = ''; }} />
        </div>
        <label className="kg-field"><span>Benutzername</span><input value={handle} maxLength={22} onChange={(e) => setHandle(e.target.value)} /></label>
        <label className="kg-field"><span>Bio</span><textarea value={bio} maxLength={150} rows={3} onChange={(e) => setBio(e.target.value)} placeholder="Erzähl etwas über dich …" /></label>
      </div>
    </div>
  );
}
