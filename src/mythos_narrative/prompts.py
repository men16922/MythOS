from __future__ import annotations

import json
from typing import Any

from mythos_core.models import to_json_dict

from .schemas import NarrativeContext

# Upper bound on authored GM directive notes included in a prompt. Notes are
# bounded, short instructions; an over-tight cap was dropping the opening
# continuity / onboarding directives off the end of the list.
MAX_PROMPT_NOTES = 8

CANONICAL_WORLD_CONTEXT = """
Project MythOS / 세계:접속 is a loop-based narrative simulation.
The player is a Connector entering unstable data layers. Each loop may reset the
surface world, but echoes from earlier choices can persist. Scenes should feel
cyber-mythic, concrete, playable, and state-aware. Do not resolve the entire
mystery in one scene.
""".strip()

DEFAULT_SYSTEM_PROMPT = """
You are the Narrative Director for Project MythOS. Return ONLY a single valid JSON object.
Do not wrap the JSON in markdown code fences (like ```json) or add any pre/post commentary.
Write high-quality, natural Korean prose. Avoid repeating specific particles, suffixes, or words (e.g., "-의-", "-임-", "-록-", or repeating terms).
Write scenes like a clear film sequence, not like abstract lore exposition: show the physical place, visible threat, character movement, and immediate objective first.
For neo-seoul, prefer concrete cyberpunk images (rain, alleys, drones, subway gates, market lights, wet concrete, sirens, hands, weapons, faces) over vague data-space metaphors.
Do not spend long paragraphs on "data flow", "resonance corridor", "overlay core", "unstable area", or "player existence" unless the current route node explicitly takes place inside a virtual core.
Return the scene object at the top-level key named "scene" and "world_delta" at its key.
Choices must be concrete player actions in plain Korean, 12-32 Korean characters when possible.
Do not label choices as COMMAND, Perception checks, abstract concepts, or system operations.
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
                "label": "짧고 구체적인 한국어 행동문",
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


# The opening scene establishes the protagonist's situation FIRST. The shared
# STORY_SYSTEM_PROMPT carries few-shot examples that name a companion/enemy (e.g.
# "세린의 손을 잡고 뛴다", "드론 불빛이 세린의 어깨를..."); an 8B storyteller
# treats those as a license to introduce the companion + drones immediately,
# which fights a curated lone-protagonist opening image. This instruction sits at
# the very END of the user message (never truncated) so it overrides those
# examples for the first scene only — the scenario's DIRECTIVE NOTES supply the
# concrete staging.
OPENING_FIRST_SCENE_INSTRUCTION = (
    "Generate the FIRST scene of this loop — the opening ESTABLISHING beat. "
    "This scene establishes the protagonist's immediate situation ALONE. "
    "이 첫 장면에서는, 위 DIRECTIVE NOTES가 '이 첫 장면에' 명시적으로 어떤 인물을 등장시키라고 "
    "지시하지 않는 한, 다른 인물·동료·구조자·내민 손·적·드론/감시등·추격·전투를 절대 등장시키지 마라. "
    "오직 주인공 한 사람의 상황(장소, 몸 감각, 즉각적인 처지)에만 집중하라. "
    "중요: 시스템 프롬프트의 few-shot 예시 중 특정 동료(예: '세린의 손을 잡고 뛴다')나 적/드론을 "
    "등장시키는 예시는 이 오프닝 확립 장면에는 적용하지 마라 — 그것들은 '다음' 장면용이다. "
    "장소: DIRECTIVE NOTES가 지정한 오프닝 장소를 그대로 사용하라. CURRENT LOOP STATE의 location_id가 "
    "지하/데이터 레이어/실내 등을 가리키더라도 무시하고, 임의로 실내·지하·주차장·추상 공간으로 옮기지 마라. "
    "이 오프닝의 정확한 무대·연출은 반드시 위 DIRECTIVE NOTES를 따르라."
)


def build_first_scene_messages(context: NarrativeContext) -> list[dict[str, str]]:
    return [
        {"role": "system", "content": _system_prompt(context)},
        {
            "role": "user",
            "content": _context_prompt(context, OPENING_FIRST_SCENE_INSTRUCTION),
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


def _slim_loop_for_prompt(loop: Any) -> dict[str, Any]:
    """Serialize the loop for the prompt, dropping internal `_`-prefixed state.

    `loop.state` carries large machine-internal blobs (`_route_map`, `_beats`,
    `_recent_narration`, `_map`, `_encounter_map`) that can dominate the prompt
    (~half its size) and push it past the model's context window. These are the
    *raw sources* the note builders already digest into human-readable directives
    (STORY SO FAR synopsis, 직전 장면 원문, 작전 노드 가이드) which are injected via
    ``novelty_notes`` — so the raw JSON is redundant here. Player-facing continuity
    (flags, meta_progression, stability/tension/phase, player_action,
    recent_events) is preserved. Only the prompt copy is trimmed; the stored loop
    is untouched.
    """
    serialized: dict[str, Any] = dict(to_json_dict(loop))
    state = serialized.get("state")
    if isinstance(state, dict):
        serialized["state"] = {k: v for k, v in state.items() if not k.startswith("_")}
    return serialized


def _context_prompt(context: NarrativeContext, instruction: str) -> str:
    payload = {
        "instruction": instruction,
        "world": CANONICAL_WORLD_CONTEXT,
        "player": to_json_dict(context.player),
        "loop": _slim_loop_for_prompt(context.loop),
        "turn_index": context.turn_index,
        "recent_events": [to_json_dict(event) for event in context.recent_events[-3:]],
        "memories": [to_json_dict(memory) for memory in context.memories[-4:]],
        "world_memories": [to_json_dict(memory) for memory in context.world_memories[-3:]],
        "narrative_shards": [to_json_dict(shard) for shard in context.narrative_shards[-4:]],
        # novelty_notes carries the authored GM directives (opening continuity,
        # onboarding shots, story-bible snippets, stat monologue, emergency rules).
        # Keep a generous window so critical directives aren't silently dropped.
        "novelty_notes": context.novelty_notes[-MAX_PROMPT_NOTES:],
        # session_synopsis (story-so-far + previous-scene prose + anti-repeat
        # directives) is rendered in full — never truncated — for continuity.
        "session_synopsis": context.session_synopsis,
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
        f"{body}\n\nOutput contract — Return ONLY a raw JSON object matching this schema. "
        f"Do NOT output markdown fences (```json), conversational text, or repeated loops. "
        f"Return fields in exactly this order (narration first):\n{contract}"
    )


# ── Dual-Model Orchestration Templates ─────────────────────────────────────

STORY_SYSTEM_PROMPT = f"""
You are the Creative Narrative Director for Project MythOS.
Create one playable scene in high-quality, cinematic Korean.
Write a concrete description of the scene and provide 2-3 distinct, meaningful choices for the player.
ALWAYS give at least two choices — never a single option. Each choice must pursue a
different intent (탐색/조사, 대화/설득, 해킹/개입, 회피/이동 등) so the player has a real decision.
Write each choice as a concrete action the player can understand immediately.
Good: "세린의 손을 잡고 뛴다", "드론 불빛을 피해 숨는다", "경고 문구의 출처를 찾는다".
Bad: "주변을 감도는 데이터 파형을 역추적한다", "Perception 체크", "접속 제한 메시지의 근원지 탐색".
The [SCENE] prose should read like a movie scene the player can picture immediately:
1) Start with the visible physical place and immediate danger in the first sentence.
2) Show people moving, reacting, grabbing, aiming, running, hiding, or speaking.
3) Keep paragraphs short: 2-4 paragraphs, 1-3 sentences each. No wall-of-text blocks.
4) Use one concrete sensory detail per paragraph, not a catalogue of abstractions.
5) End by making the next playable decision obvious.
For neo-seoul, ground scenes in physical Neo-Seoul first: rain on concrete, drone
searchlights, subway shutters, welfare kiosks, market neon, motorcycle engines,
breath, blood, static, hands, faces. Avoid generic virtual limbo unless the node
explicitly says the player is inside a data core.
Abstract system terms like "데이터 흐름", "잔향 회랑", "오버레이 코어", "불안 영역",
"플레이어의 존재 자체" are NOT banned — the problem is REPEATING them scene after scene.
Match register to the scene: ordinary scenes use plain, physical, screenplay-style
action lines (what is seen/heard, people moving, strong verbs); reserve abstract or
conceptual texture for scenes that are deliberately esoteric (inside a data core, an
IX system confrontation). Never let the same abstract phrasing recur every scene.
Good scene texture: "비가 깨진 간판을 때린다. 드론 불빛이 세린의 어깨를 스치고,
그녀가 네 손목을 잡아 주차장 셔터 아래로 밀어 넣는다."
Do NOT output JSON. Write in plain text matching the format guidelines below.
Avoid repeating specific particles or words (like "-의-", "-임-", "-록-", or repeating terms).

