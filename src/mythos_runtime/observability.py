from __future__ import annotations

import json
import logging
import os
import sys
from collections.abc import Iterator
from contextlib import contextmanager
from datetime import UTC, datetime
from time import perf_counter
from typing import Any

_TRACING_CONFIGURED = False


class JsonFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        payload = {
            "ts": datetime.fromtimestamp(record.created, UTC).isoformat(),
            "level": record.levelname.lower(),
            "logger": record.name,
            "message": record.getMessage(),
        }
        for key in (
            "player_id",
            "loop_id",
            "scene_id",
            "event_id",
            "asset_id",
            "provider",
            "model_id",
            "latency_ms",
            "status",
            "outcome",
        ):
            value = getattr(record, key, None)
            if value is not None:
                payload[key] = value
        if record.exc_info:
            payload["exc_info"] = self.formatException(record.exc_info)
        return json.dumps(payload, ensure_ascii=False, sort_keys=True)


def configure_logging(level: str | None = None) -> None:
    # Attach to the dedicated "mythos" logger rather than root: hosts like Streamlit
    # pre-configure the root logger (often at WARNING), which would otherwise swallow
    # our INFO structured logs. propagate=False also avoids double-printing through the
    # host's handlers.
    logger = logging.getLogger("mythos")
    final_level = (level or os.getenv("MYTHOS_LOG_LEVEL") or "INFO").upper()
    logger.setLevel(final_level)
    logger.propagate = False
    has_json_handler = any(isinstance(h.formatter, JsonFormatter) for h in logger.handlers)
    if not has_json_handler:
        handler = logging.StreamHandler(sys.stderr)
        handler.setFormatter(JsonFormatter())
        logger.addHandler(handler)


def get_logger(name: str) -> logging.Logger:
    configure_logging()
    return logging.getLogger(name)


def configure_tracing() -> bool:
    global _TRACING_CONFIGURED
    if _TRACING_CONFIGURED:
        return True
    try:
        from opentelemetry import trace
        from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
        from opentelemetry.sdk.resources import Resource
        from opentelemetry.sdk.trace import TracerProvider
        from opentelemetry.sdk.trace.export import BatchSpanProcessor
    except ImportError:
        return False

    endpoint = os.getenv("OTEL_EXPORTER_OTLP_ENDPOINT", "http://localhost:4318").rstrip("/")
    provider = TracerProvider(
        resource=Resource.create(
            {
                "service.name": os.getenv("OTEL_SERVICE_NAME", "mythos-local"),
                "deployment.environment": os.getenv("MYTHOS_ENV", "local"),
            }
        )
    )
    provider.add_span_processor(
        BatchSpanProcessor(OTLPSpanExporter(endpoint=f"{endpoint}/v1/traces"))
    )
    trace.set_tracer_provider(provider)
    _TRACING_CONFIGURED = True
    return True


@contextmanager
def span(name: str, **attributes: Any) -> Iterator[None]:
    if configure_tracing():
        from opentelemetry import trace

        tracer = trace.get_tracer("mythos")
        with tracer.start_as_current_span(name) as active_span:
            for key, value in attributes.items():
                if value is not None:
                    active_span.set_attribute(key, value)
            yield
        return
    yield


@contextmanager
def timed(
    name: str,
    logger: logging.Logger,
    message: str,
    **fields: Any,
) -> Iterator[None]:
    start = perf_counter()
    status = "succeeded"
    try:
        with span(name, **_span_attributes(fields)):
            yield
    except Exception:
        status = "failed"
        raise
    finally:
        latency_ms = round((perf_counter() - start) * 1000, 3)
        logger.info(
            message,
            extra={**fields, "latency_ms": latency_ms, "status": status},
        )


def _span_attributes(fields: dict[str, Any]) -> dict[str, Any]:
    return {
        f"mythos.{key}": value
        for key, value in fields.items()
        if value is not None and isinstance(value, str | int | float | bool)
    }
