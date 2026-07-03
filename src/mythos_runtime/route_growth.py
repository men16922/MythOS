"""Grow the dynamic route map as the player advances.

`route_map.build_route_seed` lays down a backbone (layer skeleton + authored
anchors + dynamic nodes for the first `horizon` layers). This module thickens
the *upcoming* layers on demand: when the player advances, `extend_route` fills
any not-yet-filled layer within the lookahead horizon with dynamic nodes.

Node creation is **type-constrained but free-form**: the Narrative Director may
propose nodes as ``{"type": <one of node_types>, "title": <free text>}`` — the
type keeps mechanical wiring intact (combat → encounter, market → economy …)
while the title/flavour is the LLM's. Proposals are consumed first; the layer is
topped up from its authored ``pool`` (deterministically by seed) so the graph is
always connected even when the LLM proposes nothing.

After growth, an anchor-reachability guard runs: every authored anchor
(mandatory or branch-gated) must stay reachable from the current node, and every
non-final node must keep a forward edge — so a dynamic insert can never orphan a
key story beat.
"""

from __future__ import annotations

from typing import Any

from mythos_core.dice import Dice
from mythos_runtime.route_map import (
    ROUTE_MAP_KEY,
    _build_node,
    _reachable_from,
    _sample_pool,
)


def extend_route(
    state: dict[str, Any],
    *,
    seed: str,
    turn_index: int,
    proposals: list[dict[str, Any]] | None = None,
    horizon: int = 2,
) -> dict[str, Any]:
    """Fill unfilled layers within the lookahead horizon with dynamic nodes.

    No-op (returns input) for legacy/static maps or when there is nothing to
    grow. Returns a new state dict with the grown ``_route_map``.
    """
    route_map = state.get(ROUTE_MAP_KEY) if isinstance(state, dict) else None
    if not isinstance(route_map, dict) or route_map.get("mode") != "dynamic":
        return state
    layers = route_map.get("layers", [])
    growth = route_map.get("growth", {})
    node_types = route_map.get("node_types", {})
    if not layers or not isinstance(growth, dict) or not isinstance(node_types, dict):
        return state

    nodes = {nid: dict(n) for nid, n in route_map.get("nodes", {}).items()}
    edges = {nid: list(t) for nid, t in route_map.get("edges", {}).items()}
    current = route_map.get("current") or layers[0][0]
    current_layer = int(nodes.get(current, {}).get("layer", 0))
    counter = int(route_map.get("next_node_index", len(nodes)))
    horizon = int(route_map.get("horizon", horizon))

    queue = _valid_proposals(proposals, node_types)
    last_layer = len(layers) - 1
    changed = False

    used_titles = {str(n.get("title", "")) for n in nodes.values() if n.get("title")}

    for layer_index in range(current_layer + 1, min(current_layer + horizon, last_layer) + 1):
        spec = growth.get(str(layer_index))
        if not isinstance(spec, dict) or spec.get("filled"):
            continue
        counter, grew = _fill_layer(
            layer_index, layers, nodes, edges, spec, node_types, queue, counter, seed, used_titles
        )
        spec["filled"] = True
        changed = changed or grew

    if not changed:
        return state

    _guard_anchor_reachability(current, nodes, edges, layers)

    new_route_map = {
        **route_map,
        "nodes": nodes,
        "edges": edges,
        "layers": layers,
        "growth": growth,
        "next_node_index": counter,
    }
    new_state = dict(state)
    new_state[ROUTE_MAP_KEY] = new_route_map
    return new_state


def _valid_proposals(
    proposals: list[dict[str, Any]] | None, node_types: dict[str, Any]
) -> list[dict[str, str]]:
    """Keep only proposals whose ``type`` is a known node type."""
    valid: list[dict[str, str]] = []
    for item in proposals or []:
        if not isinstance(item, dict):
            continue
        node_type = str(item.get("type", "")).strip()
        if node_type not in node_types:
            continue
        title = str(item.get("title", "")).strip()
        valid.append({"type": node_type, "title": title})
    return valid


def _fill_layer(
    layer_index: int,
    layers: list[list[str]],
    nodes: dict[str, dict[str, Any]],
    edges: dict[str, list[str]],
    spec: dict[str, Any],
    node_types: dict[str, Any],
    queue: list[dict[str, str]],
    counter: int,
    seed: str,
    used_titles: set[str],
) -> tuple[int, bool]:
    """Add dynamic nodes to one layer and wire it to its neighbours."""
    arc = str(spec.get("arc", ""))
    title = str(spec.get("title", arc))
    pool = [str(t) for t in (spec.get("pool") or []) if str(t) in node_types]
    width = int(spec.get("width", 0))
    is_final = bool(spec.get("is_final"))
    dice = Dice(f"{seed}:grow:{layer_index}")

    existing = layers[layer_index] if layer_index < len(layers) else []
    existing_dynamic = sum(1 for nid in existing if nodes.get(nid, {}).get("origin") == "dynamic")
    need = max(0, width - existing_dynamic)
    if need <= 0 or not pool:
        return counter, False

    # Mirror the full builder's per-layer sampling: shuffle the pool before
    # cycling, so a layer does not repeat one node type while enough distinct
    # types are available. The previous per-node ``dice.choice(pool)`` sampled
    # with replacement, exhausting small title pools and producing duplicate
    # destinations only on the dynamic-growth path.
    fallback_types = _sample_pool(pool, need, node_types, is_final, dice)
    new_ids: list[str] = []
    for col in range(need):
        node_type, node_title = _next_node(
            queue,
            [fallback_types[col]],
            node_types,
            dice,
            is_final,
            used_titles,
        )
        node_id = f"rn{counter}"
        counter += 1
        node_spec = {"type": node_type, "anchor": False, "title": node_title}
        node = _build_node(
            node_id, node_spec, node_types, layer_index, arc, title, len(existing) + col
        )
        nodes[node_id] = node
        edges.setdefault(node_id, [])
        layers[layer_index].append(node_id)
        new_ids.append(node_id)

    # Wire incoming (prev layer -> new nodes) and outgoing (new nodes -> next layer).
    if layer_index > 0:
        _connect_incoming(layers[layer_index - 1], new_ids, nodes, edges, dice)
    if layer_index < len(layers) - 1:
        _connect_outgoing(new_ids, layers[layer_index + 1], nodes, edges, dice)
    return counter, True


