import { SeverityLevel, FindingStatus } from '../../types';
import { getSeverityClasses, getStatusClasses } from '../../utils/formatters';
import { cn } from '../../utils/cn';

export interface SeverityBadgeProps {
  severity: SeverityLevel | string;
  className?: string;
}

export function SeverityBadge({ severity, className }: SeverityBadgeProps) {
  const displayLabel = severity ? severity.charAt(0).toUpperCase() + severity.slice(1).toLowerCase() : 'Unknown';

  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border tracking-wide',
        getSeverityClasses(severity),
        className
      )}
    >
      <span className="w-1.5 h-1.5 rounded-full mr-1.5 bg-current opacity-80" />
      {displayLabel}
    </span>
  );
}

export interface StatusBadgeProps {
  status: FindingStatus | string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const norm = status ? status.toLowerCase() : 'open';
  const displayLabel: Record<string, string> = {
    open: 'Open',
    reviewed: 'Reviewed',
    resolved: 'Resolved',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border capitalize',
        getStatusClasses(norm),
        className
      )}
    >
      {displayLabel[norm] || status}
    </span>
  );
}
