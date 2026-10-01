import { ITEMS, applyItem, canUseItem, type ItemKind } from '../game/club';
import type { Career } from '../game/types';
import { getClubState, setClubState, useClub } from '../clubStore';

/** Items aus Packs im Karrieremodus einsetzen (nur sichtbar, wenn man welche hat). */
export default function ItemsPanel({ career, onChange }: { career: Career; onChange: (c: Career) => void }) {
  const club = useClub();
  const kinds = (Object.keys(ITEMS) as ItemKind[]).filter((k) => club.items[k] > 0);
  if (!kinds.length) return null;
  const use = (k: ItemKind) => {
    const next = applyItem(career, k);
    if (next === career) return;
    const c = getClubState();
    setClubState({ ...c, items: { ...c.items, [k]: c.items[k] - 1 } });
    onChange(next);
  };
  return (
    <div className="panel items-panel">
      <h3>Deine Items</h3>
      <div className="items-row">
        {kinds.map((k) => {
          const ok = canUseItem(career, k);
          return (
            <button key={k} className="btn secondary small" disabled={!ok} onClick={() => use(k)} title={ITEMS[k].text}>
              {ITEMS[k].icon} {ITEMS[k].name} ×{club.items[k]}
            </button>
          );
        })}
      </div>
      <p className="hint">
        {kinds.map((k) => `${ITEMS[k].name}: ${ITEMS[k].text}`).join(' · ')}
      </p>
    </div>
  );
}
