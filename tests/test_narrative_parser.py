import json
import unittest

from mythos_narrative import NarrativeParseError, parse_scene_payload, repair_scene_payload


class NarrativeParserTest(unittest.TestCase):
    def test_parse_valid_scene_payload(self) -> None:
        payload = parse_scene_payload(
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
                    "visual_brief": "A luminous gate in a dark server hall.",
                },
                "world_delta": {"stability": -2, "tension": 4, "flags": ["opened"]},
                "end_condition": None,
            }
        )

        self.assertEqual(payload.title, "Threshold")
        self.assertEqual(payload.world_delta.tension, 4)
        self.assertEqual(payload.choices[0].choice_id, "choice_1")

    def test_parses_route_nodes_world_delta(self) -> None:
        payload = parse_scene_payload(
            {
                "scene": {
                    "title": "Crossroads",
                    "location": "loc",
                    "narration": "Two roads diverge.",
                    "choices": [
                        {"choice_id": "c1", "label": "Left", "intent": "explore"}
                    ],
                    "visual_brief": "A forked alley.",
                },
                "world_delta": {
                    "route_nodes": [
                        {"type": "clue", "title": "끊긴 송출탑"},
                        {"type": "combat"},
                        "garbage",
                        {"title": "no type — dropped"},
                    ]
                },
            }
        )
        nodes = payload.world_delta.route_nodes
        self.assertEqual(len(nodes), 2)
        self.assertEqual(nodes[0], {"type": "clue", "title": "끊긴 송출탑"})
        self.assertEqual(nodes[1], {"type": "combat"})

    def test_extracts_json_from_wrapped_text(self) -> None:
        raw = """
        Here is the scene:
        {"scene":{"title":"Threshold","location":"data-layer-01","narration":"The gate opens.","choices":[{"choice_id":"choice_1","label":"Enter","intent":"explore"}],"visual_brief":"A luminous gate."},"world_delta":{"stability":0,"tension":1,"flags":[]},"end_condition":null}
        """

        self.assertEqual(parse_scene_payload(raw).title, "Threshold")

    def test_unwraps_model_output_under_contract_key(self) -> None:
        payload = parse_scene_payload(
            {
                "contract": {
                    "scene": {
                        "title": "Nested Scene",
                        "location": "data-layer-01",
                        "narration": "The terminal answers.",
                        "choices": [{"label": "Listen", "intent": "interact"}],
                        "visual_brief": "A flickering terminal.",
                    },
                    "world_delta": {"stability": 65, "tension": 18, "flags": ["active"]},
                    "end_condition": None,
                }
            }
        )

        self.assertEqual(payload.title, "Nested Scene")
        self.assertEqual(payload.world_delta.stability, 25)

    def test_rejects_malformed_json(self) -> None:
        with self.assertRaises(NarrativeParseError):
            parse_scene_payload("{not json")

    def test_repair_scene_payload_fills_missing_fields(self) -> None:
        repaired = repair_scene_payload(json.dumps({"scene": {"title": "Only Title"}}))
        payload = parse_scene_payload(repaired)

        self.assertEqual(payload.title, "Only Title")
        self.assertGreaterEqual(len(payload.choices), 1)

    def test_repair_scene_payload_normalizes_common_llm_variants(self) -> None:
        repaired = repair_scene_payload(
            {
                "title": "Flat Scene",
                "narration": "The signal changes shape.",
                "choices": ["Follow it"],
                "world_delta": {"stability": "low", "tension": 3, "flags": "changed"},
            }
        )
        payload = parse_scene_payload(repaired)

        self.assertEqual(payload.title, "Flat Scene")
        self.assertEqual(payload.choices[0].label, "Follow it")
        self.assertEqual(payload.world_delta.stability, 0)
        self.assertEqual(payload.world_delta.flags, ["changed"])

    def test_start_combat_null_string_is_ignored(self) -> None:
        payload = parse_scene_payload(
            {
                "scene": {
                    "title": "Quiet",
                    "location": "data-layer-01",
                    "narration": "No enemy appears.",
                    "choices": [{"label": "Continue", "intent": "explore"}],
                    "visual_brief": "A quiet corridor.",
                },
                "world_delta": {"start_combat": "null", "flags": ["start_combat:none"]},
            }
        )

        self.assertIsNone(payload.world_delta.start_combat)
        self.assertEqual(payload.world_delta.flags, ["start_combat:none"])

    def test_visual_brief_is_clamped(self) -> None:
        payload = parse_scene_payload(
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
                    "visual_brief": "x" * 900,
                },
                "world_delta": {"stability": 0, "tension": 1, "flags": []},
                "end_condition": None,
            }
        )

        self.assertEqual(len(payload.visual_brief), 700)

    def test_converts_cinematic_sfx_labels_to_player_prose(self) -> None:
        payload = parse_scene_payload(
            {
                "scene": {
                    "title": "Static",
                    "location": "data-layer-01",
                    "narration": "[Cinematic SFX: SCRATCHING STATIC] 신호가 열린다.",
                    "objective": "SFX: DEEP HUM 문을 찾는다.",
                    "action_result": "Partial Success. [SFX: GLITCH POP]",
                    "choices": [
                        {
                            "choice_id": "choice_1",
                            "label": "Enter",
                            "intent": "explore",
                        }
                    ],
                    "visual_brief": "A static gate.",
                },
                "world_delta": {"stability": 0, "tension": 1, "flags": []},
            }
        )

        self.assertEqual(payload.narration, "치직, 긁히는 정전기가 귓속을 스쳤다. 신호가 열린다.")
        self.assertEqual(payload.objective, "낮은 기계음이 바닥 아래에서 울렸다. 문을 찾는다.")
        self.assertEqual(payload.action_result, "Partial Success. 짧은 글리치음이 허공을 찢었다.")
