import json
import unittest

from mythos_narrative import NarrativeParseError, parse_scene_payload, repair_scene_payload
from mythos_narrative.parser import parse_story_text


class NarrativeParserTest(unittest.TestCase):
    def test_story_text_rejects_blank_scene_instead_of_fake_success(self) -> None:
        raw = """[TITLE]
Threshold
[LOCATION]
data-layer-01
[SCENE]

[CHOICES]
"""

        with self.assertRaises(NarrativeParseError):
            parse_story_text(raw)

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

        # The replacement follows the language of the line it is spliced into:
        # the first two are Korean scenes, the third is an English one. It used
        # to be Korean unconditionally, so an EN loop got a Korean sentence
        # dropped into the middle of English narration.
        self.assertEqual(payload.narration, "치직, 긁히는 정전기가 귓속을 스쳤다. 신호가 열린다.")
        self.assertEqual(payload.objective, "낮은 기계음이 바닥 아래에서 울렸다. 문을 찾는다.")
        self.assertEqual(payload.action_result, "Partial Success. A short glitch tore at the air.")

    def test_sfx_prose_follows_the_scene_language(self) -> None:
        from mythos_narrative.parser import _clean_player_text

        english = _clean_player_text("The corridor lights die. [SFX: GLITCH] Something moves.")
        self.assertEqual(english, "The corridor lights die. A short glitch tore at the air. Something moves.")
        self.assertNotRegex(english, r"[가-힣]")

        korean = _clean_player_text("복도의 불이 꺼진다. [SFX: GLITCH] 무언가 움직인다.")
        self.assertEqual(korean, "복도의 불이 꺼진다. 짧은 글리치음이 허공을 찢었다. 무언가 움직인다.")

    def test_strips_tabletop_mechanics_annotations(self) -> None:
        # Live 2026-07-04 leak: the GM prompt forbids "Make a Perception check"
        # phrasing, yet a choice label surfaced "... (Agility check)". The
        # cleaner strips EN/KO parenthetical mechanics tags deterministically.
        payload = parse_scene_payload(
            {
                "scene": {
                    "title": "Veil",
                    "location": "tunnel",
                    "narration": "You brace against the wind (Perception check) and move.",
                    "choices": [
                        {
                            "choice_id": "choice_1",
                            "label": "Dash through the distortion (Agility check)",
                            "intent": "escape",
                        },
                        {
                            "choice_id": "choice_2",
                            "label": "격류를 정면돌파한다 (민첩 판정)",
                            "intent": "confront",
                        },
                        {
                            "choice_id": "choice_3",
                            "label": "Hold the line (DC 15)",
                            "intent": "defend",
                        },
                        {
                            "choice_id": "choice_4",
                            "label": "Save Se-rin (her hand slips)",
                            "intent": "protect",
                        },
                    ],
                    "visual_brief": "A shimmering veil.",
                },
                "world_delta": {"stability": 0, "tension": 1, "flags": []},
            }
        )

        self.assertEqual(payload.narration, "You brace against the wind and move.")
        labels = [choice.label for choice in payload.choices]
        self.assertEqual(labels[0], "Dash through the distortion")
        self.assertEqual(labels[1], "격류를 정면돌파한다")
        self.assertEqual(labels[2], "Hold the line")
        # Ordinary parentheses (no mechanics keyword) survive untouched.
        self.assertEqual(labels[3], "Save Se-rin (her hand slips)")

    def test_strips_byte_fallback_tokens_from_player_text(self) -> None:
        payload = parse_scene_payload(
            {
                "scene": {
                    "title": "소멸의 코어와 자<0xEC><0xA4>개빛 기억",
                    "location": "지하<0xEA> 통제 중추",
                    "narration": "신호가 <0xEC><0x95>깨진 채 이어진다.",
                    "choices": [
                        {
                            "choice_id": "choice_1",
                            "label": "세린의 <0xEC>손을 잡는다",
                            "intent": "interact",
                        }
                    ],
                    "visual_brief": "A violet core, no text.",
                },
                "world_delta": {"stability": 0, "tension": 1, "flags": []},
            }
        )

        self.assertEqual(payload.title, "소멸의 코어와 자개빛 기억")
        self.assertEqual(payload.location, "지하 통제 중추")
        self.assertEqual(payload.narration, "신호가 깨진 채 이어진다.")
        self.assertEqual(payload.choices[0].label, "세린의 손을 잡는다")


