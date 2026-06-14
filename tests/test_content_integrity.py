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

from mythos_runtime.scenario import PROJECT_ROOT, load_scenario

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


if __name__ == "__main__":
    unittest.main()
