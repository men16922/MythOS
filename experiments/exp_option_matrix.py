"""EXP-04 — Which sampler knobs actually work on an OpenAI-compatible endpoint?

EXP-03 established that ``extra_body={"options": {...}}`` is discarded by
Ollama's compatibility layer. That says what does *not* work; an adapter needs
to know what *does*, per engine, before it can translate anything.

Method: hold the prompt fixed, send one parameter at a time, and ask whether
the completion moves from a baseline in the direction the parameter promises.
A parameter that changes nothing on a prompt it should visibly affect is being
ignored — the same discriminator EXP-03 used, generalised.

Four families are probed separately because they fail differently:

- **delivery form** — the same cap (``5`` tokens) sent five ways, to find which
  envelope survives. Effect is unmistakable, so this arm is decisive.
- **logit penalties** — ``frequency_penalty``, ``presence_penalty`` and both
  native repetition-penalty names, judged by whether the temperature=0
  completion diverges from baseline on a repetition-prone prompt. Penalties
  land before the argmax, so greedy decoding can see them.
- **truncation samplers** — ``top_k=1`` / ``top_p=0.01`` are no-ops under
  greedy decoding, so they are sent at temperature=1.0 instead: a truncation
  sampler that arrives collapses sampling back to the argmax and the completion
  becomes identical to the temperature=0 baseline; one that is dropped leaves
  sampling free and the completion diverges.
- **JSON mode** — ``response_format={"type": "json_object"}`` on a prompt that
  asks for a plain sentence. Honoured means the body parses as JSON.

Usage:
    make experiment ARGS="option-matrix"                            # Ollama
    make experiment ARGS="option-matrix --engine mlx \
        --base-url http://127.0.0.1:8081 --model mlx-community/<repo>"
"""

from __future__ import annotations

import argparse
import json
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any

from experiments.harness import Experiment, ExperimentResult, Finding, Table, run_experiment
from experiments.tracelib import DEFAULT_OLLAMA, ollama_available

SLUG = "option-matrix"
ENGINES = ("ollama", "mlx", "vllm", "llamacpp")

CAP = 5
JSON_CAP = 1024
CAP_PROMPT = [{"role": "user", "content": "Count from 1 to 200, one number per line."}]
# Repetition-prone and deterministic at temperature 0, so any sampler knob that
# actually lands should move the completion.
SAMPLER_PROMPT = [
    {"role": "user", "content": "Write one paragraph about rain in a neon city. Be concrete."}
]
# Deliberately does not say "JSON": only an engine that enforces the response
# format would turn this into a JSON body.
JSON_PROMPT = [{"role": "user", "content": "Describe rain in a neon city in one plain sentence."}]

YES = "**예**"
NO = "아니오"
UNDECIDABLE = "**판정 불가**"


def _reachable(engine: str, base_url: str) -> bool:
    if engine == "ollama":
        return ollama_available(base_url)
    try:
        with urllib.request.urlopen(f"{base_url}/v1/models", timeout=3):
            return True
    except (urllib.error.URLError, OSError):
        return False


def _parses_as_json(text: str) -> bool:
    try:
        json.loads(text.strip())
    except ValueError:
        return False
    return True


