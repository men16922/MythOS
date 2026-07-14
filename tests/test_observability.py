import json
import logging
import os
import unittest
from unittest import mock

from mythos_runtime.observability import (
    JsonFormatter,
    _trace_backend,
    configure_logging,
    configure_tracing,
    span,
    timed,
)


class ObservabilityTest(unittest.TestCase):
    def test_json_formatter_includes_mythos_fields(self) -> None:
        record = logging.LogRecord(
            name="mythos.test",
            level=logging.INFO,
            pathname=__file__,
            lineno=10,
            msg="done",
            args=(),
            exc_info=None,
        )
        record.loop_id = "loop_1"
        record.scene_id = "scene_1"
        record.status = "succeeded"

        payload = json.loads(JsonFormatter().format(record))

        self.assertEqual(payload["message"], "done")
        self.assertEqual(payload["loop_id"], "loop_1")
        self.assertEqual(payload["scene_id"], "scene_1")
        self.assertEqual(payload["status"], "succeeded")

    def test_json_formatter_emits_keybeat_routing_fields(self) -> None:
        # The hybrid A/B verdict is read off these fields in Cloud Run logs;
        # the formatter whitelists keys, so absence here = silently dropped.
        record = logging.LogRecord(
            name="mythos.narrative",
            level=logging.INFO,
            pathname=__file__,
            lineno=10,
            msg="narrative streaming finished",
            args=(),
            exc_info=None,
        )
        record.model_override = "gemini-3.5-flash"
        record.key_beat = False

        payload = json.loads(JsonFormatter().format(record))

        self.assertEqual(payload["model_override"], "gemini-3.5-flash")
        self.assertIs(payload["key_beat"], False)

    def test_debug_formatter_includes_source_location(self) -> None:
        record = logging.LogRecord(
            name="mythos.test",
            level=logging.DEBUG,
            pathname=__file__,
            lineno=42,
            msg="debug detail",
            args=(),
            exc_info=None,
        )

        payload = json.loads(JsonFormatter(debug=True).format(record))

        self.assertEqual(payload["level"], "debug")
        self.assertEqual(payload["module"], "test_observability")
        self.assertEqual(payload["func"], None)
        self.assertEqual(payload["line"], 42)

    def test_configure_logging_uses_debug_env(self) -> None:
        old_debug = os.environ.get("MYTHOS_DEBUG")
        old_level = os.environ.get("MYTHOS_LOG_LEVEL")
        os.environ["MYTHOS_DEBUG"] = "1"
        os.environ.pop("MYTHOS_LOG_LEVEL", None)
        try:
            configure_logging()
            logger = logging.getLogger("mythos")
            self.assertEqual(logger.level, logging.DEBUG)
            self.assertTrue(
                any(
                    isinstance(handler.formatter, JsonFormatter) and handler.formatter.debug
                    for handler in logger.handlers
                )
            )
        finally:
            if old_debug is None:
                os.environ.pop("MYTHOS_DEBUG", None)
            else:
                os.environ["MYTHOS_DEBUG"] = old_debug
            if old_level is None:
                os.environ.pop("MYTHOS_LOG_LEVEL", None)
            else:
                os.environ["MYTHOS_LOG_LEVEL"] = old_level
            configure_logging()

    def test_span_context_manager_is_safe(self) -> None:
        with span("test.span", loop_id="loop_1"):
            value = 1 + 1

        self.assertEqual(value, 2)

    def test_timed_logs_latency(self) -> None:
        logger = logging.getLogger("mythos.test.timed")
        records = []

        class CollectHandler(logging.Handler):
            def emit(self, record: logging.LogRecord) -> None:
                records.append(record)

        handler = CollectHandler()
        logger.addHandler(handler)
        logger.setLevel(logging.INFO)
        logger.propagate = False
        try:
            with timed("test.timed", logger, "finished", loop_id="loop_1"):
                pass
        finally:
            logger.removeHandler(handler)
            logger.propagate = True

        self.assertEqual(getattr(records[0], "loop_id"), "loop_1")
        self.assertEqual(getattr(records[0], "status"), "succeeded")
        self.assertGreaterEqual(getattr(records[0], "latency_ms"), 0)


class TraceBackendTest(unittest.TestCase):
    def test_backend_selection_from_env(self) -> None:
        with mock.patch.dict(os.environ, {}, clear=False):
            os.environ.pop("MYTHOS_TRACE_BACKEND", None)
            self.assertEqual(_trace_backend(), "otlp")  # default
        with mock.patch.dict(os.environ, {"MYTHOS_TRACE_BACKEND": "GCP"}):
            self.assertEqual(_trace_backend(), "gcp")

    def test_none_backend_disables_tracing(self) -> None:
        # `none` short-circuits before any exporter import → tracing off, span() still safe.
        import mythos_runtime.observability as obs

        with mock.patch.object(obs, "_TRACING_CONFIGURED", False):
            with mock.patch.dict(os.environ, {"MYTHOS_TRACE_BACKEND": "none"}):
                self.assertFalse(configure_tracing())
        with span("test.span.disabled"):
            pass  # must not raise even with tracing disabled
