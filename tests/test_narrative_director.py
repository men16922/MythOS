import json
import unittest
from datetime import UTC, datetime

from mythos_core import Choice, LoopPhase, LoopState, PlayerProfile, Scene, WorldMemory
from mythos_narrative import NarrativeContext, NarrativeDirector
from mythos_narrative.variation import NoveltyController


class FakeProvider:
    def __init__(self, responses: list[str]) -> None:
        self.responses = responses
        self.calls = 0

    def generate(self, messages: list[dict[str, str]]) -> str:
        self.calls += 1
        return self.responses.pop(0)


class NarrativeDirectorTest(unittest.TestCase):
    def setUp(self) -> None:
        now = datetime(2026, 5, 30, tzinfo=UTC)
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

    def test_generates_scene_from_provider_payload(self) -> None:
        provider = FakeProvider(
            [
                json.dumps(
                    {
                        "scene": {
                            "title": "Threshold",
                            "location": "data-layer-01",
                            "narration": "The gate opens.",
                            "choices": [
                                {
                                    "choice_id": "choice_1",
                                    "label": "Enter",
                                    "intent": "explore",
                                }
                            ],
                            "visual_brief": "A luminous gate.",
                        },
                        "world_delta": {
                            "stability": 0,
                            "tension": 2,
                            "flags": ["opened"],
                        },
                        "end_condition": None,
                    }
                )
            ]
        )

        scene, payload = NarrativeDirector(provider).generate_first_scene(self.context)

        self.assertEqual(scene.title, "Threshold")
        self.assertEqual(scene.loop_id, "loop_1")
        self.assertEqual(payload.world_delta.flags, ["opened"])
        self.assertEqual(provider.calls, 1)

    def test_repairs_malformed_first_payload(self) -> None:
        provider = FakeProvider(
            [
                "{not json",
                json.dumps(
                    {
                        "scene": {
                            "title": "Repaired",
                            "location": "data-layer-01",
                            "narration": "The gate stabilizes.",
                            "choices": [
                                {
                                    "choice_id": "choice_1",
                                    "label": "Enter",
                                    "intent": "explore",
                                }
                            ],
                            "visual_brief": "A repaired access gate.",
                        },
                        "world_delta": {"stability": 1, "tension": 0, "flags": []},
                        "end_condition": None,
                    }
                ),
            ]
        )

        scene, _ = NarrativeDirector(provider).generate_first_scene(self.context)

        self.assertEqual(scene.title, "Repaired")
        self.assertEqual(provider.calls, 2)

    def test_uses_local_repair_after_incomplete_provider_repair(self) -> None:
        provider = FakeProvider(
            [
                # An empty first response can't be salvaged locally, so a provider repair
                # round-trip runs; that output is then salvaged locally.
                "",
                json.dumps(
                    {
                        "scene": {
                            "title": "Locally Repaired",
                            "choices": ["Enter"],
                        }
                    }
                ),
            ]
        )

        scene, payload = NarrativeDirector(provider).generate_first_scene(self.context)

        self.assertEqual(scene.title, "Locally Repaired")
        self.assertEqual(payload.choices[0].label, "Enter")
        self.assertEqual(provider.calls, 2)

    def test_salvageable_first_response_skips_provider_repair(self) -> None:
        # A partial-but-salvageable payload is repaired locally with no second LLM call.
        provider = FakeProvider([json.dumps({"scene": {"title": "Only Title"}})])

        scene, _ = NarrativeDirector(provider).generate_first_scene(self.context)

        self.assertEqual(scene.title, "Only Title")
        self.assertEqual(provider.calls, 1)

    def test_provider_payload_gets_novelty_guard(self) -> None:
        # The novelty guard is for ONGOING scenes (repeat suppression); it is
        # intentionally skipped during the scripted opening (turns 0-4), so this
        # exercises a later turn via the next-scene path.
        recent = [
            Scene(
                scene_id=f"scene_{index}",
                loop_id="loop_1",
                turn_index=index,
                title="Threshold" if index == 1 else "Another Gate",
                location="data-layer-01",
                narration="The same gate and corridor remain.",
                choices=[Choice(f"choice_{index}", "Enter", "explore")],
                visual_brief="A gate.",
                created_at=datetime(2026, 5, 30, tzinfo=UTC),
            )
            for index in (1, 2)
        ]
        context = NarrativeContext(
            player=self.context.player,
            loop=self.context.loop,
            turn_index=5,
            recent_events=[],
            novelty_notes=["Avoid reusing recent scene titles: Threshold."],
            novelty_signal=NoveltyController().build_signal(recent),
        )
        provider = FakeProvider(
            [
                json.dumps(
                    {
                        "scene": {
                            "title": "Threshold",
                            "location": "data-layer-01",
                            "narration": "The gate opens.",
                            "choices": [
                                {
                                    "choice_id": "choice_1",
                                    "label": "Enter",
                                    "intent": "explore",
                                }
                            ],
                            "visual_brief": "A luminous gate.",
                        },
                        "world_delta": {"stability": 0, "tension": 1, "flags": []},
                        "end_condition": None,
                    }
                )
            ]
        )

        scene, _ = NarrativeDirector(provider).generate_next_scene(context)

        self.assertEqual(scene.location, "data-layer-01 너머의 우회 접근로")
        self.assertFalse(scene.title.startswith(("Changed ", "달라진 ")))
        self.assertIn("새 제약", scene.narration)

    def test_novelty_guard_preserves_authored_route_anchor(self) -> None:
        recent = [
            Scene(
                scene_id=f"anchor_prior_{index}",
                loop_id="loop_1",
                turn_index=index,
                title=f"Prior {index}",
                location="data-layer-01",
                narration="The same signal grid closes in.",
                choices=[Choice(f"choice_{index}", "Enter", "explore")],
                visual_brief="A signal plaza.",
                created_at=datetime(2026, 5, 30, tzinfo=UTC),
            )
            for index in (1, 2)
        ]
        loop = LoopState(
            **{
                **self.context.loop.__dict__,
                "state": {
                    "_route_map": {
                        "current": "anchor_node",
                        "nodes": {
                            "anchor_node": {
                                "title": "Authored Anchor",
                                "anchor": True,
                            }
                        },
                    }
                },
            }
        )
        context = NarrativeContext(
            player=self.context.player,
            loop=loop,
            turn_index=5,
            recent_events=[],
            novelty_signal=NoveltyController().build_signal(recent),
        )
        provider = FakeProvider([_scene_response("Threshold")])

        scene, _ = NarrativeDirector(provider).generate_next_scene(context)

        self.assertEqual(scene.title, "Threshold")
        self.assertEqual(scene.location, "data-layer-01")

    def test_uses_fallback_when_provider_fails_twice(self) -> None:
        provider = FakeProvider(["{not json", "{still not json"])

        scene, payload = NarrativeDirector(provider).generate_first_scene(self.context)

        self.assertEqual(scene.title, "C-17 정전 구역")
        self.assertEqual(payload.world_delta.flags, ["fallback_scene"])
        self.assertEqual(provider.calls, 2)

    def test_metrics_record_success_outcome(self) -> None:
        provider = FakeProvider([_scene_response("Threshold")])
        director = NarrativeDirector(provider)

        director.generate_first_scene(self.context)

        self.assertEqual(director.metrics.counts["success"], 1)
        self.assertEqual(director.metrics.total, 1)
        self.assertEqual(director.metrics.degraded, 0)
        self.assertEqual(director.metrics.ratios()["success"], 1.0)

    def test_metrics_record_provider_repair_outcome(self) -> None:
        provider = FakeProvider(["{not json", _scene_response("Repaired")])
        director = NarrativeDirector(provider)

        director.generate_first_scene(self.context)

        self.assertEqual(director.metrics.counts["provider_repair"], 1)
        self.assertEqual(director.metrics.degraded, 1)

    def test_metrics_record_local_repair_outcome(self) -> None:
        provider = FakeProvider(
            [
                json.dumps({"scene": {"title": "Only Title"}}),
                json.dumps({"scene": {"title": "Locally Repaired", "choices": ["Enter"]}}),
            ]
        )
        director = NarrativeDirector(provider)

        director.generate_first_scene(self.context)

        self.assertEqual(director.metrics.counts["local_repair"], 1)

    def test_metrics_record_fallback_outcome(self) -> None:
        provider = FakeProvider(["{not json", "{still not json"])
        director = NarrativeDirector(provider)

        with self.assertLogs("mythos.narrative", level="INFO") as captured:
            director.generate_first_scene(self.context)

        self.assertEqual(director.metrics.counts["fallback"], 1)
        self.assertEqual(director.metrics.degraded, 1)
        self.assertEqual(director.metrics.fallback_reasons, {"parse_error": 1})
        record = next(r for r in captured.records if r.getMessage() == "narrative outcome")
        self.assertEqual(getattr(record, "fallback_reason", None), "parse_error")

    def test_fallback_reason_blank_output_for_empty_provider_response(self) -> None:
        # A safety-filter empty (provider returns blank content) must be
        # distinguishable from a malformed payload in the fallback metrics.
        provider = FakeProvider(["", ""])
        director = NarrativeDirector(provider)

        director.generate_first_scene(self.context)

        self.assertEqual(director.metrics.counts["fallback"], 1)
        self.assertEqual(director.metrics.fallback_reasons, {"blank_output": 1})

    def test_fallback_reason_provider_error_when_provider_raises(self) -> None:
        class RaisingProvider:
            def generate(self, messages: list[dict[str, str]]) -> str:
                raise RuntimeError("model unavailable")

        director = NarrativeDirector(RaisingProvider(), repair_enabled=False)

        director.generate_first_scene(self.context)

        self.assertEqual(director.metrics.counts["fallback"], 1)
        self.assertEqual(director.metrics.fallback_reasons, {"provider_error": 1})
        self.assertIn("fallback_reasons", director.metrics.as_dict())

    def test_metrics_accumulate_across_generations(self) -> None:
        provider = FakeProvider([_scene_response("One"), "{not json", "{still not json"])
        director = NarrativeDirector(provider)

        director.generate_first_scene(self.context)
        director.generate_first_scene(self.context)

        self.assertEqual(director.metrics.total, 2)
        self.assertEqual(director.metrics.counts["success"], 1)
        self.assertEqual(director.metrics.counts["fallback"], 1)
        self.assertEqual(director.metrics.ratios()["success"], 0.5)

    def test_outcome_emits_running_aggregate(self) -> None:
        provider = FakeProvider([_scene_response("One")])
        director = NarrativeDirector(provider)

        with self.assertLogs("mythos.narrative", level="INFO") as captured:
            director.generate_first_scene(self.context)

        record = next(r for r in captured.records if r.getMessage() == "narrative outcome")
        fields = record.__dict__
        self.assertEqual(fields["outcome"], "success")
        self.assertEqual(fields["total"], 1)
        self.assertEqual(fields["degraded"], 0)
        self.assertEqual(fields["success_ratio"], 1.0)


def _scene_response(title: str) -> str:
    return json.dumps(
        {
            "scene": {
                "title": title,
                "location": "data-layer-01",
                "narration": "The gate opens.",
                "choices": [{"choice_id": "choice_1", "label": "Enter", "intent": "explore"}],
                "visual_brief": "A luminous gate.",
            },
            "world_delta": {"stability": 0, "tension": 1, "flags": []},
            "end_condition": None,
        }
    )

    def test_fallback_reflects_novelty_context(self) -> None:
        context = NarrativeContext(
            player=self.context.player,
            loop=self.context.loop,
            turn_index=0,
            recent_events=[],
            novelty_notes=["Avoid reusing recent scene titles: C-17 정전 구역."],
            world_memories=[
                WorldMemory(
                    memory_id="world_memory_1",
                    world_id="mythos-local",
                    kind="loop_archive",
                    content={"final_title": "C-17 정전 구역"},
                    weight=1.0,
                    created_at=self.context.player.created_at,
                    updated_at=self.context.player.updated_at,
                )
            ],
        )

        scene, _ = NarrativeDirector(FakeProvider([])).fallback_scene(context)

        self.assertEqual(scene.title, "C-17의 바뀐 경고 신호")
        self.assertIn("지난 루프", scene.narration)
