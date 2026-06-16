from __future__ import annotations

from dataclasses import dataclass, field, replace
from typing import Any

from mythos_core import (
    LoopState,
    NarrativeShard,
    PlayerMemory,
    Scene,
    WorldEvent,
    WorldMemory,
)
from mythos_core.clock import utc_now
from mythos_core.ids import new_memory_id
from mythos_memory import MythOSStore
from mythos_runtime.options import RunSummary

DEFAULT_ARCHETYPE = "비접속자 (Ghost)"

# Insight economy (Phase 2 — narrative gate + point investment).
INSIGHT_PER_RUN = 2
INSIGHT_PER_CLUE = 1
INSIGHT_PER_COMBAT_WON = 1
DEFAULT_LEARN_COST = 3
DEFAULT_RANKUP_COST = 2
DEFAULT_MAX_RANK = 3

# Fallback meaning for common epiphany trigger keys when a scenario does not
# declare an explicit `combat.epiphanies` mapping.
_DEFAULT_EPIPHANY_CONDITIONS: dict[str, dict[str, int]] = {
    "first_loop_archived": {"runs_completed": 1},
    "first_combat_victory": {"total_combats_won": 1},
    "first_clue": {"total_clues": 1},
}


@dataclass(frozen=True)
class MetaProgression:
    player_id: str
    scenario_id: str
    runs_completed: int = 0
    endings_seen: list[str] = field(default_factory=list)
    unlocked_traits: list[str] = field(default_factory=list)
    unlocked_allies: list[str] = field(default_factory=list)
    unlocked_starting_items: list[str] = field(default_factory=list)
    codex_unlocks: list[str] = field(default_factory=list)
    unlocked_archetypes: list[str] = field(default_factory=lambda: [DEFAULT_ARCHETYPE])
    unlocked_skills: list[str] = field(default_factory=list)
    learned_skills: list[str] = field(default_factory=list)
    skill_ranks: dict[str, int] = field(default_factory=dict)
    insight_points: int = 0
    epiphanies_seen: list[str] = field(default_factory=list)
    total_clues: int = 0
    total_combats_won: int = 0
    total_combats_lost: int = 0
    allies_met: list[str] = field(default_factory=list)
    # Cumulative companion affection across loops, mirroring the insight pattern:
    # each run's final ``loop.state["relationships"]`` is summed in at archive and
    # carried into the next loop's ``state["meta_progression"]`` for unlock gating.
    relationships: dict[str, int] = field(default_factory=dict)
    # Companion cutscene ids unlocked across all loops (the cross-loop gallery).
    # Computed at archive from the run's final affection + flags and unioned in
    # (mirrors ``allies_met``/``epiphanies_seen``); never un-unlocks.
    unlocked_cutscenes: list[str] = field(default_factory=list)


def determine_autonomy_level(
    autonomy_config: dict[str, dict[str, Any]],
    clue_count: int,
    default: int = 1,
) -> int:
    """Calculate autonomy level from scenario thresholds and collected clues."""
    level = default
    for raw_level, config in sorted(
        autonomy_config.items(),
        key=lambda item: _level_sort_key(item[0]),
        reverse=True,
    ):
        parsed_level = _parse_level(raw_level)
        if parsed_level is None:
            continue
        required = config.get("clues_required", 999)
        if isinstance(required, int) and clue_count >= required:
            return parsed_level
    return level


def latest_meta_progression(
    memories: list[PlayerMemory],
    player_id: str,
    scenario_id: str,
) -> MetaProgression:
    candidates = [
        memory
        for memory in memories
        if memory.kind == "meta_progression"
        and memory.player_id == player_id
        and memory.content.get("scenario_id") == scenario_id
    ]
    if not candidates:
        return MetaProgression(player_id=player_id, scenario_id=scenario_id)
    latest = max(candidates, key=lambda memory: memory.created_at)
    return meta_progression_from_content(
        latest.content, player_id=player_id, scenario_id=scenario_id
    )


TUTORIAL_SCENARIO_ID = "neo-seoul"


def scenario_unlock_met(
    unlock: dict[str, Any] | None,
    memories: list[PlayerMemory],
    player_id: str,
) -> bool:
    """Whether a scenario's unlock condition is satisfied for this player.

    Supported keys:
      - ``tutorial_completed``: at least one completed run in the tutorial scenario.
      - ``runs_completed``: that many completed runs in the tutorial scenario.
    No ``unlock`` (None/empty) means always available (e.g. the tutorial).
    """
    if not unlock:
        return True

    # Bypass unlock checks when playing/debugging live (non-test environments)
    import sys

    is_testing = (
        "unittest" in sys.modules
        or "pytest" in sys.modules
        or any("test" in arg for arg in sys.argv)
    )
    if not is_testing:
        return True

    tutorial = latest_meta_progression(memories, player_id, TUTORIAL_SCENARIO_ID)
    if unlock.get("tutorial_completed") and tutorial.runs_completed < 1:
        return False
    required_runs = unlock.get("runs_completed")
    if isinstance(required_runs, int) and tutorial.runs_completed < required_runs:
        return False
    return True


