"""Key-beat model split tests (2026-07-04).

Opt-in dual-cost narrative: key-beat turns (opening / anchor lock / cutscene /
boss buildup / ending phases) generate on ``GeminiConfig.keybeat_model``
(env ``GEMINI_MODEL_KEYBEAT``) while normal turns stay on the base ``model`` —
the ~$0.5/loop alternative to running 3.5-flash on every turn
(bin/docs/plans/2026-07-04-gemini-2.5-vs-3.5-eval.md §권고 ②). Unset = single model,
byte-identical to prior behavior.
"""

from __future__ import annotations

import json
import unittest
from datetime import UTC, datetime
from unittest import mock

from mythos_core.models import LoopPhase, LoopState, PlayerProfile
from mythos_narrative.director import NarrativeDirector
from mythos_narrative.gemini_provider import GeminiConfig
from mythos_narrative.schemas import NarrativeContext
from mythos_runtime.scenario import load_scenario
from mythos_runtime.scenario_context import build_runtime_narrative_context

_NOW = datetime(2026, 7, 4, tzinfo=UTC)

_VALID_PAYLOAD = json.dumps(
    {
        "scene": {
            "narration": "빗속의 골목, 세린이 손짓한다.",
            "title": "테스트 장면",
            "location": "back_alley",
            "scene_type": "dynamic",
            "choices": [
                {"choice_id": "choice_1", "label": "골목을 따라 이동한다", "intent": "explore"},
                {"choice_id": "choice_2", "label": "몸을 숨기고 관찰한다", "intent": "interact"},
            ],
            "visual_brief": "rainy neon alley",
        },
        "world_delta": {"stability": -1, "tension": 2, "flags": [], "clues": []},
        "end_condition": None,
    },
    ensure_ascii=False,
)


class _KeybeatConfig:
    """Minimal provider config exposing only the keybeat seam (no Ollama attrs,
    so the director stays on the single-model legacy path)."""

    def __init__(self, keybeat_model: str | None) -> None:
        self.keybeat_model = keybeat_model


class _RecordingProvider:
    def __init__(self, keybeat_model: str | None = "gemini-3.5-flash") -> None:
        self.config = _KeybeatConfig(keybeat_model)
        self.models_seen: list[str | None] = []

    def generate(self, messages, *, model=None):  # noqa: ANN001, ANN201
        self.models_seen.append(model)
        return _VALID_PAYLOAD


class _RecordingStreamProvider(_RecordingProvider):
    """Provider with a stream seam — the production (Gemini) shape."""

    def stream(self, messages, *, model=None):  # noqa: ANN001, ANN201
        self.models_seen.append(model)
        yield _VALID_PAYLOAD


class _DegeneratingStreamProvider(_RecordingProvider):
    """Stream degenerates (whitespace runaway) so the director's non-streaming
    retry fires; generate stays valid. models_seen records both calls."""

    def stream(self, messages, *, model=None):  # noqa: ANN001, ANN201
        self.models_seen.append(model)
        yield '{"scene":{"title":"Broken'
        yield " " * 400


def _player() -> PlayerProfile:
    return PlayerProfile("p1", "T", _NOW, _NOW, {"archetype": "ghost"})


def _loop(
    phase: LoopPhase = LoopPhase.EXPLORE, state: dict | None = None
) -> LoopState:
    return LoopState(
        "l", "p1", "seed", phase, "night_market", 70, 30, _NOW, None, state or {}, []
    )


def _context(*, key_beat: bool) -> NarrativeContext:
    return NarrativeContext(
        player=_player(),
        loop=_loop(),
        turn_index=7,
        recent_events=[],
        key_beat=key_beat,
    )


class GeminiConfigKeybeatTest(unittest.TestCase):
    def test_env_reads_keybeat_model(self) -> None:
        with mock.patch.dict(
            "os.environ", {"GEMINI_MODEL_KEYBEAT": "gemini-3.5-flash"}, clear=False
        ):
            self.assertEqual(GeminiConfig(model="gemini-2.5-flash").keybeat_model, "gemini-3.5-flash")

    def test_default_is_unset(self) -> None:
        with mock.patch.dict("os.environ", {}, clear=True):
            self.assertIsNone(GeminiConfig(model="gemini-2.5-flash").keybeat_model)

    def test_gemini3_keybeat_forces_global_endpoint(self) -> None:
        # A single client serves both models; 3.x is only served globally.
        with mock.patch.dict("os.environ", {}, clear=True):
            cfg = GeminiConfig(model="gemini-2.5-flash", keybeat_model="gemini-3.5-flash")
            self.assertEqual(cfg.location, "global")

    def test_regional_stays_without_gemini3(self) -> None:
        with mock.patch.dict("os.environ", {}, clear=True):
            cfg = GeminiConfig(model="gemini-2.5-flash")
            self.assertEqual(cfg.location, "us-central1")

    def test_explicit_gemini_location_still_wins(self) -> None:
        with mock.patch.dict("os.environ", {"GEMINI_LOCATION": "europe-west1"}, clear=True):
            cfg = GeminiConfig(model="gemini-2.5-flash", keybeat_model="gemini-3.5-flash")
            self.assertEqual(cfg.location, "europe-west1")


