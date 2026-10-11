"""Structured JSON logging on the "mythos" logger tree (Cloud Logging reads stderr JSON).

`MYTHOS_LOG_LEVEL` sets the level (default INFO; tests use ERROR). Carried over from the archived
`mythos_runtime.observability` (branch `1.0`), trimmed to what `/api/v2` logs.
"""

from __future__ import annotations

import json
import logging
import os
import sys
from datetime import UTC, datetime
from typing import Any

# Extra record fields that survive into the JSON line (the `extra=` keys /api/v2 uses).
_FIELDS = ("player_id", "provider", "model_id", "status", "outcome", "latency_ms", "store")


class JsonFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        payload: dict[str, Any] = {
            "ts": datetime.fromtimestamp(record.created, UTC).isoformat(),
            "level": record.levelname.lower(),
            "logger": record.name,
            "message": record.getMessage(),
        }
        for key in _FIELDS:
            value = getattr(record, key, None)
            if value is not None:
                payload[key] = value
        if record.exc_info:
            payload["exc_info"] = self.formatException(record.exc_info)
        return json.dumps(payload, ensure_ascii=False, sort_keys=True)


def configure_logging(level: str | None = None) -> None:
    """Attach one JSON stderr handler to the "mythos" logger (idempotent; no propagation to root)."""
    logger = logging.getLogger("mythos")
    logger.setLevel((level or os.getenv("MYTHOS_LOG_LEVEL") or "INFO").upper())
    logger.propagate = False
    if not any(isinstance(h.formatter, JsonFormatter) for h in logger.handlers):
        handler = logging.StreamHandler(sys.stderr)
        handler.setFormatter(JsonFormatter())
        logger.addHandler(handler)


def get_logger(name: str) -> logging.Logger:
    configure_logging()
    return logging.getLogger(name)


__all__ = ["JsonFormatter", "configure_logging", "get_logger"]
