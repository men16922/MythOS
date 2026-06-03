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

    if loop.phase is LoopPhase.CONNECT or (loop.phase is LoopPhase.EXPLORE and turn_index <= 2):
        archetype = player.traits.get("archetype", "Unclassified")
        if turn_index == 0:
            notes.append(
                f"ONBOARDING_ACT1_SHOT1: 당신은 오프닝의 첫 번째 플레이 가능한 장면을 작성하고 있습니다. "
                f"주제: '빗속에서 세린이 당신을 발견한다' (Shot 01 // Arrival). "
                f"세린은 C-17 구역의 비 내리는 어두운 네온 골목에서 비등록 '{archetype}' 신호인 플레이어를 발견합니다. "
                f"빗소리, 차가운 콘크리트, 머리 위를 훑는 감시 드론 등의 감각적 디테일을 서사하십시오. "
                f"세린이 당신을 발견하고 아직 지워지지 않았는지(살아있는지) 확인하는 순간에 집중하십시오. "
                f"이 장면의 모든 서사와 선택지는 반드시 한국어(Korean)로 작성되어야 합니다. 반응을 선택할 수 있는 동적인 선택지를 제공하십시오."
            )
        elif turn_index == 1:
            notes.append(
                "ONBOARDING_ACT1_SHOT2: 당신은 오프닝의 두 번째 플레이 가능한 장면을 작성하고 있습니다. "
                "주제: '정세린, 물거미' (Shot 02 // First Contact). "
                "세린이 플레이어의 손목을 낚아채며 일으켜 세웁니다. 대사: '등록 안 됐지? 야, 그럼 너 아직 사람이네. 뛰어.' "
                "촉각적 긴장감, 신체적 액팅, 그리고 플레이어를 보호하면서도 퉁명스러운 세린의 행동에 집중하십시오. "
                "이 장면의 모든 서사와 선택지는 반드시 한국어(Korean)로 작성되어야 합니다. 달리거나 세린에게 질문할 수 있는 활동적인 선택지를 제공하십시오."
            )
        elif turn_index == 2:
            notes.append(
                "ONBOARDING_ACT1_SHOT3: 당신은 오프닝의 세 번째 플레이 가능한 장면을 작성하고 있습니다. "
                "주제: '엔진이 켜지고, 도시는 적이 된다' (Shot 03 // Ignition). "
                "세린이 바이크 엔진을 켭니다. 수색등이 빗줄기를 뚫고 골목을 훑는 순간, 어두운 골목을 뚫고 바이크가 가속합니다. "
                "고속 질주 액션, 엔진의 굉음, 감시망 탈출, 그리고 바이크를 모는 세린의 거친 액팅에 집중하십시오. "
                "이 장면의 모든 서사와 선택지는 반드시 한국어(Korean)로 작성되어야 합니다. 꽉 잡거나 뒤를 돌아보는 등의 선택지를 제공하십시오."
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
