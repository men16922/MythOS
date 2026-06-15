"""Make the procedural route map *live* during a loop.

This is the runtime brain that turns the static graph from `route_map.py` into a
playable thread: as turns progress the `current` node advances along edges, and
each anchor story beat resolves to one of its authored **perspectives** based on
the flags the player has accumulated. The selected perspective's `effect` flags
are merged into loop state, and its `ending_influence` is tallied into a live
leaderboard — so the player's route (the flags their choices set) deterministically
shapes which ending the loop is heading toward.

Step 2a scope: this layer owns *narrative flags*, the *ending tally*, and the
*relationship tally* (companion affection) only. It deliberately does NOT mutate
stability/tension/insight gauges — those stay owned by the loop engine and reward
systems so effects are not double-applied. Binding edges to the actual choice list
and triggering combat on combat nodes is a later step.

Idempotency note: ``advance_route`` replays the *entire* visited path on every
turn, so anything additive (relationship deltas) must be recomputed fresh from the
path rather than ``+=``-ed onto persisted state — otherwise each replay would
re-add the same deltas. The route's relationship contribution is therefore tallied
fresh every call (like the ending tally) and reconciled onto ``state["relationships"]``
by subtracting the previous route tally and adding the new one, which leaves any
non-route contribution (e.g. scene-choice deltas applied in ``session``) intact.
"""

from __future__ import annotations

from typing import Any

from mythos_core.dice import Dice
from mythos_runtime.route_map import ROUTE_MAP_KEY

# How many player turns are spent before the route advances one layer. Tunable;
# kept small so the boss/ending is reachable within a typical session.
DEFAULT_TURNS_PER_LAYER = 4


