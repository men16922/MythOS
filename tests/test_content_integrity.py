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

import ast
import json
import unittest
from typing import Any

from mythos_combat.factory import _DEFAULT_STATS
from mythos_runtime.ending_resolver import EndingResolver
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

    def test_boss_node_resolves_to_ix_confrontation_with_ix_present(self) -> None:
        """The Neo-Seoul climax must be a real IX boss fight, not a generic drone
        spawn (CBT gap fix, plan 2026-06-30). Three mechanical guarantees:

        - ``administrator_ix`` is a boss-tier bestiary combatant (HP >= 30),
        - the ``ix_confrontation`` encounter exists and actually fields IX, and
        - every generated ``boss`` route node deterministically resolves to
          ``ix_confrontation`` (so reaching the final node always confronts IX).
        """
        assert isinstance(self.combat_encounters, dict)
        ix = self.bestiary.get("administrator_ix")
        self.assertIsInstance(ix, dict, "bestiary must declare administrator_ix")
        assert isinstance(ix, dict)
        self.assertGreaterEqual(
            int(ix.get("hp", 0)),
            30,
            "administrator_ix must be boss-tier HP (>=30)",
        )

        encounter = self.encounters.get("ix_confrontation")
        self.assertIsInstance(encounter, dict, "encounters must declare ix_confrontation")
        assert isinstance(encounter, dict)
        enemy_ids = {str(e.get("bestiary")) for e in encounter.get("enemies", []) or []}
        self.assertIn(
            "administrator_ix",
            enemy_ids,
            "ix_confrontation must field administrator_ix (boss present in the fight)",
        )

        boss_seen = False
        for rm in self._maps():
            for node in rm["nodes"].values():
                if node.get("type") != "boss":
                    continue
                boss_seen = True
                pick = node_encounter_id(
                    node, self.combat_encounters, seed=str(rm.get("seed"))
                )
                self.assertEqual(
                    pick,
                    "ix_confrontation",
                    f"boss node {node.get('id')} resolved to {pick!r}, "
                    f"expected ix_confrontation",
                )
        self.assertTrue(boss_seen, "route map should generate a boss node")

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


class SkillDataIntegrityTest(unittest.TestCase):
    """Skill data integrity for the neo-seoul combat pools.

    Every ``combat.skills[]`` entry must carry the fields the combat engine and
    Codex UI read (``id``/``name``/``cost``/``effect``) and never declare a
    negative ``cooldown``/``cost.focus``/``range`` (a negative would either crash
    cost accounting or silently grant a free/zero-range action). Every skill *id*
    the scenario reaches for elsewhere — archetype base loadouts, ally kits, and
    ``requires`` prerequisites — must resolve to a real skill, and every
    ``skill.epiphany`` unlock must name a declared ``combat.epiphanies`` key (else
    the data-driven grant unlocks nothing). A missing field, negative number, or
    dangling reference is a mechanical content bug, not a judgment call.

    The 2026-06-20 skill/ally data-closure batch extends the same reference-closure
    discipline to three more silent failure modes (seed ②③, the icon-independent
    slice of the blocked skill/icon-integrity item):

    - ``cost.item`` paid in an item id missing from ``combat.items`` — the skill
      debits a resource the inventory can never hold, so it can never be afforded
      (e.g. ``patch_protocol`` → ``nanopatch``).
    - a ``requires`` prerequisite **cycle** — a skill (transitively) gating on
      itself can never be unlocked, freezing that whole chain out of the tree.
    - a ``requires`` prerequisite of a **higher tier** than the skill that needs it
      — the Codex tree gates a skill behind something strictly harder to unlock, an
      inverted gate that makes the tier ordering meaningless. (Equal tiers are
      allowed: the authored tree chains tier-1 skills off tier-1 prerequisites.)

    (Seed ① ``allies[].skills`` ⊆ skills and ④ ``skill.epiphany`` resolution are
    already locked by ``test_ally_skills_exist`` / ``test_skill_epiphany_unlocks_resolve``
    above, and ② reference-resolution by ``test_skill_requires_resolve``; this batch
    closes the remaining acyclicity / tier-order / item-cost gaps.)
    """

    REQUIRED_FIELDS = ("id", "name", "cost", "effect")

    def setUp(self) -> None:
        self.scenario = load_scenario("neo-seoul")
        self.combat = self.scenario.combat
        self.assertIsInstance(self.combat, dict, "neo-seoul must define a combat block")
        self.skills = self.combat.get("skills", {})
        self.skill_records = _as_records(self.skills)
        self.assertTrue(self.skill_records, "combat.skills must declare at least one skill")
        self.skill_ids = {_record_id(rec, "") for rec in self.skill_records} - {""}
        self.epiphany_keys = set(self.combat.get("epiphanies", {}) or {})
        self.item_ids = {
            _record_id(rec, "") for rec in _as_records(self.combat.get("items", {}))
        } - {""}
        # tier defaults to 0 (the Codex base tier) when missing/non-int, matching
        # how the unlock tree treats an untagged skill.
        self.tier_by_id = {
            _record_id(rec, ""): (
                rec["tier"]
                if isinstance(rec.get("tier"), int) and not isinstance(rec.get("tier"), bool)
                else 0
            )
            for rec in self.skill_records
        }

    def test_every_skill_has_required_fields(self) -> None:
        for skill in self.skill_records:
            sid = _record_id(skill, "?")
            missing = [f for f in self.REQUIRED_FIELDS if not skill.get(f)]
            self.assertEqual(
                missing,
                [],
                f"skill {sid!r} is missing required fields: {missing}",
            )

    def test_no_negative_numeric_fields(self) -> None:
        for skill in self.skill_records:
            sid = _record_id(skill, "?")
            cooldown = skill.get("cooldown")
            if cooldown is not None:
                self.assertGreaterEqual(
                    cooldown, 0, f"skill {sid!r} has negative cooldown {cooldown!r}"
                )
            rng = skill.get("range")
            if rng is not None:
                self.assertGreaterEqual(
                    rng, 0, f"skill {sid!r} has negative range {rng!r}"
                )
            cost = skill.get("cost", {})
            if isinstance(cost, dict) and "focus" in cost:
                focus = cost["focus"]
                self.assertGreaterEqual(
                    focus, 0, f"skill {sid!r} has negative cost.focus {focus!r}"
                )

    def _assert_skill_refs_exist(self, owner: str, refs: Any) -> None:
        if refs is None:
            return
        self.assertIsInstance(
            refs, list, f"{owner} skills must be a list, got {type(refs).__name__}"
        )
        dangling = sorted(str(r) for r in refs if str(r) not in self.skill_ids)
        self.assertEqual(
            dangling,
            [],
            f"{owner} references skills missing from combat.skills: {dangling}",
        )

    def test_archetype_base_skills_exist(self) -> None:
        base = self.combat.get("archetype_base_skills", {})
        self.assertIsInstance(base, dict, "archetype_base_skills must be an object")
        for archetype, refs in base.items():
            self._assert_skill_refs_exist(f"archetype_base_skills[{archetype!r}]", refs)

    def test_ally_skills_exist(self) -> None:
        for ally in _as_records(self.combat.get("allies", {})):
            self._assert_skill_refs_exist(
                f"ally {_record_id(ally, '?')!r}", ally.get("skills")
            )

    def test_skill_requires_resolve(self) -> None:
        for skill in self.skill_records:
            self._assert_skill_refs_exist(
                f"skill {_record_id(skill, '?')!r} requires", skill.get("requires")
            )

    def test_skill_epiphany_unlocks_resolve(self) -> None:
        dangling = sorted(
            f"{_record_id(s, '?')}->{s['epiphany']}"
            for s in self.skill_records
            if s.get("epiphany") and s["epiphany"] not in self.epiphany_keys
        )
        self.assertEqual(
            dangling,
            [],
            f"skill.epiphany unlocks naming undeclared combat.epiphanies keys: {dangling}",
        )

    def test_skill_cost_items_resolve(self) -> None:
        """A skill paid in an item (``cost.item``) must name a real ``combat.items``
        id, else the cost debits a resource the inventory can never hold and the
        skill can never be afforded (the ``patch_protocol`` → ``nanopatch`` link)."""
        dangling = sorted(
            f"{_record_id(s, '?')}->{s['cost']['item']}"
            for s in self.skill_records
            if isinstance(s.get("cost"), dict)
            and s["cost"].get("item")
            and str(s["cost"]["item"]) not in self.item_ids
        )
        self.assertEqual(
            dangling,
            [],
            f"skill cost.item naming items missing from combat.items "
            f"(the cost can never be paid): {dangling}",
        )

    def test_skill_requires_are_acyclic(self) -> None:
        """The ``requires`` prerequisite graph must be a DAG. A skill that
        (transitively) requires itself can never satisfy its own gate, so it and
        everything downstream is permanently unlockable — a dead branch of the
        tree. Only edges to real skills are walked (dangling refs are caught by
        ``test_skill_requires_resolve``)."""
        graph = {
            _record_id(s, ""): [
                str(r) for r in (s.get("requires") or []) if str(r) in self.skill_ids
            ]
            for s in self.skill_records
        }
        # 0=unvisited, 1=on current DFS stack, 2=done.
        state: dict[str, int] = {}
        cycle: list[str] = []

        def _visit(node: str, path: list[str]) -> bool:
            state[node] = 1
            for dep in graph.get(node, []):
                if state.get(dep, 0) == 1:
                    cycle.extend(path[path.index(dep):] + [dep])
                    return True
                if state.get(dep, 0) == 0 and _visit(dep, path + [dep]):
                    return True
            state[node] = 2
            return False

        for sid in graph:
            if state.get(sid, 0) == 0 and _visit(sid, [sid]):
                break
        self.assertEqual(
            cycle,
            [],
            f"skill.requires forms a prerequisite cycle (unlockable forever): "
            f"{' -> '.join(cycle)}",
        )

    def test_skill_requires_are_tier_monotonic(self) -> None:
        """A ``requires`` prerequisite must not sit at a *higher* tier than the
        skill that needs it. A higher-tier prerequisite is an inverted gate — the
        easier skill is locked behind a harder one — which makes the tier ordering
        meaningless. Equal tiers are allowed (the authored tree chains tier-1
        skills off tier-1 prerequisites)."""
        offenders: list[str] = []
        for skill in self.skill_records:
            sid = _record_id(skill, "?")
            skill_tier = self.tier_by_id.get(sid, 0)
            for ref in skill.get("requires") or []:
                ref = str(ref)
                if ref not in self.skill_ids:
                    continue  # dangling ref — covered elsewhere
                ref_tier = self.tier_by_id.get(ref, 0)
                if ref_tier > skill_tier:
                    offenders.append(
                        f"{sid}(tier {skill_tier}) requires {ref}(tier {ref_tier})"
                    )
        self.assertEqual(
            offenders,
            [],
            f"skill.requires prerequisites of a higher tier than the gated skill "
            f"(inverted unlock gate): {offenders}",
        )


