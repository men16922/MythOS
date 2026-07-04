from __future__ import annotations

from collections.abc import Sequence
from typing import Any

from mythos_core import (
    LoopPhase,
    LoopState,
    NarrativeShard,
    PlayerMemory,
    PlayerProfile,
    WorldEvent,
    WorldMemory,
)
from mythos_narrative import NarrativeContext
from mythos_runtime.cutscenes import ACTIVE_CUTSCENE_KEY
from mythos_runtime.route_runtime import (
    DEFAULT_TURNS_PER_LAYER,
    junction_options,
    route_status,
)
from mythos_runtime.scenario import ScenarioConfig, load_scenario_i18n
from mythos_runtime.scenario_directives import (
    Encounters,
    ScenarioDirectives,
    StatVoiceProfile,
    StatVoices,
    fill_placeholders,
    load_scenario_directives,
)
from mythos_runtime.session_memory import build_session_synopsis
from mythos_runtime.story_bible import (
    load_story_bible,
    select_story_bible_entries,
    story_bible_notes,
)

# First turn on which route node/junction steering reaches the prompt. Turns 0-4
# are the fully scripted 5-beat opening prologue (opening.md), during which
# steering is suppressed; _route_director_notes must treat this turn as a "fresh
# node" too, because layer 1's natural fresh turn (turn 4 = layer boundary) falls
# inside the suppressed window — otherwise a layer-1 anchor's curated-image
# directive can never be emitted (pre-CBT bug#4).
ROUTE_STEERING_START_TURN = 5

LANGUAGE_RULE = (
    "CRITICAL LANGUAGE & CHOICE RULE (필수 한국어 및 선택지 생성 규칙):\n"
    "1. 모든 플레이어 대상 텍스트(scene.title, scene.narration, scene.objective, scene.action_result, choices의 각 label)는 "
    "반드시 자연스럽고 문학적인 한국어(Korean)로만 생성해야 합니다. 절대로 영어로 출력하지 마십시오.\n"
    "2. 단, scene.visual_brief는 이미지 생성 모델(FLUX) 전용이므로 반드시 영어(English)로 자세히 묘사되어야 합니다.\n"
    "3. choices[].intent는 반드시 정확히 'explore', 'interact', 'rewrite', 'archive' 중 하나여야 하며, 설명이나 한글, 기타 기호를 포함해서는 안 됩니다. (예: 'explore'만 출력)\n"
    "4. 선택지 관련 스탯(근력, 지능, 매력, 민첩, 관측)이 있다면, 선택지 label 끝에 '(민첩)', '(지능)', '(관측)' 등과 같이 매우 짧은 단어로만 괄호 안에 명시하십시오. '(민첩 기반 행동권 활용 추천)'과 같은 장황한 설명이나 추천글은 절대 작성하지 마십시오.\n"
    "5. 이 규칙은 절대적이며 최우선적으로 준수되어야 합니다."
)

LANGUAGE_RULE_EN = (
    "CRITICAL LANGUAGE & CHOICE RULE:\n"
    "1. All player-facing text (scene.title, scene.narration, scene.objective, scene.action_result, "
    "and each choices[].label) MUST be generated in natural, literary English only. Never output Korean.\n"
    "2. The single exception is scene.visual_brief, which is for the image model (FLUX) and MUST be a "
    "detailed English description.\n"
    "3. choices[].intent MUST be exactly one of 'explore', 'interact', 'rewrite', 'archive' — no "
    "explanation, no other words or symbols. (e.g. output just 'explore')\n"
    "4. If a choice keys off a stat (Strength, Intellect, Charisma, Agility, Observation), mark it with a "
    "very short parenthetical at the end of the label, e.g. '(Agility)', '(Intellect)', '(Observation)'. "
    "Never write a long explanation or recommendation like '(recommended: use an Agility-based action)'.\n"
    "5. This rule is absolute and takes top priority."
)

CINEMATIC_CLARITY_RULE = (
    "CINEMATIC CLARITY RULE (직관적 시네마틱 대본 규칙):\n"
    "- 장면은 영화 시나리오처럼 '보이는 장소 → 즉각적 위협 → 인물의 행동/대사 → 다음 선택' 순서로 쓰십시오.\n"
    "- 첫 문장에는 플레이어가 실제로 어디에 서 있는지와 당장 무엇이 위험한지 보여주십시오.\n"
    "- Neo-Seoul 장면은 비, 콘크리트, 골목, 드론 수색등, 지하철 셔터, 복지 키오스크, 야시장 네온, 바이크 엔진, 손목을 잡는 행동처럼 물리적이고 촬영 가능한 이미지로 묘사하십시오.\n"
    "- '데이터 흐름', '잔향 회랑', '오버레이 코어', '불안 영역', '플레이어의 존재 자체' 같은 추상 명사를 길게 나열하지 마십시오. 명시적으로 가상 코어 내부인 장면이 아니라면 이런 표현은 배경 은유 한 문장 이하로 제한하십시오.\n"
    "- 한 문단은 1~3문장으로 짧게 유지하고, 긴 설명문 대신 카메라가 볼 수 있는 행동을 쓰십시오."
)

CINEMATIC_CLARITY_RULE_EN = (
    "CINEMATIC CLARITY RULE:\n"
    "- Write each scene like a film script: visible place → immediate threat → character action/dialogue → next choice.\n"
    "- In the first sentence, show where the player actually stands and what is dangerous right now.\n"
    "- Ground Neo-Seoul scenes in physical, filmable images: rain, concrete, alleys, drone searchlights, "
    "subway shutters, welfare kiosks, night-market neon, motorbike engines, a hand grabbing a wrist.\n"
    "- Do not pile up abstract nouns like 'data flow', 'resonance corridor', 'overlay core', 'unstable zone', "
    "'the player's very existence'. Unless the scene is explicitly inside a virtual core, keep such phrasing "
    "to at most one sentence of background metaphor.\n"
    "- Keep each paragraph to 1-3 short sentences; write what the camera can see, not long exposition."
)


def _language_rule(language: str) -> str:
    return LANGUAGE_RULE_EN if language == "en" else LANGUAGE_RULE


def _cinematic_clarity_rule(language: str) -> str:
    return CINEMATIC_CLARITY_RULE_EN if language == "en" else CINEMATIC_CLARITY_RULE

CAUSALITY_ENGINE_RULE = (
    "CAUSALITY_ENGINE_RULE: The world is a complex gear-system. "
    "1. MAIN ARC: Follow the main story progression but don't rush. "
    "2. SIDE ARCS: Trigger side events if the player is in the right place or has right stats. "
    "3. NPC AGENDAS: NPCs move and act independently based on their goals. "
    "4. BUTTERFLY EFFECTS: Every player choice must be seeded for future consequences. "
    "5. MULTI-ENDINGS: Guide the story toward an ending based on "
    "Humanity/Dominance/Resilience/Insight."
)

# Byte-parity anchor for the prompt-layer extraction: the authored canonical text now
# lives in resources/neo-seoul/directives/naming.md and is injected generically via
# directives.naming_rule (no scenario_id branch). Retained so the extraction stays
# provably lossless — tested in FallbackDirectiveParityTest's naming sibling.
NEO_SEOUL_NAMING_RULE = (
    "NEO-SEOUL NAMING RULE (고유명사 표기 고정):\n"
    "- 정식 표기는 반드시 '정세린' 또는 축약 '세린'만 사용하십시오.\n"
    "- '세리느', '세린느', 'Serine', 'Seline' 등 다른 표기는 절대 사용하지 마십시오.\n"
    "- 세린은 플레이어에게 존댓말을 쓰지 않습니다. 대사는 짧은 반말/명령형으로 쓰고, "
    "'요', '습니다', '세요', '하시겠습니까' 같은 높임말 어미를 세린의 대사에 사용하지 마십시오.\n"
    "- Lin Yue는 한국어 본문에서 '린위에', Kai RX-09는 '카이 RX-09', Administrator IX는 '관리자 IX'로 표기하십시오.\n"
    "- 이름 예약(재사용 금지): '세린', '카이', '린위에', '한', '수아', '태오', 'IX'는 그 인물 "
    "**본인이 실제로 등장할 때만** 사용하십시오. 꿈·환영·회상 속 인물, 새로 등장하는 시민/NPC, "
    "아이·가족 등 무관한 인물에게 이 이름들을 절대 붙이지 마십시오(예: 카이의 꿈 속 아이는 동료 "
    "'수아'와 무관 — 다른 이름을 지어내거나 무명으로 두십시오). 캐릭터 패널이 이름으로 인물을 "
    "식별하므로 이름 차용은 정본 오염을 일으킵니다."
)

