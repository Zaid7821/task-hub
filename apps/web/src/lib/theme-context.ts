import { createContext, useContext } from 'react';

export type Theme = 'light' | 'dark' | 'system';

/** Must match the key read by the inline script in index.html. */
export const THEME_STORAGE_KEY = 'aionos.theme';

export interface ThemeContextValue {
  theme: Theme;
  resolvedTheme: 'light' | 'dark';
  setTheme: (theme: string) => void;
}

export const ThemeContext = createContext<ThemeContextValue | null>(null);

export function useTheme(): ThemeContextValue {
  const value = useContext(ThemeContext);
  if (!value) throw new Error('useTheme must be used inside <ThemeProvider>');
  return value;
}
