import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Card } from '../common/Card';
import { SeverityLevel } from '../../types';
import { SEVERITY_CHART_COLORS } from '../../utils/formatters';

interface SeverityChartCardProps {
  severityCounts?: Record<SeverityLevel | string, number>;
  totalEvents: number;
}

export function SeverityChartCard({ severityCounts = {}, totalEvents }: SeverityChartCardProps) {
  const getCount = (key: string): number => {
    return (
      severityCounts[key] ??
      severityCounts[key.toUpperCase()] ??
      severityCounts[key.toLowerCase()] ??
      0
    );
  };

  const criticalCount = getCount('Critical');
  const highCount = getCount('High');
  const mediumCount = getCount('Medium');
  const lowCount = getCount('Low');

  const hasData = totalEvents > 0 && (criticalCount + highCount + mediumCount + lowCount) > 0;

  const data: { name: SeverityLevel; value: number; color: string }[] = hasData
    ? [
        { name: 'Critical', value: criticalCount, color: SEVERITY_CHART_COLORS.Critical },
        { name: 'High', value: highCount, color: SEVERITY_CHART_COLORS.High },
        { name: 'Medium', value: mediumCount, color: SEVERITY_CHART_COLORS.Medium },
        { name: 'Low', value: lowCount, color: SEVERITY_CHART_COLORS.Low },
      ]
    : [
        { name: 'Low', value: 1, color: '#e2e8f0' }, // Placeholder empty ring
      ];

  const legendItems: { name: SeverityLevel; value: number; color: string }[] = [
    { name: 'Critical', value: criticalCount, color: SEVERITY_CHART_COLORS.Critical },
    { name: 'High', value: highCount, color: SEVERITY_CHART_COLORS.High },
    { name: 'Medium', value: mediumCount, color: SEVERITY_CHART_COLORS.Medium },
    { name: 'Low', value: lowCount, color: SEVERITY_CHART_COLORS.Low },
  ];

  return (
    <Card
      padding="md"
      header={
        <div>
          <h2 className="text-sm font-bold text-slate-900">Findings by Severity</h2>
          <p className="text-xs text-slate-500 mt-0.5">Distribution across detected security events</p>
        </div>
      }
    >
      <div className="flex flex-col sm:flex-row items-center justify-between gap-6 py-2">
        {/* Donut Chart */}
        <div className="h-48 w-48 relative flex-shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={75}
                paddingAngle={hasData ? 3 : 0}
                dataKey="value"
                nameKey="name"
                stroke="transparent"
              >
                {data.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Pie>
              {hasData && (
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const item = payload[0];
                      const percent = totalEvents > 0 ? Math.round(((Number(item.value) || 0) / totalEvents) * 100) : 0;
                      return (
                        <div className="bg-white border border-slate-200 rounded-lg p-2.5 shadow-dropdown text-xs">
                          <div className="flex items-center gap-1.5 font-bold text-slate-900">
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.payload?.color }} />
                            <span>{item.name}</span>
                          </div>
                          <p className="text-slate-600 mt-1">
                            {item.value} findings ({percent}%)
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
              )}
            </PieChart>
          </ResponsiveContainer>

          {/* Center Metric */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-2xl font-bold text-slate-900 leading-none">
              {totalEvents}
            </span>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mt-0.5">
              Total
            </span>
          </div>
        </div>

        {/* Legend List */}
        <div className="flex-1 w-full space-y-2.5">
          {legendItems.map((item) => {
            const percentage = totalEvents > 0 ? Math.round((item.value / totalEvents) * 100) : 0;
            return (
              <div key={item.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="font-medium text-slate-700">{item.name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-slate-900 font-mono">{item.value}</span>
                  <span className="text-slate-400 min-w-[36px] text-right font-mono text-[11px]">
                    {percentage}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}
