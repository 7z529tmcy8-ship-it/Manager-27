import { HAIR_COLORS, SKIN_TONES, type Avatar } from '../game/creator';

/** Einfach gezeichnetes Spielergesicht (SVG) aus den Avatar-Einstellungen. */
export default function AvatarFace({ avatar, size = 64 }: { avatar: Avatar; size?: number }) {
  const skin = SKIN_TONES[avatar.skin] ?? SKIN_TONES[1];
  const hair = HAIR_COLORS[avatar.hairColor] ?? HAIR_COLORS[0];
  const shade = 'rgba(0,0,0,.18)';
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden="true" className="avatar-face">
      {/* Hinterkopf-Haare (lang, Afro) */}
      {avatar.hair === 'afro' && <circle cx="50" cy="42" r="34" fill={hair} />}
      {avatar.hair === 'long' && <path d="M20 45 Q18 85 32 92 L68 92 Q82 85 80 45 Q78 14 50 14 Q22 14 20 45Z" fill={hair} />}
      {/* Hals und Trikot */}
      <rect x="40" y="70" width="20" height="16" fill={skin} />
      <path d="M14 100 Q16 80 40 80 L60 80 Q84 80 86 100Z" fill="currentColor" opacity=".85" />
      {/* Ohren und Kopf */}
      <ellipse cx="24" cy="50" rx="5" ry="8" fill={skin} />
      <ellipse cx="76" cy="50" rx="5" ry="8" fill={skin} />
      <ellipse cx="50" cy="48" rx="26" ry="30" fill={skin} />
      {/* Bart */}
      {avatar.beard === 'stubble' && <path d="M28 56 Q30 78 50 80 Q70 78 72 56 Q66 70 50 71 Q34 70 28 56Z" fill={hair} opacity=".35" />}
      {avatar.beard === 'full' && <path d="M26 50 Q26 82 50 84 Q74 82 74 50 Q70 66 62 66 Q56 60 50 61 Q44 60 38 66 Q30 66 26 50Z" fill={hair} />}
      {avatar.beard === 'goatee' && <path d="M43 66 Q50 63 57 66 Q57 79 50 80 Q43 79 43 66Z" fill={hair} />}
      {/* Gesicht */}
      <ellipse cx="40" cy="47" rx="3.2" ry="3.6" fill="#1b1410" />
      <ellipse cx="60" cy="47" rx="3.2" ry="3.6" fill="#1b1410" />
      <path d="M35 40 Q40 37 45 40 M55 40 Q60 37 65 40" stroke={hair} strokeWidth="2.6" fill="none" strokeLinecap="round" />
      <path d="M50 50 Q47 58 51 59" stroke={shade} strokeWidth="2" fill="none" strokeLinecap="round" />
      <path d="M43 66 Q50 71 57 66" stroke="#7a3b2b" strokeWidth="2.4" fill="none" strokeLinecap="round" />
      {/* Frisur oben */}
      {avatar.hair === 'buzz' && <path d="M24 42 Q26 16 50 16 Q74 16 76 42 Q70 28 50 27 Q30 28 24 42Z" fill={hair} opacity=".55" />}
      {avatar.hair === 'short' && <path d="M23 44 Q22 14 50 14 Q78 14 77 44 Q72 26 56 25 Q40 30 30 30 Q25 34 23 44Z" fill={hair} />}
      {avatar.hair === 'curls' && (
        <g fill={hair}>
          {[[30, 26], [40, 19], [50, 17], [60, 19], [70, 26], [25, 36], [75, 36]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="9" />)}
        </g>
      )}
      {avatar.hair === 'afro' && <path d="M24 40 Q30 22 50 22 Q70 22 76 40 Q66 30 50 30 Q34 30 24 40Z" fill={hair} />}
      {avatar.hair === 'long' && <path d="M23 44 Q24 16 50 16 Q76 16 77 44 Q66 26 50 28 Q34 26 23 44Z" fill={hair} />}
      {avatar.hair === 'bun' && (
        <g fill={hair}>
          <circle cx="50" cy="10" r="9" />
          <path d="M23 44 Q22 16 50 16 Q78 16 77 44 Q70 24 50 24 Q30 24 23 44Z" />
        </g>
      )}
      {avatar.hair === 'mohawk' && (
        <g fill={hair}>
          <path d="M42 30 Q44 4 50 2 Q56 4 58 30Z" />
          <path d="M24 42 Q26 20 40 18 L40 28 Q30 30 24 42Z M76 42 Q74 20 60 18 L60 28 Q70 30 76 42Z" opacity=".35" />
        </g>
      )}
      {avatar.hair === 'bald' && <ellipse cx="42" cy="26" rx="8" ry="4" fill="#fff" opacity=".25" />}
      {avatar.headband && <rect x="23" y="30" width="54" height="7" rx="3" fill="#e5484d" />}
    </svg>
  );
}
