import { describe, expect, it } from 'vitest';
import { CARD_POOL, freshClub, withUpgrade, getCard, type ClubState } from '../club';
import { EVO_CAP, EVO_FEE, EVO_PATHS, evoAfterDuel, evoBlocker, startEvo } from '../evolutions';
import type { DuelResult } from '../squad';

const win = (opp = 1): DuelResult => ({ own: 2, opp, outcome: 'win', coins: 0, goals: [] });
const striker = CARD_POOL.find((c) => c.variant === 'gold' && c.position === 'ST' && c.ovr <= 80)!;
const silver = CARD_POOL.find((c) => c.variant === 'silver' && c.ovr <= 74)!;

function clubWith(id: string): ClubState {
  const squad: (string | null)[] = Array(11).fill(null);
  squad[0] = id;
  return { ...freshClub(), coins: 100_000, cards: { [id]: 1 }, squad };
}

describe('Evolutions', () => {
  it('Start kostet die Gebühr, nur passende Karten', () => {
    const club = clubWith(striker.id);
    const torinstinkt = EVO_PATHS.find((p) => p.id === 'torinstinkt')!;
    const mauer = EVO_PATHS.find((p) => p.id === 'mauer')!;
    expect(evoBlocker(club, torinstinkt, striker.id)).toBeNull();
    expect(evoBlocker(club, mauer, striker.id)).toBe('Falsche Position');
    const icon = CARD_POOL.find((c) => c.variant === 'icon' && c.position === 'ST')!;
    expect(evoBlocker({ ...club, cards: { [icon.id]: 1 } }, torinstinkt, icon.id)).toMatch(/Ikonen/);
    const started = startEvo(club, 'torinstinkt', striker.id)!;
    expect(started.coins).toBe(100_000 - EVO_FEE);
    expect(started.evo?.active?.card).toBe(striker.id);
    expect(startEvo(started, 'torinstinkt', striker.id)).toBeNull(); // nur eine gleichzeitig
  });

  it('Siege mit der Karte in der Elf bringen Stufen – insgesamt höchstens +5', () => {
    let club = startEvo(clubWith(striker.id), 'torinstinkt', striker.id)!;
    for (let i = 0; i < 3; i++) club = evoAfterDuel(club, win(), 1).club;
    expect(withUpgrade(club, getCard(striker.id)!).ovr).toBe(striker.ovr + 1);
    // Stufe 2 verlangt Duell-Stufe 3: Siege auf Stufe 1 zählen nicht
    const low = evoAfterDuel(club, win(), 1);
    expect(low.progress?.counted).toBe(false);
    for (let i = 0; i < 3; i++) club = evoAfterDuel(club, win(), 3).club;
    for (let i = 0; i < 2; i++) club = evoAfterDuel(club, win(), 5).club;
    expect(club.upgrades?.[striker.id]).toBe(EVO_CAP);
    expect(club.evo?.active).toBeUndefined();
    expect(club.evo?.done?.[striker.id]).toEqual(['torinstinkt']);
    // Deckel: kein weiterer Pfad mehr möglich
    expect(evoBlocker(club, EVO_PATHS.find((p) => p.id === 'torinstinkt')!, striker.id)).toBeTruthy();
  });

  it('Niederlage, fehlende Aufstellung oder Gegentor zählen nicht', () => {
    let club = startEvo(clubWith(striker.id), 'torinstinkt', striker.id)!;
    expect(evoAfterDuel(club, { ...win(), outcome: 'loss' }, 1).progress?.counted).toBe(false);
    club = { ...club, squad: Array(11).fill(null) };
    expect(evoAfterDuel(club, win(), 1).progress?.counted).toBe(false);
  });

  it('Deckel greift auch über mehrere Pfade, Silber wird zu Gold', () => {
    let club: ClubState = { ...clubWith(silver.id), upgrades: { [silver.id]: 4 } };
    club = startEvo(club, 'silber', silver.id) ?? club;
    if (silver.ovr + 4 > 74) return; // Karte schon zu stark für den Pfad
    for (let i = 0; i < 3; i++) club = evoAfterDuel(club, win(), 1).club;
    expect(club.upgrades?.[silver.id]).toBe(EVO_CAP); // +2 gedeckelt auf +1
    const card = withUpgrade(club, getCard(silver.id)!);
    expect(card.ovr).toBe(silver.ovr + EVO_CAP);
    if (card.ovr >= 75) expect(card.variant).toBe('gold');
  });
});
