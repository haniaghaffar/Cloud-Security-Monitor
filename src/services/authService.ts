import {
  AccountInfo,
  InteractionRequiredAuthError,
  PublicClientApplication,
} from '@azure/msal-browser';
import {
  AUTH_API_SCOPE,
  isEntraIdConfigured,
  loginRequest,
  msalConfig,
  tokenRequest,
} from '../auth/msalConfig';
import { UserProfile } from '../types';

let msalInstance: PublicClientApplication | null = null;
let initPromise: Promise<PublicClientApplication | null> | null = null;

export async function getMsalInstance(): Promise<PublicClientApplication | null> {
  if (!isEntraIdConfigured()) return null;
  if (msalInstance) return msalInstance;

  if (!initPromise) {
    const initialization = (async () => {
      const instance = new PublicClientApplication(msalConfig);
      await instance.initialize();
      await instance.handleRedirectPromise();

      const accounts = instance.getAllAccounts();
      if (accounts.length > 0 && !instance.getActiveAccount()) {
        instance.setActiveAccount(accounts[0]);
      }

      msalInstance = instance;
      return instance;
    })();

    initPromise = initialization.catch((error: unknown) => {
      initPromise = null;
      throw error;
    });
  }

  return initPromise;
}

export const authService = {
  isConfigured(): boolean {
    return isEntraIdConfigured();
  },

  async getActiveAccount(): Promise<AccountInfo | null> {
    const instance = await getMsalInstance();
    return instance?.getActiveAccount() ?? null;
  },

  mapAccountToUserProfile(account: AccountInfo): UserProfile {
    const claims = account.idTokenClaims as Record<string, unknown> | undefined;
    const roles = Array.isArray(claims?.roles)
      ? claims.roles.filter((role): role is string => typeof role === 'string')
      : [];

    return {
      name: account.name || account.username.split('@')[0] || 'Authenticated user',
      email: account.username,
      role: roles[0] || 'Authenticated user',
    };
  },

  async getCurrentUser(): Promise<UserProfile | null> {
    const account = await this.getActiveAccount();
    return account ? this.mapAccountToUserProfile(account) : null;
  },

  async signIn(): Promise<UserProfile> {
    if (!this.isConfigured()) {
      throw new Error(
        'Microsoft Entra ID and the backend API scope are not configured. Set VITE_AUTH_CLIENT_ID, VITE_AUTH_TENANT_ID, and VITE_AUTH_API_SCOPE.'
      );
    }

    const instance = await getMsalInstance();
    if (!instance) {
      throw new Error('Microsoft Entra ID could not be initialized.');
    }

    // Redirect flow (not popup): loginPopup breaks with this app
    // because the popup lands on the full app, whose boot calls
    // handleRedirectPromise with the popup's own empty cache and
    // throws no_token_request_cache_error. With a redirect, the
    // same tab leaves for Microsoft and returns with the code, so
    // the boot-time handleRedirectPromise finds its cached request
    // intact and the account is picked up on reload.
    await instance.loginRedirect(loginRequest);
    // loginRedirect navigates away from this page, so execution
    // never continues past this point. This throw only satisfies
    // the return type if the redirect ever returns instead.
    throw new Error('Microsoft Entra ID sign-in redirect did not start.');
  },

  async signOut(): Promise<void> {
    const instance = await getMsalInstance();
    const account = instance?.getActiveAccount();
    if (!instance || !account) return;

    await instance.logoutPopup({
      account,
      mainWindowRedirectUri: window.location.origin,
    });
  },

  async getAccessToken(scopes: string[] = tokenRequest.scopes): Promise<string | null> {
    if (!this.isConfigured()) return null;
    if (!AUTH_API_SCOPE || scopes.length === 0) {
      throw new Error('Set VITE_AUTH_API_SCOPE to the delegated permission exposed by the backend API.');
    }

    const instance = await getMsalInstance();
    if (!instance) {
      throw new Error('Microsoft Entra ID could not be initialized. Retry sign-in before accessing the API.');
    }

    let account = instance.getActiveAccount();
    if (!account) {
      account = instance.getAllAccounts()[0] ?? null;
      if (account) instance.setActiveAccount(account);
    }
    if (!account) {
      throw new Error('Sign in with Microsoft Entra ID before accessing the backend API.');
    }

    try {
      const response = await instance.acquireTokenSilent({ account, scopes });
      return response.accessToken;
    } catch (error) {
      if (error instanceof InteractionRequiredAuthError) {
        throw new Error('Backend API access requires sign-in or consent. Sign in again and retry the request.');
      }
      throw error;
    }
  },
};
