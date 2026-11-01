import { AlertCircle, CheckCircle2, Key, Server } from 'lucide-react';
import { Breadcrumbs } from '../components/common/Breadcrumbs';
import { Card } from '../components/common/Card';
import { AUTH_API_SCOPE, AUTH_CLIENT_ID, AUTH_REDIRECT_URI, AUTH_TENANT_ID, isEntraIdConfigured } from '../auth/msalConfig';
import { API_BASE_URL } from '../services/apiClient';

function ConfigurationValue({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
        {label}
      </label>
      <input
        type="text"
        readOnly
        value={value || 'Not configured'}
        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-slate-800"
      />
    </div>
  );
}

export default function SettingsPage() {
  const entraConfigured = isEntraIdConfigured();
  const apiConfigured = Boolean(API_BASE_URL);

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: 'System Settings & Integration' }]} />

      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          Settings & Azure Integration
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Frontend environment configuration. A configured URL does not verify backend health.
        </p>
      </div>

      <Card
        padding="lg"
        header={
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              <Server className="w-4 h-4 text-brand-600" aria-hidden="true" />
              <h2 className="text-sm font-bold text-slate-900">Backend API Configuration</h2>
            </div>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold inline-flex items-center gap-1 border bg-slate-50 text-slate-700 border-slate-200">
              {apiConfigured
                ? <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                : <AlertCircle className="w-3.5 h-3.5" aria-hidden="true" />}
              {apiConfigured ? 'URL configured; health unverified' : 'Endpoint not configured'}
            </span>
          </div>
        }
      >
        <ConfigurationValue
          label="API Base URL (VITE_API_BASE_URL)"
          value={API_BASE_URL}
        />
        <p className="text-[11px] text-slate-500 mt-2">
          Use the real HTTPS endpoint confirmed by the backend owner. The URL is public frontend configuration, not a credential.
        </p>
      </Card>

      <Card
        padding="lg"
        header={
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              <Key className="w-4 h-4 text-brand-600" aria-hidden="true" />
              <h2 className="text-sm font-bold text-slate-900">Microsoft Entra ID API Authentication</h2>
            </div>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold inline-flex items-center gap-1 border bg-slate-50 text-slate-700 border-slate-200">
              {entraConfigured
                ? <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                : <AlertCircle className="w-3.5 h-3.5" aria-hidden="true" />}
              {entraConfigured ? 'Configuration present' : 'Configuration pending'}
            </span>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <ConfigurationValue
              label="Application (Client) ID (VITE_AUTH_CLIENT_ID)"
              value={AUTH_CLIENT_ID}
            />
            <ConfigurationValue
              label="Directory (Tenant) ID (VITE_AUTH_TENANT_ID)"
              value={AUTH_TENANT_ID}
            />
          </div>
          <ConfigurationValue
            label="Backend delegated API scope (VITE_AUTH_API_SCOPE)"
            value={AUTH_API_SCOPE}
          />
          <ConfigurationValue
            label="SPA redirect URI (VITE_AUTH_REDIRECT_URI)"
            value={AUTH_REDIRECT_URI}
          />
          <p className="text-[11px] text-slate-500">
            Register the redirect URI in the Entra SPA application. Configure the delegated scope only after the backend owner supplies its exact scope identifier.
          </p>
        </div>
      </Card>
    </div>
  );
}
