"""B2 Loop2+ 오프닝 변주 (CBT 피드백 #2: 다회차 유인).

- 변주 파일 스캔/로딩: opening_<id>.md ×6 (kai/lin_yue/han/su_ah/tae_o/solo), KO/EN
  패리티, 전부 1컷(max_turn=0) 재진입 축약.
- 선택 규칙: 1회차 = 항상 default 5컷; 2회차+ = 시드 결정론 + 언락·미만남 동료 우선;
  변주 없는 시나리오(glass-library)는 항상 default.
- 어셈블러: _opening_variant 상태가 변주 beat를 synopsis에 주입 (default beat 미주입),
  1컷이므로 turn 1부터 오프닝 지시 없음.
- 엔진 가드: 변주 루프의 turn<=2 세린 키워드 휴리스틱 비활성 (spurious met_se_rin 방지).
"""

from __future__ import annotations

import unittest
from datetime import UTC, datetime

from mythos_core.models import LoopPhase, LoopState, PlayerProfile
from mythos_runtime.scenario import load_scenario
from mythos_runtime.scenario_context import build_runtime_narrative_context
from mythos_runtime.scenario_directives import (
    available_opening_variants,
    load_scenario_directives,
)
from mythos_runtime.session import _select_opening_variant

VARIANTS = {"kai", "lin_yue", "han", "su_ah", "tae_o", "solo"}


class OpeningVariantFilesTest(unittest.TestCase):
    def test_neo_seoul_authors_all_six_variants(self) -> None:
        self.assertEqual(set(available_opening_variants("neo-seoul")), VARIANTS)

    def test_scenario_without_variants_scans_empty(self) -> None:
        self.assertEqual(available_opening_variants("glass-library"), frozenset())

    def test_every_variant_owns_a_three_turn_reentry_window_in_both_languages(self) -> None:
        """S4 (variant-routed opening): the 1-cut design grew into a turn 0-3 window
        so the variant's hook develops instead of evaporating into the Se-rin rail
        at turn 1 (live evidence 2026-07-06). Beats at turns 0/1/2; turn 3 rides the
        header rules only. Every beat forbids the Se-rin first-contact re-enactment
        and never completes a meeting or starts combat."""
        for variant in sorted(VARIANTS):
            for language in ("ko", "en"):
                directives = load_scenario_directives(
                    "neo-seoul", language, opening_variant=variant
                )
                self.assertEqual(
                    directives.opening_max_turn, 3, f"{variant}/{language} window is not 0-3"
                )
                self.assertEqual(
                    [b.turn for b in directives.opening_beats],
                    [0, 1, 2],
                    f"{variant}/{language} beat turns wrong",
                )
                self.assertTrue(directives.opening_header, f"{variant}/{language} lost header")
                for beat in directives.opening_beats:
                    self.assertIn(
                        "REENTRY", beat.body, f"{variant}/{language} turn {beat.turn} body"
                    )
                    # 변주는 만남을 완결하지 않는다 — 전투도 시작하지 않는다.
                    self.assertIsNone(beat.start_combat)
                    self.assertTrue(beat.forbidden, f"{variant}/{language} turn {beat.turn}")
                # 후속 비트(턴1+)는 세린 표준 첫-접촉 재연을 명시적으로 금지한다.
                for beat in directives.opening_beats[1:]:
                    self.assertIn(
                        "se_rin",
                        beat.forbidden.lower().replace("-", "_"),
                        f"{variant}/{language} turn {beat.turn} missing the se_rin policy",
                    )

    def test_unknown_variant_falls_back_to_default_opening(self) -> None:
        directives = load_scenario_directives("neo-seoul", "ko", opening_variant="nonexistent")
        self.assertEqual(directives.opening_max_turn, 4)
        self.assertEqual(len(directives.opening_beats), 5)


