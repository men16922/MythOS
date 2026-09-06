"""Deterministic procedural route map (Slay-the-Spire style layered DAG).

Design intent: the *impactful story beats* (timeline anchors with curated
high-quality scene images/events) are **pre-authored** and always placed; the
*process between them* is generated procedurally — which dynamic nodes appear
and how they branch varies per loop, but **deterministically** from the loop
seed, so a rerun never invents or erases nodes (same philosophy as
`encounter_map` and the combat `Dice`). The prose/flavor of dynamic nodes is
left to the Narrative Director (next step), while anchors reference authored
resources.

Each layer corresponds to a `playability.golden_path` act and may declare:
- `anchors`: pre-authored beats (deterministic, always placed) — carry
  `beat`/`title`/`image`/`event` so the timeline and curated images stay fixed.
- `pool` + `width`: dynamic node types sampled at random (LLM-narrated filler).

The graph always starts on a single `story` anchor and ends on a single `boss`
anchor, and guarantees both a combat-avoiding and a combat-taking path exist.

The generated graph lives in `loop.state["_route_map"]` (JSON-serializable,
persisted with the loop like `_map`/`_encounter_map`). The UI reads it to draw a
node-graph operation map.
"""

from __future__ import annotations

from typing import Any

from mythos_core.dice import Dice

ROUTE_MAP_KEY = "_route_map"
ROUTE_MAP_VERSION = 1

DEFAULT_OPENING_VARIANT = "default"

# Anchor content fields an opening-variant override may replace. `summary` is
# handled separately (it rewrites the default perspective's summary line, not a
# node field). Graph identity (type/mandatory/gate/position) is never variant.
_ANCHOR_VARIANT_FIELDS = (
    "beat",
    "title",
    "image",
    "image_pre",
    "event",
    "image_sequence",
    "default_perspective",
)


# The canonical opening anchor is authored for the Se-rin opening and its
# perspective/entry effects hardcode her first-contact flags. `effect` is not a
# variant-overridable field, so a non-default variant (han/kai/solo/…) would
# inherit `trusted_se_rin` and spawn her in the opening combat even though the
# variant prose never introduces her. These are stripped from a variant anchor's
# effects (see `_strip_opening_contact_flags`); her real meet-arc side anchor is
# untouched (it carries no opening `variants` map, so the variant path skips it).
_OPENING_CONTACT_FLAGS = frozenset({"met_se_rin", "trusted_se_rin", "refused_se_rin"})


def _without_contact_flags(effect: Any) -> Any:
    """Return a copy of an ``effect`` dict with Se-rin contact flags removed."""
    if not isinstance(effect, dict) or not isinstance(effect.get("flags"), list):
        return effect
    return {
        **effect,
        "flags": [flag for flag in effect["flags"] if str(flag) not in _OPENING_CONTACT_FLAGS],
    }


def _strip_opening_contact_flags(node: dict[str, Any]) -> None:
    """Drop carried Se-rin contact flags from a variant anchor's node/perspective
    effects in place (new nested objects, so the shared scenario spec is intact)."""
    if isinstance(node.get("effect"), dict):
        node["effect"] = _without_contact_flags(node["effect"])
    perspectives = node.get("perspectives")
    if isinstance(perspectives, list):
        node["perspectives"] = [
            {**p, "effect": _without_contact_flags(p["effect"])}
            if isinstance(p, dict) and isinstance(p.get("effect"), dict)
            else p
            for p in perspectives
        ]


