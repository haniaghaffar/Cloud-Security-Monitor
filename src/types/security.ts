/**
 * Cloud Security Monitor — Core Security Types
 * Production domain model for Microsoft Azure security telemetry
 */

export type SeverityLevel = 'Critical' | 'High' | 'Medium' | 'Low';

export type FindingStatus = 'open' | 'reviewed' | 'resolved';

export type DetectionRuleType = string;

export interface SecurityFinding {
  // Required Canonical Database Fields
  finding_id: string;
  timestamp: string; // ISO 8601 UTC
  event_type: string;
  severity: SeverityLevel;
  user_or_role: string;
  source_ip: string;
  region: string; // Cloud region e.g. eastus, westeurope
  country?: string; // Country / Location name
  description: string;
  status: FindingStatus;

  // Additional Telemetry & Response Fields
  reason_flagged?: string;
  recommended_action?: string[] | string;
  raw_event?: Record<string, unknown>;

  // Optional presentation aliases for backward-compatibility with UI components
  id?: string;
  eventType?: string;
  event_type_name?: string;
  eventTypeName?: string;
  userOrRole?: string;
  sourceIp?: string;
  location?: string;
  title?: string;
  source?: string;
  resource?: string;
  account_id?: string;
  accountId?: string;
  rule_id?: string;
  ruleId?: string;
  whyFlagged?: string;
  recommendedAction?: string[] | string;
  rawEvent?: Record<string, unknown>;
}

export interface SecurityMetrics {
  totalEvents: number;
  threatsDetectedToday: number;
  openIncidents: number;
  criticalFindings: number;
  reviewedIncidents: number;
  resolvedIncidents: number;
  severityCounts: Record<SeverityLevel, number>;
  statusCounts: Record<FindingStatus, number>;
}

export interface RiskyIpSummary {
  ip: string;
  location?: string;
  country?: string;
  count: number;
  highestSeverity: SeverityLevel;
  associatedEvents: string[];
  lastSeen: string;
}

export interface AlertPreferences {
  critical: boolean;
  high: boolean;
  medium: boolean;
  low: boolean;
  recipientEmails: string;
  notifyOnResolution: boolean;
  lastSavedAt?: string;
}

export interface FindingFilterOptions {
  search?: string;
  severity?: SeverityLevel | 'ALL';
  eventType?: string | 'ALL';
  status?: FindingStatus | 'ALL';
  dateRange?: 'ALL' | 'TODAY' | '7DAYS' | '30DAYS';
  page?: number;
  pageSize?: number;
  sortBy?: keyof SecurityFinding;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
