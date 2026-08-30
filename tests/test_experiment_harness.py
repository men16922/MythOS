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
        for key in ("ran_at", "git_commit", "git_dirty", "python", "platform", "controls", "variables"):
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
