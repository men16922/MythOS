"""Token-usage accounting for the cloud narrative provider.

Motivation: the 2026-08-13 promotion eval could not state a real
`cost_per_loop_usd` for any frozen sample because nothing recorded token counts.
These tests pin the two ways a naive implementation gets the arithmetic wrong --
a streamed turn multiplying its count by the number of chunks, and a retried turn
dropping the first call -- plus the isolation that keeps one turn's counts out of
the next turn's log.
"""

from __future__ import annotations

import unittest
from collections.abc import Generator
from typing import Any, cast

from mythos_narrative.gemini_provider import VertexGeminiJSONProvider
from mythos_narrative.usage import clear_usage, normalize_usage, record_usage, take_usage


class _Usage:
    def __init__(self, prompt: int, output: int, total: int) -> None:
        self.prompt_token_count = prompt
        self.candidates_token_count = output
        self.total_token_count = total


class _Chunk:
    def __init__(self, text: str | None, usage: Any = None) -> None:
        self.text = text
        self.usage_metadata = usage


class _Response:
    def __init__(self, text: str, usage: Any = None) -> None:
        self.text = text
        self.usage_metadata = usage


class _FakeModels:
    def __init__(self, response: Any = None, chunks: list[_Chunk] | None = None) -> None:
        self._response = response
        self._chunks = chunks or []

    def generate_content(self, **_kwargs: Any) -> Any:
        return self._response

    def generate_content_stream(self, **_kwargs: Any) -> Any:
        return iter(self._chunks)


class _FakeClient:
    def __init__(self, response: Any = None, chunks: list[_Chunk] | None = None) -> None:
        self.models = _FakeModels(response, chunks)


class NormalizeUsageTest(unittest.TestCase):
    def setUp(self) -> None:
        clear_usage()

    def test_missing_usage_contributes_no_fields(self) -> None:
        # Zeros would silently drag a cost average down; absence must stay absent.
        self.assertEqual(normalize_usage(None), {})
        self.assertEqual(normalize_usage(object()), {})

    def test_non_integer_and_negative_counters_are_skipped(self) -> None:
        class Odd:
            prompt_token_count = "120"
            candidates_token_count = -5
            total_token_count = 300

        self.assertEqual(normalize_usage(Odd()), {"total_tokens": 300})


class UsageAccumulationTest(unittest.TestCase):
    def setUp(self) -> None:
        clear_usage()

    def test_two_calls_in_one_turn_are_summed(self) -> None:
        # The streamed path retries non-streaming on an unparseable stream, and
        # both calls are billed. Keeping only the last under-reports the turns
        # that cost the most.
        record_usage(_Usage(100, 20, 120))
        record_usage(_Usage(100, 30, 130))
        self.assertEqual(
            take_usage(),
            {
                "prompt_tokens": 200,
                "output_tokens": 50,
                "total_tokens": 250,
                "provider_calls": 2,
            },
        )

    def test_take_clears_so_the_next_turn_starts_empty(self) -> None:
        record_usage(_Usage(10, 5, 15))
        take_usage()
        self.assertEqual(take_usage(), {})

    def test_clear_drops_counts_a_failed_turn_never_logged(self) -> None:
        record_usage(_Usage(10, 5, 15))
        clear_usage()
        self.assertEqual(take_usage(), {})


class GeminiProviderUsageTest(unittest.TestCase):
    def setUp(self) -> None:
        clear_usage()

    def test_generate_records_the_response_usage(self) -> None:
        client = _FakeClient(response=_Response('{"a": 1}', _Usage(900, 300, 1200)))
        provider = VertexGeminiJSONProvider(client=client)

        self.assertEqual(provider.generate([{"role": "user", "content": "hi"}]), '{"a": 1}')
        self.assertEqual(
            take_usage(),
            {
                "prompt_tokens": 900,
                "output_tokens": 300,
                "total_tokens": 1200,
                "provider_calls": 1,
            },
        )

    def test_stream_counts_cumulative_chunk_usage_once(self) -> None:
        # Gemini repeats usage_metadata on chunks cumulatively. Recording each one
        # would multiply the turn's tokens by the number of chunks carrying it.
        chunks = [
            _Chunk("{", _Usage(900, 10, 910)),
            _Chunk('"a"', _Usage(900, 20, 920)),
            _Chunk(": 1}", _Usage(900, 30, 930)),
        ]
        provider = VertexGeminiJSONProvider(client=_FakeClient(chunks=chunks))

        self.assertEqual("".join(provider.stream([{"role": "user", "content": "hi"}])), '{"a": 1}')
        self.assertEqual(
            take_usage(),
            {
                "prompt_tokens": 900,
                "output_tokens": 30,
                "total_tokens": 930,
                "provider_calls": 1,
            },
        )

    def test_abandoned_stream_still_records_what_it_produced(self) -> None:
        chunks = [_Chunk("{", _Usage(900, 10, 910)), _Chunk('"a": 1}', _Usage(900, 20, 920))]
        provider = VertexGeminiJSONProvider(client=_FakeClient(chunks=chunks))

        stream = cast(Generator[str, None, None], provider.stream([{"role": "user", "content": "hi"}]))
        next(stream)
        stream.close()

        self.assertEqual(take_usage().get("total_tokens"), 910)

    def test_provider_reporting_nothing_adds_no_fields(self) -> None:
        provider = VertexGeminiJSONProvider(client=_FakeClient(response=_Response("{}")))

        provider.generate([{"role": "user", "content": "hi"}])
        self.assertEqual(take_usage(), {})


