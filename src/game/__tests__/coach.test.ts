import { expect, it } from 'vitest';
import { getLeague, slugify } from '../../data/leagues';
import { createCareer, retire } from '../career';
import { careerIcon, creditCareer, freshClub } from '../club';
import { boardTrust, chooseCoachClub, endCoaching, playCoachHalf, playCoachSeason, setTactic, signTarget, startCoaching, winterAction } from '../coach';
import { generateOffers } from '../offers';
import { clubLeagueId } from '../player';
import { applyChoice, seasonChoices, simulateToBreak } from '../simple';
import type { Career } from '../types';
import { POLICIES, setPolicy } from '../coachlife';

/** Feste Trainer-Linie für alle Situationen – dann gibt es keine offenen Meldungen. */
const withLine = (c: Career) => POLICIES.reduce((acc, p) => setPolicy(acc, p.id, p.options[0].id), c);

const veteran = (age: number, club = 'Hannover 96') => {
  const c = createCareer({ name: 'Oldie', nation: 'Deutschland', position: 'ST', age, ovr: 80, potential: 80, clubId: slugify('SV Werder Bremen') });
  // Karriere begann in Bremen, jetzt spielt er woanders.
  return { ...c, player: { ...c.player, contract: { ...c.player.contract, clubId: slugify(club), yearsLeft: 1 } } } as Career;
};

const played = () => {
  let c = createCareer({ name: 'Trainer', nation: 'Deutschland', position: 'ZM', age: 33, ovr: 82, potential: 82, clubId: slugify('Hannover 96') });
  c = simulateToBreak(simulateToBreak(c));
  return retire(c);
};

it('Exoten-Angebote erst ab 31, Heimkehr erst ab 33', () => {
  let exotic = 0;
  let home = 0;
  for (let i = 0; i < 40; i++) {
    const offers = generateOffers(veteran(34), undefined);
    if (offers.some((o) => o.tag === 'exotic' && getLeague(clubLeagueId(veteran(34), o.clubId)).exotic)) exotic++;
    if (offers.some((o) => o.tag === 'home' && o.clubId === slugify('SV Werder Bremen'))) home++;
  }
  expect(exotic).toBeGreaterThan(20);
  expect(home).toBeGreaterThan(15);
  for (let i = 0; i < 40; i++) {
    const offers = generateOffers(veteran(25), undefined);
    expect(offers.some((o) => o.tag || getLeague(clubLeagueId(veteran(25), o.clubId)).exotic)).toBe(false);
  }
});

it('Heimkehr und Abenteuer erscheinen als eigene Möglichkeiten', () => {
  const c: Career = { ...veteran(34), phase: 'window' };
  c.offers = generateOffers(c, undefined).filter((o) => o.tag);
  const choices = seasonChoices(c);
  if (c.offers.some((o) => o.tag === 'home')) expect(choices.some((x) => x.kind === 'home')).toBe(true);
  if (c.offers.some((o) => o.tag === 'exotic')) expect(choices.some((x) => x.kind === 'exotic')).toBe(true);
  const home = choices.find((x) => x.kind === 'home');
  if (home) expect(applyChoice(c, home).homecoming).toBe(true);
});

it('Ikonen-Karte: genau eine nach dem Karriereende, keine Saison-Sonderkarten', () => {
  const active = simulateToBreak(simulateToBreak(createCareer({ name: 'Aktiv', nation: 'Deutschland', position: 'ST', age: 24, ovr: 86, potential: 90, clubId: slugify('FC Bayern München') })));
  const a = creditCareer(freshClub(), { ...active, specialCards: [{ type: 'tots', season: active.history[0].season, name: 'Aktiv', position: 'ST', nation: 'Deutschland', clubId: active.history[0].clubId, ovr: 90 }] });
  expect(a.club.specials).toHaveLength(0);
  expect(a.icon).toBeNull();
  const done = retire(active);
  const b = creditCareer(a.club, done);
  expect(b.icon?.variant).toBe('icon');
  expect(b.club.specials).toHaveLength(1);
  expect(b.icon!.ovr).toBeGreaterThanOrEqual(Math.max(...done.history.map((r) => r.ovrEnd)));
  expect(creditCareer(b.club, done).icon).toBeNull();
  expect(careerIcon(done).id).toBe(b.icon!.id);
});

it('Trainerkarriere: Verein wählen, Saisons spielen, Bilanz und Ruhestand', () => {
  let c = withLine(startCoaching(played()));
  expect(c.coach?.phase).toBe('choose');
  expect(c.coach!.offers).toHaveLength(3);
  for (let i = 0; i < 12 && c.coach!.phase !== 'done'; i++) {
    const coach = c.coach!;
    c = chooseCoachClub(c, coach.offers[0] ?? coach.clubId!);
    expect(c.coach!.phase).toBe('prep');
    c = playCoachSeason(c);
    const last = c.coach!.history[c.coach!.history.length - 1];
    expect(last.position).toBeGreaterThan(0);
    expect(c.coach!.rating).toBeGreaterThanOrEqual(35);
    expect(c.coach!.offers.length).toBeGreaterThan(0);
  }
  expect(c.coach!.history.length).toBeGreaterThan(5);
  const club = creditCareer(freshClub(), c);
  expect(club.seasons).toBe(c.history.length + c.coach!.history.length);
  c = endCoaching(c);
  expect(c.coach!.phase).toBe('done');
});

it('Trainersaison: Taktik, Transfers, Winterpause mit Entscheidung', () => {
  let c = withLine(startCoaching(played()));
  c = chooseCoachClub(c, c.coach!.offers[0]);
  const live = c.coach!.live!;
  expect(live.targets.length).toBe(4);
  expect(live.budget).toBeGreaterThan(0);
  c = setTactic(c, 'defend');
  expect(c.coach!.live!.tactic).toBe('defend');
  const cheap = [...live.targets].sort((a, b) => a.fee - b.fee)[0];
  const before = c.coach!.live!.budget;
  const boostBefore = c.coach!.live!.boost; // Meldungen nach der Trainer-Linie verändern die Stärke schon vorher
  c = signTarget({ ...c, coach: { ...c.coach!, live: { ...c.coach!.live!, budget: cheap.fee + before } } }, cheap.id);
  expect(c.coach!.live!.signings).toHaveLength(1);
  expect(c.coach!.live!.boost).toBeGreaterThan(boostBefore);
  expect(c.coach!.live!.budget).toBe(before);
  c = playCoachHalf(c);
  if (c.coach!.phase === 'winter') {
    expect(c.coach!.live!.form.length).toBeGreaterThan(5);
    expect(boardTrust(c)).toBeGreaterThanOrEqual(0);
    c = winterAction(c, 'camp');
    expect(c.coach!.live!.winterDone).toBe(true);
    expect(winterAction(c, 'speech')).toBe(c);
    c = playCoachHalf(c);
  }
  expect(c.coach!.phase).toBe('choose');
  const last = c.coach!.history[0];
  expect(last.tactic).toBe('defend');
  expect(last.signings).toHaveLength(1);
});
