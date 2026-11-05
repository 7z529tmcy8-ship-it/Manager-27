import { describe, expect, it } from 'vitest';
import { slugify } from '../../data/leagues';
import { createCareer } from '../career';
import { applyChoice, seasonChoices, simulateToBreak } from '../simple';
import { acceptKit, declineKit, interested, kitYear, makeOffer, refreshKitOffers } from '../kit';
import { ADS_PER_BREAK, fameTarget, gramOf, gramYear, makePost } from '../kickgram';
import type { Career } from '../types';

const youth = () => createCareer({ name: 'Jonas Talent', nation: 'Deutschland', position: 'ST', age: 17, ovr: 62, potential: 84, clubId: slugify('Hannover 96') });
const star = () => createCareer({ name: 'Star', nation: 'Brasilien', position: 'FL', age: 26, ovr: 88, potential: 90, clubId: slugify('Real Madrid') });

describe('Ausrüster', () => {
  it('Jugendspieler: Winnerz interessiert, Helmut Lang nicht; Topstar: Helmut Lang', () => {
    expect(interested(youth())).toContain('winnerz');
    expect(interested(youth())).not.toContain('helmut');
    expect(interested(star())).toEqual(expect.arrayContaining(['ami', 'helmut']));
    expect(makeOffer(star(), 'helmut').fee).toBeGreaterThan(makeOffer(youth(), 'winnerz').fee);
    expect(makeOffer(youth(), 'winnerz').youth).toBe(true);
  });

  it('Angebote in der Pause, unterschreiben, Geld am Saisonende, Vertrag läuft aus', () => {
    let c: Career = { ...youth(), phase: 'window' };
    for (let i = 0; i < 10 && !(c.kitOffers?.length); i++) { c = { ...c, kitOffers: [] }; refreshKitOffers(c); }
    expect(c.kitOffers!.length).toBeGreaterThan(0);
    expect(c.inbox?.[0].kind).toBe('contract');
    const o = c.kitOffers![0];
    c = acceptKit(c, o.id);
    expect(c.kit?.brand).toBe(o.brand);
    expect(c.kitOffers).toEqual([]);
    c = structuredClone(c);
    c.history = [{ goals: 10, trophies: ['Pokal'] } as unknown as Career['history'][number]];
    const pay = kitYear(c);
    expect(pay.coins).toBe(o.fee + 10 * o.goalBonus + o.titleBonus);
    for (let i = 1; i < o.years; i++) kitYear(c);
    expect(c.kit).toBeNull();
    expect(c.kitHistory?.[0].brand).toBe(o.brand);
    expect(declineKit({ ...c, kitOffers: [o] }, o.id).kitOffers).toEqual([]);
  });

  it('Ganze Saison: Jahresabschluss zahlt den Vertrag über das Haushaltseinkommen', () => {
    let c = youth();
    c = { ...c, kitOffers: [{ ...makeOffer(c, 'winnerz'), id: 'x' }] };
    c = acceptKit(c, 'x');
    const before = c.household?.totalIncome ?? 0;
    c = simulateToBreak(simulateToBreak(c));
    expect(c.phase).toBe('window');
    expect((c.household?.totalIncome ?? 0) - before).toBeGreaterThanOrEqual(c.kit ? c.kit.fee : 0);
    expect(gramOf(c).followers).toBeGreaterThan(gramOf(youth()).followers);
    const next = applyChoice(c, seasonChoices(c)[0]);
    expect(next).toBeTruthy();
  });
});

describe('Kickgram', () => {
  it('Post bringt Likes und Follower, Wiederholung bringt weniger, Werbepost zahlt nur mit Vertrag und begrenzt', () => {
    let c: Career = { ...star(), phase: 'window' };
    c = { ...c, gram: { ...gramOf(c), followers: 50_000 } };
    const a = makePost(c, { caption: 'Erstes Training heute, Vollgas!', card: { title: 'x', sub: 'y', tone: 'gold' } });
    expect(a.post.likes).toBeGreaterThan(0);
    expect(gramOf(a.career).followers).toBe(50_000 + a.post.gained);
    expect(a.coins).toBe(0);
    expect(makePost(c, { caption: 'x', ad: true }).coins).toBe(0); // ohne Vertrag keine Werbung
    c = acceptKit({ ...c, kitOffers: [{ ...makeOffer(c, 'freedom'), id: 'f' }] }, 'f');
    let paid = 0;
    for (let i = 0; i < ADS_PER_BREAK + 2; i++) { const r = makePost(c, { caption: 'Neuer Look', ad: true }); c = r.career; if (r.coins) paid++; }
    expect(paid).toBe(ADS_PER_BREAK);
    expect(gramOf(c).posts).toHaveLength(ADS_PER_BREAK + 2);
  });

  it('Follower wachsen mit Leistung; Stars ziehen mehr', () => {
    expect(fameTarget(star())).toBeGreaterThan(fameTarget(youth()) * 5);
    const c = structuredClone(youth());
    const before = gramOf(c).followers;
    expect(gramYear(c)).toMatch(/Kickgram/);
    expect(gramOf(c).followers).toBeGreaterThan(before);
  });
});
