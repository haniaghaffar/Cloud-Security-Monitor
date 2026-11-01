/**
 * Microsoft Entra ID (Azure AD) MSAL Configuration
 *
 * NOTE: Values are read from safe frontend environment variables.
 * Never hardcode client secrets, private keys, or actual credentials in frontend code.
 */
import { Configuration, LogLevel, BrowserCacheLocation } from '@azure/msal-browser';

export const AUTH_CLIENT_ID = (import.meta.env.VITE_AUTH_CLIENT_ID || '').trim();
export const AUTH_TENANT_ID = (import.meta.env.VITE_AUTH_TENANT_ID || '').trim();
export const AUTH_API_SCOPE = (import.meta.env.VITE_AUTH_API_SCOPE || '').trim();
export const AUTH_REDIRECT_URI = (
  import.meta.env.VITE_AUTH_REDIRECT_URI ||
  (typeof window !== 'undefined' ? window.location.origin : '')
).trim();

/**
 * Returns true if Microsoft Entra ID configuration is provided in the environment
 */
export const isEntraIdConfigured = (): boolean => {
  return Boolean(
    AUTH_CLIENT_ID &&
    AUTH_TENANT_ID &&
    AUTH_API_SCOPE &&
    !AUTH_CLIENT_ID.startsWith('your-') &&
    !AUTH_TENANT_ID.startsWith('your-') &&
    !AUTH_API_SCOPE.startsWith('your-')
  );
};

export const msalConfig: Configuration = {
  auth: {
    clientId: AUTH_CLIENT_ID || '00000000-0000-0000-0000-000000000000',
    authority: AUTH_TENANT_ID
      ? `https://login.microsoftonline.com/${AUTH_TENANT_ID}`
      : 'https://login.microsoftonline.com/common',
    redirectUri: AUTH_REDIRECT_URI,
    postLogoutRedirectUri: AUTH_REDIRECT_URI,
  },
  cache: {
    cacheLocation: BrowserCacheLocation.SessionStorage,
  },
  system: {
    loggerOptions: {
      loggerCallback: (level, message, containsPii) => {
        if (containsPii) return;
        switch (level) {
          case LogLevel.Error:
            console.error('[MSAL Error]:', message);
            return;
          case LogLevel.Warning:
            console.warn('[MSAL Warning]:', message);
            return;
          default:
            return;
        }
      },
      logLevel: LogLevel.Warning,
    },
  },
};

/**
 * Scopes requested during login and token acquisition
 */
export const loginRequest = {
  scopes: ['openid', 'profile', ...(AUTH_API_SCOPE ? [AUTH_API_SCOPE] : [])],
};

export const tokenRequest = {
  scopes: AUTH_API_SCOPE ? [AUTH_API_SCOPE] : [],
};