class LootTableIntegrityTest(unittest.TestCase):
    """Loot-table reference integrity for the neo-seoul combat pools.

    Every ``combat.loot_tables[*][].item`` must resolve to a real ``combat.items``
    id, and every roll must carry a positive ``weight``. A dangling item id means
    a combat reward rolls into nothing (the player wins a drop the inventory can
    never materialise), and a non-positive weight either makes an entry
    unreachable (``weight==0``) or corrupts the weighted draw (``weight<0``).
    Both are mechanical content bugs, not judgment calls.
    """

    def setUp(self) -> None:
        self.scenario = load_scenario("neo-seoul")
        self.combat = self.scenario.combat
        self.assertIsInstance(self.combat, dict, "neo-seoul must define a combat block")
        self.loot_tables = self.combat.get("loot_tables", {})
        self.assertIsInstance(
            self.loot_tables, dict, "combat.loot_tables must be an object"
        )
        self.assertTrue(self.loot_tables, "combat.loot_tables must declare at least one table")
        self.item_ids = {
            _record_id(rec, "") for rec in _as_records(self.combat.get("items", {}))
        } - {""}
        self.assertTrue(self.item_ids, "combat.items must declare at least one item")

    def test_loot_table_items_exist(self) -> None:
        dangling = sorted(
            f"{table_id}->{entry.get('item')}"
            for table_id, rolls in self.loot_tables.items()
            for entry in (rolls or [])
            if isinstance(entry, dict) and str(entry.get("item")) not in self.item_ids
        )
        self.assertEqual(
            dangling,
            [],
            f"loot_table entries reference items missing from combat.items: {dangling}",
        )

    def test_loot_table_weights_are_positive(self) -> None:
        non_positive = sorted(
            f"{table_id}->{entry.get('item')}={entry.get('weight')}"
            for table_id, rolls in self.loot_tables.items()
            for entry in (rolls or [])
            if isinstance(entry, dict)
            and not (isinstance(entry.get("weight"), (int, float)) and entry["weight"] > 0)
        )
        self.assertEqual(
            non_positive,
            [],
            f"loot_table entries with non-positive/non-numeric weight: {non_positive}",
        )


