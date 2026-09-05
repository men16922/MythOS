#!/usr/bin/env python3
"""Prepare isolated persisted states for objective browser-QA calibration.

The fixture owns only the *starting* state.  The browser actor still exercises
the production resume/choose/combat paths and records what the rendered client
and API actually expose.  This keeps long-progression setup out of the actor
without replacing the behavior under test with a mock page.
"""

from __future__ import annotations

import argparse
import hashlib
import json
from copy import deepcopy
from dataclasses import replace
from pathlib import Path
from typing import Any

from mythos_memory import PostgresMythOSStore
from mythos_runtime.options import RuntimeOptions
from mythos_runtime.session import RuntimeSessionService

SCENARIO_ID = "neo-seoul"
COMPANION_ID = "han"
COMPANION_BEAT = "side_han_meet"
PARTY_MEMBERS = ("se_rin", "han", "su_ah")


def _node_for_beat(route_map: dict[str, Any], beat: str) -> tuple[str, dict[str, Any]]:
    for node_id, node in (route_map.get("nodes") or {}).items():
        if isinstance(node, dict) and node.get("beat") == beat:
            return str(node_id), node
    raise RuntimeError(f"route node not found for beat={beat!r}")


def _ordinary_node(route_map: dict[str, Any], *, max_layer: int) -> tuple[str, dict[str, Any]]:
    candidates: list[tuple[str, dict[str, Any]]] = []
    for node_id, node in (route_map.get("nodes") or {}).items():
        if not isinstance(node, dict):
            continue
        if int(node.get("layer", 0)) > max_layer:
            continue
        if node.get("anchor") or node.get("side_arc") or node.get("combat"):
            continue
        if node.get("type") in {"combat", "boss", "patrol"}:
            continue
        candidates.append((str(node_id), node))
    if not candidates:
        raise RuntimeError("no ordinary route node available for cutscene fixture")
    return max(candidates, key=lambda item: int(item[1].get("layer", 0)))


def prepare_companion_state(state: dict[str, Any]) -> tuple[dict[str, Any], dict[str, Any]]:
    """Place the route one real transition before Han's authored meet anchor."""
    next_state = deepcopy(state)
    route_map = deepcopy(next_state.get("_route_map"))
    if not isinstance(route_map, dict):
        raise RuntimeError("fixture loop has no route map")
    companion_node_id, companion_node = _node_for_beat(route_map, COMPANION_BEAT)
    incoming = [
        str(source)
        for source, targets in (route_map.get("edges") or {}).items()
        if companion_node_id in (targets or [])
    ]
    if not incoming:
        raise RuntimeError("companion meet anchor has no incoming edge")
    predecessor = min(
        incoming,
        key=lambda node_id: int((route_map.get("nodes") or {}).get(node_id, {}).get("layer", 0)),
    )
    route_map["current"] = predecessor
    route_map["visited"] = [predecessor]
    route_map["preferred_next"] = companion_node_id
    route_map["relationship_tally"] = {}
    next_state["_route_map"] = route_map

    flags = {str(flag) for flag in next_state.get("flags", []) or []}
    flags -= {"met_han", "ally_han"}
    next_state["flags"] = sorted(flags)
    relationships = dict(next_state.get("relationships") or {})
    relationships.pop(COMPANION_ID, None)
    next_state["relationships"] = relationships
    party = dict(next_state.get("_party") or {})
    party["members"] = [
        dict(member)
        for member in party.get("members", [])
        if isinstance(member, dict) and member.get("id") != COMPANION_ID
    ]
    party.pop("exclusive", None)
    next_state["_party"] = party
    next_state.pop("_active_cutscene", None)
    return next_state, {
        "companion_id": COMPANION_ID,
        "trigger_node_id": companion_node_id,
        "trigger_title": str(companion_node.get("title") or COMPANION_BEAT),
    }


def prepare_cutscene_state(state: dict[str, Any]) -> tuple[dict[str, Any], dict[str, Any]]:
    """Make Han's real first cutscene eligible on the next production choose."""
    next_state = deepcopy(state)
    route_map = deepcopy(next_state.get("_route_map"))
    if not isinstance(route_map, dict):
        raise RuntimeError("fixture loop has no route map")
    node_id, node = _ordinary_node(route_map, max_layer=1)
    route_map["current"] = node_id
    route_map["visited"] = [node_id]
    route_map["preferred_next"] = None
    route_map["relationship_tally"] = {}
    next_state["_route_map"] = route_map
    next_state["flags"] = sorted(
        {str(flag) for flag in next_state.get("flags", []) or []} | {"met_han", "ally_han"}
    )
    relationships = dict(next_state.get("relationships") or {})
    relationships[COMPANION_ID] = max(1, int(relationships.get(COMPANION_ID, 0)))
    next_state["relationships"] = relationships
    party = dict(next_state.get("_party") or {})
    members = [dict(member) for member in party.get("members", []) if isinstance(member, dict)]
    if COMPANION_ID not in {str(member.get("id")) for member in members}:
        members.append({"id": COMPANION_ID})
    party["members"] = members
    party.pop("exclusive", None)
    next_state["_party"] = party
    next_state["_seen_cutscenes"] = []
    next_state.pop("_active_cutscene", None)
    return next_state, {
        "companion_id": COMPANION_ID,
        "eligible_after_node_id": node_id,
        "eligible_after_title": str(node.get("title") or node_id),
        "expected_cutscene_id": "HAN_DEAD_CHANNEL",
    }


