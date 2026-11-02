"""HTTP API logic for the Member 2 dashboard (pure functions).

The frontend (React dashboard in ~/workspace/csm-frontend) expects a
REST API under VITE_API_BASE_URL. Its parsers are strict, so this
module produces exactly the shapes they accept:

- GET /findings -> {"data": [...], "total", "page", "pageSize",
  "totalPages"}; filters: search, severity, eventType, status,
  dateRange (TODAY/7DAYS/30DAYS), page, pageSize, sortBy, sortOrder.
- GET /findings/{id} -> one finding, or None (caller maps to 404).
- GET /stats/overview -> {"metrics": {...}, "riskyIps": [...],
  "recentFindings": [...]}.
- GET/PUT /alerts/settings -> {"critical","high","medium","low",
  "recipientEmails","notifyOnResolution","lastSavedAt"}.

Field mapping notes (the findings table schema differs from the
frontend schema in one place):
- The table stores `user`; the frontend requires `user_or_role`, so
  the API maps user -> user_or_role.
- The table stores `timestamp` (set from event_time by store.py); if
  it is missing, the API falls back to event_time, then to the Table
  Storage system Timestamp (the real write time), and only skips the
  row if none of those exist.
- Missing source_ip/region/user render as "unknown" (a display
  fallback, not a severity change). Rows with a missing or invalid
  severity are skipped and logged, because guessing a severity would
  be worse than hiding the row.

Scale note: the table is read in full and filtered in Python. That is
fine for a course demo (10 rows) but must move to OData filters
before it ever holds a large table.

Auth note: the v1 API is anonymous (auth_level=ANONYMOUS) for the
demo. The frontend works without Entra login when its VITE_AUTH_*
variables are unset (its route guard and token logic both no-op).
Adding Entra token validation + restricted CORS is the hardening
follow-up; it is NOT done here.
"""

import logging
import math
import os
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional, Tuple

try:
    from azure.core.exceptions import ResourceExistsError, ResourceNotFoundError
    from azure.data.tables import TableClient
except ImportError:  # pragma: no cover - azure SDK always present on host
    TableClient = None  # type: ignore
    ResourceExistsError = Exception  # type: ignore
    ResourceNotFoundError = Exception  # type: ignore

SEVERITIES = ("Critical", "High", "Medium", "Low")
SEVERITY_RANK = {"Critical": 3, "High": 2, "Medium": 1, "Low": 0}
STATUSES = ("open", "reviewed", "resolved")
FINDINGS_TABLE = "findings"
SETTINGS_TABLE = "alertsettings"
DEFAULT_EMAIL_SEVERITIES = ("High", "Critical")
SORTABLE_FIELDS = (
    "timestamp",
    "severity",
    "event_type",
    "status",
    "source_ip",
    "region",
    "finding_id",
)


def parse_timestamp(value: Any) -> Optional[datetime]:
    """Parse an ISO timestamp string (or datetime) to an aware datetime."""
    if isinstance(value, datetime):
        return value if value.tzinfo else value.replace(tzinfo=timezone.utc)
    if not isinstance(value, str) or not value.strip():
        return None
    try:
        parsed = datetime.fromisoformat(value.strip().replace("Z", "+00:00"))
    except ValueError:
        return None
    return parsed if parsed.tzinfo else parsed.replace(tzinfo=timezone.utc)


