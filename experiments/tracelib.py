"""Shared helpers for experiments that read a captured prompt trace.

A trace is produced by ``MYTHOS_PROMPT_TRACE=<dir>`` (see
``src/mythos_narrative/trace.py``): one JSONL record per provider call, in call
order, with the full ``messages`` the provider received.
"""

from __future__ import annotations

import json
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any

DEFAULT_OLLAMA = "http://localhost:11434"


def load_trace(trace_dir: Path, method: str | None = None) -> list[dict[str, Any]]:
    """Records in call order; optionally only one provider method.

    Filtering by method matters: the storyteller and the parser are separate
    request streams, and mixing them makes prefix statistics meaningless.
    """
    rows: list[dict[str, Any]] = []
    for path in sorted(trace_dir.glob("*.jsonl")):
        for line in path.read_text(encoding="utf-8").splitlines():
            if line.strip():
                rows.append(json.loads(line))
    if method is not None:
        rows = [r for r in rows if r.get("method") == method]
    return rows


def flat(messages: list[dict[str, str]]) -> str:
    """The prompt as one string, in the order the provider received it."""
    return "\n".join(f"{m.get('role')}:{m.get('content')}" for m in messages)


def common_prefix_len(a: str, b: str) -> int:
    n = min(len(a), len(b))
    i = 0
    while i < n and a[i] == b[i]:
        i += 1
    return i


def ollama_chat(
    messages: list[dict[str, str]],
    model: str,
    *,
    options: dict[str, Any] | None = None,
    base_url: str = DEFAULT_OLLAMA,
    timeout: int = 900,
) -> dict[str, Any]:
    """One non-streaming call to Ollama's native API.

    The native API is used rather than the OpenAI-compatible one because it
    returns ``prompt_eval_count``/``eval_count`` — the real token counts from the
    model's own tokenizer. Character heuristics are off by ~44% on this repo's
    Korean content (measured 2026-08-30), so a proxy tokenizer is not good enough
    for anything that feeds a context-window or cost conclusion.
    """
    body = json.dumps(
        {"model": model, "messages": messages, "stream": False, "options": options or {}}
    ).encode()
    request = urllib.request.Request(
        f"{base_url}/api/chat", data=body, headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(request, timeout=timeout) as response:  # noqa: S310 - localhost
        payload: dict[str, Any] = json.loads(response.read())
        return payload


def ollama_available(base_url: str = DEFAULT_OLLAMA) -> bool:
    try:
        with urllib.request.urlopen(f"{base_url}/api/tags", timeout=3):  # noqa: S310 - localhost
            return True
    except (urllib.error.URLError, OSError):
        return False


def token_count(text: str, model: str, *, base_url: str = DEFAULT_OLLAMA) -> int:
    """Tokens in ``text`` under ``model``'s tokenizer, chat overhead subtracted."""
    overhead = int(
        ollama_chat(
            [{"role": "user", "content": ""}], model, options={"num_predict": 1}, base_url=base_url
        )["prompt_eval_count"]
    )
    total = int(
        ollama_chat(
            [{"role": "user", "content": text}], model, options={"num_predict": 1}, base_url=base_url
        )["prompt_eval_count"]
    )
    return max(total - overhead, 0)


def prompt_tokens(messages: list[dict[str, str]], model: str, *, base_url: str = DEFAULT_OLLAMA) -> int:
    """Exact prompt tokens for a message list, as the serving model counts them."""
    return int(
        ollama_chat(messages, model, options={"num_predict": 1, "num_ctx": 32768}, base_url=base_url)[
            "prompt_eval_count"
        ]
    )


__all__ = [
    "DEFAULT_OLLAMA",
    "common_prefix_len",
    "flat",
    "load_trace",
    "ollama_available",
    "ollama_chat",
    "prompt_tokens",
    "token_count",
]
