import { banForSeasons } from './career';
import { randInt } from './random';
import type { Career, DecisionResult } from './types';

// Klinik: Schönheits-OPs und die „volle Kur“ – teuer (Coins aus dem Club), mit echtem Nutzen und echtem Risiko.
// Schönheits-OPs bringen Glamour: Mehr Glamour heißt mehr Werbedeals (Coins bei jedem Jahresabschluss).
// Satire im Spiel – Komplikationen, Spott im Netz und Sperren gehören dazu.

export type ClinicId = 'hair' | 'veneers' | 'nose' | 'abs' | 'bbl' | 'fullkur';

export interface Treatment {
  id: ClinicId;
  icon: string;
  name: string;
  price: number;
  reward: string;
  risk: string;
  /** Nur im Sommer (Vorbereitung) möglich. */
  summerOnly?: boolean;
  confirm?: string;
  /** Wie viel Glamour die OP bei Erfolg bringt. */
  glam?: number;
  /** Chance auf Komplikationen bzw. Pfusch. */
  fail?: number;
}

export const TREATMENTS: Treatment[] = [
  { id: 'veneers', icon: '😁', name: 'Hollywood-Lächeln', price: 12_000, glam: 1, fail: 0.08,
    reward: 'Strahlende Zähne: +1 Glamour, Werbedeals', risk: '8 %: zu weiß – das Netz lacht (Skandal, kein Glamour)' },
  { id: 'hair', icon: '💇', name: 'Haartransplantation', price: 18_000, glam: 1, fail: 0.12,
    reward: 'Volle Haare: +1 Glamour, mehr Selbstvertrauen', risk: '12 %: sieht schief aus – Memes, Skandal' },
  { id: 'nose', icon: '👃', name: 'Nasen-OP', price: 25_000, glam: 1, fail: 0.15,
    reward: '+1 Glamour, freiere Atmung', risk: '15 %: Komplikation – 3–5 Wochen Pause' },
  { id: 'abs', icon: '💪', name: 'Six-Pack-Modellage', price: 35_000, glam: 2, fail: 0.18,
    reward: '+2 Glamour – Trikot aus beim Jubel', risk: '18 %: Entzündung – 4–6 Wochen Pause' },
  { id: 'bbl', icon: '🍑', name: 'BBL (Brazilian Butt Lift)', price: 60_000, glam: 3, fail: 0.25,
    reward: '+3 Glamour, das Netz dreht durch, große Werbedeals',
    risk: '25 %: schwere Komplikation – 6–10 Wochen Pause, Skandal. Selten bleibt dauerhaft etwas zurück (−2 Wertung).',
    confirm: 'Der BBL gilt als eine der riskantesten Schönheits-OPs überhaupt. Wirklich machen?' },
  { id: 'fullkur', icon: '🧪', name: 'Die volle Kur (komplett vercrackt)', price: 90_000, summerOnly: true,
    reward: '+6 Gesamtwertung sofort',
    risk: '45 %: positiver Test – vier Jahre Sperre. Der Körper zahlt immer: verletzungsanfälliger, schnellerer Abbau, 8 % Herzproblem = Karriereende.',
    confirm: 'Das ist Doping in der extremsten Form – Betrug, gesundheitsgefährlich und oft das Karriereende. Wirklich?' },
];

/** Werbedeals pro Glamour-Punkt und Jahr (Coins). */
export const GLAM_INCOME = 1_500;
export const MAX_GLAM = 12;

const breakKey = (c: Career) => `${c.year}-${c.phase}`;

export const clinicUsedThisBreak = (c: Career) => c.clinicBreak === breakKey(c);

export function canTreat(career: Career, id: ClinicId, coins: number): boolean {
  if (career.phase !== 'winter' && career.phase !== 'window') return false;
  if (clinicUsedThisBreak(career)) return false;
  const t = TREATMENTS.find((x) => x.id === id);
  if (!t || coins < t.price) return false;
  return !(t.summerOnly && career.phase !== 'window');
}

function destroy(career: Career, reason: string): Career {
  career.phase = 'retired';
  career.destroyed = true;
  career.retiredReason = `💥 Karriere zerstört: ${reason}`;
  career.offers = [];
  career.updatedAt = Date.now();
  return career;
}

const scandal = (c: Career, pts: number) => {
  c.scandal = Math.min(100, (c.scandal ?? 0) + pts);
};

/**
 * Behandlung durchführen. Gibt den neuen Spielstand und die Kosten (Coins) zurück.
 * `roll` ist für Tests austauschbar.
 */
