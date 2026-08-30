"""EXP-02 — Do empty storyteller responses come from the context window?

Observed while capturing EXP-01's trace: on the local dual-model path, some
``generate_story`` calls returned an empty string. The player never sees it — the
deterministic fallback fills the scene — so the surface looks healthy while the
model contributed nothing.

Hypothesis: ``director.py`` pins ``num_ctx=8192`` and asks for ``num_predict=2048``
while the prompt already runs ~7.1–7.8k tokens. Prompt + requested generation
exceeds the window, leaving a few hundred tokens of room; a thinking-capable
model spends them before reaching visible output.

Design: replay the *exact* prompts that returned empty, changing **one variable**
— ``num_ctx`` — and holding the sampler and prompt identical. If the hypothesis
holds, the same prompts produce text at the larger window.

Usage:
    .venv/bin/python experiments/run.py context-overflow --trace /tmp/tr
"""

from __future__ import annotations

import argparse
from pathlib import Path

from experiments.harness import Experiment, ExperimentResult, Finding, Table, run_experiment
from experiments.tracelib import load_trace, ollama_available, ollama_chat

SLUG = "context-overflow"

# The sampler as director.OllamaJSONProvider.generate_story ships it. Held
# constant across both arms so num_ctx is the only thing that differs.
SHIPPED_SAMPLER = {
    "temperature": 0.4,
    "repeat_penalty": 1.3,
    "repeat_last_n": 256,
    "top_p": 0.85,
    "top_k": 30,
    "num_predict": 2048,
}


def _shipped_num_ctx() -> int:
    """Whatever the runtime currently ships, not a number frozen into this file.

    The first run of this experiment hard-coded 8192. When the default was then
    raised, a stale constant would have kept reporting a comparison nobody was
    running any more — the exact drift the provenance block exists to catch.
    """
    from mythos_image_agent.config import AgentConfig

    return int(AgentConfig().ollama_num_ctx)


