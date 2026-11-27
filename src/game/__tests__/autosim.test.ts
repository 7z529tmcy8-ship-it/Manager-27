import { describe, expect, it } from 'vitest';
import { slugify } from '../../data/leagues';
import { createCareer } from '../career';
import { autoChoice, playRestOfSeason, setAutoLoad, simulateSeasons } from '../autosim';
import { stageStep } from '../simple';

const base = (age = 21, ovr = 74) => createCareer({ name: 'Auto', nation: 'Deutschland', position: 'ST', age, ovr, potential: 86, clubId: slugify('Hannover 96') });

describe('Schnell spielen', () => {
  it('Ganze Saison: vom Start bis ins Transferfenster, eine Saison mehr im Verlauf', () => {
    const c = playRestOfSeason(base());
    expect(['window', 'retired']).toContain(c.phase);
    expect(c.history.length).toBe(1);
    expect(c.history[0].apps).toBeGreaterThanOrEqual(0);
  });

  it('Ganze Saison auch mitten in der Saison (nach einer Etappe)', () => {
    const s = stageStep(base());
    const c = playRestOfSeason(s);
    expect(['window', 'retired']).toContain(c.phase);
    expect(c.history.length).toBe(1);
  });

  it('Mehrere Saisons: Automatik entscheidet, hält nach der letzten im Fenster', () => {
    for (const style of [0, 1, 2] as const) {
      const r = simulateSeasons(base(), 3, style, false);
      expect(r.seasons.length).toBeGreaterThanOrEqual(1);
      if (!r.stop) {
        expect(r.seasons.length).toBe(3);
        expect(r.career.phase).toBe('window');
      }
      // Saisons folgen lückenlos aufeinander
      for (let i = 1; i < r.seasons.length; i++) expect(Number(r.seasons[i].season.slice(0, 4))).toBe(Number(r.seasons[i - 1].season.slice(0, 4)) + 1);
    }
  });

  it('Treu verlängert, wenn möglich; Geld nimmt das höchste Gehalt', () => {
    const c = playRestOfSeason(base());
    if (c.phase !== 'window') return;
    const loyal = autoChoice(c, 0);
    const money = autoChoice(c, 2);
    expect(loyal).not.toBeNull();
    if (c.offers.some((o) => o.type === 'Verlängerung') && !loyal?.greedy) expect(loyal?.kind).toBe('extend');
    if (money?.offer && loyal?.offer && !money.greedy) expect(money.offer.wage).toBeGreaterThanOrEqual(loyal.offer.wage);
  });

  it('Belastungs-Regler gilt auch in der nächsten Saison', () => {
    let c = setAutoLoad(base(), 'rest');
    expect(c.progress?.load ?? 'rest').toBe('rest');
    c = simulateSeasons(c, 2, 0, false).career;
    expect(c.autoLoad).toBe('rest');
  });

  it('Alter Profi: Mehrsaison-Simulation endet sauber beim Karriereende', () => {
    const r = simulateSeasons(base(35, 70), 6, 0, false);
    expect(r.career.phase === 'retired' || r.stop !== null || r.seasons.length === 6).toBe(true);
  });
});
