from __future__ import annotations

import json
import re
from typing import Any

from mythos_core import Choice

from .schemas import (
    ALLOWED_WORLD_DELTA_KEYS,
    MAX_CHOICES,
    MAX_NARRATION_CHARS,
    MAX_VISUAL_BRIEF_CHARS,
    ScenePayload,
    WorldDelta,
)


class NarrativeParseError(ValueError):
    def __init__(self, errors: list[str]) -> None:
        super().__init__("; ".join(errors))
        self.errors = errors


def parse_scene_payload(raw_payload: str | dict[str, Any]) -> ScenePayload:
    data = _normalize_payload(_load_json(raw_payload))
    errors: list[str] = []

    scene = data.get("scene") if isinstance(data, dict) else None
    if not isinstance(scene, dict):
        raise NarrativeParseError(["payload.scene must be an object"])

    title = _required_str(scene, "title", errors)
    location = _required_str(scene, "location", errors)
    narration = _clean_player_text(_required_str(scene, "narration", errors))
    visual_brief = _required_str(scene, "visual_brief", errors)
    choices = _parse_choices(scene.get("choices"), errors)
    objective = _optional_clean_str(scene.get("objective"))
    action_result = _optional_clean_str(scene.get("action_result"))
    world_delta = _parse_world_delta(data.get("world_delta", {}), errors)
    end_condition = data.get("end_condition")

    if narration and len(narration) > MAX_NARRATION_CHARS:
        errors.append(f"scene.narration exceeds {MAX_NARRATION_CHARS} characters")
    if visual_brief and len(visual_brief) > MAX_VISUAL_BRIEF_CHARS:
        visual_brief = visual_brief[:MAX_VISUAL_BRIEF_CHARS].rstrip()
    if end_condition is not None and not isinstance(end_condition, str):
        errors.append("end_condition must be string or null")
    if objective is not None and not isinstance(objective, str):
        errors.append("scene.objective must be string or null")
    if action_result is not None and not isinstance(action_result, str):
        errors.append("scene.action_result must be string or null")
    scene_type = scene.get("scene_type", "static")
    requested_next_phase = scene.get("requested_next_phase")
    if scene_type is not None and not isinstance(scene_type, str):
        errors.append("scene.scene_type must be string or null")
    if requested_next_phase is not None and not isinstance(requested_next_phase, str):
        errors.append("scene.requested_next_phase must be string or null")

    if errors:
        raise NarrativeParseError(errors)

    return ScenePayload(
        title=title,
        location=location,
        narration=narration,
        choices=choices,
        visual_brief=visual_brief,
        world_delta=world_delta,
        end_condition=end_condition,
        objective=objective,
        action_result=action_result,
        scene_type=str(scene_type),
        requested_next_phase=requested_next_phase,
    )


def repair_scene_payload(raw_payload: str | dict[str, Any]) -> dict[str, Any]:
    data = _normalize_payload(_load_json(raw_payload))
    if "scene" not in data or not isinstance(data["scene"], dict):
        data["scene"] = {
            key: data[key]
            for key in (
                "title",
                "location",
                "narration",
                "choices",
                "visual_brief",
                "objective",
                "action_result",
                "scene_type",
                "requested_next_phase",
            )
            if key in data
        }
    scene = data["scene"]
    if not isinstance(scene.get("title"), str) or not scene.get("title", "").strip():
        scene["title"] = "Signal at the Threshold"
    if not isinstance(scene.get("location"), str) or not scene.get("location", "").strip():
        scene["location"] = "data-layer-01"
    if not isinstance(scene.get("narration"), str) or not scene.get("narration", "").strip():
        scene["narration"] = (
            "A pale access gate opens in the dark. The system waits for the Connector's first choice."
        )
    if not isinstance(scene.get("choices"), list) or not scene["choices"]:
        scene["choices"] = [
            {
                "choice_id": "choice_1",
                "label": "Approach the signal",
                "intent": "explore",
            }
        ]
    else:
        scene["choices"] = _repair_choices(scene["choices"])
    if not isinstance(scene.get("visual_brief"), str) or not scene.get("visual_brief", "").strip():
        scene["visual_brief"] = (
            "A luminous terminal gate in a dark server hall, cyber-mythic atmosphere, cinematic lighting."
        )

    objective = scene.get("objective")
    if objective is not None and not isinstance(objective, str):
        scene["objective"] = str(objective)

    action_result = scene.get("action_result")
    if action_result is not None and not isinstance(action_result, str):
        scene["action_result"] = str(action_result)

    if not isinstance(scene.get("scene_type"), str):
        scene["scene_type"] = "static"

    if scene.get("requested_next_phase") is not None and not isinstance(
        scene.get("requested_next_phase"), str
    ):
        scene["requested_next_phase"] = str(scene["requested_next_phase"])

    if not isinstance(data.get("world_delta"), dict):
        data["world_delta"] = {}
    data["world_delta"] = _repair_world_delta(data["world_delta"])
    data.setdefault("end_condition", None)
    return dict(data)


