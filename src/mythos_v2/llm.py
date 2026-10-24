"""Plain-text LLM access for the v2 AI GM.

A thin plain-text seam over the two GM backends (config in ``mythos_v2.config``):

* ``MYTHOS_NARRATIVE_PROVIDER=gemini|vertex`` → ``GeminiTextLLM`` (Vertex/Gemini,
  ``mythos_v2.config.GeminiConfig`` env: ``MODEL``/``GEMINI_MODEL``,
  ``GOOGLE_CLOUD_PROJECT``/``PROJECT_ID``, …). The SDK is imported lazily.
* anything else → ``OpenAICompatTextLLM`` against ``OLLAMA_BASE_URL`` (Ollama by
  default; ``MYTHOS_LLM_ENGINE`` = mlx/vllm also work). Model:
  ``MYTHOS_V2_GM_MODEL`` > ``OLLAMA_MODEL_STORY`` > ``OLLAMA_MODEL``.
* ``MYTHOS_V2_GM=off`` → no LLM; every GM call serves the authored fallback.

Vertex has a long latency tail (measured 2026-10-19: the same 100-token act intro takes 2–5 s, sometimes > 12 s and
ends in 504 DEADLINE_EXCEEDED). ``GeminiTextLLM`` hedges: no answer after ``MYTHOS_V2_GM_HEDGE_S`` (4.0; 0 = off), or
a fast failure, sends the same request once more and takes the first success. Calls whose timeout leaves no room for
a second try (IX lines) are never hedged. The losing request's tokens still reach the player's budget
(``set_usage_sink``; measured: act intros 10/12 answered with hedging at 14 s vs ~50 % unhedged at 10 s on Cloud Run).

Thinking models (gemma4 on Ollama) spend ``max_tokens`` on reasoning before any
content (docs/LESSONS.md 2026-09-08). On Ollama the request sends
``reasoning_effort: "none"`` (measured: 24-token answers, ~0.4 s warm) and keeps
a generous cap so an engine that ignores the flag still has room to answer.
"""

from __future__ import annotations

import contextlib
import os
import threading
import time
from collections.abc import Callable
from concurrent.futures import FIRST_COMPLETED, Future, ThreadPoolExecutor, wait
from dataclasses import dataclass
from typing import Any, Protocol


@dataclass(frozen=True)
class Usage:
    """Billed tokens of one completion (output includes any thinking tokens)."""

    prompt_tokens: int = 0
    output_tokens: int = 0


# A backend reports the usage of the completion it just made on the SAME thread (the GM runner calls
# ``complete`` and then ``take_last_usage`` inside one worker call), so the ``TextLLM`` protocol and every fake
# LLM keep their plain ``-> str`` shape.
_last = threading.local()


def set_last_usage(prompt_tokens: object, output_tokens: object) -> None:
    def count(value: object) -> int:
        return value if isinstance(value, int) and not isinstance(value, bool) and value > 0 else 0

    _last.usage = Usage(count(prompt_tokens), count(output_tokens))


def set_usage_sink(sink: Callable[[Usage], None] | None) -> None:
    """Where a hedged call's losing request reports its tokens when it finishes later (this thread's next calls)."""
    _last.sink = sink


def take_last_usage() -> Usage | None:
    """The usage reported by the last ``complete`` on this thread (cleared by reading), if any."""
    usage: Usage | None = getattr(_last, "usage", None)
    _last.usage = None
    return usage


class TextLLM(Protocol):
    """One chat completion → text. Implementations must honour ``timeout``."""

    name: str

    def complete(
        self,
        system: str,
        user: str,
        *,
        max_tokens: int,
        temperature: float,
        timeout: float,
        json_schema: dict[str, Any] | None = None,
    ) -> str:
        raise NotImplementedError


