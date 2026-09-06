"""Gemini / Vertex AI narrative provider (cloud product LLM).

A ``JSONProvider`` that generates the scene payload in ONE call via Gemini
**controlled generation** (``response_schema`` = the runtime's ``SCENE_JSON_SCHEMA``),
so the structured JSON is guaranteed by the model. This removes the local dual-model
dance (storyteller → 3b JSON parser → repair fallback): the director's single-model
``_generate_legacy`` path parses the controlled-generation output on the first try.

Coexists with ``OllamaJSONProvider`` — selected by ``MYTHOS_NARRATIVE_PROVIDER`` (see
``build_narrative_provider``). The ``google-genai`` SDK is an **optional** dependency
(``pip install -e .[gemini]``) and is imported lazily inside ``_client()`` so importing
the runtime never requires it; tests inject a fake client. Design: ``docs/cloud/
GCP_PLAN.md`` / ``CLOSED_BETA_FEEDBACK_STRATEGY.md`` / ``CAREER_STRATEGY.md`` §5.
"""

from __future__ import annotations

import os
from collections.abc import Iterator
from dataclasses import dataclass, field
from typing import Any

from .schemas import SCENE_JSON_SCHEMA
from .usage import record_usage

# JSON-schema primitive → Vertex/Gemini Schema type (the Schema proto uses uppercase
# type names and `nullable` instead of a `["string", "null"]` union).
_GEMINI_TYPE = {
    "string": "STRING",
    "object": "OBJECT",
    "array": "ARRAY",
    "integer": "INTEGER",
    "number": "NUMBER",
    "boolean": "BOOLEAN",
}


def to_gemini_schema(node: Any) -> Any:
    """Convert a JSON-schema dict into a Gemini/Vertex ``response_schema`` dict.

    Handles the runtime's ``["<type>", "null"]`` unions (→ the non-null type +
    ``nullable: True``) and recurses through ``properties``/``items``. Other JSON-schema
    keys the Schema proto doesn't accept are dropped.
    """
    if not isinstance(node, dict):
        return node
    out: dict[str, Any] = {}
    node_type = node.get("type")
    nullable = False
    if isinstance(node_type, list):
        nullable = "null" in node_type
        non_null = [t for t in node_type if t != "null"]
        node_type = non_null[0] if non_null else "string"
    if isinstance(node_type, str):
        out["type"] = _GEMINI_TYPE.get(node_type, node_type.upper())
    if nullable:
        out["nullable"] = True
    if isinstance(node.get("properties"), dict):
        out["properties"] = {k: to_gemini_schema(v) for k, v in node["properties"].items()}
    if "items" in node:
        out["items"] = to_gemini_schema(node["items"])
    if isinstance(node.get("required"), list):
        out["required"] = list(node["required"])
    if isinstance(node.get("enum"), list):
        out["enum"] = list(node["enum"])
    return out


SCENE_GEMINI_SCHEMA = to_gemini_schema(SCENE_JSON_SCHEMA)


def _env(*names: str, default: str | None = None) -> str | None:
    """First non-empty value among env-var aliases (later names are fallbacks)."""
    for name in names:
        value = os.getenv(name)
        if value is not None and value.strip() != "":
            return value
    return default


def _env_bool(*names: str, default: bool) -> bool:
    value = _env(*names)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


