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
from mythos_runtime.scenario import ScenarioConfig
from mythos_runtime.story_bible import (
    load_story_bible,
    select_story_bible_entries,
    story_bible_notes,
)

LANGUAGE_RULE = (
    "CRITICAL LANGUAGE & CHOICE RULE (필수 한국어 및 선택지 생성 규칙):\n"
    "1. 모든 플레이어 대상 텍스트(scene.title, scene.narration, scene.objective, scene.action_result, choices의 각 label)는 "
    "반드시 자연스럽고 문학적인 한국어(Korean)로만 생성해야 합니다. 절대로 영어로 출력하지 마십시오.\n"
    "2. 단, scene.visual_brief는 이미지 생성 모델(FLUX) 전용이므로 반드시 영어(English)로 자세히 묘사되어야 합니다.\n"
    "3. choices[].intent는 반드시 정확히 'explore', 'interact', 'rewrite', 'archive' 중 하나여야 하며, 설명이나 한글, 기타 기호를 포함해서는 안 됩니다. (예: 'explore'만 출력)\n"
    "4. 선택지 관련 스탯(근력, 지능, 매력, 민첩, 관측)이 있다면, 선택지 label 끝에 '(민첩)', '(지능)', '(관측)' 등과 같이 매우 짧은 단어로만 괄호 안에 명시하십시오. '(민첩 기반 행동권 활용 추천)'과 같은 장황한 설명이나 추천글은 절대 작성하지 마십시오.\n"
    "5. 이 규칙은 절대적이며 최우선적으로 준수되어야 합니다."
)

CAUSALITY_ENGINE_RULE = (
    "CAUSALITY_ENGINE_RULE: The world is a complex gear-system. "
    "1. MAIN ARC: Follow the main story progression but don't rush. "
    "2. SIDE ARCS: Trigger side events if the player is in the right place or has right stats. "
    "3. NPC AGENDAS: NPCs move and act independently based on their goals. "
    "4. BUTTERFLY EFFECTS: Every player choice must be seeded for future consequences. "
    "5. MULTI-ENDINGS: Guide the story toward an ending based on "
    "Humanity/Dominance/Resilience/Insight."
)


