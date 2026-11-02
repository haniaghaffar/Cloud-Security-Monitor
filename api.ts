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

/**
 * One Azure resource as returned by GET /api/resources. The backend
 * reports exactly what Azure Resource Manager returns (id, name,
 * type, location, resource group). ARM's resource list carries no
 * health or connection status, so none is included here.
 */
export interface AzureResource {
  id: string;
  name: string;
  type: string;
  location: string;
  resourceGroup: string;
}

export interface ResourcesResponse {
  data: AzureResource[];
  total: number;
}

export interface SecurityServiceInterface {
  getFindings(filters?: FindingFilterOptions, signal?: AbortSignal): Promise<PaginatedResult<SecurityFinding>>;
  getFindingById(id: string, signal?: AbortSignal): Promise<SecurityFinding | null>;
  getDashboardStats(signal?: AbortSignal): Promise<DashboardStatsResponse>;
  getAlertSettings(signal?: AbortSignal): Promise<AlertPreferences>;
  updateAlertSettings(settings: AlertPreferences): Promise<AlertPreferences>;
  getReportData(filters?: FindingFilterOptions, signal?: AbortSignal): Promise<SecurityFinding[]>;
  getResources(signal?: AbortSignal): Promise<ResourcesResponse>;
}
