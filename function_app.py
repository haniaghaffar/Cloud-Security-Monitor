"""Azure Functions v2 app for Cloud Security Monitor (CSM).

Blob triggers (detection pipeline):
- csm_blob_processor: watches the `logs` container.
- csm_blob_processor_live: watches the `insights-activity-logs`
  container (live Activity Log exports).

HTTP triggers (Member 2 dashboard API, route prefix /api):
- GET /api/findings, GET /api/findings/{id}
- GET /api/stats/overview
- GET /api/alerts/settings, PUT /api/alerts/settings
- GET /api/resources (ARM inventory via managed identity)

Auth: the routes run at auth_level=ANONYMOUS at the Functions
level, and this code enforces Entra ID Bearer validation itself
(see csm/auth.py) whenever ENTRA_TENANT_ID and ENTRA_AUDIENCE are
set. When those settings are absent the API stays anonymous, so
the frontend still works with its VITE_AUTH_* variables unset.
Restricted CORS is still a follow-up (currently * for the demo).
"""

import json
import logging
import os
import sys
from pathlib import Path

if "AzureWebJobsScriptRoot" in os.environ:
    sys.path.insert(0, os.environ["AzureWebJobsScriptRoot"])
sys.path.insert(0, "/home/site/wwwroot")

import azure.functions as func

try:
    from csm.parser import parse_azure_activity_log
    from csm.rules import analyze_events
    from csm.store import save_finding
    from csm.emailer import send_alert_email
    from csm import api as api_module
    from csm import auth as auth_module
    from csm import resources as resources_module
except ImportError:
    from .csm.parser import parse_azure_activity_log
    from .csm.rules import analyze_events
    from .csm.store import save_finding
    from .csm.emailer import send_alert_email
    from .csm import api as api_module
    from .csm import auth as auth_module
    from .csm import resources as resources_module

app = func.FunctionApp()


def process_blob_content(content: bytes, blob_name: str) -> int:
    """Parse one log blob, run the detection rules, save findings.

    Shared by both blob triggers so the logic exists exactly once.
    After each finding is saved, an email alert is attempted for the
    severities enabled in the saved alert settings (default
    High/Critical); a failed email is logged and never stops the
    remaining findings from being saved.

    Returns the number of findings saved.
    """
    if not content:
        logging.warning(f"Blob {blob_name} is empty. Skipping.")
        return 0

    events = parse_azure_activity_log(content)
    logging.info(f"Parsed {len(events)} events from {blob_name}.")

    findings = analyze_events(events)
    logging.info(f"Analyzed events from {blob_name}: found {len(findings)} findings.")

    email_severities = api_module.get_email_severities()

    for finding in findings:
        finding_id = save_finding(finding)
        logging.info(
            f"Saved finding {finding_id} ({finding.get('event_type')}, "
            f"severity={finding.get('severity')}) to Table Storage."
        )
        try:
            emailed_finding = dict(finding)
            emailed_finding["finding_id"] = finding_id
            send_alert_email(emailed_finding, allowed_severities=email_severities)
        except Exception as exc:
            # Email must never break the finding pipeline.
            logging.error(f"Email alert failed for finding {finding_id}: {exc}", exc_info=True)

    return len(findings)


@app.blob_trigger(arg_name="blob", path="logs/{name}", connection="AzureWebJobsStorage")
def csm_blob_processor(blob: func.InputStream):
    """
    Blob-triggered Azure Function that processes incoming log files.

    - Triggered when a new JSON blob is created in the 'logs' container.
    - Reads blob content and parses Azure Activity Log events.
    - Evaluates the 7 security detection rules on the parsed events.
    - Saves detected findings to the 'findings' Azure Table Storage table.
    - Emails an alert (via Resend) for enabled severities (default
      High/Critical).
    """
    blob_name = getattr(blob, "name", "unknown")
    logging.info(f"csm_blob_processor triggered by blob: {blob_name}")

    try:
        content = blob.read()
        process_blob_content(content, blob_name)
    except Exception as exc:
        logging.error(f"Error processing blob {blob_name}: {exc}", exc_info=True)
        raise exc


@app.blob_trigger(arg_name="blob", path="insights-activity-logs/{name}", connection="AzureWebJobsStorage")
def csm_blob_processor_live(blob: func.InputStream):
    """
    Blob-triggered Azure Function for LIVE Activity Log exports.

    - Triggered when the diagnostic setting 'csm-activitylog-to-blob'
      writes a new export blob into the 'insights-activity-logs'
      container (nested folders like
      resourceId=/SUBSCRIPTIONS/.../y=.../m=.../d=.../h=.../m=.../PT1H.json).
    - Export files use the same {"records": [...]} Activity Log shape
      the parser already handles, so no parser change is needed.
    - Runs the exact same parse -> rules -> save -> email flow as
      csm_blob_processor via the shared process_blob_content helper.
    """
    blob_name = getattr(blob, "name", "unknown")
    logging.info(f"csm_blob_processor_live triggered by blob: {blob_name}")

    try:
        content = blob.read()
        process_blob_content(content, blob_name)
    except Exception as exc:
        logging.error(f"Error processing blob {blob_name}: {exc}", exc_info=True)
        raise exc


