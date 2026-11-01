import assert from 'node:assert/strict';
import { createServer } from 'vite';

for (const key of Object.keys(process.env)) {
  if (key.startsWith('VITE_')) process.env[key] = '';
}

const findingPayload = {
  finding_id: 'finding-001',
  timestamp: '2026-01-15T14:32:00Z',
  event_type: 'PrivilegedIdentityUsage',
  severity: 'High',
  user_or_role: 'admin@example.org',
  source_ip: '203.0.113.10',
  region: 'eastus',
  description: 'Unexpected privileged role activation',
  status: 'open',
};

const dashboardPayload = {
  metrics: {
    totalEvents: 1,
    threatsDetectedToday: 1,
    openIncidents: 1,
    criticalFindings: 0,
    reviewedIncidents: 0,
    resolvedIncidents: 0,
    severityCounts: { Critical: 0, High: 1, Medium: 0, Low: 0 },
    statusCounts: { open: 1, reviewed: 0, resolved: 0 },
  },
  riskyIps: [],
  recentFindings: [findingPayload],
};

async function runTests() {
  const vite = await createServer({
    server: { middlewareMode: true },
    appType: 'custom',
  });

  try {
    const {
      normalizeFinding,
      parseFindingsResponse,
      parseDashboardStatsResponse,
      parseAlertPreferences,
      securityService,
    } = await vite.ssrLoadModule('./src/services/securityService.ts');
    const { ApiError } = await vite.ssrLoadModule('./src/services/apiError.ts');
    const { authService } = await vite.ssrLoadModule('./src/services/authService.ts');
    const { exportFindingsToCsv } = await vite.ssrLoadModule('./src/utils/exportUtils.ts');

    console.log('[1/6] Validate strict finding and pagination parsing');
    const finding = normalizeFinding(findingPayload);
    assert.equal(finding.id, findingPayload.finding_id);
    assert.equal(finding.severity, 'High');
    assert.throws(
      () => normalizeFinding({ ...findingPayload, severity: 'Informational' }),
      /severity/
    );
    assert.throws(
      () => normalizeFinding({ ...findingPayload, timestamp: 'not-a-date' }),
      /timestamp/
    );
    const page = parseFindingsResponse({
      data: [findingPayload],
      total: 3,
      page: 1,
      pageSize: 2,
      totalPages: 2,
    });
    assert.equal(page.totalPages, 2);
    assert.equal(page.data.length, 1);
    assert.throws(
      () => parseFindingsResponse({
        data: [findingPayload],
        total: 3,
        page: 1,
        pageSize: 2,
        totalPages: 8,
      }),
      /totalPages/
    );
    assert.throws(
      () => parseFindingsResponse({ data: [], total: -1, page: 1, pageSize: 10 }),
      /total/
    );

    console.log('[2/6] Validate dashboard metrics without fabricated defaults');
    assert.equal(parseDashboardStatsResponse(dashboardPayload).metrics.totalEvents, 1);
    assert.throws(
      () => parseDashboardStatsResponse({
        ...dashboardPayload,
        metrics: { ...dashboardPayload.metrics, totalEvents: -1 },
      }),
      /totalEvents/
    );
    assert.throws(
      () => parseDashboardStatsResponse({ metrics: {}, riskyIps: [], recentFindings: [] }),
      /metric counts/
    );

    console.log('[3/6] Validate alert preference response fields');
    const alertPreferences = {
      critical: true,
      high: true,
      medium: false,
      low: false,
      recipientEmails: 'secops@example.org',
      notifyOnResolution: true,
      lastSavedAt: '2026-01-15T15:00:00Z',
    };
    assert.deepEqual(parseAlertPreferences(alertPreferences), alertPreferences);
    assert.throws(
      () => parseAlertPreferences({ ...alertPreferences, high: 'yes' }),
      /alert settings.high/
    );

    console.log('[4/6] Validate unconfigured Entra authentication');
    assert.equal(authService.isConfigured(), false);
    await assert.rejects(authService.signIn(), /not configured/);
    assert.equal(await authService.getAccessToken(), null);

    console.log('[5/6] Validate typed API errors and service surface');
    const unauthorized = new ApiError('Unauthorized', { status: 401 });
    assert.equal(unauthorized.isAuthError, true);
    assert.equal(unauthorized.status, 401);
    assert.equal(typeof securityService.getFindings, 'function');
    assert.equal(typeof securityService.getDashboardStats, 'function');
    assert.equal(typeof securityService.getAlertSettings, 'function');
    assert.equal(typeof securityService.getReportData, 'function');

    console.log('[6/6] Verify CSV formula-injection neutralization');
    const originalCreateObjectURL = Object.getOwnPropertyDescriptor(URL, 'createObjectURL');
    const originalRevokeObjectURL = Object.getOwnPropertyDescriptor(URL, 'revokeObjectURL');
    const originalDocument = Object.getOwnPropertyDescriptor(globalThis, 'document');
    const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
    let exportedBlob;
    const link = { setAttribute() {}, click() {} };
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: (blob) => {
        exportedBlob = blob;
        return 'blob:test';
      },
    });
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value() {} });
    Object.defineProperty(globalThis, 'document', {
      configurable: true,
      value: {
        createElement: () => link,
        body: { appendChild() {}, removeChild() {} },
      },
    });
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: { setTimeout() { return 1; } },
    });

    try {
      exportFindingsToCsv(
        [{ ...finding, description: '=HYPERLINK("https://example.org")' }],
        'test.csv'
      );
      const csv = await exportedBlob.text();
      assert.match(csv, /"'=HYPERLINK/);
    } finally {
      if (originalCreateObjectURL) {
        Object.defineProperty(URL, 'createObjectURL', originalCreateObjectURL);
      } else {
        delete URL.createObjectURL;
      }
      if (originalRevokeObjectURL) {
        Object.defineProperty(URL, 'revokeObjectURL', originalRevokeObjectURL);
      } else {
        delete URL.revokeObjectURL;
      }
      if (originalDocument) {
        Object.defineProperty(globalThis, 'document', originalDocument);
      } else {
        delete globalThis.document;
      }
      if (originalWindow) {
        Object.defineProperty(globalThis, 'window', originalWindow);
      } else {
        delete globalThis.window;
      }
    }

    console.log('All frontend contract and safety checks passed.');
  } finally {
    await vite.close();
  }
}

runTests().catch((error) => {
  console.error('Frontend verification failed:', error);
  process.exitCode = 1;
});
