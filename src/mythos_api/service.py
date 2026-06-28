"""Service dependency wiring for the FastAPI adapter.

Production builds a Postgres-backed `RuntimeSessionService` per request and
closes the store afterwards (the same local-instantiation + try/finally
pattern the Streamlit app reverted to for stable connection handling). Tests
override `get_service` with an in-memory store, so this module never needs a
live database during unit tests.
"""

from __future__ import annotations

import os
from collections.abc import Iterator

from mythos_memory import PostgresMythOSStore
from mythos_runtime.session import RuntimeSessionService
from mythos_runtime.visual_service import GCSStorageAdapter, MinIOStorageAdapter

# Storage adapters that can sign a time-limited read URL (the API never exposes the
# bucket directly). The deployed read path picks one by MYTHOS_STORAGE_BACKEND;
# Filesystem is excluded here because it cannot sign.
SigningStorageAdapter = MinIOStorageAdapter | GCSStorageAdapter


def get_service() -> Iterator[RuntimeSessionService]:
    """FastAPI dependency yielding a request-scoped session service."""
    store = PostgresMythOSStore()
    try:
        yield RuntimeSessionService(store)
    finally:
        store.close()


def get_storage_adapter() -> SigningStorageAdapter:
    """FastAPI dependency yielding the asset-URL signer for the active backend.

    ``MYTHOS_STORAGE_BACKEND=gcs`` → GCS (cloud); anything else → MinIO/S3 (local
    default), so existing behavior is unchanged unless the cloud env is set.
    """
    backend = (os.getenv("MYTHOS_STORAGE_BACKEND") or "minio").strip().lower()
    if backend == "gcs":
        return GCSStorageAdapter()
    return MinIOStorageAdapter()
