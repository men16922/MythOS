from __future__ import annotations

import json
from dataclasses import dataclass, field
from functools import lru_cache
from pathlib import Path
from typing import Any

PROJECT_ROOT = Path(__file__).resolve().parents[2]


@dataclass(frozen=True)
class ScenarioConfig:
    scenario_id: str
    name: str
    brief: str
    system_prompt: str = ""
    archetypes: list[dict[str, Any]] = field(default_factory=list)
    starting_location: str = "data-layer-01"
    character_map: dict[str, str] = field(default_factory=dict)
    concept_map: dict[str, str] = field(default_factory=dict)
    ui_copy: dict[str, Any] = field(default_factory=dict)
    characters: list[dict[str, Any]] = field(default_factory=list)
    session_design: dict[str, Any] = field(default_factory=dict)
    main_arcs: list[dict[str, Any]] = field(default_factory=list)
    side_arcs: list[dict[str, Any]] = field(default_factory=list)
    npc_agendas: dict[str, dict[str, Any]] = field(default_factory=dict)
    endings: list[dict[str, Any]] = field(default_factory=list)
    cinematic_sfx: dict[str, str] = field(default_factory=dict)
    autonomy_config: dict[str, dict[str, Any]] = field(default_factory=dict)
    combat: dict[str, Any] = field(default_factory=dict)
    route_map: dict[str, Any] = field(default_factory=dict)
    unlock: dict[str, Any] | None = None
    unlock_hint: str = ""


@lru_cache(maxsize=16)
def load_scenario(scenario_id: str) -> ScenarioConfig:
    path = PROJECT_ROOT / "resources" / scenario_id / "scenario.json"
    if not path.exists():
        raise FileNotFoundError(f"Scenario configuration not found: {path}")

    with open(path, encoding="utf-8") as f:
        data = json.load(f)

    return ScenarioConfig(
        scenario_id=data.get("scenario_id", scenario_id),
        name=data.get("name", scenario_id),
        brief=data.get("brief", ""),
        system_prompt=data.get("system_prompt", ""),
        archetypes=data.get("archetypes", []),
        starting_location=data.get("starting_location", "data-layer-01"),
        character_map=data.get("character_map", {}),
        concept_map=data.get("concept_map", {}),
        ui_copy=data.get("ui_copy", {}),
        characters=data.get("characters", []),
        session_design=data.get("session_design", {}),
        main_arcs=data.get("main_arcs", []),
        side_arcs=data.get("side_arcs", []),
        npc_agendas=data.get("npc_agendas", {}),
        endings=data.get("endings", []),
        cinematic_sfx=data.get("cinematic_sfx", {}),
        autonomy_config=data.get("autonomy_config", {}),
        combat=data.get("combat", {}),
        route_map=data.get("route_map", {}),
        unlock=data.get("unlock"),
        unlock_hint=data.get("unlock_hint", ""),
    )
