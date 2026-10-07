import { getClub } from '../data/leagues';
import { householdOf } from './family';
import { clamp, rand } from './random';
import type { Career, ShareHolding } from './types';

// Bauprojekte bei Klubs, an denen man beteiligt ist. Anders als eine Finanzspritze verpufft das Geld nicht,
// sondern wirkt dauerhaft – aber erst nach Jahren Bauzeit, mit Verzögerungen und schwankender Qualität.
// Bewusst ohne genaue Zahlen: Was ein Projekt wirklich bringt, merkt man erst im Laufe der Zeit.

export type ProjectId = 'stadium' | 'academy' | 'training' | 'scouting' | 'marketing';

export interface ProjectDef {
  id: ProjectId;
  icon: string;
  name: string;
  /** Vage Beschreibung – keine Zahlen. */
  text: string;
  base: number;
  /** Bauzeit in Saisons (ohne Verzögerung). */
  years: number;
  /** Mindestanteil in Prozent. */
  minStake: number;
  /** Höchste Ausbaustufe. */
  maxLevel: number;
}

export const PROJECTS: ProjectDef[] = [
  { id: 'stadium', icon: '🏟️', name: 'Neues Stadion', base: 140_000, years: 3, minStake: 25, maxLevel: 2,
    text: 'Mehr Plätze, Logen, Catering. Langfristig volle Kassen am Spieltag – wenn die Fans kommen.' },
  { id: 'academy', icon: '🌱', name: 'Jugendakademie', base: 60_000, years: 2, minStake: 10, maxLevel: 3,
    text: 'Eigene Talente statt teurer Einkäufe. Dauert, bis es sich zeigt – aber manchmal wird aus einem Jungen ein Millionen-Transfer.' },
  { id: 'training', icon: '🏋️', name: 'Trainingszentrum', base: 40_000, years: 1, minStake: 10, maxLevel: 1,
    text: 'Moderne Plätze, Reha, Analyse. Was du in den Kader steckst, hält länger.' },
  { id: 'scouting', icon: '🔭', name: 'Scouting-Netzwerk', base: 22_000, years: 1, minStake: 10, maxLevel: 1,
    text: 'Späher in aller Welt. Dein Geld für Neuzugänge wird klüger ausgegeben.' },
  { id: 'marketing', icon: '📣', name: 'Fanshop & Marketing', base: 18_000, years: 1, minStake: 5, maxLevel: 1,
    text: 'Trikots, Social Media, Sponsoren. Mehr Geld fließt an die Anteilseigner zurück.' },
];

export const getProject = (id: ProjectId) => PROJECTS.find((p) => p.id === id)!;

export interface ClubProject {
  id: ProjectId;
  level: number;
  /** Noch zu bauende Saisons (0 = fertig). */
  buildLeft: number;
  /** Verborgene Qualität (0,6 … 1,3) – wird nirgends angezeigt. */
  quality: number;
  /** Jahre in Betrieb (für die Akademie: Wirkung wächst langsam). */
  age: number;
}

const projectsOf = (s: ShareHolding) => (s.projects ??= []);
export const projectOf = (s: ShareHolding | undefined, id: ProjectId) => s?.projects?.find((p) => p.id === id);
/** Fertig gebaut und in Betrieb? */
export const active = (s: ShareHolding | undefined, id: ProjectId) => {
  const p = projectOf(s, id);
  return p && p.buildLeft === 0 ? p : undefined;
};

/** Kosten: steigen mit der Stärke des Vereins und der Ausbaustufe. */
export function projectCost(def: ProjectDef, strength: number, level: number): number {
  const f = clamp(0.4 + (strength - 30) / 45, 0.35, 1.8);
  return Math.round((def.base * f * 1.8 ** (level - 1)) / 1000) * 1000;
}

export type BuildCheck = { ok: true; cost: number; level: number } | { ok: false; reason: string };

export function canBuild(s: ShareHolding | undefined, def: ProjectDef, strength: number, coins: number): BuildCheck {
  if (!s) return { ok: false, reason: 'Keine Anteile' };
  if (s.percent < def.minStake) return { ok: false, reason: `Ab ${def.minStake} % Anteil` };
  const cur = projectOf(s, def.id);
  if (cur && cur.buildLeft > 0) return { ok: false, reason: 'Wird gerade gebaut' };
  const level = (cur?.level ?? 0) + 1;
  if (level > def.maxLevel) return { ok: false, reason: 'Voll ausgebaut' };
  const cost = projectCost(def, strength, level);
  if (coins < cost) return { ok: false, reason: `Fehlen ${(cost - coins).toLocaleString('de-DE')} 🪙` };
  return { ok: true, cost, level };
}

