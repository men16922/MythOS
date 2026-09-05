"""Multi-turn in-process narrative repetition check.

Drives the real Ollama director (dual-model storyteller->parser) over N turns
with an in-memory store (no Docker) and reports whether abstract SF phrasing
repeats scene-to-scene — the cross-scene signal the warm single-sample smoke
cannot show. Verifies the STORY_SYSTEM_PROMPT register reframe.

Run: .venv/bin/python scratch/narrative_multiturn_check.py [turns]
"""

from __future__ import annotations

import sys
from collections import Counter

sys.path.insert(0, "tests")  # reuse the test in-memory store
from test_session_combat import _InMemoryStore  # type: ignore  # noqa: E402

from mythos_narrative.director import NarrativeDirector  # noqa: E402
from mythos_runtime.options import RuntimeOptions  # noqa: E402
from mythos_runtime.session import RuntimeSessionService  # noqa: E402

# Abstract terms the reframe says should NOT recur every scene (ordinary scenes).
ABSTRACT = [
    "데이터 흐름",
    "잔향 회랑",
    "오버레이 코어",
    "불안 영역",
    "데이터 노이즈",
    "존재 자체",
    "데이터 파형",
    "신호 흐름",
    "데이터 안개",
    "잔향",
]


def _sentences(text: str) -> list[str]:
    out: list[str] = []
    for chunk in text.replace("\n", " ").split("."):
        s = chunk.strip()
        if len(s) >= 12:
            out.append(s)
    return out


def main(turns: int = 5) -> int:
    store = _InMemoryStore()
    svc = RuntimeSessionService(store, director=NarrativeDirector())
    svc.create_player("리피트테스터", player_id="p_rep", traits={"archetype": "ghost"})
    opts = RuntimeOptions(fallback=False, scenario_id="neo-seoul", with_image=False)

    snap = svc.start_loop("p_rep", options=opts)
    loop_id = snap.loop.loop_id

    narrations: list[str] = []
    per_turn_abstract: list[Counter] = []

    for i in range(turns):
        sc = snap.scene
        narr = sc.narration or ""
        narrations.append(narr)
        hits = Counter({t: narr.count(t) for t in ABSTRACT if narr.count(t)})
        per_turn_abstract.append(hits)
        print(f"\n=== TURN {i} | {sc.title!r} @ {sc.location!r} ===")
        print((narr[:240] + ("…" if len(narr) > 240 else "")).replace("\n", " "))
        print(f"  추상어 hits: {dict(hits) or '없음'} | 선택지 {len(sc.choices)}개")
        if not sc.choices:
            print("  (선택지 없음 — 종료)")
            break
        snap = svc.choose(loop_id, choice_id=sc.choices[0].choice_id, options=opts)

    # --- Cross-scene repetition report ---
    print("\n" + "=" * 60)
    print("REPETITION REPORT")
    print("=" * 60)

    # 1) abstract term recurrence across turns
    term_turns: Counter = Counter()
    for hits in per_turn_abstract:
        for t in hits:
            term_turns[t] += 1
    recurring = {t: n for t, n in term_turns.items() if n >= 2}
    print(f"여러 턴에 반복 등장한 추상어(>=2턴): {recurring or '없음 ✅'}")

    # 2) repeated sentences across distinct scenes
    seen: dict[str, int] = {}
    dup: list[tuple[str, int, int]] = []
    for ti, narr in enumerate(narrations):
        for s in _sentences(narr):
            key = s[:40]
            if key in seen and seen[key] != ti:
                dup.append((s[:50], seen[key], ti))
            else:
                seen.setdefault(key, ti)
    print(f"장면 간 반복 문장(앞 40자 동일): {len(dup)}건")
    for s, a, b in dup[:6]:
        print(f"  - T{a}↔T{b}: {s!r}")

    # 3) intro re-description smell: does the opening place recur after turn 0?
    print(f"\n총 {len(narrations)}턴 narration 길이: {[len(n) for n in narrations]}")
    verdict = "양호 ✅" if not recurring and not dup else "반복 의심 ⚠️ (위 항목 확인)"
    print(f"판정: {verdict}")
    return 0


if __name__ == "__main__":
    n = int(sys.argv[1]) if len(sys.argv) > 1 else 5
    raise SystemExit(main(n))
