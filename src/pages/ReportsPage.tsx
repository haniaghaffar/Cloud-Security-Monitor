import { useState, useEffect, useCallback } from 'react';
import { Breadcrumbs } from '../components/common/Breadcrumbs';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { SeverityBadge, StatusBadge } from '../components/common/Badge';
import { EmptyState } from '../components/common/EmptyState';
import { SEVERITY_LEVELS, STATUS_OPTIONS } from '../data/findingOptions';
import { SeverityLevel, FindingStatus, SecurityFinding } from '../types';
import { formatDate } from '../utils/formatters';
import { exportFindingsToCsv, exportFindingsToPdf } from '../utils/exportUtils';
import { securityService } from '../services/securityService';
import { ApiError } from '../services/apiError';
import {
  FileText,
  FileSpreadsheet,
  AlertTriangle,
  CheckCircle2,
  Filter,
  Calendar,
  RefreshCw,
} from 'lucide-react';
import { useRef } from 'react';

export default function ReportsPage() {
  const [dateRange, setDateRange] = useState<'ALL' | 'TODAY' | '7DAYS' | '30DAYS'>('ALL');
  const [severity, setSeverity] = useState<SeverityLevel | 'ALL'>('ALL');
  const [status, setStatus] = useState<FindingStatus | 'ALL'>('ALL');

  const [findings, setFindings] = useState<SecurityFinding[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState<'csv' | 'pdf' | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const requestId = useRef(0);

  const fetchReportData = useCallback(async (signal?: AbortSignal) => {
    const request = ++requestId.current;
    setIsLoading(true);
    setFeedback(null);

    try {
      const data = await securityService.getReportData({
        dateRange,
        severity,
        status,
      }, signal);
      if (!signal?.aborted && request === requestId.current) setFindings(data);
    } catch (err) {
      if (!signal?.aborted && request === requestId.current) {
        setFeedback({
          type: 'error',
          message: err instanceof ApiError
            ? err.userMessage
            : err instanceof Error
              ? err.message
              : 'Failed to retrieve report data from the backend API.',
        });
        setFindings([]);
      }
    } finally {
      if (!signal?.aborted && request === requestId.current) setIsLoading(false);
    }
  }, [dateRange, severity, status]);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => void fetchReportData(controller.signal), 0);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [fetchReportData]);

  const handleExportCsv = () => {
    setFeedback(null);
    if (findings.length === 0) {
      setFeedback({ type: 'error', message: 'No findings match the selected filters. Export cancelled.' });
      return;
    }

    try {
      setIsExporting('csv');
      const filename = `azure-security-report-${dateRange.toLowerCase()}-${new Date().toISOString().slice(0, 10)}.csv`;
      exportFindingsToCsv(findings, filename);
      setFeedback({ type: 'success', message: `CSV report generated successfully (${findings.length} records).` });
    } catch (err: unknown) {
      setFeedback({ type: 'error', message: err instanceof Error ? err.message : 'Failed to export CSV report.' });
    } finally {
      setIsExporting(null);
    }
  };

  const handleExportPdf = () => {
    setFeedback(null);
    if (findings.length === 0) {
      setFeedback({ type: 'error', message: 'No findings match the selected filters. Export cancelled.' });
      return;
    }

    try {
      setIsExporting('pdf');
      const filename = `azure-security-report-${new Date().toISOString().slice(0, 10)}.pdf`;
      const filterSummary = `Date: ${dateRange} | Severity: ${severity} | Status: ${status}`;
      exportFindingsToPdf(findings, filterSummary, filename);
      setFeedback({ type: 'success', message: `PDF report downloaded successfully (${findings.length} findings).` });
    } catch (err: unknown) {
      setFeedback({ type: 'error', message: err instanceof Error ? err.message : 'Failed to export PDF report.' });
    } finally {
      setIsExporting(null);
    }
  };

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: 'Security Reports & Audits' }]} />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Security Reports & Audits
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Export structured security audit documentation and executive summaries for compliance.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => void fetchReportData()}
            leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />}
            title="Refresh report data"
          >
            Refresh
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCsv}
            disabled={isLoading || findings.length === 0 || isExporting !== null}
            isLoading={isExporting === 'csv'}
            leftIcon={<FileSpreadsheet className="w-4 h-4 text-emerald-600" />}
          >
            Export CSV ({findings.length})
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={handleExportPdf}
            disabled={isLoading || findings.length === 0 || isExporting !== null}
            isLoading={isExporting === 'pdf'}
            leftIcon={<FileText className="w-4 h-4" />}
          >
            Download PDF Report
          </Button>
        </div>
      </div>

      {/* Feedback Toast */}
      {feedback && (
        <div
          className={`p-3.5 rounded-lg text-xs flex items-center justify-between animate-in fade-in ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-red-600" />
            )}
            <span className="font-semibold">{feedback.message}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="text-slate-400 hover:text-slate-600 text-xs ml-4"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Filter / Configuration Card */}
      <Card
        padding="md"
        header={
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-brand-600" />
            <h2 className="text-sm font-bold text-slate-900">Report Scope & Criteria</h2>
          </div>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>Time Horizon</span>
            </label>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as 'ALL' | 'TODAY' | '7DAYS' | '30DAYS')}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-brand-500 font-medium"
            >
              <option value="ALL">All Recorded Events</option>
              <option value="TODAY">Today (Current 24h)</option>
              <option value="7DAYS">Past 7 Days</option>
              <option value="30DAYS">Past 30 Days</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Severity Threshold
            </label>
            <select
              value={severity}
              onChange={(e) => setSeverity(e.target.value as SeverityLevel | 'ALL')}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-brand-500 font-medium"
            >
              <option value="ALL">All Severities</option>
              {SEVERITY_LEVELS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Resolution Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as FindingStatus | 'ALL')}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-brand-500 font-medium capitalize"
            >
              <option value="ALL">All Statuses</option>
              {STATUS_OPTIONS.map((st) => (
                <option key={st} value={st}>
                  {st.charAt(0).toUpperCase() + st.slice(1)}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {/* Loading Indicator */}
      {isLoading && (
        <div className="py-12 flex flex-col items-center justify-center text-slate-500 text-xs">
          <div className="w-8 h-8 border-2 border-brand-600 border-t-transparent rounded-full animate-spin mb-2" />
          <span>Generating audit report from Azure API...</span>
        </div>
      )}

      {/* Report Preview Data Table or Empty State */}
      {!isLoading && feedback?.type === 'error' ? (
        <EmptyState
          icon={<AlertTriangle className="w-6 h-6" />}
          title="Unable to load report data"
          description={feedback.message}
          actionLabel="Retry"
          onAction={() => void fetchReportData()}
        />
      ) : !isLoading && findings.length === 0 ? (
        <EmptyState
          icon={<FileText className="w-6 h-6" />}
          title="No records found for selected audit scope"
          description="Adjust the time horizon or severity threshold to include findings in this audit report."
        />
      ) : (
        <Card
          padding="none"
          header={
            <div className="flex items-center justify-between w-full">
              <h2 className="text-sm font-bold text-slate-900">
                Audit Record Preview ({findings.length} findings)
              </h2>
              <span className="text-xs text-slate-400">Ready for export</span>
            </div>
          }
        >
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th scope="col" className="px-5 py-3">Timestamp</th>
                  <th scope="col" className="px-4 py-3">Finding ID</th>
                  <th scope="col" className="px-4 py-3">Event Name</th>
                  <th scope="col" className="px-4 py-3">Severity</th>
                  <th scope="col" className="px-4 py-3">Identity Principal</th>
                  <th scope="col" className="px-4 py-3">Source IP</th>
                  <th scope="col" className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {findings.map((f) => (
                  <tr key={f.finding_id || f.id} className="hover:bg-slate-50/70">
                    <td className="px-5 py-3 whitespace-nowrap text-slate-500 font-mono">
                      {formatDate(f.timestamp)}
                    </td>
                    <td className="px-4 py-3 font-mono font-medium text-brand-700 whitespace-nowrap">
                      {f.finding_id || f.id}
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-900 truncate max-w-[200px]">
                      {f.event_type_name || f.eventTypeName || f.event_type}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <SeverityBadge severity={f.severity} />
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-700 truncate max-w-[150px]">
                      {f.user_or_role || f.userOrRole}
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-800 whitespace-nowrap">
                      {f.source_ip || f.sourceIp}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <StatusBadge status={f.status} />
                    </td>
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