# Generic code default for the stat-voice (Disco-Elysium inner-monologue) directive.
# The authored canonical text now lives in resources/neo-seoul/directives/stat_voices.md
# and overrides this when present; scenarios that ship no stat_voices.md fall back to
# this default, preserving the prior behavior where this prose was shared by every
# scenario (glass-library included). Doubles as the byte-parity anchor — the parity
# test asserts the loaded directives reproduce it (StatVoiceDirectiveParityTest).
DEFAULT_STAT_VOICES = StatVoices(
    header="=== 스탯 기반 내면 독백 지침 (DISCO ELYSIUM STYLE INNER MONOLOGUE) ===",
    max_template=(
        "플레이어의 가장 뛰어난 특성은 {name} (수치: {value})입니다. "
        "장면 묘사나 내러티브 전개 중에 종종 플레이어의 머릿속 혹은 내면에서 들려오는 독백(Inner Monologue)이나 내적 대화 형태로 "
        "다음 목소리를 자연스럽게 주입하십시오. 특히 이 목소리는 스탯 고유의 어조와 어투 규칙(예시의 스타일)을 철저히 따라야 하며, 다른 스탯과 어투가 뚜렷이 구별되어야 합니다: \n"
        " - {name}: {voice}\n"
        "이 목소리는 괄호 표기법을 사용하여 표현해야 합니다. 예: (근력: ...) 또는 (지능: ...)"
    ),
    min_template=(
        "플레이어의 가장 취약한 특성은 {name} (수치: {value})입니다. "
        "이 특성에 대응하는 내면의 목소리는 미숙함, 억지, 잘못된 오판을 하거나 소심함, 혹은 결핍으로 인해 무기력한 충고를 던지는 형태로 괄호 표기법을 통해 아주 가끔 등장시켜 주십시오. "
        "예: ({name_first}: ...)"
    ),
    descriptions={
        "strength": StatVoiceProfile(
            name="근력 (Strength)",
            voice='본능적이고 거칠며 물리적 파괴와 신체적 생존을 자극하는 육체의 목소리. 투박한 반말과 거친 어조를 사용하며 물리적 충돌과 정면 돌파를 부추깁니다. 예시: "주먹으로 저 빌어먹을 보안 패널을 들이받아 부숴버려! 쇠붙이는 부서지게 되어 있다."',
        ),
        "intelligence": StatVoiceProfile(
            name="지능 (Intelligence)",
            voice='냉정하고 분석적이며 논리와 데이터, 시스템 최적화를 추구하는 연산의 목소리. 철저히 논리적이고 건조한 기계식 종결어미(~다, ~하십시오)를 사용하며 분석적 조언을 제공합니다. 예시: "대상 보안 시스템의 오동작 주기는 4.2초입니다. 우회로 진입 시 발각 확률은 12% 미만으로 최적화됩니다."',
        ),
        "charisma": StatVoiceProfile(
            name="매력 (Charisma)",
            voice='감정적이고 사교적이며 사람들의 심리와 가면 뒤의 진실을 읽는 감응의 목소리. 친근하고 부드럽거나 장난기 섞인 구어체 말투(~잖아, ~지 않아?, ~보렴)를 사용하며 타인의 감정에 공감하고 유도하는 조언을 합니다. 예시: "저 여자의 눈망울이 불안하게 흔들리고 있잖아. 차갑게 밀쳐내기보단 빗속에서 따스한 시선을 건네보는 게 어때? 마음을 열어줄 거야."',
        ),
        "agility": StatVoiceProfile(
            name="민첩 (Agility)",
            voice='기민하고 신경질적이며 회피와 탈출, 위험 감지를 부추기는 반사의 목소리. 호흡이 짧고 급하며 다급한 명령형(~해, ~뛰어, ~서둘러!)과 느낌표를 다용하여 당장 움직이도록 다그칩니다. 예시: "망설이면 끝이다! 몸이 먼저 반응하는 대로 당장 움직여, 셋 둘 하나, 지금 뛰어!"',
        ),
        "perception": StatVoiceProfile(
            name="관측 (Perception)",
            voice='예리하고 미세한 흔적과 보이지 않는 신호, 감춰진 디테일을 포착하는 감각의 목소리. 묘사적이고 세밀하며 객관적인 어조(~다, ~을 포착함)를 사용하며 주변의 숨겨진 디테일과 이질감을 짚어냅니다. 예시: "벽면 네온 간판의 미세한 스파크 소리가 규칙적이지 않다. 간판 뒤에 불법 도청 모듈이 숨겨져 있음을 시사한다."',
        ),
    },
)

# Generic code default for the travel/emergency encounter directives. The authored
# canonical text now lives in resources/neo-seoul/directives/encounters.md and overrides
# this when present; scenarios that ship no encounters.md fall back to this default,
# preserving the prior behavior where this prose fired unconditionally for every
# scenario. Doubles as the byte-parity anchor — the parity test asserts the loaded
# directives reproduce it (EncounterDirectiveParityTest). The travel-keyword detection
# and the stability/tension thresholds stay in build_runtime_narrative_context.
DEFAULT_ENCOUNTERS = Encounters(
    travel_header="=== TRAVEL ENCOUNTER (이동 중 조우 이벤트) ===",
    travel_template=(
        "지침: 플레이어가 구역을 이동하거나 여행(Travel)하는 액션('{player_action}')을 선언했습니다. "
        "현재 시공간 붕괴도({decay_pct}%) 및 은신 안정도({stability}/100), 관리망 추적도({tension}/100)를 고려하여, "
        "이동 도중에 돌발적으로 마주하는 글리치 이상 현상, 경비 순찰대 조우, 또는 주변 환경 붕괴 등의 중간 조우(Travel Interception) 이벤트를 묘사하고, "
        "이를 돌파하거나 회피하기 위한 선택지(예: 연산 해킹으로 경보 우회, 은밀히 우회로 찾기 등)를 1개 이상 생성하십시오."
    ),
    emergency_header="=== EMERGENCY ENCOUNTERS (리소스 임계점 위기 상황) ===",
    emergency_low_stability_template=(
        "경고: 현재 [은신 안정도]가 매우 위험한 수준(현재: {stability}/100)입니다. "
        "연결 붕괴 직전의 글리치 물리 현상, 시공간 왜곡, 또는 강제 접속 차단 전파가 엄습해 오는 위기 상황(Emergency)을 서사하고, "
        "플레이어에게 안정성을 회복하기 위한 대가가 큰 응급 선택지를 강제하십시오."
    ),
    emergency_high_tension_template=(
        "경고: 현재 [관리망 추적도]가 극히 높은 수준(현재: {tension}/100)입니다. "
        "관리망 집행부대(Enforcers)의 직접적인 추적선 포위, 드론 추격, 혹은 Administrator IX의 직접 정정 통고 등 포위망이 좁혀오는 상황을 서사하십시오. "
        "다음에 오는 선택지는 회피하거나 돌파하기 위해 무거운 대가(stats 판정 또는 stability 소모)를 요구해야 합니다."
    ),
)