class PlainTextHeuristicsLanguageTest(unittest.TestCase):
    """The dual-model plain-text path's heuristics were written against Korean.

    Two of them broke on English in opposite ways: the bare SFX pattern ran off
    the end of the sentence (Hangul used to stop it), and the combat trigger
    never fired at all.
    """

    def test_bare_sfx_marker_does_not_swallow_the_sentence(self) -> None:
        from mythos_narrative.parser import _clean_player_text

        # `[A-Z0-9 _-]+` under IGNORECASE also matches lowercase and spaces, so
        # the match ran to the sentence end and the replacement prose ate the
        # rest of the line. Korean was unaffected because Hangul falls outside
        # the class — this destroyed English only.
        out = _clean_player_text("A siren rises. SFX: ALARM WAIL and the crowd scatters.")
        self.assertIn("and the crowd scatters.", out)
        out_ko = _clean_player_text("경보가 울린다. SFX: ALARM WAIL 사람들이 흩어진다.")
        self.assertIn("사람들이 흩어진다.", out_ko)

    def test_sentence_gap_repair_leaves_ellipses_decimals_and_quotes_alone(self) -> None:
        from mythos_narrative.parser import _clean_player_text

        # The gap repair used to fire on any non-space after a terminator, so it
        # split ellipses, decimals, "?!" and a closing quote after a period.
        cases = {
            '그는 말했다... 아니. 3.5초 뒤 v2.0 "끝났다."라고 했다?!': (
                '그는 말했다... 아니. 3.5초 뒤 v2.0 "끝났다."라고 했다?!'
            ),
            "He said...nothing. Sector 7.5 is gone!": "He said...nothing. Sector 7.5 is gone!",
            "Wait.What? Run!Now.": "Wait. What? Run! Now.",
            "불이 꺼진다.무언가 움직인다.": "불이 꺼진다. 무언가 움직인다.",
        }
        for raw, expected in cases.items():
            with self.subTest(raw=raw):
                self.assertEqual(_clean_player_text(raw), expected)

    def test_bracketed_marker_still_accepts_any_casing(self) -> None:
        from mythos_narrative.parser import _clean_player_text

        out = _clean_player_text("The lights die. [Cinematic sfx: glitch pop] Something moves.")
        self.assertNotIn("sfx", out.lower())
        self.assertIn("Something moves.", out)

    def test_plain_text_choice_ids_are_unique(self) -> None:
        # `choice_1: A` then a bare `B` minted a second `choice_1`; the runtime
        # resolves a pick by first id match, so clicking B chose A.
        payload = parse_story_text(
            "[SCENE]\nThe corridor hums.\n[CHOICES]\nchoice_1: Push on\nWait here\nTurn back"
        )
        ids = [c.choice_id for c in payload.choices]
        self.assertEqual(len(ids), len(set(ids)), ids)
        self.assertEqual([c.label for c in payload.choices], ["Push on", "Wait here", "Turn back"])

    def test_plain_text_intent_keywords_are_word_bounded(self) -> None:
        payload = parse_story_text("[SCENE]\nQuiet.\n[CHOICES]\nPut on the mask\nAsk the guard")
        by_label = {c.label: c.intent for c in payload.choices}
        self.assertNotEqual(by_label["Put on the mask"], "interact")
        self.assertEqual(by_label["Ask the guard"], "interact")

    def test_english_narration_can_start_combat(self) -> None:
        for story in (
            "Combat begins. Two enforcers step out of the stairwell.",
            "The drone opens fire; the fight is on.",
            "A patrol ambush closes the corridor and battle erupts.",
        ):
            with self.subTest(story=story):
                payload = parse_story_text(story)
                self.assertIsNotNone(payload.world_delta.start_combat)

    def test_korean_narration_still_starts_combat(self) -> None:
        payload = parse_story_text("전투가 시작된다. 집행 유닛 둘이 걸어 나온다.")
        self.assertIsNotNone(payload.world_delta.start_combat)

    def test_merely_mentioning_danger_does_not_start_combat(self) -> None:
        # The heuristic starts a real encounter, so it must stay specific.
        for story in (
            "Nothing moves. The corridor is quiet.",
            "You avoid the ambush and slip past the enemy patrol.",
        ):
            with self.subTest(story=story):
                self.assertIsNone(parse_story_text(story).world_delta.start_combat)
