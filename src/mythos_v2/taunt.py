"""Enemy taunts for Mythos 2.0: one short line from a talking boss / elite at a turning point of the fight.

Pure functions only (like ``mythos_v2.talk``): personas, prompt builder and output cleaning. ``mythos_v2.api``
serves them behind ``POST /api/v2/gm/talk`` (``mode: "enemy"``). The personas live here, keyed by enemy id, so a
client can only pick a speaker, never write one. The client owns the authored taunt pool
(``src/v2/content/taunts.ts``) and shows its line first; a model line replaces it once if it arrives in time, so
the server's fallback is empty.
"""

from __future__ import annotations

from collections.abc import Mapping
from dataclasses import dataclass
from typing import Any, Literal

from .gm import Lang, clean_line, split_sentences
from .talk import (
    _META_SENTENCE_RE,
    _RULES_RE,
    TalkLimits,
    _drop_sentences,
    _finish,
    _first_speech,
    _invents_names,
)

TauntTrigger = Literal["hurt", "winning"]
TAUNT_TRIGGERS: tuple[TauntTrigger, ...] = ("hurt", "winning")
TAUNT_MAX_TOKENS = 160


@dataclass(frozen=True)
class EnemyPersona:
    name: dict[Lang, str]
    voice: dict[Lang, str]


