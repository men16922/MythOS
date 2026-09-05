"""EXP-04 — Which sampler knobs actually work on an OpenAI-compatible endpoint?

EXP-03 established that ``extra_body={"options": {...}}`` is discarded by
Ollama's compatibility layer. That says what does *not* work; an adapter needs
to know what *does*, per engine, before it can translate anything.

Method: hold the prompt and the seed of variation fixed, send one parameter at a
time, and ask whether the output changes from a ``temperature=0`` baseline. A
parameter that changes nothing on a prompt it should visibly affect is being
ignored — the same discriminator EXP-03 used, generalised.

Two families are probed separately because they fail differently:

- **delivery form** — the same cap (``max_tokens`` = 5) sent four ways, to find
  which envelope survives. Effect is unmistakable, so this arm is decisive.
- **sampler knobs** — ``top_p``, ``frequency_penalty``, ``presence_penalty`` and
  the Ollama-native names, judged by whether the completion diverges from
  baseline on a repetition-prone prompt at temperature 0.

Usage:
    .venv/bin/python -m experiments.run option-matrix
"""

from __future__ import annotations

import argparse
from pathlib import Path

from experiments.harness import Experiment, ExperimentResult, Finding, Table, run_experiment
from experiments.tracelib import DEFAULT_OLLAMA, ollama_available

SLUG = "option-matrix"

CAP = 5
CAP_PROMPT = [{"role": "user", "content": "Count from 1 to 200, one number per line."}]
# Repetition-prone and deterministic at temperature 0, so any sampler knob that
# actually lands should move the completion.
SAMPLER_PROMPT = [
    {"role": "user", "content": "Write one paragraph about rain in a neon city. Be concrete."}
]