class EncounterBoundsIntegrityTest(unittest.TestCase):
    """Numeric-bounds integrity for the neo-seoul combat encounters.

    The encounter spawner and the operation-map weighted draw read three numeric
    shapes that have no meaningful non-positive value: every ``enemies[].count``
    must be at least 1 (a zero/negative count spawns an empty side — an instant,
    unintended walkover), every encounter ``weight`` must be positive (a
    non-positive weight makes the encounter either unreachable in the draw or
    corrupts the weighted selection), and each ``arena.{width,height}`` must be
    positive (a zero/negative dimension yields a degenerate board with no legal
    tiles). Bestiary references are covered by ``ContentEncounterIntegrityTest``;
    this class guards only the numbers. A violation is a mechanical content bug,
    not a judgment call.
    """

    def setUp(self) -> None:
        self.scenario = load_scenario("neo-seoul")
        self.combat = self.scenario.combat
        self.assertIsInstance(self.combat, dict, "neo-seoul must define a combat block")
        self.encounters = self.combat.get("encounters", {})
        self.encounter_records = _as_records(self.encounters)
        self.assertTrue(
            self.encounter_records, "combat.encounters must declare at least one encounter"
        )

    @staticmethod
    def _is_positive(value: Any) -> bool:
        return isinstance(value, (int, float)) and not isinstance(value, bool) and value > 0

    def test_enemy_counts_are_at_least_one(self) -> None:
        bad: list[str] = []
        for encounter in self.encounter_records:
            eid = _record_id(encounter, "?")
            for index, enemy in enumerate(encounter.get("enemies", []) or []):
                count = enemy.get("count")
                if not (
                    isinstance(count, int)
                    and not isinstance(count, bool)
                    and count >= 1
                ):
                    bad.append(f"{eid}.enemies[{index}].count={count!r}")
        self.assertEqual(
            bad,
            [],
            f"encounter enemies with count < 1 (would spawn an empty/invalid side): {bad}",
        )

    def test_encounter_weights_are_positive(self) -> None:
        bad = sorted(
            f"{_record_id(e, '?')}.weight={e.get('weight')!r}"
            for e in self.encounter_records
            if not self._is_positive(e.get("weight"))
        )
        self.assertEqual(
            bad,
            [],
            f"encounters with non-positive/non-numeric weight (unreachable or "
            f"corrupts the weighted draw): {bad}",
        )

    def test_encounter_arena_dimensions_are_positive(self) -> None:
        bad: list[str] = []
        for encounter in self.encounter_records:
            eid = _record_id(encounter, "?")
            arena = encounter.get("arena")
            if not isinstance(arena, dict):
                bad.append(f"{eid}.arena={arena!r}")
                continue
            for dim in ("width", "height"):
                if not self._is_positive(arena.get(dim)):
                    bad.append(f"{eid}.arena.{dim}={arena.get(dim)!r}")
        self.assertEqual(
            bad,
            [],
            f"encounters with non-positive/missing arena dimensions (degenerate "
            f"board): {bad}",
        )


class ItemKindEnumIntegrityTest(unittest.TestCase):
    """Enum closure for ``combat.items[].kind`` in the neo-seoul item pool.

    The item ``kind`` is the discriminator that both ends of the stack switch
    on: the runtime only lets ``kind == "consumable"`` items be used in combat
    (``session.py``), and the inventory UI buckets/labels by kind
    (``CharacterPanel.tsx`` ``KIND_LABELS`` + category mapping →
    consumable/equipment/material/key/data). An item whose ``kind`` falls
    outside the recognised set silently falls through to a generic "item"
    bucket and can never be used or equipped — a typo guard, not a judgment
    call. Weapon ``kind`` (melee/ranged) lives under ``combat.weapons`` and is
    a different namespace, so it is intentionally out of scope here.
    """

    # The set the game actually recognises. Keep in sync with
    # CharacterPanel.tsx KIND_LABELS / category mapping and the consumable
    # gate in mythos_runtime.session.
    RECOGNISED_KINDS = frozenset(
        {"consumable", "equipment", "key", "data", "material"}
    )

    def setUp(self) -> None:
        self.scenario = load_scenario("neo-seoul")
        self.combat = self.scenario.combat
        self.assertIsInstance(self.combat, dict, "neo-seoul must define a combat block")
        self.item_records = _as_records(self.combat.get("items", {}))
        self.assertTrue(self.item_records, "combat.items must declare at least one item")

    def test_item_kinds_are_recognised(self) -> None:
        unknown = sorted(
            f"{_record_id(item, '?')}.kind={item.get('kind')!r}"
            for item in self.item_records
            if item.get("kind") not in self.RECOGNISED_KINDS
        )
        self.assertEqual(
            unknown,
            [],
            "combat.items with kind outside the recognised set "
            f"{sorted(self.RECOGNISED_KINDS)} (would fall through to a generic "
            f"bucket, unusable/unequippable): {unknown}",
        )


def _bible_paths() -> list[Any]:
    """All authored story-bible files, discovered under ``resources/*/``."""
    root = PROJECT_ROOT / "resources"
    return sorted(root.glob("*/story_bible/bible.json"))


def _is_positive_number(value: Any) -> bool:
    # bool is an int subclass; a True priority is an authoring mistake, not 1.
    return isinstance(value, (int, float)) and not isinstance(value, bool) and value > 0


class StoryBibleMetaIntegrityTest(unittest.TestCase):
    """Metadata invariants for every authored ``story_bible/bible.json``.

    The selector (``mythos_runtime.story_bible.select_story_bible_entries``)
    ranks entries by ``priority`` and packs them under a ``token_budget`` cap,
    keying everything off the entry ``id``. The loader is lenient — it coerces
    missing/garbage fields to defaults (``priority`` 0, ``token_budget`` 600,
    ``kind`` "note") — so authoring slips never surface at runtime; they just
    silently misrank or get clipped. This guards the raw JSON instead:

    - duplicate ``id`` — two entries collide; one shadows the other in any
      id-keyed lookup and the snippet set is silently short.
    - non-positive ``priority`` — sorts to the bottom and is effectively never
      selected (a typo'd 0/negative is a dead entry).
    - non-positive ``token_budget`` — contributes nothing to the packed budget,
      so the entry can never be injected.
    - empty/missing ``kind`` — loses the discriminator used for tagging/notes.

    A violation is a mechanical content bug to fix or surface as a Blocker.
    """

    def setUp(self) -> None:
        self.bibles = _bible_paths()
        self.assertTrue(
            self.bibles, "expected at least one resources/*/story_bible/bible.json"
        )

    def _entries(self, path: Any) -> list[dict[str, Any]]:
        with open(path, encoding="utf-8") as handle:
            data = json.load(handle)
        return [e for e in data.get("entries", []) or [] if isinstance(e, dict)]

    def test_entry_ids_are_unique(self) -> None:
        offenders: list[str] = []
        for path in self.bibles:
            ids = [str(e.get("id")) for e in self._entries(path) if e.get("id")]
            dupes = sorted({i for i in ids if ids.count(i) > 1})
            offenders.extend(f"{path.parent.parent.name}:{i}" for i in dupes)
        self.assertEqual(
            offenders, [], f"duplicate story-bible entry ids (one shadows the other): {offenders}"
        )

    def test_entries_have_non_empty_kind(self) -> None:
        offenders: list[str] = []
        for path in self.bibles:
            scenario = path.parent.parent.name
            for entry in self._entries(path):
                kind = entry.get("kind")
                if not (isinstance(kind, str) and kind.strip()):
                    offenders.append(f"{scenario}:{entry.get('id', '?')}.kind={kind!r}")
        self.assertEqual(
            offenders, [], f"story-bible entries with empty/missing kind: {offenders}"
        )

    def test_priority_and_token_budget_are_positive(self) -> None:
        offenders: list[str] = []
        for path in self.bibles:
            scenario = path.parent.parent.name
            for entry in self._entries(path):
                eid = entry.get("id", "?")
                if not _is_positive_number(entry.get("priority")):
                    offenders.append(f"{scenario}:{eid}.priority={entry.get('priority')!r}")
                if not _is_positive_number(entry.get("token_budget")):
                    offenders.append(
                        f"{scenario}:{eid}.token_budget={entry.get('token_budget')!r}"
                    )
        self.assertEqual(
            offenders,
            [],
            "story-bible entries with non-positive priority/token_budget "
            f"(would never be selected/injected): {offenders}",
        )


