"""Tests for the Gemini/Vertex narrative provider wedge (cloud product LLM).

Covers, without the `google-genai` SDK installed (a fake client is injected):
  * schema conversion `to_gemini_schema` (JSON-schema → Vertex `response_schema`);
  * `_split_messages` role mapping (system_instruction vs user contents);
  * `build_narrative_provider` selection by `MYTHOS_NARRATIVE_PROVIDER`;
  * `VertexGeminiJSONProvider.generate` controlled-generation round-trip;
  * the director's single-model legacy path parsing the controlled-generation JSON
    on the FIRST try — no parser model, no repair round-trip (the whole point of the
    Gemini wedge vs. the local dual-model dance).
"""

from __future__ import annotations

import json
import os
import types
import unittest
from datetime import UTC, datetime
from typing import Any
from unittest import mock

from mythos_core import LoopPhase, LoopState, PlayerProfile
from mythos_narrative import NarrativeContext, NarrativeDirector
from mythos_narrative.director import OllamaJSONProvider
from mythos_narrative.gemini_provider import (
    SCENE_GEMINI_SCHEMA,
    GeminiConfig,
    VertexGeminiJSONProvider,
    build_narrative_provider,
    to_gemini_schema,
)
from mythos_narrative.schemas import SCENE_JSON_SCHEMA


def _scene_json(title: str = "Threshold") -> str:
    """A controlled-generation payload that parses cleanly on the first try."""
    return json.dumps(
        {
            "scene": {
                "title": title,
                "location": "data-layer-01",
                "narration": "The gate opens onto a flooded server hall.",
                "visual_brief": "A luminous access gate, rain on glass.",
                "objective": None,
                "action_result": None,
                "scene_type": "static",
                "choices": [
                    {"choice_id": "choice_1", "label": "Enter", "intent": "explore"},
                ],
            },
            "world_delta": {"stability": 0, "tension": 2, "flags": ["opened"]},
            "end_condition": None,
        }
    )


class _FakeModels:
    def __init__(self, response_text: str, stream_chunks: list[str] | None = None) -> None:
        self._response_text = response_text
        self._stream_chunks = stream_chunks or []
        self.calls: list[dict[str, Any]] = []
        self.stream_calls: list[dict[str, Any]] = []

    def generate_content(self, *, model: str, contents: str, config: Any):
        self.calls.append({"model": model, "contents": contents, "config": config})
        return types.SimpleNamespace(text=self._response_text)

    def generate_content_stream(self, *, model: str, contents: str, config: Any):
        self.stream_calls.append({"model": model, "contents": contents, "config": config})
        for chunk in self._stream_chunks:
            yield types.SimpleNamespace(text=chunk)
        # A trailing empty-text chunk (Gemini emits these) must be skipped.
        yield types.SimpleNamespace(text=None)


class _FakeGeminiClient:
    """Stands in for `google.genai.Client` — only `.models.generate_content*` is used."""

    def __init__(self, response_text: str, stream_chunks: list[str] | None = None) -> None:
        self.models = _FakeModels(response_text, stream_chunks)


class ToGeminiSchemaTest(unittest.TestCase):
    def setUp(self) -> None:
        self.schema = SCENE_GEMINI_SCHEMA

    def test_top_level_is_object(self) -> None:
        self.assertEqual(self.schema["type"], "OBJECT")
        self.assertIn("scene", self.schema["properties"])
        self.assertEqual(self.schema["required"], ["scene"])

    def test_nullable_union_becomes_nullable_typed(self) -> None:
        # ["string", "null"] → STRING + nullable: True (the Schema proto has no union).
        objective = self.schema["properties"]["scene"]["properties"]["objective"]
        self.assertEqual(objective["type"], "STRING")
        self.assertTrue(objective["nullable"])
        # A non-nullable field carries no `nullable` key.
        title = self.schema["properties"]["scene"]["properties"]["title"]
        self.assertEqual(title["type"], "STRING")
        self.assertNotIn("nullable", title)

    def test_array_items_and_required_recurse(self) -> None:
        choices = self.schema["properties"]["scene"]["properties"]["choices"]
        self.assertEqual(choices["type"], "ARRAY")
        item = choices["items"]
        self.assertEqual(item["type"], "OBJECT")
        self.assertEqual(item["required"], ["choice_id", "label", "intent"])
        self.assertEqual(item["properties"]["label"]["type"], "STRING")

    def test_integer_and_nullable_integer(self) -> None:
        wd = self.schema["properties"]["world_delta"]["properties"]
        self.assertEqual(wd["stability"]["type"], "INTEGER")
        self.assertEqual(wd["hp"]["type"], "INTEGER")
        self.assertTrue(wd["hp"]["nullable"])

    def test_enum_preserved(self) -> None:
        converted = to_gemini_schema({"type": "string", "enum": ["explore", "press", "retreat"]})
        self.assertEqual(converted["type"], "STRING")
        self.assertEqual(converted["enum"], ["explore", "press", "retreat"])

    def test_non_dict_passthrough(self) -> None:
        self.assertEqual(to_gemini_schema("scalar"), "scalar")

    def test_does_not_mutate_source(self) -> None:
        # Conversion must not alter the runtime's canonical Ollama schema.
        self.assertEqual(
            SCENE_JSON_SCHEMA["properties"]["scene"]["properties"]["objective"]["type"],
            ["string", "null"],
        )


