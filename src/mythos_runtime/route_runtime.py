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

# Deterministic play-style → axis-intent flags. Each selected perspective carries
# an ``axis`` (people/control/evidence/safety); the running tally of those axes
# crosses a threshold and DETERMINISTICALLY sets the intent flag that downstream
# perspective / story-bible / ending gates consume. Before this these flags were
# never produced (and never surfaced to the LLM), so almost every anchor fell
# back to its ``default_perspective`` no matter how the player played — the whole
# choice→consequence system was dormant. Emission is progressive within a route
# walk so an accumulated leaning shapes the perspective chosen at later anchors.
# ``destruction_will`` is intentionally left unset — its only consumer,
# ``p_demolish``, is already reachable via the engine-produced ``high_tension``.
_AXIS_INTENT_FLAG = {
    "people": "humanity_first",
    "control": "dominance_focus",
    "evidence": "insight_focus",
    "safety": "stability_focus",
}
_AXIS_INTENT_THRESHOLD = 2

# Play-style axis a non-anchor node expresses when the player *explicitly* picks
# it at a junction. Anchors express axes through their selected perspective, but
# typed waypoint nodes (clue/rest/patrol/combat) have no perspectives, so before
# this an evidence-leaning player who kept picking clue routes accrued nothing —
# the evidence intent flag was unreachable in normal play (its anchor
# perspectives gate on flags that only this accrual can bootstrap). Only
# explicit junction picks count (recorded in ``junction_picks``): auto-walk
# steps are dice/flag-biased, not player intent. market/event stay unmapped —
# they express no single value axis.
_NODE_TYPE_AXIS = {
    "clue": "evidence",
    "rest": "safety",
    "patrol": "safety",
    "combat": "control",
}


def node_axis(node: dict[str, Any]) -> str | None:
    """Value axis a route node expresses, or ``None`` when it has no clear one.

    An authored per-node ``axis`` wins over the type default so scenarios can
    override (e.g. a control-flavored clue node). Anchor nodes return ``None`` —
    their axis belongs to the perspective selected on entry.
    """
    if not isinstance(node, dict) or node.get("perspectives"):
        return None
    authored = node.get("axis")
    if isinstance(authored, str) and authored in _AXIS_INTENT_FLAG:
        return authored
    node_type = node.get("type")
    return _NODE_TYPE_AXIS.get(node_type) if isinstance(node_type, str) else None

