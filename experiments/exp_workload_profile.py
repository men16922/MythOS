"""EXP-01 — What shape is the MythOS narrative workload?

Two numbers decide which serving optimisations can possibly pay here:

1. **input:output ratio** — prefill-heavy or decode-heavy. Every technique in the
   reference doc keys off this axis (compute-bound vs memory-bound).
2. **prefix sharing between consecutive turns** — prefix caching is worth 8x TTFT
   when requests share a prefix and nothing at all when they do not (measured in
   the study lab). Nothing else about the workload changes that.

Both are read off a captured trace, so this experiment costs one token-counting
pass and no generation.

Usage:
    MYTHOS_PROMPT_TRACE=/tmp/tr  # capture a run first (see experiments/README.md)
    .venv/bin/python experiments/run.py workload-profile --trace /tmp/tr
"""

from __future__ import annotations

import argparse
import statistics as st
from pathlib import Path

from experiments.harness import Experiment, ExperimentResult, Finding, Table, run_experiment
from experiments.tracelib import (
    common_prefix_len,
    flat,
    load_trace,
    ollama_available,
    prompt_tokens,
    token_count,
)

SLUG = "workload-profile"


def build(trace_dir: Path, model: str, method: str) -> Experiment:
    def run() -> ExperimentResult:
        rows = load_trace(trace_dir, method=method)
        if len(rows) < 2:
            raise SystemExit(f"need >=2 {method} records in {trace_dir}, found {len(rows)}")
        if not ollama_available():
            raise SystemExit("Ollama is not reachable; exact token counts require it")

        prompts = [flat(r["messages"]) for r in rows]
        responses = [r.get("response") or "" for r in rows]

        in_tok = [prompt_tokens(r["messages"], model) for r in rows]
        out_tok = [token_count(t, model) if t else 0 for t in responses]

        # -- size ---------------------------------------------------------
        size_rows = [
            ["input tokens", min(in_tok), int(st.median(in_tok)), max(in_tok)],
            ["output tokens", min(out_tok), int(st.median(out_tok)), max(out_tok)],
            ["input chars", min(len(p) for p in prompts), int(st.median([len(p) for p in prompts])),
             max(len(p) for p in prompts)],
        ]
        ratio = st.median(in_tok) / max(st.median(out_tok), 1)
        chars_per_token = st.median([len(p) for p in prompts]) / max(st.median(in_tok), 1)

        # -- prefix sharing -----------------------------------------------
        share_rows = []
        shares = []
        for i in range(len(rows) - 1):
            a, b = prompts[i], prompts[i + 1]
            shared = common_prefix_len(a, b)
            pct = 100 * shared / max(len(a), 1)
            shares.append(pct)
            share_rows.append([f"{i}→{i+1}", len(a), shared, f"{pct:.1f}%"])
        median_share = st.median(shares)

        # -- degradation ---------------------------------------------------
        empty = sum(1 for r in rows if r.get("response") == "")
        errored = sum(1 for r in rows if r.get("error"))
        degraded = empty + errored

        result = ExperimentResult(
            summary=(
                f"`{method}` 호출 {len(rows)}건. 입력 중앙값 **{int(st.median(in_tok))} 토큰**, "
                f"출력 중앙값 **{int(st.median(out_tok))} 토큰**, "
                f"연속 턴 프리픽스 공유 중앙값 **{median_share:.1f}%**."
            ),
            tables=[
                Table(
                    "크기 — prefill-heavy인가 decode-heavy인가",
                    ["항목", "min", "중앙값", "max"],
                    size_rows,
                    note=(
                        f"입력:출력 = **{ratio:.1f} : 1**. "
                        f"이 콘텐츠의 문자/토큰 = {chars_per_token:.2f} "
                        "(문자÷4 같은 휴리스틱은 이 비율에서 크게 어긋납니다)."
                    ),
                ),
                Table(
                    "프리픽스 공유 — 턴 N의 프롬프트 중 턴 N+1의 리터럴 프리픽스인 비율",
                    ["쌍", "이전 프롬프트 길이(자)", "공유(자)", "공유율"],
                    share_rows,
                    note=(
                        f"중앙값 **{median_share:.1f}%**. 문자 단위 측정입니다 — BPE는 좌→우 결정적이라 "
                        "공유 문자 프리픽스는 마지막 경계 토큰 하나를 빼면 그대로 공유 토큰 프리픽스가 됩니다."
                    ),
                ),
                Table(
                    "생성 결과",
                    ["항목", "건수", "비율"],
                    [
                        ["빈 응답", empty, f"{100*empty/len(rows):.0f}%"],
                        ["예외/타임아웃", errored, f"{100*errored/len(rows):.0f}%"],
                        ["저하 합계", degraded, f"{100*degraded/len(rows):.0f}%"],
                    ],
                    note="저하된 턴은 fallback이 덮으므로 플레이 화면에서는 정상으로 보입니다.",
                ),
            ],
            findings=[
                Finding(
                    claim=f"이 워크로드는 prefill-heavy다 (입력:출력 = {ratio:.1f}:1).",
                    evidence=f"입력 중앙값 {int(st.median(in_tok))} 토큰 vs 출력 중앙값 {int(st.median(out_tok))} 토큰, "
                    f"{model}의 실제 토크나이저로 {len(rows)}턴 측정.",
                ),
                Finding(
                    claim=f"연속 턴이 프롬프트의 {median_share:.1f}%를 리터럴 프리픽스로 공유한다.",
                    evidence=f"{len(shares)}개 연속 쌍, 범위 {min(shares):.1f}–{max(shares):.1f}%.",
                ),
            ]
            + (
                [
                    Finding(
                        claim=f"이 실행에서 생성의 {100*degraded/len(rows):.0f}%가 저하됐다 "
                        f"(빈 응답 {empty}, 오류 {errored}).",
                        evidence="트레이스 레코드의 response 길이 0 및 error 필드.",
                        confidence="measured",
                    )
                ]
                if degraded
                else []
            ),
            limits=[
                f"n={len(rows)} 호출, 단일 세션·단일 루프. 반복 측정 아님.",
                f"모델 1종({model}) · 기계 1대. 다른 모델·기계로 이전되지 않습니다.",
                "프리픽스 공유는 문자 단위 측정이며 토큰 단위와 최대 1토큰 어긋날 수 있습니다.",
                "선택지는 항상 첫 번째를 골랐습니다 — 플레이 분포가 아니라 하나의 경로입니다.",
                f"`{method}` 스트림만 봤습니다. 다른 프로바이더 메서드는 포함되지 않습니다.",
            ],
            raw={
                "model": model,
                "method": method,
                "n": len(rows),
                "input_tokens": in_tok,
                "output_tokens": out_tok,
                "prompt_chars": [len(p) for p in prompts],
                "prefix_share_pct": shares,
                "empty": empty,
                "errored": errored,
            },
        )
        return result

    return Experiment(
        slug=SLUG,
        question="MythOS 서사 워크로드는 어떤 모양인가 — prefill/decode 축과 프리픽스 공유율은?",
        controls={
            "trace": str(trace_dir),
            "model": model,
            "method": method,
            "선택 정책": "항상 첫 번째 선택지",
            "이미지 생성": "off",
        },
        variables={"없음 (관측 실험)": "—"},
        run=run,
        source=Path(__file__).resolve(),
    )


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--trace", required=True, type=Path)
    parser.add_argument("--model", default="gemma4:latest")
    parser.add_argument("--method", default="generate_story")
    args = parser.parse_args(argv)
    out = run_experiment(build(args.trace, args.model, args.method))
    print(f"report -> {out/'report.md'}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