class OpeningVariantSelectionTest(unittest.TestCase):
    def test_loop_one_is_always_default(self) -> None:
        picked = _select_opening_variant(
            "neo-seoul",
            seed="s1",
            loop_index=1,
            unlocked_companions={"han", "su_ah"},
            met_companions=set(),
        )
        self.assertEqual(picked, "default")

    def test_loop_two_prefers_unlocked_unmet_companion(self) -> None:
        picked = _select_opening_variant(
            "neo-seoul",
            seed="s2",
            loop_index=2,
            unlocked_companions={"han"},
            met_companions={"kai"},
        )
        self.assertEqual(picked, "han")

    def test_all_met_pool_includes_solo_and_never_default(self) -> None:
        seen: set[str] = set()
        for i in range(60):
            picked = _select_opening_variant(
                "neo-seoul",
                seed=f"pool-{i}",
                loop_index=3,
                unlocked_companions={"han", "su_ah", "tae_o", "lin_yue"},
                met_companions={"kai", "han", "su_ah", "tae_o", "lin_yue"},
            )
            self.assertNotEqual(picked, "default", "loop 2+ must never replay the 5-cut")
            seen.add(picked)
        self.assertIn("solo", seen, "solo variant never surfaced across seeds")

    def test_deterministic_per_seed(self) -> None:
        def _pick() -> str:
            return _select_opening_variant(
                "neo-seoul",
                seed="det",
                loop_index=2,
                unlocked_companions={"han", "su_ah"},
                met_companions=set(),
            )

        self.assertEqual(_pick(), _pick())

    def test_scenario_without_variants_stays_default(self) -> None:
        picked = _select_opening_variant(
            "glass-library",
            seed="s3",
            loop_index=4,
            unlocked_companions={"han"},
            met_companions=set(),
        )
        self.assertEqual(picked, "default")


class OpeningVariantAssemblerTest(unittest.TestCase):
    def _context(self, turn: int, *, variant: str | None, action: str | None = None):
        now = datetime(2026, 7, 5, tzinfo=UTC)
        player = PlayerProfile("p1", "T", now, now, {"archetype": "Unclassified"})
        phase = LoopPhase.CONNECT if turn == 0 else LoopPhase.EXPLORE
        state: dict = {"_loop_index": 2}
        if variant:
            state["_opening_variant"] = variant
        loop = LoopState("l", "p1", "s", phase, "data-layer-01", 70, 30, now, None, state, [])
        return build_runtime_narrative_context(
            player=player,
            loop=loop,
            scenario=load_scenario("neo-seoul"),
            turn_index=turn,
            recent_events=[],
            memories=[],
            world_memories=[],
            narrative_shards=[],
            novelty_notes=[],
            player_action=action,
        )

    def test_variant_beat_replaces_default_in_synopsis(self) -> None:
        ctx = self._context(0, variant="kai")
        joined = "\n".join(ctx.session_synopsis)
        self.assertIn("BACKDOOR SIGNAL", joined)
        self.assertIn("Unclassified", joined)  # {archetype} filled
        self.assertNotIn("AWAKENING", joined)  # default SCENE1 not injected
        # 변주는 세린 티저 연속성 노트를 재생하지 않는다.
        self.assertTrue(all("SHOT 01" not in s for s in ctx.session_synopsis))

    def test_variant_is_one_cut_no_directive_from_turn_one(self) -> None:
        ctx = self._context(1, variant="solo", action="계속 나아간다")
        self.assertTrue(all("ONBOARDING_SCENE" not in s for s in ctx.session_synopsis))

    def test_default_state_keeps_five_cut_opening(self) -> None:
        ctx = self._context(0, variant=None)
        joined = "\n".join(ctx.session_synopsis)
        self.assertIn("AWAKENING", joined)


