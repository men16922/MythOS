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
from mythos_runtime.route_runtime import (
    DEFAULT_TURNS_PER_LAYER,
    junction_options,
    route_status,
)
from mythos_runtime.scenario import ScenarioConfig
from mythos_runtime.session_memory import build_session_synopsis
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

CINEMATIC_CLARITY_RULE = (
    "CINEMATIC CLARITY RULE (직관적 시네마틱 대본 규칙):\n"
    "- 장면은 영화 시나리오처럼 '보이는 장소 → 즉각적 위협 → 인물의 행동/대사 → 다음 선택' 순서로 쓰십시오.\n"
    "- 첫 문장에는 플레이어가 실제로 어디에 서 있는지와 당장 무엇이 위험한지 보여주십시오.\n"
    "- Neo-Seoul 장면은 비, 콘크리트, 골목, 드론 수색등, 지하철 셔터, 복지 키오스크, 야시장 네온, 바이크 엔진, 손목을 잡는 행동처럼 물리적이고 촬영 가능한 이미지로 묘사하십시오.\n"
    "- '데이터 흐름', '잔향 회랑', '오버레이 코어', '불안 영역', '플레이어의 존재 자체' 같은 추상 명사를 길게 나열하지 마십시오. 명시적으로 가상 코어 내부인 장면이 아니라면 이런 표현은 배경 은유 한 문장 이하로 제한하십시오.\n"
    "- 한 문단은 1~3문장으로 짧게 유지하고, 긴 설명문 대신 카메라가 볼 수 있는 행동을 쓰십시오."
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

NEO_SEOUL_NAMING_RULE = (
    "NEO-SEOUL NAMING RULE (고유명사 표기 고정):\n"
    "- 정식 표기는 반드시 '정세린' 또는 축약 '세린'만 사용하십시오.\n"
    "- '세리느', '세린느', 'Serine', 'Seline' 등 다른 표기는 절대 사용하지 마십시오.\n"
    "- 세린은 플레이어에게 존댓말을 쓰지 않습니다. 대사는 짧은 반말/명령형으로 쓰고, "
    "'요', '습니다', '세요', '하시겠습니까' 같은 높임말 어미를 세린의 대사에 사용하지 마십시오.\n"
    "- Lin Yue는 한국어 본문에서 '린위에', Kai RX-09는 '카이 RX-09', Administrator IX는 '관리자 IX'로 표기하십시오."
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
    notes = [
        f"SCENARIO_BRIEF: {scenario.brief}",
        *novelty_notes,
        LANGUAGE_RULE,
        CINEMATIC_CLARITY_RULE,
    ]
    if scenario.scenario_id == "neo-seoul":
        notes.append(NEO_SEOUL_NAMING_RULE)
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

    opening_directives: list[str] = []
    # The scripted 5-beat prologue (turns 0-4) must fire by TURN, not phase. The
    # storyteller can emit a `requested_next_phase` that advances the loop past
    # EXPLORE mid-opening (e.g. INTERACT by turn 3); the old phase-gated condition
    # then silently dropped the opening directives at turns 3-4 and the GM reverted
    # to the data-layer starting location. So for a scenario that declares an
    # authored opening (cinematic_shots — currently only neo-seoul), run the opening
    # for turns 0-4 regardless of phase. The added clause is scoped to authored-
    # opening scenarios so it does not extend the prologue to others; the existing
    # CONNECT/EXPLORE clauses keep their prior behavior unchanged.
    _intro_cfg = scenario.ui_copy.get("session_intro") if isinstance(scenario.ui_copy, dict) else None
    _has_authored_opening = isinstance(_intro_cfg, dict) and bool(_intro_cfg.get("cinematic_shots"))
    if (
        loop.phase is LoopPhase.CONNECT
        or (loop.phase is LoopPhase.EXPLORE and turn_index <= 4)
        or (_has_authored_opening and turn_index <= 4)
    ):
        archetype = player.traits.get("archetype", "Unclassified")
        # The player just watched the opening cinematic (session_intro). Feed the
        # exact content back so the first playable scenes continue from it instead
        # of resetting to the data-layer starting location.
        opening_directives.extend(_opening_continuity_notes(scenario, turn_index))
        # The three pre-rendered cinematic shots (already shown as a teaser) are the
        # AUTHORED source for the first Se-rin beats: gameplay scenes 2-4 play through
        # shots 01/02/03 so the teaser's promise is paid off as lived experience.
        # Scene 1 (turn 0) is the lone awakening that precedes them. Sourcing each
        # directive from the authored shot text keeps cinematic and gameplay aligned.
        _intro = scenario.ui_copy.get("session_intro") if isinstance(scenario.ui_copy, dict) else None
        _shots = _intro.get("cinematic_shots") if isinstance(_intro, dict) else None
        _shots = _shots if isinstance(_shots, list) else []

        def _shot_text(idx: int) -> tuple[str, str]:
            shot = _shots[idx] if 0 <= idx < len(_shots) and isinstance(_shots[idx], dict) else {}
            return str(shot.get("title") or "").strip(), str(shot.get("body") or "").strip()

        if turn_index == 0:
            opening_directives.append(
                f"ONBOARDING_SCENE1 (AWAKENING): 당신은 오프닝의 첫 번째 플레이 가능한 장면을 작성하고 있습니다. "
                f"주제: '추락한 신호, 홀로 깨어나다'. 이 장면은 인트로 시네마틱 3컷보다 '이전'의 순간입니다. "
                f"방금 C-17 복지 블록이 2.7초간 암전된 직후입니다. 비등록 '{archetype}' 신호인 플레이어(주인공)는 "
                f"비 내리는 네온 골목의 젖은 콘크리트 바닥에 엎어진 채 막 의식을 되찾습니다. "
                f"장소(고정): 반드시 '야외, 비 내리는 C-17 네온 거리/골목, 젖은 콘크리트 바닥'입니다. "
                f"loop의 location_id가 'data-layer'·지하 등 다른 곳을 가리켜도 무시하고, 이 장면을 지하 주차장·지하 회랑·"
                f"실내·데이터 코어 같은 곳으로 옮기지 마십시오. 또한 주인공은 '서 있는' 상태가 아니라 '쓰러져 있다가 깨어나는' 상태입니다. "
                f"이 장면은 '추락 직후의 혼란과 각성'입니다. 주인공이 빗물에 젖은 바닥에서 몸을 일으키며, 차가운 빗물·오존 냄새·"
                f"물웅덩이에 번지는 네온·멀리서 골목을 훑는 드론 수색등 같은 구체적이고 촬영 가능한 감각으로 상황을 더듬는 데 집중하십시오. "
                f"중요(세린 미등장): 이 장면에는 아직 정세린이 등장하지 않습니다. 정세린의 이름·대사·등장을 절대 쓰지 마십시오. "
                f"다른 인물의 손길이나 구조자도 등장시키지 마십시오 — 주인공은 지금 홀로입니다. "
                f"다만 골목 저편에서 다가오는 '기척'이나 발소리 정도로 다음 장면(누군가의 등장)을 가볍게 암시할 수 있습니다. "
                f"'실루엣', '하나의 존재', '데이터 잔해'처럼 주인공 자신을 모호하게만 묘사하지 말고, 젖은 바닥·손·시선·드론 수색등을 명확히 쓰십시오. "
                f"이 장면의 모든 서사와 선택지는 반드시 한국어(Korean)로 작성되어야 합니다. 선택지는 전문용어 없는 짧은 행동문으로 제공하십시오.\n"
                f"선택지 생성 가이드(전투 없이, 각성 직후의 반응):\n"
                f" 1) '몸을 일으켜 주변을 살핀다'처럼 상황을 파악하는 선택지\n"
                f" 2) '바닥에 낮게 엎드려 드론 수색등을 피한다'처럼 위험을 회피·은신하는 선택지\n"
                f" 3) '다가오는 기척 쪽으로 고개를 돌린다'처럼 다음 등장을 향하는 선택지\n"
                f"중요: 이 장면은 각성·상황 파악 단계이므로, 절대 전투를 시작하지 마십시오. world_delta.start_combat은 반드시 null이어야 합니다."
            )
        elif turn_index == 1:
            act = player_action or ""
            s_title, s_body = _shot_text(0)
            opening_directives.append(
                f"ONBOARDING_SCENE2 (SHOT 01 // ARRIVAL): 인트로 시네마틱의 '첫 컷'을 플레이 가능한 장면으로 펼칩니다. "
                f"이 컷의 저작 설정을 그대로 따르십시오 — 제목: '{s_title}'. 설정: {s_body} "
                f"★ 이 장면의 '필수 사건(MANDATORY EVENT)'은 '정세린의 첫 등장'입니다. 플레이어의 직전 행동(player_action: "
                f"'{act}')이 무엇이든(주변을 살피든·숨든·일어서든) 그 행동은 1~2문장으로만 짧게 받아넘기고, 반드시 그 도중에 "
                f"정세린이 비를 뚫고 '나타나는' 것으로 장면을 전개·전환하십시오. 비를 뚫고 바이크로 다가온 세린이 골목 '저편에서' "
                f"당신이 아직 지워지지 않았는지 확인하듯 응시합니다. 첫 문단 안에 반드시 '정세린' 또는 '세린' 이름을 쓰십시오. "
                f"금지: 세린이 등장하지 않은 채 장면을 끝내지 마십시오. 또한 '깜빡이는 푸른 물체', '정체불명의 신호/장치', "
                f"'회로 기판 조각' 같은 '새로운 수수께끼 떡밥'을 만들지 마십시오 — 이 장면의 사건은 오직 '세린의 등장'뿐입니다. "
                f"장소는 직전 장면과 같은 '비 내리는 C-17 네온 골목'을 유지하십시오(지하/실내로 옮기지 말 것). "
                f"이 장면은 '원거리에서의 첫 등장'입니다 — 세린은 아직 당신에게 다가오지 않았고, 신체 접촉도 없습니다. "
                f"거리감·경계·바이크 헤드라이트·드론 수색등의 긴장에 집중하십시오(세린이 곁에 와 손을 뻗는 것은 '다음' 장면입니다). "
                f"이 장면의 모든 서사와 선택지는 반드시 한국어(Korean)로 작성되어야 합니다.\n"
                f"선택지 생성 가이드(전투 없이, 모두 세린을 대상으로): 세린을 향해 몸을 일으킨다 / 세린을 경계하며 거리를 둔다 / 세린에게서 벗어날 탈출로를 살핀다.\n"
                f"중요: 이 장면은 대면 단계이므로 절대 전투를 시작하지 마십시오. world_delta.start_combat은 반드시 null이어야 합니다."
            )
        elif turn_index == 2:
            act = player_action or ""
            opening_directives.append(
                f"ONBOARDING_SCENE3 (APPROACH // 다가오는 손): 정세린이 골목 저편에서 빗속을 가로질러 "
                f"쓰러진(또는 막 몸을 일으키는) 당신에게 '다가옵니다'. 세린은 곁에서 한쪽 무릎을 굽혀 웅크리고, "
                f"당신의 상태를 살피며 조심스레 한 손을 내밉니다. 머리 위 하늘에는 감시 드론의 수색등이 골목을 훑고, "
                f"멀리서 사이렌·기계음이 다가옵니다. 장소는 같은 '비 내리는 C-17 네온 골목, 젖은 바닥'을 유지하십시오(지하/실내 금지). "
                f"핵심: 이 장면은 '접촉 직전'입니다 — 세린은 아직 당신의 손목을 낚아채지 않았고, 함께 달리지도 않습니다. "
                f"내민 손 앞에서의 망설임·경계·신뢰의 저울질, 다가오는 위협의 압박에 집중하십시오(손목을 잡고 뛰는 것은 '다음' 장면). "
                f"★ 이 장면의 필수 사건은 '세린이 다가와 손을 내미는 것'입니다. 플레이어의 직전 행동(player_action: '{act}')은 1~2문장으로만 받고, "
                f"반드시 이 사건을 전개하십시오. 발광 물체·정체불명 신호·회로 조각 같은 새 떡밥을 만들지 마십시오. "
                f"이 장면의 모든 서사와 선택지는 반드시 한국어(Korean)로 작성되어야 합니다.\n"
                f"선택지 생성 가이드(전투 없이, met_se_rin 플래그는 아직 설정하지 마십시오):\n"
                f" 1) '세린이 내민 손을 향해 손을 뻗는다'처럼 신뢰로 기우는 선택지\n"
                f" 2) '세린의 의도를 살피며 망설인다'처럼 경계하는 선택지\n"
                f" 3) '스스로 일어서려 버틴다'처럼 독자 행동을 시도하는 선택지\n"
                f"중요: 이 장면은 접촉 직전 단계이므로 절대 전투를 시작하지 마십시오. world_delta.start_combat은 반드시 null이어야 하며, met_se_rin/refused_se_rin 플래그도 아직 설정하지 마십시오(그 결정은 다음 장면)."
            )
        elif turn_index == 3:
            act = player_action or ""
            s_title, s_body = _shot_text(1)
            opening_directives.append(
                f"ONBOARDING_SCENE4 (SHOT 02 // FIRST CONTACT): 인트로 시네마틱의 '둘째 컷'을 펼칩니다. "
                f"저작 설정 — 제목: '{s_title}'. 설정: {s_body} "
                f"세린이 플레이어의 손목을 낚아채 일으켜 세우며 대사를 칩니다: '등록 안 됐지? 야, 그럼 너 아직 사람이네. 뛰어.' "
                f"신체 접촉·촉각적 긴장·퉁명스럽지만 보호하는 세린에 집중하십시오. "
                f"장소(고정): 반드시 '야외, 비 내리는 C-17 네온 골목'입니다. loop의 location_id가 'data-layer'·지하 등을 가리켜도 무시하고, "
                f"[LOCATION]을 지하/실내/데이터 코어로 옮기지 마십시오. "
                f"★ 이 장면의 필수 사건은 '세린이 손목을 낚아채며 함께 뛰자고 하는 것'입니다. 플레이어의 직전 행동(player_action: '{act}')은 1~2문장으로만 받고, "
                f"반드시 이 사건을 전개하십시오. 발광 물체·정체불명 신호 같은 새 떡밥을 만들지 마십시오. "
                f"이 장면의 모든 서사와 선택지는 반드시 한국어(Korean)로 작성되어야 합니다.\n"
                f"선택지 생성 가이드:\n"
                f" 1) '세린의 손을 잡고 뛴다'처럼 동행을 수락하는 선택지 (이 선택은 세린을 파티 동료로 합류시킵니다)\n"
                f" 2) '세린에게 왜 나를 돕는지 묻는다'처럼 관계를 확인하는 선택지\n"
                f" 3) '혼자 숨을 곳을 찾는다'처럼 세린을 경계하고 독자 탈출을 꾀하는 선택지 (이 선택 시 세린은 동료로 합류하지 않습니다)\n"
                f"플래그 및 전투 가이드:\n"
                f" - 플레이어가 세린과의 동행에 동의하고 따라가거나 신뢰하는 뉘앙스의 행동을 취했다면, 반환하는 JSON의 `world_delta.flags` 배열에 반드시 'met_se_rin'을 추가하고 'refused_se_rin'은 제외하십시오.\n"
                f" - 플레이어가 세린을 거부, 경계하거나 혼자 숨어서 지켜보는 등 독자 행동 뉘앙스를 취했다면, `world_delta.flags` 배열에 반드시 'refused_se_rin'을 추가하고 'met_se_rin'은 제외하십시오.\n"
                f" - 중요: 이 장면 역시 첫 접촉 단계이므로, 절대 전투를 시작하지 마십시오. world_delta.start_combat은 반드시 null이어야 합니다."
            )
        elif turn_index == 4:
            act = player_action or ""
            s_title, s_body = _shot_text(2)
            opening_directives.append(
                f"ONBOARDING_SCENE5 (SHOT 03 // IGNITION & CHASE): 인트로 시네마틱의 '셋째 컷'을 펼칩니다. "
                f"저작 설정 — 제목: '{s_title}'. 설정: {s_body} "
                f"엔진이 켜지고 헤드라이트가 붉게 찢어지며, 드론 수색등이 골목을 훑는 순간 추격이 시작됩니다. "
                f"고속 질주 액션·엔진의 굉음·감시망 돌파·바이크를 모는 세린의 거친 액팅에 집중하십시오. "
                f"장소(고정): 반드시 '야외, 비 내리는 C-17 네온 거리'(질주 중)입니다. loop의 location_id가 'data-layer'·지하 등을 가리켜도 무시하고, "
                f"[LOCATION]을 지하/실내로 옮기지 마십시오. "
                f"★ 이 장면의 필수 사건은 '세린과 함께 드론 추격을 뚫는 질주와 전투 돌입'입니다. 플레이어의 직전 행동(player_action: '{act}')은 1~2문장으로만 받고, "
                f"반드시 이 사건을 전개하십시오. 발광 물체·정체불명 신호 같은 새 떡밥을 만들지 마십시오. "
                f"이 장면의 모든 서사와 선택지는 반드시 한국어(Korean)로 작성되어야 합니다. 꽉 잡거나 뒤를 돌아보는 등의 선택지를 제공하십시오.\n"
                f"플래그 및 전투 가이드:\n"
                f" - 플레이어가 이전까지 세린과의 동행에 찬성했다면, `world_delta.flags`에 'met_se_rin'을 포함하십시오. 거절했다면 'refused_se_rin'을 포함하십시오.\n"
                f" - 중요: 관리자 IX의 추격 드론 포위망을 돌파하는 첫 번째 전투 인카운터가 지금 발생해야 합니다. `world_delta.start_combat`에 반드시 'patrol_ambush'를 지정하여 첫 전투를 시작하십시오."
            )

    bible = load_story_bible(scenario.scenario_id)
    entries = select_story_bible_entries(bible, loop, turn_index=turn_index)
    notes.extend(story_bible_notes(entries))

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
        session_synopsis = [
            "=== 오프닝 장면 지시 (최우선 · 현재 장면 이미지와 정합 필수) ===",
            *opening_directives,
            *session_synopsis,
        ]

    # The opening (turns 0-4) is a fully scripted 5-beat prologue driven by the
    # ONBOARDING_SCENE1-5 directives above (각성→세린 등장→다가오는 손→첫 접촉→추격+전투),
    # so node/junction steering must NOT run during it — at turn 4 the turn-based
    # walk (turns_per_layer=4) would otherwise place the player in layer 1
    # (night_market) and inject a steering note that contradicts the chase. The
    # earlier "세린 조우 사라짐" bug (generic free scenes overriding the anchor) is
    # already prevented because turns 0-4 are explicitly authored. Node/junction
    # steering resumes once the prologue ends, at turn 5 (the first act-1 scene).
    if turn_index >= 5:
        notes.extend(_route_director_notes(scenario, loop, turn_index))
        notes.extend(_route_junction_notes(scenario, loop, turn_index))

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
        session_synopsis=session_synopsis,
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


def _route_director_notes(scenario: ScenarioConfig, loop: LoopState, turn_index: int) -> list[str]:
    state = loop.state if isinstance(loop.state, dict) else {}
    status = route_status(state)
    if not status:
        return []
    node = status.get("node") or {}
    if not node:
        return []
    perspective = status.get("perspective") or {}
    leaderboard = status.get("ending_leaderboard") or []
    ending_labels = {str(e.get("id")): str(e.get("title", e.get("id"))) for e in scenario.endings}

    # A node stays `current` for turns_per_layer turns; without a "move on" signal the
    # GM re-describes the same place every turn (the explore 정체 / location stickiness
    # bug). Establish the node — and match its curated image — on the first scene, then
    # force forward motion on later scenes. Layer 0's first noted scene is turn 1, so
    # treat that as fresh too.
    per = max(1, DEFAULT_TURNS_PER_LAYER)
    fresh_node = int(turn_index) % per == 0 or int(turn_index) == 1

    kind = "고정 스토리 비트(임팩트 장면)" if node.get("anchor") else "동적 경유 장면"
    lines = [
        "=== 작전 노드 가이드 (ROUTE NODE STEERING) ===",
        f"현재 작전 노드: '{node.get('title') or node.get('label')}' · 유형 {node.get('label')} · {kind}.",
        "지침: 이번 장면은 이 노드를 무대로 전개하십시오. 노드 유형의 성격(전투/단서/시장/정비/사건/대면 등)을 장면 분위기와 선택지에 반영하되, 묘사·대사·선택지 텍스트는 자유롭게 창작하십시오.",
    ]
    node_image = str(node.get("image") or "").strip()
    if node_image and fresh_node:
        image_hint = node_image.rsplit("/", 1)[-1].rsplit(".", 1)[0].replace("-", " ").replace("_", " ")
        lines.append(
            f"주요 장면 이미지 정합성: 이 노드는 사전 제작 이미지 '{node_image}'를 사용합니다. "
            f"첫 단락에서 이미지가 보여주는 핵심 피사체/장소/행동을 반드시 묘사하십시오. "
            f"이미지 힌트: {image_hint}. 장면 제목, narration, visual_brief가 이 이미지와 어긋나면 안 됩니다."
        )
    if not fresh_node:
        lines.append(
            "진행 지침(반복 금지): 이 작전 노드에 이미 여러 장면 머물렀습니다. 직전 장면의 장소·구도·상황을 "
            "되풀이하지 말고 한 걸음 전진시키십시오 — 다른 구역(실내외·상/하층)으로 이동하거나, 새로운 인물·"
            "단서·위협을 등장시키거나, 추격·교섭·잠입처럼 국면을 바꾸십시오. scene.location과 첫 단락 묘사가 "
            "직전 장면과 분명히 달라야 합니다."
        )
    if perspective:
        lines.append(
            f"활성 시점(관점): '{perspective.get('lens')}' — {perspective.get('summary')} "
            "이 관점의 정서와 시선으로 장면을 서술하십시오."
        )
        crosses = perspective.get("crosses") or []
        if crosses:
            lines.append(
                "교차 실타래: 이 장면에 "
                + ", ".join(str(c) for c in crosses)
                + " 와 맞닿는 복선이나 여운을 은근히 깔아 여러 갈래의 이야기가 교차하는 느낌을 주십시오."
            )
    if leaderboard:
        top_id = str(leaderboard[0][0])
        lines.append(
            f"현재 루트가 향하는 결말 경향: '{ending_labels.get(top_id, top_id)}'. "
            "결말을 직접 언급하지 말고, 톤과 복선으로만 이 방향을 은유적으로 비추십시오."
        )
    return lines


def _route_junction_notes(scenario: ScenarioConfig, loop: LoopState, turn_index: int) -> list[str]:
    state = loop.state if isinstance(loop.state, dict) else {}
    options = junction_options(state, turn_index=turn_index)
    notes: list[str] = []
    if options:
        kinds = ", ".join(sorted({str(o.get("label")) for o in options if o.get("label")}))
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