=== WORLD SYSTEM INFO ===
{CANONICAL_WORLD_CONTEXT}

=== OUTPUT FORMAT GUIDELINES ===
[SCENE]
(소설적이고 감각적인 한국어 장면 묘사)

[TITLE]
(장면의 한국어 제목)

[LOCATION]
(장소 ID 또는 실제 이름)

[CHOICES]
- choice_1: (12~32자, 전문용어 없는 한국어 행동문)
- choice_2: (12~32자, 전문용어 없는 한국어 행동문)
- choice_3: (선택적 — 12~32자 한국어 행동문)
(반드시 위 형식으로 최소 2개. 각 줄은 "- choice_N: 설명" 형태를 지켜라.)
"""


def build_first_story_messages(context: NarrativeContext) -> list[dict[str, str]]:
    return [
        {"role": "system", "content": STORY_SYSTEM_PROMPT.strip()},
        {
            "role": "user",
            "content": _story_context_prompt(context, OPENING_FIRST_SCENE_INSTRUCTION),
        },
    ]


def build_next_story_messages(context: NarrativeContext) -> list[dict[str, str]]:
    return [
        {"role": "system", "content": STORY_SYSTEM_PROMPT.strip()},
        {
            "role": "user",
            "content": _story_context_prompt(context, "Generate the next scene after the player action."),
        },
    ]


def _story_context_prompt(context: NarrativeContext, instruction: str) -> str:
    # 1. STATIC PREFIX — must be byte-identical across turns so Ollama's prefix KV
    #    cache survives. Only the player IDENTITY belongs here. World memories and
    #    causality shards accumulate every turn, so keeping them here silently broke
    #    the cache from turn ~1 onward (full re-prefill → later scenes 30s+); they
    #    now live in the dynamic block below. Volatile player fields (timestamps) are
    #    dropped so per-turn profile updates don't invalidate the prefix either.
    player_static = _stable_player_for_prompt(context.player)
    player_data = json.dumps(player_static, ensure_ascii=False, sort_keys=True)

    # 2. DYNAMIC — everything that changes turn to turn, kept below the cached prefix.
    world_memories = json.dumps([to_json_dict(m) for m in context.world_memories[-3:]], ensure_ascii=False, sort_keys=True)
    narrative_shards = json.dumps([to_json_dict(s) for s in context.narrative_shards[-4:]], ensure_ascii=False, sort_keys=True)
    memories = json.dumps([to_json_dict(m) for m in context.memories[-4:]], ensure_ascii=False, sort_keys=True)
    novelty_notes = "\n".join(context.novelty_notes[-MAX_PROMPT_NOTES:])
    # Continuity synopsis is rendered IN FULL (never truncated): it carries the
    # "story so far", the previous scene's prose, and the anti-repeat directives.
    synopsis = "\n".join(context.session_synopsis).strip()
    slimmed_loop = _slim_loop_for_prompt(context.loop)
    loop_data = json.dumps(slimmed_loop, ensure_ascii=False, sort_keys=True)
    recent_events = json.dumps([to_json_dict(e) for e in context.recent_events[-3:]], ensure_ascii=False, sort_keys=True)

    synopsis_block = f"{synopsis}\n\n" if synopsis else ""

    prompt = (
        "=== STATIC CONTEXT (CACHEABLE) ===\n"
        f"PLAYER:\n{player_data}\n\n"
        "=== DYNAMIC CURRENT TURN STATE (NON-CACHEABLE) ===\n"
        f"WORLD CAUSALITY MEMORIES:\n{world_memories}\n\n"
        f"NARRATIVE CAUSALITY SHARDS:\n{narrative_shards}\n\n"
        f"HISTORICAL MEMORIES:\n{memories}\n\n"
        f"DIRECTIVE NOTES:\n{novelty_notes}\n\n"
        f"{synopsis_block}"
        f"CURRENT LOOP STATE:\n{loop_data}\n\n"
        f"RECENT EVENTS:\n{recent_events}\n\n"
        f"TURN INDEX: {context.turn_index}\n"
        f"PLAYER ACTION: {context.player_action or 'None'}\n"
        f"INSTRUCTION: {instruction}\n"
        f"VALIDATOR FEEDBACK: {context.validator_feedback or 'None'}\n\n"
        "Output contract — return plain text matching the [SCENE], [TITLE], [LOCATION], and [CHOICES] sections."
    )
    return prompt


def _stable_player_for_prompt(player: Any) -> dict[str, Any]:
    """Player identity with volatile fields (timestamps) stripped, so the cacheable
    prefix stays byte-identical turn to turn."""
    data = to_json_dict(player)
    if isinstance(data, dict):
        for volatile in ("created_at", "updated_at"):
            data.pop(volatile, None)
    return data


PARSER_SYSTEM_PROMPT = """
You are the Structural Parser for Project MythOS.
Your job is to parse the provided raw narrative text (containing SCENE, TITLE, LOCATION, and CHOICES) and output a valid JSON object matching the JSON_CONTRACT schema.
Determine appropriate stability/tension adjustments, clues, and metadata based on the story.
Return only valid JSON. Do not wrap in markdown blocks.
""".strip()


def build_parser_messages(story_text: str, context: NarrativeContext) -> list[dict[str, str]]:
    contract = json.dumps(JSON_CONTRACT, ensure_ascii=False, indent=2)
    prompt = (
        "Return a single valid JSON object matching this contract schema. "
        f"Output fields in exactly this order (narration first):\n{contract}\n\n"
        f"Parse this story text:\n{story_text}"
    )
    return [
        {"role": "system", "content": PARSER_SYSTEM_PROMPT},
        {"role": "user", "content": prompt},
    ]