def apply_archetype_traits(
    traits: dict[str, Any],
    scenario: ScenarioConfig,
) -> dict[str, Any]:
    """Return traits enriched from the scenario archetype table."""
    archetype_name = traits.get("archetype")
    if not archetype_name:
        return dict(traits)

    enriched = dict(traits)
    for archetype in scenario.archetypes:
        if archetype.get("name") != archetype_name:
            continue
        enriched["stats"] = archetype.get("stats", {})
        enriched["attributes"] = archetype.get("attributes", [])
        enriched.setdefault("autonomy_level", 1)
        enriched.setdefault("unlocked_traits", [])
        break
    return enriched


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
) -> NarrativeContext:
    notes = [f"SCENARIO_BRIEF: {scenario.brief}", *novelty_notes, LANGUAGE_RULE]
    notes.extend(_scenario_structure_notes(scenario))
    notes.append(CAUSALITY_ENGINE_RULE)

    # P4-1 스탯 기반 내면 독백 (Disco Elysium) 지침 추가
    stats = player.traits.get("stats") if isinstance(player.traits, dict) else None
    if isinstance(stats, dict):
        stat_descriptions = {
            "strength": {
                "name": "근력 (Strength)",
                "voice": '본능적이고 거칠며 물리적 파괴와 신체적 생존을 자극하는 육체의 목소리. 투박한 반말과 거친 어조를 사용하며 물리적 충돌과 정면 돌파를 부추깁니다. 예시: "주먹으로 저 빌어먹을 보안 패널을 들이받아 부숴버려! 쇠붙이는 부서지게 되어 있다."',
            },
            "intelligence": {
                "name": "지능 (Intelligence)",
                "voice": '냉정하고 분석적이며 논리와 데이터, 시스템 최적화를 추구하는 연산의 목소리. 철저히 논리적이고 건조한 기계식 종결어미(~다, ~하십시오)를 사용하며 분석적 조언을 제공합니다. 예시: "대상 보안 시스템의 오동작 주기는 4.2초입니다. 우회로 진입 시 발각 확률은 12% 미만으로 최적화됩니다."',
            },
            "charisma": {
                "name": "매력 (Charisma)",
                "voice": '감정적이고 사교적이며 사람들의 심리와 가면 뒤의 진실을 읽는 감응의 목소리. 친근하고 부드럽거나 장난기 섞인 구어체 말투(~잖아, ~지 않아?, ~보렴)를 사용하며 타인의 감정에 공감하고 유도하는 조언을 합니다. 예시: "저 여자의 눈망울이 불안하게 흔들리고 있잖아. 차갑게 밀쳐내기보단 빗속에서 따스한 시선을 건네보는 게 어때? 마음을 열어줄 거야."',
            },
            "agility": {
                "name": "민첩 (Agility)",
                "voice": '기민하고 신경질적이며 회피와 탈출, 위험 감지를 부추기는 반사의 목소리. 호흡이 짧고 급하며 다급한 명령형(~해, ~뛰어, ~서둘러!)과 느낌표를 다용하여 당장 움직이도록 다그칩니다. 예시: "망설이면 끝이다! 몸이 먼저 반응하는 대로 당장 움직여, 셋 둘 하나, 지금 뛰어!"',
            },
            "perception": {
                "name": "관측 (Perception)",
                "voice": '예리하고 미세한 흔적과 보이지 않는 신호, 감춰진 디테일을 포착하는 감각의 목소리. 묘사적이고 세밀하며 객관적인 어조(~다, ~을 포착함)를 사용하며 주변의 숨겨진 디테일과 이질감을 짚어냅니다. 예시: "벽면 네온 간판의 미세한 스파크 소리가 규칙적이지 않다. 간판 뒤에 불법 도청 모듈이 숨겨져 있음을 시사한다."',
            },
        }
        valid_stats = {
            k: int(v)
            for k, v in stats.items()
            if k in stat_descriptions and (isinstance(v, int) or str(v).isdigit())
        }
        if valid_stats:
            sorted_stats = sorted(valid_stats.items(), key=lambda x: x[1])
            min_stat_name, min_stat_val = sorted_stats[0]
            max_stat_name, max_stat_val = sorted_stats[-1]

            max_desc = stat_descriptions[max_stat_name]
            notes.append("=== 스탯 기반 내면 독백 지침 (DISCO ELYSIUM STYLE INNER MONOLOGUE) ===")
            notes.append(
                f"플레이어의 가장 뛰어난 특성은 {max_desc['name']} (수치: {max_stat_val})입니다. "
                f"장면 묘사나 내러티브 전개 중에 종종 플레이어의 머릿속 혹은 내면에서 들려오는 독백(Inner Monologue)이나 내적 대화 형태로 "
                f"다음 목소리를 자연스럽게 주입하십시오. 특히 이 목소리는 스탯 고유의 어조와 어투 규칙(예시의 스타일)을 철저히 따라야 하며, 다른 스탯과 어투가 뚜렷이 구별되어야 합니다: \n"
                f" - {max_desc['name']}: {max_desc['voice']}\n"
                f"이 목소리는 괄호 표기법을 사용하여 표현해야 합니다. 예: (근력: ...) 또는 (지능: ...)"
            )

            if min_stat_name != max_stat_name:
                min_desc = stat_descriptions[min_stat_name]
                notes.append(
                    f"플레이어의 가장 취약한 특성은 {min_desc['name']} (수치: {min_stat_val})입니다. "
                    f"이 특성에 대응하는 내면의 목소리는 미숙함, 억지, 잘못된 오판을 하거나 소심함, 혹은 결핍으로 인해 무기력한 충고를 던지는 형태로 괄호 표기법을 통해 아주 가끔 등장시켜 주십시오. "
                    f"예: ({min_desc['name'].split()[0]}: ...)"
                )

    if loop.phase is LoopPhase.CONNECT or (loop.phase is LoopPhase.EXPLORE and turn_index <= 2):
        archetype = player.traits.get("archetype", "Unclassified")
        # The player just watched the opening cinematic (session_intro). Feed the
        # exact content back so the first playable scenes continue from it instead
        # of resetting to the data-layer starting location.
        notes.extend(_opening_continuity_notes(scenario, turn_index))
        if turn_index == 0:
            notes.append(
                f"ONBOARDING_ACT1_SHOT1: 당신은 오프닝의 첫 번째 플레이 가능한 장면을 작성하고 있습니다. "
                f"주제: '빗속에서 세린이 당신을 발견한다' (Shot 01 // Arrival). "
                f"세린은 C-17 구역의 비 내리는 어두운 네온 골목에서 비등록 '{archetype}' 신호인 플레이어를 발견합니다. "
                f"빗소리, 차가운 콘크리트, 머리 위를 훑는 감시 드론 등의 감각적 디테일을 서사하십시오. "
                f"세린이 당신을 발견하고 아직 지워지지 않았는지(살아있는지) 확인하는 순간에 집중하십시오. "
                f"이 장면의 모든 서사와 선택지는 반드시 한국어(Korean)로 작성되어야 합니다. 반응을 선택할 수 있는 동적인 선택지를 제공하십시오.\n"
                f"선택지 생성 가이드:\n"
                f" 1) 세린의 오토바이에 타거나 동행을 수락하는 협력적인 선택지 (이 선택은 세린을 파티 동료로 합류시킵니다)\n"
                f" 2) 세린을 경계하고 거부하여 홀로 숨거나 독자 탈출을 꾀하는 선택지 (이 선택 시 세린은 동료로 합류하지 않습니다)\n"
                f"중요: 이 장면은 오프닝 대화와 선택지 제공 단계이므로, 절대 전투를 시작하지 마십시오. world_delta.start_combat은 반드시 null이어야 합니다."
            )
        elif turn_index == 1:
            act = player_action or ""
            notes.append(
                f"ONBOARDING_ACT1_SHOT2: 당신은 오프닝의 두 번째 플레이 가능한 장면을 작성하고 있습니다. "
                f"주제: '정세린, 물거미' (Shot 02 // First Contact). "
                f"세린이 플레이어의 손목을 낚아채며 일으켜 세웁니다. 대사: '등록 안 됐지? 야, 그럼 너 아직 사람이네. 뛰어.' "
                f"촉각적 긴장감, 신체적 액팅, 그리고 플레이어를 보호하면서도 퉁명스러운 세린의 행동에 집중하십시오. "
                f"이 장면의 모든 서사와 선택지는 반드시 한국어(Korean)로 작성되어야 합니다. 달리거나 세린에게 질문할 수 있는 활동적인 선택지를 제공하십시오.\n"
                f"이전 플레이어의 행동(player_action: '{act}')을 면밀히 분석하십시오.\n"
                f"플래그 및 전투 가이드:\n"
                f" - 플레이어가 세린과의 동행에 동의하고 따라가거나 신뢰하는 뉘앙스의 행동을 취했다면, 반환하는 JSON의 `world_delta.flags` 배열에 반드시 'met_se_rin'을 추가하고 'refused_se_rin'은 제외하십시오.\n"
                f" - 플레이어가 세린을 거부, 경계하거나 혼자 숨어서 지켜보는 등 독자 행동 뉘앙스를 취했다면, `world_delta.flags` 배열에 반드시 'refused_se_rin'을 추가하고 'met_se_rin'은 제외하십시오.\n"
                f" - 중요: 이 장면 역시 대화 및 추격 개시 단계이므로, 절대 전투를 시작하지 마십시오. world_delta.start_combat은 반드시 null이어야 합니다."
            )
        elif turn_index == 2:
            act = player_action or ""
            notes.append(
                f"ONBOARDING_ACT1_SHOT3: 당신은 오프닝의 세 번째 플레이 가능한 장면을 작성하고 있습니다. "
                f"주제: '엔진이 켜지고, 도시는 적이 된다' (Shot 03 // Ignition). "
                f"세린이 바이크 엔진을 켭니다. 수색등이 빗줄기를 뚫고 골목을 훑는 순간, 어두운 골목을 뚫고 바이크가 가속합니다. "
                f"고속 질주 액션, 엔진의 굉음, 감시망 탈출, 그리고 바이크를 모는 세린의 거친 액팅에 집중하십시오. "
                f"이 장면의 모든 서사와 선택지는 반드시 한국어(Korean)로 작성되어야 합니다. 꽉 잡거나 뒤를 돌아보는 등의 선택지를 제공하십시오.\n"
                f"이전 플레이어의 행동(player_action: '{act}')을 면밀히 분석하십시오.\n"
                f"플래그 및 전투 가이드:\n"
                f" - 플레이어가 이전까지 세린과의 동행에 찬성했다면, `world_delta.flags`에 'met_se_rin'을 포함하십시오. 거절했다면 'refused_se_rin'을 포함하십시오.\n"
                f" - 중요: 세린의 오토바이 탈출 시점 또는 플레이어의 독자 도망 시점에 맞춰 관리자 IX의 추격 드론 포위망을 돌파하는 첫 번째 전투 인카운터가 발생해야 합니다. `world_delta.start_combat`에 반드시 'patrol_ambush'를 지정하여 첫 전투를 시작하십시오."
            )

    bible = load_story_bible(scenario.scenario_id)
    entries = select_story_bible_entries(bible, loop, turn_index=turn_index)
    notes.extend(story_bible_notes(entries))

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

    # Phase 3 — 세계관 탐험 및 시간 축 (Roadwarden & 80 Days) 규칙 주입
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
            notes.append("=== TRAVEL ENCOUNTER (이동 중 조우 이벤트) ===")
            notes.append(
                f"지침: 플레이어가 구역을 이동하거나 여행(Travel)하는 액션('{player_action}')을 선언했습니다. "
                f"현재 시공간 붕괴도({decay_pct}%) 및 은신 안정도({loop.stability}/100), 관리망 추적도({loop.tension}/100)를 고려하여, "
                "이동 도중에 돌발적으로 마주하는 글리치 이상 현상, 경비 순찰대 조우, 또는 주변 환경 붕괴 등의 중간 조우(Travel Interception) 이벤트를 묘사하고, "
                "이를 돌파하거나 회피하기 위한 선택지(예: 연산 해킹으로 경보 우회, 은밀히 우회로 찾기 등)를 1개 이상 생성하십시오."
            )

    # 2. 리소스 임계점 도달 시의 위기 인카운터 (Emergency Encounters)
    if loop.stability < 30 or loop.tension > 70:
        notes.append("=== EMERGENCY ENCOUNTERS (리소스 임계점 위기 상황) ===")
        if loop.stability < 30:
            notes.append(
                f"경고: 현재 [은신 안정도]가 매우 위험한 수준(현재: {loop.stability}/100)입니다. "
                "연결 붕괴 직전의 글리치 물리 현상, 시공간 왜곡, 또는 강제 접속 차단 전파가 엄습해 오는 위기 상황(Emergency)을 서사하고, "
                "플레이어에게 안정성을 회복하기 위한 대가가 큰 응급 선택지를 강제하십시오."
            )
        if loop.tension > 70:
            notes.append(
                f"경고: 현재 [관리망 추적도]가 극히 높은 수준(현재: {loop.tension}/100)입니다. "
                "관리망 집행부대(Enforcers)의 직접적인 추적선 포위, 드론 추격, 혹은 Administrator IX의 직접 정정 통고 등 포위망이 좁혀오는 상황을 서사하십시오. "
                "다음에 오는 선택지는 회피하거나 돌파하기 위해 무거운 대가(stats 판정 또는 stability 소모)를 요구해야 합니다."
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
        player_action=player_action,
        system_prompt=scenario.system_prompt,
        fast_mode=fast_mode,
    )


