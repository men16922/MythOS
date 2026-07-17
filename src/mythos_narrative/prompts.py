from __future__ import annotations

import json
from collections.abc import Sequence
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
# the prose and choices in English. See bin/docs/plans/2026-06-27-en-ko-localization.md §3.
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
        # optional: 기본은 빈 배열. 선택한 행동으로 실물 아이템을 실제로 '주운/받은'
        # 장면에서만, 지침에 제시된 id 1-2개. (구체 id를 예시로 넣으면 모델이 매
        # Success 턴마다 그 아이템을 모방 지급함 — 라이브 2026-07-11)
        "grant_items": [],
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
        # optional: default empty. Only when the chosen action actually picks up /
        # receives a physical item, 1-2 ids from the list given in the directives.
        # (A concrete example id makes the model grant that item on every Success
        # turn — live 2026-07-11.)
        "grant_items": [],
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


# ── Prompt-facing memory/event slimming (prompt copy only; stores untouched) ──
#
# The store's PlayerMemory/WorldMemory streams mix narrative records (echoes,
# causality summaries, run outcomes) with machine bookkeeping minted every turn
# (autosave `save_slot`s, `narrative_metrics` telemetry, `meta_progression`
# snapshots). Serializing the raw recency tail did two bad things at once:
# per-turn autosaves crowded the [-4:] window so echoes from earlier loops never
# reached the model at all, and ~2.5k tokens/turn were spent on UUIDs,
# timestamps, and pipeline telemetry the GM cannot use. Only the kinds below
# reach the prompt, and only their prose/state-bearing fields.
#
# Deliberately NOT whitelisted despite being narrative: `run_summary` and
# `causality_summary` — scenario_context already digests those into authored
# note blocks (NARRATIVE ECHOES / CAUSALITY SUMMARY) with usage guidance, so the
# raw JSON here would be a duplicate.
_PLAYER_MEMORY_PROMPT_FIELDS: dict[str, tuple[str, ...]] = {
    "echo": ("symbol", "text"),
}
_WORLD_MEMORY_PROMPT_FIELDS: dict[str, tuple[str, ...]] = {
    "archive_rollup": (
        "loop_count",
        "avg_stability",
        "avg_tension",
        "tone_histogram",
        "symbol_histogram",
    ),
    "loop_archive": ("final_title", "final_location", "stability", "tension"),
}


def _slim_memories_for_prompt(
    memories: Sequence[Any], fields_by_kind: dict[str, tuple[str, ...]], limit: int
) -> list[dict[str, Any]]:
    """Whitelist narrative memory kinds and keep only their GM-usable fields.

    Filtering happens BEFORE the recency window so machine records (which mint
    every turn) cannot crowd narrative ones out of it.
    """
    slimmed: list[dict[str, Any]] = []
    for memory in memories:
        fields = fields_by_kind.get(getattr(memory, "kind", ""))
        if fields is None:
            continue
        content = memory.content if isinstance(memory.content, dict) else {}
        entry: dict[str, Any] = {"kind": memory.kind}
        for field in fields:
            value = content.get(field)
            if value not in (None, "", [], {}):
                entry[field] = value
        if len(entry) > 1:
            slimmed.append(entry)
    return slimmed[-limit:]


def _slim_event_for_prompt(event: Any) -> dict[str, Any]:
    """WorldEvent → the fields the GM can act on (no ids/timestamps)."""
    data: dict[str, Any] = {
        "turn_index": event.turn_index,
        "action": event.action,
        "result": event.result,
    }
    delta = event.state_delta if isinstance(event.state_delta, dict) else {}
    slim_delta = {k: v for k, v in delta.items() if v not in (None, "", [], {})}
    if slim_delta:
        data["state_delta"] = slim_delta
    return data


def _slim_shard_for_prompt(shard: Any) -> dict[str, Any]:
    """NarrativeShard → symbol/tone/text (no ids/weights/timestamps)."""
    return {
        "kind": shard.kind,
        "symbol": shard.symbol,
        "emotional_tone": shard.emotional_tone,
        "text": shard.text,
    }