export function treat(prev: Career, id: ClinicId, coins: number, roll: () => number = Math.random): { career: Career; cost: number } {
  if (!canTreat(prev, id, coins)) return { career: prev, cost: 0 };
  const t = TREATMENTS.find((x) => x.id === id)!;
  const career: Career = structuredClone(prev);
  career.clinicBreak = breakKey(career);
  career.updatedAt = Date.now();
  const p = career.player;
  let note: DecisionResult;

  if (id === 'fullkur') {
    p.ovr = Math.min(99, p.ovr + 6);
    p.potential = Math.max(p.potential, p.ovr);
    // Der Körper zahlt immer.
    p.burnout = (p.burnout ?? 0) + 1;
    if (!(p.traits ?? []).includes('fragile')) p.traits = [...(p.traits ?? []), 'fragile'];
    if (roll() < 0.08) {
      return { career: destroy(career, 'Herzprobleme nach der „vollen Kur“ – die Ärzte verbieten dir den Leistungssport.'), cost: t.price };
    }
    if (roll() < 0.45) {
      p.ovr -= 6;
      if (career.caughtDoping || p.age >= 30) {
        return { career: destroy(career, career.caughtDoping ? 'Zweiter positiver Test – lebenslange Sperre.' : `Positiver Test mit ${p.age} – nach vier Jahren Sperre ist Schluss.`), cost: t.price };
      }
      career.caughtDoping = true;
      career.scandal = 60;
      const banned = banForSeasons(career, 4, 'Positiver Dopingtest nach der „vollen Kur“: vier Jahre Sperre.');
      // Nach der Sperre ist eine neue Pause – die Meldung erscheint deshalb im Hauptbildschirm.
      banned.viceNote = { title: '🧪 Aufgeflogen!', text: 'Vier Jahre Sperre. Die Schlagzeilen sind gnadenlos – und dein Körper ist nicht mehr derselbe.', tone: 'bad' };
      return { career: banned, cost: t.price };
    }
    scandal(career, 15);
    note = { title: '🧪 Durchgekommen', text: '+6 Gesamtwertung. Der Test war negativ – aber du merkst, dass dein Körper das nicht ewig mitmacht.', tone: 'neutral' };
  } else if (roll() < (t.fail ?? 0)) {
    // Komplikation bzw. Pfusch
    if (id === 'veneers' || id === 'hair') {
      scandal(career, id === 'hair' ? 14 : 10);
      career.glam = Math.max(0, (career.glam ?? 0) - 1);
      note = { title: `${t.icon} Das ging schief`, text: id === 'hair' ? 'Der Haaransatz sieht aus wie gemalt. Die Memes sind überall.' : 'Die Zähne leuchten im Dunkeln. Das Netz hat Spaß – du weniger.', tone: 'bad' };
    } else {
      const weeks = id === 'bbl' ? randInt(6, 10) : id === 'abs' ? randInt(4, 6) : randInt(3, 5);
      p.carryInjuryWeeks = (p.carryInjuryWeeks ?? 0) + weeks;
      let extra = '';
      if (id === 'bbl') {
        scandal(career, 20);
        if (roll() < 0.2) {
          p.ovr = Math.max(40, p.ovr - 2);
          extra = ' Es bleibt etwas zurück: −2 Gesamtwertung.';
        }
      }
      note = { title: `${t.icon} Komplikation`, text: `Nach der OP läuft nicht alles glatt: ${weeks} Wochen Pause.${extra}`, tone: 'bad' };
    }
  } else {
    career.glam = Math.min(MAX_GLAM, (career.glam ?? 0) + (t.glam ?? 0));
    if (id === 'hair' || id === 'veneers') p.morale = Math.min(3, (p.morale ?? 0) + 0.5);
    if (id === 'bbl') scandal(career, 5);
    note = { title: `${t.icon} Geglückt`, text: `${t.reward.split(':')[0]}. Glamour jetzt ${career.glam} – mehr Werbedeals ab dem nächsten Jahresabschluss.`, tone: 'good' };
  }
  career.clinicNote = note;
  return { career, cost: t.price };
}

/** Werbedeals im Jahr: Glamour bringt Coins, solange man aktiv spielt (im Ruhestand nur noch die Hälfte). */
export function glamIncome(career: Career): number {
  const glam = career.glam ?? 0;
  if (!glam) return 0;
  return Math.round(glam * GLAM_INCOME * (career.phase === 'retired' ? 0.5 : 1));
}
