"""Measure real per-turn token usage on the live narrative path (billed, tiny).

Wraps VertexGeminiJSONProvider to record usageMetadata per call while driving
the real session flow (in-memory store), so prompt sizes include the real
system prompt + directives + synopsis growth.

Run: .venv/bin/python scratch/gemini_token_probe.py [model] [turns] [lang] [sleep_s]

`sleep_s` (default 0) waits between turns — implicit cache writes take seconds
to propagate, so realistic turn spacing (20s+) is needed to observe hits.
"""

from __future__ import annotations

import sys
import time

sys.path.insert(0, "tests")
from test_session_combat import _InMemoryStore  # type: ignore  # noqa: E402

from mythos_narrative.director import NarrativeDirector  # noqa: E402
from mythos_narrative.gemini_provider import (  # noqa: E402
    GeminiConfig,
    VertexGeminiJSONProvider,
    _split_messages,
)
from mythos_runtime.options import RuntimeOptions  # noqa: E402
from mythos_runtime.session import RuntimeSessionService  # noqa: E402

USAGE: list[dict] = []


class ProbeProvider(VertexGeminiJSONProvider):
    def generate(self, messages, *, model=None):  # type: ignore[override]
        client = self._client()
        system_instruction, contents = _split_messages(messages)
        response = client.models.generate_content(
            model=model or self.config.model,
            contents=contents,
            config=self._generation_config(system_instruction),
        )
        um = getattr(response, "usage_metadata", None)
        USAGE.append(
            {
                "model": model or self.config.model,
                "prompt": getattr(um, "prompt_token_count", None),
                "output": getattr(um, "candidates_token_count", None),
                "thoughts": getattr(um, "thoughts_token_count", None),
                "cached": getattr(um, "cached_content_token_count", None),
                "total": getattr(um, "total_token_count", None),
            }
        )
        text = getattr(response, "text", None)
        return text.strip() if isinstance(text, str) else ""


def main() -> None:
    model = sys.argv[1] if len(sys.argv) > 1 else "gemini-3.5-flash"
    turns = int(sys.argv[2]) if len(sys.argv) > 2 else 3
    lang = sys.argv[3] if len(sys.argv) > 3 else "ko"
    sleep_s = float(sys.argv[4]) if len(sys.argv) > 4 else 0.0

    cfg = GeminiConfig(model=model)
    svc = RuntimeSessionService(
        _InMemoryStore(), director=NarrativeDirector(provider=ProbeProvider(cfg))
    )
    svc.create_player("토큰프로브", player_id="p_tok", traits={"archetype": "ghost"})
    opts = RuntimeOptions(fallback=False, scenario_id="neo-seoul", with_image=False, language=lang)
    snap = svc.start_loop("p_tok", options=opts)
    done = 0
    while done < turns:
        # Auto-resolve combats (deterministic engine, no LLM cost) so the probe
        # can reach mid/late-game story turns where the cache prefix is warm.
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
                # Fight resolved: resume the story with a free action (the SPA's
                # post-combat path) so the probe reaches later story turns.
                if sleep_s:
                    time.sleep(sleep_s)
                snap = svc.choose(sc.loop_id, action="전투 후 주변을 살피고 이동한다", options=opts)
                done += 1
                continue
            print(
                f"  [stop] no choices at turn={sc.turn_index} phase={snap.loop.phase}"
                f" type={sc.scene_type} title={sc.title!r}",
                flush=True,
            )
            break
        if sleep_s:
            time.sleep(sleep_s)
        snap = svc.choose(sc.loop_id, choice_id=sc.choices[0].choice_id, options=opts)
        done += 1

    print(f"\nMODEL {model} (location={cfg.location}, lang={lang})")
    tin = tout = 0
    for i, u in enumerate(USAGE):
        print(
            f"  call {i}: model={u.get('model')} prompt={u['prompt']} output={u['output']}"
            f" thoughts={u['thoughts']} cached={u['cached']}"
        )
        tin += u["prompt"] or 0
        tout += (u["output"] or 0) + (u["thoughts"] or 0)
    n = len(USAGE)
    print(f"  avg/turn: prompt={tin / n:.0f} output(+thoughts)={tout / n:.0f}  calls={n}")


if __name__ == "__main__":
    main()