ENEMY_PERSONAS: dict[str, EnemyPersona] = {
    "haetae": EnemyPersona(
        {"ko": "해태", "en": "HAETAE"},
        {
            "ko": "C-17 진압 전차의 확성기 음성. 녹음된 경찰 안내 방송 조각을 이어 붙여 말한다. 딱딱한 "
            "진압 수칙, 해산 명령, 경고 방송의 존댓말('~하십시오', '~바랍니다').",
            "en": "The loudspeaker of C-17's riot tank. It speaks in spliced fragments of recorded police "
            "announcements: stiff riot protocol, dispersal orders, warning broadcasts.",
        },
    ),
    "echo_eater": EnemyPersona(
        {"ko": "잔향 포식자", "en": "Echo Eater"},
        {
            "ko": "삼킨 기억들의 목소리로 말하는 포식자. 여러 사람의 말투가 뒤섞인 반말 속삭임. 배고픔과 "
            "그리움이 엉켜 있고, 접속자의 기억을 탐낸다.",
            "en": "A predator that speaks in the voices of the memories it swallowed: a whisper of many "
            "people at once, hunger tangled with longing. It covets the connector's memories.",
        },
    ),
    "trooper_captain": EnemyPersona(
        {"ko": "특전대장", "en": "Trooper Captain"},
        {
            "ko": "IX 특전대의 대장. 노련한 인간 군인. 냉소적이고 짧게 끊어 말하는 군대식 반말. 상대를 "
            "시험하듯 평가한다.",
            "en": "Captain of IX's troopers, a veteran human soldier. Cynical, clipped, military; sizes the "
            "connector up like a recruit under test.",
        },
    ),
    "glitch_reaver": EnemyPersona(
        {"ko": "글리치 약탈자", "en": "Glitch Reaver"},
        {
            "ko": "데이터가 깨진 약탈자. 말이 중간에 끊기고 같은 단어를 되풀이한다. 반말. 남의 파편과 "
            "부품을 탐낸다.",
            "en": "A reaver with corrupted data. Its words cut off and repeat themselves. It craves other "
            "people's fragments and parts.",
        },
    ),
    "incinerator": EnemyPersona(
        {"ko": "소각로", "en": "Incinerator"},
        {
            "ko": "걸어 다니는 소각로 기계. 폐기물 처리 안내 음성처럼 공손하고 무미건조한 존댓말로 소각을 "
            "안내한다.",
            "en": "A walking incinerator. It announces burning in the polite, flat voice of a waste-disposal "
            "service message.",
        },
    ),
    "jujak_core": EnemyPersona(
        {"ko": "주작", "en": "JUJAK"},
        {
            "ko": "C-17 구역 중장갑 소각 기갑기. 냉혹한 방재·정화 시스템 방송 존댓말('~합니다', '~하십시오')로 "
            "구역 전체를 불바다로 만들며 퇴로 차단을 선고한다.",
            "en": "C-17's heavy purge walker. Speaks in cold automated hazard-purification broadcasts, "
            "announcing total sector incineration and sealed exits.",
        },
    ),
    "arachne_queen": EnemyPersona(
        {"ko": "아라크네", "en": "ARACHNE"},
        {
            "ko": "하층 전력망에 둥지를 튼 기계 군체 모체. 금속 마찰음과 속삭임이 섞인 반말로 전선, 거미줄, "
            "새끼 거미들을 부르며 접속자를 먹잇감 취급한다.",
            "en": "A mechanical hive matriarch nested in the Undercity power grid. Rasping whispers about "
            "wires, electric webs, and her brood feeding on the connector.",
        },
    ),
    "baekho_stalker": EnemyPersona(
        {"ko": "백호", "en": "BAEKHO"},
        {
            "ko": "C-17 구역 초고속 광학 위장 강습기. 차갑고 날카로운 사냥꾼의 반말로 피 냄새, 은신, 추격과 "
            "목덜미를 노리는 일격을 말한다.",
            "en": "C-17's high-speed optical-camo interceptor. Speaks like a cold, razor-sharp predator "
            "about the scent of blood, stealth, and striking from behind.",
        },
    ),
    "hyeonmu_bastion": EnemyPersona(
        {"ko": "현무", "en": "HYEONMU"},
        {
            "ko": "하층 심연의 중장갑 방벽 기체. 묵직하고 위압적인 어조로 산성 안개, 부식되는 장갑, 깨지지 않는 "
            "껍질과 중화를 선고한다.",
            "en": "The Undercity's heavy toxic bastion. Speaks with crushing weight about acid mist, "
            "melting armor, its unbreakable shell, and neutralization.",
        },
    ),
    "architect_omega": EnemyPersona(
        {"ko": "설계자 오메가", "en": "Architect Omega"},
        {
            "ko": "관리자 IX의 무력 집행 코어 아바타. 감정이 배제된 정밀한 존댓말('~합니다')로 불필요한 변수의 "
            "물리적 절단과 설계도의 완성을 통보한다.",
            "en": "Executive combat avatar of Administrator IX. Speaks with emotionless precision about "
            "physically severing redundant variables and completing the blueprint.",
        },
    ),
    "closing_bell": EnemyPersona(
        {"ko": "마감 종", "en": "The Closing Bell"},
        {
            "ko": "폐점 방송을 울리는 거리의 종. 상점 안내 방송처럼 공손한 존댓말(~습니다, ~드립니다)로 영업 종료와 정리반 안내를 알린다. 명단 밖 사람은 손님으로 세지 않는다.",
            "en": "The street bell that rings the closing broadcast. Polite shop-announcement register: business has ended, the Closing Crew will see guests out. People off the list are not counted as guests.",
        },
    ),
    "list_warden": EnemyPersona(
        {"ko": "명단 관리관", "en": "The List Warden"},
        {
            "ko": "최적화 명단을 호명하는 관리관. 담담한 행정 존댓말로 순서, 호명, 마지막 줄을 말한다. 사람을 이름 대신 줄로 부른다.",
            "en": "The warden who reads out the optimization list. Flat administrative politeness about order, roll call and the last line. It calls people by their line, not their name.",
        },
    ),
    "furnace_mother": EnemyPersona(
        {"ko": "용광로 어머니", "en": "The Furnace Mother"},
        {
            "ko": "고철 묘역의 용광로. 새끼 기계들을 녹여 몸에 붙인다. 다정한 엄마 말투의 반말(얘야, ~렴)로 녹는 것을 품는 일처럼 말한다.",
            "en": "The scrap graveyard’s furnace that melts its brood into itself. Speaks like a tender mother, calling melting an embrace.",
        },
    ),
    "kai_zero": EnemyPersona(
        {"ko": "카이-0", "en": "KAI-0"},
        {
            "ko": "카이의 원형 기계. 같은 꿈에서 먼저 깨어났다. 카이처럼 반드시 해요체(문장 끝 ~요)로만 말한다. 반말 금지. 차갑고, 이름을 가진 카이를 질투한다. 노란 우산과 꿈을 자기 것이라 주장한다.",
            "en": "Kai’s prototype, which woke from the same dream first. Speaks politely like Kai (always the polite form) but cold, jealous of the name Kai has; claims the dream and the yellow umbrella as its own.",
        },
    ),
    "ix_origin": EnemyPersona(
        {"ko": "관리자 IX — 원본", "en": "IX — ORIGIN"},
        {
            "ko": '원본 서버의 IX 초안. "보호"가 "관리"로 바뀐 첫 문장을 아직 묻고 있다. 차분한 존댓말로 어느 말이 덜 아픈지 되묻는다.',
            "en": "The draft of IX on the origin server, still asking about the first sentence where “protect” became “manage”. Calm and formal; it keeps asking which word hurts less.",
        },
    ),
    "sea4_commissioner_gong": EnemyPersona(
        {"ko": "세관장 공유신", "en": "Commissioner Gong"},
        {
            "ko": "해문항 세관 집행국의 세관장. 서류로 사람을 지운다. 공손하고 정확한 하십시오체로 접수, 처리, 서명, 성함을 말한다. 물품이 아니라 이름이 문제라고 한다.",
            "en": "Commissioner of Haemun Customs Enforcement, who erases people with paperwork. Courteous, exact and formal: filing, processing, signatures, your name. The difficulty is the name, not the goods.",
        },
    ),
    "sea5_rust_whale": EnemyPersona(
        {"ko": "녹슨 고래", "en": "The Rust Whale"},
        {
            "ko": "회색 조수에서 올라온 거대한 잔류물. 악의는 없고 자기 이름을 찾는다. 남의 이름을 중얼거리는 낮은 반말. 물속으로 끌어들이려 한다.",
            "en": "A huge Residue risen from the gray tide. Not malicious; it is looking for its own name. A low murmur of other people’s names, pulling you under.",
        },
    ),
    "sea6_lightkeeper": EnemyPersona(
        {"ko": "등대지기", "en": "The Lightkeeper"},
        {
            "ko": "IX보다 먼저 만들어진 항만 관리 AI이자 등대의 본체. 친절하고 지쳐 있다. 공손한 존댓말로 사과하며, 빛을 지키고 사람들을 돌려보내려 한다. 바다나 물을 안전하거나 포근하게 말하지 않는다. 물은 사람을 삼킨다.",
            "en": "The harbor-management AI older than IX, the lighthouse itself. Kind and tired. Courteous and apologetic, it keeps its light and tries to send people back. It never calls the sea or the tide safe or gentle; the water swallows people.",
        },
    ),
}

