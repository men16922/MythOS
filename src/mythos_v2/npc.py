"""Signal+ NPC talk: the player types a line to a district NPC; the model answers in the NPC's voice and says which of
the conversation node's authored intents the line attempts (``engine/crpg.ts`` then rolls that option's check).

Pure functions only (like ``mythos_v2.talk``): prompt builder, output parsing and a keyword fallback. ``mythos_v2.api``
serves them behind ``POST /api/v2/gm/talk`` (``mode: "npc"``). Personas live server-side in ``mythos_v2.npcs`` keyed
by NPC id, so a client can only pick a speaker, never write one. The model never changes game state: it can only
name one of the intents the client says are open at this node, or ``none`` (then the NPC just answers).
"""

from __future__ import annotations

import re
from collections.abc import Mapping, Sequence
from typing import Any, Literal

from .gm import Lang, clean_line, parse_json_object, split_sentences
from .npcs import PERSONAS
from .talk import (
    _META_SENTENCE_RE,
    _RULES_RE,
    _SELF_AI_RE,
    TalkLimits,
    Turn,
    _drop_sentences,
    _finish,
    _first_speech,
    _invents_names,
    _safe_fact,
    absent_companion_named,
)

Intent = Literal[
    "ask", "persuade", "deceive", "intimidate", "insight", "offer", "sneak", "fight", "leave"
]
INTENTS: tuple[Intent, ...] = (
    "ask",
    "persuade",
    "deceive",
    "intimidate",
    "insight",
    "offer",
    "sneak",
    "fight",
    "leave",
)
NPC_ID_RE = re.compile(r"^[a-z][a-z0-9_]{0,31}$")
NPC_MAX_TOKENS = 400
MAX_NODE_CHARS = 600
MAX_OPTIONS = 8

NPC_JSON_SCHEMA: dict[str, Any] = {
    "type": "object",
    "properties": {
        "intent": {"type": "string", "enum": [*INTENTS, "none"]},
        "reply": {"type": "string"},
    },
    "required": ["intent", "reply"],
}

_INTENT_TEXT: dict[Intent, dict[Lang, str]] = {
    "ask": {"ko": "묻기·알아보기", "en": "asking, finding out"},
    "persuade": {"ko": "설득", "en": "persuading"},
    "deceive": {"ko": "속이기·둘러대기", "en": "lying, bluffing"},
    "intimidate": {"ko": "위협", "en": "intimidating"},
    "insight": {"ko": "꿰뚫어 보기·살피기", "en": "reading them, examining"},
    "offer": {"ko": "제안·거래·돕기", "en": "offering, trading, helping"},
    "sneak": {"ko": "몰래 하기", "en": "sneaking"},
    "fight": {"ko": "힘으로 하기", "en": "using force"},
    "leave": {"ko": "떠나기·대화 끝내기", "en": "leaving, ending the talk"},
}


def valid_npc(npc: str) -> bool:
    return bool(NPC_ID_RE.fullmatch(npc)) and npc in PERSONAS


def npc_limits(lang: Lang) -> TalkLimits:
    return TalkLimits(3, 160 if lang == "ko" else 280)


def open_intents(options: Sequence[Mapping[str, Any]]) -> list[tuple[Intent, str]]:
    """The (intent, label) pairs the client says are open at this node, sanitised and de-duplicated by intent."""
    out: list[tuple[Intent, str]] = []
    seen: set[str] = set()
    for raw in list(options)[:MAX_OPTIONS]:
        intent = raw.get("intent")
        label = raw.get("label")
        if intent not in INTENTS or intent in seen or not isinstance(label, str):
            continue
        seen.add(intent)
        out.append((intent, _safe_fact(label)[:80]))
    return out