def format_timestamp(value: datetime) -> str:
    return value.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def map_finding(entity: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Map one Table Storage entity to the frontend finding schema.

    Returns None when the row cannot satisfy the frontend's required
    fields (missing/invalid severity); the caller skips such rows.
    """
    severity = entity.get("severity")
    if severity not in SEVERITIES:
        logging.warning("api.map_finding: skipping row with invalid severity: %r", entity.get("finding_id"))
        return None

    status = entity.get("status") or "open"
    if status not in STATUSES:
        status = "open"

    timestamp = parse_timestamp(entity.get("timestamp")) or parse_timestamp(entity.get("event_time"))
    if timestamp is None:
        # Table Storage's own system Timestamp is the real write time.
        timestamp = parse_timestamp(entity.get("Timestamp"))
    if timestamp is None:
        logging.warning("api.map_finding: skipping row with no timestamp: %r", entity.get("finding_id"))
        return None

    finding = {
        "finding_id": str(entity.get("finding_id") or entity.get("RowKey") or ""),
        "timestamp": format_timestamp(timestamp),
        "event_type": str(entity.get("event_type") or ""),
        "severity": severity,
        "user_or_role": str(entity.get("user_or_role") or entity.get("user") or "unknown"),
        "source_ip": str(entity.get("source_ip") or "unknown"),
        "region": str(entity.get("region") or "unknown"),
        "description": str(entity.get("description") or ""),
        "status": status,
    }
    if not finding["finding_id"] or not finding["event_type"] or not finding["description"]:
        logging.warning("api.map_finding: skipping incomplete row: %r", entity.get("finding_id"))
        return None
    if entity.get("country"):
        finding["country"] = str(entity["country"])
    if entity.get("recommended_action"):
        finding["recommended_action"] = entity["recommended_action"]
    return finding


def _table_client(table_name: str, connection_string: Optional[str] = None) -> Any:
    conn_str = connection_string or os.environ.get("AzureWebJobsStorage")
    if not conn_str:
        raise ValueError("AzureWebJobsStorage connection string is not set.")
    if TableClient is None:
        raise ImportError("azure-data-tables is required to read the findings table.")
    return TableClient.from_connection_string(conn_str=conn_str, table_name=table_name)


def load_findings(table_client: Optional[Any] = None) -> List[Dict[str, Any]]:
    """Load and map every finding row (skipping unmappable rows)."""
    if table_client is None:
        table_client = _table_client(FINDINGS_TABLE)
    try:
        entities = list(table_client.list_entities())
    except ResourceNotFoundError:
        return []
    findings = []
    for entity in entities:
        mapped = map_finding(dict(entity))
        if mapped is not None:
            findings.append(mapped)
    return findings


def apply_filters(findings: List[Dict[str, Any]], params: Dict[str, str]) -> List[Dict[str, Any]]:
    """Filter findings by the frontend's query parameters."""
    severity = params.get("severity")
    event_type = params.get("eventType")
    status = params.get("status")
    search = (params.get("search") or "").strip().lower()
    date_range = params.get("dateRange")

    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)

    result = []
    for finding in findings:
        if severity and finding["severity"] != severity:
            continue
        if event_type and finding["event_type"] != event_type:
            continue
        if status and finding["status"] != status:
            continue
        if search:
            haystack = " ".join(
                [
                    finding["finding_id"],
                    finding["source_ip"],
                    finding["user_or_role"],
                    finding["region"],
                    finding["description"],
                    finding["event_type"],
                ]
            ).lower()
            if search not in haystack:
                continue
        if date_range:
            ts = parse_timestamp(finding["timestamp"])
            if ts is None:
                continue
            if date_range == "TODAY" and ts < today_start:
                continue
            if date_range == "7DAYS" and ts < now - timedelta(days=7):
                continue
            if date_range == "30DAYS" and ts < now - timedelta(days=30):
                continue
        result.append(finding)
    return result


def sort_findings(
    findings: List[Dict[str, Any]], sort_by: Optional[str], sort_order: Optional[str]
) -> List[Dict[str, Any]]:
    """Sort findings. Default: newest first (timestamp desc)."""
    field = sort_by if sort_by in SORTABLE_FIELDS else "timestamp"
    reverse = True if sort_order is None else sort_order.lower() == "desc"

    def key_fn(finding: Dict[str, Any]) -> Any:
        value = finding[field]
        if field == "severity":
            return SEVERITY_RANK[value]
        if field == "timestamp":
            return parse_timestamp(value) or datetime.min.replace(tzinfo=timezone.utc)
        return value

    # finding_id as a tiebreaker keeps pagination stable.
    ordered = sorted(findings, key=lambda f: f["finding_id"])
    return sorted(ordered, key=key_fn, reverse=reverse)


def paginate(
    findings: List[Dict[str, Any]], page: Any, page_size: Any
) -> Tuple[List[Dict[str, Any]], int, int, int, int]:
    """Return (page_items, total, page, page_size, total_pages)."""
    try:
        page = int(page)
    except (TypeError, ValueError):
        page = 1
    try:
        page_size = int(page_size)
    except (TypeError, ValueError):
        page_size = 50
    page = max(1, page)
    page_size = min(100, max(1, page_size))
    total = len(findings)
    total_pages = max(1, math.ceil(total / page_size))
    start = (page - 1) * page_size
    return findings[start : start + page_size], total, page, page_size, total_pages