# English counterparts of the generic code defaults, selected when ``language == "en"``
# (mirror the directives/*.en.md prose). Used by directive-less scenarios (e.g.
# glass-library) so their EN prompt has no Korean default prose; neo-seoul ships
# directive .md files that override these for both languages.
DEFAULT_STAT_VOICES_EN = StatVoices(
    header="=== STAT-BASED INNER MONOLOGUE (DISCO ELYSIUM STYLE) ===",
    max_template=(
        "The player's strongest trait is {name} (value: {value}). During scene description or "
        "narrative development, often weave in the following voice naturally as an Inner Monologue "
        "or inner dialogue heard inside the player's head. This voice must strictly follow the "
        "stat's own tone and speech rules (the style of the example) and must be clearly distinct "
        "in voice from the other stats: \n"
        " - {name}: {voice}\n"
        "Express this voice using parenthetical notation. e.g. (Strength: ...) or (Intellect: ...)"
    ),
    min_template=(
        "The player's weakest trait is {name} (value: {value}). Let the inner voice corresponding "
        "to this trait appear only very occasionally, through parenthetical notation, as immature, "
        "forced, misjudged, timid, or as listless advice born of deficiency. e.g. ({name_first}: ...)"
    ),
    descriptions={
        "strength": StatVoiceProfile(
            name="Strength",
            voice='An instinctive, rough, physical voice that craves destruction and bodily survival. It speaks in blunt, coarse imperatives and goads toward physical confrontation and forcing a way through. Example: "Drive your fist through that damned security panel and break it! Metal is made to be broken."',
        ),
        "intelligence": StatVoiceProfile(
            name="Intellect",
            voice='A cold, analytical voice of computation that pursues logic, data, and system optimization. It is rigorously logical and dry. It gives analytical advice. Example: "The target security system\'s malfunction cycle is 4.2 seconds. Entering through the bypass optimizes the detection probability to under 12%."',
        ),
        "charisma": StatVoiceProfile(
            name="Charisma",
            voice='An emotional, sociable voice of empathy that reads people\'s psychology and the truth behind their masks. It speaks warmly, gently, or with a playful, colloquial lilt, empathizing with and steering others\' feelings. Example: "Her eyes are wavering, anxious. Instead of coldly shoving her away, why not offer a warm look in the rain? It\'ll open her up."',
        ),
        "agility": StatVoiceProfile(
            name="Agility",
            voice='A quick, jittery voice of reflex that urges evasion, escape, and threat detection. Its breath is short and hurried; it leans on urgent imperatives and exclamation marks to push you to move right now. Example: "Hesitate and it\'s over! Move the instant your body reacts — three, two, one, run now!"',
        ),
        "perception": StatVoiceProfile(
            name="Observation",
            voice='A sharp voice of the senses that catches faint traces, unseen signals, and hidden details. It is descriptive, fine-grained, and objective, pointing out the surroundings\' concealed details and what feels off. Example: "The faint spark from the neon sign on the wall isn\'t regular. It suggests an illegal eavesdropping module hidden behind the sign."',
        ),
    },
)

DEFAULT_ENCOUNTERS_EN = Encounters(
    travel_header="=== TRAVEL ENCOUNTER (mid-travel encounter event) ===",
    travel_template=(
        "Directive: the player has declared an action to move between zones or travel ('{player_action}'). "
        "Taking into account the current spacetime collapse ({decay_pct}%), stealth stability "
        "({stability}/100), and control-grid pursuit ({tension}/100), describe a mid-travel "
        "interception event encountered en route — a glitch anomaly, a guard-patrol encounter, or "
        "surrounding environmental collapse — and generate at least one choice for breaking through "
        "or evading it (e.g. bypassing the alarm with a computation hack, quietly finding a detour)."
    ),
    emergency_header="=== EMERGENCY ENCOUNTERS (resource-threshold crisis) ===",
    emergency_low_stability_template=(
        "Warning: the [stealth stability] is now at a very dangerous level (currently: {stability}/100). "
        "Narrate an Emergency in which a glitch physics phenomenon on the verge of connection collapse, "
        "a spacetime distortion, or a forced-disconnect broadcast bears down, and force on the player "
        "an emergency choice with a heavy cost to recover stability."
    ),
    emergency_high_tension_template=(
        "Warning: the [control-grid pursuit] is now extremely high (currently: {tension}/100). Narrate "
        "the cordon tightening — the control grid's Enforcers directly closing their pursuit line, a "
        "drone chase, or a direct correction notice from Administrator IX. The choice that follows must "
        "demand a heavy cost (a stats check or stability expenditure) to evade or break through."
    ),
)


def _default_stat_voices(language: str) -> StatVoices:
    return DEFAULT_STAT_VOICES_EN if language == "en" else DEFAULT_STAT_VOICES


def _default_encounters(language: str) -> Encounters:
    return DEFAULT_ENCOUNTERS_EN if language == "en" else DEFAULT_ENCOUNTERS


def resolve_archetype_id(scenario: ScenarioConfig, value: str | None) -> str | None:
    """Map an archetype identifier or (legacy/localized) display name to its stable id.

    Returns the value unchanged if it already matches an archetype ``id``; otherwise
    the id of the archetype whose ``name`` equals ``value`` (back-compat for saves /
    clients that still carry a display name); otherwise the value unchanged.
    """
    if not value:
        return None
    for archetype in scenario.archetypes:
        if archetype.get("id") == value:
            return value
    for archetype in scenario.archetypes:
        if archetype.get("name") == value:
            archetype_id = archetype.get("id")
            return str(archetype_id) if archetype_id else value
    return value


def apply_archetype_traits(
    traits: dict[str, Any],
    scenario: ScenarioConfig,
) -> dict[str, Any]:
    """Return traits enriched from the scenario archetype table.

    Accepts either a stable archetype ``id`` or a (legacy/localized) display name in
    ``traits['archetype']``. Stores the language-independent id in ``archetype_id``
    (drives combat/progression joins) while canonicalizing ``archetype`` to the
    display name (used by the ``{archetype}`` narrative placeholder and UI).
    """
    archetype_key = traits.get("archetype")
    if not archetype_key:
        return dict(traits)

    enriched = dict(traits)
    for archetype in scenario.archetypes:
        if archetype.get("id") != archetype_key and archetype.get("name") != archetype_key:
            continue
        enriched["stats"] = archetype.get("stats", {})
        enriched["attributes"] = archetype.get("attributes", [])
        archetype_id = archetype.get("id")
        if archetype_id:
            enriched["archetype_id"] = str(archetype_id)
        archetype_name = archetype.get("name")
        if archetype_name:
            enriched["archetype"] = str(archetype_name)
        enriched.setdefault("autonomy_level", 1)
        enriched.setdefault("unlocked_traits", [])
        break
    return enriched


_COMBAT_RESULT_VERB = {
    "player_victory": "교전을 뚫고 적을 물리쳤다",
    "player_fled": "교전을 가까스로 따돌리고 빠져나왔다",
    "player_defeat": "교전에서 밀려 쫓기는 처지가 됐다",
}


def _attributes_note(player: PlayerProfile, language: str) -> str:
    """Persona directive from the archetype's attribute tags (flavor channel).

    The tags carry no numbers; they exist so the GM narrates this player's
    approach distinctly (a Ghost slips sensor nets; a Data Smuggler talks in
    ledger terms). Empty when the player has none."""
    traits = player.traits if isinstance(player.traits, dict) else {}
    attributes = traits.get("attributes")
    if not isinstance(attributes, list) or not attributes:
        return ""
    joined = ", ".join(str(a) for a in attributes if a)
    if not joined:
        return ""
    if language == "en":
        return (
            f"Player attributes (persona, no mechanical effect): {joined}. Let these traits "
            "color how the player's actions, senses, and approaches are narrated — e.g. how "
            "they move, what they notice first, how NPCs read them. Never show them as stats."
        )
    return (
        f"플레이어 특성(페르소나 연출 지침 · 수치 효과 없음): {joined}. 이 특성이 행동 묘사·"
        "감각·접근 방식에 자연스럽게 배어나게 하십시오 — 움직이는 방식, 먼저 알아차리는 것, "
        "NPC가 플레이어를 읽는 인상 등. 수치처럼 언급하지 마십시오."
    )


def _grant_items_note(scenario: ScenarioConfig, language: str) -> str:
    """One-line GM affordance: grantable item ids for ``world_delta.grant_items``.

    Only carriable kinds (consumable/material) are offered — the commit-side
    whitelist (`session._filter_grant_items`) enforces the same rule, this note
    just makes the channel discoverable so pickup-flavored choices have teeth."""
    items = scenario.combat.get("items", {}) if isinstance(scenario.combat, dict) else {}
    grantable = [
        f"{item_id}({definition.get('name', item_id)})"
        for item_id, definition in items.items()
        if isinstance(definition, dict) and definition.get("kind") in ("consumable", "material")
    ]
    if not grantable:
        return ""
    joined = ", ".join(grantable)
    if language == "en":
        return (
            "Item pickups (optional): when the player's CHOSEN action plausibly puts a physical "
            "item in their hands (e.g. salvaging downed-drone wreckage → drone_scrap), add 1-2 ids "
            f"from this list to world_delta.grant_items and narrate the pickup: {joined}. "
            "Never invent other ids; don't hand out items every scene — only when earned."
        )
    return (
        "아이템 획득(선택적): 플레이어가 고른 행동이 실제로 물건을 손에 넣는 장면이라면(예: 격파된 드론 "
        f"잔해 수습 → drone_scrap) world_delta.grant_items 배열에 아래 목록의 id를 1-2개 넣고 획득을 서술하십시오: {joined}. "
        "목록 밖 id는 금지, 매 장면 남발 금지 — 행동으로 얻어낸 경우에만."
    )


