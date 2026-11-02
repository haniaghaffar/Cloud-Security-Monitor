"""Tests for csm.emailer and the shared blob-processing helper.

Run from the function app folder (the one with function_app.py):
    PYTHONPATH=.:.python_packages/lib/site-packages python3 -m unittest discover -s tests -v
(On the PC the command is `py` instead of `python3`.)
"""

import json
import os
import sys
import unittest
from pathlib import Path
from unittest import mock

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from csm.emailer import RESEND_API_URL, RESEND_FROM_EMAIL, send_alert_email  # noqa: E402


def _finding(severity="High", event_type="BruteForceLogin"):
    return {
        "finding_id": "test-finding-1",
        "event_type": event_type,
        "severity": severity,
        "user": "alice@example.com",
        "source_ip": "203.0.113.10",
        "region": "UAENorth",
        "timestamp": "2026-10-27T10:00:00Z",
        "description": "Test finding.",
    }


class _FakeResponse:
    def __init__(self, status_code, text=""):
        self.status_code = status_code
        self.text = text


class TestSendAlertEmail(unittest.TestCase):
    def setUp(self):
        self.env = mock.patch.dict(
            os.environ,
            {"RESEND_API_KEY": "re_test_key", "ALERT_TO_EMAIL": "shoaibchaudhary583@gmail.com"},
        )
        self.env.start()
        self.calls = []

    def tearDown(self):
        self.env.stop()

    def _post_ok(self, url, headers=None, json=None, timeout=None):
        self.calls.append({"url": url, "headers": headers, "json": json})
        return _FakeResponse(200, '{"id": "email-1"}')

    def test_high_finding_sends_email(self):
        self.assertTrue(send_alert_email(_finding("High"), http_post=self._post_ok))
        self.assertEqual(len(self.calls), 1)
        call = self.calls[0]
        self.assertEqual(call["url"], RESEND_API_URL)
        self.assertEqual(call["headers"]["Authorization"], "Bearer re_test_key")
        self.assertEqual(call["json"]["from"], RESEND_FROM_EMAIL)
        self.assertEqual(call["json"]["to"], ["shoaibchaudhary583@gmail.com"])
        self.assertEqual(call["json"]["subject"], "[High] BruteForceLogin detected")
        self.assertIn("BruteForceLogin", call["json"]["text"])

    def test_critical_finding_sends_email(self):
        self.assertTrue(send_alert_email(_finding("Critical", "RootAccountUsage"), http_post=self._post_ok))
        self.assertEqual(len(self.calls), 1)
        self.assertEqual(self.calls[0]["json"]["subject"], "[Critical] RootAccountUsage detected")

    def test_medium_finding_sends_nothing(self):
        self.assertFalse(send_alert_email(_finding("Medium", "NewRegionLogin"), http_post=self._post_ok))
        self.assertEqual(self.calls, [])

    def test_low_finding_sends_nothing(self):
        self.assertFalse(send_alert_email(_finding("Low"), http_post=self._post_ok))
        self.assertEqual(self.calls, [])

    def test_missing_api_key_sends_nothing(self):
        with mock.patch.dict(os.environ, {"RESEND_API_KEY": ""}):
            self.assertFalse(send_alert_email(_finding("High"), http_post=self._post_ok))
        self.assertEqual(self.calls, [])

    def test_http_error_returns_false(self):
        def _post_401(url, headers=None, json=None, timeout=None):
            self.calls.append(url)
            return _FakeResponse(401, "Unauthorized")

        self.assertFalse(send_alert_email(_finding("High"), http_post=_post_401))
        self.assertEqual(len(self.calls), 1)

    def test_network_exception_returns_false(self):
        def _post_raises(url, headers=None, json=None, timeout=None):
            raise ConnectionError("boom")

        self.assertFalse(send_alert_email(_finding("High"), http_post=_post_raises))


