from __future__ import annotations

import json
import re
from typing import Any

from mythos_core import Choice

from .fallbacks import DEFAULT_FALLBACK
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

    title = _clean_player_text(_required_str(scene, "title", errors))
    location = _clean_player_text(_required_str(scene, "location", errors))
    narration = _clean_player_text(_required_str(scene, "narration", errors))
    visual_brief = _clean_player_text(_required_str(scene, "visual_brief", errors))
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
    # Repair-fill defaults come from the single shared fallback source (prose layer);
    # the parser has no scenario context, so it always uses the code-level default.
    # Repair only fills *missing* fields on an otherwise-valid payload — the visible
    # fallback scene goes through director._fallback_payload (scenario-overridable).
    repair = DEFAULT_FALLBACK["repair"]
    scene = data["scene"]
    if not isinstance(scene.get("title"), str) or not scene.get("title", "").strip():
        scene["title"] = repair["title"]
    if not isinstance(scene.get("location"), str) or not scene.get("location", "").strip():
        # Prose default (not the raw-ID "data-layer-01", which jarringly read as an
        # underground data-layer when a short generation omitted [LOCATION]).
        scene["location"] = repair["location"]
    if not isinstance(scene.get("narration"), str) or not scene.get("narration", "").strip():
        scene["narration"] = repair["narration"]
    if not isinstance(scene.get("choices"), list) or not scene["choices"]:
        scene["choices"] = [
            {
                "choice_id": "choice_1",
                "label": repair["choice_label"],
                "intent": "explore",
            }
        ]
    else:
        scene["choices"] = _repair_choices(scene["choices"])
    if not isinstance(scene.get("visual_brief"), str) or not scene.get("visual_brief", "").strip():
        scene["visual_brief"] = repair["visual_brief"]

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


# Instruction-fidelity backstop: the GM prompt forbids tabletop-mechanics
# phrasing (prompts.py lists "Make a Perception check" as a bad example), but
# live play still leaked parenthetical tags into choice labels — e.g.
# "... dash through the distortion (Agility check)". Strip the annotation
# deterministically (EN/KO stat + check/roll/save/판정/체크/굴림, optional DC
# number) so a non-compliant generation can't surface it to the player.
_MECHANICS_ANNOTATION = re.compile(
    r"\s*[\(（\[]\s*"
    r"(?:[A-Za-z가-힣]+\s+)?"  # optional stat name ("Agility ", "민첩 ")
    r"(?:check|roll|saving\s+throw|save|dc\s*\d+|판정|체크|굴림)"
    r"(?:\s*[:：]?\s*(?:dc\s*)?\d+)?"  # optional difficulty number
    r"\s*[\)）\]]",
    flags=re.IGNORECASE,
)


