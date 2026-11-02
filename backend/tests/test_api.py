"""Tests for the dashboard HTTP API (csm.api + function_app routes).

Run from the function app folder (the one with function_app.py):
    PYTHONPATH=.:.python_packages/lib/site-packages python3 -m unittest discover -s tests -v
(On the PC the command is `py` instead of `python3`.)
"""

import os
import sys
import unittest
from datetime import datetime, timedelta, timezone
from pathlib import Path
from unittest import mock

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from azure.core.exceptions import ResourceNotFoundError  # noqa: E402
from csm import api  # noqa: E402
from csm.emailer import send_alert_email  # noqa: E402


def _now():
    return datetime.now(timezone.utc)


def _iso(dt):
    return dt.strftime("%Y-%m-%dT%H:%M:%SZ")


def _row(finding_id, severity="High", event_type="BruteForceLogin", status="open",
         user="alice@example.com", ts=None, ip="203.0.113.10", region="UAENorth",
         description="Test finding."):
    row = {
        "finding_id": finding_id,
        "event_type": event_type,
        "severity": severity,
        "user": user,
        "source_ip": ip,
        "region": region,
        "description": description,
        "status": status,
        "PartitionKey": event_type,
        "RowKey": finding_id,
    }
    if ts is not None:
        row["timestamp"] = ts
    return row


class FakeTable:
    """In-memory stand-in for azure-data-tables TableClient."""

    def __init__(self, entities=None):
        self.entities = list(entities or [])
        self.saved = {}

    def list_entities(self):
        return list(self.entities)

    def get_entity(self, partition_key, row_key):
        key = (partition_key, row_key)
        if key not in self.saved:
            raise ResourceNotFoundError("not found")
        return dict(self.saved[key])

    def upsert_entity(self, entity):
        self.saved[(entity["PartitionKey"], entity["RowKey"])] = dict(entity)

    def create_entity(self, entity):
        self.upsert_entity(entity)

    def create_table(self):
        pass


class TestMapFinding(unittest.TestCase):
    def test_maps_user_to_user_or_role_and_strips_keys(self):
        mapped = api.map_finding(_row("id-1", ts=_iso(_now())))
        assert mapped is not None
        self.assertEqual(mapped["user_or_role"], "alice@example.com")
        self.assertNotIn("PartitionKey", mapped)
        self.assertNotIn("RowKey", mapped)
        self.assertNotIn("user", mapped)
        self.assertEqual(mapped["status"], "open")

    def test_timestamp_falls_back_to_event_time(self):
        row = _row("id-2")
        row["event_time"] = "2026-10-27T10:00:00Z"
        mapped = api.map_finding(row)
        assert mapped is not None
        self.assertEqual(mapped["timestamp"], "2026-10-27T10:00:00Z")

    def test_timestamp_falls_back_to_system_timestamp(self):
        row = _row("id-3")
        row["Timestamp"] = datetime(2026, 10, 27, 10, 0, 0, tzinfo=timezone.utc)
        mapped = api.map_finding(row)
        assert mapped is not None
        self.assertEqual(mapped["timestamp"], "2026-10-27T10:00:00Z")

    def test_invalid_severity_skipped(self):
        self.assertIsNone(api.map_finding(_row("id-4", severity="Weird", ts=_iso(_now()))))

    def test_missing_source_ip_becomes_unknown(self):
        row = _row("id-5", ts=_iso(_now()))
        row["source_ip"] = None
        mapped = api.map_finding(row)
        assert mapped is not None
        self.assertEqual(mapped["source_ip"], "unknown")


def _sample_findings():
    now = _now()
    return [
        api.map_finding(_row("f1", severity="Critical", event_type="RootAccountUsage",
                              ts=_iso(now), ip="203.0.113.1")),
        api.map_finding(_row("f2", severity="High", event_type="IAMPolicyChange",
                              ts=_iso(now - timedelta(days=2)), ip="203.0.113.1")),
        api.map_finding(_row("f3", severity="Medium", event_type="NewRegionLogin",
                              status="reviewed", ts=_iso(now - timedelta(days=10)),
                              ip="203.0.113.2")),
        api.map_finding(_row("f4", severity="High", event_type="BruteForceLogin",
                              status="resolved", ts=_iso(now - timedelta(days=40)),
                              ip="203.0.113.2")),
    ]


