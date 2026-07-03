"""In-loop session memory: a compact beat ledger + rolling synopsis.

The problem this solves: an LLM GM with only terse event tuples in context tends
to re-describe the same place/NPC and drift into repetitive, throughline-less
scenes. The fix here is *state-grounding + summarization memory*, not retrieval:

- ``_beats`` — an ordered, compact ledger of what actually happened each turn
  (the node stood on, the active perspective, the scene title, the player action).
- a **rolling synopsis** synthesized deterministically from that ledger (no extra
  LLM call) — "the story so far", always injected so new scenes continue from it.
- ``_recent_narration`` — the last couple of scenes' prose verbatim, so the
  immediate scene-to-scene continuity (place, people, mood) does not reset.

Everything rides on ``loop.state`` (JSONB), so persistence and context injection
need no schema change and no signature churn. This is sized for a single 40-60
turn session; cross-loop recall stays in run summaries / shards.
"""

from __future__ import annotations

from typing import Any

from mythos_core.models import Scene
from mythos_runtime.route_runtime import route_status

BEATS_KEY = "_beats"
RECENT_NARRATION_KEY = "_recent_narration"

MAX_BEATS = 40
RECENT_NARRATION_KEEP = 2
NARRATION_TRIM = 420


def record_beat(
    state: dict[str, Any],
    *,
    scene: Scene,
    player_action: str | None = None,
) -> dict[str, Any]:
    """Append a compact beat for ``scene`` and refresh the recent-prose window.

    Idempotent per turn: re-committing the same turn index overwrites rather than
    duplicating its beat.
    """
    if not isinstance(state, dict):
        return state

    status = route_status(state) or {}
    node = status.get("node") or {}
    perspective = status.get("perspective") or {}

    beat = {
        "t": int(scene.turn_index),
        "title": scene.title,
        "location": scene.location,
    }
    if node:
        beat["node"] = node.get("title") or node.get("label")
        beat["type"] = node.get("label")
        beat["anchor"] = bool(node.get("anchor"))
    if perspective:
        beat["lens"] = perspective.get("lens")
        if perspective.get("summary"):
            beat["gist"] = perspective.get("summary")
    if player_action:
        beat["action"] = player_action

    new_state = dict(state)
    beats = [b for b in new_state.get(BEATS_KEY, []) if isinstance(b, dict)]
    beats = [b for b in beats if b.get("t") != beat["t"]]
    beats.append(beat)
    beats.sort(key=lambda b: b.get("t", 0))
    new_state[BEATS_KEY] = beats[-MAX_BEATS:]

    narration = (scene.narration or "").strip()
    if narration:
        recent = [
            r
            for r in new_state.get(RECENT_NARRATION_KEY, [])
            if isinstance(r, dict) and r.get("t") != beat["t"]
        ]
        recent.append({"t": beat["t"], "text": narration[:NARRATION_TRIM]})
        recent.sort(key=lambda r: r.get("t", 0))
        new_state[RECENT_NARRATION_KEY] = recent[-RECENT_NARRATION_KEEP:]

    return new_state


# IX's loop-recognition, escalating with the iteration count: early on the
# Administrator only registers a statistical anomaly; deeper loops read as growing,
# unsettling awareness that this signal has stood here before. Picked by loop index
# (clamped) so repetition of the *same* loop stays stable while later loops deepen.
_IX_LOOP_LINES: tuple[str, ...] = (
    "이 신호에는… 통계적 잔상이 있군. 최적화 오차 범위를 벗어난다.",
    "또다시 같은 좌표. 너는 이미 여기 서 본 적이 있다, 이상현상.",
    "반복은 버그다. 그리고 나는 버그를 기억하도록 갱신되었다 — 너를.",
    "몇 번째지? 나는 세었다. 너의 각 소거를. 그런데도 너는 돌아온다.",
    "우리는 이 대화를 이미 했다. 결말도 안다. 그런데 왜 이번엔 달라 보이지?",
)


def _ix_loop_line(loop_index: int) -> str:
    """IX's recognition line for the given (>=2) loop iteration, escalating."""
    idx = max(0, min(int(loop_index) - 2, len(_IX_LOOP_LINES) - 1))
    return _IX_LOOP_LINES[idx]