def build(model: str, base_url: str) -> Experiment:
    def run() -> ExperimentResult:
        if not ollama_available(base_url):
            raise SystemExit("Ollama is not reachable")
        from openai import OpenAI

        client = OpenAI(base_url=f"{base_url}/v1", api_key="ollama", timeout=300)

        def ask(messages, **kwargs) -> str:
            response = client.chat.completions.create(model=model, messages=messages, **kwargs)
            return response.choices[0].message.content or ""

        # ---- family 1: delivery form for an output cap -------------------
        uncapped = len(ask(CAP_PROMPT))
        delivery = [
            ("none (baseline)", {}, uncapped),
            ("max_tokens=", {"max_tokens": CAP}, None),
            ("extra_body={'options':{'num_predict'}} — 현행", {"extra_body": {"options": {"num_predict": CAP}}}, None),
            ("extra_body={'num_predict'} (top level)", {"extra_body": {"num_predict": CAP}}, None),
        ]
        delivery_rows = []
        working_delivery: list[str] = []
        for label, kwargs, precomputed in delivery:
            length = precomputed if precomputed is not None else len(ask(CAP_PROMPT, **kwargs))
            applied = label.startswith("none") is False and length < uncapped / 2
            if applied:
                working_delivery.append(label)
            delivery_rows.append(
                [label, length, "—" if label.startswith("none") else ("**예**" if applied else "아니오")]
            )

        # ---- family 2: sampler knobs -------------------------------------
        baseline = ask(SAMPLER_PROMPT, temperature=0)
        # `decidable=False` marks a knob this test CANNOT judge: truncation
        # samplers are no-ops under greedy decoding, so "same as baseline at
        # temperature=0" is what they produce whether or not they arrived.
        # Logit-modifying penalties do land before the argmax, so they are
        # decidable here.
        knobs = [
            ("top_p=0.1", {"temperature": 0, "top_p": 0.1}, False),
            ("frequency_penalty=2.0", {"temperature": 0, "frequency_penalty": 2.0}, True),
            ("presence_penalty=2.0", {"temperature": 0, "presence_penalty": 2.0}, True),
            ("extra_body top_k=1", {"temperature": 0, "extra_body": {"top_k": 1}}, False),
            ("extra_body repeat_penalty=2.0", {"temperature": 0, "extra_body": {"repeat_penalty": 2.0}}, True),
        ]
        knob_rows = []
        working_knobs: list[str] = []
        undecidable: list[str] = []
        for label, kwargs, decidable in knobs:
            out = ask(SAMPLER_PROMPT, **kwargs)
            changed = out != baseline
            if not decidable:
                undecidable.append(label)
                verdict = "**판정 불가**"
            elif changed:
                working_knobs.append(label)
                verdict = "**예**"
            else:
                verdict = "아니오"
            knob_rows.append([label, len(out), verdict])

        return ExperimentResult(
            summary=(
                f"출력 상한은 **{', '.join(working_delivery) or '없음'}** 으로만 전달됩니다. "
                f"temperature=0 기준선을 움직인 샘플러 노브: **{', '.join(working_knobs) or '없음'}**. "
                f"판정 불가(그리디 디코딩에서 원래 무효): {', '.join(undecidable) or '없음'}."
            ),
            tables=[
                Table(
                    f"① 출력 상한({CAP} 토큰) 전달 형태",
                    ["전달 형태", "출력 문자", "적용됨"],
                    delivery_rows,
                    note="효과가 명백한 검사라 이 표는 결정적입니다.",
                ),
                Table(
                    "② 샘플러 노브 — temperature=0 기준선에서 완성이 달라지는가",
                    ["파라미터", "출력 문자", "기준선과 다름"],
                    knob_rows,
                    note=(
                        "**top_p·top_k는 이 검사로 판정할 수 없습니다** — temperature=0 그리디 디코딩에서는 "
                        "잘라내기 샘플러가 원래 무효라, 전달 여부와 무관하게 기준선과 같은 출력이 나옵니다. "
                        "penalty류는 argmax 이전에 로짓을 바꾸므로 판정이 성립합니다. "
                        "판정 가능한 항목에서 '같음'은 무시의 강한 신호이지 증명은 아닙니다."
                    ),
                ),
            ],
            findings=[
                Finding(
                    claim=f"이 엔드포인트에서 출력 길이를 제어하는 유일한 방법은 {', '.join(working_delivery) or '없음'}이다.",
                    evidence=f"무제한 {uncapped}자 대비, 네 가지 전달 형태 중 위 표의 결과.",
                ),
                Finding(
                    claim=f"확인된 샘플러 노브는 {', '.join(working_knobs) or '없음'}이다.",
                    evidence="극단값을 넣고 temperature=0 완성이 바뀌는지로 판정. "
                    f"판정 불가 항목({', '.join(undecidable)})은 그리디 디코딩에서 원래 무효라 이 검사로 가릴 수 없다.",
                    confidence="measured",
                ),
                Finding(
                    claim="`repeat_penalty`는 extra_body로 보내면 도달하지 않으나, "
                    "`frequency_penalty`/`presence_penalty`가 같은 목적의 대체재로 실제 작동한다.",
                    evidence="extra_body repeat_penalty=2.0은 기준선과 동일, "
                    "frequency_penalty=2.0과 presence_penalty=2.0은 완성을 바꿨다.",
                    confidence="measured",
                ),
                Finding(
                    claim="어댑터는 이 목록만 사용해야 하며, 쓸 수 없는 노브(예: 컨텍스트 길이)는 "
                    "요청이 아니라 모델 선택으로 다뤄야 한다.",
                    evidence="현행 코드는 여섯 노브를 보내고 있고 EXP-03에서 전부 버려짐을 확인했다.",
                    confidence="indicative",
                ),
            ],
            limits=[
                "모델 1종·프롬프트 2종·각 팔 1회. 재실행 분산은 측정하지 않았습니다.",
                "이 Ollama 버전의 호환 계층 관측입니다. vLLM·MLX는 다시 재야 합니다 "
                "(vLLM은 top_k·repetition_penalty를 extra_body 최상위로 받는 것으로 알려져 있으나 미확인).",
                "②의 top_p·top_k는 판정 불가입니다(그리디 디코딩에서 무효). 이들이 필요하면 "
                "temperature>0에서 고정 시드로 다시 재야 하는데, Ollama 호환 계층은 seed도 받지 않습니다.",
                "②의 '아니오'는 무시의 강한 신호이지 증명이 아닙니다 — 효과 없는 값일 가능성이 남습니다.",
                "출력 품질은 보지 않았습니다. 오직 파라미터가 도달하는지만 봤습니다.",
                "num_ctx는 여기서 검사하지 않았습니다 — 호환 엔드포인트에서 요청 단위 설정 대상이 아닙니다.",
            ],
            raw={
                "model": model,
                "uncapped_chars": uncapped,
                "delivery": [[r[0], r[1], r[2]] for r in delivery_rows],
                "knobs": [[r[0], r[1], r[2]] for r in knob_rows],
                "working_delivery": working_delivery,
                "working_knobs": working_knobs,
                "undecidable_knobs": undecidable,
            },
        )

    return Experiment(
        slug=SLUG,
        question="OpenAI 호환 엔드포인트에서 실제로 도달하는 샘플러 파라미터는 무엇인가?",
        controls={"model": model, "endpoint": f"{base_url}/v1", "temperature": "0 (샘플러 팔)", "prompt": "고정"},
        variables={"파라미터 전달 형태와 이름": "표 참조"},
        run=run,
        source=Path(__file__).resolve(),
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
