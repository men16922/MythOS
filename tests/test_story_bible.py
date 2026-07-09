from __future__ import annotations

import unittest
from datetime import UTC, datetime
from pathlib import Path

from mythos_core import LoopPhase, LoopState, PlayerMemory, PlayerProfile
from mythos_runtime.scenario import PROJECT_ROOT, load_scenario
from mythos_runtime.scenario_context import build_runtime_narrative_context
from mythos_runtime.story_bible import (
    StoryBible,
    StoryBibleEntry,
    load_story_bible,
    select_story_bible_entries,
    story_bible_notes,
)


def _loop(
    *,
    phase: LoopPhase = LoopPhase.EXPLORE,
    turn_index: int = 3,
    flags: list[str] | None = None,
    location_id: str = "data-layer-01",
    stability: int = 70,
    tension: int = 20,
) -> LoopState:
    return LoopState(
        loop_id="loop_story_bible",
        player_id="player_story_bible",
        seed="seed_story_bible",
        phase=phase,
        location_id=location_id,
        stability=stability,
        tension=tension,
        started_at=datetime(2026, 5, 31, tzinfo=UTC),
        state={"flags": flags or [], "turn_index": turn_index},
    )


class StoryBibleTest(unittest.TestCase):
    def test_load_story_bible_reads_neo_seoul_entries(self) -> None:
        bible = load_story_bible("neo-seoul")

        self.assertEqual(bible.scenario_id, "neo-seoul")
        self.assertGreaterEqual(len(bible.entries), 15)
        self.assertTrue(any(entry.entry_id == "neo_seoul_canon_core" for entry in bible.entries))
        self.assertTrue(any(entry.entry_id == "session_pacing_contract" for entry in bible.entries))
        self.assertTrue(any(entry.entry_id == "final_ix_confrontation" for entry in bible.entries))

    def test_neo_seoul_scenario_declares_long_form_session_design(self) -> None:
        scenario = load_scenario("neo-seoul")

        self.assertEqual(scenario.main_arcs[-1]["arc_id"], "arc_6_the_rewriting")
        self.assertEqual(scenario.main_arcs[0]["arc_id"], "arc_1_the_fall")
        self.assertIn("40-60", scenario.system_prompt)

    def test_neo_seoul_opening_cinematic_assets_are_declared(self) -> None:
        scenario = load_scenario("neo-seoul")
        intro = scenario.ui_copy["session_intro"]
        shots = intro["cinematic_shots"]

        self.assertEqual(len(shots), 3)
        for shot in shots:
            rel_path = Path(shot["image"])
            self.assertEqual(rel_path.parts[0], "opening")
            self.assertTrue((PROJECT_ROOT / "resources" / "neo-seoul" / rel_path).exists())

    def test_glass_library_scenario_and_story_bible_load(self) -> None:
        scenario = load_scenario("glass-library")
        bible = load_story_bible("glass-library")

        self.assertEqual(scenario.scenario_id, "glass-library")
        self.assertEqual(scenario.starting_location, "catalog-hall")
        self.assertIn("loose_pages", scenario.combat["encounters"])
        self.assertEqual(bible.scenario_id, "glass-library")
        self.assertTrue(
            any(entry.entry_id == "act1_broken_catalog_hall" for entry in bible.entries)
        )

    def test_missing_story_bible_is_empty(self) -> None:
        bible = load_story_bible("missing-story-bible")

        self.assertTrue(bible.empty)
        self.assertEqual(
            select_story_bible_entries(bible, _loop(), turn_index=1),
            [],
        )

    def test_select_story_bible_entries_filters_by_phase_flags_and_location(self) -> None:
        bible = StoryBible(
            scenario_id="test",
            title="Test",
            premise="",
            entries=[
                StoryBibleEntry(
                    entry_id="connect_only",
                    kind="act",
                    title="Connect",
                    summary="connect",
                    content="connect content",
                    when={"phase": ["connect"]},
                    priority=10,
                ),
                StoryBibleEntry(
                    entry_id="se_rin",
                    kind="npc",
                    title="Se-rin",
                    summary="ally",
                    content="ally content",
                    when={"flags_any": ["ally_se_rin"]},
                    priority=9,
                ),
                StoryBibleEntry(
                    entry_id="market",
                    kind="location",
                    title="Market",
                    summary="market",
                    content="market content",
                    when={"locations_any": ["market"]},
                    priority=7,
                ),
            ],
        )
        loop = _loop(flags=["ally_se_rin"], location_id="night-market")

        entries = select_story_bible_entries(bible, loop, turn_index=3)

        self.assertEqual([entry.entry_id for entry in entries], ["se_rin", "market"])

    def test_opening_variant_gate_excludes_default_only_entries_on_variant_loops(self) -> None:
        # An entry tagged `opening_variant` applies only when THIS loop's
        # `_opening_variant` is in that set. Generic mechanism check.
        bible = StoryBible(
            scenario_id="test",
            title="Test",
            premise="",
            entries=[
                StoryBibleEntry(
                    entry_id="default_opening",
                    kind="act",
                    title="Default opening",
                    summary="se-rin rescue",
                    content="se-rin rescue content",
                    when={"phase": ["connect"], "opening_variant": "default"},
                    priority=10,
                ),
                StoryBibleEntry(
                    entry_id="always",
                    kind="note",
                    title="Always",
                    summary="canon",
                    content="canon content",
                    when={"phase": ["connect"]},
                    priority=5,
                ),
            ],
        )

        def ids(variant: str) -> list[str]:
            loop = LoopState(
                loop_id="l",
                player_id="p",
                seed="s",
                phase=LoopPhase.CONNECT,
                location_id="c-17",
                stability=80,
                tension=20,
                started_at=datetime(2026, 5, 31, tzinfo=UTC),
                state={"_opening_variant": variant},
            )
            return [e.entry_id for e in select_story_bible_entries(bible, loop, turn_index=0)]

        # default (loop 1 / tutorial): the Se-rin opening entry is present.
        self.assertIn("default_opening", ids("default"))
        # a loop-2+ variant opening: it is excluded (its own directive owns the
        # scene and forbids Se-rin), while untagged entries still apply.
        self.assertNotIn("default_opening", ids("han"))
        self.assertIn("always", ids("han"))

    def test_solo_opening_suppresses_relationship_gated_entries(self) -> None:
        # A loop-2+ variant opening re-enters SOLO: a companion met/trusted in a
        # prior loop (met_se_rin flag carried in) must not reintroduce its
        # relationship bible (se_rin_trust_thread), which would override the
        # variant directive. `solo_opening=True` drops every flags_any-gated
        # entry (all companion/route entries are flag-gated); scenario-wide
        # entries (no flags_any) survive. Regression for the owner-reported
        # Se-rin-in-variant-opening leak (2026-07-09).
        bible = load_story_bible("neo-seoul", "ko")
        loop = LoopState(
            loop_id="l",
            player_id="p",
            seed="s",
            phase=LoopPhase.EXPLORE,
            location_id="c-17",
            stability=80,
            tension=20,
            started_at=datetime(2026, 5, 31, tzinfo=UTC),
            state={"_opening_variant": "kai", "flags": ["met_se_rin", "trusted_se_rin"]},
        )

        normal = {e.entry_id for e in select_story_bible_entries(bible, loop, turn_index=1)}
        solo = {
            e.entry_id
            for e in select_story_bible_entries(bible, loop, turn_index=1, solo_opening=True)
        }

        self.assertIn("se_rin_trust_thread", normal)  # would leak without the gate
        self.assertNotIn("se_rin_trust_thread", solo)  # suppressed on a solo opening
        self.assertIn("neo_seoul_canon_core", solo)  # scenario-wide entry survives

    def test_neo_seoul_act1_opening_bible_is_default_variant_gated(self) -> None:
        # Regression: the real neo-seoul act-1 opening entries hardcode Se-rin's
        # rescue; on a loop-2+ variant (han/kai/…) they must NOT be selected, or
        # they override the variant directive and Se-rin leaks into a non-Se-rin
        # opening (owner-reported 2026-07-09).
        bible = load_story_bible("neo-seoul", "ko")

        def opening_ids(variant: str, turn_index: int) -> set[str]:
            loop = LoopState(
                loop_id="l",
                player_id="p",
                seed="s",
                phase=LoopPhase.CONNECT,
                location_id="c-17",
                stability=80,
                tension=20,
                started_at=datetime(2026, 5, 31, tzinfo=UTC),
                state={"_opening_variant": variant},
            )
            return {e.entry_id for e in select_story_bible_entries(bible, loop, turn_index=turn_index)}

        self.assertIn("act1_c17_blackout", opening_ids("default", 0))
        for variant in ("han", "kai", "tae_o", "solo"):
            self.assertNotIn("act1_c17_blackout", opening_ids(variant, 0))
            self.assertNotIn("act1_first_moral_cut", opening_ids(variant, 2))

    def test_story_bible_notes_are_prompt_ready(self) -> None:
        note = story_bible_notes(
            [
                StoryBibleEntry(
                    entry_id="core",
                    kind="world",
                    title="Core",
                    summary="Canon summary",
                    content="Canon content",
                )
            ]
        )[0]

        self.assertIn("STORY_BIBLE_SNIPPET", note)
        self.assertIn("core", note)
        self.assertIn("Canon content", note)

    def test_runtime_context_includes_selected_story_bible_snippets(self) -> None:
        player = PlayerProfile(
            player_id="player_story_bible",
            display_name="당신",
            created_at=datetime(2026, 5, 31, tzinfo=UTC),
            updated_at=datetime(2026, 5, 31, tzinfo=UTC),
            traits={"archetype": "비접속자 (Ghost)"},
        )
        loop = _loop(phase=LoopPhase.CONNECT, turn_index=0)

        context = build_runtime_narrative_context(
            player=player,
            loop=loop,
            scenario=load_scenario("neo-seoul"),
            turn_index=0,
            recent_events=[],
            memories=[],
            world_memories=[],
            narrative_shards=[],
            novelty_notes=[],
        )

        notes = "\n".join(context.novelty_notes)
        self.assertIn("STORY_BIBLE_SNIPPET", notes)
        self.assertIn("act1_c17_blackout", notes)

    def test_runtime_context_includes_glass_library_story_bible_snippets(self) -> None:
        player = PlayerProfile(
            player_id="player_story_bible",
            display_name="당신",
            created_at=datetime(2026, 6, 2, tzinfo=UTC),
            updated_at=datetime(2026, 6, 2, tzinfo=UTC),
            traits={"archetype": "목록 해석자 (Catalog Interpreter)"},
        )
        loop = _loop(
            phase=LoopPhase.CONNECT,
            turn_index=0,
            location_id="catalog-hall",
        )

        context = build_runtime_narrative_context(
            player=player,
            loop=loop,
            scenario=load_scenario("glass-library"),
            turn_index=0,
            recent_events=[],
            memories=[],
            world_memories=[],
            narrative_shards=[],
            novelty_notes=[],
        )

        notes = "\n".join(context.novelty_notes)
        self.assertIn("STORY_BIBLE_SNIPPET", notes)
        self.assertIn("act1_broken_catalog_hall", notes)
        self.assertIn("유리성", notes)

    def test_runtime_context_includes_narrative_echoes(self) -> None:
        from mythos_core import WorldMemory

        player = PlayerProfile(
            player_id="player_story_bible",
            display_name="당신",
            created_at=datetime(2026, 6, 2, tzinfo=UTC),
            updated_at=datetime(2026, 6, 2, tzinfo=UTC),
            traits={"archetype": "비접속자 (Ghost)"},
        )
        loop = _loop(phase=LoopPhase.CONNECT, turn_index=0)

        world_memories = [
            WorldMemory(
                memory_id="mem_1",
                world_id="mythos_world",
                kind="run_summary",
                content={
                    "ending_label": "네오 서울의 비접속자 엔딩",
                    "turns": 45,
                    "clues_collected": ["clue_se_rin_diary"],
                    "allies_met": ["정세린"],
                    "summary_text": "네오 서울 뒷골목에서 세린과 함께 도주했으나 신호가 붕괴됨",
                },
                weight=1.0,
                created_at=datetime(2026, 6, 2, 10, 0, 0, tzinfo=UTC),
                updated_at=datetime(2026, 6, 2, 10, 0, 0, tzinfo=UTC),
            )
        ]

        context = build_runtime_narrative_context(
            player=player,
            loop=loop,
            scenario=load_scenario("neo-seoul"),
            turn_index=0,
            recent_events=[],
            memories=[],
            world_memories=world_memories,
            narrative_shards=[],
            novelty_notes=[],
        )

        notes = "\n".join(context.novelty_notes)
        self.assertIn("=== NARRATIVE ECHOES (이전 루프의 기억과 잔향) ===", notes)
        self.assertIn("이전 루프의 선택에서 비롯된 영적/물리적 잔향", notes)
        self.assertIn("네오 서울의 비접속자 엔딩", notes)
        self.assertIn("clue_se_rin_diary", notes)
        self.assertIn("정세린", notes)
        self.assertIn("신호가 붕괴됨", notes)

    def test_runtime_context_includes_causality_summary(self) -> None:
        now = datetime(2026, 6, 3, tzinfo=UTC)
        player = PlayerProfile(
            player_id="player_story_bible",
            display_name="당신",
            created_at=now,
            updated_at=now,
            traits={"archetype": "비접속자 (Ghost)"},
        )
        loop = _loop(phase=LoopPhase.EXPLORE, turn_index=51)
        memories = [
            PlayerMemory(
                memory_id="memory_causality",
                player_id="player_story_bible",
                kind="causality_summary",
                content={
                    "player_id": "player_story_bible",
                    "summary_text": "세린과의 도주, 관리자 감시, 붉은 우산 단서가 장기 인과율로 압축됨.",
                    "clue_symbols": ["red_umbrella"],
                    "tone_histogram": {"uneasy": 3, "resolved": 1},
                },
                weight=1.0,
                created_at=now,
                updated_at=now,
            )
        ]

        context = build_runtime_narrative_context(
            player=player,
            loop=loop,
            scenario=load_scenario("neo-seoul"),
            turn_index=51,
            recent_events=[],
            memories=memories,
            world_memories=[],
            narrative_shards=[],
            novelty_notes=[],
        )

        notes = "\n".join(context.novelty_notes)
        self.assertIn("=== CAUSALITY SUMMARY (장기 서사 압축 기억) ===", notes)
        self.assertIn("오래된 Narrative Shard 원문을 압축한 장기 인과율 기억", notes)
        self.assertIn("red_umbrella", notes)
        self.assertIn("uneasy:3", notes)

    def test_runtime_context_includes_stat_monologue(self) -> None:
        player = PlayerProfile(
            player_id="player_stat_test",
            display_name="테스터",
            created_at=datetime(2026, 6, 2, tzinfo=UTC),
            updated_at=datetime(2026, 6, 2, tzinfo=UTC),
            traits={
                "archetype": "비접속자 (Ghost)",
                "stats": {
                    "strength": 8,
                    "agility": 2,
                    "intelligence": 5,
                    "charisma": 4,
                    "perception": 6,
                },
            },
        )
        loop = _loop(phase=LoopPhase.CONNECT, turn_index=0)

        context = build_runtime_narrative_context(
            player=player,
            loop=loop,
            scenario=load_scenario("neo-seoul"),
            turn_index=0,
            recent_events=[],
            memories=[],
            world_memories=[],
            narrative_shards=[],
            novelty_notes=[],
        )

        notes = "\n".join(context.novelty_notes)
        self.assertIn(
            "=== 스탯 기반 내면 독백 지침 (DISCO ELYSIUM STYLE INNER MONOLOGUE) ===", notes
        )
        self.assertIn("해당 스탯 판정이 실제로 걸린 경우에만 등장", notes)
        self.assertIn("참고로 플레이어가 가장 뛰어난 특성은 근력 (Strength) (수치: 8)이므로", notes)
        self.assertIn("플레이어의 가장 취약한 특성은 민첩 (Agility) (수치: 2)입니다.", notes)

    def test_runtime_context_includes_travel_and_emergency_encounters(self) -> None:
        player = PlayerProfile(
            player_id="player_encounter_test",
            display_name="테스터",
            created_at=datetime(2026, 6, 2, tzinfo=UTC),
            updated_at=datetime(2026, 6, 2, tzinfo=UTC),
            traits={"archetype": "비접속자 (Ghost)"},
        )

        # 1. Travel encounter test
        loop = _loop(phase=LoopPhase.EXPLORE, turn_index=10, stability=80, tension=20)
        context = build_runtime_narrative_context(
            player=player,
            loop=loop,
            scenario=load_scenario("neo-seoul"),
            turn_index=10,
            recent_events=[],
            memories=[],
            world_memories=[],
            narrative_shards=[],
            novelty_notes=[],
            player_action="한강 야시장으로 이동",
        )
        notes = "\n".join(context.novelty_notes)
        self.assertIn("=== TRAVEL ENCOUNTER (이동 중 조우 이벤트) ===", notes)
        self.assertIn("중간 조우(Travel Interception) 이벤트를 묘사", notes)

        # 2. Emergency encounter (low stability)
        loop_low_stab = _loop(phase=LoopPhase.EXPLORE, turn_index=10, stability=15, tension=25)
        context_low_stab = build_runtime_narrative_context(
            player=player,
            loop=loop_low_stab,
            scenario=load_scenario("neo-seoul"),
            turn_index=10,
            recent_events=[],
            memories=[],
            world_memories=[],
            narrative_shards=[],
            novelty_notes=[],
            player_action="대기하기",
        )
        notes_low_stab = "\n".join(context_low_stab.novelty_notes)
        self.assertIn("=== EMERGENCY ENCOUNTERS (리소스 임계점 위기 상황) ===", notes_low_stab)
        self.assertIn("현재 [은신 안정도]가 매우 위험한 수준", notes_low_stab)

        # 3. Emergency encounter (high tension)
        loop_high_tens = _loop(phase=LoopPhase.EXPLORE, turn_index=10, stability=75, tension=85)
        context_high_tens = build_runtime_narrative_context(
            player=player,
            loop=loop_high_tens,
            scenario=load_scenario("neo-seoul"),
            turn_index=10,
            recent_events=[],
            memories=[],
            world_memories=[],
            narrative_shards=[],
            novelty_notes=[],
            player_action="대기하기",
        )
        notes_high_tens = "\n".join(context_high_tens.novelty_notes)
        self.assertIn("=== EMERGENCY ENCOUNTERS (리소스 임계점 위기 상황) ===", notes_high_tens)
        self.assertIn("현재 [관리망 추적도]가 극히 높은 수준", notes_high_tens)


if __name__ == "__main__":
    unittest.main()
