"""Per-engine translation of one sampler intent into request parameters.

Why this exists. ``OllamaJSONProvider`` sent its sampler as
``extra_body={"keep_alive": ..., "options": {...}}`` — the shape Ollama's *native*
API takes. The runtime does not use the native API; it uses the OpenAI SDK
against Ollama's OpenAI-compatible endpoint, and that layer **silently discards
the nested dict**. Measured 2026-08-30 (``experiments/results/*-option-passthrough``):
``num_predict=5`` delivered that way returned 691 characters, byte-identical to
the uncapped baseline, while the same cap as ``max_tokens`` returned 0. So
``num_ctx``, ``num_predict``, ``repeat_penalty``, ``repeat_last_n``, ``top_p``
and ``top_k`` had never once applied — including the repeat-penalty tuning that
exists to fight narrative repetition.

The lesson generalises past the bug: the same `base_url` trick that lets this
runtime point at vLLM or an MLX server also means **each engine accepts a
different subset in a different envelope**. One dict of hopeful options is not a
portable request. So intent is declared once, in engine-neutral terms, and each
engine renders what it can actually honour — and what it cannot is dropped
explicitly, here, where the reason is written down, instead of being posted and
ignored.

What each engine accepts is a **measurement, not a belief**. Ollama's row is
measured (``experiments/results/*-option-matrix``). The others are marked and
must be measured before being trusted.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

#: Engine ids. ``MYTHOS_LLM_ENGINE`` selects one; ``ollama`` stays the default so
#: existing local setups keep working.
OLLAMA = "ollama"
VLLM = "vllm"
MLX = "mlx"
LLAMACPP = "llamacpp"

KNOWN_ENGINES = (OLLAMA, VLLM, MLX, LLAMACPP)


@dataclass(frozen=True)
class SamplerSpec:
    """What we want, in engine-neutral terms.

    ``repetition_penalty`` uses the multiplicative convention (1.0 = off), which
    is what llama.cpp/Ollama/vLLM all use natively. Engines that only expose
    OpenAI's additive penalties get an approximation — see ``_frequency_penalty``.
    """

    temperature: float
    max_output_tokens: int
    top_p: float | None = None
    top_k: int | None = None
    repetition_penalty: float | None = None
    #: OpenAI ``response_format``; top-level and honoured everywhere we target.
    json_object: bool = False


def _frequency_penalty(repetition_penalty: float | None) -> float | None:
    """Approximate a multiplicative repetition penalty as an additive one.

    These are different mechanisms — one scales the logit of a seen token, the
    other subtracts a constant per occurrence — so this is a translation, not an
    equivalence, and it is the honest best available on an endpoint that takes
    only the OpenAI penalties. 1.0 (off) maps to 0.0 (off); the repo's 1.3 maps
    to 0.6, inside OpenAI's [-2, 2]. Both penalties were verified to actually
    reach the model (option-matrix), unlike the repeat_penalty we were sending.
    """
    if repetition_penalty is None or repetition_penalty <= 1.0:
        return None
    return round(min((repetition_penalty - 1.0) * 2.0, 2.0), 3)


def render(spec: SamplerSpec, engine: str) -> dict[str, Any]:
    """Request kwargs for ``engine``, carrying only what it will honour."""
    kwargs: dict[str, Any] = {
        "temperature": spec.temperature,
        # Measured: the ONLY delivery form that caps output on Ollama's
        # OpenAI-compatible endpoint. extra_body, nested or top-level, is dropped.
        "max_tokens": spec.max_output_tokens,
    }
    if spec.json_object:
        kwargs["response_format"] = {"type": "json_object"}
    if spec.top_p is not None:
        kwargs["top_p"] = spec.top_p

    if engine == OLLAMA:
        # top_k has no OpenAI-native field and Ollama's compat layer ignores
        # extra_body, so it is genuinely undeliverable here. Dropped loudly
        # rather than posted into the void.
        penalty = _frequency_penalty(spec.repetition_penalty)
        if penalty is not None:
            kwargs["frequency_penalty"] = penalty
        return kwargs

    if engine in (VLLM, LLAMACPP):
        # UNVERIFIED. vLLM's OpenAI server documents top_k/repetition_penalty as
        # top-level extra_body fields; llama.cpp's server is similar but not
        # identical. Run experiments/run.py option-matrix against the engine
        # before relying on this row.
        extra: dict[str, Any] = {}
        if spec.top_k is not None:
            extra["top_k"] = spec.top_k
        if spec.repetition_penalty is not None:
            extra["repetition_penalty"] = spec.repetition_penalty
        if extra:
            kwargs["extra_body"] = extra
        return kwargs

    if engine == MLX:
        # UNVERIFIED, and deliberately minimal: mlx_lm.server's OpenAI surface is
        # narrower than the others and its response_format support is the open
        # question that gates the whole Apple-silicon bench (plan T4).
        return kwargs

    # Unknown engine: send only what every OpenAI-compatible server accepts.
    return kwargs


def dropped_for(spec: SamplerSpec, engine: str) -> list[str]:
    """Fields this engine cannot carry — for logging, so silence is not the only signal."""
    rendered = render(spec, engine)
    extra = rendered.get("extra_body") or {}
    missing: list[str] = []
    if spec.top_k is not None and "top_k" not in extra:
        missing.append("top_k")
    if spec.repetition_penalty is not None and not (
        "repetition_penalty" in extra or "frequency_penalty" in rendered
    ):
        missing.append("repetition_penalty")
    return missing


#: Context length is NOT in SamplerSpec on purpose. On an OpenAI-compatible
#: endpoint it is not a per-request parameter at all — Ollama takes it from the
#: model's Modelfile, which is why `*-64k` model variants exist. Setting it means
#: choosing a model whose window holds the prompt plus max_output_tokens; the
#: narrative prompt measured 6.8-7.8k tokens on 2026-08-30. See OLLAMA_NUM_CTX in
#: .env.example and the note there.
CONTEXT_IS_A_MODEL_PROPERTY = True

__all__ = [
    "KNOWN_ENGINES",
    "LLAMACPP",
    "MLX",
    "OLLAMA",
    "VLLM",
    "SamplerSpec",
    "dropped_for",
    "render",
]
