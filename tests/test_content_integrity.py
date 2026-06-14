"""Flag reference-integrity invariants (overnight QA seed, 2026-06-14).

Bot-checkable "doesn't break" guarantees for the neo-seoul authored content:
every flag the scenario *consumes* must have a recognized *producer*, so no
gate/branch/perspective is wired to a flag that can never become true.

The flag-production model is deliberately three-tiered (see DESIGN.md / the
narrative pipeline):

- **Authored, deterministic** — route perspective ``effect.flags`` set when a
  perspective resolves (``route_runtime`` merges them into ``state["flags"]``).
- **Engine, deterministic** — the onboarding special case in
  ``mythos_loop.engine`` that records ``met_se_rin`` / ``refused_se_rin`` from
  the player's early actions (mirrored by explicit Director instructions in
  ``scenario_context``).
- **Director, loosely coupled** — value-axis and narrative-state flags the
  Narrative Director emits via ``world_delta.flags``. These are guided by
  ``playability.choice_axes`` reward/cost bias and reacted to by
  ``route_branches`` / perspective ``when`` conditions, but never set by
  authored data. They are enumerated below in ``NARRATIVE_DRIVEN_FLAGS`` so the
  registry is reviewable: a *new* consumed flag that is neither authored- nor
  engine-produced and is **not** in this registry is a real content bug (a dead
  branch / typo) and fails the ratchet test, forcing a conscious decision to
  either produce it or register it.

Consumers covered: route node ``gate`` (hard reachability blockers), perspective
``when``, ``playability.route_branches[].trigger_flags``, and story-bible
``flags_any``. (Combat skill ``requires`` reference skill ids, not flags, and
``session_design.chapter_gates`` are prose summaries — neither is a structured
flag consumer, so neither is scanned.)

A violation is a real content bug to fix mechanically or surface as a Blocker,
not a flaky judgment call.
"""

import json
import unittest
from typing import Any

from mythos_combat.factory import _DEFAULT_STATS
from mythos_runtime.route_map import build_route_map, build_route_seed
from mythos_runtime.route_runtime import node_encounter_id
from mythos_runtime.scenario import PROJECT_ROOT, load_scenario

COMBAT_IMAGE_STATES = ("idle", "attack", "guard", "skill", "hit")

# Canonical Combatant stat keys — the single source of truth is the combat
# factory's default stat block; equipment ``stats`` bonuses are merged into this
# set in ``session._combat_stats``, so a bonus keyed on anything outside it is a
# dead stat (a typo) that buffs nothing.
COMBATANT_STATS = frozenset(_DEFAULT_STATS)

# Equipment slot vocabulary. ``session.equip_item`` enforces one worn item per
# ``slot`` and the character UI groups equipment by slot; ``weapon``/``armor`` are
# the only slots the loadout/UI recognise.
VALID_EQUIPMENT_SLOTS = frozenset({"weapon", "armor"})


def _as_records(pool: Any) -> list[dict[str, Any]]:
    """Normalise a combat pool (dict-keyed-by-id or list) to a record list."""
    if isinstance(pool, dict):
        return [v for v in pool.values() if isinstance(v, dict)]
    if isinstance(pool, list):
        return [v for v in pool if isinstance(v, dict)]
    return []


def _record_id(record: dict[str, Any], fallback: str) -> str:
    return str(record.get("id") or fallback)

# Flags produced deterministically by engine code, not by authored data.
# ``mythos_loop.engine`` records exactly one of these from the player's first
# actions during neo-seoul onboarding (turns 0-2); ``scenario_context`` also
# instructs the Director to emit them via ``world_delta.flags``.
ENGINE_PRODUCED_FLAGS = frozenset({"met_se_rin", "refused_se_rin"})