def _scenario_json_paths() -> list[Any]:
    """All authored top-level scenario files, discovered under ``resources/*/``."""
    root = PROJECT_ROOT / "resources"
    return sorted(root.glob("*/scenario.json"))


def _ally_ids(scenario_data: dict[str, Any]) -> set[str]:
    """Combat ally slug ids declared under ``combat.allies`` (dict-keyed or list)."""
    allies = (scenario_data.get("combat") or {}).get("allies") or {}
    ids: set[str] = set()
    if isinstance(allies, dict):
        for key, rec in allies.items():
            ids.add(str(key))
            if isinstance(rec, dict) and rec.get("id"):
                ids.add(str(rec["id"]))
    elif isinstance(allies, list):
        for rec in allies:
            if isinstance(rec, dict) and rec.get("id"):
                ids.add(str(rec["id"]))
    return ids - {""}


def _relationship_keys(obj: Any) -> set[str]:
    """Every companion id any authored ``effect.relationship`` delta targets.

    Relationship deltas are authored as ``effect: {relationship: {<id>: ±n}}`` on
    route perspectives (and, prospectively, scene choices). Scan recursively so the
    guard covers every ``effect.relationship`` block regardless of where in the
    scenario tree it is authored.
    """
    keys: set[str] = set()
    if isinstance(obj, dict):
        for k, v in obj.items():
            if k == "relationship" and isinstance(v, dict):
                keys.update(str(name) for name in v)
            else:
                keys |= _relationship_keys(v)
    elif isinstance(obj, list):
        for item in obj:
            keys |= _relationship_keys(item)
    return keys


class NpcAgendaSubjectIntegrityTest(unittest.TestCase):
    """Subject integrity for ``npc_agendas`` keys across every scenario.

    ``npc_agendas`` keys are consumed only as a Director hint string
    (``scenario_context.py`` builds ``"SCENARIO_NPC_AGENDAS: <names>"``), so a key
    need not be a ``characters[].name``. But it must resolve to *some* declared
    subject, or it is a typo silently feeding a bogus name to the GM. The
    recognised resolution (human design decision, 2026-06-15) is:

    - it matches a ``characters[].name`` (a real, modelled character), **or**
    - it is listed in ``npc_agenda_allowed_subjects`` — an explicit allowlist of
      intentional non-character / abstract subjects.

    Two scenarios legitimately rely on the allowlist:

    - **neo-seoul** declares ``characters[]`` and matches 4 of 5 agenda keys
      there; ``최적화 명단 대상자`` is an intentional abstract/collective subject
      (an unnamed "purge-list target", not a character).
    - **glass-library** declares no ``characters[]`` array at all — its agenda
      keys *are* its cast, so each is a self-declared subject.

    The allowlist makes that intent explicit while still catching genuine typos
    (a key that is neither a character nor a declared subject). Two anti-rot
    guards keep the allowlist honest: every declared subject must actually be an
    agenda key, and must not shadow a real ``characters[].name`` (declare once).
    """

    def _scenarios(self) -> list[tuple[str, dict[str, Any]]]:
        out: list[tuple[str, dict[str, Any]]] = []
        for path in _scenario_json_paths():
            with open(path, encoding="utf-8") as handle:
                out.append((path.parent.name, json.load(handle)))
        return out

    @staticmethod
    def _character_names(data: dict[str, Any]) -> set[str]:
        return {
            str(c.get("name"))
            for c in (data.get("characters") or [])
            if isinstance(c, dict) and c.get("name")
        }

    def test_every_agenda_key_resolves_to_character_or_declared_subject(self) -> None:
        offenders: list[str] = []
        for name, data in self._scenarios():
            agendas = data.get("npc_agendas") or {}
            if not agendas:
                continue
            chars = self._character_names(data)
            allowed = set(data.get("npc_agenda_allowed_subjects") or [])
            for key in agendas:
                if key not in chars and key not in allowed:
                    offenders.append(f"{name}:{key!r}")
        self.assertEqual(
            offenders,
            [],
            "npc_agendas keys that are neither a characters[].name nor a declared "
            "npc_agenda_allowed_subjects entry (typo feeds a bogus name to the GM): "
            f"{offenders}",
        )

    def test_allowed_subjects_are_used_and_not_also_characters(self) -> None:
        offenders: list[str] = []
        for name, data in self._scenarios():
            allowed = data.get("npc_agenda_allowed_subjects") or []
            if not allowed:
                continue
            agenda_keys = set((data.get("npc_agendas") or {}).keys())
            chars = self._character_names(data)
            for subject in allowed:
                if subject not in agenda_keys:
                    offenders.append(f"{name}:{subject!r} (stale: not an agenda key)")
                if subject in chars:
                    offenders.append(
                        f"{name}:{subject!r} (also a characters[].name — declare once)"
                    )
        self.assertEqual(
            offenders,
            [],
            "npc_agenda_allowed_subjects entries that are stale or shadow a "
            f"character: {offenders}",
        )


def _route_effect_keys(scenario_data: dict[str, Any]) -> set[str]:
    """Every key authored on a route perspective or scene-choice ``effect`` block.

    Scoped to the *narrative* effect namespace — ``route_map`` layer anchor
    perspectives and scene ``choices`` — and deliberately excluding combat skill /
    item ``effect`` blocks, which the combat engine consumes under a wholly
    separate vocabulary (``damage``/``heal``/``move``/…). Scanning that namespace
    would conflate two unrelated key sets and defeat the typo guard.
    """
    keys: set[str] = set()
    route_map = scenario_data.get("route_map") or {}
    for layer in route_map.get("layers", []) or []:
        for anchor in layer.get("anchors", []) or []:
            for perspective in anchor.get("perspectives", []) or []:
                eff = perspective.get("effect")
                if isinstance(eff, dict):
                    keys.update(str(k) for k in eff)

    def _walk(obj: Any) -> None:
        if isinstance(obj, dict):
            choices = obj.get("choices")
            if isinstance(choices, list):
                for choice in choices:
                    if isinstance(choice, dict) and isinstance(choice.get("effect"), dict):
                        keys.update(str(k) for k in choice["effect"])
            for value in obj.values():
                _walk(value)
        elif isinstance(obj, list):
            for item in obj:
                _walk(item)

    _walk(scenario_data)
    return keys


