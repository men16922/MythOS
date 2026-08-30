"""Prompt/response trace capture for offline workload analysis.

Why this exists: the golden bank (``scripts/eval/bank_loop.py``) exports *scenes*
— what the model said — and nothing about what it was asked. That is enough to
score narrative quality and useless for serving research, which needs the
prompts: token counts, the input/output ratio, and above all how much of one
turn's prompt is a byte-prefix of the next one. Prefix reuse is the single
property that decides whether prefix caching is worth anything on this workload
(measured elsewhere: 8x TTFT when requests share a prefix, within 1% when they
do not), and it cannot be recovered from a transcript after the fact.

A trace is a JSONL file: one record per provider call, in call order. It is
provider-agnostic on purpose — the same file shape comes out of Ollama, Vertex
Gemini, a local vLLM, or an MLX server — so a trace captured against one engine
can be replayed against another and the two compared on identical input.

Enabled by ``MYTHOS_PROMPT_TRACE=<dir>``; off by default and free when off (the
wrapper is not installed at all, so there is no per-call branch in the hot path).

⚠️ A trace contains full prompts, which for this repo means scenario canon and
narrative prose. Treat trace files as source-equivalent: they are covered by the
same non-publication rule as ``resources/<scenario>/story_bible``.
"""

from __future__ import annotations

import json
import os
import threading
from collections.abc import Iterator
from contextvars import ContextVar
from pathlib import Path
from time import perf_counter
from typing import Any, cast

from mythos_core.clock import utc_now

TRACE_DIR_ENV = "MYTHOS_PROMPT_TRACE"

# Per-turn fields (loop id, turn index) that the director knows and the provider
# does not. A ContextVar rather than an attribute for the same reason usage.py
# uses one: a provider instance is shared across requests, so an attribute would
# let one turn's records be labelled with another turn's loop.
_context_fields: ContextVar[dict[str, Any]] = ContextVar("mythos_trace_fields", default={})

# One writer per process. Appends are line-oriented and lock-guarded so that
# concurrent turns (the API serves them from a threadpool) cannot interleave
# halves of two JSON lines into one corrupt row.
_write_lock = threading.Lock()


def trace_dir() -> Path | None:
    """The configured trace directory, or None when tracing is off."""
    raw = os.environ.get(TRACE_DIR_ENV, "").strip()
    return Path(raw) if raw else None


def set_trace_fields(**fields: Any) -> None:
    """Label subsequent provider calls on this task with per-turn identity."""
    _context_fields.set({k: v for k, v in fields.items() if v is not None})


def clear_trace_fields() -> None:
    _context_fields.set({})


def _record(entry: dict[str, Any]) -> None:
    directory = trace_dir()
    if directory is None:
        return
    directory.mkdir(parents=True, exist_ok=True)
    # One file per process-day keeps a session's turns in one place while making
    # an unattended overnight run self-partitioning.
    path = directory / f"trace-{utc_now().strftime('%Y%m%d')}-{os.getpid()}.jsonl"
    line = json.dumps(entry, ensure_ascii=False)
    with _write_lock:
        with path.open("a", encoding="utf-8") as handle:
            handle.write(line + "\n")


class TracingProvider:
    """Wraps any narrative provider and records every call to a JSONL trace.

    Delegation is by ``__getattr__`` so that provider capabilities this class has
    never heard of still work — ``_use_dual_model`` reads ``provider.config``,
    and a future engine adapter will add its own attributes. Only the methods
    that carry ``messages`` are intercepted, because those are the ones whose
    input is the object of study.
    """

    def __init__(self, inner: Any) -> None:
        self._inner = inner

    # -- identity ---------------------------------------------------------
    @property
    def inner(self) -> Any:
        return self._inner

    def __getattr__(self, name: str) -> Any:
        return getattr(self._inner, name)

    # -- intercepted calls ------------------------------------------------
    def generate(self, messages: list[dict[str, str]], **kwargs: Any) -> str:
        return self._call("generate", messages, kwargs)

    def generate_story(self, messages: list[dict[str, str]], **kwargs: Any) -> str:
        return self._call("generate_story", messages, kwargs)

    def generate_json(self, messages: list[dict[str, str]], **kwargs: Any) -> str:
        return self._call("generate_json", messages, kwargs)

    def stream(self, messages: list[dict[str, str]], **kwargs: Any) -> Iterator[str]:
        return self._call_stream("stream", messages, kwargs)

    def stream_story(self, messages: list[dict[str, str]], **kwargs: Any) -> Iterator[str]:
        return self._call_stream("stream_story", messages, kwargs)

    # -- machinery --------------------------------------------------------
    def _base_entry(self, method: str, messages: list[dict[str, str]], kwargs: dict[str, Any]) -> dict[str, Any]:
        return {
            "ts": utc_now().isoformat(),
            "provider": type(self._inner).__name__,
            "method": method,
            "model": kwargs.get("model"),
            "messages": messages,
            **_context_fields.get(),
        }

    def _call(self, method: str, messages: list[dict[str, str]], kwargs: dict[str, Any]) -> str:
        entry = self._base_entry(method, messages, kwargs)
        start = perf_counter()
        try:
            result = getattr(self._inner, method)(messages, **kwargs)
        except BaseException as exc:  # noqa: BLE001 - recorded, then re-raised
            entry["error"] = f"{type(exc).__name__}: {exc}"
            entry["duration_ms"] = round((perf_counter() - start) * 1000, 3)
            _record(entry)
            raise
        entry["duration_ms"] = round((perf_counter() - start) * 1000, 3)
        text = cast(str, result)
        entry["response"] = text
        _record(entry)
        return text

    def _call_stream(
        self, method: str, messages: list[dict[str, str]], kwargs: dict[str, Any]
    ) -> Iterator[str]:
        entry = self._base_entry(method, messages, kwargs)
        start = perf_counter()
        chunks: list[str] = []
        first_chunk_ms: float | None = None
        try:
            for chunk in getattr(self._inner, method)(messages, **kwargs):
                if first_chunk_ms is None:
                    # The provider-side TTFT. Not the user-visible one (the client
                    # reveal is throttled when the tab is hidden — measured 2026-08-08),
                    # so it is named for what it actually is.
                    first_chunk_ms = round((perf_counter() - start) * 1000, 3)
                chunks.append(chunk)
                yield chunk
        finally:
            # `finally`, not a trailing statement: an abandoned generator (parse
            # failure mid-stream, client disconnect) still produced tokens, and a
            # trace that silently drops exactly the failed turns would bias every
            # statistic computed from it toward the happy path.
            entry["duration_ms"] = round((perf_counter() - start) * 1000, 3)
            entry["first_chunk_ms"] = first_chunk_ms
            entry["chunk_count"] = len(chunks)
            entry["response"] = "".join(chunks)
            _record(entry)


def wrap_provider(provider: Any) -> Any:
    """Install tracing when it is enabled, otherwise return the provider as-is."""
    if trace_dir() is None:
        return provider
    if isinstance(provider, TracingProvider):
        return provider
    return TracingProvider(provider)


def unwrap_provider(provider: Any) -> Any:
    """The provider underneath any tracing wrapper.

    Log fields record the provider by class name; without this the name would
    silently become ``TracingProvider`` whenever tracing is on, corrupting the
    very telemetry these experiments are built on.
    """
    inner = getattr(provider, "_inner", None)
    return inner if inner is not None else provider


__all__ = [
    "TRACE_DIR_ENV",
    "TracingProvider",
    "clear_trace_fields",
    "set_trace_fields",
    "trace_dir",
    "unwrap_provider",
    "wrap_provider",
]
