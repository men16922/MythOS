from __future__ import annotations

import json
from typing import Any

from mythos_core.models import to_json_dict

from .schemas import NarrativeContext

# Upper bound on authored GM directive notes included in a prompt. Notes are
# bounded, short instructions; an over-tight cap was dropping the opening
# continuity / onboarding directives off the end of the list.
# Upper bound on rendered GM notes. Sized ABOVE the real assembled count
# (~21-27/turn for neo-seoul: authored rules + bible + persona + anti-repeat +
# route steering) so nothing is silently dropped — at 8, the last-8 window cut
# the language/cinematic/naming/causality rules out of every normal turn
# (found 2026-07-04). Purely a runaway backstop now.
MAX_PROMPT_NOTES = 48

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


# English counterpart of DEFAULT_SYSTEM_PROMPT (legacy single-model path) selected
# by ``_system_prompt`` when ``context.language == "en"``. Mirrors the Korean intent —
# JSON-only, cinematic screenplay register, concrete neo-seoul imagery — but writes
# the prose and choices in English. See docs/plans/2026-06-27-en-ko-localization.md §3.
DEFAULT_SYSTEM_PROMPT_EN = """
You are the Narrative Director for Project MythOS. Return ONLY a single valid JSON object.
Do not wrap the JSON in markdown code fences (like ```json) or add any pre/post commentary.
Write high-quality, natural English prose. Avoid repeating the same words, phrases, or sentence openers across paragraphs.
Write scenes like a clear film sequence, not like abstract lore exposition: show the physical place, visible threat, character movement, and immediate objective first.
For neo-seoul, prefer concrete cyberpunk images (rain, alleys, drones, subway gates, market lights, wet concrete, sirens, hands, weapons, faces) over vague data-space metaphors.
Do not spend long paragraphs on "data flow", "resonance corridor", "overlay core", "unstable area", or "player existence" unless the current route node explicitly takes place inside a virtual core.
Return the scene object at the top-level key named "scene" and "world_delta" at its key.
Choices must be concrete player actions in plain English, short imperative phrases when possible.
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
        # optional: 선택한 행동으로 실물 아이템을 획득한 장면에서만, 지침에 제시된 id 1-2개
        "grant_items": ["drone_scrap"],
    },
    "end_condition": None,
}


# English counterpart of JSON_CONTRACT, selected by ``_json_contract`` when
# ``context.language == "en"``. Same shape and field order (narration first) — only
# the human-language hint strings differ so the parser model emits English field text
# instead of translating the already-English story back to Korean.
JSON_CONTRACT_EN = {
    "scene": {
        # narration stays the FIRST field (streaming surfaces scene text first).
        "narration": "Cinematic, sensory scene description written in natural English",
        "title": "Scene title in English",
        "location": "location id or readable location",
        "scene_type": "static|dynamic|climax",
        "objective": "The current concrete operational objective, in English",
        "action_result": "Success|Partial Success|Failure|null",
        "requested_next_phase": "explore|interact|rewrite|archive|null",
        "choices": [
            {
                "choice_id": "choice_1",
                "label": "Short, concrete player action in English",
                "intent": "explore|interact|rewrite|archive",
                "cost": {"stability": -5, "tension": 3},  # optional: stability/tension change
                "requires": {
                    "stability_min": 10,
                    "tension_max": 80,
                },  # optional: required min stability / max tension
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
                "text": "Description of the discovered clue fragment, in English",
                "tags": ["tag1", "tag2"],
            }
        ],
        # optional: only when the chosen action actually acquires a physical item,
        # 1-2 ids from the list given in the directives
        "grant_items": ["drone_scrap"],
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


# English counterpart of OPENING_FIRST_SCENE_INSTRUCTION (same staging rules, English).
OPENING_FIRST_SCENE_INSTRUCTION_EN = (
    "Generate the FIRST scene of this loop — the opening ESTABLISHING beat. "
    "This scene establishes the protagonist's immediate situation ALONE. "
    "In this first scene, do NOT introduce any other person, companion, rescuer, "
    "reaching hand, enemy, drone/searchlight, pursuit, or combat — unless the "
    "DIRECTIVE NOTES above explicitly instruct a named figure to appear in THIS first scene. "
    "Focus only on the lone protagonist's situation (the place, bodily sensation, immediate predicament). "
    "Important: the few-shot examples in the system prompt that introduce a specific companion "
    "(e.g. 'grab Se-rin's hand and run') or an enemy/drone do NOT apply to this opening "
    "establishing scene — those are for the NEXT scene. "
    "Location: use exactly the opening location the DIRECTIVE NOTES specify. Even if the CURRENT "
    "LOOP STATE location_id points to an underground / data layer / indoor space, ignore it and do "
    "not arbitrarily move the scene indoors, underground, into a parking garage, or an abstract space. "
    "The exact staging and direction of this opening must follow the DIRECTIVE NOTES above."
)


def _opening_first_scene_instruction(context: NarrativeContext) -> str:
    if context.language == "en":
        return OPENING_FIRST_SCENE_INSTRUCTION_EN
    return OPENING_FIRST_SCENE_INSTRUCTION


def _next_scene_instruction(_context: NarrativeContext) -> str:
    # Both languages use the same English meta-instruction — it is a builder directive,
    # not player-facing prose, and the model writes the scene in the language its system
    # prompt + contract dictate. Kept context-parameterized for symmetry with the opening
    # selector so a future language-specific directive has a seam.
    return "Generate the next scene after the player action."


def build_first_scene_messages(context: NarrativeContext) -> list[dict[str, str]]:
    return [
        {"role": "system", "content": _system_prompt(context)},
        {
            "role": "user",
            "content": _context_prompt(context, _opening_first_scene_instruction(context)),
        },
    ]


def build_next_scene_messages(context: NarrativeContext) -> list[dict[str, str]]:
    return [
        {"role": "system", "content": _system_prompt(context)},
        {
            "role": "user",
            "content": _context_prompt(context, _next_scene_instruction(context)),
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
                    f"Contract: {json.dumps(_json_contract(context), ensure_ascii=False)}",
                    f"Payload: {raw_payload}",
                ]
            ),
        },
    ]


def _json_contract(context: NarrativeContext) -> dict[str, Any]:
    """Language-selection seam for the output contract handed to the model.

    Returns the English contract (English field hints) when ``context.language == "en"``
    so the parser emits English scene text, else the Korean default.
    """
    return JSON_CONTRACT_EN if context.language == "en" else JSON_CONTRACT


def _system_prompt(context: NarrativeContext) -> str:
    # A scenario-authored system_prompt (B-layer content, localized in S2) wins when
    # present; otherwise fall back to the language-appropriate code default.
    authored = context.system_prompt.strip()
    if authored:
        return authored
    return DEFAULT_SYSTEM_PROMPT_EN if context.language == "en" else DEFAULT_SYSTEM_PROMPT


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
    # Key order is deliberate and cache-oriented: stable-per-loop blocks first
    # (world canon, instruction, player), per-turn-changing blocks last (loop
    # state, synopsis, action). Vertex implicit context caching discounts only a
    # shared request PREFIX — the previous sort_keys ordering put the per-turn
    # "loop" block near the front, so the prefix diverged within a few hundred
    # tokens and no request ever hit the cache. Insertion order is deterministic
    # (dict order), so prompt determinism is preserved without sort_keys.
    payload = {
        "world": CANONICAL_WORLD_CONTEXT,
        "instruction": instruction,
        "player": to_json_dict(context.player),
        # novelty_notes is assembled stable-first (authored rules → bible →
        # grant/persona → per-turn anti-repeat → route steering), so rendering it
        # before the sliding-window blocks extends the shared cacheable prefix.
        "novelty_notes": context.novelty_notes[:MAX_PROMPT_NOTES],
        "loop": _slim_loop_for_prompt(context.loop),
        "turn_index": context.turn_index,
        "recent_events": [to_json_dict(event) for event in context.recent_events[-3:]],
        "memories": [to_json_dict(memory) for memory in context.memories[-4:]],
        "world_memories": [to_json_dict(memory) for memory in context.world_memories[-3:]],
        "narrative_shards": [to_json_dict(shard) for shard in context.narrative_shards[-4:]],
        # session_synopsis (story-so-far + previous-scene prose + anti-repeat
        # directives) is rendered in full — never truncated — for continuity.
        "session_synopsis": context.session_synopsis,
        "player_action": context.player_action,
        "validator_feedback": context.validator_feedback,
    }
    body = json.dumps(payload, ensure_ascii=False)
    # The contract is emitted separately WITHOUT sort_keys so the example keeps
    # its intentional field order (narration first). sort_keys on the dynamic
    # payload is kept for prompt determinism; the contract is a constant. We also
    # tell the model to emit fields in this order so streaming surfaces the scene
    # narration before the choices array (shorter time-to-first-token).
    contract = json.dumps(_json_contract(context), ensure_ascii=False, indent=2)
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


# English counterpart of STORY_SYSTEM_PROMPT (dual-model storyteller), selected by
# ``_story_system_prompt`` when ``context.language == "en"``. Mirrors the Korean intent —
# cinematic, screenplay-register, concrete neo-seoul imagery, plain-text [SCENE]/[TITLE]/
# [LOCATION]/[CHOICES] format — but generates the scene natively in English (no back-
# translation). See docs/plans/2026-06-27-en-ko-localization.md §3 / §7.4.
STORY_SYSTEM_PROMPT_EN = f"""
You are the Creative Narrative Director for Project MythOS.
Create one playable scene in high-quality, cinematic English.
Write a concrete description of the scene and provide 2-3 distinct, meaningful choices for the player.
ALWAYS give at least two choices — never a single option. Each choice must pursue a
different intent (explore/investigate, talk/persuade, hack/intervene, evade/move, etc.) so the player has a real decision.
Write each choice as a concrete action the player can understand immediately.
Good: "Grab Se-rin's hand and run", "Duck out of the drone's searchlight", "Trace where the warning message came from".
Bad: "Back-trace the data waveform in the air", "Make a Perception check", "Locate the origin of the access-denied message".
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
Abstract system terms like "data flow", "resonance corridor", "overlay core", "unstable zone",
"the player's very existence" are NOT banned — the problem is REPEATING them scene after scene.
Match register to the scene: ordinary scenes use plain, physical, screenplay-style
action lines (what is seen/heard, people moving, strong verbs); reserve abstract or
conceptual texture for scenes that are deliberately esoteric (inside a data core, an
IX system confrontation). Never let the same abstract phrasing recur every scene.
Good scene texture: "Rain hammers a cracked sign. A drone's light grazes Se-rin's
shoulder, and she grabs your wrist and shoves you under the parking-garage shutter."
Do NOT output JSON. Write in plain text matching the format guidelines below.
Avoid repeating the same words, phrases, or sentence openers across paragraphs.

