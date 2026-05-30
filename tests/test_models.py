import unittest
from datetime import UTC, datetime

from mythos_core.models import (
    Actor,
    AssetRecord,
    Choice,
    Echo,
    LoopPhase,
    LoopState,
    NarrativeShard,
    PlayerMemory,
    PlayerProfile,
    Scene,
    WorldEvent,
    WorldMemory,
    from_json_dict,
    to_json_dict,
)


class ModelsTest(unittest.TestCase):
    def test_scene_json_round_trip(self) -> None:
        scene = Scene(
            scene_id="scene_1",
            loop_id="loop_1",
            turn_index=0,
            title="First Contact",
            location="data-layer-01",
            narration="The access gate opens.",
            choices=[Choice(choice_id="choice_1", label="Enter", intent="explore")],
            visual_brief="A luminous terminal in a dark server hall.",
            created_at=datetime(2026, 5, 30, tzinfo=UTC),
        )

        payload = to_json_dict(scene)
        restored = from_json_dict(Scene, payload)

        self.assertEqual(restored, scene)

    def test_enum_serializes_to_value(self) -> None:
        self.assertEqual(to_json_dict({"phase": LoopPhase.CONNECT}), {"phase": "connect"})

    def test_all_models_json_round_trip(self) -> None:
        now = datetime(2026, 5, 30, tzinfo=UTC)
        models = [
            PlayerProfile(
                player_id="player_1",
                display_name="First Connector",
                created_at=now,
                updated_at=now,
                traits={"resolve": 3},
            ),
            Echo(
                echo_id="echo_1",
                source_loop_id="loop_0",
                source_event_id="event_0",
                symbol="mirror",
                text="A mirror remembers the access key.",
            ),
            LoopState(
                loop_id="loop_1",
                player_id="player_1",
                seed="seed_1",
                phase=LoopPhase.CONNECT,
                location_id="data-layer-01",
                stability=72,
                tension=18,
                started_at=now,
                state={"flags": ["first_contact"]},
                active_echoes=[
                    Echo(
                        echo_id="echo_1",
                        source_loop_id="loop_0",
                        source_event_id="event_0",
                        symbol="mirror",
                        text="A mirror remembers the access key.",
                    )
                ],
            ),
            Choice(choice_id="choice_1", label="Enter", intent="explore"),
            Scene(
                scene_id="scene_1",
                loop_id="loop_1",
                turn_index=0,
                title="First Contact",
                location="data-layer-01",
                narration="The access gate opens.",
                choices=[Choice(choice_id="choice_1", label="Enter", intent="explore")],
                visual_brief="A luminous terminal in a dark server hall.",
                created_at=now,
            ),
            WorldEvent(
                event_id="event_1",
                loop_id="loop_1",
                turn_index=0,
                actor=Actor.PLAYER,
                action="Enter",
                result="The gate accepts the signal.",
                state_delta={"tension": 3},
                created_at=now,
            ),
            PlayerMemory(
                memory_id="memory_1",
                player_id="player_1",
                kind="echo",
                content={"symbol": "mirror"},
                weight=1.0,
                created_at=now,
                updated_at=now,
            ),
            WorldMemory(
                memory_id="memory_2",
                world_id="world-connect",
                kind="counter",
                content={"loops_started": 1},
                weight=1.0,
                created_at=now,
                updated_at=now,
            ),
            NarrativeShard(
                shard_id="shard_1",
                loop_id="loop_1",
                player_id="player_1",
                symbol="gate",
                emotional_tone="uncertain",
                text="The first gate opened without a key.",
                weight=1.0,
                created_at=now,
            ),
            AssetRecord(
                asset_id="asset_1",
                scene_id="scene_1",
                loop_id="loop_1",
                provider="flux_local_mps",
                model_id="black-forest-labs/FLUX.1-schnell",
                prompt="A luminous terminal in a dark server hall.",
                seed=42,
                width=512,
                height=512,
                steps=1,
                storage_uri="s3://mythos-assets/images/player_1/loop_1/scene_1.png",
                metadata={"smoke": True},
                created_at=now,
            ),
        ]

        for model in models:
            with self.subTest(model=type(model).__name__):
                restored = from_json_dict(type(model), to_json_dict(model))
                self.assertEqual(restored, model)
