import { expect, it } from 'vitest';
import { freshClub } from '../club';
import { NAME_MAX, managerLevel, managerXp, profileOf, profileStats, setProfile, showcaseCard } from '../profile';

it('Profil: Standard, Name begrenzt und bereinigt, Wappen und Farbe speichern', () => {
  const c = freshClub();
  expect(profileOf(c).name).toBe('Manager');
  const p = setProfile(c, { name: '   Sehr   langer   Managername mit Rest   ', emblem: 'crown', color: '#ffd24a' });
  expect(p.profile!.name.length).toBeLessThanOrEqual(NAME_MAX);
  expect(p.profile!.name).not.toMatch(/\s{2}/);
  expect(p.profile!.emblem).toBe('crown');
  expect(setProfile(c, { name: '   ' }).profile!.name).toBe('Manager');
});

it('Manager-Level steigt mit XP, Statistiken und Lieblingskarte', () => {
  expect(managerLevel(0).level).toBe(1);
  expect(managerLevel(5000).level).toBeGreaterThan(managerLevel(500).level);
  expect(managerLevel(1e9).level).toBe(100);
  const c = { ...freshClub(), trophyBest: 400, cards: { pele: 1, 'harry-kane': 1 } };
  expect(managerXp(c, [])).toBeGreaterThan(400);
  expect(showcaseCard(c)?.id).toBe('pele');
  expect(showcaseCard(setProfile(c, { showcase: 'harry-kane' }))?.id).toBe('harry-kane');
  // Gewählte Karte, die man nicht (mehr) hat, fällt auf die beste zurück
  expect(showcaseCard(setProfile(c, { showcase: 'lamine-yamal' }))?.id).toBe('pele');
  const stats = profileStats(c, []);
  expect(stats.find((s) => s.label === 'Ikonen')?.value).toBe('1');
  expect(stats.length).toBeGreaterThanOrEqual(10);
});
