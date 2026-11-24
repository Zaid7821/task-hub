import {
  InteractionRequiredAuthError,
  InteractionStatus,
  type PublicClientApplication,
} from '@azure/msal-browser';
import { MsalProvider, useMsal } from '@azure/msal-react';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { configureApiAuth } from '@/api/client';
import { FullPageSpinner } from '@/components/common/FullPageSpinner';
import { env } from '@/env';
import { AuthContext, type AuthContextValue } from '../auth-context';
import { createMsalInstance, type EntraEnv } from './msal';

function requireEntraEnv(): EntraEnv {
  if (env.VITE_AUTH_MODE !== 'entra') {
    throw new Error('EntraAuthProvider requires VITE_AUTH_MODE=entra');
  }
  return env;
}

export function EntraAuthProvider({ children }: { children: ReactNode }) {
  const [instance, setInstance] = useState<PublicClientApplication | null>(null);

  useEffect(() => {
    let cancelled = false;
    void createMsalInstance(requireEntraEnv()).then((created) => {
      if (!cancelled) setInstance(created);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!instance) return <FullPageSpinner label="Connecting to Microsoft…" />;
  return (
    <MsalProvider instance={instance}>
      <EntraAuthBridge>{children}</EntraAuthBridge>
    </MsalProvider>
  );
}

function EntraAuthBridge({ children }: { children: ReactNode }) {
  const { instance, inProgress, accounts } = useMsal();
  const queryClient = useQueryClient();
  const scopes = [requireEntraEnv().VITE_ENTRA_API_SCOPE];

  // Configure during the first render so children's first requests already carry a token.
  useState(() =>
    configureApiAuth({
      getHeaders: async (): Promise<Record<string, string>> => {
        const account = instance.getActiveAccount() ?? instance.getAllAccounts()[0];
        if (!account) return {};
        try {
          const result = await instance.acquireTokenSilent({ scopes, account });
          return { Authorization: `Bearer ${result.accessToken}` };
        } catch (error) {
          if (error instanceof InteractionRequiredAuthError) {
            await instance.acquireTokenRedirect({ scopes, account });
          }
          throw error;
        }
      },
      // TODO(phase-3): decide whether a 401 from the API should force a fresh interactive login.
      onUnauthorized: () => undefined,
    }),
  );

  const isAuthenticated = accounts.length > 0;
  const value = useMemo<AuthContextValue>(
    () => ({
      mode: 'entra',
      isAuthenticated,
      isInitializing: inProgress !== InteractionStatus.None,
      // logoutRedirect leaves the app entirely, so there is no in-app "signed out" state to track.
      signedOut: false,
      login: () => instance.loginRedirect({ scopes: [requireEntraEnv().VITE_ENTRA_API_SCOPE] }),
      logout: async () => {
        queryClient.clear();
        await instance.logoutRedirect({ account: instance.getActiveAccount() ?? undefined });
      },
    }),
    [instance, inProgress, isAuthenticated, queryClient],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