@dataclass(frozen=True)
class GeminiConfig:
    """Gemini/Vertex connection + generation config (env-driven defaults).

    Two auth modes: Vertex AI (``use_vertex=True`` + ``project``/``location``, ADC/
    service account) or the Gemini Developer API (``api_key``). The model and sampling
    knobs mirror the Ollama path's intent.

    Env is read at **construction** (``default_factory``), not import, so a late-loaded
    ``.env`` is honored. Each field also accepts the **google-genai SDK's native env
    names** as aliases of the ``GEMINI_*``-namespaced ones — the SDK itself auto-reads
    ``GOOGLE_GENAI_USE_VERTEXAI`` / ``GOOGLE_CLOUD_PROJECT`` / ``GOOGLE_CLOUD_LOCATION``,
    and we additionally honor the user's ``.env`` shorthands (``MODEL``, ``PROJECT_ID``).
    """

    # Default = gemini-3.5-flash since the 2026-07-17 A/B verdict: the 2.5-base
    # hybrid was rolled back after an owner-felt normal-turn prose quality drop
    # (DECISIONS.md 2026-07-17). Narrative quality is the product; cost is
    # accepted at ~$1.0/loop.
    model: str = field(
        default_factory=lambda: (
            _env("GEMINI_MODEL", "MODEL", default="gemini-3.5-flash") or "gemini-3.5-flash"
        )
    )
    # Optional key-beat model split: when set (e.g. GEMINI_MODEL_KEYBEAT with a
    # cheaper base MODEL), the director generates key-beat turns (opening/
    # anchor/cutscene/boss/ending — NarrativeContext.key_beat) on this model and
    # everything else on `model`. Unset (default) = single model, current behavior.
    # Kept (with its observability fields) so a future cost experiment is a
    # two-env-var flip — see bin/docs/plans/2026-07-14-keybeat-hybrid-ab.md.
    keybeat_model: str | None = field(
        default_factory=lambda: _env("GEMINI_MODEL_KEYBEAT", "MODEL_KEYBEAT")
    )
    use_vertex: bool = field(
        default_factory=lambda: _env_bool(
            "GEMINI_USE_VERTEX", "GOOGLE_GENAI_USE_VERTEXAI", default=True
        )
    )
    project: str | None = field(default_factory=lambda: _env("GOOGLE_CLOUD_PROJECT", "PROJECT_ID"))
    # Narrative-specific region. "" = auto, resolved in __post_init__: explicit
    # constructor arg > GEMINI_LOCATION > "global" for gemini-3.x models >
    # GOOGLE_CLOUD_LOCATION > us-central1. Gemini 3.x is served only from the
    # global endpoint (regional returns 404), while GOOGLE_CLOUD_LOCATION stays
    # regional because Imagen shares it — so swapping MODEL=gemini-3.5-flash
    # needs no other env change.
    location: str = ""
    api_key: str | None = field(default_factory=lambda: _env("GEMINI_API_KEY", "GOOGLE_API_KEY"))
    temperature: float = field(
        default_factory=lambda: float(_env("GEMINI_TEMPERATURE", default="0.7") or "0.7")
    )
    max_output_tokens: int = field(
        default_factory=lambda: int(_env("GEMINI_MAX_OUTPUT_TOKENS", default="2048") or "2048")
    )
    # Gemini 2.5 models are *thinking* models: reasoning tokens are drawn from the SAME
    # max_output_tokens budget. With thinking on, long reasoning intermittently starved
    # the JSON (finish=MAX_TOKENS, output truncated → first-parse fail → repair). Default
    # 0 disables thinking for controlled structured generation (reasoning is unneeded
    # here; also faster + cheaper). Set GEMINI_THINKING_BUDGET>0 to re-enable, or -1 for
    # the model's dynamic budget. Verified 5/5 first-try parse at 0 vs 3/5 with thinking.
    thinking_budget: int = field(
        default_factory=lambda: int(_env("GEMINI_THINKING_BUDGET", default="0") or "0")
    )

    def __post_init__(self) -> None:
        if not self.location:
            # A single client serves both models, so if EITHER the base or the
            # key-beat model is gemini-3.x the endpoint must be global (3.x 404s
            # regionally; 2.5 is served on global too).
            any_gemini3 = self.model.startswith("gemini-3") or (
                self.keybeat_model or ""
            ).startswith("gemini-3")
            resolved = (
                _env("GEMINI_LOCATION")
                or ("global" if any_gemini3 else None)
                or _env("GOOGLE_CLOUD_LOCATION")
                or "us-central1"
            )
            object.__setattr__(self, "location", resolved)


def _split_messages(messages: list[dict[str, str]]) -> tuple[str | None, str]:
    """Map OpenAI-style role messages → (system_instruction, user contents)."""
    system_parts = [m.get("content", "") for m in messages if m.get("role") == "system"]
    user_parts = [m.get("content", "") for m in messages if m.get("role") != "system"]
    system_instruction = "\n\n".join(p for p in system_parts if p).strip() or None
    contents = "\n\n".join(p for p in user_parts if p).strip()
    return system_instruction, contents