def _apply_anchor_variant(spec: dict[str, Any], opening_variant: str) -> dict[str, Any]:
    """Resolve an anchor spec's optional ``variants`` map for this loop's opening.

    One node, several skins: the anchor keeps its graph identity while the
    authored *content* fields are overridden by the matching variant entry. An
    explicit ``None`` override clears the base field (e.g. a variant with no
    ``image_pre`` still). A ``summary`` override replaces the **default
    perspective's** summary only — the base line is written for the canonical
    opening and must not render on a variant loop; the trust-axis perspective
    semantics stay shared. The ``variants`` map itself is always stripped so
    the persisted node never carries unused skins.
    """
    variants = spec.get("variants")
    resolved = {key: value for key, value in spec.items() if key != "variants"}
    if (
        not isinstance(variants, dict)
        or not opening_variant
        or opening_variant == DEFAULT_OPENING_VARIANT
    ):
        return resolved
    override = variants.get(opening_variant)
    if not isinstance(override, dict):
        return resolved
    for field in _ANCHOR_VARIANT_FIELDS:
        if field in override:
            if override[field] is None:
                resolved.pop(field, None)
            else:
                resolved[field] = override[field]
    summary = override.get("summary")
    if isinstance(summary, str) and summary and isinstance(resolved.get("perspectives"), list):
        default_id = resolved.get("default_perspective")
        resolved["perspectives"] = [
            {**perspective, "summary": summary}
            if isinstance(perspective, dict) and perspective.get("id") == default_id
            else perspective
            for perspective in resolved["perspectives"]
        ]
    resolved["variant"] = opening_variant
    # Deny the canonical Se-rin opening's first-contact flags to a variant loop —
    # her appearance must be earned via her meet-arc, not the inherited anchor
    # effect (which otherwise spawns her in the opening combat).
    _strip_opening_contact_flags(resolved)
    return resolved


def build_route_map(
    config: dict[str, Any] | None,
    seed: str,
    *,
    opening_variant: str = DEFAULT_OPENING_VARIANT,
) -> dict[str, Any] | None:
    """Build a deterministic layered DAG from a `route_map` scenario config.

    Returns ``None`` when no usable config is supplied so callers can fall back
    to the legacy emergent `_map`. ``opening_variant`` resolves each anchor's
    optional ``variants`` skin at materialization time, so every downstream
    consumer (engine, prompts, UI) reads the already-resolved node; the default
    variant (and configs without ``variants``) build byte-identically.
    """
    if not isinstance(config, dict):
        return None
    node_types = config.get("node_types")
    layers_cfg = config.get("layers")
    if not isinstance(node_types, dict) or not isinstance(layers_cfg, list) or not layers_cfg:
        return None

    dice = Dice(f"{seed}:route")
    nodes: dict[str, dict[str, Any]] = {}
    layers: list[list[str]] = []
    counter = 0
    used_titles: set[str] = set()

    for layer_index, layer in enumerate(layers_cfg):
        if not isinstance(layer, dict):
            continue
        arc = str(layer.get("arc", ""))
        title = str(layer.get("title", arc or f"layer {layer_index}"))
        is_final = layer_index == len(layers_cfg) - 1
        specs = _layer_node_specs(
            layer, node_types, layer_index, is_final, dice, opening_variant=opening_variant
        )
        layer_ids: list[str] = []
        for col, node_spec in enumerate(specs):
            node_id = f"rn{counter}"
            counter += 1
            if node_spec.get("title"):
                used_titles.add(str(node_spec["title"]))

            # Dynamic (non-anchor) nodes get an evocative type-based title from the
            # node type's `titles` pool so junction choices read distinctly instead
            # of repeating the act title. Anchors keep their authored title.
            if not node_spec.get("anchor") and not node_spec.get("title"):
                pool = node_types.get(node_spec.get("type"), {})
                titles = pool.get("titles") if isinstance(pool, dict) else None
                if isinstance(titles, list) and titles:
                    chosen_title = _pick_unique_title([str(t) for t in titles], used_titles, dice)
                    node_spec = {**node_spec, "title": chosen_title}
            nodes[node_id] = _build_node(
                node_id, node_spec, node_types, layer_index, arc, title, col
            )
            layer_ids.append(node_id)
        if layer_ids:
            layers.append(layer_ids)

    if not layers:
        return None

    edges = _build_edges(layers, nodes, dice)
    start = layers[0][0]
    return {
        "version": ROUTE_MAP_VERSION,
        "seed": seed,
        "current": start,
        "visited": [start],
        "nodes": nodes,
        "edges": edges,
        "layers": layers,
    }


