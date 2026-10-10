"""Plain-text LLM access for the v2 AI GM.

The classic providers in ``mythos_narrative`` are built around the scene JSON
schema (Gemini is pinned to ``SCENE_JSON_SCHEMA``), so the GM uses this thin,
plain-text seam instead — same backends, same env:

* ``MYTHOS_NARRATIVE_PROVIDER=gemini|vertex`` → ``GeminiTextLLM`` (Vertex/Gemini,
  ``mythos_narrative.gemini_provider.GeminiConfig`` env: ``MODEL``/``GEMINI_MODEL``,
  ``GOOGLE_CLOUD_PROJECT``/``PROJECT_ID``, …). The SDK is imported lazily.
* anything else → ``OpenAICompatTextLLM`` against ``OLLAMA_BASE_URL`` (Ollama by
  default; ``MYTHOS_LLM_ENGINE`` = mlx/vllm also work). Model:
  ``MYTHOS_V2_GM_MODEL`` > ``OLLAMA_MODEL_STORY`` > ``OLLAMA_MODEL``.
* ``MYTHOS_V2_GM=off`` → no LLM; every GM call serves the authored fallback.

Thinking models (gemma4 on Ollama) spend ``max_tokens`` on reasoning before any
content (docs/LESSONS.md 2026-09-08). On Ollama the request sends
``reasoning_effort: "none"`` (measured: 24-token answers, ~0.4 s warm) and keeps
a generous cap so an engine that ignores the flag still has room to answer.
"""

from __future__ import annotations

import os
from typing import Any, Protocol


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
        from mythos_image_agent.config import AgentConfig

        config = AgentConfig()
        self.base_url = base_url or config.ollama_base_url
        self.model = model or os.getenv("MYTHOS_V2_GM_MODEL") or config.ollama_model_story
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
        content = response.choices[0].message.content if response.choices else None
        return content.strip() if isinstance(content, str) else ""


class GeminiTextLLM:
    """Gemini / Vertex AI, plain text (or schema-constrained JSON for improvise)."""

    def __init__(self, *, model: str | None = None, client: Any = None) -> None:
        from mythos_narrative.gemini_provider import GeminiConfig

        self.config = GeminiConfig()
        self.model = model or os.getenv("MYTHOS_V2_GM_GEMINI_MODEL") or self.config.model
        self.name = f"gemini:{self.model}"
        self._client = client

    def _get_client(self, timeout: float) -> Any:
        if self._client is not None:
            return self._client
        from google import genai
        from google.genai import types

        http_options = types.HttpOptions(timeout=int(timeout * 1000))
        if self.config.use_vertex:
            self._client = genai.Client(
                vertexai=True,
                project=self.config.project,
                location=self.config.location,
                http_options=http_options,
            )
        else:
            self._client = genai.Client(api_key=self.config.api_key, http_options=http_options)
        return self._client

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
        config: dict[str, Any] = {
            "system_instruction": system,
            "temperature": temperature,
            "max_output_tokens": max_tokens,
            "thinking_config": {"thinking_budget": self.config.thinking_budget},
        }
        if json_schema is not None:
            from mythos_narrative.gemini_provider import to_gemini_schema

            config["response_mime_type"] = "application/json"
            config["response_schema"] = to_gemini_schema(json_schema)
        response = self._get_client(timeout).models.generate_content(
            model=self.model, contents=user, config=config
        )
        text = getattr(response, "text", None)
        return text.strip() if isinstance(text, str) else ""


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


__all__ = ["GeminiTextLLM", "OpenAICompatTextLLM", "TextLLM", "build_text_llm"]