def _next_node(
    queue: list[dict[str, str]],
    pool: list[str],
    node_types: dict[str, Any],
    dice: Dice,
    is_final: bool,
    used_titles: set[str],
) -> tuple[str, str]:
    """Pick the next dynamic node: an LLM proposal first, else the authored pool."""
    while queue:
        proposal = queue.pop(0)
        node_type = proposal["type"]
        # On non-final layers keep combat optional so an avoid route can persist;
        # but honour a proposed combat node if the pool itself allows combat.
        if node_type in pool or node_type in node_types:
            title = proposal["title"] or _pool_title(node_type, node_types, dice, used_titles)
            used_titles.add(title)
            return node_type, title
    node_type = dice.choice(pool)
    title = _pool_title(node_type, node_types, dice, used_titles)
    used_titles.add(title)
    return node_type, title


def _pool_title(node_type: str, node_types: dict[str, Any], dice: Dice, used_titles: set[str]) -> str:
    type_spec = node_types.get(node_type, {})
    titles = type_spec.get("titles") if isinstance(type_spec, dict) else None
    if isinstance(titles, list) and titles:
        candidates = [str(t) for t in titles if str(t) not in used_titles]
        if not candidates:
            candidates = [str(t) for t in titles]
        return str(dice.choice(candidates))
    return str(type_spec.get("label", node_type)) if isinstance(type_spec, dict) else node_type


def _connect_incoming(
    prev_layer: list[str],
    new_ids: list[str],
    nodes: dict[str, dict[str, Any]],
    edges: dict[str, list[str]],
    dice: Dice,
) -> None:
    """Ensure every new node has >=1 incoming edge from the previous layer."""
    if not prev_layer:
        return
    for nid in new_ids:
        if any(nid in edges.get(src, []) for src in prev_layer):
            continue
        src = dice.choice(prev_layer)
        edges.setdefault(src, []).append(nid)


def _connect_outgoing(
    new_ids: list[str],
    next_layer: list[str],
    nodes: dict[str, dict[str, Any]],
    edges: dict[str, list[str]],
    dice: Dice,
) -> None:
    """Ensure every new node has >=1 forward edge to the next layer."""
    if not next_layer:
        return
    for nid in new_ids:
        if edges.get(nid):
            continue
        # Prefer threading non-combat -> non-combat to preserve an avoid route.
        ordered = dice.shuffle(next_layer)
        if not nodes.get(nid, {}).get("combat"):
            non_combat = [n for n in ordered if not nodes.get(n, {}).get("combat")]
            if non_combat:
                ordered = non_combat + [n for n in ordered if n not in non_combat]
        fan = 1 if len(next_layer) <= 1 else dice.weighted_choice([1, 2], [0.6, 0.4])
        edges[nid] = ordered[: max(1, fan)]


def _guard_anchor_reachability(
    current: str,
    nodes: dict[str, dict[str, Any]],
    edges: dict[str, list[str]],
    layers: list[list[str]],
) -> None:
    """Repair the graph so anchors stay reachable and no node dead-ends early.

    - Every authored anchor (mandatory or branch-gated) must be reachable from
      the current node; if a dynamic insert orphaned one, add an edge from a
      reachable node in the prior layer.
    - Every non-final node keeps >=1 forward edge so the route never stalls.
    """
    layer_of = {nid: int(node.get("layer", 0)) for nid, node in nodes.items()}
    last_layer = len(layers) - 1

    # Forward connectivity: non-final nodes must reach the next layer.
    for layer_index in range(last_layer):
        nxt = layers[layer_index + 1]
        if not nxt:
            continue
        for nid in layers[layer_index]:
            if not edges.get(nid):
                edges[nid] = [nxt[0]]

    # Anchor reachability: ensure each anchor is reachable from current.
    for nid, node in nodes.items():
        if not node.get("anchor"):
            continue
        if _reachable_from(current, nid, edges):
            continue
        a_layer = layer_of.get(nid, 0)
        if a_layer == 0:
            continue
        prev_layer = layers[a_layer - 1] if a_layer - 1 < len(layers) else []
        sources = [s for s in prev_layer if _reachable_from(current, s, edges)]
        if not sources:
            sources = prev_layer
        if sources:
            src = sources[0]
            if nid not in edges.setdefault(src, []):
                edges[src].append(nid)


__all__ = ["extend_route"]
