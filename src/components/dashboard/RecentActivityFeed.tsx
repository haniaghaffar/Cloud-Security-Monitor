import { Link } from 'react-router-dom';
import { SecurityFinding } from '../../types';
import { Card } from '../common/Card';
import { SeverityBadge, StatusBadge } from '../common/Badge';
import { formatRelativeTime } from '../../utils/formatters';
import { ArrowRight, ShieldAlert, Radio, ShieldCheck } from 'lucide-react';

interface RecentActivityFeedProps {
  findings: SecurityFinding[];
}

export function RecentActivityFeed({ findings }: RecentActivityFeedProps) {
  const recent = findings.slice(0, 5);

  return (
    <Card
      padding="none"
      header={
        <div className="flex items-center justify-between w-full">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Recent Security Findings</h2>
            <p className="text-xs text-slate-500 mt-0.5">Latest detections processed by rule engine</p>
          </div>
          <Link
            to="/findings"
            className="text-xs font-semibold text-brand-600 hover:text-brand-700 inline-flex items-center gap-1 transition-colors"
          >
            <span>View All</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      }
    >
      {recent.length === 0 ? (
        <div className="p-8 text-center">
          <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-2.5">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <p className="text-sm font-semibold text-slate-800">No Recent Findings</p>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            No security threat incidents have been detected. Incoming Azure telemetry will appear here in real time.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-slate-100">
          {recent.map((f) => {
            const id = f.finding_id || f.id;
            const user = f.user_or_role || f.userOrRole;
            const location = f.country || f.location || f.region || 'Unknown';
            return (
              <Link
                key={id}
                to={`/findings/${id}`}
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/80 transition-colors group block"
              >
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center flex-shrink-0 mt-0.5 group-hover:bg-brand-50 group-hover:text-brand-600 transition-colors">
                    <ShieldAlert className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs text-slate-400">{id}</span>
                      <span className="text-xs text-slate-400">•</span>
                      <span className="text-xs text-slate-500 flex items-center gap-1">
                        <Radio className="w-3 h-3 text-slate-400" />
                        {f.source || 'Azure Monitor'}
                      </span>
                    </div>
                    <h3 className="text-sm font-semibold text-slate-900 group-hover:text-brand-600 transition-colors mt-0.5">
                      {f.title || f.description}
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Actor: <code className="text-slate-700 bg-slate-100 px-1 py-0.5 rounded text-[11px]">{user}</code> from {location}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 self-end sm:self-center flex-shrink-0">
                  <SeverityBadge severity={f.severity} />
                  <StatusBadge status={f.status} />
                  <span className="text-xs text-slate-400 whitespace-nowrap min-w-[70px] text-right">
                    {formatRelativeTime(f.timestamp)}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </Card>
  );
}
