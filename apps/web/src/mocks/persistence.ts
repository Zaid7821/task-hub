// Keeps the mock database across page reloads (dev only). Bump the version when the row shapes in
// db.ts change, so old saved data is discarded instead of breaking the mocks.
const STORAGE_KEY = 'aionos.mocks.db.v2';

export function loadMockDb<T>(isValid: (value: unknown) => value is T): T | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isValid(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function saveMockDb(value: unknown): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch {
    // Storage full or unavailable: changes simply won't survive a reload.
  }
}

/** Forget saved mock data; the next page load re-creates the seed data. */
export function resetMockDb(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Nothing saved to remove.
  }
}