# Flags the Narrative Director emits via ``world_delta.flags`` — value-axis
# outcomes (people / evidence / safety / control) and narrative-state markers.
# No authored ``effect.flags`` sets them; they are reacted to by ``when`` /
# ``trigger_flags``. Keep this list in sync with the authored consumers: an
# entry here that nothing consumes is registry rot (see the "fully used" test),
# and a consumed flag missing from here is a dead branch (see the ratchet test).
NARRATIVE_DRIVEN_FLAGS = frozenset(
    {
        # value-axis outcomes (playability.choice_axes)
        "safety_first",
        "stability_focus",
        "dominance_focus",
        "insight_focus",
        "humanity_first",
        "destruction_will",
        # narrative-state markers
        "abandoned_citizen",
        "control_net_lockdown",
        "lin_yue_debt_due",
        "no_kai",
        "optimization_log_stolen",
        "rx09_extracted",
    }
)


def _route_flag_sets(route_map: dict[str, Any]) -> tuple[set[str], set[str], set[str]]:
    """Return (gate, when, effect-produced) flag sets from a route_map config."""
    gate: set[str] = set()
    when: set[str] = set()
    effect: set[str] = set()
    for layer in route_map.get("layers", []) or []:
        for anchor in layer.get("anchors", []) or []:
            gate.update(anchor.get("gate", []) or [])
            for perspective in anchor.get("perspectives", []) or []:
                when.update(perspective.get("when", []) or [])
                eff = perspective.get("effect", {}) or {}
                effect.update(eff.get("flags", []) or [])
    return gate, when, effect


def _load_bible(scenario_id: str) -> dict[str, Any]:
    path = PROJECT_ROOT / "resources" / scenario_id / "story_bible" / "bible.json"
    with open(path, encoding="utf-8") as handle:
        data: dict[str, Any] = json.load(handle)
    return data


class ContentFlagIntegrityTest(unittest.TestCase):
    def setUp(self) -> None:
        self.scenario = load_scenario("neo-seoul")
        self.route_map = self.scenario.route_map
        self.assertTrue(self.route_map, "neo-seoul must define a route_map config")
        self.gate, self.when, self.effect = _route_flag_sets(self.route_map)

        branches = self.scenario.playability.get("route_branches", []) or []
        self.trigger: set[str] = set()
        for branch in branches:
            self.trigger.update(branch.get("trigger_flags", []) or [])

        bible = _load_bible("neo-seoul")
        self.bible_ids = {
            e.get("id") for e in bible.get("entries", []) or [] if isinstance(e, dict)
        }
        self.flags_any: set[str] = set()
        for entry in bible.get("entries", []) or []:
            self.flags_any.update(entry.get("flags_any", []) or [])

        # Every flag the authored content reads, anywhere.
        self.consumed = self.gate | self.when | self.trigger | self.flags_any
        # Every flag a recognized producer can set.
        self.recognized = self.effect | ENGINE_PRODUCED_FLAGS | NARRATIVE_DRIVEN_FLAGS

    def test_route_gate_flags_are_producible(self) -> None:
        """Gate flags hard-block a node; an unproducible one permanently locks it.

        Gates are satisfied only by authored ``effect.flags`` or engine-produced
        onboarding flags — Director world_delta flags are too non-deterministic
        to anchor a hard reachability gate on, so they are intentionally excluded
        here.
        """
        producible = self.effect | ENGINE_PRODUCED_FLAGS
        unproducible = self.gate - producible
        self.assertEqual(
            unproducible,
            set(),
            f"route node gate flags with no authored/engine producer "
            f"(node permanently unreachable): {sorted(unproducible)}",
        )

    def test_route_branch_story_bible_entries_resolve(self) -> None:
        """Every route branch points at a real story-bible entry id."""
        branches = self.scenario.playability.get("route_branches", []) or []
        self.assertTrue(branches, "neo-seoul should declare route_branches")
        for branch in branches:
            entry = branch.get("story_bible_entry")
            self.assertIn(
                entry,
                self.bible_ids,
                f"route_branch {branch.get('id')!r} references missing story-bible "
                f"entry {entry!r}",
            )

    def test_every_consumed_flag_has_a_recognized_producer(self) -> None:
        """No "미생산" flag: every consumed flag is produced by some recognized
        mechanism (authored effect, engine onboarding, or registered Director
        world_delta flag). A new orphan flag here is a dead branch / typo."""
        orphans = self.consumed - self.recognized
        self.assertEqual(
            orphans,
            set(),
            f"flags consumed by gate/when/trigger/flags_any with no recognized "
            f"producer (add an authored effect, or register in "
            f"NARRATIVE_DRIVEN_FLAGS if Director-emitted): {sorted(orphans)}",
        )

    def test_narrative_driven_registry_is_fully_used(self) -> None:
        """Registry must not rot: every Director-driven flag is consumed somewhere
        and is not also authored-produced (which would make it redundant)."""
        unused = NARRATIVE_DRIVEN_FLAGS - self.consumed
        self.assertEqual(
            unused,
            set(),
            f"NARRATIVE_DRIVEN_FLAGS entries that nothing consumes (stale "
            f"registry — remove): {sorted(unused)}",
        )
        redundant = NARRATIVE_DRIVEN_FLAGS & self.effect
        self.assertEqual(
            redundant,
            set(),
            f"flags both authored-produced and registered as Director-driven "
            f"(drop from NARRATIVE_DRIVEN_FLAGS): {sorted(redundant)}",
        )


