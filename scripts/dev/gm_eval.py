"""GM line eval set: a frozen set of contexts for every AI-GM route, run through the configured model and scored with
deterministic metrics only (1.x port #15; an LLM judge was ~1 point of noise, so no judge here).

  .venv/bin/python scripts/dev/gm_eval.py [--reps 3] [--baseline outputs/gm-eval/<old>.json]   # or: make gm-eval

The model is whatever `/api/v2` would use (`mythos_v2.llm.build_text_llm`): local Ollama by default
(`OLLAMA_MODEL_STORY=gemma4:8b-64k`), Vertex with `MYTHOS_NARRATIVE_PROVIDER=vertex MODEL=gemini-3.8-flash`
(billed: ~60 short calls per run at the default 2 reps). Each case goes through the same prompt builder and the
same cleaner as production, so "usable" means "the player would see the model's line, not the authored fallback".

Metrics per case and overall: usable rate, latency p50 / p95, mean length of usable lines, and repeats (share of
usable lines identical to an earlier rep of the same case). Writes `outputs/gm-eval/<stamp>-<model>.json`. With
`--baseline`, exits 1 when a case's usable rate drops by more than 25 points or the overall p95 latency grows by
more than half — a guard to run before and after a prompt or model change.
"""

from __future__ import annotations

import argparse
import json
import statistics
import sys
import time
from collections.abc import Callable
from dataclasses import dataclass
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "src"))

from mythos_v2 import gm, talk, taunt  # noqa: E402
from mythos_v2.gm import Lang  # noqa: E402

USABLE_DROP = 0.25
P95_GROWTH = 1.5


@dataclass(frozen=True)
class Case:
    id: str
    route: str
    lang: Lang
    system: str
    user: str
    max_tokens: int
    temperature: float
    clean: Callable[[str], str | None]
    schema: dict[str, Any] | None = None


def _narrate(case_id: str, kind: gm.NarrateKind, lang: Lang, ctx: dict[str, Any]) -> Case:
    ctx = gm.sanitize_context(ctx)
    system, user = gm.narrate_messages(kind, lang, ctx)
    limits = gm.narrate_limits(kind, lang)
    return Case(
        case_id,
        f"narrate:{kind}",
        lang,
        system,
        user,
        limits.max_tokens,
        0.8,
        lambda raw: gm.clean_narration(raw, kind, lang),
    )


def _companion(case_id: str, companion: str, lang: Lang, ctx: dict[str, Any], message: str) -> Case:
    ctx = gm.sanitize_context(ctx)
    system, user = talk.companion_messages(companion, lang, ctx, [], message)
    return Case(
        case_id,
        "talk:companion",
        lang,
        system,
        user,
        talk.COMPANION_MAX_TOKENS,
        0.85,
        lambda raw: talk.clean_companion_reply(raw, companion, lang, ctx),
    )


def _ix(case_id: str, trigger: talk.IxTrigger, lang: Lang, ctx: dict[str, Any]) -> Case:
    ctx = gm.sanitize_context(ctx)
    system, user = talk.ix_messages(trigger, lang, ctx)
    return Case(
        case_id,
        "talk:ix",
        lang,
        system,
        user,
        talk.IX_MAX_TOKENS,
        0.7,
        lambda raw: talk.clean_ix_line(raw, lang, ctx),
    )


def _enemy(case_id: str, enemy: str, moment: taunt.TauntTrigger, lang: Lang) -> Case:
    system, user = taunt.taunt_messages(enemy, moment, lang)
    return Case(
        case_id,
        "talk:enemy",
        lang,
        system,
        user,
        taunt.TAUNT_MAX_TOKENS,
        0.8,
        lambda raw: taunt.clean_taunt(raw, enemy, lang),
    )


def _improvise(case_id: str, lang: Lang, action: str) -> Case:
    norm = gm.normalize_action(action)
    cls = gm.classify_action(norm)
    system, user = gm.improvise_messages(
        lang=lang,
        title="변전함" if lang == "ko" else "The Substation",
        text="문이 뜯긴 변전함. 모퉁이에서 군화 소리."
        if lang == "ko"
        else "A substation with its door torn off. Boots around the corner.",
        options=["지나간다" if lang == "ko" else "Walk past"],
        action=norm,
        stats={"str": 2, "agi": 3, "int": 5, "cha": 2, "obs": 3},
        act=1,
    )

    def clean(raw: str) -> str | None:
        verdict = gm.adjudicate_llm_output(raw, norm, lang, cls)
        return json.dumps(verdict, ensure_ascii=False, default=str) if verdict else None

    return Case(case_id, "improvise", lang, system, user, 600, 0.4, clean, gm.IMPROVISE_JSON_SCHEMA)


