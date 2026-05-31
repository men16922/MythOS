from __future__ import annotations

import json

from mythos_core.models import to_json_dict

from .schemas import NarrativeContext

CANONICAL_WORLD_CONTEXT = """
Project MythOS / 세계:접속 is a loop-based narrative simulation.
The player is a Connector entering unstable data layers. Each loop may reset the
surface world, but echoes from earlier choices can persist. Scenes should feel
cyber-mythic, concrete, playable, and state-aware. Do not resolve the entire
mystery in one scene.
""".strip()

DEFAULT_SYSTEM_PROMPT = """
You are the Narrative Director for Project MythOS. Return only valid JSON.
Create one playable scene with concrete narration, 1-4 choices, a concise image
brief, and a small world_delta. Return the scene object at the top-level key
named "scene"; do not wrap it in any other envelope.
""".strip()


JSON_CONTRACT = {
    "scene": {
        "title": "short scene title",
        "location": "location id or readable location",
        "scene_type": "static|dynamic|climax",
        "narration": "playable scene narration",
        "objective": "current primary objective",
        "action_result": "Success|Partial Success|Failure|null",
        "requested_next_phase": "explore|interact|rewrite|archive|null",
        "choices": [
            {
                "choice_id": "choice_1",
                "label": "short player-facing choice",
                "intent": "explore|interact|rewrite|archive",
            }
        ],
        "visual_brief": "English image brief under 700 characters",
    },
    "world_delta": {
        "stability": -3,
        "tension": 5,
        "flags": ["signal_detected"],
        "clues": [
            {"symbol": "clue_id", "text": "description of the clue", "tags": ["tag1", "tag2"]}
        ],
    },
    "end_condition": None,
}


def build_first_scene_messages(context: NarrativeContext) -> list[dict[str, str]]:
    return [
        {"role": "system", "content": _system_prompt(context)},
        {
            "role": "user",
            "content": _context_prompt(context, "Generate the first scene of this loop."),
        },
    ]


def build_next_scene_messages(context: NarrativeContext) -> list[dict[str, str]]:
    return [
        {"role": "system", "content": _system_prompt(context)},
        {
            "role": "user",
            "content": _context_prompt(context, "Generate the next scene after the player action."),
        },
    ]


def build_repair_messages(
    raw_payload: str, errors: list[str], context: NarrativeContext
) -> list[dict[str, str]]:
    return [
        {"role": "system", "content": _system_prompt(context)},
        {
            "role": "user",
            "content": "\n".join(
                [
                    "Repair this payload into valid JSON matching the contract.",
                    "Return only the corrected JSON object.",
                    f"Errors: {json.dumps(errors, ensure_ascii=False)}",
                    f"Contract: {json.dumps(JSON_CONTRACT, ensure_ascii=False)}",
                    f"Payload: {raw_payload}",
                ]
            ),
        },
    ]


def _system_prompt(context: NarrativeContext) -> str:
    return context.system_prompt.strip() or DEFAULT_SYSTEM_PROMPT


def _context_prompt(context: NarrativeContext, instruction: str) -> str:
    payload = {
        "instruction": instruction,
        "world": CANONICAL_WORLD_CONTEXT,
        "contract": JSON_CONTRACT,
        "player": to_json_dict(context.player),
        "loop": to_json_dict(context.loop),
        "turn_index": context.turn_index,
        "recent_events": [to_json_dict(event) for event in context.recent_events[-6:]],
        "memories": [to_json_dict(memory) for memory in context.memories[-8:]],
        "world_memories": [to_json_dict(memory) for memory in context.world_memories[-6:]],
        "narrative_shards": [to_json_dict(shard) for shard in context.narrative_shards[-8:]],
        "novelty_notes": context.novelty_notes[-8:],
        "player_action": context.player_action,
        "validator_feedback": context.validator_feedback,
    }
    return json.dumps(payload, ensure_ascii=False, sort_keys=True)
