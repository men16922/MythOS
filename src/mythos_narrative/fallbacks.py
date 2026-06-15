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
    "narration_no_action": (
        "C-17 지하보도 비상등이 한 줄씩 꺼진다. 젖은 콘크리트 바닥 위로 당신의 이름 없는 신호가 "
        "희미하게 번지고, 출구 쪽에서는 감시 드론의 붉은 수색등이 빗줄기를 가르며 내려온다.\n\n"
        "정세린은 바이크를 세운 채 뒤돌아본다. 그녀는 설명을 길게 하지 않는다. 당신 손목의 말소 표식을 "
        "확인하더니, 낮게 말한다. \"등록 안 됐지? 그럼 아직 사람이야. 뛰어.\"\n\n"
        "셔터가 반쯤 내려오고 있다. 세린의 손을 잡고 배수로 쪽으로 뛰거나, 드론의 수색 패턴을 먼저 읽어 "
        "막히지 않는 길을 골라야 한다."
    ),
    "narration_with_action": (
        "세린이 젖은 재킷 소매를 잡아끌고, 지하보도 천장에 붙은 감시 렌즈가 뒤늦게 고개를 돌린다. "
        "빗물이 계단을 타고 흘러내리고, 멀리서 순찰 드론의 프로펠러 소리가 좁은 통로 안으로 밀려온다. "
        "지금 멈추면 관리망이 신호를 다시 붙잡는다. 앞으로 움직여야 한다."
    ),
    "novelty_hint_notes": " 지난 루프와 같은 길을 피하려는 듯, 골목 끝 신호등이 한 박자 늦게 붉게 바뀐다.",
    "novelty_hint_memories": " 보관된 기억의 잔상이 스치지만, 이번에는 같은 장면으로 굳어지지 않는다.",
    "objective_turn0": "세린과 함께 C-17 정전 구역을 빠져나간다.",
    "visual_brief": (
        "Neo-Seoul C-17 underpass in heavy rain, emergency lights failing, red surveillance "
        "drone beams, Jung Se-rin on a motorbike reaching for the player, wet concrete, "
        "half-closed security shutter, cinematic cyberpunk chase scene."
    ),
    "choices": [
        {"suffix": "approach", "label": "세린을 따라 배수로로 뛰어든다", "intent": "explore"},
        {"suffix": "listen", "label": "드론의 수색등 패턴을 먼저 읽는다", "intent": "interact"},
    ],
    # Parser repair-fill defaults (shorter; fill individual missing fields).
    "repair": {
        "title": "C-17 정전 구역",
        "location": "C-17 네온 골목 (야외, 비)",
        "narration": (
            "C-17 지하보도 비상등이 꺼지고, 빗물 위로 감시 드론의 붉은 수색등이 번진다. "
            "정세린은 바이크 옆에서 손을 내밀며 말한다. \"등록 안 됐지? 그럼 아직 사람이야. 뛰어.\""
        ),
        "visual_brief": (
            "Neo-Seoul C-17 underpass in rain, red drone searchlights, Jung Se-rin reaching out, "
            "wet concrete, half-closed shutter, cinematic cyberpunk chase."
        ),
        "choice_label": "세린을 따라 배수로로 뛰어든다",
    },
}


__all__ = ["DEFAULT_FALLBACK"]