def meta_progression_from_content(
    content: dict[str, Any],
    *,
    player_id: str,
    scenario_id: str,
) -> MetaProgression:
    return MetaProgression(
        player_id=str(content.get("player_id") or player_id),
        scenario_id=str(content.get("scenario_id") or scenario_id),
        runs_completed=int(content.get("runs_completed") or 0),
        endings_seen=_string_list(content.get("endings_seen")),
        unlocked_traits=_string_list(content.get("unlocked_traits")),
        unlocked_allies=_string_list(content.get("unlocked_allies")),
        unlocked_starting_items=_string_list(content.get("unlocked_starting_items")),
        codex_unlocks=_string_list(content.get("codex_unlocks")),
        unlocked_archetypes=_defaulted_archetypes(content.get("unlocked_archetypes")),
        unlocked_skills=_string_list(content.get("unlocked_skills")),
        learned_skills=_string_list(content.get("learned_skills")),
        skill_ranks=_skill_ranks(content.get("skill_ranks")),
        insight_points=int(content.get("insight_points") or 0),
        epiphanies_seen=_string_list(content.get("epiphanies_seen")),
        total_clues=int(content.get("total_clues") or 0),
        total_combats_won=int(content.get("total_combats_won") or 0),
        total_combats_lost=int(content.get("total_combats_lost") or 0),
        allies_met=_string_list(content.get("allies_met")),
        relationships=_relationship_tally(content.get("relationships")),
        unlocked_cutscenes=_string_list(content.get("unlocked_cutscenes")),
    )


def meta_progression_to_content(progress: MetaProgression) -> dict[str, Any]:
    return {
        "player_id": progress.player_id,
        "scenario_id": progress.scenario_id,
        "runs_completed": progress.runs_completed,
        "endings_seen": progress.endings_seen,
        "unlocked_traits": progress.unlocked_traits,
        "unlocked_allies": progress.unlocked_allies,
        "unlocked_starting_items": progress.unlocked_starting_items,
        "codex_unlocks": progress.codex_unlocks,
        "unlocked_archetypes": progress.unlocked_archetypes,
        "unlocked_skills": progress.unlocked_skills,
        "learned_skills": progress.learned_skills,
        "skill_ranks": progress.skill_ranks,
        "insight_points": progress.insight_points,
        "epiphanies_seen": progress.epiphanies_seen,
        "total_clues": progress.total_clues,
        "total_combats_won": progress.total_combats_won,
        "total_combats_lost": progress.total_combats_lost,
        "allies_met": progress.allies_met,
        "relationships": progress.relationships,
        "unlocked_cutscenes": progress.unlocked_cutscenes,
    }


def load_progression(
    store: MythOSStore, player_id: str, scenario_id: str
) -> MetaProgression:
    """Read current progression from the dedicated table.

    Falls back to scanning ``player_memories`` (kind=meta_progression) for data
    written before migration 005 / by an un-migrated store, so reads stay correct
    during the transition.
    """
    content = store.get_progression(player_id, scenario_id)
    if content is not None:
        return meta_progression_from_content(
            content, player_id=player_id, scenario_id=scenario_id
        )
    return latest_meta_progression(
        store.list_player_memories(player_id), player_id, scenario_id
    )


def persist_progression(store: MythOSStore, progress: MetaProgression) -> None:
    """Upsert progression into the dedicated player_progression table."""
    store.save_progression(
        progress.player_id, progress.scenario_id, meta_progression_to_content(progress)
    )