def _layer_node_specs(
    layer: dict[str, Any],
    node_types: dict[str, Any],
    layer_index: int,
    is_final: bool,
    dice: Dice,
    include_dynamic: bool = True,
    *,
    opening_variant: str = DEFAULT_OPENING_VARIANT,
) -> list[dict[str, Any]]:
    """Return ordered node specs for a layer: anchors first, then dynamic nodes.

    A spec is a dict with at least ``type`` plus optional authored fields
    (``beat``/``title``/``image``/``event``) for anchors. ``include_dynamic`` is
    set False by the dynamic seed builder for layers beyond the initial horizon
    so future layers start as anchor-only stubs that ``extend_route`` grows.
    """
    specs: list[dict[str, Any]] = []

    for anchor in layer.get("anchors", []) or []:
        if isinstance(anchor, str):
            anchor = {"type": anchor}
        if not isinstance(anchor, dict):
            continue
        node_type = str(anchor.get("type", "story"))
        if node_type not in node_types:
            continue
        # Core anchors (first + last layer) are always mandatory passes; mid
        # anchors can be branch-gated via an authored `gate` flag list, or marked
        # mandatory explicitly in the scenario config.
        mandatory = bool(anchor.get("mandatory")) or layer_index == 0 or is_final
        spec = {**anchor, "type": node_type, "anchor": True, "mandatory": mandatory}
        specs.append(_apply_anchor_variant(spec, opening_variant))

    width = int(layer.get("width", 0))
    if include_dynamic and width > 0:
        pool = [str(t) for t in layer.get("pool", []) if str(t) in node_types]
        if not pool:
            pool = [
                t
                for t in node_types
                if not _is_combat(node_types[t]) and t not in {"story", "boss"}
            ]
        if pool:
            chosen = _sample_pool(pool, width, node_types, is_final, dice)
            specs.extend({"type": t, "anchor": False} for t in chosen)

    if not specs:
        # Degenerate layer config: fall back to a single story node so the graph
        # stays connected rather than dropping a layer silently.
        specs.append(
            {"type": "story" if "story" in node_types else next(iter(node_types)), "anchor": False}
        )
    return specs


def _sample_pool(
    pool: list[str], width: int, node_types: dict[str, Any], is_final: bool, dice: Dice
) -> list[str]:
    available = dice.shuffle(pool)
    chosen = [available[i % len(available)] for i in range(width)]
    # Guarantee a combat-avoiding path: non-final dynamic layers keep >=1
    # non-combat node so a fully non-combat route can thread through.
    if not is_final and all(_is_combat(node_types.get(t, {})) for t in chosen):
        non_combat = [t for t in pool if not _is_combat(node_types.get(t, {}))]
        if non_combat:
            chosen[0] = dice.choice(non_combat)
    return chosen


def _build_node(
    node_id: str,
    spec: dict[str, Any],
    node_types: dict[str, Any],
    layer_index: int,
    arc: str,
    title: str,
    col: int,
) -> dict[str, Any]:
    node_type = str(spec.get("type", "story"))
    type_spec = node_types.get(node_type) if isinstance(node_types.get(node_type), dict) else {}
    type_spec = type_spec or {}
    reward = spec.get("reward")
    if not isinstance(reward, dict):
        reward = type_spec.get("reward") if isinstance(type_spec.get("reward"), dict) else {}
    node = {
        "id": node_id,
        "type": node_type,
        "layer": layer_index,
        "arc": arc,
        "title": str(spec.get("title", title)),
        "label": str(type_spec.get("label", node_type)),
        "description": str(spec.get("description") or type_spec.get("description") or ""),
        "glyph": str(type_spec.get("glyph", "?")),
        "risk": int(spec.get("risk", type_spec.get("risk", 0))),
        "reward": dict(reward or {}),
        "combat": bool(type_spec.get("combat", False)),
        "anchor": bool(spec.get("anchor", False)),
        "origin": "anchor" if spec.get("anchor") else "dynamic",
        "mandatory": bool(spec.get("mandatory", False)),
        "col": col,
    }
    # Branch-gated anchors: reachable only along paths that satisfy these flags,
    # but `extend_route` guarantees at least one such path always exists.
    gate = spec.get("gate")
    if isinstance(gate, list) and gate:
        node["gate"] = [str(flag) for flag in gate]
    # Authored anchor resources (curated image / scripted event / beat id).
    # `image_pre` is shown until the beat's partner enters the scene (e.g. the
    # opening: protagonist-focus still before Se-rin reaches in), then `image`.
    # `variant` marks a node whose content was skinned by the loop's opening
    # variant (set during spec resolution, never authored directly).
    for field in ("beat", "image", "image_pre", "event", "default_perspective", "variant"):
        if spec.get(field):
            node[field] = str(spec[field])
    if isinstance(spec.get("effect"), dict):
        node["effect"] = dict(spec["effect"])
    # `image_sequence`: one curated still per beat (turn) of a multi-scene anchor,
    # e.g. the opening (awakening → arrival → first-contact → chase). The frontend
    # indexes it by the scene's turn_index; it takes priority over image/image_pre.
    if isinstance(spec.get("image_sequence"), list) and spec["image_sequence"]:
        node["image_sequence"] = [str(x) for x in spec["image_sequence"]]
    # Multi-perspective story beats: same impactful scene seen from several
    # viewpoints, chosen at runtime by accumulated flags (director step).
    if isinstance(spec.get("perspectives"), list):
        node["perspectives"] = [dict(p) for p in spec["perspectives"] if isinstance(p, dict)]
    return node


