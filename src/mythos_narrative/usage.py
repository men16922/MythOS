"""Per-call LLM token usage, carried from the provider to the turn log.

Why this exists: on 2026-08-13 the first `--promotion` narrative eval could not
report a real `cost_per_loop_usd` for any of the three frozen samples, because no
provider ever recorded token counts and nothing in Cloud Logging could recover
them after the fact. The rubric's companion metric had to fall back to a
documented planning figure. This module closes that gap going forward: a provider
records what the API reported, and the director folds it into the same structured
turn log that already carries ``loop_id``, so per-loop cost becomes an aggregation
over a loop's turns instead of an estimate.

A ``ContextVar`` rather than provider state: a provider instance is shared across
requests, so an attribute would let one turn's counts be read by another. Context
variables are per-task/per-thread and propagate into Starlette's threadpool, so a
value recorded inside a turn can only be taken by that turn.
"""

from __future__ import annotations

from contextvars import ContextVar
from typing import Any

# Provider usage field -> the key used in logs and spans. Names are kept explicit
# rather than derived so a future SDK rename fails loudly in tests. Two vocabularies
# are recognised: Gemini's ``usage_metadata`` and the OpenAI ``CompletionUsage``
# shape that Ollama's compat endpoint returns (``prompt_eval_count``/``eval_count``
# arrive there as ``prompt_tokens``/``completion_tokens``). The first vocabulary
# to fill a key wins; an object carrying both never double-counts.
_USAGE_FIELDS: tuple[tuple[str, str], ...] = (
    # Gemini
    ("prompt_token_count", "prompt_tokens"),
    ("candidates_token_count", "output_tokens"),
    ("total_token_count", "total_tokens"),
    ("thoughts_token_count", "thinking_tokens"),
    ("cached_content_token_count", "cached_tokens"),
    # OpenAI-compatible (Ollama, vLLM, llama.cpp server, mlx_lm.server)
    ("prompt_tokens", "prompt_tokens"),
    ("completion_tokens", "output_tokens"),
    ("total_tokens", "total_tokens"),
)

_USAGE: ContextVar[dict[str, int] | None] = ContextVar("mythos_narrative_usage", default=None)


def normalize_usage(raw: Any) -> dict[str, int]:
    """Read an SDK usage object into plain ints, skipping anything absent.

    Returns ``{}`` for None or an object carrying no recognised counter, so a
    provider that reports nothing simply adds no fields to the turn log rather
    than logging zeros that would silently average into a cost figure.
    """
    if raw is None:
        return {}
    usage: dict[str, int] = {}
    for source, name in _USAGE_FIELDS:
        if name in usage:
            continue
        value = getattr(raw, source, None)
        if isinstance(value, bool) or not isinstance(value, int):
            continue
        if value < 0:
            continue
        usage[name] = value
    return usage


def record_usage(raw: Any) -> None:
    """Add one call's usage to the surrounding turn's running total.

    Accumulates rather than replaces because a single turn can make more than one
    billable call: the streamed path falls back to a non-streaming retry when the
    stream comes back unparseable, and both are charged. Keeping only the last
    would under-report exactly the turns that cost the most.
    """
    usage = normalize_usage(raw)
    if not usage:
        return
    total = dict(_USAGE.get() or {})
    for name, value in usage.items():
        total[name] = total.get(name, 0) + value
    total["provider_calls"] = total.get("provider_calls", 0) + 1
    _USAGE.set(total)


def take_usage() -> dict[str, int]:
    """Return and clear the usage accumulated since the last take/clear."""
    usage = _USAGE.get()
    _USAGE.set(None)
    return dict(usage) if usage else {}


def clear_usage() -> None:
    """Drop any pending usage. Call at the start of a turn, not per provider call.

    A turn that ends without taking (an exception before the log) would otherwise
    leave counts behind for the next turn on the same thread to claim.
    """
    _USAGE.set(None)


__all__ = ["clear_usage", "normalize_usage", "record_usage", "take_usage"]
