"""Security detection rules for parsed CloudTrail events."""

from typing import Any, Dict, List, Optional, Set


def check_event(event: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """
    Evaluates a single parsed CloudTrail event against detection rules.

    Expected event fields:
    - event_time
    - event_name
    - user
    - source_ip
    - region
    - error_code

    Returns:
        A finding dictionary if the event is dangerous, otherwise None.
        Finding format:
        {
            "event_type": ...,
            "severity": ...,
            "user": ...,
            "source_ip": ...,
            "region": ...,
            "event_time": ...,
            "description": ...
        }
    """
    if not isinstance(event, dict):
        return None

    user = event.get("user")
    event_name = event.get("event_name")

    # Rule 1: RootAccountUsage (Critical) - when user is "root"
    if user and str(user).lower() == "root":
        return {
            "event_type": "RootAccountUsage",
            "severity": "Critical",
            "user": user,
            "source_ip": event.get("source_ip"),
            "region": event.get("region"),
            "event_time": event.get("event_time"),
            "description": f"Root account activity detected for action '{event_name}'.",
        }

    # Rule 2: CloudTrailDisabled (Critical) - when event_name is "StopLogging" or "DeleteTrail"
    if event_name in ("StopLogging", "DeleteTrail"):
        return {
            "event_type": "CloudTrailDisabled",
            "severity": "Critical",
            "user": user,
            "source_ip": event.get("source_ip"),
            "region": event.get("region"),
            "event_time": event.get("event_time"),
            "description": f"CloudTrail logging tampering detected: {event_name}.",
        }

    # Rule 3: PublicS3Bucket (High) - when event_name is "PutBucketAcl" or "PutBucketPolicy"
    if event_name in ("PutBucketAcl", "PutBucketPolicy"):
        return {
            "event_type": "PublicS3Bucket",
            "severity": "High",
            "user": user,
            "source_ip": event.get("source_ip"),
            "region": event.get("region"),
            "event_time": event.get("event_time"),
            "description": f"Potential public S3 bucket exposure detected: {event_name}.",
        }

    # Rule 4: PublicSecurityGroup (High) - when event_name is "AuthorizeSecurityGroupIngress"
    if event_name == "AuthorizeSecurityGroupIngress":
        return {
            "event_type": "PublicSecurityGroup",
            "severity": "High",
            "user": user,
            "source_ip": event.get("source_ip"),
            "region": event.get("region"),
            "event_time": event.get("event_time"),
            "description": f"Security group ingress rule modification detected: {event_name}.",
        }

    # Rule 5: IAMPolicyChange (High) - when event_name is "AttachUserPolicy", "PutUserPolicy", "AttachRolePolicy", or "CreateUser"
    if event_name in ("AttachUserPolicy", "PutUserPolicy", "AttachRolePolicy", "CreateUser"):
        return {
            "event_type": "IAMPolicyChange",
            "severity": "High",
            "user": user,
            "source_ip": event.get("source_ip"),
            "region": event.get("region"),
            "event_time": event.get("event_time"),
            "description": f"IAM privilege modification or user creation detected: {event_name}.",
        }

    return None


def analyze_events(events: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Analyzes a list of parsed CloudTrail events and returns a list of findings.

    Features:
    1. Runs check_event on every event and collects individual findings.
    2. Rule 6 (BruteForceLogin, High): Groups failed ConsoleLogin events (error_code is not None)
       by user. If a user has 5 or more failed logins, adds ONE finding for that user.
    3. Rule 7 (NewRegionLogin, Medium): Tracks regions per user in order. The first region seen
       for a user is normal (no finding). If a later successful ConsoleLogin of the same user
       comes from a different region, adds ONE finding per new region.
    """
    if not events or not isinstance(events, list):
        return []

    findings: List[Dict[str, Any]] = []
    failed_logins_by_user: Dict[str, List[Dict[str, Any]]] = {}
    seen_regions_by_user: Dict[str, Set[str]] = {}

    for event in events:
        if not isinstance(event, dict):
            continue

        # Run check_event on every event
        individual_finding = check_event(event)
        if individual_finding:
            findings.append(individual_finding)

        user = event.get("user")
        event_name = event.get("event_name")
        error_code = event.get("error_code")
        region = event.get("region")

        if not user:
            continue

        # Rule 6 collection: failed ConsoleLogin events (error_code is not None)
        if event_name == "ConsoleLogin" and error_code is not None:
            failed_logins_by_user.setdefault(user, []).append(event)

        # Rule 7: NewRegionLogin
        # Track regions per user in order.
        # First region seen for a user is normal (no finding).
        # Later successful ConsoleLogin from a different region adds ONE finding per new region.
        if region and error_code is None:
            if user not in seen_regions_by_user:
                seen_regions_by_user[user] = {region}
            elif event_name == "ConsoleLogin" and region not in seen_regions_by_user[user]:
                seen_regions_by_user[user].add(region)
                findings.append({
                    "event_type": "NewRegionLogin",
                    "severity": "Medium",
                    "user": user,
                    "source_ip": event.get("source_ip"),
                    "region": region,
                    "event_time": event.get("event_time"),
                    "description": f"ConsoleLogin detected from new region '{region}' for user '{user}'.",
                })
            else:
                seen_regions_by_user[user].add(region)

    # Rule 6 evaluation: 5 or more failed logins for a user triggers ONE finding
    for user, failed_events in failed_logins_by_user.items():
        if len(failed_events) >= 5:
            last_event = failed_events[-1]
            findings.append({
                "event_type": "BruteForceLogin",
                "severity": "High",
                "user": user,
                "source_ip": last_event.get("source_ip"),
                "region": last_event.get("region"),
                "event_time": last_event.get("event_time"),
                "description": f"Potential brute force attack: {len(failed_events)} failed ConsoleLogin attempts detected for user '{user}'.",
            })

    return findings