def _opening_continuity_notes(scenario: ScenarioConfig, turn_index: int) -> list[str]:
    """Replay the opening cinematic (session_intro) the player just watched so the
    first playable scenes continue directly from it."""
    ui_copy = scenario.ui_copy if isinstance(scenario.ui_copy, dict) else {}
    intro = ui_copy.get("session_intro")
    if not isinstance(intro, dict):
        return []

    title = str(intro.get("title") or "").strip()
    body = str(intro.get("body") or "").strip()
    objective = str(intro.get("objective") or "").strip()
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

    lines = [
        "=== 오프닝 시네마틱 연속성 (OPENING CINEMATIC CONTINUITY) — 최우선 지침 ===",
        "지침: 플레이어는 방금 아래 오프닝 시네마틱을 끝까지 시청했습니다. 지금 작성할 장면은 "
        "이 시네마틱이 끝난 '바로 그 순간'을 직접 이어받아야 합니다. 새 장소로 리셋하거나 "
        "오프닝과 무관한 상황을 만들지 마십시오.",
    ]
    if title:
        lines.append(f" - 오프닝 제목: {title}")
    if body:
        lines.append(f" - 오프닝 상황: {body}")
    if objective:
        lines.append(f" - 작전 목표: {objective}")
    if shot_lines:
        lines.append(" - 시네마틱 컷(이미 플레이어가 본 장면):")
        lines.extend(shot_lines)
    lines.append(
        "중요(장소/인물 일관성): 이 오프닝의 무대와 인물(비 내리는 C-17 정전 구역의 네온 골목, "
        "정세린, 추격 중인 감시 드론, 정세린의 바이크)을 그대로 유지하십시오. loop의 location_id나 "
        "story bible의 장소 데이터가 데이터 레이어/변전소 등 다른 곳을 가리키더라도, 오프닝 탈출 "
        "시퀀스(턴 0~2)가 마무리되기 전까지는 시네마틱의 장소·인물·긴박함을 최우선으로 따르십시오. "
        "정세린은 이 구간 내내 플레이어 곁에 존재하며 함께 움직입니다."
    )
    return lines


def _scenario_structure_notes(scenario: ScenarioConfig) -> list[str]:
    notes: list[str] = []
    if scenario.main_arcs:
        notes.append(f"SCENARIO_MAIN_ARCS: {_compact_named_items(scenario.main_arcs)}")
    if scenario.side_arcs:
        notes.append(f"SCENARIO_SIDE_ARCS: {_compact_named_items(scenario.side_arcs)}")
    if scenario.npc_agendas:
        names = ", ".join(str(name) for name in scenario.npc_agendas.keys())
        notes.append(f"SCENARIO_NPC_AGENDAS: {names}")
    if scenario.endings:
        notes.append(f"SCENARIO_ENDINGS: {_compact_named_items(scenario.endings)}")
    return notes


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
