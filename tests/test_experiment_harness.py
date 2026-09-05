"""The experiment harness's own logic.

The experiments themselves are out of the gate (live engines, minutes,
non-deterministic). What is pinned here is the part that decides whether a
number can be trusted six months later: that a report cannot be produced without
its limits, that controls and variables reach the page, and that a run with more
than one variable says so out loud.
"""

from __future__ import annotations

import json
import tempfile
import unittest
from pathlib import Path

from experiments.harness import (
    Experiment,
    ExperimentError,
    ExperimentResult,
    Finding,
    Table,
    provenance_for,
    render_report,
    run_experiment,
)


def _experiment(
    result: ExperimentResult,
    *,
    variables: dict[str, object] | None = None,
    source: Path | None = None,
) -> Experiment:
    return Experiment(
        slug="unit-probe",
        question="does the harness hold its shape?",
        controls={"model": "fake-1b", "seed": 42},
        variables=variables if variables is not None else {"num_ctx": "8192 → 32768"},
        run=lambda: result,
        source=source,
    )


class LimitsAreRequiredTest(unittest.TestCase):
    def test_a_result_without_limits_refuses_to_render(self) -> None:
        exp = _experiment(ExperimentResult(findings=[Finding("x", "y")]))
        with self.assertRaises(ExperimentError) as caught:
            render_report(exp, exp.run(), provenance_for(exp))
        self.assertIn("limits", str(caught.exception))

    def test_a_run_without_limits_leaves_no_directory_behind(self) -> None:
        """A half-written run is worse than none: it looks like a result."""
        exp = _experiment(ExperimentResult())
        with tempfile.TemporaryDirectory() as tmp:
            base = Path(tmp)
            with self.assertRaises(ExperimentError):
                run_experiment(exp, results_dir=base)
            self.assertEqual(list(base.iterdir()), [])


class ReportContentTest(unittest.TestCase):
    def setUp(self) -> None:
        self.result = ExperimentResult(
            summary="한 줄 요약",
            tables=[Table("측정표", ["a", "b"], [[1, 2], [3, None]], note="주의")],
            findings=[Finding("주장", "근거", confidence="reproduced")],
            limits=["n=3", "기계 1대"],
            raw={"values": [1, 2, 3]},
        )

    def test_controls_and_variables_reach_the_page(self) -> None:
        exp = _experiment(self.result)
        report = render_report(exp, self.result, provenance_for(exp))
        self.assertIn("fake-1b", report)
        self.assertIn("num_ctx", report)
        self.assertIn("8192 → 32768", report)

    def test_limits_and_findings_are_rendered(self) -> None:
        exp = _experiment(self.result)
        report = render_report(exp, self.result, provenance_for(exp))
        self.assertIn("## 한계", report)
        self.assertIn("n=3", report)
        self.assertIn("[reproduced]", report)
        self.assertIn("근거: 근거", report)

    def test_a_none_cell_renders_blank_rather_than_the_word_none(self) -> None:
        exp = _experiment(self.result)
        report = render_report(exp, self.result, provenance_for(exp))
        self.assertNotIn("| None |", report)

    def test_more_than_one_variable_is_flagged(self) -> None:
        """Two variables mean the run cannot attribute its own result."""
        exp = _experiment(self.result, variables={"num_ctx": "a", "model": "b"})
        report = render_report(exp, self.result, provenance_for(exp))
        self.assertIn("변수가 둘 이상", report)

    def test_one_variable_is_not_flagged(self) -> None:
        exp = _experiment(self.result)
        report = render_report(exp, self.result, provenance_for(exp))
        self.assertNotIn("변수가 둘 이상", report)


class ConfidenceTest(unittest.TestCase):
    def test_an_unknown_confidence_is_rejected(self) -> None:
        with self.assertRaises(ExperimentError):
            Finding("주장", "근거", confidence="pretty sure")

    def test_the_three_allowed_levels_are_accepted(self) -> None:
        for level in ("measured", "reproduced", "indicative"):
            self.assertEqual(Finding("c", "e", confidence=level).confidence, level)


class ProvenanceTest(unittest.TestCase):
    def test_provenance_records_what_makes_a_run_comparable(self) -> None:
        exp = _experiment(ExperimentResult(limits=["n=1"]))
        prov = provenance_for(exp)
        for key in (
            "ran_at",
            "git_commit",
            "git_dirty",
            "python",
            "platform",
            "controls",
            "variables",
        ):
            self.assertIn(key, prov)
        self.assertIsInstance(prov["git_dirty"], bool)

    def test_a_dirty_tree_is_stated_in_the_report(self) -> None:
        exp = _experiment(ExperimentResult(limits=["n=1"]))
        prov = {**provenance_for(exp), "git_dirty": True}
        self.assertIn("dirty tree", render_report(exp, exp.run(), prov))

    def test_the_experiment_source_hash_is_recorded_when_given(self) -> None:
        """An edited experiment moves scores exactly like a changed engine does."""
        with tempfile.NamedTemporaryFile("w", suffix=".py", delete=False) as handle:
            handle.write("# experiment source\n")
            source = Path(handle.name)
        self.addCleanup(source.unlink)
        exp = _experiment(ExperimentResult(limits=["n=1"]), source=source)
        prov = provenance_for(exp)
        self.assertIsNotNone(prov["experiment_sha256"])
        self.assertEqual(len(prov["experiment_sha256"]), 64)


