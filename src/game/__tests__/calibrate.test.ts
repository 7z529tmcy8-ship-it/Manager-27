import { it } from 'vitest';
import { slugify } from '../../data/leagues';
import { createCareer, playSeason, stayAtClub, acceptOffer } from '../career';

// Gibt ein paar Beispielkarrieren aus (nur zur Kalibrierung, keine Assertions).
const env = (globalThis as { process?: { env: Record<string, string | undefined> } }).process?.env ?? {};

it.skipIf(!env.CALIBRATE)('Beispielkarrieren', { timeout: 120000 }, () => {
  const cases = [
    { name: 'Talent Freiburg', position: 'ST' as const, age: 17, ovr: 66, potential: 86, club: 'SC Freiburg' },
    { name: 'Talent Bayern', position: 'FL' as const, age: 17, ovr: 70, potential: 88, club: 'FC Bayern München' },
    { name: 'Haaland', position: 'ST' as const, age: 25, ovr: 91, potential: 92, club: 'Manchester City' },
    { name: 'IV 2. Liga', position: 'IV' as const, age: 19, ovr: 63, potential: 78, club: 'FC Schalke 04' },
  ];
  for (const k of cases) {
    let c = createCareer({ ...k, nation: 'Deutschland', clubId: slugify(k.club) });
    for (let i = 0; i < 18 && c.phase !== 'retired'; i++) {
      c = playSeason(c);
      if (c.phase !== 'window') break;
      const better = c.offers.find((o) => o.type !== 'Leihe');
      if (c.player.contract.yearsLeft <= 0 && !c.offers.length) break;
      c = c.player.contract.yearsLeft > 0 ? stayAtClub(c) : acceptOffer(c, better ?? c.offers[0]);
    }
    console.log(`\n== ${k.name}`);
    for (const s of c.history) {
      console.log(
        `${s.season} ${String(s.age).padStart(2)}J ${s.clubId.padEnd(24)} ${s.ovrStart}->${s.ovrEnd} ` +
          `Sp ${String(s.apps).padStart(2)} Min ${Math.round((100 * s.minutes) / s.possibleMinutes)}% ` +
          `T ${String(s.goals).padStart(2)} V ${String(s.assists).padStart(2)} Note ${s.avgRating} Pl ${s.leaguePosition} ` +
          `${s.trophies.join(', ')} ${s.awards.join(', ')}`,
      );
    }
  }
});