MEMORY = [
    "지난 루프들에서 이 해태에게 세 번 쓰러졌다",
    "기록된 접속 네 번 중 끝까지 간 것은 아직 없다",
]
HAN = {
    "name": "한",
    "alias": "신호 파괴자",
    "role": "비접속자 해커",
    "bondLines": ["난 접속 안 해. 밖에서 뚫는 게 더 재밌거든."],
    "bond": 2,
    "act": 2,
    "actName": "야시장 하층",
    "log": ["골목에서 단속 드론을 부쉈다"],
}
SERIN_EN = {
    "name": "Se-rin",
    "alias": "Water Strider",
    "role": "Smuggler",
    "bond": 1,
    "act": 1,
    "actName": "C-17 Blackout",
    "log": ["Broke into the substation"],
}


def cases() -> list[Case]:
    """The frozen set. Change it only on purpose (and start a new baseline): results are compared case by case."""
    event = {
        "title": "변전함",
        "text": "거대한 변전함의 문짝이 뜯겨 있다. 모퉁이에서 군화 소리가 들린다.",
        "act": 1,
        "loop": 3,
        "party": ["정세린"],
    }
    return [
        _narrate("event_open_ko", "event", "ko", event),
        _narrate("event_open_dejavu_ko", "event", "ko", {**event, "seenBefore": 2}),
        _narrate(
            "event_outcome_ko",
            "event",
            "ko",
            {**event, "choice": "단말기를 해킹한다", "outcome": "경보가 꺼졌다.", "success": True},
        ),
        _narrate(
            "event_open_en",
            "event",
            "en",
            {
                "title": "The Substation",
                "text": "A substation with its door torn off. Boots around the corner.",
                "act": 1,
                "party": ["Se-rin"],
            },
        ),
        _narrate(
            "act_intro_ko",
            "act_intro",
            "ko",
            {
                "act": 2,
                "actName": "야시장 하층",
                "subtitle": "기억마저 파는 곳",
                "loop": 2,
                "party": ["정세린", "한"],
            },
        ),
        _narrate(
            "boss_ko",
            "boss",
            "ko",
            {"boss": "해태", "act": 1, "phase": 1, "phaseText": "해태가 진압 광선을 충전한다."},
        ),
        _narrate(
            "ix_loop_start_memory_ko",
            "ix_loop_start",
            "ko",
            {
                "loop": 5,
                "lastResult": "defeat",
                "killedBy": "해태",
                "lastAct": 1,
                "wins": 0,
                "memory": MEMORY,
            },
        ),
        _narrate(
            "chronicle_ko",
            "chronicle",
            "ko",
            {
                "result": "defeat",
                "killedBy": "잔향 포식자",
                "act": 2,
                "actName": "야시장 하층",
                "party": ["정세린", "한"],
                "highlights": ["해태 격파", "야시장 상인 설득"],
                "improvised": [
                    "변전함: 단말기를 해킹해 경보를 끈다 → 경보가 꺼지고 골목이 어두워진다."
                ],
            },
        ),
        _companion("companion_han_ko", "han", "ko", HAN, "오늘 어땠어?"),
        _companion("companion_serin_en", "se_rin", "en", SERIN_EN, "You okay?"),
        _ix(
            "ix_boss_start_memory_ko",
            "boss_start",
            "ko",
            {"boss": "해태", "act": 1, "memory": MEMORY},
        ),
        _ix("ix_companion_down_ko", "companion_down", "ko", {"companion": "정세린", "act": 1}),
        _ix("ix_env_kill_en", "env_kill", "en", {"enemy": "Scrap Drone", "act": 1}),
        _enemy("enemy_haetae_hurt_ko", "haetae", "hurt", "ko"),
        _enemy("enemy_echo_winning_en", "echo_eater", "winning", "en"),
        _improvise("improvise_hack_ko", "ko", "단말기를 해킹해 경보를 끈다"),
        _improvise("improvise_bluff_en", "en", "Bluff the guards that I'm an inspector"),
    ]