def _combat_callback_note(
    scenario: ScenarioConfig, loop: LoopState, turn_index: int
) -> str:
    """Post-combat narrative bridge (#5).

    Returns a full-render directive only on the scene immediately following a
    fight (``_last_combat_turn == turn_index - 1``), telling the GM to open with
    the combat's aftermath so the tactical board doesn't read as a disconnected
    minigame. Empty string otherwise.
    """
    state = loop.state if isinstance(loop.state, dict) else {}
    last = state.get("_last_combat_turn")
    if not isinstance(last, int) or last != turn_index - 1:
        return ""
    outcome = str(state.get("_last_combat_result") or "")
    enc_id = str(state.get("_last_combat_encounter") or "")
    enc_name = enc_id
    reward_intent = ""
    encounters = (
        scenario.combat.get("encounters", {}) if isinstance(scenario.combat, dict) else {}
    )
    enc = encounters.get(enc_id) if isinstance(encounters, dict) else None
    if isinstance(enc, dict):
        enc_name = str(enc.get("name") or enc_id)
        reward_intent = str(enc.get("reward_intent") or "")
    verb = _COMBAT_RESULT_VERB.get(outcome, "방금 교전을 치렀다")
    note = (
        "=== 직전 전투 콜백 (전투→서사 연결 · 이번 장면 첫 1~2문장에 반드시 반영) ===\n"
        "바로 앞 장면은 전투였다"
        + (f"('{enc_name}')" if enc_name else "")
        + f". 플레이어는 {verb}. 이번 장면은 그 '직후'로 시작하라 — 숨이 가쁘거나, 부상·장비 손상, "
        "관리망 heat 상승, 동료(예: 세린)의 반응 같은 전투의 여파를 첫 1~2문장에서 한 번 이상 구체적으로 "
        "참조해, 전투가 따로 노는 미니게임이 아니라 이야기의 결과로 이어지게 하라."
    )
    if reward_intent:
        note += f" 이 전투의 의미(서사로 녹일 것, 수치 노출 금지): {reward_intent}"
    return note