def build_session_synopsis(state: dict[str, Any]) -> list[str]:
    """Deterministically synthesize 'story so far' + recent-prose context notes."""
    if not isinstance(state, dict):
        return []
    beats = [b for b in state.get(BEATS_KEY, []) if isinstance(b, dict)]
    recent = [r for r in state.get(RECENT_NARRATION_KEY, []) if isinstance(r, dict)]
    if not beats and not recent:
        return []

    notes: list[str] = []

    loop_index = int(state.get("_loop_index", 1) or 1)
    if loop_index > 1:
        ix_line = _ix_loop_line(loop_index)
        notes.append(
            f"=== 루프 인지 (LOOP AWARENESS) ===\n"
            f"지침: 이것은 커넥터의 {loop_index}번째 반복 루프다. 세계와 인물(특히 관리자 IX)은 "
            "이 반복을 희미하게 감지할 수 있다 — 기시감, '또 너인가' 같은 인식, 미세하게 달라진 "
            "반응을 드물게(과하지 않게) 드러내라. 단, 플레이어의 이전 루프 선택을 구체적으로 "
            "안다고 단정하지는 말 것.\n"
            f"IX 참고 대사(있는 그대로 쓰지 말고 이 톤·인식 수준을 참고): \"{ix_line}\""
        )

    if beats:
        # Anchor beats are the load-bearing story decisions; collapse consecutive
        # runs of the same node (the route lingers on a node for several turns).
        anchors = _collapse_consecutive(
            [b for b in beats if b.get("anchor") and b.get("lens")], key="node"
        )
        notes.append("=== 이번 루프 줄거리 (STORY SO FAR) ===")
        notes.append(
            "지침: 아래는 이번 루프에서 실제로 일어난 일이다. 새 장면은 여기서 자연스럽게 "
            "이어지게 하고, 이미 묘사한 장소·인물·사건을 똑같이 반복 서술하지 말 것. "
            "특히 첫 문장을 직전 장면과 같은 환경·날씨·냄새·분위기 묘사로 다시 열지 말고, "
            "매 장면 도입부를 새로운 사건·대사·행동·발견으로 시작하라."
        )
        # When the location has not changed for several beats, the model tends to
        # re-describe the same ambient setting each turn; tell it to skip that.
        recent_locations = [
            str(b.get("location") or "").strip() for b in beats[-3:] if b.get("location")
        ]
        if len(recent_locations) >= 2 and len(set(recent_locations)) == 1:
            notes.append(
                "주의: 장소가 직전 장면과 같다. 배경(환경·날씨·냄새·조명) 묘사를 처음부터 "
                "다시 깔지 말고, 첫 문장부터 새로운 전개(사건·대사·이동·결정)로 바로 진입하라."
            )
        if anchors:
            spine = " → ".join(
                f"{b.get('node')}({_short(b.get('lens'))})" for b in anchors
            )
            notes.append(f"주요 전환점: {spine}")
            for b in anchors[-3:]:
                if b.get("gist"):
                    notes.append(f" - {b.get('node')}: {_short(b.get('gist'), 90)}")
        titles: list[str] = []
        for b in beats:
            title = _short(b.get("title"), 40)
            if title and (not titles or titles[-1] != title):
                titles.append(title)
        if len(titles) > 1:
            notes.append(f"최근 흐름: {' · '.join(titles[-4:])}")

    if recent:
        notes.append("=== 직전 장면 원문 (이어서 작성) ===")
        for r in recent:
            text = str(r.get("text", "")).strip()
            if text:
                notes.append(text)

    return notes


def _collapse_consecutive(beats: list[dict[str, Any]], *, key: str) -> list[dict[str, Any]]:
    """Keep the latest beat of each run of consecutive beats sharing key value."""
    collapsed: list[dict[str, Any]] = []
    for beat in beats:
        if collapsed and collapsed[-1].get(key) == beat.get(key):
            collapsed[-1] = beat
        else:
            collapsed.append(beat)
    return collapsed


def _short(value: Any, limit: int = 60) -> str:
    text = str(value or "").strip()
    return text if len(text) <= limit else text[: limit - 1] + "…"


__all__ = [
    "BEATS_KEY",
    "RECENT_NARRATION_KEY",
    "build_session_synopsis",
    "record_beat",
]