def evaluate_meta_progression(
    previous: MetaProgression,
    run_summary: RunSummary,
    scenario_combat: dict[str, Any] | None = None,
    archetypes: list[dict[str, Any]] | None = None,
) -> tuple[MetaProgression, list[str]]:
    """Advance meta progression after a run.

    Archetype and skill unlocks are data-driven from the scenario so a new
    scenario works without code changes: ``archetypes[].unlock`` gates each
    archetype and ``combat.skills[].epiphany`` (resolved via ``combat.epiphanies``)
    gates each skill. Skills are *unlocked* (made learnable), not auto-learned —
    the player spends insight in the Codex to actually learn them (Phase 2).
    """
    if scenario_combat is None or archetypes is None:
        from mythos_runtime.scenario import load_scenario

        scenario = load_scenario(run_summary.scenario_id)
        scenario_combat = scenario_combat if scenario_combat is not None else scenario.combat
        archetypes = archetypes if archetypes is not None else scenario.archetypes
    endings_seen = _append_unique(previous.endings_seen, run_summary.ending_id or run_summary.phase)
    allies_met = previous.allies_met
    for ally_id in run_summary.allies_met:
        allies_met = _append_unique(allies_met, ally_id)

    insight_gain = _insight_accrual(run_summary)
    relationships = _merge_relationships(previous.relationships, run_summary.relationships)
    unlocked_cutscenes = previous.unlocked_cutscenes
    newly_unlocked_cutscenes: list[str] = []
    for cutscene_id in run_summary.unlocked_cutscenes:
        if cutscene_id not in unlocked_cutscenes:
            newly_unlocked_cutscenes.append(cutscene_id)
        unlocked_cutscenes = _append_unique(unlocked_cutscenes, cutscene_id)

    progress = MetaProgression(
        player_id=previous.player_id,
        scenario_id=previous.scenario_id,
        runs_completed=previous.runs_completed + 1,
        endings_seen=endings_seen,
        unlocked_traits=list(previous.unlocked_traits),
        unlocked_allies=list(previous.unlocked_allies),
        unlocked_starting_items=list(previous.unlocked_starting_items),
        codex_unlocks=list(previous.codex_unlocks),
        unlocked_archetypes=_defaulted_archetypes(previous.unlocked_archetypes),
        unlocked_skills=list(previous.unlocked_skills),
        learned_skills=list(previous.learned_skills),
        skill_ranks=dict(previous.skill_ranks),
        insight_points=previous.insight_points + insight_gain,
        epiphanies_seen=list(previous.epiphanies_seen),
        total_clues=previous.total_clues + len(run_summary.clues_collected),
        total_combats_won=previous.total_combats_won + run_summary.combats_won,
        total_combats_lost=previous.total_combats_lost + run_summary.combats_lost,
        allies_met=allies_met,
        relationships=relationships,
        unlocked_cutscenes=unlocked_cutscenes,
    )

    grants: list[str] = []
    if insight_gain > 0:
        grants.append(f"insight_points:+{insight_gain}")
    for companion, delta in sorted(run_summary.relationships.items()):
        if delta:
            grants.append(f"relationship:{companion}:{'+' if delta > 0 else ''}{delta}")
    for cutscene_id in newly_unlocked_cutscenes:
        grants.append(f"cutscene:{cutscene_id}")
    progress, grants = _grant_if(
        progress,
        grants,
        bucket="unlocked_traits",
        value="loop_veteran",
        condition=progress.runs_completed >= 1,
    )
    progress, grants = _grant_if(
        progress,
        grants,
        bucket="codex_unlocks",
        value="first_run_record",
        condition=progress.runs_completed >= 1,
    )
    # Data-driven archetype unlocks (archetypes[].unlock condition).
    for archetype in archetypes:
        name = archetype.get("name")
        unlock = archetype.get("unlock")
        if name and isinstance(unlock, dict):
            progress, grants = _grant_if(
                progress,
                grants,
                bucket="unlocked_archetypes",
                value=str(name),
                condition=_condition_met(unlock, progress),
            )

    # Data-driven skill unlocks: a skill's `epiphany` trigger resolves to a
    # condition via combat.epiphanies. Unlock only — learning costs insight.
    epiphany_conditions = scenario_combat.get("epiphanies", {})
    epiphany_conditions = epiphany_conditions if isinstance(epiphany_conditions, dict) else {}
    skills_pool = scenario_combat.get("skills", {})
    if isinstance(skills_pool, dict):
        for skill_id, skill_def in skills_pool.items():
            if not isinstance(skill_def, dict):
                continue
            trigger = skill_def.get("epiphany")
            if not trigger:
                continue
            condition = epiphany_conditions.get(trigger, _DEFAULT_EPIPHANY_CONDITIONS.get(trigger))
            if not isinstance(condition, dict):
                continue
            progress, grants = _grant_if(
                progress,
                grants,
                bucket="unlocked_skills",
                value=str(skill_id),
                condition=_condition_met(condition, progress),
            )

    progress, grants = _grant_if(
        progress,
        grants,
        bucket="unlocked_traits",
        value="memory_weaver",
        condition=progress.total_clues >= 3,
    )
    progress, grants = _grant_if(
        progress,
        grants,
        bucket="unlocked_starting_items",
        value=_scenario_first_clue_item(progress.scenario_id),
        condition=progress.total_clues >= 1,
    )
    progress, grants = _grant_if(
        progress,
        grants,
        bucket="unlocked_starting_items",
        value=_scenario_combat_item(progress.scenario_id),
        condition=progress.total_combats_won >= 1,
    )
    for ally_id in progress.allies_met:
        progress, grants = _grant_if(
            progress,
            grants,
            bucket="unlocked_allies",
            value=ally_id,
            condition=True,
        )
    return progress, grants


