"""Azure Resource Manager inventory via the Function App's identity.

No secrets are stored for this: the app authenticates with its
system-assigned managed identity (MSI_ENDPOINT/MSI_SECRET are
provided by the Azure platform at runtime), which holds Reader on
the subscription, then lists resources from the ARM API.

Only real ARM data is returned. The frontend Resources page must
not invent names, identifiers, or statuses, so this module reports
exactly what ARM returns (id, name, type, location, resource
group) and nothing else. ARM's resource list carries no health or
connection status, so no status field is fabricated here.

Outside Azure (local runs, tests) MSI_ENDPOINT is absent and this
module raises a clear RuntimeError instead of returning fake data.
"""

import os
from typing import Any, Dict, List, Optional

import requests

MSI_API_VERSION = "2019-08-01"
ARM_API_VERSION = "2021-04-01"
ARM_RESOURCE = "https://management.azure.com/"


def get_managed_identity_token(http_get: Any = requests.get) -> str:
    """Fetch an ARM access token from the platform MSI endpoint."""
    endpoint = os.environ.get("MSI_ENDPOINT")
    secret = os.environ.get("MSI_SECRET")
    if not endpoint or not secret:
        raise RuntimeError(
            "managed identity is not available (MSI_ENDPOINT/MSI_SECRET not set)"
        )
    resp = http_get(
        endpoint,
        params={"resource": ARM_RESOURCE, "api-version": MSI_API_VERSION},
        headers={"secret": secret},
        timeout=15,
    )
    resp.raise_for_status()
    token = resp.json().get("access_token")
    if not token:
        raise RuntimeError("managed identity returned no access token")
    return token


def parse_resource_group(resource_id: str) -> str:
    """Extract the resource group from an ARM id, or '' when absent."""
    parts = (resource_id or "").split("/")
    try:
        idx = parts.index("resourceGroups")
    except ValueError:
        return ""
    if idx + 1 < len(parts):
        return parts[idx + 1]
    return ""


def map_resource(item: Dict[str, Any]) -> Optional[Dict[str, str]]:
    """Map one ARM resource to the dashboard shape (None if unusable)."""
    resource_id = str(item.get("id") or "")
    name = str(item.get("name") or "")
    if not resource_id or not name:
        return None
    return {
        "id": resource_id,
        "name": name,
        "type": str(item.get("type") or ""),
        "location": str(item.get("location") or ""),
        "resourceGroup": parse_resource_group(resource_id),
    }


def list_resources(http_get: Any = requests.get) -> Dict[str, Any]:
    """List the subscription's resources via ARM. Raises on failure."""
    subscription_id = os.environ.get("AZURE_SUBSCRIPTION_ID")
    if not subscription_id:
        raise RuntimeError("AZURE_SUBSCRIPTION_ID is not set")
    token = get_managed_identity_token(http_get)
    url = "https://management.azure.com/subscriptions/%s/resources" % subscription_id
    resp = http_get(
        url,
        params={"api-version": ARM_API_VERSION},
        headers={"Authorization": "Bearer %s" % token},
        timeout=30,
    )
    resp.raise_for_status()
    mapped: List[Dict[str, str]] = []
    for item in resp.json().get("value", []):
        row = map_resource(item)
        if row is not None:
            mapped.append(row)
    mapped.sort(key=lambda r: (r["type"], r["name"]))
    return {"data": mapped, "total": len(mapped)}