class OpenAICompatTextLLM:
    """Ollama / MLX / vLLM through the OpenAI-compatible chat endpoint."""

    def __init__(
        self,
        *,
        base_url: str | None = None,
        model: str | None = None,
        engine: str | None = None,
    ) -> None:
        from mythos_v2.config import OllamaConfig

        config = OllamaConfig()
        self.base_url = base_url or config.base_url
        self.model = model or os.getenv("MYTHOS_V2_GM_MODEL") or config.model
        self.engine = (engine or os.getenv("MYTHOS_LLM_ENGINE") or "ollama").strip().lower()
        self.name = f"{self.engine}:{self.model}"

    def complete(
        self,
        system: str,
        user: str,
        *,
        max_tokens: int,
        temperature: float,
        timeout: float,
        json_schema: dict[str, Any] | None = None,
    ) -> str:
        from openai import OpenAI

        client = OpenAI(base_url=self.base_url, api_key="ollama", timeout=timeout, max_retries=0)
        kwargs: dict[str, Any] = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
            "max_tokens": max_tokens,
            "temperature": temperature,
        }
        if json_schema is not None:
            kwargs["response_format"] = {"type": "json_object"}
        if self.engine == "ollama":
            # Disable the reasoning pass on thinking models (gemma4/qwen3).
            kwargs["extra_body"] = {"reasoning_effort": "none"}
        response = client.chat.completions.create(**kwargs)
        usage = getattr(response, "usage", None)
        set_last_usage(getattr(usage, "prompt_tokens", 0), getattr(usage, "completion_tokens", 0))
        content = response.choices[0].message.content if response.choices else None
        return content.strip() if isinstance(content, str) else ""


#: Shared by every hedged Gemini call (a hedge must not wait for the slower request to finish).
_HEDGE_POOL = ThreadPoolExecutor(max_workers=8, thread_name_prefix="gm-hedge")
#: A second request is only worth sending with at least this much of the call's timeout left.
HEDGE_MIN_LEFT_S = 2.0


def _hedge_after() -> float:
    try:
        return max(0.0, float(os.getenv("MYTHOS_V2_GM_HEDGE_S") or 4.0))
    except ValueError:
        return 4.0


def _report_to(sink: Callable[[Usage], None]) -> Callable[[Future[tuple[str, Usage]]], None]:
    def report(fut: Future[tuple[str, Usage]]) -> None:
        if fut.cancelled() or fut.exception() is not None:
            return
        with contextlib.suppress(Exception):  # accounting must never break a reply
            sink(fut.result()[1])

    return report


