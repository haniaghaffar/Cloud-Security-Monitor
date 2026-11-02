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
- A REST API serves the dashboard (anonymous demo mode; Entra token
  validation is a documented hardening follow-up, not done yet).

## Deployment (live)

- Function App: `csmfunc583` (Linux, Python 3.11, Consumption),
  resource group `csm-rg`, region UAE North.
- API base URL: `https://csmfunc583.azurewebsites.net/api`
- Frontend: set `VITE_API_BASE_URL` to the base URL above and leave
  `VITE_AUTH_*` empty (demo mode, no login required).

## API endpoints

- `GET /api/findings` — paginated findings, with `search`, `severity`,
  `eventType`, `status`, `dateRange`, `page`, `pageSize`, `sortBy`,
  `sortOrder` filters.
- `GET /api/findings/{id}` — one finding (404 if unknown).
- `GET /api/stats/overview` — metrics, risky IPs, recent findings.
- `GET /PUT /api/alerts/settings` — alert toggles and recipient emails.

Finding fields: `finding_id`, `timestamp`, `event_type`, `severity`
(Critical/High/Medium/Low), `user_or_role`, `source_ip`, `region`,
`description`, `status` (open/reviewed/resolved).

## Layout

- `function_app.py` — blob triggers + HTTP routes.
- `csm/parser.py` — Activity Log parsing.
- `csm/rules.py` — the 7 detection rules.
- `csm/store.py` — Table Storage findings.
- `csm/emailer.py` — Resend email alerts.
- `csm/api.py` — findings mapping, filters, stats, alert settings.
- `tests/` — 32 tests (emailer + API).

## Configuration (app settings in Azure, never committed here)

- `RESEND_API_KEY` — Resend API key (set in the Function App).
- `ALERT_TO_EMAIL` — alert recipient email.

`.env` files are never committed to this repo.
