"""A/B bench: gemini-2.5-flash vs gemini-3.5-flash on the real narrative path.

Drives the real RuntimeSessionService (in-memory store, no Docker) with the
Vertex Gemini provider per model, N story turns each, and reports per-turn
latency, director outcome metrics (success/repair/fallback), narration length,
and a prose sample. ⚠️ Billed Vertex calls (~2*(N+1) generations).

Run: .venv/bin/python scratch/gemini_model_bench.py [turns] [lang]
"""

from __future__ import annotations

import sys
import time

sys.path.insert(0, "tests")  # reuse the test in-memory store
from test_session_combat import _InMemoryStore  # type: ignore  # noqa: E402

from mythos_narrative.director import NarrativeDirector  # noqa: E402
from mythos_narrative.gemini_provider import GeminiConfig, VertexGeminiJSONProvider  # noqa: E402
from mythos_runtime.options import RuntimeOptions  # noqa: E402
from mythos_runtime.session import RuntimeSessionService  # noqa: E402

MODELS = ["gemini-2.5-flash", "gemini-3.5-flash"]


def bench(model: str, turns: int, lang: str) -> dict:
    cfg = GeminiConfig(model=model)
    provider = VertexGeminiJSONProvider(cfg)
    director = NarrativeDirector(provider=provider)
    store = _InMemoryStore()
    svc = RuntimeSessionService(store, director=director)
    pid = f"p_bench_{model.replace('.', '_').replace('-', '_')}"
    svc.create_player("벤치테스터", player_id=pid, traits={"archetype": "ghost"})
    opts = RuntimeOptions(fallback=False, scenario_id="neo-seoul", with_image=False, language=lang)

    print(f"\n{'=' * 70}\nMODEL {model}  (location={cfg.location})\n{'=' * 70}", flush=True)
    latencies: list[float] = []
    t0 = time.perf_counter()
    snap = svc.start_loop(pid, options=opts)
    latencies.append(time.perf_counter() - t0)

    for i in range(turns):
        sc = snap.scene
        narr = (sc.narration or "").replace("\n", " ")
        print(
            f"turn {i}: {latencies[-1]:5.1f}s | {len(sc.narration or '')}ch"
            f" | choices={len(sc.choices)} | {sc.title!r}",
            flush=True,
        )
        print(f"   {narr[:180]}{'…' if len(narr) > 180 else ''}", flush=True)
        if not sc.choices:
            print("   (no choices — stopping early)", flush=True)
            break
        t0 = time.perf_counter()
        snap = svc.choose(sc.loop_id, choice_id=sc.choices[0].choice_id, options=opts)
        latencies.append(time.perf_counter() - t0)

    counts = dict(director.metrics.counts) if hasattr(director.metrics, "counts") else {}
    return {"model": model, "latencies": latencies, "metrics": counts}


def main() -> None:
    turns = int(sys.argv[1]) if len(sys.argv) > 1 else 3
    lang = sys.argv[2] if len(sys.argv) > 2 else "ko"
    results = [bench(m, turns, lang) for m in MODELS]

    print(f"\n{'=' * 70}\nSUMMARY (lang={lang})\n{'=' * 70}")
    for r in results:
        lat = r["latencies"]
        avg = sum(lat) / len(lat)
        print(
            f"{r['model']:<22} turns={len(lat)} avg={avg:5.1f}s"
            f" min={min(lat):4.1f}s max={max(lat):4.1f}s | metrics={r['metrics']}"
        )


if __name__ == "__main__":
    main()
