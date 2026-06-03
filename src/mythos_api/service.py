"""Service dependency wiring for the FastAPI adapter.

Production builds a Postgres-backed `RuntimeSessionService` per request and
closes the store afterwards (the same local-instantiation + try/finally
pattern the Streamlit app reverted to for stable connection handling). Tests
override `get_service` with an in-memory store, so this module never needs a
live database during unit tests.
"""

from __future__ import annotations

from collections.abc import Iterator

from mythos_memory import PostgresMythOSStore
from mythos_runtime.session import RuntimeSessionService
from mythos_runtime.visual_service import MinIOStorageAdapter


def get_service() -> Iterator[RuntimeSessionService]:
    """FastAPI dependency yielding a request-scoped session service."""
    store = PostgresMythOSStore()
    try:
        yield RuntimeSessionService(store)
    finally:
        store.close()


def get_storage_adapter() -> MinIOStorageAdapter:
    """FastAPI dependency yielding the S3/MinIO adapter for URL signing."""
    return MinIOStorageAdapter()
