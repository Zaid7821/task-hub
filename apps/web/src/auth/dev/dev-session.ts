const STORAGE_KEY = 'aionos.devUserEmail';
let memoryFallback: string | null = null;

export function getDevEmail(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return memoryFallback;
  }
}

export function setDevEmail(email: string | null): void {
  memoryFallback = email;
  try {
    if (email) localStorage.setItem(STORAGE_KEY, email);
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Storage unavailable (private mode); the in-memory fallback still works for this tab.
  }
}