/** Projekt starten bzw. ausbauen. Gibt Spielstand und Kosten zurück. */
export function startProject(prev: Career, clubId: string, id: ProjectId, strength: number, coins: number): { career: Career; cost: number } {
  const def = getProject(id);
  const check = canBuild(prev.household?.shares.find((s) => s.clubId === clubId), def, strength, coins);
  if (!check.ok) return { career: prev, cost: 0 };
  const career: Career = structuredClone(prev);
  const s = householdOf(career).shares.find((x) => x.clubId === clubId)!;
  const list = projectsOf(s);
  const old = list.find((p) => p.id === id);
  const quality = Math.round(rand(0.6, 1.3) * 100) / 100;
  const next: ClubProject = { id, level: check.level, buildLeft: def.years, quality: old ? (old.quality + quality) / 2 : quality, age: old?.age ?? 0 };
  s.projects = [...list.filter((p) => p.id !== id), next];
  s.injected = (s.injected ?? 0) + check.cost;
  career.updatedAt = Date.now();
  return { career, cost: check.cost };
}

/** Status-Text ohne Zahlen. */
export function projectStatus(p: ClubProject): string {
  if (p.buildLeft > 1) return `🏗️ Im Bau – noch etwa ${p.buildLeft} Saisons`;
  if (p.buildLeft === 1) return '🏗️ Im Bau – bald fertig';
  if (p.id === 'academy' && p.age < 2) return '🌱 Läuft an – die ersten Jahrgänge kommen';
  return p.level > 1 ? `✓ In Betrieb (Ausbaustufe ${p.level})` : '✓ In Betrieb';
}

// ---------- Wirkungen (werden vom Jahresabschluss genutzt) ----------

/** Zusätzliche Dividendenquote durch Stadion und Marketing. */
export function projectDividendBonus(s: ShareHolding): number {
  const st = active(s, 'stadium');
  const mk = active(s, 'marketing');
  return (st ? 0.018 * st.level * st.quality : 0) + (mk ? 0.012 * mk.quality : 0);
}

/** Anteil der Investoren-Stärke, der pro Jahr erhalten bleibt (Trainingszentrum bremst den Abbau). */
export const backingKeep = (s: ShareHolding | undefined, base: number) => {
  const tr = active(s, 'training');
  return tr ? Math.min(0.995, base + 0.03 * tr.quality) : base;
};

/** Effizienz beim Verbauen des Ausbau-Budgets (Scouting = günstigere Stärkepunkte). */
export const fundEfficiency = (s: ShareHolding | undefined) => {
  const sc = active(s, 'scouting');
  return sc ? 1 + 0.2 * sc.quality : 1;
};

/**
 * Jahresabschluss aller Projekte: Bau schreitet voran (manchmal mit Verzögerung), fertige Projekte wirken.
 * Dauerhafte Stärke (Stadion, Akademie) landet in career.clubInfra – sie klingt nicht ab.
 * Gibt zusätzliche Einnahmen (z. B. Talentverkäufe) und Meldungen zurück.
 */
export function projectsYear(career: Career, price: (clubId: string) => number): { income: number; notes: string[] } {
  const notes: string[] = [];
  let income = 0;
  const infra = (career.clubInfra ??= {});
  for (const s of householdOf(career).shares) {
    const club = getClub(s.clubId).name;
    for (const p of s.projects ?? []) {
      const def = getProject(p.id);
      if (p.buildLeft > 0) {
        if (Math.random() < 0.15) notes.push(`🚧 ${club}: ${def.name} – Bauverzögerung, es dauert länger.`);
        else {
          p.buildLeft -= 1;
          if (p.buildLeft === 0) {
            notes.push(`🎉 ${club}: ${def.name} ist fertig!`);
            if (p.id === 'stadium') infra[s.clubId] = (infra[s.clubId] ?? 0) + 0.6 * p.quality;
          }
        }
        continue;
      }
      p.age += 1;
      if (p.id === 'academy') {
        // Die Akademie wirkt langsam, aber dauerhaft – bis zu einer Obergrenze je Ausbaustufe.
        const cap = 1.2 * p.level * p.quality;
        const fromAcademy = career.academyBoost?.[s.clubId] ?? 0;
        if (p.age >= 2 && fromAcademy < cap) {
          const add = Math.min(cap - fromAcademy, 0.35 * p.quality);
          infra[s.clubId] = (infra[s.clubId] ?? 0) + add;
          career.academyBoost = { ...(career.academyBoost ?? {}), [s.clubId]: fromAcademy + add };
        }
        // Ab und zu wird ein Eigengewächs teuer verkauft – die Anteilseigner verdienen mit.
        if (p.age >= 2 && Math.random() < 0.12 * p.level * p.quality) {
          const cash = Math.round((s.percent * price(s.clubId) * rand(0.8, 2.5)) / 100) * 100;
          income += cash;
          notes.push(`💰 ${club}: Ein Talent aus der Akademie wurde teuer verkauft – dein Anteil: +${cash.toLocaleString('de-DE')} Coins.`);
        }
      }
    }
  }
  return { income, notes };
}
