import {
  AlertPreferences,
  DashboardStatsResponse,
  FindingFilterOptions,
  FindingStatus,
  PaginatedResult,
  RiskyIpSummary,
  SecurityFinding,
  SecurityMetrics,
  SecurityServiceInterface,
  SeverityLevel,
} from '../types';
import { apiClient, API_BASE_URL } from './apiClient';
import { ApiError } from './apiError';

type JsonRecord = Record<string, unknown>;

const SEVERITIES: SeverityLevel[] = ['Critical', 'High', 'Medium', 'Low'];
const STATUSES: FindingStatus[] = ['open', 'reviewed', 'resolved'];

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function invalidResponse(field: string): never {
  throw new ApiError(`The backend returned an invalid response: ${field}.`, {
    userMessage: `The Azure backend returned an invalid response (${field}). Contact the backend owner.`,
  });
}

function requiredString(
  record: JsonRecord,
  keys: string[],
  field: string
): string {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return invalidResponse(field);
}

function optionalString(record: JsonRecord, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (value !== undefined && value !== null && typeof value !== 'string') {
      return invalidResponse(key);
    }
  }
  return undefined;
}

function validTimestamp(value: string, field: string): string {
  if (!Number.isFinite(Date.parse(value))) return invalidResponse(field);
  return value;
}

function severityValue(value: unknown, field: string): SeverityLevel {
  const severity = SEVERITIES.find((candidate) => candidate === value);
  return severity || invalidResponse(field);
}

function statusValue(value: unknown, field: string): FindingStatus {
  const status = STATUSES.find((candidate) => candidate === value);
  return status || invalidResponse(field);
}

function nonNegativeInteger(record: JsonRecord, key: string): number {
  const value = record[key];
  if (typeof value === 'number' && Number.isSafeInteger(value) && value >= 0) {
    return value;
  }
  return invalidResponse(key);
}

function stringArray(value: unknown, field: string): string[] {
  if (!Array.isArray(value)) return invalidResponse(field);
  const strings = value.filter((entry): entry is string => typeof entry === 'string');
  if (strings.length !== value.length) return invalidResponse(field);
  return strings;
}

export function normalizeFinding(value: unknown): SecurityFinding {
  if (!isRecord(value)) return invalidResponse('finding');

  const findingId = requiredString(value, ['finding_id', 'id', 'findingId'], 'finding_id');
  const timestamp = validTimestamp(
    requiredString(value, ['timestamp', 'detectedAt'], 'timestamp'),
    'timestamp'
  );
  const eventType = requiredString(value, ['event_type', 'eventType'], 'event_type');
  const severity = severityValue(value.severity, 'severity');
  const userOrRole = requiredString(value, ['user_or_role', 'userOrRole', 'principalId'], 'user_or_role');
  const sourceIp = requiredString(value, ['source_ip', 'sourceIp'], 'source_ip');
  const region = requiredString(value, ['region'], 'region');
  const description = requiredString(value, ['description', 'title'], 'description');
  const status = statusValue(value.status, 'status');
  const eventTypeName = optionalString(value, ['event_type_name', 'eventTypeName']);
  const title = optionalString(value, ['title']);
  const country = optionalString(value, ['country', 'location']);
  const source = optionalString(value, ['source']);
  const resource = optionalString(value, ['resource', 'targetResource', 'resourceId']);
  const accountId = optionalString(value, ['account_id', 'accountId', 'subscriptionId']);
  const ruleId = optionalString(value, ['rule_id', 'ruleId']);
  const reasonFlagged = optionalString(value, ['reason_flagged', 'whyFlagged']);

  const rawActions = value.recommended_action ?? value.recommendedAction;
  let recommendedAction: string[] | undefined;
  if (rawActions !== undefined && rawActions !== null) {
    recommendedAction =
      typeof rawActions === 'string'
        ? [rawActions]
        : stringArray(rawActions, 'recommended_action');
  }

  const rawEventValue = value.raw_event ?? value.rawEvent;
  let rawEvent: JsonRecord | undefined;
  if (rawEventValue !== undefined && rawEventValue !== null) {
    if (!isRecord(rawEventValue)) return invalidResponse('raw_event');
    rawEvent = rawEventValue;
  }

  return {
    finding_id: findingId,
    id: findingId,
    timestamp,
    event_type: eventType,
    eventType,
    event_type_name: eventTypeName,
    eventTypeName,
    severity,
    user_or_role: userOrRole,
    userOrRole,
    source_ip: sourceIp,
    sourceIp,
    region,
    country,
    location: country,
    title: title || description,
    description,
    status,
    source,
    resource,
    account_id: accountId,
    accountId,
    rule_id: ruleId,
    ruleId,
    reason_flagged: reasonFlagged,
    whyFlagged: reasonFlagged,
    recommended_action: recommendedAction,
    recommendedAction,
    raw_event: rawEvent,
    rawEvent,
  };
}

