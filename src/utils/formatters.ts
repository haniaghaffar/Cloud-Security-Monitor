/**
 * Format an ISO date string to a human-readable format
 */
export const formatDate = (isoString?: string): string => {
  if (!isoString) return '—';
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return isoString;
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

/**
 * Format relative time (e.g., "2 hours ago")
 */
export const formatRelativeTime = (isoString?: string): string => {
  if (!isoString) return '—';
  const now = new Date();
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return isoString;

  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDate(isoString);
};

/**
 * Get light-theme Tailwind CSS classes for severity badges
 * Critical: red
 * High: orange
 * Medium: amber
 * Low: green
 */
export const getSeverityClasses = (severity: string): string => {
  const norm = severity?.toLowerCase();
  switch (norm) {
    case 'critical':
      return 'bg-red-50 text-red-700 border-red-200';
    case 'high':
      return 'bg-orange-50 text-orange-700 border-orange-200';
    case 'medium':
      return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'low':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    default:
      return 'bg-slate-100 text-slate-700 border-slate-200';
  }
};

/**
 * Hex colors for charts (Recharts)
 */
export const SEVERITY_CHART_COLORS: Record<string, string> = {
  Critical: '#dc2626', // Red
  High: '#ea580c',     // Orange
  Medium: '#d97706',   // Amber
  Low: '#16a34a',      // Green
};

/**
 * Get light-theme Tailwind CSS classes for status badges
 * Consistent status values: open, reviewed, resolved
 */
export const getStatusClasses = (status: string): string => {
  const norm = status?.toLowerCase();
  switch (norm) {
    case 'open':
      return 'bg-red-50 text-red-700 border-red-200';
    case 'reviewed':
      return 'bg-blue-50 text-blue-700 border-blue-200';
    case 'resolved':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    default:
      return 'bg-slate-100 text-slate-600 border-slate-200';
  }
};

/**
 * Truncate text to a maximum length
 */
export const truncate = (text: string, maxLength = 100): string => {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};
