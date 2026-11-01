import { useState, useEffect } from 'react';
import { Breadcrumbs } from '../components/common/Breadcrumbs';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { SeverityBadge } from '../components/common/Badge';
import {
  Mail,
  Save,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { useAlertSettings } from '../hooks/useFindings';
import { AlertPreferences } from '../types';

export default function AlertsPage() {
  const { settings, isLoading, isSaving, error, saveSettings, refetch } = useAlertSettings();
  const [formState, setFormState] = useState<AlertPreferences | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const currentFormState = formState ?? settings;

  useEffect(() => {
    if (isSaved) {
      const timer = setTimeout(() => setIsSaved(false), 3500);
      return () => clearTimeout(timer);
    }
  }, [isSaved]);

  const handleSave = async () => {
    if (!currentFormState) return;
    setSaveError(null);
    const addresses = currentFormState.recipientEmails.split(',').map((address) => address.trim());
    const emailPattern = /^[^\s@,]+@[^\s@,]+\.[^\s@,]+$/;
    if (
      addresses.some((address) => !address) ||
      addresses.some((address) => !emailPattern.test(address))
    ) {
      setSaveError('Enter valid email addresses separated by commas, or leave the field empty.');
      return;
    }

    try {
      const saved = await saveSettings(currentFormState);
      setFormState(saved);
      setIsSaved(true);
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save alert preferences to backend');
    }
  };

  if (!currentFormState) {
    return (
      <div className="space-y-6">
        <Breadcrumbs items={[{ label: 'Alert Rules & Settings' }]} />
        <Card padding="lg" className="text-center">
          <h1 className="text-lg font-bold text-slate-900">Alert Settings</h1>
          <p role={error ? 'alert' : undefined} className="text-sm text-slate-600 mt-2">
            {isLoading ? 'Loading alert settings from the backend...' : error || 'The backend did not provide alert settings.'}
          </p>
          {!isLoading && (
            <Button className="mt-4" variant="outline" onClick={() => refetch()} leftIcon={<RefreshCw className="w-4 h-4" />}>
              Retry
            </Button>
          )}
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: 'Alert Rules & Settings' }]} />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Alert Rules & Email Notifications
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Configure alert preferences supported by the backend service.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="primary"
            size="sm"
            onClick={handleSave}
            isLoading={isSaving}
            disabled={isLoading || isSaving}
            leftIcon={<Save className="w-4 h-4" />}
          >
            Save Alert Preferences
          </Button>
        </div>
      </div>

      {/* Error Feedback */}
      {(error || saveError) && (
        <div role="alert" className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-amber-950">Backend Alert Service Status</p>
              <p className="mt-0.5 text-amber-800 leading-relaxed">
                {saveError || error}
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" disabled={isLoading} onClick={() => refetch()} leftIcon={<RefreshCw className="w-3.5 h-3.5" />}>
            Retry
          </Button>
        </div>
      )}

      {/* Save Confirmation Notification Feedback */}
      {isSaved && (
        <div className="p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span className="font-semibold">
              Alert preferences successfully saved to Azure backend!
            </span>
          </div>
          {currentFormState.lastSavedAt && (
            <span className="text-[11px] text-emerald-700">
              Saved at {new Date(currentFormState.lastSavedAt).toLocaleTimeString()}
            </span>
          )}
        </div>
      )}

      {/* Severity Trigger Threshold Selection Card */}
      <Card
        padding="lg"
        header={
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              Severity Levels Triggering Email Alerts
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Select the finding severities for which the backend should send notifications.
            </p>
          </div>
        }
      >
        <div className="space-y-4">
          {/* Critical */}
          <label className="flex items-start gap-3.5 p-3 rounded-lg border border-slate-200 hover:bg-slate-50/70 cursor-pointer transition-colors">
            <input
              type="checkbox"
              checked={currentFormState.critical}
              onChange={(e) => setFormState({ ...currentFormState, critical: e.target.checked })}
              className="mt-1 h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
            />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <SeverityBadge severity="Critical" />
                <span className="text-xs font-semibold text-slate-900">
                  Critical Severity (Recommended)
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Include findings categorized as critical by the backend.
              </p>
            </div>
          </label>

          {/* High */}
          <label className="flex items-start gap-3.5 p-3 rounded-lg border border-slate-200 hover:bg-slate-50/70 cursor-pointer transition-colors">
            <input
              type="checkbox"
              checked={currentFormState.high}
              onChange={(e) => setFormState({ ...currentFormState, high: e.target.checked })}
              className="mt-1 h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
            />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <SeverityBadge severity="High" />
                <span className="text-xs font-semibold text-slate-900">
                  High Severity (Recommended)
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Include findings categorized as high severity by the backend.
              </p>
            </div>
          </label>

          {/* Medium */}
          <label className="flex items-start gap-3.5 p-3 rounded-lg border border-slate-200 hover:bg-slate-50/70 cursor-pointer transition-colors">
            <input
              type="checkbox"
              checked={currentFormState.medium}
              onChange={(e) => setFormState({ ...currentFormState, medium: e.target.checked })}
              className="mt-1 h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
            />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <SeverityBadge severity="Medium" />
                <span className="text-xs font-semibold text-slate-900">
                  Medium Severity
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Include findings categorized as medium severity by the backend.
              </p>
            </div>
          </label>

          {/* Low */}
          <label className="flex items-start gap-3.5 p-3 rounded-lg border border-slate-200 hover:bg-slate-50/70 cursor-pointer transition-colors">
            <input
              type="checkbox"
              checked={currentFormState.low}
              onChange={(e) => setFormState({ ...currentFormState, low: e.target.checked })}
              className="mt-1 h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
            />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <SeverityBadge severity="Low" />
                <span className="text-xs font-semibold text-slate-900">
                  Low Severity
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Include findings categorized as low severity by the backend.
              </p>
            </div>
          </label>
        </div>
      </Card>

      {/* Recipient Configuration Card */}
      <Card
        padding="lg"
        header={
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              Notification Recipients & Delivery Options
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Notification recipients supported by the backend service
            </p>
          </div>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Email Addresses (Comma separated)
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Mail className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={currentFormState.recipientEmails}
                onChange={(e) => setFormState({ ...currentFormState, recipientEmails: e.target.value })}
                placeholder="secops@yourorg.com, oncall@yourorg.com"
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Delivery behavior is determined by the backend's alert implementation.
            </p>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-slate-800 block">
                Notify on Finding Resolution
              </span>
              <span className="text-xs text-slate-500">
                Send closure notification when an incident status is marked resolved
              </span>
            </div>
            <input
              type="checkbox"
              checked={currentFormState.notifyOnResolution}
              onChange={(e) => setFormState({ ...currentFormState, notifyOnResolution: e.target.checked })}
              className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
            />
          </div>
        </div>
      </Card>

      {/* Actions Bar */}
      <div className="flex justify-end pt-2">
        <Button
          variant="primary"
          size="md"
          onClick={handleSave}
          isLoading={isSaving}
          disabled={isLoading || !settings}
          leftIcon={<Save className="w-4 h-4" />}
        >
          Save Changes
        </Button>
      </div>
    </div>
  );
}