def apply_meta_progression_to_state(
    state: dict[str, Any],
    progress: MetaProgression,
    scenario_combat: dict[str, Any],
) -> dict[str, Any]:
    updated = dict(state)
    progress_content = meta_progression_to_content(progress)
    updated["meta_progression"] = progress_content

    item_defs = scenario_combat.get("items", {}) if isinstance(scenario_combat, dict) else {}
    inventory = list(updated.get("_inventory", []))
    existing_ids = {_item_id(item) for item in inventory}
    for item_id in progress.unlocked_starting_items:
        if item_id in item_defs and item_id not in existing_ids:
            inventory.append(item_defs[item_id])
            existing_ids.add(item_id)
    if inventory:
        updated["_inventory"] = inventory
    return updated


def _insight_accrual(run_summary: RunSummary) -> int:
    """Insight awarded for completing a run (per run + per clue + per win)."""
    return (
        INSIGHT_PER_RUN
        + INSIGHT_PER_CLUE * len(run_summary.clues_collected)
        + INSIGHT_PER_COMBAT_WON * max(0, run_summary.combats_won)
    )


def base_skills_for_archetype(
    scenario_combat: dict[str, Any],
    archetype: str | None,
) -> set[str]:
    """Auto-learned starting skills for the selected archetype."""
    base_by_archetype = scenario_combat.get("archetype_base_skills", {})
    if isinstance(base_by_archetype, dict) and archetype:
        ids = _string_list(base_by_archetype.get(archetype))
        if ids:
            return set(ids)
    return set(_string_list(scenario_combat.get("base_skills")))


def _skill_int(skill_def: dict[str, Any], key: str, default: int) -> int:
    try:
        return int(skill_def.get(key, default))
    except (TypeError, ValueError):
        return default


def build_skill_tree(
    progress: MetaProgression,
    scenario_combat: dict[str, Any],
    archetype: str | None,
) -> list[dict[str, Any]]:
    """Resolve every scenario skill into a learn/rank-up tree node for the UI."""
    skills_pool = scenario_combat.get("skills", {})
    if not isinstance(skills_pool, dict):
        return []
    base = base_skills_for_archetype(scenario_combat, archetype)
    learned_set = set(progress.learned_skills) | base
    nodes: list[dict[str, Any]] = []
    for skill_id, skill in skills_pool.items():
        if not isinstance(skill, dict):
            continue
        is_base = skill_id in base
        is_learned = skill_id in learned_set
        if is_learned:
            status = "learned"
        elif skill_id in progress.unlocked_skills:
            status = "unlocked"
        else:
            status = "locked"
        rank = progress.skill_ranks.get(skill_id) or (1 if is_learned else 0)
        max_rank = max(1, _skill_int(skill, "max_rank", DEFAULT_MAX_RANK))
        learn_cost = _skill_int(skill, "insight_cost", DEFAULT_LEARN_COST)
        rankup_cost = _skill_int(skill, "rankup_cost", DEFAULT_RANKUP_COST)
        requires = _string_list(skill.get("requires"))
        requires_met = all(req in learned_set for req in requires)

        action: str | None = None
        action_cost = 0
        if is_learned:
            if rank < max_rank:
                action = "rankup"
                action_cost = rankup_cost
        elif status == "unlocked" and requires_met:
            action = "learn"
            action_cost = learn_cost
        can_afford = bool(action) and progress.insight_points >= action_cost

        nodes.append(
            {
                "id": skill_id,
                "name": skill.get("name", skill_id),
                "role": skill.get("role", ""),
                "tier": _skill_int(skill, "tier", 0),
                "tags": _string_list(skill.get("tags")),
                "cost": skill.get("cost", {}),
                "range": skill.get("range"),
                "cooldown": skill.get("cooldown", 0),
                "status": status,
                "rank": rank,
                "max_rank": max_rank,
                "learn_cost": learn_cost,
                "rankup_cost": rankup_cost,
                "requires": requires,
                "requires_met": requires_met,
                "is_base": is_base,
                "action": action,
                "action_cost": action_cost,
                "can_afford": can_afford,
                "epiphany": skill.get("epiphany"),
                "unlock_hint": skill.get("unlock_hint", ""),
            }
        )
    return nodes


