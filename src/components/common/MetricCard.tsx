import { ReactNode } from 'react';
import { Card } from './Card';
import { cn } from '../../utils/cn';

export interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: ReactNode;
  iconBgColor?: string;
  iconTextColor?: string;
  badgeText?: string;
  badgeColor?: string;
}

export function MetricCard({
  title,
  value,
  subtitle,
  icon,
  iconBgColor = 'bg-brand-50',
  iconTextColor = 'text-brand-600',
  badgeText,
  badgeColor = 'bg-slate-100 text-slate-700',
}: MetricCardProps) {
  return (
    <Card padding="md" hoverEffect className="relative overflow-hidden">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
          {title}
        </span>
        <div
          className={cn(
            'w-9 h-9 rounded-lg flex items-center justify-center shadow-subtle',
            iconBgColor,
            iconTextColor
          )}
        >
          {icon}
        </div>
      </div>

      <div className="mt-3 flex items-baseline justify-between">
        <span className="text-2xl font-bold text-slate-900 tracking-tight">
          {value}
        </span>
        {badgeText && (
          <span
            className={cn(
              'px-2 py-0.5 rounded-full text-[11px] font-semibold',
              badgeColor
            )}
          >
            {badgeText}
          </span>
        )}
      </div>

      {subtitle && (
        <p className="text-xs text-slate-500 mt-1 truncate">
          {subtitle}
        </p>
      )}
    </Card>
  );
}