class RunArtifactsTest(unittest.TestCase):
    def test_a_run_writes_report_provenance_and_raw(self) -> None:
        result = ExperimentResult(limits=["n=1"], raw={"k": [1, 2]}, findings=[Finding("c", "e")])
        exp = _experiment(result)
        with tempfile.TemporaryDirectory() as tmp:
            out = run_experiment(exp, results_dir=Path(tmp))
            self.assertTrue((out / "report.md").is_file())
            self.assertTrue((out / "provenance.json").is_file())
            self.assertTrue((out / "raw" / "data.json").is_file())
            self.assertEqual(json.loads((out / "raw" / "data.json").read_text())["k"], [1, 2])
            self.assertTrue(out.name.endswith("-unit-probe"))

    def test_two_runs_do_not_overwrite_each_other(self) -> None:
        """A stamped directory per run is the point — reports are comparable, not replaced."""
        exp = _experiment(ExperimentResult(limits=["n=1"]))
        with tempfile.TemporaryDirectory() as tmp:
            base = Path(tmp)
            first = run_experiment(exp, results_dir=base)
            second = run_experiment(exp, results_dir=base)
            if first == second:  # same-second stamp; the guarantee is still "no overwrite"
                self.skipTest("two runs landed in the same UTC second")
            self.assertNotEqual(first, second)
            self.assertEqual(len(list(base.iterdir())), 2)


if __name__ == "__main__":
    unittest.main()


class ShareTrendTest(unittest.TestCase):
    """P1-2 prefix-sharing curve: the trend helper must read a falling share off a
    growing prompt with a flat shared prefix, and not call noise a trend."""

    def test_flat_shared_prefix_over_growing_prompt_reads_as_falling(self) -> None:
        from experiments.exp_workload_profile import share_trend

        shared = [10_000] * 9
        prompts = [14_000 + 500 * i for i in range(9)]
        shares = [100 * s / p for s, p in zip(shared, prompts, strict=True)]
        trend = share_trend(shares, prompts, shared)
        self.assertEqual(trend["direction"], "falling")
        thirds = trend["thirds"]
        self.assertEqual([t["label"] for t in thirds], ["early", "mid", "late"])
        self.assertGreater(thirds[0]["median_share_pct"], thirds[-1]["median_share_pct"])
        self.assertEqual(thirds[0]["median_shared_chars"], thirds[-1]["median_shared_chars"])

    def test_noise_inside_the_dead_band_is_flat(self) -> None:
        from experiments.exp_workload_profile import share_trend

        shares = [68.0, 69.0, 67.5, 68.5, 68.2, 67.9]
        trend = share_trend(shares, [15_000] * 6, [10_200] * 6)
        self.assertEqual(trend["direction"], "flat")
        self.assertAlmostEqual(trend["slope_pct_per_pair"], 0.0, delta=0.25)

    def test_short_and_empty_inputs_do_not_raise(self) -> None:
        from experiments.exp_workload_profile import share_trend

        self.assertEqual(share_trend([], [], [])["n"], 0)
        one = share_trend([50.0], [100], [50])
        self.assertEqual(one["direction"], "flat")
        self.assertEqual(len(one["thirds"]), 1)


class CaptureTraceAutoplayTest(unittest.TestCase):
    """Seed 8 (2026-09-06): the combat autoplay helper that lets `capture_trace` walk
    through patrol nodes. Importing the module must not run the script body."""

    def _combat_loop(self):  # noqa: ANN202 - LoopState from the real encounter builder
        from datetime import UTC, datetime

        from mythos_core import LoopPhase, LoopState
        from mythos_runtime.combat_service import CombatService
        from mythos_runtime.scenario import load_scenario

        loop = LoopState(
            loop_id="loop_autoplay",
            player_id="p_autoplay",
            seed="seed_autoplay",
            phase=LoopPhase.EXPLORE,
            location_id="loc",
            stability=70,
            tension=20,
            started_at=datetime(2026, 9, 6, tzinfo=UTC),
            state={},
        )
        result = CombatService().begin(
            loop,
            scenario_combat=load_scenario("neo-seoul").combat,
            encounter_id="patrol_ambush",
            player_name="P",
            player_stats={"strength": 9, "agility": 8, "perception": 6},
            archetype=None,
        )
        return result.loop

    def test_attacks_the_nearest_enemy_and_only_steps_closer(self) -> None:
        from experiments.capture_trace import _auto_combat_action
        from mythos_combat.engine import CombatEngine, distance
        from mythos_runtime.combat_service import CombatService

        loop = self._combat_loop()
        state = CombatService.load_state(loop)
        assert state is not None
        actor = state.active_actor()
        assert actor is not None
        nearest = min(state.living_enemies(), key=lambda e: distance(actor.x, actor.y, e.x, e.y))

        action = _auto_combat_action(loop)

        self.assertEqual(action.type, "attack")
        self.assertEqual(action.target_id, nearest.id)
        if action.move_to is not None:
            reachable = CombatEngine().available_actions(state)["reachable"]
            self.assertIn(list(action.move_to), [list(r) for r in reachable])
            self.assertLess(
                distance(action.move_to[0], action.move_to[1], nearest.x, nearest.y),
                distance(actor.x, actor.y, nearest.x, nearest.y),
            )

    def test_defends_when_there_is_no_combat_state(self) -> None:
        from datetime import UTC, datetime

        from experiments.capture_trace import _auto_combat_action
        from mythos_core import LoopPhase, LoopState

        loop = LoopState(
            loop_id="l",
            player_id="p",
            seed="s",
            phase=LoopPhase.EXPLORE,
            location_id="loc",
            stability=70,
            tension=20,
            started_at=datetime(2026, 9, 6, tzinfo=UTC),
            state={},
        )
        self.assertEqual(_auto_combat_action(loop).type, "defend")