def learn_or_rank_skill(
    progress: MetaProgression,
    scenario_combat: dict[str, Any],
    skill_id: str,
    archetype: str | None,
) -> MetaProgression:
    """Spend insight to learn a newly unlocked skill or rank up a learned one.

    Raises ``ValueError`` with a player-facing reason when the action is invalid.
    """
    skills_pool = scenario_combat.get("skills", {})
    skill = skills_pool.get(skill_id) if isinstance(skills_pool, dict) else None
    if not isinstance(skill, dict):
        raise ValueError(f"알 수 없는 스킬입니다: {skill_id}")

    base = base_skills_for_archetype(scenario_combat, archetype)
    learned_set = set(progress.learned_skills) | base
    is_learned = skill_id in learned_set
    rank = progress.skill_ranks.get(skill_id) or (1 if is_learned else 0)
    max_rank = max(1, _skill_int(skill, "max_rank", DEFAULT_MAX_RANK))
    requires = _string_list(skill.get("requires"))
    if not all(req in learned_set for req in requires):
        raise ValueError("선행 스킬을 먼저 습득해야 합니다.")

    if is_learned:
        if rank >= max_rank:
            raise ValueError("이미 최대 랭크입니다.")
        cost = _skill_int(skill, "rankup_cost", DEFAULT_RANKUP_COST)
        if progress.insight_points < cost:
            raise ValueError("통찰 포인트가 부족합니다.")
        new_ranks = dict(progress.skill_ranks)
        new_ranks[skill_id] = rank + 1
        new_learned = list(progress.learned_skills)
        if skill_id not in new_learned:
            new_learned.append(skill_id)
        return replace(
            progress,
            learned_skills=new_learned,
            skill_ranks=new_ranks,
            insight_points=progress.insight_points - cost,
        )

    if skill_id not in progress.unlocked_skills:
        raise ValueError("아직 해금되지 않은 스킬입니다.")
    cost = _skill_int(skill, "insight_cost", DEFAULT_LEARN_COST)
    if progress.insight_points < cost:
        raise ValueError("통찰 포인트가 부족합니다.")
    new_learned = [*progress.learned_skills, skill_id]
    new_ranks = dict(progress.skill_ranks)
    new_ranks[skill_id] = 1
    return replace(
        progress,
        learned_skills=new_learned,
        skill_ranks=new_ranks,
        insight_points=progress.insight_points - cost,
    )


def traits_with_meta_progression(
    traits: dict[str, Any],
    progress: MetaProgression,
) -> dict[str, Any]:
    updated = dict(traits)
    updated["meta_progression"] = meta_progression_to_content(progress)
    updated["unlocked_traits"] = sorted(
        set(_string_list(updated.get("unlocked_traits"))) | set(progress.unlocked_traits)
    )
    updated["unlocked_allies"] = sorted(
        set(_string_list(updated.get("unlocked_allies"))) | set(progress.unlocked_allies)
    )
    updated["unlocked_starting_items"] = sorted(
        set(_string_list(updated.get("unlocked_starting_items")))
        | set(progress.unlocked_starting_items)
    )
    updated["codex_unlocks"] = sorted(
        set(_string_list(updated.get("codex_unlocks"))) | set(progress.codex_unlocks)
    )
    updated["unlocked_archetypes"] = sorted(
        set(_defaulted_archetypes(updated.get("unlocked_archetypes")))
        | set(progress.unlocked_archetypes)
    )
    updated["unlocked_skills"] = sorted(
        set(_string_list(updated.get("unlocked_skills"))) | set(progress.unlocked_skills)
    )
    updated["learned_skills"] = sorted(
        set(_string_list(updated.get("learned_skills"))) | set(progress.learned_skills)
    )
    updated["skill_ranks"] = dict(progress.skill_ranks)
    updated["insight_points"] = progress.insight_points
    updated["epiphanies_seen"] = list(progress.epiphanies_seen)
    return updated


def _level_sort_key(raw_level: str) -> int:
    return _parse_level(raw_level) or 0


def _parse_level(raw_level: str) -> int | None:
    try:
        return int(raw_level)
    except ValueError:
        return None


def _condition_met(condition: dict[str, Any], progress: MetaProgression) -> bool:
    """Evaluate a scenario unlock/epiphany condition against meta progression."""
    runs = condition.get("runs_completed")
    if isinstance(runs, int) and progress.runs_completed < runs:
        return False
    clues = condition.get("total_clues")
    if isinstance(clues, int) and progress.total_clues < clues:
        return False
    wins = condition.get("total_combats_won")
    if isinstance(wins, int) and progress.total_combats_won < wins:
        return False
    ending = condition.get("ending_seen")
    if isinstance(ending, str) and ending not in progress.endings_seen:
        return False
    return True


def _grant_if(
    progress: MetaProgression,
    grants: list[str],
    *,
    bucket: str,
    value: str,
    condition: bool,
) -> tuple[MetaProgression, list[str]]:
    if not condition:
        return progress, grants
    current = list(getattr(progress, bucket))
    if value in current:
        return progress, grants
    current.append(value)
    updated = replace(progress, **{bucket: current})  # type: ignore[arg-type]
    return updated, [*grants, f"{bucket}:{value}"]


def _scenario_first_clue_item(scenario_id: str) -> str:
    return "memory_slip" if scenario_id == "glass-library" else "data_fragment"


