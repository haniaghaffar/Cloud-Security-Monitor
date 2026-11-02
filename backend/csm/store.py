"""Module for persisting security findings to Azure Table Storage."""

import os
import uuid
from typing import Any, Dict, Optional

try:
    from azure.core.exceptions import ResourceExistsError
    from azure.data.tables import TableClient
except ImportError:
    TableClient = None  # type: ignore
    ResourceExistsError = Exception  # type: ignore


def save_finding(
    finding: Dict[str, Any],
    table_client: Optional[Any] = None,
    connection_string: Optional[str] = None,
    table_name: str = "findings",
) -> str:
    """
    Saves a security finding to Azure Table Storage.

    - Copies the finding dict.
    - Adds 'finding_id' (a new uuid4 string).
    - Adds 'status': 'open'.
    - Sets 'timestamp' from 'event_time' if 'timestamp' is missing.
    - Sets 'PartitionKey' (event_type or 'findings') and 'RowKey' (finding_id).
    - Removes keys with None values (Azure Table Storage does not support null properties).
    - Uses connection string from AzureWebJobsStorage environment variable if table_client is None.
    - Inserts/upserts the entity in the 'findings' table.
    - Returns the finding_id.
    """
    item = dict(finding)
    finding_id = str(uuid.uuid4())
    item["finding_id"] = finding_id
    item["status"] = "open"

    if "timestamp" not in item:
        item["timestamp"] = item.get("event_time") or ""

    # Azure Table Storage requires PartitionKey and RowKey
    item["PartitionKey"] = str(item.get("event_type") or "findings")
    item["RowKey"] = finding_id

    # Azure Table Storage does not permit None values in entity dictionaries
    entity = {k: v for k, v in item.items() if v is not None}

    if table_client is None:
        conn_str = connection_string or os.environ.get("AzureWebJobsStorage")
        if not conn_str:
            raise ValueError("AzureWebJobsStorage connection string is not set.")
        if TableClient is None:
            raise ImportError("azure-data-tables is required to save findings to Azure Table Storage.")

        table_client = TableClient.from_connection_string(conn_str=conn_str, table_name=table_name)
        try:
            table_client.create_table()
        except ResourceExistsError:
            pass
        except Exception:
            # Table might already exist or service returned existing resource error
            pass

    # Save to Azure Table Storage (support upsert_entity, create_entity, or put_item for test mocks)
    if hasattr(table_client, "upsert_entity"):
        table_client.upsert_entity(entity=entity)
    elif hasattr(table_client, "create_entity"):
        table_client.create_entity(entity=entity)
    elif hasattr(table_client, "put_item"):
        table_client.put_item(Item=entity)
    else:
        raise AttributeError("table_client does not support upsert_entity or create_entity")

    return finding_id