def build(engine: str, model: str, base_url: str) -> Experiment:
    def run() -> ExperimentResult:
        if not _reachable(engine, base_url):
            raise SystemExit(f"{engine} is not reachable at {base_url}")
        from openai import OpenAI

        client = OpenAI(base_url=f"{base_url}/v1", api_key=engine, timeout=300)

        def ask(messages: list[dict[str, str]], **kwargs: Any) -> str:
            response = client.chat.completions.create(model=model, messages=messages, **kwargs)
            return response.choices[0].message.content or ""

        # ---- family 1: delivery form for an output cap -------------------
        uncapped = len(ask(CAP_PROMPT))
        delivery = [
            ("none (baseline)", {}, uncapped),
            ("max_tokens=", {"max_tokens": CAP}, None),
            ("max_completion_tokens=", {"max_completion_tokens": CAP}, None),
            (
                "extra_body={'options':{'num_predict'}} — Ollama 네이티브",
                {"extra_body": {"options": {"num_predict": CAP}}},
                None,
            ),
            ("extra_body={'num_predict'} (top level)", {"extra_body": {"num_predict": CAP}}, None),
        ]
        delivery_rows = []
        working_delivery: list[str] = []
        for label, kwargs, precomputed in delivery:
            length = precomputed if precomputed is not None else len(ask(CAP_PROMPT, **kwargs))
            is_baseline = label.startswith("none")
            applied = not is_baseline and length < uncapped / 2
            if applied:
                working_delivery.append(label)
            delivery_rows.append([label, length, "—" if is_baseline else (YES if applied else NO)])

        # ---- family 2: logit penalties at temperature 0 ------------------
        baseline = ask(SAMPLER_PROMPT, temperature=0)
        # Greedy must reproduce itself, or "differs from baseline" means nothing.
        greedy_stable = ask(SAMPLER_PROMPT, temperature=0) == baseline
        penalties = [
            ("frequency_penalty=2.0", {"temperature": 0, "frequency_penalty": 2.0}),
            ("presence_penalty=2.0", {"temperature": 0, "presence_penalty": 2.0}),
            (
                "extra_body repeat_penalty=2.0 (Ollama/llama.cpp 이름)",
                {"temperature": 0, "extra_body": {"repeat_penalty": 2.0}},
            ),
            (
                "extra_body repetition_penalty=2.0 (vLLM/MLX 이름)",
                {"temperature": 0, "extra_body": {"repetition_penalty": 2.0}},
            ),
        ]
        # Each arm is sent twice in a row, after a penalty-free request. Measured
        # on mlx_lm.server 0.31.3 (2026-09-08): the FIRST request that carries a
        # logits processor after one that carried none runs without it; the
        # second consecutive one applies it. A single send would call a working
        # knob "ignored", so the verdict is taken from the second send and a
        # first/second disagreement is reported as its own finding.
        penalty_rows = []
        working_penalties: list[str] = []
        first_send_dropped: list[str] = []
        penalty_outputs: dict[str, list[str]] = {}
        for label, kwargs in penalties:
            ask(SAMPLER_PROMPT, temperature=0)  # reset: a request with no processor
            first = ask(SAMPLER_PROMPT, **kwargs)
            second = ask(SAMPLER_PROMPT, **kwargs)
            penalty_outputs[label] = [first, second]
            if not greedy_stable:
                verdict_first = verdict_second = UNDECIDABLE
            else:
                verdict_first = YES if first != baseline else NO
                verdict_second = YES if second != baseline else NO
                if second != baseline:
                    working_penalties.append(label)
                    if first == baseline:
                        first_send_dropped.append(label)
            penalty_rows.append([label, len(first), verdict_first, len(second), verdict_second])

        # ---- family 3: truncation samplers at temperature 1.0 -------------
        free = ask(SAMPLER_PROMPT, temperature=1.0)
        sampling_free = free != baseline
        truncation = [
            ("top_p=0.01 @ T=1.0", {"temperature": 1.0, "top_p": 0.01}),
            ("extra_body top_k=1 @ T=1.0", {"temperature": 1.0, "extra_body": {"top_k": 1}}),
        ]
        truncation_rows = [
            ["none @ T=1.0 (control)", len(free), "—" if sampling_free else UNDECIDABLE]
        ]
        working_truncation: list[str] = []
        truncation_outputs: dict[str, str] = {"none @ T=1.0 (control)": free}
        for label, kwargs in truncation:
            out = ask(SAMPLER_PROMPT, **kwargs)
            truncation_outputs[label] = out
            if not (greedy_stable and sampling_free):
                verdict = UNDECIDABLE
            elif out == baseline:
                working_truncation.append(label)
                verdict = YES
            else:
                verdict = NO
            truncation_rows.append([label, len(out), verdict])

        # ---- family 4: JSON mode -----------------------------------------
        # The cap is generous on purpose: a thinking model (gemma4 on Ollama)
        # spends `max_tokens` on its reasoning first, and a 200-token cap came
        # back with empty content and finish_reason=length — which would read as
        # "not JSON" and convict the engine of ignoring the flag.
        plain = ask(JSON_PROMPT, temperature=0, max_tokens=JSON_CAP)
        forced = ask(
            JSON_PROMPT,
            temperature=0,
            max_tokens=JSON_CAP,
            response_format={"type": "json_object"},
        )
        plain_is_json = _parses_as_json(plain)
        forced_is_json = _parses_as_json(forced)
        json_decidable = bool(plain.strip()) and bool(forced.strip()) and not plain_is_json
        json_honoured = json_decidable and forced_is_json
        json_rows = [
            ["none (baseline)", len(plain), YES if plain_is_json else NO],
            [
                "response_format={'type':'json_object'}",
                len(forced),
                (YES if forced_is_json else NO) if json_decidable else UNDECIDABLE,
            ],
        ]

        def names(items: list[str]) -> str:
            return ", ".join(items) or "없음"

        return ExperimentResult(
            summary=(
                f"[{engine}] 출력 상한은 **{names(working_delivery)}** 으로 전달됩니다. "
                f"temperature=0 기준선을 움직인 페널티: **{names(working_penalties)}**. "
                f"temperature=1.0 샘플링을 argmax로 붕괴시킨 잘라내기 샘플러: "
                f"**{names(working_truncation)}**. "
                f"`response_format=json_object`: "
                f"**{('적용' if json_honoured else '무시') if json_decidable else '판정 불가'}**."
            ),
            tables=[
                Table(
                    f"① 출력 상한({CAP} 토큰) 전달 형태",
                    ["전달 형태", "출력 문자", "적용됨"],
                    delivery_rows,
                    note="효과가 명백한 검사라 이 표는 결정적입니다.",
                ),
                Table(
                    "② 로짓 페널티 — temperature=0 기준선에서 완성이 달라지는가 (페널티 없는 요청 뒤에 연속 2회 전송)",
                    ["파라미터", "1회째 문자", "1회째 다름", "2회째 문자", "2회째 다름"],
                    penalty_rows,
                    note=(
                        f"그리디 재현성: {'확인' if greedy_stable else '**실패 — 이 표는 무효**'}. "
                        "penalty류는 argmax 이전에 로짓을 바꾸므로 그리디 디코딩에서도 판정이 성립합니다. "
                        "판정은 2회째 기준입니다 — 1회째만 '아니오'면 서버가 첫 요청의 프로세서를 떨어뜨린 것입니다. "
                        "'아니오'는 무시의 강한 신호이지 증명은 아닙니다."
                    ),
                ),
                Table(
                    "③ 잘라내기 샘플러 — temperature=1.0에서 그리디 기준선으로 붕괴하는가",
                    ["파라미터", "출력 문자", "그리디 기준선과 동일"],
                    truncation_rows,
                    note=(
                        "top_p/top_k는 그리디에서 원래 무효라 temperature=1.0에서 잽니다: 도달하면 "
                        "후보가 1개로 잘려 argmax와 같은 완성이 나오고, 버려지면 자유 샘플링이라 달라집니다. "
                        f"자유 샘플링 대조(temperature=1.0, 노브 없음)가 기준선과 다른가: "
                        f"{'예' if sampling_free else '**아니오 — 이 표는 무효**'}."
                    ),
                ),
                Table(
                    "④ JSON 모드 — 평문 요청에 response_format을 붙이면 JSON이 나오는가",
                    ["요청", "출력 문자", "JSON 파싱"],
                    json_rows,
                    note=(
                        "프롬프트는 JSON을 언급하지 않습니다. 기준선이 이미 JSON이거나 어느 쪽이든 "
                        "빈 출력이면 판정 불가. 스키마 준수가 아니라 파싱 가능 여부만 봅니다."
                    ),
                ),
            ],
            findings=[
                Finding(
                    claim=f"{engine}: 출력 길이는 {names(working_delivery)} 으로 제어된다.",
                    evidence=f"무제한 {uncapped}자 대비, 다섯 가지 전달 형태 중 위 표의 결과.",
                ),
                Finding(
                    claim=f"{engine}: 도달하는 로짓 페널티는 {names(working_penalties)} 이다.",
                    evidence="극단값을 넣고 temperature=0 완성이 바뀌는지로 판정(연속 2회째 기준)"
                    + ("" if greedy_stable else " — 그리디가 재현되지 않아 무효"),
                    confidence="measured" if greedy_stable else "indicative",
                ),
                Finding(
                    claim=(
                        f"{engine}: 페널티 없는 요청 직후의 첫 요청은 페널티를 잃는다 — "
                        f"{names(first_send_dropped)}."
                        if first_send_dropped
                        else f"{engine}: 첫 요청과 연속 2회째 요청의 페널티 판정이 일치한다."
                    ),
                    evidence="같은 요청을 페널티 없는 요청 뒤에 연속 2회 보내 1회째/2회째를 각각 기준선과 비교.",
                    confidence="measured" if greedy_stable else "indicative",
                ),
                Finding(
                    claim=f"{engine}: 도달하는 잘라내기 샘플러는 {names(working_truncation)} 이다.",
                    evidence="temperature=1.0에서 노브를 넣었을 때 완성이 그리디 기준선과 같아지는지로 판정"
                    + ("" if sampling_free else " — 자유 샘플링이 기준선과 같아 무효"),
                    confidence="measured" if sampling_free else "indicative",
                ),
                Finding(
                    claim=f"{engine}: `response_format=json_object`는 "
                    f"{('적용된다' if json_honoured else '무시된다') if json_decidable else '판정 불가'}.",
                    evidence=f"평문 요청 기준선 JSON={plain_is_json}, response_format 붙인 요청 JSON={forced_is_json}.",
                    confidence="measured" if json_decidable else "indicative",
                ),
                Finding(
                    claim=f"`engine_options.py`의 `{engine}` 행은 이 목록만 실어야 한다; "
                    "쓸 수 없는 노브는 요청이 아니라 모델 선택으로 다뤄야 한다.",
                    evidence="위 네 표. 어댑터 행은 믿음이 아니라 측정이어야 한다는 원칙.",
                    confidence="indicative",
                ),
            ],
            limits=[
                "모델 1종·프롬프트 3종·각 팔 1회(②는 연속 2회). 재실행 분산은 그리디 재현성 1회 반복으로만 확인했습니다.",
                f"이 {engine} 서버 버전의 관측입니다. 다른 엔진·버전은 다시 재야 합니다.",
                "③의 '아니오'는 top_p=0.01 핵이 두 토큰 이상을 남긴 드문 경우에도 나올 수 있습니다 "
                "(거짓 음성 가능). '예'는 우연으로 나오기 어렵습니다.",
                "②·③의 '아니오'는 무시의 강한 신호이지 증명이 아닙니다 — 효과 없는 값일 가능성이 남습니다.",
                "④는 파싱 가능 여부만 봅니다. 스키마 유효율은 별도 실험(플랜 E-C)입니다.",
                "출력 품질은 보지 않았습니다. 오직 파라미터가 도달하는지만 봤습니다.",
                "컨텍스트 길이는 여기서 검사하지 않았습니다 — 호환 엔드포인트에서 요청 단위 설정 대상이 아닙니다.",
            ],
            raw={
                "engine": engine,
                "model": model,
                "uncapped_chars": uncapped,
                "delivery": [list(r) for r in delivery_rows],
                "greedy_stable": greedy_stable,
                "baseline": baseline,
                "penalties": [list(r) for r in penalty_rows],
                "penalty_outputs": penalty_outputs,
                "first_send_dropped": first_send_dropped,
                "sampling_free": sampling_free,
                "truncation": [list(r) for r in truncation_rows],
                "truncation_outputs": truncation_outputs,
                "json": {"plain": plain, "forced": forced, "honoured": json_honoured},
                "working_delivery": working_delivery,
                "working_penalties": working_penalties,
                "working_truncation": working_truncation,
            },
        )

    return Experiment(
        slug=SLUG,
        question="OpenAI 호환 엔드포인트에서 실제로 도달하는 샘플러 파라미터는 무엇인가?",
        controls={
            "engine": engine,
            "model": model,
            "endpoint": f"{base_url}/v1",
            "temperature": "0 (①②④) · 1.0 (③)",
            "prompt": "고정",
        },
        variables={"파라미터 전달 형태와 이름": "표 참조"},
        run=run,
        source=Path(__file__).resolve(),
    )


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--engine", choices=ENGINES, default="ollama")
    parser.add_argument(
        "--model",
        default=None,
        help="Ollama tag (default gemma4:latest) or, for other engines, the exact model id "
        "the server was started with (mlx_lm.server loads any other id on demand).",
    )
    parser.add_argument("--base-url", default=None, help="default: Ollama's localhost:11434")
    args = parser.parse_args(argv)
    if args.engine != "ollama" and not args.model:
        parser.error(f"--model is required for --engine {args.engine}")
    model = args.model or "gemma4:latest"
    base_url = args.base_url or DEFAULT_OLLAMA
    out = run_experiment(build(args.engine, model, base_url))
    print(f"report -> {out / 'report.md'}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
