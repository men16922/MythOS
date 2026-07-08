"""Shared deterministic fallback-scene prose (single source of truth).

When the LLM generation fails (parse error after a repair attempt) the director
serves a canned fallback scene; when a partially-valid payload is missing fields
the parser fills repair defaults. Both used to carry **duplicate** neo-seoul C-17
prose hardcoded in ``director.py`` and ``parser.py``. They now share ``DEFAULT_FALLBACK``.

A scenario can override the visible fallback scene by authoring
``resources/<scenario>/directives/fallback.md`` → ``NarrativeContext.fallback_scene``
(a dict of the same shape); ``director._fallback_payload`` prefers it over this
default. The parser repair path has no scenario context, so it always uses
``DEFAULT_FALLBACK["repair"]`` — acceptable because repair only fills missing
fields on an otherwise-valid payload, while the visible fallback scene (the one
tests assert) goes through the director.
"""

from __future__ import annotations

from typing import Any

# The full canned fallback SCENE (director path). The ``narration_with_action``
# string is the part that follows the "당신은 {player_action}.\n\n" prefix the
# director prepends. ``choices[].suffix`` becomes ``choice_<turn+1>_<suffix>``.
DEFAULT_FALLBACK: dict[str, Any] = {
    "title_default": "C-17 정전 구역",
    "title_novelty": "C-17의 바뀐 경고 신호",
    "title_with_action": "빗속의 다음 골목",
    "location": "C-17 네온 골목 (야외, 비)",
    # Variant-neutral: a deterministic last-resort beat must NOT name a specific
    # companion (Se-rin), or it contradicts loop-2+ opening variants whose first
    # face is someone else. Lone-protagonist framing works for every loop.
    "narration_no_action": (
        "C-17 지하보도 비상등이 한 줄씩 꺼진다. 젖은 콘크리트 바닥 위로 당신의 이름 없는 신호가 "
        "희미하게 번지고, 출구 쪽에서는 감시 드론의 붉은 수색등이 빗줄기를 가르며 내려온다.\n\n"
        "관리망이 신호를 다시 붙잡기 전에 움직여야 한다. 반쯤 내려온 셔터 아래 배수로 쪽으로 몸을 낮춰 "
        "빠지거나, 드론의 수색 패턴을 먼저 읽어 막히지 않는 길을 골라야 한다."
    ),
    "narration_with_action": (
        "지하보도 천장에 붙은 감시 렌즈가 뒤늦게 고개를 돌린다. 빗물이 계단을 타고 흘러내리고, 멀리서 "
        "순찰 드론의 프로펠러 소리가 좁은 통로 안으로 밀려온다. 지금 멈추면 관리망이 신호를 다시 붙잡는다. "
        "앞으로 움직여야 한다."
    ),
    "novelty_hint_notes": " 지난 루프와 같은 길을 피하려는 듯, 골목 끝 신호등이 한 박자 늦게 붉게 바뀐다.",
    "novelty_hint_memories": " 보관된 기억의 잔상이 스치지만, 이번에는 같은 장면으로 굳어지지 않는다.",
    "objective_turn0": "C-17 정전 구역을 빠져나간다.",
    "visual_brief": (
        "Neo-Seoul C-17 underpass in heavy rain, emergency lights failing, red surveillance "
        "drone beams, a lone unregistered figure crouched low on the wet concrete, "
        "half-closed security shutter, cinematic cyberpunk chase scene."
    ),
    "choices": [
        {"suffix": "approach", "label": "배수로 쪽으로 몸을 낮춰 빠져나간다", "intent": "explore"},
        {"suffix": "listen", "label": "드론의 수색등 패턴을 먼저 읽는다", "intent": "interact"},
    ],
    # Parser repair-fill defaults (shorter; fill individual missing fields).
    "repair": {
        "title": "C-17 정전 구역",
        "location": "C-17 네온 골목 (야외, 비)",
        "narration": (
            "C-17 지하보도 비상등이 꺼지고, 빗물 위로 감시 드론의 붉은 수색등이 번진다. "
            "관리망이 다시 신호를 붙잡기 전에, 반쯤 내려온 셔터 아래로 몸을 낮춰 빠져나가야 한다."
        ),
        "visual_brief": (
            "Neo-Seoul C-17 underpass in rain, red drone searchlights, a lone unregistered figure "
            "crouched low, wet concrete, half-closed shutter, cinematic cyberpunk chase."
        ),
        "choice_label": "배수로 쪽으로 몸을 낮춰 빠져나간다",
    },
}


