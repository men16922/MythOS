"""Unit tests for the scenario directives loader (prompt layer).

Covers the pure Markdown parser, safe placeholder substitution, the opening-beat
mapping, and the graceful absent-folder default. No filesystem fixtures needed for
the parser (it is a pure string transform); the absent-folder case uses a scenario
that ships no ``directives/`` folder.
"""

from __future__ import annotations

import unittest

from mythos_runtime.scenario_directives import (
    ScenarioDirectives,
    _opening_from_parsed,
    fill_placeholders,
    load_scenario_directives,
    parse_directives_markdown,
)

SAMPLE_OPENING = """# Neo-Seoul Opening Directives
header: === 오프닝 장면 지시 ===
max_turn: 4

## ONBOARDING_SCENE1 (turn=0, label=AWAKENING)
location_lock: 야외, 비 내리는 C-17 네온 골목
mandatory_event: 홀로 각성
forbidden: 정세린 등장, 지하 이동, 전투
flags:
start_combat:
---
주인공이 빗속에서 홀로 깨어납니다. archetype={archetype}.

## ONBOARDING_SCENE5 (turn=4, label=CHASE, shot=2)
location_lock: 야외, 비 내리는 C-17 네온 거리
mandatory_event: 추격과 전투 돌입
forbidden: 새 떡밥
flags: met_se_rin, refused_se_rin
start_combat: patrol_ambush
---
세린과 함께 드론 추격을 뚫습니다. 직전 행동: {player_action}.
"""


class ParseDirectivesMarkdownTest(unittest.TestCase):
    def test_file_meta_and_block_count(self) -> None:
        parsed = parse_directives_markdown(SAMPLE_OPENING)
        self.assertEqual(parsed.file_meta["header"], "=== 오프닝 장면 지시 ===")
        self.assertEqual(parsed.file_meta["max_turn"], "4")
        self.assertEqual(len(parsed.blocks), 2)

    def test_block_id_params_meta_body(self) -> None:
        parsed = parse_directives_markdown(SAMPLE_OPENING)
        b0 = parsed.blocks[0]
        self.assertEqual(b0.block_id, "ONBOARDING_SCENE1")
        self.assertEqual(b0.params["turn"], "0")
        self.assertEqual(b0.params["label"], "AWAKENING")
        self.assertEqual(b0.meta["location_lock"], "야외, 비 내리는 C-17 네온 골목")
        self.assertEqual(b0.meta["forbidden"], "정세린 등장, 지하 이동, 전투")
        self.assertIn("홀로 깨어납니다", b0.body)
        self.assertIn("{archetype}", b0.body)
        # The "---" separator and meta lines must NOT leak into the body.
        self.assertNotIn("location_lock:", b0.body)
        self.assertNotIn("---", b0.body)

    def test_empty_document(self) -> None:
        parsed = parse_directives_markdown("")
        self.assertEqual(parsed.blocks, [])
        self.assertEqual(parsed.file_meta, {})


class OpeningFromParsedTest(unittest.TestCase):
    def test_maps_turns_shots_flags_combat(self) -> None:
        parsed = parse_directives_markdown(SAMPLE_OPENING)
        header, max_turn, beats = _opening_from_parsed(parsed)
        self.assertEqual(header, "=== 오프닝 장면 지시 ===")
        self.assertEqual(max_turn, 4)
        self.assertEqual([b.turn for b in beats], [0, 4])  # sorted by turn

        b0, b4 = beats
        self.assertIsNone(b0.shot_ref)
        self.assertEqual(b0.flags, [])
        self.assertIsNone(b0.start_combat)

        self.assertEqual(b4.shot_ref, 2)
        self.assertEqual(b4.flags, ["met_se_rin", "refused_se_rin"])
        self.assertEqual(b4.start_combat, "patrol_ambush")
        self.assertEqual(b4.label, "CHASE")


class FillPlaceholdersTest(unittest.TestCase):
    def test_known_and_unknown_tokens(self) -> None:
        out = fill_placeholders(
            "a={archetype} b={player_action} c={unknown}",
            {"archetype": "Ghost", "player_action": None},
        )
        # known filled, None → empty string, unknown left literal
        self.assertEqual(out, "a=Ghost b= c={unknown}")

    def test_malformed_braces_do_not_raise(self) -> None:
        self.assertEqual(fill_placeholders("a={", {}), "a={")


class LoadScenarioDirectivesTest(unittest.TestCase):
    def test_absent_folder_returns_empty(self) -> None:
        # glass-library ships no resources/glass-library/directives/ folder.
        directives = load_scenario_directives("glass-library")
        self.assertIsInstance(directives, ScenarioDirectives)
        self.assertTrue(directives.empty)
        self.assertEqual(directives.opening_beats, [])
        self.assertIsNone(directives.opening_beat(0))

    def test_unknown_scenario_returns_empty(self) -> None:
        self.assertTrue(load_scenario_directives("__nonexistent__").empty)


if __name__ == "__main__":
    unittest.main()
