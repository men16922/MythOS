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

from mythos_runtime.settings import load_runtime_settings

_TRACING_CONFIGURED = False


class JsonFormatter(logging.Formatter):
    def __init__(self, debug: bool = False) -> None:
        super().__init__()
        self.debug = debug

    def format(self, record: logging.LogRecord) -> str:
        payload: dict[str, Any] = {
            "ts": datetime.fromtimestamp(record.created, UTC).isoformat(),
            "level": record.levelname.lower(),
            "logger": record.name,
            "message": record.getMessage(),
        }
        if self.debug:
            payload.update(
                {
                    "module": record.module,
                    "func": record.funcName,
                    "line": record.lineno,
                }
            )
        for key in (
            "player_id",
            "loop_id",
            "scene_id",
            "event_id",
            "asset_id",
            "provider",
            "model_id",
            # Key-beat model-split routing evidence (director streaming/timed logs);
            # the hybrid A/B verdict is read off these in Cloud Run logs.
            "model_override",
            "key_beat",
            "latency_ms",
            "provider_ms",
            "postprocess_ms",
            "storage_ms",
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
    settings = load_runtime_settings()
    final_level = (level or settings.log_level).upper()
    logger.setLevel(final_level)
    logger.propagate = False
    for handler in list(logger.handlers):
        if (
            isinstance(handler.formatter, JsonFormatter)
            and handler.formatter.debug != settings.debug
        ):
            logger.removeHandler(handler)
    has_json_handler = any(isinstance(h.formatter, JsonFormatter) for h in logger.handlers)
    if not has_json_handler:
        handler = logging.StreamHandler(sys.stderr)
        handler.setFormatter(JsonFormatter(debug=settings.debug))
        logger.addHandler(handler)


def get_logger(name: str) -> logging.Logger:
    configure_logging()
    return logging.getLogger(name)


def _trace_backend() -> str:
    """Trace export backend: ``otlp`` (default, local collector), ``gcp`` (Cloud Trace),
    or ``none`` (disabled). Cloud Run with no collector should use gcp or none so the
    OTLP exporter doesn't retry against an absent endpoint."""
    return (os.getenv("MYTHOS_TRACE_BACKEND") or "otlp").strip().lower()


def configure_tracing() -> bool:
    global _TRACING_CONFIGURED
    if _TRACING_CONFIGURED:
        return True

    backend = _trace_backend()
    if backend in {"none", "off", "disabled"}:
        return False

    try:
        from opentelemetry import trace
        from opentelemetry.sdk.resources import Resource
        from opentelemetry.sdk.trace import TracerProvider
        from opentelemetry.sdk.trace.export import BatchSpanProcessor
    except ImportError:
        return False

    settings = load_runtime_settings()

    if backend in {"gcp", "cloud-trace", "cloudtrace"}:
        # Cloud Trace via ADC (Cloud Run SA needs roles/cloudtrace.agent). Optional dep
        # `opentelemetry-exporter-gcp-trace` (pyproject [gcp]); fall back to no tracing.
        try:
            from opentelemetry.exporter.cloud_trace import CloudTraceSpanExporter
        except ImportError:
            return False
        exporter: Any = CloudTraceSpanExporter()
    else:
        from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter

        exporter = OTLPSpanExporter(endpoint=f"{settings.otel_endpoint}/v1/traces")

    provider = TracerProvider(
        resource=Resource.create(
            {
                "service.name": settings.service_name,
                "deployment.environment": settings.environment,
            }
        )
    )
    provider.add_span_processor(BatchSpanProcessor(exporter))
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


def set_span_attribute(key: str, value: Any) -> None:
    try:
        from opentelemetry import trace

        current_span = trace.get_current_span()
        if current_span and current_span.is_recording():
            current_span.set_attribute(key, value)
    except ImportError:
        pass
