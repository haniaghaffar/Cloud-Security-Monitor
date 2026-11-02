"""Log parser module for CloudTrail and Azure Activity Log events."""

import gzip
import json
from pathlib import Path
from typing import Any, Dict, List, Optional, Union

# Mapping Azure operations to internal canonical event names used by detection rules
AZURE_OPERATION_MAP = {
    # RBAC / IAM (Rule 5: AttachUserPolicy, PutUserPolicy, AttachRolePolicy, CreateUser)
    "microsoft.authorization/roleassignments/write": "AttachRolePolicy",
    "microsoft.authorization/roleassignments/delete": "PutUserPolicy",
    "microsoft.authorization/roledefinitions/write": "PutUserPolicy",
    "microsoft.authorization/roledefinitions/delete": "PutUserPolicy",
    "microsoft.aad/users/create": "CreateUser",
    "microsoft.aad/users/write": "CreateUser",
    "attachuserpolicy": "AttachUserPolicy",
    "putuserpolicy": "PutUserPolicy",
    "attachrolepolicy": "AttachRolePolicy",
    "createuser": "CreateUser",
    # Public storage / bucket policy (Rule 3: PutBucketAcl, PutBucketPolicy)
    "microsoft.storage/storageaccounts/blobservices/containers/write": "PutBucketPolicy",
    "microsoft.storage/storageaccounts/blobservices/containers/setblobserviceproperties": "PutBucketPolicy",
    "microsoft.storage/storageaccounts/blobservices/containers/blobs/write": "PutBucketAcl",
    "putbucketacl": "PutBucketAcl",
    "putbucketpolicy": "PutBucketPolicy",
    # Network / Security group ingress (Rule 4: AuthorizeSecurityGroupIngress)
    "microsoft.network/networksecuritygroups/securityrules/write": "AuthorizeSecurityGroupIngress",
    "microsoft.network/networksecuritygroups/write": "AuthorizeSecurityGroupIngress",
    "authorizesecuritygroupingress": "AuthorizeSecurityGroupIngress",
    # Diagnostics / Logging disabled (Rule 2: StopLogging, DeleteTrail)
    "microsoft.insights/diagnosticsettings/delete": "StopLogging",
    "microsoft.insights/components/delete": "DeleteTrail",
    "microsoft.insights/actiongroups/delete": "StopLogging",
    "stoplogging": "StopLogging",
    "deletetrail": "DeleteTrail",
    # Sign-in / ConsoleLogin (Rule 6: BruteForceLogin, Rule 7: NewRegionLogin)
    "microsoft.azureactivedirectory/signins": "ConsoleLogin",
    "sign-in activity": "ConsoleLogin",
    "signin": "ConsoleLogin",
    "userlogin": "ConsoleLogin",
    "login": "ConsoleLogin",
    "consolelogin": "ConsoleLogin",
}


def _extract_user(record: Dict[str, Any]) -> Optional[str]:
    """Extract user identifier from CloudTrail record userIdentity."""
    user_identity = record.get("userIdentity")
    if isinstance(user_identity, dict):
        if user_identity.get("userName"):
            return user_identity["userName"]
        if user_identity.get("type") == "Root":
            return "root"
        session_context = user_identity.get("sessionContext")
        if isinstance(session_context, dict):
            session_issuer = session_context.get("sessionIssuer")
            if isinstance(session_issuer, dict) and session_issuer.get("userName"):
                return session_issuer["userName"]
        arn = user_identity.get("arn")
        if arn:
            if arn.endswith(":root"):
                return "root"
            return arn.split("/")[-1]
        if user_identity.get("principalId"):
            return user_identity["principalId"]
    elif isinstance(user_identity, str):
        return user_identity

    return record.get("user") or record.get("userName")


def _extract_error_code(record: Dict[str, Any]) -> Optional[str]:
    """Extract error code from CloudTrail record if present."""
    error_code = record.get("errorCode") if record.get("errorCode") is not None else record.get("error_code")
    if error_code is not None:
        return error_code
    response_elements = record.get("responseElements")
    if isinstance(response_elements, dict) and response_elements.get("ConsoleLogin") == "Failure":
        return record.get("errorMessage") or "Failed authentication"
    return None