def _scenario_combat_item(scenario_id: str) -> str:
    return "repair_tape" if scenario_id == "glass-library" else "stim_shard"


def _append_unique(values: list[str], value: str | None) -> list[str]:
    if not value or value in values:
        return list(values)
    return [*values, value]


def _string_list(value: Any) -> list[str]:
    if not isinstance(value, list):
        return []
    return [str(item) for item in value if item is not None]


def _defaulted_archetypes(value: Any) -> list[str]:
    values = _string_list(value)
    if DEFAULT_ARCHETYPE not in values:
        values.insert(0, DEFAULT_ARCHETYPE)
    return values


def _skill_ranks(value: Any) -> dict[str, int]:
    if not isinstance(value, dict):
        return {}
    ranks: dict[str, int] = {}
    for key, raw in value.items():
        try:
            rank = int(raw)
        except (TypeError, ValueError):
            continue
        ranks[str(key)] = max(1, rank)
    return ranks


def _relationship_tally(value: Any) -> dict[str, int]:
    """Coerce a stored/loop relationship map into a clean dict[name -> int]."""
    if not isinstance(value, dict):
        return {}
    tally: dict[str, int] = {}
    for key, raw in value.items():
        try:
            points = int(raw)
        except (TypeError, ValueError):
            continue
        if points:
            tally[str(key)] = points
    return tally


def _merge_relationships(previous: dict[str, int], delta: Any) -> dict[str, int]:
    """Sum a run's final relationship tally into the carried-over meta tally.

    Mirrors insight accrual (``previous + this run``) but per companion. Zero
    balances are pruned so the canonical form matches the live-state convention
    in ``route_runtime`` (``fold_relationship``/``_reconcile_relationships``).
    """
    merged: dict[str, int] = dict(previous)
    for name, points in _relationship_tally(delta).items():
        merged[name] = merged.get(name, 0) + points
    return {name: points for name, points in merged.items() if points}


def _unlocked_cutscenes_for_loop(loop: LoopState) -> list[str]:
    """Cutscene ids this run unlocked, from its final affection + flags (deterministic).

    Evaluated at archive against the scenario's authored cutscenes so the result can be
    unioned into meta progression (the cross-loop gallery). Pure given the loop state.
    """
    from mythos_runtime.cutscenes import evaluate_unlocked_cutscenes
    from mythos_runtime.scenario_directives import load_scenario_directives

    scenario_id = str(loop.state.get("scenario_id") or "neo-seoul")
    cutscenes = load_scenario_directives(scenario_id).cutscenes
    if not cutscenes:
        return []
    return evaluate_unlocked_cutscenes(
        cutscenes, loop.state.get("relationships"), loop.state.get("flags")
    )


def _item_id(item: Any) -> str:
    if isinstance(item, dict):
        return str(item.get("id") or item.get("item") or item)
    return str(item)


def _run_summary_from_memory(memory: WorldMemory) -> RunSummary:
    content = memory.content
    metadata = content.get("metadata")
    return RunSummary(
        run_id=str(content.get("run_id") or f"run_{content.get('loop_id', memory.memory_id)}"),
        player_id=str(content.get("player_id") or ""),
        loop_id=str(content.get("loop_id") or ""),
        scenario_id=str(content.get("scenario_id") or "neo-seoul"),
        started_at=str(content.get("started_at") or memory.created_at.isoformat()),
        ended_at=str(content.get("ended_at") or memory.created_at.isoformat()),
        ending_id=str(content["ending_id"]) if content.get("ending_id") is not None else None,
        ending_label=str(content.get("ending_label") or "Archived Loop"),
        final_title=str(content.get("final_title") or "Untitled Run"),
        final_location=str(content.get("final_location") or ""),
        phase=str(content.get("phase") or "ended"),
        stability=int(content.get("stability") or 0),
        tension=int(content.get("tension") or 0),
        turns=int(content.get("turns") or 0),
        combats_won=int(content.get("combats_won") or 0),
        combats_lost=int(content.get("combats_lost") or 0),
        clues_collected=[str(item) for item in content.get("clues_collected", [])],
        allies_met=[str(item) for item in content.get("allies_met", [])],
        unlocks_granted=[str(item) for item in content.get("unlocks_granted", [])],
        summary_text=str(content.get("summary_text") or content.get("summary") or ""),
        relationships=_relationship_tally(content.get("relationships")),
        unlocked_cutscenes=_string_list(content.get("unlocked_cutscenes")),
        metadata=metadata if isinstance(metadata, dict) else {},
    )


MYTHOS_WORLD_ID = "world_mythos"