def _build_edges(
    layers: list[list[str]], nodes: dict[str, dict[str, Any]], dice: Dice
) -> dict[str, list[str]]:
    edges: dict[str, list[str]] = {node_id: [] for node_id in nodes}
    for i in range(len(layers) - 1):
        cur_layer = layers[i]
        nxt_layer = layers[i + 1]
        incoming: dict[str, int] = dict.fromkeys(nxt_layer, 0)
        for src in cur_layer:
            for tgt in _pick_targets(src, nxt_layer, nodes, dice):
                if tgt not in edges[src]:
                    edges[src].append(tgt)
                    incoming[tgt] += 1
        # Connectivity: every next-layer node must have >=1 incoming edge.
        for tgt, count in incoming.items():
            if count == 0:
                src = dice.choice(cur_layer)
                if tgt not in edges[src]:
                    edges[src].append(tgt)
    return edges


def _pick_targets(
    src: str, nxt_layer: list[str], nodes: dict[str, dict[str, Any]], dice: Dice
) -> list[str]:
    src_combat = bool(nodes.get(src, {}).get("combat"))
    ordered = dice.shuffle(nxt_layer)
    # A source must retain an ungated forward option whenever one exists.  The
    # runtime treats gates as hard locks; choosing a gated node as the sole edge
    # previously forced its progress fallback to walk through a visually locked
    # scene.  The shuffled order still supplies deterministic variety within each
    # priority bucket.
    ordered.sort(
        key=lambda node_id: (
            bool(nodes.get(node_id, {}).get("gate")),
            bool(nodes.get(node_id, {}).get("combat")) if not src_combat else False,
        )
    )
    fan = 1 if len(nxt_layer) <= 1 else dice.weighted_choice([1, 2], [0.6, 0.4])
    return ordered[: max(1, fan)]


def _is_combat(spec: Any) -> bool:
    return bool(spec.get("combat")) if isinstance(spec, dict) else False


def _reachable_from(
    start: str,
    target: str,
    edges: dict[str, list[str]],
    *,
    blocked: set[str] | None = None,
) -> bool:
    """Return True if ``target`` is reachable from ``start`` over ``edges``.

    ``blocked`` node ids are treated as impassable (not traversed). Shared by the
    path-summary sanity check and the dynamic anchor-reachability guard.
    """
    blocked = blocked or set()
    if start == target:
        return True
    stack = [start]
    seen: set[str] = set()
    while stack:
        cur = stack.pop()
        if cur == target:
            return True
        if cur in seen:
            continue
        seen.add(cur)
        for nxt in edges.get(cur, []):
            if nxt in blocked:
                continue
            stack.append(nxt)
    return False


def route_map_paths_summary(route_map: dict[str, Any]) -> dict[str, bool]:
    """Report whether a combat-avoiding and a combat-taking path both exist.

    Used by tests and as a sanity guard. The terminal boss node is excluded
    from the avoid check (the final confrontation is intentionally unavoidable).
    """
    nodes = route_map.get("nodes", {})
    edges = route_map.get("edges", {})
    layers = route_map.get("layers", [])
    if not layers:
        return {"avoid": False, "combat": False}
    start = route_map.get("current") or layers[0][0]
    boss = layers[-1][0]

    # Avoid path: boss reachable without traversing any non-boss combat node.
    combat_blocked = {
        nid for nid, node in nodes.items() if nid != boss and bool(node.get("combat"))
    }
    return {
        "avoid": _reachable_from(start, boss, edges, blocked=combat_blocked),
        "combat": _reachable_from(start, boss, edges),
    }


