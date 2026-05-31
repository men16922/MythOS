from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

try:
    from dotenv import load_dotenv  # type: ignore[import-not-found, import-untyped]
except ImportError:  # pragma: no cover - setup-time convenience
    load_dotenv = None  # type: ignore[assignment]


PROJECT_ROOT = Path(__file__).resolve().parents[2]

if load_dotenv is not None:
    load_dotenv(PROJECT_ROOT / ".env")


TRUE_VALUES = {"1", "true", "yes", "on", "debug"}


def env_flag(name: str, default: bool = False) -> bool:
    raw = os.getenv(name)
    if raw is None:
        return default
    return raw.strip().lower() in TRUE_VALUES


@dataclass(frozen=True)
class RuntimeSettings:
    debug: bool
    fast_mode: bool
    log_level: str
    environment: str
    otel_endpoint: str
    service_name: str


def load_runtime_settings() -> RuntimeSettings:
    debug = env_flag("MYTHOS_DEBUG")
    fast_mode = env_flag("MYTHOS_FAST_MODE")
    return RuntimeSettings(
        debug=debug,
        fast_mode=fast_mode,
        log_level=(os.getenv("MYTHOS_LOG_LEVEL") or ("DEBUG" if debug else "INFO")).upper(),
        environment=os.getenv("MYTHOS_ENV", "local"),
        otel_endpoint=os.getenv("OTEL_EXPORTER_OTLP_ENDPOINT", "http://localhost:4318").rstrip("/"),
        service_name=os.getenv("OTEL_SERVICE_NAME", "mythos-local"),
    )