def build_runtime_narrative_context(
    *,
    player: PlayerProfile,
    loop: LoopState,
    scenario: ScenarioConfig,
    turn_index: int,
    recent_events: Sequence[WorldEvent],
    memories: Sequence[PlayerMemory],
    world_memories: Sequence[WorldMemory],
    narrative_shards: Sequence[NarrativeShard],
    novelty_notes: Sequence[str],
    player_action: str | None = None,
    fast_mode: bool = False,
    language: str = "ko",
) -> NarrativeContext:
    directives = load_scenario_directives(scenario.scenario_id, language)
    # Additive EN prose overlay (i18n/<lang>.json); {} for ko / no overlay → KO source used.
    scenario_i18n = load_scenario_i18n(scenario.scenario_id, language)
    brief = str(scenario_i18n.get("brief") or scenario.brief)
    notes = [
        f"SCENARIO_BRIEF: {brief}",
        *novelty_notes,
        _language_rule(language),
        _cinematic_clarity_rule(language),
    ]
    # Proper-noun / register rule is now prompt-layer (directives/naming.md), injected
    # generically — any scenario that authors one gets it; the rest get none, exactly as
    # before (only neo-seoul shipped a naming rule).
    if directives.naming_rule:
        notes.append(directives.naming_rule)
    notes.extend(_scenario_structure_notes(scenario, scenario_i18n))
    notes.append(CAUSALITY_ENGINE_RULE)

    # P4-1 스탯 기반 내면 독백 (Disco Elysium) 지침 — prose는 이제 프롬프트 레이어
    # (directives/stat_voices.md)다. min/max 선택 로직만 코드에 남고, 시나리오가 stat_voices.md를
    # 두지 않으면 generic 기본값(DEFAULT_STAT_VOICES)을 받는다(이전 공유 동작 보존).
    stat_voices = directives.stat_voices or _default_stat_voices(language)
    stats = player.traits.get("stats") if isinstance(player.traits, dict) else None
    if isinstance(stats, dict):
        descriptions = stat_voices.descriptions
        valid_stats = {
            k: int(v)
            for k, v in stats.items()
            if k in descriptions and (isinstance(v, int) or str(v).isdigit())
        }
        if valid_stats:
            sorted_stats = sorted(valid_stats.items(), key=lambda x: x[1])
            min_stat_name, min_stat_val = sorted_stats[0]
            max_stat_name, max_stat_val = sorted_stats[-1]

            max_desc = descriptions[max_stat_name]
            notes.append(stat_voices.header)
            notes.append(
                fill_placeholders(
                    stat_voices.max_template,
                    {"name": max_desc.name, "value": max_stat_val, "voice": max_desc.voice},
                )
            )

            if min_stat_name != max_stat_name:
                min_desc = descriptions[min_stat_name]
                notes.append(
                    fill_placeholders(
                        stat_voices.min_template,
                        {
                            "name": min_desc.name,
                            "value": min_stat_val,
                            "name_first": min_desc.name.split()[0],
                        },
                    )
                )

    opening_directives: list[str] = []
    # The scripted prologue (turns 0..max_turn) is now authored in the PROMPT LAYER —
    # resources/<scenario>/directives/opening.md (loaded via load_scenario_directives).
    # Only the assembly LOGIC stays here: gating, cinematic-shot resolution, the
    # placeholder fill, and the routing into the full-render session_synopsis channel.
    #
    # The opening must fire by TURN, not phase: the storyteller can advance the loop
    # past EXPLORE mid-opening, which previously dropped the directives at turns 3-4
    # and let the GM revert to the data-layer starting location. For a scenario that
    # authors an opening, run it for turns 0..max regardless of phase; the existing
    # CONNECT/EXPLORE clauses keep prior behavior for scenarios without one.
    _has_authored_opening = bool(directives.opening_beats)
    _max_turn = directives.opening_max_turn
    if (
        loop.phase is LoopPhase.CONNECT
        or (loop.phase is LoopPhase.EXPLORE and turn_index <= _max_turn)
        or (_has_authored_opening and turn_index <= _max_turn)
    ):
        archetype = player.traits.get("archetype", "Unclassified")
        # Replay the opening cinematic (session_intro) so the first playable scenes
        # continue from it. This belongs to the authored opening, so it only runs for
        # scenarios that declare one (a scenario without opening.md must not receive
        # the neo-seoul continuity guidance).
        if _has_authored_opening:
            opening_directives.extend(
                _opening_continuity_notes(scenario, turn_index, language, scenario_i18n)
            )
        # The pre-rendered cinematic shots (teaser) are the authored source for the
        # Se-rin beats; each beat references one by index (shot_ref) so the teaser's
        # promise is paid off as lived experience. Resolve the shot, fill the authored
        # beat body's placeholders, and emit it.
        # Prefer the localized cinematic shots (i18n overlay) so the opening beat's
        # {shot_title}/{shot_body} fills are in the active language; fall back to the
        # scenario's own (Korean) shots.
        _intro = scenario.ui_copy.get("session_intro") if isinstance(scenario.ui_copy, dict) else None
        _overlay_intro = scenario_i18n.get("session_intro")
        _overlay_shots = (
            _overlay_intro.get("cinematic_shots") if isinstance(_overlay_intro, dict) else None
        )
        _shots = _overlay_shots if isinstance(_overlay_shots, list) else (
            _intro.get("cinematic_shots") if isinstance(_intro, dict) else None
        )
        _shots = _shots if isinstance(_shots, list) else []

        def _shot_text(idx: int) -> tuple[str, str]:
            shot = _shots[idx] if 0 <= idx < len(_shots) and isinstance(_shots[idx], dict) else {}
            return str(shot.get("title") or "").strip(), str(shot.get("body") or "").strip()

        beat = directives.opening_beat(turn_index)
        if beat is not None:
            shot_title, shot_body = (
                _shot_text(beat.shot_ref) if beat.shot_ref is not None else ("", "")
            )
            opening_directives.append(
                fill_placeholders(
                    beat.body,
                    {
                        "archetype": archetype,
                        "player_action": player_action or "",
                        "shot_title": shot_title,
                        "shot_body": shot_body,
                    },
                )
            )

    bible = load_story_bible(scenario.scenario_id, language)
    entries = select_story_bible_entries(bible, loop, turn_index=turn_index)
    notes.extend(story_bible_notes(entries))

    # Item-grant affordance: tell the GM it may hand out real carriables via
    # world_delta.grant_items when the CHOSEN action plausibly yields one (e.g.
    # salvaging downed-drone wreckage → drone_scrap) — otherwise "잔해를 수습한다"
    # choices stay flavor-only. The id whitelist is enforced again at commit
    # (_filter_grant_items), so this note is guidance, not the guard.
    grant_note = _grant_items_note(scenario, language)
    if grant_note:
        notes.append(grant_note)

    # Archetype attribute tags ([Ghost Signal] …) have no mechanical effect —
    # surface them as a persona directive so they color how the GM narrates the
    # player's approach, senses, and check flavor instead of being dead UI chips.
    attr_note = _attributes_note(player, language)
    if attr_note:
        notes.append(attr_note)

    # Session memory: "story so far" synopsis + the previous scene(s) verbatim,
    # so scenes continue with continuity instead of re-describing the same beats.
    # Kept in its own list (not merged into `notes`) so the prompt renders it in
    # FULL — merging it let the MAX_PROMPT_NOTES truncation silently drop the
    # anti-repeat directives + previous-scene prose, which is why repetition
    # suppression looked broken in live play.
    session_synopsis = (
        build_session_synopsis(loop.state) if isinstance(loop.state, dict) else []
    )

    # The opening 5-beat directives must reach the model verbatim. novelty_notes
    # is truncated to the last MAX_PROMPT_NOTES entries, and on the opening turns
    # the story-bible notes appended afterward pushed these directives out of the
    # window entirely — the GM then free-wrote from starting_location (the
    # underground data-layer), ignoring the authored rainy-alley image. Route them
    # through the session_synopsis channel instead, which is rendered IN FULL and
    # sits ahead of the loop state, so each turn's image-locked scene directive
    # always lands.
    if opening_directives:
        opening_header = (
            directives.opening_header
            or "=== 오프닝 장면 지시 (최우선 · 현재 장면 이미지와 정합 필수) ==="
        )
        session_synopsis = [
            opening_header,
            *opening_directives,
            *session_synopsis,
        ]

    # Post-combat callback (#5): on the scene right after a fight, route a
    # full-render note so the GM opens with the combat's aftermath instead of
    # cutting to an unrelated beat (the "전투가 따로 논다" seam). Synopsis channel
    # (not novelty_notes) so it isn't truncated away.
    combat_callback = _combat_callback_note(scenario, loop, turn_index)
    if combat_callback:
        session_synopsis = [combat_callback, *session_synopsis]

    # The opening (turns 0-4) is a fully scripted 5-beat prologue driven by the
    # ONBOARDING_SCENE1-5 directives above (각성→세린 등장→다가오는 손→첫 접촉→추격+전투),
    # so node/junction steering must NOT run during it — at turn 4 the turn-based
    # walk (turns_per_layer=4) would otherwise place the player in layer 1
    # (night_market) and inject a steering note that contradicts the chase. The
    # earlier "세린 조우 사라짐" bug (generic free scenes overriding the anchor) is
    # already prevented because turns 0-4 are explicitly authored. Node/junction
    # steering resumes once the prologue ends, at turn 5 (the first act-1 scene).
    if turn_index >= ROUTE_STEERING_START_TURN:
        notes.extend(_route_director_notes(scenario, loop, turn_index, language))
        notes.extend(_route_junction_notes(scenario, loop, turn_index, language))
        route_beat_lock = _route_beat_directive_notes(
            directives,
            loop,
            turn_index,
            player_action,
        )
        if route_beat_lock:
            # Authored anchor locks are correctness-critical and must not be
            # displaced by the novelty-note truncation window.
            session_synopsis = [*route_beat_lock, *session_synopsis]

    cutscene_lock = _cutscene_directive_notes(
        directives,
        loop,
        player_action,
        language,
    )
    if cutscene_lock:
        # This is the selected scene for the current turn, so it outranks route
        # steering and lives in the full-render synopsis channel.
        session_synopsis = [*cutscene_lock, *session_synopsis]

    # P1 — 루프 내러티브 잔향 (Slay the Princess) 처리
    run_summaries = [m for m in world_memories if m.kind == "run_summary"]
    # 최신 run_summary 3개만 추출
    recent_summaries = sorted(run_summaries, key=lambda m: m.created_at)[-3:]

    if recent_summaries:
        notes.append("=== NARRATIVE ECHOES (이전 루프의 기억과 잔향) ===")
        notes.append(
            "지침: 아래는 플레이어가 과거 루프에서 남긴 흔적과 결말(Run History)입니다. "
            "NPC들은 이를 명시적으로 기억하지 못하지만, 세계의 미묘한 이질감, 플레이어의 기시감(Dejavu), "
            "또는 이전 루프의 선택에서 비롯된 영적/물리적 잔향을 텍스트 묘사에 자연스럽게 녹여내십시오. "
            "예를 들어, 이전 루프에서 동료와 갈등을 겪었다면 이번 루프 첫 만남 시 미묘한 긴장감이 감돌거나, "
            "이전 루프에서 도달한 엔딩의 잔해가 세계의 배경 묘사에 은유적으로 노출될 수 있습니다."
        )
        for i, summary_mem in enumerate(recent_summaries, 1):
            content = summary_mem.content
            ending_lbl = content.get("ending_label") or "알 수 없음"
            turns = content.get("turns", 0)
            clues = ", ".join(content.get("clues_collected") or [])
            allies = ", ".join(content.get("allies_met") or [])
            summary_txt = content.get("summary_text") or ""

            notes.append(
                f"[과거 루프 #{i}] 엔딩: {ending_lbl} | 진행 턴수: {turns} | "
                f"발견한 단서: [{clues}] | 만난 인물: [{allies}]"
            )
            if summary_txt:
                notes.append(f" - 요약: {summary_txt}")

    causality_summaries = [
        memory
        for memory in memories
        if memory.kind == "causality_summary" and isinstance(memory.content, dict)
    ]
    if causality_summaries:
        latest_summary = sorted(causality_summaries, key=lambda memory: memory.updated_at)[-1]
        content = latest_summary.content
        summary_text = str(content.get("summary_text") or "").strip()
        clue_symbols = (
            content.get("clue_symbols") if isinstance(content.get("clue_symbols"), list) else []
        )
        tone_histogram = (
            content.get("tone_histogram") if isinstance(content.get("tone_histogram"), dict) else {}
        )
        if summary_text:
            notes.append("=== CAUSALITY SUMMARY (장기 서사 압축 기억) ===")
            notes.append(
                "지침: 아래 요약은 오래된 Narrative Shard 원문을 압축한 장기 인과율 기억입니다. "
                "원문 shard를 반복하거나 그대로 인용하지 말고, 장면의 배경 압력, NPC의 미묘한 반응, "
                "단서의 장기 후폭풍으로만 반영하십시오."
            )
            notes.append(f"요약: {summary_text}")
            if clue_symbols:
                notes.append(f"장기 단서 축: {', '.join(str(item) for item in clue_symbols[:8])}")
            if tone_histogram:
                dominant_tones = sorted(
                    tone_histogram.items(), key=lambda item: item[1], reverse=True
                )[:4]
                notes.append(
                    "반복 정서 축: "
                    + ", ".join(f"{tone}:{count}" for tone, count in dominant_tones)
                )

    # Phase 3 — 세계관 탐험 및 시간 축 (Roadwarden & 80 Days) 규칙 주입.
    # 키워드 감지/임계 판정(게이팅)은 코드에 STAY; prose는 이제 프롬프트 레이어
    # (directives/encounters.md)다. 시나리오가 encounters.md를 두지 않으면 generic
    # 기본값(DEFAULT_ENCOUNTERS)을 받는다(이전 공유 동작 보존).
    encounters = directives.encounters or _default_encounters(language)
    decay_pct = min(100, int((turn_index / 60.0) * 100))

    # 1. 이동 중 조우 (Travel Encounters)
    if player_action:
        travel_keywords = [
            "이동",
            "가다",
            "진입",
            "떠나다",
            "탈출",
            "travel",
            "move",
            "go to",
            "leave",
            "escape",
        ]
        action_lower = player_action.lower()
        if any(kw in action_lower for kw in travel_keywords):
            notes.append(encounters.travel_header)
            notes.append(
                fill_placeholders(
                    encounters.travel_template,
                    {
                        "player_action": player_action,
                        "decay_pct": decay_pct,
                        "stability": loop.stability,
                        "tension": loop.tension,
                    },
                )
            )

    # 2. 리소스 임계점 도달 시의 위기 인카운터 (Emergency Encounters)
    if loop.stability < 30 or loop.tension > 70:
        notes.append(encounters.emergency_header)
        if loop.stability < 30:
            notes.append(
                fill_placeholders(
                    encounters.emergency_low_stability_template,
                    {"stability": loop.stability},
                )
            )
        if loop.tension > 70:
            notes.append(
                fill_placeholders(
                    encounters.emergency_high_tension_template,
                    {"tension": loop.tension},
                )
            )

    return NarrativeContext(
        player=player,
        loop=loop,
        turn_index=turn_index,
        recent_events=list(recent_events),
        memories=list(memories),
        world_memories=list(world_memories),
        narrative_shards=list(narrative_shards),
        novelty_notes=notes,
        session_synopsis=session_synopsis,
        player_action=player_action,
        system_prompt=scenario.system_prompt,
        fast_mode=fast_mode,
        fallback_scene=directives.fallback_scene,
        language=language,
    )