def build_route_seed(
    config: dict[str, Any] | None,
    seed: str,
    *,
    horizon: int = 2,
    opening_variant: str = DEFAULT_OPENING_VARIANT,
) -> dict[str, Any] | None:
    """Build a *dynamic* route map: a backbone seed grown later by ``extend_route``.

    Unlike :func:`build_route_map` (which pre-fills the entire DAG), the seed only
    materializes the layer skeleton, every layer's authored anchors, and dynamic
    pool nodes for the first ``horizon`` layers. Layers beyond the horizon start
    as anchor-only stubs; ``route_growth.extend_route`` thickens them with LLM- or
    pool-sourced dynamic nodes as the player approaches, so node count grows with
    play instead of being fixed up front.

    Returns ``None`` for unusable config (caller falls back to legacy paths). The
    returned map carries ``mode="dynamic"`` plus the ``node_types`` and per-layer
    ``growth`` spec needed for self-contained later growth.
    """
    if not isinstance(config, dict):
        return None
    node_types = config.get("node_types")
    layers_cfg = config.get("layers")
    if not isinstance(node_types, dict) or not isinstance(layers_cfg, list) or not layers_cfg:
        return None

    dice = Dice(f"{seed}:route")
    nodes: dict[str, dict[str, Any]] = {}
    layers: list[list[str]] = []
    growth: dict[str, dict[str, Any]] = {}
    counter = 0
    used_titles: set[str] = set()

    for layer_index, layer in enumerate(layers_cfg):
        if not isinstance(layer, dict):
            continue
        arc = str(layer.get("arc", ""))
        title = str(layer.get("title", arc or f"layer {layer_index}"))
        is_final = layer_index == len(layers_cfg) - 1
        include_dynamic = layer_index <= horizon
        specs = _layer_node_specs(
            layer,
            node_types,
            layer_index,
            is_final,
            dice,
            include_dynamic=include_dynamic,
            opening_variant=opening_variant,
        )
        layer_ids: list[str] = []
        for col, node_spec in enumerate(specs):
            node_id = f"rn{counter}"
            counter += 1
            if node_spec.get("title"):
                used_titles.add(str(node_spec["title"]))

            if not node_spec.get("anchor") and not node_spec.get("title"):
                pool = node_types.get(node_spec.get("type"), {})
                titles = pool.get("titles") if isinstance(pool, dict) else None
                if isinstance(titles, list) and titles:
                    chosen_title = _pick_unique_title([str(t) for t in titles], used_titles, dice)
                    node_spec = {**node_spec, "title": chosen_title}
            nodes[node_id] = _build_node(
                node_id, node_spec, node_types, layer_index, arc, title, col
            )
            layer_ids.append(node_id)
        if layer_ids:
            layers.append(layer_ids)
        # Remember how to grow this layer later (pool/width/flavour), self-contained.
        pool = [str(t) for t in (layer.get("pool") or []) if str(t) in node_types]
        growth[str(layer_index)] = {
            "arc": arc,
            "title": title,
            "pool": pool,
            "width": int(layer.get("width", 0)),
            "is_final": is_final,
            "filled": include_dynamic,
        }

    if not layers:
        return None

    edges = _build_edges(layers, nodes, dice)
    start = layers[0][0]
    return {
        "version": ROUTE_MAP_VERSION,
        "mode": "dynamic",
        "seed": seed,
        "horizon": int(horizon),
        "current": start,
        "visited": [start],
        "nodes": nodes,
        "edges": edges,
        "layers": layers,
        "node_types": node_types,
        "growth": growth,
        "next_node_index": counter,
    }


SIDE_ANCHOR_ORIGIN = "side"


