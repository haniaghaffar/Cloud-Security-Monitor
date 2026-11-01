import { Breadcrumbs } from '../components/common/Breadcrumbs';
import { MetricCard } from '../components/common/MetricCard';
import { SeverityChartCard } from '../components/dashboard/SeverityChartCard';
import { RiskyIpsTable } from '../components/dashboard/RiskyIpsTable';
import { RecentActivityFeed } from '../components/dashboard/RecentActivityFeed';
import { Card } from '../components/common/Card';
import { useDashboardStats } from '../hooks/useFindings';
import {
  Activity,
  AlertTriangle,
  FolderOpen,
  ShieldAlert,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '../components/common/Button';
import { API_BASE_URL } from '../services/apiClient';
import { authService } from '../services/authService';

export default function DashboardPage() {
  const { stats, isLoading, error, refetch } = useDashboardStats();

  if (isLoading && !stats) {
    return (
      <div className="space-y-6">
        <Breadcrumbs items={[{ label: 'Security Overview' }]} />
        <div className="py-20 flex flex-col items-center justify-center text-slate-500 text-xs">
          <div className="w-8 h-8 border-2 border-brand-600 border-t-transparent rounded-full animate-spin mb-3" />
          <span>Connecting to Azure backend and loading telemetry overview...</span>
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="space-y-6">
        <Breadcrumbs items={[{ label: 'Security Overview' }]} />
        <Card padding="lg" className="text-center py-12 max-w-xl mx-auto shadow-card">
          <ShieldAlert className="w-12 h-12 text-amber-500 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-slate-900">Backend Connection Required</h2>
          <p className="text-xs text-slate-600 mt-2 mb-6 leading-relaxed">
            {error || 'Unable to retrieve dashboard metrics from the Azure API.'}
          </p>
          <div className="flex items-center justify-center gap-3">
            <Button variant="primary" onClick={() => refetch()} leftIcon={<RefreshCw className="w-4 h-4" />}>
              Retry Connection
            </Button>
            <Link to="/settings">
              <Button variant="outline">
                Configure API Endpoint
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  const { metrics, riskyIps, recentFindings } = stats;

  return (
    <div className="space-y-6">
      {/* Breadcrumbs */}
      <Breadcrumbs items={[{ label: 'Security Overview' }]} />

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Security Overview
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Real-time threat monitoring and anomaly detection across Microsoft Azure security event logs and network telemetry.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />}
            title="Refresh dashboard"
          >
            Refresh
          </Button>

          <Link to="/reports">
            <Button variant="outline" size="sm">
              Export Audit Report
            </Button>
          </Link>
          <Link to="/findings">
            <Button variant="primary" size="sm">
              View All Findings
            </Button>
          </Link>
        </div>
      </div>

      {/* 4 Core Top Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Events"
          value={metrics.totalEvents}
          subtitle="Processed security telemetry"
          icon={<Activity className="w-4 h-4" />}
          iconBgColor="bg-blue-50"
          iconTextColor="text-brand-600"
          badgeText="All Monitored"
          badgeColor="bg-blue-50 text-brand-700"
        />

        <MetricCard
          title="Threats Today"
          value={metrics.threatsDetectedToday}
          subtitle="Detected in current 24h cycle"
          icon={<AlertTriangle className="w-4 h-4" />}
          iconBgColor="bg-orange-50"
          iconTextColor="text-orange-600"
          badgeText="Active Window"
          badgeColor="bg-orange-50 text-orange-700"
        />

        <MetricCard
          title="Open Incidents"
          value={metrics.openIncidents}
          subtitle={`${metrics.statusCounts?.reviewed || 0} currently reviewed`}
          icon={<FolderOpen className="w-4 h-4" />}
          iconBgColor="bg-amber-50"
          iconTextColor="text-amber-600"
          badgeText="Needs Action"
          badgeColor="bg-amber-50 text-amber-700"
        />

        <MetricCard
          title="Critical Findings"
          value={metrics.criticalFindings}
          subtitle="Immediate response required"
          icon={<ShieldAlert className="w-4 h-4" />}
          iconBgColor="bg-red-50"
          iconTextColor="text-red-600"
          badgeText="Urgent"
          badgeColor="bg-red-50 text-red-700"
        />
      </div>

      {/* Row 2: Severity Distribution + Integration Configuration */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <SeverityChartCard
            severityCounts={metrics.severityCounts}
            totalEvents={metrics.totalEvents}
          />
        </div>

        <div>
          <Card
            padding="md"
            header={
              <div>
                <h2 className="text-sm font-bold text-slate-900">Integration Configuration</h2>
                <p className="text-xs text-slate-500 mt-0.5">Configuration status only; service health is not reported</p>
              </div>
            }
          >
            <div className="space-y-3.5 text-xs">
              <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
                <span className="text-slate-600">Backend API endpoint</span>
                <span className="font-semibold text-slate-800">
                  {API_BASE_URL ? 'Configured; health unverified' : 'Not configured'}
                </span>
              </div>

              <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
                <span className="text-slate-600">Entra ID API authentication</span>
                <span className="font-semibold text-slate-800">
                  {authService.isConfigured() ? 'Configuration present' : 'Configuration pending'}
                </span>
              </div>

              <div className="flex items-start gap-2 text-slate-500">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>Ingestion pipeline and detection-rule health are not available in the confirmed frontend API contract.</span>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Row 3: Top Risky Source IPs */}
      <RiskyIpsTable riskyIps={riskyIps} />

      {/* Row 4: Recent Security Activity & Findings */}
      <RecentActivityFeed findings={recentFindings} />
    </div>
  );
}