# How many player turns are spent before the route advances one layer. Tunable;
# kept small so the boss/ending is reachable within a typical session.
# Story turns the route lingers on each layer. Raised 4→5 (2026-07-04 live
# feedback: a 6-layer loop read short) → 6 layers × 5 = ~30 narrative turns per
# loop before combat rounds/buildup, targeting the 30-60min session. Note the
# clock counts *narrative* commits only (session `_story_turn`), not combat rounds.
DEFAULT_TURNS_PER_LAYER = 5


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
    edges = {node_id: list(targets) for node_id, targets in route_map.get("edges", {}).items()}
    layers = route_map.get("layers", [])
    num_layers = len(layers)
    per = max(1, int(turns_per_layer))
    target_layer = min(num_layers - 1, max(0, int(turn_index)) // per)

    current = route_map.get("current") or layers[0][0]
    visited = list(route_map.get("visited") or [current])
    flags = list(state.get("flags", []) or [])
    preference = preferred_next or route_map.get("preferred_next")
    junction_picks = [str(pick) for pick in route_map.get("junction_picks") or []]

    # Walk the current pointer forward to the target layer, one edge at a time,
    # honoring an explicit junction pick first, otherwise biasing toward nodes
    # whose authored perspectives match accumulated flags.
    cur_layer = int(nodes.get(current, {}).get("layer", 0))
    while cur_layer < target_layer:
        source = current
        candidates = edges.get(current, [])
        if not candidates:
            break
        if (
            preference
            and preference in candidates
            and _gate_satisfied(nodes.get(preference, {}), flags)
        ):
            current = preference
            preference = None
            if current not in junction_picks:
                junction_picks.append(current)
        else:
            next_node_id = _choose_next(
                candidates, nodes, flags, Dice(f"{seed}:route-advance:{cur_layer}")
            )
            if next_node_id is None:
                # Compatibility recovery for an already-persisted graph whose
                # outgoing edges all point at locked nodes. Repair the edge to an
                # eligible core node in the next layer; never bypass the lock.
                next_layer = layers[cur_layer + 1] if cur_layer + 1 < len(layers) else []
                recovery = [
                    node_id for node_id in next_layer if not nodes.get(node_id, {}).get("side_arc")
                ]
                next_node_id = _choose_next(
                    recovery,
                    nodes,
                    flags,
                    Dice(f"{seed}:route-recover:{cur_layer}"),
                )
                if next_node_id is None:
                    break
                edges.setdefault(source, []).append(next_node_id)
            current = next_node_id
        if current not in visited:
            visited.append(current)
        cur_layer = int(nodes.get(current, {}).get("layer", cur_layer + 1))

    # Resolve node-entry effects and perspectives over the visited path in causal
    # order. A side anchor may set canonical encounter flags (for example
    # ``met_han``) on entry; later nodes and combat ally gates can consume them.
    active: dict[str, str] = {}
    tally: dict[str, int] = {}
    rel_tally: dict[str, int] = {}
    axis_tally: dict[str, int] = {}
    party_add: set[str] = set()
    flag_set = set(flags)
    junction_set = set(junction_picks)
    # Perspectives already resolved on an earlier turn are *pinned*: the node's
    # reward/effect was paid once on entry for that perspective (session
    # ``_apply_route_node_reward``), so re-scoring a passed anchor against flags
    # the player gained later would drift the ending/relationship/axis tallies
    # and the displayed lens away from what was actually rewarded. Only nodes
    # entered this call (not yet in the stored map) are scored fresh.
    raw_pinned = route_map.get("active_perspectives")
    pinned: dict[str, str] = (
        {str(k): str(v) for k, v in raw_pinned.items()} if isinstance(raw_pinned, dict) else {}
    )
    for node_id in visited:
        node = nodes.get(node_id, {})
        node_effect = node.get("effect", {})
        if isinstance(node_effect, dict):
            for flag in node_effect.get("flags", []) or []:
                flag_set.add(str(flag))
            relationship = node_effect.get("relationship")
            if isinstance(relationship, dict):
                for name, delta in relationship.items():
                    try:
                        rel_tally[str(name)] = rel_tally.get(str(name), 0) + int(delta)
                    except (TypeError, ValueError):
                        continue
            party_add.update(str(member) for member in node_effect.get("party_add", []) or [])
        perspectives = node.get("perspectives")
        if not perspectives:
            # An explicitly picked waypoint (clue/rest/patrol/combat) is a
            # play-style statement even without perspectives: accrue its axis in
            # causal order so the intent flag can shape *later* anchors.
            if node_id in junction_set:
                waypoint_axis = node_axis(node)
                if waypoint_axis is not None:
                    _accrue_axis(waypoint_axis, axis_tally, flag_set)
            continue
        chosen = _pinned_perspective(perspectives, pinned.get(node_id)) or select_perspective(
            node, flag_set
        )
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
            party_add.update(str(member) for member in effect.get("party_add", []) or [])
        for ending in chosen.get("ending_influence", []) or []:
            tally[str(ending)] = tally.get(str(ending), 0) + 1
        # Deterministic play-style accrual: tally this perspective's axis and, on
        # crossing the threshold, set its intent flag so later anchors in this
        # same walk (and downstream bible/ending gates) actually react to how the
        # player has been playing instead of always falling to the default lens.
        axis = chosen.get("axis")
        if isinstance(axis, str) and axis in _AXIS_INTENT_FLAG:
            _accrue_axis(axis, axis_tally, flag_set)

    leaderboard = sorted(tally.items(), key=lambda kv: (-kv[1], kv[0]))
    new_route_map = {
        **route_map,
        "edges": edges,
        "current": current,
        "visited": visited,
        "active_perspectives": active,
        "ending_tally": tally,
        "ending_leaderboard": [list(item) for item in leaderboard],
        "relationship_tally": rel_tally,
        "axis_tally": axis_tally,
        "junction_picks": junction_picks,
        "preferred_next": None,  # consumed
    }
    new_state = dict(state)
    new_state[ROUTE_MAP_KEY] = new_route_map
    new_state["flags"] = sorted(flag_set)
    new_state["relationships"] = _reconcile_relationships(
        state.get("relationships"), route_map.get("relationship_tally"), rel_tally
    )
    if party_add:
        party = dict(state.get("_party", {})) if isinstance(state.get("_party"), dict) else {}
        candidate_members = party.get("members")
        raw_members: list[Any] = candidate_members if isinstance(candidate_members, list) else []
        members = [dict(member) for member in raw_members if isinstance(member, dict)]
        known = {str(member.get("id")) for member in members if member.get("id")}
        members.extend({"id": member_id} for member_id in sorted(party_add - known))
        party["members"] = members
        new_state["_party"] = party
    return new_state


def _pinned_perspective(
    perspectives: list[dict[str, Any]], perspective_id: str | None
) -> dict[str, Any] | None:
    """Return the authored perspective matching a stored id, or ``None``.

    ``None`` (unknown id, or a perspective the scenario no longer authors) lets
    the caller fall back to a fresh ``select_perspective`` scoring.
    """
    if not perspective_id:
        return None
    for perspective in perspectives:
        if isinstance(perspective, dict) and str(perspective.get("id", "")) == perspective_id:
            return perspective
    return None


def _accrue_axis(axis: str, axis_tally: dict[str, int], flag_set: set[str]) -> None:
    """Tally one axis expression and emit its intent flag at the threshold."""
    axis_tally[axis] = axis_tally.get(axis, 0) + 1
    if axis_tally[axis] >= _AXIS_INTENT_THRESHOLD:
        flag_set.add(_AXIS_INTENT_FLAG[axis])


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

    return options if len(options) >= 2 else []


def select_perspective(node: dict[str, Any], flags: set[str] | list[str]) -> dict[str, Any] | None:
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
    best_tied = False
    for perspective in perspectives:
        when = perspective.get("when", []) or []
        score = len(set(when) & flag_set)
        if score > best_score:
            best_score = score
            best = perspective
            best_tied = False
        elif score == best_score:
            best_tied = True

    if default_id and (best_score <= 0 or best_tied):
        for perspective in perspectives:
            if perspective.get("id") == default_id:
                return perspective
    return best or perspectives[0]


def _choose_next(
    candidates: list[str],
    nodes: dict[str, Any],
    flags: list[str],
    dice: Dice,
) -> str | None:
    flag_set = set(flags)
    scored: list[tuple[int, str]] = []
    for node_id in candidates:
        node = nodes.get(node_id, {})
        if not _gate_satisfied(node, flag_set):
            continue
        score = 0
        for perspective in node.get("perspectives", []) or []:
            score = max(score, len(set(perspective.get("when", []) or []) & flag_set))
        scored.append((score, node_id))

    if not scored:
        return None

    best = max(score for score, _ in scored)
    top = sorted(node_id for score, node_id in scored if score == best)
    return top[0] if len(top) == 1 else dice.choice(top)


def _gate_satisfied(node: dict[str, Any], flags: set[str] | list[str]) -> bool:
    gate = node.get("gate")
    if not isinstance(gate, list) or not gate:
        return True
    flag_set = set(flags)
    return all(str(flag) in flag_set for flag in gate)


def node_encounter_id(
    node: dict[str, Any],
    combat_encounters: dict[str, Any] | None,
    *,
    seed: str,
    exclude: set[str] | list[str] | None = None,
) -> str | None:
    """Pick the encounter id for a combat-type node, deterministically by seed.

    Returns ``None`` for non-combat nodes or when no encounter pool is mapped.

    ``exclude`` lists encounters already used earlier in this loop; the pick
    prefers an *unseen* encounter so one loop's combat nodes surface the roster's
    variety (independent uniform picks otherwise repeat one encounter and can
    never roll the rarer set-piece fights). Once every option has been seen the
    full pool is used again.
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
    seen = {str(e) for e in exclude} if exclude else set()
    unseen = [e for e in pool if e not in seen]
    choices = unseen or pool
    return str(Dice(f"{seed}:encounter:{node.get('id')}").choice(choices))


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
    "node_axis",
    "node_encounter_id",
    "route_status",
    "select_perspective",
]
