import {
  SecurityFinding,
  SecurityMetrics,
  RiskyIpSummary,
  AlertPreferences,
  FindingFilterOptions,
  PaginatedResult,
} from './security';

export interface ApiResponse<T> {
  success?: boolean;
  data: T;
  message?: string;
  timestamp?: string;
  total?: number;
}

export interface DashboardStatsResponse {
  metrics: SecurityMetrics;
  riskyIps: RiskyIpSummary[];
  recentFindings: SecurityFinding[];
}

export interface SecurityServiceInterface {
  getFindings(filters?: FindingFilterOptions, signal?: AbortSignal): Promise<PaginatedResult<SecurityFinding>>;
  getFindingById(id: string, signal?: AbortSignal): Promise<SecurityFinding | null>;
  getDashboardStats(signal?: AbortSignal): Promise<DashboardStatsResponse>;
  getAlertSettings(signal?: AbortSignal): Promise<AlertPreferences>;
  updateAlertSettings(settings: AlertPreferences): Promise<AlertPreferences>;
  getReportData(filters?: FindingFilterOptions, signal?: AbortSignal): Promise<SecurityFinding[]>;
}
