import { expect, it } from 'vitest';
import { getClub, getLeague, slugify, youthClubOf, youthTeamOfClub } from '../../data/leagues';
import { createCareer, playSeason, stayAtClub } from '../career';
import { applyRetrain, nlzCompetitions, nlzDevOptions, nlzHalfEnd, nlzSeasonEnd, retrainSuggestion, setNlzProgram, setProTraining } from '../nlz';
import { currentClubId } from '../player';
import { startSeason } from '../season';
import type { Career, SeasonRecord } from '../types';

const bayern = slugify('FC Bayern München');
const talent = (age = 17, ovr = 64, clubId = bayern) =>
  createCareer({ name: 'Wisdom Test', nation: 'Deutschland', position: 'FL', age, ovr, potential: 85, clubId });

const next = (c: Career) => (c.player.contract.yearsLeft > 0 ? stayAtClub(c) : c);

it('Junge Talente starten im NLZ (U15/U17/U19/U23), fertige Spieler bei den Profis', () => {
  const u19 = talent(17);
  expect(u19.player.nlz?.team).toBe('U19');
  expect(currentClubId(u19.player)).toBe(youthClubOf(bayern, 'U19')!.id);
  expect(getLeague(getClub(currentClubId(u19.player)).leagueId).name).toBe('U19-Nachwuchsliga A');
  expect(talent(16).player.nlz?.team).toBe('U17');
  expect(talent(14, 52).player.nlz?.team).toBe('U15');
  expect(getLeague(getClub(currentClubId(talent(14, 52).player)).leagueId).name).toBe('U15-Junioren-Liga A');
  // Bayern hat im Spiel keine zweite Mannschaft – dafür eine U23.
  expect(talent(20).player.nlz?.team).toBe('U23');
  expect(talent(22).player.nlz).toBeUndefined();
  expect(talent(17, 84).player.nlz).toBeUndefined();
  // Ohne NLZ (z. B. MLS) startet man direkt bei den Profis.
  expect(createCareer({ name: 'X', nation: 'USA', position: 'ST', age: 17, ovr: 60, potential: 80, clubId: slugify('Inter Miami CF') }).player.nlz).toBeUndefined();
});

it('Ausland: U17 in Italien, in England direkt U19 und danach Premier League 2', () => {
  expect(talent(16, 60, slugify('Juventus Turin')).player.nlz?.team).toBe('U17');
  expect(talent(15, 58, slugify('Arsenal FC')).player.nlz?.team).toBe('U19');
  const u21 = youthClubOf(slugify('Arsenal FC'), 'U23')!;
  expect(u21.name).toBe('Arsenal FC U21');
  expect(getLeague(u21.leagueId).name).toBe('Premier League 2');
  expect(youthTeamOfClub(u21.id)).toBe('U23');
});

it('Saison im NLZ: U19-Liga mit Tabelle, danach mit 19 raus aus der U19 (Bayern: U23 oder Profis)', () => {
  let c = playSeason(talent(17));
  const first = c.history[0];
  expect(getLeague(first.leagueId).youth).toBe('U19');
  expect(first.table.some((r) => r.clubId === youthClubOf(bayern, 'U19')!.id)).toBe(true);
  expect(first.trophies.some((t) => t.startsWith('Meister'))).toBe(false);
  c = next(c);
  c = playSeason(c);
  c = next(c);
  expect(c.player.age).toBe(19);
  expect(c.player.nlz?.team === 'U23' || c.player.nlz === undefined).toBe(true);
});

const record = (over: Partial<SeasonRecord>): SeasonRecord => ({
  season: '2025/26', age: 17, clubId: bayern, onLoan: false, leagueId: 'bl1', ovrStart: 64, ovrEnd: 64, apps: 2, starts: 0,
  minutes: 60, possibleMinutes: 3000, goals: 0, assists: 0, cleanSheets: 0, avgRating: 6.2, injuryWeeks: 0, leaguePosition: 1,
  marketValue: 0, trophies: [], awards: [], caps: 0, internationalGoals: 0, youth: null, byCompetition: [], table: [],
  europe: null, cupReached: '', notes: [], winterMove: null, ...over,
} as SeasonRecord);
const good = { minutes: 2600, apps: 30, avgRating: 7.3 };

it('Langsamer hoch: aus U15/U17 nur Stufe für Stufe, direkt zu den Profis nur als Ausnahmetalent', () => {
  const c = talent(14, 52);
  c.player.age = 15;
  c.player.ovr = 74; // stark, aber kein Ausnahmetalent (Bayern 85)
  expect(nlzSeasonEnd(c, record(good))).toBe('up');
  expect(c.player.nlz?.team).toBe('U17');
  c.player.ovr = 82; // Ausnahmetalent
  expect(nlzSeasonEnd(c, record(good))).toBe('pros');
  expect(c.player.nlz).toBeUndefined();
});

