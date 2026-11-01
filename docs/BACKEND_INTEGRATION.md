# Backend Integration Contract (Proposed)

The frontend is intended to consume Member 1's Microsoft Azure backend. The backend implementation and its contract were not available during this review. **Every route, field, and response shape below is a proposed frontend expectation that Member 1 must confirm or revise; it is not evidence that an API exists or is deployed.**

No backend, database, Entra application, Azure resource inventory API, or mock data is implemented by this frontend. A configured API URL is not a health check, and the UI must not be treated as evidence that the backend is reachable.

## Configuration and authentication

| Variable | Purpose | Requirement |
| --- | --- | --- |
| `VITE_API_BASE_URL` | HTTPS base URL for Member 1's API (including any common path prefix, such as `/api`). | Required for API calls; production deployment requires an actual HTTPS URL. |
| `VITE_AUTH_CLIENT_ID` | Public SPA application/client ID. | Required for configured Entra sign-in. |
| `VITE_AUTH_TENANT_ID` | Entra tenant/directory ID. | Required for configured Entra sign-in. |
| `VITE_AUTH_API_SCOPE` | Delegated scope exposed by the backend API, for example `api://<backend-app-id>/<scope-name>`. | Required for sign-in and API access. Member 1 must supply the exact scope. |
| `VITE_AUTH_REDIRECT_URI` | Registered SPA redirect URI. | Optional; defaults to the current origin. |

These are public Vite build-time settings, embedded in frontend assets. Do not put client secrets, access tokens, or other credentials in them. The browser requests only the backend's delegated API scope; it does not request Microsoft Graph `User.Read`. The API client should attach an Entra bearer token only to requests to the configured backend origin. Authentication remains incomplete until the backend API registration, delegated permission, consent, and frontend SPA redirect URIs are configured.

When auth variables are absent, sign-in is unavailable and the frontend does not fabricate a user or token. API operations still require a configured backend URL and valid responses. The backend must enforce authorization independently; frontend route guards are not an authorization boundary.

The backend must enable CORS for the exact local development origin and deployed Static Web App origin, allow the required methods and headers (including `Authorization` and `Content-Type`), and validate the access token's issuer, audience, tenant, and delegated permissions. Member 1 must confirm the API audience and authorization policy.

## Proposed endpoints and schemas

The current frontend expects the routes below, relative to `VITE_API_BASE_URL`. Confirm the paths, field names, status codes, filtering semantics, and pagination model with Member 1 before integration. The parsers reject malformed responses rather than substituting fabricated values.

### Findings list — proposed `GET /findings`

Proposed query parameters:

| Parameter | Meaning |
| --- | --- |
| `search` | Optional text search. Expected to cover finding ID, IP, principal, region, and description. |
| `severity` | Optional `Critical`, `High`, `Medium`, or `Low`. |
| `eventType` | Optional backend event/rule type. |
| `status` | Optional `open`, `reviewed`, or `resolved`. |
| `dateRange` | Optional `TODAY`, `7DAYS`, or `30DAYS`. |
| `page`, `pageSize` | One-based page and positive page size. |
| `sortBy`, `sortOrder` | Optional sort field and `asc`/`desc` order, if supported. |

Expected response: an object containing `data` (or `findings`/`value`) and non-negative integer `total`, `page`, and `pageSize`. `totalPages` may be included and, if present, must equal `max(1, ceil(total / pageSize))`.

```json
{
  "data": [
    {
      "finding_id": "backend-generated-id",
      "timestamp": "2026-01-15T14:32:00Z",
      "event_type": "backend-defined-event-type",
      "severity": "High",
      "user_or_role": "principal identifier",
      "source_ip": "203.0.113.10",
      "region": "eastus",
      "description": "Backend-provided finding description",
      "status": "open"
    }
  ],
  "total": 1,
  "page": 1,
  "pageSize": 50,
  "totalPages": 1
}
```

Each finding must have a non-empty ID, parseable timestamp, event type, supported severity and status, principal, source IP, region, and description. Optional fields accepted by the frontend include `country`, `source`, `resource`, `account_id`, `rule_id`, `reason_flagged`, `recommended_action` (string or string array), and `raw_event` (object). Member 1 should confirm which fields are available and whether potentially sensitive raw events may be sent to a browser.

### Finding detail — proposed `GET /findings/{id}`

Expected to return one finding with the same required schema as the list. A confirmed `404` is interpreted as not found. The ID is URL-encoded by the frontend.

### Dashboard summary — proposed `GET /stats/overview`

Expected response:

```json
{
  "metrics": {
    "totalEvents": 0,
    "threatsDetectedToday": 0,
    "openIncidents": 0,
    "criticalFindings": 0,
    "reviewedIncidents": 0,
    "resolvedIncidents": 0,
    "severityCounts": { "Critical": 0, "High": 0, "Medium": 0, "Low": 0 },
    "statusCounts": { "open": 0, "reviewed": 0, "resolved": 0 }
  },
  "riskyIps": [],
  "recentFindings": []
}
```

All metric values and counts must be non-negative integers. Each `riskyIps` item is expected to contain `ip`, non-negative `count`, supported `highestSeverity`, string-array `associatedEvents`, and parseable `lastSeen`; `location` and `country` are optional. `recentFindings` items use the finding schema above. The frontend does **not** substitute computed zero metrics when this endpoint is missing or malformed. Member 1 must confirm the metric definitions and whether this summary endpoint will be available.

### Alert preferences — proposed `GET /alerts/settings` and `PUT /alerts/settings`

Expected request and response shape:

```json
{
  "critical": true,
  "high": true,
  "medium": false,
  "low": false,
  "recipientEmails": "secops@example.org",
  "notifyOnResolution": true,
  "lastSavedAt": "2026-01-15T15:00:00Z"
}
```

The five preference flags must be booleans and `recipientEmails` a string. `lastSavedAt` is optional and, if present, must be a parseable timestamp. The frontend validates comma-separated email addresses before sending a `PUT`; Member 1 must confirm whether these settings exist and which authorization roles can update them.

### Reports

There is no separate report endpoint in the frontend. Reports request every page from the proposed findings-list endpoint with a page size of 100 and apply selected filters. Responses must provide stable totals and correct page numbers throughout the sequence; the frontend reports an error if pages are missing or totals change during the read. Member 1 must confirm that this page size and consistent-pagination behavior are supported.

### Resource inventory

No resource inventory endpoint or resource schema has been agreed. The Resources page intentionally displays an unavailable state rather than inventing resource IDs or health status. Do not integrate it until Member 1 supplies and confirms an API contract.

## Integration checklist for Member 1

Before production use, confirm:

1. API base URL, route prefix, endpoint paths, supported methods, and error response format.
2. The delegated API scope, token audience/issuer expectations, required roles or permissions, and consent process.
3. Finding required/optional fields, enum values, date filtering, search, sorting, page limits, and stable pagination.
4. Dashboard metric definitions and whether the summary and alert-preference endpoints will be implemented.
5. CORS origins, request headers, and safe exposure of any raw event data.
6. Whether a resource inventory API will be provided.

Until these items are confirmed and the real environment values are configured, production API integration and Entra authentication remain unverified.