def run(llm: Any, case_list: list[Case], reps: int) -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    for rep in range(reps):
        for case in case_list:
            started = time.perf_counter()
            try:
                raw = llm.complete(
                    case.system,
                    case.user,
                    max_tokens=case.max_tokens,
                    temperature=case.temperature,
                    timeout=30.0,
                    json_schema=case.schema,
                )
                error = None
            except Exception as exc:  # a failed call is a data point, not a crash
                raw, error = "", type(exc).__name__
            latency = time.perf_counter() - started
            cleaned = case.clean(raw) if raw else None
            out.append(
                {
                    "case": case.id,
                    "route": case.route,
                    "lang": case.lang,
                    "rep": rep,
                    "latency": round(latency, 3),
                    "error": error,
                    "raw": raw,
                    "line": cleaned,
                }
            )
    return out


def _p(values: list[float], q: float) -> float:
    ordered = sorted(values)
    return ordered[min(len(ordered) - 1, round(q * (len(ordered) - 1)))] if ordered else 0.0


def summarize(results: list[dict[str, Any]]) -> dict[str, Any]:
    by_case: dict[str, list[dict[str, Any]]] = {}
    for r in results:
        by_case.setdefault(r["case"], []).append(r)
    per_case: dict[str, Any] = {}
    for cid, rows in by_case.items():
        lines = [r["line"] for r in rows if r["line"]]
        repeats = sum(1 for i, line in enumerate(lines) if line in lines[:i])
        per_case[cid] = {
            "usable": round(len(lines) / len(rows), 3),
            "p50": round(_p([r["latency"] for r in rows], 0.5), 3),
            "chars": round(statistics.mean(len(x) for x in lines), 1) if lines else 0,
            "repeats": round(repeats / len(lines), 3) if lines else 0,
            "errors": sum(1 for r in rows if r["error"]),
        }
    latencies = [r["latency"] for r in results]
    return {
        "usable": round(sum(1 for r in results if r["line"]) / max(1, len(results)), 3),
        "p50": round(_p(latencies, 0.5), 3),
        "p95": round(_p(latencies, 0.95), 3),
        "errors": sum(1 for r in results if r["error"]),
        "cases": per_case,
    }


def regressions(now: dict[str, Any], base: dict[str, Any]) -> list[str]:
    found: list[str] = []
    for cid, row in now["cases"].items():
        old = base.get("cases", {}).get(cid)
        if old and old["usable"] - row["usable"] > USABLE_DROP:
            found.append(f"{cid}: usable {old['usable']:.0%} → {row['usable']:.0%}")
    if base.get("p95") and now["p95"] > base["p95"] * P95_GROWTH:
        found.append(f"p95 latency {base['p95']}s → {now['p95']}s")
    return found


def main() -> int:
    ap = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter
    )
    ap.add_argument("--reps", type=int, default=2)
    ap.add_argument("--baseline", type=Path, help="an earlier output JSON to compare against")
    ap.add_argument("--out-dir", type=Path, default=ROOT / "outputs" / "gm-eval")
    args = ap.parse_args()
    from mythos_v2.llm import build_text_llm

    llm = build_text_llm()
    if llm is None:
        print("MYTHOS_V2_GM=off: no model to evaluate", file=sys.stderr)
        return 2
    case_list = cases()
    print(f"gm-eval: {llm.name}, {len(case_list)} cases × {args.reps} reps")
    results = run(llm, case_list, args.reps)
    summary = summarize(results)
    for cid, row in summary["cases"].items():
        print(
            f"  {cid:28s} usable {row['usable']:>4.0%}  p50 {row['p50']:5.2f}s  chars {row['chars']:5.0f}  repeats {row['repeats']:.0%}  errors {row['errors']}"
        )
    print(
        f"overall: usable {summary['usable']:.0%}, p50 {summary['p50']}s, p95 {summary['p95']}s, errors {summary['errors']}"
    )
    args.out_dir.mkdir(parents=True, exist_ok=True)
    stamp = time.strftime("%Y%m%d-%H%M%S")
    out = args.out_dir / f"{stamp}-{llm.name.replace(':', '_').replace('/', '_')}.json"
    out.write_text(
        json.dumps(
            {"model": llm.name, "reps": args.reps, "summary": summary, "results": results},
            ensure_ascii=False,
            indent=1,
        ),
        encoding="utf-8",
    )
    print(f"wrote {out.relative_to(ROOT) if out.is_relative_to(ROOT) else out}")
    if args.baseline:
        base = json.loads(args.baseline.read_text(encoding="utf-8"))["summary"]
        found = regressions(summary, base)
        for line in found:
            print(f"REGRESSION {line}")
        return 1 if found else 0
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