class GeminiTextLLM:
    """Gemini / Vertex AI, plain text (or schema-constrained JSON for improvise)."""

    def __init__(
        self, *, model: str | None = None, client: Any = None, hedge_after: float | None = None
    ) -> None:
        from mythos_v2.config import GeminiConfig

        self.config = GeminiConfig()
        self.model = model or os.getenv("MYTHOS_V2_GM_GEMINI_MODEL") or self.config.model
        self.name = f"gemini:{self.model}"
        self._client = client
        self._local = threading.local()
        self.hedge_after = _hedge_after() if hedge_after is None else max(0.0, hedge_after)
        #: Calls that sent a second request (operator logs / tests).
        self.hedged = 0

    def _get_client(self, timeout: float) -> Any:
        if self._client is not None:
            return self._client
        cached = getattr(self._local, "client", None)
        if cached is not None:
            return cached
        from google import genai
        from google.genai import types

        http_options = types.HttpOptions(timeout=int(timeout * 1000))
        if self.config.use_vertex:
            created = genai.Client(
                vertexai=True,
                project=self.config.project,
                location=self.config.location,
                http_options=http_options,
            )
        else:
            created = genai.Client(api_key=self.config.api_key, http_options=http_options)
        self._local.client = created
        return created

    def _call(
        self,
        system: str,
        user: str,
        *,
        max_tokens: int,
        temperature: float,
        timeout: float,
        json_schema: dict[str, Any] | None = None,
    ) -> tuple[str, Usage]:
        config: dict[str, Any] = {
            # Per request: the cached client keeps whatever timeout its first call had (an IX line's 5.5 s would
            # otherwise cut every later, longer narration short).
            "http_options": {"timeout": int(timeout * 1000)},
            "system_instruction": system,
            "temperature": temperature,
            "max_output_tokens": max_tokens + max(0, self.config.thinking_headroom),
            "thinking_config": {"thinking_budget": self.config.thinking_budget},
        }
        if json_schema is not None:
            from mythos_v2.config import to_gemini_schema

            config["response_mime_type"] = "application/json"
            config["response_schema"] = to_gemini_schema(json_schema)
        response = self._get_client(timeout).models.generate_content(
            model=self.model, contents=user, config=config
        )
        meta = getattr(response, "usage_metadata", None)
        thoughts = getattr(meta, "thoughts_token_count", 0)
        output = getattr(meta, "candidates_token_count", 0)
        set_last_usage(
            getattr(meta, "prompt_token_count", 0),
            (output if isinstance(output, int) else 0)
            + (thoughts if isinstance(thoughts, int) else 0),
        )
        usage = take_last_usage() or Usage()
        text = getattr(response, "text", None)
        return (text.strip() if isinstance(text, str) else ""), usage

    def complete(
        self,
        system: str,
        user: str,
        *,
        max_tokens: int,
        temperature: float,
        timeout: float,
        json_schema: dict[str, Any] | None = None,
    ) -> str:
        def call(t: float) -> tuple[str, Usage]:
            leg_timeout = min(t, 12.0) if self.hedge_after > 0 else t
            return self._call(
                system,
                user,
                max_tokens=max_tokens,
                temperature=temperature,
                timeout=leg_timeout,
                json_schema=json_schema,
            )

        if self.hedge_after <= 0 or timeout < self.hedge_after + HEDGE_MIN_LEFT_S:
            text, usage = call(timeout)
            set_last_usage(usage.prompt_tokens, usage.output_tokens)
            return text
        sink: Callable[[Usage], None] | None = getattr(_last, "sink", None)
        start = time.monotonic()
        futures: list[Future[tuple[str, Usage]]] = [_HEDGE_POOL.submit(call, timeout)]
        done, _ = wait(futures, timeout=self.hedge_after)
        if not done or futures[0].exception() is not None:
            left = timeout - (time.monotonic() - start)
            if left >= HEDGE_MIN_LEFT_S:
                self.hedged += 1
                futures.append(_HEDGE_POOL.submit(call, left))
        pending: set[Future[tuple[str, Usage]]] = set(futures)
        error: BaseException | None = None
        while pending:
            left = timeout - (time.monotonic() - start)
            if left <= 0:
                break
            done, pending = wait(pending, timeout=left, return_when=FIRST_COMPLETED)
            for fut in done:
                exc = fut.exception()
                if exc is None:
                    text, usage = fut.result()
                    set_last_usage(usage.prompt_tokens, usage.output_tokens)
                    # The other request still bills when it finishes: hand its tokens to the sink.
                    for other in futures:
                        if other is not fut and sink is not None:
                            other.add_done_callback(_report_to(sink))
                    return text
                error = error or exc
            if (
                not pending
                and error is not None
                and len(futures) < 3
                and timeout >= max(10.0, self.hedge_after * 2)
            ):
                left = timeout - (time.monotonic() - start)
                if left >= HEDGE_MIN_LEFT_S:
                    self.hedged += 1
                    retry_fut = _HEDGE_POOL.submit(call, left)
                    futures.append(retry_fut)
                    pending.add(retry_fut)
        if error is not None:
            raise error
        raise TimeoutError("gemini: no answer within the timeout")


def build_text_llm() -> TextLLM | None:
    """The configured GM backend, or ``None`` when ``MYTHOS_V2_GM=off``.

    Construction is cheap and offline (no network, no SDK import for Ollama).
    """
    if (os.getenv("MYTHOS_V2_GM") or "on").strip().lower() in {"0", "off", "false", "no"}:
        return None
    provider = (os.getenv("MYTHOS_NARRATIVE_PROVIDER") or "ollama").strip().lower()
    if provider in {"gemini", "vertex"}:
        return GeminiTextLLM()
    return OpenAICompatTextLLM()


__all__ = [
    "GeminiTextLLM",
    "OpenAICompatTextLLM",
    "TextLLM",
    "Usage",
    "build_text_llm",
    "set_last_usage",
    "set_usage_sink",
    "take_last_usage",
]
