from __future__ import annotations

import json

from mythos_core.models import to_json_dict

from .schemas import NarrativeContext

# Upper bound on authored GM directive notes included in a prompt. Notes are
# bounded, short instructions; an over-tight cap was dropping the opening
# continuity / onboarding directives off the end of the list.
MAX_PROMPT_NOTES = 24

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
        # narration is intentionally the FIRST field so the streaming extractor
        # can surface scene text immediately instead of waiting for the model to
        # emit title/location first (reduces perceived time-to-first-token).
        "narration": "한국어로 작성된 소설적이고 감각적인 장면 묘사",
        "title": "한국어로 작성된 장면 제목",
        "location": "location id or readable location",
        "scene_type": "static|dynamic|climax",
        "objective": "한국어로 작성된 현재 구체적인 작전 목표",
        "action_result": "Success|Partial Success|Failure|null",
        "requested_next_phase": "explore|interact|rewrite|archive|null",
        "choices": [
            {
                "choice_id": "choice_1",
                "label": "한국어로 작성된 플레이어의 선택지 설명",
                "intent": "explore|interact|rewrite|archive",
                "cost": {"stability": -5, "tension": 3},  # optional: 안정성/긴장도 소모 및 변화량
                "requires": {
                    "stability_min": 10,
                    "tension_max": 80,
                },  # optional: 필요 최소 안정성 / 최대 긴장 조건
            }
        ],
        "visual_brief": "English image brief under 700 characters for FLUX generation",
    },
    "world_delta": {
        "stability": -3,
        "tension": 5,
        "flags": ["signal_detected"],
        "clues": [
            {
                "symbol": "clue_id",
                "text": "한국어로 작성된 발견한 단서 조각 설명",
                "tags": ["tag1", "tag2"],
            }
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
        "player": to_json_dict(context.player),
        "loop": to_json_dict(context.loop),
        "turn_index": context.turn_index,
        "recent_events": [to_json_dict(event) for event in context.recent_events[-6:]],
        "memories": [to_json_dict(memory) for memory in context.memories[-8:]],
        "world_memories": [to_json_dict(memory) for memory in context.world_memories[-6:]],
        "narrative_shards": [to_json_dict(shard) for shard in context.narrative_shards[-8:]],
        # novelty_notes carries the authored GM directives (opening continuity,
        # onboarding shots, story-bible snippets, stat monologue, emergency rules).
        # Keep a generous window so critical directives aren't silently dropped.
        "novelty_notes": context.novelty_notes[-MAX_PROMPT_NOTES:],
        "player_action": context.player_action,
        "validator_feedback": context.validator_feedback,
    }
    body = json.dumps(payload, ensure_ascii=False, sort_keys=True)
    # The contract is emitted separately WITHOUT sort_keys so the example keeps
    # its intentional field order (narration first). sort_keys on the dynamic
    # payload is kept for prompt determinism; the contract is a constant. We also
    # tell the model to emit fields in this order so streaming surfaces the scene
    # narration before the choices array (shorter time-to-first-token).
    contract = json.dumps(JSON_CONTRACT, ensure_ascii=False, indent=2)
    return (
        f"{body}\n\nOutput contract — return JSON with fields in exactly this "
        f"order (narration first):\n{contract}"
    )
