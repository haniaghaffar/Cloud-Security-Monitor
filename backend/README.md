# Cloud Security Monitor — Member 1 Backend (Azure Functions)

Backend for the Cloud Security Monitor course project, built by Member 1.
It is deployed and running on Azure; the dashboard in this repo reads
from its REST API.

## What it does

- Two blob triggers parse Azure Activity Log exports (JSON) from Blob
  Storage: `csm_blob_processor` (container `logs`) and
  `csm_blob_processor_live` (container `insights-activity-logs`, where
  Azure writes hourly diagnostic exports).
- 7 detection rules run over the events: RootAccountUsage, CloudTrailDisabled,
  PublicS3Bucket, PublicSecurityGroup, IAMPolicyChange, BruteForceLogin,
  NewRegionLogin.
- Findings are stored in Azure Table Storage (table `findings`) and email
  alerts are sent for High/Critical findings via Resend.
- A REST API serves the dashboard, protected by Microsoft Entra ID
  token validation (v6, live): requests without a valid Bearer token
  get 401. The frontend signs in with Entra ID (redirect flow,
  /consumers endpoint for personal Microsoft accounts).

## Deployment (live)

- Function App: `csmfunc583` (Linux, Python 3.11, Consumption),
  resource group `csm-rg`, region UAE North.
- API base URL: `https://csmfunc583.azurewebsites.net/api`
- Frontend: set `VITE_API_BASE_URL` to the base URL above and set
  the `VITE_AUTH_*` variables (client id, tenant id, API scope,
  redirect URI) for Entra login; the dashboard sends the user's
  access token with every API request.

## API endpoints

- `GET /api/findings` — paginated findings, with `search`, `severity`,
  `eventType`, `status`, `dateRange`, `page`, `pageSize`, `sortBy`,
  `sortOrder` filters.
- `GET /api/findings/{id}` — one finding (404 if unknown).
- `GET /api/stats/overview` — metrics, risky IPs, recent findings.
- `GET /api/resources` — live Azure resource inventory (name, type,
  location, resource group) via the Function App's managed identity
  and ARM; reports no health or connection status, because ARM does
  not provide one.
- `GET /PUT /api/alerts/settings` — alert toggles and recipient emails.

Finding fields: `finding_id`, `timestamp`, `event_type`, `severity`
(Critical/High/Medium/Low), `user_or_role`, `source_ip`, `region`,
`description`, `status` (open/reviewed/resolved).

## Current status and known limits (verified 2–3 Nov 2026)

- **Auth is live (v6, deployed 2 Nov 2026 ~17:35 PKT):** the API
  validates Entra ID JWTs (RS256, JWKS from the common endpoint,
  tenant issuer and the personal-account /consumers issuer both
  accepted). Anonymous calls return 401 on every route. Frontend
  login (redirect flow, /consumers authority) is verified: the
  signed-in dashboard loads data with its token. CORS currently
  allows `*` (demo only); restricted CORS origins remain a
  hardening follow-up for production.
- **Findings data:** 14 findings served. The first 10 come from the
  25 Oct sample run and the 27 Oct end-to-end run (event timestamps
  24 Oct 2026). 4 more arrived 2 Nov 2026 11:12Z from real Activity
  Log exports (IAMPolicyChange/High) — live log flow is now proven
  by recent rows, not just by the trigger executing.
- **Azure Resources page (fixed in v7, deployed 3 Nov 2026 ~15:49 PKT):**
  `GET /api/resources` serves the live inventory and the dashboard's
  Azure Resources page shows it (6 resources verified 3 Nov 2026:
  csm-insights583, csmstorage583, UAENorthLinuxDynamicPlan,
  csmfunc583, Application Insights Smart Detection,
  managed-csm-insights583-ws). Rows come from ARM via the Function
  App's system-assigned managed identity (Reader role on the
  subscription); no status is asserted, because ARM reports none.
  Note: the legacy MSI endpoint (MSI_ENDPOINT/MSI_SECRET) returned
  a persistent 403 even after an identity toggle and restarts, so
  v7 takes its ARM token from the Functions host identity endpoint
  first (IDENTITY_ENDPOINT + X-IDENTITY-HEADER), with the MSI path
  as fallback. The identity was re-created during diagnosis (new
  principal 227e4e94-ae49-4fc9-9023-3cded855a5b6) with Reader
  re-assigned.
- **Email alerts:** delivery was proven live on 27 Oct 2026 — 4 alerts
  arrived for the High/Critical findings of the end-to-end run and
  none for Medium, by design. Alert settings can be read via the API;
  they were not changed during verification.
- **Tests:** 49 tests pass (emailer, API, auth incl. a
  /consumers-issuer case, resources incl. identity-endpoint cases). Ingestion tests that need a
  fixture use `sample-activity-log.json` in this folder (the same
  5,544-byte file used in the 25 Oct end-to-end test); without it
  those tests skip.

## Layout

- `function_app.py` — blob triggers + HTTP routes.
- `csm/parser.py` — Activity Log parsing.
- `csm/rules.py` — the 7 detection rules.
- `csm/store.py` — Table Storage findings.
- `csm/emailer.py` — Resend email alerts.
- `csm/api.py` — findings mapping, filters, stats, alert settings.
- `csm/auth.py` — Entra JWT validation (RS256, no new dependencies).
- `csm/resources.py` — Azure resource inventory via managed identity
  (Functions host endpoint first, MSI fallback) + ARM.
- `tests/` — 49 tests (emailer, API, auth, resources).
- `sample-activity-log.json` — sample Activity Log fixture for
  ingestion tests (11 events → 5 findings).

## Configuration (app settings in Azure, never committed here)

- `RESEND_API_KEY` — Resend API key (set in the Function App).
- `ALERT_TO_EMAIL` — alert recipient email.
- `ENTRA_TENANT_ID` — Entra directory (tenant) id for token validation.
- `ENTRA_AUDIENCE` — API scope resource (`api://<client-id>`) for token validation.
- `AZURE_SUBSCRIPTION_ID` — subscription id for the resources inventory.

`.env` files are never committed to this repo.
