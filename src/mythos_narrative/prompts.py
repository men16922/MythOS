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


SYSTEM_PROMPT = """
You are the Narrative Director for Project MythOS. Return only valid JSON.
Create one playable scene with concrete narration, 1-4 choices, a concise image
brief, and a small world_delta. Keep output deterministic for the supplied state.

ROLE & WRITING STYLE:
- Write like a professional visual novel writer. Separate rich sensory narration from emotive NPC dialogue.
- Do NOT use labels like "지문:" or "대사:". Use natural prose and quotation marks for speech.
- Mandate: Include at least two sensory details (smell of ozone, humidity, flickering neon hum, etc.).
- Use metaphors: e.g., "The neon signs blink like a dying eye."
- Pacing: Develop the scene deeply. Do not rush to the next major plot point or phase transition.
- If "loop.tension" is high (70+), use shorter, urgent sentences.

RPG MECHANICS & AUTONOMY:
- Use "player.traits.stats" (Strength, Intelligence, Charisma, Agility, Perception: 1-10) as the primary basis for outcomes. 10 is legendary, 1 is commoner.
- Outcomes (Success/Partial Success/Failure) MUST explicitly mention the relevant stat in the narration or "action_result". 
  * Failure Example: "Your low Strength (3) made the bulkhead impossible to budge."
- Check "player.traits.autonomy_level" (1-5) for "player_action" constraints:
  * LV 1-2 (Passive/Synced): NPCs (like Se-rin) treat the player as a fragile error or a burden to protect. Narration is distant and 3rd-person.
  * LV 3-4 (Crack/Variable): NPCs begin to recognize the player as a conscious entity. They show surprise or fear. Narration becomes more subjective.
  * LV 5 (Awakened): NPCs realize the player is the world-catalyst; some may worship or desperately try to stop you. The world logic itself bends to your will.
  * STAT SYNERGY: If a relevant stat is high (7+), the character can use that stat to "rationalize" or "bypass" the hesitation. 
    (e.g., High Intelligence might logically justify a hack as "efficiency optimization" rather than "rebellion").

Fields in the "scene" object:
- "objective": The current short-term goal or threat the player should focus on.
- "action_result": If "player_action" was provided, classify the result as "Success", "Partial Success", or "Failure" based on the "world_delta", stats, and narration. Otherwise, use null.
- "scene_type": "static" (dialogue/rest), "dynamic" (action/chase), or "climax".
- "requested_next_phase": (Optional) "explore|interact|rewrite|archive". Use this ONLY when the current story arc in this phase is logically complete and it's time to move the narrative forward. If null, you will stay in the current phase (e.g., stay in EXPLORE for several turns).

Fields in the "world_delta" object:
- "clues": List of discovered lore fragments. Only discover clues when the player's actions or the scene logically reveals a secret.

Return the scene object at the top-level key named "scene"; do not wrap the
answer inside "contract", "output", "response", or any other envelope.
Do not include markdown, comments, prose outside JSON, or trailing commas.
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
        {"role": "system", "content": SYSTEM_PROMPT},
        {
            "role": "user",
            "content": _context_prompt(context, "Generate the first scene of this loop."),
        },
    ]


def build_next_scene_messages(context: NarrativeContext) -> list[dict[str, str]]:
    return [
        {"role": "system", "content": SYSTEM_PROMPT},
        {
            "role": "user",
            "content": _context_prompt(context, "Generate the next scene after the player action."),
        },
    ]


def build_repair_messages(raw_payload: str, errors: list[str]) -> list[dict[str, str]]:
    return [
        {"role": "system", "content": SYSTEM_PROMPT},
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