export function parseFindingsResponse(
  body: unknown,
  filters: FindingFilterOptions = {}
): PaginatedResult<SecurityFinding> {
  let rows: unknown[];
  let total: number;
  let page = filters.page ?? 1;
  let pageSize = filters.pageSize ?? 50;

  if (Array.isArray(body)) {
    rows = body;
    total = body.length;
  } else if (isRecord(body)) {
    const list = body.data ?? body.findings ?? body.value;
    if (!Array.isArray(list)) return invalidResponse('data');
    rows = list;
    total = nonNegativeInteger(body, 'total');
    page = nonNegativeInteger(body, 'page');
    pageSize = nonNegativeInteger(body, 'pageSize');
    if (page < 1 || pageSize < 1) return invalidResponse('pagination');
    if (body.totalPages !== undefined &&
      nonNegativeInteger(body, 'totalPages') !== Math.max(1, Math.ceil(total / pageSize))) {
      return invalidResponse('totalPages');
    }
  } else {
    return invalidResponse('findings response');
  }

  if (total < rows.length || page < 1 || pageSize < 1) {
    return invalidResponse('pagination');
  }

  return {
    data: rows.map(normalizeFinding),
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

function parseRiskyIp(value: unknown): RiskyIpSummary {
  if (!isRecord(value)) return invalidResponse('riskyIps item');
  const location = optionalString(value, ['location']);
  const country = optionalString(value, ['country']);
  return {
    ip: requiredString(value, ['ip'], 'riskyIps.ip'),
    location,
    country,
    count: nonNegativeInteger(value, 'count'),
    highestSeverity: severityValue(value.highestSeverity, 'riskyIps.highestSeverity'),
    associatedEvents: stringArray(value.associatedEvents, 'riskyIps.associatedEvents'),
    lastSeen: validTimestamp(
      requiredString(value, ['lastSeen'], 'riskyIps.lastSeen'),
      'riskyIps.lastSeen'
    ),
  };
}

export function parseDashboardStatsResponse(value: unknown): DashboardStatsResponse {
  if (!isRecord(value) || !isRecord(value.metrics)) {
    return invalidResponse('metrics');
  }
  const metrics = value.metrics;
  if (!isRecord(metrics.severityCounts) || !isRecord(metrics.statusCounts)) {
    return invalidResponse('metric counts');
  }

  const severityCountsRecord = metrics.severityCounts;
  const statusCountsRecord = metrics.statusCounts;
  const severityCounts: Record<SeverityLevel, number> = {
    Critical: nonNegativeInteger(severityCountsRecord, 'Critical'),
    High: nonNegativeInteger(severityCountsRecord, 'High'),
    Medium: nonNegativeInteger(severityCountsRecord, 'Medium'),
    Low: nonNegativeInteger(severityCountsRecord, 'Low'),
  };
  const statusCounts: Record<FindingStatus, number> = {
    open: nonNegativeInteger(statusCountsRecord, 'open'),
    reviewed: nonNegativeInteger(statusCountsRecord, 'reviewed'),
    resolved: nonNegativeInteger(statusCountsRecord, 'resolved'),
  };

  const normalizedMetrics: SecurityMetrics = {
    totalEvents: nonNegativeInteger(metrics, 'totalEvents'),
    threatsDetectedToday: nonNegativeInteger(metrics, 'threatsDetectedToday'),
    openIncidents: nonNegativeInteger(metrics, 'openIncidents'),
    criticalFindings: nonNegativeInteger(metrics, 'criticalFindings'),
    reviewedIncidents: nonNegativeInteger(metrics, 'reviewedIncidents'),
    resolvedIncidents: nonNegativeInteger(metrics, 'resolvedIncidents'),
    severityCounts,
    statusCounts,
  };

  if (!Array.isArray(value.riskyIps) || !Array.isArray(value.recentFindings)) {
    return invalidResponse('riskyIps or recentFindings');
  }

  return {
    metrics: normalizedMetrics,
    riskyIps: value.riskyIps.map(parseRiskyIp),
    recentFindings: value.recentFindings.map(normalizeFinding),
  };
}

export function parseAlertPreferences(value: unknown): AlertPreferences {
  if (!isRecord(value)) return invalidResponse('alert settings');
  const booleanValue = (key: string): boolean => {
    const field = value[key];
    if (typeof field === 'boolean') return field;
    return invalidResponse(`alert settings.${key}`);
  };
  if (typeof value.recipientEmails !== 'string') {
    return invalidResponse('alert settings.recipientEmails');
  }
  const lastSavedAt = optionalString(value, ['lastSavedAt']);
  if (lastSavedAt) validTimestamp(lastSavedAt, 'alert settings.lastSavedAt');

  return {
    critical: booleanValue('critical'),
    high: booleanValue('high'),
    medium: booleanValue('medium'),
    low: booleanValue('low'),
    recipientEmails: value.recipientEmails,
    notifyOnResolution: booleanValue('notifyOnResolution'),
    lastSavedAt,
  };
}

function ensureApiConfigured(): void {
  if (!API_BASE_URL) {
    throw new ApiError('VITE_API_BASE_URL is not configured.', {
      isNetworkError: true,
      userMessage: 'The Azure backend endpoint is not configured (VITE_API_BASE_URL is empty).',
    });
  }

  let endpoint: URL;
  try {
    endpoint = new URL(API_BASE_URL);
  } catch {
    throw new ApiError('VITE_API_BASE_URL is not a valid URL.', {
      userMessage: 'The configured Azure backend URL is invalid.',
    });
  }
  if (endpoint.username || endpoint.password) {
    throw new ApiError('VITE_API_BASE_URL must not include credentials.', {
      userMessage: 'The configured backend URL must not contain credentials.',
    });
  }
  const isLocal = ['localhost', '127.0.0.1', '[::1]'].includes(endpoint.hostname);
  if (endpoint.protocol !== 'https:' && !(isLocal && endpoint.protocol === 'http:')) {
    throw new ApiError('The backend URL must use HTTPS.', {
      userMessage: 'The configured backend URL must use HTTPS outside local development.',
    });
  }
}

function requestParams(filters: FindingFilterOptions): Record<string, string | number> {
  const params: Record<string, string | number> = {};
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== '' && value !== 'ALL') params[key] = value;
  }
  return params;
}