# Narrative ``effect`` keys the runtime actually applies when a route perspective
# resolves (and, prospectively, when a scene choice carries an ``effect``):
#   - ``flags``                            -> route_runtime resolve loop merges
#                                             them into state["flags"]
#                                             (``route_runtime.py`` line ~96)
#   - ``relationship``                     -> route_runtime resolve loop tallies
#                                             companion affection into
#                                             state["relationships"] (P0 호감도
#                                             런타임, NEXT_PLAN seed L)
#   - ``stability`` / ``tension`` / ``insight`` -> session._apply_route_node_reward
#                                             (``session.py`` lines ~1322-1326)
# Combat skill / item ``effect`` blocks (damage/heal/move/…) are a different
# namespace owned by the combat engine and are out of scope (see _route_effect_keys).
CONSUMED_ROUTE_EFFECT_KEYS = frozenset(
    {"flags", "relationship", "stability", "tension", "insight"}
)

# No route-effect keys are currently authored-but-unconsumed. New keys land here
# first (recognised, not a typo) until a consumer is wired, then move to CONSUMED;
# the anti-rot guard below notices if a pending key stops being authored.
PENDING_ROUTE_EFFECT_KEYS: frozenset[str] = frozenset()

RECOGNISED_ROUTE_EFFECT_KEYS = CONSUMED_ROUTE_EFFECT_KEYS | PENDING_ROUTE_EFFECT_KEYS


class RouteEffectKeyClosureTest(unittest.TestCase):
    """Enum closure for route perspective / scene-choice ``effect`` keys.

    A narrative ``effect`` block is applied key-by-key: the runtime reads exactly
    the keys in CONSUMED_ROUTE_EFFECT_KEYS and ignores everything else. So a
    misspelled key (``stabilty``, ``realtionship``) does not error — it is silently
    dropped, exactly the failure mode that left ``relationship`` dead for so long.
    This invariant closes the set: every authored route-effect key must be either
    consumed today or a registered pending key. An unrecognised key is a real
    content bug (a typo whose delta never lands) to fix or surface as a Blocker.

    The scan globs ``resources/*/scenario.json`` so new scenarios are covered
    automatically.
    """

    def _scenarios(self) -> list[tuple[str, dict[str, Any]]]:
        out: list[tuple[str, dict[str, Any]]] = []
        for path in _scenario_json_paths():
            with open(path, encoding="utf-8") as handle:
                out.append((path.parent.name, json.load(handle)))
        return out

    def test_route_effect_keys_are_recognised(self) -> None:
        offenders: list[str] = []
        for name, data in self._scenarios():
            unknown = sorted(_route_effect_keys(data) - RECOGNISED_ROUTE_EFFECT_KEYS)
            offenders.extend(f"{name}:{key!r}" for key in unknown)
        self.assertEqual(
            offenders,
            [],
            "route perspective/choice effect keys outside the recognised set "
            f"{sorted(RECOGNISED_ROUTE_EFFECT_KEYS)} (a misspelled key is silently "
            f"dropped — its delta never lands): {offenders}",
        )

    def test_pending_effect_keys_are_still_authored(self) -> None:
        """Anti-rot: a pending (recognised-but-not-yet-consumed) key must still be
        authored somewhere. If nothing authors it anymore, it was wired into a
        consumer (move it to CONSUMED) or removed (drop it) — either way the
        PENDING registry is stale."""
        authored: set[str] = set()
        for _name, data in self._scenarios():
            authored |= _route_effect_keys(data)
        stale = sorted(PENDING_ROUTE_EFFECT_KEYS - authored)
        self.assertEqual(
            stale,
            [],
            "PENDING_ROUTE_EFFECT_KEYS entries that nothing authors anymore "
            f"(stale — promote to CONSUMED or remove): {stale}",
        )


class RelationshipSubjectIntegrityTest(unittest.TestCase):
    """Subject integrity for ``effect.relationship`` deltas across every scenario.

    Companion affection is authored as ``effect: {relationship: {<id>: ±n}}`` on
    route perspectives. The P0 호감도 런타임 will accumulate these into
    ``loop.state["relationships"][<id>]``; today they are dead data
    (``route_runtime`` applies only ``effect.flags``). A delta keyed on an id that
    names no real companion silently accrues affection for a ghost, so every key
    must resolve to a recognised companion subject:

    - a **combat ally id** (``combat.allies`` slug / ``id``) — a modelled,
      fightable companion, **or**
    - an entry in ``relationship_subjects`` — an explicit allowlist of non-combat
      companions who carry affection but never enter combat.

    neo-seoul's authored roster (plan 2026-06-16) is six companions: 정세린/카이/
    태오/한/수아 are combat allies (slugs ``se_rin``/``kai``/``tae_o``/``han``/
    ``su_ah``); 린위에 (``lin_yue``) is the night-market broker — a relationship
    subject with no combat sheet, declared in ``relationship_subjects``. The
    allowlist makes that intent explicit while still catching a typo'd key
    (``se_rim``) that would silently drop. Two anti-rot guards keep the allowlist
    honest: every declared subject must actually be targeted by some delta, and
    must not shadow a combat ally id (declare once).
    """

    def _scenarios(self) -> list[tuple[str, dict[str, Any]]]:
        out: list[tuple[str, dict[str, Any]]] = []
        for path in _scenario_json_paths():
            with open(path, encoding="utf-8") as handle:
                out.append((path.parent.name, json.load(handle)))
        return out

    def test_every_relationship_key_resolves_to_ally_or_declared_subject(self) -> None:
        offenders: list[str] = []
        for name, data in self._scenarios():
            keys = _relationship_keys(data)
            if not keys:
                continue
            recognised = _ally_ids(data) | set(data.get("relationship_subjects") or [])
            for key in sorted(keys):
                if key not in recognised:
                    offenders.append(f"{name}:{key!r}")
        self.assertEqual(
            offenders,
            [],
            "effect.relationship keys that are neither a combat ally id nor a "
            "declared relationship_subjects entry (a typo silently accrues "
            f"affection for a ghost companion): {offenders}",
        )

    def test_relationship_subjects_are_used_and_not_also_allies(self) -> None:
        offenders: list[str] = []
        for name, data in self._scenarios():
            subjects = data.get("relationship_subjects") or []
            if not subjects:
                continue
            keys = _relationship_keys(data)
            ally_ids = _ally_ids(data)
            for subject in subjects:
                if subject not in keys:
                    offenders.append(
                        f"{name}:{subject!r} (stale: no relationship delta targets it)"
                    )
                if subject in ally_ids:
                    offenders.append(
                        f"{name}:{subject!r} (also a combat ally id — declare once)"
                    )
        self.assertEqual(
            offenders,
            [],
            "relationship_subjects entries that are stale or shadow a combat ally "
            f"id: {offenders}",
        )


