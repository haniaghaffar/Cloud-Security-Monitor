import { useState, useEffect, useCallback, useRef } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Breadcrumbs } from '../components/common/Breadcrumbs';
import { Button } from '../components/common/Button';
import { Card } from '../components/common/Card';
import { AzureResource } from '../types';
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

export default function ResourcesPage() {
  const [resources, setResources] = useState<AzureResource[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);

  const fetchResources = useCallback(async (signal?: AbortSignal) => {
    const request = ++requestId.current;
    try {
      setIsLoading(true);
      setError(null);
      const res = await securityService.getResources(signal);
      if (signal?.aborted || request !== requestId.current) return;
      setResources(res.data);
      setTotal(res.total);
    } catch (err: unknown) {
      if (signal?.aborted || request !== requestId.current) return;
      setError(getErrorMessage(err));
      setResources([]);
      setTotal(0);
    } finally {
      if (!signal?.aborted && request === requestId.current) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => void fetchResources(controller.signal), 0);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [fetchResources]);

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: 'Monitored Cloud Infrastructure' }]} />
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Azure Resource Inventory
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Live data from the backend (Azure Resource Manager, via the
            Function App&apos;s managed identity). No health or connection
            status is shown because ARM&apos;s resource list does not report one.
          </p>
        </div>
        <Button variant="outline" size="sm" leftIcon={<RefreshCw className="w-4 h-4" />} onClick={() => void fetchResources()}>
          Refresh
        </Button>
      </div>

      {isLoading && (
        <Card padding="lg" className="max-w-2xl">
          <p className="text-sm text-slate-600">Loading resources…</p>
        </Card>
      )}

      {!isLoading && error && (
        <Card padding="lg" className="max-w-2xl">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 mt-0.5 text-red-600 flex-shrink-0" aria-hidden="true" />
            <div>
              <h2 className="text-sm font-bold text-slate-900">Resource inventory could not be loaded</h2>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
        </Card>
      )}

      {!isLoading && !error && resources.length === 0 && (
        <Card padding="lg" className="max-w-2xl">
          <p className="text-sm text-slate-600">No resources found in this subscription.</p>
        </Card>
      )}

      {!isLoading && !error && resources.length > 0 && (
        <Card padding="none" className="overflow-hidden shadow-card">
          <div className="px-4 py-3 border-b border-slate-100">
            <p className="text-sm text-slate-600">
              Showing {resources.length} of {total} resources
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b border-slate-100 text-slate-500">
                  <th className="px-4 py-2.5 font-semibold">Name</th>
                  <th className="px-4 py-2.5 font-semibold">Type</th>
                  <th className="px-4 py-2.5 font-semibold">Location</th>
                  <th className="px-4 py-2.5 font-semibold">Resource Group</th>
                </tr>
              </thead>
              <tbody>
                {resources.map((resource) => (
                  <tr key={resource.id} className="border-b border-slate-50 last:border-0">
                    <td className="px-4 py-2.5 font-medium text-slate-900">{resource.name}</td>
                    <td className="px-4 py-2.5 text-slate-600">{resource.type || '—'}</td>
                    <td className="px-4 py-2.5 text-slate-600">{resource.location || '—'}</td>
                    <td className="px-4 py-2.5 text-slate-600">{resource.resourceGroup || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