class TestFiltersSortPaginate(unittest.TestCase):
    def setUp(self):
        self.findings = [f for f in _sample_findings() if f is not None]

    def test_filter_severity(self):
        out = api.apply_filters(self.findings, {"severity": "Critical"})
        self.assertEqual([f["finding_id"] for f in out], ["f1"])

    def test_filter_status_and_event_type(self):
        out = api.apply_filters(self.findings, {"status": "reviewed", "eventType": "NewRegionLogin"})
        self.assertEqual([f["finding_id"] for f in out], ["f3"])

    def test_search_matches_ip_and_description(self):
        out = api.apply_filters(self.findings, {"search": "203.0.113.2"})
        self.assertEqual(sorted(f["finding_id"] for f in out), ["f3", "f4"])

    def test_date_range_today_and_7days(self):
        today = api.apply_filters(self.findings, {"dateRange": "TODAY"})
        self.assertEqual([f["finding_id"] for f in today], ["f1"])
        week = api.apply_filters(self.findings, {"dateRange": "7DAYS"})
        self.assertEqual(sorted(f["finding_id"] for f in week), ["f1", "f2"])
        month = api.apply_filters(self.findings, {"dateRange": "30DAYS"})
        self.assertEqual(sorted(f["finding_id"] for f in month), ["f1", "f2", "f3"])

    def test_default_sort_newest_first(self):
        out = api.sort_findings(self.findings, None, None)
        self.assertEqual([f["finding_id"] for f in out], ["f1", "f2", "f3", "f4"])

    def test_severity_sort_uses_rank(self):
        out = api.sort_findings(self.findings, "severity", "desc")
        self.assertEqual(out[0]["severity"], "Critical")
        out = api.sort_findings(self.findings, "severity", "asc")
        self.assertEqual(out[0]["severity"], "Medium")

    def test_paginate_math(self):
        page_items, total, page, page_size, total_pages = api.paginate(self.findings, 1, 3)
        self.assertEqual((total, page, page_size, total_pages), (4, 1, 3, 2))
        self.assertEqual(len(page_items), 3)
        page_items, total, page, page_size, total_pages = api.paginate(self.findings, 2, 3)
        self.assertEqual(len(page_items), 1)
        page_items, total, page, page_size, total_pages = api.paginate(self.findings, 9, 3)
        self.assertEqual(page_items, [])
        _, _, _, page_size, _ = api.paginate(self.findings, 1, 500)
        self.assertEqual(page_size, 100)


class TestStats(unittest.TestCase):
    def setUp(self):
        self.findings = [f for f in _sample_findings() if f is not None]

    def test_counts_and_today(self):
        stats = api.compute_stats(self.findings)
        metrics = stats["metrics"]
        self.assertEqual(metrics["totalEvents"], 4)
        self.assertEqual(metrics["threatsDetectedToday"], 1)
        self.assertEqual(metrics["openIncidents"], 2)
        self.assertEqual(metrics["criticalFindings"], 1)
        self.assertEqual(metrics["reviewedIncidents"], 1)
        self.assertEqual(metrics["resolvedIncidents"], 1)
        self.assertEqual(metrics["severityCounts"], {"Critical": 1, "High": 2, "Medium": 1, "Low": 0})
        self.assertEqual(metrics["statusCounts"], {"open": 2, "reviewed": 1, "resolved": 1})

    def test_risky_ips(self):
        stats = api.compute_stats(self.findings)
        risky = stats["riskyIps"]
        self.assertEqual(len(risky), 2)
        self.assertEqual(risky[0]["ip"], "203.0.113.1")
        self.assertEqual(risky[0]["count"], 2)
        self.assertEqual(risky[0]["highestSeverity"], "Critical")
        self.assertEqual(risky[0]["associatedEvents"], ["IAMPolicyChange", "RootAccountUsage"])

    def test_recent_findings_newest_first_max_10(self):
        stats = api.compute_stats(self.findings)
        self.assertEqual(
            [f["finding_id"] for f in stats["recentFindings"]], ["f1", "f2", "f3", "f4"]
        )