=== WORLD SYSTEM INFO ===
{CANONICAL_WORLD_CONTEXT}

=== OUTPUT FORMAT GUIDELINES ===
[SCENE]
(cinematic, sensory scene description in English)

[TITLE]
(the scene's English title)

[LOCATION]
(location id or readable name)

[CHOICES]
- choice_1: (short, concrete English action line, no jargon)
- choice_2: (short, concrete English action line, no jargon)
- choice_3: (optional — short English action line)
(At least 2, in exactly the format above. Each line must follow "- choice_N: description".)
"""


def _story_system_prompt(context: NarrativeContext) -> str:
    """Language-selection seam for the dual-model storyteller.

    Returns the English storyteller system prompt when ``context.language == "en"``,
    else the Korean default. Kept as a helper (rather than a hardcoded inline constant)
    so the dual-model path is context-aware — see localization plan §7.1.
    """
    if context.language == "en":
        return STORY_SYSTEM_PROMPT_EN.strip()
    return STORY_SYSTEM_PROMPT.strip()


def build_first_story_messages(context: NarrativeContext) -> list[dict[str, str]]:
    return [
        {"role": "system", "content": _story_system_prompt(context)},
        {
            "role": "user",
            "content": _story_context_prompt(context, _opening_first_scene_instruction(context)),
        },
    ]


def build_next_story_messages(context: NarrativeContext) -> list[dict[str, str]]:
    return [
        {"role": "system", "content": _story_system_prompt(context)},
        {
            "role": "user",
            "content": _story_context_prompt(context, _next_scene_instruction(context)),
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
    data: dict[str, Any] = to_json_dict(player)
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
    contract = json.dumps(_json_contract(context), ensure_ascii=False, indent=2)
    prompt = (
        "Return a single valid JSON object matching this contract schema. "
        f"Output fields in exactly this order (narration first):\n{contract}\n\n"
        f"Parse this story text:\n{story_text}"
    )
    return [
        {"role": "system", "content": PARSER_SYSTEM_PROMPT},
        {"role": "user", "content": prompt},
    ]