class CutsceneIntegrityTest(unittest.TestCase):
    """Reference integrity for authored companion cutscenes across every scenario.

    A cutscene (``directives/companions/<name>.md``) unlocks deterministically on
    affection + flags (``mythos_runtime.cutscenes``). Three mechanical ways one can
    be silently dead/broken — none a judgment call:

    - ``companion`` is neither a combat ally id nor a ``relationship_subjects`` entry
      → no affection ever accrues for it, so the cutscene never unlocks.
    - a required ``flag`` has no producer (``effect.flags``/ally ``unlock_flags``)
      → the flag gate is permanently false, so the cutscene is unreachable.
    - the curated ``image`` path does not exist under the scenario resources → a
      broken gallery card on unlock.
    """

    def _cutscenes_by_scenario(self) -> list[tuple[str, dict[str, Any], Any]]:
        from mythos_runtime.scenario_directives import load_scenario_directives

        out: list[tuple[str, dict[str, Any], Any]] = []
        for path in _scenario_json_paths():
            scenario_id = path.parent.name
            with open(path, encoding="utf-8") as handle:
                data = json.load(handle)
            for cutscene in load_scenario_directives(scenario_id).cutscenes:
                out.append((scenario_id, data, cutscene))
        return out

    def test_cutscene_companions_resolve(self) -> None:
        offenders: list[str] = []
        for scenario_id, data, cs in self._cutscenes_by_scenario():
            companions = _ally_ids(data) | set(data.get("relationship_subjects") or [])
            if cs.companion not in companions:
                offenders.append(f"{scenario_id}:{cs.cutscene_id}->{cs.companion!r}")
        self.assertEqual(
            offenders, [], f"cutscene companions with no affection source: {offenders}"
        )

    def test_cutscene_flags_are_producible(self) -> None:
        offenders: list[str] = []
        for scenario_id, data, cs in self._cutscenes_by_scenario():
            producible = _producible_flags(data)
            dead = [f for f in cs.flags if f not in producible]
            if dead:
                offenders.append(f"{scenario_id}:{cs.cutscene_id}->{dead}")
        self.assertEqual(
            offenders, [], f"cutscene gate flags no producer can set: {offenders}"
        )

    def test_cutscene_images_exist(self) -> None:
        offenders: list[str] = []
        for scenario_id, _data, cs in self._cutscenes_by_scenario():
            base = PROJECT_ROOT / "resources" / scenario_id
            if not cs.image or not (base / cs.image).exists():
                offenders.append(f"{scenario_id}:{cs.cutscene_id}->{cs.image!r}")
        self.assertEqual(offenders, [], f"cutscene image paths not found: {offenders}")

    def test_cutscene_affection_is_positive(self) -> None:
        offenders = [
            f"{sid}:{cs.cutscene_id}"
            for sid, _data, cs in self._cutscenes_by_scenario()
            if cs.affection <= 0
        ]
        self.assertEqual(offenders, [], f"cutscenes with non-positive threshold: {offenders}")


# Names the ending resolver binds in its evaluation namespace
# (``ending_resolver.EndingResolver.resolve_ending`` builds ``eval_namespace``).
# A ``Name`` an ending condition references that is *not* one of these raises
# ``NameError`` inside ``ASTConditionEvaluator``, which ``resolve_ending`` catches
# and logs — so the ending silently never fires. Keep in sync with that method's
# ``eval_namespace`` keys (``__builtins__`` excluded — it is sandbox plumbing, not
# a referenceable symbol).
RECOGNISED_ENDING_SYMBOLS = frozenset(
    {
        # derived metrics (EndingResolver.calculate_scores + clue_count)
        "Humanity",
        "Insight",
        "Resilience",
        "Dominance",
        # live loop metrics
        "Stability",
        "Tension",
        # autonomy level (progression.determine_autonomy_level)
        "Autonomy",
        # the flag set, consumed via ``flags contains <flag>``
        "flags",
    }
)


def _ending_symbols_and_flags(condition: str) -> tuple[set[str], set[str]]:
    """Return (referenced Name symbols, referenced flag literals) for a condition.

    Preprocess with the *runtime's own* ``_preprocess_condition`` so the test parses
    exactly what the resolver evaluates (``&&``→``and``, ``flags contains X``→
    ``"X" in flags``). After that rewrite every ``ast.Name`` is a namespace symbol
    and every string ``ast.Constant`` is a flag literal (the only source of string
    constants is the ``flags contains`` rewrite); numeric constants are ignored.
    """
    processed = EndingResolver._preprocess_condition(condition)
    tree = ast.parse(processed, mode="eval")
    symbols = {n.id for n in ast.walk(tree) if isinstance(n, ast.Name)}
    flags = {
        n.value
        for n in ast.walk(tree)
        if isinstance(n, ast.Constant) and isinstance(n.value, str)
    }
    return symbols, flags


def _producible_flags(scenario_data: dict[str, Any]) -> set[str]:
    """Flags the scenario can actually make true at runtime.

    Two authored producer surfaces, plus the engine onboarding flags:

    - route perspective ``effect.flags`` (key ``flags``) — ``route_runtime`` merges
      these into ``state["flags"]`` when a perspective resolves.
    - ally ``unlock_flags`` — ``combat_service`` sets these when an ally is recruited.

    ``trigger_flag`` / ``flags_any`` are *consumers* (side-arc / story-bible
    reactions), not producers, so they are intentionally excluded — an ending flag
    that only appears there has no producer and is dead.
    """
    produced: set[str] = set(ENGINE_PRODUCED_FLAGS)

    def _walk(obj: Any) -> None:
        if isinstance(obj, dict):
            for key, value in obj.items():
                if key in ("flags", "unlock_flags") and isinstance(value, list):
                    produced.update(str(v) for v in value)
                _walk(value)
        elif isinstance(obj, list):
            for item in obj:
                _walk(item)

    _walk(scenario_data)
    return produced