class DirectorKeybeatOverrideTest(unittest.TestCase):
    def test_key_beat_turn_uses_keybeat_model(self) -> None:
        provider = _RecordingProvider()
        director = NarrativeDirector(provider=provider)
        director.generate_next_scene(_context(key_beat=True))
        self.assertEqual(provider.models_seen, ["gemini-3.5-flash"])

    def test_normal_turn_uses_base_model(self) -> None:
        provider = _RecordingProvider()
        director = NarrativeDirector(provider=provider)
        director.generate_next_scene(_context(key_beat=False))
        self.assertEqual(provider.models_seen, [None])

    def test_key_beat_without_config_stays_base(self) -> None:
        provider = _RecordingProvider(keybeat_model=None)
        director = NarrativeDirector(provider=provider)
        director.generate_next_scene(_context(key_beat=True))
        self.assertEqual(provider.models_seen, [None])

    def test_first_scene_key_beat_also_overrides(self) -> None:
        provider = _RecordingProvider()
        director = NarrativeDirector(provider=provider)
        director.generate_first_scene(_context(key_beat=True))
        self.assertEqual(provider.models_seen, ["gemini-3.5-flash"])


class StreamingKeybeatOverrideTest(unittest.TestCase):
    """Streaming is the production path — routing + its log evidence both locked."""

    def _drain(self, events):  # noqa: ANN001, ANN201
        return list(events)

    def test_stream_key_beat_turn_uses_keybeat_model(self) -> None:
        provider = _RecordingStreamProvider()
        director = NarrativeDirector(provider=provider)
        self._drain(director.stream_next_scene(_context(key_beat=True)))
        self.assertEqual(provider.models_seen, ["gemini-3.5-flash"])

    def test_stream_normal_turn_uses_base_model(self) -> None:
        provider = _RecordingStreamProvider()
        director = NarrativeDirector(provider=provider)
        self._drain(director.stream_next_scene(_context(key_beat=False)))
        self.assertEqual(provider.models_seen, [None])

    def test_stream_first_scene_key_beat_also_overrides(self) -> None:
        provider = _RecordingStreamProvider()
        director = NarrativeDirector(provider=provider)
        self._drain(director.stream_first_scene(_context(key_beat=True)))
        self.assertEqual(provider.models_seen, ["gemini-3.5-flash"])

    def test_stream_finished_log_carries_routing_fields(self) -> None:
        # The A/B verdict is read off model_override/key_beat in prod logs.
        provider = _RecordingStreamProvider()
        director = NarrativeDirector(provider=provider)
        with self.assertLogs("mythos.narrative", level="INFO") as captured:
            self._drain(director.stream_next_scene(_context(key_beat=True)))
        finished = [
            r for r in captured.records if r.getMessage() == "narrative streaming finished"
        ]
        self.assertEqual(len(finished), 1)
        self.assertEqual(getattr(finished[0], "model_override", None), "gemini-3.5-flash")
        self.assertIs(getattr(finished[0], "key_beat", None), True)

    def test_stream_parse_retry_keeps_keybeat_override(self) -> None:
        # The non-streaming retry after a degenerate stream must stay on the
        # key-beat model, not silently drop to base.
        provider = _DegeneratingStreamProvider()
        director = NarrativeDirector(provider=provider)
        self._drain(director.stream_next_scene(_context(key_beat=True)))
        self.assertEqual(provider.models_seen, ["gemini-3.5-flash", "gemini-3.5-flash"])

    def test_stream_finished_log_base_turn_has_empty_override(self) -> None:
        provider = _RecordingStreamProvider()
        director = NarrativeDirector(provider=provider)
        with self.assertLogs("mythos.narrative", level="INFO") as captured:
            self._drain(director.stream_next_scene(_context(key_beat=False)))
        finished = [
            r for r in captured.records if r.getMessage() == "narrative streaming finished"
        ]
        self.assertEqual(len(finished), 1)
        self.assertEqual(getattr(finished[0], "model_override", None), "")
        self.assertIs(getattr(finished[0], "key_beat", None), False)


class ContextBuilderKeybeatTest(unittest.TestCase):
    def _build(self, *, loop: LoopState, turn_index: int) -> NarrativeContext:
        return build_runtime_narrative_context(
            player=_player(),
            loop=loop,
            scenario=load_scenario("neo-seoul"),
            turn_index=turn_index,
            recent_events=[],
            memories=[],
            world_memories=[],
            narrative_shards=[],
            novelty_notes=[],
        )

    def test_opening_turn_is_key_beat(self) -> None:
        ctx = self._build(loop=_loop(phase=LoopPhase.CONNECT), turn_index=0)
        self.assertTrue(ctx.key_beat)

    def test_plain_mid_turn_is_not_key_beat(self) -> None:
        ctx = self._build(loop=_loop(), turn_index=12)
        self.assertFalse(ctx.key_beat)

    def test_pending_boss_marks_key_beat(self) -> None:
        loop = _loop(state={"_pending_boss_combat": {"node_id": "boss"}})
        ctx = self._build(loop=loop, turn_index=12)
        self.assertTrue(ctx.key_beat)

    def test_ending_phases_are_key_beats(self) -> None:
        for phase in (LoopPhase.REWRITE, LoopPhase.ARCHIVE):
            ctx = self._build(loop=_loop(phase=phase), turn_index=30)
            self.assertTrue(ctx.key_beat, phase)


if __name__ == "__main__":
    unittest.main()
