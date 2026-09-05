"""Decompose the per-turn Gemini narrative prompt into token counts per component.

Drives the REAL session path (in-memory store) with a recording fake provider that
returns realistic canned JSON (no billing), captures the exact messages a turn
would send, then counts tokens per payload component via Vertex count_tokens
(free) — falling back to a chars-based estimate when offline.

Run: .venv/bin/python scratch/prompt_breakdown.py [turns] [lang]
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

sys.path.insert(0, "tests")
from test_session_combat import _InMemoryStore  # type: ignore  # noqa: E402

from mythos_narrative.director import NarrativeDirector  # noqa: E402
from mythos_runtime.options import RuntimeOptions  # noqa: E402
from mythos_runtime.session import RuntimeSessionService  # noqa: E402

# Realistic 3.5-length narration (~560 KO chars) so the synopsis/previous-scene
# window grows like a live session.
_NARRATION = (
    "빗줄기가 골목의 깨진 간판을 두드린다. 세린이 젖은 머리카락을 쓸어넘기며 셔터 틈으로 "
    "바깥을 살핀다. 드론의 탐조등이 물웅덩이를 훑고 지나가고, 그 빛이 사라진 2초 사이에 "
    "그녀가 손짓한다. 당신은 낮게 몸을 숙인 채 시장 뒷골목으로 미끄러져 들어간다. 좌판 "
    "위 김이 오르는 어묵 국물 냄새와 타버린 배선 냄새가 뒤섞인다. 노점상 노인이 힐끗 "
    "당신을 보더니 말없이 방수포를 들어 올려 좌판 아래 공간을 내준다. 멀리서 계엄 방송이 "
    "울리고, 스피커의 갈라진 음성이 골목 벽에 부딪혀 메아리친다. 세린이 당신의 손목에 "
    "단말기를 갖다 댄다. 화면에 뜬 좌표가 깜빡인다 — 지하철 3번 출구, 폐쇄된 환승 통로. "
    "그녀의 눈이 묻는다. 지금 움직일 것인가, 아니면 순찰이 지나갈 때까지 숨을 죽일 것인가. "
    "당신의 심장 박동이 손목 단말기의 진동과 겹쳐 울린다. 결정의 순간이다."
)

_LOCATIONS = [
    "back_alley",
    "night_market",
    "subway_gate",
    "rooftop_line",
    "transit_tunnel",
    "welfare_kiosk",
    "data_stack",
    "river_bridge",
    "old_arcade",
    "checkpoint_edge",
]


class RecordingProvider:
    def __init__(self) -> None:
        self.calls: list[list[dict[str, str]]] = []

    def generate(self, messages: list[dict[str, str]], *, model: str | None = None) -> str:
        self.calls.append(messages)
        i = len(self.calls)
        payload = {
            "scene": {
                "narration": _NARRATION,
                "title": f"젖은 골목의 신호 {i}",
                "location": _LOCATIONS[i % len(_LOCATIONS)],
                "scene_type": "dynamic",
                "objective": "세린과 함께 폐쇄된 환승 통로로 이동한다",
                "action_result": "Success",
                "requested_next_phase": None,
                "choices": [
                    {
                        "choice_id": "choice_1",
                        "label": f"세린을 따라 통로로 이동한다 {i}",
                        "intent": "explore",
                    },
                    {
                        "choice_id": "choice_2",
                        "label": "좌판 아래에서 순찰을 관찰한다",
                        "intent": "interact",
                    },
                    {
                        "choice_id": "choice_3",
                        "label": "노인에게 통로 상태를 묻는다",
                        "intent": "interact",
                    },
                ],
                "visual_brief": "rain-soaked neon alley, two figures under a tarp, drone searchlight passing",
            },
            "world_delta": {"stability": -2, "tension": 4, "flags": [], "clues": []},
            "end_condition": None,
        }
        return json.dumps(payload, ensure_ascii=False)


def _load_env() -> None:
    env = Path(".env")
    if not env.exists():
        return
    import os

    for line in env.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, _, v = line.partition("=")
        os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))


def _make_counter():
    """Return fn(text) -> tokens. Vertex count_tokens if available, else estimate."""
    try:
        from google import genai

        from mythos_narrative.gemini_provider import GeminiConfig

        cfg = GeminiConfig()
        client = genai.Client(vertexai=True, project=cfg.project, location=cfg.location)

        def count(text: str) -> int:
            if not text:
                return 0
            r = client.models.count_tokens(model=cfg.model, contents=text)
            return int(r.total_tokens or 0)

        count("ping")  # verify creds/network up-front
        print(f"[counter] Vertex count_tokens (model={cfg.model}, location={cfg.location})")
        return count
    except Exception as exc:  # pragma: no cover - offline fallback
        print(f"[counter] fallback estimate (chars-based) — {type(exc).__name__}: {exc}")

        def estimate(text: str) -> int:
            if not text:
                return 0
            ko = sum(1 for c in text if "가" <= c <= "힣")
            other = len(text) - ko
            return int(ko / 1.05 + other / 3.6)

        return estimate


def main() -> None:
    turns = int(sys.argv[1]) if len(sys.argv) > 1 else 10
    lang = sys.argv[2] if len(sys.argv) > 2 else "ko"
    _load_env()

    provider = RecordingProvider()
    svc = RuntimeSessionService(_InMemoryStore(), director=NarrativeDirector(provider=provider))
    svc.create_player("분해프로브", player_id="p_breakdown", traits={"archetype": "ghost"})
    opts = RuntimeOptions(fallback=False, scenario_id="neo-seoul", with_image=False, language=lang)
    snap = svc.start_loop("p_breakdown", options=opts)
    done = 0
    while done < turns:
        if snap.combat is not None and not snap.combat.get("finished"):
            from mythos_combat.engine import PlayerAction

            radar = snap.combat.get("radar") or {}
            enemies = [
                b
                for b in (radar.get("blips") or [])
                if b.get("faction") == "enemy" and b.get("hp", 0) > 0
            ]
            target = enemies[0]["id"] if enemies else None
            snap = svc.combat_action(
                snap.loop.loop_id, PlayerAction(type="attack", target_id=target), opts
            )
            continue
        sc = snap.scene
        if not sc.choices:
            if sc.scene_type == "combat":
                snap = svc.choose(sc.loop_id, action="전투 후 주변을 살피고 이동한다", options=opts)
                done += 1
                continue
            print(f"[stop] no choices at turn={sc.turn_index}")
            break
        snap = svc.choose(sc.loop_id, choice_id=sc.choices[0].choice_id, options=opts)
        done += 1

    count = _make_counter()

    def show(call_idx: int) -> None:
        messages = provider.calls[call_idx]
        system = "\n\n".join(m["content"] for m in messages if m["role"] == "system")
        user = "\n\n".join(m["content"] for m in messages if m["role"] != "system")
        body = user.rsplit("\n\nFollow the output_contract", 1)[0]
        payload = json.loads(body)

        print(
            f"\n=== call {call_idx} (of {len(provider.calls)}) — total user chars {len(user)} ==="
        )
        total = count(system)
        print(f"  {'system_prompt':<22} {total:>6}")
        for key, value in payload.items():
            rendered = json.dumps({key: value}, ensure_ascii=False)
            t = count(rendered)
            total += t
            print(f"  {key:<22} {t:>6}")
        print(f"  {'SUM':<22} {total:>6}")

        notes = payload.get("novelty_notes") or []
        print(f"\n  -- novelty_notes: {len(notes)} notes --")
        sized = sorted(((count(n), n) for n in notes), reverse=True)
        for t, n in sized:
            print(f"    {t:>5}  {n[:90].replace(chr(10), ' ')}")

        syn = payload.get("session_synopsis") or []
        print(f"\n  -- session_synopsis: {len(syn)} blocks --")
        for s in syn:
            print(f"    {count(s):>5}  {s[:90].replace(chr(10), ' ')}")

        loop = payload.get("loop") or {}
        state = loop.get("state") or {}
        print("\n  -- loop.state keys --")
        for k, v in state.items():
            print(f"    {count(json.dumps({k: v}, ensure_ascii=False)):>5}  {k}")

    # Early turn (opening) + late turn (steady state)
    show(min(2, len(provider.calls) - 1))
    show(len(provider.calls) - 1)


if __name__ == "__main__":
    main()