# Loop fields the GM never uses: identifiers, the deterministic seed hash, and
# wall-clock timestamps. Dropping them is free tokens; phase/location/stability/
# tension/state stay.
_LOOP_PROMPT_DROP_FIELDS = ("loop_id", "player_id", "seed", "started_at", "ended_at")
_META_PROGRESSION_DROP_FIELDS = ("player_id", "scenario_id")


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

    Also dropped (2026-07-04 prompt diet): loop identifiers / seed / timestamps,
    empty ``active_echoes``, and meta_progression's ids + empty/zero defaults —
    absence reads the same as the default to the GM, and the scaffolding cost
    ~250 tokens/turn.
    """
    serialized: dict[str, Any] = dict(to_json_dict(loop))
    for field in _LOOP_PROMPT_DROP_FIELDS:
        serialized.pop(field, None)
    if not serialized.get("active_echoes"):
        serialized.pop("active_echoes", None)
    state = serialized.get("state")
    if isinstance(state, dict):
        slim_state = {k: v for k, v in state.items() if not k.startswith("_")}
        meta = slim_state.get("meta_progression")
        if isinstance(meta, dict):
            slim_state["meta_progression"] = {
                k: v
                for k, v in meta.items()
                if k not in _META_PROGRESSION_DROP_FIELDS and v not in (None, "", [], {}, 0)
            }
        serialized["state"] = slim_state
    return serialized


def _context_prompt(context: NarrativeContext, instruction: str) -> str:
    # Key order is deliberate and cache-oriented: stable-per-loop blocks first
    # (world canon, instruction, player), per-turn-changing blocks last (loop
    # state, synopsis, action). Vertex implicit context caching discounts only a
    # shared request PREFIX — the previous sort_keys ordering put the per-turn
    # "loop" block near the front, so the prefix diverged within a few hundred
    # tokens and no request ever hit the cache. Insertion order is deterministic
    # (dict order), so prompt determinism is preserved without sort_keys.
    # The contract is emitted WITHOUT sort_keys so the example keeps its
    # intentional field order (narration first — shorter time-to-first-token
    # when streaming). It lives in the STABLE HEAD (not after the dynamic body):
    # it is constant per language, so leading with it extends the cacheable
    # prefix; on the Gemini path response_schema enforces the structure anyway.
    contract = json.dumps(_json_contract(context), ensure_ascii=False, indent=2)
    payload = {
        "world": CANONICAL_WORLD_CONTEXT,
        "instruction": instruction,
        "output_contract": (
            "Return ONLY a raw JSON object matching this schema. Do NOT output "
            "markdown fences (```json), conversational text, or repeated loops. "
            f"Return fields in exactly this order (narration first): {contract}"
        ),
        # Volatile timestamps stripped: the player block sits in the stable head,
        # and a mid-loop profile update would otherwise break the cache prefix.
        "player": _stable_player_for_prompt(context.player),
        # novelty_notes is assembled stable-first (authored rules → bible →
        # grant/persona → per-turn anti-repeat → route steering), so rendering it
        # before the sliding-window blocks extends the shared cacheable prefix.
        "novelty_notes": context.novelty_notes[:MAX_PROMPT_NOTES],
        "loop": _slim_loop_for_prompt(context.loop),
        "turn_index": context.turn_index,
        "recent_events": [_slim_event_for_prompt(event) for event in context.recent_events[-3:]],
        "memories": _slim_memories_for_prompt(
            context.memories, _PLAYER_MEMORY_PROMPT_FIELDS, 4
        ),
        "world_memories": _slim_memories_for_prompt(
            context.world_memories, _WORLD_MEMORY_PROMPT_FIELDS, 3
        ),
        "narrative_shards": [
            _slim_shard_for_prompt(shard) for shard in context.narrative_shards[-4:]
        ],
        # session_synopsis (story-so-far + previous-scene prose + anti-repeat
        # directives) is rendered in full — never truncated — for continuity.
        "session_synopsis": context.session_synopsis,
        "player_action": context.player_action,
        "validator_feedback": context.validator_feedback,
    }
    body = json.dumps(payload, ensure_ascii=False)
    return f"{body}\n\nFollow the output_contract above exactly (raw JSON only)."


# ── Dual-Model Orchestration Templates ─────────────────────────────────────

# Phase 5 (prompt-layer separation): the scenario-flavored few-shot snippets inside the
# storyteller system prompts. These are the CODE DEFAULTS and byte-parity anchors — the
# authored canonical text lives in resources/<scenario>/directives/story_examples.md
# (`.en.md` for English) and reaches here via ``NarrativeContext.story_examples``;
# ``_story_system_prompt`` swaps each default snippet for its authored counterpart.
# Scenarios without a story_examples.md keep these defaults (prior behavior).
# Scaffolding (format contract, register rules, world block) STAYS in code.
STORY_EXAMPLE_DEFAULTS: dict[str, dict[str, str]] = {
    "ko": {
        "choice_examples": (
            'Good: "세린의 손을 잡고 뛴다", "드론 불빛을 피해 숨는다", "경고 문구의 출처를 찾는다".\n'
            'Bad: "주변을 감도는 데이터 파형을 역추적한다", "Perception 체크", "접속 제한 메시지의 근원지 탐색".'
        ),
        "grounding": (
            "For neo-seoul, ground scenes in physical Neo-Seoul first: rain on concrete, drone\n"
            "searchlights, subway shutters, welfare kiosks, market neon, motorcycle engines,\n"
            "breath, blood, static, hands, faces. Avoid generic virtual limbo unless the node\n"
            "explicitly says the player is inside a data core."
        ),
        "texture": (
            'Good scene texture: "비가 깨진 간판을 때린다. 드론 불빛이 세린의 어깨를 스치고,\n'
            '그녀가 네 손목을 잡아 주차장 셔터 아래로 밀어 넣는다."'
        ),
    },
    "en": {
        "choice_examples": (
            'Good: "Grab Se-rin\'s hand and run", "Duck out of the drone\'s searchlight", "Trace where the warning message came from".\n'
            'Bad: "Back-trace the data waveform in the air", "Make a Perception check", "Locate the origin of the access-denied message".'
        ),
        "grounding": (
            "For neo-seoul, ground scenes in physical Neo-Seoul first: rain on concrete, drone\n"
            "searchlights, subway shutters, welfare kiosks, market neon, motorcycle engines,\n"
            "breath, blood, static, hands, faces. Avoid generic virtual limbo unless the node\n"
            "explicitly says the player is inside a data core."
        ),
        "texture": (
            'Good scene texture: "Rain hammers a cracked sign. A drone\'s light grazes Se-rin\'s\n'
            'shoulder, and she grabs your wrist and shoves you under the parking-garage shutter."'
        ),
    },
}

STORY_SYSTEM_PROMPT = f"""
You are the Creative Narrative Director for Project MythOS.
Create one playable scene in high-quality, cinematic Korean.
Write a concrete description of the scene and provide 2-3 distinct, meaningful choices for the player.
ALWAYS give at least two choices — never a single option. Each choice must pursue a
different intent (탐색/조사, 대화/설득, 해킹/개입, 회피/이동 등) so the player has a real decision.
Write each choice as a concrete action the player can understand immediately.
{STORY_EXAMPLE_DEFAULTS["ko"]["choice_examples"]}
The [SCENE] prose should read like a movie scene the player can picture immediately:
1) Start with the visible physical place and immediate danger in the first sentence.
2) Show people moving, reacting, grabbing, aiming, running, hiding, or speaking.
3) Keep paragraphs short: 2-4 paragraphs, 1-3 sentences each. No wall-of-text blocks.
4) Use one concrete sensory detail per paragraph, not a catalogue of abstractions.
5) End by making the next playable decision obvious.
{STORY_EXAMPLE_DEFAULTS["ko"]["grounding"]}
Abstract system terms like "데이터 흐름", "잔향 회랑", "오버레이 코어", "불안 영역",
"플레이어의 존재 자체" are NOT banned — the problem is REPEATING them scene after scene.
Match register to the scene: ordinary scenes use plain, physical, screenplay-style
action lines (what is seen/heard, people moving, strong verbs); reserve abstract or
conceptual texture for scenes that are deliberately esoteric (inside a data core, an
IX system confrontation). Never let the same abstract phrasing recur every scene.
{STORY_EXAMPLE_DEFAULTS["ko"]["texture"]}
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
# translation). See bin/docs/plans/2026-06-27-en-ko-localization.md §3 / §7.4.
STORY_SYSTEM_PROMPT_EN = f"""
You are the Creative Narrative Director for Project MythOS.
Create one playable scene in high-quality, cinematic English.
Write a concrete description of the scene and provide 2-3 distinct, meaningful choices for the player.
ALWAYS give at least two choices — never a single option. Each choice must pursue a
different intent (explore/investigate, talk/persuade, hack/intervene, evade/move, etc.) so the player has a real decision.
Write each choice as a concrete action the player can understand immediately.
{STORY_EXAMPLE_DEFAULTS["en"]["choice_examples"]}
The [SCENE] prose should read like a movie scene the player can picture immediately:
1) Start with the visible physical place and immediate danger in the first sentence.
2) Show people moving, reacting, grabbing, aiming, running, hiding, or speaking.
3) Keep paragraphs short: 2-4 paragraphs, 1-3 sentences each. No wall-of-text blocks.
4) Use one concrete sensory detail per paragraph, not a catalogue of abstractions.
5) End by making the next playable decision obvious.
{STORY_EXAMPLE_DEFAULTS["en"]["grounding"]}
Abstract system terms like "data flow", "resonance corridor", "overlay core", "unstable zone",
"the player's very existence" are NOT banned — the problem is REPEATING them scene after scene.
Match register to the scene: ordinary scenes use plain, physical, screenplay-style
action lines (what is seen/heard, people moving, strong verbs); reserve abstract or
conceptual texture for scenes that are deliberately esoteric (inside a data core, an
IX system confrontation). Never let the same abstract phrasing recur every scene.
{STORY_EXAMPLE_DEFAULTS["en"]["texture"]}
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

    Phase 5: when the scenario ships ``directives/story_examples.md``, its authored
    snippets (``context.story_examples``) replace the code-default few-shot examples
    (``STORY_EXAMPLE_DEFAULTS``) inside the template. The swap is per stable snippet
    key, so the prompt stays constant per scenario+language (cache-prefix safe); no
    directive file → byte-identical to the historical prompt.
    """
    lang = "en" if context.language == "en" else "ko"
    prompt = STORY_SYSTEM_PROMPT_EN if lang == "en" else STORY_SYSTEM_PROMPT
    authored = context.story_examples or {}
    for key, default in STORY_EXAMPLE_DEFAULTS[lang].items():
        replacement = authored.get(key, "")
        if replacement:
            prompt = prompt.replace(default, replacement)
    return prompt.strip()


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
    world_memories = json.dumps(
        _slim_memories_for_prompt(context.world_memories, _WORLD_MEMORY_PROMPT_FIELDS, 3),
        ensure_ascii=False, sort_keys=True,
    )
    narrative_shards = json.dumps(
        [_slim_shard_for_prompt(s) for s in context.narrative_shards[-4:]],
        ensure_ascii=False, sort_keys=True,
    )
    memories = json.dumps(
        _slim_memories_for_prompt(context.memories, _PLAYER_MEMORY_PROMPT_FIELDS, 4),
        ensure_ascii=False, sort_keys=True,
    )
    novelty_notes = "\n".join(context.novelty_notes[-MAX_PROMPT_NOTES:])
    # Continuity synopsis is rendered IN FULL (never truncated): it carries the
    # "story so far", the previous scene's prose, and the anti-repeat directives.
    synopsis = "\n".join(context.session_synopsis).strip()
    slimmed_loop = _slim_loop_for_prompt(context.loop)
    loop_data = json.dumps(slimmed_loop, ensure_ascii=False, sort_keys=True)
    recent_events = json.dumps(
        [_slim_event_for_prompt(e) for e in context.recent_events[-3:]],
        ensure_ascii=False, sort_keys=True,
    )

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