class EndingConditionReferenceIntegrityTest(unittest.TestCase):
    """Reference integrity for ``endings[].condition`` across every scenario.

    An ending condition is a boolean expression the ``EndingResolver`` evaluates in
    a fixed namespace. Two ways an ending can be silently un-winnable:

    - a condition references an **unknown symbol** (a typo'd metric like
      ``Humanty``, or a metric the resolver never binds) — evaluation raises
      ``NameError``, which ``resolve_ending`` swallows, so the ending can never
      fire.
    - a condition gates on a **flag no producer can set** (``flags contains
      <flag>`` for a flag nothing authors) — the clause is permanently false, so
      the ending is unreachable.

    Both are mechanical content bugs (a dead ending the player can never earn), not
    judgment calls. The scan globs ``resources/*/scenario.json`` so new scenarios
    are covered automatically.
    """

    def _scenarios(self) -> list[tuple[str, dict[str, Any]]]:
        out: list[tuple[str, dict[str, Any]]] = []
        for path in _scenario_json_paths():
            with open(path, encoding="utf-8") as handle:
                out.append((path.parent.name, json.load(handle)))
        return out

    def _conditions(self, data: dict[str, Any]) -> list[tuple[str, str]]:
        out: list[tuple[str, str]] = []
        for ending in data.get("endings", []) or []:
            if not isinstance(ending, dict):
                continue
            condition = ending.get("condition")
            if condition:
                out.append((str(ending.get("id", "?")), str(condition)))
        return out

    def test_at_least_one_ending_condition_exists(self) -> None:
        """Guard the guard: if no scenario has any ending condition, the reference
        tests below are vacuously green and the invariant is asleep."""
        total = sum(len(self._conditions(data)) for _name, data in self._scenarios())
        self.assertGreater(total, 0, "expected at least one authored ending condition")

    def test_ending_condition_symbols_are_recognised(self) -> None:
        offenders: list[str] = []
        for name, data in self._scenarios():
            for ending_id, condition in self._conditions(data):
                symbols, _flags = _ending_symbols_and_flags(condition)
                for symbol in sorted(symbols - RECOGNISED_ENDING_SYMBOLS):
                    offenders.append(f"{name}:{ending_id}:{symbol!r}")
        self.assertEqual(
            offenders,
            [],
            "ending conditions referencing symbols outside the resolver namespace "
            f"{sorted(RECOGNISED_ENDING_SYMBOLS)} (a NameError is swallowed — the "
            f"ending can never fire): {offenders}",
        )

    def test_ending_condition_flags_are_producible(self) -> None:
        offenders: list[str] = []
        for name, data in self._scenarios():
            producible = _producible_flags(data)
            for ending_id, condition in self._conditions(data):
                _symbols, flags = _ending_symbols_and_flags(condition)
                for flag in sorted(flags - producible):
                    offenders.append(f"{name}:{ending_id}:{flag!r}")
        self.assertEqual(
            offenders,
            [],
            "ending conditions gating on flags no producer can set (authored "
            "effect.flags or ally unlock_flags) — the clause is permanently false, "
            f"so the ending is unreachable: {offenders}",
        )


def _route_node_type_usage(
    scenario_data: dict[str, Any],
) -> tuple[set[str], set[str], set[str]]:
    """Return ``(declared, pool_types, anchor_types)`` for a scenario's route map.

    - ``declared``    — keys of ``route_map.node_types`` (the registry).
    - ``pool_types``  — every type listed in any layer's ``pool``.
    - ``anchor_types``— every anchor's resolved ``type`` (a bare-string anchor *is*
      its type; a dict anchor uses its ``type`` field, defaulting to ``"story"``
      exactly as ``route_map._layer_node_specs`` resolves it).

    Scenarios without a ``route_map.node_types`` dict (e.g. the static
    ``glass-library``) return three empty sets — they have no dynamic route map to
    constrain.
    """
    route_map = scenario_data.get("route_map") or {}
    node_types = route_map.get("node_types")
    if not isinstance(node_types, dict):
        return set(), set(), set()
    declared = {str(k) for k in node_types}
    pool_types: set[str] = set()
    anchor_types: set[str] = set()
    for layer in route_map.get("layers", []) or []:
        if not isinstance(layer, dict):
            continue
        for t in layer.get("pool", []) or []:
            pool_types.add(str(t))
        for anchor in layer.get("anchors", []) or []:
            if isinstance(anchor, str):
                anchor_types.add(anchor)
            elif isinstance(anchor, dict):
                anchor_types.add(str(anchor.get("type", "story")))
    return declared, pool_types, anchor_types


class RouteNodeTypeClosureTest(unittest.TestCase):
    """Enum closure for route ``pool`` and anchor ``type`` against ``node_types``.

    The procedural route builder resolves every layer node through the
    ``route_map.node_types`` registry, and an *unknown* type is silently dropped,
    not flagged:

    - an anchor whose ``type`` is not in ``node_types`` is skipped outright
      (``route_map.py`` ~line 121: ``if node_type not in node_types: continue``),
      so an authored anchor (with its beat/title/image/perspectives) never appears
      on the map;
    - a layer ``pool`` is filtered to declared types only
      (``route_map.py`` ~line 132: ``[t for t in pool if str(t) in node_types]``),
      so a misspelled pool type quietly narrows the spawnable set.

    Either way a typo (``markat``, ``patrl``) produces no error — the same
    silent-drop failure mode behind the dead ``relationship`` data. This invariant
    closes the set: every authored pool/anchor type must be declared in
    ``node_types``. The scan globs ``resources/*/scenario.json`` so new scenarios
    are covered automatically; scenarios without a dynamic route map are inert.
    """

    def _scenarios(self) -> list[tuple[str, dict[str, Any]]]:
        out: list[tuple[str, dict[str, Any]]] = []
        for path in _scenario_json_paths():
            with open(path, encoding="utf-8") as handle:
                out.append((path.parent.name, json.load(handle)))
        return out

    def test_pool_and_anchor_types_are_declared(self) -> None:
        offenders: list[str] = []
        for name, data in self._scenarios():
            declared, pool_types, anchor_types = _route_node_type_usage(data)
            for t in sorted(pool_types - declared):
                offenders.append(f"{name}:pool:{t!r}")
            for t in sorted(anchor_types - declared):
                offenders.append(f"{name}:anchor:{t!r}")
        self.assertEqual(
            offenders,
            [],
            "route layer pool / anchor types not declared in route_map.node_types "
            "(an unknown type is silently dropped — the pool narrows or the anchor "
            f"vanishes from the map): {offenders}",
        )

    def test_at_least_one_scenario_exercises_the_invariant(self) -> None:
        """Guard-the-guard: at least one scenario must declare a route node_types
        registry and reference it from a pool/anchor, or the closure check above is
        vacuously green (it would pass even if the registry were deleted)."""
        exercised = False
        for _name, data in self._scenarios():
            declared, pool_types, anchor_types = _route_node_type_usage(data)
            if declared and (pool_types or anchor_types):
                exercised = True
                break
        self.assertTrue(
            exercised,
            "no scenario declares route_map.node_types with referencing pool/anchor "
            "types — RouteNodeTypeClosureTest is vacuously green",
        )


def _perspective_when_flags(scenario_data: dict[str, Any]) -> set[str]:
    """Every flag listed in any route perspective ``when`` clause for a scenario.

    Scoped to ``route_map`` layer anchor perspectives — the only place ``when`` is
    authored and the only place ``route_runtime`` reads it (``select_perspective`` /
    ``_choose_next``).
    """
    when: set[str] = set()
    route_map = scenario_data.get("route_map") or {}
    for layer in route_map.get("layers", []) or []:
        if not isinstance(layer, dict):
            continue
        for anchor in layer.get("anchors", []) or []:
            if not isinstance(anchor, dict):
                continue
            for perspective in anchor.get("perspectives", []) or []:
                if isinstance(perspective, dict):
                    when.update(str(f) for f in perspective.get("when", []) or [])
    return when