class GeminiConfigEnvAliasTest(unittest.TestCase):
    """Config reads env at construction and honors the google-genai SDK's native names
    (the user's .env uses MODEL / PROJECT_ID / GOOGLE_GENAI_USE_VERTEXAI)."""

    def test_reads_sdk_native_names(self) -> None:
        env = {
            "MODEL": "gemini-2.5-pro",
            "PROJECT_ID": "proj-abc",
            "GOOGLE_CLOUD_LOCATION": "asia-northeast3",
            "GOOGLE_GENAI_USE_VERTEXAI": "TRUE",
        }
        with mock.patch.dict(os.environ, env, clear=False):
            for k in ("GEMINI_MODEL", "GOOGLE_CLOUD_PROJECT", "GEMINI_USE_VERTEX"):
                os.environ.pop(k, None)
            cfg = GeminiConfig()
        self.assertEqual(cfg.model, "gemini-2.5-pro")
        self.assertEqual(cfg.project, "proj-abc")
        self.assertEqual(cfg.location, "asia-northeast3")
        self.assertTrue(cfg.use_vertex)

    def test_namespaced_alias_takes_precedence(self) -> None:
        with mock.patch.dict(os.environ, {"GEMINI_MODEL": "ns-model", "MODEL": "sdk-model"}):
            cfg = GeminiConfig()
        self.assertEqual(cfg.model, "ns-model")

    def test_defaults_when_unset(self) -> None:
        # Default pinned to 3.5 by the 2026-07-17 A/B rollback verdict (DECISIONS.md).
        with mock.patch.dict(os.environ, {}, clear=True):
            cfg = GeminiConfig()
        self.assertEqual(cfg.model, "gemini-3.5-flash")
        # 3.x models auto-route to the "global" endpoint (regional 404s) — with a
        # 3.5 default model, the default location follows.
        self.assertEqual(cfg.location, "global")
        self.assertTrue(cfg.use_vertex)
        self.assertIsNone(cfg.project)
        self.assertEqual(cfg.thinking_budget, 0)  # thinking disabled by default

    def test_gemini3_auto_resolves_to_global_location(self) -> None:
        # Gemini 3.x lives only on the global endpoint; GOOGLE_CLOUD_LOCATION stays
        # regional for Imagen, so MODEL=gemini-3.5-flash must not inherit it.
        env = {"MODEL": "gemini-3.5-flash", "GOOGLE_CLOUD_LOCATION": "us-central1"}
        with mock.patch.dict(os.environ, env, clear=True):
            cfg = GeminiConfig()
        self.assertEqual(cfg.location, "global")

    def test_gemini3_explicit_gemini_location_wins(self) -> None:
        env = {"MODEL": "gemini-3.5-flash", "GEMINI_LOCATION": "us-central1"}
        with mock.patch.dict(os.environ, env, clear=True):
            cfg = GeminiConfig()
        self.assertEqual(cfg.location, "us-central1")

    def test_explicit_constructor_location_wins_over_auto(self) -> None:
        with mock.patch.dict(os.environ, {}, clear=True):
            cfg = GeminiConfig(model="gemini-3.5-flash", location="europe-west1")
        self.assertEqual(cfg.location, "europe-west1")


class BuildNarrativeProviderTest(unittest.TestCase):
    def test_default_selects_ollama(self) -> None:
        with mock.patch.dict(os.environ, {}, clear=False):
            os.environ.pop("MYTHOS_NARRATIVE_PROVIDER", None)
            provider = build_narrative_provider()
        self.assertIsInstance(provider, OllamaJSONProvider)

    def test_gemini_selects_vertex_provider(self) -> None:
        for name in ("gemini", "vertex", "Gemini", " VERTEX "):
            with mock.patch.dict(os.environ, {"MYTHOS_NARRATIVE_PROVIDER": name}):
                provider = build_narrative_provider()
            self.assertIsInstance(provider, VertexGeminiJSONProvider, name)