it('Schwach bei den Profis: zurück in die U19 bzw. U23 – stark im NLZ: hochgezogen', () => {
  const c = talent(23, 70);
  expect(c.player.nlz).toBeUndefined();
  c.player.age = 18;
  expect(nlzSeasonEnd(c, record({}))).toBe('down-u19');
  expect(c.player.nlz?.team).toBe('U19');
  expect(c.inbox!.some((i) => i.title === 'Zurück in die U19')).toBe(true);

  const d = talent(23, 70);
  d.player.age = 20;
  expect(nlzSeasonEnd(d, record({}))).toBe('down-u23');

  const s = talent(17, 64);
  s.player.ovr = 78;
  expect(nlzSeasonEnd(s, record(good))).toBe('pros');
  expect(s.player.nlz).toBeUndefined();
  expect(currentClubId(s.player)).toBe(bayern);
});

it('Zweite Mannschaft: zu alt für die U19 und nicht reif → II, mit starker Saison zurück zu den Profis', () => {
  const vfb = slugify('VfB Stuttgart');
  expect(youthClubOf(vfb, 'U23')).toBeNull();
  const c = createCareer({ name: 'Y', nation: 'Deutschland', position: 'ZM', age: 18, ovr: 58, potential: 80, clubId: vfb });
  expect(c.player.nlz?.team).toBe('U19');
  c.player.age = 19;
  expect(nlzSeasonEnd(c, record({ minutes: 1500, apps: 20, avgRating: 6.8 }))).toBe('reserve');
  expect(c.player.contract.clubId).toBe(slugify('VfB Stuttgart II'));
  c.player.ovr = 75;
  expect(nlzSeasonEnd(c, record({ minutes: 2600, apps: 30, avgRating: 7.2 }))).toBe('reserve-up');
  expect(c.player.contract.clubId).toBe(vfb);
});

it('Förderprogramm und Profi-Training ändern die Entwicklung; Profi-Training bringt Einsätze', () => {
  let c = talent(18, 72);
  const base = nlzDevOptions(c).growthScale!;
  c = setNlzProgram(c, 'athletik');
  expect(nlzDevOptions(c).growthScale!).toBeGreaterThan(base);
  c = setProTraining(c, true);
  expect(c.player.nlz?.proTraining).toBe(true);
  expect(nlzDevOptions(c).training).toBe(85);
  // Zu schwach für Profi-Training
  expect(setProTraining(talent(17, 60), true).player.nlz?.proTraining).toBeUndefined();
  let apps = 0;
  for (let i = 0; i < 40; i++) {
    const t = structuredClone(c);
    t.progress = startSeason(t);
    nlzHalfEnd(t, 1);
    apps += t.player.proApps ?? 0;
  }
  expect(apps).toBeGreaterThan(5);
});

it('Umschulung: Vorschlag passt zu den Attributen, Wertung ergibt sich neu', () => {
  const c = talent(16, 62);
  const p = c.player;
  p.position = 'IV';
  p.profile = [10, 12, 4, 10, -20, -2]; // eigentlich ein Stürmer-Profil
  const s = retrainSuggestion(p)!;
  expect(s).not.toBeNull();
  expect(['ST', 'FL', 'ZOM']).toContain(s.to);
  const before = p.ovr;
  applyRetrain(p, s.to);
  expect(p.position).toBe(s.to);
  expect(p.ovr).toBeGreaterThan(before);
});

it('Jugend-Wettbewerbe: Youth League für U19 eines Champions-League-Klubs, Finale live', () => {
  let found = false;
  for (let i = 0; i < 40 && !found; i++) {
    const c = talent(17, 66);
    c.europeSlots = { ...c.europeSlots, [bayern]: 'Champions League' };
    c.progress = startSeason(c);
    nlzCompetitions(c);
    const yl = c.progress.youthComps?.find((x) => x.name === 'UEFA Youth League');
    expect(yl).toBeDefined();
    if (c.progress.pendingFinals?.some((f) => f.kind === 'youth' && f.comp === 'UEFA Youth League')) found = true;
  }
  expect(found).toBe(true);
});

it('Jugend-Finale live zu Ende spielen: Titel landet in der Saisonbilanz', async () => {
  const { autoPlayFinal, finishFinal, playSeasonUntilFinal } = await import('../career');
  for (let i = 0; i < 80; i++) {
    const c0 = talent(17, 66);
    c0.europeSlots = { ...c0.europeSlots, [bayern]: 'Champions League' };
    let c = playSeasonUntilFinal(c0);
    if (c.phase !== 'final' || c.liveFinal?.final.kind !== 'youth') continue;
    const comp = c.liveFinal.final.comp!;
    for (let k = 0; k < 6 && c.phase === 'final'; k++) c = finishFinal(autoPlayFinal(c));
    expect(c.phase).toBe('window');
    const r = c.history.at(-1)!;
    const won = r.notes.some((n) => n.includes('– Titel!') && n.includes(comp === 'UEFA Youth League' ? 'Youth-League' : 'Junioren'));
    expect(r.trophies.includes(comp)).toBe(won);
    return;
  }
  throw new Error('kein Jugend-Finale');
}, 30_000);