class PerspectiveWhenFlagProducibilityTest(unittest.TestCase):
    """Every route perspective ``when`` flag must be producible (no dead branch).

    A perspective is chosen by ``route_runtime.select_perspective`` /
    ``_choose_next`` purely by counting how many of its ``when`` flags are present
    in the accumulated flag set (a plain set intersection — no negation or
    expression syntax, see ``route_runtime.py`` ~line 184/213). A ``when`` flag
    that **no producer can ever set** therefore contributes zero to every score
    forever: the perspective it guards can only ever be reached as the scoreless
    ``default_perspective`` fallback — its authored viewpoint is a dead branch,
    the same silent-no-error failure mode behind the long-dead ``relationship``
    data.

    Recognised producers mirror the flag-production model in this module's
    docstring (and ``ContentFlagIntegrityTest``): the scenario's own authored
    route ``effect.flags``, the engine onboarding flags, and the registered
    Director ``world_delta`` flags. This is the glob-generalised,
    perspective-``when``-isolated sibling of ``ContentFlagIntegrityTest`` — that
    test bundles ``when`` with gate/trigger/flags_any for neo-seoul only, whereas
    this one isolates ``when`` (so a failure names a dead *perspective branch*
    distinctly) and globs ``resources/*/scenario.json`` so new scenarios are
    covered automatically.
    """

    def _scenarios(self) -> list[tuple[str, dict[str, Any]]]:
        out: list[tuple[str, dict[str, Any]]] = []
        for path in _scenario_json_paths():
            with open(path, encoding="utf-8") as handle:
                out.append((path.parent.name, json.load(handle)))
        return out

    def test_perspective_when_flags_are_producible(self) -> None:
        offenders: list[str] = []
        for name, data in self._scenarios():
            when = _perspective_when_flags(data)
            if not when:
                continue
            _gate, _when, effect = _route_flag_sets(data.get("route_map") or {})
            producible = effect | ENGINE_PRODUCED_FLAGS | NARRATIVE_DRIVEN_FLAGS
            for flag in sorted(when - producible):
                offenders.append(f"{name}:{flag!r}")
        self.assertEqual(
            offenders,
            [],
            "route perspective 'when' flags with no recognised producer "
            "(authored effect.flags, engine onboarding, or registered Director "
            "world_delta flag) — the perspective can never out-score the default, "
            f"so its branch is dead: {offenders}",
        )

    def test_at_least_one_scenario_has_when_flags(self) -> None:
        """Guard-the-guard: if no scenario authors a perspective ``when`` flag the
        producibility check above is vacuously green."""
        total = sum(len(_perspective_when_flags(data)) for _name, data in self._scenarios())
        self.assertGreater(
            total, 0, "expected at least one authored perspective 'when' flag"
        )


class ArchetypeAndCharacterIdIntegrityTest(unittest.TestCase):
    """Stable-id integrity for archetypes and characters (post 2026-06-27 join-key
    migration).

    The EN/KO localization prerequisite moved every combat/progression join off
    Korean *display names* onto stable slug *ids* (``archetypes[].id`` /
    ``characters[].id``). Those ids are now the join keys, so a slip is a silent
    mechanical break, not an error:

    - a missing/empty or **duplicate** ``archetypes[].id`` makes the
      archetype→loadout / archetype→base-skill join ambiguous (one record shadows
      the other in any id-keyed lookup).
    - ``combat.archetype_loadout`` / ``combat.archetype_base_skills`` are keyed by
      archetype id; if either key set does not **exactly equal** the archetype id
      set, an archetype is silently left with no loadout / no base skills (a
      *missing* key) or a loadout / base-skill block is keyed on a non-existent
      archetype (an *orphan* key — dead data, e.g. a leftover Korean display-name
      key from before the migration).
    - a missing/empty or duplicate ``characters[].id`` breaks the same id-keyed
      joins for companion / relationship references.

    Both scenarios declare ``archetypes[]``; only neo-seoul declares
    ``characters[]`` (glass-library has none, so the character check is inert
    there). The scan globs ``resources/*/scenario.json`` so new scenarios are
    covered automatically.
    """

    ARCHETYPE_KEYED_BLOCKS = ("archetype_loadout", "archetype_base_skills")

    def _scenarios(self) -> list[tuple[str, dict[str, Any]]]:
        out: list[tuple[str, dict[str, Any]]] = []
        for path in _scenario_json_paths():
            with open(path, encoding="utf-8") as handle:
                out.append((path.parent.name, json.load(handle)))
        return out

    @staticmethod
    def _records(data: dict[str, Any], key: str) -> list[dict[str, Any]]:
        return [r for r in data.get(key, []) or [] if isinstance(r, dict)]

    def _assert_ids_unique_and_non_empty(self, key: str, label: str) -> None:
        offenders: list[str] = []
        scanned = 0
        for name, data in self._scenarios():
            records = self._records(data, key)
            if not records:
                continue
            scanned += 1
            ids = [str(r.get("id") or "") for r in records]
            for index, rid in enumerate(ids):
                if not rid:
                    offenders.append(f"{name}:{key}[{index}].id is empty/missing")
            for dup in sorted({i for i in ids if i and ids.count(i) > 1}):
                offenders.append(f"{name}:duplicate {label} id {dup!r}")
        self.assertEqual(
            offenders,
            [],
            f"{label} ids that are empty or duplicated — the id is the stable join "
            f"key, so a clash silently shadows one record in any id-keyed lookup: "
            f"{offenders}",
        )
        self.assertGreater(
            scanned, 0, f"no scenario declares {key}[] — {label} id check vacuously green"
        )

    def test_archetype_ids_unique_and_non_empty(self) -> None:
        self._assert_ids_unique_and_non_empty("archetypes", "archetype")

    def test_character_ids_unique_and_non_empty(self) -> None:
        self._assert_ids_unique_and_non_empty("characters", "character")

    def test_combat_archetype_dict_keys_equal_archetype_id_set(self) -> None:
        offenders: list[str] = []
        checked = 0
        for name, data in self._scenarios():
            archetypes = self._records(data, "archetypes")
            if not archetypes:
                continue
            id_set = {str(a.get("id")) for a in archetypes if a.get("id")}
            combat = data.get("combat")
            if not isinstance(combat, dict):
                offenders.append(f"{name}: declares archetypes[] but has no combat block")
                continue
            for block in self.ARCHETYPE_KEYED_BLOCKS:
                table = combat.get(block)
                if not isinstance(table, dict):
                    offenders.append(
                        f"{name}:combat.{block} is not an object "
                        f"({type(table).__name__}) — cannot key by archetype id"
                    )
                    continue
                keys = {str(k) for k in table}
                missing = sorted(id_set - keys)
                orphan = sorted(keys - id_set)
                if missing:
                    offenders.append(
                        f"{name}:combat.{block} missing keys for archetypes {missing}"
                    )
                if orphan:
                    offenders.append(
                        f"{name}:combat.{block} orphan keys {orphan} "
                        f"(no such archetypes[].id)"
                    )
                checked += 1
        self.assertEqual(
            offenders,
            [],
            "combat.archetype_loadout / archetype_base_skills key sets that do not "
            "exactly equal the archetypes[].id set — a missing key leaves an "
            "archetype with no loadout/base skills, an orphan key is dead data "
            f"(e.g. a pre-migration Korean-name key): {offenders}",
        )
        self.assertGreater(
            checked,
            0,
            "no scenario exercised the archetype-keyed-block check — vacuously green",
        )


if __name__ == "__main__":
    unittest.main()