# English counterpart of DEFAULT_FALLBACK (same neo-seoul C-17 opening beat, English
# prose). Selected by ``default_fallback("en")`` so the deterministic fallback scene
# renders in English when the active language is English. The ``visual_brief`` strings
# are language-independent image briefs (already English) and are reused verbatim.
DEFAULT_FALLBACK_EN: dict[str, Any] = {
    "title_default": "C-17 Blackout Zone",
    "title_novelty": "C-17's Changed Warning Signal",
    "title_with_action": "The Next Alley in the Rain",
    "location": "C-17 Neon Alley (outdoors, rain)",
    # Variant-neutral (see the Korean note above): no named companion, so it never
    # contradicts a loop-2+ opening variant.
    "narration_no_action": (
        "The emergency lights of the C-17 underpass go out one row at a time. Across the wet "
        "concrete your nameless signal bleeds faintly, and from the exit a surveillance drone's "
        "red searchlight cuts down through the rain.\n\n"
        "You have to move before the control grid catches the signal again. Crouch low and slip "
        "for the drainage channel under the half-closed shutter, or read the drone's search "
        "pattern first and pick a path that won't be cut off."
    ),
    "narration_with_action": (
        "The surveillance lens on the underpass ceiling turns its head a beat too late. Rainwater "
        "streams down the stairs, and from far off a patrol drone's propellers push their sound "
        "into the narrow corridor. Stop now and the control grid catches your signal again. You "
        "have to keep moving forward."
    ),
    "novelty_hint_notes": (
        " As if avoiding the same path as the last loop, the signal light at the alley's end "
        "turns red a beat late."
    ),
    "novelty_hint_memories": (
        " An afterimage of a stored memory grazes past, but this time it does not harden into the "
        "same scene."
    ),
    "objective_turn0": "Escape the C-17 blackout zone.",
    "visual_brief": (
        "Neo-Seoul C-17 underpass in heavy rain, emergency lights failing, red surveillance "
        "drone beams, a lone unregistered figure crouched low on the wet concrete, "
        "half-closed security shutter, cinematic cyberpunk chase scene."
    ),
    "choices": [
        {"suffix": "approach", "label": "Slip low into the drainage channel", "intent": "explore"},
        {"suffix": "listen", "label": "Read the drone's searchlight pattern first", "intent": "interact"},
    ],
    "repair": {
        "title": "C-17 Blackout Zone",
        "location": "C-17 Neon Alley (outdoors, rain)",
        "narration": (
            "The C-17 underpass emergency lights die, and a surveillance drone's red searchlight "
            "bleeds across the rainwater. Before the control grid catches the signal again, you "
            "have to crouch low and slip out under the half-closed shutter."
        ),
        "visual_brief": (
            "Neo-Seoul C-17 underpass in rain, red drone searchlights, a lone unregistered figure "
            "crouched low, wet concrete, half-closed shutter, cinematic cyberpunk chase."
        ),
        "choice_label": "Slip low into the drainage channel",
    },
}


# Per-language registry. ``DEFAULT_FALLBACK`` stays exported as the Korean default for
# back-compat (parser.py repair path imports it directly, language-agnostic).
DEFAULT_FALLBACK_BY_LANG: dict[str, dict[str, Any]] = {
    "ko": DEFAULT_FALLBACK,
    "en": DEFAULT_FALLBACK_EN,
}


def default_fallback(language: str = "ko") -> dict[str, Any]:
    """Return the deterministic fallback scene dict for ``language`` (Korean default)."""
    return DEFAULT_FALLBACK_BY_LANG.get(language, DEFAULT_FALLBACK)


__all__ = ["DEFAULT_FALLBACK", "DEFAULT_FALLBACK_EN", "DEFAULT_FALLBACK_BY_LANG", "default_fallback"]
