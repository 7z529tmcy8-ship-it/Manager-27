import type { Career } from './types';

const KEY = 'fc-karriere-saves-v1';

// Spielstände liegen nur im Browser (localStorage). Zugriff kann z. B. im privaten
// Modus fehlschlagen, daher überall try/catch.

export function listCareers(): Career[] {
  try {
    const raw = localStorage.getItem(KEY);
    const saves = raw ? (JSON.parse(raw) as Career[]) : [];
    return saves.sort((a, b) => b.updatedAt - a.updatedAt);
  } catch {
    return [];
  }
}

function write(saves: Career[]): boolean {
  try {
    localStorage.setItem(KEY, JSON.stringify(saves));
    return true;
  } catch {
    return false;
  }
}

export function saveCareer(career: Career): boolean {
  const saves = listCareers().filter((c) => c.id !== career.id);
  return write([career, ...saves]);
}

export function deleteCareer(id: string): void {
  write(listCareers().filter((c) => c.id !== id));
}
