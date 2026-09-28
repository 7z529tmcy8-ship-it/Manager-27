import { describe, expect, it } from 'vitest';
import { canPlayIn, initialClubLeague, slugify } from '../../data/leagues';
import { acceptOffer, acceptWinterOffer, applicationsLeft, applyToClub, createCareer, totalTransferFees, playFirstHalf, playSeason, requestOffers, stayAtClub, stayInWinter } from '../career';
import type { Career } from '../types';

function runCareer(career: Career, seasons: number, choose: (c: Career) => Career = stayOrFirst): Career {
  let c = career;
  for (let i = 0; i < seasons && c.phase !== 'retired'; i++) {
    c = playSeason(c);
    if (c.phase === 'window') c = choose(c);
  }
  return c;
}

function stayOrFirst(c: Career): Career {
  if (c.player.contract.yearsLeft > 0) return stayAtClub(c);
  const ext = c.offers.find((o) => o.type === 'Verlängerung') ?? c.offers[0];
  return acceptOffer(c, ext);
}

const talent = () =>
  createCareer({ name: 'Test', nation: 'Deutschland', position: 'ST', age: 17, ovr: 66, potential: 86, clubId: slugify('SC Freiburg') });

describe('Saison-Simulation', () => {
  it('liefert plausible Saisonwerte', () => {
    const c = playSeason(talent());
    const s = c.history[0];
    expect(s.table).toHaveLength(18);
    expect(s.table.reduce((a, r) => a + r.played, 0)).toBe(18 * 34);
    expect(s.apps).toBeGreaterThanOrEqual(0);
    expect(s.minutes).toBeLessThanOrEqual(s.possibleMinutes);
    expect(c.player.age).toBe(18);
    expect(c.phase).toBe('window');
  });

  it('Auf- und Abstieg hält die Ligagrößen konstant', () => {
    const c = playSeason(talent());
    const counts: Record<string, number> = {};
    Object.values(c.clubLeague).forEach((l) => (counts[l] = (counts[l] ?? 0) + 1));
    expect(counts.bl1).toBe(18);
    expect(counts.pl).toBe(20);
    expect(counts.ch).toBe(24);
    expect(counts.bl2).toBe(18);
    expect(counts.l3).toBe(20);
    expect(counts.rln).toBe(18);
  });

  it('Toptalente mit Spielzeit entwickeln sich deutlich, alte Spieler bauen ab', () => {
    const young: number[] = [];
    const old: number[] = [];
    for (let i = 0; i < 20; i++) {
      young.push(runCareer(talent(), 5).player.ovr);
      const vet = createCareer({ name: 'Alt', nation: 'England', position: 'ST', age: 31, ovr: 86, potential: 86, clubId: slugify('Aston Villa') });
      old.push(runCareer(vet, 4).player.ovr);
    }
    const avg = (a: number[]) => a.reduce((x, y) => x + y, 0) / a.length;
    expect(avg(young)).toBeGreaterThan(76);
    expect(avg(young)).toBeLessThanOrEqual(90);
    expect(avg(old)).toBeLessThan(83);
  });

  it('Leihe wechselt den Verein für eine Saison und kehrt dann zurück', () => {
    let c = createCareer({ name: 'Leih', nation: 'Deutschland', position: 'FL', age: 18, ovr: 68, potential: 86, clubId: slugify('FC Bayern München') });
    for (let i = 0; i < 5; i++) {
      c = playSeason(c);
      const loan = c.offers.find((o) => o.type === 'Leihe');
      if (loan) {
        c = acceptOffer(c, loan);
        expect(c.player.loan?.clubId).toBe(loan.clubId);
        c = playSeason(c);
        expect(c.player.loan).toBeNull();
        expect(c.history.at(-1)!.onLoan).toBe(true);
        return;
      }
      c = stayOrFirst(c);
    }
  });

  it('Winterpause: Zwischenstand überlebt Speichern/Laden, Rückrunde vervollständigt die Saison', () => {
    const winter = playFirstHalf(talent());
    expect(winter.phase).toBe('winter');
    expect(winter.progress!.rows.bl1.reduce((a, r) => a + r.played, 0)).toBe(18 * 17);
    const reloaded = JSON.parse(JSON.stringify(winter));
    const done = stayInWinter(reloaded);
    expect(done.phase).toBe('window');
    expect(done.progress).toBeNull();
    expect(done.history[0].table.reduce((a, r) => a + r.played, 0)).toBe(18 * 34);
  });

  it('Winterwechsel: Rückrunde beim neuen Verein, danach kein Pokal mehr', () => {
    let c = createCareer({ name: 'W', nation: 'Japan', position: 'AV', age: 19, ovr: 64, potential: 80, clubId: slugify('FC Bayern München') });
    c = playFirstHalf(c);
    c = requestOffers(c, 'loan');
    const loan = c.offers.find((o) => o.type === 'Leihe')!;
    expect(loan).toBeDefined();
    const done = acceptWinterOffer(c, loan);
    const s = done.history[0];
    expect(s.winterMove?.toClubId).toBe(loan.clubId);
    expect(s.clubId).toBe(loan.clubId);
    expect(s.onLoan).toBe(true);
    // Nach Saisonende kehrt der Spieler zurück.
    expect(done.player.loan).toBeNull();
    expect(done.player.contract.clubId).toBe(slugify('FC Bayern München'));
  });

  it('Bewerbungen ab 30: Zweitligisten sagen fast immer zu, Limit pro Fenster', () => {
    const young = playSeason(talent());
    expect(applicationsLeft(young)).toBe(0);

    let accepted = 0;
    for (let i = 0; i < 20; i++) {
      let c = playSeason(createCareer({ name: 'Oldie', nation: 'Deutschland', position: 'ST', age: 32, ovr: 80, potential: 80, clubId: slugify('VfB Stuttgart') }));
      expect(applicationsLeft(c)).toBe(3);
      c = applyToClub(c, slugify('FC Schalke 04'));
      if (c.offers.some((o) => o.clubId === slugify('FC Schalke 04'))) accepted++;
      c = applyToClub(applyToClub(c, slugify('Hertha BSC')), slugify('Hannover 96'));
      expect(applicationsLeft(c)).toBe(0);
      expect(applyToClub(c, slugify('VfL Bochum'))).toBe(c);
    }
    expect(accepted).toBeGreaterThanOrEqual(12);
  });

  it('Zweite Mannschaften steigen nicht über die 3. Liga bzw. ihre erste Mannschaft hinaus', () => {
    const leagues = initialClubLeague();
    expect(canPlayIn(slugify('VfB Stuttgart II'), 'bl2', leagues)).toBe(false);
    expect(canPlayIn(slugify('Hannover 96 II'), 'l3', leagues)).toBe(true);
    expect(canPlayIn(slugify('Hannover 96 II'), 'l3', { ...leagues, [slugify('Hannover 96')]: 'l3' })).toBe(false);
    expect(canPlayIn(slugify('SV Meppen'), 'l3', leagues)).toBe(true);
  });

  it('Transfers werden mit Ablöse erfasst und summiert', () => {
    let c = playSeason(createCareer({ name: 'T', nation: 'Deutschland', position: 'ST', age: 24, ovr: 80, potential: 84, clubId: slugify('SC Freiburg') }));
    c = requestOffers(c, 'transfer');
    const offer = c.offers.find((o) => o.type === 'Transfer')!;
    c = acceptOffer(c, offer);
    expect(c.transfers).toHaveLength(1);
    expect(c.transfers![0]).toMatchObject({ window: 'Sommer', fromClubId: slugify('SC Freiburg'), toClubId: offer.clubId, fee: offer.fee });
    expect(totalTransferFees(c)).toBe(offer.fee);
  });

  it('Starke Saison mit viel Spielzeit führt bis 29 nie zu einem Minus (ohne negatives Ereignis)', () => {
    for (let i = 0; i < 40; i++) {
      const c = playSeason(createCareer({ name: 'S', nation: 'Deutschland', position: 'ST', age: 22 + (i % 8), ovr: 80, potential: 80, clubId: slugify('VfB Stuttgart') }));
      const s = c.history[0];
      const strong = s.avgRating !== null && s.avgRating >= 7.2 && s.minutes / s.possibleMinutes >= 0.5;
      const badEvent = (s.events ?? []).some((e) => e.tone === 'bad');
      if (strong && !badEvent) expect(s.ovrEnd).toBeGreaterThanOrEqual(s.ovrStart);
    }
  });
});
