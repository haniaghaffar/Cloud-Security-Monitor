import { useState, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Breadcrumbs } from '../components/common/Breadcrumbs';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { SeverityBadge, StatusBadge } from '../components/common/Badge';
import { EmptyState } from '../components/common/EmptyState';
import { SEVERITY_LEVELS, STATUS_OPTIONS } from '../data/findingOptions';
import { SeverityLevel, FindingStatus } from '../types';
import { formatDate } from '../utils/formatters';
import { useFindings } from '../hooks/useFindings';
import {
  Search,
  RotateCcw,
  ChevronRight,
  ShieldAlert,
  Radio,
  FileSpreadsheet,
  RefreshCw,
} from 'lucide-react';
import { exportFindingsToCsv } from '../utils/exportUtils';

export default function FindingsPage() {
  const [searchParams] = useSearchParams();

  // Filter States
  const [search, setSearch] = useState(() => searchParams.get('search') || '');
  const [selectedSeverity, setSelectedSeverity] = useState<SeverityLevel | 'ALL'>('ALL');
  const [selectedEventType, setSelectedEventType] = useState<string | 'ALL'>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<FindingStatus | 'ALL'>('ALL');
  const [selectedDateRange, setSelectedDateRange] = useState<'ALL' | 'TODAY' | '7DAYS' | '30DAYS'>('ALL');
  const [page, setPage] = useState(1);
  const [exportError, setExportError] = useState<string | null>(null);

  // Query options passed into service hook
  const filterParams = useMemo(
    () => ({
      search,
      severity: selectedSeverity,
      eventType: selectedEventType,
      status: selectedStatus,
      dateRange: selectedDateRange,
      page,
      pageSize: 50,
    }),
    [search, selectedSeverity, selectedEventType, selectedStatus, selectedDateRange, page]
  );

  const { findings, total, totalPages, isLoading, error, refetch } = useFindings(filterParams);
  const eventTypes = [...new Set(findings.map((finding) => finding.event_type_name || finding.event_type))];
  if (selectedEventType !== 'ALL' && !eventTypes.includes(selectedEventType)) {
    eventTypes.push(selectedEventType);
  }

  const hasActiveFilters =
    search.trim() !== '' ||
    selectedSeverity !== 'ALL' ||
    selectedEventType !== 'ALL' ||
    selectedStatus !== 'ALL' ||
    selectedDateRange !== 'ALL';

  const handleClearFilters = () => {
    setSearch('');
    setSelectedSeverity('ALL');
    setSelectedEventType('ALL');
    setSelectedStatus('ALL');
    setSelectedDateRange('ALL');
    setPage(1);
  };

  const handleExportCsv = () => {
    setExportError(null);
    try {
      exportFindingsToCsv(findings, `threat-timeline-${new Date().toISOString().slice(0, 10)}.csv`);
    } catch (err) {
      setExportError(err instanceof Error ? err.message : 'Unable to export findings.');
    }
  };

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: 'Threat Timeline' }]} />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Threat Timeline
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Chronological audit log of security findings returned by the configured backend.
          </p>
        </div>

        {exportError && (
          <p role="alert" className="text-sm text-red-700">{exportError}</p>
        )}

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />}
            title="Refresh findings"
          >
            Refresh
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCsv}
            disabled={findings.length === 0}
            leftIcon={<FileSpreadsheet className="w-4 h-4 text-emerald-600" />}
          >
            Export CSV ({total})
          </Button>
        </div>
      </div>

      {/* Filter Controls Bar */}
      <Card padding="md" className="space-y-3.5 shadow-card">
        {/* Search Input */}
        <div className="relative min-w-0">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Search className="h-4 w-4" />
          </div>
          <input
            type="search"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search by ID, keyword, identity principal, IP address, region, or resource..."
            className="w-full min-w-0 pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition"
          />
        </div>

        {/* Filter Dropdowns Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Severity */}
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
              Severity
            </label>
            <select
              value={selectedSeverity}
              onChange={(e) => {
                setSelectedSeverity(e.target.value as SeverityLevel | 'ALL');
                setPage(1);
              }}
              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-brand-500 font-medium"
            >
              <option value="ALL">All Severities</option>
              {SEVERITY_LEVELS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          {/* Event Type */}
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
              Detection Rule
            </label>
            <select
              value={selectedEventType}
              onChange={(e) => setSelectedEventType(e.target.value)}
              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-brand-500 font-medium"
            >
              <option value="ALL">All Detection Rules</option>
              {eventTypes.map((eventType) => (
                <option key={eventType} value={eventType}>
                  {eventType}
                </option>
              ))}
            </select>
          </div>

          {/* Status */}
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
              Status
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value as FindingStatus | 'ALL');
                setPage(1);
              }}
              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-brand-500 font-medium capitalize"
            >
              <option value="ALL">All Statuses</option>
              {STATUS_OPTIONS.map((st) => (
                <option key={st} value={st}>
                  {st.charAt(0).toUpperCase() + st.slice(1)}
                </option>
              ))}
            </select>
          </div>

          {/* Date Range */}
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
              Date Range
            </label>
            <select
              value={selectedDateRange}
              onChange={(e) => {
                setSelectedDateRange(e.target.value as 'ALL' | 'TODAY' | '7DAYS' | '30DAYS');
                setPage(1);
              }}
              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-brand-500 font-medium"
            >
              <option value="ALL">All Time</option>
              <option value="TODAY">Today (Last 24 Hours)</option>
              <option value="7DAYS">Past 7 Days</option>
              <option value="30DAYS">Past 30 Days</option>
            </select>
          </div>
        </div>

        {/* Filter Summary & Reset Action */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
          <span className="text-slate-500">
            Showing <strong className="text-slate-900">{findings.length}</strong> of{' '}
            {total} findings
          </span>

          {hasActiveFilters && (
            <button
              onClick={handleClearFilters}
              className="inline-flex items-center gap-1 text-brand-600 hover:text-brand-800 font-semibold transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset All Filters</span>
            </button>
          )}
        </div>
      </Card>

      {/* Error State */}
      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800 flex items-start justify-between gap-3">
          <div>
            <p className="font-semibold">Backend Communication Error</p>
            <p className="mt-1 text-red-700">{error}</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()} leftIcon={<RefreshCw className="w-3.5 h-3.5" />}>
            Retry
          </Button>
        </div>
      )}

      {/* Loading Indicator */}
      {isLoading && (
        <div className="py-12 flex flex-col items-center justify-center text-slate-500 text-xs">
          <div className="w-8 h-8 border-2 border-brand-600 border-t-transparent rounded-full animate-spin mb-2" />
          <span>Querying Azure security findings...</span>
        </div>
      )}

      {/* Findings Table or Empty State */}
      {!isLoading && !error && findings.length === 0 ? (
        <EmptyState
          icon={<ShieldAlert className="w-6 h-6" />}
          title={hasActiveFilters ? "No findings match your criteria" : "No security findings recorded"}
          description={
            hasActiveFilters
              ? "Try broadening your search term, changing severity thresholds, or resetting active filters."
              : "No threat incidents have been logged yet by the Azure backend detection engine."
          }
          actionLabel={hasActiveFilters ? "Clear All Filters" : undefined}
          onAction={hasActiveFilters ? handleClearFilters : undefined}
        />
      ) : (
        !error && findings.length > 0 && <Card padding="none" className="overflow-hidden shadow-card">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th scope="col" className="px-5 py-3.5">Timestamp</th>
                  <th scope="col" className="px-4 py-3.5">Finding ID</th>
                  <th scope="col" className="px-4 py-3.5">Event Type</th>
                  <th scope="col" className="px-4 py-3.5">Severity</th>
                  <th scope="col" className="px-4 py-3.5">User / Role</th>
                  <th scope="col" className="px-4 py-3.5">Source IP</th>
                  <th scope="col" className="px-4 py-3.5">Location / Region</th>
                  <th scope="col" className="px-4 py-3.5">Status</th>
                  <th scope="col" className="px-4 py-3.5 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {findings.map((f) => (
                  <tr key={f.finding_id} className="hover:bg-slate-50/80 transition-colors group">
                    <td className="px-5 py-3.5 whitespace-nowrap text-slate-500 font-mono">
                      {formatDate(f.timestamp)}
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap font-mono font-medium text-brand-700">
                      <Link
                        to={`/findings/${encodeURIComponent(f.finding_id)}`}
                        className="hover:underline focus:outline-none focus:ring-2 focus:ring-brand-500"
                      >
                        {f.finding_id}
                      </Link>
                    </td>
                    <td className="px-4 py-3.5 max-w-[220px]">
                      <div className="font-semibold text-slate-900 group-hover:text-brand-600 transition-colors truncate">
                        {f.event_type_name || f.eventTypeName || f.event_type}
                      </div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                        <Radio className="w-3 h-3" />
                        <span>{f.source || 'Not reported'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <SeverityBadge severity={f.severity} />
                    </td>
                    <td className="px-4 py-3.5 max-w-[170px] truncate font-mono text-slate-700" title={f.user_or_role}>
                      {f.user_or_role || f.userOrRole}
                    </td>
                    <td className="px-4 py-3.5 font-mono text-slate-800 whitespace-nowrap">
                      {f.source_ip || f.sourceIp}
                    </td>
                    <td className="px-4 py-3.5 text-slate-600 whitespace-nowrap">
                      <div>{f.country || f.location || '—'}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{f.region}</div>
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <StatusBadge status={f.status} />
                    </td>
                    <td className="px-4 py-3.5 text-right whitespace-nowrap">
                      <Link
                        to={`/findings/${encodeURIComponent(f.finding_id)}`}
                        aria-label={`View finding ${f.finding_id}`}
                        className="p-1.5 text-slate-400 group-hover:text-brand-600 group-hover:bg-brand-50 rounded-lg inline-flex transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {!isLoading && !error && totalPages > 1 && (
        <nav aria-label="Findings pagination" className="flex items-center justify-between">
          <span className="text-xs text-slate-500">Page {page} of {totalPages}</span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
            >
              Next
            </Button>
          </div>
        </nav>
      )}
    </div>
  );
}