class OpeningVariantEngineGuardTest(unittest.TestCase):
    def test_variant_loop_skips_se_rin_keyword_flags(self) -> None:
        from mythos_core.models import Actor, Choice, Scene, WorldEvent
        from mythos_loop.engine import LoopEngine
        from mythos_narrative import ScenePayload

        now = datetime(2026, 7, 5, tzinfo=UTC)
        scene = Scene(
            scene_id="s0",
            loop_id="l",
            turn_index=1,
            title="재진입",
            location="loc",
            narration="골목.",
            choices=[Choice("c1", "좌표를 따라간다", "explore")],
            visual_brief=None,
            created_at=now,
        )
        payload = ScenePayload(
            title=scene.title,
            location=scene.location,
            narration=scene.narration,
            choices=scene.choices,
            visual_brief="",
        )
        event = WorldEvent(
            event_id="e1",
            loop_id="l",
            turn_index=1,
            actor=Actor.PLAYER,
            action="좌표를 따라간다",
            result=None,
            state_delta={},
            created_at=now,
        )

        def _run(state: dict) -> list[str]:
            loop = LoopState("l", "p1", "s", LoopPhase.EXPLORE, "loc", 70, 30, now, None, state, [])
            transition = LoopEngine().apply_scene_payload(loop, scene, payload, chosen_event=event)
            return list(transition.loop.state.get("flags", []))

        default_flags = _run({"scenario_id": "neo-seoul"})
        self.assertIn("met_se_rin", default_flags)  # 기존 휴리스틱 유지
        variant_flags = _run({"scenario_id": "neo-seoul", "_opening_variant": "solo"})
        self.assertNotIn("met_se_rin", variant_flags)
        self.assertNotIn("refused_se_rin", variant_flags)


class CompanionPresenceGuardTest(unittest.TestCase):
    """An un-joined companion must not be castable into a variant loop mid-play.

    Owner-reported 2026-07-10 (prod loop_2a0ddb…, su_ah variant, turn 2): the model
    wrote Se-rin in as the "가이드 핑" sender with NO met_se_rin flag and an empty
    party — pure GM casting, primed by the prior-loop 'met people' echo. Two guards:
    a persistent COMPANION PRESENCE RULE, and reframing the past-ally echo as absent.
    """

    def _ctx(self, *, variant: str, turn: int, world_memories):
        now = datetime(2026, 7, 10, tzinfo=UTC)
        player = PlayerProfile("p1", "T", now, now, {"archetype": "Unclassified"})
        state: dict = {"_loop_index": 2, "_opening_variant": variant, "scenario_id": "neo-seoul"}
        loop = LoopState(
            "l", "p1", "s", LoopPhase.EXPLORE, "data-layer-01", 70, 30, now, None, state, []
        )
        return build_runtime_narrative_context(
            player=player,
            loop=loop,
            scenario=load_scenario("neo-seoul"),
            turn_index=turn,
            recent_events=[],
            memories=[],
            world_memories=world_memories,
            narrative_shards=[],
            novelty_notes=[],
            player_action="가이드 핑의 발신원을 추적한다",
        )

    def _run_summary(self, allies: list[str]):
        from mythos_core.models import WorldMemory

        now = datetime(2026, 7, 10, tzinfo=UTC)
        return WorldMemory(
            memory_id="m1",
            world_id="w",
            kind="run_summary",
            content={
                "ending_label": "생존",
                "turns": 12,
                "clues_collected": [],
                "allies_met": allies,
                "summary_text": "이전 루프의 잔향.",
            },
            weight=1.0,
            created_at=now,
            updated_at=now,
        )

    def test_presence_rule_injected_every_turn(self) -> None:
        notes = "\n".join(self._ctx(variant="su_ah", turn=8, world_memories=[]).novelty_notes)
        self.assertIn("동료 등장 규칙", notes)

    def test_past_ally_echo_reframed_as_absent_not_present(self) -> None:
        # Post-opening su_ah loop whose PRIOR run met Se-rin: her name may appear
        # only as past-and-absent, never as the bare present-tense "만난 인물" list.
        notes = "\n".join(
            self._ctx(
                variant="su_ah", turn=8, world_memories=[self._run_summary(["정세린"])]
            ).novelty_notes
        )
        self.assertIn("정세린", notes)
        self.assertIn("과거 루프에서 스친 인물", notes)
        self.assertNotIn("만난 인물: [", notes)


if __name__ == "__main__":
    unittest.main()
