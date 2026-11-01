import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Breadcrumbs } from '../components/common/Breadcrumbs';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { SeverityBadge, StatusBadge } from '../components/common/Badge';
import { formatDate } from '../utils/formatters';
import { useFinding } from '../hooks/useFindings';
import {
  ArrowLeft,
  Copy,
  Check,
  ShieldAlert,
  Terminal,
  MapPin,
  Clock,
  User,
  Server,
  Layers,
  CheckCircle,
  HelpCircle,
  RefreshCw,
} from 'lucide-react';

export default function FindingDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState<string | null>(null);
  const copyTimer = useRef<number | null>(null);

  const { finding, isLoading, error, refetch } = useFinding(id);

  useEffect(() => () => {
    if (copyTimer.current !== null) window.clearTimeout(copyTimer.current);
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Breadcrumbs items={[{ label: 'Findings', path: '/findings' }, { label: 'Loading...' }]} />
        <Card padding="lg" className="text-center py-16 shadow-card">
          <div className="w-8 h-8 border-2 border-brand-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs text-slate-500">Retrieving incident record {id} from Azure API...</p>
        </Card>
      </div>
    );
  }

  if (error || !finding) {
    return (
      <div className="space-y-6">
        <Breadcrumbs items={[{ label: 'Findings', path: '/findings' }, { label: 'Not Found' }]} />
        <Card padding="lg" className="text-center py-12 max-w-lg mx-auto shadow-card">
          <ShieldAlert className="w-12 h-12 text-slate-400 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-slate-900">
            {error ? 'Unable to Load Incident Record' : 'Incident Record Not Found'}
          </h2>
          <p className="text-xs text-slate-500 mb-6 leading-relaxed">
            {error || `The security finding ID "${id}" could not be located on the Azure backend.`}
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {error && (
              <Button variant="outline" onClick={refetch} leftIcon={<RefreshCw className="w-4 h-4" />}>
                Retry
              </Button>
            )}
            <Button variant="primary" onClick={() => navigate('/findings')} leftIcon={<ArrowLeft className="w-4 h-4" />}>
              Return to Threat Timeline
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  const rawJsonString = JSON.stringify(finding.raw_event || finding.rawEvent || {}, null, 2);

  const handleCopyJson = async () => {
    setCopyError(null);
    try {
      await navigator.clipboard.writeText(rawJsonString);
      setCopied(true);
      if (copyTimer.current !== null) window.clearTimeout(copyTimer.current);
      copyTimer.current = window.setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      setCopyError(err instanceof Error ? err.message : 'Clipboard access was denied.');
    }
  };

  const findingId = finding.finding_id || finding.id || 'Finding Details';
  const eventName = finding.event_type_name || finding.eventTypeName || finding.event_type;
  const userRole = finding.user_or_role || finding.userOrRole || 'Unknown';
  const sourceIp = finding.source_ip || finding.sourceIp || '—';
  const whyFlagged = finding.reason_flagged || finding.whyFlagged || 'Not provided by backend.';
  
  const rawActions = finding.recommended_action || finding.recommendedAction;
  const actions: string[] = Array.isArray(rawActions)
    ? rawActions
    : typeof rawActions === 'string'
    ? [rawActions]
    : [];

  const ruleId = finding.rule_id || finding.ruleId || 'N/A';
  const location = finding.country || finding.location || finding.region || '—';
  const subscriptionOrAccount = finding.account_id || finding.accountId || '—';

  return (
    <div className="space-y-6">
      {/* Breadcrumbs & Navigation */}
      <Breadcrumbs
        items={[
          { label: 'Security Findings', path: '/findings' },
          { label: findingId },
        ]}
      />

      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate('/findings')}
          leftIcon={<ArrowLeft className="w-4 h-4" />}
        >
          Back to Previous Page
        </Button>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">Detection Rule ID:</span>
          <span className="font-mono text-xs font-semibold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-md">
            {ruleId}
          </span>
        </div>
      </div>

      {/* Main Incident Header Card */}
      <Card padding="lg" className="shadow-card">
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="font-mono text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
              {findingId}
            </span>
            <SeverityBadge severity={finding.severity} />
            <StatusBadge status={finding.status} />
            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
              {finding.source || 'Not reported'}
            </span>
          </div>

          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              {finding.title || finding.description}
            </h1>
            <p className="text-sm text-slate-600 mt-2 leading-relaxed">
              {finding.description}
            </p>
          </div>
        </div>
      </Card>

      {/* Key Incident Metadata Attributes Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card padding="md">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
            <Clock className="w-3.5 h-3.5 text-brand-600" />
            <span>Timestamp</span>
          </div>
          <p className="text-sm font-semibold text-slate-900 font-mono">
            {formatDate(finding.timestamp)}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">{finding.timestamp}</p>
        </Card>

        <Card padding="md">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
            <Layers className="w-3.5 h-3.5 text-brand-600" />
            <span>Event Type & Category</span>
          </div>
          <p className="text-sm font-semibold text-slate-900">
            {eventName}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5 font-mono">{finding.event_type || finding.eventType}</p>
        </Card>

        <Card padding="md">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
            <User className="w-3.5 h-3.5 text-brand-600" />
            <span>User or Identity Role</span>
          </div>
          <p className="text-sm font-semibold text-slate-900 font-mono truncate" title={userRole}>
            {userRole}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">Principal Identity</p>
        </Card>

        <Card padding="md">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
            <MapPin className="w-3.5 h-3.5 text-brand-600" />
            <span>Source IP & Geo Origin</span>
          </div>
          <p className="text-sm font-semibold text-slate-900 font-mono">
            {sourceIp}
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5">{location}</p>
        </Card>

        <Card padding="md">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
            <Server className="w-3.5 h-3.5 text-brand-600" />
            <span>Region & Subscription</span>
          </div>
          <p className="text-sm font-semibold text-slate-900 font-mono">
            {finding.region}
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5 font-mono truncate" title={subscriptionOrAccount}>
            Subscription/Tenant: {subscriptionOrAccount}
          </p>
        </Card>

        <Card padding="md">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
            <ShieldAlert className="w-3.5 h-3.5 text-brand-600" />
            <span>Current Status</span>
          </div>
          <div className="mt-1">
            <StatusBadge status={finding.status} />
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Managed via Security Operations</p>
        </Card>
      </div>

      {/* Affected Resource Identifier */}
      {finding.resource && (
        <Card padding="md">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
            Affected Target Resource
          </h3>
          <div className="p-2.5 rounded-lg bg-slate-900 text-slate-100 font-mono text-xs overflow-x-auto select-all">
            {finding.resource}
          </div>
        </Card>
      )}

      {/* Why the Event Was Flagged */}
      <Card
        padding="lg"
        header={
          <div className="flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-brand-600" />
            <h2 className="text-sm font-bold text-slate-900">
              Why This Event Was Flagged (Security Rationale)
            </h2>
          </div>
        }
      >
        <p className="text-sm text-slate-700 leading-relaxed bg-slate-50 p-4 rounded-lg border border-slate-200">
          {whyFlagged}
        </p>
      </Card>

      {/* Recommended Action Checklist */}
      {actions.length > 0 && (
        <Card
          padding="lg"
          header={
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-600" />
              <h2 className="text-sm font-bold text-slate-900">
                Recommended Remediation Steps
              </h2>
            </div>
          }
        >
          <ul className="space-y-3">
            {actions.map((action, i) => (
              <li key={i} className="flex items-start gap-3 text-sm text-slate-700">
                <span className="w-5 h-5 rounded-full bg-brand-50 text-brand-600 border border-brand-200 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                  {i + 1}
                </span>
                <span>{action}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* Raw Event JSON Block */}
      <Card
        padding="none"
        header={
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-slate-600" />
              <h2 className="text-sm font-bold text-slate-900">
                Raw Event Payload (JSON)
              </h2>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyJson}
              leftIcon={copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            >
              {copied ? 'Copied' : 'Copy JSON'}
            </Button>
          </div>
        }
      >
        {copyError && (
          <p role="alert" className="px-4 pt-3 text-xs text-red-700">{copyError}</p>
        )}
        <div className="p-4 bg-slate-900 rounded-b-xl overflow-x-auto text-slate-200 font-mono text-xs leading-relaxed max-h-96">
          <pre>{rawJsonString}</pre>
        </div>
      </Card>
    </div>
  );
}
