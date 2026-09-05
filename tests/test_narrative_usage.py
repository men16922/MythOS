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

        stream = cast(
            Generator[str, None, None], provider.stream([{"role": "user", "content": "hi"}])
        )
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


class _OAUsage:
    """OpenAI ``CompletionUsage`` shape, as Ollama's compat endpoint returns it."""

    def __init__(self, prompt: int, completion: int, total: int) -> None:
        self.prompt_tokens = prompt
        self.completion_tokens = completion
        self.total_tokens = total


class _OADelta:
    def __init__(self, content: str | None) -> None:
        self.content = content


class _OAChoice:
    def __init__(self, content: str | None) -> None:
        self.delta = _OADelta(content)
        self.message = _OADelta(content)


class _OAChunk:
    def __init__(self, content: str | None, usage: Any = None) -> None:
        self.choices = [_OAChoice(content)] if content is not None else []
        self.usage = usage


class _OAResponse:
    def __init__(self, content: str, usage: Any = None) -> None:
        self.choices = [_OAChoice(content)]
        self.usage = usage


class _OACompletions:
    def __init__(self, response: Any = None, chunks: list[_OAChunk] | None = None) -> None:
        self._response = response
        self._chunks = chunks or []
        self.calls: list[dict[str, Any]] = []

    def create(self, **kwargs: Any) -> Any:
        self.calls.append(kwargs)
        if kwargs.get("stream"):
            return iter(self._chunks)
        return self._response


class _OAClient:
    def __init__(self, response: Any = None, chunks: list[_OAChunk] | None = None) -> None:
        self.completions = _OACompletions(response, chunks)
        self.chat = self


def _ollama_provider(client: _OAClient) -> Any:
    from unittest.mock import patch

    from mythos_image_agent.config import AgentConfig
    from mythos_narrative.director import OllamaJSONProvider

    # Same story/parser model → the director takes the single-model stream path.
    config = AgentConfig(ollama_model="m", ollama_model_story="m", ollama_model_parser="m")
    provider = OllamaJSONProvider(config=config)
    patcher = patch.object(OllamaJSONProvider, "_client", lambda self: client)
    patcher.start()
    return provider, patcher


class OllamaProviderUsageTest(unittest.TestCase):
    """P0-2 residual (NEXT_PLAN serving-research): the local path returned
    ``prompt_eval_count``/``eval_count`` — surfaced by the OpenAI-compat endpoint
    as ``usage.prompt_tokens``/``completion_tokens`` — and recorded them nowhere,
    so a local turn could never state its token cost."""

    def setUp(self) -> None:
        clear_usage()
        self._patcher: Any = None

    def tearDown(self) -> None:
        if self._patcher is not None:
            self._patcher.stop()

    def test_openai_usage_vocabulary_normalises(self) -> None:
        self.assertEqual(
            normalize_usage(_OAUsage(700, 150, 850)),
            {"prompt_tokens": 700, "output_tokens": 150, "total_tokens": 850},
        )

    def test_object_carrying_both_vocabularies_does_not_double_count(self) -> None:
        class Both:
            prompt_token_count = 10
            prompt_tokens = 99
            candidates_token_count = 5
            completion_tokens = 99

        self.assertEqual(normalize_usage(Both()), {"prompt_tokens": 10, "output_tokens": 5})

    def test_generate_records_response_usage(self) -> None:
        client = _OAClient(response=_OAResponse('{"a": 1}', _OAUsage(700, 150, 850)))
        provider, self._patcher = _ollama_provider(client)

        self.assertEqual(provider.generate([{"role": "user", "content": "hi"}]), '{"a": 1}')
        self.assertEqual(
            take_usage(),
            {"prompt_tokens": 700, "output_tokens": 150, "total_tokens": 850, "provider_calls": 1},
        )

    def test_story_and_json_paths_record_usage_too(self) -> None:
        client = _OAClient(response=_OAResponse("text", _OAUsage(10, 5, 15)))
        provider, self._patcher = _ollama_provider(client)

        provider.generate_story([{"role": "user", "content": "hi"}])
        provider.generate_json([{"role": "user", "content": "hi"}])
        self.assertEqual(take_usage()["provider_calls"], 2)

    def test_stream_requests_usage_and_records_the_final_empty_chunk(self) -> None:
        # With stream_options.include_usage the compat server appends one chunk
        # with choices == [] carrying usage. It must be recorded, and the empty
        # choices list must not raise (the old loop indexed choices[0]).
        chunks = [
            _OAChunk("{"),
            _OAChunk('"a": 1'),
            _OAChunk("}"),
            _OAChunk(None, _OAUsage(700, 30, 730)),
        ]
        client = _OAClient(chunks=chunks)
        provider, self._patcher = _ollama_provider(client)

        self.assertEqual("".join(provider.stream([{"role": "user", "content": "hi"}])), '{"a": 1}')
        self.assertEqual(client.completions.calls[0]["stream_options"], {"include_usage": True})
        self.assertEqual(
            take_usage(),
            {"prompt_tokens": 700, "output_tokens": 30, "total_tokens": 730, "provider_calls": 1},
        )

    def test_stream_without_usage_chunk_still_streams_and_logs_nothing(self) -> None:
        # An older server ignoring stream_options: behaviour unchanged, no zeros.
        client = _OAClient(chunks=[_OAChunk("{"), _OAChunk("}")])
        provider, self._patcher = _ollama_provider(client)

        self.assertEqual("".join(provider.stream_story([{"role": "user", "content": "hi"}])), "{}")
        self.assertEqual(take_usage(), {})

    def test_local_streamed_turn_logs_prompt_and_output_tokens(self) -> None:
        """Done-criterion of the NEXT_PLAN item: a local turn logs the counts."""
        from datetime import UTC, datetime

        from mythos_core import LoopPhase, LoopState, PlayerProfile
        from mythos_narrative.director import NarrativeDirector
        from mythos_narrative.schemas import NarrativeContext

        valid = _RetryingUsageProvider.VALID
        half = len(valid) // 2
        chunks = [
            _OAChunk(valid[:half]),
            _OAChunk(valid[half:]),
            _OAChunk(None, _OAUsage(1200, 260, 1460)),
        ]
        client = _OAClient(chunks=chunks)
        provider, self._patcher = _ollama_provider(client)
        director = NarrativeDirector(provider=provider)

        now = datetime(2026, 9, 5, tzinfo=UTC)
        context = NarrativeContext(
            player=PlayerProfile(
                player_id="player_o", display_name="O", created_at=now, updated_at=now
            ),
            loop=LoopState(
                loop_id="loop_o",
                player_id="player_o",
                seed="seed_o",
                phase=LoopPhase.EXPLORE,
                location_id="data-layer-01",
                stability=70,
                tension=50,
                started_at=now,
            ),
            turn_index=3,
            recent_events=[],
            fast_mode=True,
        )

        with self.assertLogs(director.logger, level="INFO") as captured:
            events = list(director.stream_next_scene(context))

        self.assertEqual(events[-1].kind, "final")
        finished = [r for r in captured.records if r.getMessage() == "narrative streaming finished"]
        self.assertEqual(len(finished), 1)
        fields = finished[0].__dict__
        self.assertEqual(fields["loop_id"], "loop_o")
        self.assertEqual(fields["prompt_tokens"], 1200)
        self.assertEqual(fields["output_tokens"], 260)
        self.assertEqual(fields["provider_calls"], 1)


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