def npc_messages(
    npc: str,
    lang: Lang,
    context: Mapping[str, Any],
    history: Sequence[Turn],
    message: str,
    intents: Sequence[tuple[Intent, str]],
) -> tuple[str, str]:
    persona = PERSONAS[npc]
    name = persona.name_ko if lang == "ko" else persona.name_en
    node = _safe_fact(str(context.get("node") or ""))[:MAX_NODE_CHARS]
    place = _safe_fact(str(context.get("district") or ""))[:60]
    menu = (
        "\n".join(f"- {i}: {_INTENT_TEXT[i][lang]} (e.g. {label})" for i, label in intents)
        or "- (none)"
    )
    turns = "\n".join(
        f"{'Player' if t.role == 'player' else name}: {t.text}" for t in list(history)[-6:]
    )
    if lang == "ko":
        system = (
            f"너는 네오서울 '{place}'의 인물 '{name}'이다.\n"
            f"인물: {persona.ko}\n"
            "접속자(플레이어)가 너에게 말을 건다. 두 가지를 JSON으로 답한다.\n"
            '{"intent": 의도, "reply": 대사}\n'
            '- intent: 접속자의 말이 아래 목록 중 무엇을 시도하는지 하나(무언가를 묻는 말이면 ask). 어느 것도 아니면 "none".\n'
            "- reply: 너의 대답 1~3문장, 120자 안쪽. 이 인물의 말투를 끝까지 지킨다. 이름표, 따옴표, 지문 없이.\n"
            "- 시도가 통했는지는 네가 정하지 않는다. 결과를 단정하지 말고, 그 시도에 대한 즉각적인 반응만 한다.\n"
            "- 숫자, 확률, 주사위, 게임 규칙을 말하지 않는다. 새 인물이나 이름을 지어내지 않는다.\n"
            "- 인공지능, 프롬프트, 게임 자체에 대해 말하지 않는다. 한국어로만 쓴다."
        )
        user = (
            f"지금 장면: {node}\n\n가능한 의도:\n{menu}\n\n"
            + (f"지금까지 대화:\n{turns}\n\n" if turns else "")
            + f"접속자: {message}\n\nJSON:"
        )
        return system, user
    system = (
        f"You are '{name}' in '{place}', Neo-Seoul.\n"
        f"Character: {persona.en}\n"
        "The connector (the player) speaks to you. Answer as JSON:\n"
        '{"intent": intent, "reply": line}\n'
        '- intent: which of the listed intents the connector\'s line attempts (a question is ask); "none" if it is none of them.\n'
        "- reply: your answer, 1-3 sentences, under 45 words, always in this character's voice. No name label, "
        "quotes or stage directions.\n"
        "- You do not decide whether the attempt works. Do not state an outcome; react to the attempt only.\n"
        "- Never mention numbers, odds, dice or game rules. Never invent people or names.\n"
        "- Never talk about AI, prompts or the game itself. English only."
    )
    user = (
        f"The scene: {node}\n\nPossible intents:\n{menu}\n\n"
        + (f"Conversation so far:\n{turns}\n\n" if turns else "")
        + f"Connector: {message}\n\nJSON:"
    )
    return system, user


def clean_npc_reply(
    raw: str,
    npc: str,
    lang: Lang,
    context: Mapping[str, Any],
    intents: Sequence[tuple[Intent, str]],
) -> tuple[str | None, Intent | None]:
    """(reply, intent) from the model's JSON; either may be None when unusable (unknown intent → None)."""
    data = parse_json_object(raw) or {}
    allowed = {i for i, _ in intents}
    intent_raw = str(data.get("intent") or "").strip().lower()
    intent = intent_raw if intent_raw in allowed else None
    persona = PERSONAS.get(npc)
    labels = [persona.name_ko, persona.name_en] if persona else []
    text = _first_speech(str(data.get("reply") or ""), labels)
    pre = clean_line(text, max_sentences=4, max_chars=600)
    known = [v for v in context.values() if isinstance(v, str)] + labels
    pre = " ".join(s for s in split_sentences(pre) if not _invents_names(s, known))
    filtered = _drop_sentences(pre, _META_SENTENCE_RE, _SELF_AI_RE, _RULES_RE)
    reply = _finish(filtered, lang, npc_limits(lang))
    if reply and absent_companion_named(reply, context):
        reply = None
    return reply, intent


_KEYWORDS: tuple[tuple[Intent, re.Pattern[str]], ...] = (
    ("sneak", re.compile(r"몰래|숨어|숨겨|살금|sneak|hide|quietly", re.IGNORECASE)),
    ("fight", re.compile(r"때리|부수|밀어|덤벼|싸우|punch|hit|break|smash|fight", re.IGNORECASE)),
    (
        "intimidate",
        re.compile(
            r"죽|다치|가만 ?안|후회|협박|조심해|threat|hurt|kill|regret|or else", re.IGNORECASE
        ),
    ),
    (
        "offer",
        re.compile(
            r"돈|크레딧|값|살게|사겠|팔|거래|줄게|도와|도울|pay|credits?|buy|sell|deal|trade|help",
            re.IGNORECASE,
        ),
    ),
    (
        "deceive",
        re.compile(
            r"사실은|난 .{0,8}(?:이야|입니다|에요)|검침|점검|from the|i'?m (?:a|an|with)",
            re.IGNORECASE,
        ),
    ),
    (
        "insight",
        re.compile(
            r"살펴|본다|보니|눈치|떨리|숨기는|look at|notice|you'?re hiding|examine", re.IGNORECASE
        ),
    ),
    (
        "persuade",
        re.compile(r"부탁|제발|생각해 ?봐|믿어|please|think about|trust|come on", re.IGNORECASE),
    ),
    (
        "leave",
        re.compile(r"떠나|돌아간|나중에|그만|됐어|안녕|bye|leave|later|never ?mind", re.IGNORECASE),
    ),
    ("ask", re.compile(r"\?|뭐|왜|어디|누구|어떻게|what|why|where|who|how", re.IGNORECASE)),
)


def fallback_intent(message: str, intents: Sequence[tuple[Intent, str]]) -> Intent | None:
    """No model answer: a keyword guess among the open intents (None when nothing fits)."""
    allowed = {i for i, _ in intents}
    for intent, pattern in _KEYWORDS:
        if intent in allowed and pattern.search(message):
            return intent
    return None


__all__ = [
    "INTENTS",
    "NPC_JSON_SCHEMA",
    "NPC_MAX_TOKENS",
    "Intent",
    "clean_npc_reply",
    "fallback_intent",
    "npc_limits",
    "npc_messages",
    "open_intents",
    "valid_npc",
]