class ContentEncounterIntegrityTest(unittest.TestCase):
    def setUp(self) -> None:
        self.scenario = load_scenario("neo-seoul")
        self.route_map = self.scenario.route_map
        self.assertTrue(self.route_map, "neo-seoul must define a route_map config")
        self.combat = self.scenario.combat
        self.encounters = self.combat.get("encounters", {})
        self.bestiary = self.combat.get("bestiary", {})
        self.combat_encounters = self.route_map.get("combat_encounters")
        self.assertIsInstance(
            self.combat_encounters,
            dict,
            "neo-seoul route_map must map combat node types to encounter pools",
        )

    def _maps(self) -> list[dict[str, Any]]:
        maps: list[dict[str, Any]] = []
        for i in range(24):
            full = build_route_map(self.route_map, f"encounter-integrity-{i}")
            assert full is not None
            maps.append(full)
            seed = build_route_seed(self.route_map, f"encounter-integrity-{i}")
            assert seed is not None
            maps.append(seed)
        return maps

    def test_all_route_combat_nodes_map_to_non_empty_declared_encounter_pools(self) -> None:
        """Every generated combat node type must resolve to real combat encounters."""
        assert isinstance(self.combat_encounters, dict)
        generated_types: set[str] = set()
        for rm in self._maps():
            for node in rm["nodes"].values():
                if not node.get("combat"):
                    continue
                node_type = str(node.get("type", ""))
                generated_types.add(node_type)
                pool = self.combat_encounters.get(node_type)
                self.assertIsInstance(
                    pool,
                    list,
                    f"combat node type {node_type!r} has no encounter pool mapping",
                )
                assert isinstance(pool, list)
                self.assertTrue(
                    pool,
                    f"combat node type {node_type!r} maps to an empty encounter pool",
                )
                pick = node_encounter_id(node, self.combat_encounters, seed=str(rm.get("seed")))
                self.assertIn(
                    pick,
                    self.encounters,
                    f"combat node {node.get('id')} type {node_type!r} resolved to "
                    f"missing encounter {pick!r}",
                )
                missing = sorted(str(encounter_id) for encounter_id in pool if encounter_id not in self.encounters)
                self.assertEqual(
                    missing,
                    [],
                    f"combat node type {node_type!r} maps to undeclared encounters: {missing}",
                )

        self.assertTrue(generated_types, "route map should generate at least one combat node type")

    def test_all_encounter_enemies_reference_bestiary_with_full_action_sheets(self) -> None:
        """Every encounter enemy must resolve to bestiary art for all combat states."""
        resource_root = PROJECT_ROOT / "resources" / self.scenario.scenario_id
        for encounter_id, encounter in self.encounters.items():
            enemies = encounter.get("enemies", [])
            self.assertTrue(enemies, f"encounter {encounter_id!r} has no enemies")
            for index, enemy in enumerate(enemies):
                bestiary_id = str(enemy.get("bestiary", ""))
                self.assertIn(
                    bestiary_id,
                    self.bestiary,
                    f"encounter {encounter_id!r} enemy #{index} references missing "
                    f"bestiary id {bestiary_id!r}",
                )
                entry = self.bestiary.get(bestiary_id, {})
                images = entry.get("combat_images", {})
                missing_states = [state for state in COMBAT_IMAGE_STATES if not images.get(state)]
                self.assertEqual(
                    missing_states,
                    [],
                    f"bestiary {bestiary_id!r} is missing combat image states: {missing_states}",
                )
                missing_files = [
                    str(images[state])
                    for state in COMBAT_IMAGE_STATES
                    if not (resource_root / str(images[state])).exists()
                ]
                self.assertEqual(
                    missing_files,
                    [],
                    f"bestiary {bestiary_id!r} references missing combat image files: "
                    f"{missing_files}",
                )


