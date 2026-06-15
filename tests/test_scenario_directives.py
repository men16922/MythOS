"""Unit tests for the scenario directives loader (prompt layer).

Covers the pure Markdown parser, safe placeholder substitution, the opening-beat
mapping, and the graceful absent-folder default. No filesystem fixtures needed for
the parser (it is a pure string transform); the absent-folder case uses a scenario
that ships no ``directives/`` folder.
"""

from __future__ import annotations

import unittest

from mythos_narrative.fallbacks import DEFAULT_FALLBACK
from mythos_runtime.scenario_directives import (
    ScenarioDirectives,
    _fallback_from_parsed,
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


SAMPLE_ADDRESSED = """## CUTSCENE_DOCK (node=route_dock, beat=anchor_dock_meet)
unlock_affection: 30
---
세린이 부두에서 당신을 기다린다. {player_action}

## CUTSCENE_ROOFTOP (node=route_rooftop)
---
옥상에서의 재회.

## PLAIN_BLOCK (turn=2)
---
주소 없는 블록.
"""


class NodeBeatAddressingTest(unittest.TestCase):
    """Phase D: directive blocks may carry a node address (``node=``/``beat=``) so a
    cutscene/anchor can be locked to a route node — the prereq for P1 cutscenes."""

    def test_block_exposes_node_and_beat_params(self) -> None:
        parsed = parse_directives_markdown(SAMPLE_ADDRESSED)
        dock = parsed.blocks[0]
        self.assertEqual(dock.node, "route_dock")
        self.assertEqual(dock.beat, "anchor_dock_meet")
        # body / extra meta still parse alongside the address params.
        self.assertEqual(dock.meta["unlock_affection"], "30")
        self.assertIn("부두에서", dock.body)

    def test_partial_and_absent_addresses(self) -> None:
        parsed = parse_directives_markdown(SAMPLE_ADDRESSED)
        rooftop = parsed.blocks[1]
        self.assertEqual(rooftop.node, "route_rooftop")
        self.assertIsNone(rooftop.beat)  # no beat= → None
        plain = parsed.blocks[2]
        self.assertIsNone(plain.node)  # turn= only, no node= → None
        self.assertIsNone(plain.beat)

    def test_block_for_node_and_beat_lookup(self) -> None:
        parsed = parse_directives_markdown(SAMPLE_ADDRESSED)
        dock = parsed.block_for_node("route_dock")
        rooftop = parsed.block_for_node("route_rooftop")
        by_beat = parsed.block_for_beat("anchor_dock_meet")
        assert dock is not None and rooftop is not None and by_beat is not None
        self.assertEqual(dock.block_id, "CUTSCENE_DOCK")
        self.assertEqual(rooftop.block_id, "CUTSCENE_ROOFTOP")
        self.assertEqual(by_beat.block_id, "CUTSCENE_DOCK")
        self.assertIsNone(parsed.block_for_node("missing"))
        self.assertIsNone(parsed.block_for_beat("missing"))

    def test_neo_seoul_opening_beats_have_no_node_address(self) -> None:
        # Existing turn-addressed opening beats stay node-unaddressed (no regression).
        directives = load_scenario_directives("neo-seoul")
        self.assertTrue(all(b.node is None and b.beat is None for b in directives.opening_beats))
        self.assertIsNone(directives.opening_beat_for_node("route_dock"))
        self.assertIsNone(directives.opening_beat_for_beat("anchor_dock_meet"))


class OpeningBeatNodeAddressTest(unittest.TestCase):
    def test_opening_beat_carries_node_address_when_authored(self) -> None:
        text = (
            "## ONBOARDING_SCENE1 (turn=0, label=AWAKENING, node=opening_root, beat=anchor_wake)\n"
            "---\n"
            "각성.\n"
        )
        _, _, beats = _opening_from_parsed(parse_directives_markdown(text))
        self.assertEqual(beats[0].node, "opening_root")
        self.assertEqual(beats[0].beat, "anchor_wake")


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

    def test_neo_seoul_authors_five_opening_beats(self) -> None:
        directives = load_scenario_directives("neo-seoul")
        self.assertFalse(directives.empty)
        self.assertEqual([b.turn for b in directives.opening_beats], [0, 1, 2, 3, 4])
        by_turn = {b.turn: b for b in directives.opening_beats}
        self.assertEqual(by_turn[0].beat_id, "ONBOARDING_SCENE1")
        # Combat + flags only on the chase beat / contact beats.
        self.assertEqual(by_turn[4].start_combat, "patrol_ambush")
        self.assertIn("met_se_rin", by_turn[3].flags)
        # Shot refs: arrival/contact/chase reference cinematic_shots 0/1/2.
        self.assertIsNone(by_turn[0].shot_ref)
        self.assertEqual(by_turn[1].shot_ref, 0)


class OpeningAssemblerIntegrationTest(unittest.TestCase):
    """The generic assembler in scenario_context must emit the authored beat into
    the full-render session_synopsis channel for neo-seoul turns 0-4, drive the
    combat trigger from the beat, and inject nothing for scenarios without an
    authored opening (no neo-seoul contamination)."""

    def _context(self, scenario_id: str, turn: int, action: str | None):
        from datetime import UTC, datetime

        from mythos_core.models import LoopPhase, LoopState, PlayerProfile
        from mythos_runtime.scenario import load_scenario
        from mythos_runtime.scenario_context import build_runtime_narrative_context

        now = datetime(2026, 6, 16, tzinfo=UTC)
        player = PlayerProfile("p1", "T", now, now, {"archetype": "Unclassified"})
        phase = LoopPhase.CONNECT if turn == 0 else LoopPhase.EXPLORE
        loop = LoopState("l", "p1", "s", phase, "data-layer-01", 70, 30, now, None, {}, [])
        return build_runtime_narrative_context(
            player=player,
            loop=loop,
            scenario=load_scenario(scenario_id),
            turn_index=turn,
            recent_events=[],
            memories=[],
            world_memories=[],
            narrative_shards=[],
            novelty_notes=[],
            player_action=action,
        )

    def _onboarding_line(self, ctx, turn: int) -> str:
        line = next(
            (s for s in ctx.session_synopsis if s.startswith(f"ONBOARDING_SCENE{turn + 1}")), None
        )
        assert isinstance(line, str), f"no ONBOARDING_SCENE{turn + 1} in session_synopsis"
        return line

    def test_neo_seoul_opening_beats_land_in_synopsis(self) -> None:
        line0 = self._onboarding_line(self._context("neo-seoul", 0, None), 0)
        self.assertIn("홀로", line0)
        self.assertIn("Unclassified", line0)  # {archetype} filled

        line1 = self._onboarding_line(self._context("neo-seoul", 1, "주변을 살핀다"), 1)
        self.assertIn("정세린의 첫 등장", line1)
        self.assertIn("주변을 살핀다", line1)  # {player_action} filled
        # {shot_title} resolved from cinematic_shots[0].
        self.assertIn("빗속에서 세린이 당신을 발견한다", line1)

    def test_neo_seoul_turn4_triggers_patrol_ambush_directive(self) -> None:
        line4 = self._onboarding_line(self._context("neo-seoul", 4, "꽉 잡는다"), 4)
        self.assertIn("patrol_ambush", line4)

    def test_turn5_has_no_opening_directive(self) -> None:
        ctx5 = self._context("neo-seoul", 5, "계속 나아간다")
        self.assertTrue(all("ONBOARDING_SCENE" not in s for s in ctx5.session_synopsis))

    def test_scenario_without_opening_gets_no_neo_seoul_directive(self) -> None:
        # glass-library has no directives/opening.md → no neo-seoul ONBOARDING text.
        ctx = self._context("glass-library", 0, None)
        self.assertTrue(all("ONBOARDING_SCENE" not in s for s in ctx.session_synopsis))
        self.assertTrue(all("정세린" not in s for s in ctx.session_synopsis))


class FallbackDirectiveParityTest(unittest.TestCase):
    """Phase 3: the neo-seoul fallback prose extracted to directives/fallback.md must
    reproduce the code-level DEFAULT_FALLBACK exactly (minus the parser-only "repair"
    sub-dict), so the extraction is lossless and the director's deterministic fallback
    scene is byte-identical whether it comes from the prompt layer or the code default."""

    def test_neo_seoul_fallback_md_byte_parity_with_default(self) -> None:
        loaded = load_scenario_directives("neo-seoul").fallback_scene
        expected = {k: v for k, v in DEFAULT_FALLBACK.items() if k != "repair"}
        self.assertEqual(loaded, expected)

    def test_runtime_context_populates_fallback_scene(self) -> None:
        from datetime import UTC, datetime

        from mythos_core.models import LoopPhase, LoopState, PlayerProfile
        from mythos_runtime.scenario import load_scenario
        from mythos_runtime.scenario_context import build_runtime_narrative_context

        now = datetime(2026, 6, 16, tzinfo=UTC)
        player = PlayerProfile("p1", "T", now, now, {"archetype": "Unclassified"})
        loop = LoopState("l", "p1", "s", LoopPhase.CONNECT, "data-layer-01", 70, 30, now, None, {}, [])
        ctx = build_runtime_narrative_context(
            player=player,
            loop=loop,
            scenario=load_scenario("neo-seoul"),
            turn_index=0,
            recent_events=[],
            memories=[],
            world_memories=[],
            narrative_shards=[],
            novelty_notes=[],
            player_action=None,
        )
        expected = {k: v for k, v in DEFAULT_FALLBACK.items() if k != "repair"}
        self.assertEqual(ctx.fallback_scene, expected)

    def test_scenario_without_fallback_md_is_none(self) -> None:
        # glass-library ships no directives/fallback.md → None (uses code default).
        self.assertIsNone(load_scenario_directives("glass-library").fallback_scene)

    def test_empty_document_maps_to_none(self) -> None:
        self.assertIsNone(_fallback_from_parsed(parse_directives_markdown("")))


if __name__ == "__main__":
    unittest.main()