export const securityService: SecurityServiceInterface = {
  async getFindings(
    filters: FindingFilterOptions = {},
    signal?: AbortSignal
  ): Promise<PaginatedResult<SecurityFinding>> {
    ensureApiConfigured();
    const response = await apiClient.get<unknown>('/findings', {
      params: requestParams(filters),
      signal,
    });
    return parseFindingsResponse(response.data, filters);
  },

  async getFindingById(id: string, signal?: AbortSignal): Promise<SecurityFinding | null> {
    ensureApiConfigured();
    try {
      const response = await apiClient.get<unknown>(`/findings/${encodeURIComponent(id)}`, { signal });
      return normalizeFinding(response.data);
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) return null;
      throw error;
    }
  },

  async getDashboardStats(signal?: AbortSignal): Promise<DashboardStatsResponse> {
    ensureApiConfigured();
    const response = await apiClient.get<unknown>('/stats/overview', { signal });
    return parseDashboardStatsResponse(response.data);
  },

  async getAlertSettings(signal?: AbortSignal): Promise<AlertPreferences> {
    ensureApiConfigured();
    const response = await apiClient.get<unknown>('/alerts/settings', { signal });
    return parseAlertPreferences(response.data);
  },

  async updateAlertSettings(settings: AlertPreferences): Promise<AlertPreferences> {
    ensureApiConfigured();
    const response = await apiClient.put<unknown>('/alerts/settings', settings);
    return parseAlertPreferences(response.data);
  },

  async getReportData(
    filters: FindingFilterOptions = {},
    signal?: AbortSignal
  ): Promise<SecurityFinding[]> {
    const pageSize = 100;
    const firstPage = await this.getFindings({ ...filters, page: 1, pageSize }, signal);
    const findings = [...firstPage.data];

    for (let page = 2; page <= firstPage.totalPages; page += 1) {
      if (signal?.aborted) throw new DOMException('The operation was aborted.', 'AbortError');
      const result = await this.getFindings({ ...filters, page, pageSize }, signal);
      if (result.total !== firstPage.total || result.page !== page) {
        return invalidResponse('report pagination changed while loading');
      }
      findings.push(...result.data);
    }

    if (findings.length !== firstPage.total) {
      return invalidResponse('report is incomplete');
    }
    return findings;
  },
};
