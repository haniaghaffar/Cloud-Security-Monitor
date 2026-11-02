"""Send email alerts for High/Critical findings via the Resend REST API.

Uses plain ``requests`` (already vendored in .python_packages as a
dependency of the Azure SDKs), so no new package is needed in the
deploy zip. The sender is Resend's sandbox address
``onboarding@resend.dev`` — no sending-domain verification is needed,
and sandbox mail is delivered to the account's verified email address
(the user's own Gmail).

Configuration comes only from environment variables (Function App
settings in Azure; never hardcoded):
- ``RESEND_API_KEY`` — API key from the Resend dashboard.
- ``ALERT_TO_EMAIL`` — recipient, the user's verified Gmail address.

Only High/Critical findings are emailed. Medium/Low findings, a
missing API key/recipient, an HTTP error, or a network failure all
return False and never raise — a failed email must never break the
finding pipeline.
"""

import logging
import os
from typing import Any, Callable, Dict, Optional

import requests

RESEND_API_URL = "https://api.resend.com/emails"
# Resend sandbox sender. No custom domain is verified for this project.
RESEND_FROM_EMAIL = "onboarding@resend.dev"
ALERT_SEVERITIES = ("High", "Critical")


def send_alert_email(
    finding: Dict[str, Any],
    http_post: Optional[Callable] = None,
    allowed_severities: Optional[tuple] = None,
) -> bool:
    """Send one alert email for a finding. Returns True if sent.

    ``http_post`` is an injectable ``requests.post``-compatible callable
    (used by tests to avoid real HTTP calls). ``allowed_severities``
    overrides the default High/Critical set (used by the dashboard
    alert-preference settings); None means the default.
    """
    severity = finding.get("severity")
    if severity not in (allowed_severities or ALERT_SEVERITIES):
        return False

    api_key = os.environ.get("RESEND_API_KEY")
    to_email = os.environ.get("ALERT_TO_EMAIL")
    if not api_key or not to_email:
        logging.warning("send_alert_email: RESEND_API_KEY or ALERT_TO_EMAIL is not set; skipping email.")
        return False

    subject = "[%s] %s detected" % (severity, finding.get("event_type"))
    user = finding.get("user") or finding.get("user_or_role") or ""
    timestamp = finding.get("timestamp") or finding.get("event_time") or ""
    body_lines = [
        "Cloud Security Monitor alert",
        "",
        "Event type: %s" % finding.get("event_type"),
        "Severity: %s" % severity,
        "Finding ID: %s" % finding.get("finding_id"),
        "User / role: %s" % user,
        "Source IP: %s" % finding.get("source_ip"),
        "Region: %s" % finding.get("region"),
        "Timestamp: %s" % timestamp,
        "",
        "Description: %s" % finding.get("description"),
    ]
    if finding.get("country"):
        body_lines.append("Country: %s" % finding.get("country"))
    if finding.get("recommended_action"):
        body_lines += ["", "Recommended action: %s" % finding.get("recommended_action")]
    payload = {
        "from": RESEND_FROM_EMAIL,
        "to": [to_email],
        "subject": subject,
        "text": "\n".join(body_lines),
    }

    post = http_post or requests.post
    try:
        response = post(
            RESEND_API_URL,
            headers={
                "Authorization": "Bearer %s" % api_key,
                "Content-Type": "application/json",
            },
            json=payload,
            timeout=15,
        )
    except Exception as exc:  # network failure, timeout, DNS, ...
        logging.error("send_alert_email: request failed for %s: %s", finding.get("finding_id"), exc)
        return False

    status = getattr(response, "status_code", None)
    if status in (200, 201):
        logging.info("send_alert_email: sent %s alert for %s", severity, finding.get("finding_id"))
        return True

    logging.error(
        "send_alert_email: Resend returned status %s for %s: %s",
        status,
        finding.get("finding_id"),
        getattr(response, "text", "")[:500],
    )
    return False