def _build_side_node(
    node_id: str,
    arc_data: dict[str, Any],
    node_types: dict[str, Any],
    layer_index: int,
    arc: str,
    layer_title: str,
    col: int,
) -> dict[str, Any]:
    """Build one optional side-anchor node from an authored ``side_arc`` entry.

    The node is a normal (non-mandatory, non-``anchor``) branch node so the route
    growth/reachability guards leave it alone, but it carries ``side_arc``/
    ``optional`` markers and, if the arc declares a ``trigger_flag``, a runtime
    ``gate`` so it only surfaces as a junction option once that flag is earned.
    Authored resource fields (``beat``/``image``/``perspectives`` …) are carried
    through if a later data pass adds them (forward-compatible with the codex lane).
    """
    node_type = str(arc_data.get("type") or "event")
    if node_types and node_type not in node_types:
        node_type = "event" if "event" in node_types else next(iter(node_types))
    spec: dict[str, Any] = {
        "type": node_type,
        "anchor": False,
        "mandatory": False,
        "title": str(arc_data.get("title") or layer_title or node_type),
    }
    for field in ("beat", "image", "image_pre", "event", "default_perspective"):
        if arc_data.get(field):
            spec[field] = arc_data[field]
    if isinstance(arc_data.get("effect"), dict):
        spec["effect"] = dict(arc_data["effect"])
    if isinstance(arc_data.get("perspectives"), list):
        spec["perspectives"] = arc_data["perspectives"]
    if isinstance(arc_data.get("image_sequence"), list):
        spec["image_sequence"] = arc_data["image_sequence"]
    gate = arc_data.get("gate")
    if not gate and arc_data.get("trigger_flag"):
        gate = [str(arc_data["trigger_flag"])]
    if isinstance(gate, list) and gate:
        spec["gate"] = [str(flag) for flag in gate]
    node = _build_node(node_id, spec, node_types or {}, layer_index, arc, layer_title, col)
    node["origin"] = SIDE_ANCHOR_ORIGIN
    node["side_arc"] = True
    node["optional"] = True
    if arc_data.get("description"):
        node["description"] = str(arc_data["description"])
    if arc_data.get("min_layer") is not None:
        node["min_layer"] = int(arc_data["min_layer"])
    return node


_TUTORIAL_COMPANIONS = frozenset({"se_rin", "kai"})


def _meet_arc_companion(arc: dict[str, Any]) -> str | None:
    """The companion a side arc introduces, or None for non-meet arcs.

    A "meet arc" is identified by its authored effect granting a ``met_<id>``
    flag (the same flag the recruitment gate consumes), not by ``related_npcs``
    — arcs can reference an already-met companion without introducing anyone.
    """
    effect = arc.get("effect")
    flags = effect.get("flags") if isinstance(effect, dict) else None
    for flag in flags or []:
        if isinstance(flag, str) and flag.startswith("met_"):
            return flag[len("met_") :]
    return None