class VertexGeminiJSONProvider:
    """``JSONProvider`` backed by Gemini controlled generation.

    Implements ``generate`` (the single-model path the director uses when no separate
    storyteller/parser models are configured). The client is created lazily and can be
    injected (``client=...``) for tests. ``config`` deliberately has no
    ``ollama_model_story``/``ollama_model_parser`` attrs, so ``NarrativeDirector._use_dual_model``
    returns False and the controlled-generation JSON is parsed on the first try.
    """

    def __init__(self, config: GeminiConfig | None = None, *, client: Any = None) -> None:
        self.config = config or GeminiConfig()
        self._injected_client = client

    def _client(self) -> Any:
        if self._injected_client is not None:
            return self._injected_client
        try:
            from google import genai
        except ImportError as exc:  # pragma: no cover - exercised only without the SDK
            raise RuntimeError(
                "google-genai is not installed. Install the cloud provider with "
                "`pip install -e .[gemini]` to use MYTHOS_NARRATIVE_PROVIDER=gemini."
            ) from exc
        if self.config.use_vertex:
            self._injected_client = genai.Client(
                vertexai=True, project=self.config.project, location=self.config.location
            )
        else:
            self._injected_client = genai.Client(api_key=self.config.api_key)
        return self._injected_client

    def _generation_config(self, system_instruction: str | None) -> dict[str, Any]:
        return {
            "system_instruction": system_instruction,
            "temperature": self.config.temperature,
            "max_output_tokens": self.config.max_output_tokens,
            "response_mime_type": "application/json",
            "response_schema": SCENE_GEMINI_SCHEMA,
            # Disable (budget=0) thinking so reasoning tokens don't starve the JSON out
            # of max_output_tokens. A plain dict is coerced by the SDK (no types import).
            "thinking_config": {"thinking_budget": self.config.thinking_budget},
        }

    def generate(self, messages: list[dict[str, str]], *, model: str | None = None) -> str:
        """Generate the scene payload as a JSON string via controlled generation."""
        client = self._client()
        system_instruction, contents = _split_messages(messages)
        response = client.models.generate_content(
            model=model or self.config.model,
            contents=contents,
            config=self._generation_config(system_instruction),
        )
        record_usage(getattr(response, "usage_metadata", None))
        text = getattr(response, "text", None)
        return text.strip() if isinstance(text, str) else ""

    def stream(self, messages: list[dict[str, str]], *, model: str | None = None) -> Iterator[str]:
        """Stream the controlled-generation JSON in chunks.

        Gemini still emits the same schema-constrained JSON, just incrementally, so the
        director's ``NarrationFieldExtractor`` parses the ``narration`` field out of the
        stream exactly as it does for the Ollama JSON path — improving perceived TTFT in
        the closed-beta UI. Chunks without text are skipped.
        """
        client = self._client()
        system_instruction, contents = _split_messages(messages)
        stream = client.models.generate_content_stream(
            model=model or self.config.model,
            contents=contents,
            config=self._generation_config(system_instruction),
        )
        # Gemini reports usage_metadata cumulatively on chunks, so keep the last
        # one seen and record it once. Recording per chunk would multiply a turn's
        # token count by the number of chunks that carried it.
        latest_usage: Any = None
        try:
            for chunk in stream:
                usage = getattr(chunk, "usage_metadata", None)
                if usage is not None:
                    latest_usage = usage
                text = getattr(chunk, "text", None)
                if isinstance(text, str) and text:
                    yield text
        finally:
            # finally, not after the loop: a consumer that abandons the generator
            # still owes the tokens the stream already produced.
            record_usage(latest_usage)


def build_narrative_provider() -> Any:
    """Select the narrative ``JSONProvider`` from ``MYTHOS_NARRATIVE_PROVIDER``.

    ``gemini``/``vertex`` → ``VertexGeminiJSONProvider`` (cloud product path); anything
    else (default ``ollama``) → the local ``OllamaJSONProvider``. Construction is cheap
    and does not touch the network or import the cloud SDK.
    """
    name = (os.getenv("MYTHOS_NARRATIVE_PROVIDER") or "ollama").strip().lower()
    if name in {"gemini", "vertex"}:
        return VertexGeminiJSONProvider(GeminiConfig())
    # Local default — imported here to avoid a circular import at module load.
    from mythos_image_agent.config import AgentConfig

    from .director import OllamaJSONProvider

    return OllamaJSONProvider(AgentConfig())


__all__ = [
    "GeminiConfig",
    "SCENE_GEMINI_SCHEMA",
    "VertexGeminiJSONProvider",
    "build_narrative_provider",
    "to_gemini_schema",
]
