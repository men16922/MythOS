"""Env-driven settings for the 2.0 backend: the local `.env`, the Ollama GM endpoint and the Gemini/Vertex GM.

Carried over from the archived 1.x packages (`mythos_image_agent.config`, `mythos_narrative.gemini_provider`,
branch `1.0`) so `/api/v2` stands alone. Values are read at construction, not import, so a late
`.env` load is honoured.
"""

from __future__ import annotations

import os
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

PROJECT_ROOT = Path(__file__).resolve().parents[2]

try:  # python-dotenv is optional in the slim Cloud Run image (env comes from the service config there)
    from dotenv import load_dotenv

    load_dotenv(PROJECT_ROOT / ".env")
except ImportError:  # pragma: no cover
    pass


def env(*names: str, default: str | None = None) -> str | None:
    """First non-empty value among env-var aliases (later names are fallbacks)."""
    for name in names:
        value = os.getenv(name)
        if value is not None and value.strip() != "":
            return value
    return default


def env_bool(*names: str, default: bool) -> bool:
    value = env(*names)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


@dataclass(frozen=True)
class OllamaConfig:
    """OpenAI-compatible local endpoint (Ollama / MLX / vLLM)."""

    base_url: str = field(
        default_factory=lambda: env("OLLAMA_BASE_URL", default="http://localhost:11434/v1") or ""
    )
    model: str = field(
        default_factory=lambda: (
            env("OLLAMA_MODEL_STORY", "OLLAMA_MODEL", default="gemma4:latest") or ""
        )
    )


@dataclass(frozen=True)
class GeminiConfig:
    """Gemini / Vertex AI connection (Vertex via ADC by default, or the Developer API with a key).

    Gemini 3.x is served only from the global endpoint (regional returns 404), while
    GOOGLE_CLOUD_LOCATION stays regional for other services — so 3.x resolves to "global".
    """

    model: str = field(
        default_factory=lambda: (
            env("GEMINI_MODEL", "MODEL", default="gemini-3.8-flash") or "gemini-3.8-flash"
        )
    )
    use_vertex: bool = field(
        default_factory=lambda: env_bool(
            "GEMINI_USE_VERTEX", "GOOGLE_GENAI_USE_VERTEXAI", default=True
        )
    )
    project: str | None = field(default_factory=lambda: env("GOOGLE_CLOUD_PROJECT", "PROJECT_ID"))
    location: str = ""
    api_key: str | None = field(default_factory=lambda: env("GEMINI_API_KEY", "GOOGLE_API_KEY"))
    # Thinking tokens come out of max_output_tokens; the GM's short lines need none.
    thinking_budget: int = field(
        default_factory=lambda: int(env("GEMINI_THINKING_BUDGET", default="0") or "0")
    )

    def __post_init__(self) -> None:
        if not self.location:
            resolved = (
                env("GEMINI_LOCATION")
                or ("global" if self.model.startswith("gemini-3") else None)
                or env("GOOGLE_CLOUD_LOCATION")
                or "us-central1"
            )
            object.__setattr__(self, "location", resolved)


_GEMINI_TYPE = {
    "string": "STRING",
    "object": "OBJECT",
    "array": "ARRAY",
    "integer": "INTEGER",
    "number": "NUMBER",
    "boolean": "BOOLEAN",
}


def to_gemini_schema(node: Any) -> Any:
    """JSON schema → Gemini/Vertex ``response_schema`` (``["t", "null"]`` → t + nullable; unknown keys dropped)."""
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


__all__ = ["PROJECT_ROOT", "GeminiConfig", "OllamaConfig", "env", "env_bool", "to_gemini_schema"]
