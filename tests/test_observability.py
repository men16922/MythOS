import json
import logging
import unittest

from mythos_runtime.observability import JsonFormatter, span, timed


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