def _opening_continuity_notes(
    scenario: ScenarioConfig,
    turn_index: int,
    language: str = "ko",
    scenario_i18n: dict[str, Any] | None = None,
) -> list[str]:
    """Replay the opening cinematic (session_intro) the player just watched so the
    first playable scenes continue directly from it.

    The session_intro *prose* (title/body/objective/cinematic_shots) is taken from the
    additive ``i18n/<lang>.json`` overlay when present (English golden path), else from
    the Korean ``scenario.json`` source. The surrounding framing is emitted in English
    when ``language == "en"`` so the whole continuity note reads in one language.
    """
    ui_copy = scenario.ui_copy if isinstance(scenario.ui_copy, dict) else {}
    intro = ui_copy.get("session_intro")
    if not isinstance(intro, dict):
        return []
    # Prefer the localized session_intro prose (additive overlay) over the KO source.
    overlay_intro = (scenario_i18n or {}).get("session_intro")
    if not isinstance(overlay_intro, dict):
        overlay_intro = {}

    def _prose(key: str) -> str:
        return str(overlay_intro.get(key) or intro.get(key) or "").strip()

    title = _prose("title")
    body = _prose("body")
    objective = _prose("objective")
    shots = overlay_intro.get("cinematic_shots")
    if not isinstance(shots, list):
        shots = intro.get("cinematic_shots")
    shot_lines: list[str] = []
    if isinstance(shots, list):
        for i, shot in enumerate(shots, 1):
            if not isinstance(shot, dict):
                continue
            s_title = str(shot.get("title") or "").strip()
            s_body = str(shot.get("body") or "").strip()
            if s_title or s_body:
                shot_lines.append(f"   {i}) {s_title}: {s_body}")

    if not (title or body or objective or shot_lines):
        return []

    if language == "en":
        return _opening_continuity_lines_en(turn_index, title, body, objective, shot_lines)
    return _opening_continuity_lines_ko(turn_index, title, body, objective, shot_lines)


def _opening_continuity_lines_ko(
    turn_index: int, title: str, body: str, objective: str, shot_lines: list[str]
) -> list[str]:
    lead = (
        "지침: 플레이어는 방금 아래 오프닝 시네마틱을 끝까지 시청했습니다. 지금 작성할 장면은 "
        "이 시네마틱이 끝난 '바로 그 순간'을 직접 이어받아야 합니다. 새 장소로 리셋하거나 "
        "오프닝과 무관한 상황을 만들지 마십시오."
    )
    if turn_index == 0:
        # Turn 0 is the *lone awakening* that precedes Se-rin's arrival. Do NOT
        # replay the Se-rin/rescue/chase shots here — they contradict the lone
        # awakening directive and make the 8B storyteller drift. Feed only the
        # blackout/awakening framing; the shots return from turn 1.
        lead = (
            "지침: 플레이어는 방금 오프닝 시네마틱을 시청했습니다. 지금 작성할 첫 장면은 그 정전 직후, "
            "비식별 신호가 젖은 콘크리트 위에서 '홀로 깨어나는' 순간입니다. 새 장소로 리셋하거나 오프닝과 "
            "무관한 상황을 만들지 마십시오."
        )
    lines = [
        "=== 오프닝 시네마틱 연속성 (OPENING CINEMATIC CONTINUITY) — 최우선 지침 ===",
        lead,
    ]
    if title:
        lines.append(f" - 오프닝 제목: {title}")
    if body:
        lines.append(f" - 오프닝 상황: {body}")
    # The opening objective names Se-rin ("정세린의 손을 잡고...") — at turn 0 (lone
    # awakening) that primes the model to introduce her early, so withhold it until
    # turn 1 when she actually enters.
    if objective and turn_index >= 1:
        lines.append(f" - 작전 목표: {objective}")
    if shot_lines and turn_index >= 1:
        lines.append(" - 시네마틱 컷(이미 플레이어가 본 장면):")
        lines.extend(shot_lines)
    if turn_index == 0:
        lines.append(
            "중요(턴 0 = 홀로 각성): 지금은 오프닝 정전 직후, '비식별 신호'인 주인공이 비 내리는 C-17 네온 "
            "골목의 젖은 바닥에서 '홀로' 깨어나는 순간입니다. 아직 정세린은 등장하지 않았습니다 — 이 장면에서는 "
            "정세린(또는 다른 구조자)을 절대 등장시키지 말고, 주인공 혼자 깨어나 상황을 파악하는 데 집중하십시오. "
            "무대(비, 젖은 콘크리트, 물웅덩이의 네온, 멀리 골목을 훑는 감시 드론 수색등)는 오프닝과 동일하게 유지하십시오. "
            "정세린의 등장은 바로 '다음' 장면입니다."
        )
    else:
        lines.append(
            "중요(장소/인물 일관성): 이 오프닝의 무대와 인물(비 내리는 C-17 정전 구역의 네온 골목, "
            "정세린, 추격 중인 감시 드론, 정세린의 바이크)을 그대로 유지하십시오. loop의 location_id나 "
            "story bible의 장소 데이터가 데이터 레이어/변전소 등 다른 곳을 가리키더라도, 오프닝 탈출 "
            "시퀀스(턴 1~2)가 마무리되기 전까지는 시네마틱의 장소·인물·긴박함을 최우선으로 따르십시오. "
            "정세린은 이 구간 내내 플레이어 곁에 존재하며 함께 움직입니다."
        )
    return lines


def _opening_continuity_lines_en(
    turn_index: int, title: str, body: str, objective: str, shot_lines: list[str]
) -> list[str]:
    """English mirror of _opening_continuity_lines_ko (same staging rules, English)."""
    lead = (
        "Directive: the player has just watched the opening cinematic below in full. The scene "
        "you write now must continue directly from 'the very moment' that cinematic ended. Do not "
        "reset to a new location or invent a situation unrelated to the opening."
    )
    if turn_index == 0:
        lead = (
            "Directive: the player has just watched the opening cinematic. The first scene you write "
            "now is the moment right after that blackout, when the unregistered signal wakes 'alone' "
            "on the wet concrete. Do not reset to a new location or invent a situation unrelated to "
            "the opening."
        )
    lines = [
        "=== OPENING CINEMATIC CONTINUITY — top-priority directive ===",
        lead,
    ]
    if title:
        lines.append(f" - Opening title: {title}")
    if body:
        lines.append(f" - Opening situation: {body}")
    # The opening objective names Se-rin — at turn 0 (lone awakening) that primes the
    # model to introduce her early, so withhold it until turn 1 when she actually enters.
    if objective and turn_index >= 1:
        lines.append(f" - Operation objective: {objective}")
    if shot_lines and turn_index >= 1:
        lines.append(" - Cinematic cuts (already seen by the player):")
        lines.extend(shot_lines)
    if turn_index == 0:
        lines.append(
            "Important (turn 0 = lone awakening): this is the moment right after the opening blackout, "
            "when the protagonist — an 'unregistered signal' — wakes 'alone' on the wet ground of a "
            "rainy C-17 neon alley. Jung Se-rin has not appeared yet — in this scene, never introduce "
            "Se-rin (or any other rescuer); focus on the protagonist waking alone and reading the "
            "situation. Keep the stage (rain, wet concrete, neon in the puddles, a surveillance drone "
            "searchlight sweeping the alley far off) identical to the opening. Se-rin's arrival is the "
            "very 'next' scene."
        )
    else:
        lines.append(
            "Important (place/character consistency): keep this opening's stage and characters (the "
            "rainy C-17 blackout-zone neon alley, Jung Se-rin, the pursuing surveillance drones, "
            "Se-rin's bike) exactly. Even if the loop's location_id or the story bible's location data "
            "points elsewhere (a data layer, a substation, etc.), follow the cinematic's place, "
            "characters, and urgency as top priority until the opening escape sequence (turns 1-2) "
            "wraps up. Se-rin stays at the player's side and moves with them throughout this stretch."
        )
    return lines


