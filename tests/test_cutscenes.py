"""P1 컷씬 언락: directives/companions 로더 + 결정론 언락 평가 + 갤러리 페이로드."""

import unittest

from mythos_runtime.cutscenes import (
    cutscene_gallery,
    evaluate_unlocked_cutscenes,
    is_cutscene_unlocked,
    next_unseen_cutscene,
)
from mythos_runtime.scenario_directives import (
    CutsceneDirective,
    load_scenario_directives,
)


def _cs(cid, companion, affection, flags=None, image="img.png", title="t", body="b"):
    return CutsceneDirective(
        cutscene_id=cid,
        companion=companion,
        affection=affection,
        flags=flags or [],
        image=image,
        title=title,
        body=body,
    )


class CutsceneLoaderTest(unittest.TestCase):
    """neo-seoul companions/se_rin.md가 CutsceneDirective로 로드되는지."""

    def test_neo_seoul_loads_se_rin_cutscenes(self) -> None:
        directives = load_scenario_directives("neo-seoul")
        se_rin = [c for c in directives.cutscenes if c.companion == "se_rin"]
        self.assertGreaterEqual(len(se_rin), 2)
        ids = {c.cutscene_id for c in se_rin}
        self.assertIn("SERIN_FIRST_LIGHT", ids)
        self.assertIn("SERIN_PROMISE", ids)

    def test_neo_seoul_loads_every_companion_cutscene(self) -> None:
        directives = load_scenario_directives("neo-seoul")
        by_companion = {cutscene.companion for cutscene in directives.cutscenes}
        self.assertEqual(by_companion, {"se_rin", "kai", "lin_yue", "tae_o", "han", "su_ah"})
        self.assertEqual(len(directives.cutscenes), 7)

        expected = {
            "KAI_COUNTING_STARS",
            "LIN_YUE_LEDGER_MARGIN",
            "TAE_O_UNLATCHED_HOLSTER",
            "HAN_DEAD_CHANNEL",
            "SU_AH_WARM_MEMORY",
        }
        self.assertTrue(
            expected.issubset({cutscene.cutscene_id for cutscene in directives.cutscenes})
        )

    def test_cutscene_fields_parsed(self) -> None:
        directives = load_scenario_directives("neo-seoul")
        promise = directives.cutscene("SERIN_PROMISE")
        self.assertIsNotNone(promise)
        assert promise is not None
        self.assertEqual(promise.companion, "se_rin")
        self.assertEqual(promise.affection, 4)
        self.assertEqual(promise.flags, ["trusted_se_rin"])
        self.assertTrue(promise.image)
        self.assertTrue(promise.body)

    def test_english_cutscenes_keep_structural_parity(self) -> None:
        ko = load_scenario_directives("neo-seoul", "ko")
        en = load_scenario_directives("neo-seoul", "en")
        self.assertEqual(
            [cutscene.cutscene_id for cutscene in en.cutscenes],
            [cutscene.cutscene_id for cutscene in ko.cutscenes],
        )
        self.assertIn("promise", en.cutscene("SERIN_PROMISE").body.lower())  # type: ignore[union-attr]

    def test_scenario_without_companions_has_no_cutscenes(self) -> None:
        directives = load_scenario_directives("glass-library")
        self.assertEqual(directives.cutscenes, [])

    def test_unknown_scenario_empty(self) -> None:
        self.assertEqual(load_scenario_directives("does-not-exist").cutscenes, [])


