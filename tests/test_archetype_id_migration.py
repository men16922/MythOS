"""Regression tests for the stable archetype-id migration.

Combat/progression joins must key on a language-independent archetype id (not the
localizable Korean display name), while staying backward-compatible with saves and
clients that still carry the old display name.
"""

import unittest

from mythos_combat.encounter import loadout_for_archetype
from mythos_runtime.progression import _ARCHETYPE_ALIASES, _defaulted_archetypes
from mythos_runtime.scenario import load_scenario
from mythos_runtime.scenario_context import apply_archetype_traits, resolve_archetype_id


class ResolveArchetypeIdTest(unittest.TestCase):
    def setUp(self) -> None:
        self.scenario = load_scenario("neo-seoul")

    def test_id_passes_through(self) -> None:
        self.assertEqual(resolve_archetype_id(self.scenario, "ghost"), "ghost")

    def test_legacy_display_name_maps_to_id(self) -> None:
        self.assertEqual(resolve_archetype_id(self.scenario, "비접속자 (Ghost)"), "ghost")
        self.assertEqual(
            resolve_archetype_id(self.scenario, "데이터 밀수꾼 (Data Smuggler)"),
            "data_smuggler",
        )

    def test_unknown_value_passes_through(self) -> None:
        self.assertEqual(resolve_archetype_id(self.scenario, "nonsense"), "nonsense")
        self.assertIsNone(resolve_archetype_id(self.scenario, None))


class ApplyArchetypeTraitsTest(unittest.TestCase):
    def setUp(self) -> None:
        self.scenario = load_scenario("neo-seoul")

    def test_id_input_canonicalizes_name_and_sets_id(self) -> None:
        enriched = apply_archetype_traits({"archetype": "ghost"}, self.scenario)
        # archetype is canonicalized to the display name (used by {archetype} prompt/UI)
        self.assertEqual(enriched["archetype"], "비접속자 (Ghost)")
        # archetype_id drives combat/progression joins
        self.assertEqual(enriched["archetype_id"], "ghost")
        self.assertTrue(enriched["stats"])

    def test_legacy_name_input_yields_same_id(self) -> None:
        enriched = apply_archetype_traits({"archetype": "비접속자 (Ghost)"}, self.scenario)
        self.assertEqual(enriched["archetype_id"], "ghost")
        self.assertEqual(enriched["archetype"], "비접속자 (Ghost)")


class CombatJoinByIdTest(unittest.TestCase):
    def test_loadout_keys_on_id_not_display_name(self) -> None:
        combat = load_scenario("neo-seoul").combat
        self.assertEqual(loadout_for_archetype(combat, "ghost"), ["vibro_blade"])
        # the old Korean display name no longer keys the dict (-> unarmed fallback)
        self.assertEqual(loadout_for_archetype(combat, "비접속자 (Ghost)"), ["unarmed"])


class DefaultedArchetypesBackCompatTest(unittest.TestCase):
    def test_legacy_names_normalize_to_ids_with_default(self) -> None:
        # An old player_progression row that stored Korean display names.
        out = _defaulted_archetypes(["데이터 밀수꾼 (Data Smuggler)"])
        self.assertIn("data_smuggler", out)
        self.assertIn("ghost", out)  # always-unlocked base id is ensured
        self.assertNotIn("데이터 밀수꾼 (Data Smuggler)", out)

    def test_aliases_cover_both_scenarios(self) -> None:
        self.assertEqual(_ARCHETYPE_ALIASES["제본 도주자 (Binder Fugitive)"], "binder_fugitive")
        # no duplicates introduced when an id is already present
        out = _defaulted_archetypes(["ghost", "ghost"])
        self.assertEqual(out.count("ghost"), 1)


if __name__ == "__main__":
    unittest.main()