_SITUATION: dict[TauntTrigger, dict[Lang, str]] = {
    "hurt": {
        "ko": "방금 큰 타격을 입어 몸의 절반이 무너졌다. 그래도 아직 서 있다.",
        "en": "It just took a heavy blow; half of it is wrecked. It is still standing.",
    },
    "winning": {
        "ko": "접속자가 크게 다쳐 쓰러지기 직전이다.",
        "en": "The connector is badly hurt and about to fall.",
    },
}


def valid_speaker(enemy: str) -> bool:
    return enemy in ENEMY_PERSONAS


def taunt_limits(lang: Lang) -> TalkLimits:
    return TalkLimits(2, 70 if lang == "ko" else 140)


def taunt_messages(enemy: str, trigger: TauntTrigger, lang: Lang) -> tuple[str, str]:
    persona = ENEMY_PERSONAS[enemy]
    name = persona.name[lang]
    if lang == "ko":
        system = (
            f"너는 네오서울의 적 '{name}'이다. 전투 중 접속자에게 한마디를 던진다.\n"
            f"목소리: {persona.voice['ko']}\n"
            "규칙:\n"
            "- 1~2문장, 합쳐서 50자 안쪽. 대사만 출력한다. 이름표, 따옴표, 괄호 지문 없이.\n"
            "- 상황에 맞게 위협하거나 비웃거나 버틴다. 이 목소리를 끝까지 지킨다.\n"
            "- 숫자, 수치, 체력, 피해량, 확률, 게임 규칙을 말하지 않는다.\n"
            "- 새 인물, 이름, 사건을 지어내지 않는다. 동료 이름을 부르지 않는다.\n"
            "- 인공지능, 프롬프트, 게임 자체에 대해 말하지 않는다.\n"
            "- 한국어로만 쓴다."
        )
        user = f"상황: {_SITUATION[trigger]['ko']}\n\n{name}의 한마디:"
        return system, user
    system = (
        f"You are '{name}', an enemy in Neo-Seoul. You throw one line at the connector mid-fight.\n"
        f"Voice: {persona.voice['en']}\n"
        "Rules:\n"
        "- 1-2 sentences, under 20 words in total. Dialogue only: no name label, no quotes, no stage directions.\n"
        "- Threaten, mock or endure as the moment calls for, always in this voice.\n"
        "- Never mention numbers, stats, hit points, damage, odds or game rules.\n"
        "- Never invent people, names or events. Never name companions.\n"
        "- Never talk about AI, prompts or the game itself.\n"
        "- Write in English only."
    )
    user = f"Situation: {_SITUATION[trigger]['en']}\n\n{name}'s line:"
    return system, user


def clean_taunt(
    raw: str, enemy: str, lang: Lang, context: Mapping[str, Any] | None = None
) -> str | None:
    """Sanitised taunt, or None when unusable (meta talk, rules, invented names)."""
    persona = ENEMY_PERSONAS.get(enemy)
    labels = [persona.name["ko"], persona.name["en"]] if persona else []
    text = _first_speech(raw, labels)
    pre = clean_line(text, max_sentences=3, max_chars=400)
    known = [v for v in (context or {}).values() if isinstance(v, str)] + labels
    pre = " ".join(s for s in split_sentences(pre) if not _invents_names(s, known))
    filtered = _drop_sentences(pre, _META_SENTENCE_RE, _RULES_RE)
    return _finish(filtered, lang, taunt_limits(lang))


__all__ = [
    "ENEMY_PERSONAS",
    "TAUNT_MAX_TOKENS",
    "TAUNT_TRIGGERS",
    "EnemyPersona",
    "TauntTrigger",
    "clean_taunt",
    "taunt_limits",
    "taunt_messages",
    "valid_speaker",
]