class TestAlertSettings(unittest.TestCase):
    def test_defaults_use_env_email(self):
        with mock.patch.dict(os.environ, {"ALERT_TO_EMAIL": "shoaibchaudhary583@gmail.com"}):
            settings = api.get_alert_settings(FakeTable())
        self.assertEqual(settings["critical"], True)
        self.assertEqual(settings["high"], True)
        self.assertEqual(settings["medium"], False)
        self.assertEqual(settings["low"], False)
        self.assertEqual(settings["recipientEmails"], "shoaibchaudhary583@gmail.com")
        self.assertEqual(settings["notifyOnResolution"], True)

    def test_save_round_trip_and_validation(self):
        table = FakeTable()
        saved = api.save_alert_settings(
            {
                "critical": True,
                "high": True,
                "medium": True,
                "low": False,
                "recipientEmails": "team@example.com",
                "notifyOnResolution": False,
            },
            table,
        )
        self.assertIn("lastSavedAt", saved)
        loaded = api.get_alert_settings(table)
        self.assertEqual(loaded["medium"], True)
        self.assertEqual(loaded["recipientEmails"], "team@example.com")
        with self.assertRaises(ValueError):
            api.save_alert_settings(
                {
                    "critical": "yes",
                    "high": True,
                    "medium": False,
                    "low": False,
                    "recipientEmails": "x@y.z",
                    "notifyOnResolution": True,
                },
                table,
            )

    def test_email_severities_from_settings_and_fallback(self):
        table = FakeTable()
        api.save_alert_settings(
            {
                "critical": True,
                "high": False,
                "medium": True,
                "low": False,
                "recipientEmails": "team@example.com",
                "notifyOnResolution": True,
            },
            table,
        )
        self.assertEqual(api.get_email_severities(table), ("Critical", "Medium"))

        class BrokenTable(FakeTable):
            def get_entity(self, partition_key, row_key):
                raise RuntimeError("boom")

        self.assertEqual(api.get_email_severities(BrokenTable()), ("Critical", "High"))


class TestEmailerAllowedSeverities(unittest.TestCase):
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
        self.calls.append(url)
        return mock.Mock(status_code=200, text="{}")

    def _finding(self, severity):
        return {
            "finding_id": "t-1",
            "event_type": "NewRegionLogin",
            "severity": severity,
            "user": "alice@example.com",
            "source_ip": "203.0.113.10",
            "region": "UAENorth",
            "timestamp": "2026-10-27T10:00:00Z",
            "description": "Test.",
        }

    def test_medium_blocked_by_default_allowed_by_settings(self):
        self.assertFalse(send_alert_email(self._finding("Medium"), http_post=self._post_ok))
        self.assertEqual(self.calls, [])
        self.assertTrue(
            send_alert_email(
                self._finding("Medium"),
                http_post=self._post_ok,
                allowed_severities=("Critical", "Medium"),
            )
        )
        self.assertEqual(len(self.calls), 1)


class TestRouteRegistration(unittest.TestCase):
    def test_all_functions_registered(self):
        import function_app

        names = sorted(f.get_function_name() for f in function_app.app.get_functions())
        for expected in (
            "csm_blob_processor",
            "csm_blob_processor_live",
            "get_findings",
            "get_finding_by_id",
            "get_stats_overview",
            "get_alert_settings_http",
            "update_alert_settings_http",
        ):
            self.assertIn(expected, names)


if __name__ == "__main__":
    unittest.main()