def parse_cloudtrail_file(file_path: Union[str, Path]) -> List[Dict[str, Any]]:
    """
    Opens a CloudTrail log file (.json or .json.gz) and returns a list of events.

    Each event is returned as a dict with only these fields:
    - event_time
    - event_name
    - user
    - source_ip
    - region
    - error_code (None if missing)
    """
    path = Path(file_path)
    if not path.is_file():
        raise FileNotFoundError(f"File not found: {file_path}")

    # Determine if file is gzip compressed (via suffix or gzip magic bytes)
    is_gz = path.suffix == ".gz" or str(path).endswith(".json.gz")
    if not is_gz:
        with open(path, "rb") as f:
            if f.read(2) == b"\x1f\x8b":
                is_gz = True

    if is_gz:
        with gzip.open(path, "rt", encoding="utf-8") as f:
            data = json.load(f)
    else:
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)

    if isinstance(data, dict):
        raw_records = data.get("Records", [])
    elif isinstance(data, list):
        raw_records = data
    else:
        raw_records = []

    events = []
    for record in raw_records:
        if not isinstance(record, dict):
            continue

        event = {
            "event_time": record.get("eventTime") if record.get("eventTime") is not None else record.get("event_time"),
            "event_name": record.get("eventName") if record.get("eventName") is not None else record.get("event_name"),
            "user": _extract_user(record),
            "source_ip": record.get("sourceIPAddress") if record.get("sourceIPAddress") is not None else record.get("source_ip"),
            "region": record.get("awsRegion") if record.get("awsRegion") is not None else record.get("region"),
            "error_code": _extract_error_code(record),
        }
        events.append(event)

    return events


def _extract_azure_user(record: Dict[str, Any]) -> Optional[str]:
    """Extract user identifier from Azure Activity Log record."""
    # 1. Direct caller
    caller = record.get("caller")
    if caller:
        if str(caller).lower() == "root" or str(caller).endswith(":root"):
            return "root"
        return str(caller)

    # 2. Identity / Claims
    identity = record.get("identity")
    claims = record.get("claims")
    if not isinstance(claims, dict) and isinstance(identity, dict):
        claims = identity.get("claims")

    if isinstance(claims, dict):
        claim_user = (
            claims.get("http://schemas.xmlsoap.org/ws/2005/05/identity/claims/upn")
            or claims.get("http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress")
            or claims.get("http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name")
            or claims.get("name")
            or claims.get("upn")
            or claims.get("email")
        )
        if claim_user:
            if str(claim_user).lower() == "root" or str(claim_user).endswith(":root"):
                return "root"
            return str(claim_user)

    # 3. Fallback to CloudTrail style userIdentity if present
    ct_user = _extract_user(record)
    if ct_user:
        return ct_user

    return record.get("user") or record.get("userName") or record.get("principalId")


def _extract_azure_event_name(record: Dict[str, Any]) -> Optional[str]:
    """Extract and normalize operation/event name from Azure Activity Log."""
    op_name = record.get("operationName")
    if isinstance(op_name, dict):
        raw_op = op_name.get("value") or op_name.get("localizedValue")
    else:
        raw_op = op_name

    if not raw_op:
        raw_op = (
            record.get("eventName")
            or record.get("event_name")
            or record.get("action")
            or record.get("operation_name")
        )

    props = record.get("properties")
    if not raw_op and isinstance(props, dict):
        raw_op = props.get("action") or props.get("operationName")

    if not raw_op:
        return None

    raw_str = str(raw_op).strip()
    raw_lower = raw_str.lower()

    # Map Azure operation names to internal canonical event names
    if raw_lower in AZURE_OPERATION_MAP:
        return AZURE_OPERATION_MAP[raw_lower]

    return raw_str


def _extract_azure_source_ip(record: Dict[str, Any]) -> Optional[str]:
    """Extract source IP from Azure Activity Log record."""
    ip = (
        record.get("callerIpAddress")
        or record.get("clientIp")
        or record.get("sourceIPAddress")
        or record.get("source_ip")
    )
    if ip:
        return str(ip)

    props = record.get("properties")
    if isinstance(props, dict):
        ip = props.get("clientIp") or props.get("callerIpAddress")
        if ip:
            return str(ip)

    http_req = record.get("httpRequest")
    if isinstance(http_req, dict):
        ip = http_req.get("clientIp")
        if ip:
            return str(ip)

    return None


def _extract_azure_region(record: Dict[str, Any]) -> Optional[str]:
    """Extract region / location from Azure Activity Log record."""
    region = (
        record.get("location")
        or record.get("region")
        or record.get("awsRegion")
        or record.get("resourceLocation")
    )
    return str(region) if region else None


def _extract_azure_time(record: Dict[str, Any]) -> Optional[str]:
    """Extract event timestamp from Azure Activity Log record."""
    time_val = (
        record.get("eventTimestamp")
        or record.get("time")
        or record.get("eventTime")
        or record.get("event_time")
        or record.get("timestamp")
    )
    return str(time_val) if time_val else None


