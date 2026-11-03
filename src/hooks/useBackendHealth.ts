import { useEffect, useState } from 'react';
import { API_BASE_URL } from '../services/apiClient';
import { ApiError } from '../services/apiError';
import { securityService } from '../services/securityService';

/**
 * Live backend health, derived from a real API call — not a static label.
 *
 * The probe is the same dashboard-stats request the Overview page already
 * makes, so a success proves the API, its auth gate, and its data store
 * all answered. States:
 * - 'checking': probe in flight.
 * - 'connected': the API answered successfully.
 * - 'unreachable': the API did not answer (network failure, timeout, 5xx).
 * - 'not-configured': no API base URL is set, so nothing was probed.
 * - 'sign-in-required': the API (or the client) rejected the call for
 *   authentication (401/403) — the backend may be up, but this session
 *   has no usable token, so data cannot load until the user signs in.
 */
export type BackendHealth =
  | 'checking'
  | 'connected'
  | 'unreachable'
  | 'not-configured'
  | 'sign-in-required';

export const BACKEND_HEALTH_LABELS: Record<BackendHealth, string> = {
  checking: 'checking…',
  connected: 'connected',
  unreachable: 'unreachable',
  'not-configured': 'not configured',
  'sign-in-required': 'sign-in required',
};

export function useBackendHealth(): BackendHealth {
  const [health, setHealth] = useState<BackendHealth>(
    API_BASE_URL ? 'checking' : 'not-configured',
  );

  useEffect(() => {
    if (!API_BASE_URL) return;
    const controller = new AbortController();
    let cancelled = false;
    securityService
      .getDashboardStats(controller.signal)
      .then(() => {
        if (!cancelled) setHealth('connected');
      })
      .catch((err: unknown) => {
        if (cancelled || controller.signal.aborted) return;
        const apiErr = err instanceof ApiError ? err : ApiError.fromError(err);
        setHealth(apiErr.isAuthError ? 'sign-in-required' : 'unreachable');
      });
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, []);

  return health;
}
