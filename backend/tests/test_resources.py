"""Tests for the ARM inventory module (csm.resources).

The MSI token endpoint and the ARM API are both faked, so no Azure
access is needed: mapping, sorting, and error paths are tested
against canned responses.

Run from the function app folder (the one with function_app.py):
    PYTHONPATH=.:.python_packages/lib/site-packages python3 -m unittest discover -s tests -v
(On the PC the command is `py` instead of `python3`.)
"""

import os
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from csm import resources  # noqa: E402

MSI_URL = "http://localhost/msi"
IDENTITY_URL = "http://localhost/identity"
ARM_ITEM_STORAGE = {
    "id": "/subscriptions/sub-1/resourceGroups/csm-rg/providers/Microsoft.Storage/storageAccounts/csmstorage583",
    "name": "csmstorage583",
    "type": "Microsoft.Storage/storageAccounts",
    "location": "UAENorth",
}
ARM_ITEM_FUNCTION = {
    "id": "/subscriptions/sub-1/resourceGroups/csm-rg/providers/Microsoft.Web/sites/csmfunc583",
    "name": "csmfunc583",
    "type": "Microsoft.Web/sites",
    "location": "UAENorth",
}
ARM_ITEM_SUBSCRIPTION_LEVEL = {
    # No resourceGroups segment: group must parse as "".
    "id": "/subscriptions/sub-1/providers/Microsoft.Authorization/policyAssignments/abc",
    "name": "abc",
    "type": "Microsoft.Authorization/policyAssignments",
    "location": "",
}


class _FakeResponse:
    def __init__(self, payload):
        self._payload = payload

    def raise_for_status(self):
        return None

    def json(self):
        return self._payload


class ResourcesTestCase(unittest.TestCase):
    def setUp(self):
        os.environ["MSI_ENDPOINT"] = MSI_URL
        os.environ["MSI_SECRET"] = "test-secret"
        os.environ["AZURE_SUBSCRIPTION_ID"] = "sub-1"
        self.calls = []

        def fake_get(url, params=None, headers=None, timeout=None):
            self.calls.append((url, headers or {}))
            if url in (MSI_URL, IDENTITY_URL):
                return _FakeResponse({"access_token": "msi-token"})
            return _FakeResponse({"value": [ARM_ITEM_FUNCTION, ARM_ITEM_STORAGE,
                                            ARM_ITEM_SUBSCRIPTION_LEVEL]})

        self.fake_get = fake_get

    def tearDown(self):
        for key in ("MSI_ENDPOINT", "MSI_SECRET", "AZURE_SUBSCRIPTION_ID",
                    "IDENTITY_ENDPOINT", "IDENTITY_HEADER"):
            os.environ.pop(key, None)

    def test_list_resources_maps_and_sorts(self):
        result = resources.list_resources(http_get=self.fake_get)
        self.assertEqual(result["total"], 3)
        names = [row["name"] for row in result["data"]]
        # Sorted by (type, name): Authorization < Storage < Web.
        self.assertEqual(names, ["abc", "csmstorage583", "csmfunc583"])
        storage = result["data"][1]
        self.assertEqual(storage["resourceGroup"], "csm-rg")
        self.assertEqual(storage["location"], "UAENorth")
        self.assertEqual(result["data"][0]["resourceGroup"], "")
        # The MSI token call went to the MSI endpoint, ARM got a Bearer.
        self.assertIn(MSI_URL, [url for url, _ in self.calls])

    def test_missing_subscription_id_raises(self):
        os.environ.pop("AZURE_SUBSCRIPTION_ID", None)
        with self.assertRaises(RuntimeError):
            resources.list_resources(http_get=self.fake_get)

    def test_missing_msi_env_raises(self):
        os.environ.pop("MSI_ENDPOINT", None)
        os.environ.pop("MSI_SECRET", None)
        with self.assertRaises(RuntimeError):
            resources.list_resources(http_get=self.fake_get)

    def test_identity_endpoint_preferred_over_msi(self):
        os.environ["IDENTITY_ENDPOINT"] = IDENTITY_URL
        os.environ["IDENTITY_HEADER"] = "host-header"
        result = resources.list_resources(http_get=self.fake_get)
        self.assertEqual(result["total"], 3)
        token_calls = [(url, headers) for url, headers in self.calls
                       if url in (MSI_URL, IDENTITY_URL)]
        self.assertEqual(len(token_calls), 1)
        self.assertEqual(token_calls[0][0], IDENTITY_URL)
        self.assertEqual(token_calls[0][1].get("X-IDENTITY-HEADER"), "host-header")

    def test_identity_endpoint_used_when_msi_absent(self):
        os.environ.pop("MSI_ENDPOINT", None)
        os.environ.pop("MSI_SECRET", None)
        os.environ["IDENTITY_ENDPOINT"] = IDENTITY_URL
        os.environ["IDENTITY_HEADER"] = "host-header"
        result = resources.list_resources(http_get=self.fake_get)
        self.assertEqual(result["total"], 3)

    def test_neither_identity_nor_msi_raises(self):
        for key in ("MSI_ENDPOINT", "MSI_SECRET",
                    "IDENTITY_ENDPOINT", "IDENTITY_HEADER"):
            os.environ.pop(key, None)
        with self.assertRaises(RuntimeError):
            resources.list_resources(http_get=self.fake_get)

    def test_map_resource_rejects_incomplete_rows(self):
        self.assertIsNone(resources.map_resource({"name": "x"}))
        self.assertIsNone(resources.map_resource({"id": "/x"}))
        self.assertEqual(
            resources.parse_resource_group(
                "/subscriptions/s/resourceGroups/rg-1/providers/Microsoft.Web/sites/app"),
            "rg-1")


if __name__ == "__main__":
    unittest.main()