def _advance_to_turn(
    service: RuntimeSessionService,
    loop_id: str,
    options: RuntimeOptions,
    target_turn: int,
) -> None:
    for _ in range(target_turn):
        scene = service.store.get_latest_scene(loop_id)
        if scene is None or not scene.choices:
            raise RuntimeError("fixture loop has no selectable scene")
        service.choose(loop_id, choice_id=scene.choices[0].choice_id, options=options)


def prepare_fixture(objective: str, run_id: str) -> dict[str, Any]:
    digest = hashlib.sha256(run_id.encode("utf-8")).hexdigest()[:16]
    player_id = f"qa_{objective[:12]}_{digest}"
    options = RuntimeOptions(
        fallback=True, with_image=False, scenario_id=SCENARIO_ID, language="ko"
    )
    store = PostgresMythOSStore()
    try:
        service = RuntimeSessionService(store)
        service.create_player(
            f"QA {objective} {digest[:6]}",
            player_id=player_id,
            traits={"archetype": "echo_collector"},
            scenario_id=SCENARIO_ID,
        )
        store.save_progression(
            player_id,
            SCENARIO_ID,
            {
                "runs_completed": 1,
                "total_combats_won": 3,
                # Keep the guaranteed unmet-companion slot deterministic: Han is
                # the only achievement-unlocked recruit needed by these fixtures.
                "unlocked_allies": ["han"],
                "allies_met": [],
            },
        )
        snapshot = service.start_loop(player_id, options)
        loop_id = snapshot.loop.loop_id
        loop = store.get_loop(loop_id)
        if loop is None:
            raise RuntimeError("fixture loop was not persisted")
        state = dict(loop.state)
        initial_route_map = deepcopy(state.get("_route_map"))
        state.pop("_boon_offer", None)
        # Build prerequisite narrative turns without consuming/growing the route;
        # the initial authored graph is restored immediately before browser QA.
        state.pop("_route_map", None)
        store.save_loop(replace(loop, state=state))

        details: dict[str, Any]
        if objective == "party_distribution":
            snapshot = service.start_combat(
                loop_id,
                "patrol_ambush",
                options,
                party_members=[{"id": member_id} for member_id in PARTY_MEMBERS],
                test_kit=True,
            )
            details = {
                "expected_members": ["player", *PARTY_MEMBERS],
                "encounter_id": "patrol_ambush",
            }
        else:
            if not isinstance(initial_route_map, dict):
                raise RuntimeError("fixture loop has no initial route map")
            if objective == "companion_join":
                _, companion_node = _node_for_beat(initial_route_map, COMPANION_BEAT)
                target_turn = max(4, int(companion_node.get("layer", 1)) * 5 - 1)
            else:
                target_turn = 4
            _advance_to_turn(service, loop_id, options, target_turn)
            loop = store.get_loop(loop_id)
            if loop is None:
                raise RuntimeError("fixture loop disappeared while advancing")
            # Dynamic route growth may replace the not-yet-visited side-anchor
            # horizon while we create four prerequisite scenes.  Restore the
            # loop's own initial authored graph before positioning the fixture;
            # subsequent browser choices still run normal advance_route.
            fixture_base_state = dict(loop.state)
            fixture_base_state["_route_map"] = deepcopy(initial_route_map)
            if objective == "companion_join":
                state, details = prepare_companion_state(fixture_base_state)
            elif objective == "cutscene_cardinality_return":
                state, details = prepare_cutscene_state(fixture_base_state)
            else:
                raise ValueError(f"unsupported fixture objective: {objective}")
            store.save_loop(replace(loop, state=state))

        return {
            "kind": "persisted-production-state",
            "objective": objective,
            "player_id": player_id,
            "loop_id": loop_id,
            "scenario_id": SCENARIO_ID,
            "language": "ko",
            "local_storage": {
                "key": "mythos.session",
                "value": {
                    "playerId": player_id,
                    "loopId": loop_id,
                    "scenarioId": SCENARIO_ID,
                },
            },
            **details,
        }
    finally:
        store.close()
        PostgresMythOSStore.close_pool()


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--objective",
        required=True,
        choices=("companion_join", "party_distribution", "cutscene_cardinality_return"),
    )
    parser.add_argument("--run-id", required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    fixture = prepare_fixture(args.objective, args.run_id)
    args.output.write_text(json.dumps(fixture, ensure_ascii=False, indent=2) + "\n")
    print(json.dumps(fixture, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
