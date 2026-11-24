import { EventType, PublicClientApplication, type AuthenticationResult } from '@azure/msal-browser';
import type { Env } from '@/env';

export type EntraEnv = Extract<Env, { VITE_AUTH_MODE: 'entra' }>;

export async function createMsalInstance(env: EntraEnv): Promise<PublicClientApplication> {
  const instance = new PublicClientApplication({
    auth: {
      clientId: env.VITE_ENTRA_CLIENT_ID,
      authority: `https://login.microsoftonline.com/${env.VITE_ENTRA_TENANT_ID}`,
      redirectUri: env.VITE_ENTRA_REDIRECT_URI,
      postLogoutRedirectUri: env.VITE_ENTRA_REDIRECT_URI,
    },
    cache: { cacheLocation: 'sessionStorage' },
  });
  await instance.initialize();

  const [firstAccount] = instance.getAllAccounts();
  if (!instance.getActiveAccount() && firstAccount) instance.setActiveAccount(firstAccount);

  instance.addEventCallback((event) => {
    if (event.eventType === EventType.LOGIN_SUCCESS && event.payload) {
      instance.setActiveAccount((event.payload as AuthenticationResult).account);
    }
  });

  return instance;
}
