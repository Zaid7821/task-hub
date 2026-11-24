// Dev-only. Loaded behind `devAuthEnabled`, so it is excluded from production bundles.
import { DEV_USER_EMAIL_HEADER } from '@aionos/shared';
import { useQueryClient } from '@tanstack/react-query';
import { useMemo, useState, type ReactNode } from 'react';
import { configureApiAuth } from '@/api/client';
import { AuthContext, type AuthContextValue } from '../auth-context';
import { getDevEmail, setDevEmail } from './dev-session';

configureApiAuth({
  getHeaders: (): Promise<Record<string, string>> => {
    const email = getDevEmail();
    const headers: Record<string, string> = {};
    if (email) headers[DEV_USER_EMAIL_HEADER] = email;
    return Promise.resolve(headers);
  },
  onUnauthorized: () => undefined,
});

export function DevAuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [email, setEmail] = useState<string | null>(getDevEmail);
  const [signedOut, setSignedOut] = useState(false);

  const value = useMemo<AuthContextValue>(
    () => ({
      mode: 'dev',
      isAuthenticated: email !== null,
      isInitializing: false,
      signedOut,
      login: (nextEmail) => {
        if (!nextEmail) return Promise.reject(new Error('Dev login needs an email'));
        setDevEmail(nextEmail);
        queryClient.clear();
        setSignedOut(false);
        setEmail(nextEmail);
        return Promise.resolve();
      },
      logout: () => {
        setDevEmail(null);
        queryClient.clear();
        setSignedOut(true);
        setEmail(null);
        return Promise.resolve();
      },
    }),
    [email, signedOut, queryClient],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
