import type { UserDto } from '@aionos/shared';
import { createContext, useContext } from 'react';

export interface AuthContextValue {
  mode: 'dev' | 'entra';
  /** Credentials exist (dev user picked, or an MSAL account is signed in). */
  isAuthenticated: boolean;
  /** MSAL is still handling a redirect or interaction. */
  isInitializing: boolean;
  /** True after an explicit sign-out, so the next login starts fresh instead of returning to the old page. */
  signedOut: boolean;
  /** Dev mode: logs in as `email`. Entra mode: starts the Microsoft redirect (email ignored). */
  login: (email?: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside <AuthProvider>');
  return value;
}

export const CurrentUserContext = createContext<UserDto | null>(null);

/** The signed-in user's profile. Only usable below <RequireAuth>. */
export function useCurrentUser(): UserDto {
  const user = useContext(CurrentUserContext);
  if (!user) throw new Error('useCurrentUser must be used below <RequireAuth>');
  return user;
}