def _load_json(raw_payload: str | dict[str, Any]) -> dict[str, Any]:
    if isinstance(raw_payload, dict):
        return dict(raw_payload)
    text = str(raw_payload).strip()
    if not text:
        raise NarrativeParseError(["payload is empty"])
    try:
        parsed = json.loads(text)
        return dict(parsed) if isinstance(parsed, dict) else {"_raw": parsed}
    except json.JSONDecodeError:
        start = text.find("{")
        end = text.rfind("}")
        if start >= 0 and end > start:
            try:
                parsed = json.loads(text[start : end + 1])
                return dict(parsed) if isinstance(parsed, dict) else {"_raw": parsed}
            except json.JSONDecodeError as exc:
                raise NarrativeParseError([f"invalid JSON: {exc}"]) from exc
        raise NarrativeParseError(["invalid JSON object"])


def _normalize_payload(data: dict[str, Any]) -> dict[str, Any]:
    if isinstance(data.get("scene"), dict):
        return data
    contract = data.get("contract")
    if isinstance(contract, dict) and isinstance(contract.get("scene"), dict):
        normalized = dict(contract)
        if "end_condition" not in normalized and "end_condition" in data:
            normalized["end_condition"] = data["end_condition"]
        return normalized
    return dict(data)


def _required_str(data: dict[str, Any], key: str, errors: list[str]) -> str:
    value = data.get(key)
    if not isinstance(value, str) or not value.strip():
        errors.append(f"scene.{key} must be a non-empty string")
        return ""
    return value.strip()


def _optional_clean_str(value: Any) -> str | None:
    if value is None:
        return None
    if isinstance(value, str):
        return _clean_player_text(value)
    return str(value)


def _clean_player_text(value: str) -> str:
    cleaned = re.sub(
        r"\[\s*(?:cinematic\s*)?sfx\s*:\s*[^\]]+\]",
        lambda match: _sfx_to_prose(match.group(0)),
        value,
        flags=re.IGNORECASE,
    )
    cleaned = re.sub(
        r"(?:cinematic\s*)?sfx\s*:\s*[A-Z0-9 _-]+",
        lambda match: _sfx_to_prose(match.group(0)),
        cleaned,
        flags=re.IGNORECASE,
    )
    cleaned = re.sub(r"(?<=[.!?])(?=\S)", " ", cleaned)
    return re.sub(r"[ \t]{2,}", " ", cleaned).strip()


def _sfx_to_prose(raw: str) -> str:
    normalized = raw.lower()
    if "scratch" in normalized or "static" in normalized:
        return "치직, 긁히는 정전기가 귓속을 스쳤다."
    if "glitch" in normalized:
        return "짧은 글리치음이 허공을 찢었다."
    if "hum" in normalized:
        return "낮은 기계음이 바닥 아래에서 울렸다."
    if "alarm" in normalized or "siren" in normalized:
        return "멀리서 경보음이 번졌다."
    return "짧은 전자음이 공기를 흔들었다."


def _parse_choices(value: Any, errors: list[str]) -> list[Choice]:
    if not isinstance(value, list):
        errors.append("scene.choices must be a list")
        return []
    if not (1 <= len(value) <= MAX_CHOICES):
        errors.append(f"scene.choices must contain 1-{MAX_CHOICES} choices")
        return []

    choices: list[Choice] = []
    for index, item in enumerate(value, start=1):
        item_errors: list[str] = []
        if not isinstance(item, dict):
            errors.append(f"scene.choices[{index}] must be an object")
            continue
        choice_id = item.get("choice_id") or f"choice_{index}"
        label = item.get("label")
        intent = item.get("intent")
        if not isinstance(choice_id, str) or not choice_id.strip():
            item_errors.append(f"scene.choices[{index}].choice_id must be a string")
        elif not isinstance(label, str) or not label.strip():
            item_errors.append(f"scene.choices[{index}].label must be a string")
        elif not isinstance(intent, str) or not intent.strip():
            item_errors.append(f"scene.choices[{index}].intent must be a string")
        if item_errors:
            errors.extend(item_errors)
        else:
            choices.append(
                Choice(
                    choice_id=str(choice_id).strip(),
                    label=str(label).strip(),
                    intent=str(intent).strip(),
                )
            )
    return choices