class TestProcessBlobContent(unittest.TestCase):
    def setUp(self):
        import function_app

        self.function_app = function_app

    def _run_helper(self, content, blob_name):
        saved = []
        emailed = []

        def fake_save(finding):
            finding_id = "finding-%d" % (len(saved) + 1)
            saved.append(dict(finding))
            return finding_id

        def fake_email(finding, **kwargs):
            # Mirror the real send_alert_email contract: only High/Critical
            # findings are actually emailed; Medium/Low are skipped.
            if finding.get("severity") in ("High", "Critical"):
                emailed.append(dict(finding))
                return True
            return False

        with mock.patch.object(self.function_app, "save_finding", side_effect=fake_save):
            with mock.patch.object(self.function_app, "send_alert_email", side_effect=fake_email):
                count = self.function_app.process_blob_content(content, blob_name)
        return count, saved, emailed

    def test_sample_blob_five_findings_four_emails(self):
        sample = Path(__file__).resolve().parents[2] / "sample-activity-log.json"
        if not sample.exists():
            self.skipTest("sample-activity-log.json not present next to the app folder")
        content = sample.read_bytes()
        count, saved, emailed = self._run_helper(content, "sample-activity-log.json")
        # The proven sample: 11 events -> 5 findings (see Oct 25 E2E test).
        self.assertEqual(count, 5)
        self.assertEqual(len(saved), 5)
        # Only High/Critical get emails: Medium NewRegionLogin does not.
        self.assertEqual(len(emailed), 4)
        self.assertEqual(
            sorted(f["event_type"] for f in emailed),
            ["BruteForceLogin", "CloudTrailDisabled", "IAMPolicyChange", "RootAccountUsage"],
        )
        self.assertTrue(all(f.get("finding_id") for f in emailed))

    def test_live_nested_blob_name_same_result(self):
        sample = Path(__file__).resolve().parents[2] / "sample-activity-log.json"
        if not sample.exists():
            self.skipTest("sample-activity-log.json not present next to the app folder")
        nested = (
            "insights-activity-logs/resourceId=/SUBSCRIPTIONS/demo"
            "/y=2026/m=10/d=27/h=12/m=00/PT1H.json"
        )
        count, saved, emailed = self._run_helper(sample.read_bytes(), nested)
        self.assertEqual(count, 5)
        self.assertEqual(len(emailed), 4)

    def test_inline_root_record_triggers_critical_email(self):
        payload = json.dumps(
            {
                "records": [
                    {
                        "eventTimestamp": "2026-10-27T10:00:00Z",
                        "caller": "root",
                        "operationName": {"value": "Microsoft.Authorization/roleAssignments/write"},
                        "status": {"value": "Succeeded"},
                        "location": "UAENorth",
                        "callerIpAddress": "203.0.113.10",
                        "correlationId": "test-1",
                        "resourceId": "/subscriptions/demo/resourceGroups/csm-rg",
                    }
                ]
            }
        ).encode()
        count, saved, emailed = self._run_helper(payload, "logs/test.json")
        self.assertEqual(count, 1)
        self.assertEqual(saved[0]["event_type"], "RootAccountUsage")
        self.assertEqual(saved[0]["severity"], "Critical")
        self.assertEqual(len(emailed), 1)

    def test_email_failure_does_not_stop_saves(self):
        sample = Path(__file__).resolve().parents[2] / "sample-activity-log.json"
        if not sample.exists():
            self.skipTest("sample-activity-log.json not present next to the app folder")

        def fake_save(finding):
            return "finding-x"

        def fake_email_raises(finding, **kwargs):
            raise RuntimeError("resend down")

        with mock.patch.object(self.function_app, "save_finding", side_effect=fake_save):
            with mock.patch.object(self.function_app, "send_alert_email", side_effect=fake_email_raises):
                count = self.function_app.process_blob_content(sample.read_bytes(), "logs/x.json")
        self.assertEqual(count, 5)

    def test_empty_blob_saves_nothing(self):
        count, saved, emailed = self._run_helper(b"", "logs/empty.json")
        self.assertEqual(count, 0)
        self.assertEqual(saved, [])
        self.assertEqual(emailed, [])


if __name__ == "__main__":
    unittest.main()