def _extract_azure_error_code(record: Dict[str, Any]) -> Optional[str]:
    """Extract error code or failure status from Azure Activity Log record."""
    # Direct explicit error code
    if record.get("error_code") is not None:
        return record.get("error_code")
    if record.get("errorCode") is not None:
        return record.get("errorCode")

    status = record.get("status")
    if isinstance(status, dict):
        status_val = status.get("value") or status.get("localizedValue")
    else:
        status_val = status

    result_type = record.get("resultType") or record.get("resultSignature")

    sub_status = record.get("subStatus")
    if isinstance(sub_status, dict):
        sub_status_val = sub_status.get("value") or sub_status.get("localizedValue")
    else:
        sub_status_val = sub_status

    props = record.get("properties") if isinstance(record.get("properties"), dict) else {}
    status_code = props.get("statusCode") or props.get("status_code")
    status_msg = props.get("statusMessage") or props.get("errorMessage") or record.get("errorMessage")

    # Failure indicators
    failed_statuses = {"failed", "failure", "error", "denied"}
    if status_val and str(status_val).lower() in failed_statuses:
        return sub_status_val or status_msg or (str(status_code) if status_code else str(status_val))

    if result_type and str(result_type).lower() in failed_statuses:
        return sub_status_val or status_msg or (str(status_code) if status_code else str(result_type))

    if status_code:
        code_str = str(status_code).lower()
        if code_str.startswith(("4", "5")) or code_str in ("unauthorized", "forbidden", "badrequest", "failed"):
            return sub_status_val or status_msg or str(status_code)

    # Success indicators
    success_statuses = {"succeeded", "success", "started", "accepted"}
    if status_val and str(status_val).lower() in success_statuses:
        return None
    if result_type and str(result_type).lower() in success_statuses:
        return None

    # Fallback for CloudTrail ConsoleLogin responseElements
    response_elements = record.get("responseElements")
    if isinstance(response_elements, dict) and response_elements.get("ConsoleLogin") == "Failure":
        return record.get("errorMessage") or "Failed authentication"

    return None


def parse_azure_event(record: Dict[str, Any]) -> Dict[str, Any]:
    """
    Transforms a single Azure Activity Log record into the internal event format:
    - event_time
    - event_name
    - user
    - source_ip
    - region
    - error_code
    """
    return {
        "event_time": _extract_azure_time(record),
        "event_name": _extract_azure_event_name(record),
        "user": _extract_azure_user(record),
        "source_ip": _extract_azure_source_ip(record),
        "region": _extract_azure_region(record),
        "error_code": _extract_azure_error_code(record),
    }


def parse_azure_activity_log(
    log_input: Union[str, bytes, Dict[str, Any], List[Any], Path]
) -> List[Dict[str, Any]]:
    """
    Parses Azure Activity Log JSON content and returns a list of events in the internal format.

    Supports:
    - bytes or str (raw JSON string, file content, or file path)
    - Path object pointing to a .json or .json.gz file
    - pre-parsed dict with "records" / "Records"
    - pre-parsed list of record dicts
    - NDJSON (newline-delimited JSON)
    """
    data = log_input

    # Check if input is a file path
    if isinstance(data, (Path, str)):
        path = Path(str(data))
        if path.is_file():
            is_gz = path.suffix == ".gz" or str(path).endswith(".json.gz")
            if not is_gz:
                with open(path, "rb") as f:
                    if f.read(2) == b"\x1f\x8b":
                        is_gz = True

            if is_gz:
                with gzip.open(path, "rt", encoding="utf-8") as f:
                    content_str = f.read()
            else:
                with open(path, "r", encoding="utf-8") as f:
                    content_str = f.read()
            data = content_str

    # Decompress bytes if gzipped
    if isinstance(data, bytes):
        if data.startswith(b"\x1f\x8b"):
            data = gzip.decompress(data)
        data = data.decode("utf-8")

    # Parse JSON if str
    if isinstance(data, str):
        content = data.strip()
        if not content:
            return []
        try:
            data = json.loads(content)
        except json.JSONDecodeError:
            # Fallback for NDJSON (newline-delimited JSON)
            records = []
            for line in content.splitlines():
                line = line.strip()
                if line:
                    try:
                        record_obj = json.loads(line)
                        if isinstance(record_obj, dict):
                            records.append(record_obj)
                    except json.JSONDecodeError:
                        continue
            data = records

    # Extract list of raw records
    raw_records: List[Any] = []
    if isinstance(data, dict):
        if "records" in data:
            raw_records = data["records"]
        elif "Records" in data:
            raw_records = data["Records"]
        else:
            raw_records = [data]
    elif isinstance(data, list):
        raw_records = data

    events: List[Dict[str, Any]] = []
    for record in raw_records:
        if isinstance(record, dict):
            events.append(parse_azure_event(record))

    return events


def parse_azure_activity_log_file(file_path: Union[str, Path]) -> List[Dict[str, Any]]:
    """Opens an Azure Activity Log file (.json or .json.gz) and returns parsed events."""
    return parse_azure_activity_log(file_path)
