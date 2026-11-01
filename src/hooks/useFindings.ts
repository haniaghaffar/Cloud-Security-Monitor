import { useState, useEffect, useCallback, useRef } from 'react';
import {
  SecurityFinding,
  FindingFilterOptions,
  DashboardStatsResponse,
  AlertPreferences,
} from '../types';
import { securityService } from '../services/securityService';
import { ApiError } from '../services/apiError';

function getErrorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    return err.userMessage || err.message;
  }
  if (err instanceof Error) {
    return err.message;
  }
  return 'An unexpected error occurred while communicating with the backend.';
}

/**
 * Hook for querying and filtering security findings from Azure API
 */
export function useFindings(filters: FindingFilterOptions = {}) {
  const [findings, setFindings] = useState<SecurityFinding[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);

  const fetchFindings = useCallback(async (signal?: AbortSignal) => {
    const request = ++requestId.current;
    try {
      setIsLoading(true);
      setError(null);
      const res = await securityService.getFindings(filters, signal);
      if (signal?.aborted || request !== requestId.current) return;
      setFindings(res.data);
      setTotal(res.total);
      setTotalPages(res.totalPages);
    } catch (err: unknown) {
      if (signal?.aborted || request !== requestId.current) return;
      setError(getErrorMessage(err));
      setFindings([]);
      setTotal(0);
      setTotalPages(1);
    } finally {
      if (!signal?.aborted && request === requestId.current) setIsLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => void fetchFindings(controller.signal), 0);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [fetchFindings]);

  return {
    findings,
    total,
    totalPages,
    isLoading,
    error,
    filters,
    refetch: () => fetchFindings(),
  };
}

/**
 * Hook for loading an individual security finding
 */
export function useFinding(id?: string) {
  const [finding, setFinding] = useState<SecurityFinding | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadedId, setLoadedId] = useState<string | null>(null);
  const [requestVersion, setRequestVersion] = useState(0);

  useEffect(() => {
    if (!id) return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      securityService
        .getFindingById(id, controller.signal)
        .then((data) => {
          if (!controller.signal.aborted) {
            setFinding(data);
            setError(null);
            setLoadedId(id);
          }
        })
        .catch((err: unknown) => {
          if (!controller.signal.aborted) {
            setError(getErrorMessage(err));
            setFinding(null);
            setLoadedId(id);
          }
        });
    }, 0);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [id, requestVersion]);

  const refetch = useCallback(() => {
    setFinding(null);
    setError(null);
    setLoadedId(null);
    setRequestVersion((version) => version + 1);
  }, []);

  return {
    finding: id && loadedId === id ? finding : null,
    isLoading: Boolean(id) && loadedId !== id,
    error: id && loadedId === id ? error : null,
    refetch,
  };
}

/**
 * Hook for loading dashboard metrics and overview data
 */
export function useDashboardStats() {
  const [stats, setStats] = useState<DashboardStatsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const requestId = useRef(0);

  const fetchStats = useCallback(async (signal?: AbortSignal) => {
    const request = ++requestId.current;
    try {
      setIsLoading(true);
      setError(null);
      const data = await securityService.getDashboardStats(signal);
      if (signal?.aborted || request !== requestId.current) return;
      setStats(data);
    } catch (err: unknown) {
      if (signal?.aborted || request !== requestId.current) return;
      setError(getErrorMessage(err));
      setStats(null);
    } finally {
      if (!signal?.aborted && request === requestId.current) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => void fetchStats(controller.signal), 0);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [fetchStats]);

  return { stats, isLoading, error, refetch: fetchStats };
}

/**
 * Hook for managing alert settings via Azure API
 */
export function useAlertSettings() {
  const [settings, setSettings] = useState<AlertPreferences | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);

  const fetchSettings = useCallback(async (signal?: AbortSignal) => {
    const request = ++requestId.current;
    setIsLoading(true);
    setError(null);
    try {
      const data = await securityService.getAlertSettings(signal);
      if (!signal?.aborted && request === requestId.current) setSettings(data);
    } catch (err: unknown) {
      if (!signal?.aborted && request === requestId.current) setError(getErrorMessage(err));
    } finally {
      if (!signal?.aborted && request === requestId.current) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => void fetchSettings(controller.signal), 0);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [fetchSettings]);

  const saveSettings = async (updated: AlertPreferences) => {
    try {
      setIsSaving(true);
      setError(null);
      const res = await securityService.updateAlertSettings(updated);
      setSettings(res);
      return res;
    } catch (err: unknown) {
      const msg = getErrorMessage(err);
      setError(msg);
      throw err;
    } finally {
      setIsSaving(false);
    }
  };

  return { settings, isLoading, isSaving, error, saveSettings, refetch: () => fetchSettings() };
}