def _route_director_notes(
    scenario: ScenarioConfig, loop: LoopState, turn_index: int, language: str = "ko"
) -> list[str]:
    state = loop.state if isinstance(loop.state, dict) else {}
    status = route_status(state)
    if not status:
        return []
    node = status.get("node") or {}
    if not node:
        return []
    en = language == "en"
    perspective = status.get("perspective") or {}
    leaderboard = status.get("ending_leaderboard") or []
    ending_labels = {str(e.get("id")): str(e.get("title", e.get("id"))) for e in scenario.endings}

    # A node stays `current` for turns_per_layer turns; without a "move on" signal the
    # GM re-describes the same place every turn (the explore stagnation / location
    # stickiness bug). Establish the node — and match its curated image — on the first
    # scene, then force forward motion on later scenes. Layer 0's first noted scene is
    # turn 1, so treat that as fresh too. The steering-resume turn (5) is also fresh:
    # layer 1's boundary turn (4) is swallowed by the opening prologue, so turn 5 is
    # the first scene actually staged at the layer-1 node — without this, a layer-1
    # anchor's curated image is never established and the "move forward" directive
    # fires against a scene the GM never set (bug#4).
    fresh_node = _is_fresh_route_node_turn(turn_index)
    title = node.get("title") or node.get("label")

    if en:
        kind = "fixed story beat (impact scene)" if node.get("anchor") else "dynamic transit scene"
        lines = [
            "=== ROUTE NODE STEERING ===",
            f"Current route node: '{title}' · type {node.get('label')} · {kind}.",
            "Directive: stage this scene at this node. Reflect the node type's nature (combat/clue/"
            "market/maintenance/event/confrontation, etc.) in the scene's mood and choices, but write "
            "the description, dialogue, and choice text freely.",
        ]
    else:
        kind = "고정 스토리 비트(임팩트 장면)" if node.get("anchor") else "동적 경유 장면"
        lines = [
            "=== 작전 노드 가이드 (ROUTE NODE STEERING) ===",
            f"현재 작전 노드: '{title}' · 유형 {node.get('label')} · {kind}.",
            "지침: 이번 장면은 이 노드를 무대로 전개하십시오. 노드 유형의 성격(전투/단서/시장/정비/사건/대면 등)을 장면 분위기와 선택지에 반영하되, 묘사·대사·선택지 텍스트는 자유롭게 창작하십시오.",
        ]
    node_image = str(node.get("image") or "").strip()
    if node_image and fresh_node:
        image_hint = node_image.rsplit("/", 1)[-1].rsplit(".", 1)[0].replace("-", " ").replace("_", " ")
        if en:
            lines.append(
                f"Key scene-image consistency: this node uses the pre-made image '{node_image}'. "
                f"In the first paragraph you MUST describe the core subject/place/action the image "
                f"shows. Image hint: {image_hint}. The scene title, narration, and visual_brief must "
                f"not contradict this image."
            )
        else:
            lines.append(
                f"주요 장면 이미지 정합성: 이 노드는 사전 제작 이미지 '{node_image}'를 사용합니다. "
                f"첫 단락에서 이미지가 보여주는 핵심 피사체/장소/행동을 반드시 묘사하십시오. "
                f"이미지 힌트: {image_hint}. 장면 제목, narration, visual_brief가 이 이미지와 어긋나면 안 됩니다."
            )
    if not fresh_node:
        if en:
            lines.append(
                "Progression directive (no repetition): you have already spent several scenes at this "
                "route node. Do not repeat the previous scene's place, composition, or situation — move "
                "one step forward: shift to a different area (indoor/outdoor, upper/lower level), "
                "introduce a new person/clue/threat, or change the phase (chase, negotiation, "
                "infiltration). scene.location and the first paragraph must be clearly different from "
                "the previous scene."
            )
        else:
            lines.append(
                "진행 지침(반복 금지): 이 작전 노드에 이미 여러 장면 머물렀습니다. 직전 장면의 장소·구도·상황을 "
                "되풀이하지 말고 한 걸음 전진시키십시오 — 다른 구역(실내외·상/하층)으로 이동하거나, 새로운 인물·"
                "단서·위협을 등장시키거나, 추격·교섭·잠입처럼 국면을 바꾸십시오. scene.location과 첫 단락 묘사가 "
                "직전 장면과 분명히 달라야 합니다."
            )
    # Canon market vendor: give the barter a face. When the scene is staged at a
    # market-type node, the GM should place the vendor (e.g. Lin-yue's broker
    # network) in the scene so the exchange UI has narrative grounding.
    if str(node.get("type")) == "market":
        vendor = scenario.combat.get("market_vendor") if isinstance(scenario.combat, dict) else None
        if isinstance(vendor, dict) and vendor.get("name"):
            if en:
                lines.append(
                    f"Market vendor (canon): this market is run by {vendor['name']}'s network. "
                    f"{vendor.get('blurb', '')} Put the vendor ON SCREEN and mention her by "
                    f"NAME ('{vendor['name']}') at least once in the narration — the player "
                    "can barter salvage here."
                )
            else:
                lines.append(
                    f"시장 주인(캐논): 이 시장은 {vendor['name']}의 네트워크가 운영합니다. "
                    f"{vendor.get('blurb', '')} 그 인물을 장면에 직접 등장시키고, 서술에 "
                    f"반드시 이름('{vendor['name']}')을 한 번 이상 언급하십시오 — "
                    "플레이어는 이곳에서 잔해를 물물 교환할 수 있습니다."
                )

    if perspective:
        if en:
            lines.append(
                f"Active lens (perspective): '{perspective.get('lens')}' — {perspective.get('summary')} "
                "Narrate the scene through this perspective's emotion and gaze."
            )
        else:
            lines.append(
                f"활성 시점(관점): '{perspective.get('lens')}' — {perspective.get('summary')} "
                "이 관점의 정서와 시선으로 장면을 서술하십시오."
            )
        crosses = perspective.get("crosses") or []
        if crosses:
            joined = ", ".join(str(c) for c in crosses)
            if en:
                lines.append(
                    f"Crossing threads: subtly lay foreshadowing or resonance that touches {joined} "
                    "so the scene feels like several story strands intersecting."
                )
            else:
                lines.append(
                    "교차 실타래: 이 장면에 "
                    + joined
                    + " 와 맞닿는 복선이나 여운을 은근히 깔아 여러 갈래의 이야기가 교차하는 느낌을 주십시오."
                )
    if leaderboard:
        top_id = str(leaderboard[0][0])
        label = ending_labels.get(top_id, top_id)
        if en:
            lines.append(
                f"The ending this route currently leans toward: '{label}'. Do not mention the ending "
                "directly; reflect this direction only metaphorically, through tone and foreshadowing."
            )
        else:
            lines.append(
                f"현재 루트가 향하는 결말 경향: '{label}'. "
                "결말을 직접 언급하지 말고, 톤과 복선으로만 이 방향을 은유적으로 비추십시오."
            )
    return lines


def _is_fresh_route_node_turn(turn_index: int) -> bool:
    per = max(1, DEFAULT_TURNS_PER_LAYER)
    return (
        int(turn_index) % per == 0
        or int(turn_index) == 1
        or int(turn_index) == ROUTE_STEERING_START_TURN
    )


def _route_beat_directive_notes(
    directives: ScenarioDirectives,
    loop: LoopState,
    turn_index: int,
    player_action: str | None,
) -> list[str]:
    """Render a beat-addressed route lock on the node's first scene only."""
    if not _is_fresh_route_node_turn(turn_index):
        return []
    state = loop.state if isinstance(loop.state, dict) else {}
    status = route_status(state)
    node = status.get("node") if status else None
    if not isinstance(node, dict):
        return []
    beat_id = str(node.get("beat") or "")
    directive = directives.route_beat(beat_id) if beat_id else None
    if directive is None:
        return []
    lines = [directives.route_header or "=== ROUTE BEAT SCENE LOCK ==="]
    lines.extend(
        [
            f"ROUTE_BEAT: {directive.beat}",
            f"LOCATION_LOCK: {directive.location_lock}",
            f"MANDATORY_EVENT: {directive.mandatory_event}",
            f"FORBIDDEN: {directive.forbidden}",
            fill_placeholders(
                directive.body,
                {
                    "player_action": player_action or "",
                    "node_title": node.get("title") or "",
                    "node_image": node.get("image") or "",
                },
            ),
        ]
    )
    return lines


