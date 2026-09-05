"""Prompt-trace capture: the workload record that serving experiments read.

The traps pinned here are the ones that would make a trace *look* fine and be
statistically wrong: dropping abandoned streams (which biases every number
toward the happy path), losing the real provider name once the wrapper is
installed, and swallowing provider capabilities the director reaches for by
attribute.
"""

from __future__ import annotations

import json
import os
import tempfile
import unittest
from collections.abc import Iterator
from pathlib import Path
from unittest import mock

from mythos_narrative.trace import (
    TRACE_DIR_ENV,
    TracingProvider,
    clear_trace_fields,
    set_trace_fields,
    unwrap_provider,
    wrap_provider,
)


class _FakeProvider:
    """Stands in for a real provider, including the attributes callers reach for."""

    def __init__(self) -> None:
        self.config = object()
        self.calls: list[str] = []

    def generate(self, messages: list[dict[str, str]], *, model: str | None = None) -> str:
        self.calls.append("generate")
        return "PAYLOAD"

    def generate_story(self, messages: list[dict[str, str]], *, model: str | None = None) -> str:
        self.calls.append("generate_story")
        return "STORY"

    def stream(self, messages: list[dict[str, str]]) -> Iterator[str]:
        self.calls.append("stream")
        yield "a"
        yield "b"
        yield "c"


class TraceCaptureTest(unittest.TestCase):
    def setUp(self) -> None:
        self._tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self._tmp.cleanup)
        self.dir = Path(self._tmp.name)
        patcher = mock.patch.dict(os.environ, {TRACE_DIR_ENV: str(self.dir)})
        patcher.start()
        self.addCleanup(patcher.stop)
        clear_trace_fields()
        self.addCleanup(clear_trace_fields)

    def _records(self) -> list[dict]:
        rows: list[dict] = []
        for path in sorted(self.dir.glob("*.jsonl")):
            for line in path.read_text(encoding="utf-8").splitlines():
                if line.strip():
                    rows.append(json.loads(line))
        return rows

    def test_off_by_default_returns_the_provider_untouched(self) -> None:
        inner = _FakeProvider()
        with mock.patch.dict(os.environ, {TRACE_DIR_ENV: ""}):
            self.assertIs(wrap_provider(inner), inner)

    def test_records_the_prompt_not_only_the_response(self) -> None:
        provider = wrap_provider(_FakeProvider())
        messages = [{"role": "system", "content": "S"}, {"role": "user", "content": "U"}]
        provider.generate(messages)

        (row,) = self._records()
        # The whole point: a transcript keeps the response, a trace keeps the input.
        self.assertEqual(row["messages"], messages)
        self.assertEqual(row["response"], "PAYLOAD")
        self.assertEqual(row["method"], "generate")
        self.assertIn("duration_ms", row)

    def test_per_turn_identity_is_attached(self) -> None:
        provider = wrap_provider(_FakeProvider())
        set_trace_fields(loop_id="loop_x", turn_index=7, language="en")
        provider.generate([{"role": "user", "content": "U"}])

        (row,) = self._records()
        self.assertEqual(row["loop_id"], "loop_x")
        self.assertEqual(row["turn_index"], 7)
        self.assertEqual(row["language"], "en")

    def test_streaming_records_chunks_and_provider_side_first_chunk(self) -> None:
        provider = wrap_provider(_FakeProvider())
        self.assertEqual(list(provider.stream([{"role": "user", "content": "U"}])), ["a", "b", "c"])

        (row,) = self._records()
        self.assertEqual(row["response"], "abc")
        self.assertEqual(row["chunk_count"], 3)
        self.assertIsNotNone(row["first_chunk_ms"])

    def test_an_abandoned_stream_is_still_recorded(self) -> None:
        """A trace that drops failed turns biases every statistic computed from it."""
        provider = wrap_provider(_FakeProvider())
        stream = provider.stream([{"role": "user", "content": "U"}])
        self.assertEqual(next(stream), "a")
        stream.close()  # mid-stream parse failure / client disconnect

        (row,) = self._records()
        self.assertEqual(row["response"], "a")
        self.assertEqual(row["chunk_count"], 1)

    def test_a_failing_call_is_recorded_then_re_raised(self) -> None:
        class _Boom(_FakeProvider):
            def generate(self, messages, *, model=None):  # type: ignore[override]
                raise RuntimeError("provider down")

        provider = wrap_provider(_Boom())
        with self.assertRaises(RuntimeError):
            provider.generate([{"role": "user", "content": "U"}])

        (row,) = self._records()
        self.assertIn("provider down", row["error"])
        self.assertNotIn("response", row)

    def test_unknown_attributes_still_reach_the_provider(self) -> None:
        """_use_dual_model reads provider.config; a wrapper that hides it breaks generation."""
        inner = _FakeProvider()
        provider = wrap_provider(inner)
        self.assertIs(provider.config, inner.config)

    def test_the_real_provider_name_survives_wrapping(self) -> None:
        """Logs record the provider by class name — wrapping must not rewrite it."""
        inner = _FakeProvider()
        wrapped = wrap_provider(inner)
        self.assertIsInstance(wrapped, TracingProvider)
        self.assertIs(unwrap_provider(wrapped), inner)
        self.assertEqual(type(unwrap_provider(wrapped)).__name__, "_FakeProvider")
        # Unwrapping something that was never wrapped is a no-op.
        self.assertIs(unwrap_provider(inner), inner)

    def test_wrapping_is_idempotent(self) -> None:
        provider = wrap_provider(wrap_provider(_FakeProvider()))
        provider.generate([{"role": "user", "content": "U"}])
        self.assertEqual(len(self._records()), 1)

    def test_the_engine_is_recorded_so_traces_can_be_compared_across_engines(self) -> None:
        provider = wrap_provider(_FakeProvider())
        provider.generate_story([{"role": "user", "content": "U"}], model="qwen3:8b-64k")

        (row,) = self._records()
        self.assertEqual(row["provider"], "_FakeProvider")
        self.assertEqual(row["model"], "qwen3:8b-64k")


class LocalGenerationBudgetTest(unittest.TestCase):
    """The local path must be able to finish a scene it starts.

    Two independent faults, both measured 2026-08-30 and both invisible in play
    because the deterministic fallback covered them
    (experiments/results/*-context-overflow, *-option-passthrough):

    1. the sampler was posted in an envelope the OpenAI-compatible endpoint
       discards, so nothing it carried ever applied;
    2. the client timeout was shorter than a legitimate scene, so the SDK burned
       two retries and a slow turn silently cost three generations.
    """

    def test_the_timeout_allows_a_scene_that_legitimately_takes_a_minute(self) -> None:
        from mythos_image_agent.config import AgentConfig

        # Slowest successful local generation observed was 89.3s (itself a retry).
        self.assertGreaterEqual(AgentConfig().ollama_timeout_seconds, 120.0)

    def test_context_length_is_not_pretended_to_be_a_request_parameter(self) -> None:
        """It is a model property: the compat endpoint takes no per-request window.

        A config field for it would be a knob that looks live and does nothing —
        which is the exact failure this session spent its time diagnosing.
        """
        from mythos_image_agent.config import AgentConfig

        self.assertFalse(hasattr(AgentConfig(), "ollama_num_ctx"))
        source = Path("src/mythos_narrative/director.py").read_text(encoding="utf-8")
        self.assertNotIn("num_ctx", source)


if __name__ == "__main__":
    unittest.main()