def attach_side_anchors(
    route_map: dict[str, Any] | None,
    side_arcs: list[dict[str, Any]] | None,
    seed: str,
    *,
    max_side_anchors: int = 2,
    unlocked_companions: set[str] | None = None,
    met_companions: set[str] | None = None,
    priority_companion: str | None = None,
) -> dict[str, Any] | None:
    """Weave a scenario's ``side_arcs`` into a built route map as optional branches.

    A deterministic, seed-selected subset of the authored side arcs is inserted
    into *intermediate* layers only (never the opening layer 0 or the boss layer):
    each becomes an extra node in its layer with an incoming edge from the previous
    layer and an outgoing edge into the next layer. Because every added edge stays
    within adjacent layers the graph remains strictly layered — the side node is
    reachable in the DAG yet **optional** (a sibling branch the player may skip; a
    ``trigger_flag`` gates it as a junction option). The boss's start-distance is
    unchanged, so the full-layer-traversal pacing guard still holds.

    No-op (returns ``route_map`` unchanged) when there is no map, no side arcs, or
    no intermediate layer to host one — so scenarios without side arcs are
    behavior-preserving. Mutates and returns the passed map for caller convenience.
    """
    if not isinstance(route_map, dict):
        return route_map
    arcs = [a for a in (side_arcs or []) if isinstance(a, dict)]
    # Achievement-gated recruitment: a companion's meet side-arc appears only once
    # that companion is unlocked (Se-rin + Kai are the always-available tutorial
    # party). ``unlocked_companions=None`` disables the gate (backward compatible).
    if unlocked_companions is not None:
        allowed = _TUTORIAL_COMPANIONS | set(unlocked_companions)
        arcs = [
            a for a in arcs if not [n for n in (a.get("related_npcs") or []) if n not in allowed]
        ]
    layers = route_map.get("layers")
    nodes = route_map.get("nodes")
    edges = route_map.get("edges")
    if (
        not arcs
        or not isinstance(layers, list)
        or not isinstance(nodes, dict)
        or not isinstance(edges, dict)
    ):
        return route_map
    node_types = route_map.get("node_types")
    if not isinstance(node_types, dict):
        node_types = {}
    # Intermediate layers only: never the opening (0) or the boss (last).
    host_layers = list(range(1, len(layers) - 1))
    if not host_layers:
        return route_map

    dice = Dice(f"{seed}:side")
    counter = int(route_map.get("next_node_index", len(nodes)))
    cap = max(1, int(max_side_anchors))
    # B1 guaranteed meet-arc slot (CBT feedback #2: 7 loops, only Kai ever met).
    # If an unlocked companion has never been met across runs, force ONE of their
    # meet arcs into the selection (seed-picked among the unmet candidates); only
    # the remaining slots stay fully random. ``met_companions=None`` disables the
    # guarantee (backward compatible).
    guaranteed: list[dict[str, Any]] = []
    # B2 pairing: a companion opening variant claims the slot for THAT
    # companion's arc (meet arc or any arc featuring them), so the opening
    # hook pays off on the same map.
    if priority_companion:
        featured = [
            a for a in arcs if priority_companion in [str(n) for n in (a.get("related_npcs") or [])]
        ]
        if featured:
            guaranteed = [dice.choice(featured)]
    if not guaranteed and met_companions is not None:
        unmet_meet_arcs = [
            a
            for a in arcs
            if (companion := _meet_arc_companion(a)) and companion not in met_companions
        ]
        if unmet_meet_arcs:
            guaranteed = [dice.choice(unmet_meet_arcs)]
    remaining = [a for a in arcs if not any(a is g for g in guaranteed)]
    chosen = (guaranteed + dice.shuffle(remaining))[:cap]

    for arc_data in chosen:
        min_layer = max(1, int(arc_data.get("min_layer", 1) or 1))
        eligible_host_layers = [layer for layer in host_layers if layer >= min_layer]
        if not eligible_host_layers:
            continue
        layer_index = dice.choice(eligible_host_layers)
        layer = layers[layer_index]
        # Side anchors are independent optional branches. Never route one side
        # anchor through another: a gated first arc would otherwise make the
        # second arc unreachable even when the second arc's own gate is earned.
        prev_layer = [nid for nid in layers[layer_index - 1] if not nodes[nid].get("side_arc")]
        next_layer = [nid for nid in layers[layer_index + 1] if not nodes[nid].get("side_arc")]
        if not layer or not prev_layer or not next_layer:
            continue
        sibling = nodes.get(layer[0], {}) if layer else {}
        arc_label = str(sibling.get("arc", ""))
        layer_title = str(sibling.get("title", ""))
        node_id = f"sn{counter}"
        counter += 1
        node = _build_side_node(
            node_id, arc_data, node_types, layer_index, arc_label, layer_title, len(layer)
        )
        nodes[node_id] = node
        layer.append(node_id)
        edges[node_id] = []
        # Incoming from the previous layer, outgoing into the next layer, so the
        # side node stays one strict layer step (never a boss shortcut).
        src = dice.choice(prev_layer)
        if node_id not in edges.setdefault(src, []):
            edges[src].append(node_id)
        tgt = dice.choice(next_layer)
        edges[node_id].append(tgt)

    route_map["next_node_index"] = counter
    return route_map


def _pick_unique_title(titles: list[str], used: set[str], dice: Dice) -> str:
    """Select a title that has not been used yet in the route map, with fallback to duplicates if exhausted."""
    candidates = [t for t in titles if t not in used]
    if not candidates:
        candidates = titles
    chosen = str(dice.choice(candidates))
    used.add(chosen)
    return chosen


__all__ = [
    "DEFAULT_OPENING_VARIANT",
    "ROUTE_MAP_KEY",
    "ROUTE_MAP_VERSION",
    "SIDE_ANCHOR_ORIGIN",
    "attach_side_anchors",
    "build_route_map",
    "build_route_seed",
    "route_map_paths_summary",
]