def _clean_player_text(value: str) -> str:
    # Some local GGUF tokenizers can leak byte fallback tokens into Korean text,
    # e.g. "자<0xEC><0xA4>개빛". Strip the artifacts and keep the readable text.
    value = re.sub(r"<0x[0-9a-fA-F]{2}>", "", value)
    value = _MECHANICS_ANNOTATION.sub("", value)
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
                    label=_clean_player_text(str(label).strip()),
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
            "label": DEFAULT_FALLBACK["repair"]["choice_label"],
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

    # route_nodes: dynamic route proposals. Keep only well-formed {type[, title]}
    # objects; node-type validity is enforced later by route_growth against the
    # scenario's node_types, so a stray type here is tolerated (not an error).
    route_nodes: list[dict[str, Any]] = []
    raw_route_nodes = value.get("route_nodes", [])
    if isinstance(raw_route_nodes, list):
        for item in raw_route_nodes:
            if isinstance(item, dict) and isinstance(item.get("type"), str):
                node: dict[str, Any] = {"type": item["type"]}
                if isinstance(item.get("title"), str):
                    node["title"] = item["title"]
                route_nodes.append(node)
    elif raw_route_nodes:
        errors.append("world_delta.route_nodes must be a list of objects")

    return WorldDelta(
        stability=stability,
        tension=tension,
        flags=flags,
        clues=clues,
        start_combat=start_combat,
        spawn_encounters=spawn_encounters,
        grant_items=grant_items,
        hp=hp,
        route_nodes=route_nodes,
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


def parse_story_text(story_text: str) -> ScenePayload:
    """Parses raw storyteller markdown-like markup (SCENE, TITLE, LOCATION, CHOICES) into a ScenePayload."""
    # 1. Title
    title_match = re.search(r"\[TITLE\]\s*\n*(.*?)(?=\n*\[|$)", story_text, re.DOTALL | re.IGNORECASE)
    title = title_match.group(1).strip() if title_match else DEFAULT_FALLBACK["repair"]["title"]

    # 2. Location — prose default (not the raw-ID "data-layer-01") when [LOCATION] omitted.
    location_match = re.search(r"\[LOCATION\]\s*\n*(.*?)(?=\n*\[|$)", story_text, re.DOTALL | re.IGNORECASE)
    location = (
        location_match.group(1).strip() if location_match else DEFAULT_FALLBACK["repair"]["location"]
    )

    # 3. Narration
    narration_match = re.search(r"\[SCENE\]\s*\n*(.*?)(?=\n*\[|$)", story_text, re.DOTALL | re.IGNORECASE)
    narration = narration_match.group(1).strip() if narration_match else story_text.split("[")[0].strip()
    narration = _clean_player_text(narration)
    if not narration:
        raise NarrativeParseError(["story text must include non-empty narration"])

    # 4. Choices
    choices_match = re.search(r"\[CHOICES\]\s*\n*(.*?)(?=\n*\[|$)", story_text, re.DOTALL | re.IGNORECASE)
    choices_block = choices_match.group(1).strip() if choices_match else ""

    choices = []
    lines = choices_block.split("\n")
    choice_idx = 1
    for line in lines:
        line = line.strip()
        if not line:
            continue
        line_clean = re.sub(r"^[-*+]\s*", "", line).strip()
        if not line_clean:
            continue

        choice_id_match = re.match(r"^(choice_\d+|choice_[a-zA-Z0-9_]+)\s*:\s*(.*)", line_clean, re.IGNORECASE)
        if choice_id_match:
            choice_id = choice_id_match.group(1).strip()
            label = choice_id_match.group(2).strip()
        else:
            choice_id = f"choice_{choice_idx}"
            label = line_clean
            choice_idx += 1

        # Default intents based on keyword heuristic or exploring default
        intent = "explore"
        label_lower = label.lower()
        if any(w in label_lower for w in ["조사", "탐색", "기록", "look", "search", "explore", "scan"]):
            intent = "explore"
        elif any(w in label_lower for w in ["대화", "이야기", "질문", "말", "설득", "talk", "ask", "chat"]):
            intent = "interact"
        elif any(w in label_lower for w in ["해킹", "수정", "개입", "조작", "rewrite", "hack", "inject"]):
            intent = "rewrite"
        elif any(w in label_lower for w in ["아카이브", "보존", "저장", "archive"]):
            intent = "archive"

        choices.append(Choice(choice_id=choice_id, label=label, intent=intent))

    if not choices:
        choices = [Choice(choice_id="choice_1", label="주변을 조사한다.", intent="explore")]

    # Heuristic Rule-based WorldDelta calculation
    # We assign cost based on choices' intents to keep the game loops alive without LLM.
    stability = 0
    tension = 0
    for c in choices:
        if c.intent == "explore":
            stability -= 2
            tension += 2
        elif c.intent == "rewrite":
            stability -= 4
            tension += 4
        elif c.intent == "interact":
            stability -= 1
            tension += 1

    # Heuristic for starting combat from text
    start_combat = None
    story_lower = story_text.lower()
    if any(w in story_lower for w in ["전투 시작", "전투가 시작", "시작되는 전투", "적 출현", "encounter_"]):
        # heuristic try to find encounter id
        encounter_match = re.search(r"encounter_([a-zA-Z0-9_-]+)", story_text)
        if encounter_match:
            start_combat = f"encounter_{encounter_match.group(1)}"
        else:
            start_combat = "combat_default"

    # Heuristic for flags
    flags = []
    if "clue" in story_lower or "단서" in story_lower:
        flags.append("clue_found")
    if "combat" in story_lower or "전투" in story_lower:
        flags.append("combat_imminent")

    world_delta = WorldDelta(
        stability=stability,
        tension=tension,
        flags=flags,
        clues=[],
        start_combat=start_combat,
        spawn_encounters=[],
        grant_items=[],
        hp=None,
        route_nodes=[]
    )

    # 5. Visual brief
    # Since 8B was generating visual_brief, we fallback to a clean English prompt derived from title and location.
    visual_brief = f"A dramatic cyber-mythic scene in {location} representing: {title}. Neon lighting, cinematic composition, digital art style."

    return ScenePayload(
        title=title,
        location=location,
        narration=narration,
        choices=choices,
        visual_brief=visual_brief,
        world_delta=world_delta,
        scene_type="static"
    )
