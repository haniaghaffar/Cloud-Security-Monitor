"""CSM (Cloud Security Monitor) Azure Function package."""

from .parser import (
    parse_azure_activity_log,
    parse_azure_activity_log_file,
    parse_azure_event,
    parse_cloudtrail_file,
)
from .rules import analyze_events, check_event
from .store import save_finding

__all__ = [
    "parse_azure_activity_log",
    "parse_azure_activity_log_file",
    "parse_azure_event",
    "parse_cloudtrail_file",
    "check_event",
    "analyze_events",
    "save_finding",
]