class WeaponEquipmentIntegrityTest(unittest.TestCase):
    """Weapon/equipment reference integrity for the neo-seoul combat pools.

    Every weapon a loadout/ally/enemy reaches for must exist in ``combat.weapons``
    (else combat builds an unarmed/empty fallback the author never intended), and
    every ``kind:equipment`` item must declare a recognised ``slot`` and only
    buff real Combatant stats (else the bonus silently does nothing). A dangling
    id or typo'd stat is a mechanical content bug, not a judgment call.
    """

    def setUp(self) -> None:
        self.scenario = load_scenario("neo-seoul")
        self.combat = self.scenario.combat
        self.assertIsInstance(self.combat, dict, "neo-seoul must define a combat block")
        self.weapons = self.combat.get("weapons", {})
        self.weapon_ids = {
            _record_id(rec, "") for rec in _as_records(self.weapons)
        } - {""}
        self.assertTrue(self.weapon_ids, "combat.weapons must declare at least one weapon")

    def _assert_weapons_exist(self, owner: str, weapons: Any) -> list[str]:
        if weapons is None:
            return []
        self.assertIsInstance(
            weapons, list, f"{owner} weapons must be a list, got {type(weapons).__name__}"
        )
        dangling = sorted(str(w) for w in weapons if str(w) not in self.weapon_ids)
        self.assertEqual(
            dangling,
            [],
            f"{owner} references weapons missing from combat.weapons: {dangling}",
        )
        return [str(w) for w in weapons]

    def test_archetype_loadout_weapons_exist(self) -> None:
        loadout = self.combat.get("archetype_loadout", {})
        self.assertIsInstance(loadout, dict, "archetype_loadout must be an object")
        for archetype, weapons in loadout.items():
            self._assert_weapons_exist(f"archetype_loadout[{archetype!r}]", weapons)

    def test_ally_weapons_exist(self) -> None:
        for ally in _as_records(self.combat.get("allies", {})):
            self._assert_weapons_exist(
                f"ally {_record_id(ally, '?')!r}", ally.get("weapons")
            )

    def test_bestiary_weapons_exist(self) -> None:
        for beast in _as_records(self.combat.get("bestiary", {})):
            self._assert_weapons_exist(
                f"bestiary {_record_id(beast, '?')!r}", beast.get("weapons")
            )

    def test_equipment_slots_and_stats_are_valid(self) -> None:
        items = self.combat.get("items", {})
        equipment = [rec for rec in _as_records(items) if rec.get("kind") == "equipment"]
        self.assertTrue(equipment, "neo-seoul should declare at least one equipment item")
        for item in equipment:
            item_id = _record_id(item, "?")
            slot = item.get("slot")
            self.assertIn(
                slot,
                VALID_EQUIPMENT_SLOTS,
                f"equipment {item_id!r} has invalid slot {slot!r} "
                f"(expected one of {sorted(VALID_EQUIPMENT_SLOTS)})",
            )
            stats = item.get("stats", {})
            self.assertIsInstance(
                stats, dict, f"equipment {item_id!r} stats must be an object"
            )
            unknown = sorted(set(stats) - COMBATANT_STATS)
            self.assertEqual(
                unknown,
                [],
                f"equipment {item_id!r} buffs unknown stats {unknown} "
                f"(valid: {sorted(COMBATANT_STATS)})",
            )


if __name__ == "__main__":
    unittest.main()
