from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

try:
    from dotenv import load_dotenv
except ImportError:  # Allows `python agent.py --help` before setup.
    load_dotenv = None  # type: ignore[assignment]


PROJECT_ROOT = Path(__file__).resolve().parents[2]

if load_dotenv is not None:
    load_dotenv(PROJECT_ROOT / ".env")


@dataclass(frozen=True)
class AgentConfig:
    ollama_base_url: str = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434/v1")
    ollama_model: str = os.getenv("OLLAMA_MODEL", "gemma4:latest")
    ollama_model_story: str = os.getenv("OLLAMA_MODEL_STORY") or os.getenv("OLLAMA_MODEL") or "gemma4:latest"
    ollama_model_parser: str = os.getenv("OLLAMA_MODEL_PARSER") or os.getenv("OLLAMA_MODEL") or "gemma4:latest"
    # Local narrative generation measured 2026-08-30: an 8B storyteller takes
    # 12-90s for a ~1.3k-token scene. At the previous 30s default the OpenAI SDK
    # burned its two retries and raised at ~91s, so slow turns were silently
    # costing three generations each, and some failed outright. Cloud providers
    # do not read this field (it is passed only to the Ollama client).
    ollama_timeout_seconds: float = float(os.getenv("OLLAMA_TIMEOUT_SECONDS", "180.0"))
    # Context window for local generation. Must hold prompt + num_predict: the
    # narrative prompt measured 6.8-7.8k tokens and the storyteller asks for
    # 2048, so the previous 8192 was already overflowing and the model returned
    # empty scenes that the deterministic fallback then hid
    # (experiments/results/*-context-overflow). 16384 covers the measured
    # maximum with roughly 2x headroom; raise it for long-context model variants.
    ollama_num_ctx: int = int(os.getenv("OLLAMA_NUM_CTX", "16384"))
    hf_token: str | None = os.getenv("HF_TOKEN") or os.getenv("HUGGING_FACE_HUB_TOKEN")
    image_model_id: str = os.getenv("IMAGE_MODEL_ID", "black-forest-labs/FLUX.1-schnell")
    # Image backend: "mflux" (Apple MLX, ~20x faster + quantized, default) or "diffusers"
    # (PyTorch/MPS fallback). Both use the same FLUX.1-schnell weights.
    image_backend: str = os.getenv("IMAGE_BACKEND", "mflux")
    # MLX quantization bits for the mflux backend (4 or 8; 8 = better quality, 4 = lighter).
    mflux_quantize: int = int(os.getenv("MFLUX_QUANTIZE", "8"))
    output_dir: Path = Path(os.getenv("OUTPUT_DIR", "outputs"))
    default_width: int = int(os.getenv("IMAGE_WIDTH", "1024"))
    default_height: int = int(os.getenv("IMAGE_HEIGHT", "1024"))
    default_steps: int = int(os.getenv("IMAGE_STEPS", "4"))
    default_seed: int = int(os.getenv("IMAGE_SEED", "42"))
    guidance_scale: float = float(os.getenv("GUIDANCE_SCALE", "0.0"))
    max_sequence_length: int = int(os.getenv("MAX_SEQUENCE_LENGTH", "256"))
    ip_adapter_repo: str = os.getenv("IP_ADAPTER_REPO", "XLabs-AI/flux-ip-adapter")
    ip_adapter_weight_name: str = os.getenv("IP_ADAPTER_WEIGHT_NAME", "ip_adapter.safetensors")
    ip_adapter_image_encoder: str = os.getenv(
        "IP_ADAPTER_IMAGE_ENCODER", "openai/clip-vit-large-patch14"
    )

    @property
    def hf_auth_token(self) -> str | bool | None:
        return self.hf_token or True

    def output_path(self, requested_path: str | None) -> Path:
        if requested_path:
            path = Path(requested_path)
            return path if path.is_absolute() else PROJECT_ROOT / path

        output_dir = (
            self.output_dir if self.output_dir.is_absolute() else PROJECT_ROOT / self.output_dir
        )
        output_dir.mkdir(parents=True, exist_ok=True)
        return output_dir / "mythos-output.png"
