import { expect, it } from 'vitest';
import { getClub, getLeague, slugify } from '../../data/leagues';
import { createCareer } from '../career';
import { generateOffers } from '../offers';
import { clubLeagueId, currentClubId } from '../player';
import { seasonChoices } from '../simple';

const basis = (clubId: string, rating = 7.1) => ({ clubId, onLoan: false, minutes: 2500, possibleMinutes: 3000, avgRating: rating });

it('Junge Spieler mit wenig Wertung: Profi-Angebote vor allem aus 2./3. Liga, dazu NLZ- und U23-Angebote', () => {
  const tiers: number[] = [];
  let nlz = 0;
  let u23 = 0;
  for (let i = 0; i < 150; i++) {
    const c = createCareer({ name: 'Jung', nation: 'Deutschland', position: 'ZM', age: 17, ovr: 63, potential: 82, clubId: slugify('SV Werder Bremen') });
    c.player.age = 18;
    for (const o of generateOffers(c, basis(currentClubId(c.player)))) {
      if (o.tag === 'nlz') {
        nlz++;
        expect(o.nlz).toBe('U19');
        expect(o.wage).toBeLessThanOrEqual(2_500);
      } else if (o.tag === 'u23') {
        u23++;
        expect(getClub(o.clubId).name.endsWith(' II')).toBe(true);
      } else if (o.type === 'Transfer' || o.type === 'Ablösefrei') tiers.push(getLeague(clubLeagueId(c, o.clubId)).tier);
    }
  }
  const top = tiers.filter((t) => t === 1).length / tiers.length;
  expect(tiers.length).toBeGreaterThan(50);
  expect(top).toBeLessThan(0.25);
  expect(tiers.some((t) => t >= 3)).toBe(true);
  expect(nlz).toBeGreaterThan(30);
  expect(u23).toBeGreaterThan(20);
});

it('Junge Profis bekommen keine Angebote zurück in eine U19', () => {
  const c = createCareer({ name: 'Profi', nation: 'Deutschland', position: 'ZM', age: 17, ovr: 72, potential: 84, clubId: slugify('SV Werder Bremen') });
  expect(c.player.nlz).toBeUndefined();
  for (let i = 0; i < 40; i++) expect(generateOffers(c, basis(c.player.contract.clubId)).some((o) => o.tag === 'nlz')).toBe(false);
});

it('Kein NLZ-Angebot mehr ab 19, keine U23-Angebote ab 23', () => {
  const c = createCareer({ name: 'Alt', nation: 'Deutschland', position: 'ZM', age: 23, ovr: 66, potential: 74, clubId: slugify('SV Werder Bremen') });
  for (let i = 0; i < 40; i++) {
    expect(generateOffers(c, basis(c.player.contract.clubId)).some((o) => o.tag === 'nlz' || o.tag === 'u23')).toBe(false);
  }
});

it('NLZ-Wechsel annehmen: Spieler landet in der U19 des neuen Vereins', async () => {
  const { acceptOffer } = await import('../career');
  for (let i = 0; i < 50; i++) {
    const c = createCareer({ name: 'Wechsel', nation: 'Deutschland', position: 'ST', age: 17, ovr: 63, potential: 84, clubId: slugify('SV Werder Bremen') });
    c.phase = 'window';
    c.offers = generateOffers(c, basis(currentClubId(c.player)));
    const o = c.offers.find((x) => x.tag === 'nlz');
    if (!o) continue;
    expect(seasonChoices(c).some((ch) => ch.kind === 'nlz')).toBe(true);
    const next = acceptOffer(c, o);
    expect(next.player.contract.clubId).toBe(o.clubId);
    expect(next.player.nlz?.team).toBe('U19');
    expect(getLeague(getClub(currentClubId(next.player)).leagueId).youth).toBe('U19');
    return;
  }
  throw new Error('kein NLZ-Angebot gefunden');
});
