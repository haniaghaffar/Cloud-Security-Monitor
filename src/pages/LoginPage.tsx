import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Shield, KeyRound, AlertCircle, ArrowLeft, ExternalLink, CheckCircle } from 'lucide-react';
import { Button } from '../components/common/Button';
import { Card } from '../components/common/Card';

export default function LoginPage() {
  const { login, isAuthenticated, isConfigured, isLoading, error: authError } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [localError, setLocalError] = useState<string | null>(null);

  const returnPath = (location.state as { from?: { pathname?: unknown } })?.from?.pathname;
  const from =
    typeof returnPath === 'string' &&
    returnPath.startsWith('/') &&
    !returnPath.startsWith('//') &&
    !returnPath.includes('\\')
      ? returnPath
      : '/';

  const handleSignIn = async () => {
    setLocalError(null);
    try {
      await login();
      navigate(from, { replace: true });
    } catch (err: unknown) {
      if (err instanceof Error) {
        setLocalError(err.message);
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      {/* Brand Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-brand-50 border border-brand-200 text-brand-600 shadow-subtle mb-4">
          <Shield className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Cloud Security Monitor
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Microsoft Azure Security Telemetry & Audit Portal
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <Card padding="lg" className="shadow-card">
          {isAuthenticated ? (
            <div className="text-center py-4 space-y-4">
              <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">Already Authenticated</h2>
                <p className="text-xs text-slate-500 mt-1">
                  You are signed in to Microsoft Entra ID.
                </p>
              </div>
              <Button
                variant="primary"
                size="md"
                className="w-full"
                onClick={() => navigate(from, { replace: true })}
              >
                Go to Dashboard
              </Button>
            </div>
          ) : isConfigured ? (
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-base font-bold text-slate-900">
                  Microsoft Entra ID Authentication
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Sign in using your authorized organizational Azure identity
                </p>
              </div>

              {(localError || authError) && (
                <div className="p-3.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                  <span>{localError || authError}</span>
                </div>
              )}

              <Button
                type="button"
                variant="primary"
                size="lg"
                className="w-full justify-center"
                isLoading={isLoading}
                onClick={handleSignIn}
                leftIcon={<KeyRound className="w-4 h-4" />}
              >
                Sign In with Microsoft Entra ID
              </Button>

              <div className="pt-4 border-t border-slate-100 text-center">
                <p className="text-[11px] text-slate-400">
                  Secured via MSAL OAuth 2.0 / OpenID Connect. Tokens are acquired dynamically for API requests.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 space-y-2 text-xs">
                <div className="flex items-center gap-2 font-bold text-amber-950">
                  <AlertCircle className="w-4 h-4 text-amber-700 flex-shrink-0" />
                  <span>Microsoft Entra ID Configuration Pending</span>
                </div>
                <p className="text-amber-800 leading-relaxed">
                  Authentication requires Microsoft Entra ID environment variables from Member 1:
                </p>
                <div className="bg-white/80 p-2.5 rounded border border-amber-200 font-mono text-[11px] text-slate-800 space-y-1">
                  <div>VITE_AUTH_CLIENT_ID=&lt;azure-client-id&gt;</div>
                  <div>VITE_AUTH_TENANT_ID=&lt;azure-tenant-id&gt;</div>
                </div>
                <p className="text-amber-700 text-[11px]">
                  Until configured, dashboard access operates in unauthenticated inspection mode.
                </p>
              </div>

              <Button
                type="button"
                variant="outline"
                size="md"
                className="w-full justify-center"
                onClick={() => navigate('/')}
                leftIcon={<ArrowLeft className="w-4 h-4" />}
              >
                Return to Dashboard
              </Button>
            </div>
          )}
        </Card>

        {/* Footer */}
        <p className="mt-6 text-center text-xs text-slate-400 flex items-center justify-center gap-1">
          <span>Microsoft Azure Cloud Security Monitor</span>
          <span>•</span>
          <a
            href="https://learn.microsoft.com/en-us/entra/identity/"
            target="_blank"
            rel="noreferrer"
            className="text-brand-600 hover:underline inline-flex items-center gap-0.5"
          >
            <span>Entra ID Docs</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </p>
      </div>
    </div>
  );
}