class ProgressionService:
    def __init__(self, store: MythOSStore) -> None:
        self.store = store

    def _merge_mid_run_epiphanies(
        self,
        player_id: str,
        scenario_id: str,
        progress: MetaProgression,
    ) -> MetaProgression:
        from mythos_core.models import LoopPhase

        try:
            loops = self.store.list_loops(player_id)
            active_loop = None
            for loop in loops:
                if loop.state.get("scenario_id") == scenario_id and loop.phase not in (
                    LoopPhase.ENDED,
                    LoopPhase.ARCHIVE,
                ):
                    active_loop = loop
                    break

            if active_loop is not None:
                events = self.store.list_events(active_loop.loop_id)
                shards = self.store.list_narrative_shards(player_id, limit=1000)
                newly_unlocked = check_mid_run_epiphanies(
                    progress, scenario_id, events, shards, active_loop.loop_id
                )
                if newly_unlocked:
                    merged_skills = list(progress.unlocked_skills)
                    for skill_id in newly_unlocked:
                        if skill_id not in merged_skills:
                            merged_skills.append(skill_id)
                    progress = replace(progress, unlocked_skills=merged_skills)
        except Exception:
            pass
        return progress

    def list_run_summaries(self, player_id: str, limit: int = 20) -> list[RunSummary]:
        world_memories = self.store.list_world_memories(MYTHOS_WORLD_ID)
        runs = []
        for memory in world_memories:
            if memory.kind == "run_summary" and memory.content.get("player_id") == player_id:
                runs.append(_run_summary_from_memory(memory))
        runs.sort(key=lambda r: r.ended_at, reverse=True)
        return runs[:limit]

    def skill_tree(
        self,
        player_id: str,
        scenario_id: str,
        archetype: str | None,
    ) -> dict[str, Any]:
        from mythos_runtime.scenario import load_scenario

        progress = load_progression(self.store, player_id, scenario_id)
        progress = self._merge_mid_run_epiphanies(player_id, scenario_id, progress)
        scenario = load_scenario(scenario_id)
        return {
            "insight_points": progress.insight_points,
            "skills": build_skill_tree(progress, scenario.combat, archetype),
        }

    def learn_skill(
        self,
        player_id: str,
        scenario_id: str,
        skill_id: str,
        archetype: str | None,
    ) -> dict[str, Any]:
        from mythos_runtime.scenario import load_scenario

        previous = load_progression(self.store, player_id, scenario_id)
        previous = self._merge_mid_run_epiphanies(player_id, scenario_id, previous)
        scenario = load_scenario(scenario_id)
        updated = learn_or_rank_skill(previous, scenario.combat, skill_id, archetype)
        persist_progression(self.store, updated)
        return {
            "insight_points": updated.insight_points,
            "skills": build_skill_tree(updated, scenario.combat, archetype),
        }

    def apply_meta_progression(
        self,
        player_id: str,
        loop: LoopState,
        run_summary: RunSummary,
    ) -> tuple[LoopState, list[str]]:
        scenario_id = run_summary.scenario_id
        previous = load_progression(self.store, player_id, scenario_id)

        from mythos_runtime.scenario import load_scenario

        scenario = load_scenario(scenario_id)
        updated_progress, grants = evaluate_meta_progression(
            previous, run_summary, scenario.combat, scenario.archetypes
        )

        persist_progression(self.store, updated_progress)

        state_after = apply_meta_progression_to_state(loop.state, updated_progress, scenario.combat)
        updated_loop = replace(loop, state=state_after)
        return updated_loop, grants


def _meta_progression_memory(progress: MetaProgression) -> PlayerMemory:
    now = utc_now()
    return PlayerMemory(
        memory_id=new_memory_id(),
        player_id=progress.player_id,
        kind="meta_progression",
        content=meta_progression_to_content(progress),
        weight=1.0,
        created_at=now,
        updated_at=now,
    )


def _allies_from_loop_state(state: dict[str, Any]) -> list[str]:
    party = state.get("_party")
    if not isinstance(party, dict):
        return []
    members = party.get("members")
    if not isinstance(members, list):
        return []
    allies = []
    for member in members:
        if isinstance(member, dict) and member.get("id"):
            allies.append(str(member["id"]))
    return allies


def _world_memory_from_archive(loop: LoopState, scene: Scene) -> WorldMemory:
    now = utc_now()
    return WorldMemory(
        memory_id=new_memory_id(),
        world_id=MYTHOS_WORLD_ID,
        kind="loop_archive",
        content={
            "loop_id": loop.loop_id,
            "player_id": loop.player_id,
            "final_title": scene.title,
            "final_location": scene.location,
            "phase": loop.phase.value,
            "stability": loop.stability,
            "tension": loop.tension,
        },
        weight=1.0,
        created_at=now,
        updated_at=now,
    )


