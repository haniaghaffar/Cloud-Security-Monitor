import { RiskyIpSummary } from '../../types';
import { Card } from '../common/Card';
import { SeverityBadge } from '../common/Badge';
import { Globe, ShieldAlert, CheckCircle } from 'lucide-react';
import { formatRelativeTime } from '../../utils/formatters';

interface RiskyIpsTableProps {
  riskyIps: RiskyIpSummary[];
  onSelectIp?: (ip: string) => void;
}

export function RiskyIpsTable({ riskyIps }: RiskyIpsTableProps) {
  return (
    <Card
      padding="none"
      header={
        <div className="flex items-center justify-between w-full">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Top Risky Source IPs</h2>
            <p className="text-xs text-slate-500 mt-0.5">External addresses generating security findings</p>
          </div>
          <div className="flex items-center gap-1 text-xs text-slate-400">
            <Globe className="w-3.5 h-3.5" />
            <span>Geo Location</span>
          </div>
        </div>
      }
    >
      {riskyIps.length === 0 ? (
        <div className="p-8 text-center">
          <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-2.5">
            <CheckCircle className="w-5 h-5" />
          </div>
          <p className="text-sm font-semibold text-slate-800">No Risky IPs Identified</p>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            No anomalous or high-risk source IP addresses have been recorded in the current telemetry window.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th scope="col" className="px-5 py-3">Source IP</th>
                <th scope="col" className="px-4 py-3">Location</th>
                <th scope="col" className="px-4 py-3 text-center">Incidents</th>
                <th scope="col" className="px-4 py-3">Highest Severity</th>
                <th scope="col" className="px-4 py-3">Associated Rules</th>
                <th scope="col" className="px-5 py-3 text-right">Last Seen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {riskyIps.slice(0, 5).map((item) => (
                <tr key={item.ip} className="hover:bg-slate-50/70 transition-colors">
                  <td className="px-5 py-3 font-mono font-medium text-slate-900 flex items-center gap-2">
                    <ShieldAlert className="w-3.5 h-3.5 text-slate-400" />
                    <span>{item.ip}</span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {item.location || item.country || 'Unknown'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-flex items-center justify-center min-w-[24px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-800 font-semibold font-mono">
                      {item.count}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <SeverityBadge severity={item.highestSeverity} />
                  </td>
                  <td className="px-4 py-3 text-slate-600 max-w-[200px] truncate" title={(item.associatedEvents || []).join(', ')}>
                    {(item.associatedEvents || []).join(', ')}
                  </td>
                  <td className="px-5 py-3 text-right text-slate-500 whitespace-nowrap">
                    {formatRelativeTime(item.lastSeen)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