def _json_response(payload, status_code=200):
    return func.HttpResponse(
        json.dumps(payload), mimetype="application/json", status_code=status_code
    )


def _auth_error(req):
    """Return a 401 response when Entra validation is ON and the
    request has no valid Bearer token; otherwise None (allowed).

    When ENTRA_TENANT_ID/ENTRA_AUDIENCE are unset, validation is
    off and every request is allowed (demo fallback).
    """
    if not auth_module.auth_enabled():
        return None
    header = req.headers.get("Authorization", "")
    _claims, error = auth_module.verify_token(header)
    if error is not None:
        logging.warning("API auth rejected: %s", error)
        return _json_response({"error": "Unauthorized: " + error}, status_code=401)
    return None


@app.route(route="findings", methods=["GET"], auth_level=func.AuthLevel.ANONYMOUS)
def get_findings(req: func.HttpRequest):
    """GET /api/findings — paginated, filterable finding list."""
    denied = _auth_error(req)
    if denied is not None:
        return denied
    try:
        params = dict(req.params)
        findings = api_module.load_findings()
        findings = api_module.apply_filters(findings, params)
        findings = api_module.sort_findings(
            findings, params.get("sortBy"), params.get("sortOrder")
        )
        page_items, total, page, page_size, total_pages = api_module.paginate(
            findings, params.get("page"), params.get("pageSize")
        )
        return _json_response(
            {
                "data": page_items,
                "total": total,
                "page": page,
                "pageSize": page_size,
                "totalPages": total_pages,
            }
        )
    except Exception as exc:
        logging.error(f"get_findings failed: {exc}", exc_info=True)
        return _json_response({"error": "Failed to load findings."}, status_code=500)


@app.route(route="findings/{id}", methods=["GET"], auth_level=func.AuthLevel.ANONYMOUS)
def get_finding_by_id(req: func.HttpRequest):
    """GET /api/findings/{id} — one finding, or 404."""
    denied = _auth_error(req)
    if denied is not None:
        return denied
    try:
        finding_id = req.route_params.get("id", "")
        for finding in api_module.load_findings():
            if finding["finding_id"] == finding_id:
                return _json_response(finding)
        return _json_response({"error": "Finding not found."}, status_code=404)
    except Exception as exc:
        logging.error(f"get_finding_by_id failed: {exc}", exc_info=True)
        return _json_response({"error": "Failed to load finding."}, status_code=500)


@app.route(route="stats/overview", methods=["GET"], auth_level=func.AuthLevel.ANONYMOUS)
def get_stats_overview(req: func.HttpRequest):
    """GET /api/stats/overview — dashboard metrics, risky IPs, recent findings."""
    denied = _auth_error(req)
    if denied is not None:
        return denied
    try:
        findings = api_module.load_findings()
        return _json_response(api_module.compute_stats(findings))
    except Exception as exc:
        logging.error(f"get_stats_overview failed: {exc}", exc_info=True)
        return _json_response({"error": "Failed to load stats."}, status_code=500)


@app.route(route="alerts/settings", methods=["GET"], auth_level=func.AuthLevel.ANONYMOUS)
def get_alert_settings_http(req: func.HttpRequest):
    """GET /api/alerts/settings — saved alert preferences or defaults."""
    denied = _auth_error(req)
    if denied is not None:
        return denied
    try:
        return _json_response(api_module.get_alert_settings())
    except Exception as exc:
        logging.error(f"get_alert_settings failed: {exc}", exc_info=True)
        return _json_response({"error": "Failed to load alert settings."}, status_code=500)


@app.route(route="alerts/settings", methods=["PUT"], auth_level=func.AuthLevel.ANONYMOUS)
def update_alert_settings_http(req: func.HttpRequest):
    """PUT /api/alerts/settings — validate and save alert preferences."""
    denied = _auth_error(req)
    if denied is not None:
        return denied
    try:
        prefs = req.get_json()
    except ValueError:
        return _json_response({"error": "Request body must be valid JSON."}, status_code=400)
    if not isinstance(prefs, dict):
        return _json_response({"error": "Request body must be a JSON object."}, status_code=400)
    try:
        saved = api_module.save_alert_settings(prefs)
    except ValueError as exc:
        return _json_response({"error": str(exc)}, status_code=400)
    except Exception as exc:
        logging.error(f"update_alert_settings failed: {exc}", exc_info=True)
        return _json_response({"error": "Failed to save alert settings."}, status_code=500)
    return _json_response(saved)


@app.route(route="resources", methods=["GET"], auth_level=func.AuthLevel.ANONYMOUS)
def get_resources(req: func.HttpRequest):
    """GET /api/resources — Azure resources via managed identity + ARM."""
    denied = _auth_error(req)
    if denied is not None:
        return denied
    try:
        return _json_response(resources_module.list_resources())
    except RuntimeError as exc:
        # Missing subscription/identity config is not a code bug, so
        # report it plainly instead of a generic 500.
        logging.error("get_resources unavailable: %s", exc)
        return _json_response({"error": str(exc)}, status_code=503)
    except Exception as exc:
        logging.error(f"get_resources failed: {exc}", exc_info=True)
        return _json_response({"error": "Failed to load resources."}, status_code=502)
