"""EXP-03 — Do the sampler options in director.py actually reach the model?

Found while trying to fix EXP-02's empty responses. Raising ``num_ctx`` in
config changed nothing on the live path, yet replaying the very prompts that had
returned empty produced 766-871 characters at that same setting. The only
difference between the two was the endpoint: the runtime talks to Ollama's
**OpenAI-compatible** ``/v1/chat/completions`` through the OpenAI SDK, while the
replay used Ollama's **native** ``/api/chat``.

``OllamaJSONProvider`` sends its sampler nested as
``extra_body={"keep_alive": ..., "options": {...}}``. This experiment asks
whether that nesting survives the compatibility layer, using a cap so small its
effect cannot be mistaken for anything else: ``num_predict``/``max_tokens`` = 5.

- if the option is honoured, output is ~5 tokens;
- if it is dropped, output matches the uncapped baseline.

Whatever the answer, it applies equally to ``num_ctx``, ``repeat_penalty``,
``repeat_last_n``, ``top_p`` and ``top_k`` — they travel in the same dict.

Usage:
    .venv/bin/python -m experiments.run option-passthrough
"""

from __future__ import annotations

import argparse

from experiments.harness import Experiment, ExperimentResult, Finding, Table, run_experiment
from experiments.tracelib import DEFAULT_OLLAMA, ollama_available

SLUG = "option-passthrough"

# A prompt whose length is bounded only by the cap, so an ignored cap is obvious.
PROBE = [{"role": "user", "content": "Count from 1 to 200, one number per line."}]
TINY_CAP = 5

# Exactly the shape src/mythos_narrative/director.py sends.
DIRECTOR_STYLE_EXTRA_BODY = {
    "keep_alive": "30m",
    "options": {"num_ctx": 16384, "num_predict": TINY_CAP, "repeat_penalty": 1.3, "top_p": 0.85},
}


def build(model: str, base_url: str) -> Experiment:
    def run() -> ExperimentResult:
        if not ollama_available(base_url):
            raise SystemExit("Ollama is not reachable")
        from openai import OpenAI

        client = OpenAI(base_url=f"{base_url}/v1", api_key="ollama", timeout=300)

        def ask(**kwargs) -> int:
            response = client.chat.completions.create(model=model, messages=PROBE, **kwargs)
            return len(response.choices[0].message.content or "")

        baseline = ask()
        via_extra_body = ask(extra_body=DIRECTOR_STYLE_EXTRA_BODY)
        via_max_tokens = ask(max_tokens=TINY_CAP)

        honoured = via_extra_body < baseline / 2
        return ExperimentResult(
            summary=(
                f"`num_predict={TINY_CAP}`를 director.py와 같은 `extra_body.options` 형태로 보냈을 때 "
                f"출력 **{via_extra_body}자** — 무제한 기준선 {baseline}자와 "
                + ("다릅니다." if honoured else "**같습니다. 옵션이 무시됩니다.**")
                + f" 같은 상한을 OpenAI 네이티브 `max_tokens`로 주면 {via_max_tokens}자입니다."
            ),
            tables=[
                Table(
                    f"동일 프롬프트, 상한 {TINY_CAP} 토큰을 전달하는 방식만 변경",
                    ["전달 방식", "출력 문자", "상한이 적용됐는가"],
                    [
                        ["없음 (기준선)", baseline, "—"],
                        [
                            "`extra_body={'options': {...}}` — director.py가 보내는 방식",
                            via_extra_body,
                            "**아니오**" if not honoured else "예",
                        ],
                        ["`max_tokens=` — OpenAI 네이티브", via_max_tokens, "예" if via_max_tokens < baseline / 2 else "아니오"],
                    ],
                )
            ],
            findings=[
                Finding(
                    claim=(
                        "Ollama의 OpenAI 호환 엔드포인트는 `extra_body.options`를 조용히 버린다."
                        if not honoured
                        else "`extra_body.options`가 전달된다."
                    ),
                    evidence=f"num_predict={TINY_CAP}로 {via_extra_body}자, 무제한 기준선 {baseline}자. "
                    f"동일 상한을 max_tokens로 주면 {via_max_tokens}자.",
                    confidence="measured",
                ),
                Finding(
                    claim="따라서 director.py의 num_ctx·num_predict·repeat_penalty·repeat_last_n·top_p·top_k는 "
                    "지금까지 로컬 경로에서 한 번도 적용된 적이 없다 — 같은 dict에 실려 함께 버려진다.",
                    evidence="여섯 값 모두 동일한 `extra_body['options']`에 담겨 전송된다 "
                    "(director.py OllamaJSONProvider).",
                    confidence="indicative" if not honoured else "measured",
                ),
            ],
            limits=[
                "프로브 1종·모델 1종·각 팔 1회. 재실행 분산은 측정하지 않았습니다.",
                "이 Ollama 버전의 호환 계층에 대한 관측입니다. 버전이 바뀌면 달라질 수 있습니다.",
                "`num_predict`로 검사했습니다. 나머지 옵션은 같은 dict에 실린다는 사실에서 추론한 것이며 "
                "개별적으로 확인하지 않았습니다.",
                "vLLM·MLX의 호환 계층은 다를 수 있습니다 — 엔진마다 다시 재야 합니다.",
                "temperature와 response_format은 최상위 OpenAI 파라미터라 이 결과에 해당하지 않습니다.",
            ],
            raw={
                "model": model,
                "baseline_chars": baseline,
                "extra_body_chars": via_extra_body,
                "max_tokens_chars": via_max_tokens,
                "cap": TINY_CAP,
                "honoured": honoured,
            },
        )

    return Experiment(
        slug=SLUG,
        question="director.py가 extra_body.options로 보내는 샘플러 설정이 실제로 모델에 도달하는가?",
        controls={"prompt": "고정 프로브", "model": model, "endpoint": f"{base_url}/v1", "cap": TINY_CAP},
        variables={"상한 전달 방식": "없음 / extra_body.options / max_tokens"},
        run=run,
        source=__import__("pathlib").Path(__file__).resolve(),
    )


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--model", default="gemma4:latest")
    parser.add_argument("--base-url", default=DEFAULT_OLLAMA)
    args = parser.parse_args(argv)
    out = run_experiment(build(args.model, args.base_url))
    print(f"report -> {out/'report.md'}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