def compute_stats(findings: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Build the /stats/overview payload from mapped findings."""
    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)

    severity_counts = {sev: 0 for sev in SEVERITIES}
    status_counts = {st: 0 for st in STATUSES}
    threats_today = 0
    for finding in findings:
        severity_counts[finding["severity"]] += 1
        status_counts[finding["status"]] += 1
        ts = parse_timestamp(finding["timestamp"])
        if ts is not None and ts >= today_start:
            threats_today += 1

    # Risky IPs: group by source_ip (excluding the "unknown" fallback).
    by_ip: Dict[str, Dict[str, Any]] = {}
    for finding in findings:
        ip = finding["source_ip"]
        if ip == "unknown":
            continue
        entry = by_ip.setdefault(
            ip,
            {"ip": ip, "count": 0, "highestSeverity": "Low", "associatedEvents": set(), "lastSeen": ""},
        )
        entry["count"] += 1
        if SEVERITY_RANK[finding["severity"]] > SEVERITY_RANK[entry["highestSeverity"]]:
            entry["highestSeverity"] = finding["severity"]
        entry["associatedEvents"].add(finding["event_type"])
        if finding["timestamp"] > entry["lastSeen"]:
            entry["lastSeen"] = finding["timestamp"]
    risky_ips = [
        {
            "ip": entry["ip"],
            "count": entry["count"],
            "highestSeverity": entry["highestSeverity"],
            "associatedEvents": sorted(entry["associatedEvents"]),
            "lastSeen": entry["lastSeen"],
        }
        for entry in sorted(by_ip.values(), key=lambda e: (-e["count"], e["ip"]))
    ]

    recent = sort_findings(findings, "timestamp", "desc")[:10]

    return {
        "metrics": {
            # totalEvents counts findings recorded; raw event counts
            # are not stored by the pipeline (see module docstring).
            "totalEvents": len(findings),
            "threatsDetectedToday": threats_today,
            "openIncidents": status_counts["open"],
            "criticalFindings": severity_counts["Critical"],
            "reviewedIncidents": status_counts["reviewed"],
            "resolvedIncidents": status_counts["resolved"],
            "severityCounts": severity_counts,
            "statusCounts": status_counts,
        },
        "riskyIps": risky_ips,
        "recentFindings": recent,
    }


def default_alert_settings() -> Dict[str, Any]:
    return {
        "critical": True,
        "high": True,
        "medium": False,
        "low": False,
        "recipientEmails": os.environ.get("ALERT_TO_EMAIL", ""),
        "notifyOnResolution": True,
    }


def get_alert_settings(table_client: Optional[Any] = None) -> Dict[str, Any]:
    """Read the alert-preference row, or defaults when none is saved."""
    if table_client is None:
        table_client = _table_client(SETTINGS_TABLE)
    try:
        entity = table_client.get_entity(partition_key="settings", row_key="default")
    except ResourceNotFoundError:
        return default_alert_settings()
    except Exception:
        return default_alert_settings()
    settings = default_alert_settings()
    for key in ("critical", "high", "medium", "low", "notifyOnResolution"):
        if isinstance(entity.get(key), bool):
            settings[key] = entity[key]
    if isinstance(entity.get("recipientEmails"), str):
        settings["recipientEmails"] = entity["recipientEmails"]
    if entity.get("lastSavedAt"):
        settings["lastSavedAt"] = str(entity["lastSavedAt"])
    return settings


def save_alert_settings(prefs: Dict[str, Any], table_client: Optional[Any] = None) -> Dict[str, Any]:
    """Validate and save alert preferences. Raises ValueError on bad input."""
    for key in ("critical", "high", "medium", "low", "notifyOnResolution"):
        if not isinstance(prefs.get(key), bool):
            raise ValueError("alert settings.%s must be a boolean" % key)
    if not isinstance(prefs.get("recipientEmails"), str):
        raise ValueError("alert settings.recipientEmails must be a string")
    if table_client is None:
        table_client = _table_client(SETTINGS_TABLE)
        try:
            table_client.create_table()
        except ResourceExistsError:
            pass
        except Exception:
            pass
    now = format_timestamp(datetime.now(timezone.utc))
    entity = {
        "PartitionKey": "settings",
        "RowKey": "default",
        "critical": prefs["critical"],
        "high": prefs["high"],
        "medium": prefs["medium"],
        "low": prefs["low"],
        "recipientEmails": prefs["recipientEmails"],
        "notifyOnResolution": prefs["notifyOnResolution"],
        "lastSavedAt": now,
    }
    if hasattr(table_client, "upsert_entity"):
        table_client.upsert_entity(entity=entity)
    elif hasattr(table_client, "create_entity"):
        table_client.create_entity(entity=entity)
    else:
        raise AttributeError("table_client does not support upsert_entity or create_entity")
    saved = dict(prefs)
    saved["lastSavedAt"] = now
    return saved


def get_email_severities(table_client: Optional[Any] = None) -> Tuple[str, ...]:
    """Severities that trigger an email, from saved settings.

    Any failure reading settings falls back to the proven default
    (High/Critical) so a settings problem can never silence alerts
    or break the finding pipeline.
    """
    try:
        settings = get_alert_settings(table_client)
    except Exception as exc:
        logging.warning("api.get_email_severities: settings read failed, using default: %s", exc)
        return tuple(sev for sev in SEVERITIES if sev in DEFAULT_EMAIL_SEVERITIES)
    allowed = tuple(sev for sev in SEVERITIES if settings.get(sev.lower()))
    return allowed or tuple(sev for sev in SEVERITIES if sev in DEFAULT_EMAIL_SEVERITIES)