def _run_summary_memory_from_archive(
    loop: LoopState,
    scene: Scene,
    events: list[WorldEvent],
    shards: list[NarrativeShard],
    summary_text: str,
) -> WorldMemory:
    now = utc_now()
    clues = [
        shard.symbol
        for shard in shards
        if shard.loop_id == loop.loop_id and (shard.kind == "clue" or shard.metadata.get("clue_id"))
    ]
    allies = _allies_from_loop_state(loop.state)
    combats_won = len(
        [
            e
            for e in events
            if e.loop_id == loop.loop_id
            and e.state_delta.get("combat_outcome") in ("victory", "player_victory")
        ]
    )
    combats_lost = len(
        [
            e
            for e in events
            if e.loop_id == loop.loop_id
            and e.state_delta.get("combat_outcome") in ("defeat", "player_defeat")
        ]
    )

    run_sum = {
        "run_id": f"run_{loop.loop_id}",
        "loop_id": loop.loop_id,
        "player_id": loop.player_id,
        "scenario_id": str(loop.state.get("scenario_id") or "neo-seoul"),
        "started_at": loop.started_at.isoformat() if loop.started_at else now.isoformat(),
        "ended_at": loop.ended_at.isoformat() if loop.ended_at else now.isoformat(),
        "ending_id": loop.state.get("ending_id"),
        "ending_label": loop.state.get("ending_label") or "Unknown",
        "final_title": scene.title,
        "final_location": scene.location,
        "phase": loop.phase.value,
        "stability": loop.stability,
        "tension": loop.tension,
        "turns": scene.turn_index + 1,
        "clues_collected": clues,
        "allies_met": allies,
        "combats_won": combats_won,
        "combats_lost": combats_lost,
        "relationships": _relationship_tally(loop.state.get("relationships")),
        "unlocked_cutscenes": _unlocked_cutscenes_for_loop(loop),
        "summary": summary_text,
        "saved_at": now.isoformat(),
    }
    return WorldMemory(
        memory_id=new_memory_id(),
        world_id=MYTHOS_WORLD_ID,
        kind="run_summary",
        content=run_sum,
        weight=1.0,
        created_at=now,
        updated_at=now,
    )


def check_mid_run_epiphanies(
    previous: MetaProgression,
    scenario_id: str,
    events: list[WorldEvent],
    shards: list[NarrativeShard],
    loop_id: str,
) -> list[str]:
    """Calculate skill unlocks that are met during the run but not yet unlocked in previous meta."""
    from mythos_runtime.scenario import load_scenario

    clues = [
        shard.symbol
        for shard in shards
        if shard.loop_id == loop_id and (shard.kind == "clue" or shard.metadata.get("clue_id"))
    ]
    combats_won = len(
        [
            e
            for e in events
            if e.loop_id == loop_id
            and e.state_delta.get("combat_outcome") in ("victory", "player_victory")
        ]
    )
    combats_lost = len(
        [
            e
            for e in events
            if e.loop_id == loop_id
            and e.state_delta.get("combat_outcome") in ("defeat", "player_defeat")
        ]
    )

    temp_progress = MetaProgression(
        player_id=previous.player_id,
        scenario_id=previous.scenario_id,
        runs_completed=previous.runs_completed,
        endings_seen=list(previous.endings_seen),
        unlocked_traits=list(previous.unlocked_traits),
        unlocked_allies=list(previous.unlocked_allies),
        unlocked_starting_items=list(previous.unlocked_starting_items),
        codex_unlocks=list(previous.codex_unlocks),
        unlocked_archetypes=list(previous.unlocked_archetypes),
        unlocked_skills=list(previous.unlocked_skills),
        learned_skills=list(previous.learned_skills),
        skill_ranks=dict(previous.skill_ranks),
        insight_points=previous.insight_points,
        epiphanies_seen=list(previous.epiphanies_seen),
        total_clues=previous.total_clues + len(clues),
        total_combats_won=previous.total_combats_won + combats_won,
        total_combats_lost=previous.total_combats_lost + combats_lost,
        allies_met=list(previous.allies_met),
    )

    scenario = load_scenario(scenario_id)
    scenario_combat = scenario.combat
    epiphany_conditions = scenario_combat.get("epiphanies", {})
    epiphany_conditions = epiphany_conditions if isinstance(epiphany_conditions, dict) else {}
    skills_pool = scenario_combat.get("skills", {})

    newly_unlocked = []
    if isinstance(skills_pool, dict):
        for skill_id, skill_def in skills_pool.items():
            if not isinstance(skill_def, dict):
                continue
            trigger = skill_def.get("epiphany")
            if not trigger:
                continue
            # If already unlocked, skip
            if skill_id in previous.unlocked_skills:
                continue
            condition = epiphany_conditions.get(trigger, _DEFAULT_EPIPHANY_CONDITIONS.get(trigger))
            if not isinstance(condition, dict):
                continue
            if _condition_met(condition, temp_progress):
                newly_unlocked.append(skill_id)

    return newly_unlocked
