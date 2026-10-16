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