class _RetryingUsageProvider:
    """Streams something unparseable, then serves a valid payload on the retry.

    Records usage on BOTH calls, which is what really happens: the stream is
    billed even when its output cannot be parsed.
    """

    VALID = (
        '{"scene": {"title": "Recovered", "location": "data-layer-01",'
        ' "narration": "A real scene arrives on the retry.",'
        ' "choices": [{"choice_id": "c1", "label": "Go", "intent": "explore"},'
        ' {"choice_id": "c2", "label": "Wait", "intent": "hold"}],'
        ' "visual_brief": "rain"},'
        ' "world_delta": {"stability": -1, "tension": 2, "flags": []}}'
    )

    def stream(self, messages: Any, model: Any = None) -> Any:
        def _gen() -> Any:
            yield '{"scene": {"title": "Broken'
            yield "        "
            record_usage(_Usage(900, 40, 940))

        return _gen()

    def generate(self, messages: Any, model: Any = None) -> str:
        record_usage(_Usage(900, 120, 1020))
        return self.VALID


class StreamedTurnLogTest(unittest.TestCase):
    """The counts must reach the structured turn log, not just the ContextVar."""

    def setUp(self) -> None:
        clear_usage()

    def test_streamed_turn_logs_summed_tokens_for_stream_plus_retry(self) -> None:
        from datetime import UTC, datetime

        from mythos_core import LoopPhase, LoopState, PlayerProfile
        from mythos_narrative.director import NarrativeDirector
        from mythos_narrative.schemas import NarrativeContext

        now = datetime(2026, 8, 13, tzinfo=UTC)
        context = NarrativeContext(
            player=PlayerProfile(
                player_id="player_u", display_name="U", created_at=now, updated_at=now
            ),
            loop=LoopState(
                loop_id="loop_u",
                player_id="player_u",
                seed="seed_u",
                phase=LoopPhase.EXPLORE,
                location_id="data-layer-01",
                stability=70,
                tension=50,
                started_at=now,
            ),
            turn_index=9,
            recent_events=[],
            fast_mode=True,
        )
        director = NarrativeDirector(provider=_RetryingUsageProvider())

        with self.assertLogs(director.logger, level="INFO") as captured:
            list(director.stream_next_scene(context))

        finished = [r for r in captured.records if r.getMessage() == "narrative streaming finished"]
        self.assertEqual(len(finished), 1)
        # `extra=` fields land in __dict__, which is also what JsonFormatter reads.
        fields = finished[0].__dict__
        self.assertEqual(fields["loop_id"], "loop_u")
        # 900+900 prompt, 40+120 output, 940+1020 total, across 2 billed calls.
        self.assertEqual(fields["prompt_tokens"], 1800)
        self.assertEqual(fields["output_tokens"], 160)
        self.assertEqual(fields["total_tokens"], 1960)
        self.assertEqual(fields["provider_calls"], 2)


class JsonFormatterTest(unittest.TestCase):
    """The counts must survive JSON formatting, not just reach the LogRecord.

    The formatter carries an explicit field allowlist, so a new `extra` key is
    dropped silently — the feature would look correct in a LogRecord assertion
    while Cloud Logging received nothing, leaving per-loop cost unrecoverable.
    """

    def test_token_fields_are_emitted_in_the_json_payload(self) -> None:
        import json
        import logging

        from mythos_runtime.observability import JsonFormatter

        record = logging.LogRecord(
            name="mythos",
            level=logging.INFO,
            pathname=__file__,
            lineno=1,
            msg="narrative streaming finished",
            args=(),
            exc_info=None,
        )
        record.loop_id = "loop_u"
        record.prompt_tokens = 1800
        record.output_tokens = 160
        record.total_tokens = 1960
        record.provider_calls = 2

        payload = json.loads(JsonFormatter().format(record))

        self.assertEqual(payload["loop_id"], "loop_u")
        self.assertEqual(payload["prompt_tokens"], 1800)
        self.assertEqual(payload["output_tokens"], 160)
        self.assertEqual(payload["total_tokens"], 1960)
        self.assertEqual(payload["provider_calls"], 2)


if __name__ == "__main__":
    unittest.main()