def _repair_choices(value: list[Any]) -> list[dict[str, str]]:
    repaired: list[dict[str, str]] = []
    for index, item in enumerate(value[:MAX_CHOICES], start=1):
        if isinstance(item, str):
            item = {"label": item}
        if not isinstance(item, dict):
            continue
        label = item.get("label") or item.get("text") or item.get("choice")
        intent = item.get("intent") or "explore"
        choice_id = item.get("choice_id") or item.get("id") or f"choice_{index}"
        repaired.append(
            {
                "choice_id": str(choice_id).strip() or f"choice_{index}",
                "label": str(label).strip() if label else f"Choice {index}",
                "intent": str(intent).strip() or "explore",
            }
        )
    return repaired or [
        {
            "choice_id": "choice_1",
            "label": "Approach the signal",
            "intent": "explore",
        }
    ]


def _repair_world_delta(value: dict[str, Any]) -> dict[str, Any]:
    flags = value.get("flags", [])
    if isinstance(flags, str):
        flags = [flags]
    if not isinstance(flags, list):
        flags = []
    grant_items = value.get("grant_items", [])
    if isinstance(grant_items, str):
        grant_items = [grant_items]
    if not isinstance(grant_items, list):
        grant_items = []
    start_combat = _nullable_string(value.get("start_combat"))
    spawn_encounters = value.get("spawn_encounters", [])
    if isinstance(spawn_encounters, str):
        spawn_encounters = [spawn_encounters]
    if not isinstance(spawn_encounters, list):
        spawn_encounters = []
    hp = value.get("hp")
    return {
        "stability": value.get("stability", 0) if isinstance(value.get("stability", 0), int) else 0,
        "tension": value.get("tension", 0) if isinstance(value.get("tension", 0), int) else 0,
        "flags": [str(flag) for flag in flags if isinstance(flag, str)],
        "clues": value.get("clues", []) if isinstance(value.get("clues", []), list) else [],
        "start_combat": start_combat,
        "spawn_encounters": [str(item) for item in spawn_encounters if isinstance(item, str)],
        "grant_items": [str(item) for item in grant_items if isinstance(item, str)],
        "hp": hp if isinstance(hp, int) and not isinstance(hp, bool) else None,
    }


def _parse_world_delta(value: Any, errors: list[str]) -> WorldDelta:
    if not isinstance(value, dict):
        errors.append("world_delta must be an object")
        return WorldDelta()
    unknown_keys = set(value) - ALLOWED_WORLD_DELTA_KEYS
    if unknown_keys:
        errors.append(f"world_delta has unsupported keys: {sorted(unknown_keys)}")

    stability = _int_delta(value.get("stability", 0), "world_delta.stability", errors)
    tension = _int_delta(value.get("tension", 0), "world_delta.tension", errors)
    flags = value.get("flags", [])
    if not isinstance(flags, list) or not all(isinstance(flag, str) for flag in flags):
        errors.append("world_delta.flags must be a list of strings")
        flags = []

    clues = value.get("clues", [])
    if not isinstance(clues, list) or not all(isinstance(clue, dict) for clue in clues):
        errors.append("world_delta.clues must be a list of objects")
        clues = []

    raw_start_combat = value.get("start_combat")
    start_combat = _nullable_string(raw_start_combat)
    if (
        start_combat is None
        and raw_start_combat is not None
        and not isinstance(raw_start_combat, str)
    ):
        errors.append("world_delta.start_combat must be string or null")

    grant_items = value.get("grant_items", [])
    if not isinstance(grant_items, list) or not all(isinstance(item, str) for item in grant_items):
        errors.append("world_delta.grant_items must be a list of strings")
        grant_items = []

    spawn_encounters = value.get("spawn_encounters", [])
    if not isinstance(spawn_encounters, list) or not all(
        isinstance(item, str) for item in spawn_encounters
    ):
        errors.append("world_delta.spawn_encounters must be a list of strings")
        spawn_encounters = []

    hp = value.get("hp")
    if hp is not None and (isinstance(hp, bool) or not isinstance(hp, int)):
        errors.append("world_delta.hp must be integer or null")
        hp = None

    return WorldDelta(
        stability=stability,
        tension=tension,
        flags=flags,
        clues=clues,
        start_combat=start_combat,
        spawn_encounters=spawn_encounters,
        grant_items=grant_items,
        hp=hp,
    )


def _int_delta(value: Any, key: str, errors: list[str]) -> int:
    if isinstance(value, bool) or not isinstance(value, int):
        errors.append(f"{key} must be an integer")
        return 0
    return max(-25, min(25, value))


def _nullable_string(value: Any) -> str | None:
    if not isinstance(value, str):
        return None
    cleaned = value.strip()
    if not cleaned or cleaned.lower() in {"null", "none", "false", "undefined", "nil"}:
        return None
    return cleaned