def build(trace_dir: Path, model: str, wide_ctx: int, method: str, shipped_ctx: int | None = None) -> Experiment:
    SHIPPED_NUM_CTX = shipped_ctx if shipped_ctx is not None else _shipped_num_ctx()
    def run() -> ExperimentResult:
        if not ollama_available():
            raise SystemExit("Ollama is not reachable")
        rows = load_trace(trace_dir, method=method)
        empties = [r for r in rows if r.get("response") == ""]
        if not empties:
            raise SystemExit(
                f"no empty-response {method} records in {trace_dir} — nothing to diagnose"
            )

        table_rows = []
        recovered = 0
        raw: list[dict] = []
        for i, record in enumerate(empties):
            arms = {}
            for label, ctx in (("shipped", SHIPPED_NUM_CTX), ("wide", wide_ctx)):
                out = ollama_chat(
                    record["messages"], model, options={**SHIPPED_SAMPLER, "num_ctx": ctx}
                )
                arms[label] = {
                    "num_ctx": ctx,
                    "prompt_tokens": out["prompt_eval_count"],
                    "output_tokens": out.get("eval_count", 0),
                    "output_chars": len(out["message"]["content"]),
                }
            shipped, wide = arms["shipped"], arms["wide"]
            overflow = shipped["prompt_tokens"] + SHIPPED_SAMPLER["num_predict"]
            if shipped["output_chars"] == 0 and wide["output_chars"] > 0:
                recovered += 1
            table_rows.append(
                [
                    i,
                    shipped["prompt_tokens"],
                    f"{overflow} {'>' if overflow > SHIPPED_NUM_CTX else '<='} {SHIPPED_NUM_CTX}",
                    f"{shipped['output_tokens']} tok / **{shipped['output_chars']} 자**",
                    f"{wide['output_tokens']} tok / **{wide['output_chars']} 자**",
                ]
            )
            raw.append({"index": i, **arms})

        n = len(empties)
        return ExperimentResult(
            summary=(
                f"빈 응답을 냈던 프롬프트 {n}개를 그대로 재생. `num_ctx` 하나만 "
                f"{SHIPPED_NUM_CTX} → {wide_ctx}로 바꿨을 때 **{recovered}/{n}** 이 텍스트를 생성했습니다."
            ),
            tables=[
                Table(
                    "동일 프롬프트, num_ctx만 변경",
                    ["#", "프롬프트 토큰", "프롬프트+num_predict vs num_ctx",
                     f"num_ctx={SHIPPED_NUM_CTX} (현행)", f"num_ctx={wide_ctx}"],
                    table_rows,
                    note="샘플러(temperature/top_p/top_k/repeat_penalty/num_predict)는 두 팔에서 동일합니다.",
                )
            ],
            findings=[
                Finding(
                    claim=f"빈 응답은 컨텍스트 창 부족에서 온다 — {recovered}/{n}이 창을 넓히자 회복됐다.",
                    evidence=f"동일 프롬프트·동일 샘플러, `num_ctx` {SHIPPED_NUM_CTX}→{wide_ctx} 단일 변수.",
                    confidence="reproduced" if recovered >= 2 else "measured",
                ),
                Finding(
                    claim="현행 설정은 프롬프트와 요청 생성량의 합이 창을 넘는다.",
                    evidence=f"프롬프트 {min(r['shipped']['prompt_tokens'] for r in raw)}–"
                    f"{max(r['shipped']['prompt_tokens'] for r in raw)} 토큰 + num_predict "
                    f"{SHIPPED_SAMPLER['num_predict']} > num_ctx {SHIPPED_NUM_CTX}.",
                ),
                Finding(
                    claim="이 실패는 fallback이 덮으므로 플레이 화면과 장면 저장소만 보면 보이지 않는다.",
                    evidence="드라이버는 같은 턴들을 성공으로 보고했고, 트레이스에서만 빈 응답이 드러났다.",
                    confidence="indicative",
                ),
            ],
            limits=[
                f"n={n} 프롬프트. 팔당 1회 실행 — 재실행 분산은 측정하지 않았습니다.",
                f"모델 1종({model}). thinking 없는 모델에서는 다르게 나올 수 있습니다.",
                "로컬 Ollama 경로 한정입니다. 프로덕션(Vertex Gemini) 경로와는 무관합니다.",
                "창을 넓히면 회복된다는 것이지, 넓히는 것이 옳은 수정이라는 뜻은 아닙니다 "
                "(프롬프트 축소·num_predict 축소도 후보).",
                "메모리 사용량은 측정하지 않았습니다.",
            ],
            raw={"model": model, "shipped_num_ctx": SHIPPED_NUM_CTX, "wide_num_ctx": wide_ctx,
                 "sampler": SHIPPED_SAMPLER, "arms": raw, "recovered": recovered, "n": n},
        )

    return Experiment(
        slug=SLUG,
        question="로컬 스토리텔러의 빈 응답은 컨텍스트 창 초과 때문인가?",
        controls={
            "prompts": "빈 응답을 낸 실제 프롬프트를 그대로 재생",
            "sampler": "director.py generate_story와 동일",
            "model": model,
            "num_predict": SHIPPED_SAMPLER["num_predict"],
        },
        variables={"num_ctx": f"{SHIPPED_NUM_CTX} → {wide_ctx}"},
        run=run,
        source=Path(__file__).resolve(),
    )


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--trace", required=True, type=Path)
    parser.add_argument("--model", default="gemma4:latest")
    parser.add_argument("--wide-ctx", type=int, default=32768)
    parser.add_argument("--method", default="generate_story")
    parser.add_argument("--shipped-ctx", type=int, default=None,
                        help="override the shipped num_ctx (default: read from AgentConfig)")
    args = parser.parse_args(argv)
    out = run_experiment(build(args.trace, args.model, args.wide_ctx, args.method, args.shipped_ctx))
    print(f"report -> {out/'report.md'}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