def advance_route(
    state: dict[str, Any],
    *,
    turn_index: int,
    seed: str,
    turns_per_layer: int = DEFAULT_TURNS_PER_LAYER,
    preferred_next: str | None = None,
) -> dict[str, Any]:
    """Advance the route map for the given turn and recompute derived state.

    Returns a new state dict. No-op (returns the input) when there is no route
    map, so scenarios on the legacy `_map` are unaffected. ``preferred_next`` is
    the node the player explicitly chose at a junction; it steers which branch is
    taken on the next layer step (the turn-based walk still guarantees forward
    progress so the route never stalls).
    """
    route_map = state.get(ROUTE_MAP_KEY) if isinstance(state, dict) else None
    if not isinstance(route_map, dict) or not route_map.get("layers"):
        return state

    nodes = route_map.get("nodes", {})
    edges = route_map.get("edges", {})
    layers = route_map.get("layers", [])
    num_layers = len(layers)
    per = max(1, int(turns_per_layer))
    target_layer = min(num_layers - 1, max(0, int(turn_index)) // per)

    current = route_map.get("current") or layers[0][0]
    visited = list(route_map.get("visited") or [current])
    flags = list(state.get("flags", []) or [])
    preference = preferred_next or route_map.get("preferred_next")

    # Walk the current pointer forward to the target layer, one edge at a time,
    # honoring an explicit junction pick first, otherwise biasing toward nodes
    # whose authored perspectives match accumulated flags.
    cur_layer = int(nodes.get(current, {}).get("layer", 0))
    while cur_layer < target_layer:
        candidates = edges.get(current, [])
        if not candidates:
            break
        if preference and preference in candidates:
            current = preference
            preference = None
        else:
            current = _choose_next(
                candidates, nodes, flags, Dice(f"{seed}:route-advance:{cur_layer}")
            )
        if current not in visited:
            visited.append(current)
        cur_layer = int(nodes.get(current, {}).get("layer", cur_layer + 1))

    # Resolve perspectives over the visited path in causal order: each node is
    # resolved against the flags accumulated so far, then its effect flags apply.
    active: dict[str, str] = {}
    tally: dict[str, int] = {}
    rel_tally: dict[str, int] = {}
    flag_set = set(flags)
    for node_id in visited:
        node = nodes.get(node_id, {})
        perspectives = node.get("perspectives")
        if not perspectives:
            continue
        chosen = select_perspective(node, flag_set)
        if chosen is None:
            continue
        active[node_id] = str(chosen.get("id", ""))
        effect = chosen.get("effect", {})
        if isinstance(effect, dict):
            for flag in effect.get("flags", []) or []:
                flag_set.add(str(flag))
            relationship = effect.get("relationship")
            if isinstance(relationship, dict):
                for name, delta in relationship.items():
                    try:
                        rel_tally[str(name)] = rel_tally.get(str(name), 0) + int(delta)
                    except (TypeError, ValueError):
                        continue
        for ending in chosen.get("ending_influence", []) or []:
            tally[str(ending)] = tally.get(str(ending), 0) + 1

    leaderboard = sorted(tally.items(), key=lambda kv: (-kv[1], kv[0]))
    new_route_map = {
        **route_map,
        "current": current,
        "visited": visited,
        "active_perspectives": active,
        "ending_tally": tally,
        "ending_leaderboard": [list(item) for item in leaderboard],
        "relationship_tally": rel_tally,
        "preferred_next": None,  # consumed
    }
    new_state = dict(state)
    new_state[ROUTE_MAP_KEY] = new_route_map
    new_state["flags"] = sorted(flag_set)
    new_state["relationships"] = _reconcile_relationships(
        state.get("relationships"), route_map.get("relationship_tally"), rel_tally
    )
    return new_state


def _reconcile_relationships(
    current: Any,
    previous_route_tally: Any,
    new_route_tally: dict[str, int],
) -> dict[str, int]:
    """Fold a freshly recomputed route relationship tally into the accumulator.

    ``advance_route`` replays the whole path each turn, so the route's contribution
    is recomputed from scratch. To stay replay-safe we subtract the route tally we
    stored last turn (``previous_route_tally``) and add the new one, leaving any
    non-route deltas (scene choices) on ``current`` untouched. Zero balances are
    pruned so the exposed dict stays tidy; a missing companion reads as 0.
    """
    out: dict[str, int] = {}
    if isinstance(current, dict):
        for name, value in current.items():
            try:
                out[str(name)] = int(value)
            except (TypeError, ValueError):
                continue
    if isinstance(previous_route_tally, dict):
        for name, value in previous_route_tally.items():
            try:
                out[str(name)] = out.get(str(name), 0) - int(value)
            except (TypeError, ValueError):
                continue
    for name, value in new_route_tally.items():
        out[name] = out.get(name, 0) + value
    return {name: value for name, value in out.items() if value != 0}


def fold_relationship(current: Any, delta: dict[str, int]) -> dict[str, int]:
    """Fold a non-route relationship delta into the accumulator, pruning zeros.

    Used by ``session`` to apply a scene choice's ``effect.relationship`` (companion
    affection). Because the result lands on ``state["relationships"]`` *before*
    ``advance_route`` runs, the route reconcile in ``_reconcile_relationships``
    preserves it (it only adjusts by the route tally delta), so route and choice
    contributions sum cleanly without double-counting on replay.
    """
    out: dict[str, int] = {}
    if isinstance(current, dict):
        for name, value in current.items():
            try:
                out[str(name)] = int(value)
            except (TypeError, ValueError):
                continue
    for name, value in delta.items():
        try:
            out[str(name)] = out.get(str(name), 0) + int(value)
        except (TypeError, ValueError):
            continue
    return {name: value for name, value in out.items() if value != 0}


def junction_options(
    state: dict[str, Any],
    *,
    turn_index: int,
    turns_per_layer: int = DEFAULT_TURNS_PER_LAYER,
) -> list[dict[str, Any]]:
    """Return the next-node branch options when this turn is a layer junction.

    A junction is the last turn of a layer (so the next turn crosses into the
    next layer) where the current node branches to >1 distinct next nodes. Empty
    list otherwise — in-layer turns keep the LLM's own choices.
    """
    route_map = state.get(ROUTE_MAP_KEY) if isinstance(state, dict) else None
    if not isinstance(route_map, dict) or not route_map.get("layers"):
        return []
    per = max(1, int(turns_per_layer))
    if (int(turn_index) + 1) % per != 0:
        return []
    nodes = route_map.get("nodes", {})
    edges = route_map.get("edges", {})
    layers = route_map.get("layers", [])
    current = route_map.get("current") or layers[0][0]
    if int(nodes.get(current, {}).get("layer", 0)) >= len(layers) - 1:
        return []
    seen: set[str] = set()
    options: list[dict[str, Any]] = []
    flags = set(state.get("flags", []) or [])
    for target in edges.get(current, []):
        if target in seen:
            continue
        seen.add(target)
        node = nodes.get(target)
        if isinstance(node, dict):
            gate = node.get("gate")
            if isinstance(gate, list) and gate:
                if not all(flag in flags for flag in gate):
                    continue
            options.append(node)

    # Fallback to avoid empty option softlocks if all options are gated out
    if not options and edges.get(current):
        for target in edges[current]:
            node = nodes.get(target)
            if isinstance(node, dict):
                options.append(node)

    return options if len(options) >= 2 else []


def select_perspective(
    node: dict[str, Any], flags: set[str] | list[str]
) -> dict[str, Any] | None:
    """Pick the perspective best matching accumulated flags.

    Score = number of a perspective's `when` flags present. Highest score wins;
    on a zero score (or tie not including the default) the `default_perspective`
    is used so an unrouted scene still has a stable viewpoint.
    """
    perspectives: list[dict[str, Any]] = node.get("perspectives") or []
    if not perspectives:
        return None
    flag_set = set(flags)
    default_id = node.get("default_perspective")

    best_score = -1
    best: dict[str, Any] | None = None
    for perspective in perspectives:
        when = perspective.get("when", []) or []
        score = len(set(when) & flag_set)
        if score > best_score:
            best_score = score
            best = perspective

    if best_score <= 0 and default_id:
        for perspective in perspectives:
            if perspective.get("id") == default_id:
                return perspective
    return best or perspectives[0]


def _choose_next(
    candidates: list[str],
    nodes: dict[str, Any],
    flags: list[str],
    dice: Dice,
) -> str:
    flag_set = set(flags)
    scored: list[tuple[int, str]] = []
    for node_id in candidates:
        node = nodes.get(node_id, {})
        gate = node.get("gate")
        if isinstance(gate, list) and gate:
            if not all(flag in flag_set for flag in gate):
                continue
        score = 0
        for perspective in node.get("perspectives", []) or []:
            score = max(score, len(set(perspective.get("when", []) or []) & flag_set))
        scored.append((score, node_id))

    if not scored:
        for node_id in candidates:
            scored.append((0, node_id))

    best = max(score for score, _ in scored)
    top = sorted(node_id for score, node_id in scored if score == best)
    return top[0] if len(top) == 1 else dice.choice(top)


def node_encounter_id(
    node: dict[str, Any],
    combat_encounters: dict[str, Any] | None,
    *,
    seed: str,
) -> str | None:
    """Pick the encounter id for a combat-type node, deterministically by seed.

    Returns ``None`` for non-combat nodes or when no encounter pool is mapped.
    """
    if not node or not node.get("combat"):
        return None
    if not isinstance(combat_encounters, dict):
        return None
    node_type = node.get("type")
    raw_pool = combat_encounters.get(node_type) if isinstance(node_type, str) else None
    pool: list[str] = [str(e) for e in raw_pool] if isinstance(raw_pool, list) else []
    if not pool:
        return None
    if len(pool) == 1:
        return pool[0]
    return str(Dice(f"{seed}:encounter:{node.get('id')}").choice(pool))


def route_status(state: dict[str, Any]) -> dict[str, Any] | None:
    """Summarize the current route node + active perspective + ending lead."""
    route_map = state.get(ROUTE_MAP_KEY) if isinstance(state, dict) else None
    if not isinstance(route_map, dict) or not route_map.get("layers"):
        return None
    nodes = route_map.get("nodes", {})
    current = route_map.get("current")
    node = nodes.get(current, {})
    active = route_map.get("active_perspectives", {}).get(current)
    perspective = None
    for candidate in node.get("perspectives", []) or []:
        if candidate.get("id") == active:
            perspective = candidate
            break
    leaderboard = route_map.get("ending_leaderboard", [])
    return {
        "node": node,
        "perspective": perspective,
        "ending_leaderboard": leaderboard,
    }


__all__ = [
    "DEFAULT_TURNS_PER_LAYER",
    "advance_route",
    "fold_relationship",
    "junction_options",
    "node_encounter_id",
    "route_status",
    "select_perspective",
]