class UnlockEvaluationTest(unittest.TestCase):
    def setUp(self) -> None:
        self.cutscenes = [
            _cs("A_LOW", "se_rin", 2),
            _cs("A_HIGH", "se_rin", 4, flags=["trusted_se_rin"]),
            _cs("B_KAI", "kai", 3),
        ]

    def test_affection_threshold_gates_unlock(self) -> None:
        self.assertEqual(evaluate_unlocked_cutscenes(self.cutscenes, {"se_rin": 1}, []), [])
        self.assertEqual(evaluate_unlocked_cutscenes(self.cutscenes, {"se_rin": 2}, []), ["A_LOW"])

    def test_flags_required(self) -> None:
        # affection met but missing flag → high cutscene stays locked
        self.assertEqual(evaluate_unlocked_cutscenes(self.cutscenes, {"se_rin": 5}, []), ["A_LOW"])
        self.assertEqual(
            sorted(evaluate_unlocked_cutscenes(self.cutscenes, {"se_rin": 5}, ["trusted_se_rin"])),
            ["A_HIGH", "A_LOW"],
        )

    def test_per_companion_independent(self) -> None:
        self.assertEqual(evaluate_unlocked_cutscenes(self.cutscenes, {"kai": 3}, []), ["B_KAI"])

    def test_missing_companion_reads_zero(self) -> None:
        self.assertEqual(evaluate_unlocked_cutscenes(self.cutscenes, {}, []), [])

    def test_malformed_relationship_value_is_safe(self) -> None:
        self.assertEqual(evaluate_unlocked_cutscenes(self.cutscenes, {"se_rin": "oops"}, []), [])

    def test_negative_affection_stays_locked(self) -> None:
        # a refused route can drive affection negative — no unlock
        self.assertEqual(evaluate_unlocked_cutscenes(self.cutscenes, {"se_rin": -3}, []), [])

    def test_result_is_sorted(self) -> None:
        cs = [_cs("Z", "se_rin", 1), _cs("A", "se_rin", 1)]
        self.assertEqual(evaluate_unlocked_cutscenes(cs, {"se_rin": 1}, []), ["A", "Z"])

    def test_is_cutscene_unlocked_empty_flags_always_satisfied(self) -> None:
        self.assertTrue(is_cutscene_unlocked(_cs("X", "se_rin", 1), {"se_rin": 1}, set()))

    def test_next_unseen_preserves_authored_order(self) -> None:
        first = next_unseen_cutscene(
            self.cutscenes,
            {"se_rin": 5, "kai": 3},
            ["trusted_se_rin"],
            [],
        )
        self.assertEqual(first.cutscene_id if first else None, "A_LOW")
        second = next_unseen_cutscene(
            self.cutscenes,
            {"se_rin": 5, "kai": 3},
            ["trusted_se_rin"],
            ["A_LOW"],
        )
        self.assertEqual(second.cutscene_id if second else None, "A_HIGH")

    def test_next_unseen_returns_none_when_every_eligible_cutscene_was_seen(self) -> None:
        self.assertIsNone(
            next_unseen_cutscene(
                self.cutscenes,
                {"se_rin": 2},
                [],
                ["A_LOW"],
            )
        )

    def test_present_companions_gate_suppresses_absent_companion_cutscene(self) -> None:
        # Carried affection alone (se_rin=5) unlocks A_LOW, but if Se-rin is not
        # present this loop the cutscene must NOT play in-game — she has to be
        # re-introduced first (owner design). This is the "Se-rin cutscene pops in
        # during a Lin-yue scene" bug.
        self.assertIsNone(
            next_unseen_cutscene(
                self.cutscenes,
                {"se_rin": 5},
                [],
                [],
                present_companions=set(),
            )
        )
        # Once she is present this loop, the same cutscene plays.
        present = next_unseen_cutscene(
            self.cutscenes,
            {"se_rin": 5},
            [],
            [],
            present_companions={"se_rin"},
        )
        self.assertEqual(present.cutscene_id if present else None, "A_LOW")

    def test_present_companions_none_keeps_legacy_ungated_behavior(self) -> None:
        # No gate passed → unchanged (gallery/legacy callers unaffected).
        result = next_unseen_cutscene(self.cutscenes, {"se_rin": 2}, [], [])
        self.assertEqual(result.cutscene_id if result else None, "A_LOW")


class CutsceneGalleryTest(unittest.TestCase):
    def setUp(self) -> None:
        self.cutscenes = [
            _cs("A_LOW", "se_rin", 2, image="a.png", body="prose-a"),
            _cs("A_HIGH", "se_rin", 4, flags=["trusted_se_rin"], image="b.png", body="prose-b"),
        ]

    def test_unlocked_entry_exposes_image_and_body(self) -> None:
        gallery = cutscene_gallery(self.cutscenes, ["A_LOW"])
        low = next(g for g in gallery if g["id"] == "A_LOW")
        self.assertTrue(low["unlocked"])
        self.assertEqual(low["image"], "a.png")
        self.assertEqual(low["body"], "prose-a")

    def test_locked_entry_hides_image_and_body_but_shows_requirement(self) -> None:
        gallery = cutscene_gallery(self.cutscenes, ["A_LOW"])
        high = next(g for g in gallery if g["id"] == "A_HIGH")
        self.assertFalse(high["unlocked"])
        self.assertIsNone(high["image"])
        self.assertIsNone(high["body"])
        self.assertEqual(high["affection_required"], 4)
        self.assertEqual(high["flags_required"], ["trusted_se_rin"])

    def test_gallery_covers_every_cutscene(self) -> None:
        self.assertEqual(len(cutscene_gallery(self.cutscenes, [])), 2)


if __name__ == "__main__":
    unittest.main()