class VertexGeminiProviderTest(unittest.TestCase):
    def test_generate_passes_schema_and_splits_system(self) -> None:
        client = _FakeGeminiClient(_scene_json())
        provider = VertexGeminiJSONProvider(GeminiConfig(model="gemini-2.5-flash"), client=client)
        out = provider.generate(
            [
                {"role": "system", "content": "You are the GM."},
                {"role": "user", "content": "Begin the loop."},
            ]
        )
        self.assertEqual(json.loads(out)["scene"]["title"], "Threshold")
        self.assertEqual(len(client.models.calls), 1)
        call = client.models.calls[0]
        self.assertEqual(call["model"], "gemini-2.5-flash")
        self.assertEqual(call["contents"], "Begin the loop.")
        cfg = call["config"]
        self.assertEqual(cfg["system_instruction"], "You are the GM.")
        self.assertEqual(cfg["response_mime_type"], "application/json")
        self.assertIs(cfg["response_schema"], SCENE_GEMINI_SCHEMA)
        # Thinking disabled (budget 0) so 2.5 reasoning tokens don't starve the JSON
        # out of max_output_tokens (root cause of intermittent first-parse failure).
        self.assertEqual(cfg["thinking_config"], {"thinking_budget": 0})

    def test_thinking_budget_is_configurable(self) -> None:
        client = _FakeGeminiClient(_scene_json())
        provider = VertexGeminiJSONProvider(GeminiConfig(thinking_budget=512), client=client)
        provider.generate([{"role": "user", "content": "x"}])
        self.assertEqual(
            client.models.calls[0]["config"]["thinking_config"], {"thinking_budget": 512}
        )

    def test_generate_handles_missing_text(self) -> None:
        client = _FakeGeminiClient(response_text=None)  # type: ignore[arg-type]
        provider = VertexGeminiJSONProvider(client=client)
        self.assertEqual(provider.generate([{"role": "user", "content": "x"}]), "")

    def test_model_override_argument(self) -> None:
        client = _FakeGeminiClient(_scene_json())
        provider = VertexGeminiJSONProvider(GeminiConfig(model="gemini-2.5-flash"), client=client)
        provider.generate([{"role": "user", "content": "x"}], model="gemini-2.5-pro")
        self.assertEqual(client.models.calls[0]["model"], "gemini-2.5-pro")

    def test_stream_yields_text_chunks_and_skips_empty(self) -> None:
        client = _FakeGeminiClient("", stream_chunks=['{"scene": {"nar', 'ration": "go"}}'])
        provider = VertexGeminiJSONProvider(GeminiConfig(model="gemini-2.5-flash"), client=client)
        chunks = list(provider.stream([{"role": "user", "content": "x"}]))
        self.assertEqual(chunks, ['{"scene": {"nar', 'ration": "go"}}'])
        call = client.models.stream_calls[0]
        self.assertEqual(call["model"], "gemini-2.5-flash")
        self.assertIs(call["config"]["response_schema"], SCENE_GEMINI_SCHEMA)

    def test_missing_sdk_raises_actionable_error(self) -> None:
        provider = VertexGeminiJSONProvider()  # no injected client
        with mock.patch.dict("sys.modules", {"google.genai": None}):
            with self.assertRaises(RuntimeError) as ctx:
                provider._client()
        self.assertIn("pip install -e .[gemini]", str(ctx.exception))


class GeminiConfigDoesNotTriggerDualModelTest(unittest.TestCase):
    """The director must treat the Gemini provider as single-model (no parser/repair)."""

    def setUp(self) -> None:
        now = datetime(2026, 6, 28, tzinfo=UTC)
        self.context = NarrativeContext(
            player=PlayerProfile(
                player_id="player_1",
                display_name="Connector",
                created_at=now,
                updated_at=now,
            ),
            loop=LoopState(
                loop_id="loop_1",
                player_id="player_1",
                seed="seed_1",
                phase=LoopPhase.CONNECT,
                location_id="data-layer-01",
                stability=70,
                tension=20,
                started_at=now,
            ),
            turn_index=0,
            recent_events=[],
        )

    def test_legacy_path_parses_controlled_generation_first_try(self) -> None:
        client = _FakeGeminiClient(_scene_json("Cloud Threshold"))
        provider = VertexGeminiJSONProvider(GeminiConfig(), client=client)
        director = NarrativeDirector(provider)

        self.assertFalse(director._use_dual_model())
        scene, payload = director.generate_first_scene(self.context)

        self.assertEqual(scene.title, "Cloud Threshold")
        self.assertEqual(payload.world_delta.flags, ["opened"])
        # Exactly ONE provider call → no repair round-trip, no parser model.
        self.assertEqual(len(client.models.calls), 1)
        self.assertEqual(director.metrics.last_outcome, "success")

    def test_streaming_legacy_path_emits_final_scene(self) -> None:
        full = _scene_json("Streamed Threshold")
        # Split the controlled-generation JSON into two stream chunks.
        chunks = [full[: len(full) // 2], full[len(full) // 2 :]]
        client = _FakeGeminiClient("", stream_chunks=chunks)
        provider = VertexGeminiJSONProvider(GeminiConfig(), client=client)
        director = NarrativeDirector(provider)

        events = list(director.stream_first_scene(self.context))

        self.assertTrue(client.models.stream_calls)
        final = events[-1]
        self.assertEqual(final.kind, "final")
        assert final.scene is not None
        self.assertEqual(final.scene.title, "Streamed Threshold")
        self.assertEqual(director.metrics.last_outcome, "success")


if __name__ == "__main__":
    unittest.main()
