from __future__ import annotations

from collections.abc import Sequence
from typing import Any

from mythos_core import (
    LoopPhase,
    LoopState,
    NarrativeShard,
    PlayerMemory,
    PlayerProfile,
    WorldEvent,
    WorldMemory,
)
from mythos_narrative import NarrativeContext
from mythos_runtime.scenario import ScenarioConfig
from mythos_runtime.story_bible import (
    load_story_bible,
    select_story_bible_entries,
    story_bible_notes,
)

LANGUAGE_RULE = (
    "LANGUAGE_RULE: Player-facing narration, objectives, choices, and action_result "
    "must be written in Korean by default. Keep only compact technical labels in English "
    "when they are diegetic UI terms."
)

CAUSALITY_ENGINE_RULE = (
    "CAUSALITY_ENGINE_RULE: The world is a complex gear-system. "
    "1. MAIN ARC: Follow the main story progression but don't rush. "
    "2. SIDE ARCS: Trigger side events if the player is in the right place or has right stats. "
    "3. NPC AGENDAS: NPCs move and act independently based on their goals. "
    "4. BUTTERFLY EFFECTS: Every player choice must be seeded for future consequences. "
    "5. MULTI-ENDINGS: Guide the story toward an ending based on "
    "Humanity/Dominance/Resilience/Insight."
)


def apply_archetype_traits(
    traits: dict[str, Any],
    scenario: ScenarioConfig,
) -> dict[str, Any]:
    """Return traits enriched from the scenario archetype table."""
    archetype_name = traits.get("archetype")
    if not archetype_name:
        return dict(traits)

    enriched = dict(traits)
    for archetype in scenario.archetypes:
        if archetype.get("name") != archetype_name:
            continue
        enriched["stats"] = archetype.get("stats", {})
        enriched["attributes"] = archetype.get("attributes", [])
        enriched.setdefault("autonomy_level", 1)
        enriched.setdefault("unlocked_traits", [])
        break
    return enriched


def build_runtime_narrative_context(
    *,
    player: PlayerProfile,
    loop: LoopState,
    scenario: ScenarioConfig,
    turn_index: int,
    recent_events: Sequence[WorldEvent],
    memories: Sequence[PlayerMemory],
    world_memories: Sequence[WorldMemory],
    narrative_shards: Sequence[NarrativeShard],
    novelty_notes: Sequence[str],
    player_action: str | None = None,
    fast_mode: bool = False,
) -> NarrativeContext:
    notes = [f"SCENARIO_BRIEF: {scenario.brief}", *novelty_notes, LANGUAGE_RULE]
    notes.extend(_scenario_structure_notes(scenario))
    notes.append(CAUSALITY_ENGINE_RULE)

    if loop.phase is LoopPhase.CONNECT and turn_index == 0:
        archetype = player.traits.get("archetype", "Unclassified")
        notes.append(
            f"ONBOARDING: Start with a diegetic booting sequence. "
            f"Recognize the player as a '{archetype}' signal. "
            f"Introduce Jung Se-rin (물거미) as she pulls the player into safety."
        )

    bible = load_story_bible(scenario.scenario_id)
    entries = select_story_bible_entries(bible, loop, turn_index=turn_index)
    notes.extend(story_bible_notes(entries))

    return NarrativeContext(
        player=player,
        loop=loop,
        turn_index=turn_index,
        recent_events=list(recent_events),
        memories=list(memories),
        world_memories=list(world_memories),
        narrative_shards=list(narrative_shards),
        novelty_notes=notes,
        player_action=player_action,
        system_prompt=scenario.system_prompt,
        fast_mode=fast_mode,
    )


def _scenario_structure_notes(scenario: ScenarioConfig) -> list[str]:
    notes: list[str] = []
    if scenario.main_arcs:
        notes.append(f"SCENARIO_MAIN_ARCS: {_compact_named_items(scenario.main_arcs)}")
    if scenario.side_arcs:
        notes.append(f"SCENARIO_SIDE_ARCS: {_compact_named_items(scenario.side_arcs)}")
    if scenario.npc_agendas:
        names = ", ".join(str(name) for name in scenario.npc_agendas.keys())
        notes.append(f"SCENARIO_NPC_AGENDAS: {names}")
    if scenario.endings:
        notes.append(f"SCENARIO_ENDINGS: {_compact_named_items(scenario.endings)}")
    return notes


def _compact_named_items(items: Sequence[dict[str, Any]], limit: int = 4) -> str:
    chunks: list[str] = []
    for item in items[:limit]:
        name = item.get("name") or item.get("id") or item.get("title") or item.get("arc")
        summary = item.get("summary") or item.get("description") or item.get("trigger")
        if summary:
            chunks.append(f"{name}: {summary}")
        elif name:
            chunks.append(str(name))
    return " | ".join(chunks)