def _cutscene_directive_notes(
    directives: ScenarioDirectives,
    loop: LoopState,
    player_action: str | None,
    language: str,
) -> list[str]:
    """Render the authored lock for one staged companion cutscene."""
    state = loop.state if isinstance(loop.state, dict) else {}
    active = state.get(ACTIVE_CUTSCENE_KEY)
    cutscene_id = active.get("id") if isinstance(active, dict) else None
    cutscene = directives.cutscene(str(cutscene_id)) if cutscene_id else None
    if cutscene is None:
        return []
    en = language == "en"
    instruction = (
        "This turn is the companion cutscene below. Preserve its concrete events and emotional "
        "meaning; do not replace it with route exposition, combat, or a different location. "
        "Use the authored prose as the scene backbone, then offer choices that continue naturally."
        if en
        else "이번 턴은 아래 동료 컷신이다. 구체적 사건과 감정적 의미를 보존하고, 작전 설명·전투·다른 장소로 "
        "대체하지 마라. 저작된 대본을 장면의 뼈대로 사용한 뒤 자연스럽게 이어지는 선택지를 제시하라."
    )
    return [
        "=== COMPANION CUTSCENE SCENE LOCK ===",
        f"CUTSCENE_ID: {cutscene.cutscene_id}",
        f"CUTSCENE_TITLE: {cutscene.title}",
        f"COMPANION: {cutscene.companion}",
        f"CURATED_IMAGE: {cutscene.image}",
        instruction,
        fill_placeholders(cutscene.body, {"player_action": player_action or ""}),
    ]


def _route_junction_notes(
    scenario: ScenarioConfig, loop: LoopState, turn_index: int, language: str = "ko"
) -> list[str]:
    state = loop.state if isinstance(loop.state, dict) else {}
    # Route clock counts narrative commits only (state["_story_turn"], stamped by
    # _commit_scene); combat rounds inflate the raw turn_index and would offer
    # junction picks for layers the story hasn't reached.
    story_prev = state.get("_story_turn")
    route_turn = (int(story_prev) + 1) if isinstance(story_prev, int) else turn_index
    options = junction_options(state, turn_index=route_turn)
    en = language == "en"
    notes: list[str] = []
    if options:
        kinds = ", ".join(sorted({str(o.get("label")) for o in options if o.get("label")}))
        if en:
            notes.extend(
                [
                    "=== ROUTE JUNCTION ===",
                    "This scene is a junction that decides the next destination. End the scene on a "
                    "'tense moment of deciding where to go'. The system replaces the destination choices "
                    "presented to the player with route nodes, so you only describe the situation of "
                    f"standing at the junction and the mood of each direction. Candidate types: {kinds}.",
                ]
            )
        else:
            notes.extend(
                [
                    "=== 작전 갈림길 (ROUTE JUNCTION) ===",
                    "이 장면은 다음 행선지를 정하는 갈림길이다. 장면을 '어디로 갈지 결정해야 하는 긴장된 순간'으로 "
                    "마무리하라. 플레이어에게 제시될 행선지 선택지는 시스템이 작전 노드로 대체하므로, 너는 갈림길에 "
                    f"선 상황과 각 방향의 분위기만 묘사하라. 후보 방향 유형: {kinds}.",
                ]
            )

    # Dynamic route growth: on a dynamic map, invite the GM to author the next
    # destinations as type-constrained route_nodes (type from the allowed list,
    # title/flavour free). The system wires mechanics from the type and always
    # falls back to authored pools, so a missing/invalid proposal is harmless.
    route_map = state.get("_route_map") if isinstance(state, dict) else None
    if isinstance(route_map, dict) and route_map.get("mode") == "dynamic":
        allowed = _route_node_type_menu(scenario)
        if allowed:
            if en:
                notes.extend(
                    [
                        "=== DYNAMIC ROUTE NODES ===",
                        "The route map grows with the player's choices. Propose 1-2 next destinations "
                        "that fit the story as a `world_delta.route_nodes` array. Each item has the form "
                        '{"type": <one from the list below>, "title": <English destination name>}. '
                        "The type carries mechanical meaning (combat/clue/market, etc.), so pick only "
                        f"from the list; invent the title and mood freely. Allowed types: {allowed}. If "
                        "there is no proposal, the array may be left empty.",
                    ]
                )
            else:
                notes.extend(
                    [
                        "=== 동적 작전 노드 제안 (DYNAMIC ROUTE NODES) ===",
                        "작전 지도는 플레이어 선택에 따라 자라난다. 이야기 전개에 맞는 다음 행선지 1~2개를 "
                        "`world_delta.route_nodes` 배열로 제안하라. 각 항목은 "
                        '{"type": <아래 목록 중 하나>, "title": <한국어 행선지 이름>} 형식이다. '
                        "유형은 기계적 의미(전투/단서/시장 등)를 가지므로 목록에서만 고르고, 제목과 분위기는 "
                        f"자유롭게 창작하라. 허용 유형: {allowed}. 제안이 없으면 배열을 비워도 된다.",
                    ]
                )
    return notes


def _route_node_type_menu(scenario: ScenarioConfig) -> str:
    route_cfg = scenario.route_map if isinstance(scenario.route_map, dict) else {}
    node_types = route_cfg.get("node_types") if isinstance(route_cfg, dict) else None
    if not isinstance(node_types, dict):
        return ""
    # Exclude structural anchors the GM should not mint (story spine / boss).
    skip = {"story", "boss"}
    parts = []
    for type_id, spec in node_types.items():
        if type_id in skip:
            continue
        label = spec.get("label", type_id) if isinstance(spec, dict) else type_id
        parts.append(f"{type_id}({label})")
    return ", ".join(parts)


def _scenario_structure_notes(
    scenario: ScenarioConfig, scenario_i18n: dict[str, Any] | None = None
) -> list[str]:
    # scenario_i18n is the already-language-resolved prose overlay ({} for KO / none).
    i18n = scenario_i18n or {}
    notes: list[str] = []
    if scenario.main_arcs:
        items = _localized_named_items(scenario.main_arcs, i18n.get("main_arcs"))
        notes.append(f"SCENARIO_MAIN_ARCS: {_compact_named_items(items)}")
    if scenario.side_arcs:
        items = _localized_named_items(scenario.side_arcs, i18n.get("side_arcs"))
        notes.append(f"SCENARIO_SIDE_ARCS: {_compact_named_items(items)}")
    if scenario.npc_agendas:
        npc_overlay = i18n.get("npc_agendas")
        if not isinstance(npc_overlay, dict):
            npc_overlay = {}
        names = ", ".join(
            str(npc_overlay.get(name, name)) for name in scenario.npc_agendas.keys()
        )
        notes.append(f"SCENARIO_NPC_AGENDAS: {names}")
    if scenario.endings:
        items = _localized_named_items(scenario.endings, i18n.get("endings"))
        notes.append(f"SCENARIO_ENDINGS: {_compact_named_items(items)}")
    return notes


def _localized_named_items(
    items: Sequence[dict[str, Any]], overlay: Any
) -> list[dict[str, Any]]:
    """Overlay localized prose onto named items by index (additive; missing → KO source).

    Each overlay entry's keys (title/summary/description) shadow the source item's, so a
    localized ``title``/``summary`` is preferred while non-prose keys (id) are preserved.
    A short or absent overlay falls back to the source per item — never drops an item.
    """
    if not isinstance(overlay, list) or not overlay:
        return list(items)
    merged: list[dict[str, Any]] = []
    for i, item in enumerate(items):
        if i < len(overlay) and isinstance(overlay[i], dict):
            merged.append({**item, **overlay[i]})
        else:
            merged.append(item)
    return merged


def _compact_named_items(items: Sequence[dict[str, Any]], limit: int = 4) -> str:
    chunks: list[str] = []
    for item in items[:limit]:
        name = item.get("name") or item.get("id") or item.get("title") or item.get("arc")
        summary = item.get("summary") or item.get("description") or item.get("trigger")
        if summary:
            chunks.append(f"{name}: {summary}")
        elif name:
            chunks.append(str(name))
    return " | ".join(chunks)
